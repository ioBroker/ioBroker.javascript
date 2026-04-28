import { describe, it, expect } from 'vitest';
import { objectMatchesQuery } from '../AiToolExecutor';

// Helper to build minimal ioBroker-like object shapes for the tests.
function obj(common: Record<string, unknown> = {}): { common: Record<string, unknown> } {
    return { common };
}

describe('objectMatchesQuery', () => {
    describe('id matching', () => {
        it('matches by full id', () => {
            expect(objectMatchesQuery('zigbee2mqtt.0.lamp.state', obj(), 'zigbee2mqtt.0.lamp.state')).toBe(true);
        });

        it('matches by id substring', () => {
            expect(
                objectMatchesQuery('alias.0.Dachgeschoss.Schlafzimmer.Bewegungsmelder', obj(), 'bewegungsmelder'),
            ).toBe(true);
        });

        it('matches case-insensitively', () => {
            expect(objectMatchesQuery('alias.0.KITCHEN.lamp', obj(), 'kitchen')).toBe(true);
            expect(objectMatchesQuery('alias.0.kitchen.lamp', obj(), 'KITCHEN')).toBe(true);
        });
    });

    describe('name matching', () => {
        it('matches by plain string name', () => {
            const o = obj({ name: 'Küchenlampe' });
            expect(objectMatchesQuery('x.y.z', o, 'küchen')).toBe(true);
        });

        it('matches by translated name (picks .en)', () => {
            const o = obj({ name: { en: 'Kitchen lamp', de: 'Küchenlampe', ru: 'Лампа на кухне' } });
            expect(objectMatchesQuery('x.y.z', o, 'kitchen')).toBe(true);
        });

        it('falls back to .de when .en is missing', () => {
            const o = obj({ name: { de: 'Bewegungsmelder', fr: 'Détecteur' } });
            // getText prefers .en → falls back to .de
            expect(objectMatchesQuery('x.y.z', o, 'bewegungsmelder')).toBe(true);
        });

        it('handles empty/missing name gracefully', () => {
            expect(objectMatchesQuery('x.y.z', obj(), 'query')).toBe(false);
            expect(objectMatchesQuery('x.y.z', obj({ name: '' }), 'query')).toBe(false);
            expect(objectMatchesQuery('x.y.z', obj({ name: undefined }), 'query')).toBe(false);
        });
    });

    describe('role matching', () => {
        it('matches by full role', () => {
            const o = obj({ role: 'sensor.motion' });
            expect(objectMatchesQuery('x.y.z', o, 'sensor.motion')).toBe(true);
        });

        it('matches by role substring', () => {
            const o = obj({ role: 'sensor.motion' });
            expect(objectMatchesQuery('x.y.z', o, 'motion')).toBe(true);
            expect(objectMatchesQuery('x.y.z', o, 'sensor')).toBe(true);
        });

        it('matches role case-insensitively', () => {
            const o = obj({ role: 'sensor.light' });
            expect(objectMatchesQuery('x.y.z', o, 'LIGHT')).toBe(true);
        });

        it('handles missing role', () => {
            expect(objectMatchesQuery('x.y.z', obj({ name: 'foo' }), 'sensor')).toBe(false);
        });
    });

    describe('negative matches', () => {
        it('returns false when nothing matches', () => {
            const o = obj({ name: 'Kitchen lamp', role: 'switch.light' });
            expect(objectMatchesQuery('zigbee.0.lamp', o, 'temperature')).toBe(false);
        });

        it('returns false for empty query (guards against matching everything)', () => {
            expect(objectMatchesQuery('zigbee.0.lamp', obj({ name: 'Lamp' }), '')).toBe(false);
        });

        it('returns false for null/undefined object (still can match on id)', () => {
            expect(objectMatchesQuery('zigbee.0.lamp', null, 'lamp')).toBe(true);
            expect(objectMatchesQuery('zigbee.0.lamp', undefined, 'lamp')).toBe(true);
            expect(objectMatchesQuery('zigbee.0.lamp', null, 'temperature')).toBe(false);
        });

        it('returns false when common is missing and id does not match', () => {
            expect(objectMatchesQuery('x.y.z', { common: undefined } as any, 'query')).toBe(false);
        });
    });

    describe('real-world examples', () => {
        it('finds an alias motion-sensor channel by name search "bewegungsmelder"', () => {
            const motionChannel = obj({
                name: 'Bewegungsmelder',
                role: 'sensor.motion',
            });
            expect(
                objectMatchesQuery(
                    'alias.0.Dachgeschoss.Schlafzimmer.Bewegungsmelder',
                    motionChannel,
                    'bewegungsmelder',
                ),
            ).toBe(true);
        });

        it('finds any motion sensor via role query "sensor.motion"', () => {
            // State under a channel whose name does not contain "motion"
            const state = obj({ name: 'STATE', role: 'sensor.motion', type: 'boolean' });
            expect(objectMatchesQuery('zigbee2mqtt.0.0xabcd.STATE', state, 'sensor.motion')).toBe(true);
        });

        it('finds switches via role query "switch"', () => {
            expect(objectMatchesQuery('zigbee.0.lamp.state', obj({ role: 'switch.light' }), 'switch')).toBe(true);
        });

        it('finds rooms via enum id', () => {
            expect(
                objectMatchesQuery('enum.rooms.kitchen', obj({ name: { en: 'Kitchen', de: 'Küche' } }), 'kitchen'),
            ).toBe(true);
        });

        it('finds adapters by instance id', () => {
            expect(objectMatchesQuery('system.adapter.telegram.0', obj({ name: 'telegram' }), 'telegram')).toBe(true);
        });
    });
});
