import React from 'react';
import PropTypes from 'prop-types';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import IconOk from '@mui/icons-material/Check';

import { I18n } from '@iobroker/adapter-react-v5';

const DialogHelp = ({ onClose, open }) => <Dialog
    open={open}
    onClose={onClose}
    aria-labelledby="alert-dialog-title"
    aria-describedby="alert-dialog-description"
>
    <DialogContent>
        <div style={{
            fontSize: '1rem',
            fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
            fontWeight: 400,
            lineHeight: 1.5,
            letterSpacing: '0.00938em'
        }} >
            <h3>{I18n.t('On condition change')}</h3>
            <div>{I18n.t('help_on_change')}</div>
            <h3>{I18n.t('Just check')}</h3>
            <div>{I18n.t('help_just_check')}</div>
        </div>
    </DialogContent>
    <DialogActions>
        <Button onClick={onClose} color="primary" autoFocus startIcon={<IconOk/>}>
            {I18n.t('OK')}
        </Button>
    </DialogActions>
</Dialog >;

DialogHelp.defaultProps = {
    open: false,
    onClose: () => { }
};

DialogHelp.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func
};

export default DialogHelp;