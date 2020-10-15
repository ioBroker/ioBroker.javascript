const {expect} = require('chai');
const {
    scriptIdToTSFilename,
    transformScriptBeforeCompilation,
} = require('../lib/typescriptTools');

describe('TypeScript tools', () =>{
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
            expect(scriptIdToTSFilename('script.js.foo.bar.baz')).to.equal('foo/bar/baz.ts');
        });
    });
});
