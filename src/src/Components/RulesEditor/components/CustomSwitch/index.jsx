import { FormControlLabel, Switch } from '@mui/material';
import React, { memo, useState } from 'react';
// import { I18n } from '@iobroker/adapter-react-v5';
import PropTypes from 'prop-types';
import cls from './style.module.scss';

const CustomSwitch = ({ label, size, value, style, onChange, className, customValue }) => {
    const [switchChecked, setSwitchChecked] = useState(false);
    return <FormControlLabel
        className={cls.root}
        control={<Switch
            checked={customValue ? value : switchChecked}
            style={style}
            className={className}
            onChange={e => {
                if (!customValue) setSwitchChecked(e.target.checked);
                onChange(e.target.checked);
            }}
            size={size}
        />
        }
        label={label}
    />;
}

CustomSwitch.defaultProps = {
    value: false,
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
    label: 'all'
};

CustomSwitch.propTypes = {
    title: PropTypes.string,
    attr: PropTypes.string,
    type: PropTypes.string,
    style: PropTypes.object,
    native: PropTypes.object,
    onChange: PropTypes.func,
    component: PropTypes.object,
    styleComponentBlock: PropTypes.object
};

export default memo(CustomSwitch);