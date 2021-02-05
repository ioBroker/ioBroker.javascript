import { Slider } from '@material-ui/core';
import React, { useState } from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';

const CustomSlider = ({ fullWidth, autoComplete, label, error, size, variant, value, type, style, onChange, className, customValue }) => {
    const [inputText, setInputText] = useState(0);
    return <Slider
    defaultValue={customValue ? value : inputText}
    getAriaValueText={customValue ? value : inputText}
    aria-labelledby="discrete-slider"
    valueLabelDisplay="auto"
    // step={10}
    marks
    min={0}
    max={100}
    error={!!error}
    fullWidth={fullWidth}
    label={label}
    variant={variant}
    value={customValue ? value : inputText}
    type={type}
    helperText={error}
    style={style}
    className={className}
    autoComplete={autoComplete}
    onChange={e => {
        if(!customValue)setInputText(e.target.value);
        onChange(e.target.value);
    }}
    margin="normal"
    size={size}
  />;
}

CustomSlider.defaultProps = {
    value: '',
    type: 'text',
    error: '',
    className: null,
    table: false,
    native: {},
    variant: 'standard',
    size: 'medium',
    component: null,
    styleComponentBlock: null,
    onChange: () => { },
    fullWidth: false,
    autoComplete: '',
    customValue: false
};

CustomSlider.propTypes = {
    title: PropTypes.string,
    attr: PropTypes.string,
    type: PropTypes.string,
    style: PropTypes.object,
    native: PropTypes.object,
    onChange: PropTypes.func,
    component: PropTypes.object,
    styleComponentBlock: PropTypes.object
};

export default CustomSlider;