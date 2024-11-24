import React, { Fragment, useContext, useEffect } from 'react';

import { AppBar, ClickAwayListener, Tab, Tabs } from '@mui/material';

import { I18n, Utils } from '@iobroker/adapter-react-v5';

import cls from './style.module.scss';

import CustomInput from '../CustomInput';
import CustomDragItem from '../CardMenu/CustomDragItem';
import HamburgerMenu from '../HamburgerMenu';
import { useStateLocal } from '../../hooks/useStateLocal';
import { ContextWrapperCreate } from '../ContextWrapper';
import MaterialDynamicIcon from '../../helpers/MaterialDynamicIcon';
import { STEPS } from '../../helpers/Tour';
import type { RuleBlockDescription, RuleBlockType, RuleUserRules } from '@/Components/RulesEditor/types';
import type { GenericBlock } from '@/Components/RulesEditor/components/GenericBlock';

interface MenuProps {
    addClass: Record<number, boolean>;
    setAllBlocks: (blocks: (typeof GenericBlock<any>)[]) => void;
    allBlocks: (typeof GenericBlock<any>)[];
    userRules: RuleUserRules;
    onChangeBlocks: (newRules: RuleUserRules) => void;
    setTourStep: (step: number) => void;
    tourStep: number;
    isTourOpen: boolean;
}

const Menu = ({
    addClass,
    setAllBlocks,
    allBlocks,
    userRules,
    onChangeBlocks,
    setTourStep,
    tourStep,
    isTourOpen,
}: MenuProps): React.JSX.Element => {
    const { blocks, socket } = useContext(ContextWrapperCreate);
    const [hamburgerOnOff, setHamburgerOnOff] = useStateLocal<boolean>(false, 'hamburgerOnOff');
    const [filter, setFilter] = useStateLocal<{
        text: string;
        type: RuleBlockType;
        index: number;
    }>(
        {
            text: '',
            type: 'triggers',
            index: 0,
        },
        'filterControlPanel',
    );

    const setBlocksFunc = (text = filter.text, typeFunc = filter.type): void => {
        if (!blocks) {
            return;
        }
        let newAllBlocks: (typeof GenericBlock<any>)[] = [...blocks];
        newAllBlocks = newAllBlocks.filter(el => {
            if (!text) {
                return true;
            }
            const { name }: RuleBlockDescription = el.getStaticData();
            return name && I18n.t(name).toLowerCase().includes(text.toLowerCase());
        });
        newAllBlocks = newAllBlocks.filter(el => typeFunc === el.getStaticData().acceptedBy);
        setAllBlocks(newAllBlocks);
    };

    const handleChange = (_event: React.SyntheticEvent, newValue: number): void => {
        if (isTourOpen && newValue === 0 && tourStep === STEPS.selectTriggers) {
            setTourStep(STEPS.addScheduleByDoubleClick);
        }

        if (isTourOpen && newValue === 2 && tourStep === STEPS.selectActions) {
            setTourStep(STEPS.addActionPrintText);
        }

        setFilter({
            ...filter,
            index: newValue,
            type: (['triggers', 'conditions', 'actions'] as RuleBlockType[])[newValue],
        });

        setBlocksFunc(filter.text, (['triggers', 'conditions', 'actions'] as RuleBlockType[])[newValue]);
    };

    const a11yProps = (index: number): { id: string; 'aria-controls': string } => ({
        id: `scrollable-force-tab-${index}`,
        'aria-controls': `scrollable-force-tabpanel-${index}`,
    });

    useEffect(() => {
        setBlocksFunc();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [blocks]);

    return (
        <ClickAwayListener
            mouseEvent={false}
            touchEvent="onTouchStart"
            onClickAway={() => setHamburgerOnOff(true)}
        >
            <div className={Utils.clsx(cls.menuWrapper, addClass[1035] && cls.addClassMenu)}>
                <div
                    className={`${cls.hamburgerWrapper} ${hamburgerOnOff ? cls.hamburgerOff : null}`}
                    onClick={() => setHamburgerOnOff(!hamburgerOnOff)}
                >
                    <HamburgerMenu bool={!hamburgerOnOff} />
                </div>
                <div
                    className={`${Utils.clsx(cls.menuRules, addClass[1035] && cls.addClassBackground, addClass[835] && cls.addClassPosition)} ${hamburgerOnOff ? cls.menuOff : null}`}
                >
                    <div className={cls.controlPanel}>
                        <AppBar
                            className={cls.controlPanelAppBar}
                            position="static"
                        >
                            <Tabs
                                value={filter.index}
                                onChange={handleChange}
                            >
                                <Tab
                                    className="blocks-triggers"
                                    title={I18n.t('Triggers')}
                                    icon={<MaterialDynamicIcon iconName="FlashOn" />}
                                    {...a11yProps(0)}
                                />
                                <Tab
                                    title={I18n.t('Conditions')}
                                    className="blocks-conditions"
                                    icon={<MaterialDynamicIcon iconName="Help" />}
                                    {...a11yProps(1)}
                                />
                                <Tab
                                    title={I18n.t('Actions')}
                                    className="blocks-actions"
                                    icon={<MaterialDynamicIcon iconName="PlayForWork" />}
                                    {...a11yProps(2)}
                                />
                            </Tabs>
                        </AppBar>
                    </div>
                    <div className={cls.switchesRenderWrapper}>
                        <span>
                            {allBlocks.map(el => {
                                const { name, id, icon, adapter } = el.getStaticData();
                                return (
                                    <Fragment key={id}>
                                        <CustomDragItem
                                            adapter={adapter}
                                            allProperties={el.getStaticData()}
                                            icon={icon}
                                            id={id}
                                            isActive={false}
                                            isTourOpen={isTourOpen}
                                            name={name}
                                            onTouchMove={() => setHamburgerOnOff(true)}
                                            setTourStep={setTourStep}
                                            setUserRules={onChangeBlocks}
                                            socket={socket}
                                            tourStep={tourStep}
                                            userRules={userRules}
                                        />
                                    </Fragment>
                                );
                            })}
                            {!allBlocks.length && (
                                <div className={cls.nothingFound}>
                                    {I18n.t('Nothing found')}...
                                    <div
                                        className={cls.resetSearch}
                                        onClick={() => {
                                            setFilter({
                                                ...filter,
                                                text: '',
                                            });
                                            setBlocksFunc('');
                                        }}
                                    >
                                        {I18n.t('reset search')}
                                    </div>
                                </div>
                            )}
                        </span>
                    </div>
                    <div className={Utils.clsx(cls.menuTitle, cls.marginAuto)} />
                    <CustomInput
                        className={cls.inputWidth}
                        fullWidth
                        customValue
                        value={filter.text}
                        size="small"
                        autoComplete="off"
                        label={I18n.t('search')}
                        variant="outlined"
                        onChange={value => {
                            setFilter({ ...filter, text: value as string });
                            setBlocksFunc(value as string);
                        }}
                    />
                </div>
            </div>
        </ClickAwayListener>
    );
};

export default Menu;
