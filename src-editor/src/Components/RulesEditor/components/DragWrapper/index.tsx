import React, { useContext, useEffect, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';

import { deepCopy } from '../../helpers/deepCopy';
import { filterElement } from '../../helpers/filterElement';
import { findCard, moveCard } from '../../helpers/cardSort';
import { ContextWrapperCreate } from '../ContextWrapper';
import cls from './style.module.scss';
import type { BlockValue, RuleBlockConfig, RuleBlockDescription, RuleBlockType, RuleUserRules } from '../../types';

interface DragWrapperProps {
    typeBlock?: RuleBlockType;
    allProperties: RuleBlockDescription | RuleBlockConfig;
    id: string;
    _id?: number;
    isActive?: boolean;
    setUserRules: (newRules: RuleUserRules) => void;
    userRules: RuleUserRules;
    children: React.ReactNode;
    blockValue?: BlockValue;
}

const DragWrapper = ({
    typeBlock,
    allProperties,
    id,
    isActive,
    setUserRules,
    userRules,
    children,
    _id,
    blockValue,
}: DragWrapperProps): React.JSX.Element => {
    const { setOnUpdate } = useContext(ContextWrapperCreate);
    const [{ opacity }, drag, preview] = useDrag({
        type: 'box',
        item: (): Omit<RuleBlockConfig, '_id'> & { isActive?: boolean; _id?: number } => ({
            ...allProperties,
            id,
            isActive,
            _id,
        }),
        end: (item, monitor) => {
            const { acceptedBy } = item;
            const dropResult: { blockValue: BlockValue } | null = monitor.getDropResult();
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
                const idNumber = typeof _id === 'number' ? _id : Date.now();
                newUserRules = deepCopy(acceptedBy, userRules, dropResult.blockValue);
                const newItem = { id: item.id, acceptedBy: item.acceptedBy };
                switch (acceptedBy) {
                    case 'actions':
                        if (blockValue) {
                            newUserRules = filterElement('actions', newUserRules, blockValue, idNumber);
                        }
                        newUserRules = filterElement('actions', newUserRules, dropResult.blockValue, idNumber);
                        newUserRules.actions[dropResult.blockValue as 'then' | 'else'].push({
                            ...newItem,
                            _id: idNumber,
                        });
                        return setUserRules(newUserRules);

                    case 'conditions':
                        if (typeof blockValue === 'number') {
                            newUserRules = filterElement('conditions', newUserRules, blockValue, idNumber);
                        }
                        newUserRules = filterElement('conditions', newUserRules, dropResult.blockValue, idNumber);
                        newUserRules.conditions[dropResult.blockValue as number].push({ ...newItem, _id: idNumber });
                        return setUserRules(newUserRules);

                    default:
                        setOnUpdate(true);
                        newUserRules = filterElement('triggers', newUserRules, dropResult.blockValue, idNumber);
                        newUserRules.triggers.push({ ...newItem, _id: idNumber });
                        return setUserRules(newUserRules);
                }
            }
        },
        collect: monitor => ({
            opacity: monitor.isDragging() ? 0.4 : 1,
            isDragging: monitor.isDragging(),
        }),
    });

    const ref = useRef<HTMLDivElement>(null);

    const [, drop] = useDrop({
        accept: 'box',
        canDrop: () => false,
        hover({ _id: draggedId, acceptedBy }: { _id: number; acceptedBy: RuleBlockType }, monitor) {
            if (!ref.current) {
                return;
            }
            if (typeBlock !== acceptedBy) {
                return;
            }
            const hoverBoundingRect = ref.current?.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const clientOffset = monitor.getClientOffset();
            const hoverClientY = (clientOffset?.y || 0) - hoverBoundingRect.top;

            if (_id && draggedId !== _id) {
                switch (acceptedBy) {
                    case 'actions':
                        if (blockValue === 'then' || blockValue === 'else') {
                            const { index: overIndexActions } = findCard(_id, userRules.actions[blockValue]);
                            if (overIndexActions !== draggedId) {
                                moveCard(
                                    draggedId,
                                    overIndexActions,
                                    userRules[acceptedBy][blockValue],
                                    setUserRules,
                                    userRules,
                                    acceptedBy,
                                    blockValue,
                                    hoverClientY,
                                    hoverMiddleY,
                                );
                            }
                        }
                        return;
                    case 'conditions':
                        if (typeof blockValue === 'number') {
                            const { index: overIndexConditions } = findCard(_id, userRules[acceptedBy][blockValue]);
                            if (overIndexConditions !== draggedId) {
                                moveCard(
                                    draggedId,
                                    overIndexConditions,
                                    userRules[acceptedBy][blockValue],
                                    setUserRules,
                                    userRules,
                                    acceptedBy,
                                    blockValue,
                                    hoverClientY,
                                    hoverMiddleY,
                                );
                            }
                        }
                        return;
                    default: {
                        const { index: overIndex } = findCard(_id, userRules[acceptedBy]);
                        if (overIndex !== draggedId) {
                            moveCard(
                                draggedId,
                                overIndex,
                                userRules[acceptedBy],
                                setUserRules,
                                userRules,
                                acceptedBy,
                                undefined,
                                hoverClientY,
                                hoverMiddleY,
                            );
                        }
                        return;
                    }
                }
            }
        },
    });

    useEffect(() => {
        preview(getEmptyImage(), { captureDraggingState: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    drag(drop(ref));

    const isMobile = window.innerWidth < 600;

    return (
        <div
            ref={isMobile && _id ? null : ref}
            className={cls.root}
            style={{ opacity }}
        >
            <div
                className={_id ? cls.drag : null}
                ref={_id && isMobile ? ref : null}
            />
            {children}
        </div>
    );
};

export default DragWrapper;
