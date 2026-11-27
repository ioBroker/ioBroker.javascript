import { describe, it, expect, beforeEach } from 'vitest';

import { blocksNeedReload, rememberLoadedBlocks, resetLoadedBlocks } from '../blocklyAdapters';

const adapter = (name: string, version: string, blockly = true): ioBroker.AdapterObject =>
    ({
        _id: `system.adapter.${name}`,
        type: 'adapter',
        common: { name, version, blockly },
        native: {},
    }) as unknown as ioBroker.AdapterObject;

const instance = (name: string, version: string, enabled: boolean): ioBroker.InstanceObject =>
    ({
        _id: `system.adapter.${name}.0`,
        type: 'instance',
        common: { name, version, blockly: true, enabled },
        native: {},
    }) as unknown as ioBroker.InstanceObject;

describe('Reload for changed adapter blocks (#2469)', () => {
    beforeEach(() => {
        resetLoadedBlocks();
        rememberLoadedBlocks({
            'system.adapter.cloud': adapter('cloud', '5.0.1'),
            'system.adapter.admin': adapter('admin', '7.0.0', false),
        });
    });

    it('does not ask when an instance is started or stopped', () => {
        expect(blocksNeedReload(instance('cloud', '5.0.1', false))).toBe(false);
        expect(blocksNeedReload(instance('cloud', '5.0.1', true))).toBe(false);
    });

    it('does not ask when the adapter object is written again in the same version', () => {
        expect(blocksNeedReload(adapter('cloud', '5.0.1'))).toBe(false);
    });

    it('asks once when an adapter with blocks is updated', () => {
        expect(blocksNeedReload(adapter('cloud', '5.1.0'))).toBe(true);
        // installing writes the adapter object more than once
        expect(blocksNeedReload(adapter('cloud', '5.1.0'))).toBe(false);
    });

    it('asks when an adapter with blocks is installed', () => {
        expect(blocksNeedReload(adapter('telegram', '4.0.0'))).toBe(true);
    });

    it('does not ask for adapters without blocks or deleted objects', () => {
        expect(blocksNeedReload(adapter('admin', '7.1.0', false))).toBe(false);
        expect(blocksNeedReload(null)).toBe(false);
    });

    it('does not ask before any blocks were loaded', () => {
        resetLoadedBlocks();
        expect(blocksNeedReload(adapter('cloud', '5.1.0'))).toBe(false);
    });
});
