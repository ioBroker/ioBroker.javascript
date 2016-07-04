'use strict';

goog.provide('Blockly.JavaScript.system');

goog.require('Blockly.JavaScript');

Blockly.JavaScript['console'] = function(block) {
    // Print statement.
    var argument0 = Blockly.JavaScript.valueToCode(block, 'TEXT',     Blockly.JavaScript.ORDER_NONE) || '\'\'';
    var type      = Blockly.JavaScript.valueToCode(block, 'SEVERITY', Blockly.JavaScript.ORDER_NONE) || 'log';
    return 'console.' + type + '(' + argument0 + ');\n';
};
Blockly.Words = {};
Blockly.Words['console'] = {'en': 'Debug', 'de': 'Debug', 'ru': 'Debug'};
Blockly.Words['console_tooltip'] = {'en': 'Debug', 'de': 'Debug', 'ru': 'Debug'};
Blockly.Words['console_help'] = {'en': 'Debug', 'de': 'Debug', 'ru': 'Debug'};
Blockly.Blocks['console'] = {
    /**
     * Block for print statement.
     * @this Blockly.Block
     */
    init: function() {
        this.jsonInit({
            message0: Blockly.Words['console'][systemLang],
            args0: [
                {
                    type: 'input_value',
                    name: 'TEXT'
                }
            ],
            previousStatement: null,
            nextStatement: null,
            colour:  60,
            tooltip: Blockly.Msg.TEXT_PRINT_TOOLTIP,
            helpUrl: Blockly.Msg.TEXT_PRINT_HELPURL
        });
    }
};