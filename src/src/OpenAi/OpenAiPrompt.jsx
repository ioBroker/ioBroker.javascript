import ChannelDetector from '@iobroker/type-detector';
import { I18n } from '@iobroker/adapter-react-v5';
import docs from './docs.md';

let allObjectsCache = null;

const allObjects = async socket => {
    if (allObjectsCache) {
        return allObjectsCache;
    }
    const states = await socket.getObjectView('', '\u9999', 'state');
    const channels = await socket.getObjectView('', '\u9999', 'channel');
    const devices = await socket.getObjectView('', '\u9999', 'device');
    const folders = await socket.getObjectView('', '\u9999', 'folder');
    const enums = await socket.getObjectView('', '\u9999', 'enum');

    allObjectsCache = Object.values(states)
        .concat(Object.values(channels))
        .concat(Object.values(devices))
        .concat(Object.values(folders))
        .concat(Object.values(enums))
        // eslint-disable-next-line
        .reduce((obj, item) => ((obj[item._id] = item), obj), {});

    return allObjectsCache;
};

const getText = (text, lang) => {
    if (text && typeof text === 'object') {
        return text[lang] || text.en;
    }
    return text || '';
};

const detectDevices = async socket => {
    const lang = I18n.getLanguage();
    const devicesObject = await allObjects(socket);
    const keys = Object.keys(devicesObject).sort();
    const detector = new ChannelDetector();

    const usedIds = [];
    const ignoreIndicators = ['UNREACH_STICKY']; // Ignore indicators by name
    const excludedTypes = ['info'];
    const enums = [];
    const rooms = [];
    const funcs = [];
    const list = [];

    keys.forEach(id => {
        if (devicesObject[id]?.type === 'enum') {
            enums.push(id);
        } else if (devicesObject[id]?.common?.smartName) {
            list.push(id);
        }
    });

    enums.forEach(id => {
        if (id.startsWith('enum.rooms.')) {
            rooms.push(id);
        } else if (id.startsWith('enum.functions.')) {
            funcs.push(id);
        }
        const members = devicesObject[id].common.members;

        if (members && members.length) {
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

    const options = {
        objects: devicesObject,
        _keysOptional: keys,
        _usedIdsOptional: usedIds,
        ignoreIndicators,
        excludedTypes,
    };

    const result = [];

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

        const controls = detector.detect(options);

        if (controls) {
            controls.forEach(control => {
                const stateId = control.states.find(state => state.id).id;
                // if not yet added
                if (result.find(st => st.id === stateId)) {
                    return;
                }
                const deviceObject = {
                    id: stateId,
                    name: getText(devicesObject[stateId].common.name, lang),
                    role: devicesObject[stateId].type,
                    deviceType: control.type,
                    states: control.states
                        .filter(state => state.id)
                        .map(state => ({
                            id: state.id,
                            name: state.name,
                            role: state.defaultRole,
                            type: devicesObject[state.id].common.type,
                            unit: devicesObject[state.id].common.unit,
                            read:
                                devicesObject[state.id].common.read === undefined
                                    ? true
                                    : devicesObject[state.id].common.read,
                            write:
                                devicesObject[state.id].common.write === undefined
                                    ? true
                                    : devicesObject[state.id].common.write,
                        })),
                };

                const parts = stateId.split('.');
                let channelId;
                let deviceId;
                if (devicesObject[stateId].type === 'channel' || devicesObject[stateId].type === 'state') {
                    parts.pop();
                    channelId = parts.join('.');
                    if (
                        devicesObject[channelId] &&
                        (devicesObject[channelId].type === 'channel' || devicesObject[stateId].type === 'folder')
                    ) {
                        parts.pop();
                        deviceId = parts.join('.');
                        if (
                            !devicesObject[deviceId] ||
                            (devicesObject[deviceId].type !== 'device' && devicesObject[stateId].type !== 'folder')
                        ) {
                            deviceId = null;
                        }
                    } else {
                        channelId = null;
                    }
                }
                // try to detect room
                const room = rooms.find(roomId => {
                    if (devicesObject[roomId].common.members.includes(stateId)) {
                        return true;
                    }
                    if (channelId && devicesObject[roomId].common.members.includes(channelId)) {
                        return true;
                    }
                    return deviceId && devicesObject[roomId].common.members.includes(deviceId);
                });
                if (room) {
                    deviceObject.room = getText(devicesObject[room].common.name, lang);
                }

                // try to detect function
                const func = funcs.find(funcId => {
                    if (devicesObject[funcId].common.members.includes(stateId)) {
                        return true;
                    }
                    if (channelId && devicesObject[funcId].common.members.includes(channelId)) {
                        return true;
                    }
                    return deviceId && devicesObject[funcId].common.members.includes(deviceId);
                });
                if (func) {
                    deviceObject.function = getText(devicesObject[func].common.name, lang);
                }
                result.push(deviceObject);
            });
        }
    });

    // find names and icons for devices
    for (const k in result) {
        const deviceObj = result[k];
        if (deviceObj.type === 'state' || deviceObj.type === 'channel') {
            const idArray = deviceObj._id.split('.');
            idArray.pop();

            // read channel
            const parentObject = devicesObject[idArray.join('.')];
            if (
                parentObject &&
                (parentObject.type === 'channel' || parentObject.type === 'device' || parentObject.type === 'folder')
            ) {
                deviceObj.common.name = getText(parentObject.common?.name || deviceObj.common.name, lang);
                idArray.pop();
                // read device
                const grandParentObject = devicesObject[idArray.join('.')];
                if (grandParentObject?.type === 'device' && grandParentObject.common?.icon) {
                    deviceObj.common.name = getText(grandParentObject.common?.name || deviceObj.common.name, lang);
                }
            } else {
                deviceObj.common.name = getText(parentObject?.common?.name || deviceObj.common.name, lang);
            }
        }
    }

    return result;
};

const systemPrompt = async () => (await fetch(docs)).text();
export { systemPrompt, detectDevices };
