/**
 * Headless Blockly environment for the code generation tests.
 *
 * This is the only file that knows *how* Blockly is loaded. When the editor moves from the
 * vendored script tags to an ESM import (see the migration concept), only this file changes -
 * the corpus and the golden files stay untouched, which is exactly what makes them a safety net.
 */
const { JSDOM } = require('jsdom');
const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const { buildSync } = require('esbuild');

const EDITOR_DIR = join(__dirname, '..', '..', 'src-editor');
const BLOCKLY_DIR = join(EDITOR_DIR, 'public', 'google-blockly');
/** The same npm package the editor bundles - so harness and editor can never run different versions */
const PACKAGE_DIR = join(EDITOR_DIR, 'node_modules', 'blockly');

/**
 * Blockly itself. The editor imports the ES modules and copies the namespace onto `window.Blockly`
 * (see `blockly-plugins/bridge.ts`); jsdom gets the UMD builds of the very same package, whose
 * script-tag branch performs exactly that assignment. Same code, same version, same global.
 */
const CORE_FILES = [
    join(PACKAGE_DIR, 'blockly_compressed.js'),
    join(PACKAGE_DIR, 'msg', 'en.js'),
    join(PACKAGE_DIR, 'blocks_compressed.js'),
    join(PACKAGE_DIR, 'javascript_compressed.js'),
];

/** Where the converted block modules live */
const MODULES_DIR = join(EDITOR_DIR, 'src', 'Components', 'blockly-plugins', 'blocks');

/**
 * The ioBroker block definitions and their order - the same file `bridge.ts` reads, so the harness
 * can never run them in a different order than the editor does.
 */
const BLOCK_ORDER = require(join(MODULES_DIR, 'order.json'));

/**
 * Every `blockly*` import is redirected to the instance already living on `window` - see the shims
 * for why. `alias` and not a plugin, because esbuild's synchronous API takes no plugins.
 */
const BLOCKLY_ALIAS = {
    blockly: join(__dirname, 'shims', 'blockly-core.js'),
    'blockly/core': join(__dirname, 'shims', 'blockly-core.js'),
    'blockly/blocks': join(__dirname, 'shims', 'blockly-core.js'),
    'blockly/javascript': join(__dirname, 'shims', 'blockly-javascript.js'),
};

/**
 * A converted module is TypeScript and imports Blockly as an ES module, so it cannot simply be
 * dropped into jsdom. esbuild bundles it into an IIFE that exposes its `install()`, which is the
 * same thing the editor's bundler does before `loadOwnBlocks()` calls it.
 *
 * @param {string} id
 * @returns {string} bundled code, assigning `install` to `window.__install`
 */
function bundleModule(id) {
    if (!existsSync(join(MODULES_DIR, `${id}.ts`))) {
        throw new Error(
            `"${id}" is marked as "module" in order.json, but ${id}.ts does not exist. Either convert the file or set it back to "legacy".`,
        );
    }

    const result = buildSync({
        stdin: {
            contents: `import { install } from './${id}';\nwindow.__install = install;\n`,
            resolveDir: MODULES_DIR,
            sourcefile: `${id}-entry.js`,
        },
        bundle: true,
        format: 'iife',
        platform: 'browser',
        write: false,
        logLevel: 'silent',
        alias: BLOCKLY_ALIAS,
        absWorkingDir: EDITOR_DIR,
    });

    return result.outputFiles[0].text;
}

/**
 * Creates a browser-like window with Blockly and all ioBroker blocks loaded.
 *
 * @returns {{
 *   Blockly: any,
 *   window: any,
 *   origins: Record<string, string>,
 *   coreKeys: string[],
 *   generate: (xml: string) => { code: string, warnings: string[] },
 * }}
 */
function createBlocklyEnvironment() {
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
        // The block definitions are classic scripts declaring `var Blockly`. They only reach the
        // global scope through real script elements - `window.eval()` would shadow it locally.
        runScripts: 'dangerously',
        pretendToBeVisual: true,
        // field_oid.js reads localStorage, which throws on jsdom's default opaque origin
        url: 'http://localhost/',
    });
    const window = dom.window;

    let warnings = [];
    const realConsole = window.console;
    window.console = Object.assign(Object.create(realConsole), {
        warn: (...args) => warnings.push(args.join(' ')),
        error: (...args) => warnings.push(args.join(' ')),
    });

    // Globals the editor provides at runtime and the blocks rely on
    window.systemLang = 'en';
    window.MSG = new Proxy({}, { get: (_target, key) => String(key) });
    // field_oid.js resolves state names and icons through the editor's object cache
    window.main = { objects: {}, getObject: (_id, cb) => cb && cb(null, null) };

    const runFile = file => {
        const script = window.document.createElement('script');
        script.textContent = readFileSync(file, 'utf8');
        window.document.head.appendChild(script);
    };

    // `bridge.ts` provides this for block files written against the old Closure build
    window.goog = { provide: () => {}, require: () => {} };

    CORE_FILES.forEach(runFile);

    // Remember which file defines which block, so the golden files can be grouped the same way
    // the sources are - a converted `blocks_action.js` then only ever touches `golden/action.txt`.
    const origins = {};
    const seen = new Set(Object.keys(window.Blockly.Blocks));
    seen.forEach(type => (origins[type] = 'core'));

    // What Blockly itself puts on the global, before any ioBroker file adds to it. This is the
    // surface `bridge.ts` has to reproduce from the ES modules.
    const coreKeys = Object.keys(window.Blockly);

    for (const entry of BLOCK_ORDER) {
        if (entry.source === 'module') {
            const script = window.document.createElement('script');
            script.textContent = bundleModule(entry.id);
            window.document.head.appendChild(script);
            window.__install();
        } else {
            runFile(join(BLOCKLY_DIR, 'own', `${entry.id}.js`));
        }

        const group = entry.id.replace(/^blocks_/, '');
        for (const type of Object.keys(window.Blockly.Blocks)) {
            if (!seen.has(type)) {
                seen.add(type);
                origins[type] = group;
            }
        }
    }

    if (!window.Blockly || !window.Blockly.JavaScript) {
        throw new Error('Blockly did not load - check the file list in test/blockly/env.js');
    }

    // Mirror of the registry migration in `blockly-plugins/index.ts` (initBlockly). Most ioBroker
    // blocks still register as `Blockly.JavaScript.<type>`, and without this step the generator
    // does not find them at all.
    const generator = window.Blockly.JavaScript;
    if (generator.forBlock) {
        for (const key of Object.keys(generator)) {
            if (typeof generator[key] === 'function' && !generator.forBlock[key]) {
                generator.forBlock[key] = generator[key];
                delete generator[key];
            }
        }
    }

    // Some blocks permanently rewrite global messages while generating - blocks_system.js and
    // blocks_trigger.js for instance set `Blockly.Msg.VARIABLES_DEFAULT_NAME = 'value'`. Without
    // restoring them, a block's output would depend on which blocks ran before it, and the
    // snapshots would encode the corpus order instead of the block's own behaviour.
    const pristineMsg = Object.assign({}, window.Blockly.Msg);

    /**
     * Turns workspace XML into generated JavaScript, exactly as the editor does it.
     *
     * @param {string} xml A complete `<xml>...</xml>` document
     */
    const generate = xml => {
        warnings = [];
        Object.assign(window.Blockly.Msg, pristineMsg);
        const workspace = new window.Blockly.Workspace();
        // blocks_timeout.js and blocks_trigger.js build their dropdowns from the workspace the
        // editor publishes globally
        window.scripts = { blocklyWorkspace: workspace };
        try {
            window.Blockly.Xml.domToWorkspace(window.Blockly.utils.xml.textToDom(xml), workspace);
            const code = window.Blockly.JavaScript.workspaceToCode(workspace);
            return { code, warnings: warnings.slice() };
        } finally {
            workspace.dispose();
        }
    };

    return { Blockly: window.Blockly, window, origins, coreKeys, generate };
}

module.exports = { createBlocklyEnvironment, BLOCKLY_DIR, MODULES_DIR, CORE_FILES, BLOCK_ORDER };
