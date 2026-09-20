import { describe, expect, it } from 'vitest';

import { SignalBus, formatLive } from '../online';

describe('FbEditor: online view', () => {
    it('hands a subscriber the current value and every change', () => {
        const bus = new SignalBus();
        bus.update({ 'b1.Q': 1 }, true);
        const seen: unknown[] = [];
        const unsubscribe = bus.subscribe('b1.Q', value => seen.push(value));
        bus.update({ 'b1.Q': 2, 'b2.OUT': true }, false);
        unsubscribe();
        bus.update({ 'b1.Q': 3 }, false);
        expect(seen).toEqual([1, 2]);
    });

    it('drops the signals a full snapshot does not have', () => {
        const bus = new SignalBus();
        bus.update({ 'b1.Q': 1, 'b2.OUT': true }, true);
        const seen: unknown[] = [];
        bus.subscribe('b2.OUT', value => seen.push(value));
        bus.update({ 'b1.Q': 5 }, true);
        expect(seen).toEqual([true, undefined]);
    });

    it('tells everybody when it is cleared', () => {
        const bus = new SignalBus();
        bus.update({ 'b1.Q': 1 }, true);
        const seen: unknown[] = [];
        bus.subscribe('b1.Q', value => seen.push(value));
        bus.clear();
        expect(seen).toEqual([1, undefined]);
    });

    it('formats values', () => {
        expect(formatLive(true, 'BOOL')).toBe('TRUE');
        expect(formatLive(0, 'BOOL')).toBe('FALSE');
        expect(formatLive(1500, 'TIME')).toBe('1.5s');
        expect(formatLive(1 / 3, 'REAL')).toBe('0.333');
        expect(formatLive('a very long text that goes on', 'STRING')).toBe('"a very long text th…"');
        expect(formatLive(null, 'REAL')).toBe('null');
    });
});
