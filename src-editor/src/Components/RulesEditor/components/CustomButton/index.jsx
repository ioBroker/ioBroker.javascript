import { Button } from '@mui/material';
import React from 'react';
import PropTypes from 'prop-types';

import { Utils, Icon as CustomIcon } from '@iobroker/adapter-react-v5';

import cls from './style.module.scss';

const CustomButton = ({ fullWidth, size, onClick, style, className, value, square, icon }) => {
    return <Button
        variant="outlined"
        color="primary"
        onClick={onClick}
        fullWidth={fullWidth}
        style={style}
        className={Utils.clsx(cls.root, className, square ? cls.square : '')}
        margin="normal"
        size={size}
    >{icon ? <CustomIcon className={cls.icon} src={icon} /> : value}</Button>;
}

CustomButton.defaultProps = {
    value: '',
    className: null,
    variant: 'standard',
    size: 'medium',
    fullWidth: false,
    square: false
};

CustomButton.propTypes = {
    title: PropTypes.string,
    attr: PropTypes.string,
    type: PropTypes.string,
    style: PropTypes.object,
};

export default CustomButton;