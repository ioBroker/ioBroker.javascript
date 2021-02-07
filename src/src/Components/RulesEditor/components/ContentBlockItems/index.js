
import React, { Fragment, useEffect, useState } from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
import cls from './style.module.scss';
import { useDrop } from 'react-dnd';
import CurrentItem from '../CurrentItem';
import { useStateLocal } from '../../hooks/useStateLocal';
import MusicNoteIcon from '@material-ui/icons/MusicNote';
import ShuffleIcon from '@material-ui/icons/Shuffle';
import PlaylistPlayIcon from '@material-ui/icons/PlaylistPlay';
import DragWrapper from '../DragWrapper';

const icon = {
    'Trigger1': (props) => <MusicNoteIcon {...props} />,
    'Condition1': (props) => <ShuffleIcon {...props} />,
    'Action1': (props) => <PlaylistPlayIcon {...props} />
}

const AdditionallyContentBlockItems = ({ itemsSwitchesRender, blockValue, boolean, typeBlock, name, itemsSwitches, setItemsSwitches }) => {
    const [checkItem, setCheckItem] = useState(false);
    const [canDropCheck, setCanDropCheck] = useState(false);
    const [hoverBlock, setHoverBlock] = useState('');
    const [{ canDrop, isOver, offset, targetId }, drop] = useDrop({
        accept: 'box',
        drop: () => ({ name, blockValue }),
        hover: (item, monitor) => {
            setCheckItem(item.typeBlock === typeBlock);
            setHoverBlock(monitor.getHandlerId())
        },
        canDrop: (item, monitor) => {
            setCanDropCheck(item.typeBlock === typeBlock);
            return item.typeBlock === typeBlock
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
        {itemsSwitchesRender[blockValue]?.filter(el => el.nameBlock === name).map((el, idx) => (
            <Fragment key={`additionally_content_${name}_${idx}`}>
                <DragWrapper {...el} blockValue={blockValue} allProperties={el} itemsSwitches={itemsSwitches} setItemsSwitches={setItemsSwitches} Icon={icon[el.name]}>
                    <CurrentItem {...el} blockValue={blockValue} itemsSwitches={itemsSwitches} setItemsSwitches={setItemsSwitches} Icon={icon[el.name]} />
                </DragWrapper>
            </Fragment>))}
        {isActive && checkItem ? <div className={cls.emptyBlock} /> : null}
    </div>;
}

AdditionallyContentBlockItems.defaultProps = {
    children: null,
    boolean: true
};

const ContentBlockItems = ({ blockValue, typeBlock, name, nameAdditionally, additionally, border, itemsSwitches, setItemsSwitches }) => {
    const [additionallyClickItems, setAdditionallyClickItems] = useStateLocal(blockValue === 'actions' ? false : [], `additionallyClickItems_${blockValue}`);
    useEffect(() => {
        if (blockValue === 'conditions' && additionallyClickItems.length !== itemsSwitches['conditions'].length - 1) {
            let newArray = [];

            itemsSwitches['conditions'].forEach((el, idx) => {
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
        <span>{name}</span>
        <AdditionallyContentBlockItems
            blockValue={blockValue === 'actions' ? 'then' : blockValue === 'conditions' ? 0 : blockValue}
            typeBlock={typeBlock}
            setItemsSwitches={setItemsSwitches}
            name={name}
            itemsSwitches={itemsSwitches}
            itemsSwitchesRender={blockValue === 'actions' ? itemsSwitches['actions'] : blockValue === 'conditions' ? itemsSwitches['conditions'] : itemsSwitches}
        />
        {additionally && [...Array(blockValue === 'actions' ? 1 : itemsSwitches.conditions.length - 1)].map((e, index) => {
            const booleanAdditionally = (value = index) => Boolean(blockValue === 'actions' ? additionallyClickItems : additionallyClickItems.find(el => el.index === value && el.open));
            return <Fragment key={`${index}_block`}><div
                onClick={() => {
                    if (blockValue === 'actions') {
                        setAdditionallyClickItems(!additionallyClickItems)
                        return null;
                    }
                    let newAdditionally = JSON.parse(JSON.stringify(additionallyClickItems));
                    if (itemsSwitches['conditions'][index + 1].length) {
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
                    setItemsSwitches({ ...itemsSwitches, conditions: [...itemsSwitches.conditions.filter((el, idx) => idx !== index + 1)] });
                }}
                key={index} className={cls.blockCardAdd}>
                {booleanAdditionally() ? '-' : '+'}<div className={cls.cardAdd}>
                    {nameAdditionally}
                </div>
            </div>
                <AdditionallyContentBlockItems
                    blockValue={blockValue === 'actions' ? 'else' : blockValue === 'conditions' ? index + 1 : blockValue}
                    typeBlock={typeBlock} setItemsSwitches={setItemsSwitches}
                    itemsSwitchesRender={blockValue === 'actions' ? itemsSwitches['actions'] : blockValue === 'conditions' ? itemsSwitches['conditions'] : itemsSwitches}
                    itemsSwitches={itemsSwitches}
                    name={`${name}_${index + 1}`}
                    boolean={booleanAdditionally()}
                />
            </Fragment>
        })}
        {additionally && blockValue === 'conditions' && (<div
            onClick={() => {
                setAdditionallyClickItems([...additionallyClickItems, {
                    index: additionallyClickItems.length,
                    open: true
                }]);
                setItemsSwitches({ ...itemsSwitches, conditions: [...itemsSwitches.conditions, []] });
            }}
            className={cls.blockCardAdd}>
            {'+'}<div className={cls.cardAdd}>
                {nameAdditionally}
            </div></div>)}
    </div>;
}

ContentBlockItems.defaultProps = {
    children: null,
    name: '',
    nameAdditionally: '',
    additionally: false,
    border: false,
    typeBlock: '',
    blockValue: ''
};

ContentBlockItems.propTypes = {
    name: PropTypes.string,
    nameAdditionally: PropTypes.string,
    border: PropTypes.bool,
    additionally: PropTypes.bool,
    children: PropTypes.object,
    typeBlock: PropTypes.string,
    blockValue: PropTypes.string,
    itemsSwitches: PropTypes.object,
    setItemsSwitches: PropTypes.func
};

export default ContentBlockItems;