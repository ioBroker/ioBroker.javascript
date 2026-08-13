/**
 * Stands in for `blockly/javascript` - see `blockly-core.js` for why.
 *
 * The UMD build exposes the generator module as `window.javascript` (that is where `Order` lives)
 * and additionally hangs the generator itself on `Blockly.JavaScript`.
 */
module.exports = {
    ...window.javascript,
    javascriptGenerator: window.Blockly.JavaScript,
};
