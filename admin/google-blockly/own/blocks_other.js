'use strict';

if (typeof goog !== 'undefined') {
    goog.provide('Blockly.JavaScript.Other');

    goog.require('Blockly.JavaScript');
}

// --- logic between --------------------------------------------------

Blockly.System.blocks['logic_between'] =
    '<block type="logic_between">'
    +'    <value name="MIN">'
    +'        <block type="math_number">'
    +'            <field name="NUM">0</field>'
    +'        </block>'
    +'    </value>'
    +'    <field name="MIN_OPERATOR">LE</field>'
    +'    <value name="VALUE">'
    +'        <shadow type="math_number">'
    +'            <field name="NUM">42</field>'
    +'        </shadow>'
    +'    </value>'
    +'    <field name="MAX_OPERATOR">LE</field>'
    +'    <value name="MAX">'
    +'        <block type="math_number">'
    +'            <field name="NUM">100</field>'
    +'        </block>'
    +'    </value>'
    +'</block>';

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
        this.setColour(Blockly.Constants.Logic.HUE);
        this.setTooltip(Blockly.Translate('logic_between_tooltip'));
        this.setHelpUrl(Blockly.Translate('logic_between_helpurl'));
    }
}

Blockly.JavaScript['logic_between'] = function(block) {
    const min = Blockly.JavaScript.valueToCode(block, 'MIN', Blockly.JavaScript.ORDER_RELATIONAL) || 0;
    const value = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_RELATIONAL) || 0;
    const max = Blockly.JavaScript.valueToCode(block, 'MAX', Blockly.JavaScript.ORDER_RELATIONAL) || 0;
    const minOperator = block.getFieldValue('MIN_OPERATOR') === 'LT' ? '<' : '<=';
    const maxOperator = block.getFieldValue('MAX_OPERATOR') === 'LT' ? '<' : '<=';

    const code = `${min} ${minOperator} ${value} && ${value} ${maxOperator} ${max}`;
    return [code, Blockly.JavaScript.ORDER_LOGICAL_AND];
}

// --- logic_ifempty --------------------------------------------------
Blockly.System.blocks['logic_ifempty'] =
    '<block type="logic_ifempty">'
    +'    <value name="VALUE">'
    +'    </value>'
    +'    <value name="DEFLT">'
    +'    </value>'
    +'</block>';

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
    this.setColour(Blockly.Constants.Logic.HUE);
    this.setTooltip(Blockly.Translate('logic_ifempty_tooltip'));
    this.setHelpUrl(Blockly.Translate('logic_ifempty_helpurl'));
  }
}

Blockly.JavaScript['logic_ifempty'] = function(block) {
    const value = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_LOGICAL_OR) || null;
    const deflt = Blockly.JavaScript.valueToCode(block, 'DEFLT', Blockly.JavaScript.ORDER_LOGICAL_OR) || null;

    return [value + ' || ' + deflt, Blockly.JavaScript.ORDER_LOGICAL_OR];
};
