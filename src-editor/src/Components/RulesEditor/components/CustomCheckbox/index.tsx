import React, { memo, useState } from 'react';

import { Checkbox } from '@mui/material';

import { Utils } from '@iobroker/adapter-react-v5';

import cls from './style.module.scss';

interface CustomCheckboxProps {
    title?: string;
    size?: 'small' | 'medium';
    value: boolean;
    onChange?: (value: boolean) => void;
    className?: string;
    customValue?: boolean;
    disabled?: boolean;
}

const CustomCheckbox = ({
    size,
    value,
    title,
    onChange,
    className,
    customValue,
    disabled,
}: CustomCheckboxProps): React.JSX.Element => {
    const [switchChecked, setSwitchChecked] = useState(false);

    return (
        <>
            <Checkbox
                disabled={disabled}
                checked={Boolean(customValue ? value : switchChecked)}
                className={Utils.clsx(cls.root, className)}
                onChange={e => {
                    customValue && setSwitchChecked(e.target.checked);
                    onChange && onChange(e.target.checked);
                }}
                size={size || 'medium'}
            />
            {title || null}
        </>
    );
};

export default memo(CustomCheckbox);
