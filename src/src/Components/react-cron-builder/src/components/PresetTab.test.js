import {parseCronExpression} from 'utils'
import {EVERY} from 'data/constants'
import PresetTab, {ensureEveryOn} from './PresetTab'

describe('PresetTab', () => {
    const expression = parseCronExpression('* * * * *');
    const styleNameFactory = jest.fn();

    it('should get expression', () => {
        const instance = new PresetTab({
            expression,
            styleNameFactory
        });
        expect(instance.getExpression()).toEqual({
            minutes: EVERY,
            hours: EVERY,
            dayOfMonth: EVERY,
            month: EVERY,
            dayOfWeek: EVERY
        })
    });

    it('ensureEveryOn', () => {
        expect(ensureEveryOn('2', true)).toEqual('2');
        expect(ensureEveryOn('2', false)).toEqual('*/2');
        expect(ensureEveryOn('*/2', true)).toEqual('2');
        expect(ensureEveryOn('*/2', false)).toEqual('*/2');
        expect(ensureEveryOn(EVERY, false)).toEqual(EVERY);
        expect(ensureEveryOn(EVERY, true)).toEqual(EVERY);
        expect(ensureEveryOn('5-15', true)).toEqual('5-15');
        expect(ensureEveryOn('5-15', false)).toEqual('5-15');
        expect(ensureEveryOn(['1', '2'], false)).toEqual(['*/1', '*/2']);
        expect(ensureEveryOn(['1', '2'], true)).toEqual(['1', '2']);
    })
});
