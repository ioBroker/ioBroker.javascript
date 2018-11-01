import React from 'react'
import {mount} from 'enzyme'
import {parseCronExpression} from 'utils'
import Select from 'react-select'
import PeriodicallyFrameTab from './PeriodicallyFrameTab'
import MultipleSwitcher from './MultipleSwitcher'
import TimeInput from './components/TimeInput'
import DateComponent, {DayOfMonth, Month} from './components/DateComponent'

describe('PeriodicallyFrameTab', () => {
    const expression = parseCronExpression('* * * * *');
    const styleNameFactory = jest.fn();

    it('initial rendering', () => {
        const wrapper = mount(<PeriodicallyFrameTab
            styleNameFactory={styleNameFactory}
            expression={expression}
        />);

        expect(wrapper.find(MultipleSwitcher)).toHaveLength(1);
        expect(wrapper.find(DateComponent)).toHaveLength(1);
        expect(wrapper.find(TimeInput)).toHaveLength(3);
    });

    it('should switch correctly between every/on minutes', () => {
        const wrapper = mount(<PeriodicallyFrameTab
            styleNameFactory={styleNameFactory}
            expression={expression}
        />);
        wrapper.find('[data-multiple-switcher]').simulate('click');
        expect(wrapper.state().minutesMultiple).toBeTruthy();
        wrapper.find(TimeInput).at(0).props().onChange(['2', '4', '6']);
        expect(wrapper.state().minutes).toEqual(['2', '4', '6']);
        wrapper.find('[data-multiple-switcher]').simulate('click');
        expect(wrapper.state().minutes).toEqual('2');
    });

    it('should select hours from/to', () => {
        const wrapper = mount(<PeriodicallyFrameTab
            styleNameFactory={styleNameFactory}
            expression={expression}
        />);

        wrapper.find(TimeInput).at(1).props().onChange('7');
        expect(wrapper.state().hoursFrom).toEqual('7');
        wrapper.find(TimeInput).at(2).props().onChange('21');
        expect(wrapper.state().hoursTo).toEqual('21');
        expect(wrapper.state().hours).toEqual('7-21');
    });

    it('should select day of week', () => {
        const wrapper = mount(<PeriodicallyFrameTab
            styleNameFactory={styleNameFactory}
            expression={expression}
        />);

        wrapper.find(DateComponent).find(Select).props().onChange([{
            label: '2',
            value: '2'
        }]);
        expect(wrapper.state().dayOfWeek).toEqual(['2']);
    });

    it('should select day of month', () => {
        const wrapper = mount(<PeriodicallyFrameTab
            styleNameFactory={styleNameFactory}
            expression={expression}
        />);

        wrapper.find(DateComponent).find('select').simulate('change', {
            target: {
                value: DayOfMonth.className
            }
        });
        wrapper.find(DateComponent).find(Select).props().onChange([{
            label: '2',
            value: '2'
        }]);
        expect(wrapper.state().dayOfMonth).toEqual(['2']);
    });

    it('should select month', () => {
        const wrapper = mount(<PeriodicallyFrameTab
            styleNameFactory={styleNameFactory}
            expression={expression}
        />);

        wrapper.find(DateComponent).find('select').simulate('change', {
            target: {
                value: Month.className
            }
        });
        wrapper.find(DateComponent).find(Select).props().onChange([{
            label: '2',
            value: '2'
        }]);
        expect(wrapper.state().month).toEqual(['2']);
    })
});
