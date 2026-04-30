/**
 * Monaco hover provider that shows live ioBroker state info when the user hovers
 * over an object ID inside a string literal, e.g.
 *     getState('zigbee2mqtt.0.sensor.temperature')
 *     on('hm-rpc.0.CUX0000001.PRESS_SHORT', () => { ... })
 *
 * Works entirely independently of the AI chat — useful even when no AI keys are
 * configured.
 *
 * Exports:
 *   - `extractIdUnderCursor` (pure): find the string-literal under the cursor and
 *     return the contained ID if it looks like an ioBroker object ID.
 *   - `formatStateHoverMarkdown` (pure): build the Monaco markdown string shown
 *     in the hover tooltip, given the object and the latest state value.
 *   - `registerStateHoverProvider`: wire the provider to Monaco for JS/TS, with
 *     a small in-memory cache + debouncing to avoid hammering the socket.
 */

import type * as monacoEditor from 'monaco-editor';
import type { AdminConnection } from '@iobroker/adapter-react-v5';

/** Regex for a plausible ioBroker object ID: adapter.instance.something[.more] */
const OBJECT_ID_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_-]*\.\d+(?:\.[A-Za-z0-9_.\-/:#]+)+$/;

/**
 * Try to find the string-literal that contains the cursor position, and return its
 *  contents if they look like an ioBroker object ID.
 *
 *  Supports single quotes, double quotes, and backticks.
 *  Returns `{ id, start, end }` with column indexes relative to the line (1-based,
 *  Monaco convention), or `null` if nothing plausible is under the cursor.
 */
export function extractIdUnderCursor(
    lineContent: string,
    columnNumber1Based: number,
): { id: string; startColumn: number; endColumn: number } | null {
    if (!lineContent) {
        return null;
    }
    const cursor = Math.max(1, Math.min(columnNumber1Based, lineContent.length + 1)) - 1;

    // Walk backwards from the cursor to find the most recent unescaped quote.
    const quotes = ["'", '"', '`'];
    let quoteChar: string | null = null;
    let quoteStart = -1;
    for (let i = cursor - 1; i >= 0; i--) {
        const ch = lineContent[i];
        if (quotes.includes(ch) && lineContent[i - 1] !== '\\') {
            // Count preceding quotes of the same type on this line to decide if we're inside or outside.
            let count = 0;
            for (let j = 0; j < i; j++) {
                if (lineContent[j] === ch && lineContent[j - 1] !== '\\') {
                    count++;
                }
            }
            if (count % 2 === 0) {
                // Even number of same-type quotes before this one → this one opens our literal.
                quoteChar = ch;
                quoteStart = i;
                break;
            }
            // Odd → this is a closing quote that is behind us; keep scanning.
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
    if (!OBJECT_ID_PATTERN.test(raw)) {
        return null;
    }
    return {
        id: raw,
        startColumn: quoteStart + 2, // 1-based, exclude the opening quote
        endColumn: quoteEnd + 1, // 1-based, exclude the closing quote
    };
}

function getText(v: unknown): string {
    if (!v) {
        return '';
    }
    if (typeof v === 'string') {
        return v;
    }
    if (typeof v === 'object') {
        const rec = v as Record<string, string>;
        return rec.en || rec.de || Object.values(rec)[0] || '';
    }
    return String(v as number | boolean | bigint | symbol);
}

function formatValue(val: unknown): string {
    if (val === null || val === undefined) {
        return '*null*';
    }
    if (typeof val === 'boolean') {
        return val ? '`true`' : '`false`';
    }
    if (typeof val === 'number') {
        return `\`${val}\``;
    }
    if (typeof val === 'string') {
        const s = val.length > 200 ? `${val.substring(0, 200)}…` : val;
        return `\`"${s}"\``;
    }
    if (typeof val === 'object') {
        try {
            const s = JSON.stringify(val);
            return s.length > 200 ? `\`${s.substring(0, 200)}…\`` : `\`${s}\``;
        } catch {
            return '`<object>`';
        }
    }
    return String(val as bigint | symbol);
}

function formatAgo(ts: number | undefined): string {
    if (!ts) {
        return '';
    }
    const now = Date.now();
    const diff = now - ts;
    if (diff < 0) {
        return new Date(ts).toLocaleString();
    }
    const s = Math.floor(diff / 1000);
    if (s < 60) {
        return `${s}s ago`;
    }
    const m = Math.floor(s / 60);
    if (m < 60) {
        return `${m} min ago`;
    }
    const h = Math.floor(m / 60);
    if (h < 24) {
        return `${h} h ago`;
    }
    const d = Math.floor(h / 24);
    return d < 30 ? `${d} d ago` : new Date(ts).toLocaleDateString();
}

/**
 * Render the markdown body of the hover tooltip.
 *  Pure function — takes the object + state as inputs so it's easy to unit test.
 */
export function formatStateHoverMarkdown(
    id: string,
    obj: ioBroker.AnyObject | null | undefined,
    state: ioBroker.State | null | undefined,
): string {
    const lines: string[] = [];
    const type = obj?.type || 'unknown';
    lines.push(`**\`${id}\`** · *${type}*`);
    if (!obj) {
        lines.push('', '⚠️ Object not found in the object database.');
        return lines.join('\n');
    }

    const common = obj.common as ioBroker.StateCommon | undefined;
    const name = getText(common?.name);
    if (name) {
        lines.push(`Name: ${name}`);
    }

    const meta: string[] = [];
    if (common?.type) {
        meta.push(`type \`${common.type}\``);
    }
    if (common?.role) {
        meta.push(`role \`${common.role}\``);
    }
    if (common?.unit) {
        meta.push(`unit \`${common.unit}\``);
    }
    if (common?.min !== undefined) {
        meta.push(`min \`${common.min}\``);
    }
    if (common?.max !== undefined) {
        meta.push(`max \`${common.max}\``);
    }
    if (meta.length) {
        lines.push(meta.join(' · '));
    }

    const rw: string[] = [];
    if (common?.read === true || common?.read === undefined) {
        rw.push('read');
    }
    if (common?.write === true) {
        rw.push('write');
    }
    if (rw.length === 1) {
        lines.push(`*${rw[0]}-only*`);
    }

    if (common?.states && typeof common.states === 'object') {
        const entries = Object.entries(common.states as Record<string, string>);
        if (entries.length && entries.length <= 8) {
            lines.push('', '**Values:**');
            for (const [k, v] of entries) {
                lines.push(`- \`${k}\` → ${v}`);
            }
        } else if (entries.length > 8) {
            lines.push('', `**Values:** ${entries.length} defined`);
        }
    }

    if (type === 'state') {
        lines.push('');
        if (state) {
            const ack = state.ack ? '✓ ack' : '✗ not ack';
            const ago = formatAgo(state.ts);
            lines.push(`**Value:** ${formatValue(state.val)}  ·  ${ack}${ago ? `  ·  ${ago}` : ''}`);
            if (state.from) {
                lines.push(`*from:* \`${state.from}\``);
            }
        } else {
            lines.push('*No current value available.*');
        }
    }

    return lines.join('\n');
}

interface CacheEntry {
    obj: ioBroker.AnyObject | null;
    state: ioBroker.State | null;
    fetchedAt: number;
}

const CACHE_TTL_MS = 5000;
const cache = new Map<string, CacheEntry>();

async function fetchObjectAndState(
    socket: AdminConnection,
    id: string,
): Promise<{ obj: ioBroker.AnyObject | null; state: ioBroker.State | null }> {
    const hit = cache.get(id);
    if (hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS) {
        return { obj: hit.obj, state: hit.state };
    }
    let obj: ioBroker.AnyObject | null = null;
    let state: ioBroker.State | null = null;
    try {
        obj = ((await socket.getObject(id)) || null) as ioBroker.AnyObject | null;
    } catch {
        obj = null;
    }
    if (obj?.type === 'state') {
        try {
            state = (await socket.getState(id)) || null;
        } catch {
            state = null;
        }
    }
    cache.set(id, { obj, state, fetchedAt: Date.now() });
    return { obj, state };
}

/** Expose cache-clearing (e.g. for tests or when the user reconnects). */
export function clearStateHoverCache(): void {
    cache.clear();
}

/**
 * Register the hover provider for JS and TS languages.
 *  Returns an IDisposable that can be called to unregister.
 */
export function registerStateHoverProvider(
    monaco: typeof monacoEditor,
    socket: AdminConnection,
): monacoEditor.IDisposable {
    const disposables: monacoEditor.IDisposable[] = [];
    for (const language of ['javascript', 'typescript']) {
        const disp = monaco.languages.registerHoverProvider(language, {
            provideHover: async (model, position) => {
                const line = model.getLineContent(position.lineNumber);
                const hit = extractIdUnderCursor(line, position.column);
                if (!hit) {
                    return null;
                }
                try {
                    const { obj, state } = await fetchObjectAndState(socket, hit.id);
                    const md = formatStateHoverMarkdown(hit.id, obj, state);
                    return {
                        range: new monaco.Range(
                            position.lineNumber,
                            hit.startColumn,
                            position.lineNumber,
                            hit.endColumn,
                        ),
                        contents: [{ value: md, isTrusted: false, supportHtml: false }],
                    };
                } catch {
                    return null;
                }
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
