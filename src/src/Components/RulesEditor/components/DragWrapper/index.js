import React, { useEffect, useRef } from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { deepCopy } from '../../helpers/deepCopy';
import { filterElement } from '../../helpers/filterElement';
import { findCard, moveCard } from '../../helpers/cardSort';

const DragWrapper = ({ typeBlocks, allProperties, id, isActive, setItemsSwitches, itemsSwitches, children, _id, blockValue }) => {
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
            if (dropResult.blockValue !== blockValue) {
                let idNumber = typeof _id === 'number' ? _id : Date.now();
                newItemsSwitches = deepCopy(_acceptedBy, itemsSwitches, dropResult.blockValue);
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
                }
            }
        },
        collect: monitor => ({
            opacity: monitor.isDragging() ? 0.4 : 1,
            isDragging: monitor.isDragging(),
        }),
    });
    const ref = useRef(null)
    const [, drop] = useDrop({
        accept: 'box',
        canDrop: () => false,
        hover({ _id: draggedId, _acceptedBy }, monitor) {
            if (!ref.current) {
                return;
            }
            // console.log(typeBlocks,_acceptedBy)
            if (typeBlocks !== _acceptedBy) {
                return
            }
            // console.log(monitor, monitor.getHandlerId(), blockValue)
            // Determine rectangle on screen
            const hoverBoundingRect = ref.current?.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const clientOffset = monitor.getClientOffset();
            const hoverClientY = clientOffset.y - hoverBoundingRect.top;

            if (!!_id && draggedId !== _id) {
                switch (_acceptedBy) {
                    case 'actions':
                        if (blockValue === 'then' || blockValue === 'else') {
                            const { index: overIndexActions } = findCard(_id, itemsSwitches[_acceptedBy][blockValue]);
                            if (overIndexActions !== draggedId) {
                                moveCard(draggedId,
                                    overIndexActions,
                                    itemsSwitches[_acceptedBy][blockValue],
                                    setItemsSwitches,
                                    itemsSwitches,
                                    _acceptedBy,
                                    blockValue,
                                    hoverClientY,
                                    hoverMiddleY);
                            }
                        }
                        return;
                    case 'conditions':
                        if (typeof blockValue === 'number') {
                            const { index: overIndexConditions } = findCard(_id, itemsSwitches[_acceptedBy][blockValue]);
                            if (overIndexConditions !== draggedId) {
                                moveCard(draggedId,
                                    overIndexConditions,
                                    itemsSwitches[_acceptedBy][blockValue],
                                    setItemsSwitches,
                                    itemsSwitches,
                                    _acceptedBy,
                                    blockValue,
                                    hoverClientY,
                                    hoverMiddleY);
                            }
                        }
                        return;
                    default:
                        const { index: overIndex } = findCard(_id, itemsSwitches[_acceptedBy]);
                        if (overIndex !== draggedId) {
                            moveCard(draggedId,
                                overIndex,
                                itemsSwitches[_acceptedBy],
                                setItemsSwitches,
                                itemsSwitches,
                                _acceptedBy,
                                null,
                                hoverClientY,
                                hoverMiddleY);
                        }
                        return;
                }
            }
        }
    });
    useEffect(() => {
        preview(getEmptyImage(), { captureDraggingState: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    drag(drop(ref))
    return <div ref={ref} style={{ opacity, }}>{children}</div>;
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