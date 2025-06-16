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
export const BLOCK_NAME = 'colour_rgb';

// Block for composing a colour from RGB components.
const jsonDefinition = {
    type: BLOCK_NAME,
    message0: '%{BKY_COLOUR_RGB_TITLE} %{BKY_COLOUR_RGB_RED} %1 %{BKY_COLOUR_RGB_GREEN} %2 %{BKY_COLOUR_RGB_BLUE} %3',
    args0: [
        {
            type: 'input_value',
            name: 'RED',
            check: 'Number',
            align: 'RIGHT',
        },
        {
            type: 'input_value',
            name: 'GREEN',
            check: 'Number',
            align: 'RIGHT',
        },
        {
            type: 'input_value',
            name: 'BLUE',
            check: 'Number',
            align: 'RIGHT',
        },
    ],
    output: 'Colour',
    helpUrl: '%{BKY_COLOUR_RGB_HELPURL}',
    style: 'colour_blocks',
    tooltip: '%{BKY_COLOUR_RGB_TOOLTIP}',
};

/**
 * Javascript block generator function.
 *
 * @param block The Block instance to generate code for.
 * @param generator The JavascriptGenerator calling the function.
 * @returns A tuple containing the code string and precedence.
 */
export function toJavascript(block: Block, generator: JavascriptGenerator): [string, number] {
    // Compose a colour from RGB components expressed as percentages.
    const red = generator.valueToCode(block, 'RED', 99 /* JavascriptOrder.NONE */) || 0;
    const green = generator.valueToCode(block, 'GREEN', 99 /* JavascriptOrder.NONE */) || 0;
    const blue = generator.valueToCode(block, 'BLUE', 99 /* JavascriptOrder.NONE */) || 0;
    const functionName = generator.provideFunction_(
        'colourRgb',
        `
function ${generator.FUNCTION_NAME_PLACEHOLDER_}(r, g, b) {
  r = Math.max(Math.min(Number(r), 100), 0) * 2.55;
  g = Math.max(Math.min(Number(g), 100), 0) * 2.55;
  b = Math.max(Math.min(Number(b), 100), 0) * 2.55;
  r = ('0' + (Math.round(r) || 0).toString(16)).slice(-2);
  g = ('0' + (Math.round(g) || 0).toString(16)).slice(-2);
  b = ('0' + (Math.round(b) || 0).toString(16)).slice(-2);
  return '#' + r + g + b;
}
`,
    );
    const code = `${functionName}(${red}, ${green}, ${blue})`;
    return [code, 2 /* JavascriptOrder.FUNCTION_CALL*/];
}

const definitionsDict = window.Blockly.common.createBlockDefinitionsFromJsonArray([jsonDefinition]);

/** The colour_rgb BlockDefinition. */
export const blockDefinition = definitionsDict[BLOCK_NAME];

/**
 * Install the `colour_rgb` block and all of its dependencies.
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
