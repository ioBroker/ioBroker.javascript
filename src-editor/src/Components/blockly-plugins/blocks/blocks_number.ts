/**
 * Math blocks - converted from `public/google-blockly/own/blocks_number.js`.
 *
 * Unlike the remaining legacy files this is a bundled ES module, so Blockly comes in typed and
 * directly from the npm package instead of through the `window.Blockly` global. Only the ioBroker
 * helpers still come from the global: `Blockly.Translate` is installed by `blocks_words.js`, which
 * has not been converted yet.
 *
 * The registration happens in `install()` rather than at import time, so the load order stays
 * defined by `order.json` no matter which files are already converted.
 */
import { Blocks, FieldNumber, Msg, type Block } from 'blockly/core';
import { javascriptGenerator, Order } from 'blockly/javascript';

export function install(): void {
    const translate = window.Blockly.Translate;

    // --- Round Number to n decimal places -------------------------------

    Blocks['math_rndfixed'] = {
        init: function (this: Block): void {
            this.appendValueInput('x').setCheck('Number').appendField(translate('math_rndfixed_round'));

            this.appendDummyInput()
                .appendField(translate('math_rndfixed_to'))
                .appendField(new FieldNumber(0, 1, 25), 'n')
                .appendField(translate('math_rndfixed_decplcs'));

            this.setInputsInline(true);
            this.setOutput(true, 'Number');

            this.setColour(Msg['MATH_HUE']);

            this.setTooltip(translate('math_rndfixed_tooltip'));
        },
    };

    javascriptGenerator.forBlock['math_rndfixed'] = function (block: Block): [string, Order] {
        const vX = javascriptGenerator.valueToCode(block, 'x', Order.ATOMIC);
        const fExp = Math.pow(10, Number(block.getFieldValue('n')));

        return [`Math.round(${vX} * ${fExp}) / ${fExp}`, Order.ATOMIC];
    };
}
