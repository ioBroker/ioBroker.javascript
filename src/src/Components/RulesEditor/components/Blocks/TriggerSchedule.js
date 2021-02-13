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
        super(props, {
            ...TriggerScheduleBlock.getStaticData(),
            inputs: [
                {
                    nameRender: 'renderTimeOfDay',
                    name: { en: 'Object ID' },
                    attr: 'schedule',
                    type: 'oid',
                    default: '',
                    icon: ''
                }
            ],
        });
    }

    compile(config, context) {
        return `schedule('* 1 * * *', ${Compile.STANDARD_FUNCTION});`;
    }

    renderTimeOfDay(input, value, onChange) {
        const {tagCard, openModal, openCheckbox} = this.state;
        const {className} = this.props;
        switch (tagCard) {
            case 'Interval':
                return <div key={input.attr}>
                    <div style={{display: 'flex', alignItems: 'center'}}><span style={{marginRight: 10}}>every</span>
                        <CustomInput
                            className={className}
                            autoComplete="off"
                            fullWidth
                            type="number"
                            variant="outlined"
                            size="small"
                            value={value}
                            onChange={onChange}
                        /></div>
                    <CustomSelect
                        // title='ip'
                        className={className}
                        options={[{value: 'second(s)', title: 'second(s)'}, {
                            value: 'minute(s)',
                            title: 'minute(s)'
                        }, {value: 'hour(s)', title: 'hour(s)'},]}
                        value={'second(s)'}
                        onChange={onChange}
                    />
                </div>;

            case 'CRON':
                return <div key={input.attr}>
                    <div style={{display: 'flex', alignItems: 'center'}}><CustomInput
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
                        /></div>
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
                        buttonClick={() => {
                            this.setState({openModal: !openModal});
                        }}
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
                        options={['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Every day']}
                        value={['Monday']}
                        onChange={onChange}
                    />
                </div>;

            case 'Astro':
                const sunValue = SunCalc.getTimes(new Date(), 51.5, -0.1);
                return <div key={input.attr}>
                    <div style={{display: 'flex', alignItems: 'center'}}>at<CustomSelect
                        // title='ip'
                        key='at'
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
                    <div style={{display: 'flex', alignItems: 'center'}}><CustomCheckbox
                        className={className}
                        autoComplete="off"
                        label="number"
                        variant="outlined"
                        size="small"
                        style={{marginRight: 5}}
                        value={openCheckbox}
                        onChange={(e) => this.setState({openCheckbox: e})}
                    /> with offset
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
    }

    static getStaticData() {
        return {
            typeBlock: 'when', // @Igor: (typeBlock, type, acceptedBy) эта информация избыточна и можно определять по acceptedBy или
            // убрать acceptedBy и оставить typeBlock или type
            type: 'trigger',
            acceptedBy: 'triggers',


            name: {en: 'Schedule', ru: 'Расписание'},
            id: 'TriggerScheduleBlock',
            icon: 'AccessTime',
            tagCardArray: ['CRON', 'Wizard', 'Interval', 'at', 'Astro']
        }
    }
}

export default TriggerScheduleBlock;
