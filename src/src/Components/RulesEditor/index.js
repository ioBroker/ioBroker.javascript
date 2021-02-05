import React, { Fragment, useEffect, useState } from 'react';
import cls from './style.module.scss';
import MusicNoteIcon from '@material-ui/icons/MusicNote';
import ShuffleIcon from '@material-ui/icons/Shuffle';
import PlaylistPlayIcon from '@material-ui/icons/PlaylistPlay';
import FlashOnIcon from '@material-ui/icons/FlashOn';
import HelpIcon from '@material-ui/icons/Help';
import PlayForWorkIcon from '@material-ui/icons/PlayForWork';
import CustomInput from './components/CustomInput';
import { CustomDragLayer } from './components/CustomDragLayer';
import CustomDragItem from './components/CardMenu/CustomDragItem';
import ContentBlockItems from './components/ContentBlockItems';
import HamburgerMenu from './components/HamburgerMenu';
import { useStateLocal } from './hooks/useStateLocal';
import { ContextWrapper } from './components/ContextWrapper';
import { AppBar, Tab, Tabs } from '@material-ui/core';
// import PropTypes from 'prop-types';

const STANDARD_FUNCTION = `async function (obj) {
    if (__%%CONDITION%%__) {
__%%THEN%%__
    } else {
__%%ELSE%%__
    }
}`

// import I18n from '@iobroker/adapter-react/i18n';
// import DialogMessage from '@iobroker/adapter-react/Dialogs/Message';
const allSwitches = [
    {
        name: 'Trigger1',
        Icon: props => <MusicNoteIcon {...props} className={cls.iconThem} />,
        typeBlock: 'when',

        // acceptedOn: ['when'],
        type: 'trigger',


        compile: (config, context) => `schedule('* 1 * * *', ${STANDARD_FUNCTION});`,
        getConfig: () => { },
        setConfig: (config) => { },
        _acceptedBy: 'triggers', // where it could be acceped: trigger, condition, action
        _type: 'trigger1',
        _name: { en: 'Trigger', ru: 'Триггер' },
        _inputs: [
            { nameRender: 'renderText', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
        ]
    },
    {
        name: 'Condition1',
        getConfig: () => { },
        setConfig: (config) => { },
        _acceptedBy: 'conditions', // where it could be acceped: trigger, condition, action
        _type: 'condition1',
        _name: { en: 'Сondition', ru: 'Триггер' },
        Icon: (props) => <ShuffleIcon {...props} className={cls.iconThem} />,
        typeBlock: 'and',
        type: 'condition',
        compile: (config, context) => `obj.val === "1"`,
        _inputs: [
            { nameRender: 'renderText', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },]
    },
    {
        name: 'Condition1',
        getConfig: () => { },
        setConfig: (config) => { },
        _acceptedBy: 'conditions', // where it could be acceped: trigger, condition, action
        _type: 'condition1',
        _name: { en: 'Сondition number', ru: 'Триггер' },
        Icon: (props) => <ShuffleIcon {...props} className={cls.iconThem} />,
        typeBlock: 'and',
        type: 'condition',
        compile: (config, context) => `obj.val === "1"`,
        _inputs: [
            // {nameRender:'renderText', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
            { nameRender: 'renderNumber', name: { en: 'Time' }, attr: 'timeFrom', type: 'time', default: '00:00', icon: '' },
            // {nameRender:'renderCheckbox', name: { en: 'Color' }, attr: 'background', type: 'color', default: '#FF00FF', icon: '' },
            // {nameRender:'renderSlider', name: { en: 'Dimmer' }, attr: 'dimmer', type: 'slider', default: 50, min: 0, max: 100, icon: '' },
            // {nameRender:'renderButton', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
            // {nameRender:'renderObjectID', name: { en: 'Time' }, attr: 'timeFrom', type: 'time', default: '00:00', icon: '' },
            // {nameRender:'renderColor', name: { en: 'Color' }, attr: 'background', type: 'color', default: '#FF00FF', icon: '' },
            // {nameRender:'renderTimeOfDay', name: { en: 'Dimmer' }, attr: 'dimmer', type: 'slider', default: 50, min: 0, max: 100, icon: '' },
            // {nameRender:'renderDate', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
            // {nameRender:'renderInstanceSelection', name: { en: 'Time' }, attr: 'timeFrom', type: 'time', default: '00:00', icon: '' },
        ]
    },
    {
        name: 'Condition1',
        getConfig: () => { },
        setConfig: (config) => { },
        _acceptedBy: 'conditions', // where it could be acceped: trigger, condition, action
        _type: 'condition1',
        _name: { en: 'Сondition Slider', ru: 'Триггер' },
        Icon: (props) => <ShuffleIcon {...props} className={cls.iconThem} />,
        typeBlock: 'and',
        type: 'condition',
        compile: (config, context) => `obj.val === "1"`,
        _inputs: [
            // {nameRender:'renderText', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
            // {nameRender:'renderNumber', name: { en: 'Time' }, attr: 'timeFrom', type: 'time', default: '00:00', icon: '' },
            // {nameRender:'renderCheckbox', name: { en: 'Color' }, attr: 'background', type: 'color', default: '#FF00FF', icon: '' },
            { nameRender: 'renderSlider', name: { en: 'Dimmer' }, attr: 'dimmer', type: 'slider', default: 50, min: 0, max: 100, icon: '' },
            // {nameRender:'renderButton', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
            // {nameRender:'renderObjectID', name: { en: 'Time' }, attr: 'timeFrom', type: 'time', default: '00:00', icon: '' },
            // {nameRender:'renderColor', name: { en: 'Color' }, attr: 'background', type: 'color', default: '#FF00FF', icon: '' },
            // {nameRender:'renderTimeOfDay', name: { en: 'Dimmer' }, attr: 'dimmer', type: 'slider', default: 50, min: 0, max: 100, icon: '' },
            // {nameRender:'renderDate', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
            // {nameRender:'renderInstanceSelection', name: { en: 'Time' }, attr: 'timeFrom', type: 'time', default: '00:00', icon: '' },
        ]
    },
    {
        name: 'Condition1',
        getConfig: () => { },
        setConfig: (config) => { },
        _acceptedBy: 'conditions', // where it could be acceped: trigger, condition, action
        _type: 'condition1',
        _name: { en: 'Сondition Button', ru: 'Триггер' },
        Icon: (props) => <ShuffleIcon {...props} className={cls.iconThem} />,
        typeBlock: 'and',
        type: 'condition',
        compile: (config, context) => `obj.val === "1"`,
        _inputs: [
            // {nameRender:'renderText', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
            // {nameRender:'renderNumber', name: { en: 'Time' }, attr: 'timeFrom', type: 'time', default: '00:00', icon: '' },
            // {nameRender:'renderCheckbox', name: { en: 'Color' }, attr: 'background', type: 'color', default: '#FF00FF', icon: '' },
            // {nameRender:'renderSlider', name: { en: 'Dimmer' }, attr: 'dimmer', type: 'slider', default: 50, min: 0, max: 100, icon: '' },
            { nameRender: 'renderButton', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
            // {nameRender:'renderObjectID', name: { en: 'Time' }, attr: 'timeFrom', type: 'time', default: '00:00', icon: '' },
            // {nameRender:'renderColor', name: { en: 'Color' }, attr: 'background', type: 'color', default: '#FF00FF', icon: '' },
            // {nameRender:'renderTimeOfDay', name: { en: 'Dimmer' }, attr: 'dimmer', type: 'slider', default: 50, min: 0, max: 100, icon: '' },
            // {nameRender:'renderDate', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
            // {nameRender:'renderInstanceSelection', name: { en: 'Time' }, attr: 'timeFrom', type: 'time', default: '00:00', icon: '' },
        ]
    },
    {
        name: 'Condition1',
        getConfig: () => { },
        setConfig: (config) => { },
        _acceptedBy: 'conditions', // where it could be acceped: trigger, condition, action
        _type: 'condition1',
        _name: { en: 'Сondition ObjectID', ru: 'Триггер' },
        Icon: (props) => <ShuffleIcon {...props} className={cls.iconThem} />,
        typeBlock: 'and',
        type: 'condition',
        compile: (config, context) => `obj.val === "1"`,
        _inputs: [
            // {nameRender:'renderText', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
            // {nameRender:'renderNumber', name: { en: 'Time' }, attr: 'timeFrom', type: 'time', default: '00:00', icon: '' },
            // {nameRender:'renderCheckbox', name: { en: 'Color' }, attr: 'background', type: 'color', default: '#FF00FF', icon: '' },
            // {nameRender:'renderSlider', name: { en: 'Dimmer' }, attr: 'dimmer', type: 'slider', default: 50, min: 0, max: 100, icon: '' },
            // {nameRender:'renderButton', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
            { nameRender: 'renderObjectID', name: { en: 'Time' }, attr: 'timeFrom', type: 'time', default: '00:00', icon: '' },
            // {nameRender:'renderColor', name: { en: 'Color' }, attr: 'background', type: 'color', default: '#FF00FF', icon: '' },
            // {nameRender:'renderTimeOfDay', name: { en: 'Dimmer' }, attr: 'dimmer', type: 'slider', default: 50, min: 0, max: 100, icon: '' },
            // {nameRender:'renderDate', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
            // {nameRender:'renderInstanceSelection', name: { en: 'Time' }, attr: 'timeFrom', type: 'time', default: '00:00', icon: '' },
        ]
    },
    {
        name: 'Condition1',
        getConfig: () => { },
        setConfig: (config) => { },
        _acceptedBy: 'conditions', // where it could be acceped: trigger, condition, action
        _type: 'condition1',
        _name: { en: 'Сondition Color', ru: 'Триггер' },
        Icon: (props) => <ShuffleIcon {...props} className={cls.iconThem} />,
        typeBlock: 'and',
        type: 'condition',
        compile: (config, context) => `obj.val === "1"`,
        _inputs: [
            // {nameRender:'renderText', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
            // {nameRender:'renderNumber', name: { en: 'Time' }, attr: 'timeFrom', type: 'time', default: '00:00', icon: '' },
            // {nameRender:'renderCheckbox', name: { en: 'Color' }, attr: 'background', type: 'color', default: '#FF00FF', icon: '' },
            // {nameRender:'renderSlider', name: { en: 'Dimmer' }, attr: 'dimmer', type: 'slider', default: 50, min: 0, max: 100, icon: '' },
            // {nameRender:'renderButton', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
            // {nameRender:'renderObjectID', name: { en: 'Time' }, attr: 'timeFrom', type: 'time', default: '00:00', icon: '' },
            { nameRender: 'renderColor', name: { en: 'Color' }, attr: 'background', type: 'color', default: '#FF00FF', icon: '' },
            // {nameRender:'renderTimeOfDay', name: { en: 'Dimmer' }, attr: 'dimmer', type: 'slider', default: 50, min: 0, max: 100, icon: '' },
            // {nameRender:'renderDate', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
            // {nameRender:'renderInstanceSelection', name: { en: 'Time' }, attr: 'timeFrom', type: 'time', default: '00:00', icon: '' },
        ]
    },
    {
        name: 'Condition1',
        getConfig: () => { },
        setConfig: (config) => { },
        _acceptedBy: 'conditions', // where it could be acceped: trigger, condition, action
        _type: 'condition1',
        _name: { en: 'Сondition TimeOfDay', ru: 'Триггер' },
        Icon: (props) => <ShuffleIcon {...props} className={cls.iconThem} />,
        typeBlock: 'and',
        type: 'condition',
        compile: (config, context) => `obj.val === "1"`,
        _inputs: [
            // {nameRender:'renderText', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
            // {nameRender:'renderNumber', name: { en: 'Time' }, attr: 'timeFrom', type: 'time', default: '00:00', icon: '' },
            // {nameRender:'renderCheckbox', name: { en: 'Color' }, attr: 'background', type: 'color', default: '#FF00FF', icon: '' },
            // {nameRender:'renderSlider', name: { en: 'Dimmer' }, attr: 'dimmer', type: 'slider', default: 50, min: 0, max: 100, icon: '' },
            // {nameRender:'renderButton', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
            // {nameRender:'renderObjectID', name: { en: 'Time' }, attr: 'timeFrom', type: 'time', default: '00:00', icon: '' },
            // {nameRender:'renderColor', name: { en: 'Color' }, attr: 'background', type: 'color', default: '#FF00FF', icon: '' },
            { nameRender: 'renderTimeOfDay', name: { en: 'Dimmer' }, attr: 'dimmer', type: 'slider', default: 50, min: 0, max: 100, icon: '' },
            // {nameRender:'renderDate', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
            // {nameRender:'renderInstanceSelection', name: { en: 'Time' }, attr: 'timeFrom', type: 'time', default: '00:00', icon: '' },
        ]
    },
    {
        name: 'Condition1',
        getConfig: () => { },
        setConfig: (config) => { },
        _acceptedBy: 'conditions', // where it could be acceped: trigger, condition, action
        _type: 'condition1',
        _name: { en: 'Сondition Date', ru: 'Триггер' },
        Icon: (props) => <ShuffleIcon {...props} className={cls.iconThem} />,
        typeBlock: 'and',
        type: 'condition',
        compile: (config, context) => `obj.val === "1"`,
        _inputs: [
            // {nameRender:'renderText', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
            // {nameRender:'renderNumber', name: { en: 'Time' }, attr: 'timeFrom', type: 'time', default: '00:00', icon: '' },
            // {nameRender:'renderCheckbox', name: { en: 'Color' }, attr: 'background', type: 'color', default: '#FF00FF', icon: '' },
            // {nameRender:'renderSlider', name: { en: 'Dimmer' }, attr: 'dimmer', type: 'slider', default: 50, min: 0, max: 100, icon: '' },
            // {nameRender:'renderButton', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
            // {nameRender:'renderObjectID', name: { en: 'Time' }, attr: 'timeFrom', type: 'time', default: '00:00', icon: '' },
            // {nameRender:'renderColor', name: { en: 'Color' }, attr: 'background', type: 'color', default: '#FF00FF', icon: '' },
            // {nameRender:'renderTimeOfDay', name: { en: 'Dimmer' }, attr: 'dimmer', type: 'slider', default: 50, min: 0, max: 100, icon: '' },
            { nameRender: 'renderDate', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
            // {nameRender:'renderInstanceSelection', name: { en: 'Time' }, attr: 'timeFrom', type: 'time', default: '00:00', icon: '' },
        ]
    },
    {
        name: 'Condition1',
        getConfig: () => { },
        setConfig: (config) => { },
        _acceptedBy: 'conditions', // where it could be acceped: trigger, condition, action
        _type: 'condition1',
        _name: { en: 'Сondition Select', ru: 'Триггер' },
        Icon: (props) => <ShuffleIcon {...props} className={cls.iconThem} />,
        typeBlock: 'and',
        type: 'condition',
        compile: (config, context) => `obj.val === "1"`,
        _inputs: [
            // {nameRender:'renderText', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
            // {nameRender:'renderNumber', name: { en: 'Time' }, attr: 'timeFrom', type: 'time', default: '00:00', icon: '' },
            // {nameRender:'renderCheckbox', name: { en: 'Color' }, attr: 'background', type: 'color', default: '#FF00FF', icon: '' },
            // {nameRender:'renderSlider', name: { en: 'Dimmer' }, attr: 'dimmer', type: 'slider', default: 50, min: 0, max: 100, icon: '' },
            // {nameRender:'renderButton', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
            // {nameRender:'renderObjectID', name: { en: 'Time' }, attr: 'timeFrom', type: 'time', default: '00:00', icon: '' },
            // {nameRender:'renderColor', name: { en: 'Color' }, attr: 'background', type: 'color', default: '#FF00FF', icon: '' },
            // {nameRender:'renderTimeOfDay', name: { en: 'Dimmer' }, attr: 'dimmer', type: 'slider', default: 50, min: 0, max: 100, icon: '' },
            // {nameRender:'renderDate', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
            { nameRender: 'renderInstanceSelection', name: { en: 'Time' }, attr: 'timeFrom', type: 'time', default: '00:00', icon: '' },
        ]
    },
    {
        name: 'Action1',
        Icon: (props) => <PlaylistPlayIcon {...props} className={cls.iconThem} />,
        typeBlock: 'then',

        // acceptedOn: ['then', 'else'],
        type: 'action',
        compile: (config, context) => `setState('id', obj.val);`,
        getConfig: () => { },
        setConfig: (config) => { },
        _acceptedBy: 'actions', // where it could be acceped: trigger, condition, action
        _type: 'action1',
        _name: { en: 'Action', ru: 'Действие' },
        _inputs: [
            { nameRender: 'renderText', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },]
    }
];

// eslint-disable-next-line no-unused-vars
const DEFAULT_RULE = {
    triggers: [],
    conditions: [[]],
    actions: {
        then: [],
        'else': []
    }
};

function compileTriggers(json, context) {
    const triggers = [];
    json.triggers.forEach(trigger => {
        const found = findBlock(trigger.id);
        if (found) {
            const text = found.compile(trigger, context);
            const conditions = compileConditions(json.conditions, context);
            const then = compileActions(json.actions.then, context);
            const _else = compileActions(json.actions.else, context);
            triggers.push(
                text
                    .replace('__%%CONDITION%%__', conditions)
                    .replace('__%%THEN%%__', then || '// ignore')
                    .replace('__%%ELSE%%__', _else || '// ignore')
            );
        }
    });

    return triggers.join('\n\n');
}
function findBlock(type) {
    return allSwitches.find(block => block.name === type);
}

function compileActions(actions, context) {
    let result = [];
    actions && actions.forEach(action => {
        const found = findBlock(action.id);
        if (found) {
            result.push(found.compile(action, context));
        }
    });
    return `\t\t${result.join('\t\t\n')}` || '';
}

function compileConditions(conditions, context) {
    let result = [];
    conditions && conditions.forEach(ors => {
        if (ors.hasOwnProperty('length')) {
            const _ors = [];
            _ors && ors.forEach(block => {
                const found = findBlock(block.id);
                if (found) {
                    _ors.push(found.compile(block, context));
                }
            });
            result.push(_ors.join(' || '));
        } else {
            const found = findBlock(ors.id);
            if (found) {
                result.push(found.compile(ors, context));
            }
        }

    });
    return (result.join(') && (') || 'true');
}

function compile(json) {
    return compileTriggers(json);
}

// eslint-disable-next-line no-unused-vars
function code2json(code) {
    if (!code) {
        return [];//DEFAULT_RULE;
    } else {
        const lines = code.split('\n');
        let json = lines.pop();
        try {
            json = JSON.parse(json);
            if (!json.triggers) {
                json = [];//DEFAULT_RULE;
            }
            return json;
        } catch (e) {
            return [];//DEFAULT_RULE;
        }
    }
}

// eslint-disable-next-line no-unused-vars
function json2code(json) {
    let code = `const demo = ${JSON.stringify(json, null, 2)};\n`;

    const compiled = compile({
        triggers: json.filter(block => block.typeBlock === 'when'),
        conditions: json.filter(block => block.typeBlock === 'and'),
        actions: {
            then: json.filter(block => block.typeBlock === 'then'),
            'else': null,
        }
    });
    code += compiled;

    return code + '\n//' + JSON.stringify(json);
}

const RulesEditor = props => {
    // eslint-disable-next-line no-unused-vars
    const [switches, setSwitches] = useState([]);
    const [hamburgerOnOff, setHamburgerOnOff] = useStateLocal(false, 'hamburgerOnOff');
    const [itemsSwitches, setItemsSwitches] = useStateLocal(DEFAULT_RULE, 'itemsSwitches');//useState(code2json(props.code));
    const [filter, setFilter] = useStateLocal({
        text: '',
        type: 'trigger',
        index: 0
    }, 'filterControlPanel');
    const setSwitchesFunc = (text = filter.text, typeFunc = filter.type) => {
        let newAllSwitches = [...allSwitches];
        newAllSwitches = newAllSwitches.filter(({ type, _name }) => _name.en.toLowerCase().indexOf(text.toLowerCase()) + 1);
        newAllSwitches = newAllSwitches.filter(({ type, _name }) => typeFunc === type);
        console.log(newAllSwitches);
        setSwitches(newAllSwitches);
    }
    useEffect(() => {
        setSwitchesFunc();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const a11yProps = index => ({
        id: `scrollable-force-tab-${index}`,
        'aria-controls': `scrollable-force-tabpanel-${index}`
    });
    const handleChange = (event, newValue) => {
        setFilter({
            ...filter,
            index: newValue,
            type: ['trigger', 'condition', 'action'][newValue]
        });
        setSwitchesFunc(filter.text, ['trigger', 'condition', 'action'][newValue]);
    };
    return <div className={cls.wrapperRules}>
        <ContextWrapper>
            <CustomDragLayer />
            <div className={`${cls.hamburgerWrapper} ${hamburgerOnOff ? cls.hamburgerOff : null}`}
                onClick={() => setHamburgerOnOff(!hamburgerOnOff)}><HamburgerMenu boolean={!hamburgerOnOff} /></div>
            <div className={`${cls.menuRules} ${hamburgerOnOff ? cls.menuOff : null}`}>
                <CustomInput
                    className={cls.inputWidth}
                    fullWidth
                    customValue
                    value={filter.text}
                    autoComplete="off"
                    label="search"
                    variant="outlined"
                    onChange={(value) => {
                        setFilter({ ...filter, text: value });
                        setSwitchesFunc(value);
                    }}
                />
                <div className={cls.menuTitle}>
                    Control Panel
            </div>
                <div className={cls.controlPanel}>
                    <AppBar className={cls.controlPanelAppBar} position="static">
                        <Tabs
                            value={filter.index}
                            onChange={handleChange}
                            indicatorColor="primary"
                            textColor="primary"
                            aria-label="scrollable force tabs example"
                        >
                            <Tab icon={<FlashOnIcon />} {...a11yProps(0)} />
                            <Tab icon={<HelpIcon />} {...a11yProps(1)} />
                            <Tab icon={<PlayForWorkIcon />} {...a11yProps(2)} />
                        </Tabs>
                    </AppBar>
                </div>
                <div className={cls.menuTitle}>
                    Switches
            </div>
                <div className={cls.switchesRenderWrapper}>
                    <span>
                        {switches.map(el =>
                            <Fragment key={el._name.en}>
                                <CustomDragItem
                                    {...el}
                                    itemsSwitches={itemsSwitches}
                                    setItemsSwitches={json => {
                                        setItemsSwitches(json);
                                        // props.onChange(json2code(json));
                                    }}
                                    isActive={false}
                                    id={el.name}
                                    allProperties={el}
                                />
                            </Fragment>)}
                        {switches.length === 0 && <div className={cls.nothingFound}>
                            Nothing found...
                    <div className={cls.resetSearch} onClick={() => {
                                setFilter({
                                    ...filter,
                                    text: ''
                                });
                                setSwitchesFunc('');
                            }}>reset search</div>
                        </div>}
                    </span>
                </div>
            </div>

            <ContentBlockItems
                setItemsSwitches={json => {
                    // const _itemsSwitches = JSON.parse(JSON.stringify(itemsSwitches));
                    // _itemsSwitches.triggers = json;
                    setItemsSwitches(json);
                    // props.onChange(json2code(json));
                }}
                itemsSwitches={itemsSwitches}
                name="when..."
                typeBlock="when"
                blockValue="triggers"
            />
            <ContentBlockItems
                setItemsSwitches={json => {
                    setItemsSwitches(json);
                    // props.onChange(json2code(json));
                }}
                itemsSwitches={itemsSwitches}
                name="...and..."
                typeBlock="and"
                nameAdditionally="or"
                additionally
                border
                blockValue="conditions"
            />
            <ContentBlockItems
                setItemsSwitches={json => {
                    setItemsSwitches(json);
                    // props.onChange(json2code(json));
                }}
                itemsSwitches={itemsSwitches}
                name="...then"
                typeBlock="then"
                nameAdditionally="else"
                additionally
                blockValue="actions"
            />
        </ContextWrapper>
    </div>;
}

// RulesEditor.propTypes = {

// };

export default RulesEditor;
