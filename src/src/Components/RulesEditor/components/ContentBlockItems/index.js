
import React, { Fragment, useContext, useEffect, useState } from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
import cls from './style.module.scss';
import { useDrop } from 'react-dnd';
import CurrentItem from '../CurrentItem';
import { useStateLocal } from '../../hooks/useStateLocal';
import DragWrapper from '../DragWrapper';
import { ContextWrapperCreate } from '../ContextWrapper';
// import update from 'immutability-helper';

const AdditionallyContentBlockItems = ({ itemsSwitchesRender, blockValue, boolean, typeBlock, name, userRules, setUserRules }) => {
    const [checkItem, setCheckItem] = useState(false);
    const { state: { blocks } } = useContext(ContextWrapperCreate);
    const [canDropCheck, setCanDropCheck] = useState(false);
    const [checkId, setCheckId] = useState(false);
    const [hoverBlock, setHoverBlock] = useState('');
    const [{ canDrop, isOver, offset, targetId }, drop] = useDrop({
        accept: 'box',
        drop: () => ({ name, blockValue }),
        hover: (item, monitor) => {
            let _object = blocks.find(el => {
                const staticData = el.getStaticData();
                return staticData.id === item.id;
            }).getStaticData();
            let { acceptedBy } = _object;
            setCheckItem(acceptedBy === typeBlock);
            setCheckId(!!item._id);
            setHoverBlock(monitor.getHandlerId());
        },
        canDrop: (item, monitor) => {
            let _object = blocks.find(el => {
                const staticData = el.getStaticData();
                return staticData.id === item.id;
            }).getStaticData();
            let acceptedBy = _object.acceptedBy;
            setCanDropCheck(acceptedBy === typeBlock);
            return acceptedBy === typeBlock;
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
            offset: monitor.getClientOffset(),
            targetId: monitor.targetId
        }),
    });
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
    return <div ref={drop} style={{ backgroundColor }} className={`${cls.contentBlockItem} ${boolean ? null : cls.contentHeightOff}`}>
        <div className={cls.wrapperMargin}>{itemsSwitchesRender[blockValue]?.filter(el => el.nameBlock === name).map((el, idx) => (
            <DragWrapper typeBlocks={typeBlock} key={el._id} {...el} blockValue={blockValue} allProperties={el} userRules={userRules} setUserRules={setUserRules}>
                <CurrentItem {...el} blockValue={blockValue} userRules={userRules} setUserRules={setUserRules} />
            </DragWrapper>))}</div>
        {isActive && checkItem && !checkId ? <div className={cls.emptyBlock} /> : null}
    </div>;
}

AdditionallyContentBlockItems.defaultProps = {
    children: null,
    boolean: true
};

const ContentBlockItems = ({ typeBlock, name, nameAdditionally, additionally, border, userRules, setUserRules }) => {
    const [additionallyClickItems, setAdditionallyClickItems] = useStateLocal(typeBlock === 'actions' ? false : [], `additionallyClickItems_${typeBlock}`);
    useEffect(() => {
        if (typeBlock === 'conditions' && additionallyClickItems.length !== userRules['conditions'].length - 1) {
            let newArray = [];

            userRules['conditions'].forEach((el, idx) => {
                if (idx > 0) {
                    newArray.push({
                        index: idx - 1,
                        open: true
                    });
                }
            });

            setAdditionallyClickItems([...additionallyClickItems, ...newArray]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <div className={`${cls.mainBlockItemRules} ${border ? cls.border : null}`}>
        <span className={cls.nameBlockItems}>{name}</span>
        <AdditionallyContentBlockItems
            blockValue={typeBlock === 'actions' ? 'then' : typeBlock === 'conditions' ? 0 : typeBlock}
            typeBlock={typeBlock}
            setUserRules={setUserRules}
            name={name}
            userRules={userRules}
            itemsSwitchesRender={typeBlock === 'actions' ? userRules['actions'] : typeBlock === 'conditions' ? userRules['conditions'] : userRules}
        />
        {additionally && [...Array(typeBlock === 'actions' ? 1 : userRules.conditions.length - 1)].map((e, index) => {
            const booleanAdditionally = (value = index) => Boolean(typeBlock === 'actions' ? additionallyClickItems : additionallyClickItems.find(el => el.index === value && el.open));
            return <Fragment key={`${index}_block`}><div
                onClick={() => {
                    if (typeBlock === 'actions') {
                        setAdditionallyClickItems(!additionallyClickItems);
                        return null;
                    }
                    let newAdditionally = JSON.parse(JSON.stringify(additionallyClickItems));
                    if (userRules['conditions'][index + 1].length) {
                        newAdditionally[index].open = !newAdditionally[index].open
                        setAdditionallyClickItems(newAdditionally);
                        return null
                    }
                    newAdditionally = newAdditionally.filter(el => el.index !== index);
                    if (newAdditionally.length > index) {
                        newAdditionally.forEach((element, idx) => {
                            if (idx > index) {
                                newAdditionally[idx].index = idx - 1;
                            }
                        });
                    }
                    setAdditionallyClickItems(newAdditionally);
                    setUserRules({ ...userRules, conditions: [...userRules.conditions.filter((el, idx) => idx !== index + 1)] });
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
                    name={`${name}_${index + 1}`}
                    boolean={booleanAdditionally()}
                />
            </Fragment>
        })}
        {additionally && typeBlock === 'conditions' && <div
            onClick={() => {
                setAdditionallyClickItems([...additionallyClickItems, {
                    index: additionallyClickItems.length,
                    open: true
                }]);
                setUserRules({ ...userRules, conditions: [...userRules.conditions, []] });
            }}
            className={cls.blockCardAdd}
        >
            {'+'}
            <div className={cls.cardAdd}>
                {nameAdditionally}
            </div>
        </div>}
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