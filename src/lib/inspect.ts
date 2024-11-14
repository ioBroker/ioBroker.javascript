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
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { connect } from 'node:net';
import { debuglog as utilDebugLog, inspect, type InspectOptionsStylized } from 'node:util';
import { normalize, join } from 'node:path';
import { existsSync } from 'node:fs';
import type { WriteStream, ReadStream } from 'node:tty';

// @ts-expect-error no types available
import InspectClient from 'node-inspect/lib/internal/inspect_client';
import type { Debugger, Runtime } from 'node:inspector';
import type { REPLServer } from 'repl';
import createRepl from './debugger';
// const runAsStandalone = typeof __dirname !== 'undefined';

const breakOnStart = process.argv.includes('--breakOnStart');

const debuglog = utilDebugLog('inspect');
let inspector: NodeInspector;
let scriptToDebug = ''; // script.js.yy
let instanceToDebug = ''; // adapter.X
let alreadyPausedOnFirstLine = false;

class StartupError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'StartupError';
    }
}

function portIsFree(host: string, port: number, timeout: number = 9999): Promise<void> {
    if (port === 0) {
        // Binding to a random port.
        return Promise.resolve();
    }

    const retryDelay = 150;
    let didTimeOut = false;

    return new Promise((resolve, reject) => {
        setTimeout(() => {
            didTimeOut = true;
            reject(new StartupError(`Timeout (${timeout}) waiting for ${host}:${port} to be free`));
        }, timeout);

        function pingPort(): void {
            if (didTimeOut) {
                return;
            }

            const socket = connect(port, host);
            let didRetry = false;
            function retry(): void {
                if (!didRetry && !didTimeOut) {
                    didRetry = true;
                    setTimeout(pingPort, retryDelay);
                }
            }

            socket.on('error', (error: Error) => {
                if ((error as any).code === 'ECONNREFUSED') {
                    resolve();
                } else {
                    retry();
                }
            });
            socket.on('connect', () => {
                socket.destroy();
                retry();
            });
        }
        pingPort();
    });
}

function runScript(
    script: string,
    scriptArgs: string[] | undefined,
    inspectHost: string,
    inspectPort: number,
    childPrint: (text: string, isError?: boolean) => void,
): Promise<[ChildProcessWithoutNullStreams, number, string]> {
    script = normalize(script);
    return portIsFree(inspectHost, inspectPort).then(() => {
        return new Promise(resolve => {
            const args = [breakOnStart ? `--inspect-brk=${inspectPort}` : `--inspect=${inspectPort}`].concat(
                [script],
                scriptArgs || [],
            );
            const child = spawn(process.execPath, args);
            child.stdout.setEncoding('utf8');
            child.stderr.setEncoding('utf8');
            child.stdout.on('data', childPrint);
            child.stderr.on('data', text => childPrint(text, true));

            let output = '';
            function waitForListenHint(text: string): void {
                output += text;
                const res = /Debugger listening on ws:\/\/\[?(.+?)]?:(\d+)\//.exec(output);
                if (res) {
                    const host = res[1];
                    const port = Number.parseInt(res[2]);
                    child.stderr.removeListener('data', waitForListenHint);
                    resolve([child, port, host]);
                }
            }

            child.stderr.on('data', waitForListenHint);
        });
    });
}

function createAgentProxy(domain: string, client: InspectClient): ProxyConstructor {
    const agent: any = new EventEmitter();

    agent.then = (...args: any[]) => {
        // TODO: potentially fetch the protocol and pretty-print it here.
        const descriptor = {
            [inspect.custom](_depth: number, { stylize }: InspectOptionsStylized): string {
                return stylize(`[Agent ${domain}]`, 'special');
            },
        };
        return Promise.resolve(descriptor).then(...args);
    };

    return new Proxy(agent, {
        get(target, name: string) {
            if (name in target) {
                return target[name];
            }
            return function callVirtualMethod(params: any) {
                return client.callMethod(`${domain}.${name}`, params);
            };
        },
    });
}

type CommandToHostType =
    | 'log'
    | 'paused'
    | 'resumed'
    | 'setValue'
    | 'scope'
    | 'cb'
    | 'sb'
    | 'script'
    | 'ready'
    | 'readyToDebug'
    | 'error'
    | 'finished'
    | 'expressions'
    | 'stopOnException'
    | 'getPossibleBreakpoints';

type DebuggerContext = {
    url: string;
    scriptId: Runtime.ScriptId;
    reason: string;
    executionContextId: number;
    type: string;
    id: number;
    args: { value: any }[];
};

type CommandToHost = {
    cmd: CommandToHostType;
    text?: string;
    expr?: { name: string };
    bp?: Debugger.Location;
    context?: DebuggerContext | null | string;
    error?: any;
    errorContext?: any;
    id?: Debugger.BreakpointId; // breakpoint ID
    breakpoints?: Debugger.Location[];
    scriptId?: Runtime.ScriptId;
    scopes?: Debugger.Scope[];
    variableName?: string;
    scopeNumber?: number;
    newValue?: string;
    callFrameId?: string;
    expressions?: { name: string; result: any }[];
    script?: string;
    url?: string;
    severity?: 'warn' | 'error';
    ts?: number;
};

interface NodeInspectorOptions {
    script?: string | null;
    scriptArgs?: string[];
    isRemote?: boolean;
    host: string;
    port: number;
}

export class NodeInspector {
    options: NodeInspectorOptions;
    stdin: ReadStream;
    stdout: WriteStream;
    scripts: Record<string, Promise<{ script: string; scriptId: Runtime.ScriptId }> | null>;
    delayedContext: DebuggerContext | null;
    paused: boolean;
    child: ChildProcessWithoutNullStreams | null;
    _runScript: () => Promise<[ChildProcessWithoutNullStreams | null, number, string]>;

    client: InspectClient;

    Debugger: InspectClient;
    HeapProfiler: InspectClient;
    Profiler: InspectClient;
    Runtime: InspectClient;

    handleDebugEvent: (fullName: string, params: DebuggerContext) => void;
    mainScriptId: Runtime.ScriptId | undefined;
    mainFile: string | undefined;
    repl: REPLServer | undefined;

    constructor(options: NodeInspectorOptions, stdin: ReadStream, stdout: WriteStream) {
        this.options = options;
        this.stdin = stdin;
        this.stdout = stdout;
        this.scripts = {};
        this.delayedContext = null;

        this.paused = true;
        this.child = null;

        if (options.script) {
            this._runScript = runScript.bind(
                null,
                options.script,
                options.scriptArgs,
                options.host,
                options.port,
                this.childPrint.bind(this),
            );
        } else {
            this._runScript = () => Promise.resolve([null, options.port, options.host]);
        }

        this.client = new InspectClient();

        this.Debugger = createAgentProxy('Debugger', this.client);
        this.HeapProfiler = createAgentProxy('HeapProfiler', this.client);
        this.Profiler = createAgentProxy('Profiler', this.client);
        this.Runtime = createAgentProxy('Runtime', this.client);

        this.handleDebugEvent = (
            fullName: string,
            params: {
                url: string;
                scriptId: Runtime.ScriptId;
                reason: string;
                executionContextId: number;
                type: string;
                id: number;
                args: { value: any }[];
            },
        ): void => {
            const [domain, name] = fullName.split('.');

            if (domain === 'Debugger' && name === 'scriptParsed') {
                // console.log(`Parsed: ${params.url}`);
                if (
                    (scriptToDebug && params.url.includes(scriptToDebug)) ||
                    (instanceToDebug && params.url.includes(instanceToDebug))
                ) {
                    console.log(`My scriptID: ${params.scriptId}`);
                    this.mainScriptId = params.scriptId;
                    this.mainFile = params.url.replace('file:///', '');
                    // load text of a script
                    this.scripts[this.mainScriptId] = this.Debugger.getScriptSource({
                        scriptId: this.mainScriptId,
                    } as Debugger.GetScriptSourceParameterType).then((script: Debugger.GetScriptSourceReturnType) => ({
                        script: script.scriptSource,
                        scriptId: this.mainScriptId,
                    }));

                    // sometimes the pause event comes before scriptParsed
                    if (this.delayedContext) {
                        console.log('Send to debugger: readyToDebug');
                        this.scripts[this.mainScriptId]?.then(data => {
                            // console.log('Send to debugger: readyToDebug ' + JSON.stringify(data));
                            sendToHost({
                                cmd: 'readyToDebug',
                                scriptId: this.mainScriptId,
                                script: data.script,
                                context: this.delayedContext,
                                url: this.mainFile,
                            });
                            this.delayedContext = null;
                        });
                    }
                }
                return;
            } else if (domain === 'Debugger' && name === 'resumed') {
                this.Debugger.emit(name, params);
                sendToHost({ cmd: 'resumed', context: params });
                return;
            } else if (domain === 'Debugger' && name === 'paused') {
                console.log(`PAUSED!! ${alreadyPausedOnFirstLine}`);
                if (!alreadyPausedOnFirstLine && params.reason === 'exception') {
                    // ignore all exceptions by start
                    this.Debugger.resume();
                    return;
                }
                //console.warn(fullName + ': => \n' + JSON.stringify(params, null, 2));
                this.Debugger.emit(name, params);

                if (!alreadyPausedOnFirstLine) {
                    alreadyPausedOnFirstLine = true;
                    // sometimes the pause event comes before scriptParsed
                    if (this.mainScriptId && this.scripts[this.mainScriptId]) {
                        this.scripts[this.mainScriptId]?.then(data =>
                            sendToHost({
                                cmd: 'readyToDebug',
                                scriptId: data.scriptId,
                                script: data.script,
                                context: params,
                                url: this.mainFile,
                            }),
                        );
                    } else {
                        // store context to send it later when script ID will be known
                        this.delayedContext = params;
                        console.log('PAUSED, but no scriptId');
                    }
                } else {
                    // this.scripts[params.loca]
                    //    .then(data =>
                    sendToHost({ cmd: 'paused', context: params });
                }
                return;
            }

            if (domain === 'Runtime') {
                //console.warn(fullName + ': => \n' + JSON.stringify(params, null, 2));
            }
            if (domain === 'Runtime' && name === 'consoleAPICalled') {
                const text = params.args[0].value;
                if (instanceToDebug) {
                    sendToHost({
                        cmd: 'log',
                        severity: params.type === 'warning' ? 'warn' : 'error',
                        text,
                        ts: Date.now(),
                    });
                } else if (text.includes(`$$${scriptToDebug}$$`)) {
                    console.log(`${fullName} [${params.executionContextId}]: => ${text}`);
                    const [severity, _text] = text.split(`$$${scriptToDebug}$$`);
                    sendToHost({
                        cmd: 'log',
                        severity: severity as 'warn' | 'error',
                        text: _text,
                        ts: params.args[1] && params.args[1].value ? (params.args[1].value as number) : Date.now(),
                    });
                } else if (params.type === 'warning' || params.type === 'error') {
                    sendToHost({
                        cmd: 'log',
                        severity: params.type === 'warning' ? 'warn' : 'error',
                        text,
                        ts: Date.now(),
                    });
                }
                return;
            } else if (domain === 'Runtime' && (params.id === 2 || params.executionContextId === 2)) {
                if (name === 'executionContextCreated') {
                    console.warn(`${fullName}: =>\n${JSON.stringify(params, null, 2)}`);
                } else if (name === 'executionContextDestroyed') {
                    console.warn(`${fullName}: =>\n${JSON.stringify(params, null, 2)}`);
                    sendToHost({ cmd: 'finished', context: params });
                }
                return;
            } else if (
                domain === 'Runtime' &&
                name === 'executionContextDestroyed' &&
                params.executionContextId === 1
            ) {
                sendToHost({ cmd: 'finished', context: params });
                console.log('Exited!');
                setTimeout(() => process.exit(125), 200);
            } else if (domain === 'Debugger' && name === 'scriptFailedToParse') {
                // ignore
                return;
            }

            console.warn(`${fullName}: =>\n${JSON.stringify(params, null, 2)}`);

            /*if (domain in this) {
                this[domain].emit(name, params);
            }*/
        };
        this.client.on('debugEvent', this.handleDebugEvent);
        const startRepl: () => REPLServer = createRepl(this);

        // Handle all possible exits
        process.on('exit', () => this.killChild());
        process.once('SIGTERM', process.exit.bind(process, 0));
        process.once('SIGHUP', process.exit.bind(process, 0));

        this.run()
            .then(() => startRepl())
            .then(repl => {
                this.repl = repl;
                this.repl.on('exit', () => process.exit(0));
                this.paused = false;
            })
            .then(null, error =>
                process.nextTick(() => {
                    throw error;
                }),
            );
    }

    suspendReplWhile(fn: () => any): Promise<void> {
        if (this.repl) {
            this.repl.pause();
        }
        this.stdin.pause();
        this.paused = true;

        return new Promise(resolve => resolve(fn()))
            .then(() => {
                this.paused = false;
                if (this.repl) {
                    this.repl.resume();
                    this.repl.displayPrompt();
                }
                this.stdin.resume();
            })
            .then(null, error =>
                process.nextTick(() => {
                    throw error;
                }),
            );
    }

    killChild(): void {
        this.client.reset();
        if (this.child) {
            this.child.kill();
            this.child = null;
        }
    }

    run(): Promise<void> {
        this.killChild();

        return this._runScript().then(([child, port, host]) => {
            this.child = child;

            let connectionAttempts = 0;
            const attemptConnect = (): void => {
                ++connectionAttempts;
                debuglog('connection attempt #%d', connectionAttempts);
                this.stdout.write('.');
                return this.client.connect(port, host).then(
                    () => {
                        debuglog('connection established');
                        this.stdout.write(' ok');
                    },
                    (error: unknown): Promise<void> => {
                        debuglog('connect failed', error);
                        // If it's failed to connect 10 times, then print a failed message
                        if (connectionAttempts >= 10) {
                            this.stdout.write(' failed to connect, please retry\n');
                            process.exit(1);
                        }

                        return new Promise(resolve => setTimeout(resolve, 500)).then(attemptConnect);
                    },
                );
            };

            this.print(`connecting to ${host}:${port} ..`, true);
            return attemptConnect();
        });
    }

    clearLine(): void {
        if (this.stdout.isTTY) {
            this.stdout.cursorTo(0);
            this.stdout.clearLine(1);
        } else {
            this.stdout.write('\b');
        }
    }

    print(text: string, oneLine: boolean = false): void {
        this.clearLine();
        this.stdout.write(oneLine ? text : `${text}\n`);
    }

    childPrint(text: string, isError?: boolean): void {
        isError &&
            this.print(
                text
                    .toString()
                    .split(/\r\n|\r|\n/g)
                    .filter((chunk: string) => !!chunk)
                    .map((chunk: string) => `< ${chunk}`)
                    .join('\n'),
            );
        if (!this.paused) {
            this.repl?.displayPrompt(true);
        }
        if (/Waiting for the debugger to disconnect\.\.\.\n$/.test(text)) {
            this.killChild();
            sendToHost({ cmd: 'finished', text });
        }
    }
}

function parseArgv([target, ...args]: string[]): NodeInspectorOptions {
    let host = '127.0.0.1';
    let port = 9229;
    let isRemote = false;
    let script: string | null = target;
    let scriptArgs = args;

    const hostMatch = target.match(/^([^:]+):(\d+)$/);
    const portMatch = target.match(/^--port=(\d+)$/);

    if (hostMatch) {
        // Connecting to remote debugger
        // `node-inspect localhost:9229`
        host = hostMatch[1];
        port = parseInt(hostMatch[2], 10);
        isRemote = true;
        script = null;
    } else if (portMatch) {
        // start debugee on custom port
        // `node inspect --port=9230 script.js`
        port = parseInt(portMatch[1], 10);
        script = args[0];
        scriptArgs = args.slice(1);
    } else if (args.length === 1 && /^\d+$/.test(args[0]) && target === '-p') {
        // Start debugger against a given pid
        const pid = parseInt(args[0], 10);
        try {
            // Windows does not support UNIX signals. To enable debugging, you can use an undocumented API function
            // https://github.com/node-inspector/node-inspector?tab=readme-ov-file#windows
            // @ts-expect-error undocumented function
            process._debugProcess(pid);
        } catch (e: any) {
            if (e.code === 'ESRCH') {
                console.error(`Target process: ${pid} doesn't exist.`);
                process.exit(1);
            }
            throw e;
        }
        script = null;
        isRemote = true;
    }

    return {
        host,
        port,
        isRemote,
        script,
        scriptArgs,
    };
}

function startInspect(
    argv: string[] = process.argv.slice(2),
    stdin: ReadStream = process.stdin,
    stdout: WriteStream = process.stdout,
): void {
    /*
    if (argv.length < 1) {
        const invokedAs = runAsStandalone ? 'node-inspect' : `${process.argv0} ${process.argv[1]}`;

        console.error(`Usage: ${invokedAs} script.js`);
        console.error(`       ${invokedAs} <host>:<port>`);
        console.error(`       ${invokedAs} -p <pid>`);
        process.exit(1);
    }
    */

    const options = parseArgv(argv);
    inspector = new NodeInspector(options, stdin, stdout);

    stdin.resume();

    function handleUnexpectedError(e: Error): void {
        if (!(e instanceof StartupError)) {
            console.error('There was an internal error in node-inspect. Please report this bug.');
            console.error(e.message);
            console.error(e.stack);
        } else {
            console.error(e.message);
        }
        inspector.child?.kill();
        process.exit(1);
    }

    process.on('uncaughtException', handleUnexpectedError);
}

function extractErrorMessage(stack: string | undefined): string {
    if (!stack) {
        return '<unknown>';
    }
    const m = stack.match(/^\w+: ([^\n]+)/);
    return m ? m[1] : stack;
}

function convertResultToError(result: Runtime.RemoteObject): Error {
    const { className, description } = result;
    const err = new Error(extractErrorMessage(description));
    err.stack = description;
    Object.defineProperty(err, 'name', { value: className });
    return err;
}

process.on('message', (message: DebugCommand | string): void => {
    if (typeof message === 'string') {
        try {
            message = JSON.parse(message) as DebugCommand;
        } catch {
            return console.error(`Cannot parse: ${JSON.stringify(message)}`);
        }
    }
    processCommand(message);
});

sendToHost({ cmd: 'ready' });

// possible commands
// start           - {cmd: 'start', scriptName: 'script.js.myName'} - start the debugging
// end             - {cmd: 'end'} - end the debugging and stop process
// source          - {cmd: 'source', scriptId} - read text of script by id
// watch           - {cmd: 'watch', expressions: ['i']} - add to watch the variable
// unwatch         - {cmd: 'unwatch', expressions: ['i']} - add to watch the variable

// sb              - {cmd: 'sb', breakpoints: [{scriptId: 50, lineNumber: 4, columnNumber: 0}]} - set breakpoint
// cb              - {cmd: 'cb', breakpoints: [{scriptId: 50, lineNumber: 4, columnNumber: 0}]} - clear breakpoint

// pause           - {cmd: 'pause'} - pause execution
// cont            - {cmd: 'cont'} - resume execution
// next            - {cmd: 'next'} - Continue to next line in current file
// step            - {cmd: 'step'} - Step into, potentially entering a function
// out             - {cmd: 'step'} - Step out, leaving the current function

type DebugCommandType =
    | 'start'
    | 'end'
    | 'source'
    | 'watch'
    | 'unwatch'
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
    | 'getPossibleBreakpoints'
    | 'error';

type DebugCommand = {
    cmd: DebugCommandType;
    scriptName?: string;
    scriptId?: Runtime.ScriptId;
    instance?: number;
    adapterInstance?: string;
    breakpoints?: Debugger.Location[] | Debugger.BreakpointId[];
    expressions?: { name: string }[];
    scopes?: Debugger.Scope[];

    variableName?: string;
    scopeNumber?: number;
    newValue?: string;
    callFrameId?: string;
    state?: boolean;

    start?: number;
    end?: number;
};

function processCommand(data: DebugCommand): void {
    if (data.cmd === 'start') {
        scriptToDebug = data.scriptName as string;
        // we can request the script by name or iobroker instance to debug
        if (scriptToDebug) {
            startInspect([
                `${__dirname}/../main.js`,
                (data.instance || 0).toString(),
                '--debug',
                '--debugScript',
                scriptToDebug,
            ]);
        } else {
            instanceToDebug = data.adapterInstance as string;
            const [adapter, instance] = instanceToDebug.split('.');
            let file: string | undefined;
            try {
                file = require.resolve(`iobroker.${adapter}`);
            } catch (e: any) {
                // try to locate in the same dir
                const dir = normalize(join(__dirname, '..', `iobroker.${adapter}`));
                if (existsSync(dir)) {
                    const pack = require(join(dir, 'package.json'));
                    if (existsSync(join(dir, pack.main || `${adapter}.js`))) {
                        file = join(dir, pack.main || `${adapter}.js`);
                    }
                }

                if (!file) {
                    sendToHost({ cmd: 'error', error: `Cannot locate iobroker.${adapter}`, errorContext: e });
                    setTimeout(() => {
                        sendToHost({ cmd: 'finished', context: `Cannot locate iobroker.${adapter}` });
                        setTimeout(() => process.exit(124), 500);
                    }, 200);
                    return;
                }
            }
            file = file.replace(/\\/g, '/');
            instanceToDebug = file;
            console.log(`Start ${file} ${instance} --debug`);
            startInspect([file, instance, '--debug']);
        }
    } else if (data.cmd === 'end') {
        process.exit();
    } else if (data.cmd === 'source') {
        inspector.Debugger.getScriptSource({ scriptId: data.scriptId } as Debugger.GetScriptSourceParameterType).then(
            (script: Debugger.GetScriptSourceReturnType) =>
                sendToHost({ cmd: 'script', scriptId: data.scriptId, text: script.scriptSource }),
        );
    } else if (data.cmd === 'cont') {
        inspector.Debugger.resume().catch((e: any) => sendToHost({ cmd: 'error', error: e }));
    } else if (data.cmd === 'next') {
        inspector.Debugger.stepOver().catch((e: any) => sendToHost({ cmd: 'error', error: e }));
    } else if (data.cmd === 'pause') {
        inspector.Debugger.pause().catch((e: any) => sendToHost({ cmd: 'error', error: e }));
    } else if (data.cmd === 'step') {
        inspector.Debugger.stepInto().catch((e: any) => sendToHost({ cmd: 'error', error: e }));
    } else if (data.cmd === 'out') {
        inspector.Debugger.stepOut().catch((e: any) => sendToHost({ cmd: 'error', error: e }));
    } else if (data.cmd === 'sb') {
        console.log(JSON.stringify(data));

        Promise.all(
            (data.breakpoints as Debugger.Location[])?.map((bp: Debugger.Location) =>
                inspector.Debugger.setBreakpoint({
                    location: {
                        scriptId: bp.scriptId,
                        lineNumber: bp.lineNumber,
                        columnNumber: bp.columnNumber,
                    },
                } as Debugger.SetBreakpointParameterType)
                    .then((result: Debugger.SetBreakpointReturnType) => ({
                        id: result.breakpointId,
                        location: result.actualLocation,
                    }))
                    .catch((e: any) =>
                        sendToHost({ cmd: 'error', error: `Cannot set breakpoint: ${e}`, errorContext: e, bp }),
                    ),
            ) || [],
        ).then(breakpoints => sendToHost({ cmd: 'sb', breakpoints }));
    } else if (data.cmd === 'cb') {
        Promise.all(
            (data.breakpoints as Debugger.BreakpointId[])?.map(breakpointId =>
                inspector.Debugger.removeBreakpoint({ breakpointId } as Debugger.RemoveBreakpointParameterType)
                    .then(() => breakpointId)
                    .catch((e: any) =>
                        sendToHost({
                            cmd: 'error',
                            error: `Cannot clear breakpoint: ${e}`,
                            errorContext: e,
                            id: breakpointId,
                        }),
                    ),
            ) || [],
        ).then(breakpoints => sendToHost({ cmd: 'cb', breakpoints }));
    } else if (data.cmd === 'watch') {
        Promise.all(
            data.expressions?.map(expr =>
                inspector.Debugger.watch(expr).catch((e: any) =>
                    sendToHost({ cmd: 'error', error: `Cannot watch expr: ${e}`, errorContext: e, expr }),
                ),
            ) || [],
        ).then(() => console.log('Watch done'));
    } else if (data.cmd === 'unwatch') {
        Promise.all(
            data.expressions?.map(expr =>
                inspector.Debugger.unwatch(expr).catch((e: any) =>
                    sendToHost({ cmd: 'error', error: `Cannot unwatch expr: ${e}`, errorContext: e, expr }),
                ),
            ) || [],
        ).then(() => console.log('Watch done'));
    } else if (data.cmd === 'scope') {
        Promise.all(
            data.scopes
                ?.filter(scope => scope?.object && scope.object.objectId)
                .map(scope =>
                    inspector.Runtime.getProperties({
                        objectId: scope.object.objectId,
                        generatePreview: true,
                    } as Runtime.GetPropertiesParameterType)
                        .then((result: any) => ({ type: scope.type, properties: result }))
                        .catch((e: any) =>
                            sendToHost({ cmd: 'error', error: `Cannot get scopes expr: ${e}`, errorContext: e }),
                        ),
                ) || [],
        ).then(scopes => sendToHost({ cmd: 'scope', scopes }));
    } else if (data.cmd === 'setValue') {
        inspector.Debugger.setVariableValue({
            variableName: data.variableName,
            scopeNumber: data.scopeNumber,
            newValue: data.newValue,
            callFrameId: data.callFrameId,
        } as Debugger.SetVariableValueParameterType)
            .catch((e: any) => sendToHost({ cmd: 'setValue', variableName: `Cannot setValue: ${e}`, errorContext: e }))
            .then(() =>
                sendToHost({
                    cmd: 'setValue',
                    variableName: data.variableName,
                    scopeNumber: data.scopeNumber,
                    newValue: data.newValue,
                    callFrameId: data.callFrameId,
                }),
            );
    } else if (data.cmd === 'expressions') {
        Promise.all(
            data.expressions?.map(item =>
                inspector.Debugger.evaluateOnCallFrame({
                    callFrameId: data.callFrameId,
                    expression: item.name,
                    objectGroup: 'node-inspect',
                    returnByValue: true,
                    generatePreview: true,
                } as Debugger.EvaluateOnCallFrameParameterType)
                    // @ts-expect-error fix later
                    .then(({ result, wasThrown }: Debugger.EvaluateOnCallFrameReturnType) => {
                        if (wasThrown) {
                            return { name: item.name, result: convertResultToError(result) };
                        }
                        return { name: item.name, result };
                    })
                    .catch((e: any) =>
                        sendToHost({ cmd: 'expressions', variableName: `Cannot setValue: ${e}`, errorContext: e }),
                    ),
            ) || [],
        ).then(expressions => sendToHost({ cmd: 'expressions', expressions }));
    } else if (data.cmd === 'stopOnException') {
        inspector.Debugger.setPauseOnExceptions({
            state: data.state ? 'all' : 'none',
        } as Debugger.SetPauseOnExceptionsParameterType).catch((e: any) =>
            sendToHost({ cmd: 'stopOnException', variableName: `Cannot stopOnException: ${e}`, errorContext: e }),
        );
    } else if (data.cmd === 'getPossibleBreakpoints') {
        inspector.Debugger.getPossibleBreakpoints({ start: data.start, end: data.end })
            .then((breakpoints: Debugger.GetPossibleBreakpointsReturnType) =>
                sendToHost({ cmd: 'getPossibleBreakpoints', breakpoints: breakpoints.locations }),
            )
            .catch((e: any) =>
                sendToHost({
                    cmd: 'getPossibleBreakpoints',
                    variableName: `Cannot getPossibleBreakpoints: ${e}`,
                    errorContext: e,
                }),
            );
    } else {
        console.error(`Unknown command: ${JSON.stringify(data)}`);
    }
}

function sendToHost(data: CommandToHost): void {
    if (data.cmd === 'error') {
        console.error(data.text);
        if (data.expr) {
            console.error(`[EXPRESSION] ${JSON.stringify(data.expr)}`);
        }
        if (data.bp) {
            console.error(`[BP] ${JSON.stringify(data.bp)}`);
        }
    }

    process.send && process.send(JSON.stringify(data));
}
