import type { FbBlockDef, FbCategory } from './types';

/**
 * The blocks of the first version: logic, timers, comparison, arithmetic and the ioBroker states.
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
        category: 'logic',
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
        category: 'logic',
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
        category: 'logic',
        inputs: [{ id: 'CLK', type: 'BOOL', default: false }],
        outputs: [{ id: 'Q', type: 'BOOL' }],
        stateful: true,
        code: '{I}.run({CLK}, firstScan); {Q} = {I}.Q;',
    },
    {
        type: 'F_TRIG',
        category: 'logic',
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
];

/** The categories in the order of the palette */
export const FB_CATEGORIES: FbCategory[] = ['iobroker', 'logic', 'timers', 'compare', 'arithmetic'];

const byType = new Map(FB_LIBRARY.map(def => [def.type, def]));

export function getBlockDef(type: string): FbBlockDef | undefined {
    return byType.get(type);
}
