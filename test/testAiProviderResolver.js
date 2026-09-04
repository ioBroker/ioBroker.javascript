const assert = require('node:assert').strict;
const {
    PROVIDER_KEY_FIELD,
    PROVIDER_CREDENTIAL_ID_FIELD,
    getProviderCredentialId,
    resolveProviderCredentials,
    resolveTestCredentials,
    listAvailableProviders,
    resolveRequestTimeout,
    MAX_AI_REQUEST_TIMEOUT_MS,
} = require('../build/lib/aiProviderResolver');

describe('Test AI Provider Resolver', function () {
    describe('PROVIDER_KEY_FIELD', function () {
        it('maps every supported provider to its key field', function () {
            assert.equal(PROVIDER_KEY_FIELD.openai, 'gptKey');
            assert.equal(PROVIDER_KEY_FIELD.anthropic, 'claudeKey');
            assert.equal(PROVIDER_KEY_FIELD.gemini, 'geminiKey');
            assert.equal(PROVIDER_KEY_FIELD.deepseek, 'deepseekKey');
            assert.equal(PROVIDER_KEY_FIELD.custom, 'gptBaseUrlKey');
        });
    });

    describe('PROVIDER_CREDENTIAL_ID_FIELD', function () {
        it('maps every supported provider to its credential-id field', function () {
            assert.equal(PROVIDER_CREDENTIAL_ID_FIELD.openai, 'credentialIdGptKey');
            assert.equal(PROVIDER_CREDENTIAL_ID_FIELD.anthropic, 'credentialIdClaudeKey');
            assert.equal(PROVIDER_CREDENTIAL_ID_FIELD.gemini, 'credentialIdGeminiKey');
            assert.equal(PROVIDER_CREDENTIAL_ID_FIELD.deepseek, 'credentialIdDeepseekKey');
            assert.equal(PROVIDER_CREDENTIAL_ID_FIELD.custom, 'credentialIdGptBaseUrlKey');
        });
    });

    describe('getProviderCredentialId', function () {
        const cfg = {
            credentialIdGptKey: 'system.credentials.openai',
            credentialIdClaudeKey: 'system.credentials.anthropic',
            credentialIdGeminiKey: 'system.credentials.gemini',
            credentialIdDeepseekKey: 'system.credentials.deepseek',
            credentialIdGptBaseUrlKey: 'system.credentials.custom',
        };

        it('returns the configured credential ID per provider', function () {
            assert.equal(getProviderCredentialId(cfg, 'openai'), 'system.credentials.openai');
            assert.equal(getProviderCredentialId(cfg, 'anthropic'), 'system.credentials.anthropic');
            assert.equal(getProviderCredentialId(cfg, 'gemini'), 'system.credentials.gemini');
            assert.equal(getProviderCredentialId(cfg, 'deepseek'), 'system.credentials.deepseek');
            assert.equal(getProviderCredentialId(cfg, 'custom'), 'system.credentials.custom');
        });

        it('returns empty string for unknown provider', function () {
            assert.equal(getProviderCredentialId(cfg, 'unknown'), '');
        });

        it('handles missing/empty config gracefully', function () {
            assert.equal(getProviderCredentialId(undefined, 'openai'), '');
            assert.equal(getProviderCredentialId(null, 'openai'), '');
            assert.equal(getProviderCredentialId({}, 'openai'), '');
        });

        it('trims whitespace from the configured ID', function () {
            assert.equal(
                getProviderCredentialId({ credentialIdGptKey: '  system.credentials.openai \n' }, 'openai'),
                'system.credentials.openai',
            );
        });
    });

    describe('resolveProviderCredentials', function () {
        const fullConfig = {
            gptKey: 'sk-openai-abc',
            gptBaseUrl: 'http://localhost:11434/v1',
            gptBaseUrlKey: 'ollama-key',
            claudeKey: 'sk-ant-xyz',
            geminiKey: 'gemini-123',
            deepseekKey: 'ds-456',
        };

        it('resolves openai key with empty baseUrl when no custom URL set', function () {
            const res = resolveProviderCredentials({ gptKey: 'sk-abc' }, 'openai');
            assert.equal(res.apiKey, 'sk-abc');
            assert.equal(res.baseUrl, '');
        });

        it('does not send openai to the stored custom endpoint (#2369)', function () {
            // `gptBaseUrl` belongs to the custom provider. While openai inherited it, every request
            // meant for api.openai.com went to that host - with the OpenAI key attached.
            const res = resolveProviderCredentials(fullConfig, 'openai');
            assert.equal(res.apiKey, 'sk-openai-abc');
            assert.equal(res.baseUrl, '');
        });

        it('resolves anthropic key and ignores baseUrl', function () {
            const res = resolveProviderCredentials(fullConfig, 'anthropic');
            assert.equal(res.apiKey, 'sk-ant-xyz');
            assert.equal(res.baseUrl, '');
        });

        it('resolves gemini key and ignores baseUrl', function () {
            const res = resolveProviderCredentials(fullConfig, 'gemini');
            assert.equal(res.apiKey, 'gemini-123');
            assert.equal(res.baseUrl, '');
        });

        it('resolves deepseek key and ignores baseUrl', function () {
            const res = resolveProviderCredentials(fullConfig, 'deepseek');
            assert.equal(res.apiKey, 'ds-456');
            assert.equal(res.baseUrl, '');
        });

        it('resolves custom key from gptBaseUrlKey and custom baseUrl', function () {
            const res = resolveProviderCredentials(fullConfig, 'custom');
            assert.equal(res.apiKey, 'ollama-key');
            assert.equal(res.baseUrl, 'http://localhost:11434/v1');
        });

        it('returns empty strings for unknown provider', function () {
            const res = resolveProviderCredentials(fullConfig, 'unknown');
            assert.equal(res.apiKey, '');
            assert.equal(res.baseUrl, '');
        });

        it('handles missing/empty config gracefully', function () {
            const res = resolveProviderCredentials(undefined, 'openai');
            assert.equal(res.apiKey, '');
            assert.equal(res.baseUrl, '');

            const res2 = resolveProviderCredentials(null, 'openai');
            assert.equal(res2.apiKey, '');
            assert.equal(res2.baseUrl, '');

            const res3 = resolveProviderCredentials({}, 'openai');
            assert.equal(res3.apiKey, '');
            assert.equal(res3.baseUrl, '');
        });

        it('trims whitespace from resolved keys', function () {
            const res = resolveProviderCredentials({ gptKey: '  sk-abc  \n' }, 'openai');
            assert.equal(res.apiKey, 'sk-abc');
        });

        it('trims whitespace from resolved baseUrl', function () {
            const res = resolveProviderCredentials(
                { gptBaseUrlKey: 'k', gptBaseUrl: '  http://localhost:11434/v1  ' },
                'custom',
            );
            assert.equal(res.baseUrl, 'http://localhost:11434/v1');
        });

        it('messageBaseUrl takes precedence over the stored gptBaseUrl for custom', function () {
            const res = resolveProviderCredentials(fullConfig, 'custom', 'http://override:8080/v1');
            assert.equal(res.baseUrl, 'http://override:8080/v1');
        });

        it('openai still honours an explicit messageBaseUrl (a proxy in front of OpenAI)', function () {
            const res = resolveProviderCredentials(fullConfig, 'openai', 'http://override:8080/v1');
            assert.equal(res.baseUrl, 'http://override:8080/v1');
        });

        it('messageBaseUrl is ignored for anthropic/gemini/deepseek', function () {
            const res = resolveProviderCredentials(fullConfig, 'anthropic', 'http://override:8080/v1');
            assert.equal(res.baseUrl, '');
        });

        it('messageBaseUrl=empty-string falls back to stored gptBaseUrl', function () {
            const res = resolveProviderCredentials(fullConfig, 'custom', '');
            assert.equal(res.baseUrl, 'http://localhost:11434/v1');
        });
    });

    describe('resolveTestCredentials', function () {
        const config = {
            gptKey: 'stored-openai',
            claudeKey: 'stored-claude',
            gptBaseUrl: 'http://stored:1234/v1',
            gptBaseUrlKey: 'stored-custom',
        };

        it('uses message apiKey when provided (settings-dialog form value wins)', function () {
            const res = resolveTestCredentials(config, 'openai', 'form-typed-key');
            assert.equal(res.apiKey, 'form-typed-key');
        });

        it('falls back to stored key when message apiKey is empty', function () {
            const res = resolveTestCredentials(config, 'openai', '');
            assert.equal(res.apiKey, 'stored-openai');
        });

        it('falls back to stored key when message apiKey is undefined', function () {
            const res = resolveTestCredentials(config, 'claude'.replace('claude', 'anthropic'));
            assert.equal(res.apiKey, 'stored-claude');
        });

        it('message apiKey precedence works for every provider', function () {
            ['openai', 'anthropic', 'gemini', 'deepseek', 'custom'].forEach(p => {
                const res = resolveTestCredentials(config, p, 'explicit');
                assert.equal(res.apiKey, 'explicit');
            });
        });

        it('trims whitespace from explicit apiKey', function () {
            const res = resolveTestCredentials(config, 'openai', '  trimmed  ');
            assert.equal(res.apiKey, 'trimmed');
        });

        it('whitespace-only explicit apiKey falls back to stored', function () {
            const res = resolveTestCredentials(config, 'openai', '   ');
            assert.equal(res.apiKey, 'stored-openai');
        });

        it('baseUrl is resolved the same way as in resolveProviderCredentials', function () {
            const res = resolveTestCredentials(config, 'openai', 'form-key', 'http://form-url:9999/v1');
            assert.equal(res.baseUrl, 'http://form-url:9999/v1');

            const res2 = resolveTestCredentials(config, 'custom', 'form-key');
            assert.equal(res2.baseUrl, 'http://stored:1234/v1');

            // and openai does not pick up the stored custom endpoint (#2369)
            const res3 = resolveTestCredentials(config, 'openai', 'form-key');
            assert.equal(res3.baseUrl, '');
        });
    });

    describe('listAvailableProviders', function () {
        it('returns empty list for empty config', function () {
            assert.deepEqual(listAvailableProviders({}), []);
            assert.deepEqual(listAvailableProviders(undefined), []);
            assert.deepEqual(listAvailableProviders(null), []);
        });

        it('lists only providers with non-empty keys', function () {
            const res = listAvailableProviders({
                gptKey: 'sk-abc',
                claudeKey: '',
                geminiKey: 'g',
                deepseekKey: null,
            });
            assert.deepEqual(res, [{ provider: 'openai' }, { provider: 'gemini' }]);
        });

        it('lists custom provider with baseUrl when gptBaseUrl is set', function () {
            const res = listAvailableProviders({
                gptBaseUrl: 'http://localhost:11434/v1',
            });
            assert.deepEqual(res, [{ provider: 'custom', baseUrl: 'http://localhost:11434/v1' }]);
        });

        it('custom provider is independent of gptBaseUrlKey (Ollama allows empty keys)', function () {
            const res = listAvailableProviders({
                gptBaseUrl: 'http://localhost:11434/v1',
                gptBaseUrlKey: '',
            });
            assert.equal(
                res.some(p => p.provider === 'custom'),
                true,
            );
        });

        it('returns all 5 providers when fully configured', function () {
            const res = listAvailableProviders({
                gptKey: 'a',
                claudeKey: 'b',
                geminiKey: 'c',
                deepseekKey: 'd',
                gptBaseUrl: 'http://x/v1',
                gptBaseUrlKey: 'e',
            });
            assert.equal(res.length, 5);
            assert.deepEqual(
                res.map(p => p.provider),
                ['openai', 'anthropic', 'gemini', 'deepseek', 'custom'],
            );
        });

        it('ignores whitespace-only values', function () {
            const res = listAvailableProviders({
                gptKey: '   ',
                claudeKey: 'real',
                gptBaseUrl: '\n\t',
            });
            assert.deepEqual(res, [{ provider: 'anthropic' }]);
        });

        it('does not include the key value in its output (security invariant)', function () {
            const res = listAvailableProviders({
                gptKey: 'sk-should-never-appear-SECRET',
                claudeKey: 'sk-ant-should-never-appear-SECRET',
            });
            const serialized = JSON.stringify(res);
            assert.ok(!serialized.includes('sk-should-never-appear'));
            assert.ok(!serialized.includes('SECRET'));
        });

        describe('manager mode (credentialType=manager)', function () {
            it('lists providers by selected credential ID, ignoring manual keys', function () {
                const res = listAvailableProviders({
                    credentialType: 'manager',
                    // manual keys are present but must be ignored in manager mode
                    gptKey: 'sk-ignored',
                    claudeKey: 'sk-ignored',
                    credentialIdGptKey: 'system.credentials.openai',
                    credentialIdGeminiKey: 'system.credentials.gemini',
                });
                assert.deepEqual(res, [{ provider: 'openai' }, { provider: 'gemini' }]);
            });

            it('does not list a provider whose manual key is set but credential ID is empty', function () {
                const res = listAvailableProviders({
                    credentialType: 'manager',
                    claudeKey: 'sk-ant-set-but-ignored',
                    credentialIdClaudeKey: '',
                });
                assert.deepEqual(res, []);
            });

            it('custom provider still depends only on the base URL (key optional)', function () {
                const res = listAvailableProviders({
                    credentialType: 'manager',
                    gptBaseUrl: 'http://localhost:11434/v1',
                });
                assert.deepEqual(res, [{ provider: 'custom', baseUrl: 'http://localhost:11434/v1' }]);
            });

            it('does not include the credential ID secrets are never resolved here', function () {
                const res = listAvailableProviders({
                    credentialType: 'manager',
                    credentialIdGptKey: 'system.credentials.openai',
                });
                assert.deepEqual(res, [{ provider: 'openai' }]);
            });
        });
    });

    /**
     * The two providers speak the same protocol, which is why the frontend used to rewrite `custom`
     * to `openai` before sending it. But the backend picks the *credentials* by that name, so a
     * custom endpoint was addressed with the OpenAI key - empty in the reported setup, which made
     * every inline completion and every model listing answer 401 while the settings dialog Test
     * button still said "ok" (it passes the typed key explicitly and never goes through here).
     */
    describe('custom endpoint and openai stay separate (#2369)', function () {
        const customOnly = {
            gptKey: '',
            gptBaseUrl: 'http://192.168.1.10:11434/v1',
            gptBaseUrlKey: 'mnfst_secret',
        };

        it('signs requests to the custom endpoint with its own key', function () {
            assert.deepEqual(resolveProviderCredentials(customOnly, 'custom'), {
                apiKey: 'mnfst_secret',
                baseUrl: 'http://192.168.1.10:11434/v1',
            });
        });

        it('leaves openai without a URL when only the custom endpoint is configured', function () {
            // Whoever asks for `openai` here has neither a key nor an endpoint - which is the truth,
            // and better than a keyless request to a host that belongs to another provider
            assert.deepEqual(resolveProviderCredentials(customOnly, 'openai'), { apiKey: '', baseUrl: '' });
        });

        it('keeps a real OpenAI key away from the custom endpoint', function () {
            const both = {
                gptKey: 'sk-real-openai',
                gptBaseUrl: 'http://192.168.1.10:11434/v1',
                gptBaseUrlKey: 'mnfst_secret',
            };
            const openai = resolveProviderCredentials(both, 'openai');
            assert.equal(openai.apiKey, 'sk-real-openai');
            assert.equal(openai.baseUrl, '', 'the OpenAI key must not travel to the custom host');

            const custom = resolveProviderCredentials(both, 'custom');
            assert.equal(custom.apiKey, 'mnfst_secret');
            assert.equal(custom.baseUrl, 'http://192.168.1.10:11434/v1');
        });

        it('cannot be talked back into the old behaviour by an empty baseUrl', function () {
            // An empty messageBaseUrl means "not provided" - it used to fall back to the stored
            // custom URL, so no caller could reach api.openai.com at all
            const res = resolveProviderCredentials({ gptKey: 'sk', gptBaseUrl: 'http://custom/v1' }, 'openai', '');
            assert.equal(res.baseUrl, '');
        });

        it('offers both providers to the frontend, each with its own identity', function () {
            const both = { gptKey: 'sk-real-openai', gptBaseUrl: 'http://192.168.1.10:11434/v1' };
            assert.deepEqual(listAvailableProviders(both), [
                { provider: 'openai' },
                { provider: 'custom', baseUrl: 'http://192.168.1.10:11434/v1' },
            ]);
        });
    });

    /**
     * The chat panel is willing to wait for a slow reasoning model, the inline completion is not -
     * it sits on the editor. Both used to be given the same ten minutes, because the `timeout` of
     * the message was sent by the frontend and never read by the handler.
     */
    describe('resolveRequestTimeout', function () {
        it('takes the budget the caller asked for', function () {
            assert.equal(resolveRequestTimeout(15000), 15000);
        });

        it('accepts it as a string, the way it arrives in a sendTo message', function () {
            assert.equal(resolveRequestTimeout('15000'), 15000);
        });

        it('falls back to the maximum when the caller names none', function () {
            assert.equal(resolveRequestTimeout(undefined), MAX_AI_REQUEST_TIMEOUT_MS);
            assert.equal(resolveRequestTimeout(null), MAX_AI_REQUEST_TIMEOUT_MS);
            assert.equal(resolveRequestTimeout(''), MAX_AI_REQUEST_TIMEOUT_MS);
            assert.equal(resolveRequestTimeout('soon'), MAX_AI_REQUEST_TIMEOUT_MS);
        });

        it('does not let a caller wait longer than the ceiling', function () {
            assert.equal(resolveRequestTimeout(3600000), MAX_AI_REQUEST_TIMEOUT_MS);
        });

        it('keeps a second as the floor', function () {
            assert.equal(resolveRequestTimeout(1), 1000);
            assert.equal(resolveRequestTimeout(999), 1000);
        });

        it('reads a zero the way Node does - as no timeout - and caps it at the ceiling', function () {
            assert.equal(resolveRequestTimeout(0), MAX_AI_REQUEST_TIMEOUT_MS);
            assert.equal(resolveRequestTimeout(-5000), MAX_AI_REQUEST_TIMEOUT_MS);
        });
    });
});
