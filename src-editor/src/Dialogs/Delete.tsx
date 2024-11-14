import React from 'react';

import { Button, DialogTitle, DialogContent, DialogActions, Dialog } from '@mui/material';

import { Check as IconOk, Cancel as IconCancel, Delete as IconDelete } from '@mui/icons-material';

import { I18n } from '@iobroker/adapter-react-v5';

interface DialogDeleteProps {
    onClose: () => void;
    onDelete: (id: string) => void;
    name: string;
    id: string;
}
interface DialogDeleteState {
    name: string;
    id: string;
}

class DialogDelete extends React.Component<DialogDeleteProps, DialogDeleteState> {
    constructor(props: DialogDeleteProps) {
        super(props);
        this.state = {
            name: props.name,
            id: props.id,
        };
    }

    static getDerivedStateFromProps(
        props: DialogDeleteProps,
        state: DialogDeleteState,
    ): Partial<DialogDeleteState> | null {
        if (props.name !== state.name) {
            return { name: props.name };
        }
        if (props.id !== state.id) {
            return { id: props.id };
        }
        return null;
    }

    handleCancel = (): void => {
        this.props.onClose();
    };

    handleOk = (): void => {
        this.props.onDelete(this.state.id);
        this.props.onClose();
    };

    render(): React.JSX.Element {
        return (
            <Dialog
                onClose={() => false}
                maxWidth="md"
                open={!0}
                aria-labelledby="confirmation-dialog-title"
            >
                <DialogTitle id="confirmation-dialog-title">{I18n.t('Are you sure?')}</DialogTitle>
                <DialogContent>
                    <IconDelete />
                    <span style={{ fontSize: 14, fontWeight: 'bold' }}>{I18n.t('Delete %s', this.state.name)}</span>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        onClick={this.handleOk}
                        color="primary"
                        startIcon={<IconOk />}
                    >
                        {I18n.t('Ok')}
                    </Button>
                    <Button
                        color="grey"
                        variant="contained"
                        onClick={this.handleCancel}
                        startIcon={<IconCancel />}
                    >
                        {I18n.t('Cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

export default DialogDelete;
