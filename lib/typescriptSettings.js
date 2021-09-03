const typescript = require('typescript');

// NodeJS 10+ supports the features of ES2018
// When upgrading the minimum supported version to NodeJS 12 or higher,
// consider changing this, so we get to support the newest features too
const targetTsLib = 'es2018';

/** @type {typescript.CompilerOptions} */
const tsCompilerOptions = {
    // don't compile faulty scripts
    noEmitOnError: true,
    // emit declarations for global scripts
    declaration: true,
    // This enables TS users to `import * as ... from` and `import ... from`
    esModuleInterop: true,
    // This flag was introduced in TS 4.4 and may break a lot of legacy scripts
    // Better keep it turned off
    useUnknownInCatchVariables: false,
    // In order to run scripts as a NodeJS vm.Script,
    // we MUST target ES5, otherwise the compiled
    // scripts may include `import` keywords, which are not
    // supported by vm.Script.
    target: typescript.ScriptTarget.ES5,
    // This is required for QueryResults to be iterable (https://github.com/ioBroker/ioBroker.javascript/pull/663#issuecomment-721645705)
    downlevelIteration: true,
    lib: [`lib.${targetTsLib}.d.ts`],
};

const jsDeclarationCompilerOptions = Object.assign(
    {}, tsCompilerOptions,
    {
        // we only care about the declarations
        emitDeclarationOnly: true,
        // allow errors
        noEmitOnError: false,
        noImplicitAny: false,
        strict: false,
    }
);

module.exports = {
    targetTsLib,
    tsCompilerOptions,
    jsDeclarationCompilerOptions
};