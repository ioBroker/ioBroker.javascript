import { TextField } from '@mui/material';
import React from 'react';
import cls from './style.module.scss';
import PropTypes from 'prop-types';
import clsx from 'clsx';

const CustomTime = ({ value, style, onChange, className }) => {
    return <TextField
        variant="standard"
        id="time"
        type="time"
        onChange={(e) => onChange(e.currentTarget.value)}
        value={value}
        className={clsx(cls.root, className)}
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
    style: PropTypes.object,
    onChange: PropTypes.func
};

export default CustomTime;