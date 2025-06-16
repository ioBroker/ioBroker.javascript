/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Block } from 'blockly/core';
import type { JavascriptGenerator } from 'blockly/javascript';
import { type Generators } from './generatorsType';
import { registerFieldColour } from '../field_colour';

/** The name this block is registered under. */
export const BLOCK_NAME = 'colour_picker';

// Block for colour picker.
const jsonDefinition = {
    type: BLOCK_NAME,
    message0: '%1',
    args0: [
        {
            type: 'field_colour',
            name: 'COLOUR',
            colour: '#ff0000',
        },
    ],
    output: 'Colour',
    helpUrl: '%{BKY_COLOUR_PICKER_HELPURL}',
    style: 'colour_blocks',
    tooltip: '%{BKY_COLOUR_PICKER_TOOLTIP}',
    extensions: ['parent_tooltip_when_inline'],
};

/**
 * JavaScript block generator function.
 *
 * @param block The Block instance to generate code for.
 * @param generator The JavascriptGenerator calling the function.
 * @returns A tuple containing the code string and precedence.
 */
export function toJavascript(block: Block, generator: JavascriptGenerator): [string, number] {
    // Colour picker.
    const code = generator.quote_(block.getFieldValue('COLOUR'));
    return [code, 0 /* JavascriptOrder.ATOMIC */];
}

const definitionsDict = window.Blockly.common.createBlockDefinitionsFromJsonArray([jsonDefinition]);

/** The colour_picker BlockDefinition. */
export const blockDefinition = definitionsDict[BLOCK_NAME];

/**
 * Install the `colour_picker` block and all of its dependencies.
 *
 * @param gens The CodeGenerators to install per-block
 *     generators on.
 */
export function installBlock(gens: Generators = {}): void {
    registerFieldColour();
    window.Blockly.common.defineBlocks(definitionsDict);
    if (gens.javascript) {
        gens.javascript.forBlock[BLOCK_NAME] = toJavascript;
    }
}
