/**
 * Monaco code-lens provider that renders clickable AI action links above
 * each function / class in the script, e.g.:
 *
 *     💡 Explain   🔧 Refactor   ✅ Test
 *     function handleMotion(obj) {
 *       ...
 *     }
 *
 * Clicking a link triggers the corresponding AI action via the dispatch
 * callback. The provider works for JavaScript and TypeScript.
 *
 * The symbol discovery is a lightweight regex scan — robust enough for
 * idiomatic ioBroker scripts (top-level function declarations, exported
 * functions, arrow-function constants, and class declarations).
 */

import type * as monacoEditor from 'monaco-editor';
import { I18n } from '@iobroker/gui-components';

/** A discovered top-level symbol that deserves a code-lens row. */
export interface CodeLensSymbol {
    name: string;
    kind: 'function' | 'class' | 'arrow';
    /** 1-based line number where the lens should appear (= the symbol's start line). */
    line: number;
}

/**
 * Balanced-brace scan forward from `startLine1Based` to find the matching
 *  closing `}`. Returns 1-based end line. Ignores string literals crudely:
 *  braces inside double/single/backtick quotes are counted, but in practice
 *  top-level function bodies don't embed enough in-string braces to matter
 *  for idiomatic ioBroker code.
 */
export function findSymbolEndByBraces(scriptLines: string[], startLine1Based: number, fallback: number): number {
    let depth = 0;
    let sawOpen = false;
    for (let i = startLine1Based - 1; i < scriptLines.length; i++) {
        const line = scriptLines[i];
        for (let ci = 0; ci < line.length; ci++) {
            const ch = line[ci];
            if (ch === '{') {
                depth++;
                sawOpen = true;
            } else if (ch === '}') {
                depth--;
                if (sawOpen && depth === 0) {
                    return i + 1;
                }
            }
        }
    }
    return fallback;
}

/**
 * Walk upward from `symbolLine1Based - 1` through contiguous comment lines
 *  (//-comments, JSDoc blocks) and return the 1-based line where those
 *  comments begin. A single blank line between the comment block and the
 *  symbol is tolerated (common style: `/** … *&#47;\n\nfunction foo() {`).
 *  Two or more blank lines break the association.
 */
export function findLeadingCommentsStart(scriptLines: string[], symbolLine1Based: number): number {
    let startLine = symbolLine1Based;
    let i = symbolLine1Based - 2; // 0-based index of the line directly above the symbol
    let blankGap = 0;
    while (i >= 0) {
        const trimmed = scriptLines[i].trim();
        if (trimmed === '') {
            // Allow exactly one blank line between a JSDoc block and its symbol.
            if (blankGap >= 1) {
                break;
            }
            blankGap++;
            i--;
            continue;
        }
        const looksLikeComment =
            trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.endsWith('*/');
        if (!looksLikeComment) {
            break;
        }
        startLine = i + 1;
        blankGap = 0;
        i--;
    }
    return startLine;
}

/**
 * Compute the full 1-based `{ startLine, endLine }` range of a symbol:
 *  - start: includes the leading JSDoc / line comments (like ESLint's
 *    `getCommentsBefore`), so "Explain / Refactor / Tests" send the
 *    documentation together with the body.
 *  - end: uses balanced-brace scanning so the range ends at the symbol's
 *    closing `}`, NOT at the next top-level symbol -1 (which would
 *    accidentally swallow the NEXT symbol's leading JSDoc).
 */
export function computeFullSymbolRange(
    scriptLines: string[],
    symbolLine1Based: number,
    fallbackEnd: number,
): { startLine: number; endLine: number } {
    const endLine = findSymbolEndByBraces(scriptLines, symbolLine1Based, fallbackEnd);
    const startLine = findLeadingCommentsStart(scriptLines, symbolLine1Based);
    return { startLine, endLine };
}

/**
 * Find the symbol whose body contains the given 1-based line. Returns the
 *  full `{ startLine, endLine }` range (including leading comments and ending
 *  at the real closing brace), or `null` if the line is not inside any
 *  detected top-level symbol.
 *
 *  Used for both the context-menu fallback (Explain on a function name without
 *  selection) and internal range calculations.
 */
export function findSymbolAtLine(
    source: string,
    line: number,
): { startLine: number; endLine: number; symbol: CodeLensSymbol } | null {
    const symbols = findCodeLensSymbols(source);
    if (!symbols.length) {
        return null;
    }
    const scriptLines = source.split('\n');
    const totalLines = scriptLines.length;
    for (let i = 0; i < symbols.length; i++) {
        const sym = symbols[i];
        const naiveEnd = i + 1 < symbols.length ? symbols[i + 1].line - 1 : totalLines;
        const range = computeFullSymbolRange(scriptLines, sym.line, naiveEnd);
        // Match either by body (sym.line…endLine) OR by leading-comment zone
        // (range.startLine…sym.line-1), so right-clicking on the JSDoc also
        // selects the function it documents.
        if (line >= range.startLine && line <= range.endLine) {
            return { startLine: range.startLine, endLine: range.endLine, symbol: sym };
        }
    }
    return null;
}

/**
 * Line-by-line scan for top-level functions, classes, and arrow constants.
 *  Pure so it can be unit-tested easily.
 */
export function findCodeLensSymbols(source: string): CodeLensSymbol[] {
    if (!source) {
        return [];
    }
    const lines = source.split('\n');
    const out: CodeLensSymbol[] = [];
    const patterns: { re: RegExp; kind: CodeLensSymbol['kind'] }[] = [
        { re: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/, kind: 'function' },
        { re: /^(?:export\s+)?class\s+(\w+)/, kind: 'class' },
        // Arrow constants bound at top-level indentation. We keep this strict
        // (no leading whitespace) so inner arrow-lambdas are ignored.
        { re: /^(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>/, kind: 'arrow' },
    ];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const { re, kind } of patterns) {
            const m = line.match(re);
            if (m?.[1]) {
                out.push({ name: m[1], kind, line: i + 1 });
                break;
            }
        }
    }
    return out;
}

export type AiLensAction = 'explain' | 'refactor' | 'tests';

export interface CodeLensCommand {
    id: string;
    title: string;
    arguments: [AiLensAction, number, number];
    tooltip?: string;
}

export interface CodeLensEntry {
    /**
     * Where the code-lens row should be rendered — 1-based, on the line of the
     *  symbol declaration itself (NOT the leading JSDoc, so the lens sits
     *  directly above `function foo() {` like VS Code).
     */
    displayLine: number;
    /**
     * Start of the scope sent to the AI action (1-based, inclusive). Typically
     *  points at the leading JSDoc so explanations / refactors see the doc.
     */
    startLine: number;
    /** End of the scope sent to the AI action (1-based, inclusive, = closing `}`). */
    endLine: number;
    commands: CodeLensCommand[];
}

/**
 * Localizable labels used by buildCodeLenses. Defaults are English so existing
 *  tests keep working; registerAiCodeLensProvider plugs in I18n.t() values.
 */
export interface CodeLensLabels {
    explainTitle: string;
    refactorTitle: string;
    testsTitle: string;
    /** Called with the symbol kind + name to produce a tooltip per lens action. */
    explainTooltip: (kind: string, name: string) => string;
    refactorTooltip: (kind: string, name: string) => string;
    testsTooltip: (kind: string, name: string) => string;
}

const DEFAULT_LABELS: CodeLensLabels = {
    explainTitle: '💡 Explain',
    refactorTitle: '🔧 Refactor',
    testsTitle: '✅ Tests',
    explainTooltip: (kind, name) => `Explain ${kind} ${name}`,
    refactorTooltip: (kind, name) => `Refactor ${kind} ${name}`,
    testsTooltip: (kind, name) => `Suggest tests for ${kind} ${name}`,
};

/**
 * Turn the raw symbol list into code-lens entries.
 *  For each symbol we emit three lens commands: explain / refactor / tests.
 *  The symbol body range (start=symbol line, end=next symbol's line-1 or EOF)
 *  is passed as arguments so the dispatcher can extract the right code chunk.
 */
export function buildCodeLenses(
    source: string,
    commandId: string,
    labels: CodeLensLabels = DEFAULT_LABELS,
): CodeLensEntry[] {
    const symbols = findCodeLensSymbols(source);
    if (!symbols.length) {
        return [];
    }
    const scriptLines = source.split('\n');
    const totalLines = scriptLines.length;
    const entries: CodeLensEntry[] = [];
    for (let i = 0; i < symbols.length; i++) {
        const sym = symbols[i];
        const naiveEnd = i + 1 < symbols.length ? symbols[i + 1].line - 1 : totalLines;
        // Full range includes leading JSDoc and ends at the real closing brace.
        const { startLine, endLine } = computeFullSymbolRange(scriptLines, sym.line, naiveEnd);
        entries.push({
            displayLine: sym.line,
            startLine,
            endLine,
            commands: [
                {
                    id: commandId,
                    title: labels.explainTitle,
                    tooltip: labels.explainTooltip(sym.kind, sym.name),
                    arguments: ['explain', startLine, endLine],
                },
                {
                    id: commandId,
                    title: labels.refactorTitle,
                    tooltip: labels.refactorTooltip(sym.kind, sym.name),
                    arguments: ['refactor', startLine, endLine],
                },
                {
                    id: commandId,
                    title: labels.testsTitle,
                    tooltip: labels.testsTooltip(sym.kind, sym.name),
                    arguments: ['tests', startLine, endLine],
                },
            ],
        });
    }
    return entries;
}

/**
 * Register code-lens providers for JS and TS.
 *  Uses `editor.addCommand(0, handler, '')` — Monaco's documented Code-Lens
 *  pattern — which returns a command-id we can reference from lens entries.
 *  `editor.addAction` is NOT equivalent here: it registers via the action
 *  registry with a different argument-forwarding contract, and the arguments
 *  from `command.arguments` do not reach the handler in every Monaco build.
 *
 *  `dispatch` receives the action and the code chunk that was under the lens.
 */
export function registerAiCodeLensProvider(
    monaco: typeof monacoEditor,
    editor: monacoEditor.editor.IStandaloneCodeEditor,
    dispatch: (action: AiLensAction, code: string, rangeLabel: string, startLine: number, endLine: number) => void,
): monacoEditor.IDisposable {
    // `addCommand` registers a one-off command with no keybinding (first arg = 0)
    // and returns the auto-generated command id — exactly what we need for
    // code-lens `command.id` references. When Monaco dispatches a code-lens
    // click it calls this handler with `(ctx, ...command.arguments)`.
    const cmdId = editor.addCommand(
        0,
        (_ctx: unknown, ...args: unknown[]) => {
            const [action, startLine, endLine] = args as [AiLensAction, number, number];
            const model = editor.getModel();
            if (!model) {
                return;
            }
            const start = Math.max(1, Math.min(Number(startLine), model.getLineCount()));
            const end = Math.max(start, Math.min(Number(endLine), model.getLineCount()));
            const range = new monaco.Range(start, 1, end, model.getLineMaxColumn(end));
            const code = model.getValueInRange(range);
            const rangeLabel = start === end ? `line ${start}` : `lines ${start}-${end}`;
            dispatch(action, code, rangeLabel, start, end);
        },
        '',
    );

    if (!cmdId) {
        // Defensive: nothing to hang lenses off — unregister nothing.
        return { dispose: () => undefined };
    }

    // Fetch localized labels once per registration — language is fixed for the session.
    const labels: CodeLensLabels = {
        explainTitle: `💡 ${I18n.t('Explain')}`,
        refactorTitle: `🔧 ${I18n.t('Refactor')}`,
        testsTitle: `✅ ${I18n.t('Tests')}`,
        explainTooltip: (kind, name) => I18n.t('Explain %s %s', kind, name),
        refactorTooltip: (kind, name) => I18n.t('Refactor %s %s', kind, name),
        testsTooltip: (kind, name) => I18n.t('Suggest tests for %s %s', kind, name),
    };

    const lensDisposables: monacoEditor.IDisposable[] = [];
    for (const language of ['javascript', 'typescript']) {
        const disp = monaco.languages.registerCodeLensProvider(language, {
            provideCodeLenses: (model, _token) => {
                const entries = buildCodeLenses(model.getValue(), cmdId, labels);
                const lenses: monacoEditor.languages.CodeLens[] = [];
                for (const e of entries) {
                    for (const c of e.commands) {
                        lenses.push({
                            // Render the lens above the declaration line, not above the JSDoc,
                            // so it looks anchored to `function foo` — the VS-Code convention.
                            range: new monaco.Range(e.displayLine, 1, e.displayLine, 1),
                            id: `${cmdId}-${e.displayLine}-${c.title}`,
                            command: {
                                id: c.id,
                                title: c.title,
                                tooltip: c.tooltip,
                                arguments: c.arguments,
                            },
                        });
                    }
                }
                return { lenses, dispose: () => undefined };
            },
            resolveCodeLens: (_model, lens) => lens,
        });
        lensDisposables.push(disp);
    }

    return {
        dispose(): void {
            // addCommand returns just an id; Monaco doesn't give us a disposer
            // for it directly — the command lives as long as the editor does
            // and is garbage-collected when the editor is destroyed.
            lensDisposables.forEach(d => {
                try {
                    d.dispose();
                } catch {
                    /* ignore */
                }
            });
        },
    };
}
