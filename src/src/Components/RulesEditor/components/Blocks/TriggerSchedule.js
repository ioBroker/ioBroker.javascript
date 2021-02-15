import GenericBlock from '../GenericBlock/index';
import Compile from "../../Compile";
import CustomInput from "../CustomInput";
import CustomSelect from "../CustomSelect";
import CustomButton from "../CustomButton";
import CustomModal from "../CustomModal";
import ComplexCron from "../../../ComplexCron";
import Schedule from "../../../Schedule";
import CustomTime from "../CustomTime";
import SunCalc from "suncalc2";
import CustomCheckbox from "../CustomCheckbox";
import React from "react"; // @iobroker/javascript-rules

class TriggerScheduleBlock extends GenericBlock {
    constructor(props) {
        super(props, TriggerScheduleBlock.getStaticData());
    }

    compile(config, context) {
        return `schedule('* 1 * * *', ${Compile.STANDARD_FUNCTION});`;
    }

    onTagChange(tagCard) {
        tagCard = tagCard || this.state.settings.tagCard;
        if (tagCard === 'interval') {
            this.setState({
                inputs: [
                    {
                        nameRender: 'renderText',
                        prefix: {
                            en: 'every'
                        },
                        attr: 'interval',
                        default: 10,
                    },
                    {
                        nameRender:  'renderSelect',
                        options: [
                             {value: 's', title: 'second(s)'},
                             {value: 'm', title: 'minute(s)'},
                             {value: 'h', title: 'hour(s)'}
                         ]
                    }
                ]
            });
        } else if (tagCard === 'cron') {
            this.setState({
                inputs: [
                    {
                        nameRender: 'renderCron',
                        attr: 'cron',
                        default: '0 * * * *',
                    }
                ]
            });
        } else if (tagCard === 'wizard') {
            this.setState({
                inputs: [
                    {
                        nameRender: 'renderWizard',
                        attr: 'wizard',
                        default: '{}',
                    }
                ]
            });
        } else if (tagCard === 'at') {
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
                        attr: 'unit',
                        default: '',
                        multiple: true,
                        options: [
                            {value: '',  title: 'Every day', only: true},
                            {value: 'mo', title: 'Monday'},
                            {value: 'tu', title: 'Tuesday'},
                            {value: 'we', title: 'Wednesday'},
                            {value: 'th', title: 'Thursday'},
                            {value: 'fr', title: 'Friday'},
                            {value: 'sa', title: 'Saturday'},
                            {value: 'su', title: 'Sunday'},
                        ]
                    }
                ]
            });
        } else if (tagCard === 'astro') {
            this.setState({
                inputs: [
                    {
                        nameRender: 'renderAstro',
                        prefix: 'at',
                        attr: 'astro',
                        default: 'solarNoon',
                    },
                ]
            });
        }
    }

    renderCron(input, value, onChange) {
        const {className} = this.props;
        return <div key={input.attr}>
            <div style={{display: 'flex', alignItems: 'center'}}>
                <CustomInput
                    className={className}
                    autoComplete="off"
                    fullWidth
                    variant="outlined"
                    size="small"
                    value={value}
                    onChange={onChange}
                />
                <CustomButton
                    fullWidth
                    style={{width: 80, marginLeft: 5}}
                    value='...'
                    className={className}
                    onClick={() => this.setState({openDialog: true})}
                />
            </div>
            <CustomModal
                open={this.state.openDialog}
                buttonClick={() => this.setState({openDialog: false})}
                close={() => this.setState({openDialog: false})}
                titleButton={'add'}
                titleButton2={'close'}>
                <ComplexCron/>
            </CustomModal>
            every hour at 0 minutes
        </div>;
    }

    renderWizard(input, value, onChange) {
        const {className} = this.props;

        return <div key={input.attr}>
            <div style={{display: 'flex', alignItems: 'center'}}>
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
                    fullWidth
                    style={{width: 80, marginLeft: 5}}
                    value='...'
                    className={className}
                    onClick={() => this.setState({openDialog: true})}
                />
            </div>
            <CustomModal
                open={this.state.openDialog}
                buttonClick={() => this.setState({openDialog: false})}
                close={() => this.setState({openDialog: false})}
                titleButton={'add'}
                titleButton2={'close'}>
                <Schedule/>
            </CustomModal>
            every hour at 0 minutes
        </div>;
    }

    renderAstro(input, value, onChange) {
        const {className} = this.props;
        const sunValue = SunCalc.getTimes(new Date(), 51.5, -0.1);
        return <div key={input.attr}>
            <div style={{display: 'flex', alignItems: 'center'}}>at
                <CustomSelect
                    className={className}
                    // multiple
                    style={{marginLeft: 5}}
                    options={Object.keys(sunValue).map((name) => ({
                        value: name,
                        title: name,
                        title2: `[${sunValue[name].getHours() < 10 ? 0 : ''}${sunValue[name].getHours()}:${sunValue[name].getMinutes() < 10 ? 0 : ''}${sunValue[name].getMinutes()}]`
                    }))}
                    value={value}
                    onChange={value => onChange(value)}
                />
            </div>
            <div style={{display: 'flex', alignItems: 'center'}}>
                <CustomCheckbox
                    className={className}
                    autoComplete="off"
                    title="with offset"
                    variant="outlined"
                    size="small"
                    style={{marginRight: 5}}
                    value={this.state.settings.withOffset}
                    onChange={checked => onChange(checked, 'withOffset')}
                />
            </div>

            {this.state.settings.withOffset &&
                <div style={{display: 'flex', alignItems: 'center'}}>
                    offset
                    <CustomInput
                        prefix="offset"
                        className={className}
                        autoComplete="off"
                        label="number"
                        variant="outlined"
                        size="small"
                        type="number"
                        style={{marginLeft: 5, marginRight: 5, width: 80}}
                        value={this.state.settings.offset}
                        onChange={value => onChange(value, 'offset')}
                    />
                    minutes
                </div>
            }
            <div style={{
                display: 'flex',
                alignItems: 'center'
            }}>at {`${sunValue['solarNoon'].getHours() < 10 ? 0 : ''}${sunValue['solarNoon'].getHours()}:${sunValue['solarNoon'].getMinutes() < 10 ? 0 : ''}${sunValue['solarNoon'].getMinutes()}`}</div>
        </div>;
    }
    /*
    renderTimeOfDay(input, value, onChange) {
        const {openModal, openCheckbox} = this.state;
        const {className} = this.props;
        switch (this.state.settings.tagCard) {
            case 'Interval':
                return <div key={input.attr}>
                    <div style={{display: 'flex', alignItems: 'center'}}>
                        <span style={{marginRight: 10}}>every</span>
                        <CustomInput
                            className={className}
                            autoComplete="off"
                            fullWidth
                            type="number"
                            variant="outlined"
                            size="small"
                            value={value}
                            onChange={onChange}
                        />
                    </div>
                    <CustomSelect
                        // title='ip'
                        className={className}
                        options={[{value: 's', title: 'm'}, {
                            value: 'minute(s)',
                            title: 'minute(s)'
                        }, {value: 'hour(s)', title: 'hour(s)'},]}
                        value={'s'}
                        onChange={onChange}
                    />
                </div>;

            case 'CRON':
                return <div key={input.attr}>
                    <div style={{display: 'flex', alignItems: 'center'}}>
                        <CustomInput
                            className={className}
                            autoComplete="off"
                            fullWidth
                            variant="outlined"
                            size="small"
                            value={value}
                            onChange={onChange}
                        />
                        <CustomButton
                            fullWidth
                            style={{width: 80, marginLeft: 5}}
                            value='...'
                            className={className}
                            onClick={() => this.setState({openModal: true})}
                        />
                    </div>
                    <CustomModal
                        open={openModal}
                        buttonClick={() => {
                            this.setState({openModal: !openModal});
                        }}
                        close={() => this.setState({openModal: !openModal})}
                        titleButton={'add'}
                        titleButton2={'close'}>
                        <ComplexCron/>
                    </CustomModal>
                    every hour at 0 minutes
                </div>;

            case 'Wizard':
                return <div key={input.attr}>
                    <div style={{display: 'flex', alignItems: 'center'}}><CustomInput
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
                            fullWidth
                            style={{width: 80, marginLeft: 5}}
                            value='...'
                            className={className}
                            onClick={() => this.setState({openModal: true})}
                        /></div>
                    <CustomModal
                        open={openModal}
                        buttonClick={() => this.setState({openModal: !openModal})}
                        close={() => this.setState({openModal: !openModal})}
                        titleButton={'add'}
                        titleButton2={'close'}>
                        <Schedule/>
                    </CustomModal>
                    every hour at 0 minutes
                </div>;

            case 'at':
                return <div key={input.attr}>
                    <div style={{display: 'flex', alignItems: 'center'}}>at <CustomTime style={{marginLeft: 5}}/></div>
                    <CustomSelect
                        // title='ip'
                        key='at'
                        className={className}
                        multiple
                        options={['Every day', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']}
                        value={['Monday']}
                        onChange={onChange}
                    />
                </div>;

            case 'Astro':
                const sunValue = SunCalc.getTimes(new Date(), 51.5, -0.1);
                return <div key={input.attr}>
                    <div style={{display: 'flex', alignItems: 'center'}}>at
                        <CustomSelect
                            className={className}
                            // multiple
                            style={{marginLeft: 5}}
                            options={Object.keys(sunValue).map((name) => ({
                                value: name,
                                title: name,
                                title2: `[${sunValue[name].getHours() < 10 ? 0 : ''}${sunValue[name].getHours()}:${sunValue[name].getMinutes() < 10 ? 0 : ''}${sunValue[name].getMinutes()}]`
                            }))}
                            value={'solarNoon'}
                            onChange={onChange}
                        />
                    </div>
                    <div style={{display: 'flex', alignItems: 'center'}}>
                        <CustomCheckbox
                            className={className}
                            autoComplete="off"
                            label="with offset"
                            variant="outlined"
                            size="small"
                            style={{marginRight: 5}}
                            value={openCheckbox}
                            onChange={e => this.setState({openCheckbox: e})}
                        />
                    </div>

                    {openCheckbox && <div style={{display: 'flex', alignItems: 'center'}}>offset <CustomInput
                        className={className}
                        autoComplete="off"
                        label="number"
                        variant="outlined"
                        size="small"
                        type="number"
                        style={{marginLeft: 5, marginRight: 5, width: 80}}
                        value={value}
                        onChange={onChange}
                    /> minutes</div>}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center'
                    }}>at {`${sunValue['solarNoon'].getHours() < 10 ? 0 : ''}${sunValue['solarNoon'].getHours()}:${sunValue['solarNoon'].getMinutes() < 10 ? 0 : ''}${sunValue['solarNoon'].getMinutes()}`}</div>
                </div>;

            default:
                return <CustomTime key={input.attr}/>;
        }
    }*/

    static getStaticData() {
        return {
            typeBlock: 'when', // @Igor: (typeBlock, type, acceptedBy) эта информация избыточна и можно определять по acceptedBy или
            // убрать acceptedBy и оставить typeBlock или type
            type: 'trigger',
            acceptedBy: 'triggers',


            name: {en: 'Schedule', ru: 'Расписание'},
            id: 'TriggerScheduleBlock',
            icon: 'AccessTime',
            tagCardArray: ['cron', 'wizard', 'interval', 'at', 'astro'],
        }
    }
}

export default TriggerScheduleBlock;
