import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import { Dialog } from '@material-ui/core';
import PropTypes from 'prop-types';
import cls from './style.module.scss';

const useStyles = makeStyles((theme) => ({
    background: {
        // backgroundColor: '#fdf3ffdb',
        overflowY: 'visible',
    },
})
);

const CustomModal = ({ open, close, children, titleButton, titleButton2, buttonClick }) => {
    const classes = useStyles();
    return (
        <Dialog
            open={open}
            maxWidth='xl'
            disableEscapeKeyDown={true}
            onClose={close}
            classes={{ paper: classes.background }}
            className={cls.modalWrapper}
        >
            <div className={cls.modalContentWrapper}>
                <div className={cls.close} onClick={close} />
                {children}
                <div className={`${cls.modalButtonBlock} ${titleButton ? cls.modalButtonBlockTwo : ''}`}>
                    {titleButton && <Button fullWidth onClick={buttonClick}>
                        {titleButton}
                    </Button>}
                    {titleButton2 && <Button fullWidth onClick={close}>
                        {titleButton2}
                    </Button>}
                </div>
            </div>
        </Dialog>
    );
}

CustomModal.defaultProps = {
    open: false,
    buttonClick: () => { },
    close: () => { }
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