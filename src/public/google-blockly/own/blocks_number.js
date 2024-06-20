'use strict';

// --- Round Number to n decimal places -------------------------------

Blockly.Blocks['math_rndfixed'] = {
    init: function () {
        this.appendValueInput('x')
            .setCheck('Number')
            .appendField(Blockly.Translate('math_rndfixed_round'));

        this.appendDummyInput()
            .appendField(Blockly.Translate('math_rndfixed_to'))
            .appendField(new Blockly.FieldNumber(0, 1, 25), 'n')
            .appendField(Blockly.Translate('math_rndfixed_decplcs'));

        this.setInputsInline(true);
        this.setOutput(true, 'Number');

        this.setColour(Blockly.Msg['MATH_HUE']);

        this.setTooltip(Blockly.Translate('math_rndfixed_tooltip'));
    },
};

Blockly.JavaScript.forBlock['math_rndfixed'] = function (block) {
    const vX = Blockly.JavaScript.valueToCode(block, 'x', Blockly.JavaScript.ORDER_ATOMIC);
    const fExp = Math.pow(10, block.getFieldValue('n'));

    return [`Math.round(${vX} * ${fExp}) / ${fExp}`, Blockly.JavaScript.ORDER_ATOMIC];
};
