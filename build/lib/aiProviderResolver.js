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
exports.PROVIDER_KEY_FIELD = void 0;
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
 * Resolve API key and base URL for a provider from adapter config.
 * Optional `messageBaseUrl` takes precedence over the stored `gptBaseUrl`
 * (used by the settings-dialog Test button where the user's form value
 * should win over the persisted value).
 */
function resolveProviderCredentials(config, provider, messageBaseUrl) {
    const cfg = config || {};
    const keyField = exports.PROVIDER_KEY_FIELD[provider];
    const apiKey = keyField ? (cfg[keyField] || '').toString().trim() : '';
    // baseUrl only applies to openai-compatible providers (custom / openai endpoint override).
    // An empty/whitespace messageBaseUrl counts as "not provided" and falls back to the stored value,
    // so the frontend can safely send `baseUrl: ''` without overriding a configured custom URL.
    const baseUrl = provider === 'custom' || provider === 'openai'
        ? (messageBaseUrl || cfg.gptBaseUrl || '').toString().trim()
        : '';
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
    if ((cfg.gptKey || '').trim()) {
        providers.push({ provider: 'openai' });
    }
    if ((cfg.claudeKey || '').trim()) {
        providers.push({ provider: 'anthropic' });
    }
    if ((cfg.geminiKey || '').trim()) {
        providers.push({ provider: 'gemini' });
    }
    if ((cfg.deepseekKey || '').trim()) {
        providers.push({ provider: 'deepseek' });
    }
    if ((cfg.gptBaseUrl || '').trim()) {
        providers.push({ provider: 'custom', baseUrl: cfg.gptBaseUrl });
    }
    return providers;
}
//# sourceMappingURL=aiProviderResolver.js.map