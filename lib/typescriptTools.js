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

/**
 * Takes a TypeScript script and does the necessary transformations so it can be compiled properly
 * @param {string} source
 * @returns {string}
 */
function transformScriptBeforeCompilation(source) {
    /**
     * @type {import("typescript").TransformerFactory<import("typescript").SourceFile>}
     */
    // eslint-disable-next-line no-unused-vars
    const transformer = (_context) => {
        return (sourceFile) =>
            ts.visitNode(sourceFile, (node) => {
                if (ts.isSourceFile(node)) {
                    // Move all import statements to the top of the file
                    const importStatements = node.statements.filter(
                        (s) => ts.isImportDeclaration(s) || ts.isImportEqualsDeclaration(s)
                    );
                    const otherStatements = node.statements.filter(
                        (s) =>
                            !ts.isImportDeclaration(s) && !ts.isImportEqualsDeclaration(s)
                    );

                    return ts.updateSourceFileNode(node, [
                        // Put the import statements at the top
                        ...importStatements,
                        // Wrap all other statements in (async () => { ... })();
                        ts.createExpressionStatement(
                            ts.createCall(
                                ts.createArrowFunction(
                                    [ts.createModifier(ts.SyntaxKind.AsyncKeyword)],
                                    undefined,
                                    [],
                                    undefined,
                                    undefined,
                                    ts.createBlock(otherStatements)
                                ),
                                undefined,
                                undefined
                            )
                        ),
                        // Put an empty export {}; at the bottom to force TypeScript to treat the script as a module
                        ts.createExportDeclaration(undefined, undefined, ts.createNamedExports([]), undefined, undefined),
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
};
