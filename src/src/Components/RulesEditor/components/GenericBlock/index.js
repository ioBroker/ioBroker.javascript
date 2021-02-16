import React, { PureComponent, Fragment } from 'react';
import cls from './style.module.scss';

import { Menu, MenuItem } from '@material-ui/core';

import DialogSelectID from '@iobroker/adapter-react/Dialogs/SelectID';
import Utils from '@iobroker/adapter-react/Components/Utils';
import I18n from '@iobroker/adapter-react/i18n';

import CustomButton from '../CustomButton';
import CustomCheckbox from '../CustomCheckbox';
import CustomInput from '../CustomInput';
import CustomSlider from '../CustomSlider';
import CustomSelect from '../CustomSelect';
import CustomTime from '../CustomTime';
import CustomModal from '../CustomModal';
import MaterialDynamicIcon from '../../helpers/MaterialDynamicIcon';
import CustomSwitch from '../CustomSwitch';
import utils from '../../helpers/utils';

// const
class GenericBlock extends PureComponent {
    constructor(props, item) {
        super(props);
        item = item || {};

        // console.log(props, item)
        this.state = {
            inputs: item.inputs || props.inputs || [],
            name: item.name || props.name || '',
            icon: item.icon || props.icon || '',
            common: { type: 'number' },

            tagCardArray: item.tagCardArray || null,

            showSelectId: false,
            openTagMenu: false,
            openModal: false,
            openCheckbox: false,
            iconTag:false,

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

            settings: {
                tagCard: item.tagCardArray ? item.tagCardArray[0] || '' : ''
            }
        };
    }

    getConfig() {
        return { ...this.state.settings };
    }

    setConfig(settings) {
        this.setState({ settings });
    }

    renderText = (input, value, onChange) => {
        const { className } = this.props;
        return <CustomInput
            key={input.attr}
            className={className}
            autoComplete="off"
            label={utils.getName(input.name)}
            variant="outlined"
            size="small"
            value={value}
            onChange={onChange}
        />;
    }
    renderNameText = (input, value, onChange) => {
        const { className } = this.props;
        const { attr, defaultValue } = input;
        return <div
            style={{ display: 'flex', alignItems: 'center' }}
            className={className}
            key={attr}>
            {defaultValue}
        </div>
    }

    renderNumber = (input, value, onChange) => {
        const { className } = this.props;
        const { openCheckbox } = this.state;
        const { attr, defaultValue, backText, openCheckbox: openCheckboxValue } = input;
        let visibility = true;
        if (openCheckboxValue) {
            visibility = openCheckbox
        }
        return visibility ? <div style={{ display: 'flex', alignItems: 'center' }}>
            <CustomInput
                key={attr}
                className={className}
                autoComplete="off"
                label="number"
                variant="outlined"
                size="small"
                type="number"
                value={defaultValue}
                onChange={onChange}
                customValue
            />
            {backText}
        </div> : null;
    }

    renderCheckbox = (input, value, onChange) => {
        const { className } = this.props;
        const { openCheckbox } = this.state;
        const { attr, backText } = input;
        return <div style={{ display: 'flex', alignItems: 'center' }}>
            <CustomCheckbox
                key={attr}
                className={className}
                autoComplete="off"
                label="number"
                variant="outlined"
                size="small"
                style={{ marginRight: 5 }}
                value={openCheckbox}
                onChange={(e) => {
                    console.log(e)
                    this.setState({ openCheckbox: e })
                }}
            />
            {backText}
        </div>;
    }

    renderSlider = (input, value, onChange) => {
        const { className } = this.props;
        return <CustomSlider
            key={input.attr}
            className={className}
            autoComplete="off"
            label="number"
            variant="outlined"
            size="small"
            value={value}
            onChange={onChange}
        />;
    }

    renderButton = (input, value, onClick) => {
        const { className } = this.props;
        return <CustomButton
            key={input.attr}
            fullWidth
            value='click me'
            className={className}
            onClick={onClick}
        />;
    }

    renderObjectID = (input, value, onChange) => {
        const { showSelectId, common: { type } } = this.state;
        const { className, socket } = this.props;
        const { attr, nameBlock, defaultValue } = input;
        let additionallyBlock = null;
        switch (type) {
            case 'number':
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
                </div>;
                break;
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
                </div>;
                break;

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
                </div>;
                break;

            case 'control3':
                additionallyBlock = <div style={{ display: 'flex', alignItems: 'center' }}>
                    <CustomSelect
                        // title='ip'
                        className={className}
                        options={[{ value: 'State1', title: 'State1' }, {
                            value: 'State2',
                            title: 'State2'
                        }, { value: 'State3', title: 'State3' },]}
                        value={'State1'}
                        onChange={onChange}
                    />
                </div>;
                break;

            case 'control4':
                additionallyBlock = <div style={{ display: 'flex', alignItems: 'center' }}>
                    false
                    <CustomSwitch
                        label=''
                    />
                    true
                </div>;
                break;

            case 'control5':
                additionallyBlock = <div style={{ display: 'flex', alignItems: 'center' }}>
                    <CustomButton
                        // fullWidth
                        value='Press'
                        className={className}
                        onClick={onChange}
                    />
                </div>;
                break;

            default:
                additionallyBlock = null;
                break
        }
        // return null
        return <div key={attr}>
            <div style={{ display: 'flex', alignItems: 'center' }}><CustomInput
                className={className}
                autoComplete="off"
                fullWidth
                disabled
                variant="outlined"
                size="small"
                value={defaultValue}
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
            {nameBlock}
            {showSelectId ? <DialogSelectID
                key="tableSelect"
                // imagePrefix="../.."
                dialogName={'javascript'}
                themeType={Utils.getThemeName()}
                socket={socket}
                statesOnly={true}
                // selected={this.selectIdValue}
                onClose={() => this.setState({ showSelectId: false })}
                onOk={(selected, name) => {
                    console.log(1111, selected, name)
                    this.setState({ showSelectId: false, selectIdValue: selected });
                }}
            /> : null}
            {additionallyBlock}
        </div>;
    }

    renderColor = (input, value, onChange) => {
        const { className } = this.props;
        return <CustomInput
            key={input.attr}
            className={className}
            autoComplete="off"
            fullWidth
            variant="outlined"
            size="small"
            type="color"
            value={value}
            onChange={onChange}
        />;
    }


    renderState = (input, value, onChange) => {
        const { showSelectId } = this.state;
        const { className } = this.props;
        const { socket } = this.context;
        switch (this.state.settings.tagCard) {
            case "on update":
                return <div key={input.attr}>
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
                    /> : null}
                </div>;

            default:
            case "on change":
                return <div key={input.attr}>
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
                    /> : null}
                </div>;
        }
    }

    renderOnScript = (input, value, onChange) => {
        const { className } = this.props;
        return <div key={input.attr} style={{ display: 'flex', alignItems: 'center' }} className={className}>
            On script save or adapter start
        </div>
    };

    renderIconTag = () => {
        return <div style={{
            fontSize: 40,
            color: '#460f46',
            display: 'flex',
            alignItems: 'center',
            minWidth: 40,
            marginBottom: 10,
            marginLeft:12
        }}>
            {this.state.settings.tagCard}
        </div>
    }

    renderDate = (input, value, onChange) => {
        return <CustomTime key={input.attr} />
    };

    renderTime = (input, value, onChange) => {
        const { attr, backText, frontText } = input
        return <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
            {frontText}
            <CustomTime key={attr} />
            {backText}
        </div>
    };

    renderSelect = (input, value, onChange) => {
        const { className } = this.props;
        const { name, options, frontText } = input;
        return <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
            {frontText}
            <CustomSelect
                title={name}
                className={className}
                options={options}
                value={value}
                onChange={onChange}
            />
        </div>
    };

    renderInstanceSelection = (input, value, onChange, options) => {
        const { className } = this.props;
        return <CustomSelect
            key={input.attr}
            // title='ip'
            className={className}
            options={options}
            value={'test1'}
            onChange={onChange}
        />
    };

    renderStateCondition = (input, value, onChange) => {
        const { showSelectId, openCheckbox } = this.state;
        const { className } = this.props;
        const { socket } = this.context;
        return <div key={input.attr} style={{ display: 'flex' }}>
            <div style={{
                fontSize: 30,
                color: '#460f46',
                display: 'flex',
                alignItems: 'center',
                minWidth: 40,
                marginBottom: 30
            }}>
                {this.state.settings.tagCard}
            </div>
            <div>
                <div style={{ display: 'flex', alignItems: 'center' }}><CustomCheckbox
                    className={className}
                    autoComplete="off"
                    label="number"
                    variant="outlined"
                    size="small"
                    style={{ marginRight: 5 }}
                    value={openCheckbox}
                    onChange={(e) => this.setState({ openCheckbox: e })}
                /> Value from trigger
                </div>

                {openCheckbox && <div>
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
                    />
                </div>
            </div>
        </div>;
    };

    renderModalInput = (input, value, onChange) => {
        const { openModal } = this.state;
        const { className } = this.props;
        const { attr, defaultValue, nameBlock } = input;
        return <div key={attr}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <CustomInput
                    className={className}
                    autoComplete="off"
                    fullWidth
                    variant="outlined"
                    size="small"
                    value={defaultValue}
                    onChange={onChange}
                    customValue
                />
                <CustomButton
                    fullWidth
                    style={{ width: 80, marginLeft: 5 }}
                    value='...'
                    className={className}
                    onClick={() => this.setState({ openModal: true })}
                />
            </div>
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
                    value={defaultValue}
                    onChange={onChange}
                    customValue
                />
            </CustomModal>
            {nameBlock}
        </div>;
    };

    renderPrintTextAction = (input, value, onChange) => {
        const { openModal } = this.state;
        const { className } = this.props;
        return <div key={input.attr}>
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
                />
            </div>
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
            Log text
        </div>;
    };
    /////////////////////////////
    tagGenerate = () => {
        let { inputs, tagCardArray, openTagMenu } = this.state;
        let result;
        if (!tagCardArray) {
            if (inputs.nameRender === 'renderTimeOfDay') {
                tagCardArray = ['CRON', 'Wizard', 'Interval', 'at', 'Astro'];
            } else if (inputs.nameRender === 'renderState') {
                tagCardArray = ['on update', 'on change'];
            } else if (inputs.nameRender === 'renderStateCondition') {
                tagCardArray = ['>', '>=', '<', '<=', '=', '<>', '...'];
            } else if (inputs.nameRender === 'renderSetStateAction') {
                tagCardArray = ['control', 'update'];
            } else {
                tagCardArray = [];
            }

            const settings = { ...this.state.settings };
            settings.tagCard = tagCardArray[0] || null
            this.setState({ tagCardArray, settings });
            result = settings.tagCard;
        } else {
            result = this.state.settings.tagCard;
        }

        if (tagCardArray.length > 3) {
            result = <div>
                <div aria-controls="simple-menu" aria-haspopup="true"
                    onClick={(e) => this.setState({ openTagMenu: e.currentTarget })}>{result}</div>
                <Menu
                    id="simple-menu"
                    anchorEl={openTagMenu}
                    keepMounted
                    open={Boolean(openTagMenu)}
                    onClose={() => this.setState({ openTagMenu: null })}
                >
                    {tagCardArray.map(el =>
                        <MenuItem key={el}
                            onClick={e => {
                                const settings = { ...this.state.settings, tagCard: el };
                                this.setState({ openTagMenu: null, settings }, this.onTagChange && this.onTagChange(el));
                            }}>{I18n.t(el)}</MenuItem>)}
                </Menu>
            </div>;
        }

        return result;
    };

    tagGenerateNew = () => {
        const { tagCardArray } = this.state;
        if (this.state.settings.tagCard && tagCardArray.length < 4) {
            const settings = { ...this.state.settings };
            if (tagCardArray.indexOf(this.state.settings.tagCard) === tagCardArray.length - 1) {
                settings.tagCard = tagCardArray[0];
                return this.setState({ settings });
            } else {
                settings.tagCard = tagCardArray[tagCardArray.indexOf(this.state.settings.tagCard) + 1];
                this.setState(settings);
            }
        }
    };

    componentDidMount = async () => {
        this.onTagChange && await this.onTagChange();
        await this.tagGenerateNew();
        await this.tagGenerate();
    };

    render = () => {
        const { inputs, name, icon,iconTag } = this.state;
        let _inputs = inputs || [];
        if (!Array.isArray(inputs)) {
            _inputs = [inputs];
        }
        // const { GenericInputBlockMethod } = this.context.state;
        // console.log('render', inputs, name, icon);
        return <Fragment>
           {iconTag? this.renderIconTag(): 
           <MaterialDynamicIcon iconName={icon} className={cls.iconThemCard} />}
            <div className={cls.blockName}>
                <span className={cls.nameCard}>
                    {name && name.en}
                </span>
                {/* {GenericInputBlockMethod[inputs.nameRender] ?
                    GenericInputBlockMethod[inputs.nameRender](inputs.default, () => { }, inputs.options || []) :
                    null} */}
                {_inputs.filter(input => this[input.nameRender])
                    .map(input => {
                        return this[input.nameRender](
                            input,
                            this.state.settings[input.attr] === undefined ? input.default : this.state.settings[input.attr],
                            (value, attr) => {
                                const settings = JSON.parse(JSON.stringify(this.state.settings));
                                settings[attr || input.attr] = attr;
                                this.setState({ settings });
                            },
                            input.options || []
                        );
                    })}
            </div>
            {this.state.settings.tagCard && <div className={cls.controlMenuTop} style={{ opacity: 1, height: 22, top: -22 }}>
                <div onClick={async e => {
                    await this.tagGenerateNew();
                    await this.tagGenerate();
                }} className={cls.tagCard}>{this.tagGenerate()}</div>
            </div>}
        </Fragment>;
    };
}

export default GenericBlock;