/**
 * Where this adapter keeps its AI settings. Everything else - providers, keys, the credential store,
 * the push of long answers - is `@iobroker/ai-core`.
 *
 * Keys are stored as `encryptedNative` + `protectedNative` in io-package.json and never leave the
 * adapter; the editor names a provider and the adapter adds the key.
 */
import { readAdapterAiSettings, readAiSettings, type AiNativeFields, type AiSettings } from '@iobroker/ai-core';

/** The `native` fields of the javascript adapter that hold its AI settings */
export const JS_AI_FIELDS: AiNativeFields = {
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
export const JS_AI_ALIASES = {
    chatCompletion: 'ai:chat',
    testApiConnection: 'ai:models',
    getAvailableAiProviders: 'ai:providers',
} as const;

/**
 * The AI settings of this instance
 *
 * @param config the configuration of the instance (`this.config`)
 */
export function jsAiSettings(config: object): AiSettings {
    return readAiSettings(config, JS_AI_FIELDS);
}

/**
 * The AI settings this instance works with: its own, or the system-wide ones of `system.ai` that are
 * set up once in admin - with the credential type `system`, or as long as no own provider is set up
 *
 * @param adapter the adapter
 * @param config the configuration of the instance (`this.config`)
 */
export function jsActiveAiSettings(adapter: ioBroker.Adapter, config: object): Promise<AiSettings> {
    return readAdapterAiSettings(adapter, config, JS_AI_FIELDS);
}
