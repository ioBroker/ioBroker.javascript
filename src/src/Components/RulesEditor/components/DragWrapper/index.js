import React, { useEffect } from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
import { useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';

const DragWrapper = ({ Icon, name, id, isActive, typeBlock, setItmesSwitches, itemsSwitches, children, _id }) => {
    const [{ opacity }, drag, preview] = useDrag({
        item: { type: 'box', Icon, name, id, isActive, typeBlock, _id },
        begin: (monitor) => {
            // debugger
        },
        end: (item, monitor) => {
            let dropResult = monitor.getDropResult();
            if (!dropResult) {
                setItmesSwitches([...itemsSwitches.filter(el => el._id !== _id)]);
                return null;
            }
            // debugger
            setItmesSwitches([...itemsSwitches.filter(el => el._id !== _id), { ...item, nameBlock: dropResult.name }]);
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
    return <div key={id} ref={drag} style={{ opacity }}>{children}</div>;
}

DragWrapper.defaultProps = {
    Icon: null,
    name: '',
    active: false,
    id: ''
};

DragWrapper.propTypes = {
    name: PropTypes.string
};

export default DragWrapper;