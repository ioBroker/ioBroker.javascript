import React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import I18n from '@iobroker/adapter-react-v5/i18n';
import PropTypes from 'prop-types';

const DialogCondition = ({ onClose, open }) => <Dialog
    open={open}
    onClose={onClose}
    aria-labelledby="alert-dialog-title"
    aria-describedby="alert-dialog-description"
>
    <DialogContent>
        <DialogContentText id="alert-dialog-description">
            <h3>{I18n.t('On condition change')}</h3>
            <div>{I18n.t('help_on_change')}</div>
            <h3>{I18n.t('Just check')}</h3>
            <div>{I18n.t('help_just_check')}</div>
        </DialogContentText>
    </DialogContent>
    <DialogActions>
        <Button onClick={onClose} color="primary" autoFocus>
            {I18n.t('OK')}
        </Button>
    </DialogActions>
</Dialog>;

DialogCondition.defaultProps = {
    open: false,
    onClose: () => { }
};

DialogCondition.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func
};

export default DialogCondition;