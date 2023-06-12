'use strict';

// --- Round Number to n decimal places -------------------------------

Blockly.Blocks['math_rndfixed'] = {
    init: function() {
        this.appendValueInput('x')
            .setCheck('Number')
            .appendField(Blockly.Translate('math_rndfixed_round'));
        this.appendDummyInput()
            .appendField(Blockly.Translate('math_rndfixed_to'))
            .appendField(new Blockly.FieldNumber(0, 1, 25), 'n')
            .appendField(Blockly.Translate('math_rndfixed_decplcs'));
        this.setInputsInline(true);
        this.setColour(Blockly.Msg['MATH_HUE']);
        this.setOutput(true, 'Number');
        this.setTooltip(Blockly.Translate('math_rndfixed_tooltip'));
    }
};

Blockly.JavaScript['math_rndfixed'] = function(block) {
    const x = Blockly.JavaScript.valueToCode(block, 'x', Blockly.JavaScript.ORDER_ATOMIC);
    const exp = Math.pow(10, block.getFieldValue('n'));

    return ['Math.round(' + x + ' * ' + exp + ') / ' + exp, Blockly.JavaScript.ORDER_ATOMIC];
};
