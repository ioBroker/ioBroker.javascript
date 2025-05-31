import React from 'react';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { LocalizationProvider, TimePicker } from '@mui/x-date-pickers';
import { ThemeProvider } from '@mui/material/styles';

import {
    FormControl,
    FormHelperText,
    MenuItem,
    Select,
    TextField,
    Checkbox,
    FormControlLabel,
    InputLabel,
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

import { I18n, Theme } from '@iobroker/adapter-react-v5';
import { ConfigGeneric, type ConfigGenericProps, type ConfigGenericState } from '@iobroker/json-config';

import Map from './Components/Map';
import './astro.css';

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

const ATTRIBUTES: (keyof AstroState)[] = [
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

function text2Date(text: string): Date | string {
    if (!text) {
        return new Date();
    }
    const parts = text.split(':');
    return new Date(2000, 0, 1, parseInt(parts[0], 10), parseInt(parts[1], 10));
}

function date2Text(date: Date): string {
    return date
        ? `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
        : '';
}

function formatTime(date: Date): string {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');

    return `${h}:${m}:${s}`;
}

type AstroState = ConfigGenericState & {
    sunsetOffset: number;
    sunriseOffset: number;
    sunriseLimitStart: Date | string;
    sunriseLimitEnd: Date | string;
    sunsetLimitStart: Date | string;
    sunsetLimitEnd: Date | string;
    latitude: number;
    longitude: number;
    useSystemGPS: boolean;
    sunriseEvent: string;
    sunsetEvent: string;
    ampm: boolean;
    nextSunrise: string;
    nextSunset: string;
    nextSunriseServer: string;
    nextSunsetServer: string;
    theme: string;
};

class Astro extends ConfigGeneric<ConfigGenericProps, AstroState> {
    calcTimeout?: ReturnType<typeof setTimeout> | null;
    lastCalc?: string;

    constructor(props: ConfigGenericProps) {
        super(props);
        Object.assign(this.state, {
            theme: Theme(this.props.themeName || 'light'),
        });
    }

    componentDidMount(): void {
        super.componentDidMount();
        const newState: Partial<AstroState> = {};
        ATTRIBUTES.forEach(attr => {
            newState[attr] = ConfigGeneric.getValue(this.props.data, attr);
        });
        newState.sunsetOffset = newState.sunsetOffset || 0;
        newState.sunriseOffset = newState.sunriseOffset || 0;
        newState.sunriseLimitStart = text2Date(newState.sunriseLimitStart as string);
        newState.sunriseLimitEnd = text2Date(newState.sunriseLimitEnd as string);
        newState.sunsetLimitStart = text2Date(newState.sunsetLimitStart as string);
        newState.sunsetLimitEnd = text2Date(newState.sunsetLimitEnd as string);
        if (newState.useSystemGPS) {
            newState.latitude = this.props.oContext.systemConfig.latitude;
            newState.longitude = this.props.oContext.systemConfig.longitude;
        }

        newState.ampm = this.props.oContext.systemConfig.dateFormat.includes('/');

        this.setState(newState as AstroState, () => this.onAstroChange());
    }

    renderMap(): React.JSX.Element {
        return (
            <Map
                longitude={this.state.longitude}
                latitude={this.state.latitude}
                readOnly={!!this.state.useSystemGPS}
                onChange={(latitude: number, longitude: number) => this.setState({ latitude, longitude })}
            />
        );
    }

    onAstroChange(attr?: keyof AstroState | Partial<AstroState>, value?: any): void {
        let newState: Partial<AstroState> = {};
        if (typeof attr === 'object') {
            newState = attr;
        } else if (attr !== undefined) {
            newState = { [attr]: value };
        }
        this.setState(newState as AstroState, () => {
            const data: Partial<AstroState> = {};
            ATTRIBUTES.forEach(_attr => (data[_attr] = this.state[_attr]));
            data.sunriseLimitStart = date2Text(data.sunriseLimitStart as Date);
            data.sunriseLimitEnd = date2Text(data.sunriseLimitEnd as Date);
            data.sunsetLimitStart = date2Text(data.sunsetLimitStart as Date);
            data.sunsetLimitEnd = date2Text(data.sunsetLimitEnd as Date);
            data.sunsetOffset = parseInt(data.sunsetOffset as unknown as string, 10) || 0;
            data.sunriseOffset = parseInt(data.sunriseOffset as unknown as string, 10) || 0;

            this.calculateRiseSet(data);
            const allData = JSON.parse(JSON.stringify(this.props.data));
            ATTRIBUTES.forEach(_attr => (allData[_attr] = data[_attr]));
            attr !== undefined && this.props.onChange(allData);
        });
    }

    calculateRiseSet(data: Partial<AstroState>): void {
        if (this.props.alive && this.lastCalc !== JSON.stringify(data)) {
            this.lastCalc = JSON.stringify(data);
            this.calcTimeout && clearTimeout(this.calcTimeout);
            this.calcTimeout = setTimeout(async () => {
                this.calcTimeout = null;
                const times = await this.props.oContext.socket.sendTo(
                    `${this.props.oContext.adapterName}.${this.props.oContext.instance}`,
                    'calcAstro',
                    data,
                );
                if (!times || times.error) {
                    console.error(`Cannot calculate astro times: ${JSON.stringify(times.error)}`);
                    return;
                }

                this.setState({
                    nextSunrise: times.nextSunrise.isValidDate ? formatTime(new Date(times.nextSunrise.date)) : 'n/a',
                    nextSunset: times.nextSunset.isValidDate ? formatTime(new Date(times.nextSunset.date)) : 'n/a',
                    nextSunriseServer: times.nextSunrise.serverTime,
                    nextSunsetServer: times.nextSunset.serverTime,
                });
            }, 300);
        }
    }

    renderItem(): React.JSX.Element {
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

        return (
            <ThemeProvider theme={this.state.theme}>
                <div style={{ width: '100%', display: isMobile ? undefined : 'flex', gap: 10 }}>
                    <div
                        style={{
                            width: isMobile ? '100%' : 'calc(50% - 5px)',
                            display: isMobile ? 'block' : 'inline-block',
                        }}
                    >
                        <LocalizationProvider
                            dateAdapter={AdapterDateFns}
                            adapterLocale={localeMap[I18n.getLanguage()]}
                        >
                            <FormControlLabel
                                style={{ width: 'calc(100% - 10px)' }}
                                control={
                                    <Checkbox
                                        checked={!!useSystemGPS}
                                        onChange={e => {
                                            if (!e.target.checked) {
                                                this.onAstroChange({
                                                    useSystemGPS: false,
                                                    latitude: latitude || this.props.oContext.systemConfig.latitude,
                                                    longitude: longitude || this.props.oContext.systemConfig.longitude,
                                                });
                                            } else {
                                                this.onAstroChange({
                                                    useSystemGPS: true,
                                                    latitude: this.props.oContext.systemConfig.latitude,
                                                    longitude: this.props.oContext.systemConfig.longitude,
                                                });
                                            }
                                        }}
                                    />
                                }
                                label={I18n.t('Use system settings')}
                            />
                            {useSystemGPS ? null : (
                                <TextField
                                    variant="standard"
                                    type="text"
                                    style={{ width: 150, marginRight: 10 }}
                                    label={I18n.t('Latitude °')}
                                    value={(latitude || '').toString()}
                                    onChange={e => this.onAstroChange('latitude', e.target.value)}
                                />
                            )}
                            {useSystemGPS ? null : (
                                <TextField
                                    variant="standard"
                                    style={{ width: 150 }}
                                    type="text"
                                    label={I18n.t('Longitude °')}
                                    value={(longitude || '').toString()}
                                    onChange={e => this.onAstroChange('longitude', e.target.value)}
                                />
                            )}
                            {useSystemGPS ? null : <div style={{ width: 'calc(100% - 10px)' }}>{I18n.t('Help')}</div>}
                            <h2
                                style={{
                                    width: 'calc(100% - 10px)',
                                    marginTop: 20,
                                    backgroundColor: this.props.oContext.themeType === 'dark' ? '#333' : '#ccc',
                                    color: this.props.oContext.themeType === 'dark' ? '#FFF' : '#000',
                                    padding: '2px 8px',
                                    borderRadius: 3,
                                }}
                            >
                                {I18n.t('Day time settings')}
                            </h2>
                            <div
                                style={{
                                    width: 'calc(100% - 10px)',
                                    display: 'flex',
                                    gap: 8,
                                    flexWrap: 'wrap',
                                    backgroundColor: this.props.oContext.themeType === 'dark' ? '#333' : '#ccc',
                                    paddingTop: 8,
                                    paddingLeft: 8,
                                    paddingRight: 8,
                                    paddingBottom: 0,
                                    borderRadius: '5px 5px 0 0',
                                }}
                            >
                                <FormControl
                                    variant="standard"
                                    style={{ width: 250 }}
                                >
                                    <InputLabel shrink>{I18n.t('Time event')}</InputLabel>
                                    <Select
                                        variant="standard"
                                        value={sunriseEvent || '_'}
                                        onChange={e =>
                                            this.onAstroChange(
                                                'sunriseEvent',
                                                e.target.value === '_' ? '' : e.target.value,
                                            )
                                        }
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
                                    onChange={e => this.onAstroChange('sunriseOffset', e.target.value)}
                                />
                                <FormControl
                                    variant="standard"
                                    style={{ width: 150 }}
                                >
                                    <InputLabel shrink>{I18n.t('But not earlier')}</InputLabel>
                                    <TimePicker
                                        className={`astroToolbarTime ${this.props.oContext.themeType}`}
                                        disabled={!this.state.sunriseEvent}
                                        ampm={!!this.state.ampm}
                                        views={['hours', 'minutes']}
                                        value={(sunriseLimitStart as Date) || new Date(2000, 0, 1, 0, 0)}
                                        onChange={value => this.onAstroChange('sunriseLimitStart', new Date(value!))}
                                    />
                                </FormControl>
                                <FormControl
                                    variant="standard"
                                    style={{ width: 150 }}
                                >
                                    <InputLabel shrink>{I18n.t('And not later')}</InputLabel>
                                    <TimePicker
                                        className={`astroToolbarTime ${this.props.oContext.themeType}`}
                                        disabled={!this.state.sunriseEvent}
                                        ampm={!!this.state.ampm}
                                        views={['hours', 'minutes']}
                                        value={(sunriseLimitEnd as Date) || new Date(2000, 0, 1, 0, 0)}
                                        onChange={value => this.onAstroChange('sunriseLimitEnd', new Date(value!))}
                                    />
                                </FormControl>
                            </div>
                            {this.props.alive ? (
                                <div
                                    style={{
                                        backgroundColor: this.props.oContext.themeType === 'dark' ? '#333' : '#ccc',
                                        width: 'calc(100% - 10px)',
                                        paddingTop: 20,
                                        paddingLeft: 8,
                                        paddingRight: 8,
                                        paddingBottom: 8,
                                        borderRadius: '0 0 5px 5px',
                                    }}
                                >
                                    <span style={{ marginRight: 8 }}>{I18n.t('Next sunrise')}</span>
                                    <span>
                                        {this.state.nextSunriseServer}
                                        {this.state.nextSunrise !== this.state.nextSunriseServer
                                            ? ` ${I18n.t('Local time')}: ${this.state.nextSunrise}`
                                            : ''}
                                    </span>
                                </div>
                            ) : null}
                            <div
                                style={{
                                    width: 'calc(100% - 10px)',
                                    display: 'flex',
                                    gap: 8,
                                    marginTop: 30,
                                    flexWrap: 'wrap',
                                    backgroundColor: this.props.oContext.themeType === 'dark' ? '#333' : '#ccc',
                                    paddingTop: 8,
                                    paddingLeft: 8,
                                    paddingRight: 8,
                                    paddingBottom: 0,
                                    borderRadius: '5px 5px 0 0',
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
                                            this.onAstroChange(
                                                'sunsetEvent',
                                                e.target.value === '_' ? '' : e.target.value,
                                            )
                                        }
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
                                    onChange={e => this.onAstroChange('sunsetOffset', e.target.value)}
                                />
                                <FormControl
                                    variant="standard"
                                    style={{ width: 150 }}
                                >
                                    <InputLabel shrink>{I18n.t('But not earlier')}</InputLabel>
                                    <TimePicker
                                        className={`astroToolbarTime ${this.props.oContext.themeType}`}
                                        disabled={!this.state.sunsetEvent}
                                        ampm={!!this.state.ampm}
                                        views={['hours', 'minutes']}
                                        value={(sunsetLimitStart as Date) || new Date(2000, 0, 1, 0, 0)}
                                        onChange={value => this.onAstroChange('sunsetLimitStart', new Date(value!))}
                                    />
                                </FormControl>
                                <FormControl
                                    variant="standard"
                                    style={{ width: 150 }}
                                >
                                    <InputLabel shrink>{I18n.t('And not later')}</InputLabel>
                                    <TimePicker
                                        className={`astroToolbarTime ${this.props.oContext.themeType}`}
                                        disabled={!this.state.sunsetEvent}
                                        ampm={!!this.state.ampm}
                                        views={['hours', 'minutes']}
                                        value={(sunsetLimitEnd as Date) || new Date(2000, 0, 1, 0, 0)}
                                        onChange={value => this.onAstroChange('sunsetLimitEnd', new Date(value!))}
                                    />
                                </FormControl>
                            </div>
                            {this.props.alive ? (
                                <div
                                    style={{
                                        backgroundColor: this.props.oContext.themeType === 'dark' ? '#333' : '#ccc',
                                        width: 'calc(100% - 10px)',
                                        paddingTop: 20,
                                        paddingLeft: 8,
                                        paddingRight: 8,
                                        paddingBottom: 8,
                                        borderRadius: '0 0 5px 5px',
                                        marginBottom: isMobile ? 20 : 0,
                                    }}
                                >
                                    <span style={{ marginRight: 8 }}>{I18n.t('Next sunset')}</span>
                                    <span>
                                        {this.state.nextSunsetServer}
                                        {this.state.nextSunset !== this.state.nextSunsetServer
                                            ? ` ${I18n.t('Local time')}: ${this.state.nextSunset}`
                                            : ''}
                                    </span>
                                </div>
                            ) : null}
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
                </div>
            </ThemeProvider>
        );
    }
}

export default Astro;
