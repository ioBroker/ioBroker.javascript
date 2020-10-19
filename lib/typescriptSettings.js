const typescript = require('typescript');

// NodeJS 8+ supports the features of ES2017
// When upgrading the minimum supported version to NodeJS 10 or higher,
// consider changing this, so we get to support the newest features too
const targetTsLib = 'es2017';

/** @type {typescript.CompilerOptions} */
const tsCompilerOptions = {
    // don't compile faulty scripts
    noEmitOnError: true,
    // emit declarations for global scripts
    declaration: true,
    // This enables TS users to `import * as ... from` and `import ... from`
    esModuleInterop: true,
    // In order to run scripts as a NodeJS vm.Script,
    // we MUST target ES5, otherwise the compiled
    // scripts may include `import` keywords, which are not
    // supported by vm.Script.
    target: typescript.ScriptTarget.ES5,
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