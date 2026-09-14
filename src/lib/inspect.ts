/*
 * Copyright Node.js contributors. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

/*
 * The inspector process. It is forked by the adapter (see `debugStart` in main.ts) and starts the process to debug -
 * the javascript adapter itself with `--debugScript <scriptId>` or another adapter - with an enabled inspector.
 * It connects to it via the DevTools protocol and translates the commands of the GUI into protocol calls and back.
 *
 * The communication with the host happens via IPC with JSON strings:
 * - host -> inspector: `DebugCommand`
 * - inspector -> host: `CommandToHost`
 */
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import type { Debugger, Runtime } from 'node:inspector';
import { join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { debuglog as utilDebugLog } from 'node:util';

// @ts-expect-error no types available
import InspectClient from 'node-inspect/lib/internal/inspect_client';

const debuglog = utilDebugLog('inspect');

/** Stay paused on the first line of the debugged process (used for the debugging of adapter instances) */
const breakOnStart = process.argv.includes('--breakOnStart');

/**
 * By debugging of a script, stepping and "stop on exception" should not stop in the node internals,
 * in 3rd party modules and in the adapter itself (e.g., in sandbox.js)
 */
const SCRIPT_BLACKBOX_PATTERNS = ['^node:', '/node_modules/', '[iI]o[bB]roker\\.javascript/build/'];

interface InspectClientType {
    connect(port: number, host: string): Promise<void>;
    callMethod(method: string, params?: Record<string, unknown>): Promise<any>;
    reset(): void;
    on(event: 'debugEvent', listener: (method: string, params: DebugEventParams | undefined) => void): void;
}

type ProtocolDomain = Record<string, (params?: Record<string, unknown>) => Promise<any>>;

/** Parameters of the protocol events, which are processed here */
interface DebugEventParams {
    /** Debugger.scriptParsed */
    scriptId?: Runtime.ScriptId;
    url?: string;
    /** Debugger.paused */
    reason?: string;
    callFrames?: Debugger.CallFrame[];
    /** Runtime.consoleAPICalled */
    type?: string;
    args?: Runtime.RemoteObject[];
    /** Runtime.executionContextDestroyed */
    executionContextId?: number;
    /** Runtime.executionContextCreated */
    context?: { id: number; name: string };
}

interface CommandToHost {
    cmd:
        | 'ready'
        | 'readyToDebug'
        | 'paused'
        | 'resumed'
        | 'script'
        | 'log'
        | 'error'
        | 'finished'
        | 'sb'
        | 'cb'
        | 'scope'
        | 'setValue'
        | 'expressions'
        | 'getPossibleBreakpoints';
    [attr: string]: unknown;
}

interface DebugCommand {
    cmd:
        | 'start'
        | 'end'
        | 'source'
        | 'sb'
        | 'cb'
        | 'pause'
        | 'cont'
        | 'next'
        | 'step'
        | 'out'
        | 'scope'
        | 'setValue'
        | 'expressions'
        | 'stopOnException'
        | 'getPossibleBreakpoints';
    /** start: ID of the script to debug, like `script.js.myScript` */
    scriptName?: string;
    /** start: instance number of the javascript adapter */
    instance?: number;
    /** start: adapter instance to debug, like `hm-rpc.0`, if no script name is given */
    adapterInstance?: string;
    /** source */
    scriptId?: Runtime.ScriptId;
    /** sb: locations, cb: breakpoint IDs */
    breakpoints?: (Debugger.Location | Debugger.BreakpointId)[];
    /** scope: scopes of the current call frame with their index in the scope chain */
    scopes?: (Debugger.Scope & { index?: number })[];
    /** setValue */
    variableName?: string;
    scopeNumber?: number;
    newValue?: { value?: unknown };
    /** setValue, expressions */
    callFrameId?: Debugger.CallFrameId;
    /** expressions */
    expressions?: { name: string }[];
    /** stopOnException */
    state?: boolean;
    /** getPossibleBreakpoints */
    start?: Debugger.Location;
    end?: Debugger.Location;
}

class StartupError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'StartupError';
    }
}

let inspector: NodeInspector | undefined;
/** ID of the debugged script, like `script.js.myScript` */
let scriptToDebug = '';
/** Main file of the debugged adapter */
let instanceToDebug = '';

function sendToHost(data: CommandToHost): void {
    if (data.cmd === 'error') {
        console.error(`[DEBUGGER] ${data.error as string}`);
    }
    try {
        process.send?.(JSON.stringify(data));
    } catch (e) {
        // The host is not reachable anymore
        console.error(`[DEBUGGER] Cannot send to host: ${e as Error}`);
    }
}

function errorToString(e: unknown): string {
    if (e instanceof Error) {
        return e.message;
    }
    return typeof e === 'string' ? e : JSON.stringify(e);
}

function reportError(text: string, e?: unknown): void {
    sendToHost({ cmd: 'error', error: e === undefined ? text : `${text}: ${errorToString(e)}` });
}

function remoteObjectToString(obj: Runtime.RemoteObject | undefined): string {
    if (!obj) {
        return '';
    }
    if (obj.value !== undefined) {
        return typeof obj.value === 'string' ? obj.value : JSON.stringify(obj.value);
    }
    return obj.unserializableValue || obj.description || obj.type;
}

function consoleTypeToSeverity(type: string | undefined): ioBroker.LogLevel {
    switch (type) {
        case 'warning':
            return 'warn';
        case 'error':
        case 'assert':
            return 'error';
        case 'debug':
            return 'debug';
        default:
            return 'info';
    }
}

/** Values like NaN, Infinity, -0 or BigInt cannot be transferred as JSON value */
function toCallArgument(value: unknown): Runtime.CallArgument {
    if (typeof value === 'number' && (!Number.isFinite(value) || Object.is(value, -0))) {
        return { unserializableValue: Object.is(value, -0) ? '-0' : String(value) };
    }
    if (typeof value === 'bigint') {
        return { unserializableValue: `${value}n` };
    }
    return value === undefined ? {} : { value };
}

function isUrlOfFile(url: string, file: string): boolean {
    let path = url;
    if (url.startsWith('file://')) {
        try {
            path = fileURLToPath(url);
        } catch {
            return false;
        }
    }
    path = normalize(path);
    file = normalize(file);
    return process.platform === 'win32' ? path.toLowerCase() === file.toLowerCase() : path === file;
}

function createDomain(domain: string, client: InspectClientType): ProtocolDomain {
    return new Proxy<ProtocolDomain>(
        {},
        {
            get: (_target, method: string | symbol) =>
                // the object must not look like a promise
                typeof method === 'string' && method !== 'then'
                    ? (params?: Record<string, unknown>): Promise<any> =>
                          client.callMethod(`${domain}.${method}`, params)
                    : undefined,
        },
    );
}

function runScript(
    script: string,
    scriptArgs: string[],
    childPrint: (text: string, isError?: boolean) => void,
): Promise<[ChildProcessWithoutNullStreams, number, string]> {
    return new Promise((resolve, reject) => {
        // Always break on start: the process must not run before the debugger is connected, else it could
        // execute the `debugger;` statement of the script before. Port 0 means any free port.
        const child = spawn(process.execPath, ['--inspect-brk=127.0.0.1:0', normalize(script), ...scriptArgs]);
        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');
        child.stdout.on('data', (text: string) => childPrint(text));
        child.stderr.on('data', (text: string) => childPrint(text, true));

        let output = '';
        const timeout = setTimeout(() => {
            child.stderr.removeListener('data', waitForListenHint);
            child.kill();
            reject(new StartupError('Timeout by starting of the process to debug'));
        }, 10_000);

        function waitForListenHint(text: string): void {
            output += text;
            const res = /Debugger listening on ws:\/\/\[?(.+?)]?:(\d+)\//.exec(output);
            if (res) {
                clearTimeout(timeout);
                child.stderr.removeListener('data', waitForListenHint);
                resolve([child, parseInt(res[2], 10), res[1]]);
            }
        }

        child.stderr.on('data', waitForListenHint);
        child.on('error', error => {
            clearTimeout(timeout);
            reject(new StartupError(`Cannot start the process to debug: ${error.message}`));
        });
    });
}

class NodeInspector {
    readonly Debugger: ProtocolDomain;
    readonly Runtime: ProtocolDomain;

    private readonly client: InspectClientType = new InspectClient();
    private readonly file: string;
    private readonly args: string[];
    private child: ChildProcessWithoutNullStreams | null = null;
    /** The protocol does not deliver the URLs in the call frames anymore, so remember them */
    private readonly scriptUrls: Record<Runtime.ScriptId, string> = {};
    private mainScriptId: Runtime.ScriptId | undefined;
    private mainFile = '';
    private mainScriptSource: Promise<string> | null = null;
    /** Sometimes the first pause comes before the main script is parsed */
    private delayedContext: DebugEventParams | null = null;
    private pausedOnFirstLine = false;
    /** Execution context of the debugged script */
    private scriptContextId: number | undefined;
    private finished = false;

    constructor(file: string, args: string[]) {
        this.file = file;
        this.args = args;
        this.Debugger = createDomain('Debugger', this.client);
        this.Runtime = createDomain('Runtime', this.client);
        this.client.on('debugEvent', (fullName, params) => this.handleDebugEvent(fullName, params || {}));
    }

    async start(): Promise<void> {
        const [child, port, host] = await runScript(this.file, this.args, (text, isError) =>
            this.childPrint(text, isError),
        );
        this.child = child;
        child.on('exit', code => this.finish(`Process exited with code ${code}`));

        for (let attempt = 1; ; attempt++) {
            try {
                await this.client.connect(port, host);
                break;
            } catch (e) {
                debuglog(`Connection attempt #${attempt} failed: ${e as Error}`);
                if (attempt >= 10) {
                    throw new StartupError(`Cannot connect to the debugger on ${host}:${port}`);
                }
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        await Promise.all([
            this.Runtime.enable(),
            this.Debugger.enable(),
            this.Debugger.setPauseOnExceptions({ state: 'none' }),
            this.Debugger.setAsyncCallStackDepth({ maxDepth: 1 }),
            this.Debugger.setBlackboxPatterns({ patterns: scriptToDebug ? SCRIPT_BLACKBOX_PATTERNS : [] }),
            this.Runtime.runIfWaitingForDebugger(),
        ]);
    }

    killChild(): void {
        this.client.reset();
        if (this.child) {
            this.child.kill();
            this.child = null;
        }
    }

    private finish(reason: string): void {
        if (this.finished) {
            return;
        }
        this.finished = true;
        debuglog(reason);
        sendToHost({ cmd: 'finished', text: reason });
        this.killChild();
        setTimeout(() => process.exit(0), 200);
    }

    private childPrint(text: string, isError?: boolean): void {
        if (isError) {
            const lines = text
                .split(/\r\n|\r|\n/g)
                .filter(line => !!line)
                .map(line => `< ${line}`);
            lines.length && process.stdout.write(`${lines.join('\n')}\n`);
        }
        // The debugged process ended, but it waits till the debugger disconnects
        if (text.includes('Waiting for the debugger to disconnect')) {
            this.finish('Process finished');
        }
    }

    private handleDebugEvent(fullName: string, params: DebugEventParams): void {
        switch (fullName) {
            case 'Debugger.scriptParsed':
                this.onScriptParsed(params);
                break;

            case 'Debugger.paused':
                this.onPaused(params);
                break;

            case 'Debugger.resumed':
                sendToHost({ cmd: 'resumed', context: params });
                break;

            case 'Runtime.consoleAPICalled':
                this.onConsoleApiCalled(params);
                break;

            case 'Runtime.executionContextCreated':
                // main.ts gives the context of a script the name of the script
                if (scriptToDebug && params.context?.name === scriptToDebug) {
                    this.scriptContextId = params.context.id;
                }
                break;

            case 'Runtime.executionContextDestroyed':
                if (params.executionContextId === 1) {
                    // the main context of the debugged process is gone
                    this.finish('Process finished');
                } else if (this.scriptContextId !== undefined && params.executionContextId === this.scriptContextId) {
                    // the script was stopped, but the process is still running
                    sendToHost({ cmd: 'finished', context: params });
                }
                break;

            default:
                debuglog(`${fullName}: ${JSON.stringify(params)}`);
                break;
        }
    }

    private onScriptParsed(params: DebugEventParams): void {
        const { scriptId, url } = params;
        if (!scriptId || !url) {
            return;
        }
        this.scriptUrls[scriptId] = url;

        const isMain = scriptToDebug ? url === scriptToDebug : !!instanceToDebug && isUrlOfFile(url, instanceToDebug);
        if (!isMain) {
            return;
        }
        debuglog(`Script to debug parsed: ${scriptId}`);
        this.mainScriptId = scriptId;
        this.mainFile = url.replace('file:///', '');
        this.mainScriptSource = this.Debugger.getScriptSource({ scriptId }).then(
            (result: Debugger.GetScriptSourceReturnType) => result.scriptSource,
        );

        if (this.delayedContext) {
            const context = this.delayedContext;
            this.delayedContext = null;
            void this.sendReadyToDebug(context);
        }
    }

    private onPaused(params: DebugEventParams): void {
        if (!this.pausedOnFirstLine) {
            if (params.reason === 'Break on start' && !breakOnStart) {
                // the process was started with --inspect-brk only to have time to set up the debugger
                this.Debugger.resume().catch(e => reportError('Cannot resume', e));
                return;
            }
            if (params.reason === 'exception') {
                // ignore all exceptions till the start of the script
                this.Debugger.resume().catch(e => reportError('Cannot resume', e));
                return;
            }
        }

        this.enrichCallFrames(params);

        if (
            this.pausedOnFirstLine &&
            scriptToDebug &&
            params.reason === 'step' &&
            !params.callFrames?.[0]?.url?.startsWith('script.js.')
        ) {
            // Stepping left the script, e.g., at the end of a callback. The blackbox patterns do not cover
            // all internals of node.js, so continue the execution instead of stopping there
            this.Debugger.resume().catch(e => reportError('Cannot resume', e));
            return;
        }

        if (this.pausedOnFirstLine) {
            sendToHost({ cmd: 'paused', context: params });
        } else {
            this.pausedOnFirstLine = true;
            if (this.mainScriptSource) {
                void this.sendReadyToDebug(params);
            } else {
                // store the context to send it, when the main script is parsed
                this.delayedContext = params;
            }
        }
    }

    private async sendReadyToDebug(context: DebugEventParams): Promise<void> {
        try {
            const script = await this.mainScriptSource;
            this.enrichCallFrames(context);
            sendToHost({
                cmd: 'readyToDebug',
                scriptId: this.mainScriptId,
                script,
                context,
                url: this.mainFile,
            });
        } catch (e) {
            reportError('Cannot read the source of the script to debug', e);
        }
    }

    private enrichCallFrames(context: DebugEventParams): void {
        context.callFrames?.forEach(frame => {
            if (!frame.url) {
                frame.url = this.scriptUrls[frame.location.scriptId] || '';
            }
        });
    }

    private onConsoleApiCalled(params: DebugEventParams): void {
        const args = params.args || [];
        if (instanceToDebug) {
            sendToHost({
                cmd: 'log',
                severity: consoleTypeToSeverity(params.type),
                text: args.map(arg => remoteObjectToString(arg)).join(' '),
                ts: Date.now(),
            });
            return;
        }

        // The sandbox logs in debug mode as `console.log(`${severity}$$${scriptName}$$${message}`, Date.now())`
        const text = remoteObjectToString(args[0]);
        const marker = `$$${scriptToDebug}$$`;
        const pos = text.indexOf(marker);
        if (pos !== -1) {
            sendToHost({
                cmd: 'log',
                severity: text.substring(0, pos),
                text: text.substring(pos + marker.length),
                ts: typeof args[1]?.value === 'number' ? args[1].value : Date.now(),
            });
        } else if (params.type === 'warning' || params.type === 'error') {
            sendToHost({
                cmd: 'log',
                severity: consoleTypeToSeverity(params.type),
                text: args.map(arg => remoteObjectToString(arg)).join(' '),
                ts: Date.now(),
            });
        }
    }
}

function resolveAdapterMainFile(adapter: string): string | undefined {
    try {
        return require.resolve(`iobroker.${adapter}`);
    } catch {
        // try to locate it in the same node_modules directory as this adapter
        const dir = normalize(join(__dirname, '..', '..', '..', `iobroker.${adapter}`));
        if (existsSync(join(dir, 'package.json'))) {
            try {
                const pack = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
                const main = join(dir, pack.main || `${adapter}.js`);
                if (existsSync(main)) {
                    return main;
                }
            } catch {
                // ignore
            }
        }
    }
    return undefined;
}

function startDebugging(data: DebugCommand): void {
    if (inspector) {
        reportError('The debugger is already started');
        return;
    }

    if (data.scriptName) {
        scriptToDebug = data.scriptName;
        inspector = new NodeInspector(join(__dirname, '..', 'main.js'), [
            (data.instance || 0).toString(),
            '--debug',
            '--debugScript',
            scriptToDebug,
        ]);
    } else {
        const [adapter, instance] = (data.adapterInstance || '').split('.');
        const file = resolveAdapterMainFile(adapter);
        if (!file) {
            reportError(`Cannot locate iobroker.${adapter}`);
            setTimeout(() => {
                sendToHost({ cmd: 'finished', context: `Cannot locate iobroker.${adapter}` });
                setTimeout(() => process.exit(0), 500);
            }, 200);
            return;
        }
        instanceToDebug = file;
        inspector = new NodeInspector(file, [instance || '0', '--debug']);
    }

    inspector.start().catch((e: unknown) => {
        reportError(
            e instanceof StartupError
                ? e.message
                : `Internal error in inspector: ${e instanceof Error ? e.stack : errorToString(e)}`,
        );
        inspector?.killChild();
        setTimeout(() => process.exit(1), 200);
    });
}

async function processCommand(data: DebugCommand): Promise<void> {
    debuglog(`processCommand: ${JSON.stringify(data)}`);

    if (data.cmd === 'start') {
        startDebugging(data);
        return;
    }
    if (data.cmd === 'end') {
        process.exit(0);
    }
    if (!inspector) {
        reportError(`Cannot process "${data.cmd}": the debugger is not started`);
        return;
    }
    const { Debugger, Runtime } = inspector;

    switch (data.cmd) {
        case 'source':
            try {
                const { scriptSource } = (await Debugger.getScriptSource({
                    scriptId: data.scriptId,
                })) as Debugger.GetScriptSourceReturnType;
                sendToHost({ cmd: 'script', scriptId: data.scriptId, text: scriptSource });
            } catch (e) {
                reportError(`Cannot read the source of script ${data.scriptId}`, e);
            }
            break;

        case 'cont':
        case 'next':
        case 'step':
        case 'out':
        case 'pause': {
            const method = { cont: 'resume', next: 'stepOver', step: 'stepInto', out: 'stepOut', pause: 'pause' }[
                data.cmd
            ];
            try {
                await Debugger[method]();
            } catch (e) {
                reportError(`Cannot execute "${data.cmd}"`, e);
            }
            break;
        }

        case 'sb': {
            const breakpoints = await Promise.all(
                ((data.breakpoints || []) as Debugger.Location[]).map(async bp => {
                    try {
                        const result = (await Debugger.setBreakpoint({
                            location: {
                                scriptId: bp.scriptId,
                                lineNumber: bp.lineNumber,
                                columnNumber: bp.columnNumber,
                            },
                        })) as Debugger.SetBreakpointReturnType;
                        return { id: result.breakpointId, location: result.actualLocation };
                    } catch (e) {
                        reportError(`Cannot set breakpoint on line ${bp.lineNumber + 1}`, e);
                        return null;
                    }
                }),
            );
            sendToHost({ cmd: 'sb', breakpoints: breakpoints.filter(bp => bp) });
            break;
        }

        case 'cb': {
            const breakpointIds = await Promise.all(
                ((data.breakpoints || []) as Debugger.BreakpointId[]).map(async breakpointId => {
                    try {
                        await Debugger.removeBreakpoint({ breakpointId });
                    } catch (e) {
                        // The breakpoint does not exist (anymore), so it is removed anyway
                        debuglog(`Cannot clear breakpoint ${breakpointId}: ${e as Error}`);
                    }
                    return breakpointId;
                }),
            );
            sendToHost({ cmd: 'cb', breakpoints: breakpointIds });
            break;
        }

        case 'scope': {
            const scopes = await Promise.all(
                (data.scopes || [])
                    .filter(scope => scope?.object?.objectId)
                    .map(async scope => {
                        try {
                            const properties = (await Runtime.getProperties({
                                objectId: scope.object.objectId,
                                generatePreview: true,
                            })) as Runtime.GetPropertiesReturnType;
                            return { type: scope.type, name: scope.name, index: scope.index, properties };
                        } catch (e) {
                            // e.g., the execution was resumed in the meantime
                            debuglog(`Cannot read scope: ${e as Error}`);
                            return null;
                        }
                    }),
            );
            sendToHost({ cmd: 'scope', scopes: scopes.filter(scope => scope) });
            break;
        }

        case 'setValue':
            try {
                await Debugger.setVariableValue({
                    variableName: data.variableName,
                    scopeNumber: data.scopeNumber,
                    newValue: toCallArgument(data.newValue?.value),
                    callFrameId: data.callFrameId,
                });
                sendToHost({
                    cmd: 'setValue',
                    variableName: data.variableName,
                    scopeNumber: data.scopeNumber,
                    newValue: data.newValue,
                    callFrameId: data.callFrameId,
                });
            } catch (e) {
                reportError(`Cannot set value of "${data.variableName}"`, e);
            }
            break;

        case 'expressions': {
            const expressions = await Promise.all(
                (data.expressions || []).map(async item => {
                    try {
                        const { result } = (await Debugger.evaluateOnCallFrame({
                            callFrameId: data.callFrameId,
                            expression: item.name,
                            objectGroup: 'node-inspect',
                            generatePreview: true,
                        })) as Debugger.EvaluateOnCallFrameReturnType;
                        return { name: item.name, result };
                    } catch (e) {
                        return {
                            name: item.name,
                            result: {
                                type: 'object',
                                subtype: 'error',
                                className: 'Error',
                                description: errorToString(e),
                            },
                        };
                    }
                }),
            );
            sendToHost({ cmd: 'expressions', expressions });
            break;
        }

        case 'stopOnException':
            try {
                await Debugger.setPauseOnExceptions({ state: data.state ? 'all' : 'none' });
            } catch (e) {
                reportError('Cannot change "stop on exception"', e);
            }
            break;

        case 'getPossibleBreakpoints':
            try {
                const { locations } = (await Debugger.getPossibleBreakpoints({
                    start: data.start,
                    end: data.end,
                })) as Debugger.GetPossibleBreakpointsReturnType;
                sendToHost({ cmd: 'getPossibleBreakpoints', breakpoints: locations });
            } catch (e) {
                reportError('Cannot get possible breakpoints', e);
            }
            break;

        default:
            console.error(`[DEBUGGER] Unknown command: ${JSON.stringify(data)}`);
            break;
    }
}

process.on('message', (message: unknown): void => {
    let command: DebugCommand;
    try {
        command = typeof message === 'string' ? (JSON.parse(message) as DebugCommand) : (message as DebugCommand);
    } catch {
        console.error(`[DEBUGGER] Cannot parse: ${JSON.stringify(message)}`);
        return;
    }
    processCommand(command).catch(e => reportError(`Cannot process "${command?.cmd}"`, e));
});

// Handle all possible exits and never leave the debugged process behind
process.on('exit', () => inspector?.killChild());
process.on('disconnect', () => process.exit(0));
process.once('SIGTERM', () => process.exit(0));
process.once('SIGHUP', () => process.exit(0));
process.on('uncaughtException', (e: Error) => {
    reportError(`Internal error in inspector: ${e.stack || e.message}`);
    inspector?.killChild();
    process.exit(1);
});

sendToHost({ cmd: 'ready' });
