'use strict';

if (typeof goog !== 'undefined') {
    goog.require('Blockly.JavaScript');
}

// --- logic between --------------------------------------------------

Blockly.Blocks['logic_between'] = {
    init: function() {
        this.appendValueInput('MIN')
            .setCheck('Number');
        this.appendValueInput('VALUE')
            .setCheck('Number')
            .appendField(new Blockly.FieldDropdown([['<', 'LT'], ['≤', 'LE']]), 'MIN_OPERATOR');
        this.appendValueInput('MAX')
            .setCheck('Number')
            .appendField(new Blockly.FieldDropdown([['<', 'LT'], ['≤', 'LE']]), 'MAX_OPERATOR');

        this.setInputsInline(true);
        this.setOutput(true, 'Boolean');
        this.setColour("%{BKY_LOGIC_HUE}");
        this.setTooltip(Blockly.Translate('logic_between_tooltip'));
        // this.setHelpUrl(Blockly.Translate('logic_between_helpurl'));
    }
}

Blockly.JavaScript['logic_between'] = function(block) {
    const min = Blockly.JavaScript.valueToCode(block, 'MIN', Blockly.JavaScript.ORDER_RELATIONAL) || 0;
    const value = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_RELATIONAL) || 0;
    const max = Blockly.JavaScript.valueToCode(block, 'MAX', Blockly.JavaScript.ORDER_RELATIONAL) || 0;
    const minOperator = block.getFieldValue('MIN_OPERATOR') === 'LT' ? '<' : '<=';
    const maxOperator = block.getFieldValue('MAX_OPERATOR') === 'LT' ? '<' : '<=';

    return [`${min} ${minOperator} ${value} && ${value} ${maxOperator} ${max}`, Blockly.JavaScript.ORDER_LOGICAL_AND];
}

// --- logic ifempty --------------------------------------------------

Blockly.Blocks['logic_ifempty'] = {
  init: function() {
    this.appendValueInput('VALUE')
        .setCheck(null)
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(Blockly.Translate('logic_ifempty'));
    this.appendValueInput('DEFLT')
        .setCheck(null)
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(Blockly.Translate('logic_ifempty_then'));

    this.setOutput(true, null);
    this.setInputsInline(true);
    this.setColour("%{BKY_LOGIC_HUE}");
    this.setTooltip(Blockly.Translate('logic_ifempty_tooltip'));
    // this.setHelpUrl(Blockly.Translate('logic_ifempty_helpurl'));
  }
}

Blockly.JavaScript['logic_ifempty'] = function(block) {
    const value = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_LOGICAL_OR) || null;
    const deflt = Blockly.JavaScript.valueToCode(block, 'DEFLT', Blockly.JavaScript.ORDER_LOGICAL_OR) || null;

    return [value + ' || ' + deflt, Blockly.JavaScript.ORDER_LOGICAL_OR];
};
