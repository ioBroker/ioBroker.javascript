/**
 * The blocks of the library that remember something, and the conversions of the generated code.
 *
 * Pure code without Node or the DOM: fb-runtime hands them to the generated code, and the editor
 * runs the same classes for the preview of a block - so the two never tell different stories.
 */

import { parseTime } from './time';

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

/** A number of TO_REAL: a decimal comma counts as a point, what is no number gives 0 */
export function toReal(value: unknown): number {
    const number = toNum(typeof value === 'string' ? value.replace(',', '.') : value);
    return Number.isNaN(number) ? 0 : number;
}

/** A whole number of TO_INT: rounded, as REAL_TO_INT of IEC does */
export function toInt(value: unknown): number {
    return Math.round(toReal(value));
}

/** A time of TO_TIME: a number is ms, a text may be `2s` or `08:30` as well; what is no time gives 0 */
export function toTime(value: unknown): number {
    if (typeof value === 'string') {
        return parseTime(value) ?? parseTime(toReal(value)) ?? 0;
    }
    return parseTime(toReal(value)) ?? 0;
}

/** A value as text: numbers and booleans as with String(), objects as JSON */
export function toStr(value: unknown): string {
    switch (typeof value) {
        case 'string':
            return value;
        case 'number':
        case 'boolean':
            return value.toString();
        case 'undefined':
            return '';
        default:
            return value === null ? '' : JSON.stringify(value);
    }
}

/** All inputs of CONCAT as one text */
export function concat(...values: unknown[]): string {
    return values.map(toStr).join('');
}

/**
 * Rounded to `digits` decimals, 0 to 10. Through the exponent of the text, so `1.005` gives `1.01`
 * and not `1` as `Math.round(1.005 * 100) / 100` would.
 */
export function round(value: number, digits: number): number {
    const places = Math.max(0, Math.min(10, Math.round(digits) || 0));
    if (!Number.isFinite(value)) {
        return 0;
    }
    const rounded = Number(`${Math.round(Number(`${value}e${places}`))}e-${places}`);
    // a number that is written with an exponent already, like 1e-7, does not take one more
    return Number.isFinite(rounded) ? rounded : Math.round(value * 10 ** places) / 10 ** places;
}

// ---- time of day

/** The time of day in ms since the local midnight */
export function timeOfDay(now = Date.now()): number {
    const date = new Date(now);
    return ((date.getHours() * 60 + date.getMinutes()) * 60 + date.getSeconds()) * 1000 + date.getMilliseconds();
}

/**
 * Whether a time of day lies in the window from `start` to `end` - including the start, not the
 * end. A window with `start` after `end` goes over midnight; `start` equal to `end` is empty.
 */
export function inWindow(time: number, start: number, end: number): boolean {
    return start <= end ? time >= start && time < end : time >= start || time < end;
}

/** Days of TIMEWINDOW */
const DAYS: Record<string, (day: number) => boolean> = {
    all: () => true,
    // getDay(): 0 is Sunday
    weekdays: day => day >= 1 && day <= 5,
    weekend: day => day === 0 || day === 6,
};

/**
 * TIMEWINDOW: whether now is between `start` and `end` on the days `days` (`all`, `weekdays`,
 * `weekend`). A window over midnight belongs to the day it starts on: Friday 22:00 to 06:00 lasts
 * until Saturday 06:00, and Monday 00:00 to 06:00 belongs to Sunday.
 */
export function timeWindow(start: number, end: number, days: string, now = Date.now()): boolean {
    const time = timeOfDay(now);
    if (!inWindow(time, start, end)) {
        return false;
    }
    const day = new Date(now).getDay();
    const isDay = DAYS[days] || DAYS.all;
    // after midnight in a window that started the day before
    return isDay(start > end && time < end ? (day + 6) % 7 : day);
}

/** The local time, split up. WDAY counts from 1 for Monday to 7 for Sunday, as ISO 8601 does */
export class ClockBlock {
    TOD = 0;
    HOUR = 0;
    MIN = 0;
    WDAY = 1;
    DAY = 1;
    MONTH = 1;
    YEAR = 1970;
    run(now = Date.now()): void {
        const date = new Date(now);
        this.TOD = timeOfDay(now);
        this.HOUR = date.getHours();
        this.MIN = date.getMinutes();
        this.WDAY = date.getDay() || 7;
        this.DAY = date.getDate();
        this.MONTH = date.getMonth() + 1;
        this.YEAR = date.getFullYear();
    }
}

/**
 * SCHEDULE: Q is true for one cycle when the time of its cron pattern comes. The runtime watches the
 * time (`rt.cron()`) and counts the times that came; a cycle takes them.
 */
export class ScheduleBlock {
    Q = false;
    /** Times that came since the last cycle */
    pending = 0;
    run(): void {
        this.Q = this.pending > 0;
        this.pending = 0;
    }
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

// ---- control

/** Two-point switch: Q goes on when IN rises above HIGH and off when it falls below LOW */
export class HystBlock {
    Q = false;
    run(IN: number, HIGH: number, LOW: number): void {
        if (IN > HIGH) {
            this.Q = true;
        } else if (IN < LOW) {
            this.Q = false;
        }
    }
}

/**
 * OUT follows IN, but changes by at most UP per second upwards and DOWN per second downwards. A rate
 * of 0 or less does not limit. It starts at IN, not at 0.
 */
export class RampBlock {
    OUT = 0;
    run(IN: number, UP: number, DOWN: number, dt: number, firstScan: boolean): void {
        if (firstScan) {
            this.OUT = IN;
        } else if (IN > this.OUT) {
            this.OUT = UP > 0 ? Math.min(IN, this.OUT + (UP * dt) / 1000) : IN;
        } else if (IN < this.OUT) {
            this.OUT = DOWN > 0 ? Math.max(IN, this.OUT - (DOWN * dt) / 1000) : IN;
        }
    }
}

/**
 * Low pass of the first order (PT1) with the time constant T in ms. Computed with the exponential, so
 * the result does not depend on how the time is cut into cycles. It starts at IN.
 */
export class Pt1Block {
    OUT = 0;
    run(IN: number, T: number, dt: number, firstScan: boolean): void {
        if (firstScan || T <= 0) {
            this.OUT = IN;
        } else {
            this.OUT += (IN - this.OUT) * (1 - Math.exp(-dt / T));
        }
    }
}

/**
 * PID controller in the form Y = KP * (e + 1/TN * ∫e dt + TV * de/dt), with e = SP - PV and TN, TV in
 * ms; TN or TV of 0 leaves that part out.
 *
 * - The derivative is taken from PV and not from e, so a new set point gives no kick. It is smoothed
 *   with a tenth of TV - a cycle that comes early because an input changed has a small `dt`, which
 *   would make it jump.
 * - Anti-windup: while Y is at a limit, the integral part does not grow further in that direction.
 * - RST clears the integral part and holds Y at the P part.
 */
export class PidBlock {
    Y = 0;
    private integral = 0;
    private derivative = 0;
    private lastPV = 0;
    run(
        SP: number,
        PV: number,
        KP: number,
        TN: number,
        TV: number,
        YMIN: number,
        YMAX: number,
        RST: boolean,
        dt: number,
        firstScan: boolean,
    ): void {
        const low = Math.min(YMIN, YMAX);
        const high = Math.max(YMIN, YMAX);
        const error = SP - PV;
        const proportional = KP * error;

        if (firstScan || RST) {
            this.integral = 0;
            this.derivative = 0;
        } else if (dt > 0) {
            if (TV > 0) {
                const raw = (-KP * TV * (PV - this.lastPV)) / dt;
                this.derivative += (raw - this.derivative) * (1 - Math.exp(-dt / (TV / 10)));
            } else {
                this.derivative = 0;
            }
            if (TN > 0) {
                // anti-windup: the integral part grows up to where Y reaches a limit, not beyond
                const next = this.integral + (KP * error * dt) / TN;
                const rest = proportional + this.derivative;
                if (next > this.integral) {
                    this.integral = Math.min(next, Math.max(this.integral, high - rest));
                } else {
                    this.integral = Math.max(next, Math.min(this.integral, low - rest));
                }
            } else {
                this.integral = 0;
            }
        }
        this.lastPV = PV;
        this.Y = Math.min(high, Math.max(low, proportional + this.integral + this.derivative));
    }
}

// ---- counters

/*
 * The counters count rising edges. In the first cycle an input that is already true is no edge, as
 * with R_TRIG - it was true before the script started.
 */

/** Counts up on CU; R sets CV back to 0. Q: CV reached PV */
export class CtuBlock {
    Q = false;
    CV = 0;
    private last = false;
    run(CU: boolean, R: boolean, PV: number, firstScan: boolean): void {
        if (R) {
            this.CV = 0;
        } else if (CU && !this.last && !firstScan) {
            this.CV++;
        }
        this.last = CU;
        this.Q = this.CV >= PV;
    }
}

/** Counts down on CD; LD loads PV. Q: CV reached 0 */
export class CtdBlock {
    Q = true;
    CV = 0;
    private last = false;
    run(CD: boolean, LD: boolean, PV: number, firstScan: boolean): void {
        if (LD) {
            this.CV = PV;
        } else if (CD && !this.last && !firstScan) {
            this.CV--;
        }
        this.last = CD;
        this.Q = this.CV <= 0;
    }
}

/** Counts up on CU and down on CD; R sets 0 and goes before LD, which loads PV */
export class CtudBlock {
    QU = false;
    QD = true;
    CV = 0;
    private lastUp = false;
    private lastDown = false;
    run(CU: boolean, CD: boolean, R: boolean, LD: boolean, PV: number, firstScan: boolean): void {
        if (R) {
            this.CV = 0;
        } else if (LD) {
            this.CV = PV;
        } else if (!firstScan) {
            const up = CU && !this.lastUp;
            const down = CD && !this.lastDown;
            // both at once cancel each other out
            if (up && !down) {
                this.CV++;
            } else if (down && !up) {
                this.CV--;
            }
        }
        this.lastUp = CU;
        this.lastDown = CD;
        this.QU = this.CV >= PV;
        this.QD = this.CV <= 0;
    }
}

/**
 * Blinker: while EN is true, Q is true for TH ms and false for TL ms, beginning with true. A cycle
 * longer than both together skips the periods it missed - Q is where it would be.
 */
export class BlinkBlock {
    Q = false;
    /** Time in the current phase */
    private elapsed = 0;
    private running = false;
    run(EN: boolean, TH: number, TL: number, dt: number): void {
        if (!EN) {
            this.Q = false;
            this.running = false;
            return;
        }
        if (!this.running) {
            this.running = true;
            this.Q = true;
            this.elapsed = 0;
            return;
        }
        this.elapsed += dt;
        const period = TH + TL;
        if (period > 0 && this.elapsed >= period) {
            this.elapsed %= period;
        }
        // with the rest of a period left, at most one phase ends; with a period of 0, Q turns every cycle
        const phase = this.Q ? TH : TL;
        if (this.elapsed >= phase) {
            this.elapsed -= phase;
            this.Q = !this.Q;
        }
    }
}

// ---- messages

/** Lines a LOG block writes at most within a minute */
export const LOG_LIMIT = 20;
/** Messages a NOTIFY or SENDTO block sends at most within a minute - they reach people */
export const MESSAGE_LIMIT = 5;
const MESSAGE_WINDOW_MS = 60000;

/**
 * A line for the log or a message: on a rising edge of TRIG (`when` = `edge`), or whenever IN changes
 * (`change`). `%s` in the text is the value of IN. Not in the first cycle - neither an edge nor a
 * change is known then.
 *
 * At most `limit` within a minute: a diagram that runs every 200 ms would flood the log or a phone
 * otherwise. The last one that may go says so. The minute counts the time of the cycles.
 */
export class MessageBlock {
    /** The text of this cycle; valid when `run()` gave true */
    text = '';
    /** The text is the last one of this minute */
    last = false;
    private lastTrig = false;
    private lastValue: unknown = undefined;
    private window = 0;
    private count = 0;

    constructor(
        readonly limit: number,
        /** What it makes, for the note: `lines` or `messages` */
        private readonly noun = 'lines',
    ) {}

    /** The text for the log, with the note when it is the last one of the minute */
    get line(): string {
        return this.last ? `${this.text} (${this.note()})` : this.text;
    }

    /** Why nothing comes for the rest of the minute */
    note(): string {
        return `${this.limit} ${this.noun} a minute at most - more are left out until the minute is over`;
    }

    run(TRIG: boolean, IN: unknown, text: string, when: string, dt: number, firstScan: boolean): boolean {
        this.window += dt;
        if (this.window >= MESSAGE_WINDOW_MS) {
            this.window = 0;
            this.count = 0;
        }
        const fire = !firstScan && (when === 'change' ? !Object.is(IN, this.lastValue) : TRIG && !this.lastTrig);
        this.lastTrig = TRIG;
        this.lastValue = IN;
        if (!fire || this.count >= this.limit) {
            return false;
        }
        this.count++;
        this.text = text.includes('%s')
            ? text.split('%s').join(IN === undefined || IN === null ? String(IN) : toStr(IN))
            : text;
        this.last = this.count === this.limit;
        return true;
    }
}

// ---- expert

/** The function of a JS block: its inputs, then `dt`, `firstScan` and `state` */
export type JsFunction = (...args: unknown[]) => unknown;

/**
 * A block with code of the user. The function gets the inputs, `dt`, `firstScan` and `state` - an
 * object that is kept from one cycle to the next. It returns the value of OUT1, or an array with the
 * values of OUT1, OUT2, ... Where it gives `undefined`, an output keeps its value.
 */
export class JsBlock {
    /** The outputs, OUT1 at 0 - they start at 0, as the signals do */
    readonly out: unknown[];
    readonly state: Record<string, unknown> = {};

    constructor(
        private readonly fn: JsFunction,
        outputs = 1,
    ) {
        this.out = new Array(outputs).fill(0);
    }

    run(inputs: unknown[], dt: number, firstScan: boolean): void {
        const result = this.fn(...inputs, dt, firstScan, this.state);
        const values = Array.isArray(result) ? result : [result];
        values.forEach((value, i) => {
            if (value !== undefined) {
                // more values than outputs are left out
                if (i < this.out.length) {
                    this.out[i] = value;
                }
            }
        });
    }
}

export const RS = (): RsBlock => new RsBlock();
export const SR = (): SrBlock => new SrBlock();
export const R_TRIG = (): RTrigBlock => new RTrigBlock();
export const F_TRIG = (): FTrigBlock => new FTrigBlock();
export const TON = (): TonBlock => new TonBlock();
export const TOF = (): TofBlock => new TofBlock();
export const TP = (): TpBlock => new TpBlock();
export const HYST = (): HystBlock => new HystBlock();
export const RAMP = (): RampBlock => new RampBlock();
export const PT1 = (): Pt1Block => new Pt1Block();
export const PID = (): PidBlock => new PidBlock();
export const LOG = (): MessageBlock => new MessageBlock(LOG_LIMIT);
export const NOTIFY = (): MessageBlock => new MessageBlock(MESSAGE_LIMIT, 'messages');
export const SENDTO = (): MessageBlock => new MessageBlock(MESSAGE_LIMIT, 'messages');
export const CLOCK = (): ClockBlock => new ClockBlock();
export const SCHEDULE = (): ScheduleBlock => new ScheduleBlock();
export const CTU = (): CtuBlock => new CtuBlock();
export const CTD = (): CtdBlock => new CtdBlock();
export const CTUD = (): CtudBlock => new CtudBlock();
export const BLINK = (): BlinkBlock => new BlinkBlock();
export const JS = (fn: JsFunction, outputs?: number): JsBlock => new JsBlock(fn, outputs);
