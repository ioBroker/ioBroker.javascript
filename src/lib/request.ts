// This module monkey-patches request for the sandbox
// so unhandled errors in the callback or forgetting to
// attach the error event handler does not bring down the adapter

import * as _request from 'request';

let logger: {
    error: (e: string) => void;
} = {
    error: (e: string): void => console.error(e),
};

function requestError(error: Error | string): void {
    logger.error(`Request error: ${error}`);
}

/**
 * Calls a request method which accepts a callback and handles errors in the request and the callback itself
 */
function requestSafe(method: (..._args: any[]) => any, ...args: any[]): any {
    const lastArg = args[args.length - 1];
    if (typeof lastArg === 'function') {
        // If a callback was provided, handle errors in the callback
        const otherArgs = args.slice(0, args.length - 1);
        return method(...otherArgs, (...cbArgs: any[]): void => {
            try {
                lastArg(...cbArgs);
            } catch (err: unknown) {
                logger.error(`Error in request callback: ${err as Error}`);
            }
        }).on('error', requestError);
    }

    // otherwise, just pass the call through
    return method(...args).on('error', requestError);
}

// Wrap all methods that accept a callback
const methodsWithCallback = ['get', 'post', 'put', 'head', 'patch', 'del', 'delete', 'initParams'];
// and request itself
// @ts-expect-error fix later
const request = (...args: any[]): any => requestSafe(_request, ...args);

for (const methodName of methodsWithCallback) {
    request[methodName] = (...args: any[]) => requestSafe(_request[methodName], ...args);
}

// And copy all other properties and methods
const otherPropsAndMethods = ['defaults', 'forever', 'jar', 'cookie', 'debug'];
for (const propName of otherPropsAndMethods) {
    request[propName] = _request[propName];
}

request.setLogger = function (_logger: { error: (e: string) => void }): void {
    logger = _logger;
};

// end of monkeypatching
module.exports = request;
