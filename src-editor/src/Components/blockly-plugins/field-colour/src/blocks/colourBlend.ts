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
export const BLOCK_NAME = 'colour_blend';

// Block for blending two colours together.
const jsonDefinition = {
    type: BLOCK_NAME,
    message0:
        '%{BKY_COLOUR_BLEND_TITLE} %{BKY_COLOUR_BLEND_COLOUR1} ' +
        '%1 %{BKY_COLOUR_BLEND_COLOUR2} %2 %{BKY_COLOUR_BLEND_RATIO} %3',
    args0: [
        {
            type: 'input_value',
            name: 'COLOUR1',
            check: 'Colour',
            align: 'RIGHT',
        },
        {
            type: 'input_value',
            name: 'COLOUR2',
            check: 'Colour',
            align: 'RIGHT',
        },
        {
            type: 'input_value',
            name: 'RATIO',
            check: 'Number',
            align: 'RIGHT',
        },
    ],
    output: 'Colour',
    helpUrl: '%{BKY_COLOUR_BLEND_HELPURL}',
    style: 'colour_blocks',
    tooltip: '%{BKY_COLOUR_BLEND_TOOLTIP}',
};

/**
 * JavaScript block generator function.
 *
 * @param block The Block instance to generate code for.
 * @param generator The JavascriptGenerator calling the function.
 * @returns A tuple containing the code string and precedence.
 */
export function toJavascript(block: Block, generator: JavascriptGenerator): [string, number] {
    // Blend two colours together.
    const colour1 = generator.valueToCode(block, 'COLOUR1', 99 /* JavascriptOrder.NONE */) || "'#000000'";
    const colour2 = generator.valueToCode(block, 'COLOUR2', 99 /* JavascriptOrder.NONE */) || "'#000000'";
    const ratio = generator.valueToCode(block, 'RATIO', 99 /* JavascriptOrder.NONE */) || 0.5;
    const functionName = generator.provideFunction_(
        'colourBlend',
        `
function ${generator.FUNCTION_NAME_PLACEHOLDER_}(c1, c2, ratio) {
  ratio = Math.max(Math.min(Number(ratio), 1), 0);
  var r1 = parseInt(c1.substring(1, 3), 16);
  var g1 = parseInt(c1.substring(3, 5), 16);
  var b1 = parseInt(c1.substring(5, 7), 16);
  var r2 = parseInt(c2.substring(1, 3), 16);
  var g2 = parseInt(c2.substring(3, 5), 16);
  var b2 = parseInt(c2.substring(5, 7), 16);
  var r = Math.round(r1 * (1 - ratio) + r2 * ratio);
  var g = Math.round(g1 * (1 - ratio) + g2 * ratio);
  var b = Math.round(b1 * (1 - ratio) + b2 * ratio);
  r = ('0' + (r || 0).toString(16)).slice(-2);
  g = ('0' + (g || 0).toString(16)).slice(-2);
  b = ('0' + (b || 0).toString(16)).slice(-2);
  return '#' + r + g + b;
}
`,
    );
    const code = `${functionName}(${colour1}, ${colour2}, ${ratio})`;
    return [code, 2 /* JavascriptOrder.FUNCTION_CALL */];
}

const definitionsDict = window.Blockly.common.createBlockDefinitionsFromJsonArray([jsonDefinition]);

/** The colour_blend BlockDefinition. */
export const blockDefinition = definitionsDict[BLOCK_NAME];

/**
 * Install the `colour_blend` block and all of its dependencies.
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
