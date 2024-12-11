import React from 'react';
import { useDragLayer, type XYCoord } from 'react-dnd';

import CardMenu from '../CardMenu';
import CurrentItem from '../CurrentItem';
import type { AdminConnection } from '@iobroker/adapter-react-v5';

const layerStyles: React.CSSProperties = {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: 100,
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
};

const snapToGrid = (x: number, y: number): [number, number] => {
    const snappedX = Math.round(x / 32) * 32;
    const snappedY = Math.round(y / 32) * 32;
    return [snappedX, snappedY];
};

const getItemStyles = (
    initialOffset: XYCoord | null,
    currentOffset: XYCoord | null,
    isSnapToGrid?: boolean,
): React.CSSProperties => {
    if (!initialOffset || !currentOffset) {
        return {
            display: 'none',
        };
    }
    let { x, y } = currentOffset;
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
        WebkitTransform: transform,
    };
};

interface CustomDragLayerProps {
    socket: AdminConnection;
    allBlocks: any;
}

export const CustomDragLayer = (props: CustomDragLayerProps): React.JSX.Element | null => {
    const { itemType, isDragging, item, initialOffset, currentOffset, targetIds } = useDragLayer(monitor => ({
        item: monitor.getItem(),
        itemType: monitor.getItemType(),
        initialOffset: monitor.getInitialSourceClientOffset(),
        currentOffset: monitor.getSourceClientOffset(),
        isDragging: monitor.isDragging(),
        // @ts-expect-error fix later
        targetIds: monitor.getTargetIds(),
    }));

    const renderItem = (): React.JSX.Element | null => {
        switch (itemType) {
            case 'box':
                return targetIds.length ? (
                    <CurrentItem
                        active
                        {...item}
                        allBlocks={props.allBlocks}
                    />
                ) : (
                    <CardMenu
                        active
                        {...item}
                        socket={props.socket}
                    />
                );
            default:
                return null;
        }
    };

    if (!isDragging) {
        return null;
    }

    return (
        <div style={layerStyles}>
            <div style={getItemStyles(initialOffset, currentOffset)}>{renderItem()}</div>
        </div>
    );
};
