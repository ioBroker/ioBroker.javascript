import React from 'react';

import { TextField } from '@mui/material';

import { Utils } from '@iobroker/adapter-react-v5';

import cls from './style.module.scss';

interface CustomTimeProps {
    value: string;
    style?: React.CSSProperties;
    onChange: (value: string) => void;
    className?: string;
}

const CustomTime = ({ value, style, onChange, className }: CustomTimeProps): React.JSX.Element => {
    return (
        <TextField
            variant="standard"
            id="time"
            type="time"
            onChange={e => onChange(e.currentTarget.value)}
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
        />
    );
};

export default CustomTime;
