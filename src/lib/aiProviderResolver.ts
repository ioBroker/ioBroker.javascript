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
    /**
     * Where the API keys come from:
     * - `manual`: keys are stored directly in the adapter config (encryptedNative)
     * - `manager`: the config only stores the ID of a credential in the central
     *   ioBroker credential store (`system.credentials.*`), resolved at runtime
     */
    credentialType?: 'manual' | 'manager';
    credentialIdGptKey?: string;
    credentialIdClaudeKey?: string;
    credentialIdGeminiKey?: string;
    credentialIdDeepseekKey?: string;
    credentialIdGptBaseUrlKey?: string;
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
 * Maps each provider to the adapter-config field holding the ID of its credential
 * in the central credential store (used in `manager` mode).
 */
export const PROVIDER_CREDENTIAL_ID_FIELD: Record<AiProvider, keyof AiConfigSlice> = {
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
export function getProviderCredentialId(config: AiConfigSlice | undefined | null, provider: string): string {
    const cfg = config || {};
    const field = PROVIDER_CREDENTIAL_ID_FIELD[provider as AiProvider];
    return field ? (cfg[field] || '').toString().trim() : '';
}

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
    } else if (provider === 'openai') {
        baseUrl = (messageBaseUrl || '').toString().trim();
    }
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
    const manager = cfg.credentialType === 'manager';
    // A key-based provider is "available" if it has a stored key (manual mode)
    // or a selected credential ID (manager mode).
    const has = (provider: AiProvider, key: string | undefined | null): boolean =>
        manager ? !!getProviderCredentialId(cfg, provider) : !!(key || '').trim();
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
