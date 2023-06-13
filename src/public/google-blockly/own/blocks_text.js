'use strict';

// --- Text new line --------------------------------------------------

Blockly.Blocks['text_newline'] = {
    // Checkbox.
    init: function() {
        this.appendDummyInput()
            .appendField(Blockly.Translate('text_newline'));

        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([['\\n', '\\n'], ['\\r\\n', '\\r\\n'], ['\\r', '\\r']]), 'Type');
        this.setInputsInline(true);
        this.setColour(Blockly.Msg['TEXTS_HUE']);
        this.setOutput(true, 'String');
        this.setTooltip(Blockly.Translate('text_newline_tooltip'));
    }
};

Blockly.JavaScript['text_newline'] = function(block) {
    var dropdown_type = block.getFieldValue('Type');
    return ['\'' + dropdown_type + '\'', Blockly.JavaScript.ORDER_ATOMIC];
};
