import React from 'react';
import CardMenu from '.';
import { deepCopy } from '../../helpers/deepCopy';
import DragWrapper from '../DragWrapper';
import { STEPS } from '../../helpers/Tour';
import type { AdminConnection } from '@iobroker/adapter-react-v5';
import type { BlockValue, RuleBlockDescription, RuleUserRules } from '../../types';

interface CustomDragItemProps {
    adapter: string | undefined;
    allProperties: RuleBlockDescription;
    icon: string | undefined;
    id: string;
    isActive: boolean;
    isTourOpen: boolean;
    name: string;
    onTouchMove: (e: React.TouchEvent) => void;
    setTourStep: (step: number) => void;
    setUserRules: (value: RuleUserRules) => void;
    socket: AdminConnection | null;
    tourStep: number;
    userRules: RuleUserRules;
}

const CustomDragItem = (props: CustomDragItemProps): React.JSX.Element => {
    const {
        allProperties,
        allProperties: { acceptedBy, id },
        setUserRules,
        userRules,
        setTourStep,
        tourStep,
        isTourOpen,
        onTouchMove,
        isActive,
    } = props;

    return (
        <DragWrapper
            allProperties={allProperties}
            id={allProperties.id}
            isActive={isActive}
            setUserRules={setUserRules}
            userRules={userRules}
        >
            <CardMenu
                onDoubleClick={() => {
                    if (isTourOpen && tourStep === STEPS.addScheduleByDoubleClick && id === 'TriggerScheduleBlock') {
                        setTourStep(STEPS.openTagsMenu);
                    }
                    if (isTourOpen && tourStep === STEPS.addActionPrintText && id === 'ActionPrintText') {
                        setTourStep(STEPS.showJavascript);
                    }
                    const _id = Date.now();
                    let blockValue: BlockValue;
                    switch (acceptedBy) {
                        case 'actions':
                            blockValue = 'then';
                            break;

                        case 'conditions':
                            blockValue = userRules[acceptedBy].length - 1;
                            break;

                        default:
                            break;
                    }
                    const newUserRules = deepCopy(acceptedBy, userRules, blockValue);
                    const newItem = { id, _id, acceptedBy };
                    if (blockValue !== undefined) {
                        if (acceptedBy === 'actions') {
                            newUserRules.actions[blockValue as 'then' | 'else'].push({ ...newItem });
                        } else if (acceptedBy === 'conditions') {
                            newUserRules.conditions[blockValue as number].push({ ...newItem });
                        }
                    } else {
                        newUserRules.triggers.push({ ...newItem });
                    }
                    setUserRules(newUserRules);
                }}
                {...props}
                {...allProperties}
                onTouchMove={onTouchMove}
            />
        </DragWrapper>
    );
};

export default CustomDragItem;
