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
export const BLOCK_NAME = 'colour_random';

// Block for random colour.
const jsonDefinition = {
    type: BLOCK_NAME,
    message0: '%{BKY_COLOUR_RANDOM_TITLE}',
    output: 'Colour',
    helpUrl: '%{BKY_COLOUR_RANDOM_HELPURL}',
    style: 'colour_blocks',
    tooltip: '%{BKY_COLOUR_RANDOM_TOOLTIP}',
};

/**
 * Javascript block generator function.
 *
 * @param block The Block instance to generate code for.
 * @param generator The JavascriptGenerator calling the function.
 * @returns A tuple containing the code string and precedence.
 */
export function toJavascript(block: Block, generator: JavascriptGenerator): [string, number] {
    // Generate a random colour.
    const functionName = generator.provideFunction_(
        'colourRandom',
        `
function ${generator.FUNCTION_NAME_PLACEHOLDER_}() {
  var num = Math.floor(Math.random() * 0x1000000);
  return '#' + ('00000' + num.toString(16)).substr(-6);
}
`,
    );
    const code = `${functionName}()`;
    return [code, 2 /* JavascriptOrder.FUNCTION_CALL */];
}

const definitionsDict = window.Blockly.common.createBlockDefinitionsFromJsonArray([jsonDefinition]);

/** The colour_random BlockDefinition. */
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
