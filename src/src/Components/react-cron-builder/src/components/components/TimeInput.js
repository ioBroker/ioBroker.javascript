// @flow

import React, {PureComponent} from 'react'
import type {Option} from 'types/Option'
import {parseTimeValue, getValues, getValue} from '../../utils'
import Select from './Select'

type Props = {
    value: any,
    options: Array<Option>,
    styleNameFactory: any,
    onChange: Function
}

export default class TimeInput extends PureComponent {
    props: Props;

    onChange = (onChange: Function) => {
        return (value: any) => {
            if(value instanceof Array) {
                onChange(getValues(value))
            } else {
                onChange(getValue(value))
            }
        }
    };

    render() {
        const {styleNameFactory, value, onChange} = this.props;
        return (
            <Select
                {...this.props}
                {...styleNameFactory('input')}
                value={parseTimeValue(value)}
                onChange={this.onChange(onChange)}
            />
        )
    }
}
