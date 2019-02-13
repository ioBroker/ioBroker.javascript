import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@material-ui/core/styles';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import TextField from '@material-ui/core/TextField';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import convertCronToText from './cronText';

import I18n from '../../i18n';

const styles = theme => ({
    mainDiv: {
        width: '100%',
        height: '100%',
        overflow: 'auto'
    },
    formControl: {
        margin: 0,
        minWidth: 120,
    },
});

const PERIODIC = {
    once: 'once',
    interval: 'interval',
    intervalBetween: 'intervalBetween',
    specific: 'specific'
};
const PERIODIC_TYPES = {
    seconds: 'seconds',
    minutes: 'minutes',
    //hours: 'hours',
};
const WEEKDAYS = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
];

function padding(num) {
    if (num < 10) return '0' + num;
    return '' + num;
}
const DEFAULT_STATE = {
    mode: PERIODIC.interval,
    interval: {
        period: 1,
        unit: PERIODIC_TYPES.minutes
    }
};

class SimpleCron extends React.Component {
    constructor(props) {
        super(props);
        let cron = (typeof this.props.cronExpression === 'string') ? this.props.cronExpression.replace(/^["']/, '').replace(/["']\n?$/, '') : '';
        if (cron[0] === '{') {
            cron = '';
        }
        const state = SimpleCron.cron2state(cron || '* * * * *') || DEFAULT_STATE;

        this.state = {
            extended: false,
            cron: SimpleCron.state2cron(state),
            mode: 'interval',
            once: {
                time: '00:00',
                date: ''
            },
            interval: {
                period: 1,
                unit: PERIODIC_TYPES.minutes
            },
            intervalBetween: {
                period: 1,
                unit: PERIODIC_TYPES.minutes,
                timeFrom: 0,
                timeTo: 24,
                weekdays: [0, 1, 2, 3, 4, 5, 6]
            },
            specific: {
                time: '00:00',
                weekdays: [0, 1, 2, 3, 4, 5, 6]
            }
        };
        Object.assign(this.state, state);

        if (this.state.cron !== this.props.cronExpression) {
            setTimeout(() => this.props.onChange && this.props.onChange(this.state.cron), 100);
        }
    }

    static periodArray2text(list, max) {
        max = max || 7;
        if (list.length === max) {
            return '*'
        } else {
            let text = [];
            let start = null;
            let end = null;
            for (let i = 0; i < list.length; i++) {
                if (start === null) {
                    start = list[i];
                    end = list[i];
                } else if (list[i - 1] + 1 === list[i]) {
                    end = list[i];
                } else {
                    if (start !== end) {
                        text.push(start + '-' + end);
                    } else {
                        text.push(start);
                    }
                    start = list[i];
                    end = list[i];
                }
            }
            if (start !== end) {
                text.push(start + '-' + end);
            } else {
                text.push(start);
            }
            return text.join(',');
        }
    }

    static text2weekdays(text) {
        if (text === '*') {
            return [0,1,2,3,4,5,6];
        }
        const parts = text.split(',');
        const list = [];
        parts.forEach(part => {
            const _parts = part.split('-');
            if (_parts.length === 2) {
                const start = parseInt(_parts[0], 10);
                const end = parseInt(_parts[1], 10);
                for (let day = start; day <= end; day++) {
                    if (list.indexOf(day === 7 ? 0 : day) === -1) {
                        list.push(day === 7 ? 0 : day);
                    }
                }
            } else {
                if (part === '7') {
                    part = 0;
                }
                part = parseInt(part, 10);
                if (list.indexOf(part) === -1) {
                    list.push(part);
                }
            }
        });
        list.sort();
        return list;
    }

    static cron2state(cron) {
        cron = cron.replace(/['"]/g, '').trim();
        const cronParts = cron.split(' ');
        const options = {};
        const state = {
            mode: ''
        };
        if (cronParts.length === 6) {
            options.seconds = cronParts[0] || '*';
            options.minutes = cronParts[1] || '*';
            options.hours = cronParts[2] || '*';
            options.date = cronParts[3] || '*';
            options.months = cronParts[4] || '*';
            options.dow = cronParts[5] || '*';
        } else {
            options.seconds = null;
            options.minutes = cronParts[0] || '*';
            options.hours = cronParts[1] || '*';
            options.date = cronParts[2] || '*';
            options.months = cronParts[3] || '*';
            options.dow = cronParts[4] || '*';
        }

        // * * * * *
        if (options.seconds === null &&
            options.minutes === '*' &&
            options.hours === '*' &&
            options.date === '*' &&
            options.months === '*') {
            state.mode = PERIODIC.interval;
            state.interval = {
                period: 1,
                unit: PERIODIC_TYPES.minutes
            };
        } // * * * * * *
        if (options.seconds === '*' &&
            options.minutes === '*' &&
            options.hours === '*' &&
            options.date === '*' &&
            options.months === '*') {
            state.mode = PERIODIC.interval;
            state.interval = {
                period: 1,
                unit: PERIODIC_TYPES.seconds
            };
        } else// */n * * * *
        if (options.seconds === null &&
            options.minutes.indexOf('/') !== -1 &&
            options.hours === '*' &&
            options.date === '*' &&
            options.months === '*') {
            state.mode = PERIODIC.interval;
            state.interval = {
                period: parseInt(options.minutes.split('/')[1], 10),
                unit: PERIODIC_TYPES.minutes
            };
        } else
        // */n * * * * *
        if (options.seconds !== null && options.seconds.indexOf('/') !== -1 &&
            options.minutes === '*' &&
            options.hours === '*' &&
            options.date === '*' &&
            options.months === '*') {
            state.mode = PERIODIC.interval;
            state.interval = {
                period: parseInt(options.seconds.split('/')[1], 10),
                unit: PERIODIC_TYPES.seconds
            };
        } else
        // */n * 1-24 * * 1-7 or  */n * 1-24 * * *
        if (options.seconds !== null && options.seconds.indexOf('/') !== -1 &&
            options.minutes === '*' &&
            options.hours.indexOf('-') !== -1 &&
            options.date === '*' &&
            options.months === '*') {
            state.mode = PERIODIC.intervalBetween;
            state.intervalBetween = {
                period: parseInt(options.seconds.split('/')[1], 10),
                unit: PERIODIC_TYPES.seconds,
                timeFrom: parseInt(options.hours.split('-')[0], 10),
                timeTo: parseInt(options.hours.split('-')[1], 10),
                weekdays: SimpleCron.text2weekdays(options.dow)
            };
        } else
        // */n 1-24 * * 1-7 or  */n 1-24 * * *
        if (options.seconds === null &&
            options.minutes.indexOf('/') !== -1 &&
            options.hours.indexOf('-') !== -1 &&
            options.date === '*' &&
            options.months === '*') {
            state.mode = PERIODIC.intervalBetween;
            state.intervalBetween = {
                period: parseInt(options.minutes.split('/')[1], 10),
                unit: PERIODIC_TYPES.minutes,
                timeFrom: parseInt(options.hours.split('-')[0], 10),
                timeTo: parseInt(options.hours.split('-')[1], 10),
                weekdays: SimpleCron.text2weekdays(options.dow)
            };
        } else
        // m h * * 1-7 or m h * * *
        if (options.seconds === null &&
            parseInt(options.minutes, 10).toString() === options.minutes &&
            parseInt(options.hours, 10).toString() === options.hours &&
            options.date === '*' &&
            options.months === '*') {
            state.mode = PERIODIC.specific;
            state.intervalBetween = {
                time: padding(parseInt(options.minutes, 10)) + ':' + padding(parseInt(options.hours, 10)),
                weekdays: SimpleCron.text2weekdays(options.dow)
            };
        } else
        // m h d M *
        if (options.seconds === null &&
            parseInt(options.minutes, 10).toString() === options.minutes &&
            parseInt(options.hours, 10).toString() === options.hours &&
            parseInt(options.date, 10).toString() === options.date &&
            parseInt(options.months, 10).toString() === options.months &&
            options.dow === '*') {
            state.mode = PERIODIC.once;
            state.intervalBetween = {
                time: padding(parseInt(options.minutes, 10)) + ':' + padding(parseInt(options.hours, 10)),
                date: padding(parseInt(options.date, 10)) + '.' + padding(parseInt(options.months, 10)),
                weekdays: SimpleCron.text2weekdays(options.dow)
            };
        }

        if (state.mode) {
            return state;
        } else {
            return null;
        }
    }

    static state2cron(state) {
        let cron = '* * * * *';
        if (state.mode === PERIODIC.interval) {
            const settings = state.interval || {};
            if (settings.period > 60) settings.period = 60;
            if (settings.period < 1) settings.period = 1;

            if (settings.minutes > 60) settings.minutes = 60;
            if (settings.minutes < 1) settings.minutes = 1;

            if (settings.hours > 24) settings.hours = 24;
            if (settings.hours < 1) settings.hours = 1;

            if (state.extended) {
                cron = `${settings.minutes > 1 ? '*/' + settings.minutes : '*'} ${settings.hours > 1 ? '*/' + settings.hours : '*'} * * *`;
            } else {
                switch (settings.unit) {
                    case PERIODIC_TYPES.seconds:
                        cron = `${settings.period > 1 ? '*/' + settings.period : '*'} * * * * *`;
                        break;
                    case PERIODIC_TYPES.minutes:
                        cron = `${settings.period > 1 ? '*/' + settings.period : '*'} * * * *`;
                        break;
                    default:
                        break;
                }
            }
        } else if (state.mode === PERIODIC.intervalBetween) {
            const settings = state.intervalBetween || {};
            let hours;
            settings.timeFrom = settings.timeFrom || 0;
            settings.timeTo = settings.timeTo === undefined ? 24 : settings.timeTo;
            if (settings.timeFrom === 0 && settings.timeTo === 24) {
                hours = '*'
            } else {
                hours = settings.timeFrom !== settings.timeTo ? settings.timeFrom + '-' + settings.timeTo : '*';
            }
            if (settings.period > 60) settings.period = 60;
            if (settings.period < 1) settings.period = 1;
            settings.unit = settings.unit || PERIODIC_TYPES.minutes;
            switch (settings.unit) {
                case PERIODIC_TYPES.seconds:
                    cron = `${settings.period > 1 ? '*/' + settings.period : '*'} * ${hours} * * ${this.periodArray2text(settings.weekdays)}`;
                    break;
                case PERIODIC_TYPES.minutes:
                    cron = `${settings.period > 1 ? '*/' + settings.period : '*'} ${hours} * * ${this.periodArray2text(settings.weekdays)}`;
                    break;
                default:
                    break;
            }
        } else if (state.mode === PERIODIC.specific) {
            const settings = state.specific || {};
            const parts = (settings.time || '00:00').split(':');
            let minutes = parseInt(parts[1], 10) || 0;
            if (minutes > 59) minutes = 59;
            if (minutes < 0) minutes = 0;
            let hours = parseInt(parts[0], 10) || 0;
            if (hours > 23) hours = 59;
            if (hours < 0) hours = 0;

            cron = `${minutes} ${hours} * * ${this.periodArray2text(settings.weekdays || [])}`;
        } else if (state.mode === PERIODIC.once) {
            const settings = state.once || {};
            if (!settings.date) {
                settings.date = new Date().getDate() + '.' + padding(new Date().getMonth() + 1);
            }
            const parts = (settings.time || '00:00').split(':');
            const partsDate = settings.date.split('.');
            let minutes = parseInt(parts[1], 10) || 0;
            if (minutes > 59) minutes = 59;
            if (minutes < 0) minutes = 0;
            let hours = parseInt(parts[0], 10) || 0;
            if (hours > 23) hours = 59;
            if (hours < 0) hours = 0;
            let date = parseInt(partsDate[0], 10) || 1;
            if (date > 31) date = 31;
            if (date < 1) hours = 1;
            let month = parseInt(partsDate[1], 10) || 1;
            if (month > 12) month = 12;
            if (month < 1) month = 1;

            cron = `${minutes} ${hours} ${date} ${month} *`;
        }
        return cron;
    }

    recalcCron() {
        this.onChange(SimpleCron.state2cron(this.state));
    }

    getControlsWeekdaysElements(type) {
        const settings = this.state[type];
        return (<div key="weekdays" style={{paddingLeft: 8, width: '100%', maxWidth: 600}}>
            <h5>{I18n.t('On weekdays')}</h5>
            {[1,2,3,4,5,6,0].map(day => (
                <FormControlLabel
                    key={WEEKDAYS[day]}
                    control={
                        <Checkbox
                            checked={settings.weekdays.indexOf(day) !== -1}
                            onChange={e => {
                                const settings = JSON.parse(JSON.stringify(this.state[type]));
                                const pos = settings.weekdays.indexOf(day);
                                e.target.checked && pos === -1 && settings.weekdays.push(day);
                                !e.target.checked && pos !== -1 && settings.weekdays.splice(pos, 1);
                                settings.weekdays.sort();
                                this.setState({[type]: settings}, () => this.recalcCron());
                            }}
                            value={day.toString()}
                        />
                    }
                    label={I18n.t(WEEKDAYS[day])}
                />))
            }</div>);
    }

    getControlsPeriodElements(type) {
        const settings = this.state[type];

        if (this.state.extended) {
            return (<div key="period" style={{paddingLeft: 8, display: 'inline-block'}}>
                <h5 style={{marginBottom: 5}}>{I18n.t('sc_period')}</h5>
                <TextField
                    style={{marginTop: 0, marginBottom: 0, verticalAlign: 'bottom'}}
                    key="value"
                    label={I18n.t('sc_minutes')}
                    value={settings.minutes}
                    onChange={e => {
                        const settings = JSON.parse(JSON.stringify(this.state[type]));
                        settings.minutes = parseInt(e.target.value, 10);
                        this.setState({[type]: settings}, () => this.recalcCron());
                    }}
                    min={1}
                    max={60}
                    type="number"
                    InputLabelProps={{shrink: true,}}
                    margin="normal"
                />
                <TextField
                    style={{marginTop: 0, marginBottom: 0, verticalAlign: 'bottom'}}
                    key="value"
                    label={I18n.t('sc_hours')}
                    value={settings.hours}
                    onChange={e => {
                        const settings = JSON.parse(JSON.stringify(this.state[type]));
                        settings.hours = parseInt(e.target.value, 10);
                        this.setState({[type]: settings}, () => this.recalcCron());
                    }}
                    min={1}
                    max={24}
                    type="number"
                    InputLabelProps={{shrink: true,}}
                    margin="normal"
                />
            </div>);
        } else {
            return (<div key="period" style={{paddingLeft: 8, display: 'inline-block'}}>
                <h5 style={{marginBottom: 5}}>{I18n.t('sc_period')}</h5>
                <TextField
                    style={{marginTop: 0, marginBottom: 0, verticalAlign: 'bottom'}}
                    key="value"
                    label={I18n.t('sc_every')}
                    value={settings.period}
                    onChange={e => {
                        const settings = JSON.parse(JSON.stringify(this.state[type]));
                        settings.period = parseInt(e.target.value, 10);
                        this.setState({[type]: settings}, () => this.recalcCron());
                    }}
                    min={1}
                    max={60}
                    type="number"
                    InputLabelProps={{shrink: true,}}
                    margin="normal"
                /><Select
                style={{verticalAlign: 'bottom'}}
                value={settings.unit}
                onChange={e => {
                    const settings = JSON.parse(JSON.stringify(this.state[type]));
                    settings.unit = e.target.value;
                    this.setState({[type]: settings}, () => this.recalcCron());
                }}>
                {Object.keys(PERIODIC_TYPES).map(mode => (<MenuItem key={PERIODIC_TYPES[mode]} value={PERIODIC_TYPES[mode]}>{I18n.t('sc_' + PERIODIC_TYPES[mode])}</MenuItem>))}
            </Select></div>);
        }

    }

    getControlsTime(type) {
        const settings = this.state[type];
        return (<FormControl className={this.props.classes.formControl}>
            <TextField
                key="at"
                label={I18n.t('sc_time')}
                value={settings.time}
                onChange={e => {
                    const settings = JSON.parse(JSON.stringify(this.state[type]));
                    settings.time = e.target.value;
                    this.setState({[type]: settings}, () => this.recalcCron());
                }}
                InputLabelProps={{shrink: true,}}
                margin="normal"
            />
        </FormControl>);
    }

    getControlsDate(type) {
        const settings = this.state[type];

        if (!settings.date) {
            const d = new Date();
            settings.date = d.getDate() + '.'  + padding(d.getMonth() + 1);
        }

        //<InputLabel htmlFor="formatted-text-mask-input">{I18n.t('sc_at')}</InputLabel>
        return (<FormControl className={this.props.classes.formControl}>
            <TextField
                key="date"
                label={I18n.t('sc_date')}
                value={settings.date}
                onChange={e => {
                    const settings = JSON.parse(JSON.stringify(this.state[type]));
                    settings.date = e.target.value;
                    this.setState({[type]: settings}, () => this.recalcCron());
                }}
                InputLabelProps={{shrink: true,}}
                margin="normal"
            />
        </FormControl>);
    }

    getOnceElements() {
        return (<div style={{marginLeft: 8}}>
            {this.getControlsTime('once')}
            {this.getControlsDate('once')}
            </div>);
    }

    getIntervalElements() {
        return this.getControlsPeriodElements('interval');
    }

    getIntervalBetweenElements() {
        const settings = this.state.intervalBetween;
        return [
            this.getControlsPeriodElements('intervalBetween'),
            (<div key="between" style={{paddingLeft: 8, display: 'inline-block', verticalAlign: 'top'}}>
                <h5 style={{marginBottom: 5}}>{I18n.t('sc_hours')}</h5>
                <FormControl className={this.props.classes.formControl}>
                    <InputLabel shrink htmlFor="age-label-placeholder">{I18n.t('sc_from')}</InputLabel>
                    <Select
                    style={{width: 100}}
                    value={settings.timeFrom}
                    onChange={e => {
                        const settings = JSON.parse(JSON.stringify(this.state.intervalBetween));
                        settings.timeFrom = parseInt(e.target.value, 10);
                        this.setState({intervalBetween: settings}, () => this.recalcCron());
                    }}>
                    {[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23].map(hour => (<MenuItem key={'B_' + hour} value={hour}>{padding(hour) + ':00'}</MenuItem>))}
                </Select>
                </FormControl>
                <FormControl className={this.props.classes.formControl}>
                    <InputLabel shrink htmlFor="age-label-placeholder">{I18n.t('sc_to')}</InputLabel>
                    <Select
                        style={{width: 100}}
                        value={settings.timeTo}
                        onChange={e => {
                            const settings = JSON.parse(JSON.stringify(this.state.intervalBetween));
                            settings.timeTo = parseInt(e.target.value, 10);
                            this.setState({intervalBetween: settings}, () => this.recalcCron());
                        }}>
                        {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24].map(hour => (<MenuItem key={'A_' + hour} value={hour}>{padding(hour) + ':00'}</MenuItem>))}
                    </Select>
                </FormControl>
            </div>),
            this.getControlsWeekdaysElements('intervalBetween')
        ];
    }

    getSpecificTimeElements() {
        return [
            (<div key="time" style={{marginLeft: 8}}>{this.getControlsTime('specific')}</div>),
            this.getControlsWeekdaysElements('specific')
        ]
    }

    onModeChange(mode) {
        if (mode !== this.state.mode) {
            this.setState({mode}, () => this.recalcCron());
        }
    }

    onChange(cron) {
        if (cron !== this.state.cron) {
            this.setState({cron});
            this.props.onChange && this.props.onChange(cron);
        }
    }

    render() {
        return (
            <div className={this.props.classes.mainDiv}>
                <div style={{paddingLeft: 8, width: '100%'}}><TextField style={{width: '100%'}} value={this.state.cron} disabled={true}/></div>
                <div style={{paddingLeft: 8, width: '100%', height: 60}}>{convertCronToText(this.state.cron, this.props.language || 'en')}</div>
                <div><FormControl style={{marginLeft: 8, marginTop: 8}} className={this.props.classes.formControl}>
                    <InputLabel>{I18n.t('Repeat')}</InputLabel>
                    <Select
                        value={this.state.mode}
                        onChange={e => this.onModeChange(e.target.value)}
                        inputProps={{name: 'mode', id: 'mode',}}>
                        {Object.keys(PERIODIC).map(mode => (<MenuItem key={PERIODIC[mode]} value={PERIODIC[mode]}>{I18n.t('sc_' + PERIODIC[mode])}</MenuItem>))}
                    </Select>
                </FormControl></div>
                {this.state.mode === PERIODIC.once && this.getOnceElements()}
                {this.state.mode === PERIODIC.interval && this.getIntervalElements()}
                {this.state.mode === PERIODIC.intervalBetween && this.getIntervalBetweenElements()}
                {this.state.mode === PERIODIC.specific && this.getSpecificTimeElements()}
            </div>
        );
    }
}

SimpleCron.propTypes = {
    cronExpression: PropTypes.string,
    onChange: PropTypes.func,
    language: PropTypes.string,
};

export default withStyles(styles)(SimpleCron);

