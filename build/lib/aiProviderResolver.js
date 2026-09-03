"use strict";
/**
 * Helpers for resolving AI provider credentials in sendTo handlers.
 *
 * Keys are stored as `encryptedNative` + `protectedNative` in io-package.json —
 * they are never sent from the frontend. The backend looks them up in `this.config`
 * based on the `provider` name sent along with each `chatCompletion` or
 * `testApiConnection` request.
 *
 * These functions are extracted so they can be unit-tested in isolation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROVIDER_CREDENTIAL_ID_FIELD = exports.PROVIDER_KEY_FIELD = void 0;
exports.getProviderCredentialId = getProviderCredentialId;
exports.resolveProviderCredentials = resolveProviderCredentials;
exports.resolveTestCredentials = resolveTestCredentials;
exports.listAvailableProviders = listAvailableProviders;
/** Maps each provider to the adapter-config field holding its API key. */
exports.PROVIDER_KEY_FIELD = {
    openai: 'gptKey',
    anthropic: 'claudeKey',
    gemini: 'geminiKey',
    deepseek: 'deepseekKey',
    custom: 'gptBaseUrlKey',
};
/**
 * Maps each provider to the adapter-config field holding the ID of its credential
 * in the central credential store (used in `manager` mode).
 */
exports.PROVIDER_CREDENTIAL_ID_FIELD = {
    openai: 'credentialIdGptKey',
    anthropic: 'credentialIdClaudeKey',
    gemini: 'credentialIdGeminiKey',
    deepseek: 'credentialIdDeepseekKey',
    custom: 'credentialIdGptBaseUrlKey',
};
/**
 * Returns the configured credential ID (e.g. `system.credentials.anthropic`) for a provider
 * in `manager` mode, or an empty string if none/unknown provider.
 */
function getProviderCredentialId(config, provider) {
    const cfg = config || {};
    const field = exports.PROVIDER_CREDENTIAL_ID_FIELD[provider];
    return field ? (cfg[field] || '').toString().trim() : '';
}
/**
 * Resolve API key and base URL for a provider from adapter config.
 * Optional `messageBaseUrl` takes precedence over the stored `gptBaseUrl`
 * (used by the settings-dialog Test button where the user's form value
 * should win over the persisted value).
 */
function resolveProviderCredentials(config, provider, messageBaseUrl) {
    const cfg = config || {};
    const keyField = exports.PROVIDER_KEY_FIELD[provider];
    const apiKey = keyField ? (cfg[keyField] || '').toString().trim() : '';
    /*
     * The stored `gptBaseUrl` belongs to the `custom` provider and to no other. `openai` used to
     * inherit it, which sent every request meant for api.openai.com - and the OpenAI key with it -
     * to whatever host the custom endpoint pointed at, with no way to opt out: an empty
     * `messageBaseUrl` counts as "not provided" and fell back to the stored value again (#2369).
     *
     * `openai` still honours an *explicit* `messageBaseUrl`, which is the escape hatch for a proxy
     * in front of OpenAI, but it no longer inherits the custom endpoint of another provider.
     */
    let baseUrl = '';
    if (provider === 'custom') {
        // An empty/whitespace messageBaseUrl counts as "not provided" and falls back to the stored
        // value, so the frontend can safely send `baseUrl: ''` without losing the configured URL.
        baseUrl = (messageBaseUrl || cfg.gptBaseUrl || '').toString().trim();
    }
    else if (provider === 'openai') {
        baseUrl = (messageBaseUrl || '').toString().trim();
    }
    return { apiKey, baseUrl };
}
/**
 * For the testApiConnection sendTo command: if the caller supplied an apiKey
 * (settings-dialog form value), use it; otherwise fall back to the stored key.
 */
function resolveTestCredentials(config, provider, messageApiKey, messageBaseUrl) {
    const fallback = resolveProviderCredentials(config, provider, messageBaseUrl);
    const explicitKey = (messageApiKey || '').toString().trim();
    return {
        apiKey: explicitKey || fallback.apiKey,
        baseUrl: fallback.baseUrl,
    };
}
/**
 * List of providers that have credentials configured in this.config.
 * Used by the `getAvailableAiProviders` sendTo command so the frontend
 * knows which provider icons/models to show without ever seeing a key.
 */
function listAvailableProviders(config) {
    const cfg = config || {};
    const providers = [];
    const manager = cfg.credentialType === 'manager';
    // A key-based provider is "available" if it has a stored key (manual mode)
    // or a selected credential ID (manager mode).
    const has = (provider, key) => manager ? !!getProviderCredentialId(cfg, provider) : !!(key || '').trim();
    if (has('openai', cfg.gptKey)) {
        providers.push({ provider: 'openai' });
    }
    if (has('anthropic', cfg.claudeKey)) {
        providers.push({ provider: 'anthropic' });
    }
    if (has('gemini', cfg.geminiKey)) {
        providers.push({ provider: 'gemini' });
    }
    if (has('deepseek', cfg.deepseekKey)) {
        providers.push({ provider: 'deepseek' });
    }
    // The custom/OpenAI-compatible endpoint is identified by its base URL (the key is optional,
    // e.g. local Ollama), so its availability does not depend on the credential mode.
    if ((cfg.gptBaseUrl || '').trim()) {
        providers.push({ provider: 'custom', baseUrl: cfg.gptBaseUrl });
    }
    return providers;
}
//# sourceMappingURL=aiProviderResolver.js.map