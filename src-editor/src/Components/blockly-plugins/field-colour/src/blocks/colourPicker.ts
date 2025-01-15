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
 * Javascript block generator function.
 *
 * @param block The Block instance to generate code for.
 * @param generator The JavascriptGenerator calling the function.
 * @returns A tuple containing the code string and precedence.
 */
export function toJavascript(block: Block, generator: JavascriptGenerator): [string, JavascriptOrder] {
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
