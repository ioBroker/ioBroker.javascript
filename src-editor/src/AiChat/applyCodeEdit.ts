/**
 * Single place where every AI-chat action applies code changes to the Monaco editor.
 *
 * Three callers use this:
 *   - inlineChatWidget.applyProposal  (Ctrl+Alt+I Apply)
 *   - inlineDiffController.accept     (Show Diff → Accept, in-editor diff)
 *   - Editor.tsx fallback             (legacy modal Accept)
 *
 * Keeping the logic in one pure-ish function avoids the subtle bugs we had where
 * one code path replaced the whole script and another did range-based replace.
 */

import type * as monacoEditor from 'monaco-editor';

export interface EditRange {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
}

export interface ApplyOptions {
    /** Source tag passed to Monaco's executeEdits; shows up in undo stack. Default: 'ai'. */
    source?: string;
    /** Where to insert when `range` is null. Default: 'cursor'. */
    fallbackInsertAt?: 'cursor' | 'end';
    /** If true (default), the editor is focused after the edit. */
    focusAfter?: boolean;
}

/**
 * Apply a code change to the Monaco editor.
 *
 *  - `range` present → replaces those lines with `newCode`.
 *  - `range` null → inserts `newCode` at the current cursor (or end of file if
 *    `fallbackInsertAt === 'end'`). No selection is made before the insert.
 *
 *  Returns true on success, false if the editor or model is unavailable.
 */
export function applyCodeEdit(
    editor: monacoEditor.editor.IStandaloneCodeEditor | null | undefined,
    monaco: typeof monacoEditor | null | undefined,
    range: EditRange | null,
    newCode: string,
    options: ApplyOptions = {},
): boolean {
    if (!editor || !monaco) {
        return false;
    }
    const model = editor.getModel();
    if (!model) {
        return false;
    }
    const source = options.source || 'ai';
    const focusAfter = options.focusAfter !== false;

    let targetRange: monacoEditor.IRange;

    if (range) {
        // Clamp to the current model in case the script has shrunk since capture.
        const totalLines = model.getLineCount();
        const startLine = Math.max(1, Math.min(range.startLine, totalLines));
        const endLine = Math.max(startLine, Math.min(range.endLine, totalLines));
        const startColumn = Math.max(1, range.startColumn);
        const endColumn = Math.min(range.endColumn, model.getLineMaxColumn(endLine));
        targetRange = new monaco.Range(startLine, startColumn, endLine, endColumn);
    } else if (options.fallbackInsertAt === 'end') {
        const lastLine = model.getLineCount();
        const lastCol = model.getLineMaxColumn(lastLine);
        targetRange = new monaco.Range(lastLine, lastCol, lastLine, lastCol);
    } else {
        const pos = editor.getPosition() ?? { lineNumber: 1, column: 1 };
        targetRange = new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column);
    }

    editor.executeEdits(source, [
        {
            range: targetRange,
            text: newCode,
            forceMoveMarkers: true,
        },
    ]);

    if (focusAfter) {
        editor.focus();
    }
    return true;
}
