
import React, { Fragment, useEffect, useState } from 'react';
import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
import cls from './style.module.scss';
import { useDrop } from 'react-dnd';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import IconButton from '@material-ui/core/IconButton';
import IconHelp from '@material-ui/icons/HelpOutline';
import { deepCopy } from '../../helpers/deepCopy';

import CurrentItem from '../CurrentItem';
import { useStateLocal } from '../../hooks/useStateLocal';
import DragWrapper from '../DragWrapper';
import MaterialDynamicIcon from '../../helpers/MaterialDynamicIcon';
import DialogHelp from './DialogHelp';
import DialogCondition from './DialogCondition';
import clsx from 'clsx';

const AdditionallyContentBlockItems = ({ size, itemsSwitchesRender, blockValue, boolean, typeBlock, userRules, setUserRules, animation, setTourStep, tourStep, isTourOpen }) => {
    const [checkItem, setCheckItem] = useState(false);
    const [canDropCheck, setCanDropCheck] = useState(false);
    const [checkId, setCheckId] = useState(false);
    const [hoverBlock, setHoverBlock] = useState('');

    const options = useDrop({
        accept: 'box',
        drop: () => ({ blockValue }),
        hover: ({ acceptedBy, _id }, monitor) => {
            setCheckItem(acceptedBy === typeBlock);
            setCheckId(!!_id);
            setHoverBlock(monitor.getHandlerId());
        },
        canDrop: ({ acceptedBy }, monitor) => {
            setCanDropCheck(acceptedBy === typeBlock);
            return acceptedBy === typeBlock;
        },
        collect: monitor => ({
            isOver: monitor.isOver(),
            canDrop: monitor.getItem()?.acceptedBy === typeBlock,
            offset: monitor.getClientOffset(),
            targetId: monitor.targetId
        }),
    });

    const [{ canDrop, isOver, offset, targetId }, drop] = options;

    useEffect(() => { setHoverBlock('') }, [offset]);

    const isActive = canDrop && isOver;
    let backgroundColor = '';
    if (isActive) {
        backgroundColor = checkItem ? '#00fb003d' : '#fb00002e';
    } else if (canDrop) {
        backgroundColor = canDropCheck ? '#00fb003d' : '#fb00002e';
    } else if (offset) {
        backgroundColor = targetId === hoverBlock ? '#fb00002e' : '';
    }

    return <div ref={drop} style={{ backgroundColor }} className={`${clsx(cls.contentBlockItem,size && cls.addClassHeight)} ${boolean ? animation ? cls.contentHeightOn : null : cls.contentHeightOff}`}>
        <div className={cls.wrapperMargin}>{itemsSwitchesRender[blockValue]?.map(el => (
            <DragWrapper
                typeBlocks={typeBlock}
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
                />
            </DragWrapper>))}
            <div
                style={isActive && checkItem && !checkId ? { height: document.getElementById('height') ? document.getElementById('height').clientHeight : 200 } : null}
                className={`${cls.emptyBlockStyle} ${isActive && checkItem && !checkId ? cls.emptyBlock : cls.emptyBlockNone}`}
            />
        </div>
    </div>;
}

AdditionallyContentBlockItems.defaultProps = {
    children: null,
    boolean: true,
    animation: false
};

const ContentBlockItems = ({ size, typeBlock, name, nameAdditionally, additionally, border, userRules, setUserRules, iconName, adapter, socket, setTourStep, tourStep, isTourOpen }) => {
    const [additionallyClickItems, setAdditionallyClickItems, checkLocal] = useStateLocal(typeBlock === 'actions' ? false : [], `additionallyClickItems_${typeBlock}`);
    const [showHelp, setShowHelp] = useState(false);
    const [showConditionDialog, setShowConditionDialog] = useState(false);

    useEffect(() => {
        if (typeBlock === 'conditions' && additionallyClickItems.length !== userRules['conditions'].length - 1) {
            let newArray = [];
            userRules['conditions'].forEach((el, idx) => {
                if (idx > 0) {
                    newArray.push({
                        _id: Date.now(),
                        open: true
                    });
                }
            });
            setAdditionallyClickItems([...additionallyClickItems, ...newArray]);
        }
        if (typeBlock === 'actions' && !checkLocal && userRules['actions']['else'].length) {
            setAdditionallyClickItems(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [animation, setAnimation] = useState(false);

    return <div className={`${clsx(cls.mainBlockItemRules, size && cls.addClassOverflow)} ${border && !size ? cls.border : null}`}>
        <span id='width' className={cls.nameBlockItems}>
            <MaterialDynamicIcon iconName={iconName} className={cls.iconThemCard} adapter={adapter} socket={socket} />{name}
        </span>
        {typeBlock === 'conditions' ?
            <div style={{ width: '100%' }}>
                <Select
                    className={cls.selectOnChange}
                    value={userRules.justCheck || false}
                    onChange={e => {
                        const _userRules = deepCopy('conditions', userRules);
                        _userRules.justCheck = e.target.value;
                        setUserRules(_userRules);
                    }}
                >
                    <MenuItem value={false}>{I18n.t('on condition change')}</MenuItem>
                    <MenuItem value={true}>{I18n.t('just check')}</MenuItem>
                </Select>
                <IconButton size="small" title={I18n.t('Explanation')} className={cls.selectOnChangeHelp} onClick={() => setShowHelp(true)}>
                    <IconHelp className={cls.selectOnChangeHelpIcon} />
                </IconButton>
            </div>
            : null}
        <AdditionallyContentBlockItems
            setTourStep={setTourStep}
            tourStep={tourStep}
            isTourOpen={isTourOpen}
            blockValue={typeBlock === 'actions' ? 'then' : typeBlock === 'conditions' ? 0 : typeBlock}
            typeBlock={typeBlock}
            setUserRules={setUserRules}
            userRules={userRules}
            size={size}
            itemsSwitchesRender={typeBlock === 'actions' ? userRules['actions'] : typeBlock === 'conditions' ? userRules['conditions'] : userRules}
        />
        {additionally && [...Array(typeBlock === 'actions' ? 1 : userRules.conditions.length - 1)].map((e, index) => {
            const booleanAdditionally = (value = index) => Boolean(typeBlock === 'actions' ? additionallyClickItems : additionallyClickItems.find((el, idx) => idx === value && el.open));
            return <Fragment key={`${index}_block_${typeBlock}`}>
                <div
                    onClick={() => {
                        if (typeBlock === 'actions') {
                            setAdditionallyClickItems(!additionallyClickItems);
                            return null;
                        }
                        let newAdditionally = JSON.parse(JSON.stringify(additionallyClickItems));
                        if (userRules['conditions'][index + 1].length) {
                            newAdditionally[index].open = !newAdditionally[index].open
                            setAdditionallyClickItems(newAdditionally);
                            return null;
                        }
                        newAdditionally = newAdditionally.filter((el, idx) => idx !== index);
                        setAdditionallyClickItems(newAdditionally);
                        setAnimation(typeBlock === 'actions' ? true : index);
                        setTimeout(() => {
                            setAnimation(false);
                            setUserRules({ ...userRules, conditions: [...userRules.conditions.filter((el, idx) => idx !== index + 1)] });
                        }, 250);

                    }}
                    key={index} className={cls.blockCardAdd}>
                    {booleanAdditionally() ? '-' : '+'}<div className={cls.cardAdd}>
                        {nameAdditionally}
                    </div>
                </div>
                <AdditionallyContentBlockItems
                    blockValue={typeBlock === 'actions' ? 'else' : typeBlock === 'conditions' ? index + 1 : typeBlock}
                    typeBlock={typeBlock}
                    setUserRules={setUserRules}
                    itemsSwitchesRender={typeBlock === 'actions' ? userRules['actions'] : typeBlock === 'conditions' ? userRules['conditions'] : userRules}
                    userRules={userRules}
                    boolean={booleanAdditionally()}
                    animation={Boolean(animation === index)}
                    size={size}
                />
            </Fragment>
        })}
        {additionally && typeBlock === 'conditions' && <div
            onClick={() => {
                setAdditionallyClickItems([...additionallyClickItems, {
                    _id: Date.now(),
                    open: true
                }]);
                setUserRules({ ...userRules, conditions: [...userRules.conditions, []] });
                setAnimation(typeBlock === 'actions' ? true : userRules.conditions.length - 1);
                setTimeout(() => setAnimation(false), 1000);
            }}
            className={cls.blockCardAdd}
        >
            {'+'}
            <div className={cls.cardAdd}>
                {nameAdditionally}
            </div>
        </div>}
        <DialogHelp open={showHelp} onClose={() => setShowHelp(false)} />
        <DialogCondition open={showConditionDialog} onClose={() => setShowConditionDialog(false)} />
    </div>;
}

ContentBlockItems.defaultProps = {
    children: null,
    name: '',
    nameAdditionally: '',
    additionally: false,
    border: false,
    typeBlock: ''
};

ContentBlockItems.propTypes = {
    name: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    nameAdditionally: PropTypes.string,
    border: PropTypes.bool,
    additionally: PropTypes.bool,
    children: PropTypes.object,
    typeBlock: PropTypes.string,
    blockValue: PropTypes.string,
    userRules: PropTypes.object,
    setUserRules: PropTypes.func,
};

export default ContentBlockItems;