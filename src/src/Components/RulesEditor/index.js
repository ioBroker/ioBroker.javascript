import React, { Fragment, useEffect, useState } from 'react';
import cls from './rules.module.scss';
import MusicNoteIcon from '@material-ui/icons/MusicNote';
import ShuffleIcon from '@material-ui/icons/Shuffle';
import PlaylistPlayIcon from '@material-ui/icons/PlaylistPlay';
import CustomInput from './components/CustomInput';
import { CustomDragLayer } from './components/CustomDragLayer';
import CustomDragItem from './components/CardMenu/CustomDragItem';
import ContentBlockItems from './components/ContentBlockItems';
import HamburgerMenu from './components/HamburgerMenu';
import { useStateLocal } from './hooks/useStateLocal';
import CustomSwitch from './components/CustomSwitch';
import CustomCheckbox from './components/CustomCheckbox';
import CustomHint from './components/CustomHint';
import { ContextWrapper } from './components/ContextWrapper';
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
        icon: props => <MusicNoteIcon {...props} className={cls.icon_them} />,
        typeBlock: 'when',

        // acceptedOn: ['when'],
        type: 'trigger',
        compile: (config, context) => `schedule('* 1 * * *', ${STANDARD_FUNCTION});`
    },
    {
        name: 'Condition1',
        icon: (props) => <ShuffleIcon {...props} className={cls.icon_them} />,
        typeBlock: 'and',

        // acceptedOn: ['or', 'and'],
        type: 'condition',
        compile: (config, context) => `obj.val === "1"`
    },
    {
        name: 'Action1',
        icon: (props) => <PlaylistPlayIcon {...props} className={cls.icon_them} />,
        typeBlock: 'then',

        // acceptedOn: ['then', 'else'],
        type: 'action',
        compile: (config, context) => `setState('id', obj.val);`
    }
];

// eslint-disable-next-line no-unused-vars
const DEFAULT_RULE = {
    triggers: [],
    conditions: [],
    actions: {
        then: [],
        'else': null,
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
    const [itemsSwitches, setItemsSwitches] = useStateLocal([], 'itemsSwitches');//useState(code2json(props.code));
    const [filter, setFilter] = useStateLocal({
        text: '',
        type: ['trigger', 'condition', 'action'],
        allType: true
    }, 'filterControlPanel');
    const setSwitchesFunc = (text = filter.text, array = filter.type) => {
        setSwitches([...allSwitches.filter(({ type, name }) => name.toLowerCase().indexOf(text.toLowerCase()) + 1 && array.find(el => el === type))]);
    }
    useEffect(() => {
        setSwitchesFunc();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return <div className={cls.wrapper_rules}>
        <ContextWrapper>
            <CustomDragLayer />
            <div className={`${cls.hamburger_wrapper} ${hamburgerOnOff ? cls.hamburger_off : null}`}
                onClick={() => setHamburgerOnOff(!hamburgerOnOff)}><HamburgerMenu boolean={!hamburgerOnOff} /></div>
            <div className={`${cls.menu_rules} ${hamburgerOnOff ? cls.menu_off : null}`}>
                <CustomInput
                    className={cls.input_width}
                    fullWidth
                    customValue
                    value={filter.text}
                    autoComplete='off'
                    label="search"
                    variant="outlined"
                    onChange={(value) => {
                        setFilter({ ...filter, text: value });
                        setSwitchesFunc(value);
                    }}
                />
                <div className={cls.menu_title}>
                    Control Panel
            </div>
                <div className={cls.control_panel}>
                    <CustomSwitch customValue value={filter.allType}
                        onChange={(value) => {
                            setFilter({
                                ...filter, allType: value,
                                type: ['trigger', 'condition', 'action']
                            });
                            setSwitchesFunc(filter.text, ['trigger', 'condition', 'action']);
                        }} />
                    <CustomHint>
                        <div>
                            <div className={cls.hint_content}><div className={cls.hint_square} style={{ background: '#24b3c1f0' }} /> trigger</div>
                            <div className={cls.hint_content}><div className={cls.hint_square} style={{ background: '#fcff5c94' }} /> condition</div>
                            <div className={cls.hint_content}><div className={cls.hint_square} style={{ background: '#59f9599e' }} /> action</div>
                        </div>
                    </CustomHint>
                </div>
                <div className={cls.control_panel}>
                    {['trigger', 'condition', 'action'].map((typeEl) => (
                        <Fragment key={typeEl}>
                            <CustomCheckbox key={typeEl} disabled={filter.allType} customValue value={filter.type.find(_type => _type === typeEl)}
                                onChange={(value) => {
                                    let newArray = [...filter.type];
                                    if (value) {
                                        newArray.push(typeEl);
                                    } else {
                                        newArray = newArray.filter(item => item !== typeEl);
                                    }
                                    setFilter({ ...filter, type: newArray });
                                    setSwitchesFunc(filter.text, newArray);
                                }} type={typeEl} />
                        </Fragment>))}
                </div>
                <div className={cls.menu_title}>
                    Switches
            </div>
                <div>
                    {switches.map(({ name, icon, typeBlock }) =>
                        <Fragment key={name}>
                            <CustomDragItem
                                itemsSwitches={itemsSwitches}
                                setItemsSwitches={json => {
                                    setItemsSwitches(json);
                                    props.onChange(json2code(json));
                                }}
                                isActive={false}
                                name={name}
                                Icon={icon}
                                id={name}
                                typeBlock={typeBlock}
                            />
                        </Fragment>)}
                    {switches.length === 0 && <div className={cls.nothing_found}>
                        Nothing found...
                    <div className={cls.reset_search} onClick={() => {
                            setFilter({
                                text: '',
                                type: ['trigger', 'condition', 'action'],
                                allType: true
                            });
                            setSwitches(allSwitches);
                        }}>reset search</div>
                    </div>}
                </div>
            </div>

            <ContentBlockItems
                setItemsSwitches={json => {
                    setItemsSwitches(json);
                    props.onChange(json2code(json));
                }}
                itemsSwitches={itemsSwitches}
                name='when...'
                typeBlock='when'
            />
            <ContentBlockItems
                setItemsSwitches={json => {
                    setItemsSwitches(json);
                    props.onChange(json2code(json));
                }}
                itemsSwitches={itemsSwitches}
                name='...and...'
                typeBlock='and'
                nameDop='or'
                dopLength={2}
                dop
                border
            />
            <ContentBlockItems
                setItemsSwitches={json => {
                    setItemsSwitches(json);
                    props.onChange(json2code(json));
                }}
                itemsSwitches={itemsSwitches}
                name='...then'
                typeBlock='then'
                nameDop='else'
                dop
            />
        </ContextWrapper>
    </div>;
}

// RulesEditor.propTypes = {

// };

export default RulesEditor;
