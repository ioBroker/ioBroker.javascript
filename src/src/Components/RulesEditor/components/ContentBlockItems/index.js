
import React, { Fragment } from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
import cls from './style.module.scss';
import { useDrop } from 'react-dnd';
// import { useStateLocal } from '../../hooks/useStateLocal';
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

const DopContentBlockItems = ({ boolean, children, name, itemsSwitches, setItemsSwitches }) => {
    const [{ canDrop, isOver }, drop] = useDrop({
        accept: 'box',
        drop: () => ({ name }),
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
            targetId: monitor.targetId
        }),
    });
    const isActive = canDrop && isOver;
    let backgroundColor = '';
    if (isActive) {
        backgroundColor = '#00fb003d';
    }
    else if (canDrop) {
        backgroundColor = '#fb00002e';
    }
    return <div ref={drop} style={{ backgroundColor }} className={`${cls.content_block_item} ${boolean ? null : cls.content_height_off}`}>
        {itemsSwitches.filter(el => el.nameBlock === name).map(el=> (
            <DragWrapper {...el} itemsSwitches={itemsSwitches} setItemsSwitches={setItemsSwitches} Icon={icon[el.name]}>
                <CurrentItem {...el} itemsSwitches={itemsSwitches} setItemsSwitches={setItemsSwitches} name={el.name} Icon={icon[el.name]} />
            </DragWrapper>))}
        {isActive ? <div className={cls.empty_block} /> : null}
    </div>;
}

DopContentBlockItems.defaultProps = {
    children: null,
    boolean: true
};

const ContentBlockItems = ({ children, name, nameDop, dop, border, dopLength, itemsSwitches, setItemsSwitches }) => {
    const [dopClickItems, setDopClickItems] = useStateLocal([], 'dopClickItems');
    return <div className={`${cls.main_block_item_rules} ${border ? cls.border : null}`}>
        <span>{name}</span>
        <DopContentBlockItems setItemsSwitches={setItemsSwitches} name={name} itemsSwitches={itemsSwitches}>
        </DopContentBlockItems>
        {dop && [...Array(dopLength)].map((e, index) => {
            const booleanDop = (value = index) => Boolean(dopClickItems.find(el => el === `${value}_dop`));
            return <Fragment key={`${index}_block`}><div
                onClick={() => {
                    let newDopClickItems = [...dopClickItems];
                    if (booleanDop()) {
                        let valueIndex = index;
                        if (booleanDop(1)) {
                            valueIndex = 1;
                        }
                        newDopClickItems = newDopClickItems.filter(el => el !== `${valueIndex}_dop`)
                    } else {
                        let valueIndex = 0;
                        if (booleanDop(0)) {
                            valueIndex = index;
                        }
                        newDopClickItems.push(`${valueIndex}_dop`)
                    }
                    setDopClickItems(newDopClickItems);
                }
                } key={index} className={cls.block_card_add}>
                <div className={cls.card_add}>
                    {nameDop}
                </div>{booleanDop() ? '-' : '+'}
            </div>
                <DopContentBlockItems setItemsSwitches={setItemsSwitches} itemsSwitches={itemsSwitches} name={`${name}_${index + 1}`} boolean={booleanDop()} />
            </Fragment>
        })}
    </div>;
}

ContentBlockItems.defaultProps = {
    children: null,
    name: '',
    nameDop: '',
    dop: false,
    border: false,
    dopLength: 1
};

ContentBlockItems.propTypes = {
    name: PropTypes.string,
    nameDop: PropTypes.string
};

export default ContentBlockItems;