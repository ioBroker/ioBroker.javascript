import ChannelDetector, { type DetectOptions, Types, type PatternControl } from '@iobroker/type-detector';
import { type AdminConnection, I18n } from '@iobroker/adapter-react-v5';
// @ts-expect-error no types in Markdown
const docs = import(`./docs.md?raw`);

interface DeviceState {
    id: string;
    name: string;
    role?: string;
    type: ioBroker.CommonType;
    unit?: string;
    read: boolean;
    write: boolean;
}

export interface DeviceObject {
    id: string;
    name: string;
    type: ioBroker.ObjectType;
    room?: string;
    function?: string;
    deviceType: Types;
    states: DeviceState[];
}

let allObjectsCache: Record<
    string,
    ioBroker.DeviceObject | ioBroker.StateObject | ioBroker.ChannelObject | ioBroker.FolderObject | ioBroker.EnumObject
> | null = null;

async function allObjects(
    socket: AdminConnection,
): Promise<
    Record<
        string,
        | ioBroker.DeviceObject
        | ioBroker.StateObject
        | ioBroker.ChannelObject
        | ioBroker.FolderObject
        | ioBroker.EnumObject
    >
> {
    if (allObjectsCache) {
        return allObjectsCache;
    }
    const states = await socket.getObjectViewSystem('state', '', '\u9999');
    const channels = await socket.getObjectViewSystem('channel', '', '\u9999');
    const devices = await socket.getObjectViewSystem('device', '', '\u9999');
    const folders = await socket.getObjectViewSystem('folder', '', '\u9999');
    const enums = await socket.getObjectViewSystem('enum', '', '\u9999');

    allObjectsCache = Object.assign(states, channels, devices, folders, enums);

    return allObjectsCache as Record<
        string,
        | ioBroker.DeviceObject
        | ioBroker.StateObject
        | ioBroker.ChannelObject
        | ioBroker.FolderObject
        | ioBroker.EnumObject
    >;
}

function getText(text: ioBroker.StringOrTranslated, lang: ioBroker.Languages): string {
    if (text && typeof text === 'object') {
        return text[lang] || text.en;
    }
    return text || '';
}

async function detectDevices(socket: AdminConnection): Promise<DeviceObject[]> {
    const lang: ioBroker.Languages = I18n.getLanguage();
    const devicesObject: Record<
        string,
        | ioBroker.DeviceObject
        | ioBroker.StateObject
        | ioBroker.ChannelObject
        | ioBroker.FolderObject
        | ioBroker.EnumObject
    > = await allObjects(socket);
    const keys: string[] = Object.keys(devicesObject).sort();
    const detector: ChannelDetector = new ChannelDetector();

    const usedIds: string[] = [];
    const ignoreIndicators: string[] = ['UNREACH_STICKY']; // Ignore indicators by name
    const excludedTypes: Types[] = [Types.info];
    const enums: string[] = [];
    const rooms: string[] = [];
    const funcs: string[] = [];
    const list: string[] = [];

    keys.forEach(id => {
        if (devicesObject[id]?.type === 'enum') {
            enums.push(id);
        } else if ((devicesObject[id]?.common as ioBroker.StateCommon)?.smartName) {
            list.push(id);
        }
    });

    enums.forEach(id => {
        if (id.startsWith('enum.rooms.')) {
            rooms.push(id);
        } else if (id.startsWith('enum.functions.')) {
            funcs.push(id);
        }
        const members: string[] | undefined = (devicesObject[id].common as ioBroker.EnumCommon).members;

        if (members?.length) {
            members.forEach(member => {
                // if an object really exists
                if (devicesObject[member]) {
                    if (!list.includes(member)) {
                        list.push(member);
                    }
                }
            });
        }
    });

    const options: DetectOptions = {
        id: '',
        objects: devicesObject,
        _keysOptional: keys,
        _usedIdsOptional: usedIds,
        ignoreIndicators,
        excludedTypes,
    };

    const result: DeviceObject[] = [];

    // we are creating a list of devices, where each device has a following structure:
    // {
    //     id: 'hm-rpc.0.KEQ0123456.1',
    //     name: 'HM-RC-4-2',
    //     role: 'light',
    //     room: 'Living room',
    //     'function': 'light'
    // }

    list.forEach(id => {
        options.id = id;

        const controls: PatternControl[] | null = detector.detect(options);

        if (controls) {
            controls.forEach(control => {
                const stateId = control.states.find(state => state.id)?.id;
                // if not yet added
                if (!stateId || result.find(st => st.id === stateId)) {
                    return;
                }

                const stateObj = devicesObject[stateId];

                const deviceObject: DeviceObject = {
                    id: stateId,
                    name: getText(stateObj.common.name, lang),
                    type: stateObj.type,
                    deviceType: control.type,
                    states: control.states
                        .filter(state => state.id)
                        .map(state => ({
                            id: state.id,
                            name: state.name,
                            role: state.defaultRole,
                            type: (devicesObject[state.id].common as ioBroker.StateCommon).type,
                            unit: (devicesObject[state.id].common as ioBroker.StateCommon).unit,
                            read:
                                (devicesObject[state.id].common as ioBroker.StateCommon).read === undefined
                                    ? true
                                    : (devicesObject[state.id].common as ioBroker.StateCommon).read,
                            write:
                                (devicesObject[state.id].common as ioBroker.StateCommon).write === undefined
                                    ? true
                                    : (devicesObject[state.id].common as ioBroker.StateCommon).write,
                        })),
                };

                const parts = stateId.split('.');
                let channelId: string | undefined;
                let deviceId: string | undefined;
                if (stateObj.type === 'channel' || stateObj.type === 'state') {
                    parts.pop();
                    channelId = parts.join('.');
                    if (
                        devicesObject[channelId] &&
                        (devicesObject[channelId].type === 'channel' || devicesObject[channelId].type === 'folder')
                    ) {
                        parts.pop();
                        deviceId = parts.join('.');
                        if (
                            !devicesObject[deviceId] ||
                            (devicesObject[deviceId].type !== 'device' && devicesObject[channelId].type !== 'folder')
                        ) {
                            deviceId = undefined;
                        }
                    } else {
                        channelId = undefined;
                    }
                }

                // try to detect room
                const room = rooms.find(roomId => {
                    if ((devicesObject[roomId] as ioBroker.EnumObject).common.members?.includes(stateId)) {
                        return true;
                    }
                    if (
                        channelId &&
                        (devicesObject[roomId] as ioBroker.EnumObject).common.members?.includes(channelId)
                    ) {
                        return true;
                    }
                    return (
                        deviceId && (devicesObject[roomId] as ioBroker.EnumObject).common.members?.includes(deviceId)
                    );
                });
                if (room) {
                    deviceObject.room = getText(devicesObject[room].common.name, lang);
                }

                // try to detect function
                const func = funcs.find(funcId => {
                    if ((devicesObject[funcId] as ioBroker.EnumObject).common.members?.includes(stateId)) {
                        return true;
                    }
                    if (
                        channelId &&
                        (devicesObject[funcId] as ioBroker.EnumObject).common.members?.includes(channelId)
                    ) {
                        return true;
                    }
                    return (
                        deviceId && (devicesObject[funcId] as ioBroker.EnumObject).common.members?.includes(deviceId)
                    );
                });
                if (func) {
                    deviceObject.function = getText(devicesObject[func].common.name, lang);
                }
                result.push(deviceObject);
            });
        }
    });

    // find names and icons for devices
    for (let k = 0; k < result.length; k++) {
        const deviceObj: DeviceObject = result[k];
        if (deviceObj.type === 'state' || deviceObj.type === 'channel') {
            const idArray = deviceObj.id.split('.');
            idArray.pop();

            // read channel
            const parentObject = devicesObject[idArray.join('.')];
            if (
                parentObject &&
                (parentObject.type === 'channel' || parentObject.type === 'device' || parentObject.type === 'folder')
            ) {
                deviceObj.name = getText(parentObject.common?.name || deviceObj.name, lang);
                idArray.pop();
                // read device
                const grandParentObject = devicesObject[idArray.join('.')];
                if (grandParentObject?.type === 'device' && grandParentObject.common?.icon) {
                    deviceObj.name = getText(grandParentObject.common?.name || deviceObj.name, lang);
                }
            } else {
                deviceObj.name = getText(parentObject?.common?.name || deviceObj.name, lang);
            }
        }
    }

    return result;
}

const systemPrompt: () => Promise<string> = async (): Promise<string> => (await docs).default;
export { systemPrompt, detectDevices };
