import React from 'react';
import PropTypes from 'prop-types';

import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from '@mui/material';

import { Check as IconOk } from '@mui/icons-material';

import { I18n } from '@iobroker/adapter-react-v5';

const styles = {
    title: theme => ({
        background: theme.palette.error.main,
        color: theme.palette.error.contrastText,
        '&>h2': {
            color: theme.palette.error.contrastText,
        }
    }),
};

class DialogError extends React.Component {
    constructor(props) {
        super(props);
        console.log('Error created')
    }
    handleOk = () => {
        this.props.onClose && this.props.onClose();
    };

    render() {
        return <Dialog
            open={!0}
            maxWidth="sm"
            fullWidth
            onClose={() => this.handleOk()}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle
                sx={styles.title}
                id="alert-dialog-title">
                {this.props.title || I18n.t('Error')}
            </DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-description">
                    {this.props.text || I18n.t('Unknown error!')}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button variant="contained" onClick={() => this.handleOk()} color="primary" autoFocus startIcon={<IconOk/>}>{I18n.t('Ok')}</Button>
            </DialogActions>
        </Dialog>;
    }
}

DialogError.propTypes = {
    onClose: PropTypes.func,
    title: PropTypes.string,
    text: PropTypes.string,
    icon: PropTypes.object
};

export default DialogError;
