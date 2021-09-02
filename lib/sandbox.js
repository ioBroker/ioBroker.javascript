/// <reference path="./javascript.d.ts" />
/* jslint global: console */
/* eslint-env node */

'use strict';

const { isObject, isArray, promisify } = require('./tools');

// let context = {
//     adapter,
//     mods,
//     errorLogFunction,
//     subscriptions,
//     subscribedPatterns,
//     states,
//     adapterSubs,
//     objects,
//     cacheObjectEnums,
//     stateIds,
//     logWithLineInfo,
//     timers,
//     enums,
//     channels,
//     devices,
//     isEnums
// };

/**
 * @typedef {Object} SandboxContext
 * @property {Record<string, string[]>} channels
 * @property {Record<string, string[]>} devices
 * @property {string[]} stateIds
 */

/**
 * @param {{[prop: string]: any} & SandboxContext} context
 */
function sandBox(script, name, verbose, debug, context) {
    const consts   = require('./consts');
    const words    = require('./words');
    const eventObj = require('./eventObj');
    const patternCompareFunctions = require('./patternCompareFunctions');
    const nodeSchedule = require('node-schedule');
    const jsonata = require('jsonata');

    /** @type {ioBroker.Adapter} */
    const adapter   = context.adapter;
    const mods      = context.mods;
    const states    = context.states;
    const objects   = context.objects;
    const timers    = context.timers;
    const enums     = context.enums;
    const debugMode = context.debugMode;

    function errorInCallback(e) {
        adapter.setState('scriptProblem.' + name.substring('script.js.'.length), true, true);
        context.logError('Error in callback', e);
        context.debugMode && console.log(`error$$${name}$$Exception in callback: ${e}`, Date.now());
    }

    function unsubscribePattern(script, pattern) {
        if (adapter.config.subscribe) {
            if (script.subscribes[pattern]) {
                script.subscribes[pattern]--;
                if (!script.subscribes[pattern]) delete script.subscribes[pattern];
            }

            if (context.subscribedPatterns[pattern]) {
                context.subscribedPatterns[pattern]--;
                if (!context.subscribedPatterns[pattern]) {
                    adapter.unsubscribeForeignStates(pattern);
                    delete context.subscribedPatterns[pattern];

                    // if pattern was regex or with * some states will stay in RAM, but it is OK.
                    if (states[pattern]) {
                        delete states[pattern];
                    }
                }
            }
        }
    }

    function subscribePattern(script, pattern) {
        if (adapter.config.subscribe) {
            if (!script.subscribes[pattern]) {
                script.subscribes[pattern] = 1;
            } else {
                script.subscribes[pattern]++;
            }

            if (!context.subscribedPatterns[pattern]) {
                context.subscribedPatterns[pattern] = 1;
                adapter.subscribeForeignStates(pattern);

                // request current value to deliver old value on change.
                if (typeof pattern === 'string' && !pattern.includes('*')) {
                    adapter.getForeignState(pattern, (err, state) => {
                        if (state) {
                            states[pattern] = state;
                        }
                    });
                } else {
                    adapter.getForeignStates(pattern, (err, _states) =>
                        _states && Object.keys(_states).forEach(id => states[id] = _states[id]));
                }
            } else {
                context.subscribedPatterns[pattern]++;
            }
        }
    }

    /**
     * @typedef PatternCompareFunctionArray
     * @type {Array<any> & {logic?: string}}
     */

    function getPatternCompareFunctions(pattern) {
        let func;
        /** @type {PatternCompareFunctionArray} */
        const functions = [];
        functions.logic = pattern.logic || 'and';
        //adapter.log.info('## '+JSON.stringify(pattern));
        for (const key in pattern) {
            if (!pattern.hasOwnProperty(key)) continue;
            if (key === 'logic') continue;
            if (key === 'change' && pattern.change === 'any') continue;
            if (!(func = patternCompareFunctions[key])) continue;
            if (typeof (func = func(pattern)) !== 'function') continue;
            functions.push(func);
        }
        return functions;
    }

    /** @typedef {{attr: string, value: string, idRegExp?: RegExp}} Selector */
    /**
     * Splits a selector string into attribute and value
     * @param {string} selector The selector string to split
     * @returns {Selector}
     */
    function splitSelectorString(selector) {
        const parts = selector.split('=', 2);
        if (parts[1] && parts[1][0] === '"') {
            parts[1] = parts[1].substring(1);
            const len = parts[1].length;
            if (parts[1] && parts[1][len - 1] === '"') parts[1] = parts[1].substring(0, len - 1);
        }
        if (parts[1] && parts[1][0] === "'") {
            parts[1] = parts[1].substring(1);
            const len = parts[1].length;
            if (parts[1] && parts[1][len - 1] === "'") parts[1] = parts[1].substring(0, len - 1);
        }

        if (parts[1]) parts[1] = parts[1].trim();
        parts[0] = parts[0].trim();

        return {attr: parts[0], value: parts[1]};
    }

    /**
     * Transforms a selector string with wildcards into a regular expression
     * @param {string} str The selector string to transform into a regular expression
     */
    function selectorStringToRegExp(str) {
        const startsWithWildcard = str[0] === '*';
        const endsWithWildcard = str[str.length - 1] === '*';

        // Sanitize the selector so it is safe to use in a RegEx
        // Taken from https://stackoverflow.com/a/3561711/10179833 but modified
        // since * has a special meaning in our selector and should not be escaped
        // eslint-disable-next-line no-useless-escape
        str = str.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\*/g, '.*');

        return new RegExp(
            (startsWithWildcard ? '' : '^')
            + str
            + (endsWithWildcard ? '' : '$')
        );
    }

    /**
     * Adds a regular expression for selectors targeting the state ID
     * @param {Selector} selector The selector to apply the transform to
     * @returns {Selector}
     */
    function addRegExpToIdAttrSelectors(selector) {
        if (
            (selector.attr === 'id' || selector.attr === 'state.id')
            && (!selector.idRegExp && selector.value)
        ) {
            return {
                attr: selector.attr,
                value: selector.value,
                idRegExp: selectorStringToRegExp(selector.value)
            };
        } else {
            return selector;
        }
    }

    /**
     * Tests if a value loosely equals (==) the reference string.
     * In contrast to the equality operator, this treats true == "true" aswell
     * so we can test common and native attributes for boolean values
     * @param {boolean | string | number | undefined} value The value to compare with the reference
     * @param {string} reference The reference to compare the value to
     */
    function looselyEqualsString(value, reference) {
        // For booleans, compare the string representation
        // For other types do a loose comparison
        return (typeof value === 'boolean')
            ? (value && reference === 'true') || (!value && reference === 'false')
            : value == reference
        ;
    }

    /**
     * Returns the common.type for a given variable
     * @param {any} value
     * @returns {iobJS.CommonType}
     */
    function getCommonTypeOf(value) {
        // @ts-ignore we do not support bigint
        return isArray(value) ? 'array'
            : (isObject(value) ? 'object'
                : typeof value);
    }

    function setStateHelper(sandbox, isBinary, id, state, isAck, callback) {
        const setStateFunc = isBinary ? adapter.setBinaryState.bind(adapter) : adapter.setForeignState.bind(adapter);

        if (typeof isAck === 'function') {
            callback = isAck;
            isAck = undefined;
        }

        if (!isBinary) {
            if (state === null) {
                state = {val: null};
            }

            if (isAck === true || isAck === false || isAck === 'true' || isAck === 'false') {
                if (isObject(state) && state.val !== undefined) {
                    // we assume that we were given a state object if
                    // state is an object that contains a `val` property
                    state.ack = isAck;
                } else {
                    // otherwise assume that the given state is the value to be set
                    state = {val: state, ack: isAck};
                }
            }
        }

        // Check type of state
        if (!objects[id] && objects[adapter.namespace + '.' + id]) {
            id = adapter.namespace + '.' + id;
        }

        const common = objects[id] ? objects[id].common : null;
        if (common &&
            common.type &&
            common.type !== 'mixed' &&
            common.type !== 'file'  &&
            common.type !== 'json'
        ) {
            // Find out which type the value has
            let actualCommonType;
            if (state && isObject(state) && state.val !== undefined && state.val !== null) {
                actualCommonType = getCommonTypeOf(state.val);
            } else if (state !== null) {
                actualCommonType = getCommonTypeOf(state);
            }
            // If this is not the expected one, issue a warning
            if (actualCommonType && actualCommonType !== common.type) {
                context.logWithLineInfo && context.logWithLineInfo.warn(
                    `You are assigning a ${actualCommonType} to the state "${id}" which expects a ${common.type}. `
                    + `Please fix your code to use a ${common.type} or change the state type to ${actualCommonType}. `
                    + `This warning might become an error in future versions.`
                );
            }
            if (!isBinary && (actualCommonType === 'array' || actualCommonType === 'object')) {
                try {
                    if (isObject(state) && typeof state.val !== 'undefined') {
                        state.val = JSON.stringify(state.val);
                    } else {
                        state = JSON.stringify(state);
                    }
                } catch (err) {
                    context.logWithLineInfo && context.logWithLineInfo.warn(`Could not stringify value for type ${actualCommonType} and id ${id}: ${err.message}`);
                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, `Could not stringify value for type ${actualCommonType} and id ${id}: ${err.message}`);
                        } catch (e) {
                            errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                        }
                    }
                }
            }
        }
        // Check min and max of value
        if (!isBinary && isObject(state)) {
            if (common && typeof state.val === 'number') {
                if (common.min !== undefined && state.val < common.min) state.val = common.min;
                if (common.max !== undefined && state.val > common.max) state.val = common.max;
            }
        } else if (!isBinary && common && typeof state === 'number') {
            if (common.min !== undefined && state < common.min) state = common.min;
            if (common.max !== undefined && state > common.max) state = common.max;
        }

        // modify state here, to make it available in callback
        if (!isBinary && (!isObject(state) || state.val === undefined)) {
            state = {val: state};
            state.ack = isAck || false;
        }

        // set as comment: from which script this state was set.
        if (!isBinary) {
            state.c = sandbox.name;
        }

        if (objects[id]) {
            sandbox.verbose && sandbox.log(`setForeignState(id=${id}, state=${JSON.stringify(state)})`, 'info');

            if (debug) {
                sandbox.log(`setForeignState(id=${id}, state=${JSON.stringify(state)}) - ${words._('was not executed, while debug mode is active')}`, 'warn');

                if (typeof callback === 'function') {
                    setTimeout(() => {
                        try {
                            callback.call(sandbox);
                        } catch (e) {
                            errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                        }
                    }, 0);
                }
            } else {
                setStateFunc(id, state, err => {
                    err && sandbox.log('setForeignState: ' + err, 'error');

                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox);
                        } catch (e) {
                            errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                        }
                    }
                });
            }
        }
        else if (objects[adapter.namespace + '.' + id]) {
            sandbox.verbose && sandbox.log(`setState(id=${id}, state=${JSON.stringify(state)})`, 'info');

            if (debug) {
                sandbox.log(`setState(${id}, ${JSON.stringify(state)}) - ${words._('was not executed, while debug mode is active')}`, 'warn');
                if (typeof callback === 'function') {
                    setTimeout(() => {
                        try {
                            callback.call(sandbox);
                        } catch (e) {
                            errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                        }
                    }, 0);
                }
            } else {
                // If adapter holds all states in memory
                let oldState;
                if (adapter.config.subscribe) {
                    oldState = states[id];
                    states[adapter.namespace + '.' + id] = state; // store actual state to make possible to process value in callback
                }
                setStateFunc(adapter.namespace + '.' + id, state, err => {
                    err && sandbox.log('setState: ' + err, 'error');
                    // If adapter holds all states
                    if (err && adapter.config.subscribe) {
                        states[id] = oldState; // revert value because of error
                    }
                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox);
                        } catch (e) {
                            errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                        }
                    }
                });
            }
        } else {
            context.logWithLineInfo && context.logWithLineInfo.warn(`State "${id}" not found`);
            if (typeof callback === 'function') {
                try {
                    callback.call(sandbox, 'State "' + id + '" not found');
                } catch (e) {
                    errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                }
            }
        }
    }

    const sandbox = {
        mods,
        _id:       script._id,
        name, // deprecated
        scriptName: name,
        instance:  adapter.instance,
        verbose,
        request:   mods.request,
        exports:   {}, // Polyfill for the exports object in TypeScript modules
        require:   function (md) {
            if (mods[md]) {
                return mods[md];
            } else {
                try {
                    mods[md] = require(`${__dirname}/../node_modules/${md}`);
                    return mods[md];
                } catch (e) {
                    try {
                        mods[md] = require(`${__dirname}/../../${md}`);
                        return mods[md];
                    } catch (e) {
                        adapter.setState('scriptProblem.' + name.substring('script.js.'.length), true, true);
                        context.logError(name, e, 6);
                    }
                }
            }
        },
        Buffer:    Buffer,
        __engine: {
            __subscriptionsObject: 0,
            __subscriptions: 0,
            __schedules: 0,
        },
        /**
         * @param {string} selector
         * @returns {iobJS.QueryResult}
         */
        $:              function (selector) {
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

            /** @type {iobJS.QueryResult} */
            const result             = {};

            let name                 = '';
            /** @type {string[]} */
            const commonStrings      = [];
            /** @type {string[]} */
            const enumStrings        = [];
            /** @type {string[]} */
            const nativeStrings      = [];
            let isInsideName         = true;
            let isInsideCommonString = false;
            let isInsideEnumString   = false;
            let isInsideNativeString = false;
            let currentCommonString  = '';
            let currentNativeString  = '';
            let currentEnumString    = '';

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
                    } else if (selector[i] === '}') {
                        isInsideNativeString = false;
                        nativeStrings.push(currentNativeString);
                        currentNativeString = '';
                    } else if (selector[i] === '[') {
                        isInsideName = false;
                        if (isInsideCommonString || isInsideEnumString || isInsideNativeString) {
                            // Error
                            break;
                        }
                        isInsideCommonString = true;
                    } else if (selector[i] === ']') {
                        isInsideCommonString = false;
                        commonStrings.push(currentCommonString);
                        currentCommonString = '';
                    } else if (selector[i] === '(') {
                        isInsideName = false;
                        if (isInsideCommonString || isInsideEnumString || isInsideNativeString) {
                            // Error
                            break;
                        }
                        isInsideEnumString = true;
                    } else if (selector[i] === ')') {
                        isInsideEnumString = false;
                        enumStrings.push(currentEnumString);
                        currentEnumString = '';
                    } else if (isInsideName) {
                        name += selector[i];
                    } else if (isInsideCommonString) {
                        currentCommonString += selector[i];
                    } else if (isInsideEnumString) {
                        currentEnumString += selector[i];
                    } else if (isInsideNativeString) {
                        currentNativeString += selector[i];
                    } //else {
                    // some error
                    //}
                }
            } else {
                selectorHasInvalidType = true;
            }

            // If some error in the selector
            if (selectorHasInvalidType || isInsideEnumString || isInsideCommonString || isInsideNativeString) {
                result.length = 0;
                result.each = function () {
                    return this;
                };
                result.getState = function () {
                    return null;
                };
                result.setState = function () {
                    return this;
                };
                result.setBinaryState = function () {
                    return this;
                };
                result.on = function () {
                    return this;
                };
            }

            if (isInsideEnumString) {
                adapter.log.warn('Invalid selector: enum close bracket ")" cannot be found in "' + selector + '"');
                result.error = 'Invalid selector: enum close bracket ")" cannot be found';
                return result;
            } else if (isInsideCommonString) {
                adapter.log.warn('Invalid selector: common close bracket "]" cannot be found in "' + selector + '"');
                result.error = 'Invalid selector: common close bracket "]" cannot be found';
                return result;
            } else if (isInsideNativeString) {
                adapter.log.warn('Invalid selector: native close bracket "}" cannot be found in "' + selector + '"');
                result.error = 'Invalid selector: native close bracket "}" cannot be found';
                return result;
            } else if (selectorHasInvalidType) {
                const message = `Invalid selector: selector must be a string but is of type ${typeof selector}`;
                adapter.log.warn(message);
                result.error = message;
                return result;
            }

            /** @type {Selector[]} */
            let commonSelectors = commonStrings.map(selector => splitSelectorString(selector));
            let nativeSelectors = nativeStrings.map(selector => splitSelectorString(selector));
            const enumSelectorObjects = enumStrings.map(_enum => splitSelectorString(_enum));
            const allSelectors = commonSelectors.concat(nativeSelectors, enumSelectorObjects);

            // These selectors match the state or object ID and don't belong in the common/native selectors
            // Also use RegExp for the ID matching
            const stateIdSelectors = allSelectors
                .filter(selector => selector.attr === 'state.id')
                .map(selector => addRegExpToIdAttrSelectors(selector))
                ;
            const objectIdSelectors = allSelectors
                .filter(selector => selector.attr === 'id')
                .map(selector => addRegExpToIdAttrSelectors(selector))
                ;

            commonSelectors = commonSelectors.filter(selector => selector.attr !== 'state.id' && selector.attr !== 'id');
            nativeSelectors = nativeSelectors.filter(selector => selector.attr !== 'state.id' && selector.attr !== 'id');
            const enumSelectors = enumSelectorObjects
                .filter(selector => selector.attr !== 'state.id' && selector.attr !== 'id')
                // enums are filtered by their enum id, so transform the selector into that
                .map(selector => `enum.${selector.attr}.${selector.value}`)
            ;

            name = name.trim();
            if (name === 'channel' || name === 'device') {
                // Fill the channels and devices objects with the IDs of all their states
                // so we can loop over them afterwards
                if (!context.channels || !context.devices) {
                    context.channels = {};
                    context.devices  = {};
                    for (const _id in objects) {
                        if (objects.hasOwnProperty(_id) && objects[_id].type === 'state') {
                            const parts = _id.split('.');
                            parts.pop();
                            const chn = parts.join('.');

                            parts.pop();
                            const dev = parts.join('.');

                            context.devices[dev] = context.devices[dev] || [];
                            context.devices[dev].push(_id);

                            context.channels[chn] = context.channels[chn] || [];
                            context.channels[chn].push(_id);
                        }
                    }
                }
            }

            if (name === 'schedule') {
                if (!context.schedules) {
                    context.schedules = [];
                    for (const _id in objects) {
                        if (objects.hasOwnProperty(_id) && objects[_id].type === 'schedule') {
                            context.schedules.push(_id);
                        }
                    }
                }
            }

            /**
             * applies all selectors targeting an object or state ID
             * @param {string} objId
             * @param {Selector[]} selectors
             */
            function applyIDSelectors(objId, selectors) {
                // Only keep the ID if it matches every ID selector
                return selectors.every(selector =>
                    !selector.idRegExp || selector.idRegExp.test(objId));
            }

            /**
             * Applies all selectors targeting the Object common properties
             * @param {string} objId - The ID of the object in question
             */
            function applyCommonSelectors(objId) {
                const obj = objects[objId];
                if (!obj || !obj.common) return false;
                const objCommon = obj.common;

                // make sure this object satisfies all selectors
                return commonSelectors.every(selector =>
                    // ensure a property exists
                    (selector.value === undefined && objCommon[selector.attr] !== undefined)
                    // or match exact values
                    || looselyEqualsString(objCommon[selector.attr], selector.value));
            }

            /**
             * Applies all selectors targeting the Object native properties
             * @param {string} objId - The ID of the object in question
             */
            function applyNativeSelectors(objId) {
                const obj = objects[objId];
                if (!obj || !obj.native) return false;
                const objNative = obj.native;
                // make sure this object satisfies all selectors
                return nativeSelectors.every(selector =>
                    // ensure a property exists
                    (selector.value === undefined && objNative[selector.attr] !== undefined)
                    // or match exact values
                    || looselyEqualsString(objNative[selector.attr], selector.value));
            }

            /**
             * Applies all selectors targeting the Objects enums
             * @param {string} objId - The ID of the object in question
             */
            function applyEnumSelectors(objId) {
                const enumIds = [];
                eventObj.getObjectEnumsSync(context, objId, enumIds);
                // make sure this object satisfies all selectors
                return enumSelectors.every(_enum => enumIds.includes(_enum));
            }

            /** @type {string[]} */
            let res = [];

            if (name === 'schedule') {
                res = context.schedules;
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
            } else
            if (name === 'channel') {
                if (!context.channels) {
                    // TODO: fill the channels and maintain them on all places where context.stateIds will be changed
                }

                // go through all channels
                res = Object.keys(context.channels);
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
                res = res.map(id => context.channels[id])
                    // and flatten the array to get only the state IDs
                    .reduce((acc, next) => acc.concat(next), []);

                // now filter out those that don't match every ID selector for the state ID
                if (stateIdSelectors.length) {
                    res = res.filter(stateId => applyIDSelectors(stateId, stateIdSelectors));
                }
            } else if (name === 'device') {
                if (!context.devices) {
                    // TODO: fill the devices and maintain them on all places where context.stateIds will be changed
                }

                // go through all devices
                res = Object.keys(context.devices);
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
                res = res.map(id => context.devices[id])
                    // and flatten the array to get only the state IDs
                    .reduce((acc, next) => acc.concat(next), []);

                // now filter out those that don't match every ID selector for the state ID
                if (stateIdSelectors.length) {
                    res = res.filter(stateId => applyIDSelectors(stateId, stateIdSelectors));
                }
            } else {
                // go through all states
                res = context.stateIds;
                // if the "name" is not state then we filter for the ID as well
                if (name && name !== 'state') {
                    const r = new RegExp('^' + name.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
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

            for (let i = 0; i < res.length; i++) {
                result[i] = res[i];
            }
            result.length = res.length;
            // Implementing the Symbol.iterator contract makes the query result iterable
            result[Symbol.iterator] = function*() {
                for (let i = 0; i < result.length; i++) {
                    yield result[i];
                }
            };
            result.each = function (callback) {
                if (typeof callback === 'function') {
                    let r;
                    for (let i = 0; i < this.length; i++) {
                        r = callback(result[i], i);
                        if (r === false) break;
                    }
                }
                return this;
            };
            result.getState = function (callback) {
                if (adapter.config.subscribe) {
                    if (typeof callback !== 'function') {
                        sandbox.log('You cannot use this function synchronous', 'error');
                    } else {
                        adapter.getForeignState(this[0], (err, state) => callback(err, context.convertBackStringifiedValues(this[0], state)));
                    }
                } else {
                    return this[0] ? context.convertBackStringifiedValues(this[0], states[this[0]]) : null;
                }
            };
            result.getStateAsync = async function() {
                if (adapter.config.subscribe) {
                    const state = await adapter.getForeignStateAsync(this[0]);
                    return context.convertBackStringifiedValues(this[0], state);
                } else {
                    return this[0] ? context.convertBackStringifiedValues(this[0], states[this[0]]) : null;
                }
            };
            result.getBinaryState = function (callback) {
                if (adapter.config.subscribe) {
                    if (typeof callback !== 'function') {
                        sandbox.log('You cannot use this function synchronous', 'error');
                    } else {
                        adapter.getBinaryState(this[0], callback);
                    }
                } else {
                    return this[0] ? states[this[0]] : null;
                }
            };
            result.getBinaryStateAsync = function() {
                if (adapter.config.subscribe) {
                    return adapter.getBinaryStateAsync(this[0]);
                } else {
                    return this[0] ? states[this[0]] : null;
                }
            };
            result.setState = function (state, isAck, callback) {
                if (typeof isAck === 'function') {
                    callback = isAck;
                    isAck = undefined;
                }
                result.setStateAsync(state, isAck).then(() => {
                    if (typeof callback === 'function') callback();
                });
                return this;
            };
            result.setStateAsync = async function (state, isAck) {
                for (let i = 0; i < this.length; i++) {
                    await sandbox.setStateAsync(this[i], state, isAck);
                }
            };
            result.setBinaryState = function (state, isAck, callback) {
                if (typeof isAck === 'function') {
                    callback = isAck;
                    isAck = undefined;
                }
                result.setBinaryStateAsync(state, isAck).then(() => {
                    if (typeof callback === 'function') callback();
                });
                return this;
            };
            result.setBinaryStateAsync = async function (state, isAck) {
                if (isAck === true || isAck === false || isAck === 'true' || isAck === 'false') {
                    if (isObject(state)) {
                        state.ack = isAck;
                    } else {
                        state = {val: state, ack: isAck};
                    }
                }
                for (let i = 0; i < this.length; i++) {
                    await adapter.setBinaryStateAsync(this[i], state);
                }
            };
            result.on = function (callbackOrId, value) {
                for (let i = 0; i < this.length; i++) {
                    sandbox.subscribe(this[i], callbackOrId, value);
                }
                return this;
            };
            return result;
        },
        log:            function (msg, severity) {
            severity = severity || 'info';

            // disable log in log handler
            if (sandbox.logHandler === severity || sandbox.logHandler === '*') {
                return;
            }

            if (!adapter.log[severity]) {
                msg = `Unknown severity level "${severity}" by log of [${msg}]`;
                severity = 'warn';
            }
            // we cannot use here (msg instanceof Date) because vm converts object to something else, but Date.
            if (typeof msg === 'object' && msg && typeof msg.getMonth !== 'function') { // we can use `Object.prototype.toString.call(msg) === '[object Date]'` too.
                msg = JSON.stringify(msg).replace(/"/g,'\'');
            }
            if (debugMode) {
                console.log(`${severity}$$${name}$$${msg}`, Date.now());
            } else {
                adapter.log[severity](`${name}: ${msg}`);
            }
        },
        /**
         * @param {string} severity
         * @param {function} callback
         * @returns {number}
         */
        onLog:          function (severity, callback) {
            if (severity !== 'info' && severity !== 'error' && severity !== 'debug'&& severity !== 'silly' && severity !== 'warn' && severity !== '*') {
                adapter.log.warn(name + ': Unknown severity "' + severity + '"');
                return 0;
            }
            if (typeof callback !== 'function') {
                adapter.log.warn(name + ': invalid callback');
                return 0;
            }
            const handler = {id: Date.now() + Math.floor(Math.random() * 10000), cb: callback, sandbox, severity};
            context.logSubscriptions[sandbox.name] = context.logSubscriptions[sandbox.name] || [];
            context.logSubscriptions[sandbox.name].push(handler);
            context.updateLogSubscriptions();
        },
        onLogUnregister: function (idOrCallbackOrSeverity) {
            let found = false;
            if (context.logSubscriptions[sandbox.name]) {
                for (let i = 0; i < context.logSubscriptions[sandbox.name].length ; i++) {
                    if (context.logSubscriptions[sandbox.name][i].cb       === idOrCallbackOrSeverity ||
                        context.logSubscriptions[sandbox.name][i].id       === idOrCallbackOrSeverity ||
                        context.logSubscriptions[sandbox.name][i].severity === idOrCallbackOrSeverity) {
                        context.logSubscriptions[sandbox.name].splice(i, 1);
                        if (!context.logSubscriptions[sandbox.name].length) {
                            delete context.logSubscriptions[sandbox.name];
                        }
                        found = true;

                        // if not deletion via ID
                        if (typeof idOrCallbackOrSeverity === 'number') {
                            break;
                        }
                    }
                }
            }

            if (found) {
                context.updateLogSubscriptions();
            }

            return found;
        },
        exec:           function (cmd, callback) {
            if (!adapter.config.enableExec) {
                const error = 'exec is not available. Please enable "Enable Exec" option in instance settings';
                adapter.log.error(error);
                sandbox.log(error);
                if (typeof callback === 'function') {
                    setImmediate(callback, error);
                }
            } else {
                if (sandbox.verbose) {
                    sandbox.log('exec: ' + cmd, 'info');
                }
                if (debug) {
                    sandbox.log(words._('Command %s was not executed, while debug mode is active', cmd), 'warn');
                    if (typeof callback === 'function') {
                        setImmediate(function () {
                            callback();
                        });
                    }
                } else {
                    return mods.child_process.exec(cmd, callback);
                }
            }
        },
        email:          function (msg) {
            sandbox.verbose && sandbox.log('email(msg=' + JSON.stringify(msg) + ')', 'info');
            adapter.sendTo('email', msg);
        },
        pushover:       function (msg) {
            sandbox.verbose && sandbox.log('pushover(msg=' + JSON.stringify(msg) + ')', 'info');
            adapter.sendTo('pushover', msg);
        },
        subscribe:      function (pattern, callbackOrId, value) {
            if ((typeof pattern === 'string' && pattern[0] === '{') || (typeof pattern === 'object' && pattern.period)) {
                return sandbox.schedule(pattern, callbackOrId);
            } else
            if (pattern && Array.isArray(pattern)) {
                const result = [];
                for (let t = 0; t < pattern.length; t++) {
                    result.push(sandbox.subscribe(pattern[t], callbackOrId, value));
                }
                return result;
            }

            // detect subscribe('id', 'any', (obj) => {})
            if ((typeof pattern === 'string' || pattern instanceof RegExp) && typeof callbackOrId === 'string' && typeof value === 'function') {
                pattern = {id: pattern, change: callbackOrId};
                callbackOrId = value;
                value = undefined;
            }

            if (pattern && pattern.id && Array.isArray(pattern.id)) {
                const result_ = [];
                for (let tt = 0; tt < pattern.id.length; tt++) {
                    const pa = JSON.parse(JSON.stringify(pattern));
                    pa.id = pattern.id[tt];
                    result_.push(sandbox.subscribe(pa, callbackOrId, value));
                }
                return result_;
            }

            // try to detect astro or cron (by spaces)
            if (isObject(pattern) || (typeof pattern === 'string' && pattern.match(/[,/\d*]+\s[,/\d*]+\s[,/\d*]+/))) {
                if (pattern.astro) {
                    return sandbox.schedule(pattern, callbackOrId);
                } else if (pattern.time) {
                    return sandbox.schedule(pattern.time, callbackOrId);
                }
            }

            let callback;

            sandbox.__engine.__subscriptions += 1;

            // source is set by regexp if defined as /regexp/
            if (!isObject(pattern) || pattern instanceof RegExp || pattern.source) {
                pattern = {id: pattern, change: 'ne'};
            }

            if (pattern.id !== undefined && !pattern.id) {
                adapter.log.error('Error by subscription: empty ID defined. All states matched.');
                return;
            }

            if (pattern.q === undefined) {
                pattern.q = 0;
            }

            // add adapter namespace if nothing given
            if (pattern.id && typeof pattern.id === 'string' && !pattern.id.includes('.')) {
                pattern.id = adapter.namespace + '.' + pattern.id;
            }

            if (typeof callbackOrId === 'function') {
                callback = callbackOrId;
            } else {
                if (typeof value === 'undefined') {
                    callback = function (obj) {
                        sandbox.setState(callbackOrId, obj.newState.val);
                    };
                } else {
                    callback = function (/* obj */) {
                        sandbox.setState(callbackOrId, value);
                    };
                }
            }

            const subs = {
                pattern,
                callback: obj => {
                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, obj);
                        } catch (e) {
                            errorInCallback(e); // adapter.log.error('Error in callback: ' + e);
                        }
                    }
                },
                name,
            };

            // try to extract adapter
            if (pattern.id && typeof pattern.id === 'string') {
                const parts = pattern.id.split('.');
                const a = parts[0] + '.' + parts[1];
                const _adapter = 'system.adapter.' + a;

                if (objects[_adapter] && objects[_adapter].common && objects[_adapter].common.subscribable) {
                    const alive = 'system.adapter.' + a + '.alive';
                    context.adapterSubs[alive] = context.adapterSubs[alive] || [];

                    const subExists = context.adapterSubs[alive].filter(sub => sub === pattern.id).length > 0;

                    if (!subExists) {
                        context.adapterSubs[alive].push(pattern.id);
                        adapter.sendTo(a, 'subscribe', pattern.id);
                    }
                }
            }
            sandbox.verbose && sandbox.log('subscribe: ' + JSON.stringify(subs), 'info');

            subscribePattern(script, pattern.id);

            subs.patternCompareFunctions = getPatternCompareFunctions(pattern);
            context.subscriptions.push(subs);

            if (pattern.enumName || pattern.enumId) {
                context.isEnums = true;
            }
            return subs;
        },
        getSubscriptions: function () {
            const result = {};
            for (let s = 0; s < context.subscriptions.length; s++) {
                result[context.subscriptions[s].pattern.id] = result[context.subscriptions[s].pattern.id] || [];
                result[context.subscriptions[s].pattern.id].push({name: context.subscriptions[s].name, pattern: context.subscriptions[s].pattern});
            }
            sandbox.verbose && sandbox.log('getSubscriptions() => ' + JSON.stringify(result), 'info');
            return result;
        },
        adapterSubscribe: function (id) {
            if (typeof id !== 'string') {
                adapter.log.error('adapterSubscribe: invalid type of id' + typeof id);
                return;
            }
            const parts = id.split('.');
            const _adapter = 'system.adapter.' + parts[0] + '.' + parts[1];
            if (objects[_adapter] && objects[_adapter].common && objects[_adapter].common.subscribable) {
                const a = parts[0] + '.' + parts[1];
                const alive = 'system.adapter.' + a + '.alive';
                context.adapterSubs[alive] = context.adapterSubs[alive] || [];
                context.adapterSubs[alive].push(id);
                sandbox.verbose && sandbox.log('adapterSubscribe: ' + a + ' - ' + id, 'info');
                adapter.sendTo(a, 'subscribe', id);
            }
        },
        adapterUnsubscribe: function (id) {
            return sandbox.unsubscribe(id);
        },
        unsubscribe:    function (idOrObject) {
            if (idOrObject && Array.isArray(idOrObject)) {
                const result = [];
                for (let t = 0; t < idOrObject.length; t++) {
                    result.push(sandbox.unsubscribe(idOrObject[t]));
                }
                return result;
            }
            sandbox.verbose && sandbox.log('adapterUnsubscribe(id=' + idOrObject + ')', 'info');
            if (isObject(idOrObject)) {
                for (let i = context.subscriptions.length - 1; i >= 0; i--) {
                    if (context.subscriptions[i] === idOrObject) {
                        unsubscribePattern(script, context.subscriptions[i].pattern.id);
                        context.subscriptions.splice(i, 1);
                        sandbox.__engine.__subscriptions--;
                        return true;
                    }
                }
            } else {
                let deleted = 0;
                for (let i = context.subscriptions.length - 1; i >= 0; i--) {
                    if (context.subscriptions[i].name === name && context.subscriptions[i].pattern.id === idOrObject) {
                        deleted++;
                        unsubscribePattern(script, context.subscriptions[i].pattern.id);
                        context.subscriptions.splice(i, 1);
                        sandbox.__engine.__subscriptions--;
                    }
                }
                return !!deleted;
            }
        },
        on:             function (pattern, callbackOrId, value) {
            return sandbox.subscribe(pattern, callbackOrId, value);
        },
        /** Registers a one-time subscription which automatically unsubscribes after the first invocation */
        once: function (pattern, callback) {
            function _once(cb) {
                /** @type {iobJS.StateChangeHandler} */
                const handler = (obj) => {
                    sandbox.unsubscribe(subscription);
                    typeof cb === 'function' && cb(obj);
                };
                const subscription = sandbox.subscribe(pattern, handler);
                return subscription;
            }
            if (typeof callback === 'function') {
                // Callback-style: once("id", (obj) => { ... })
                return _once(callback);
            } else {
                // Promise-style: once("id").then(obj => { ... })
                return new Promise(resolve => _once(resolve));
            }
        },
        schedule:       function (pattern, callback) {
            if (typeof callback !== 'function') {
                adapter.log.error(name + ': schedule callback missing');
                return;
            }

            sandbox.__engine.__schedules += 1;

            if ((typeof pattern === 'string' && pattern[0] === '{') || (typeof pattern === 'object' && pattern.period)) {
                sandbox.verbose && sandbox.log('schedule(wizard=' + (typeof pattern === 'object' ? JSON.stringify(pattern) : pattern) + ')', 'info');
                const schedule = context.scheduler.add(pattern, sandbox.name, callback);
                schedule && script.wizards.push(schedule);
                return schedule;
            }

            if (typeof pattern === 'object' && pattern.astro) {
                const nowdate = new Date();

                if (adapter.config.latitude === undefined || adapter.config.longitude === undefined ||
                    adapter.config.latitude === ''        || adapter.config.longitude === '' ||
                    adapter.config.latitude === null      || adapter.config.longitude === null) {
                    adapter.log.error('Longitude or latitude does not set. Cannot use astro.');
                    return;
                }

                let ts = mods.suncalc.getTimes(nowdate, adapter.config.latitude, adapter.config.longitude)[pattern.astro];

                if (ts.getTime().toString() === 'NaN') {
                    adapter.log.warn('Cannot calculate "' + pattern.astro + '" for ' + adapter.config.latitude + ', ' + adapter.config.longitude);
                    ts = new Date(nowdate.getTime());

                    if (pattern.astro === 'sunriseEnd'       ||
                        pattern.astro === 'goldenHourEnd'    ||
                        pattern.astro === 'sunset'           ||
                        pattern.astro === 'nightEnd'         ||
                        pattern.astro === 'nauticalDusk') {
                        ts.setMinutes(59);
                        ts.setHours(23);
                        ts.setSeconds(59);
                    } else {
                        ts.setMinutes(59);
                        ts.setHours(23);
                        ts.setSeconds(58);
                    }
                }

                if (ts && pattern.shift) {
                    ts = new Date(ts.getTime() + (pattern.shift * 60000));
                }

                if (!ts || ts < nowdate) {
                    const date = new Date(nowdate);
                    // Event doesn't occur today - try again tomorrow
                    // Calculate time till 24:00 and set timeout
                    date.setDate(date.getDate() + 1);
                    date.setMinutes(1); // Sometimes timer fires at 23:59:59
                    date.setHours(0);
                    date.setSeconds(0);
                    date.setMilliseconds(0);
                    date.setMinutes(-date.getTimezoneOffset());

                    // Calculate new schedule in the next day
                    sandbox.setTimeout(() => {
                        if (sandbox.__engine.__schedules > 0) {
                            sandbox.__engine.__schedules--;
                        }
                        sandbox.schedule(pattern, callback);
                    }, date.getTime() - nowdate.getTime());

                    return;
                }

                sandbox.setTimeout(() => {
                    try {
                        callback.call(sandbox);
                    } catch (e) {
                        errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                    }
                    // Reschedule in 2 seconds
                    sandbox.setTimeout(() => {
                        if (sandbox.__engine.__schedules > 0) {
                            sandbox.__engine.__schedules--;
                        }
                        sandbox.schedule(pattern, callback);
                    }, 2000);

                }, ts.getTime() - nowdate.getTime());

                sandbox.verbose && sandbox.log('schedule(astro=' + pattern.astro + ', offset=' + pattern.shift + ')', 'info');
            } else {
                // fix problem with sunday and 7
                if (typeof pattern === 'string') {
                    const parts = pattern.replace(/\s+/g, ' ').split(' ');
                    if (parts.length >= 5 && parts[5] >= 7) {
                        parts[5] = 0;
                    }
                    pattern = parts.join(' ');
                }
                // created in VM date object: pattern instanceof Date => false
                // so fix it
                if (typeof pattern === 'object' && pattern.getDate) {
                    pattern = new Date(pattern);
                }

                const schedule = nodeSchedule.scheduleJob(pattern, () => {
                    try {
                        callback.call(sandbox);
                    } catch (e) {
                        errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                    }
                });
                if (schedule) {
                    schedule._ioBroker = {
                        type: 'cron',
                        pattern,
                        scriptName: sandbox.name,
                        id: 'cron_' + Date.now() + '_' + Math.round((Math.random() * 100000))
                    };

                    script.schedules.push(schedule);
                } else {
                    sandbox.log('schedule(cron=' + pattern + '): cannot create schedule', 'error');
                }

                sandbox.verbose && sandbox.log('schedule(cron=' + pattern + ')', 'info');

                return schedule;
            }
        },
        getAstroDate:   function (pattern, date, offsetMinutes) {
            if (date === undefined) {
                date = new Date();
            }
            if (typeof date === 'number') {
                date = new Date(date);
            }

            if (!consts.astroList.includes(pattern)) {
                const pos = consts.astroListLow.indexOf(pattern.toLowerCase());
                if (pos !== -1) {
                    pattern = consts.astroList[pos];
                }
            }

            if ((!adapter.config.latitude  && adapter.config.latitude  !== 0) ||
                (!adapter.config.longitude && adapter.config.longitude !== 0)) {
                adapter.log.error('Longitude or latitude does not set. Cannot use astro.');
                return;
            }

            let ts = mods.suncalc.getTimes(date, adapter.config.latitude, adapter.config.longitude)[pattern];
            const nadir = mods.suncalc.getTimes(date, adapter.config.latitude, adapter.config.longitude)['nadir'];
            if (nadir.getDate() === date.getDate() && nadir.getHours() < 12) {
                ts = mods.suncalc.getTimes(date.setDate(date.getDate() + 1), adapter.config.latitude, adapter.config.longitude)[pattern];
            }
            if (nadir.getDate() !== date.getDate() && nadir.getHours() > 12) {
                ts = mods.suncalc.getTimes(date.setDate(date.getDate() - 1), adapter.config.latitude, adapter.config.longitude)[pattern];
            }

            if (ts === undefined || ts.getTime().toString() === 'NaN') {
                adapter.log.error('Cannot get astro date for "' + pattern + '"');
            }

            sandbox.verbose && sandbox.log('getAstroDate(pattern=' + pattern + ', date=' + date + ') => ' + ts, 'info');

            if (offsetMinutes !== undefined) {
                ts = new Date(ts.getTime() + (offsetMinutes * 60000));
            }
            return ts;
        },
        isAstroDay:     function () {
            const nowDate  = new Date();
            const dayBegin = sandbox.getAstroDate('sunrise');
            const dayEnd   = sandbox.getAstroDate('sunset');

            if (dayBegin === undefined || dayEnd === undefined) return;

            sandbox.verbose && sandbox.log('isAstroDay() => ' + (nowDate >= dayBegin && nowDate <= dayEnd), 'info');

            return (nowDate >= dayBegin && nowDate <= dayEnd);
        },
        clearSchedule:  function (schedule) {
            if (context.scheduler.get(schedule)) {
                sandbox.verbose && sandbox.log('clearSchedule() => wizard cleared', 'info');
                const pos = script.wizards.indexOf(schedule);
                if (pos !== -1) {
                    script.wizards.splice(pos, 1);
                    if (sandbox.__engine.__schedules > 0) {
                        sandbox.__engine.__schedules--;
                    }
                }
                context.scheduler.remove(schedule);
                return true;
            } else {
                for (let i = 0; i < script.schedules.length; i++) {
                    if (schedule && typeof schedule === 'object' && schedule.type === 'cron') {
                        if (script.schedules[i]._ioBroker && script.schedules[i]._ioBroker.id === schedule.id) {
                            if (!nodeSchedule.cancelJob(script.schedules[i])) {
                                adapter.log.error('Error by canceling scheduled job');
                            }
                            delete script.schedules[i];
                            script.schedules.splice(i, 1);
                            sandbox.verbose && sandbox.log('clearSchedule() => cleared', 'info');
                            return true;
                        }
                    } else
                    if (script.schedules[i] === schedule) {
                        if (!nodeSchedule.cancelJob(script.schedules[i])) {
                            adapter.log.error('Error by canceling scheduled job');
                        }
                        delete script.schedules[i];
                        script.schedules.splice(i, 1);
                        sandbox.verbose && sandbox.log('clearSchedule() => cleared', 'info');
                        return true;
                    }
                }
            }

            sandbox.verbose && sandbox.log('clearSchedule() => invalid handler', 'warn');
            return false;
        },
        getSchedules:   function (allScripts) {
            const schedules = context.scheduler.getList();
            if (allScripts) {
                Object.keys(context.scripts).forEach(name =>
                    context.scripts[name].schedules && context.scripts[name].schedules.forEach(s => schedules.push(JSON.parse(JSON.stringify(s._ioBroker)))));
            } else {
                script.schedules && script.schedules.forEach(s => schedules.push(JSON.parse(JSON.stringify(s._ioBroker))));
            }
            return schedules;
        },
        setState:       function (id, state, isAck, callback) {
            return setStateHelper(sandbox, false, id, state, isAck, callback);
        },
        setBinaryState: function (id, state, callback) {
            return setStateHelper(sandbox, true, id, state, callback);
        },
        setStateDelayed: function (id, state, isAck, delay, clearRunning, callback) {
            // find arguments
            if (typeof isAck !== 'boolean') {
                callback        = clearRunning;
                clearRunning    = delay;
                delay           = isAck;
                isAck           = false;
            }
            if (typeof delay !== 'number') {
                callback        = clearRunning;
                clearRunning    = delay;
                delay           = 0;
            }
            if (typeof clearRunning !== 'boolean') {
                callback        = clearRunning;
                clearRunning    = true;
            }

            // Check type of state
            if (!objects[id] && objects[adapter.namespace + '.' + id]) {
                id = adapter.namespace + '.' + id;
            }

            sandbox.verbose && sandbox.log(`setStateDelayed(id=${id}, state=${state}, isAck=${isAck}, delay=${delay}, clearRunning=${clearRunning})`, 'info');

            if (clearRunning) {
                if (timers[id]) {
                    sandbox.verbose && sandbox.log(`setStateDelayed: clear ${timers[id].length} running timers`, 'info');

                    for (let i = 0; i < timers[id].length; i++) {
                        clearTimeout(timers[id][i].t);
                    }
                    delete timers[id];
                } else {
                    sandbox.verbose && sandbox.log('setStateDelayed: no running timers', 'info');
                }
            }
            // If no delay => start immediately
            if (!delay) {
                sandbox.setState(id, state, isAck, callback);
                return null;
            } else {
                // If delay
                timers[id] = timers[id] || [];

                // calculate timerId
                context.timerId++;
                if (context.timerId > 0xFFFFFFFE) {
                    context.timerId = 0;
                }

                // Start timeout
                const timer = setTimeout(function (_timerId, _id, _state, _isAck) {
                    sandbox.setState(_id, _state, _isAck, callback);
                    // delete timer handler
                    if (timers[_id]) {
                        // optimisation
                        if (timers[_id].length === 1) {
                            delete timers[_id];
                        } else {
                            for (let t = 0; t < timers[_id].length; t++) {
                                if (timers[_id][t].id === _timerId) {
                                    timers[_id].splice(t, 1);
                                    break;
                                }
                            }
                            if (!timers[_id].length) {
                                delete timers[_id];
                            }
                        }
                    }
                }, delay, context.timerId, id, state, isAck);

                // add timer handler
                timers[id].push({
                    t:      timer,
                    id:     context.timerId,
                    ts:     Date.now(),
                    delay:  delay,
                    val:    isObject(state) && state.val !== undefined ? state.val : state,
                    ack:    isObject(state) && state.val !== undefined && state.ack !== undefined ? state.ack : isAck
                });

                return context.timerId;
            }
        },
        clearStateDelayed: function (id, timerId) {
            // Check type of state
            if (!objects[id] && objects[adapter.namespace + '.' + id]) {
                id = adapter.namespace + '.' + id;
            }

            sandbox.verbose && sandbox.log(`clearStateDelayed(id=${id}, timerId=${timerId})`, 'info');

            if (timers[id]) {

                for (let i = timers[id].length - 1; i >= 0; i--) {
                    if (timerId === undefined || timers[id][i].id === timerId) {
                        clearTimeout(timers[id][i].t);
                        if (timerId !== undefined) timers[id].splice(i, 1);
                        sandbox.verbose && sandbox.log(`clearStateDelayed: clear timer ${timers[id][i].id}`, 'info');
                    }
                }
                if (timerId === undefined) {
                    delete timers[id];
                } else {
                    if (!timers[id].length) delete timers[id];
                }
                return true;
            }
            return false;
        },
        getStateDelayed: function (id) {
            let result;
            const now = Date.now();
            if (id) {
                // Check type of state
                if (!objects[id] && objects[adapter.namespace + '.' + id]) {
                    id = adapter.namespace + '.' + id;
                }
                // If timerId given
                if (typeof id === 'number') {
                    for (const _id_ in timers) {
                        if (timers.hasOwnProperty(_id_)) {
                            for (let ttt = 0; ttt < timers[_id_].length; ttt++) {
                                if (timers[_id_][ttt].id === id) {
                                    return {
                                        id:         _id_,
                                        left:       timers[_id_][ttt].delay - (now - timers[id][ttt].ts),
                                        delay:      timers[_id_][ttt].delay,
                                        val:        timers[_id_][ttt].val,
                                        ack:        timers[_id_][ttt].ack
                                    };
                                }
                            }
                        }
                    }
                    return null;
                }

                result = [];
                if (timers.hasOwnProperty(id) && timers[id] && timers[id].length) {
                    for (let tt = 0; tt < timers[id].length; tt++) {
                        result.push({
                            timerId:    timers[id][tt].id,
                            left:       timers[id][tt].delay - (now - timers[id][tt].ts),
                            delay:      timers[id][tt].delay,
                            val:        timers[id][tt].val,
                            ack:        timers[id][tt].ack
                        });
                    }
                }
                return result;
            } else {
                result = {};
                for (const _id in timers) {
                    if (timers.hasOwnProperty(_id) && timers[_id] && timers[_id].length) {
                        result[_id] = [];
                        for (let t = 0; t < timers[_id].length; t++) {
                            result[_id].push({
                                timerId:    timers[_id][t].id,
                                left:       timers[_id][t].delay - (now - timers[_id][t].ts),
                                delay:      timers[_id][t].delay,
                                val:        timers[_id][t].val,
                                ack:        timers[_id][t].ack
                            });
                        }
                    }
                }
            }
            return result;
        },
        getStateAsync:  async function (id) {
            let state;
            if (id.includes('.')) {
                state = await adapter.getForeignStateAsync(id);
            } else {
                state = await adapter.getStateAsync(id);
            }
            return context.convertBackStringifiedValues(id, state);
        },
        setStateAsync:  function (id, state, isAck) {
            return new Promise((resolve, reject) =>
                setStateHelper(sandbox, false, id, state, isAck, err =>
                    err ? reject(err) : resolve()));
        },
        getState:       function (id, callback) {
            if (typeof callback === 'function') {
                if (!id.includes('.')) {
                    adapter.getState(id, (err, state) => callback(err, context.convertBackStringifiedValues(id, state)));
                } else {
                    adapter.getForeignState(id, (err, state) => callback(err, context.convertBackStringifiedValues(id, state)));
                }
            } else {
                if (adapter.config.subscribe) {
                    sandbox.log('The "getState" method cannot be used synchronously, because the adapter setting "Do not subscribe to all states on start" is enabled.', 'error');
                    sandbox.log(`Please disable that setting or use "getState" with a callback, e.g.: getState("${id}", (err, state) => { ... });`, 'error');
                } else {
                    if (states[id]) {
                        sandbox.verbose && sandbox.log(`getState(id=${id}, timerId=${timers[id]}) => ${JSON.stringify(states[id])}`, 'info');
                        return context.convertBackStringifiedValues(id, states[id]);
                    }
                    if (states[adapter.namespace + '.' + id]) {
                        sandbox.verbose && sandbox.log(`getState(id=${id}, timerId=${timers[id]}) => ${states[adapter.namespace + '.' + id]}`, 'info');
                        return context.convertBackStringifiedValues(id, states[adapter.namespace + '.' + id]);
                    }

                    sandbox.verbose && sandbox.log(`getState(id=${id}, timerId=${timers[id]}) => not found`, 'info');

                    context.logWithLineInfo && context.logWithLineInfo.warn(`getState "${id}" not found (3)${states[id] !== undefined ? ' states[id]=' + states[id] : ''}`);     ///xxx
                    return {val: null, notExist: true};
                }
            }
        },
        getBinaryState: function (id, callback) {
            if (typeof callback === 'function') {
                adapter.getBinaryState(id, callback);
            } else {
                sandbox.log('The "getBinaryState" method cannot be used synchronously.', 'error');
            }
        },
        existsState:    function (id, callback) {
            if (typeof callback === 'function') {
                adapter.getForeignObject(id, (err, obj) =>
                    callback(err, obj && obj.type === 'state' && states.get(id) !== undefined));
            } else {
                return states.get(id) !== undefined;
            }
        },
        existsObject:   function (id, callback) {
            if (typeof callback === 'function') {
                adapter.getForeignObject(id, (err, obj) =>
                    callback(err, !!obj));
            } else {
                return objects.get(id) !== undefined;
            }
        },
        getIdByName:    function (name, alwaysArray) {
            sandbox.verbose && sandbox.log(`getIdByName(name=${name}, alwaysArray=${alwaysArray}) => ${context.names[name]}`, 'info');
            if (alwaysArray) {
                if (typeof context.names[name] === 'string') {
                    return [context.names[name]];
                }
                return context.names[name];
            } else {
                return context.names[name];
            }
        },
        getObject:      function (id, enumName, cb) {
            if (typeof enumName === 'function') {
                cb = enumName;
                enumName = null;
            }
            if (typeof cb === 'function') {
                adapter.getForeignObject(id, (err, obj) => {
                    if (obj) {
                        objects[id] = obj;
                    } else if (objects[id]) {
                        delete objects[id];
                    }
                    let result;
                    try {
                        result = JSON.parse(JSON.stringify(objects[id]));
                    } catch (err) {
                        adapter.setState('scriptProblem.' + name.substring('script.js.'.length), true, true);
                        adapter.log.error('Object "' + id + '" can\'t be copied');
                        return null;
                    }
                    sandbox.verbose && sandbox.log('getObject(id=' + id + ', enumName=' + enumName + ') => ' + JSON.stringify(result), 'info');
                    cb(err, result);
                });
            } else {
                if (!objects[id]) {
                    sandbox.verbose && sandbox.log('getObject(id=' + id + ', enumName=' + enumName + ') => does not exist', 'info');
                    adapter.log.warn('Object "' + id + '" does not exist');
                    return null;
                } else if (enumName) {
                    const e = eventObj.getObjectEnumsSync(context, id);
                    const obj = JSON.parse(JSON.stringify(objects[id]));
                    obj.enumIds   = JSON.parse(JSON.stringify(e.enumIds));
                    obj.enumNames = JSON.parse(JSON.stringify(e.enumNames));
                    if (typeof enumName === 'string') {
                        const r = new RegExp('^enum\\.' + enumName + '\\.');
                        for (let i = obj.enumIds.length - 1; i >= 0; i--) {
                            if (!r.test(obj.enumIds[i])) {
                                obj.enumIds.splice(i, 1);
                                obj.enumNames.splice(i, 1);
                            }
                        }
                    }
                    sandbox.verbose && sandbox.log('getObject(id=' + id + ', enumName=' + enumName + ') => ' + JSON.stringify(obj), 'info');

                    return obj;
                } else {
                    let result;
                    try {
                        result = JSON.parse(JSON.stringify(objects[id]));
                    } catch (err) {
                        adapter.setState('scriptProblem.' + name.substring('script.js.'.length), true, true);
                        adapter.log.error('Object "' + id + '" can\'t be copied');
                        return null;
                    }
                    sandbox.verbose && sandbox.log('getObject(id=' + id + ', enumName=' + enumName + ') => ' + JSON.stringify(result), 'info');
                    return result;
                }
            }
        },
        setObject:      function (id, obj, callback) {
            adapter.log.error('Function "setObject" is not allowed. Use adapter settings to allow it.');
            if (typeof callback === 'function') {
                try {
                    callback.call(sandbox, 'Function "setObject" is not allowed. Use adapter settings to allow it.');
                } catch (e) {
                    errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                }
            }
        },
        extendObject:   function (id, obj, callback) {
            adapter.log.error('Function "extendObject" is not allowed. Use adapter settings to allow it.');
            if (typeof callback === 'function') {
                try {
                    callback.call(sandbox, 'Function "extendObject" is not allowed. Use adapter settings to allow it.');
                } catch (e) {
                    errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                }
            }
        },
        deleteObject:   function (id, isRecursive, callback) {
            if (typeof isRecursive === 'function') {
                callback = isRecursive;
                isRecursive = false;
            }
            adapter.log.error('Function "deleteObject" is not allowed. Use adapter settings to allow it.');
            if (typeof callback === 'function') {
                try {
                    callback.call(sandbox, 'Function "deleteObject" is not allowed. Use adapter settings to allow it.');
                } catch (e) {
                    errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                }
            }
        },
        getEnums:       function (enumName) {
            const result = [];
            const r = enumName ? new RegExp('^enum\\.' + enumName + '\\.') : false;
            for (let i = 0; i < enums.length; i++) {
                if (!r || r.test(enums[i])) {
                    const common = objects[enums[i]].common || {};
                    result.push({
                        id:      enums[i],
                        members: common.members || [],
                        name:    common.name || ''
                    });
                }
            }
            sandbox.verbose && sandbox.log('getEnums(enumName=' + enumName + ') => ' + JSON.stringify(result), 'info');
            return JSON.parse(JSON.stringify(result));
        },
        createState:    function (name, initValue, forceCreation, common, native, callback) {
            if (typeof native === 'function') {
                callback = native;
                native   = {};
            }
            if (typeof common === 'function') {
                callback      = common;
                common        = undefined;
            }
            if (typeof initValue === 'function') {
                callback      = initValue;
                initValue     = undefined;
            }
            if (typeof forceCreation === 'function') {
                callback      = forceCreation;
                forceCreation = undefined;
            }
            if (isObject(initValue)) {
                common        = initValue;
                native        = forceCreation;
                forceCreation = undefined;
                initValue     = undefined;
            }
            if (isObject(forceCreation)) {
                common        = forceCreation;
                native        = common;
                forceCreation = undefined;
            }

            if (typeof name !== 'string') {
                const err = `Wrong type of name "${typeof name}". Expected "string".`;
                sandbox.log(err, 'error');
                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, err);
                    } catch (e) {
                        errorInCallback(e);
                    }
                }
                return;
            }
            if (!name) {
                const err = 'Empty ID is not allowed.';
                sandbox.log(err, 'error');
                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, err);
                    } catch (e) {
                        errorInCallback(e);
                    }
                }
                return;
            }
            common = common || {};
            common.name = common.name || name;
            common.role = common.role || 'state';
            common.type = common.type || 'mixed';
            if (initValue === undefined) {
                initValue = common.def;
            }

            native = native || {};

            // Check min, max and def values for number
            if (common.type !== undefined && common.type === 'number') {
                let min = 0;
                let max = 0;
                let def = 0;
                let err;
                if (common.min !== undefined) {
                    min = common.min;
                    if (typeof min !== 'number') {
                        min = parseFloat(min);
                        if (isNaN(min)) {
                            err = 'Wrong type of ' + name + '.common.min';
                            sandbox.log(err, 'error');
                            if (typeof callback === 'function') {
                                try {
                                    callback.call(sandbox, err);
                                } catch (e) {
                                    errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                                }
                            }
                            return;
                        } else {
                            common.min = min;
                        }
                    }
                }
                if (common.max !== undefined) {
                    max = common.max;
                    if (typeof max !== 'number') {
                        max = parseFloat(max);
                        if (isNaN(max)) {
                            err = 'Wrong type of ' + name + '.common.max';
                            sandbox.log(err, 'error');
                            if (typeof callback === 'function') {
                                try {
                                    callback.call(sandbox, err);
                                } catch (e) {
                                    errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                                }
                            }
                            return;
                        } else {
                            common.max = max;
                        }
                    }
                }
                if (common.def !== undefined) {
                    def = common.def;
                    if (typeof def !== 'number') {
                        def = parseFloat(def);
                        if (isNaN(def)) {
                            err = 'Wrong type of ' + name + '.common.def';
                            sandbox.log(err, 'error');
                            if (typeof callback === 'function') {
                                try {
                                    callback.call(sandbox, err);
                                } catch (e) {
                                    errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                                }
                            }
                            return;
                        } else {
                            common.def = def;
                        }
                    }
                }
                if (common.min !== undefined && common.max !== undefined && min > max) {
                    common.max = min;
                    common.min = max;
                }
                if (common.def !== undefined && common.min !== undefined && def < min) common.def = min;
                if (common.def !== undefined && common.max !== undefined && def > max) common.def = max;
            }

            sandbox.verbose && sandbox.log(`createState(name=${name}, initValue=${initValue}, forceCreation=${forceCreation}, common=${JSON.stringify(common)}, native=${JSON.stringify(native)})`, 'debug');

            let id = adapter.namespace + '.' + name;
            if (name.match(/^javascript\.\d+\./) || name.startsWith('0_userdata.0.')) {
                id = name;
            }
            adapter.getForeignObject(id, function (err, obj) {
                if (err || !obj || forceCreation) {
                    // todo: store object in objects to have this object directly after callback
                    // create new one
                    adapter.setForeignObject(id, {
                        common,
                        native,
                        type:   'state'
                    }, function (err) {
                        err && adapter.log.warn(`Cannot set object "${id}": ${err}`);

                        if (err) {
                            if (typeof callback === 'function') {
                                try {
                                    callback.call(sandbox, err);
                                } catch (e) {
                                    errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                                }
                            }
                        } else if (initValue !== undefined) {
                            if (isObject(initValue) && initValue.ack !== undefined) {
                                setStateHelper(sandbox, false, id, initValue, callback);
                            } else {
                                setStateHelper(sandbox, false, id, initValue, true, callback);
                            }
                        } else if (!forceCreation) {
                            adapter.setForeignState(id, null, true, callback);
                        } else {
                            if (typeof callback === 'function') {
                                try {
                                    callback.call(sandbox, null, id);
                                } catch (e) {
                                    errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                                }
                            }
                        }
                    });
                } else {
                    if (!adapter.config.subscribe && !states[id] && states[adapter.namespace + '.' + id] === undefined) {
                        states[id] = {val: null, ack: true};
                    }
                    // state yet exists
                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, null, id);
                        } catch (e) {
                            errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                        }
                    }
                }
            });
        },
        deleteState:    function (id, callback) {
            // todo: check rights
            // todo: also remove from "names"

            sandbox.verbose && sandbox.log(`deleteState(id=${id})`, 'debug');

            let found = false;
            if ((id.startsWith('0_userdata.0.') || id.startsWith(adapter.namespace)) && objects[id]) {
                found = true;
                delete objects[id];
                if (states[id]) {
                    delete states[id];
                }

                adapter.delForeignObject(id, function (err) {
                    err && adapter.log.warn(`Object for state "${id}" does not exist: ${err}`);

                    adapter.delForeignState(id, function (err) {
                        err && adapter.log.error(`Cannot delete state "${id}": ${err}`);
                        if (typeof callback === 'function') {
                            try {
                                callback.call(sandbox, err, found);
                            } catch (e) {
                                errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                            }
                        }
                    });

                });
            } else if (objects[adapter.namespace + '.' + id]) {
                delete objects[adapter.namespace + '.' + id];
                found = true;
                if (states[adapter.namespace + '.' + id]) {
                    delete states[adapter.namespace + '.' + id];
                }

                adapter.delObject(id, function (err) {
                    err && adapter.log.warn(`Object for state "${id}" does not exist: ${err}`);

                    adapter.delState(id, function (err) {
                        err && adapter.log.error(`Cannot delete state "${id}": ${err}`);
                        if (typeof callback === 'function') {
                            try {
                                callback.call(sandbox, err, found);
                            } catch (e) {
                                errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                            }
                        }
                    });

                });
            } else {
                const err = 'Not found';
                adapter.log.error(`Cannot delete state "${id}": ${err}`);
                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, err, found);
                    } catch (e) {
                        errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                    }
                }
            }
        },
        sendTo:         function (_adapter, cmd, msg, callback) {
            sandbox.verbose && sandbox.log(`sendTo(adapter=${_adapter}, cmd=${cmd}, msg=${JSON.stringify(msg)})`, 'info');
            adapter.sendTo(_adapter, cmd, msg, callback);
        },
        sendto:         function (_adapter, cmd, msg, callback) {
            return sandbox.sendTo(_adapter, cmd, msg, callback);
        },
        sendToHost:     function (host, cmd, msg, callback) {
            if (!adapter.config.enableSendToHost) {
                const error = 'sendToHost is not available. Please enable "Enable SendToHost" option in instance settings';
                adapter.log.error(error);
                sandbox.log(error);
                if (typeof callback === 'function') {
                    setImmediate(function () {
                        callback(error);
                    });
                }
            } else {
                sandbox.verbose && sandbox.log(`sendToHost(adapter=${host}, cmd=${cmd}, msg=${JSON.stringify(msg)})`, 'info');
                adapter.sendToHost(host, cmd, msg, callback);
            }
        },
        setInterval:    function (callback, ms, ...args) {
            if (typeof callback === 'function') {
                const int = setInterval(() => {
                    try {
                        callback.call(sandbox, ...args);
                    } catch (e) {
                        errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                    }
                }, ms);
                script.intervals.push(int);

                sandbox.verbose && sandbox.log(`setInterval(ms=${ms})`, 'info');
                return int;
            } else {
                sandbox.log(`Invalid callback for setInterval! - ${typeof callback}`, 'error');
                return null;
            }
        },
        clearInterval:  function (id) {
            const pos = script.intervals.indexOf(id);
            if (pos !== -1) {
                sandbox.verbose && sandbox.log('clearInterval() => cleared', 'info');
                clearInterval(id);
                script.intervals.splice(pos, 1);
            } else {
                sandbox.verbose && sandbox.log('clearInterval() => not found', 'warn');
            }
        },
        setTimeout:     function (callback, ms, ...args) {
            if (typeof callback === 'function') {
                const to = setTimeout(() => {
                    // Remove timeout from the list
                    const pos = script.timeouts.indexOf(to);
                    if (pos !== -1) {
                        script.timeouts.splice(pos, 1);
                    }

                    try {
                        callback.call(sandbox, ...args);
                    } catch (e) {
                        errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                    }
                }, ms);
                sandbox.verbose && sandbox.log(`setTimeout(ms=${ms})`, 'info');

                script.timeouts.push(to);
                return to;
            } else {
                sandbox.log(`Invalid callback for setTimeout! - ${typeof callback}`, 'error');
                return null;
            }
        },
        clearTimeout:   function (id) {
            const pos = script.timeouts.indexOf(id);
            if (pos !== -1) {
                sandbox.verbose && sandbox.log('clearTimeout() => cleared', 'info');
                clearTimeout(id);
                script.timeouts.splice(pos, 1);
            } else {
                sandbox.verbose && sandbox.log('clearTimeout() => not found', 'warn');
            }
        },
        setImmediate:   function (callback, ...args) {
            if (typeof callback === 'function') {
                setImmediate(() => {
                    try {
                        callback.call(sandbox, ...args);
                    } catch (e) {
                        errorInCallback(e);
                    }
                });
                sandbox.verbose && sandbox.log('setImmediate()', 'info');
            } else {
                sandbox.log(`Invalid callback for setImmediate! - ${typeof callback}`, 'error');
            }
        },
        cb:             function (callback) {
            return function () {
                if (context.scripts[name] && context.scripts[name]._id === sandbox._id) {
                    if (typeof callback === 'function') {
                        try {
                            callback.apply(this, arguments);
                        } catch (e) {
                            errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                        }
                    }
                } else {
                    adapter.log.warn(`Callback for old version of script: ${name}`);
                }
            };
        },
        compareTime:    function (startTime, endTime, operation, time) {
            let pos;
            if (startTime && typeof startTime === 'string') {
                if ((pos = consts.astroListLow.indexOf(startTime.toLowerCase())) !== -1) {
                    startTime = sandbox.getAstroDate(consts.astroList[pos]);
                    startTime = startTime.toLocaleTimeString([], {
                        hour:   '2-digit',
                        minute: '2-digit',
                        hour12: false
                    });
                }
            } else if (startTime && isObject(startTime) && startTime.astro) {
                startTime = sandbox.getAstroDate(startTime.astro, startTime.date || new Date(), startTime.offset || 0);
                startTime = startTime.toLocaleTimeString([], {
                    hour:   '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
            }
            if (endTime && typeof endTime === 'string') {
                if ((pos = consts.astroListLow.indexOf(endTime.toLowerCase())) !== -1) {
                    endTime = sandbox.getAstroDate(consts.astroList[pos]);
                    endTime = endTime.toLocaleTimeString([], {
                        hour:   '2-digit',
                        minute: '2-digit',
                        hour12: false
                    });
                }
            } else if (endTime && isObject(endTime) && endTime.astro) {
                endTime = sandbox.getAstroDate(endTime.astro, endTime.date || new Date(), endTime.offset || 0);
                endTime = endTime.toLocaleTimeString([], {
                    hour:   '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
            }
            if (time && typeof time === 'string') {
                if ((pos = consts.astroListLow.indexOf(time.toLowerCase())) !== -1) {
                    time = sandbox.getAstroDate(consts.astroList[pos]);
                }
            } else if (time && isObject(time) && time.astro) {
                time = sandbox.getAstroDate(time.astro, time.date || new Date(), time.offset || 0);
            }

            let daily = true;
            if (time) {
                daily = false;
            }
            if (time && !isObject(time)) {
                if (typeof time === 'string' && !time.includes(' ') && !time.includes('T')) {
                    const parts = time.split(':');
                    time = new Date();
                    time.setHours(parseInt(parts[0], 10));
                    time.setMinutes(parseInt(parts[1], 10));
                    time.setMilliseconds(0);

                    if (parts.length === 3) {
                        time.setSeconds(parseInt(parts[2], 10));
                    } else {
                        time.setSeconds(0);
                    }
                } else {
                    time = new Date(time);
                }
            } else if (!time) {
                time = new Date();
                time.setMilliseconds(0);
            }

            if (typeof startTime === 'string') {
                if (!startTime.includes(' ') && !startTime.includes('T')) {
                    const parts = startTime.split(':');
                    startTime = new Date();
                    startTime.setHours(parseInt(parts[0], 10));
                    startTime.setMinutes(parseInt(parts[1], 10));
                    startTime.setMilliseconds(0);

                    if (parts.length === 3) {
                        startTime.setSeconds(parseInt(parts[2], 10));
                    } else {
                        startTime.setSeconds(0);
                    }
                } else {
                    daily = false;
                    startTime = new Date(startTime);
                }
            } else {
                daily = false;
                startTime = new Date(startTime);
            }
            startTime = startTime.getTime();

            if (endTime && typeof endTime === 'string') {
                if (!endTime.includes(' ') && !endTime.includes('T')) {
                    const parts = endTime.split(':');
                    endTime = new Date();
                    endTime.setHours(parseInt(parts[0], 10));
                    endTime.setMinutes(parseInt(parts[1], 10));
                    endTime.setMilliseconds(0);

                    if (parts.length === 3) {
                        endTime.setSeconds(parseInt(parts[2], 10));
                    } else {
                        endTime.setSeconds(0);
                    }
                } else {
                    daily = false;
                    endTime = new Date(endTime);
                }
            } else if (endTime) {
                daily = false;
                endTime = new Date(endTime);
            } else {
                endTime = null;
            }

            if (endTime) endTime = endTime.getTime();

            if (operation === 'between') {
                if (endTime) {
                    if (typeof time === 'object') {
                        time = time.getTime();
                    }
                    if (typeof startTime === 'object') {
                        startTime = startTime.getTime();
                    }
                    if (typeof endTime === 'object') {
                        endTime = endTime.getTime();
                    }

                    if (startTime > endTime && daily) {
                        return !(time >= endTime && time < startTime);
                    } else {
                        return time >= startTime && time < endTime;
                    }
                } else {
                    adapter.log.warn('missing or unrecognized endTime expression: ' + endTime);
                    return false;
                }
            } else if (operation === 'not between') {
                if (endTime) {
                    if (typeof time === 'object') {
                        time = time.getTime();
                    }
                    if (typeof startTime === 'object') {
                        startTime = startTime.getTime();
                    }
                    if (typeof endTime === 'object') {
                        endTime = endTime.getTime();
                    }
                    if (startTime > endTime && daily) {
                        return time >= endTime && time < startTime;
                    } else {
                        return !(time >= startTime && time < endTime);
                    }
                } else {
                    adapter.log.warn('missing or unrecognized endTime expression: ' + endTime);
                    return false;
                }
            } else {
                if (typeof time === 'object') {
                    time = time.getTime();
                }
                if (typeof startTime === 'object') {
                    startTime = startTime.getTime();
                }

                if (operation === '>') {
                    return time > startTime;
                } else if (operation === '>=') {
                    return time >= startTime;
                } else if (operation === '<') {
                    return time < startTime;
                } else if (operation === '<=') {
                    return time <= startTime;
                } else if (operation === '==') {
                    return time === startTime;
                } else if (operation === '<>') {
                    return time !== startTime;
                } else {
                    adapter.log.warn('Invalid operator: ' + operation);
                    return false;
                }
            }
        },
        onStop:         function (cb, timeout) {
            sandbox.verbose && sandbox.log('onStop(timeout=' + timeout + ')', 'info');

            script.onStopCb = cb;
            script.onStopTimeout = timeout || 1000;
        },
        formatValue:    function (value, decimals, format) {
            if (!format) {
                if (adapter.isFloatComma !== undefined) {
                    format = adapter.isFloatComma ? '.,' : ',.';
                } else
                if (objects['system.config'] && objects['system.config'].common) {
                    format = objects['system.config'].common.isFloatComma ? '.,' : ',.';
                }
            }
            return adapter.formatValue(value, decimals, format);
        },
        formatDate:     function (date, format, language) {
            if (!format) {
                if (adapter.dateFormat) {
                    format = adapter.dateFormat;
                } else {
                    format = objects['system.config'] && objects['system.config'].common ? (objects['system.config'].common.dateFormat || 'DD.MM.YYYY') : 'DD.MM.YYYY';
                }
                format = format || 'DD.MM.YYYY';
            }
            if (format.match(/[WНOО]+/)) {
                let text = adapter.formatDate(date, format);
                if (!language || !consts.dayOfWeeksFull[language]) {
                    language = adapter.language || (objects['system.config'] && objects['system.config'].common && objects['system.config'].common.language) || 'de';
                    if (!consts.dayOfWeeksFull[language]) {
                        language = 'de';
                    }
                }
                if (typeof date === 'number' || typeof date === 'string') {
                    date = new Date(date);
                } else if (typeof date.getMonth !== 'function') {
                    sandbox.log('Invalid date object provided: ' + JSON.stringify(date), 'error');
                    return 'Invalid date';
                }
                const d = date.getDay();
                text = text.replace('НН',  consts.dayOfWeeksFull[language][d]);
                let initialText = text;
                text = text.replace('WW',  consts.dayOfWeeksFull[language][d]);

                if (initialText === text) {
                    text = text.replace('W',   consts.dayOfWeeksShort[language][d]);
                }

                text = text.replace('Н',   consts.dayOfWeeksShort[language][d]);
                text = text.replace('Н',   consts.dayOfWeeksShort[language][d]);
                const m = date.getMonth();
                initialText = text;
                text = text.replace('OOO', consts.monthFullGen[language][m]);
                text = text.replace('ООО', consts.monthFullGen[language][m]);
                text = text.replace('OO',  consts.monthFull[language][m]);
                text = text.replace('ОО',  consts.monthFull[language][m]);

                if (initialText === text) {
                    text = text.replace('O',   consts.monthShort[language][m]);
                }
                return text;
            } else {
                return adapter.formatDate(date, format);
            }
        },
        getDateObject:  function (date) {
            if (isObject(date)) return date;
            if (typeof date !== 'string') return new Date(date);
            if (date.match(/^\d?\d$/)) {
                const _now = new Date();
                date = _now.getFullYear() + '-' + (_now.getMonth() + 1) + '-' + _now.getDate() + ' ' + date + ':00';
            } else {
                // 20:00, 2:00, 20:00:00, 2:00:00
                if (date.match(/^\d?\d:\d\d(:\d\d)?$/)) {
                    const now = new Date();
                    date = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate() + ' ' + date;
                }
            }
            return new Date(date);
        },
        writeFile:      function (_adapter, fileName, data, callback) {
            if (typeof data === 'function' || !data) {
                callback = data;
                data     = fileName;
                fileName = _adapter;
                _adapter = null;
            }

            if (debug) {
                sandbox.log('readFile(adapter=' + _adapter + ', fileName=' + fileName + ') - ' + words._('was not executed, while debug mode is active'), 'warn');
                if (typeof callback === 'function') {
                    setTimeout(function () {
                        try {
                            callback.call(sandbox);
                        } catch (e) {
                            errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                        }
                    }, 0);
                }
            } else {
                sandbox.verbose && sandbox.log('readFile(adapter=' + _adapter + ', fileName=' + fileName + ')', 'info');
                adapter.writeFile(_adapter, fileName, data, callback);
            }
        },
        readFile:       function (_adapter, fileName, callback) {
            if (typeof fileName === 'function') {
                callback = fileName;
                fileName = _adapter;
                _adapter = null;
            }
            sandbox.verbose && sandbox.log('readFile(adapter=' + _adapter + ', fileName=' + fileName + ')', 'info');

            adapter.readFile(_adapter, fileName, callback);
        },
        unlink:         function (_adapter, fileName, callback) {
            if (typeof fileName === 'function') {
                callback = fileName;
                fileName = _adapter;
                _adapter = null;
            }
            sandbox.verbose && sandbox.log('unlink(adapter=' + _adapter + ', fileName=' + fileName + ')', 'info');

            if (debug) {
                sandbox.log('unlink(adapter=' + _adapter + ', fileName=' + fileName + ') - ' + words._('was not executed, while debug mode is active'), 'warn');
                if (typeof callback === 'function') {
                    setTimeout(function () {
                        try {
                            callback.call(sandbox);
                        } catch (e) {
                            errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                        }
                    }, 0);
                }
            } else {
                sandbox.verbose && sandbox.log('unlink(adapter=' + _adapter + ', fileName=' + fileName + ')', 'info');
                adapter.unlink(_adapter, fileName, callback);
            }
        },
        delFile:        function (_adapter, fileName, callback) {
            return sandbox.unlink(_adapter, fileName, callback);
        },
        getHistory:     function (instance, options, callback) {
            if (isObject(instance)) {
                callback = options;
                options  = instance;
                instance = null;
            }

            if (typeof callback !== 'function') {
                return adapter.log.error('No callback found!');
            }
            if (!isObject(options)) {
                return adapter.log.error('No options found!');
            }
            if (!options.id) {
                return adapter.log.error('No ID found!');
            }
            const timeoutMs = parseInt(options.timeout, 10) || 20000;

            if (!instance) {
                if (adapter.defaultHistory) {
                    instance = adapter.defaultHistory;
                } else {
                    instance = objects['system.config'] && objects['system.config'].common ? objects['system.config'].common.defaultHistory : null;
                }
            }

            sandbox.verbose && sandbox.log('getHistory(instance=' + instance + ', options=' + JSON.stringify(options) + ')', 'debug');

            if (!instance) {
                adapter.log.error('No default history instance found!');
                try {
                    callback.call(sandbox, 'No default history instance found!');
                } catch (e) {
                    errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                }
                return;
            }
            if (instance.startsWith('system.adapter.')) {
                instance = instance.substring('system.adapter.'.length);
            }

            if (!objects['system.adapter.' + instance]) {
                adapter.log.error('Instance "' + instance + '" not found!');
                try {
                    callback.call(sandbox, 'Instance "' + instance + '" not found!');
                } catch (e) {
                    errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                }
                return;
            }
            let timeout = setTimeout(() => {
                timeout = null;

                sandbox.verbose && sandbox.log('getHistory => timeout', 'debug');

                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, 'Timeout', null, options, instance);
                    } catch (e) {
                        errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                    }
                    callback = null;
                }
            }, timeoutMs);

            adapter.sendTo(instance, 'getHistory', {id: options.id, options: options}, function (result) {
                if (timeout) clearTimeout(timeout);

                if (sandbox.verbose && result.error)  sandbox.log('getHistory => ' + result.error, 'error');
                if (sandbox.verbose && result.result) sandbox.log('getHistory => ' + result.result.length + ' items', 'debug');

                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, result.error, result.result, options, instance);
                    } catch (e) {
                        errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                    }
                    callback = null;
                }

            });
        },
        runScript:      function (scriptName, callback) {
            scriptName = scriptName || name;
            if (!scriptName.match(/^script\.js\./)) scriptName = 'script.js.' + scriptName;
            // start other script
            if (!objects[scriptName] || !objects[scriptName].common) {
                sandbox.log('Cannot start "' + scriptName + '", because not found', 'error');
                return false;
            } else {
                if (debug) {
                    sandbox.log('runScript(scriptName=' + scriptName + ') - ' + words._('was not executed, while debug mode is active'), 'warn');
                } else {
                    if (objects[scriptName].common.enabled) {
                        objects[scriptName].common.enabled = false;
                        adapter.extendForeignObject(scriptName, {common: {enabled: false}}, function (/* err, obj */) {
                            adapter.extendForeignObject(scriptName, {common: {enabled: true}}, function (err) {
                                callback === 'function' && callback(err);
                            });
                            scriptName = null;
                        });
                    } else {
                        adapter.extendForeignObject(scriptName, {common: {enabled: true}}, function (err) {
                            callback === 'function' && callback(err);
                        });
                    }
                }
                return true;
            }
        },
        runScriptAsync: function (scriptName) {
            return new Promise((resolve, reject) => {
                const result = sandbox.runScript(scriptName, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
                if (result === false) reject(`Script ${scriptName} was not found!`);
            });
        },
        startScript:    function (scriptName, ignoreIfStarted, callback) {
            if (typeof ignoreIfStarted === 'function') {
                callback = ignoreIfStarted;
                ignoreIfStarted = false;
            }
            scriptName = scriptName || name;
            if (!scriptName.match(/^script\.js\./)) scriptName = 'script.js.' + scriptName;
            // start other script
            if (!objects[scriptName] || !objects[scriptName].common) {
                sandbox.log('Cannot start "' + scriptName + '", because not found', 'error');
                return false;
            } else {
                if (debug) {
                    sandbox.log(`startScript(scriptName=${scriptName}) - ${words._('was not executed, while debug mode is active')}`, 'warn');
                } else {
                    if (objects[scriptName].common.enabled) {
                        if (!ignoreIfStarted) {
                            objects[scriptName].common.enabled = false;
                            adapter.extendForeignObject(scriptName, {common: {enabled: false}}, () => {
                                adapter.extendForeignObject(scriptName, {common: {enabled: true}}, err =>
                                    callback === 'function' && callback(err, true));
                                scriptName = null;
                            });
                        } else if (callback === 'function') {
                            callback(null, false);
                        }
                    } else {
                        adapter.extendForeignObject(scriptName, {common: {enabled: true}}, err => {
                            callback === 'function' && callback(err, true);
                        });
                    }
                }
                return true;
            }
        },
        startScriptAsync: function (scriptName, ...args) {
            return new Promise((resolve, reject) => {
                const result = sandbox.startScript(scriptName, ...args, (err, started) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(started);
                    }
                });
                if (result === false) {
                    reject(`Script ${scriptName} was not found!`);
                }
            });
        },
        stopScript:     function (scriptName, callback) {
            scriptName = scriptName || name;

            if (!scriptName.match(/^script\.js\./)) scriptName = 'script.js.' + scriptName;

            // stop other script
            if (!objects[scriptName] || !objects[scriptName].common) {
                sandbox.log('Cannot stop "' + scriptName + '", because not found', 'error');
                return false;
            } else {
                if (debug) {
                    sandbox.log('stopScript(scriptName=' + scriptName + ') - ' + words._('was not executed, while debug mode is active'), 'warn');
                } else {
                    if (objects[scriptName].common.enabled) {
                        objects[scriptName].common.enabled = false;
                        adapter.extendForeignObject(scriptName, {common: {enabled: false}}, function (err) {
                            callback === 'function' && callback(err, true);
                            scriptName = null;
                        });
                    } else if (callback === 'function') {
                        callback(null, false);
                    }
                }
                return true;
            }
        },
        stopScriptAsync: function (scriptName) {
            return new Promise((resolve, reject) => {
                const result = sandbox.stopScript(scriptName, (err, stopped) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(stopped);
                    }
                });
                if (result === false) reject(`Script ${scriptName} was not found!`);
            });
        },
        isScriptActive: function (scriptName) {
            if (!scriptName.match(/^script\.js\./)) scriptName = 'script.js.' + scriptName;
            if (!objects[scriptName] || !objects[scriptName].common) {
                sandbox.log('Script does not exist', 'error');
                return false;
            } else {
                return objects[scriptName].common.enabled;
            }
        },
        toInt:          function (val) {
            if (val === true || val === 'true') val = 1;
            if (val === false || val === 'false') val = 0;
            val = parseInt(val) || 0;
            return val;
        },
        toFloat:        function (val) {
            if (val === true || val === 'true') val = 1;
            if (val === false || val === 'false') val = 0;
            val = parseFloat(val) || 0;
            return val;
        },
        toBoolean:      function (val) {
            if (val === '1' || val === 'true') val = true;
            if (val === '0' || val === 'false') val = false;
            return !!val;
        },
        getAttr:        function (obj, path) {
            if (typeof path === 'string') {
                path = path.split('.');
            }
            if (typeof obj === 'string') {
                try {
                    obj = JSON.parse(obj);
                } catch (e) {
                    adapter.setState('scriptProblem.' + name.substring('script.js.'.length), true, true);
                    sandbox.log('Cannot parse "' + obj.substring(0, 30) + '"' + e, 'error');
                    return null;
                }
            }

            const attr = path.shift();
            try {
                obj = obj[attr];
            } catch (e) {
                adapter.setState('scriptProblem.' + name.substring('script.js.'.length), true, true);
                sandbox.log(`Cannot get ${attr} of ${JSON.stringify(obj)}`, 'error');
                return null;
            }

            if (!path.length) {
                return obj;
            } else {
                const type = typeof obj;
                if (obj === null || obj === undefined || type === 'boolean' || type === 'number') {
                    return null;
                } else {
                    return sandbox.getAttr(obj, path);
                }
            }
        },
        messageTo:      function (target, data, options, callback) {
            if (typeof target !== 'object') {
                target = {instance: null, script: null, message: target};
            }
            if (typeof options === 'function') {
                callback = options;
                options = {timeout: 5000};
            }

            let timeout;
            if (typeof callback === 'function') {
                timeout = setTimeout(() => {
                    timeout = null;

                    sandbox.verbose && sandbox.log('messageTo => timeout', 'debug');

                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, {error: 'timeout'}, options, target.instance);
                        } catch (e) {
                            errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                        }
                        callback = null;
                    }
                }, parseInt(options.timeout, 10) || 50000);
            }

            if (target.instance || target.instance === 0) {
                if (typeof target.instance === 'string' && target.instance && target.instance.startsWith('system.adapter.')) {
                    target.instance = target.instance.substring('system.adapter.'.length);
                } else if (typeof target.instance === 'number') {
                    target.instance = 'javascript.' + target.instance;
                }

                adapter.sendTo(target.instance, 'jsMessageBus', {message: target.message, script: target.script, data}, timeout && function (result) {
                    timeout && clearTimeout(timeout);

                    sandbox.verbose && result.result && sandbox.log('messageTo => ' + JSON.stringify(result), 'debug');

                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, result, options, target.instance);
                        } catch (e) {
                            errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                        }
                        callback = null;
                    }
                });
            } else {
                context.adapter.getObjectView('system', 'instance', {startkey: 'system.adapter.javascript.', endkey: 'system.adapter.javascript.\u9999'}, options, (err, res) => {
                    const len = 'system.adapter.'.length;
                    const instances = res.rows.map(item => item.id.substring(len));

                    instances.forEach(instance => {
                        adapter.sendTo(instance, 'jsMessageBus', {message: target.message, script: target.script, data}, timeout && function (result) {
                            timeout && clearTimeout(timeout);

                            if (callback && typeof callback === 'function') {
                                sandbox.verbose && sandbox.log('messageTo => ' + JSON.stringify(result), 'debug');

                                try {
                                    callback.call(sandbox, result, options, target.instance);
                                } catch (e) {
                                    errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                                }
                                callback = null;
                            }
                        });
                    });
                });
            }
        },
        onMessage:      function (messageName, callback) {
            if (typeof callback !== 'function') {
                sandbox.log('onMessage callback is not a function', 'error');
                return null;
            } else {
                context.messageBusHandlers[sandbox.name] = context.messageBusHandlers[sandbox.name] || {};
                context.messageBusHandlers[sandbox.name][messageName] = context.messageBusHandlers[sandbox.name][messageName] || [];

                const handler = {id: Date.now() + Math.floor(Math.random() * 10000), cb: callback, sandbox};
                context.messageBusHandlers[sandbox.name][messageName].push(handler);
                return handler.id;
            }
        },
        onMessageUnregister: function (idOrName) {
            const ctx = context.messageBusHandlers[sandbox.name];
            let found = false;
            if (ctx) {
                if (typeof idOrName === 'number') {
                    for (const messageName in ctx) {
                        if (ctx.hasOwnProperty(messageName)) {
                            for (let i = 0; i < ctx[messageName].length; i++) {
                                if (ctx[messageName][i].id === idOrName) {
                                    ctx[messageName].splice(i, 1);
                                    if (!ctx[messageName].length) {
                                        delete ctx[messageName];
                                    }
                                    found = true;
                                    break;
                                }
                            }
                        }
                        if (found) {
                            break;
                        }
                    }
                } else if (idOrName && ctx[idOrName]) {
                    delete ctx[idOrName];
                    found = true;
                }
            }
            return found;
        },
        console: {
            log:    function (msg) {
                sandbox.log(msg, 'info');
            },
            error:  function (msg) {
                sandbox.log(msg, 'error');
            },
            warn:   function (msg) {
                sandbox.log(msg, 'warn');
            },
            debug:  function (msg) {
                sandbox.log(msg, 'debug');
            }
        },
        jsonataExpression: function (data, expression) {
            return jsonata(expression).evaluate(data);
        },
        wait: function (ms) {
            return new Promise(resolve =>
                sandbox.setTimeout(() => resolve(), ms));
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

            // source is set by regexp if defined as /regexp/
            if (!pattern || typeof pattern !== 'string') {
                return adapter.log.error('Error by subscribeObject: pattern can be only string or array of strings.');
            }

            if (typeof callback !== 'function') {
                return adapter.log.error('Error by subscribeObject: callback is not a function');
            }

            const subs = {pattern, callback, name};
            sandbox.verbose && sandbox.log('subscribeObject: ' + JSON.stringify(subs), 'info');

            adapter.subscribeForeignObjects(pattern);

            context.subscriptionsObject.push(subs);

            return subs;
        },
        unsubscribeObject:    function (idOrObject) {
            if (idOrObject && Array.isArray(idOrObject)) {
                const result = [];
                for (let t = 0; t < idOrObject.length; t++) {
                    result.push(sandbox.unsubscribeObject(idOrObject[t]));
                }
                return result;
            }

            sandbox.verbose && sandbox.log(`adapterUnsubscribeObject(id=${idOrObject})`, 'info');

            if (isObject(idOrObject)) {
                for (let i = context.subscriptionsObject.length - 1; i >= 0; i--) {
                    if (context.subscriptionsObject[i] === idOrObject) {
                        adapter.unsubscribeForeignObjects(idOrObject.pattern);
                        context.subscriptionsObject.splice(i, 1);
                        sandbox.__engine.__subscriptionsObject--;
                        return true;
                    }
                }
            } else {
                let deleted = 0;
                for (let i = context.subscriptionsObject.length - 1; i >= 0; i--) {
                    if (context.subscriptionsObject[i].name &&
                        context.subscriptionsObject[i].pattern === idOrObject.pattern) {
                        deleted++;
                        adapter.unsubscribeForeignObjects(idOrObject.pattern);
                        context.subscriptionsObject.splice(i, 1);
                        sandbox.__engine.__subscriptionsObject--;
                    }
                }
                return !!deleted;
            }
        },
        // internal function to send the block debugging info to front-end
        _sendToFrontEnd: function (blockId, data) {
            if (context.rulesOpened === sandbox.scriptName) {
                adapter.setState('debug.rules', JSON.stringify({ruleId: sandbox.scriptName, blockId, data, ts: Date.now()}), true);
            }
        }
    };

    if (adapter.config.enableSetObject) {
        sandbox.setObject = function (id, obj, callback) {
            if (debug) {
                sandbox.log('setObject(id=' + id + ', obj=' + JSON.stringify(obj) + ') - ' + words._('was not executed, while debug mode is active'), 'warn');
                if (typeof callback === 'function') {
                    setTimeout(function () {
                        try {
                            callback.call(sandbox);
                        } catch (e) {
                            errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                        }
                    }, 0);
                }
            } else {
                sandbox.verbose && sandbox.log('setObject(id=' + id + ', obj=' + JSON.stringify(obj) + ')', 'info');
                adapter.setForeignObject(id, obj, callback);
            }
        };
        sandbox.extendObject = function (id, obj, callback) {
            if (debug) {
                sandbox.log('extendObject(id=' + id + ', obj=' + JSON.stringify(obj) + ') - ' + words._('was not executed, while debug mode is active'), 'warn');
                if (typeof callback === 'function') {
                    setTimeout(function () {
                        try {
                            callback.call(sandbox);
                        } catch (e) {
                            errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                        }
                    }, 0);
                }
            } else {
                sandbox.verbose && sandbox.log('extendObject(id=' + id + ', obj=' + JSON.stringify(obj) + ')', 'info');
                adapter.extendForeignObject(id, JSON.parse(JSON.stringify(obj)), callback);
            }
        };
        sandbox.deleteObject = function (id, isRecursive, callback) {
            if (typeof isRecursive === 'function') {
                callback = isRecursive;
                isRecursive = false;
            }
            if (debug) {
                sandbox.log('deleteObject(id=' + id + ') - ' + words._('was not executed, while debug mode is active'), 'warn');
                if (typeof callback === 'function') {
                    setTimeout(function () {
                        try {
                            callback.call(sandbox);
                        } catch (e) {
                            errorInCallback(e); //adapter.log.error('Error in callback: ' + e)
                        }
                    }, 0);
                }
            } else {
                sandbox.verbose && sandbox.log('deleteObject(id=' + id + ')', 'info');
                adapter.delForeignObject(id, {recursive: isRecursive}, callback);
            }
        };
    }

    // promisify methods on the sandbox
    /** @type {(keyof typeof sandbox)[]} */
    const promisifedMethods = [
        'setState',
        'setBinaryState',
        'getState',
        'getBinaryState',
        'existsState',
        'existsObject',
        'getObject',
        'setObject',
        'extendObject',
        'deleteObject',
        'createState',
        'deleteState',
        'writeFile',
        'readFile',
        'unlink',
        'delFile',
    ];
    for (const method of promisifedMethods) {
        sandbox[`${method}Async`] = promisify(sandbox[method]);
    }

    // Make all predefined properties and methods readonly so scripts cannot overwrite them
    for (const prop of Object.keys(sandbox)) {
        Object.defineProperty(sandbox, prop, {
            configurable: false,
            writable: false
        });
    }

    return sandbox;
}

module.exports = sandBox;
