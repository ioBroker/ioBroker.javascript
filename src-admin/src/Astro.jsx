import React from 'react';
import PropTypes from 'prop-types';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, TimePicker } from '@mui/x-date-pickers';

import {
    FormControl, FormHelperText,
    MenuItem, Select, TextField,
    Checkbox, FormControlLabel, InputLabel,
} from '@mui/material';

import {
    fr as frLocale,
    ru as ruLocale,
    enUS as enLocale,
    es as esLocale,
    pl as plLocale,
    pt as ptLocale,
    it as itLocale,
    zhCN as cnLocale,
    ptBR as brLocale,
    de as deLocale,
    uk as ukLocale,
    nl as nlLocale,
} from 'date-fns/locale';

import { ConfigGeneric, I18n } from '@iobroker/adapter-react-v5';

import Map from './Components/Map';
import './index.css';

// eslint-disable-next-line import/prefer-default-export
export const localeMap = {
    en: enLocale,
    fr: frLocale,
    ru: ruLocale,
    de: deLocale,
    es: esLocale,
    br: brLocale,
    nl: nlLocale,
    it: itLocale,
    pt: ptLocale,
    pl: plLocale,
    uk: ukLocale,
    'zh-cn': cnLocale,
};

const ATTRIBUTES = [
    'useSystemGPS',
    'latitude',
    'longitude',
    'sunriseEvent',
    'sunriseOffset',
    'sunriseLimitStart',
    'sunriseLimitEnd',
    'sunsetEvent',
    'sunsetOffset',
    'sunsetLimitStart',
    'sunsetLimitEnd',
];

function text2Date(text) {
    if (!text) {
        return new Date();
    }
    const parts = text.split(':');
    return new Date(2000, 0, 1, parseInt(parts[0], 10), parseInt(parts[1], 10));
}

function date2Text(date) {
    return date ? `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}` : '';
}

function formatTime(date) {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');

    return `${h}:${m}:${s}`;
}

class Astro extends ConfigGeneric {
    async componentDidMount() {
        super.componentDidMount();
        const newState = {};
        ATTRIBUTES.forEach(attr => {
            newState[attr] = ConfigGeneric.getValue(this.props.data, attr);
        });
        newState.sunsetOffset = newState.sunsetOffset || 0;
        newState.sunriseOffset = newState.sunriseOffset || 0;
        newState.sunriseLimitStart = text2Date(newState.sunriseLimitStart);
        newState.sunriseLimitEnd = text2Date(newState.sunriseLimitEnd);
        newState.sunsetLimitStart = text2Date(newState.sunsetLimitStart);
        newState.sunsetLimitEnd = text2Date(newState.sunsetLimitEnd);
        if (newState.useSystemGPS) {
            newState.latitude = this.props.systemConfig.latitude;
            newState.longitude = this.props.systemConfig.longitude;
        }

        newState.ampm = this.props.systemConfig.dateFormat.includes('/');

        this.setState(newState, () => this.onChange());
    }

    renderMap() {
        return <Map
            longitude={this.state.longitude}
            latitude={this.state.latitude}
            readOnly={!!this.state.useSystemGPS}
            onChange={(latitude, longitude) => this.setState({ latitude, longitude })}
        />;
    }

    onChange(attr, value) {
        let newState;
        if (typeof attr === 'object') {
            newState = attr;
        } else if (attr !== undefined) {
            newState = { [attr]: value };
        }
        this.setState(newState, () => {
            const data = {};
            ATTRIBUTES.forEach(_attr => data[_attr] = this.state[_attr]);
            data.sunriseLimitStart = date2Text(data.sunriseLimitStart);
            data.sunriseLimitEnd = date2Text(data.sunriseLimitEnd);
            data.sunsetLimitStart = date2Text(data.sunsetLimitStart);
            data.sunsetLimitEnd = date2Text(data.sunsetLimitEnd);
            data.sunsetOffset = parseInt(data.sunsetOffset, 10) || 0;
            data.sunriseOffset = parseInt(data.sunriseOffset, 10) || 0;

            this.calculateRiseSet(data);
            const allData = JSON.parse(JSON.stringify(this.props.data));
            ATTRIBUTES.forEach(_attr => allData[_attr] = data[_attr]);
            attr !== undefined && this.props.onChange(allData);
        });
    }

    calculateRiseSet(data) {
        if (this.props.alive && this.lastCalc !== JSON.stringify(data)) {
            this.lastCalc = JSON.stringify(data);
            this.calcTimeout && clearTimeout(this.calcTimeout);
            this.calcTimeout = setTimeout(async () => {
                this.calcTimeout = null;
                const times = await this.props.socket.sendTo(`${this.props.adapterName}.${this.props.instance}`, 'calcAstro', data);
                if (!times || times.error) {
                    console.error(`Cannot calculate astro times: ${JSON.stringify(times.error)}`);
                    return;
                }
                const nextSunrise = formatTime(new Date(times.nextSunrise.date));
                const nextSunset = formatTime(new Date(times.nextSunset.date));
                this.setState({
                    nextSunrise,
                    nextSunset,
                    nextSunriseServer: times.nextSunrise.serverTime,
                    nextSunsetServer: times.nextSunset.serverTime,
                });
            }, 300);
        }
    }

    renderItem() {
        const {
            useSystemGPS,
            latitude,
            longitude,
            sunriseEvent,
            sunriseOffset,
            sunriseLimitStart,
            sunriseLimitEnd,
            sunsetEvent,
            sunsetOffset,
            sunsetLimitStart,
            sunsetLimitEnd,
        } = this.state;

        const isMobile = window.innerWidth < 800;

        return <div style={{ width: '100%', display: isMobile ? undefined : 'flex', gap: 10 }}>
            <div style={{ width: isMobile ? '100%' : 'calc(50% - 5px)', display: isMobile ? 'block' : 'inline-block' }}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={localeMap[I18n.getLanguage()]}>
                    <FormControlLabel
                        style={{ width: 'calc(100% - 10px)' }}
                        control={<Checkbox
                            checked={!!useSystemGPS}
                            onChange={e => {
                                if (!e.target.checked) {
                                    this.onChange({
                                        useSystemGPS: false,
                                        latitude: latitude || this.props.systemConfig.latitude,
                                        longitude: longitude || this.props.systemConfig.longitude,
                                    });
                                } else {
                                    this.onChange({
                                        useSystemGPS: true,
                                        latitude: this.props.systemConfig.latitude,
                                        longitude: this.props.systemConfig.longitude,
                                    });
                                }
                            }}
                        />}
                        label={I18n.t('Use system settings')}
                    />
                    {useSystemGPS ? null : <TextField
                        variant="standard"
                        type="text"
                        style={{ width: 150, marginRight: 10 }}
                        label={I18n.t('Latitude °')}
                        value={(latitude || '').toString()}
                        onChange={e => this.onChange('latitude', e.target.value)}
                    />}
                    {useSystemGPS ? null : <TextField
                        variant="standard"
                        style={{ width: 150 }}
                        type="text"
                        label={I18n.t('Longitude °')}
                        value={(longitude || '').toString()}
                        onChange={e => this.onChange('longitude', e.target.value)}
                    />}
                    {useSystemGPS ? null : <div style={{ width: 'calc(100% - 10px)' }}>{I18n.t('Help')}</div>}
                    <h4
                        style={{
                            width: 'calc(100% - 10px)',
                            marginTop: 20,
                            backgroundColor: this.props.themeType === 'dark' ? '#333' : '#ccc',
                            color: this.props.themeType === 'dark' ? '#FFF' : '#000',
                            padding: '2px 8px',
                            borderRadius: 3,
                        }}
                    >
                        {I18n.t('Day time settings')}
                    </h4>
                    <div style={{ width: 'calc(100% - 10px)', display: 'flex', gap: 8 }}>
                        <FormControl
                            variant="standard"
                            style={{ width: 250 }}
                        >
                            <InputLabel shrink>{I18n.t('Time event')}</InputLabel>
                            <Select
                                variant="standard"
                                value={sunriseEvent || '_'}
                                onChange={e =>
                                    this.onChange('sunriseEvent', e.target.value === '_' ? '' : e.target.value)}
                            >
                                <MenuItem value="_">{I18n.t('none')}</MenuItem>
                                <MenuItem value="nightEnd">{I18n.t('sch_astro_nightEnd')}</MenuItem>
                                <MenuItem value="nauticalDawn">{I18n.t('sch_astro_nauticalDawn')}</MenuItem>
                                <MenuItem value="dawn">{I18n.t('sch_astro_dawn')}</MenuItem>
                                <MenuItem value="sunrise">{I18n.t('sch_astro_sunrise')}</MenuItem>
                                <MenuItem value="sunriseEnd">{I18n.t('sch_astro_sunriseEnd')}</MenuItem>
                                <MenuItem value="goldenHourEnd">{I18n.t('sch_astro_goldenHourEnd')}</MenuItem>
                            </Select>
                            <FormHelperText>{I18n.t('Used as start of the daytime')}</FormHelperText>
                        </FormControl>
                        <TextField
                            style={{ width: 80 }}
                            variant="standard"
                            disabled={!this.state.sunriseEvent}
                            label={I18n.t('Offset')}
                            value={sunriseOffset || 0}
                            helperText={I18n.t('in minutes')}
                            onChange={e => this.onChange('sunriseOffset', e.target.value)}
                        />
                        <FormControl
                            variant="standard"
                            style={{ width: 150 }}
                        >
                            <InputLabel shrink>{I18n.t('But not earlier')}</InputLabel>
                            <TimePicker
                                className={`astroToolbarTime ${this.props.themeType}`}
                                disabled={!this.state.sunriseEvent}
                                ampm={!!this.state.ampm}
                                views={['hours', 'minutes']}
                                value={sunriseLimitStart || new Date(2000, 0, 1, 0, 0)}
                                onChange={value =>
                                    this.onChange('sunriseLimitStart', new Date(value))}
                            />
                        </FormControl>
                        <FormControl
                            variant="standard"
                            style={{ width: 150 }}
                        >
                            <InputLabel shrink>{I18n.t('And not later')}</InputLabel>
                            <TimePicker
                                className={`astroToolbarTime ${this.props.themeType}`}
                                disabled={!this.state.sunriseEvent}
                                ampm={!!this.state.ampm}
                                views={['hours', 'minutes']}
                                value={sunriseLimitEnd || new Date(2000, 0, 1, 0, 0)}
                                onChange={value =>
                                    this.onChange('sunriseLimitEnd', new Date(value))}
                            />
                        </FormControl>
                    </div>
                    {this.props.alive ? <div style={{ marginTop: 20 }}>
                        <span style={{ marginRight: 8 }}>{I18n.t('Next sunrise')}</span>
                        <span>
                            {this.state.nextSunriseServer}
                            {this.state.nextSunrise !== this.state.nextSunriseServer ? ` ${I18n.t('Local time')}: ${this.state.nextSunrise}` : ''}
                        </span>
                    </div> : null}
                    <div
                        style={{
                            width: 'calc(100% - 10px)',
                            display: 'flex',
                            gap: 8,
                            paddingTop: 30,
                        }}
                    >
                        <FormControl
                            variant="standard"
                            style={{ width: 250 }}
                        >
                            <InputLabel shrink>{I18n.t('Time event')}</InputLabel>
                            <Select
                                variant="standard"
                                value={sunsetEvent || '_'}
                                onChange={e =>
                                    this.onChange('sunsetEvent', e.target.value === '_' ? '' : e.target.value)}
                            >
                                <MenuItem value="_">{I18n.t('none')}</MenuItem>
                                <MenuItem value="goldenHour">{I18n.t('sch_astro_goldenHour')}</MenuItem>
                                <MenuItem value="sunsetStart">{I18n.t('sch_astro_sunsetStart')}</MenuItem>
                                <MenuItem value="sunset">{I18n.t('sch_astro_sunset')}</MenuItem>
                                <MenuItem value="dusk">{I18n.t('sch_astro_dusk')}</MenuItem>
                                <MenuItem value="nauticalDusk">{I18n.t('sch_astro_nauticalDusk')}</MenuItem>
                                <MenuItem value="night">{I18n.t('sch_astro_night')}</MenuItem>
                            </Select>
                            <FormHelperText>{I18n.t('Used as end of the daytime')}</FormHelperText>
                        </FormControl>
                        <TextField
                            style={{ width: 80 }}
                            variant="standard"
                            disabled={!this.state.sunsetEvent}
                            label={I18n.t('Offset')}
                            value={sunsetOffset || 0}
                            helperText={I18n.t('in minutes')}
                            onChange={e => this.onChange('sunsetOffset', e.target.value)}
                        />
                        <FormControl
                            variant="standard"
                            style={{ width: 150 }}
                        >
                            <InputLabel shrink>{I18n.t('But not earlier')}</InputLabel>
                            <TimePicker
                                className={`astroToolbarTime ${this.props.themeType}`}
                                disabled={!this.state.sunsetEvent}
                                ampm={!!this.state.ampm}
                                views={['hours', 'minutes']}
                                value={sunsetLimitStart || new Date(2000, 0, 1, 0, 0)}
                                onChange={value =>
                                    this.onChange('sunsetLimitStart', new Date(value))}
                            />
                        </FormControl>
                        <FormControl
                            variant="standard"
                            style={{ width: 150 }}
                        >
                            <InputLabel shrink>{I18n.t('And not later')}</InputLabel>
                            <TimePicker
                                className={`astroToolbarTime ${this.props.themeType}`}
                                disabled={!this.state.sunsetEvent}
                                ampm={!!this.state.ampm}
                                views={['hours', 'minutes']}
                                value={sunsetLimitEnd || new Date(2000, 0, 1, 0, 0)}
                                onChange={value =>
                                    this.onChange('sunsetLimitEnd', new Date(value))}
                            />
                        </FormControl>
                    </div>
                    {this.props.alive ? <div style={{ marginTop: 20 }}>
                        <span style={{ marginRight: 8 }}>{I18n.t('Next sunset')}</span>
                        <span>
                            {this.state.nextSunsetServer}
                            {this.state.nextSunset !== this.state.nextSunsetServer ? ` ${I18n.t('Local time')}: ${this.state.nextSunset}` : ''}
                        </span>
                    </div> : null}
                </LocalizationProvider>
            </div>
            <div
                style={{
                    width: isMobile ? '100%' : 'calc(50% - 5px)',
                    display: isMobile ? 'block' : 'inline-block',
                    minHeight: 350,
                }}
            >
                {this.renderMap()}
            </div>
        </div>;
    }
}

Astro.propTypes = {
    socket: PropTypes.object.isRequired,
    themeType: PropTypes.string,
    themeName: PropTypes.string,
    style: PropTypes.object,
    className: PropTypes.string,
    data: PropTypes.object.isRequired,
    attr: PropTypes.string,
    schema: PropTypes.object,
    onError: PropTypes.func,
    onChange: PropTypes.func,
};

export default Astro;
