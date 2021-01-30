
import React from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
import cls from './style.module.scss';
import { useDrop } from 'react-dnd';

const ContentBlockItems = ({ children, name, nameDop, dop, border, dopLength }) => {
    const [{ canDrop, isOver }, drop] = useDrop({
        accept: 'box',
        drop: () => ({ name: 'Dustbin' }),
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    })
    const isActive = canDrop && isOver;
    let backgroundColor = '';
    if (isActive) {
        backgroundColor = '#00fb003d';
    }
    else if (canDrop) {
        backgroundColor = '#fb00002e';
    }
    return (
        <div ref={drop} style={{ backgroundColor }} className={`${cls.main_block_item_rules} ${border ? cls.border : null}`}>
            <span>{name}</span>
            <div className={cls.content_block_item}>
                {children}
                {isActive ? <div className={cls.empty_block} /> : null}
            </div>
            {/* <div className={cls.content_block_item}>
                {children}
                {isActive?<div className={cls.empty_block}/>:null}
            </div> */}
            {dop && [...Array(dopLength)].map((e, index) => <div key={index} className={cls.block_card_add}>
                <div className={cls.card_add}>
                    {nameDop}
                </div>+
            </div>)}
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