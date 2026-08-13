/**
 * Stands in for `blockly/core` when the harness bundles a converted block module.
 *
 * In the editor, `bridge.ts` and the converted modules share one module instance, and the global is
 * a copy of that namespace - so a module writing to the imported `Blocks` writes into
 * `window.Blockly.Blocks`. Bundling Blockly into each module here would instead create a second,
 * private instance whose registrations nothing ever sees.
 */
module.exports = window.Blockly;
