const tsc = require('virtual-tsc');
const fs = require('node:fs');
const path = require('node:path');
const { Script } = require('node:vm');
const { tsCompilerOptions } = require('../build/lib/typescriptSettings');

const assert = require('node:assert').strict;
const {
    scriptIdToTSFilename,
    transformScriptBeforeCompilation,
    transformGlobalDeclarations,
    wrapCompiledGlobalScriptInCommonJsScope,
    wrapCompiledScriptInCommonJsScope,
} = require('../build/lib/typescriptTools');

describe('TypeScript tools', () => {
    describe('transformScriptBeforeCompilation', () => {
        it('wraps the top level in an async function', () => {
            const source = `await wait(100)`;
            const expected = `(async () => { await wait(100); })();`;
            const transformed = transformScriptBeforeCompilation(source, false);
            assert.ok(transformed.includes(expected));
        });

        it('...but only if it is really necessary', () => {
            const source = `log("test")`;
            const expected = `log("test");\nexport {};\n`;
            const transformed = transformScriptBeforeCompilation(source, false);
            assert.equal(transformed, expected);
        });

        it('forces non-global scripts to be treated as modules (part 1)', () => {
            const source = `const foo = 1;`;
            const expected = /^export \{};$/m;
            const transformed = transformScriptBeforeCompilation(source, false);
            assert.match(transformed, expected);
        });

        it('forces non-global scripts to be treated as modules (part 2)', () => {
            const source = `import fs from "fs";
const foo = 1;`;
            const expected = /^export \{};$/m;
            const transformed = transformScriptBeforeCompilation(source, false);
            // There is an import, we don't need an empty export now
            assert.doesNotMatch(transformed, expected);
        });

        it('exports every exportable thing in global scripts', () => {
            // simplified reproduction for #694 (Part 1)
            const source = `
import * as fs from "fs";
class Foo {
    do() { }
}`.trim();
            const expected = `
import * as fs from "fs";
export class Foo {
    do() { }
}`
                .trim();
            const transformed = transformScriptBeforeCompilation(source, true);
            assert.equal(transformed.trim(), expected);
        });

        it('wraps global augmentations in `declare global`', () => {
            // simplified reproduction for #698
            const source = `
interface Date {
    getWeekYear(): number;
}`.trim();
            const expected = `
declare global {
    interface Date {
        getWeekYear(): number;
    }
}
export {};`
                .trim();
            const transformed = transformScriptBeforeCompilation(source, true);
            assert.equal(transformed.trim(), expected);
        });
    });

    describe('transformGlobalDeclarations', () => {
        it('wraps export declare statements in `declare global`', () => {
            // simplified reproduction for #694 (Part 2)
            const source = `
import * as fs from "fs";
export declare class Foo {
    do(): void;
}`.trim();
            const expected = `
import * as fs from "fs";
declare global {
    export class Foo {
        do(): void;
    }
}`
                .trim();
            const transformed = transformGlobalDeclarations(source);
            assert.equal(transformed.trim(), expected);
        });

        it('If there is no import statement, `export {};` must be added', () => {
            const source = `
export declare class Foo {
    do(): void;
}`.trim();
            const expected = `
declare global {
    export class Foo {
        do(): void;
    }
}
export {};
`
                .trim();
            const transformed = transformGlobalDeclarations(source);
            assert.equal(transformed.trim(), expected);
        });

        it('should preserve already-existing declare global { ... } blocks', () => {
            const source = `
declare global {
    interface Date {
        getWeekYear(): number;
    }
}`.trim();
            const expected = `
declare global {
    interface Date {
        getWeekYear(): number;
    }
}
export {};`
                .trim();
            const transformed = transformGlobalDeclarations(source);
            assert.equal(transformed.trim(), expected);
        });
    });

    describe('scriptIdToTSFilename', () => {
        it('generates a valid filename from a script ID', () => {
            assert.equal(scriptIdToTSFilename('script.js.foo.bar.baz'), 'foo/bar/baz.ts');
        });
    });
});

/**
 * Regression tests for https://github.com/ioBroker/ioBroker.javascript/issues/2341
 *
 * The global scripts and the script itself run as one `vm.Script`. TypeScript emits the same binding
 * (`const fixturelib_1 = require("fixturelib")`) for every script that imports the same module, so
 * without a scope per script the second one fails with "Identifier has already been declared".
 */
describe('Scope isolation of compiled TypeScript scripts', () => {
    const tsServer = new tsc.Server({ ...tsCompilerOptions, strict: true }, undefined);
    tsServer.provideAmbientDeclarations({
        'fixturelib.d.ts': `declare module "fixturelib" {
    export class Observable<T> {
        constructor(subscribe: (observer: { next(value: T): void }) => void);
    }
}`,
    });

    const IMPORT = `import { Observable } from "fixturelib";
new Observable<string>(observer => observer.next("ok"));`;

    function compile(filename, source, isGlobal) {
        const compiled = tsServer.compile(filename, transformScriptBeforeCompilation(source, isGlobal));
        assert.equal(compiled.success, true, compiled.diagnostics.map(d => d.description).join('\n'));
        return compiled.result;
    }

    function run(code) {
        const context = {
            exports: {},
            require: () => ({
                Observable: class {
                    constructor(subscribe) {
                        subscribe({ next: () => undefined });
                    }
                },
            }),
        };
        new Script(code).runInNewContext(context);
        return context;
    }

    it('fails without isolation (reproduces the issue)', () => {
        const globalCompiled = compile('global.ts', IMPORT, true);
        const localCompiled = compile('local.ts', IMPORT, false);
        assert.throws(() => new Script(`${globalCompiled}\n${localCompiled}`), /already been declared/);
    }).timeout(20000);

    it('lets a global and a normal script import the same module', () => {
        const globalCompiled = compile('global.ts', `${IMPORT}\nfunction fromGlobal() { return "global"; }`, true);
        const localCompiled = compile('local.ts', `${IMPORT}\ndeclare function fromGlobal(): string;\ndeclare let result: string;\nresult = fromGlobal();`, false);

        const context = run(
            `var result;\n${wrapCompiledGlobalScriptInCommonJsScope(globalCompiled)}\n${wrapCompiledScriptInCommonJsScope(localCompiled)}`,
        );
        assert.equal(context.result, 'global');
    }).timeout(20000);

    it('lets two global scripts import the same module and publishes their exports', () => {
        const first = compile('first.ts', `${IMPORT}\nfunction first() { return "one"; }\nlet counter = 1;`, true);
        const second = compile('second.ts', `${IMPORT}\nfunction second() { return "two"; }`, true);

        const context = run(`${wrapCompiledGlobalScriptInCommonJsScope(first)}
${wrapCompiledGlobalScriptInCommonJsScope(second)}
${wrapCompiledScriptInCommonJsScope('counter++; globalThis.result = `${first()}-${second()}-${counter}`;')}`);
        assert.equal(context.result, 'one-two-2');
    }).timeout(20000);

    it('keeps the compiled source on the first line of the wrapper', () => {
        assert.equal(wrapCompiledScriptInCommonJsScope('a;\nb;').split('\n')[0], '(function () {a;');
    });
});

describe('TypeScript compilation regression tests (non-global scripts)', () => {
    const tsServer = new tsc.Server(tsCompilerOptions, undefined);
    const tsAmbient = {
        'javascript.d.ts': fs.readFileSync(path.join(__dirname, '../src/lib/javascript.d.ts'), 'utf8'),
        'fs.d.ts': `declare module "fs" { }`,
    };
    tsServer.provideAmbientDeclarations(tsAmbient);

    const tests = [
        // Regression test for top-level await in TypeScript #672, 669
        `
import * as fs from "fs";
await wait(100);
`,
        // any statement with `declare` must be hoisted
        // as well as export statements
        // and type/interface/namespace/enum declarations
        `
declare function test(): any;
declare class Test {};
declare interface Foo {};
export const bla = 1;
export { test };
type Foo2 = 1;
interface Foo3 {
    member: any;
}
namespace whatever {}
enum Bar {
    baz = 1,
}
        `,
        // Simplified repro from #677
        `
class Foo {
    private prop: boolean;
    private method() {
        this.prop = true;
    }
}
`,
        // Repro for https://github.com/ioBroker/ioBroker.javascript/pull/663#issuecomment-721645705
        `
const result = $('system.adapter.*.alive');
const arr = [...result];
`,
        // Repro from #705
        `
const foo = 42;

async function bar():Promise<void> {
    return new Promise<void>(() => log(foo.toString()));
}

await bar();
`,
    ];

    for (let i = 0; i < tests.length; i++) {
        it(`Test #${i + 1}`, () => {
            const transformedSource = transformScriptBeforeCompilation(tests[i], false);
            const filename = scriptIdToTSFilename(`script.js.test_${i + 1}`);

            const tsCompiled = tsServer.compile(filename, transformedSource);

            assert.equal(tsCompiled.success, true);
        }).timeout(20000);
    }
});

describe('TypeScript compilation regression tests (global scripts)', () => {
    const tsServer = new tsc.Server(tsCompilerOptions, undefined);
    const tsAmbient = {
        'javascript.d.ts': fs.readFileSync(path.join(__dirname, '../src/lib/javascript.d.ts'), 'utf8'),
        'fs.d.ts': `declare module "fs" { }`,
        'otherglobal.d.ts': `
declare global {
    namespace iobJS {
        const what: 1;
    }
};
export {};
`,
    };
    tsServer.provideAmbientDeclarations(tsAmbient);

    const tests = [
        // Regression test for using predefined types in global scripts (https://github.com/ioBroker/ioBroker.javascript/issues/694#issuecomment-721607156)
        `
export type Foo = iobJS.Object & { foo: "bar" };
`,
        // Repro from #686
        `
/** 
* Get the ISO week date year number 
*/
declare global {
    interface Date {
        getWeekYear(): number;
    }
}
Date.prototype.getWeekYear = function () {
    // Create a new date object for the thursday of this week  
    let target: Date = new Date(this.valueOf());
    target.setDate(target.getDate() - ((this.getDay() + 6) % 7) + 3);

    return target.getFullYear();
};

const d = new Date();
d.getWeekYear()
`,
        // Repro from #1106
        `
function test(): void {
    log("test global");
}
`,
    ];

    for (let i = 0; i < tests.length; i++) {
        // for (const i of [1]) {
        it(`Test #${i + 1}`, () => {
            const transformedSource = transformScriptBeforeCompilation(tests[i], true);
            const filename = scriptIdToTSFilename(`script.js.test_${i + 1}`);

            const tsCompiled = tsServer.compile(filename, transformedSource);

            assert.equal(tsCompiled.success, true);
        }).timeout(20000);
    }
});
