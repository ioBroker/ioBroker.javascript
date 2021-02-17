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

class GenericBlock extends PureComponent {
    constructor(props, item) {
        super(props);
        item = item || {};

        this.state = {
            inputs: item.inputs || props.inputs || [],
            name: item.name || props.name || '',
            icon: item.icon || props.icon || '',
            common: { type: 'number' },

            tagCardArray: item.tagCardArray || [],

            showSelectId: false,
            openTagMenu: false,
            openModal: false,
            openCheckbox: false,
            iconTag: false,

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
        const { attr, defaultValue, frontText, backText, nameBlock } = input;
        return <div key={attr}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                {frontText}
                <CustomInput
                    className={className}
                    autoComplete="off"
                    label={utils.getName(input.name)}
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={defaultValue}
                    onChange={onChange}
                    customValue
                />
                {backText}
            </div>
            {nameBlock}
        </div>;
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
                customValue
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
        const { attr, defaultValue, frontText, backText, nameBlock } = input;
        return <div key={attr}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                {frontText}
                <CustomSlider
                    customValue
                    className={className}
                    autoComplete="off"
                    label="number"
                    variant="outlined"
                    size="small"
                    value={defaultValue}
                    onChange={onChange}
                />
                {backText}
            </div>
            {nameBlock}
        </div>;
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
        const { showSelectId, common: { type }, openCheckbox } = this.state;
        const { className, socket } = this.props;
        const { attr, nameBlock, defaultValue, additionallyCommon, openCheckbox: openCheckboxValue } = input;
        let visibility = true;
        if (openCheckboxValue) {
            visibility = openCheckbox
        }
        let additionallyBlock = null;
        if (additionallyCommon) {
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
        }
        // return null
        return visibility ? <div key={attr}>
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
        </div> : null;
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

    renderIconTag = () => {
        return <div style={{
            fontSize: 40,
            color: '#460f46',
            display: 'flex',
            alignItems: 'center',
            minWidth: 40,
            marginBottom: 10,
            marginLeft: 12
        }}>
            {this.state.settings.tagCard}
        </div>
    }

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
        const { name, options, frontText, defaultValue } = input;
        return <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
            {frontText}
            <CustomSelect
                title={name}
                className={className}
                options={options}
                value={defaultValue}
                onChange={onChange}
                customValue
            />
        </div>
    };

    renderModalInput = (input, value, onChange) => {
        const { openModal } = this.state;
        const { className } = this.props;
        const { attr, defaultValue, nameBlock, frontText, backText } = input;
        return <div key={attr}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                {frontText}
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
                {backText}
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

    /////////////////////////////
    tagGenerate = () => {
        let { tagCardArray, openTagMenu } = this.state;
        let { tagCard } = this.state.settings;
        let result = tagCard;

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
        const { tagCardArray, settings, settings: { tagCard } } = this.state;
        if (tagCard && tagCardArray.length < 4) {
            const newSettings = { ...settings };
            if (tagCardArray.indexOf(tagCard) === tagCardArray.length - 1) {
                newSettings.tagCard = tagCardArray[0];
                return this.setState({ settings: newSettings });
            } else {
                newSettings.tagCard = tagCardArray[tagCardArray.indexOf(tagCard) + 1];
                this.setState({ settings: newSettings });
            }
        }
    };

    componentDidMount = async () => {
        this.onTagChange && await this.onTagChange();
        await this.tagGenerateNew();
        await this.tagGenerate();
    };

    render = () => {
        const { inputs, name, icon, iconTag } = this.state;
        let _inputs = inputs || [];
        if (!Array.isArray(inputs)) {
            _inputs = [inputs];
        }
        return <Fragment>
            {iconTag ? this.renderIconTag() :
                <MaterialDynamicIcon iconName={icon} className={cls.iconThemCard} />}
            <div className={cls.blockName}>
                <span className={cls.nameCard}>
                    {name && name.en}
                </span>
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