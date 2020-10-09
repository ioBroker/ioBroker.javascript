'use strict';

if (typeof goog !== 'undefined') {
    goog.provide('Blockly.JavaScript.Convert');

    goog.require('Blockly.JavaScript');
}

Blockly.CustomBlocks = Blockly.CustomBlocks || [];
Blockly.CustomBlocks.push('Convert');

Blockly.Convert = {
    HUE: 280,
    blocks: {}
};

Blockly.Blocks.Convert = {};
Blockly.JavaScript.Convert = {};

// --- to Number --------------------------------------------------
Blockly.Convert.blocks['convert_tonumber'] =
    '<block type="convert_tonumber">'
    + '     <value name="VALUE">'
    + '     </value>'
    + '</block>';

Blockly.Blocks.convert_tonumber = {
    init: function () {
        this.setColour(Blockly.Convert.HUE);

        this.appendValueInput("VALUE")
            .appendField(Blockly.Translate('convert_tonumber'));

        this.setOutput(true, "Number");
        this.setTooltip(Blockly.Translate('convert_tonumber_tooltip'));
    }
};
Blockly.JavaScript.convert_tonumber = function (a) {
    return ["parseFloat(" + Blockly.JavaScript.valueToCode(a, "VALUE", Blockly.JavaScript.ORDER_ATOMIC) + ")", Blockly.JavaScript.ORDER_ATOMIC];
};

// --- to Boolean --------------------------------------------------
Blockly.Convert.blocks['convert_toboolean'] =
    '<block type="convert_toboolean">'
    + '     <value name="VALUE">'
    + '     </value>'
    + '</block>';

Blockly.Blocks.convert_toboolean = {
    init: function () {
        this.setColour(Blockly.Convert.HUE);
        this.appendValueInput("VALUE").appendField(Blockly.Translate('convert_toboolean'));
        this.setOutput(true, "Boolean");
        this.setTooltip(Blockly.Translate('convert_toboolean_tooltip'))
    }
};

Blockly.JavaScript.convert_toboolean = function (a) {
    return ["(function (){var val = " + Blockly.JavaScript.valueToCode(a, "VALUE", Blockly.JavaScript.ORDER_ATOMIC) + "; if (val === 'true') return true; if (val === 'false') return false; return !!val;})()", Blockly.JavaScript.ORDER_ATOMIC];
};

// --- to String --------------------------------------------------
Blockly.Convert.blocks['convert_tostring'] =
    '<block type="convert_tostring">'
    + '     <value name="VALUE">'
    + '     </value>'
    + '</block>';

Blockly.Blocks.convert_tostring = {
    init: function () {
        this.setColour(Blockly.Convert.HUE);
        this.appendValueInput("VALUE").appendField(Blockly.Translate('convert_tostring'));
        this.setOutput(true, "String");
        this.setTooltip(Blockly.Translate('convert_tostring_tooltip'))
    }
};

Blockly.JavaScript.convert_tostring = function (a) {
    return ["('' + " + Blockly.JavaScript.valueToCode(a, "VALUE", Blockly.JavaScript.ORDER_ATOMIC) + ")", Blockly.JavaScript.ORDER_ATOMIC];
};

// --- get type --------------------------------------------------
Blockly.Convert.blocks['convert_type'] =
    '<block type="convert_type">'
    + '     <value name="ITEM">'
    + '     </value>'
    + '</block>';

Blockly.Blocks.convert_type = {
    init: function () {
        this.setColour(Blockly.Convert.HUE);

        this.appendValueInput('ITEM')
            .appendField(Blockly.Translate('convert_type'));

        this.setOutput(true, 'String');
        this.setTooltip(Blockly.Translate('convert_type_tooltip'))
    }
};
Blockly.JavaScript.convert_type = function (a) {
    return ['typeof ' + Blockly.JavaScript.valueToCode(a, 'ITEM', Blockly.JavaScript.ORDER_ATOMIC), Blockly.JavaScript.ORDER_ATOMIC];
};

// --- to Date --------------------------------------------------
Blockly.Convert.blocks['convert_to_date'] =
    '<block type="convert_to_date">'
    + '     <value name="VALUE">'
    + '     </value>'
    + '</block>';

Blockly.Blocks.convert_to_date = {
    init: function () {

        this.appendValueInput('VALUE')
            .appendField(Blockly.Translate('convert_to_date'));

        this.setColour(Blockly.Convert.HUE);
        this.setOutput(true, 'Date');
        this.setTooltip(Blockly.Translate('convert_to_date_tooltip'))
    }
};
Blockly.JavaScript.convert_to_date = function (a) {
    return ['getDateObject(' + Blockly.JavaScript.valueToCode(a, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC) + ').getTime()', Blockly.JavaScript.ORDER_ATOMIC];
};

// --- from Date --------------------------------------------------
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
        this.appendValueInput('VALUE')
            .appendField(Blockly.Translate('convert_from_date'));

        this.appendDummyInput('OPTION')
            .appendField(Blockly.Translate('convert_to'))
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('time_get_object')        , 'object'],
                [Blockly.Translate('time_get_ms')            , 'ms'],
                [Blockly.Translate('time_get_s')             , 's'],
                [Blockly.Translate('time_get_sid')           , 'sid'],
                [Blockly.Translate('time_get_m')             , 'm'],
                [Blockly.Translate('time_get_mid')           , 'mid'],
                [Blockly.Translate('time_get_h')             , 'h'],
                [Blockly.Translate('time_get_d')             , 'd'],
                [Blockly.Translate('time_get_M')             , 'M'],
                [Blockly.Translate('time_get_Mt')            , 'Mt'],
                [Blockly.Translate('time_get_Mts')           , 'Mts'],
                [Blockly.Translate('time_get_y')             , 'y'],
                [Blockly.Translate('time_get_fy')            , 'fy'],
                [Blockly.Translate('time_get_wdt')           , 'wdt'],
                [Blockly.Translate('time_get_wdts')          , 'wdts'],
                [Blockly.Translate('time_get_wd')            , 'wd'],
                [Blockly.Translate('time_get_custom')        , 'custom'],
                [Blockly.Translate('time_get_yyyy.mm.dd')    , Blockly.Words['time_get_yyyy.mm.dd']  .format],
                [Blockly.Translate('time_get_yyyy/mm/dd')    , Blockly.Words['time_get_yyyy/mm/dd']  .format],
                [Blockly.Translate('time_get_yy.mm.dd')      , Blockly.Words['time_get_yy.mm.dd']    .format],
                [Blockly.Translate('time_get_yy/mm/dd')      , Blockly.Words['time_get_yy/mm/dd']    .format],
                [Blockly.Translate('time_get_dd.mm.yyyy')    , Blockly.Words['time_get_dd.mm.yyyy']  .format],
                [Blockly.Translate('time_get_dd/mm/yyyy')    , Blockly.Words['time_get_dd/mm/yyyy']  .format],
                [Blockly.Translate('time_get_dd.mm.yy')      , Blockly.Words['time_get_dd.mm.yy']    .format],
                [Blockly.Translate('time_get_dd/mm/yy')      , Blockly.Words['time_get_dd/mm/yy']    .format],
                [Blockly.Translate('time_get_mm/dd/yyyy')    , Blockly.Words['time_get_mm/dd/yyyy']  .format],
                [Blockly.Translate('time_get_mm/dd/yy')      , Blockly.Words['time_get_mm/dd/yy']    .format],
                [Blockly.Translate('time_get_dd.mm')         , Blockly.Words['time_get_dd.mm']       .format],
                [Blockly.Translate('time_get_dd/mm')         , Blockly.Words['time_get_dd/mm']       .format],
                [Blockly.Translate('time_get_mm.dd')         , Blockly.Words['time_get_mm.dd']       .format],
                [Blockly.Translate('time_get_mm/dd')         , Blockly.Words['time_get_mm/dd']       .format],
                [Blockly.Translate('time_get_hh_mm')         , Blockly.Words['time_get_hh_mm']       .format],
                [Blockly.Translate('time_get_hh_mm_ss')      , Blockly.Words['time_get_hh_mm_ss']    .format],
                [Blockly.Translate('time_get_hh_mm_ss.sss')  , Blockly.Words['time_get_hh_mm_ss.sss'].format]
            ], function (option) {
                this.sourceBlock_.updateShape_(option === 'custom', option === 'wdts' || option === 'wdt' || option === 'Mt' || option === 'Mts');
            }), 'OPTION');


        this.setInputsInline(true);
        this.setOutput(true);
        this.setTooltip(Blockly.Translate('convert_from_date_tooltip'))
    },
    mutationToDom: function() {
        var container = document.createElement('mutation');
        var option = this.getFieldValue('OPTION');
        container.setAttribute('format', option === 'custom' ? 'true' : 'false');
        container.setAttribute('language', option === 'wdt' || option === 'wdts' || option === 'Mt' || option === 'Mts' ? 'true' : 'false');
        return container;
    },
    domToMutation: function(xmlElement) {
        var format = xmlElement.getAttribute('format');
        var language = xmlElement.getAttribute('language');

        this.updateShape_(format === true || format === 'true' || format === 'TRUE', language === true || language === 'true' || language === 'TRUE');
    },
    updateShape_: function(isFormat, isLanguage) {
        // Add or remove a delay Input.
        var inputExists = this.getInput('FORMAT');

        if (isFormat) {
            if (!inputExists) {
                this.appendDummyInput('FORMAT')
                    .appendField(' ')
                    .appendField(new Blockly.FieldTextInput(Blockly.Translate('time_get_default_format')), 'FORMAT');
            }
        } else if (inputExists) {
            this.removeInput('FORMAT');
        }

        inputExists = this.getInput('LANGUAGE');

        if (isLanguage) {
            if (!inputExists) {
                var languages;
                if (systemLang === 'en') {
                    languages = [['in english', 'en'], ['auf deutsch', 'de'], ['на русском', 'ru']];
                } else if (systemLang === 'de') {
                    languages = [['auf deutsch', 'de'], ['in english', 'en'], ['на русском', 'ru']];
                } else if (systemLang === 'ru') {
                    languages = [['на русском', 'ru'], ['in english', 'en'], ['auf deutsch', 'de']];
                } else {
                    languages = [['in english', 'en'], ['auf deutsch', 'de'], ['на русском', 'ru']];
                }
                this.appendDummyInput('LANGUAGE')
                    .appendField(new Blockly.FieldDropdown(languages), 'LANGUAGE');
            }
        } else if (inputExists) {
            this.removeInput('LANGUAGE');
        }
    }
};
Blockly.JavaScript.convert_from_date = function (block) {
    var option = block.getFieldValue('OPTION');
    var format = block.getFieldValue('FORMAT');
    var lang   = block.getFieldValue('LANGUAGE');

    var value = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC);

    var code;
    if (option === 'object') {
        code = 'getDateObject(' + value + ').getTime()';
    } else if (option === 'ms') {
        code = 'getDateObject(' + value + ').getMilliseconds()';
    } else if (option === 's') {
        code = 'getDateObject(' + value + ').getSeconds()';
    } else if (option === 'sid') {
        code = '(function () {var v = getDateObject(' + value + '); return v.getHours() * 3600 + v.getMinutes() * 60 + v.getSeconds();})()';
    } else if (option === 'm') {
        code = '(getDateObject(' + value + ').getMinutes())';
    } else if (option === 'mid') {
        code = '(function () {var v = getDateObject(' + value + '); return v.getHours() * 60 + v.getMinutes();})()';
    } else if (option === 'h') {
        code = 'getDateObject(' + value + ').getHours()';
    } else if (option === 'd') {
        code = 'getDateObject(' + value + ').getDate()';
    } else if (option === 'M') {
        code = '(getDateObject(' + value + ').getMonth() + 1)';
    } else if (option === 'Mt') {
        code = 'formatDate(getDateObject(' + value + '), "OO", "' + lang + '")';
    } else if (option === 'Mts') {
        code = 'formatDate(getDateObject(' + value + '), "O", "' + lang + '")';
    } else if (option === 'y') {
        code = 'getDateObject(' + value + ').getYear()';
    } else if (option === 'fy') {
        code = 'getDateObject(' + value + ').getFullYear()';
    } else if (option === 'wdt') {
        code = 'formatDate(getDateObject(' + value + '), "WW", "' + lang + '")';
    } else if (option === 'wdts') {
        code = 'formatDate(getDateObject(' + value + '), "W", "' + lang + '")';
    } else if (option === 'wd') {
        code = 'getDateObject(' + value + ').getDay()';
    } else if (option === 'custom') {
        code = 'formatDate(getDateObject(' + value + '), "' + format + '")';
    } else {
        code = 'formatDate(getDateObject(' + value + '), "' + option + '")';
    }

    return [code, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- json2object --------------------------------------------------
Blockly.Convert.blocks['convert_json2object'] =
    '<block type="convert_json2object">'
    + '     <value name="VALUE">'
    + '     </value>'
    + '</block>';

Blockly.Blocks.convert_json2object = {
    init: function () {

        this.appendValueInput('VALUE')
            .appendField(Blockly.Translate('convert_json2object'));

        this.setColour(Blockly.Convert.HUE);
        this.setOutput(true);
        this.setTooltip(Blockly.Translate('convert_json2object_tooltip'))
    }
};
Blockly.JavaScript.convert_json2object = function (a) {
    return ['(function () { try {return JSON.parse(' + Blockly.JavaScript.valueToCode(a, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC) + ');} catch(e) {return {};}})()', Blockly.JavaScript.ORDER_ATOMIC];
};

// --- object2json --------------------------------------------------
Blockly.Convert.blocks['convert_object2json'] =
    '<block type="convert_object2json">'
    + '     <value name="VALUE">'
    + '     </value>'
    + '     <value name="PRETTIFY">'
    + '     </value>'
    + '</block>';

Blockly.Blocks.convert_object2json = {
    init: function () {

        this.appendValueInput('VALUE')
            .appendField(Blockly.Translate('convert_object2json'));

        this.appendDummyInput('PRETTIFY')
            .appendField(Blockly.Translate('convert_object2json_prettify'))
            .appendField(new Blockly.FieldCheckbox('FALSE'), 'PRETTIFY');

        this.setColour(Blockly.Convert.HUE);
        this.setOutput(true, 'String');
        this.setTooltip(Blockly.Translate('convert_object2json_tooltip'))
    }
};
Blockly.JavaScript.convert_object2json = function (block) {
    var prettify = block.getFieldValue('PRETTIFY');
    prettify = prettify === 'TRUE' || prettify === 'true' || prettify === true;
    return ['JSON.stringify(' + Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC) + (prettify ? ', null, 2' : '') + ')', Blockly.JavaScript.ORDER_ATOMIC];
};

// --- to single value -------------------------------------------
Blockly.Convert.blocks['convert_jsonata'] =
    '<block type="convert_jsonata">'
    + '     <value name="EXPRESSION">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">*</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="TARGET">'
    + '     </value>'
    + '</block>';

Blockly.Blocks.convert_jsonata = {
    init: function () {

        this.appendValueInput('EXPRESSION')
            .appendField(Blockly.Translate('convert_jsonata'));

        this.appendValueInput('TARGET')
            .appendField(Blockly.Translate('convert_jsonata_target'));

        this.setInputsInline(true);
        this.setColour(Blockly.Convert.HUE);
        this.setOutput(true, 'String');
        this.setTooltip(Blockly.Translate('convert_jsonata_tooltip'))
    }
};
Blockly.JavaScript.convert_jsonata = function (block) {
    return ['jsonataExpression(' + Blockly.JavaScript.valueToCode(block, 'TARGET', Blockly.JavaScript.ORDER_ATOMIC) + ',' + Blockly.JavaScript.valueToCode(block, 'EXPRESSION', Blockly.JavaScript.ORDER_ATOMIC) + ')', Blockly.JavaScript.ORDER_ATOMIC];
};
