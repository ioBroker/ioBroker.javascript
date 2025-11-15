import React, { useEffect } from 'react';

import { Button, DialogTitle, DialogContent, DialogActions, Dialog, TextField } from '@mui/material';

import { Check as IconOk, Cancel as IconCancel } from '@mui/icons-material';
import { type AdminConnection, I18n } from '@iobroker/adapter-react-v5';

export default function PasswordDialog(props: {
    onEntered: (password: string | null) => void;
    systemConfig: ioBroker.SystemConfigObject;
    socket: AdminConnection;
}): React.JSX.Element {
    const [passwordDialogValue, setPasswordDialogValue] = React.useState<string>('');
    const [text, setText] = React.useState<string>('');

    useEffect(() => {
        // Read system.config
        void props.socket.decrypt(props.systemConfig.native.javascriptPassword).then(_text => setText(_text));
    }, [props.systemConfig, props.socket]);

    return (
        <Dialog
            open={!0}
            onClose={() => props.onEntered(null)}
            fullWidth
            maxWidth="sm"
        >
            <DialogTitle>{I18n.t('Please enter a password for expert mode')}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    variant="standard"
                    label={I18n.t('Password')}
                    type="password"
                    fullWidth
                    value={passwordDialogValue}
                    onKeyDown={(e): void => {
                        if (e.key === 'Enter' && passwordDialogValue) {
                            e.preventDefault();
                            e.stopPropagation();
                            if (text === passwordDialogValue) {
                                props.onEntered(passwordDialogValue);
                            } else {
                                props.onEntered('');
                            }
                        }
                    }}
                    onChange={e => setPasswordDialogValue(e.target.value)}
                />
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    disabled={!passwordDialogValue}
                    onClick={(): void => {
                        if (text === passwordDialogValue) {
                            props.onEntered(passwordDialogValue);
                        } else {
                            props.onEntered('');
                        }
                    }}
                    startIcon={<IconOk />}
                >
                    {I18n.t('Ok')}
                </Button>
                <Button
                    color="grey"
                    variant="contained"
                    onClick={() => props.onEntered(null)}
                    startIcon={<IconCancel />}
                >
                    {I18n.t('Cancel')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
