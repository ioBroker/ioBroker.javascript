const STEPS = {
    selectTriggers: 0,
    addScheduleByDoubleClick: 1,
    changeTypeOfSchedule: 2,
};

const steps = [
    {
        selector: '.blocks-triggers',
        content: 'Select triggers',
    },
    {
        selector: '.block-TriggerScheduleBlock',
        content: 'Double click too add the block',
    },
    {
        selector: '.block-TriggerScriptSave',
        content: 'Drag and drop too add another block',
    }
];

export {STEPS};

export default steps;