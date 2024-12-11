/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Block } from 'blockly/core';
import type { JavascriptGenerator } from 'blockly/javascript';
import { type Generators } from './generatorsType';
import { registerFieldMultilineInput } from '../field_multilineinput';

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
export const BLOCK_NAME = 'text_multiline';

// Block for multiline text input.
const jsonDefinition = {
    type: BLOCK_NAME,
    message0: '%1 %2',
    args0: [
        {
            type: 'field_image',
            src:
                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAARCAYAAADpP' +
                'U2iAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAdhgAAHYYBXaITgQAAABh0RVh0' +
                'U29mdHdhcmUAcGFpbnQubmV0IDQuMS42/U4J6AAAAP1JREFUOE+Vks0KQUEYhjm' +
                'RIja4ABtZ2dm5A3t3Ia6AUm7CylYuQRaUhZSlLZJiQbFAyRnPN33y01HOW08z88' +
                '73zpwzM4F3GWOCruvGIE4/rLaV+Nq1hVGMBqzhqlxgCys4wJA65xnogMHsQ5luj' +
                'nYHTejBBCK2mE4abjCgMGhNxHgDFWjDSG07kdfVa2pZMf4ZyMAdWmpZMfYOsLiD' +
                'MYMjlMB+K613QISRhTnITnsYg5yUd0DETmEoMlkFOeIT/A58iyK5E18BuTBfgYX' +
                'fwNJv4P9/oEBerLylOnRhygmGdPpTTBZAPkde61lbQe4moWUvYUZYLfUNftIY4z' +
                'wA5X2Z9AYnQrEAAAAASUVORK5CYII=',
            width: 12,
            height: 17,
            alt: '\u00B6',
        },
        {
            type: 'field_multilinetext',
            name: 'TEXT',
            text: '',
        },
    ],
    output: 'String',
    style: 'text_blocks',
    helpUrl: '%{BKY_TEXT_TEXT_HELPURL}',
    tooltip: '%{BKY_TEXT_TEXT_TOOLTIP}',
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
    // Text value.
    const code = generator.multiline_quote_(block.getFieldValue('TEXT'));
    const order = code.indexOf('+') !== -1 ? JavascriptOrder.ADDITION : JavascriptOrder.ATOMIC;
    return [code, order];
}

const definitionsDict = window.Blockly.common.createBlockDefinitionsFromJsonArray([jsonDefinition]);

/** The text_multiline BlockDefinition. */
export const blockDefinition = definitionsDict[BLOCK_NAME];

/**
 * Install the `text_multiline` block and all of its dependencies.
 *
 * @param gens The CodeGenerators to install per-block
 *     generators on.
 */
export function installBlock(gens: Generators = {}): void {
    registerFieldMultilineInput();

    window.Blockly.common.defineBlocks(definitionsDict);

    if (gens.javascript) {
        gens.javascript.forBlock[BLOCK_NAME] = toJavascript;
    }
}
