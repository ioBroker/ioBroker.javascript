/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Block } from 'blockly/core';
import type { JavascriptGenerator } from 'blockly/javascript';
import { type Generators } from './generatorsType';
import { registerFieldColour } from '../field_colour';

declare enum JavascriptOrder {
    ATOMIC = 0, // 0 "" ...
    NEW = 1.1, // new
    MEMBER = 1.2, // . []
    FUNCTION_CALL = 2, // ()
    INCREMENT = 3, // ++
    // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
    DECREMENT = 3, // --
    BITWISE_NOT = 4.1, // ~
    UNARY_PLUS = 4.2, // +
    UNARY_NEGATION = 4.3, // -
    LOGICAL_NOT = 4.4, // !
    TYPEOF = 4.5, // typeof
    VOID = 4.6, // void
    DELETE = 4.7, // delete
    AWAIT = 4.8, // await
    EXPONENTIATION = 5, // **
    MULTIPLICATION = 5.1, // *
    DIVISION = 5.2, // /
    MODULUS = 5.3, // %
    SUBTRACTION = 6.1, // -
    ADDITION = 6.2, // +
    BITWISE_SHIFT = 7, // << >> >>>
    RELATIONAL = 8, // < <= > >=
    // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
    IN = 8, // in
    // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
    INSTANCEOF = 8, // instanceof
    EQUALITY = 9, // == != === !==
    BITWISE_AND = 10, // &
    BITWISE_XOR = 11, // ^
    BITWISE_OR = 12, // |
    LOGICAL_AND = 13, // &&
    LOGICAL_OR = 14, // ||
    CONDITIONAL = 15, // ?:
    ASSIGNMENT = 16, // = += -= **= *= /= %= <<= >>= ...
    YIELD = 17, // yield
    COMMA = 18, // ,
    NONE = 99,
}

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
 * Javascript block generator function.
 *
 * @param block The Block instance to generate code for.
 * @param generator The JavascriptGenerator calling the function.
 * @returns A tuple containing the code string and precedence.
 */
export function toJavascript(block: Block, generator: JavascriptGenerator): [string, JavascriptOrder] {
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
