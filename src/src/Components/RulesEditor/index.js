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

// import I18n from '@iobroker/adapter-react/i18n';
// import DialogMessage from '@iobroker/adapter-react/Dialogs/Message';
const allSwitches = [
    {
        name: 'Trigger1',
        icon: props => <MusicNoteIcon {...props} className={cls.icon_them}/>,
        typeBlock: 'when',

        // acceptedOn: ['when'],
        type: 'trigger',
        compile: (config, action) => `schedule('* 1 * * *', async function (obj) {\t${action}});`
    },
    {
        name: 'Condition1',
        icon: (props) => <ShuffleIcon {...props} className={cls.icon_them}/>,
        typeBlock: 'and',

        // acceptedOn: ['or', 'and'],
        type: 'condition',
        compile: config => `obj.val === "1"`
    },
    {
        name: 'Action1',
        icon: (props) => <PlaylistPlayIcon {...props} className={cls.icon_them}/>,
        typeBlock: 'then',

        // acceptedOn: ['then', 'else'],
        type: 'condition',
        compile: config => `setState('id', obj.val);`
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

function compile(json) {
    let actions = [];
    json.actions.then.forEach(action => {
        const found = allSwitches.find(block => block.type === action.type);
        if (found) {
            actions.push(found.compile(action));
        }
    });
    const then = actions.join('\t\t\n') || '\t\t/* ignore */';

    actions = [];
    json.actions.then.forEach(action => {
        const found = allSwitches.find(block => block.type === action.type);
        if (found) {
            actions.push(found.compile(action));
        }
    });
    const _else = actions.join('\t\t\n') || '\t\t/* ignore */';

    let conditions = [];
    json.conditions.forEach(ors => {
        const _ors = [];
        ors.map(block => {
            const found = allSwitches.find(_block => _block.type === block.type);
            if (found) {
                _ors.push(found.compile(block));
            }
        });
        conditions.push(_ors.join(' || '));
    });
    const condition = '\tif (' + (conditions.join(') && (') || 'true') + ') {\n' + then + '\n\t} else {\n' + _else + '\n}';

    const triggers = [];
    json.triggers.forEach(trigger => {
        const found = allSwitches.find(_block => _block.type === trigger.type);
        if (found) {
            triggers.push(found.compile(trigger, condition));
        }
    });

    return triggers.join('\n\n');
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
    const code = `const demo = ${JSON.stringify(json, null, 2)};`;

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
