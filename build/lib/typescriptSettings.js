"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsDeclarationCompilerOptions = exports.tsCompilerOptions = exports.targetTsLib = void 0;
const typescript_1 = require("typescript");
// Node.js 18+ supports the features of ES2022
// consider changing this, so we get to support the newest features too
exports.targetTsLib = 'es2022';
exports.tsCompilerOptions = {
    // don't compile faulty scripts
    noEmitOnError: true,
    // emit declarations for global scripts
    declaration: true,
    // This enables TS users to `import * as ... from` and `import ... from`
    esModuleInterop: true,
    // This flag was introduced in TS 4.4 and may break a lot of legacy scripts
    // Better keep it turned off
    useUnknownInCatchVariables: false,
    // Scripts are executed as a Node.js `vm.Script`, which does not support the `import` keyword,
    // so the emitted code must be CommonJS. This has to be set explicitly: TypeScript only defaults
    // `module` to CommonJS for the ES5/ES3 targets and would emit ES modules for the target below.
    module: typescript_1.ModuleKind.CommonJS,
    // Node.js 18+ runs ES2022 natively, so nothing has to be downleveled. This also makes
    // `downlevelIteration` obsolete - QueryResults stays iterable without it
    // (https://github.com/ioBroker/ioBroker.javascript/pull/663#issuecomment-721645705).
    target: typescript_1.ScriptTarget.ES2022,
    // From ES2022 on, TypeScript would emit class fields as native declarations ([[Define]]
    // semantics). Keep the previous assignment semantics (`this.x = ...` in the constructor),
    // so existing user scripts behave unchanged.
    useDefineForClassFields: false,
    // `virtual-tsc` overwrites `moduleResolution` with "node10", which TypeScript 6 reports as a
    // deprecation error. It cannot be configured from here, so deprecations have to be tolerated
    // until that is fixed upstream.
    ignoreDeprecations: '6.0',
    lib: [`lib.${exports.targetTsLib}.d.ts`],
};
exports.jsDeclarationCompilerOptions = {
    ...exports.tsCompilerOptions,
    // we only care about the declarations
    emitDeclarationOnly: true,
    // allow errors
    noEmitOnError: false,
    noImplicitAny: false,
    strict: false,
};
//# sourceMappingURL=typescriptSettings.js.map