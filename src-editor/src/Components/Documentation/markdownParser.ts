/**
 * The pure half of the documentation dialog: Markdown split into blocks and inline tokens.
 *
 * The dialog shows `docs/en/javascript.md` - the same file that GitHub and ioBroker.net render - so
 * the parser covers the subset that file uses: headings, paragraphs, fenced code, pipe tables, flat
 * or indented lists, and inline code, bold, italic, escapes and links. Anything else stays visible as
 * the text it is; documentation that silently loses a line is worse than one that looks plain.
 *
 * Kept apart from the React component, so it can be tested without rendering anything.
 */

export type Inline =
    | { type: 'text'; text: string }
    | { type: 'code'; text: string }
    | { type: 'strong' | 'em'; children: Inline[] }
    | { type: 'link'; href: string; children: Inline[] };

export interface HeadingBlock {
    type: 'heading';
    /** 1 for `#`, 2 for `##` ... */
    level: number;
    /** The heading as written, inline markup included */
    source: string;
    /** The heading as read: no markup */
    text: string;
    /** GitHub's anchor for the heading, so the links inside the document keep working */
    anchor: string;
}

export interface ListItem {
    text: string;
    /** 0 for an item of the list itself, 1 for one indented below it ... */
    depth: number;
}

export type Block =
    | HeadingBlock
    | { type: 'paragraph'; text: string }
    | { type: 'code'; text: string }
    | { type: 'table'; header: string[]; rows: string[][] }
    | { type: 'list'; ordered: boolean; start: number; items: ListItem[] };

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const FENCE = /^\s*```/;
const BULLET = /^(\s*)[-*+]\s+(.*)$/;
const NUMBERED = /^(\s*)(\d+)\.\s+(.*)$/;
const TABLE_SEPARATOR = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

/**
 * Code first, and as a whole token: back-ticked text is literal, so `**` inside it is two asterisks.
 * Emphasis needs a non-blank character on the inside of both markers - `'*'` is an asterisk in quotes.
 * A bare address is a link, as on GitHub - without the punctuation that ends the sentence around it.
 */
const INLINE =
    /`([^`]+)`|\\([!-/:-@[-`{-~])|\*\*\*(\S(?:.*?\S)??)\*\*\*|\*\*(\S(?:.*?\S)??)\*\*|\*([^*\s](?:[^*]*?[^*\s])?)\*|\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s<>()`]*[^\s<>()`.,;:!?'"*])/g;

/** Inline markup inside one line of text. */
export function tokens(text: string): Inline[] {
    const out: Inline[] = [];
    const pattern = new RegExp(INLINE.source, 'g');
    let last = 0;
    let match: RegExpExecArray | null;

    const pushText = (value: string): void => {
        const previous = out[out.length - 1];
        if (previous?.type === 'text') {
            previous.text += value;
        } else if (value) {
            out.push({ type: 'text', text: value });
        }
    };

    while ((match = pattern.exec(text)) !== null) {
        pushText(text.slice(last, match.index));
        const [, code, escaped, strongEm, strong, em, label, href, address] = match;
        if (code !== undefined) {
            out.push({ type: 'code', text: code });
        } else if (escaped !== undefined) {
            pushText(escaped);
        } else if (strongEm !== undefined) {
            out.push({ type: 'strong', children: [{ type: 'em', children: tokens(strongEm) }] });
        } else if (strong !== undefined) {
            out.push({ type: 'strong', children: tokens(strong) });
        } else if (em !== undefined) {
            out.push({ type: 'em', children: tokens(em) });
        } else if (address !== undefined) {
            out.push({ type: 'link', href: address, children: [{ type: 'text', text: address }] });
        } else {
            out.push({ type: 'link', href, children: tokens(label) });
        }
        last = match.index + match[0].length;
    }

    pushText(text.slice(last));
    return out;
}

/** The text a reader sees, without the markup around it. */
export function plain(text: string | Inline[]): string {
    const list = typeof text === 'string' ? tokens(text) : text;
    return list.map(token => ('children' in token ? plain(token.children) : token.text)).join('');
}

/**
 * The anchor GitHub gives a heading: lower case, punctuation dropped, every space a hyphen - so
 * `$ - Selector` becomes `---selector`. Repeated headings get `-1`, `-2` ... appended.
 */
export function slug(text: string, taken: Map<string, number>): string {
    const base = text
        .toLowerCase()
        .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '')
        .replace(/ /g, '-');
    let anchor = base;
    while (taken.has(anchor)) {
        const count = (taken.get(base) || 0) + 1;
        taken.set(base, count);
        anchor = `${base}-${count}`;
    }
    taken.set(anchor, 0);
    return anchor;
}

/** A pipe table's cells. A `\|` is part of a cell, not a border. */
function cells(line: string): string[] {
    return line
        .trim()
        .replace(/^\|/, '')
        .replace(/(?<!\\)\|$/, '')
        .split(/(?<!\\)\|/)
        .map(cell => cell.trim());
}

function isTableStart(lines: string[], i: number): boolean {
    return lines[i].trim().startsWith('|') && TABLE_SEPARATOR.test(lines[i + 1] || '');
}

/** Whether a line starts a block of its own - and so cannot continue a paragraph or a list item. */
function startsBlock(lines: string[], i: number): boolean {
    const line = lines[i];
    return HEADING.test(line) || FENCE.test(line) || isTableStart(lines, i) || BULLET.test(line) || NUMBERED.test(line);
}

const indentOf = (value: string): number => value.replace(/\t/g, '    ').length;

/** The document as a list of blocks, in the order they appear. */
export function parse(markdown: string): Block[] {
    const lines = markdown.split(/\r?\n/);
    const blocks: Block[] = [];
    const taken = new Map<string, number>();

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (!line.trim()) {
            continue;
        }

        // Fenced code: everything up to the closing fence is literal, headings included.
        if (FENCE.test(line)) {
            const code: string[] = [];
            for (i++; i < lines.length && !FENCE.test(lines[i]); i++) {
                code.push(lines[i]);
            }
            blocks.push({ type: 'code', text: code.join('\n') });
            continue;
        }

        const heading = HEADING.exec(line);
        if (heading) {
            const text = plain(heading[2]);
            blocks.push({
                type: 'heading',
                level: heading[1].length,
                source: heading[2],
                text,
                anchor: slug(text, taken),
            });
            continue;
        }

        // A pipe table: the header row, a separator, then the body.
        if (isTableStart(lines, i)) {
            const header = cells(line);
            const rows: string[][] = [];
            for (i += 2; i < lines.length && lines[i].trim().startsWith('|'); i++) {
                rows.push(cells(lines[i]));
            }
            i--;
            blocks.push({ type: 'table', header, rows });
            continue;
        }

        const numbered = NUMBERED.exec(line);
        if (numbered || BULLET.test(line)) {
            const ordered = !!numbered;
            const itemPattern = ordered ? NUMBERED : BULLET;
            const base = indentOf((numbered || BULLET.exec(line)!)[1]);
            const items: ListItem[] = [];
            for (; i < lines.length && lines[i].trim(); i++) {
                const item = itemPattern.exec(lines[i]);
                if (item) {
                    const indent = indentOf(item[1]);
                    items.push({
                        text: item[item.length - 1],
                        depth: indent > base ? Math.ceil((indent - base) / 4) : 0,
                    });
                } else if (startsBlock(lines, i)) {
                    break;
                } else {
                    // A wrapped item: the next line belongs to it, indented or not.
                    items[items.length - 1].text += ` ${lines[i].trim()}`;
                }
            }
            i--;
            blocks.push({ type: 'list', ordered, start: numbered ? parseInt(numbered[2], 10) : 1, items });
            continue;
        }

        // Anything else is a paragraph: a hard-wrapped source has to come out as flowing text.
        const paragraph: string[] = [line.trim()];
        for (i++; i < lines.length && lines[i].trim() && !startsBlock(lines, i); i++) {
            paragraph.push(lines[i].trim());
        }
        i--;
        blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
    }

    return blocks;
}

/**
 * The blocks without a hand-written table of contents - on GitHub it is the only way to navigate,
 * in the dialog the list beside the text does it better and stays in view.
 */
export function withoutContents(blocks: Block[]): Block[] {
    const at = blocks.findIndex(
        block => block.type === 'heading' && /^((table of )?contents?|inhalt(sverzeichnis)?)$/i.test(block.text.trim()),
    );
    if (at === -1) {
        return blocks;
    }
    const { level } = blocks[at] as HeadingBlock;
    let end = at + 1;
    while (end < blocks.length && !(blocks[end].type === 'heading' && (blocks[end] as HeadingBlock).level <= level)) {
        if (blocks[end].type !== 'list') {
            // Not only links - then it is content, and nothing is dropped.
            return blocks;
        }
        end++;
    }
    return [...blocks.slice(0, at), ...blocks.slice(end)];
}

/** One entry of the contents list. */
export interface ContentsEntry {
    level: number;
    anchor: string;
    /** The documented function, e.g. `on` for "on - Subscribe on changes..." - or the whole heading */
    name: string;
    /** The rest of a "name - description" heading */
    description: string;
    /** The whole heading, for filtering */
    text: string;
    /** Whether `name` is an identifier, e.g. a function or a variable of the script scope */
    code: boolean;
}

/** Headings deeper than a function ("Parameters", "Example") would only make the list longer. */
export const CONTENTS_DEPTH = 3;

const FUNCTION_HEADING = /^([A-Za-z_$][\w$]*)(?:\s+-\s+(.*))?$/;

export function contents(blocks: Block[]): ContentsEntry[] {
    return blocks
        .filter((block): block is HeadingBlock => block.type === 'heading' && block.level <= CONTENTS_DEPTH)
        .map(block => {
            const text = block.text.replace(/:\s*$/, '');
            // Only below the top sections: a "## Option - ..." section is not a function called Option.
            const fn = block.level >= CONTENTS_DEPTH ? FUNCTION_HEADING.exec(text) : null;
            return {
                level: block.level,
                anchor: block.anchor,
                name: fn ? fn[1] : text,
                description: fn?.[2] || '',
                text,
                code: !!fn,
            };
        });
}

/** The section documenting `word` - an identifier under the cursor - if there is one. */
export function sectionOf(entries: ContentsEntry[], word: string | null | undefined): string | null {
    if (!word) {
        return null;
    }
    const entry = entries.find(item => item.level >= CONTENTS_DEPTH && item.name === word);
    return entry ? entry.anchor : null;
}

/** Entries whose heading contains every word of the filter, in any case. */
export function filterContents(entries: ContentsEntry[], filter: string): ContentsEntry[] {
    const words = filter.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) {
        return entries;
    }
    return entries.filter(entry => {
        const text = entry.text.toLowerCase();
        return words.every(word => text.includes(word));
    });
}

/**
 * Where a link in the document goes: an anchor in the same document, or an address to open.
 * A relative file (`blockly.md#credential`) is resolved against `base`, where the document lives.
 */
export function resolveLink(href: string, base: string): { anchor: string } | { url: string } {
    if (href.startsWith('#')) {
        return { anchor: decodeURIComponent(href.slice(1)).toLowerCase() };
    }
    if (/^[a-z][a-z\d+.-]*:/i.test(href)) {
        return { url: href };
    }
    return { url: new URL(href, base).href };
}
