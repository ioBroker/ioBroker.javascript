import { describe, it, expect } from 'vitest';
import { extractCronUnderCursor, looksLikeCron, describeCron, formatCronHoverMarkdown } from '../cronHoverProvider';

describe('looksLikeCron', () => {
    it('accepts a standard 5-field expression', () => {
        expect(looksLikeCron('*/5 * * * *')).toBe(true);
        expect(looksLikeCron('0 9 * * 1-5')).toBe(true);
    });

    it('accepts 6- and 7-field expressions (with seconds / year)', () => {
        expect(looksLikeCron('0 30 9 * * *')).toBe(true);
        expect(looksLikeCron('0 0 12 1 1 * 2030')).toBe(true);
    });

    it('accepts cron aliases', () => {
        expect(looksLikeCron('@daily')).toBe(true);
        expect(looksLikeCron('@hourly')).toBe(true);
    });

    it('accepts name-based fields', () => {
        expect(looksLikeCron('0 0 * * MON')).toBe(true);
        expect(looksLikeCron('0 0 1 JAN *')).toBe(true);
    });

    it('rejects plain sentences with the wrong field count', () => {
        expect(looksLikeCron('hello world')).toBe(false);
        expect(looksLikeCron('the quick brown fox jumps')).toBe(false);
    });

    it('rejects too few or too many fields', () => {
        expect(looksLikeCron('1 2 3')).toBe(false);
        expect(looksLikeCron('1 2 3 4 5 6 7 8')).toBe(false);
    });

    it('rejects empty input', () => {
        expect(looksLikeCron('')).toBe(false);
        expect(looksLikeCron('   ')).toBe(false);
    });
});

describe('extractCronUnderCursor', () => {
    it('finds a cron expression in a single-quoted string', () => {
        const line = `schedule('*/5 * * * *', () => {});`;
        const hit = extractCronUnderCursor(line, 15); // inside the expression
        expect(hit?.expression).toBe('*/5 * * * *');
    });

    it('returns column range matching the expression (excluding quotes)', () => {
        const line = `schedule('*/5 * * * *', () => {});`;
        const hit = extractCronUnderCursor(line, 15);
        // 1-based: first char of the expression is at column 11; endColumn is exclusive (one past the last char)
        expect(hit?.startColumn).toBe(11);
        expect(hit?.endColumn).toBe(22);
    });

    it('works with double quotes and backticks', () => {
        expect(extractCronUnderCursor(`schedule("0 9 * * 1-5", cb);`, 15)?.expression).toBe('0 9 * * 1-5');
        expect(extractCronUnderCursor('schedule(`0 0 1 * *`, cb);', 15)?.expression).toBe('0 0 1 * *');
    });

    it('finds an alias', () => {
        const line = `schedule('@daily', () => {});`;
        const hit = extractCronUnderCursor(line, 13);
        expect(hit?.expression).toBe('@daily');
    });

    it('returns null when not inside a string', () => {
        expect(extractCronUnderCursor(`const foo = 5;`, 6)).toBeNull();
    });

    it('returns null for non-cron strings', () => {
        expect(extractCronUnderCursor(`log('hello world');`, 10)).toBeNull();
    });

    it('returns null when the cursor is outside the string', () => {
        const line = `schedule('*/5 * * * *'); // comment`;
        expect(extractCronUnderCursor(line, 30)).toBeNull();
    });
});

describe('describeCron', () => {
    it('decodes a simple expression (English)', () => {
        expect(describeCron('*/5 * * * *', 'en')).toBe('Every 5 minutes');
    });

    it('decodes weekday ranges (English)', () => {
        expect(describeCron('0 9 * * 1-5', 'en')).toMatch(/Monday through Friday/);
    });

    it('decodes a German expression', () => {
        expect(describeCron('*/5 * * * *', 'de')).toBe('Alle 5 Minuten');
    });

    it('returns null for an invalid expression', () => {
        expect(describeCron('2024 12 31 10 30', 'en')).toBeNull();
        expect(describeCron('not a cron', 'en')).toBeNull();
    });
});

describe('formatCronHoverMarkdown', () => {
    it('includes the expression and the description', () => {
        const md = formatCronHoverMarkdown('*/5 * * * *', 'Every 5 minutes');
        expect(md).toContain('`*/5 * * * *`');
        expect(md).toContain('Every 5 minutes');
    });

    it('lists every field of a 5-field expression', () => {
        const md = formatCronHoverMarkdown('*/5 1 2 3 4', 'desc');
        expect(md).toContain('`*/5`');
        expect(md).toContain('`1`');
        expect(md).toContain('`4`');
    });

    it('does not add a field legend for aliases', () => {
        const md = formatCronHoverMarkdown('@daily', 'At 00:00');
        expect(md).toContain('@daily');
        expect(md).not.toContain('- `');
    });
});
