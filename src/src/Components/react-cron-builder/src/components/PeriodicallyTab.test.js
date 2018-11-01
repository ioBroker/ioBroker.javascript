import React from 'react'
import {mount} from 'enzyme'

import Select from 'react-select'
import {parseCronExpression} from 'utils'
import {MINUTES, HOURS} from 'data/constants'
import PeriodicallyTab from './PeriodicallyTab'
import MultipleSwitcher from './MultipleSwitcher'
import Tab from './Tab'
import DateComponent, {DayOfMonth, Month} from './components/DateComponent'

describe('PeriodicallyTab', () => {
    const expression = parseCronExpression('* * * * *');
    const styleNameFactory = jest.fn();

    it('initial rendering', () => {
        const wrapper = mount(<PeriodicallyTab
            styleNameFactory={styleNameFactory}
            expression={expression}
        />);
        expect(
            wrapper.find(MultipleSwitcher).at(0).find(Tab).at(0).props().isActive
        ).toBeTruthy();
        expect(
            wrapper.find(MultipleSwitcher).at(1).find(Tab).at(0).props().isActive
        ).toBeTruthy();
        expect(wrapper.find(Select).at(0).props().value).toEqual('1')
    });

    it('switch multiple minutes', () => {
        const wrapper = mount(<PeriodicallyTab
            styleNameFactory={styleNameFactory}
            expression={expression}
        />);

        expect(wrapper.state().minutesMultiple).toBeFalsy();
        wrapper.find(MultipleSwitcher).at(0).find('[data-multiple-switcher]').simulate('click');
        expect(
            wrapper.find(MultipleSwitcher).at(0).find(Tab).at(1).props().isActive
        ).toBeTruthy();
        expect(wrapper.find(Select).at(0).props().value).toEqual(['1']);
        expect(wrapper.state().minutesMultiple).toBeTruthy();
        expect(wrapper.state().activeTime).toEqual(MINUTES);
        expect(wrapper.state().hoursMultiple).toBeFalsy();
    });

    it('switch multiple hours', () => {
        const wrapper = mount(<PeriodicallyTab
            styleNameFactory={styleNameFactory}
            expression={expression}
        />);

        expect(wrapper.state().hoursMultiple).toBeFalsy();
        wrapper.find(MultipleSwitcher).at(1).find('[data-multiple-switcher]').simulate('click');
        wrapper.find(MultipleSwitcher).at(0).find('[data-multiple-switcher]').simulate('click');
        expect(
            wrapper.find(MultipleSwitcher).at(0).find(Tab).at(1).props().isActive
        ).toBeTruthy();
        expect(wrapper.find(Select).at(0).props().value).toEqual(['1']);
        expect(wrapper.state().hoursMultiple).toBeTruthy();
        expect(wrapper.state().activeTime).toEqual(HOURS);
        expect(wrapper.state().minutesMultiple).toBeFalsy();
    });


    it('switch minutes to hours', () => {
        const wrapper = mount(<PeriodicallyTab
            styleNameFactory={styleNameFactory}
            expression={expression}
        />);

        expect(wrapper.state().activeTime).toEqual(MINUTES);
        wrapper.find(MultipleSwitcher).at(1).find('[data-multiple-switcher]').simulate('click');
        expect(
            wrapper.find(MultipleSwitcher).at(1).find(Tab).at(1).props().isActive
        ).toBeTruthy();
        expect(wrapper.find(Select).at(0).props().value).toEqual('1');
        expect(wrapper.state().activeTime).toEqual(HOURS);
    });

    it('should select minutes and hours', () => {
        const wrapper = mount(<PeriodicallyTab
            styleNameFactory={styleNameFactory}
            expression={expression}
        />);

        wrapper.find(Select).at(0).props().onChange('2');
        expect(wrapper.state().minutes).toEqual('2');

        // switch to hours
        wrapper.find(MultipleSwitcher).at(1).find('[data-multiple-switcher]').simulate('click');
        wrapper.find(Select).at(0).props().onChange('3');
        expect(wrapper.state().hours).toEqual('3');
    });

    it('should select day of week', () => {
        const wrapper = mount(<PeriodicallyTab
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
        const wrapper = mount(<PeriodicallyTab
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
        const wrapper = mount(<PeriodicallyTab
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
