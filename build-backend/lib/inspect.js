"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeInspector = void 0;
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
const node_child_process_1 = require("node:child_process");
const node_events_1 = require("node:events");
const node_net_1 = require("node:net");
const node_util_1 = require("node:util");
const node_path_1 = require("node:path");
const node_fs_1 = require("node:fs");
// @ts-expect-error no types available
const inspect_client_1 = __importDefault(require("node-inspect/lib/internal/inspect_client"));
const debugger_1 = __importDefault(require("./debugger"));
// const runAsStandalone = typeof __dirname !== 'undefined';
const breakOnStart = process.argv.includes('--breakOnStart');
const debuglog = (0, node_util_1.debuglog)('inspect');
let inspector;
let scriptToDebug = ''; // script.js.yy
let instanceToDebug = ''; // adapter.X
let alreadyPausedOnFirstLine = false;
class StartupError extends Error {
    constructor(message) {
        super(message);
        this.name = 'StartupError';
    }
}
function portIsFree(host, port, timeout = 9999) {
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
        function pingPort() {
            if (didTimeOut) {
                return;
            }
            const socket = (0, node_net_1.connect)(port, host);
            let didRetry = false;
            function retry() {
                if (!didRetry && !didTimeOut) {
                    didRetry = true;
                    setTimeout(pingPort, retryDelay);
                }
            }
            socket.on('error', (error) => {
                if (error.code === 'ECONNREFUSED') {
                    resolve();
                }
                else {
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
function runScript(script, scriptArgs, inspectHost, inspectPort, childPrint) {
    script = (0, node_path_1.normalize)(script);
    return portIsFree(inspectHost, inspectPort).then(() => {
        return new Promise(resolve => {
            const args = [breakOnStart ? `--inspect-brk=${inspectPort}` : `--inspect=${inspectPort}`].concat([script], scriptArgs || []);
            const child = (0, node_child_process_1.spawn)(process.execPath, args);
            child.stdout.setEncoding('utf8');
            child.stderr.setEncoding('utf8');
            child.stdout.on('data', childPrint);
            child.stderr.on('data', text => childPrint(text, true));
            let output = '';
            function waitForListenHint(text) {
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
function createAgentProxy(domain, client) {
    const agent = new node_events_1.EventEmitter();
    agent.then = (...args) => {
        // TODO: potentially fetch the protocol and pretty-print it here.
        const descriptor = {
            [node_util_1.inspect.custom](_depth, { stylize }) {
                return stylize(`[Agent ${domain}]`, 'special');
            },
        };
        return Promise.resolve(descriptor).then(...args);
    };
    return new Proxy(agent, {
        get(target, name) {
            if (name in target) {
                return target[name];
            }
            return function callVirtualMethod(params) {
                return client.callMethod(`${domain}.${name}`, params);
            };
        },
    });
}
class NodeInspector {
    options;
    stdin;
    stdout;
    scripts;
    delayedContext;
    paused;
    child;
    _runScript;
    client;
    Debugger;
    HeapProfiler;
    Profiler;
    Runtime;
    handleDebugEvent;
    mainScriptId;
    mainFile;
    repl;
    constructor(options, stdin, stdout) {
        this.options = options;
        this.stdin = stdin;
        this.stdout = stdout;
        this.scripts = {};
        this.delayedContext = null;
        this.paused = true;
        this.child = null;
        if (options.script) {
            this._runScript = runScript.bind(null, options.script, options.scriptArgs, options.host, options.port, this.childPrint.bind(this));
        }
        else {
            this._runScript = () => Promise.resolve([null, options.port, options.host]);
        }
        this.client = new inspect_client_1.default();
        this.Debugger = createAgentProxy('Debugger', this.client);
        this.HeapProfiler = createAgentProxy('HeapProfiler', this.client);
        this.Profiler = createAgentProxy('Profiler', this.client);
        this.Runtime = createAgentProxy('Runtime', this.client);
        this.handleDebugEvent = (fullName, params) => {
            const [domain, name] = fullName.split('.');
            if (domain === 'Debugger' && name === 'scriptParsed') {
                // console.log(`Parsed: ${params.url}`);
                if ((scriptToDebug && params.url.includes(scriptToDebug)) ||
                    (instanceToDebug && params.url.includes(instanceToDebug))) {
                    console.log(`My scriptID: ${params.scriptId}`);
                    this.mainScriptId = params.scriptId;
                    this.mainFile = params.url.replace('file:///', '');
                    // load text of a script
                    this.scripts[this.mainScriptId] = this.Debugger.getScriptSource({
                        scriptId: this.mainScriptId,
                    }).then((script) => ({
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
            }
            else if (domain === 'Debugger' && name === 'resumed') {
                this.Debugger.emit(name, params);
                sendToHost({ cmd: 'resumed', context: params });
                return;
            }
            else if (domain === 'Debugger' && name === 'paused') {
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
                        this.scripts[this.mainScriptId]?.then(data => sendToHost({
                            cmd: 'readyToDebug',
                            scriptId: data.scriptId,
                            script: data.script,
                            context: params,
                            url: this.mainFile,
                        }));
                    }
                    else {
                        // store context to send it later when script ID will be known
                        this.delayedContext = params;
                        console.log('PAUSED, but no scriptId');
                    }
                }
                else {
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
                }
                else if (text.includes(`$$${scriptToDebug}$$`)) {
                    console.log(`${fullName} [${params.executionContextId}]: => ${text}`);
                    const [severity, _text] = text.split(`$$${scriptToDebug}$$`);
                    sendToHost({
                        cmd: 'log',
                        severity: severity,
                        text: _text,
                        ts: params.args[1] && params.args[1].value ? params.args[1].value : Date.now(),
                    });
                }
                else if (params.type === 'warning' || params.type === 'error') {
                    sendToHost({
                        cmd: 'log',
                        severity: params.type === 'warning' ? 'warn' : 'error',
                        text,
                        ts: Date.now(),
                    });
                }
                return;
            }
            else if (domain === 'Runtime' && (params.id === 2 || params.executionContextId === 2)) {
                if (name === 'executionContextCreated') {
                    console.warn(`${fullName}: =>\n${JSON.stringify(params, null, 2)}`);
                }
                else if (name === 'executionContextDestroyed') {
                    console.warn(`${fullName}: =>\n${JSON.stringify(params, null, 2)}`);
                    sendToHost({ cmd: 'finished', context: params });
                }
                return;
            }
            else if (domain === 'Runtime' &&
                name === 'executionContextDestroyed' &&
                params.executionContextId === 1) {
                sendToHost({ cmd: 'finished', context: params });
                console.log('Exited!');
                setTimeout(() => process.exit(125), 200);
            }
            else if (domain === 'Debugger' && name === 'scriptFailedToParse') {
                // ignore
                return;
            }
            console.warn(`${fullName}: =>\n${JSON.stringify(params, null, 2)}`);
            /*if (domain in this) {
                this[domain].emit(name, params);
            }*/
        };
        this.client.on('debugEvent', this.handleDebugEvent);
        const startRepl = (0, debugger_1.default)(this);
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
            .then(null, error => process.nextTick(() => {
            throw error;
        }));
    }
    suspendReplWhile(fn) {
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
            .then(null, error => process.nextTick(() => {
            throw error;
        }));
    }
    killChild() {
        this.client.reset();
        if (this.child) {
            this.child.kill();
            this.child = null;
        }
    }
    run() {
        this.killChild();
        return this._runScript().then(([child, port, host]) => {
            this.child = child;
            let connectionAttempts = 0;
            const attemptConnect = () => {
                ++connectionAttempts;
                debuglog('connection attempt #%d', connectionAttempts);
                this.stdout.write('.');
                return this.client.connect(port, host).then(() => {
                    debuglog('connection established');
                    this.stdout.write(' ok');
                }, (error) => {
                    debuglog('connect failed', error);
                    // If it's failed to connect 10 times, then print a failed message
                    if (connectionAttempts >= 10) {
                        this.stdout.write(' failed to connect, please retry\n');
                        process.exit(1);
                    }
                    return new Promise(resolve => setTimeout(resolve, 500)).then(attemptConnect);
                });
            };
            this.print(`connecting to ${host}:${port} ..`, true);
            return attemptConnect();
        });
    }
    clearLine() {
        if (this.stdout.isTTY) {
            this.stdout.cursorTo(0);
            this.stdout.clearLine(1);
        }
        else {
            this.stdout.write('\b');
        }
    }
    print(text, oneLine = false) {
        this.clearLine();
        this.stdout.write(oneLine ? text : `${text}\n`);
    }
    childPrint(text, isError) {
        isError &&
            this.print(text
                .toString()
                .split(/\r\n|\r|\n/g)
                .filter((chunk) => !!chunk)
                .map((chunk) => `< ${chunk}`)
                .join('\n'));
        if (!this.paused) {
            this.repl?.displayPrompt(true);
        }
        if (/Waiting for the debugger to disconnect\.\.\.\n$/.test(text)) {
            this.killChild();
            sendToHost({ cmd: 'finished', text });
        }
    }
}
exports.NodeInspector = NodeInspector;
function parseArgv([target, ...args]) {
    let host = '127.0.0.1';
    let port = 9229;
    let isRemote = false;
    let script = target;
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
    }
    else if (portMatch) {
        // start debugee on custom port
        // `node inspect --port=9230 script.js`
        port = parseInt(portMatch[1], 10);
        script = args[0];
        scriptArgs = args.slice(1);
    }
    else if (args.length === 1 && /^\d+$/.test(args[0]) && target === '-p') {
        // Start debugger against a given pid
        const pid = parseInt(args[0], 10);
        try {
            // Windows does not support UNIX signals. To enable debugging, you can use an undocumented API function
            // https://github.com/node-inspector/node-inspector?tab=readme-ov-file#windows
            // @ts-expect-error undocumented function
            process._debugProcess(pid);
        }
        catch (e) {
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
function startInspect(argv = process.argv.slice(2), stdin = process.stdin, stdout = process.stdout) {
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
    function handleUnexpectedError(e) {
        if (!(e instanceof StartupError)) {
            console.error('There was an internal error in node-inspect. Please report this bug.');
            console.error(e.message);
            console.error(e.stack);
        }
        else {
            console.error(e.message);
        }
        inspector.child?.kill();
        process.exit(1);
    }
    process.on('uncaughtException', handleUnexpectedError);
}
function extractErrorMessage(stack) {
    if (!stack) {
        return '<unknown>';
    }
    const m = stack.match(/^\w+: ([^\n]+)/);
    return m ? m[1] : stack;
}
function convertResultToError(result) {
    const { className, description } = result;
    const err = new Error(extractErrorMessage(description));
    err.stack = description;
    Object.defineProperty(err, 'name', { value: className });
    return err;
}
process.on('message', (message) => {
    if (typeof message === 'string') {
        try {
            message = JSON.parse(message);
        }
        catch {
            return console.error(`Cannot parse: ${JSON.stringify(message)}`);
        }
    }
    processCommand(message);
});
sendToHost({ cmd: 'ready' });
function processCommand(data) {
    if (data.cmd === 'start') {
        scriptToDebug = data.scriptName;
        // we can request the script by name or iobroker instance to debug
        if (scriptToDebug) {
            startInspect([
                `${__dirname}/../main.js`,
                (data.instance || 0).toString(),
                '--debug',
                '--debugScript',
                scriptToDebug,
            ]);
        }
        else {
            instanceToDebug = data.adapterInstance;
            const [adapter, instance] = instanceToDebug.split('.');
            let file;
            try {
                file = require.resolve(`iobroker.${adapter}`);
            }
            catch (e) {
                // try to locate in the same dir
                const dir = (0, node_path_1.normalize)((0, node_path_1.join)(__dirname, '..', `iobroker.${adapter}`));
                if ((0, node_fs_1.existsSync)(dir)) {
                    const pack = require((0, node_path_1.join)(dir, 'package.json'));
                    if ((0, node_fs_1.existsSync)((0, node_path_1.join)(dir, pack.main || `${adapter}.js`))) {
                        file = (0, node_path_1.join)(dir, pack.main || `${adapter}.js`);
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
    }
    else if (data.cmd === 'end') {
        process.exit();
    }
    else if (data.cmd === 'source') {
        inspector.Debugger.getScriptSource({ scriptId: data.scriptId }).then((script) => sendToHost({ cmd: 'script', scriptId: data.scriptId, text: script.scriptSource }));
    }
    else if (data.cmd === 'cont') {
        inspector.Debugger.resume().catch((e) => sendToHost({ cmd: 'error', error: e }));
    }
    else if (data.cmd === 'next') {
        inspector.Debugger.stepOver().catch((e) => sendToHost({ cmd: 'error', error: e }));
    }
    else if (data.cmd === 'pause') {
        inspector.Debugger.pause().catch((e) => sendToHost({ cmd: 'error', error: e }));
    }
    else if (data.cmd === 'step') {
        inspector.Debugger.stepInto().catch((e) => sendToHost({ cmd: 'error', error: e }));
    }
    else if (data.cmd === 'out') {
        inspector.Debugger.stepOut().catch((e) => sendToHost({ cmd: 'error', error: e }));
    }
    else if (data.cmd === 'sb') {
        console.log(JSON.stringify(data));
        Promise.all(data.breakpoints?.map((bp) => inspector.Debugger.setBreakpoint({
            location: {
                scriptId: bp.scriptId,
                lineNumber: bp.lineNumber,
                columnNumber: bp.columnNumber,
            },
        })
            .then((result) => ({
            id: result.breakpointId,
            location: result.actualLocation,
        }))
            .catch((e) => sendToHost({ cmd: 'error', error: `Cannot set breakpoint: ${e}`, errorContext: e, bp }))) || []).then(breakpoints => sendToHost({ cmd: 'sb', breakpoints }));
    }
    else if (data.cmd === 'cb') {
        Promise.all(data.breakpoints?.map(breakpointId => inspector.Debugger.removeBreakpoint({ breakpointId })
            .then(() => breakpointId)
            .catch((e) => sendToHost({
            cmd: 'error',
            error: `Cannot clear breakpoint: ${e}`,
            errorContext: e,
            id: breakpointId,
        }))) || []).then(breakpoints => sendToHost({ cmd: 'cb', breakpoints }));
    }
    else if (data.cmd === 'watch') {
        Promise.all(data.expressions?.map(expr => inspector.Debugger.watch(expr).catch((e) => sendToHost({ cmd: 'error', error: `Cannot watch expr: ${e}`, errorContext: e, expr }))) || []).then(() => console.log('Watch done'));
    }
    else if (data.cmd === 'unwatch') {
        Promise.all(data.expressions?.map(expr => inspector.Debugger.unwatch(expr).catch((e) => sendToHost({ cmd: 'error', error: `Cannot unwatch expr: ${e}`, errorContext: e, expr }))) || []).then(() => console.log('Watch done'));
    }
    else if (data.cmd === 'scope') {
        Promise.all(data.scopes
            ?.filter(scope => scope?.object && scope.object.objectId)
            .map(scope => inspector.Runtime.getProperties({
            objectId: scope.object.objectId,
            generatePreview: true,
        })
            .then((result) => ({ type: scope.type, properties: result }))
            .catch((e) => sendToHost({ cmd: 'error', error: `Cannot get scopes expr: ${e}`, errorContext: e }))) || []).then(scopes => sendToHost({ cmd: 'scope', scopes }));
    }
    else if (data.cmd === 'setValue') {
        inspector.Debugger.setVariableValue({
            variableName: data.variableName,
            scopeNumber: data.scopeNumber,
            newValue: data.newValue,
            callFrameId: data.callFrameId,
        })
            .catch((e) => sendToHost({ cmd: 'setValue', variableName: `Cannot setValue: ${e}`, errorContext: e }))
            .then(() => sendToHost({
            cmd: 'setValue',
            variableName: data.variableName,
            scopeNumber: data.scopeNumber,
            newValue: data.newValue,
            callFrameId: data.callFrameId,
        }));
    }
    else if (data.cmd === 'expressions') {
        Promise.all(data.expressions?.map(item => inspector.Debugger.evaluateOnCallFrame({
            callFrameId: data.callFrameId,
            expression: item.name,
            objectGroup: 'node-inspect',
            returnByValue: true,
            generatePreview: true,
        })
            // @ts-expect-error fix later
            .then(({ result, wasThrown }) => {
            if (wasThrown) {
                return { name: item.name, result: convertResultToError(result) };
            }
            return { name: item.name, result };
        })
            .catch((e) => sendToHost({ cmd: 'expressions', variableName: `Cannot setValue: ${e}`, errorContext: e }))) || []).then(expressions => sendToHost({ cmd: 'expressions', expressions }));
    }
    else if (data.cmd === 'stopOnException') {
        inspector.Debugger.setPauseOnExceptions({
            state: data.state ? 'all' : 'none',
        }).catch((e) => sendToHost({ cmd: 'stopOnException', variableName: `Cannot stopOnException: ${e}`, errorContext: e }));
    }
    else if (data.cmd === 'getPossibleBreakpoints') {
        inspector.Debugger.getPossibleBreakpoints({ start: data.start, end: data.end })
            .then((breakpoints) => sendToHost({ cmd: 'getPossibleBreakpoints', breakpoints: breakpoints.locations }))
            .catch((e) => sendToHost({
            cmd: 'getPossibleBreakpoints',
            variableName: `Cannot getPossibleBreakpoints: ${e}`,
            errorContext: e,
        }));
    }
    else {
        console.error(`Unknown command: ${JSON.stringify(data)}`);
    }
}
function sendToHost(data) {
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
//# sourceMappingURL=inspect.js.map