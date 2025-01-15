/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { JavascriptGenerator } from 'blockly/javascript';

/**
 * An object containing zero or more generators. This is passed
 * to block installation functions so that they may install
 * per-block generators on any languages they support.
 */
export interface Generators {
    javascript?: JavascriptGenerator;
}
