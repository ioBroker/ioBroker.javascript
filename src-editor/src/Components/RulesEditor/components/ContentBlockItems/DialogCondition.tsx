import React from 'react';

import { Button, Dialog, DialogActions, DialogContent, DialogContentText } from '@mui/material';
import { I18n } from '@iobroker/adapter-react-v5';

interface DialogConditionProps {
    onClose: () => void;
    open: boolean;
}

const DialogCondition = ({ onClose, open }: DialogConditionProps): React.JSX.Element => (
    <Dialog
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
            <Button
                onClick={onClose}
                color="primary"
                autoFocus
            >
                {I18n.t('OK')}
            </Button>
        </DialogActions>
    </Dialog>
);

export default DialogCondition;
