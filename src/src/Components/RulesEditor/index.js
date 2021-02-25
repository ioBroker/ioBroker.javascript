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
import Compile from './Compile';
import MaterialDynamicIcon from './helpers/MaterialDynamicIcon';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import './helpers/stylesVariables.scss';

const RulesEditor = ({ code, onChange }) => {
    // eslint-disable-next-line no-unused-vars
    const { state: { blocks } } = useContext(ContextWrapperCreate);
    const [allBlocks, setAllBlocks] = useState([]);
    const [hamburgerOnOff, setHamburgerOnOff] = useStateLocal(false, 'hamburgerOnOff');
    const [theme, setTheme] = useStateLocal('themeStandart', 'themeRules');
    const [userRules, setUserRules] = useState(Compile.code2json(code)); //useStateLocal(DEFAULT_RULE, 'userRules');
    const [filter, setFilter] = useStateLocal({
        text: '',
        type: 'triggers',
        index: 0
    }, 'filterControlPanel');

    const setBlocksFunc = (text = filter.text, typeFunc = filter.type) => {
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
        document.getElementsByTagName('HTML')[0].className = theme;
    }, [theme]);
    useEffect(() => {
        setBlocksFunc();
        // onChange(Compile.json2code({
        //     triggers: [],
        //     conditions: [[]],
        //     actions: {
        //         then: [],
        //         'else': []
        //     }
        // },blocks))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [blocks]);

    const a11yProps = index => ({
        id: `scrollable-force-tab-${index}`,
        'aria-controls': `scrollable-force-tabpanel-${index}`
    });

    const handleChange = (event, newValue) => {
        setFilter({
            ...filter,
            index: newValue,
            type: ['triggers', 'conditions', 'actions'][newValue]
        });
        setBlocksFunc(filter.text, ['triggers', 'conditions', 'actions'][newValue]);
    };

    const onChangeBlocks = useCallback((json) => {
        setUserRules(json);
        onChange(Compile.json2code(json, blocks));
    }, [blocks, onChange]);

    return <div className={clsx(cls.wrapperRules, theme)}>
        <CustomDragLayer allBlocks={allBlocks} />
        <div className={`${cls.hamburgerWrapper} ${hamburgerOnOff ? cls.hamburgerOff : null}`}
            onClick={() => setHamburgerOnOff(!hamburgerOnOff)}><HamburgerMenu boolean={!hamburgerOnOff} /></div>
        <div className={`${cls.menuRules} ${hamburgerOnOff ? cls.menuOff : null}`}>
            <div className={cls.controlPanel}>
                <AppBar className={cls.controlPanelAppBar} position="static">
                    <Tabs
                        value={filter.index}
                        onChange={handleChange}
                    >
                        <Tab icon={<MaterialDynamicIcon iconName='FlashOn' />}
                            {...a11yProps(0)} />
                        <Tab icon={<MaterialDynamicIcon iconName='Help' />}
                            {...a11yProps(1)} />
                        <Tab icon={<MaterialDynamicIcon iconName='PlayForWork' />}
                            {...a11yProps(2)} />
                    </Tabs>
                </AppBar>
            </div>
            <div className={cls.switchesRenderWrapper}>
                <span>
                    {allBlocks.map(el => {
                        const { name, id, icon } = el.getStaticData();
                        return <Fragment key={id}>
                            <CustomDragItem
                                allProperties={el.getStaticData()}
                                name={name}
                                icon={icon}
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
            <div className={cls.blockTheme}>
                <div onClick={() => setTheme('themeStandart')} style={{ background: '#4caaf47d', borderColor: '#4caaf4', opacity: theme !== 'themeStandart' ? 0.4 : 1 }} className={cls.currentBlockTheme}></div>
                <div onClick={() => setTheme('themeGreen')} style={{ background: '#4cf4577d', borderColor: '#50f44c', opacity: theme !== 'themeGreen' ? 0.4 : 1 }} className={cls.currentBlockTheme}></div>
                <div onClick={() => setTheme('themeSilver')} style={{ background: '#f3f3f37d', borderColor: '#dedede', opacity: theme !== 'themeSilver' ? 0.4 : 1 }} className={cls.currentBlockTheme}></div>
            </div>
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
        <ContentBlockItems
            setUserRules={onChangeBlocks}
            userRules={userRules}
            name="when..."
            typeBlock="triggers"
            iconName='FlashOn'
        />
        <ContentBlockItems
            setUserRules={onChangeBlocks}
            userRules={userRules}
            name="...and..."
            typeBlock="conditions"
            iconName='Help'
            nameAdditionally="or"
            additionally
            border
        />
        <ContentBlockItems
            setUserRules={onChangeBlocks}
            userRules={userRules}
            name="...then"
            typeBlock="actions"
            iconName='PlayForWork'
            nameAdditionally="else"
            additionally
        />
    </div>;
}

RulesEditor.propTypes = {
    onChange: PropTypes.func,
    code: PropTypes.string
};

export default RulesEditor;
