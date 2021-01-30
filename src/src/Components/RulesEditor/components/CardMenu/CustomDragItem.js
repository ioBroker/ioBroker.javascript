import React, { useEffect } from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
import { useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import CardMenu from '.';

const CustomDragItem = ({ Icon, name, id, isActive }) => {
    const [{ opacity }, drag, preview] = useDrag({
        item: { type: 'box', Icon, name, id, isActive },
        begin: (monitor) => {
            // debugger
        },
        collect: (monitor) => ({
            opacity: monitor.isDragging() ? 0.4 : 1,
            isDragging: monitor.isDragging()
        }),
    });
    useEffect(() => {
        preview(getEmptyImage(), { captureDraggingState: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return <div key={id} ref={drag} style={{ opacity }}><CardMenu Icon={Icon} name={name} id={id} isActive={isActive} /></div>;
}

CustomDragItem.defaultProps = {
    Icon: null,
    name: '',
    active: false,
    id: ''
};

CustomDragItem.propTypes = {
    name: PropTypes.string
};

export default CustomDragItem;