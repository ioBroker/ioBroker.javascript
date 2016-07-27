'use strict';

goog.provide('Blockly.JavaScript.Common');

goog.require('Blockly.JavaScript');

Blockly.CustomBlocks = Blockly.CustomBlocks || [];
Blockly.CustomBlocks.push('Common');

Blockly.Common = {
    HUE: 280,
    blocks: {}
};

Blockly.Words['Common'] = {'en': 'Common', 'de': 'Konvertierung', 'ru': 'Конвертация'};


Blockly.Blocks.Common = {};
Blockly.JavaScript.Common = {};


Blockly.Common.blocks['common_tonumber'] =
    '<block type="common_tonumber">'
    + '     <value name="VALUE">'
    + '     </value>'
    + '</block>';

Blockly.Blocks.common_tonumber = {
    init: function () {
        this.setColour(20);
        this.appendValueInput("VALUE").appendField("toNumber");
        this.setOutput(!0, "Number");
        this.setTooltip("Cast input to number")
    }
};
Blockly.JavaScript.common_tonumber = function (a) {
    return ["parseFloat(" + Blockly.JavaScript.valueToCode(a, "VALUE", Blockly.JavaScript.ORDER_ATOMIC) + ")", Blockly.JavaScript.ORDER_ATOMIC]
};

Blockly.Common.blocks['common_tostring'] =
    '<block type="common_tostring">'
    + '     <value name="VALUE">'
    + '     </value>'
    + '</block>';
Blockly.Blocks.common_tostring = {
    init: function () {
        this.setColour(20);
        this.appendValueInput("VALUE").appendField("toString");
        this.setOutput(!0, "String");
        this.setTooltip("Cast input to string")
    }
};
Blockly.JavaScript.common_tostring = function (a) {
    return ["('' + " + Blockly.JavaScript.valueToCode(a, "VALUE", Blockly.JavaScript.ORDER_ATOMIC) + ")", Blockly.JavaScript.ORDER_ATOMIC]
};

Blockly.Common.blocks['common_type'] =
    '<block type="common_type">'
    + '     <value name="VALUE">'
    + '     </value>'
    + '</block>';
Blockly.Blocks.common_type = {
    init: function () {
        this.setColour(20);
        this.appendValueInput("ITEM").appendField("type of");
        this.setOutput(!0, "String");
        this.setTooltip("Returns type of input")
    }
};
Blockly.JavaScript.common_type = function (a) {
    return ["typeof " + Blockly.JavaScript.valueToCode(a, "ITEM", Blockly.JavaScript.ORDER_ATOMIC), Blockly.JavaScript.ORDER_ATOMIC]
};

