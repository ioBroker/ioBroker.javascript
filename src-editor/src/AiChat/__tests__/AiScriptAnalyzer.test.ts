import { describe, it, expect } from 'vitest';
import { getAllScripts, findScriptsUsingDatapoint, buildScriptSummary } from '../AiScriptAnalyzer';
import type { ScriptInfo } from '../AiChatTypes';

const makeScriptObj = (
    id: string,
    source: string,
    engineType = 'Javascript/js',
    enabled = true,
): Record<string, any> => ({
    [id]: {
        _id: id,
        type: 'script',
        common: {
            name: id.split('.').pop(),
            source,
            engineType,
            enabled,
        },
        native: {},
    },
});

describe('getAllScripts', () => {
    it('should extract scripts from objects', () => {
        const objects = {
            ...makeScriptObj('script.js.test1', '// test script 1'),
            ...makeScriptObj('script.js.test2', 'setState("dp.0.val", true);', 'TypeScript/ts', false),
        };
        const result = getAllScripts(objects as any);
        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('script.js.test1');
        expect(result[0].source).toBe('// test script 1');
        expect(result[0].enabled).toBe(true);
        expect(result[1].engineType).toBe('TypeScript/ts');
        expect(result[1].enabled).toBe(false);
    });

    it('should skip non-script objects', () => {
        const objects = {
            'script.js.folder1': {
                _id: 'script.js.folder1',
                type: 'channel',
                common: { name: 'folder1' },
                native: {},
            },
        };
        const result = getAllScripts(objects as any);
        expect(result).toHaveLength(0);
    });

    it('should skip scripts without source', () => {
        const objects = {
            'script.js.empty': {
                _id: 'script.js.empty',
                type: 'script',
                common: { name: 'empty', engineType: 'Javascript/js', enabled: true },
                native: {},
            },
        };
        const result = getAllScripts(objects as any);
        expect(result).toHaveLength(0);
    });
});

describe('findScriptsUsingDatapoint', () => {
    const scripts: ScriptInfo[] = [
        {
            id: 'script.js.lights',
            name: 'Lights',
            source: `on('zigbee2mqtt.0.lamp.state', (obj) => {
    log('Light changed');
    setState('zigbee2mqtt.0.other.state', obj.state.val);
});`,
            engineType: 'Javascript/js',
            enabled: true,
        },
        {
            id: 'script.js.sensor',
            name: 'Sensor',
            source: `const val = getState('zigbee2mqtt.0.sensor.temperature').val;
if (existsState('zigbee2mqtt.0.lamp.state')) {
    log('lamp exists');
}`,
            engineType: 'Javascript/js',
            enabled: true,
        },
        {
            id: 'script.js.unrelated',
            name: 'Unrelated',
            source: 'log("hello");',
            engineType: 'Javascript/js',
            enabled: true,
        },
    ];

    it('should find subscribe usage', () => {
        const results = findScriptsUsingDatapoint(scripts, 'zigbee2mqtt.0.lamp.state');
        const subscribeUsages = results.filter(r => r.usageType === 'subscribe');
        expect(subscribeUsages).toHaveLength(1);
        expect(subscribeUsages[0].scriptId).toBe('script.js.lights');
        expect(subscribeUsages[0].lineNumber).toBe(1);
    });

    it('should find write usage', () => {
        const results = findScriptsUsingDatapoint(scripts, 'zigbee2mqtt.0.other.state');
        const writeUsages = results.filter(r => r.usageType === 'write');
        expect(writeUsages).toHaveLength(1);
        expect(writeUsages[0].scriptId).toBe('script.js.lights');
    });

    it('should find read usage', () => {
        const results = findScriptsUsingDatapoint(scripts, 'zigbee2mqtt.0.sensor.temperature');
        const readUsages = results.filter(r => r.usageType === 'read');
        expect(readUsages).toHaveLength(1);
        expect(readUsages[0].scriptId).toBe('script.js.sensor');
    });

    it('should find exists usage', () => {
        const results = findScriptsUsingDatapoint(scripts, 'zigbee2mqtt.0.lamp.state');
        const existsUsages = results.filter(r => r.usageType === 'exists');
        expect(existsUsages).toHaveLength(1);
        expect(existsUsages[0].scriptId).toBe('script.js.sensor');
    });

    it('should not find false positives for partial ID matches', () => {
        const results = findScriptsUsingDatapoint(scripts, 'zigbee2mqtt.0.lamp');
        // "zigbee2mqtt.0.lamp" should NOT match "zigbee2mqtt.0.lamp.state"
        expect(results).toHaveLength(0);
    });

    it('should return empty for unrelated datapoint', () => {
        const results = findScriptsUsingDatapoint(scripts, 'hue.0.light.state');
        expect(results).toHaveLength(0);
    });

    it('should find on() with object pattern', () => {
        const scriptsWithObjPattern: ScriptInfo[] = [
            {
                id: 'script.js.pattern',
                name: 'Pattern',
                source: `on({id: 'zigbee2mqtt.0.lamp.state', change: 'ne'}, (obj) => { log(obj); });`,
                engineType: 'Javascript/js',
                enabled: true,
            },
        ];
        const results = findScriptsUsingDatapoint(scriptsWithObjPattern, 'zigbee2mqtt.0.lamp.state');
        expect(results.some(r => r.usageType === 'subscribe')).toBe(true);
    });
});

describe('buildScriptSummary', () => {
    it('should create a compact summary', () => {
        const scripts: ScriptInfo[] = [
            {
                id: 'script.js.lights',
                name: 'Lights Controller',
                source: '// Controls all lights in the house\non("dp", (obj) => {});',
                engineType: 'Javascript/js',
                enabled: true,
            },
            {
                id: 'script.js.heating',
                name: 'Heating',
                source: 'setState("heater.0.state", true);',
                engineType: 'TypeScript/ts',
                enabled: false,
            },
        ];
        const summary = buildScriptSummary(scripts);
        expect(summary).toContain('All scripts');
        // Path is shown instead of display name
        expect(summary).toContain('lights');
        expect(summary).toContain('heating');
        expect(summary).toContain('[JS, active]');
        expect(summary).toContain('[TS, inactive]');
        // Source code should be included
        expect(summary).toContain('Controls all lights in the house');
        expect(summary).toContain('on("dp", (obj) => {});');
        expect(summary).toContain('setState("heater.0.state", true);');
    });

    it('should handle empty scripts list', () => {
        const summary = buildScriptSummary([]);
        expect(summary).toBe('No scripts found.');
    });
});
