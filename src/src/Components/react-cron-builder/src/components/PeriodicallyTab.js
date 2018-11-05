// @flow

import React from 'react'
import {MINUTES, EVERY} from '../data/constants'
import {isMultiple, toggleDateType, toOptions, rangeHoursToSingle} from '../utils'
import range from 'lodash/range'
import MultipleSwitcher from './MultipleSwitcher'
import TimeInput from './components/TimeInput'
import DateComponent, {DayOfWeek, DayOfMonth, Month} from './components/DateComponent'
import PresetTab from './PresetTab'
import type {PresetTabState} from './types/PresetTabState'
import type {PresetTabProps} from './types/PresetTabProps'

const minutesOptions = toOptions(range(1, 60));
const hoursOptions = toOptions(range(0, 24));

const isMinutes = (activeTime: string) => activeTime === MINUTES;

const timeInputProps = {style: {minWidth: 75}};

export default class PeriodicallyTab extends PresetTab {
    constructor(props: PresetTabProps, ctx: Object) {
        super(props, ctx);
        const {hours} = this.state;
        this.state.hours = rangeHoursToSingle(hours)
    }


    /*toggleActiveTime() {
        this.setState({activeTime: toggleDateType(this.state.activeTime)}, () => {
            this.props.onChange && this.props.onChange()
        });

    };*/

    isMultiple = () => {
        const {activeTime, minutesMultiple, hoursMultiple} = this.state;
        if (activeTime === MINUTES) {
            return minutesMultiple;
        } else {
            return hoursMultiple;
        }
    };

    render() {
        const {styleNameFactory} = this.props;
        const {minutes, hours, dayOfWeek, dayOfMonth, month} = this.state;
        return (
            <div {...styleNameFactory('preset')} style={{display: 'block'}}>
                <div>
                    <div {...styleNameFactory('row', 'main')}>
                        <div {...styleNameFactory('label')} style={{width: 100}}>Minutes:</div>
                        <MultipleSwitcher
                            styleNameFactory={styleNameFactory}
                            isMultiple={this.state.minutesMultiple}
                            onChange={this.changeHoursType}
                        />
                            <TimeInput
                                options={minutesOptions}
                                value={minutes}
                                styleNameFactory={styleNameFactory}
                                onChange={this.selectMinutes}
                                multi={isMultiple(minutes)}
                                {...timeInputProps}
                            />
                    </div>
                </div>
                <div>
                    <div {...styleNameFactory('row', 'main')}>
                        <div {...styleNameFactory('label')} style={{width: 100}}>Hours:</div>
                        <MultipleSwitcher
                            styleNameFactory={styleNameFactory}
                            isMultiple={this.state.hoursMultiple}
                            onChange={this.changeMinutesType}
                        />
                        <TimeInput
                            options={hoursOptions}
                            value={hours}
                            styleNameFactory={styleNameFactory}
                            multi={isMultiple(hours)}
                            onChange={this.selectHours}
                            {...timeInputProps}
                        />
                    </div>
                </div>
                <div>
                    <DateComponent styleNameFactory={styleNameFactory}>
                        <DayOfWeek  value={dayOfWeek}  onChange={this.selectDayOfWeek}/>
                        <DayOfMonth value={dayOfMonth} onChange={this.selectDayOfMonth}/>
                        <Month      value={month}      onChange={this.selectMonth}/>
                    </DateComponent>
                </div>
            </div>
        )
    }
}
