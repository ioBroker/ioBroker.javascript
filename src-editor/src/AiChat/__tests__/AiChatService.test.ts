import { describe, it, expect, beforeEach } from 'vitest';
import {
    stripThinkingArtifacts,
    getBlocklyCodeModeSystemPrompt,
    describeMissingAnswer,
    sendChatCompletion,
    resetAiPushChannel,
} from '../AiChatService';

describe('stripThinkingArtifacts', () => {
    it('should strip <think> tags', () => {
        const input = '<think>Let me think about this...</think>Here is the answer.';
        expect(stripThinkingArtifacts(input)).toBe('Here is the answer.');
    });

    it('should strip <|endoftext|>', () => {
        const input = 'Some code here<|endoftext|>';
        expect(stripThinkingArtifacts(input)).toBe('Some code here');
    });

    it('should strip <|im_start|>...<|im_end|>', () => {
        const input = 'Code<|im_start|>system\nYou are...<|im_end|>More code';
        expect(stripThinkingArtifacts(input)).toBe('CodeMore code');
    });

    it('should strip trailing <|im_start|> without end', () => {
        const input = 'Code<|im_start|>remaining garbage';
        expect(stripThinkingArtifacts(input)).toBe('Code');
    });

    it('should handle clean input', () => {
        const input = 'Just normal text';
        expect(stripThinkingArtifacts(input)).toBe('Just normal text');
    });
});

describe('getBlocklyCodeModeSystemPrompt', () => {
    it('should return a prompt string containing Blockly XML templates', () => {
        const prompt = getBlocklyCodeModeSystemPrompt('German');
        expect(prompt).toContain('Blockly XML');
        expect(prompt).toContain('xml');
        expect(prompt).toContain('German');
    });

    it('should contain essential block types', () => {
        const prompt = getBlocklyCodeModeSystemPrompt('English');
        expect(prompt).toContain('on_ext');
        expect(prompt).toContain('schedule');
        expect(prompt).toContain('control');
        expect(prompt).toContain('get_value');
        expect(prompt).toContain('debug');
        expect(prompt).toContain('sendto_custom');
        expect(prompt).toContain('controls_if');
        expect(prompt).toContain('logic_compare');
        expect(prompt).toContain('math_number');
        expect(prompt).toContain('logic_boolean');
    });

    it('should contain Telegram sendTo pattern', () => {
        const prompt = getBlocklyCodeModeSystemPrompt('English');
        expect(prompt).toContain('telegram.0');
        expect(prompt).toContain('send');
    });

    it('should include the target language in the prompt', () => {
        const prompt = getBlocklyCodeModeSystemPrompt('French');
        expect(prompt).toContain('French');
    });

    it('should contain timeout block template', () => {
        const prompt = getBlocklyCodeModeSystemPrompt('English');
        expect(prompt).toContain('timeouts_settimeout');
    });
});

describe('describeMissingAnswer', () => {
    it('never returns an empty string - the point is that the bubble is not blank', () => {
        expect(describeMissingAnswer({}).length).toBeGreaterThan(0);
    });

    it('blames the output budget when the model ran into max_tokens', () => {
        const text = describeMissingAnswer({ finishReason: 'max_tokens', usage: { input: 12, output: 8000 } });
        expect(text).toContain('max_tokens');
        expect(text).toContain('12/8000');
    });

    it('keeps the reasoning the model did send instead of swallowing it', () => {
        const text = describeMissingAnswer({ content: '  thinking out loud  ', finishReason: 'end_turn' });
        expect(text).toContain('thinking out loud');
        expect(text).toContain('end_turn');
    });

    it('reports a plain empty answer when the endpoint gave no reason', () => {
        const text = describeMissingAnswer({ success: true, content: '' });
        expect(text).not.toContain('undefined');
        expect(text).not.toContain('(');
    });

    it('blames the adapter, not the model, when not even the success flag came back', () => {
        const text = describeMissingAnswer({});
        expect(text).toContain('adapter');
    });

    it('puts the unexpected reply into the bubble, so the console is not needed', () => {
        const text = describeMissingAnswer({ permissionError: 'sendTo' } as never);
        expect(text).toContain('permissionError');
    });

    it('survives a reply that is not even an object', () => {
        expect(() => describeMissingAnswer('permissionError' as never)).not.toThrow();
        expect(describeMissingAnswer('permissionError' as never)).toContain('permissionError');
    });
});

describe('sendChatCompletion push channel', () => {
    beforeEach(() => resetAiPushChannel());

    /** Let the subscribe and the sendTo of the request under test settle */
    const flush = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));

    /** A socket that accepts the subscription and hands the pushed answer back on demand */
    function pushingSocket(sendToResult: unknown): {
        socket: any;
        push: (data: unknown) => void;
        sent: any[];
    } {
        let handler: ((data: unknown) => void) | null = null;
        const sent: any[] = [];
        return {
            push: data => handler?.(data),
            sent,
            socket: {
                registerConnectionHandler: () => {},
                unregisterConnectionHandler: () => {},
                subscribeOnInstance: (_i: string, _t: string, _d: unknown, cb: (data: unknown) => void) => {
                    handler = cb;
                    return Promise.resolve({ accepted: true });
                },
                sendTo: (_i: string, _c: string, data: unknown) => {
                    sent.push(data);
                    return Promise.resolve(sendToResult);
                },
            },
        };
    }

    it('waits for the pushed answer instead of the sendTo callback', async () => {
        const { socket, push, sent } = pushingSocket({ accepted: true, requestId: 'will-be-replaced' });
        const promise = sendChatCompletion(socket, 'javascript.0', { model: 'm', provider: 'anthropic', messages: [] });
        await flush();
        // the adapter learns who to push to, and under which id
        expect(sent[0].uiSession).toMatch(/^ai-/);
        const requestId = sent[0].requestId;
        expect(requestId).toBeTruthy();

        push({ requestId, success: true, content: 'pushed answer' });
        await expect(promise).resolves.toMatchObject({ content: 'pushed answer' });
    });

    it('ignores a push that belongs to another request', async () => {
        const { socket, push, sent } = pushingSocket({ accepted: true });
        const promise = sendChatCompletion(socket, 'javascript.0', { model: 'm', provider: 'anthropic', messages: [] });
        await flush();
        push({ requestId: 'someone-else', success: true, content: 'not mine' });
        push({ requestId: sent[0].requestId, success: true, content: 'mine' });
        await expect(promise).resolves.toMatchObject({ content: 'mine' });
    });

    it('keeps working against an adapter that answers the old way', async () => {
        const { socket } = pushingSocket({ success: true, content: 'direct answer' });
        await expect(
            sendChatCompletion(socket, 'javascript.0', { model: 'm', provider: 'anthropic', messages: [] }),
        ).resolves.toMatchObject({ content: 'direct answer' });
    });

    it('falls back to the callback when the adapter refuses the subscription', async () => {
        const socket: any = {
            subscribeOnInstance: () => Promise.resolve({ accepted: false }),
            sendTo: (_i: string, _c: string, data: any) => {
                // nothing to push to, so the request must not announce a session
                expect(data.uiSession).toBeUndefined();
                return Promise.resolve({ success: true, content: 'fallback' });
            },
        };
        await expect(
            sendChatCompletion(socket, 'javascript.0', { model: 'm', provider: 'anthropic', messages: [] }),
        ).resolves.toMatchObject({ content: 'fallback' });
    });

    it('reports a timeout when the acknowledged answer is never pushed', async () => {
        const { socket } = pushingSocket({ accepted: true });
        const result = await sendChatCompletion(socket, 'javascript.0', {
            model: 'm',
            provider: 'anthropic',
            messages: [],
            timeout: 1000,
        });
        expect(result.error).toBeTruthy();
    });
});
