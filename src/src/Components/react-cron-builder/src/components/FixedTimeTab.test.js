import {mount} from 'enzyme'
import React from 'react'
import {parseCronExpression} from 'utils'
import Select from 'react-select'
import FixedTimeTab from './FixedTimeTab'
import TimeInput from './components/TimeInput'
import DateComponent, {DayOfMonth, Month} from './components/DateComponent'

describe('FixedTimeTab', () => {
    const expression = parseCronExpression('* * * * *');
    const styleNameFactory = jest.fn();

    it('initial rendering', () => {
        const wrapper = mount(<FixedTimeTab
            styleNameFactory={styleNameFactory}
            expression={expression}
        />);
        expect(wrapper.find(TimeInput)).toHaveLength(2);
        expect(wrapper.find(DateComponent)).toHaveLength(1);
    });

    it('should select minutes', () => {
        const wrapper = mount(<FixedTimeTab
            styleNameFactory={styleNameFactory}
            expression={expression}
        />);
        wrapper.find(Select).at(1).props().onChange({
            label: '2',
            value: '2'
        });
        expect(wrapper.state().minutes).toEqual('2');
    });

    it('should select hours', () => {
        const wrapper = mount(<FixedTimeTab
            styleNameFactory={styleNameFactory}
            expression={expression}
        />);
        wrapper.find(Select).at(0).props().onChange({
            label: '3',
            value: '3'
        });
        expect(wrapper.state().hours).toEqual('3');
    });

    it('should select day of week', () => {
        const wrapper = mount(<FixedTimeTab
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
        const wrapper = mount(<FixedTimeTab
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
        const wrapper = mount(<FixedTimeTab
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

