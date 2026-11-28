import { describe, expect, it } from 'vitest';

import { neededStates, usedInputs } from '../analyze';
import {
    blocklySource,
    compareVersions,
    defaultValues,
    deviceFits,
    hasLocalChanges,
    javascriptOf,
    missingInputs,
    newerRecipe,
    paramsOf,
    planUpdate,
    recipeScriptId,
    sampleValues,
    sourceHash,
} from '../logic';
import { sha256 } from '../sha256';
import { parseTemplate, renderTemplate } from '../template';
import type { Recipe, RecipeDevice } from '../types';

import lightOnMotion from './fixtures/light-on-motion.json';
import washingMachine from './fixtures/washing-machine-done.json';
import windowHeating from './fixtures/window-open-heating.json';

const recipes = [lightOnMotion, washingMachine, windowHeating] as unknown as Recipe[];
const light = lightOnMotion as unknown as Recipe;

describe('recipes: sha256', () => {
    it('gives the known hashes', () => {
        expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
        expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
        // two blocks
        expect(sha256('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
            '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
        );
        // UTF-8, and many blocks (values of node:crypto)
        expect(sha256('ä')).toBe('33e6d73fee82904c8d7afb78de1154d1e8dc2a0edb08120e63df5b9385c2d9cc');
        expect(sha256('x'.repeat(1000))).toBe('44f8354494a5ba03ba1792a8d3e9c534c47a9181980fde7a3f44b06ef2ae7c7f');
    });
});

describe('recipes: source and hash', () => {
    const js = "on({ id: 'a', change: 'ne' }, async (obj) => {\n  setState('b', true);\n});\n";
    const source = blocklySource(js, '<xml><block type="on" id="1" x="10" y="10"></block></xml>');

    it('stores the source as the Blockly editor does, and gets the JavaScript back', () => {
        expect(source.split('\n').pop()).toMatch(/^\/\/[A-Za-z0-9+/=]+$/);
        expect(javascriptOf(source)).toBe(js.trimEnd());
        expect(javascriptOf(js)).toBe(js.trimEnd());
    });

    it('sees no change when only the XML differs, e.g. after open and save', () => {
        const info = { id: 'x', version: '1.0.0', params: {}, hash: sourceHash(source) };
        const saved = blocklySource(js, '<xml><block type="on" id="other" x="300" y="40"></block></xml>');
        expect(hasLocalChanges(saved, info)).toBe(false);
        expect(hasLocalChanges(saved.replace(/\n/g, '\r\n'), info)).toBe(false);
        const changed = blocklySource(js.replace('true', 'false'), '<xml></xml>');
        expect(hasLocalChanges(changed, info)).toBe(true);
    });
});

describe('recipes: versions and updates', () => {
    it('compares versions', () => {
        expect(compareVersions('1.1.0', '1.0.0')).toBeGreaterThan(0);
        expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
        expect(compareVersions('1.0.10', '1.0.9')).toBeGreaterThan(0);
        expect(compareVersions('2.0.0-beta.1', '2.0.0')).toBeLessThan(0);
        expect(compareVersions('0.9.9', '1.0.0')).toBeLessThan(0);
    });

    it('finds the newer version of the recipe of a script', () => {
        const newer = { ...light, version: '1.1.0' };
        expect(newerRecipe({ id: light.id, version: '1.0.0', params: {}, hash: '' }, [newer])).toBe(newer);
        expect(newerRecipe({ id: light.id, version: '1.1.0', params: {}, hash: '' }, [newer])).toBeNull();
        expect(newerRecipe({ id: 'other', version: '1.0.0', params: {}, hash: '' }, [newer])).toBeNull();
        expect(newerRecipe(undefined, [newer])).toBeNull();
    });

    it('stores devices by their ID only', () => {
        const device: RecipeDevice = { id: 'hm.0.lamp', name: 'Lamp', type: 'light', states: { SET: 'hm.0.lamp.SET' } };
        const params = paramsOf(light, {
            motion: { ...device, id: 'hm.0.motion', type: 'motion' },
            light: [device],
            delay: 120,
            brightness: undefined,
            lux: 50,
            level: 100,
        });
        expect(params).toEqual({ motion: 'hm.0.motion', light: ['hm.0.lamp'], delay: 120, lux: 50, level: 100 });
    });

    it('plans an update: takes over what fits, asks for what is new or does not fit', () => {
        const v2: Recipe = {
            ...light,
            version: '1.1.0',
            inputs: {
                ...light.inputs,
                // new and needed
                night: { type: 'boolean' } as never,
                mode: { type: 'select', options: [{ value: 'a', title: 'A' }], title: 'Mode' },
                // new and optional
                extra: { type: 'state', optional: true, title: 'Extra' },
                // a number that is now limited
                lux: { type: 'number', min: 0, max: 40, default: 20 },
            },
        };
        delete (v2.inputs as Record<string, unknown>).level;
        const plan = planUpdate(
            v2,
            { motion: 'hm.0.motion', light: ['hm.0.l1', 'hm.0.l2'], delay: 90, lux: 50, level: 80 },
            'en',
        );
        expect(plan.devices).toEqual({ motion: 'hm.0.motion', light: ['hm.0.l1', 'hm.0.l2'] });
        expect(plan.values.delay).toBe(90);
        // a boolean has a default (false), a select its first option: nothing to ask there
        expect(plan.ask).toEqual(['lux']);
        expect(plan.dropped).toEqual(['level']);
    });

    it('asks for a new device input', () => {
        const v2: Recipe = {
            ...light,
            inputs: { ...light.inputs, siren: { type: 'device', deviceType: 'socket', title: 'Siren' } },
        };
        const plan = planUpdate(v2, { motion: 'm', light: [], delay: 1, lux: 1, level: 1 }, 'en');
        expect(plan.ask).toEqual(['siren']);
    });
});

describe('recipes: inputs', () => {
    it('knows the defaults in the language of the user', () => {
        const values = defaultValues(washingMachine as unknown as Recipe, 'de');
        expect(values.message).toBe('Die Waschmaschine ist fertig.');
        expect(values.threshold).toBe(5);
        expect(missingInputs(washingMachine as unknown as Recipe, values)).toEqual(['power']);
    });

    it('a list may stay empty, an optional input too', () => {
        const values = defaultValues(light, 'en');
        expect(missingInputs(light, values)).toEqual(['motion']);
    });

    it('makes the ID of the script in the folder Rezepte', () => {
        expect(recipeScriptId('Licht Flur.unten')).toBe('script.js.Rezepte.Licht_Flur_unten');
    });
});

describe('recipes: what the devices must have', () => {
    it('knows the states each device type needs', () => {
        expect(neededStates(parseTemplate(light.blockly), light.inputs)).toEqual({
            motion: { motion: ['ACTUAL'] },
            // ON_SET only inside {{#if light.ON_SET}}
            light: { light: ['SET'], dimmer: ['SET'] },
        });
        const heating = windowHeating as unknown as Recipe;
        expect(neededStates(parseTemplate(heating.blockly), heating.inputs)).toEqual({
            window: { window: ['ACTUAL'], windowTilt: ['ACTUAL'], door: ['ACTUAL'] },
            thermostat: { thermostat: ['SET'] },
        });
    });

    it('narrows by {{#if x.type == "..."}}', () => {
        const inputs = { d: { type: 'device', deviceType: ['light', 'dimmer'] } } as Recipe['inputs'];
        const ast = parseTemplate(
            '{{#if d.type == "dimmer"}}{{d.ACTUAL}}{{else}}{{d.SET}}{{/if}}{{#if d.type != "light"}}{{d.ON_SET}}{{/if}}',
        );
        expect(neededStates(ast, inputs)).toEqual({ d: { light: ['SET'], dimmer: ['ACTUAL', 'ON_SET'] } });
    });

    it('a device fits with the states of its type', () => {
        expect(deviceFits(light, 'light', { id: 'a', name: 'a', type: 'light', states: { SET: 'a.SET' } })).toBe(true);
        expect(deviceFits(light, 'light', { id: 'a', name: 'a', type: 'light', states: { ACTUAL: 'a.A' } })).toBe(
            false,
        );
        expect(deviceFits(light, 'light', { id: 'a', name: 'a', type: 'socket', states: { SET: 'a.SET' } })).toBe(
            false,
        );
    });

    it('every recipe of the catalog uses all its inputs and renders with sample values', () => {
        for (const recipe of recipes) {
            const used = usedInputs(parseTemplate(recipe.blockly));
            expect([...used].sort()).toEqual(Object.keys(recipe.inputs).sort());
            const xml = renderTemplate(recipe.blockly, recipe.inputs, sampleValues(recipe, 'en'));
            expect(xml).toMatch(/^<xml/);
            expect(xml).not.toContain('{{');
        }
    });
});
