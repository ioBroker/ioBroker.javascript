import React, {useEffect, useState} from 'react';
import cls from './rules.module.scss';
import MusicNoteIcon from '@material-ui/icons/MusicNote';
import ShuffleIcon from '@material-ui/icons/Shuffle';
import PlaylistPlayIcon from '@material-ui/icons/PlaylistPlay';
import CustomInput from './components/CustomInput';
import {CustomDragLayer} from './components/CustomDragLayer';
import CustomDragItem from './components/CardMenu/CustomDragItem';
import ContentBlockItems from './components/ContentBlockItems';
import HamburgerMenu from './components/HamburgerMenu';
import {useStateLocal} from './hooks/useStateLocal';
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
        icon: props => <MusicNoteIcon {...props} className={cls.icon_them}/>,
        typeBlock: 'when',

        // acceptedOn: ['when'],
        type: 'trigger',
        compile: (config, context) => `schedule('* 1 * * *', ${STANDARD_FUNCTION});`
    },
    {
        name: 'Condition1',
        icon: (props) => <ShuffleIcon {...props} className={cls.icon_them}/>,
        typeBlock: 'and',

        // acceptedOn: ['or', 'and'],
        type: 'condition',
        compile: (config, context) => `obj.val === "1"`
    },
    {
        name: 'Action1',
        icon: (props) => <PlaylistPlayIcon {...props} className={cls.icon_them}/>,
        typeBlock: 'then',

        // acceptedOn: ['then', 'else'],
        type: 'condition',
        compile: (config, context) => `setState('id', obj.val);`
    }
];

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
    useEffect(() => {
        setSwitches(allSwitches);
    }, []);

    const [hamburgerOnOff, setHamburgerOnOff] = useStateLocal(false, 'hamburgerOnOff');
    const [itemsSwitches, setItemsSwitches] = useStateLocal( [], 'itemsSwitches');//useState(code2json(props.code));
    const [filterText, setFilterText] = useState('');

    return <div className={cls.wrapper_rules}>
        <CustomDragLayer/>
        <div className={`${cls.hamburger_wrapper} ${hamburgerOnOff ? cls.hamburger_off : null}`}
             onClick={() => setHamburgerOnOff(!hamburgerOnOff)}><HamburgerMenu boolean={!hamburgerOnOff}/></div>
        <div className={`${cls.menu_rules} ${hamburgerOnOff ? cls.menu_off : null}`}>
            <CustomInput
                className={cls.input_width}
                fullWidth
                customValue
                value={filterText}
                autoComplete='off'
                label="search"
                variant="outlined"
                onChange={(value) => {
                    setFilterText(value);
                    setSwitches([...allSwitches.filter(({name}) => name.toLowerCase().indexOf(value.toLowerCase()) + 1)]);
                }}
            />
            <div className={cls.menu_title}>
                Switches
            </div>
            <div>
                {switches.map(({name, icon, typeBlock}) =>
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
                    />)}
                {switches.length === 0 && <div className={cls.nothing_found}>
                    Nothing found...
                    <div className={cls.reset_search} onClick={() => {
                        setFilterText('');
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
        />
        <ContentBlockItems
            setItemsSwitches={json => {
                setItemsSwitches(json);
                props.onChange(json2code(json));
            }}
            itemsSwitches={itemsSwitches}
            name='...and...'
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
            nameDop='else'
            dop
        />
    </div>;
}

// RulesEditor.propTypes = {

// };

export default RulesEditor;
