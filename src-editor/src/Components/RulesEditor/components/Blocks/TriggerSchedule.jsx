import React from 'react';
import SunCalc from 'suncalc2';

import {
    ComplexCron,
    Schedule,
    I18n,
} from '@iobroker/adapter-react-v5';
import convertCronToText from '@iobroker/adapter-react-v5/build/Components/SimpleCron/cronText';

import { GenericBlock, type GenericBlockProps } from '../GenericBlock';
import Compile from '../../helpers/Compile';
import CustomInput from '../CustomInput';
import CustomButton from '../CustomButton';
import CustomModal from '../CustomModal';

const DEFAULT_WIZARD = '{"time":{"start":"00:00","end":"24:00","mode":"hours","interval":1},"period":{"days":1}}';

class TriggerScheduleBlock extends GenericBlock {
    constructor(props) {
        super(props, TriggerScheduleBlock.getStaticData());
        this.coordinates = null;
    }

    static compile(config, context) {
        let text = '';
        let func = context.justCheck ? Compile.STANDARD_FUNCTION_STATE : Compile.STANDARD_FUNCTION_STATE_ONCHANGE;
        func = func.replace('"__%%DEBUG_TRIGGER%%__"', `_sendToFrontEnd(${config._id}, {trigger: true})`);

        if (config.tagCard === 'interval') {
            text = `setInterval(${func}, ${config.interval || 1} * ${config.unit === 's' ? 1000 : (config.unit === 'm' ? 60000 : 3600000)});`;
        } else if (config.tagCard === 'cron') {
            text = `schedule("${config.cron}", ${func});`;
        } else if (config.tagCard === 'at') {
            const [hours, minutes] = (config.at || '').split(':');
            let dow = '*';
            if (config?.dow?.length && !config.dow.includes('_')) {
                const _dow = [...config.dow].map(item => parseInt(item, 10));
                _dow.sort();

                let intervals = [];
                let start = _dow[0];
                let i = 1
                for (; i < _dow.length; i++) {
                    if (_dow[i] - _dow[i - 1] > 1) {
                        if (start === _dow[i - 1]) {
                            intervals.push(start);
                        } else if (_dow[i - 1] - start === 1) {
                            intervals.push(start + ',' + _dow[i - 1]);
                        } else {
                            intervals.push(start + '-' + _dow[i - 1]);
                        }

                        start = _dow[i];
                    } else if (i === _dow.length - 1) {
                        if (start === _dow[i - 1] || _dow[i] - start === 1) {
                            intervals.push(start + ',' + _dow[i]);
                        } else {
                            intervals.push(start + '-' + _dow[i]);
                        }
                    }
                }

                dow = intervals.join(',')
            }
            text = `schedule("${minutes || '0'} ${hours || '0'} * * ${dow}", ${func});`;
        } else if (config.tagCard === 'astro') {
            text = `schedule({astro: "${config.astro}", shift: ${config.offset ? config.offsetValue : 0}}, ${func});`;
        } else if (config.tagCard === 'wizard') {
            text = `schedule('${config.wizard}', ${func});`;
        }

        return text;
    }

    static _time2String(time) {
        if (!time) {
            return '--:--';
        }
        return `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
    }

    async _setAstro(astro, offset, offsetValue) {
        astro = astro || this.state.settings.astro || 'solarNoon';
        offset = offset === undefined ? this.state.settings.offset : offset;
        offsetValue = offsetValue === undefined ? this.state.settings.offsetValue : offsetValue;

        offsetValue = parseInt(offsetValue, 10) || 0;

        if (!this.coordinates) {
            await this.props.socket.getObject('system.adapter.javascript.0')
                .then(({ native: { latitude, longitude } }) => {
                    if (!latitude && !longitude) {
                        return this.props.socket.getObject('system.config')
                            .then(obj => {
                                if (obj && (obj.common.latitude || obj.common.longitude)) {
                                    this.coordinates = {
                                        latitude: obj.common.latitude,
                                        longitude: obj.common.longitude
                                    }
                                } else {
                                    this.coordinates = null;
                                }
                            });
                    } else {
                        this.coordinates = {
                            latitude,
                            longitude
                        }
                    }
                });
        }

        const sunValue = this.coordinates && SunCalc.getTimes(new Date(), this.coordinates.latitude, this.coordinates.longitude);
        const options = sunValue ? Object.keys(sunValue).map(name => ({
            value: name,
            title: name,
            title2: `[${TriggerScheduleBlock._time2String(sunValue[name])}]`,
            order: sunValue ? TriggerScheduleBlock._time2String(sunValue[name]) : '??:??',
        })) : [];
        options.sort((a, b) => a.order > b.order ? 1 : (a.order < b.order ? -1 : 0));

        // calculate time text
        let time = '--:--';
        if (astro && sunValue && sunValue[astro]) {
            const astroTime = new Date(sunValue[astro]);
            offset && astroTime.setMinutes(astroTime.getMinutes() + parseInt(offsetValue, 10));
            time = `(at ${TriggerScheduleBlock._time2String(astroTime)})`; // translate
        }

        let inputs;

        if (offset) {
            inputs = [
                {
                    frontText: 'at',
                    attr: 'astro',
                    nameRender: 'renderSelect',
                    options,
                    defaultValue: 'solarNoon',
                },
                {
                    backText: 'with offset',
                    nameRender: 'renderCheckbox',
                    attr: 'offset',
                },
                {
                    backText: offsetValue === 1 ? 'minute' : 'minutes', // translate
                    frontText: 'offset',
                    nameRender: 'renderNumber',
                    defaultValue: 0,
                    attr: 'offsetValue',
                    noHelperText: true,
                },
                {
                    nameRender: 'renderNameText',
                    attr: 'textTime',
                    defaultValue: time,
                }
            ];
        } else {
            inputs = [
                {
                    frontText: 'at', // translate
                    attr: 'astro',
                    nameRender: 'renderSelect',
                    options,
                    defaultValue: 'solarNoon',
                },
                {
                    backText: 'with offset', // translate
                    nameRender: 'renderCheckbox',
                    attr: 'offset',
                },
                {
                    nameRender: 'renderNameText',
                    attr: 'textTime',
                    defaultValue: time,
                }
            ];
        }

        this.setState({ inputs }, () => super.onTagChange());
    }

    async _setInterval(interval) {
        interval = parseInt(interval || this.state.settings.interval, 10) || 30;
        let options;
        if (interval === 1) {
            options = [
                { value: 's', title: 'second' },
                { value: 'm', title: 'minute' },
                { value: 'h', title: 'hour' },
            ];
        } else {
            options = [
                { value: 's', title: 'seconds' },
                { value: 'm', title: 'minutes' },
                { value: 'h', title: 'hours' },
            ];
        }

        this.setState({
            inputs: [
                {
                    nameRender: 'renderNumber',
                    prefix: {
                        en: 'every',
                    },
                    attr: 'interval',
                    frontText: 'every',
                    defaultValue: 30,
                    className: 'block-input-interval',
                },
                {
                    nameRender: 'renderSelect',
                    attr: 'unit',
                    defaultValue: 's',
                    options,
                }
            ]
        }, () => super.onTagChange());
    }

    renderDebug(debugMessage) {
        return I18n.t('Triggered');
    }

    onValueChanged(value, attr) {
        if (this.state.settings.tagCard === 'astro') {
            if (attr === 'astro') {
                this._setAstro(value);
            } else if (attr === 'offset') {
                this._setAstro(undefined, value);
            } else if (attr === 'offsetValue') {
                this._setAstro(undefined, undefined, value);
            }
        } else if (this.state.settings.tagCard === 'interval') {
            if (attr === 'interval') {
                this._setInterval(value);
            }
        }
    }

    renderCron(input, value, onChange) {
        const { className } = this.props;
        let textCron = '';
        const { settings } = this.state;
        const { attr } = input;
        return <div key={attr}>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <div style={{ width: '100%' }}>
                    {this.renderText({
                        attr: attr,
                        defaultValue: value
                    }, !!settings[attr] ? settings[attr] : value, onChange)}
                </div>
                <CustomButton
                    square
                    style={{ marginLeft: 7 }}
                    value='...'
                    className={className}
                    onClick={() => this.setState({ openDialog: true })}
                />
            </div>
            <CustomModal
                open={this.state.openDialog}
                onApply={async () => {
                    await onChange(textCron, attr);
                    await onChange(convertCronToText(textCron, I18n.getLanguage()), 'addText');
                    this.setState({ openDialog: false });
                }}
                onClose={() => this.setState({ openDialog: false })}>
                <ComplexCron
                    cronExpression={!!settings[attr] ? settings[attr] : ''}
                    onChange={el => textCron = el}
                    language={I18n.getLanguage()}
                />
            </CustomModal>
            {this.renderNameText({
                defaultValue: I18n.t('every hour at 0 minutes'),
                attr: 'addText',
                signature: true,
                doNotTranslate: true,
            }, !!settings['addText'] ? settings['addText'] : I18n.t('every hour at 0 minutes'), onChange)}
        </div>;
    }

    renderWizard(input, value, onChange) {
        const { className } = this.props;
        const { attr } = input;
        let wizardText = '';
        let wizard = null;

        return <div key={attr}>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 7 }}>
                <CustomInput
                    className={className}
                    autoComplete="off"
                    fullWidth
                    // disabled
                    variant="outlined"
                    size="small"
                    multiline
                    rows={2}
                    value={this.state.settings[`${attr}Text`]}
                    onChange={(el) => onChange(el)}
                    customValue
                />
                <CustomButton
                    square
                    style={{ marginLeft: 7 }}
                    value='...'
                    className={className}
                    onClick={() => this.setState({ openDialog: true })}
                />
            </div>
            <CustomModal
                open={this.state.openDialog}
                onApply={() =>
                    this.setState({ openDialog: false }, () =>
                        onChange({
                            [`${attr}Text`]: wizardText,
                            [attr]: wizard,
                        }))}
                onClose={() => this.setState({ openDialog: false })}>
                <Schedule onChange={(val, text) => {
                    wizardText = text;
                    wizard = typeof val === 'object' ? JSON.parse(JSON.stringify(val)) : JSON.parse(val);
                    wizard.valid = wizard.valid || {};
                    wizard.valid.from = wizard.valid.from || Schedule.now2string();
                    wizard = JSON.stringify(wizard);
                }} />
            </CustomModal>
        </div>;
    }

    onTagChange(tagCard: RuleTagCardTitle) {
        tagCard = tagCard || this.state.settings.tagCard;
        switch (tagCard) {
            case 'interval':
                this._setInterval();
                break;

            case 'cron':
                this.setState({
                    inputs: [
                        {
                            nameRender: 'renderCron',
                            attr: 'cron',
                            defaultValue: '0 * * * *',
                        }
                    ]
                }, () => super.onTagChange());
                break;

            case 'wizard':
                const wizard = JSON.parse(DEFAULT_WIZARD);
                wizard.valid = wizard.valid || {};
                wizard.valid.from = wizard.valid.from || Schedule.now2string();

                this.setState({
                    inputs: [
                        {
                            nameRender: 'renderWizard',
                            attr: 'wizard',
                            defaultValue: JSON.stringify(wizard),
                        },
                    ],
                }, () => super.onTagChange(null, () => {
                    const wizardText = Schedule.state2text(this.state.settings.wizard || wizard);
                    if (this.state.settings.wizardText !== wizardText) {
                        const settings = JSON.parse(JSON.stringify(this.state.settings));
                        settings.wizardText = wizardText;
                        this.setState({ settings });
                        this.props.onChange(settings);
                    }
                }));
                break;

            case 'at':
                this.setState({
                    inputs: [
                        {
                            nameRender: 'renderTime',
                            prefix: 'at',
                            attr: 'at',
                            defaultValue: '07:30',
                        },
                        {
                            nameRender: 'renderSelect',
                            attr: 'dow',
                            default: '',
                            multiple: true,
                            defaultValue: ['_', '1', '2', '3', '4', '5', '6', '0'],
                            options: [
                                { value: '_', title: 'Every day', only: true },
                                { value: '1', title: 'Monday', titleShort: 'Mo' },
                                { value: '2', title: 'Tuesday', titleShort: 'Tu' },
                                { value: '3', title: 'Wednesday', titleShort: 'We' },
                                { value: '4', title: 'Thursday', titleShort: 'Th' },
                                { value: '5', title: 'Friday', titleShort: 'Fr' },
                                { value: '6', title: 'Saturday', titleShort: 'Sa' },
                                { value: '0', title: 'Sunday', titleShort: 'Su' },
                            ]
                        }
                    ]
                }, () => super.onTagChange());
                break;

            case 'astro':
                this._setAstro();
                break;

            default:
                break;
        }
    }

    static getStaticData() {
        return {
            acceptedBy: 'triggers',
            name: 'Schedule',
            id: 'TriggerScheduleBlock',
            icon: 'AccessTime',
            tagCardArray: ['cron', 'wizard', 'interval', 'at', 'astro'],
            title: 'Triggers the rule periodically or on some specific time',
        }
    }

    getData() {
        return TriggerScheduleBlock.getStaticData();
    }
}

export default TriggerScheduleBlock;
