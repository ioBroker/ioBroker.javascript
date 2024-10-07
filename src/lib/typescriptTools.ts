'use strict';

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';
import {
    type Statement,
    isImportDeclaration,
    isImportEqualsDeclaration,
    isExportDeclaration,
    isExportAssignment,
    isTypeAliasDeclaration,
    isInterfaceDeclaration,
    isModuleDeclaration,
    isEnumDeclaration,
    isClassDeclaration,
    isFunctionDeclaration,
    isVariableStatement,
    isExpressionStatement,
    createSourceFile,
    createPrinter,
    transform,
    ScriptTarget,
    factory,
    SyntaxKind,
    type Modifier,
    NodeFlags,
    ModuleDeclaration,
    visitNode,
    visitNodes,
    isSourceFile,
    EmitHint,
    type NodeArray,
    type TransformerFactory,
    type SourceFile,
    TransformationContext,
    Transformer,
    ModifierLike,
    NamedExportBindings,
    Expression,
    ImportAttributes, ExportDeclaration,
} from 'typescript';
import { matchAll } from './tools';

/**
 * Resolves all TypeScript lib files for the editor
 *
 * @param targetLib The lib to target (e.g., es2017)
 */
export function resolveTypescriptLibs(
    targetLib: 'es2017' | 'es2018' | 'es2019' | 'es2020' | 'es2021' | 'esnext',
): Record<string, string> {
    const typescriptLibRoot = dirname(require.resolve(`typescript/lib/lib.d.ts`));
    const ret: Record<string, string> = {};

    const libReferenceRegex = /\/\/\/ <reference lib=["']([^"']+)["'] \/>/g;
    const matchAllLibs = (str: string): string[] => matchAll(libReferenceRegex, str).map(groups => groups[0]);

    const libQueue: string[] = [targetLib];
    while (libQueue.length > 0) {
        const libName = libQueue.shift();
        const filename = `lib.${libName}.d.ts`;
        // Read the file and remember it in the return dictionary
        const fileContent = readFileSync(join(typescriptLibRoot, filename), 'utf8');
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

function normalizeDTSImport(filename: string): string {
    // An import is either...
    // a normal import
    if (filename.endsWith('.d.ts')) {
        return filename;
    }
    // an extensionless import
    if (existsSync(`${filename}.d.ts`)) {
        return `${filename}.d.ts`;
    }
    // or a directory import
    return join(filename, 'index.d.ts');
}

/**
 * Resolves the type declarations of a 3rd party package for the editor
 *
 * @param pkg The package whose typings we're interested in
 * @param adapterScopedPackageName the package name on the system
 * @param [wrapInDeclareModule=false] Whether the root file should be wrapped in `declare module "<pkg>" { ... }`
 * @returns The found declarations or undefined if none were found
 */
export function resolveTypings(
    pkg: string,
    adapterScopedPackageName: string,
    wrapInDeclareModule?: boolean,
): Record<string, string> | undefined {
    let packageJsonPath: string | undefined;
    let packageJson: Record<string, any> | undefined;
    let rootTypings: string | undefined;
    let pkgIncludesTypings = true;

    function tryToLoadPackage(path: string): void {
        try {
            packageJsonPath = require.resolve(path);
            packageJson = require(packageJsonPath);
            rootTypings =
                typeof (packageJson as Record<string, any>).types === 'string'
                    ? (packageJson as Record<string, any>).types
                    : typeof (packageJson as Record<string, any>).typings === 'string'
                      ? (packageJson as Record<string, any>).typings
                      : undefined;
        } catch {
            /* ignore */
        }
    }

    // First, try to resolve the package itself in case it brings its own typings
    tryToLoadPackage(`${adapterScopedPackageName}/package.json`);

    // If that didn't work, try again with the @types version of the package
    if (!rootTypings) {
        tryToLoadPackage(`@types/${pkg}/package.json`);
        pkgIncludesTypings = false;
    }
    // TODO: If that didn't work, download @types/<packagename> and retry the previous step

    // Nothing to do here since we found no packages
    if (!rootTypings) {
        return undefined;
    }

    if (!packageJsonPath) {
        return undefined;
    }

    const packageRoot: string = dirname(packageJsonPath);
    const normalizeImportPath = (filename: string) =>
        normalize(
            `node_modules/${pkgIncludesTypings ? adapterScopedPackageName : `@types/${pkg}`}/${relative(packageRoot, filename)}`,
        ).replace(/\\/g, '/');

    const ret: Record<string, string> = {};

    // We need to look at `import/export ... from 'modulename'` and `/// <reference path='...' />`
    const importDtsRegex = /^\s*(?:import|export) .+ from ["'](\.+\/[^"']+)["']/g;
    const pathReferenceRegex = /\/\/\/ <reference path=["']([^"']+)["'] \/>/g;
    const matchAllImports = (str: string): string[] =>
        [...matchAll(importDtsRegex, str), ...matchAll(pathReferenceRegex, str)].map(groups => groups[0]);

    // the paths are relative to the package.json - we need an absolute path to read the files
    rootTypings = join(packageRoot, rootTypings);
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
        const filename: string = definitionQueue.shift() as string;
        const dirName = dirname(filename);
        // Read the file and remember it in the return dictionary
        let fileContent: string;
        try {
            fileContent = readFileSync(filename, 'utf8');
        } catch (e) {
            // The typings are malformed
            console.error(`Failed to load definitions for ${pkg}: ${e}`);
            // Since we cannot use them, return undefined
            return undefined;
        }
        // We need to store the filename relative to the base dir
        const relativePath = normalizeImportPath(filename);
        // If necessary, wrap the root typings (only those!)
        ret[relativePath] =
            wrapInDeclareModule && filename === rootTypings && !declareModuleRegex.test(fileContent)
                ? `declare module "${pkg}" { ${fileContent} }`
                : fileContent;
        // If this file references another .d.ts file, we need to load that too
        matchAllImports(fileContent)
            // resolve the file relative to the current directory
            .map(file => join(dirName, file))
            // find out the correct path of the file we want to import
            .map(normalizeDTSImport)
            // Find all libs we have not loaded yet
            .filter(file => !(normalizeImportPath(file) in ret))
            .forEach(file => definitionQueue.push(file));
    }
    // Avoid returning empty declarations
    if (Object.keys(ret).length === 0) {
        return undefined;
    }
    return ret;
}

/**
 * @param s
 * @param isGlobal Whether this is a global script or a normal one
 */
function mustBeHoisted(s: Statement & { modifiers?: Modifier[] }, isGlobal?: boolean): boolean {
    return !!(
        // Import/export statements must be moved to the top
        isImportDeclaration(s) ||
        isImportEqualsDeclaration(s) ||
        isExportDeclaration(s) ||
        isExportAssignment(s) ||
        // as well as many declarations
        isTypeAliasDeclaration(s) ||
        isInterfaceDeclaration(s) ||
        isModuleDeclaration(s) ||
        isEnumDeclaration(s) ||
        (isGlobal &&
            // in global scripts we don't wrap classes and functions, so they can be accessed from non-global scripts
            (isClassDeclaration(s) || isFunctionDeclaration(s))) ||
        // and declare ... / export ... statements
        (s.modifiers?.some(s =>
            s.kind === SyntaxKind.DeclareKeyword || s.kind === SyntaxKind.ExportKeyword))
    );
}

/** @param {import("typescript").Statement} s */
function canBeExported(s: Statement): boolean {
    return (
        // const, let, var
        isVariableStatement(s) ||
        // type, interface, enum, class, function
        isTypeAliasDeclaration(s) ||
        isInterfaceDeclaration(s) ||
        isEnumDeclaration(s) ||
        isClassDeclaration(s) ||
        isFunctionDeclaration(s)
    );
}

function addExportModifier(s: Statement & { modifiers?: Modifier[] }) {
    let modifiers: Modifier[] | undefined;
    // Add export modifiers
    if (!s.modifiers) {
        modifiers = [factory.createModifier(SyntaxKind.ExportKeyword)];
    } else if (!s.modifiers.some(m => m.kind === SyntaxKind.ExportKeyword)) {
        modifiers = [...s.modifiers, factory.createModifier(SyntaxKind.ExportKeyword)];
    } else {
        return s;
    }

    if (isVariableStatement(s)) {
        return factory.updateVariableStatement(s, modifiers, s.declarationList);
    }
    if (isTypeAliasDeclaration(s)) {
        return factory.updateTypeAliasDeclaration(s, modifiers, s.name, s.typeParameters, s.type);
    }
    if (isInterfaceDeclaration(s)) {
        return factory.updateInterfaceDeclaration(
            s,
            modifiers,
            s.name,
            s.typeParameters,
            s.heritageClauses,
            s.members,
        );
    }
    if (isEnumDeclaration(s)) {
        return factory.updateEnumDeclaration(s, modifiers, s.name, s.members);
    }
    if (isClassDeclaration(s)) {
        return factory.updateClassDeclaration(s, modifiers, s.name, s.typeParameters, s.heritageClauses, s.members);
    }
    if (isFunctionDeclaration(s)) {
        return factory.updateFunctionDeclaration(
            s,
            modifiers,
            s.asteriskToken,
            s.name,
            s.typeParameters,
            s.parameters,
            s.type,
            s.body,
        );
    }
    return s;
}

function removeDeclareModifier(s: Statement & { modifiers?: Modifier[] }): Statement  {
    let modifiers: Modifier[] | undefined;
    // Remove declare modifiers
    if (s.modifiers) {
        modifiers = s.modifiers.filter(m => m.kind !== SyntaxKind.DeclareKeyword);
    } else {
        return s;
    }

    if (isVariableStatement(s)) {
        return factory.updateVariableStatement(s, modifiers, s.declarationList);
    }
    if (isTypeAliasDeclaration(s)) {
        return factory.updateTypeAliasDeclaration(s, modifiers, s.name, s.typeParameters, s.type);
    }
    if (isInterfaceDeclaration(s)) {
        return factory.updateInterfaceDeclaration(
            s,
            modifiers,
            s.name,
            s.typeParameters,
            s.heritageClauses,
            s.members,
        );
    }
    if (isEnumDeclaration(s)) {
        return factory.updateEnumDeclaration(s, modifiers, s.name, s.members);
    }
    if (isClassDeclaration(s)) {
        return factory.updateClassDeclaration(s, modifiers, s.name, s.typeParameters, s.heritageClauses, s.members);
    }
    if (isFunctionDeclaration(s)) {
        return factory.updateFunctionDeclaration(
            s,
            modifiers,
            s.asteriskToken,
            s.name,
            s.typeParameters,
            s.parameters,
            s.type,
            s.body,
        );
    }

    return s;
}

// taken from node_modules\@types\node\globals.d.ts
// the globally available things must be wrapped in `declare global` if the user wants to augment them
const NodeJSGlobals = [
    'Array',
    'ArrayBuffer',
    'Boolean',
    'Buffer',
    'DataView',
    'Date',
    'Error',
    'EvalError',
    'Float32Array',
    'Float64Array',
    'Function',
    'GLOBAL',
    'Infinity',
    'Int16Array',
    'Int32Array',
    'Int8Array',
    'Intl',
    'JSON',
    'Map',
    'Math',
    'NaN',
    'Number',
    'Object',
    'Promise',
    'RangeError',
    'ReferenceError',
    'RegExp',
    'Set',
    'String',
    'Symbol',
    'SyntaxError',
    'TypeError',
    'URIError',
    'Uint16Array',
    'Uint32Array',
    'Uint8Array',
    'Uint8ClampedArray',
    'WeakMap',
    'WeakSet',
    'clearImmediate',
    'clearInterval',
    'clearTimeout',
    'console',
    'decodeURI',
    'decodeURIComponent',
    'encodeURI',
    'encodeURIComponent',
    'escape',
    'eval',
    'global',
    'isFinite',
    'isNaN',
    'parseFloat',
    'parseInt',
    'process',
    'root',
    'setImmediate',
    'setInterval',
    'setTimeout',
    'queueMicrotask',
    'undefined',
    'unescape',
    'gc',
    'v8debug',
];

/** @param {import("typescript").Statement} s */
function isGlobalAugmentation(s: Statement): boolean {
    return !!(
        (isInterfaceDeclaration(s) || isClassDeclaration(s) || isFunctionDeclaration(s)) &&
        s.name &&
        NodeJSGlobals.includes(s.name.text)
    );
}

function wrapInDeclareGlobal(statements: Statement[]): ModuleDeclaration {
    return factory.createModuleDeclaration(
        [factory.createModifier(SyntaxKind.DeclareKeyword)],
        factory.createIdentifier('global'),
        factory.createModuleBlock(statements),
        NodeFlags.GlobalAugmentation,
    );
}

/**
 * Takes a TypeScript script and does the necessary transformations, so it can be compiled properly
 *
 * @param source The original TypeScript source
 * @param isGlobal Whether the transformed script is a global script or not
 */
export function transformScriptBeforeCompilation(source: string, isGlobal?: boolean): string {
    // eslint-disable-next-line no-unused-vars
    const transformer: TransformerFactory<SourceFile> = (_context: TransformationContext): Transformer<SourceFile> => {
        return (sourceFile: SourceFile) =>
            visitNode(sourceFile, (node: SourceFile): any => {
                if (isSourceFile(node)) {
                    // Wrap all declarations that augment global interfaces in `declare global`
                    const augmentations = node.statements.filter(s => isGlobalAugmentation(s));
                    const nonAugmentations = node.statements.filter(s => !isGlobalAugmentation(s));

                    // If there is no top level await, don't move all the statements around
                    const hasTLA = node.statements.some(
                        s => isExpressionStatement(s) && s.expression.kind === SyntaxKind.AwaitExpression,
                    );
                    // Move all statements to the top of the file that cannot appear in a function body
                    let hoistedStatements = hasTLA
                        ? factory.createNodeArray(nonAugmentations.filter(s => mustBeHoisted(s, isGlobal)))
                        : factory.createNodeArray(nonAugmentations);

                    // The rest gets wrapped
                    const wrappedStatements = hasTLA ? nonAugmentations.filter(s => !mustBeHoisted(s, isGlobal)) : [];

                    // When transforming global scripts, we need to do a couple of things
                    if (isGlobal) {
                        // 1. We need to add an export modifier to everything at the top level that can be exported
                        hoistedStatements = visitNodes(
                            hoistedStatements,
                            // @ts-expect-error s is definitely a Statement
                            s => (canBeExported(s) ? addExportModifier(s) : s),
                        ) as NodeArray<Statement>
                        // 3. We need to transform the generated declarations to use `declare global` (this will happen in transformGlobalDeclarations)
                    }
                    const needsEmptyExport =
                        // An empty export is necessary when there is no import declaration
                        !node.statements.some(s => isImportDeclaration(s) || isImportEqualsDeclaration(s)) &&
                        // And there is no statement in a global script which had an export modifier added
                        (!(
                            isGlobal &&
                            hoistedStatements.some(
                                // @ts-expect-error s should have modifiers
                                s => s.modifiers?.some(m => m.kind === SyntaxKind.ExportKeyword),
                            )
                        ) ||
                            // Or if there is a `declare global` statement
                            !!augmentations);

                    return factory.updateSourceFile(node, [
                        // Put the hoisted statements at the top (or all of them if there's no top level await)
                        ...hoistedStatements,
                        // Then add everything that augments the global scope
                        ...(augmentations && augmentations.length ? [wrapInDeclareGlobal(augmentations)] : []),
                        ...(hasTLA
                            ? // If there is a top-level await, wrap all non-hoisted statements in (async () => { ... })();
                              [
                                  factory.createExpressionStatement(
                                      factory.createCallExpression(
                                          factory.createArrowFunction(
                                              [factory.createModifier(SyntaxKind.AsyncKeyword)],
                                              undefined,
                                              [],
                                              undefined,
                                              undefined,
                                              factory.createBlock(wrappedStatements),
                                          ),
                                          undefined,
                                          undefined,
                                      ),
                                  ),
                              ]
                            : []),
                        ...(needsEmptyExport
                            ? [
                                  // Put an empty export {}; at the bottom to force TypeScript to treat the script as a module
                                factory.createExportDeclaration(
                                      undefined, // ModifierLike[] | undefined
                                      false,     // isTypeOnly
                                      factory.createNamedExports([]), // NamedExportBindings | undefined
                                      undefined, // moduleSpecifier
                                      undefined, // attributes
                                  ),
                              ]
                            : []),
                    ]);
                } else {
                    return node;
                }
            });
    };

    const sourceFile = createSourceFile('index.ts', source, ScriptTarget.ESNext, /* setParentNodes */ true);

    const result = transform(sourceFile, [transformer]);
    return createPrinter().printNode(EmitHint.Unspecified, result.transformed[0], sourceFile);
}

/**
 * Takes the global declarations for a TypeScript and wraps export statements in `declare global`
 * @param decl The untransformed global declarations
 */
export function transformGlobalDeclarations(decl: string): string {
    const transformer: TransformerFactory<SourceFile> = (_context: TransformationContext): any => {
        return (sourceFile: SourceFile) =>
            visitNode(sourceFile, (node: SourceFile): SourceFile => {
                if (isSourceFile(node)) {
                    // All non-export-statements stay at the root level, the rest is wrapped in `declare global`
                    const exportStatements = node.statements.filter(
                        // @ts-expect-error s should have modifiers
                        s => s.modifiers?.some(m => m.kind === SyntaxKind.ExportKeyword),
                    );
                    const otherStatements = node.statements.filter(s => !exportStatements.includes(s));

                    const hasExportStatements = exportStatements.length > 0;
                    const hasImport = otherStatements.some(
                        s => isImportDeclaration(s) || isImportEqualsDeclaration(s),
                    );

                    return factory.updateSourceFile(node, [
                        ...otherStatements,
                        ...(hasExportStatements
                            ? [wrapInDeclareGlobal(exportStatements.map(s => removeDeclareModifier(s)))]
                            : []),
                        ...(hasImport
                            ? [] // If there is an import, the script is already treated as a module
                            : [
                                  // Otherwise, put an empty export {}; at the bottom to force TypeScript to treat the script as a module
                                  factory.createExportDeclaration(
                                      undefined,
                                      false,
                                      factory.createNamedExports([]),
                                      undefined,
                                      undefined,
                                  ),
                              ]),
                    ]);
                }

                return node;
            });
    };

    const sourceFile = createSourceFile('index.d.ts', decl, ScriptTarget.ESNext, /* setParentNodes */ true);

    const result = transform(sourceFile, [transformer]);
    return createPrinter().printNode(EmitHint.Unspecified, result.transformed[0], sourceFile);
}

/**
 * Translates a script ID to a filename for the compiler
 *
 * @param scriptID The ID of the script
 */
export function scriptIdToTSFilename(scriptID: string): string {
    return `${scriptID.replace(/^script.js./, '').replace(/\./g, '/')}.ts`;
}
