import type { ExecOptions, ChildProcess } from 'node:child_process';
import type { Script } from 'node:vm';
import type { AxiosHeaderValue, ResponseType } from 'axios';
import type { Job } from 'node-schedule';

import type { Scheduler, SchedulerRule } from './lib/scheduler';
import type { EventObj } from './lib/eventObj';
import type { PatternEventCompareFunction } from './lib/patternCompareFunctions';
import type { AstroEvent } from './lib/consts';

export interface JavaScriptAdapterConfig {
    latitude: number;
    longitude: number;
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
    sunriseEvent: AstroEvent;
    sunriseOffset: number;
    sunriseLimitStart: string;
    sunriseLimitEnd: string;
    sunsetEvent: AstroEvent;
    sunsetOffset: number;
    sunsetLimitStart: string;
    sunsetLimitEnd: string;
    createAstroStates: boolean;
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

export type SubscribeObject = {
    name: string;
    pattern: string;
    callback: (id: string, obj?: ioBroker.Object | null) => void;
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
    //    -1: always send it as a quiet notification,
    //    1: to display as high-priority and bypass the user's quiet hours, or
    //    2: to also require confirmation from the user
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
    script: Script;
    onStopTimeout: number;
    onStopCb: (cb: () => void) => void;
    intervals: NodeJS.Timeout[];
    timeouts: NodeJS.Timeout[];
    schedules: IobSchedule[];
    wizards: string[];
    name: string;
    engineType: ScriptType;
    _id: number;
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
    _id: number;
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
    onLogUnregister: (idOrCallbackOrSeverity: number | ((msg: string) => void)) => void;
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
    httpGetAsync: (
        url: string,
        options?: {
            timeout?: number;
            responseType?: ResponseType;
            headers?: Record<string, string>;
            basicAuth?: { user: string; password: string } | null;
            bearerAuth?: string;
            validateCertificate?: boolean;
        },
    ) => Promise<{
        statusCode: number | null;
        data: any;
        headers: Record<string, string>;
        responseTime: number;
    }>;
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
    httpPostAsync: (
        url: string,
        data: any,
        options: {
            timeout?: number;
            responseType?: ResponseType;
            headers?: Record<string, string>;
            basicAuth?: { user: string; password: string } | null;
            bearerAuth?: string;
            validateCertificate?: boolean;
        },
    ) => Promise<{
        statusCode: number | null;
        data: any;
        headers: Record<string, AxiosHeaderValue | undefined>;
        responseTime: number;
    }>;
    createTempFile: (fileName: string, data: Buffer | string) => string | undefined;
    subscribe: (
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
        // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
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
            | ((id: string, fileName: string, size: number | null, file?: string | Buffer, mimeType?: string) => void),
        callback?: (
            id: string,
            fileName: string,
            size: number | null,
            file?: string | Buffer,
            mimeType?: string,
        ) => void,
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
        isAck?: boolean | 'true' | 'false' | ((err?: Error | null) => void),
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
    ) => undefined | void | (ioBroker.State & { notExist?: true }) | null;
    existsState: (
        id: string,
        callback?: (err: Error | null | undefined, stateExists?: boolean) => void,
    ) => void | boolean;
    existsStateAsync: (id: string) => Promise<boolean>;
    existsObject: (
        id: string,
        callback?: (err: Error | null | undefined, objectExists?: boolean) => void,
    ) => void | boolean;
    existsObjectAsync: (id: string) => Promise<boolean>;
    getIdByName: (name: string, alwaysArray?: boolean) => string | string[] | null;
    getObject: (
        id: string,
        enumName: null | string | ((err: Error | null | undefined, obj?: ioBroker.Object | null) => void),
        cb: (err: Error | null | undefined, obj?: ioBroker.Object | null) => void,
    ) => void;
    getObjectAsync: (id: string, enumName: null | string) => Promise<ioBroker.Object | null | undefined>;
    setObject: (
        id: string,
        obj: ioBroker.Object,
        callback?: (err?: Error | null | string, res?: { id: string }) => void,
    ) => void;
    setObjectAsync: (id: string, obj: ioBroker.Object) => Promise<{ id: string }>;
    extendObject: (
        id: string,
        obj: Partial<ioBroker.Object>,
        callback?: (err?: Error | null | string, res?: { id: string }) => void,
    ) => void;
    extendObjectAsync: (id: string, obj: Partial<ioBroker.Object>) => Promise<{ id: string }>;
    deleteObject: (id: string, isRecursive?: boolean, callback?: ioBroker.ErrorCallback) => void;
    deleteObjectAsync: (id: string, isRecursive?: boolean) => Promise<void>;
    getEnums: (enumName: string) => { id: string; members: string[]; name: ioBroker.StringOrTranslated }[];
    createAlias: (
        name: string,
        alias: string | CommonAlias,
        forceCreation: boolean | Partial<ioBroker.StateCommon> | ((err: Error | null) => void) | undefined,
        common?: Partial<ioBroker.StateCommon> | Record<string, any> | ((err: Error | null) => void),
        native?: Record<string, any> | ((err: Error | null) => void),
        callback?: (err: Error | null) => void,
    ) => void;
    createAliasAsync: (
        name: string,
        alias: string | CommonAlias,
        forceCreation: boolean | Partial<ioBroker.StateCommon> | undefined,
        common?: Partial<ioBroker.StateCommon> | Record<string, any>,
        native?: Record<string, any>,
    ) => Promise<void>;
    createState: (
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
    ) => void;
    createStateAsync: (
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
    ) => Promise<string>;
    deleteState: (id: string, callback: (err: Error | null | undefined, found?: boolean) => void) => void;
    deleteStateAsync: (id: string) => Promise<boolean>;
    sendTo: (
        adapter: string,
        cmd: string,
        msg?: any,
        options?: Record<string, any> | ((result: any, options: Record<string, any>, _adapter: string) => void),
        callback?: (result: any, options: Record<string, any>, _adapter: string) => void,
    ) => void;
    sendto: (
        adapter: string,
        cmd: string,
        msg?: any,
        callback?: (result: any, options: Record<string, any>, _adapter: string) => void,
    ) => void;
    sendToAsync: (adapter: string, cmd: string, msg: any, options: any) => Promise<any>;
    sendToHost: (host: string, cmd: string, msg?: any, callback?: (result: any) => void) => void;
    sendToHostAsync: (host: string, cmd: string, msg?: any) => Promise<any>;
    registerNotification: (msg: string, isAlert: boolean) => void;
    setInterval: (callback: (...args: any[]) => void, ms: number, ...args: any[]) => NodeJS.Timeout | null;
    clearInterval: (id: NodeJS.Timeout) => void;
    setTimeout: (callback: (args?: any[]) => void, ms: number, ...args: any[]) => NodeJS.Timeout | null;
    clearTimeout: (id: NodeJS.Timeout) => void;
    setImmediate: (callback: (args: any[]) => void, ...args: any[]) => void;
    cb: (callback: () => void) => void;
    compareTime: (
        startTime: iobJS.AstroDate | string | Date | number,
        endTime: iobJS.AstroDate | string | Date | number | null,
        operation: 'between' | 'not between' | '<' | '<=' | '>' | '>=' | '==' | '<>' | '!=',
        time?: iobJS.AstroDate | string | Date | number,
    ) => boolean;
    onStop: (cb: () => void, timeout?: number) => void;
    formatValue: (value: number | string, decimals: number | string, format?: string) => string;
    formatDate: (
        date: Date | string | number | iobJS.AstroDate,
        format?: string,
        language?: ioBroker.Languages,
    ) => string;
    formatTimeDiff: (diff: number, format?: string) => string;
    getDateObject: (date: any) => Date;
    writeFile: (
        adapter: string,
        fileName: string,
        data: string | Buffer | ((err?: Error | null) => void),
        callback?: (err?: Error | null) => void,
    ) => void;
    writeFileAsync: (adapter: string, fileName: string | Buffer, data?: string | Buffer) => Promise<void>;
    readFile: (
        adapter: string,
        fileName: string | ((err: Error | null | undefined, data?: Buffer | string, mimeType?: string) => void),
        callback?: (err: Error | null | undefined, data?: Buffer | string, mimeType?: string) => void,
    ) => void;
    readFileAsync: (adapter: string, fileName?: string) => Promise<Buffer | string>;
    unlink: (adapter: string, fileName: string, callback?: (err?: Error | null) => void) => void;
    unlinkAsync: (adapter: string, fileName?: string) => Promise<void>;
    delFile: (adapter: string, fileName: string, callback?: (err?: Error | null) => void) => void;
    delFileAsync: (adapter: string, fileName?: string) => Promise<void>;
    rename: (adapter: string, oldName: string, newName: string, callback?: (err?: Error | null) => void) => void;
    renameAsync: (adapter: string, oldName: string, newName?: string) => Promise<void>;
    renameFile: (adapter: string, oldName: string, newName: string, callback?: (err?: Error | null) => void) => void;
    renameFileAsync: (adapter: string, oldName: string, newName?: string) => Promise<void>;
    getHistory: (
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
    ) => void;
    getHistoryAsync: (
        instance: string | (ioBroker.GetHistoryOptions & { id: string; timeout?: number | string }),
        options?: ioBroker.GetHistoryOptions & { id?: string; timeout?: number | string },
    ) => Promise<ioBroker.GetHistoryResult>;
    runScript: (scriptName: string, callback?: (err?: Error | null) => void) => boolean;
    runScriptAsync: (scriptName: string) => Promise<void>;
    startScript: (
        scriptName: string,
        ignoreIfStarted: boolean | ((err: Error | null | undefined, started: boolean) => void),
        callback?: (err: Error | null | undefined, started: boolean) => void,
    ) => boolean;
    startScriptAsync: (scriptName: string, ignoreIfStarted?: boolean) => Promise<boolean>;
    stopScript: (scriptName: string, callback: (err: Error | null | undefined, stopped: boolean) => void) => boolean;
    stopScriptAsync: (scriptName: string) => Promise<boolean>;
    isScriptActive: (scriptName: string) => boolean;
    startInstanceAsync: (instanceName: string) => Promise<boolean>;
    restartInstanceAsync: (instanceName: string) => Promise<boolean>;
    stopInstanceAsync: (instanceName: string) => Promise<boolean>;
    toInt: (val: any) => number;
    toFloat: (val: any) => number;
    toBoolean: (val: any) => boolean;
    getAttr: (obj: any, path: string | string[]) => any;
    messageTo: (
        target: string | { instance: string | null | number; script: string | null; message: string },
        data: any,
        options: any,
        callback: (result: any, options: { timeout?: number | string }, instance: string | number | null) => void,
    ) => void;
    messageToAsync: (
        target: string | { instance: string | null | number; script: string | null; message: string },
        data: any,
        options?: { timeout?: number | string },
    ) => Promise<any>;
    onMessage: (messageName: string, callback: (data: any, cb: (result: any) => void) => void) => null | number;
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
    onObject: (
        pattern: string | string[],
        callback: (id: string, obj?: ioBroker.Object | null) => void,
    ) => SubscribeObject | SubscribeObject[] | null;
    subscribeObject: (
        pattern: string | string[],
        callback: (id: string, obj?: ioBroker.Object | null) => void,
    ) => SubscribeObject | SubscribeObject[] | null;
    unsubscribeObject: (idOrObject: SubscribeObject | SubscribeObject[]) => boolean | boolean[];
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

export type DebugState = {
    scriptName: string;
    child: null | ChildProcess;
    promiseOnEnd: null | Promise<number>;
    paused: boolean;
    started: number;
    endTimeout?: null | NodeJS.Timeout;
    running: boolean;
    adapterInstance?: string;
    breakOnStart?: boolean;
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
    callback: (id: string, fileName: string, size: number | null, withFile: boolean) => void;
};

export interface JavascriptContext {
    adapter: ioBroker.Adapter;
    mods: Record<string, any>;
    objects: Record<string, ioBroker.Object>;
    states: Record<string, ioBroker.State>;
    interimStateValues: Record<string, ioBroker.State>;
    stateIds: string[];
    errorLogFunction: {
        info: (text: string, ...args: any[]) => void;
        debug: (text: string, ...args: any[]) => void;
        silly: (text: string, ...args: any[]) => void;
        warn: (text: string, ...args: any[]) => void;
        error: (text: string, ...args: any[]) => void;
    };
    subscriptions: SubscriptionResult[];
    subscriptionsFile: FileSubscriptionResult[];
    subscriptionsObject: SubscribeObject[];
    subscribedPatterns: Record<string, number>;
    subscribedPatternsFile: Record<string, number>;
    adapterSubs: Record<string, string[]>;
    cacheObjectEnums: Record<string, { enumIds: string[]; enumNames: string[] }>;
    isEnums: boolean; // If some subscription wants enum
    channels: Record<string, string[]> | null;
    devices: Record<string, string[]> | null;
    scheduler: Scheduler | null;
    timers: { [scriptName: string]: JavascriptTimer[] };
    enums: string[];
    timerId: number;
    names: { [name: string]: string | string[] }; // name: id
    scripts: Record<string, JsScript>;
    messageBusHandlers: Record<
        string,
        Record<string, { id: number; sandbox: SandboxType; cb: (data: any, result: any) => void }[]>
    >;
    logSubscriptions: Record<
        string,
        {
            sandbox: SandboxType;
            cb: (info: LogMessage) => void;
            id: number;
            severity: ioBroker.LogLevel | '*';
        }[]
    >;
    tempDirectories: { [scriptName: string]: string }; // name: path
    folderCreationVerifiedObjects: Record<string, boolean>;
    updateLogSubscriptions: () => void;
    convertBackStringifiedValues: (
        id: string,
        state: ioBroker.State | null | undefined,
    ) => ioBroker.State | null | undefined;
    updateObjectContext: (id: string, obj: ioBroker.Object) => void;
    prepareStateObject: (id: string, state: ioBroker.SettableState | null) => ioBroker.State;
    debugMode: string | undefined;
    rulesOpened: string | null; // opened rules
    language: ioBroker.Languages;
    getAbsoluteDefaultDataDir: () => string;
    logError: (scriptName: string, msg: string, e: Error, offs?: number) => void;
    logWithLineInfo: (message: string) => void;
    schedules?: string[];
}
