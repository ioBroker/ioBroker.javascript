/*
 * Javascript adapter
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2014-2021 bluefox <dogafox@gmail.com>,
 *
 * Copyright (c) 2014      hobbyquaker
*/

/* jshint -W097 */
/* jshint -W083 */
/* jshint strict: false */
/* jslint node: true */
/* jshint shadow: true */
'use strict';

let NodeVM;
let VMScript;
let vm;
if (true || parseInt(process.versions.node.split('.')[0]) < 6) {
    vm = require('vm');
} else {
    try {
        const VM2 = require('vm2');
        NodeVM = VM2.NodeVM;
        VMScript = VM2.VMScript;
    } catch (e) {
        vm = require('vm');
    }
}
const nodeFS         = require('fs');
const nodePath       = require('path');
const coffeeCompiler = require('coffee-compiler');
const tsc            = require('virtual-tsc');
const nodeSchedule   = require('node-schedule');
const Mirror         = require('./lib/mirror');
const fork           = require('child_process').fork;

const mods = {
    fs:               {},
    dgram:            require('dgram'),
    crypto:           require('crypto'),
    dns:              require('dns'),
    events:           require('events'),
    http:             require('http'),
    https:            require('https'),
    http2:            require('http2'),
    net:              require('net'),
    os:               require('os'),
    path:             require('path'),
    util:             require('util'),
    child_process:    require('child_process'),
    stream:           require('stream'),
    url:              require('url'),
    zlib:             require('zlib'),
    suncalc:          require('suncalc2'),
    request:          require('./lib/request'),
    wake_on_lan:      require('wake_on_lan')
};

const utils     = require('@iobroker/adapter-core'); // Get common adapter utils
const words     = require('./lib/words');
const sandBox   = require('./lib/sandbox');
const eventObj  = require('./lib/eventObj');
const Scheduler = require('./lib/scheduler');
const {
    resolveTypescriptLibs,
    resolveTypings,
    scriptIdToTSFilename,
    transformScriptBeforeCompilation,
    transformGlobalDeclarations
} = require('./lib/typescriptTools');
const { targetTsLib, tsCompilerOptions, jsDeclarationCompilerOptions } = require('./lib/typescriptSettings');
const { hashSource } = require('./lib/tools');

const packageJson = require('./package.json');
const adapterName = packageJson.name.split('.').pop();
const scriptCodeMarker = 'script.js.';
const stopCounters =  {};

// for node version <= 0.12
if (''.startsWith === undefined) {
    String.prototype.startsWith = function (s) {
        return this.indexOf(s) === 0;
    };
}
if (''.endsWith === undefined) {
    String.prototype.endsWith = function (s) {
        return this.slice(0 - s.length) === s;
    };
}
///

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
/** @type {tsc.Server} */
let tsServer;
/** @type {tsc.Server} */
let jsDeclarationServer;

// TypeScript scripts are only recompiled if their source hash changes. If an adapter update fixes compilation bugs,
// a user won't notice until he changes and re-saves the script. In order to avoid that, we also include the
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
    // Remember which declarations this global script had access to
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

function loadTypeScriptDeclarations() {
    // try to load the typings on disk for all 3rd party modules
    const packages = [
        'node', // this provides auto completion for most builtins
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
    objects:          {},
    states:           {},
    stateIds:         [],
    errorLogFunction: null,
    subscriptions:    [],
    subscriptionsObject: [],
    adapterSubs:      {},
    subscribedPatterns: {},
    cacheObjectEnums: {},
    isEnums:          false, // If some subscription wants enum
    channels:         null,
    devices:          null,
    logWithLineInfo:  null,
    scheduler:        null,
    timers:           {},
    enums:            [],
    timerId:          0,
    names:            {},
    scripts:          {},
    messageBusHandlers: {},
    logSubscriptions: {},
    updateLogSubscriptions,
    convertBackStringifiedValues,
    debugMode,
    timeSettings:     {
        format12:     false,
        leadingZeros: true
    },
    rulesOpened:      null, //opened rules
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


/**
 * @type {Set<string>}
 * Stores the IDs of script objects whose change should be ignored because
 * the compiled source was just updated
 */
const ignoreObjectChange = new Set();

/** @type {ioBroker.Adapter} */
let adapter;

function startAdapter(options) {
    options = options || {};
    Object.assign(options, {

        name: adapterName,

        useFormatDate: true, // load float formatting

        objectChange: (id, obj) => {
            // Check if we should ignore this change (once!) because we just updated the compiled sources
            if (ignoreObjectChange.has(id)) {
                // Update the cached object and do nothing more
                context.objects[id] = obj;
                ignoreObjectChange.delete(id);
                return;
            }

            if (id.startsWith('enum.')) {
                // clear cache
                context.cacheObjectEnums = {};

                // update context.enums array
                if (obj) {
                    // If new
                    if (context.enums.includes(id) === -1) {
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

            // update stored time format for variables.dayTime
            if (id === adapter.namespace + '.variables.dayTime' && obj && obj.native) {
                context.timeSettings.format12 = obj.native.format12 || false;
                context.timeSettings.leadingZeros = obj.native.leadingZeros === undefined ? true : obj.native.leadingZeros;
            }

            // send changes to disk mirror
            mirror && mirror.onObjectChange(id, obj);

            context.subscriptionsObject.forEach(sub => {
                // ToDo: implement comparation with id.0.* too
                if (sub.pattern === id) {
                    try {
                        sub.callback(id, obj);
                    } catch (err) {
                        adapter.log.error(`Error in callback: ${err}`);
                    }
                }
            });

            if (obj) {
                // add state to state ID's list
                if (obj.type === 'state' && !context.stateIds.includes(id)) {
                    context.stateIds.push(id);
                    context.stateIds.sort();
                }
            } else {
                // delete object from state ID's list
                const pos = context.stateIds.indexOf(id);
                pos !== -1 && context.stateIds.splice(pos, 1);
            }

            if (!obj) {
                // object deleted
                if (!context.objects[id]) {
                    return;
                }

                // Script deleted => remove it
                if (context.objects[id].type === 'script' && context.objects[id].common.engine === 'system.adapter.' + adapter.namespace) {
                    stop(id);

                    // delete scriptEnabled.blabla variable
                    const idActive = 'scriptEnabled.' + id.substring('script.js.'.length);
                    adapter.delObject(idActive);
                    adapter.delState(idActive);

                    // delete scriptProblem.blabla variable
                    const idProblem = 'scriptProblem.' + id.substring('script.js.'.length);
                    adapter.delObject(idProblem);
                    adapter.delState(idProblem);
                }

                removeFromNames(id);
                delete context.objects[id];
            } else if (!context.objects[id]) {
                // New object
                context.objects[id] = obj;

                addToNames(obj);

                if (obj.type === 'script' && obj.common.engine === 'system.adapter.' + adapter.namespace) {
                    // create states for scripts
                    createActiveObject(id, obj.common.enabled, () => createProblemObject(id));

                    if (obj.common.enabled) {
                        if (checkIsGlobal(obj)) {
                            // restart adapter
                            adapter.getForeignObject('system.adapter.' + adapter.namespace, (err, _obj) =>
                                _obj && adapter.setForeignObject('system.adapter.' + adapter.namespace, _obj));
                            return;
                        }

                        // Start script
                        load(id);
                    }
                }
                // added new script to this engine
            } else if (context.objects[id].common) {
                // Object just changed
                if (obj.type !== 'script') {
                    context.objects[id] = obj;

                    if (id === 'system.config') {
                        // set language for debug messages
                        if (obj.common && obj.common.language) {
                            words.setLanguage(obj.common.language);
                        }
                    }

                    const n = getName(id);
                    let nn = context.objects[id].common.name;

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

                    return;
                }

                // Analyse type = 'script'

                if (checkIsGlobal(context.objects[id])) {
                    // restart adapter
                    adapter.getForeignObject('system.adapter.' + adapter.namespace, (err, obj) =>
                        obj && adapter.setForeignObject('system.adapter.' + adapter.namespace, obj));

                    return;
                }

                if (obj.common && obj.common.engine === 'system.adapter.' + adapter.namespace) {
                    // create states for scripts
                    createActiveObject(id, obj.common.enabled, () => createProblemObject(id));
                }

                if ((context.objects[id].common.enabled && !obj.common.enabled) ||
                    (context.objects[id].common.engine === 'system.adapter.' + adapter.namespace && obj.common.engine !== 'system.adapter.' + adapter.namespace)) {

                    // Script disabled
                    if (context.objects[id].common.enabled && context.objects[id].common.engine === 'system.adapter.' + adapter.namespace) {
                        // Remove it from executing
                        context.objects[id] = obj;
                        stop(id);
                    } else {
                        context.objects[id] = obj;
                    }
                } else if ((!context.objects[id].common.enabled && obj.common.enabled) ||
                    (context.objects[id].common.engine !== 'system.adapter.' + adapter.namespace && obj.common.engine === 'system.adapter.' + adapter.namespace)) {
                    // Script enabled
                    context.objects[id] = obj;

                    if (context.objects[id].common.enabled && context.objects[id].common.engine === 'system.adapter.' + adapter.namespace) {
                        // Start script
                        load(id);
                    }
                } else { //if (obj.common.source !== context.objects[id].common.source) {
                    context.objects[id] = obj;

                    // Source changed => restart it
                    stopCounters[id] = stopCounters[id] ? stopCounters[id] + 1 : 1;
                    stop(id, (res, _id) =>
                        // only start again after stop when "last" object change to prevent problems on
                        // multiple changes in fast frequency
                        !--stopCounters[id] && load(_id));
                } /*else {
                // Something changed or not for us
                objects[id] = obj;
            }*/
            }
        },

        stateChange: (id, state) => {
            if (!id || id.startsWith('messagebox.') || id.startsWith('log.')) {
                return;
            }

            if (id === adapter.namespace + '.debug.to' && state && !state.ack) {
                return !debugMode && debugSendToInspector(state.val);
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

        unload: callback => {
            debugStop()
                .then(() => {
                    stopTimeSchedules();
                    stopAllScripts(callback);
                });
        },

        ready: () => {
            mods.request.setLogger(adapter.log);

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
                                        if (eventData.stacktrace.frames.find(frame => frame.filename && frame.filename.includes(scriptCodeMarker))) {
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
                    case 'jsMessageBus':
                        if (obj.message && (
                            obj.message.instance === null ||
                            obj.message.instance === undefined ||
                            ('javascript.' + obj.instance === adapter.namespace) ||
                            (obj.instance === adapter.namespace)
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
                                            adapter.setState('scriptProblem.' + name.substring('script.js.'.length), true, true);
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
                            typings[globalScriptPaths + '.d.ts'] = knownGlobalDeclarationsByScript[globalScriptPaths];
                        }

                        if (obj.callback) {
                            adapter.sendTo(obj.from, obj.command, {typings}, obj.callback);
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
                }
            }
        },

        /**
         * If the JS-Controller catches an unhandled error, this will be called
         * so we have a chance to handle it ourself.
         * @param {Error} err
         */
        error: (err) => {
            // Identify unhandled errors originating from callbacks in scripts
            // These are not caught by wrapping the execution code in try-catch
            if (err && typeof err.stack === 'string') {
                const scriptCodeMarkerIndex = err.stack.indexOf(scriptCodeMarker);
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



function main() {
    // todo
    context.errorLogFunction = webstormDebug ? console : adapter.log;
    activeStr = adapter.namespace + '.scriptEnabled.';

    mods.fs = new require('./lib/protectFs')(adapter.log);

    // try to read TS declarations
    try {
        tsAmbient = {
            'javascript.d.ts': nodeFS.readFileSync(mods.path.join(__dirname, 'lib/javascript.d.ts'), 'utf8')
        };
        tsServer.provideAmbientDeclarations(tsAmbient);
        jsDeclarationServer.provideAmbientDeclarations(tsAmbient);
    } catch (e) {
        adapter.log.warn('Could not read TypeScript ambient declarations: ' + e);
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

    context.scheduler = new Scheduler(adapter.log, Date, mods.suncalc, adapter.config.latitude, adapter.config.longitude);

    installLibraries(() => {

        // Load the TS declarations for Node.js and all 3rd party modules
        loadTypeScriptDeclarations();

        getData(() => {
            dayTimeSchedules(adapter, context);
            timeSchedule(adapter, context);

            adapter.subscribeForeignObjects('*');

            if (!adapter.config.subscribe) {
                adapter.subscribeForeignStates('*');
            }

            // Warning. It could have a side-effect in compact mode, so all adapters will accept self signed certificates
            if (adapter.config.allowSelfSignedCerts) {
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            }

            adapter.getObjectView('script', 'javascript', {}, (err, doc) => {
                globalScript = '';
                globalDeclarations = '';
                knownGlobalDeclarationsByScript = {};
                let count = 0;
                if (doc && doc.rows && doc.rows.length) {
                    // assemble global script
                    for (let g = 0; g < doc.rows.length; g++) {
                        if (checkIsGlobal(doc.rows[g].value)) {
                            const obj = doc.rows[g].value;

                            if (obj && obj.common.enabled) {
                                const engineType = (obj.common.engineType || '').toLowerCase();
                                if (engineType.startsWith('coffee')) {
                                    count++;
                                    coffeeCompiler.fromSource(obj.common.source, {
                                        sourceMap: false,
                                        bare: true
                                    }, (err, js) => {
                                        if (err) {
                                            adapter.log.error(`coffee compile ${err}`);
                                            return;
                                        }
                                        globalScript += js + '\n';
                                        if (!--count) {
                                            globalScriptLines = globalScript.split(/\r\n|\n|\r/g).length;
                                            // load all scripts
                                            for (let i = 0; i < doc.rows.length; i++) {
                                                if (!checkIsGlobal(doc.rows[i].value)) {
                                                    load(doc.rows[i].value._id);
                                                }
                                            }
                                        }
                                    });
                                } else if (engineType.startsWith('typescript')) {
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

                if (!count) {
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
                }

                if (adapter.config.mirrorPath) {
                    adapter.config.mirrorInstance = parseInt(adapter.config.mirrorInstance, 10) || 0;
                    if (adapter.instance === adapter.config.mirrorInstance) {
                        mirror = new Mirror({
                            adapter,
                            log: adapter.log,
                            diskRoot: adapter.config.mirrorPath
                        });
                    }
                }

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
let daySchedule        = null; // schedule for astrological day
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
        // take next day
        ts.setDate(ts.getDate() + 1);
    }
    return ts;
}

function timeSchedule(adapter, context) {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    if (context.timeSettings.format12) {
        if (hours > 12) {
            hours -= 12;
        }
    }
    if (context.timeSettings.leadingZeros && hours < 10) {
        hours = '0' + hours;
    }
    if (minutes < 10) {
        minutes = '0' + minutes;
    }
    adapter.setState('variables.dayTime', hours + ':' + minutes, true);
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

    let isDay;
    if (sunriseTimeout < 5000) {
        isDay = true;
    } else if (sunsetTimeout < 5000) {
        isDay = false;
    } else {
        // check if in between
        isDay = nowDate.getTime() > (todaySunrise.getTime() - 60000) && nowDate <= todaySunset;
    }

    adapter.getState('variables.isDayTime', (err, state) => {
        const val = state ? !!state.val : false;
        if (val !== isDay) {
            adapter.setState('variables.isDayTime', isDay, true);
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

    daySchedule = setTimeout(dayTimeSchedules, nextTimeout, adapter, context);
}

function stopTimeSchedules() {
    daySchedule && clearTimeout(daySchedule);
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
// Due to an npm bug, virtual-tsc may be hoisted to the top level node_modules but
// typescript may still be in the adapter level (https://npm.community/t/packages-with-peerdependencies-are-incorrectly-hoisted/4794)
// so we need to tell virtual-tsc where typescript is
tsc.setTypeScriptResolveOptions({
    paths: [require.resolve('typescript')],
});
// compiler instance for typescript
tsServer = new tsc.Server(tsCompilerOptions, tsLog);
// compiler instance for global JS declarations
jsDeclarationServer = new tsc.Server(
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
    const idActive = `${adapter.namespace}.scriptEnabled.${id.substring('script.js.'.length)}`;

    if (!context.objects[idActive]) {
        context.objects[idActive] = {
            _id: idActive,
            common: {
                name: `scriptEnabled.${id.substring('script.js.'.length)}`,
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
                adapter.setForeignState(idActive, !!enabled, true, cb);
            } else if (cb) {
                cb();
            }
        });
    } else {
        adapter.getForeignState(idActive, (err, state) => {
            if (state && state.val !== enabled) {
                adapter.setForeignState(idActive, !!enabled, true, cb);
            } else if (cb) {
                cb();
            }
        });
    }
}

function createProblemObject(id, cb) {
    const idProblem = adapter.namespace + '.scriptProblem.' + id.substring('script.js.'.length);

    if (!context.objects[idProblem]) {
        context.objects[idProblem] = {
            _id: idProblem,
            common: {
                name: 'scriptProblem.' + id.substring('script.js.'.length),
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
        let pos;
        if (context.names[n] === 'object') {
            pos = context.names[n].indexOf(id);
            if (pos !== -1) {
                context.names[n].splice(pos, 1);
                if (context.names[n].length) {
                    context.names[n] = context.names[n][0];
                }
            }
        } else {
            delete context.names[n];
        }
    }
}

function getName(id) {
    let pos;
    for (const n in context.names) {
        if (context.names.hasOwnProperty(n)) {
            if (context.names[n] && typeof context.names[n] === 'object') {
                pos = context.names[n].indexOf(id);
                if (pos !== -1) {
                    return n;
                }
            } else if (context.names[n] === id) {
                return n;
            }
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
    const cmd = `npm install ${npmLib} --production`;
    adapter.log.info(`${cmd} (System call)`);
    // Install node modules as system call

    // System call used for update of js-controller itself,
    // because during installation npm packet will be deleted too, but some files must be loaded even during the install process.
    const child = mods['child_process'].exec(cmd, {
        windowsHide: true,
        cwd: path,
    });

    child.stdout.on('data', buf =>
        adapter.log.info(buf.toString('utf8')));

    child.stderr.on('data', buf =>
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
                const libName = libraries[lib].split('@')[0];
                if (!nodeFS.existsSync(__dirname + '/node_modules/' + libName + '/package.json')) {

                    if (!attempts[libraries[lib]]) {
                        attempts[libraries[lib]] = 1;
                    } else {
                        attempts[libraries[lib]]++;
                    }
                    if (attempts[libraries[lib]] > 3) {
                        adapter.log.error('Cannot install npm packet: ' + libraries[lib]);
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
    if (allInstalled) callback();
}

function createVM(source, name) {
    if (debugMode && name !== debugMode) {
        return false;
    }

    if (!debugMode) {
        source += "\n;\nlog('registered ' + __engine.__subscriptions + ' subscription' + (__engine.__subscriptions === 1 ? '' : 's' ) + ' and ' + __engine.__schedules + ' schedule' + (__engine.__schedules === 1 ? '' : 's' ));\n";
    } else {
        if (source.startsWith('(async () => {\n')) {
            source = '(async () => {debugger;\n' + source.substring('(async () => {\n'.length);
        } else {
            source = 'debugger;' + source;
        }
    }
    try {
        if (VMScript) {
            return {
                script: new VMScript(source, name)
            };
        } else {
            const options = {
                filename: name,
                displayErrors: true
                //lineOffset: globalScriptLines
            };
            return {
                script: vm.createScript(source, options)
            };
        }
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
    adapter.setState('scriptProblem.' + name.substring('script.js.'.length), { val: false, ack: true, expire: 1000 });

    const sandbox = sandBox(script, name, verbose, debug, context);

    if (NodeVM) {
        const vm = new NodeVM({
            sandbox,
            require: {
                external: true,
                builtin: ['*'],
                root: '',
                mock: mods
            }
        });

        try {
            vm.run(script.script, name);
        } catch (e) {
            adapter.setState('scriptProblem.' + name.substring('script.js.'.length), true, true);
            context.logError(name, e);
        }
    } else {
        try {
            script.script.runInNewContext(sandbox, {
                filename: name,
                displayErrors: true
                //lineOffset: globalScriptLines
            });
        } catch (e) {
            adapter.setState('scriptProblem.' + name.substring('script.js.'.length), true, true);
            context.logError(name, e);
        }
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

    adapter.setState('scriptEnabled.' + name.substring('script.js.'.length), false, true);

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
            for (const id in context.scripts[name].subscribes) {
                if (!context.scripts[name].subscribes.hasOwnProperty(id)) continue;
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
            }
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
                if (!nodeSchedule.cancelJob(context.scripts[name].schedules[i])) {
                    adapter.log.error('Error by canceling scheduled job "' + _name + '"');
                }
            }
        }

        // Stop all time wizards jobs
        for (let i = 0; i < context.scripts[name].wizards.length; i++) {
            if (context.scripts[name].wizards[i]) {
                context.scheduler.remove(context.scripts[name].wizards[i]);
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
        obj.common.source) {
        const name = obj._id;

        const nameId = name.substring('script.js.'.length);
        if (!nameId.length || nameId.endsWith('.')) {
            adapter.log.error(`Script name ${name} is invalid!`);
            typeof callback === 'function' && callback(false, name);
            return;
        }
        adapter.setState(`scriptEnabled.${nameId}`, true, true);
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
            context.scripts[name] && execute(context.scripts[name], sourceFn, obj.common.verbose, obj.common.debug);
            typeof callback === 'function' && callback(true, name);
        } else if (obj.common.engineType.toLowerCase().startsWith('coffee')) {
            // CoffeeScript
            coffeeCompiler.fromSource(obj.common.source, { sourceMap: false, bare: true }, (err, js) => {
                if (err) {
                    adapter.log.error(`${name} coffee compile ${err}`);
                    typeof callback === 'function' && callback(false, name);
                    return;
                }
                adapter.log.info(`Start coffescript ${name}`);
                context.scripts[name] = createVM(`(async () => {\n${globalScript + '\n' + js}\n})();`, name);
                context.scripts[name] && execute(context.scripts[name], name, obj.common.verbose, obj.common.debug);
                typeof callback === 'function' && callback(true, name);
            });
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
            context.scripts[name] && execute(context.scripts[name], name, obj.common.verbose, obj.common.debug);
            typeof callback === 'function' && callback(true, name);
        }
    } else {
        let _name;
        if (obj && obj._id) {
            _name = obj._id;
            const scriptIdName = _name.substring('script.js.'.length);

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
            if (patternFunctions.logic === 'or') return true;

            matched = true;
        } else if (patternFunctions.logic === 'and') {
            return false;
        }
    }
    return matched;
}

function getData(callback) {
    let statesReady;
    let objectsReady;
    adapter.log.info('requesting all states');
    adapter.getForeignStates('*', (err, res) => {
        if (!adapter.config.subscribe) {
            context.states = res;
        }

        addGetProperty(context.states);

        // remember all IDs
        for (const id in res) {
            if (res.hasOwnProperty(id)) {
                context.stateIds.push(id);
            }
        }
        statesReady = true;
        adapter.log.info('received all states');
        objectsReady && typeof callback === 'function' && callback();
    });

    adapter.log.info('requesting all objects');

    adapter.getObjectList({ include_docs: true }, (err, res) => {
        res = res.rows;
        context.objects = {};
        for (let i = 0; i < res.length; i++) {
            if (!res[i].doc) {
                adapter.log.debug('Got empty object for index ' + i + ' (' + res[i].id + ')');
                continue;
            }
            context.objects[res[i].doc._id] = res[i].doc;
            res[i].doc.type === 'enum' && context.enums.push(res[i].doc._id);

            // Collect all names
            addToNames(context.objects[res[i].doc._id]);
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

        objectsReady = true;
        adapter.log.info('received all objects');
        statesReady && typeof callback === 'function' && callback();
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
                .then(() => adapter.log.info(`Debugging of ${id} was stopped, because started in normal mode`));
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
    // stop script if it running
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
                    stdio: ['ignore', 'inherit', 'inherit', 'ipc']
                    //stdio: ['pipe', 'pipe', 'pipe', 'ipc']
                };
                const args = [];
                if (debugState.adapterInstance) {
                    args.push('--breakOnStart');
                }

                debugState.child = fork(__dirname + '/lib/inspect.js', args, options);

                /*debugState.child.stdout.setEncoding('utf8');
                debugState.child.stderr.setEncoding('utf8');
                debugState.child.stdout.on('data', childPrint);
                debugState.child.stderr.on('data', childPrint);*/

                debugState.child.on('message', message => {
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
                            console.log(`PAUSED`);
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
                            console.log(`readyToDebug (set breakpoints): [${message.scriptId}] ${message.script}`);
                            break;
                        }
                    }
                });
                debugState.child.on('error', error => {
                    adapter.log.error('Cannot start inspector: ' + error);
                    adapter.setState('debug.from', JSON.stringify({cmd: 'error', error}), true);
                });

                debugState.child.on('exit', code => {
                    if (code) {
                        adapter.setState('debug.from', JSON.stringify({cmd: 'error', error: 'invalid response code: ' + code}), true);
                    }
                    adapter.setState('debug.from', JSON.stringify({cmd: 'debugStopped', code}), true);
                    debugState.child = null;
                    resolve(code);
                });
            });
        });
}

// If started as allInOne mode => return function to create instance
if (module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
}
