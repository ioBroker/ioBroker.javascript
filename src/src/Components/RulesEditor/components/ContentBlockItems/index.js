
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
    'Audio': (props) => <MusicNoteIcon {...props} />,
    'Shuffle': (props) => <ShuffleIcon {...props} />,
    'Playlist Play': (props) => <PlaylistPlayIcon {...props} />
}

const DopContentBlockItems = ({ boolean, children, name, itemsSwitches, setItmesSwitches }) => {
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
    return (<div ref={drop} style={{ backgroundColor }} className={`${cls.content_block_item} ${boolean ? null : cls.content_heigth_off}`}>
        {itemsSwitches.filter(el => el.nameBlock === name).map((el, index) => (
            <DragWrapper {...el} itemsSwitches={itemsSwitches} setItmesSwitches={setItmesSwitches} Icon={icon[el.name]}><CurrentItem {...el} itemsSwitches={itemsSwitches} setItmesSwitches={setItmesSwitches} name={el.name} Icon={icon[el.name]} /></DragWrapper>))}
        {isActive ? <div className={cls.empty_block} /> : null}
    </div>)
}

DopContentBlockItems.defaultProps = {
    children: null,
    boolean: true
};

const ContentBlockItems = ({ children, name, nameDop, dop, border, dopLength, itemsSwitches, setItmesSwitches }) => {
    const [dopClickItems, setDopClickItems] = useStateLocal([], "dopClickItems");
    return (
        <div className={`${cls.main_block_item_rules} ${border ? cls.border : null}`}>
            <span>{name}</span>
            <DopContentBlockItems setItmesSwitches={setItmesSwitches} name={name} itemsSwitches={itemsSwitches}>
            </DopContentBlockItems>
            {dop && [...Array(dopLength)].map((e, index) => {
                const boleanDop = (value = index) => Boolean(dopClickItems.find(el => el === `${value}_dop`));
                return <Fragment key={`${index}_block`}><div
                    onClick={() => {
                        let newDopClickItems = [...dopClickItems];
                        if (boleanDop()) {
                            let valueIndex = index;
                            if (boleanDop(1)) {
                                valueIndex = 1;
                            }
                            newDopClickItems = newDopClickItems.filter(el => el !== `${valueIndex}_dop`)
                        } else {
                            let valueIndex = 0;
                            if (boleanDop(0)) {
                                valueIndex = index;
                            }
                            newDopClickItems.push(`${valueIndex}_dop`)
                        }
                        setDopClickItems(newDopClickItems);
                    }
                    } key={index} className={cls.block_card_add}>
                    <div className={cls.card_add}>
                        {nameDop}
                    </div>{boleanDop() ? '-' : '+'}
                </div>
                    <DopContentBlockItems setItmesSwitches={setItmesSwitches} itemsSwitches={itemsSwitches} name={`${name}_${index + 1}`} boolean={boleanDop()} />
                </Fragment>
            })}
        </div>);
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