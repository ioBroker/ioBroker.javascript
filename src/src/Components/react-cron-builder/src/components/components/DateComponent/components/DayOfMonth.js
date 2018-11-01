// @flow

import {PureComponent} from 'react'
import {toOptions} from 'utils'
import range from 'lodash/range'

const options = [
    {
        label: 'every month day',
        value: '*'
    }
].concat(toOptions(range(1, 32)));

export default class DayOfMonth extends PureComponent {
    static getOptions() {
        return options
    }

    static className: string = 'DayOfMonth';
}
