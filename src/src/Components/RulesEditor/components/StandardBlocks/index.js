const STANDARD_FUNCTION = `async function (obj) {
    if (__%%CONDITION%%__) {
__%%THEN%%__
    } else {
__%%ELSE%%__
    }
}`

const StandardBlocks = [
    {
        name: 'Trigger2',
        typeBlock: 'when',
        icon: 'AccessTime',
        // acceptedOn: ['when'],
        type: 'trigger',
        compile: (config, context) => `schedule('* 1 * * *', ${STANDARD_FUNCTION});`,
        getConfig: () => { },
        setConfig: (config) => { },
        _acceptedBy: 'triggers', // where it could be acceped: trigger, condition, action
        _type: 'trigger1',
        _name: { en: 'Schedule', ru: 'Триггер' },
        _inputs: { nameRender: 'renderTimeOfDay', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
    }, {
        name: 'Trigger3',
        typeBlock: 'when',
        icon: 'PlayArrow',
        // acceptedOn: ['when'],
        type: 'trigger',
        compile: (config, context) => `schedule('* 1 * * *', ${STANDARD_FUNCTION});`,
        getConfig: () => { },
        setConfig: (config) => { },
        _acceptedBy: 'triggers', // where it could be acceped: trigger, condition, action
        _type: 'trigger1',
        _name: { en: 'Script save', ru: 'Триггер' },
        _inputs:
            { nameRender: 'renderOnScript', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
    },
    {
        name: 'Trigger1',
        typeBlock: 'when',
        icon: 'FlashOn',
        // acceptedOn: ['when'],
        type: 'trigger',
        compile: (config, context) => `schedule('* 1 * * *', ${STANDARD_FUNCTION});`,
        getConfig: () => { },
        setConfig: (config) => { },
        _acceptedBy: 'triggers', // where it could be acceped: trigger, condition, action
        _type: 'trigger1',
        _name: { en: 'State', ru: 'Триггер' },
        _inputs:
            { nameRender: 'renderState', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
    },
    {
        name: 'Condition1',
        getConfig: () => { },
        setConfig: (config) => { },
        _acceptedBy: 'conditions', // where it could be acceped: trigger, condition, action
        _type: 'condition1',
        _name: { en: 'State condition', ru: 'Триггер' },
        typeBlock: 'and',
        icon: 'Shuffle',
        type: 'condition',
        compile: (config, context) => `obj.val === "1"`,
        _inputs:
            { nameRender: 'renderStateCondition', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
    },
    {
        name: 'Condition2',
        getConfig: () => { },
        setConfig: (config) => { },
        _acceptedBy: 'conditions', // where it could be acceped: trigger, condition, action
        _type: 'condition1',
        _name: { en: 'Time condition', ru: 'Триггер' },
        typeBlock: 'and',
        icon: 'Shuffle',
        type: 'condition',
        compile: (config, context) => `obj.val === "1"`,
        _inputs:
            { nameRender: 'renderTimeCondition', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
    },
    {
        name: 'Condition3',
        getConfig: () => { },
        setConfig: (config) => { },
        _acceptedBy: 'conditions', // where it could be acceped: trigger, condition, action
        _type: 'condition1',
        _name: { en: 'Astrological condition', ru: 'Триггер' },
        typeBlock: 'and',
        icon: 'Brightness3',
        type: 'condition',
        compile: (config, context) => `obj.val === "1"`,
        _inputs:
            { nameRender: 'renderAstrologicalCondition', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
    },
    {
        name: 'Action1',
        typeBlock: 'then',
        icon: 'PlaylistPlay',

        // acceptedOn: ['then', 'else'],
        type: 'action',
        compile: (config, context) => `setState('id', obj.val);`,
        getConfig: () => { },
        setConfig: (config) => { },
        _acceptedBy: 'actions', // where it could be acceped: trigger, condition, action
        _type: 'action1',
        _name: { en: 'Action', ru: 'Действие' },
        _inputs:
            { nameRender: 'renderText', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
    }
];

export default StandardBlocks;