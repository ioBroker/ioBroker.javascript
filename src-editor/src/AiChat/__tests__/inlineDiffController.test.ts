import { describe, it, expect } from 'vitest';
import { diffLines, buildHunks } from '../inlineDiffController';

describe('diffLines', () => {
    it('returns all-insert when original is empty', () => {
        const ops = diffLines('', 'line1\nline2');
        expect(ops).toEqual([
            { op: 'insert', line: 'line1' },
            { op: 'insert', line: 'line2' },
        ]);
    });

    it('returns all-delete when modified is empty', () => {
        const ops = diffLines('a\nb', '');
        expect(ops).toEqual([
            { op: 'delete', line: 'a' },
            { op: 'delete', line: 'b' },
        ]);
    });

    it('returns all-equal when texts are identical', () => {
        const ops = diffLines('a\nb\nc', 'a\nb\nc');
        expect(ops.every(o => o.op === 'equal')).toBe(true);
        expect(ops).toHaveLength(3);
    });

    it('detects a single changed middle line', () => {
        const ops = diffLines('a\nb\nc', 'a\nX\nc');
        expect(ops).toEqual([
            { op: 'equal', line: 'a' },
            { op: 'delete', line: 'b' },
            { op: 'insert', line: 'X' },
            { op: 'equal', line: 'c' },
        ]);
    });

    it('detects pure insertion between equal lines', () => {
        const ops = diffLines('a\nc', 'a\nb\nc');
        expect(ops).toEqual([
            { op: 'equal', line: 'a' },
            { op: 'insert', line: 'b' },
            { op: 'equal', line: 'c' },
        ]);
    });

    it('detects pure deletion between equal lines', () => {
        const ops = diffLines('a\nb\nc', 'a\nc');
        expect(ops).toEqual([
            { op: 'equal', line: 'a' },
            { op: 'delete', line: 'b' },
            { op: 'equal', line: 'c' },
        ]);
    });

    it('handles realistic function refactor (rename variable)', () => {
        const original = ['function f() {', '  const x = 1;', '  return x;', '}'].join('\n');
        const modified = ['function f() {', '  const y = 1;', '  return y;', '}'].join('\n');
        const ops = diffLines(original, modified);
        const deletes = ops.filter(o => o.op === 'delete').map(o => o.line);
        const inserts = ops.filter(o => o.op === 'insert').map(o => o.line);
        expect(deletes).toEqual(['  const x = 1;', '  return x;']);
        expect(inserts).toEqual(['  const y = 1;', '  return y;']);
    });

    it('preserves unchanged lines at file boundaries', () => {
        const ops = diffLines('first\nold\nlast', 'first\nnew\nlast');
        expect(ops[0]).toEqual({ op: 'equal', line: 'first' });
        expect(ops[ops.length - 1]).toEqual({ op: 'equal', line: 'last' });
    });

    it('handles empty lines correctly', () => {
        const ops = diffLines('a\n\nb', 'a\nb');
        expect(ops).toEqual([
            { op: 'equal', line: 'a' },
            { op: 'delete', line: '' },
            { op: 'equal', line: 'b' },
        ]);
    });
});

describe('buildHunks', () => {
    it('groups consecutive delete+insert ops into a single hunk', () => {
        const ops = diffLines('a\nb\nc', 'a\nX\nc');
        const hunks = buildHunks(ops);
        expect(hunks).toHaveLength(1);
        expect(hunks[0]).toEqual({
            originalStart: 1,
            deletedCount: 1,
            insertedLines: ['X'],
        });
    });

    it('returns empty hunk list for identical texts', () => {
        expect(buildHunks(diffLines('a\nb', 'a\nb'))).toEqual([]);
    });

    it('emits a pure-insert hunk', () => {
        const ops = diffLines('a\nc', 'a\nb\nc');
        const hunks = buildHunks(ops);
        expect(hunks).toEqual([{ originalStart: 1, deletedCount: 0, insertedLines: ['b'] }]);
    });

    it('emits a pure-delete hunk', () => {
        const ops = diffLines('a\nb\nc', 'a\nc');
        const hunks = buildHunks(ops);
        expect(hunks).toEqual([{ originalStart: 1, deletedCount: 1, insertedLines: [] }]);
    });

    it('builds multiple hunks separated by equal lines', () => {
        const original = ['a', 'X', 'b', 'Y', 'c'].join('\n');
        const modified = ['a', 'X2', 'b', 'Y2', 'c'].join('\n');
        const hunks = buildHunks(diffLines(original, modified));
        expect(hunks).toHaveLength(2);
        expect(hunks[0].originalStart).toBe(1);
        expect(hunks[1].originalStart).toBe(3);
    });

    it('handles pure insertion at end of file', () => {
        const ops = diffLines('a\nb', 'a\nb\nc');
        const hunks = buildHunks(ops);
        expect(hunks).toEqual([{ originalStart: 2, deletedCount: 0, insertedLines: ['c'] }]);
    });

    it('handles replacement with different line counts', () => {
        const original = 'a\nb\nc\nd';
        const modified = 'a\nX\nY\nZ\nd';
        const hunks = buildHunks(diffLines(original, modified));
        expect(hunks).toHaveLength(1);
        expect(hunks[0].deletedCount).toBe(2);
        expect(hunks[0].insertedLines).toEqual(['X', 'Y', 'Z']);
    });

    it('handles everything-replaced single-line change', () => {
        const hunks = buildHunks(diffLines('old', 'new'));
        expect(hunks).toEqual([{ originalStart: 0, deletedCount: 1, insertedLines: ['new'] }]);
    });
});
