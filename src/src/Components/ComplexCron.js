import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@material-ui/core/styles';
import Checkbox from '@material-ui/core/Checkbox';
import Slider from '@material-ui/lab/Slider';
import Button from '@material-ui/core/Button';

import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import TextField from '@material-ui/core/TextField';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import convertCronToText from './cronText';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import I18n from '../../i18n';

const styles = theme => ({
    mainDiv: {
        width: '100%',
        height: '100%'
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
function periodArray2text(list, max) {
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

class ComplexCron extends React.Component {
    constructor(props) {
        super(props);
        const state = ComplexCron.cron2state(this.props.cronExpression || '* * * * *') || DEFAULT_STATE;

        this.state = {
            extended: false,
            cron: ComplexCron.state2cron(state),
            seconds: false,
        };
        Object.assign(this.state, state);
    }
    recalcCron() {

    }
    onChange(cron) {
        if (cron !== this.state.cron) {
            this.setState({cron});
            this.props.onChange && this.props.onChange(cron);
        }
    }


    getDigitsSelector(type, max) {
        const values = [];
        for (let i = 1; i <= max; i++) {
            values.push(i);
        }
        return (
{!every && !everyN && values.map(i => {
<Button variant="outlined" className={classes.button} variant="contained" color="secondary">{i}</Button>
})
    }
    getPeriodsTab(type, max) {
        const value = this.state[type];
        const every = value === '*';
        const everyN = value.indexOf('/') !== -1 ;
        const select = every ? 'every' : (everyN ? 'everyN' : 'specific');


        return (<div>
            <Select
                style={{verticalAlign: 'bottom'}}
                value={select}
                onChange={e => {
                    if (e.target.value === 'every') {
                        this.setState({[type]: '*'}, () => this.recalcCron());
                    } else if (e.target.value === 'everyN') {
                        const num = parseInt(this.state[type].replace('*/', ''), 10) || 1;
                        this.setState({[type]: '*/' + num}, () => this.recalcCron());
                    } else if (e.target.value === 'specific') {
                        const num = parseInt(this.state[type] || '1').split(',');
                        this.setState({[type]: periodArray2text(num, max)}, () => this.recalcCron());
                    }
                }}>
                    <MenuItem key='every' value='every'>{I18n.t('sc_every_' + name)}</MenuItem>
                    <MenuItem key='everyN' value='everyN'>{I18n.t('sc_everyN_' + name)}</MenuItem>
                    <MenuItem key='specific' value='specific'>{I18n.t('sc_specific_' + name)}</MenuItem>
            </Select>
            {everyN && this.getDigitsSelector(type, max)}
        </div>);
    }
    getSecondsTab(type) {
        return this.getPeriodsTab('seconds', 60);
    }
    getMinutesTab(type) {
        return this.getPeriodsTab('minutes', 60);
    }
    getHoursTab(type) {
        return this.getPeriodsTab('hours', 24);
    }
    render() {
        return (
            <div className={this.props.classes.mainDiv}>
                <FormControlLabel
                    control={<Checkbox checked={this.state.seconds} onChange={e => this.setState({seconds: e.target.checked})}/>}
                    label={I18n.t('use seconds')}
                />
                <AppBar position="static">
                    <Tabs value={this.state.tab} onChange={active => this.setState({tab: active})}>
                        <Tab label={I18n.t('sc_seconds')} />
                        <Tab label={I18n.t('sc_minutes')} />
                        <Tab label={I18n.t('sc_hours')} />
                    </Tabs>
                </AppBar>
                {this.state.tab === 'seconds' && (<TabContainer>{this.getSecondsTab()}</TabContainer>)}
                {this.state.tab === 'minutes' && (<TabContainer>{this.getMinutesTab()}</TabContainer>)}
                {this.state.tab === 'hours'   && (<TabContainer>{this.getHoursTab()}</TabContainer>)}
            </div>
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

