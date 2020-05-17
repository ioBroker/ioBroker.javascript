'use strict';

if (typeof goog !== 'undefined') {
    goog.provide('Blockly.JavaScript.Time');

    goog.require('Blockly.JavaScript');
}

Blockly.CustomBlocks = Blockly.CustomBlocks || [];
Blockly.CustomBlocks.push('Time');

Blockly.Time = {
    HUE: 270,
    blocks: {}
};


// if time greater, less, between
// --- time compare --------------------------------------------------
Blockly.Time.blocks['time_compare_ex'] =
    '<block type="time_compare_ex">'
    + '     <value name="OPTION">'
    + '     </value>'
    + '     <value name="USE_ACTUAL_TIME">'
    + '     </value>'
    + '     <value name="START_TIME">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">12:00</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <mutation end_time="false" actual_time="true"></mutation>'
    + '     <value name="END_TIME">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">18:00</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="CUSTOM_TIME">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">14:00</field>'
    + '         </shadow>'
    + '     </value>'
    + '</block>';

Blockly.Blocks['time_compare_ex'] = {
    init: function() {
        this.appendDummyInput('TIME_TEXT')
            .appendField(Blockly.Translate('time_compare_ex'));

        this.appendDummyInput('USE_ACTUAL_TIME')
            .appendField(new Blockly.FieldCheckbox('TRUE', function (option) {
                this.sourceBlock_.updateShape_(undefined, option);
            }), 'USE_ACTUAL_TIME');

        this.appendDummyInput()
            .appendField(Blockly.Translate('time_compare_is_ex'));

        this.appendDummyInput('OPTION')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('time_compare_lt'), '<'],
                [Blockly.Translate('time_compare_le'), '<='],
                [Blockly.Translate('time_compare_gt'), '>'],
                [Blockly.Translate('time_compare_ge'), '>='],
                [Blockly.Translate('time_compare_eq'), '=='],
                [Blockly.Translate('time_compare_bw'), 'between'],
                [Blockly.Translate('time_compare_nb'), 'not between']
            ], function (option) {
                this.sourceBlock_.updateShape_((option === 'between' || option === 'not between'));
            }), 'OPTION');

        this.appendDummyInput()
            .appendField(' ');

        this.appendValueInput('START_TIME');

        this.setInputsInline(true);
        //this.setPreviousStatement(true, null);
        //this.setNextStatement(true, null);

        this.setOutput(true, 'Boolean');

        this.setColour(Blockly.Time.HUE);
        this.setTooltip(Blockly.Translate('time_compare_ex_tooltip'));
        this.setHelpUrl(Blockly.Translate('time_compare_ex_help'));
    },
    mutationToDom: function() {
        var container = document.createElement('mutation');
        var option = this.getFieldValue('OPTION');
        var use_actual_time = this.getFieldValue('USE_ACTUAL_TIME');
        container.setAttribute('end_time', option === 'between' || option === 'not between' ? 'true' : 'false');
        container.setAttribute('actual_time', use_actual_time === 'TRUE' || use_actual_time === 'true' || use_actual_time === true ? 'true' : 'false');
        return container;
    },
    domToMutation: function(xmlElement) {
        var end_time = xmlElement.getAttribute('end_time');
        var actual_time = xmlElement.getAttribute('actual_time');
        this.updateShape_(end_time === true || end_time === 'true' || end_time === 'TRUE', actual_time === true || actual_time === 'true' || actual_time === 'TRUE');
    },
    updateShape_: function(isBetween, useActualTime) {
        if (isBetween === undefined) {
            isBetween = this.getFieldValue('OPTION') === 'between' || this.getFieldValue('OPTION') === 'not between';
        }
        // Add or remove a delay Input.
        var inputExists = this.getInput('END_TIME');

        if (isBetween) {
            if (!inputExists) {
                inputExists = this.getInput('CUSTOM_TIME');

                if (inputExists) {
                    this.removeInput('CUSTOM_TIME');
                    this.removeInput('CUSTOM_TEXT');
                }

                this.appendDummyInput('AND')
                    .appendField(Blockly.Translate('time_compare_and'));

                var input = this.appendValueInput('END_TIME');

                if (!window.scripts.loading) {
                    var wp = this.workspace;

                    setTimeout(function () {
                        if (!input.connection.isConnected()) {
                            var shadow = wp.newBlock('text');
                            shadow.setShadow(true);
                            shadow.setFieldValue('18:00', 'TEXT');

                            shadow.outputConnection.connect(input.connection);
                            // input.connection.connect(shadow.outputConnection);

                            shadow.initSvg();
                            shadow.render();
                        }
                    }, 100);
                }
            }
        } else if (inputExists) {
            this.removeInput('END_TIME');
            this.removeInput('AND');
        }

        if (useActualTime === undefined) {
            useActualTime = this.getFieldValue('USE_ACTUAL_TIME');
            useActualTime = useActualTime === 'true' || useActualTime === 'TRUE' || useActualTime === true;
        }
        inputExists = this.getInput('CUSTOM_TIME');

        if (!useActualTime) {
            this.getInput('TIME_TEXT').fieldRow[0].setValue(Blockly.Translate('time_compare_custom_ex'));

            if (!inputExists) {
                this.appendDummyInput('CUSTOM_TEXT')
                    .appendField(Blockly.Translate('time_compare_ex_custom'));

                this.appendValueInput('CUSTOM_TIME');
            }
        } else if (inputExists) {
            this.getInput('TIME_TEXT').fieldRow[0].setValue(Blockly.Translate('time_compare_ex'));
            this.removeInput('CUSTOM_TIME');
            this.removeInput('CUSTOM_TEXT');
        }
    }
};

Blockly.JavaScript['time_compare_ex'] = function(block) {
    var option     = block.getFieldValue('OPTION');
    var start_time = Blockly.JavaScript.valueToCode(block, 'START_TIME', Blockly.JavaScript.ORDER_ATOMIC);
    var end_time   = Blockly.JavaScript.valueToCode(block, 'END_TIME', Blockly.JavaScript.ORDER_ATOMIC);
    var time       = Blockly.JavaScript.valueToCode(block, 'CUSTOM_TIME', Blockly.JavaScript.ORDER_ATOMIC);
    if (!end_time) end_time = null;
    if (!time) time = null;
    return ['compareTime(' + start_time + ', ' + end_time + ', "' + option + '", ' + time + ')', Blockly.JavaScript.ORDER_ATOMIC];
};

// if time greater, less, between
// --- time compare --------------------------------------------------
Blockly.Time.blocks['time_compare'] =
    '<block type="time_compare">'
    + '     <value name="OPTION">'
    + '     </value>'
    + '     <value name="START_TIME">'
    + '     </value>'
    + '     <mutation end_time="false"></mutation>'
    + '     <value name="END_TIME">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['time_compare'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(Blockly.Translate('time_compare'));

        this.appendDummyInput('OPTION')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('time_compare_lt'), "<"],
                [Blockly.Translate('time_compare_le'), "<="],
                [Blockly.Translate('time_compare_gt'), ">"],
                [Blockly.Translate('time_compare_ge'), ">="],
                [Blockly.Translate('time_compare_eq'), "=="],
                [Blockly.Translate('time_compare_bw'), "between"],
                [Blockly.Translate('time_compare_nb'), "not between"]
            ], function (option) {
                this.sourceBlock_.updateShape_((option === 'between' || option === 'not between'));
            }), 'OPTION');

        this.appendDummyInput()
            .appendField(' ');

        this.appendDummyInput('START_TIME')
            .appendField(new Blockly.FieldTextInput('12:00'), 'START_TIME');

        this.setInputsInline(true);
        //this.setPreviousStatement(true, null);
        //this.setNextStatement(true, null);

        this.setOutput(true, 'Boolean');

        this.setColour(Blockly.Time.HUE);
        this.setTooltip(Blockly.Translate('time_compare_tooltip'));
        this.setHelpUrl(Blockly.Translate('time_compare_help'));
    },

    mutationToDom: function() {
        var container = document.createElement('mutation');
        var option = this.getFieldValue('OPTION');
        container.setAttribute('end_time', (option === 'between' || option === 'not between') ? 'true' : 'false');
        return container;
    },
    domToMutation: function(xmlElement) {
        var option = xmlElement.getAttribute('end_time');
        this.updateShape_(option === true || option === 'true' || option === 'TRUE');
    },
    updateShape_: function(isBetween) {
        // Add or remove a delay Input.
        var inputExists = this.getInput('END_TIME');

        if (isBetween) {
            if (!inputExists) {
                this.appendDummyInput('AND')
                    .appendField(Blockly.Translate('time_compare_and'));

                this.appendDummyInput('END_TIME')
                    .appendField(new Blockly.FieldTextInput('18:00'), 'END_TIME');
            }
        } else if (inputExists) {
            this.removeInput('END_TIME');
            this.removeInput('AND');
        }
    }
};

Blockly.JavaScript['time_compare'] = function(block) {
    var option     = block.getFieldValue('OPTION');
    var start_time = block.getFieldValue('START_TIME');
    var end_time   = block.getFieldValue('END_TIME');
    if (!end_time) end_time = null;

    return ['compareTime("' + start_time + '", "' + end_time + '", "' + option + '")', Blockly.JavaScript.ORDER_ATOMIC];
};

// --- get time --------------------------------------------------
Blockly.Words['time_get_yyyy.mm.dd']  .format = 'YYYY.MM.DD';
Blockly.Words['time_get_yyyy/mm/dd']  .format = 'YYYY/MM/DD';
Blockly.Words['time_get_yy.mm.dd']    .format = 'YY.MM.DD';
Blockly.Words['time_get_yy/mm/dd']    .format = 'YY/MM/DD';
Blockly.Words['time_get_dd.mm.yyyy']  .format = 'DD.MM.YYYY';
Blockly.Words['time_get_dd/mm/yyyy']  .format = 'DD/MM/YYYY';
Blockly.Words['time_get_dd.mm.yy']    .format = 'DD.MM.YY';
Blockly.Words['time_get_dd/mm/yy']    .format = 'DD/MM/YY';
Blockly.Words['time_get_mm/dd/yyyy']  .format = 'MM/DD/YYYY';
Blockly.Words['time_get_mm/dd/yy']    .format = 'MM/DD/YY';
Blockly.Words['time_get_dd.mm']       .format = 'DD.MM.';
Blockly.Words['time_get_dd/mm']       .format = 'DD/MM';
Blockly.Words['time_get_mm.dd']       .format = 'MM.DD';
Blockly.Words['time_get_mm/dd']       .format = 'MM/DD';
Blockly.Words['time_get_hh_mm']       .format = 'hh:mm';
Blockly.Words['time_get_hh_mm_ss']    .format = 'hh:mm:ss';
Blockly.Words['time_get_hh_mm_ss.sss'].format = 'hh:mm:ss.sss';

Blockly.Time.blocks['time_get'] =
    '<block type="time_get">'
    + '     <value name="OPTION">'
    + '     </value>'
    + '     <mutation format="false" language="false"></mutation>'
    + '     <value name="FORMAT">'
    + '     </value>'
    + '     <value name="LANGUAGE">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['time_get'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(Blockly.Translate('time_get'));

        this.appendDummyInput('OPTION')
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
                this.sourceBlock_.updateShape_(option === 'custom', option === 'wdt' || option === 'wdts' || option === 'Mt' || option === 'Mts');
            }), 'OPTION');

        this.setInputsInline(true);

        this.setOutput(true);

        this.setColour(Blockly.Time.HUE);
        this.setTooltip(Blockly.Translate('time_get_tooltip'));
        this.setHelpUrl(Blockly.Translate('time_get_help'));
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

Blockly.JavaScript['time_get'] = function(block) {
    var option = block.getFieldValue('OPTION');
    var format = block.getFieldValue('FORMAT');
    var lang   = block.getFieldValue('LANGUAGE');

    var code;
    if (option === 'object') {
        code = '(new Date().getTime())';
    } else if (option === 'ms') {
        code = '(new Date().getMilliseconds())';
    } else if (option === 's') {
        code = '(new Date().getSeconds())';
    } else if (option === 'sid') {
        code = '(new Date().getHours() * 3600 + new Date().getMinutes() * 60 + new Date().getSeconds())';
    } else if (option === 'm') {
        code = '(new Date().getMinutes())';
    } else if (option === 'mid') {
        code = '(function () {var v = new Date(); return v.getHours() * 60 + v.getMinutes();})()';
    } else if (option === 'h') {
        code = '(new Date().getHours())';
    } else if (option === 'd') {
        code = '(new Date().getDate())';
    } else if (option === 'M') {
        code = '(new Date().getMonth() + 1)';
    } else if (option === 'Mt') {
        code = 'formatDate(new Date(), "OO", "' + lang + '")';
    } else if (option === 'Mts') {
        code = 'formatDate(new Date(), "O", "' + lang + '")';
    } else if (option === 'y') {
        code = '(new Date().getYear())';
    } else if (option === 'fy') {
        code = '(new Date().getFullYear())';
    } else if (option === 'wdt') {
        code = 'formatDate(new Date(), "WW", "' + lang + '")';
    } else if (option === 'wdts') {
        code = 'formatDate(new Date(), "W", "' + lang + '")';
    } else if (option === 'wd') {
        code = '(new Date().getDay() === 0 ? 7 : new Date().getDay())';
    } else if (option === 'custom') {
        code = 'formatDate(new Date(), "' + format + '")';
    } else {
        code = 'formatDate(new Date(), "' + option + '")';
    }

    return [code, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- get astro time --------------------------------------------------
Blockly.Time.blocks['time_astro'] =
    '<block type="time_astro">'
    + '     <value name="TYPE">'
    + '     </value>'
    + '     <value name="OFFSET">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['time_astro'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(Blockly.Translate('time_astro'));

        this.appendDummyInput('TYPE')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('astro_sunriseText'),         'sunrise'],
                [Blockly.Translate('astro_sunriseEndText'),      'sunriseEnd'],
                [Blockly.Translate('astro_goldenHourEndText'),   'goldenHourEnd'],
                [Blockly.Translate('astro_solarNoonText'),       'solarNoon'],
                [Blockly.Translate('astro_goldenHourText'),      'goldenHour'],
                [Blockly.Translate('astro_sunsetStartText'),     'sunsetStart'],
                [Blockly.Translate('astro_sunsetText'),          'sunset'],
                [Blockly.Translate('astro_duskText'),            'dusk'],
                [Blockly.Translate('astro_nauticalDuskText'),    'nauticalDusk'],
                [Blockly.Translate('astro_nightText'),           'night'],
                [Blockly.Translate('astro_nightEndText'),        'nightEnd'],
                [Blockly.Translate('astro_nauticalDawnText'),    'nauticalDawn'],
                [Blockly.Translate('astro_dawnText'),            'dawn'],
                [Blockly.Translate('astro_nadirText'),           'nadir']
            ]), 'TYPE');

        this.appendDummyInput('OFFSET')
            .appendField(Blockly.Translate('time_astro_offset'))
            .appendField(new Blockly.FieldTextInput('0'), 'OFFSET');

        this.setInputsInline(true);

        this.setOutput(true);

        this.setColour(Blockly.Time.HUE);
        this.setTooltip(Blockly.Translate('time_astro_tooltip'));
        this.setHelpUrl(Blockly.Translate('time_astro_help'));
    }
};

Blockly.JavaScript['time_astro'] = function(block) {
    var type    = block.getFieldValue('TYPE');
    var offset  = parseFloat(block.getFieldValue('OFFSET'));
    return ['getAstroDate("' + type + '", undefined, ' + offset + ')', Blockly.JavaScript.ORDER_ATOMIC];
};