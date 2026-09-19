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
import { FB_RUNTIME_VERSION } from './types';

export const version = FB_RUNTIME_VERSION;

/** Changes of inputs that arrive within this time run in one cycle */
const COLLECT_MS = 20;

/** A cycle that took longer than the interval this many times in a row is reported once */
const OVERRUN_CYCLES = 10;

// ---- conversions

export function toBool(value: unknown): boolean {
    if (typeof value === 'string') {
        const text = value.trim().toLowerCase();
        return text === 'true' || text === 'on' || text === '1' || text === 'yes';
    }
    return !!value;
}

export function toNum(value: unknown): number {
    if (typeof value === 'boolean') {
        return value ? 1 : 0;
    }
    const number = typeof value === 'number' ? value : parseFloat(String(value));
    return Number.isFinite(number) ? number : NaN;
}

/** A division that gives 0 instead of Infinity or NaN for a divisor of 0 */
export function div(a: number, b: number): number {
    return b ? a / b : 0;
}

// ---- blocks with a state

/** Set/reset flip-flop, reset dominant */
export class RsBlock {
    Q1 = false;
    run(S: boolean, R1: boolean): void {
        this.Q1 = !R1 && (S || this.Q1);
    }
}

/** Set/reset flip-flop, set dominant */
export class SrBlock {
    Q1 = false;
    run(S1: boolean, R: boolean): void {
        this.Q1 = S1 || (!R && this.Q1);
    }
}

/**
 * Rising edge. In the first cycle an input that is already true is not an edge - it was true
 * before the script started.
 */
export class RTrigBlock {
    Q = false;
    private last = false;
    run(CLK: boolean, firstScan: boolean): void {
        this.Q = !firstScan && CLK && !this.last;
        this.last = CLK;
    }
}

/** Falling edge */
export class FTrigBlock {
    Q = false;
    private last = false;
    run(CLK: boolean, firstScan: boolean): void {
        this.Q = !firstScan && !CLK && this.last;
        this.last = CLK;
    }
}

/*
 * The timers count from the cycle that sees the edge, not from the one before: `dt` of that cycle
 * is mostly time in which IN still had its old value. A cycle that runs early because an input
 * changed would otherwise let the timer expire early - the time is never shorter than PT, at most
 * one cycle longer, as in any SPS.
 */

/** On delay: Q follows IN once IN was true for PT ms */
export class TonBlock {
    Q = false;
    ET = 0;
    private last = false;
    run(IN: boolean, PT: number, dt: number): void {
        if (IN) {
            if (this.last) {
                this.ET = Math.min(this.ET + dt, PT);
            }
            this.Q = this.ET >= PT;
        } else {
            this.ET = 0;
            this.Q = false;
        }
        this.last = IN;
    }
}

/** Off delay: Q stays true for PT ms after IN went false */
export class TofBlock {
    Q = false;
    ET = 0;
    private last = false;
    run(IN: boolean, PT: number, dt: number): void {
        if (IN) {
            this.ET = 0;
            this.Q = true;
        } else if (this.Q) {
            if (!this.last) {
                this.ET = Math.min(this.ET + dt, PT);
            }
            this.Q = this.ET < PT;
        }
        this.last = IN;
    }
}

/** Pulse: a rising edge of IN gives a pulse of PT ms, which cannot be retriggered */
export class TpBlock {
    Q = false;
    ET = 0;
    private last = false;
    run(IN: boolean, PT: number, dt: number): void {
        if (this.Q) {
            this.ET = Math.min(this.ET + dt, PT);
            if (this.ET >= PT) {
                this.Q = false;
            }
        } else if (IN && !this.last) {
            this.Q = true;
            this.ET = 0;
        } else if (!IN && this.ET >= PT) {
            this.ET = 0;
        }
        this.last = IN;
    }
}

export const RS = (): RsBlock => new RsBlock();
export const SR = (): SrBlock => new SrBlock();
export const R_TRIG = (): RTrigBlock => new RTrigBlock();
export const F_TRIG = (): FTrigBlock => new FTrigBlock();
export const TON = (): TonBlock => new TonBlock();
export const TOF = (): TofBlock => new TofBlock();
export const TP = (): TpBlock => new TpBlock();

// ---- the connection to the sandbox

type Timer = ReturnType<typeof setTimeout>;

/** The functions of the script sandbox the runtime works with */
export interface FbSandbox {
    getStateAsync: (id: string) => Promise<ioBroker.State | null | undefined>;
    setState: (id: string, value: ioBroker.StateValue, ack: boolean) => void;
    on: (pattern: { id: string; change: 'ne' }, callback: (event: { state?: { val?: unknown } }) => void) => unknown;
    setInterval: (callback: () => void, ms: number) => Timer | null;
    clearInterval: (timer: Timer) => void;
    setTimeout: (callback: () => void, ms: number) => Timer | null;
    clearTimeout: (timer: Timer) => void;
    log: (message: string, severity?: 'info' | 'warn' | 'error' | 'debug') => void;
    onStop: (callback: () => void) => void;
}

export interface FbStartOptions {
    /** `cyclic`: every `ms`, and right after an input changed; `event`: only when an input changed */
    mode: 'cyclic' | 'event';
    ms: number;
    /** The states read by STATE_IN */
    inputs: string[];
    /** The states written by STATE_OUT */
    outputs: string[];
}

type SignalType = 'BOOL' | 'INT' | 'REAL' | 'STRING';

interface Output {
    value: unknown;
    ts: number;
    pending?: { value: unknown; ack: boolean };
    timer?: Timer | null;
}

export class FbRuntime {
    private readonly values = new Map<string, unknown>();
    private readonly outputs = new Map<string, Output>();
    /** IDs whose value could not be converted - reported once each */
    private readonly badInputs = new Set<string>();
    private cycle: ((dt: number, firstScan: boolean) => void) | null = null;
    private options: FbStartOptions | null = null;
    private collectTimer: Timer | null = null;
    private lastRun = 0;
    private overruns = 0;
    private overrunReported = false;
    private lastError = '';
    private started = false;
    private stopped = false;

    constructor(private readonly sandbox: FbSandbox) {
        // the sandbox removes timers and subscriptions itself; this only stops a start still reading
        sandbox.onStop(() => (this.stopped = true));
    }

    /** The value of a state, converted to the type the STATE_IN block puts out */
    input(id: string, type: SignalType): boolean | number | string {
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
                this.sandbox.log(
                    `State "${id}" has the value ${JSON.stringify(value)}, which is no number - 0 is used`,
                    'warn',
                );
            }
            number = 0;
        }
        return type === 'INT' ? Math.round(number) : number;
    }

    /**
     * Writes a state, but only when the value changed. With `minInterval`, writes of one state are
     * at least that many ms apart; the last value is written when the time is over.
     */
    output(id: string, value: unknown, ack: boolean, minInterval: number): void {
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

    private write(id: string, output: Output, value: unknown, ack: boolean): void {
        if (output.timer) {
            this.sandbox.clearTimeout(output.timer);
            output.timer = null;
        }
        output.value = value;
        output.ts = Date.now();
        output.pending = undefined;
        this.sandbox.setState(id, value as ioBroker.StateValue, ack);
    }

    /** Reads the inputs, subscribes to them and runs the first cycle */
    start(cycle: (dt: number, firstScan: boolean) => void, options: FbStartOptions): void {
        if (this.started) {
            throw new Error('The function block diagram is already running');
        }
        this.started = true;
        this.cycle = cycle;
        this.options = options;

        void this.init();
    }

    private async init(): Promise<void> {
        const { inputs, outputs, mode, ms } = this.options!;
        await Promise.all([
            ...inputs.map(async id => this.values.set(id, (await this.read(id))?.val)),
            ...outputs.map(async id => this.outputs.set(id, { value: (await this.read(id))?.val, ts: 0 })),
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

    private async read(id: string): Promise<ioBroker.State | null | undefined> {
        try {
            return await this.sandbox.getStateAsync(id);
        } catch (error: unknown) {
            this.sandbox.log(`Cannot read state "${id}": ${error as Error}`, 'warn');
            return null;
        }
    }

    /** Changes that come together run in one cycle */
    private collect(): void {
        this.collectTimer ||= this.sandbox.setTimeout(() => {
            this.collectTimer = null;
            this.run(false);
        }, COLLECT_MS);
    }

    private run(firstScan: boolean): void {
        if (this.collectTimer) {
            this.sandbox.clearTimeout(this.collectTimer);
            this.collectTimer = null;
        }
        const now = Date.now();
        const dt = firstScan ? 0 : now - this.lastRun;
        this.lastRun = now;

        try {
            this.cycle!(dt, firstScan);
            this.lastError = '';
        } catch (error: unknown) {
            // a broken cycle would log at every run - once per error is enough
            const message = (error as Error)?.stack || String(error);
            if (message !== this.lastError) {
                this.lastError = message;
                this.sandbox.log(`Error in the function block diagram: ${message}`, 'error');
            }
        }

        const { mode, ms } = this.options!;
        if (mode === 'cyclic') {
            if (Date.now() - now > ms) {
                this.overruns++;
                if (this.overruns >= OVERRUN_CYCLES && !this.overrunReported) {
                    this.overrunReported = true;
                    this.sandbox.log(
                        `A cycle takes longer than the cycle time of ${ms} ms - consider a longer cycle time`,
                        'warn',
                    );
                }
            } else {
                this.overruns = 0;
            }
        }
    }
}

/** The runtime of one diagram */
export function runtime(sandbox: FbSandbox, requiredVersion: string): FbRuntime {
    if (String(requiredVersion).split('.')[0] !== version.split('.')[0]) {
        sandbox.log(
            `The diagram was generated for fb-runtime ${requiredVersion}, but ${version} is installed - open and save it in the editor again`,
            'warn',
        );
    }
    return new FbRuntime(sandbox);
}
