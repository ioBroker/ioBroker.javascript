import { Button, withStyles } from '@material-ui/core';
import React from 'react';
// import I18n from '@iobroker/adapter-react/i18n';
import PropTypes from 'prop-types';

const ColorButton = withStyles((theme) => ({
    root: {
        color: '#81688c',
        // margin: '10px 0',
        borderColor: '#81688c',
        '&:hover': {
            borderColor: '#7a5e86',
            color: '#7a5e86',
            backgroundColor: 'inherit'
        },
    },
}))(Button);

const CustomButton = ({ fullWidth, size, onClick, style, className, value }) => {
    return <ColorButton
        variant="outlined"
        color="primary"
        onClick={onClick}
        fullWidth={fullWidth}
        style={style}
        className={className}
        margin="normal"
        size={size}
    >{value}</ColorButton>;
}

CustomButton.defaultProps = {
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
    onChange: () => { },
    fullWidth: false,
    autoComplete: '',
    customValue: false
};

CustomButton.propTypes = {
    title: PropTypes.string,
    attr: PropTypes.string,
    type: PropTypes.string,
    style: PropTypes.object,
    native: PropTypes.object,
    onChange: PropTypes.func,
    component: PropTypes.object,
    styleComponentBlock: PropTypes.object
};

export default CustomButton;