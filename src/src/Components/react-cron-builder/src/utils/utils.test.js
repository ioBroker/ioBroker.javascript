import {MINUTES, HOURS} from 'data/constants'
import {ensureMultiple, toggleDateType} from './index'

describe('utils', () => {
    it('ensure multiple', () => {
        expect(ensureMultiple([1], false)).toEqual(1);
        expect(ensureMultiple([1], true)).toEqual([1]);
        expect(ensureMultiple(1, true)).toEqual([1]);
        expect(ensureMultiple(1, false)).toEqual(1);
    });

    it('toggleDateType', () => {
        expect(toggleDateType(MINUTES)).toEqual(HOURS);
        expect(toggleDateType(HOURS)).toEqual(MINUTES);
    })
});
