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

/** Configuration subset that carries AI credentials. */
export interface AiConfigSlice {
    gptKey?: string;
    gptBaseUrl?: string;
    gptBaseUrlKey?: string;
    claudeKey?: string;
    geminiKey?: string;
    deepseekKey?: string;
}

export type AiProvider = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'custom';

/** Maps each provider to the adapter-config field holding its API key. */
export const PROVIDER_KEY_FIELD: Record<AiProvider, keyof AiConfigSlice> = {
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
export function resolveProviderCredentials(
    config: AiConfigSlice | undefined | null,
    provider: string,
    messageBaseUrl?: string,
): { apiKey: string; baseUrl: string } {
    const cfg = config || {};
    const keyField = PROVIDER_KEY_FIELD[provider as AiProvider];
    const apiKey = keyField ? (cfg[keyField] || '').toString().trim() : '';
    // baseUrl only applies to openai-compatible providers (custom / openai endpoint override).
    // An empty/whitespace messageBaseUrl counts as "not provided" and falls back to the stored value,
    // so the frontend can safely send `baseUrl: ''` without overriding a configured custom URL.
    const baseUrl =
        provider === 'custom' || provider === 'openai'
            ? (messageBaseUrl || cfg.gptBaseUrl || '').toString().trim()
            : '';
    return { apiKey, baseUrl };
}

/**
 * For the testApiConnection sendTo command: if the caller supplied an apiKey
 * (settings-dialog form value), use it; otherwise fall back to the stored key.
 */
export function resolveTestCredentials(
    config: AiConfigSlice | undefined | null,
    provider: string,
    messageApiKey?: string,
    messageBaseUrl?: string,
): { apiKey: string; baseUrl: string } {
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
export function listAvailableProviders(
    config: AiConfigSlice | undefined | null,
): { provider: AiProvider; baseUrl?: string }[] {
    const cfg = config || {};
    const providers: { provider: AiProvider; baseUrl?: string }[] = [];
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
