import { describe, expect, it } from 'vitest';

import { deviceOfState, findDevices, resolveDevice, stateFits, type ObjectMap } from '../devices';
import { buildRecipe, checkItems, inputName, recipeId, suggestItems, usedIds } from '../exportRecipe';
import { renderTemplate } from '../template';
import type { Recipe, RecipeDevice, StateInput } from '../types';

import lightOnMotion from './fixtures/light-on-motion.json';

const light = lightOnMotion as unknown as Recipe;

function channel(id: string, name: string): ioBroker.Object {
    return { _id: id, type: 'channel', common: { name }, native: {} } as ioBroker.Object;
}

function state(
    id: string,
    role: string,
    type: ioBroker.CommonType,
    write: boolean,
    name = id.split('.').pop()!,
): ioBroker.Object {
    return {
        _id: id,
        type: 'state',
        common: { name, role, type, read: true, write },
        native: {},
    } as ioBroker.Object;
}

/** A small installation: a lamp, two dimmers (one with its own switch), a motion sensor, a room */
function installation(): ObjectMap {
    const objects: ObjectMap = {};
    const add = (obj: ioBroker.Object): void => {
        objects[obj._id] = obj;
    };
    add(channel('hm.0.lamp', 'Ceiling lamp'));
    add(state('hm.0.lamp.STATE', 'switch.light', 'boolean', true));
    add(channel('zigbee.0.dimmer', 'Dimmer hall'));
    add(state('zigbee.0.dimmer.level', 'level.dimmer', 'number', true));
    add(channel('zigbee.0.dimmer2', 'Dimmer bath'));
    add(state('zigbee.0.dimmer2.level', 'level.dimmer', 'number', true));
    add(state('zigbee.0.dimmer2.on', 'switch.light', 'boolean', true));
    add(channel('hm.0.motion', 'Motion hall'));
    add(state('hm.0.motion.MOTION', 'sensor.motion', 'boolean', false));
    add(state('hm.0.motion.BRIGHTNESS', 'value.brightness', 'number', false));
    add(state('0_userdata.0.note', 'text', 'string', true, 'Note'));
    add({
        _id: 'enum.rooms.hall',
        type: 'enum',
        common: { name: { en: 'Hall', de: 'Flur' }, members: ['zigbee.0.dimmer', 'hm.0.motion'] },
        native: {},
    } as ioBroker.Object);
    return objects;
}

describe('recipes: devices by the type-detector', () => {
    it('finds the devices that fit, with their states and rooms', () => {
        const found = findDevices(installation(), light, 'light', 'de');
        expect(found.map(item => [item.room, item.device.id, item.device.type, item.device.states])).toEqual([
            ['Flur', 'zigbee.0.dimmer', 'dimmer', { SET: 'zigbee.0.dimmer.level' }],
            ['', 'hm.0.lamp', 'light', { SET: 'hm.0.lamp.STATE' }],
            ['', 'zigbee.0.dimmer2', 'dimmer', { SET: 'zigbee.0.dimmer2.level', ON_SET: 'zigbee.0.dimmer2.on' }],
        ]);
        expect(findDevices(installation(), light, 'motion', 'en').map(item => item.device.id)).toEqual(['hm.0.motion']);
    });

    it('detects a device again by its ID, as an update does', () => {
        const objects = installation();
        expect(resolveDevice(objects, light, 'light', 'hm.0.lamp', 'en')?.states).toEqual({ SET: 'hm.0.lamp.STATE' });
        // gone
        expect(resolveDevice(objects, light, 'light', 'hm.0.gone', 'en')).toBeNull();
        // no longer fits: the lamp lost its switch
        delete objects['hm.0.lamp.STATE'];
        expect(resolveDevice(objects, light, 'light', 'hm.0.lamp', 'en')).toBeNull();
        // a motion sensor is no light
        expect(resolveDevice(objects, light, 'light', 'hm.0.motion', 'en')).toBeNull();
    });

    it('checks role, type and write of a state input', () => {
        const input: StateInput = { type: 'state', role: 'value.brightness', commonType: 'number' };
        const objects = installation();
        expect(stateFits(input, objects['hm.0.motion.BRIGHTNESS'])).toBe(true);
        expect(stateFits({ ...input, role: 'value' }, objects['hm.0.motion.BRIGHTNESS'])).toBe(true);
        expect(stateFits({ ...input, role: 'value.bright' }, objects['hm.0.motion.BRIGHTNESS'])).toBe(false);
        expect(stateFits({ ...input, commonType: 'string' }, objects['hm.0.motion.BRIGHTNESS'])).toBe(false);
        expect(stateFits({ type: 'state', write: true }, objects['hm.0.motion.BRIGHTNESS'])).toBe(false);
        expect(stateFits({ type: 'state' }, objects['hm.0.motion'])).toBe(false);
    });
});

describe('recipes: export as recipe', () => {
    const xml =
        '<xml xmlns="https://developers.google.com/blockly/xml">' +
        '<block type="on" id="a" x="10" y="10"><field name="OID">hm.0.motion.MOTION</field><field name="CONDITION">ne</field>' +
        '<statement name="STATEMENT"><block type="control" id="b"><field name="OID">zigbee.0.dimmer2.on</field>' +
        '<next><block type="control" id="c"><field name="OID">zigbee.0.dimmer2.level</field>' +
        '<next><block type="debug" id="d"><field name="TEXT">hm.0.motion.BRIGHTNESS</field>' +
        '<next><block type="control" id="e"><field name="OID">0_userdata.0.note</field></block></next></block></next>' +
        '</block></next></block></statement></block></xml>';

    it('finds the states the script uses, and their devices', () => {
        const objects = installation();
        expect(usedIds(xml, objects)).toEqual([
            'hm.0.motion.MOTION',
            'zigbee.0.dimmer2.on',
            'zigbee.0.dimmer2.level',
            'hm.0.motion.BRIGHTNESS',
            '0_userdata.0.note',
        ]);
        expect(deviceOfState(objects, 'zigbee.0.dimmer2.level', 'en')).toMatchObject({
            device: { id: 'zigbee.0.dimmer2', type: 'dimmer' },
            state: 'SET',
        });
        const items = suggestItems(xml, objects, 'en');
        expect(items.map(item => [item.id, item.kind, item.input, item.device?.state])).toEqual([
            ['hm.0.motion.MOTION', 'device', 'motionHall', 'ACTUAL'],
            ['zigbee.0.dimmer2.on', 'device', 'dimmerBath', 'ON_SET'],
            ['zigbee.0.dimmer2.level', 'device', 'dimmerBath', 'SET'],
            // the type-detector knows the brightness of a motion sensor as its state SECOND
            ['hm.0.motion.BRIGHTNESS', 'device', 'motionHall', 'SECOND'],
            // in no device
            ['0_userdata.0.note', 'state', 'note', undefined],
        ]);
    });

    it('builds a recipe that gives the script back when filled in with the same devices', () => {
        const objects = installation();
        const items = suggestItems(xml, objects, 'en');
        expect(checkItems(items)).toEqual([]);
        const recipe = buildRecipe(xml, items, {
            id: recipeId('Bath light'),
            title: { en: 'Bath light', de: 'Badlicht' },
            description: { en: 'x', de: 'y' },
            author: 'someone',
            minJavascript: '10.6.0',
        });
        expect(recipe.id).toBe('bath-light');
        expect(Object.keys(recipe.inputs)).toEqual(['motionHall', 'dimmerBath', 'note']);
        expect(recipe.inputs.dimmerBath).toMatchObject({ type: 'device', deviceType: 'dimmer' });
        expect(recipe.inputs.note).toMatchObject({ type: 'state', role: 'text', commonType: 'string' });
        expect(recipe.blockly).toContain('<field name="OID">{{dimmerBath.ON_SET}}</field>');
        expect(recipe.blockly).toContain('<field name="TEXT">{{motionHall.SECOND}}</field>');
        expect(recipe.blockly).toContain('<field name="OID">{{note}}</field>');

        const values: Record<string, RecipeDevice | string> = {
            motionHall: resolveDevice(objects, recipe, 'motionHall', 'hm.0.motion', 'en')!,
            dimmerBath: resolveDevice(objects, recipe, 'dimmerBath', 'zigbee.0.dimmer2', 'en')!,
            note: '0_userdata.0.note',
        };
        expect(renderTemplate(recipe.blockly, recipe.inputs, values)).toBe(xml);
    });

    it('leaves an ID alone that is not chosen, and wants clean input names', () => {
        const objects = installation();
        const items = suggestItems(xml, objects, 'en').map(item => ({
            ...item,
            use: item.id !== 'hm.0.motion.BRIGHTNESS',
        }));
        const recipe = buildRecipe(xml, items, {
            id: 'x',
            title: { en: 'x', de: 'x' },
            description: { en: 'x', de: 'x' },
            author: 'a',
            minJavascript: '10.6.0',
        });
        expect(recipe.blockly).toContain('<field name="TEXT">hm.0.motion.BRIGHTNESS</field>');
        expect(checkItems([{ ...items[0], input: '1x' }])[0]).toMatch(/not starting with a digit/);
        expect(checkItems([items[0], { ...items[1], input: items[0].input }])[0]).toMatch(/different devices/);
        expect(inputName('Lampe Küche groß', [])).toBe('lampeKucheGross');
        expect(inputName('Lamp', ['lamp'])).toBe('lamp2');
        expect(inputName('42', [])).toBe('input42');
    });
});
