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
import prettier from 'prettier';

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

// @ts-expect-error no types available
import * as suncalc from 'suncalc2';
import * as axios from 'axios';
// @ts-expect-error no types available
import * as wake_on_lan from 'wake_on_lan';
import * as nodeSchedule from 'node-schedule';

import {
    getAbsoluteDefaultDataDir,
    Adapter,
    Credentials,
    EXIT_CODES,
    type AdapterOptions,
} from '@iobroker/adapter-core';
import type SentryPlugin from '@iobroker/plugin-sentry';
import type { GetTimesResult } from 'suncalc';
import type { CompileResult } from 'virtual-tsc/build/util';

import { Mirror } from './lib/mirror';
import ProtectFs from './lib/protectFs';
import { setLanguage, getLanguage } from './lib/words';
import { sandBox, removeFromDispatchIndex } from './lib/sandbox';
import { requestModuleNameByUrl } from './lib/nodeModulesManagement';
import {
    resolveProviderCredentials,
    resolveTestCredentials,
    listAvailableProviders,
    getProviderCredentialId,
} from './lib/aiProviderResolver';
import {
    translateToolsToAnthropic,
    translateMessagesToAnthropic,
    translateAnthropicResponseToOpenAI,
} from './lib/anthropicAdapter';
import { createEventObject, type EventObj } from './lib/eventObj';
import { type AstroEventName, Scheduler } from './lib/scheduler';
import {
    getTargetTsLib,
    getTsCompilerOptions,
    tsCompilerOptions,
    jsDeclarationCompilerOptions,
} from './lib/typescriptSettings';
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
    DebugState,
} from './types';
import type { PatternEventCompareFunction } from './lib/patternCompareFunctions';
import { decryptText } from './lib/crypto';

type MODULES = {
    fs: ProtectFs;
    'fs/promises': ProtectFs['promises'];
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
// If an adapter update fixes the compilation bugs, a user won't notice until the changes and re-save the script.
// To avoid that, we also include the
// adapter version and TypeScript version in the hash
const tsSourceHashBase = `versions:adapter=${packageJson.version},typescript=${packageJson.dependencies.typescript}`;

// taken from here: https://stackoverflow.com/questions/11887934/how-to-check-if-dst-daylight-saving-time-is-in-effect-and-if-so-the-offset
function dstOffsetAtDate(dateInput: Date): number {
    const fullYear: number = dateInput.getFullYear() | 0;
    // "Leap Years are any year that can be exactly divided by 4 (2012, 2016, etc.)
    //   except if it can be exactly divided by 100, then it isn't (2100, 2200, etc.)
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

// Due to a npm bug, virtual-tsc may be hoisted to the top level node_modules, but
// TypeScript may still be in the adapter level (https://npm.community/t/packages-with-peerdependencies-are-incorrectly-hoisted/4794),
// so we need to tell virtual-tsc where TypeScript is
setTypeScriptResolveOptions({
    paths: [require.resolve('typescript')],
});

// compiler instance for global JS declarations
const jsDeclarationServer: Server = new Server(jsDeclarationCompilerOptions, isCI ? false : undefined);
/**
 * Stores the IDs of script objects whose change should be ignored because
 * the compiled source was just updated
 */

const HTTP_STATUS_TEXTS: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    429: 'Too Many Requests / Rate Limit',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
};

function httpStatusText(code: number): string {
    return HTTP_STATUS_TEXTS[code] ?? `Error ${code}`;
}

/**
 * Resolves the correct http/https module based on the URL string.
 * Returns null if the URL is invalid.
 */
function resolveRequestModule(url: string): { module: typeof https | typeof http; isHttps: boolean } | null {
    try {
        const { protocol } = new URL(url);
        const isHttps = protocol === 'https:';
        return { module: isHttps ? https : http, isHttps };
    } catch {
        return null;
    }
}

class JavaScript extends Adapter {
    declare public config: JavaScriptAdapterConfig;

    private readonly context: JavascriptContext;

    private errorLogFunction: {
        error: (msg: string) => void;
        warn: (msg: string) => void;
        info: (msg: string) => void;
        debug: (msg: string) => void;
        silly: (msg: string) => void;
    } = {
        error: (msg: string) => console.error(msg),
        warn: (msg: string) => console.warn(msg),
        info: (msg: string) => console.log(msg),
        debug: (msg: string) => console.debug(msg),
        silly: (msg: string) => console.debug(msg),
    };

    private readonly mods: MODULES;

    private objectsInitDone = false;
    private statesInitDone = false;

    private objects: Record<string, ioBroker.Object> = {};
    private states: Record<string, ioBroker.State> = {};
    private readonly interimStateValues: Record<string, ioBroker.State> = {};
    private readonly stateIds: string[] = [];
    /** Fast O(1) lookup set – always kept in sync with stateIds */
    private readonly stateIdSet: Set<string> = new Set();

    private readonly subscriptions: SubscriptionResult[] = [];
    /**
     * O(1) dispatch map for subscriptions with exact (non-wildcard) string IDs.
     * Always kept in sync with `subscriptions`.
     */
    private readonly subscriptionsMap: Map<string, SubscriptionResult[]> = new Map();
    /**
     * Subscriptions whose pattern.id is a RegExp, contains wildcards (*,?), or is undefined.
     * These must still be checked linearly on every state change.
     */
    private readonly subscriptionsWildcard: SubscriptionResult[] = [];
    private readonly subscriptionsFile: FileSubscriptionResult[] = [];
    private readonly subscriptionsObject: SubscribeObject[] = [];
    /** O(1) dispatch map for subscriptionsObject – pattern → subscribers */
    private readonly subscriptionsObjectMap: Map<string, SubscribeObject[]> = new Map();
    /** IO-9: Cache for sendTo broadcast – adapterName → instance list, invalidated on object change */
    private readonly sendToInstanceCache: Map<string, string[]> = new Map();
    private readonly subscribedPatterns: Record<string, number> = {};
    private readonly subscribedPatternsFile: Record<string, number> = {};
    private readonly adapterSubs: Record<string, Set<string>> = {};
    private readonly timers: { [scriptName: string]: JavascriptTimer[] } = {};
    /** Reverse-index: scriptName → Set of stateIds that have timers for this script – O(1) cleanup */
    private readonly timersByScript: Map<string, Set<string>> = new Map();
    /** O(1) Set for enum-id lookups – replaces sorted string[] array */
    private readonly _enums: Set<string> = new Set();
    private readonly names: { [name: string]: string | string[] } = {}; // name: id
    /** Reverse map: id → name for O(1) getName() lookups */
    private readonly nameById: Map<string, string> = new Map();
    private readonly scripts: Record<string, JsScript> = {};
    private password: string = '';
    private readonly messageBusHandlers: Record<
        string,
        Record<string, { id: number; sandbox: SandboxType; cb: (data: any, result: any) => void }[]>
    > = {};
    private readonly logSubscriptions: Record<
        string,
        {
            sandbox: SandboxType;
            cb: (info: ioBroker.LogMessage) => void;
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

    /**
     * Decrypted AI API keys cached from the central credential store (manager mode),
     * keyed by credential ID (e.g. `system.credentials.anthropic`). Kept fresh by the
     * subscriptions set up in `subscribeAiCredentials`.
     */
    private readonly aiCredentialCache: Map<string, string> = new Map();
    /** Unsubscribe callbacks for the AI credential subscriptions (manager mode). */
    private aiCredentialUnsubscribers: (() => Promise<void>)[] = [];

    private globalScript = '';
    /** Generated declarations for global TypeScripts */
    private globalDeclarations = '';
    // Remember which definitions the global scripts
    // have access to, because it depends on the compilation order
    private knownGlobalDeclarationsByScript: Record<string, string> = {};
    private globalScriptLines = 0;
    /** Running counter to build unique names for ad-hoc scripts started via the "execute" message */
    private executeCounter = 0;
    // compiler instance for typescript
    private tsServer: Server;

    private logCollectors: { name: string; collector: (severity: ioBroker.LogLevel, msg: string) => void }[] = [];

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
             * If the JS-Controller catches an unhandled error, this will be called,
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
                        this.logError(scriptName, 'Error:', err);

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
            'fs/promises': {} as ProtectFs['promises'],
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

        this.context = {
            mods: this.mods,
            objects: this.objects,
            states: this.states,
            interimStateValues: this.interimStateValues,
            stateIds: this.stateIds,
            errorLogFunction: this.errorLogFunction,
            subscriptions: this.subscriptions,
            subscriptionsMap: this.subscriptionsMap,
            subscriptionsWildcard: this.subscriptionsWildcard,
            subscriptionsFile: this.subscriptionsFile,
            subscriptionsObject: this.subscriptionsObject,
            subscriptionsObjectMap: this.subscriptionsObjectMap,
            sendToInstanceCache: this.sendToInstanceCache,
            subscribedPatterns: this.subscribedPatterns,
            subscribedPatternsFile: this.subscribedPatternsFile,
            adapterSubs: this.adapterSubs,
            cacheObjectEnums: {},
            timers: this.timers,
            timersByScript: this.timersByScript,
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
            adapter: this,
            logError: this.logError.bind(this),
            allowSelfSignedCerts: false,
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

            // update this._enums Set
            if (obj) {
                this._enums.add(id);
            } else {
                this._enums.delete(id);
            }
        }

        // IO-9: Invalidate sendTo instance-cache when adapter instances change
        if (id.startsWith('system.adapter.')) {
            const parts = id.split('.');
            if (parts.length >= 3) {
                const adapterName = parts[2]; // e.g. "zigbee" from "system.adapter.zigbee.0"
                this.sendToInstanceCache.delete(adapterName);
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

        // send changes to the disk mirror
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

        // O(1) dispatch via pattern map instead of O(n) forEach
        const objSubs = this.subscriptionsObjectMap.get(id);
        if (objSubs) {
            for (const sub of objSubs) {
                try {
                    sub.callback(id, obj);
                } catch (err: any) {
                    this.log.error(`Error in callback: ${err.toString()}`);
                }
            }
        }

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
                await this.createActiveObject(id, !!obj.common.enabled);
                await this.createProblemObject(id);
                if (obj.common.enabled) {
                    // if enabled => Start a script
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
                    await this.createActiveObject(id, !!obj.common.enabled);
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
                } else if (
                    obj.common.engine === `system.adapter.${this.namespace}` ||
                    formerObj.common.engine === `system.adapter.${this.namespace}`
                ) {
                    // Source changed => restart the script (only on the relevant instance)
                    this.stopCounters[id] = this.stopCounters[id] ? this.stopCounters[id] + 1 : 1;
                    void this.stopScript(id).then(() => {
                        // only start again after stop when "last" object change to prevent problems on
                        // multiple changes in fast frequency
                        if (!--this.stopCounters[id]) {
                            void this.loadScriptById(id);
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
                    void this.extendForeignObject(this.objects[id].native.script, {
                        common: { enabled: state.val },
                    });
                }

                // monitor if the adapter is alive and send all subscriptions once more, after the adapter goes online
                if (/*oldState && */ oldState.val === false && state.val && id.endsWith('.alive')) {
                    if (this.adapterSubs[id]) {
                        const parts = id.split('.');
                        const a = `${parts[2]}.${parts[3]}`;
                        for (const sub of this.adapterSubs[id]) {
                            this.log.info(`Detected coming adapter "${a}". Send subscribe: ${sub}`);
                            this.sendTo(a, 'subscribe', sub);
                        }
                    }
                }
            } else if (/*!oldState && */ !this.stateIdSet.has(id)) {
                this.sortedInsert(id);
                this.stateIdSet.add(id);
            }
            this.states[id] = state;
        } else {
            if (oldState) {
                delete this.states[id];
            }
            state = {} as ioBroker.State;
            const pos = this.binaryIndexOf(this.stateIds, id);
            if (pos !== -1) {
                this.stateIds.splice(pos, 1);
                this.stateIdSet.delete(id);
            }
        }

        // Collect matching subscriptions:
        // 1. O(1) exact-id map lookup – only buckets for this specific state id
        // 2. Linear scan over wildcard/regex subscriptions (unavoidable)
        // EventObj is created lazily – only when at least one subscription must be dispatched.
        const exactSubs = this.subscriptionsMap.get(id);
        const wildcardSubs = this.subscriptionsWildcard;
        const hasWork = (exactSubs && exactSubs.length > 0) || wildcardSubs.length > 0;

        if (!hasWork) {
            return;
        }

        let _eventObj: EventObj | null = null;
        const getEvent = (): EventObj => {
            if (!_eventObj) {
                _eventObj = createEventObject(
                    this.context,
                    id,
                    this.convertBackStringifiedValues(id, state),
                    this.convertBackStringifiedValues(id, oldState),
                );
            }
            return _eventObj;
        };

        if (exactSubs) {
            for (let i = 0, l = exactSubs.length; i < l; i++) {
                const sub = exactSubs[i];
                if (sub?.patternCompareFunctions && patternMatching(getEvent(), sub.patternCompareFunctions)) {
                    try {
                        sub.callback(getEvent());
                    } catch (err: any) {
                        this.log.error(`Error in callback: ${err.toString()}`);
                    }
                }
            }
        }

        // if this state matches any subscriptions
        for (let i = 0, l = wildcardSubs.length; i < l; i++) {
            const sub = wildcardSubs[i];
            if (sub?.patternCompareFunctions && patternMatching(getEvent(), sub.patternCompareFunctions)) {
                try {
                    sub.callback(getEvent());
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
        try {
            await this.debugStop();
            this.stopTimeSchedules();
            if (this.setStateCountCheckInterval) {
                clearInterval(this.setStateCountCheckInterval);
                this.setStateCountCheckInterval = null;
            }
            await this.unsubscribeAiCredentials();
            await this.stopAllScripts();
        } catch (err: unknown) {
            this.log.error(`Error during unload: ${(err as Error).message}`);
        } finally {
            if (typeof callback === 'function') {
                callback();
            }
        }
    }

    async onReady(): Promise<void> {
        this.errorLogFunction = this.log;
        this.context.errorLogFunction = this.log;
        this.config.maxSetStatePerMinute = parseInt(this.config.maxSetStatePerMinute as unknown as string, 10) || 1000;
        this.config.maxTriggersPerScript = parseInt(this.config.maxTriggersPerScript as unknown as string, 10) || 100;

        if (this.supportsFeature?.('PLUGINS')) {
            const sentryInstance: InstanceType<typeof SentryPlugin> = this.getPluginInstance('sentry') as InstanceType<
                typeof SentryPlugin
            >;
            if (sentryInstance) {
                const Sentry = sentryInstance.getSentryObject();
                Sentry?.withScope(scope => {
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
                                // Exclude event if own directory is included but not inside own node_modules
                                const ownNodeModulesDir = join(__dirname, 'node_modules');
                                if (
                                    !eventData.stacktrace.frames.find(
                                        frame =>
                                            frame.filename?.includes(__dirname) &&
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
                });
            }
        }

        await this.main();
    }

    /** Read and decrypt a single AI credential's key from the central store; returns '' (and logs) on error. */
    private async readAiCredentialKey(id: string): Promise<string> {
        if (!Credentials?.getCredentials) {
            this.log.warn(
                `Cannot read AI credential "${id}": Credentials API is only with 7.2 js-controller available`,
            );
            return '';
        }
        try {
            const cred = await Credentials.getCredentials<Credentials.KeyCredentials>(this, id);
            return (cred?.values?.key || '').trim();
        } catch (e) {
            this.log.warn(`Cannot read AI credential "${id}": ${e instanceof Error ? e.message : String(e)}`);
            return '';
        }
    }

    /**
     * Resolve the API key (and base URL) for an AI provider.
     *
     * In `manual` mode the key comes from the encryptedNative adapter config.
     * In `manager` mode the config only stores the ID of a credential in the central
     * ioBroker credential store (`system.credentials.*`); the actual key is taken from the
     * `aiCredentialCache` (kept fresh by `subscribeAiCredentials`) or, for credentials we are
     * not subscribed to (e.g. a not-yet-saved selection in the settings dialog), read directly.
     *
     * The settings-dialog Test button may pass form values that are not saved yet
     * (`messageApiKey` / `messageCredentialId` / `credentialType`); those win over the stored config.
     */
    private async resolveAiCredentials(
        provider: string,
        opts: {
            messageBaseUrl?: string;
            messageApiKey?: string;
            messageCredentialId?: string;
            credentialType?: 'manual' | 'manager';
        } = {},
    ): Promise<{ apiKey: string; baseUrl: string }> {
        const mode = opts.credentialType || this.config.credentialType || 'manual';
        if (mode === 'manager') {
            // The base URL is not a secret and is resolved the same way in both modes.
            const { baseUrl } = resolveProviderCredentials(this.config, provider, opts.messageBaseUrl);
            const id = (opts.messageCredentialId || getProviderCredentialId(this.config, provider)).trim();
            if (!id) {
                return { apiKey: '', baseUrl };
            }
            // Prefer the cached value kept fresh by the credential subscription.
            const cached = this.aiCredentialCache.get(id);
            const apiKey = cached !== undefined ? cached : await this.readAiCredentialKey(id);
            return { apiKey, baseUrl };
        }
        // Manual mode. The Test button sends the current form key (maybe empty) — let it win.
        if (opts.messageApiKey !== undefined) {
            return resolveTestCredentials(this.config, provider, opts.messageApiKey, opts.messageBaseUrl);
        }
        return resolveProviderCredentials(this.config, provider, opts.messageBaseUrl);
    }

    /**
     * In `manager` mode, subscribe to all configured AI credentials so that edits made in the
     * admin credential manager (Settings → Credentials) are picked up live, without restarting
     * the adapter (the `system.credentials.*` objects are global, not part of the instance config).
     * The decrypted keys are cached and kept fresh by the subscription handlers.
     */
    private async subscribeAiCredentials(): Promise<void> {
        // Always start from a clean state (idempotent — also used to re-subscribe).
        await this.unsubscribeAiCredentials();
        if (this.config.credentialType !== 'manager') {
            return;
        }
        if (!Credentials?.subscribeCredentials) {
            this.log.warn(`Cannot subscribe AI credential: Credentials API is only with 7.2 js-controller available`);
            return;
        }
        // Collect the distinct credential IDs configured across all AI providers.
        const ids = new Set<string>();
        for (const provider of ['openai', 'anthropic', 'gemini', 'deepseek', 'custom'] as const) {
            const id = getProviderCredentialId(this.config, provider);
            if (id) {
                ids.add(id);
            }
        }
        for (const id of ids) {
            try {
                const unsubscribe = await Credentials.subscribeCredentials<Credentials.KeyCredentials>(
                    this,
                    id,
                    (changedId, cred) => {
                        if (cred) {
                            this.aiCredentialCache.set(changedId, (cred.values?.key || '').trim());
                            this.log.debug(`AI credential "${changedId}" updated`);
                        } else {
                            // The credential was deleted
                            this.aiCredentialCache.delete(changedId);
                            this.log.debug(`AI credential "${changedId}" was deleted`);
                        }
                    },
                );
                this.aiCredentialUnsubscribers.push(unsubscribe);
                // Prime the cache with the current value (the handler may only fire on later changes).
                this.aiCredentialCache.set(id, await this.readAiCredentialKey(id));
            } catch (e) {
                this.log.warn(
                    `Cannot subscribe to AI credential "${id}": ${e instanceof Error ? e.message : String(e)}`,
                );
            }
        }
        if (this.aiCredentialUnsubscribers.length) {
            this.log.debug(`Subscribed to ${this.aiCredentialUnsubscribers.length} AI credential(s)`);
        }
    }

    /** Tear down all AI credential subscriptions and clear the cache. */
    private async unsubscribeAiCredentials(): Promise<void> {
        const unsubscribers = this.aiCredentialUnsubscribers;
        this.aiCredentialUnsubscribers = [];
        this.aiCredentialCache.clear();
        for (const unsubscribe of unsubscribers) {
            try {
                await unsubscribe();
            } catch (e) {
                this.log.warn(`Cannot unsubscribe from AI credential: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
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
                        // the script name could be script.js.xxx or only xxx
                        if (
                            (!obj.message.script || obj.message.script === name) &&
                            this.messageBusHandlers[name][obj.message.message]
                        ) {
                            this.messageBusHandlers[name][obj.message.message].forEach(handler => {
                                const sandbox = handler.sandbox;

                                if (sandbox.verbose) {
                                    sandbox.log(`onMessage: ${JSON.stringify(obj.message)}`, 'info');
                                }

                                try {
                                    if (obj.callback) {
                                        handler.cb.call(sandbox, obj.message.data, (result: any) => {
                                            if (sandbox.verbose) {
                                                sandbox.log(`onMessage result: ${JSON.stringify(result)}`, 'info');
                                            }

                                            this.sendTo(obj.from, obj.command, result, obj.callback);
                                        });
                                    } else {
                                        handler.cb.call(sandbox, obj.message.data, (result: any) => {
                                            if (sandbox.verbose) {
                                                sandbox.log(`onMessage result: ${JSON.stringify(result)}`, 'info');
                                            }
                                        });
                                    }
                                } catch (err: unknown) {
                                    void this.setState(
                                        `scriptProblem.${name.substring(SCRIPT_CODE_MARKER.length)}`,
                                        true,
                                        true,
                                    );
                                    this.logError(name, 'Error in callback:', err as Error);
                                }
                            });
                        }
                    });
                }
                break;

            case 'loadTypings': {
                // Load typings for the editor
                const typings: Record<string, string> = {};

                // try to load TypeScript lib files from disk
                try {
                    const typescriptLibs = resolveTypescriptLibs(getTargetTsLib(this.config));
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

                    const result: Record<string, { isValidDate: boolean; serverTime: string; date: string }> = {};
                    const keys = Object.keys(astroEvents).sort(
                        (a, b) =>
                            (astroEvents as unknown as Record<string, number>)[a] -
                            (astroEvents as unknown as Record<string, number>)[b],
                    );
                    keys.forEach(key => {
                        const validDate =
                            (astroEvents as unknown as Record<string, number | null>)[key] !== null &&
                            !isNaN((astroEvents as unknown as Record<string, Date>)[key].getTime());

                        result[key] = {
                            isValidDate: validDate,
                            serverTime: validDate
                                ? formatHoursMinutesSeconds((astroEvents as unknown as Record<string, Date>)[key])
                                : 'n/a',
                            date: validDate
                                ? (astroEvents as unknown as Record<string, Date>)[key].toISOString()
                                : 'n/a',
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
                    void this.debugStop().then(() => console.log('stopped'));
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

            case 'chatCompletion': {
                // Proxy chat completion requests to an OpenAI-compatible API endpoint.
                // API keys are resolved server-side from the encryptedNative config or the central
                // credentials manager — they never leave the adapter (frontend only sends `provider`).
                void (async () => {
                    if (!obj.callback) {
                        return;
                    }
                    const chatModel = (obj.message?.model || '').trim();
                    const messages = obj.message?.messages;
                    const tools = obj.message?.tools;
                    const provider = (obj.message?.provider || 'openai').trim();
                    const { apiKey, baseUrl } = await this.resolveAiCredentials(provider, {
                        messageBaseUrl: obj.message?.baseUrl,
                    });
                    // Anthropic, Gemini, and DeepSeek always require an API key; OpenAI-compatible allows empty key with custom base URL
                    if (
                        !apiKey &&
                        (provider === 'anthropic' || provider === 'gemini' || provider === 'deepseek' || !baseUrl)
                    ) {
                        this.sendTo(obj.from, obj.command, { error: 'No API key provided' }, obj.callback);
                        return;
                    }
                    if (!chatModel || !messages) {
                        this.sendTo(obj.from, obj.command, { error: 'Model and messages are required' }, obj.callback);
                        return;
                    }

                    let url: string;
                    const chatHeaders: Record<string, string | number> = {
                        'Content-Type': 'application/json',
                    };
                    let bodyObj: Record<string, unknown>;

                    if (provider === 'anthropic') {
                        url = 'https://api.anthropic.com/v1/messages';
                        chatHeaders['x-api-key'] = apiKey;
                        chatHeaders['anthropic-version'] = '2023-06-01';
                        // Translate OpenAI-format messages/tools into Anthropic's content-block format.
                        const { system: systemText, messages: anthropicMessages } =
                            translateMessagesToAnthropic(messages);
                        const anthropicTools = tools?.length ? translateToolsToAnthropic(tools) : [];
                        bodyObj = {
                            model: chatModel,
                            max_tokens: 8192,
                            stream: false,
                            ...(systemText ? { system: systemText } : {}),
                            messages: anthropicMessages,
                            ...(anthropicTools.length ? { tools: anthropicTools } : {}),
                        };
                    } else if (provider === 'gemini') {
                        url = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
                        if (apiKey) {
                            chatHeaders.Authorization = `Bearer ${apiKey}`;
                        }
                        bodyObj = { model: chatModel, messages, stream: false, ...(tools?.length ? { tools } : {}) };
                    } else if (provider === 'deepseek') {
                        url = 'https://api.deepseek.com/chat/completions';
                        chatHeaders.Authorization = `Bearer ${apiKey}`;
                        bodyObj = { model: chatModel, messages, stream: false, ...(tools?.length ? { tools } : {}) };
                    } else {
                        url = `${baseUrl || 'https://api.openai.com/v1'}/chat/completions`;
                        if (apiKey) {
                            chatHeaders.Authorization = `Bearer ${apiKey}`;
                        }
                        bodyObj = {
                            model: chatModel,
                            messages,
                            stream: false,
                            ...(tools?.length ? { tools } : {}),
                            // Disable thinking/reasoning for local models to save context and speed
                            ...(baseUrl ? { reasoning_effort: 'none' } : {}),
                        };
                    }

                    const body = JSON.stringify(bodyObj);
                    const bodyBuffer = Buffer.from(body, 'utf8');
                    chatHeaders['Content-Length'] = bodyBuffer.length;

                    const resolved = resolveRequestModule(url);
                    if (!resolved) {
                        this.sendTo(obj.from, obj.command, { error: `Invalid API URL: ${url}` }, obj.callback);
                        return;
                    }
                    const { module: requestModule, isHttps } = resolved;

                    try {
                        const req = requestModule.request(
                            url,
                            {
                                method: 'POST',
                                headers: chatHeaders,
                                timeout: 600000,
                                ...(isHttps && this.config.allowSelfSignedCerts ? { rejectUnauthorized: false } : {}),
                            },
                            res => {
                                let data = '';
                                res.on('data', (chunk: Buffer) => {
                                    data += chunk.toString();
                                });
                                res.on('end', () => {
                                    if (res.statusCode === 200) {
                                        try {
                                            const parsed = JSON.parse(data);
                                            let content: string;
                                            let tool_calls: unknown;
                                            if (provider === 'anthropic') {
                                                const translated = translateAnthropicResponseToOpenAI(parsed);
                                                content = translated.content;
                                                tool_calls = translated.tool_calls;
                                            } else {
                                                const message = parsed.choices?.[0]?.message;
                                                content = message?.content || '';
                                                tool_calls = message?.tool_calls;
                                            }
                                            if (!content && !(tool_calls as unknown[] | undefined)?.length) {
                                                this.sendTo(
                                                    obj.from,
                                                    obj.command,
                                                    { error: 'Empty response from API' },
                                                    obj.callback,
                                                );
                                            } else {
                                                this.sendTo(
                                                    obj.from,
                                                    obj.command,
                                                    {
                                                        success: true,
                                                        content,
                                                        ...(tool_calls ? { tool_calls } : {}),
                                                    },
                                                    obj.callback,
                                                );
                                            }
                                        } catch {
                                            this.sendTo(
                                                obj.from,
                                                obj.command,
                                                { error: 'Invalid JSON response from API' },
                                                obj.callback,
                                            );
                                        }
                                    } else {
                                        let detail = '';
                                        try {
                                            const errParsed = JSON.parse(data);
                                            detail = errParsed.error?.message || data.substring(0, 200);
                                        } catch {
                                            detail = data.substring(0, 200);
                                        }
                                        this.sendTo(
                                            obj.from,
                                            obj.command,
                                            {
                                                error: `${detail || httpStatusText(res.statusCode || 0)} (${res.statusCode})`,
                                            },
                                            obj.callback,
                                        );
                                    }
                                });
                            },
                        );

                        req.on('error', (err: Error) => {
                            this.sendTo(
                                obj.from,
                                obj.command,
                                { error: `Connection failed: ${err.message}` },
                                obj.callback,
                            );
                        });

                        req.on('timeout', () => {
                            req.destroy();
                            this.sendTo(obj.from, obj.command, { error: 'Connection timeout (600s)' }, obj.callback);
                        });

                        req.write(bodyBuffer);
                        req.end();
                    } catch (error) {
                        this.sendTo(
                            obj.from,
                            obj.command,
                            { error: `Connection failed: ${(error as Error).toString()}` },
                            obj.callback,
                        );
                    }
                })();
                break;
            }

            case 'testApiConnection': {
                // Test connection to an OpenAI-compatible API endpoint.
                // The settings-dialog Test button sends the current form value as `apiKey`
                // (so users can test before saving); otherwise we fall back to the stored key.
                void (async () => {
                    if (!obj.callback) {
                        return;
                    }
                    const provider = (obj.message?.provider || 'openai').trim();
                    const { apiKey, baseUrl } = await this.resolveAiCredentials(provider, {
                        messageApiKey: obj.message?.apiKey,
                        messageBaseUrl: obj.message?.baseUrl,
                        messageCredentialId: obj.message?.credentialId,
                        credentialType: obj.message?.credentialType,
                    });
                    // Anthropic, Gemini, and DeepSeek always require an API key; OpenAI-compatible allows empty key with custom base URL
                    if (
                        !apiKey &&
                        (provider === 'anthropic' || provider === 'gemini' || provider === 'deepseek' || !baseUrl)
                    ) {
                        this.sendTo(obj.from, obj.command, { error: 'No API key provided' }, obj.callback);
                        return;
                    }

                    let url: string;
                    const testHeaders: Record<string, string> = {
                        'Content-Type': 'application/json',
                    };

                    if (provider === 'anthropic') {
                        url = 'https://api.anthropic.com/v1/models';
                        testHeaders['x-api-key'] = apiKey;
                        testHeaders['anthropic-version'] = '2023-06-01';
                    } else if (provider === 'gemini') {
                        url = 'https://generativelanguage.googleapis.com/v1beta/openai/models';
                        if (apiKey) {
                            testHeaders.Authorization = `Bearer ${apiKey}`;
                        }
                    } else if (provider === 'deepseek') {
                        url = 'https://api.deepseek.com/models';
                        testHeaders.Authorization = `Bearer ${apiKey}`;
                    } else {
                        url = `${baseUrl || 'https://api.openai.com/v1'}/models`;
                        if (apiKey) {
                            testHeaders.Authorization = `Bearer ${apiKey}`;
                        }
                    }

                    const resolved = resolveRequestModule(url);
                    if (!resolved) {
                        this.sendTo(obj.from, obj.command, { error: `Invalid API URL: ${url}` }, obj.callback);
                        return;
                    }
                    const { module: requestModule, isHttps } = resolved;

                    try {
                        const req = requestModule.request(
                            url,
                            {
                                method: 'GET',
                                headers: testHeaders,
                                timeout: 10000,
                                ...(isHttps && this.config.allowSelfSignedCerts ? { rejectUnauthorized: false } : {}),
                            },
                            res => {
                                let data = '';
                                res.on('data', (chunk: Buffer) => {
                                    data += chunk.toString();
                                });
                                res.on('end', () => {
                                    if (res.statusCode === 200) {
                                        try {
                                            const parsed = JSON.parse(data);
                                            const models: string[] = (parsed.data || [])
                                                .map((m: { id: string }) =>
                                                    m.id.startsWith('models/') ? m.id.substring(7) : m.id,
                                                )
                                                .sort();
                                            this.sendTo(
                                                obj.from,
                                                obj.command,
                                                { success: true, models, count: models.length },
                                                obj.callback,
                                            );
                                        } catch {
                                            this.sendTo(
                                                obj.from,
                                                obj.command,
                                                { error: 'Invalid JSON response from API' },
                                                obj.callback,
                                            );
                                        }
                                    } else if (res.statusCode === 401) {
                                        this.sendTo(
                                            obj.from,
                                            obj.command,
                                            { error: 'Invalid API key (401)' },
                                            obj.callback,
                                        );
                                    } else if (res.statusCode === 403) {
                                        this.sendTo(
                                            obj.from,
                                            obj.command,
                                            { error: 'Access denied (403)' },
                                            obj.callback,
                                        );
                                    } else {
                                        // Include response body for debugging
                                        let detail = '';
                                        try {
                                            const errParsed = JSON.parse(data);
                                            detail = errParsed.error?.message || data.substring(0, 200);
                                        } catch {
                                            detail = data.substring(0, 200);
                                        }
                                        this.sendTo(
                                            obj.from,
                                            obj.command,
                                            {
                                                error: `${detail || httpStatusText(res.statusCode || 0)} (${res.statusCode})`,
                                            },
                                            obj.callback,
                                        );
                                    }
                                });
                            },
                        );

                        req.on('error', (err: Error) => {
                            this.sendTo(
                                obj.from,
                                obj.command,
                                { error: `Connection failed: ${err.message}` },
                                obj.callback,
                            );
                        });

                        req.on('timeout', () => {
                            req.destroy();
                            this.sendTo(obj.from, obj.command, { error: 'Connection timeout (10s)' }, obj.callback);
                        });

                        req.end();
                    } catch (error) {
                        this.sendTo(
                            obj.from,
                            obj.command,
                            { error: `Connection failed: ${(error as Error).toString()}` },
                            obj.callback,
                        );
                    }
                })();
                break;
            }

            case 'getAvailableAiProviders': {
                // Reports which AI providers have stored credentials (keys never leave the backend).
                if (obj.callback) {
                    const providers = listAvailableProviders(this.config);
                    this.sendTo(obj.from, obj.command, { providers }, obj.callback);
                }
                break;
            }

            case 'prettier': {
                // Format the code with Prettier
                if (obj.message && typeof obj.message.code === 'string') {
                    try {
                        prettier
                            .format(obj.message.code, {
                                parser: obj.message.type === 'typescript' ? 'babel-ts' : 'babel',
                                printWidth: 120,
                                semi: true,
                                tabWidth: 4,
                                useTabs: false,
                                trailingComma: 'all',
                                singleQuote: true,
                                singleAttributePerLine: true,
                                endOfLine: 'lf',
                                bracketSpacing: true,
                                arrowParens: 'avoid',
                                quoteProps: 'as-needed',
                            })
                            .then(formattedCode => {
                                if (obj.callback) {
                                    this.sendTo(obj.from, obj.command, { code: formattedCode }, obj.callback);
                                } else {
                                    this.logWithLineInfo(`Formatted code:\n${formattedCode}`);
                                }
                            })
                            .catch(e => {
                                this.logError('Prettier', 'Error formatting code:', e as Error);
                                this.sendTo(obj.from, obj.command, { error: (e as Error).toString() }, obj.callback);
                            });
                    } catch (e) {
                        this.logError('Prettier', 'Error formatting code:', e as Error);
                        this.sendTo(obj.from, obj.command, { error: (e as Error).toString() }, obj.callback);
                    }
                } else {
                    this.sendTo(obj.from, obj.command, { error: 'No code provided' }, obj.callback);
                }
                break;
            }

            case 'execute': {
                if (obj.callback) {
                    void this.executeScript(obj.message)
                        .then(result => this.sendTo(obj.from, obj.command, result, obj.callback))
                        .catch(err =>
                            this.sendTo(
                                obj.from,
                                obj.command,
                                {
                                    ok: false,
                                    error: `Internal error: ${err as Error}`,
                                    logs: [],
                                    output: '',
                                },
                                obj.callback,
                            ),
                        );
                }
                break;
            }
        }
    }

    onLog(msg: ioBroker.LogMessage): void {
        for (const name of Object.keys(this.logSubscriptions)) {
            for (const handler of this.logSubscriptions[name]) {
                if (
                    typeof handler.cb === 'function' &&
                    (handler.severity === '*' || handler.severity === msg.severity)
                ) {
                    handler.sandbox.logHandler = handler.severity || '*';
                    handler.cb.call(handler.sandbox, msg);
                    handler.sandbox.logHandler = undefined;
                }
            }
        }

        // Special case if some script is executed now with "execute" command, and we see "script.js.__execute_X:" at the beginning
        if (this.logCollectors.length) {
            for (const logCollector of this.logCollectors) {
                if (msg.message.includes(`${logCollector.name}:`)) {
                    logCollector.collector(msg.severity as ioBroker.LogLevel, msg.message);
                }
            }
        }
    }

    logError(scriptName: string, msg: string, e: Error, offs?: number): void {
        const stack = e.stack ? e.stack.toString().split('\n') : e ? e.toString() : '';
        if (!msg.includes('\n')) {
            msg = msg.replace(/[: ]*$/, ': ');
        }
        if (!msg.endsWith(' ')) {
            msg += ':';
        }
        if (!scriptName.startsWith(SCRIPT_CODE_MARKER)) {
            scriptName = SCRIPT_CODE_MARKER + scriptName;
        }

        this.errorLogFunction.error(`${scriptName}: ${msg}${this.fixLineNo(stack[0])}`);
        for (let i = offs || 1; i < stack.length; i++) {
            if (!stack[i]) {
                continue;
            }
            if (stack[i].match(/runInNewContext|javascript\.js:/)) {
                break;
            }
            this.errorLogFunction.error(`${scriptName}: ${this.fixLineNo(stack[i])}`);
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
                void this.setForeignObject(instObj._id, instObj);
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

        // The instance configuration is only available now, so the compiler has to be created again
        // with the options the user has selected in the "TypeScript" tab
        this.tsServer = new Server(getTsCompilerOptions(this.config), this.tsLog);

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
                    sentryObject?.captureException(err);
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

        // Store allowSelfSignedCerts on the context, so sandbox HTTP functions can use it
        // without setting the global process.env.NODE_TLS_REJECT_UNAUTHORIZED (which affects all adapters in compact mode)
        this.context.allowSelfSignedCerts = this.config.allowSelfSignedCerts;

        // In `manager` credential mode, subscribe to the configured AI credentials so changes in the
        // central credential store are picked up live (the keys are cached for the AI sendTo handlers).
        await this.subscribeAiCredentials();

        const doc = await this.getObjectViewAsync('script', 'javascript', {});
        if (doc?.rows?.length) {
            // sort global scripts if configured
            if (this.config.sortGlobalScriptsAlphabetically) {
                doc.rows.sort((a, b) => a.value._id.localeCompare(b.value._id));
            }
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
                                        void this.extendForeignObject(obj._id, {
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
                    void this.loadScript(doc.rows[i].value);
                }
            }
        }

        if (this.config.mirrorPath?.trim()) {
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

        // Check setState counter per minute and stop a script if too high
        this.setStateCountCheckInterval = setInterval(() => {
            for (const id of Object.keys(this.scripts)) {
                if (!this.scripts[id]) {
                    continue;
                }
                const currentSetStatePerMinuteCounter = this.scripts[id].setStatePerMinuteCounter;
                this.scripts[id].setStatePerMinuteCounter = 0;
                if (currentSetStatePerMinuteCounter > this.config.maxSetStatePerMinute) {
                    this.scripts[id].setStatePerMinuteProblemCounter++;
                    this.log.debug(
                        `${id}: Script has reached the maximum of ${this.config.maxSetStatePerMinute} setState calls per minute in ${this.scripts[id].setStatePerMinuteProblemCounter} consecutive minutes`,
                    );
                    // Allow "too high counters" for 1 minute for script starts or such and only
                    // stop the script when lasts longer
                    if (this.scripts[id].setStatePerMinuteProblemCounter > 1) {
                        this.log.error(
                            `${id}: Script is calling setState more than ${this.config.maxSetStatePerMinute} times per minute! Stopping Script now! Please check your script!`,
                        );
                        void this.stopScript(id);
                    }
                } else if (this.scripts[id].setStatePerMinuteProblemCounter > 0) {
                    this.scripts[id].setStatePerMinuteProblemCounter--;
                    this.log.debug(
                        `Script ${id} has NOT reached the maximum of ${this.config.maxSetStatePerMinute} setState calls per minute. Decrease problem counter to ${this.scripts[id].setStatePerMinuteProblemCounter}`,
                    );
                }
            }
        }, 60_000).unref();
    }

    private loadTypeScriptDeclarations(): void {
        // try to load the typings on disk for all 3rd party modules
        const packages = [
            'node', // this provides auto-completion for most builtins
            '@iobroker/types', // this provides auto-completion for most builtins
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

            // O(1) lookups – avoids O(n²) Array.includes inside loops
            const installedSet = new Set(installedLibs);
            const wantsSet = new Set(wantsTypings);
            const packagesSet = new Set(packages);

            // Add all installed libraries the user has requested typings for to the list of packages
            for (const lib of installedLibs) {
                if (wantsSet.has(lib) && !packagesSet.has(lib)) {
                    packages.push(lib);
                    packagesSet.add(lib);
                }
            }
            // Some packages have submodules (e.g., rxjs/operators) that are not exposed through the main entry point
            // If typings are requested for them, also add them if the base module is installed
            for (const lib of wantsTypings) {
                // Extract the package name and check if we need to add it
                if (!lib.includes('/')) {
                    continue;
                }
                const pkgName = lib.substring(0, lib.indexOf('/'));

                if (installedSet.has(pkgName) && !packagesSet.has(lib)) {
                    packages.push(lib);
                    packagesSet.add(lib);
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
                if (pkg.includes('/')) {
                    pkgTypings = {
                        [`node_modules/${pkg}/index.d.ts`]: `declare module "${pkg}";`,
                    };
                } else {
                    pkgTypings = {
                        [`node_modules/@types/${pkg}/index.d.ts`]: `declare module "${pkg}";`,
                    };
                }
            }
            this.log.debug(`Loaded TypeScript definitions for "${pkg}": ${JSON.stringify(Object.keys(pkgTypings))}`);
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
                if (!this.stateIdSet.has(id)) {
                    this.sortedInsert(id);
                    this.stateIdSet.add(id);
                }
                if (this.context.devices && this.context.channels) {
                    const parts = id.split('.');
                    parts.pop();
                    const chn = parts.join('.');
                    this.context.channels[chn] ||= new Set();
                    this.context.channels[chn].add(id);

                    parts.pop();
                    const dev = parts.join('.');
                    this.context.devices[dev] ||= new Set();
                    this.context.devices[dev].add(id);
                }
            }
        } else {
            // delete object from state ID's list
            const pos = this.binaryIndexOf(this.stateIds, id);
            if (pos !== -1) {
                this.stateIds.splice(pos, 1);
                this.stateIdSet.delete(id);
            }
            if (this.context.devices && this.context.channels) {
                const parts = id.split('.');
                parts.pop();
                const chn = parts.join('.');
                this.context.channels[chn]?.delete(id);

                parts.pop();
                const dev = parts.join('.');
                this.context.devices[dev]?.delete(id);
            }

            delete this.folderCreationVerifiedObjects[id];
        }

        if (!obj && this.objects[id]) {
            // objects were deleted
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
                        `Could not parse value for id "${id}" into ${this.objects[id].common.type}: ${err.toString()}`,
                    );
                } else {
                    this.log.debug(
                        `Could not parse value for id "${id}" into ${this.objects[id].common.type}: ${err.toString()}`,
                    );
                }
            }
        }
        return state;
    }

    prepareStateObjectSimple(id: string, state: ioBroker.StateValue, isAck: boolean): ioBroker.State {
        // otherwise, assume that the given state is the value to be set
        const oState: ioBroker.State = { val: state, ack: isAck } as ioBroker.State;

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

                // remember all IDs – sort once to guarantee the sorted invariant
                // required by binaryIndexOf() / sortedInsert() used later
                const keys = Object.keys(res).sort();
                for (const id of keys) {
                    this.stateIds.push(id);
                    this.stateIdSet.add(id);
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
                    const doc = res.rows[i]?.doc;
                    if (!doc) {
                        this.log.debug(`Got empty object for index ${i} (${res.rows[i].id})`);
                        continue;
                    }
                    if (this.objects[doc._id] === undefined) {
                        // If was already there, ignore
                        this.objects[doc._id] = doc;
                    }
                    doc.type === 'enum' && this._enums.add(doc._id);

                    // Collect all names
                    this.addToNames(this.objects[doc._id]);
                }
                this.addGetProperty(this.objects);

                const systemConfig = this.objects['system.config'];
                this.password = systemConfig?.native?.javascriptPassword
                    ? this.decrypt(systemConfig?.native.javascriptPassword)
                    : '';

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

                this.config.sunriseEvent ||= 'nightEnd';
                this.config.sunriseOffset ||= 0;
                this.config.sunriseLimitStart ||= '06:00';
                this.config.sunriseLimitEnd ||= '12:00';

                this.config.sunsetEvent ||= 'dusk';
                this.config.sunsetOffset ||= 0;
                this.config.sunsetLimitStart ||= '18:00';
                this.config.sunsetLimitEnd ||= '23:00';

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
                await this.setForeignObjectAsync(idActive, this.objects[idActive]);
                const intermediateStateValue = this.prepareStateObjectSimple(idActive, enabled, true);
                await this.setForeignStateAsync(idActive, enabled, true);
                if (enabled && !this.config.subscribe) {
                    this.interimStateValues[idActive] = intermediateStateValue;
                }
            } catch {
                // ignore
            }
        } else {
            const state = await this.getForeignStateAsync(idActive);
            if (state && state.val !== enabled) {
                const intermediateStateValue = this.prepareStateObjectSimple(idActive, enabled, true);
                await this.setForeignStateAsync(idActive, enabled, true);
                if (enabled && !this.config.subscribe) {
                    this.interimStateValues[idActive] = intermediateStateValue;
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

            // keep reverse-map up to date for O(1) getName()
            this.nameById.set(id, name);
        }
    }

    removeFromNames(id: string): void {
        const n = this.getName(id);

        if (n) {
            if (Array.isArray(this.names[n])) {
                const arr = this.names[n];
                const pos = arr.indexOf(id);
                if (pos > -1) {
                    arr.splice(pos, 1);
                    if (arr.length === 1) {
                        this.names[n] = arr[0];
                    }
                }
            } else {
                delete this.names[n];
            }

            // keep reverse-map up to date for O(1) getName()
            this.nameById.delete(id);
        }
    }

    getName(id: string): string | null {
        return this.nameById.get(id) ?? null;
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
                timeout: 120_000, // 2 minutes max – prevents infinite blocking
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

        const libraries: string[] = this.config.libraries
            .split(/[,;\s]+/)
            .map(d => d.trim())
            .filter(d => d);

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

            /** The real module name, because the dependency can be a URL too */
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
                        (this.mods as Record<string, any>)[moduleName] = importedModule.default ?? importedModule;
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
                    this.log.info(`Installed custom npm package (legacy mode): "${lib}"`);
                } catch (err: any) {
                    this.log.warn(`Cannot install custom npm package "${lib}" (legacy mode): ${err.toString()}`);
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
                if (source.endsWith('export {};\n')) {
                    // If the source ends with "export {};" place the log subscriptions before it
                    source = source.slice(0, -11); // remove "export {};\n"
                    source = `${source}\n${logSubscriptionsText}\nexport {};\n`;
                } else {
                    source = `${source}\n${logSubscriptionsText}`;
                }
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
            this.logError(name, `compile failed at`, err as Error);
            return false;
        }
    }

    execute(
        script: JsScript,
        name: string,
        engineType: ScriptType,
        verbose: boolean,
        debug: boolean,
        /**
         * Optional sink for the "execute" message API. When provided, the script runs in an
         * ephemeral diagnostic mode: every log line (the script's own `log()`/`console.*` output
         * AND all verbose internal operations) is forwarded to this collector instead of the
         * adapter log, and no `scriptProblem` state is written.
         */
        logCollector?: ((severity: ioBroker.LogLevel, message: string) => void) | null,
    ): void {
        script.intervals = new Set();
        script.timeouts = new Set();
        script.schedules = [];
        script.wizards = [];
        script.name = name;
        script.engineType = engineType;
        script._id = Math.floor(Math.random() * 0xffffffff);
        script.subscribes = {};
        script.subscribesFile = {};
        script.setStatePerMinuteCounter = 0;
        script.setStatePerMinuteProblemCounter = 0;
        if (!logCollector) {
            void this.setState(`scriptProblem.${name.substring(SCRIPT_CODE_MARKER.length)}`, {
                val: false,
                ack: true,
                expire: 1000,
            });
        }

        const sandbox = sandBox(script, name, verbose, debug, this.context, logCollector);

        try {
            script.script.runInNewContext(sandbox, {
                filename: name,
                displayErrors: true,
                // lineOffset: this.globalScriptLines
            });
        } catch (err: unknown) {
            if (logCollector) {
                const e = err as Error;
                const stack = (e?.stack ? e.stack.toString() : String(err))
                    .split('\n')
                    .map(line => this.fixLineNo(line))
                    .join('\n');
                logCollector('error', `Error by run: ${stack}`);
            } else {
                void this.setState(`scriptProblem.${name.substring(SCRIPT_CODE_MARKER.length)}`, {
                    val: true,
                    ack: true,
                    c: 'execute',
                });
                this.logError(name, 'Error by run:', err as Error);
            }
        }
    }

    /**
     * Run an ad-hoc script sent via the `execute` message and return everything it logged.
     *
     * The script is compiled (JavaScript or TypeScript), executed with the same sandbox API as a
     * regular script (verbose by default, so internal operations like setState/subscribe are logged
     * too), left running for `timeout` ms to collect asynchronous output, and afterwards stopped and
     * fully cleaned up (timers, subscriptions, schedules). It is ephemeral: no script object or
     * states are created.
     *
     * Expected `message`:
     * - `source` / `code` (string, required) – the script source
     * - `engineType` (string, optional) – `TypeScript/ts` to compile as TypeScript, otherwise JavaScript
     * - `verbose` (boolean, optional, default `true`) – log internal sandbox operations
     * - `logLevel` (silly|debug|info|warn|error, optional, default `silly`) – minimum severity to return
     * - `timeout` (number ms, optional, default 5000, clamped to 0…60000) – collection window
     * - `maxLogs` (number, optional, default 5000) – cap on returned log lines
     */
    async executeScript(message: {
        source: string;
        engineType?: 'Javascript/js' | 'TypeScript/ts';
        timeout?: number | string;
        verbose?: boolean;
        logLevel?: ioBroker.LogLevel;
        maxLogs?: number | string;
    }): Promise<{
        ok: boolean;
        error?: string;
        engineType: 'Javascript/js' | 'TypeScript/ts';
        runtime: number;
        truncated: boolean;
        logs: { ts: number; severity: ioBroker.LogLevel; message: string }[];
        output: string;
    }> {
        const LEVELS: ioBroker.LogLevel[] = ['silly', 'debug', 'info', 'warn', 'error'];

        const source: unknown = message?.source ?? (message as any)?.code;
        const engineTypeStr = (message?.engineType || '').toString().toLowerCase();
        const isTypeScript = engineTypeStr.startsWith('typescript') || engineTypeStr === 'ts';
        const engineType: 'Javascript/js' | 'TypeScript/ts' = isTypeScript ? 'TypeScript/ts' : 'Javascript/js';

        const empty = (
            error: string,
        ): {
            ok: boolean;
            error: string;
            engineType: 'Javascript/js' | 'TypeScript/ts';
            runtime: number;
            truncated: boolean;
            logs: { ts: number; severity: ioBroker.LogLevel; message: string }[];
            output: string;
        } => ({ ok: false, error, engineType, runtime: 0, truncated: false, logs: [], output: '' });

        if (typeof source !== 'string' || !source.trim()) {
            return empty('No source code provided');
        }

        if (this.context.debugMode) {
            return empty('Cannot execute a script while a debug session is active');
        }

        let timeout = parseInt(message?.timeout as string, 10);
        if (isNaN(timeout)) {
            timeout = 5000;
        }
        timeout = Math.max(0, Math.min(timeout, 60000));

        const verbose = message?.verbose !== false;
        const minLevel: ioBroker.LogLevel = message?.logLevel
            ? LEVELS.includes(message?.logLevel)
                ? message.logLevel
                : 'silly'
            : 'silly';
        let maxLogs = parseInt(message?.maxLogs as string, 10);
        if (isNaN(maxLogs) || maxLogs <= 0) {
            maxLogs = 5000;
        }

        const name = `${SCRIPT_CODE_MARKER}__execute_${++this.executeCounter}`;

        // Compile the source the same way regular scripts are compiled
        let createdScript: JsScript | false;
        if (isTypeScript) {
            const transformedSource = transformScriptBeforeCompilation(source, false);
            const filename = scriptIdToTSFilename(name);
            let tsCompiled: CompileResult;
            try {
                tsCompiled = this.tsServer.compile(filename, transformedSource);
            } catch (err: unknown) {
                return empty(`TypeScript compilation failed: ${err as Error}`);
            }
            if (!tsCompiled.success) {
                const errors = tsCompiled.diagnostics.map(diag => diag.annotatedSource).join('\n');
                return empty(`TypeScript compilation failed:\n${errors}`);
            }
            createdScript = this.createVM(`${this.globalScript}\n${tsCompiled.result || ''}`, name, false);
        } else {
            createdScript = this.createVM(`${this.globalScript}\n${source}`, name, true);
        }

        if (!createdScript) {
            return empty('Compilation failed');
        }

        const logs: { ts: number; severity: ioBroker.LogLevel; message: string }[] = [];
        let truncated = false;
        const collector = (severity: ioBroker.LogLevel, msg: string): void => {
            if (logs.length >= maxLogs) {
                truncated = true;
                return;
            }
            logs.push({ ts: Date.now(), severity, message: msg });
        };
        this.logCollectors.push({ name, collector });
        this.updateLogSubscriptions();

        this.scripts[name] = createdScript;
        this.execute(createdScript, name, engineType, verbose, false, collector);

        // Let asynchronous output (timeouts, awaited code, triggered subscriptions) accumulate
        if (timeout) {
            await new Promise<void>(resolve => setTimeout(resolve, timeout));
        }

        // Stop and clean up the ephemeral script (timers, subscriptions, schedules, …)
        await this.stopScript(name, true);

        const pos = this.logCollectors.findIndex(it => it.name === name);
        if (pos !== -1) {
            this.logCollectors.splice(pos, 1);
        }
        this.updateLogSubscriptions();

        const minIdx = LEVELS.indexOf(minLevel);
        const filtered = logs.filter(entry => {
            const idx = LEVELS.indexOf(entry.severity);
            return idx < 0 || idx >= minIdx;
        });

        return {
            ok: true,
            engineType,
            runtime: timeout,
            truncated,
            logs: filtered,
            output: filtered.map(entry => `[${entry.severity}] ${entry.message}`).join('\n'),
        };
    }

    /**
     * Finds the index of `id` in a sorted array using binary search – O(log n).
     * Returns -1 if not found. Used instead of Array.indexOf on stateIds.
     */
    private binaryIndexOf(arr: string[], id: string): number {
        let lo = 0;
        let hi = arr.length - 1;
        while (lo <= hi) {
            const mid = (lo + hi) >>> 1;
            if (arr[mid] === id) {
                return mid;
            } else if (arr[mid] < id) {
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }
        return -1;
    }

    /**
     * Inserts `id` into the sorted `stateIds` array using binary search – O(log n).
     * Much faster than push() + sort() which is O(n log n) on every insertion.
     */
    private sortedInsert(id: string): void {
        let lo = 0;
        let hi = this.stateIds.length;
        while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            if (this.stateIds[mid] < id) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        if (this.stateIds[lo] !== id) {
            this.stateIds.splice(lo, 0, id);
        }
    }

    unsubscribe(id: string | RegExp | string[]): void {
        if (!id) {
            this.log.warn('unsubscribe: empty name');
            return;
        }

        if (Array.isArray(id)) {
            id.forEach(sub => this.unsubscribe(sub));
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
                this.adapterSubs[alive].delete(id);
                if (!this.adapterSubs[alive].size) {
                    delete this.adapterSubs[alive];
                }
            }
            this.sendTo(a, 'unsubscribe', id);
        }
    }

    // Analyze if logs are still required or not
    updateLogSubscriptions(): void {
        let found = '';

        if (this.logCollectors.length) {
            found = this.logCollectors[0].name;
        } else {
            // go through all scripts and check if some script still requires logs
            Object.keys(this.logSubscriptions).forEach(scriptName => {
                if (!this.logSubscriptions?.[scriptName] || !this.logSubscriptions[scriptName].length) {
                    delete this.logSubscriptions[scriptName];
                } else {
                    found = scriptName;
                }
            });
        }

        if (this.requireLog) {
            if (found && !this.logSubscribed) {
                this.logSubscribed = true;
                void this.requireLog(this.logSubscribed);
                this.log.info(`Subscribed to log messages (at least because of ${found})`);
            } else if (!found && this.logSubscribed) {
                this.logSubscribed = false;
                void this.requireLog(this.logSubscribed);
                this.log.info(`Unsubscribed from log messages (not found any subscribers)`);
            }
        }
    }

    async stopScript(name: string, silent?: boolean): Promise<boolean> {
        if (!this.scripts[name]) {
            return false;
        }

        // `silent` is used for ephemeral scripts started via the "execute" message – they have no
        // `scriptEnabled` state and should not appear in the adapter log.
        if (!silent) {
            this.log.info(`${name}: Stopping script`);

            await this.setState(`scriptEnabled.${name.substring(SCRIPT_CODE_MARKER.length)}`, false, true);
        }

        if (this.messageBusHandlers[name]) {
            delete this.messageBusHandlers[name];
        }

        if (this.tempDirectories[name]) {
            try {
                this.mods.fs.rmSync(this.tempDirectories[name], { recursive: true });

                this.log.debug(`${name}: Removed temp directory: ${this.tempDirectories[name]}`);
            } catch {
                this.log.warn(`${name}: Unable to remove temp directory: ${this.tempDirectories[name]}`);
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
                    // Also remove from the O(1) dispatch structures – shared helper to keep the
                    // exact-id classification identical to the subscribe side in sandbox.ts
                    if (sub) {
                        removeFromDispatchIndex(this.context, sub);
                    }
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
                        void this.unsubscribeForeignFiles(id, file);
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
                        // Remove from O(1) dispatch map
                        const mapSubs = this.subscriptionsObjectMap.get(sub.pattern);
                        if (mapSubs) {
                            const pos = mapSubs.indexOf(sub);
                            if (pos !== -1) {
                                mapSubs.splice(pos, 1);
                            }
                            if (!mapSubs.length) {
                                this.subscriptionsObjectMap.delete(sub.pattern);
                            }
                        }
                        this.unsubscribeForeignObjects(sub.pattern);
                    }
                }
            }

            // Stop all timeouts
            for (const t of this.scripts[name].timeouts) {
                clearTimeout(t);
            }
            // Stop all intervals
            for (const t of this.scripts[name].intervals) {
                clearInterval(t);
            }
            // Stop all delayed states (setStateDelayed timers) – O(1) via reverse-index
            const scriptStateIds = this.timersByScript.get(name);
            if (scriptStateIds) {
                for (const stateId of scriptStateIds) {
                    if (this.timers[stateId]) {
                        for (let i = this.timers[stateId].length - 1; i >= 0; i--) {
                            if (this.timers[stateId][i].scriptName === name) {
                                clearTimeout(this.timers[stateId][i].t);
                                this.timers[stateId].splice(i, 1);
                            }
                        }
                        if (!this.timers[stateId].length) {
                            delete this.timers[stateId];
                        }
                    }
                }
                this.timersByScript.delete(name);
            }
            // Stop all scheduled jobs
            for (let i = 0; i < this.scripts[name].schedules.length; i++) {
                if (this.scripts[name].schedules[i]) {
                    const _name = this.scripts[name].schedules[i].name;
                    if (!this.mods.nodeSchedule.cancelJob(this.scripts[name].schedules[i])) {
                        this.log.error(`${name}: Error by canceling scheduled job "${_name}"`);
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
                        this.log.error(`${name}: error in onStop callback: ${err as Error}`);
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
            this.log.info(`${id}: Debugging was stopped, because started in normal mode`);
            return this.prepareScript(obj);
        }

        if (
            obj?.common?.source &&
            (obj.common.enabled || this.context.debugMode === obj._id) &&
            obj.common.engine === `system.adapter.${this.namespace}`
        ) {
            const name = obj._id;

            if (this.password && obj.native?.protected) {
                obj.common.source = decryptText(this.password, obj.common.source);
            }

            const nameId = name.substring(SCRIPT_CODE_MARKER.length);
            if (!nameId.length || nameId.endsWith('.')) {
                this.log.error(`${name}: Script name "${name}" is invalid!`);
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
            obj.common.engineType ||= '' as 'TypeScript/ts' | 'Blockly' | 'Rules' | 'Javascript/js';

            if (
                obj.common.engineType.toLowerCase().startsWith('javascript') ||
                obj.common.engineType === 'Blockly' ||
                obj.common.engineType === 'Rules'
            ) {
                // Javascript
                this.log.info(`${name}: start JavaScript (${obj.common.engineType})`);

                let sourceFn = name;
                if (webstormDebug) {
                    const fn = name.replace(/^script\.js\./, '').replace(/\./g, '/');
                    sourceFn = this.mods.path.join(webstormDebug, `${fn}.js`);
                }
                const createdScript = this.createVM(`${this.globalScript}\n${obj.common.source}`, sourceFn, true);
                if (!createdScript) {
                    return false;
                }
                this.scripts[name] = createdScript;
                this.execute(this.scripts[name], sourceFn, obj.common.engineType, obj.common.verbose, obj.common.debug);
                return true;
            }

            if (obj.common.engineType.toLowerCase().startsWith('typescript')) {
                // TypeScript
                this.log.info(`${name}: Compiling TypeScript source`);
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
                this.execute(this.scripts[name], name, obj.common.engineType, obj.common.verbose, obj.common.debug);
                return true;
            }

            this.log.warn(`${obj._id}: Unknown engine type: ${obj.common.engineType}`);
            return false;
        }

        let _name: string;
        if (obj?._id) {
            _name = obj._id;
            const scriptIdName = _name.substring(SCRIPT_CODE_MARKER.length);

            if (!scriptIdName.length || scriptIdName.endsWith('.')) {
                this.log.error(`${obj._id}: Script name "${_name}" is invalid!`);
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
            this.log.error(`${id}: Invalid script: ${err}`);
        }
        if (!obj) {
            return false;
        }
        return this.loadScript(obj);
    }

    async loadScript(nameOrObject: ioBroker.ScriptObject): Promise<boolean> {
        // create states for scripts
        await this.createActiveObject(nameOrObject._id, !!nameOrObject?.common?.enabled);
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
        // Always clear any existing timer to prevent memory leaks on rapid re-scheduling
        if (this.dayScheduleTimer) {
            clearTimeout(this.dayScheduleTimer);
            this.dayScheduleTimer = null;
        }

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
        let fileName = `${__dirname}/../admin/vs/base/browser/ui/codicons/codicon/codicon.ttf`;
        let jsonFileName = `${__dirname}/../admin/vsFont/codicon.json`;
        try {
            if (existsSync(fileName)) {
                stat = statSync(fileName);
            }
            if (!stat) {
                jsonFileName = `${__dirname}/admin/vsFont/codicon.json`;
                fileName = `${__dirname}/admin/vs/base/browser/ui/codicons/codicon/codicon.ttf`;
                if (existsSync(fileName)) {
                    stat = statSync(fileName);
                }
            }
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
                const buffer = Buffer.from(JSON.parse(readFileSync(jsonFileName).toString()), 'base64');

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
                writeFileSync(fileName, Buffer.from(data));
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
            if (!isNaN(this.config.longitude) && !isNaN(this.config.latitude)) {
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
     * Add declarations for global scripts
     *
     * @param scriptID - The current script the declarations were generated from
     * @param declarations - Declarations from a script
     */
    provideDeclarationsForGlobalScript(scriptID: string, declarations: string): void {
        // Remember which declarations this global script had access to;
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
        if (!/scripts?\.js[.\\/]/.test(line)) {
            return line;
        }
        if (/:(\d+):/.test(line)) {
            line = line.replace(
                /:(\d+):/,
                (_$0, $1) => `:${$1 > this.globalScriptLines + 1 ? $1 - this.globalScriptLines - 1 : $1}:`,
            ); // one line for 'async function ()'
        } else {
            line = line.replace(
                /:(\d+)$/,
                (_$0, $1) => `:${$1 > this.globalScriptLines + 1 ? $1 - this.globalScriptLines - 1 : $1}`,
            ); // one line for 'async function ()'
        }
        return line;
    }

    async debugStop(): Promise<void> {
        if (this.debugState.child) {
            this.debugSendToInspector({ cmd: 'end' });
            this.debugState.endTimeout = setTimeout(() => {
                this.debugState.endTimeout = null;
                this.debugState.child?.kill('SIGTERM');
            }, 500);
            this.debugState.promiseOnEnd ||= Promise.resolve(0);
        } else {
            this.debugState.promiseOnEnd = Promise.resolve(0);
        }

        await this.debugState.promiseOnEnd;

        this.debugState.child = null;
        this.debugState.running = false;
        this.debugState.scriptName = '';
        if (this.debugState.endTimeout) {
            clearTimeout(this.debugState.endTimeout);
            this.debugState.endTimeout = null;
        }
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
                void this.debugStop().then(() =>
                    this.log.info(
                        `${this.debugState.scriptName}: Debugging was stopped, because started in normal mode`,
                    ),
                );
            }
        } else {
            this.log.error(`${this.debugState.scriptName}: Cannot send command to terminated inspector`);
            void this.setState(
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
        void this.debugDisableScript(data.scriptName)
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

                    this.debugState.child = fork(`${__dirname}/lib/inspect.js`, args, options);

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
                                void this.setState('debug.from', JSON.stringify(oMessage), true);
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
                        void this.setState('debug.from', JSON.stringify({ cmd: 'error', error }), true);
                    });

                    this.debugState.child?.on('exit', async (code: number): Promise<void> => {
                        if (code) {
                            await this.setState(
                                'debug.from',
                                JSON.stringify({ cmd: 'error', error: `invalid response code: ${code}` }),
                                true,
                            );
                        }
                        await this.setState('debug.from', JSON.stringify({ cmd: 'debugStopped', code }), true);
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
    const logic = patternFunctions.logic ?? 'and';
    for (let i = 0, len = patternFunctions.length; i < len; i++) {
        const result = patternFunctions[i](event);
        if (logic === 'and' && !result) {
            return false; // short-circuit AND – one false is enough
        }
        if (logic === 'or' && result) {
            return true; // short-circuit OR – one true is enough
        }
    }
    // AND: all passed → true; OR: none matched → false
    return logic === 'and';
}

// If started as allInOne mode => return function to create an instance
if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<AdapterOptions> | undefined) => new JavaScript(options);
} else {
    // otherwise start the instance directly
    (() => new JavaScript())();
}
