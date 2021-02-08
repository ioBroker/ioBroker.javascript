import { Slider, withStyles } from '@material-ui/core';
import React, { useState } from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';

const PrettoSlider = withStyles({
    root: {
        color: '#81688c',
        height: 8,
    },
    thumb: {
        height: 24,
        width: 24,
        backgroundColor: '#fff',
        border: '2px solid currentColor',
        marginTop: -8,
        marginLeft: -12,
        '&:focus, &:hover, &$active': {
            boxShadow: 'inherit',
        },
    },
    active: {},
    valueLabel: {
        left: 'calc(-50% + 4px)',
    },
    track: {
        height: 8,
        borderRadius: 4,
    },
    rail: {
        height: 8,
        borderRadius: 4,
    },
})(Slider);

const CustomSlider = ({ fullWidth, autoComplete, label, error, size, variant, value, type, style, onChange, className, customValue }) => {
    const [inputText, setInputText] = useState(0);
    return <PrettoSlider
        defaultValue={customValue ? value : inputText}
        // getAriaValueText={customValue ? value : inputText}
        aria-labelledby="discrete-slider"
        valueLabelDisplay="auto"
        // step={10}
        // marks
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
        onChange={(e, newValue) => {
            if (!customValue) setInputText(newValue);
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