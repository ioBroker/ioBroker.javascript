"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JS_AI_ALIASES = exports.JS_AI_FIELDS = void 0;
exports.jsAiSettings = jsAiSettings;
/**
 * Where this adapter keeps its AI settings. Everything else - providers, keys, the credential store,
 * the push of long answers - is `@iobroker/ai-core`.
 *
 * Keys are stored as `encryptedNative` + `protectedNative` in io-package.json and never leave the
 * adapter; the editor names a provider and the adapter adds the key.
 */
const ai_core_1 = require("@iobroker/ai-core");
/** The `native` fields of the javascript adapter that hold its AI settings */
exports.JS_AI_FIELDS = {
    credentialType: 'credentialType',
    keys: {
        openai: 'gptKey',
        anthropic: 'claudeKey',
        gemini: 'geminiKey',
        deepseek: 'deepseekKey',
        // the custom endpoint has a key of its own - it used to borrow the OpenAI one (#2369)
        custom: 'gptBaseUrlKey',
    },
    credentialIds: {
        openai: 'credentialIdGptKey',
        anthropic: 'credentialIdClaudeKey',
        gemini: 'credentialIdGeminiKey',
        deepseek: 'credentialIdDeepseekKey',
        custom: 'credentialIdGptBaseUrlKey',
    },
    customBaseUrl: 'gptBaseUrl',
    allowSelfSignedCerts: 'allowSelfSignedCerts',
    maxTokens: 'aiMaxTokens',
    reasoningEffort: 'aiReasoningEffort',
};
/**
 * The command names the editor and the settings dialog of this adapter used before `ai-core`. The
 * Test button of `jsonConfig.json` and scripts that ask the adapter directly still send them
 */
exports.JS_AI_ALIASES = {
    chatCompletion: 'ai:chat',
    testApiConnection: 'ai:models',
    getAvailableAiProviders: 'ai:providers',
};
/**
 * The AI settings of this instance
 *
 * @param config the configuration of the instance (`this.config`)
 */
function jsAiSettings(config) {
    return (0, ai_core_1.readAiSettings)(config, exports.JS_AI_FIELDS);
}
//# sourceMappingURL=ai.js.map