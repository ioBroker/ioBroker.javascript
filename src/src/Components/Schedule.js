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
    rowDiv: {
        width: '100%',
    },
    modeDiv: {
        width: 200,
        display: 'inline-block'
    },
    settingsDiv: {
        display: 'inline-block'
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
    'once': 'once',
    'minutes': 'minutes',
    'hours': 'hours',
    'days': 'days',
    'weeks': 'weeks',
    'monthly': 'interval',
    'yearly': 'yearly',
};

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

class Schedule extends React.Component {
    constructor(props) {
        super(props);
        let schedule;
        if (this.props.schedule && typeof this.props.schedule === 'object') {
            schedule = this.props.schedule;
        } else {
            schedule = {
                time: {
                    exactTime: null,
                    start: '00:00',
                    end: '23:59'
                },
                period: {
                    mode: 'hours',
                    value: 1,
                    dows: null,
                    months: null
                },
                valid: {
                    from: '',
                    to: ''
                }
            };
        }

        this.state = {
            schedule
        };
    }

    onChange(schedule) {
        if (JSON.stringify(schedule) !== JSON.stringify(this.state.schedule)) {
            this.setState({schedule});
            this.props.onChange && this.props.onChange(JSON.stringify(schedule));
        }
    }

    getTimePeriodElements() {
        const schedule = this.state.schedule;
        let wholeDay = false;
        let day = false;
        let night = false;
        let fromTo = true;
        if (schedule.start === '00:00' && schedule.end === '24:00') {
            wholeDay = true;
            fromTo = false;
        } else if (schedule.start === 'sunrise') {
            day = true;
            fromTo = false;
        } else if (schedule.start === 'sunset') {
            night = true;
            fromTo = false;
        }

        return (
            <div key="timePeriod" className={this.props.classes.rowDiv}>
                <div className={this.props.classes.modeDiv}>
                    <FormControlLabel control={<Radio checked={!schedule.time.exactTime} onClick={() => {
                        const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                        schedule.time.exactTime = false;
                        this.setState({schedule});
                    }}/>} label={I18n.t('sch_intervalTime')} />
                </div>
                <div className={this.props.classes.scheduleDiv}>
                    {schedule.time.exactTime && (<div>
                        <div><FormControlLabel value={fromTo} control={<Radio onClick={() => {
                            const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                            schedule.time.end = '23:59';
                            this.setState({schedule});
                        }}/>} label={fromTo ? I18n.t('sch_fromTo') : ''} />
                            {fromTo && [
                                (<TextField
                                    key="exactTimeFrom"
                                    value={this.state.schedule.time.start}
                                    inputComponent={TextTime}
                                    onChange={e => {
                                        const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                        schedule.time.start = e.target.value;
                                        this.setState({schedule});
                                    }}
                                    InputLabelProps={{shrink: true,}}
                                    label={I18n.t('sch_from')}
                                    margin="normal"
                                />),
                                (<TextField
                                    key="exactTimeTo"
                                    value={this.state.schedule.time.end}
                                    inputComponent={TextTime}
                                    onChange={e => {
                                        const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                        schedule.time.end = e.target.value;
                                        this.setState({schedule});
                                    }}
                                    InputLabelProps={{shrink: true,}}
                                    label={I18n.t('sch_from')}
                                    margin="normal"
                                />)
                            ]}
                        </div>
                    </div>)}

                    {schedule.time.exactTime && (<div><FormControlLabel value={wholeDay} control={<Radio onClick={() => {
                        const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                        schedule.time.start = '00:00';
                        schedule.time.end = '24:00';
                        this.setState({schedule});
                    }}/>} label={fromTo ? I18n.t('sch_wholeDay') : ''} /></div>) }

                    {schedule.time.exactTime && (<div><FormControlLabel value={day} control={<Radio onClick={() => {
                        const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                        schedule.time.start = 'sunrise';
                        schedule.time.end = 'sunset';
                        this.setState({schedule});
                    }}/>} label={fromTo ? I18n.t('sch_astroDay') : ''} /></div>) }

                    {schedule.time.exactTime && (<div><FormControlLabel value={night} control={<Radio onClick={() => {
                        const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                        schedule.time.start = 'sunset';
                        schedule.time.end = 'sunrise';
                        this.setState({schedule});
                    }}/>} label={fromTo ? I18n.t('sch_astroNight') : ''} /></div>) }
                </div>
            </div>);
    }

    getTimeExactElements() {
        return (<div key="timeExact"  className={this.props.classes.rowDiv}>
            <div className={this.props.classes.modeDiv}>
                <FormControlLabel control={<Radio checked={this.state.schedule.time.exactTime} onClick={() => {
                    const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                    schedule.time.exactTime = true;
                    this.setState({schedule});
                }}/>} label={I18n.t('sch_exactTime')} />
            </div>
            {this.state.schedule.time.exactTime && (<div><TextField
                key="exactTimeValue"
                value={this.state.schedule.time.start}
                inputComponent={TextTime}
                onChange={e => {
                    const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                    schedule.time.start = e.target.value;
                    this.setState({schedule});
                }}
                InputLabelProps={{shrink: true,}}
                margin="normal"
            /></div>)}
        </div>)
    }

    getDivider() {
        return (<hr/>);
    }

    getPeriodModes() {
        const schedule = this.state.schedule;
        return [
            (<FormControlLabel value={schedule.period.mode === PERIODS.once}
                               control={(<Radio onClick={() => {
                                    const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                    schedule.period.mode = PERIODS.once;
                                    this.setState({schedule});
                                }}/>)
                               }
                               label={I18n.t('sch_periodOnce')} />),
            (<FormControlLabel value={schedule.period.mode === PERIODS.minutes || schedule.period.mode === PERIODS.hours}
                               control={(<Radio onClick={() => {
                                   const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                   schedule.period.mode = PERIODS.hours;
                                   this.setState({schedule});
                               }}/>)
                               }
                               label={I18n.t('sch_periodInterval')} />),
            (<FormControlLabel value={schedule.period.mode === PERIODS.days}
                               control={(<Radio onClick={() => {
                                   const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                   schedule.period.mode = PERIODS.days;
                                   this.setState({schedule});
                               }}/>)
                               }
                               label={I18n.t('sch_periodDaily')} />),
            (<FormControlLabel value={schedule.period.mode === PERIODS.weeks}
                               control={(<Radio onClick={() => {
                                   const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                   schedule.period.mode = PERIODS.weeks;
                                   this.setState({schedule});
                               }}/>)
                               }
                               label={I18n.t('sch_periodWeekly')} />),
            (<FormControlLabel value={schedule.period.mode === PERIODS.monthly}
                               control={(<Radio onClick={() => {
                                   const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                   schedule.period.mode = PERIODS.monthly;
                                   this.setState({schedule});
                               }}/>)
                               }
                               label={I18n.t('sch_periodMonthly')} />),
            (<FormControlLabel value={schedule.period.mode === PERIODS.yearly}
                               control={(<Radio onClick={() => {
                                   const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                   schedule.period.mode = PERIODS.yearly;
                                   this.setState({schedule});
                               }}/>)
                               }
                               label={I18n.t('sch_periodYearly')} />),
        ];
    }

    getPeriodSettingsMinutes() {
        if (!this.state.schedule.period.mode === PERIODS.minutes && this.state.schedule.period.mode !== PERIODS.hours) {
            return;
        }
        return [
            (<label>{I18n.t('sch_every')}</label>),
            (<Input value={this.state.schedule.period.value} onChange={e => {
                const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                schedule.period.value = parseInt(e.target.value, 10);
                this.setState({schedule});
            }} />),
            (<Select
                    value={this.state.schedule.period.mode}
                    onChange={e => {
                        const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                        schedule.period.mode = e.target.value;
                        this.setState({schedule});
                    }}
                    >
                    <MenuItem value={PERIODS.minutes}>{I18n.t('sch_periodMinutes')}</MenuItem>
                    <MenuItem value={PERIODS.hours}>{I18n.t('sch_periodHours')}</MenuItem>
                </Select>)
        ];
    }

    getPeriodSettingsDaily() {
        if (!this.state.schedule.period.mode === PERIODS.days) {
            return;
        }
        const schedule = this.state.schedule;
        return [
            (<div><FormControlLabel value={schedule.period.value === 1 && !schedule.period.dows}
                               control={(<Radio onClick={() => {
                                   const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                   schedule.period.value = 1;
                                   this.setState({schedule});
                               }}/>)
                               }
                                    label={I18n.t('sch_periodEveryDay')} /></div>),
            (<div><FormControlLabel value={schedule.period.value > 1 && !schedule.period.dows}
                               control={(<Radio onClick={() => {
                                   const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                   schedule.period.value = 2;
                                   this.setState({schedule});
                               }}/>)
                               }
                                    label={I18n.t('sch_periodEvery')} />
                {schedule.period.value > 1 && [(<Input value={this.state.schedule.period.value} type="number" min="2" onChange={e => {
                    const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                    schedule.period.value = parseInt(e.target.value, 10);
                    this.setState({schedule});
                }} />), (<span>{I18n.t('sch_periodDay')}</span>)]}
            </div>),

            (<div><FormControlLabel value={schedule.period.dows && schedule.period.dows === '[0, 6]'}
                                    control={(<Radio onClick={() => {
                                        const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                        schedule.period.dows =  '[0, 6]';
                                        this.setState({schedule});
                                    }}/>)
                                    }
                                    label={I18n.t('sch_periodWorkdays')} /></div>),

            (<div><FormControlLabel value={schedule.period.dows && schedule.period.dows === '[1, 2, 3, 4, 5]'}
                                    control={(<Radio onClick={() => {
                                        const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                        schedule.period.dows = '[1, 2, 3, 4, 5]';
                                        this.setState({schedule});
                                    }}/>)
                                    }
                                    label={I18n.t('sch_periodWeekend')} /></div>),

            (<div><FormControlLabel value={schedule.period.dows && schedule.period.dows !== '[1, 2, 3, 4, 5]' && schedule.period.dows !== '[0, 6]'}
                                    control={(<Radio onClick={() => {
                                        const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                        schedule.period.dows = '[0,1,2,3,4,5,6]';
                                        this.setState({schedule});
                                    }}/>)
                                    }
                                    label={I18n.t('sch_periodWeekdays')} />
                {schedule.period.dows && schedule.period.dows !== '[1, 2, 3, 4, 5]' && schedule.period.dows !== '[0, 6]' &&
                (<FormGroup row>
                    {WEEKDAYS.map((day, i) => (<FormControlLabel
                        control={
                            <Checkbox checked={schedule.period.dows.indexOf('' + i) !== -1}
                                      onChange={e => {
                                          const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                          let dows;
                                          try {
                                              dows = JSON.parse(schedule.period.dows);
                                          } catch (e) {
                                              dows = [];
                                          }
                                          if (e.target.checked && dows.indexOf(i) === -1) {
                                              dows.push(i);
                                          } else if (!e.target.checked && dows.indexOf(i) !== -1) {
                                              dows.splice(dows.indexOf(i), 1);
                                          }
                                          schedule.period.dows = JSON.stringify(dows);
                                          this.setState({schedule});
                                      }}
                            />
                        }
                        label={I18n.t(day)}
                    />))}
                </FormGroup>)}
            </div>),
            ];
    }

    getPeriodSettingsWeekly() {
        if (!this.state.schedule.period.mode === PERIODS.weeks) {
            return;
        }
        const schedule = this.state.schedule;
        return [
            (<div><FormControlLabel value={schedule.period.value === 1}
                                    control={(<Radio onClick={() => {
                                        const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                        schedule.period.value = 1;
                                        this.setState({schedule});
                                    }}/>)
                                    }
                                    label={I18n.t('sch_periodEveryWeek')} /></div>),
            (<div><FormControlLabel value={schedule.period.value > 1}
                                    control={(<Radio onClick={() => {
                                        const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                        schedule.period.value = 2;
                                        this.setState({schedule});
                                    }}/>)
                                    }
                                    label={I18n.t('sch_periodEvery')} />
                {schedule.period.value > 1 && [(<Input value={this.state.schedule.period.value} type="number" min="2" onChange={e => {
                    const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                    schedule.period.value = parseInt(e.target.value, 10);
                    this.setState({schedule});
                }} />), (<span>{I18n.t('sch_periodWeek')}</span>)]}
            </div>),
        ];
    }

    getPeriodSettingsMonthly() {
        if (!this.state.schedule.period.mode === PERIODS.monthly) {
            return;
        }
        const schedule = this.state.schedule;
        return [
            (<div><FormControlLabel value={schedule.period.value === 1}
                                    control={(<Radio onClick={() => {
                                        const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                        schedule.period.value = 1;
                                        schedule.period.months = null;
                                        this.setState({schedule});
                                    }}/>)
                                    }
                                    label={I18n.t('sch_periodEveryMonth')} /></div>),
            (<div><FormControlLabel value={schedule.period.value > 1}
                                    control={(<Radio onClick={() => {
                                        const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                        schedule.period.value = 2;
                                        this.setState({schedule});
                                    }}/>)
                                    }
                                    label={I18n.t('sch_periodEvery')} />
                {schedule.period.value > 1 && [(<Input value={this.state.schedule.period.value} type="number" min="2" onChange={e => {
                    const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                    schedule.period.value = parseInt(e.target.value, 10);
                    schedule.period.months = null;
                    this.setState({schedule});
                }} />), (<span>{I18n.t('sch_periodMonth')}</span>)]}
            </div>),
            (<div><FormControlLabel value={schedule.period.months}
                                    control={(<Radio onClick={() => {
                                        const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                        schedule.period.months = '[1,2,3,4,5,6,7,8,9,10,11,12]';
                                        this.setState({schedule});
                                    }}/>)
                                    }
                                    label={I18n.t('sch_periodWeekdays')} />
                {schedule.period.months &&
                (<FormGroup row>
                    {MONTHS.map((month, i) => (<FormControlLabel
                        control={
                            <Checkbox checked={JSON.parse(schedule.period.months).indexOf(i + 1) !== -1}
                                      onChange={e => {
                                          const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                          let months;
                                          try {
                                              months = JSON.parse(schedule.period.months);
                                          } catch (e) {
                                              months = [];
                                          }
                                          if (e.target.checked && months.indexOf(i) === -1) {
                                              months.push(i);
                                          } else if (!e.target.checked && months.indexOf(i) !== -1) {
                                              months.splice(months.indexOf(i), 1);
                                          }
                                          schedule.period.months = JSON.stringify(months);
                                          this.setState({schedule});
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
        if (!this.state.schedule.period.mode === PERIODS.yearly) {
            return;
        }
        const schedule = this.state.schedule;
        return [
            (<div><FormControlLabel value={schedule.period.value === 1}
                                    control={(<Radio onClick={() => {
                                        const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                        schedule.period.value = 1;
                                        this.setState({schedule});
                                    }}/>)
                                    }
                                    label={I18n.t('sch_periodEveryYear')} /></div>),
            (<div><FormControlLabel value={schedule.period.value > 1}
                                    control={(<Radio onClick={() => {
                                        const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                                        schedule.period.value = 2;
                                        this.setState({schedule});
                                    }}/>)
                                    }
                                    label={I18n.t('sch_periodEvery')} />
                {schedule.period.value > 1 && [(<Input value={this.state.schedule.period.value} type="number" min="2" onChange={e => {
                    const schedule = JSON.parse(JSON.stringify(this.state.schedule));
                    schedule.period.value = parseInt(e.target.value, 10);
                    this.setState({schedule});
                }} />), (<span>{I18n.t('sch_periodYear')}</span>)]}
            </div>),
        ];
    }

    render() {
        return (<div>
            <h5>{I18n.t('sch_time')}</h5>
            {this.getTimePeriodElements()}
            {this.getTimeExactElements()}
            {this.getDivider()}
            <h5>{I18n.t('sch_period')}</h5>
            <div className={this.props.classes.rowDiv}>
                <div className={this.props.classes.modeDiv}>
                    {this.getPeriodModes()}
                </div>
                <div className={this.props.classes.scheduleDiv}>
                    {this.getPeriodSettingsMinutes()}
                    {this.getPeriodSettingsDaily()}
                    {this.getPeriodSettingsWeekly()}
                    {this.getPeriodSettingsMonthly()}
                    {this.getPeriodSettingsYearly()}
                </div>
            </div>
        </div>);
    }
}

Schedule.propTypes = {
    schedule: PropTypes.string,
    onChange: PropTypes.func
};

export default withStyles(styles)(Schedule);

