/*
 * Javascript adapter
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2014-2024 bluefox <dogafox@gmail.com>,
 *
 * Copyright (c) 2014      hobbyquaker
 */

import { Script, type ScriptOptions } from 'node:vm';
import { readFileSync, existsSync, statSync, writeFileSync, type Stats } from 'node:fs';
import { join, sep, normalize } from 'node:path';
import { fork, type ForkOptions } from 'node:child_process';
import { setTypeScriptResolveOptions, Server } from 'virtual-tsc';
import { isDeepStrictEqual } from 'node:util';

import * as dgram from 'node:dgram';
import * as crypto from 'node:crypto';
import * as dns from 'node:dns';
import * as events from 'node:events';
import * as http from 'node:http';
import * as https from 'node:https';
import * as http2 from 'node:http2';
import * as net from 'node:net';
import * as os from 'node:os';
import * as path from 'node:path';
import * as util from 'node:util';
import * as child_process from 'node:child_process';
import * as stream from 'node:stream';
import * as zlib from 'node:zlib';

import * as suncalc from 'suncalc2';
import * as axios from 'axios';
import * as wake_on_lan from 'wake_on_lan';
import * as nodeSchedule from 'node-schedule';

import { getAbsoluteDefaultDataDir, Adapter, EXIT_CODES, type AdapterOptions } from '@iobroker/adapter-core';
import type SentryPlugin from '@iobroker/plugin-sentry';
import type { GetTimesResult } from 'suncalc';
import type { CompileResult } from 'virtual-tsc/build/util';

import { Mirror } from './lib/mirror';
import ProtectFs from './lib/protectFs';
import { setLanguage, getLanguage } from './lib/words';
import { sandBox } from './lib/sandbox';
import { requestModuleNameByUrl } from './lib/nodeModulesManagement';
import { createEventObject, type EventObj } from './lib/eventObj';
import { type AstroEventName, Scheduler } from './lib/scheduler';
import { targetTsLib, tsCompilerOptions, jsDeclarationCompilerOptions } from './lib/typescriptSettings';
import { hashSource } from './lib/tools';
import {
    resolveTypescriptLibs,
    resolveTypings,
    scriptIdToTSFilename,
    transformScriptBeforeCompilation,
    transformGlobalDeclarations,
} from './lib/typescriptTools';
import type {
    FileSubscriptionResult,
    JavascriptContext,
    JavaScriptAdapterConfig,
    JsScript,
    ScriptType,
    SubscriptionResult,
    SubscribeObject,
    JavascriptTimer,
    SandboxType,
    LogMessage,
    DebugState,
} from './types';
import type { PatternEventCompareFunction } from './lib/patternCompareFunctions';

type MODULES = {
    fs: ProtectFs;
    dgram: typeof dgram;
    crypto: typeof crypto;
    dns: typeof dns;
    events: typeof events;
    http: typeof http;
    https: typeof https;
    http2: typeof http2;
    net: typeof net;
    os: typeof os;
    path: typeof path;
    util: typeof util;
    child_process: typeof child_process;
    stream: typeof stream;
    zlib: typeof zlib;
    suncalc: typeof suncalc;
    axios: typeof axios;
    wake_on_lan: typeof wake_on_lan;
    nodeSchedule: typeof nodeSchedule;
};

/**
 * List of forbidden Locations for a mirror directory
 * relative to the default data directory
 * ATTENTION: the same list is also located in index_m.html!!
 */
const forbiddenMirrorLocations: string[] = [
    'backup-objects',
    'files',
    'backitup',
    '../backups',
    '../node_modules',
    '../log',
];

const packageJson: Record<string, any> = JSON.parse(readFileSync(`${__dirname}/../package.json`).toString());
const SCRIPT_CODE_MARKER = 'script.js.';

let webstormDebug: string | undefined;

const isCI = !!process.env.CI;

// ambient declarations for typescript
let tsAmbient: Record<string, string>;

// TypeScript's scripts are only recompiled if their source hash changes.
// If an adapter update fixes the compilation bugs, a user won't notice until the changes and re-saves the script.
// To avoid that, we also include the
// adapter version and TypeScript version in the hash
const tsSourceHashBase = `versions:adapter=${packageJson.version},typescript=${packageJson.dependencies.typescript}`;

// taken from here: https://stackoverflow.com/questions/11887934/how-to-check-if-dst-daylight-saving-time-is-in-effect-and-if-so-the-offset
function dstOffsetAtDate(dateInput: Date): number {
    const fullYear: number = dateInput.getFullYear() | 0;
    // "Leap Years are any year that can be exactly divided by 4 (2012, 2016, etc)
    //   except if it can be exactly divided by 100, then it isn't (2100, 2200, etc)
    //    except if it can be exactly divided by 400, then it is (2000, 2400)"
    // (https://www.mathsisfun.com/leap-years.html).
    const isLeapYear: 1 | 0 = ((fullYear & 3) | ((fullYear / 100) & 3)) === 0 ? 1 : 0;
    // (fullYear & 3) = (fullYear % 4), but faster
    //Alternative:var isLeapYear=(new Date(currentYear,1,29,12)).getDate()===29?1:0
    const fullMonth: number = dateInput.getMonth() | 0;
    return (
        // 1. We know what the time since the Epoch really is
        +dateInput - // same as the dateInput.getTime() method
        // 2. We know what the time since the Epoch at the start of the year is
        +new Date(fullYear, 0) - // day defaults to 1 if not explicitly zeroed
        // 3. Now, subtract what we would expect the time to be if daylight savings
        //      did not exist. This yields the time-offset due to daylight savings.
        // Calculate the day of the year in the Gregorian calendar
        // The code below works based upon the facts of signed right shifts
        //    • (x) >> n: shifts n and fills in the n highest bits with 0s
        //    • (-x) >> n: shifts n and fills in the n highest bits with 1s
        // (This assumes that x is a positive integer)
        ((((-1 + // the first day in the year is day 1
            (31 & (-fullMonth >> 4)) + // January // (-11)>>4 = -1
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
            // Thus, "fullMonth" is 0-based, so it will never be 12 in JavaScript

            (dateInput.getDate() | 0)) & // get day of the month
            0xffff) *
            24 *
            60 + // 24 hours in a day, 60 minutes in an hour
            (dateInput.getHours() & 0xff) * 60 + // 60 minutes in an hour
            (dateInput.getMinutes() & 0xff)) |
            0) *
            60 *
            1000 - // 60 seconds in a minute * 1000 milliseconds in a second
        (dateInput.getSeconds() & 0xff) * 1000 - // 1000 milliseconds in a second
        dateInput.getMilliseconds()
    );
}

const regExGlobalOld = /_global$/;
const regExGlobalNew = /script\.js\.global\./;

function checkIsGlobal(obj: ioBroker.ScriptObject): boolean {
    return obj?.common && (regExGlobalOld.test(obj.common.name) || regExGlobalNew.test(obj._id));
}

function fileMatching(sub: FileSubscriptionResult, id: string, fileName: string): boolean {
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

function getNextTimeEvent(time: string, useNextDay?: boolean): Date {
    const now: Date = getAstroStartOfDay();
    const [timeHours, timeMinutes] = time.split(':');
    const nTimeHours = parseInt(timeHours, 10);
    const nTimeMinutes = parseInt(timeMinutes, 10);
    if (
        useNextDay &&
        (now.getHours() > nTimeHours || (now.getHours() === nTimeHours && now.getMinutes() > nTimeMinutes))
    ) {
        now.setDate(now.getDate() + 1);
    }

    now.setHours(nTimeHours);
    now.setMinutes(nTimeMinutes);

    return now;
}

function getAstroStartOfDay(): Date {
    const d = new Date();
    d.setMinutes(0);
    d.setSeconds(0);
    d.setMilliseconds(0);
    d.setTime(d.getTime() - d.getTimezoneOffset() * 60 * 1000);
    d.setUTCHours(0);

    return d;
}

function formatHoursMinutesSeconds(date: Date): string {
    const h = String(date.getHours());
    const m = String(date.getMinutes());
    const s = String(date.getSeconds());

    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${s.padStart(2, '0')}`;
}

// Due to a npm bug, virtual-tsc may be hoisted to the top level node_modules but
// typescript may still be in the adapter level (https://npm.community/t/packages-with-peerdependencies-are-incorrectly-hoisted/4794),
// so we need to tell virtual-tsc where typescript is
setTypeScriptResolveOptions({
    paths: [require.resolve('typescript')],
});

// compiler instance for global JS declarations
const jsDeclarationServer: Server = new Server(jsDeclarationCompilerOptions, isCI ? false : undefined);
/**
 * Stores the IDs of script objects whose change should be ignored because
 * the compiled source was just updated
 */

class JavaScript extends Adapter {
    public declare config: JavaScriptAdapterConfig;

    private readonly context: JavascriptContext;

    private errorLogFunction: {
        error: (msg: string) => void;
        warn: (msg: string) => void;
        info: (msg: string) => void;
        debug: (msg: string) => void;
        silly: (msg: string) => void;
    };

    private readonly mods: MODULES;

    private objectsInitDone = false;
    private statesInitDone = false;

    private objects: Record<string, ioBroker.Object> = {};
    private states: Record<string, ioBroker.State> = {};
    private readonly interimStateValues: Record<string, ioBroker.State> = {};
    private readonly stateIds: string[] = [];
    private readonly subscriptions: SubscriptionResult[] = [];
    private readonly subscriptionsFile: FileSubscriptionResult[] = [];
    private readonly subscriptionsObject: SubscribeObject[] = [];
    private readonly subscribedPatterns: Record<string, number> = {};
    private readonly subscribedPatternsFile: Record<string, number> = {};
    private readonly adapterSubs: Record<string, string[]> = {};
    private readonly timers: { [scriptName: string]: JavascriptTimer[] } = {};
    private readonly _enums: string[] = [];
    private readonly names: { [name: string]: string | string[] } = {}; // name: id
    private readonly scripts: Record<string, JsScript> = {};
    private readonly messageBusHandlers: Record<
        string,
        Record<string, { id: number; sandbox: SandboxType; cb: (data: any, result: any) => void }[]>
    > = {};
    private readonly logSubscriptions: Record<
        string,
        {
            sandbox: SandboxType;
            cb: (info: LogMessage) => void;
            id: number;
            severity: ioBroker.LogLevel | '*';
        }[]
    > = {};
    private readonly tempDirectories: { [scriptName: string]: string } = {}; // name: path
    private readonly folderCreationVerifiedObjects: Record<string, boolean> = {};

    /** if logs are subscribed or not */
    private logSubscribed = false;

    private timeSettings: {
        format12: boolean;
        leadingZeros: boolean;
    } = { format12: false, leadingZeros: true };

    private dayScheduleTimer: NodeJS.Timeout | null = null; // schedule for astrological day
    private sunScheduleTimer: NodeJS.Timeout | null = null; // schedule for sun moment times
    private timeScheduleTimer: NodeJS.Timeout | null = null; // schedule for astrological day

    private activeStr = ''; // enabled state prefix

    private mirror: Mirror | undefined;

    private stopCounters: Record<string, number> = {};

    private setStateCountCheckInterval: NodeJS.Timeout | null = null;

    private globalScript = '';
    /** Generated declarations for global TypeScripts */
    private globalDeclarations = '';
    // Remember which definitions the global scripts
    // have access to, because it depends on the compilation order
    private knownGlobalDeclarationsByScript = {};
    private globalScriptLines = 0;
    // compiler instance for typescript
    private tsServer: Server;

    private readonly ignoreObjectChange: Set<string> = new Set();

    private debugState: DebugState = {
        scriptName: '',
        child: null,
        promiseOnEnd: null,
        paused: false,
        started: 0,
        running: false,
    };

    constructor(options: Partial<AdapterOptions> = {}) {
        options = {
            ...options,
            name: 'javascript', // adapter name
            useFormatDate: true,
            /**
             * If the JS-Controller catches an unhandled error, this will be called
             * so we have a chance to handle it ourselves.
             */
            error: (err: Error): boolean => {
                // Identify unhandled errors originating from callbacks in scripts
                // These are not caught by wrapping the execution code in try-catch
                if (err && typeof err.stack === 'string') {
                    const scriptCodeMarkerIndex = err.stack.indexOf(SCRIPT_CODE_MARKER);
                    if (scriptCodeMarkerIndex > -1) {
                        // This is a script error
                        let scriptName = err.stack.substring(scriptCodeMarkerIndex);
                        scriptName = scriptName.substring(0, scriptName.indexOf(':'));
                        this.logError(scriptName, err);

                        // Leave the script running for now
                        // signal to the JS-Controller that we handled the error ourselves
                        return true;
                    }
                    // check if a path contains adaptername but not own node_module
                    // this regex matched "iobroker.javascript/" if NOT followed by "node_modules"
                    if (!err.stack.match(/iobroker\.javascript[/\\](?!.*node_modules).*/g)) {
                        // This is an error without any info on origin (mostly async errors like connection errors)
                        // also consider it as being from a script
                        this.log.error(
                            'An error happened which is most likely from one of your scripts, but the originating script could not be detected.',
                        );
                        this.log.error(`Error: ${err.message}`);
                        this.log.error(err.stack);

                        // signal to the JS-Controller that we handled the error ourselves
                        return true;
                    }
                }

                return false;
            },
        };

        super(options as AdapterOptions);

        this.on('objectChange', this.onObjectChange.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('ready', this.onReady.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
        this.on('fileChange', this.onFileChange.bind(this));
        this.on('log', this.onLog.bind(this));

        this.mods = {
            fs: {} as ProtectFs,
            dgram,
            crypto,
            dns,
            events,
            http,
            https,
            http2,
            net,
            os,
            path,
            util,
            child_process,
            stream,
            zlib,

            suncalc,
            axios,
            wake_on_lan,
            nodeSchedule,
        };

        // check the webstorm debug and just debug modes
        let debugMode: string | undefined;
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

        this.errorLogFunction = this.log;

        this.context = {
            mods: this.mods,
            objects: this.objects,
            states: this.states,
            interimStateValues: this.interimStateValues,
            stateIds: this.stateIds,
            errorLogFunction: this.errorLogFunction,
            subscriptions: this.subscriptions,
            subscriptionsFile: this.subscriptionsFile,
            subscriptionsObject: this.subscriptionsObject,
            subscribedPatterns: this.subscribedPatterns,
            subscribedPatternsFile: this.subscribedPatternsFile,
            adapterSubs: this.adapterSubs,
            cacheObjectEnums: {},
            timers: this.timers,
            enums: this._enums,
            names: this.names,
            scripts: this.scripts,
            messageBusHandlers: this.messageBusHandlers,
            logSubscriptions: this.logSubscriptions,
            tempDirectories: this.tempDirectories,
            folderCreationVerifiedObjects: this.folderCreationVerifiedObjects,

            isEnums: false, // If some subscription wants enum
            channels: null,
            devices: null,
            logWithLineInfo: this.logWithLineInfo.bind(this),
            scheduler: null,
            timerId: 0,
            rulesOpened: null, // opened rules
            language: this.language || 'en',

            updateLogSubscriptions: this.updateLogSubscriptions.bind(this),
            convertBackStringifiedValues: this.convertBackStringifiedValues.bind(this),
            updateObjectContext: this.updateObjectContext.bind(this),
            prepareStateObject: this.prepareStateObject.bind(this),
            debugMode,
            getAbsoluteDefaultDataDir,
            adapter: this as unknown as ioBroker.Adapter,
            logError: this.logError.bind(this),
        };

        this.tsServer = new Server(tsCompilerOptions, this.tsLog);
    }

    async onObjectChange(id: string, obj?: ioBroker.Object | null): Promise<void> {
        // Check if we should ignore this change (once!) because we just updated the compiled sources
        if (this.ignoreObjectChange.has(id)) {
            // Update the cached script object and do nothing more
            this.objects[id] = obj as ioBroker.Object;
            this.ignoreObjectChange.delete(id);
            return;
        }

        // When still in initializing: already remember current values,
        // but data structures are initialized elsewhere
        if (!this.objectsInitDone) {
            if (obj) {
                this.objects[id] = obj;
            }
            return;
        }

        if (id.startsWith('enum.')) {
            // clear cache
            this.context.cacheObjectEnums = {};

            // update this._enums array
            if (obj) {
                // If new
                if (!this._enums.includes(id)) {
                    this._enums.push(id);
                    this._enums.sort();
                }
            } else {
                const pos = this._enums.indexOf(id);
                // if deleted
                if (pos !== -1) {
                    this._enums.splice(pos, 1);
                }
            }
        }

        if (id === 'system.config' && obj?.common?.language) {
            // set language for debug messages
            setLanguage(obj.common.language);
            this.language = obj.common.language;
            this.context.language = this.language as ioBroker.Languages;
        }

        // update stored time format for variables.dayTime
        if (id === `${this.namespace}.variables.dayTime` && obj?.native) {
            this.timeSettings.format12 = obj.native.format12 || false;
            this.timeSettings.leadingZeros = obj.native.leadingZeros === undefined ? true : obj.native.leadingZeros;
        }

        // send changes to disk mirror
        this.mirror?.onObjectChange(id, obj as ioBroker.ScriptObject | null);

        const formerObj = this.objects[id];

        this.updateObjectContext(id, obj); // Update all Meta object data

        // for the alias object changes on the state objects, we need to manually update the
        // state cache value, because the new value is only published on the next change
        if (obj?.type === 'state' && id.startsWith('alias.0.')) {
            // execute async for speed
            this.getForeignStateAsync(id)
                .then(state => {
                    if (state) {
                        this.states[id] = state;
                    } else if (this.states[id] !== undefined) {
                        delete this.states[id];
                    }
                })
                .catch(() => {
                    /* ignore */
                });
        }

        this.subscriptionsObject.forEach(sub => {
            // ToDo: implement comparing with id.0.* too
            if (sub.pattern === id) {
                try {
                    sub.callback(id, obj);
                } catch (err: any) {
                    this.log.error(`Error in callback: ${err.toString()}`);
                }
            }
        });

        // handle Script object updates
        if (!obj && formerObj?.type === 'script') {
            // Object Deleted just now
            if (checkIsGlobal(formerObj)) {
                // it was a global Script, and it was enabled and is now deleted => restart adapter
                if (formerObj.common.enabled) {
                    this.log.info(`Active global Script ${id} deleted. Restart instance.`);
                    this.restart();
                }
            } else if (formerObj.common?.engine === `system.adapter.${this.namespace}`) {
                // It was a non-global Script and deleted => stop and remove it
                await this.stopScript(id);

                // delete scriptEnabled.blabla variable
                const idActive = `scriptEnabled.${id.substring(SCRIPT_CODE_MARKER.length)}`;
                await this.delStateAsync(idActive);
                await this.delObjectAsync(idActive);

                // delete scriptProblem.blabla variable
                const idProblem = `scriptProblem.${id.substring(SCRIPT_CODE_MARKER.length)}`;
                await this.delStateAsync(idProblem);
                await this.delObjectAsync(idProblem);
            }
        } else if (!formerObj && obj?.type === 'script') {
            // New script that does not exist before
            if (checkIsGlobal(obj)) {
                // new global script added => restart adapter
                if (obj.common.enabled) {
                    this.log.info(`Active global Script ${id} created. Restart instance.`);
                    this.restart();
                }
            } else if (obj.common?.engine === `system.adapter.${this.namespace}`) {
                // new non-global script - create states for scripts
                await this.createActiveObject(id, obj.common.enabled);
                await this.createProblemObject(id);
                if (obj.common.enabled) {
                    // if enabled => Start script
                    await this.loadScriptById(id);
                }
            }
        } else if (obj?.type === 'script' && formerObj?.common) {
            // Script changed ...
            if (checkIsGlobal(obj)) {
                if (obj.common.enabled || formerObj.common.enabled) {
                    this.log.info(`Global Script ${id} updated. Restart instance.`);
                    this.restart();
                }
            } else {
                // No global script
                if (obj.common?.engine === `system.adapter.${this.namespace}`) {
                    // create states for scripts
                    await this.createActiveObject(id, obj.common.enabled);
                    await this.createProblemObject(id);
                }

                if (
                    (formerObj.common.enabled && !obj.common.enabled) ||
                    (formerObj.common.engine === `system.adapter.${this.namespace}` &&
                        obj.common.engine !== `system.adapter.${this.namespace}`)
                ) {
                    // Script disabled
                    if (formerObj.common.enabled && formerObj.common.engine === `system.adapter.${this.namespace}`) {
                        // Remove it from executing
                        await this.stopScript(id);
                    }
                } else if (
                    (!formerObj.common.enabled && obj.common.enabled) ||
                    (formerObj.common.engine !== `system.adapter.${this.namespace}` &&
                        obj.common.engine === `system.adapter.${this.namespace}`)
                ) {
                    // Script enabled

                    if (obj.common.enabled && obj.common.engine === `system.adapter.${this.namespace}`) {
                        // Start script
                        await this.loadScriptById(id);
                    }
                } else {
                    // if (obj.common.source !== formerObj.common.source) {
                    // Source changed => restart the script
                    this.stopCounters[id] = this.stopCounters[id] ? this.stopCounters[id] + 1 : 1;
                    this.stopScript(id).then(() => {
                        // only start again after stop when "last" object change to prevent problems on
                        // multiple changes in fast frequency
                        if (!--this.stopCounters[id]) {
                            this.loadScriptById(id);
                        }
                    });
                }
            }
        }
    }

    onStateChange(id: string, state?: ioBroker.State | null): void {
        if (this.interimStateValues[id] !== undefined) {
            // any update invalidates the remembered interim value
            delete this.interimStateValues[id];
        }
        if (!id || id.startsWith('messagebox.') || id.startsWith('log.')) {
            return;
        }

        if (id === `${this.namespace}.debug.to` && state && !state.ack) {
            if (!this.context.debugMode) {
                this.debugSendToInspector(state.val);
            }
            return;
        }

        // When still in initializing: already remember current values,
        // but data structures are initialized elsewhere
        if (!this.statesInitDone) {
            if (state) {
                this.states[id] = state;
            }
            return;
        }

        const oldState: ioBroker.State | null | undefined = this.states[id];
        if (state) {
            if (oldState) {
                // enable or disable script
                if (!state.ack && id.startsWith(this.activeStr) && this.objects[id]?.native?.script) {
                    this.extendForeignObject(this.objects[id].native.script, {
                        common: { enabled: state.val },
                    });
                }

                // monitor if adapter is alive and send all subscriptions once more, after adapter goes online
                if (/*oldState && */ oldState.val === false && state.val && id.endsWith('.alive')) {
                    if (this.adapterSubs[id]) {
                        const parts = id.split('.');
                        const a = `${parts[2]}.${parts[3]}`;
                        for (let t = 0; t < this.adapterSubs[id].length; t++) {
                            this.log.info(`Detected coming adapter "${a}". Send subscribe: ${this.adapterSubs[id][t]}`);
                            this.sendTo(a, 'subscribe', this.adapterSubs[id][t]);
                        }
                    }
                }
            } else if (/*!oldState && */ !this.stateIds.includes(id)) {
                this.stateIds.push(id);
                this.stateIds.sort();
            }
            this.states[id] = state;
        } else {
            if (oldState) {
                delete this.states[id];
            }
            state = {} as ioBroker.State;
            const pos = this.stateIds.indexOf(id);
            if (pos !== -1) {
                this.stateIds.splice(pos, 1);
            }
        }
        const _eventObj = createEventObject(
            this.context,
            id,
            this.convertBackStringifiedValues(id, state),
            this.convertBackStringifiedValues(id, oldState),
        );

        // if this state matches any subscriptions
        for (let i = 0, l = this.subscriptions.length; i < l; i++) {
            const sub = this.subscriptions[i];
            if (sub?.patternCompareFunctions && patternMatching(_eventObj, sub.patternCompareFunctions)) {
                try {
                    sub.callback(_eventObj);
                } catch (err: any) {
                    this.log.error(`Error in callback: ${err.toString()}`);
                }
            }
        }
    }

    onFileChange(id: string, fileName: string, size: number | null): void {
        // if this file matches any subscriptions
        for (let i = 0, l = this.subscriptionsFile.length; i < l; i++) {
            const sub = this.subscriptionsFile[i];
            if (sub && fileMatching(sub, id, fileName)) {
                try {
                    sub.callback(id, fileName, size, sub.withFile);
                } catch (err: any) {
                    this.log.error(`Error in callback: ${err.toString()}`);
                }
            }
        }
    }

    async onUnload(callback: () => void): Promise<void> {
        await this.debugStop();
        this.stopTimeSchedules();
        if (this.setStateCountCheckInterval) {
            clearInterval(this.setStateCountCheckInterval);
            this.setStateCountCheckInterval = null;
        }
        await this.stopAllScripts();
        if (typeof callback === 'function') {
            callback();
        }
    }

    async onReady(): Promise<void> {
        this.config.maxSetStatePerMinute = parseInt(this.config.maxSetStatePerMinute as unknown as string, 10) || 1000;
        this.config.maxTriggersPerScript = parseInt(this.config.maxTriggersPerScript as unknown as string, 10) || 100;

        if (this.supportsFeature && this.supportsFeature('PLUGINS')) {
            const sentryInstance: InstanceType<typeof SentryPlugin> = this.getPluginInstance('sentry') as InstanceType<
                typeof SentryPlugin
            >;
            if (sentryInstance) {
                const Sentry = sentryInstance.getSentryObject();
                if (Sentry) {
                    const scope = Sentry.getCurrentScope();
                    scope.addEventProcessor((event, _hint) => {
                        if (event.exception?.values?.[0]) {
                            const eventData = event.exception.values[0];
                            if (
                                eventData.stacktrace?.frames &&
                                Array.isArray(eventData.stacktrace.frames) &&
                                eventData.stacktrace.frames.length
                            ) {
                                // Exclude event if script Marker is included
                                if (
                                    eventData.stacktrace.frames.find(frame =>
                                        frame.filename?.includes(SCRIPT_CODE_MARKER),
                                    )
                                ) {
                                    return null;
                                }
                                //Exclude event if own directory is included but not inside own node_modules
                                const ownNodeModulesDir = join(__dirname, 'node_modules');
                                if (
                                    !eventData.stacktrace.frames.find(
                                        frame =>
                                            frame.filename &&
                                            frame.filename.includes(__dirname) &&
                                            !frame.filename.includes(ownNodeModulesDir),
                                    )
                                ) {
                                    return null;
                                }
                                // We have exception data and did not sort it out, so report it
                                return event;
                            }
                        }

                        // No exception in it ... do not report
                        return null;
                    });
                }
            }
        }

        await this.main();
    }

    onMessage(obj: ioBroker.Message): void {
        switch (obj?.command) {
            // process messageTo commands
            case 'toScript':
            case 'jsMessageBus':
                if (
                    obj.message &&
                    (obj.message.instance === null ||
                        obj.message.instance === undefined ||
                        `javascript.${obj.message.instance}` === this.namespace ||
                        obj.message.instance === this.namespace)
                ) {
                    Object.keys(this.messageBusHandlers).forEach(name => {
                        // script name could be script.js.xxx or only xxx
                        if (
                            (!obj.message.script || obj.message.script === name) &&
                            this.messageBusHandlers[name][obj.message.message]
                        ) {
                            this.messageBusHandlers[name][obj.message.message].forEach(handler => {
                                const sandbox = handler.sandbox;

                                sandbox.verbose && sandbox.log(`onMessage: ${JSON.stringify(obj.message)}`, 'info');

                                try {
                                    if (obj.callback) {
                                        handler.cb.call(sandbox, obj.message.data, result => {
                                            if (sandbox.verbose) {
                                                sandbox.log(`onMessage result: ${JSON.stringify(result)}`, 'info');
                                            }

                                            this.sendTo(obj.from, obj.command, result, obj.callback);
                                        });
                                    } else {
                                        handler.cb.call(sandbox, obj.message.data, result => {
                                            sandbox.verbose &&
                                                sandbox.log(`onMessage result: ${JSON.stringify(result)}`, 'info');
                                        });
                                    }
                                } catch (err: unknown) {
                                    this.setState(
                                        `scriptProblem.${name.substring(SCRIPT_CODE_MARKER.length)}`,
                                        true,
                                        true,
                                    );
                                    this.logError('Error in callback', err as Error);
                                }
                            });
                        }
                    });
                }
                break;

            case 'loadTypings': {
                // Load typings for the editor
                const typings = {};

                // try to load TypeScript lib files from disk
                try {
                    const typescriptLibs = resolveTypescriptLibs(targetTsLib);
                    Object.assign(typings, typescriptLibs);
                } catch {
                    /* ok, no lib then */
                }

                // provide the already-loaded ioBroker typings and global script declarations
                Object.assign(typings, tsAmbient);

                // also provide the known global declarations for each global script
                for (const globalScriptPaths of Object.keys(this.knownGlobalDeclarationsByScript)) {
                    typings[`${globalScriptPaths}.d.ts`] = this.knownGlobalDeclarationsByScript[globalScriptPaths];
                }

                if (obj.callback) {
                    this.sendTo(obj.from, obj.command, { typings }, obj.callback);
                }
                break;
            }

            case 'calcAstroAll': {
                if (obj.message) {
                    const sunriseOffset =
                        parseInt(
                            obj.message.sunriseOffset === undefined
                                ? this.config.sunriseOffset
                                : obj.message.sunriseOffset,
                            10,
                        ) || 0;
                    const sunsetOffset =
                        parseInt(
                            obj.message.sunsetOffset === undefined
                                ? this.config.sunsetOffset
                                : obj.message.sunsetOffset,
                            10,
                        ) || 0;
                    const longitude =
                        parseFloat(
                            obj.message.longitude === undefined ? this.config.longitude : obj.message.longitude,
                        ) || 0;
                    const latitude =
                        parseFloat(obj.message.latitude === undefined ? this.config.latitude : obj.message.latitude) ||
                        0;
                    const today = getAstroStartOfDay();
                    let astroEvents: GetTimesResult & { nextSunrise: Date; nextSunset: Date } = {} as GetTimesResult & {
                        nextSunrise: Date;
                        nextSunset: Date;
                    };
                    try {
                        astroEvents = this.mods.suncalc.getTimes(today, latitude, longitude);
                    } catch (err: unknown) {
                        this.log.error(`Cannot calculate astro data: ${err as Error}`);
                    }
                    if (astroEvents) {
                        try {
                            astroEvents.nextSunrise = this.getAstroEvent(
                                today,
                                obj.message.sunriseEvent || this.config.sunriseEvent,
                                obj.message.sunriseLimitStart || this.config.sunriseLimitStart,
                                obj.message.sunriseLimitEnd || this.config.sunriseLimitEnd,
                                sunriseOffset,
                                false,
                                latitude,
                                longitude,
                                true,
                            );
                            astroEvents.nextSunset = this.getAstroEvent(
                                today,
                                obj.message.sunsetEvent || this.config.sunsetEvent,
                                obj.message.sunsetLimitStart || this.config.sunsetLimitStart,
                                obj.message.sunsetLimitEnd || this.config.sunsetLimitEnd,
                                sunsetOffset,
                                true,
                                latitude,
                                longitude,
                                true,
                            );
                        } catch (err: unknown) {
                            this.log.error(`Cannot calculate astro data: ${err as Error}`);
                        }
                    }

                    const result = {};
                    const keys = Object.keys(astroEvents).sort((a, b) => astroEvents[a] - astroEvents[b]);
                    keys.forEach(key => {
                        const validDate = astroEvents[key] !== null && !isNaN(astroEvents[key].getTime());

                        result[key] = {
                            isValidDate: validDate,
                            serverTime: validDate ? formatHoursMinutesSeconds(astroEvents[key]) : 'n/a',
                            date: validDate ? astroEvents[key].toISOString() : 'n/a',
                        };
                    });

                    if (obj.callback) {
                        this.sendTo(obj.from, obj.command, result, obj.callback);
                    }
                }
                break;
            }

            case 'calcAstro': {
                if (obj.message) {
                    const longitude =
                        parseFloat(
                            obj.message.longitude === undefined ? this.config.longitude : obj.message.longitude,
                        ) || 0;
                    const latitude =
                        parseFloat(obj.message.latitude === undefined ? this.config.latitude : obj.message.latitude) ||
                        0;
                    const today = getAstroStartOfDay();

                    const sunriseEvent = obj.message?.sunriseEvent || this.config.sunriseEvent;
                    const sunriseLimitStart = obj.message?.sunriseLimitStart || this.config.sunriseLimitStart;
                    const sunriseLimitEnd = obj.message?.sunriseLimitEnd || this.config.sunriseLimitEnd;
                    const sunriseOffset =
                        parseInt(
                            obj.message.sunriseOffset === undefined
                                ? this.config.sunriseOffset
                                : obj.message.sunriseOffset,
                            10,
                        ) || 0;
                    const nextSunrise = this.getAstroEvent(
                        today,
                        sunriseEvent,
                        sunriseLimitStart,
                        sunriseLimitEnd,
                        sunriseOffset,
                        false,
                        latitude,
                        longitude,
                        true,
                    );

                    const sunsetEvent = obj.message?.sunsetEvent || this.config.sunsetEvent;
                    const sunsetLimitStart = obj.message?.sunsetLimitStart || this.config.sunsetLimitStart;
                    const sunsetLimitEnd = obj.message?.sunsetLimitEnd || this.config.sunsetLimitEnd;
                    const sunsetOffset =
                        parseInt(
                            obj.message.sunsetOffset === undefined
                                ? this.config.sunsetOffset
                                : obj.message.sunsetOffset,
                            10,
                        ) || 0;
                    const nextSunset = this.getAstroEvent(
                        today,
                        sunsetEvent,
                        sunsetLimitStart,
                        sunsetLimitEnd,
                        sunsetOffset,
                        true,
                        latitude,
                        longitude,
                        true,
                    );

                    const validDateSunrise = nextSunrise !== null && !isNaN(nextSunrise.getTime());
                    const validDateSunset = nextSunset !== null && !isNaN(nextSunset.getTime());

                    this.log.debug(
                        `calcAstro sunrise: ${sunriseEvent} -> start ${sunriseLimitStart}, end: ${sunriseLimitEnd}, offset: ${sunriseOffset} - ${validDateSunrise ? nextSunrise.toISOString() : 'n/a'}`,
                    );
                    this.log.debug(
                        `calcAstro sunset:  ${sunsetEvent} -> start ${sunsetLimitStart}, end: ${sunsetLimitEnd}, offset: ${sunsetOffset} - ${validDateSunset ? nextSunset.toISOString() : 'n/a'}`,
                    );

                    if (obj.callback) {
                        this.sendTo(
                            obj.from,
                            obj.command,
                            {
                                nextSunrise: {
                                    isValidDate: validDateSunrise,
                                    serverTime: validDateSunrise ? formatHoursMinutesSeconds(nextSunrise) : 'n/a',
                                    date: nextSunrise.toISOString(),
                                },
                                nextSunset: {
                                    isValidDate: validDateSunset,
                                    serverTime: validDateSunset ? formatHoursMinutesSeconds(nextSunset) : 'n/a',
                                    date: nextSunset.toISOString(),
                                },
                            },
                            obj.callback,
                        );
                    }
                }
                break;
            }

            case 'debug': {
                if (!this.context.debugMode) {
                    this.debugStart(obj.message);
                }
                break;
            }

            case 'debugStop': {
                if (!this.context.debugMode) {
                    this.debugStop().then(() => console.log('stopped'));
                }
                break;
            }

            case 'rulesOn': {
                this.context.rulesOpened = obj.message;
                console.log(`Enable messaging for ${this.context.rulesOpened}`);
                break;
            }

            case 'rulesOff': {
                // maybe if (context.rulesOpened === obj.message)
                console.log(`Disable messaging for ${this.context.rulesOpened}`);
                this.context.rulesOpened = null;
                break;
            }

            case 'getIoBrokerDataDir': {
                if (obj.callback) {
                    this.sendTo(
                        obj.from,
                        obj.command,
                        {
                            dataDir: getAbsoluteDefaultDataDir(),
                            sep,
                        },
                        obj.callback,
                    );
                }
                break;
            }
        }
    }

    onLog(msg: any): void {
        Object.keys(this.logSubscriptions).forEach((name: string): void =>
            this.logSubscriptions[name].forEach(handler => {
                if (
                    typeof handler.cb === 'function' &&
                    (handler.severity === '*' || handler.severity === msg.severity)
                ) {
                    handler.sandbox.logHandler = handler.severity || '*';
                    handler.cb.call(handler.sandbox, msg);
                    handler.sandbox.logHandler = undefined;
                }
            }),
        );
    }

    logError(msg: string, e: Error, offs?: number): void {
        const stack = e.stack ? e.stack.toString().split('\n') : e ? e.toString() : '';
        if (!msg.includes('\n')) {
            msg = msg.replace(/[: ]*$/, ': ');
        }

        this.errorLogFunction.error(msg + this.fixLineNo(stack[0]));
        for (let i = offs || 1; i < stack.length; i++) {
            if (!stack[i]) {
                continue;
            }
            if (stack[i].match(/runInNewContext|javascript\.js:/)) {
                break;
            }
            this.errorLogFunction.error(this.fixLineNo(stack[i]));
        }
    }

    logWithLineInfo(msg: string): void {
        this.errorLogFunction.warn(msg);

        // get current error stack
        const stack = new Error().stack?.split('\n');

        if (stack) {
            for (let i = 3; i < stack.length; i++) {
                if (!stack[i]) {
                    continue;
                }
                if (stack[i].match(/runInContext|runInNewContext|javascript\.js:/)) {
                    break;
                }
                this.errorLogFunction.warn(this.fixLineNo(stack[i]));
            }
        }
    }

    async main(): Promise<void> {
        // Patch the font as it sometimes is wrong
        if (!this.context.debugMode) {
            if (await this.patchFont()) {
                this.log.debug('Font patched');
            }
        }

        this.log.debug(`config.subscribe (Do not subscribe all states on start): ${this.config.subscribe}`);

        // correct jsonConfig for admin
        const instObj: ioBroker.InstanceObject | null | undefined = await this.getForeignObjectAsync(
            `system.adapter.${this.namespace}`,
        );
        if (instObj?.common) {
            if (instObj.common.adminUI?.config !== 'json') {
                if (instObj.common.adminUI) {
                    instObj.common.adminUI.config = 'json';
                } else {
                    instObj.common.adminUI = { config: 'json' };
                }
                this.setForeignObject(instObj._id, instObj);
            }
        }

        if (webstormDebug) {
            this.errorLogFunction = {
                error: console.error,
                warn: console.warn,
                info: console.info,
                debug: console.log,
                silly: console.log,
            };
            this.context.errorLogFunction = this.errorLogFunction;
        }
        this.activeStr = `${this.namespace}.scriptEnabled.`;

        this.mods.fs = new ProtectFs(this.log, getAbsoluteDefaultDataDir());
        this.mods['fs/promises'] = this.mods.fs.promises; // to avoid require('fs/promises');

        // try to read TS declarations
        try {
            tsAmbient = {
                'javascript.d.ts': readFileSync(this.mods.path.join(__dirname, 'lib/javascript.d.ts'), 'utf8'),
            };
            this.tsServer.provideAmbientDeclarations(tsAmbient);
            jsDeclarationServer.provideAmbientDeclarations(tsAmbient);
        } catch (err: unknown) {
            this.log.warn(`Could not read TypeScript ambient declarations: ${err as Error}`);
            // This should not happen, so send an error report to Sentry
            if (this.supportsFeature && this.supportsFeature('PLUGINS')) {
                const sentryInstance = this.getPluginInstance('sentry');
                if (sentryInstance) {
                    const sentryObject = sentryInstance.getSentryObject();
                    sentryObject?.captureException(err as Error);
                }
            }
            // Keep the adapter from crashing when the included typings cannot be read
            tsAmbient = {};
        }

        await this.installLibraries();
        // Load the TS declarations for Node.js and all 3rd party modules
        this.loadTypeScriptDeclarations();

        await this.getData();
        this.context.scheduler = new Scheduler(
            this.log,
            Date,
            this.mods.suncalc,
            this.config.latitude,
            this.config.longitude,
        );
        await this.dayTimeSchedules();
        await this.sunTimeSchedules();
        await this.timeSchedule();

        // Warning. It could have a side effect in compact mode, so all adapters will accept self-signed certificates
        if (this.config.allowSelfSignedCerts) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        }

        const doc = await this.getObjectViewAsync('script', 'javascript', {});
        if (doc?.rows?.length) {
            // assemble global script
            for (let g = 0; g < doc.rows.length; g++) {
                const obj = doc.rows[g].value;
                if (checkIsGlobal(obj)) {
                    if (obj && obj.common) {
                        const engineType = (obj.common.engineType || '').toLowerCase();

                        if (obj.common.enabled) {
                            if (engineType.startsWith('typescript')) {
                                // TypeScript
                                this.log.info(`${obj._id}: compiling TypeScript source...`);
                                // In order to compile global TypeScript, we need to do some transformations
                                // 1. For top-level-await, some statements must be wrapped in an immediately-invoked async function
                                // 2. If any global script uses `import`, the declarations are no longer visible if they are not exported with `declare global`
                                const transformedSource = transformScriptBeforeCompilation(obj.common.source, true);
                                // The source code must be transformed in order to support top level await
                                // Global scripts must not be treated as a module, otherwise their methods
                                // cannot be found by the normal scripts
                                // We need to hash both global declarations that are known until now
                                // AND the script source, because changing either can change the compilation output
                                const sourceHash: string = hashSource(
                                    tsSourceHashBase + this.globalDeclarations + transformedSource,
                                );

                                let compiled: string | undefined;
                                let declarations: string | undefined;
                                // If we already stored the compiled source code and the original source hash,
                                // use the hash to check whether we can rely on the compiled source code or
                                // if we need to compile it again
                                if (
                                    typeof obj.common.compiled === 'string' &&
                                    typeof obj.common.sourceHash === 'string' &&
                                    sourceHash === obj.common.sourceHash
                                ) {
                                    // We can reuse the stored source
                                    compiled = obj.common.compiled;
                                    declarations = obj.common.declarations;
                                    this.log.info(
                                        `${obj._id}: source code did not change, using cached compilation result...`,
                                    );
                                } else {
                                    // We don't have a hashed source code, or the original source changed, compile it
                                    const filename = scriptIdToTSFilename(obj._id);
                                    let tsCompiled: CompileResult;
                                    try {
                                        tsCompiled = this.tsServer.compile(filename, transformedSource);
                                    } catch (err: unknown) {
                                        this.log.error(`${obj._id}: TypeScript compilation failed:\n${err as Error}`);
                                        continue;
                                    }

                                    const errors = tsCompiled.diagnostics
                                        .map(diag => `${diag.annotatedSource}\n`)
                                        .join('\n');

                                    if (tsCompiled.success) {
                                        if (errors.length > 0) {
                                            this.log.warn(
                                                `${obj._id}: TypeScript compilation completed with errors:\n${errors}`,
                                            );
                                        } else {
                                            this.log.info(`${obj._id}: TypeScript compilation successful`);
                                        }
                                        compiled = tsCompiled.result;
                                        // Global scripts that have been transformed to support `import` need to have their declarations transformed aswell
                                        declarations = transformGlobalDeclarations(tsCompiled.declarations || '');

                                        const newCommon: {
                                            compiled: string | undefined;
                                            declarations?: string;
                                            sourceHash: string;
                                        } = {
                                            sourceHash,
                                            compiled,
                                        };
                                        if (declarations) {
                                            newCommon.declarations = declarations;
                                        }

                                        // Store the compiled source and the original source hash, so we don't need to do the work again next time
                                        this.ignoreObjectChange.add(obj._id); // ignore the next change and don't restart scripts
                                        this.extendForeignObject(obj._id, {
                                            common: newCommon,
                                        });
                                    } else {
                                        this.log.error(`${obj._id}: TypeScript compilation failed:\n${errors}`);
                                        continue;
                                    }
                                }
                                this.globalScript += `${compiled}\n`;
                                // if declarations were generated, remember them
                                if (declarations != null) {
                                    this.provideDeclarationsForGlobalScript(obj._id, declarations);
                                }
                            } else {
                                // javascript
                                const sourceCode = obj.common.source;
                                this.globalScript += `${sourceCode}\n`;

                                // try to compile the declarations so TypeScripts can use
                                // functions defined in global JavaScripts
                                const filename = scriptIdToTSFilename(obj._id);
                                let tsCompiled: CompileResult;
                                try {
                                    tsCompiled = jsDeclarationServer.compile(filename, sourceCode);
                                } catch (err: unknown) {
                                    this.log.warn(
                                        `${obj._id}: Error while generating type declarations, skipping:\n${err as Error}`,
                                    );
                                    continue;
                                }
                                // if declarations were generated, remember them
                                if (tsCompiled.success && tsCompiled.declarations != null) {
                                    this.provideDeclarationsForGlobalScript(obj._id, tsCompiled.declarations);
                                }
                            }
                        }
                    }
                }
            }
        }

        this.globalScript = this.globalScript.replace(/\r\n/g, '\n');
        this.globalScriptLines = this.globalScript.split(/\n/g).length - 1;

        if (doc?.rows?.length) {
            // load all scripts
            for (let i = 0; i < doc.rows.length; i++) {
                if (!checkIsGlobal(doc.rows[i].value)) {
                    this.loadScript(doc.rows[i].value);
                }
            }
        }

        if (this.config.mirrorPath) {
            this.config.mirrorInstance = parseInt(this.config.mirrorInstance as unknown as string, 10) || 0;
            if (this.instance === this.config.mirrorInstance) {
                const ioBDataDir = getAbsoluteDefaultDataDir() + sep;
                this.config.mirrorPath = normalize(this.config.mirrorPath);
                let mirrorForbidden = false;
                for (let dir of forbiddenMirrorLocations) {
                    dir = join(ioBDataDir, dir) + sep;
                    if (dir.includes(this.config.mirrorPath) || this.config.mirrorPath.startsWith(dir)) {
                        this.log.error(`The Mirror directory is not allowed to be a central ioBroker directory!`);
                        this.log.error(`Directory ${this.config.mirrorPath} is not allowed to mirror files!`);
                        mirrorForbidden = true;
                        break;
                    }
                }
                if (!mirrorForbidden) {
                    this.mirror = new Mirror({
                        adapter: this,
                        log: this.log,
                        diskRoot: this.config.mirrorPath,
                    });
                }
            }
        }

        // CHeck setState counter per minute and stop script if too high
        this.setStateCountCheckInterval = setInterval(() => {
            Object.keys(this.scripts).forEach(id => {
                if (!this.scripts[id]) {
                    return;
                }
                const currentSetStatePerMinuteCounter = this.scripts[id].setStatePerMinuteCounter;
                this.scripts[id].setStatePerMinuteCounter = 0;
                if (currentSetStatePerMinuteCounter > this.config.maxSetStatePerMinute) {
                    this.scripts[id].setStatePerMinuteProblemCounter++;
                    this.log.debug(
                        `Script ${id} has reached the maximum of ${this.config.maxSetStatePerMinute} setState calls per minute in ${this.scripts[id].setStatePerMinuteProblemCounter} consecutive minutes`,
                    );
                    // Allow "too high counters" for 1 minute for script starts or such and only
                    // stop the script when lasts longer
                    if (this.scripts[id].setStatePerMinuteProblemCounter > 1) {
                        this.log.error(
                            `Script ${id} is calling setState more than ${this.config.maxSetStatePerMinute} times per minute! Stopping Script now! Please check your script!`,
                        );
                        this.stopScript(id);
                    }
                } else if (this.scripts[id].setStatePerMinuteProblemCounter > 0) {
                    this.scripts[id].setStatePerMinuteProblemCounter--;
                    this.log.debug(
                        `Script ${id} has NOT reached the maximum of ${this.config.maxSetStatePerMinute} setState calls per minute. Decrease problem counter to ${this.scripts[id].setStatePerMinuteProblemCounter}`,
                    );
                }
            });
        }, 60000);
    }

    private loadTypeScriptDeclarations(): void {
        // try to load the typings on disk for all 3rd party modules
        const packages = [
            'node', // this provides auto-completion for most builtins
            'request', // preloaded by the adapter
        ];
        // Also include user-selected libraries (but only those that are also installed)
        if (typeof this.config?.libraries === 'string' && typeof this.config.libraryTypings === 'string') {
            const installedLibs = this.config.libraries
                .split(/[,;\s]+/)
                .map(s => s.trim().split('@')[0])
                .filter(s => !!s);

            const wantsTypings = this.config.libraryTypings
                .split(/[,;\s]+/)
                .map(s => s.trim())
                .filter(s => !!s);
            // Add all installed libraries the user has requested typings for to the list of packages
            for (const lib of installedLibs) {
                if (wantsTypings.includes(lib) && !packages.includes(lib)) {
                    packages.push(lib);
                }
            }
            // Some packages have submodules (e.g., rxjs/operators) that are not exposed through the main entry point
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
                this.getAdapterScopedPackageIdentifier ? this.getAdapterScopedPackageIdentifier(pkg) : pkg,
                // node needs ambient typings, so we don't wrap it in declare module
                pkg !== 'node',
            );
            if (!pkgTypings) {
                // Create the empty dummy declarations so users don't get the "not found" error
                // for installed packages
                pkgTypings = {
                    [`node_modules/@types/${pkg}/index.d.ts`]: `declare module "${pkg}";`,
                };
            }
            this.log.debug(`Loaded TypeScript definitions for ${pkg}: ${JSON.stringify(Object.keys(pkgTypings))}`);
            // remember the declarations for the editor
            Object.assign(tsAmbient, pkgTypings);
            // and give the language servers access to them
            this.tsServer.provideAmbientDeclarations(pkgTypings);
            jsDeclarationServer.provideAmbientDeclarations(pkgTypings);
        }
    }

    updateObjectContext(id: string, obj: ioBroker.Object | null | undefined): void {
        if (obj) {
            // add state to state ID's list
            if (obj.type === 'state') {
                if (!this.stateIds.includes(id)) {
                    this.stateIds.push(id);
                    this.stateIds.sort();
                }
                if (this.context.devices && this.context.channels) {
                    const parts = id.split('.');
                    parts.pop();
                    const chn = parts.join('.');
                    this.context.channels[chn] = this.context.channels[chn] || [];
                    this.context.channels[chn].push(id);

                    parts.pop();
                    const dev = parts.join('.');
                    this.context.devices[dev] = this.context.devices[dev] || [];
                    this.context.devices[dev].push(id);
                }
            }
        } else {
            // delete object from state ID's list
            const pos = this.stateIds.indexOf(id);
            if (pos !== -1) {
                this.stateIds.splice(pos, 1);
            }
            if (this.context.devices && this.context.channels) {
                const parts = id.split('.');
                parts.pop();
                const chn = parts.join('.');
                if (this.context.channels[chn]) {
                    const posChn = this.context.channels[chn].indexOf(id);
                    posChn !== -1 && this.context.channels[chn].splice(posChn, 1);
                }

                parts.pop();
                const dev = parts.join('.');
                if (this.context.devices[dev]) {
                    const posDev = this.context.devices[dev].indexOf(id);
                    posDev !== -1 && this.context.devices[dev].splice(posDev, 1);
                }
            }

            delete this.folderCreationVerifiedObjects[id];
        }

        if (!obj && this.objects[id]) {
            // objects was deleted
            this.removeFromNames(id);
            delete this.objects[id];
        } else if (obj && !this.objects[id]) {
            // object was added
            this.objects[id] = obj;
            this.addToNames(obj);
        } else if (obj && this.objects[id].common) {
            // Object just changed
            this.objects[id] = obj;

            const n = this.getName(id);
            let nn = this.objects[id].common ? this.objects[id].common.name : '';

            if (nn && typeof nn === 'object') {
                nn = nn[getLanguage()] || nn.en;
            }

            if (n !== nn) {
                if (n) {
                    this.removeFromNames(id);
                }
                if (nn) {
                    this.addToNames(obj);
                }
            }
        }
    }

    async stopAllScripts(): Promise<void> {
        const scripts = Object.keys(this.scripts);
        const promises: Promise<boolean>[] = [];
        for (let i = 0; i < scripts.length; i++) {
            promises.push(this.stopScript(scripts[i]));
        }
        return Promise.all(promises).then(() => {});
    }

    convertBackStringifiedValues(
        id: string,
        state: ioBroker.State | null | undefined,
    ): ioBroker.State | null | undefined {
        if (
            state &&
            typeof state.val === 'string' &&
            this.objects[id]?.common &&
            (this.objects[id].common.type === 'array' || this.objects[id].common.type === 'object')
        ) {
            try {
                state.val = JSON.parse(state.val);
            } catch (err: any) {
                if (id.startsWith('javascript.') || id.startsWith('0_userdata.0')) {
                    this.log.info(
                        `Could not parse value for id ${id} into ${this.objects[id].common.type}: ${err.toString()}`,
                    );
                } else {
                    this.log.debug(
                        `Could not parse value for id ${id} into ${this.objects[id].common.type}: ${err.toString()}`,
                    );
                }
            }
        }
        return state;
    }

    prepareStateObjectSimple(id: string, state: ioBroker.StateValue, isAck: boolean): ioBroker.State {
        let oState: ioBroker.State;

        if (typeof isAck === 'boolean') {
            // otherwise, assume that the given state is the value to be set
            oState = { val: state, ack: !!isAck } as ioBroker.State;
        } else {
            oState = { val: state } as ioBroker.State;
        }

        return this.prepareStateObject(id, oState);
    }

    prepareStateObject(id: string, state: ioBroker.SettableState | null): ioBroker.State {
        let oState: ioBroker.State;

        if (state && typeof state === 'object') {
            oState = state as ioBroker.State;
        } else {
            oState = { val: null } as ioBroker.State;
        }

        if (this.config.subscribe) {
            return oState;
        }
        // set other values to have a full state object
        // mirrors logic from statesInRedis
        if (oState.ts === undefined) {
            oState.ts = Date.now();
        }

        if (oState.q === undefined) {
            oState.q = 0;
        }

        oState.from =
            typeof oState.from === 'string' && oState.from !== '' ? oState.from : `system.adapter.${this.namespace}`;

        if (oState.lc === undefined) {
            const formerStateValue = this.interimStateValues[id] || this.states[id];
            if (!formerStateValue) {
                oState.lc = oState.ts;
            } else {
                // isDeepStrictEqual works on objects and primitive values
                const hasChanged = !isDeepStrictEqual(formerStateValue.val, oState.val);
                if (!formerStateValue.lc || hasChanged) {
                    oState.lc = oState.ts;
                } else {
                    oState.lc = formerStateValue.lc;
                }
            }
        }

        return oState;
    }

    async getData(): Promise<void> {
        await this.subscribeForeignObjectsAsync('*');

        if (!this.config.subscribe) {
            await this.subscribeForeignStatesAsync('*');
        } else {
            await this.subscribeStatesAsync('debug.to');
            await this.subscribeStatesAsync('scriptEnabled.*');
        }

        this.log.info('requesting all states');

        const statesPromise = this.getForeignStatesAsync('*')
            .then(res => {
                if (!res) {
                    this.log.error(`Could not initialize states: no result`);
                    this.terminate(EXIT_CODES.START_IMMEDIATELY_AFTER_STOP);
                    return;
                }
                if (!this.config.subscribe) {
                    this.states = Object.assign(res, this.states);
                    this.context.states = this.states;

                    this.addGetProperty(this.states);
                }

                // remember all IDs
                for (const id in res) {
                    if (Object.prototype.hasOwnProperty.call(res, id)) {
                        this.stateIds.push(id);
                    }
                }
                this.statesInitDone = true;
                this.log.info('received all states');
            })
            .catch((err: any) => {
                this.log.error(`Could not initialize states: ${err?.message || 'no result'}`);
                this.terminate(EXIT_CODES.START_IMMEDIATELY_AFTER_STOP);
            });

        this.log.info('requesting all objects');

        const objectsPromise = this.getObjectListAsync({ include_docs: true })
            .then(res => {
                if (!res?.rows) {
                    this.log.error(`Could not initialize objects: no result`);
                    this.terminate(EXIT_CODES.START_IMMEDIATELY_AFTER_STOP);
                    return;
                }
                this.objects = {};
                this.context.objects = this.objects;
                for (let i = 0; i < res.rows.length; i++) {
                    if (!res.rows[i].doc) {
                        this.log.debug(`Got empty object for index ${i} (${res.rows[i].id})`);
                        continue;
                    }
                    if (this.objects[res.rows[i].doc._id] === undefined) {
                        // If was already there ignore
                        this.objects[res.rows[i].doc._id] = res.rows[i].doc;
                    }
                    this.objects[res.rows[i].doc._id].type === 'enum' && this._enums.push(res.rows[i].doc._id);

                    // Collect all names
                    this.addToNames(this.objects[res.rows[i].doc._id]);
                }
                this.addGetProperty(this.objects);

                const systemConfig = this.objects['system.config'];

                // set language for debug messages
                if (systemConfig?.common?.language) {
                    setLanguage(systemConfig.common.language);
                    this.language = systemConfig.common.language;
                    this.context.language = this.language as ioBroker.Languages;
                } else if (this.language) {
                    setLanguage(this.language);
                    this.context.language = this.language;
                }

                // try to use system coordinates
                if (this.config.useSystemGPS) {
                    if (systemConfig?.common?.latitude || systemConfig?.common?.longitude) {
                        this.config.latitude = systemConfig.common.latitude;
                        this.config.longitude = systemConfig.common.longitude;
                    } else if (this.latitude && this.longitude) {
                        this.config.latitude = this.latitude;
                        this.config.longitude = this.longitude;
                    }
                }
                this.config.latitude = parseFloat(this.config.latitude as unknown as string);
                this.config.longitude = parseFloat(this.config.longitude as unknown as string);

                if (isNaN(this.config.latitude)) {
                    this.log.warn(`Configured latitude is not a number - check (instance/system) configuration`);
                } else if (this.config.latitude < -90 || this.config.latitude > 90) {
                    this.log.warn(
                        `Configured latitude "${this.config.latitude}" is invalid - check (instance/system) configuration`,
                    );
                }

                if (isNaN(this.config.longitude)) {
                    this.log.warn(`Configured longitude is not a number - check (instance/system) configuration`);
                } else if (this.config.longitude < -180 || this.config.longitude > 180) {
                    this.log.warn(
                        `Configured longitude "${this.config.longitude}" is invalid - check (instance/system) configuration`,
                    );
                }

                this.config.sunriseEvent = this.config.sunriseEvent || 'nightEnd';
                this.config.sunriseOffset = this.config.sunriseOffset || 0;
                this.config.sunriseLimitStart = this.config.sunriseLimitStart || '06:00';
                this.config.sunriseLimitEnd = this.config.sunriseLimitEnd || '12:00';

                this.config.sunsetEvent = this.config.sunsetEvent || 'dusk';
                this.config.sunsetOffset = this.config.sunsetOffset || 0;
                this.config.sunsetLimitStart = this.config.sunsetLimitStart || '18:00';
                this.config.sunsetLimitEnd = this.config.sunsetLimitEnd || '23:00';

                this.objectsInitDone = true;
                this.log.info('received all objects');
            })
            .catch((err: any) => {
                this.log.error(`Could not initialize objects: ${err?.message || 'no result'}`);
                this.terminate(EXIT_CODES.START_IMMEDIATELY_AFTER_STOP);
            });

        return Promise.all([statesPromise, objectsPromise]).then(() => {});
    }

    async createActiveObject(id: string, enabled: boolean): Promise<void> {
        const idActive = `${this.namespace}.scriptEnabled.${id.substring(SCRIPT_CODE_MARKER.length)}`;

        if (!this.objects[idActive]) {
            this.objects[idActive] = {
                _id: idActive,
                common: {
                    name: `scriptEnabled.${id.substring(SCRIPT_CODE_MARKER.length)}`,
                    desc: 'controls script activity',
                    type: 'boolean',
                    write: true,
                    read: true,
                    role: 'switch.active',
                },
                native: {
                    script: id,
                },
                type: 'state',
            };
            try {
                this.setForeignObjectAsync(idActive, this.objects[idActive]);
                const intermediateStateValue = this.prepareStateObjectSimple(idActive, !!enabled, true);
                await this.setForeignStateAsync(idActive, !!enabled, true);
                if (enabled && !this.config.subscribe) {
                    this.interimStateValues[idActive] = intermediateStateValue;
                }
            } catch {
                // ignore
            }
        } else {
            const state = await this.getForeignStateAsync(idActive);
            if (state && state.val !== enabled) {
                const intermediateStateValue = this.prepareStateObjectSimple(idActive, !!enabled, true);
                await this.setForeignStateAsync(idActive, !!enabled, true);
                if (enabled && !this.config.subscribe) {
                    this.interimStateValues[id] = intermediateStateValue;
                }
            }
        }
    }

    async createProblemObject(id: string): Promise<void> {
        const idProblem = `${this.namespace}.scriptProblem.${id.substring(SCRIPT_CODE_MARKER.length)}`;

        if (!this.objects[idProblem]) {
            this.objects[idProblem] = {
                _id: idProblem,
                common: {
                    name: `scriptProblem.${id.substring(SCRIPT_CODE_MARKER.length)}`,
                    desc: 'Script has a problem',
                    type: 'boolean',
                    expert: true,
                    write: false,
                    read: true,
                    role: 'indicator.error',
                },
                native: {
                    script: id,
                },
                type: 'state',
            };
            try {
                await this.setForeignObjectAsync(idProblem, this.objects[idProblem]);
                await this.setForeignStateAsync(idProblem, false, true);
            } catch {
                // ignore
            }
        } else {
            const state = await this.getForeignStateAsync(idProblem);
            if (state && state.val !== false) {
                await this.setForeignStateAsync(idProblem, false, true);
            }
        }
    }

    addToNames(obj: ioBroker.Object): void {
        const id = obj._id;

        if (obj.common?.name) {
            let name = obj.common.name;
            if (name && typeof name === 'object') {
                name = name[getLanguage()] || name.en;
            }
            if (!name || typeof name !== 'string') {
                // TODO, take name in current language
                return;
            }

            if (!this.names[name]) {
                this.names[name] = id;
            } else {
                // convert to array
                if (!Array.isArray(this.names[name])) {
                    this.names[name] = [this.names[name] as string];
                }

                (this.names[name] as string[]).push(id);
            }
        }
    }

    removeFromNames(id: string): void {
        const n = this.getName(id);

        if (n) {
            if (Array.isArray(this.names[n])) {
                const pos = this.names[n].indexOf(id);
                if (pos > -1) {
                    this.names[n].splice(pos, 1);

                    if (this.names[n].length === 1) {
                        this.names[n] = this.names[n][0];
                    }
                }
            } else {
                delete this.names[n];
            }
        }
    }

    getName(id: string): string | null {
        for (const n in this.names) {
            if (this.names[n] && Array.isArray(this.names[n])) {
                if (this.names[n].includes(id)) {
                    return n;
                }
            } else if (this.names[n] === id) {
                return n;
            }
        }

        return null;
    }

    async installNpm(npmLib: string): Promise<number> {
        return new Promise((resolve, reject) => {
            const path = __dirname;

            // Also, set the working directory (cwd) of the process instead of using --prefix
            // because that has ugly bugs on Windows
            const cmd = `npm install ${npmLib} --omit=dev`;
            this.log.info(`Installing ${npmLib} into ${__dirname} - cmd: ${cmd}`);

            // System call used for update of js-controller itself,
            // because during the installation the npm packet will be deleted too, but some files must be loaded even during the installation process.
            const child = this.mods.child_process.exec(cmd, {
                windowsHide: true,
                cwd: path,
            });

            child.stdout?.on('data', buf => this.log.info(buf.toString('utf8')));

            child.stderr?.on('data', buf => this.log.error(buf.toString('utf8')));

            child.on('err', err => {
                this.log.error(`Cannot install ${npmLib}: ${err}`);
                reject(new Error(`Cannot install ${npmLib}: ${err}`));
            });
            child.on('error', err => {
                this.log.error(`Cannot install ${npmLib}: ${err}`);
                reject(new Error(`Cannot install ${npmLib}: ${err}`));
            });

            child.on('exit', (code: number /* , signal */) => {
                if (code) {
                    this.log.error(`Cannot install ${npmLib}: ${code}`);
                    reject(new Error(`Cannot install ${npmLib}: ${code}`));
                }
                // command succeeded
                resolve(code);
            });
        });
    }

    async installLibraries(): Promise<void> {
        if (typeof this.config?.libraries !== 'string') {
            this.config.libraries = '';
        }

        const libraries = this.config.libraries.split(/[,;\s]+/).filter(d => d.length > 0);

        this.log.debug(`Custom libraries in config: "${this.config.libraries}": ${JSON.stringify(libraries)}`);

        let installedNodeModules: string[] = [];
        const keepModules: string[] = [];

        // js-controller >= 6.x
        if (typeof this.listInstalledNodeModules === 'function') {
            installedNodeModules = await this.listInstalledNodeModules();

            this.log.debug(`Found installed libraries: ${JSON.stringify(installedNodeModules)}`);
        }

        for (const lib of libraries) {
            let depName = lib;
            let version = 'latest';

            if (depName.includes('@') && depName.lastIndexOf('@') > 0) {
                const parts = depName.split('@');
                version = parts.pop() ?? 'latest';
                depName = parts.join('@');
            }

            /** The real module name, because the dependency can be an url too */
            let moduleName = depName;

            if (URL.canParse(depName)) {
                moduleName = await requestModuleNameByUrl(depName);

                this.log.debug(`Found custom library in config: "${moduleName}@${version}" (from ${depName})`);
            } else {
                this.log.debug(`Found custom library in config: "${moduleName}@${version}"`);
            }

            keepModules.push(moduleName);

            // js-controller >= 6.x
            if (typeof this.installNodeModule === 'function') {
                try {
                    const result = await this.installNodeModule(depName, { version });
                    if (result.success) {
                        this.log.debug(`Installed custom library: "${moduleName}@${version}"`);

                        const importedModule: any = await this.importNodeModule(moduleName);
                        this.mods[moduleName] = importedModule.default ?? importedModule;
                    } else {
                        this.log.warn(`Cannot install custom npm package "${moduleName}@${version}"`);
                    }
                } catch (err: unknown) {
                    this.log.warn(`Cannot install custom npm package "${moduleName}@${version}": ${err as Error}`);
                }
            } else if (!existsSync(`${__dirname}/node_modules/${depName}/package.json`)) {
                // js-controller < 6.x
                this.log.info(`Installing custom library (legacy mode): "${lib}"`);

                try {
                    await this.installNpm(lib);
                    this.log.info(`Installed custom npm package (legacy mode): "${libraries[lib]}"`);
                } catch (err: any) {
                    this.log.warn(
                        `Cannot install custom npm package "${libraries[lib]}" (legacy mode): ${err.toString()}`,
                    );
                }
            }
        }

        // js-controller >= 6.x
        if (typeof this.uninstallNodeModule === 'function') {
            for (const installedNodeModule of installedNodeModules) {
                if (!keepModules.includes(installedNodeModule)) {
                    try {
                        await this.uninstallNodeModule(installedNodeModule);

                        this.log.info(`Removed custom npm package: "${installedNodeModule}"`);
                    } catch (err: any) {
                        this.log.warn(`Cannot remove custom npm package ${installedNodeModule}: ${err.toString()}`);
                    }
                }
            }
        }
    }

    createVM(source: string, name: string, wrapAsync: boolean): false | JsScript {
        if (this.context.debugMode && name !== this.context.debugMode) {
            return false;
        }

        if (!this.context.debugMode) {
            const logSubscriptionsText =
                "\n;\nlog(`registered ${__engine.__subscriptions} subscription${__engine.__subscriptions === 1 ? '' : 's'}," +
                " ${__engine.__schedules} schedule${__engine.__schedules === 1 ? '' : 's'}," +
                " ${__engine.__subscriptionsMessage} message${__engine.__subscriptionsMessage === 1 ? '' : 's'}," +
                " ${__engine.__subscriptionsLog} log${__engine.__subscriptionsLog === 1 ? '' : 's'}" +
                " and ${__engine.__subscriptionsFile} file subscription${__engine.__subscriptionsFile === 1 ? '' : 's'}`);\n";

            if (wrapAsync) {
                source = `(async () => {\n${source}\n${logSubscriptionsText}\n})();`;
            } else {
                source = `${source}\n${logSubscriptionsText}`;
            }
        } else {
            if (wrapAsync) {
                source = `(async () => {debugger;\n${source}\n})();`;
            } else {
                source = `debugger;${source}`;
            }
        }

        try {
            const options: ScriptOptions = {
                filename: name,
                // displayErrors: true,
                // lineOffset: this.globalScriptLines
            };
            return {
                script: new Script(source, options),
            } as JsScript;
        } catch (err: unknown) {
            this.logError(`${name} compile failed:\r\nat `, err as Error);
            return false;
        }
    }

    execute(script: JsScript, name: string, engineType: ScriptType, verbose: boolean, debug: boolean): void {
        script.intervals = [];
        script.timeouts = [];
        script.schedules = [];
        script.wizards = [];
        script.name = name;
        script.engineType = engineType;
        script._id = Math.floor(Math.random() * 0xffffffff);
        script.subscribes = {};
        script.subscribesFile = {};
        script.setStatePerMinuteCounter = 0;
        script.setStatePerMinuteProblemCounter = 0;
        this.setState(`scriptProblem.${name.substring(SCRIPT_CODE_MARKER.length)}`, {
            val: false,
            ack: true,
            expire: 1000,
        });

        const sandbox = sandBox(script, name, verbose, debug, this.context);

        try {
            script.script.runInNewContext(sandbox, {
                filename: name,
                displayErrors: true,
                // lineOffset: this.globalScriptLines
            });
        } catch (err: unknown) {
            this.setState(`scriptProblem.${name.substring(SCRIPT_CODE_MARKER.length)}`, {
                val: true,
                ack: true,
                c: 'execute',
            });
            this.logError(name, err as Error);
        }
    }

    unsubscribe(id: string | RegExp | string[]): void {
        if (!id) {
            this.log.warn('unsubscribe: empty name');
            return;
        }

        if (Array.isArray(id)) {
            id.forEach(sub => unsubscribe(sub));
            return;
        }

        if (id.constructor && id.constructor.name === 'RegExp') {
            // adapter.log.warn('unsubscribe: todo - process regexp');
            return;
        }

        if (typeof id !== 'string') {
            this.log.error(`unsubscribe: invalid type of id - ${typeof id}`);
            return;
        }
        const parts = id.split('.');
        const _adapter = `system.adapter.${parts[0]}.${parts[1]}`;
        if (this.objects[_adapter]?.common?.subscribable) {
            const a = `${parts[0]}.${parts[1]}`;
            const alive = `system.adapter.${a}.alive`;
            if (this.adapterSubs[alive]) {
                const pos = this.adapterSubs[alive].indexOf(id);
                if (pos !== -1) {
                    this.adapterSubs[alive].splice(pos, 1);
                }
                if (!this.adapterSubs[alive].length) {
                    delete this.adapterSubs[alive];
                }
            }
            this.sendTo(a, 'unsubscribe', id);
        }
    }

    // Analyze if logs are still required or not
    updateLogSubscriptions(): void {
        let found = false;
        // go through all scripts and check if some script still requires logs
        Object.keys(this.logSubscriptions).forEach(scriptName => {
            if (!this.logSubscriptions?.[scriptName] || !this.logSubscriptions[scriptName].length) {
                delete this.logSubscriptions[scriptName];
            } else {
                found = true;
            }
        });

        if (this.requireLog) {
            if (found && !this.logSubscribed) {
                this.logSubscribed = true;
                this.requireLog(this.logSubscribed);
                this.log.info(`Subscribed to log messages (found logSubscriptions)`);
            } else if (!found && this.logSubscribed) {
                this.logSubscribed = false;
                this.requireLog(this.logSubscribed);
                this.log.info(`Unsubscribed from log messages (not found logSubscriptions)`);
            }
        }
    }

    async stopScript(name: string): Promise<boolean> {
        this.log.info(`Stopping script ${name}`);

        await this.setState(`scriptEnabled.${name.substring(SCRIPT_CODE_MARKER.length)}`, false, true);

        if (this.messageBusHandlers[name]) {
            delete this.messageBusHandlers[name];
        }

        if (this.tempDirectories[name]) {
            try {
                this.mods.fs.rmSync(this.tempDirectories[name], { recursive: true });

                this.log.debug(`Removed temp directory of ${name}: ${this.tempDirectories[name]}`);
            } catch {
                this.log.warn(`Unable to remove temp directory of ${name}: ${this.tempDirectories[name]}`);
            }

            delete this.tempDirectories[name];
        }

        if (this.logSubscriptions[name]) {
            delete this.logSubscriptions[name];
            this.updateLogSubscriptions();
        }

        if (this.scripts[name]) {
            // Remove from subscriptions
            this.context.isEnums = false;
            if (this.config.subscribe) {
                // check all subscribed IDs
                Object.keys(this.scripts[name].subscribes).forEach(id => {
                    if (this.subscribedPatterns[id]) {
                        this.subscribedPatterns[id] -= this.scripts[name].subscribes[id];
                        if (this.subscribedPatterns[id] <= 0) {
                            this.unsubscribeForeignStates(id);
                            delete this.subscribedPatterns[id];
                            if (this.states[id]) {
                                delete this.states[id];
                            }
                        }
                    }
                });
            }

            for (let i = this.subscriptions.length - 1; i >= 0; i--) {
                if (this.subscriptions[i].name === name) {
                    const sub = this.subscriptions.splice(i, 1)[0];
                    if (sub?.pattern.id) {
                        this.unsubscribe(sub.pattern.id);
                    }
                } else {
                    if (
                        (!this.context.isEnums && this.subscriptions[i].pattern.enumName) ||
                        this.subscriptions[i].pattern.enumId
                    ) {
                        this.context.isEnums = true;
                    }
                }
            }

            // check all subscribed files
            Object.keys(this.scripts[name].subscribesFile).forEach(key => {
                if (this.subscribedPatternsFile[key]) {
                    this.subscribedPatternsFile[key] -= this.scripts[name].subscribesFile[key];
                    if (this.subscribedPatternsFile[key] <= 0) {
                        const [id, file] = key.split('$%$');
                        this.unsubscribeForeignFiles(id, file);
                        delete this.subscribedPatternsFile[key];
                    }
                }
            });
            for (let i = this.subscriptionsFile.length - 1; i >= 0; i--) {
                if (this.subscriptionsFile[i].name === name) {
                    this.subscriptionsFile.splice(i, 1);
                }
            }

            for (let i = this.subscriptionsObject.length - 1; i >= 0; i--) {
                if (this.subscriptionsObject[i].name === name) {
                    const sub = this.subscriptionsObject.splice(i, 1)[0];
                    if (sub) {
                        this.unsubscribeForeignObjects(sub.pattern);
                    }
                }
            }

            // Stop all timeouts
            for (let i = 0; i < this.scripts[name].timeouts.length; i++) {
                clearTimeout(this.scripts[name].timeouts[i]);
            }
            // Stop all intervals
            for (let i = 0; i < this.scripts[name].intervals.length; i++) {
                clearInterval(this.scripts[name].intervals[i]);
            }
            // Stop all scheduled jobs
            for (let i = 0; i < this.scripts[name].schedules.length; i++) {
                if (this.scripts[name].schedules[i]) {
                    const _name = this.scripts[name].schedules[i].name;
                    if (!this.mods.nodeSchedule.cancelJob(this.scripts[name].schedules[i])) {
                        this.log.error(`Error by canceling scheduled job "${_name}"`);
                    }
                }
            }

            // Stop all time wizards jobs
            if (this.context.scheduler) {
                for (let i = 0; i < this.scripts[name].wizards.length; i++) {
                    if (this.scripts[name].wizards[i]) {
                        this.context.scheduler.remove(this.scripts[name].wizards[i]);
                    }
                }
            }

            // if callback for on stop
            if (typeof this.scripts[name].onStopCb === 'function') {
                this.scripts[name].onStopTimeout =
                    parseInt(this.scripts[name].onStopTimeout as unknown as string, 10) || 1000;

                await new Promise(resolve => {
                    let timeout: NodeJS.Timeout | null = setTimeout(() => {
                        if (timeout) {
                            timeout = null;
                            resolve(true);
                        }
                    }, this.scripts[name].onStopTimeout);

                    try {
                        this.scripts[name].onStopCb(() => {
                            if (timeout) {
                                clearTimeout(timeout);
                                timeout = null;
                                resolve(true);
                            }
                        });
                    } catch (err: unknown) {
                        this.log.error(`error in onStop callback: ${err as Error}`);
                    }
                });
            }

            delete this.scripts[name];
            return true;
        }
        return false;
    }

    async prepareScript(obj: ioBroker.ScriptObject): Promise<boolean> {
        if (obj?.common?.enabled && this.debugState.scriptName === obj._id) {
            const id = obj._id;
            await this.debugStop();
            this.log.info(`Debugging of ${id} was stopped, because started in normal mode`);
            return this.prepareScript(obj);
        }

        if (
            obj?.common?.source &&
            (obj.common.enabled || this.context.debugMode === obj._id) &&
            obj.common.engine === `system.adapter.${this.namespace}`
        ) {
            const name = obj._id;

            const nameId = name.substring(SCRIPT_CODE_MARKER.length);
            if (!nameId.length || nameId.endsWith('.')) {
                this.log.error(`Script name ${name} is invalid!`);
                return false;
            }
            const idActive = `scriptEnabled.${nameId}`;
            if (!this.config.subscribe) {
                this.interimStateValues[idActive] = this.prepareStateObjectSimple(
                    `${this.namespace}.${idActive}`,
                    true,
                    true,
                );
            }
            await this.setState(idActive, true, true);
            obj.common.engineType = obj.common.engineType || '';

            if (
                (obj.common.engineType as ScriptType).toLowerCase().startsWith('javascript') ||
                (obj.common.engineType as ScriptType) === 'Blockly' ||
                (obj.common.engineType as ScriptType) === 'Rules'
            ) {
                // Javascript
                this.log.info(`Start JavaScript ${name} (${obj.common.engineType})`);

                let sourceFn = name;
                if (webstormDebug) {
                    const fn = name.replace(/^script.js./, '').replace(/\./g, '/');
                    sourceFn = this.mods.path.join(webstormDebug, `${fn}.js`);
                }
                const createdScript = this.createVM(`${this.globalScript}\n${obj.common.source}`, sourceFn, true);
                if (!createdScript) {
                    return false;
                }
                this.scripts[name] = createdScript;
                this.execute(
                    this.scripts[name],
                    sourceFn,
                    obj.common.engineType as ScriptType,
                    obj.common.verbose,
                    obj.common.debug,
                );
                return true;
            }

            if (obj.common.engineType.toLowerCase().startsWith('typescript')) {
                // TypeScript
                this.log.info(`Compiling TypeScript source ${name}`);
                // The source code must be transformed in order to support top level await
                // and to force TypeScript to compile the code as a module
                const transformedSource = transformScriptBeforeCompilation(obj.common.source, false);
                // We need to hash both global declarations that are known until now
                // AND the script source, because changing either can change the compilation output
                const sourceHash = hashSource(tsSourceHashBase + this.globalDeclarations + transformedSource);

                let compiled: string;
                // If we already stored the compiled source code and the original source hash,
                // use the hash to check whether we can rely on the compiled source code or
                // if we need to compile it again
                if (
                    typeof obj.common.compiled === 'string' &&
                    typeof obj.common.sourceHash === 'string' &&
                    sourceHash === obj.common.sourceHash
                ) {
                    // We can reuse the stored source
                    compiled = obj.common.compiled;
                    this.log.info(`${name}: source code did not change, using cached compilation result...`);
                } else {
                    // We don't have a hashed source code, or the original source changed, compile it
                    const filename = scriptIdToTSFilename(name);
                    let tsCompiled: CompileResult;
                    try {
                        tsCompiled = this.tsServer.compile(filename, transformedSource);
                    } catch (err: unknown) {
                        this.log.error(`${obj._id}: TypeScript compilation failed:\n${err as Error}`);
                        return false;
                    }

                    const errors = tsCompiled.diagnostics.map(diag => `${diag.annotatedSource}\n`).join('\n');

                    if (tsCompiled.success) {
                        if (errors.length > 0) {
                            this.log.warn(`${name}: TypeScript compilation had errors:\n${errors}`);
                        } else {
                            this.log.info(`${name}: TypeScript compilation successful`);
                        }
                        compiled = tsCompiled.result || '';

                        // Store the compiled source and the original source hash, so we don't need to do the work again next time
                        this.ignoreObjectChange.add(name); // ignore the next change and don't restart scripts
                        await this.extendForeignObjectAsync(name, {
                            common: {
                                sourceHash,
                                compiled,
                            },
                        });
                    } else {
                        this.log.error(`${name}: TypeScript compilation failed:\n${errors}`);
                        return false;
                    }
                }
                const createdScript: JsScript | false = this.createVM(`${this.globalScript}\n${compiled}`, name, false);
                if (!createdScript) {
                    return false;
                }
                this.scripts[name] = createdScript;
                this.execute(
                    this.scripts[name],
                    name,
                    obj.common.engineType as ScriptType,
                    obj.common.verbose,
                    obj.common.debug,
                );
                return true;
            }

            this.log.warn(`Unknown engine type for "${name}": ${obj.common.engineType}`);
            return false;
        }

        let _name: string;
        if (obj?._id) {
            _name = obj._id;
            const scriptIdName = _name.substring(SCRIPT_CODE_MARKER.length);

            if (!scriptIdName.length || scriptIdName.endsWith('.')) {
                this.log.error(`Script name ${_name} is invalid!`);
                return false;
            }
            await this.setState(`scriptEnabled.${scriptIdName}`, false, true);
        }
        if (!obj) {
            this.log.error('Invalid script');
        }
        return false;
    }

    async loadScriptById(id: string): Promise<boolean> {
        let obj: ioBroker.ScriptObject | null | undefined;
        try {
            obj = (await this.getForeignObjectAsync(id)) as ioBroker.ScriptObject | null | undefined;
        } catch (err: any) {
            this.log.error(`Invalid script "${id}": ${err}`);
        }
        if (!obj) {
            return false;
        }
        return this.loadScript(obj);
    }

    async loadScript(nameOrObject: ioBroker.ScriptObject): Promise<boolean> {
        // create states for scripts
        await this.createActiveObject(nameOrObject._id, nameOrObject?.common?.enabled);
        await this.createProblemObject(nameOrObject._id);
        return this.prepareScript(nameOrObject);
    }

    getAstroEvent(
        date: Date,
        astroEvent: AstroEventName,
        start: string,
        end: string,
        offsetMinutes: number | string,
        isDayEnd: boolean,
        latitude: number,
        longitude: number,
        useNextDay?: boolean,
    ): Date {
        let ts: Date = this.mods.suncalc.getTimes(date, latitude, longitude)[astroEvent];

        if (!ts || ts.getTime().toString() === 'NaN') {
            ts = isDayEnd ? getNextTimeEvent(end, useNextDay) : getNextTimeEvent(start, useNextDay);
        }
        ts.setMilliseconds(0);
        ts.setMinutes(ts.getMinutes() + (parseInt(offsetMinutes as unknown as string, 10) || 0));

        const [timeHoursStart, timeMinutesStart] = start.split(':');
        const nTimeHoursStart = parseInt(timeHoursStart, 10);
        const nTimeMinutesStart = parseInt(timeMinutesStart, 10) || 0;

        if (
            ts.getHours() < nTimeHoursStart ||
            (ts.getHours() === nTimeHoursStart && ts.getMinutes() < nTimeMinutesStart)
        ) {
            ts = getNextTimeEvent(start, useNextDay);
            ts.setSeconds(0);
        }

        const [timeHoursEnd, timeMinutesEnd] = end.split(':');
        const nTimeHoursEnd = parseInt(timeHoursEnd, 10);
        const nTimeMinutesEnd = parseInt(timeMinutesEnd, 10) || 0;

        if (ts.getHours() > nTimeHoursEnd || (ts.getHours() === nTimeHoursEnd && ts.getMinutes() > nTimeMinutesEnd)) {
            ts = getNextTimeEvent(end, useNextDay);
            ts.setSeconds(0);
        }

        // if event in the past
        if (date > ts && useNextDay) {
            // take the next day
            ts.setDate(ts.getDate() + 1);
        }
        return ts;
    }

    async timeSchedule(): Promise<void> {
        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes();
        if (this.timeSettings.format12) {
            if (hours > 12) {
                hours -= 12;
            }
        }
        let sHours: string;
        if (this.timeSettings.leadingZeros) {
            sHours = hours.toString().padStart(2, '0');
        } else {
            sHours = hours.toString();
        }

        await this.setState('variables.dayTime', {
            val: `${sHours}:${minutes.toString().padStart(2, '0')}`,
            ack: true,
        });

        now.setMinutes(now.getMinutes() + 1);
        now.setSeconds(0);
        now.setMilliseconds(0);
        const interval = now.getTime() - Date.now();
        this.timeScheduleTimer = setTimeout(() => this.timeSchedule(), interval);
    }

    async dayTimeSchedules(): Promise<void> {
        // get astrological event
        if (
            this.config.latitude === undefined ||
            this.config.longitude === undefined ||
            (this.config.latitude as unknown as string) === '' ||
            (this.config.longitude as unknown as string) === '' ||
            this.config.latitude === null ||
            this.config.longitude === null
        ) {
            this.log.error('Longitude or latitude does not set. Cannot use astro.');
            return;
        }

        // Calculate the next event today
        const todayDate = getAstroStartOfDay();
        const nowDate = new Date();

        const todaySunrise = this.getAstroEvent(
            todayDate,
            this.config.sunriseEvent,
            this.config.sunriseLimitStart,
            this.config.sunriseLimitEnd,
            this.config.sunriseOffset,
            false,
            this.config.latitude,
            this.config.longitude,
        );
        const todaySunset = this.getAstroEvent(
            todayDate,
            this.config.sunsetEvent,
            this.config.sunsetLimitStart,
            this.config.sunsetLimitEnd,
            this.config.sunsetOffset,
            true,
            this.config.latitude,
            this.config.longitude,
        );

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

        const isDayTime: ioBroker.State | null | undefined = await this.getStateAsync('variables.isDayTime');
        let isDay: boolean;
        if (sunriseTimeout < 5000) {
            isDay = true;
        } else if (sunsetTimeout < 5000) {
            isDay = false;
        } else {
            // check if in between
            isDay = nowDate.getTime() > todaySunrise.getTime() - 60000 && nowDate <= todaySunset;
        }

        const valDayTime = isDayTime ? !!isDayTime.val : false;
        if (valDayTime !== isDay || isDayTime === null) {
            await this.setState('variables.isDayTime', isDay, true);
        }

        const dayLightSaving: ioBroker.State | null | undefined =
            await this.getStateAsync('variables.isDaylightSaving');
        const isDayLightSaving = dstOffsetAtDate(nowDate) !== 0;
        const val = dayLightSaving ? !!dayLightSaving.val : false;

        if (val !== isDayLightSaving || dayLightSaving === null) {
            await this.setState('variables.isDaylightSaving', isDayLightSaving, true);
        }

        let nextTimeout = sunriseTimeout;
        if (sunriseTimeout > sunsetTimeout) {
            nextTimeout = sunsetTimeout;
        }
        nextTimeout = nextTimeout - 3000;
        if (nextTimeout < 3000) {
            nextTimeout = 3000;
        }

        this.dayScheduleTimer = setTimeout(() => this.dayTimeSchedules(), nextTimeout);
    }

    stopTimeSchedules(): void {
        if (this.dayScheduleTimer) {
            clearTimeout(this.dayScheduleTimer);
            this.dayScheduleTimer = null;
        }
        if (this.sunScheduleTimer) {
            clearTimeout(this.sunScheduleTimer);
            this.sunScheduleTimer = null;
        }
        if (this.timeScheduleTimer) {
            clearTimeout(this.timeScheduleTimer);
            this.timeScheduleTimer = null;
        }
    }

    async patchFont(): Promise<boolean> {
        let stat: Stats | undefined;
        let dbFile: Buffer | undefined;
        try {
            stat = statSync(`${__dirname}/admin/vs/base/browser/ui/codicons/codicon/codicon.ttf`);
            const _dbFile = await this.readFileAsync(
                'javascript.admin',
                `vs/base/browser/ui/codicons/codicon/codicon.ttf`,
            );
            if (_dbFile?.file) {
                dbFile = _dbFile.file as Buffer;
            }
        } catch {
            // ignore
        }

        if (stat?.size !== 73452 || dbFile?.byteLength !== 73452) {
            try {
                const buffer = Buffer.from(
                    JSON.parse(readFileSync(`${__dirname}/admin/vsFont/codicon.json`).toString()),
                    'base64',
                );

                const jszip = await import('jszip');
                const zip = await jszip.loadAsync(buffer);
                let data: ArrayBuffer | undefined;
                if (zip) {
                    data = await zip.file('codicon.ttf')?.async('arraybuffer');
                    if (data?.byteLength !== 73452) {
                        this.log.error(`Cannot patch font: invalid font file!`);
                        return false;
                    }
                } else {
                    this.log.error(`Cannot patch font: invalid font file!`);
                    return false;
                }
                writeFileSync(`${__dirname}/admin/vs/base/browser/ui/codicons/codicon/codicon.ttf`, Buffer.from(data));
                // upload this file
                await this.writeFileAsync(
                    'javascript.admin',
                    'vs/base/browser/ui/codicons/codicon/codicon.ttf',
                    Buffer.from(data),
                );
                return true;
            } catch (err: unknown) {
                this.log.error(`Cannot patch font: ${err as Error}`);
                return false;
            }
        }
        return false;
    }

    async sunTimeSchedules(): Promise<void> {
        if (this.config.createAstroStates) {
            if (!isNaN(this.config.longitude) && !isNaN(this.config.longitude)) {
                const calcDate = getAstroStartOfDay();

                const times = this.mods.suncalc.getTimes(calcDate, this.config.latitude, this.config.longitude);

                this.log.debug(`[sunTimeSchedules] Times: ${JSON.stringify(times)}`);

                for (const t in times) {
                    try {
                        const objId = `variables.astro.${t}`;

                        await this.setObjectNotExistsAsync(objId, {
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

                        if (times[t] !== null && !isNaN(times[t].getTime())) {
                            const timeFormatted = formatHoursMinutesSeconds(times[t]);
                            await this.setState(objId, {
                                val: timeFormatted,
                                c: times[t].toISOString(),
                                ack: true,
                            });
                        } else {
                            await this.setState(objId, { val: null, c: 'n/a', ack: true, q: 0x01 });
                        }
                    } catch (err: unknown) {
                        this.log.error(
                            `[sunTimeSchedules] Unable to set state for astro time "${t}" (${times[t].getTime()}): ${err as Error}`,
                        );
                    }
                }

                const todayDate = new Date();
                todayDate.setHours(0);
                todayDate.setMinutes(0);
                todayDate.setSeconds(1);
                todayDate.setMilliseconds(0);
                todayDate.setDate(todayDate.getDate() + 1);

                this.log.debug(`[sunTimeSchedules] Next: ${todayDate.toISOString()}`);
                this.sunScheduleTimer = setTimeout(() => this.sunTimeSchedules(), todayDate.getTime() - Date.now());
            }
        } else {
            // remove astro states if disabled
            this.delObject('variables.astro', { recursive: true });
        }
    }

    /**
     * Redirects the virtual-tsc log output to the ioBroker log
     */
    tsLog = (message: string, severity?: ioBroker.LogLevel): void => {
        // shift the severities around, we don't care about the small details
        if (!severity || severity === 'info') {
            severity = 'debug';
        } else if (severity === 'debug') {
            // Don't spam build logs on Travis
            if (isCI) {
                return;
            }
            severity = 'silly';
        }

        if (this?.log) {
            this.log[severity](message);
        } else {
            console.log(`[${severity.toUpperCase()}] ${message}`);
        }
    };

    addGetProperty(object: Record<string, any>): void {
        try {
            Object.defineProperty(object, 'get', {
                value: function (id: string): any {
                    return this[id] || this[`${this.namespace}.${id}`];
                },
                enumerable: false,
            });
        } catch {
            console.error('Cannot install get property');
        }
    }

    /**
     * @param scriptID - The current script the declarations were generated from
     * @param declarations
     */
    provideDeclarationsForGlobalScript(scriptID: string, declarations: string): void {
        // Remember which declarations this global script had access to,
        // we need this so the editor doesn't show a duplicate identifier error
        if (this.globalDeclarations != null && this.globalDeclarations !== '') {
            this.knownGlobalDeclarationsByScript[scriptID] = this.globalDeclarations;
        }
        // and concatenate the global declarations for the next scripts
        this.globalDeclarations += `${declarations}\n`;
        // remember all previously generated global declarations,
        // so global scripts can reference each other
        const globalDeclarationPath = 'global.d.ts';
        tsAmbient[globalDeclarationPath] = this.globalDeclarations;
        // make sure the next script compilation has access to the updated declarations
        this.tsServer.provideAmbientDeclarations({
            [globalDeclarationPath]: this.globalDeclarations,
        });
        jsDeclarationServer.provideAmbientDeclarations({
            [globalDeclarationPath]: this.globalDeclarations,
        });
    }

    fixLineNo(line: string): string {
        if (line.includes('javascript.js:')) {
            return line;
        }
        if (!/script[s]?\.js[.\\/]/.test(line)) {
            return line;
        }
        if (/:([\d]+):/.test(line)) {
            line = line.replace(
                /:([\d]+):/,
                ($0, $1) => `:${$1 > this.globalScriptLines + 1 ? $1 - this.globalScriptLines - 1 : $1}:`,
            ); // one line for 'async function ()'
        } else {
            line = line.replace(
                /:([\d]+)$/,
                ($0, $1) => `:${$1 > this.globalScriptLines + 1 ? $1 - this.globalScriptLines - 1 : $1}`,
            ); // one line for 'async function ()'
        }
        return line;
    }

    debugStop(): Promise<void> {
        if (this.debugState.child) {
            this.debugSendToInspector({ cmd: 'end' });
            this.debugState.endTimeout = setTimeout(() => {
                this.debugState.endTimeout = null;
                this.debugState.child?.kill('SIGTERM');
            }, 500);
            this.debugState.promiseOnEnd = this.debugState.promiseOnEnd || Promise.resolve(0);
        } else {
            this.debugState.promiseOnEnd = Promise.resolve(0);
        }

        return this.debugState.promiseOnEnd.then(() => {
            this.debugState.child = null;
            this.debugState.running = false;
            this.debugState.scriptName = '';
            if (this.debugState.endTimeout) {
                clearTimeout(this.debugState.endTimeout);
                this.debugState.endTimeout = null;
            }
        });
    }

    async debugDisableScript(id: string | undefined): Promise<void> {
        if (id) {
            const obj = this.objects[id];
            if (obj?.common?.enabled) {
                await this.extendForeignObjectAsync(obj._id, { common: { enabled: false } });
            }
        }
    }

    debugSendToInspector(message: any): void {
        if (this.debugState.child) {
            try {
                this.log.info(`send to debugger: ${message}`);
                this.debugState.child.send(message);
            } catch {
                this.debugStop().then(() =>
                    this.log.info(
                        `Debugging of "${this.debugState.scriptName}" was stopped, because started in normal mode`,
                    ),
                );
            }
        } else {
            this.log.error(`Cannot send command to terminated inspector`);
            this.setState(
                'debug.from',
                JSON.stringify({ cmd: 'error', error: `Cannot send command to terminated inspector`, id: 1 }),
                true,
            );
        }
    }

    debugStart(data: { breakOnStart?: boolean; scriptName?: string; adapter?: string }): void {
        if (Date.now() - this.debugState.started < 1000) {
            console.log('Start ignored');
            return;
        }

        this.debugState.started = Date.now();
        // stop the script if it's running
        this.debugDisableScript(data.scriptName)
            .then(() => this.debugStop())
            .then(() => {
                if (data.adapter) {
                    this.debugState.adapterInstance = data.adapter;
                    this.debugState.scriptName = '';
                } else {
                    this.debugState.adapterInstance = '';
                    this.debugState.scriptName = data.scriptName as string;
                }

                this.debugState.breakOnStart = data.breakOnStart;

                this.debugState.promiseOnEnd = new Promise(resolve => {
                    const options: ForkOptions = {
                        stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
                        //stdio: ['pipe', 'pipe', 'pipe', 'ipc']
                    };
                    const args: string[] = [];
                    if (this.debugState.adapterInstance) {
                        args.push('--breakOnStart');
                    }

                    this.debugState.child = fork(`${__dirname}/lib/inspect.ts`, args, options);

                    /*debugState.child.stdout.setEncoding('utf8');
                    debugState.child.stderr.setEncoding('utf8');
                    debugState.child.stdout.on('data', childPrint);
                    debugState.child.stderr.on('data', childPrint);*/

                    this.debugState.child?.on(
                        'message',
                        (
                            message:
                                | string
                                | {
                                      cmd: 'ready' | 'watched' | 'paused' | 'resumed' | 'log' | 'readyToDebug';
                                      severity?: string;
                                      text?: string;
                                      scriptId?: string;
                                      script?: string;
                                  },
                        ) => {
                            let oMessage: {
                                cmd: 'ready' | 'watched' | 'paused' | 'resumed' | 'log' | 'readyToDebug';
                                severity?: string;
                                text?: string;
                                scriptId?: string;
                                script?: string;
                            };
                            if (typeof message === 'string') {
                                try {
                                    oMessage = JSON.parse(message);
                                } catch {
                                    return this.log.error(`Cannot parse message from inspector: ${message}`);
                                }
                            } else {
                                oMessage = message;
                            }

                            if (oMessage.cmd !== 'ready') {
                                this.setState('debug.from', JSON.stringify(oMessage), true);
                            }

                            switch (oMessage.cmd) {
                                case 'ready': {
                                    this.debugSendToInspector({
                                        cmd: 'start',
                                        scriptName: this.debugState.scriptName,
                                        adapterInstance: this.debugState.adapterInstance,
                                        instance: this.instance,
                                    });
                                    break;
                                }

                                case 'watched': {
                                    //console.log(`WATCHED: ${JSON.stringify(oMessage)}`);
                                    break;
                                }

                                case 'paused': {
                                    this.debugState.paused = true;
                                    console.log(`host: PAUSED`);
                                    break;
                                }

                                case 'resumed': {
                                    this.debugState.paused = false;
                                    //console.log(`STARTED`);
                                    break;
                                }

                                case 'log': {
                                    console.log(`[${oMessage.severity}] ${oMessage.text}`);
                                    break;
                                }

                                case 'readyToDebug': {
                                    console.log(
                                        `host: readyToDebug (set breakpoints): [${oMessage.scriptId}] ${oMessage.script}`,
                                    );
                                    break;
                                }
                            }
                        },
                    );
                    this.debugState.child?.on('error', error => {
                        this.log.error(`Cannot start inspector: ${error}`);
                        this.setState('debug.from', JSON.stringify({ cmd: 'error', error }), true);
                    });

                    this.debugState.child?.on('exit', (code: number): void => {
                        if (code) {
                            this.setState(
                                'debug.from',
                                JSON.stringify({ cmd: 'error', error: `invalid response code: ${code}` }),
                                true,
                            );
                        }
                        this.setState('debug.from', JSON.stringify({ cmd: 'debugStopped', code }), true);
                        this.debugState.child = null;
                        resolve(code);
                    });
                });
            });
    }
}

function patternMatching(
    event: EventObj,
    patternFunctions: PatternEventCompareFunction[] & { logic?: 'and' | 'or' },
): boolean {
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

// If started as allInOne mode => return function to create instance
if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<AdapterOptions> | undefined) => new JavaScript(options);
} else {
    // otherwise start the instance directly
    (() => new JavaScript())();
}
