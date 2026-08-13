/**
 * Builds the test corpus for the Blockly code generation.
 *
 * Nothing here is hand-written: every block already ships an XML representation, because the
 * toolbox needs one. Those snippets are richer than a bare `<block type="x"/>` - they carry the
 * shadow blocks and mutations a block is normally used with, so they exercise the generators
 * the way real scripts do.
 *
 * Three sources, in order of preference:
 *   1. `Blockly.<Category>.blocks[type]` - the ioBroker categories (System, Action, Sendto, ...)
 *   2. the `#toolbox` element in `src-editor/index.html` - the standard categories
 *   3. a bare `<block type="x"/>` for everything that is registered but in no toolbox
 */
const { readFileSync, readdirSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');

const INDEX_HTML = join(__dirname, '..', '..', 'src-editor', 'index.html');
const FIXTURES_DIR = join(__dirname, 'fixtures');

/**
 * Reads the toolbox out of index.html and returns the XML of every block listed there.
 *
 * @returns {Record<string, string>} block type -> XML of that block
 */
function readToolboxBlocks() {
    const dom = new JSDOM(readFileSync(INDEX_HTML, 'utf8'));
    const toolbox = dom.window.document.getElementById('toolbox');
    const blocks = {};

    if (!toolbox) {
        return blocks;
    }

    for (const category of Array.from(toolbox.children)) {
        // Only direct block children of a category are toolbox entries. Blocks nested inside them
        // are shadows and values that belong to the entry, not entries of their own.
        for (const block of Array.from(category.children)) {
            if (block.tagName.toLowerCase() !== 'block') {
                continue;
            }
            const type = block.getAttribute('type');
            // `<block>%%CUSTOM_BLOCKS%%</block>` is the placeholder for the generated categories
            if (type && !blocks[type]) {
                blocks[type] = block.outerHTML;
            }
        }
    }

    return blocks;
}

/**
 * Collects the corpus.
 *
 * @param {ReturnType<typeof import('./env').createBlocklyEnvironment>} env
 * @returns {{ type: string, group: string, source: string, xml: string }[]} sorted by group, then type
 */
function buildCorpus(env) {
    const { Blockly, origins } = env;
    const entries = [];
    const covered = new Set();

    const add = (type, source, blockXml) => {
        if (covered.has(type)) {
            return;
        }
        covered.add(type);
        entries.push({
            type,
            group: origins[type] || 'unknown',
            source,
            xml: `<xml xmlns="https://developers.google.com/blockly/xml">\n${blockXml}\n</xml>`,
        });
    };

    // 1. the ioBroker categories
    for (const category of Blockly.CustomBlocks || []) {
        const definition = Blockly[category];
        for (const type of Object.keys(definition?.blocks || {})) {
            add(type, `Blockly.${category}.blocks`, definition.blocks[type]);
        }
    }

    // 2. the standard categories from the toolbox
    const toolbox = readToolboxBlocks();
    for (const type of Object.keys(toolbox)) {
        add(type, 'index.html #toolbox', toolbox[type]);
    }

    // 3. everything else that is registered - covered bare, so a removed block is still noticed
    for (const type of Object.keys(Blockly.Blocks).sort()) {
        add(type, 'registry', `<block type="${type}"></block>`);
    }

    // 4. whole workspaces from test/blockly/fixtures/. The toolbox only ever shows a block in its
    //    default state, so branches behind a mutation or a dropdown are invisible to steps 1-3.
    //    Drop an exported Blockly script in there to cover one.
    if (existsSync(FIXTURES_DIR)) {
        for (const file of readdirSync(FIXTURES_DIR).filter(f => f.endsWith('.xml')).sort()) {
            entries.push({
                type: file.replace(/\.xml$/, ''),
                group: 'fixtures',
                source: `fixtures/${file}`,
                xml: readFileSync(join(FIXTURES_DIR, file), 'utf8'),
            });
        }
    }

    return entries.sort((a, b) => a.group.localeCompare(b.group) || a.type.localeCompare(b.type));
}

module.exports = { buildCorpus, readToolboxBlocks };
