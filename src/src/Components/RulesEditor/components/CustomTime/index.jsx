import React from 'react';
import PropTypes from 'prop-types';

import { TextField } from '@mui/material';

import { Utils } from '@iobroker/adapter-react-v5';

import cls from './style.module.scss';

const CustomTime = ({ value, style, onChange, className }) => {
    return <TextField
        variant="standard"
        id="time"
        type="time"
        onChange={(e) => onChange(e.currentTarget.value)}
        value={value}
        className={Utils.clsx(cls.root, className)}
        fullWidth
        style={style}
        slotProps={{
            htmlInput: {
                step: 300, // 5 min
            },
            inputLabel: {
                shrink: true,
            },
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
