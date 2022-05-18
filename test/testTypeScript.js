const tsc = require('virtual-tsc');
const fs = require('fs');
const path = require('path');
const { tsCompilerOptions } = require('../lib/typescriptSettings');
const { EOL } = require('os');

const { expect } = require('chai');
const {
    scriptIdToTSFilename,
    transformScriptBeforeCompilation,
    transformGlobalDeclarations,
} = require('../lib/typescriptTools');

describe('TypeScript tools', () => {
    describe('transformScriptBeforeCompilation', () => {
        it('wraps the top level in an async function', () => {
            const source = `await wait(100)`;
            const expected = `(async () => { await wait(100); })();`;
            const transformed = transformScriptBeforeCompilation(source, false);
            expect(transformed).to.include(expected);
        });

        it('...but only if it is really necessary', () => {
            const source = `log("test")`;
            const expected = `log("test");\nexport {};\n`.replace(/\n/g, require('os').EOL);
            const transformed = transformScriptBeforeCompilation(source, false);
            expect(transformed).to.equal(expected);
        });

        it('forces non-global scripts to be treated as modules (part 1)', () => {
            const source = `const foo = 1;`;
            const expected = /^export \{};$/m;
            const transformed = transformScriptBeforeCompilation(source, false);
            expect(transformed).to.match(expected);
        });

        it('forces non-global scripts to be treated as modules (part 2)', () => {
            const source = `import fs from "fs";
const foo = 1;`;
            const expected = /^export \{};$/m;
            const transformed = transformScriptBeforeCompilation(source, false);
            // There is an import, we don't need an empty export now
            expect(transformed).not.to.match(expected);
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
}`.trim().replace(/\r?\n/g, EOL);
            const transformed = transformScriptBeforeCompilation(source, true);
            expect(transformed.trim()).to.equal(expected);
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
export {};`.trim().replace(/\r?\n/g, EOL);
            const transformed = transformScriptBeforeCompilation(source, true);
            expect(transformed.trim()).to.equal(expected);
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
}`.trim().replace(/\r?\n/g, EOL);
            const transformed = transformGlobalDeclarations(source);
            expect(transformed.trim()).to.equal(expected);
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
`.trim().replace(/\r?\n/g, EOL);
            const transformed = transformGlobalDeclarations(source);
            expect(transformed.trim()).to.equal(expected);
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
export {};`.trim().replace(/\r?\n/g, EOL);
            const transformed = transformGlobalDeclarations(source);
            expect(transformed.trim()).to.equal(expected);
        });
    });

    describe('scriptIdToTSFilename', () => {
        it('generates a valid filename from a script ID', () => {
            expect(scriptIdToTSFilename('script.js.foo.bar.baz')).to.equal(
                'foo/bar/baz.ts'
            );
        });
    });
});

describe('TypeScript compilation regression tests (non-global scripts)', () => {
    const tsServer = new tsc.Server(tsCompilerOptions, undefined);
    const tsAmbient = {
        'javascript.d.ts': fs.readFileSync(
            path.join(__dirname, '../lib/javascript.d.ts'),
            'utf8'
        ),
        'fs.d.ts': `declare module "fs" { }`
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
`
    ];

    for (let i = 0; i < tests.length; i++) {
        it(`Test #${i + 1}`, () => {
            const transformedSource = transformScriptBeforeCompilation(tests[i], false);
            const filename = scriptIdToTSFilename(`script.js.test_${i + 1}`);

            const tsCompiled = tsServer.compile(filename, transformedSource);

            expect(tsCompiled.success).to.be.true;
        }).timeout(20000);
    }
});

describe('TypeScript compilation regression tests (global scripts)', () => {
    const tsServer = new tsc.Server(tsCompilerOptions, undefined);
    const tsAmbient = {
        'javascript.d.ts': fs.readFileSync(
            path.join(__dirname, '../lib/javascript.d.ts'),
            'utf8'
        ),
        'fs.d.ts': `declare module "fs" { }`,
        'otherglobal.d.ts': `
declare global {
    namespace iobJS {
        const what: 1;
    }
};
export {};
`
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
`
    ];

    for (let i = 0; i < tests.length; i++) {
    // for (const i of [1]) {
        it(`Test #${i + 1}`, () => {
            const transformedSource = transformScriptBeforeCompilation(tests[i], true);
            const filename = scriptIdToTSFilename(`script.js.test_${i + 1}`);

            const tsCompiled = tsServer.compile(filename, transformedSource);

            expect(tsCompiled.success).to.be.true;
        }).timeout(20000);
    }
});
