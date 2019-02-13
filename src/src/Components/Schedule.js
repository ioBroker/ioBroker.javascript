import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@material-ui/core/styles';
import Input from '@material-ui/core/Input';
import Radio from '@material-ui/core/Radio';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import Checkbox from '@material-ui/core/Checkbox';
import MaskedInput from 'react-text-mask';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import TextField from "@material-ui/core/TextField";

import I18n from '../i18n';

const styles = theme => ({
    hr: {
        border: 0,
        borderTop: '1px solid gray'
    },
    scrollWindow: {
        width: '100%',
        overflow: 'auto',
        height: 'calc(100% - 22px)'
    },
    rowDiv: {
        width: '100%',
    },
    modeDiv: {
        width: 200,
        display: 'inline-block',
        verticalAlign: 'top'
    },
    settingsDiv: {
        display: 'inline-block',
        verticalAlign: 'top'
    },
    inputTime: {
        width: 90,
        marginTop: 0,
        marginLeft: 5
    },
    inputDate: {
        width: 140,
        marginTop: 0,
        marginLeft: 5
    },
    inputEvery: {
        width: 40,
        marginLeft: 5,
        marginRight: 5,
    },
    inputRadio: {
        padding: '4px 12px',
        verticalAlign: 'top'
    },
    inputGroup: {
        maxWidth: 400,
        display: 'inline-block'
    },
    inputGroupElement: {
        width: 120,
    },
    inputDateDay: {
        width: 60,
    },
    inputDateDayCheck: {
        padding: 4,
    },
    inputSmallCheck: {
        padding: 0,
    },
    rowOnce: {

    },

    rowDays: {
        background: '#ddeaff'
    },
    rowDows: {
        background: '#DDFFDD'
    },
    rowDates: {
        background: '#DDDDFF'
    },
    rowWeeks: {
        background: '#DDDDFF'
    },
    rowMonths: {
        background: '#DDFFFF'
    },
    rowMonthsDates: {
        background: '#EEFFFF',
        maxWidth: 600
    },
    rowYears: {
        background: '#fbffdd'
    },
    rowDaysDows: {
        background: '#EEEAFF',
        paddingLeft: 10,
        paddingBottom: 10
    },
    rowDowsDows: {
        background: '#EEFFEE',
        paddingLeft: 10,
        paddingBottom: 10
    }
});

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
const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
];
const PERIODS = {
    'minutes': 'minutes',
    'hours': 'hours',
};
const ASTRO = [
    'sunrise',
    'sunriseEnd',
    'goldenHourEnd',
    'solarNoon',
    'goldenHour',
    'sunsetStart',
    'sunset',
    'dusk',
    'nauticalDusk',
    'night',
    'nightEnd',
    'nauticalDawn',
    'dawn',
    'nadir',
];

function padding(num) {
    if (num < 10) return '0' + num;
    return '' + num;
}

function TextTime(props) {
    const { inputRef, ...other } = props;

    return (
        <MaskedInput
            {...other}
            ref={inputRef}
            mask={[/[0-2]/, /[0-9]/, ':', /[0-5]/, /[0-9]/]}
            placeholderChar={props.placeholder || '00:00'}
            showMask
        />
    );
}

TextTime.propTypes = {
    inputRef: PropTypes.func.isRequired,
};

function TextDate(props) {
    const { inputRef, ...other } = props;

    return (
        <MaskedInput
            {...other}
            ref={inputRef}
            mask={[/[0-3]/, /[0-9]/, '.', /[0-1]/, /[0-9]/, '.', '2', '0', /[0-9]/, /[0-9]/]}
            placeholderChar={props.placeholder || '01.01.2019'}
            showMask
        />
    );
}

TextDate.propTypes = {
    inputRef: PropTypes.func.isRequired,
};

const DEFAULT = {
    time: {
        exactTime: false,

        start: '00:00',
        end: '23:59',

        mode: 'hours',
        interval: 1,
    },
    period: {
        once: '',
        days: 1,
        dows: '',
        dates: '',
        weeks: 0,
        months: '',

        years: 0,
        yearMonth: 0,
        yearDate: 0,
    },
    valid: {
        from: '',
        to: ''
    }
};
function string2USdate(date) {
    const parts = date.split('.');
    if (parts.length === 3) {
        return parts[2] + '-' + parts[1] + '-' + parts[0];
    }

}
class Schedule extends React.Component {
    constructor(props) {
        super(props);
        let schedule;
        if (this.props.schedule && typeof this.props.schedule === 'string' && this.props.schedule[0] === '{') {
            try {
                schedule = JSON.parse(this.props.schedule);
            } catch (e) {

            }
        }

        if ((!schedule || !Object.keys(schedule).length) && this.props.onChange) {
            setTimeout(() => this.onChange(this.state.schedule, true), 200);
        }
        schedule = schedule || {};
        schedule = Object.assign({}, DEFAULT, schedule);
        schedule.valid.from = schedule.valid.from || this.now2string();

        this.state = {
            schedule,
            desc: this.state2text(schedule)
        };

        if (JSON.stringify(schedule) !== this.props.schedule) {
            setTimeout(() => this.props.onChange && this.props.onChange(JSON.stringify(schedule)), 100);
        }
    }

    onChange(schedule, force) {
        const isDiff = JSON.stringify(schedule) !== JSON.stringify(this.state.schedule);
        if (force || isDiff) {
            isDiff && this.setState({schedule, desc: this.state2text(schedule)});
            const copy = JSON.parse(JSON.stringify(schedule));
            if (copy.period.once) {
                let once = copy.period.once;
                delete copy.period;
                copy.period = {once};
                delete copy.valid;
            } else
            if (copy.period.days) {
                let days = copy.period.days;
                let dows = copy.period.dows;
                delete copy.period;
                copy.period = {days};
                if (dows && dows !== '[]') {
                    copy.period.dows = dows;
                }
            } else
            if (copy.period.weeks) {
                let weeks = copy.period.weeks;
                let dows = copy.period.dows;
                delete copy.period;
                copy.period = {weeks};
                if (dows && dows !== '[]') {
                    copy.period.dows = dows;
                }
            } else
            if (copy.period.months) {
                let months = copy.period.months;
                let dates = copy.period.dates;
                delete copy.period;
                copy.period = {months};
                if (dates && dates !== '[]') {
                    copy.period.dates = dates;
                }
            } else
            if (copy.period.years) {
                let years = copy.period.years;
                let yearMonth = copy.period.yearMonth;
                let yearDate = copy.period.yearDate;
                delete copy.period;
                copy.period = {years, yearDate};
                if (yearMonth) {
                    copy.period.yearMonth = yearMonth;
                }
            }

            if (copy.time.exactTime) {
                delete copy.time.end;
                delete copy.time.mode;
                delete copy.time.interval;
            } else {
                delete copy.time.exactTime;
            }
            if (copy.valid) {
                if (!copy.valid.to) {
                    delete copy.valid.to;
                }
                if (copy.period.days === 1 || copy.period.weeks === 1 || copy.period.months === 1 || copy.period.years === 1) {
                    const from = this.string2date(copy.valid.from);
                    const today = new Date();
                    today.setHours(0);
                    today.setMinutes(0);
                    today.setSeconds(0);
                    today.setMilliseconds(0);
                    if (from <= today) {
                        delete copy.valid.from;
                    }
                }
                if (!copy.valid.from && !copy.valid.to) {
                    delete copy.valid;
                }
            }

            this.props.onChange && this.props.onChange(JSON.stringify(copy));
        }
    }

    state2text(schedule) {
        let desc = [];
        let validFrom = this.string2date(schedule.valid.from);
        if (schedule.period.once) {
            // once
            let once = this.string2date(schedule.period.once);
            let now = new Date();
            now.setMilliseconds(0);
            now.setSeconds(0);
            now.setMinutes(0);
            now.setHours(0);

            //
            if (once < now) {
                // will ne be not executed any more, because start is in the past
                return I18n.t('sch_desc_onceInPast');
            } else {
                // only once
                desc.push(I18n.t('sch_desc_once_on', schedule.period.once));
            }
        } else
        if (schedule.period.days) {
            if (schedule.period.days === 1) {
                if (schedule.period.dows) {
                    const dows = JSON.parse(schedule.period.dows);
                    if (dows.length === 2 && dows[0] === 0 && dows[1] === 6) {
                        // on weekends
                        desc.push(I18n.t('sch_desc_onWeekends'));
                    } else if (dows.length === 5 && dows[0] === 1 && dows[1] === 2 && dows[2] === 3 && dows[3] === 4 && dows[4] === 5) {
                        // on workdays
                        desc.push(I18n.t('sch_desc_onWorkdays'));
                    } else {
                        const tDows = dows.map(day => I18n.t(WEEKDAYS[day]));
                        if (tDows.length === 1) {
                            // on Monday
                            desc.push(I18n.t('sch_desc_onWeekday', tDows[0]));
                        } else if (tDows.length === 7) {
                            // on every day
                            desc.push(I18n.t('sch_desc_everyDay'));
                        } else {
                            const last = tDows.pop();
                            // on Monday and Sunday
                            desc.push(I18n.t('sch_desc_onWeekdays', tDows.join(', '), last));
                        }
                    }
                } else {
                    desc.push(I18n.t('sch_desc_everyDay'));
                }
            } else {
                desc.push(I18n.t('sch_desc_everyNDay', schedule.period.days));
            }
        } else
        if (schedule.period.weeks) {
            if (schedule.period.weeks === 1) {
                desc.push(I18n.t('sch_desc_everyWeek'));
            } else {
                desc.push(I18n.t('sch_desc_everyNWeeks', schedule.period.weeks));
            }

            if (schedule.period.dows) {
                const dows = JSON.parse(schedule.period.dows);
                if (dows.length === 2 && dows[0] === 0 && dows[1] === 6) {
                    // on weekends
                    desc.push(I18n.t('sch_desc_onWeekends'));
                } else if (dows.length === 5 && dows[0] === 1 && dows[1] === 2 && dows[2] === 3 && dows[3] === 4 && dows[4] === 5) {
                    // on workdays
                    desc.push(I18n.t('sch_desc_onWorkdays'));
                } else {
                    const tDows = dows.map(day => I18n.t(WEEKDAYS[day]));
                    if (tDows.length === 1) {
                        // on Monday
                        desc.push(I18n.t('sch_desc_onWeekday', tDows[0]));
                    } else if (tDows.length === 7) {
                        // on every day
                        desc.push(I18n.t('sch_desc_everyDay'));
                    } else {
                        const last = tDows.pop();
                        // on Monday and Sunday
                        desc.push(I18n.t('sch_desc_onWeekdays', tDows.join(', '), last));
                    }
                }
            } else {
                return I18n.t('sch_desc_never');
            }
        } else
        if (schedule.period.months) {
            if (schedule.period.dates) {
                const dates = JSON.parse(schedule.period.dates);
                if (dates.length === 1) {
                    // in 1 of month
                    desc.push(I18n.t('sch_desc_onDate', dates[0]));
                } else if (dates.length === 31) {
                    desc.push(I18n.t('sch_desc_onEveryDate'));
                } else if (!dates.length) {
                    return I18n.t('sch_desc_never');
                } else {
                    const last = dates.pop();
                    // in 1 and 4 of month
                    desc.push(I18n.t('sch_desc_onDates', dates.join(', '), last));
                }
            } else {
                desc.push(I18n.t('sch_desc_onEveryDate'));
            }

            if (schedule.period.months === 1) {
                desc.push(I18n.t('sch_desc_everyMonth'));
            } else if (typeof schedule.period.months === 'number') {
                desc.push(I18n.t('sch_desc_everyNMonths', schedule.period.months));
            } else {
                const months = JSON.parse(schedule.period.months);
                const tMonths = months.map(month => I18n.t(MONTHS[month - 1]));
                if (!tMonths.length) {
                    // in January
                    return I18n.t('sch_desc_never');
                } else if (tMonths.length === 1) {
                    // in January
                    desc.push(I18n.t('sch_desc_onMonth', tMonths[0]));
                } else if (tMonths.length === 12) {
                    // every month
                    desc.push(I18n.t('sch_desc_everyMonth'));
                } else {
                    const last = tMonths.pop();
                    // in January and May
                    desc.push(I18n.t('sch_desc_onMonths', tMonths.join(', '), last));
                }
            }
        }
        else
        if (schedule.period.years) {
            if (schedule.period.years === 1) {
                desc.push(I18n.t('sch_desc_everyYear'));
            } else {
                desc.push(I18n.t('sch_desc_everyNYears', schedule.period.years));
            }
            desc.push(I18n.t('sch_desc_onDate', schedule.period.yearDate, schedule.period.yearMonth ? I18n.t(MONTHS[schedule.period.yearMonth - 1]) : I18n.t('sch_desc_everyMonth')));
        }

        // time
        if (schedule.time.exactTime) {
            if (ASTRO.indexOf(schedule.time.start) !== -1) {
                // at sunset
                desc.push(I18n.t('sch_desc_atTime', I18n.t('sch_astro_' + schedule.time.start)));
            } else {
                // at HH:MM
                desc.push(I18n.t('sch_desc_atTime', schedule.time.start));
            }
        } else {
            if (schedule.time.mode === PERIODS.minutes) {
                if (schedule.time.interval === 1) {
                    // every minute
                    desc.push(I18n.t('sch_desc_everyMinute'));
                } else {
                    // every N minutes
                    desc.push(I18n.t('sch_desc_everyNMinutes', schedule.time.interval));
                }
            } else {
                if (schedule.time.interval === 1) {
                    // every minute
                    desc.push(I18n.t('sch_desc_everyHour'));
                } else {
                    // every N minutes
                    desc.push(I18n.t('sch_desc_everyNHours', schedule.time.interval));
                }
            }
            const start = ASTRO.indexOf(schedule.time.start) !== -1 ? I18n.t('sch_astro_' + schedule.time.start) : schedule.time.start;
            const end = ASTRO.indexOf(schedule.time.end) !== -1 ? I18n.t('sch_astro_' + schedule.time.end) : schedule.time.end;
            if (start !== '00:00' || (end !== '24:00' && end !== '23:59')) {
                // from HH:mm to HH:mm
                desc.push(I18n.t('sch_desc_intervalFromTo', start, end));
            }
        }

        if (!schedule.period.once) {
            // valid
            if (validFrom.getTime() > Date.now() && schedule.valid.to) {
                // from XXX to XXXX
                desc.push(I18n.t('sch_desc_validFromTo', schedule.valid.from, schedule.valid.to));
            } else if (validFrom.getTime() > Date.now()) {
                // from XXXX
                desc.push(I18n.t('sch_desc_validFrom', schedule.valid.from));
            } else if (schedule.valid.to) {
                // till XXXX
                desc.push(I18n.t('sch_desc_validTo', schedule.valid.to));
            }
        }
        return desc.join(' ');
    }

    getTimePeriodElements() {
        const schedule = this.state.schedule;
        let wholeDay = false;
        let day = false;
        let night = false;
        let fromTo = true;
        if (schedule.time.start === '00:00' && schedule.time.end === '24:00') {
            wholeDay = true;
            fromTo = false;
        } else if (schedule.time.start === 'sunrise') {
            day = true;
            fromTo = false;
        } else if (schedule.time.start === 'sunset') {
            night = true;
            fromTo = false;
        }

        return (
            <div key="timePeriod" className={this.props.classes.rowDiv}>
                <div className={this.props.classes.modeDiv}>
                    <FormControlLabel control={<Radio className={this.props.classes.inputRadio} checked={!schedule.time.exactTime} onClick={() => {
                        const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                        _schedule.time.exactTime = false;
                        this.onChange(_schedule);
                    }}/>} label={I18n.t('sch_intervalTime')} />
                </div>
                <div className={this.props.classes.settingsDiv}>
                    <div className={this.props.classes.settingsDiv}>
                        {!schedule.time.exactTime && (<div>
                            <div><FormControlLabel control={<Radio className={this.props.classes.inputRadio} checked={fromTo} onClick={() => {
                                const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                _schedule.time.start = '00:00';
                                _schedule.time.end = '23:59';
                                this.onChange(_schedule);
                            }}/>} label={!fromTo ? I18n.t('sch_fromTo') : ''} />
                                {fromTo && [
                                    (<TextField
                                        className={this.props.classes.inputTime}
                                        style={{marginRight: 10}}
                                        key="exactTimeFrom"
                                        type="time"
                                        value={this.state.schedule.time.start}
                                        //InputProps={{inputComponent: TextTime}}
                                        onChange={e => {
                                            const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                            _schedule.time.start = e.target.value;
                                            this.onChange(_schedule);
                                        }}
                                        InputLabelProps={{shrink: true,}}
                                        label={I18n.t('sch_from')}
                                        margin="normal"
                                    />),
                                    (<TextField
                                        className={this.props.classes.inputTime}
                                        key="exactTimeTo"
                                        type="time"
                                        value={this.state.schedule.time.end}
                                        //InputProps={{inputComponent: TextTime}}
                                        onChange={e => {
                                            const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                            _schedule.time.end = e.target.value;
                                            this.onChange(_schedule);
                                        }}
                                        InputLabelProps={{shrink: true,}}
                                        label={I18n.t('sch_to')}
                                        margin="normal"
                                    />)
                                ]}
                            </div>
                        </div>)}

                        {!schedule.time.exactTime && (<div><FormControlLabel control={<Radio className={this.props.classes.inputRadio} checked={wholeDay} onClick={() => {
                            const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                            _schedule.time.start = '00:00';
                            _schedule.time.end = '24:00';
                            this.onChange(_schedule);
                        }}/>} label={I18n.t('sch_wholeDay')} /></div>) }

                        {!schedule.time.exactTime && (<div><FormControlLabel control={<Radio className={this.props.classes.inputRadio} checked={day} onClick={() => {
                            const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                            _schedule.time.start = 'sunrise';
                            _schedule.time.end = 'sunset';
                            this.onChange(_schedule);
                        }}/>} label={I18n.t('sch_astroDay')} /></div>) }

                        {!schedule.time.exactTime && (<div><FormControlLabel control={<Radio className={this.props.classes.inputRadio} checked={night} onClick={() => {
                            const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                            _schedule.time.start = 'sunset';
                            _schedule.time.end = 'sunrise';
                            this.onChange(_schedule);
                        }}/>} label={I18n.t('sch_astroNight')} /></div>) }
                    </div>
                    {!schedule.time.exactTime && this.getPeriodSettingsMinutes()}
                </div>
            </div>);
    }

    getTimeExactElements() {
        const isAstro = ASTRO.indexOf(this.state.schedule.time.start) !== -1;

        return (<div key="timeExact"  className={this.props.classes.rowDiv}>
            <div className={this.props.classes.modeDiv}>
                <FormControlLabel control={<Radio className={this.props.classes.inputRadio} checked={this.state.schedule.time.exactTime} onClick={() => {
                    const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                    schedule.time.exactTime = true;
                    this.onChange(schedule);
                }}/>} label={I18n.t('sch_exactTime')} />
            </div>
            {this.state.schedule.time.exactTime &&
                (<Select value={isAstro ? this.state.schedule.time.start : '00:00'}
                         onChange={e => {
                             const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                             _schedule.time.start = e.target.value;
                             this.onChange(_schedule);
                         }}
                >
                    <MenuItem key="specific" value={'00:00'}>{I18n.t('sch_specificTime')}</MenuItem>
                    {ASTRO.map(event => (<MenuItem key={event} value={event}>{I18n.t('sch_astro_' + event)}</MenuItem>))}
                </Select>)
            }
            {this.state.schedule.time.exactTime && !isAstro &&
                (<div className={this.props.classes.settingsDiv}><TextField
                    className={this.props.classes.inputTime}
                    key="exactTimeValue"
                    value={this.state.schedule.time.start}
                    type="time"
                    // inputComponent={TextTime}
                    onChange={e => {
                        const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                        _schedule.time.start = e.target.value;
                        this.onChange(_schedule);
                    }}
                    InputLabelProps={{shrink: true,}}
                    margin="normal"
                /></div>)
            }
        </div>)
    }

    getDivider() {
        return (<hr className={this.props.classes.hr}/>);
    }

    getPeriodModes() {
        const schedule = this.state.schedule;
        const isOnce = !schedule.period.dows && !schedule.period.months && !schedule.period.dates && !schedule.period.years && !schedule.period.days && !schedule.period.weeks;
        if (isOnce && !schedule.period.once) {
            schedule.period.once = this.now2string(true);
        }

        return [
            // ----- once ---
            (<div key="once" className={this.props.classes.rowDiv + ' ' + this.props.classes.rowOnce}>
                <div className={this.props.classes.modeDiv}>
                    <FormControlLabel control={(<Radio className={this.props.classes.inputRadio} checked={isOnce} onClick={() => {
                                    const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                    _schedule.period.once = _schedule.period.once || this.now2string(true);
                                    _schedule.period.dows = '';
                                    _schedule.period.months = '';
                                    _schedule.period.dates = '';
                                    _schedule.period.years = 0;
                                    _schedule.period.yearDate = 0;
                                    _schedule.period.yearMonth = 0;
                                    _schedule.period.weeks = 0;
                                    _schedule.period.days = 0;
                                    this.onChange(_schedule);
                                }}/>)}
                              label={I18n.t('sch_periodOnce')} />
                </div>
                {isOnce && (<div className={this.props.classes.settingsDiv}>
                    {<TextField
                        className={this.props.classes.inputDate}
                        type="date"
                        key="exactDateAt"
                        value={string2USdate(schedule.period.once)}
                        //InputProps={{inputComponent: TextTime}}
                        onChange={e => {
                            const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                            const date = this.string2date(e.target.value);
                            _schedule.period.once = padding(date.getDate()) + '.' + padding(date.getMonth() + 1) + '.' + date.getFullYear();
                            this.onChange(_schedule);
                        }}
                        InputLabelProps={{shrink: true,}}
                        label={I18n.t('sch_at')}
                        margin="normal"
                    />}
                </div>)}
            </div>),


            // ----- days ---
            (<div key="days" className={this.props.classes.rowDiv + ' ' + this.props.classes.rowDays}>
                <div className={this.props.classes.modeDiv}>
                    <FormControlLabel control={(<Radio className={this.props.classes.inputRadio} checked={!!schedule.period.days} onClick={() => {
                               const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                _schedule.period.days = 1;
                                _schedule.period.dows = '';
                                _schedule.period.months = '';
                                _schedule.period.dates = '';
                                _schedule.period.years = 0;
                                _schedule.period.yearDate = 0;
                                _schedule.period.yearMonth = 0;
                                _schedule.period.weeks = 0;
                                _schedule.period.once = '';
                               this.onChange(_schedule);
                           }}/>)}
                           label={I18n.t('sch_periodDaily')} />
                </div>
                <div className={this.props.classes.settingsDiv}>
                    {this.getPeriodSettingsDaily()}
                    {schedule.period.days ? this.getPeriodSettingsWeekdays() : null}
                </div>
            </div>),


            // ----- days of weeks ---
            /*!schedule.period.days && (
                <div key="dows" className={this.props.classes.rowDiv + ' ' + this.props.classes.rowDows}>
                    <div className={this.props.classes.modeDiv}>
                        <FormControlLabel control={(<Radio className={this.props.classes.inputRadio} checked={!!schedule.period.dows} onClick={() => {
                            const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                            schedule.period.dows = schedule.period.dows ? '' : '[0,1,2,3,4,5,6]';
                            this.onChange(schedule);
                        }}/>)}
                        label={I18n.t('sch_periodWeekdays')} />
                    </div>
                    <div className={this.props.classes.settingsDiv}>
                        {this.getPeriodSettingsWeekdays()}
                    </div>
                </div>),
*/
            // ----- weeks ---
            (<div key="weeks" className={this.props.classes.rowDiv + ' ' + this.props.classes.rowDows}>
                <div className={this.props.classes.modeDiv}>
                    <FormControlLabel control={(<Radio className={this.props.classes.inputRadio} checked={!!schedule.period.weeks} onClick={() => {
                        const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                        _schedule.period.weeks = schedule.period.weeks ? 0 : 1;
                        _schedule.period.dows = schedule.period.dows || '[0]';
                        _schedule.period.months = '';
                        _schedule.period.dates = '';
                        _schedule.period.years = 0;
                        _schedule.period.yearDate = 0;
                        _schedule.period.yearMonth = 0;
                        _schedule.period.days = 0;
                        _schedule.period.once = '';
                        this.onChange(_schedule);
                    }}/>)}
                    label={I18n.t('sch_periodWeekly')} />
                </div>
                <div className={this.props.classes.settingsDiv}>
                    <div className={this.props.classes.settingsDiv}>{this.getPeriodSettingsWeekly()}</div>
                    <div className={this.props.classes.settingsDiv + ' ' + this.props.classes.rowDowsDows}>{this.state.schedule.period.weeks ? this.getPeriodSettingsWeekdays() : null}</div>
                </div>
            </div>),


            // ----- months ---
            (<div key="months" className={this.props.classes.rowDiv + ' ' + this.props.classes.rowMonths}>
                <div className={this.props.classes.modeDiv}>
                    <FormControlLabel control={(<Radio className={this.props.classes.inputRadio} checked={!!schedule.period.months} onClick={() => {
                           const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                            _schedule.period.months = 1;
                            _schedule.period.dows = '';
                            _schedule.period.dates = '';
                            _schedule.period.years = 0;
                            _schedule.period.yearDate = 0;
                            _schedule.period.yearMonth = 0;
                            _schedule.period.weeks = 0;
                            _schedule.period.days = 0;
                            _schedule.period.once = '';
                           this.onChange(_schedule);
                       }}/>)}
                       label={I18n.t('sch_periodMonthly')} />
                </div>
                <div className={this.props.classes.settingsDiv}>
                    {this.getPeriodSettingsMonthly()}
                    {schedule.period.months ? (<div>
                        <div className={this.props.classes.settingsDiv + ' ' + this.props.classes.rowMonthsDates}>
                            <FormControlLabel control={(<Checkbox className={this.props.classes.inputRadio} checked={!!schedule.period.dates} onClick={() => {
                                const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                _schedule.period.months = _schedule.period.months || 1;
                                const dates = [];
                                for (let i = 1; i <= 31; i++) {
                                    dates.push(i);
                                }
                                _schedule.period.dates = _schedule.period.dates || JSON.stringify(dates);
                                _schedule.period.dows = '';
                                _schedule.period.years = 0;
                                _schedule.period.yearDate = 0;
                                _schedule.period.yearMonth = 0;
                                _schedule.period.weeks = 0;
                                _schedule.period.days = 0;
                                _schedule.period.once = '';

                                this.onChange(_schedule);
                            }}/>)}
                            label={I18n.t('sch_periodDates')} /></div>
                        <div className={this.props.classes.settingsDiv + ' ' + this.props.classes.rowMonthsDates}>
                            {this.getPeriodSettingsDates()}
                        </div>
                    </div>) : null}
                </div>
            </div>),


            // ----- years ---
            (<div key="years" className={this.props.classes.rowDiv + ' ' + this.props.classes.rowYears}>
                <div className={this.props.classes.modeDiv}>
                    <FormControlLabel control={(<Radio className={this.props.classes.inputRadio} checked={!!schedule.period.years} onClick={() => {
                       const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                        _schedule.period.years = 1;
                        _schedule.period.yearDate = 1;
                        _schedule.period.yearMonth = 1;
                        _schedule.period.dows = '';
                        _schedule.period.months = 0;
                        _schedule.period.dates = '';
                        _schedule.period.weeks = 0;
                        _schedule.period.days = 0;
                        _schedule.period.once = '';
                       this.onChange(_schedule);
                   }}/>)}
                   label={I18n.t('sch_periodYearly')} />
                </div>
                <div className={this.props.classes.settingsDiv}>
                    <div className={this.props.classes.settingsDiv}>{this.getPeriodSettingsYearly()}</div>
                    {!!schedule.period.years && (<div className={this.props.classes.settingsDiv}>
                        <span>{I18n.t('sch_on')}</span>
                        <Input key="input" value={this.state.schedule.period.yearDate} className={this.props.classes.inputEvery} type="number" min="1" max="31" onChange={e => {
                            const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                            _schedule.period.yearDate = parseInt(e.target.value, 10);
                            this.onChange(_schedule);
                        }} />
                        <Select value={schedule.period.yearMonth}
                             onChange={e => {
                                 const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                 _schedule.period.yearMonth = e.target.value;
                                 this.onChange(_schedule);
                             }}
                        >
                            <MenuItem key="every" value={0}>{I18n.t('sch_yearEveryMonth')}</MenuItem>
                            {MONTHS.map((month, i) => (<MenuItem key={month} value={i + 1}>{I18n.t(month)}</MenuItem>))}
                        </Select>
                    </div>)}
                </div>
            </div>),
        ];
    }

    getPeriodSettingsMinutes() {
        return (<div style={{display: 'inline-block'}}>
            <label>{I18n.t('sch_every')}</label>
            <Input value={this.state.schedule.time.interval}
                   style={{ verticalAlign: 'bottom'}}
                   className={this.props.classes.inputEvery} type="number" min="1" onChange={e => {
                const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                _schedule.time.interval = parseInt(e.target.value, 10);
                this.onChange(_schedule);
            }} />
            <Select value={this.state.schedule.time.mode}
                    onChange={e => {
                        const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                        _schedule.time.mode = e.target.value;
                        this.onChange(_schedule);
                    }}
            >
                <MenuItem value={PERIODS.minutes}>{I18n.t('sch_periodMinutes')}</MenuItem>
                <MenuItem value={PERIODS.hours}>{I18n.t('sch_periodHours')}</MenuItem>
            </Select>
        </div>);
    }

    getPeriodSettingsWeekdays() {
        // || this.state.schedule.period.dows === '[1, 2, 3, 4, 5]' || this.state.schedule.period.dows === '[0, 6]'
        const schedule = this.state.schedule;
        const isSpecific = schedule.period.dows && schedule.period.dows !== '[1, 2, 3, 4, 5]' && schedule.period.dows !== '[0, 6]';
        return [
            (<div key="workdays"><FormControlLabel control={(<Radio className={this.props.classes.inputRadio} checked={schedule.period.dows === '[1, 2, 3, 4, 5]'} onClick={() => {
                    const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                    _schedule.period.dows = '[1, 2, 3, 4, 5]';
                    if (_schedule.period.days) {
                        _schedule.period.days = 1;
                    }
                    this.onChange(_schedule);
                }}/>)}
                label={I18n.t('sch_periodWorkdays')} /></div>),

            (<div key="weekend"><FormControlLabel control={(<Radio className={this.props.classes.inputRadio} checked={schedule.period.dows === '[0, 6]'} onClick={() => {
                    const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                    _schedule.period.dows = '[0, 6]';
                    if (_schedule.period.days) {
                        _schedule.period.days = 1;
                    }
                    this.onChange(_schedule);
                }}/>)}
                label={I18n.t('sch_periodWeekend')} /></div>),

            (<div key="specific" style={{verticalAlign: 'top'}}><FormControlLabel style={{verticalAlign: 'top'}}
                                                                   control={(<Radio className={this.props.classes.inputRadio} checked={isSpecific} onClick={() => {
                    const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                    _schedule.period.dows = '[0,1,2,3,4,5,6]';
                    if (_schedule.period.days) {
                        _schedule.period.days = 1;
                    }
                    this.onChange(_schedule);
                }}/>)
                }
                label={I18n.t('sch_periodWeekdays')} />
                {isSpecific && (schedule.period.days === 1 || schedule.period.weeks) && (<FormGroup row className={this.props.classes.inputGroup} style={{width: 150}}>
                    {[1,2,3,4,5,6,0].map(i =>
                        (<FormControlLabel key={'specific_' + i} className={this.props.classes.inputGroupElement} control={
                              <Checkbox className={this.props.classes.inputSmallCheck} checked={schedule.period.dows.indexOf('' + i) !== -1}
                                    onChange={e => {
                                        const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                        let dows;
                                        try {
                                            dows = JSON.parse(_schedule.period.dows);
                                        } catch (e) {
                                            dows = [];
                                        }
                                        if (e.target.checked && dows.indexOf(i) === -1) {
                                            dows.push(i);
                                        } else if (!e.target.checked && dows.indexOf(i) !== -1) {
                                            dows.splice(dows.indexOf(i), 1);
                                        }
                                        dows.sort((a, b) => a - b);
                                        _schedule.period.dows = JSON.stringify(dows);
                                        if (_schedule.period.days) {
                                            _schedule.period.days = 1;
                                        }
                                        this.onChange(_schedule);
                                    }}
                              />
                          }
                          label={I18n.t(WEEKDAYS[i])}
                        />))}
                </FormGroup>)}
            </div>),
            ];
    }

    getPeriodSettingsDaily() {
        if (!this.state.schedule.period.days) {
            return;
        }
        const schedule = this.state.schedule;
        return [
            (<div key="every_day"><FormControlLabel control={(<Radio className={this.props.classes.inputRadio} checked={schedule.period.days === 1 && !schedule.period.dows} onClick={() => {
                                   const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                    _schedule.period.days = 1;
                                    _schedule.period.dows = '';
                                   this.onChange(_schedule);
                               }}/>)}
                                    label={I18n.t('sch_periodEveryDay')} /></div>),
            (<div key="everyN_day"><FormControlLabel control={(<Radio className={this.props.classes.inputRadio} checked={schedule.period.days > 1} onClick={() => {
                                    const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                    _schedule.period.days = 2;
                                    _schedule.period.dows = '';
                                    this.onChange(_schedule);
                               }}/>)}
                                    label={I18n.t('sch_periodEvery')} />
                {schedule.period.days > 1 && [(<Input key="input" value={this.state.schedule.period.days} className={this.props.classes.inputEvery} type="number" min="2" onChange={e => {
                    const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                    _schedule.period.days = parseInt(e.target.value, 10);
                    _schedule.period.dows = '';
                    this.onChange(_schedule);
                }} />), (<span key="span" style={{paddingRight: 10}}>{I18n.t('sch_periodDay')}</span>)]}
            </div>),
            ];
    }

    getPeriodSettingsWeekly() {
        if (!this.state.schedule.period.weeks) {
            return;
        }
        const schedule = this.state.schedule;
        return [
            (<div key="radios" style={{display: 'inline-block', verticalAlign: 'top'}}>
                    <div><FormControlLabel control={(<Radio className={this.props.classes.inputRadio} checked={schedule.period.weeks === 1} onClick={() => {
                                            const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                            _schedule.period.weeks = 1;
                                            this.onChange(_schedule);
                                        }}/>)
                                        }
                                             label={I18n.t('sch_periodEveryWeek')} /></div>
                    <div>
                        <FormControlLabel control={(<Radio className={this.props.classes.inputRadio} checked={schedule.period.weeks > 1} onClick={() => {
                                            const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                            _schedule.period.weeks = 2;
                                            this.onChange(_schedule);
                                        }}/>)
                                        }
                                        label={I18n.t('sch_periodEvery')} />
                        {schedule.period.weeks > 1 && [(<Input value={this.state.schedule.period.weeks} className={this.props.classes.inputEvery} type="number" min="2" onChange={e => {
                            const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                            _schedule.period.weeks = parseInt(e.target.value, 10);
                            this.onChange(_schedule);
                        }} />), (<span>{I18n.t('sch_periodWeek')}</span>)]}
                    </div>
                </div>),
            ];
    }

    getPeriodSettingsDates() {
        if (!this.state.schedule.period.dates) {
            return;
        }
        const schedule = this.state.schedule;

        const dates = [];
        for (let i = 1; i <= 31; i++) {
            dates.push(i);
        }

        const parsedDates = JSON.parse(schedule.period.dates);

        return (
            <FormGroup row className={this.props.classes.inputGroup} style={{maxWidth: 620}}>
                <FormControlLabel className={this.props.classes.inputDateDay}
                    control={
                        <Checkbox className={this.props.classes.inputDateDayCheck} checked={parsedDates.length === 31}
                            onChange={e => {
                                const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                const dates = [];
                                for (let i = 1; i <= 31; i++) {
                                    dates.push(i);
                                }
                                _schedule.period.dates = JSON.stringify(dates);
                                this.onChange(_schedule);
                            }}
                      />
                    } label={I18n.t('sch_all')}
                />
                <FormControlLabel className={this.props.classes.inputDateDay}
                    control={
                        <Checkbox className={this.props.classes.inputDateDayCheck} checked={!parsedDates.length}
                            onChange={e => {
                                const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                _schedule.period.dates = '[]';
                                this.onChange(_schedule);
                            }}
                        />
                    } label={I18n.t('sch_no_one')}
                />
                {parsedDates.length !== 31 && !!parsedDates.length && (<FormControlLabel className={this.props.classes.inputDateDay}
                    control={
                        <Checkbox className={this.props.classes.inputDateDayCheck} checked={false}
                            onChange={e => {
                                const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                const result = [];
                                const parsedDates = JSON.parse(_schedule.period.dates);
                                for (let i = 1; i <= 31; i++) {
                                    if (parsedDates.indexOf(i) === -1) {
                                        result.push(i);
                                    }
                                }
                                result.sort((a, b) => a - b);
                                _schedule.period.dates = JSON.stringify(result);
                                this.onChange(_schedule);
                            }}
                        />
                    } label={I18n.t('sch_invert')}
                />)}
                <div/>
            {dates.map(i =>
                (<FormControlLabel key={'date_' + i} className={this.props.classes.inputDateDay} style={!i ? {opacity: 0, cursor: 'default', userSelect: 'none', pointerEvents: 'none'}: {}}
                      control={
                          <Checkbox className={this.props.classes.inputDateDayCheck} checked={JSON.parse(schedule.period.dates).indexOf(i) !== -1}
                                    onChange={e => {
                                        const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                        let dates;
                                        try {
                                            dates = JSON.parse(_schedule.period.dates);
                                        } catch (e) {
                                            dates = [];
                                        }
                                        if (e.target.checked && dates.indexOf(i) === -1) {
                                            dates.push(i);
                                        } else if (!e.target.checked && dates.indexOf(i) !== -1) {
                                            dates.splice(dates.indexOf(i), 1);
                                        }
                                        dates.sort((a, b) => a - b);
                                        _schedule.period.dates = JSON.stringify(dates);
                                        this.onChange(_schedule);
                                    }}
                          />
                      } label={i < 10 ? [(<span key="0" style={{opacity: 0}}>0</span>), (<span key="num">{i}</span>)] : i}
                />))}
            </FormGroup>);
    }

    getPeriodSettingsMonthly() {
        if (!this.state.schedule.period.months) {
            return;
        }
        const schedule = this.state.schedule;
        const parsedMonths = typeof schedule.period.months === 'string' ? JSON.parse(schedule.period.months)  : [];

        return [
            (<div key="every"><FormControlLabel control={(<Radio className={this.props.classes.inputRadio} checked={typeof schedule.period.months === 'number' && schedule.period.months === 1} onClick={() => {
                                        const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                        _schedule.period.months = 1;
                                        this.onChange(schedule);
                                    }}/>)
                                    }
                                    label={I18n.t('sch_periodEveryMonth')} /></div>),
            (<div key="everyN"><FormControlLabel control={(<Radio className={this.props.classes.inputRadio} checked={typeof schedule.period.months === 'number' && schedule.period.months > 1} onClick={() => {
                                        const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                        _schedule.period.months = 2;
                                        this.onChange(_schedule);
                                    }}/>)
                                    }
                                    label={I18n.t('sch_periodEvery')} />
                {typeof schedule.period.months === 'number' && schedule.period.months > 1 && [(<Input value={schedule.period.months} className={this.props.classes.inputEvery} type="number" min="2" onChange={e => {
                    const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                    _schedule.period.months = parseInt(e.target.value, 10);
                    this.onChange(_schedule);
                }} />), (<span>{I18n.t('sch_periodMonth')}</span>)]}
            </div>),
            (<div  key="specific" style={{verticalAlign: 'top'}}><FormControlLabel style={{verticalAlign: 'top'}} control={(<Radio className={this.props.classes.inputRadio} checked={typeof schedule.period.months === 'string'} onClick={() => {
                                        const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                        _schedule.period.months = '[1,2,3,4,5,6,7,8,9,10,11,12]';
                                        this.onChange(_schedule);
                                    }}/>)
                                    }
                                    label={I18n.t('sch_periodSpecificMonths')} />
                {typeof schedule.period.months === 'string' &&
                (<FormGroup row className={this.props.classes.inputGroup}>
                    <FormControlLabel className={this.props.classes.inputDateDay}
                                      control={
                                          <Checkbox className={this.props.classes.inputDateDayCheck} checked={parsedMonths.length === 12}
                                                    onChange={e => {
                                                        const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                                        const months = [];
                                                        for (let i = 1; i <= 12; i++) {
                                                            months.push(i);
                                                        }
                                                        _schedule.period.months = JSON.stringify(months);
                                                        this.onChange(_schedule);
                                                    }}
                                          />
                                      } label={I18n.t('sch_all')}
                    />
                    <FormControlLabel className={this.props.classes.inputDateDay}
                                      control={
                                          <Checkbox className={this.props.classes.inputDateDayCheck} checked={!parsedMonths.length}
                                                    onChange={e => {
                                                        const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                                        _schedule.period.months = '[]';
                                                        this.onChange(_schedule);
                                                    }}
                                          />
                                      } label={I18n.t('sch_no_one')}
                    />
                    {parsedMonths.length !== 12 && !!parsedMonths.length && (<FormControlLabel className={this.props.classes.inputDateDay}
                                                                                             control={
                                                                                                 <Checkbox className={this.props.classes.inputDateDayCheck} checked={false}
                                                                                                           onChange={e => {
                                                                                                               const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                                                                                               const result = [];
                                                                                                               const parsedMonths = JSON.parse(_schedule.period.months);
                                                                                                               for (let i = 1; i <= 12; i++) {
                                                                                                                   if (parsedMonths.indexOf(i) === -1) {
                                                                                                                       result.push(i);
                                                                                                                   }
                                                                                                               }
                                                                                                               result.sort((a, b) => a - b);
                                                                                                               _schedule.period.months = JSON.stringify(result);
                                                                                                               this.onChange(_schedule);
                                                                                                           }}
                                                                                                 />
                                                                                             } label={I18n.t('sch_invert')}
                    />)}
                    <div/>
                    {MONTHS.map((month, i) => (<FormControlLabel className={this.props.classes.inputGroupElement}
                        control={
                            <Checkbox className={this.props.classes.inputSmallCheck} checked={JSON.parse(schedule.period.months).indexOf(i + 1) !== -1}
                                      onChange={e => {
                                          const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                          let months;
                                          try {
                                              months = JSON.parse(_schedule.period.months);
                                          } catch (e) {
                                              months = [];
                                          }
                                          if (e.target.checked && months.indexOf(i + 1) === -1) {
                                              months.push(i + 1);
                                          } else if (!e.target.checked && months.indexOf(i + 1) !== -1) {
                                              months.splice(months.indexOf(i + 1), 1);
                                          }
                                          months.sort((a, b) => a - b);
                                          _schedule.period.months = JSON.stringify(months);
                                          this.onChange(_schedule);
                                      }}
                            />
                        }
                        label={I18n.t(month)}
                    />))}
                </FormGroup>)}
            </div>),
        ];
    }

    getPeriodSettingsYearly() {
        if (!this.state.schedule.period.years) {
            return;
        }
        const schedule = this.state.schedule;
        return [
            (<div><FormControlLabel control={(<Radio className={this.props.classes.inputRadio} checked={schedule.period.years === 1} onClick={() => {
                                        const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                        _schedule.period.years = 1;
                                        this.onChange(_schedule);
                                    }}/>)
                                    }
                                    label={I18n.t('sch_periodEveryYear')} /></div>),
            (<div><FormControlLabel control={(<Radio className={this.props.classes.inputRadio} checked={schedule.period.years > 1} onClick={() => {
                                        const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                        _schedule.period.years = 2;
                                        this.onChange(_schedule);
                                    }}/>)
                                    }
                                    label={I18n.t('sch_periodEvery')} />
                {schedule.period.years > 1 && [(<Input value={this.state.schedule.period.years} className={this.props.classes.inputEvery} type="number" min="2" onChange={e => {
                    const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                    _schedule.period.years = parseInt(e.target.value, 10);
                    this.onChange(_schedule);
                }} />), (<span>{I18n.t('sch_periodYear')}</span>)]}
            </div>),
        ];
    }

    now2string(isEnd) {
        const d = new Date();
        d.setHours(0);
        d.setMinutes(0);
        d.setSeconds(0);
        d.setMilliseconds(0);
        if (isEnd) {
            d.setDate(d.getDate() + 2);
            d.setMilliseconds(d.getMilliseconds() - 1);
        }

        return padding(d.getDate()) + '.' + padding(d.getMonth() + 1) + '.' + padding(d.getFullYear());
    }

    string2date(str) {
        let parts = str.split('.'); // 31.12.2019
        if (parts.length === 1) {
            parts = str.split('-'); // 2018-12-31
            return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        } else {
            return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        }
    }

    getValidSettings() {
        const schedule = this.state.schedule;
        // ----- from ---
        return (
            <div className={this.props.classes.rowDiv}>
                <div className={this.props.classes.modeDiv} style={{verticalAlign: 'middle'}}>
                    <span style={{fontWeight: 'bold', paddingRight: 10}}>{I18n.t('sch_valid')}</span>
                    <span>{I18n.t('sch_validFrom')}</span>
                </div>
                <div className={this.props.classes.settingsDiv}>
                    <TextField
                        className={this.props.classes.inputDate}
                        style={{marginRight: 10}}
                        key="exactTimeFrom"
                        value={string2USdate(schedule.valid.from)}
                        type="date"
                        //inputComponent={TextDate}
                        onChange={e => {
                            const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                            const date = this.string2date(e.target.value);
                            _schedule.valid.from = padding(date.getDate()) + '.' + padding(date.getMonth() + 1) + '.' + date.getFullYear();
                            this.onChange(_schedule);
                        }}
                        InputLabelProps={{shrink: true,}}
                        margin="normal"
                    />
                    <FormControlLabel control={(<Checkbox className={this.props.classes.inputRadio} checked={!!schedule.valid.to} onClick={() => {
                        const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                        _schedule.valid.to = _schedule.valid.to ? '' : this.now2string(true);
                        this.onChange(_schedule);
                    }}/>)}
                        label={I18n.t('sch_validTo')} />
                        {!!schedule.valid.to && (
                            <TextField
                                className={this.props.classes.inputDate}
                                style={{marginRight: 10}}
                                key="exactTimeFrom"
                                type="date"
                                value={string2USdate(schedule.valid.to)}
                                //inputComponent={TextDate}
                                onChange={e => {
                                    const _schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                    const date = this.string2date(e.target.value);
                                    _schedule.valid.to = padding(date.getDate()) + '.' + padding(date.getMonth() + 1) + '.' + date.getFullYear();
                                    this.onChange(_schedule);
                                }}
                                InputLabelProps={{shrink: true,}}
                                margin="normal"
                            />)}
                </div>
            </div>
        );
    }

    render() {
        return (<div style={{height: 'calc(100% - 48px)', width: '100%', overflow: 'hidden'}}>
            <div>{this.state.desc}</div>
            <div className={this.props.classes.scrollWindow}>
                <h5>{I18n.t('sch_time')}</h5>
                {this.getTimePeriodElements()}
                {this.getTimeExactElements()}
                {this.getDivider()}
                <h5>{I18n.t('sch_period')}</h5>
                {this.getPeriodModes()}
                {!this.state.schedule.period.once && this.getDivider()}
                {!this.state.schedule.period.once && this.getValidSettings()}
            </div>
        </div>);
    }
}

Schedule.propTypes = {
    schedule: PropTypes.string,
    onChange: PropTypes.func
};

export default withStyles(styles)(Schedule);

