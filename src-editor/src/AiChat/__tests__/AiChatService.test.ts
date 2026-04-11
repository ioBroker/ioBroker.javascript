import { describe, it, expect } from 'vitest';
import { stripThinkingArtifacts, getBlocklyCodeModeSystemPrompt } from '../AiChatService';

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
