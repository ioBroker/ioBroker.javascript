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
    const vValue = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC);
    const vFind = Blockly.JavaScript.valueToCode(block, 'FIND', Blockly.JavaScript.ORDER_ATOMIC);

    return [`String(${vValue}).includes(${vFind})`, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- Text formatValue --------------------------------------------------

Blockly.Blocks['text_format_value'] = {
    // Checkbox.
    init: function () {
        this.appendValueInput('VALUE')
            .appendField(Blockly.Translate('text_format_value'))
            .setCheck(null);

        this.appendDummyInput()
            .appendField(Blockly.Translate('text_format_value_format'))
            .appendField(new Blockly.FieldDropdown([
                ['System', 'system'],
                ['.,', '.,'],
                [',.', ',.'],
                [' .', ' .'],
            ]), 'FORMAT');

        this.appendValueInput('DECIMALS')
            .appendField(Blockly.Translate('text_format_value_decimals'));


        this.setInputsInline(true);
        this.setOutput(true, 'String');

        this.setColour('%{BKY_TEXTS_HUE}');

        //this.setTooltip(Blockly.Translate('text_format_value_tooltip'));
    },
};

Blockly.JavaScript.forBlock['text_format_value'] = function (block) {
    const vValue = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC);
    const vDecimals = Blockly.JavaScript.valueToCode(block, 'DECIMALS', Blockly.JavaScript.ORDER_ATOMIC);
    const fFormat = block.getFieldValue('FORMAT');

    if (fFormat !== 'system') {
        return [`formatValue(parseFloat(${vValue}), ${vDecimals}, '${fFormat}')`, Blockly.JavaScript.ORDER_ATOMIC];
    }

    return [`formatValue(parseFloat(${vValue}), ${vDecimals})`, Blockly.JavaScript.ORDER_ATOMIC];
};
