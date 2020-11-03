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

        it('appends an empty export statement', () => {
            const source = `foo;`;
            const expected = /^export \{\};$/m;
            const transformed = transformScriptBeforeCompilation(source, false);
            expect(transformed).to.match(expected);
        });

        it('...even if the file is not a global script', () => {
            const source = `foo;`;
            const expected = /^export \{\};$/m;
            const transformed = transformScriptBeforeCompilation(source, true);
            expect(transformed).to.match(expected);
        });

        it('exports every declaration if the transformation is for global script declarations', () => {
            // simplified repro for #694 (Part 1)
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
            const transformed = transformScriptBeforeCompilation(source, true, true);
            expect(transformed.trim()).to.equal(expected);
        });
    });

    describe('transformGlobalDeclarations', () => {
        it('wraps export declare statements in `declare global`', () => {
            // simplified repro for #694 (Part 2)
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
    });

    describe('scriptIdToTSFilename', () => {
        it('generates a valid filename from a script ID', () => {
            expect(scriptIdToTSFilename('script.js.foo.bar.baz')).to.equal(
                'foo/bar/baz.ts'
            );
        });
    });
});

describe('TypeScript compilation regression tests', () => {
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
