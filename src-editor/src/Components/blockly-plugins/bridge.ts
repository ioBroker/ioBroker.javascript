/**
 * Publishes Blockly on `window`.
 *
 * Blockly used to arrive through `<script>` tags in index.html, which is what created the global
 * `Blockly` object. It now comes from the npm package as ES modules, so the global has to be
 * created here instead - it is a public plugin API: the ioBroker block definitions in
 * `public/google-blockly/own` and the `admin/blockly.js` file of every adapter with
 * `common.blockly: true` register themselves on it.
 *
 * This is not a workaround. The UMD build of Blockly does the very same thing in its script-tag
 * branch:
 *
 *     root.Blockly = factory();
 *     root.Blockly.JavaScript = root.javascript.javascriptGenerator;
 *
 * Importing this module installs the global, so it must be imported before anything that touches
 * `window.Blockly`.
 */
import * as BlocklyCore from 'blockly/core';
import 'blockly/blocks';
import { javascriptGenerator } from 'blockly/javascript';
import * as EnglishMessages from 'blockly/msg/en';

import type { BlocklyType } from './index';

import blockOrder from './blocks/order.json';

/**
 * The converted block modules. A bundler cannot resolve a dynamic import path, so the importers
 * have to be listed statically; `order.json` decides *when* each one runs.
 */
const BLOCK_MODULES: Record<string, () => Promise<{ install: () => void }>> = {
    blocks_action: () => import('./blocks/blocks_action'),
    blocks_convert: () => import('./blocks/blocks_convert'),
    blocks_words: () => import('./blocks/blocks_words'),
    blocks_logic: () => import('./blocks/blocks_logic'),
    blocks_number: () => import('./blocks/blocks_number'),
    blocks_procedures: () => import('./blocks/blocks_procedures'),
    blocks_sendto: () => import('./blocks/blocks_sendto'),
    blocks_system: () => import('./blocks/blocks_system'),
    field_cron: () => import('./blocks/field_cron'),
    field_oid: () => import('./blocks/field_oid'),
    field_script: () => import('./blocks/field_script'),
    blocks_object: () => import('./blocks/blocks_object'),
    blocks_switch: () => import('./blocks/blocks_switch'),
    blocks_text: () => import('./blocks/blocks_text'),
    blocks_time: () => import('./blocks/blocks_time'),
    blocks_trigger: () => import('./blocks/blocks_trigger'),
    blocks_timeout: () => import('./blocks/blocks_timeout'),
};

/**
 * A module namespace object is not extensible, so `Blockly.JavaScript` cannot be added to it.
 * The global is a copy instead - every property is the same object, so the block definitions still
 * write into the registries the modules read from.
 */
const Blockly = { ...BlocklyCore, JavaScript: javascriptGenerator } as unknown as BlocklyType;

BlocklyCore.setLocale(EnglishMessages as unknown as Record<string, string>);

window.Blockly = Blockly;

// Block files written for the old Closure build call these before anything else. The ioBroker files
// guard the call, but not every adapter does.
window.goog ||= { provide: () => {}, require: () => {} };

function loadScript(src: string): Promise<void> {
    return new Promise(resolve => {
        const script = window.document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => {
            console.error(`Cannot load ${src}`);
            resolve();
        };
        window.document.head.appendChild(script);
    });
}

let ownBlocks: Promise<void> | null = null;

/**
 * Runs the ioBroker block definitions in the order of `order.json`.
 *
 * The order matters: `blocks_words.js` installs the translation helper every other file uses, the
 * field definitions must exist before the blocks that place them, and `blocks_procedures.js`
 * extends the standard procedure blocks.
 *
 * Converted modules and legacy files run through the same sequence, so a file can be converted at
 * any position without disturbing the ones around it. The legacy files are classic scripts writing
 * onto the global, which is why they can only run after this module installed it.
 *
 * Safe to call more than once; everything runs exactly once.
 */
export function loadOwnBlocks(): Promise<void> {
    ownBlocks ||= (async () => {
        for (const entry of blockOrder) {
            if (entry.source === 'module') {
                const importer = BLOCK_MODULES[entry.id];
                if (!importer) {
                    console.error(`No module registered for "${entry.id}" - check BLOCK_MODULES in bridge.ts`);
                    continue;
                }
                (await importer()).install();
            } else {
                await loadScript(`google-blockly/own/${entry.id}.js`);
            }
        }
    })();

    return ownBlocks;
}
