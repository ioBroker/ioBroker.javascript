"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FbRuntime = exports.version = void 0;
exports.runtime = runtime;
exports.forScript = forScript;
/**
 * fb-runtime: what the code generated from a function block diagram calls.
 *
 * The scripts get it with `require('@iobroker/fb-runtime')`. The blocks live here and not as copies
 * in the generated code, so a fix reaches every diagram without generating it again.
 *
 * The module holds no state of its own - every diagram creates its instances and its runtime - and
 * it touches nothing outside: states, subscriptions and timers go through the functions of the
 * sandbox, which removes all of them when the script stops.
 */
const blocks = __importStar(require("./blocks"));
const blocks_1 = require("./blocks");
const types_1 = require("./types");
// the blocks and the conversions are part of the module the generated code gets
__exportStar(require("./blocks"), exports);
exports.version = types_1.FB_RUNTIME_VERSION;
/** Changes of inputs that arrive within this time run in one cycle */
const COLLECT_MS = 20;
/** A cycle that took longer than the interval this many times in a row is reported once */
const OVERRUN_CYCLES = 10;
/** Snapshots for the online view come at most this often */
const PUBLISH_MS = 250;
/** ... and at least this often, even without a change */
const HEARTBEAT_MS = 2000;
/** The frames of a V8 stack: `at fn (file:line:column)` or `at file:line:column` */
function parseFrames(stack) {
    const frames = [];
    for (const text of (stack || '').split('\n')) {
        const match = text.match(/^\s*at (?:.*? \()?(.*?):(\d+):\d+\)?$/);
        if (match) {
            frames.push({ file: match[1].replace(/\\/g, '/'), line: Number(match[2]) });
        }
    }
    return frames;
}
/**
 * A frame of this module. The adapter maps stacks through the source maps, so a frame of this file
 * may name `runtime.ts` as well as `runtime.js`.
 */
function isOwnFrame(frame) {
    return /\/fb\/runtime\.[jt]s$/.test(frame.file);
}
/** An own property - the objects of the code come from another realm, and IDs must not find `constructor` */
function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
}
class FbRuntime {
    sandbox;
    hooks;
    values = new Map();
    outputs = new Map();
    /** IDs whose value could not be converted - reported once each */
    badInputs = new Set();
    cycle = null;
    options = null;
    signals = null;
    collectTimer = null;
    lastRun = 0;
    cycles = 0;
    /** The first cycle ran - with `firstScan` */
    scanned = false;
    overruns = 0;
    overrunReported = false;
    lastError = '';
    error = null;
    started = false;
    stopped = false;
    /** Where the generated code runs: its file name in the stack, and how its lines are shifted there */
    scriptFile = '';
    lineOffset = 0;
    /** What the online view got last; `null` while nobody watches */
    sent = null;
    sentError = 'null';
    sentDebug = '';
    sentPaths = '';
    viewer = 0;
    lastPublish = 0;
    /** The breakpoints of the code (`B`), one entry per block in the order of `options.blocks` */
    breaks = null;
    /** The instances of the diagram (`I`) - an instance of a user block has its inside in `$I` and `$S` */
    instances = null;
    breakpoints = new Set();
    /** Forced signals, and what their blocks computed meanwhile */
    forced = new Map();
    computed = new Map();
    /** Set while the cycles wait for the online view */
    halt = null;
    unlisten = null;
    /** The SCHEDULE blocks whose time the sandbox watches */
    schedules = new Set();
    /** The times of the sun events of `astroDay`, by `<event>|<offset>` */
    astroTimes = new Map();
    astroDay = '';
    constructor(sandbox, hooks) {
        this.sandbox = sandbox;
        this.hooks = hooks;
        // the sandbox removes timers and subscriptions itself; this only stops a start still reading
        sandbox.onStop(() => {
            this.stopped = true;
            this.unlisten?.();
            this.unlisten = null;
        });
    }
    /** The value of a state, converted to the type the STATE_IN block puts out */
    input(id, type) {
        const value = this.values.get(id);
        if (type === 'BOOL') {
            return (0, blocks_1.toBool)(value);
        }
        if (type === 'STRING') {
            if (value === null || value === undefined) {
                return '';
            }
            // numbers and booleans come out the same as with String(), objects as JSON
            return typeof value === 'string' ? value : JSON.stringify(value);
        }
        let number = (0, blocks_1.toNum)(value);
        if (Number.isNaN(number)) {
            if (value !== null && value !== undefined && !this.badInputs.has(id)) {
                this.badInputs.add(id);
                this.sandbox.log(`State "${id}" has the value ${JSON.stringify(value)}, which is no number - 0 is used`, 'warn');
            }
            number = 0;
        }
        return type === 'INT' ? Math.round(number) : number;
    }
    /**
     * Writes a state, but only when the value changed. With `minInterval`, writes of one state are
     * at least that many ms apart; the last value is written when the time is over.
     */
    output(id, value, ack, minInterval) {
        const output = this.outputs.get(id) || { value: undefined, ts: 0 };
        this.outputs.set(id, output);
        const target = output.pending ? output.pending.value : output.value;
        if (value === target) {
            return;
        }
        if (value === output.value) {
            // back to what was written last: nothing is left to write
            output.pending = undefined;
            if (output.timer) {
                this.sandbox.clearTimeout(output.timer);
                output.timer = null;
            }
            return;
        }
        const wait = minInterval > 0 ? output.ts + minInterval - Date.now() : 0;
        if (wait <= 0) {
            this.write(id, output, value, ack);
            return;
        }
        output.pending = { value, ack };
        output.timer ||= this.sandbox.setTimeout(() => {
            output.timer = null;
            if (output.pending) {
                this.write(id, output, output.pending.value, output.pending.ack);
            }
        }, wait);
    }
    /**
     * SCHEDULE: whether the time of the cron pattern came since the last cycle. The first call has the
     * sandbox watch the time. When it comes, a cycle runs at once - and one after it, which ends the
     * pulse, in the event mode as well.
     */
    cron(instance, pattern) {
        if (!this.schedules.has(instance)) {
            this.schedules.add(instance);
            // an invalid pattern the sandbox reports itself
            try {
                this.sandbox.schedule?.(pattern, () => {
                    instance.pending++;
                    this.collect();
                });
            }
            catch (error) {
                this.sandbox.log(`SCHEDULE: cannot use "${pattern}": ${error}`, 'warn');
            }
        }
        instance.run();
        if (instance.Q) {
            this.collect();
        }
        return instance.Q;
    }
    /**
     * ASTRO: the time of day of a sun event today, moved by `offset` minutes. Reckoned once a day. A
     * time that cannot be reckoned - the adapter has no position, the sun does not set - gives 0; the
     * sandbox says why.
     */
    astro(event, offset) {
        const now = new Date();
        const day = now.toDateString();
        if (day !== this.astroDay) {
            this.astroDay = day;
            this.astroTimes.clear();
        }
        const key = `${event}|${offset}`;
        let time = this.astroTimes.get(key);
        if (time === undefined) {
            const date = this.sandbox.getAstroDate?.(event, now.getTime());
            const ts = date ? date.getTime() : NaN;
            time = Number.isFinite(ts) ? (0, blocks_1.timeOfDay)(ts + (offset || 0) * 60000) : 0;
            this.astroTimes.set(key, time);
        }
        return time;
    }
    /** SENDTO: the text of the block to an adapter, in the fields the messengers read */
    send(instance, target, command, title) {
        if (instance.last) {
            this.sandbox.log(`SENDTO ${target}: ${instance.note()}`, 'warn');
        }
        const message = { text: instance.text, message: instance.text };
        if (title) {
            message.title = title;
            message.subject = title;
        }
        this.sandbox.sendTo?.(target, command || 'send', message);
    }
    /** NOTIFY: the text of the block as a notification of ioBroker; `alert` or `message` */
    notify(instance, category) {
        if (instance.last) {
            this.sandbox.log(`NOTIFY: ${instance.note()}`, 'warn');
        }
        this.sandbox.registerNotification?.(instance.text, category === 'alert');
    }
    write(id, output, value, ack) {
        if (output.timer) {
            this.sandbox.clearTimeout(output.timer);
            output.timer = null;
        }
        output.value = value;
        output.ts = Date.now();
        output.pending = undefined;
        this.sandbox.setState(id, value, ack);
    }
    /**
     * Reads the inputs, subscribes to them and runs the first cycle.
     *
     * @param cycle one run through all blocks
     * @param options how and when to run
     * @param signals the signals of the diagram (`S`), for the online view
     * @param breaks the breakpoints of the code (`B`), since runtime 1.2
     * @param instances the instances of the code (`I`), since runtime 1.3
     */
    start(cycle, options, signals, breaks, instances) {
        if (this.started) {
            throw new Error('The function block diagram is already running');
        }
        this.started = true;
        this.cycle = cycle;
        this.options = options;
        this.signals = signals || null;
        this.breaks = breaks && options.blocks ? breaks : null;
        this.instances = instances || null;
        // The first frame outside this file is the `rt.start()` call of the generated code. Its line
        // there, against its line in the source, gives the shift of all lines - whatever the adapter
        // put in front of the source.
        const caller = parseFrames(new Error().stack).find(frame => !isOwnFrame(frame));
        if (caller && options.lines) {
            this.scriptFile = caller.file;
            this.lineOffset = caller.line - options.lines.start;
        }
        if (this.hooks?.listen) {
            this.unlisten = this.hooks.listen(command => this.command(command));
        }
        // what an editor set before the script started again - only while it still watches
        const kept = this.hooks && this.hooks.watched() ? this.hooks.restore?.() : null;
        if (kept) {
            // a block or a signal that is gone since is left out
            for (const block of kept.breakpoints) {
                if (this.breaks && options.blocks.includes(block)) {
                    this.breakpoints.add(block);
                }
            }
            this.updateBreaks();
            for (const [signal, value] of Object.entries(kept.forced)) {
                const target = this.holderOf(signal);
                if (target && hasOwn(target.holder, target.key)) {
                    this.force(signal, value);
                }
            }
        }
        void this.init();
    }
    async init() {
        const { inputs, outputs, mode, ms } = this.options;
        await Promise.all([
            ...inputs.map(async (id) => this.values.set(id, (await this.read(id))?.val)),
            ...outputs.map(async (id) => this.outputs.set(id, { value: (await this.read(id))?.val, ts: 0 })),
        ]);
        if (this.stopped) {
            return;
        }
        for (const id of inputs) {
            this.sandbox.on({ id, change: 'ne' }, event => {
                this.values.set(id, event.state?.val);
                this.badInputs.delete(id);
                this.collect();
            });
        }
        this.lastRun = Date.now();
        this.run(true);
        if (mode === 'cyclic') {
            this.sandbox.setInterval(() => this.run(false), ms);
        }
        if (this.hooks) {
            this.sandbox.setInterval(() => this.publish(), PUBLISH_MS);
        }
    }
    async read(id) {
        try {
            return await this.sandbox.getStateAsync(id);
        }
        catch (error) {
            this.sandbox.log(`Cannot read state "${id}": ${error}`, 'warn');
            return null;
        }
    }
    /** Changes that come together run in one cycle */
    collect() {
        this.collectTimer ||= this.sandbox.setTimeout(() => {
            this.collectTimer = null;
            this.run(false);
        }, COLLECT_MS);
    }
    /**
     * The block whose line threw - the lines of `cycle()` are one block each. An error inside a user
     * block comes from a line of its factory first; the frame that counts is the one in `cycle()`,
     * the line of the instance.
     */
    blockOf(error) {
        const { lines, blocks } = this.options || {};
        if (!this.scriptFile || !lines || !blocks) {
            return undefined;
        }
        for (const frame of parseFrames(error?.stack)) {
            const index = frame.line - this.lineOffset - lines.body;
            if (frame.file === this.scriptFile && index >= 0 && index < blocks.length) {
                return blocks[index];
            }
        }
        return undefined;
    }
    run(firstScan) {
        if (this.collectTimer) {
            this.sandbox.clearTimeout(this.collectTimer);
            this.collectTimer = null;
        }
        if (this.halt) {
            // the cycles wait for the online view; the inputs are read when they go on
            return;
        }
        const now = Date.now();
        const dt = firstScan ? 0 : now - this.lastRun;
        this.lastRun = now;
        this.cycles++;
        this.scanned = true;
        const stop = this.execute(dt, firstScan, 0, -1);
        if (stop >= 0) {
            this.stopAt(stop, dt, firstScan);
            return;
        }
        const { mode, ms } = this.options;
        if (mode === 'cyclic') {
            if (Date.now() - now > ms) {
                this.overruns++;
                if (this.overruns >= OVERRUN_CYCLES && !this.overrunReported) {
                    this.overrunReported = true;
                    this.sandbox.log(`A cycle takes longer than the cycle time of ${ms} ms - consider a longer cycle time`, 'warn');
                }
            }
            else {
                this.overruns = 0;
            }
        }
    }
    /**
     * Runs the blocks from `at` on, see `CycleFunction`. Returns the block it stopped in front of, or
     * -1 when the cycle is over - also when a block failed, which ends the cycle.
     */
    execute(dt, firstScan, at, go) {
        try {
            const stop = this.cycle(dt, firstScan, at, go);
            this.lastError = '';
            this.error = null;
            return typeof stop === 'number' ? stop : -1;
        }
        catch (error) {
            // An error from the script comes from another realm, so `instanceof Error` does not work
            const message = error?.message ?? String(error);
            const blockId = this.blockOf(error);
            this.error = blockId ? { message, blockId } : { message };
            // A broken cycle would log at every run - once per error is enough. Not compared by the
            // stack: the first cycle is called from elsewhere than the ones after it.
            const key = `${blockId}|${message}`;
            if (key !== this.lastError) {
                this.lastError = key;
                this.sandbox.log(`Error in the function block diagram${blockId ? ` in block ${blockId}` : ''}: ${error?.stack || String(error)}`, 'error');
            }
            return -1;
        }
    }
    // ---- the online view: forced values, breakpoints, single steps
    /** The cycles wait in front of block `stop` of the cycle that has `dt` and `firstScan` */
    stopAt(stop, dt, firstScan) {
        this.halt = { at: stop, inCycle: true, dt, firstScan };
        this.publish();
    }
    /** A cycle started by hand: the time goes on by one cycle time - the time waited does not count */
    begin() {
        const firstScan = !this.scanned;
        this.scanned = true;
        this.cycles++;
        this.lastRun = Date.now();
        return { dt: firstScan ? 0 : this.options.ms, firstScan };
    }
    /** `all`: every block stops, for a single step */
    updateBreaks(all = false) {
        this.options?.blocks?.forEach((id, i) => {
            if (this.breaks) {
                this.breaks[i] = all || this.breakpoints.has(id) ? 1 : 0;
            }
        });
    }
    /** The signals inside an instance of a user block, by the path of the instance IDs: `b3/b7` */
    instanceAt(path) {
        let instances = this.instances;
        let signals = null;
        for (const id of path.split('/')) {
            const instance = instances && hasOwn(instances, id)
                ? instances[id]
                : undefined;
            if (!instance?.$S) {
                return null;
            }
            signals = instance.$S;
            instances = instance.$I || null;
        }
        return signals;
    }
    /** Where a signal lives: `S` of the diagram, or of the instance its path leads to */
    holderOf(signal) {
        const slash = signal.lastIndexOf('/');
        if (slash === -1) {
            return this.signals ? { holder: this.signals, key: signal } : null;
        }
        const holder = this.instanceAt(signal.substring(0, slash));
        return holder ? { holder, key: signal.substring(slash + 1) } : null;
    }
    status() {
        const status = {
            breaks: !!this.breaks,
            inside: !!this.instances,
            paused: !!this.halt,
            breakpoints: [...this.breakpoints],
            forced: Object.fromEntries(this.forced),
        };
        const at = this.halt && this.options?.blocks?.[this.halt.at];
        if (at) {
            status.at = at;
        }
        return status;
    }
    /** A command of the online view; throws when it cannot be done */
    command(command) {
        switch (command?.command) {
            case 'force':
                this.force(command.signal, command.value);
                break;
            case 'release':
                this.release(command.signal);
                break;
            case 'breakpoint':
                this.setBreakpoint(command.block, command.on);
                break;
            case 'pause':
                this.halt ||= { at: 0, inCycle: false, dt: 0, firstScan: false };
                break;
            case 'resume':
                this.resume();
                break;
            case 'step':
                this.step();
                break;
            case 'cycle':
                this.runCycle();
                break;
            default:
                throw new Error(`Unknown command ${JSON.stringify(command?.command)}`);
        }
        this.hooks?.keep?.(this.forced.size || this.breakpoints.size
            ? { breakpoints: [...this.breakpoints], forced: Object.fromEntries(this.forced) }
            : null);
        this.publish();
        return this.status();
    }
    /**
     * Holds a signal at a value. Its block still computes, but what it writes is kept aside - the
     * signal becomes a property with a getter, so the code needs nothing for it.
     */
    force(signal, value) {
        if (!this.signals) {
            throw new Error('The diagram was saved before values could be forced - save it once');
        }
        const target = this.holderOf(signal);
        if (!target || !hasOwn(target.holder, target.key)) {
            throw new Error(`Unknown signal ${signal}`);
        }
        const { holder, key } = target;
        // the value gets the type the signal has
        const current = this.forced.has(signal) ? this.computed.get(signal) : holder[key];
        let typed;
        if (typeof current === 'boolean') {
            typed = (0, blocks_1.toBool)(value);
        }
        else if (typeof current === 'number') {
            typed = (0, blocks_1.toNum)(value);
            if (Number.isNaN(typed)) {
                throw new Error(`${JSON.stringify(value)} is no number`);
            }
        }
        else {
            typed = value === null || value === undefined ? '' : String(value);
        }
        if (!this.forced.has(signal)) {
            this.computed.set(signal, holder[key]);
            Object.defineProperty(holder, key, {
                configurable: true,
                enumerable: true,
                get: () => this.forced.get(signal),
                set: (computed) => this.computed.set(signal, computed),
            });
        }
        this.forced.set(signal, typed);
        // the blocks behind it see the value in the next cycle - it comes at once
        if (this.scanned) {
            this.collect();
        }
    }
    release(signal) {
        const keys = signal === undefined ? [...this.forced.keys()] : [signal];
        let released = false;
        for (const key of keys) {
            const target = this.holderOf(key);
            if (target && this.forced.has(key)) {
                this.forced.delete(key);
                Object.defineProperty(target.holder, target.key, {
                    configurable: true,
                    enumerable: true,
                    writable: true,
                    value: this.computed.get(key),
                });
                this.computed.delete(key);
                released = true;
            }
        }
        if (released && this.scanned) {
            this.collect();
        }
    }
    setBreakpoint(block, on) {
        if (!this.breaks) {
            throw new Error('The diagram was saved before it could stop at blocks - save it once');
        }
        if (block === undefined) {
            if (!on) {
                this.breakpoints.clear();
            }
        }
        else if (!this.options.blocks.includes(block)) {
            throw new Error(`Unknown block ${block}`);
        }
        else if (on) {
            this.breakpoints.add(block);
        }
        else {
            this.breakpoints.delete(block);
        }
        this.updateBreaks();
    }
    /** Runs on: the rest of the cycle, then as usual - up to the next breakpoint */
    resume() {
        const halt = this.halt;
        if (!halt) {
            return;
        }
        this.halt = null;
        if (halt.inCycle) {
            const stop = this.execute(halt.dt, halt.firstScan, halt.at, halt.at);
            if (stop >= 0) {
                this.stopAt(stop, halt.dt, halt.firstScan);
                return;
            }
        }
        // the time waited does not count, and what came meanwhile is taken at once
        this.lastRun = Date.now();
        if (this.scanned) {
            this.run(false);
        }
    }
    /** Runs one block. Not paused yet: stops in front of the next cycle */
    step() {
        if (!this.breaks) {
            throw new Error('The diagram was saved before it could stop at blocks - save it once');
        }
        const halt = this.halt;
        if (!halt) {
            this.halt = { at: 0, inCycle: false, dt: 0, firstScan: false };
            return;
        }
        const { dt, firstScan } = halt.inCycle ? halt : this.begin();
        const at = halt.inCycle ? halt.at : 0;
        this.updateBreaks(true);
        const stop = this.execute(dt, firstScan, at, at);
        this.updateBreaks();
        if (stop >= 0) {
            this.stopAt(stop, dt, firstScan);
        }
        else {
            this.halt = { at: 0, inCycle: false, dt: 0, firstScan: false };
        }
    }
    /** Runs the rest of the cycle, or one whole cycle - up to a breakpoint. Not paused yet: pauses */
    runCycle() {
        const halt = this.halt;
        if (!halt) {
            this.halt = { at: 0, inCycle: false, dt: 0, firstScan: false };
            return;
        }
        const { dt, firstScan } = halt.inCycle ? halt : this.begin();
        const at = halt.inCycle ? halt.at : 0;
        const stop = this.execute(dt, firstScan, at, halt.inCycle ? at : -1);
        if (stop >= 0) {
            this.stopAt(stop, dt, firstScan);
        }
        else {
            this.halt = { at: 0, inCycle: false, dt: 0, firstScan: false };
        }
    }
    /** Nobody watches any more: nothing stays forced, nothing waits */
    endDebugging() {
        if (!this.forced.size && !this.breakpoints.size && !this.halt) {
            return;
        }
        this.release();
        this.breakpoints.clear();
        this.updateBreaks();
        this.hooks?.keep?.(null);
        this.sandbox.log('The online view of the diagram ended: forced values are released, breakpoints removed, the diagram runs on', 'info');
        this.resume();
    }
    /** Sends the online view what changed - only while an editor watches */
    publish() {
        if (!this.hooks || !this.options) {
            return;
        }
        const viewer = this.hooks.watched();
        if (!viewer) {
            this.sent = null;
            this.endDebugging();
            return;
        }
        const now = Date.now();
        const full = !this.sent || viewer !== this.viewer;
        if (full) {
            this.sent = new Map();
            this.viewer = viewer;
        }
        const sent = this.sent;
        // The inside of the instances an editor shows comes as well. What was sent of an instance
        // nobody looks into any more is forgotten, so it comes again in full when somebody does.
        const paths = this.instances ? this.hooks.paths?.() || [] : [];
        const pathsKey = [...paths].sort().join('|');
        if (pathsKey !== this.sentPaths) {
            for (const key of [...sent.keys()]) {
                const slash = key.lastIndexOf('/');
                if (slash !== -1 && !paths.includes(key.substring(0, slash))) {
                    sent.delete(key);
                }
            }
            this.sentPaths = pathsKey;
        }
        const groups = [
            ['', this.signals],
            ...paths.map((path) => [`${path}/`, this.instanceAt(path)]),
        ];
        const values = {};
        let changed = false;
        for (const [prefix, signals] of groups) {
            for (const [signal, value] of Object.entries(signals || {})) {
                const key = `${prefix}${signal}`;
                if (full || !sent.has(key) || !Object.is(sent.get(key), value)) {
                    values[key] = value;
                    sent.set(key, value);
                    changed = true;
                }
            }
        }
        const error = JSON.stringify(this.error);
        const errorChanged = full || error !== this.sentError;
        const status = this.status();
        const debug = JSON.stringify(status);
        const debugChanged = full || debug !== this.sentDebug;
        if (!changed && !errorChanged && !debugChanged && now - this.lastPublish < HEARTBEAT_MS) {
            return;
        }
        const snapshot = { ts: now, cycle: this.cycles, mode: this.options.mode };
        if (changed || full) {
            snapshot.values = values;
        }
        if (full) {
            snapshot.full = true;
        }
        if (errorChanged) {
            snapshot.error = this.error;
            this.sentError = error;
        }
        if (debugChanged) {
            snapshot.debug = status;
            this.sentDebug = debug;
        }
        this.lastPublish = now;
        this.hooks.publish(snapshot);
    }
}
exports.FbRuntime = FbRuntime;
/** The runtime of one diagram */
function runtime(sandbox, requiredVersion, hooks) {
    const [major, minor] = String(requiredVersion).split('.').map(Number);
    const [ownMajor, ownMinor] = exports.version.split('.').map(Number);
    if (major !== ownMajor) {
        sandbox.log(`The diagram was generated for fb-runtime ${requiredVersion}, but ${exports.version} is installed - open and save it in the editor again`, 'warn');
    }
    else if (minor > ownMinor) {
        // blocks of a newer library are missing here
        sandbox.log(`The diagram was generated for fb-runtime ${requiredVersion}, but only ${exports.version} is installed - update the adapter`, 'warn');
    }
    return new FbRuntime(sandbox, hooks);
}
/**
 * The module as one script gets it: its runtimes report to the online view of the editor through
 * `hooks`, and take its commands from there. The generated code does not have to know about the
 * online view - so the diagrams saved before it existed have most of it too.
 */
function forScript(hooks) {
    return {
        ...blocks,
        version: exports.version,
        runtime: (sandbox, requiredVersion) => runtime(sandbox, requiredVersion, hooks),
    };
}
//# sourceMappingURL=runtime.js.map