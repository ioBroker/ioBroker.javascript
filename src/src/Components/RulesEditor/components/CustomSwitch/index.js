import { FormControlLabel, Switch, withStyles } from '@material-ui/core';
import React, { memo, useState } from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';

const ColorSwitch = withStyles({
    switchBase: {
        color: '#922fb3d9',
        '&$checked': {
            color: '#922fb3d9',
        },
        '&$checked + $track': {
            backgroundColor: '#ef00ffb8',
        },
    },
    checked: {},
    track: {},
})(Switch);

const CustomSwitch = ({ label, size, value, style, onChange, className, customValue }) => {
    const [switchChecked, setSwitchChecked] = useState(false);
    return <FormControlLabel
        control={<ColorSwitch
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
        style={{ color: '#dfbdec' }}
        label={label}
    />;
}

CustomSwitch.defaultProps = {
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