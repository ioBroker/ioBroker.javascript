import { type CompilerOptions, ModuleKind, ScriptTarget } from 'typescript';
import type { JavaScriptAdapterConfig, TsTarget, TsTriState } from '../types';

// Node.js 18+ supports the features of ES2022
// consider changing this, so we get to support the newest features too
export const targetTsLib: TsTarget = 'es2022';

/** All targets that may be selected in the instance configuration */
export const TS_TARGETS: Record<TsTarget, ScriptTarget> = {
    es2018: ScriptTarget.ES2018,
    es2019: ScriptTarget.ES2019,
    es2020: ScriptTarget.ES2020,
    es2021: ScriptTarget.ES2021,
    es2022: ScriptTarget.ES2022,
    es2023: ScriptTarget.ES2023,
    es2024: ScriptTarget.ES2024,
    es2025: ScriptTarget.ES2025,
    esnext: ScriptTarget.ESNext,
};

export const tsCompilerOptions: CompilerOptions = {
    // TypeScript 6 enables `strict` by default. That would break virtually every existing user
    // script (implicit any parameters, strict null checks), so keep the pre-TS6 behavior.
    // Can be re-enabled per instance in the "TypeScript" tab of the adapter settings.
    strict: false,
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
    module: ModuleKind.CommonJS,
    // Node.js 18+ runs ES2022 natively, so nothing has to be downleveled. This also makes
    // `downlevelIteration` obsolete - QueryResults stays iterable without it
    // (https://github.com/ioBroker/ioBroker.javascript/pull/663#issuecomment-721645705).
    target: TS_TARGETS[targetTsLib],
    // From ES2022 on, TypeScript would emit class fields as native declarations ([[Define]]
    // semantics). Keep the previous assignment semantics (`this.x = ...` in the constructor),
    // so existing user scripts behave unchanged.
    useDefineForClassFields: false,
    // `virtual-tsc` overwrites `moduleResolution` with "node10", which TypeScript 6 reports as a
    // deprecation error. It cannot be configured from here, so deprecations have to be tolerated
    // until that is fixed upstream.
    ignoreDeprecations: '6.0',
    lib: [`lib.${targetTsLib}.d.ts`],
};

export const jsDeclarationCompilerOptions: CompilerOptions = {
    ...tsCompilerOptions,
    // we only care about the declarations
    emitDeclarationOnly: true,
    // allow errors
    noEmitOnError: false,
    noImplicitAny: false,
    strict: false,
};

/**
 * Applies a checkbox option from the instance configuration.
 * An option that is missing (configuration of an older version) keeps the value the adapter ships with.
 *
 * @param options The compiler options to modify
 * @param name Name of the compiler option
 * @param value Value from the instance configuration
 */
function applyBoolean(options: CompilerOptions, name: keyof CompilerOptions, value: boolean | undefined): void {
    if (value === undefined || value === null) {
        return;
    }
    (options as Record<string, unknown>)[name] = !!value;
}

/**
 * Applies a tri-state option from the instance configuration.
 * An empty selection removes the option, so it follows `strict` (resp. the TypeScript default).
 * An option that is missing (configuration of an older version) keeps the value the adapter ships with.
 *
 * @param options The compiler options to modify
 * @param name Name of the compiler option
 * @param value Value from the instance configuration
 */
function applyTriState(options: CompilerOptions, name: keyof CompilerOptions, value: TsTriState | undefined): void {
    if (value === undefined || value === null) {
        return;
    }
    if (value === '') {
        delete (options as Record<string, unknown>)[name];
        return;
    }
    (options as Record<string, unknown>)[name] = value === 'true';
}

/**
 * Determines the ECMAScript version the user scripts are compiled for
 *
 * @param config The instance configuration
 */
export function getTargetTsLib(config?: Partial<JavaScriptAdapterConfig>): TsTarget {
    const target = config?.tsTarget?.toLowerCase() as TsTarget;

    return target && TS_TARGETS[target] !== undefined ? target : targetTsLib;
}

/**
 * Builds the compiler options for the user scripts out of the instance configuration.
 * Everything that is not configured stays at the value the adapter ships with.
 *
 * @param config The instance configuration
 */
export function getTsCompilerOptions(config?: Partial<JavaScriptAdapterConfig>): CompilerOptions {
    const tsLib = getTargetTsLib(config);
    const options: CompilerOptions = {
        ...tsCompilerOptions,
        target: TS_TARGETS[tsLib],
        lib: [`lib.${tsLib}.d.ts`],
    };

    if (!config) {
        return options;
    }

    // Strict type checking
    applyBoolean(options, 'strict', config.tsStrict);
    applyTriState(options, 'noImplicitAny', config.tsNoImplicitAny);
    applyTriState(options, 'strictNullChecks', config.tsStrictNullChecks);
    applyTriState(options, 'strictFunctionTypes', config.tsStrictFunctionTypes);
    applyTriState(options, 'strictBindCallApply', config.tsStrictBindCallApply);
    applyTriState(options, 'strictPropertyInitialization', config.tsStrictPropertyInitialization);
    applyTriState(options, 'strictBuiltinIteratorReturn', config.tsStrictBuiltinIteratorReturn);
    applyTriState(options, 'noImplicitThis', config.tsNoImplicitThis);
    applyTriState(options, 'alwaysStrict', config.tsAlwaysStrict);
    applyTriState(options, 'useUnknownInCatchVariables', config.tsUseUnknownInCatchVariables);

    // Additional checks
    applyBoolean(options, 'noUnusedLocals', config.tsNoUnusedLocals);
    applyBoolean(options, 'noUnusedParameters', config.tsNoUnusedParameters);
    applyBoolean(options, 'noImplicitReturns', config.tsNoImplicitReturns);
    applyBoolean(options, 'noFallthroughCasesInSwitch', config.tsNoFallthroughCasesInSwitch);
    applyBoolean(options, 'noImplicitOverride', config.tsNoImplicitOverride);
    applyBoolean(options, 'noUncheckedIndexedAccess', config.tsNoUncheckedIndexedAccess);
    applyBoolean(options, 'noPropertyAccessFromIndexSignature', config.tsNoPropertyAccessFromIndexSignature);
    applyBoolean(options, 'exactOptionalPropertyTypes', config.tsExactOptionalPropertyTypes);
    applyTriState(options, 'allowUnreachableCode', config.tsAllowUnreachableCode);
    applyTriState(options, 'allowUnusedLabels', config.tsAllowUnusedLabels);

    // Language and emit
    applyBoolean(options, 'noEmitOnError', config.tsNoEmitOnError);
    applyBoolean(options, 'esModuleInterop', config.tsEsModuleInterop);
    applyBoolean(options, 'allowSyntheticDefaultImports', config.tsAllowSyntheticDefaultImports);
    applyBoolean(options, 'useDefineForClassFields', config.tsUseDefineForClassFields);
    applyBoolean(options, 'downlevelIteration', config.tsDownlevelIteration);
    applyBoolean(options, 'experimentalDecorators', config.tsExperimentalDecorators);
    applyBoolean(options, 'emitDecoratorMetadata', config.tsEmitDecoratorMetadata);
    applyBoolean(options, 'removeComments', config.tsRemoveComments);
    applyBoolean(options, 'skipLibCheck', config.tsSkipLibCheck);

    return options;
}
