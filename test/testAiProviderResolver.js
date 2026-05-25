const assert = require('node:assert').strict;
const {
    PROVIDER_KEY_FIELD,
    resolveProviderCredentials,
    resolveTestCredentials,
    listAvailableProviders,
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

        it('resolves openai key with stored gptBaseUrl', function () {
            const res = resolveProviderCredentials(fullConfig, 'openai');
            assert.equal(res.apiKey, 'sk-openai-abc');
            assert.equal(res.baseUrl, 'http://localhost:11434/v1');
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
                { gptKey: 'k', gptBaseUrl: '  http://localhost:11434/v1  ' },
                'openai',
            );
            assert.equal(res.baseUrl, 'http://localhost:11434/v1');
        });

        it('messageBaseUrl takes precedence over stored gptBaseUrl for openai-compatible providers', function () {
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

            const res2 = resolveTestCredentials(config, 'openai', 'form-key');
            assert.equal(res2.baseUrl, 'http://stored:1234/v1');
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
            assert.deepEqual(res, [
                { provider: 'custom', baseUrl: 'http://localhost:11434/v1' },
            ]);
        });

        it('custom provider is independent of gptBaseUrlKey (Ollama allows empty keys)', function () {
            const res = listAvailableProviders({
                gptBaseUrl: 'http://localhost:11434/v1',
                gptBaseUrlKey: '',
            });
            assert.equal(res.some(p => p.provider === 'custom'), true);
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
            assert.deepEqual(res.map(p => p.provider), [
                'openai',
                'anthropic',
                'gemini',
                'deepseek',
                'custom',
            ]);
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
    });
});
