/**
 * The AI fields of this adapter, read by `@iobroker/ai-core`.
 *
 * Providers, keys, the credential store and the push of long answers are tested in ai-core. What is
 * left here is the part only this adapter knows: which `native` field is which.
 */
const assert = require('node:assert').strict;
const { baseUrlOf, listAvailableProviders } = require('@iobroker/ai-core');
const { jsAiSettings, JS_AI_ALIASES } = require('../build/lib/ai');

describe('Test AI settings', function () {
    it('reads the key of every provider from its own field', function () {
        const settings = jsAiSettings({
            gptKey: 'sk-openai',
            claudeKey: 'sk-ant',
            geminiKey: 'g-key',
            deepseekKey: 'ds-key',
            gptBaseUrlKey: 'custom-key',
            gptBaseUrl: 'http://192.168.1.10:11434/v1',
        });
        assert.deepEqual(settings.keys, {
            openai: 'sk-openai',
            anthropic: 'sk-ant',
            gemini: 'g-key',
            deepseek: 'ds-key',
            custom: 'custom-key',
        });
        assert.equal(settings.customBaseUrl, 'http://192.168.1.10:11434/v1');
        assert.equal(settings.credentialType, 'manual');
    });

    it('reads the credential ids in manager mode', function () {
        const settings = jsAiSettings({
            credentialType: 'manager',
            credentialIdGptKey: 'system.credentials.openai',
            credentialIdClaudeKey: 'system.credentials.anthropic',
            credentialIdGptBaseUrlKey: 'system.credentials.ollama',
            claudeKey: 'ignored in manager mode',
        });
        assert.equal(settings.credentialType, 'manager');
        assert.deepEqual(settings.credentialIds, {
            openai: 'system.credentials.openai',
            anthropic: 'system.credentials.anthropic',
            custom: 'system.credentials.ollama',
        });
        assert.deepEqual(listAvailableProviders(settings), [{ provider: 'openai' }, { provider: 'anthropic' }]);
    });

    it('takes self-signed certificates, max tokens and reasoning effort from the settings', function () {
        const settings = jsAiSettings({ allowSelfSignedCerts: true, aiMaxTokens: '32000', aiReasoningEffort: 'low' });
        assert.equal(settings.allowSelfSignedCerts, true);
        assert.equal(settings.maxTokens, 32000);
        assert.equal(settings.reasoningEffort, 'low');
    });

    it('keeps the custom endpoint and openai apart (#2369)', function () {
        const settings = jsAiSettings({
            gptKey: 'sk-real-openai',
            gptBaseUrl: 'http://192.168.1.10:11434/v1',
            gptBaseUrlKey: 'mnfst_secret',
        });
        assert.equal(baseUrlOf(settings, 'openai'), '', 'the OpenAI key must not travel to the custom host');
        assert.equal(baseUrlOf(settings, 'custom'), 'http://192.168.1.10:11434/v1');
        assert.equal(settings.keys.custom, 'mnfst_secret');
        assert.deepEqual(listAvailableProviders(settings), [
            { provider: 'openai' },
            { provider: 'custom', baseUrl: 'http://192.168.1.10:11434/v1' },
        ]);
    });

    it('still answers the command names of the older editor and of the settings dialog', function () {
        assert.deepEqual(JS_AI_ALIASES, {
            chatCompletion: 'ai:chat',
            testApiConnection: 'ai:models',
            getAvailableAiProviders: 'ai:providers',
        });
    });
});
