import { Checkbox } from '@mui/material';
import React, { memo, useState } from 'react';
import PropTypes from 'prop-types';

import { Utils } from '@iobroker/adapter-react-v5';

import cls from './style.module.scss';

const CustomCheckbox = ({ size, value, style, title, onChange, className, customValue, disabled }) => {
    const [switchChecked, setSwitchChecked] = useState(false);

    return <>
        <Checkbox
            disabled={disabled}
            checked={Boolean(customValue ? value : switchChecked)}
            // style={Object.assign(type ? color[type] : null, style)}
            className={Utils.clsx(cls.root, className)}
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