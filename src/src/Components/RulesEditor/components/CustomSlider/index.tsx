import React, { useState } from 'react';
import PropTypes from 'prop-types';

import { Slider } from '@mui/material';

import { Utils } from '@iobroker/adapter-react-v5';

import cls from './style.module.scss';

const CustomSlider = ({ fullWidth, autoComplete, label, error, size, variant, value, type, style, onChange, className, customValue, min, max, step, unit }) => {
    const [inputText, setInputText] = useState(0);
    min = min !== undefined ? min : 0;
    max = max !== undefined ? max : 0;
    step = step !== undefined ? step : (max - min) / 100;

    const marks = [
        {
            value: min,
            label: min + (unit || ''),
        },
        {
            value: max,
            label: max + (unit || ''),
        },
    ];

    return <Slider
        defaultValue={customValue ? value : inputText}
        // getAriaValueText={customValue ? value : inputText}
        aria-labelledby="discrete-slider"
        valueLabelDisplay="auto"
        classes={{mark: cls.mark}}
        marks={marks}
        step={step}
        min={min}
        max={max}
        error={error || ''}
        //fullWidth={fullWidth}
        label={label}
        variant={variant}
        value={customValue ? value : inputText}
        type={type}
        //helperText={error || ''}
        style={style}
        className={Utils.clsx(cls.root, className)}
        autoComplete={autoComplete}
        onChange={(e, newValue) => {
            !customValue && setInputText(newValue);
            onChange(newValue);
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