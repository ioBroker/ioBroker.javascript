import type { ChildProcess, ExecOptions } from 'node:child_process';
import * as jsonataMod from 'jsonata';
import type { SendMailOptions } from 'nodemailer';
import type { AxiosError, AxiosHeaderValue, AxiosResponse, ResponseType } from 'axios';

import { commonTools } from '@iobroker/adapter-core';

import { isObject, isArray, promisify, getHttpRequestConfig } from './tools';
import type {
    JavaScriptAdapterConfig,
    AstroRule,
    ChangeType,
    CommonAlias,
    FileSubscriptionResult,
    IobSchedule,
    JavascriptContext,
    JsScript,
    LogMessage,
    Pattern,
    PushoverOptions,
    SandboxType,
    Selector,
    SubscribeObject,
    SubscriptionResult,
    TimeRule,
} from '../types';
import * as constsMod from './consts';
import * as wordsMod from './words';
import * as eventObjMod from './eventObj';
import { patternCompareFunctions as patternCompareFunctionsMod } from './patternCompareFunctions';
import type { PatternEventCompareFunction } from './patternCompareFunctions';
import type { ScheduleName, SchedulerRule } from './scheduler';
import type { EventObj } from './eventObj';
import type { AstroEvent } from './consts';

const pattern2RegEx = commonTools.pattern2RegEx;

export function sandBox(
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
    const jsonata = jsonataMod.default;

    const adapter: ioBroker.Adapter = context.adapter;
    const mods = context.mods;
    const states = context.states;
    const objects = context.objects;
    const timers = context.timers;
    const enums = context.enums;
    const debugMode = context.debugMode;

    // eslint-disable-next-line prefer-const
    let sandbox: SandboxType;

    function errorInCallback(e: Error): void {
        adapter.setState(`scriptProblem.${name.substring('script.js.'.length)}`, {
            val: true,
            ack: true,
            c: 'errorInCallback',
        });
        context.logError('Error in callback', e);
        context.debugMode && console.log(`error$$${name}$$Exception in callback: ${e}`, Date.now());
    }

    function subscribePattern(script: JsScript, pattern: string): void {
        if ((adapter.config as JavaScriptAdapterConfig).subscribe) {
            if (!script.subscribes[pattern]) {
                script.subscribes[pattern] = 1;
            } else {
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
                    adapter.getForeignState(pattern, (_err, state) => {
                        if (state) {
                            states[pattern] = state;
                        }
                    });
                } else {
                    adapter.getForeignStates(
                        pattern,
                        (_err, _states) => _states && Object.keys(_states).forEach(id => (states[id] = _states[id])),
                    );
                }
            } else {
                context.subscribedPatterns[pattern]++;
            }
        }
    }

    function unsubscribePattern(script: JsScript, pattern: string): void {
        if ((adapter.config as JavaScriptAdapterConfig).subscribe) {
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

    function unsubscribeFile(script: JsScript, id: string, fileNamePattern: string): void {
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
            const _func: (pattern: Pattern) => PatternEventCompareFunction = (
                patternCompareFunctions as unknown as Record<string, (pattern: Pattern) => PatternEventCompareFunction>
            )[key];
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
    function looselyEqualsString(value: string | number | boolean | undefined, reference: string): boolean {
        // For booleans, compare the string representation
        // For other types do a loose comparison
        return typeof value === 'boolean'
            ? (value && reference === 'true') || (!value && reference === 'false')
            : value == reference;
    }

    /**
     * Returns the `common.type` for a given variable
     */
    function getCommonTypeOf(value: any): ioBroker.CommonType {
        return isArray(value) ? 'array' : isObject(value) ? 'object' : (typeof value as ioBroker.CommonType);
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
            let obj: ioBroker.Object | null | undefined;
            try {
                obj = await adapter.getForeignObjectAsync(idToCheck);
            } catch {
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
        isAck: boolean | 'true' | 'false' | undefined | ((error?: Error | null) => void),
        callback?: (error?: Error | null) => void,
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
                context.logWithLineInfo(
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
                    context.logWithLineInfo(
                        `Could not stringify value for type ${actualCommonType} and id ${id}: ${err.message}`,
                    );
                    if (typeof callback === 'function') {
                        try {
                            callback.call(
                                sandbox,
                                new Error(
                                    `Could not stringify value for type ${actualCommonType} and id ${id}: ${err.message}`,
                                ),
                            );
                        } catch (err: unknown) {
                            errorInCallback(err as Error);
                        }
                    }
                }
            }
        }
        // Check min and max of value
        if (typeof stateNotNull === 'object') {
            if (common && typeof stateNotNull.val === 'number') {
                const num: number = stateNotNull.val;
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
        if (
            stateNotNull === null ||
            typeof stateNotNull !== 'object' ||
            (stateNotNull as ioBroker.SettableState).val === undefined
        ) {
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
            if (sandbox.verbose) {
                sandbox.log(`setForeignState(id=${id}, state=${JSON.stringify(stateAsObject)})`, 'info');
            }

            if (debug) {
                sandbox.log(
                    `setForeignState(id=${id}, state=${JSON.stringify(stateAsObject)}) - ${words._('was not executed, while debug mode is active')}`,
                    'warn',
                );

                if (typeof callback === 'function') {
                    setImmediate(() => {
                        try {
                            callback.call(sandbox);
                        } catch (err: unknown) {
                            errorInCallback(err as Error);
                        }
                    });
                }
            } else {
                if (!(adapter.config as JavaScriptAdapterConfig).subscribe) {
                    // store actual state to make possible to process value in callback
                    // risk that there will be an error on setState is very low,
                    // but we will not store new state if the setStateChanged is called
                    if (!isChanged) {
                        context.interimStateValues[id] = stateAsObject;
                    }
                }
                const errHandler = (err: Error | null | undefined, funcId: string): void => {
                    err && sandbox.log(`${funcId}: ${err}`, 'error');
                    // If adapter holds all states
                    if (err && !(adapter.config as JavaScriptAdapterConfig).subscribe) {
                        delete context.interimStateValues[id];
                    }

                    if (typeof callback === 'function') {
                        setImmediate(() => {
                            try {
                                callback.call(sandbox);
                            } catch (err: unknown) {
                                errorInCallback(err as Error);
                            }
                        });
                    }
                };
                if (isChanged) {
                    if (!(adapter.config as JavaScriptAdapterConfig).subscribe && context.interimStateValues[id]) {
                        // if the state is changed, we will compare it with interimStateValues
                        const oldState = context.interimStateValues[id];
                        const attrs: string[] = Object.keys(stateAsObject).filter(
                            attr => attr !== 'ts' && (stateAsObject as Record<string, any>)[attr] !== undefined,
                        );
                        if (
                            !attrs.every(
                                attr =>
                                    (stateAsObject as Record<string, any>)[attr] ===
                                    (oldState as Record<string, any>)[attr],
                            )
                        ) {
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
            context.logWithLineInfo(`State "${id}" not found`);
            if (typeof callback === 'function') {
                setImmediate(() => {
                    try {
                        callback.call(sandbox, new Error(`State "${id}" not found`));
                    } catch (err: unknown) {
                        errorInCallback(err as Error);
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
                // for backward compatibility we check if the module can simply be required directly before we fail (e.g., direct dependencies of JavaScript adapter)
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

            const result: iobJS.QueryResult = {} as iobJS.QueryResult;

            let name = '';
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

            let res: string[];

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
                    .map(id => channels[id])
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
                    .map(id => devices[id])
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

            const resUnique: string[] = [];
            for (let i = 0; i < res.length; i++) {
                if (!resUnique.includes(res[i])) {
                    resUnique.push(res[i]);
                }
            }

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
            // @ts-expect-error fix later
            result.getState = function <T extends ioBroker.StateValue = any>(
                callback?: iobJS.GetStateCallback<T>,
            ): void | null | undefined | iobJS.TypedState<T> | iobJS.AbsentState {
                if ((adapter.config as JavaScriptAdapterConfig).subscribe) {
                    if (typeof callback !== 'function') {
                        sandbox.log('You cannot use this function synchronous', 'error');
                    } else {
                        adapter.getForeignState(
                            this[0],
                            (err: Error | null | undefined, state?: ioBroker.State | null): void => {
                                callback(
                                    err,
                                    context.convertBackStringifiedValues(this[0], state) as
                                        | iobJS.TypedState<T>
                                        | iobJS.AbsentState,
                                );
                            },
                        );
                    }
                } else {
                    if (!this[0]) {
                        return null;
                    }
                    if (context.interimStateValues[this[0]] !== undefined) {
                        return context.convertBackStringifiedValues(this[0], context.interimStateValues[this[0]]) as
                            | iobJS.TypedState<T>
                            | iobJS.AbsentState;
                    }
                    return context.convertBackStringifiedValues(this[0], states[this[0]]) as
                        | iobJS.TypedState<T>
                        | iobJS.AbsentState;
                }
            };
            result.getStateAsync = async function <T extends ioBroker.StateValue = any>(): Promise<
                iobJS.TypedState<T> | iobJS.AbsentState | null | undefined
            > {
                if ((adapter.config as JavaScriptAdapterConfig).subscribe) {
                    const state = await adapter.getForeignStateAsync(this[0]);
                    return context.convertBackStringifiedValues(this[0], state) as
                        | iobJS.TypedState<T>
                        | iobJS.AbsentState
                        | null;
                }
                if (!this[0]) {
                    return null;
                }
                if (context.interimStateValues[this[0]] !== undefined) {
                    return context.convertBackStringifiedValues(this[0], context.interimStateValues[this[0]]) as
                        | iobJS.TypedState<T>
                        | iobJS.AbsentState
                        | null;
                }
                return context.convertBackStringifiedValues(this[0], states[this[0]]) as
                    | iobJS.TypedState<T>
                    | iobJS.AbsentState
                    | null;
            };
            result.setState = function (
                state: ioBroker.SettableState | ioBroker.StateValue,
                isAck?: boolean | 'false' | 'true' | null | iobJS.SetStateCallback,
                callback?: iobJS.SetStateCallback,
            ) {
                if (typeof isAck === 'function') {
                    callback = isAck;
                    isAck = undefined;
                }
                result
                    .setStateAsync(state, isAck as boolean | 'false' | 'true')
                    .then(() => typeof callback === 'function' && callback());
                return this;
            };
            result.setStateAsync = async function (
                state: ioBroker.SettableState | ioBroker.StateValue,
                isAck?: boolean,
            ): Promise<void> {
                for (let i = 0; i < this.length; i++) {
                    await sandbox.setStateAsync(this[i], state, isAck);
                }
            };
            result.setStateChanged = function (
                state: ioBroker.SettableState | ioBroker.StateValue,
                isAck?: boolean,
                callback?: () => void,
            ) {
                if (typeof isAck === 'function') {
                    callback = isAck;
                    isAck = undefined;
                }
                result.setStateChangedAsync(state, isAck).then(() => typeof callback === 'function' && callback());
                return this;
            };
            result.setStateChangedAsync = async function (
                state: ioBroker.SettableState | ioBroker.StateValue,
                isAck?: boolean,
            ): Promise<void> {
                for (let i = 0; i < this.length; i++) {
                    await sandbox.setStateChangedAsync(this[i], state, isAck);
                }
            };
            result.setStateDelayed = function (
                state: ioBroker.SettableState | ioBroker.StateValue,
                isAck: boolean | number | undefined,
                delay?: number | boolean,
                clearRunning?: boolean | (() => void),
                callback?: () => void,
            ) {
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

            if (
                sandbox.__engine.__subscriptionsLog %
                    (adapter.config as JavaScriptAdapterConfig).maxTriggersPerScript ===
                0
            ) {
                sandbox.log(
                    `More than ${sandbox.__engine.__subscriptionsLog} log subscriptions registered. Check your script!`,
                    'warn',
                );
            }

            return handler.id;
        },
        onLogUnregister: function (
            idOrCallbackOrSeverity: number | ioBroker.LogLevel | ((info: LogMessage) => void),
        ): boolean {
            let found = false;

            if (context.logSubscriptions?.[sandbox.scriptName]) {
                sandbox.verbose &&
                    sandbox.log(
                        `onLogUnregister(idOrCallbackOrSeverity=${JSON.stringify(idOrCallbackOrSeverity)}) - logSubscriptions=${sandbox.__engine.__subscriptionsLog}`,
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
                                `onLogUnregister(idOrCallbackOrSeverity=${JSON.stringify(idOrCallbackOrSeverity)}, removing id=${context.logSubscriptions[sandbox.scriptName][i].id})`,
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
                                `onLogUnregister(idOrCallbackOrSeverity=${JSON.stringify(idOrCallbackOrSeverity)}) NOT = ${JSON.stringify(context.logSubscriptions[sandbox.scriptName][i])}`,
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
            if (!(adapter.config as JavaScriptAdapterConfig).enableExec) {
                const error = 'exec is not available. Please enable "Enable Exec" option in instance settings';
                sandbox.log(error, 'error');

                if (typeof callback === 'function') {
                    setImmediate(callback, error, undefined, undefined);
                }
            } else {
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
                } else {
                    return mods.child_process.exec(
                        cmd,
                        options,
                        (error: Error | null, stdout: string, stderr: string): void => {
                            if (typeof callback === 'function') {
                                try {
                                    callback.call(sandbox, error, stdout, stderr);
                                } catch (err: unknown) {
                                    errorInCallback(err as Error);
                                }
                            }
                        },
                    );
                }
            }
        },
        email: function (msg: string | SendMailOptions): void {
            if (sandbox.verbose) {
                sandbox.log(`email(msg=${JSON.stringify(msg)})`, 'info');
            }
            sandbox.log(`email(msg=${JSON.stringify(msg)}) is deprecated. Please use sendTo instead!`, 'warn');
            adapter.sendTo('email', msg);
        },
        pushover: function (msg: string | PushoverOptions): void {
            if (sandbox.verbose) {
                sandbox.log(`pushover(msg=${JSON.stringify(msg)})`, 'info');
            }
            sandbox.log(`pushover(msg=${JSON.stringify(msg)}) is deprecated. Please use sendTo instead!`, 'warn');
            adapter.sendTo('pushover', msg);
        },
        httpGet: function (
            url: string,
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
                          headers: Record<string, string>;
                          responseTime: number;
                      },
                  ) => void),
            callback?: (
                error: Error | null,
                result: {
                    statusCode: number | null;
                    data: any;
                    headers: Record<string, string>;
                    responseTime: number;
                },
            ) => void,
        ): void {
            if (typeof options === 'function') {
                callback = options as (
                    error: Error | null,
                    result: {
                        statusCode: number | null;
                        data: any;
                        headers: Record<string, string>;
                        responseTime: number;
                    },
                ) => void;
                options = {};
            }

            const config = {
                ...getHttpRequestConfig(url, options),
                method: 'get',
            };

            if (sandbox.verbose) {
                sandbox.log(`httpGet(config=${JSON.stringify(config)})`, 'info');
            }

            const startTime = Date.now();

            mods.axios
                .default(config)
                .then((response: AxiosResponse) => {
                    const responseTime = Date.now() - startTime;

                    if (sandbox.verbose) {
                        sandbox.log(`httpGet(url=${url}, responseTime=${responseTime}ms)`, 'info');
                    }

                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, null, {
                                statusCode: response.status,
                                data: response.data,
                                headers: response.headers as Record<string, string>,
                                responseTime,
                            });
                        } catch (err: unknown) {
                            errorInCallback(err as Error);
                        }
                    }
                })
                .catch((error: any) => {
                    const responseTime = Date.now() - startTime;

                    sandbox.log(`httpGet(url=${url}, error=${error.message})`, 'error');

                    if (typeof callback === 'function') {
                        let result: {
                            statusCode: number | null;
                            data: any;
                            headers: Record<string, string>;
                            responseTime: number;
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
                        } catch (err: unknown) {
                            errorInCallback(err as Error);
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
                ...getHttpRequestConfig(
                    url,
                    options as {
                        timeout?: number;
                        responseType?: ResponseType;
                        headers?: Record<string, string>;
                        basicAuth?: { user: string; password: string } | null;
                        bearerAuth?: string;
                        validateCertificate?: boolean;
                    },
                ),
                method: 'post',
                data,
            };

            if (sandbox.verbose) {
                sandbox.log(`httpPost(config=${JSON.stringify(config)}, data=${data})`, 'info');
            }

            const startTime = Date.now();

            mods.axios
                .default(config)
                .then((response: AxiosResponse) => {
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
                        } catch (err: unknown) {
                            errorInCallback(err as Error);
                        }
                    }
                })
                .catch((error: unknown) => {
                    const responseTime = Date.now() - startTime;

                    sandbox.log(`httpPost(url=${url}, error=${(error as Error).message})`, 'error');

                    if (typeof callback === 'function') {
                        let result: {
                            statusCode: number | null;
                            data: any;
                            headers: Record<string, AxiosHeaderValue | undefined>;
                            responseTime: number;
                        } = {
                            statusCode: null,
                            data: null,
                            headers: {},
                            responseTime,
                        };
                        const response: AxiosResponse<unknown, any> | undefined = (error as AxiosError).response;

                        if (response) {
                            result = {
                                statusCode: response.status,
                                data: response.data,
                                headers: response.headers,
                                responseTime,
                            };
                        }

                        try {
                            callback.call(sandbox, new Error((error as AxiosError).message), result);
                        } catch (err: unknown) {
                            errorInCallback(err as Error);
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
            pattern:
                | TimeRule
                | AstroRule
                | Pattern
                | SchedulerRule
                | string
                | (TimeRule | AstroRule | Pattern | SchedulerRule | string)[],
            // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
            callbackOrChangeTypeOrId: string | ChangeType | ((event?: EventObj) => void),
            value?: any,
        ):
            | SubscriptionResult
            | IobSchedule
            | string
            | null
            | undefined
            | (SubscriptionResult | IobSchedule | string | null | undefined)[] {
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
                    result.push(
                        sandbox.subscribe(p as SchedulerRule | string, callbackOrChangeTypeOrId, value) as
                            | IobSchedule
                            | string
                            | null
                            | undefined,
                    );
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
                    result.push(
                        sandbox.subscribe(pa, callbackOrChangeTypeOrId, value) as
                            | IobSchedule
                            | string
                            | null
                            | undefined,
                    );
                }
                return result;
            }

            // try to detect astro or cron (by spaces)
            if (isObject(pattern) || (typeof pattern === 'string' && pattern.match(/[,/\d*]+\s[,/\d*]+\s[,/\d*]+/))) {
                if ((pattern as AstroRule).astro) {
                    return sandbox.schedule(pattern as AstroRule, callbackOrChangeTypeOrId as () => void);
                } else if ((pattern as TimeRule).time) {
                    return sandbox.schedule(
                        (pattern as TimeRule).time as string,
                        callbackOrChangeTypeOrId as () => void,
                    );
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

            if (
                sandbox.__engine.__subscriptions % (adapter.config as JavaScriptAdapterConfig).maxTriggersPerScript ===
                0
            ) {
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
                        sandbox.setState(callbackOrChangeTypeOrId, obj.newState.val);
                    };
                } else {
                    callback = function (/* obj */) {
                        sandbox.setState(callbackOrChangeTypeOrId, value);
                    };
                }
            }

            const subs: SubscriptionResult = {
                pattern: oPattern,
                callback: (obj: EventObj) => {
                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, obj);
                        } catch (err: unknown) {
                            errorInCallback(err as Error);
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
            if (sandbox.verbose) {
                sandbox.log(`subscribe: ${JSON.stringify(subs)}`, 'info');
            }

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
                result[context.subscriptions[s].pattern.id as string] =
                    result[context.subscriptions[s].pattern.id as string] || [];
                result[context.subscriptions[s].pattern.id as string].push({
                    name: context.subscriptions[s].name,
                    pattern: context.subscriptions[s].pattern,
                });
            }
            if (sandbox.verbose) {
                sandbox.log(`getSubscriptions() => ${JSON.stringify(result)}`, 'info');
            }
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
            if (sandbox.verbose) {
                sandbox.log(`getFileSubscriptions() => ${JSON.stringify(result)}`, 'info');
            }
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
                if (sandbox.verbose) {
                    sandbox.log(`adapterSubscribe: ${a} - ${id}`, 'info');
                }
                adapter.sendTo(a, 'subscribe', id);
            }
        },
        adapterUnsubscribe: function (
            idOrObject: string | SubscriptionResult | (string | SubscriptionResult)[],
        ): boolean | boolean[] {
            // todo: BF - it could be an error
            return sandbox.unsubscribe(idOrObject);
        },
        unsubscribe: function (
            idOrObject: string | SubscriptionResult | (string | SubscriptionResult)[],
        ): boolean | boolean[] {
            if (idOrObject && Array.isArray(idOrObject)) {
                const result: boolean[] = [];
                for (let t = 0; t < idOrObject.length; t++) {
                    result.push(sandbox.unsubscribe(idOrObject[t]) as boolean);
                }
                return result;
            }

            if (sandbox.verbose) {
                sandbox.log(`adapterUnsubscribe(id=${JSON.stringify(idOrObject)})`, 'info');
            }

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
            // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
            callbackOrChangeTypeOrId: string | ChangeType | ((event?: EventObj) => void),
            value?: any,
        ):
            | SubscriptionResult
            | IobSchedule
            | string
            | null
            | undefined
            | (SubscriptionResult | IobSchedule | string | null | undefined)[] {
            return sandbox.subscribe(pattern, callbackOrChangeTypeOrId, value);
        },
        onEnumMembers: function (enumId: string, callback: (event?: EventObj) => void): void {
            if (enums.includes(enumId)) {
                const subscriptions: Record<string, string | SubscriptionResult> = {};

                const init = (): void => {
                    const obj: ioBroker.EnumObject = objects[enumId] as ioBroker.EnumObject;
                    const common: ioBroker.EnumCommon = obj?.common ?? {};
                    const members: string[] = common?.members ?? [];

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
                                subscriptions[objId] = sandbox.subscribe(objId, callback) as
                                    | string
                                    | SubscriptionResult; // TODO: more features
                            }
                        }
                    }

                    sandbox.verbose &&
                        sandbox.log(
                            `onEnumMembers(id=${enumId}, members=${JSON.stringify(Object.keys(subscriptions))})`,
                            'info',
                        );
                };

                init();

                sandbox.subscribeObject(enumId, obj => obj && init());
            } else {
                sandbox.log(`onEnumMembers: enum with id "${enumId}" doesn't exists`, 'error');
            }
        },
        onFile: function (
            id: string,
            fileNamePattern: string | string[],
            withFileOrCallback:
                | boolean
                | ((id: string, fileName: string, size: number, file?: string | Buffer, mimeType?: string) => void),
            callback?: (
                id: string,
                fileName: string,
                size: number | null,
                file?: string | Buffer,
                mimeType?: string,
            ) => void,
        ): undefined | FileSubscriptionResult | (undefined | FileSubscriptionResult)[] {
            if (typeof withFileOrCallback === 'function') {
                callback = withFileOrCallback as (
                    id: string,
                    fileName: string,
                    size: number | null,
                    file?: string | Buffer,
                    mimeType?: string,
                ) => void;
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
                return fileNamePattern.map(
                    filePattern =>
                        sandbox.onFile(id, filePattern, withFileOrCallback, callback) as
                            | undefined
                            | FileSubscriptionResult,
                );
            }

            sandbox.__engine.__subscriptionsFile += 1;

            sandbox.verbose &&
                sandbox.log(
                    `onFile(id=${id}, fileNamePattern=${fileNamePattern}) - fileSubscriptions=${sandbox.__engine.__subscriptionsFile}`,
                    'info',
                );

            if (
                sandbox.__engine.__subscriptionsFile %
                    (adapter.config as JavaScriptAdapterConfig).maxTriggersPerScript ===
                0
            ) {
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
                withFile: withFileOrCallback,
                idRegEx,
                fileRegEx,
                callback: (id: string, fileName: string, size: number | null, withFile: boolean): void => {
                    try {
                        sandbox.verbose &&
                            sandbox.log(`onFile changed(id=${id}, fileName=${fileName}, size=${size})`, 'info');

                        if (withFile && (size || 0) > 0) {
                            adapter
                                .readFileAsync(id, fileName)
                                .then(data => {
                                    try {
                                        callback.call(sandbox, id, fileName, size, data.file, data.mimeType);
                                    } catch (err: unknown) {
                                        errorInCallback(err as Error);
                                    }
                                })
                                .catch(error => errorInCallback(error));
                        } else {
                            callback.call(sandbox, id, fileName, size);
                        }
                    } catch (err: unknown) {
                        errorInCallback(err as Error);
                    }
                },
                name,
            };

            context.subscriptionsFile.push(subs);
            subscribeFile(script, id, fileNamePattern);
            return subs;
        },
        offFile: function (
            idOrObject: FileSubscriptionResult | string | (FileSubscriptionResult | string)[],
            fileNamePattern?: string | string[],
        ): boolean | boolean[] {
            if (!adapter.unsubscribeForeignFiles) {
                sandbox.log(
                    'offFile: your js-controller does not support yet file unsubscribes. Please update to js-controller@4.1.x or newer',
                    'warn',
                );
                return false;
            }

            sandbox.verbose &&
                sandbox.log(
                    `offFile(idOrObject=${JSON.stringify(idOrObject)}, fileNamePattern=${JSON.stringify(fileNamePattern)}) - fileSubscriptions=${sandbox.__engine.__subscriptionsFile}`,
                    'info',
                );

            if (idOrObject && typeof idOrObject === 'object') {
                if (Array.isArray(idOrObject)) {
                    const result: boolean[] = [];
                    for (let t = 0; t < idOrObject.length; t++) {
                        result.push(sandbox.offFile(idOrObject[t]) as boolean);
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
                                `offFile(type=object, fileNamePattern=${JSON.stringify(fileNamePattern)}, removing id=${context.subscriptionsFile[i].id})`,
                                'info',
                            );

                        context.subscriptionsFile.splice(i, 1);
                        sandbox.__engine.__subscriptionsFile--;
                        return true;
                    }
                }
                return false;
            }

            if (fileNamePattern && Array.isArray(fileNamePattern)) {
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
        once: function (
            pattern:
                | TimeRule
                | AstroRule
                | Pattern
                | SchedulerRule
                | string
                | (TimeRule | AstroRule | Pattern | SchedulerRule | string)[],
            callback?: (event?: EventObj) => void,
        ): string | SubscriptionResult | Promise<EventObj | undefined> {
            function _once(cb: (obj?: EventObj) => void): string | SubscriptionResult {
                // eslint-disable-next-line prefer-const
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
        schedule: function (
            pattern: SchedulerRule | AstroRule | Date | string,
            callback: () => void,
        ): IobSchedule | string | null | undefined {
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

                if (!context.scheduler) {
                    sandbox.log(
                        `Cannot schedule "${typeof pattern === 'object' ? JSON.stringify(pattern) : pattern}" because scheduler is not available`,
                        'error',
                    );
                    return null;
                }

                const schedule: string | null = context.scheduler.add(
                    pattern as SchedulerRule | string,
                    sandbox.scriptName,
                    callback,
                );
                if (schedule) {
                    script.wizards.push(schedule);
                    sandbox.__engine.__schedules += 1;

                    if (
                        sandbox.__engine.__schedules %
                            (adapter.config as JavaScriptAdapterConfig).maxTriggersPerScript ===
                        0
                    ) {
                        sandbox.log(
                            `More than ${sandbox.__engine.__schedules} schedules registered. Check your script!`,
                            'warn',
                        );
                    }
                }

                return schedule;
            }

            const adapterConfig: JavaScriptAdapterConfig = adapter.config as JavaScriptAdapterConfig;

            if (typeof pattern === 'object' && (pattern as AstroRule).astro) {
                const astroPattern = pattern as AstroRule;
                const nowDate = new Date();

                if (
                    adapterConfig.latitude === undefined ||
                    adapterConfig.longitude === undefined ||
                    adapterConfig.latitude === null ||
                    adapterConfig.longitude === null
                ) {
                    sandbox.log('Longitude or latitude does not set. Cannot use astro.', 'error');
                    return null;
                }

                // ensure events are calculated independent of current time
                // TODO: use getAstroStartOfDay of adapter?
                const todayNoon = new Date(nowDate);
                todayNoon.setHours(12, 0, 0, 0);
                let ts = mods.suncalc.getTimes(todayNoon, adapterConfig.latitude, adapterConfig.longitude)[
                    astroPattern.astro
                ];

                // event on the next day, correct or force recalculation at midnight
                if (todayNoon.getDate() !== ts.getDate()) {
                    todayNoon.setDate(todayNoon.getDate() - 1);
                    ts = mods.suncalc.getTimes(todayNoon, adapterConfig.latitude, adapterConfig.longitude)[
                        astroPattern.astro
                    ];
                }

                if (ts.getTime().toString() === 'NaN') {
                    sandbox.log(
                        `Cannot calculate "${astroPattern.astro}" for ${adapterConfig.latitude}, ${adapterConfig.longitude}`,
                        'warn',
                    );
                    ts = new Date(nowDate.getTime());

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

                if (sandbox.__engine.__schedules % adapterConfig.maxTriggersPerScript === 0) {
                    sandbox.log(
                        `More than ${sandbox.__engine.__schedules} schedules registered. Check your script!`,
                        'warn',
                    );
                }

                sandbox.setTimeout(() => {
                    try {
                        callback.call(sandbox);
                    } catch (err: unknown) {
                        errorInCallback(err as Error);
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
                    } catch (err: unknown) {
                        errorInCallback(err as Error);
                    }
                });
                if (schedule) {
                    sandbox.__engine.__schedules += 1;

                    if (
                        sandbox.__engine.__schedules %
                            (adapter.config as JavaScriptAdapterConfig).maxTriggersPerScript ===
                        0
                    ) {
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
                    sandbox.log(`schedule(cron=${JSON.stringify(pattern)}): cannot create schedule`, 'error');
                }

                if (sandbox.verbose) {
                    sandbox.log(`schedule(cron=${JSON.stringify(pattern)})`, 'info');
                }

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

                    let result = time.match(rhms);
                    if (result) {
                        [, h, m, s] = result.map(v => parseInt(v));
                        isValid = true;
                    } else {
                        result = time.match(rhm);
                        if (result) {
                            [, h, m] = result.map(v => parseInt(v));
                            isValid = true;
                        }
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
                                    } catch (err: unknown) {
                                        errorInCallback(err as Error);
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
                    if (sandbox.verbose) {
                        sandbox.log(`scheduleById(id=${id}): Init with value ${state.val}`, 'info');
                    }
                    init(state.val.toString());
                }
            });

            const triggerDef: Pattern = { id, change: 'any' };
            if (ack !== undefined) {
                triggerDef.ack = ack;
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
                (!(adapter.config as JavaScriptAdapterConfig).latitude &&
                    ((adapter.config as JavaScriptAdapterConfig).latitude as unknown as number) !== 0) ||
                (!(adapter.config as JavaScriptAdapterConfig).longitude &&
                    ((adapter.config as JavaScriptAdapterConfig).longitude as unknown as number) !== 0)
            ) {
                sandbox.log('Longitude or latitude does not set. Cannot use astro.', 'error');
                return;
            }

            // ensure events are calculated independent of current time
            date.setHours(12, 0, 0, 0);
            let ts = mods.suncalc.getTimes(
                date,
                (adapter.config as JavaScriptAdapterConfig).latitude,
                (adapter.config as JavaScriptAdapterConfig).longitude,
            )[pattern];

            if (ts === undefined || ts.getTime().toString() === 'NaN') {
                sandbox.log(
                    `Cannot calculate astro date "${pattern}" for ${(adapter.config as JavaScriptAdapterConfig).latitude}, ${(adapter.config as JavaScriptAdapterConfig).longitude}`,
                    'warn',
                );
            }

            if (sandbox.verbose) {
                sandbox.log(`getAstroDate(pattern=${pattern}, date=${date.toString()}) => ${ts}`, 'info');
            }

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

            if (sandbox.verbose) {
                sandbox.log(`isAstroDay() => ${nowDate >= dayBegin && nowDate <= dayEnd}`, 'info');
            }

            return nowDate >= dayBegin && nowDate <= dayEnd;
        },
        clearSchedule: function (schedule: IobSchedule | ScheduleName | string): boolean {
            if (context.scheduler?.get(schedule as string | ScheduleName)) {
                if (sandbox.verbose) {
                    sandbox.log('clearSchedule() => wizard cleared', 'info');
                }
                const pos = script.wizards.indexOf(schedule as string);
                if (pos !== -1) {
                    script.wizards.splice(pos, 1);
                    if (sandbox.__engine.__schedules > 0) {
                        sandbox.__engine.__schedules--;
                    }
                }
                context.scheduler.remove(schedule as string | ScheduleName);
                return true;
            }
            for (let i = 0; i < script.schedules.length; i++) {
                if (schedule && typeof schedule === 'object' && (schedule as IobSchedule)._ioBroker?.type === 'cron') {
                    if (script.schedules[i]._ioBroker.id === (schedule as IobSchedule)._ioBroker.id) {
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
                } else if (script.schedules[i] === schedule) {
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
        getSchedules: function (allScripts?: boolean): ScheduleName[] {
            const schedules = context.scheduler?.getList() || [];
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
        setState: function (
            id: string,
            state: ioBroker.SettableState | ioBroker.StateValue,
            isAck?: boolean | 'true' | 'false' | ((err?: Error | null) => void),
            callback?: (err?: Error | null) => void,
        ): void {
            return setStateHelper(sandbox, false, false, id, state, isAck, callback);
        },
        setStateChanged: function (
            id: string,
            state: ioBroker.SettableState | ioBroker.StateValue,
            isAck?: boolean | ((err?: Error | null) => void),
            callback?: (err?: Error | null) => void,
        ): void {
            return setStateHelper(sandbox, false, true, id, state, isAck, callback);
        },
        setStateDelayed: function (
            id: string,
            state: ioBroker.SettableState | ioBroker.StateValue,
            isAck: boolean | number | undefined,
            delay?: number | boolean,
            clearRunning?: boolean | ((err?: Error | null) => void),
            callback?: (err?: Error | null) => void,
        ): number | null {
            // find arguments
            if (typeof isAck !== 'boolean') {
                callback = clearRunning as (err?: Error | null) => void;
                clearRunning = delay as boolean;
                delay = isAck as number;
                isAck = undefined;
            }
            if (typeof delay !== 'number') {
                callback = clearRunning as (err?: Error | null) => void;
                clearRunning = delay as boolean;
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
                val:
                    isObject(state) && (state as ioBroker.SettableState).val !== undefined
                        ? ((state as ioBroker.SettableState).val as ioBroker.StateValue)
                        : (state as ioBroker.StateValue),
                ack:
                    isObject(state) &&
                    (state as ioBroker.SettableState).val !== undefined &&
                    (state as ioBroker.SettableState).ack !== undefined
                        ? (state as ioBroker.SettableState).ack
                        : isAck,
            });

            return context.timerId;
        },
        clearStateDelayed: function (id: string, timerId: number): boolean {
            // Check a type of state
            if (!objects[id] && objects[`${adapter.namespace}.${id}`]) {
                id = `${adapter.namespace}.${id}`;
            }

            if (sandbox.verbose) {
                sandbox.log(`clearStateDelayed(id=${id}, timerId=${timerId})`, 'info');
            }

            if (timers[id]) {
                for (let i = timers[id].length - 1; i >= 0; i--) {
                    if (timerId === undefined || timers[id][i].id === timerId) {
                        clearTimeout(timers[id][i].t);
                        if (timerId !== undefined) {
                            timers[id].splice(i, 1);
                        }
                        if (sandbox.verbose) {
                            sandbox.log(`clearStateDelayed: clear timer ${timers[id][i].id}`, 'info');
                        }
                    }
                }
                if (timerId === undefined) {
                    delete timers[id];
                } else {
                    if (!timers[id].length) {
                        delete timers[id];
                    }
                }
                return true;
            }
            return false;
        },
        getStateDelayed: function (
            id: string | number,
        ):
            | null
            | { timerId: number; left: number; delay: number; val: ioBroker.StateValue; ack?: boolean }
            | { timerId: number; left: number; delay: number; val: ioBroker.StateValue; ack?: boolean }[]
            | Record<
                  string,
                  { timerId: number; left: number; delay: number; val: ioBroker.StateValue; ack?: boolean }[]
              > {
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

                const result: {
                    timerId: number;
                    left: number;
                    delay: number;
                    val: ioBroker.StateValue;
                    ack?: boolean;
                }[] = [];
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
            const result: Record<
                string,
                { timerId: number; left: number; delay: number; val: ioBroker.StateValue; ack?: boolean }[]
            > = {};
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
        getStateAsync: async function (id: string): Promise<ioBroker.State | null | undefined> {
            let state: ioBroker.State | null | undefined;
            if (id.includes('.')) {
                state = await adapter.getForeignStateAsync(id);
            } else {
                state = await adapter.getStateAsync(id);
            }
            return context.convertBackStringifiedValues(id, state);
        },
        setStateAsync: function (
            id: string,
            state: ioBroker.SettableState | ioBroker.StateValue,
            isAck?: boolean,
        ): Promise<void> {
            return new Promise((resolve, reject) =>
                setStateHelper(sandbox, false, false, id, state, isAck, err => (err ? reject(err) : resolve())),
            );
        },
        setStateChangedAsync: function (
            id: string,
            state: ioBroker.SettableState | ioBroker.StateValue,
            isAck?: boolean,
        ): Promise<void> {
            return new Promise((resolve, reject) =>
                setStateHelper(sandbox, false, true, id, state, isAck, err => (err ? reject(err) : resolve())),
            );
        },
        getState: function (
            id: string,
            callback?: (err: Error | null | undefined, state?: ioBroker.State | null) => void,
        ): undefined | void | (ioBroker.State & { notExist?: true }) | null {
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
                if ((adapter.config as JavaScriptAdapterConfig).subscribe) {
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
                                `getState(id=${id}, timerId=${JSON.stringify(timers[id])}) => ${JSON.stringify(states[id])}`,
                                'info',
                            );
                        if (context.interimStateValues[id] !== undefined) {
                            return context.convertBackStringifiedValues(id, context.interimStateValues[id]);
                        }
                        return context.convertBackStringifiedValues(id, states[id]);
                    } else if (states[`${adapter.namespace}.${id}`]) {
                        sandbox.verbose &&
                            sandbox.log(
                                `getState(id=${id}, timerId=${JSON.stringify(timers[id])}) => ${JSON.stringify(states[`${adapter.namespace}.${id}`])}`,
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

                    if (sandbox.verbose) {
                        sandbox.log(`getState(id=${id}, timerId=${JSON.stringify(timers[id])}) => not found`, 'info');
                    }

                    context.logWithLineInfo(
                        `getState "${id}" not found (3)${states[id] !== undefined ? ` states[id]=${JSON.stringify(states[id])}` : ''}`,
                    ); ///xxx
                    return { val: null, notExist: true } as ioBroker.State & { notExist?: true };
                }
            }
        },
        existsState: function (
            id: string,
            callback?: (err: Error | null | undefined, stateExists?: boolean) => void,
        ): void | boolean {
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

                    if ((adapter.config as JavaScriptAdapterConfig).subscribe) {
                        adapter.getForeignState(id, (err, state) => {
                            callback(err, !!state);
                        });
                    } else {
                        callback(err, !!states[id]);
                    }
                });
            } else {
                if ((adapter.config as JavaScriptAdapterConfig).subscribe) {
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
        existsObject: function (
            id: string,
            callback?: (err: Error | null | undefined, objectExists?: boolean) => void,
        ): void | boolean {
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
        getIdByName: function (name: string, alwaysArray?: boolean): string | string[] | null {
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
        getObject: function (
            id: string,
            enumName: null | string | ((err: Error | null | undefined, obj?: ioBroker.Object | null) => void),
            cb?: (err: Error | null | undefined, obj?: ioBroker.Object | null) => void,
        ): void | ioBroker.Object | null {
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
                adapter.getForeignObject(id, (err, obj) => {
                    if (obj) {
                        objects[id] = obj;
                    } else if (objects[id]) {
                        delete objects[id];
                    }
                    let result: ioBroker.Object | null | undefined;
                    try {
                        result = JSON.parse(JSON.stringify(objects[id]));
                    } catch (err: unknown) {
                        adapter.setState(`scriptProblem.${name.substring('script.js.'.length)}`, {
                            val: true,
                            ack: true,
                            c: 'getObject',
                        });
                        sandbox.log(`Object "${id}" can't be copied: ${JSON.stringify(err)}`, 'error');
                        return cb(null, null);
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
                }
                if (enumName) {
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
                }
                let result: ioBroker.Object | null | undefined;
                try {
                    result = JSON.parse(JSON.stringify(objects[id]));
                } catch (err: unknown) {
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
        },
        // This function will be overloaded later if the modification of objects is allowed
        setObject: function (
            _id: string,
            _obj: ioBroker.Object,
            callback?: (err?: Error | null, res?: { id: string }) => void,
        ): void {
            sandbox.log('Function "setObject" is not allowed. Use adapter settings to allow it.', 'error');
            if (typeof callback === 'function') {
                try {
                    callback.call(
                        sandbox,
                        new Error('Function "setObject" is not allowed. Use adapter settings to allow it.'),
                    );
                } catch (err: unknown) {
                    errorInCallback(err as Error);
                }
            }
        },
        // This function will be overloaded later if the modification of objects is allowed
        extendObject: function (
            _id: string,
            _obj: Partial<ioBroker.Object>,
            callback?: (err?: Error | null, res?: { id: string }) => void,
        ): void {
            sandbox.log('Function "extendObject" is not allowed. Use adapter settings to allow it.', 'error');
            if (typeof callback === 'function') {
                try {
                    callback.call(
                        sandbox,
                        new Error('Function "extendObject" is not allowed. Use adapter settings to allow it.'),
                    );
                } catch (err: unknown) {
                    errorInCallback(err as Error);
                }
            }
        },
        // This function will be overloaded later if the modification of objects is allowed
        deleteObject: function (
            _id: string,
            _isRecursive?: boolean | ioBroker.ErrorCallback,
            callback?: ioBroker.ErrorCallback,
        ): void {
            if (typeof _isRecursive === 'function') {
                callback = _isRecursive;
            }
            sandbox.log('Function "deleteObject" is not allowed. Use adapter settings to allow it.', 'error');
            if (typeof callback === 'function') {
                try {
                    callback.call(
                        sandbox,
                        new Error('Function "deleteObject" is not allowed. Use adapter settings to allow it.'),
                    );
                } catch (err: unknown) {
                    errorInCallback(err as Error);
                }
            }
        },
        getEnums: function (enumName?: string): { id: string; members: string[]; name: ioBroker.StringOrTranslated }[] {
            const result: { id: string; members: string[]; name: ioBroker.StringOrTranslated }[] = [];
            const r = enumName ? new RegExp(`^enum\\.${enumName}\\.`) : false;
            for (let i = 0; i < enums.length; i++) {
                if (!r || r.test(enums[i])) {
                    const common: ioBroker.EnumCommon =
                        (objects[enums[i]] as ioBroker.EnumObject).common || ({} as ioBroker.EnumCommon);
                    result.push({
                        id: enums[i],
                        members: common.members || [],
                        name: common.name || '',
                    });
                }
            }
            if (sandbox.verbose) {
                sandbox.log(`getEnums(enumName=${enumName}) => ${JSON.stringify(result)}`, 'info');
            }
            return JSON.parse(JSON.stringify(result));
        },
        createAlias: function (
            name: string,
            alias: string | CommonAlias,
            forceCreation: boolean | Partial<ioBroker.StateCommon> | ((err: Error | null) => void) | undefined,
            common?: Partial<ioBroker.StateCommon> | Record<string, any> | ((err: Error | null) => void),
            native?: Record<string, any> | ((err: Error | null) => void),
            callback?: (err: Error | null) => void,
        ) {
            if (typeof native === 'function') {
                callback = native as (err: Error | null) => void;
                native = {};
            }
            if (typeof common === 'function') {
                callback = common as (err: Error | null) => void;
                common = undefined;
            }
            if (typeof forceCreation === 'function') {
                callback = forceCreation as (err: Error | null) => void;
                forceCreation = undefined;
            }
            if (isObject(forceCreation)) {
                native = common;
                common = forceCreation as Partial<ioBroker.ObjectCommon>;
                forceCreation = undefined;
            }

            if (typeof name !== 'string') {
                const err = `Wrong type of name "${typeof name}". Expected "string".`;
                sandbox.log(err, 'error');
                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, new Error(err));
                    } catch (err: unknown) {
                        errorInCallback(err as Error);
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
                    } catch (err: unknown) {
                        errorInCallback(err as Error);
                    }
                }
                return;
            }

            if (!name.startsWith('alias.0.')) {
                name = `alias.0.${name}`;
            }

            const _common: Partial<ioBroker.StateCommon> = (common as Partial<ioBroker.StateCommon>) || {};
            if (isObject(_common.alias)) {
                // alias already in common, use this
            } else if (
                isObject(alias) &&
                (typeof (alias as CommonAlias).id === 'string' || isObject((alias as CommonAlias).id))
            ) {
                _common.alias = alias as CommonAlias;
            } else if (typeof alias === 'string') {
                _common.alias = { id: alias };
            } else {
                const err = 'Source ID needs to be provided as string or object with id property.';
                sandbox.log(err, 'error');
                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, new Error(err));
                    } catch (err: unknown) {
                        errorInCallback(err as Error);
                    }
                }
                return;
            }

            let aliasSourceId = '';
            if (_common.alias) {
                aliasSourceId = isObject(_common.alias.id)
                    ? (_common.alias.id as { read: string; write: string }).read
                    : (_common.alias.id as string);
                if (!objects[aliasSourceId] && objects[`${adapter.namespace}.${aliasSourceId}`]) {
                    aliasSourceId = `${adapter.namespace}.${aliasSourceId}`;
                    if (isObject(_common.alias.id)) {
                        (_common.alias.id as { read: string; write: string }).read = aliasSourceId;
                    } else {
                        _common.alias.id = aliasSourceId;
                    }
                }
                if (
                    isObject(_common.alias.id) &&
                    (_common.alias.id as { read: string; write: string }).write &&
                    !objects[(_common.alias.id as { read: string; write: string }).write] &&
                    objects[`${adapter.namespace}.${(_common.alias.id as { read: string; write: string }).write}`]
                ) {
                    (_common.alias.id as { read: string; write: string }).write =
                        `${adapter.namespace}.${(_common.alias.id as { read: string; write: string }).write}`;
                }
            }
            const obj = objects[aliasSourceId];
            if (!obj) {
                const err = `Alias source object "${aliasSourceId}" does not exist.`;
                sandbox.log(err, 'error');
                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, new Error(err));
                    } catch (err: unknown) {
                        errorInCallback(err as Error);
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
                    } catch (err: unknown) {
                        errorInCallback(err as Error);
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

            return sandbox.createState(
                name,
                undefined,
                forceCreation as boolean,
                _common,
                native,
                callback as (err?: Error | null) => void,
            );
        },
        createState: async function (
            name: string,
            initValue: undefined | ioBroker.StateValue | ioBroker.State,
            forceCreation:
                | boolean
                | undefined
                | Record<string, any>
                | Partial<ioBroker.StateCommon>
                | ((err: Error | null) => void),
            common?: Partial<ioBroker.StateCommon> | ((err: Error | null) => void),
            native?: Record<string, any> | ((err: Error | null) => void),
            callback?: (error: Error | null | undefined, id?: string) => void,
        ) {
            if (typeof native === 'function') {
                callback = native as (err?: Error | null) => void;
                native = {};
            }
            if (typeof common === 'function') {
                callback = common as (err?: Error | null) => void;
                common = undefined;
            }
            if (typeof initValue === 'function') {
                callback = initValue as (err?: Error | null) => void;
                initValue = undefined;
            }
            if (typeof forceCreation === 'function') {
                callback = forceCreation as (err?: Error | null) => void;
                forceCreation = undefined;
            }
            if (isObject(initValue)) {
                common = initValue as Partial<ioBroker.StateCommon>;
                native = forceCreation as Record<string, any>;
                forceCreation = undefined;
                initValue = undefined;
            }
            if (isObject(forceCreation)) {
                native = common as Record<string, any>;
                common = forceCreation as Partial<ioBroker.StateCommon>;
                forceCreation = undefined;
            }

            if (typeof name !== 'string') {
                const err = `Wrong type of name "${typeof name}". Expected "string".`;
                sandbox.log(err, 'error');
                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, new Error(err));
                    } catch (err: unknown) {
                        errorInCallback(err as Error);
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
                    } catch (err: unknown) {
                        errorInCallback(err as Error);
                    }
                }
                return;
            }

            const isAlias = name.startsWith('alias.0.');

            const _common: ioBroker.StateCommon = (common || {}) as ioBroker.StateCommon;
            _common.name = _common.name || name;
            _common.role = _common.role || 'state';
            _common.type = _common.type || 'mixed';
            if (!isAlias && initValue === undefined) {
                initValue = _common.def;
            }

            native = native || {};

            // Check min, max and def values for number
            if (_common.type !== undefined && _common.type === 'number') {
                let min = 0;
                let max = 0;
                let def = 0;
                let err: string | undefined;
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
                                } catch (err: unknown) {
                                    errorInCallback(err as Error);
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
                                } catch (err: unknown) {
                                    errorInCallback(err as Error);
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
                    } else {
                        def = _common.def;
                        if (typeof def !== 'number') {
                            def = parseFloat(def);
                            if (isNaN(def)) {
                                err = `Wrong type of ${name}.common.def`;
                                sandbox.log(err, 'error');
                                if (typeof callback === 'function') {
                                    try {
                                        callback.call(sandbox, new Error(err));
                                    } catch (err: unknown) {
                                        errorInCallback(err as Error);
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
                sandbox.log(
                    `createState(name=${name}, initValue=${JSON.stringify(initValue)}, forceCreation=${JSON.stringify(forceCreation)}, common=${JSON.stringify(common)}, native=${JSON.stringify(native)}, isAlias=${isAlias})`,
                    'debug',
                );
            }

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
            if (!isAlias && _common.alias) {
                // check and create if not exists the alias
                let alias: CommonAlias;
                if (typeof _common.alias === 'string') {
                    alias = {
                        id: _common.alias,
                    };
                } else if (typeof _common.alias === 'boolean') {
                    const parts = id.split('.');
                    parts[0] = 'alias';
                    parts[1] = '0';

                    alias = {
                        id: parts.join('.'),
                    };
                } else {
                    alias = _common.alias;
                }
                delete _common.alias;

                if (!(alias.id as string).startsWith('alias.0.')) {
                    alias.id = `alias.0.${alias.id as string}`;
                }

                let aObj: ioBroker.StateObject | null | undefined;
                try {
                    aObj = (await adapter.getForeignObjectAsync(alias.id as string)) as
                        | ioBroker.StateObject
                        | null
                        | undefined;
                } catch {
                    // ignore
                }
                if (!aObj) {
                    try {
                        const _obj: ioBroker.StateObject = {
                            _id: alias.id as string,
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

                        await adapter.setForeignObjectAsync(alias.id as string, _obj);
                    } catch (err: unknown) {
                        sandbox.log(`Cannot create alias "${alias.id as string}": ${err as Error}`, 'error');
                    }
                }
            } else if (isAlias && _common.alias) {
                if (typeof _common.alias === 'string') {
                    _common.alias = {
                        id: _common.alias,
                    };
                }
                const readId = typeof _common.alias.id === 'string' ? _common.alias.id : _common.alias.id.read;
                let writeId: string | undefined =
                    typeof _common.alias.id === 'string' ? _common.alias.id : _common.alias.id.write;
                if (writeId === readId) {
                    writeId = undefined;
                }
                // try to create the linked states
                let aObj: ioBroker.StateObject | null | undefined;
                try {
                    aObj = (await adapter.getForeignObjectAsync(readId)) as ioBroker.StateObject | null | undefined;
                } catch {
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
                    } catch (err: unknown) {
                        sandbox.log(`Cannot create alias "${readId}": ${err as Error}`, 'error');
                    }
                }
                if (writeId && _common.write !== false) {
                    try {
                        aObj = (await adapter.getForeignObjectAsync(writeId)) as
                            | ioBroker.StateObject
                            | null
                            | undefined;
                    } catch {
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
                        } catch (err: unknown) {
                            sandbox.log(`Cannot create alias "${writeId}": ${err as Error}`, 'error');
                        }
                    }
                }
            }

            let obj: ioBroker.Object | null | undefined;
            try {
                obj = await adapter.getForeignObjectAsync(id);
            } catch {
                // ignore
            }

            if (
                obj?._id &&
                validIdForAutomaticFolderCreation(obj._id) &&
                obj.type === 'folder' &&
                obj.native &&
                obj.native.autocreated === 'by automatic ensure logic'
            ) {
                // ignore a default created object because we now have a better defined one
                obj = null;
            }

            if (!obj || forceCreation) {
                // create new one
                const newObj: ioBroker.StateObject = {
                    _id: id,
                    common: _common,
                    native,
                    type: 'state',
                };
                try {
                    await adapter.setForeignObjectAsync(id, newObj);
                } catch (err: unknown) {
                    sandbox.log(`Cannot set object "${id}": ${err as Error}`, 'warn');
                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, err as Error);
                        } catch (err: unknown) {
                            errorInCallback(err as Error);
                        }
                    }
                    return;
                }

                // Update meta objects
                context.updateObjectContext(id, newObj);

                if (!isAlias && initValue !== undefined) {
                    if (isObject(initValue) && (initValue as ioBroker.State).ack !== undefined) {
                        setStateHelper(sandbox, true, false, id, initValue, callback);
                    } else {
                        setStateHelper(sandbox, true, false, id, initValue, true, callback);
                    }
                } else if (!isAlias && !forceCreation) {
                    setStateHelper(sandbox, true, false, id, null, callback);
                } else if (isAlias) {
                    try {
                        const state = await adapter.getForeignStateAsync(id);
                        if (state) {
                            states[id] = state;
                        }
                    } catch {
                        // ignore
                    }
                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, null, id);
                        } catch (err: unknown) {
                            errorInCallback(err as Error);
                        }
                    }
                } else if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, null, id);
                    } catch (err: unknown) {
                        errorInCallback(err as Error);
                    }
                }
                await ensureObjectStructure(id);
            } else {
                // state yet exists
                if (
                    !(adapter.config as JavaScriptAdapterConfig).subscribe &&
                    !states[id] &&
                    states[`${adapter.namespace}.${id}`] === undefined
                ) {
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
                    } catch (err: unknown) {
                        errorInCallback(err as Error);
                    }
                }

                await ensureObjectStructure(id);
            }
        },
        deleteState: function (id: string, callback?: (err: Error | null | undefined, found?: boolean) => void): void {
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
                            } catch (err: unknown) {
                                errorInCallback(err as Error);
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
                            } catch (err: unknown) {
                                errorInCallback(err as Error);
                            }
                        }
                    });
                });
            } else {
                const err = 'Not found';
                sandbox.log(`Cannot delete state "${id}": ${err}`, 'error');
                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, new Error(err), found);
                    } catch (err: unknown) {
                        errorInCallback(err as Error);
                    }
                }
            }
        },
        sendTo: function (
            _adapter: string,
            cmd: string,
            msg?: any,
            options?: Record<string, any> | ((result: any, options: Record<string, any>, _adapter: string) => void),
            callback?: (result: any, options: Record<string, any>, _adapter: string) => void,
        ): void {
            const defaultTimeout = 20000;

            if (typeof options === 'function') {
                callback = options as (result: any, options: Record<string, any>, _adapter: string) => void;
                options = { timeout: defaultTimeout };
            }

            let timeout: NodeJS.Timeout | null = null;
            if (typeof callback === 'function') {
                const timeoutDuration = parseInt(options?.timeout, 10) || defaultTimeout;

                timeout = setTimeout(() => {
                    timeout = null;

                    if (sandbox.verbose) {
                        sandbox.log(`sendTo => timeout: ${timeoutDuration}`, 'debug');
                    }

                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, { error: 'timeout' }, options as Record<string, any>, _adapter);
                        } catch (err: unknown) {
                            errorInCallback(err as Error);
                        }
                        callback = undefined;
                    }
                }, timeoutDuration);
            }

            let cbFunc: undefined | ((result: any) => void);
            if (timeout) {
                cbFunc = function (result: any): void {
                    if (timeout) {
                        clearTimeout(timeout);
                        timeout = null;
                    }

                    if (sandbox.verbose && result) {
                        sandbox.log(`sendTo => ${JSON.stringify(result)}`, 'debug');
                    }

                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, result, options as Record<string, any>, _adapter);
                        } catch (err: unknown) {
                            errorInCallback(err as Error);
                        }
                        callback = undefined;
                    }
                };
            }

            // If specific instance
            if (_adapter.match(/\.[0-9]+$/)) {
                sandbox.verbose &&
                    sandbox.log(
                        `sendTo(instance=${_adapter}, cmd=${cmd}, msg=${JSON.stringify(msg)}, hasCallback=${typeof callback === 'function'})`,
                        'info',
                    );

                adapter.sendTo(_adapter, cmd, msg, cbFunc, options);
            } else {
                // Send it to all instances
                context.adapter.getObjectView(
                    'system',
                    'instance',
                    { startkey: `system.adapter.${_adapter}.`, endkey: `system.adapter.${_adapter}.\u9999` },
                    options,
                    (err, res) => {
                        if (err || !res) {
                            sandbox.log(`sendTo failed: ${err?.message}`, 'error');
                            return;
                        }

                        const instances = res.rows.map(item => item.id.substring('system.adapter.'.length));

                        instances.forEach(instance => {
                            sandbox.verbose &&
                                sandbox.log(
                                    `sendTo(instance=${instance}, cmd=${cmd}, msg=${JSON.stringify(msg)}, hasCallback=${typeof callback === 'function'})`,
                                    'info',
                                );
                            adapter.sendTo(instance, cmd, msg, cbFunc, options);
                        });
                    },
                );
            }
        },
        sendto: function (
            _adapter: string,
            cmd: string,
            msg: any,
            callback?: (result: any, options: Record<string, any>, _adapter: string) => void,
        ): void {
            return sandbox.sendTo(_adapter, cmd, msg, callback);
        },
        sendToAsync: function (_adapter: string, cmd: string, msg?: any, options?: Record<string, any>): Promise<any> {
            return new Promise((resolve, reject) => {
                sandbox.sendTo(_adapter, cmd, msg, options, res => {
                    if (!res || res.error) {
                        reject(res ? new Error(res.error) : new Error('Unknown error'));
                    } else {
                        resolve(res);
                    }
                });
            });
        },
        sendToHost: function (host: string, cmd: string, msg?: any, callback?: (result: any) => void): void {
            if (!(adapter.config as JavaScriptAdapterConfig).enableSendToHost) {
                const error =
                    'sendToHost is not available. Please enable "Enable SendToHost" option in instance settings';
                sandbox.log(error, 'error');

                if (typeof callback === 'function') {
                    // leave it as a normal function and not as a lambda, to hide the "this" object
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
        sendToHostAsync: function (host: string, cmd: string, msg?: any): Promise<any> {
            return new Promise((resolve, reject) => {
                sandbox.sendToHost(host, cmd, msg, res => {
                    if (!res || res.error) {
                        reject(res ? new Error(res.error) : new Error('Unknown error'));
                    } else {
                        resolve(res);
                    }
                });
            });
        },
        registerNotification: function (msg: string, isAlert?: boolean): void {
            const category = !isAlert ? 'scriptMessage' : 'scriptAlert';

            if (sandbox.verbose) {
                sandbox.log(`registerNotification(msg=${msg}, category=${category})`, 'info');
            }

            adapter.registerNotification('javascript', category, msg);
        },
        setInterval: function (callback: (...args: any[]) => void, ms: number, ...args: any[]): NodeJS.Timeout | null {
            if (typeof callback === 'function') {
                const int: NodeJS.Timeout = setInterval(() => {
                    try {
                        callback.call(sandbox, ...args);
                    } catch (err: unknown) {
                        errorInCallback(err as Error);
                    }
                }, ms);
                script.intervals.push(int);

                if (sandbox.verbose) {
                    sandbox.log(`setInterval(ms=${ms})`, 'info');
                }
                return int;
            }
            sandbox.log(`Invalid callback for setInterval! - ${typeof callback}`, 'error');
            return null;
        },
        clearInterval: function (id: NodeJS.Timeout): void {
            const pos = script.intervals.indexOf(id);
            if (pos !== -1) {
                if (sandbox.verbose) {
                    sandbox.log('clearInterval() => cleared', 'info');
                }
                clearInterval(id);
                script.intervals.splice(pos, 1);
            } else {
                if (sandbox.verbose) {
                    sandbox.log('clearInterval() => not found', 'warn');
                }
            }
        },
        setTimeout: function (callback: (args?: any[]) => void, ms: number, ...args: any[]): NodeJS.Timeout | null {
            if (typeof callback === 'function') {
                const to = setTimeout(() => {
                    // Remove timeout from the list
                    const pos = script.timeouts.indexOf(to);
                    if (pos !== -1) {
                        script.timeouts.splice(pos, 1);
                    }

                    try {
                        callback.call(sandbox, ...args);
                    } catch (err: unknown) {
                        errorInCallback(err as Error);
                    }
                }, ms);
                if (sandbox.verbose) {
                    sandbox.log(`setTimeout(ms=${ms})`, 'info');
                }

                script.timeouts.push(to);
                return to;
            }
            sandbox.log(`Invalid callback for setTimeout! - ${typeof callback}`, 'error');
            return null;
        },
        clearTimeout: function (id: NodeJS.Timeout): void {
            const pos = script.timeouts.indexOf(id);
            if (pos !== -1) {
                if (sandbox.verbose) {
                    sandbox.log('clearTimeout() => cleared', 'info');
                }
                clearTimeout(id);
                script.timeouts.splice(pos, 1);
            } else {
                if (sandbox.verbose) {
                    sandbox.log('clearTimeout() => not found', 'warn');
                }
            }
        },
        setImmediate: function (callback: (..._args: any[]) => void, ...args: any[]): void {
            if (typeof callback === 'function') {
                setImmediate(() => {
                    try {
                        callback.apply(sandbox, args);
                    } catch (err: unknown) {
                        errorInCallback(err as Error);
                    }
                });
                if (sandbox.verbose) {
                    sandbox.log('setImmediate()', 'info');
                }
            } else {
                sandbox.log(`Invalid callback for setImmediate! - ${typeof callback}`, 'error');
            }
        },
        cb: function (callback: (..._args: any[]) => void): (...args: any[]) => void {
            return function (args: any[]) {
                if (context.scripts[name]?._id === sandbox._id) {
                    if (typeof callback === 'function') {
                        try {
                            callback.apply(sandbox, args);
                        } catch (err: unknown) {
                            errorInCallback(err as Error);
                        }
                    }
                } else {
                    sandbox.log(`Callback for old version of script: ${name}`, 'warn');
                }
            };
        },
        compareTime: function (
            startTime: iobJS.AstroDate | string | Date | number,
            endTime: iobJS.AstroDate | string | Date | number | null,
            operation: 'between' | 'not between' | '<' | '<=' | '>' | '>=' | '==' | '<>' | '!=',
            time?: iobJS.AstroDate | string | Date | number,
        ): boolean {
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
                    } else {
                        startTime = 0;
                    }
                }
            } else if (startTime && isObject(startTime) && (startTime as iobJS.AstroDate).astro) {
                const aTime = sandbox.getAstroDate(
                    (startTime as iobJS.AstroDate).astro,
                    (startTime as iobJS.AstroDate).date || new Date(),
                    (startTime as iobJS.AstroDate).offset || 0,
                );
                if (aTime) {
                    startTime = aTime.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                    });
                } else {
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
            } else if (endTime && isObject(endTime) && (endTime as iobJS.AstroDate).astro) {
                const aTime = sandbox.getAstroDate(
                    (endTime as iobJS.AstroDate).astro,
                    (endTime as iobJS.AstroDate).date || new Date(),
                    (endTime as iobJS.AstroDate).offset || 0,
                );
                endTime =
                    aTime?.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                    }) || 0;
            }

            // --- Convert "time" to number
            let nTime: number | undefined;
            // maybe it is astro date like 'sunrise' or 'sunset'
            if (time && typeof time === 'string') {
                const pos = consts.astroListLow.indexOf(time.toLowerCase());
                if (pos !== -1) {
                    nTime = sandbox.getAstroDate(consts.astroList[pos])?.getTime() || 0;
                }
            } else if (time && isObject(time) && (time as iobJS.AstroDate).astro) {
                nTime =
                    sandbox
                        .getAstroDate(
                            (time as iobJS.AstroDate).astro,
                            (time as iobJS.AstroDate).date || new Date(),
                            (time as iobJS.AstroDate).offset || 0,
                        )
                        ?.getTime() || 0;
            }

            let daily = true;
            if (time) {
                daily = false;
            }
            // if not astro date
            if (!nTime) {
                if (time && !isObject(time)) {
                    if (typeof time === 'string' && !time.includes(' ') && !time.includes('T')) {
                        const parts = time.split(':');
                        const oTime = new Date();
                        oTime.setHours(parseInt(parts[0], 10));
                        oTime.setMinutes(parseInt(parts[1], 10));
                        oTime.setMilliseconds(0);

                        if (parts.length === 3) {
                            oTime.setSeconds(parseInt(parts[2], 10));
                        } else {
                            oTime.setSeconds(0);
                        }
                        nTime = oTime.getTime();
                    } else {
                        nTime = new Date(time as string | number).getTime();
                    }
                } else if (!time) {
                    const oTime = new Date();
                    oTime.setMilliseconds(0);
                    nTime = oTime.getTime();
                } else {
                    // If Date
                    nTime = (time as Date).getTime();
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
                    } else {
                        startTime.setSeconds(0);
                    }
                } else {
                    daily = false;
                    startTime = new Date(startTime);
                }
            } else {
                daily = false;
                startTime = new Date(startTime as number | Date);
            }
            const nStartTime = startTime.getTime();

            let nEndTime: number | null;
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
                endTime = new Date(endTime as number | Date);
            } else {
                endTime = null;
            }

            if (endTime) {
                nEndTime = endTime.getTime();
            } else {
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
            sandbox.log(`Invalid operator: ${operation as string}`, 'warn');
            return false;
        },
        onStop: function (cb: () => void, timeout?: number): void {
            if (sandbox.verbose) {
                sandbox.log(`onStop(timeout=${timeout})`, 'info');
            }

            script.onStopCb = cb;
            script.onStopTimeout = timeout || 1000;
        },
        formatValue: function (value: number | string, decimals: number | string, format?: string): string {
            if (typeof decimals === 'string') {
                format = decimals;
                decimals = 0;
            }
            if (!format) {
                if (adapter.isFloatComma !== undefined) {
                    format = adapter.isFloatComma ? '.,' : ',.';
                } else if (objects['system.config'] && objects['system.config'].common) {
                    format = objects['system.config'].common.isFloatComma ? '.,' : ',.';
                }
            }
            return adapter.formatValue(value, decimals, format);
        },
        formatDate: function (
            date: Date | string | number | iobJS.AstroDate,
            format?: string,
            language?: ioBroker.Languages,
        ): string {
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
            // maybe it is astro date like 'sunrise' or 'sunset'
            if (date && typeof date === 'string') {
                const pos = consts.astroListLow.indexOf(date.toLowerCase());
                if (pos !== -1) {
                    date = sandbox.getAstroDate(consts.astroList[pos])?.getTime() || 0;
                }
            } else if (date && isObject(date) && (date as iobJS.AstroDate).astro) {
                date =
                    sandbox
                        .getAstroDate(
                            (date as iobJS.AstroDate).astro,
                            (date as iobJS.AstroDate).date || new Date(),
                            (date as iobJS.AstroDate).offset || 0,
                        )
                        ?.getTime() || 0;
            }

            if (format.match(/[WНOО]+/)) {
                let text: string = adapter.formatDate(date as Date | string | number, format);
                if (!language || !consts.dayOfWeeksFull[language]) {
                    language =
                        adapter.language ||
                        (objects['system.config'] &&
                            objects['system.config'].common &&
                            objects['system.config'].common.language) ||
                        'en';
                    if (!consts.dayOfWeeksFull[language as ioBroker.Languages]) {
                        language = 'en';
                    }
                }
                if (typeof date === 'number' || typeof date === 'string') {
                    date = new Date(date);
                } else if (typeof (date as Date).getMonth !== 'function') {
                    sandbox.log(`Invalid date object provided: ${JSON.stringify(date)}`, 'error');
                    return 'Invalid date';
                }
                const d: number = (date as Date).getDay();
                text = text.replace('НН', consts.dayOfWeeksFull[language as ioBroker.Languages][d]);
                let initialText = text;
                text = text.replace('WW', consts.dayOfWeeksFull[language as ioBroker.Languages][d]);

                if (initialText === text) {
                    text = text.replace('W', consts.dayOfWeeksShort[language as ioBroker.Languages][d]);
                }

                text = text.replace('Н', consts.dayOfWeeksShort[language as ioBroker.Languages][d]);
                text = text.replace('Н', consts.dayOfWeeksShort[language as ioBroker.Languages][d]);
                const m: number = (date as Date).getMonth();
                initialText = text;
                text = text.replace('OOO', consts.monthFullGen[language as ioBroker.Languages][m]);
                text = text.replace('ООО', consts.monthFullGen[language as ioBroker.Languages][m]);
                text = text.replace('OO', consts.monthFull[language as ioBroker.Languages][m]);
                text = text.replace('ОО', consts.monthFull[language as ioBroker.Languages][m]);

                if (initialText === text) {
                    text = text.replace('O', consts.monthShort[language as ioBroker.Languages][m]);
                }
                return text;
            }
            return adapter.formatDate(date as string | number | Date, format);
        },
        formatTimeDiff: function (diff: number, format?: string): string {
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

            if (/DD|TT|ДД|D|T|Д/.test(text)) {
                const days = Math.floor(diff / day);

                text = text.replace(/DD|TT|ДД/, days < 10 ? `0${days}` : days.toString());
                text = text.replace(/[DTД]/, days.toString());

                if (sandbox.verbose) {
                    sandbox.log(`formatTimeDiff(format=${format}, text=${text}, days=${days})`, 'debug');
                }

                diff -= days * day;
            }

            if (/hh|SS|чч|h|S|ч/.test(text)) {
                const hours = Math.floor(diff / hour);

                text = text.replace(/hh|SS|чч/, hours < 10 ? `0${hours}` : hours.toString());
                text = text.replace(/[hSч]/, hours.toString());

                sandbox.verbose &&
                    sandbox.log(`formatTimeDiff(format=${format}, text=${text}, hours=${hours})`, 'debug');

                diff -= hours * hour;
            }

            if (/mm|мм|m|м/.test(text)) {
                const minutes = Math.floor(diff / minute);

                text = text.replace(/mm|мм/, minutes < 10 ? `0${minutes}` : minutes.toString());
                text = text.replace(/[mм]/, minutes.toString());

                sandbox.verbose &&
                    sandbox.log(`formatTimeDiff(format=${format}, text=${text}, minutes=${minutes})`, 'debug');

                diff -= minutes * minute;
            }

            if (/ss|сс|мм|s|с/.test(text)) {
                const seconds = Math.floor(diff / second);

                text = text.replace(/ss|сс/, seconds < 10 ? `0${seconds}` : seconds.toString());
                text = text.replace(/[sс]/, seconds.toString());

                sandbox.verbose &&
                    sandbox.log(`formatTimeDiff(format=${format}, text=${text}, seconds=${seconds})`, 'debug');
                // diff -= seconds * second; // no milliseconds
            }

            if (sandbox.verbose) {
                sandbox.log(`formatTimeDiff(format=${format}, text=${text})`, 'debug');
            }

            return neg ? `-${text}` : text;
        },
        getDateObject: function (date: Date | number | string): Date {
            if (isObject(date)) {
                return date as Date;
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
            } else if (date.match(/^\d?\d:\d\d(:\d\d)?$/)) {
                // 20:00, 2:00, 20:00:00, 2:00:00
                const now = new Date();
                date = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${date}`;
            }

            return new Date(date);
        },
        writeFile: function (
            _adapter: string,
            fileName: string,
            data: string | Buffer | ((err: Error) => void),
            callback?: (err?: Error | null) => void,
        ): void {
            if (typeof data === 'function' || !data) {
                callback = data as (err?: Error | null) => void;
                data = fileName;
                fileName = _adapter;
                _adapter = '0_userdata.0';
            }
            _adapter = _adapter || '0_userdata.0';

            if (debug) {
                sandbox.log(
                    `writeFile(adapter=${_adapter}, fileName=${fileName}) - ${words._('was not executed, while debug mode is active')}`,
                    'warn',
                );
                if (typeof callback === 'function') {
                    setTimeout(function (): void {
                        try {
                            callback.call(sandbox);
                        } catch (err: unknown) {
                            errorInCallback(err as Error);
                        }
                    }, 0);
                }
            } else {
                if (sandbox.verbose) {
                    sandbox.log(`writeFile(adapter=${_adapter}, fileName=${fileName})`, 'info');
                }
                if (callback) {
                    adapter.writeFile(_adapter, fileName, data, callback);
                } else {
                    // @ts-expect-error should be fixed in js-controller
                    adapter.writeFile(_adapter, fileName, data);
                }
            }
        },
        readFile: function (
            _adapter: string,
            fileName: string | ((err: Error | null | undefined, data?: Buffer | string, mimeType?: string) => void),
            callback?: (err: Error | null | undefined, data?: Buffer | string, mimeType?: string) => void,
        ): void {
            if (typeof fileName === 'function') {
                callback = fileName as (
                    err: Error | null | undefined,
                    data?: Buffer | string,
                    mimeType?: string,
                ) => void;
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

            adapter.fileExists(_adapter, fileName, (error: Error | null | undefined, result?: boolean): void => {
                if (error) {
                    callback(error);
                } else if (!result) {
                    callback(new Error('Not exists'));
                } else {
                    adapter.readFile(_adapter, fileName, callback);
                }
            });
        },
        unlink: function (
            _adapter: string,
            fileName: string | ((err?: Error | null) => void),
            callback?: (err?: Error | null) => void,
        ): void {
            if (typeof fileName === 'function') {
                callback = fileName;
                fileName = _adapter;
                _adapter = '0_userdata.0';
            }
            _adapter = _adapter || '0_userdata.0';

            if (debug) {
                sandbox.log(
                    `unlink(adapter=${_adapter}, fileName=${fileName}) - ${words._('was not executed, while debug mode is active')}`,
                    'warn',
                );
                if (typeof callback === 'function') {
                    setTimeout(function (): void {
                        try {
                            callback.call(sandbox);
                        } catch (err: unknown) {
                            errorInCallback(err as Error);
                        }
                    }, 0);
                }
            } else {
                if (sandbox.verbose) {
                    sandbox.log(`unlink(adapter=${_adapter}, fileName=${fileName})`, 'info');
                }
                if (callback) {
                    adapter.unlink(_adapter, fileName, callback);
                } else {
                    // @ts-expect-error should be fixed in js-controller
                    adapter.unlink(_adapter, fileName);
                }
            }
        },
        delFile: function (
            _adapter: string,
            fileName: string | ((err?: Error | null) => void),
            callback?: (err?: Error | null) => void,
        ): void {
            return sandbox.unlink(_adapter, fileName as string, callback);
        },
        rename: function (_adapter: string, oldName: string, newName: string, callback?: (err?: Error | null) => void) {
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
                        } catch (err: unknown) {
                            errorInCallback(err as Error);
                        }
                    }, 0);
                }
            } else {
                sandbox.verbose &&
                    sandbox.log(`rename(adapter=${_adapter}, oldName=${oldName}, newName=${newName})`, 'info');
                if (callback) {
                    adapter.rename(_adapter, oldName, newName, callback);
                } else {
                    // @ts-expect-error should be fixed in js-controller
                    adapter.rename(_adapter, oldName, newName);
                }
            }
        },
        renameFile: function (
            _adapter: string,
            oldName: string,
            newName: string,
            callback?: (err?: Error | null) => void,
        ): void {
            return sandbox.rename(_adapter, oldName, newName, callback);
        },
        getHistory: function (
            instance: string | (ioBroker.GetHistoryOptions & { id: string; timeout?: number | string }),
            options:
                | (ioBroker.GetHistoryOptions & { id?: string; timeout?: number | string })
                | ((
                      error: Error | null,
                      result?: ioBroker.GetHistoryResult | null,
                      options?: ioBroker.GetHistoryOptions & { id: string; timeout?: number | string },
                      instance?: string,
                  ) => void),
            callback?: (
                error: Error | null,
                result?: ioBroker.GetHistoryResult | null,
                options?: ioBroker.GetHistoryOptions & { id: string; timeout?: number | string },
                instance?: string,
            ) => void,
        ): void {
            if (isObject(instance)) {
                callback = options as (
                    error: Error | null,
                    result?: ioBroker.GetHistoryResult | null,
                    options?: ioBroker.GetHistoryOptions & { id: string; timeout?: number | string },
                    instance?: string,
                ) => void;
                options = instance as ioBroker.GetHistoryOptions & { id?: string; timeout?: number | string };
                instance = '';
            }

            if (typeof callback !== 'function') {
                return sandbox.log('No callback found!', 'error');
            }
            if (!isObject(options)) {
                return sandbox.log('No options found!', 'error');
            }
            if (!(options as ioBroker.GetHistoryOptions & { id?: string; timeout?: number | string }).id) {
                return sandbox.log('No ID found!', 'error');
            }
            const timeoutMs =
                parseInt(
                    (options as ioBroker.GetHistoryOptions & { id?: string; timeout?: number })
                        ?.timeout as unknown as string,
                    10,
                ) || 20000;

            if (!instance) {
                // @ts-expect-error defaultHistory is private attribute of adapter. Fix later
                if (adapter.defaultHistory) {
                    // @ts-expect-error defaultHistory is private attribute of adapter. Fix later
                    instance = adapter.defaultHistory;
                } else {
                    instance = objects['system.config']?.common?.defaultHistory || null;
                }
            }

            if (sandbox.verbose) {
                sandbox.log(`getHistory(instance=${instance as string}, options=${JSON.stringify(options)})`, 'info');
            }

            if (!instance) {
                sandbox.log('No default history instance found!', 'error');
                try {
                    callback.call(sandbox, new Error('No default history instance found!'));
                } catch (err: unknown) {
                    errorInCallback(err as Error);
                }
                return;
            }
            if ((instance as string).startsWith('system.adapter.')) {
                instance = (instance as string).substring('system.adapter.'.length);
            }

            if (!objects[`system.adapter.${instance as string}`]) {
                sandbox.log(`Instance "${instance as string}" not found!`, 'error');
                try {
                    callback.call(sandbox, new Error(`Instance "${instance as string}" not found!`));
                } catch (err: unknown) {
                    errorInCallback(err as Error);
                }
                return;
            }

            let _timeout: NodeJS.Timeout | null = setTimeout(() => {
                _timeout = null;
                if (sandbox.verbose) {
                    sandbox.log('getHistory => timeout', 'debug');
                }

                if (typeof callback === 'function') {
                    try {
                        callback.call(
                            sandbox,
                            new Error('Timeout'),
                            null,
                            options as ioBroker.GetHistoryOptions & { id: string; timeout?: number | string },
                            instance as string,
                        );
                    } catch (err: unknown) {
                        errorInCallback(err as Error);
                    }
                    callback = undefined;
                }
            }, timeoutMs);

            adapter.sendTo(
                instance as string,
                'getHistory',
                {
                    id: (options as ioBroker.GetHistoryOptions & { id: string; timeout?: number | string }).id,
                    options,
                },
                (res: any): void => {
                    if (_timeout) {
                        clearTimeout(_timeout);
                        _timeout = null;
                    }
                    const result: {
                        error?: string;
                        result?: ioBroker.GetHistoryResult;
                        step?: number;
                        sessionId?: string;
                    } = res;

                    if (sandbox.verbose && result?.error) {
                        sandbox.log(`getHistory => ${result.error}`, 'error');
                    }
                    if (sandbox.verbose && result?.result) {
                        sandbox.log(`getHistory => ${result.result.length} items`, 'debug');
                    }

                    if (typeof callback === 'function') {
                        try {
                            callback.call(
                                sandbox,
                                result.error ? new Error(result.error) : null,
                                result.result,
                                options as ioBroker.GetHistoryOptions & { id: string; timeout?: number | string },
                                instance as string,
                            );
                        } catch (err: unknown) {
                            errorInCallback(err as Error);
                        }
                        callback = undefined;
                    }
                },
            );
        },
        runScript: function (scriptName: string, callback?: (err?: Error | null) => void): boolean {
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
                sandbox.log(
                    `runScript(scriptName=${scriptName}) - ${words._('was not executed, while debug mode is active')}`,
                    'warn',
                );
                typeof callback === 'function' && callback();
                return true;
            }
            if (objects[scriptName].common.enabled) {
                objects[scriptName].common.enabled = false;
                adapter.extendForeignObject(scriptName, { common: { enabled: false } }, (/* err, obj */) => {
                    adapter.extendForeignObject(
                        scriptName,
                        { common: { enabled: true } },
                        err => typeof callback === 'function' && callback(err),
                    );
                });
                return true;
            }
            adapter.extendForeignObject(
                scriptName,
                { common: { enabled: true } },
                err => typeof callback === 'function' && callback(err),
            );
            return true;
        },
        runScriptAsync: function (scriptName: string): Promise<void> {
            let done = false;
            return new Promise((resolve, reject) => {
                const result = sandbox.runScript(scriptName, err => {
                    if (err) {
                        reject(err);
                        done = true;
                    } else {
                        resolve();
                    }
                });
                if (result === false && !done) {
                    reject(new Error(`Script ${scriptName} was not found!`));
                }
            });
        },
        startScript: function (
            scriptName: string,
            ignoreIfStarted?: boolean | ((err: Error | null | undefined, started: boolean) => void),
            callback?: (err: Error | null | undefined, started: boolean) => void,
        ): boolean {
            if (typeof ignoreIfStarted === 'function') {
                callback = ignoreIfStarted as (err: Error | null | undefined, started: boolean) => void;
                ignoreIfStarted = false;
            }
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
                sandbox.log(
                    `startScript(scriptName=${scriptName}) - ${words._('was not executed, while debug mode is active')}`,
                    'warn',
                );
                typeof callback === 'function' && callback(null, false);
                return true;
            }
            if (objects[scriptName].common.enabled) {
                if (!ignoreIfStarted) {
                    objects[scriptName].common.enabled = false;
                    adapter.extendForeignObject(scriptName, { common: { enabled: false } }, () => {
                        adapter.extendForeignObject(
                            scriptName,
                            { common: { enabled: true } },
                            err => typeof callback === 'function' && callback(err, true),
                        );
                    });
                } else if (typeof callback === 'function') {
                    callback(null, false);
                }
                return true;
            }
            adapter.extendForeignObject(scriptName, { common: { enabled: true } }, err => {
                typeof callback === 'function' && callback(err, true);
            });
            return true;
        },
        startScriptAsync: function (scriptName: string, ignoreIfStarted?: boolean): Promise<boolean> {
            return new Promise((resolve, reject) => {
                const result = sandbox.startScript(
                    scriptName,
                    !!ignoreIfStarted,
                    (err: Error | null | undefined, started: boolean): void => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(started);
                        }
                    },
                );
                if (result === false) {
                    reject(new Error(`Script ${scriptName} was not found!`));
                }
            });
        },
        stopScript: function (
            scriptName: string,
            callback?: (err: Error | null | undefined, stopped: boolean) => void,
        ): boolean {
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
                sandbox.log(
                    `stopScript(scriptName=${scriptName}) - ${words._('was not executed, while debug mode is active')}`,
                    'warn',
                );
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
            } else if (typeof callback === 'function') {
                callback(null, false);
            }
            return true;
        },
        stopScriptAsync: function (scriptName: string): Promise<boolean> {
            return new Promise((resolve, reject) => {
                const result = sandbox.stopScript(
                    scriptName,
                    (err: Error | null | undefined, stopped: boolean): void => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(stopped);
                        }
                    },
                );
                if (result === false) {
                    reject(new Error(`Script ${scriptName} was not found!`));
                }
            });
        },
        isScriptActive: function (scriptName: string): boolean {
            if (!scriptName.match(/^script\.js\./)) {
                scriptName = `script.js.${scriptName}`;
            }
            if (!objects[scriptName] || !objects[scriptName].common) {
                sandbox.log('Script does not exist', 'error');
                return false;
            }
            return objects[scriptName].common.enabled;
        },
        startInstanceAsync: async function (instanceName: string): Promise<boolean> {
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
            } else {
                sandbox.log(`Cannot start instance "${instanceName}", because not found`, 'error');
            }

            return false;
        },
        restartInstanceAsync: async function (instanceName: string): Promise<boolean> {
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
            } else {
                sandbox.log(`Cannot restart instance "${instanceName}", because not found`, 'error');
            }

            return false;
        },
        stopInstanceAsync: async function (instanceName: string): Promise<boolean> {
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
            } else {
                sandbox.log(`Cannot stop instance "${instanceName}", because not found`, 'error');
            }

            return false;
        },
        // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
        toInt: function (val: boolean | string | number | 'true' | 'false'): number {
            if (val === true || val === 'true') {
                val = 1;
            }
            if (val === false || val === 'false') {
                val = 0;
            }
            val = parseInt(val as unknown as string) || 0;
            return val;
        },
        // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
        toFloat: function (val: boolean | string | number | 'true' | 'false'): number {
            if (val === true || val === 'true') {
                val = 1;
            }
            if (val === false || val === 'false') {
                val = 0;
            }
            val = parseFloat(val as unknown as string) || 0;
            return val;
        },
        // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
        toBoolean: function (val: boolean | string | number | 'true' | 'false'): boolean {
            if (val === '1' || val === 'true') {
                val = true;
            }
            if (val === '0' || val === 'false') {
                val = false;
            }
            return !!val;
        },
        getAttr: function (obj: string | Record<string, any>, path: string | string[]): any {
            if (typeof path === 'string') {
                path = path.split('.');
            }
            if (typeof obj === 'string') {
                try {
                    obj = JSON.parse(obj);
                } catch (err: unknown) {
                    adapter.setState(`scriptProblem.${name.substring('script.js.'.length)}`, {
                        val: true,
                        ack: true,
                        c: 'getAttr',
                    });
                    sandbox.log(`Cannot parse "${obj.substring(0, 30)}": ${err as Error}`, 'error');

                    return null;
                }
            }

            const attr: string = path.shift() || '';
            try {
                obj = (obj as Record<string, any>)[attr];
            } catch (err: unknown) {
                adapter.setState(`scriptProblem.${name.substring('script.js.'.length)}`, {
                    val: true,
                    ack: true,
                    c: 'getAttr',
                });
                sandbox.log(`Cannot get ${attr} of "${JSON.stringify(obj)}": ${err as Error}`, 'error');

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
        messageTo: function (
            target: string | { instance: string | null | number; script: string | null; message: string },
            data: any,
            options: { timeout?: number | string } | ((result: any, options: { timeout?: number | string }) => void),
            callback?: (result: any, options: { timeout?: number | string }, instance: string | number | null) => void,
        ) {
            const defaultTimeout = 5000;

            if (typeof target !== 'object') {
                target = { instance: null, script: null, message: target };
            }
            if (typeof options === 'function') {
                callback = options;
                options = { timeout: defaultTimeout };
            }

            let timeout: NodeJS.Timeout | null = null;
            if (typeof callback === 'function') {
                const timeoutDuration = parseInt(options?.timeout as unknown as string, 10) || defaultTimeout;

                timeout = setTimeout(() => {
                    timeout = null;

                    if (sandbox.verbose) {
                        sandbox.log(`messageTo => timeout: ${timeoutDuration}`, 'debug');
                    }

                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, { error: 'timeout' }, options, target.instance);
                        } catch (err: unknown) {
                            errorInCallback(err as Error);
                        }
                        callback = undefined;
                    }
                }, timeoutDuration);
            }
            let cbFunc: undefined | ((result: any) => void);
            if (timeout) {
                cbFunc = function (res: any) {
                    timeout && clearTimeout(timeout);
                    const result: { result?: any; error?: string | null } = res;

                    if (sandbox.verbose && result?.result) {
                        sandbox.log(`messageTo => ${JSON.stringify(result)}`, 'debug');
                    }
                    if (sandbox.verbose && result?.error) {
                        sandbox.log(`messageTo => ${result.error}`, 'error');
                    }

                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, result, options, target.instance);
                        } catch (err: unknown) {
                            errorInCallback(err as Error);
                        }
                        callback = undefined;
                    }
                };
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
                    cbFunc,
                );
            } else {
                // Send it to all instances
                context.adapter.getObjectView(
                    'system',
                    'instance',
                    { startkey: 'system.adapter.javascript.', endkey: 'system.adapter.javascript.\u9999' },
                    options,
                    (err: Error | null | undefined, res): void => {
                        if (err || !res) {
                            sandbox.log(`messageTo failed: ${err?.message}`, 'error');
                            return;
                        }
                        const len = 'system.adapter.'.length;
                        const instances = res.rows.map(item => item.id.substring(len));

                        instances.forEach(instance => {
                            adapter.sendTo(
                                instance,
                                'jsMessageBus',
                                { message: target.message, script: target.script, data },
                                cbFunc,
                            );
                        });
                    },
                );
            }
        },
        messageToAsync: function (
            target: string | { instance: string | null | number; script: string | null; message: string },
            data: any,
            options?: { timeout?: number | string },
        ): Promise<any> {
            return new Promise((resolve, reject) => {
                sandbox.messageTo(target, data, options, (res: any): void => {
                    const result: { error?: string } = res;
                    if (sandbox.verbose) {
                        sandbox.log(`messageTo result => ${JSON.stringify(res)}`, 'debug');
                    }
                    if (!res || result.error) {
                        reject(result ? new Error(result.error) : new Error('Unknown error'));
                    } else {
                        resolve(result);
                    }
                });
            });
        },
        onMessage: function (
            messageName: string,
            callback: (data: any, cb: (result: any) => void) => void,
        ): null | number {
            if (typeof callback !== 'function') {
                sandbox.log('onMessage callback is not a function', 'error');

                return null;
            }
            context.messageBusHandlers[sandbox.scriptName] = context.messageBusHandlers[sandbox.scriptName] || {};
            context.messageBusHandlers[sandbox.scriptName][messageName] =
                context.messageBusHandlers[sandbox.scriptName][messageName] || [];

            const handler = { id: Date.now() + Math.floor(Math.random() * 10000), cb: callback, sandbox };
            context.messageBusHandlers[sandbox.scriptName][messageName].push(handler);

            sandbox.__engine.__subscriptionsMessage += 1;

            if (
                sandbox.__engine.__subscriptionsMessage %
                    (adapter.config as JavaScriptAdapterConfig).maxTriggersPerScript ===
                0
            ) {
                sandbox.log(
                    `More than ${sandbox.__engine.__subscriptionsMessage} message subscriptions registered. Check your script!`,
                    'warn',
                );
            }

            return handler.id;
        },
        onMessageUnregister: function (idOrName: number | string): boolean {
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
            log: function (msg: string): void {
                sandbox.log(msg, 'info');
            },
            error: function (msg: string): void {
                sandbox.log(msg, 'error');
            },
            warn: function (msg: string): void {
                sandbox.log(msg, 'warn');
            },
            info: function (msg: string): void {
                sandbox.log(msg, 'info');
            },
            debug: function (msg: string): void {
                sandbox.log(msg, 'debug');
            },
        },
        jsonataExpression: function (data: any, expression: string): Promise<any> {
            return jsonata(expression).evaluate(data);
        },
        wait: function (ms: number): Promise<void> {
            return new Promise((resolve: () => void): void => {
                sandbox.setTimeout(resolve, ms);
            });
        },
        sleep: function (ms: number): Promise<void> {
            return sandbox.wait(ms);
        },
        onObject: function (
            pattern: string | string[],
            callback: (id: string, obj?: ioBroker.Object | null) => void,
        ): SubscribeObject | SubscribeObject[] | null {
            return sandbox.subscribeObject(pattern, callback);
        },
        subscribeObject: function (
            pattern: string | string[],
            callback: (id: string, obj?: ioBroker.Object | null) => void,
        ): SubscribeObject | SubscribeObject[] | null {
            if (Array.isArray(pattern)) {
                const result: {
                    name: string;
                    pattern: string;
                    callback: (id: string, obj?: ioBroker.Object | null) => void;
                }[] = [];
                for (let p = 0; p < pattern.length; p++) {
                    result.push(
                        sandbox.subscribeObject(pattern[p], callback) as {
                            name: string;
                            pattern: string;
                            callback: (id: string, obj?: ioBroker.Object | null) => void;
                        },
                    );
                }
                return result;
            }

            sandbox.__engine.__subscriptionsObject += 1;

            if (
                sandbox.__engine.__subscriptionsObject %
                    (adapter.config as JavaScriptAdapterConfig).maxTriggersPerScript ===
                0
            ) {
                sandbox.log(
                    `More than ${sandbox.__engine.__subscriptionsObject} object subscriptions registered. Check your script!`,
                    'warn',
                );
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

            const subs: SubscribeObject = { pattern, callback, name };
            if (sandbox.verbose) {
                sandbox.log(`subscribeObject: ${JSON.stringify(subs)}`, 'info');
            }

            adapter.subscribeForeignObjects(pattern);

            context.subscriptionsObject.push(subs);

            return subs;
        },
        unsubscribeObject: function (subObject: SubscribeObject | SubscribeObject[]): boolean | boolean[] {
            if (subObject && Array.isArray(subObject)) {
                const result: boolean[] = [];
                for (let t = 0; t < subObject.length; t++) {
                    result.push(sandbox.unsubscribeObject(subObject[t]) as boolean);
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
                    sandbox.__engine.__subscriptionsObject--;
                    return true;
                }
            }
            let deleted = 0;
            for (let i = context.subscriptionsObject.length - 1; i >= 0; i--) {
                if (
                    context.subscriptionsObject[i].name &&
                    context.subscriptionsObject[i].pattern === subObject.pattern
                ) {
                    deleted++;
                    adapter.unsubscribeForeignObjects(subObject.pattern);
                    context.subscriptionsObject.splice(i, 1);
                    sandbox.__engine.__subscriptionsObject--;
                }
            }
            return !!deleted;
        },
        // internal function to send the block debugging info to the front-end
        _sendToFrontEnd: function (blockId: string, data: any): void {
            if (context.rulesOpened === sandbox.scriptName) {
                adapter.setState(
                    'debug.rules',
                    JSON.stringify({ ruleId: sandbox.scriptName, blockId, data, ts: Date.now() }),
                    true,
                );
            }
        },
        existsStateAsync: function (_id: string): Promise<boolean> {
            return Promise.reject(new Error('Not implemented'));
        },
        existsObjectAsync: function (_id: string): Promise<boolean> {
            return Promise.reject(new Error('Not implemented'));
        },
        getObjectAsync: function (_id: string, _enumName: null | string): Promise<ioBroker.Object | null | undefined> {
            return Promise.reject(new Error('Not implemented'));
        },
        setObjectAsync: function (_id: string, _obj: ioBroker.Object): Promise<{ id: string }> {
            return Promise.reject(new Error('Not implemented'));
        },
        extendObjectAsync: function (_id: string, _obj: Partial<ioBroker.Object>): Promise<{ id: string }> {
            return Promise.reject(new Error('Not implemented'));
        },
        deleteObjectAsync: function (_id: string, _isRecursive?: boolean): Promise<void> {
            return Promise.reject(new Error('Not implemented'));
        },
        createStateAsync: function (
            _name: string,
            _initValue: undefined | ioBroker.StateValue | ioBroker.State,
            _forceCreation:
                | boolean
                | undefined
                | Record<string, any>
                | Partial<ioBroker.StateCommon>
                | ((err: Error | null) => void),
            _common?: Partial<ioBroker.StateCommon> | ((err: Error | null) => void),
            _native?: Record<string, any> | ((err: Error | null) => void),
        ): Promise<string> {
            return Promise.reject(new Error('Not implemented'));
        },
        createAliasAsync: function (
            _name: string,
            _alias: string | CommonAlias,
            _forceCreation: boolean | Partial<ioBroker.StateCommon> | undefined,
            _common?: Partial<ioBroker.StateCommon> | Record<string, any>,
            _native?: Record<string, any>,
        ): Promise<void> {
            return Promise.reject(new Error('Not implemented'));
        },
        deleteStateAsync: function (_id: string): Promise<boolean> {
            return Promise.reject(new Error('Not implemented'));
        },
        writeFileAsync: function (
            _adapter: string,
            _fileName: string | Buffer,
            _data?: string | Buffer,
        ): Promise<void> {
            return Promise.reject(new Error('Not implemented'));
        },
        readFileAsync: function (_adapter: string, _fileName?: string): Promise<Buffer | string> {
            return Promise.reject(new Error('Not implemented'));
        },
        unlinkAsync: function (_adapter: string, _fileName?: string): Promise<void> {
            return Promise.reject(new Error('Not implemented'));
        },
        delFileAsync: function (_adapter: string, _fileName?: string): Promise<void> {
            return Promise.reject(new Error('Not implemented'));
        },
        renameAsync: function (_adapter: string, _oldName: string, _newName?: string): Promise<void> {
            return Promise.reject(new Error('Not implemented'));
        },
        renameFileAsync: function (_adapter: string, _oldName: string, _newName?: string): Promise<void> {
            return Promise.reject(new Error('Not implemented'));
        },
        getHistoryAsync: function (
            _instance: string | (ioBroker.GetHistoryOptions & { id: string; timeout?: number | string }),
            _options?: ioBroker.GetHistoryOptions & { id?: string; timeout?: number | string },
        ): Promise<ioBroker.GetHistoryResult> {
            return Promise.reject(new Error('Not implemented'));
        },
        httpGetAsync: function (
            _url: string,
            _options?: {
                timeout?: number;
                responseType?: ResponseType;
                headers?: Record<string, string>;
                basicAuth?: { user: string; password: string } | null;
                bearerAuth?: string;
                validateCertificate?: boolean;
            },
        ): Promise<{
            statusCode: number | null;
            data: any;
            headers: Record<string, string>;
            responseTime: number;
        }> {
            return Promise.reject(new Error('Not implemented'));
        },
        httpPostAsync: function (
            _url: string,
            _data: any,
            _options: {
                timeout?: number;
                responseType?: ResponseType;
                headers?: Record<string, string>;
                basicAuth?: { user: string; password: string } | null;
                bearerAuth?: string;
                validateCertificate?: boolean;
            },
        ): Promise<{
            statusCode: number | null;
            data: any;
            headers: Record<string, AxiosHeaderValue | undefined>;
            responseTime: number;
        }> {
            return Promise.reject(new Error('Not implemented'));
        },
    };

    // Create advanced functions that can modify objects
    if ((adapter.config as JavaScriptAdapterConfig).enableSetObject) {
        sandbox.setObject = function (
            id: string,
            obj: ioBroker.Object,
            callback?: (err?: Error | null, res?: { id: string }) => void,
        ): void {
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
                        } catch (err: unknown) {
                            errorInCallback(err as Error);
                        }
                    });
                }
            } else {
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
                        } catch (err: unknown) {
                            errorInCallback(err as Error);
                        }
                    }
                });
            }
        };
        sandbox.extendObject = function (
            id: string,
            obj: Partial<ioBroker.Object>,
            callback?: (err: Error | undefined | null, res?: { id: string }) => void,
        ): void {
            if (debug) {
                sandbox.log(
                    `extendObject(id=${id}, obj=${JSON.stringify(obj)}) - ${words._('was not executed, while debug mode is active')}`,
                    'warn',
                );
                if (typeof callback === 'function') {
                    setTimeout(function () {
                        try {
                            callback.call(sandbox, null, { id });
                        } catch (err: unknown) {
                            errorInCallback(err as Error);
                        }
                    }, 0);
                }
            } else {
                if (sandbox.verbose) {
                    sandbox.log(`extendObject(id=${id}, obj=${JSON.stringify(obj)})`, 'info');
                }
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
                        } catch (err: unknown) {
                            errorInCallback(err as Error);
                        }
                    }, 0);
                }
            } else {
                if (sandbox.verbose) {
                    sandbox.log(`deleteObject(id=${id})`, 'info');
                }
                adapter.delForeignObject(id, { recursive: isRecursive }, callback);
            }
        };
    }

    // promisify methods on the sandbox
    sandbox.existsStateAsync = promisify(sandbox.existsState);
    sandbox.existsObjectAsync = promisify(sandbox.existsObject);
    sandbox.getObjectAsync = promisify(sandbox.getObject);
    sandbox.setObjectAsync = promisify(sandbox.setObject);
    sandbox.extendObjectAsync = promisify(sandbox.extendObject);
    sandbox.deleteObjectAsync = promisify(sandbox.deleteObject);
    sandbox.createStateAsync = promisify(sandbox.createState);
    sandbox.createAliasAsync = promisify(sandbox.createAlias);
    sandbox.deleteStateAsync = promisify(sandbox.deleteState);
    sandbox.writeFileAsync = promisify(sandbox.writeFile);
    sandbox.readFileAsync = promisify(sandbox.readFile);
    sandbox.unlinkAsync = promisify(sandbox.unlink);
    sandbox.delFileAsync = promisify(sandbox.delFile);
    sandbox.renameAsync = promisify(sandbox.rename);
    sandbox.renameFileAsync = promisify(sandbox.renameFile);
    sandbox.getHistoryAsync = promisify(sandbox.getHistory);
    sandbox.httpGetAsync = promisify(sandbox.httpGet);
    sandbox.httpPostAsync = promisify(sandbox.httpPost);

    // Make all predefined properties and methods readonly so scripts cannot overwrite them
    for (const prop of Object.keys(sandbox)) {
        Object.defineProperty(sandbox, prop, {
            configurable: false,
            writable: false,
        });
    }

    return sandbox;
}