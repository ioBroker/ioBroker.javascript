import { describe, it, expect, vi } from 'vitest';
import { applyCodeEdit } from '../applyCodeEdit';

/** Minimal Monaco + editor stubs that record what was called. */
function makeMonaco(): { Range: any } {
    class Range {
        constructor(
            public startLineNumber: number,
            public startColumn: number,
            public endLineNumber: number,
            public endColumn: number,
        ) {}
    }
    return { Range };
}

function makeEditor(linesOrText: string | string[] = 'const x = 1;\nconst y = 2;\nconst z = 3;'): {
    editor: any;
    executeEdits: ReturnType<typeof vi.fn>;
    focus: ReturnType<typeof vi.fn>;
} {
    const text = Array.isArray(linesOrText) ? linesOrText.join('\n') : linesOrText;
    const lines = text.split('\n');
    const model = {
        getLineCount: () => lines.length,
        getLineMaxColumn: (line: number) => (lines[line - 1]?.length ?? 0) + 1,
        getValue: () => text,
    };
    const executeEdits = vi.fn();
    const focus = vi.fn();
    const editor = {
        getModel: () => model,
        getPosition: () => ({ lineNumber: 2, column: 1 }),
        executeEdits,
        focus,
    };
    return { editor, executeEdits, focus };
}

describe('applyCodeEdit', () => {
    const monaco = makeMonaco() as any;

    describe('with explicit range', () => {
        it('replaces the given range with the new code', () => {
            const { editor, executeEdits } = makeEditor();
            const ok = applyCodeEdit(
                editor,
                monaco,
                { startLine: 1, startColumn: 1, endLine: 1, endColumn: 13 },
                'const a = 42;',
            );
            expect(ok).toBe(true);
            expect(executeEdits).toHaveBeenCalledTimes(1);
            const [source, edits] = executeEdits.mock.calls[0];
            expect(source).toBe('ai');
            expect(edits[0].text).toBe('const a = 42;');
            expect(edits[0].range.startLineNumber).toBe(1);
            expect(edits[0].range.endLineNumber).toBe(1);
        });

        it('preserves the source label when provided', () => {
            const { editor, executeEdits } = makeEditor();
            applyCodeEdit(editor, monaco, { startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 }, 'x', {
                source: 'inline-chat',
            });
            expect(executeEdits.mock.calls[0][0]).toBe('inline-chat');
        });

        it('sets forceMoveMarkers so the cursor tracks the edit', () => {
            const { editor, executeEdits } = makeEditor();
            applyCodeEdit(editor, monaco, { startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 }, 'x');
            expect(executeEdits.mock.calls[0][1][0].forceMoveMarkers).toBe(true);
        });

        it('clamps start line > totalLines to the last line', () => {
            const { editor, executeEdits } = makeEditor(['a', 'b', 'c']);
            applyCodeEdit(editor, monaco, { startLine: 10, startColumn: 1, endLine: 20, endColumn: 5 }, 'NEW');
            const range = executeEdits.mock.calls[0][1][0].range;
            expect(range.startLineNumber).toBe(3);
            expect(range.endLineNumber).toBe(3);
        });

        it('clamps end column beyond line length', () => {
            const { editor, executeEdits } = makeEditor(['short']);
            applyCodeEdit(editor, monaco, { startLine: 1, startColumn: 1, endLine: 1, endColumn: 999 }, 'X');
            const range = executeEdits.mock.calls[0][1][0].range;
            // 'short' has 5 chars → max column = 6 (1-based, after last char)
            expect(range.endColumn).toBe(6);
        });

        it('handles inverted line order by clamping end >= start', () => {
            const { editor, executeEdits } = makeEditor(['a', 'b', 'c']);
            applyCodeEdit(editor, monaco, { startLine: 2, startColumn: 1, endLine: 1, endColumn: 1 }, 'X');
            const range = executeEdits.mock.calls[0][1][0].range;
            expect(range.startLineNumber).toBe(2);
            expect(range.endLineNumber).toBe(2);
        });
    });

    describe('without range (fallback insert)', () => {
        it('inserts at the cursor by default', () => {
            const { editor, executeEdits } = makeEditor();
            applyCodeEdit(editor, monaco, null, 'hello');
            const range = executeEdits.mock.calls[0][1][0].range;
            // getPosition() mock returns {lineNumber: 2, column: 1}
            expect(range.startLineNumber).toBe(2);
            expect(range.startColumn).toBe(1);
            expect(range.endLineNumber).toBe(2);
            expect(range.endColumn).toBe(1);
        });

        it("inserts at the end of the file when fallbackInsertAt === 'end'", () => {
            const { editor, executeEdits } = makeEditor(['line1', 'line2', 'line3']);
            applyCodeEdit(editor, monaco, null, 'tail', { fallbackInsertAt: 'end' });
            const range = executeEdits.mock.calls[0][1][0].range;
            expect(range.startLineNumber).toBe(3);
            // 'line3' length 5 → max column 6
            expect(range.startColumn).toBe(6);
            expect(range.endLineNumber).toBe(3);
            expect(range.endColumn).toBe(6);
        });

        it('falls back to 1,1 when editor has no cursor position', () => {
            const { editor, executeEdits } = makeEditor();
            editor.getPosition = () => null;
            applyCodeEdit(editor, monaco, null, 'x');
            const range = executeEdits.mock.calls[0][1][0].range;
            expect(range.startLineNumber).toBe(1);
            expect(range.startColumn).toBe(1);
        });
    });

    describe('focus behavior', () => {
        it('focuses the editor after applying by default', () => {
            const { editor, focus } = makeEditor();
            applyCodeEdit(editor, monaco, null, 'x');
            expect(focus).toHaveBeenCalledTimes(1);
        });

        it('skips focus when focusAfter is false', () => {
            const { editor, focus } = makeEditor();
            applyCodeEdit(editor, monaco, null, 'x', { focusAfter: false });
            expect(focus).not.toHaveBeenCalled();
        });
    });

    describe('defensive returns', () => {
        it('returns false when editor is null/undefined', () => {
            expect(applyCodeEdit(null, monaco, null, 'x')).toBe(false);
            expect(applyCodeEdit(undefined, monaco, null, 'x')).toBe(false);
        });

        it('returns false when monaco is null/undefined', () => {
            const { editor } = makeEditor();
            expect(applyCodeEdit(editor, null, null, 'x')).toBe(false);
            expect(applyCodeEdit(editor, undefined, null, 'x')).toBe(false);
        });

        it('returns false when editor has no model', () => {
            const { editor, executeEdits } = makeEditor();
            editor.getModel = () => null;
            expect(applyCodeEdit(editor, monaco, null, 'x')).toBe(false);
            expect(executeEdits).not.toHaveBeenCalled();
        });
    });
});
