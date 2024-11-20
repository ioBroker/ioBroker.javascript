import React from 'react';
import PropTypes from 'prop-types';

import { Button, Dialog, DialogActions, DialogContent } from '@mui/material';

import { Check as IconOk } from '@mui/icons-material';

import { I18n } from '@iobroker/adapter-react-v5';

interface DialogHelpProps {
    open: boolean;
    onClose: () => void;
}

const DialogHelp = ({ onClose, open }: DialogHelpProps): React.JSX.Element => (
    <Dialog
        open={open}
        onClose={onClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
    >
        <DialogContent>
            <div
                style={{
                    fontSize: '1rem',
                    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                    fontWeight: 400,
                    lineHeight: 1.5,
                    letterSpacing: '0.00938em',
                }}
            >
                <h3>{I18n.t('On condition change')}</h3>
                <div>{I18n.t('help_on_change')}</div>
                <h3>{I18n.t('Just check')}</h3>
                <div>{I18n.t('help_just_check')}</div>
            </div>
        </DialogContent>
        <DialogActions>
            <Button
                onClick={onClose}
                color="primary"
                autoFocus
                startIcon={<IconOk />}
            >
                {I18n.t('OK')}
            </Button>
        </DialogActions>
    </Dialog>
);

export default DialogHelp;
