import React, { useState } from 'react';

import { Slider } from '@mui/material';

import { Utils } from '@iobroker/gui-components';

import cls from './style.module.scss';

interface CustomSliderProps {
    autoComplete?: string;
    label?: string;
    error?: string;
    size?: 'small' | 'medium';
    variant?: 'standard' | 'filled' | 'outlined';
    value?: number | string;
    type?: string;
    style?: object;
    onChange: (newValue: number) => void;
    className?: string;
    customValue?: boolean;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
}

const CustomSlider = ({
    size,
    value,
    style,
    onChange,
    className,
    customValue,
    min,
    max,
    step,
    unit,
}: CustomSliderProps): React.JSX.Element => {
    const [inputText, setInputText] = useState(0);
    min = min !== undefined ? min : 0;
    max = max !== undefined ? max : 0;
    step = step !== undefined && step > 0 ? step : (max - min) / 100 || 1;

    // The stored value can be a string (e.g. taken over from a text input of another object type).
    // MUI's slider crashes on anything that is neither a number nor an array, so normalize it here.
    const numberValue = ((): number => {
        const val = typeof value === 'number' ? value : parseFloat(value as string);
        if (!isFinite(val)) {
            return min;
        }
        return val < min ? min : val > max ? max : val;
    })();

    const marks = [
        {
            value: min,
            label: min + (unit || ''),
        },
        {
            value: max,
            label: max + (unit || ''),
        },
    ];

    return (
        <Slider
            defaultValue={customValue ? numberValue : inputText}
            // getAriaValueText={customValue ? value : inputText}
            aria-labelledby="discrete-slider"
            valueLabelDisplay="auto"
            classes={{ mark: cls.mark }}
            marks={marks}
            step={step}
            min={min}
            max={max}
            // error={error || ''}
            // label={label}
            // variant={variant || 'standard'}
            value={customValue ? numberValue : inputText}
            // type={type || 'text'}
            // helperText={error || ''}
            style={style}
            className={Utils.clsx(cls.root, className)}
            // autoComplete={autoComplete || ''}
            onChange={(e, newValue) => {
                if (Array.isArray(newValue)) {
                    !customValue && setInputText(newValue[0]);
                    onChange(newValue[0]);
                } else {
                    !customValue && setInputText(newValue);
                    onChange(newValue);
                }
            }}
            // margin="normal"
            size={size || 'medium'}
        />
    );
};

export default CustomSlider;
