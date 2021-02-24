import { TextField } from '@material-ui/core';
import React, { useState } from 'react';
import cls from './style.module.scss';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
import clsx from 'clsx';

const CustomInput = ({ fullWidth, disabled, multiline, rows, autoComplete, label, error, size, variant, value, type, style, onChange, className, customValue }) => {
    const [inputText, setInputText] = useState('');
    return <TextField
        error={!!error}
        fullWidth={fullWidth}
        label={label}
        disabled={disabled}
        variant={variant}
        multiline={multiline}
        rows={rows}
        value={customValue ? value : inputText}
        type={type}
        helperText={error}
        style={style}
        className={clsx(cls.root, className)}
        autoComplete={autoComplete}
        onChange={e => {
            if (!customValue) setInputText(e.target.value);
            onChange(e.target.value);
        }}
        margin="normal"
        size={size}
    />;
}

CustomInput.defaultProps = {
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
    customValue: false,
    rows: 1
};

CustomInput.propTypes = {
    title: PropTypes.string,
    attr: PropTypes.string,
    type: PropTypes.string,
    style: PropTypes.object,
    native: PropTypes.object,
    onChange: PropTypes.func,
    component: PropTypes.object,
    styleComponentBlock: PropTypes.object
};

export default CustomInput;