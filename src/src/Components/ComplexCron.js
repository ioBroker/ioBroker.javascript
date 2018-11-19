import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@material-ui/core/styles';
import Checkbox from '@material-ui/core/Checkbox';
import Button from '@material-ui/core/Button';

import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import I18n from '../i18n';
import TextField from "@material-ui/core/TextField";
import convertCronToText from './simple-cron/cronText';

const styles = theme => ({
    mainDiv: {
        width: '100%',
        height: '100%',
        overflow: 'auto'
    },
    periodSelect: {
        //margin: '0 10px 60px 10px',
        display: 'block',
        width: 200
    },
    slider: {
        marginTop: 20,
        display: 'block',
        width: '100%'
    },
    tabContent: {
        padding: 20
    },
    numberButton: {
        padding: 4,
        minWidth: 40,
        margin: 5
    },
    numberButtonBreak: {
        display: 'block'
    },
    appBar: {
        color: 'white'
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

// 5-7,9-11 => [5,6,7,9,10,11]
function convertMinusIntoArray(value, max) {
    let result = [];
    if (value === '*') {
        for (let i = 1; i <= max; i++) {
            result.push(i);
        }
        return result; // array with entries max
    }
    const parts = (value || '').toString().split(',');
    for (let p = 0; p < parts.length; p++) {
        if (! parts[p].trim().length) continue;
        const items = parts[p].trim().split('-');
        if (items.length > 1) {
            let iMax = parseInt(items[1], 10);
            for (let i = parseInt(items[0], 10); i <= iMax; i++) {
                result.push(i);
            }
        } else {
            result.push(parseInt(parts[p], 10));
        }
    }
    result = result.map(a => parseInt(a, 10));

    result.sort();


    // remove double entries
    for (let p = result.length - 1; p >= 0; p--) {
        if (result[p] === result[p + 1]) {
            result.splice(p + 1, 1);
        }
    }


    return result;
}

// [5,6,7,9,10,11] => 5-7,9-11
function convertArrayIntoMinus(value, max) {
    if (typeof value !== 'object') {
        value = [value];
    }
    if (value.length === max) {
        return '*';
    }
    const newParts = [];
    if (!value.length) {
        return '';
    }
    value = value.map(a => parseInt(a, 10));

    value.sort((a, b) => a -b);

    let start = value[0];
    let end = value[0];
    for (let p = 1; p < value.length; p++) {
        if (value[p] - 1 !== parseInt(value[p - 1], 10)) {
            if (start === end) {
                newParts.push(start)
            } else if (end - 1 === start) {
                newParts.push(start + ',' + end);
            } else {
                newParts.push(start + '-' + end);
            }
            start = value[p];
            end = value[p];
        } else {
            end = value[p];
        }
    }

    if (start === end) {
        newParts.push(start)
    } else if (end - 1 === start) {
        newParts.push(start + ',' + end);
    } else {
        newParts.push(start + '-' + end);
    }

    return newParts.join(',');
}

class ComplexCron extends React.Component {
    constructor(props) {
        super(props);
        let cron = (typeof this.props.cronExpression === 'string') ? this.props.cronExpression.replace(/^["']/, '').replace(/["']\n?$/, '') : '';
        if (cron[0] === '{') {
            cron = '';
        }
        const state = ComplexCron.cron2state(cron || '* * * * *');

        this.state = {
            extended: false,
            tab: state.seconds !== false ? 1 : 0,
            cron: ComplexCron.state2cron(state),
            modes: {
                seconds: null,
                minutes: null,
                hours: null,
                dates: null,
                months: null,
                dows: null
            }
        };
        Object.assign(this.state, state);
    }

    static cron2state(cron) {
        cron = cron.replace(/['"]/g, '').trim();
        const cronParts = cron.split(' ').map(p => p.trim());
        const options = {};

        if (cronParts.length === 6) {
            options.seconds = cronParts[0] || '*';
            options.minutes = cronParts[1] || '*';
            options.hours = cronParts[2] || '*';
            options.dates = cronParts[3] || '*';
            options.months = cronParts[4] || '*';
            options.dows = cronParts[5] || '*';
        } else {
            options.seconds = false;
            options.minutes = cronParts[0] || '*';
            options.hours = cronParts[1] || '*';
            options.dates = cronParts[2] || '*';
            options.months = cronParts[3] || '*';
            options.dows = cronParts[4] || '*';
        }
        return options;
    }
    static state2cron(state) {
        let text = `${state.minutes} ${state.hours} ${state.dates} ${state.months} ${state.dows}`;
        if (state.seconds !== false) {
            text = state.seconds + ' ' + text;
        }
        return text;
    }

    recalcCron() {
        let cron = ComplexCron.state2cron(this.state);
        if (cron !== this.state.cron) {
            this.setState({cron});
        }
    }

    onChange(cron) {
        if (cron !== this.state.cron) {
            this.setState({cron});
            this.props.onChange && this.props.onChange(cron);
        }
    }

    onToggle(i, type, max) {
        if (i === true) {
            this.setState({[type]: '*'}, () => this.recalcCron());
        } else if (i === false) {
            this.setState({[type]: ''}, () => this.recalcCron());
        } else {
            let nums = convertMinusIntoArray(this.state[type], max);
            const pos = nums.indexOf(i);
            if (pos !== -1) {
                nums.splice(pos, 1);
            } else {
                nums.push(i);
                nums.sort();
            }
            this.setState({[type]: convertArrayIntoMinus(nums, max)}, () => this.recalcCron());
        }
    }

    getDigitsSelector(type, max) {
        let values = [];
        if (max === 7) {
            values = [1,2,3,4,5,6,0];
        } else {
            for (let i = 1; i <= max; i++) {
                values.push(i);
            }
        }
        const parts = convertMinusIntoArray(this.state[type], max);
        return [
            (<Button
                key="removeall"
                variant={'outlined'}
                className={this.props.classes.numberButton}
                style={{paddingBottom: 20}}
                color={'primary'}
                onClick={() => this.onToggle(false, type, max)}>{I18n.t('Deselect all')}</Button>),
            (<Button
                key="addall"
                variant={'contained'}
                style={{paddingBottom: 20}}
                className={this.props.classes.numberButton}
                color={'secondary'}
                onClick={() => this.onToggle(true, type, max)}>{I18n.t('Select all')}</Button>),
            (<div key="all">
                {values.map(i =>
                    [((max === 7 && i === 4) ||
                    (max === 12 && i === 7) ||
                    (max === 31 && !((i - 1) % 10)) ||
                    (max === 60 && !((i - 1) % 10)) ||
                    (max === 24 && !((i - 1) % 6))) &&
                    (<div key={'allInner' + i} style={{width: '100%'}}/>),
                        (<Button
                            key={'_' + i}
                            variant={parts.indexOf(i) !== -1 ? 'contained' : 'outlined'}
                            className={this.props.classes.numberButton}
                            color={parts.indexOf(i) !== -1 ? 'secondary' : 'primary'}
                            onClick={() => this.onToggle(i, type, max)}>{max === 7 ? I18n.t(WEEKDAYS[i]) : (max === 12 ? MONTHS[i - 1] : i)}</Button>
                    )])}
                    </div>)];
    }

    getPeriodsTab(type, max) {
        let value = this.state[type];
        let every = value === '*';
        let everyN = value.toString().indexOf('/') !== -1;
        let select;
        if (this.state.modes[type] === null) {
            select = every ? 'every' : (everyN ? 'everyN' : 'specific');
            const modes = JSON.parse(JSON.stringify(this.state.modes));
            modes[type] = select;
            return setTimeout(() => this.setState({modes}), 100);
        } else {
            every = this.state.modes[type] === 'every';
            everyN = this.state.modes[type] === 'everyN';
            select = this.state.modes[type];
        }

        if (everyN) {
            value = parseInt(value.replace('*/', ''), 10) || 1;
        }

        return (<div>
            <Select
                className={this.props.classes.periodSelect}
                style={{verticalAlign: 'bottom'}}
                value={select}
                onChange={e => {
                    const modes = JSON.parse(JSON.stringify(this.state.modes));
                    modes[type] = e.target.value;
                    if (e.target.value === 'every') {
                        this.setState({[type]: '*', modes}, () => this.recalcCron());
                    } else if (e.target.value === 'everyN') {
                        const num = parseInt(this.state[type].toString().replace('*/', ''), 10) || 1;
                        this.setState({[type]: '*/' + num, modes}, () => this.recalcCron());
                    } else if (e.target.value === 'specific') {
                        const num = parseInt(this.state[type].split(',')[0]) || 1;
                        this.setState({[type]: convertArrayIntoMinus(num, max), modes}, () => this.recalcCron());
                    }
                }}>
                <MenuItem key='every' value='every'>{I18n.t('sc_every_' + type)}</MenuItem>
                <MenuItem key='everyN' value='everyN'>{I18n.t('sc_everyN_' + type)}</MenuItem>
                <MenuItem key='specific' value='specific'>{I18n.t('sc_specific_' + type)}</MenuItem>
            </Select>
            {everyN && false && (<span>{value}</span>)}
            {everyN && (<TextField
                key="interval"
                label={I18n.t('sc_' + type)}
                value={value}
                min={1}
                max={max}
                onChange={e => {
                    this.setState({[type]: '*/' + e.target.value}, () => this.recalcCron());
                }}
                InputLabelProps={{shrink: true,}}
                type="number"
                margin="normal"
            />)}
            {!every && !everyN && this.getDigitsSelector(type, max)}
        </div>);
    }

    render() {
        const tab = this.state.seconds !== false ? this.state.tab : this.state.tab + 1;
        return (
            <div className={this.props.classes.mainDiv}>
                <div style={{paddingLeft: 8, width: '100%'}}><TextField style={{width: '100%'}} value={this.state.cron} disabled={true}/></div>
                <div style={{paddingLeft: 8, width: '100%', height: 60}}>{convertCronToText(this.state.cron, this.props.language || 'en')}</div>
                <FormControlLabel
                    control={<Checkbox checked={this.state.seconds}
                                       onChange={e => this.setState({seconds: e.target.checked ? '*' : false})}/>}
                    label={I18n.t('use seconds')}
                />
                <AppBar position="static" classes={{root: this.props.classes.appBar}} color="secondary">
                    <Tabs value={this.state.tab} className={this.props.classes.appBar} color="secondary" onChange={(active, tab) =>
                        this.setState({tab})}>
                        {this.state.seconds !== false && <Tab id="sc_seconds" label={I18n.t('sc_seconds')}/>}
                        <Tab  id="minutes" label={I18n.t('sc_minutes')}/>
                        <Tab  id="hours" label={I18n.t('sc_hours')}/>
                        <Tab  id="dates" label={I18n.t('sc_dates')}/>
                        <Tab  id="months" label={I18n.t('sc_months')}/>
                        <Tab  id="dows" label={I18n.t('sc_dows')}/>
                    </Tabs>
                </AppBar>
                {tab === 0 && (<div className={this.props.classes.tabContent}>{this.getPeriodsTab('seconds', 60)}</div>)}
                {tab === 1 && (<div className={this.props.classes.tabContent}>{this.getPeriodsTab('minutes', 60)}</div>)}
                {tab === 2 && (<div className={this.props.classes.tabContent}>{this.getPeriodsTab('hours', 24)}</div>)}
                {tab === 3 && (<div className={this.props.classes.tabContent}>{this.getPeriodsTab('dates', 31)}</div>)}
                {tab === 4 && (<div className={this.props.classes.tabContent}>{this.getPeriodsTab('months', 12)}</div>)}
                {tab === 5 && (<div className={this.props.classes.tabContent}>{this.getPeriodsTab('dows', 7)}</div>)}
            </div>
        );
    }
}

ComplexCron.propTypes = {
    cronExpression: PropTypes.string,
    onChange: PropTypes.func,
    language: PropTypes.string,
};

export default withStyles(styles)(ComplexCron);

