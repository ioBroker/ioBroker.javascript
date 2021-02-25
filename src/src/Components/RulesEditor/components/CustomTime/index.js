import { TextField } from '@material-ui/core';
import React from 'react';
import cls from './style.module.scss';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';
import clsx from 'clsx';

const CustomTime = ({ table, value, title, attr, options, style, native, onChange, className }) => {
    return <TextField
        id="time"
        // label="Alarm clock"
        type="time"
        defaultValue="07:30"
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
    // options: PropTypes.array.isRequired,
    style: PropTypes.object,
    // native: PropTypes.object.isRequired,
    onChange: PropTypes.func
};

export default CustomTime;