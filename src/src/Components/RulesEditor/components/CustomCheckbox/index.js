import { Checkbox } from '@material-ui/core';
import React, { memo, useState } from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';


const CustomCheckbox = ({ type, size, value, style, onChange, className, customValue, disabled }) => {
    const [switchChecked, setSwitchChecked] = useState(false);
    let color = {
        trigger: { color: '#24b3c1f0' },
        condition: { color: '#fcff5c94' },
        action: { color: '#59f9599e' },
    }
    return <Checkbox
        disabled={disabled}
        checked={Boolean(customValue ? value : switchChecked)}
        // style={Object.assign(type ? color[type] : null, style)}
        className={className}
        onChange={e => {
            if (!customValue) setSwitchChecked(e.target.checked);
            onChange(e.target.checked);
        }}
        size={size}
    />;
}

CustomCheckbox.defaultProps = {
    value: false,
    disabled: false,
    type: null,
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

CustomCheckbox.propTypes = {
    title: PropTypes.string,
    attr: PropTypes.string,
    type: PropTypes.string,
    style: PropTypes.object,
    native: PropTypes.object,
    onChange: PropTypes.func,
    component: PropTypes.object,
    styleComponentBlock: PropTypes.object
};

export default memo(CustomCheckbox);