import { describe, it, expect } from 'vitest';
import {
    type Block,
    type HeadingBlock,
    type Inline,
    contents,
    filterContents,
    parse,
    plain,
    resolveLink,
    sectionOf,
    slug,
    tokens,
    withoutContents,
} from '../markdownParser';
import enDoc from '../../../../../docs/en/javascript.md?raw';
import deDoc from '../../../../../docs/de/javascript.md?raw';

const headingsOf = (blocks: Block[]): HeadingBlock[] =>
    blocks.filter((block): block is HeadingBlock => block.type === 'heading');

describe('slug', () => {
    it('builds the anchors GitHub builds', () => {
        const taken = new Map<string, number>();
        expect(slug('on - Subscribe on changes or updates of some state', taken)).toBe(
            'on---subscribe-on-changes-or-updates-of-some-state',
        );
        expect(slug('$ - Selector', taken)).toBe('---selector');
        expect(slug('exec - execute some OS command, like cp file1 file2', taken)).toBe(
            'exec---execute-some-os-command-like-cp-file1-file2',
        );
        expect(slug('Option - "Do not subscribe all states on start"', taken)).toBe(
            'option---do-not-subscribe-all-states-on-start',
        );
    });

    it('numbers repeated headings', () => {
        const taken = new Map<string, number>();
        expect(slug('Parameters:', taken)).toBe('parameters');
        expect(slug('Parameters:', taken)).toBe('parameters-1');
        expect(slug('Parameters:', taken)).toBe('parameters-2');
    });
});

describe('tokens', () => {
    it('keeps markup inside code literal', () => {
        expect(tokens('use `**a**` here')).toEqual<Inline[]>([
            { type: 'text', text: 'use ' },
            { type: 'code', text: '**a**' },
            { type: 'text', text: ' here' },
        ]);
    });

    it('reads bold, italic and both', () => {
        expect(tokens('**b** *i* ***bi***')).toEqual<Inline[]>([
            { type: 'strong', children: [{ type: 'text', text: 'b' }] },
            { type: 'text', text: ' ' },
            { type: 'em', children: [{ type: 'text', text: 'i' }] },
            { type: 'text', text: ' ' },
            { type: 'strong', children: [{ type: 'em', children: [{ type: 'text', text: 'bi' }] }] },
        ]);
    });

    it('does not take a quoted asterisk for emphasis', () => {
        expect(plain("use '*' for any code. **Note**")).toBe("use '*' for any code. Note");
        expect(tokens("use '*' for any")).toEqual([{ type: 'text', text: "use '*' for any" }]);
    });

    it('drops the backslash of an escape', () => {
        expect(plain('\\(default: "and"\\) \\# name')).toBe('(default: "and") # name');
    });

    it('links a bare address, without the punctuation after it', () => {
        const href =
            'https://github.com/ioBroker/ioBroker/wiki/Adapter-Development-Documentation#commands-and-statuses';
        expect(tokens(`Please refer to ${href}.`)).toEqual<Inline[]>([
            { type: 'text', text: 'Please refer to ' },
            { type: 'link', href, children: [{ type: 'text', text: href }] },
            { type: 'text', text: '.' },
        ]);
        expect(tokens('[here](https://x.org/a)')).toEqual<Inline[]>([
            { type: 'link', href: 'https://x.org/a', children: [{ type: 'text', text: 'here' }] },
        ]);
        expect(tokens('`http://localhost:8081`')).toEqual<Inline[]>([{ type: 'code', text: 'http://localhost:8081' }]);
    });

    it('reads links, also inside bold', () => {
        expect(tokens('same as **[on](#on)**')).toEqual<Inline[]>([
            { type: 'text', text: 'same as ' },
            {
                type: 'strong',
                children: [{ type: 'link', href: '#on', children: [{ type: 'text', text: 'on' }] }],
            },
        ]);
    });
});

describe('parse', () => {
    it('splits a document into blocks', () => {
        const blocks = parse(
            [
                '## Title',
                'first line',
                'second line',
                '',
                '```js',
                '# not a heading',
                '```',
                '| a | b |',
                '|---|---|',
                '| 1 | x \\| y |',
                '',
                '- one',
                '  wrapped',
                '    - nested',
                '',
                '2. second',
            ].join('\n'),
        );
        expect(blocks).toEqual<Block[]>([
            { type: 'heading', level: 2, source: 'Title', text: 'Title', anchor: 'title' },
            { type: 'paragraph', text: 'first line second line' },
            { type: 'code', text: '# not a heading' },
            { type: 'table', header: ['a', 'b'], rows: [['1', 'x \\| y']] },
            {
                type: 'list',
                ordered: false,
                start: 1,
                items: [
                    { text: 'one wrapped', depth: 0 },
                    { text: 'nested', depth: 1 },
                ],
            },
            { type: 'list', ordered: true, start: 2, items: [{ text: 'second', depth: 0 }] },
        ]);
    });

    it('ends a paragraph at a heading or a list', () => {
        expect(parse('text\n### on\ntext\n- item').map(block => block.type)).toEqual([
            'paragraph',
            'heading',
            'paragraph',
            'list',
        ]);
    });
});

describe('withoutContents', () => {
    it('drops a table of contents made of links', () => {
        const blocks = withoutContents(parse('## Content\n- [on](#on)\n    - [once](#once)\n## Functions\n### on'));
        expect(headingsOf(blocks).map(heading => heading.text)).toEqual(['Functions', 'on']);
        expect(headingsOf(withoutContents(parse('## Inhalt\n- [on](#on)\n## Funktionen'))).length).toBe(1);
    });

    it('keeps a section called Contents that has text', () => {
        const blocks = parse('## Contents\nSome text\n## Next');
        expect(withoutContents(blocks)).toBe(blocks);
    });
});

describe('contents', () => {
    const entries = contents(
        parse('## Functions\n### on - Subscribe\n#### Parameters\n### $ - Selector\n## Option - "Do not subscribe"'),
    );

    it('lists sections and functions, not their sub-headings', () => {
        expect(entries.map(entry => [entry.name, entry.description, entry.code])).toEqual([
            ['Functions', '', false],
            ['on', 'Subscribe', true],
            ['$', 'Selector', true],
            ['Option - "Do not subscribe"', '', false],
        ]);
    });

    it('finds the section of a function', () => {
        expect(sectionOf(entries, 'on')).toBe('on---subscribe');
        expect(sectionOf(entries, '$')).toBe('---selector');
        expect(sectionOf(entries, 'Option')).toBeNull();
        expect(sectionOf(entries, 'log')).toBeNull();
        expect(sectionOf(entries, null)).toBeNull();
    });

    it('filters by every word, in any case', () => {
        expect(filterContents(entries, 'SELECTOR $').map(entry => entry.name)).toEqual(['$']);
        expect(filterContents(entries, 'sub').map(entry => entry.name)).toEqual(['on', 'Option - "Do not subscribe"']);
        expect(filterContents(entries, '  ')).toBe(entries);
    });
});

describe('resolveLink', () => {
    const base = 'https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/';

    it('tells anchors, addresses and relative files apart', () => {
        expect(resolveLink('#existsState', base)).toEqual({ anchor: 'existsstate' });
        expect(resolveLink('https://nodejs.org/api/', base)).toEqual({ url: 'https://nodejs.org/api/' });
        expect(resolveLink('blockly.md#credential', base)).toEqual({ url: `${base}blockly.md#credential` });
    });
});

/** Every `#anchor` a document links to, its own table of contents included. */
function anchorLinks(blocks: Block[]): string[] {
    const links: string[] = [];
    const collect = (list: Inline[]): void =>
        list.forEach(token => {
            if (token.type === 'link' && token.href.startsWith('#')) {
                links.push(token.href);
            }
            if ('children' in token) {
                collect(token.children);
            }
        });
    for (const block of blocks) {
        if (block.type === 'heading') {
            collect(tokens(block.source));
        } else if (block.type === 'paragraph') {
            collect(tokens(block.text));
        } else if (block.type === 'list') {
            block.items.forEach(item => collect(tokens(item.text)));
        } else if (block.type === 'table') {
            [block.header, ...block.rows].flat().forEach(cell => collect(tokens(cell)));
        }
    }
    return links;
}

const DOCUMENTS: Record<string, string> = { en: enDoc, de: deDoc };

for (const [lang, doc] of Object.entries(DOCUMENTS)) {
    describe(`docs/${lang}/javascript.md`, () => {
        const all = parse(doc);
        const blocks = withoutContents(all);
        const entries = contents(blocks);

        it('has its hand-written table of contents dropped', () => {
            expect(headingsOf(blocks).length).toBe(headingsOf(all).length - 1);
        });

        it('documents the most used functions where the cursor finds them', () => {
            for (const name of ['on', 'schedule', 'setState', 'getState', 'createState', 'sendTo', '$', 'SECRETS']) {
                expect(sectionOf(entries, name), name).not.toBeNull();
            }
        });

        it('only links to headings that exist', () => {
            const anchors = new Set(headingsOf(all).map(heading => heading.anchor));
            const links = anchorLinks(all);
            expect(links.length).toBeGreaterThan(0);
            const broken = links.filter(href => {
                const target = resolveLink(href, 'https://example.com/');
                return !('anchor' in target) || !anchors.has(target.anchor);
            });
            expect(broken).toEqual([]);
        });
    });
}

describe('the translations', () => {
    const shape = (doc: string): [number, string][] =>
        contents(withoutContents(parse(doc))).map(entry => [entry.level, entry.code ? entry.name : '']);

    // A translation that drops or reorders a function would leave the cursor lookup without its section.
    it('document the same functions as the English original, in the same order', () => {
        for (const doc of Object.values(DOCUMENTS)) {
            expect(shape(doc)).toEqual(shape(enDoc));
        }
    });
});
