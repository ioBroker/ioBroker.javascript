// @flow

import {PureComponent} from 'react'
import pick from 'lodash/pick'
import {MINUTES, EVERY} from '../data/constants'
import {isMultiple, ensureMultiple, replaceEvery} from '../utils'
import type {PresetTabState} from './types/PresetTabState'
import type {PresetTabProps} from './types/PresetTabProps'

export const ensureEveryOn = (value: any, multiple: boolean) => {
    const process = (item: any) => {
        if (item === null) {
            return EVERY;
        }
        if (item === EVERY) {
            return item
        }
        if (item.includes('-')) {
            return item
        }
        if (multiple && item.includes('/')) {
            return replaceEvery(item)
        }
        if (!multiple && !item.includes('/')) {
            return `*/${item}`
        }
        return item;
    };

    if (value instanceof Array) {
        return value.map(process)
    } else {
        return process(value)
    }
};

export default class PresetTab extends PureComponent {
    constructor(props: PresetTabProps, ctx: Object) {
        super(props, ctx);
        const {expression} = props;
        const {minutes, hours} = expression;
        const minutesMultiple = isMultiple(minutes),
            hoursMultiple = isMultiple(hours);
        this.state = {
            ...expression,
            activeTime: MINUTES,
            minutesMultiple,
            hoursMultiple,
            minutes,
            hours
        };
    }

    props: PresetTabProps;

    state: PresetTabState;

    selectMinutes = (value: string) => {
        this.setState({
            minutes: value
        }, () => this.props.onChange && this.props.onChange())
    };

    selectHours = (value: string) => {
        this.setState({
            hours: value
        }, () => this.props.onChange && this.props.onChange())
    };

    selectDayOfWeek = (value: string) => {
        this.setState({
            dayOfWeek: value
        }, () => this.props.onChange && this.props.onChange())
    };

    selectDayOfMonth = (value: string) => {
        this.setState({
            dayOfMonth: value
        }, () => this.props.onChange && this.props.onChange())
    };

    selectMonth = (value: string) => {
        this.setState({
            month: value
        }, () => this.props.onChange && this.props.onChange())
    };

    /*changeDateType = () => {
        const {state} = this;
        const {activeTime} = state;
        const field = activeTime.toLowerCase();
        const key = `${field}Multiple`;
        const value = !this.state[key];
        this.setState({
            [key]: value,
            [field]: ensureMultiple(state[field], value)
        }, () => this.props.onChange && this.props.onChange())
    };*/

    changeHoursType = () => {
        const value = !this.state.hoursMultiple;
        this.setState({
            hoursMultiple: value,
            hours: ensureMultiple(this.state.hours, value)
        }, () => this.props.onChange && this.props.onChange())
    };

    changeMinutesType = () => {
        const value = !this.state.minutesMultiple;
        this.setState({
            minutesMultiple: value,
            minutes: ensureMultiple(this.state.minutes, value)
        }, () => this.props.onChange && this.props.onChange())
    };

    getExpression() {
        const {state} = this;
        const {minutes, hours, minutesMultiple, hoursMultiple} = state;
        return {
            minutes: ensureEveryOn(minutes, minutesMultiple),
            hours: ensureEveryOn(hours, hoursMultiple),
            ...pick(state, ['dayOfMonth', 'month', 'dayOfWeek'])
        }
    }
}
