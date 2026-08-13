/**
 * Copies the Blockly assets into `public/google-blockly`.
 *
 * Blockly's *code* is no longer vendored - it is imported from the npm package and bundled (see
 * `src/Components/blockly-plugins/bridge.ts`). What remains here are the two things the editor
 * still fetches over HTTP at runtime: the media files and the language files, which are loaded
 * on demand for the selected language.
 *
 * Run `npm i` first, then `node updateBlockly.js`.
 */
import { existsSync, copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, 'node_modules', 'blockly');
const DST = join(HERE, 'public', 'google-blockly');

/**
 * The languages the editor offers. Blockly ships them as `msg/<lang>.js`, the editor loads them
 * from `msg/js/<lang>.js`, so the destination keeps that layout.
 */
const LANGUAGES = {
    de: 'de',
    en: 'en',
    es: 'es',
    fr: 'fr',
    it: 'it',
    nl: 'nl',
    pl: 'pl',
    pt: 'pt',
    ru: 'ru',
    uk: 'uk',
    // ioBroker calls simplified Chinese "zh-cn", Blockly calls it "zh-hans"
    'zh-cn': 'zh-hans',
};

function copyFile(from, to) {
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
}

function copyDirectory(from, to) {
    mkdirSync(to, { recursive: true });
    for (const entry of readdirSync(from, { withFileTypes: true })) {
        const source = join(from, entry.name);
        const target = join(to, entry.name);
        if (entry.isDirectory()) {
            copyDirectory(source, target);
        } else {
            copyFileSync(source, target);
        }
    }
}

if (!existsSync(SRC)) {
    console.error(`Blockly is not installed. Run "npm i" in ${HERE} first.`);
    process.exit(1);
}

const { version } = JSON.parse(readFileSync(join(SRC, 'package.json'), 'utf8'));

// The npm package ships no LICENSE file (it only declares "Apache-2.0"), so the copy that is
// already in public/google-blockly stays where it is.
copyDirectory(join(SRC, 'media'), join(DST, 'media'));

for (const [target, source] of Object.entries(LANGUAGES)) {
    copyFile(join(SRC, 'msg', `${source}.js`), join(DST, 'msg', 'js', `${target}.js`));
}

// Written so the shipped version is visible without diffing the compressed files
writeFileSync(join(DST, 'VERSION'), `${version}\n`);

console.log(`Copied Blockly ${version} to ${relative(HERE, DST)}`);
