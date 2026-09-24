"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * The inspector process. It is forked by the adapter (see `debugStart` in main.ts) and starts the process to debug -
 * the javascript adapter itself with `--debugScript <scriptId>` or another adapter - with an enabled inspector.
 * It connects to it via the DevTools protocol and translates the commands of the GUI into protocol calls and back.
 *
 * The communication with the host happens via IPC with JSON strings:
 * - host -> inspector: `DebugCommand`
 * - inspector -> host: `CommandToHost`
 */
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_url_1 = require("node:url");
const node_util_1 = require("node:util");
// @ts-expect-error no types available
const inspect_client_1 = __importDefault(require("node-inspect/lib/internal/inspect_client"));
const debuglog = (0, node_util_1.debuglog)('inspect');
/** Stay paused on the first line of the debugged process (used for the debugging of adapter instances) */
const breakOnStart = process.argv.includes('--breakOnStart');
/**
 * By debugging of a script, stepping and "stop on exception" should not stop in the node internals,
 * in 3rd party modules and in the adapter itself (e.g., in sandbox.js)
 */
const SCRIPT_BLACKBOX_PATTERNS = ['^node:', '/node_modules/', '[iI]o[bB]roker\\.javascript/build/'];
class StartupError extends Error {
    constructor(message) {
        super(message);
        this.name = 'StartupError';
    }
}
let inspector;
/** ID of the debugged script, like `script.js.myScript` */
let scriptToDebug = '';
/** Main file of the debugged adapter */
let instanceToDebug = '';
/** The inspector is on its way out, so every further request to end it is ignored */
let ending = false;
/**
 * End this process, but stop the debugged process first and give it the time to shut down.
 * Its output goes through the pipes of this process, so they must stay open till it is gone (see `stopChild`).
 */
async function endInspector(exitCode) {
    if (ending) {
        return;
    }
    ending = true;
    try {
        await inspector?.stopChild();
    }
    catch (e) {
        debuglog(`Cannot stop the debugged process: ${e}`);
    }
    // Give the last messages to the host the chance to leave
    setTimeout(() => process.exit(exitCode), 200);
}
function sendToHost(data) {
    if (data.cmd === 'error') {
        console.error(`[DEBUGGER] ${data.error}`);
    }
    try {
        process.send?.(JSON.stringify(data));
    }
    catch (e) {
        // The host is not reachable anymore
        console.error(`[DEBUGGER] Cannot send to host: ${e}`);
    }
}
function errorToString(e) {
    if (e instanceof Error) {
        return e.message;
    }
    return typeof e === 'string' ? e : JSON.stringify(e);
}
function reportError(text, e) {
    sendToHost({ cmd: 'error', error: e === undefined ? text : `${text}: ${errorToString(e)}` });
}
function remoteObjectToString(obj) {
    if (!obj) {
        return '';
    }
    if (obj.value !== undefined) {
        return typeof obj.value === 'string' ? obj.value : JSON.stringify(obj.value);
    }
    return obj.unserializableValue || obj.description || obj.type;
}
function consoleTypeToSeverity(type) {
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
function toCallArgument(value) {
    if (typeof value === 'number' && (!Number.isFinite(value) || Object.is(value, -0))) {
        return { unserializableValue: Object.is(value, -0) ? '-0' : String(value) };
    }
    if (typeof value === 'bigint') {
        return { unserializableValue: `${value}n` };
    }
    return value === undefined ? {} : { value };
}
function isUrlOfFile(url, file) {
    let path = url;
    if (url.startsWith('file://')) {
        try {
            path = (0, node_url_1.fileURLToPath)(url);
        }
        catch {
            return false;
        }
    }
    path = (0, node_path_1.normalize)(path);
    file = (0, node_path_1.normalize)(file);
    return process.platform === 'win32' ? path.toLowerCase() === file.toLowerCase() : path === file;
}
function createDomain(domain, client) {
    return new Proxy({}, {
        get: (_target, method) => 
        // the object must not look like a promise
        typeof method === 'string' && method !== 'then'
            ? (params) => client.callMethod(`${domain}.${method}`, params)
            : undefined,
    });
}
function runScript(script, scriptArgs, childPrint) {
    return new Promise((resolve, reject) => {
        // Always break on start: the process must not run before the debugger is connected, else it could
        // execute the `debugger;` statement of the script before. Port 0 means any free port.
        const child = (0, node_child_process_1.spawn)(process.execPath, ['--inspect-brk=127.0.0.1:0', (0, node_path_1.normalize)(script), ...scriptArgs]);
        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');
        child.stdout.on('data', (text) => childPrint(text));
        child.stderr.on('data', (text) => childPrint(text, true));
        let output = '';
        const timeout = setTimeout(() => {
            child.stderr.removeListener('data', waitForListenHint);
            child.kill();
            reject(new StartupError('Timeout by starting of the process to debug'));
        }, 10_000);
        function waitForListenHint(text) {
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
    Debugger;
    Runtime;
    client = new inspect_client_1.default();
    file;
    args;
    child = null;
    /** The protocol does not deliver the URLs in the call frames anymore, so remember them */
    scriptUrls = {};
    mainScriptId;
    mainFile = '';
    mainScriptSource = null;
    /** Sometimes the first pause comes before the main script is parsed */
    delayedContext = null;
    pausedOnFirstLine = false;
    /** Execution context of the debugged script */
    scriptContextId;
    finished = false;
    constructor(file, args) {
        this.file = file;
        this.args = args;
        this.Debugger = createDomain('Debugger', this.client);
        this.Runtime = createDomain('Runtime', this.client);
        this.client.on('debugEvent', (fullName, params) => this.handleDebugEvent(fullName, params || {}));
    }
    async start() {
        const [child, port, host] = await runScript(this.file, this.args, (text, isError) => this.childPrint(text, isError));
        this.child = child;
        child.on('exit', code => this.finish(`Process exited with code ${code}`));
        for (let attempt = 1;; attempt++) {
            try {
                await this.client.connect(port, host);
                break;
            }
            catch (e) {
                debuglog(`Connection attempt #${attempt} failed: ${e}`);
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
    /** Kill the debugged process without waiting for it. Only for the exit handler, where nothing can be awaited */
    killChild() {
        this.client.reset();
        if (this.child) {
            this.child.kill();
            this.child = null;
        }
    }
    /**
     * Stop the debugged process and wait till it is really gone.
     *
     * The debugged process is started with `--debug`, so it writes its whole log to the stdout of this process, and it
     * logs while it is shutting down. If this process would end first, these pipes would be closed under it and every
     * further log line would fail with `EPIPE` - which the adapter reports as an uncaught exception and dies (#2382).
     */
    async stopChild(timeoutMs = 3_000) {
        this.client.reset();
        const child = this.child;
        this.child = null;
        if (!child || child.exitCode !== null || child.signalCode !== null) {
            return;
        }
        await new Promise(resolve => {
            const timeout = setTimeout(() => {
                // It does not want to end - take the hard way
                child.kill('SIGKILL');
                resolve();
            }, timeoutMs);
            child.once('exit', () => {
                clearTimeout(timeout);
                resolve();
            });
            child.kill();
        });
    }
    finish(reason) {
        if (this.finished) {
            return;
        }
        this.finished = true;
        debuglog(reason);
        sendToHost({ cmd: 'finished', text: reason });
        void endInspector(0);
    }
    childPrint(text, isError) {
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
    handleDebugEvent(fullName, params) {
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
                }
                else if (this.scriptContextId !== undefined && params.executionContextId === this.scriptContextId) {
                    // the script was stopped, but the process is still running
                    sendToHost({ cmd: 'finished', context: params });
                }
                break;
            default:
                debuglog(`${fullName}: ${JSON.stringify(params)}`);
                break;
        }
    }
    onScriptParsed(params) {
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
        this.mainScriptSource = this.Debugger.getScriptSource({ scriptId }).then((result) => result.scriptSource);
        if (this.delayedContext) {
            const context = this.delayedContext;
            this.delayedContext = null;
            void this.sendReadyToDebug(context);
        }
    }
    onPaused(params) {
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
        if (this.pausedOnFirstLine &&
            scriptToDebug &&
            params.reason === 'step' &&
            !params.callFrames?.[0]?.url?.startsWith('script.js.')) {
            // Stepping left the script, e.g., at the end of a callback. The blackbox patterns do not cover
            // all internals of node.js, so continue the execution instead of stopping there
            this.Debugger.resume().catch(e => reportError('Cannot resume', e));
            return;
        }
        if (this.pausedOnFirstLine) {
            sendToHost({ cmd: 'paused', context: params });
        }
        else {
            this.pausedOnFirstLine = true;
            if (this.mainScriptSource) {
                void this.sendReadyToDebug(params);
            }
            else {
                // store the context to send it, when the main script is parsed
                this.delayedContext = params;
            }
        }
    }
    async sendReadyToDebug(context) {
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
        }
        catch (e) {
            reportError('Cannot read the source of the script to debug', e);
        }
    }
    enrichCallFrames(context) {
        context.callFrames?.forEach(frame => {
            if (!frame.url) {
                frame.url = this.scriptUrls[frame.location.scriptId] || '';
            }
        });
    }
    onConsoleApiCalled(params) {
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
        }
        else if (params.type === 'warning' || params.type === 'error') {
            sendToHost({
                cmd: 'log',
                severity: consoleTypeToSeverity(params.type),
                text: args.map(arg => remoteObjectToString(arg)).join(' '),
                ts: Date.now(),
            });
        }
    }
}
function resolveAdapterMainFile(adapter) {
    try {
        return require.resolve(`iobroker.${adapter}`);
    }
    catch {
        // try to locate it in the same node_modules directory as this adapter
        const dir = (0, node_path_1.normalize)((0, node_path_1.join)(__dirname, '..', '..', '..', `iobroker.${adapter}`));
        if ((0, node_fs_1.existsSync)((0, node_path_1.join)(dir, 'package.json'))) {
            try {
                const pack = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.join)(dir, 'package.json'), 'utf8'));
                const main = (0, node_path_1.join)(dir, pack.main || `${adapter}.js`);
                if ((0, node_fs_1.existsSync)(main)) {
                    return main;
                }
            }
            catch {
                // ignore
            }
        }
    }
    return undefined;
}
function startDebugging(data) {
    if (inspector) {
        reportError('The debugger is already started');
        return;
    }
    if (data.scriptName) {
        scriptToDebug = data.scriptName;
        inspector = new NodeInspector((0, node_path_1.join)(__dirname, '..', 'main.js'), [
            (data.instance || 0).toString(),
            '--debug',
            '--debugScript',
            scriptToDebug,
        ]);
    }
    else {
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
    inspector.start().catch((e) => {
        reportError(e instanceof StartupError
            ? e.message
            : `Internal error in inspector: ${e instanceof Error ? e.stack : errorToString(e)}`);
        void endInspector(1);
    });
}
async function processCommand(data) {
    debuglog(`processCommand: ${JSON.stringify(data)}`);
    if (data.cmd === 'start') {
        startDebugging(data);
        return;
    }
    if (data.cmd === 'end') {
        await endInspector(0);
        return;
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
                }));
                sendToHost({ cmd: 'script', scriptId: data.scriptId, text: scriptSource });
            }
            catch (e) {
                reportError(`Cannot read the source of script ${data.scriptId}`, e);
            }
            break;
        case 'cont':
        case 'next':
        case 'step':
        case 'out':
        case 'pause': {
            const method = { cont: 'resume', next: 'stepOver', step: 'stepInto', out: 'stepOut', pause: 'pause' }[data.cmd];
            try {
                await Debugger[method]();
            }
            catch (e) {
                reportError(`Cannot execute "${data.cmd}"`, e);
            }
            break;
        }
        case 'sb': {
            const breakpoints = await Promise.all((data.breakpoints || []).map(async (bp) => {
                try {
                    const result = (await Debugger.setBreakpoint({
                        location: {
                            scriptId: bp.scriptId,
                            lineNumber: bp.lineNumber,
                            columnNumber: bp.columnNumber,
                        },
                    }));
                    return { id: result.breakpointId, location: result.actualLocation };
                }
                catch (e) {
                    reportError(`Cannot set breakpoint on line ${bp.lineNumber + 1}`, e);
                    return null;
                }
            }));
            sendToHost({ cmd: 'sb', breakpoints: breakpoints.filter(bp => bp) });
            break;
        }
        case 'cb': {
            const breakpointIds = await Promise.all((data.breakpoints || []).map(async (breakpointId) => {
                try {
                    await Debugger.removeBreakpoint({ breakpointId });
                }
                catch (e) {
                    // The breakpoint does not exist (anymore), so it is removed anyway
                    debuglog(`Cannot clear breakpoint ${breakpointId}: ${e}`);
                }
                return breakpointId;
            }));
            sendToHost({ cmd: 'cb', breakpoints: breakpointIds });
            break;
        }
        case 'scope': {
            const scopes = await Promise.all((data.scopes || [])
                .filter(scope => scope?.object?.objectId)
                .map(async (scope) => {
                try {
                    const properties = (await Runtime.getProperties({
                        objectId: scope.object.objectId,
                        generatePreview: true,
                    }));
                    return { type: scope.type, name: scope.name, index: scope.index, properties };
                }
                catch (e) {
                    // e.g., the execution was resumed in the meantime
                    debuglog(`Cannot read scope: ${e}`);
                    return null;
                }
            }));
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
            }
            catch (e) {
                reportError(`Cannot set value of "${data.variableName}"`, e);
            }
            break;
        case 'expressions': {
            const expressions = await Promise.all((data.expressions || []).map(async (item) => {
                try {
                    const { result } = (await Debugger.evaluateOnCallFrame({
                        callFrameId: data.callFrameId,
                        expression: item.name,
                        objectGroup: 'node-inspect',
                        generatePreview: true,
                    }));
                    return { name: item.name, result };
                }
                catch (e) {
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
            }));
            sendToHost({ cmd: 'expressions', expressions });
            break;
        }
        case 'stopOnException':
            try {
                await Debugger.setPauseOnExceptions({ state: data.state ? 'all' : 'none' });
            }
            catch (e) {
                reportError('Cannot change "stop on exception"', e);
            }
            break;
        case 'getPossibleBreakpoints':
            try {
                const { locations } = (await Debugger.getPossibleBreakpoints({
                    start: data.start,
                    end: data.end,
                }));
                sendToHost({ cmd: 'getPossibleBreakpoints', breakpoints: locations });
            }
            catch (e) {
                reportError('Cannot get possible breakpoints', e);
            }
            break;
        default:
            console.error(`[DEBUGGER] Unknown command: ${JSON.stringify(data)}`);
            break;
    }
}
process.on('message', (message) => {
    let command;
    try {
        command = typeof message === 'string' ? JSON.parse(message) : message;
    }
    catch {
        console.error(`[DEBUGGER] Cannot parse: ${JSON.stringify(message)}`);
        return;
    }
    processCommand(command).catch(e => reportError(`Cannot process "${command?.cmd}"`, e));
});
// A closed pipe of the own output (the host can be gone already) must not end the inspector with an EPIPE
process.stdout.on('error', () => { });
process.stderr.on('error', () => { });
// Handle all possible exits and never leave the debugged process behind
process.on('exit', () => inspector?.killChild());
process.on('disconnect', () => void endInspector(0));
process.once('SIGTERM', () => void endInspector(0));
process.once('SIGHUP', () => void endInspector(0));
process.on('uncaughtException', (e) => {
    // The connection to the debugged process is reset as soon as it ends (node-inspect's client does not listen for
    // that), and while the inspector is on its way out, there is nothing worth reporting anymore
    if (ending || e?.code === 'ECONNRESET' || e?.code === 'EPIPE') {
        debuglog(`Ignored error in the inspector: ${e?.stack || e?.message}`);
        void endInspector(0);
        return;
    }
    reportError(`Internal error in inspector: ${e.stack || e.message}`);
    void endInspector(1);
});
sendToHost({ cmd: 'ready' });
//# sourceMappingURL=inspect.js.map