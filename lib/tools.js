'use strict';

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Tests whether the given variable is a real object and not an Array
 * @param {any} it The variable to test
 * @returns {it is Record<string, any>}
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
 * @param {any} it The variable to test
 * @returns {it is any[]}
 */
function isArray(it) {
    if (Array.isArray != null) return Array.isArray(it);
    return Object.prototype.toString.call(it) === '[object Array]';
}

/**
 * Finds all matches of a regular expression and returns the matched groups
 * @param {RegExp} regex The regular expression to match against the string
 * @param {string} string The string to test
 */
function matchAll(regex, string) {
    const ret = [];
    let match;
    do {
        match = regex.exec(string);
        match && ret.push(match.slice(1));
    } while (match);
    return ret;
}

/**
 * Enumerates all files matching a given predicate
 * @param {string} rootDir The directory to start in
 * @param {(filename: string) => boolean} [predicate]
 */
function enumFilesRecursiveSync(rootDir, predicate) {
    const ret = [];
    try {
        const filesAndDirs = fs.readdirSync(rootDir);
        for (const f of filesAndDirs) {
            const fullPath = path.join(rootDir, f);

            if (fs.statSync(fullPath).isDirectory()) {
                Array.prototype.push.apply(ret, enumFilesRecursiveSync(fullPath, predicate));
            } else if (typeof predicate === 'function' && predicate(fullPath)) {
                ret.push(fullPath);
            }
        }
    } catch (err) {
        console.error(`Cannot read directory: "${rootDir}": ${err}`);
    }

    return ret;
}

/**
 * Promisifies a callback-style function with parameters (err, result)
 * @param {(...args: any[]) => any} fn The callback-style function to promisify
 * @param {*} [context] The value of `this` in the function
 */
function promisify(fn, context) {
    return function(...args) {
        // @ts-ignore We want this behavior
        context = context || this;
        return new Promise((resolve, reject) => {
            fn.apply(context, [...args, (error, result) => {
                if (error) {
                    if (typeof error === 'string') {
                        return reject(new Error(error));
                    }
                    return reject(error);
                } else {
                    return resolve(result);
                }
            }]);
        });
    };
}

/**
 * Promisifies a callback-style function without an error parameter
 * @param {(...args: any[]) => any} fn The callback-style function to promisify
 * @param {*} [context] The value of `this` in the function
 */
function promisifyNoError(fn, context) {
    return function(...args) {
        // @ts-ignore We want this behavior
        context = context || this;
        return new Promise((resolve) => {
            fn.apply(context, [...args, (result) => {
                return resolve(result);
            }]);
        });
    };
}

/**
 * Creates an MD5 hash of a script source which can be used to check whether the source of a compiled language changed
 * @param {string} source The source code to hash
 * @returns {string}
 */
function hashSource(source) {
    return crypto.createHash('md5').update(source).digest('hex');
}

module.exports = {
    isArray,
    isObject,
    matchAll,
    enumFilesRecursiveSync,
    promisify,
    promisifyNoError,
    hashSource,
};
