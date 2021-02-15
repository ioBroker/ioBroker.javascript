import { Checkbox } from '@material-ui/core';
import React, { memo, useState } from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';


const CustomCheckbox = ({size, value, style, title, onChange, className, customValue, disabled }) => {
    const [switchChecked, setSwitchChecked] = useState(false);

    return <>
        <Checkbox
            disabled={disabled}
            checked={Boolean(customValue ? value : switchChecked)}
            // style={Object.assign(type ? color[type] : null, style)}
            className={className}
            onChange={e => {
                customValue && setSwitchChecked(e.target.checked);
                onChange(e.target.checked);
            }}
            size={size}
        />
        {title || null}
    </>;
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