import Compile from '../../Compile';

const StandardBlocks = [
    {
        typeBlock: 'when',
        icon: 'AccessTime',
        // acceptedOn: ['when'],
        type: 'trigger',
        compile: (config, context) => `schedule('* 1 * * *', ${Compile.STANDARD_FUNCTION});`,
        getConfig: () => { },
        setConfig: (config) => { },
        acceptedBy: 'triggers', // where it could be accepted: trigger, condition, action
        name: { en: 'Schedule', ru: 'Триггер' },
        inputs: { nameRender: 'renderTimeOfDay', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
    }, {
        typeBlock: 'when',
        icon: 'PlayArrow',
        // acceptedOn: ['when'],
        type: 'trigger',
        compile: (config, context) => `schedule('* 1 * * *', ${Compile.STANDARD_FUNCTION});`,
        getConfig: () => { },
        setConfig: (config) => { },
        acceptedBy: 'triggers', // where it could be acceped: trigger, condition, action
        name: { en: 'Script save', ru: 'Триггер' },
        inputs:
            { nameRender: 'renderOnScript', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
    },
    {
        typeBlock: 'when',
        icon: 'FlashOn',
        // acceptedOn: ['when'],
        type: 'trigger',
        compile: (config, context) => `schedule('* 1 * * *', ${Compile.STANDARD_FUNCTION});`,
        getConfig: () => { },
        setConfig: (config) => { },
        acceptedBy: 'triggers', // where it could be acceped: trigger, condition, action
        name: { en: 'State', ru: 'Триггер' },
        inputs:
            { nameRender: 'renderState', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
    },
    {
        getConfig: () => { },
        setConfig: (config) => { },
        acceptedBy: 'conditions', // where it could be acceped: trigger, condition, action
        name: { en: 'State condition', ru: 'Триггер' },
        typeBlock: 'and',
        icon: 'Shuffle',
        type: 'condition',
        compile: (config, context) => `obj.val === "1"`,
        inputs:
            { nameRender: 'renderStateCondition', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
    },
    {
        getConfig: () => { },
        setConfig: (config) => { },
        acceptedBy: 'conditions', // where it could be acceped: trigger, condition, action
        name: { en: 'Time condition', ru: 'Триггер' },
        typeBlock: 'and',
        icon: 'Shuffle',
        type: 'condition',
        compile: (config, context) => `obj.val === "1"`,
        inputs:
            { nameRender: 'renderTimeCondition', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
    },
    {
        getConfig: () => { },
        setConfig: (config) => { },
        acceptedBy: 'conditions', // where it could be acceped: trigger, condition, action
        name: { en: 'Astrological condition', ru: 'Триггер' },
        typeBlock: 'and',
        icon: 'Brightness3',
        type: 'condition',
        compile: (config, context) => `obj.val === "1"`,
        inputs:
            { nameRender: 'renderAstrologicalCondition', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
    },
    {
        typeBlock: 'then',
        icon: 'PlaylistPlay',

        // acceptedOn: ['then', 'else'],
        type: 'action',
        compile: (config, context) => `setState('id', obj.val);`,
        getConfig: () => { },
        setConfig: (config) => { },
        acceptedBy: 'actions', // where it could be acceped: trigger, condition, action
        name: { en: 'Action', ru: 'Действие' },
        inputs:
            { nameRender: 'renderText', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
    },
    {
        typeBlock: 'then',
        icon: 'PlayForWork',

        // acceptedOn: ['then', 'else'],
        type: 'action',
        compile: (config, context) => `setState('id', obj.val);`,
        getConfig: () => { },
        setConfig: (config) => { },
        acceptedBy: 'actions', // where it could be acceped: trigger, condition, action
        name: { en: 'Set state action', ru: 'Действие' },
        inputs:
            { nameRender: 'renderSetStateAction', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
    },
    {
        typeBlock: 'then',
        icon: 'Apps',

        // acceptedOn: ['then', 'else'],
        type: 'action',
        compile: (config, context) => `setState('id', obj.val);`,
        getConfig: () => { },
        setConfig: (config) => { },
        acceptedBy: 'actions', // where it could be acceped: trigger, condition, action
        name: { en: 'Exec', ru: 'Действие' },
        inputs:
            { nameRender: 'renderExecAction', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
    },
    {
        typeBlock: 'then',
        icon: 'Language',

        // acceptedOn: ['then', 'else'],
        type: 'action',
        compile: (config, context) => `setState('id', obj.val);`,
        getConfig: () => { },
        setConfig: (config) => { },
        acceptedBy: 'actions', // where it could be acceped: trigger, condition, action
        name: { en: 'HTTP Call', ru: 'Действие' },
        inputs:
            { nameRender: 'renderHTTPCallAction', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
    },
    {
        typeBlock: 'then',
        icon: 'Subject',

        // acceptedOn: ['then', 'else'],
        type: 'action',
        compile: (config, context) => `setState('id', obj.val);`,
        getConfig: () => { },
        setConfig: (config) => { },
        acceptedBy: 'actions', // where it could be acceped: trigger, condition, action
        name: { en: 'Print text', ru: 'Действие' },
        inputs:
            { nameRender: 'renderPrintTextAction', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
    },
    {
        typeBlock: 'then',
        icon: 'Pause',

        // acceptedOn: ['then', 'else'],
        type: 'action',
        compile: (config, context) => `setState('id', obj.val);`,
        getConfig: () => { },
        setConfig: (config) => { },
        acceptedBy: 'actions', // where it could be acceped: trigger, condition, action
        name: { en: 'Pause', ru: 'Действие' },
        inputs:
            { nameRender: 'renderPauseAction', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
    }
];

export default StandardBlocks;