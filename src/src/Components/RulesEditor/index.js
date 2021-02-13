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
import Compile from './Compile';
// import PropTypes from 'prop-types';

const RulesEditor = props => {
    // eslint-disable-next-line no-unused-vars
    const { state: { blocks } } = useContext(ContextWrapperCreate);
    const [allBlocks, setAllBlocks] = useState([]);
    const [hamburgerOnOff, setHamburgerOnOff] = useStateLocal(false, 'hamburgerOnOff');
    const [userRules, setUserRules] = useState(Compile.code2json(props.code)); //useStateLocal(DEFAULT_RULE, 'userRules');
    const [filter, setFilter] = useStateLocal({
        text: '',
        type: 'trigger',
        index: 0
    }, 'filterControlPanel');

    const setBlocksFunc = (text = filter.text, typeFunc = filter.type) => {
        let newAllBlocks = [...blocks];
        newAllBlocks = newAllBlocks.filter(el => {
            if (!text) {
                return true;
            }
            if (el.getStaticData) {
                const {name} = el.getStaticData();
                return name && name.en.toLowerCase().includes(text.toLowerCase());
            } else {
                return el.name && el.name.en.toLowerCase().includes(text.toLowerCase());
            }
        });
        newAllBlocks = newAllBlocks.filter(el => {
            if (el.getStaticData) {
                return typeFunc === el.getStaticData().type;
            } else {
                return typeFunc === el.type;
            }
        });

        console.log(newAllBlocks);
        setAllBlocks(newAllBlocks);
    };

    useEffect(() => {
        setBlocksFunc();
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
        setBlocksFunc(filter.text, ['trigger', 'condition', 'action'][newValue]);
    };

    if (!allBlocks.length) {
        return null;
    }

    return <div className={cls.wrapperRules}>
        <CustomDragLayer allBlocks={allBlocks}/>
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
                    setBlocksFunc(value);
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
                Blocks
            </div>
            <div className={cls.switchesRenderWrapper}>
                <span>
                    {allBlocks.map(el => {
                        if (el.getStaticData) {
                            const staticData = el.getStaticData();
                            return <Fragment key={staticData.id}>
                                <CustomDragItem
                                    allProperties={{object: el}}
                                    name={staticData.name}
                                    icon={staticData.icon}
                                    userRules={userRules}
                                    setUserRules={json => {
                                        setUserRules(json);
                                        props.onChange(Compile.json2code(json, blocks));
                                    }}
                                    isActive={false}
                                    id={staticData.id}
                                />
                            </Fragment>;
                        } else {
                            return <Fragment key={el.name.en}>
                                <CustomDragItem
                                    {...el}
                                    userRules={userRules}
                                    setUserRules={json => {
                                        setUserRules(json);
                                        props.onChange(Compile.json2code(json, blocks));
                                    }}
                                    isActive={false}
                                    id={el.name}
                                    allProperties={el}
                                />
                            </Fragment>;
                        }
                    })}
                    {allBlocks.length === 0 && <div className={cls.nothingFound}>
                        Nothing found...
                            <div className={cls.resetSearch} onClick={() => {
                            setFilter({
                                ...filter,
                                text: ''
                            });
                            setBlocksFunc('');
                        }}>reset search</div>
                    </div>}
                </span>
            </div>
        </div>

        <ContentBlockItems
            allBlocks={allBlocks}
            setUserRules={json => {
                // const _itemsSwitches = JSON.parse(JSON.stringify(userRules));
                // _itemsSwitches.triggers = json;
                setUserRules(json);
                props.onChange(Compile.json2code(json, blocks));
            }}
            userRules={userRules}
            name="when..."
            typeBlock="triggers"
        />
        <ContentBlockItems
            allBlocks={allBlocks}
            setUserRules={json => {
                setUserRules(json);
                props.onChange(Compile.json2code(json, blocks));
            }}
            userRules={userRules}
            name="...and..."
            typeBlock="conditions"
            nameAdditionally="or"
            additionally
            border
        />
        <ContentBlockItems
            allBlocks={allBlocks}
            setUserRules={json => {
                setUserRules(json);
                props.onChange(Compile.json2code(json, blocks));
            }}
            userRules={userRules}
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
