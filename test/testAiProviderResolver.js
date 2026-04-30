const expect = require('chai').expect;
const {
    PROVIDER_KEY_FIELD,
    resolveProviderCredentials,
    resolveTestCredentials,
    listAvailableProviders,
} = require('../build/lib/aiProviderResolver');

describe('Test AI Provider Resolver', function () {
    describe('PROVIDER_KEY_FIELD', function () {
        it('maps every supported provider to its key field', function () {
            expect(PROVIDER_KEY_FIELD.openai).to.equal('gptKey');
            expect(PROVIDER_KEY_FIELD.anthropic).to.equal('claudeKey');
            expect(PROVIDER_KEY_FIELD.gemini).to.equal('geminiKey');
            expect(PROVIDER_KEY_FIELD.deepseek).to.equal('deepseekKey');
            expect(PROVIDER_KEY_FIELD.custom).to.equal('gptBaseUrlKey');
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
            expect(res.apiKey).to.equal('sk-abc');
            expect(res.baseUrl).to.equal('');
        });

        it('resolves openai key with stored gptBaseUrl', function () {
            const res = resolveProviderCredentials(fullConfig, 'openai');
            expect(res.apiKey).to.equal('sk-openai-abc');
            expect(res.baseUrl).to.equal('http://localhost:11434/v1');
        });

        it('resolves anthropic key and ignores baseUrl', function () {
            const res = resolveProviderCredentials(fullConfig, 'anthropic');
            expect(res.apiKey).to.equal('sk-ant-xyz');
            expect(res.baseUrl).to.equal('');
        });

        it('resolves gemini key and ignores baseUrl', function () {
            const res = resolveProviderCredentials(fullConfig, 'gemini');
            expect(res.apiKey).to.equal('gemini-123');
            expect(res.baseUrl).to.equal('');
        });

        it('resolves deepseek key and ignores baseUrl', function () {
            const res = resolveProviderCredentials(fullConfig, 'deepseek');
            expect(res.apiKey).to.equal('ds-456');
            expect(res.baseUrl).to.equal('');
        });

        it('resolves custom key from gptBaseUrlKey and custom baseUrl', function () {
            const res = resolveProviderCredentials(fullConfig, 'custom');
            expect(res.apiKey).to.equal('ollama-key');
            expect(res.baseUrl).to.equal('http://localhost:11434/v1');
        });

        it('returns empty strings for unknown provider', function () {
            const res = resolveProviderCredentials(fullConfig, 'unknown');
            expect(res.apiKey).to.equal('');
            expect(res.baseUrl).to.equal('');
        });

        it('handles missing/empty config gracefully', function () {
            const res = resolveProviderCredentials(undefined, 'openai');
            expect(res.apiKey).to.equal('');
            expect(res.baseUrl).to.equal('');

            const res2 = resolveProviderCredentials(null, 'openai');
            expect(res2.apiKey).to.equal('');
            expect(res2.baseUrl).to.equal('');

            const res3 = resolveProviderCredentials({}, 'openai');
            expect(res3.apiKey).to.equal('');
            expect(res3.baseUrl).to.equal('');
        });

        it('trims whitespace from resolved keys', function () {
            const res = resolveProviderCredentials({ gptKey: '  sk-abc  \n' }, 'openai');
            expect(res.apiKey).to.equal('sk-abc');
        });

        it('trims whitespace from resolved baseUrl', function () {
            const res = resolveProviderCredentials(
                { gptKey: 'k', gptBaseUrl: '  http://localhost:11434/v1  ' },
                'openai',
            );
            expect(res.baseUrl).to.equal('http://localhost:11434/v1');
        });

        it('messageBaseUrl takes precedence over stored gptBaseUrl for openai-compatible providers', function () {
            const res = resolveProviderCredentials(fullConfig, 'openai', 'http://override:8080/v1');
            expect(res.baseUrl).to.equal('http://override:8080/v1');
        });

        it('messageBaseUrl is ignored for anthropic/gemini/deepseek', function () {
            const res = resolveProviderCredentials(fullConfig, 'anthropic', 'http://override:8080/v1');
            expect(res.baseUrl).to.equal('');
        });

        it('messageBaseUrl=empty-string falls back to stored gptBaseUrl', function () {
            const res = resolveProviderCredentials(fullConfig, 'custom', '');
            expect(res.baseUrl).to.equal('http://localhost:11434/v1');
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
            expect(res.apiKey).to.equal('form-typed-key');
        });

        it('falls back to stored key when message apiKey is empty', function () {
            const res = resolveTestCredentials(config, 'openai', '');
            expect(res.apiKey).to.equal('stored-openai');
        });

        it('falls back to stored key when message apiKey is undefined', function () {
            const res = resolveTestCredentials(config, 'claude'.replace('claude', 'anthropic'));
            expect(res.apiKey).to.equal('stored-claude');
        });

        it('message apiKey precedence works for every provider', function () {
            ['openai', 'anthropic', 'gemini', 'deepseek', 'custom'].forEach(p => {
                const res = resolveTestCredentials(config, p, 'explicit');
                expect(res.apiKey).to.equal('explicit');
            });
        });

        it('trims whitespace from explicit apiKey', function () {
            const res = resolveTestCredentials(config, 'openai', '  trimmed  ');
            expect(res.apiKey).to.equal('trimmed');
        });

        it('whitespace-only explicit apiKey falls back to stored', function () {
            const res = resolveTestCredentials(config, 'openai', '   ');
            expect(res.apiKey).to.equal('stored-openai');
        });

        it('baseUrl is resolved the same way as in resolveProviderCredentials', function () {
            const res = resolveTestCredentials(config, 'openai', 'form-key', 'http://form-url:9999/v1');
            expect(res.baseUrl).to.equal('http://form-url:9999/v1');

            const res2 = resolveTestCredentials(config, 'openai', 'form-key');
            expect(res2.baseUrl).to.equal('http://stored:1234/v1');
        });
    });

    describe('listAvailableProviders', function () {
        it('returns empty list for empty config', function () {
            expect(listAvailableProviders({})).to.deep.equal([]);
            expect(listAvailableProviders(undefined)).to.deep.equal([]);
            expect(listAvailableProviders(null)).to.deep.equal([]);
        });

        it('lists only providers with non-empty keys', function () {
            const res = listAvailableProviders({
                gptKey: 'sk-abc',
                claudeKey: '',
                geminiKey: 'g',
                deepseekKey: null,
            });
            expect(res).to.deep.equal([{ provider: 'openai' }, { provider: 'gemini' }]);
        });

        it('lists custom provider with baseUrl when gptBaseUrl is set', function () {
            const res = listAvailableProviders({
                gptBaseUrl: 'http://localhost:11434/v1',
            });
            expect(res).to.deep.equal([
                { provider: 'custom', baseUrl: 'http://localhost:11434/v1' },
            ]);
        });

        it('custom provider is independent of gptBaseUrlKey (Ollama allows empty keys)', function () {
            const res = listAvailableProviders({
                gptBaseUrl: 'http://localhost:11434/v1',
                gptBaseUrlKey: '',
            });
            expect(res.some(p => p.provider === 'custom')).to.equal(true);
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
            expect(res).to.have.lengthOf(5);
            expect(res.map(p => p.provider)).to.deep.equal([
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
            expect(res).to.deep.equal([{ provider: 'anthropic' }]);
        });

        it('does not include the key value in its output (security invariant)', function () {
            const res = listAvailableProviders({
                gptKey: 'sk-should-never-appear-SECRET',
                claudeKey: 'sk-ant-should-never-appear-SECRET',
            });
            const serialized = JSON.stringify(res);
            expect(serialized).to.not.include('sk-should-never-appear');
            expect(serialized).to.not.include('SECRET');
        });
    });
});
