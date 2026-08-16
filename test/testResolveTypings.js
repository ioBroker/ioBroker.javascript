const assert = require('node:assert').strict;
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const tsc = require('virtual-tsc');

const { resolveTypings, resolveTypescriptLibs } = require('../build/lib/typescriptTools');
const { tsCompilerOptions } = require('../build/lib/typescriptSettings');

/**
 * Regression tests for https://github.com/ioBroker/ioBroker.javascript/issues/2341
 *
 * Everything a script imports arrives at the compiler through `resolveTypings`. When that hands over
 * an incomplete or unreachable set of declarations, TypeScript falls back to `any` - silently, until
 * a strict check turns the `any` into an error. The tests below therefore do not only look at the
 * files that come out: they compile against them and insist that wrong code is rejected.
 */

/** Installed under an alias, the way js-controller installs a script library... */
const ALIAS = '@iobroker-test/alias_fixturelib';
/** ...while the scripts import it under its real name */
const PKG = 'fixturelib';
/** A package whose declarations are not a module - those still need to be wrapped */
const GLOBAL_PKG = 'globalfixturelib';
/** A modern package: declarations in a subdirectory, reachable only through the `exports` map */
const MODERN_PKG = 'modernfixturelib';

const FIXTURE_FILES = {
    [`${ALIAS}/package.json`]: JSON.stringify({ name: ALIAS, version: '1.0.0', types: 'index.d.ts' }),
    // The barrel: the first re-export is what the matcher always found, the second one only shows up
    // when every line is looked at, and the side effect import has no `from` at all.
    [`${ALIAS}/index.d.ts`]: `export { Emitter } from './internal/Emitter';
export { Handler } from './internal/Handler';
import './internal/globals';
`,
    [`${ALIAS}/internal/Emitter.d.ts`]: `import { Handler } from './Handler';
export declare class Emitter<T> {
    constructor(subscribe?: (handler: Handler<T>) => void);
}
`,
    [`${ALIAS}/internal/Handler.d.ts`]: `export declare class Handler<T> {
    next(value: T): void;
}
`,
    [`${ALIAS}/internal/globals.d.ts`]: `declare global {
    const fixtureGlobalValue: string;
}
export {};
`,
    [`${GLOBAL_PKG}/package.json`]: JSON.stringify({ name: GLOBAL_PKG, version: '1.0.0', types: 'index.d.ts' }),
    [`${GLOBAL_PKG}/index.d.ts`]: `declare function globalFixtureFunction(): string;\n`,

    // The shape rxjs 7 has: a legacy `types` field kept as a stub that points at a file which does
    // not exist, while the real declarations live in a subdirectory named by the `exports` map.
    [`${MODERN_PKG}/package.json`]: JSON.stringify({
        name: MODERN_PKG,
        version: '2.0.0',
        types: 'index.d.ts',
        exports: { '.': { types: './dist/types/index.d.ts', require: './dist/cjs/index.js' } },
    }),
    [`${MODERN_PKG}/dist/types/index.d.ts`]: `export { Emitter } from './internal/Emitter';\n`,
    [`${MODERN_PKG}/dist/types/internal/Emitter.d.ts`]: `export declare class Emitter<T> {
    constructor(subscribe?: (handler: { next(value: T): void }) => void);
}
`,
};

describe('resolveTypings', () => {
    let tempDir;
    let originalNodePath;

    before(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iobroker-typings-'));
        const modulesDir = path.join(tempDir, 'node_modules');

        for (const [relativePath, content] of Object.entries(FIXTURE_FILES)) {
            const target = path.join(modulesDir, relativePath);
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, content, 'utf8');
        }

        // `resolveTypings` looks the package up with `require.resolve`, so the fixtures have to be
        // resolvable by name. Re-reading NODE_PATH is the only way to add a directory to that at
        // runtime - it keeps the fixtures out of the repository's own node_modules.
        originalNodePath = process.env.NODE_PATH;
        process.env.NODE_PATH = originalNodePath ? `${modulesDir}${path.delimiter}${originalNodePath}` : modulesDir;
        Module._initPaths();
    });

    after(() => {
        if (originalNodePath === undefined) {
            delete process.env.NODE_PATH;
        } else {
            process.env.NODE_PATH = originalNodePath;
        }
        Module._initPaths();
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('places the declarations under the name the scripts import, not the name on disk', () => {
        const typings = resolveTypings(PKG, ALIAS);

        // The alias must not leak into the virtual file system: TypeScript resolves
        // `import ... from "fixturelib"` against these paths, and it reads the entry point from the
        // package.json next to them.
        assert.ok(typings, 'no typings were resolved');
        assert.ok(
            Object.keys(typings).every(file => file.startsWith(`node_modules/${PKG}/`)),
            `declarations outside node_modules/${PKG}/: ${JSON.stringify(Object.keys(typings))}`,
        );
        assert.ok(typings[`node_modules/${PKG}/package.json`], 'the package.json is missing');
        assert.ok(typings[`node_modules/${PKG}/index.d.ts`], 'the entry point is missing');
    });

    it('follows more than the first import of a declaration file', () => {
        const typings = resolveTypings(PKG, ALIAS);

        // `Emitter` is re-exported on the first line of the barrel, `Handler` on the second one
        assert.ok(typings[`node_modules/${PKG}/internal/Emitter.d.ts`], 'the first re-export is missing');
        assert.ok(typings[`node_modules/${PKG}/internal/Handler.d.ts`], 'the second re-export is missing');
    });

    it('follows side effect imports', () => {
        const typings = resolveTypings(PKG, ALIAS);

        // `import './internal/globals';` has no `from` clause
        assert.ok(typings[`node_modules/${PKG}/internal/globals.d.ts`], 'the side effect import was not followed');
    });

    it('leaves declarations that are a module alone', () => {
        const typings = resolveTypings(PKG, ALIAS);

        // Wrapping a barrel in `declare module` cuts it off from what it re-exports
        assert.doesNotMatch(typings[`node_modules/${PKG}/index.d.ts`], /declare module/);
    });

    it('wraps declarations that are not a module', () => {
        const typings = resolveTypings(GLOBAL_PKG, GLOBAL_PKG);

        // Without the wrapper `import ... from "globalfixturelib"` would not accept the file
        assert.match(typings[`node_modules/${GLOBAL_PKG}/index.d.ts`], /^declare module "globalfixturelib"/);
    });

    it('finds the entry point of a modern package through its `exports` map', () => {
        const typings = resolveTypings(MODERN_PKG, MODERN_PKG);

        // The legacy `types` field of such a package is a stub pointing at a file that is not there.
        // Following it and giving up is what left every modern package untyped (#928).
        assert.ok(typings, 'no typings were resolved');
        assert.ok(typings[`node_modules/${MODERN_PKG}/index.d.ts`], 'the entry point is not where node10 looks');
        assert.match(typings[`node_modules/${MODERN_PKG}/index.d.ts`], /export \{ Emitter \}/);
    });

    it('gives a modern package a manifest that describes the layout it got', () => {
        const typings = resolveTypings(MODERN_PKG, MODERN_PKG);
        const manifest = JSON.parse(typings[`node_modules/${MODERN_PKG}/package.json`]);

        // The declarations were laid out around the entry point, so the original `types` no longer
        // applies - and the original `exports` map refers to paths that do not exist here at all.
        // TypeScript refuses to resolve a package whose `exports` it cannot follow under node10.
        assert.equal(manifest.types, './index.d.ts');
        assert.equal(manifest.exports, undefined);
    });

    it('leaves a file alone that only references other files', () => {
        const typings = resolveTypings('node', 'node');

        // @types/node is nothing but `/// <reference path>` lines. Wrapping it would cut those off
        // from the global scope they are meant to populate.
        assert.ok(typings, 'no typings were resolved for node');
        assert.doesNotMatch(typings['node_modules/@types/node/index.d.ts'], /declare module "node"/);
    });
});

describe('type inference through resolveTypings', () => {
    let tempDir;
    let originalNodePath;
    let tsServer;

    before(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iobroker-typings-compile-'));
        const modulesDir = path.join(tempDir, 'node_modules');

        for (const [relativePath, content] of Object.entries(FIXTURE_FILES)) {
            const target = path.join(modulesDir, relativePath);
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, content, 'utf8');
        }

        originalNodePath = process.env.NODE_PATH;
        process.env.NODE_PATH = originalNodePath ? `${modulesDir}${path.delimiter}${originalNodePath}` : modulesDir;
        Module._initPaths();

        // `strict` is off in the shipped options, which is exactly what hides a wrongly inferred
        // `any`. These tests turn it on so a missing type shows up as an error.
        tsServer = new tsc.Server({ ...tsCompilerOptions, strict: true }, false);
        tsServer.provideAmbientDeclarations(resolveTypescriptLibs('es2022'));
        tsServer.provideAmbientDeclarations(resolveTypings(PKG, ALIAS));
        tsServer.provideAmbientDeclarations(resolveTypings(MODERN_PKG, MODERN_PKG));
    });

    after(() => {
        if (originalNodePath === undefined) {
            delete process.env.NODE_PATH;
        } else {
            process.env.NODE_PATH = originalNodePath;
        }
        Module._initPaths();
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    /**
     * @param source The script to compile
     * @returns Whether it compiled, and the errors if it did not
     */
    function compile(source) {
        const result = tsServer.compile('index.ts', source);
        return {
            success: result.success,
            errors: result.diagnostics
                .filter(d => d.type === 'error')
                .map(d => d.description)
                .join('; '),
        };
    }

    it('infers the parameter types of a 3rd party library', () => {
        // This is the script from issue #2341, with the fixture in place of rxjs: the parameter has
        // to be inferred as `Handler<string>` instead of an implicit `any`.
        const result = compile(`import { Emitter } from '${PKG}';
new Emitter<string>(handler => { handler.next('a'); });
export {};
`);
        assert.equal(result.success, true, result.errors);
    }).timeout(20000);

    it('really types the library instead of falling back to any', () => {
        const result = compile(`import { Emitter } from '${PKG}';
const wrong: number = new Emitter<string>();
export {};
`);
        assert.equal(result.success, false, 'an Emitter was accepted as a number, so it is typed as any');
        // ...and it has to fail over the assignment, not because the library was never found
        assert.doesNotMatch(result.errors, /Cannot find module/, result.errors);
    }).timeout(20000);

    it('rejects a wrong argument on an inferred parameter', () => {
        const result = compile(`import { Emitter } from '${PKG}';
new Emitter<string>(handler => { handler.next(42); });
export {};
`);
        assert.equal(result.success, false, 'a number was accepted for an Emitter<string>');
        assert.doesNotMatch(result.errors, /Cannot find module/, result.errors);
    }).timeout(20000);

    it('makes a global from a side effect import visible', () => {
        // `fixtureGlobalValue` only exists in the file the barrel pulls in with `import './...'`
        const result = compile(`const value: string = fixtureGlobalValue;
log(value);
declare function log(text: string): void;
export {};
`);
        assert.equal(result.success, true, result.errors);
    }).timeout(20000);

    it('types a modern package whose declarations are named by the `exports` map', () => {
        const result = compile(`import { Emitter } from '${MODERN_PKG}';
new Emitter<string>(handler => { handler.next('a'); });
export {};
`);
        assert.equal(result.success, true, result.errors);
    }).timeout(20000);

    it('really types that package instead of falling back to any', () => {
        const result = compile(`import { Emitter } from '${MODERN_PKG}';
const wrong: number = new Emitter<string>();
export {};
`);
        assert.equal(result.success, false, 'an Emitter was accepted as a number, so it is typed as any');
        assert.doesNotMatch(result.errors, /Cannot find module/, result.errors);
    }).timeout(20000);
});
