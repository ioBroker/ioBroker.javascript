import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import { Dialog } from '@material-ui/core';
import PropTypes from 'prop-types';

const useStyles = makeStyles((theme) => ({
    modalContentWrapper: {
        margin: '20px 0',
        padding: '0 35px',
        // background: '#f6f6f6',
        overflowX: 'hidden',
        minWidth: '320px'
    },
    modalButtonBlock: {
        display: 'flex',
        justifyContent: 'flex-end',
        marginTop: '20px',
        flexFlow: 'wrap',
        borderTop: '1px solid silver'
    },
    modalButtonBlockTwo: {
        justifyContent: 'space-around',
        flexFlow: 'wrap-reverse',
        '& button': {
            margin: '5px'
        }
    },
    modalWrapper: {
        position: 'relative',
        '[class*="MuiPaper-root MuiDialog-paper MuiDialog-paperScrollPaper MuiDialog-paperWidthXl MuiPaper-elevation24 MuiPaper-rounded"]': {
            background: '#f6f6f6'
        }
    },
    close: {
        position: 'absolute',
        right: '8px',
        top: '6px',
        width: '32px',
        height: '32px',
        opacity: '0.9',
        cursor: 'pointer',
        transition: 'all 0.6s ease',
        '&:hover': {
            transform: 'rotate(90deg)'
        },
        '&:before': {
            position: 'absolute',
            left: '15px',
            content: '""',
            height: '33px',
            width: '4px',
            backgroundColor: '#ff4f4f',
            transform: 'rotate(45deg)'
        },
        '&:after': {
            position: 'absolute',
            left: '15px',
            content: '""',
            height: '33px',
            width: '4px',
            backgroundColor: '#ff4f4f',
            transform: 'rotate(-45deg)'
        },
    },
    '@media screen and (max-width: 460px)': {
        modalContentWrapper: {
            minWidth: 'auto'
        }
    }

}));

const CustomModal = ({ open, close, children, titleButton, titleButton2, buttonClick }) => {
    const classes = useStyles();
    return (
        <Dialog
            open={open}
            maxWidth='xl'
            disableEscapeKeyDown={true}
            onClose={close}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
            className={classes.modalWrapper || ''}
        >
            <div className={classes.modalContentWrapper}>
                <div className={classes.close} onClick={close} />
                {children}
                <div className={`${classes.modalButtonBlock} ${titleButton ? classes.modalButtonBlockTwo : ''}`}>
                    {titleButton && <Button onClick={buttonClick}>
                        {titleButton}
                    </Button>}
                    {titleButton2 && <Button onClick={close}>
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