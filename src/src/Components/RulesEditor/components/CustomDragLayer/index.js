import React from 'react';
import {useDragLayer} from 'react-dnd';
import CardMenu from '../CardMenu';
import CurrentItem from '../CurrentItem';

const layerStyles = {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: 100,
    left: 0,
    top: 0,
    width: '100%',
    height: '100%'
};

const snapToGrid = (x, y) => {
    const snappedX = Math.round(x / 32) * 32
    const snappedY = Math.round(y / 32) * 32
    return [snappedX, snappedY]
}

const getItemStyles = (initialOffset, currentOffset, isSnapToGrid) => {
    if (!initialOffset || !currentOffset) {
        return {
            display: 'none'
        };
    }
    let {x, y} = currentOffset;
    if (isSnapToGrid) {
        x -= initialOffset.x;
        y -= initialOffset.y;
        [x, y] = snapToGrid(x, y);
        x += initialOffset.x;
        y += initialOffset.y;
    }
    const transform = `translate(${x}px, ${y}px)`;
    return {
        transform,
        WebkitTransform: transform
    };
}

export const CustomDragLayer = (props) => {
    const {
        itemType,
        isDragging,
        item,
        initialOffset,
        currentOffset,
        isActive,
        issas
    } = useDragLayer((monitor) => ({
        item: monitor.getItem(),
        itemType: monitor.getItemType(),
        initialOffset: monitor.getInitialSourceClientOffset(),
        currentOffset: monitor.getSourceClientOffset(),
        isDragging: monitor.isDragging(),
        isActive: monitor,
        issas: monitor.getTargetIds()
    }));
    console.log(issas, 'sss', isActive)
    const renderItem = () => {
        switch (itemType) {
            case 'box':
                return issas.length ? <CurrentItem name={item.name} Icon={item.Icon} id={item.id}/> :
                    <CardMenu active name={item.name} Icon={item.Icon} id={item.id}/>;
            default:
                return null;
        }
    }
    if (!isDragging) {
        return null;
    }
    return <div style={layerStyles}>
        <div style={getItemStyles(initialOffset, currentOffset)}>
            {renderItem()}
        </div>
    </div>;
};
