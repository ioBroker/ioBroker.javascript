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
exports.MAX_AI_MAX_TOKENS = exports.DEFAULT_AI_MAX_TOKENS = exports.MAX_AI_REQUEST_TIMEOUT_MS = exports.PROVIDER_CREDENTIAL_ID_FIELD = exports.PROVIDER_KEY_FIELD = void 0;
exports.getProviderCredentialId = getProviderCredentialId;
exports.resolveProviderCredentials = resolveProviderCredentials;
exports.resolveTestEndpoint = resolveTestEndpoint;
exports.resolveRequestTimeout = resolveRequestTimeout;
exports.resolveTestCredentials = resolveTestCredentials;
exports.listAvailableProviders = listAvailableProviders;
exports.extractAiResponseInfo = extractAiResponseInfo;
exports.describeEmptyAiResponse = describeEmptyAiResponse;
exports.resolveMaxTokens = resolveMaxTokens;
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
 *
 * Both come from the configuration and from nowhere else - above all not from the message that asked
 * for them. The key that is resolved here travels with the request as its authorisation, so a caller
 * who could name the address could have this instance carry the key to one of their own. An address
 * out of a message used to win over the stored one, which was the comfortable way to put a proxy in
 * front of OpenAI; a proxy belongs in the configuration now, entered once by whoever may configure
 * this instance. The test button of the settings dialog is the one exception - see
 * {@link resolveTestEndpoint}.
 *
 * The stored `gptBaseUrl` belongs to the `custom` provider and to no other. `openai` used to inherit
 * it, which sent every request meant for api.openai.com - and the OpenAI key with it - to whatever
 * host the custom endpoint pointed at (#2369).
 */
function resolveProviderCredentials(config, provider) {
    const cfg = config || {};
    const keyField = exports.PROVIDER_KEY_FIELD[provider];
    const apiKey = keyField ? (cfg[keyField] || '').toString().trim() : '';
    const baseUrl = provider === 'custom' ? (cfg.gptBaseUrl || '').toString().trim() : '';
    return { apiKey, baseUrl };
}
/**
 * The address the Test button of the settings dialog may try.
 *
 * The dialog tests what stands in the form rather than what was saved, because the first thing
 * anybody does is type a key and press it. The one thing it must not do is make this instance carry a
 * secret of its own to an address that came with the message, so an address out of the form counts
 * only together with a key out of the form: one's own key to one's own endpoint gives nothing away.
 * As soon as the key comes from this system - from the configuration or from the credential store -
 * the address comes from there too. And only the OpenAI-compatible provider has an address to try;
 * the form has no field for one anywhere else.
 *
 * @param config the adapter configuration
 * @param provider the provider that is being tested
 * @param form what the Test button sent
 * @param form.apiKey the key that stands in the form, if any
 * @param form.baseUrl the address that stands in the form, if any
 */
function resolveTestEndpoint(config, provider, form) {
    const stored = resolveProviderCredentials(config, provider).baseUrl;
    const formKey = (form.apiKey || '').toString().trim();
    const formUrl = (form.baseUrl || '').toString().trim();
    if (provider !== 'custom' || !formKey || !formUrl) {
        return stored;
    }
    return formUrl;
}
/** Ceiling for an AI request, and the budget when the caller names none */
exports.MAX_AI_REQUEST_TIMEOUT_MS = 600_000;
/**
 * How long to wait for an AI endpoint, from the `timeout` the caller put in the message.
 *
 * The inline completion asks for a short budget because it must not sit on the editor, the chat
 * panel for a long one because a reasoning model takes its time. The field was sent all along but
 * never read, so both of them waited out the full ten minutes.
 *
 * @param messageTimeout the value from the sendTo message, in milliseconds
 */
function resolveRequestTimeout(messageTimeout) {
    const requested = parseInt(messageTimeout, 10);
    // Nothing usable, or a zero - which is how Node itself spells "no timeout" - gets the ceiling
    if (isNaN(requested) || requested <= 0) {
        return exports.MAX_AI_REQUEST_TIMEOUT_MS;
    }
    // A second is the floor: below that not even a local model gets a chance to answer
    return Math.min(Math.max(requested, 1000), exports.MAX_AI_REQUEST_TIMEOUT_MS);
}
/**
 * For the testApiConnection sendTo command: if the caller supplied an apiKey
 * (settings-dialog form value), use it; otherwise fall back to the stored key.
 */
function resolveTestCredentials(config, provider, messageApiKey, messageBaseUrl) {
    const fallback = resolveProviderCredentials(config, provider);
    const explicitKey = (messageApiKey || '').toString().trim();
    return {
        apiKey: explicitKey || fallback.apiKey,
        // only together with a key of the form, and only for the endpoint of one's own
        baseUrl: resolveTestEndpoint(config, provider, { apiKey: explicitKey, baseUrl: messageBaseUrl }),
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
function toCount(value) {
    return typeof value === 'number' && isFinite(value) ? value : undefined;
}
/**
 * Pull the "why did it stop" fields out of a chat-completion response.
 *
 * Anthropic and the OpenAI-compatible endpoints spell both the reason and the token counts
 * differently. The adapter normalizes them and passes them on to the editor, so an answer that
 * was cut off or filtered can say so instead of arriving as an empty chat bubble.
 */
function extractAiResponseInfo(parsed) {
    const info = {};
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
function describeEmptyAiResponse(info, rawBody) {
    let why;
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
    const details = [];
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
exports.DEFAULT_AI_MAX_TOKENS = 8192;
/** Highest `max_tokens` the setting may ask for - beyond this every current model answers 400 */
exports.MAX_AI_MAX_TOKENS = 200_000;
/**
 * The output budget for an Anthropic request.
 *
 * Anthropic insists on `max_tokens`, so there is no "let the endpoint decide". Too small and a
 * generated script is cut off mid-line; too large and the model rejects the request outright, so
 * the configured value is clamped into a range every model can live with.
 *
 * @param configured the value from the adapter settings
 */
function resolveMaxTokens(configured) {
    const requested = parseInt(configured, 10);
    if (isNaN(requested) || requested <= 0) {
        return exports.DEFAULT_AI_MAX_TOKENS;
    }
    // 1024 is the floor: below that not even a short answer with its reasoning fits
    return Math.min(Math.max(requested, 1024), exports.MAX_AI_MAX_TOKENS);
}
//# sourceMappingURL=aiProviderResolver.js.map