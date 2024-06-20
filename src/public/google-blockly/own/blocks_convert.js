'use strict';

if (typeof goog !== 'undefined') {
    goog.provide('Blockly.JavaScript.Convert');
    goog.require('Blockly.JavaScript');
}

Blockly.CustomBlocks = Blockly.CustomBlocks || [];
Blockly.CustomBlocks.push('Convert');

Blockly.Convert = {
    HUE: 280,
    blocks: {},
};

Blockly.Blocks.Convert = {};
Blockly.JavaScript.Convert = {};

// --- to Number --------------------------------------------------
Blockly.Convert.blocks['convert_tonumber'] =
    '<block type="convert_tonumber">' +
    '</block>';

Blockly.Blocks.convert_tonumber = {
    init: function () {
        this.appendValueInput('VALUE')
            .appendField(Blockly.Translate('convert_tonumber'));

        this.setOutput(true, 'Number');

        this.setColour(Blockly.Convert.HUE);

        this.setTooltip(Blockly.Translate('convert_tonumber_tooltip'));
    },
};

Blockly.JavaScript.convert_tonumber = function (a) {
    return ['parseFloat(' + Blockly.JavaScript.valueToCode(a, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC) + ')', Blockly.JavaScript.ORDER_ATOMIC];
};

// --- to Boolean --------------------------------------------------
Blockly.Convert.blocks['convert_toboolean'] =
    '<block type="convert_toboolean">' +
    '</block>';

Blockly.Blocks.convert_toboolean = {
    init: function () {
        this.appendValueInput('VALUE')
            .appendField(Blockly.Translate('convert_toboolean'));

        this.setOutput(true, 'Boolean');

        this.setColour(Blockly.Convert.HUE);

        this.setTooltip(Blockly.Translate('convert_toboolean_tooltip'));
    },
};

Blockly.JavaScript.forBlock['convert_toboolean'] = function (block) {
    const vValue = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC);

    return ['(() => {\n' +
        `  const val = ${vValue};\n` +
        `  if (val === 'true' || val === 'TRUE') return true;\n` +
        `  if (val === 'false' || val === 'FALSE') return false;\n` +
        '  return !!val;\n' +
        '})()', Blockly.JavaScript.ORDER_ATOMIC];
};

// --- to String --------------------------------------------------
Blockly.Convert.blocks['convert_tostring'] =
    '<block type="convert_tostring">' +
    '</block>';

Blockly.Blocks.convert_tostring = {
    init: function () {
        this.appendValueInput('VALUE')
            .appendField(Blockly.Translate('convert_tostring'));

        this.setOutput(true, 'String');

        this.setColour(Blockly.Convert.HUE);

        this.setTooltip(Blockly.Translate('convert_tostring_tooltip'));
    },
};

Blockly.JavaScript.forBlock['convert_tostring'] = function (block) {
    const vValue = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC);

    return [`('' + ${vValue})`, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- get type --------------------------------------------------
Blockly.Convert.blocks['convert_type'] =
    '<block type="convert_type">' +
    '</block>';

Blockly.Blocks.convert_type = {
    init: function () {
        this.appendValueInput('ITEM')
            .appendField(Blockly.Translate('convert_type'));

        this.setOutput(true, 'String');

        this.setColour(Blockly.Convert.HUE);

        this.setTooltip(Blockly.Translate('convert_type_tooltip'));
    },
};

Blockly.JavaScript.forBlock['convert_type'] = function (block) {
    const vItem = Blockly.JavaScript.valueToCode(block, 'ITEM', Blockly.JavaScript.ORDER_ATOMIC);

    return [`typeof ${vItem}`, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- to Date --------------------------------------------------
Blockly.Convert.blocks['convert_to_date'] =
    '<block type="convert_to_date">' +
    '</block>';

Blockly.Blocks.convert_to_date = {
    init: function () {
        this.appendValueInput('VALUE')
            .appendField(Blockly.Translate('convert_to_date'));

        this.setOutput(true, 'Date');

        this.setColour(Blockly.Convert.HUE);

        this.setTooltip(Blockly.Translate('convert_to_date_tooltip'));
    },
};

Blockly.JavaScript.forBlock['convert_to_date'] = function (block) {
    const vValue = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC);

    return [`getDateObject(${vValue}).getTime()`, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- from Date --------------------------------------------------
Blockly.Convert.blocks['convert_from_date'] =
    '<block type="convert_from_date">' +
    '  <mutation format="false" language="false"></mutation>' +
    '  <field name="OPTION">object</field>' +
    '</block>';

Blockly.Blocks.convert_from_date = {
    init: function () {
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
                [Blockly.Translate('time_get_cw')            , 'cw'],
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
                [Blockly.Translate('time_get_hh_mm_ss.sss')  , Blockly.Words['time_get_hh_mm_ss.sss'].format],
            ], function (option) {
                this.sourceBlock_.updateShape_(option === 'custom', option === 'wdts' || option === 'wdt' || option === 'Mt' || option === 'Mts');
            }), 'OPTION');

        this.setInputsInline(true);
        this.setOutput(true);

        this.setColour(Blockly.Convert.HUE);

        this.setTooltip(Blockly.Translate('convert_from_date_tooltip'));
    },
    mutationToDom: function () {
        const container = document.createElement('mutation');
        const option = this.getFieldValue('OPTION');

        container.setAttribute('format', option === 'custom' ? 'true' : 'false');
        container.setAttribute('language', option === 'wdt' || option === 'wdts' || option === 'Mt' || option === 'Mts' ? 'true' : 'false');

        return container;
    },
    domToMutation: function (xmlElement) {
        const format = xmlElement.getAttribute('format');
        const language = xmlElement.getAttribute('language');

        this.updateShape_(format === true || format === 'true' || format === 'TRUE', language === true || language === 'true' || language === 'TRUE');
    },
    updateShape_: function (isFormat, isLanguage) {
        // Add or remove a delay Input.
        let inputExists = this.getInput('FORMAT');

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
                let languages;
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
    },
};

Blockly.JavaScript.forBlock['convert_from_date'] = function (block) {
    const fOption = block.getFieldValue('OPTION');
    const fFormat = block.getFieldValue('FORMAT');
    const fLang = block.getFieldValue('LANGUAGE');
    const vValue = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC);

    let code;
    if (fOption === 'object') {
        code = `getDateObject(${vValue}).getTime()`;
    } else if (fOption === 'ms') {
        code = `getDateObject(${vValue}).getMilliseconds()`;
    } else if (fOption === 's') {
        code = `getDateObject(${vValue}).getSeconds()`;
    } else if (fOption === 'sid') {
        code = `(() => { const v = getDateObject(${vValue}); return v.getHours() * 3600 + v.getMinutes() * 60 + v.getSeconds(); })()`;
    } else if (fOption === 'm') {
        code = `getDateObject(${vValue}).getMinutes()`;
    } else if (fOption === 'mid') {
        code = `(() => { const v = getDateObject(${vValue}); return v.getHours() * 60 + v.getMinutes(); })()`;
    } else if (fOption === 'h') {
        code = `getDateObject(${vValue}).getHours()`;
    } else if (fOption === 'd') {
        code = `getDateObject(${vValue}).getDate()`;
    } else if (fOption === 'M') {
        code = `(getDateObject(${vValue}).getMonth() + 1)`;
    } else if (fOption === 'Mt') {
        code = `formatDate(getDateObject(${vValue}), 'OO', '${fLang}')`;
    } else if (fOption === 'Mts') {
        code = `formatDate(getDateObject(${vValue}), 'O', '${fLang}')`;
    } else if (fOption === 'y') {
        code = `getDateObject(${vValue}).getYear()`;
    } else if (fOption === 'fy') {
        code = `getDateObject(${vValue}).getFullYear()`;
    } else if (fOption === 'wdt') {
        code = `formatDate(getDateObject(${vValue}), 'WW', '${fLang}')`;
    } else if (fOption === 'wdts') {
        code = `formatDate(getDateObject(${vValue}), 'W', '${fLang}')`;
    } else if (fOption === 'wd') {
        code = `(() => { const d = getDateObject(${vValue}).getDay(); return d === 0 ? 7 : d; })()`;
    } else if (fOption === 'cw') {
        code = `((date) => { const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())); const dayNum = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - dayNum); const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7); })(getDateObject(${vValue}))`;
    } else if (fOption === 'custom') {
        code = `formatDate(getDateObject(${vValue}), ${Blockly.JavaScript.quote_(fFormat)})`;
    } else {
        code = `formatDate(getDateObject(${vValue}), ${Blockly.JavaScript.quote_(fOption)})`;
    }

    return [code, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- time difference --------------------------------------------------
Blockly.Convert.blocks['convert_time_difference'] =
    '<block type="convert_time_difference">' +
    '  <mutation format="false"></mutation> ' +
    '  <field name="OPTION">hh:mm:ss</field> ' +
    '</block>';

Blockly.Blocks.convert_time_difference = {
    init: function () {
        this.appendValueInput('VALUE')
            .appendField(Blockly.Translate('convert_time_difference'));

        this.appendDummyInput('OPTION')
            .appendField(Blockly.Translate('convert_to'))
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('time_difference_hh:mm:ss'), 'hh:mm:ss'],
                [Blockly.Translate('time_difference_h:m:s'), 'h:m:s'],
                [Blockly.Translate('time_difference_hh:mm'), 'hh:mm'],
                [Blockly.Translate('time_difference_h:m'), 'h:m'],
                [Blockly.Translate('time_difference_mm:ss'), 'mm:ss'],
                [Blockly.Translate('time_difference_m:s'), 'm:s'],
                [Blockly.Translate('time_difference_custom'), 'custom'],
            ], function (option) {
                this.sourceBlock_.updateShape_(option === 'custom');
            }), 'OPTION');

        this.setInputsInline(true);
        this.setOutput(true, 'String');

        this.setColour(Blockly.Convert.HUE);

        this.setTooltip(Blockly.Translate('convert_time_difference_tooltip'));
    },
    mutationToDom: function () {
        const container = document.createElement('mutation');
        const option = this.getFieldValue('OPTION');

        container.setAttribute('format', option === 'custom' ? 'true' : 'false');

        return container;
    },
    domToMutation: function (xmlElement) {
        const format = xmlElement.getAttribute('format');

        this.updateShape_(format === true || format === 'true' || format === 'TRUE');
    },
    updateShape_: function (isFormat, isLanguage) {
        let inputExists = this.getInput('FORMAT');

        if (isFormat) {
            if (!inputExists) {
                this.appendDummyInput('FORMAT')
                    .appendField(' ')
                    .appendField(new Blockly.FieldTextInput(Blockly.Translate('time_difference_default_format')), 'FORMAT');
            }
        } else if (inputExists) {
            this.removeInput('FORMAT');
        }
    },
};

Blockly.JavaScript.forBlock['convert_time_difference'] = function (block) {
    const fOption = block.getFieldValue('OPTION');
    const fFormat = block.getFieldValue('FORMAT');
    const vValue = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC);

    return [`formatTimeDiff(${vValue ? vValue : '0'}, ${Blockly.JavaScript.quote_(fOption === 'custom' ? fFormat : fOption)})`, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- json2object --------------------------------------------------
Blockly.Convert.blocks['convert_json2object'] =
    '<block type="convert_json2object">' +
    '</block>';

Blockly.Blocks.convert_json2object = {
    init: function () {
        this.appendValueInput('VALUE')
            .appendField(Blockly.Translate('convert_json2object'));

        this.setOutput(true);

        this.setColour(Blockly.Convert.HUE);

        this.setTooltip(Blockly.Translate('convert_json2object_tooltip'));
    },
};

Blockly.JavaScript.forBlock['convert_json2object'] = function (block) {
    const vValue = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC);

    return [`(() => { try { return JSON.parse(${vValue}); } catch (e) { return {}; }})()`, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- object2json --------------------------------------------------
Blockly.Convert.blocks['convert_object2json'] =
    '<block type="convert_object2json">' +
    '  <field name="PRETTIFY">FALSE</field>' +
    '</block>';

Blockly.Blocks.convert_object2json = {
    init: function () {
        this.appendValueInput('VALUE')
            .appendField(Blockly.Translate('convert_object2json'));

        this.appendDummyInput('PRETTIFY')
            .appendField(Blockly.Translate('convert_object2json_prettify'))
            .appendField(new Blockly.FieldCheckbox('FALSE'), 'PRETTIFY');

        this.setOutput(true, 'String');

        this.setColour(Blockly.Convert.HUE);

        this.setTooltip(Blockly.Translate('convert_object2json_tooltip'));
    },
};

Blockly.JavaScript.forBlock['convert_object2json'] = function (block) {
    const vValue = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC);

    let fPrettify = block.getFieldValue('PRETTIFY');
    fPrettify = fPrettify === 'TRUE' || fPrettify === 'true' || fPrettify === true;

    return [`JSON.stringify(${vValue}${fPrettify ? ', null, 2' : ''})`, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- to single value -------------------------------------------
Blockly.Convert.blocks['convert_jsonata'] =
    '<block type="convert_jsonata">' +
    '  <value name="EXPRESSION">' +
    '    <shadow type="text">' +
    '      <field name="TEXT">*</field>' +
    '    </shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks.convert_jsonata = {
    init: function () {
        this.appendValueInput('EXPRESSION')
            .appendField(Blockly.Translate('convert_jsonata'));

        this.appendValueInput('TARGET')
            .appendField(Blockly.Translate('convert_jsonata_target'));

        this.setInputsInline(true);
        this.setOutput(true, 'String');

        this.setColour(Blockly.Convert.HUE);

        this.setTooltip(Blockly.Translate('convert_jsonata_tooltip'));
    },
};

Blockly.JavaScript.forBlock['convert_jsonata'] = function (block) {
    const vExpression = Blockly.JavaScript.valueToCode(block, 'EXPRESSION', Blockly.JavaScript.ORDER_ATOMIC);

    let vTarget = Blockly.JavaScript.valueToCode(block, 'TARGET', Blockly.JavaScript.ORDER_ATOMIC);
    if (!vTarget) {
        vTarget = '{}';
    }

    return [`(await jsonataExpression(${vTarget}, ${vExpression}))`, Blockly.JavaScript.ORDER_ATOMIC];
};
