import Scheduler, { SchedulerRule } from './lib/scheduler';
import { ExecOptions } from 'node:child_process';
import { AxiosHeaderValue, ResponseType } from 'axios';
import type { Job } from 'node-schedule';
import { EventObj } from './lib/eventObj';
import type { PatternEventCompareFunction } from './lib/patternCompareFunctions';
import { AstroEvent } from './lib/consts';

export interface AdapterConfig {
    latitude: string;
    longitude: string;
    enableSetObject: boolean;
    enableSendToHost: boolean;
    enableExec: boolean;
    libraries: string;
    libraryTypings: string;
    subscribe: boolean;
    useSystemGPS: true;
    mirrorPath: string;
    mirrorInstance: number;
    allowSelfSignedCerts: boolean;
    sunriseEvent: string;
    sunriseOffset: number;
    sunriseLimitStart: string;
    sunriseLimitEnd: string;
    sunsetEvent: string;
    sunsetOffset: number;
    sunsetLimitStart: string;
    sunsetLimitEnd: string;
    createAstroStates: true;
    maxSetStatePerMinute: number;
    maxTriggersPerScript: number;
    gptKey: string;
}

export type CommonAlias = {
    /** The target state id */
    id:
        | string
        | {
              read: string;
              write: string;
          };
    /** An optional conversion function when reading, e.g. `"(val − 32) * 5/9"` */
    read?: string;
    /** An optional conversion function when reading, e.g. `"(val * 9/5) + 32"` */
    write?: string;
};

export type JavascriptTimer = {
    t: NodeJS.Timeout;
    id: number;
    ts: number;
    delay: number;
    val: ioBroker.StateValue;
    ack?: boolean;
};

export type ScriptType = 'TypeScript/ts' | 'Blockly' | 'Rules' | 'JavaScript/js';

export type TimeRule = {
    time: string | { hour: number; minute: number };
};

export type IobSchedule = Job & { _ioBroker: { type: 'cron'; pattern: string | Date; scriptName: string; id: string } };

export type PushoverOptions = {
    message: string; // mandatory - your text message
    title?: string; // optional  - your message's title, otherwise your app's name is used
    sound?:
        | 'magic'
        | 'pushover'
        | 'bike'
        | 'bugle'
        | 'cashregister'
        | 'classical'
        | 'cosmic'
        | 'falling'
        | 'gamelan'
        | 'incoming'
        | 'intermission'
        | 'mechanical'
        | 'pianobar'
        | 'siren'
        | 'spacealarm'
        | 'tugboat'
        | 'alien'
        | 'climb'
        | 'persistent'
        | 'echo'
        | 'updown'
        | 'none'; // optional  - the name of one of the sounds supported by device clients to override the user's default sound choice
    //    pushover, bike, bugle, cashregister, classical, cosmic, falling,
    //    gamelan, incoming, intermission, magic, mechanical, pianobar, siren,
    //    spacealarm, tugboat, alien, climb, persistent, echo, updown, none
    priority?: -1 | 0 | 1 | 2; // optional
    //    -1 to always send as a quiet notification,
    //    1 to display as high-priority and bypass the user's quiet hours, or
    //    2 to also require confirmation from the user
    token?: string; // optional
    // add other than configured token to the call
    url?: string; // optional  - a supplementary URL to show with your message
    url_title?: string; // optional  - a title for your supplementary URL, otherwise just the URL is shown
    device?: string; // optional  - your user's device name to send the message directly to that device, rather than all of the user's devices
    timestamp?: number; // optional  - a Unix timestamp of your message's date and time to display to the user, rather than the time your message is received by our API
    html?: string; // optional  - 1 to enable parsing of HTML formatting for bold, italic, underlined and font color
    monospace?: 1; // optional  - 1 to display the message in monospace font
    //    either HTML or monospace is allowed
    file?: string | { name: string; data: Buffer }; // optional - attachment
};

export interface JsScript {
    onStopTimeout: number;
    onStopCb: () => void;
    intervals: NodeJS.Timeout[];
    timeouts: NodeJS.Timeout[];
    schedules: IobSchedule[];
    wizards: string[];
    name: string;
    engineType: ScriptType;
    _id: string;
    subscribes: { [pattern: string]: number };
    subscribesFile: { [key: string]: number };
    setStatePerMinuteCounter: number;
    setStatePerMinuteProblemCounter: number;
}

export type LogMessage = any;

export type AstroRule = {
    astro: AstroEvent;
    shift: number;
    limitStart: string;
    limitEnd: string;
    event: string;
};

export type SandboxType = {
    mods: Record<string, any>;
    _id: string;
    name: string; // deprecated
    scriptName: string;
    instance: number;
    defaultDataDir: string;
    verbose: boolean | undefined;
    exports: Record<string, any>;
    require: (md: string) => any;
    Buffer: typeof Buffer;
    __engine: {
        __deprecatedWarnings: string[];
        __subscriptionsObject: number;
        __subscriptions: number;
        __subscriptionsMessage: number;
        __subscriptionsFile: number;
        __subscriptionsLog: number;
        __schedules: number;
    };
    $: (selector: string) => any;
    log: (msg: string, severity?: ioBroker.LogLevel) => void;
    onLog: (severity: ioBroker.LogLevel, callback: (info: any) => void) => number;
    onLogUnregister: (idOrCallbackOrSeverity: string | ((msg: string) => void)) => void;
    exec: (
        cmd: string,
        options: ExecOptions | ((error: Error | null | string, stdout?: string, stderr?: string) => void),
        callback?: (error: Error | null | string, stdout?: string, stderr?: string) => void,
    ) => void;
    email: (msg: string) => void;
    pushover: (msg: string) => void;
    httpGet: (
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
    ) => void;
    httpPost: (
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
    ) => void;
    createTempFile: (fileName: string, data: Buffer | string) => string | undefined;
    subscribe: (
        pattern:
            | TimeRule
            | AstroRule
            | Pattern
            | SchedulerRule
            | string
            | (TimeRule | AstroRule | Pattern | SchedulerRule | string)[],
        callbackOrChangeTypeOrId: string | ChangeType | ((event?: EventObj) => void),
        value?: any,
    ) =>
        | SubscriptionResult
        | IobSchedule
        | string
        | null
        | undefined
        | (SubscriptionResult | IobSchedule | string | null | undefined)[];
    getSubscriptions: () => Record<string, { name: string; pattern: Pattern }[]>;
    getFileSubscriptions: () => Record<string, { name: string; id: string; fileNamePattern: string }[]>;
    adapterSubscribe: (id: string) => void;
    adapterUnsubscribe: (
        idOrObject: string | SubscriptionResult | (string | SubscriptionResult)[],
    ) => boolean | boolean[];
    unsubscribe: (idOrObject: string | SubscriptionResult | (string | SubscriptionResult)[]) => boolean | boolean[];
    on: (
        pattern:
            | TimeRule
            | AstroRule
            | Pattern
            | SchedulerRule
            | string
            | (TimeRule | AstroRule | Pattern | SchedulerRule | string)[],
        callbackOrChangeTypeOrId: string | ChangeType | ((event?: EventObj) => void),
        value?: any,
    ) =>
        | SubscriptionResult
        | IobSchedule
        | string
        | null
        | undefined
        | (SubscriptionResult | IobSchedule | string | null | undefined)[];
    onEnumMembers: (enumId: string, callback: (event?: EventObj) => void) => void;
    onFile: (
        id: string,
        fileNamePattern: string | string[],
        withFileOrCallback:
            | boolean
            | ((id: string, fileName: string, size: number, file?: string | Buffer, mimeType?: string) => void),
        callback?: (id: string, fileName: string, size: number, file?: string | Buffer, mimeType?: string) => void,
    ) => undefined | FileSubscriptionResult | (undefined | FileSubscriptionResult)[];
    offFile: (
        idOrObject: FileSubscriptionResult | string | (FileSubscriptionResult | string)[],
        fileNamePattern?: string | string[],
    ) => boolean | boolean[];
    once: (pattern: string, callback: (data: any) => void) => void;
    schedule: (
        pattern: SchedulerRule | AstroRule | Date | string,
        callback: () => void,
    ) => IobSchedule | string | null | undefined;
    scheduleById: (id: string, ack: boolean | (() => void) | undefined, callback?: () => void) => void;
    getAstroDate: (pattern: AstroEvent, date?: Date | number, offsetMinutes?: number) => Date | undefined;
    isAstroDay: () => boolean | undefined;
    clearSchedule: (schedule: any) => void;
    getSchedules: (allScripts: boolean) => any[];
    setState: (
        id: string,
        state: ioBroker.SettableState | ioBroker.StateValue,
        isAck?: boolean | ((err?: Error | null) => void),
        callback?: (err?: Error | null) => void,
    ) => void;
    setStateChanged: (
        id: string,
        state: ioBroker.SettableState | ioBroker.StateValue,
        isAck?: boolean | ((err?: Error | null) => void),
        callback?: (err?: Error | null) => void,
    ) => void;
    setStateDelayed: (
        id: string,
        state: ioBroker.SettableState | ioBroker.StateValue,
        isAck: boolean | number | undefined,
        delay?: number | boolean,
        clearRunning?: boolean | ((err?: Error | null) => void),
        callback?: (err?: Error | null) => void,
    ) => number | null;
    clearStateDelayed: (id: string, timerId: number) => boolean;
    getStateDelayed: (
        id: string,
    ) =>
        | null
        | { timerId: number; left: number; delay: number; val: ioBroker.StateValue; ack?: boolean }
        | { timerId: number; left: number; delay: number; val: ioBroker.StateValue; ack?: boolean }[]
        | Record<string, { timerId: number; left: number; delay: number; val: ioBroker.StateValue; ack?: boolean }[]>;
    getStateAsync: (id: string) => Promise<ioBroker.State | null | undefined>;
    setStateAsync: (id: string, state: ioBroker.SettableState | ioBroker.StateValue, isAck?: boolean) => Promise<void>;
    setStateChangedAsync: (
        id: string,
        state: ioBroker.SettableState | ioBroker.StateValue,
        isAck?: boolean,
    ) => Promise<void>;
    getState: (
        id: string,
        callback?: (err: Error | null | undefined, state?: ioBroker.State | null) => void,
    ) => undefined | void | (ioBroker.State & { notExist?: true });
    existsState: (
        id: string,
        callback?: (err: Error | null | undefined, stateExists?: boolean) => void,
    ) => void | boolean;
    existsObject: (
        id: string,
        callback?: (err: Error | null | undefined, objectExists?: boolean) => void,
    ) => void | boolean;
    getIdByName: (name: string, alwaysArray?: boolean) => string | string[] | null;
    getObject: (
        id: string,
        enumName: null | string | ((err: Error | null | undefined, obj?: ioBroker.Object | null | undefined) => void),
        cb: (err: Error | null | undefined, obj?: ioBroker.Object | null | undefined) => void,
    ) => void;
    setObject: (
        id: string,
        obj: ioBroker.Object,
        callback?: (err?: Error | null | string | undefined, res?: { id: string }) => void,
    ) => void;
    extendObject: (
        id: string,
        obj: Partial<ioBroker.Object>,
        callback?: (err?: Error | null | string | undefined, res?: { id: string }) => void,
    ) => void;
    deleteObject: (id: string, isRecursive?: boolean, callback?: ioBroker.ErrorCallback) => void;
    getEnums: (enumName: string) => { id: string; members: string[]; name: ioBroker.StringOrTranslated }[];
    createAlias: (
        name: string,
        alias: string,
        forceCreation: boolean,
        common: Partial<ioBroker.ObjectCommon>,
        native: Record<string, any>,
        callback: (err: Error | null) => void,
    ) => void;
    createState: (
        name: string,
        initValue: ioBroker.StateValue,
        forceCreation: boolean,
        common: Partial<ioBroker.ObjectCommon>,
        native: Record<string, any>,
        callback: (err: Error | null) => void,
    ) => void;
    deleteState: (id: string, callback: (err: Error | null) => void) => void;
    sendTo: (
        adapter: string,
        cmd: string,
        msg?: any,
        options?: Record<string, any> | ((result: any, options: Record<string, any>, _adapter: string) => void),
        callback?: (result: any, options: Record<string, any>, _adapter: string) => void,
    ) => void;
    sendto: (adapter: string, cmd: string, msg?: any, callback?: (result: any, options: Record<string, any>, _adapter: string) => void) => void;
    sendToAsync: (adapter: string, cmd: string, msg: any, options: any) => Promise<any>;
    sendToHost: (host: string, cmd: string, msg?: any, callback?: (result: any) => void) => void;
    sendToHostAsync: (host: string, cmd: string, msg?: any) => Promise<any>;
    registerNotification: (msg: string, isAlert: boolean) => void;
    setInterval: (callback: (...args: any[]) => void, ms: number, ...args: any[]) => NodeJS.Timeout | null;
    clearInterval: (id: NodeJS.Timeout) => void;
    setTimeout: (callback: (args?: any[]) => void, ms: number, ...args: any[]) => NodeJS.Timeout | null;
    clearTimeout: (id: NodeJS.Timeout) => void;
    setImmediate: (callback: (args: any[]) => void, ...args: any[]) => number;
    cb: (callback: () => void) => void;
    compareTime: (startTime: string, endTime: string, operation: string, time: string) => boolean;
    onStop: (cb: () => void, timeout: number) => void;
    formatValue: (value: any, decimals: number, format: string) => string;
    formatDate: (date: Date, format: string, language: string) => string;
    formatTimeDiff: (diff: number, format: string) => string;
    getDateObject: (date: any) => Date;
    writeFile: (adapter: string, fileName: string, data: any, callback: (err: Error | null) => void) => void;
    readFile: (adapter: string, fileName: string, callback: (err: Error | null, data: any) => void) => void;
    unlink: (adapter: string, fileName: string, callback: (err: Error | null) => void) => void;
    delFile: (adapter: string, fileName: string, callback: (err: Error | null) => void) => void;
    rename: (adapter: string, oldName: string, newName: string, callback: (err: Error | null) => void) => void;
    renameFile: (adapter: string, oldName: string, newName: string, callback: (err: Error | null) => void) => void;
    getHistory: (instance: string, options: any, callback: (err: Error | null, result: any) => void) => void;
    runScript: (scriptName: string, callback: (err: Error | null) => void) => void;
    runScriptAsync: (scriptName: string) => Promise<void>;
    startScript: (scriptName: string, ignoreIfStarted: boolean, callback: (err: Error | null) => void) => void;
    startScriptAsync: (scriptName: string, ...args: any[]) => Promise<void>;
    stopScript: (scriptName: string, callback: (err: Error | null) => void) => void;
    stopScriptAsync: (scriptName: string) => Promise<void>;
    isScriptActive: (scriptName: string) => boolean;
    startInstanceAsync: (instanceName: string) => Promise<boolean>;
    restartInstanceAsync: (instanceName: string) => Promise<boolean>;
    stopInstanceAsync: (instanceName: string) => Promise<boolean>;
    toInt: (val: any) => number;
    toFloat: (val: any) => number;
    toBoolean: (val: any) => boolean;
    getAttr: (obj: any, path: string | string[]) => any;
    messageTo: (target: any, data: any, options: any, callback: (err: Error | null, result: any) => void) => void;
    messageToAsync: (target: any, data: any, options: any) => Promise<any>;
    onMessage: (messageName: string, callback: (data: any) => void) => void;
    onMessageUnregister: (idOrName: string) => boolean;
    console: {
        log: (msg: string) => void;
        error: (msg: string) => void;
        warn: (msg: string) => void;
        info: (msg: string) => void;
        debug: (msg: string) => void;
    };
    jsonataExpression: (data: any, expression: string) => any;
    wait: (ms: number) => Promise<void>;
    sleep: (ms: number) => Promise<void>;
    onObject: (pattern: string, callback: (data: any) => void) => void;
    subscribeObject: (pattern: string, callback: (data: any) => void) => void;
    unsubscribeObject: (idOrObject: string | Record<string, any>) => void;
    _sendToFrontEnd: (blockId: string, data: any) => void;
    logHandler?: ioBroker.LogLevel | '*';
};

export type ChangeType = 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le' | 'any' | '*';

export type Pattern = {
    logic?: 'and' | 'or';
    id?: RegExp | string | string[];
    name?: RegExp | string | string[];
    ack?: boolean | string;
    oldAck?: boolean | string;
    change?: ChangeType;

    q?: '*' | number;
    oldQ?: '*' | number;

    val?: ioBroker.StateValue;
    valGt?: string | number | boolean;
    valGe?: string | number | boolean;
    valLt?: string | number | boolean;
    valLe?: string | number | boolean;
    valNe?: string | number | boolean;

    oldVal?: ioBroker.StateValue;
    oldValGt?: string | number | boolean;
    oldValGe?: string | number | boolean;
    oldValLt?: string | number | boolean;
    oldValLe?: string | number | boolean;
    oldValNe?: string | number | boolean;

    ts?: number;
    tsGt?: number;
    tsGe?: number;
    tsLt?: number;
    tsLe?: number;

    oldTs?: number;
    oldTsGt?: number;
    oldTsGe?: number;
    oldTsLt?: number;
    oldTsLe?: number;

    lc?: number;
    lcGt?: number;
    lcGe?: number;
    lcLt?: number;
    lcLe?: number;

    oldLc?: number;
    oldLcGt?: number;
    oldLcGe?: number;
    oldLcLt?: number;
    oldLcLe?: number;

    enumId?: RegExp | string | string[];
    enumName?: RegExp | string | string[];
};

export type Selector = {
    attr: string;
    value: string;
    idRegExp?: RegExp;
};

export type SubscriptionResult = {
    name: string;
    pattern: Pattern;
    options?: Record<string, any>;
    patternCompareFunctions?: PatternEventCompareFunction[] & { logic?: 'and' | 'or' };
    callback: (obj: EventObj) => void;
};

export type FileSubscriptionResult = {
    id: string;
    name: string;
    fileNamePattern: string;
    idRegEx: RegExp | undefined;
    fileRegEx: RegExp | undefined;
    withFile: boolean;
    callback: (id: string, fileName: string, size: number, withFile: boolean) => void;
};

export interface JavascriptContext {
    adapter: ioBroker.Adapter;
    mods: Record<string, any>;
    objects: Record<string, ioBroker.Object>;
    states: Record<string, ioBroker.State>;
    interimStateValues: Record<string, ioBroker.State>;
    stateIds: string[];
    errorLogFunction: (text: string, ...args: any[]) => void;
    subscriptions: SubscriptionResult[];
    subscriptionsFile: FileSubscriptionResult[];
    subscriptionsObject: { name: string; pattern: string; options: Record<string, any> }[];
    subscribedPatterns: Record<string, number>;
    subscribedPatternsFile: Record<string, number>;
    adapterSubs: Record<string, string[]>;
    cacheObjectEnums: Record<string, { enumIds: string[]; enumNames: string[] }>;
    isEnums: boolean; // If some subscription wants enum
    channels: Record<string, string[]>;
    devices: Record<string, string[]>;
    scheduler: Scheduler;
    timers: { [scriptName: string]: JavascriptTimer[] };
    enums: string[];
    timerId: number;
    names: { [name: string]: string }; // name: id
    scripts: Record<string, JsScript>;
    messageBusHandlers: Record<string, Record<string, { sandbox: SandboxType; cb: (data: any, result: any) => void }>>;
    logSubscriptions: {
        sandbox: SandboxType;
        cb: (info: LogMessage) => void;
        id: string;
        severity: ioBroker.LogLevel | '*';
    }[];
    tempDirectories: { [scriptName: string]: string }; // name: path
    folderCreationVerifiedObjects: Record<string, boolean>;
    updateLogSubscriptions: () => void;
    convertBackStringifiedValues: (id: string, state: ioBroker.State | null | undefined) => ioBroker.State;
    updateObjectContext: (id: string, obj: ioBroker.Object) => void;
    prepareStateObject: (id: string, state: ioBroker.SettableState) => ioBroker.State;
    debugMode: boolean;
    timeSettings: {
        format12: boolean;
        leadingZeros: boolean;
    };
    rulesOpened: string | null; // opened rules
    getAbsoluteDefaultDataDir: () => string;
    language: ioBroker.Languages;
    logError: (message: string, ...args: any[]) => void;
    logWithLineInfo?: {
        warn: (message: string, ...args: any[]) => void;
    };
    schedules?: string[];
}
