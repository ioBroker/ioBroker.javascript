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

/** Ceiling for an AI request, and the budget when the caller names none */
export const MAX_AI_REQUEST_TIMEOUT_MS = 600_000;

/**
 * How long to wait for an AI endpoint, from the `timeout` the caller put in the message.
 *
 * The inline completion asks for a short budget because it must not sit on the editor, the chat
 * panel for a long one because a reasoning model takes its time. The field was sent all along but
 * never read, so both of them waited out the full ten minutes.
 *
 * @param messageTimeout the value from the sendTo message, in milliseconds
 */
export function resolveRequestTimeout(messageTimeout?: unknown): number {
    const requested = parseInt(messageTimeout as string, 10);
    // Nothing usable, or a zero - which is how Node itself spells "no timeout" - gets the ceiling
    if (isNaN(requested) || requested <= 0) {
        return MAX_AI_REQUEST_TIMEOUT_MS;
    }
    // A second is the floor: below that not even a local model gets a chance to answer
    return Math.min(Math.max(requested, 1000), MAX_AI_REQUEST_TIMEOUT_MS);
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

/** What a chat endpoint reported about how it finished a completion. */
export interface AiResponseInfo {
    /** Anthropic's `stop_reason` or the OpenAI-compatible `finish_reason`, when the endpoint sends one */
    finishReason?: string;
    /** Token counts, as far as the endpoint reports them */
    usage?: { input?: number; output?: number };
}

/** The handful of fields of a chat-completion response that say how it ended. */
export interface AiRawResponse {
    stop_reason?: unknown;
    choices?: { finish_reason?: unknown }[];
    usage?: {
        input_tokens?: unknown;
        output_tokens?: unknown;
        prompt_tokens?: unknown;
        completion_tokens?: unknown;
    };
}

function toCount(value: unknown): number | undefined {
    return typeof value === 'number' && isFinite(value) ? value : undefined;
}

/**
 * Pull the "why did it stop" fields out of a chat-completion response.
 *
 * Anthropic and the OpenAI-compatible endpoints spell both the reason and the token counts
 * differently. The adapter normalizes them and passes them on to the editor, so an answer that
 * was cut off or filtered can say so instead of arriving as an empty chat bubble.
 */
export function extractAiResponseInfo(parsed: AiRawResponse | null | undefined): AiResponseInfo {
    const info: AiResponseInfo = {};
    const reason = parsed?.stop_reason ?? parsed?.choices?.[0]?.finish_reason;
    if (typeof reason === 'string' && reason) {
        info.finishReason = reason;
    }
    const input = toCount(parsed?.usage?.input_tokens ?? parsed?.usage?.prompt_tokens);
    const output = toCount(parsed?.usage?.output_tokens ?? parsed?.usage?.completion_tokens);
    if (input !== undefined || output !== undefined) {
        info.usage = {
            ...(input !== undefined ? { input } : {}),
            ...(output !== undefined ? { output } : {}),
        };
    }
    return info;
}

/**
 * Why a 200 OK answer carried neither text nor a tool call.
 *
 * "Empty response from API" is true but useless - it sends the user looking for a broken key
 * when the usual cause is a model that spent its whole output budget on reasoning tokens. The
 * endpoint nearly always says why it stopped, so repeat that, and append a slice of the raw
 * body for the cases where it does not.
 *
 * @param info the normalized stop reason and token counts
 * @param rawBody the response body as it came off the wire
 */
export function describeEmptyAiResponse(info: AiResponseInfo, rawBody?: string): string {
    let why: string;
    switch (info.finishReason) {
        case 'max_tokens':
        case 'length':
            why = 'the model used up its output budget before writing an answer';
            break;
        case 'content_filter':
        case 'refusal':
            why = 'the endpoint filtered the answer away';
            break;
        case 'tool_use':
        case 'tool_calls':
            why = 'the model wanted to call a tool, but the answer carried no readable tool call';
            break;
        default:
            why = info.finishReason ? `the endpoint stopped with "${info.finishReason}"` : '';
            break;
    }
    const details: string[] = [];
    if (info.finishReason) {
        details.push(`stop reason: ${info.finishReason}`);
    }
    if (info.usage?.input !== undefined || info.usage?.output !== undefined) {
        details.push(`tokens in/out: ${info.usage?.input ?? '?'}/${info.usage?.output ?? '?'}`);
    }
    let message = 'The API answered without any content';
    if (why) {
        message += ` - ${why}`;
    }
    if (details.length) {
        message += ` (${details.join(', ')})`;
    }
    // Only worth showing when the endpoint told us nothing usable at all
    if (!info.finishReason && rawBody) {
        message += `. Response: ${rawBody.substring(0, 200)}`;
    }
    return message;
}

/** What Anthropic gets as `max_tokens` when the setting is empty or unusable */
export const DEFAULT_AI_MAX_TOKENS = 8192;
/** Highest `max_tokens` the setting may ask for - beyond this every current model answers 400 */
export const MAX_AI_MAX_TOKENS = 200_000;

/**
 * The output budget for an Anthropic request.
 *
 * Anthropic insists on `max_tokens`, so there is no "let the endpoint decide". Too small and a
 * generated script is cut off mid-line; too large and the model rejects the request outright, so
 * the configured value is clamped into a range every model can live with.
 *
 * @param configured the value from the adapter settings
 */
export function resolveMaxTokens(configured?: unknown): number {
    const requested = parseInt(configured as string, 10);
    if (isNaN(requested) || requested <= 0) {
        return DEFAULT_AI_MAX_TOKENS;
    }
    // 1024 is the floor: below that not even a short answer with its reasoning fits
    return Math.min(Math.max(requested, 1024), MAX_AI_MAX_TOKENS);
}
