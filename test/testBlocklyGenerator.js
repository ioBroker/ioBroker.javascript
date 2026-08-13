/**
 * Regression net for the Blockly code generation.
 *
 * Every registered block is turned into JavaScript and compared against a committed snapshot. The
 * point is not to assert that the generated code is *good* - it is to notice when it *changes*.
 * That is what makes the migration to blockly@13 / TypeScript verifiable: each step must leave
 * these files untouched, and any diff is the precise list of blocks whose output moved.
 *
 * Regenerate deliberately with `npm run test:blockly:update` and review the diff.
 */
const assert = require('node:assert').strict;
const { join } = require('node:path');
const { existsSync, readdirSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const { createBlocklyEnvironment, BLOCKLY_DIR, MODULES_DIR, BLOCK_ORDER } = require('./blockly/env');
const { buildSnapshots, readSnapshots } = require('./blockly/snapshot');

/**
 * One snapshot per block source file, plus the hand-written fixtures. Listed explicitly so that a
 * new source file has to be added here consciously - the "covers every group" test enforces it.
 */
const EXPECTED_GROUPS = [
    'action',
    'convert',
    'core',
    'fixtures',
    'logic',
    'number',
    'object',
    'procedures',
    'sendto',
    'switch',
    'system',
    'text',
    'time',
    'timeout',
    'trigger',
    'unknown',
];

describe('Blockly code generation', function () {
    // Loading Blockly plus ~9900 lines of block definitions into jsdom is not instant
    this.timeout(120000);

    let env;
    let generated;
    let stored;

    before(() => {
        env = createBlocklyEnvironment();
        generated = buildSnapshots(env);
        stored = readSnapshots();
    });

    it('loads Blockly and all ioBroker blocks', () => {
        assert.ok(env.Blockly.VERSION, 'Blockly did not expose a version');
        assert.ok(
            Object.keys(env.Blockly.Blocks).length > 150,
            `only ${Object.keys(env.Blockly.Blocks).length} blocks registered`,
        );
        assert.deepEqual(
            // Array.from: the value comes from the jsdom realm, so its prototype is not our Array
            Array.from(env.Blockly.CustomBlocks),
            ['System', 'Action', 'Sendto', 'Time', 'Convert', 'Trigger', 'Timeouts', 'Object'],
            'the ioBroker toolbox categories changed',
        );
    });

    it('has every block source where order.json says it is', () => {
        // A file converted to TypeScript must be removed from public/ and flipped to "module" in
        // the same step. Getting that half right would silently drop or double-register its blocks.
        const problems = [];
        for (const entry of BLOCK_ORDER) {
            const legacy = join(BLOCKLY_DIR, 'own', `${entry.id}.js`);
            const converted = join(MODULES_DIR, `${entry.id}.ts`);
            const expected = entry.source === 'module' ? converted : legacy;
            const forbidden = entry.source === 'module' ? legacy : converted;

            if (!existsSync(expected)) {
                problems.push(`${entry.id}: marked "${entry.source}" but ${expected} is missing`);
            }
            if (existsSync(forbidden)) {
                problems.push(`${entry.id}: marked "${entry.source}" but ${forbidden} still exists`);
            }
        }

        const listed = new Set(BLOCK_ORDER.map(entry => entry.id));
        for (const file of readdirSync(join(BLOCKLY_DIR, 'own')).filter(name => name.endsWith('.js'))) {
            if (!listed.has(file.replace(/\.js$/, ''))) {
                problems.push(`${file} is not listed in order.json and would never be loaded`);
            }
        }

        assert.deepEqual(problems, []);
    });

    it('still offers the API the editor uses', () => {
        // The snapshots only cover code generation. These are the entry points `BlocklyEditor.tsx`
        // and `blockly-plugins/index.ts` call at runtime - a Blockly upgrade that drops one of them
        // would break the editor without moving a single snapshot.
        const required = [
            'INPUT_VALUE',
            'OUTPUT_VALUE',
            'Events.CREATE',
            'Events.UI',
            'Events.VIEWPORT_CHANGE',
            'Themes.Classic',
            'Xml.appendDomToWorkspace',
            'Xml.blockToDom',
            'Xml.deleteNext',
            'Xml.domToPrettyText',
            'Xml.domToText',
            'Xml.domToWorkspace',
            'Xml.workspaceToDom',
            'utils.xml.textToDom',
            'dialog.setPrompt',
            'getSelected',
            'inject',
            'svgResize',
            'thrasos',
            'common.createBlockDefinitionsFromJsonArray',
            'fieldRegistry.register',
            'serialization',
            'JavaScript.workspaceToCode',
            'JavaScript.forBlock',
            // added by the ioBroker blocks, not by Blockly
            'Procedures.flyoutCategoryNew',
            'FieldOID',
            'FieldCRON',
            'FieldScript',
        ];

        const missing = required.filter(
            path => path.split('.').reduce((obj, key) => (obj == null ? obj : obj[key]), env.Blockly) === undefined,
        );
        assert.deepEqual(missing, [], 'the editor uses these, but Blockly no longer provides them');
    });

    it('builds the same global from the ES modules as from the UMD build', async () => {
        // The editor imports the ES modules and copies the namespace onto `window.Blockly`
        // (blockly-plugins/bridge.ts), while this harness loads the UMD build into jsdom. If the
        // two ever produced a different surface, every test above would still pass while the real
        // editor broke - so compare them directly.
        const packageDir = pathToFileURL(join(__dirname, '..', 'src-editor', 'node_modules', 'blockly')).href;
        const core = await import(`${packageDir}/blockly.mjs`);
        const { javascriptGenerator } = await import(`${packageDir}/javascript.mjs`);

        assert.equal(
            Object.isExtensible(core),
            false,
            'the module namespace became extensible - bridge.ts could then assign directly instead of copying',
        );

        const fromModules = { ...core, JavaScript: javascriptGenerator };

        const missing = env.coreKeys.filter(
            key =>
                !(key in fromModules) &&
                // internal to the UMD wrapper, and the block library, which nothing reads off the
                // global - in ESM it is imported for its side effect instead
                !['__namespace__', 'libraryBlocks'].includes(key),
        );
        assert.deepEqual(missing, [], 'the UMD global has members the ES module copy does not');
    });

    it('generates code for every block without errors', () => {
        assert.deepEqual(generated.failures, [], 'blocks failed to generate');
    });

    it('has golden files committed', () => {
        assert.ok(
            Object.keys(stored).length > 0,
            'no golden files found - run "npm run test:blockly:update" once and commit test/blockly/golden/',
        );
    });

    it('produces the same code twice', () => {
        // Catches generator state leaking between workspaces, which would make the snapshots
        // depend on the order the blocks happen to be generated in.
        const second = buildSnapshots(env);
        assert.deepEqual(second.snapshots, generated.snapshots, 'generating twice gave different results');
    });

    it('covers every group', () => {
        assert.deepEqual(
            Object.keys(generated.snapshots).sort(),
            Object.keys(stored).sort(),
            'a block source file was added or removed - run "npm run test:blockly:update"',
        );
        assert.deepEqual(
            Object.keys(generated.snapshots).sort(),
            EXPECTED_GROUPS.slice().sort(),
            'a group is not listed in EXPECTED_GROUPS, so its snapshot would never be compared',
        );
    });

    describe('matches the committed snapshot', () => {
        // One test per source file, so a failure names the file that has to be looked at
        for (const group of EXPECTED_GROUPS) {
            it(group, () => {
                assert.equal(
                    generated.snapshots[group],
                    stored[group],
                    `generated code for "${group}" changed - review the diff and run "npm run test:blockly:update" if intended`,
                );
            });
        }
    });
});
