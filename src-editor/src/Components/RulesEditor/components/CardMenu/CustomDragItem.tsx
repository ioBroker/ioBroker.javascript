import React from 'react';
import CardMenu from '.';
import { deepCopy } from '../../helpers/deepCopy';
import DragWrapper from '../DragWrapper';
import { STEPS } from '../../helpers/Tour';

const CustomDragItem = props => {
    const { allProperties, allProperties: { acceptedBy, id }, setUserRules, userRules, setTourStep, tourStep, isTourOpen, onTouchMove } = props;
    return <DragWrapper {...props} {...allProperties}>
        <CardMenu
            onTouchMove={onTouchMove}
            onDoubleClick={() => {
                (isTourOpen &&
                    tourStep === STEPS.addScheduleByDoubleClick &&
                    id === 'TriggerScheduleBlock' &&
                    setTourStep(STEPS.openTagsMenu)
                );
                (isTourOpen &&
                    tourStep === STEPS.addActionPrintText &&
                    id === 'ActionPrintText' &&
                    setTourStep(STEPS.showJavascript)
                );
                let _id = Date.now();
                let blockValue;
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
                let newUserRules = deepCopy(acceptedBy, userRules, blockValue);
                const newItem = { id, _id, acceptedBy };
                if (blockValue !== undefined) {
                    newUserRules[acceptedBy][blockValue].push({ ...newItem });
                } else {
                    newUserRules[acceptedBy].push({ ...newItem });
                }
                setUserRules(newUserRules);
            }}
            onDoubl
            {...props}
            {...allProperties}
        />
    </DragWrapper>;
}

export default CustomDragItem;
