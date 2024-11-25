import { type CompilerOptions, ScriptTarget, ModuleResolutionKind, ModuleKind } from 'typescript';

// Node.js 18+ supports the features of ES2022
// consider changing this, so we get to support the newest features too
export const targetTsLib = 'es2022';

export const tsCompilerOptions: CompilerOptions = {
    // don't compile faulty scripts
    noEmitOnError: true,
    // emit declarations for global scripts
    declaration: true,
    // This enables TS users to `import * as ... from` and `import ... from`
    esModuleInterop: true,
    // This flag was introduced in TS 4.4 and may break a lot of legacy scripts
    // Better keep it turned off
    useUnknownInCatchVariables: false,
    // In order to run scripts as a Node.js vm.Script,
    // we MUST target ES5, otherwise the compiled
    // scripts may include `import` keywords, which are not
    // supported by vm.Script.
    target: ScriptTarget.ES2022,
    // This is required for QueryResults to be iterable (https://github.com/ioBroker/ioBroker.javascript/pull/663#issuecomment-721645705)
    downlevelIteration: true,
    // Specify the module resolution strategy
    moduleResolution: ModuleResolutionKind.NodeNext,
    module: ModuleKind.ESNext,
    lib: [`lib.${targetTsLib}.d.ts`],
};

export const jsDeclarationCompilerOptions: CompilerOptions = Object.assign({}, tsCompilerOptions, {
    // we only care about the declarations
    emitDeclarationOnly: true,
    // allow errors
    noEmitOnError: false,
    noImplicitAny: false,
    strict: false,
});
