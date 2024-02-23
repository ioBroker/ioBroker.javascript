/*
 * Javascript adapter
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2014-2024 bluefox <dogafox@gmail.com>,
 *
 * Copyright (c) 2014      hobbyquaker
*/

/* jshint -W097 */
/* jshint -W083 */
/* jshint strict: false */
/* jslint node: true */
/* jshint shadow: true */
'use strict';

const vm            = require('node:vm');
const nodeFS        = require('node:fs');
const nodePath      = require('node:path');
const tsc           = require('virtual-tsc');
const Mirror        = require('./lib/mirror');
const fork          = require('child_process').fork;

const mods = {
    fs:               {},
    dgram:            require('node:dgram'),
    crypto:           require('node:crypto'),
    dns:              require('node:dns'),
    events:           require('node:events'),
    http:             require('node:http'),
    https:            require('node:https'),
    http2:            require('node:http2'),
    net:              require('node:net'),
    os:               require('node:os'),
    path:             require('node:path'),
    util:             require('node:util'),
    child_process:    require('node:child_process'),
    stream:           require('node:stream'),
    url:              require('node:url'),
    zlib:             require('node:zlib'),
    suncalc:          require('suncalc2'),
    axios:            require('axios'),
    request:          require('./lib/request'), // deprecated
    wake_on_lan:      require('wake_on_lan'),
    nodeSchedule:     require('node-schedule')
};

/**
 * List of forbidden Locations for a mirror directory
 * relative to the default data directory
 * ATTENTION: the same list is also located in index_m.html!!
 * @type {*[]}
 */
const forbiddenMirrorLocations = [
    'backup-objects',
    'files',
    'backitup',
    '../backups',
    '../node_modules',
    '../log'
];

const utils     = require('@iobroker/adapter-core'); // Get common adapter utils
const words     = require('./lib/words');
const sandBox   = require('./lib/sandbox');
const eventObj  = require('./lib/eventObj');
const Scheduler = require('./lib/scheduler');
const { targetTsLib, tsCompilerOptions, jsDeclarationCompilerOptions } = require('./lib/typescriptSettings');
const { hashSource, isObject } = require('./lib/tools');
const { isDeepStrictEqual } = require('node:util');
const {
    resolveTypescriptLibs,
    resolveTypings,
    scriptIdToTSFilename,
    transformScriptBeforeCompilation,
    transformGlobalDeclarations
} = require('./lib/typescriptTools');

const packageJson = require('./package.json');
const SCRIPT_CODE_MARKER = 'script.js.';

const stopCounters =  {};
let setStateCountCheckInterval = null;

let webstormDebug;
let debugMode;
if (process.argv) {
    for (let a = 1; a < process.argv.length; a++) {
        if (process.argv[a].startsWith('--webstorm')) {
            webstormDebug = process.argv[a].replace(/^(.*?=\s*)/, '');
        }
        if (process.argv[a] === '--debugScript') {
            if (!process.argv[a + 1]) {
                console.log('No script name provided');
                process.exit(300);
            } else {
                debugMode = process.argv[a + 1];
            }
        }
    }
}

const isCI = !!process.env.CI;

// ambient declarations for typescript
/** @type {Record<string, string>} */
let tsAmbient;

// TypeScript's scripts are only recompiled if their source hash changes. If an adapter update fixes compilation bugs,
// a user won't notice until he changes and re-saves the script. To avoid that, we also include the
// adapter version and TypeScript version in the hash
const tsSourceHashBase = `versions:adapter=${packageJson.version},typescript=${packageJson.dependencies.typescript}`;

let mirror;

/** @type {boolean} if logs are subscribed or not */
let logSubscribed;

/**
 * @param {string} scriptID - The current script the declarations were generated from
 * @param {string} declarations
 */
function provideDeclarationsForGlobalScript(scriptID, declarations) {
    // Remember which declarations this global script had access to,
    // we need this so the editor doesn't show a duplicate identifier error
    if (globalDeclarations != null && globalDeclarations !== '') {
        knownGlobalDeclarationsByScript[scriptID] = globalDeclarations;
    }
    // and concatenate the global declarations for the next scripts
    globalDeclarations += declarations + '\n';
    // remember all previously generated global declarations,
    // so global scripts can reference each other
    const globalDeclarationPath = 'global.d.ts';
    tsAmbient[globalDeclarationPath] = globalDeclarations;
    // make sure the next script compilation has access to the updated declarations
    tsServer.provideAmbientDeclarations({
        [globalDeclarationPath]: globalDeclarations
    });
    jsDeclarationServer.provideAmbientDeclarations({
        [globalDeclarationPath]: globalDeclarations
    });
}

// taken from here: https://stackoverflow.com/questions/11887934/how-to-check-if-dst-daylight-saving-time-is-in-effect-and-if-so-the-offset
function dstOffsetAtDate(dateInput) {
    const fullYear = dateInput.getFullYear() | 0;
    // "Leap Years are any year that can be exactly divided by 4 (2012, 2016, etc)
    //   except if it can be exactly divided by 100, then it isn't (2100, 2200, etc)
    //    except if it can be exactly divided by 400, then it is (2000, 2400)"
    // (https://www.mathsisfun.com/leap-years.html).
    const isLeapYear = ((fullYear & 3) | (fullYear/100 & 3)) === 0 ? 1 : 0;
    // (fullYear & 3) = (fullYear % 4), but faster
    //Alternative:var isLeapYear=(new Date(currentYear,1,29,12)).getDate()===29?1:0
    const fullMonth = dateInput.getMonth() | 0;
    return (
        // 1. We know what the time since the Epoch really is
        (+dateInput) // same as the dateInput.getTime() method
        // 2. We know what the time since the Epoch at the start of the year is
        - (+new Date(fullYear, 0)) // day defaults to 1 if not explicitly zeroed
        // 3. Now, subtract what we would expect the time to be if daylight savings
        //      did not exist. This yields the time-offset due to daylight savings.
        - ((
            ((
                // Calculate the day of the year in the Gregorian calendar
                // The code below works based upon the facts of signed right shifts
                //    • (x) >> n: shifts n and fills in the n highest bits with 0s
                //    • (-x) >> n: shifts n and fills in the n highest bits with 1s
                // (This assumes that x is a positive integer)
                -1 + // first day in the year is day 1
                (31 & ((-fullMonth) >> 4)) + // January // (-11)>>4 = -1
                ((28 + isLeapYear) & ((1 - fullMonth) >> 4)) + // February
                (31 & ((2 - fullMonth) >> 4)) + // March
                (30 & ((3 - fullMonth) >> 4)) + // April
                (31 & ((4 - fullMonth) >> 4)) + // May
                (30 & ((5 - fullMonth) >> 4)) + // June
                (31 & ((6 - fullMonth) >> 4)) + // July
                (31 & ((7 - fullMonth) >> 4)) + // August
                (30 & ((8 - fullMonth) >> 4)) + // September
                (31 & ((9 - fullMonth) >> 4)) + // October
                (30 & ((10 - fullMonth) >> 4)) + // November
                // There are no months past December: the year rolls into the next.
                // Thus, fullMonth is 0-based, so it will never be 12 in Javascript

                (dateInput.getDate() | 0) // get day of the month

            ) & 0xffff) * 24 * 60 // 24 hours in a day, 60 minutes in an hour
            + (dateInput.getHours() & 0xff) * 60 // 60 minutes in an hour
            + (dateInput.getMinutes() & 0xff)
        )|0) * 60 * 1000 // 60 seconds in a minute * 1000 milliseconds in a second
        - (dateInput.getSeconds() & 0xff) * 1000 // 1000 milliseconds in a second
        - dateInput.getMilliseconds()
    );
}

function loadTypeScriptDeclarations() {
    // try to load the typings on disk for all 3rd party modules
    const packages = [
        'node', // this provides auto-completion for most builtins
        'request', // preloaded by the adapter
    ];
    // Also include user-selected libraries (but only those that are also installed)
    if (
        adapter.config
        && typeof adapter.config.libraries === 'string'
        && typeof adapter.config.libraryTypings === 'string'
    ) {
        const installedLibs = adapter.config.libraries
            .split(/[,;\s]+/)
            .map((s) => s.trim().split('@')[0])
            .filter((s) => !!s);

        const wantsTypings = adapter.config.libraryTypings.split(/[,;\s]+/).map(s => s.trim()).filter(s => !!s);
        // Add all installed libraries the user has requested typings for to the list of packages
        for (const lib of installedLibs) {
            if (wantsTypings.includes(lib) && !packages.includes(lib)) {
                packages.push(lib);
            }
        }
        // Some packages have sub-modules (e.g. rxjs/operators) that are not exposed through the main entry point
        // If typings are requested for them, also add them if the base module is installed
        for (const lib of wantsTypings) {
            // Extract the package name and check if we need to add it
            if (!lib.includes('/')) {
                continue;
            }
            const pkgName = lib.substr(0, lib.indexOf('/'));

            if (installedLibs.includes(pkgName) && !packages.includes(lib)) {
                packages.push(lib);
            }
        }
    }
    for (const pkg of packages) {
        let pkgTypings = resolveTypings(
            pkg,
            // node needs ambient typings, so we don't wrap it in declare module
            pkg !== 'node'
        );
        if (!pkgTypings) {
            // Create empty dummy declarations so users don't get the "not found" error
            // for installed packages
            pkgTypings = {
                [`node_modules/@types/${pkg}/index.d.ts`]: `declare module "${pkg}";`,
            };
        }
        adapter.log.debug(`Loaded TypeScript definitions for ${pkg}: ${JSON.stringify(Object.keys(pkgTypings))}`);
        // remember the declarations for the editor
        Object.assign(tsAmbient, pkgTypings);
        // and give the language servers access to them
        tsServer.provideAmbientDeclarations(pkgTypings);
        jsDeclarationServer.provideAmbientDeclarations(pkgTypings);
    }
}

const context = {
    mods,
    objects:             {},
    states:              {},
    interimStateValues:  {},
    stateIds:            [],
    errorLogFunction:    null,
    subscriptions:       [],
    subscriptionsFile:   [],
    subscriptionsObject: [],
    subscribedPatterns:  {},
    subscribedPatternsFile:  {},
    adapterSubs:         {},
    cacheObjectEnums:    {},
    isEnums:             false, // If some subscription wants enum
    channels:            null,
    devices:             null,
    logWithLineInfo:     null,
    scheduler:           null,
    timers:              {},
    enums:               [],
    timerId:             0,
    names:               {},
    scripts:             {},
    messageBusHandlers:  {},
    logSubscriptions:    {},
    folderCreationVerifiedObjects: {},
    updateLogSubscriptions,
    convertBackStringifiedValues,
    updateObjectContext,
    prepareStateObject,
    debugMode,
    timeSettings:        {
        format12:        false,
        leadingZeros:    true
    },
    rulesOpened:         null, //opened rules
};

const regExGlobalOld = /_global$/;
const regExGlobalNew = /script\.js\.global\./;

function checkIsGlobal(obj) {
    return obj && obj.common && (regExGlobalOld.test(obj.common.name) || regExGlobalNew.test(obj._id));
}

function convertBackStringifiedValues(id, state) {
    if (state && typeof state.val === 'string' &&
        context.objects[id] && context.objects[id].common &&
        (context.objects[id].common.type === 'array' || context.objects[id].common.type === 'object')) {
        try {
            state.val = JSON.parse(state.val);
        } catch (err) {
            if (id.startsWith('javascript.') || id.startsWith('0_userdata.0')) {
                adapter.log.info(`Could not parse value for id ${id} into ${context.objects[id].common.type}: ${err.message}`);
            } else {
                adapter.log.debug(`Could not parse value for id ${id} into ${context.objects[id].common.type}: ${err.message}`);
            }
        }
    }
    return state;
}

function prepareStateObject(id, state, isAck) {
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

    if (adapter.config.subscribe) {
        return state;
    }
    // set other values to have a full state object
    // mirrors logic from statesInRedis
    if (state.ts === undefined) {
        state.ts = Date.now();
    }

    if (state.q === undefined) {
        state.q = 0;
    }

    state.from =
        typeof state.from === 'string' && state.from !== '' ? state.from : `system.adapter.${adapter.namespace}`;

    if (state.lc === undefined) {
        const formerStateValue = context.interimStateValues[id] || context.states[id];
        if (!formerStateValue) {
            state.lc = state.ts;
        } else {
            // isDeepStrictEqual works on objects and primitive values
            const hasChanged = !isDeepStrictEqual(formerStateValue.val, state.val);
            if (!formerStateValue.lc || hasChanged) {
                state.lc = state.ts;
            } else {
                state.lc = formerStateValue.lc;
            }
        }
    }

    return state;
}

function fileMatching(sub, id, fileName) {
    if (sub.idRegEx) {
        if (!sub.idRegEx.test(id)) {
            return false;
        }
    } else {
        if (sub.id !== id) {
            return false;
        }
    }
    if (sub.fileRegEx) {
        if (!sub.fileRegEx.test(fileName)) {
            return false;
        }
    } else {
        if (sub.fileNamePattern !== fileName) {
            return false;
        }
    }

    return true;
}

/**
 * @type {Set<string>}
 * Stores the IDs of script objects whose change should be ignored because
 * the compiled source was just updated
 */
const ignoreObjectChange = new Set();

let objectsInitDone = false;
let statesInitDone = false;

/** @type {ioBroker.Adapter} */
let adapter;

function startAdapter(options) {
    options = options || {};
    Object.assign(options, {
        name: 'javascript',
        useFormatDate: true, // load float formatting

        /**
         * @param id { string }
         * @param obj { ioBroker.Object }
         */
        objectChange: (id, obj) => {
            // Check if we should ignore this change (once!) because we just updated the compiled sources
            if (ignoreObjectChange.has(id)) {
                // Update the cached script object and do nothing more
                context.objects[id] = obj;
                ignoreObjectChange.delete(id);
                return;
            }

            // When still in initializing: already remember current values,
            // but data structures are initialized elsewhere
            if (!objectsInitDone) {
                if (obj) {
                    context.objects[id] = obj;
                }
                return;
            }


            if (id.startsWith('enum.')) {
                // clear cache
                context.cacheObjectEnums = {};

                // update context.enums array
                if (obj) {
                    // If new
                    if (!context.enums.includes(id)) {
                        context.enums.push(id);
                        context.enums.sort();
                    }
                } else {
                    const pos = context.enums.indexOf(id);
                    // if deleted
                    if (pos !== -1) {
                        context.enums.splice(pos, 1);
                    }
                }
            }

            if (obj && id === 'system.config') {
                // set language for debug messages
                if (obj.common && obj.common.language) {
                    words.setLanguage(obj.common.language);
                }
            }

            // update stored time format for variables.dayTime
            if (id === adapter.namespace + '.variables.dayTime' && obj && obj.native) {
                context.timeSettings.format12 = obj.native.format12 || false;
                context.timeSettings.leadingZeros = obj.native.leadingZeros === undefined ? true : obj.native.leadingZeros;
            }

            // send changes to disk mirror
            mirror && mirror.onObjectChange(id, obj);

            const formerObj = context.objects[id];

            updateObjectContext(id, obj); // Update all Meta object data

            // for alias object changes on state objects we need to manually update the
            // state cache value because new value is only published on next change
            if (obj && obj.type === 'state' && id.startsWith('alias.0.')) {
                adapter.getForeignState(id, (err, state) => {
                    if (err) {
                        return;
                    }
                    if (state) {
                        context.states[id] = state;
                    } else if (context.states[id] !== undefined) {
                        delete context.states[id];
                    }
                });
            }

            context.subscriptionsObject.forEach(sub => {
                // ToDo: implement comparing with id.0.* too
                if (sub.pattern === id) {
                    try {
                        sub.callback(id, obj);
                    } catch (err) {
                        adapter.log.error(`Error in callback: ${err}`);
                    }
                }
            });

            // handle Script object updates
            if (!obj && formerObj && formerObj.type === 'script') {
                // Object Deleted just now
                if (checkIsGlobal(formerObj)) {
                    // it was a global Script, and it was enabled and is now deleted => restart adapter
                    if (formerObj.enabled) {
                        adapter.log.info(`Active global Script ${id} deleted. Restart instance.`);
                        adapter.restart();
                    }
                } else if (formerObj.common && formerObj.common.engine === `system.adapter.${adapter.namespace}`) {
                    // It was a non-global Script and deleted => stop and remove it
                    stop(id);

                    // delete scriptEnabled.blabla variable
                    const idActive = 'scriptEnabled.' + id.substring(SCRIPT_CODE_MARKER.length);
                    adapter.delObject(idActive);
                    adapter.delState(idActive);

                    // delete scriptProblem.blabla variable
                    const idProblem = 'scriptProblem.' + id.substring(SCRIPT_CODE_MARKER.length);
                    adapter.delObject(idProblem);
                    adapter.delState(idProblem);
                }
            } else if (!formerObj && obj && obj.type === 'script') {
                // New script that does not exist before
                if (checkIsGlobal(obj)) {
                    // new global script added => restart adapter
                    if (obj.common.enabled) {
                        adapter.log.info(`Active global Script ${id} created. Restart instance.`);
                        adapter.restart();
                    }
                } else if (obj.common && obj.common.engine === `system.adapter.${adapter.namespace}`) {
                    // new non-global script - create states for scripts
                    createActiveObject(id, obj.common.enabled, () => createProblemObject(id));
                    if (obj.common.enabled) {
                        // if enabled => Start script
                        load(id);
                    }
                }
            } else if (obj && obj.type === 'script' && formerObj && formerObj.common) {
                // Script changed ...
                if (checkIsGlobal(obj)) {
                    if (obj.common.enabled || formerObj.common.enabled) {
                        adapter.log.info(`Global Script ${id} updated. Restart instance.`);
                        adapter.restart();
                    }
                } else { // No global script
                    if (obj.common && obj.common.engine === 'system.adapter.' + adapter.namespace) {
                        // create states for scripts
                        createActiveObject(id, obj.common.enabled, () => createProblemObject(id));
                    }

                    if ((formerObj.common.enabled && !obj.common.enabled) ||
                        (formerObj.common.engine === 'system.adapter.' + adapter.namespace && obj.common.engine !== 'system.adapter.' + adapter.namespace)) {

                        // Script disabled
                        if (formerObj.common.enabled && formerObj.common.engine === 'system.adapter.' + adapter.namespace) {
                            // Remove it from executing
                            stop(id);
                        }
                    } else if ((!formerObj.common.enabled && obj.common.enabled) ||
                        (formerObj.common.engine !== 'system.adapter.' + adapter.namespace && obj.common.engine === 'system.adapter.' + adapter.namespace)) {
                        // Script enabled

                        if (obj.common.enabled && obj.common.engine === 'system.adapter.' + adapter.namespace) {
                            // Start script
                            load(id);
                        }
                    } else { //if (obj.common.source !== formerObj.common.source) {
                        // Source changed => restart it
                        stopCounters[id] = stopCounters[id] ? stopCounters[id] + 1 : 1;
                        stop(id, (res, _id) =>
                            // only start again after stop when "last" object change to prevent problems on
                            // multiple changes in fast frequency
                            !--stopCounters[id] && load(_id));
                    }
                }
            }
        },

        stateChange: (id, state) => {
            if (context.interimStateValues[id] !== undefined) {
                // any update invalidates the remembered interim value
                delete context.interimStateValues[id];
            }
            if (!id || id.startsWith('messagebox.') || id.startsWith('log.')) {
                return;
            }

            if (id === `${adapter.namespace}.debug.to` && state && !state.ack) {
                return !debugMode && debugSendToInspector(state.val);
            }

            // When still in initializing: already remember current values,
            // but data structures are initialized elsewhere
            if (!statesInitDone) {
                if (state) {
                    context.states[id] = state;
                }
                return;
            }

            const oldState = context.states[id];
            if (state) {
                if (oldState) {
                    // enable or disable script
                    if (!state.ack && id.startsWith(activeStr) && context.objects[id] && context.objects[id].native && context.objects[id].native.script) {
                        adapter.extendForeignObject(context.objects[id].native.script, { common: { enabled: state.val } });
                    }

                    // monitor if adapter is alive and send all subscriptions once more, after adapter goes online
                    if (/*oldState && */oldState.val === false && state.val && id.endsWith('.alive')) {
                        if (context.adapterSubs[id]) {
                            const parts = id.split('.');
                            const a = parts[2] + '.' + parts[3];
                            for (let t = 0; t < context.adapterSubs[id].length; t++) {
                                adapter.log.info(`Detected coming adapter "${a}". Send subscribe: ${context.adapterSubs[id][t]}`);
                                adapter.sendTo(a, 'subscribe', context.adapterSubs[id][t]);
                            }
                        }
                    }
                } else if (/*!oldState && */!context.stateIds.includes(id)) {
                    context.stateIds.push(id);
                    context.stateIds.sort();
                }
                context.states[id] = state;
            } else {
                if (oldState) delete context.states[id];
                state = {};
                const pos = context.stateIds.indexOf(id);
                if (pos !== -1) {
                    context.stateIds.splice(pos, 1);
                }
            }
            const _eventObj = eventObj.createEventObject(context, id, context.convertBackStringifiedValues(id, state), context.convertBackStringifiedValues(id, oldState));

            // if this state matches any subscriptions
            for (let i = 0, l = context.subscriptions.length; i < l; i++) {
                const sub = context.subscriptions[i];
                if (sub && patternMatching(_eventObj, sub.patternCompareFunctions)) {
                    try {
                        sub.callback(_eventObj);
                    } catch (err) {
                        adapter.log.error(`Error in callback: ${err}`);
                    }
                }
            }
        },

        fileChange: (id, fileName, size) => {
            // if this file matches any subscriptions
            for (let i = 0, l = context.subscriptionsFile.length; i < l; i++) {
                const sub = context.subscriptionsFile[i];
                if (sub && fileMatching(sub, id, fileName)) {
                    try {
                        sub.callback(id, fileName, size, sub.withFile);
                    } catch (err) {
                        adapter.log.error(`Error in callback: ${err}`);
                    }
                }
            }
        },

        unload: callback => {
            debugStop()
                .then(() => {
                    stopTimeSchedules();
                    setStateCountCheckInterval && clearInterval(setStateCountCheckInterval);
                    stopAllScripts(callback);
                });
        },

        ready: () => {
            mods.request.setLogger(adapter.log);

            adapter.config.maxSetStatePerMinute = parseInt(adapter.config.maxSetStatePerMinute, 10) || 1000;
            if (adapter.supportsFeature && adapter.supportsFeature('PLUGINS')) {
                const sentryInstance = adapter.getPluginInstance('sentry');
                if (sentryInstance) {
                    const Sentry = sentryInstance.getSentryObject();
                    if (Sentry) {
                        Sentry.configureScope(scope => {
                            scope.addEventProcessor((event, _hint) => {
                                if (event.exception && event.exception.values && event.exception.values[0]) {
                                    const eventData = event.exception.values[0];
                                    if (eventData.stacktrace && eventData.stacktrace.frames && Array.isArray(eventData.stacktrace.frames) && eventData.stacktrace.frames.length) {
                                        // Exclude event if script Marker is included
                                        if (eventData.stacktrace.frames.find(frame => frame.filename && frame.filename.includes(SCRIPT_CODE_MARKER))) {
                                            return null;
                                        }
                                        //Exclude event if own directory is included but not inside own node_modules
                                        const ownNodeModulesDir = nodePath.join(__dirname, 'node_modules');
                                        if (!eventData.stacktrace.frames.find(frame => frame.filename && frame.filename.includes(__dirname) && !frame.filename.includes(ownNodeModulesDir))) {
                                            return null;
                                        }
                                        // We have exception data and do not sorted it out, so report it
                                        return event;
                                    }
                                }

                                // No exception in it ... do not report
                                return null;
                            });
                            main();
                        });
                    } else {
                        main();
                    }
                } else {
                    main();
                }
            } else {
                main();
            }
        },

        message: obj => {
            if (obj) {
                switch (obj.command) {
                    // process messageTo commands
                    case 'toScript':
                    case 'jsMessageBus':
                        if (obj.message && (
                            obj.message.instance === null ||
                            obj.message.instance === undefined ||
                            ('javascript.' + obj.message.instance === adapter.namespace) ||
                            (obj.message.instance === adapter.namespace)
                        )) {
                            Object.keys(context.messageBusHandlers).forEach(name => {
                                // script name could be script.js.xxx or only xxx
                                if ((!obj.message.script || obj.message.script === name) && context.messageBusHandlers[name][obj.message.message]) {
                                    context.messageBusHandlers[name][obj.message.message].forEach(handler => {
                                        try {
                                            if (obj.callback) {
                                                handler.cb.call(handler.sandbox, obj.message.data, result =>
                                                    adapter.sendTo(obj.from, obj.command, result, obj.callback));
                                            } else {
                                                handler.cb.call(handler.sandbox, obj.message.data, result => {/* nop */ });
                                            }
                                        } catch (e) {
                                            adapter.setState('scriptProblem.' + name.substring(SCRIPT_CODE_MARKER.length), true, true);
                                            context.logError('Error in callback', e);
                                        }
                                    });
                                }
                            });
                        }
                        break;

                    case 'loadTypings': { // Load typings for the editor
                        const typings = {};

                        // try to load TypeScript lib files from disk
                        try {
                            const typescriptLibs = resolveTypescriptLibs(targetTsLib);
                            Object.assign(typings, typescriptLibs);
                        } catch (e) { /* ok, no lib then */
                        }

                        // provide the already-loaded ioBroker typings and global script declarations
                        Object.assign(typings, tsAmbient);

                        // also provide the known global declarations for each global script
                        for (const globalScriptPaths of Object.keys(knownGlobalDeclarationsByScript)) {
                            typings[`${globalScriptPaths}.d.ts`] = knownGlobalDeclarationsByScript[globalScriptPaths];
                        }

                        if (obj.callback) {
                            adapter.sendTo(obj.from, obj.command, {typings}, obj.callback);
                        }
                        break;
                    }

                    case 'calcAstroAll': {
                        if (obj.message) {
                            const sunriseOffset = parseInt(obj.message.sunriseOffset  === undefined ? adapter.config.sunriseOffset : obj.message.sunriseOffset, 10) || 0;
                            const sunsetOffset  = parseInt(obj.message.sunsetOffset   === undefined ? adapter.config.sunsetOffset  : obj.message.sunsetOffset, 10)  || 0;
                            const longitude     = parseFloat(obj.message.longitude === undefined ? adapter.config.longitude    : obj.message.longitude) || 0;
                            const latitude      = parseFloat(obj.message.latitude  === undefined ? adapter.config.latitude     : obj.message.latitude)  || 0;
                            const today         = getAstroStartOfDay();
                            let astroEvents = {};
                            try {
                                astroEvents = mods.suncalc.getTimes(today, latitude, longitude);
                            } catch (e) {
                                adapter.log.error(`Cannot calculate astro data: ${e}`);
                            }
                            if (astroEvents) {
                                try {
                                    astroEvents.nextSunrise = getAstroEvent(
                                        today,
                                        obj.message.sunriseEvent || adapter.config.sunriseEvent,
                                        obj.message.sunriseLimitStart || adapter.config.sunriseLimitStart,
                                        obj.message.sunriseLimitEnd   || adapter.config.sunriseLimitEnd,
                                        sunriseOffset,
                                        false,
                                        latitude,
                                        longitude,
                                        true
                                    );
                                    astroEvents.nextSunset = getAstroEvent(
                                        today,
                                        obj.message.sunsetEvent  || adapter.config.sunsetEvent,
                                        obj.message.sunsetLimitStart  || adapter.config.sunsetLimitStart,
                                        obj.message.sunsetLimitEnd    || adapter.config.sunsetLimitEnd,
                                        sunsetOffset,
                                        true,
                                        latitude,
                                        longitude,
                                        true
                                    );
                                } catch (e) {
                                    adapter.log.error(`Cannot calculate astro data: ${e}`);
                                }
                            }

                            const result = {};
                            const keys = Object.keys(astroEvents).sort((a, b) => astroEvents[a] - astroEvents[b]);
                            keys.forEach(key => result[key] = { serverTime: formatHoursMinutesSeconds(astroEvents[key]), date: astroEvents[key].toISOString() });

                            obj.callback && adapter.sendTo(obj.from, obj.command, result, obj.callback);
                        }
                        break;
                    }

                    case 'calcAstro': {
                        if (obj.message) {
                            const sunriseOffset = parseInt(obj.message.sunriseOffset  === undefined ? adapter.config.sunriseOffset : obj.message.sunriseOffset, 10) || 0;
                            const sunsetOffset  = parseInt(obj.message.sunsetOffset   === undefined ? adapter.config.sunsetOffset  : obj.message.sunsetOffset, 10)  || 0;
                            const longitude     = parseFloat(obj.message.longitude === undefined ? adapter.config.longitude    : obj.message.longitude) || 0;
                            const latitude      = parseFloat(obj.message.latitude  === undefined ? adapter.config.latitude     : obj.message.latitude)  || 0;
                            const now = new Date();
                            const nextSunrise = getAstroEvent(
                                now,
                                obj.message.sunriseEvent || adapter.config.sunriseEvent,
                                obj.message.sunriseLimitStart || adapter.config.sunriseLimitStart,
                                obj.message.sunriseLimitEnd   || adapter.config.sunriseLimitEnd,
                                sunriseOffset,
                                false,
                                latitude,
                                longitude,
                                true
                            );
                            const nextSunset = getAstroEvent(
                                now,
                                obj.message.sunsetEvent  || adapter.config.sunsetEvent,
                                obj.message.sunsetLimitStart  || adapter.config.sunsetLimitStart,
                                obj.message.sunsetLimitEnd    || adapter.config.sunsetLimitEnd,
                                sunsetOffset,
                                true,
                                latitude,
                                longitude,
                                true
                            );

                            obj.callback && adapter.sendTo(obj.from, obj.command, {
                                nextSunrise,
                                nextSunset
                            }, obj.callback);
                        }
                        break;
                    }

                    case 'debug': {
                        !debugMode && debugStart(obj.message);
                        break;
                    }

                    case 'debugStop': {
                        !debugMode && debugStop()
                            .then(() => console.log('stopped'));
                        break;
                    }

                    case 'rulesOn': {
                        context.rulesOpened = obj.message;
                        console.log('Enable messaging for ' + context.rulesOpened);
                        break;
                    }

                    case 'rulesOff': {
                        // may be if (context.rulesOpened === obj.message)
                        console.log('Disable messaging for ' + context.rulesOpened);
                        context.rulesOpened = null;
                        break;
                    }

                    case 'getIoBrokerDataDir': {
                        obj.callback && adapter.sendTo(obj.from, obj.command, {
                            dataDir: utils.getAbsoluteDefaultDataDir(),
                            sep: nodePath.sep
                        }, obj.callback);
                        break;
                    }
                }
            }
        },

        /**
         * If the JS-Controller catches an unhandled error, this will be called
         * so we have a chance to handle it ourself.
         * @param {Error} err
         */
        error: err => {
            // Identify unhandled errors originating from callbacks in scripts
            // These are not caught by wrapping the execution code in try-catch
            if (err && typeof err.stack === 'string') {
                const scriptCodeMarkerIndex = err.stack.indexOf(SCRIPT_CODE_MARKER);
                if (scriptCodeMarkerIndex > -1) {
                    // This is a script error
                    let scriptName = err.stack.substr(scriptCodeMarkerIndex);
                    scriptName = scriptName.substr(0, scriptName.indexOf(':'));
                    context.logError(scriptName, err);

                    // Leave the script running for now
                    // signal to the JS-Controller that we handled the error ourselves
                    return true;
                }
                // check if a path contains adaptername but not own node_module
                // this regex matched "iobroker.javascript/" if NOT followed by "node_modules"
                if (!err.stack.match(/iobroker\.javascript[/\\](?!.*node_modules).*/g)) {
                    // This is an error without any info on origin (mostly async errors like connection errors)
                    // also consider it as being from a script
                    adapter.log.error('An error happened which is most likely from one of your scripts, but the originating script could not be detected.');
                    adapter.log.error('Error: ' + err.message);
                    adapter.log.error(err.stack);

                    // signal to the JS-Controller that we handled the error ourselves
                    return true;
                }
            }
        }
    });

    adapter = new utils.Adapter(options);

    // handler for logs
    adapter.on('log', msg =>
        Object.keys(context.logSubscriptions)
            .forEach(name =>
                context.logSubscriptions[name].forEach(handler => {
                    if (typeof handler.cb === 'function' && (handler.severity === '*' || handler.severity === msg.severity)) {
                        handler.sandbox.logHandler = handler.severity || '*';
                        handler.cb.call(handler.sandbox, msg);
                        handler.sandbox.logHandler = null;
                    }
                })));

    context.adapter = adapter;

    return adapter;
}

function updateObjectContext(id, obj) {
    if (obj) {
        // add state to state ID's list
        if (obj.type === 'state') {
            if (!context.stateIds.includes(id)) {
                context.stateIds.push(id);
                context.stateIds.sort();
            }
            if (context.devices && context.channels) {
                const parts = id.split('.');
                parts.pop();
                const chn = parts.join('.');
                context.channels[chn] = context.channels[chn] || [];
                context.channels[chn].push(id);

                parts.pop();
                const dev = parts.join('.');
                context.devices[dev] = context.devices[dev] || [];
                context.devices[dev].push(id);
            }
        }
    } else {
        // delete object from state ID's list
        const pos = context.stateIds.indexOf(id);
        pos !== -1 && context.stateIds.splice(pos, 1);
        if (context.devices && context.channels) {
            const parts = id.split('.');
            parts.pop();
            const chn = parts.join('.');
            if (context.channels[chn]) {
                const posChn = context.channels[chn].indexOf(id);
                posChn !== -1 && context.channels[chn].splice(posChn, 1);
            }

            parts.pop();
            const dev = parts.join('.');
            if (context.devices[dev]) {
                const posDev = context.devices[dev].indexOf(id);
                posDev !== -1 && context.devices[dev].splice(posDev, 1);
            }
        }

        delete context.folderCreationVerifiedObjects[id];
    }

    if (!obj && context.objects[id]) {
        // objects was deleted
        removeFromNames(id);
        delete context.objects[id];
    } else if (obj && !context.objects[id]) {
        // object was added
        context.objects[id] = obj;
        addToNames(obj);
    } else if (obj && context.objects[id].common) {
        // Object just changed
        context.objects[id] = obj;

        const n = getName(id);
        let nn = context.objects[id].common ? context.objects[id].common.name : '';

        if (nn && typeof nn === 'object') {
            nn = nn[words.getLanguage()] || nn.en;
        }

        if (n !== nn) {
            if (n) {
                removeFromNames(id);
            }
            if (nn) {
                addToNames(obj);
            }
        }
    }
}

function main() {
    !debugMode && patchFont()
        .then(patched => patched && adapter.log.debug('Font patched'));

    // todo
    context.errorLogFunction = webstormDebug ? console : adapter.log;
    activeStr = `${adapter.namespace}.scriptEnabled.`;

    mods.fs = new require('./lib/protectFs')(adapter.log);

    // try to read TS declarations
    try {
        tsAmbient = {
            'javascript.d.ts': nodeFS.readFileSync(mods.path.join(__dirname, 'lib/javascript.d.ts'), 'utf8')
        };
        tsServer.provideAmbientDeclarations(tsAmbient);
        jsDeclarationServer.provideAmbientDeclarations(tsAmbient);
    } catch (e) {
        adapter.log.warn(`Could not read TypeScript ambient declarations: ${e.message}`);
        // This should not happen, so send a error report to Sentry
        if (adapter.supportsFeature && adapter.supportsFeature('PLUGINS')) {
            const sentryInstance = adapter.getPluginInstance('sentry');
            if (sentryInstance) {
                const sentryObject = sentryInstance.getSentryObject();
                if (sentryObject) sentryObject.captureException(e);
            }
        }
        // Keep the adapter from crashing when the included typings cannot be read
        tsAmbient = {};
    }

    context.logWithLineInfo = function (level, msg) {
        if (msg === undefined) {
            return context.logWithLineInfo('info', msg);
        }

        context.errorLogFunction && context.errorLogFunction[level](msg);

        const stack = (new Error().stack).split('\n');

        for (let i = 3; i < stack.length; i++) {
            if (!stack[i]) {
                continue;
            }
            if (stack[i].match(/runInContext|runInNewContext|javascript\.js:/)) {
                break;
            }
            context.errorLogFunction && context.errorLogFunction[level](fixLineNo(stack[i]));
        }
    };

    context.logWithLineInfo.warn = context.logWithLineInfo.bind(1, 'warn');
    context.logWithLineInfo.error = context.logWithLineInfo.bind(1, 'error');
    context.logWithLineInfo.info = context.logWithLineInfo.bind(1, 'info');

    installLibraries(() => {

        // Load the TS declarations for Node.js and all 3rd party modules
        loadTypeScriptDeclarations();

        getData(() => {
            context.scheduler = new Scheduler(adapter.log, Date, mods.suncalc, adapter.config.latitude, adapter.config.longitude);
            dayTimeSchedules(adapter, context);
            sunTimeSchedules(adapter, context);
            timeSchedule(adapter, context);

            // Warning. It could have a side-effect in compact mode, so all adapters will accept self signed certificates
            if (adapter.config.allowSelfSignedCerts) {
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            }

            adapter.getObjectView('script', 'javascript', {}, async (err, doc) => {
                globalScript = '';
                globalDeclarations = '';
                knownGlobalDeclarationsByScript = {};
                if (doc && doc.rows && doc.rows.length) {
                    // assemble global script
                    for (let g = 0; g < doc.rows.length; g++) {
                        const obj = doc.rows[g].value;
                        if (checkIsGlobal(obj)) {
                            if (obj && obj.common) {
                                const engineType = (obj.common.engineType || '').toLowerCase();

                                if (obj.common.enabled) {
                                    if (engineType.startsWith('typescript')) {
                                        // TypeScript
                                        adapter.log.info(`${obj._id}: compiling TypeScript source...`);
                                        // In order to compile global TypeScript, we need to do some transformations
                                        // 1. For top-level-await, some statements must be wrapped in an immediately-invoked async function
                                        // 2. If any global script uses `import`, the declarations are no longer visible if they are not exported with `declare global`
                                        const transformedSource = transformScriptBeforeCompilation(obj.common.source, true);
                                        // The source code must be transformed in order to support top level await
                                        // Global scripts must not be treated as a module, otherwise their methods
                                        // cannot be found by the normal scripts
                                        // We need to hash both global declarations that are known until now
                                        // AND the script source, because changing either can change the compilation output
                                        const sourceHash = hashSource(tsSourceHashBase + globalDeclarations + transformedSource);

                                        /** @type {string | undefined} */
                                        let compiled;
                                        /** @type {string | undefined} */
                                        let declarations;
                                        // If we already stored the compiled source code and the original source hash,
                                        // use the hash to check whether we can rely on the compiled source code or
                                        // if we need to compile it again
                                        if (
                                            typeof obj.common.compiled === 'string'
                                            && typeof obj.common.sourceHash === 'string'
                                            && sourceHash === obj.common.sourceHash
                                        ) {
                                            // We can reuse the stored source
                                            compiled = obj.common.compiled;
                                            declarations = obj.common.declarations;
                                            adapter.log.info(`${obj._id}: source code did not change, using cached compilation result...`);
                                        } else {
                                            // We don't have a hashed source code or the original source changed, compile it
                                            const filename = scriptIdToTSFilename(obj._id);
                                            let tsCompiled;
                                            try {
                                                tsCompiled = tsServer.compile(filename, transformedSource);
                                            } catch (e) {
                                                adapter.log.error(`${obj._id}: TypeScript compilation failed:\n${e}`);
                                                continue;
                                            }

                                            const errors = tsCompiled.diagnostics.map(diag => diag.annotatedSource + '\n').join('\n');

                                            if (tsCompiled.success) {
                                                if (errors.length > 0) {
                                                    adapter.log.warn(`${obj._id}: TypeScript compilation completed with errors:\n${errors}`);
                                                } else {
                                                    adapter.log.info(`${obj._id}: TypeScript compilation successful`);
                                                }
                                                compiled = tsCompiled.result;
                                                // Global scripts that have been transformed to support `import` need to have their declarations transformed aswell
                                                declarations = transformGlobalDeclarations(tsCompiled.declarations || '');

                                                const newCommon = {
                                                    sourceHash,
                                                    compiled,
                                                };
                                                if (declarations) newCommon.declarations = declarations;

                                                // Store the compiled source and the original source hash, so we don't need to do the work again next time
                                                ignoreObjectChange.add(obj._id); // ignore the next change and don't restart scripts
                                                adapter.extendForeignObject(obj._id, {
                                                    common: newCommon
                                                });
                                            } else {
                                                adapter.log.error(`${obj._id}: TypeScript compilation failed:\n${errors}`);
                                                continue;
                                            }
                                        }
                                        globalScript += compiled + '\n';
                                        // if declarations were generated, remember them
                                        if (declarations != null) {
                                            provideDeclarationsForGlobalScript(obj._id, declarations);
                                        }
                                    } else { // javascript
                                        const sourceCode = obj.common.source;
                                        globalScript += sourceCode + '\n';

                                        // try to compile the declarations so TypeScripts can use
                                        // functions defined in global JavaScripts
                                        const filename = scriptIdToTSFilename(obj._id);
                                        let tsCompiled;
                                        try {
                                            tsCompiled = jsDeclarationServer.compile(filename, sourceCode);
                                        } catch (e) {
                                            adapter.log.warn(`${obj._id}: Error while generating type declarations, skipping:\n${e}`);
                                            continue;
                                        }
                                        // if declarations were generated, remember them
                                        if (tsCompiled.success && tsCompiled.declarations != null) {
                                            provideDeclarationsForGlobalScript(obj._id, tsCompiled.declarations);
                                        }
                                    }

                                }
                            }
                        }
                    }
                }

                globalScript = globalScript.replace(/\r\n/g, '\n');
                globalScriptLines = globalScript.split(/\n/g).length - 1;

                if (doc && doc.rows && doc.rows.length) {
                    // load all scripts
                    for (let i = 0; i < doc.rows.length; i++) {
                        if (!checkIsGlobal(doc.rows[i].value)) {
                            load(doc.rows[i].value);
                        }
                    }
                }

                if (adapter.config.mirrorPath) {
                    adapter.config.mirrorInstance = parseInt(adapter.config.mirrorInstance, 10) || 0;
                    if (adapter.instance === adapter.config.mirrorInstance) {
                        const ioBDataDir = utils.getAbsoluteDefaultDataDir() + nodePath.sep;
                        adapter.config.mirrorPath = nodePath.normalize(adapter.config.mirrorPath);
                        let mirrorForbidden = false;
                        for (let dir of forbiddenMirrorLocations) {
                            dir = nodePath.join(ioBDataDir, dir) + nodePath.sep;
                            if (dir.includes(adapter.config.mirrorPath) || adapter.config.mirrorPath.startsWith(dir)) {
                                adapter.log.error(`The Mirror directory is not allowed to be a central ioBroker directory!`);
                                adapter.log.error(`Directory ${adapter.config.mirrorPath} is not allowed to mirror files!`);
                                mirrorForbidden = true;
                                break;
                            }
                        }
                        if (!mirrorForbidden) {
                            mirror = new Mirror({
                                adapter,
                                log: adapter.log,
                                diskRoot: adapter.config.mirrorPath
                            });
                        }
                    }
                }

                // CHeck setState counter per minute and stop script if too high
                setStateCountCheckInterval = setInterval(() => {
                    Object.keys(context.scripts).forEach(id => {
                        if (!context.scripts[id]) return;
                        const currentSetStatePerMinuteCounter = context.scripts[id].setStatePerMinuteCounter;
                        context.scripts[id].setStatePerMinuteCounter = 0;
                        if (currentSetStatePerMinuteCounter > adapter.config.maxSetStatePerMinute) {
                            context.scripts[id].setStatePerMinuteProblemCounter++;
                            adapter.log.debug(`Script ${id} has reached the maximum of ${adapter.config.maxSetStatePerMinute} setState calls per minute in ${context.scripts[id].setStatePerMinuteProblemCounter} consecutive minutes`);
                            // Allow "too high counters" for 1 minute for script starts or such and only
                            // stop script when lasts longer
                            if (context.scripts[id].setStatePerMinuteProblemCounter > 1) {
                                adapter.log.error(`Script ${id} is calling setState more than ${adapter.config.maxSetStatePerMinute} times per minute! Stopping Script now! Please check your script!`);
                                stop(id);
                            }
                        } else if (context.scripts[id].setStatePerMinuteProblemCounter > 0) {
                            context.scripts[id].setStatePerMinuteProblemCounter--;
                            adapter.log.debug(`Script ${id} has NOT reached the maximum of ${adapter.config.maxSetStatePerMinute} setState calls per minute. Decrease problem counter to ${context.scripts[id].setStatePerMinuteProblemCounter}`);
                        }
                    });
                }, 60000);

            });
        });
    });
}

function stopAllScripts(cb) {
    Object.keys(context.scripts).forEach(id => stop(id));
    setTimeout(() => cb(), 0);
}

const attempts         = {};
let globalScript       = '';
/** Generated declarations for global TypeScripts */
let globalDeclarations = '';
// Remember which definitions the global scripts
// have access to, because it depends on the compile order
let knownGlobalDeclarationsByScript = {};
let globalScriptLines  = 0;
// let activeRegEx     = null;
let activeStr          = ''; // enabled state prefix
let dayScheduleTimer   = null; // schedule for astrological day
let sunScheduleTimer   = null; // schedule for sun moment times
let timeScheduleTimer  = null; // schedule for astrological day

function getNextTimeEvent(time, useNextDay) {
    const now = new Date();
    let [timeHours, timeMinutes] = time.split(':');
    timeHours = parseInt(timeHours, 10);
    timeMinutes = parseInt(timeMinutes, 10);
    if (useNextDay && (now.getHours() > timeHours || (now.getHours() === timeHours && now.getMinutes() > timeMinutes))) {
        now.setDate(now.getDate() + 1);
    }

    now.setHours(timeHours);
    now.setMinutes(timeMinutes);
    return now;
}

function getAstroEvent(now, astroEvent, start, end, offsetMinutes, isDayEnd, latitude, longitude, useNextDay) {
    let ts = mods.suncalc.getTimes(now, latitude, longitude)[astroEvent];
    if (!ts || ts.getTime().toString() === 'NaN') {
        ts = isDayEnd ? getNextTimeEvent(end, useNextDay) : getNextTimeEvent(start, useNextDay);
    }
    ts.setSeconds(0);
    ts.setMilliseconds(0);
    ts.setMinutes(ts.getMinutes() + (parseInt(offsetMinutes, 10) || 0));

    let [timeHoursStart, timeMinutesStart] = start.split(':');
    timeHoursStart = parseInt(timeHoursStart, 10);
    timeMinutesStart = parseInt(timeMinutesStart, 10) || 0;

    if (ts.getHours() < timeHoursStart || (ts.getHours() === timeHoursStart && ts.getMinutes() < timeMinutesStart)) {
        ts = getNextTimeEvent(start, useNextDay);
    }

    let [timeHoursEnd, timeMinutesEnd] = end.split(':');
    timeHoursEnd = parseInt(timeHoursEnd, 10);
    timeMinutesEnd = parseInt(timeMinutesEnd, 10) || 0;

    if (ts.getHours() > timeHoursEnd || (ts.getHours() === timeHoursEnd && ts.getMinutes() > timeMinutesEnd)) {
        ts = getNextTimeEvent(end, useNextDay);
    }

    // if event in the past
    if (now > ts && useNextDay) {
        // take the next day
        ts.setDate(ts.getDate() + 1);
    }
    return ts;
}

function timeSchedule(adapter, context) {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    if (context.timeSettings.format12) {
        if (hours > 12) {
            hours -= 12;
        }
    }
    if (context.timeSettings.leadingZeros) {
        hours = hours.toString().padStart(2, '0');
    }

    adapter.setState('variables.dayTime', {val: `${hours}:${minutes.toString().padStart(2, '0')}`, ack: true});

    now.setMinutes(now.getMinutes() + 1);
    now.setSeconds(0);
    now.setMilliseconds(0);
    const interval = now.getTime() - Date.now();
    timeScheduleTimer = setTimeout(timeSchedule, interval, adapter, context);
}

function dayTimeSchedules(adapter, context) {
    // get astrological event
    if (adapter.config.latitude === undefined || adapter.config.longitude === undefined ||
        adapter.config.latitude === ''        || adapter.config.longitude === '' ||
        adapter.config.latitude === null      || adapter.config.longitude === null) {
        adapter.log.error('Longitude or latitude does not set. Cannot use astro.');
        return;
    }

    // Calculate next event today
    const todayDate = new Date();
    const nowDate   = new Date();
    todayDate.setHours(12);
    todayDate.setMinutes(0);
    todayDate.setSeconds(0);
    todayDate.setMilliseconds(0);

    const todaySunrise = getAstroEvent(todayDate, adapter.config.sunriseEvent, adapter.config.sunriseLimitStart, adapter.config.sunriseLimitEnd, adapter.config.sunriseOffset, false, adapter.config.latitude, adapter.config.longitude);
    const todaySunset  = getAstroEvent(todayDate, adapter.config.sunsetEvent,  adapter.config.sunsetLimitStart,  adapter.config.sunsetLimitEnd,  adapter.config.sunsetOffset,  true,  adapter.config.latitude, adapter.config.longitude);

    // Sunrise
    let sunriseTimeout = todaySunrise.getTime() - nowDate.getTime();
    if (sunriseTimeout < 0 || sunriseTimeout > 3600000) {
        sunriseTimeout = 3600000;
    }

    // Sunset
    let sunsetTimeout = todaySunset.getTime() - nowDate.getTime();
    if (sunsetTimeout < 0 || sunsetTimeout > 3600000) {
        sunsetTimeout = 3600000;
    }

    adapter.getState('variables.isDayTime', (err, state) => {
        let isDay;
        if (sunriseTimeout < 5000) {
            isDay = true;
        } else if (sunsetTimeout < 5000) {
            isDay = false;
        } else {
            // check if in between
            isDay = nowDate.getTime() > (todaySunrise.getTime() - 60000) && nowDate <= todaySunset;
        }

        const val = state ? !!state.val : false;
        if (val !== isDay || state === null) {
            adapter.setState('variables.isDayTime', {val: isDay, ack: true});
        }
    });

    adapter.getState('variables.isDaylightSaving', (err, state) => {
        const isDayLightSaving = dstOffsetAtDate(nowDate) !== 0;
        const val = state ? !!state.val : false;

        if (val !== isDayLightSaving || state === null) {
            adapter.setState('variables.isDaylightSaving', {val: isDayLightSaving, ack: true});
        }
    });

    let nextTimeout = sunriseTimeout;
    if (sunriseTimeout > sunsetTimeout) {
        nextTimeout = sunsetTimeout;
    }
    nextTimeout = nextTimeout - 3000;
    if (nextTimeout < 3000) {
        nextTimeout = 3000;
    }

    dayScheduleTimer = setTimeout(dayTimeSchedules, nextTimeout, adapter, context);
}

function getAstroStartOfDay() {
    const d = new Date();
    d.setMinutes(0);
    d.setSeconds(0);
    d.setTime(d.getTime() - (d.getTimezoneOffset() * 60 * 1000));
    d.setUTCHours(0);

    return d;
}

function formatHoursMinutesSeconds(date) {
    const h = String(date.getHours());
    const m = String(date.getMinutes());
    const s = String(date.getSeconds());

    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${s.padStart(2, '0')}`;
}

async function sunTimeSchedules(adapter, context) {
    if (adapter.config.createAstroStates) {
        const calcDate = getAstroStartOfDay();

        const times = mods.suncalc.getTimes(calcDate, adapter.config.latitude, adapter.config.longitude);

        for (const t in times) {
            const timeFormatted = formatHoursMinutesSeconds(times[t]);
            const objId = `variables.astro.${t}`;

            await adapter.setObjectNotExistsAsync(objId, {
                type: 'state',
                common: {
                    name: `Astro ${t}`,
                    type: 'string',
                    role: 'value',
                    read: true,
                    write: false,
                },
                native: {},
            });
            await adapter.setStateAsync(objId, { val: timeFormatted + ' ' + calcDate.toISOString(), c: calcDate.toISOString(), ack: true });
        }

        const todayDate = new Date();
        todayDate.setHours(0);
        todayDate.setMinutes(0);
        todayDate.setSeconds(1);
        todayDate.setDate(todayDate.getDate() + 1);

        adapter.log.debug(`[sunTimeSchedules] Next: ${todayDate.toISOString()}`);
        sunScheduleTimer = setTimeout(sunTimeSchedules, todayDate.getTime() - Date.now(), adapter, context);
    } else {
        // remove astro states if disabled
        adapter.delObject('variables.astro', { recursive: true });
    }
}

function stopTimeSchedules() {
    dayScheduleTimer && clearTimeout(dayScheduleTimer);
    sunScheduleTimer && clearTimeout(sunScheduleTimer);
    timeScheduleTimer && clearTimeout(timeScheduleTimer);
}

/**
 * Redirects the virtual-tsc log output to the ioBroker log
 * @param {string} msg message
 * @param {string} sev severity (info, silly, debug, warn, error)
 */
function tsLog(msg, sev) {
    // shift the severities around, we don't care about the small details
    if (sev == null || sev === 'info') {
        sev = 'debug';
    } else if (sev === 'debug') {
        // Don't spam build logs on Travis
        if (isCI) return;
        sev = 'silly';
    }

    if (adapter && adapter.log) {
        adapter.log[sev](msg);
    } else {
        console.log(`[${sev.toUpperCase()}] ${msg}`);
    }
}
// Due to a npm bug, virtual-tsc may be hoisted to the top level node_modules but
// typescript may still be in the adapter level (https://npm.community/t/packages-with-peerdependencies-are-incorrectly-hoisted/4794),
// so we need to tell virtual-tsc where typescript is
tsc.setTypeScriptResolveOptions({
    paths: [require.resolve('typescript')],
});
// compiler instance for typescript
/** @type {tsc.Server} */
const tsServer = new tsc.Server(tsCompilerOptions, tsLog);

// compiler instance for global JS declarations
/** @type {tsc.Server} */
const jsDeclarationServer = new tsc.Server(
    jsDeclarationCompilerOptions,
    isCI ? false : undefined
);

function addGetProperty(object) {
    try {
        Object.defineProperty(object, 'get', {
            value: function (id) {
                return this[id] || this[adapter.namespace + '.' + id];
            },
            enumerable: false
        });
    } catch (e) {
        console.error('Cannot install get property');
    }
}

function fixLineNo(line) {
    if (line.includes('javascript.js:')) {
        return line;
    }
    if (!/script[s]?\.js[.\\/]/.test(line)) {
        return line;
    }
    if (/:([\d]+):/.test(line)) {
        line = line.replace(/:([\d]+):/, ($0, $1) =>
            ':' + ($1 > globalScriptLines + 1 ? $1 - globalScriptLines - 1 : $1) + ':'); // one line for 'async function ()'
    } else {
        line = line.replace(/:([\d]+)$/, ($0, $1) =>
            ':' + ($1 > globalScriptLines + 1 ? $1 - globalScriptLines - 1 : $1));       // one line for 'async function ()'
    }
    return line;
}

context.logError = function (msg, e, offs) {
    const stack = e.stack ? e.stack.toString().split('\n') : (e ? e.toString() : '');
    if (!msg.includes('\n')) {
        msg = msg.replace(/[: ]*$/, ': ');
    }

    //errorLogFunction.error(msg + stack[0]);
    context.errorLogFunction.error(msg + fixLineNo(stack[0]));
    for (let i = offs || 1; i < stack.length; i++) {
        if (!stack[i]) {
            continue;
        }
        if (stack[i].match(/runInNewContext|javascript\.js:/)) {
            break;
        }
        //adapter.log.error(fixLineNo(stack[i]));
        context.errorLogFunction.error(fixLineNo(stack[i]));
    }
};

function createActiveObject(id, enabled, cb) {
    const idActive = `${adapter.namespace}.scriptEnabled.${id.substring(SCRIPT_CODE_MARKER.length)}`;

    if (!context.objects[idActive]) {
        context.objects[idActive] = {
            _id: idActive,
            common: {
                name: `scriptEnabled.${id.substring(SCRIPT_CODE_MARKER.length)}`,
                desc: 'controls script activity',
                type: 'boolean',
                write: true,
                read: true,
                role: 'switch.active'
            },
            native: {
                script: id
            },
            type: 'state'
        };
        adapter.setForeignObject(idActive, context.objects[idActive], err => {
            if (!err) {
                const intermediateStateValue = prepareStateObject(idActive, !!enabled, true);
                adapter.setForeignState(idActive, !!enabled, true, () => {
                    if (enabled && !adapter.config.subscribe) {
                        context.interimStateValues[idActive] = intermediateStateValue;
                    }
                    cb && cb();
                });
            } else if (cb) {
                cb();
            }
        });
    } else {
        adapter.getForeignState(idActive, (err, state) => {
            if (state && state.val !== enabled) {
                const intermediateStateValue = prepareStateObject(idActive, !!enabled, true);
                adapter.setForeignState(idActive, !!enabled, true, () => {
                    if (enabled && !adapter.config.subscribe) {
                        context.interimStateValues[id] = intermediateStateValue;
                    }
                    cb && cb();
                });
            } else if (cb) {
                cb();
            }
        });
    }
}

function createProblemObject(id, cb) {
    const idProblem = adapter.namespace + '.scriptProblem.' + id.substring(SCRIPT_CODE_MARKER.length);

    if (!context.objects[idProblem]) {
        context.objects[idProblem] = {
            _id: idProblem,
            common: {
                name: 'scriptProblem.' + id.substring(SCRIPT_CODE_MARKER.length),
                desc: 'is the script has a problem',
                type: 'boolean',
                expert: true,
                write: false,
                read: true,
                role: 'indicator.error'
            },
            native: {
                script: id
            },
            type: 'state'
        };
        adapter.setForeignObject(idProblem, context.objects[idProblem], err => {
            if (!err) {
                adapter.setForeignState(idProblem, false, true, cb);
            } else if (cb) {
                cb();
            }
        });
    } else {
        adapter.getForeignState(idProblem, (err, state) => {
            if (state && state.val !== false) {
                adapter.setForeignState(idProblem, false, true, cb);
            } else if (cb) {
                cb();
            }
        });
    }
}

function addToNames(obj) {
    const id = obj._id;

    if (obj.common && obj.common.name) {
        let name = obj.common.name;
        if (name && typeof name === 'object') {
            name = name[words.getLanguage()] || name.en;
        }
        if (!name || typeof name !== 'string') { // TODO, take name in current language
            return;
        }

        if (!context.names[name]) {
            context.names[name] = id;
        } else {
            // convert to array
            if (!Array.isArray(context.names[name])) {
                context.names[name] = [context.names[name]];
            }

            context.names[name].push(id);
        }
    }
}

function removeFromNames(id) {
    const n = getName(id);

    if (n) {
        if (Array.isArray(context.names[n])) {
            const pos = context.names[n].indexOf(id);
            if (pos > -1) {
                context.names[n].splice(pos, 1);

                if (context.names[n].length === 1) {
                    context.names[n] = context.names[n][0];
                }
            }
        } else {
            delete context.names[n];
        }
    }
}

function getName(id) {
    for (const n in context.names) {
        if (context.names[n] && Array.isArray(context.names[n])) {
            if (context.names[n].includes(id)) {
                return n;
            }
        } else if (context.names[n] === id) {
            return n;
        }
    }

    return null;
}

function installNpm(npmLib, callback) {
    const path = __dirname;
    if (typeof npmLib === 'function') {
        callback = npmLib;
        npmLib = undefined;
    }

    // Also, set the working directory (cwd) of the process instead of using --prefix
    // because that has ugly bugs on Windows
    const cmd = `npm install ${npmLib} --omit=dev`;
    adapter.log.info(`${cmd} (System call)`);
    // Install node modules as system call

    // System call used for update of js-controller itself,
    // because during installation npm packet will be deleted too, but some files must be loaded even during the installation process.
    const child = mods['child_process'].exec(cmd, {
        windowsHide: true,
        cwd: path,
    });

    child.stdout && child.stdout.on('data', buf =>
        adapter.log.info(buf.toString('utf8')));

    child.stderr && child.stderr.on('data', buf =>
        adapter.log.error(buf.toString('utf8')));

    child.on('err', err => {
        adapter.log.error(`Cannot install ${npmLib}: ${err}`);
        typeof callback === 'function' && callback(npmLib);
        callback = null;
    });
    child.on('error', err => {
        adapter.log.error(`Cannot install ${npmLib}: ${err}`);
        typeof callback === 'function' && callback(npmLib);
        callback = null;
    });

    child.on('exit', (code /* , signal */) => {
        if (code) {
            adapter.log.error(`Cannot install ${npmLib}: ${code}`);
        }
        // command succeeded
        if (typeof callback === 'function') callback(npmLib);
        callback = null;
    });
}

function installLibraries(callback) {
    let allInstalled = true;
    if (adapter.config && adapter.config.libraries) {
        const libraries = adapter.config.libraries.split(/[,;\s]+/);

        for (let lib = 0; lib < libraries.length; lib++) {
            if (libraries[lib] && libraries[lib].trim()) {
                libraries[lib] = libraries[lib].trim();
                let libName = libraries[lib];

                const versionChunkPos = libName.indexOf('@', 1);
                if (versionChunkPos > -1) {
                    libName = libName.slice(0, versionChunkPos);
                }
                if (!nodeFS.existsSync(`${__dirname}/node_modules/${libName}/package.json`)) {
                    if (!attempts[libraries[lib]]) {
                        attempts[libraries[lib]] = 1;
                    } else {
                        attempts[libraries[lib]]++;
                    }
                    if (attempts[libraries[lib]] > 3) {
                        adapter.log.error(`Cannot install npm packet: ${libraries[lib]}`);
                        continue;
                    }

                    installNpm(libraries[lib], () =>
                        installLibraries(callback));

                    allInstalled = false;
                    break;
                }
            }
        }
    }
    allInstalled && callback();
}

function createVM(source, name) {
    if (debugMode && name !== debugMode) {
        return false;
    }

    if (!debugMode) {
        source += "\n;\nlog('registered ' + __engine.__subscriptions + ' subscription' + (__engine.__subscriptions === 1 ? '' : 's' ) + '," +
            " ' + __engine.__schedules + ' schedule' + (__engine.__schedules === 1 ? '' : 's' ) + '," +
            " ' + __engine.__subscriptionsMessage + ' message' + (__engine.__subscriptionsMessage === 1 ? '' : 's' ) + '," +
            " ' + __engine.__subscriptionsLog + ' log' + (__engine.__subscriptionsLog === 1 ? '' : 's' ) + " +
            "' and ' + __engine.__subscriptionsFile + ' file subscription' + (__engine.__subscriptionsFile === 1 ? '' : 's' ));\n";
    } else {
        if (source.startsWith('(async () => {\n')) {
            source = `(async () => {debugger;\n${source.substring('(async () => {\n'.length)}`;
        } else {
            source = `debugger;${source}`;
        }
    }

    try {
        const options = {
            filename: name,
            displayErrors: true
            // lineOffset: globalScriptLines
        };
        return {
            script: new vm.Script(source, options),
        };
    } catch (e) {
        context.logError(`${name} compile failed:\r\nat `, e);
        return false;
    }
}

function execute(script, name, verbose, debug) {
    script.intervals = [];
    script.timeouts = [];
    script.schedules = [];
    script.wizards = [];
    script.name = name;
    script._id = Math.floor(Math.random() * 0xFFFFFFFF);
    script.subscribes = {};
    script.subscribesFile = {};
    script.setStatePerMinuteCounter = 0;
    script.setStatePerMinuteProblemCounter = 0;
    adapter.setState(`scriptProblem.${name.substring(SCRIPT_CODE_MARKER.length)}`, { val: false, ack: true, expire: 1000 });

    const sandbox = sandBox(script, name, verbose, debug, context);

    try {
        script.script.runInNewContext(sandbox, {
            filename: name,
            displayErrors: true
            // lineOffset: globalScriptLines
        });
    } catch (e) {
        adapter.setState(`scriptProblem.${name.substring(SCRIPT_CODE_MARKER.length)}`, { val: true, ack: true, c: 'execute' });
        context.logError(name, e);
    }
}

function unsubscribe(id) {
    if (!id) {
        adapter.log.warn('unsubscribe: empty name');
        return;
    }

    if (id.constructor && id.constructor.name === 'RegExp') {
        //adapter.log.warn('unsubscribe: todo - process regexp');
        return;
    }

    if (typeof id !== 'string') {
        adapter.log.error(`unsubscribe: invalid type of id - ${typeof id}`);
        return;
    }
    const parts = id.split('.');
    const _adapter = `system.adapter.${parts[0]}.${parts[1]}`;
    if (context.objects[_adapter] && context.objects[_adapter].common && context.objects[_adapter].common.subscribable) {
        const a = parts[0] + '.' + parts[1];
        const alive = `system.adapter.${a}.alive`;
        if (context.adapterSubs[alive]) {
            const pos = context.adapterSubs[alive].indexOf(id);
            pos !== -1 && context.adapterSubs[alive].splice(pos, 1);
            if (!context.adapterSubs[alive].length) {
                delete context.adapterSubs[alive];
            }
        }
        adapter.sendTo(a, 'unsubscribe', id);
    }
}

// Analyse if logs are still required or not
function updateLogSubscriptions() {
    let found = false;
    // go through all scripts and check if some one script still require logs
    Object.keys(context.logSubscriptions).forEach(name => {
        if (!context.logSubscriptions[name] || !context.logSubscriptions[name].length) {
            delete context.logSubscriptions[name];
        } else {
            found = true;
        }
    });

    if (found && !logSubscribed) {
        logSubscribed = true;
        adapter.requireLog(logSubscribed);
    } else if (!found && logSubscribed) {
        logSubscribed = false;
        adapter.requireLog(logSubscribed);
    }
}

function stop(name, callback) {
    adapter.log.info('Stop script ' + name);

    adapter.setState('scriptEnabled.' + name.substring(SCRIPT_CODE_MARKER.length), false, true);

    if (context.messageBusHandlers[name]) {
        delete context.messageBusHandlers[name];
    }

    if (context.logSubscriptions[name]) {
        delete context.logSubscriptions[name];
        updateLogSubscriptions();
    }

    if (context.scripts[name]) {
        // Remove from subscriptions
        context.isEnums = false;
        if (adapter.config.subscribe) {
            // check all subscribed IDs
            Object.keys(context.scripts[name].subscribes).forEach(id => {
                if (context.subscribedPatterns[id]) {
                    context.subscribedPatterns[id] -= context.scripts[name].subscribes[id];
                    if (context.subscribedPatterns[id] <= 0) {
                        adapter.unsubscribeForeignStates(id);
                        delete context.subscribedPatterns[id];
                        if (context.states[id]) {
                            delete context.states[id];
                        }
                    }
                }
            });
        }

        for (let i = context.subscriptions.length - 1; i >= 0; i--) {
            if (context.subscriptions[i].name === name) {
                const sub = context.subscriptions.splice(i, 1)[0];
                sub && unsubscribe(sub.pattern.id);
            } else {
                if (!context.isEnums && context.subscriptions[i].pattern.enumName || context.subscriptions[i].pattern.enumId) {
                    context.isEnums = true;
                }
            }
        }

        // check all subscribed files
        Object.keys(context.scripts[name].subscribesFile).forEach(key => {
            if (context.subscribedPatternsFile[key]) {
                context.subscribedPatternsFile[key] -= context.scripts[name].subscribesFile[key];
                if (context.subscribedPatternsFile[key] <= 0) {
                    const [id, file] = key.split('$%$');
                    adapter.unsubscribeForeignFiles(id, file);
                    delete context.subscribedPatternsFile[key];
                }
            }
        });
        for (let i = context.subscriptionsFile.length - 1; i >= 0; i--) {
            if (context.subscriptionsFile[i].name === name) {
                context.subscriptionsFile.splice(i, 1)[0];
            }
        }

        for (let i = context.subscriptionsObject.length - 1; i >= 0; i--) {
            if (context.subscriptionsObject[i].name === name) {
                const sub = context.subscriptionsObject.splice(i, 1)[0];
                sub && adapter.unsubscribeForeignObjects(sub.pattern);
            }
        }

        // Stop all timeouts
        for (let i = 0; i < context.scripts[name].timeouts.length; i++) {
            clearTimeout(context.scripts[name].timeouts[i]);
        }
        // Stop all intervals
        for (let i = 0; i < context.scripts[name].intervals.length; i++) {
            clearInterval(context.scripts[name].intervals[i]);
        }
        // Stop all scheduled jobs
        for (let i = 0; i < context.scripts[name].schedules.length; i++) {
            if (context.scripts[name].schedules[i]) {
                const _name = context.scripts[name].schedules[i].name;
                if (!mods.nodeSchedule.cancelJob(context.scripts[name].schedules[i])) {
                    adapter.log.error(`Error by canceling scheduled job "${_name}"`);
                }
            }
        }

        // Stop all time wizards jobs
        for (let i = 0; i < context.scripts[name].wizards.length; i++) {
            if (context.scripts[name].wizards[i]) {
                context.scheduler && context.scheduler.remove(context.scripts[name].wizards[i]);
            }
        }

        // if callback for on stop
        if (typeof context.scripts[name].onStopCb === 'function') {
            context.scripts[name].onStopTimeout = parseInt(context.scripts[name].onStopTimeout, 10) || 1000;

            let timeout = setTimeout(() => {
                if (timeout) {
                    timeout = null;
                    delete context.scripts[name];
                    typeof callback === 'function' && callback(true, name);
                }
            }, context.scripts[name].onStopTimeout);

            try {
                context.scripts[name].onStopCb(() => {
                    if (timeout) {
                        clearTimeout(timeout);
                        timeout = null;
                        delete context.scripts[name];
                        typeof callback === 'function' && callback(true, name);
                    }
                });
            } catch (e) {
                adapter.log.error('error in onStop callback: ' + e);
            }

        } else {
            delete context.scripts[name];
            typeof callback === 'function' && callback(true, name);
        }
    } else {
        typeof callback === 'function' && callback(false, name);
    }
}

function prepareScript(obj, callback) {
    if (obj && obj.common && obj.common.enabled && debugState.scriptName === obj._id) {
        const id = obj._id;
        return debugStop()
            .then(() => {
                adapter.log.info(`Debugging of ${id} was stopped, because started in normal mode`);
                prepareScript(obj, callback);
            });
    }

    if (obj && obj.common &&
        (obj.common.enabled || debugMode === obj._id) &&
        obj.common.engine === `system.adapter.${adapter.namespace}` &&
        obj.common.source
    ) {
        const name = obj._id;

        const nameId = name.substring(SCRIPT_CODE_MARKER.length);
        if (!nameId.length || nameId.endsWith('.')) {
            adapter.log.error(`Script name ${name} is invalid!`);
            typeof callback === 'function' && callback(false, name);
            return;
        }
        const idActive = `scriptEnabled.${nameId}`;
        if (!adapter.config.subscribe) {
            context.interimStateValues[idActive] = prepareStateObject(`${adapter.namespace}.${idActive}`, true, true);
        }
        adapter.setState(idActive, true, true);
        obj.common.engineType = obj.common.engineType || '';

        if ((obj.common.engineType.toLowerCase().startsWith('javascript') || obj.common.engineType === 'Blockly' || obj.common.engineType === 'Rules')) {
            // Javascript
            adapter.log.info('Start javascript ' + name);

            let sourceFn = name;
            if (webstormDebug) {
                const fn = name.replace(/^script.js./, '').replace(/\./g, '/');
                sourceFn = mods.path.join(webstormDebug, fn + '.js');
            }
            context.scripts[name] = createVM(`(async () => {\n${globalScript + obj.common.source}\n})();`, sourceFn);
            if (!context.scripts[name]) {
                delete context.scripts[name];
                typeof callback === 'function' && callback(false, name);
                return;
            }
            execute(context.scripts[name], sourceFn, obj.common.verbose, obj.common.debug);
            typeof callback === 'function' && callback(true, name);
        } else if (obj.common.engineType.toLowerCase().startsWith('typescript')) {
            // TypeScript
            adapter.log.info(`${name}: compiling TypeScript source...`);
            // The source code must be transformed in order to support top level await
            // and to force TypeScript to compile the code as a module
            const transformedSource = transformScriptBeforeCompilation(obj.common.source, false);
            // We need to hash both global declarations that are known until now
            // AND the script source, because changing either can change the compilation output
            const sourceHash = hashSource(tsSourceHashBase + globalDeclarations + transformedSource);

            let compiled;
            // If we already stored the compiled source code and the original source hash,
            // use the hash to check whether we can rely on the compiled source code or
            // if we need to compile it again
            if (
                typeof obj.common.compiled === 'string'
                && typeof obj.common.sourceHash === 'string'
                && sourceHash === obj.common.sourceHash
            ) {
                // We can reuse the stored source
                compiled = obj.common.compiled;
                adapter.log.info(`${name}: source code did not change, using cached compilation result...`);
            } else {
                // We don't have a hashed source code or the original source changed, compile it
                const filename = scriptIdToTSFilename(name);
                let tsCompiled;
                try {
                    tsCompiled = tsServer.compile(filename, transformedSource);
                } catch (e) {
                    adapter.log.error(`${obj._id}: TypeScript compilation failed:\n${e}`);
                    typeof callback === 'function' && callback(false, name);
                    return;
                }

                const errors = tsCompiled.diagnostics.map(diag => diag.annotatedSource + '\n').join('\n');

                if (tsCompiled.success) {
                    if (errors.length > 0) {
                        adapter.log.warn(`${name}: TypeScript compilation had errors:\n${errors}`);
                    } else {
                        adapter.log.info(`${name}: TypeScript compilation successful`);
                    }
                    compiled = tsCompiled.result;

                    // Store the compiled source and the original source hash, so we don't need to do the work again next time
                    ignoreObjectChange.add(name); // ignore the next change and don't restart scripts
                    adapter.extendForeignObject(name, {
                        common: {
                            sourceHash,
                            compiled,
                        }
                    });
                } else {
                    adapter.log.error(`${name}: TypeScript compilation failed:\n${errors}`);
                    typeof callback === 'function' && callback(false, name);
                    return;
                }
            }
            context.scripts[name] = createVM(globalScript + '\n' + compiled, name);
            if (!context.scripts[name]) {
                delete context.scripts[name];
                typeof callback === 'function' && callback(false, name);
                return;
            }
            execute(context.scripts[name], name, obj.common.verbose, obj.common.debug);
            typeof callback === 'function' && callback(true, name);
        }
    } else {
        let _name;
        if (obj && obj._id) {
            _name = obj._id;
            const scriptIdName = _name.substring(SCRIPT_CODE_MARKER.length);

            if (!scriptIdName.length || scriptIdName.endsWith('.')) {
                adapter.log.error(`Script name ${_name} is invalid!`);
                typeof callback === 'function' && callback(false, _name);
                return;
            }
            adapter.setState('scriptEnabled.' + scriptIdName, false, true);
        }
        !obj && adapter.log.error('Invalid script');
        typeof callback === 'function' && callback(false, _name);
    }
}

function load(nameOrObject, callback) {
    if (typeof nameOrObject === 'object') {
        // create states for scripts
        createActiveObject(nameOrObject._id, nameOrObject && nameOrObject.common && nameOrObject.common.enabled, () =>
            createProblemObject(nameOrObject._id, () =>
                prepareScript(nameOrObject, callback)));

    } else {
        adapter.getForeignObject(nameOrObject, (err, obj) => {
            if (!obj || err) {
                err && adapter.log.error(`Invalid script "${nameOrObject}": ${err}`);
                typeof callback === 'function' && callback(false, nameOrObject);
            } else {
                return load(obj, callback);
            }
        });
    }
}

function patternMatching(event, patternFunctions) {
    let matched = false;
    for (let i = 0, len = patternFunctions.length; i < len; i++) {
        if (patternFunctions[i](event)) {
            if (patternFunctions.logic === 'or') {
                return true;
            }
            matched = true;
        } else if (patternFunctions.logic === 'and') {
            return false;
        }
    }
    return matched;
}

async function getData(callback) {
    await adapter.subscribeForeignObjectsAsync('*');

    if (!adapter.config.subscribe) {
        await adapter.subscribeForeignStatesAsync('*');
    } else {
        await adapter.subscribeStatesAsync('debug.to');
        await adapter.subscribeStatesAsync('scriptEnabled.*');
    }

    adapter.log.info('requesting all states');
    adapter.getForeignStates('*', (err, res) => {
        if (!adapter.config.subscribe) {
            if (err || !res) {
                adapter.log.error(`Could not initialize states: ${err ? err.message : 'no result'}`);
                adapter.terminate(utils.EXIT_CODES.START_IMMEDIATELY_AFTER_STOP);
                return;
            }
            context.states = Object.assign(res, context.states);

            addGetProperty(context.states);
        }

        // remember all IDs
        for (const id in res) {
            if (Object.prototype.hasOwnProperty.call(res, id)) {
                context.stateIds.push(id);
            }
        }
        statesInitDone = true;
        adapter.log.info('received all states');
        objectsInitDone && typeof callback === 'function' && callback();
    });

    adapter.log.info('requesting all objects');

    adapter.getObjectList({ include_docs: true }, (err, res) => {
        if (err || !res || !res.rows) {
            adapter.log.error(`Could not initialize objects: ${err ? err.message : 'no result'}`);
            adapter.terminate(utils.EXIT_CODES.START_IMMEDIATELY_AFTER_STOP);
            return;
        }
        context.objects = {};
        for (let i = 0; i < res.rows.length; i++) {
            if (!res.rows[i].doc) {
                adapter.log.debug(`Got empty object for index ${i} (${res.rows[i].id})`);
                continue;
            }
            if (context.objects[res.rows[i].doc._id] === undefined) { // If was already there ignore
                context.objects[res.rows[i].doc._id] = res.rows[i].doc;
            }
            context.objects[res.rows[i].doc._id].type === 'enum' && context.enums.push(res.rows[i].doc._id);

            // Collect all names
            addToNames(context.objects[res.rows[i].doc._id]);
        }
        addGetProperty(context.objects);

        const systemConfig = context.objects['system.config'];

        // set language for debug messages
        if (systemConfig && systemConfig.common && systemConfig.common.language) {
            words.setLanguage(systemConfig.common.language);
        } else if (adapter.language) {
            words.setLanguage(adapter.language);
        }

        // try to use system coordinates
        if (adapter.config.useSystemGPS) {
            if (systemConfig && systemConfig.common && systemConfig.common.latitude) {
                adapter.config.latitude = systemConfig.common.latitude;
                adapter.config.longitude = systemConfig.common.longitude;
            } else if (adapter.latitude) {
                adapter.config.latitude = adapter.latitude;
                adapter.config.longitude = adapter.longitude;
            }
        }
        adapter.config.latitude = parseFloat(adapter.config.latitude);
        adapter.config.longitude = parseFloat(adapter.config.longitude);

        adapter.config.sunriseEvent = adapter.config.sunriseEvent || 'nightEnd';
        adapter.config.sunriseOffset = adapter.config.sunriseOffset || 0;
        adapter.config.sunriseLimitStart = adapter.config.sunriseLimitStart || '06:00';
        adapter.config.sunriseLimitEnd = adapter.config.sunriseLimitEnd || '12:00';

        adapter.config.sunsetEvent = adapter.config.sunsetEvent || 'dusk';
        adapter.config.sunsetOffset = adapter.config.sunsetOffset || 0;
        adapter.config.sunsetLimitStart = adapter.config.sunsetLimitStart || '18:00';
        adapter.config.sunsetLimitEnd = adapter.config.sunsetLimitEnd || '23:00';

        objectsInitDone = true;
        adapter.log.info('received all objects');
        statesInitDone && typeof callback === 'function' && callback();
    });
}

const debugState = {
    scriptName: '',
    child: null,
    promiseOnEnd: null,
    paused: false,
    started: 0,
};

function debugStop() {
    if (debugState.child) {
        debugSendToInspector({cmd: 'end'});
        debugState.endTimeout = setTimeout(() => {
            debugState.endTimeout = null;
            debugState.child && debugState.child.kill('SIGTERM');
        }, 500);
    } else {
        debugState.promiseOnEnd = Promise.resolve();
    }

    return debugState.promiseOnEnd
        .then(() => {
            debugState.child = null;
            debugState.running = false;
            debugState.scriptName = '';
            debugState.endTimeout && clearTimeout(debugState.endTimeout);
            debugState.endTimeout = null;
        });
}

function debugDisableScript(id) {
    const obj = context.objects[id];
    if (obj && obj.common && obj.common.enabled) {
        return adapter.extendForeignObjectAsync(obj._id, {common: {enabled: false}});
    } else {
        return Promise.resolve();
    }
}

function debugSendToInspector(message) {
    if (debugState.child) {
        try {
            debugState.child.send(message);
        } catch (e) {
            debugStop()
                .then(() => adapter.log.info(`Debugging of "${debugState.scriptName}" was stopped, because started in normal mode`));
        }
    } else {
        adapter.log.error(`Cannot send command to terminated inspector`);
        return adapter.setState('debug.from', JSON.stringify({cmd: 'error', error: `Cannot send command to terminated inspector`, id: 1}), true);
    }
}

function debugStart(data) {
    if (Date.now() - debugState.started < 1000) {
        console.log('Start ignored');
        return;
    }

    debugState.started = Date.now();
    // stop the script if it's running
    debugDisableScript(data.scriptName)
        .then(() => debugStop())
        .then(() => {
            if (data.adapter) {
                debugState.adapterInstance = data.adapter;
                debugState.scriptName = '';
            } else {
                debugState.adapterInstance = '';
                debugState.scriptName = data.scriptName;
            }

            debugState.breakOnStart = data.breakOnStart;

            debugState.promiseOnEnd = new Promise(resolve => {
                const options = {
                    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
                    //stdio: ['pipe', 'pipe', 'pipe', 'ipc']
                };
                const args = [];
                if (debugState.adapterInstance) {
                    args.push('--breakOnStart');
                }

                debugState.child = fork(`${__dirname}/lib/inspect.js`, args, options);

                /*debugState.child.stdout.setEncoding('utf8');
                debugState.child.stderr.setEncoding('utf8');
                debugState.child.stdout.on('data', childPrint);
                debugState.child.stderr.on('data', childPrint);*/

                debugState.child && debugState.child.on('message', message => {
                    if (typeof message === 'string') {
                        try {
                            message = JSON.parse(message);
                        } catch (e) {
                            return adapter.log.error(`Cannot parse message from inspector: ${message}`);
                        }
                    }

                    message.cmd !== 'ready' && adapter.setState('debug.from', JSON.stringify(message), true);

                    switch (message.cmd) {
                        case 'ready': {
                            debugSendToInspector({cmd: 'start', scriptName: debugState.scriptName, adapterInstance: debugState.adapterInstance, instance: adapter.instance});
                            break;
                        }

                        case 'watched': {
                            //console.log(`WATCHED: ${JSON.stringify(message)}`);
                            break;
                        }

                        case 'paused': {
                            debugState.paused = true;
                            console.log(`host: PAUSED`);
                            break;
                        }

                        case 'resumed' : {
                            debugState.paused = false;
                            //console.log(`STARTED`);
                            break;
                        }

                        case 'log' : {
                            console.log(`[${message.severity}] ${message.text}`);
                            break;
                        }

                        case 'readyToDebug': {
                            console.log(`host: readyToDebug (set breakpoints): [${message.scriptId}] ${message.script}`);
                            break;
                        }
                    }
                });
                debugState.child && debugState.child.on('error', error => {
                    adapter.log.error(`Cannot start inspector: ${error}`);
                    adapter.setState('debug.from', JSON.stringify({cmd: 'error', error}), true);
                });

                debugState.child && debugState.child.on('exit', code => {
                    if (code) {
                        adapter.setState('debug.from', JSON.stringify({cmd: 'error', error: `invalid response code: ${code}`}), true);
                    }
                    adapter.setState('debug.from', JSON.stringify({cmd: 'debugStopped', code}), true);
                    debugState.child = null;
                    resolve(code);
                });
            });
        });
}

async function patchFont() {
    let stat;
    let dbFile;
    try {
        stat = nodeFS.statSync(`${__dirname}/admin/vs/base/browser/ui/codicons/codicon/codicon.ttf`);
        dbFile = await adapter.readFileAsync('javascript.admin', `vs/base/browser/ui/codicons/codicon/codicon.ttf`);
    } catch (error) {
        // ignore
    }
    if (dbFile && dbFile.file) {
        dbFile = dbFile.file;
    }

    if (!stat || stat.size !== 73452 || !dbFile || dbFile.byteLength !== 73452) {
        try {
            const buffer = Buffer.from(JSON.parse(nodeFS.readFileSync(`${__dirname}/admin-config/vsFont/codicon.json`)), 'base64');

            const zip = await require('jszip').loadAsync(buffer);
            const data = await zip.file('codicon.ttf').async('arraybuffer');
            if (data.byteLength !== 73452) {
                throw new Error('invalid font file!');
            }
            nodeFS.writeFileSync(`${__dirname}/admin/vs/base/browser/ui/codicons/codicon/codicon.ttf`, Buffer.from(data));
            // upload this file
            await adapter.writeFileAsync('javascript.admin', 'vs/base/browser/ui/codicons/codicon/codicon.ttf', Buffer.from(data));
            return true;
        } catch (error) {
            adapter.log.error(`Cannot patch font: ${error}`);
            return false;
        }
    } else {
        return false;
    }
}

// If started as allInOne mode => return function to create instance
if (module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
}
