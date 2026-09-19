"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FbRuntime = exports.TP = exports.TOF = exports.TON = exports.F_TRIG = exports.R_TRIG = exports.SR = exports.RS = exports.TpBlock = exports.TofBlock = exports.TonBlock = exports.FTrigBlock = exports.RTrigBlock = exports.SrBlock = exports.RsBlock = exports.version = void 0;
exports.toBool = toBool;
exports.toNum = toNum;
exports.div = div;
exports.runtime = runtime;
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
const types_1 = require("./types");
exports.version = types_1.FB_RUNTIME_VERSION;
/** Changes of inputs that arrive within this time run in one cycle */
const COLLECT_MS = 20;
/** A cycle that took longer than the interval this many times in a row is reported once */
const OVERRUN_CYCLES = 10;
// ---- conversions
function toBool(value) {
    if (typeof value === 'string') {
        const text = value.trim().toLowerCase();
        return text === 'true' || text === 'on' || text === '1' || text === 'yes';
    }
    return !!value;
}
function toNum(value) {
    if (typeof value === 'boolean') {
        return value ? 1 : 0;
    }
    const number = typeof value === 'number' ? value : parseFloat(String(value));
    return Number.isFinite(number) ? number : NaN;
}
/** A division that gives 0 instead of Infinity or NaN for a divisor of 0 */
function div(a, b) {
    return b ? a / b : 0;
}
// ---- blocks with a state
/** Set/reset flip-flop, reset dominant */
class RsBlock {
    Q1 = false;
    run(S, R1) {
        this.Q1 = !R1 && (S || this.Q1);
    }
}
exports.RsBlock = RsBlock;
/** Set/reset flip-flop, set dominant */
class SrBlock {
    Q1 = false;
    run(S1, R) {
        this.Q1 = S1 || (!R && this.Q1);
    }
}
exports.SrBlock = SrBlock;
/**
 * Rising edge. In the first cycle an input that is already true is not an edge - it was true
 * before the script started.
 */
class RTrigBlock {
    Q = false;
    last = false;
    run(CLK, firstScan) {
        this.Q = !firstScan && CLK && !this.last;
        this.last = CLK;
    }
}
exports.RTrigBlock = RTrigBlock;
/** Falling edge */
class FTrigBlock {
    Q = false;
    last = false;
    run(CLK, firstScan) {
        this.Q = !firstScan && !CLK && this.last;
        this.last = CLK;
    }
}
exports.FTrigBlock = FTrigBlock;
/*
 * The timers count from the cycle that sees the edge, not from the one before: `dt` of that cycle
 * is mostly time in which IN still had its old value. A cycle that runs early because an input
 * changed would otherwise let the timer expire early - the time is never shorter than PT, at most
 * one cycle longer, as in any SPS.
 */
/** On delay: Q follows IN once IN was true for PT ms */
class TonBlock {
    Q = false;
    ET = 0;
    last = false;
    run(IN, PT, dt) {
        if (IN) {
            if (this.last) {
                this.ET = Math.min(this.ET + dt, PT);
            }
            this.Q = this.ET >= PT;
        }
        else {
            this.ET = 0;
            this.Q = false;
        }
        this.last = IN;
    }
}
exports.TonBlock = TonBlock;
/** Off delay: Q stays true for PT ms after IN went false */
class TofBlock {
    Q = false;
    ET = 0;
    last = false;
    run(IN, PT, dt) {
        if (IN) {
            this.ET = 0;
            this.Q = true;
        }
        else if (this.Q) {
            if (!this.last) {
                this.ET = Math.min(this.ET + dt, PT);
            }
            this.Q = this.ET < PT;
        }
        this.last = IN;
    }
}
exports.TofBlock = TofBlock;
/** Pulse: a rising edge of IN gives a pulse of PT ms, which cannot be retriggered */
class TpBlock {
    Q = false;
    ET = 0;
    last = false;
    run(IN, PT, dt) {
        if (this.Q) {
            this.ET = Math.min(this.ET + dt, PT);
            if (this.ET >= PT) {
                this.Q = false;
            }
        }
        else if (IN && !this.last) {
            this.Q = true;
            this.ET = 0;
        }
        else if (!IN && this.ET >= PT) {
            this.ET = 0;
        }
        this.last = IN;
    }
}
exports.TpBlock = TpBlock;
const RS = () => new RsBlock();
exports.RS = RS;
const SR = () => new SrBlock();
exports.SR = SR;
const R_TRIG = () => new RTrigBlock();
exports.R_TRIG = R_TRIG;
const F_TRIG = () => new FTrigBlock();
exports.F_TRIG = F_TRIG;
const TON = () => new TonBlock();
exports.TON = TON;
const TOF = () => new TofBlock();
exports.TOF = TOF;
const TP = () => new TpBlock();
exports.TP = TP;
class FbRuntime {
    sandbox;
    values = new Map();
    outputs = new Map();
    /** IDs whose value could not be converted - reported once each */
    badInputs = new Set();
    cycle = null;
    options = null;
    collectTimer = null;
    lastRun = 0;
    overruns = 0;
    overrunReported = false;
    lastError = '';
    started = false;
    stopped = false;
    constructor(sandbox) {
        this.sandbox = sandbox;
        // the sandbox removes timers and subscriptions itself; this only stops a start still reading
        sandbox.onStop(() => (this.stopped = true));
    }
    /** The value of a state, converted to the type the STATE_IN block puts out */
    input(id, type) {
        const value = this.values.get(id);
        if (type === 'BOOL') {
            return toBool(value);
        }
        if (type === 'STRING') {
            if (value === null || value === undefined) {
                return '';
            }
            // numbers and booleans come out the same as with String(), objects as JSON
            return typeof value === 'string' ? value : JSON.stringify(value);
        }
        let number = toNum(value);
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
    /** Reads the inputs, subscribes to them and runs the first cycle */
    start(cycle, options) {
        if (this.started) {
            throw new Error('The function block diagram is already running');
        }
        this.started = true;
        this.cycle = cycle;
        this.options = options;
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
    run(firstScan) {
        if (this.collectTimer) {
            this.sandbox.clearTimeout(this.collectTimer);
            this.collectTimer = null;
        }
        const now = Date.now();
        const dt = firstScan ? 0 : now - this.lastRun;
        this.lastRun = now;
        try {
            this.cycle(dt, firstScan);
            this.lastError = '';
        }
        catch (error) {
            // a broken cycle would log at every run - once per error is enough
            const message = error?.stack || String(error);
            if (message !== this.lastError) {
                this.lastError = message;
                this.sandbox.log(`Error in the function block diagram: ${message}`, 'error');
            }
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
}
exports.FbRuntime = FbRuntime;
/** The runtime of one diagram */
function runtime(sandbox, requiredVersion) {
    if (String(requiredVersion).split('.')[0] !== exports.version.split('.')[0]) {
        sandbox.log(`The diagram was generated for fb-runtime ${requiredVersion}, but ${exports.version} is installed - open and save it in the editor again`, 'warn');
    }
    return new FbRuntime(sandbox);
}
//# sourceMappingURL=runtime.js.map