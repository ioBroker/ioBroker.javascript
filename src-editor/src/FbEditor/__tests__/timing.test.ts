import { describe, expect, it } from 'vitest';

import { createBlock, createGraph, getBlockDef } from '@fb-core';

import { previewOf } from '../timing';

function preview(type: string, params: Record<string, number> = {}): ReturnType<typeof previewOf> {
    const graph = createGraph();
    const block = createBlock(type, [0, 0], graph);
    block.params = { ...block.params, ...params };
    return previewOf(block, getBlockDef(type));
}

/** How long a trace is on, in steps */
function onSteps(values: number[]): number {
    return values.filter(value => value === 1).length;
}

describe('FbEditor: preview of a block', () => {
    it('draws a pulse of PT for TP, with PT as a span', () => {
        const result = preview('TP', { PT: 5000 })!;
        expect(result.traces.map(trace => trace.id)).toEqual(['IN', 'Q', 'ET']);
        const [, q, et] = result.traces;
        expect(result.span?.label).toBe('5s');
        // the pulse is PT long: the span from its rise to its fall
        const steps = result.span!.to - result.span!.from;
        expect(Math.abs(steps / (q.values.length - 1) - 5000 / result.duration)).toBeLessThan(0.02);
        expect(Math.max(...et.values)).toBe(5000);
    });

    it('lets a short input pass TON without a pulse, a long one with a delay', () => {
        const result = preview('TON', { PT: 1000 })!;
        const [input, q] = result.traces;
        // the output is on for less time than the input: the delay is cut off
        expect(onSteps(q.values)).toBeGreaterThan(0);
        expect(onSteps(q.values)).toBeLessThan(onSteps(input.values));
        // the first, short pulse gives nothing
        const firstFall = input.values.findIndex((value, i) => i && value === 0 && input.values[i - 1] === 1);
        expect(q.values.slice(0, firstFall + 1).every(value => value === 0)).toBe(true);
    });

    it('switches a hysteresis between LOW and HIGH', () => {
        const result = preview('HYST', { HIGH: 22, LOW: 20 })!;
        const [input, q] = result.traces;
        expect(input.levels?.map(level => level.value)).toEqual([22, 20]);
        input.values.forEach((value, i) => {
            if (value > 22) {
                expect(q.values[i]).toBe(1);
            } else if (value < 20) {
                expect(q.values[i]).toBe(0);
            }
        });
    });

    it('counts up to PV with CTU and resets at the end', () => {
        const result = preview('CTU', { PV: 3 })!;
        expect(result.traces.map(trace => trace.id)).toEqual(['CU', 'R', 'CV', 'Q']);
        const [, , cv, q] = result.traces;
        expect(Math.max(...cv.values)).toBe(4);
        expect(cv.values[cv.values.length - 1]).toBe(0);
        // Q while CV is at PV or above
        cv.values.forEach((value, i) => expect(q.values[i]).toBe(value >= 3 ? 1 : 0));
    });

    it('counts down from PV with CTD, below 0', () => {
        const result = preview('CTD', { PV: 2 })!;
        const [, , cv, q] = result.traces;
        expect(Math.max(...cv.values)).toBe(2);
        expect(Math.min(...cv.values)).toBe(-1);
        expect(q.values[q.values.length - 1]).toBe(1);
    });

    it('blinks with TH on and TL off', () => {
        const result = preview('BLINK', { TH: 2000, TL: 1000 })!;
        const [enable, q] = result.traces;
        expect(result.span?.label).toBe('2s');
        const steps = result.span!.to - result.span!.from;
        expect(Math.abs(steps / (q.values.length - 1) - 2000 / result.duration)).toBeLessThan(0.02);
        // off while not enabled
        enable.values.forEach((value, i) => value === 0 && expect(q.values[i]).toBe(0));
    });

    it('has no preview for a block without time or memory', () => {
        expect(preview('AND')).toBeNull();
        expect(preview('ADD')).toBeNull();
        expect(preview('TO_INT')).toBeNull();
    });
});
