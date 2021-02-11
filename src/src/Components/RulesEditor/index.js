import React, { Fragment, useContext, useEffect, useState } from 'react';
import cls from './style.module.scss';
///////
import FlashOnIcon from '@material-ui/icons/FlashOn';
import HelpIcon from '@material-ui/icons/Help';
import PlayForWorkIcon from '@material-ui/icons/PlayForWork';
//////
import CustomInput from './components/CustomInput';
import { CustomDragLayer } from './components/CustomDragLayer';
import CustomDragItem from './components/CardMenu/CustomDragItem';
import ContentBlockItems from './components/ContentBlockItems';
import HamburgerMenu from './components/HamburgerMenu';
import { useStateLocal } from './hooks/useStateLocal';
import { AppBar, Tab, Tabs } from '@material-ui/core';
import { ContextWrapperCreate } from './components/ContextWrapper';
// import PropTypes from 'prop-types';


// eslint-disable-next-line no-unused-vars
const DEFAULT_RULE = {
    triggers: [],
    conditions: [[]],
    actions: {
        then: [],
        'else': []
    }
};

function compileTriggers(json, context, blocks) {
    const triggers = [];
    json.triggers.forEach(trigger => {
        const found = findBlock(trigger.id, blocks);
        if (found) {
            const text = found.compile(trigger, context);
            const conditions = compileConditions(json.conditions, context, blocks);
            const then = compileActions(json.actions.then, context, blocks);
            const _else = compileActions(json.actions.else, context, blocks);
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
function findBlock(type, blocks) {
    return blocks.find(block => block.name === type);
}

function compileActions(actions, context, blocks) {
    let result = [];
    actions && actions.forEach(action => {
        const found = findBlock(action.id, blocks);
        if (found) {
            result.push(found.compile(action, context));
        }
    });
    return `\t\t${result.join('\t\t\n')}` || '';
}

function compileConditions(conditions, context, blocks) {
    let result = [];
    conditions && conditions.forEach(ors => {
        if (ors.hasOwnProperty('length')) {
            const _ors = [];
            _ors && ors.forEach(block => {
                const found = findBlock(block.id, blocks);
                if (found) {
                    _ors.push(found.compile(block, context));
                }
            });
            result.push(_ors.join(' || '));
        } else {
            const found = findBlock(ors.id, blocks);
            if (found) {
                result.push(found.compile(ors, context));
            }
        }

    });
    return (result.join(') && (') || 'true');
}

function compile(json, blocks) {
    return compileTriggers(json, null, blocks);
}

// eslint-disable-next-line no-unused-vars
function code2json(code) {
    if (!code) {
        return DEFAULT_RULE;
    } else {
        const lines = code.split('\n');
        try {
            let json = lines.pop().replace(/^\/\//, '');
            json = JSON.parse(json);
            if (!json.triggers) {
                json = DEFAULT_RULE;
            }
            return json;
        } catch (e) {
            return DEFAULT_RULE;
        }
    }
}

// eslint-disable-next-line no-unused-vars
function json2code(json, blocks) {
    let code = `const demo = ${JSON.stringify(json, null, 2)};\n`;

    const compiled = compile(json, blocks);
    code += compiled;

    return code + '\n//' + JSON.stringify(json);
}

const RulesEditor = props => {
    // eslint-disable-next-line no-unused-vars
    const { state: { blocks } } = useContext(ContextWrapperCreate);
    const [switches, setSwitches] = useState([]);
    const [hamburgerOnOff, setHamburgerOnOff] = useStateLocal(false, 'hamburgerOnOff');
    const [itemsSwitches, setItemsSwitches] = useState(code2json(props.code)); //useStateLocal(DEFAULT_RULE, 'itemsSwitches');
    const [filter, setFilter] = useStateLocal({
        text: '',
        type: 'trigger',
        index: 0
    }, 'filterControlPanel');

    const setSwitchesFunc = (text = filter.text, typeFunc = filter.type) => {
        let newAllSwitches = [...blocks];
        newAllSwitches = newAllSwitches.filter(({ type, _name }) => _name.en.toLowerCase().indexOf(text.toLowerCase()) + 1);
        newAllSwitches = newAllSwitches.filter(({ type, _name }) => typeFunc === type);
        console.log(newAllSwitches);
        setSwitches(newAllSwitches);
    };

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
                                    props.onChange(json2code(json, blocks));
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
                props.onChange(json2code(json, blocks));
            }}
            itemsSwitches={itemsSwitches}
            name="when..."
            typeBlock="triggers"
        />
        <ContentBlockItems
            setItemsSwitches={json => {
                setItemsSwitches(json);
                props.onChange(json2code(json, blocks));
            }}
            itemsSwitches={itemsSwitches}
            name="...and..."
            typeBlock="conditions"
            nameAdditionally="or"
            additionally
            border
        />
        <ContentBlockItems
            setItemsSwitches={json => {
                setItemsSwitches(json);
                props.onChange(json2code(json, blocks));
            }}
            itemsSwitches={itemsSwitches}
            name="...then"
            typeBlock="actions"
            nameAdditionally="else"
            additionally
        />
    </div>;
}

// RulesEditor.propTypes = {

// };

export default RulesEditor;
