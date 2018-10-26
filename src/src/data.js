
const data = {
    "script.js.common": {
        "common": {
            "name": "common"
        },
        "type": "channel",
        "from": "system.adapter.admin.0",
        "user": "system.user.admin",
        "ts": 1525434795115,
        "_id": "script.js.common",
        "acl": {
            "object": 1636,
            "owner": "system.user.admin",
            "ownerGroup": "system.group.administrator"
        }
    },
    "script.js.common.CreateStates": {
        "common": {
            "name": "CreateStates",
            "engineType": "Javascript/js",
            "source": "function createEnum(id, common) {\n    if (!getObject(id)) {\n        setObject({\n            type: 'enum',\n            _id: id,\n            common: common,\n            native: {}\n        });\n    }\n}\ncreateEnum('enum.rooms.living_room', {\n    name: {\n        en: 'Living room',\n        de: 'Wohnzimmer',\n    },\n    members: ['javascript.0.devices.lampSimple', 'javascript.0.devices.dimmerSimple']\n});\ncreateEnum('enum.rooms.living_room', {\n    name: {\n        en: 'Living room',\n        de: 'Wohnzimmer',\n    },\n    members: ['javascript.0.devices.lampSimple', 'javascript.0.devices.dimmerSimple']\n});\n\n\ncreateState('devices.lampSimple', {\n    name: {\n        en: 'Lamp',\n        de: 'Lampe'\n    },\n    type: 'boolean',\n    read: true,\n    write: true,\n    role: 'switch',\n    def: false\n});\nsetObject('javascript.0.devices.lampComplex', {\n    common: {\n        name: 'Lamp Complex'\n    },\n    type: 'channel'\n});\n\ncreateState('devices.lampComplex.set', {\n    name: {\n        en: 'Lamp Complex',\n        de: 'Lampe Complex'\n    },\n    type: 'boolean',\n    write: true,\n    role: 'switch',\n    def: false\n});\ncreateState('devices.lampComplex.get', {\n    name: {\n        en: 'Lamp Complex State',\n        de: 'Lampe Complex State'\n    },\n    type: 'boolean',\n    read: true,\n    role: 'sensor',\n    def: false\n});\ncreateState('devices.lampComplex.battery', {\n    name: {\n        en: 'Lamp Complex Battery',\n        de: 'Lampe Complex Battery'\n    },\n    type: 'boolean',\n    read: true,\n    role: 'indicator.lowbat',\n    def: false\n});\n\ncreateState('devices.dimmerSimple', {\n    name: {\n        en: 'Dimmer',\n        de: 'Dimmer'\n    },\n    type: 'number',\n    min: 0,\n    max: 200,\n    read: true,\n    write: true,\n    role: 'level',\n    def: 0\n});\nsetObject('javascript.0.devices.sensorComplex', {\n    common: {\n        name: 'Sensor complex'\n    },\n    type: 'channel'\n});\ncreateState('devices.sensorComplex.themperature', {\n    name: {\n        en: 'Themperature',\n        de: 'Themperatur'\n    },\n    type: 'number',\n    read: true,\n    role: 'value.themperature',\n    unit: '°C',\n    def: 10\n});\ncreateState('devices.sensorComplex.humidity', {\n    name: {\n        en: 'Humidity',\n        de: 'Luftfeutigkeit'\n    },\n    type: 'number',\n    read: true,\n    role: 'value.humidity',\n    unit: '%',\n    def: 10\n});\nsetObject('javascript.0.devices.blindCopmlex', {\n    common: {\n        name: 'Blind complex'\n    },\n    type: 'channel'\n});\n\ncreateState('devices.blindCopmlex.set', {\n    name: {\n        en: 'Blind',\n        de: 'Rolladen'\n    },\n    type: 'number',\n    write: true,\n    role: 'level.blind',\n    unit: '%',\n    def: 0\n});\ncreateState('devices.blindCopmlex.get', {\n    name: {\n        en: 'Blind Position',\n        de: 'Rolladen Position'\n    },\n    type: 'number',\n    write: false,\n    role: 'value.blind',\n    unit: '%',\n    def: 0\n});\ncreateState('devices.blindCopmlex.working', {\n    name: {\n        en: 'Blind working',\n        de: 'Rolladen in Bewegung'\n    },\n    type: 'boolean',\n    write: false,\n    role: 'indicator.working'\n});\n\n\n// ---------------- complex info\nsetObject('javascript.0.devices.infoComplex', {\n    common: {\n        name: 'Info complex'\n    },\n    type: 'channel'\n});\n\ncreateState('devices.infoComplex.value', {\n    name: {\n        en: 'Value',\n        de: 'Wert'\n    },\n    type: 'number',\n    write: false,\n    role: 'state',\n    unit: '%',\n    def: 0\n});\ncreateState('devices.infoComplex.bool', {\n    name: {\n        en: 'Boolean',\n        de: 'Bool'\n    },\n    type: 'boolean',\n    write: false,\n    role: 'state'\n});\n\ncreateState('devices.infoComplex.slider', {\n    name: {\n        en: 'Slider',\n        de: 'Slider'\n    },\n    type: 'number',\n    write: true,\n    role: 'level',\n    min: 10, \n    max: 90,\n    unit: '%',\n    def: 0\n});\n\ncreateState('devices.infoComplex.level', {\n    name: {\n        en: 'Level',\n        de: 'Nivau'\n    },\n    type: 'number',\n    write: true,\n    role: 'level',\n    unit: '%',\n    def: 0\n});\n\ncreateState('devices.infoComplex.input', {\n    name: {\n        en: 'Text',\n        de: 'Text'\n    },\n    type: 'string',\n    write: true,\n    role: 'state'\n});",
            "enabled": true,
            "engine": "system.adapter.javascript.0",
            "debug": false,
            "verbose": false
        },
        "type": "script",
        "from": "system.adapter.admin.0",
        "user": "system.user.admin",
        "ts": 1530286402618,
        "_id": "script.js.common.CreateStates",
        "acl": {
            "object": 1636,
            "owner": "system.user.admin",
            "ownerGroup": "system.group.administrator"
        }
    },
    "script.js.common.Skript1": {
        "common": {
            "name": "Skript1",
            "engineType": "Javascript/js",
            "source": "let states = 0;\nlet channels = 0;\nlet devices = 0;\nlet wrongs = 0;\nlet IDs = [];\n\n$('device').each(id => {\n    devices++;\n    IDs.push(id);\n});\n$('channel').each(id => {\n    channels++;\n    IDs.push(id);\n});\n$('*').each(id => {\n    states++;\n    IDs.push(id);\n});\nvar types = ['state', 'channel', 'device', 'adapter', 'instance', 'enum', 'host'];\n\nfunction processIds(_IDs) {\n    if (_IDs.length) {\n        if (_IDs.length % 200 === 0) {\n            console.log('Checking.... ' + _IDs.length + ' left');\n        }\n        var id = _IDs.shift();\n        if (!id) {\n            console.warn('Empty ID found!!!! Type of ID is ' + typeof id);\n            wrongs++;\n            \n        } else\n        if (id.match(/[\\*\\?\"']+/)) {\n            wrongs++;\n            console.warn('Invalid ID: ' + id);\n        }\n        \n        var obj = id && getObject(id);\n        if (obj) {\n            if (!obj.common) {\n                console.warn('No common found in ' + id);\n                wrongs++;\n            }\n            if (!obj.native) {\n                console.warn('No native found in ' + id);\n                wrongs++;\n            }\n            if (types.indexOf(obj.type) === -1) {\n                console.warn('Invalid type \"' + obj.type + '\" of ' + id);\n                wrongs++;\n            }\n        } else {\n            console.warn('No object for ' + id);\n            wrongs++;\n            return deleteState(id, function (err) {\n                setTimeout(processIds, 0, _IDs);\n            });\n        }\n        setTimeout(processIds, 0, _IDs);\n    } else {\n        console.log('Checked ' + devices + ' devices, ' + channels + ' channels, ' + states + ' states');\n        console.log('Found ' + wrongs + ' problems');\n    }\n}\n\n\nprocessIds(IDs);",
            "enabled": true,
            "engine": "system.adapter.javascript.0",
            "debug": false,
            "verbose": false
        },
        "type": "script",
        "from": "system.adapter.admin.0",
        "user": "system.user.admin",
        "ts": 1526297705134,
        "_id": "script.js.common.Skript1",
        "acl": {
            "object": 1636,
            "owner": "system.user.admin",
            "ownerGroup": "system.group.administrator"
        }
    },
    "script.js.global": {
        "common": {
            "name": "global"
        },
        "type": "channel",
        "from": "system.adapter.admin.0",
        "user": "system.user.admin",
        "ts": 1525434795471,
        "_id": "script.js.global",
        "acl": {
            "object": 1636,
            "owner": "system.user.admin",
            "ownerGroup": "system.group.administrator"
        }
    },
    "script.js.common.Values": {
        "common": {
            "name": "Values",
            "engineType": "Javascript/js",
            "source": "let i = 0;\nsetInterval(() => {\n    console.log('Counter ' + (i++));\n}, 1000);",
            "enabled": true,
            "engine": "system.adapter.javascript.0",
            "debug": false,
            "verbose": false
        },
        "type": "script",
        "from": "system.adapter.admin.0",
        "user": "system.user.admin",
        "ts": 1536762766661,
        "_id": "script.js.common.Values",
        "acl": {
            "object": 1636,
            "owner": "system.user.admin",
            "ownerGroup": "system.group.administrator"
        }
    }
};

export default data;
