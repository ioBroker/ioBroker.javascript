import { Button } from '@mui/material';
import React from 'react';

import { Utils, Icon as CustomIcon } from '@iobroker/adapter-react-v5';

import cls from './style.module.scss';

interface CustomButtonProps {
    fullWidth?: boolean;
    size?: 'small' | 'medium' | 'large';
    onClick?: () => void;
    style?: React.CSSProperties;
    className?: string;
    value: string;
    square?: boolean;
    icon?: string;
}

const CustomButton = ({
    fullWidth,
    size,
    onClick,
    style,
    className,
    value,
    square,
    icon,
}: CustomButtonProps): React.JSX.Element => {
    return (
        <Button
            variant="outlined"
            color="primary"
            onClick={onClick}
            fullWidth={fullWidth}
            style={style}
            className={Utils.clsx(cls.root, className, square ? cls.square : '')}
            size={size || 'medium'}
        >
            {icon ? (
                <CustomIcon
                    className={cls.icon}
                    src={icon}
                />
            ) : (
                value
            )}
        </Button>
    );
};

export default CustomButton;
