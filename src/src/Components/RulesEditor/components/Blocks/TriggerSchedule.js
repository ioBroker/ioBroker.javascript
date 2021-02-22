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
            const [hours, minutes] = config.at.split(':');
            // todo: dow
            text = `schedule("${minutes} ${hours} * * *", ${Compile.STANDARD_FUNCTION});`;
        } else if (config.tagCard === 'astro') {
            text = `schedule({astro: "${config.astro}", shift: ${config.offset ? config.offsetValue : 0}}, ${Compile.STANDARD_FUNCTION})`;
        }

        return text;
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
                                { value: 's', title: 'second(s)' },
                                { value: 'm', title: 'minute(s)' },
                                { value: 'h', title: 'hour(s)' }
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
                            default: '0 * * * *',
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
                            default: '{}',
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
                            default: '7:30',
                        },
                        {
                            nameRender: 'renderSelect',
                            attr: 'dow',
                            default: '',
                            multiple: true,
                            defaultValue: 'Every day',
                            options: [
                                { value: '', title: 'Every day', only: true },
                                { value: '1', title: 'Monday' },
                                { value: '2', title: 'Tuesday' },
                                { value: '3', title: 'Wednesday' },
                                { value: '4', title: 'Thursday' },
                                { value: '5', title: 'Friday' },
                                { value: '6', title: 'Saturday' },
                                { value: '0', title: 'Sunday' },
                            ]
                        }
                    ]
                });
                break;

            case 'astro':
                const sunValue = SunCalc.getTimes(new Date(), 51.5, -0.1);
                this.setState({
                    inputs: [
                        {
                            frontText: 'at',
                            attr: 'astro',
                            nameRender: 'renderSelect',
                            options: Object.keys(sunValue).map((name) => ({
                                value: name,
                                title: name,
                                title2: `[${sunValue[name].getHours() < 10 ? 0 : ''}${sunValue[name].getHours()}:${sunValue[name].getMinutes() < 10 ? 0 : ''}${sunValue[name].getMinutes()}]`
                            })),
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
                            defaultValue: 30,
                            attr: 'offsetValue',
                            openCheckbox: true
                        },
                        {
                            nameRender: 'renderNameText',
                            attr: 'interval',
                            defaultValue: `at ${sunValue['solarNoon'].getHours() < 10 ? 0 : ''}${sunValue['solarNoon'].getHours()}:${sunValue['solarNoon'].getMinutes() < 10 ? 0 : ''}${sunValue['solarNoon'].getMinutes()}`,
                        }
                    ],
                    openCheckbox: true
                });
                break;

            default:
                break;
        }
    }

    renderCron(input, value, onChange) {
        const { className } = this.props;
        return <div key={input.attr}>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <div style={{ width: '100%' }}>
                    {this.renderText({
                        attr: 'text',
                        defaultValue: '* 0 * * *'
                    })}
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
                buttonClick={() => this.setState({ openDialog: false })}
                close={() => this.setState({ openDialog: false })}
                titleButton={'add'}
                titleButton2={'close'}>
                <ComplexCron />
            </CustomModal>
            {this.renderNameText({
                defaultValue: 'every hour at 0 minutes',
                attr: 'text'
            })}
        </div>;
    }

    renderWizard(input, value, onChange) {
        const { className } = this.props;
        return <div key={input.attr}>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 7 }}>
                <CustomInput
                    className={className}
                    autoComplete="off"
                    fullWidth
                    disabled
                    variant="outlined"
                    size="small"
                    multiline
                    rows={2}
                    value={"Every hour from 8:00 to 17:00"}
                    onChange={onChange}
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
                buttonClick={() => this.setState({ openDialog: false })}
                close={() => this.setState({ openDialog: false })}
                titleButton={'add'}
                titleButton2={'close'}>
                <Schedule />
            </CustomModal>
            {this.renderNameText({
                defaultValue: 'every hour at 0 minutes',
                attr: 'text'
            })}
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
