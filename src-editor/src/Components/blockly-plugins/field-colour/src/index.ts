/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as colourPicker from './blocks/colourPicker';
import * as colourRandom from './blocks/colourRandom';
import * as colourRgb from './blocks/colourRgb';
import * as colourBlend from './blocks/colourBlend';
import type { Generators } from './blocks/generatorsType';

export * from './field_colour';

// Re-export all parts of the definition.
export * as colourPicker from './blocks/colourPicker';
export * as colourRandom from './blocks/colourRandom';
export * as colourRgb from './blocks/colourRgb';
export * as colourBlend from './blocks/colourBlend';

/**
 * Install all the blocks defined in this file and all of their
 * dependencies.
 *
 * @param generators The CodeGenerators to install per-block
 *     generators on.
 */
export function installAllBlocks(generators: Generators = {}): void {
    colourPicker.installBlock(generators);
    colourRgb.installBlock(generators);
    colourRandom.installBlock(generators);
    colourBlend.installBlock(generators);
}
