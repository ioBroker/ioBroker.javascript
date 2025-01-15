import React from 'react';
// @ts-expect-error no types in suncalc2
import SunCalc from 'suncalc2';

import { ComplexCron, Schedule, I18n, convertCronToText } from '@iobroker/adapter-react-v5';

import { GenericBlock } from '../GenericBlock';
import { STANDARD_FUNCTION_STATE, STANDARD_FUNCTION_STATE_ONCHANGE } from '../../helpers/Compile';
import CustomInput from '../CustomInput';
import CustomButton from '../CustomButton';
import CustomModal from '../CustomModal';
import type {
    RuleBlockConfigTriggerSchedule,
    RuleBlockDescription,
    RuleContext,
    RuleInputAny,
    RuleInputCron,
    RuleInputNameText,
    RuleInputText,
    RuleInputWizard,
    RuleTagCardTitle,
    GenericBlockState,
    GenericBlockProps,
} from '@iobroker/javascript-rules-dev';

const DEFAULT_WIZARD = '{"time":{"start":"00:00","end":"24:00","mode":"hours","interval":1},"period":{"days":1}}';

// todo use from adapter-react-v5
export interface ScheduleConfig {
    time: {
        exactTime: boolean;
        start: string;
        end: string;
        mode: string;
        interval: number;
    };
    period: {
        once: string;
        days: number;
        dows: string;
        dates: string;
        weeks: number;
        months: string | number;
        years: number;
        yearMonth: number;
        yearDate: number;
    };
    valid: {
        from: string;
        to?: string;
    };
}

interface TriggerScheduleBlockState extends GenericBlockState<RuleBlockConfigTriggerSchedule> {
    openDialog?: boolean;
}

class TriggerScheduleBlock extends GenericBlock<RuleBlockConfigTriggerSchedule, TriggerScheduleBlockState> {
    private coordinates: { latitude: number; longitude: number } | null = null;

    constructor(props: GenericBlockProps<RuleBlockConfigTriggerSchedule>) {
        super(props, TriggerScheduleBlock.getStaticData());
    }

    static compile(config: RuleBlockConfigTriggerSchedule, context: RuleContext): string {
        let text = '';
        let func = context.justCheck ? STANDARD_FUNCTION_STATE : STANDARD_FUNCTION_STATE_ONCHANGE;
        func = func.replace('"__%%DEBUG_TRIGGER%%__"', `_sendToFrontEnd(${config._id}, {trigger: true})`);

        if (config.tagCard === 'interval') {
            text = `setInterval(${func}, ${config.interval || 1} * ${config.unit === 's' ? 1000 : config.unit === 'm' ? 60000 : 3600000});`;
        } else if (config.tagCard === 'cron') {
            text = `schedule("${config.cron}", ${func});`;
        } else if (config.tagCard === 'at') {
            const [hours, minutes] = (config.at || '').split(':');
            let dow = '*';
            if (config?.dow?.length && !config.dow.includes('_')) {
                const _dow = [...config.dow].map(item => parseInt(item, 10));
                _dow.sort();

                const intervals: string[] = [];
                let start = _dow[0];
                let i = 1;
                for (; i < _dow.length; i++) {
                    if (_dow[i] - _dow[i - 1] > 1) {
                        if (start === _dow[i - 1]) {
                            intervals.push(start.toString());
                        } else if (_dow[i - 1] - start === 1) {
                            intervals.push(`${start},${_dow[i - 1]}`);
                        } else {
                            intervals.push(`${start}-${_dow[i - 1]}`);
                        }

                        start = _dow[i];
                    } else if (i === _dow.length - 1) {
                        if (start === _dow[i - 1] || _dow[i] - start === 1) {
                            intervals.push(`${start},${_dow[i]}`);
                        } else {
                            intervals.push(`${start}-${_dow[i]}`);
                        }
                    }
                }

                dow = intervals.join(',');
            }
            text = `schedule("${minutes || '0'} ${hours || '0'} * * ${dow}", ${func});`;
        } else if (config.tagCard === 'astro') {
            text = `schedule({astro: "${config.astro}", shift: ${config.offset ? config.offsetValue : 0}}, ${func});`;
        } else if (config.tagCard === 'wizard') {
            text = `schedule('${config.wizard}', ${func});`;
        }

        return text;
    }

    static _time2String(time: Date): string {
        if (!time) {
            return '--:--';
        }
        return `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
    }

    async _setAstro(astro?: string, offset?: boolean, offsetValue?: number): Promise<void> {
        astro = astro || this.state.settings.astro || 'solarNoon';
        offset = offset === undefined ? this.state.settings.offset : offset;
        offsetValue = offsetValue === undefined ? this.state.settings.offsetValue : offsetValue;

        offsetValue = parseInt(offsetValue as unknown as string, 10) || 0;

        if (!this.coordinates) {
            const jsObject = await this.props.socket.getObject('system.adapter.javascript.0');
            const latitude: string | number | undefined = jsObject?.native?.latitude;
            const longitude: string | number | undefined = jsObject?.native?.longitude;
            if (!latitude && !longitude) {
                const systemConfig = await this.props.socket.getObject('system.config');
                if (systemConfig?.common && (systemConfig.common.latitude || systemConfig.common.longitude)) {
                    this.coordinates = {
                        latitude: parseFloat(systemConfig.common.latitude as unknown as string),
                        longitude: parseFloat(systemConfig.common.longitude as unknown as string),
                    };
                } else {
                    this.coordinates = null;
                }
            } else {
                this.coordinates = {
                    latitude: parseFloat(latitude as unknown as string),
                    longitude: parseFloat(longitude as unknown as string),
                };
            }
        }

        const sunValue =
            this.coordinates && SunCalc.getTimes(new Date(), this.coordinates.latitude, this.coordinates.longitude);
        const options = sunValue
            ? Object.keys(sunValue).map(name => ({
                  value: name,
                  title: name,
                  title2: `[${TriggerScheduleBlock._time2String(sunValue[name])}]`,
                  order: sunValue ? TriggerScheduleBlock._time2String(sunValue[name]) : '??:??',
              }))
            : [];
        options.sort((a, b) => (a.order > b.order ? 1 : a.order < b.order ? -1 : 0));

        // calculate time text
        let time = '--:--';
        if (astro && sunValue && sunValue[astro]) {
            const astroTime = new Date(sunValue[astro]);
            offset && astroTime.setMinutes(astroTime.getMinutes() + parseInt(offsetValue as unknown as string, 10));
            time = `(at ${TriggerScheduleBlock._time2String(astroTime)})`; // translate
        }

        let inputs: RuleInputAny[];

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
                },
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
                    attr: 'textTime1',
                    defaultValue: time,
                },
            ];
        }

        this.setState({ inputs }, () => super.onTagChange());
    }

    _setInterval(interval?: string | number): void {
        interval = parseInt((interval || this.state.settings.interval) as unknown as string, 10) || 30;
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

        this.setState(
            {
                inputs: [
                    {
                        nameRender: 'renderNumber',
                        /*prefix: {
                            en: 'every',
                        },*/
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
                    },
                ],
            },
            () => super.onTagChange(),
        );
    }

    // eslint-disable-next-line class-methods-use-this
    renderDebug(_debugMessage: any): string {
        return I18n.t('Triggered');
    }

    onValueChanged(value: any, attr: string): void {
        if (this.state.settings.tagCard === 'astro') {
            if (attr === 'astro') {
                void this._setAstro(value);
            } else if (attr === 'offset') {
                void this._setAstro(undefined, value);
            } else if (attr === 'offsetValue') {
                void this._setAstro(undefined, undefined, value);
            }
        } else if (this.state.settings.tagCard === 'interval') {
            if (attr === 'interval') {
                this._setInterval(value);
            }
        }
    }

    renderCron(
        input: RuleInputCron,
        value: string,
        onChange: (value: string, attr?: string, cb?: () => void) => void,
    ): React.JSX.Element | null {
        const { className } = this.props;
        let textCron = '';
        const { settings } = this.state;
        const { attr } = input;
        return (
            <div key={attr}>
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                    <div style={{ width: '100%' }}>
                        {this.renderText(
                            {
                                nameRender: 'renderText',
                                attr,
                                defaultValue: value,
                            } as RuleInputText,
                            (settings as Record<string, any>)[attr] ? (settings as Record<string, any>)[attr] : value,
                            onChange,
                        )}
                    </div>
                    <CustomButton
                        square
                        style={{ marginLeft: 7 }}
                        value="..."
                        className={className}
                        onClick={() => this.setState({ openDialog: true })}
                    />
                </div>
                {this.state.openDialog ? (
                    <CustomModal
                        onApply={(): void => {
                            onChange(textCron, attr, () => {
                                onChange(convertCronToText(textCron, I18n.getLanguage()), 'addText');
                                this.setState({ openDialog: false });
                            });
                        }}
                        onClose={() => this.setState({ openDialog: false })}
                    >
                        <ComplexCron
                            cronExpression={
                                (settings as Record<string, any>)[attr] ? (settings as Record<string, any>)[attr] : ''
                            }
                            onChange={el => (textCron = el)}
                            language={I18n.getLanguage()}
                        />
                    </CustomModal>
                ) : null}
                {this.renderNameText(
                    {
                        nameRender: 'renderNameText',
                        defaultValue: I18n.t('every hour at 0 minutes'),
                        attr: 'addText',
                        signature: true,
                        doNotTranslate: true,
                    } as RuleInputNameText,
                    settings.addText ? settings.addText : I18n.t('every hour at 0 minutes'),
                )}
            </div>
        );
    }

    renderWizard(
        input: RuleInputWizard,
        value: string,
        onChange: (newData: Record<string, any> | string) => void,
    ): React.JSX.Element {
        const { className } = this.props;
        const { attr } = input;
        let wizardText = '';
        let wizard: string | null = null;

        return (
            <div key={attr}>
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
                        value={(this.state.settings as Record<string, any>)[`${attr}Text`]}
                        onChange={el => onChange(el as string)}
                        customValue
                    />
                    <CustomButton
                        square
                        style={{ marginLeft: 7 }}
                        value="..."
                        className={className}
                        onClick={() => this.setState({ openDialog: true })}
                    />
                </div>
                {this.state.openDialog ? (
                    <CustomModal
                        onApply={() =>
                            this.setState({ openDialog: false }, () =>
                                onChange({
                                    [`${attr}Text`]: wizardText,
                                    [attr]: wizard,
                                }),
                            )
                        }
                        onClose={() => this.setState({ openDialog: false })}
                    >
                        <Schedule
                            theme={this.props.theme}
                            schedule={value}
                            onChange={(schedule, description) => {
                                wizardText = description || '';
                                const wizardObj: ScheduleConfig = JSON.parse(schedule) as ScheduleConfig;
                                wizardObj.valid = wizardObj.valid || {};
                                wizardObj.valid.from = wizardObj.valid.from || Schedule.now2string();
                                wizard = JSON.stringify(wizardObj);
                            }}
                        />
                    </CustomModal>
                ) : null}
            </div>
        );
    }

    onTagChange(tagCard: RuleTagCardTitle): void {
        tagCard = tagCard || this.state.settings.tagCard;
        switch (tagCard) {
            case 'interval':
                this._setInterval();
                break;

            case 'cron':
                this.setState(
                    {
                        inputs: [
                            {
                                nameRender: 'renderCron',
                                attr: 'cron',
                                defaultValue: '0 * * * *',
                            },
                        ],
                    },
                    () => super.onTagChange(),
                );
                break;

            case 'wizard': {
                const wizard: ScheduleConfig = JSON.parse(DEFAULT_WIZARD);
                wizard.valid = wizard.valid || {};
                wizard.valid.from = wizard.valid.from || Schedule.now2string();

                this.setState(
                    {
                        inputs: [
                            {
                                nameRender: 'renderWizard',
                                attr: 'wizard',
                                defaultValue: JSON.stringify(wizard),
                            },
                        ],
                    },
                    () =>
                        super.onTagChange(null, () => {
                            const wizardText = Schedule.state2text(this.state.settings.wizard || wizard);
                            if (this.state.settings.wizard !== wizardText) {
                                const settings = JSON.parse(JSON.stringify(this.state.settings));
                                settings.wizardText = wizardText;
                                this.setState({ settings });
                                this.props.onChange(settings);
                            }
                        }),
                );
                break;
            }

            case 'at':
                this.setState(
                    {
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
                                ],
                            },
                        ],
                    },
                    () => super.onTagChange(),
                );
                break;

            case 'astro':
                void this._setAstro();
                break;

            default:
                break;
        }
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'triggers',
            name: 'Schedule',
            id: 'TriggerScheduleBlock',
            icon: 'AccessTime',
            tagCardArray: ['cron', 'wizard', 'interval', 'at', 'astro'],
            title: 'Triggers the rule periodically or on some specific time',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return TriggerScheduleBlock.getStaticData();
    }
}

export default TriggerScheduleBlock;
