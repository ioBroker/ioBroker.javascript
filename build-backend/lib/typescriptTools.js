'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTypescriptLibs = resolveTypescriptLibs;
exports.resolveTypings = resolveTypings;
exports.transformScriptBeforeCompilation = transformScriptBeforeCompilation;
exports.transformGlobalDeclarations = transformGlobalDeclarations;
exports.scriptIdToTSFilename = scriptIdToTSFilename;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const typescript_1 = require("typescript");
const tools_1 = require("./tools");
/**
 * Resolves all TypeScript lib files for the editor
 *
 * @param targetLib The lib to target (e.g., es2017)
 */
function resolveTypescriptLibs(targetLib) {
    const typescriptLibRoot = (0, node_path_1.dirname)(require.resolve(`typescript/lib/lib.d.ts`));
    const ret = {};
    const libReferenceRegex = /\/\/\/ <reference lib=["']([^"']+)["'] \/>/g;
    const matchAllLibs = (str) => (0, tools_1.matchAll)(libReferenceRegex, str).map(groups => groups[0]);
    const libQueue = [targetLib];
    while (libQueue.length > 0) {
        const libName = libQueue.shift();
        const filename = `lib.${libName}.d.ts`;
        // Read the file and remember it in the return dictionary
        const fileContent = (0, node_fs_1.readFileSync)((0, node_path_1.join)(typescriptLibRoot, filename), 'utf8');
        ret[filename] = fileContent;
        // If this file references another lib file, we need to load that too.
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
    if (filename.endsWith('.d.ts')) {
        return filename;
    }
    // an extensionless import
    if ((0, node_fs_1.existsSync)(`${filename}.d.ts`)) {
        return `${filename}.d.ts`;
    }
    // or a directory import
    return (0, node_path_1.join)(filename, 'index.d.ts');
}
/**
 * Resolves the type declarations of a 3rd party package for the editor
 *
 * @param pkg The package whose typings we're interested in
 * @param adapterScopedPackageName the package name on the system
 * @param wrapInDeclareModule Whether the root file should be wrapped in `declare module "<pkg>" { ... }`
 * @returns The found declarations or undefined if none were found
 */
function resolveTypings(pkg, adapterScopedPackageName, wrapInDeclareModule) {
    let packageJsonPath;
    let packageJson;
    let rootTypings;
    let pkgIncludesTypings = true;
    function tryToLoadPackage(path) {
        try {
            packageJsonPath = require.resolve(path);
            packageJson = require(packageJsonPath);
            rootTypings =
                typeof packageJson.types === 'string'
                    ? packageJson.types
                    : typeof packageJson.typings === 'string'
                        ? packageJson.typings
                        : undefined;
        }
        catch {
            /* ignore */
        }
    }
    // First, try to resolve the package itself in case it brings its own typings
    tryToLoadPackage(`${adapterScopedPackageName}/package.json`);
    if (!rootTypings) {
        tryToLoadPackage(`${pkg}/package.json`);
    }
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
    const packageRoot = (0, node_path_1.dirname)(packageJsonPath);
    const normalizeImportPath = (filename) => (0, node_path_1.normalize)(`node_modules/${pkgIncludesTypings ? adapterScopedPackageName : `@types/${pkg}`}/${(0, node_path_1.relative)(packageRoot, filename)}`).replace(/\\/g, '/');
    const ret = {};
    // We need to look at `import/export ... from 'modulename'` and `/// <reference path='...' />`
    const importDtsRegex = /^\s*(?:import|export) .+ from ["'](\.+\/[^"']+)["']/g;
    const pathReferenceRegex = /\/\/\/ <reference path=["']([^"']+)["'] \/>/g;
    const matchAllImports = (str) => [...(0, tools_1.matchAll)(importDtsRegex, str), ...(0, tools_1.matchAll)(pathReferenceRegex, str)].map(groups => groups[0]);
    // the paths are relative to the package.json - we need an absolute path to read the files
    rootTypings = (0, node_path_1.join)(packageRoot, rootTypings);
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
        const dirName = (0, node_path_1.dirname)(filename);
        // Read the file and remember it in the return dictionary
        let fileContent;
        try {
            fileContent = (0, node_fs_1.readFileSync)(filename, 'utf8');
        }
        catch (e) {
            // The typings are malformed
            console.error(`Failed to load definitions for ${pkg}: ${e.toString()}`);
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
            .map(file => (0, node_path_1.join)(dirName, file))
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
function mustBeHoisted(s, isGlobal) {
    return !!(
    // Import/export statements must be moved to the top
    ((0, typescript_1.isImportDeclaration)(s) ||
        (0, typescript_1.isImportEqualsDeclaration)(s) ||
        (0, typescript_1.isExportDeclaration)(s) ||
        (0, typescript_1.isExportAssignment)(s) ||
        // as well as many declarations
        (0, typescript_1.isTypeAliasDeclaration)(s) ||
        (0, typescript_1.isInterfaceDeclaration)(s) ||
        (0, typescript_1.isModuleDeclaration)(s) ||
        (0, typescript_1.isEnumDeclaration)(s) ||
        (isGlobal &&
            // in global scripts we don't wrap classes and functions, so they can be accessed from non-global scripts
            ((0, typescript_1.isClassDeclaration)(s) || (0, typescript_1.isFunctionDeclaration)(s))) ||
        // and declare ... / export ... statements
        s.modifiers?.some(s => s.kind === typescript_1.SyntaxKind.DeclareKeyword || s.kind === typescript_1.SyntaxKind.ExportKeyword)));
}
function canBeExported(s) {
    return (
    // const, let, var
    (0, typescript_1.isVariableStatement)(s) ||
        // type, interface, enum, class, function
        (0, typescript_1.isTypeAliasDeclaration)(s) ||
        (0, typescript_1.isInterfaceDeclaration)(s) ||
        (0, typescript_1.isEnumDeclaration)(s) ||
        (0, typescript_1.isClassDeclaration)(s) ||
        (0, typescript_1.isFunctionDeclaration)(s));
}
function addExportModifier(s) {
    let modifiers;
    // Add export modifiers
    if (!s.modifiers) {
        modifiers = [typescript_1.factory.createModifier(typescript_1.SyntaxKind.ExportKeyword)];
    }
    else if (!s.modifiers.some(m => m.kind === typescript_1.SyntaxKind.ExportKeyword)) {
        modifiers = [...s.modifiers, typescript_1.factory.createModifier(typescript_1.SyntaxKind.ExportKeyword)];
    }
    else {
        return s;
    }
    if ((0, typescript_1.isVariableStatement)(s)) {
        return typescript_1.factory.updateVariableStatement(s, modifiers, s.declarationList);
    }
    if ((0, typescript_1.isTypeAliasDeclaration)(s)) {
        return typescript_1.factory.updateTypeAliasDeclaration(s, modifiers, s.name, s.typeParameters, s.type);
    }
    if ((0, typescript_1.isInterfaceDeclaration)(s)) {
        return typescript_1.factory.updateInterfaceDeclaration(s, modifiers, s.name, s.typeParameters, s.heritageClauses, s.members);
    }
    if ((0, typescript_1.isEnumDeclaration)(s)) {
        return typescript_1.factory.updateEnumDeclaration(s, modifiers, s.name, s.members);
    }
    if ((0, typescript_1.isClassDeclaration)(s)) {
        return typescript_1.factory.updateClassDeclaration(s, modifiers, s.name, s.typeParameters, s.heritageClauses, s.members);
    }
    if ((0, typescript_1.isFunctionDeclaration)(s)) {
        return typescript_1.factory.updateFunctionDeclaration(s, modifiers, s.asteriskToken, s.name, s.typeParameters, s.parameters, s.type, s.body);
    }
    return s;
}
function removeDeclareModifier(s) {
    let modifiers;
    // Remove declare modifiers
    if (s.modifiers) {
        modifiers = s.modifiers.filter(m => m.kind !== typescript_1.SyntaxKind.DeclareKeyword);
    }
    else {
        return s;
    }
    if ((0, typescript_1.isVariableStatement)(s)) {
        return typescript_1.factory.updateVariableStatement(s, modifiers, s.declarationList);
    }
    if ((0, typescript_1.isTypeAliasDeclaration)(s)) {
        return typescript_1.factory.updateTypeAliasDeclaration(s, modifiers, s.name, s.typeParameters, s.type);
    }
    if ((0, typescript_1.isInterfaceDeclaration)(s)) {
        return typescript_1.factory.updateInterfaceDeclaration(s, modifiers, s.name, s.typeParameters, s.heritageClauses, s.members);
    }
    if ((0, typescript_1.isEnumDeclaration)(s)) {
        return typescript_1.factory.updateEnumDeclaration(s, modifiers, s.name, s.members);
    }
    if ((0, typescript_1.isClassDeclaration)(s)) {
        return typescript_1.factory.updateClassDeclaration(s, modifiers, s.name, s.typeParameters, s.heritageClauses, s.members);
    }
    if ((0, typescript_1.isFunctionDeclaration)(s)) {
        return typescript_1.factory.updateFunctionDeclaration(s, modifiers, s.asteriskToken, s.name, s.typeParameters, s.parameters, s.type, s.body);
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
function isGlobalAugmentation(s) {
    return !!(((0, typescript_1.isInterfaceDeclaration)(s) || (0, typescript_1.isClassDeclaration)(s) || (0, typescript_1.isFunctionDeclaration)(s)) &&
        s.name &&
        NodeJSGlobals.includes(s.name.text));
}
function wrapInDeclareGlobal(statements) {
    return typescript_1.factory.createModuleDeclaration([typescript_1.factory.createModifier(typescript_1.SyntaxKind.DeclareKeyword)], typescript_1.factory.createIdentifier('global'), typescript_1.factory.createModuleBlock(statements), typescript_1.NodeFlags.GlobalAugmentation);
}
/**
 * Takes a TypeScript script and does the necessary transformations, so it can be compiled properly
 *
 * @param source The original TypeScript source
 * @param isGlobal Whether the transformed script is a global script or not
 */
function transformScriptBeforeCompilation(source, isGlobal) {
    const transformer = (_context) => {
        return (sourceFile) => (0, typescript_1.visitNode)(sourceFile, (node) => {
            if ((0, typescript_1.isSourceFile)(node)) {
                // Wrap all declarations that augment global interfaces in `declare global`
                const augmentations = node.statements.filter(s => isGlobalAugmentation(s));
                const nonAugmentations = node.statements.filter(s => !isGlobalAugmentation(s));
                // If there is no top level await, don't move all the statements around
                const hasTLA = node.statements.some(s => (0, typescript_1.isExpressionStatement)(s) && s.expression.kind === typescript_1.SyntaxKind.AwaitExpression);
                // Move all statements to the top of the file that cannot appear in a function body
                let hoistedStatements = hasTLA
                    ? typescript_1.factory.createNodeArray(nonAugmentations.filter(s => mustBeHoisted(s, isGlobal)))
                    : typescript_1.factory.createNodeArray(nonAugmentations);
                // The rest gets wrapped
                const wrappedStatements = hasTLA ? nonAugmentations.filter(s => !mustBeHoisted(s, isGlobal)) : [];
                // When transforming global scripts, we need to do a couple of things
                if (isGlobal) {
                    // 1. We need to add an export modifier to everything at the top level that can be exported
                    hoistedStatements = (0, typescript_1.visitNodes)(hoistedStatements, 
                    // @ts-expect-error s is definitely a Statement
                    s => (canBeExported(s) ? addExportModifier(s) : s));
                    // 3. We need to transform the generated declarations to use `declare global` (this will happen in transformGlobalDeclarations)
                }
                const needsEmptyExport = 
                // An empty export is necessary when there is no import declaration
                !node.statements.some(s => (0, typescript_1.isImportDeclaration)(s) || (0, typescript_1.isImportEqualsDeclaration)(s)) &&
                    // And there is no statement in a global script which had an export modifier added
                    (!(isGlobal &&
                        hoistedStatements.some(
                        // @ts-expect-error s should have modifiers
                        s => s.modifiers?.some(m => m.kind === typescript_1.SyntaxKind.ExportKeyword))) ||
                        // Or if there is a `declare global` statement
                        !!augmentations);
                return typescript_1.factory.updateSourceFile(node, [
                    // Put the hoisted statements at the top (or all of them if there's no top level await)
                    ...hoistedStatements,
                    // Then add everything that augments the global scope
                    ...(augmentations && augmentations.length ? [wrapInDeclareGlobal(augmentations)] : []),
                    ...(hasTLA
                        ? // If there is a top-level await, wrap all non-hoisted statements in (async () => { ... })();
                            [
                                typescript_1.factory.createExpressionStatement(typescript_1.factory.createCallExpression(typescript_1.factory.createArrowFunction([typescript_1.factory.createModifier(typescript_1.SyntaxKind.AsyncKeyword)], undefined, [], undefined, undefined, typescript_1.factory.createBlock(wrappedStatements)), undefined, undefined)),
                            ]
                        : []),
                    ...(needsEmptyExport
                        ? [
                            // Put an empty export {}; at the bottom to force TypeScript to treat the script as a module
                            typescript_1.factory.createExportDeclaration(undefined, // ModifierLike[] | undefined
                            false, // isTypeOnly
                            typescript_1.factory.createNamedExports([]), // NamedExportBindings | undefined
                            undefined, // moduleSpecifier
                            undefined),
                        ]
                        : []),
                ]);
            }
            return node;
        });
    };
    const sourceFile = (0, typescript_1.createSourceFile)('index.ts', source, typescript_1.ScriptTarget.ESNext, /* setParentNodes */ true);
    const result = (0, typescript_1.transform)(sourceFile, [transformer]);
    return (0, typescript_1.createPrinter)().printNode(typescript_1.EmitHint.Unspecified, result.transformed[0], sourceFile);
}
/**
 * Takes the global declarations for a TypeScript and wraps export statements in `declare global`
 *
 * @param decl The untransformed global declarations
 */
function transformGlobalDeclarations(decl) {
    const transformer = (_context) => {
        return (sourceFile) => (0, typescript_1.visitNode)(sourceFile, (node) => {
            if ((0, typescript_1.isSourceFile)(node)) {
                // All non-export-statements stay at the root level, the rest is wrapped in `declare global`
                const exportStatements = node.statements.filter(
                // @ts-expect-error s should have modifiers
                s => s.modifiers?.some(m => m.kind === typescript_1.SyntaxKind.ExportKeyword));
                const otherStatements = node.statements.filter(s => !exportStatements.includes(s));
                const hasExportStatements = exportStatements.length > 0;
                const hasImport = otherStatements.some(s => (0, typescript_1.isImportDeclaration)(s) || (0, typescript_1.isImportEqualsDeclaration)(s));
                return typescript_1.factory.updateSourceFile(node, [
                    ...otherStatements,
                    ...(hasExportStatements
                        ? [wrapInDeclareGlobal(exportStatements.map(s => removeDeclareModifier(s)))]
                        : []),
                    ...(hasImport
                        ? [] // If there is an import, the script is already treated as a module
                        : [
                            // Otherwise, put an empty export {}; at the bottom to force TypeScript to treat the script as a module
                            typescript_1.factory.createExportDeclaration(undefined, false, typescript_1.factory.createNamedExports([]), undefined, undefined),
                        ]),
                ]);
            }
            return node;
        });
    };
    const sourceFile = (0, typescript_1.createSourceFile)('index.d.ts', decl, typescript_1.ScriptTarget.ESNext, /* setParentNodes */ true);
    const result = (0, typescript_1.transform)(sourceFile, [transformer]);
    return (0, typescript_1.createPrinter)().printNode(typescript_1.EmitHint.Unspecified, result.transformed[0], sourceFile);
}
/**
 * Translates a script ID to a filename for the compiler
 *
 * @param scriptID The ID of the script
 */
function scriptIdToTSFilename(scriptID) {
    return `${scriptID.replace(/^script.js./, '').replace(/\./g, '/')}.ts`;
}
//# sourceMappingURL=typescriptTools.js.map