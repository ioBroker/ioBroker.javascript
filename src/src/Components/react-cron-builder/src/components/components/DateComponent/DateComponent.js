// @flow

import React, {PureComponent, Children} from 'react'
import {If, Then} from 'react-if'
import {EVERY} from 'data/constants'
import head from 'lodash/head'
import type {Option} from 'types/Option'
import {getValues} from 'utils'
import Select from '../Select'
import {DayOfWeek, DayOfMonth, Month} from './index'

type Props = {
    styleNameFactory: any,
    children?: any
}

type State = {
    activeComponent: React.Children
}

export default class DateComponent extends PureComponent {
    static defaultProps = {
        children: null
    };

    state: State = {
        activeComponent: DayOfWeek.className
    };

    props: Props;

    setActiveComponent = ({target: {value}}: any) => {
        this.setState({
            activeComponent: value
        })
    };

    onChange = (onChange: Function) => {
        return (value: Array<Option>) => {
            const values = getValues(value);
            const first = head(values);
            if(first === EVERY && values.length > 1) {
                onChange(values.filter((val: string) => val !== EVERY))
            } else {
                const everyIndex = values.indexOf(EVERY);
                if(everyIndex !== -1) {
                    onChange([EVERY])
                } else {
                    onChange(values)
                }
            }
        }
    };

    render() {
        const {styleNameFactory, children} = this.props;
        const {activeComponent} = this.state;
        return (
            <div
                style={{position: 'relative'}}
            >
                <label {...styleNameFactory('label')} >
                    On:
                </label>
                <div {...styleNameFactory('row', 'items-end')} >
                    {Children.map(children, (child: React.Children) => {
                        const {value, onChange} = child.props;
                        const {getOptions} = child.type;
                        return (
                            <If condition={child.type.className === activeComponent} >
                                <Then>
                                    <div
                                        {...styleNameFactory('input')}
                                    >
                                        <Select
                                            style={{minWidth: 120}}
                                            value={value}
                                            options={getOptions()}
                                            multi
                                            autosize
                                            onChange={this.onChange(onChange)}
                                        />
                                    </div>
                                </Then>
                            </If>
                        )
                    })}
                </div>
                <div
                    style={{position: 'absolute'}}
                    {...styleNameFactory('link')}
                >
                    <select onChange={this.setActiveComponent} >
                        <option value={DayOfWeek.className}>day of week</option>
                        <option value={DayOfMonth.className}>day of month</option>
                        <option value={Month.className}>month</option>
                    </select>
                </div>
            </div>
        )
    }
}
