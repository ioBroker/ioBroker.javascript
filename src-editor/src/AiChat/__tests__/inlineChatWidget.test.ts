import { describe, it, expect } from 'vitest';
import { extractFirstCodeBlock } from '../inlineChatWidget';

describe('extractFirstCodeBlock', () => {
    it('extracts a JS code block', () => {
        const input = 'Here is the fix:\n```javascript\nconst x = 1;\n```';
        const r = extractFirstCodeBlock(input);
        expect(r.code).toBe('const x = 1;');
        expect(r.text).toBe('Here is the fix:');
    });

    it('extracts a TS code block', () => {
        const input = '```typescript\nconst x: number = 1;\n```';
        const r = extractFirstCodeBlock(input);
        expect(r.code).toBe('const x: number = 1;');
    });

    it('works without a language tag', () => {
        const input = '```\nplain code\n```';
        const r = extractFirstCodeBlock(input);
        expect(r.code).toBe('plain code');
    });

    it('handles multiline code blocks', () => {
        const input = '```js\nline1\nline2\nline3\n```';
        const r = extractFirstCodeBlock(input);
        expect(r.code).toBe('line1\nline2\nline3');
    });

    it('only returns the first block', () => {
        const input = '```js\nA\n```\nSome text\n```js\nB\n```';
        const r = extractFirstCodeBlock(input);
        expect(r.code).toBe('A');
        expect(r.text).toContain('Some text');
        expect(r.text).toContain('```js\nB\n```');
    });

    it('returns { code: null, text: response } when no code block present', () => {
        const input = 'Just plain text, nothing fancy.';
        const r = extractFirstCodeBlock(input);
        expect(r.code).toBeNull();
        expect(r.text).toBe('Just plain text, nothing fancy.');
    });

    it('handles empty input', () => {
        expect(extractFirstCodeBlock('')).toEqual({ code: null, text: '' });
    });

    it('removes the entire fenced block from the text portion', () => {
        const input = 'Explanation above.\n```js\nx\n```\nExplanation below.';
        const r = extractFirstCodeBlock(input);
        expect(r.code).toBe('x');
        expect(r.text).toBe('Explanation above.\n\nExplanation below.');
    });

    it('handles hyphenated language tags (tsx, jsx, xml, yaml)', () => {
        expect(extractFirstCodeBlock('```tsx\n<App/>\n```').code).toBe('<App/>');
        expect(extractFirstCodeBlock('```yaml\nkey: value\n```').code).toBe('key: value');
        expect(extractFirstCodeBlock('```xml\n<tag/>\n```').code).toBe('<tag/>');
    });
});
