import React, { Fragment, useEffect, useState } from 'react';
import { type ConnectDropTarget, type XYCoord, useDrop } from 'react-dnd';

import { Select, MenuItem, IconButton } from '@mui/material';
import { HelpOutline as IconHelp } from '@mui/icons-material';

import {
    type AdminConnection,
    I18n,
    type IobTheme,
    type ThemeName,
    type ThemeType,
    Utils,
} from '@iobroker/adapter-react-v5';

import cls from './style.module.scss';
import { deepCopy } from '../../helpers/deepCopy';
import CurrentItem from '../CurrentItem';
import { useStateLocal } from '../../hooks/useStateLocal';
import DragWrapper from '../DragWrapper';
import MaterialDynamicIcon from '../../helpers/MaterialDynamicIcon';
import DialogHelp from './DialogHelp';
import DialogCondition from './DialogCondition';
import type { BlockValue, RuleBlockDescription, RuleBlockType, RuleUserRules, RuleBlockConfig } from '../../types';

interface AdditionallyContentBlockItemsProps {
    size: boolean;
    blockValue: BlockValue;
    boolean?: boolean;
    typeBlock: RuleBlockType;
    userRules: RuleUserRules;
    setUserRules: (newRules: RuleUserRules) => void;
    animation?: boolean;
    setTourStep?: (step: number) => void;
    tourStep?: number;
    isTourOpen?: boolean;
    theme: IobTheme;
    themeType: ThemeType;
    themeName: ThemeName;
}

const AdditionallyContentBlockItems = ({
    size,
    blockValue,
    boolean,
    typeBlock,
    userRules,
    setUserRules,
    animation,
    setTourStep,
    tourStep,
    isTourOpen,
    theme,
    themeType,
    themeName,
}: AdditionallyContentBlockItemsProps): React.JSX.Element => {
    const [checkItem, setCheckItem] = useState(false);
    const [canDropCheck, setCanDropCheck] = useState(false);
    const [checkId, setCheckId] = useState(false);
    const [hoverBlock, setHoverBlock] = useState('');

    if (boolean === undefined) {
        boolean = true;
    }

    const options: [unknown, ConnectDropTarget] = useDrop<RuleBlockDescription & { _id: number }>({
        accept: 'box',
        drop: () => ({ blockValue }),
        hover: ({ acceptedBy, _id }, monitor) => {
            setCheckItem(acceptedBy === typeBlock);
            setCheckId(!!_id);
            setHoverBlock((monitor.getHandlerId() as string) || '');
        },
        canDrop: ({ acceptedBy }) => {
            setCanDropCheck(acceptedBy === typeBlock);
            return acceptedBy === typeBlock;
        },
        collect: monitor => ({
            isOver: monitor.isOver(),
            canDrop: monitor.getItem()?.acceptedBy === typeBlock,
            offset: monitor.getClientOffset(),
            targetId: monitor.getHandlerId(),
        }),
    });

    const pr: {
        canDrop: boolean;
        isOver: boolean;
        offset: XYCoord | null;
        targetId: string;
    } = options[0] as {
        canDrop: boolean;
        isOver: boolean;
        offset: XYCoord | null;
        targetId: string;
    };

    const { canDrop, isOver, offset, targetId } = pr;
    const drop = options[1];

    useEffect(() => {
        setHoverBlock('');
    }, [offset]);

    const isActive = canDrop && isOver;
    let backgroundColor = '';
    if (isActive) {
        backgroundColor = checkItem ? '#00fb003d' : '#fb00002e';
    } else if (canDrop) {
        backgroundColor = canDropCheck ? '#00fb003d' : '#fb00002e';
    } else if (offset) {
        backgroundColor = targetId === hoverBlock ? '#fb00002e' : '';
    }

    let blocks: RuleBlockConfig[];
    if (typeBlock === 'actions') {
        blocks = userRules.actions[blockValue as 'else' | 'then'];
    } else if (typeBlock === 'conditions') {
        blocks = userRules.conditions[blockValue as number];
    } else {
        blocks = userRules.triggers;
    }

    return (
        <div
            ref={drop}
            style={{ backgroundColor }}
            className={`${Utils.clsx(cls.contentBlockItem, size && cls.addClassHeight)} ${boolean ? (animation ? cls.contentHeightOn : null) : cls.contentHeightOff}`}
        >
            <div className={cls.wrapperMargin}>
                {blocks.map((el: RuleBlockConfig) => (
                    <DragWrapper
                        typeBlock={typeBlock}
                        key={el._id}
                        {...el}
                        blockValue={blockValue}
                        allProperties={el}
                        userRules={userRules}
                        setUserRules={setUserRules}
                    >
                        <CurrentItem
                            {...el}
                            isTourOpen={isTourOpen}
                            setTourStep={setTourStep}
                            tourStep={tourStep}
                            settings={el}
                            blockValue={blockValue}
                            userRules={userRules}
                            setUserRules={setUserRules}
                            theme={theme}
                            themeType={themeType}
                            themeName={themeName}
                        />
                    </DragWrapper>
                ))}
                <div
                    style={
                        isActive && checkItem && !checkId
                            ? {
                                  height: document.getElementById('height')?.clientHeight || 200,
                              }
                            : undefined
                    }
                    className={`${cls.emptyBlockStyle} ${isActive && checkItem && !checkId ? cls.emptyBlock : cls.emptyBlockNone}`}
                />
            </div>
        </div>
    );
};

interface ContentBlockItemsProps {
    size: boolean;
    typeBlock: RuleBlockType;
    name: string | React.JSX.Element;
    nameAdditionally?: string;
    additionally?: boolean;
    border?: boolean;
    userRules: RuleUserRules;
    setUserRules: (newRules: RuleUserRules) => void;
    iconName: string;
    adapter?: string;
    socket: AdminConnection;
    setTourStep: (step: number) => void;
    tourStep: number;
    isTourOpen: boolean;
    theme: IobTheme;
    themeType: ThemeType;
    themeName: ThemeName;
}

const ContentBlockItems = ({
    size,
    typeBlock,
    name,
    nameAdditionally,
    additionally,
    border,
    userRules,
    setUserRules,
    iconName,
    adapter,
    socket,
    setTourStep,
    tourStep,
    isTourOpen,
    theme,
    themeType,
    themeName,
}: ContentBlockItemsProps): React.JSX.Element => {
    const [additionallyClickItems, setAdditionallyClickItems, checkLocal] = useStateLocal<
        { _id: number; open: boolean }[] | boolean
    >(typeBlock === 'actions' ? false : [], `additionallyClickItems_${typeBlock}`);

    const [showHelp, setShowHelp] = useState(false);
    const [showConditionDialog, setShowConditionDialog] = useState(false);

    useEffect(() => {
        if (
            typeBlock === 'conditions' &&
            (additionallyClickItems as { _id: number; open: boolean }[])?.length !== userRules.conditions.length - 1
        ) {
            const newArray: { _id: number; open: boolean }[] = [];
            userRules.conditions.forEach((el, idx) => {
                if (idx > 0) {
                    newArray.push({
                        _id: Date.now(),
                        open: true,
                    });
                }
            });
            setAdditionallyClickItems([...(additionallyClickItems as { _id: number; open: boolean }[]), ...newArray]);
        }
        if (typeBlock === 'actions' && !checkLocal && userRules.actions.else.length) {
            setAdditionallyClickItems(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [animation, setAnimation] = useState<boolean | number>(false);

    return (
        <div
            className={`${Utils.clsx(cls.mainBlockItemRules, size && cls.addClassOverflow)} ${border && !size ? cls.border : null}`}
        >
            <span
                id="width"
                className={cls.nameBlockItems}
            >
                <MaterialDynamicIcon
                    iconName={iconName}
                    className={cls.iconThemCard}
                    adapter={adapter}
                    socket={socket}
                />
                {name}
            </span>
            {typeBlock === 'conditions' ? (
                <div style={{ width: '100%' }}>
                    <Select
                        variant="standard"
                        className={cls.selectOnChange}
                        value={userRules.justCheck || false}
                        onChange={e => {
                            const _userRules = deepCopy('conditions', userRules);
                            _userRules.justCheck = e.target.value === 'true';
                            setUserRules(_userRules);
                        }}
                    >
                        <MenuItem value="false">{I18n.t('on condition change')}</MenuItem>
                        <MenuItem value="true">{I18n.t('just check')}</MenuItem>
                    </Select>
                    <IconButton
                        size="small"
                        title={I18n.t('Explanation')}
                        className={cls.selectOnChangeHelp}
                        onClick={() => setShowHelp(true)}
                    >
                        <IconHelp className={cls.selectOnChangeHelpIcon} />
                    </IconButton>
                </div>
            ) : null}
            <AdditionallyContentBlockItems
                setTourStep={setTourStep}
                tourStep={tourStep}
                isTourOpen={isTourOpen}
                blockValue={typeBlock === 'actions' ? 'then' : typeBlock === 'conditions' ? 0 : typeBlock}
                typeBlock={typeBlock}
                setUserRules={setUserRules}
                userRules={userRules}
                theme={theme}
                themeName={themeName}
                themeType={themeType}
                size={size}
            />
            {additionally &&
                [...Array(typeBlock === 'actions' ? 1 : userRules.conditions.length - 1)].map((e, index) => {
                    const booleanAdditionally = (value = index): boolean =>
                        typeBlock === 'actions'
                            ? !!additionallyClickItems
                            : !!(additionallyClickItems as { _id: number; open: boolean }[]).find(
                                  (el, idx) => idx === value && el.open,
                              );

                    return (
                        <Fragment key={`${index}_block_${typeBlock}`}>
                            <div
                                onClick={() => {
                                    if (typeBlock === 'actions') {
                                        setAdditionallyClickItems(!additionallyClickItems);
                                        return null;
                                    }
                                    let newAdditionally: { _id: number; open: boolean }[] = JSON.parse(
                                        JSON.stringify(additionallyClickItems),
                                    );
                                    if (userRules.conditions[index + 1].length) {
                                        newAdditionally[index].open = !newAdditionally[index].open;
                                        setAdditionallyClickItems(newAdditionally);
                                        return null;
                                    }

                                    newAdditionally = newAdditionally.filter((_el, idx) => idx !== index);

                                    setAdditionallyClickItems(newAdditionally);

                                    setAnimation(index);

                                    setTimeout(() => {
                                        setAnimation(false);
                                        setUserRules({
                                            ...userRules,
                                            conditions: [
                                                ...userRules.conditions.filter((el, idx) => idx !== index + 1),
                                            ],
                                        });
                                    }, 250);
                                }}
                                key={index}
                                className={cls.blockCardAdd}
                            >
                                {booleanAdditionally() ? '-' : '+'}
                                <div className={cls.cardAdd}>{nameAdditionally}</div>
                            </div>
                            <AdditionallyContentBlockItems
                                blockValue={
                                    typeBlock === 'actions'
                                        ? 'else'
                                        : typeBlock === 'conditions'
                                          ? index + 1
                                          : typeBlock
                                }
                                typeBlock={typeBlock}
                                setUserRules={setUserRules}
                                userRules={userRules}
                                boolean={booleanAdditionally()}
                                animation={Boolean(animation === index)}
                                size={size}
                                theme={theme}
                                themeName={themeName}
                                themeType={themeType}
                            />
                        </Fragment>
                    );
                })}
            {additionally && typeBlock === 'conditions' && (
                <div
                    onClick={() => {
                        setAdditionallyClickItems([
                            ...(additionallyClickItems as { _id: number; open: boolean }[]),
                            {
                                _id: Date.now(),
                                open: true,
                            },
                        ]);
                        setUserRules({ ...userRules, conditions: [...userRules.conditions, []] });
                        setAnimation(userRules.conditions.length - 1);
                        setTimeout(() => setAnimation(false), 1000);
                    }}
                    className={cls.blockCardAdd}
                >
                    {'+'}
                    <div className={cls.cardAdd}>{nameAdditionally}</div>
                </div>
            )}
            <DialogHelp
                open={showHelp}
                onClose={() => setShowHelp(false)}
            />
            <DialogCondition
                open={showConditionDialog}
                onClose={() => setShowConditionDialog(false)}
            />
        </div>
    );
};

export default ContentBlockItems;
