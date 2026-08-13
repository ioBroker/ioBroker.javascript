/**
 * Conversion blocks - converted from `public/google-blockly/own/blocks_convert.js`.
 *
 * See `blocks_number.ts` for the conversion pattern.
 *
 * Two lines of the original were dropped: `Blockly.Blocks.Convert = {}` and
 * `Blockly.JavaScript.Convert = {}`. The first registered a block type literally called "Convert"
 * with an empty definition - it has no generator, appears in no toolbox and nothing ever creates
 * it. Both look like leftovers from the category name and are the only reason a phantom "Convert"
 * block showed up in the snapshots.
 */
import { Blocks, FieldCheckbox, FieldDropdown, FieldTextInput, type Block, type Field } from 'blockly/core';
import { javascriptGenerator, Order } from 'blockly/javascript';

import { dateFormatOptions, dateLanguageOptions, quote } from './helpers';

/** The date blocks add and remove inputs depending on the selected option */
type ShapedBlock = Block & {
    updateShape_: (isFormat: boolean, isLanguage?: boolean) => void;
};

export function install(): void {
    const Blockly = window.Blockly;
    const translate = Blockly.Translate;

    Blockly.CustomBlocks = Blockly.CustomBlocks || [];
    Blockly.CustomBlocks.push('Convert');

    Blockly.Convert = {
        HUE: 280,
        blocks: {},
    };

    // --- to Number --------------------------------------------------
    Blockly.Convert.blocks['convert_tonumber'] = '<block type="convert_tonumber">' + '</block>';

    Blocks['convert_tonumber'] = {
        init: function (this: Block): void {
            this.appendValueInput('VALUE').appendField(translate('convert_tonumber'));

            this.setOutput(true, 'Number');

            this.setColour(Blockly.Convert.HUE);

            this.setTooltip(translate('convert_tonumber_tooltip'));
        },
    };

    javascriptGenerator.forBlock['convert_tonumber'] = function (block: Block): [string, Order] {
        return [`parseFloat(${javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC)})`, Order.ATOMIC];
    };

    // --- to Boolean --------------------------------------------------
    Blockly.Convert.blocks['convert_toboolean'] = '<block type="convert_toboolean">' + '</block>';

    Blocks['convert_toboolean'] = {
        init: function (this: Block): void {
            this.appendValueInput('VALUE').appendField(translate('convert_toboolean'));

            this.setOutput(true, 'Boolean');

            this.setColour(Blockly.Convert.HUE);

            this.setTooltip(translate('convert_toboolean_tooltip'));
        },
    };

    javascriptGenerator.forBlock['convert_toboolean'] = function (block: Block): [string, Order] {
        const vValue = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC);

        return [
            '(() => {\n' +
                `  const val = ${vValue};\n` +
                `  if (val === 'true' || val === 'TRUE') return true;\n` +
                `  if (val === 'false' || val === 'FALSE') return false;\n` +
                '  return !!val;\n' +
                '})()',
            Order.ATOMIC,
        ];
    };

    // --- to String --------------------------------------------------
    Blockly.Convert.blocks['convert_tostring'] = '<block type="convert_tostring">' + '</block>';

    Blocks['convert_tostring'] = {
        init: function (this: Block): void {
            this.appendValueInput('VALUE').appendField(translate('convert_tostring'));

            this.setOutput(true, 'String');

            this.setColour(Blockly.Convert.HUE);

            this.setTooltip(translate('convert_tostring_tooltip'));
        },
    };

    javascriptGenerator.forBlock['convert_tostring'] = function (block: Block): [string, Order] {
        const vValue = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC);

        return [`('' + ${vValue})`, Order.ATOMIC];
    };

    // --- get type --------------------------------------------------
    Blockly.Convert.blocks['convert_type'] = '<block type="convert_type">' + '</block>';

    Blocks['convert_type'] = {
        init: function (this: Block): void {
            this.appendValueInput('ITEM').appendField(translate('convert_type'));

            this.setOutput(true, 'String');

            this.setColour(Blockly.Convert.HUE);

            this.setTooltip(translate('convert_type_tooltip'));
        },
    };

    javascriptGenerator.forBlock['convert_type'] = function (block: Block): [string, Order] {
        const vItem = javascriptGenerator.valueToCode(block, 'ITEM', Order.ATOMIC);

        return [`typeof ${vItem}`, Order.ATOMIC];
    };

    // --- to Date --------------------------------------------------
    Blockly.Convert.blocks['convert_to_date'] = '<block type="convert_to_date">' + '</block>';

    Blocks['convert_to_date'] = {
        init: function (this: Block): void {
            this.appendValueInput('VALUE').appendField(translate('convert_to_date'));

            this.setOutput(true, 'Date');

            this.setColour(Blockly.Convert.HUE);

            this.setTooltip(translate('convert_to_date_tooltip'));
        },
    };

    javascriptGenerator.forBlock['convert_to_date'] = function (block: Block): [string, Order] {
        const vValue = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC);

        return [`getDateObject(${vValue}).getTime()`, Order.ATOMIC];
    };

    // --- from Date --------------------------------------------------
    Blockly.Convert.blocks['convert_from_date'] =
        '<block type="convert_from_date">' +
        '  <mutation format="false" language="false"></mutation>' +
        '  <field name="OPTION">object</field>' +
        '</block>';

    Blocks['convert_from_date'] = {
        init: function (this: Block): void {
            this.appendValueInput('VALUE').appendField(translate('convert_from_date'));

            this.appendDummyInput('OPTION')
                .appendField(translate('convert_to'))
                .appendField(
                    new FieldDropdown(
                        dateFormatOptions(),
                        function (this: Field, option: string): undefined {
                            (this.getSourceBlock() as ShapedBlock).updateShape_(
                                option === 'custom',
                                option === 'wdts' || option === 'wdt' || option === 'Mt' || option === 'Mts',
                            );
                        },
                    ),
                    'OPTION',
                );

            this.setInputsInline(true);
            this.setOutput(true);

            this.setColour(Blockly.Convert.HUE);

            this.setTooltip(translate('convert_from_date_tooltip'));
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
            const format = xmlElement.getAttribute('format');
            const language = xmlElement.getAttribute('language');

            this.updateShape_(format === 'true' || format === 'TRUE', language === 'true' || language === 'TRUE');
        },

        updateShape_: function (this: Block, isFormat: boolean, isLanguage?: boolean): void {
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
                    const languages = dateLanguageOptions();

                    this.appendDummyInput('LANGUAGE').appendField(new FieldDropdown(languages), 'LANGUAGE');
                }
            } else if (this.getInput('LANGUAGE')) {
                this.removeInput('LANGUAGE');
            }
        },
    };

    javascriptGenerator.forBlock['convert_from_date'] = function (block: Block): [string, Order] {
        const fOption = block.getFieldValue('OPTION');
        const fFormat = block.getFieldValue('FORMAT');
        const fLang = block.getFieldValue('LANGUAGE');
        const vValue = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC);

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
            code = `formatDate(getDateObject(${vValue}), ${quote(fFormat)})`;
        } else {
            code = `formatDate(getDateObject(${vValue}), ${quote(fOption)})`;
        }

        return [code, Order.ATOMIC];
    };

    // --- time difference --------------------------------------------------
    Blockly.Convert.blocks['convert_time_difference'] =
        '<block type="convert_time_difference">' +
        '  <mutation format="false"></mutation> ' +
        '  <field name="OPTION">hh:mm:ss</field> ' +
        '</block>';

    Blocks['convert_time_difference'] = {
        init: function (this: Block): void {
            this.appendValueInput('VALUE').appendField(translate('convert_time_difference'));

            this.appendDummyInput('OPTION')
                .appendField(translate('convert_to'))
                .appendField(
                    new FieldDropdown(
                        [
                            [translate('time_difference_hh:mm:ss'), 'hh:mm:ss'],
                            [translate('time_difference_h:m:s'), 'h:m:s'],
                            [translate('time_difference_hh:mm'), 'hh:mm'],
                            [translate('time_difference_h:m'), 'h:m'],
                            [translate('time_difference_mm:ss'), 'mm:ss'],
                            [translate('time_difference_m:s'), 'm:s'],
                            [translate('time_difference_custom'), 'custom'],
                        ],
                        function (this: Field, option: string): undefined {
                            (this.getSourceBlock() as ShapedBlock).updateShape_(option === 'custom');
                        },
                    ),
                    'OPTION',
                );

            this.setInputsInline(true);
            this.setOutput(true, 'String');

            this.setColour(Blockly.Convert.HUE);

            this.setTooltip(translate('convert_time_difference_tooltip'));
        },

        mutationToDom: function (this: Block): Element {
            const container = document.createElement('mutation');
            const option = this.getFieldValue('OPTION');

            container.setAttribute('format', option === 'custom' ? 'true' : 'false');

            return container;
        },

        domToMutation: function (this: ShapedBlock, xmlElement: Element): void {
            const format = xmlElement.getAttribute('format');

            this.updateShape_(format === 'true' || format === 'TRUE');
        },

        updateShape_: function (this: Block, isFormat: boolean): void {
            if (isFormat) {
                if (!this.getInput('FORMAT')) {
                    this.appendDummyInput('FORMAT')
                        .appendField(' ')
                        .appendField(new FieldTextInput(translate('time_difference_default_format')), 'FORMAT');
                }
            } else if (this.getInput('FORMAT')) {
                this.removeInput('FORMAT');
            }
        },
    };

    javascriptGenerator.forBlock['convert_time_difference'] = function (block: Block): [string, Order] {
        const fOption = block.getFieldValue('OPTION');
        const fFormat = block.getFieldValue('FORMAT');
        const vValue = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC);

        return [
            `formatTimeDiff(${vValue ? vValue : '0'}, ${quote(fOption === 'custom' ? fFormat : fOption)})`,
            Order.ATOMIC,
        ];
    };

    // --- json2object --------------------------------------------------
    Blockly.Convert.blocks['convert_json2object'] = '<block type="convert_json2object">' + '</block>';

    Blocks['convert_json2object'] = {
        init: function (this: Block): void {
            this.appendValueInput('VALUE').appendField(translate('convert_json2object'));

            this.setOutput(true);

            this.setColour(Blockly.Convert.HUE);

            this.setTooltip(translate('convert_json2object_tooltip'));
        },
    };

    javascriptGenerator.forBlock['convert_json2object'] = function (block: Block): [string, Order] {
        const vValue = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC);

        return [`(() => { try { return JSON.parse(${vValue}); } catch (e) { return {}; }})()`, Order.ATOMIC];
    };

    // --- object2json --------------------------------------------------
    Blockly.Convert.blocks['convert_object2json'] =
        '<block type="convert_object2json">' + '  <field name="PRETTIFY">FALSE</field>' + '</block>';

    Blocks['convert_object2json'] = {
        init: function (this: Block): void {
            this.appendValueInput('VALUE').appendField(translate('convert_object2json'));

            this.appendDummyInput('PRETTIFY')
                .appendField(translate('convert_object2json_prettify'))
                .appendField(new FieldCheckbox('FALSE'), 'PRETTIFY');

            this.setOutput(true, 'String');

            this.setColour(Blockly.Convert.HUE);

            this.setTooltip(translate('convert_object2json_tooltip'));
        },
    };

    javascriptGenerator.forBlock['convert_object2json'] = function (block: Block): [string, Order] {
        const vValue = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC);

        const fPrettify = block.getFieldValue('PRETTIFY');
        const prettify = fPrettify === 'TRUE' || fPrettify === 'true' || fPrettify === true;

        return [`JSON.stringify(${vValue}${prettify ? ', null, 2' : ''})`, Order.ATOMIC];
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

    Blocks['convert_jsonata'] = {
        init: function (this: Block): void {
            this.appendValueInput('EXPRESSION').appendField(translate('convert_jsonata'));

            this.appendValueInput('TARGET').appendField(translate('convert_jsonata_target'));

            this.setInputsInline(true);
            this.setOutput(true, 'String');

            this.setColour(Blockly.Convert.HUE);

            this.setTooltip(translate('convert_jsonata_tooltip'));
        },
    };

    javascriptGenerator.forBlock['convert_jsonata'] = function (block: Block): [string, Order] {
        const vExpression = javascriptGenerator.valueToCode(block, 'EXPRESSION', Order.ATOMIC);

        let vTarget = javascriptGenerator.valueToCode(block, 'TARGET', Order.ATOMIC);
        if (!vTarget) {
            vTarget = '{}';
        }

        return [`(await jsonataExpression(${vTarget}, ${vExpression}))`, Order.ATOMIC];
    };
}
