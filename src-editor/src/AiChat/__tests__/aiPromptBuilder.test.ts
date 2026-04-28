import { describe, it, expect } from 'vitest';
import { buildActionPrompt, parseSlashCommand, SLASH_COMMANDS } from '../aiPromptBuilder';

describe('buildActionPrompt', () => {
    const jsCode = `on('zigbee2mqtt.0.motion.state', (obj) => {\n    setState('lamp', true);\n});`;

    describe('explain', () => {
        it('builds a prompt that asks to explain the code', () => {
            const p = buildActionPrompt({ action: 'explain', code: jsCode, language: 'javascript' });
            expect(p).toContain('explain');
            expect(p).toContain(jsCode);
            expect(p).toContain('```javascript');
        });

        it('uses typescript fence for typescript', () => {
            const p = buildActionPrompt({ action: 'explain', code: jsCode, language: 'typescript' });
            expect(p).toContain('```typescript');
        });

        it('uses xml fence for blockly', () => {
            const p = buildActionPrompt({ action: 'explain', code: '<xml>...</xml>', language: 'Blockly' });
            expect(p).toContain('```xml');
        });

        it('mentions line range when provided', () => {
            const p = buildActionPrompt({
                action: 'explain',
                code: jsCode,
                language: 'javascript',
                rangeLabel: 'lines 10-15',
            });
            expect(p).toContain('(lines 10-15)');
        });

        it('returns null for empty code', () => {
            expect(buildActionPrompt({ action: 'explain', code: '', language: 'javascript' })).toBeNull();
            expect(buildActionPrompt({ action: 'explain', code: '   \n  ', language: 'javascript' })).toBeNull();
        });
    });

    describe('refactor', () => {
        it('includes refactor instructions and code block', () => {
            const p = buildActionPrompt({ action: 'refactor', code: jsCode, language: 'javascript' });
            expect(p).toContain('Refactor');
            expect(p).toContain('Preserve behavior');
            expect(p).toContain('smart-applied');
            expect(p).toContain(jsCode);
        });

        it('returns null for empty code', () => {
            expect(buildActionPrompt({ action: 'refactor', code: '', language: 'javascript' })).toBeNull();
        });
    });

    describe('comment', () => {
        it('asks for inline comments', () => {
            const p = buildActionPrompt({ action: 'comment', code: jsCode, language: 'javascript' });
            expect(p).toContain('inline comments');
            expect(p).toContain('Do not over-comment');
        });
    });

    describe('fix', () => {
        it('includes the diagnostic when provided', () => {
            const p = buildActionPrompt({
                action: 'fix',
                code: jsCode,
                language: 'javascript',
                diagnostic: "Cannot find name 'lamp'",
            });
            expect(p).toContain('Reported problem');
            expect(p).toContain("Cannot find name 'lamp'");
        });

        it('omits diagnostic line when not provided', () => {
            const p = buildActionPrompt({ action: 'fix', code: jsCode, language: 'javascript' });
            expect(p).not.toContain('Reported problem');
            expect(p).toContain('fix it');
        });

        it('returns null for empty code', () => {
            expect(buildActionPrompt({ action: 'fix', code: '', language: 'javascript' })).toBeNull();
        });
    });

    describe('tests', () => {
        it('asks for manual test steps inside the ioBroker UI', () => {
            const p = buildActionPrompt({ action: 'tests', code: jsCode, language: 'javascript' });
            expect(p).toContain('manually');
            expect(p).toContain('ioBroker');
            expect(p).toContain('Setup');
            expect(p).toContain('Action');
            expect(p).toContain('Expected');
            expect(p).toContain(jsCode);
        });

        it('explicitly rules out Jest / Mocha / external test frameworks', () => {
            const p = buildActionPrompt({ action: 'tests', code: jsCode, language: 'javascript' })!;
            // The prompt mentions these names only to forbid them.
            // There must be an explicit NOT / CANNOT / Do NOT statement near them.
            expect(p).toMatch(/not?\b.*Jest|Jest.*\bnot\b|CANNOT\b.*Jest|Do NOT.*Jest/i);
            expect(p).toMatch(/mocha/i);
            // No describe/test block boilerplate instruction
            expect(p).not.toMatch(/provide\s+a\s+short\s+example/i);
            expect(p).not.toMatch(/write\s+a\s+jest/i);
        });
    });

    describe('ask', () => {
        it('embeds the question and the code', () => {
            const p = buildActionPrompt({
                action: 'ask',
                code: jsCode,
                language: 'javascript',
                question: 'Why does this loop not terminate?',
            });
            expect(p).toContain('Why does this loop not terminate?');
            expect(p).toContain(jsCode);
        });

        it('sends just the question when no code selected', () => {
            const p = buildActionPrompt({
                action: 'ask',
                code: '',
                language: 'javascript',
                question: 'How do I trigger a script from Telegram?',
            });
            expect(p).toBe('How do I trigger a script from Telegram?');
        });

        it('returns null when question is empty', () => {
            expect(buildActionPrompt({ action: 'ask', code: jsCode, language: 'javascript', question: '' })).toBeNull();
            expect(buildActionPrompt({ action: 'ask', code: jsCode, language: 'javascript' })).toBeNull();
        });
    });

    describe('normalization / fallbacks', () => {
        it('treats undefined language as javascript', () => {
            const p = buildActionPrompt({ action: 'explain', code: jsCode, language: '' });
            expect(p).toContain('```javascript');
        });

        it('handles Rules engine type as blockly', () => {
            const p = buildActionPrompt({ action: 'explain', code: jsCode, language: 'Rules' });
            expect(p).toContain('```xml');
        });

        it('returns null for unknown action (type-safety check)', () => {
            // @ts-expect-error intentional invalid action
            expect(buildActionPrompt({ action: 'unknown', code: jsCode, language: 'javascript' })).toBeNull();
        });
    });
});

describe('parseSlashCommand', () => {
    it('returns null for non-slash input', () => {
        expect(parseSlashCommand('hello world')).toBeNull();
        expect(parseSlashCommand('')).toBeNull();
        expect(parseSlashCommand('   ')).toBeNull();
    });

    it('matches the canonical English commands', () => {
        expect(parseSlashCommand('/explain')).toEqual({ action: 'explain', rest: '' });
        expect(parseSlashCommand('/refactor')).toEqual({ action: 'refactor', rest: '' });
        expect(parseSlashCommand('/comment')).toEqual({ action: 'comment', rest: '' });
        expect(parseSlashCommand('/fix')).toEqual({ action: 'fix', rest: '' });
        expect(parseSlashCommand('/tests')).toEqual({ action: 'tests', rest: '' });
        expect(parseSlashCommand('/ask')).toEqual({ action: 'ask', rest: '' });
    });

    it('matches German aliases', () => {
        expect(parseSlashCommand('/erklaere')).toEqual({ action: 'explain', rest: '' });
        expect(parseSlashCommand('/refaktoriere')).toEqual({ action: 'refactor', rest: '' });
        expect(parseSlashCommand('/kommentiere')).toEqual({ action: 'comment', rest: '' });
    });

    it('captures trailing free-form text as `rest`', () => {
        expect(parseSlashCommand('/fix missing semicolon on line 3')).toEqual({
            action: 'fix',
            rest: 'missing semicolon on line 3',
        });
        expect(parseSlashCommand('/ask why does this not work?')).toEqual({
            action: 'ask',
            rest: 'why does this not work?',
        });
    });

    it('is case-insensitive for the command', () => {
        expect(parseSlashCommand('/EXPLAIN')).toEqual({ action: 'explain', rest: '' });
        expect(parseSlashCommand('/Fix')).toEqual({ action: 'fix', rest: '' });
    });

    it('tolerates leading whitespace', () => {
        expect(parseSlashCommand('   /explain')).toEqual({ action: 'explain', rest: '' });
    });

    it('returns null for unknown slash commands', () => {
        expect(parseSlashCommand('/blahblah')).toBeNull();
        expect(parseSlashCommand('/hello')).toBeNull();
    });

    it('returns null for slash alone', () => {
        expect(parseSlashCommand('/')).toBeNull();
    });
});

describe('SLASH_COMMANDS registry', () => {
    it('contains at least 5 documented commands', () => {
        expect(SLASH_COMMANDS.length).toBeGreaterThanOrEqual(5);
    });

    it('every documented command parses back to the claimed action', () => {
        for (const entry of SLASH_COMMANDS) {
            const parsed = parseSlashCommand(entry.command);
            expect(parsed).not.toBeNull();
            expect(parsed?.action).toBe(entry.action);
        }
    });
});
