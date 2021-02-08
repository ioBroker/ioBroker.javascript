import { TextField, withStyles } from '@material-ui/core';
import React from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
// import clsx from 'clsx';

const TimeFieldMod = withStyles({
    root: {
        margin: '10px 0',
        '& > *': {
            color: '#2d0440 !important'
        },
        '& label.Mui-focused': {
            color: '#81688c',
        },
        '& .MuiInput-underline:after': {
            borderBottomColor: '#510573',
        },
        '& .MuiInput-underline:before': {
            borderBottomColor: '#81688c',
        },
        '& .MuiInput-underline:hover:before': {
            borderBottomColor: '#81688c',
        },
    },
})(TextField);

const CustomTime = ({ table, value, title, attr, options, style, native, onChange, className }) => {

    return <TimeFieldMod
        id="time"
        // label="Alarm clock"
        type="time"
        defaultValue="07:30"
        className={className}
        fullWidth
        style={style}
        InputLabelProps={{
            shrink: true,
        }}
        inputProps={{
            step: 300, // 5 min
        }}
    />;
}

CustomTime.defaultProps = {
    value: '',
    className: null,
    table: false
};

CustomTime.propTypes = {
    title: PropTypes.string,
    attr: PropTypes.string,
    options: PropTypes.array.isRequired,
    style: PropTypes.object,
    native: PropTypes.object.isRequired,
    onChange: PropTypes.func
};

export default CustomTime;