import React, { useEffect } from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { deepCopy } from '../../helpers/deepCopy';
import { filterElement } from '../../helpers/filterElement';
import { findCard, moveCard } from '../../helpers/cardSort';

const DragWrapper = ({ allProperties, id, isActive, setItemsSwitches, itemsSwitches, children, _id, blockValue }) => {
    const [{ opacity }, drag, preview] = useDrag({
        item: { ...allProperties, type: 'box', id, isActive, _id },
        end: (item, monitor) => {
            const { _acceptedBy } = item;
            let dropResult = monitor.getDropResult();
            let newItemsSwitches;
            if (!dropResult) {
                if (typeof _id === 'number' && !monitor.getTargetIds().length) {
                    newItemsSwitches = deepCopy(_acceptedBy, itemsSwitches, blockValue);
                    newItemsSwitches = filterElement(_acceptedBy, newItemsSwitches, blockValue, _id);
                    setItemsSwitches(newItemsSwitches);
                }
                return null;
            }
            let idNumber = typeof _id === 'number' ? _id : Date.now();
            newItemsSwitches = deepCopy(_acceptedBy, itemsSwitches, dropResult.blockValue);
            if (!_id) {
                switch (_acceptedBy) {
                    case 'actions':
                        if (blockValue) {
                            newItemsSwitches = filterElement(_acceptedBy, newItemsSwitches, blockValue, _id);
                        }
                        newItemsSwitches = filterElement(_acceptedBy, newItemsSwitches, dropResult.blockValue, _id);
                        newItemsSwitches[_acceptedBy][dropResult.blockValue].push({ ...item, nameBlock: dropResult.name, _id: idNumber });
                        return setItemsSwitches(newItemsSwitches);
                    case 'conditions':
                        if (typeof blockValue === 'number') {
                            newItemsSwitches = filterElement(_acceptedBy, newItemsSwitches, blockValue, _id);
                        };
                        newItemsSwitches = filterElement(_acceptedBy, newItemsSwitches, dropResult.blockValue, _id);
                        newItemsSwitches[_acceptedBy][dropResult.blockValue].push({ ...item, nameBlock: dropResult.name, _id: idNumber });
                        return setItemsSwitches(newItemsSwitches);
                    default:
                        newItemsSwitches = filterElement(_acceptedBy, newItemsSwitches, dropResult.blockValue, _id);
                        newItemsSwitches[_acceptedBy].push({ ...item, nameBlock: dropResult.name, _id: idNumber });
                        return setItemsSwitches(newItemsSwitches);
                    // return
                }
            }
        },
        collect: monitor => ({
            opacity: monitor.isDragging() ? 0.4 : 1,
            isDragging: monitor.isDragging()
        }),
    });

    const [, drop] = useDrop({
        accept: 'box',
        canDrop: () => false,
        hover({ _id: draggedId }) {
            if (_id && draggedId !== _id) {
                const { index: overIndex } = findCard(_id, itemsSwitches['triggers']);
                if (overIndex !== draggedId) {
                    moveCard(draggedId, overIndex, itemsSwitches['triggers'], setItemsSwitches, itemsSwitches);
                }
            }
        }
    });
    useEffect(() => {
        preview(getEmptyImage(), { captureDraggingState: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return <div key={id} ref={node => drag(drop(node))} style={{ opacity, display: 'flex', width: '100%' }}>{children}</div>;
}

DragWrapper.defaultProps = {
    name: '',
    active: false,
    id: '',
    _id: null
};

DragWrapper.propTypes = {
    name: PropTypes.string
};

export default DragWrapper;