import { describe, it, expect } from 'vitest';
import { extractIdUnderCursor, formatStateHoverMarkdown } from '../stateHoverProvider';

describe('extractIdUnderCursor', () => {
    describe('single quotes', () => {
        it('finds the ID when cursor is inside', () => {
            const line = `getState('zigbee2mqtt.0.sensor.temperature');`;
            const cursor = 20; // inside the ID
            const hit = extractIdUnderCursor(line, cursor);
            expect(hit?.id).toBe('zigbee2mqtt.0.sensor.temperature');
        });

        it('returns column range matching the id content (excluding quotes)', () => {
            const line = `getState('zigbee2mqtt.0.sensor.temperature');`;
            const hit = extractIdUnderCursor(line, 20);
            // 1-based columns: position of 'z' in 'zigbee...' is 11
            expect(hit?.startColumn).toBe(11);
            expect(hit?.endColumn).toBe(43);
        });

        it('handles ID with numbers, dots, and slashes', () => {
            const line = `on('mqtt.0.home/bathroom/temp', () => {});`;
            const hit = extractIdUnderCursor(line, 20);
            expect(hit?.id).toBe('mqtt.0.home/bathroom/temp');
        });
    });

    describe('double quotes', () => {
        it('finds an ID in double-quoted string', () => {
            const line = `getState("hm-rpc.0.CUX0000001.PRESS_SHORT");`;
            const hit = extractIdUnderCursor(line, 25);
            expect(hit?.id).toBe('hm-rpc.0.CUX0000001.PRESS_SHORT');
        });
    });

    describe('backticks', () => {
        it('finds an ID in a template literal (when static)', () => {
            const line = 'setState(`alias.0.Living.Temperature`, 23.5);';
            const hit = extractIdUnderCursor(line, 20);
            expect(hit?.id).toBe('alias.0.Living.Temperature');
        });
    });

    describe('negative cases', () => {
        it('returns null when not inside any string', () => {
            const line = `const foo = 'bar';`;
            expect(extractIdUnderCursor(line, 2)).toBeNull();
        });

        it('returns null when the string is not a valid ID pattern', () => {
            const line = `log('hello world');`;
            expect(extractIdUnderCursor(line, 10)).toBeNull();
        });

        it('returns null for empty line', () => {
            expect(extractIdUnderCursor('', 1)).toBeNull();
        });

        it('returns null when cursor is past the closing quote', () => {
            const line = `log('zigbee2mqtt.0.lamp'); // comment`;
            // cursor on 'c' of comment — outside string
            const hit = extractIdUnderCursor(line, 30);
            expect(hit).toBeNull();
        });

        it('returns null for single-segment names (e.g. module names)', () => {
            const line = `require('axios');`;
            expect(extractIdUnderCursor(line, 12)).toBeNull();
        });

        it('returns null for paths without instance number', () => {
            const line = `getState('foo.bar');`;
            expect(extractIdUnderCursor(line, 15)).toBeNull();
        });
    });

    describe('multiple strings on same line', () => {
        it('picks the right string based on cursor position', () => {
            const line = `merge('zigbee2mqtt.0.a.state', 'hm-rpc.0.b.value');`;
            const hit1 = extractIdUnderCursor(line, 15);
            expect(hit1?.id).toBe('zigbee2mqtt.0.a.state');

            const hit2 = extractIdUnderCursor(line, 40);
            expect(hit2?.id).toBe('hm-rpc.0.b.value');
        });
    });
});

describe('formatStateHoverMarkdown', () => {
    const stateObj: ioBroker.AnyObject = {
        _id: 'zigbee2mqtt.0.sensor.temperature',
        type: 'state',
        common: {
            name: 'Temperatur Wohnzimmer',
            type: 'number',
            role: 'value.temperature',
            unit: '°C',
            min: -40,
            max: 80,
            read: true,
            write: false,
        } as any,
        native: {},
    } as any;

    const stateVal: ioBroker.State = {
        val: 23.4,
        ack: true,
        ts: Date.now() - 2 * 60 * 1000, // 2 min ago
        lc: Date.now() - 2 * 60 * 1000,
        from: 'system.adapter.zigbee2mqtt.0',
    };

    it('includes the ID header and type', () => {
        const md = formatStateHoverMarkdown('zigbee2mqtt.0.sensor.temperature', stateObj, stateVal);
        expect(md).toContain('zigbee2mqtt.0.sensor.temperature');
        expect(md).toContain('*state*');
    });

    it('shows the resolved name', () => {
        const md = formatStateHoverMarkdown('zigbee2mqtt.0.sensor.temperature', stateObj, stateVal);
        expect(md).toContain('Temperatur Wohnzimmer');
    });

    it('includes type, role, unit, min, max', () => {
        const md = formatStateHoverMarkdown('zigbee2mqtt.0.sensor.temperature', stateObj, stateVal);
        expect(md).toContain('`number`');
        expect(md).toContain('`value.temperature`');
        expect(md).toContain('`°C`');
        expect(md).toContain('min `-40`');
        expect(md).toContain('max `80`');
    });

    it('marks read-only states', () => {
        const md = formatStateHoverMarkdown('x', stateObj, stateVal);
        expect(md).toContain('read-only');
    });

    it('shows current value with ack flag and relative time', () => {
        const md = formatStateHoverMarkdown('x', stateObj, stateVal);
        expect(md).toContain('23.4');
        expect(md).toContain('✓ ack');
        // moment relative time (default 'en' locale in tests), e.g. "2 minutes ago"
        expect(md).toMatch(/ago/);
    });

    it('handles missing state gracefully', () => {
        const md = formatStateHoverMarkdown('x', stateObj, null);
        expect(md).toContain('No current value available');
    });

    it('shows warning when object is missing', () => {
        const md = formatStateHoverMarkdown('x', null, null);
        expect(md).toContain('Object not found');
    });

    it('translates name object to English', () => {
        const objWithI18nName = {
            ...stateObj,
            common: { ...stateObj.common, name: { en: 'Temperature', de: 'Temperatur' } },
        };
        const md = formatStateHoverMarkdown('x', objWithI18nName as any, stateVal);
        expect(md).toContain('Temperature');
    });

    it('lists enum states when present', () => {
        const obj = {
            ...stateObj,
            common: {
                ...stateObj.common,
                states: { 0: 'off', 1: 'on', 2: 'auto' },
            },
        };
        const md = formatStateHoverMarkdown('x', obj as any, { val: 1, ack: true, ts: Date.now() } as any);
        expect(md).toContain('**Values:**');
        expect(md).toContain('`0`');
        expect(md).toContain('off');
        expect(md).toContain('auto');
    });

    it('summarizes many states with a count', () => {
        const states: Record<string, string> = {};
        for (let i = 0; i < 20; i++) {
            states[String(i)] = `state_${i}`;
        }
        const obj = { ...stateObj, common: { ...stateObj.common, states } };
        const md = formatStateHoverMarkdown('x', obj as any, { val: 0, ack: true, ts: Date.now() } as any);
        expect(md).toContain('20 defined');
    });

    it('formats boolean values as `true` / `false`', () => {
        const obj = { ...stateObj, common: { ...stateObj.common, type: 'boolean' } };
        const md = formatStateHoverMarkdown('x', obj as any, { val: true, ack: true, ts: Date.now() } as any);
        expect(md).toContain('`true`');
    });

    it('quotes string values', () => {
        const obj = { ...stateObj, common: { ...stateObj.common, type: 'string' } };
        const md = formatStateHoverMarkdown('x', obj as any, { val: 'hello', ack: true, ts: Date.now() } as any);
        expect(md).toContain('`"hello"`');
    });

    it('truncates very long string values', () => {
        const long = 'x'.repeat(500);
        const obj = { ...stateObj, common: { ...stateObj.common, type: 'string' } };
        const md = formatStateHoverMarkdown('x', obj as any, { val: long, ack: true, ts: Date.now() } as any);
        expect(md).toContain('…');
    });

    it('channels/devices do not show a value section', () => {
        const channelObj = {
            _id: 'zigbee2mqtt.0.motion',
            type: 'channel',
            common: { name: 'Motion' },
            native: {},
        } as any;
        const md = formatStateHoverMarkdown('x', channelObj, null);
        expect(md).not.toContain('**Value:**');
        expect(md).toContain('channel');
    });
});
