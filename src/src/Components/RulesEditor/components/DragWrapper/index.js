import React, { useEffect } from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
import { useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';

const DragWrapper = ({ allProperties, id, isActive, setItemsSwitches, itemsSwitches, children, _id, Icon, blockValue }) => {
    const [{ opacity }, drag, preview] = useDrag({
        item: { ...allProperties, type: 'box', id, isActive, _id, Icon: Icon ? Icon : allProperties.Icon },
        end: (item, monitor) => {
            let dropResult = monitor.getDropResult();
            const { _acceptedBy } = item;
            if (!dropResult) {
                if (typeof _id === 'number' && !monitor.getTargetIds().length) {
                    switch (_acceptedBy) {
                        case 'actions':
                            let newItemsSwitchess = {
                                ...itemsSwitches, [_acceptedBy]: {
                                    ...itemsSwitches[_acceptedBy], [blockValue]:
                                        [...itemsSwitches[_acceptedBy][blockValue]]
                                }
                            }
                            newItemsSwitchess[_acceptedBy][blockValue] = newItemsSwitchess[_acceptedBy][blockValue].filter(el => el._id !== _id);
                            return setItemsSwitches(newItemsSwitchess);
                        case 'conditions':
                            let newItemsSwitches = {
                                ...itemsSwitches, [_acceptedBy]: [
                                    ...itemsSwitches[_acceptedBy]
                                ]
                            }
                            newItemsSwitches[_acceptedBy][blockValue] = newItemsSwitches[_acceptedBy][blockValue].filter(el => el._id !== _id);
                            return setItemsSwitches(newItemsSwitches);
                        default:
                            return setItemsSwitches({ ...itemsSwitches, [_acceptedBy]: [...itemsSwitches[_acceptedBy].filter(el => el._id !== _id)] });
                    }
                }
                return null;
            }
            let idNumber = typeof _id === 'number' ? _id : Math.max.apply(null, itemsSwitches[_acceptedBy]?.length ? itemsSwitches[_acceptedBy].map(el => el._id) : [0]) + 1;
            switch (_acceptedBy) {
                case 'actions':
                    idNumber = typeof _id === 'number' ? _id : Math.max.apply(null, itemsSwitches[_acceptedBy][dropResult.blockValue]?.length ? itemsSwitches[_acceptedBy][dropResult.blockValue].map(el => el._id) : [0]) + 1;
                    let newItemsSwitchess = {
                        ...itemsSwitches, [_acceptedBy]: {
                            ...itemsSwitches[_acceptedBy], [dropResult.blockValue]:
                                [...itemsSwitches[_acceptedBy][dropResult.blockValue]]
                        }
                    }
                    newItemsSwitchess[_acceptedBy][dropResult.blockValue] = newItemsSwitchess[_acceptedBy][dropResult.blockValue].filter(el => el._id !== _id);
                    newItemsSwitchess[_acceptedBy][dropResult.blockValue].push({ ...item, nameBlock: dropResult.name, _id: idNumber });
                    return setItemsSwitches(newItemsSwitchess);
                case 'conditions':
                    idNumber = typeof _id === 'number' ? _id : Math.max.apply(null, itemsSwitches[_acceptedBy][dropResult.blockValue]?.length ? itemsSwitches[_acceptedBy][dropResult.blockValue].map(el => el._id) : [0]) + 1;
                    let newItemsSwitches = {
                        ...itemsSwitches, [_acceptedBy]: [
                            ...itemsSwitches[_acceptedBy]
                        ]
                    }
                    newItemsSwitches[_acceptedBy][dropResult.blockValue] = newItemsSwitches[_acceptedBy][dropResult.blockValue].filter(el => el._id !== _id);
                    newItemsSwitches[_acceptedBy][dropResult.blockValue].push({ ...item, nameBlock: dropResult.name, _id: idNumber });
                    return setItemsSwitches(newItemsSwitches);
                default:
                    return setItemsSwitches({ ...itemsSwitches, [_acceptedBy]: [...itemsSwitches[_acceptedBy].filter(el => el._id !== _id), { ...item, nameBlock: dropResult.name, _id: idNumber }] });
            }
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
    id: '',
    _id: null
};

DragWrapper.propTypes = {
    name: PropTypes.string
};

export default DragWrapper;