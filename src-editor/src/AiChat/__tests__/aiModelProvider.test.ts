/**
 * Which provider serves which model, and how that choice is remembered.
 *
 * Both used to be guesswork. `loadModels` claimed a model for whichever provider answered first,
 * so with a proxy in front of a vendor the route changed from run to run; and the inline completion
 * read the model the chat panel had chosen but picked its provider from a preference order of its
 * own, which could send one provider's model to another provider's endpoint (#2369).
 */
import { describe, it, expect, beforeEach } from 'vitest';

import { clearCaches, loadModels, rememberModel, readRememberedModel } from '../AiChatService';

/** A model both the vendor and the proxy in front of it offer */
const SHARED = 'claude-opus-5';

const RUNNING = { 'javascript.0': true };

/**
 * A socket that answers `getAvailableAiProviders` and `testApiConnection`, with a delay per
 * provider - so a test can decide who wins the race and still assert who gets the model.
 *
 * @param providers what the backend reports as configured
 * @param models the model list per provider
 * @param delays how many milliseconds each provider takes to answer
 */
function fakeSocket(
    providers: { provider: string; baseUrl?: string }[],
    models: Record<string, string[]>,
    delays: Record<string, number> = {},
): any {
    return {
        sendTo: (_instance: string, command: string, message: any): Promise<any> => {
            if (command === 'getAvailableAiProviders') {
                return Promise.resolve({ providers });
            }
            if (command === 'testApiConnection') {
                const provider = message.provider as string;
                return new Promise(resolve =>
                    setTimeout(() => resolve({ models: models[provider] || [] }), delays[provider] || 0),
                );
            }
            throw new Error(`unexpected command ${command}`);
        },
    };
}

describe('loadModels', () => {
    beforeEach(() => clearCaches());

    it('assigns a shared model to the provider configured first, not the one that answers first', async () => {
        // The proxy answers immediately, Anthropic takes its time - the direct route still wins
        const socket = fakeSocket(
            [{ provider: 'anthropic' }, { provider: 'custom', baseUrl: 'http://proxy:8317/v1' }],
            { anthropic: [SHARED], custom: [SHARED, 'gpt-5.6'] },
            { anthropic: 30, custom: 0 },
        );

        const result = await loadModels(socket, RUNNING);

        expect(result.providerMap[SHARED]).toBe('anthropic');
        expect(result.providerMap['gpt-5.6']).toBe('custom');
        expect(result.models).toEqual([SHARED, 'gpt-5.6']);
    });

    it('is not swayed by the order the answers arrive in', async () => {
        // same setup, opposite timing: the result has to be identical
        const socket = fakeSocket(
            [{ provider: 'anthropic' }, { provider: 'custom', baseUrl: 'http://proxy:8317/v1' }],
            { anthropic: [SHARED], custom: [SHARED] },
            { anthropic: 0, custom: 30 },
        );

        const result = await loadModels(socket, RUNNING);

        expect(result.providerMap[SHARED]).toBe('anthropic');
    });

    it('leaves a model to the proxy when no vendor offers it', async () => {
        const socket = fakeSocket(
            [{ provider: 'anthropic' }, { provider: 'custom', baseUrl: 'http://proxy:8317/v1' }],
            { anthropic: ['claude-sonnet-5'], custom: ['kimi-k3'] },
        );

        const result = await loadModels(socket, RUNNING);

        expect(result.providerMap['kimi-k3']).toBe('custom');
        expect(result.providerMap['claude-sonnet-5']).toBe('anthropic');
    });

    it('still drops models that cannot chat', async () => {
        const socket = fakeSocket([{ provider: 'custom', baseUrl: 'http://proxy:8317/v1' }], {
            custom: ['gpt-5.6', 'text-embedding-3-large', 'dall-e-3'],
        });

        const result = await loadModels(socket, RUNNING);

        expect(result.models).toEqual(['gpt-5.6']);
    });

    it('reports the error of one provider without losing the models of the others', async () => {
        const socket: any = {
            sendTo: (_i: string, command: string, message: any) => {
                if (command === 'getAvailableAiProviders') {
                    return Promise.resolve({ providers: [{ provider: 'openai' }, { provider: 'custom' }] });
                }
                return Promise.resolve(
                    message.provider === 'openai' ? { error: 'Invalid API key (401)' } : { models: ['gpt-5.6'] },
                );
            },
        };

        const result = await loadModels(socket, RUNNING);

        expect(result.models).toEqual(['gpt-5.6']);
        expect(result.providerMap['gpt-5.6']).toBe('custom');
        expect(result.errors).toEqual(['OpenAI: Invalid API key (401)']);
    });
});

describe('the remembered model', () => {
    beforeEach(() => window.localStorage.clear());

    it('keeps the provider with the model', () => {
        rememberModel(SHARED, 'custom');
        expect(readRememberedModel()).toEqual({ model: SHARED, provider: 'custom' });
    });

    it('forgets the provider when the model is remembered without one', () => {
        rememberModel(SHARED, 'custom');
        rememberModel('gpt-5.6');
        // a stale provider would be worse than none: it would point at the wrong endpoint
        expect(readRememberedModel()).toEqual({ model: 'gpt-5.6', provider: '' });
    });

    it('reads back empty when nothing was ever chosen', () => {
        expect(readRememberedModel()).toEqual({ model: '', provider: '' });
    });

    it('stays compatible with a model stored before the provider was recorded', () => {
        window.localStorage.setItem('openai-model', SHARED);
        expect(readRememberedModel()).toEqual({ model: SHARED, provider: '' });
    });
});
