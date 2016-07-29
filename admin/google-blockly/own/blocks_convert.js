'use strict';

goog.provide('Blockly.JavaScript.Convert');

goog.require('Blockly.JavaScript');

Blockly.CustomBlocks = Blockly.CustomBlocks || [];
Blockly.CustomBlocks.push('Convert');

Blockly.Convert = {
    HUE: 280,
    blocks: {}
};

Blockly.Words['Convert'] = {'en': 'Convert', 'de': 'Konvertierung', 'ru': 'Конвертация'};


Blockly.Blocks.Convert = {};
Blockly.JavaScript.Convert = {};


// --- to Number --------------------------------------------------
Blockly.Words['convert_tonumber']         = {'en': 'toNumber',                          'de': 'nach Zahl',                          'ru': 'в число'};
Blockly.Words['convert_tonumber_tooltip'] = {'en': 'Cast input to number',              'de': 'Convert Eingang nach Zahl',          'ru': 'Преобразовать вход в число'};

Blockly.Convert.blocks['convert_tonumber'] =
    '<block type="convert_tonumber">'
    + '     <value name="VALUE">'
    + '     </value>'
    + '</block>';

Blockly.Blocks.convert_tonumber = {
    init: function () {
        this.setColour(Blockly.Convert.HUE);

        this.appendValueInput("VALUE")
            .appendField(Blockly.Words['convert_tonumber'][systemLang]);

        this.setOutput(true, "Number");
        this.setTooltip(Blockly.Words['convert_tonumber_tooltip'][systemLang]);
    }
};
Blockly.JavaScript.convert_tonumber = function (a) {
    return ["parseFloat(" + Blockly.JavaScript.valueToCode(a, "VALUE", Blockly.JavaScript.ORDER_ATOMIC) + ")", Blockly.JavaScript.ORDER_ATOMIC];
};

// --- to String --------------------------------------------------
Blockly.Words['convert_tostring']         = {'en': 'toString',                          'de': 'nach String',                          'ru': 'в строку'};
Blockly.Words['convert_tostring_tooltip'] = {'en': 'Cast input to number',              'de': 'Convert Eingang nach String',          'ru': 'Преобразовать вход в строку'};

Blockly.Convert.blocks['convert_tostring'] =
    '<block type="convert_tostring">'
    + '     <value name="VALUE">'
    + '     </value>'
    + '</block>';

Blockly.Blocks.convert_tostring = {
    init: function () {
        this.setColour(Blockly.Convert.HUE);
        this.appendValueInput("VALUE").appendField(Blockly.Words['convert_tostring'][systemLang]);
        this.setOutput(true, "String");
        this.setTooltip(Blockly.Words['convert_tostring_tooltip'][systemLang])
    }
};

Blockly.JavaScript.convert_tostring = function (a) {
    return ["('' + " + Blockly.JavaScript.valueToCode(a, "VALUE", Blockly.JavaScript.ORDER_ATOMIC) + ")", Blockly.JavaScript.ORDER_ATOMIC];
};

// --- get type --------------------------------------------------
Blockly.Words['convert_type']         = {'en': 'type of',                           'de': 'Typ von',                  'ru': 'взять тип'};
Blockly.Words['convert_type_tooltip'] = {'en': 'Returns type of input',             'de': 'Typ von Eingang',          'ru': 'Взять тип входа'};

Blockly.Convert.blocks['convert_type'] =
    '<block type="convert_type">'
    + '     <value name="VALUE">'
    + '     </value>'
    + '</block>';

Blockly.Blocks.convert_type = {
    init: function () {
        this.setColour(Blockly.Convert.HUE);
        this.appendValueInput("ITEM")
            .appendField(Blockly.Words['convert_type'][systemLang]);

        this.setOutput(true, "String");
        this.setTooltip(Blockly.Words['convert_type_tooltip'][systemLang])
    }
};
Blockly.JavaScript.convert_type = function (a) {
    return ["typeof " + Blockly.JavaScript.valueToCode(a, "ITEM", Blockly.JavaScript.ORDER_ATOMIC), Blockly.JavaScript.ORDER_ATOMIC];
};

// --- to Date --------------------------------------------------
Blockly.Words['convert_to_date']         = {'en': 'toDate',                         'de': 'nach Datum',                 'ru': 'в дату'};
Blockly.Words['convert_to_date_tooltip'] = {'en': 'Cast input to date',             'de': 'Convert Eingang nach Datum', 'ru': 'Преобразовать вход в дату'};

Blockly.Convert.blocks['convert_to_date'] =
    '<block type="convert_to_date">'
    + '     <value name="VALUE">'
    + '     </value>'
    + '</block>';

Blockly.Blocks.convert_to_date = {
    init: function () {
        this.setColour(Blockly.Convert.HUE);
        this.appendValueInput("ITEM")
            .appendField(Blockly.Words['convert_to_date'][systemLang]);

        this.setOutput(true, "Date");
        this.setTooltip(Blockly.Words['convert_to_date_tooltip'][systemLang])
    }
};
Blockly.JavaScript.convert_to_date = function (a) {
    return ['new Date(' + Blockly.JavaScript.valueToCode(a, "ITEM", Blockly.JavaScript.ORDER_ATOMIC) + ').getTime()', Blockly.JavaScript.ORDER_ATOMIC];
};

// --- from Date --------------------------------------------------
Blockly.Words['convert_from_date']         = {'en': 'date to',                       'de': 'vom Datum',                 'ru': 'дату в'};
Blockly.Words['convert_from_date_tooltip'] = {'en': 'Cast input from date',          'de': 'Convert Eingang vom Datum', 'ru': 'Преобразовать вход из даты'};

Blockly.Convert.blocks['convert_from_date'] =
    '<block type="convert_to_date">'
    + '     <value name="VALUE">'
    + '     </value>'
    + '     <value name="FORMAT">'
    + '     </value>'
    + '</block>';

Blockly.Blocks.convert_to_date = {
    init: function () {
        this.setColour(Blockly.Convert.HUE);
        this.appendValueInput("ITEM")
            .appendField(Blockly.Words['convert_from_date'][systemLang]);

        this.setOutput(true);
        this.setTooltip(Blockly.Words['convert_from_date_tooltip'][systemLang])
    }
};
Blockly.JavaScript.convert_to_date = function (a) {
    return ["new Date(" + Blockly.JavaScript.valueToCode(a, "ITEM", Blockly.JavaScript.ORDER_ATOMIC) + ').getTime()', Blockly.JavaScript.ORDER_ATOMIC];
};

