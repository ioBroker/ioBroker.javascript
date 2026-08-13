/**
 * Text blocks - converted from `public/google-blockly/own/blocks_text.js`.
 *
 * See `blocks_number.ts` for what the conversion pattern is and why the registration lives in
 * `install()` instead of at import time.
 */
import { Blocks, FieldDropdown, type Block } from 'blockly/core';
import { javascriptGenerator, Order } from 'blockly/javascript';

export function install(): void {
    const translate = window.Blockly.Translate;

    // --- Text new line --------------------------------------------------

    Blocks['text_newline'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField(translate('text_newline'));

            this.appendDummyInput().appendField(
                new FieldDropdown([
                    ['\\n', '\\n'],
                    ['\\r', '\\r'],
                    ['\\r\\n', '\\r\\n'],
                ]),
                'Type',
            );

            this.setInputsInline(true);
            this.setOutput(true, 'String');

            this.setColour('%{BKY_TEXTS_HUE}');

            this.setTooltip(translate('text_newline_tooltip'));
        },
    };

    javascriptGenerator.forBlock['text_newline'] = function (block: Block): [string, Order] {
        const dropdownType = block.getFieldValue('Type');

        return [`'${dropdownType}'`, Order.ATOMIC];
    };

    // --- Text contains --------------------------------------------------

    Blocks['text_contains'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField(translate('text_contains'));

            this.appendValueInput('VALUE').setCheck(null);

            this.appendValueInput('FIND').setCheck(null).appendField(translate('text_contains_value'));

            this.setInputsInline(true);
            this.setOutput(true, 'Boolean');

            this.setColour('%{BKY_TEXTS_HUE}');
        },
    };

    javascriptGenerator.forBlock['text_contains'] = function (block: Block): [string, Order] {
        const vValue = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC);
        const vFind = javascriptGenerator.valueToCode(block, 'FIND', Order.ATOMIC);

        return [`String(${vValue}).includes(${vFind})`, Order.ATOMIC];
    };

    // --- Text formatValue -------------------------------------------------

    Blocks['text_format_value'] = {
        init: function (this: Block): void {
            this.appendValueInput('VALUE').appendField(translate('text_format_value')).setCheck(null);

            this.appendDummyInput()
                .appendField(translate('text_format_value_format'))
                .appendField(
                    new FieldDropdown([
                        ['System', 'system'],
                        ['.,', '.,'],
                        [',.', ',.'],
                        [' .', ' .'],
                    ]),
                    'FORMAT',
                );

            this.appendValueInput('DECIMALS').appendField(translate('text_format_value_decimals'));

            this.setInputsInline(true);
            this.setOutput(true, 'String');

            this.setColour('%{BKY_TEXTS_HUE}');
        },
    };

    javascriptGenerator.forBlock['text_format_value'] = function (block: Block): [string, Order] {
        const vValue = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC);
        const vDecimals = javascriptGenerator.valueToCode(block, 'DECIMALS', Order.ATOMIC);
        const fFormat = block.getFieldValue('FORMAT');

        if (fFormat !== 'system') {
            return [`formatValue(parseFloat(${vValue}), ${vDecimals}, '${fFormat}')`, Order.ATOMIC];
        }

        return [`formatValue(parseFloat(${vValue}), ${vDecimals})`, Order.ATOMIC];
    };
}
