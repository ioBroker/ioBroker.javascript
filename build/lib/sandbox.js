"use strict";
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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FORBIDDEN_CHARS = void 0;
exports.normalizeStateDefault = normalizeStateDefault;
exports.isValidPattern = isValidPattern;
exports.pattern2RegEx = pattern2RegEx;
exports.isExactId = isExactId;
exports.removeFromDispatchIndex = removeFromDispatchIndex;
exports.sandBox = sandBox;
const jsonataMod = __importStar(require("jsonata"));
const tools_1 = require("./tools");
const constsMod = __importStar(require("./consts"));
const wordsMod = __importStar(require("./words"));
const eventObjMod = __importStar(require("./eventObj"));
const patternCompareFunctions_1 = require("./patternCompareFunctions");
const SCRIPT_CODE_MARKER = 'script.js.';
/**
 * State types whose value - and therefore whose default - is stored as JSON, not as itself.
 *
 * `json` is missing from `ioBroker.CommonType` but js-controller accepts it and applies the same
 * rule, so these are compared as plain strings - `setStateHelper` treats it the same way.
 */
const STRINGIFIED_STATE_TYPES = ['object', 'json', 'array'];
/**
 * Brings `common.def` of a state into the shape js-controller expects, in place.
 *
 * A state of a structured type keeps its value as JSON - `setState` stringifies it on the way in.
 * js-controller expects the same of the default and rejects anything else with "Default value has
 * to be stringified but received type ...", which a script author cannot act on
 * (https://github.com/ioBroker/ioBroker.javascript/issues/2307).
 *
 * @param common The `common` part of a state object
 * @throws {TypeError} if the default cannot be stringified, e.g. because it is circular
 */
function normalizeStateDefault(common) {
    if (common.def == null || typeof common.def === 'string' || !STRINGIFIED_STATE_TYPES.includes(common.type)) {
        return;
    }
    common.def = JSON.stringify(common.def);
}
// Pre-compiled RegExp constants for formatTimeDiff – avoids recompiling on every call
const FTD_TEST_D = /(?<!\\)[DTД]/;
const FTD_REPL_DD = /(?<!\\)(?:DD|TT|ДД)/g;
const FTD_REPL_D = /(?<!\\)[DTД]/g;
const FTD_TEST_H = /(?<!\\)[hSч]/;
const FTD_REPL_HH = /(?<!\\)(?:hh|SS|чч)/g;
const FTD_REPL_H = /(?<!\\)[hSч]/g;
const FTD_TEST_M = /(?<!\\)[mм]/;
const FTD_REPL_MM = /(?<!\\)(?:mm|мм)/g;
const FTD_REPL_M = /(?<!\\)[mм]/g;
const FTD_TEST_S = /(?<!\\)[sс]/;
const FTD_REPL_SS = /(?<!\\)(?:ss|сс)/g;
const FTD_REPL_S = /(?<!\\)[sс]/g;
const FTD_UNESCAPE = [
    [/\\([DTД])/g, '$1'],
    [/\\([hSч])/g, '$1'],
    [/\\([mм])/g, '$1'],
    [/\\([sс])/g, '$1'],
];
/** Maximum number of cached selector RegExps before FIFO eviction kicks in */
const _SELECTOR_REGEXP_CACHE_MAX = 1000;
/** Cache for selector-string → RegExp to avoid recompiling identical patterns (FIFO-bounded) */
const _selectorRegExpCache = new Map();
/** Monotonically increasing handler-ID counter – avoids Date.now()+random collisions */
let _handlerIdCounter = 1;
/** All characters that may not appear in an object ID. */
exports.FORBIDDEN_CHARS = /[^._\-/ :!#$%&()+=@^{}|~\p{Ll}\p{Lu}\p{Nd}]+/gu;
/**
 * Checks if a pattern is valid
 *
 * @param pattern The pattern to check for validity
 */
function isValidPattern(pattern) {
    pattern = pattern.replace(/\*/g, '');
    return !exports.FORBIDDEN_CHARS.test(pattern);
}
/**
 * Converts ioB pattern into regex.
 *
 * This funtion was copied from js-controller, as for the tests it is required, that function must be defined here.
 * Else the adapter-core tries to find js-controller and it is not installed.
 *
 * @param pattern - Regex string to use it in new RegExp(pattern)
 */
function pattern2RegEx(pattern) {
    pattern = (pattern || '').toString();
    if (!isValidPattern(pattern)) {
        throw new Error(`The pattern "${pattern}" is not a valid ID pattern`);
    }
    const startsWithWildcard = pattern[0] === '*';
    const endsWithWildcard = pattern[pattern.length - 1] === '*';
    pattern = pattern.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\*/g, '.*');
    return (startsWithWildcard ? '' : '^') + pattern + (endsWithWildcard ? '' : '$');
}
/** Returns true when patId is a plain exact state-ID (no wildcards, no RegExp notation). */
function isExactId(patId) {
    return (!!patId && typeof patId === 'string' && !patId.includes('*') && !patId.includes('?') && !patId.startsWith('/'));
}
/**
 * Removes a subscription from the O(1) dispatch index (subscriptionsMap / subscriptionsWildcard).
 * Must use the same exact-id classification as the subscribe side (isExactId),
 * otherwise entries leak in the structure that was not searched.
 */
function removeFromDispatchIndex(ctx, sub) {
    const patId = sub.pattern?.id;
    if (isExactId(patId)) {
        const bucket = ctx.subscriptionsMap.get(patId);
        if (bucket) {
            const pos = bucket.indexOf(sub);
            if (pos !== -1) {
                bucket.splice(pos, 1);
            }
            if (bucket.length === 0) {
                ctx.subscriptionsMap.delete(patId);
            }
        }
    }
    else {
        const wPos = ctx.subscriptionsWildcard.indexOf(sub);
        if (wPos !== -1) {
            ctx.subscriptionsWildcard.splice(wPos, 1);
        }
    }
}
function sandBox(script, name, verbose, debug, context, logCollector) {
    const consts = constsMod;
    const words = wordsMod;
    const eventObj = eventObjMod;
    const patternCompareFunctions = patternCompareFunctions_1.patternCompareFunctions;
    const jsonata = jsonataMod.default;
    const adapter = context.adapter;
    const mods = context.mods;
    const states = context.states;
    const objects = context.objects;
    const timers = context.timers;
    const enums = context.enums;
    const debugMode = context.debugMode;
    // eslint-disable-next-line prefer-const
    let sandbox;
    function errorInCallback(e) {
        void adapter.setState(`scriptProblem.${name.substring(SCRIPT_CODE_MARKER.length)}`, {
            val: true,
            ack: true,
            c: 'errorInCallback',
        });
        context.logError(name, 'Error in callback:', e);
        context.debugMode && console.log(`error$$${name}$$Exception in callback: ${e}`, Date.now());
    }
    function subscribePattern(script, pattern) {
        if (adapter.config.subscribe) {
            if (!script.subscribes[pattern]) {
                script.subscribes[pattern] = 1;
            }
            else {
                script.subscribes[pattern]++;
            }
            if (!context.subscribedPatterns[pattern]) {
                context.subscribedPatterns[pattern] = 1;
                if (sandbox.verbose) {
                    sandbox.log(`subscribePattern(pattern=${pattern})`, 'info');
                }
                adapter.subscribeForeignStates(pattern);
                // request current value to deliver old value on change.
                if (typeof pattern === 'string' && !pattern.includes('*')) {
                    void adapter.getForeignState(pattern, (_err, state) => {
                        if (state) {
                            states[pattern] = state;
                        }
                    });
                }
                else {
                    // IO-3: Object.assign instead of Object.keys().forEach() – no temporary keys array
                    adapter.getForeignStates(pattern, (_err, _states) => _states && Object.assign(states, _states));
                }
            }
            else {
                context.subscribedPatterns[pattern]++;
            }
        }
    }
    function unsubscribePattern(script, pattern) {
        if (adapter.config.subscribe) {
            if (script.subscribes[pattern]) {
                script.subscribes[pattern]--;
                if (!script.subscribes[pattern]) {
                    delete script.subscribes[pattern];
                }
            }
            if (context.subscribedPatterns[pattern]) {
                context.subscribedPatterns[pattern]--;
                if (!context.subscribedPatterns[pattern]) {
                    adapter.unsubscribeForeignStates(pattern);
                    delete context.subscribedPatterns[pattern];
                    // if the pattern was regex or with * some states will stay in RAM, but it is OK.
                    if (states[pattern]) {
                        delete states[pattern];
                    }
                }
            }
        }
    }
    function subscribeFile(script, id, fileNamePattern) {
        const key = `${id}$%$${fileNamePattern}`;
        if (!script.subscribesFile[key]) {
            script.subscribesFile[key] = 1;
        }
        else {
            script.subscribesFile[key]++;
        }
        if (!context.subscribedPatternsFile[key]) {
            context.subscribedPatternsFile[key] = 1;
            void adapter.subscribeForeignFiles(id, fileNamePattern);
        }
        else {
            context.subscribedPatternsFile[key]++;
        }
    }
    function unsubscribeFile(script, id, fileNamePattern) {
        const key = `${id}$%$${fileNamePattern}`;
        if (script.subscribesFile[key]) {
            script.subscribesFile[key]--;
            if (!script.subscribesFile[key]) {
                delete script.subscribesFile[key];
            }
        }
        if (context.subscribedPatternsFile[key]) {
            context.subscribedPatternsFile[key]--;
            if (!context.subscribedPatternsFile[key]) {
                void adapter.unsubscribeForeignFiles(id, fileNamePattern);
                delete context.subscribedPatternsFile[key];
            }
        }
    }
    function getPatternCompareFunctions(pattern) {
        let func;
        const functions = [];
        functions.logic = pattern.logic || 'and';
        for (const key in pattern) {
            if (!Object.prototype.hasOwnProperty.call(pattern, key)) {
                continue;
            }
            if (key === 'logic') {
                continue;
            }
            if (key === 'change' && pattern.change === 'any') {
                continue;
            }
            const _func = patternCompareFunctions[key];
            if (!_func) {
                continue;
            }
            func = _func(pattern);
            if (typeof func !== 'function') {
                continue;
            }
            functions.push(func);
        }
        return functions;
    }
    /**
     * Splits a selector string into attribute and value
     *
     * @param selector The selector string to split
     */
    function splitSelectorString(selector) {
        const parts = selector.split('=', 2);
        if (parts[1] && parts[1][0] === '"') {
            parts[1] = parts[1].substring(1);
            const len = parts[1].length;
            if (parts[1] && parts[1][len - 1] === '"') {
                parts[1] = parts[1].substring(0, len - 1);
            }
        }
        if (parts[1] && parts[1][0] === "'") {
            parts[1] = parts[1].substring(1);
            const len = parts[1].length;
            if (parts[1] && parts[1][len - 1] === "'") {
                parts[1] = parts[1].substring(0, len - 1);
            }
        }
        if (parts[1]) {
            parts[1] = parts[1].trim();
        }
        parts[0] = parts[0].trim();
        return { attr: parts[0], value: parts[1] };
    }
    /**
     * Transforms a selector string with wildcards into a regular expression
     *
     * @param str The selector string to transform into a regular expression
     */
    function selectorStringToRegExp(str) {
        const cached = _selectorRegExpCache.get(str);
        if (cached) {
            return cached;
        }
        const startsWithWildcard = str[0] === '*';
        const endsWithWildcard = str[str.length - 1] === '*';
        // eslint-disable-next-line no-useless-escape
        const escaped = str.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\*/g, '.*');
        const re = new RegExp((startsWithWildcard ? '' : '^') + escaped + (endsWithWildcard ? '' : '$'));
        // FIFO eviction: drop the oldest entry once the cache exceeds its limit
        if (_selectorRegExpCache.size >= _SELECTOR_REGEXP_CACHE_MAX) {
            const oldestKey = _selectorRegExpCache.keys().next().value;
            if (oldestKey !== undefined) {
                _selectorRegExpCache.delete(oldestKey);
            }
        }
        _selectorRegExpCache.set(str, re);
        return re;
    }
    /**
     * Adds a regular expression for selectors targeting the state ID
     *
     * @param selector The selector to apply the transform to
     */
    function addRegExpToIdAttrSelectors(selector) {
        if ((selector.attr === 'id' || selector.attr === 'state.id') && !selector.idRegExp && selector.value) {
            return {
                attr: selector.attr,
                value: selector.value,
                idRegExp: selectorStringToRegExp(selector.value),
            };
        }
        return selector;
    }
    /**
     * Tests if a value loosely equals (==) the reference string.
     * In contrast to the equality operator, this treats true == "true" as well
     * so we can test common and native attributes for boolean values
     *
     * @param value The value to compare with the reference
     * @param reference The reference to compare the value to
     */
    function looselyEqualsString(value, reference) {
        // For booleans, compare the string representation
        // For other types do a loose comparison
        return typeof value === 'boolean'
            ? (value && reference === 'true') || (!value && reference === 'false')
            : value == reference;
    }
    /**
     * Returns the `common.type` for a given variable
     */
    function getCommonTypeOf(value) {
        return (0, tools_1.isArray)(value) ? 'array' : (0, tools_1.isObject)(value) ? 'object' : typeof value;
    }
    /**
     * Returns if an id is in an allowed namespace for automatic object creations
     *
     * @param id id to check
     */
    function validIdForAutomaticFolderCreation(id) {
        return id.startsWith('javascript.') || id.startsWith('0_userdata.0.') || id.startsWith('alias.0.');
    }
    /**
     * Iterate through object structure to create missing folder objects
     */
    async function ensureObjectStructure(id) {
        if (!validIdForAutomaticFolderCreation(id)) {
            return;
        }
        if (context.folderCreationVerifiedObjects[id] === true) {
            return;
        }
        const idArr = id.split('.');
        idArr.pop(); // the last is created as an object in any way
        if (idArr.length < 3) {
            return; // Nothing to do
        }
        // We just create sublevel projects
        let idToCheck = idArr.splice(0, 2).join('.');
        context.folderCreationVerifiedObjects[id] = true;
        for (const part of idArr) {
            idToCheck += `.${part}`;
            if (context.folderCreationVerifiedObjects[idToCheck] === true || objects[idToCheck]) {
                continue;
            }
            context.folderCreationVerifiedObjects[idToCheck] = true;
            let obj;
            try {
                obj = await adapter.getForeignObjectAsync(idToCheck);
            }
            catch {
                // ignore
            }
            if (!obj?.common) {
                sandbox.log(`Create folder object for ${idToCheck}`, 'debug');
                try {
                    await adapter.setForeignObjectAsync(idToCheck, {
                        _id: idToCheck,
                        type: 'folder',
                        common: {
                            name: part,
                        },
                        native: {
                            autocreated: 'by automatic ensure logic',
                        },
                    });
                }
                catch (err) {
                    sandbox.log(`Could not automatically create folder object ${idToCheck}: ${err.message}`, 'info');
                }
            }
            else {
                //sandbox.log(`    already existing "${idToCheck}": ${JSON.stringify(obj)}`, 'debug');
            }
        }
    }
    function setStateHelper(sandbox, isCreate, isChanged, id, state, isAck, callback) {
        if (typeof isAck === 'function') {
            callback = isAck;
            isAck = undefined;
        }
        let stateNotNull;
        if (isAck === true || isAck === false || isAck === 'true' || isAck === 'false') {
            if (state && typeof state === 'object' && state.val !== undefined) {
                stateNotNull = state;
                // we assume that we were given a state object if
                // state is an object that contains a `val` property
                if (!Object.prototype.hasOwnProperty.call(state, 'ack')) {
                    stateNotNull.ack = isAck === true || isAck === 'true';
                }
            }
            else if (state === null) {
                stateNotNull = { val: null, ack: isAck === true || isAck === 'true' };
            }
            else {
                // otherwise, assume that the given state is the value to be set
                stateNotNull = { val: state, ack: isAck === true || isAck === 'true' };
            }
        }
        else if (state === null) {
            stateNotNull = { val: null };
        }
        else {
            stateNotNull = state;
        }
        // Check a type of state
        if (!objects[id] && objects[`${adapter.namespace}.${id}`]) {
            id = `${adapter.namespace}.${id}`;
        }
        if (isCreate) {
            if (id.match(/^javascript\.\d+\.scriptEnabled/)) {
                sandbox.log(`Own states (${id}) should not be used in javascript.X.scriptEnabled.*! Please move the states to 0_userdata.0.*`, 'info');
            }
            else if (id.match(/^javascript\.\d+\.scriptProblem/)) {
                sandbox.log(`Own states (${id}) should not be used in javascript.X.scriptProblem.*! Please move the states to 0_userdata.0.*`, 'info');
            }
        }
        const common = objects[id] ? objects[id].common : null;
        if (common?.type && common.type !== 'mixed' && common.type !== 'json') {
            // Find out which type the value has
            let actualCommonType;
            if (typeof stateNotNull === 'object') {
                if (stateNotNull && stateNotNull.val !== undefined && stateNotNull.val !== null) {
                    actualCommonType = getCommonTypeOf(stateNotNull.val);
                }
            }
            else if (stateNotNull !== undefined) {
                actualCommonType = getCommonTypeOf(stateNotNull);
            }
            // If this is not the expected one, issue a warning
            if (actualCommonType && actualCommonType !== common.type) {
                context.logWithLineInfo(`You are assigning a ${actualCommonType} to the state "${id}" which expects a ${common.type}. ` +
                    `Please fix your code to use a ${common.type} or change the state type to ${actualCommonType}. ` +
                    `This warning might become an error in future versions.`);
            }
            if (actualCommonType === 'array' || actualCommonType === 'object') {
                try {
                    if (typeof stateNotNull === 'object' && typeof stateNotNull.val !== 'undefined') {
                        stateNotNull.val = JSON.stringify(stateNotNull.val);
                    }
                    else {
                        stateNotNull = JSON.stringify(stateNotNull);
                    }
                }
                catch (err) {
                    context.logWithLineInfo(`Could not stringify value for type ${actualCommonType} and id ${id}: ${err.message}`);
                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, new Error(`Could not stringify value for type ${actualCommonType} and id ${id}: ${err.message}`));
                        }
                        catch (err) {
                            errorInCallback(err);
                        }
                    }
                }
            }
        }
        // Check min and max of value
        if (typeof stateNotNull === 'object') {
            if (common && typeof stateNotNull.val === 'number') {
                const num = stateNotNull.val;
                if (common.min !== undefined && num < common.min) {
                    stateNotNull.val = common.min;
                }
                else if (common.max !== undefined && num > common.max) {
                    stateNotNull.val = common.max;
                }
            }
        }
        else if (common && typeof stateNotNull === 'number') {
            const num = stateNotNull;
            if (common.min !== undefined && num < common.min) {
                stateNotNull = common.min;
            }
            if (common.max !== undefined && num > common.max) {
                stateNotNull = common.max;
            }
        }
        let stateAsObject;
        // modify state here, to make it available in callback
        if (stateNotNull === null || typeof stateNotNull !== 'object' || stateNotNull.val === undefined) {
            stateAsObject = context.prepareStateObject(id, {
                val: stateNotNull,
                ack: isAck === true || isAck === 'true',
            });
        }
        else {
            stateAsObject = context.prepareStateObject(id, stateNotNull);
        }
        // set as comment: from which script this state was set.
        stateAsObject.c = sandbox.scriptName;
        if (objects[id]) {
            script.setStatePerMinuteCounter++;
            if (sandbox.verbose) {
                sandbox.log(`setForeignState(id=${id}, state=${JSON.stringify(stateAsObject)})`, 'info');
            }
            if (debug) {
                sandbox.log(`setForeignState(id=${id}, state=${JSON.stringify(stateAsObject)}) - ${words._('was not executed, while debug mode is active')}`, 'warn');
                if (typeof callback === 'function') {
                    setImmediate(() => {
                        try {
                            callback.call(sandbox);
                        }
                        catch (err) {
                            errorInCallback(err);
                        }
                    });
                }
            }
            else {
                if (!adapter.config.subscribe) {
                    // store actual state to make possible to process value in callback
                    // risk that there will be an error on setState is very low,
                    // but we will not store new state if the setStateChanged is called
                    if (!isChanged) {
                        context.interimStateValues[id] = stateAsObject;
                    }
                }
                const errHandler = (err, funcId) => {
                    err && sandbox.log(`${funcId}: ${err}`, 'error');
                    // If adapter holds all states
                    if (err && !adapter.config.subscribe) {
                        delete context.interimStateValues[id];
                    }
                    if (typeof callback === 'function') {
                        setImmediate(() => {
                            try {
                                callback.call(sandbox);
                            }
                            catch (err) {
                                errorInCallback(err);
                            }
                        });
                    }
                };
                if (isChanged) {
                    if (!adapter.config.subscribe && context.interimStateValues[id]) {
                        // if the state is changed, we will compare it with interimStateValues
                        const oldState = context.interimStateValues[id];
                        // IO-1: for…in instead of Object.keys().filter().every() – no temporary array per call
                        let stateHasChanged = false;
                        for (const attr in stateAsObject) {
                            if (attr === 'ts') {
                                continue;
                            }
                            if (stateAsObject[attr] === undefined) {
                                continue;
                            }
                            if (stateAsObject[attr] !== oldState[attr]) {
                                stateHasChanged = true;
                                break;
                            }
                        }
                        if (stateHasChanged) {
                            // state is changed for sure, and we will call setForeignState
                            // and store new state to interimStateValues
                            context.interimStateValues[id] = stateAsObject;
                            adapter.setForeignState(id, stateAsObject, err => errHandler(err, 'setForeignState'));
                        }
                        else {
                            // otherwise - do nothing as we have cached state, except callback
                            errHandler(null, 'setForeignStateCached');
                        }
                    }
                    else {
                        // adapter doesn't hold all states, or it has not cached then we will simply call setForeignStateChanged
                        adapter.setForeignStateChanged(id, { ...stateAsObject, ts: undefined }, err => errHandler(err, 'setForeignStateChanged'));
                    }
                }
                else {
                    adapter.setForeignState(id, stateAsObject, err => errHandler(err, 'setForeignState'));
                }
            }
        }
        else {
            context.logWithLineInfo(`State "${id}" not found`);
            if (typeof callback === 'function') {
                setImmediate(() => {
                    try {
                        callback.call(sandbox, new Error(`State "${id}" not found`));
                    }
                    catch (err) {
                        errorInCallback(err);
                    }
                });
            }
        }
    }
    sandbox = {
        mods,
        _id: script._id,
        // @deprecated use scriptName
        name,
        scriptName: name,
        instance: adapter.instance || 0,
        defaultDataDir: context.getAbsoluteDefaultDataDir(),
        verbose,
        exports: {}, // Polyfill for the export object in TypeScript modules
        require: function (md) {
            if (typeof md === 'string' && md.startsWith('node:')) {
                md = md.replace(/^node:/, '');
            }
            if (md === 'request') {
                if (!sandbox.__engine.__deprecatedWarnings.includes(md)) {
                    sandbox.log(`request package is deprecated - please use httpGet (or a stable lib like axios) instead!`, 'warn');
                    sandbox.__engine.__deprecatedWarnings.push(md);
                }
            }
            if (mods[md]) {
                return mods[md];
            }
            let error;
            try {
                mods[md] = require(adapter.getAdapterScopedPackageIdentifier ? adapter.getAdapterScopedPackageIdentifier(md) : md);
                return mods[md];
            }
            catch (e) {
                error = e;
            }
            try {
                // the user requires a module which is not specified in the additional node modules
                // for backward compatibility we check if the module can simply be required directly before we fail (e.g., direct dependencies of JavaScript adapter)
                adapter.log.debug(`Try direct require of "${md}" as not specified in the additional dependencies`);
                mods[md] = require(md);
                return mods[md];
            }
            catch (e) {
                context.logError(name, `Error by loading module "${md}":`, error || e, 6);
                void adapter.setState(`scriptProblem.${name.substring(SCRIPT_CODE_MARKER.length)}`, {
                    val: true,
                    ack: true,
                    c: 'require',
                });
            }
        },
        Buffer: Buffer,
        __engine: {
            __deprecatedWarnings: [],
            __subscriptionsObject: 0,
            __subscriptions: 0,
            __subscriptionsMessage: 0,
            __subscriptionsFile: 0,
            __subscriptionsLog: 0,
            __schedules: 0,
        },
        $: function (selector) {
            // following is supported
            // 'type[commonAttr=something]', 'id[commonAttr=something]', id(enumName="something")', id{nativeName="something"}
            // Type can be state, channel or device
            // Attr can be any of the common attributes and can have wildcards *
            // E.g. "state[id='hm-rpc.0.*]" or "hm-rpc.0.*" returns all states of adapter instance hm-rpc.0
            // channel(room="Living room") => all states in room "Living room"
            // channel{TYPE=BLIND}[state.id=*.LEVEL]
            // Switch all states with .STATE of channels with role "switch" in "Wohnzimmer" to false
            // $('channel[role=switch][state.id=*.STATE](rooms=Wohnzimmer)').setState(false);
            //
            // Following functions are possible, setValue, getValue (only from first), on, each
            // Todo CACHE!!!
            const result = {};
            let name = '';
            const commonStrings = [];
            const enumStrings = [];
            const nativeStrings = [];
            let isInsideName = true;
            let isInsideCommonString = false;
            let isInsideEnumString = false;
            let isInsideNativeString = false;
            let currentCommonString = '';
            let currentNativeString = '';
            let currentEnumString = '';
            // parse string
            let selectorHasInvalidType = false;
            if (typeof selector === 'string') {
                for (let i = 0; i < selector.length; i++) {
                    if (selector[i] === '{') {
                        isInsideName = false;
                        if (isInsideCommonString || isInsideEnumString || isInsideNativeString) {
                            // Error
                            break;
                        }
                        isInsideNativeString = true;
                    }
                    else if (selector[i] === '}') {
                        isInsideNativeString = false;
                        nativeStrings.push(currentNativeString);
                        currentNativeString = '';
                    }
                    else if (selector[i] === '[') {
                        isInsideName = false;
                        if (isInsideCommonString || isInsideEnumString || isInsideNativeString) {
                            // Error
                            break;
                        }
                        isInsideCommonString = true;
                    }
                    else if (selector[i] === ']') {
                        isInsideCommonString = false;
                        commonStrings.push(currentCommonString);
                        currentCommonString = '';
                    }
                    else if (selector[i] === '(') {
                        isInsideName = false;
                        if (isInsideCommonString || isInsideEnumString || isInsideNativeString) {
                            // Error
                            break;
                        }
                        isInsideEnumString = true;
                    }
                    else if (selector[i] === ')') {
                        isInsideEnumString = false;
                        enumStrings.push(currentEnumString);
                        currentEnumString = '';
                    }
                    else if (isInsideName) {
                        name += selector[i];
                    }
                    else if (isInsideCommonString) {
                        currentCommonString += selector[i];
                    }
                    else if (isInsideEnumString) {
                        currentEnumString += selector[i];
                    }
                    else if (isInsideNativeString) {
                        currentNativeString += selector[i];
                    } //else {
                    // some error
                    //}
                }
            }
            else {
                selectorHasInvalidType = true;
            }
            // If some error in the selector
            if (selectorHasInvalidType || isInsideEnumString || isInsideCommonString || isInsideNativeString) {
                result.length = 0;
                result.toArray = function () {
                    return [];
                };
                result.each = function () {
                    return this;
                };
                result.getState = function () {
                    return null;
                };
                result.setState = function () {
                    return this;
                };
                result.on = function () {
                    return this;
                };
            }
            if (isInsideEnumString) {
                sandbox.log(`Invalid selector: enum close bracket ")" cannot be found in "${selector}"`, 'warn');
                result.error = 'Invalid selector: enum close bracket ")" cannot be found';
                return result;
            }
            else if (isInsideCommonString) {
                sandbox.log(`Invalid selector: common close bracket "]" cannot be found in "${selector}"`, 'warn');
                result.error = 'Invalid selector: common close bracket "]" cannot be found';
                return result;
            }
            else if (isInsideNativeString) {
                sandbox.log(`Invalid selector: native close bracket "}" cannot be found in "${selector}"`, 'warn');
                result.error = 'Invalid selector: native close bracket "}" cannot be found';
                return result;
            }
            else if (selectorHasInvalidType) {
                const message = `Invalid selector: selector must be a string but is of type ${typeof selector}`;
                sandbox.log(message, 'warn');
                result.error = message;
                return result;
            }
            let commonSelectors = commonStrings.map(selector => splitSelectorString(selector));
            let nativeSelectors = nativeStrings.map(selector => splitSelectorString(selector));
            const enumSelectorObjects = enumStrings.map(_enum => splitSelectorString(_enum));
            const allSelectors = commonSelectors.concat(nativeSelectors, enumSelectorObjects);
            // These selectors match the state or object ID and don't belong in the common/native selectors
            // Also use RegExp for the ID matching
            const stateIdSelectors = allSelectors
                .filter(selector => selector.attr === 'state.id')
                .map(selector => addRegExpToIdAttrSelectors(selector));
            const objectIdSelectors = allSelectors
                .filter(selector => selector.attr === 'id')
                .map(selector => addRegExpToIdAttrSelectors(selector));
            commonSelectors = commonSelectors.filter(selector => selector.attr !== 'state.id' && selector.attr !== 'id');
            nativeSelectors = nativeSelectors.filter(selector => selector.attr !== 'state.id' && selector.attr !== 'id');
            const enumSelectors = enumSelectorObjects
                .filter(selector => selector.attr !== 'state.id' && selector.attr !== 'id')
                // enums are filtered by their enum id, so transform the selector into that
                .map(selector => `enum.${selector.attr}.${selector.value}`);
            name = name.trim();
            if (name === 'channel' || name === 'device') {
                // Fill the channels and devices objects with the IDs of all their states,
                // so we can loop over them afterward
                if (!context.channels || !context.devices) {
                    context.channels = {};
                    context.devices = {};
                    for (const _id of Object.keys(objects)) {
                        if (objects[_id].type === 'state') {
                            const parts = _id.split('.');
                            parts.pop();
                            const chn = parts.join('.');
                            parts.pop();
                            const dev = parts.join('.');
                            context.devices[dev] = context.devices[dev] || new Set();
                            context.devices[dev].add(_id);
                            context.channels[chn] = context.channels[chn] || new Set();
                            context.channels[chn].add(_id);
                        }
                    }
                }
            }
            if (name === 'schedule') {
                if (!context.schedules) {
                    context.schedules = [];
                    for (const _id of Object.keys(objects)) {
                        if (objects[_id].type === 'schedule') {
                            context.schedules.push(_id);
                        }
                    }
                }
            }
            /**
             * applies all selectors targeting an object or state ID
             */
            function applyIDSelectors(objId, selectors) {
                // Only keep the ID if it matches every ID selector
                return selectors.every(selector => !selector.idRegExp || selector.idRegExp.test(objId));
            }
            /**
             * Applies all selectors targeting the Object common properties
             *
             * @param objId - The ID of the object in question
             */
            function applyCommonSelectors(objId) {
                const obj = objects[objId];
                if (!obj?.common) {
                    return false;
                }
                const objCommon = obj.common;
                // make sure this object satisfies all selectors
                return commonSelectors.every(selector => 
                // ensure a property exists
                (selector.value === undefined && objCommon[selector.attr] !== undefined) ||
                    // or match exact values
                    looselyEqualsString(objCommon[selector.attr], selector.value));
            }
            /**
             * Applies all selectors targeting the Object native properties
             *
             * @param objId - The ID of the object in question
             */
            function applyNativeSelectors(objId) {
                const obj = objects[objId];
                if (!obj || !obj.native) {
                    return false;
                }
                const objNative = obj.native;
                // make sure this object satisfies all selectors
                return nativeSelectors.every(selector => 
                // ensure a property exists
                (selector.value === undefined && objNative[selector.attr] !== undefined) ||
                    // or match exact values
                    looselyEqualsString(objNative[selector.attr], selector.value));
            }
            /**
             * Applies all selectors targeting the Objects enums
             *
             * @param objId - The ID of the object in question
             */
            function applyEnumSelectors(objId) {
                const enumIds = [];
                eventObj.getObjectEnumsSync(context, objId, enumIds);
                // make sure this object satisfies all selectors
                return enumSelectors.every(_enum => enumIds.includes(_enum));
            }
            let res;
            if (name === 'schedule') {
                res = context.schedules || [];
                if (objectIdSelectors.length) {
                    res = res.filter(channelId => applyIDSelectors(channelId, objectIdSelectors));
                }
                // filter out those that don't match every common selector
                if (commonSelectors.length) {
                    res = res.filter(id => applyCommonSelectors(id));
                }
                // filter out those that don't match every native selector
                if (nativeSelectors.length) {
                    res = res.filter(id => applyNativeSelectors(id));
                }
                // filter out those that don't match every enum selector
                if (enumSelectors.length) {
                    res = res.filter(channelId => applyEnumSelectors(channelId));
                }
            }
            else if (name === 'channel') {
                if (!context.channels) {
                    // TODO: fill the channels and maintain them on all places where context.stateIds will be changed
                }
                const channels = context.channels || {};
                // go through all channels
                res = Object.keys(channels);
                // filter out those that don't match every ID selector for the channel ID
                if (objectIdSelectors.length) {
                    res = res.filter(channelId => applyIDSelectors(channelId, objectIdSelectors));
                }
                // filter out those that don't match every common selector
                if (commonSelectors.length) {
                    res = res.filter(channelId => applyCommonSelectors(channelId));
                }
                // filter out those that don't match every native selector
                if (nativeSelectors.length) {
                    res = res.filter(channelId => applyNativeSelectors(channelId));
                }
                // filter out those that don't match every enum selector
                if (enumSelectors.length) {
                    res = res.filter(channelId => applyEnumSelectors(channelId));
                }
                // retrieve the state ID collection for all remaining channels
                res = res
                    .map(id => [...(channels[id] || [])])
                    // and flatten the array to get only the state IDs
                    .reduce((acc, next) => acc.concat(next), []);
                // now filter out those that don't match every ID selector for the state ID
                if (stateIdSelectors.length) {
                    res = res.filter(stateId => applyIDSelectors(stateId, stateIdSelectors));
                }
            }
            else if (name === 'device') {
                if (!context.devices) {
                    // TODO: fill the devices and maintain them on all places where context.stateIds will be changed
                }
                const devices = context.devices || {};
                // go through all devices
                res = Object.keys(devices);
                // filter out those that don't match every ID selector for the channel ID
                if (objectIdSelectors.length) {
                    res = res.filter(deviceId => applyIDSelectors(deviceId, objectIdSelectors));
                }
                // filter out those that don't match every common selector
                if (commonSelectors.length) {
                    res = res.filter(deviceId => applyCommonSelectors(deviceId));
                }
                // filter out those that don't match every native selector
                if (nativeSelectors.length) {
                    res = res.filter(deviceId => applyNativeSelectors(deviceId));
                }
                // filter out those that don't match every enum selector
                if (enumSelectors.length) {
                    res = res.filter(deviceId => applyEnumSelectors(deviceId));
                }
                // retrieve the state ID collection for all remaining devices
                res = res
                    .map(id => [...(devices[id] || [])])
                    // and flatten the array to get only the state IDs
                    .reduce((acc, next) => acc.concat(next), []);
                // now filter out those that don't match every ID selector for the state ID
                if (stateIdSelectors.length) {
                    res = res.filter(stateId => applyIDSelectors(stateId, stateIdSelectors));
                }
            }
            else {
                // go through all states
                res = context.stateIds;
                // if the "name" is not state, then we filter for the ID as well
                if (name && name !== 'state') {
                    const r = new RegExp(`^${name.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`);
                    res = res.filter(id => r.test(id));
                }
                // filter out those that don't match every ID selector for the object ID or the state ID
                if (objectIdSelectors.length) {
                    res = res.filter(id => applyIDSelectors(id, objectIdSelectors));
                }
                // filter out those that don't match every ID selector for the state ID
                if (stateIdSelectors.length) {
                    res = res.filter(id => applyIDSelectors(id, stateIdSelectors));
                }
                // filter out those that don't match every common selector
                if (commonSelectors.length) {
                    res = res.filter(id => applyCommonSelectors(id));
                }
                // filter out those that don't match every native selector
                if (nativeSelectors.length) {
                    res = res.filter(id => applyNativeSelectors(id));
                }
                // filter out those that don't match every enum selector
                if (enumSelectors.length) {
                    res = res.filter(id => applyEnumSelectors(id));
                }
            }
            // IO-2: O(1) deduplication via Set instead of O(n²) resUnique.includes()
            const resUnique = [...new Set(res)];
            for (let i = 0; i < resUnique.length; i++) {
                result[i] = resUnique[i];
            }
            result.length = resUnique.length;
            // Implementing the Symbol.iterator contract makes the query result iterable
            result[Symbol.iterator] = function* () {
                for (let i = 0; i < result.length; i++) {
                    yield result[i];
                }
            };
            result.toArray = function () {
                return [...resUnique];
            };
            result.each = function (callback) {
                if (typeof callback === 'function') {
                    let r;
                    for (let i = 0; i < this.length; i++) {
                        r = callback(result[i], i);
                        if (r === false) {
                            break;
                        }
                    }
                }
                return this;
            };
            // @ts-expect-error fix later
            result.getState = function (callback) {
                if (adapter.config.subscribe) {
                    if (typeof callback !== 'function') {
                        sandbox.log('You cannot use this function synchronous', 'error');
                    }
                    else {
                        void adapter.getForeignState(this[0], (err, state) => {
                            void callback(err, context.convertBackStringifiedValues(this[0], state));
                        });
                    }
                }
                else {
                    if (!this[0]) {
                        return null;
                    }
                    if (context.interimStateValues[this[0]] !== undefined) {
                        return context.convertBackStringifiedValues(this[0], context.interimStateValues[this[0]]);
                    }
                    return context.convertBackStringifiedValues(this[0], states[this[0]]);
                }
            };
            result.getStateAsync = async function () {
                if (adapter.config.subscribe) {
                    const state = await adapter.getForeignStateAsync(this[0]);
                    return context.convertBackStringifiedValues(this[0], state);
                }
                if (!this[0]) {
                    return null;
                }
                if (context.interimStateValues[this[0]] !== undefined) {
                    return context.convertBackStringifiedValues(this[0], context.interimStateValues[this[0]]);
                }
                return context.convertBackStringifiedValues(this[0], states[this[0]]);
            };
            result.setState = function (state, isAck, callback) {
                if (typeof isAck === 'function') {
                    callback = isAck;
                    isAck = undefined;
                }
                void result
                    .setStateAsync(state, isAck)
                    .then(() => typeof callback === 'function' && callback());
                return this;
            };
            result.setStateAsync = async function (state, isAck) {
                for (let i = 0; i < this.length; i++) {
                    await sandbox.setStateAsync(this[i], state, isAck);
                }
            };
            result.setStateChanged = function (state, isAck, callback) {
                if (typeof isAck === 'function') {
                    callback = isAck;
                    isAck = undefined;
                }
                void result.setStateChangedAsync(state, isAck).then(() => typeof callback === 'function' && callback());
                return this;
            };
            result.setStateChangedAsync = async function (state, isAck) {
                for (let i = 0; i < this.length; i++) {
                    await sandbox.setStateChangedAsync(this[i], state, isAck);
                }
            };
            result.setStateDelayed = function (state, isAck, delay, clearRunning, callback) {
                if (typeof isAck !== 'boolean') {
                    callback = clearRunning;
                    clearRunning = delay;
                    delay = isAck;
                    isAck = undefined;
                }
                if (typeof delay !== 'number') {
                    callback = clearRunning;
                    clearRunning = delay;
                    delay = 0;
                }
                if (typeof clearRunning !== 'boolean') {
                    callback = clearRunning;
                    clearRunning = true;
                }
                let count = this.length;
                for (let i = 0; i < this.length; i++) {
                    sandbox.setStateDelayed(this[i], state, isAck, delay, clearRunning, () => {
                        if (!--count && typeof callback === 'function') {
                            callback();
                        }
                    });
                }
                return this;
            };
            result.on = function (callbackOrId, value) {
                for (let i = 0; i < this.length; i++) {
                    sandbox.subscribe(this[i], callbackOrId, value);
                }
                return this;
            };
            return result;
        },
        log: function (msg, severity) {
            severity ||= 'info';
            // disable log in log handler (prevent endless loops)
            if (sandbox.logHandler && (sandbox.logHandler === severity || sandbox.logHandler === '*')) {
                return;
            }
            if (!adapter.log[severity]) {
                msg = `Unknown severity level "${severity}" by log of [${msg}]`;
                severity = 'warn';
            }
            if (msg && typeof msg !== 'string') {
                msg = mods.util.format(msg);
            }
            if (logCollector) {
                logCollector(severity, msg);
            }
            else if (debugMode) {
                console.log(`${severity}$$${name}$$${msg}`, Date.now());
            }
            else {
                adapter.log[severity](`${name}: ${msg}`);
            }
        },
        onLog: function (severity, callback) {
            if (!['info', 'error', 'debug', 'silly', 'warn', '*'].includes(severity)) {
                sandbox.log(`Unknown severity "${severity}"`, 'warn');
                return 0;
            }
            if (typeof callback !== 'function') {
                sandbox.log(`Invalid callback for onLog`, 'warn');
                return 0;
            }
            const handler = { id: _handlerIdCounter++, cb: callback, sandbox, severity };
            context.logSubscriptions[sandbox.scriptName] = context.logSubscriptions[sandbox.scriptName] || [];
            context.logSubscriptions[sandbox.scriptName].push(handler);
            context.updateLogSubscriptions();
            sandbox.__engine.__subscriptionsLog += 1;
            if (sandbox.verbose) {
                sandbox.log(`onLog(severity=${severity}, id=${handler.id}) - logSubscriptions=${sandbox.__engine.__subscriptionsLog}`, 'info');
            }
            if (sandbox.__engine.__subscriptionsLog %
                adapter.config.maxTriggersPerScript ===
                0) {
                sandbox.log(`More than ${sandbox.__engine.__subscriptionsLog} log subscriptions registered. Check your script!`, 'warn');
            }
            return handler.id;
        },
        onLogUnregister: function (idOrCallbackOrSeverity) {
            let found = false;
            if (context.logSubscriptions?.[sandbox.scriptName]) {
                if (sandbox.verbose) {
                    sandbox.log(`onLogUnregister(idOrCallbackOrSeverity=${JSON.stringify(idOrCallbackOrSeverity)}) - logSubscriptions=${sandbox.__engine.__subscriptionsLog}`, 'info');
                }
                for (let i = 0; i < context.logSubscriptions[sandbox.scriptName].length; i++) {
                    if (context.logSubscriptions[sandbox.scriptName][i].cb === idOrCallbackOrSeverity ||
                        context.logSubscriptions[sandbox.scriptName][i].id === idOrCallbackOrSeverity ||
                        context.logSubscriptions[sandbox.scriptName][i].severity === idOrCallbackOrSeverity) {
                        if (sandbox.verbose) {
                            sandbox.log(`onLogUnregister(idOrCallbackOrSeverity=${JSON.stringify(idOrCallbackOrSeverity)}, removing id=${context.logSubscriptions[sandbox.scriptName][i].id})`, 'info');
                        }
                        context.logSubscriptions[sandbox.scriptName].splice(i, 1);
                        i--;
                        sandbox.__engine.__subscriptionsLog--;
                        found = true;
                        // if deletion via ID
                        if (typeof idOrCallbackOrSeverity === 'number') {
                            break;
                        }
                    }
                    else if (sandbox.verbose) {
                        sandbox.log(`onLogUnregister(idOrCallbackOrSeverity=${JSON.stringify(idOrCallbackOrSeverity)}) NOT = ${JSON.stringify(context.logSubscriptions[sandbox.scriptName][i])}`, 'info');
                    }
                }
            }
            context.updateLogSubscriptions();
            return found;
        },
        exec: function (cmd, options, callback) {
            if (typeof options === 'function') {
                callback = options;
                options = {};
            }
            if (!adapter.config.enableExec) {
                const error = 'exec is not available. Please enable "Enable Exec" option in instance settings';
                sandbox.log(error, 'error');
                if (typeof callback === 'function') {
                    setImmediate(callback, error, undefined, undefined);
                }
            }
            else {
                if (sandbox.verbose) {
                    sandbox.log(`exec(cmd=${cmd})`, 'info');
                }
                if (debug) {
                    sandbox.log(words._('Command %s was not executed, while debug mode is active', cmd), 'warn');
                    if (typeof callback === 'function') {
                        setImmediate(function () {
                            callback(null, '', '');
                        });
                    }
                }
                else {
                    return mods.child_process.exec(cmd, options, (error, stdout, stderr) => {
                        if (typeof callback === 'function') {
                            try {
                                callback.call(sandbox, error, stdout, stderr);
                            }
                            catch (err) {
                                errorInCallback(err);
                            }
                        }
                    });
                }
            }
        },
        email: function (msg) {
            if (sandbox.verbose) {
                sandbox.log(`email(msg=${JSON.stringify(msg)})`, 'info');
            }
            sandbox.log(`email(msg=${JSON.stringify(msg)}) is deprecated. Please use sendTo instead!`, 'warn');
            adapter.sendTo('email', msg);
        },
        pushover: function (msg) {
            if (sandbox.verbose) {
                sandbox.log(`pushover(msg=${JSON.stringify(msg)})`, 'info');
            }
            sandbox.log(`pushover(msg=${JSON.stringify(msg)}) is deprecated. Please use sendTo instead!`, 'warn');
            adapter.sendTo('pushover', msg);
        },
        httpGet: function (url, options, callback) {
            if (typeof options === 'function') {
                callback = options;
                options = {};
            }
            const config = {
                ...(0, tools_1.getHttpRequestConfig)(url, options, context.allowSelfSignedCerts),
                method: 'get',
            };
            if (sandbox.verbose) {
                sandbox.log(`httpGet(config=${JSON.stringify(config)})`, 'info');
            }
            const startTime = Date.now();
            mods.axios
                .default(config)
                .then((response) => {
                const responseTime = Date.now() - startTime;
                if (sandbox.verbose) {
                    sandbox.log(`httpGet(url=${url}, responseTime=${responseTime}ms)`, 'info');
                }
                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, null, {
                            statusCode: response.status,
                            data: response.data,
                            headers: response.headers,
                            responseTime,
                        });
                    }
                    catch (err) {
                        errorInCallback(err);
                    }
                }
            })
                .catch((error) => {
                const responseTime = Date.now() - startTime;
                sandbox.log(`httpGet(url=${url}, error=${error.message})`, 'error');
                if (typeof callback === 'function') {
                    let result = {
                        statusCode: null,
                        data: null,
                        headers: {},
                        responseTime,
                    };
                    if (error.response) {
                        result = {
                            statusCode: error.response.status,
                            data: error.response.data,
                            headers: error.response.headers,
                            responseTime,
                        };
                    }
                    try {
                        callback.call(sandbox, error.message, result);
                    }
                    catch (err) {
                        errorInCallback(err);
                    }
                }
            });
        },
        httpPost: function (url, data, options, callback) {
            if (typeof options === 'function') {
                callback = options;
                options = {};
            }
            const config = {
                ...(0, tools_1.getHttpRequestConfig)(url, options, context.allowSelfSignedCerts),
                method: 'post',
                data,
            };
            if (sandbox.verbose) {
                sandbox.log(`httpPost(config=${JSON.stringify(config)}, data=${data})`, 'info');
            }
            const startTime = Date.now();
            mods.axios
                .default(config)
                .then((response) => {
                const responseTime = Date.now() - startTime;
                if (sandbox.verbose) {
                    sandbox.log(`httpPost(url=${url}, responseTime=${responseTime}ms)`, 'info');
                }
                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, null, {
                            statusCode: response.status,
                            data: response.data,
                            headers: response.headers,
                            responseTime,
                        });
                    }
                    catch (err) {
                        errorInCallback(err);
                    }
                }
            })
                .catch((error) => {
                const responseTime = Date.now() - startTime;
                sandbox.log(`httpPost(url=${url}, error=${error.message})`, 'error');
                if (typeof callback === 'function') {
                    let result = {
                        statusCode: null,
                        data: null,
                        headers: {},
                        responseTime,
                    };
                    const response = error.response;
                    if (response) {
                        result = {
                            statusCode: response.status,
                            data: response.data,
                            headers: response.headers,
                            responseTime,
                        };
                    }
                    try {
                        callback.call(sandbox, new Error(error.message), result);
                    }
                    catch (err) {
                        errorInCallback(err);
                    }
                }
            });
        },
        createTempFile: function (fileName, data) {
            const os = mods.os;
            const path = mods.path;
            const fs = mods.fs;
            let tempDirPath = context.tempDirectories?.[sandbox.scriptName];
            if (!tempDirPath) {
                // create temp directory
                tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), `${sandbox.scriptName.substring(SCRIPT_CODE_MARKER.length)}-`));
                context.tempDirectories[sandbox.scriptName] = tempDirPath;
                if (sandbox.verbose) {
                    sandbox.log(`createTempFile(fileName=${fileName}, tempDirPath=${tempDirPath}) created temp directory in ${os.tmpdir()}`, 'info');
                }
            }
            const filePath = path.join(tempDirPath, fileName);
            // is sub dir?
            const fileDir = path.dirname(filePath);
            if (!fs.existsSync(fileDir)) {
                fs.mkdirSync(fileDir, { recursive: true });
            }
            if (typeof data === 'undefined') {
                sandbox.log(`createTempFile(fileName=${fileName}, fileDir=${fileDir}, filePath=${filePath}) data is undefined, file not created!`, 'error');
                return undefined;
            }
            fs.writeFileSync(filePath, data);
            if (sandbox.verbose) {
                sandbox.log(`createTempFile(fileName=${fileName}, fileDir=${fileDir}, filePath=${filePath})`, 'info');
            }
            return filePath;
        },
        subscribe: function (pattern, 
        // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
        callbackOrChangeTypeOrId, value) {
            // If a schedule object is given
            if ((typeof pattern === 'string' && pattern[0] === '{') ||
                (typeof pattern === 'object' && pattern.period)) {
                return sandbox.schedule(pattern, callbackOrChangeTypeOrId);
            }
            // If an array of schedules is given
            if (pattern && Array.isArray(pattern)) {
                const result = [];
                for (const p of pattern) {
                    result.push(sandbox.subscribe(p, callbackOrChangeTypeOrId, value));
                }
                return result;
            }
            // detect subscribe('id', 'any', (obj) => {})
            let oPattern;
            if ((typeof pattern === 'string' || pattern instanceof RegExp) &&
                typeof callbackOrChangeTypeOrId === 'string' &&
                typeof value === 'function') {
                oPattern = { id: pattern, change: callbackOrChangeTypeOrId };
                callbackOrChangeTypeOrId = value;
                value = undefined;
            }
            else {
                oPattern = pattern;
            }
            if (oPattern?.id && Array.isArray(oPattern.id)) {
                const result = [];
                for (let t = 0; t < oPattern.id.length; t++) {
                    // IO-4: Spread instead of JSON.parse(JSON.stringify()) – no deep clone needed (only primitive fields)
                    const pa = { ...oPattern, id: oPattern.id[t] };
                    result.push(sandbox.subscribe(pa, callbackOrChangeTypeOrId, value));
                }
                return result;
            }
            // try to detect astro or cron (by spaces)
            if ((0, tools_1.isObject)(pattern) || (typeof pattern === 'string' && pattern.match(/[,/\d*]+\s[,/\d*]+\s[,/\d*]+/))) {
                if (pattern.astro) {
                    return sandbox.schedule(pattern, callbackOrChangeTypeOrId);
                }
                else if (pattern.time) {
                    return sandbox.schedule(pattern.time, callbackOrChangeTypeOrId);
                }
            }
            let callback;
            // source is set by regexp if defined as /regexp/
            if (!(0, tools_1.isObject)(pattern) || pattern instanceof RegExp || pattern.source) {
                oPattern = { id: pattern, change: 'ne' };
            }
            if (oPattern.id !== undefined && !oPattern.id) {
                sandbox.log(`Error by subscription (trigger): empty ID defined. All states matched.`, 'error');
                return;
            }
            else if (typeof oPattern.id === 'boolean' || typeof oPattern.id === 'number') {
                sandbox.log(`Error by subscription (trigger): Wrong ID of type boolean or number.`, 'error');
                return;
            }
            sandbox.__engine.__subscriptions += 1;
            if (sandbox.__engine.__subscriptions % adapter.config.maxTriggersPerScript ===
                0) {
                sandbox.log(`More than ${sandbox.__engine.__subscriptions} subscriptions registered. Check your script!`, 'warn');
            }
            if (oPattern.q === undefined) {
                oPattern.q = 0;
            }
            // add adapter namespace if nothing given
            if (oPattern.id && typeof oPattern.id === 'string' && !oPattern.id.includes('.')) {
                oPattern.id = `${adapter.namespace}.${oPattern.id}`;
            }
            if (typeof callbackOrChangeTypeOrId === 'function') {
                callback = callbackOrChangeTypeOrId;
            }
            else {
                if (typeof value === 'undefined') {
                    callback = function (obj) {
                        sandbox.setState(callbackOrChangeTypeOrId, obj.newState.val);
                    };
                }
                else {
                    callback = function ( /* obj */) {
                        sandbox.setState(callbackOrChangeTypeOrId, value);
                    };
                }
            }
            const subs = {
                pattern: oPattern,
                callback: (obj) => {
                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, obj);
                        }
                        catch (err) {
                            errorInCallback(err);
                        }
                    }
                },
                name,
            };
            // try to extract adapter
            if (oPattern.id && typeof oPattern.id === 'string') {
                const parts = oPattern.id.split('.');
                const a = `${parts[0]}.${parts[1]}`;
                const _adapter = `system.adapter.${a}`;
                if (objects[_adapter] && objects[_adapter].common && objects[_adapter].common.subscribable) {
                    const alive = `system.adapter.${a}.alive`;
                    context.adapterSubs[alive] = context.adapterSubs[alive] || new Set();
                    // Set.has() is O(1) and automatically prevents duplicates
                    const subExists = context.adapterSubs[alive].has(oPattern.id);
                    if (!subExists) {
                        context.adapterSubs[alive].add(oPattern.id);
                        adapter.sendTo(a, 'subscribe', oPattern.id);
                    }
                }
            }
            if (sandbox.verbose) {
                sandbox.log(`subscribe: ${JSON.stringify(subs)}`, 'info');
            }
            subscribePattern(script, oPattern.id);
            subs.patternCompareFunctions = getPatternCompareFunctions(oPattern);
            context.subscriptions.push(subs);
            // O(1) dispatch index: exact string IDs go into the map, everything else into the wildcard array
            if (isExactId(oPattern.id)) {
                if (!context.subscriptionsMap.has(oPattern.id)) {
                    context.subscriptionsMap.set(oPattern.id, []);
                }
                context.subscriptionsMap.get(oPattern.id).push(subs);
            }
            else {
                context.subscriptionsWildcard.push(subs);
            }
            if (oPattern.enumName || oPattern.enumId) {
                context.isEnums = true;
            }
            return subs;
        },
        getSubscriptions: function () {
            const result = {};
            // Iterate over the O(1) dispatch index instead of the flat array
            for (const [id, bucket] of context.subscriptionsMap) {
                result[id] = bucket.map(s => ({ name: s.name, pattern: s.pattern }));
            }
            for (const s of context.subscriptionsWildcard) {
                const key = s.pattern.id;
                (result[key] ??= []).push({ name: s.name, pattern: s.pattern });
            }
            if (sandbox.verbose) {
                sandbox.log(`getSubscriptions() => ${JSON.stringify(result)}`, 'info');
            }
            return result;
        },
        getFileSubscriptions: function () {
            const result = {};
            for (let s = 0; s < context.subscriptionsFile.length; s++) {
                const key = `${context.subscriptionsFile[s].id}$%$${context.subscriptionsFile[s].fileNamePattern}`;
                result[key] = result[key] || [];
                result[key].push({
                    name: context.subscriptionsFile[s].name,
                    id: context.subscriptionsFile[s].id,
                    fileNamePattern: context.subscriptionsFile[s].fileNamePattern,
                });
            }
            if (sandbox.verbose) {
                sandbox.log(`getFileSubscriptions() => ${JSON.stringify(result)}`, 'info');
            }
            return result;
        },
        adapterSubscribe: function (id) {
            if (typeof id !== 'string') {
                sandbox.log(`adapterSubscribe: invalid type of id ${typeof id}`, 'error');
                return;
            }
            const parts = id.split('.');
            const _adapter = `system.adapter.${parts[0]}.${parts[1]}`;
            if (objects[_adapter]?.common?.subscribable) {
                const a = `${parts[0]}.${parts[1]}`;
                const alive = `system.adapter.${a}.alive`;
                context.adapterSubs[alive] = context.adapterSubs[alive] || new Set();
                context.adapterSubs[alive].add(id);
                if (sandbox.verbose) {
                    sandbox.log(`adapterSubscribe: ${a} - ${id}`, 'info');
                }
                adapter.sendTo(a, 'subscribe', id);
            }
        },
        adapterUnsubscribe: function (idOrObject) {
            // todo: BF - it could be an error
            return sandbox.unsubscribe(idOrObject);
        },
        unsubscribe: function (idOrObject) {
            if (idOrObject && Array.isArray(idOrObject)) {
                const result = [];
                for (let t = 0; t < idOrObject.length; t++) {
                    result.push(sandbox.unsubscribe(idOrObject[t]));
                }
                return result;
            }
            if (sandbox.verbose) {
                sandbox.log(`adapterUnsubscribe(id=${JSON.stringify(idOrObject)})`, 'info');
            }
            if ((0, tools_1.isObject)(idOrObject)) {
                for (let i = context.subscriptions.length - 1; i >= 0; i--) {
                    if (context.subscriptions[i] === idOrObject) {
                        const sub = context.subscriptions[i];
                        unsubscribePattern(script, sub.pattern.id);
                        context.subscriptions.splice(i, 1);
                        // Remove from O(1) dispatch structures
                        removeFromDispatchIndex(context, sub);
                        sandbox.__engine.__subscriptions--;
                        return true;
                    }
                }
                return false;
            }
            let deleted = 0;
            for (let i = context.subscriptions.length - 1; i >= 0; i--) {
                if (context.subscriptions[i].name === name && context.subscriptions[i].pattern.id === idOrObject) {
                    deleted++;
                    const sub = context.subscriptions[i];
                    unsubscribePattern(script, sub.pattern.id);
                    context.subscriptions.splice(i, 1);
                    // Remove from O(1) dispatch structures
                    removeFromDispatchIndex(context, sub);
                    sandbox.__engine.__subscriptions--;
                }
            }
            return !!deleted;
        },
        on: function (pattern, 
        // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
        callbackOrChangeTypeOrId, value) {
            return sandbox.subscribe(pattern, callbackOrChangeTypeOrId, value);
        },
        onEnumMembers: function (enumId, callback) {
            if (enums.has(enumId)) {
                const subscriptions = {};
                const init = () => {
                    const obj = objects[enumId];
                    const common = obj?.common ?? {};
                    const members = common?.members ?? [];
                    // Remove old subscriptions
                    for (const [objId, subscription] of Object.entries(subscriptions)) {
                        if (!members.includes(objId)) {
                            sandbox.unsubscribe(subscription);
                            delete subscriptions[objId];
                        }
                    }
                    // Subscribe to all members of enum
                    for (const objId of members) {
                        // IO-6: `in` operator instead of Object.keys().includes() – O(1) instead of O(n)
                        if (!(objId in subscriptions)) {
                            if (objects?.[objId]?.type === 'state') {
                                // Just subscribe to states
                                subscriptions[objId] = sandbox.subscribe(objId, callback); // TODO: more features
                            }
                        }
                    }
                    if (sandbox.verbose) {
                        sandbox.log(`onEnumMembers(id=${enumId}, members=${JSON.stringify(Object.keys(subscriptions))})`, 'info');
                    }
                };
                init();
                sandbox.subscribeObject(enumId, obj => obj && init());
            }
            else {
                sandbox.log(`onEnumMembers: enum with id "${enumId}" doesn't exists`, 'error');
            }
        },
        onFile: function (id, fileNamePattern, withFileOrCallback, callback) {
            if (typeof withFileOrCallback === 'function') {
                callback = withFileOrCallback;
                withFileOrCallback = false;
            }
            if (!adapter.subscribeForeignFiles) {
                sandbox.log('onFile: your js-controller does not support yet onFile subscribes. Please update to js-controller@4.1.x or newer', 'warn');
                return;
            }
            if (!id || !fileNamePattern) {
                sandbox.log('onFile: invalid parameters. Usage: onFile("vis.0", "main/*", true, (id, fileName, size, file, mimeType) => {});', 'error');
                return;
            }
            if (typeof callback !== 'function') {
                sandbox.offFile(id, fileNamePattern);
                return;
            }
            if (Array.isArray(fileNamePattern)) {
                return fileNamePattern.map(filePattern => sandbox.onFile(id, filePattern, withFileOrCallback, callback));
            }
            sandbox.__engine.__subscriptionsFile += 1;
            if (sandbox.verbose) {
                sandbox.log(`onFile(id=${id}, fileNamePattern=${fileNamePattern}) - fileSubscriptions=${sandbox.__engine.__subscriptionsFile}`, 'info');
            }
            if (sandbox.__engine.__subscriptionsFile %
                adapter.config.maxTriggersPerScript ===
                0) {
                sandbox.log(`More than ${sandbox.__engine.__subscriptionsFile} file subscriptions registered. Check your script!`, 'warn');
            }
            let idRegEx;
            let fileRegEx;
            if (id.includes('*')) {
                idRegEx = new RegExp(pattern2RegEx(id));
            }
            if (fileNamePattern.includes('*')) {
                fileRegEx = new RegExp(pattern2RegEx(fileNamePattern));
            }
            const subs = {
                id,
                fileNamePattern,
                withFile: withFileOrCallback,
                idRegEx,
                fileRegEx,
                callback: (id, fileName, size, withFile) => {
                    try {
                        if (sandbox.verbose) {
                            sandbox.log(`onFile changed(id=${id}, fileName=${fileName}, size=${size})`, 'info');
                        }
                        if (withFile && (size || 0) > 0) {
                            adapter
                                .readFileAsync(id, fileName)
                                .then(data => {
                                try {
                                    callback.call(sandbox, id, fileName, size, data.file, data.mimeType);
                                }
                                catch (err) {
                                    errorInCallback(err);
                                }
                            })
                                .catch(error => errorInCallback(error));
                        }
                        else {
                            callback.call(sandbox, id, fileName, size);
                        }
                    }
                    catch (err) {
                        errorInCallback(err);
                    }
                },
                name,
            };
            context.subscriptionsFile.push(subs);
            subscribeFile(script, id, fileNamePattern);
            return subs;
        },
        offFile: function (idOrObject, fileNamePattern) {
            if (!adapter.unsubscribeForeignFiles) {
                sandbox.log('offFile: your js-controller does not support yet file unsubscribes. Please update to js-controller@4.1.x or newer', 'warn');
                return false;
            }
            if (sandbox.verbose) {
                sandbox.log(`offFile(idOrObject=${JSON.stringify(idOrObject)}, fileNamePattern=${JSON.stringify(fileNamePattern)}) - fileSubscriptions=${sandbox.__engine.__subscriptionsFile}`, 'info');
            }
            if (idOrObject && typeof idOrObject === 'object') {
                if (Array.isArray(idOrObject)) {
                    const result = [];
                    for (let t = 0; t < idOrObject.length; t++) {
                        result.push(sandbox.offFile(idOrObject[t]));
                    }
                    return result;
                }
                for (let i = context.subscriptionsFile.length - 1; i >= 0; i--) {
                    if (context.subscriptionsFile[i] === idOrObject) {
                        unsubscribeFile(script, context.subscriptionsFile[i].id, context.subscriptionsFile[i].fileNamePattern);
                        if (sandbox.verbose) {
                            sandbox.log(`offFile(type=object, fileNamePattern=${JSON.stringify(fileNamePattern)}, removing id=${context.subscriptionsFile[i].id})`, 'info');
                        }
                        context.subscriptionsFile.splice(i, 1);
                        sandbox.__engine.__subscriptionsFile--;
                        return true;
                    }
                }
                return false;
            }
            if (fileNamePattern && Array.isArray(fileNamePattern)) {
                const result = [];
                for (let t = 0; t < fileNamePattern.length; t++) {
                    result.push(sandbox.offFile(idOrObject, fileNamePattern[t]));
                }
                return result;
            }
            let deleted = 0;
            for (let i = context.subscriptionsFile.length - 1; i >= 0; i--) {
                if (context.subscriptionsFile[i].id === idOrObject &&
                    context.subscriptionsFile[i].fileNamePattern === fileNamePattern) {
                    deleted++;
                    unsubscribeFile(script, context.subscriptionsFile[i].id, context.subscriptionsFile[i].fileNamePattern);
                    if (sandbox.verbose) {
                        sandbox.log(`offFile(type=string, fileNamePattern=${fileNamePattern}, removing id=${context.subscriptionsFile[i].id})`, 'info');
                    }
                    context.subscriptionsFile.splice(i, 1);
                    sandbox.__engine.__subscriptionsFile--;
                }
            }
            return !!deleted;
        },
        /** Registers a one-time subscription which automatically unsubscribes after the first invocation */
        once: function (pattern, callback) {
            function _once(cb) {
                // eslint-disable-next-line prefer-const
                let subscription;
                const handler = (obj) => {
                    subscription && sandbox.unsubscribe(subscription);
                    typeof cb === 'function' && cb(obj);
                };
                subscription = sandbox.subscribe(pattern, handler);
                return subscription;
            }
            if (typeof callback === 'function') {
                // Callback-style: once("id", (obj) => { ... })
                return _once(callback);
            }
            // Promise-style: once("id").then(obj => { ... })
            return new Promise(resolve => _once(resolve));
        },
        schedule: function (pattern, callback) {
            if (typeof callback !== 'function') {
                sandbox.log(`schedule callback missing`, 'error');
                return null;
            }
            if ((typeof pattern === 'string' && pattern[0] === '{') ||
                (typeof pattern === 'object' && pattern.period)) {
                if (sandbox.verbose) {
                    sandbox.log(`schedule(wizard=${typeof pattern === 'object' ? JSON.stringify(pattern) : pattern})`, 'info');
                }
                if (!context.scheduler) {
                    sandbox.log(`Cannot schedule "${typeof pattern === 'object' ? JSON.stringify(pattern) : pattern}" because scheduler is not available`, 'error');
                    return null;
                }
                const schedule = context.scheduler.add(pattern, sandbox.scriptName, callback);
                if (schedule) {
                    script.wizards.push(schedule);
                    sandbox.__engine.__schedules += 1;
                    if (sandbox.__engine.__schedules %
                        adapter.config.maxTriggersPerScript ===
                        0) {
                        sandbox.log(`More than ${sandbox.__engine.__schedules} schedules registered. Check your script!`, 'warn');
                    }
                }
                return schedule;
            }
            const adapterConfig = adapter.config;
            if (typeof pattern === 'object' && pattern.astro) {
                const astroPattern = pattern;
                const nowDate = new Date();
                if (adapterConfig.latitude === undefined ||
                    adapterConfig.longitude === undefined ||
                    adapterConfig.latitude === null ||
                    adapterConfig.longitude === null) {
                    sandbox.log('Longitude or latitude does not set. Cannot use astro.', 'error');
                    return null;
                }
                // ensure events are calculated independent of current time
                // TODO: use getAstroStartOfDay of adapter?
                const todayNoon = new Date(nowDate);
                todayNoon.setHours(12, 0, 0, 0);
                let ts = mods.suncalc.getTimes(todayNoon, adapterConfig.latitude, adapterConfig.longitude)[astroPattern.astro];
                // event on the next day, correct or force recalculation at midnight
                if (todayNoon.getDate() !== ts.getDate()) {
                    todayNoon.setDate(todayNoon.getDate() - 1);
                    ts = mods.suncalc.getTimes(todayNoon, adapterConfig.latitude, adapterConfig.longitude)[astroPattern.astro];
                }
                if (ts.getTime().toString() === 'NaN') {
                    sandbox.log(`Cannot calculate "${astroPattern.astro}" for ${adapterConfig.latitude}, ${adapterConfig.longitude}`, 'warn');
                    ts = new Date(nowDate.getTime());
                    if (astroPattern.astro === 'sunriseEnd' ||
                        astroPattern.astro === 'goldenHourEnd' ||
                        astroPattern.astro === 'sunset' ||
                        astroPattern.astro === 'nightEnd' ||
                        astroPattern.astro === 'nauticalDusk') {
                        ts.setHours(23);
                        ts.setMinutes(59);
                        ts.setSeconds(59);
                    }
                    else {
                        ts.setHours(23);
                        ts.setMinutes(59);
                        ts.setSeconds(58);
                    }
                }
                if (ts && astroPattern.shift) {
                    ts = new Date(ts.getTime() + astroPattern.shift * 60000);
                }
                if (!ts || ts < nowDate) {
                    const date = new Date(nowDate);
                    // Event doesn't occur today - try again tomorrow
                    // Calculate time till 24:00 (local, NOT UTC) and set timeout
                    date.setDate(date.getDate() + 1);
                    date.setMinutes(0); // Sometimes timer fires at 23:59:59
                    date.setHours(0);
                    date.setSeconds(1);
                    date.setMilliseconds(0);
                    sandbox.__engine.__schedules += 1;
                    if (sandbox.__engine.__schedules % adapterConfig.maxTriggersPerScript === 0) {
                        sandbox.log(`More than ${sandbox.__engine.__schedules} schedules registered. Check your script!`, 'warn');
                    }
                    if (sandbox.verbose) {
                        sandbox.log(`schedule(astro=${astroPattern.astro}, offset=${astroPattern.shift}) is tomorrow, waiting until ${date.toISOString()}`, 'info');
                    }
                    // Calculate new schedule in the next day
                    sandbox.setTimeout(() => {
                        if (sandbox.__engine.__schedules > 0) {
                            sandbox.__engine.__schedules--;
                        }
                        sandbox.schedule(astroPattern, callback);
                    }, date.getTime() - Date.now());
                    return;
                }
                sandbox.__engine.__schedules += 1;
                if (sandbox.__engine.__schedules % adapterConfig.maxTriggersPerScript === 0) {
                    sandbox.log(`More than ${sandbox.__engine.__schedules} schedules registered. Check your script!`, 'warn');
                }
                sandbox.setTimeout(() => {
                    try {
                        callback.call(sandbox);
                    }
                    catch (err) {
                        errorInCallback(err);
                    }
                    // Reschedule in 2 seconds
                    sandbox.setTimeout(() => {
                        if (sandbox.__engine.__schedules > 0) {
                            sandbox.__engine.__schedules--;
                        }
                        sandbox.schedule(astroPattern, callback);
                    }, 2000);
                }, ts.getTime() - Date.now());
                if (sandbox.verbose) {
                    sandbox.log(`schedule(astro=${astroPattern.astro}, offset=${astroPattern.shift}) is today, waiting until ${ts.toISOString()}`, 'info');
                }
            }
            else {
                // fix a problem with sunday and 7
                if (typeof pattern === 'string') {
                    // this could be a CRON
                    const parts = pattern.replace(/\s+/g, ' ').split(' ');
                    if (parts.length >= 5 && parseInt(parts[5], 10) >= 7) {
                        parts[5] = '0';
                    }
                    pattern = parts.join(' ');
                }
                // created in VM the date object: pattern instanceof Date => false
                // so fix it
                if (typeof pattern === 'object' && pattern.getDate) {
                    pattern = new Date(pattern);
                }
                const schedule = mods.nodeSchedule.scheduleJob(pattern, () => {
                    try {
                        callback.call(sandbox);
                    }
                    catch (err) {
                        errorInCallback(err);
                    }
                });
                if (schedule) {
                    sandbox.__engine.__schedules += 1;
                    if (sandbox.__engine.__schedules %
                        adapter.config.maxTriggersPerScript ===
                        0) {
                        sandbox.log(`More than ${sandbox.__engine.__schedules} schedules registered. Check your script!`, 'warn');
                    }
                    schedule._ioBroker = {
                        type: 'cron',
                        pattern: pattern,
                        scriptName: sandbox.scriptName,
                        id: `cron_${Date.now()}_${Math.round(Math.random() * 100000)}`,
                    };
                    script.schedules.push(schedule);
                }
                else {
                    sandbox.log(`schedule(cron=${JSON.stringify(pattern)}): cannot create schedule`, 'error');
                }
                if (sandbox.verbose) {
                    sandbox.log(`schedule(cron=${JSON.stringify(pattern)})`, 'info');
                }
                return schedule;
            }
        },
        scheduleById: function (id, ack, callback) {
            let scheduleId = null;
            let currentExp = null; // current cron expression
            if (typeof ack === 'function') {
                callback = ack;
                ack = undefined;
            }
            const rhms = /^(2[0-3]|[01]?[0-9]):([0-5]?[0-9]):([0-5]?[0-9])$/; // hh:mm:ss
            const rhm = /^(2[0-3]|[01]?[0-9]):([0-5]?[0-9])$/; // hh:mm
            const init = (time) => {
                if (typeof time === 'string') {
                    let h = undefined;
                    let m = undefined;
                    let s = undefined;
                    let isValid = false;
                    let result = time.match(rhms);
                    if (result) {
                        [, h, m, s] = result.map(v => parseInt(v));
                        isValid = true;
                    }
                    else {
                        result = time.match(rhm);
                        if (result) {
                            [, h, m] = result.map(v => parseInt(v));
                            isValid = true;
                        }
                    }
                    if (isValid) {
                        const cronExp = `${s ?? '0'} ${m ?? '0'} ${h ?? '0'} * * *`;
                        if (cronExp !== currentExp) {
                            if (sandbox.verbose) {
                                sandbox.log(`scheduleById(id=${id}): Init with expression ${cronExp} from ${time}`, 'info');
                            }
                            currentExp = cronExp;
                            if (scheduleId) {
                                sandbox.clearSchedule(scheduleId);
                                scheduleId = null;
                            }
                            scheduleId = sandbox.schedule(cronExp, () => {
                                if (typeof callback === 'function') {
                                    try {
                                        callback.call(sandbox);
                                    }
                                    catch (err) {
                                        errorInCallback(err);
                                    }
                                }
                            });
                        }
                    }
                    else {
                        sandbox.log(`scheduleById(id=${id},time=${time}): cannot create schedule - invalid format (HH:MM:SS or H:M:S required)`, 'error');
                    }
                }
                else {
                    sandbox.log(`scheduleById(id=${id}): cannot create schedule - invalid var type (no string)`, 'error');
                }
            };
            sandbox.getState(id, (err, state) => {
                if (!err && state?.val) {
                    if (sandbox.verbose) {
                        sandbox.log(`scheduleById(id=${id}): Init with value ${state.val}`, 'info');
                    }
                    init(state.val.toString());
                }
            });
            const triggerDef = { id, change: 'any' };
            if (ack !== undefined) {
                triggerDef.ack = ack;
            }
            sandbox.on(triggerDef, obj => {
                if (obj?.state?.val) {
                    if (sandbox.verbose) {
                        sandbox.log(`scheduleById(id=${id}): Update with value ${obj.state.val}`, 'info');
                    }
                    init(obj.state.val.toString());
                }
            });
        },
        getAstroDate: function (pattern, date, offsetMinutes) {
            if (date === undefined) {
                date = new Date();
            }
            if (typeof date === 'number') {
                date = new Date(date);
            }
            else {
                date = new Date(date.getTime());
            }
            if (!consts.astroList.includes(pattern)) {
                const pos = consts.astroListLow.indexOf(pattern.toLowerCase());
                if (pos !== -1) {
                    pattern = consts.astroList[pos];
                }
            }
            if ((!adapter.config.latitude &&
                adapter.config.latitude !== 0) ||
                (!adapter.config.longitude &&
                    adapter.config.longitude !== 0)) {
                sandbox.log('Longitude or latitude does not set. Cannot use astro.', 'error');
                return;
            }
            // ensure events are calculated independent of current time
            date.setHours(12, 0, 0, 0);
            let ts = mods.suncalc.getTimes(date, adapter.config.latitude, adapter.config.longitude)[pattern];
            if (ts === undefined || ts.getTime().toString() === 'NaN') {
                sandbox.log(`Cannot calculate astro date "${pattern}" for ${adapter.config.latitude}, ${adapter.config.longitude}`, 'warn');
            }
            if (sandbox.verbose) {
                sandbox.log(`getAstroDate(pattern=${pattern}, date=${date.toString()}) => ${ts}`, 'info');
            }
            if (offsetMinutes !== undefined) {
                ts = new Date(ts.getTime() + offsetMinutes * 60000);
            }
            return ts;
        },
        isAstroDay: function () {
            const nowDate = new Date();
            const dayBegin = sandbox.getAstroDate('sunrise');
            const dayEnd = sandbox.getAstroDate('sunset');
            if (dayBegin === undefined || dayEnd === undefined) {
                return;
            }
            if (sandbox.verbose) {
                sandbox.log(`isAstroDay() => ${nowDate >= dayBegin && nowDate <= dayEnd}`, 'info');
            }
            return nowDate >= dayBegin && nowDate <= dayEnd;
        },
        clearSchedule: function (schedule) {
            if (context.scheduler?.get(schedule)) {
                if (sandbox.verbose) {
                    sandbox.log('clearSchedule() => wizard cleared', 'info');
                }
                const pos = script.wizards.indexOf(schedule);
                if (pos !== -1) {
                    script.wizards.splice(pos, 1);
                    if (sandbox.__engine.__schedules > 0) {
                        sandbox.__engine.__schedules--;
                    }
                }
                context.scheduler.remove(schedule);
                return true;
            }
            for (let i = 0; i < script.schedules.length; i++) {
                // Support both full IobSchedule objects (with nested _ioBroker) and
                // bare _ioBroker metadata objects as returned by getSchedules()
                const ioBrokerMeta = schedule && typeof schedule === 'object'
                    ? schedule._ioBroker || schedule
                    : undefined;
                if (ioBrokerMeta?.type === 'cron') {
                    if (script.schedules[i]._ioBroker.id === ioBrokerMeta.id) {
                        if (!mods.nodeSchedule.cancelJob(script.schedules[i])) {
                            sandbox.log('Error by canceling scheduled job', 'error');
                        }
                        script.schedules.splice(i, 1);
                        if (sandbox.__engine.__schedules > 0) {
                            sandbox.__engine.__schedules--;
                        }
                        if (sandbox.verbose) {
                            sandbox.log('clearSchedule() => cleared', 'info');
                        }
                        return true;
                    }
                }
                else if (script.schedules[i] === schedule) {
                    if (!mods.nodeSchedule.cancelJob(script.schedules[i])) {
                        sandbox.log('Error by canceling scheduled job', 'error');
                    }
                    script.schedules.splice(i, 1);
                    if (sandbox.__engine.__schedules > 0) {
                        sandbox.__engine.__schedules--;
                    }
                    if (sandbox.verbose) {
                        sandbox.log('clearSchedule() => cleared', 'info');
                    }
                    return true;
                }
            }
            if (sandbox.verbose) {
                sandbox.log('clearSchedule() => invalid handler', 'warn');
            }
            return false;
        },
        getSchedules: function (allScripts) {
            const schedules = context.scheduler?.getList() || [];
            if (allScripts) {
                Object.keys(context.scripts).forEach(name => context.scripts[name].schedules &&
                    // IO-8: Spread instead of JSON.parse(JSON.stringify()) – _ioBroker has only primitive fields
                    context.scripts[name].schedules.forEach(s => schedules.push({ ...s._ioBroker })));
            }
            else {
                script.schedules &&
                    // IO-8: Spread instead of JSON.parse(JSON.stringify())
                    script.schedules.forEach(s => schedules.push({ ...s._ioBroker }));
            }
            return schedules;
        },
        setState: function (id, state, isAck, callback) {
            return setStateHelper(sandbox, false, false, id, state, isAck, callback);
        },
        setStateChanged: function (id, state, isAck, callback) {
            return setStateHelper(sandbox, false, true, id, state, isAck, callback);
        },
        setStateDelayed: function (id, state, isAck, delay, clearRunning, callback) {
            // find arguments
            if (typeof isAck !== 'boolean') {
                callback = clearRunning;
                clearRunning = delay;
                delay = isAck;
                isAck = undefined;
            }
            if (typeof delay !== 'number') {
                callback = clearRunning;
                clearRunning = delay;
                delay = 0;
            }
            if (typeof clearRunning !== 'boolean') {
                callback = clearRunning;
                clearRunning = true;
            }
            // Check a type of state
            if (!objects[id] && objects[`${adapter.namespace}.${id}`]) {
                id = `${adapter.namespace}.${id}`;
            }
            if (sandbox.verbose) {
                sandbox.log(`setStateDelayed(id=${id}, state=${JSON.stringify(state)}, isAck=${isAck}, delay=${delay}, clearRunning=${clearRunning})`, 'info');
            }
            if (clearRunning) {
                if (timers[id]) {
                    if (sandbox.verbose) {
                        sandbox.log(`setStateDelayed: clear ${timers[id].length} running timers`, 'info');
                    }
                    // collect affected scriptNames before deleting
                    const affectedScripts = new Set(timers[id].map(e => e.scriptName));
                    for (let i = 0; i < timers[id].length; i++) {
                        clearTimeout(timers[id][i].t);
                    }
                    delete timers[id];
                    // update timersByScript reverse-index for all affected scripts
                    for (const scriptName of affectedScripts) {
                        const scriptSet = context.timersByScript.get(scriptName);
                        if (scriptSet) {
                            scriptSet.delete(id);
                            if (!scriptSet.size) {
                                context.timersByScript.delete(scriptName);
                            }
                        }
                    }
                }
                else {
                    if (sandbox.verbose) {
                        sandbox.log('setStateDelayed: no running timers', 'info');
                    }
                }
            }
            // If no delay => starts immediately
            if (!delay) {
                sandbox.setState(id, state, isAck, callback);
                return null;
            }
            // If delay
            timers[id] = timers[id] || [];
            // calculate timerId
            context.timerId++;
            if (context.timerId > 0xfffffffe) {
                context.timerId = 0;
            }
            // Start timeout
            const timer = setTimeout(function (_timerId, _id, _state, _isAck) {
                sandbox.setState(_id, _state, _isAck, callback);
                // delete timer handler
                if (timers[_id]) {
                    // optimisation
                    if (timers[_id].length === 1) {
                        const scriptName = timers[_id][0].scriptName;
                        delete timers[_id];
                        // update timersByScript reverse-index
                        const scriptSet = context.timersByScript.get(scriptName);
                        if (scriptSet) {
                            scriptSet.delete(_id);
                            if (!scriptSet.size) {
                                context.timersByScript.delete(scriptName);
                            }
                        }
                    }
                    else {
                        for (let t = 0; t < timers[_id].length; t++) {
                            if (timers[_id][t].id === _timerId) {
                                const scriptName = timers[_id][t].scriptName;
                                timers[_id].splice(t, 1);
                                if (!timers[_id].length) {
                                    delete timers[_id];
                                    // update timersByScript reverse-index
                                    const scriptSet = context.timersByScript.get(scriptName);
                                    if (scriptSet) {
                                        scriptSet.delete(_id);
                                        if (!scriptSet.size) {
                                            context.timersByScript.delete(scriptName);
                                        }
                                    }
                                }
                                break;
                            }
                        }
                    }
                }
            }, delay, context.timerId, id, state, isAck);
            // add timer handler
            timers[id].push({
                t: timer,
                id: context.timerId,
                ts: Date.now(),
                delay: delay,
                val: (0, tools_1.isObject)(state) && state.val !== undefined
                    ? state.val
                    : state,
                ack: (0, tools_1.isObject)(state) &&
                    state.val !== undefined &&
                    state.ack !== undefined
                    ? state.ack
                    : isAck,
                scriptName: name,
            });
            // Keep reverse-index in sync for O(1) cleanup in stopScript
            if (!context.timersByScript.has(name)) {
                context.timersByScript.set(name, new Set());
            }
            context.timersByScript.get(name).add(id);
            return context.timerId;
        },
        clearStateDelayed: function (id, timerId) {
            // Check a type of state
            if (!objects[id] && objects[`${adapter.namespace}.${id}`]) {
                id = `${adapter.namespace}.${id}`;
            }
            if (sandbox.verbose) {
                sandbox.log(`clearStateDelayed(id=${id}, timerId=${timerId})`, 'info');
            }
            if (timers[id]) {
                // collect scriptNames of entries that will be removed
                const removedScripts = new Set();
                for (let i = timers[id].length - 1; i >= 0; i--) {
                    if (timerId === undefined || timers[id][i].id === timerId) {
                        const clearedTimerId = timers[id][i].id;
                        removedScripts.add(timers[id][i].scriptName);
                        clearTimeout(timers[id][i].t);
                        if (timerId !== undefined) {
                            timers[id].splice(i, 1);
                        }
                        if (sandbox.verbose) {
                            sandbox.log(`clearStateDelayed: clear timer ${clearedTimerId}`, 'info');
                        }
                    }
                }
                if (timerId === undefined) {
                    delete timers[id];
                }
                else {
                    if (!timers[id].length) {
                        delete timers[id];
                    }
                }
                // IO-7: keep the timersByScript reverse-index in sync. For every script whose
                // timer(s) we just removed, drop `id` from its set – unless that script still has
                // another timer for this state (other scripts' timers may keep timers[id] alive).
                if (removedScripts.size) {
                    const remaining = timers[id]; // undefined if the whole entry was deleted
                    for (const scriptName of removedScripts) {
                        const stateIds = context.timersByScript.get(scriptName);
                        if (!stateIds) {
                            continue;
                        }
                        if (remaining?.some(e => e.scriptName === scriptName)) {
                            continue;
                        }
                        stateIds.delete(id);
                        if (!stateIds.size) {
                            context.timersByScript.delete(scriptName);
                        }
                    }
                }
                return true;
            }
            return false;
        },
        getStateDelayed: function (id) {
            const now = Date.now();
            if (id) {
                // Check a type of state
                if (!objects[id] && objects[`${adapter.namespace}.${id}`]) {
                    id = `${adapter.namespace}.${id}`;
                }
                // If timerId given
                if (typeof id === 'number') {
                    for (const _id_ in timers) {
                        if (Object.prototype.hasOwnProperty.call(timers, _id_)) {
                            for (let ttt = 0; ttt < timers[_id_].length; ttt++) {
                                if (timers[_id_][ttt].id === id) {
                                    return {
                                        timerId: id,
                                        left: timers[_id_][ttt].delay - (now - timers[_id_][ttt].ts),
                                        delay: timers[_id_][ttt].delay,
                                        val: timers[_id_][ttt].val,
                                        ack: timers[_id_][ttt].ack,
                                    };
                                }
                            }
                        }
                    }
                    return null;
                }
                const result = [];
                if (Object.prototype.hasOwnProperty.call(timers, id) && timers[id] && timers[id].length) {
                    for (let tt = 0; tt < timers[id].length; tt++) {
                        result.push({
                            timerId: timers[id][tt].id,
                            left: timers[id][tt].delay - (now - timers[id][tt].ts),
                            delay: timers[id][tt].delay,
                            val: timers[id][tt].val,
                            ack: timers[id][tt].ack,
                        });
                    }
                }
                return result;
            }
            const result = {};
            for (const _id in timers) {
                if (Object.prototype.hasOwnProperty.call(timers, _id) && timers[_id] && timers[_id].length) {
                    result[_id] = [];
                    for (let t = 0; t < timers[_id].length; t++) {
                        result[_id].push({
                            timerId: timers[_id][t].id,
                            left: timers[_id][t].delay - (now - timers[_id][t].ts),
                            delay: timers[_id][t].delay,
                            val: timers[_id][t].val,
                            ack: timers[_id][t].ack,
                        });
                    }
                }
            }
            return result;
        },
        getStateAsync: async function (id) {
            let state;
            if (id.includes('.')) {
                state = await adapter.getForeignStateAsync(id);
            }
            else {
                state = await adapter.getStateAsync(id);
            }
            return context.convertBackStringifiedValues(id, state);
        },
        setStateAsync: function (id, state, isAck) {
            return new Promise((resolve, reject) => setStateHelper(sandbox, false, false, id, state, isAck, err => (err ? reject(err) : resolve())));
        },
        setStateChangedAsync: function (id, state, isAck) {
            return new Promise((resolve, reject) => setStateHelper(sandbox, false, true, id, state, isAck, err => (err ? reject(err) : resolve())));
        },
        getState: function (id, callback) {
            if (typeof id !== 'string') {
                sandbox.log(`getState has been called with id of type "${typeof id}" but expects a string`, 'error');
                return undefined;
            }
            if (typeof callback === 'function') {
                if (!id.includes('.')) {
                    adapter.getState(id, (err, state) => callback(err, context.convertBackStringifiedValues(id, state)));
                }
                else {
                    void adapter.getForeignState(id, (err, state) => callback(err, context.convertBackStringifiedValues(id, state)));
                }
            }
            else {
                if (adapter.config.subscribe) {
                    sandbox.log('The "getState" method cannot be used synchronously, because the adapter setting "Do not subscribe to all states on start" is enabled.', 'error');
                    sandbox.log(`Please disable that setting or use "getState" with a callback, e.g.: getState('${id}', (err, state) => { ... });`, 'error');
                }
                else {
                    if (states[id]) {
                        if (sandbox.verbose) {
                            sandbox.log(`getState(id=${id}, timerId=${JSON.stringify(timers[id])}) => ${JSON.stringify(states[id])}`, 'info');
                        }
                        if (context.interimStateValues[id] !== undefined) {
                            return context.convertBackStringifiedValues(id, context.interimStateValues[id]);
                        }
                        return context.convertBackStringifiedValues(id, states[id]);
                    }
                    else if (states[`${adapter.namespace}.${id}`]) {
                        if (sandbox.verbose) {
                            sandbox.log(`getState(id=${id}, timerId=${JSON.stringify(timers[id])}) => ${JSON.stringify(states[`${adapter.namespace}.${id}`])}`, 'info');
                        }
                        if (context.interimStateValues[`${adapter.namespace}.${id}`] !== undefined) {
                            return context.convertBackStringifiedValues(id, context.interimStateValues[`${adapter.namespace}.${id}`]);
                        }
                        return context.convertBackStringifiedValues(id, states[`${adapter.namespace}.${id}`]);
                    }
                    if (sandbox.verbose) {
                        sandbox.log(`getState(id=${id}, timerId=${JSON.stringify(timers[id])}) => not found`, 'info');
                    }
                    context.logWithLineInfo(`getState "${id}" not found (3)${states[id] !== undefined ? ` states[id]=${JSON.stringify(states[id])}` : ''}`); ///xxx
                    return { val: null, notExist: true };
                }
            }
        },
        existsState: function (id, callback) {
            if (typeof id !== 'string') {
                sandbox.log(`existsState has been called with id of type "${typeof id}" but expects a string`, 'error');
                return false;
            }
            if (typeof callback === 'function') {
                void adapter.getForeignObject(id, (err, obj) => {
                    if (!obj || obj.type !== 'state') {
                        callback(err, false);
                        return;
                    }
                    if (adapter.config.subscribe) {
                        void adapter.getForeignState(id, (err, state) => {
                            callback(err, !!state);
                        });
                    }
                    else {
                        callback(err, !!states[id]);
                    }
                });
            }
            else {
                if (adapter.config.subscribe) {
                    sandbox.log('The "existsState" method cannot be used synchronously, because the adapter setting "Do not subscribe to all states on start" is enabled.', 'error');
                    sandbox.log(`Please disable that setting or use "existsState" with a callback, e.g.: existsState('${id}', (err, stateExists) => { ... });`, 'error');
                }
                else {
                    return !!states[id];
                }
            }
        },
        existsObject: function (id, callback) {
            if (typeof id !== 'string') {
                sandbox.log(`existsObject has been called with id of type "${typeof id}" but expects a string`, 'error');
                return false;
            }
            if (typeof callback === 'function') {
                void adapter.getForeignObject(id, (err, obj) => callback(err, !!obj));
            }
            else {
                return !!objects[id];
            }
        },
        getIdByName: function (name, alwaysArray) {
            if (sandbox.verbose) {
                sandbox.log(`getIdByName(name=${name}, alwaysArray=${alwaysArray}) => ${JSON.stringify(context.names[name])}`, 'info');
            }
            if (Object.prototype.hasOwnProperty.call(context.names, name)) {
                if (alwaysArray) {
                    return !Array.isArray(context.names[name]) ? [context.names[name]] : context.names[name];
                }
                return context.names[name];
            }
            if (alwaysArray) {
                return [];
            }
            return null;
        },
        getObject: function (id, enumName, cb) {
            if (typeof id !== 'string') {
                sandbox.log(`getObject has been called with id of type "${typeof id}" but expects a string`, 'error');
                return null;
            }
            if (typeof enumName === 'function') {
                cb = enumName;
                enumName = null;
            }
            // with callback
            if (typeof cb === 'function') {
                void adapter.getForeignObject(id, (err, obj) => {
                    if (obj) {
                        objects[id] = obj;
                    }
                    else if (objects[id]) {
                        delete objects[id];
                    }
                    let result;
                    try {
                        result = objects[id] ? structuredClone(objects[id]) : undefined;
                    }
                    catch (err) {
                        void adapter.setState(`scriptProblem.${name.substring(SCRIPT_CODE_MARKER.length)}`, {
                            val: true,
                            ack: true,
                            c: 'getObject',
                        });
                        sandbox.log(`Object "${id}" can't be copied: ${JSON.stringify(err)}`, 'error');
                        return cb(null, null);
                    }
                    if (sandbox.verbose) {
                        sandbox.log(`getObject(id=${id}, enumName=${enumName}) => ${JSON.stringify(result)}`, 'info');
                    }
                    cb(err, result);
                });
            }
            else {
                if (!objects[id]) {
                    if (sandbox.verbose) {
                        sandbox.log(`getObject(id=${id}, enumName=${enumName}) => does not exist`, 'info');
                    }
                    sandbox.log(`Object "${id}" does not exist`, 'warn');
                    return null;
                }
                if (enumName) {
                    const e = eventObj.getObjectEnumsSync(context, id);
                    const obj = structuredClone(objects[id]);
                    obj.enumIds = structuredClone(e.enumIds);
                    obj.enumNames = structuredClone(e.enumNames);
                    if (typeof enumName === 'string') {
                        const r = new RegExp(`^enum\\.${enumName}\\.`);
                        for (let i = obj.enumIds.length - 1; i >= 0; i--) {
                            if (!r.test(obj.enumIds[i])) {
                                obj.enumIds.splice(i, 1);
                                obj.enumNames.splice(i, 1);
                            }
                        }
                    }
                    if (sandbox.verbose) {
                        sandbox.log(`getObject(id=${id}, enumName=${enumName}) => ${JSON.stringify(obj)}`, 'info');
                    }
                    return obj;
                }
                let result;
                try {
                    result = structuredClone(objects[id]);
                }
                catch (err) {
                    void adapter.setState(`scriptProblem.${name.substring(SCRIPT_CODE_MARKER.length)}`, {
                        val: true,
                        ack: true,
                        c: 'getObject',
                    });
                    sandbox.log(`Object "${id}" can't be copied: ${JSON.stringify(err)}`, 'error');
                    return null;
                }
                if (sandbox.verbose) {
                    sandbox.log(`getObject(id=${id}, enumName=${enumName}) => ${JSON.stringify(result)}`, 'info');
                }
                return result;
            }
        },
        // This function will be overloaded later if the modification of objects is allowed
        setObject: function (_id, _obj, callback) {
            sandbox.log('Function "setObject" is not allowed. Use adapter settings to allow it.', 'error');
            if (typeof callback === 'function') {
                try {
                    callback.call(sandbox, new Error('Function "setObject" is not allowed. Use adapter settings to allow it.'));
                }
                catch (err) {
                    errorInCallback(err);
                }
            }
        },
        // This function will be overloaded later if the modification of objects is allowed
        extendObject: function (_id, _obj, callback) {
            sandbox.log('Function "extendObject" is not allowed. Use adapter settings to allow it.', 'error');
            if (typeof callback === 'function') {
                try {
                    callback.call(sandbox, new Error('Function "extendObject" is not allowed. Use adapter settings to allow it.'));
                }
                catch (err) {
                    errorInCallback(err);
                }
            }
        },
        // This function will be overloaded later if the modification of objects is allowed
        deleteObject: function (_id, _isRecursive, callback) {
            if (typeof _isRecursive === 'function') {
                callback = _isRecursive;
            }
            sandbox.log('Function "deleteObject" is not allowed. Use adapter settings to allow it.', 'error');
            if (typeof callback === 'function') {
                try {
                    callback.call(sandbox, new Error('Function "deleteObject" is not allowed. Use adapter settings to allow it.'));
                }
                catch (err) {
                    errorInCallback(err);
                }
            }
        },
        getEnums: function (enumName) {
            const result = [];
            const r = enumName ? new RegExp(`^enum\\.${enumName}\\.`) : false;
            for (const enumId of enums) {
                if (!r || r.test(enumId)) {
                    const common = objects[enumId].common || {};
                    result.push({
                        id: enumId,
                        members: common.members || [],
                        name: common.name || '',
                    });
                }
            }
            if (sandbox.verbose) {
                sandbox.log(`getEnums(enumName=${enumName}) => ${JSON.stringify(result)}`, 'info');
            }
            return structuredClone(result);
        },
        createAlias: function (name, alias, forceCreation, common, native, callback) {
            if (typeof native === 'function') {
                callback = native;
                native = {};
            }
            if (typeof common === 'function') {
                callback = common;
                common = undefined;
            }
            if (typeof forceCreation === 'function') {
                callback = forceCreation;
                forceCreation = undefined;
            }
            if ((0, tools_1.isObject)(forceCreation)) {
                native = common;
                common = forceCreation;
                forceCreation = undefined;
            }
            if (typeof name !== 'string') {
                const err = `Wrong type of name "${typeof name}". Expected "string".`;
                sandbox.log(err, 'error');
                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, new Error(err));
                    }
                    catch (err) {
                        errorInCallback(err);
                    }
                }
                return;
            }
            if (!name) {
                const err = 'Empty ID is not allowed.';
                sandbox.log(err, 'error');
                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, new Error(err));
                    }
                    catch (err) {
                        errorInCallback(err);
                    }
                }
                return;
            }
            if (!name.startsWith('alias.0.')) {
                name = `alias.0.${name}`;
            }
            const _common = common || {};
            if ((0, tools_1.isObject)(_common.alias)) {
                // alias already in common, use this
            }
            else if ((0, tools_1.isObject)(alias) &&
                (typeof alias.id === 'string' || (0, tools_1.isObject)(alias.id))) {
                _common.alias = alias;
            }
            else if (typeof alias === 'string') {
                _common.alias = { id: alias };
            }
            else {
                const err = 'Source ID needs to be provided as string or object with id property.';
                sandbox.log(err, 'error');
                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, new Error(err));
                    }
                    catch (err) {
                        errorInCallback(err);
                    }
                }
                return;
            }
            let aliasSourceId = '';
            if (_common.alias) {
                aliasSourceId = (0, tools_1.isObject)(_common.alias.id)
                    ? _common.alias.id.read
                    : _common.alias.id;
                if (!objects[aliasSourceId] && objects[`${adapter.namespace}.${aliasSourceId}`]) {
                    aliasSourceId = `${adapter.namespace}.${aliasSourceId}`;
                    if ((0, tools_1.isObject)(_common.alias.id)) {
                        _common.alias.id.read = aliasSourceId;
                    }
                    else {
                        _common.alias.id = aliasSourceId;
                    }
                }
                if ((0, tools_1.isObject)(_common.alias.id) &&
                    _common.alias.id.write &&
                    !objects[_common.alias.id.write] &&
                    objects[`${adapter.namespace}.${_common.alias.id.write}`]) {
                    _common.alias.id.write =
                        `${adapter.namespace}.${_common.alias.id.write}`;
                }
            }
            const obj = objects[aliasSourceId];
            if (!obj) {
                const err = `Alias source object "${aliasSourceId}" does not exist.`;
                sandbox.log(err, 'error');
                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, new Error(err));
                    }
                    catch (err) {
                        errorInCallback(err);
                    }
                }
                return;
            }
            if (obj.type !== 'state') {
                const err = `Alias source object "${aliasSourceId}" must be a state object.`;
                sandbox.log(err, 'error');
                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, new Error(err));
                    }
                    catch (err) {
                        errorInCallback(err);
                    }
                }
                return;
            }
            if (_common.name === undefined) {
                _common.name = obj.common.name || name;
            }
            if (_common.type === undefined && obj.common.type !== undefined) {
                _common.type = obj.common.type;
            }
            if (_common.role === undefined && obj.common.role !== undefined) {
                _common.role = obj.common.role;
            }
            if (_common.min === undefined && obj.common.min !== undefined) {
                _common.min = obj.common.min;
            }
            if (_common.max === undefined && obj.common.max !== undefined) {
                _common.max = obj.common.max;
            }
            if (_common.step === undefined && obj.common.step !== undefined) {
                _common.step = obj.common.step;
            }
            if (_common.unit === undefined && obj.common.unit !== undefined) {
                _common.unit = obj.common.unit;
            }
            if (_common.desc === undefined && obj.common.desc !== undefined) {
                _common.desc = obj.common.desc;
            }
            return sandbox.createState(name, undefined, forceCreation, _common, native, callback);
        },
        createState: async function (name, initValue, forceCreation, common, native, callback) {
            if (typeof native === 'function') {
                callback = native;
                native = {};
            }
            if (typeof common === 'function') {
                callback = common;
                common = undefined;
            }
            if (typeof initValue === 'function') {
                callback = initValue;
                initValue = undefined;
            }
            if (typeof forceCreation === 'function') {
                callback = forceCreation;
                forceCreation = undefined;
            }
            if ((0, tools_1.isObject)(initValue)) {
                common = initValue;
                native = forceCreation;
                forceCreation = undefined;
                initValue = undefined;
            }
            if ((0, tools_1.isObject)(forceCreation)) {
                native = common;
                common = forceCreation;
                forceCreation = undefined;
            }
            if (typeof name !== 'string') {
                const err = `Wrong type of name "${typeof name}". Expected "string".`;
                sandbox.log(err, 'error');
                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, new Error(err));
                    }
                    catch (err) {
                        errorInCallback(err);
                    }
                }
                return;
            }
            if (!name) {
                const err = 'Empty ID is not allowed.';
                sandbox.log(err, 'error');
                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, new Error(err));
                    }
                    catch (err) {
                        errorInCallback(err);
                    }
                }
                return;
            }
            const isAlias = name.startsWith('alias.0.');
            const _common = (common || {});
            _common.name = _common.name || name;
            _common.role = _common.role || 'state';
            _common.type = _common.type || 'mixed';
            if (!isAlias && initValue === undefined) {
                initValue = _common.def;
            }
            // Deliberately after the default was taken as the initial value above: that value stays
            // the object it was and takes the usual road through `setState`, which stringifies it.
            // Only the object definition is brought into the shape js-controller expects.
            try {
                normalizeStateDefault(_common);
            }
            catch (err) {
                sandbox.log(`Cannot stringify ${name}.common.def: ${err}`, 'warn');
                delete _common.def;
            }
            native = native || {};
            // Check min, max and def values for number
            if (_common.type !== undefined && _common.type === 'number') {
                let min = 0;
                let max = 0;
                let def = 0;
                let err;
                if (_common.min !== undefined) {
                    min = _common.min;
                    if (typeof min !== 'number') {
                        min = parseFloat(min);
                        if (isNaN(min)) {
                            err = `Wrong type of ${name}.common.min`;
                            sandbox.log(err, 'error');
                            if (typeof callback === 'function') {
                                try {
                                    callback.call(sandbox, new Error(err));
                                }
                                catch (err) {
                                    errorInCallback(err);
                                }
                            }
                            return;
                        }
                        _common.min = min;
                    }
                }
                if (_common.max !== undefined) {
                    max = _common.max;
                    if (typeof max !== 'number') {
                        max = parseFloat(max);
                        if (isNaN(max)) {
                            err = `Wrong type of ${name}.common.max`;
                            sandbox.log(err, 'error');
                            if (typeof callback === 'function') {
                                try {
                                    callback.call(sandbox, new Error(err));
                                }
                                catch (err) {
                                    errorInCallback(err);
                                }
                            }
                            return;
                        }
                        _common.max = max;
                    }
                }
                if (_common.def !== undefined) {
                    if (isAlias) {
                        delete _common.def;
                    }
                    else {
                        def = _common.def;
                        if (typeof def !== 'number') {
                            def = parseFloat(def);
                            if (isNaN(def)) {
                                err = `Wrong type of ${name}.common.def`;
                                sandbox.log(err, 'error');
                                if (typeof callback === 'function') {
                                    try {
                                        callback.call(sandbox, new Error(err));
                                    }
                                    catch (err) {
                                        errorInCallback(err);
                                    }
                                }
                                return;
                            }
                            _common.def = def;
                        }
                    }
                }
                if (_common.min !== undefined && _common.max !== undefined && min > max) {
                    _common.max = min;
                    _common.min = max;
                }
                if (_common.def !== undefined && _common.min !== undefined && def < min) {
                    _common.def = min;
                }
                if (_common.def !== undefined && _common.max !== undefined && def > max) {
                    _common.def = max;
                }
            }
            if (sandbox.verbose) {
                sandbox.log(`createState(name=${name}, initValue=${JSON.stringify(initValue)}, forceCreation=${JSON.stringify(forceCreation)}, common=${JSON.stringify(common)}, native=${JSON.stringify(native)}, isAlias=${isAlias})`, 'debug');
            }
            let id = `${adapter.namespace}.${name}`;
            if (name.match(/^javascript\.\d+\./) || name.startsWith('0_userdata.0.') || isAlias) {
                id = name;
            }
            if (id.match(/^javascript\.\d+\.scriptEnabled/)) {
                sandbox.log(`Own states (${id}) should not be created in javascript.X.scriptEnabled.*! Please move the states to 0_userdata.0.*`, 'info');
            }
            else if (id.match(/^javascript\.\d+\.scriptProblem/)) {
                sandbox.log(`Own states (${id}) should not be created in javascript.X.scriptProblem.*! Please move the states to 0_userdata.0.*`, 'info');
            }
            // User can create aliases by two ways:
            // - id is starting with "alias.0." and common.alias.id is set, so the state defined in common.alias.id will be created automatically if not exists
            // - id is not starting with "alias.0.", but common.alias is set, so the state defined in common.alias will be created automatically if not exists
            if (!isAlias && _common.alias) {
                // check and create if not exists the alias
                let alias;
                if (typeof _common.alias === 'string') {
                    alias = {
                        id: _common.alias,
                    };
                }
                else if (typeof _common.alias === 'boolean') {
                    const parts = id.split('.');
                    parts[0] = 'alias';
                    parts[1] = '0';
                    alias = {
                        id: parts.join('.'),
                    };
                }
                else {
                    alias = _common.alias;
                }
                delete _common.alias;
                if (!alias.id.startsWith('alias.0.')) {
                    alias.id = `alias.0.${alias.id}`;
                }
                let aObj;
                try {
                    aObj = (await adapter.getForeignObjectAsync(alias.id));
                }
                catch {
                    // ignore
                }
                if (!aObj) {
                    try {
                        const _obj = {
                            _id: alias.id,
                            type: 'state',
                            common: {
                                name: `Alias to ${id}`,
                                role: 'state',
                                type: _common.type,
                                read: _common.read,
                                write: _common.write,
                                unit: _common.unit,
                                alias: {
                                    id,
                                    read: alias.read,
                                    write: alias.write,
                                },
                            },
                            native: {},
                        };
                        await adapter.setForeignObjectAsync(alias.id, _obj);
                    }
                    catch (err) {
                        sandbox.log(`Cannot create alias "${alias.id}": ${err}`, 'error');
                    }
                }
            }
            else if (isAlias && _common.alias) {
                if (typeof _common.alias === 'string') {
                    _common.alias = {
                        id: _common.alias,
                    };
                }
                const readId = typeof _common.alias.id === 'string' ? _common.alias.id : _common.alias.id.read;
                let writeId = typeof _common.alias.id === 'string' ? _common.alias.id : _common.alias.id.write;
                if (writeId === readId) {
                    writeId = undefined;
                }
                // try to create the linked states
                let aObj;
                try {
                    aObj = (await adapter.getForeignObjectAsync(readId));
                }
                catch {
                    // ignore
                }
                if (!aObj) {
                    try {
                        await adapter.setForeignObjectAsync(readId, {
                            type: 'state',
                            common: {
                                name: `State for ${id}`,
                                role: 'state',
                                type: _common.type,
                                read: _common.read,
                                write: _common.write,
                                unit: _common.unit,
                            },
                            native: {},
                        });
                    }
                    catch (err) {
                        sandbox.log(`Cannot create alias "${readId}": ${err}`, 'error');
                    }
                }
                if (writeId && _common.write !== false) {
                    try {
                        aObj = (await adapter.getForeignObjectAsync(writeId));
                    }
                    catch {
                        // ignore
                    }
                    if (!aObj) {
                        try {
                            await adapter.setForeignObjectAsync(writeId, {
                                type: 'state',
                                common: {
                                    name: `Write state for ${id}`,
                                    role: 'state',
                                    type: _common.type,
                                    read: _common.read,
                                    write: _common.write,
                                    unit: _common.unit,
                                },
                                native: {},
                            });
                        }
                        catch (err) {
                            sandbox.log(`Cannot create alias "${writeId}": ${err}`, 'error');
                        }
                    }
                }
            }
            let obj;
            try {
                obj = await adapter.getForeignObjectAsync(id);
            }
            catch {
                // ignore
            }
            if (obj?._id &&
                validIdForAutomaticFolderCreation(obj._id) &&
                obj.type === 'folder' &&
                obj.native &&
                obj.native.autocreated === 'by automatic ensure logic') {
                // ignore a default created object because we now have a better defined one
                obj = null;
            }
            if (!obj || forceCreation) {
                // create new one
                const newObj = {
                    _id: id,
                    common: _common,
                    native,
                    type: 'state',
                };
                try {
                    await adapter.setForeignObjectAsync(id, newObj);
                }
                catch (err) {
                    sandbox.log(`Cannot set object "${id}": ${err}`, 'warn');
                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, err);
                        }
                        catch (err) {
                            errorInCallback(err);
                        }
                    }
                    return;
                }
                // Update meta objects
                context.updateObjectContext(id, newObj);
                if (!isAlias && initValue !== undefined) {
                    if ((0, tools_1.isObject)(initValue) && initValue.ack !== undefined) {
                        setStateHelper(sandbox, true, false, id, initValue, callback);
                    }
                    else {
                        setStateHelper(sandbox, true, false, id, initValue, true, callback);
                    }
                }
                else if (!isAlias && !forceCreation) {
                    setStateHelper(sandbox, true, false, id, null, callback);
                }
                else if (isAlias) {
                    try {
                        const state = await adapter.getForeignStateAsync(id);
                        if (state) {
                            states[id] = state;
                        }
                    }
                    catch {
                        // ignore
                    }
                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, null, id);
                        }
                        catch (err) {
                            errorInCallback(err);
                        }
                    }
                }
                else if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, null, id);
                    }
                    catch (err) {
                        errorInCallback(err);
                    }
                }
                await ensureObjectStructure(id);
            }
            else {
                // state yet exists
                if (!adapter.config.subscribe &&
                    !states[id] &&
                    states[`${adapter.namespace}.${id}`] === undefined) {
                    states[id] = {
                        val: null,
                        ack: true,
                        lc: Date.now(),
                        ts: Date.now(),
                        q: 0,
                        from: `system.adapter.${adapter.namespace}`,
                    };
                }
                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, null, id);
                    }
                    catch (err) {
                        errorInCallback(err);
                    }
                }
                await ensureObjectStructure(id);
            }
        },
        deleteState: function (id, callback) {
            // todo: check rights
            // todo: also remove from "names"
            if (sandbox.verbose) {
                sandbox.log(`deleteState(id=${id})`, 'debug');
            }
            let found = false;
            if ((id.startsWith('0_userdata.0.') || id.startsWith(adapter.namespace)) && objects[id]) {
                found = true;
                delete objects[id];
                if (states[id]) {
                    delete states[id];
                }
                adapter.delForeignObject(id, function (err) {
                    err && sandbox.log(`Object for state "${id}" does not exist: ${err}`, 'warn');
                    adapter.delForeignState(id, function (err) {
                        err && sandbox.log(`Cannot delete state "${id}": ${err}`, 'error');
                        if (typeof callback === 'function') {
                            try {
                                callback.call(sandbox, err, found);
                            }
                            catch (err) {
                                errorInCallback(err);
                            }
                        }
                    });
                });
            }
            else if (objects[`${adapter.namespace}.${id}`]) {
                delete objects[`${adapter.namespace}.${id}`];
                found = true;
                if (states[`${adapter.namespace}.${id}`]) {
                    delete states[`${adapter.namespace}.${id}`];
                }
                adapter.delObject(id, function (err) {
                    err && sandbox.log(`Object for state "${id}" does not exist: ${err}`, 'warn');
                    adapter.delState(id, function (err) {
                        err && sandbox.log(`Cannot delete state "${id}": ${err}`, 'error');
                        if (typeof callback === 'function') {
                            try {
                                callback.call(sandbox, err, found);
                            }
                            catch (err) {
                                errorInCallback(err);
                            }
                        }
                    });
                });
            }
            else {
                const err = 'Not found';
                sandbox.log(`Cannot delete state "${id}": ${err}`, 'error');
                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, new Error(err), found);
                    }
                    catch (err) {
                        errorInCallback(err);
                    }
                }
            }
        },
        sendTo: function (_adapter, cmd, msg, options, callback) {
            const defaultTimeout = 20000;
            if (typeof options === 'function') {
                callback = options;
                options = { timeout: defaultTimeout };
            }
            let timeout = null;
            if (typeof callback === 'function') {
                const timeoutDuration = parseInt(options?.timeout, 10) || defaultTimeout;
                timeout = setTimeout(() => {
                    timeout = null;
                    if (sandbox.verbose) {
                        sandbox.log(`sendTo => timeout: ${timeoutDuration}`, 'debug');
                    }
                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, { error: 'timeout' }, options, _adapter);
                        }
                        catch (err) {
                            errorInCallback(err);
                        }
                        callback = undefined;
                    }
                }, timeoutDuration);
            }
            let cbFunc;
            if (timeout) {
                cbFunc = function (result) {
                    if (timeout) {
                        clearTimeout(timeout);
                        timeout = null;
                    }
                    if (sandbox.verbose && result) {
                        sandbox.log(`sendTo => ${JSON.stringify(result)}`, 'debug');
                    }
                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, result, options, _adapter);
                        }
                        catch (err) {
                            errorInCallback(err);
                        }
                        callback = undefined;
                    }
                };
            }
            // If specific instance
            if (_adapter.match(/\.[0-9]+$/)) {
                if (sandbox.verbose) {
                    sandbox.log(`sendTo(instance=${_adapter}, cmd=${cmd}, msg=${JSON.stringify(msg)}, hasCallback=${typeof callback === 'function'})`, 'info');
                }
                adapter.sendTo(_adapter, cmd, msg, cbFunc, options);
            }
            else {
                // IO-9: Cache sendTo broadcast instance list – avoid repeated getObjectView DB calls
                const cached = context.sendToInstanceCache.get(_adapter);
                if (cached) {
                    cached.forEach(instance => {
                        if (sandbox.verbose) {
                            sandbox.log(`sendTo(instance=${instance}, cmd=${cmd}, msg=${JSON.stringify(msg)}, hasCallback=${typeof callback === 'function'}) [cached]`, 'info');
                        }
                        adapter.sendTo(instance, cmd, msg, cbFunc, options);
                    });
                }
                else {
                    // Send it to all instances
                    context.adapter.getObjectView('system', 'instance', { startkey: `system.adapter.${_adapter}.`, endkey: `system.adapter.${_adapter}.\u9999` }, options, (err, res) => {
                        if (err || !res) {
                            sandbox.log(`sendTo failed: ${err?.message}`, 'error');
                            return;
                        }
                        const instances = res.rows.map(item => item.id.substring('system.adapter.'.length));
                        // Store in cache for subsequent calls (invalidated on system.adapter.* object change).
                        // LRU eviction: keep the map bounded to avoid unbounded memory growth.
                        if (context.sendToInstanceCache.size >= 200) {
                            const firstKey = context.sendToInstanceCache.keys().next().value;
                            if (firstKey !== undefined) {
                                context.sendToInstanceCache.delete(firstKey);
                            }
                        }
                        context.sendToInstanceCache.set(_adapter, instances);
                        instances.forEach(instance => {
                            if (sandbox.verbose) {
                                sandbox.log(`sendTo(instance=${instance}, cmd=${cmd}, msg=${JSON.stringify(msg)}, hasCallback=${typeof callback === 'function'})`, 'info');
                            }
                            adapter.sendTo(instance, cmd, msg, cbFunc, options);
                        });
                    });
                }
            }
        },
        sendto: function (_adapter, cmd, msg, callback) {
            return sandbox.sendTo(_adapter, cmd, msg, callback);
        },
        sendToAsync: function (_adapter, cmd, msg, options) {
            return new Promise((resolve, reject) => {
                sandbox.sendTo(_adapter, cmd, msg, options, res => {
                    if (!res || res.error) {
                        reject(res ? new Error(res.error) : new Error('Unknown error'));
                    }
                    else {
                        resolve(res);
                    }
                });
            });
        },
        sendToHost: function (host, cmd, msg, callback) {
            if (!adapter.config.enableSendToHost) {
                const error = 'sendToHost is not available. Please enable "Enable SendToHost" option in instance settings';
                sandbox.log(error, 'error');
                if (typeof callback === 'function') {
                    // leave it as a normal function and not as a lambda, to hide the "this" object
                    setImmediate(function () {
                        callback(error);
                    });
                }
            }
            else {
                if (sandbox.verbose) {
                    sandbox.log(`sendToHost(adapter=${host}, cmd=${cmd}, msg=${JSON.stringify(msg)})`, 'info');
                }
                adapter.sendToHost(host, cmd, msg, callback);
            }
        },
        sendToHostAsync: function (host, cmd, msg) {
            return new Promise((resolve, reject) => {
                sandbox.sendToHost(host, cmd, msg, res => {
                    if (!res || res.error) {
                        reject(res ? new Error(res.error) : new Error('Unknown error'));
                    }
                    else {
                        resolve(res);
                    }
                });
            });
        },
        registerNotification: function (msg, isAlert) {
            const category = !isAlert ? 'scriptMessage' : 'scriptAlert';
            if (sandbox.verbose) {
                sandbox.log(`registerNotification(msg=${msg}, category=${category})`, 'info');
            }
            void adapter.registerNotification('javascript', category, msg);
        },
        setInterval: function (callback, ms, ...args) {
            if (typeof callback === 'function') {
                const int = setInterval(() => {
                    try {
                        callback.call(sandbox, ...args);
                    }
                    catch (err) {
                        errorInCallback(err);
                    }
                }, ms);
                // IO-10: Set.add() – O(1) instead of Array.push()
                script.intervals.add(int);
                if (sandbox.verbose) {
                    sandbox.log(`setInterval(ms=${ms})`, 'info');
                }
                return int;
            }
            sandbox.log(`Invalid callback for setInterval! - ${typeof callback}`, 'error');
            return null;
        },
        clearInterval: function (id) {
            // IO-10: Set.has/delete – O(1) instead of Array.indexOf+splice O(n)
            if (script.intervals.has(id)) {
                if (sandbox.verbose) {
                    sandbox.log('clearInterval() => cleared', 'info');
                }
                clearInterval(id);
                script.intervals.delete(id);
            }
            else {
                if (sandbox.verbose) {
                    sandbox.log('clearInterval() => not found', 'warn');
                }
            }
        },
        setTimeout: function (callback, ms, ...args) {
            if (typeof callback === 'function') {
                const to = setTimeout(() => {
                    // IO-10: Set.delete – O(1) instead of Array.indexOf+splice O(n)
                    script.timeouts.delete(to);
                    try {
                        callback.call(sandbox, ...args);
                    }
                    catch (err) {
                        errorInCallback(err);
                    }
                }, ms);
                if (sandbox.verbose) {
                    sandbox.log(`setTimeout(ms=${ms})`, 'info');
                }
                // IO-10: Set.add – O(1) instead of Array.push
                script.timeouts.add(to);
                return to;
            }
            sandbox.log(`Invalid callback for setTimeout! - ${typeof callback}`, 'error');
            return null;
        },
        clearTimeout: function (id) {
            // IO-10: Set.has/delete – O(1) instead of Array.indexOf+splice O(n)
            if (script.timeouts.has(id)) {
                if (sandbox.verbose) {
                    sandbox.log('clearTimeout() => cleared', 'info');
                }
                clearTimeout(id);
                script.timeouts.delete(id);
            }
            else {
                if (sandbox.verbose) {
                    sandbox.log('clearTimeout() => not found', 'warn');
                }
            }
        },
        setImmediate: function (callback, ...args) {
            if (typeof callback === 'function') {
                setImmediate(() => {
                    try {
                        callback.apply(sandbox, args);
                    }
                    catch (err) {
                        errorInCallback(err);
                    }
                });
                if (sandbox.verbose) {
                    sandbox.log('setImmediate()', 'info');
                }
            }
            else {
                sandbox.log(`Invalid callback for setImmediate! - ${typeof callback}`, 'error');
            }
        },
        cb: function (callback) {
            return function (args) {
                if (context.scripts[name]?._id === sandbox._id) {
                    if (typeof callback === 'function') {
                        try {
                            callback.apply(sandbox, args);
                        }
                        catch (err) {
                            errorInCallback(err);
                        }
                    }
                }
                else {
                    sandbox.log(`Callback for old version of script: ${name}`, 'warn');
                }
            };
        },
        compareTime: function (startTime, endTime, operation, time) {
            if (startTime && typeof startTime === 'string') {
                const pos = consts.astroListLow.indexOf(startTime.toLowerCase());
                if (pos !== -1) {
                    const aTime = sandbox.getAstroDate(consts.astroList[pos]);
                    if (aTime) {
                        startTime = aTime.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                        });
                    }
                    else {
                        startTime = 0;
                    }
                }
            }
            else if (startTime && (0, tools_1.isObject)(startTime) && startTime.astro) {
                const aTime = sandbox.getAstroDate(startTime.astro, startTime.date || new Date(), startTime.offset || 0);
                if (aTime) {
                    startTime = aTime.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                    });
                }
                else {
                    startTime = 0;
                }
            }
            if (endTime && typeof endTime === 'string') {
                const pos = consts.astroListLow.indexOf(endTime.toLowerCase());
                if (pos !== -1) {
                    const aTime = sandbox.getAstroDate(consts.astroList[pos]);
                    endTime =
                        aTime?.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                        }) || 0;
                }
            }
            else if (endTime && (0, tools_1.isObject)(endTime) && endTime.astro) {
                const aTime = sandbox.getAstroDate(endTime.astro, endTime.date || new Date(), endTime.offset || 0);
                endTime =
                    aTime?.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                    }) || 0;
            }
            // --- Convert "time" to number
            let nTime;
            // maybe it is astro date like 'sunrise' or 'sunset'
            if (time && typeof time === 'string') {
                const pos = consts.astroListLow.indexOf(time.toLowerCase());
                if (pos !== -1) {
                    nTime = sandbox.getAstroDate(consts.astroList[pos])?.getTime() || 0;
                }
            }
            else if (time && (0, tools_1.isObject)(time) && time.astro) {
                nTime =
                    sandbox
                        .getAstroDate(time.astro, time.date || new Date(), time.offset || 0)
                        ?.getTime() || 0;
            }
            let daily = true;
            if (time) {
                daily = false;
            }
            // if not astro date
            if (!nTime) {
                if (time && !(0, tools_1.isObject)(time)) {
                    if (typeof time === 'string' && !time.includes(' ') && !time.includes('T')) {
                        const parts = time.split(':');
                        const oTime = new Date();
                        oTime.setHours(parseInt(parts[0], 10));
                        oTime.setMinutes(parseInt(parts[1], 10));
                        oTime.setMilliseconds(0);
                        if (parts.length === 3) {
                            oTime.setSeconds(parseInt(parts[2], 10));
                        }
                        else {
                            oTime.setSeconds(0);
                        }
                        nTime = oTime.getTime();
                    }
                    else {
                        nTime = new Date(time).getTime();
                    }
                }
                else if (!time) {
                    const oTime = new Date();
                    oTime.setMilliseconds(0);
                    nTime = oTime.getTime();
                }
                else {
                    // If Date
                    nTime = time.getTime();
                }
            }
            // --- End of conversion "time" to number
            if (typeof startTime === 'string') {
                if (!startTime.includes(' ') && !startTime.includes('T')) {
                    const parts = startTime.split(':');
                    startTime = new Date();
                    startTime.setHours(parseInt(parts[0], 10));
                    startTime.setMinutes(parseInt(parts[1], 10));
                    startTime.setMilliseconds(0);
                    if (parts.length === 3) {
                        startTime.setSeconds(parseInt(parts[2], 10));
                    }
                    else {
                        startTime.setSeconds(0);
                    }
                }
                else {
                    daily = false;
                    startTime = new Date(startTime);
                }
            }
            else {
                daily = false;
                startTime = new Date(startTime);
            }
            const nStartTime = startTime.getTime();
            let nEndTime;
            if (endTime && typeof endTime === 'string') {
                if (!endTime.includes(' ') && !endTime.includes('T')) {
                    const parts = endTime.split(':');
                    endTime = new Date();
                    endTime.setHours(parseInt(parts[0], 10));
                    endTime.setMinutes(parseInt(parts[1], 10));
                    endTime.setMilliseconds(0);
                    if (parts.length === 3) {
                        endTime.setSeconds(parseInt(parts[2], 10));
                    }
                    else {
                        endTime.setSeconds(0);
                    }
                }
                else {
                    daily = false;
                    endTime = new Date(endTime);
                }
            }
            else if (endTime) {
                daily = false;
                endTime = new Date(endTime);
            }
            else {
                endTime = null;
            }
            if (endTime) {
                nEndTime = endTime.getTime();
            }
            else {
                nEndTime = null;
            }
            if (operation === 'between') {
                if (nEndTime) {
                    if (nStartTime > nEndTime && daily) {
                        return !(nTime >= nEndTime && nTime < nStartTime);
                    }
                    return nTime >= nStartTime && nTime < nEndTime;
                }
                sandbox.log(`missing or unrecognized endTime expression: ${JSON.stringify(endTime)}`, 'warn');
                return false;
            }
            if (operation === 'not between') {
                if (nEndTime) {
                    if (nStartTime > nEndTime && daily) {
                        return nTime >= nEndTime && nTime < nStartTime;
                    }
                    return !(nTime >= nStartTime && nTime < nEndTime);
                }
                sandbox.log(`missing or unrecognized endTime expression: ${JSON.stringify(endTime)}`, 'warn');
                return false;
            }
            if (operation === '>') {
                return nTime > nStartTime;
            }
            if (operation === '>=') {
                return nTime >= nStartTime;
            }
            if (operation === '<') {
                return nTime < nStartTime;
            }
            if (operation === '<=') {
                return nTime <= nStartTime;
            }
            if (operation === '==') {
                return nTime === nStartTime;
            }
            if (operation === '<>' || operation === '!=') {
                return nTime !== nStartTime;
            }
            sandbox.log(`Invalid operator: ${operation}`, 'warn');
            return false;
        },
        onStop: function (cb, timeout) {
            if (sandbox.verbose) {
                sandbox.log(`onStop(timeout=${timeout})`, 'info');
            }
            script.onStopCb = cb;
            script.onStopTimeout = timeout || 1000;
        },
        formatValue: function (value, decimals, format) {
            if (typeof decimals === 'string') {
                format = decimals;
                decimals = 0;
            }
            if (!format) {
                if (adapter.isFloatComma !== undefined) {
                    format = adapter.isFloatComma ? '.,' : ',.';
                }
                else if (objects['system.config'] && objects['system.config'].common) {
                    format = objects['system.config'].common.isFloatComma ? '.,' : ',.';
                }
            }
            return adapter.formatValue(value, decimals, format);
        },
        formatDate: function (date, format, language) {
            if (!format) {
                if (adapter.dateFormat) {
                    format = adapter.dateFormat;
                }
                else {
                    format =
                        objects['system.config'] && objects['system.config'].common
                            ? objects['system.config'].common.dateFormat || 'DD.MM.YYYY'
                            : 'DD.MM.YYYY';
                }
                format = format || 'DD.MM.YYYY';
            }
            // maybe it is astro date like 'sunrise' or 'sunset'
            if (date && typeof date === 'string') {
                const pos = consts.astroListLow.indexOf(date.toLowerCase());
                if (pos !== -1) {
                    date = sandbox.getAstroDate(consts.astroList[pos])?.getTime() || 0;
                }
            }
            else if (date && (0, tools_1.isObject)(date) && date.astro) {
                date =
                    sandbox
                        .getAstroDate(date.astro, date.date || new Date(), date.offset || 0)
                        ?.getTime() || 0;
            }
            if (format.match(/[WНOО]+/)) {
                let text = adapter.formatDate(date, format);
                if (!language || !consts.dayOfWeeksFull[language]) {
                    language =
                        adapter.language ||
                            (objects['system.config'] &&
                                objects['system.config'].common &&
                                objects['system.config'].common.language) ||
                            'en';
                    if (!consts.dayOfWeeksFull[language]) {
                        language = 'en';
                    }
                }
                if (typeof date === 'number' || typeof date === 'string') {
                    date = new Date(date);
                }
                else if (typeof date.getMonth !== 'function') {
                    sandbox.log(`Invalid date object provided: ${JSON.stringify(date)}`, 'error');
                    return 'Invalid date';
                }
                const d = date.getDay();
                text = text.replace('НН', consts.dayOfWeeksFull[language][d]);
                let initialText = text;
                text = text.replace('WW', consts.dayOfWeeksFull[language][d]);
                if (initialText === text) {
                    text = text.replace('W', consts.dayOfWeeksShort[language][d]);
                }
                text = text.replace('Н', consts.dayOfWeeksShort[language][d]);
                text = text.replace('Н', consts.dayOfWeeksShort[language][d]);
                const m = date.getMonth();
                initialText = text;
                text = text.replace('OOO', consts.monthFullGen[language][m]);
                text = text.replace('ООО', consts.monthFullGen[language][m]);
                text = text.replace('OO', consts.monthFull[language][m]);
                text = text.replace('ОО', consts.monthFull[language][m]);
                if (initialText === text) {
                    text = text.replace('O', consts.monthShort[language][m]);
                }
                return text;
            }
            return adapter.formatDate(date, format);
        },
        formatTimeDiff: function (diff, format) {
            if (!format) {
                format = 'hh:mm:ss';
            }
            let text = format;
            if (sandbox.verbose) {
                sandbox.log(`formatTimeDiff(format=${format}, diff=${diff})`, 'debug');
            }
            const second = 1000;
            const minute = 60 * second;
            const hour = 60 * minute;
            const day = 24 * hour;
            const neg = diff < 0;
            diff = Math.abs(diff);
            if (FTD_TEST_D.test(text)) {
                const days = Math.floor(diff / day);
                text = text.replace(FTD_REPL_DD, days.toString().padStart(2, '0')).replace(FTD_REPL_D, days.toString());
                if (sandbox.verbose) {
                    sandbox.log(`formatTimeDiff(format=${format}, text=${text}, days=${days})`, 'debug');
                }
                diff -= days * day;
            }
            if (FTD_TEST_H.test(text)) {
                const hours = Math.floor(diff / hour);
                text = text
                    .replace(FTD_REPL_HH, hours.toString().padStart(2, '0'))
                    .replace(FTD_REPL_H, hours.toString());
                if (sandbox.verbose) {
                    sandbox.log(`formatTimeDiff(format=${format}, text=${text}, hours=${hours})`, 'debug');
                }
                diff -= hours * hour;
            }
            if (FTD_TEST_M.test(text)) {
                const minutes = Math.floor(diff / minute);
                text = text
                    .replace(FTD_REPL_MM, minutes.toString().padStart(2, '0'))
                    .replace(FTD_REPL_M, minutes.toString());
                if (sandbox.verbose) {
                    sandbox.log(`formatTimeDiff(format=${format}, text=${text}, minutes=${minutes})`, 'debug');
                }
                diff -= minutes * minute;
            }
            if (FTD_TEST_S.test(text)) {
                const seconds = Math.floor(diff / second);
                text = text
                    .replace(FTD_REPL_SS, seconds.toString().padStart(2, '0'))
                    .replace(FTD_REPL_S, seconds.toString());
                if (sandbox.verbose) {
                    sandbox.log(`formatTimeDiff(format=${format}, text=${text}, seconds=${seconds})`, 'debug');
                }
            }
            for (const [pattern, replacement] of FTD_UNESCAPE) {
                text = text.replace(pattern, replacement);
            }
            if (sandbox.verbose) {
                sandbox.log(`formatTimeDiff(format=${format}, text=${text})`, 'debug');
            }
            return neg ? `-${text}` : text;
        },
        getDateObject: function (date) {
            if ((0, tools_1.isObject)(date)) {
                return date;
            }
            if (typeof date === 'undefined') {
                return new Date();
            }
            if (typeof date !== 'string') {
                return new Date(date);
            }
            // If only hours: 20, 2
            if (date.match(/^\d?\d$/)) {
                const _now = new Date();
                date = `${_now.getFullYear()}-${_now.getMonth() + 1}-${_now.getDate()} ${date}:00`;
            }
            else if (date.match(/^\d?\d:\d\d(:\d\d)?$/)) {
                // 20:00, 2:00, 20:00:00, 2:00:00
                const now = new Date();
                date = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${date}`;
            }
            return new Date(date);
        },
        writeFile: function (_adapter, fileName, data, callback) {
            if (typeof data === 'function' || !data) {
                callback = data;
                data = fileName;
                fileName = _adapter;
                _adapter = '0_userdata.0';
            }
            _adapter = _adapter || '0_userdata.0';
            if (debug) {
                sandbox.log(`writeFile(adapter=${_adapter}, fileName=${fileName}) - ${words._('was not executed, while debug mode is active')}`, 'warn');
                if (typeof callback === 'function') {
                    setTimeout(function () {
                        try {
                            callback.call(sandbox);
                        }
                        catch (err) {
                            errorInCallback(err);
                        }
                    }, 0);
                }
            }
            else {
                if (sandbox.verbose) {
                    sandbox.log(`writeFile(adapter=${_adapter}, fileName=${fileName})`, 'info');
                }
                if (callback) {
                    adapter.writeFile(_adapter, fileName, data, callback);
                }
                else {
                    // @ts-expect-error should be fixed in js-controller
                    adapter.writeFile(_adapter, fileName, data);
                }
            }
        },
        readFile: function (_adapter, fileName, callback) {
            if (typeof fileName === 'function') {
                callback = fileName;
                fileName = _adapter;
                _adapter = '0_userdata.0';
            }
            if (typeof callback !== 'function') {
                sandbox.log(`readFile(adapter=${_adapter}, fileName=${fileName}): no callback`, 'error');
                return;
            }
            _adapter = _adapter || '0_userdata.0';
            if (sandbox.verbose) {
                sandbox.log(`readFile(adapter=${_adapter}, fileName=${fileName})`, 'info');
            }
            adapter.fileExists(_adapter, fileName, (error, result) => {
                if (error) {
                    callback(error);
                }
                else if (!result) {
                    callback(new Error('Not exists'));
                }
                else {
                    adapter.readFile(_adapter, fileName, callback);
                }
            });
        },
        unlink: function (_adapter, fileName, callback) {
            if (typeof fileName === 'function') {
                callback = fileName;
                fileName = _adapter;
                _adapter = '0_userdata.0';
            }
            _adapter = _adapter || '0_userdata.0';
            if (debug) {
                sandbox.log(`unlink(adapter=${_adapter}, fileName=${fileName}) - ${words._('was not executed, while debug mode is active')}`, 'warn');
                if (typeof callback === 'function') {
                    setTimeout(function () {
                        try {
                            callback.call(sandbox);
                        }
                        catch (err) {
                            errorInCallback(err);
                        }
                    }, 0);
                }
            }
            else {
                if (sandbox.verbose) {
                    sandbox.log(`unlink(adapter=${_adapter}, fileName=${fileName})`, 'info');
                }
                if (callback) {
                    adapter.unlink(_adapter, fileName, callback);
                }
                else {
                    // @ts-expect-error should be fixed in js-controller
                    adapter.unlink(_adapter, fileName);
                }
            }
        },
        delFile: function (_adapter, fileName, callback) {
            return sandbox.unlink(_adapter, fileName, callback);
        },
        rename: function (_adapter, oldName, newName, callback) {
            _adapter = _adapter || '0_userdata.0';
            if (debug) {
                sandbox.log(`rename(adapter=${_adapter}, oldName=${oldName}, newName=${newName}) - ${words._('was not executed, while debug mode is active')}`, 'warn');
                if (typeof callback === 'function') {
                    setTimeout(function () {
                        try {
                            callback.call(sandbox);
                        }
                        catch (err) {
                            errorInCallback(err);
                        }
                    }, 0);
                }
            }
            else {
                if (sandbox.verbose) {
                    sandbox.log(`rename(adapter=${_adapter}, oldName=${oldName}, newName=${newName})`, 'info');
                }
                if (callback) {
                    adapter.rename(_adapter, oldName, newName, callback);
                }
                else {
                    // @ts-expect-error should be fixed in js-controller
                    adapter.rename(_adapter, oldName, newName);
                }
            }
        },
        renameFile: function (_adapter, oldName, newName, callback) {
            return sandbox.rename(_adapter, oldName, newName, callback);
        },
        getHistory: function (instance, options, callback) {
            if ((0, tools_1.isObject)(instance)) {
                callback = options;
                options = instance;
                instance = '';
            }
            if (typeof callback !== 'function') {
                return sandbox.log('No callback found!', 'error');
            }
            if (!(0, tools_1.isObject)(options)) {
                return sandbox.log('No options found!', 'error');
            }
            if (!options.id) {
                return sandbox.log('No ID found!', 'error');
            }
            const timeoutMs = parseInt(options
                ?.timeout, 10) || 20000;
            if (!instance) {
                // @ts-expect-error defaultHistory is private attribute of adapter. Fix later
                if (adapter.defaultHistory) {
                    // @ts-expect-error defaultHistory is private attribute of adapter. Fix later
                    instance = adapter.defaultHistory;
                }
                else {
                    instance = objects['system.config']?.common?.defaultHistory || null;
                }
            }
            if (sandbox.verbose) {
                sandbox.log(`getHistory(instance=${instance}, options=${JSON.stringify(options)})`, 'info');
            }
            if (!instance) {
                sandbox.log('No default history instance found!', 'error');
                try {
                    callback.call(sandbox, new Error('No default history instance found!'));
                }
                catch (err) {
                    errorInCallback(err);
                }
                return;
            }
            if (instance.startsWith('system.adapter.')) {
                instance = instance.substring('system.adapter.'.length);
            }
            if (!objects[`system.adapter.${instance}`]) {
                sandbox.log(`Instance "${instance}" not found!`, 'error');
                try {
                    callback.call(sandbox, new Error(`Instance "${instance}" not found!`));
                }
                catch (err) {
                    errorInCallback(err);
                }
                return;
            }
            let _timeout = setTimeout(() => {
                _timeout = null;
                if (sandbox.verbose) {
                    sandbox.log('getHistory => timeout', 'debug');
                }
                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, new Error('Timeout'), null, options, instance);
                    }
                    catch (err) {
                        errorInCallback(err);
                    }
                    callback = undefined;
                }
            }, timeoutMs);
            adapter.sendTo(instance, 'getHistory', {
                id: options.id,
                options,
            }, (res) => {
                if (_timeout) {
                    clearTimeout(_timeout);
                    _timeout = null;
                }
                const result = res;
                if (sandbox.verbose && result?.error) {
                    sandbox.log(`getHistory => ${result.error}`, 'error');
                }
                if (sandbox.verbose && result?.result) {
                    sandbox.log(`getHistory => ${result.result.length} items`, 'debug');
                }
                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, result.error ? new Error(result.error) : null, result.result, options, instance);
                    }
                    catch (err) {
                        errorInCallback(err);
                    }
                    callback = undefined;
                }
            });
        },
        runScript: function (scriptName, callback) {
            scriptName = scriptName || name;
            if (!scriptName.match(/^script\.js\./)) {
                scriptName = `script.js.${scriptName}`;
            }
            // start another script
            if (!objects[scriptName] || !objects[scriptName].common) {
                sandbox.log(`Cannot start "${scriptName}", because not found`, 'error');
                return false;
            }
            if (debug) {
                sandbox.log(`runScript(scriptName=${scriptName}) - ${words._('was not executed, while debug mode is active')}`, 'warn');
                typeof callback === 'function' && callback();
                return true;
            }
            if (objects[scriptName].common.enabled) {
                objects[scriptName].common.enabled = false;
                adapter.extendForeignObject(scriptName, { common: { enabled: false } }, ( /* err, obj */) => {
                    adapter.extendForeignObject(scriptName, { common: { enabled: true } }, err => typeof callback === 'function' && callback(err));
                });
                return true;
            }
            adapter.extendForeignObject(scriptName, { common: { enabled: true } }, err => typeof callback === 'function' && callback(err));
            return true;
        },
        runScriptAsync: function (scriptName) {
            let done = false;
            return new Promise((resolve, reject) => {
                const result = sandbox.runScript(scriptName, err => {
                    if (err) {
                        reject(err);
                        done = true;
                    }
                    else {
                        resolve();
                    }
                });
                if (result === false && !done) {
                    reject(new Error(`Script ${scriptName} was not found!`));
                }
            });
        },
        startScript: function (scriptName, ignoreIfStarted, callback) {
            if (typeof ignoreIfStarted === 'function') {
                callback = ignoreIfStarted;
                ignoreIfStarted = false;
            }
            scriptName ||= name;
            if (!scriptName.match(/^script\.js\./)) {
                scriptName = `script.js.${scriptName}`;
            }
            // start another script
            if (!objects[scriptName] || !objects[scriptName].common) {
                sandbox.log(`Cannot start "${scriptName}", because not found`, 'error');
                return false;
            }
            if (debug) {
                sandbox.log(`startScript(scriptName=${scriptName}) - ${words._('was not executed, while debug mode is active')}`, 'warn');
                typeof callback === 'function' && callback(null, false);
                return true;
            }
            if (objects[scriptName].common.enabled) {
                if (!ignoreIfStarted) {
                    adapter.extendForeignObject(scriptName, { common: { enabled: false } }, () => {
                        adapter.extendForeignObject(scriptName, { common: { enabled: true } }, err => typeof callback === 'function' && callback(err, true));
                    });
                }
                else if (typeof callback === 'function') {
                    callback(null, false);
                }
                return true;
            }
            adapter.extendForeignObject(scriptName, { common: { enabled: true } }, err => {
                typeof callback === 'function' && callback(err, true);
            });
            return true;
        },
        startScriptAsync: function (scriptName, ignoreIfStarted) {
            return new Promise((resolve, reject) => {
                const result = sandbox.startScript(scriptName, !!ignoreIfStarted, (err, started) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(started);
                    }
                });
                if (result === false) {
                    reject(new Error(`Script ${scriptName} was not found!`));
                }
            });
        },
        stopScript: function (scriptName, callback) {
            scriptName = scriptName || name;
            if (!scriptName.match(/^script\.js\./)) {
                scriptName = `script.js.${scriptName}`;
            }
            // stop another script
            if (!objects[scriptName] || !objects[scriptName].common) {
                sandbox.log(`Cannot stop "${scriptName}", because not found`, 'error');
                return false;
            }
            if (debug) {
                sandbox.log(`stopScript(scriptName=${scriptName}) - ${words._('was not executed, while debug mode is active')}`, 'warn');
                if (typeof callback === 'function') {
                    callback(null, false);
                }
                return true;
            }
            if (objects[scriptName].common.enabled) {
                objects[scriptName].common.enabled = false;
                adapter.extendForeignObject(scriptName, { common: { enabled: false } }, err => {
                    if (typeof callback === 'function') {
                        callback(err, true);
                    }
                });
            }
            else if (typeof callback === 'function') {
                callback(null, false);
            }
            return true;
        },
        stopScriptAsync: function (scriptName) {
            return new Promise((resolve, reject) => {
                const result = sandbox.stopScript(scriptName, (err, stopped) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(stopped);
                    }
                });
                if (result === false) {
                    reject(new Error(`Script ${scriptName} was not found!`));
                }
            });
        },
        isScriptActive: function (scriptName) {
            if (!scriptName.match(/^script\.js\./)) {
                scriptName = `script.js.${scriptName}`;
            }
            if (!objects[scriptName] || !objects[scriptName].common) {
                sandbox.log('Script does not exist', 'error');
                return false;
            }
            return objects[scriptName].common.enabled;
        },
        startInstanceAsync: async function (instanceName) {
            const objInstanceId = `system.adapter.${instanceName}`;
            const exists = await adapter.foreignObjectExists(objInstanceId);
            if (exists) {
                const instanceObj = await adapter.getForeignObjectAsync(objInstanceId);
                if (instanceObj?.type === 'instance' && !instanceObj.common.enabled) {
                    await adapter.extendForeignObjectAsync(objInstanceId, { common: { enabled: true } });
                    if (sandbox.verbose) {
                        sandbox.log(`startInstanceAsync (instanceName=${instanceName})`, 'info');
                    }
                    return true;
                }
                sandbox.log(`Cannot start instance "${instanceName}", because already running`, 'warn');
            }
            else {
                sandbox.log(`Cannot start instance "${instanceName}", because not found`, 'error');
            }
            return false;
        },
        restartInstanceAsync: async function (instanceName) {
            const objInstanceId = `system.adapter.${instanceName}`;
            const exists = await adapter.foreignObjectExists(objInstanceId);
            if (exists) {
                const instanceObj = await adapter.getForeignObjectAsync(objInstanceId);
                if (instanceObj?.type === 'instance' && instanceObj.common.enabled) {
                    await adapter.extendForeignObjectAsync(objInstanceId, {});
                    if (sandbox.verbose) {
                        sandbox.log(`restartInstanceAsync (instanceName=${instanceName})`, 'info');
                    }
                    return true;
                }
                sandbox.log(`Cannot restart instance "${instanceName}", because not running`, 'warn');
            }
            else {
                sandbox.log(`Cannot restart instance "${instanceName}", because not found`, 'error');
            }
            return false;
        },
        stopInstanceAsync: async function (instanceName) {
            const objInstanceId = `system.adapter.${instanceName}`;
            const exists = await adapter.foreignObjectExists(objInstanceId);
            if (exists) {
                const instanceObj = await adapter.getForeignObjectAsync(objInstanceId);
                if (instanceObj?.type === 'instance' && instanceObj.common.enabled) {
                    await adapter.extendForeignObjectAsync(objInstanceId, { common: { enabled: false } });
                    if (sandbox.verbose) {
                        sandbox.log(`stopInstanceAsync (instanceName=${instanceName})`, 'info');
                    }
                    return true;
                }
                sandbox.log(`Cannot stop instance "${instanceName}", because not running`, 'warn');
            }
            else {
                sandbox.log(`Cannot stop instance "${instanceName}", because not found`, 'error');
            }
            return false;
        },
        // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
        toInt: function (val) {
            if (val === true || val === 'true') {
                val = 1;
            }
            if (val === false || val === 'false') {
                val = 0;
            }
            val = parseInt(val) || 0;
            return val;
        },
        // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
        toFloat: function (val) {
            if (val === true || val === 'true') {
                val = 1;
            }
            if (val === false || val === 'false') {
                val = 0;
            }
            val = parseFloat(val) || 0;
            return val;
        },
        // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
        toBoolean: function (val) {
            if (val === '1' || val === 'true') {
                val = true;
            }
            if (val === '0' || val === 'false') {
                val = false;
            }
            return !!val;
        },
        getAttr: function (obj, path) {
            if (typeof path === 'string') {
                path = path.split('.');
            }
            if (typeof obj === 'string') {
                try {
                    obj = JSON.parse(obj);
                }
                catch (err) {
                    void adapter.setState(`scriptProblem.${name.substring(SCRIPT_CODE_MARKER.length)}`, {
                        val: true,
                        ack: true,
                        c: 'getAttr',
                    });
                    sandbox.log(`Cannot parse "${obj.substring(0, 30)}": ${err}`, 'error');
                    return null;
                }
            }
            const attr = path.shift() || '';
            try {
                obj = obj[attr];
            }
            catch (err) {
                void adapter.setState(`scriptProblem.${name.substring(SCRIPT_CODE_MARKER.length)}`, {
                    val: true,
                    ack: true,
                    c: 'getAttr',
                });
                sandbox.log(`Cannot get ${attr} of "${JSON.stringify(obj)}": ${err}`, 'error');
                return null;
            }
            if (!path.length) {
                return obj;
            }
            const type = typeof obj;
            if (obj === null || obj === undefined || type === 'boolean' || type === 'number') {
                return null;
            }
            return sandbox.getAttr(obj, path);
        },
        messageTo: function (target, data, options, callback) {
            const defaultTimeout = 5000;
            if (typeof target !== 'object') {
                target = { instance: null, script: null, message: target };
            }
            if (typeof options === 'function') {
                callback = options;
                options = { timeout: defaultTimeout };
            }
            let timeout = null;
            if (typeof callback === 'function') {
                const timeoutDuration = parseInt(options?.timeout, 10) || defaultTimeout;
                timeout = setTimeout(() => {
                    timeout = null;
                    if (sandbox.verbose) {
                        sandbox.log(`messageTo => timeout: ${timeoutDuration}`, 'debug');
                    }
                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, { error: 'timeout' }, options, target.instance);
                        }
                        catch (err) {
                            errorInCallback(err);
                        }
                        callback = undefined;
                    }
                }, timeoutDuration);
            }
            let cbFunc;
            if (timeout) {
                cbFunc = function (res) {
                    timeout && clearTimeout(timeout);
                    const result = res;
                    if (sandbox.verbose && result?.result) {
                        sandbox.log(`messageTo => ${JSON.stringify(result)}`, 'debug');
                    }
                    if (sandbox.verbose && result?.error) {
                        sandbox.log(`messageTo => ${result.error}`, 'error');
                    }
                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, result, options, target.instance);
                        }
                        catch (err) {
                            errorInCallback(err);
                        }
                        callback = undefined;
                    }
                };
            }
            if (target.instance || target.instance === 0) {
                if (typeof target.instance === 'string' &&
                    target.instance &&
                    target.instance.startsWith('system.adapter.')) {
                    target.instance = target.instance.substring('system.adapter.'.length);
                }
                else if (typeof target.instance === 'number') {
                    target.instance = `javascript.${target.instance}`;
                }
                adapter.sendTo(target.instance, 'jsMessageBus', { message: target.message, script: target.script, data }, cbFunc);
            }
            else {
                // Send it to all instances
                context.adapter.getObjectView('system', 'instance', { startkey: 'system.adapter.javascript.', endkey: 'system.adapter.javascript.\u9999' }, options, (err, res) => {
                    if (err || !res) {
                        sandbox.log(`messageTo failed: ${err?.message}`, 'error');
                        return;
                    }
                    const len = 'system.adapter.'.length;
                    const instances = res.rows.map(item => item.id.substring(len));
                    instances.forEach(instance => {
                        adapter.sendTo(instance, 'jsMessageBus', { message: target.message, script: target.script, data }, cbFunc);
                    });
                });
            }
        },
        messageToAsync: function (target, data, options) {
            return new Promise((resolve, reject) => {
                sandbox.messageTo(target, data, options, (res) => {
                    const result = res;
                    if (sandbox.verbose) {
                        sandbox.log(`messageTo result => ${JSON.stringify(res)}`, 'debug');
                    }
                    if (!res || result.error) {
                        reject(result ? new Error(result.error) : new Error('Unknown error'));
                    }
                    else {
                        resolve(result);
                    }
                });
            });
        },
        onMessage: function (messageName, callback) {
            if (typeof callback !== 'function') {
                sandbox.log('onMessage callback is not a function', 'error');
                return null;
            }
            context.messageBusHandlers[sandbox.scriptName] = context.messageBusHandlers[sandbox.scriptName] || {};
            context.messageBusHandlers[sandbox.scriptName][messageName] =
                context.messageBusHandlers[sandbox.scriptName][messageName] || [];
            const handler = { id: _handlerIdCounter++, cb: callback, sandbox };
            context.messageBusHandlers[sandbox.scriptName][messageName].push(handler);
            sandbox.__engine.__subscriptionsMessage += 1;
            if (sandbox.__engine.__subscriptionsMessage %
                adapter.config.maxTriggersPerScript ===
                0) {
                sandbox.log(`More than ${sandbox.__engine.__subscriptionsMessage} message subscriptions registered. Check your script!`, 'warn');
            }
            return handler.id;
        },
        onMessageUnregister: function (idOrName) {
            const ctx = context.messageBusHandlers[sandbox.scriptName];
            let found = false;
            if (ctx) {
                if (typeof idOrName === 'number') {
                    outer: for (const messageName of Object.keys(ctx)) {
                        for (let i = 0; i < ctx[messageName].length; i++) {
                            if (ctx[messageName][i].id === idOrName) {
                                ctx[messageName].splice(i, 1);
                                if (!ctx[messageName].length) {
                                    delete ctx[messageName];
                                    sandbox.__engine.__subscriptionsMessage--;
                                }
                                found = true;
                                break outer;
                            }
                        }
                    }
                }
                else if (idOrName && ctx[idOrName]) {
                    delete ctx[idOrName];
                    sandbox.__engine.__subscriptionsMessage--;
                    found = true;
                }
            }
            return found;
        },
        console: {
            log: function (msg) {
                sandbox.log(msg, 'info');
            },
            error: function (msg) {
                sandbox.log(msg, 'error');
            },
            warn: function (msg) {
                sandbox.log(msg, 'warn');
            },
            info: function (msg) {
                sandbox.log(msg, 'info');
            },
            debug: function (msg) {
                sandbox.log(msg, 'debug');
            },
        },
        jsonataExpression: function (data, expression) {
            return jsonata(expression).evaluate(data);
        },
        wait: function (ms) {
            return new Promise((resolve) => {
                sandbox.setTimeout(resolve, ms);
            });
        },
        sleep: function (ms) {
            return sandbox.wait(ms);
        },
        onObject: function (pattern, callback) {
            return sandbox.subscribeObject(pattern, callback);
        },
        subscribeObject: function (pattern, callback) {
            if (Array.isArray(pattern)) {
                const result = [];
                for (let p = 0; p < pattern.length; p++) {
                    result.push(sandbox.subscribeObject(pattern[p], callback));
                }
                return result;
            }
            sandbox.__engine.__subscriptionsObject += 1;
            if (sandbox.__engine.__subscriptionsObject %
                adapter.config.maxTriggersPerScript ===
                0) {
                sandbox.log(`More than ${sandbox.__engine.__subscriptionsObject} object subscriptions registered. Check your script!`, 'warn');
            }
            // source is set by regexp if defined as /regexp/
            if (!pattern || typeof pattern !== 'string') {
                sandbox.log('Error by subscribeObject: pattern can be only string or array of strings.', 'error');
                return null;
            }
            if (typeof callback !== 'function') {
                sandbox.log('Error by subscribeObject: callback is not a function', 'error');
                return null;
            }
            const subs = { pattern, callback, name };
            if (sandbox.verbose) {
                sandbox.log(`subscribeObject: ${JSON.stringify(subs)}`, 'info');
            }
            adapter.subscribeForeignObjects(pattern);
            context.subscriptionsObject.push(subs);
            // Keep O(1) dispatch map in sync
            if (!context.subscriptionsObjectMap.has(pattern)) {
                context.subscriptionsObjectMap.set(pattern, []);
            }
            context.subscriptionsObjectMap.get(pattern).push(subs);
            return subs;
        },
        unsubscribeObject: function (subObject) {
            if (subObject && Array.isArray(subObject)) {
                const result = [];
                for (let t = 0; t < subObject.length; t++) {
                    result.push(sandbox.unsubscribeObject(subObject[t]));
                }
                return result;
            }
            if (sandbox.verbose) {
                sandbox.log(`adapterUnsubscribeObject(id=${JSON.stringify(subObject)})`, 'info');
            }
            for (let i = context.subscriptionsObject.length - 1; i >= 0; i--) {
                if (context.subscriptionsObject[i] === subObject) {
                    adapter.unsubscribeForeignObjects(subObject.pattern);
                    context.subscriptionsObject.splice(i, 1);
                    // Keep O(1) dispatch map in sync
                    const mapSubs = context.subscriptionsObjectMap.get(subObject.pattern);
                    if (mapSubs) {
                        const pos = mapSubs.indexOf(subObject);
                        if (pos !== -1) {
                            mapSubs.splice(pos, 1);
                        }
                        if (!mapSubs.length) {
                            context.subscriptionsObjectMap.delete(subObject.pattern);
                        }
                    }
                    sandbox.__engine.__subscriptionsObject--;
                    return true;
                }
            }
            let deleted = 0;
            for (let i = context.subscriptionsObject.length - 1; i >= 0; i--) {
                if (context.subscriptionsObject[i].name &&
                    context.subscriptionsObject[i].pattern === subObject.pattern) {
                    deleted++;
                    adapter.unsubscribeForeignObjects(subObject.pattern);
                    // Keep O(1) dispatch map in sync
                    const mapSubsP = context.subscriptionsObjectMap.get(subObject.pattern);
                    if (mapSubsP) {
                        const pos = mapSubsP.indexOf(context.subscriptionsObject[i]);
                        if (pos !== -1) {
                            mapSubsP.splice(pos, 1);
                        }
                        if (!mapSubsP.length) {
                            context.subscriptionsObjectMap.delete(subObject.pattern);
                        }
                    }
                    context.subscriptionsObject.splice(i, 1);
                    sandbox.__engine.__subscriptionsObject--;
                }
            }
            return !!deleted;
        },
        // internal function to send the block debugging info to the front-end
        _sendToFrontEnd: function (blockId, data) {
            if (context.rulesOpened === sandbox.scriptName) {
                void adapter.setState('debug.rules', JSON.stringify({ ruleId: sandbox.scriptName, blockId, data, ts: Date.now() }), true);
            }
        },
        existsStateAsync: function (_id) {
            return Promise.reject(new Error('Not implemented'));
        },
        existsObjectAsync: function (_id) {
            return Promise.reject(new Error('Not implemented'));
        },
        getObjectAsync: function (_id, _enumName) {
            return Promise.reject(new Error('Not implemented'));
        },
        setObjectAsync: function (_id, _obj) {
            return Promise.reject(new Error('Not implemented'));
        },
        extendObjectAsync: function (_id, _obj) {
            return Promise.reject(new Error('Not implemented'));
        },
        deleteObjectAsync: function (_id, _isRecursive) {
            return Promise.reject(new Error('Not implemented'));
        },
        createStateAsync: function (_name, _initValue, _forceCreation, _common, _native) {
            return Promise.reject(new Error('Not implemented'));
        },
        createAliasAsync: function (_name, _alias, _forceCreation, _common, _native) {
            return Promise.reject(new Error('Not implemented'));
        },
        deleteStateAsync: function (_id) {
            return Promise.reject(new Error('Not implemented'));
        },
        writeFileAsync: function (_adapter, _fileName, _data) {
            return Promise.reject(new Error('Not implemented'));
        },
        readFileAsync: function (_adapter, _fileName) {
            return Promise.reject(new Error('Not implemented'));
        },
        unlinkAsync: function (_adapter, _fileName) {
            return Promise.reject(new Error('Not implemented'));
        },
        delFileAsync: function (_adapter, _fileName) {
            return Promise.reject(new Error('Not implemented'));
        },
        renameAsync: function (_adapter, _oldName, _newName) {
            return Promise.reject(new Error('Not implemented'));
        },
        renameFileAsync: function (_adapter, _oldName, _newName) {
            return Promise.reject(new Error('Not implemented'));
        },
        getHistoryAsync: function (_instance, _options) {
            return Promise.reject(new Error('Not implemented'));
        },
        httpGetAsync: function (_url, _options) {
            return Promise.reject(new Error('Not implemented'));
        },
        httpPostAsync: function (_url, _data, _options) {
            return Promise.reject(new Error('Not implemented'));
        },
    };
    // Create advanced functions that can modify objects
    if (adapter.config.enableSetObject) {
        sandbox.setObject = function (id, obj, callback) {
            if (id && typeof id === 'string' && id.startsWith('system.adapter.')) {
                sandbox.log(`Using setObject on system object ${id} can be dangerous (protected instance attributes may be lost)`, 'info');
            }
            if (debug) {
                sandbox.log(`setObject(id=${id}, obj=${JSON.stringify(obj)}) - ${words._('was not executed, while debug mode is active')}`, 'warn');
                if (typeof callback === 'function') {
                    setImmediate(function () {
                        try {
                            callback.call(sandbox, null, { id });
                        }
                        catch (err) {
                            errorInCallback(err);
                        }
                    });
                }
            }
            else {
                if (sandbox.verbose) {
                    sandbox.log(`setObject(id=${id}, obj=${JSON.stringify(obj)})`, 'info');
                }
                adapter.setForeignObject(id, obj, (err, res) => {
                    if (!err) {
                        // Update meta object data
                        context.updateObjectContext(id, obj);
                    }
                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, err, res);
                        }
                        catch (err) {
                            errorInCallback(err);
                        }
                    }
                });
            }
        };
        sandbox.extendObject = function (id, obj, callback) {
            if (debug) {
                sandbox.log(`extendObject(id=${id}, obj=${JSON.stringify(obj)}) - ${words._('was not executed, while debug mode is active')}`, 'warn');
                if (typeof callback === 'function') {
                    setTimeout(function () {
                        try {
                            callback.call(sandbox, null, { id });
                        }
                        catch (err) {
                            errorInCallback(err);
                        }
                    }, 0);
                }
            }
            else {
                if (sandbox.verbose) {
                    sandbox.log(`extendObject(id=${id}, obj=${JSON.stringify(obj)})`, 'info');
                }
                let objClone;
                try {
                    objClone = structuredClone(obj);
                }
                catch (err) {
                    // e.g. DataCloneError when the object contains functions
                    void adapter.setState(`scriptProblem.${name.substring(SCRIPT_CODE_MARKER.length)}`, {
                        val: true,
                        ack: true,
                        c: 'extendObject',
                    });
                    sandbox.log(`Object "${id}" can't be copied: ${JSON.stringify(err)}`, 'error');
                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, new Error(`Object "${id}" can't be copied`));
                        }
                        catch (err) {
                            errorInCallback(err);
                        }
                    }
                    return;
                }
                if (callback) {
                    adapter.extendForeignObject(id, objClone, callback);
                }
                else {
                    void adapter.extendForeignObject(id, objClone);
                }
            }
        };
        sandbox.deleteObject = function (id, isRecursive, callback) {
            if (typeof isRecursive === 'function') {
                callback = isRecursive;
                isRecursive = false;
            }
            if (debug) {
                sandbox.log(`deleteObject(id=${id}) - ${words._('was not executed, while debug mode is active')}`, 'warn');
                if (typeof callback === 'function') {
                    setTimeout(function () {
                        try {
                            callback.call(sandbox);
                        }
                        catch (err) {
                            errorInCallback(err);
                        }
                    }, 0);
                }
            }
            else {
                if (sandbox.verbose) {
                    sandbox.log(`deleteObject(id=${id})`, 'info');
                }
                adapter.delForeignObject(id, { recursive: isRecursive }, callback);
            }
        };
    }
    // promisify methods on the sandbox
    sandbox.existsStateAsync = (0, tools_1.promisify)(sandbox.existsState);
    sandbox.existsObjectAsync = (0, tools_1.promisify)(sandbox.existsObject);
    sandbox.getObjectAsync = (0, tools_1.promisify)(sandbox.getObject);
    sandbox.setObjectAsync = (0, tools_1.promisify)(sandbox.setObject);
    sandbox.extendObjectAsync = (0, tools_1.promisify)(sandbox.extendObject);
    sandbox.deleteObjectAsync = (0, tools_1.promisify)(sandbox.deleteObject);
    sandbox.createStateAsync = (0, tools_1.promisify)(sandbox.createState);
    sandbox.createAliasAsync = (0, tools_1.promisify)(sandbox.createAlias);
    sandbox.deleteStateAsync = (0, tools_1.promisify)(sandbox.deleteState);
    sandbox.writeFileAsync = (0, tools_1.promisify)(sandbox.writeFile);
    sandbox.readFileAsync = (0, tools_1.promisify)(sandbox.readFile);
    sandbox.unlinkAsync = (0, tools_1.promisify)(sandbox.unlink);
    sandbox.delFileAsync = (0, tools_1.promisify)(sandbox.delFile);
    sandbox.renameAsync = (0, tools_1.promisify)(sandbox.rename);
    sandbox.renameFileAsync = (0, tools_1.promisify)(sandbox.renameFile);
    sandbox.getHistoryAsync = (0, tools_1.promisify)(sandbox.getHistory);
    sandbox.httpGetAsync = (0, tools_1.promisify)(sandbox.httpGet);
    sandbox.httpPostAsync = (0, tools_1.promisify)(sandbox.httpPost);
    // Make all predefined properties and methods readonly so scripts cannot overwrite them
    for (const prop of Object.keys(sandbox)) {
        Object.defineProperty(sandbox, prop, {
            configurable: false,
            writable: false,
        });
    }
    // Shallow-freeze the console object exposed to scripts to prevent its methods from being overwritten
    // Note: __engine must NOT be frozen because its counter properties are mutated at runtime
    if (sandbox.console && typeof sandbox.console === 'object') {
        Object.freeze(sandbox.console);
    }
    return sandbox;
}
//# sourceMappingURL=sandbox.js.map