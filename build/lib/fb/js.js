"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsParameters = jsParameters;
exports.jsCode = jsCode;
exports.checkJsCode = checkJsCode;
/**
 * The JS block: code of the user that becomes a function of the generated script. Its parameters are
 * the inputs of the block, then `dt`, `firstScan` and `state`.
 */
const graph_1 = require("./graph");
/** The names the code of a JS block sees, in the order the function gets them */
function jsParameters(block, def) {
    return [...(0, graph_1.getInputs)(block, def).map(pin => pin.id), 'dt', 'firstScan', 'state'];
}
/** The code of a JS block */
function jsCode(block, def) {
    const code = block.params?.code ?? def.params?.find(param => param.id === 'code')?.default;
    return typeof code === 'string' ? code : '';
}
/**
 * The syntax error of the code of a JS block, or `null`. The body is parsed on its own, so code that
 * closes the function early is an error too and cannot break the script around it.
 */
function checkJsCode(code, parameters) {
    try {
        new Function(...parameters, code);
        return null;
    }
    catch (error) {
        return error?.message || String(error);
    }
}
//# sourceMappingURL=js.js.map