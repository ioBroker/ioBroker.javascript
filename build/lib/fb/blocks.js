"use strict";
/**
 * The blocks of the library that remember something, and the conversions of the generated code.
 *
 * Pure code without Node or the DOM: fb-runtime hands them to the generated code, and the editor
 * runs the same classes for the preview of a block - so the two never tell different stories.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.JS = exports.BLINK = exports.CTUD = exports.CTD = exports.CTU = exports.SCHEDULE = exports.CLOCK = exports.SENDTO = exports.NOTIFY = exports.LOG = exports.PID = exports.PT1 = exports.RAMP = exports.HYST = exports.TP = exports.TOF = exports.TON = exports.F_TRIG = exports.R_TRIG = exports.SR = exports.RS = exports.JsBlock = exports.MessageBlock = exports.MESSAGE_LIMIT = exports.LOG_LIMIT = exports.BlinkBlock = exports.CtudBlock = exports.CtdBlock = exports.CtuBlock = exports.PidBlock = exports.Pt1Block = exports.RampBlock = exports.HystBlock = exports.TpBlock = exports.TofBlock = exports.TonBlock = exports.FTrigBlock = exports.RTrigBlock = exports.SrBlock = exports.RsBlock = exports.ScheduleBlock = exports.ClockBlock = void 0;
exports.toBool = toBool;
exports.toNum = toNum;
exports.div = div;
exports.toReal = toReal;
exports.toInt = toInt;
exports.toTime = toTime;
exports.toStr = toStr;
exports.concat = concat;
exports.round = round;
exports.timeOfDay = timeOfDay;
exports.inWindow = inWindow;
exports.timeWindow = timeWindow;
const time_1 = require("./time");
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
/** A number of TO_REAL: a decimal comma counts as a point, what is no number gives 0 */
function toReal(value) {
    const number = toNum(typeof value === 'string' ? value.replace(',', '.') : value);
    return Number.isNaN(number) ? 0 : number;
}
/** A whole number of TO_INT: rounded, as REAL_TO_INT of IEC does */
function toInt(value) {
    return Math.round(toReal(value));
}
/** A time of TO_TIME: a number is ms, a text may be `2s` or `08:30` as well; what is no time gives 0 */
function toTime(value) {
    if (typeof value === 'string') {
        return (0, time_1.parseTime)(value) ?? (0, time_1.parseTime)(toReal(value)) ?? 0;
    }
    return (0, time_1.parseTime)(toReal(value)) ?? 0;
}
/** A value as text: numbers and booleans as with String(), objects as JSON */
function toStr(value) {
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
function concat(...values) {
    return values.map(toStr).join('');
}
/**
 * Rounded to `digits` decimals, 0 to 10. Through the exponent of the text, so `1.005` gives `1.01`
 * and not `1` as `Math.round(1.005 * 100) / 100` would.
 */
function round(value, digits) {
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
function timeOfDay(now = Date.now()) {
    const date = new Date(now);
    return ((date.getHours() * 60 + date.getMinutes()) * 60 + date.getSeconds()) * 1000 + date.getMilliseconds();
}
/**
 * Whether a time of day lies in the window from `start` to `end` - including the start, not the
 * end. A window with `start` after `end` goes over midnight; `start` equal to `end` is empty.
 */
function inWindow(time, start, end) {
    return start <= end ? time >= start && time < end : time >= start || time < end;
}
/** Days of TIMEWINDOW */
const DAYS = {
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
function timeWindow(start, end, days, now = Date.now()) {
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
class ClockBlock {
    TOD = 0;
    HOUR = 0;
    MIN = 0;
    WDAY = 1;
    DAY = 1;
    MONTH = 1;
    YEAR = 1970;
    run(now = Date.now()) {
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
exports.ClockBlock = ClockBlock;
/**
 * SCHEDULE: Q is true for one cycle when the time of its cron pattern comes. The runtime watches the
 * time (`rt.cron()`) and counts the times that came; a cycle takes them.
 */
class ScheduleBlock {
    Q = false;
    /** Times that came since the last cycle */
    pending = 0;
    run() {
        this.Q = this.pending > 0;
        this.pending = 0;
    }
}
exports.ScheduleBlock = ScheduleBlock;
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
// ---- control
/** Two-point switch: Q goes on when IN rises above HIGH and off when it falls below LOW */
class HystBlock {
    Q = false;
    run(IN, HIGH, LOW) {
        if (IN > HIGH) {
            this.Q = true;
        }
        else if (IN < LOW) {
            this.Q = false;
        }
    }
}
exports.HystBlock = HystBlock;
/**
 * OUT follows IN, but changes by at most UP per second upwards and DOWN per second downwards. A rate
 * of 0 or less does not limit. It starts at IN, not at 0.
 */
class RampBlock {
    OUT = 0;
    run(IN, UP, DOWN, dt, firstScan) {
        if (firstScan) {
            this.OUT = IN;
        }
        else if (IN > this.OUT) {
            this.OUT = UP > 0 ? Math.min(IN, this.OUT + (UP * dt) / 1000) : IN;
        }
        else if (IN < this.OUT) {
            this.OUT = DOWN > 0 ? Math.max(IN, this.OUT - (DOWN * dt) / 1000) : IN;
        }
    }
}
exports.RampBlock = RampBlock;
/**
 * Low pass of the first order (PT1) with the time constant T in ms. Computed with the exponential, so
 * the result does not depend on how the time is cut into cycles. It starts at IN.
 */
class Pt1Block {
    OUT = 0;
    run(IN, T, dt, firstScan) {
        if (firstScan || T <= 0) {
            this.OUT = IN;
        }
        else {
            this.OUT += (IN - this.OUT) * (1 - Math.exp(-dt / T));
        }
    }
}
exports.Pt1Block = Pt1Block;
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
class PidBlock {
    Y = 0;
    integral = 0;
    derivative = 0;
    lastPV = 0;
    run(SP, PV, KP, TN, TV, YMIN, YMAX, RST, dt, firstScan) {
        const low = Math.min(YMIN, YMAX);
        const high = Math.max(YMIN, YMAX);
        const error = SP - PV;
        const proportional = KP * error;
        if (firstScan || RST) {
            this.integral = 0;
            this.derivative = 0;
        }
        else if (dt > 0) {
            if (TV > 0) {
                const raw = (-KP * TV * (PV - this.lastPV)) / dt;
                this.derivative += (raw - this.derivative) * (1 - Math.exp(-dt / (TV / 10)));
            }
            else {
                this.derivative = 0;
            }
            if (TN > 0) {
                // anti-windup: the integral part grows up to where Y reaches a limit, not beyond
                const next = this.integral + (KP * error * dt) / TN;
                const rest = proportional + this.derivative;
                if (next > this.integral) {
                    this.integral = Math.min(next, Math.max(this.integral, high - rest));
                }
                else {
                    this.integral = Math.max(next, Math.min(this.integral, low - rest));
                }
            }
            else {
                this.integral = 0;
            }
        }
        this.lastPV = PV;
        this.Y = Math.min(high, Math.max(low, proportional + this.integral + this.derivative));
    }
}
exports.PidBlock = PidBlock;
// ---- counters
/*
 * The counters count rising edges. In the first cycle an input that is already true is no edge, as
 * with R_TRIG - it was true before the script started.
 */
/** Counts up on CU; R sets CV back to 0. Q: CV reached PV */
class CtuBlock {
    Q = false;
    CV = 0;
    last = false;
    run(CU, R, PV, firstScan) {
        if (R) {
            this.CV = 0;
        }
        else if (CU && !this.last && !firstScan) {
            this.CV++;
        }
        this.last = CU;
        this.Q = this.CV >= PV;
    }
}
exports.CtuBlock = CtuBlock;
/** Counts down on CD; LD loads PV. Q: CV reached 0 */
class CtdBlock {
    Q = true;
    CV = 0;
    last = false;
    run(CD, LD, PV, firstScan) {
        if (LD) {
            this.CV = PV;
        }
        else if (CD && !this.last && !firstScan) {
            this.CV--;
        }
        this.last = CD;
        this.Q = this.CV <= 0;
    }
}
exports.CtdBlock = CtdBlock;
/** Counts up on CU and down on CD; R sets 0 and goes before LD, which loads PV */
class CtudBlock {
    QU = false;
    QD = true;
    CV = 0;
    lastUp = false;
    lastDown = false;
    run(CU, CD, R, LD, PV, firstScan) {
        if (R) {
            this.CV = 0;
        }
        else if (LD) {
            this.CV = PV;
        }
        else if (!firstScan) {
            const up = CU && !this.lastUp;
            const down = CD && !this.lastDown;
            // both at once cancel each other out
            if (up && !down) {
                this.CV++;
            }
            else if (down && !up) {
                this.CV--;
            }
        }
        this.lastUp = CU;
        this.lastDown = CD;
        this.QU = this.CV >= PV;
        this.QD = this.CV <= 0;
    }
}
exports.CtudBlock = CtudBlock;
/**
 * Blinker: while EN is true, Q is true for TH ms and false for TL ms, beginning with true. A cycle
 * longer than both together skips the periods it missed - Q is where it would be.
 */
class BlinkBlock {
    Q = false;
    /** Time in the current phase */
    elapsed = 0;
    running = false;
    run(EN, TH, TL, dt) {
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
exports.BlinkBlock = BlinkBlock;
// ---- messages
/** Lines a LOG block writes at most within a minute */
exports.LOG_LIMIT = 20;
/** Messages a NOTIFY or SENDTO block sends at most within a minute - they reach people */
exports.MESSAGE_LIMIT = 5;
const MESSAGE_WINDOW_MS = 60000;
/**
 * A line for the log or a message: on a rising edge of TRIG (`when` = `edge`), or whenever IN changes
 * (`change`). `%s` in the text is the value of IN. Not in the first cycle - neither an edge nor a
 * change is known then.
 *
 * At most `limit` within a minute: a diagram that runs every 200 ms would flood the log or a phone
 * otherwise. The last one that may go says so. The minute counts the time of the cycles.
 */
class MessageBlock {
    limit;
    noun;
    /** The text of this cycle; valid when `run()` gave true */
    text = '';
    /** The text is the last one of this minute */
    last = false;
    lastTrig = false;
    lastValue = undefined;
    window = 0;
    count = 0;
    constructor(limit, 
    /** What it makes, for the note: `lines` or `messages` */
    noun = 'lines') {
        this.limit = limit;
        this.noun = noun;
    }
    /** The text for the log, with the note when it is the last one of the minute */
    get line() {
        return this.last ? `${this.text} (${this.note()})` : this.text;
    }
    /** Why nothing comes for the rest of the minute */
    note() {
        return `${this.limit} ${this.noun} a minute at most - more are left out until the minute is over`;
    }
    run(TRIG, IN, text, when, dt, firstScan) {
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
exports.MessageBlock = MessageBlock;
/**
 * A block with code of the user. The function gets the inputs, `dt`, `firstScan` and `state` - an
 * object that is kept from one cycle to the next. It returns the value of OUT1, or an array with the
 * values of OUT1, OUT2, ... Where it gives `undefined`, an output keeps its value.
 */
class JsBlock {
    fn;
    /** The outputs, OUT1 at 0 - they start at 0, as the signals do */
    out;
    state = {};
    constructor(fn, outputs = 1) {
        this.fn = fn;
        this.out = new Array(outputs).fill(0);
    }
    run(inputs, dt, firstScan) {
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
exports.JsBlock = JsBlock;
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
const HYST = () => new HystBlock();
exports.HYST = HYST;
const RAMP = () => new RampBlock();
exports.RAMP = RAMP;
const PT1 = () => new Pt1Block();
exports.PT1 = PT1;
const PID = () => new PidBlock();
exports.PID = PID;
const LOG = () => new MessageBlock(exports.LOG_LIMIT);
exports.LOG = LOG;
const NOTIFY = () => new MessageBlock(exports.MESSAGE_LIMIT, 'messages');
exports.NOTIFY = NOTIFY;
const SENDTO = () => new MessageBlock(exports.MESSAGE_LIMIT, 'messages');
exports.SENDTO = SENDTO;
const CLOCK = () => new ClockBlock();
exports.CLOCK = CLOCK;
const SCHEDULE = () => new ScheduleBlock();
exports.SCHEDULE = SCHEDULE;
const CTU = () => new CtuBlock();
exports.CTU = CTU;
const CTD = () => new CtdBlock();
exports.CTD = CTD;
const CTUD = () => new CtudBlock();
exports.CTUD = CTUD;
const BLINK = () => new BlinkBlock();
exports.BLINK = BLINK;
const JS = (fn, outputs) => new JsBlock(fn, outputs);
exports.JS = JS;
//# sourceMappingURL=blocks.js.map