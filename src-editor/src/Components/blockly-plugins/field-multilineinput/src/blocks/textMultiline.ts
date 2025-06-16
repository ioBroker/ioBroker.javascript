/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Block } from 'blockly/core';
import type { JavascriptGenerator } from 'blockly/javascript';
import { type Generators } from './generatorsType';
import { registerFieldMultilineInput } from '../field_multilineinput';

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
 * JavaScript block generator function.
 *
 * @param block The Block instance to generate code for.
 * @param generator The JavascriptGenerator calling the function.
 * @returns A tuple containing the code string and precedence.
 */
export function toJavascript(block: Block, generator: JavascriptGenerator): [string, number] {
    // Text value.
    const code = generator.multiline_quote_(block.getFieldValue('TEXT'));
    const order = code.indexOf('+') !== -1 ? 6.2 /* JavascriptOrder.ADDITION */ : 0 /* JavascriptOrder.ATOMIC */;
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
