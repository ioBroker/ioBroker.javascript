import type { FbBlock, FbBlockDef, FbCategory, FbSignalType, FbUserBlock } from './types';

/** The events of the sun ASTRO knows, in the order of a day - the names of `getAstroDate()` */
export const FB_ASTRO_EVENTS = [
    'nightEnd',
    'nauticalDawn',
    'dawn',
    'sunrise',
    'sunriseEnd',
    'goldenHourEnd',
    'solarNoon',
    'goldenHour',
    'sunsetStart',
    'sunset',
    'dusk',
    'nauticalDusk',
    'night',
    'nadir',
];

/**
 * The blocks of the library: logic, memory (flip-flops, edges), timers, counters, comparison,
 * arithmetic, conversion, control, calendar, messages, a block with code, and the ioBroker states.
 *
 * Type names follow IEC 61131-3. The editor translates the names of the categories, the types
 * stay as they are - they are what SPS users look for.
 */
export const FB_LIBRARY: FbBlockDef[] = [
    // ---- logic
    {
        type: 'AND',
        category: 'logic',
        inputs: [],
        outputs: [{ id: 'OUT', type: 'BOOL' }],
        // an open input of an AND must not block it
        extensible: { prefix: 'IN', type: 'BOOL', default: true, min: 2, max: 16 },
        code: '{OUT} = {IN*: && };',
    },
    {
        type: 'OR',
        category: 'logic',
        inputs: [],
        outputs: [{ id: 'OUT', type: 'BOOL' }],
        extensible: { prefix: 'IN', type: 'BOOL', default: false, min: 2, max: 16 },
        code: '{OUT} = {IN*: || };',
    },
    {
        type: 'XOR',
        category: 'logic',
        inputs: [],
        outputs: [{ id: 'OUT', type: 'BOOL' }],
        // true for an odd number of true inputs, like a chain of XOR gates
        extensible: { prefix: 'IN', type: 'BOOL', default: false, min: 2, max: 16 },
        code: '{OUT} = {IN*: !== };',
    },
    {
        type: 'NOT',
        category: 'logic',
        inputs: [{ id: 'IN', type: 'BOOL', default: false }],
        outputs: [{ id: 'OUT', type: 'BOOL' }],
        code: '{OUT} = !{IN};',
    },
    {
        type: 'RS',
        category: 'memory',
        inputs: [
            { id: 'S', type: 'BOOL', default: false },
            { id: 'R1', type: 'BOOL', default: false },
        ],
        outputs: [{ id: 'Q1', type: 'BOOL' }],
        stateful: true,
        code: '{I}.run({S}, {R1}); {Q1} = {I}.Q1;',
    },
    {
        type: 'SR',
        category: 'memory',
        inputs: [
            { id: 'S1', type: 'BOOL', default: false },
            { id: 'R', type: 'BOOL', default: false },
        ],
        outputs: [{ id: 'Q1', type: 'BOOL' }],
        stateful: true,
        code: '{I}.run({S1}, {R}); {Q1} = {I}.Q1;',
    },
    {
        type: 'R_TRIG',
        category: 'memory',
        inputs: [{ id: 'CLK', type: 'BOOL', default: false }],
        outputs: [{ id: 'Q', type: 'BOOL' }],
        stateful: true,
        code: '{I}.run({CLK}, firstScan); {Q} = {I}.Q;',
    },
    {
        type: 'F_TRIG',
        category: 'memory',
        inputs: [{ id: 'CLK', type: 'BOOL', default: false }],
        outputs: [{ id: 'Q', type: 'BOOL' }],
        stateful: true,
        code: '{I}.run({CLK}, firstScan); {Q} = {I}.Q;',
    },

    // ---- timers
    {
        type: 'TON',
        category: 'timers',
        inputs: [
            { id: 'IN', type: 'BOOL', default: false },
            { id: 'PT', type: 'TIME', param: true, default: 1000 },
        ],
        outputs: [
            { id: 'Q', type: 'BOOL' },
            { id: 'ET', type: 'TIME' },
        ],
        stateful: true,
        timeDependent: true,
        code: '{I}.run({IN}, {PT}, dt); {Q} = {I}.Q; {ET} = {I}.ET;',
    },
    {
        type: 'TOF',
        category: 'timers',
        inputs: [
            { id: 'IN', type: 'BOOL', default: false },
            { id: 'PT', type: 'TIME', param: true, default: 1000 },
        ],
        outputs: [
            { id: 'Q', type: 'BOOL' },
            { id: 'ET', type: 'TIME' },
        ],
        stateful: true,
        timeDependent: true,
        code: '{I}.run({IN}, {PT}, dt); {Q} = {I}.Q; {ET} = {I}.ET;',
    },
    {
        type: 'TP',
        category: 'timers',
        inputs: [
            { id: 'IN', type: 'BOOL', default: false },
            { id: 'PT', type: 'TIME', param: true, default: 1000 },
        ],
        outputs: [
            { id: 'Q', type: 'BOOL' },
            { id: 'ET', type: 'TIME' },
        ],
        stateful: true,
        timeDependent: true,
        code: '{I}.run({IN}, {PT}, dt); {Q} = {I}.Q; {ET} = {I}.ET;',
    },
    {
        // blinker: TH ms on, TL ms off, while EN is true
        type: 'BLINK',
        category: 'timers',
        inputs: [
            { id: 'EN', type: 'BOOL', default: true },
            { id: 'TH', type: 'TIME', param: true, default: 1000 },
            { id: 'TL', type: 'TIME', param: true, default: 1000 },
        ],
        outputs: [{ id: 'Q', type: 'BOOL' }],
        stateful: true,
        timeDependent: true,
        code: '{I}.run({EN}, {TH}, {TL}, dt); {Q} = {I}.Q;',
    },

    // ---- counters
    {
        type: 'CTU',
        category: 'counters',
        inputs: [
            { id: 'CU', type: 'BOOL', default: false },
            { id: 'R', type: 'BOOL', default: false },
            { id: 'PV', type: 'INT', param: true, default: 10 },
        ],
        outputs: [
            { id: 'Q', type: 'BOOL' },
            { id: 'CV', type: 'INT' },
        ],
        stateful: true,
        code: '{I}.run({CU}, {R}, {PV}, firstScan); {Q} = {I}.Q; {CV} = {I}.CV;',
    },
    {
        type: 'CTD',
        category: 'counters',
        inputs: [
            { id: 'CD', type: 'BOOL', default: false },
            { id: 'LD', type: 'BOOL', default: false },
            { id: 'PV', type: 'INT', param: true, default: 10 },
        ],
        outputs: [
            { id: 'Q', type: 'BOOL' },
            { id: 'CV', type: 'INT' },
        ],
        stateful: true,
        code: '{I}.run({CD}, {LD}, {PV}, firstScan); {Q} = {I}.Q; {CV} = {I}.CV;',
    },
    {
        type: 'CTUD',
        category: 'counters',
        inputs: [
            { id: 'CU', type: 'BOOL', default: false },
            { id: 'CD', type: 'BOOL', default: false },
            { id: 'R', type: 'BOOL', default: false },
            { id: 'LD', type: 'BOOL', default: false },
            { id: 'PV', type: 'INT', param: true, default: 10 },
        ],
        outputs: [
            { id: 'QU', type: 'BOOL' },
            { id: 'QD', type: 'BOOL' },
            { id: 'CV', type: 'INT' },
        ],
        stateful: true,
        code: '{I}.run({CU}, {CD}, {R}, {LD}, {PV}, firstScan); {QU} = {I}.QU; {QD} = {I}.QD; {CV} = {I}.CV;',
    },

    // ---- comparison
    ...(
        [
            ['GT', '>'],
            ['GE', '>='],
            ['LT', '<'],
            ['LE', '<='],
        ] as const
    ).map(([type, operator]): FbBlockDef => ({
        type,
        category: 'compare',
        inputs: [
            { id: 'IN1', type: 'REAL', default: 0 },
            { id: 'IN2', type: 'REAL', default: 0 },
        ],
        outputs: [{ id: 'OUT', type: 'BOOL' }],
        code: `{OUT} = {IN1} ${operator} {IN2};`,
    })),
    ...(
        [
            ['EQ', '==='],
            ['NE', '!=='],
        ] as const
    ).map(([type, operator]): FbBlockDef => ({
        type,
        category: 'compare',
        inputs: [
            { id: 'IN1', type: 'ANY', default: 0 },
            { id: 'IN2', type: 'ANY', default: 0 },
        ],
        outputs: [{ id: 'OUT', type: 'BOOL' }],
        code: `{OUT} = {IN1} ${operator} {IN2};`,
    })),

    // ---- arithmetic
    {
        type: 'ADD',
        category: 'arithmetic',
        inputs: [],
        outputs: [{ id: 'OUT', type: 'REAL' }],
        extensible: { prefix: 'IN', type: 'REAL', default: 0, min: 2, max: 16 },
        code: '{OUT} = {IN*: + };',
    },
    {
        type: 'MUL',
        category: 'arithmetic',
        inputs: [],
        outputs: [{ id: 'OUT', type: 'REAL' }],
        extensible: { prefix: 'IN', type: 'REAL', default: 1, min: 2, max: 16 },
        code: '{OUT} = {IN*: * };',
    },
    {
        type: 'SUB',
        category: 'arithmetic',
        inputs: [
            { id: 'IN1', type: 'REAL', default: 0 },
            { id: 'IN2', type: 'REAL', default: 0 },
        ],
        outputs: [{ id: 'OUT', type: 'REAL' }],
        code: '{OUT} = {IN1} - {IN2};',
    },
    {
        type: 'DIV',
        category: 'arithmetic',
        inputs: [
            { id: 'IN1', type: 'REAL', default: 0 },
            { id: 'IN2', type: 'REAL', default: 1 },
        ],
        outputs: [{ id: 'OUT', type: 'REAL' }],
        // a division by zero gives 0 instead of Infinity, which no state could store
        code: '{OUT} = fb.div({IN1}, {IN2});',
    },
    {
        type: 'MIN',
        category: 'arithmetic',
        inputs: [],
        outputs: [{ id: 'OUT', type: 'REAL' }],
        extensible: { prefix: 'IN', type: 'REAL', default: 0, min: 2, max: 16 },
        code: '{OUT} = Math.min({IN*:, });',
    },
    {
        type: 'MAX',
        category: 'arithmetic',
        inputs: [],
        outputs: [{ id: 'OUT', type: 'REAL' }],
        extensible: { prefix: 'IN', type: 'REAL', default: 0, min: 2, max: 16 },
        code: '{OUT} = Math.max({IN*:, });',
    },
    {
        type: 'ROUND',
        category: 'arithmetic',
        inputs: [
            { id: 'IN', type: 'REAL', default: 0 },
            // decimals, 0 to 10
            { id: 'DIGITS', type: 'INT', param: true, default: 0 },
        ],
        outputs: [{ id: 'OUT', type: 'REAL' }],
        code: '{OUT} = fb.round({IN}, {DIGITS});',
    },

    // ---- conversion: from whatever comes in
    ...(
        [
            ['TO_BOOL', 'BOOL', 'toBool'],
            ['TO_INT', 'INT', 'toInt'],
            ['TO_REAL', 'REAL', 'toReal'],
            ['TO_TIME', 'TIME', 'toTime'],
            ['TO_STRING', 'STRING', 'toStr'],
        ] as const
    ).map(([type, output, convert]): FbBlockDef => ({
        type,
        category: 'convert',
        inputs: [{ id: 'IN', type: 'ANY', default: output === 'STRING' ? '' : 0 }],
        outputs: [{ id: 'OUT', type: output }],
        code: `{OUT} = fb.${convert}({IN});`,
    })),
    {
        // the texts of the inputs one after the other - numbers as they are, use ROUND before
        type: 'CONCAT',
        category: 'convert',
        inputs: [],
        outputs: [{ id: 'OUT', type: 'STRING' }],
        extensible: { prefix: 'IN', type: 'ANY', default: '', min: 2, max: 16 },
        code: '{OUT} = fb.concat({IN*:, });',
    },

    // ---- control
    {
        // two-point switch: on above HIGH, off below LOW, as it was in between
        type: 'HYST',
        category: 'control',
        inputs: [
            { id: 'IN', type: 'REAL', default: 0 },
            { id: 'HIGH', type: 'REAL', param: true, default: 1 },
            { id: 'LOW', type: 'REAL', param: true, default: 0 },
        ],
        outputs: [{ id: 'Q', type: 'BOOL' }],
        stateful: true,
        code: '{I}.run({IN}, {HIGH}, {LOW}); {Q} = {I}.Q;',
    },
    {
        // follows IN, but changes by at most UP or DOWN per second; 0 means without limit
        type: 'RAMP',
        category: 'control',
        inputs: [
            { id: 'IN', type: 'REAL', default: 0 },
            { id: 'UP', type: 'REAL', param: true, default: 1 },
            { id: 'DOWN', type: 'REAL', param: true, default: 1 },
        ],
        outputs: [{ id: 'OUT', type: 'REAL' }],
        stateful: true,
        timeDependent: true,
        code: '{I}.run({IN}, {UP}, {DOWN}, dt, firstScan); {OUT} = {I}.OUT;',
    },
    {
        // low pass of the first order: OUT follows IN with the time constant T
        type: 'PT1',
        category: 'control',
        inputs: [
            { id: 'IN', type: 'REAL', default: 0 },
            { id: 'T', type: 'TIME', param: true, default: 10000 },
        ],
        outputs: [{ id: 'OUT', type: 'REAL' }],
        stateful: true,
        timeDependent: true,
        code: '{I}.run({IN}, {T}, dt, firstScan); {OUT} = {I}.OUT;',
    },
    {
        // PID controller: set point SP, process value PV, output Y within YMIN..YMAX
        type: 'PID',
        category: 'control',
        inputs: [
            { id: 'SP', type: 'REAL', default: 0 },
            { id: 'PV', type: 'REAL', default: 0 },
            { id: 'KP', type: 'REAL', param: true, default: 1 },
            // reset time of the integral part, 0: none
            { id: 'TN', type: 'TIME', param: true, default: 0 },
            // derivative time, 0: none
            { id: 'TV', type: 'TIME', param: true, default: 0 },
            { id: 'YMIN', type: 'REAL', param: true, default: 0 },
            { id: 'YMAX', type: 'REAL', param: true, default: 100 },
            { id: 'RST', type: 'BOOL', default: false },
        ],
        outputs: [{ id: 'Y', type: 'REAL' }],
        stateful: true,
        timeDependent: true,
        code: '{I}.run({SP}, {PV}, {KP}, {TN}, {TV}, {YMIN}, {YMAX}, {RST}, dt, firstScan); {Y} = {I}.Y;',
    },

    // ---- ioBroker
    {
        type: 'STATE_IN',
        category: 'iobroker',
        inputs: [],
        outputs: [{ id: 'Q', type: { param: 'type' } }],
        params: [
            { id: 'oid', type: 'OID', required: true },
            { id: 'type', type: 'ENUM', options: ['BOOL', 'INT', 'REAL', 'STRING'], default: 'REAL' },
        ],
        code: '{Q} = rt.input({$oid}, {$type});',
    },
    {
        type: 'STATE_OUT',
        category: 'iobroker',
        inputs: [{ id: 'IN', type: 'ANY', default: false }],
        outputs: [],
        params: [
            { id: 'oid', type: 'OID', required: true },
            { id: 'ack', type: 'BOOL', default: false },
            // at most one write per this many ms - the last value is written when it is over
            { id: 'minInterval', type: 'TIME', default: 0 },
        ],
        code: 'rt.output({$oid}, {IN}, {$ack}, {$minInterval});',
    },
    {
        type: 'CONST',
        category: 'iobroker',
        inputs: [],
        outputs: [{ id: 'Q', type: { param: 'type' } }],
        params: [
            { id: 'type', type: 'ENUM', options: ['BOOL', 'INT', 'REAL', 'TIME', 'STRING'], default: 'REAL' },
            { id: 'value', type: { param: 'type' }, default: 0 },
        ],
        code: '{Q} = {$value};',
    },

    // ---- calendar
    {
        // the local time, split up; WDAY: 1 Monday ... 7 Sunday
        type: 'CLOCK',
        category: 'calendar',
        inputs: [],
        outputs: [
            { id: 'TOD', type: 'TIME', clock: true },
            { id: 'HOUR', type: 'INT' },
            { id: 'MIN', type: 'INT' },
            { id: 'WDAY', type: 'INT' },
            { id: 'DAY', type: 'INT' },
            { id: 'MONTH', type: 'INT' },
            { id: 'YEAR', type: 'INT' },
        ],
        stateful: true,
        timeDependent: true,
        code:
            '{I}.run(); {TOD} = {I}.TOD; {HOUR} = {I}.HOUR; {MIN} = {I}.MIN; {WDAY} = {I}.WDAY; ' +
            '{DAY} = {I}.DAY; {MONTH} = {I}.MONTH; {YEAR} = {I}.YEAR;',
    },
    {
        // true from START to END on the chosen days; a window over midnight belongs to the day it starts
        type: 'TIMEWINDOW',
        category: 'calendar',
        inputs: [
            { id: 'START', type: 'TIME', param: true, default: 8 * 3600000, clock: true },
            { id: 'END', type: 'TIME', param: true, default: 22 * 3600000, clock: true },
        ],
        outputs: [{ id: 'Q', type: 'BOOL' }],
        params: [{ id: 'days', type: 'ENUM', options: ['all', 'weekdays', 'weekend'], default: 'all' }],
        timeDependent: true,
        code: '{Q} = fb.timeWindow({START}, {END}, {$days});',
    },
    {
        // a pulse of one cycle when the time of the cron pattern comes
        type: 'SCHEDULE',
        category: 'calendar',
        inputs: [],
        outputs: [{ id: 'Q', type: 'BOOL' }],
        params: [{ id: 'cron', type: 'CRON', default: '0 8 * * *', required: true }],
        stateful: true,
        code: '{Q} = rt.cron({I}, {$cron});',
    },
    {
        // true from one sun event to another, like from sunset to sunrise; the offsets are minutes
        type: 'ASTRO',
        category: 'calendar',
        inputs: [],
        outputs: [
            { id: 'Q', type: 'BOOL' },
            { id: 'START', type: 'TIME', clock: true },
            { id: 'END', type: 'TIME', clock: true },
        ],
        params: [
            { id: 'start', type: 'ENUM', options: FB_ASTRO_EVENTS, default: 'sunset' },
            { id: 'startOffset', type: 'INT', default: 0 },
            { id: 'end', type: 'ENUM', options: FB_ASTRO_EVENTS, default: 'sunrise' },
            { id: 'endOffset', type: 'INT', default: 0 },
        ],
        timeDependent: true,
        code:
            '{START} = rt.astro({$start}, {$startOffset}); {END} = rt.astro({$end}, {$endOffset}); ' +
            '{Q} = fb.inWindow(fb.timeOfDay(), {START}, {END});',
    },

    // ---- messages
    {
        // a line in the log of ioBroker - `log()` is the one of the script sandbox
        type: 'LOG',
        category: 'messages',
        inputs: [
            { id: 'TRIG', type: 'BOOL', default: false },
            { id: 'IN', type: 'ANY', default: '' },
        ],
        outputs: [],
        params: [
            { id: 'text', type: 'STRING', default: '%s' },
            { id: 'level', type: 'ENUM', options: ['info', 'warn', 'error', 'debug'], default: 'info' },
            { id: 'when', type: 'ENUM', options: ['edge', 'change'], default: 'edge' },
        ],
        stateful: true,
        code: 'if ({I}.run({TRIG}, {IN}, {$text}, {$when}, dt, firstScan)) log({I}.line, {$level});',
    },
    {
        // a message in the notifications of ioBroker, as an information or as an alert
        type: 'NOTIFY',
        category: 'messages',
        inputs: [
            { id: 'TRIG', type: 'BOOL', default: false },
            { id: 'IN', type: 'ANY', default: '' },
        ],
        outputs: [],
        params: [
            { id: 'text', type: 'STRING', default: '%s' },
            { id: 'category', type: 'ENUM', options: ['message', 'alert'], default: 'message' },
            { id: 'when', type: 'ENUM', options: ['edge', 'change'], default: 'edge' },
        ],
        stateful: true,
        code: 'if ({I}.run({TRIG}, {IN}, {$text}, {$when}, dt, firstScan)) rt.notify({I}, {$category});',
    },
    {
        // a message to an adapter, like telegram.0 or pushover.0: `{ text, message, title, subject }`
        type: 'SENDTO',
        category: 'messages',
        inputs: [
            { id: 'TRIG', type: 'BOOL', default: false },
            { id: 'IN', type: 'ANY', default: '' },
        ],
        outputs: [],
        params: [
            { id: 'instance', type: 'INSTANCE', required: true },
            { id: 'text', type: 'STRING', default: '%s' },
            { id: 'title', type: 'STRING', default: '' },
            { id: 'command', type: 'STRING', default: 'send' },
            { id: 'when', type: 'ENUM', options: ['edge', 'change'], default: 'edge' },
        ],
        stateful: true,
        code: 'if ({I}.run({TRIG}, {IN}, {$text}, {$when}, dt, firstScan)) rt.send({I}, {$instance}, {$command}, {$title});',
    },

    // ---- expert
    {
        // code of the user: gets IN1..INn, dt, firstScan and state, returns OUT1 or [OUT1, OUT2, ...]
        type: 'JS',
        category: 'expert',
        inputs: [],
        outputs: [],
        extensible: { prefix: 'IN', type: 'ANY', default: 0, min: 0, max: 8, count: 2 },
        extensibleOutputs: { prefix: 'OUT', type: 'ANY', min: 1, max: 8 },
        params: [{ id: 'code', type: 'CODE', default: 'return IN1;' }],
        stateful: true,
        // written by the generator itself: the code becomes a function of the script
        code: '',
    },

    // ---- the pins of a user block, only in the diagram of a block
    {
        type: 'FB_IN',
        category: 'interface',
        inputs: [],
        outputs: [{ id: 'Q', type: { param: 'type' } }],
        params: [
            { id: 'pin', type: 'NAME', required: true },
            { id: 'type', type: 'ENUM', options: ['BOOL', 'INT', 'REAL', 'TIME', 'STRING'], default: 'BOOL' },
            // what the input of an instance gets while it is not connected
            { id: 'value', type: { param: 'type' }, default: false },
        ],
        code: '{Q} = self[{$pin}];',
    },
    {
        type: 'FB_OUT',
        category: 'interface',
        inputs: [{ id: 'IN', type: { param: 'type' }, default: false }],
        outputs: [],
        params: [
            { id: 'pin', type: 'NAME', required: true },
            { id: 'type', type: 'ENUM', options: ['BOOL', 'INT', 'REAL', 'TIME', 'STRING'], default: 'BOOL' },
        ],
        code: 'self[{$pin}] = {IN};',
    },
];

/** The categories in the order of the palette */
export const FB_CATEGORIES: FbCategory[] = [
    'iobroker',
    'logic',
    'memory',
    'timers',
    'counters',
    'compare',
    'arithmetic',
    'convert',
    'control',
    'calendar',
    'messages',
    'expert',
];

const byType = new Map(FB_LIBRARY.map(def => [def.type, def]));

const SIGNAL_TYPES: FbSignalType[] = ['BOOL', 'INT', 'REAL', 'TIME', 'STRING'];

/** The FB_IN or FB_OUT blocks of a user block that make its pins, from top to bottom */
export function getTerminals(user: FbUserBlock, type: 'FB_IN' | 'FB_OUT'): FbBlock[] {
    return user.graph.blocks
        .filter(block => block.type === type && typeof block.params?.pin === 'string' && block.params.pin)
        .sort((a, b) => a.pos[1] - b.pos[1] || a.pos[0] - b.pos[0]);
}

function terminalType(block: FbBlock): FbSignalType {
    const type = block.params?.type as FbSignalType;
    return SIGNAL_TYPES.includes(type) ? type : 'BOOL';
}

/** A block depends on time if one of its blocks does - also inside the user blocks it contains */
function isTimeDependent(user: FbUserBlock, userBlocks: Record<string, FbUserBlock>, seen: Set<string>): boolean {
    seen.add(user.type);
    return user.graph.blocks.some(block => {
        const inner = userBlocks[block.type];
        if (inner) {
            return !seen.has(inner.type) && isTimeDependent(inner, userBlocks, seen);
        }
        return !!byType.get(block.type)?.timeDependent;
    });
}

/**
 * A user block as a block type: its pins are its FB_IN and FB_OUT blocks. It always counts as a block
 * with a state - an instance keeps its outputs from one cycle to the next, so a loop may lead through it.
 */
function userBlockDef(user: FbUserBlock, userBlocks: Record<string, FbUserBlock>): FbBlockDef {
    return {
        type: user.type,
        category: 'user',
        inputs: getTerminals(user, 'FB_IN').map(block => ({
            id: String(block.params!.pin),
            type: terminalType(block),
            default: block.params?.value,
        })),
        outputs: getTerminals(user, 'FB_OUT').map(block => ({
            id: String(block.params!.pin),
            type: terminalType(block),
        })),
        stateful: true,
        timeDependent: isTimeDependent(user, userBlocks, new Set()),
        code: '',
        user,
    };
}

/**
 * The type of a block: one of the library, or a user block of `userBlocks` - the copies a diagram
 * carries of the blocks it uses.
 */
export function getBlockDef(type: string, userBlocks?: Record<string, FbUserBlock>): FbBlockDef | undefined {
    const def = byType.get(type);
    if (def) {
        return def;
    }
    const user = userBlocks?.[type];
    return user ? userBlockDef(user, userBlocks) : undefined;
}
