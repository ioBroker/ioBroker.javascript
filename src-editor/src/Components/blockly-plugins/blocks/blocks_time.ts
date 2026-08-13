/**
 * Time blocks - converted from `public/google-blockly/own/blocks_time.js`.
 *
 * See `blocks_number.ts` for the conversion pattern.
 *
 * This file owns the `.format` patterns of the date entries in `Blockly.Words`. It writes them into
 * the shared table, which is why it has to run before `blocks_convert.ts` - both build their date
 * dropdown from them, through `dateFormatOptions()` in `helpers.ts`.
 */
import { Blocks, FieldCheckbox, FieldDropdown, FieldTextInput, type Block, type BlockSvg, type Field } from 'blockly/core';
import { javascriptGenerator, Order } from 'blockly/javascript';

import { dateFormatOptions, dateLanguageOptions, quote } from './helpers';

/** The date pattern each of these words stands for */
const DATE_FORMATS: Record<string, string> = {
    'time_get_yyyy.mm.dd': 'YYYY.MM.DD',
    'time_get_yyyy/mm/dd': 'YYYY/MM/DD',
    'time_get_yy.mm.dd': 'YY.MM.DD',
    'time_get_yy/mm/dd': 'YY/MM/DD',
    'time_get_dd.mm.yyyy': 'DD.MM.YYYY',
    'time_get_dd/mm/yyyy': 'DD/MM/YYYY',
    'time_get_dd.mm.yy': 'DD.MM.YY',
    'time_get_dd/mm/yy': 'DD/MM/YY',
    'time_get_mm/dd/yyyy': 'MM/DD/YYYY',
    'time_get_mm/dd/yy': 'MM/DD/YY',
    'time_get_dd.mm': 'DD.MM.',
    'time_get_dd/mm': 'DD/MM',
    'time_get_mm.dd': 'MM.DD',
    'time_get_mm/dd': 'MM/DD',
    time_get_hh_mm: 'hh:mm',
    time_get_hh_mm_ss: 'hh:mm:ss',
    'time_get_hh_mm_ss.sss': 'hh:mm:ss.sss',
};

/** The comparison blocks add and remove inputs depending on the selected option */
type ShapedBlock = Block & {
    updateShape_: (isBetween?: boolean, useActualTime?: boolean | string) => void;
};

/** `true` for every spelling of true the mutation attributes and checkboxes use */
function isTrue(value: unknown): boolean {
    return value === true || value === 'true' || value === 'TRUE';
}

export function install(): void {
    const Blockly = window.Blockly;
    const translate = Blockly.Translate;
    const getHelp = window.getHelp;

    Blockly.CustomBlocks = Blockly.CustomBlocks || [];
    Blockly.CustomBlocks.push('Time');

    Blockly.Time = {
        HUE: 270,
        blocks: {},
    };

    // The date patterns belong to the words defined in `blocks_words`
    for (const [word, pattern] of Object.entries(DATE_FORMATS)) {
        Blockly.Words[word].format = pattern;
    }

    const timeCompareOptions = (): [string, string][] => [
        [translate('time_compare_lt'), '<'],
        [translate('time_compare_le'), '<='],
        [translate('time_compare_gt'), '>'],
        [translate('time_compare_ge'), '>='],
        [translate('time_compare_eq'), '=='],
        [translate('time_compare_bw'), 'between'],
        [translate('time_compare_nb'), 'not between'],
    ];

    // if time greater, less, between
    // --- time compare ex --------------------------------------------------
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

    Blocks['time_compare_ex'] = {
        init: function (this: Block): void {
            this.appendDummyInput('TIME_TEXT').appendField(translate('time_compare_ex'));

            this.appendDummyInput('USE_ACTUAL_TIME').appendField(
                new FieldCheckbox('TRUE', function (this: Field, option: string | boolean): undefined {
                    (this.getSourceBlock() as ShapedBlock).updateShape_(undefined, option);
                }),
                'USE_ACTUAL_TIME',
            );

            this.appendDummyInput().appendField(translate('time_compare_is_ex'));

            this.appendDummyInput('OPTION').appendField(
                new FieldDropdown(timeCompareOptions(), function (this: Field, option: string): undefined {
                    (this.getSourceBlock() as ShapedBlock).updateShape_(option === 'between' || option === 'not between');
                }),
                'OPTION',
            );

            this.appendDummyInput().appendField(' ');

            this.appendValueInput('START_TIME');

            this.setInputsInline(true);
            this.setOutput(true, 'Boolean');

            this.setColour(Blockly.Time.HUE);

            this.setTooltip(translate('time_compare_ex_tooltip'));
            this.setHelpUrl(getHelp('time_compare_ex_help'));
        },

        mutationToDom: function (this: Block): Element {
            const container = document.createElement('mutation');
            const option = this.getFieldValue('OPTION');
            const useActualTime = this.getFieldValue('USE_ACTUAL_TIME');
            container.setAttribute('end_time', option === 'between' || option === 'not between' ? 'true' : 'false');
            container.setAttribute('actual_time', isTrue(useActualTime) ? 'true' : 'false');
            return container;
        },

        domToMutation: function (this: ShapedBlock, xmlElement: Element): void {
            this.updateShape_(isTrue(xmlElement.getAttribute('end_time')), isTrue(xmlElement.getAttribute('actual_time')));
        },

        updateShape_: function (this: Block, isBetween?: boolean, useActualTime?: boolean | string): void {
            if (isBetween === undefined) {
                isBetween =
                    this.getFieldValue('OPTION') === 'between' || this.getFieldValue('OPTION') === 'not between';
            }

            // Add or remove a delay Input.
            if (isBetween) {
                if (!this.getInput('END_TIME')) {
                    if (this.getInput('CUSTOM_TIME')) {
                        this.removeInput('CUSTOM_TIME');
                        this.removeInput('CUSTOM_TEXT');
                    }

                    this.appendDummyInput('AND').appendField(translate('time_compare_and'));

                    this.appendValueInput('END_TIME');

                    if (!window.scripts.loading) {
                        const wp = this.workspace;

                        setTimeout(() => {
                            const existingInput = this.getInput('END_TIME');
                            if (!existingInput?.connection?.isConnected()) {
                                const shadow = wp.newBlock('text') as BlockSvg;
                                shadow.setShadow(true);
                                shadow.setFieldValue('18:00', 'TEXT');

                                shadow.outputConnection!.connect(existingInput!.connection!);

                                shadow.initSvg();
                                shadow.render();
                            }
                        }, 100);
                    }
                }
            } else if (this.getInput('END_TIME')) {
                this.removeInput('END_TIME');
                this.removeInput('AND');
            }

            if (useActualTime === undefined) {
                useActualTime = this.getFieldValue('USE_ACTUAL_TIME');
            }

            const showActualTime = isTrue(useActualTime);
            const customExists = this.getInput('CUSTOM_TIME');

            if (!showActualTime) {
                (this.getInput('TIME_TEXT')!.fieldRow[0] as FieldTextInput).setValue(
                    translate('time_compare_custom_ex'),
                );

                if (!customExists) {
                    this.appendDummyInput('CUSTOM_TEXT').appendField(translate('time_compare_ex_custom'));

                    this.appendValueInput('CUSTOM_TIME');
                }
            } else if (customExists) {
                (this.getInput('TIME_TEXT')!.fieldRow[0] as FieldTextInput).setValue(translate('time_compare_ex'));
                this.removeInput('CUSTOM_TIME');
                this.removeInput('CUSTOM_TEXT');
            }
        },
    };

    javascriptGenerator.forBlock['time_compare_ex'] = function (block: Block): [string, Order] {
        const fOption = block.getFieldValue('OPTION');
        const vStartTime = javascriptGenerator.valueToCode(block, 'START_TIME', Order.ATOMIC);
        // Both inputs only exist in certain mutation states, and `valueToCode` throws for a missing
        // one - the original wrapped these two calls in a try/catch for exactly that reason.
        const vEndTime = block.getInput('END_TIME')
            ? javascriptGenerator.valueToCode(block, 'END_TIME', Order.ATOMIC) || null
            : null;
        const vCustomTime = block.getInput('CUSTOM_TIME')
            ? javascriptGenerator.valueToCode(block, 'CUSTOM_TIME', Order.ATOMIC) || null
            : null;

        return [`compareTime(${vStartTime}, ${vEndTime}, '${fOption}', ${vCustomTime})`, Order.ATOMIC];
    };

    // --- time compare --------------------------------------------------
    Blockly.Time.blocks['time_compare'] =
        '<block type="time_compare">' +
        '  <mutation end_time="false"></mutation>' +
        '  <field name="OPTION">&lt;</field>' +
        '  <field name="START_TIME">12:00</field>' +
        '</block>';

    Blocks['time_compare'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField(translate('time_compare'));

            this.appendDummyInput('OPTION').appendField(
                new FieldDropdown(timeCompareOptions(), function (this: Field, option: string): undefined {
                    (this.getSourceBlock() as ShapedBlock).updateShape_(option === 'between' || option === 'not between');
                }),
                'OPTION',
            );

            this.appendDummyInput().appendField(' ');

            this.appendDummyInput('START_TIME').appendField(new FieldTextInput('12:00'), 'START_TIME');

            this.setInputsInline(true);
            this.setOutput(true, 'Boolean');

            this.setColour(Blockly.Time.HUE);

            this.setTooltip(translate('time_compare_tooltip'));
            this.setHelpUrl(getHelp('time_compare_help'));
        },

        mutationToDom: function (this: Block): Element {
            const container = document.createElement('mutation');
            const option = this.getFieldValue('OPTION');
            container.setAttribute('end_time', option === 'between' || option === 'not between' ? 'true' : 'false');
            return container;
        },

        domToMutation: function (this: ShapedBlock, xmlElement: Element): void {
            this.updateShape_(isTrue(xmlElement.getAttribute('end_time')));
        },

        updateShape_: function (this: Block, isBetween?: boolean): void {
            // Add or remove a delay Input.
            if (isBetween) {
                if (!this.getInput('END_TIME')) {
                    this.appendDummyInput('AND').appendField(translate('time_compare_and'));

                    this.appendDummyInput('END_TIME').appendField(new FieldTextInput('18:00'), 'END_TIME');
                }
            } else if (this.getInput('END_TIME')) {
                this.removeInput('END_TIME');
                this.removeInput('AND');
            }
        },
    };

    javascriptGenerator.forBlock['time_compare'] = function (block: Block): [string, Order] {
        const fOption = block.getFieldValue('OPTION');
        const fStartTime = block.getFieldValue('START_TIME');
        const fEndTime = block.getFieldValue('END_TIME');

        return [
            `compareTime(${quote(fStartTime)}, ${fEndTime ? quote(fEndTime) : 'null'}, ${quote(fOption)})`,
            Order.ATOMIC,
        ];
    };

    // --- get time --------------------------------------------------
    Blockly.Time.blocks['time_get'] =
        '<block type="time_get">' +
        '  <mutation format="false" language="false"></mutation>' +
        '  <field name="OPTION">object</field>' +
        '</block>';

    Blocks['time_get'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField(translate('time_get'));

            this.appendDummyInput('OPTION').appendField(
                new FieldDropdown(dateFormatOptions(), function (this: Field, option: string): undefined {
                    (this.getSourceBlock() as ShapedBlock).updateShape_(
                        option === 'custom',
                        option === 'wdt' || option === 'wdts' || option === 'Mt' || option === 'Mts',
                    );
                }),
                'OPTION',
            );

            this.setInputsInline(true);
            this.setOutput(true);

            this.setColour(Blockly.Time.HUE);

            this.setTooltip(translate('time_get_tooltip'));
        },

        mutationToDom: function (this: Block): Element {
            const container = document.createElement('mutation');
            const option = this.getFieldValue('OPTION');
            container.setAttribute('format', option === 'custom' ? 'true' : 'false');
            container.setAttribute(
                'language',
                option === 'wdt' || option === 'wdts' || option === 'Mt' || option === 'Mts' ? 'true' : 'false',
            );
            return container;
        },

        domToMutation: function (this: ShapedBlock, xmlElement: Element): void {
            this.updateShape_(isTrue(xmlElement.getAttribute('format')), isTrue(xmlElement.getAttribute('language')));
        },

        updateShape_: function (this: Block, isFormat?: boolean, isLanguage?: boolean | string): void {
            // Add or remove a delay Input.
            if (isFormat) {
                if (!this.getInput('FORMAT')) {
                    this.appendDummyInput('FORMAT')
                        .appendField(' ')
                        .appendField(new FieldTextInput(translate('time_get_default_format')), 'FORMAT');
                }
            } else if (this.getInput('FORMAT')) {
                this.removeInput('FORMAT');
            }

            if (isLanguage) {
                if (!this.getInput('LANGUAGE')) {
                    this.appendDummyInput('LANGUAGE').appendField(new FieldDropdown(dateLanguageOptions()), 'LANGUAGE');
                }
            } else if (this.getInput('LANGUAGE')) {
                this.removeInput('LANGUAGE');
            }
        },
    };

    javascriptGenerator.forBlock['time_get'] = function (block: Block): [string, Order] {
        const fOption = block.getFieldValue('OPTION');
        const fFormat = block.getFieldValue('FORMAT');
        const fLanguage = block.getFieldValue('LANGUAGE');

        let code;
        if (fOption === 'object') {
            code = '(new Date().getTime())';
        } else if (fOption === 'ms') {
            code = '(new Date().getMilliseconds())';
        } else if (fOption === 's') {
            code = '(new Date().getSeconds())';
        } else if (fOption === 'sid') {
            code = '(() => { const v = new Date(); return v.getHours() * 3600 + v.getMinutes() * 60 + v.getSeconds(); })()';
        } else if (fOption === 'm') {
            code = '(new Date().getMinutes())';
        } else if (fOption === 'mid') {
            code = '(() => { const v = new Date(); return v.getHours() * 60 + v.getMinutes(); })()';
        } else if (fOption === 'h') {
            code = '(new Date().getHours())';
        } else if (fOption === 'd') {
            code = '(new Date().getDate())';
        } else if (fOption === 'M') {
            code = '(new Date().getMonth() + 1)';
        } else if (fOption === 'Mt') {
            code = `formatDate(new Date(), 'OO', '${fLanguage}')`;
        } else if (fOption === 'Mts') {
            code = `formatDate(new Date(), 'O', '${fLanguage}')`;
        } else if (fOption === 'y') {
            code = '(new Date().getYear())';
        } else if (fOption === 'fy') {
            code = '(new Date().getFullYear())';
        } else if (fOption === 'wdt') {
            code = `formatDate(new Date(), 'WW', '${fLanguage}')`;
        } else if (fOption === 'wdts') {
            code = `formatDate(new Date(), 'W', '${fLanguage}')`;
        } else if (fOption === 'wd') {
            code = '(() => { const d = new Date().getDay(); return d === 0 ? 7 : d; })()';
        } else if (fOption === 'cw') {
            code =
                '((date) => { const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())); const dayNum = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - dayNum); const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7); })(new Date())';
        } else if (fOption === 'custom') {
            code = `formatDate(new Date(), ${quote(fFormat)})`;
        } else {
            code = `formatDate(new Date(), ${quote(fOption)})`;
        }

        return [code, Order.ATOMIC];
    };

    // --- get time special --------------------------------------------------
    Blockly.Time.blocks['time_get_special'] =
        '<block type="time_get_special">' + '  <field name="TYPE">dayStart</field>' + '</block>';

    Blocks['time_get_special'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField(translate('time_get_special'));

            this.appendDummyInput('TYPE').appendField(
                new FieldDropdown([
                    [translate('time_get_special_day_start'), 'dayStart'],
                    [translate('time_get_special_day_end'), 'dayEnd'],
                    [translate('time_get_special_week_start'), 'weekStart'],
                    [translate('time_get_special_week_end'), 'weekEnd'],
                    [translate('time_get_special_month_start'), 'monthStart'],
                    [translate('time_get_special_month_end'), 'monthEnd'],
                ]),
                'TYPE',
            );

            this.setInputsInline(true);
            this.setOutput(true, 'Number');

            this.setColour(Blockly.Time.HUE);

            this.setTooltip(translate('time_get_special_tooltip'));
        },
    };

    javascriptGenerator.forBlock['time_get_special'] = function (block: Block): [string, Order] {
        const fType = block.getFieldValue('TYPE');

        let code = '';
        if (fType === 'dayStart') {
            code = '/* start of day */ (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })()';
        } else if (fType === 'dayEnd') {
            code = '/* end of day */ (() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); })()';
        } else if (fType === 'weekStart') {
            code =
                '/* start of week */ (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay() + (d.getDay() == 0 ? -6 : 1)).getTime(); })()';
        } else if (fType === 'weekEnd') {
            code =
                '/* end of week */ (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (8 - d.getDay())).getTime() - 1; })()';
        } else if (fType === 'monthStart') {
            code =
                '/* start of month */ (() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(1); return d.getTime(); })()';
        } else if (fType === 'monthEnd') {
            code =
                '/* end of month */ (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() - 1; })()';
        }

        return [code, Order.ATOMIC];
    };

    // --- get astro time --------------------------------------------------
    Blockly.Time.blocks['time_astro'] =
        '<block type="time_astro">' +
        '  <field name="TYPE">sunrise</field>' +
        '  <field name="OFFSET">0</field>' +
        '</block>';

    Blocks['time_astro'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField(translate('time_astro'));

            this.appendDummyInput('TYPE').appendField(
                new FieldDropdown([
                    [translate('astro_sunriseText'), 'sunrise'],
                    [translate('astro_sunriseEndText'), 'sunriseEnd'],
                    [translate('astro_goldenHourEndText'), 'goldenHourEnd'],
                    [translate('astro_solarNoonText'), 'solarNoon'],
                    [translate('astro_goldenHourText'), 'goldenHour'],
                    [translate('astro_sunsetStartText'), 'sunsetStart'],
                    [translate('astro_sunsetText'), 'sunset'],
                    [translate('astro_duskText'), 'dusk'],
                    [translate('astro_nauticalDuskText'), 'nauticalDusk'],
                    [translate('astro_nightText'), 'night'],
                    [translate('astro_nightEndText'), 'nightEnd'],
                    [translate('astro_nauticalDawnText'), 'nauticalDawn'],
                    [translate('astro_dawnText'), 'dawn'],
                    [translate('astro_nadirText'), 'nadir'],
                ]),
                'TYPE',
            );

            this.appendDummyInput('OFFSET')
                .appendField(translate('time_astro_offset'))
                .appendField(new FieldTextInput('0'), 'OFFSET');

            this.setInputsInline(true);
            this.setOutput(true);

            this.setColour(Blockly.Time.HUE);

            this.setTooltip(translate('time_astro_tooltip'));
            this.setHelpUrl(getHelp('time_astro_help'));
        },
    };

    javascriptGenerator.forBlock['time_astro'] = function (block: Block): [string, Order] {
        const fType = block.getFieldValue('TYPE');
        const fOffset = parseFloat(block.getFieldValue('OFFSET'));

        return [`getAstroDate('${fType}', undefined, ${fOffset})`, Order.ATOMIC];
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

    Blocks['time_calculation'] = {
        init: function (this: Block): void {
            this.appendDummyInput('NAME').appendField(translate('time_calculation'));

            this.appendValueInput('DATE_TIME').appendField(translate('time_calculation_on')).setCheck(null);

            this.appendDummyInput('OPERATION').appendField(
                new FieldDropdown([
                    ['+', '+'],
                    ['-', '-'],
                ]),
                'OPERATION',
            );

            this.appendValueInput('VALUE');

            this.appendDummyInput('UNIT').appendField(
                new FieldDropdown([
                    [translate('time_calculation_ms'), 'ms'],
                    [translate('time_calculation_sec'), 'sec'],
                    [translate('time_calculation_min'), 'min'],
                    [translate('time_calculation_hour'), 'hour'],
                    [translate('time_calculation_day'), 'day'],
                    [translate('time_calculation_week'), 'week'],
                ]),
                'UNIT',
            );

            this.setInputsInline(true);
            this.setOutput(true, 'Number');

            this.setColour(Blockly.Time.HUE);

            this.setTooltip(translate('time_calculation_tooltip'));
        },
    };

    javascriptGenerator.forBlock['time_calculation'] = function (block: Block): [string, Order] {
        const vDateTime = javascriptGenerator.valueToCode(block, 'DATE_TIME', Order.ATOMIC);
        const fOperation = block.getFieldValue('OPERATION');
        const vValue = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC);
        const fUnit = block.getFieldValue('UNIT');

        let step = 1;
        if (fUnit === 'sec') {
            step = 1000;
        } else if (fUnit === 'min') {
            step = 60 * 1000;
        } else if (fUnit === 'hour') {
            step = 60 * 60 * 1000;
        } else if (fUnit === 'day') {
            step = 24 * 60 * 60 * 1000;
        } else if (fUnit === 'week') {
            step = 7 * 24 * 60 * 60 * 1000;
        }

        return [
            `/* time calculation */ ((dateTime) => { const ts = (typeof dateTime === 'object' ? dateTime.getTime() : dateTime); return ts ${fOperation} ((${vValue}) * ${step}); })(${vDateTime})`,
            Order.ATOMIC,
        ];
    };
}
