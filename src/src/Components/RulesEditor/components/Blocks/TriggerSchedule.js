import GenericBlock from '../GenericBlock';
import Compile from "../../Compile";
import CustomInput from "../CustomInput";
import CustomButton from "../CustomButton";
import CustomModal from "../CustomModal";
import ComplexCron from "../../../ComplexCron";
import Schedule from "../../../Schedule";
// import CustomTime from "../CustomTime";
import SunCalc from "suncalc2";
import React from "react"; // @iobroker/javascript-rules
import convertCronToText from '../../../simple-cron/cronText';
import I18n from '@iobroker/adapter-react/i18n';

class TriggerScheduleBlock extends GenericBlock {
    constructor(props) {
        super(props, TriggerScheduleBlock.getStaticData());
    }

    static compile(config, context) {
        let text = '';
        if (config.tagCard === 'interval') {
            text = `setInterval(${Compile.STANDARD_FUNCTION}, ${config.interval || 1} * ${config.attr === 's' ? 1000 : (config.attr === 'm' ? 60000 : 3600000)})`;
        } else if (config.tagCard === 'cron') {
            text = `schedule("${config.cron}", ${Compile.STANDARD_FUNCTION});`;
        } else if (config.tagCard === 'at') {
            // const [hours, minutes] = config.at.split(':');
            // todo: dow
            text = `schedule("* * * * *", ${Compile.STANDARD_FUNCTION});`;
        } else if (config.tagCard === 'astro') {
            text = `schedule({astro: "${config.astro}", shift: ${config.offset ? config.offsetValue : 0}}, ${Compile.STANDARD_FUNCTION})`;
        }

        return text;
    }

    _setAstro(astro, offset, offsetValue) {
        astro = astro || this.state.settings.astro || 'solarNoon';
        offset = offset === undefined ? this.state.settings.offset : offset;
        offsetValue = offsetValue === undefined ? this.state.settings.offsetValue : offsetValue;
        
        const sunValue = SunCalc.getTimes(new Date(), 51.5, -0.1);
        const options = Object.keys(sunValue).map(name => ({
            value: name,
            title: name,
            title2: `[${sunValue[name].getHours() < 10 ? 0 : ''}${sunValue[name].getHours()}:${sunValue[name].getMinutes() < 10 ? 0 : ''}${sunValue[name].getMinutes()}]`
        }));

        this.setState({
            inputs: [
                {
                    frontText: 'at',
                    attr: 'astro',
                    nameRender: 'renderSelect',
                    options,
                    defaultValue: 'solarNoon'
                },
                {
                    backText: 'with offset',
                    nameRender: 'renderCheckbox',
                    attr: 'offset',
                },
                {
                    backText: 'minutes',
                    frontText: 'offset',
                    nameRender: 'renderNumber',
                    defaultValue: 0,
                    attr: 'offsetValue',
                    openCheckbox: true
                },
                {
                    nameRender: 'renderNameText',
                    attr: 'textTime',
                    defaultValue: `at ${sunValue[astro].getHours() < 10 ? 0 : ''}${sunValue[astro].getHours()}:${sunValue[astro].getMinutes() < 10 ? 0 : ''}${sunValue[astro].getMinutes()} ${offset ? offsetValue : ''}`,
                }
            ],
        })
    }

    onValueChanged(value, attr) {
        if (this.state.settings.tagCard === 'astro') {
            this._setAstro(value);
        } else if (this.state.settings.tagCard === 'offset') {
            this._setAstro(undefined, value);
        } else if (this.state.settings.tagCard === 'offsetValue') {
            this._setAstro(undefined, undefined, value);
        }
    }

    onTagChange(tagCard) {
        tagCard = tagCard || this.state.settings.tagCard;
        switch (tagCard) {
            case 'interval':
                this.setState({
                    inputs: [
                        {
                            nameRender: 'renderNumber',
                            prefix: {
                                en: 'every'
                            },
                            attr: 'interval',
                            frontText: 'every',
                            defaultValue: 30,
                        },
                        {
                            nameRender: 'renderSelect',
                            attr: 'unit',
                            defaultValue: 'second(s)',
                            options: [
                                { value: 'second(s)', title: 'second(s)' },
                                { value: 'minute(s)', title: 'minute(s)' },
                                { value: 'hour(s)', title: 'hour(s)' }
                            ]
                        }
                    ]
                });
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
                });
                break;

            case 'wizard':
                this.setState({
                    inputs: [
                        {
                            nameRender: 'renderWizard',
                            attr: 'wizard',
                            defaultValue: 'Every hour from 8:00 to 17:00',
                        }
                    ]
                });
                break;

            case 'at':
                this.setState({
                    inputs: [
                        {
                            nameRender: 'renderTime',
                            prefix: 'at',
                            attr: 'at',
                            defaultValue: "07:30",
                        },
                        {
                            nameRender: 'renderSelect',
                            attr: 'dow',
                            default: '',
                            multiple: true,
                            defaultValue: 'Every day',
                            options: [
                                { value: 'Every day', title: 'Every day', only: true },
                                { value: 'Monday', title: 'Monday' },
                                { value: 'Tuesday', title: 'Tuesday' },
                                { value: 'Wednesday', title: 'Wednesday' },
                                { value: 'Thursday', title: 'Thursday' },
                                { value: 'Friday', title: 'Friday' },
                                { value: 'Saturday', title: 'Saturday' },
                                { value: 'Sunday', title: 'Sunday' },
                            ]
                        }
                    ]
                });
                break;

            case 'astro':
                this._setAstro();
                break;

            default:
                break;
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
                        attr: 'text',
                        defaultValue: value
                    },!!settings['text'] ? settings['text'] : value,onChange)}
                </div>
                <CustomButton
                    // fullWidth
                    style={{ marginLeft: 7 }}
                    value='...'
                    className={className}
                    onClick={() => this.setState({ openDialog: true })}
                />
            </div>
            <CustomModal
                open={this.state.openDialog}
                buttonClick={async () => {
                    await onChange(textCron, 'text');
                    await onChange(convertCronToText(textCron, I18n.getLanguage()), 'addText');
                    this.setState({ openDialog: false })
                }}
                close={() => this.setState({ openDialog: false })}
                titleButton={'add'}
                titleButton2={'close'}>
                <ComplexCron
                    cronExpression={!!settings[input.attr] ? '' : settings[attr]}
                    onChange={(el) => {
                        textCron = el
                    }} />
            </CustomModal>
            {this.renderNameText({
                defaultValue: 'every hour at 0 minutes',
                attr: 'addText'
            },!!settings['addText'] ? settings['addText'] : 'every hour at 0 minutes',onChange)}
        </div>;
    }

    renderWizard(input, value, onChange) {
        const { className } = this.props;
        const { attr } = input;
        let textWizard = '';
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
                    value={value}
                    onChange={(el) => onChange(el)}
                    customValue
                />
                <CustomButton
                    // fullWidth
                    style={{ marginLeft: 7 }}
                    value='...'
                    className={className}
                    onClick={() => this.setState({ openDialog: true })}
                />
            </div>
            <CustomModal
                open={this.state.openDialog}
                buttonClick={() => {
                    onChange(textWizard);
                    this.setState({ openDialog: false });
                }}
                close={() => this.setState({ openDialog: false })}
                titleButton={'add'}
                titleButton2={'close'}>
                <Schedule onChange={(_, text) => textWizard = text} />
            </CustomModal>
        </div>;
    }

    static getStaticData() {
        return {
            acceptedBy: 'triggers',
            name: { en: 'Schedule', ru: 'Schedule' },
            id: 'TriggerScheduleBlock',
            icon: 'AccessTime',
            tagCardArray: ['cron', 'wizard', 'interval', 'at', 'astro'],
        }
    }

    getData() {
        return TriggerScheduleBlock.getStaticData();
    }
}

export default TriggerScheduleBlock;
