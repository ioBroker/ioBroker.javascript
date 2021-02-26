import React from 'react';
import Button from '@material-ui/core/Button';
import { Dialog, DialogActions, DialogContent, DialogContentText } from '@material-ui/core';
import PropTypes from 'prop-types';
import cls from './style.module.scss';

const CustomModal = ({ open, close, children, titleButton, titleButton2, buttonClick }) => {
    return (
        <Dialog
            open={open}
            maxWidth='xl'
            disableEscapeKeyDown={true}
            onClose={close}
            // classes={{ paper: classes.background }}
            className={cls.modalWrapper}
        >
            <DialogContent>
                <DialogContentText id="alert-dialog-description">
                    {children}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={close} color="primary">
                    {titleButton}
                </Button>
                <Button onClick={buttonClick} color="primary" autoFocus>
                    {titleButton2}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

CustomModal.defaultProps = {
    open: false,
    buttonClick: () => { },
    close: () => { },
    titleButton: 'Disagree',
    titleButton2: 'Agree'
};

CustomModal.propTypes = {
    open: PropTypes.bool,
    close: PropTypes.func,
    children: PropTypes.any,
    titleButton: PropTypes.string,
    titleButton2: PropTypes.string,
    buttonClick: PropTypes.func
};

export default CustomModal;