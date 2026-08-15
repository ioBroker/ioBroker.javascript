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
 * The transformed sources are stored in the ioBroker database and mirrored to disk, so they must
 * not depend on the platform or on a TypeScript default. TypeScript 5 printed CRLF here and
 * TypeScript 6 prints LF - pinning it keeps a compiler update from silently rewriting every script.
 */
const PRINTER_OPTIONS = { newLine: typescript_1.NewLineKind.LineFeed };
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
 * Wraps a package's root declarations in `declare module "<pkg>"` if - and only if - they are not a
 * module themselves.
 *
 * This used to be applied to every package. That broke all of them that ship real typings: inside an
 * ambient module declaration TypeScript does not resolve the relative paths a barrel file re-exports
 * from, so every name the package exported became `any` - which is why type inference never worked
 * for e.g. rxjs (https://github.com/ioBroker/ioBroker.javascript/issues/2341). Such a file is now
 * left alone and found through ordinary module resolution.
 *
 * A declaration file without any top-level `import`/`export` is a script, not a module, and
 * `import ... from "<pkg>"` would not accept it. Those still need the wrapper - and having no
 * imports, they cannot suffer from the problem above.
 *
 * A file that only points at other files (`@types/node` is nothing but `/// <reference path>` lines)
 * is left alone as well: the wrapper would cut those references off from the global scope they are
 * meant to populate.
 *
 * @param pkg The package the declarations belong to
 * @param content The content of the root declaration file
 */
function wrapRootTypingsIfNeeded(pkg, content) {
    const isModule = /^\s*(?:import|export)\b/m.test(content);
    const isAmbientDeclaration = /^\s*declare module/m.test(content);
    const referencesOtherFiles = /\/\/\/\s*<reference path=/.test(content);
    return isModule || isAmbientDeclaration || referencesOtherFiles
        ? content
        : `declare module "${pkg}" { ${content} }`;
}
/**
 * Finds the package.json of a package on disk.
 *
 * `require.resolve("<pkg>/package.json")` goes through Node's module resolution, and a package with
 * an `exports` map that does not list `./package.json` makes that throw - which is common enough
 * among modern packages to matter. The directories Node would have searched are then looked at
 * directly, which no `exports` map can hide.
 *
 * @param pkg The package to look for
 */
function findPackageJson(pkg) {
    try {
        return require.resolve(`${pkg}/package.json`);
    }
    catch {
        // the package may be there but refuse to hand out its manifest
    }
    return (require.resolve.paths(pkg) || [])
        .map(dir => (0, node_path_1.join)(dir, pkg, 'package.json'))
        .find(candidate => (0, node_fs_1.existsSync)(candidate));
}
/**
 * Finds the declaration entry point of a package.
 *
 * A package that ships an `exports` map often keeps the legacy `types` field only as a stub - rxjs 7
 * declares `"types": "index.d.ts"` although no such file exists and the real declarations sit in
 * `./dist/types/`. A candidate therefore only counts if the file is really there
 * (https://github.com/ioBroker/ioBroker.javascript/issues/928).
 *
 * @param packageJson The parsed package.json
 * @param packageRoot The directory that package.json lives in
 */
function findRootTypings(packageJson, packageRoot) {
    const mainExport = packageJson.exports?.['.'];
    const fromExports = mainExport && typeof mainExport === 'object'
        ? (mainExport.types ??
            mainExport.require?.types ??
            mainExport.import?.types ??
            mainExport.default?.types)
        : undefined;
    // the legacy fields come first: they are what a package without an `exports` map has, and where
    // both exist they agree
    return [packageJson.types, packageJson.typings, fromExports].find(candidate => typeof candidate === 'string' && (0, node_fs_1.existsSync)(normalizeDTSImport((0, node_path_1.join)(packageRoot, candidate))));
}
/**
 * Resolves the type declarations of a 3rd party package for the editor and the compiler
 *
 * The declarations are handed to TypeScript as a virtual file system. They are placed under the name
 * the *scripts* import - `node_modules/rxjs/...` - not under the name the package has on disk: the
 * js-controller installs script libraries under an adapter-scoped alias, and TypeScript has to
 * resolve `import ... from "rxjs"` against these files.
 *
 * @param pkg The package whose typings we're interested in
 * @param adapterScopedPackageName the package name on the system
 * @returns The found declarations or undefined if none were found
 */
function resolveTypings(pkg, adapterScopedPackageName) {
    let packageJsonPath;
    let packageJson;
    let rootTypings;
    let pkgIncludesTypings = true;
    function tryToLoadPackage(name) {
        const found = findPackageJson(name);
        if (!found) {
            return;
        }
        try {
            packageJsonPath = found;
            packageJson = require(found);
            rootTypings = findRootTypings(packageJson, (0, node_path_1.dirname)(found));
        }
        catch {
            /* ignore */
        }
    }
    // First, try to resolve the package itself in case it brings its own typings
    tryToLoadPackage(adapterScopedPackageName);
    if (!rootTypings) {
        tryToLoadPackage(pkg);
    }
    // If that didn't work, try again with the @types version of the package
    if (!rootTypings) {
        tryToLoadPackage(`@types/${pkg}`);
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
    /**
     * The directory the declarations get in the virtual file system. It has to be the one the
     * `package.json` below is written to, otherwise TypeScript reads that file, follows its `types`
     * entry and finds nothing - which used to leave every import from the package typed as `any`.
     */
    const virtualPackageDir = `node_modules/${pkgIncludesTypings ? '' : '@types/'}${pkg}`;
    // We need to look at everything that names another file of the package: `import ... from "./x"`,
    // `export ... from "./x"`, the side effect import `import "./x"`, `import x = require("./x")`,
    // and `/// <reference path='...' />`.
    //
    // The `m` flag is what makes `^` match every line instead of only the start of the file. Without
    // it, exactly one import per file was followed - and only if it happened to be the first thing in
    // it. For rxjs 6 that collected 6 of its ~800 declaration files.
    //
    // Everything between the keyword and the path is skipped, so the shape of the import does not
    // matter and it may span several lines. `[^;]` stops that at the statement's semicolon, so a
    // match can never run into the next statement.
    const importDtsRegex = /^\s*(?:import|export)\s[^;]*?["'](\.+\/[^"']+)["']/gm;
    const pathReferenceRegex = /\/\/\/ <reference path=["']([^"']+)["'] \/>/g;
    const matchAllImports = (str) => [...(0, tools_1.matchAll)(importDtsRegex, str), ...(0, tools_1.matchAll)(pathReferenceRegex, str)].map(groups => groups[0]);
    // the paths are relative to the package.json - we need an absolute path to read the files
    rootTypings = (0, node_path_1.join)(packageRoot, rootTypings);
    // some @types packages specify `index` as their typings file instead of `index.d.ts`
    rootTypings = normalizeDTSImport(rootTypings);
    // recursively load all typings, keyed by their location on disk
    const collected = new Map();
    const definitionQueue = [rootTypings];
    while (definitionQueue.length > 0) {
        const filename = definitionQueue.shift();
        if (collected.has(filename)) {
            continue;
        }
        let fileContent;
        try {
            fileContent = (0, node_fs_1.readFileSync)(filename, 'utf8');
        }
        catch (e) {
            // Without the entry point there is nothing to hand to TypeScript
            if (filename === rootTypings) {
                console.error(`Failed to load definitions for ${pkg}: ${e.toString()}`);
                return undefined;
            }
            // A referenced file was there a moment ago but cannot be read now. Dropping every
            // declaration of the package over one unreadable file would be out of proportion.
            console.warn(`Skipped a definition file of ${pkg}: ${e.toString()}`);
            continue;
        }
        collected.set(filename, fileContent);
        // If this file references another .d.ts file, we need to load that too
        matchAllImports(fileContent)
            // resolve the file relative to the current directory
            .map(file => (0, node_path_1.join)((0, node_path_1.dirname)(filename), file))
            // find out the correct path of the file we want to import
            .map(normalizeDTSImport)
            // A package may import something it does not ship declarations for, and the matcher
            // above may pick up a string that only looks like a path
            .filter(file => (0, node_fs_1.existsSync)(file))
            // Find all libs we have not loaded yet
            .filter(file => !collected.has(file))
            .forEach(file => definitionQueue.push(file));
    }
    /**
     * The directory that becomes `node_modules/<pkg>` in the virtual file system.
     *
     * `virtual-tsc` resolves with `moduleResolution: node10`, which looks the entry point up next to
     * the package - so laying the files out around the entry point rather than around the
     * package.json is what makes a package work whose declarations sit in a subdirectory. For a
     * package whose entry point is at its root - the usual case - this is the package root and
     * nothing changes.
     */
    let virtualRoot = (0, node_path_1.dirname)(rootTypings);
    if ([...collected.keys()].some(file => (0, node_path_1.relative)(virtualRoot, file).startsWith('..'))) {
        // Declarations reach above the entry point. Moving them would break the relative imports
        // between them, so the layout of the package is kept as it is.
        virtualRoot = packageRoot;
    }
    const toVirtualPath = (filename) => (0, node_path_1.normalize)(`${virtualPackageDir}/${(0, node_path_1.relative)(virtualRoot, filename)}`).replace(/\\/g, '/');
    const ret = {};
    for (const [filename, fileContent] of collected) {
        ret[toVirtualPath(filename)] =
            filename === rootTypings ? wrapRootTypingsIfNeeded(pkg, fileContent) : fileContent;
    }
    // Include a package.json, so TypeScript can look up the entry point. It describes the layout
    // above, not the one the package has on disk - and it is deliberately minimal: the original
    // `exports` map refers to paths that do not exist here, and TypeScript refuses to resolve the
    // package at all when it finds one it cannot follow under `moduleResolution: node10`.
    ret[`${virtualPackageDir}/package.json`] = JSON.stringify({
        name: pkg,
        version: packageJson?.version,
        types: `./${(0, node_path_1.relative)(virtualRoot, rootTypings).replace(/\\/g, '/')}`,
    });
    // Avoid returning empty declarations
    if (!collected.size) {
        return undefined;
    }
    return ret;
}
/**
 * @param s Statement to check whether it must be hoisted to the top of the file
 * @param isGlobal Whether this is a global script or a normal one
 */
function mustBeHoisted(s, isGlobal) {
    return !!(
    // Import/export statements must be moved to the top
    (0, typescript_1.isImportDeclaration)(s) ||
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
        s.modifiers?.some(s => s.kind === typescript_1.SyntaxKind.DeclareKeyword || s.kind === typescript_1.SyntaxKind.ExportKeyword));
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
    return (0, typescript_1.createPrinter)(PRINTER_OPTIONS).printNode(typescript_1.EmitHint.Unspecified, result.transformed[0], sourceFile);
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
    return (0, typescript_1.createPrinter)(PRINTER_OPTIONS).printNode(typescript_1.EmitHint.Unspecified, result.transformed[0], sourceFile);
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