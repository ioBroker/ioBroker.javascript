import React, { Fragment } from 'react';
import CustomButton from '../CustomButton';
import CustomCheckbox from '../CustomCheckbox';
import CustomInput from '../CustomInput';
import CustomSlider from '../CustomSlider';
import DialogSelectID from '@iobroker/adapter-react/Dialogs/SelectID';
import CustomSelect from '../CustomSelect';
import CustomTime from '../CustomTime';
import GenericApp from '@iobroker/adapter-react/GenericApp';
import Utils from '@iobroker/adapter-react/Components/Utils';
import { Menu, MenuItem } from '@material-ui/core';
// import I18n from '@iobroker/adapter-react/i18n';

class GenericInputBlock extends GenericApp {
    constructor(props) {
        super(props, {
            socket: {
                autoSubscribeLog: true,
            },
        });
        this.state = {
            inputs: props.inputs,
            showSelectId: false,
            openTagMenu: false,
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
                socket={this.socket}
                statesOnly={true}
                // selected={this.selectIdValue}
                onClose={() => this.setState({ showSelectId: false })}
                onOk={(selected, name) => {
                    debugger
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

    renderTimeOfDay = () => {
        const { tagCard } = this.state;
        if (tagCard === 'interval') {
            return <><CustomTime /><CustomTime /></>
        }
        return <CustomTime />
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
            value={value}
            onChange={onChange}
        />
    }

    tagGenerate = () => {
        const { inputs, tagCard, tagCardArray, openTagMenu } = this.state;
        let result;
        if (inputs[0].nameRender === 'renderTimeOfDay' && tagCard === '') {
            this.setState({ tagCard: 'cron', tagCardArray: ['cron', 'vizard', 'interval'] });
            result = 'cron';
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
        console.log(result,tagCard)
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

    render = () => {
        const { inputs } = this.state;
        return <Fragment>
            {inputs.map(el => (this[el.nameRender](el.default, () => { }, el.options || [])))}
        </Fragment>
    }
};

export default GenericInputBlock;