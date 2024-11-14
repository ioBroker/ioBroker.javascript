"use strict";
// This module monkey-patches request for the sandbox
// so unhandled errors in the callback or forgetting to
// attach the error event handler does not bring down the adapter
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.request = void 0;
const _request = __importStar(require("request"));
let logger = {
    error: (e) => console.error(e),
};
function requestError(error) {
    logger.error(`Request error: ${error}`);
}
/**
 * Calls a request method which accepts a callback and handles errors in the request and the callback itself
 */
function requestSafe(method, ...args) {
    const lastArg = args[args.length - 1];
    if (typeof lastArg === 'function') {
        // If a callback was provided, handle errors in the callback
        const otherArgs = args.slice(0, args.length - 1);
        return method(...otherArgs, (...cbArgs) => {
            try {
                lastArg(...cbArgs);
            }
            catch (err) {
                logger.error(`Error in request callback: ${err}`);
            }
        }).on('error', requestError);
    }
    // otherwise, just pass the call through
    return method(...args).on('error', requestError);
}
// and request itself
// @ts-expect-error fix later
const request = (...args) => requestSafe(_request, ...args);
exports.request = request;
exports.request.get = (...args) => requestSafe(_request.get, ...args);
exports.request.post = (...args) => requestSafe(_request.post, ...args);
exports.request.put = (...args) => requestSafe(_request.put, ...args);
exports.request.head = (...args) => requestSafe(_request.head, ...args);
exports.request.patch = (...args) => requestSafe(_request.patch, ...args);
exports.request.del = (...args) => requestSafe(_request.del, ...args);
exports.request.delete = (...args) => requestSafe(_request.delete, ...args);
exports.request.initParams = (...args) => requestSafe(_request.initParams, ...args);
// And copy all other properties and methods
exports.request.defaults = _request.defaults;
exports.request.forever = _request.forever;
exports.request.jar = _request.jar;
exports.request.cookie = _request.cookie;
exports.request.debug = _request.debug;
exports.request.setLogger = function (_logger) {
    logger = _logger;
};
// end of monkeypatching
//# sourceMappingURL=request.js.map