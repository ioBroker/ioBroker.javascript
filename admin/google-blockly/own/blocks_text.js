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
        this.setColour("%{BKY_TEXTS_HUE}");
        this.setOutput(true, 'String');
        this.setTooltip(Blockly.Translate('text_newline_tooltip'));
    }
};

Blockly.JavaScript['text_newline'] = function(block) {
    const dropdownType = block.getFieldValue('Type');
    return [`'${dropdownType}'`, Blockly.JavaScript.ORDER_ATOMIC];
};
