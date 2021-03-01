import React from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import I18n from '@iobroker/adapter-react/i18n';
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