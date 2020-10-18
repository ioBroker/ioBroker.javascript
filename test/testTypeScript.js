const tsc = require('virtual-tsc');
const fs = require('fs');
const path = require('path');
const { tsCompilerOptions } = require('../lib/typescriptSettings');

const { expect } = require('chai');
const {
    scriptIdToTSFilename,
    transformScriptBeforeCompilation,
} = require('../lib/typescriptTools');

describe('TypeScript tools', () => {
    describe('transformScriptBeforeCompilation', () => {
        it('wraps the top level in an async function', () => {
            const source = `await wait(100)`;
            const expected = `(async () => { await wait(100); })();`;
            const transformed = transformScriptBeforeCompilation(source);
            expect(transformed).to.include(expected);
        });

        it('appends an empty export statement', () => {
            const source = `foo;`;
            const expected = /^export \{\};$/m;
            const transformed = transformScriptBeforeCompilation(source);
            expect(transformed).to.match(expected);
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
            const transformedSource = transformScriptBeforeCompilation(tests[i]);
            const filename = scriptIdToTSFilename(`script.js.test_${i + 1}`);

            const tsCompiled = tsServer.compile(filename, transformedSource);

            expect(tsCompiled.success).to.be.true;
        }).timeout(20000);
    }
});
