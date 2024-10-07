import Scheduler, {SchedulerRule} from "./lib/scheduler";

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

export type JavascriptTimer = {
    t: NodeJS.Timeout;
    id: number;
    ts: number;
    delay: number;
    val: ioBroker.StateValue;
    ack: boolean;
};

export type ScriptType = 'TypeScript/ts' | 'Blockly' | 'Rules' | 'JavaScript/js';

export type PushoverOptions = {
    message:  string; // mandatory - your text message
    title?:    string, // optional  - your message's title, otherwise your app's name is used
    sound?: 'magic' | 'pushover' |
        'bike' |
        'bugle' |
        'cashregister' |
        'classical' |
        'cosmic' |
        'falling' |
        'gamelan' |
        'incoming' |
        'intermission' |
        'mechanical' |
        'pianobar' |
        'siren' |
        'spacealarm' |
        'tugboat' |
        'alien' |
        'climb' |
        'persistent' |
        'echo' |
        'updown' |
        'none',     // optional  - the name of one of the sounds supported by device clients to override the user's default sound choice
    //    pushover, bike, bugle, cashregister, classical, cosmic, falling,
    //    gamelan, incoming, intermission, magic, mechanical, pianobar, siren,
    //    spacealarm, tugboat, alien, climb, persistent, echo, updown, none
    priority?: -1 | 0| 1 | 2,          // optional
    //    -1 to always send as a quiet notification,
    //    1 to display as high-priority and bypass the user's quiet hours, or
    //    2 to also require confirmation from the user
    token?: string // optional
                           // add other than configured token to the call
    url?: string,                   // optional  - a supplementary URL to show with your message
    url_title?: string,             // optional  - a title for your supplementary URL, otherwise just the URL is shown
    device?: string,                // optional  - your user's device name to send the message directly to that device, rather than all of the user's devices
    timestamp?: number,             // optional  - a Unix timestamp of your message's date and time to display to the user, rather than the time your message is received by our API
    html?: string,                  // optional  - 1 to enable parsing of HTML formatting for bold, italic, underlined and font color
    monospace? : 1,             // optional  - 1 to display the message in monospace font
                           //    either html or monospace is allowed
    file?: string | {name: string; data: Buffer}  // optional - attachment
}
export interface JsScript {
    onStopTimeout: number;
    onStopCb: () => void;
    intervals: NodeJS.Timeout[];
    timeouts: NodeJS.Timeout[];
    schedules: string[];
    wizards: string[];
    name: string;
    engineType: ScriptType;
    _id: string;
    subscribes: { [pattern: string]: number };
    subscribesFile: { [key: string]: number };
    setStatePerMinuteCounter: number;
    setStatePerMinuteProblemCounter: number;
}

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
    log: (msg: string, severity?: string) => void;
    onLog: (severity: ioBroker.LogLevel, callback: (info: any) => void) => number;
    onLogUnregister: (idOrCallbackOrSeverity: string | ((msg: string) => void)) => void;
    exec: (cmd: string, options: Record<string, any>, callback: (error: Error | null, stdout: string, stderr: string) => void) => void;
    email: (msg: string) => void;
    pushover: (msg: string) => void;
    httpGet: (url: string, options: Record<string, any>, callback: (error: Error | null, response: any, body: any) => void) => void;
    httpPost: (url: string, data: any, options: Record<string, any>, callback: (error: Error | null, response: any, body: any) => void) => void;
    createTempFile: (fileName: string, data: Buffer | string) => string | undefined;
    subscribe: (pattern: string, callbackOrId: string | ((data: any) => void), value?: any) => void;
    getSubscriptions: () => any[];
    getFileSubscriptions: () => any[];
    adapterSubscribe: (id: string) => void;
    adapterUnsubscribe: (id: string) => void;
    unsubscribe: (idOrObject: string | Record<string, any>) => void;
    on: (pattern: SchedulerRule | string | (SchedulerRule | string)[], callbackOrId: string | ((id: string) => void), value?: any) => void;
    onEnumMembers: (id: string, callback: (err: Error | null, result: any) => void) => void;
    onFile: (id: string, fileNamePattern: string | string[], withFile: boolean, callback: (err: Error | null, result: any) => void) => void;
    offFile: (idOrObject: string | Record<string, any>, fileNamePattern: string) => void;
    once: (pattern: string, callback: (data: any) => void) => void;
    schedule: (pattern: SchedulerRule | string | (SchedulerRule | string)[], callback: (id: string) => void) => void;
    scheduleById: (id: string, ack: boolean, callback: (data: any) => void) => void;
    getAstroDate: (pattern: string, date: Date, offsetMinutes: number) => Date;
    isAstroDay: () => boolean;
    clearSchedule: (schedule: any) => void;
    getSchedules: (allScripts: boolean) => any[];
    setState: (id: string, state: ioBroker.SettableState | ioBroker.StateValue, isAck: boolean, callback: (err: Error | null) => void) => void;
    setStateChanged: (id: string, state: ioBroker.SettableState | ioBroker.StateValue, isAck: boolean, callback: (err: Error | null) => void) => void;
    setStateDelayed: (id: string, state: ioBroker.SettableState | ioBroker.StateValue, isAck: boolean, delay: number, clearRunning: boolean, callback: (err: Error | null) => void) => void;
    clearStateDelayed: (id: string, timerId: number) => void;
    getStateDelayed: (id: string) => ioBroker.State | null | undefined;
    getStateAsync: (id: string) => Promise<ioBroker.State | null | undefined>;
    setStateAsync: (id: string, state:ioBroker.SettableState | ioBroker.StateValue, isAck?: boolean) => Promise<void>;
    setStateChangedAsync: (id: string, state: ioBroker.SettableState | ioBroker.StateValue, isAck?: boolean) => Promise<void>;
    getState: (id: string, callback?: (err: Error | null | undefined, state?: ioBroker.State | null) => void) => undefined | void | (ioBroker.State & { notExist?: true })
    existsState: (id: string, callback: (err: Error | null, exists: boolean) => void) => void;
    existsObject: (id: string, callback: (err: Error | null, exists: boolean) => void) => void;
    getIdByName: (name: string, alwaysArray: boolean) => string | string[];
    getObject: (id: string, enumName: string, cb: (err: Error | null, obj: any) => void) => void;
    setObject: (id: string, obj: ioBroker.Object, callback?: (err?: Error | null | undefined, res?: { id: string }) => void) => void;
    extendObject: (id: string, obj: Partial<ioBroker.Object>, callback?: (err?: Error | null | undefined, res?: { id: string }) => void) => void;
    deleteObject: (id: string, isRecursive?: boolean, callback?: ioBroker.ErrorCallback) => void
    getEnums: (enumName: string) => any;
    createAlias: (name: string, alias: string, forceCreation: boolean, common: any, native: any, callback: (err: Error | null) => void) => void;
    createState: (name: string, initValue: any, forceCreation: boolean, common: any, native: any, callback: (err: Error | null) => void) => void;
    deleteState: (id: string, callback: (err: Error | null) => void) => void;
    sendTo: (adapter: string, cmd: string, msg: any, options: any, callback: (err: Error | null, result: any) => void) => void;
    sendto: (adapter: string, cmd: string, msg: any, callback: (err: Error | null, result: any) => void) => void;
    sendToAsync: (adapter: string, cmd: string, msg: any, options: any) => Promise<any>;
    sendToHost: (host: string, cmd: string, msg: any, callback: (err: Error | null, result: any) => void) => void;
    sendToHostAsync: (host: string, cmd: string, msg: any) => Promise<any>;
    registerNotification: (msg: string, isAlert: boolean) => void;
    setInterval: (callback: () => void, ms: number, ...args: any[]) => number;
    clearInterval: (id: number) => void;
    setTimeout: (callback: () => void, ms: number, ...args: any[]) => number;
    clearTimeout: (id: number) => void;
    setImmediate: (callback: () => void, ...args: any[]) => number;
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

export type Pattern = {
    logic?: 'and' | 'or';
    id?: RegExp | string | string[];
    name?: RegExp | string | string[];
    ack?: boolean | string;
    oldAck?: boolean | string;
    change?: 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le' | 'any' | '*';

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

export interface JavascriptContext {
    adapter: ioBroker.Adapter;
    mods: Record<string, any>;
    objects: Record<string, ioBroker.Object>;
    states: Record<string, ioBroker.State>;
    interimStateValues: Record<string, ioBroker.State>;
    stateIds: string[];
    errorLogFunction: (text: string, ...args: any[]) => void;
    subscriptions: { name: string; pattern: string; options: Record<string, any> }[];
    subscriptionsFile: { name: string; pattern: string; options: Record<string, any> }[];
    subscriptionsObject: { name: string; pattern: string; options: Record<string, any> }[];
    subscribedPatterns: Record<string, number>;
    subscribedPatternsFile: Record<string, number>;
    adapterSubs: Record<string, string[]>;
    cacheObjectEnums: Record<string, { enumIds: string[]; enumNames: string[] }>;
    isEnums: boolean; // If some subscription wants enum
    channels: Record<string, string[]>;
    devices: Record<string, string[]>;
    scheduler: Scheduler;
    timers: { [scriptName: string]: JavascriptTimer };
    enums: string[];
    timerId: number;
    names: { [name: string]: string }; // name: id
    scripts: Record<string, JsScript>;
    messageBusHandlers: Record<string, Record<string, { sandbox: SandboxType; cb: (data: any, result: any) => void }>>;
    logSubscriptions: {sandbox: SandboxType; cb: (info: any) => void, id: string, severity: ioBroker.LogLevel | '*'}[];
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
