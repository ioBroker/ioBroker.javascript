import { TextField, withStyles } from '@material-ui/core';
import React from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';

const TextFieldMod = withStyles({
    root: {
        background: '#71497d42',
        '& > *': {
            color: '#81688c !important'
        },
        '& label.Mui-focused': {
            color: '#81688c',
        },
        '& .MuiInput-underline:after': {
            borderBottomColor: '#81688c',
        },
        '& .MuiOutlinedInput-root': {
            '& fieldset': {
                borderColor: '#81688c',
            },
            '&:hover fieldset': {
                borderColor: '#81688c',
            },
            '&.Mui-focused fieldset': {
                borderColor: '#81688c',
            }
        },
    },
})(TextField);

const CustomInput = ({ fullWidth, autoComplete, label, error, size, variant, value, type, style, onChange, className }) => {
    return <TextFieldMod
        error={!!error}
        fullWidth={fullWidth}
        label={label}
        variant={variant}
        value={value}
        type={type}
        helperText={error}
        style={style}
        className={className}
        autoComplete={autoComplete}
        onChange={e => {
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
    autoComplete: ''
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