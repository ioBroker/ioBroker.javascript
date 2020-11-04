'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const {matchAll} = require('./tools');

/**
 * Resolves all TypeScript lib files for the editor
 * @param {string} targetLib The lib to target (e.g. es2017)
 */
function resolveTypescriptLibs(targetLib) {
    const typescriptLibRoot = path.dirname(require.resolve(`typescript/lib/lib.d.ts`));
    const ret = {};

    const libReferenceRegex = /\/\/\/ <reference lib=["']([^"']+)["'] \/>/g;
    const matchAllLibs = (string) => matchAll(libReferenceRegex, string).map(groups => groups[0]);

    const libQueue = [targetLib];
    while (libQueue.length > 0) {
        const libName = libQueue.shift();
        const filename = `lib.${libName}.d.ts`;
        // Read the file and remember it in the return dictionary
        const fileContent = fs.readFileSync(path.join(typescriptLibRoot, filename), 'utf8');
        ret[filename] = fileContent;
        // If this file references another lib file, we need to load that too
        // A reference looks like this: /// <reference lib="es2015.core" />
        // Find all libs we have not loaded yet
        matchAllLibs(fileContent)
            .filter(lib => !(`lib.${lib}.d.ts` in ret))
            .forEach(lib => libQueue.push(lib));
    }
    return ret;
}

function normalizeDTSImport(filename) {
    // An import is either...
    // a normal import
    if (filename.endsWith('.d.ts')) return filename;
    // an extensionless import
    if (fs.existsSync(filename + '.d.ts')) return filename + '.d.ts';
    // or a directory import
    return path.join(filename, 'index.d.ts');
}

/**
 * Resolves the type declarations of a 3rd party package for the editor
 * @param {string} pkg The package whose typings we're interested in
 * @param {boolean} [wrapInDeclareModule=false] Whether the root file should be wrapped in `declare module "<pkg>" { ... }`
 */
function resolveTypings(pkg, wrapInDeclareModule) {
    let packageJsonPath;
    let packageJson;
    /** @type {string | undefined} */
    let rootTypings;
    let pkgIncludesTypings = true;

    /**
     * @param {string} path
     */
    function tryToLoadPackage(path) {
        try {
            packageJsonPath = require.resolve(path);
            packageJson = require(packageJsonPath);
            rootTypings = typeof packageJson.types === 'string' ? packageJson.types
                : typeof packageJson.typings === 'string' ? packageJson.typings
                    : undefined;
        } catch { /* ignore */ }
    }

    // First, try to resolve the package itself in case it brings its own typings
    tryToLoadPackage(`${pkg}/package.json`);
    // If that didn't work, try again with the @types version of the package
    if (!rootTypings) {
        tryToLoadPackage(`@types/${pkg}/package.json`);
        pkgIncludesTypings = false;
    }
    // TODO: If that didn't work, download @types/<packagename> and retry the previous step

    // Nothing to do here since we found no packages
    if (!rootTypings) return {};

    const packageRoot = path.dirname(packageJsonPath);
    const normalizeImportPath = filename => path.normalize(
        `node_modules/${pkgIncludesTypings ? '' : '@types/'}${pkg}/${path.relative(packageRoot, filename)}`
    ).replace(/\\/g, '/');

    const ret = {};

    // We need to look at `import/export ... from 'modulename'` and `/// <reference path='...' />`
    const importDtsRegex = /(?:import|export) .+ from ["'](\.+\/[^"']+)["']/g;
    const pathReferenceRegex = /\/\/\/ <reference path=["']([^"']+)["'] \/>/g;
    const matchAllImports = string => [
        ...matchAll(importDtsRegex, string),
        ...matchAll(pathReferenceRegex, string)
    ].map(groups => groups[0]);

    // the paths are relative to the package.json - we need an absolute path to read the files
    rootTypings = path.join(packageRoot, rootTypings);
    // some @types packages specify `index` as their typings file instead of `index.d.ts`
    rootTypings = normalizeDTSImport(rootTypings);

    // include package.json in typings, so TypeScript can look up the correct entry point
    const relativePath = `node_modules/${pkgIncludesTypings ? '' : '@types/'}${pkg}/package.json`.replace(/\\/g, '/');
    ret[relativePath] = JSON.stringify(packageJson);

    // Used to test whether a .d.ts file already uses "declare module" or not
    const declareModuleRegex = /^\s*declare module/gm;

    // recursively load all typings
    const definitionQueue = [rootTypings];
    while (definitionQueue.length > 0) {
        const filename = definitionQueue.shift();
        const dirName = path.dirname(filename);
        // Read the file and remember it in the return dictionary
        let fileContent;
        try {
            fileContent = fs.readFileSync(filename, 'utf8');
        } catch (e) {
            // The typings are malformed
            console.error(`Failed to load definitions for ${pkg}: ${e}`);
            // Since we cannot use them, return an empty object for the definitions
            return {};
        }
        // We need to store the filename relative to the base dir
        const relativePath = normalizeImportPath(filename);
        // If necessary, wrap the root typings (only those!)
        ret[relativePath] = wrapInDeclareModule && filename === rootTypings && !declareModuleRegex.test(fileContent)
            ? `declare module "${pkg}" { ${fileContent} }`
            : fileContent;
        // If this file references another .d.ts file, we need to load that too
        matchAllImports(fileContent)
            // resolve the file relative to the current directory
            .map(file => path.join(dirName, file))
            // find out the correct path of the file we want to import
            .map(normalizeDTSImport)
            // Find all libs we have not loaded yet
            .filter(file => !(normalizeImportPath(file) in ret))
            .forEach(file => definitionQueue.push(file));
    }
    return ret;
}

/** @param {import("typescript").Statement} s */
function mustBeHoisted(s) {
    return (
        // Import/export statements must be moved to the top
        ts.isImportDeclaration(s) ||
        ts.isImportEqualsDeclaration(s) ||
        ts.isExportDeclaration(s) ||
        ts.isExportAssignment(s) ||
        // as well as many declarations
        ts.isTypeAliasDeclaration(s) ||
        ts.isInterfaceDeclaration(s) ||
        ts.isModuleDeclaration(s) ||
        ts.isEnumDeclaration(s) ||
        ts.isClassDeclaration(s) ||
        ts.isFunctionDeclaration(s) ||
        // and declare ... / export ... statements
        (s.modifiers &&
            s.modifiers.some(
                (s) => s.kind === ts.SyntaxKind.DeclareKeyword
                    || s.kind === ts.SyntaxKind.ExportKeyword
            ))
    );
}

/** @param {import("typescript").Statement} s */
function canBeExported(s) {
    return (
        // const, let, var
        ts.isVariableStatement(s) ||
        // type, interface, enum, class, function
        ts.isTypeAliasDeclaration(s) ||
        ts.isInterfaceDeclaration(s) ||
        ts.isEnumDeclaration(s) ||
        ts.isClassDeclaration(s) ||
        ts.isFunctionDeclaration(s)
    );
}

/**
 * @param {import("typescript").Statement} s
 */
function addExportModifier(s) {
    /** @type {import("typescript").Modifier[]} */
    let modifiers;
    // Add export modifiers
    if (!s.modifiers) {
        modifiers = [ts.createModifier(ts.SyntaxKind.ExportKeyword)];
    } else if (!s.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        modifiers = [...s.modifiers, ts.createModifier(ts.SyntaxKind.ExportKeyword)];
    } else {
        return s;
    }

    if (ts.isVariableStatement(s)) {
        return ts.updateVariableStatement(s, modifiers, s.declarationList);
    } else if (ts.isTypeAliasDeclaration(s)) {
        return ts.updateTypeAliasDeclaration(s, s.decorators, modifiers, s.name, s.typeParameters, s.type);
    } else if (ts.isInterfaceDeclaration(s)) {
        return ts.updateInterfaceDeclaration(s, s.decorators, modifiers, s.name, s.typeParameters, s.heritageClauses, s.members);
    } else if (ts.isEnumDeclaration(s)) {
        return ts.updateEnumDeclaration(s, s.decorators, modifiers, s.name, s.members);
    } else if (ts.isClassDeclaration(s)) {
        return ts.updateClassDeclaration(s, s.decorators, modifiers, s.name, s.typeParameters, s.heritageClauses, s.members);
    } else if (ts.isFunctionDeclaration(s)) {
        return ts.updateFunctionDeclaration(s, s.decorators, modifiers, s.asteriskToken, s.name, s.typeParameters, s.parameters, s.type, s.body);
    }
    return s;
}

/**
 * @param {import("typescript").Statement} s
 */
function removeDeclareModifier(s) {
    /** @type {import("typescript").Modifier[] | undefined} */
    let modifiers;
    // Remove declare modifiers
    if (s.modifiers) {
        modifiers = s.modifiers.filter(m => m.kind !== ts.SyntaxKind.DeclareKeyword);
    } else {
        return s;
    }

    if (ts.isVariableStatement(s)) {
        return ts.updateVariableStatement(s, modifiers, s.declarationList);
    } else if (ts.isTypeAliasDeclaration(s)) {
        return ts.updateTypeAliasDeclaration(s, s.decorators, modifiers, s.name, s.typeParameters, s.type);
    } else if (ts.isInterfaceDeclaration(s)) {
        return ts.updateInterfaceDeclaration(s, s.decorators, modifiers, s.name, s.typeParameters, s.heritageClauses, s.members);
    } else if (ts.isEnumDeclaration(s)) {
        return ts.updateEnumDeclaration(s, s.decorators, modifiers, s.name, s.members);
    } else if (ts.isClassDeclaration(s)) {
        return ts.updateClassDeclaration(s, s.decorators, modifiers, s.name, s.typeParameters, s.heritageClauses, s.members);
    } else if (ts.isFunctionDeclaration(s)) {
        return ts.updateFunctionDeclaration(s, s.decorators, modifiers, s.asteriskToken, s.name, s.typeParameters, s.parameters, s.type, s.body);
    }
    return s;
}

/**
 * Takes a TypeScript script and does the necessary transformations so it can be compiled properly
 * @param {string} source The original TypeScript source
 * @param {boolean} isGlobal Whether the transformed script is a global script or not
 * @returns {string}
 */
function transformScriptBeforeCompilation(source, isGlobal) {
    /**
     * @type {import("typescript").TransformerFactory<import("typescript").SourceFile>}
     */
    // eslint-disable-next-line no-unused-vars
    const transformer = (_context) => {
        return (sourceFile) =>
            ts.visitNode(sourceFile, (node) => {
                if (ts.isSourceFile(node)) {
                    // If there is no top level await, don't move all the statements around
                    const hasTLA = node.statements.some(s => ts.isExpressionStatement(s) && s.expression.kind === ts.SyntaxKind.AwaitExpression);
                    // Move all statements to the top of the file that cannot appear in a function body
                    let hoistedStatements = hasTLA ? ts.createNodeArray(node.statements.filter(mustBeHoisted)) : node.statements;
                    const wrappedStatements = hasTLA ? node.statements.filter(s => !mustBeHoisted(s)) : [];

                    // When transforming global scripts, we need to do two things
                    if (isGlobal) {
                        // 1. We need to add an export modifier to everything on the top level that can be exported
                        hoistedStatements = ts.visitNodes(
                            hoistedStatements,
                            // @ts-expect-error s is definitely a statement
                            s => canBeExported(s) ? addExportModifier(s) : s,
                        );
                        // 2. We need to transform the generated declarations to use `declare global` (this will happen in transformGlobalDeclarations)
                    }
                    const needsEmptyExport =
                        // An empty export is needed when there is no import declaration
                        !node.statements.some(s => ts.isImportDeclaration(s) || ts.isImportEqualsDeclaration(s))
                        // And there is no statement in a global script which had an export modifier added
                        && !(isGlobal && hoistedStatements.some(s => s.modifiers && s.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword)));

                    return ts.updateSourceFileNode(node, [
                        // Put the hoisted statements at the top (or all of them if there's no top level await)
                        ...hoistedStatements,
                        ...(hasTLA
                            ? // If there is a top-level await, wrap all non-hoisted statements in (async () => { ... })();
                            [
                                ts.createExpressionStatement(
                                    ts.createCall(
                                        ts.createArrowFunction(
                                            [
                                                ts.createModifier(
                                                    ts.SyntaxKind.AsyncKeyword
                                                ),
                                            ],
                                            undefined,
                                            [],
                                            undefined,
                                            undefined,
                                            ts.createBlock(wrappedStatements)
                                        ),
                                        undefined,
                                        undefined
                                    )
                                ),
                            ]
                            : []),
                        ...(needsEmptyExport
                            ? [
                                // Put an empty export {}; at the bottom to force TypeScript to treat the script as a module
                                ts.createExportDeclaration(
                                    undefined,
                                    undefined,
                                    ts.createNamedExports([]),
                                    undefined,
                                    undefined
                                ),
                            ]
                            : []),
                    ]);
                } else {
                    return node;
                }
            });
    };

    const sourceFile = ts.createSourceFile(
        'index.ts',
        source,
        ts.ScriptTarget.ESNext,
        /* setParentNodes */ true
    );

    const result = ts.transform(sourceFile, [transformer]);
    return ts.createPrinter().printNode(ts.EmitHint.Unspecified, result.transformed[0], sourceFile);
}

/**
 * Takes the global declarations for a TypeScript and wraps export statements in `declare global`
 * @param {string} decl The untransformed global declarations
 * @returns {string}
 */
function transformGlobalDeclarations(decl) {
    /**
     * @type {import("typescript").TransformerFactory<import("typescript").SourceFile>}
     */
    // eslint-disable-next-line no-unused-vars
    const transformer = (context) => {
        return (sourceFile) =>
            ts.visitNode(sourceFile, (node) => {
                if (ts.isSourceFile(node)) {
                    // All non-export-statements stay at the root level, the rest is wrapped in `declare global`
                    const exportStatements = node.statements.filter(s => s.modifiers && s.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword));
                    const otherStatements = node.statements.filter(s => !exportStatements.includes(s));

                    const hasImport = otherStatements.some(s => ts.isImportDeclaration(s) || ts.isImportEqualsDeclaration(s));

                    return ts.updateSourceFileNode(node, [
                        ...otherStatements,
                        ts.createModuleDeclaration(
                            undefined,
                            [ts.createModifier(ts.SyntaxKind.DeclareKeyword)],
                            ts.createIdentifier('global'),
                            ts.createModuleBlock(
                                exportStatements.map((s) => removeDeclareModifier(s))
                            ),
                            ts.NodeFlags.GlobalAugmentation
                        ),
                        ...(hasImport
                            ? [] // If there is an import, the script is already treated as a module
                            : [
                                // Otherwise put an empty export {}; at the bottom to force TypeScript to treat the script as a module
                                ts.createExportDeclaration(
                                    undefined,
                                    undefined,
                                    ts.createNamedExports([]),
                                    undefined,
                                    undefined
                                ),
                            ]),
                    ]);
                } else {
                    return node;
                }
            });
    };

    const sourceFile = ts.createSourceFile(
        'index.d.ts',
        decl,
        ts.ScriptTarget.ESNext,
        /* setParentNodes */ true
    );

    const result = ts.transform(sourceFile, [transformer]);
    return ts.createPrinter().printNode(ts.EmitHint.Unspecified, result.transformed[0], sourceFile);
}

/**
 * Translates a script ID to a filename for the compiler
 * @param {string} scriptID The ID of the script
 */
function scriptIdToTSFilename(scriptID) {
    return scriptID.replace(/^script.js./, '').replace(/\./g, '/') + '.ts';
}

module.exports = {
    scriptIdToTSFilename,
    resolveTypescriptLibs,
    resolveTypings,
    transformScriptBeforeCompilation,
    transformGlobalDeclarations,
};
