"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isObject = isObject;
exports.isArray = isArray;
exports.matchAll = matchAll;
exports.promisify = promisify;
exports.hashSource = hashSource;
exports.getHttpRequestConfig = getHttpRequestConfig;
// import { readdirSync, statSync } from 'node:fs';
// import { join } from 'node:path';
const node_crypto_1 = require("node:crypto");
const node_https_1 = require("node:https");
/**
 * Tests whether the given variable is a real object and not an Array
 *
 * @param it The variable to test
 */
function isObject(it) {
    // This is necessary because:
    // typeof null === 'object'
    // typeof [] === 'object'
    // [] instanceof Object === true
    return Object.prototype.toString.call(it) === '[object Object]';
}
/**
 * Tests whether the given variable is really an Array
 *
 * @param it The variable to test
 */
function isArray(it) {
    return Array.isArray(it);
}
/**
 * Finds all matches of a regular expression and returns the matched groups
 *
 * @param regex The regular expression to match against the string
 * @param string The string to test
 */
function matchAll(regex, string) {
    const ret = [];
    let match;
    do {
        match = regex.exec(string);
        if (match) {
            ret.push(match.slice(1));
        }
    } while (match);
    return ret;
}
/**
 * Enumerates all files matching a given predicate
 *
 * @param rootDir The directory to start in
 * @param predicate A function that takes a filename and returns true if the file should be included
 */
/*export function enumFilesRecursiveSync(rootDir: string, predicate: (filename: string) => boolean): string[] {
    const ret: string[] = [];
    try {
        const filesAndDirs = readdirSync(rootDir);
        for (const f of filesAndDirs) {
            const fullPath = join(rootDir, f);

            if (statSync(fullPath).isDirectory()) {
                Array.prototype.push.apply(ret, enumFilesRecursiveSync(fullPath, predicate));
            } else if (typeof predicate === 'function' && predicate(fullPath)) {
                ret.push(fullPath);
            }
        }
    } catch (err: unknown) {
        console.error(`Cannot read directory: "${rootDir}": ${err as Error}`);
    }

    return ret;
}*/
/**
 * Promisifies a callback-style function with parameters (err, result)
 *
 * @param  fn The callback-style function to promisify
 * @param context The value of `this` in the function
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
function promisify(fn, context) {
    return function (...args) {
        // @ts-expect-error We want this behavior
        context = context || this;
        return new Promise((resolve, reject) => {
            try {
                fn.apply(context, [
                    ...args,
                    (error, result) => {
                        if (error) {
                            if (typeof error === 'string') {
                                return reject(new Error(error));
                            }
                            return reject(error);
                        }
                        return resolve(result);
                    },
                ]);
            }
            catch (error) {
                reject(error);
            }
        });
    };
}
/**
 * Promisifies a callback-style function without an error parameter
 *
 * @param fn The callback-style function to promisify
 * @param context The value of `this` in the function
 */
/*
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function promisifyNoError(fn: Function, context: any): (...args: any[]) => Promise<any> {
    return function (...args) {
        // @ts-expect-error We want this behavior
        context = context || this;
        return new Promise(resolve => {
            try {
                fn.apply(context, [...args, (result: any) => resolve(result)]);
            } catch {
                resolve(null); // what to do in this case??
            }
        });
    };
}*/
/**
 * Creates an MD5 hash of a script source which can be used to check whether the source of a compiled language changed
 *
 * @param source The source code to hash
 */
function hashSource(source) {
    return (0, node_crypto_1.createHash)('md5').update(source).digest('hex');
}
function getHttpRequestConfig(url, options) {
    options = options || {};
    const timeoutMs = options && !isNaN(options.timeout) ? options.timeout : 2000;
    const config = {
        method: 'get',
        url,
        validateStatus: (status) => status >= 200,
        responseType: options && options.responseType ? options.responseType : 'text',
        responseEncoding: 'utf8',
        timeout: timeoutMs,
        //signal: AbortSignal.timeout(timeoutMs), // connection related timeouts
    };
    options.headers = options.headers || {};
    if (options && options.basicAuth) {
        config.auth = {
            username: options.basicAuth.user,
            password: options.basicAuth.password,
        };
    }
    else if (options.bearerAuth) {
        options.headers.Authorization = `Bearer ${options.bearerAuth}`;
    }
    else {
        const uri = new URL(url);
        if (uri.username && uri.password) {
            const username = decodeURIComponent(uri.username);
            const password = decodeURIComponent(uri.password);
            config.url = (config.url || '').replace(`${uri.protocol}//${username}:${password}@`, `${uri.protocol}//`);
            config.auth = {
                username,
                password,
            };
        }
    }
    // Set default headers
    config.headers = {
        'User-Agent': 'Mozilla/5.0 (X11; Linux i686; rv:109.0) Gecko/20100101 Firefox/121.0',
        ...options.headers,
    };
    // Certificate validation
    if (options && typeof options?.validateCertificate !== 'undefined') {
        config.httpsAgent = new node_https_1.Agent({
            rejectUnauthorized: options.validateCertificate,
        });
    }
    return config;
}
//# sourceMappingURL=tools.js.map