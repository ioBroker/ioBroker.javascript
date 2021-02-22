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
import clsx from 'clsx';

class GenericBlock extends PureComponent {
    constructor(props, item) {
        super(props);
        item = item || {};
        let settings = props.settings || {
            tagCard: item.tagCardArray ? item.tagCardArray[0] || '' : ''
        }

        this.state = {
            inputs: item.inputs || props.inputs || [],
            name: item.name || props.name || '',
            icon: item.icon || props.icon || '',

            tagCardArray: item.tagCardArray || [],

            showSelectId: false,
            openTagMenu: false,
            openModal: false,
            openCheckbox: false,
            iconTag: false,

            instanceSelectionOptions: [],
            instanceSelectionDef: '',

            settings
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
        return <Fragment key={attr}>
            <div className={clsx(cls.displayFlex, cls.blockMarginTop)}>
                {frontText && <div className={cls.frontText}>{frontText}</div>}
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
                {backText && <div className={cls.backText}>{backText}</div>}
            </div>
            {nameBlock && <div className={cls.nameBlock}>{nameBlock}</div>}
        </Fragment>;
    }

    renderSwitch = (input, value, onChange) => {
        const { className } = this.props;
        const { attr, frontText, backText, nameBlock, defaultValue } = input;
        return <div key={attr}>
            <div className={clsx(cls.displayFlex, cls.blockMarginTop)}>
                {frontText && <div className={cls.frontText}>{frontText}</div>}
                <CustomSwitch
                    className={className}
                    label=''
                    customValue
                    value={defaultValue}
                />
                {backText && <div className={cls.backText}>{backText}</div>}
            </div>
            {nameBlock && <div className={cls.nameBlock}>{nameBlock}</div>}
        </div>;
    }

    renderNameText = (input, value, onChange) => {
        const { attr, defaultValue } = input;
        return <div
            className={clsx(cls.displayFlex, cls.blockMarginTop)}
            key={attr}>
            {defaultValue}
        </div>
    }

    renderNumber = (input, value, onChange) => {
        const { className } = this.props;
        const { openCheckbox } = this.state;
        const { attr, defaultValue, backText, frontText, openCheckbox: openCheckboxValue } = input;
        let visibility = true;
        if (openCheckboxValue) {
            visibility = openCheckbox
        }
        return visibility ? <div className={clsx(cls.displayFlex, cls.blockMarginTop)}>
            {frontText && <div className={cls.frontText}>{frontText}</div>}
            <CustomInput
                key={attr}
                className={className}
                fullWidth
                autoComplete="off"
                label="number"
                variant="outlined"
                size="small"
                type="number"
                value={defaultValue}
                onChange={onChange}
                customValue
            />
            {backText && <div className={cls.backText}>{backText}</div>}
        </div> : null;
    }

    renderColor = (input, value, onChange) => {
        const { className } = this.props;
        const { attr, defaultValue, backText, frontText } = input;
        return <div key={attr} className={clsx(cls.displayFlex, cls.blockMarginTop)}>
            {frontText && <div className={cls.frontText}>{frontText}</div>}
            <CustomInput
                className={className}
                autoComplete="off"
                fullWidth
                variant="outlined"
                size="small"
                type="color"
                value={defaultValue}
                onChange={onChange}
            />
            {backText && <div className={cls.backText}>{backText}</div>}
        </div>;
    }

    renderCheckbox = (input, value, onChange) => {
        const { className } = this.props;
        const { openCheckbox } = this.state;
        const { attr, backText, frontText } = input;
        return <div className={cls.displayFlex}>
            {frontText && <div className={cls.frontText}>{frontText}</div>}
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
                    this.setState({ openCheckbox: e })
                }}
            />
            {backText && <div className={cls.backText}>{backText}</div>}
        </div>;
    }

    renderSlider = (input, value, onChange) => {
        const { className } = this.props;
        const { attr, defaultValue, frontText, backText, nameBlock } = input;
        return <div key={attr}>
            <div className={cls.displayFlex}>
                {frontText && <div className={cls.frontText}>{frontText}</div>}
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
                {backText && <div className={cls.backText}>{backText}</div>}
            </div>
            {nameBlock && <div className={cls.nameBlock}>{nameBlock}</div>}
        </div>;
    }

    renderButton = (input, value, onClick) => {
        const { className } = this.props;
        const { attr, defaultValue, frontText, backText } = input;
        return <div key={attr} className={clsx(cls.displayFlex, cls.blockMarginTop)}>
            {frontText && <div className={cls.frontText}>{frontText}</div>}
            <CustomButton
                key={input.attr}
                fullWidth
                value={defaultValue}
                className={className}
                onClick={onClick}
            />
            {backText && <div className={cls.backText}>{backText}</div>}
        </div>
    }

    renderObjectID = (input, value, onChange) => {
        const { showSelectId, openCheckbox } = this.state;
        const { className, socket } = this.props;
        const { attr, nameBlock, defaultValue, openCheckbox: openCheckboxValue } = input;
        let visibility = true;
        if (openCheckboxValue) {
            visibility = openCheckbox;
        }

        if (this.state.settings[input.attr] && !this.state[this.state.settings[input.attr]]) {
            setTimeout(() => {
                this.props.socket.getObject(value)
                    .then(obj =>
                        this.setState({[this.state.settings[input.attr]]: obj}));
            }, 200);
        }

        // return null
        return visibility ? <div className={cls.blockMarginTop} key={attr}>
            <div className={cls.displayFlex}>
                <CustomInput
                    className={className}
                    autoComplete="off"
                    fullWidth
                    disabled
                    variant="outlined"
                    size="small"
                    value={this.state.settings[input.attr] === undefined ? defaultValue : this.state.settings[input.attr]}
                    customValue
                />
                <CustomButton
                    // fullWidth
                    style={{ marginLeft: 7 }}
                    value='...'
                    className={className}
                    onClick={() => this.setState({ showSelectId: true })}
                />
            </div>
            {this.state[this.state.settings[input.attr]] && <div className={cls.nameBlock}>{Utils.getObjectNameFromObj(this.state[this.state.settings[input.attr]], I18n.getLanguage())}</div>}
            {showSelectId ? <DialogSelectID
                key="tableSelect"
                // imagePrefix="../.."
                dialogName={'javascript'}
                themeType={Utils.getThemeName()}
                socket={socket}
                statesOnly={true}
                // selected={this.selectIdValue}
                onClose={() => this.setState({ showSelectId: false })}
                onOk={(selected, name) =>
                    this.setState({ showSelectId: false}, () =>
                        onChange(selected))}
            /> : null}
        </div> : null;
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
        return <div className={cls.displayFlex} style={{ whiteSpace: 'nowrap' }}>
            {frontText && <div className={cls.frontText}>{frontText}</div>}
            <CustomTime key={attr} />
            {backText && <div className={cls.backText}>{backText}</div>}
        </div>
    };

    renderSelect = (input, value, onChange) => {
        const { className } = this.props;
        const { name, options, frontText, backText, defaultValue } = input;
        return <div className={clsx(cls.displayFlex, cls.blockMarginTop)} style={{ whiteSpace: 'nowrap' }}>
            {frontText && <div className={cls.frontText}>{frontText}</div>}
            <CustomSelect
                title={name}
                className={className}
                options={options}
                value={defaultValue}
                onChange={onChange}
                customValue
            />
            {backText && <div className={cls.backText}>{backText}</div>}
        </div>
    };

    renderModalInput = (input, value, onChange) => {
        const { openModal } = this.state;
        const { className } = this.props;
        const { attr, defaultValue, nameBlock, frontText, backText } = input;
        return <div key={attr}>
            <div className={clsx(cls.displayFlex, cls.blockMarginTop)}>
                {frontText && <div className={cls.frontText}>{frontText}</div>}
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
                {backText && <div className={cls.backText}>{backText}</div>}
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
            {nameBlock && <div className={cls.nameBlock}>{nameBlock}</div>}
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
                                settings[attr || input.attr] = value;
                                settings.id = this.getData().id;
                                settings._id = this.props._id;

                                this.setState({ settings }, () => {
                                    this.onValueChange && this.onValueChange(value, attr || input.attr);
                                    this.props.onChange(settings)
                                });
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