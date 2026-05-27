/**
 * Monaco hover provider that shows a human-readable description when the user
 * hovers over a cron expression inside a string literal, e.g.
 *     schedule('*\/5 * * * *', () => { ... })   →  "Every 5 minutes"
 *     schedule('0 9 * * 1-5', () => { ... })    →  "At 09:00, Monday through Friday"
 *
 * Works the same way as `stateHoverProvider` (sibling file): it scans the string
 * literal under the cursor and, if its content looks like a cron expression,
 * renders a tooltip. The decoding (and its localisation) is delegated to
 * `convertCronToText` from `@iobroker/adapter-react-v5`, so the wording matches
 * the cron wizard used elsewhere in the admin.
 *
 * Exports:
 *   - `extractCronUnderCursor` (pure): find the string-literal under the cursor and
 *     return its content if it looks like a cron expression.
 *   - `describeCron` (pure): turn a cron expression into a localised sentence
 *     (or `null` when the expression is not valid).
 *   - `formatCronHoverMarkdown` (pure): build the Monaco markdown shown in the tooltip.
 *   - `registerCronHoverProvider`: wire the provider to Monaco for JS/TS.
 */

import type * as monacoEditor from 'monaco-editor';
import { I18n, convertCronToText } from '@iobroker/adapter-react-v5';

/** Quote characters that may surround a string literal. */
const QUOTES = ["'", '"', '`'];

/** Aliases understood by cron (and by cronstrue): `@daily`, `@hourly`, … */
const CRON_ALIAS = /^@(annually|yearly|monthly|weekly|daily|midnight|hourly|reboot)$/i;

/** A single cron field: numbers, ranges, steps, lists, names (JAN, MON) and quartz chars. */
const CRON_FIELD = /^[0-9A-Za-z*/,?#\-LW]+$/;

/**
 * Decide whether a raw string looks enough like a cron expression to bother
 * decoding it. Keeps the hover from triggering on arbitrary strings; the real
 * validation is left to `describeCron` (i.e. cronstrue itself).
 */
export function looksLikeCron(raw: string): boolean {
    const s = raw.trim();
    if (!s) {
        return false;
    }
    if (CRON_ALIAS.test(s)) {
        return true;
    }
    const fields = s.split(/\s+/);
    // Standard cron has 5 fields; with seconds 6; with seconds + year 7.
    if (fields.length < 5 || fields.length > 7) {
        return false;
    }
    if (!fields.every(f => CRON_FIELD.test(f))) {
        return false;
    }
    // Require at least one "cron-ish" token so plain 5-word sentences are ignored.
    return /[\d*/]/.test(s);
}

/**
 * Try to find the string-literal that contains the cursor position and return its
 * content if it looks like a cron expression.
 *
 * Supports single quotes, double quotes, and backticks. Returns `{ expression,
 * startColumn, endColumn }` with 1-based column indexes (Monaco convention), or
 * `null` if nothing cron-like is under the cursor.
 */
export function extractCronUnderCursor(
    lineContent: string,
    columnNumber1Based: number,
): { expression: string; startColumn: number; endColumn: number } | null {
    if (!lineContent) {
        return null;
    }
    const cursor = Math.max(1, Math.min(columnNumber1Based, lineContent.length + 1)) - 1;

    // Walk backwards from the cursor to find the quote that opens our literal.
    let quoteChar: string | null = null;
    let quoteStart = -1;
    for (let i = cursor - 1; i >= 0; i--) {
        const ch = lineContent[i];
        if (QUOTES.includes(ch) && lineContent[i - 1] !== '\\') {
            // Count preceding quotes of the same type to decide if we're inside or outside.
            let count = 0;
            for (let j = 0; j < i; j++) {
                if (lineContent[j] === ch && lineContent[j - 1] !== '\\') {
                    count++;
                }
            }
            if (count % 2 === 0) {
                quoteChar = ch;
                quoteStart = i;
                break;
            }
        }
    }
    if (quoteChar === null || quoteStart < 0) {
        return null;
    }
    // Find the matching closing quote after the cursor.
    let quoteEnd = -1;
    for (let i = quoteStart + 1; i < lineContent.length; i++) {
        if (lineContent[i] === quoteChar && lineContent[i - 1] !== '\\') {
            quoteEnd = i;
            break;
        }
    }
    if (quoteEnd < 0) {
        return null;
    }
    if (cursor < quoteStart || cursor > quoteEnd) {
        return null;
    }
    const raw = lineContent.substring(quoteStart + 1, quoteEnd);
    if (!looksLikeCron(raw)) {
        return null;
    }
    return {
        expression: raw.trim(),
        startColumn: quoteStart + 2, // 1-based, exclude the opening quote
        endColumn: quoteEnd + 1, // 1-based, exclude the closing quote
    };
}

/**
 * Decode a cron expression to a localised, human-readable sentence.
 * Delegates to `convertCronToText` (which throws on invalid input); returns
 * `null` when the expression cannot be parsed.
 */
export function describeCron(expression: string, lang?: ioBroker.Languages): string | null {
    try {
        return convertCronToText(expression, lang || I18n.getLanguage()) || null;
    } catch {
        return null;
    }
}

/**
 * Labels for each cron field, depending on how many fields the expression has.
 * Index 0 is the first (left-most) field.
 */
function fieldLabels(count: number): string[] {
    const second = I18n.t('Second');
    const minute = I18n.t('Minute');
    const hour = I18n.t('Hour');
    const dayOfMonth = I18n.t('Day of month');
    const month = I18n.t('Month');
    const dayOfWeek = I18n.t('Day of week');
    const year = I18n.t('Year');
    if (count === 7) {
        return [second, minute, hour, dayOfMonth, month, dayOfWeek, year];
    }
    if (count === 6) {
        return [second, minute, hour, dayOfMonth, month, dayOfWeek];
    }
    // 5 fields (standard)
    return [minute, hour, dayOfMonth, month, dayOfWeek];
}

/**
 * Build the markdown body of the cron hover tooltip.
 * Pure function — easy to unit test.
 */
export function formatCronHoverMarkdown(expression: string, description: string): string {
    const lines: string[] = [];
    lines.push(`**⏰ ${I18n.t('Cron expression')}** · \`${expression}\``);
    lines.push('', `**${description}**`);

    // Field-by-field legend (only for plain field-based expressions, not @aliases).
    const fields = expression.split(/\s+/);
    if (!CRON_ALIAS.test(expression) && fields.length >= 5 && fields.length <= 7) {
        const labels = fieldLabels(fields.length);
        lines.push('');
        fields.forEach((f, i) => {
            lines.push(`- \`${f}\` — ${labels[i]}`);
        });
    }

    return lines.join('\n');
}

/**
 * Register the cron hover provider for JS and TS languages.
 * Returns an IDisposable that can be called to unregister.
 */
export function registerCronHoverProvider(monaco: typeof monacoEditor): monacoEditor.IDisposable {
    const disposables: monacoEditor.IDisposable[] = [];
    for (const language of ['javascript', 'typescript']) {
        const disp = monaco.languages.registerHoverProvider(language, {
            provideHover: (model, position) => {
                const line = model.getLineContent(position.lineNumber);
                const hit = extractCronUnderCursor(line, position.column);
                if (!hit) {
                    return null;
                }
                const description = describeCron(hit.expression);
                if (!description) {
                    return null;
                }
                const md = formatCronHoverMarkdown(hit.expression, description);
                return {
                    range: new monaco.Range(position.lineNumber, hit.startColumn, position.lineNumber, hit.endColumn),
                    contents: [{ value: md, isTrusted: false, supportHtml: false }],
                };
            },
        });
        disposables.push(disp);
    }
    return {
        dispose(): void {
            disposables.forEach(d => {
                try {
                    d.dispose();
                } catch {
                    /* ignore */
                }
            });
        },
    };
}
