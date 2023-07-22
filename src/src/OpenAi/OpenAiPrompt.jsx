import { ChannelDetector } from 'iobroker.type-detector';
import docs from './docs.md';

const allObjects = async socket => {
    const states = await socket.getObjectView('', '\u9999', 'state');
    const channels = await socket.getObjectView('', '\u9999', 'channel');
    const devices = await socket.getObjectView('', '\u9999', 'device');
    const enums = await socket.getObjectView('', '\u9999', 'enum');

    return Object.values(states)
        .concat(Object.values(channels))
        .concat(Object.values(devices))
        .concat(Object.values(enums))
        // eslint-disable-next-line
        .reduce((obj, item) => (obj[item._id] = item, obj), {});
};

const detectDevice = async socket => {
    const devicesObject = await allObjects(socket);
    const keys = Object.keys(devicesObject).sort();
    const detector = new ChannelDetector();

    const usedIds = [];
    const ignoreIndicators = ['UNREACH_STICKY'];    // Ignore indicators by name
    const excludedTypes = ['info'];
    const enums = [];
    const rooms = [];
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
        }
        const members = devicesObject[id].common.members;
        // console.log(id);
        if (members && members.length) {
            members.forEach(member => {
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
    // console.log(rooms);
    rooms.forEach(roomId => {
        const room = devicesObject[roomId];
        const roomObject = {
            id: roomId,
            name: room.common.name,
            devices: [],
        };
        // console.log(room.common.members);
        room.common.members.forEach(member => {
            let deviceObject = {
                id: devicesObject[member]._id,
                name: devicesObject[member].common.name,
            };
            options.id = member;
            const controls = detector.detect(options);
            // console.log(controls);
            if (controls) {
                controls.forEach(control => {
                    if (!deviceObject.deviceType) {
                        // deviceObject.deviceType = control.type;
                    }
                    deviceObject = {...deviceObject, ...control};
                    // if (control.states) {
                    //     control.states.forEach(state => {
                    //         if (state.id) {
                    //             // console.log(state);
                    //             deviceObject.states.push(state);
                    //         }
                    //     });
                    // }
                });
            }
            roomObject.devices.push(deviceObject);
        });
        result.push(roomObject);
    });

    return result;
};

const systemPrompt = async () => {
    return (await fetch(docs)).text();
}
export {systemPrompt, detectDevice};