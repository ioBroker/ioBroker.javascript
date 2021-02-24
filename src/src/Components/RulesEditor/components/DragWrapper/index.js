import React, { useContext, useEffect, useRef } from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { deepCopy } from '../../helpers/deepCopy';
import { filterElement } from '../../helpers/filterElement';
import { findCard, moveCard } from '../../helpers/cardSort';
import { ContextWrapperCreate } from '../ContextWrapper';

const DragWrapper = ({ typeBlocks, allProperties, id, isActive, setUserRules, userRules, children, _id, blockValue }) => {
    const { state, setState } = useContext(ContextWrapperCreate);
    const [{ opacity }, drag, preview] = useDrag({
        item: { ...allProperties, type: 'box', id, isActive, _id },
        end: (item, monitor) => {
            let { acceptedBy } = item;
            let dropResult = monitor.getDropResult();
            let newUserRules;
            if (!dropResult) {
                if (typeof _id === 'number' && !monitor.getTargetIds().length) {
                    newUserRules = deepCopy(acceptedBy, userRules, blockValue);
                    newUserRules = filterElement(acceptedBy, newUserRules, blockValue, _id);
                    setUserRules(newUserRules);
                }
                return null;
            }
            if (dropResult.blockValue !== blockValue) {
                let idNumber = typeof _id === 'number' ? _id : Date.now();
                newUserRules = deepCopy(acceptedBy, userRules, dropResult.blockValue);
                const newItem = { id: item.id, acceptedBy: item.acceptedBy }
                switch (acceptedBy) {
                    case 'actions':
                        if (blockValue) {
                            newUserRules = filterElement(acceptedBy, newUserRules, blockValue, _id);
                        }
                        newUserRules = filterElement(acceptedBy, newUserRules, dropResult.blockValue, _id);
                        newUserRules[acceptedBy][dropResult.blockValue].push({ ...newItem, _id: idNumber });
                        return setUserRules(newUserRules);

                    case 'conditions':
                        if (typeof blockValue === 'number') {
                            newUserRules = filterElement(acceptedBy, newUserRules, blockValue, _id);
                        }
                        newUserRules = filterElement(acceptedBy, newUserRules, dropResult.blockValue, _id);
                        newUserRules[acceptedBy][dropResult.blockValue].push({ ...newItem, _id: idNumber });
                        return setUserRules(newUserRules);

                    default:
                        setState({ ...state, onUpdate: true })
                        newUserRules = filterElement(acceptedBy, newUserRules, dropResult.blockValue, _id);
                        newUserRules[acceptedBy].push({ ...newItem, _id: idNumber });
                        return setUserRules(newUserRules);
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
        hover({ _id: draggedId, acceptedBy }, monitor) {
            if (!ref.current) {
                return;
            }
            if (typeBlocks !== acceptedBy) {
                return
            }
            const hoverBoundingRect = ref.current?.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const clientOffset = monitor.getClientOffset();
            const hoverClientY = clientOffset.y - hoverBoundingRect.top;

            if (!!_id && draggedId !== _id) {
                switch (acceptedBy) {
                    case 'actions':
                        if (blockValue === 'then' || blockValue === 'else') {
                            const { index: overIndexActions } = findCard(_id, userRules[acceptedBy][blockValue]);
                            if (overIndexActions !== draggedId) {
                                moveCard(draggedId,
                                    overIndexActions,
                                    userRules[acceptedBy][blockValue],
                                    setUserRules,
                                    userRules,
                                    acceptedBy,
                                    blockValue,
                                    hoverClientY,
                                    hoverMiddleY);
                            }
                        }
                        return;
                    case 'conditions':
                        if (typeof blockValue === 'number') {
                            const { index: overIndexConditions } = findCard(_id, userRules[acceptedBy][blockValue]);
                            if (overIndexConditions !== draggedId) {
                                moveCard(draggedId,
                                    overIndexConditions,
                                    userRules[acceptedBy][blockValue],
                                    setUserRules,
                                    userRules,
                                    acceptedBy,
                                    blockValue,
                                    hoverClientY,
                                    hoverMiddleY);
                            }
                        }
                        return;
                    default:
                        const { index: overIndex } = findCard(_id, userRules[acceptedBy]);
                        if (overIndex !== draggedId) {
                            moveCard(draggedId,
                                overIndex,
                                userRules[acceptedBy],
                                setUserRules,
                                userRules,
                                acceptedBy,
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

    drag(drop(ref));

    return <div ref={ref} style={{ opacity, }}>{children}</div>;
}

DragWrapper.defaultProps = {
    name: '',
    active: false,
    id: '',
    _id: null
};

DragWrapper.propTypes = {
    name: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
};

export default DragWrapper;