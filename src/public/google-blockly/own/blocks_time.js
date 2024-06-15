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
    '<block type="time_compare_ex">' +
    '  <mutation end_time="false" actual_time="true"></mutation>' +
    '  <field name="USE_ACTUAL_TIME">TRUE</field>' +
    '  <field name="OPTION">&lt;</field>' +
    '  <value name="START_TIME">' +
    '    <shadow type="text">' +
    '      <field name="TEXT">12:00</field>' +
    '    </shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['time_compare_ex'] = {
    init: function () {
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
                [Blockly.Translate('time_compare_nb'), 'not between'],
            ], function (option) {
                this.sourceBlock_.updateShape_((option === 'between' || option === 'not between'));
            }), 'OPTION');

        this.appendDummyInput()
            .appendField(' ');

        this.appendValueInput('START_TIME');

        this.setInputsInline(true);
        this.setOutput(true, 'Boolean');

        this.setColour(Blockly.Time.HUE);

        this.setTooltip(Blockly.Translate('time_compare_ex_tooltip'));
        this.setHelpUrl(getHelp('time_compare_ex_help'));
    },
    mutationToDom: function () {
        const container = document.createElement('mutation');
        const option = this.getFieldValue('OPTION');
        const use_actual_time = this.getFieldValue('USE_ACTUAL_TIME');
        container.setAttribute('end_time', option === 'between' || option === 'not between' ? 'true' : 'false');
        container.setAttribute('actual_time', use_actual_time === 'TRUE' || use_actual_time === 'true' || use_actual_time === true ? 'true' : 'false');
        return container;
    },
    domToMutation: function (xmlElement) {
        const end_time = xmlElement.getAttribute('end_time');
        const actual_time = xmlElement.getAttribute('actual_time');
        this.updateShape_(end_time === true || end_time === 'true' || end_time === 'TRUE', actual_time === true || actual_time === 'true' || actual_time === 'TRUE');
    },
    updateShape_: function (isBetween, useActualTime) {
        if (isBetween === undefined) {
            isBetween = this.getFieldValue('OPTION') === 'between' || this.getFieldValue('OPTION') === 'not between';
        }
        // Add or remove a delay Input.
        let inputExists = this.getInput('END_TIME');

        if (isBetween) {
            if (!inputExists) {
                inputExists = this.getInput('CUSTOM_TIME');

                if (inputExists) {
                    this.removeInput('CUSTOM_TIME');
                    this.removeInput('CUSTOM_TEXT');
                }

                this.appendDummyInput('AND')
                    .appendField(Blockly.Translate('time_compare_and'));

                this.appendValueInput('END_TIME');

                if (!window.scripts.loading) {
                    const wp = this.workspace;

                    setTimeout(() => {
                        const existingInput = this.getInput('END_TIME');
                        if (!existingInput.connection.isConnected()) {
                            const shadow = wp.newBlock('text');
                            shadow.setShadow(true);
                            shadow.setFieldValue('18:00', 'TEXT');

                            shadow.outputConnection.connect(existingInput.connection);
                            // existingInput.connection.connect(shadow.outputConnection);

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
        }

        useActualTime = useActualTime === 'true' || useActualTime === 'TRUE' || useActualTime === true;
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
    },
};

Blockly.JavaScript.forBlock['time_compare_ex'] = function (block) {
    const option = block.getFieldValue('OPTION');
    const startTime = Blockly.JavaScript.valueToCode(block, 'START_TIME', Blockly.JavaScript.ORDER_ATOMIC);
    let endTime = Blockly.JavaScript.valueToCode(block, 'END_TIME', Blockly.JavaScript.ORDER_ATOMIC);
    endTime = endTime || null;

    let time = Blockly.JavaScript.valueToCode(block, 'CUSTOM_TIME', Blockly.JavaScript.ORDER_ATOMIC);
    time = time || null;

    return [`compareTime(${startTime}, ${endTime}, '${option}', ${time})`, Blockly.JavaScript.ORDER_ATOMIC];
};

// if time greater, less, between
// --- time compare --------------------------------------------------
Blockly.Time.blocks['time_compare'] =
    '<block type="time_compare">' +
    '  <mutation end_time="false"></mutation>' +
    '  <field name="OPTION">&lt;</field>' +
    '  <field name="START_TIME">12:00</field>' +
    '</block>';

Blockly.Blocks['time_compare'] = {
    init: function () {
        this.appendDummyInput()
            .appendField(Blockly.Translate('time_compare'));

        this.appendDummyInput('OPTION')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('time_compare_lt'), '<'],
                [Blockly.Translate('time_compare_le'), '<='],
                [Blockly.Translate('time_compare_gt'), '>'],
                [Blockly.Translate('time_compare_ge'), '>='],
                [Blockly.Translate('time_compare_eq'), '=='],
                [Blockly.Translate('time_compare_bw'), 'between'],
                [Blockly.Translate('time_compare_nb'), 'not between'],
            ], function (option) {
                this.sourceBlock_.updateShape_((option === 'between' || option === 'not between'));
            }), 'OPTION');

        this.appendDummyInput()
            .appendField(' ');

        this.appendDummyInput('START_TIME')
            .appendField(new Blockly.FieldTextInput('12:00'), 'START_TIME');

        this.setInputsInline(true);
        this.setOutput(true, 'Boolean');

        this.setColour(Blockly.Time.HUE);

        this.setTooltip(Blockly.Translate('time_compare_tooltip'));
        this.setHelpUrl(getHelp('time_compare_help'));
    },

    mutationToDom: function () {
        const container = document.createElement('mutation');
        const option = this.getFieldValue('OPTION');
        container.setAttribute('end_time', (option === 'between' || option === 'not between') ? 'true' : 'false');
        return container;
    },
    domToMutation: function (xmlElement) {
        const option = xmlElement.getAttribute('end_time');
        this.updateShape_(option === true || option === 'true' || option === 'TRUE');
    },
    updateShape_: function (isBetween) {
        // Add or remove a delay Input.
        const inputExists = this.getInput('END_TIME');

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
    },
};

Blockly.JavaScript.forBlock['time_compare'] = function (block) {
    const option = block.getFieldValue('OPTION');
    const startTime = block.getFieldValue('START_TIME');
    const endTime = block.getFieldValue('END_TIME');

    return [`compareTime(${Blockly.JavaScript.quote_(startTime)}, ${endTime ? Blockly.JavaScript.quote_(endTime) : 'null'}, ${Blockly.JavaScript.quote_(option)})`, Blockly.JavaScript.ORDER_ATOMIC];
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
    '<block type="time_get">' +
    '  <mutation format="false" language="false"></mutation>' +
    '  <field name="OPTION">object</field>' +
    '</block>';

Blockly.Blocks['time_get'] = {
    init: function () {
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
                this.sourceBlock_.updateShape_(option === 'custom', option === 'wdt' || option === 'wdts' || option === 'Mt' || option === 'Mts');
            }), 'OPTION');

        this.setInputsInline(true);
        this.setOutput(true);

        this.setColour(Blockly.Time.HUE);

        this.setTooltip(Blockly.Translate('time_get_tooltip'));
        //this.setHelpUrl(getHelp('time_get_help'));
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

Blockly.JavaScript.forBlock['time_get'] = function (block) {
    const option = block.getFieldValue('OPTION');
    const format = block.getFieldValue('FORMAT');
    const lang   = block.getFieldValue('LANGUAGE');

    let code;
    if (option === 'object') {
        code = '(new Date().getTime())';
    } else if (option === 'ms') {
        code = '(new Date().getMilliseconds())';
    } else if (option === 's') {
        code = '(new Date().getSeconds())';
    } else if (option === 'sid') {
        code = '(() => { const v = new Date(); return v.getHours() * 3600 + v.getMinutes() * 60 + v.getSeconds(); })()';
    } else if (option === 'm') {
        code = '(new Date().getMinutes())';
    } else if (option === 'mid') {
        code = '(() => { const v = new Date(); return v.getHours() * 60 + v.getMinutes(); })()';
    } else if (option === 'h') {
        code = '(new Date().getHours())';
    } else if (option === 'd') {
        code = '(new Date().getDate())';
    } else if (option === 'M') {
        code = '(new Date().getMonth() + 1)';
    } else if (option === 'Mt') {
        code = `formatDate(new Date(), 'OO', '${lang}')`;
    } else if (option === 'Mts') {
        code = `formatDate(new Date(), 'O', '${lang}')`;
    } else if (option === 'y') {
        code = '(new Date().getYear())';
    } else if (option === 'fy') {
        code = '(new Date().getFullYear())';
    } else if (option === 'wdt') {
        code = `formatDate(new Date(), 'WW', '${lang}')`;
    } else if (option === 'wdts') {
        code = `formatDate(new Date(), 'W', '${lang}')`;
    } else if (option === 'wd') {
        code = '(() => { const d = new Date().getDay(); return d === 0 ? 7 : d; })()';
    } else if (option === 'cw') {
        code = '((date) => { const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())); const dayNum = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - dayNum); const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7); })(new Date())';
    } else if (option === 'custom') {
        code = `formatDate(new Date(), ${Blockly.JavaScript.quote_(format)})`;
    } else {
        code = `formatDate(new Date(), ${Blockly.JavaScript.quote_(option)})`;
    }

    return [code, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- get time special --------------------------------------------------
Blockly.Time.blocks['time_get_special'] =
    '<block type="time_get_special">' +
    '  <field name="TYPE">dayStart</field>' +
    '</block>';

Blockly.Blocks['time_get_special'] = {
    init: function () {
        this.appendDummyInput()
            .appendField(Blockly.Translate('time_get_special'));

        this.appendDummyInput('TYPE')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('time_get_special_day_start'), 'dayStart'],
                [Blockly.Translate('time_get_special_day_end'), 'dayEnd'],
                [Blockly.Translate('time_get_special_week_start'), 'weekStart'],
                [Blockly.Translate('time_get_special_week_end'), 'weekEnd'],
                [Blockly.Translate('time_get_special_month_start'), 'monthStart'],
                [Blockly.Translate('time_get_special_month_end'), 'monthEnd'],
            ]), 'TYPE');

        this.setInputsInline(true);
        this.setOutput(true, 'Number');

        this.setColour(Blockly.Time.HUE);

        this.setTooltip(Blockly.Translate('time_get_special_tooltip'));
        //this.setHelpUrl(getHelp('time_get_special_help'));
    },
};

Blockly.JavaScript.forBlock['time_get_special'] = function (block) {
    const type = block.getFieldValue('TYPE');

    let code;
    if (type === 'dayStart') {
        code = '/* start of day */ (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })()';
    } else if (type === 'dayEnd') {
        code = '/* end of day */ (() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); })()';
    } else if (type === 'weekStart') {
        code = '/* start of week */ (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay() + (d.getDay() == 0 ? -6 : 1)).getTime(); })()';
    } else if (type === 'weekEnd') {
        code = '/* end of week */ (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (8 - d.getDay())).getTime() - 1; })()';
    } else if (type === 'monthStart') {
        code = '/* start of month */ (() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(1); return d.getTime(); })()';
    } else if (type === 'monthEnd') {
        code = '/* end of month */ (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() - 1; })()';
    }

    return [code, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- get astro time --------------------------------------------------
Blockly.Time.blocks['time_astro'] =
    '<block type="time_astro">' +
    '  <field name="TYPE">sunrise</field>' +
    '  <field name="OFFSET">0</field>' +
    '</block>';

Blockly.Blocks['time_astro'] = {
    init: function () {
        this.appendDummyInput()
            .appendField(Blockly.Translate('time_astro'));

        this.appendDummyInput('TYPE')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('astro_sunriseText'),       'sunrise'],
                [Blockly.Translate('astro_sunriseEndText'),    'sunriseEnd'],
                [Blockly.Translate('astro_goldenHourEndText'), 'goldenHourEnd'],
                [Blockly.Translate('astro_solarNoonText'),     'solarNoon'],
                [Blockly.Translate('astro_goldenHourText'),    'goldenHour'],
                [Blockly.Translate('astro_sunsetStartText'),   'sunsetStart'],
                [Blockly.Translate('astro_sunsetText'),        'sunset'],
                [Blockly.Translate('astro_duskText'),          'dusk'],
                [Blockly.Translate('astro_nauticalDuskText'),  'nauticalDusk'],
                [Blockly.Translate('astro_nightText'),         'night'],
                [Blockly.Translate('astro_nightEndText'),      'nightEnd'],
                [Blockly.Translate('astro_nauticalDawnText'),  'nauticalDawn'],
                [Blockly.Translate('astro_dawnText'),          'dawn'],
                [Blockly.Translate('astro_nadirText'),         'nadir'],
            ]), 'TYPE');

        this.appendDummyInput('OFFSET')
            .appendField(Blockly.Translate('time_astro_offset'))
            .appendField(new Blockly.FieldTextInput('0'), 'OFFSET');

        this.setInputsInline(true);
        this.setOutput(true);

        this.setColour(Blockly.Time.HUE);

        this.setTooltip(Blockly.Translate('time_astro_tooltip'));
        this.setHelpUrl(getHelp('time_astro_help'));
    },
};

Blockly.JavaScript.forBlock['time_astro'] = function (block) {
    const type    = block.getFieldValue('TYPE');
    const offset  = parseFloat(block.getFieldValue('OFFSET'));

    return [`getAstroDate('${type}', undefined, ${offset})`, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- time calculation --------------------------------------------------
Blockly.Time.blocks['time_calculation'] =
    '<block type="time_calculation">' +
    '  <field name="OPERATION">+</field>' +
    '  <field name="UNIT">ms</field>' +
    '  <value name="DATE_TIME">' +
    '    <shadow type="time_get">' +
    '      <mutation format="false" language="false"></mutation>' +
    '      <field name="OPTION">object</field>' +
    '    </shadow>' +
    '  </value>' +
    '  <value name="VALUE">' +
    '    <shadow type="math_number">' +
    '      <field name="NUM">1</field>' +
    '    </shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['time_calculation'] = {
    init: function () {
        this.appendDummyInput('NAME')
            .appendField(Blockly.Translate('time_calculation'));

        this.appendValueInput('DATE_TIME')
            .appendField(Blockly.Translate('time_calculation_on'))
            .setCheck(null);

        this.appendDummyInput('OPERATION')
            .appendField(new Blockly.FieldDropdown([
                ['+', '+'],
                ['-', '-'],
            ]), 'OPERATION');

        this.appendValueInput('VALUE');

        this.appendDummyInput('UNIT')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('time_calculation_ms'), 'ms'],
                [Blockly.Translate('time_calculation_sec'), 'sec'],
                [Blockly.Translate('time_calculation_min'), 'min'],
                [Blockly.Translate('time_calculation_hour'), 'hour'],
                [Blockly.Translate('time_calculation_day'), 'day'],
                [Blockly.Translate('time_calculation_week'), 'week'],
            ]), 'UNIT');

        this.setInputsInline(true);
        this.setOutput(true, 'Number');

        this.setColour(Blockly.Time.HUE);

        this.setTooltip(Blockly.Translate('time_calculation_tooltip'));
        //this.setHelpUrl(getHelp('time_calculation_help'));
    },
};

Blockly.JavaScript.forBlock['time_calculation'] = function (block) {
    const dateTime = Blockly.JavaScript.valueToCode(block, 'DATE_TIME', Blockly.JavaScript.ORDER_ATOMIC);
    const operation = block.getFieldValue('OPERATION');
    const value = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC);
    const unit = block.getFieldValue('UNIT');

    let step = 1;
    if (unit === 'sec') {
        step = 1000;
    } else if (unit === 'min') {
        step = 60 * 1000;
    } else if (unit === 'hour') {
        step = 60 * 60 * 1000;
    } else if (unit === 'day') {
        step = 24 * 60 * 60 * 1000;
    } else if (unit === 'week') {
        step = 7 * 24 * 60 * 60 * 1000;
    }

    return [`/* time calculation */ ((dateTime) => { const ts = (typeof dateTime === 'object' ? dateTime.getTime() : dateTime); return ts ${operation} ((${value}) * ${step}); })(${dateTime})`, Blockly.JavaScript.ORDER_ATOMIC];
};
