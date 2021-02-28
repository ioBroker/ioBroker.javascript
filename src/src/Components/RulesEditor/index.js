import React, { Fragment, useCallback, useContext, useEffect, useState } from 'react';
import cls from './style.module.scss';
import CustomInput from './components/CustomInput';
import { CustomDragLayer } from './components/CustomDragLayer';
import CustomDragItem from './components/CardMenu/CustomDragItem';
import ContentBlockItems from './components/ContentBlockItems';
import HamburgerMenu from './components/HamburgerMenu';
import { useStateLocal } from './hooks/useStateLocal';
import { AppBar, Tab, Tabs } from '@material-ui/core';
import { ContextWrapperCreate } from './components/ContextWrapper';
import Compile from './helpers/Compile';
import MaterialDynamicIcon from './helpers/MaterialDynamicIcon';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import './helpers/stylesVariables.scss';
import {STEPS} from './helpers/Tour';

const RulesEditor = ({ code, onChange, themeName, setTourStep, tourStep, isTourOpen }) => {
    // eslint-disable-next-line no-unused-vars
    const { blocks, socket, setOnUpdate } = useContext(ContextWrapperCreate);
    const [allBlocks, setAllBlocks] = useState([]);
    const [hamburgerOnOff, setHamburgerOnOff] = useStateLocal(false, 'hamburgerOnOff');
    const [userRules, setUserRules] = useState(Compile.code2json(code));
    const [filter, setFilter] = useStateLocal({
        text: '',
        type: 'triggers',
        index: 0
    }, 'filterControlPanel');

    React.useEffect(() => {
        const newUserRules = Compile.code2json(code);
        if (JSON.stringify(newUserRules) !== JSON.stringify(userRules)) {
            setUserRules(newUserRules);
            setOnUpdate(true);
        }
        // eslint-disable-next-line
    }, [code]);

    const setBlocksFunc = (text = filter.text, typeFunc = filter.type) => {
        if (!blocks) {
            return;
        }
        let newAllBlocks = [...blocks];
        newAllBlocks = newAllBlocks.filter(el => {
            if (!text) {
                return true;
            }
            const { name } = el.getStaticData();
            return name && name.en.toLowerCase().includes(text.toLowerCase());
        });
        newAllBlocks = newAllBlocks.filter(el => typeFunc === el.getStaticData().acceptedBy);
        setAllBlocks(newAllBlocks);
    };

    useEffect(() => {
        document.getElementsByTagName('HTML')[0].className = themeName || 'blue';
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [themeName]);

    useEffect(() => {
        setBlocksFunc();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [blocks]);

    const a11yProps = index => ({
        id: `scrollable-force-tab-${index}`,
        'aria-controls': `scrollable-force-tabpanel-${index}`
    });

    const handleChange = (event, newValue) => {
        isTourOpen && (newValue === 0 && tourStep === STEPS.selectTriggers) && setTourStep(STEPS.addScheduleByDoubleClick);
        isTourOpen && (newValue === 2 && tourStep === STEPS.selectActions) && setTourStep(STEPS.addActionPrintText);

        setFilter({
            ...filter,
            index: newValue,
            type: ['triggers', 'conditions', 'actions'][newValue]
        });
        setBlocksFunc(filter.text, ['triggers', 'conditions', 'actions'][newValue]);
    };

    const onChangeBlocks = useCallback(json => {
        setUserRules(json);
        onChange(Compile.json2code(json, blocks));
    }, [blocks, onChange]);

    if (!blocks) {
        return null;
    }

    return <div className={clsx(cls.wrapperRules)}>
        <CustomDragLayer allBlocks={allBlocks} socket={socket} />
        <div className={cls.rootWrapper}>
            <div className={cls.menuWrapper}>
                <div className={`${cls.hamburgerWrapper} ${hamburgerOnOff ? cls.hamburgerOff : null}`}
                    onClick={() => setHamburgerOnOff(!hamburgerOnOff)}><HamburgerMenu boolean={!hamburgerOnOff} />
                </div>
                <div className={`${cls.menuRules} ${hamburgerOnOff ? cls.menuOff : null}`}>
                    <div className={cls.controlPanel}>
                        <AppBar className={cls.controlPanelAppBar} position="static">
                            <Tabs
                                value={filter.index}
                                onChange={handleChange}
                            >
                                <Tab className="blocks-triggers" icon={<MaterialDynamicIcon iconName='FlashOn' />}
                                    {...a11yProps(0)} />
                                <Tab className="blocks-conditions" icon={<MaterialDynamicIcon iconName='Help' />}
                                    {...a11yProps(1)} />
                                <Tab className="blocks-actions" icon={<MaterialDynamicIcon iconName='PlayForWork' />}
                                    {...a11yProps(2)} />
                            </Tabs>
                        </AppBar>
                    </div>
                    <div className={cls.switchesRenderWrapper}>
                        <span>
                            {allBlocks.map(el => {
                                const { name, id, icon, adapter } = el.getStaticData();
                                return <Fragment key={id}>
                                    <CustomDragItem
                                        setTourStep={setTourStep}
                                        tourStep={tourStep}
                                        isTourOpen={isTourOpen}
                                        allProperties={el.getStaticData()}
                                        name={name}
                                        icon={icon}
                                        adapter={adapter}
                                        socket={socket}
                                        userRules={userRules}
                                        setUserRules={onChangeBlocks}
                                        isActive={false}
                                        id={id}
                                    />
                                </Fragment>;
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
                    <div className={clsx(cls.menuTitle, cls.marginAuto)} />
                    <CustomInput
                        className={cls.inputWidth}
                        fullWidth
                        customValue
                        value={filter.text}
                        size="small"
                        autoComplete="off"
                        label="search"
                        variant="outlined"
                        onChange={(value) => {
                            setFilter({ ...filter, text: value });
                            setBlocksFunc(value);
                        }}
                    />
                </div>
            </div>
            <ContentBlockItems
                setUserRules={onChangeBlocks}
                userRules={userRules}
                isTourOpen={isTourOpen}
                setTourStep={setTourStep}
                tourStep={tourStep}
                name="when..."
                typeBlock="triggers"
                iconName="FlashOn"
            />
            <ContentBlockItems
                setUserRules={onChangeBlocks}
                isTourOpen={isTourOpen}
                setTourStep={setTourStep}
                tourStep={tourStep}
                userRules={userRules}
                name="...and..."
                typeBlock="conditions"
                iconName="Help"
                nameAdditionally="or"
                additionally
                border
            />
            <ContentBlockItems
                setUserRules={onChangeBlocks}
                isTourOpen={isTourOpen}
                setTourStep={setTourStep}
                tourStep={tourStep}
                userRules={userRules}
                name="...then"
                typeBlock="actions"
                iconName="PlayForWork"
                nameAdditionally="else"
                additionally
            />
        </div>
    </div>;
}

RulesEditor.propTypes = {
    onChange: PropTypes.func,
    code: PropTypes.string
};

export default RulesEditor;
