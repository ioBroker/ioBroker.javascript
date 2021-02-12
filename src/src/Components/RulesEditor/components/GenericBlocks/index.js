import React, { PureComponent, Fragment } from 'react';
import CustomButton from '../CustomButton';
import CustomCheckbox from '../CustomCheckbox';
import CustomInput from '../CustomInput';
import CustomSlider from '../CustomSlider';
import DialogSelectID from '@iobroker/adapter-react/Dialogs/SelectID';
import CustomSelect from '../CustomSelect';
import CustomTime from '../CustomTime';
// import GenericApp from '@iobroker/adapter-react/GenericApp';
import Utils from '@iobroker/adapter-react/Components/Utils';
import { Menu, MenuItem } from '@material-ui/core';
import { ContextWrapperCreate } from '../ContextWrapper';
import ComplexCron from '../../../ComplexCron';
import CustomModal from '../CustomModal';
import Schedule from '../../../Schedule';
// import I18n from '@iobroker/adapter-react/i18n';
import SunCalc from 'suncalc2';
import cls from './style.module.scss';
import MaterialDynamicIcon from '../../helpers/MaterialDynamicIcon';
import CustomSwitch from '../CustomSwitch';

// const 
class GenericBlocks extends PureComponent {
    constructor(props, item) {
        super(props);
        // console.log(props, item)
        this.state = {
            inputs: props._inputs ? props._inputs : item._inputs,
            name: props._name ? props._name : item._name,
            icon: props.icon ? props.icon : item.icon,
            showSelectId: false,
            openTagMenu: false,
            openModal: false,
            openCheckbox: false,
            tagCardArray: [],
            tagCard: '',
            textOptions: [],
            textDef: '',
            numberOptions: [],
            numberDef: '',
            checkboxOptions: [],
            checkboxDef: '',
            sliderOptions: [],
            sliderDef: '',
            buttonOptions: [],
            buttonDef: '',
            objectIDOptions: [],
            objectIDDef: '',
            colorOptions: [],
            colorDef: '',
            timeOfDayOptions: [],
            timeOfDayDef: '',
            dateOptions: [],
            dateDef: '',
            instanceSelectionOptions: [],
            instanceSelectionDef: '',
        }
    }

    renderText = (value, onChange) => {
        const { className } = this.props;
        return <CustomInput
            className={className}
            autoComplete="off"
            label="text"
            variant="outlined"
            size="small"
            value={value}
            onChange={onChange}
        />
    }
    renderNumber = (value, onChange) => {
        const { className } = this.props;
        return <CustomInput
            className={className}
            autoComplete="off"
            label="number"
            variant="outlined"
            size="small"
            type="number"
            value={value}
            onChange={onChange}
        />
    }

    renderCheckbox = (value, onChange) => {
        const { className } = this.props;
        return <CustomCheckbox
            className={className}
            autoComplete="off"
            label="number"
            variant="outlined"
            size="small"
            value={value}
            onChange={onChange}
        />
    }

    renderSlider = (value, onChange) => {
        const { className } = this.props;
        return <CustomSlider
            className={className}
            autoComplete="off"
            label="number"
            variant="outlined"
            size="small"
            value={value}
            onChange={onChange}
        />
    }

    renderButton = (value, onClick) => {
        const { className } = this.props;
        return <CustomButton
            fullWidth
            value='click me'
            className={className}
            onClick={onClick}
        />
    }

    renderObjectID = () => {
        const { showSelectId } = this.state;
        const { className } = this.props;
        const { socket } = this.context;
        // return null
        return <>
            <CustomButton
                fullWidth
                value='open modal'
                className={className}
                onClick={() => this.setState({ showSelectId: true })}
            />
            {showSelectId ? <DialogSelectID
                key="tableSelect"
                imagePrefix="../.."
                dialogName={'javascript'}
                themeType={Utils.getThemeName()}
                socket={socket}
                statesOnly={true}
                // selected={this.selectIdValue}
                onClose={() => this.setState({ showSelectId: false })}
                onOk={(selected, name) => {
                    this.setState({ showSelectId: false, selectIdValue: selected });
                }}
            /> : null}</>
    }

    renderColor = (value, onChange) => {
        const { className } = this.props;
        return <CustomInput
            className={className}
            autoComplete="off"
            fullWidth
            variant="outlined"
            size="small"
            type="color"
            value={value}
            onChange={onChange}
        />
    }

    renderTimeOfDay = (value, onChange) => {
        const { tagCard, openModal, openCheckbox } = this.state;
        const { className } = this.props;
        switch (tagCard) {
            case "Interval":
                return <div>
                    <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ marginRight: 10 }}>every</span> <CustomInput
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
                        options={[{ value: 'second(s)', title: 'second(s)' }, { value: 'minute(s)', title: 'minute(s)' }, { value: 'hour(s)', title: 'hour(s)' },]}
                        value={'second(s)'}
                        onChange={onChange}
                    />
                </div>
            case "CRON":
                return <div>
                    <div style={{ display: 'flex', alignItems: 'center' }}><CustomInput
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
                            style={{ width: 80, marginLeft: 5 }}
                            value='...'
                            className={className}
                            onClick={() => this.setState({ openModal: true })}
                        /></div>
                    <CustomModal
                        open={openModal}
                        buttonClick={() => {
                            this.setState({ openModal: !openModal });
                        }}
                        close={() => this.setState({ openModal: !openModal })}
                        titleButton={'add'}
                        titleButton2={'close'}>
                        <ComplexCron />
                    </CustomModal>
       every hour at 0 minutes
            </div>
            case "Wizard":
                return <div>
                    <div style={{ display: 'flex', alignItems: 'center' }}><CustomInput
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
                            style={{ width: 80, marginLeft: 5 }}
                            value='...'
                            className={className}
                            onClick={() => this.setState({ openModal: true })}
                        /></div>
                    <CustomModal
                        open={openModal}
                        buttonClick={() => {
                            this.setState({ openModal: !openModal });
                        }}
                        close={() => this.setState({ openModal: !openModal })}
                        titleButton={'add'}
                        titleButton2={'close'}>
                        <Schedule />
                    </CustomModal>
       every hour at 0 minutes
            </div>
            case "at":
                return <div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>at <CustomTime style={{ marginLeft: 5 }} /></div>
                    <CustomSelect
                        // title='ip'
                        key='at'
                        className={className}
                        multiple
                        options={['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Every day']}
                        value={['Monday']}
                        onChange={onChange}
                    />
                </div>
            case "Astro":
                const sunValue = SunCalc.getTimes(new Date(), 51.5, - 0.1);
                return <div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>at <CustomSelect
                        // title='ip'
                        key='at'
                        className={className}
                        // multiple
                        style={{ marginLeft: 5 }}
                        options={Object.keys(sunValue).map((name) => ({ value: name, title: name, title2: `[${sunValue[name].getHours() < 10 ? 0 : ''}${sunValue[name].getHours()}:${sunValue[name].getMinutes() < 10 ? 0 : ''}${sunValue[name].getMinutes()}]` }))}
                        value={'solarNoon'}
                        onChange={onChange}
                    /></div>
                    <div style={{ display: 'flex', alignItems: 'center' }}><CustomCheckbox
                        className={className}
                        autoComplete="off"
                        label="number"
                        variant="outlined"
                        size="small"
                        style={{ marginRight: 5 }}
                        value={openCheckbox}
                        onChange={(e) => this.setState({ openCheckbox: e })}
                    /> with offset</div>

                    {openCheckbox && <div style={{ display: 'flex', alignItems: 'center' }}>offset  <CustomInput
                        className={className}
                        autoComplete="off"
                        label="number"
                        variant="outlined"
                        size="small"
                        type="number"
                        style={{ marginLeft: 5, marginRight: 5, width: 80 }}
                        value={value}
                        onChange={onChange}
                    /> minutes</div>}
                    <div style={{ display: 'flex', alignItems: 'center' }}>at {`${sunValue['solarNoon'].getHours() < 10 ? 0 : ''}${sunValue['solarNoon'].getHours()}:${sunValue['solarNoon'].getMinutes() < 10 ? 0 : ''}${sunValue['solarNoon'].getMinutes()}`}</div>
                </div>
            default:
                return <CustomTime />
        }
    }
    renderState = (value, onChange) => {
        const { showSelectId, tagCard } = this.state;
        const { className } = this.props;
        const { socket } = this.context;
        switch (tagCard) {
            case "on update":
                return <div>
                    <div style={{ display: 'flex', alignItems: 'center' }}><CustomInput
                        className={className}
                        autoComplete="off"
                        fullWidth
                        disabled
                        variant="outlined"
                        size="small"
                        value={"system.adapter.ad..."}
                        onChange={onChange}
                        customValue
                    />
                        <CustomButton
                            // fullWidth
                            value='...'
                            className={className}
                            onClick={() => this.setState({ showSelectId: true })}
                        />
                    </div>
                    Alive for alarm adapter
                    {showSelectId ? <DialogSelectID
                        key="tableSelect"
                        imagePrefix="../.."
                        dialogName={'javascript'}
                        themeType={Utils.getThemeName()}
                        socket={socket}
                        statesOnly={true}
                        // selected={this.selectIdValue}
                        onClose={() => this.setState({ showSelectId: false })}
                        onOk={(selected, name) => {
                            this.setState({ showSelectId: false, selectIdValue: selected });
                        }}
                    /> : null}</div>
            case "on change":
                return <div>
                    <div style={{ display: 'flex', alignItems: 'center' }}><CustomInput
                        className={className}
                        autoComplete="off"
                        fullWidth
                        disabled
                        variant="outlined"
                        size="small"
                        value={"system.adapter.ad..."}
                        onChange={onChange}
                        customValue
                    />
                        <CustomButton
                            // fullWidth
                            value='...'
                            className={className}
                            onClick={() => this.setState({ showSelectId: true })}
                        />
                    </div>
                Alive for alarm adapter
                {showSelectId ? <DialogSelectID
                        key="tableSelect"
                        imagePrefix="../.."
                        dialogName={'javascript'}
                        themeType={Utils.getThemeName()}
                        socket={socket}
                        statesOnly={true}
                        // selected={this.selectIdValue}
                        onClose={() => this.setState({ showSelectId: false })}
                        onOk={(selected, name) => {
                            this.setState({ showSelectId: false, selectIdValue: selected });
                        }}
                    /> : null}</div>
            default:
                return <CustomTime />

        }
    }
    renderOnScript = (value, onChange) => {
        const { className } = this.props;
        return <div style={{ display: 'flex', alignItems: 'center' }} className={className}>On script save or adapter start</div>
    }
    renderDate = () => {
        return <CustomTime />
    }

    renderInstanceSelection = (value, onChange, options) => {
        const { className } = this.props;
        return <CustomSelect
            // title='ip'
            className={className}
            options={options}
            value={'test1'}
            onChange={onChange}
        />
    }

    renderStateCondition = (value, onChange) => {
        const { showSelectId, tagCard, openCheckbox } = this.state;
        const { className } = this.props;
        const { socket } = this.context;
        return <div style={{ display: 'flex' }}><div style={{
            fontSize: 30,
            color: '#460f46',
            display: 'flex',
            alignItems: 'center',
            minWidth: 40,
            marginBottom: 30
        }}>{tagCard}</div><div>
                <div style={{ display: 'flex', alignItems: 'center' }}><CustomCheckbox
                    className={className}
                    autoComplete="off"
                    label="number"
                    variant="outlined"
                    size="small"
                    style={{ marginRight: 5 }}
                    value={openCheckbox}
                    onChange={(e) => this.setState({ openCheckbox: e })}
                /> Value from trigger</div>

                {openCheckbox && <div><div style={{ display: 'flex', alignItems: 'center' }}><CustomInput
                    className={className}
                    autoComplete="off"
                    fullWidth
                    disabled
                    variant="outlined"
                    size="small"
                    value={"system.adapter.ad..."}
                    onChange={onChange}
                    customValue
                />
                    <CustomButton
                        // fullWidth
                        value='...'
                        className={className}
                        onClick={() => this.setState({ showSelectId: true })}
                    />
                </div>
                    Alive for alarm adapter
                    {showSelectId ? <DialogSelectID
                        key="tableSelect"
                        imagePrefix="../.."
                        dialogName={'javascript'}
                        themeType={Utils.getThemeName()}
                        socket={socket}
                        statesOnly={true}
                        // selected={this.selectIdValue}
                        onClose={() => this.setState({ showSelectId: false })}
                        onOk={(selected, name) => {
                            this.setState({ showSelectId: false, selectIdValue: selected });
                        }}
                    /> : null}</div>}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: 10, whiteSpace: 'nowrap' }}>
                        greater than
                        </span>
                    <CustomInput
                        className={className}
                        autoComplete="off"
                        fullWidth
                        type="number"
                        variant="outlined"
                        size="small"
                        value={30}
                        onChange={onChange}
                        customValue
                    /></div>
            </div>
        </div>
    }

    renderTimeCondition = (value, onChange) => {
        const { tagCard } = this.state;
        // const { className } = this.props;
        return <div style={{ display: 'flex' }}>
            <div style={{
                fontSize: 30,
                color: '#460f46',
                display: 'flex',
                alignItems: 'center',
                minWidth: 40,
                marginBottom: 30
            }}>
                {tagCard}
            </div>
            <div>
                <div>Actual time of day</div>
                <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                    greater than <CustomTime style={{ marginLeft: 5 }} />
                </div>
            </div>
        </div>
    }

    renderAstrologicalCondition = (value, onChange) => {
        const { openCheckbox } = this.state;
        const { className } = this.props;
        const sunValue = SunCalc.getTimes(new Date(), 51.5, - 0.1);
        return <div>
            <div>Actual time of day</div>
            <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                greater than
                <CustomSelect
                    // title='ip'
                    key='at'
                    className={className}
                    // multiple
                    style={{ marginLeft: 5 }}
                    options={Object.keys(sunValue).map((name) => ({ value: name, title: name, title2: `[${sunValue[name].getHours() < 10 ? 0 : ''}${sunValue[name].getHours()}:${sunValue[name].getMinutes() < 10 ? 0 : ''}${sunValue[name].getMinutes()}]` }))}
                    value={'solarNoon'}
                    onChange={onChange}
                />
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}><CustomCheckbox
                className={className}
                autoComplete="off"
                label="number"
                variant="outlined"
                size="small"
                style={{ marginRight: 5 }}
                value={openCheckbox}
                onChange={(e) => this.setState({ openCheckbox: e })}
            /> with offset</div>

            {openCheckbox && <div style={{ display: 'flex', alignItems: 'center' }}>
                <CustomInput
                    className={className}
                    autoComplete="off"
                    label="number"
                    variant="outlined"
                    size="small"
                    type="number"
                    style={{ marginLeft: 5, marginRight: 5, width: 80 }}
                    value={value}
                    onChange={onChange}
                /> minutes</div>}
            <div style={{ display: 'flex', alignItems: 'center' }}>
                {`${sunValue['solarNoon'].getHours() < 10 ? 0 : ''}${sunValue['solarNoon'].getHours()}:${sunValue['solarNoon'].getMinutes() < 10 ? 0 : ''}${sunValue['solarNoon'].getMinutes()}`}</div>
        </div>
    }
    renderSetStateAction = (value, onChange) => {
        const { showSelectId, tagCard } = this.state;
        const { className } = this.props;
        const { socket } = this.context;
        let additionallyBlock = null;
        switch (tagCard) {
            case 'control':
                additionallyBlock = <div style={{ display: 'flex', alignItems: 'center' }}>
                    with
                <CustomInput
                        className={className}
                        autoComplete="off"
                        label="number"
                        variant="outlined"
                        size="small"
                        type="number"
                        style={{ marginLeft: 5, marginRight: 5, width: 80 }}
                        value={30}
                        onChange={onChange}
                        customValue
                    />
                kW
                </div>
                break
            case 'update':
                additionallyBlock = <div style={{ display: 'flex', alignItems: 'center' }}>
                    with
            <CustomInput
                        className={className}
                        autoComplete="off"
                        label="number"
                        variant="outlined"
                        size="small"
                        type="number"
                        style={{ marginLeft: 5, marginRight: 5, width: 80 }}
                        value={30}
                        onChange={onChange}
                        customValue
                    />
                </div>
                break
            case 'control1':
                additionallyBlock = <div style={{ display: 'flex', alignItems: 'center' }}>
                    0 <CustomSlider
                        className={className}
                        autoComplete="off"
                        label="number"
                        variant="outlined"
                        size="small"
                        value={50}
                        onChange={onChange}
                        customValue
                    />100
                </div>
                break
            case 'control2':
                additionallyBlock = <div style={{ display: 'flex', alignItems: 'center' }}>
                    with
                <CustomInput
                        className={className}
                        autoComplete="off"
                        fullWidth
                        variant="outlined"
                        size="small"
                        type="color"
                        value={value}
                        onChange={onChange}
                    />
                </div>
                break
            case 'control3':
                additionallyBlock = <div style={{ display: 'flex', alignItems: 'center' }}>
                    <CustomSelect
                        // title='ip'
                        className={className}
                        options={[{ value: 'State1', title: 'State1' }, { value: 'State2', title: 'State2' }, { value: 'State3', title: 'State3' },]}
                        value={'State1'}
                        onChange={onChange}
                    />
                </div>
                break
            case 'control4':
                additionallyBlock = <div style={{ display: 'flex', alignItems: 'center' }}>
                    false
                    <CustomSwitch
                        label=''
                    />
                    true
                </div>
                break
            case 'control5':
                additionallyBlock = <div style={{ display: 'flex', alignItems: 'center' }}>
                    <CustomButton
                        // fullWidth
                        value='Press'
                        className={className}
                        onClick={onChange}
                    />
                </div>
                break
            default:
                additionallyBlock = null;
                break
        }
        return <div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <CustomInput
                    className={className}
                    autoComplete="off"
                    fullWidth
                    disabled
                    variant="outlined"
                    size="small"
                    value={"system.adapter.ad..."}
                    onChange={onChange}
                    customValue
                />
                <CustomButton
                    // fullWidth
                    value='...'
                    className={className}
                    onClick={() => this.setState({ showSelectId: true })}
                />
            </div>
    Alive for alarm adapter
    {showSelectId ? <DialogSelectID
                key="tableSelect"
                imagePrefix="../.."
                dialogName={'javascript'}
                themeType={Utils.getThemeName()}
                socket={socket}
                statesOnly={true}
                // selected={this.selectIdValue}
                onClose={() => this.setState({ showSelectId: false })}
                onOk={(selected, name) => {
                    this.setState({ showSelectId: false, selectIdValue: selected });
                }}
            /> : null}
            <div>
                {additionallyBlock}
            </div>
        </div>
    }
    renderExecAction = (value, onChange) => {
        const { openModal } = this.state;
        const { className } = this.props;
        return <div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <CustomInput
                    className={className}
                    autoComplete="off"
                    fullWidth
                    variant="outlined"
                    size="small"
                    value={'value'}
                    onChange={onChange}
                    customValue
                />
                <CustomButton
                    fullWidth
                    style={{ width: 80, marginLeft: 5 }}
                    value='...'
                    className={className}
                    onClick={() => this.setState({ openModal: true })}
                /></div>
            <CustomModal
                open={openModal}
                buttonClick={() => {
                    this.setState({ openModal: !openModal });
                }}
                close={() => this.setState({ openModal: !openModal })}
                titleButton={'add'}
                titleButton2={'close'}>
                <CustomInput
                    className={className}
                    autoComplete="off"
                    fullWidth
                    variant="outlined"
                    size="small"
                    rows={10}
                    multiline
                    value={value}
                    onChange={onChange}
                />
            </CustomModal>
            Shell command</div>
    }
    renderHTTPCallAction = (value, onChange) => {
        const { openModal } = this.state;
        const { className } = this.props;
        return <div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <CustomInput
                    className={className}
                    autoComplete="off"
                    fullWidth
                    variant="outlined"
                    size="small"
                    value={'value'}
                    onChange={onChange}
                    customValue
                />
                <CustomButton
                    fullWidth
                    style={{ width: 80, marginLeft: 5 }}
                    value='...'
                    className={className}
                    onClick={() => this.setState({ openModal: true })}
                /></div>
            <CustomModal
                open={openModal}
                buttonClick={() => {
                    this.setState({ openModal: !openModal });
                }}
                close={() => this.setState({ openModal: !openModal })}
                titleButton={'add'}
                titleButton2={'close'}>
                <CustomInput
                    className={className}
                    autoComplete="off"
                    fullWidth
                    variant="outlined"
                    size="small"
                    rows={10}
                    multiline
                    value={value}
                    onChange={onChange}
                />
            </CustomModal>
        URL</div>
    }
    renderPrintTextAction = (value, onChange) => {
        const { openModal } = this.state;
        const { className } = this.props;
        return <div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <CustomInput
                    className={className}
                    autoComplete="off"
                    fullWidth
                    variant="outlined"
                    size="small"
                    value={'value'}
                    onChange={onChange}
                    customValue
                />
                <CustomButton
                    fullWidth
                    style={{ width: 80, marginLeft: 5 }}
                    value='...'
                    className={className}
                    onClick={() => this.setState({ openModal: true })}
                /></div>
            <CustomModal
                open={openModal}
                buttonClick={() => {
                    this.setState({ openModal: !openModal });
                }}
                close={() => this.setState({ openModal: !openModal })}
                titleButton={'add'}
                titleButton2={'close'}>
                <CustomInput
                    className={className}
                    autoComplete="off"
                    fullWidth
                    variant="outlined"
                    size="small"
                    rows={10}
                    multiline
                    value={value}
                    onChange={onChange}
                />
            </CustomModal>
        Log text</div>
    }
    renderPauseAction = (value, onChange) => {
        const { className } = this.props;
        return <div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <CustomInput
                    fullWidth
                    customValue
                    type="number"
                    value={100}
                />
            </div>
            <CustomSelect
                // title='ip'
                key='at'
                className={className}
                options={[{ value: 'ms', title: 'ms' },{ value: 's', title: 's' }]}
                value={'ms'}
                onChange={onChange}
            />
        </div>
    }
    /////////////////////////////
    tagGenerate = () => {
        const { inputs, tagCard, tagCardArray, openTagMenu } = this.state;
        let result;
        if (inputs.nameRender === 'renderTimeOfDay' && tagCard === '') {
            this.setState({ tagCard: 'CRON', tagCardArray: ['CRON', 'Wizard', 'Interval', 'at', 'Astro'] });
            result = 'CRON';
        }
        if (inputs.nameRender === 'renderState' && tagCard === '') {
            this.setState({ tagCard: 'on update', tagCardArray: ['on update', 'on change'] });
            result = 'on update';
        }
        if (inputs.nameRender === 'renderStateCondition' && tagCard === '') {
            this.setState({ tagCard: '>', tagCardArray: ['>', '>=', '<', '<=', '=', '<>', '...'] });
            result = '>';
        }
        if ((inputs.nameRender === 'renderTimeCondition' || inputs.nameRender === 'renderAstrologicalCondition') && tagCard === '') {
            this.setState({ tagCard: '>', tagCardArray: ['>', '>=', '<', '<=', '=', '<>'] });
            result = '>';
        }
        if (inputs.nameRender === 'renderSetStateAction' && tagCard === '') {
            this.setState({ tagCard: 'control', tagCardArray: ['control', 'update', 'control1', 'control2', 'control3', 'control4', 'control5'] });
            result = 'control';
        }
        if (tagCardArray.length > 3) {
            result = <div>
                <div aria-controls="simple-menu" aria-haspopup="true" onClick={(e) => this.setState({ openTagMenu: e.currentTarget })}>{tagCard}</div>
                <Menu
                    id="simple-menu"
                    anchorEl={openTagMenu}
                    keepMounted
                    open={Boolean(openTagMenu)}
                    onClose={() => this.setState({ openTagMenu: null })}
                >
                    {tagCardArray.map(el => <MenuItem key={el} onClick={(e) => this.setState({ openTagMenu: null, tagCard: e.currentTarget.innerText })}>{el}</MenuItem>)}
                </Menu>
            </div>
        }
        return result || tagCard;
    }

    tagGenerateNew = () => {
        const { tagCard, tagCardArray } = this.state;
        if (tagCard && tagCardArray.length < 4) {
            if (tagCardArray.indexOf(tagCard) === tagCardArray.length - 1) {
                return this.setState({ tagCard: tagCardArray[0] });
            }
            this.setState({ tagCard: tagCardArray[tagCardArray.indexOf(tagCard) + 1] });
        }
    }
    componentDidMount = async () => {
        await this.tagGenerateNew();
        await this.tagGenerate();
    }
    render = () => {
        const { inputs, tagCard, name, icon } = this.state;
        // const { GenericInputBlockMethod } = this.context.state;
        // console.log('render', inputs, name, icon);
        return <Fragment>
            <MaterialDynamicIcon iconName={icon} className={cls.iconThemCard} />
            <div className={cls.blockName}>
                <span className={cls.nameCard}>
                    {name && name.en}
                </span>
                {/* {GenericInputBlockMethod[inputs.nameRender] ?
                    GenericInputBlockMethod[inputs.nameRender](inputs.default, () => { }, inputs.options || []) :
                    null} */}
                {this[inputs.nameRender] ?
                    this[inputs.nameRender](inputs.default, () => { }, inputs.options || []) :
                    null}
            </div>
            {tagCard && <div className={cls.controlMenuTop} style={{ opacity: 1, height: 22, top: -22 }}>
                <div onClick={async e => {
                    await this.tagGenerateNew();
                    await this.tagGenerate();
                }} className={cls.tagCard} >{this.tagGenerate()}</div>
            </div>}
        </Fragment>
    }
};

GenericBlocks.contextType = ContextWrapperCreate;
export default GenericBlocks;