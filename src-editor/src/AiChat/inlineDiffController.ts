/**
 * VS-Code-Copilot-style inline diff for the AI chat.
 *
 * Given a range in the user's editor, the original text that was in that
 * range when the question was asked, and the AI's modified replacement,
 * this controller:
 *   - Computes a line-level diff between original and modified.
 *   - Marks removed lines in-place with red strikethrough decorations.
 *   - Renders inserted lines as Monaco view-zones (green boxes) directly
 *     beneath the matching anchor, so the diff looks truly in-place.
 *   - Shows a floating Accept/Reject widget above the change.
 *
 * Accept applies the full modified text to the range via applyCodeEdit.
 * Reject disposes all decorations/view-zones/widgets and restores the editor.
 */

import type * as monacoEditor from 'monaco-editor';
import { I18n } from '@iobroker/gui-components';
import { applyCodeEdit, type EditRange } from './applyCodeEdit';

/* ────────────────────────────────────────────────────────────────────── *
 *  Pure line-diff algorithm (LCS). Exported for unit tests.              *
 * ────────────────────────────────────────────────────────────────────── */

export type LineOp = { op: 'equal' | 'delete' | 'insert'; line: string };

/**
 * Longest common subsequence line-diff.
 *  Returns a flat op list like ['equal','delete','insert','equal'…].
 *  O(n*m) time, fine for function-sized diffs.
 */
export function diffLines(original: string, modified: string): LineOp[] {
    const a = original === '' ? [] : original.split('\n');
    const b = modified === '' ? [] : modified.split('\n');
    const n = a.length;
    const m = b.length;

    if (n === 0) {
        return b.map<LineOp>(line => ({ op: 'insert', line }));
    }
    if (m === 0) {
        return a.map<LineOp>(line => ({ op: 'delete', line }));
    }

    // LCS table
    const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }

    // Backtrack to build the op list
    const ops: LineOp[] = [];
    let i = n;
    let j = m;
    while (i > 0 && j > 0) {
        if (a[i - 1] === b[j - 1]) {
            ops.unshift({ op: 'equal', line: a[i - 1] });
            i--;
            j--;
        } else if (dp[i - 1][j] > dp[i][j - 1]) {
            // Prefer delete over insert. On a tie, insert wins so that on the
            // unshift path delete ends up BEFORE insert in the final ops list —
            // renders the deleted line(s) first (red strikethrough) with the new
            // line(s) underneath (green), which is the expected reading order.
            ops.unshift({ op: 'delete', line: a[i - 1] });
            i--;
        } else {
            ops.unshift({ op: 'insert', line: b[j - 1] });
            j--;
        }
    }
    while (i > 0) {
        ops.unshift({ op: 'delete', line: a[--i] });
    }
    while (j > 0) {
        ops.unshift({ op: 'insert', line: b[--j] });
    }
    return ops;
}

/** Hunks of consecutive inserts/deletes, with 0-based line anchors relative to the original input. */
export interface DiffHunk {
    /**
     * Line offset in the ORIGINAL text (0-based) where the hunk's deletions start.
     *  For pure inserts, this is the position where insertions should be anchored
     *  (i.e. after the previous equal line).
     */
    originalStart: number;
    /** Number of consecutive deleted lines at originalStart. */
    deletedCount: number;
    /** The inserted lines (may be empty → pure deletion). */
    insertedLines: string[];
}

export function buildHunks(ops: LineOp[]): DiffHunk[] {
    const hunks: DiffHunk[] = [];
    let origIndex = 0; // index into original
    let current: DiffHunk | null = null;

    const flush = (): void => {
        if (current) {
            hunks.push(current);
            current = null;
        }
    };

    for (const op of ops) {
        if (op.op === 'equal') {
            flush();
            origIndex++;
            continue;
        }
        if (!current) {
            current = { originalStart: origIndex, deletedCount: 0, insertedLines: [] };
        }
        if (op.op === 'delete') {
            current.deletedCount++;
            origIndex++;
        } else {
            current.insertedLines.push(op.line);
        }
    }
    flush();
    return hunks;
}

/* ────────────────────────────────────────────────────────────────────── *
 *  Monaco controller                                                     *
 * ────────────────────────────────────────────────────────────────────── */

export interface InlineDiffOptions {
    range: EditRange;
    originalText: string;
    modifiedText: string;
    language?: string;
    onAccepted?: () => void;
    onRejected?: () => void;
}

const TOOLBAR_WIDGET_ID = 'iobroker.aichat.inlineDiff.toolbar';

export class InlineDiffController {
    private editor: monacoEditor.editor.IStandaloneCodeEditor;
    private monaco: typeof monacoEditor;
    private opts: InlineDiffOptions;

    private decorations: string[] = [];
    private viewZoneIds: string[] = [];
    /** Empty spacer ViewZone that reserves the vertical slot above the change. */
    private toolbarSpacerZoneId: string | null = null;
    /** ContentWidget rendered into that slot — this is what the user interacts with. */
    private toolbarWidget: monacoEditor.editor.IContentWidget | null = null;
    private disposed = false;

    constructor(
        editor: monacoEditor.editor.IStandaloneCodeEditor,
        monaco: typeof monacoEditor,
        opts: InlineDiffOptions,
    ) {
        this.editor = editor;
        this.monaco = monaco;
        this.opts = opts;
    }

    show(): void {
        if (this.disposed) {
            return;
        }
        const { range, originalText, modifiedText } = this.opts;

        const ops = diffLines(originalText, modifiedText);
        const hunks = buildHunks(ops);

        if (!hunks.length) {
            // No-op change → just apply silently (or reject — same thing user-wise)
            this.opts.onAccepted?.();
            return;
        }

        this.renderDeletions(range, hunks);
        this.renderInsertions(range, hunks);
        this.renderAcceptWidget(range);

        // Any edit outside our dispose path cancels the diff.
        const model = this.editor.getModel();
        if (model) {
            const disp = this.editor.onDidChangeModelContent(() => {
                disp.dispose();
                if (!this.disposed) {
                    this.dispose();
                    this.opts.onRejected?.();
                }
            });
        }
    }

    private renderDeletions(range: EditRange, hunks: DiffHunk[]): void {
        const decos: monacoEditor.editor.IModelDeltaDecoration[] = [];
        const anchorLine = range.startLine;
        for (const hunk of hunks) {
            if (hunk.deletedCount === 0) {
                continue;
            }
            const delFirst = anchorLine + hunk.originalStart;
            const delLast = delFirst + hunk.deletedCount - 1;
            decos.push({
                range: new this.monaco.Range(delFirst, 1, delLast, 1),
                options: {
                    isWholeLine: true,
                    className: 'iob-aichat-diff-deleted',
                    linesDecorationsClassName: 'iob-aichat-diff-deleted-gutter',
                    inlineClassName: 'iob-aichat-diff-deleted-inline',
                },
            });
        }
        this.decorations = this.editor.deltaDecorations([], decos);
    }

    private renderInsertions(range: EditRange, hunks: DiffHunk[]): void {
        // Use a single changeViewZones transaction for performance.
        this.editor.changeViewZones(accessor => {
            const anchorLine = range.startLine;
            for (const hunk of hunks) {
                if (hunk.insertedLines.length === 0) {
                    continue;
                }
                // Anchor = line BEFORE which we want the zone to appear.
                // Monaco's `afterLineNumber` places the zone AFTER the given line.
                // For pure inserts (deletedCount === 0) we want it right at the
                // original position, so we put it after (originalStart-1 + anchor-1).
                // For replacements we keep it after the LAST deleted line so the
                // new code appears beneath the strikethrough.
                const anchorAfter =
                    hunk.deletedCount > 0
                        ? anchorLine + hunk.originalStart + hunk.deletedCount - 1
                        : anchorLine + hunk.originalStart - 1;

                const domNode = document.createElement('div');
                domNode.className = 'iob-aichat-diff-inserted';
                domNode.style.cssText = [
                    'background: rgba(46, 160, 67, 0.15)',
                    'border-left: 3px solid rgb(46, 160, 67)',
                    'padding: 2px 8px 2px 10px',
                    'font-family: var(--monaco-monospace-font, monospace)',
                    'white-space: pre',
                    'overflow-x: auto',
                    'font-size: 12px',
                    'line-height: 18px',
                ].join(';');
                for (const line of hunk.insertedLines) {
                    const row = document.createElement('div');
                    row.textContent = line.length ? line : '\u00A0';
                    domNode.appendChild(row);
                }

                const id = accessor.addZone({
                    afterLineNumber: Math.max(0, anchorAfter),
                    heightInLines: hunk.insertedLines.length,
                    domNode,
                });
                this.viewZoneIds.push(id);
            }
        });
    }

    private renderAcceptWidget(range: EditRange): void {
        // VS-Code pattern (see vs/editor/contrib/zoneWidget):
        //   1. An EMPTY ViewZone reserves a vertical slot above the change
        //      so the editor's own lines are pushed down — nothing overlaps.
        //   2. A ContentWidget is rendered INTO that slot. ContentWidgets are
        //      fully interactive (pointer-events work, buttons are clickable)
        //      whereas ViewZone DOM has inconsistent event handling across
        //      Monaco builds.
        const monaco = this.monaco;
        const editor = this.editor;

        // Detect light vs dark theme from the editor's current background color
        // so we can pick a toolbar style that works on both. No Monaco-internal
        // theme API calls — just read the computed style.
        let isDark = true;
        try {
            const editorDom = editor.getDomNode();
            if (editorDom) {
                const bg = getComputedStyle(editorDom).backgroundColor;
                // Parse "rgb(r, g, b)" / "rgba(r, g, b, a)"
                const m = bg.match(/\d+/g);
                if (m && m.length >= 3) {
                    const [r, g, b] = m.map(n => parseInt(n, 10));
                    // Relative luminance
                    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                    isDark = lum < 0.5;
                }
            }
        } catch {
            /* stay with dark default */
        }

        const palette = isDark
            ? {
                  bg: 'rgba(37, 37, 38, 0.97)',
                  text: '#cccccc',
                  labelMuted: '#a0a0a0',
                  border: 'rgba(255, 255, 255, 0.12)',
                  secondaryBg: 'rgba(90, 93, 94, 0.4)',
                  secondaryHoverBg: 'rgba(90, 93, 94, 0.6)',
                  secondaryText: '#cccccc',
                  primaryBg: 'rgb(14, 99, 156)',
                  primaryHoverBg: 'rgb(17, 119, 187)',
                  primaryText: '#ffffff',
                  accent: 'rgb(79, 149, 255)',
              }
            : {
                  bg: 'rgba(243, 243, 243, 0.97)',
                  text: '#1f1f1f',
                  labelMuted: '#616161',
                  border: 'rgba(0, 0, 0, 0.12)',
                  secondaryBg: 'rgba(0, 0, 0, 0.04)',
                  secondaryHoverBg: 'rgba(0, 0, 0, 0.08)',
                  secondaryText: '#1f1f1f',
                  primaryBg: 'rgb(0, 98, 165)',
                  primaryHoverBg: 'rgb(0, 120, 200)',
                  primaryText: '#ffffff',
                  accent: 'rgb(0, 98, 165)',
              };

        const outer = document.createElement('div');
        outer.className = 'iob-aichat-diff-toolbar';
        outer.style.cssText = [
            'display: flex',
            'align-items: center',
            'gap: 6px',
            'padding: 2px 8px',
            'height: 22px',
            'box-sizing: border-box',
            'font-family: var(--monaco-monospace-font, system-ui)',
            'font-size: 11px',
            `color: ${palette.text}`,
            `background: ${palette.bg}`,
            `border: 1px solid ${palette.border}`,
            `border-left: 3px solid ${palette.accent}`,
            'border-radius: 3px',
            'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25)',
            'pointer-events: auto',
            'user-select: none',
            'cursor: default',
            'white-space: nowrap',
        ].join(';');

        const label = document.createElement('span');
        label.textContent = `🤖 ${I18n.t('AI suggestion')}`;
        label.style.cssText = `color: ${palette.labelMuted}; margin-right: 4px;`;
        outer.appendChild(label);

        const mkBtn = (text: string, primary: boolean, onClick: (e: MouseEvent) => void): HTMLButtonElement => {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = text;
            const bg = primary ? palette.primaryBg : palette.secondaryBg;
            const hover = primary ? palette.primaryHoverBg : palette.secondaryHoverBg;
            const color = primary ? palette.primaryText : palette.secondaryText;
            b.style.cssText = [
                `background: ${bg}`,
                `color: ${color}`,
                `border: 1px solid ${primary ? 'transparent' : palette.border}`,
                'border-radius: 2px',
                'padding: 2px 10px',
                'cursor: pointer',
                'font-family: inherit',
                'font-size: 11px',
                'line-height: 16px',
                'white-space: nowrap',
                'pointer-events: auto',
            ].join(';');
            b.addEventListener('mouseenter', () => {
                b.style.background = hover;
            });
            b.addEventListener('mouseleave', () => {
                b.style.background = bg;
            });
            b.addEventListener('click', e => {
                e.stopPropagation();
                e.preventDefault();
                onClick(e);
            });
            // Monaco sometimes handles mousedown at capture phase; stop it here
            // so the editor doesn't steal focus mid-click.
            b.addEventListener('mousedown', e => e.stopPropagation(), true);
            return b;
        };

        const acceptBtn = mkBtn(`✓ ${I18n.t('Apply changes')}`, true, () => this.accept());
        const rejectBtn = mkBtn(`✗ ${I18n.t('Discard changes')}`, false, () => this.reject());
        outer.appendChild(acceptBtn);
        outer.appendChild(rejectBtn);

        // Keep mouse events from falling through into the editor (clicks on the
        // toolbar background would otherwise move the cursor).
        outer.addEventListener('mousedown', e => e.stopPropagation(), true);
        outer.addEventListener('click', e => e.stopPropagation());

        // 1) Reserve vertical space with an empty ViewZone — the editor lines
        //    get pushed down, nothing overlaps the diff.
        const spacerDom = document.createElement('div');
        spacerDom.style.cssText = 'pointer-events: none;';
        const anchorAfter = Math.max(0, range.startLine - 1);
        this.editor.changeViewZones(accessor => {
            this.toolbarSpacerZoneId = accessor.addZone({
                afterLineNumber: anchorAfter,
                heightInLines: 1,
                domNode: spacerDom,
            });
        });

        // 2) Render the interactive toolbar into the same slot via a ContentWidget.
        //    ContentWidgets are layered ABOVE view-zones and receive pointer events.
        //    Preference ABOVE + EXACT makes Monaco place it above range.startLine,
        //    exactly where the spacer zone is sitting.
        const anchorLine = range.startLine;
        const widget: monacoEditor.editor.IContentWidget = {
            getId(): string {
                return TOOLBAR_WIDGET_ID;
            },
            getDomNode(): HTMLElement {
                return outer;
            },
            getPosition() {
                return {
                    position: { lineNumber: anchorLine, column: 1 },
                    preference: [
                        monaco.editor.ContentWidgetPositionPreference.ABOVE,
                        monaco.editor.ContentWidgetPositionPreference.BELOW,
                    ],
                };
            },
            allowEditorOverflow: true,
        };
        this.toolbarWidget = widget;
        editor.addContentWidget(widget);
    }

    private accept(): void {
        if (this.disposed) {
            return;
        }
        const ok = applyCodeEdit(this.editor, this.monaco, this.opts.range, this.opts.modifiedText, {
            source: 'ai-inline-diff',
        });
        this.dispose();
        if (ok) {
            this.opts.onAccepted?.();
        }
    }

    private reject(): void {
        if (this.disposed) {
            return;
        }
        this.dispose();
        this.opts.onRejected?.();
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        try {
            this.editor.deltaDecorations(this.decorations, []);
        } catch {
            /* ignore */
        }
        try {
            this.editor.changeViewZones(accessor => {
                for (const id of this.viewZoneIds) {
                    accessor.removeZone(id);
                }
                if (this.toolbarSpacerZoneId) {
                    accessor.removeZone(this.toolbarSpacerZoneId);
                }
            });
        } catch {
            /* ignore */
        }
        if (this.toolbarWidget) {
            try {
                this.editor.removeContentWidget(this.toolbarWidget);
            } catch {
                /* ignore */
            }
            this.toolbarWidget = null;
        }
        this.toolbarSpacerZoneId = null;
        this.decorations = [];
        this.viewZoneIds = [];
    }
}

/**
 * Utility CSS string the host can inject once (into a <style> tag).
 *  Kept as an export so the editor component can call it on mount.
 */
export const INLINE_DIFF_CSS = `
.iob-aichat-diff-deleted {
    background: rgba(220, 53, 69, 0.15) !important;
}
.iob-aichat-diff-deleted-inline {
    text-decoration: line-through rgba(220, 53, 69, 0.9);
}
.iob-aichat-diff-deleted-gutter {
    background: rgb(220, 53, 69);
    width: 3px !important;
    margin-left: 0 !important;
}
.iob-aichat-diff-inserted { pointer-events: auto; }
`;
