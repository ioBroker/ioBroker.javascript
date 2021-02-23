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
        if (!settings.tagCard && item.tagCardArray) {
            settings.tagCard = item.tagCardArray[0];
        }

        this.state = {
            inputs: item.inputs || props.inputs || [],
            name: item.name || props.name || '',
            icon: item.icon || props.icon || '',

            tagCardArray: item.tagCardArray || [],

            showSelectId: false,
            openTagMenu: false,
            openModal: false,
            iconTag: false,

            oid: {},
            instanceSelectionOptions: [],
            instanceSelectionDef: '',

            settings
        };
    }

    // called every time, the tagCard changes or at start
    onTagChange(tagCard) {
        // do nothing, but blocks can overwrite it
    }

    // called if trigger added or removed
    onUpdate() {
        // do nothing, but blocks can overwrite it
    }

    // called every time if some attribute changes
    onValueChanged(value, attr) {
        // do nothing, but blocks can overwrite it
    }

    renderText = (input, value, onChange) => {
        const { className } = this.props;
        const { attr, frontText, backText, nameBlock, name } = input;
        return <Fragment key={attr}>
            <div className={clsx(cls.displayFlex, cls.blockMarginTop)}>
                {frontText && <div className={cls.frontText}>{frontText}</div>}
                <CustomInput
                    className={className}
                    autoComplete="off"
                    label={utils.getName(name)}
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={value}
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
        const { attr, frontText, backText, nameBlock } = input;
        return <div key={attr}>
            <div className={clsx(cls.displayFlex, cls.blockMarginTop)}>
                {frontText && <div className={cls.frontText}>{frontText}</div>}
                <CustomSwitch
                    className={className}
                    label=''
                    customValue
                    value={value}
                    onChange={onChange}
                />
                {backText && <div className={cls.backText}>{backText}</div>}
            </div>
            {nameBlock && <div className={cls.nameBlock}>{nameBlock}</div>}
        </div>;
    }

    renderNameText = ({ attr }, value) => <div
        className={clsx(cls.displayFlex, cls.blockMarginTop)}
        key={attr}>
        {value}
    </div>

    renderNumber = (input, value, onChange) => {
        const { className } = this.props;
        const { settings } = this.state;
        const { attr, backText, frontText, openCheckbox } = input;
        let visibility = true;
        if (openCheckbox) {
            visibility = typeof settings['offset'] === 'boolean' ? settings['offset'] : true
        }
        return visibility ? <div key={attr} className={clsx(cls.displayFlex, cls.blockMarginTop)}>
            {frontText && <div className={cls.frontText}>{frontText}</div>}
            <CustomInput
                className={className}
                fullWidth
                autoComplete="off"
                label="number"
                variant="outlined"
                size="small"
                type="number"
                value={value}
                onChange={onChange}
                customValue
            />
            {backText && <div className={cls.backText}>{backText}</div>}
        </div> : null;
    }

    renderColor = (input, value, onChange) => {
        const { className } = this.props;
        const { attr, backText, frontText } = input;
        return <div key={attr} className={clsx(cls.displayFlex, cls.blockMarginTop)}>
            {frontText && <div className={cls.frontText}>{frontText}</div>}
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
            {backText && <div className={cls.backText}>{backText}</div>}
        </div>;
    }

    renderCheckbox = (input, value, onChange) => {
        const { className } = this.props;
        const { settings } = this.state;
        const { attr, backText, frontText, defaultValue } = input;
        return <div key={attr} className={cls.displayFlex}>
            {frontText && <div className={cls.frontText}>{frontText}</div>}
            <CustomCheckbox
                className={className}
                autoComplete="off"
                label="number"
                variant="outlined"
                size="small"
                style={{ marginRight: 5 }}
                value={typeof settings[attr] === 'boolean' ? settings[attr] : defaultValue}
                customValue
                onChange={onChange}
            />
            {backText && <div className={cls.backText}>{backText}</div>}
        </div>;
    }

    renderSlider = (input, value, onChange) => {
        const { className } = this.props;
        const { attr, frontText, backText, nameBlock } = input;
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
                    value={value}
                    onChange={onChange}
                />
                {backText && <div className={cls.backText}>{backText}</div>}
            </div>
            {nameBlock && <div className={cls.nameBlock}>{nameBlock}</div>}
        </div>;
    }

    renderButton = (input, value, onClick) => {
        const { className } = this.props;
        const { attr, frontText, backText } = input;
        return <div key={attr} className={clsx(cls.displayFlex, cls.blockMarginTop)}>
            {frontText && <div className={cls.frontText}>{frontText}</div>}
            <CustomButton
                fullWidth
                value={value}
                className={className}
                onClick={onClick}
            />
            {backText && <div className={cls.backText}>{backText}</div>}
        </div>
    }

    renderObjectID = (input, value, onChange) => {
        const { showSelectId, settings } = this.state;
        const { className, socket } = this.props;
        const { attr, openCheckbox } = input;
        let visibility = true;
        if (openCheckbox) {
            visibility = typeof settings['offset'] === 'boolean' ? settings['offset'] : true
        }

        if (settings[attr] && !this.state[settings[attr]]) {
            setTimeout(() => {
                this.props.socket.getObject(value)
                    .then(obj =>
                        this.setState({ [settings[attr]]: obj }, () => this.onTagChange(obj.common)));
            }, 0);
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
                    value={value}
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
            {this.state[this.state.settings[input.attr]] && <div className={cls.nameBlock}>{Utils.getObjectNameFromObj(this.state[settings[attr]], I18n.getLanguage())}</div>}
            {showSelectId ? <DialogSelectID
                key="tableSelect"
                // imagePrefix="../.."
                dialogName={'javascript'}
                themeType={Utils.getThemeName()}
                socket={socket}
                statesOnly={true}
                // selected={this.selectIdValue}
                onClose={() => this.setState({ showSelectId: false })}
                onOk={(selected, name, common) =>
                    this.setState({ showSelectId: false }, () => {
                        onChange(selected);
                        // read type of object
                        this.props.socket.getObject(selected)
                            .then(obj =>
                                onChange(obj.common.type, attr + 'Type'));
                    })}
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
        return <div key={attr} className={cls.displayFlex} style={{ whiteSpace: 'nowrap' }}>
            {frontText && <div className={cls.frontText}>{frontText}</div>}
            <CustomTime
                value={value}
                onChange={onChange}
            />
            {backText && <div className={cls.backText}>{backText}</div>}
        </div>
    };

    renderSelect = (input, value, onChange) => {
        const { className } = this.props;
        const { name, options, frontText, backText, attr } = input;
        return <div key={attr} className={clsx(cls.displayFlex, cls.blockMarginTop)} style={{ whiteSpace: 'nowrap' }}>
            {frontText && <div className={cls.frontText}>{frontText}</div>}
            <CustomSelect
                title={name}
                className={className}
                options={options}
                value={value}
                onChange={onChange}
                customValue
            />
            {backText && <div className={cls.backText}>{backText}</div>}
        </div>
    };

    renderModalInput = (input, value, onChange) => {
        const { openModal, settings } = this.state;
        const { className } = this.props;
        const { attr, nameBlock, frontText, backText } = input;
        console.log(settings[attr])
        return <div key={attr}>
            <div className={clsx(cls.displayFlex, cls.blockMarginTop)}>
                {frontText && <div className={cls.frontText}>{frontText}</div>}
                <CustomInput
                    className={className}
                    autoComplete="off"
                    fullWidth
                    variant="outlined"
                    size="small"
                    value={value}
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
                buttonClick={() => this.setState({ openModal: false })}
                close={() => this.setState({ openModal: false })}
                titleButton={'ok'}
                titleButton2={'cancel'}>
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
                            selected={el === tagCard}
                            onClick={e => {
                                const settings = { ...this.state.settings, tagCard: el };
                                this.setState({ openTagMenu: null, settings }, () => {
                                    this.props.onChange(settings);
                                    this.onTagChange(el);
                                });
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
                return this.setState({ settings: newSettings }, () => {
                    this.props.onChange(newSettings)
                });
            } else {
                newSettings.tagCard = tagCardArray[tagCardArray.indexOf(tagCard) + 1];
                this.setState({ settings: newSettings }, () => {
                    this.props.onChange(newSettings)
                });
            }
        }
    };

    componentDidMount = () => {
        this.onTagChange();
    };

    onChangeInput = (attribute) => {
        return (value, attr) => {
            const settings = JSON.parse(JSON.stringify(this.state.settings));
            settings[attr || attribute] = value;
            settings.id = this.getData().id;
            settings._id = this.props._id;

            this.setState({ settings }, () => {
                this.onValueChanged(value, attr || attribute);
                this.props.onChange(settings);
            });
        }
    }

    render = () => {
        const { inputs, name, icon, iconTag, settings, settings: { tagCard } } = this.state;
        return <Fragment>
            {iconTag ? this.renderIconTag() :
                <MaterialDynamicIcon iconName={icon} className={cls.iconThemCard} />}
            <div className={cls.blockName}>
                <span className={cls.nameCard}>
                    {name && name.en}
                </span>
                {inputs.filter(({ nameRender }) => this[nameRender])
                    .map(input => {
                        const { nameRender, defaultValue, attr, options } = input;
                        return this[nameRender](
                            input,
                            !!settings[attr] ? settings[attr] : defaultValue,
                            this.onChangeInput(attr),
                            options || []
                        );
                    })}
            </div>
            {tagCard && <div className={cls.controlMenuTop} style={{ opacity: 1, height: 22, top: -22 }}>
                <div onClick={e => this.tagGenerateNew()} className={cls.tagCard}>{this.tagGenerate()}</div>
            </div>}
        </Fragment>;
    };
}

export default GenericBlock;