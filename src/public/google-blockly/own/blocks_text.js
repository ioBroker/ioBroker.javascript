'use strict';

// --- Text new line --------------------------------------------------

Blockly.Blocks['text_newline'] = {
    // Checkbox.
    init: function () {
        this.appendDummyInput()
            .appendField(Blockly.Translate('text_newline'));

        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([
                ['\\n', '\\n'],
                ['\\r', '\\r'],
                ['\\r\\n', '\\r\\n'],
            ]), 'Type');

        this.setInputsInline(true);
        this.setOutput(true, 'String');

        this.setColour('%{BKY_TEXTS_HUE}');

        this.setTooltip(Blockly.Translate('text_newline_tooltip'));
    },
};

Blockly.JavaScript.forBlock['text_newline'] = function (block) {
    const dropdownType = block.getFieldValue('Type');
    return [`'${dropdownType}'`, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- Text contains --------------------------------------------------

Blockly.Blocks['text_contains'] = {
    // Checkbox.
    init: function () {
        this.appendDummyInput()
            .appendField(Blockly.Translate('text_contains'));

        this.appendValueInput('VALUE')
            .setCheck(null);

        this.appendValueInput('FIND')
            .setCheck(null)
            .appendField(Blockly.Translate('text_contains_value'));

        this.setInputsInline(true);
        this.setOutput(true, 'Boolean');

        this.setColour('%{BKY_TEXTS_HUE}');

        //this.setTooltip(Blockly.Translate('text_contains_tooltip'));
    },
};

Blockly.JavaScript.forBlock['text_contains'] = function (block) {
    const value = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC);
    const find = Blockly.JavaScript.valueToCode(block, 'FIND', Blockly.JavaScript.ORDER_ATOMIC);

    return [`String(${value}).includes(${find})`, Blockly.JavaScript.ORDER_ATOMIC];
};
