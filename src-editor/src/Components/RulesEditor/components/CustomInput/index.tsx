import React, { useState } from 'react';

import { TextField, InputAdornment } from '@mui/material';

import { Utils, Icon as CustomIcon } from '@iobroker/adapter-react-v5';

import cls from './style.module.scss';

interface CustomInputProps {
    autoFocus?: boolean;
    fullWidth?: boolean;
    disabled?: boolean;
    multiline?: boolean;
    rows?: number;
    autoComplete?: string;
    label?: string;
    error?: string;
    size?: 'small' | 'medium';
    variant?: 'standard' | 'filled' | 'outlined';
    value: string | undefined;
    type?: string;
    style?: React.CSSProperties;
    onChange: (value: string) => void;
    className?: string;
    customValue?: boolean;
    icon?: string;
}

const CustomInput = (props: CustomInputProps): React.JSX.Element => {
    const [inputText, setInputText] = useState('');
    const {
        value,
        type,
        error,
        className,
        icon,
        label,
        style,
        onChange,
        fullWidth,
        autoComplete,
        customValue,
        autoFocus,
        rows,
        size,
        variant,
        multiline,
        disabled,
    }: CustomInputProps = Object.assign(
        {
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
            onChange: () => {},
            fullWidth: false,
            autoComplete: '',
            customValue: false,
            autoFocus: false,
            rows: 1,
        },
        props,
    );

    return (
        <TextField
            error={!!error}
            autoFocus={autoFocus}
            fullWidth={fullWidth}
            label={label}
            disabled={disabled}
            variant={variant}
            multiline={multiline}
            rows={rows}
            value={customValue ? value : inputText}
            type={type}
            helperText={error}
            style={style}
            className={Utils.clsx(cls.root, className)}
            autoComplete={autoComplete}
            onChange={e => {
                !customValue && setInputText(e.target.value);
                onChange(e.target.value);
            }}
            slotProps={{
                input: {
                    endAdornment: icon ? (
                        <InputAdornment position="end">
                            <CustomIcon
                                className={cls.icon}
                                src={icon}
                            />
                        </InputAdornment>
                    ) : null,
                },
            }}
            margin="normal"
            size={size}
        />
    );
};

export default CustomInput;
