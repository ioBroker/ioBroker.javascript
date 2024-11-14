import React from 'react';

import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

import { Check as IconOk } from '@mui/icons-material';

import { I18n, type IobTheme } from '@iobroker/adapter-react-v5';

const styles: Record<string, any> = {
    title: (theme: IobTheme) => ({
        background: theme.palette.error.main,
        color: theme.palette.error.contrastText,
        '&>h2': {
            color: theme.palette.error.contrastText,
        },
    }),
};
interface DialogErrorProps {
    onClose: () => void;
    title?: string;
    text: string;
}

class DialogError extends React.Component<DialogErrorProps> {
    handleOk = (): void => {
        this.props.onClose();
    };

    render(): React.JSX.Element {
        return (
            <Dialog
                open={!0}
                maxWidth="sm"
                fullWidth
                onClose={() => this.handleOk()}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle
                    sx={styles.title}
                    id="alert-dialog-title"
                >
                    {this.props.title || I18n.t('Error')}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        {this.props.text || I18n.t('Unknown error!')}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        onClick={() => this.handleOk()}
                        color="primary"
                        autoFocus
                        startIcon={<IconOk />}
                    >
                        {I18n.t('Ok')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

export default DialogError;
