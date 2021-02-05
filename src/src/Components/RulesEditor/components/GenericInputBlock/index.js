import React, { Component, Fragment } from 'react';
import CustomButton from '../CustomButton';
import CustomCheckbox from '../CustomCheckbox';
import CustomInput from '../CustomInput';
import CustomSlider from '../CustomSlider';
import DialogSelectID from '@iobroker/adapter-react/Dialogs/SelectID';
import CustomSelect from '../CustomSelect';
import CustomTime from '../CustomTime';
// import I18n from '@iobroker/adapter-react/i18n';

class GenericInputBlock extends Component {
    constructor(props) {
        super(props);
        this.state = {
            inputs: props.inputs
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
            className={className}
            onClick={onClick}
        />
    }
    renderObjectID = () => {
        return this.props.socket?<DialogSelectID
            key="tableSelect"
            imagePrefix="../.."
            dialogName={this.props.adapterName}
            themeType={this.props.themeType}
            socket={this.props.socket}
            statesOnly={true}
            selected={this.state.selectIdValue}
            onClose={() => this.setState({ showSelectId: false })}
            onOk={(selected, name) => {
                debugger
                this.setState({ showSelectId: false, selectIdValue: selected });
            }}
        />:null
    }
    renderColor = (value, onChange) => {
        const { className } = this.props;
        return <CustomInput
            className={className}
            autoComplete="off"
            label="number"
            variant="outlined"
            size="small"
            type="color"
            value={value}
            onChange={onChange}
        />
    }
    renderTimeOfDay = () => {
        return <CustomTime />
    }
    renderDate = () => {
        return <CustomTime />
    }
    renderInstanceSelection = (value, onChange, options) => {
        const { className } = this.props;
        return <CustomSelect
            title='ip'
            className={className}
            options={options}
            value={value}
            onChange={onChange}
        />
    }

    render = () => {
        const { inputs } = this.state;
        return <Fragment>
            {inputs.map(el => (this[el.nameRender](el.default, ()=>{}, el.options || [])))}
        </Fragment>
    }
};

export default GenericInputBlock;