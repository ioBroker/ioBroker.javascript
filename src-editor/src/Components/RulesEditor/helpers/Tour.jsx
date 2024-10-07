const STEPS = {
    selectTriggers: 0,
    addScheduleByDoubleClick: 1,
    openTagsMenu: 2,
    selectIntervalTag: 3,
    selectActions: 4,
    addActionPrintText: 5,
    showJavascript: 6,
    switchBackToRules: 7,
    saveTheScript: 8,
};

const steps = [
    {
        // 0
        selector: '.blocks-triggers',
        content: 'Select triggers',
    },
    {
        // 1
        selector: '.block-TriggerScheduleBlock',
        content: 'Double click to add the block',
    },
    {
        // 2
        selector: '.tag-card',
        content: 'Open drop down menu',
    },
    {
        // 3
        selector: '.tag-card-interval',
        content: 'Select interval',
    },
    {
        // 4
        selector: '.blocks-actions',
        content: 'Select action blocks',
    },
    {
        // 5
        selector: '.block-ActionPrintText',
        content: 'Double click to add the block',
    },
    {
        // 6
        selector: '.button-js-code',
        content: 'Check the script',
    },
    {
        // 7
        selector: '.button-js-code',
        content: 'Switch back to rules',
    },
    {
        // 8
        selector: '.button-save',
        content: 'Save the script',
    },
];

export { STEPS };

export default steps;
