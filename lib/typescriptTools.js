'use strict';

const fs = require('fs');
const path = require('path');
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
    // First, try to resolve the package itself in case it brings its own typings
    try {
        packageJsonPath = require.resolve(`${pkg}/package.json`);
    } catch (e) {
        // If that didn't work, try again with the @types version of the package
        try {
            packageJsonPath = require.resolve(`@types/${pkg}/package.json`);
        } catch (e) {
            // TODO: download @types/<packagename>
            return {};
        }
    }
    const packageJson = require(packageJsonPath);

    /** @type {string | undefined} */
    let rootTypings = typeof packageJson.types === 'string' ? packageJson.types
        : typeof packageJson.typings === 'string' ? packageJson.typings
            : undefined;
    if (!rootTypings) {
        return {};
    }

    const packageRoot = path.dirname(packageJsonPath);

    const ret = {};

    // We need to look at `import ... from 'modulename'` and `/// <reference path='...' />`
    const importDtsRegex = /import .+ from ["'](\.\/[^"']+)["']/g;
    const pathReferenceRegex = /\/\/\/ <reference path=["']([^"']+)["'] \/>/g;
    const matchAllImports = string => [
        ...matchAll(importDtsRegex, string),
        ...matchAll(pathReferenceRegex, string)
    ].map(groups => groups[0]);

    // some @types packages specify `index` as their typings file instead of `index.d.ts`
    if (!rootTypings.endsWith('.d.ts')) rootTypings += '.d.ts';
    rootTypings = path.join(packageRoot, rootTypings);

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
        const relativePath = `@types/${pkg}/${path.relative(packageRoot, filename)}`.replace(/\\/g, '/');
        // If necessary, wrap the root typings (only those!)
        ret[relativePath] = wrapInDeclareModule && filename === rootTypings
            ? `declare module "${pkg}" { ${fileContent} }`
            : fileContent;
        // If this file references another .d.ts file, we need to load that too
        matchAllImports(fileContent)
            // resolve the file relative to the current directory
            .map(file => path.join(dirName, file))
            // find out the correct path of the file we want to import
            .map(normalizeDTSImport)
            // Find all libs we have not loaded yet
            .filter(file => !(file in ret))
            .forEach(file => definitionQueue.push(file));
    }
    return ret;
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
    resolveTypings
};
