/**
 * Translations and the two lookup helpers - converted from
 * `public/google-blockly/own/blocks_words.js`.
 *
 * The 543 translation entries were extracted from the legacy file mechanically into `words.json`
 * rather than retyped: the snapshot tests only see generated code, so a typo in a translation would
 * have been invisible.
 *
 * Everything here has to stay reachable from the global, because it is the base every other block
 * file builds on:
 *
 * - `Blockly.Words` — `blocks_time.js` adds 17 `.format` properties to entries defined here, and
 *   several files add entries of their own. The table is therefore handed out as a mutable copy.
 * - `Blockly.Translate` — used by every block file and by adapter block files.
 * - `getHelp` — the legacy file declared it as a plain function, which lands on `window` only
 *   because it is a classic script. 8 files still call it 71 times, so it is published explicitly.
 *
 * `module.exports = Blockly` at the end of the original was for Node and never ran in the browser.
 */
import words from './words.json';

/** A translation entry: one string per language, plus the date pattern `blocks_time.js` adds */
export type WordEntry = Record<ioBroker.Languages, string> & { format?: string };

/**
 * Looks a word up in `Blockly.Words`.
 *
 * @param word The translation key
 * @param lang Language, defaults to the one the editor runs in
 */
export function translate(word: string, lang?: ioBroker.Languages): string {
    const table = window.Blockly.Words;
    const language = lang || window.systemLang;

    if (table?.[word]) {
        return table[word]?.[language] || table[word]?.en || word;
    }

    return word;
}

/**
 * Builds the documentation link of a block.
 *
 * @param word The translation key of the block
 */
export function getHelp(word: string): string {
    const table = window.Blockly.Words;
    const anchor = table?.[word]?.[window.systemLang] || table?.[word]?.en || word;

    return `https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/javascript.md#${anchor}`;
}

export function install(): void {
    // A copy, so the imported module data stays pristine while other block files add entries and
    // `.format` properties to the table
    window.Blockly.Words = Object.fromEntries(
        Object.entries(words as Record<string, WordEntry>).map(([key, entry]) => [key, { ...entry }]),
    );

    window.Blockly.Translate = translate;
    window.getHelp = getHelp;
}
