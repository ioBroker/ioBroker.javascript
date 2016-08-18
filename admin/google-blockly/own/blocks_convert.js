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

// --- to Boolean --------------------------------------------------
Blockly.Words['convert_toboolean']         = {'en': 'toBoolean',                         'de': 'nach Logikwert',                       'ru': 'в булево значение'};
Blockly.Words['convert_toboolean_tooltip'] = {'en': 'Cast input to boolean',             'de': 'Convert Eingang nach Logikwert',       'ru': 'Преобразовать вход в булево значение'};

Blockly.Convert.blocks['convert_toboolean'] =
    '<block type="convert_toboolean">'
    + '     <value name="VALUE">'
    + '     </value>'
    + '</block>';

Blockly.Blocks.convert_toboolean = {
    init: function () {
        this.setColour(Blockly.Convert.HUE);
        this.appendValueInput("VALUE").appendField(Blockly.Words['convert_toboolean'][systemLang]);
        this.setOutput(true, "Boolean");
        this.setTooltip(Blockly.Words['convert_toboolean_tooltip'][systemLang])
    }
};

Blockly.JavaScript.convert_toboolean = function (a) {
    return ["(function (){var val = " + Blockly.JavaScript.valueToCode(a, "VALUE", Blockly.JavaScript.ORDER_ATOMIC) + "; if (val === 'true') return true; if (val === 'false') return false; return !!val;})()", Blockly.JavaScript.ORDER_ATOMIC];
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
    + '     <value name="ITEM">'
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
        this.appendValueInput("VALUE")
            .appendField(Blockly.Words['convert_to_date'][systemLang]);

        this.setOutput(true, "Date");
        this.setTooltip(Blockly.Words['convert_to_date_tooltip'][systemLang])
    }
};
Blockly.JavaScript.convert_to_date = function (a) {
    return ['new Date(' + Blockly.JavaScript.valueToCode(a, "VALUE", Blockly.JavaScript.ORDER_ATOMIC) + ').getTime()', Blockly.JavaScript.ORDER_ATOMIC];
};

// --- from Date --------------------------------------------------
Blockly.Words['convert_from_date']         = {'en': 'date',                          'de': 'Datum',               'ru': 'дату'};
Blockly.Words['convert_to']                = {'en': 'to',                            'de': 'nach',                'ru': 'в'};
Blockly.Words['convert_from_date_tooltip'] = {'en': 'Cast input from date',          'de': 'Convert Eingang aus Datum', 'ru': 'Преобразовать вход из даты'};

Blockly.Convert.blocks['convert_from_date'] =
    '<block type="convert_from_date">'
    + '     <value name="VALUE">'
    + '     </value>'
    + '     <value name="OPTION">'
    + '     </value>'
    + '     <mutation format="false" language="false"></mutation>'
    + '     <value name="FORMAT">'
    + '     </value>'
    + '     <value name="LANGUAGE">'
    + '     </value>'
    + '</block>';

Blockly.Blocks.convert_from_date = {
    init: function () {
        this.setColour(Blockly.Convert.HUE);
        this.appendValueInput("VALUE")
            .appendField(Blockly.Words['convert_from_date'][systemLang]);

        this.appendDummyInput("OPTION")
            .appendField(Blockly.Words['convert_to'][systemLang])
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Words['time_get_ms'][systemLang]            , "ms"],
                [Blockly.Words['time_get_s'][systemLang]             , "s"],
                [Blockly.Words['time_get_m'][systemLang]             , "m"],
                [Blockly.Words['time_get_h'][systemLang]             , "h"],
                [Blockly.Words['time_get_d'][systemLang]             , "d"],
                [Blockly.Words['time_get_M'][systemLang]             , "M"],
                [Blockly.Words['time_get_Mt'][systemLang]            , "Mt"],
                [Blockly.Words['time_get_y'][systemLang]             , "y"],
                [Blockly.Words['time_get_fy'][systemLang]            , "fy"],
                [Blockly.Words['time_get_wdt'][systemLang]           , "wdt"],
                [Blockly.Words['time_get_wd'][systemLang]            , "wd"],
                [Blockly.Words['time_get_custom'][systemLang]        , "custom"],
                [Blockly.Words['time_get_object'][systemLang]        , "object"],
                [Blockly.Words['time_get_yyyy.mm.dd'][systemLang]    , [Blockly.Words['time_get_yyyy.mm.dd']  .format]],
                [Blockly.Words['time_get_yyyy/mm/dd'][systemLang]    , [Blockly.Words['time_get_yyyy/mm/dd']  .format]],
                [Blockly.Words['time_get_yy.mm.dd'][systemLang]      , [Blockly.Words['time_get_yy.mm.dd']    .format]],
                [Blockly.Words['time_get_yy/mm/dd'][systemLang]      , [Blockly.Words['time_get_yy/mm/dd']    .format]],
                [Blockly.Words['time_get_dd.mm.yyyy'][systemLang]    , [Blockly.Words['time_get_dd.mm.yyyy']  .format]],
                [Blockly.Words['time_get_dd/mm/yyyy'][systemLang]    , [Blockly.Words['time_get_dd/mm/yyyy']  .format]],
                [Blockly.Words['time_get_dd.mm.yy'][systemLang]      , [Blockly.Words['time_get_dd.mm.yy']    .format]],
                [Blockly.Words['time_get_dd/mm/yy'][systemLang]      , [Blockly.Words['time_get_dd/mm/yy']    .format]],
                [Blockly.Words['time_get_mm/dd/yyyy'][systemLang]    , [Blockly.Words['time_get_mm/dd/yyyy']  .format]],
                [Blockly.Words['time_get_mm/dd/yy'][systemLang]      , [Blockly.Words['time_get_mm/dd/yy']    .format]],
                [Blockly.Words['time_get_dd.mm'][systemLang]         , [Blockly.Words['time_get_dd.mm']       .format]],
                [Blockly.Words['time_get_dd/mm'][systemLang]         , [Blockly.Words['time_get_dd/mm']       .format]],
                [Blockly.Words['time_get_mm.dd'][systemLang]         , [Blockly.Words['time_get_mm.dd']       .format]],
                [Blockly.Words['time_get_mm/dd'][systemLang]         , [Blockly.Words['time_get_mm/dd']       .format]],
                [Blockly.Words['time_get_hh_mm'][systemLang]         , [Blockly.Words['time_get_hh_mm']       .format]],
                [Blockly.Words['time_get_hh_mm_ss'][systemLang]      , [Blockly.Words['time_get_hh_mm_ss']    .format]],
                [Blockly.Words['time_get_hh_mm_ss.sss'][systemLang]  , [Blockly.Words['time_get_hh_mm_ss.sss'].format]]
            ], function (option) {
                this.sourceBlock_.updateShape_(option === 'custom', option === 'wdt' || option === 'Mt');
            }), "OPTION");


        this.setInputsInline(true);
        this.setOutput(true);
        this.setTooltip(Blockly.Words['convert_from_date_tooltip'][systemLang])
    },
    mutationToDom: function() {
        var container = document.createElement('mutation');
        var option = this.getFieldValue('OPTION');
        container.setAttribute('format', option === 'custom' ? 'true' : 'false');
        container.setAttribute('language', option === 'wdt' || option === 'Mt' ? 'true' : 'false');
        return container;
    },
    domToMutation: function(xmlElement) {
        this.updateShape_(xmlElement.getAttribute('format') === 'true', xmlElement.getAttribute('language') === 'true');
    },
    updateShape_: function(isFormat, isLanguage) {
        // Add or remove a delay Input.
        var inputExists = this.getInput('FORMAT');

        if (isFormat) {
            if (!inputExists) {
                this.appendDummyInput('FORMAT')
                    .appendField(' ')
                    .appendField(new Blockly.FieldTextInput(Blockly.Words['time_get_default_format'][systemLang]), 'FORMAT');
            }
        } else if (inputExists) {
            this.removeInput('FORMAT');
        }

        inputExists = this.getInput('LANGUAGE');

        if (isLanguage) {
            if (!inputExists) {
                var languages;
                if (systemLang === 'en') {
                    languages = [["in english", "en"], ["auf deutsch", "de"], ["на русском", "ru"]];
                } else if (systemLang === 'de') {
                    languages = [["auf deutsch", "de"], ["in english", "en"], ["на русском", "ru"]];
                } else if (systemLang === 'ru') {
                    languages = [["на русском", "ru"], ["in english", "en"], ["auf deutsch", "de"]];
                } else {
                    languages = [["in english", "en"], ["auf deutsch", "de"], ["на русском", "ru"]];
                }
                this.appendDummyInput("LANGUAGE")
                    .appendField(new Blockly.FieldDropdown(languages), "LANGUAGE");
            }
        } else if (inputExists) {
            this.removeInput('LANGUAGE');
        }
    }
};
Blockly.JavaScript.convert_from_date = function (block) {
    var option = block.getFieldValue('OPTION');
    var format = block.getFieldValue('FORMAT');

    var value = Blockly.JavaScript.valueToCode(block, "ITEM", Blockly.JavaScript.ORDER_ATOMIC);
    var code;
    if (option === "object") {
        code = '(new Date(' + value + ').getTime())';
    } else if (option === "ms") {
        code = '(new Date(' + value + ').getMilliseconds())';
    } else if (option === "s") {
        code = '(new Date(' + value + ').getSeconds())';
    } else if (option === "h") {
        code = '(new Date(' + value + ').getHours())';
    } else if (option === "d") {
        code = '(new Date(' + value + ').getDate())';
    } else if (option === "M") {
        code = '(new Date(' + value + ').getMonth() + 1)';
    } else if (option === "Mt") {
        code = '(new Date(' + value + ').getMonth() + 1)';
    } else if (option === "y") {
        code = '(new Date(' + value + ').getYear())';
    } else if (option === "fy") {
        code = '(new Date(' + value + ').getFullYear())';
    } else if (option === "wdt") {
        code = '(new Date(' + value + ').getDay())';
    } else if (option === "wd") {
        code = '(new Date(' + value + ').getDay())';
    } else if (option === "custom") {
        code = 'formatDate(new Date(' + value + '), "' + format + '")';
    } else {
        code = 'formatDate(new Date(' + value + '), "' + option + '")';
    }

    return [code, Blockly.JavaScript.ORDER_ATOMIC];
};

