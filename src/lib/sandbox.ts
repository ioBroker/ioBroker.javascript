import { isObject, isArray, promisify, getHttpRequestConfig } from './tools';
import { commonTools } from '@iobroker/adapter-core';
import { type ChildProcess } from 'node:child_process';
import {
    AdapterConfig,
    AstroRule, ChangeType, FileSubscriptionResult, IobSchedule,
    JavascriptContext,
    JsScript, LogMessage,
    Pattern,
    PushoverOptions,
    SandboxType,
    Selector, SubscriptionResult, TimeRule
} from '../types';
import * as constsMod from './consts';
import * as wordsMod from './words';
import * as eventObjMod from './eventObj';
import { patternCompareFunctions as patternCompareFunctionsMod } from './patternCompareFunctions';
import { type PatternEventCompareFunction } from './patternCompareFunctions';
import * as jsonataMod from 'jsonata';
import { type Job } from 'node-schedule';
import { iobJS } from "./javascript";
import {ExecOptions} from "node:child_process";
import { type SendMailOptions } from 'nodemailer';
import { AxiosHeaders, AxiosHeaderValue, AxiosResponse, ResponseType } from 'axios';
import { SchedulerRule } from './scheduler';
import {EventObj} from "./eventObj";
import {AstroEvent} from "./consts";
const pattern2RegEx = commonTools.pattern2RegEx;

export default function sandBox(
    script: JsScript,
    name: string,
    verbose: boolean | undefined,
    debug: boolean | undefined,
    context: JavascriptContext,
): SandboxType {
    const consts = constsMod;
    const words = wordsMod;
    const eventObj = eventObjMod;
    const patternCompareFunctions = patternCompareFunctionsMod;
    const jsonata = jsonataMod;

    const adapter: ioBroker.Adapter = context.adapter;
    const mods = context.mods;
    const states = context.states;
    const objects = context.objects;
    const timers = context.timers;
    const enums = context.enums;
    const debugMode = context.debugMode;
    let sandbox: SandboxType;

    function errorInCallback(e) {
        adapter.setState(`scriptProblem.${name.substring('script.js.'.length)}`, {
            val: true,
            ack: true,
            c: 'errorInCallback',
        });
        context.logError('Error in callback', e);
        context.debugMode && console.log(`error$$${name}$$Exception in callback: ${e}`, Date.now());
    }

    function subscribePattern(script: JsScript, pattern: string): void {
        if ((adapter.config as AdapterConfig).subscribe) {
            if (!script.subscribes[pattern]) {
                script.subscribes[pattern] = 1;
            } else {
                script.subscribes[pattern]++;
            }

            if (!context.subscribedPatterns[pattern]) {
                context.subscribedPatterns[pattern] = 1;

                sandbox.verbose && sandbox.log(`subscribePattern(pattern=${pattern})`, 'info');
                adapter.subscribeForeignStates(pattern);

                // request current value to deliver old value on change.
                if (typeof pattern === 'string' && !pattern.includes('*')) {
                    adapter.getForeignState(pattern, (err, state) => {
                        if (state) {
                            states[pattern] = state;
                        }
                    });
                } else {
                    adapter.getForeignStates(
                        pattern,
                        (err, _states) => _states && Object.keys(_states).forEach(id => (states[id] = _states[id])),
                    );
                }
            } else {
                context.subscribedPatterns[pattern]++;
            }
        }
    }

    function unsubscribePattern(script: JsScript, pattern: string): void {
        if ((adapter.config as AdapterConfig).subscribe) {
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

    function subscribeFile(script: JsScript, id: string, fileNamePattern: string): void {
        const key = `${id}$%$${fileNamePattern}`;
        if (!script.subscribesFile[key]) {
            script.subscribesFile[key] = 1;
        } else {
            script.subscribesFile[key]++;
        }

        if (!context.subscribedPatternsFile[key]) {
            context.subscribedPatternsFile[key] = 1;
            adapter.subscribeForeignFiles(id, fileNamePattern);
        } else {
            context.subscribedPatternsFile[key]++;
        }
    }

    function unsubscribeFile(script: JsScript, id: string, fileNamePattern: string): void { {
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
                adapter.unsubscribeForeignFiles(id, fileNamePattern);
                delete context.subscribedPatternsFile[key];
            }
        }
    }

    function getPatternCompareFunctions(pattern: Pattern): PatternEventCompareFunction[] & { logic?: 'and' | 'or' } {
        let func: PatternEventCompareFunction;
        const functions: PatternEventCompareFunction[] & { logic?: 'and' | 'or' } = [];
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
    function splitSelectorString(selector: string): Selector {
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
    function selectorStringToRegExp(str: string): RegExp {
        const startsWithWildcard = str[0] === '*';
        const endsWithWildcard = str[str.length - 1] === '*';

        // Sanitize the selector, so it is safe to use in a RegEx
        // Taken from https://stackoverflow.com/a/3561711/10179833 but modified
        // since * has a special meaning in our selector and should not be escaped
        // eslint-disable-next-line no-useless-escape
        str = str.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\*/g, '.*');

        return new RegExp((startsWithWildcard ? '' : '^') + str + (endsWithWildcard ? '' : '$'));
    }

    /**
     * Adds a regular expression for selectors targeting the state ID
     *
     * @param selector The selector to apply the transform to
     */
    function addRegExpToIdAttrSelectors(selector: Selector): Selector {
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
    function looselyEqualsString(value: string | number |boolean | undefined, reference: string): boolean {
        // For booleans, compare the string representation
        // For other types do a loose comparison
        return typeof value === 'boolean'
            ? (value && reference === 'true') || (!value && reference === 'false')
            : value == reference;
    }

    /**
     * Returns the `common.type` for a given variable
     * @param {any} value
     */
    function getCommonTypeOf(value: any): ioBroker.CommonType {
        return isArray(value) ? 'array' : isObject(value) ? 'object' : typeof value as ioBroker.CommonType;
    }

    /**
     * Returns if an id is in an allowed namespace for automatic object creations
     *
     * @param id id to check
     */
    function validIdForAutomaticFolderCreation(id: string): boolean {
        return id.startsWith('javascript.') || id.startsWith('0_userdata.0.') || id.startsWith('alias.0.');
    }

    /**
     * Iterate through object structure to create missing folder objects
     */
    async function ensureObjectStructure(id: string): Promise<void> {
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
            } catch (err) {
                // ignore
            }
            if (!obj || !obj.common) {
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
                    } as ioBroker.FolderObject);
                } catch (err: any) {
                    sandbox.log(`Could not automatically create folder object ${idToCheck}: ${err.message}`, 'info');
                }
            } else {
                //sandbox.log(`    already existing "${idToCheck}": ${JSON.stringify(obj)}`, 'debug');
            }
        }
    }

    function setStateHelper(
        sandbox: SandboxType,
        isCreate: boolean,
        isChanged: boolean,
        id: string,
        state: null | ioBroker.SettableState | ioBroker.StateValue,
        isAck: boolean | 'true' | 'false' | undefined | (() => void),
        callback?: (error?: string) => void,
    ): void {
        if (typeof isAck === 'function') {
            callback = isAck;
            isAck = undefined;
        }

        let stateNotNull: ioBroker.SettableState | ioBroker.StateValue;

        if (isAck === true || isAck === false || isAck === 'true' || isAck === 'false') {
            if (state && typeof state === 'object' && state.val !== undefined) {
                stateNotNull = state;
                // we assume that we were given a state object if
                // state is an object that contains a `val` property
                if (!Object.prototype.hasOwnProperty.call(state, 'ack')) {
                    stateNotNull.ack = isAck === true || isAck === 'true';
                }
            } else if (state === null) {
                stateNotNull = { val: null, ack: isAck === true || isAck === 'true' };
            } else {
                // otherwise, assume that the given state is the value to be set
                stateNotNull = { val: state as ioBroker.StateValue, ack: isAck === true || isAck === 'true' };
            }
        } else if (state === null) {
            stateNotNull = { val: null };
        } else {
            stateNotNull = state;
        }

        // Check a type of state
        if (!objects[id] && objects[`${adapter.namespace}.${id}`]) {
            id = `${adapter.namespace}.${id}`;
        }

        if (isCreate) {
            if (id.match(/^javascript\.\d+\.scriptEnabled/)) {
                sandbox.log(
                    `Own states (${id}) should not be used in javascript.X.scriptEnabled.*! Please move the states to 0_userdata.0.*`,
                    'info',
                );
            } else if (id.match(/^javascript\.\d+\.scriptProblem/)) {
                sandbox.log(
                    `Own states (${id}) should not be used in javascript.X.scriptProblem.*! Please move the states to 0_userdata.0.*`,
                    'info',
                );
            }
        }

        const common = objects[id] ? objects[id].common : null;
        if (common?.type && common.type !== 'mixed' && common.type !== 'json') {
            // Find out which type the value has
            let actualCommonType: ioBroker.CommonType | undefined;
            if (typeof stateNotNull === 'object') {
                if (stateNotNull && stateNotNull.val !== undefined && stateNotNull.val !== null) {
                    actualCommonType = getCommonTypeOf(stateNotNull.val);
                }
            } else if (stateNotNull !== null && stateNotNull !== undefined) {
                actualCommonType = getCommonTypeOf(stateNotNull);
            }
            // If this is not the expected one, issue a warning
            if (actualCommonType && actualCommonType !== common.type) {
                context.logWithLineInfo?.warn(
                    `You are assigning a ${actualCommonType} to the state "${id}" which expects a ${common.type}. ` +
                        `Please fix your code to use a ${common.type} or change the state type to ${actualCommonType}. ` +
                        `This warning might become an error in future versions.`,
                );
            }

            if (actualCommonType === 'array' || actualCommonType === 'object') {
                try {
                    if (typeof stateNotNull === 'object' && typeof stateNotNull.val !== 'undefined') {
                        stateNotNull.val = JSON.stringify(stateNotNull.val);
                    } else {
                        stateNotNull = JSON.stringify(stateNotNull);
                    }
                } catch (err: any) {
                    context.logWithLineInfo?.warn(
                            `Could not stringify value for type ${actualCommonType} and id ${id}: ${err.message}`,
                        );
                    if (typeof callback === 'function') {
                        try {
                            callback.call(
                                sandbox,
                                `Could not stringify value for type ${actualCommonType} and id ${id}: ${err.message}`,
                            );
                        } catch (e) {
                            errorInCallback(e);
                        }
                    }
                }
            }
        }
        // Check min and max of value
        if (typeof stateNotNull === 'object') {
            if (common && typeof stateNotNull.val === 'number') {
                const num: number = stateNotNull.val as number;
                if (common.min !== undefined && num < common.min) {
                    stateNotNull.val = common.min;
                } else if (common.max !== undefined && num > common.max) {
                    stateNotNull.val = common.max;
                }
            }
        } else if (common && typeof stateNotNull === 'number') {
            const num: number = stateNotNull;
            if (common.min !== undefined && num < common.min) {
                stateNotNull = common.min;
            }
            if (common.max !== undefined && num > common.max) {
                stateNotNull = common.max;
            }
        }

        let stateAsObject: ioBroker.State;
        // modify state here, to make it available in callback
        if (typeof stateNotNull !== 'object' || (stateNotNull as ioBroker.SettableState).val === undefined) {
            stateAsObject = context.prepareStateObject(id, {
                val: stateNotNull as ioBroker.StateValue,
                ack: isAck === true || isAck === 'true',
            });
        } else {
            stateAsObject = context.prepareStateObject(id, stateNotNull as ioBroker.SettableState);
        }

        // set as comment: from which script this state was set.
        stateAsObject.c = sandbox.scriptName;

        if (objects[id]) {
            script.setStatePerMinuteCounter++;
            sandbox.verbose && sandbox.log(`setForeignState(id=${id}, state=${JSON.stringify(stateAsObject)})`, 'info');

            if (debug) {
                sandbox.log(
                    `setForeignState(id=${id}, state=${JSON.stringify(stateAsObject)}) - ${words._('was not executed, while debug mode is active')}`,
                    'warn',
                );

                if (typeof callback === 'function') {
                    setImmediate(() => {
                        try {
                            callback.call(sandbox);
                        } catch (e) {
                            errorInCallback(e);
                        }
                    });
                }
            } else {
                if (!(adapter.config as AdapterConfig).subscribe) {
                    // store actual state to make possible to process value in callback
                    // risk that there will be an error on setState is very low
                    // but we will not store new state if the setStateChanged is called
                    if (!isChanged) {
                        context.interimStateValues[id] = stateAsObject;
                    }
                }
                const errHandler = (err: Error | null | undefined, funcId: string): void => {
                    err && sandbox.log(`${funcId}: ${err}`, 'error');
                    // If adapter holds all states
                    if (err && !(adapter.config as AdapterConfig).subscribe) {
                        delete context.interimStateValues[id];
                    }

                    if (typeof callback === 'function') {
                        setImmediate(() => {
                            try {
                                callback.call(sandbox);
                            } catch (e) {
                                errorInCallback(e);
                            }
                        });
                    }
                };
                if (isChanged) {
                    if (!(adapter.config as AdapterConfig).subscribe && context.interimStateValues[id]) {
                        // if the state is changed, we will compare it with interimStateValues
                        const oldState = context.interimStateValues[id],
                            attrs = Object.keys(stateAsObject).filter(attr => attr !== 'ts' && stateAsObject[attr] !== undefined);
                        if (attrs.every(attr => stateAsObject[attr] === oldState[attr]) === false) {
                            // state is changed for sure, and we will call setForeignState
                            // and store new state to interimStateValues
                            context.interimStateValues[id] = stateAsObject;
                            adapter.setForeignState(id, stateAsObject, err => errHandler(err, 'setForeignState'));
                        } else {
                            // otherwise - do nothing as we have cached state, except callback
                            errHandler(null, 'setForeignStateCached');
                        }
                    } else {
                        // adapter doesn't hold all states, or it has not cached then we will simply call setForeignStateChanged
                        adapter.setForeignStateChanged(id, { ...stateAsObject, ts: undefined }, err =>
                            errHandler(err, 'setForeignStateChanged'),
                        );
                    }
                } else {
                    adapter.setForeignState(id, stateAsObject, err => errHandler(err, 'setForeignState'));
                }
            }
        } else {
            context.logWithLineInfo?.warn(`State "${id}" not found`);
            if (typeof callback === 'function') {
                setImmediate(() => {
                    try {
                        callback.call(sandbox, `State "${id}" not found`);
                    } catch (e) {
                        errorInCallback(e);
                    }
                });
            }
        }
    }

    const sandbox: SandboxType = {
        mods,
        _id: script._id,
        name, // deprecated
        scriptName: name,
        instance: adapter.instance || 0,
        defaultDataDir: context.getAbsoluteDefaultDataDir(),
        verbose,
        exports: {}, // Polyfill for the export object in TypeScript modules
        require: function (md: string): any {
            if (typeof md === 'string' && md.startsWith('node:')) {
                md = md.replace(/^node:/, '');
            }

            if (md === 'request') {
                if (!sandbox.__engine.__deprecatedWarnings.includes(md)) {
                    sandbox.log(
                        `request package is deprecated - please use httpGet (or a stable lib like axios) instead!`,
                        'warn',
                    );
                    sandbox.__engine.__deprecatedWarnings.push(md);
                }
            }

            if (mods[md]) {
                return mods[md];
            }

            let error: Error | undefined;

            try {
                mods[md] = require(
                    adapter.getAdapterScopedPackageIdentifier ? adapter.getAdapterScopedPackageIdentifier(md) : md,
                );
                return mods[md];
            } catch (e: any) {
                error = e as Error;
            }

            try {
                // the user requires a module which is not specified in the additional node modules
                // for backward compatibility we check if the module can simply be required directly before we fail (e.g. direct dependencies of javascript adapter)
                adapter.log.debug(`Try direct require of "${md}" as not specified in the additional dependencies`);
                mods[md] = require(md);

                return mods[md];
            } catch (e: any) {
                context.logError(name, error || e, 6);
                adapter.setState(`scriptProblem.${name.substring('script.js.'.length)}`, {
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
        $: function (selector: string): iobJS.QueryResult {
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

            const result: iobJS.QueryResult = {};

            let name: string = '';
            const commonStrings: string[] = [];
            const enumStrings: string[] = [];
            const nativeStrings: string[] = [];
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
            } else if (isInsideCommonString) {
                sandbox.log(`Invalid selector: common close bracket "]" cannot be found in "${selector}"`, 'warn');
                result.error = 'Invalid selector: common close bracket "]" cannot be found';
                return result;
            } else if (isInsideNativeString) {
                sandbox.log(`Invalid selector: native close bracket "}" cannot be found in "${selector}"`, 'warn');
                result.error = 'Invalid selector: native close bracket "}" cannot be found';
                return result;
            } else if (selectorHasInvalidType) {
                const message = `Invalid selector: selector must be a string but is of type ${typeof selector}`;
                sandbox.log(message, 'warn');
                result.error = message;
                return result;
            }

            /** @type {Selector[]} */
            let commonSelectors: Selector[] = commonStrings.map(selector => splitSelectorString(selector));
            let nativeSelectors: Selector[] = nativeStrings.map(selector => splitSelectorString(selector));
            const enumSelectorObjects: Selector[] = enumStrings.map(_enum => splitSelectorString(_enum));
            const allSelectors: Selector[] = commonSelectors.concat(nativeSelectors, enumSelectorObjects);

            // These selectors match the state or object ID and don't belong in the common/native selectors
            // Also use RegExp for the ID matching
            const stateIdSelectors: Selector[] = allSelectors
                .filter(selector => selector.attr === 'state.id')
                .map(selector => addRegExpToIdAttrSelectors(selector));
            const objectIdSelectors: Selector[] = allSelectors
                .filter(selector => selector.attr === 'id')
                .map(selector => addRegExpToIdAttrSelectors(selector));
            commonSelectors = commonSelectors.filter(
                selector => selector.attr !== 'state.id' && selector.attr !== 'id',
            );
            nativeSelectors = nativeSelectors.filter(
                selector => selector.attr !== 'state.id' && selector.attr !== 'id',
            );
            const enumSelectors: string[] = enumSelectorObjects
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
                    for (const _id in objects) {
                        if (Object.prototype.hasOwnProperty.call(objects, _id) && objects[_id].type === 'state') {
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
                        if (Object.prototype.hasOwnProperty.call(objects, _id) && objects[_id].type === 'schedule') {
                            context.schedules.push(_id);
                        }
                    }
                }
            }

            /**
             * applies all selectors targeting an object or state ID
             */
            function applyIDSelectors(objId: string, selectors: Selector[]): boolean {
                // Only keep the ID if it matches every ID selector
                return selectors.every(selector => !selector.idRegExp || selector.idRegExp.test(objId));
            }

            /**
             * Applies all selectors targeting the Object common properties
             *
             * @param objId - The ID of the object in question
             */
            function applyCommonSelectors(objId: string): boolean {
                const obj = objects[objId];
                if (!obj?.common) {
                    return false;
                }
                const objCommon = obj.common;

                // make sure this object satisfies all selectors
                return commonSelectors.every(
                    selector =>
                        // ensure a property exists
                        (selector.value === undefined && objCommon[selector.attr] !== undefined) ||
                        // or match exact values
                        looselyEqualsString(objCommon[selector.attr], selector.value),
                );
            }

            /**
             * Applies all selectors targeting the Object native properties
             *
             * @param objId - The ID of the object in question
             */
            function applyNativeSelectors(objId: string): boolean {
                const obj = objects[objId];
                if (!obj || !obj.native) {
                    return false;
                }
                const objNative = obj.native;
                // make sure this object satisfies all selectors
                return nativeSelectors.every(
                    selector =>
                        // ensure a property exists
                        (selector.value === undefined && objNative[selector.attr] !== undefined) ||
                        // or match exact values
                        looselyEqualsString(objNative[selector.attr], selector.value),
                );
            }

            /**
             * Applies all selectors targeting the Objects enums
             *
             * @param objId - The ID of the object in question
             */
            function applyEnumSelectors(objId: string): boolean {
                const enumIds: string[] = [];
                eventObj.getObjectEnumsSync(context, objId, enumIds);
                // make sure this object satisfies all selectors
                return enumSelectors.every(_enum => enumIds.includes(_enum));
            }

            let res: string[] = [];

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
            } else if (name === 'channel') {
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
                res = res
                    .map(id => context.channels[id])
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
                res = res
                    .map(id => context.devices[id])
                    // and flatten the array to get only the state IDs
                    .reduce((acc, next) => acc.concat(next), []);

                // now filter out those that don't match every ID selector for the state ID
                if (stateIdSelectors.length) {
                    res = res.filter(stateId => applyIDSelectors(stateId, stateIdSelectors));
                }
            } else {
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
            result.toArray = function (): string[] {
                return [...resUnique];
            };
            result.each = function (callback: (id: string, index: number) => void | false): iobJS.QueryResult {
                if (typeof callback === 'function') {
                    let r: boolean | void;
                    for (let i = 0; i < this.length; i++) {
                        r = callback(result[i], i);
                        if (r === false) {
                            break;
                        }
                    }
                }
                return this;
            };
            result.getState = function (callback?: (err: Error | null | undefined, state?: ioBroker.State | null) => void): void | null | undefined | ioBroker.State {
                if ((adapter.config as AdapterConfig).subscribe) {
                    if (typeof callback !== 'function') {
                        sandbox.log('You cannot use this function synchronous', 'error');
                    } else {
                        adapter.getForeignState(this[0], (err, state) =>
                            callback(err, context.convertBackStringifiedValues(this[0], state)),
                        );
                    }
                } else {
                    if (!this[0]) {
                        return null;
                    }
                    if (context.interimStateValues[this[0]] !== undefined) {
                        return context.convertBackStringifiedValues(this[0], context.interimStateValues[this[0]]);
                    }
                    return context.convertBackStringifiedValues(this[0], states[this[0]]);
                }
            };
            result.getStateAsync = async function (): Promise<ioBroker.State | null> {
                if ((adapter.config as AdapterConfig).subscribe) {
                    const state = await adapter.getForeignStateAsync(this[0]);
                    return context.convertBackStringifiedValues(this[0], state);
                } else {
                    if (!this[0]) {
                        return null;
                    }
                    if (context.interimStateValues[this[0]] !== undefined) {
                        return context.convertBackStringifiedValues(this[0], context.interimStateValues[this[0]]);
                    }
                    return context.convertBackStringifiedValues(this[0], states[this[0]]);
                }
            };
            result.setState = function (state: ioBroker.SettableState | ioBroker.StateValue, isAck?: boolean | 'false' | 'true' | null, callback) {
                if (typeof isAck === 'function') {
                    callback = isAck;
                    isAck = undefined;
                }
                result.setStateAsync(state, isAck).then(() => typeof callback === 'function' && callback());
                return this;
            };
            result.setStateAsync = async function (state: ioBroker.SettableState | ioBroker.StateValue, isAck?: boolean): Promise<void> {
                for (let i = 0; i < this.length; i++) {
                    await sandbox.setStateAsync(this[i], state, isAck);
                }
            };
            result.setStateChanged = function (state: ioBroker.SettableState | ioBroker.StateValue, isAck?: boolean, callback?: () => void) {
                if (typeof isAck === 'function') {
                    callback = isAck;
                    isAck = undefined;
                }
                result.setStateChangedAsync(state, isAck).then(() => typeof callback === 'function' && callback());
                return this;
            };
            result.setStateChangedAsync = async function (state: ioBroker.SettableState | ioBroker.StateValue, isAck?: boolean): Promise<void> {
                for (let i = 0; i < this.length; i++) {
                    await sandbox.setStateChangedAsync(this[i], state, isAck);
                }
            };
            result.setStateDelayed = function (state: ioBroker.SettableState | ioBroker.StateValue, isAck: boolean | number | undefined, delay: number | boolean, clearRunning: boolean | (() => void), callback?: () => void) {
                if (typeof isAck !== 'boolean') {
                    callback = clearRunning as () => void;
                    clearRunning = delay as boolean;
                    delay = isAck as number;
                    isAck = undefined;
                }
                if (typeof delay !== 'number') {
                    callback = clearRunning as () => void;
                    clearRunning = delay;
                    delay = 0;
                }
                if (typeof clearRunning !== 'boolean') {
                    callback = clearRunning;
                    clearRunning = true;
                }
                let count = this.length;
                for (let i = 0; i < this.length; i++) {
                    sandbox.setStateDelayed(this[i], state, isAck as boolean, delay, clearRunning, () => {
                        if (!--count && typeof callback === 'function') {
                            callback();
                        }
                    });
                }
                return this;
            };
            result.on = function (callbackOrId: string | ((data: any) => void), value?: any) {
                for (let i = 0; i < this.length; i++) {
                    sandbox.subscribe(this[i], callbackOrId, value);
                }
                return this;
            };
            return result;
        },
        log: function (msg: string, severity?: ioBroker.LogLevel): void {
            severity = severity || 'info';

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

            if (debugMode) {
                console.log(`${severity}$$${name}$$${msg}`, Date.now());
            } else {
                adapter.log[severity](`${name}: ${msg}`);
            }
        },
        onLog: function (severity: ioBroker.LogLevel, callback: (info: LogMessage) => void): number {
            if (!['info', 'error', 'debug', 'silly', 'warn', '*'].includes(severity)) {
                sandbox.log(`Unknown severity "${severity}"`, 'warn');
                return 0;
            }
            if (typeof callback !== 'function') {
                sandbox.log(`Invalid callback for onLog`, 'warn');
                return 0;
            }

            const handler = { id: Date.now() + Math.floor(Math.random() * 10000), cb: callback, sandbox, severity };
            context.logSubscriptions[sandbox.scriptName] = context.logSubscriptions[sandbox.scriptName] || [];
            context.logSubscriptions[sandbox.scriptName].push(handler);
            context.updateLogSubscriptions();

            sandbox.__engine.__subscriptionsLog += 1;

            sandbox.verbose &&
                sandbox.log(
                    `onLog(severity=${severity}, id=${handler.id}) - logSubscriptions=${sandbox.__engine.__subscriptionsLog}`,
                    'info',
                );

            if (sandbox.__engine.__subscriptionsLog % (adapter.config as AdapterConfig).maxTriggersPerScript === 0) {
                sandbox.log(
                    `More than ${sandbox.__engine.__subscriptionsLog} log subscriptions registered. Check your script!`,
                    'warn',
                );
            }

            return handler.id;
        },
        onLogUnregister: function (idOrCallbackOrSeverity: string | ioBroker.LogLevel | ((info: LogMessage) => void)): boolean {
            let found = false;

            if (context.logSubscriptions?.[sandbox.scriptName]) {
                sandbox.verbose &&
                    sandbox.log(
                        `onLogUnregister(idOrCallbackOrSeverity=${idOrCallbackOrSeverity}) - logSubscriptions=${sandbox.__engine.__subscriptionsLog}`,
                        'info',
                    );

                for (let i = 0; i < context.logSubscriptions[sandbox.scriptName].length; i++) {
                    if (
                        context.logSubscriptions[sandbox.scriptName][i].cb === idOrCallbackOrSeverity ||
                        context.logSubscriptions[sandbox.scriptName][i].id === idOrCallbackOrSeverity ||
                        context.logSubscriptions[sandbox.scriptName][i].severity === idOrCallbackOrSeverity
                    ) {
                        sandbox.verbose &&
                            sandbox.log(
                                `onLogUnregister(idOrCallbackOrSeverity=${idOrCallbackOrSeverity}, removing id=${context.logSubscriptions[sandbox.scriptName][i].id})`,
                                'info',
                            );

                        context.logSubscriptions[sandbox.scriptName].splice(i, 1);
                        i--;
                        sandbox.__engine.__subscriptionsLog--;

                        found = true;

                        // if deletion via ID
                        if (typeof idOrCallbackOrSeverity === 'number') {
                            break;
                        }
                    } else {
                        sandbox.verbose &&
                            sandbox.log(
                                `onLogUnregister(idOrCallbackOrSeverity=${idOrCallbackOrSeverity}) NOT = ${JSON.stringify(context.logSubscriptions[sandbox.scriptName][i])}`,
                                'info',
                            );
                    }
                }
            }

            context.updateLogSubscriptions();

            return found;
        },
        exec: function (
            cmd: string,
            options?: ExecOptions | ((error: Error | null | string, stdout?: string, stderr?: string) => void),
            callback?: (error: Error | null | string, stdout?: string, stderr?: string) => void,
    ): undefined | ChildProcess {
            if (typeof options === 'function') {
                callback = options as (error: Error | null | string, stdout?: string, stderr?: string) => void;
                options = {};
            }
            if (!(adapter.config as AdapterConfig).enableExec) {
                const error = 'exec is not available. Please enable "Enable Exec" option in instance settings';
                sandbox.log(error, 'error');

                if (typeof callback === 'function') {
                    setImmediate(callback, error, undefined, undefined);
                }
            } else {
                sandbox.verbose && sandbox.log(`exec(cmd=${cmd})`, 'info');

                if (debug) {
                    sandbox.log(words._('Command %s was not executed, while debug mode is active', cmd), 'warn');
                    if (typeof callback === 'function') {
                        setImmediate(function () {
                            callback(null, '', '');
                        });
                    }
                } else {
                    return mods.child_process.exec(cmd, options, (error: Error | null, stdout: string, stderr: string): void => {
                        if (typeof callback === 'function') {
                            try {
                                callback.call(sandbox, error, stdout, stderr);
                            } catch (e) {
                                errorInCallback(e);
                            }
                        }
                    });
                }
            }
        },
        email: function (msg: string | SendMailOptions): void {
            sandbox.verbose && sandbox.log(`email(msg=${JSON.stringify(msg)})`, 'info');
            sandbox.log(`email(msg=${JSON.stringify(msg)}) is deprecated. Please use sendTo instead!`, 'warn');
            adapter.sendTo('email', msg);
        },
        pushover: function (msg: string| PushoverOptions): void {
            sandbox.verbose && sandbox.log(`pushover(msg=${JSON.stringify(msg)})`, 'info');
            sandbox.log(`pushover(msg=${JSON.stringify(msg)}) is deprecated. Please use sendTo instead!`, 'warn');
            adapter.sendTo('pushover', msg);
        },
        httpGet: function (
            url: string,
            options: {
                timeout?: number;
                responseType?: ResponseType;
                headers?: Record<string, string>;
                basicAuth?: { user: string; password: string } | null;
                bearerAuth?: string;
                validateCertificate?: boolean;
            } | ((error: Error | null, result: {
                statusCode: number | null,
                data: any,
                headers: Record<string, string>,
                responseTime: number,
            }) => void),
            callback?: (error: Error | null, result: {
                statusCode: number | null,
                data: any,
                headers: Record<string, string>,
                responseTime: number,
            }) => void
        ): void {
            if (typeof options === 'function') {
                callback = options as (error: Error | null, result: {
                    statusCode: number | null,
                    data: any,
                    headers: Record<string, string>,
                    responseTime: number,
                }) => void;
                options = {};
            }

            const config = {
                ...getHttpRequestConfig(url, options),
                method: 'get',
            };

            sandbox.verbose && sandbox.log(`httpGet(config=${JSON.stringify(config)})`, 'info');

            const startTime = Date.now();

            mods.axios
                .default(config)
                .then((response: AxiosResponse) => {
                    const responseTime = Date.now() - startTime;

                    sandbox.verbose && sandbox.log(`httpGet(url=${url}, responseTime=${responseTime}ms)`, 'info');

                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, null, {
                                statusCode: response.status,
                                data: response.data,
                                headers: response.headers as Record<string, string>,
                                responseTime,
                            });
                        } catch (e) {
                            errorInCallback(e);
                        }
                    }
                })
                .catch((error: any) => {
                    const responseTime = Date.now() - startTime;

                    sandbox.log(`httpGet(url=${url}, error=${error.message})`, 'error');

                    if (typeof callback === 'function') {
                        let result: {
                            statusCode: number | null,
                            data: any,
                            headers: Record<string, string>,
                            responseTime: number,
                        } = {
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
                        } catch (e) {
                            errorInCallback(e);
                        }
                    }
                });
        },
        httpPost: function (
            url: string,
            data: any,
            options:
                | {
                timeout?: number;
                responseType?: ResponseType;
                headers?: Record<string, string>;
                basicAuth?: { user: string; password: string } | null;
                bearerAuth?: string;
                validateCertificate?: boolean;
            }
                | ((
                error: Error | null,
                result: {
                    statusCode: number | null;
                    data: any;
                    headers: Record<string, AxiosHeaderValue | undefined>;
                    responseTime: number;
                },
            ) => void),
            callback?: (
                error: Error | null,
                result: {
                    statusCode: number | null;
                    data: any;
                    headers: Record<string, AxiosHeaderValue | undefined>;
                    responseTime: number;
                },
            ) => void,
        ): void {
            if (typeof options === 'function') {
                callback = options;
                options = {};
            }

            const config = {
                ...getHttpRequestConfig(url, options as {
                    timeout?: number;
                    responseType?: ResponseType;
                    headers?: Record<string, string>;
                    basicAuth?: { user: string; password: string } | null;
                    bearerAuth?: string;
                    validateCertificate?: boolean;
                }),
                method: 'post',
                data,
            };

            sandbox.verbose && sandbox.log(`httpPost(config=${JSON.stringify(config)}, data=${data})`, 'info');

            const startTime = Date.now();

            mods.axios
                .default(config)
                .then((response: AxiosResponse) => {
                    const responseTime = Date.now() - startTime;

                    sandbox.verbose && sandbox.log(`httpPost(url=${url}, responseTime=${responseTime}ms)`, 'info');

                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, null, {
                                statusCode: response.status,
                                data: response.data,
                                headers: response.headers,
                                responseTime,
                            });
                        } catch (e) {
                            errorInCallback(e);
                        }
                    }
                })
                .catch(error => {
                    const responseTime = Date.now() - startTime;

                    sandbox.log(`httpPost(url=${url}, error=${error.message})`, 'error');

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
                        } catch (e) {
                            errorInCallback(e);
                        }
                    }
                });
        },
        createTempFile: function (fileName: string, data: Buffer | string): undefined | string {
            const os = mods.os;
            const path = mods.path;
            const fs = mods.fs;

            let tempDirPath = context.tempDirectories?.[sandbox.scriptName];

            if (!tempDirPath) {
                // create temp directory
                tempDirPath = fs.mkdtempSync(
                    path.join(os.tmpdir(), `${sandbox.scriptName.substring('script.js.'.length)}-`),
                );
                context.tempDirectories[sandbox.scriptName] = tempDirPath;

                sandbox.verbose &&
                    sandbox.log(
                        `createTempFile(fileName=${fileName}, tempDirPath=${tempDirPath}) created temp directory in ${os.tmpdir()}`,
                        'info',
                    );
            }

            const filePath = path.join(tempDirPath, fileName);

            // is sub dir?
            const fileDir = path.dirname(filePath);
            if (!fs.existsSync(fileDir)) {
                fs.mkdirSync(fileDir, { recursive: true });
            }

            if (typeof data === 'undefined') {
                sandbox.log(
                    `createTempFile(fileName=${fileName}, fileDir=${fileDir}, filePath=${filePath}) data is undefined, file not created!`,
                    'error',
                );

                return undefined;
            }

            fs.writeFileSync(filePath, data);
            sandbox.verbose &&
                sandbox.log(`createTempFile(fileName=${fileName}, fileDir=${fileDir}, filePath=${filePath})`, 'info');

            return filePath;
        },
        subscribe: function (
            pattern: TimeRule | AstroRule | Pattern | SchedulerRule | string | (TimeRule | AstroRule | Pattern | SchedulerRule | string)[],
            callbackOrChangeTypeOrId: string | ChangeType | ((event?: EventObj) => void),
            value?: any,
        ): SubscriptionResult | IobSchedule | string | null | undefined | (SubscriptionResult | IobSchedule | string | null | undefined)[] {
            // If a schedule object is given
            if (
                (typeof pattern === 'string' && pattern[0] === '{') ||
                (typeof pattern === 'object' && (pattern as SchedulerRule).period)
            ) {
                return sandbox.schedule(pattern as SchedulerRule, callbackOrChangeTypeOrId as () => void);
            }
            // If an array of schedules is given
            if (pattern && Array.isArray(pattern)) {
                const result: (IobSchedule | string | null | undefined)[] = [];
                for (const p of pattern) {
                    result.push(sandbox.subscribe(p as SchedulerRule | string, callbackOrChangeTypeOrId, value) as IobSchedule | string | null | undefined);
                }
                return result;
            }

            // detect subscribe('id', 'any', (obj) => {})
            let oPattern: Pattern;
            if (
                (typeof pattern === 'string' || pattern instanceof RegExp) &&
                typeof callbackOrChangeTypeOrId === 'string' &&
                typeof value === 'function'
            ) {
                oPattern = { id: pattern, change: callbackOrChangeTypeOrId as ChangeType };
                callbackOrChangeTypeOrId = value;
                value = undefined;
            } else {
                oPattern = pattern as Pattern;
            }

            if (oPattern?.id && Array.isArray(oPattern.id)) {
                const result: (IobSchedule | string | null | undefined)[] = [];
                for (let t = 0; t < oPattern.id.length; t++) {
                    const pa: Pattern = JSON.parse(JSON.stringify(oPattern));
                    pa.id = oPattern.id[t];
                    result.push(sandbox.subscribe(pa, callbackOrChangeTypeOrId, value) as IobSchedule | string | null | undefined);
                }
                return result;
            }

            // try to detect astro or cron (by spaces)
            if (isObject(pattern) || (typeof pattern === 'string' && pattern.match(/[,/\d*]+\s[,/\d*]+\s[,/\d*]+/))) {
                if ((pattern as AstroRule).astro) {
                    return sandbox.schedule(pattern as AstroRule, callbackOrChangeTypeOrId as () => void);
                } else if ((pattern as TimeRule).time) {
                    return sandbox.schedule((pattern as TimeRule).time as string, callbackOrChangeTypeOrId as () => void);
                }
            }

            let callback: undefined | ((obj: EventObj) => void);

            // source is set by regexp if defined as /regexp/
            if (!isObject(pattern) || pattern instanceof RegExp || (pattern as RegExp).source) {
                oPattern = { id: pattern as string | RegExp, change: 'ne' };
            }

            if (oPattern.id !== undefined && !oPattern.id) {
                sandbox.log(`Error by subscription (trigger): empty ID defined. All states matched.`, 'error');
                return;
            } else if (typeof oPattern.id === 'boolean' || typeof oPattern.id === 'number') {
                sandbox.log(`Error by subscription (trigger): Wrong ID of type boolean or number.`, 'error');
                return;
            }

            sandbox.__engine.__subscriptions += 1;

            if (sandbox.__engine.__subscriptions % (adapter.config as AdapterConfig).maxTriggersPerScript === 0) {
                sandbox.log(
                    `More than ${sandbox.__engine.__subscriptions} subscriptions registered. Check your script!`,
                    'warn',
                );
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
            } else {
                if (typeof value === 'undefined') {
                    callback = function (obj: EventObj) {
                        sandbox.setState(callbackOrChangeTypeOrId as string, obj.newState.val);
                    };
                } else {
                    callback = function (/* obj */) {
                        sandbox.setState(callbackOrChangeTypeOrId as string, value);
                    };
                }
            }

            const subs: SubscriptionResult = {
                pattern: oPattern,
                callback: (obj: EventObj) => {
                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, obj);
                        } catch (e) {
                            errorInCallback(e);
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
                    context.adapterSubs[alive] = context.adapterSubs[alive] || [];

                    const subExists = context.adapterSubs[alive].filter(sub => sub === oPattern.id).length > 0;

                    if (!subExists) {
                        context.adapterSubs[alive].push(oPattern.id);
                        adapter.sendTo(a, 'subscribe', oPattern.id);
                    }
                }
            }
            sandbox.verbose && sandbox.log(`subscribe: ${JSON.stringify(subs)}`, 'info');

            subscribePattern(script, oPattern.id as string);

            subs.patternCompareFunctions = getPatternCompareFunctions(oPattern);
            context.subscriptions.push(subs);

            if (oPattern.enumName || oPattern.enumId) {
                context.isEnums = true;
            }
            return subs;
        },
        getSubscriptions: function (): Record<string, { name: string; pattern: Pattern }[]> {
            const result: Record<string, { name: string; pattern: Pattern }[]> = {};
            for (let s = 0; s < context.subscriptions.length; s++) {
                result[context.subscriptions[s].pattern.id as string] = result[context.subscriptions[s].pattern.id as string] || [];
                result[context.subscriptions[s].pattern.id as string].push({
                    name: context.subscriptions[s].name,
                    pattern: context.subscriptions[s].pattern,
                });
            }
            sandbox.verbose && sandbox.log(`getSubscriptions() => ${JSON.stringify(result)}`, 'info');
            return result;
        },
        getFileSubscriptions: function (): Record<string, { name: string; id: string; fileNamePattern: string }[]> {
            const result: Record<string, { name: string; id: string; fileNamePattern: string }[]> = {};
            for (let s = 0; s < context.subscriptionsFile.length; s++) {
                const key = `${context.subscriptionsFile[s].id}$%$${context.subscriptionsFile[s].fileNamePattern}`;
                result[key] = result[key] || [];
                result[key].push({
                    name: context.subscriptionsFile[s].name,
                    id: context.subscriptionsFile[s].id,
                    fileNamePattern: context.subscriptionsFile[s].fileNamePattern,
                });
            }
            sandbox.verbose && sandbox.log(`getFileSubscriptions() => ${JSON.stringify(result)}`, 'info');
            return result;
        },
        adapterSubscribe: function (id: string): void {
            if (typeof id !== 'string') {
                sandbox.log(`adapterSubscribe: invalid type of id ${typeof id}`, 'error');
                return;
            }
            const parts = id.split('.');
            const _adapter = `system.adapter.${parts[0]}.${parts[1]}`;
            if (objects[_adapter]?.common?.subscribable) {
                const a = `${parts[0]}.${parts[1]}`;
                const alive = `system.adapter.${a}.alive`;
                context.adapterSubs[alive] = context.adapterSubs[alive] || [];
                context.adapterSubs[alive].push(id);
                sandbox.verbose && sandbox.log(`adapterSubscribe: ${a} - ${id}`, 'info');
                adapter.sendTo(a, 'subscribe', id);
            }
        },
        adapterUnsubscribe: function (idOrObject: string | SubscriptionResult | (string | SubscriptionResult)[]): boolean | boolean[] {
            // BF: it could be an error
            return sandbox.unsubscribe(id);
        },
        unsubscribe: function (idOrObject: string | SubscriptionResult | (string | SubscriptionResult)[]): boolean | boolean[] {
            if (idOrObject && Array.isArray(idOrObject)) {
                const result: boolean[] = [];
                for (let t = 0; t < idOrObject.length; t++) {
                    result.push(sandbox.unsubscribe(idOrObject[t]) as boolean);
                }
                return result;
            }

            sandbox.verbose && sandbox.log(`adapterUnsubscribe(id=${JSON.stringify(idOrObject)})`, 'info');

            if (isObject(idOrObject)) {
                for (let i = context.subscriptions.length - 1; i >= 0; i--) {
                    if (context.subscriptions[i] === idOrObject) {
                        unsubscribePattern(script, context.subscriptions[i].pattern.id as string);
                        context.subscriptions.splice(i, 1);
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
                    unsubscribePattern(script, context.subscriptions[i].pattern.id as string);
                    context.subscriptions.splice(i, 1);
                    sandbox.__engine.__subscriptions--;
                }
            }
            return !!deleted;
        },
        on: function (
            pattern:
                | TimeRule
                | AstroRule
                | Pattern
                | SchedulerRule
                | string
                | (TimeRule | AstroRule | Pattern | SchedulerRule | string)[],
            callbackOrChangeTypeOrId: string | ChangeType | ((event?: EventObj) => void),
            value?: any,
        ): SubscriptionResult | IobSchedule | string | null | undefined | (SubscriptionResult | IobSchedule | string | null | undefined)[] {
            return sandbox.subscribe(pattern, callbackOrChangeTypeOrId, value);
        },
        onEnumMembers: function (enumId: string, callback: (event?: EventObj) => void): void {
            if (enums.includes(enumId)) {
                const subscriptions: Record<string, string | SubscriptionResult> = {};

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
                        if (!Object.keys(subscriptions).includes(objId)) {
                            if (objects?.[objId]?.type === 'state') {
                                // Just subscribe to states
                                subscriptions[objId] = sandbox.subscribe(objId, callback) as string | SubscriptionResult; // TODO: more features
                            }
                        }
                    }

                    sandbox.verbose &&
                        sandbox.log(
                            `onEnumMembers(id=${id}, members=${JSON.stringify(Object.keys(subscriptions))})`,
                            'info',
                        );
                };

                init();

                sandbox.subscribeObject(enumId, obj => obj && init());
            } else {
                sandbox.log(`onEnumMembers: enum with id "${id}" doesn't exists`, 'error');
            }
        },
        onFile: function (
            id: string,
            fileNamePattern: string | string[],
            withFileOrCallback: boolean | ((id: string, fileName: string, size: number, file?: string | Buffer, mimeType?: string) => void),
            callback?: (id: string, fileName: string, size: number, file?: string | Buffer, mimeType?: string) => void,
        ): undefined | FileSubscriptionResult | (undefined | FileSubscriptionResult)[] {
            if (typeof withFileOrCallback === 'function') {
                callback = withFileOrCallback as (id: string, fileName: string, size: number, file?: string | Buffer, mimeType?: string) => void;
                withFileOrCallback = false;
            }

            if (!adapter.subscribeForeignFiles) {
                sandbox.log(
                    'onFile: your js-controller does not support yet onFile subscribes. Please update to js-controller@4.1.x or newer',
                    'warn',
                );
                return;
            }
            if (!id || !fileNamePattern) {
                sandbox.log(
                    'onFile: invalid parameters. Usage: onFile("vis.0", "main/*", true, (id, fileName, size, file, mimeType) => {});',
                    'error',
                );
                return;
            }
            if (typeof callback !== 'function') {
                sandbox.offFile(id, fileNamePattern);
                return;
            }

            if (Array.isArray(fileNamePattern)) {
                return fileNamePattern.map(filePattern => sandbox.onFile(id, filePattern, withFileOrCallback, callback) as undefined | FileSubscriptionResult);
            }

            sandbox.__engine.__subscriptionsFile += 1;

            sandbox.verbose &&
                sandbox.log(
                    `onFile(id=${id}, fileNamePattern=${fileNamePattern}) - fileSubscriptions=${sandbox.__engine.__subscriptionsFile}`,
                    'info',
                );

            if (sandbox.__engine.__subscriptionsFile % (adapter.config as AdapterConfig).maxTriggersPerScript === 0) {
                sandbox.log(
                    `More than ${sandbox.__engine.__subscriptionsFile} file subscriptions registered. Check your script!`,
                    'warn',
                );
            }

            let idRegEx: RegExp | undefined;
            let fileRegEx: RegExp | undefined;
            if (id.includes('*')) {
                idRegEx = new RegExp(pattern2RegEx(id));
            }
            if (fileNamePattern.includes('*')) {
                fileRegEx = new RegExp(pattern2RegEx(fileNamePattern));
            }

            const subs: FileSubscriptionResult = {
                id,
                fileNamePattern,
                withFile: withFileOrCallback as boolean,
                idRegEx,
                fileRegEx,
                callback: (id: string, fileName: string, size: number, withFile: boolean): void => {
                    try {
                        sandbox.verbose &&
                            sandbox.log(`onFile changed(id=${id}, fileName=${fileName}, size=${size})`, 'info');

                        if (withFile && size > 0) {
                            adapter
                                .readFileAsync(id, fileName)
                                .then(data => {
                                    try {
                                        callback.call(sandbox, id, fileName, size, data.file, data.mimeType);
                                    } catch (e) {
                                        errorInCallback(e);
                                    }
                                })
                                .catch(error => errorInCallback(error));
                        } else {
                            callback.call(sandbox, id, fileName, size);
                        }
                    } catch (e) {
                        errorInCallback(e);
                    }
                },
                name,
            };

            context.subscriptionsFile.push(subs);
            subscribeFile(script, id, fileNamePattern);
            return subs;
        },
        offFile: function (idOrObject: FileSubscriptionResult | string | (FileSubscriptionResult | string)[], fileNamePattern?: string | string[]): boolean | boolean[] {
            if (!adapter.unsubscribeForeignFiles) {
                sandbox.log(
                    'offFile: your js-controller does not support yet file unsubscribes. Please update to js-controller@4.1.x or newer',
                    'warn',
                );
                return false;
            }

            sandbox.verbose &&
                sandbox.log(
                    `offFile(idOrObject=${JSON.stringify(idOrObject)}, fileNamePattern=${fileNamePattern}) - fileSubscriptions=${sandbox.__engine.__subscriptionsFile}`,
                    'info',
                );

            if (idOrObject && typeof idOrObject === 'object') {
                if (Array.isArray(idOrObject)) {
                    const result: boolean[] = [];
                    for (let t = 0; t < idOrObject.length; t++) {
                        result.push(sandbox.offFile(idOrObject[t] as FileSubscriptionResult | string) as boolean);
                    }
                    return result;
                }
                for (let i = context.subscriptionsFile.length - 1; i >= 0; i--) {
                    if (context.subscriptionsFile[i] === idOrObject) {
                        unsubscribeFile(
                            script,
                            context.subscriptionsFile[i].id,
                            context.subscriptionsFile[i].fileNamePattern,
                        );

                        sandbox.verbose &&
                            sandbox.log(
                                `offFile(type=object, fileNamePattern=${fileNamePattern}, removing id=${context.subscriptionsFile[i].id})`,
                                'info',
                            );

                        context.subscriptionsFile.splice(i, 1);
                        sandbox.__engine.__subscriptionsFile--;
                        return true;
                    }
                }
                return false;
            }

            if (isArray(fileNamePattern)) {
                const result: boolean[] = [];
                for (let t = 0; t < fileNamePattern.length; t++) {
                    result.push(sandbox.offFile(idOrObject, fileNamePattern[t]) as boolean);
                }
                return result;
            }

            let deleted = 0;
            for (let i = context.subscriptionsFile.length - 1; i >= 0; i--) {
                if (
                    context.subscriptionsFile[i].id === idOrObject &&
                    context.subscriptionsFile[i].fileNamePattern === fileNamePattern
                ) {
                    deleted++;
                    unsubscribeFile(
                        script,
                        context.subscriptionsFile[i].id,
                        context.subscriptionsFile[i].fileNamePattern,
                    );

                    sandbox.verbose &&
                        sandbox.log(
                            `offFile(type=string, fileNamePattern=${fileNamePattern}, removing id=${context.subscriptionsFile[i].id})`,
                            'info',
                        );

                    context.subscriptionsFile.splice(i, 1);
                    sandbox.__engine.__subscriptionsFile--;
                }
            }
            return !!deleted;
        },
        /** Registers a one-time subscription which automatically unsubscribes after the first invocation */
        once: function (pattern:
            | TimeRule
            | AstroRule
            | Pattern
            | SchedulerRule
            | string
            | (TimeRule | AstroRule | Pattern | SchedulerRule | string)[], callback?: (event?: EventObj) => void): string | SubscriptionResult | Promise<EventObj | undefined>
        {
            function _once(cb: (obj?: EventObj) => void): string | SubscriptionResult {
                let subscription: string | SubscriptionResult;
                const handler = (obj?: EventObj): void => {
                    subscription && sandbox.unsubscribe(subscription);
                    typeof cb === 'function' && cb(obj);
                };
                subscription = sandbox.subscribe(pattern, handler) as string | SubscriptionResult;
                return subscription;
            }
            if (typeof callback === 'function') {
                // Callback-style: once("id", (obj) => { ... })
                return _once(callback);
            }

            // Promise-style: once("id").then(obj => { ... })
            return new Promise(resolve => _once(resolve));
        },
        schedule: function (pattern: SchedulerRule | AstroRule | Date | string, callback: () => void): IobSchedule | string | null | undefined {
            if (typeof callback !== 'function') {
                sandbox.log(`schedule callback missing`, 'error');
                return null;
            }

            if (
                (typeof pattern === 'string' && pattern[0] === '{') ||
                (typeof pattern === 'object' && (pattern as SchedulerRule).period)
            ) {
                sandbox.verbose &&
                    sandbox.log(
                        `schedule(wizard=${typeof pattern === 'object' ? JSON.stringify(pattern) : pattern})`,
                        'info',
                    );

                const schedule: string | null = context.scheduler.add(pattern as SchedulerRule | string, sandbox.scriptName, callback);
                if (schedule) {
                    script.wizards.push(schedule);
                    sandbox.__engine.__schedules += 1;

                    if (sandbox.__engine.__schedules % (adapter.config as AdapterConfig).maxTriggersPerScript === 0) {
                        sandbox.log(
                            `More than ${sandbox.__engine.__schedules} schedules registered. Check your script!`,
                            'warn',
                        );
                    }
                }

                return schedule;
            }

            if (typeof pattern === 'object' && (pattern as AstroRule).astro) {
                const astroPattern = pattern as AstroRule;
                const nowdate = new Date();

                if (
                    (adapter.config as AdapterConfig).latitude === undefined ||
                    (adapter.config as AdapterConfig).longitude === undefined ||
                    (adapter.config as AdapterConfig).latitude === '' ||
                    (adapter.config as AdapterConfig).longitude === '' ||
                    (adapter.config as AdapterConfig).latitude === null ||
                    (adapter.config as AdapterConfig).longitude === null
                ) {
                    sandbox.log('Longitude or latitude does not set. Cannot use astro.', 'error');
                    return null;
                }

                // ensure events are calculated independent of current time
                // TODO: use getAstroStartOfDay of adapter?
                const todayNoon = new Date(nowdate);
                todayNoon.setHours(12, 0, 0, 0);
                let ts = mods.suncalc.getTimes(
                    todayNoon,
                    (adapter.config as AdapterConfig).latitude,
                    (adapter.config as AdapterConfig).longitude,
                )[astroPattern.astro];

                // event on the next day, correct or force recalculation at midnight
                if (todayNoon.getDate() !== ts.getDate()) {
                    todayNoon.setDate(todayNoon.getDate() - 1);
                    ts = mods.suncalc.getTimes(
                        todayNoon,
                        (adapter.config as AdapterConfig).latitude,
                        (adapter.config as AdapterConfig).longitude,
                    )[astroPattern.astro];
                }

                if (ts.getTime().toString() === 'NaN') {
                    sandbox.log(
                        `Cannot calculate "${astroPattern.astro}" for ${(adapter.config as AdapterConfig).latitude}, ${(adapter.config as AdapterConfig).longitude}`,
                        'warn',
                    );
                    ts = new Date(nowdate.getTime());

                    if (
                        astroPattern.astro === 'sunriseEnd' ||
                        astroPattern.astro === 'goldenHourEnd' ||
                        astroPattern.astro === 'sunset' ||
                        astroPattern.astro === 'nightEnd' ||
                        astroPattern.astro === 'nauticalDusk'
                    ) {
                        ts.setHours(23);
                        ts.setMinutes(59);
                        ts.setSeconds(59);
                    } else {
                        ts.setHours(23);
                        ts.setMinutes(59);
                        ts.setSeconds(58);
                    }
                }

                if (ts && astroPattern.shift) {
                    ts = new Date(ts.getTime() + astroPattern.shift * 60000);
                }

                if (!ts || ts < nowdate) {
                    const date = new Date(nowdate);
                    // Event doesn't occur today - try again tomorrow
                    // Calculate time till 24:00 (local, NOT UTC) and set timeout
                    date.setDate(date.getDate() + 1);
                    date.setMinutes(0); // Sometimes timer fires at 23:59:59
                    date.setHours(0);
                    date.setSeconds(1);
                    date.setMilliseconds(0);

                    sandbox.__engine.__schedules += 1;

                    if (sandbox.__engine.__schedules % (adapter.config as AdapterConfig).maxTriggersPerScript === 0) {
                        sandbox.log(
                            `More than ${sandbox.__engine.__schedules} schedules registered. Check your script!`,
                            'warn',
                        );
                    }

                    sandbox.verbose &&
                        sandbox.log(
                            `schedule(astro=${astroPattern.astro}, offset=${astroPattern.shift}) is tomorrow, waiting until ${date.toISOString()}`,
                            'info',
                        );

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

                if (sandbox.__engine.__schedules % (adapter.config as AdapterConfig).maxTriggersPerScript === 0) {
                    sandbox.log(
                        `More than ${sandbox.__engine.__schedules} schedules registered. Check your script!`,
                        'warn',
                    );
                }

                sandbox.setTimeout(() => {
                    try {
                        callback.call(sandbox);
                    } catch (e) {
                        errorInCallback(e);
                    }
                    // Reschedule in 2 seconds
                    sandbox.setTimeout(() => {
                        if (sandbox.__engine.__schedules > 0) {
                            sandbox.__engine.__schedules--;
                        }
                        sandbox.schedule(astroPattern, callback);
                    }, 2000);
                }, ts.getTime() - Date.now());

                sandbox.verbose &&
                    sandbox.log(
                        `schedule(astro=${astroPattern.astro}, offset=${astroPattern.shift}) is today, waiting until ${ts.toISOString()}`,
                        'info',
                    );
            } else {
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
                if (typeof pattern === 'object' && (pattern as Date).getDate) {
                    pattern = new Date(pattern as Date);
                }

                const schedule: IobSchedule = mods.nodeSchedule.scheduleJob(pattern, (): void => {
                    try {
                        callback.call(sandbox);
                    } catch (e) {
                        errorInCallback(e);
                    }
                });
                if (schedule) {
                    sandbox.__engine.__schedules += 1;

                    if (sandbox.__engine.__schedules % (adapter.config as AdapterConfig).maxTriggersPerScript === 0) {
                        sandbox.log(
                            `More than ${sandbox.__engine.__schedules} schedules registered. Check your script!`,
                            'warn',
                        );
                    }

                    schedule._ioBroker = {
                        type: 'cron',
                        pattern: pattern as string | Date,
                        scriptName: sandbox.scriptName,
                        id: `cron_${Date.now()}_${Math.round(Math.random() * 100000)}`,
                    };

                    script.schedules.push(schedule);
                } else {
                    sandbox.log(`schedule(cron=${pattern}): cannot create schedule`, 'error');
                }

                sandbox.verbose && sandbox.log(`schedule(cron=${pattern})`, 'info');

                return schedule;
            }
        },
        scheduleById: function (id: string, ack: boolean | (() => void) | undefined, callback?: () => void): void {
            let scheduleId: IobSchedule | string | null | undefined = null;
            let currentExp: string | null = null; // current cron expression

            if (typeof ack === 'function') {
                callback = ack;
                ack = undefined;
            }

            const rhms = /^(2[0-3]|[01]?[0-9]):([0-5]?[0-9]):([0-5]?[0-9])$/; // hh:mm:ss
            const rhm = /^(2[0-3]|[01]?[0-9]):([0-5]?[0-9])$/; // hh:mm

            const init = (time: string): void => {
                if (typeof time === 'string') {
                    let h: number | undefined = undefined;
                    let m: number | undefined = undefined;
                    let s: number | undefined = undefined;

                    let isValid = false;

                    if (rhms.test(time)) {
                        [h, m, s] = time.match(rhms)?.slice(1)
                            .map(v => parseInt(v));
                        isValid = true;
                    } else if (rhm.test(time)) {
                        [h, m] = time.match(rhm)?.slice(1)
                            .map(v => parseInt(v));
                        isValid = true;
                    }

                    if (isValid) {
                        const cronExp = `${s ?? '0'} ${m ?? '0'} ${h ?? '0'} * * *`;

                        if (cronExp !== currentExp) {
                            sandbox.verbose &&
                                sandbox.log(
                                    `scheduleById(id=${id}): Init with expression ${cronExp} from ${time}`,
                                    'info',
                                );
                            currentExp = cronExp;

                            if (scheduleId) {
                                sandbox.clearSchedule(scheduleId);
                                scheduleId = null;
                            }

                            scheduleId = sandbox.schedule(cronExp, () => {
                                if (typeof callback === 'function') {
                                    try {
                                        callback.call(sandbox);
                                    } catch (e) {
                                        errorInCallback(e);
                                    }
                                }
                            });
                        }
                    } else {
                        sandbox.log(
                            `scheduleById(id=${id},time=${time}): cannot create schedule - invalid format (HH:MM:SS or H:M:S required)`,
                            'error',
                        );
                    }
                } else {
                    sandbox.log(
                        `scheduleById(id=${id}): cannot create schedule - invalid var type (no string)`,
                        'error',
                    );
                }
            };

            sandbox.getState(id, (err, state) => {
                if (!err && state?.val) {
                    sandbox.verbose && sandbox.log(`scheduleById(id=${id}): Init with value ${state.val}`, 'info');
                    init(state.val.toString());
                }
            });

            const triggerDef: Pattern = { id, change: 'any' };
            if (ack !== undefined) {
                triggerDef.ack = ack as boolean;
            }

            sandbox.on(triggerDef, obj => {
                if (obj?.state?.val) {
                    sandbox.verbose &&
                        sandbox.log(`scheduleById(id=${id}): Update with value ${obj.state.val}`, 'info');
                    init(obj.state.val.toString());
                }
            });
        },
        getAstroDate: function (pattern: AstroEvent, date?: Date | number, offsetMinutes?: number): Date | undefined {
            if (date === undefined) {
                date = new Date();
            }
            if (typeof date === 'number') {
                date = new Date(date);
            } else {
                date = new Date(date.getTime());
            }

            if (!consts.astroList.includes(pattern)) {
                const pos = consts.astroListLow.indexOf(pattern.toLowerCase());
                if (pos !== -1) {
                    pattern = consts.astroList[pos];
                }
            }

            if (
                (!(adapter.config as AdapterConfig).latitude && (adapter.config as AdapterConfig).latitude !== 0) ||
                (!(adapter.config as AdapterConfig).longitude && (adapter.config as AdapterConfig).longitude !== 0)
            ) {
                sandbox.log('Longitude or latitude does not set. Cannot use astro.', 'error');
                return;
            }

            // ensure events are calculated independent of current time
            date.setHours(12, 0, 0, 0);
            let ts = mods.suncalc.getTimes(
                date,
                (adapter.config as AdapterConfig).latitude,
                (adapter.config as AdapterConfig).longitude,
            )[pattern];

            if (ts === undefined || ts.getTime().toString() === 'NaN') {
                sandbox.log(
                    `Cannot calculate astro date "${pattern}" for ${(adapter.config as AdapterConfig).latitude}, ${(adapter.config as AdapterConfig).longitude}`,
                    'warn',
                );
            }

            sandbox.verbose && sandbox.log(`getAstroDate(pattern=${pattern}, date=${date}) => ${ts}`, 'info');

            if (offsetMinutes !== undefined) {
                ts = new Date(ts.getTime() + offsetMinutes * 60000);
            }
            return ts;
        },
        isAstroDay: function (): boolean | undefined {
            const nowDate = new Date();
            const dayBegin = sandbox.getAstroDate('sunrise');
            const dayEnd = sandbox.getAstroDate('sunset');

            if (dayBegin === undefined || dayEnd === undefined) {
                return;
            }

            sandbox.verbose && sandbox.log(`isAstroDay() => ${nowDate >= dayBegin && nowDate <= dayEnd}`, 'info');

            return nowDate >= dayBegin && nowDate <= dayEnd;
        },
        clearSchedule: function (schedule) {
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
            }
            for (let i = 0; i < script.schedules.length; i++) {
                if (schedule && typeof schedule === 'object' && schedule.type === 'cron') {
                    if (script.schedules[i]._ioBroker && script.schedules[i]._ioBroker.id === schedule.id) {
                        if (!mods.nodeSchedule.cancelJob(script.schedules[i])) {
                            sandbox.log('Error by canceling scheduled job', 'error');
                        }
                        delete script.schedules[i];
                        script.schedules.splice(i, 1);
                        if (sandbox.__engine.__schedules > 0) {
                            sandbox.__engine.__schedules--;
                        }

                        sandbox.verbose && sandbox.log('clearSchedule() => cleared', 'info');
                        return true;
                    }
                } else if (script.schedules[i] === schedule) {
                    if (!mods.nodeSchedule.cancelJob(script.schedules[i])) {
                        sandbox.log('Error by canceling scheduled job', 'error');
                    }
                    delete script.schedules[i];
                    script.schedules.splice(i, 1);
                    if (sandbox.__engine.__schedules > 0) {
                        sandbox.__engine.__schedules--;
                    }

                    sandbox.verbose && sandbox.log('clearSchedule() => cleared', 'info');
                    return true;
                }
            }

            sandbox.verbose && sandbox.log('clearSchedule() => invalid handler', 'warn');
            return false;
        },
        getSchedules: function (allScripts) {
            const schedules = context.scheduler.getList();
            if (allScripts) {
                Object.keys(context.scripts).forEach(
                    name =>
                        context.scripts[name].schedules &&
                        context.scripts[name].schedules.forEach(s =>
                            schedules.push(JSON.parse(JSON.stringify(s._ioBroker))),
                        ),
                );
            } else {
                script.schedules &&
                    script.schedules.forEach(s => schedules.push(JSON.parse(JSON.stringify(s._ioBroker))));
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

            // Check type of state
            if (!objects[id] && objects[`${adapter.namespace}.${id}`]) {
                id = `${adapter.namespace}.${id}`;
            }

            sandbox.verbose &&
                sandbox.log(
                    `setStateDelayed(id=${id}, state=${JSON.stringify(state)}, isAck=${isAck}, delay=${delay}, clearRunning=${clearRunning})`,
                    'info',
                );

            if (clearRunning) {
                if (timers[id]) {
                    sandbox.verbose &&
                        sandbox.log(`setStateDelayed: clear ${timers[id].length} running timers`, 'info');

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
                if (context.timerId > 0xfffffffe) {
                    context.timerId = 0;
                }

                // Start timeout
                const timer = setTimeout(
                    function (_timerId, _id, _state, _isAck) {
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
                    },
                    delay,
                    context.timerId,
                    id,
                    state,
                    isAck,
                );

                // add timer handler
                timers[id].push({
                    t: timer,
                    id: context.timerId,
                    ts: Date.now(),
                    delay: delay,
                    val: isObject(state) && state.val !== undefined ? state.val : state,
                    ack: isObject(state) && state.val !== undefined && state.ack !== undefined ? state.ack : isAck,
                });

                return context.timerId;
            }
        },
        clearStateDelayed: function (id, timerId) {
            // Check type of state
            if (!objects[id] && objects[`${adapter.namespace}.${id}`]) {
                id = `${adapter.namespace}.${id}`;
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
                                        id: _id_,
                                        left: timers[_id_][ttt].delay - (now - timers[id][ttt].ts),
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

                result = [];
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
            } else {
                result = {};
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
            }
            return result;
        },
        getStateAsync: async function (id) {
            let state;
            if (id.includes('.')) {
                state = await adapter.getForeignStateAsync(id);
            } else {
                state = await adapter.getStateAsync(id);
            }
            return context.convertBackStringifiedValues(id, state);
        },
        setStateAsync: function (id: string, state: ioBroker.SettableState | ioBroker.StateValue, isAck?: boolean): Promise<void> {
            return new Promise((resolve, reject) =>
                setStateHelper(sandbox, false, false, id, state, isAck, err => (err ? reject(err) : resolve())),
            );
        },
        setStateChangedAsync: function (id: string, state: ioBroker.SettableState | ioBroker.StateValue, isAck?: boolean): Promise<void> {
            return new Promise((resolve, reject) =>
                setStateHelper(sandbox, false, true, id, state, isAck, err => (err ? reject(err) : resolve())),
            );
        },
        getState: function (id: string, callback?: (err: Error | null | undefined, state?: ioBroker.State | null | undefined) => void): undefined | void | (ioBroker.State & { notExist?: true }) {
            if (typeof id !== 'string') {
                sandbox.log(`getState has been called with id of type "${typeof id}" but expects a string`, 'error');
                return undefined;
            }

            if (typeof callback === 'function') {
                if (!id.includes('.')) {
                    adapter.getState(id, (err, state) =>
                        callback(err, context.convertBackStringifiedValues(id, state)),
                    );
                } else {
                    adapter.getForeignState(id, (err, state) =>
                        callback(err, context.convertBackStringifiedValues(id, state)),
                    );
                }
            } else {
                if ((adapter.config as AdapterConfig).subscribe) {
                    sandbox.log(
                        'The "getState" method cannot be used synchronously, because the adapter setting "Do not subscribe to all states on start" is enabled.',
                        'error',
                    );
                    sandbox.log(
                        `Please disable that setting or use "getState" with a callback, e.g.: getState('${id}', (err, state) => { ... });`,
                        'error',
                    );
                } else {
                    if (states[id]) {
                        sandbox.verbose &&
                            sandbox.log(
                                `getState(id=${id}, timerId=${timers[id]}) => ${JSON.stringify(states[id])}`,
                                'info',
                            );
                        if (context.interimStateValues[id] !== undefined) {
                            return context.convertBackStringifiedValues(id, context.interimStateValues[id]);
                        }
                        return context.convertBackStringifiedValues(id, states[id]);
                    } else if (states[`${adapter.namespace}.${id}`]) {
                        sandbox.verbose &&
                            sandbox.log(
                                `getState(id=${id}, timerId=${timers[id]}) => ${states[`${adapter.namespace}.${id}`]}`,
                                'info',
                            );
                        if (context.interimStateValues[`${adapter.namespace}.${id}`] !== undefined) {
                            return context.convertBackStringifiedValues(
                                id,
                                context.interimStateValues[`${adapter.namespace}.${id}`],
                            );
                        }
                        return context.convertBackStringifiedValues(id, states[`${adapter.namespace}.${id}`]);
                    }

                    sandbox.verbose && sandbox.log(`getState(id=${id}, timerId=${timers[id]}) => not found`, 'info');

                    context.logWithLineInfo &&
                        context.logWithLineInfo.warn(
                            `getState "${id}" not found (3)${states[id] !== undefined ? ` states[id]=${states[id]}` : ''}`,
                        ); ///xxx
                    return { val: null, notExist: true } as ioBroker.State & { notExist?: true };
                }
            }
        },
        existsState: function (id, callback) {
            if (typeof id !== 'string') {
                sandbox.log(`existsState has been called with id of type "${typeof id}" but expects a string`, 'error');
                return false;
            }

            if (typeof callback === 'function') {
                adapter.getForeignObject(id, (err, obj) => {
                    if (!obj || obj.type !== 'state') {
                        callback(err, false);
                        return;
                    }

                    if ((adapter.config as AdapterConfig).subscribe) {
                        adapter.getForeignState(id, (err, state) => {
                            callback(err, !!state);
                        });
                    } else {
                        callback(err, !!states[id]);
                    }
                });
            } else {
                if ((adapter.config as AdapterConfig).subscribe) {
                    sandbox.log(
                        'The "existsState" method cannot be used synchronously, because the adapter setting "Do not subscribe to all states on start" is enabled.',
                        'error',
                    );
                    sandbox.log(
                        `Please disable that setting or use "existsState" with a callback, e.g.: existsState('${id}', (err, stateExists) => { ... });`,
                        'error',
                    );
                } else {
                    return !!states[id];
                }
            }
        },
        existsObject: function (id, callback) {
            if (typeof id !== 'string') {
                sandbox.log(
                    `existsObject has been called with id of type "${typeof id}" but expects a string`,
                    'error',
                );
                return false;
            }

            if (typeof callback === 'function') {
                adapter.getForeignObject(id, (err, obj) => callback(err, !!obj));
            } else {
                return !!objects[id];
            }
        },
        getIdByName: function (name, alwaysArray) {
            sandbox.verbose &&
                sandbox.log(
                    `getIdByName(name=${name}, alwaysArray=${alwaysArray}) => ${JSON.stringify(context.names[name])}`,
                    'info',
                );
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
                return false;
            }

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
                        adapter.setState(`scriptProblem.${name.substring('script.js.'.length)}`, {
                            val: true,
                            ack: true,
                            c: 'getObject',
                        });
                        sandbox.log(`Object "${id}" can't be copied: ${JSON.stringify(err)}`, 'error');
                        return cb();
                    }
                    sandbox.verbose &&
                        sandbox.log(`getObject(id=${id}, enumName=${enumName}) => ${JSON.stringify(result)}`, 'info');
                    cb(err, result);
                });
            } else {
                if (!objects[id]) {
                    sandbox.verbose &&
                        sandbox.log(`getObject(id=${id}, enumName=${enumName}) => does not exist`, 'info');
                    sandbox.log(`Object "${id}" does not exist`, 'warn');
                    return null;
                } else if (enumName) {
                    const e = eventObj.getObjectEnumsSync(context, id);
                    const obj = JSON.parse(JSON.stringify(objects[id]));
                    obj.enumIds = JSON.parse(JSON.stringify(e.enumIds));
                    obj.enumNames = JSON.parse(JSON.stringify(e.enumNames));
                    if (typeof enumName === 'string') {
                        const r = new RegExp(`^enum\\.${enumName}\\.`);
                        for (let i = obj.enumIds.length - 1; i >= 0; i--) {
                            if (!r.test(obj.enumIds[i])) {
                                obj.enumIds.splice(i, 1);
                                obj.enumNames.splice(i, 1);
                            }
                        }
                    }
                    sandbox.verbose &&
                        sandbox.log(`getObject(id=${id}, enumName=${enumName}) => ${JSON.stringify(obj)}`, 'info');

                    return obj;
                } else {
                    let result;
                    try {
                        result = JSON.parse(JSON.stringify(objects[id]));
                    } catch (err) {
                        adapter.setState(`scriptProblem.${name.substring('script.js.'.length)}`, {
                            val: true,
                            ack: true,
                            c: 'getObject',
                        });
                        sandbox.log(`Object "${id}" can't be copied: ${JSON.stringify(err)}`, 'error');
                        return null;
                    }
                    sandbox.verbose &&
                        sandbox.log(`getObject(id=${id}, enumName=${enumName}) => ${JSON.stringify(result)}`, 'info');
                    return result;
                }
            }
        },
        // This function will be overloaded later if the modification of objects is allowed
        setObject: function (id, obj, callback) {
            sandbox.log('Function "setObject" is not allowed. Use adapter settings to allow it.', 'error');
            if (typeof callback === 'function') {
                try {
                    callback.call(sandbox, 'Function "setObject" is not allowed. Use adapter settings to allow it.');
                } catch (e) {
                    errorInCallback(e);
                }
            }
        },
        // This function will be overloaded later if the modification of objects is allowed
        extendObject: function (id, obj, callback) {
            sandbox.log('Function "extendObject" is not allowed. Use adapter settings to allow it.', 'error');
            if (typeof callback === 'function') {
                try {
                    callback.call(sandbox, 'Function "extendObject" is not allowed. Use adapter settings to allow it.');
                } catch (e) {
                    errorInCallback(e);
                }
            }
        },
        // This function will be overloaded later if the modification of objects is allowed
        deleteObject: function (id, isRecursive, callback) {
            if (typeof isRecursive === 'function') {
                callback = isRecursive;
                isRecursive = false;
            }
            sandbox.log('Function "deleteObject" is not allowed. Use adapter settings to allow it.', 'error');
            if (typeof callback === 'function') {
                try {
                    callback.call(sandbox, 'Function "deleteObject" is not allowed. Use adapter settings to allow it.');
                } catch (e) {
                    errorInCallback(e);
                }
            }
        },
        getEnums: function (enumName) {
            const result = [];
            const r = enumName ? new RegExp(`^enum\\.${enumName}\\.`) : false;
            for (let i = 0; i < enums.length; i++) {
                if (!r || r.test(enums[i])) {
                    const common = objects[enums[i]].common || {};
                    result.push({
                        id: enums[i],
                        members: common.members || [],
                        name: common.name || '',
                    });
                }
            }
            sandbox.verbose && sandbox.log(`getEnums(enumName=${enumName}) => ${JSON.stringify(result)}`, 'info');
            return JSON.parse(JSON.stringify(result));
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
            if (isObject(forceCreation)) {
                native = common;
                common = forceCreation;
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

            if (!name.startsWith('alias.0.')) {
                name = `alias.0.${name}`;
            }

            common = common || {};
            if (isObject(common.alias)) {
                // alias already in common, use this
            } else if (isObject(alias) && (typeof alias.id === 'string' || isObject(alias.id))) {
                common.alias = alias;
            } else if (typeof alias === 'string') {
                common.alias = { id: alias };
            } else {
                const err = 'Source ID needs to be provided as string or object with id property.';
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

            let aliasSourceId = isObject(common.alias.id) ? common.alias.id.read : common.alias.id;
            if (!objects[aliasSourceId] && objects[`${adapter.namespace}.${aliasSourceId}`]) {
                aliasSourceId = `${adapter.namespace}.${aliasSourceId}`;
                if (isObject(common.alias.id)) {
                    common.alias.id.read = aliasSourceId;
                } else {
                    common.alias.id = aliasSourceId;
                }
            }
            if (
                isObject(common.alias.id) &&
                common.alias.id.write &&
                !objects[common.alias.id.write] &&
                objects[`${adapter.namespace}.${common.alias.id.write}`]
            ) {
                common.alias.id.write = `${adapter.namespace}.${common.alias.id.write}`;
            }
            const obj = objects[aliasSourceId];
            if (!obj) {
                const err = `Alias source object "${aliasSourceId}" does not exist.`;
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
            if (obj.type !== 'state') {
                const err = `Alias source object "${aliasSourceId}" must be a state object.`;
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
            if (common.name === undefined) {
                common.name = obj.common.name || name;
            }
            if (common.type === undefined && obj.common.type !== undefined) {
                common.type = obj.common.type;
            }
            if (common.role === undefined && obj.common.role !== undefined) {
                common.role = obj.common.role;
            }
            if (common.min === undefined && obj.common.min !== undefined) {
                common.min = obj.common.min;
            }
            if (common.max === undefined && obj.common.max !== undefined) {
                common.max = obj.common.max;
            }
            if (common.step === undefined && obj.common.step !== undefined) {
                common.step = obj.common.step;
            }
            if (common.unit === undefined && obj.common.unit !== undefined) {
                common.unit = obj.common.unit;
            }
            if (common.desc === undefined && obj.common.desc !== undefined) {
                common.desc = obj.common.desc;
            }

            return sandbox.createState(name, undefined, forceCreation, common, native, callback);
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
            if (isObject(initValue)) {
                common = initValue;
                native = forceCreation;
                forceCreation = undefined;
                initValue = undefined;
            }
            if (isObject(forceCreation)) {
                native = common;
                common = forceCreation;
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

            const isAlias = name.startsWith('alias.0.');

            common = common || {};
            common.name = common.name || name;
            common.role = common.role || 'state';
            common.type = common.type || 'mixed';
            if (!isAlias && initValue === undefined) {
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
                            err = `Wrong type of ${name}.common.min`;
                            sandbox.log(err, 'error');
                            if (typeof callback === 'function') {
                                try {
                                    callback.call(sandbox, err);
                                } catch (e) {
                                    errorInCallback(e);
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
                            err = `Wrong type of ${name}.common.max`;
                            sandbox.log(err, 'error');
                            if (typeof callback === 'function') {
                                try {
                                    callback.call(sandbox, err);
                                } catch (e) {
                                    errorInCallback(e);
                                }
                            }
                            return;
                        } else {
                            common.max = max;
                        }
                    }
                }

                if (common.def !== undefined) {
                    if (isAlias) {
                        delete common.def;
                    } else {
                        def = common.def;
                        if (typeof def !== 'number') {
                            def = parseFloat(def);
                            if (isNaN(def)) {
                                err = `Wrong type of ${name}.common.def`;
                                sandbox.log(err, 'error');
                                if (typeof callback === 'function') {
                                    try {
                                        callback.call(sandbox, err);
                                    } catch (e) {
                                        errorInCallback(e);
                                    }
                                }
                                return;
                            } else {
                                common.def = def;
                            }
                        }
                    }
                }

                if (common.min !== undefined && common.max !== undefined && min > max) {
                    common.max = min;
                    common.min = max;
                }
                if (common.def !== undefined && common.min !== undefined && def < min) {
                    common.def = min;
                }
                if (common.def !== undefined && common.max !== undefined && def > max) {
                    common.def = max;
                }
            }

            sandbox.verbose &&
                sandbox.log(
                    `createState(name=${name}, initValue=${initValue}, forceCreation=${forceCreation}, common=${JSON.stringify(common)}, native=${JSON.stringify(native)}, isAlias=${isAlias})`,
                    'debug',
                );

            let id = `${adapter.namespace}.${name}`;
            if (name.match(/^javascript\.\d+\./) || name.startsWith('0_userdata.0.') || isAlias) {
                id = name;
            }
            if (id.match(/^javascript\.\d+\.scriptEnabled/)) {
                sandbox.log(
                    `Own states (${id}) should not be created in javascript.X.scriptEnabled.*! Please move the states to 0_userdata.0.*`,
                    'info',
                );
            } else if (id.match(/^javascript\.\d+\.scriptProblem/)) {
                sandbox.log(
                    `Own states (${id}) should not be created in javascript.X.scriptProblem.*! Please move the states to 0_userdata.0.*`,
                    'info',
                );
            }

            // User can create aliases by two ways:
            // - id is starting with "alias.0." and common.alias.id is set, so the state defined in common.alias.id will be created automatically if not exists
            // - id is not starting with "alias.0.", but common.alias is set, so the state defined in common.alias will be created automatically if not exists
            if (!isAlias && common.alias) {
                // check and create if not exists the alias
                let alias = common.alias;
                delete common.alias;
                if (typeof alias === 'string') {
                    alias = {
                        id: alias,
                    };
                } else if (typeof alias === 'boolean') {
                    const parts = id.split('.');
                    parts[0] = 'alias';
                    parts[1] = '0';

                    alias = {
                        id: parts.join('.'),
                    };
                }

                if (!alias.id.startsWith('alias.0.')) {
                    alias.id = `alias.0.${alias.id}`;
                }

                let aObj;
                try {
                    aObj = await adapter.getForeignObjectAsync(alias.id);
                } catch (e) {
                    // ignore
                }
                if (!aObj) {
                    try {
                        await adapter.setForeignObjectAsync(alias.id, {
                            type: 'state',
                            common: {
                                name: `Alias to ${id}`,
                                role: 'state',
                                type: common.type,
                                read: common.read,
                                write: common.write,
                                unit: common.unit,
                                alias: {
                                    id,
                                    read: alias.read,
                                    write: alias.write,
                                },
                            },
                            native: {},
                        });
                    } catch (e) {
                        sandbox.log(`Cannot create alias "${alias.id}": ${e}`, 'error');
                    }
                }
            } else if (isAlias && common.alias) {
                if (typeof common.alias === 'string') {
                    common.alias = {
                        id: common.alias,
                    };
                }
                const readId = typeof common.alias.id === 'string' ? common.alias.id : common.alias.id.read;
                let writeId = typeof common.alias.id === 'string' ? common.alias.id : common.alias.id.write;
                if (writeId === readId) {
                    writeId = undefined;
                }
                // try to create the linked states
                let aObj;
                try {
                    aObj = await adapter.getForeignObjectAsync(readId);
                } catch (e) {
                    // ignore
                }
                if (!aObj) {
                    try {
                        await adapter.setForeignObjectAsync(readId, {
                            type: 'state',
                            common: {
                                name: `State for ${id}`,
                                role: 'state',
                                type: common.type,
                                read: common.read,
                                write: common.write,
                                unit: common.unit,
                            },
                            native: {},
                        });
                    } catch (e) {
                        sandbox.log(`Cannot create alias "${readId}": ${e}`, 'error');
                    }
                }
                if (writeId && common.write !== false) {
                    try {
                        aObj = await adapter.getForeignObjectAsync(writeId);
                    } catch (e) {
                        // ignore
                    }
                    if (!aObj) {
                        try {
                            await adapter.setForeignObjectAsync(writeId, {
                                type: 'state',
                                common: {
                                    name: `Write state for ${id}`,
                                    role: 'state',
                                    type: common.type,
                                    read: common.read,
                                    write: common.write,
                                    unit: common.unit,
                                },
                                native: {},
                            });
                        } catch (e) {
                            sandbox.log(`Cannot create alias "${writeId}": ${e}`, 'error');
                        }
                    }
                }
            }

            let obj;
            try {
                obj = await adapter.getForeignObjectAsync(id);
            } catch (err) {
                // ignore
            }

            if (
                obj &&
                obj._id &&
                validIdForAutomaticFolderCreation(obj._id) &&
                obj.type === 'folder' &&
                obj.native &&
                obj.native.autocreated === 'by automatic ensure logic'
            ) {
                // ignore a default created object because we now have a more defined one
                obj = null;
            }

            if (!obj || forceCreation) {
                // create new one
                const newObj = {
                    common,
                    native,
                    type: 'state',
                };
                try {
                    await adapter.setForeignObjectAsync(id, newObj);
                } catch (err) {
                    sandbox.log(`Cannot set object "${id}": ${err}`, 'warn');
                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, err);
                        } catch (e) {
                            errorInCallback(e);
                        }
                    }
                    return;
                }

                // Update meta objects
                context.updateObjectContext(id, newObj);

                if (!isAlias && initValue !== undefined) {
                    if (isObject(initValue) && initValue.ack !== undefined) {
                        setStateHelper(sandbox, true, false, id, initValue, callback);
                    } else {
                        setStateHelper(sandbox, true, false, id, initValue, true, callback);
                    }
                } else if (!isAlias && !forceCreation) {
                    setStateHelper(sandbox, true, false, id, null, callback);
                } else if (isAlias) {
                    try {
                        const state = await adapter.getForeignStateAsync(id);
                        states[id] = state;
                    } catch (err) {
                        // ignore
                    }
                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, null, id);
                        } catch (e) {
                            errorInCallback(e);
                        }
                    }
                } else if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, null, id);
                    } catch (e) {
                        errorInCallback(e);
                    }
                }
                await ensureObjectStructure(id);
            } else {
                // state yet exists
                if (
                    !(adapter.config as AdapterConfig).subscribe &&
                    !states[id] &&
                    states[`${adapter.namespace}.${id}`] === undefined
                ) {
                    states[id] = { val: null, ack: true };
                }
                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, null, id);
                    } catch (e) {
                        errorInCallback(e);
                    }
                }

                await ensureObjectStructure(id);
            }
        },
        deleteState: function (id, callback) {
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
                    err && sandbox.log(`Object for state "${id}" does not exist: ${err}`, 'warn');

                    adapter.delForeignState(id, function (err) {
                        err && sandbox.log(`Cannot delete state "${id}": ${err}`, 'error');
                        if (typeof callback === 'function') {
                            try {
                                callback.call(sandbox, err, found);
                            } catch (e) {
                                errorInCallback(e);
                            }
                        }
                    });
                });
            } else if (objects[`${adapter.namespace}.${id}`]) {
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
                            } catch (e) {
                                errorInCallback(e);
                            }
                        }
                    });
                });
            } else {
                const err = 'Not found';
                sandbox.log(`Cannot delete state "${id}": ${err}`, 'error');
                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, err, found);
                    } catch (e) {
                        errorInCallback(e);
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

            let timeout;
            if (typeof callback === 'function') {
                const timeoutDuration = parseInt(options?.timeout, 10) || defaultTimeout;

                timeout = setTimeout(() => {
                    timeout = null;

                    sandbox.verbose && sandbox.log(`sendTo => timeout: ${timeoutDuration}`, 'debug');

                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, { error: 'timeout' }, options, _adapter);
                        } catch (e) {
                            errorInCallback(e);
                        }
                        callback = null;
                    }
                }, timeoutDuration);
            }

            // If specific instance
            if (_adapter.match(/\.[0-9]+$/)) {
                sandbox.verbose &&
                    sandbox.log(
                        `sendTo(instance=${_adapter}, cmd=${cmd}, msg=${JSON.stringify(msg)}, hasCallback=${typeof callback === 'function'})`,
                        'info',
                    );
                adapter.sendTo(
                    _adapter,
                    cmd,
                    msg,
                    timeout &&
                        function (result) {
                            timeout && clearTimeout(timeout);

                            sandbox.verbose && result && sandbox.log(`sendTo => ${JSON.stringify(result)}`, 'debug');

                            if (typeof callback === 'function') {
                                try {
                                    callback.call(sandbox, result, options, _adapter);
                                } catch (e) {
                                    errorInCallback(e);
                                }
                                callback = null;
                            }
                        },
                    options,
                );
            } else {
                // Send to all instances
                context.adapter.getObjectView(
                    'system',
                    'instance',
                    { startkey: `system.adapter.${_adapter}.`, endkey: `system.adapter.${_adapter}.\u9999` },
                    options,
                    (err, res) => {
                        if (err || !res) {
                            sandbox.log(`sendTo failed: ${err.message}`, 'error');
                            return;
                        }

                        const instances = res.rows.map(item => item.id.substring('system.adapter.'.length));

                        instances.forEach(instance => {
                            sandbox.verbose &&
                                sandbox.log(
                                    `sendTo(instance=${instance}, cmd=${cmd}, msg=${JSON.stringify(msg)}, hasCallback=${typeof callback === 'function'})`,
                                    'info',
                                );
                            adapter.sendTo(
                                instance,
                                cmd,
                                msg,
                                timeout &&
                                    function (result) {
                                        timeout && clearTimeout(timeout);

                                        sandbox.verbose &&
                                            result &&
                                            sandbox.log(`sendTo => ${JSON.stringify(result)}`, 'debug');

                                        if (typeof callback === 'function') {
                                            try {
                                                callback.call(sandbox, result, options, instance);
                                            } catch (e) {
                                                errorInCallback(e);
                                            }
                                            callback = null;
                                        }
                                    },
                                options,
                            );
                        });
                    },
                );
            }
        },
        sendto: function (_adapter, cmd, msg, callback) {
            return sandbox.sendTo(_adapter, cmd, msg, callback);
        },
        sendToAsync: function (_adapter, cmd, msg, options) {
            return new Promise((resolve, reject) => {
                sandbox.sendTo(_adapter, cmd, msg, options, res => {
                    if (!res || res.error) {
                        reject(res ? res.error : new Error('Unknown error'));
                    } else {
                        resolve(res);
                    }
                });
            });
        },
        sendToHost: function (host, cmd, msg, callback) {
            if (!(adapter.config as AdapterConfig).enableSendToHost) {
                const error =
                    'sendToHost is not available. Please enable "Enable SendToHost" option in instance settings';
                sandbox.log(error, 'error');

                if (typeof callback === 'function') {
                    setImmediate(function () {
                        callback(error);
                    });
                }
            } else {
                sandbox.verbose &&
                    sandbox.log(`sendToHost(adapter=${host}, cmd=${cmd}, msg=${JSON.stringify(msg)})`, 'info');
                adapter.sendToHost(host, cmd, msg, callback);
            }
        },
        sendToHostAsync: function (host, cmd, msg) {
            return new Promise((resolve, reject) => {
                sandbox.sendToHost(host, cmd, msg, res => {
                    if (!res || res.error) {
                        reject(res ? res.error : new Error('Unknown error'));
                    } else {
                        resolve(res);
                    }
                });
            });
        },
        registerNotification: function (msg, isAlert) {
            const category = !isAlert ? 'scriptMessage' : 'scriptAlert';

            sandbox.verbose && sandbox.log(`registerNotification(msg=${msg}, category=${category})`, 'info');

            adapter.registerNotification('javascript', category, msg);
        },
        setInterval: function (callback, ms, ...args) {
            if (typeof callback === 'function') {
                const int = setInterval(() => {
                    try {
                        callback.call(sandbox, ...args);
                    } catch (e) {
                        errorInCallback(e);
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
        clearInterval: function (id) {
            const pos = script.intervals.indexOf(id);
            if (pos !== -1) {
                sandbox.verbose && sandbox.log('clearInterval() => cleared', 'info');
                clearInterval(id);
                script.intervals.splice(pos, 1);
            } else {
                sandbox.verbose && sandbox.log('clearInterval() => not found', 'warn');
            }
        },
        setTimeout: function (callback, ms, ...args) {
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
                        errorInCallback(e);
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
        clearTimeout: function (id) {
            const pos = script.timeouts.indexOf(id);
            if (pos !== -1) {
                sandbox.verbose && sandbox.log('clearTimeout() => cleared', 'info');
                clearTimeout(id);
                script.timeouts.splice(pos, 1);
            } else {
                sandbox.verbose && sandbox.log('clearTimeout() => not found', 'warn');
            }
        },
        setImmediate: function (callback, ...args) {
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
        cb: function (callback) {
            return function () {
                if (context.scripts[name] && context.scripts[name]._id === sandbox._id) {
                    if (typeof callback === 'function') {
                        try {
                            callback.apply(this, arguments);
                        } catch (e) {
                            errorInCallback(e);
                        }
                    }
                } else {
                    sandbox.log(`Callback for old version of script: ${name}`, 'warn');
                }
            };
        },
        compareTime: function (startTime, endTime, operation, time) {
            let pos;
            if (startTime && typeof startTime === 'string') {
                if ((pos = consts.astroListLow.indexOf(startTime.toLowerCase())) !== -1) {
                    startTime = sandbox.getAstroDate(consts.astroList[pos]);
                    startTime = startTime.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                    });
                }
            } else if (startTime && isObject(startTime) && startTime.astro) {
                startTime = sandbox.getAstroDate(startTime.astro, startTime.date || new Date(), startTime.offset || 0);
                startTime = startTime.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                });
            }
            if (endTime && typeof endTime === 'string') {
                if ((pos = consts.astroListLow.indexOf(endTime.toLowerCase())) !== -1) {
                    endTime = sandbox.getAstroDate(consts.astroList[pos]);
                    endTime = endTime.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                    });
                }
            } else if (endTime && isObject(endTime) && endTime.astro) {
                endTime = sandbox.getAstroDate(endTime.astro, endTime.date || new Date(), endTime.offset || 0);
                endTime = endTime.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
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

            if (endTime) {
                endTime = endTime.getTime();
            }

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
                    sandbox.log(`missing or unrecognized endTime expression: ${endTime}`, 'warn');
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
                    sandbox.log(`missing or unrecognized endTime expression: ${endTime}`, 'warn');
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
                    sandbox.log(`Invalid operator: ${operation}`, 'warn');
                    return false;
                }
            }
        },
        onStop: function (cb, timeout) {
            sandbox.verbose && sandbox.log(`onStop(timeout=${timeout})`, 'info');

            script.onStopCb = cb;
            script.onStopTimeout = timeout || 1000;
        },
        formatValue: function (value, decimals, format) {
            if (!format) {
                if (adapter.isFloatComma !== undefined) {
                    format = adapter.isFloatComma ? '.,' : ',.';
                } else if (objects['system.config'] && objects['system.config'].common) {
                    format = objects['system.config'].common.isFloatComma ? '.,' : ',.';
                }
            }
            return adapter.formatValue(value, decimals, format);
        },
        formatDate: function (date, format, language) {
            if (!format) {
                if (adapter.dateFormat) {
                    format = adapter.dateFormat;
                } else {
                    format =
                        objects['system.config'] && objects['system.config'].common
                            ? objects['system.config'].common.dateFormat || 'DD.MM.YYYY'
                            : 'DD.MM.YYYY';
                }
                format = format || 'DD.MM.YYYY';
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
                } else if (typeof date.getMonth !== 'function') {
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
            } else {
                return adapter.formatDate(date, format);
            }
        },
        formatTimeDiff: function (diff, format) {
            if (!format) {
                format = 'hh:mm:ss';
            }

            let text = format;

            sandbox.verbose && sandbox.log(`formatTimeDiff(format=${format}, diff=${diff})`, 'debug');

            const second = 1000;
            const minute = 60 * second;
            const hour = 60 * minute;
            const day = 24 * hour;
            const neg = diff < 0;
            diff = Math.abs(diff);

            if (/DD|TT|ДД|D|T|Д/.test(text)) {
                const days = Math.floor(diff / day);

                text = text.replace(/DD|TT|ДД/, days < 10 ? `0${days}` : days);
                text = text.replace(/D|T|Д/, days);

                sandbox.verbose && sandbox.log(`formatTimeDiff(format=${format}, text=${text}, days=${days})`, 'debug');

                diff -= days * day;
            }

            if (/hh|SS|чч|h|S|ч/.test(text)) {
                const hours = Math.floor(diff / hour);

                text = text.replace(/hh|SS|чч/, hours < 10 ? `0${hours}` : hours);
                text = text.replace(/h|S|ч/, hours);

                sandbox.verbose &&
                    sandbox.log(`formatTimeDiff(format=${format}, text=${text}, hours=${hours})`, 'debug');

                diff -= hours * hour;
            }

            if (/mm|мм|m|м/.test(text)) {
                const minutes = Math.floor(diff / minute);

                text = text.replace(/mm|мм/, minutes < 10 ? `0${minutes}` : minutes);
                text = text.replace(/m|м/, minutes);

                sandbox.verbose &&
                    sandbox.log(`formatTimeDiff(format=${format}, text=${text}, minutes=${minutes})`, 'debug');

                diff -= minutes * minute;
            }

            if (/ss|сс|мм|s|с/.test(text)) {
                const seconds = Math.floor(diff / second);

                text = text.replace(/ss|сс/, seconds < 10 ? `0${seconds}` : seconds);
                text = text.replace(/s|с/, seconds);

                sandbox.verbose &&
                    sandbox.log(`formatTimeDiff(format=${format}, text=${text}, seconds=${seconds})`, 'debug');

                diff -= seconds * second;
            }

            sandbox.verbose && sandbox.log(`formatTimeDiff(format=${format}, text=${text})`, 'debug');

            return neg ? `-${text}` : text;
        },
        getDateObject: function (date) {
            if (isObject(date)) {
                return date;
            }
            if (typeof date === 'undefined') {
                return new Date();
            } else if (typeof date !== 'string') {
                return new Date(date);
            }

            if (date.match(/^\d?\d$/)) {
                const _now = new Date();
                date = `${_now.getFullYear()}-${_now.getMonth() + 1}-${_now.getDate()} ${date}:00`;
            } else if (date.match(/^\d?\d:\d\d(:\d\d)?$/)) {
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
                _adapter = null;
            }
            _adapter = _adapter || '0_userdata.0';

            if (debug) {
                sandbox.log(
                    `writeFile(adapter=${_adapter}, fileName=${fileName}) - ${words._('was not executed, while debug mode is active')}`,
                    'warn',
                );
                if (typeof callback === 'function') {
                    setTimeout(function () {
                        try {
                            callback.call(sandbox);
                        } catch (e) {
                            errorInCallback(e);
                        }
                    }, 0);
                }
            } else {
                sandbox.verbose && sandbox.log(`writeFile(adapter=${_adapter}, fileName=${fileName})`, 'info');
                adapter.writeFile(_adapter, fileName, data, callback);
            }
        },
        readFile: function (_adapter, fileName, callback) {
            if (typeof fileName === 'function') {
                callback = fileName;
                fileName = _adapter;
                _adapter = null;
            }
            _adapter = _adapter || '0_userdata.0';
            sandbox.verbose && sandbox.log(`readFile(adapter=${_adapter}, fileName=${fileName})`, 'info');

            adapter.fileExists(_adapter, fileName, (error, result) => {
                if (error) {
                    callback(error);
                } else if (!result) {
                    callback('Not exists');
                } else {
                    adapter.readFile(_adapter, fileName, callback);
                }
            });
        },
        unlink: function (_adapter, fileName, callback) {
            if (typeof fileName === 'function') {
                callback = fileName;
                fileName = _adapter;
                _adapter = null;
            }
            _adapter = _adapter || '0_userdata.0';

            if (debug) {
                sandbox.log(
                    `unlink(adapter=${_adapter}, fileName=${fileName}) - ${words._('was not executed, while debug mode is active')}`,
                    'warn',
                );
                if (typeof callback === 'function') {
                    setTimeout(function () {
                        try {
                            callback.call(sandbox);
                        } catch (e) {
                            errorInCallback(e);
                        }
                    }, 0);
                }
            } else {
                sandbox.verbose && sandbox.log(`unlink(adapter=${_adapter}, fileName=${fileName})`, 'info');
                adapter.unlink(_adapter, fileName, callback);
            }
        },
        delFile: function (_adapter, fileName, callback) {
            return sandbox.unlink(_adapter, fileName, callback);
        },
        rename: function (_adapter, oldName, newName, callback) {
            _adapter = _adapter || '0_userdata.0';

            if (debug) {
                sandbox.log(
                    `rename(adapter=${_adapter}, oldName=${oldName}, newName=${newName}) - ${words._('was not executed, while debug mode is active')}`,
                    'warn',
                );
                if (typeof callback === 'function') {
                    setTimeout(function () {
                        try {
                            callback.call(sandbox);
                        } catch (e) {
                            errorInCallback(e);
                        }
                    }, 0);
                }
            } else {
                sandbox.verbose &&
                    sandbox.log(`rename(adapter=${_adapter}, oldName=${oldName}, newName=${newName})`, 'info');
                adapter.rename(_adapter, oldName, newName, callback);
            }
        },
        renameFile: function (_adapter, oldName, newName, callback) {
            return sandbox.rename(_adapter, oldName, newName, callback);
        },
        getHistory: function (instance, options, callback) {
            if (isObject(instance)) {
                callback = options;
                options = instance;
                instance = null;
            }

            if (typeof callback !== 'function') {
                return sandbox.log('No callback found!', 'error');
            }
            if (!isObject(options)) {
                return sandbox.log('No options found!', 'error');
            }
            if (!options.id) {
                return sandbox.log('No ID found!', 'error');
            }
            const timeoutMs = parseInt(options?.timeout, 10) || 20000;

            if (!instance) {
                if (adapter.defaultHistory) {
                    instance = adapter.defaultHistory;
                } else {
                    instance =
                        objects['system.config'] && objects['system.config'].common
                            ? objects['system.config'].common.defaultHistory
                            : null;
                }
            }

            sandbox.verbose &&
                sandbox.log(`getHistory(instance=${instance}, options=${JSON.stringify(options)})`, 'info');

            if (!instance) {
                sandbox.log('No default history instance found!', 'error');
                try {
                    callback.call(sandbox, 'No default history instance found!');
                } catch (e) {
                    errorInCallback(e);
                }
                return;
            }
            if (instance.startsWith('system.adapter.')) {
                instance = instance.substring('system.adapter.'.length);
            }

            if (!objects[`system.adapter.${instance}`]) {
                sandbox.log(`Instance "${instance}" not found!`, 'error');
                try {
                    callback.call(sandbox, `Instance "${instance}" not found!`);
                } catch (e) {
                    errorInCallback(e);
                }
                return;
            }

            const timeout = setTimeout(() => {
                sandbox.verbose && sandbox.log('getHistory => timeout', 'debug');

                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, 'Timeout', null, options, instance);
                    } catch (e) {
                        errorInCallback(e);
                    }
                    callback = null;
                }
            }, timeoutMs);

            adapter.sendTo(instance, 'getHistory', { id: options.id, options: options }, result => {
                timeout && clearTimeout(timeout);

                sandbox.verbose && result && result.error && sandbox.log(`getHistory => ${result.error}`, 'error');
                sandbox.verbose &&
                    result &&
                    result.result &&
                    sandbox.log(`getHistory => ${result.result.length} items`, 'debug');

                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, result.error, result.result, options, instance);
                    } catch (e) {
                        errorInCallback(e);
                    }
                    callback = null;
                }
            });
        },
        runScript: function (scriptName, callback) {
            scriptName = scriptName || name;
            if (!scriptName.match(/^script\.js\./)) scriptName = `script.js.${scriptName}`;
            // start another script
            if (!objects[scriptName] || !objects[scriptName].common) {
                sandbox.log(`Cannot start "${scriptName}", because not found`, 'error');
                return false;
            } else {
                if (debug) {
                    sandbox.log(
                        `runScript(scriptName=${scriptName}) - ${words._('was not executed, while debug mode is active')}`,
                        'warn',
                    );
                    typeof callback === 'function' && callback();
                } else {
                    if (objects[scriptName].common.enabled) {
                        objects[scriptName].common.enabled = false;
                        adapter.extendForeignObject(scriptName, { common: { enabled: false } }, (/* err, obj */) => {
                            adapter.extendForeignObject(
                                scriptName,
                                { common: { enabled: true } },
                                err => typeof callback === 'function' && callback(err),
                            );
                            scriptName = null;
                        });
                    } else {
                        adapter.extendForeignObject(
                            scriptName,
                            { common: { enabled: true } },
                            err => typeof callback === 'function' && callback(err),
                        );
                    }
                }
                return true;
            }
        },
        runScriptAsync: function (scriptName) {
            return new Promise((resolve, reject) => {
                const result = sandbox.runScript(scriptName, err => {
                    if (err) {
                        reject(err);
                        reject = null;
                    } else {
                        resolve();
                    }
                });
                if (result === false && reject) {
                    reject(`Script ${scriptName} was not found!`);
                }
            });
        },
        startScript: function (scriptName, ignoreIfStarted, callback) {
            if (typeof ignoreIfStarted === 'function') {
                callback = ignoreIfStarted;
                ignoreIfStarted = false;
            }
            scriptName = scriptName || name;
            if (!scriptName.match(/^script\.js\./)) scriptName = `script.js.${scriptName}`;
            // start another script
            if (!objects[scriptName] || !objects[scriptName].common) {
                sandbox.log(`Cannot start "${scriptName}", because not found`, 'error');
                return false;
            } else {
                if (debug) {
                    sandbox.log(
                        `startScript(scriptName=${scriptName}) - ${words._('was not executed, while debug mode is active')}`,
                        'warn',
                    );
                    typeof callback === 'function' && callback(null, false);
                } else {
                    if (objects[scriptName].common.enabled) {
                        if (!ignoreIfStarted) {
                            objects[scriptName].common.enabled = false;
                            adapter.extendForeignObject(scriptName, { common: { enabled: false } }, () => {
                                adapter.extendForeignObject(
                                    scriptName,
                                    { common: { enabled: true } },
                                    err => typeof callback === 'function' && callback(err, true),
                                );
                                scriptName = null;
                            });
                        } else if (typeof callback === 'function') {
                            callback(null, false);
                        }
                    } else {
                        adapter.extendForeignObject(scriptName, { common: { enabled: true } }, err => {
                            typeof callback === 'function' && callback(err, true);
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
        stopScript: function (scriptName, callback) {
            scriptName = scriptName || name;

            if (!scriptName.match(/^script\.js\./)) scriptName = `script.js.${scriptName}`;

            // stop another script
            if (!objects[scriptName] || !objects[scriptName].common) {
                sandbox.log(`Cannot stop "${scriptName}", because not found`, 'error');
                return false;
            } else {
                if (debug) {
                    sandbox.log(
                        `stopScript(scriptName=${scriptName}) - ${words._('was not executed, while debug mode is active')}`,
                        'warn',
                    );
                    typeof callback === 'function' && callback(null, false);
                } else {
                    if (objects[scriptName].common.enabled) {
                        objects[scriptName].common.enabled = false;
                        adapter.extendForeignObject(scriptName, { common: { enabled: false } }, err => {
                            typeof callback === 'function' && callback(err, true);
                            scriptName = null;
                        });
                    } else if (typeof callback === 'function') {
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
                if (result === false) {
                    reject(`Script ${scriptName} was not found!`);
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
            } else {
                return objects[scriptName].common.enabled;
            }
        },
        startInstanceAsync: async function (instanceName) {
            const objInstanceId = `system.adapter.${instanceName}`;
            const exists = await adapter.foreignObjectExists(objInstanceId);

            if (exists) {
                const instanceObj = await adapter.getForeignObjectAsync(objInstanceId);

                if (instanceObj?.type === 'instance' && !instanceObj.common.enabled) {
                    await adapter.extendForeignObjectAsync(objInstanceId, { common: { enabled: true } });

                    sandbox.verbose && sandbox.log(`startInstanceAsync (instanceName=${instanceName})`, 'info');

                    return true;
                } else {
                    sandbox.log(`Cannot start instance "${instanceName}", because already running`, 'warn');
                }
            } else {
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

                    sandbox.verbose && sandbox.log(`restartInstanceAsync (instanceName=${instanceName})`, 'info');

                    return true;
                } else {
                    sandbox.log(`Cannot restart instance "${instanceName}", because not running`, 'warn');
                }
            } else {
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

                    sandbox.verbose && sandbox.log(`stopInstanceAsync (instanceName=${instanceName})`, 'info');

                    return true;
                } else {
                    sandbox.log(`Cannot stop instance "${instanceName}", because not running`, 'warn');
                }
            } else {
                sandbox.log(`Cannot stop instance "${instanceName}", because not found`, 'error');
            }

            return false;
        },
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
                } catch (e) {
                    adapter.setState(`scriptProblem.${name.substring('script.js.'.length)}`, {
                        val: true,
                        ack: true,
                        c: 'getAttr',
                    });
                    sandbox.log(`Cannot parse "${obj.substring(0, 30)}": ${e}`, 'error');

                    return null;
                }
            }

            const attr = path.shift();
            try {
                obj = obj[attr];
            } catch (e) {
                adapter.setState(`scriptProblem.${name.substring('script.js.'.length)}`, {
                    val: true,
                    ack: true,
                    c: 'getAttr',
                });
                sandbox.log(`Cannot get ${attr} of "${JSON.stringify(obj)}": ${e}`, 'error');

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
        messageTo: function (target, data, options, callback) {
            const defaultTimeout = 5000;

            if (typeof target !== 'object') {
                target = { instance: null, script: null, message: target };
            }
            if (typeof options === 'function') {
                callback = options;
                options = { timeout: defaultTimeout };
            }

            let timeout;
            if (typeof callback === 'function') {
                const timeoutDuration = parseInt(options?.timeout, 10) || defaultTimeout;

                timeout = setTimeout(() => {
                    timeout = null;

                    sandbox.verbose && sandbox.log(`messageTo => timeout: ${timeoutDuration}`, 'debug');

                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, { error: 'timeout' }, options, target.instance);
                        } catch (e) {
                            errorInCallback(e);
                        }
                        callback = null;
                    }
                }, timeoutDuration);
            }

            if (target.instance || target.instance === 0) {
                if (
                    typeof target.instance === 'string' &&
                    target.instance &&
                    target.instance.startsWith('system.adapter.')
                ) {
                    target.instance = target.instance.substring('system.adapter.'.length);
                } else if (typeof target.instance === 'number') {
                    target.instance = `javascript.${target.instance}`;
                }

                adapter.sendTo(
                    target.instance,
                    'jsMessageBus',
                    { message: target.message, script: target.script, data },
                    timeout &&
                        function (result) {
                            timeout && clearTimeout(timeout);

                            sandbox.verbose &&
                                result?.result &&
                                sandbox.log(`messageTo => ${JSON.stringify(result)}`, 'debug');

                            if (typeof callback === 'function') {
                                try {
                                    callback.call(sandbox, result, options, target.instance);
                                } catch (e) {
                                    errorInCallback(e);
                                }
                                callback = null;
                            }
                        },
                );
            } else {
                // Send to all instances
                context.adapter.getObjectView(
                    'system',
                    'instance',
                    { startkey: 'system.adapter.javascript.', endkey: 'system.adapter.javascript.\u9999' },
                    options,
                    (err, res) => {
                        if (err || !res) {
                            sandbox.log(`messageTo failed: ${err.message}`, 'error');
                            return;
                        }
                        const len = 'system.adapter.'.length;
                        const instances = res.rows.map(item => item.id.substring(len));

                        instances.forEach(instance => {
                            adapter.sendTo(
                                instance,
                                'jsMessageBus',
                                { message: target.message, script: target.script, data },
                                timeout &&
                                    function (result) {
                                        timeout && clearTimeout(timeout);

                                        if (typeof callback === 'function') {
                                            sandbox.verbose &&
                                                result?.result &&
                                                sandbox.log(`messageTo result => ${JSON.stringify(result)}`, 'info');

                                            try {
                                                callback.call(sandbox, result, options, target.instance);
                                            } catch (e) {
                                                errorInCallback(e);
                                            }
                                            callback = null;
                                        }
                                    },
                            );
                        });
                    },
                );
            }
        },
        messageToAsync: function (target, data, options) {
            return new Promise((resolve, reject) => {
                sandbox.messageTo(target, data, options, res => {
                    sandbox.verbose && sandbox.log(`messageTo result => ${JSON.stringify(res)}`, 'debug');
                    if (!res || res.error) {
                        reject(res ? res.error : new Error('Unknown error'));
                    } else {
                        resolve(res);
                    }
                });
            });
        },
        onMessage: function (messageName, callback) {
            if (typeof callback !== 'function') {
                sandbox.log('onMessage callback is not a function', 'error');

                return null;
            } else {
                context.messageBusHandlers[sandbox.scriptName] = context.messageBusHandlers[sandbox.scriptName] || {};
                context.messageBusHandlers[sandbox.scriptName][messageName] =
                    context.messageBusHandlers[sandbox.scriptName][messageName] || [];

                const handler = { id: Date.now() + Math.floor(Math.random() * 10000), cb: callback, sandbox };
                context.messageBusHandlers[sandbox.scriptName][messageName].push(handler);

                sandbox.__engine.__subscriptionsMessage += 1;

                if (
                    sandbox.__engine.__subscriptionsMessage % (adapter.config as AdapterConfig).maxTriggersPerScript ===
                    0
                ) {
                    sandbox.log(
                        `More than ${sandbox.__engine.__subscriptionsMessage} message subscriptions registered. Check your script!`,
                        'warn',
                    );
                }

                return handler.id;
            }
        },
        onMessageUnregister: function (idOrName) {
            const ctx = context.messageBusHandlers[sandbox.scriptName];
            let found = false;
            if (ctx) {
                if (typeof idOrName === 'number') {
                    for (const messageName in ctx) {
                        if (Object.prototype.hasOwnProperty.call(ctx, messageName)) {
                            for (let i = 0; i < ctx[messageName].length; i++) {
                                if (ctx[messageName][i].id === idOrName) {
                                    ctx[messageName].splice(i, 1);
                                    if (!ctx[messageName].length) {
                                        delete ctx[messageName];
                                        sandbox.__engine.__subscriptionsMessage--;
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
            return new Promise(resolve => sandbox.setTimeout(resolve, ms));
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

            if (sandbox.__engine.__subscriptionsObject % (adapter.config as AdapterConfig).maxTriggersPerScript === 0) {
                sandbox.log(
                    `More than ${sandbox.__engine.__subscriptionsObject} object subscriptions registered. Check your script!`,
                    'warn',
                );
            }

            // source is set by regexp if defined as /regexp/
            if (!pattern || typeof pattern !== 'string') {
                return sandbox.log(
                    'Error by subscribeObject: pattern can be only string or array of strings.',
                    'error',
                );
            }

            if (typeof callback !== 'function') {
                return sandbox.log('Error by subscribeObject: callback is not a function', 'error');
            }

            const subs = { pattern, callback, name };
            sandbox.verbose && sandbox.log(`subscribeObject: ${JSON.stringify(subs)}`, 'info');

            adapter.subscribeForeignObjects(pattern);

            context.subscriptionsObject.push(subs);

            return subs;
        },
        unsubscribeObject: function (idOrObject) {
            if (idOrObject && Array.isArray(idOrObject)) {
                const result = [];
                for (let t = 0; t < idOrObject.length; t++) {
                    result.push(sandbox.unsubscribeObject(idOrObject[t]));
                }
                return result;
            }

            sandbox.verbose && sandbox.log(`adapterUnsubscribeObject(id=${JSON.stringify(idOrObject)})`, 'info');

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
                    if (
                        context.subscriptionsObject[i].name &&
                        context.subscriptionsObject[i].pattern === idOrObject.pattern
                    ) {
                        deleted++;
                        adapter.unsubscribeForeignObjects(idOrObject.pattern);
                        context.subscriptionsObject.splice(i, 1);
                        sandbox.__engine.__subscriptionsObject--;
                    }
                }
                return !!deleted;
            }
        },
        // internal function to send the block debugging info to the front-end
        _sendToFrontEnd: function (blockId, data) {
            if (context.rulesOpened === sandbox.scriptName) {
                adapter.setState(
                    'debug.rules',
                    JSON.stringify({ ruleId: sandbox.scriptName, blockId, data, ts: Date.now() }),
                    true,
                );
            }
        },
    };

    if ((adapter.config as AdapterConfig).enableSetObject) {
        sandbox.setObject = function (id: string, obj: ioBroker.Object, callback?: (err?: Error | null | undefined, res?: { id: string }) => void): void {
            if (id && typeof id === 'string' && id.startsWith('system.adapter.')) {
                sandbox.log(
                    `Using setObject on system object ${id} can be dangerous (protected instance attributes may be lost)`,
                    'info',
                );
            }
            if (debug) {
                sandbox.log(
                    `setObject(id=${id}, obj=${JSON.stringify(obj)}) - ${words._('was not executed, while debug mode is active')}`,
                    'warn',
                );
                if (typeof callback === 'function') {
                    setImmediate(function () {
                        try {
                            callback.call(sandbox, null, { id });
                        } catch (e) {
                            errorInCallback(e);
                        }
                    });
                }
            } else {
                sandbox.verbose && sandbox.log(`setObject(id=${id}, obj=${JSON.stringify(obj)})`, 'info');
                adapter.setForeignObject(id, obj, (err, res) => {
                    if (!err) {
                        // Update meta object data
                        context.updateObjectContext(id, obj);
                    }
                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, err, res);
                        } catch (e) {
                            errorInCallback(e);
                        }
                    }
                });
            }
        };
        sandbox.extendObject = function (id: string, obj: Partial<ioBroker.Object>, callback?: (err: Error | undefined | null, res?: { id: string }) => void): void {
            if (debug) {
                sandbox.log(
                    `extendObject(id=${id}, obj=${JSON.stringify(obj)}) - ${words._('was not executed, while debug mode is active')}`,
                    'warn',
                );
                if (typeof callback === 'function') {
                    setTimeout(function () {
                        try {
                            callback.call(sandbox, null, { id });
                        } catch (e) {
                            errorInCallback(e);
                        }
                    }, 0);
                }
            } else {
                sandbox.verbose && sandbox.log(`extendObject(id=${id}, obj=${JSON.stringify(obj)})`, 'info');
                adapter.extendForeignObject(id, JSON.parse(JSON.stringify(obj)), callback);
            }
        };
        sandbox.deleteObject = function (id: string, isRecursive?: boolean, callback?: ioBroker.ErrorCallback): void {
            if (typeof isRecursive === 'function') {
                callback = isRecursive;
                isRecursive = false;
            }
            if (debug) {
                sandbox.log(
                    `deleteObject(id=${id}) - ${words._('was not executed, while debug mode is active')}`,
                    'warn',
                );
                if (typeof callback === 'function') {
                    setTimeout(function () {
                        try {
                            callback.call(sandbox);
                        } catch (e) {
                            errorInCallback(e);
                        }
                    }, 0);
                }
            } else {
                sandbox.verbose && sandbox.log(`deleteObject(id=${id})`, 'info');
                adapter.delForeignObject(id, { recursive: isRecursive }, callback);
            }
        };
    }

    // promisify methods on the sandbox
    /** @type {(keyof typeof sandbox)[]} */
    const promisifiedMethods = [
        'existsState',
        'existsObject',
        'getObject',
        'setObject',
        'extendObject',
        'deleteObject',
        'createState',
        'createAlias',
        'deleteState',
        'writeFile',
        'readFile',
        'unlink',
        'delFile',
        'rename',
        'renameFile',
        'getHistory',
        'httpPost',
        'httpGet',
    ];
    for (const method of promisifiedMethods) {
        sandbox[`${method}Async`] = promisify(sandbox[method]);
    }

    // Make all predefined properties and methods readonly so scripts cannot overwrite them
    for (const prop of Object.keys(sandbox)) {
        Object.defineProperty(sandbox, prop, {
            configurable: false,
            writable: false,
        });
    }

    return sandbox;
}
