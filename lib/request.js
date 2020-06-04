// This module monkey-patches request for the sandbox
// so unhandled errors in the callback or forgetting to
// attach the error event handler does not bring down the adapter

const _request = require('request');

let logger = {
    error: error => console.error(error),
};

function requestError(error) {
    logger.error('Request error: ' + error);
}

/**
 * Calls a request method which accepts a callback and handles errors in the request and the callback itself
 * @param {(...args: any[]) => any} method 
 * @param  {...any} args 
 */
function requestSafe(method, ...args) {
    const lastArg = args[args.length - 1];
    if (typeof lastArg === 'function') {
        // If a callback was provided, handle errors in the callback
        const otherArgs = args.slice(0, args.length - 1);
        return method(...otherArgs, (...cbArgs) => {
            try {
                lastArg(...cbArgs);
            } catch (e) {
                logger.error('Error in request callback: ' + e);
            }
        }).on('error', requestError);
    } else {
        // otherwise just pass the call through
        return method(...args).on('error', requestError);
    }
}

// Wrap all methods that accept a callback
const methodsWithCallback = [
    'get',
    'post',
    'put',
    'head',
    'patch',
    'del',
    'delete',
    'initParams',
];
// and request itself
const request = (...args) => requestSafe(_request, ...args);
for (const methodName of methodsWithCallback) {
    request[methodName] = (...args) => requestSafe(_request[methodName], ...args);
}

// And copy all other properties and methods
const otherPropsAndMethods = [
    'defaults',
    'forever',
    'jar',
    'cookie',
    'debug',
];
for (const propName of otherPropsAndMethods) {
    request[propName] = _request[propName];
}

request.setLogger = function (_logger) {
    logger = _logger;
};

// end of monkeypatching
module.exports = request;