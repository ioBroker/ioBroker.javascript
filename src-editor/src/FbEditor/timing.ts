/**
 * The preview of a block: a short made-up story of its inputs, run through the same block classes
 * the running diagram uses, and what came out - drawn as a timing diagram in the properties.
 */
import { fbBlocks, formatTime, parseTime, type FbBlock, type FbBlockDef, type FbValue } from '@fb-core';

export interface Trace {
    id: string;
    /** A BOOL is drawn as steps, a number as a line from `min` to `max` */
    kind: 'bool' | 'number';
    values: number[];
    min: number;
    max: number;
    /** Levels drawn across, like HIGH and LOW of a hysteresis */
    levels?: { value: number; label: string }[];
}

export interface Preview {
    /** In ms */
    duration: number;
    traces: Trace[];
    /** A time drawn as a span, like PT from the rise to the fall of the pulse: indexes of the steps */
    span?: { id: string; from: number; to: number; label: string };
}

const STEPS = 160;

/** A number of the block: its parameter, or the default of the input */
function numberOf(block: FbBlock, def: FbBlockDef, pin: string): number {
    const raw: FbValue | undefined = block.params?.[pin] ?? def.inputs.find(input => input.id === pin)?.default;
    if (def.inputs.find(input => input.id === pin)?.type === 'TIME') {
        return parseTime(raw) ?? 0;
    }
    const number = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(number) ? number : 0;
}

/** On while the time, as a part of the whole, is in one of the ranges */
function pulses(ranges: [number, number][]): (part: number) => boolean {
    return part => ranges.some(([from, to]) => part >= from && part < to);
}

function run(duration: number, step: (dt: number, part: number, first: boolean) => number[]): number[][] {
    const dt = duration / STEPS;
    const rows: number[][] = [];
    for (let i = 0; i <= STEPS; i++) {
        rows.push(step(i ? dt : 0, i / STEPS, !i));
    }
    // by trace, not by step
    return rows[0].map((_, column) => rows.map(row => row[column]));
}

/** The first step from `after` on where `values` becomes `to` */
function edge(values: number[], to: number, after = 0): number {
    for (let i = Math.max(after, 1); i < values.length; i++) {
        if (values[i] === to && values[i - 1] !== to) {
            return i;
        }
    }
    return -1;
}

function timer(type: 'TON' | 'TOF' | 'TP', block: FbBlock, def: FbBlockDef): Preview {
    const pt = numberOf(block, def, 'PT') || 1000;
    const duration = pt * 3.4;
    // parts of the whole time, in steps of PT
    const at = (times: [number, number][]): [number, number][] =>
        times.map(([from, to]) => [(from * pt) / duration, (to * pt) / duration]);
    const input = pulses(
        type === 'TON'
            ? at([
                  [0.2, 0.8],
                  [1.2, 3.1],
              ])
            : type === 'TOF'
              ? at([
                    [0.2, 0.6],
                    [2.0, 2.3],
                ])
              : at([
                    [0.2, 0.45],
                    [1.8, 3.1],
                ]),
    );
    const instance = fbBlocks[type]();
    const [IN, Q, ET] = run(duration, (dt, part) => {
        const value = input(part);
        instance.run(value, pt, dt);
        return [value ? 1 : 0, instance.Q ? 1 : 0, instance.ET];
    });

    let from: number;
    let to: number;
    if (type === 'TP') {
        from = edge(Q, 1);
        to = edge(Q, 0, from);
    } else if (type === 'TON') {
        to = edge(Q, 1);
        from = to;
        while (from > 0 && IN[from - 1] === 1) {
            from--;
        }
    } else {
        from = edge(IN, 0);
        to = edge(Q, 0, from);
    }
    return {
        duration,
        traces: [
            { id: 'IN', kind: 'bool', values: IN, min: 0, max: 1 },
            { id: 'Q', kind: 'bool', values: Q, min: 0, max: 1 },
            { id: 'ET', kind: 'number', values: ET, min: 0, max: pt },
        ],
        span: from >= 0 && to > from ? { id: 'PT', from, to, label: formatTime(pt) } : undefined,
    };
}

function edgeDetector(type: 'R_TRIG' | 'F_TRIG'): Preview {
    const clock = pulses([
        [0.1, 0.35],
        [0.55, 0.8],
    ]);
    const instance = fbBlocks[type]();
    const [CLK, Q] = run(1000, (_dt, part, first) => {
        const value = clock(part);
        instance.run(value, first);
        return [value ? 1 : 0, instance.Q ? 1 : 0];
    });
    return {
        duration: 1000,
        traces: [
            { id: 'CLK', kind: 'bool', values: CLK, min: 0, max: 1 },
            { id: 'Q', kind: 'bool', values: Q, min: 0, max: 1 },
        ],
    };
}

function flipFlop(type: 'RS' | 'SR'): Preview {
    const set = pulses([
        [0.1, 0.2],
        [0.55, 0.75],
    ]);
    // the second reset comes while set is on: the dominant one wins
    const reset = pulses([
        [0.35, 0.45],
        [0.62, 0.68],
    ]);
    const instance = fbBlocks[type]();
    const [S, R, Q1] = run(1000, (_dt, part) => {
        const s = set(part);
        const r = reset(part);
        instance.run(s, r);
        return [s ? 1 : 0, r ? 1 : 0, instance.Q1 ? 1 : 0];
    });
    return {
        duration: 1000,
        traces: [
            { id: type === 'RS' ? 'S' : 'S1', kind: 'bool', values: S, min: 0, max: 1 },
            { id: type === 'RS' ? 'R1' : 'R', kind: 'bool', values: R, min: 0, max: 1 },
            { id: 'Q1', kind: 'bool', values: Q1, min: 0, max: 1 },
        ],
    };
}

function hysteresis(block: FbBlock, def: FbBlockDef): Preview {
    let high = numberOf(block, def, 'HIGH');
    const low = numberOf(block, def, 'LOW');
    if (high <= low) {
        high = low + 1;
    }
    const middle = (high + low) / 2;
    const amplitude = (high - low) * 1.4;
    const instance = fbBlocks.HYST();
    const [IN, Q] = run(1000, (_dt, part) => {
        const value = middle + amplitude * Math.sin(part * Math.PI * 4);
        instance.run(value, high, low);
        return [value, instance.Q ? 1 : 0];
    });
    return {
        duration: 1000,
        traces: [
            {
                id: 'IN',
                kind: 'number',
                values: IN,
                min: middle - amplitude,
                max: middle + amplitude,
                levels: [
                    { value: high, label: 'HIGH' },
                    { value: low, label: 'LOW' },
                ],
            },
            { id: 'Q', kind: 'bool', values: Q, min: 0, max: 1 },
        ],
    };
}

function ramp(block: FbBlock, def: FbBlockDef): Preview {
    const up = numberOf(block, def, 'UP');
    const down = numberOf(block, def, 'DOWN');
    const height = 10;
    // long enough for both ramps to arrive
    const seconds = Math.max(up > 0 ? height / up : 1, down > 0 ? (height * 0.7) / down : 1);
    const duration = Math.min(Math.max(seconds * 2.4 * 1000, 1000), 3600000);
    const instance = fbBlocks.RAMP();
    const [IN, OUT] = run(duration, (dt, part, first) => {
        const value = part < 0.1 ? 0 : part < 0.55 ? height : height * 0.3;
        instance.run(value, up, down, dt, first);
        return [value, instance.OUT];
    });
    return {
        duration,
        traces: [
            { id: 'IN', kind: 'number', values: IN, min: 0, max: height },
            { id: 'OUT', kind: 'number', values: OUT, min: 0, max: height },
        ],
    };
}

function lowPass(block: FbBlock, def: FbBlockDef): Preview {
    const time = numberOf(block, def, 'T') || 1000;
    const duration = time * 6;
    const instance = fbBlocks.PT1();
    const [IN, OUT] = run(duration, (dt, part, first) => {
        const value = part < 0.1 ? 0 : 1;
        instance.run(value, time, dt, first);
        return [value, instance.OUT];
    });
    const from = edge(IN, 1);
    return {
        duration,
        traces: [
            { id: 'IN', kind: 'number', values: IN, min: 0, max: 1 },
            { id: 'OUT', kind: 'number', values: OUT, min: 0, max: 1, levels: [{ value: 0.632, label: '63%' }] },
        ],
        span: { id: 'T', from, to: from + Math.round((time / duration) * STEPS), label: formatTime(time) },
    };
}

/** CTU counts pulses up to PV and is reset at the end; CTD is loaded with PV and counts down below 0 */
function counter(type: 'CTU' | 'CTD', block: FbBlock, def: FbBlockDef): Preview {
    const pv = Math.round(numberOf(block, def, 'PV'));
    // one pulse more than it takes, so Q is seen - at most a handful
    const count = Math.min(Math.max(pv, 1), 8) + 1;
    const clock = pulses(
        Array.from({ length: count }, (_, k): [number, number] => {
            const from = 0.12 + (k * 0.72) / count;
            return [from, from + 0.3 / count];
        }),
    );
    // R at the end, LD at the start
    const other = pulses(type === 'CTU' ? [[0.9, 0.95]] : [[0.02, 0.07]]);
    const instance = fbBlocks[type]();
    const [C, O, CV, Q] = run(1000, (_dt, part, first) => {
        const c = clock(part);
        const o = other(part);
        instance.run(c, o, pv, first);
        return [c ? 1 : 0, o ? 1 : 0, instance.CV, instance.Q ? 1 : 0];
    });
    return {
        duration: 1000,
        traces: [
            { id: type === 'CTU' ? 'CU' : 'CD', kind: 'bool', values: C, min: 0, max: 1 },
            { id: type === 'CTU' ? 'R' : 'LD', kind: 'bool', values: O, min: 0, max: 1 },
            {
                id: 'CV',
                kind: 'number',
                values: CV,
                min: Math.min(0, ...CV),
                max: Math.max(1, pv, ...CV),
                levels: [{ value: pv, label: 'PV' }],
            },
            { id: 'Q', kind: 'bool', values: Q, min: 0, max: 1 },
        ],
    };
}

function blinker(block: FbBlock, def: FbBlockDef): Preview {
    const th = numberOf(block, def, 'TH') || 1000;
    const tl = numberOf(block, def, 'TL') || 1000;
    const duration = (th + tl) * 3.5;
    const enable = pulses([[0.08, 0.85]]);
    const instance = fbBlocks.BLINK();
    const [EN, Q] = run(duration, (dt, part) => {
        const value = enable(part);
        instance.run(value, th, tl, dt);
        return [value ? 1 : 0, instance.Q ? 1 : 0];
    });
    const from = edge(Q, 1);
    const to = edge(Q, 0, from);
    return {
        duration,
        traces: [
            { id: 'EN', kind: 'bool', values: EN, min: 0, max: 1 },
            { id: 'Q', kind: 'bool', values: Q, min: 0, max: 1 },
        ],
        span: from >= 0 && to > from ? { id: 'TH', from, to, label: formatTime(th) } : undefined,
    };
}

/** The preview of a block, or `null` for a block that has none - one without time or memory */
export function previewOf(block: FbBlock, def: FbBlockDef | undefined): Preview | null {
    if (!def || def.user) {
        return null;
    }
    switch (block.type) {
        case 'TON':
        case 'TOF':
        case 'TP':
            return timer(block.type, block, def);
        case 'R_TRIG':
        case 'F_TRIG':
            return edgeDetector(block.type);
        case 'RS':
        case 'SR':
            return flipFlop(block.type);
        case 'HYST':
            return hysteresis(block, def);
        case 'RAMP':
            return ramp(block, def);
        case 'PT1':
            return lowPass(block, def);
        case 'CTU':
        case 'CTD':
            return counter(block.type, block, def);
        case 'BLINK':
            return blinker(block, def);
        default:
            return null;
    }
}
