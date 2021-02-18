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
        borderTop: '1px solid silver',
        borderColor: '#81688c',
        background: '#9a8fa840',
        borderRadius: 3,
        '& button': {
            color: '#1f032b !important',
            flex: 1
        }
    },
    modalButtonBlockTwo: {
        justifyContent: 'space-around',
        flexFlow: 'wrap-reverse',
        position: 'sticky',
        bottom: 0,
        '& button': {
            margin: '5px'
        }
    },
    modalWrapper: {
        // position: 'relative',
        '[class*="MuiPaper-root MuiDialog-paper MuiPaper-elevation24 MuiDialog-paperScrollPaper MuiDialog-paperWidthXl MuiPaper-elevation24 MuiPaper-rounded"]': {
            backgroundColor: '#f6f6f6'
        }
    },
    background: {
        backgroundColor: '#fdf3ffa6',
        overflowY: 'visible'
    },
    close: {
        position: 'absolute',
        right: -14,
        top: -16,
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
            // aria-labelledby="alert-dialog-title"
            // aria-describedby="alert-dialog-description"
            className={classes.modalWrapper || ''}
        >
            <div className={classes.modalContentWrapper}>
                <div className={classes.close} onClick={close} />
                {children}
                <div className={`${classes.modalButtonBlock} ${titleButton ? classes.modalButtonBlockTwo : ''}`}>
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