import React, { memo, useState } from 'react';

import { FormControlLabel, Switch } from '@mui/material';

import cls from './style.module.scss';

interface CustomSwitchProps {
    label: string;
    size?: 'small' | 'medium';
    value: boolean;
    style?: React.CSSProperties;
    onChange: (value: boolean) => void;
    className?: string;
    customValue?: boolean;
}

const CustomSwitch = ({
    label,
    size,
    value,
    style,
    onChange,
    className,
    customValue,
}: CustomSwitchProps): React.JSX.Element => {
    const [switchChecked, setSwitchChecked] = useState(false);
    return (
        <FormControlLabel
            className={cls.root}
            control={
                <Switch
                    checked={customValue ? value : switchChecked}
                    style={style}
                    className={className}
                    onChange={e => {
                        if (!customValue) {
                            setSwitchChecked(e.target.checked);
                        }
                        onChange(e.target.checked);
                    }}
                    size={size || 'medium'}
                />
            }
            label={label || 'all'}
        />
    );
};

export default memo(CustomSwitch);
