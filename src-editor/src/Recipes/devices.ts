/**
 * Finding the devices that fit an input of a recipe, with @iobroker/type-detector.
 */
import type { DetectOptions, PatternControl, Types } from '@iobroker/type-detector';
// not the default export: the package is CommonJS and Vite imports its default as the whole `module.exports`
import { ChannelDetector } from '@iobroker/type-detector/build/ChannelDetector';
import type { AdminConnection } from '@iobroker/gui-components';

import { deviceTypesOf } from './analyze';
import { deviceFits } from './logic';
import type { DeviceInput, Recipe, RecipeDevice, StateInput } from './types';

export type ObjectMap = Record<string, ioBroker.Object>;

/** A device that fits an input */
export interface FoundDevice {
    device: RecipeDevice;
    /** The name of its room, or '' */
    room: string;
}

/** All objects the type-detector looks at, and the enums for the rooms */
export async function loadObjects(socket: AdminConnection): Promise<ObjectMap> {
    const [states, channels, devices, folders, enums] = await Promise.all([
        socket.getObjectViewSystem('state', '', '香'),
        socket.getObjectViewSystem('channel', '', '香'),
        socket.getObjectViewSystem('device', '', '香'),
        socket.getObjectViewSystem('folder', '', '香'),
        socket.getObjectViewSystem('enum', '', '香'),
    ]);
    return Object.assign({}, states, channels, devices, folders, enums) as ObjectMap;
}

function parentOf(id: string): string {
    const pos = id.lastIndexOf('.');
    return pos > 0 ? id.slice(0, pos) : '';
}

/**
 * The IDs to ask the type-detector about: channels first, as most devices are one, then devices and
 * folders, then single states that are in none of them.
 */
function candidates(objects: ObjectMap, keys: string[]): string[] {
    const byType: Record<string, string[]> = { channel: [], device: [], folder: [], state: [] };
    const withStates = new Set<string>();
    for (const id of keys) {
        if (objects[id]?.type === 'state') {
            withStates.add(parentOf(id));
        }
    }
    for (const id of keys) {
        const type = objects[id]?.type;
        if (type === 'channel' || type === 'device' || type === 'folder') {
            if (withStates.has(id)) {
                byType[type].push(id);
            }
        } else if (type === 'state') {
            const parentType = objects[parentOf(id)]?.type;
            if (parentType !== 'channel' && parentType !== 'device') {
                byType.state.push(id);
            }
        }
    }
    return [...byType.channel, ...byType.device, ...byType.folder, ...byType.state];
}

function nameOf(objects: ObjectMap, id: string, lang: ioBroker.Languages): string {
    const name = objects[id]?.common?.name as ioBroker.StringOrTranslated | undefined;
    const text = name && typeof name === 'object' ? name[lang] || name.en : name;
    return (text || id.split('.').pop() || id).toString();
}

/** Room enum ID to its name, and member ID to the room */
function roomsOf(objects: ObjectMap, keys: string[], lang: ioBroker.Languages): Map<string, string> {
    const rooms = new Map<string, string>();
    for (const id of keys) {
        if (id.startsWith('enum.rooms.') && objects[id]?.type === 'enum') {
            const room = nameOf(objects, id, lang);
            for (const member of (objects[id].common as ioBroker.EnumCommon).members || []) {
                rooms.set(member, room);
            }
        }
    }
    return rooms;
}

/** The room of a device: of itself, one of its parents, or one of its states */
function roomOf(rooms: Map<string, string>, device: RecipeDevice): string {
    for (let id = device.id; id; id = parentOf(id)) {
        const room = rooms.get(id);
        if (room) {
            return room;
        }
    }
    for (const id of Object.values(device.states)) {
        const room = rooms.get(id);
        if (room) {
            return room;
        }
    }
    return '';
}

function toDevice(objects: ObjectMap, id: string, control: PatternControl, lang: ioBroker.Languages): RecipeDevice {
    const states: Record<string, string> = {};
    for (const state of control.states) {
        if (state.id) {
            states[state.name] = state.id;
        }
    }
    return { id, name: nameOf(objects, id, lang), type: control.type, states };
}

function detectOptions(objects: ObjectMap, keys: string[], input: DeviceInput): DetectOptions {
    return {
        id: '',
        objects,
        _keysOptional: keys,
        _keysOptionalSorted: true,
        _usedIdsOptional: [],
        ignoreIndicators: ['UNREACH_STICKY'],
        allowedTypes: deviceTypesOf(input) as Types[],
    };
}

/** All devices that fit a device input, sorted by room and name */
export function findDevices(
    objects: ObjectMap,
    recipe: Recipe,
    inputName: string,
    lang: ioBroker.Languages,
): FoundDevice[] {
    const input = recipe.inputs[inputName] as DeviceInput;
    const keys = Object.keys(objects).sort();
    const rooms = roomsOf(objects, keys, lang);
    const detector = new ChannelDetector();
    const options = detectOptions(objects, keys, input);
    const found: FoundDevice[] = [];
    const seen = new Set<string>();

    for (const id of candidates(objects, keys)) {
        options.id = id;
        let controls: PatternControl[] | null = null;
        try {
            controls = detector.detect(options);
        } catch (error) {
            console.warn(`Cannot detect ${id}: ${error as Error}`);
        }
        for (const control of controls || []) {
            const device = toDevice(objects, id, control, lang);
            const key = `${device.type}:${Object.values(device.states).sort().join(',')}`;
            if (seen.has(key) || !deviceFits(recipe, inputName, device)) {
                continue;
            }
            seen.add(key);
            found.push({ device, room: roomOf(rooms, device) });
        }
    }
    return found.sort(
        (a, b) =>
            (a.room || '￿').localeCompare(b.room || '￿') ||
            a.device.name.localeCompare(b.device.name) ||
            a.device.id.localeCompare(b.device.id),
    );
}

/**
 * Detects a device again by its ID, as common.recipe stores only that. `null` if it does not exist any
 * more or does not fit the input.
 */
export function resolveDevice(
    objects: ObjectMap,
    recipe: Recipe,
    inputName: string,
    id: string,
    lang: ioBroker.Languages,
): RecipeDevice | null {
    if (!objects[id]) {
        return null;
    }
    const input = recipe.inputs[inputName] as DeviceInput;
    const keys = Object.keys(objects).sort();
    const options = detectOptions(objects, keys, input);
    options.id = id;
    let controls: PatternControl[] | null = null;
    try {
        controls = new ChannelDetector().detect(options);
    } catch (error) {
        console.warn(`Cannot detect ${id}: ${error as Error}`);
    }
    for (const control of controls || []) {
        const device = toDevice(objects, id, control, lang);
        if (deviceFits(recipe, inputName, device)) {
            return device;
        }
    }
    return null;
}

/**
 * The device a state belongs to, for "Export as recipe": the type-detector is asked about the channel
 * (or device, folder) of the state, and then about the state alone.
 */
export function deviceOfState(
    objects: ObjectMap,
    stateId: string,
    lang: ioBroker.Languages,
): {
    device: RecipeDevice;
    /** The name of the state in the device, like SET */
    state: string;
} | null {
    const keys = Object.keys(objects).sort();
    const detector = new ChannelDetector();
    for (const id of [parentOf(stateId), stateId]) {
        if (!id || !objects[id]) {
            continue;
        }
        let controls: PatternControl[] | null = null;
        try {
            controls = detector.detect({
                id,
                objects,
                _keysOptional: keys,
                _keysOptionalSorted: true,
                _usedIdsOptional: [],
                ignoreIndicators: ['UNREACH_STICKY'],
                // any state is "info" for the type-detector: no device to offer
                excludedTypes: ['info' as Types],
            });
        } catch {
            controls = null;
        }
        for (const control of controls || []) {
            const state = control.states.find(item => item.id === stateId);
            if (state) {
                return { device: toDevice(objects, id, control, lang), state: state.name };
            }
        }
    }
    return null;
}

/** Does a state fit a state input: its role, its type and, if wanted, writable? */
export function stateFits(input: StateInput, obj: ioBroker.Object | null | undefined): boolean {
    if (obj?.type !== 'state') {
        return false;
    }
    const common = obj.common as ioBroker.StateCommon;
    if (input.role && common.role !== input.role && !(common.role || '').startsWith(`${input.role}.`)) {
        return false;
    }
    if (input.commonType && common.type !== input.commonType) {
        return false;
    }
    return !(input.write && common.write === false);
}
