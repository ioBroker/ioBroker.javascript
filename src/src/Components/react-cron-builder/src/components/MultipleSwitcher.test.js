import {mount} from 'enzyme'
import React from 'react'
import MultipleSwitcher from './MultipleSwitcher'
import Tab from './Tab'

describe('MultipleSwitcher', () => {
    const styleNameFactory = jest.fn();

    it('initial rendering', () => {
        const wrapper = mount(<MultipleSwitcher
            styleNameFactory={styleNameFactory}
        />);
        expect(wrapper.find(Tab)).toHaveLength(2)
    })
});
