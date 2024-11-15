import React from 'react';

import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    FormControl,
    Select,
    InputLabel,
    MenuItem,
} from '@mui/material';

import { Cancel as IconCancel, Check as IconOk } from '@mui/icons-material';

import { I18n } from '@iobroker/adapter-react-v5';

interface DialogRenameProps {
    onClose: () => void;
    onRename: (oldId: string, newId: string, newName: string, instance: number | null) => void;
    name: string;
    id: string;
    instance: number | null;
    instances: number[];
    folder: boolean;
}

interface DialogRenameState {
    name: string;
    id: string;
    instance: number | null;
    prefix: string;
}

class DialogRename extends React.Component<DialogRenameProps, DialogRenameState> {
    private readonly isShowInstance: boolean;

    private readonly oldId: string;

    constructor(props: DialogRenameProps) {
        super(props);
        this.state = {
            name: props.name,
            id: props.id,
            instance: props.instance || 0,
            prefix: DialogRename.getPrefix(props.id),
        };
        this.isShowInstance =
            !props.folder && // if not folder
            !!props.instances && // and list of instances is defined
            (!!props.instance || // and instance is not 0
                !!props.instances[0] || // or first instance is not 0
                props.instances.length > 1); // or more than one instance

        this.oldId = props.id;
    }

    static getPrefix(id: string): string {
        const parts = (id || '').split('.');
        parts.pop();
        return parts.join('.');
    }

    getId(name: string): string {
        name = (name || '').replace(/[\\/\][*,;'"`<>?\s]/g, '_');
        return `${this.state.prefix}.${name}`;
    }

    static getDerivedStateFromProps(
        props: DialogRenameProps,
        state: DialogRenameState,
    ): Partial<DialogRenameState> | null {
        if (props.name !== state.name) {
            return { name: props.name };
        }
        if (props.id !== state.id) {
            return { id: props.id, prefix: DialogRename.getPrefix(props.id) };
        }
        return null;
    }

    handleCancel = (): void => {
        this.props.onClose();
    };

    handleOk = (): void => {
        this.props.onRename(this.oldId, this.state.id, this.state.name, this.state.instance);
        this.props.onClose();
    };

    handleChange = (name: string): void => {
        this.setState({ name, id: this.getId(name) });
    };

    render(): React.JSX.Element {
        return (
            <Dialog
                onClose={() => false}
                maxWidth="md"
                fullWidth
                open={!0}
                aria-labelledby="confirmation-dialog-title"
            >
                <DialogTitle id="confirmation-dialog-title">{I18n.t('Rename')}</DialogTitle>
                <DialogContent>
                    <form
                        noValidate
                        autoComplete="off"
                    >
                        <TextField
                            variant="standard"
                            style={{ width: '100%' }}
                            id="standard-name"
                            autoFocus
                            label={I18n.t('Name')}
                            value={this.state.name}
                            onKeyUp={ev => {
                                if (ev.key === 'Enter') {
                                    // Do code here
                                    ev.preventDefault();
                                    setTimeout(() => this.handleOk(), 200);
                                }
                            }}
                            onChange={e => this.handleChange(e.target.value)}
                            margin="normal"
                        />
                        <TextField
                            variant="standard"
                            id="standard-name-id"
                            style={{ width: '100%' }}
                            label={I18n.t('ID')}
                            value={this.state.id}
                            disabled
                            margin="normal"
                        />
                        {this.isShowInstance && (
                            <FormControl variant="standard">
                                <InputLabel htmlFor="instance">{I18n.t('Instance')}</InputLabel>
                                <Select
                                    variant="standard"
                                    value={this.state.instance}
                                    onChange={e => this.setState({ instance: parseInt(e.target.value as string, 10) })}
                                    inputProps={{ name: 'instance', id: 'instance' }}
                                >
                                    {this.props.instances.map(instance => (
                                        <MenuItem
                                            key={instance}
                                            value={instance}
                                        >
                                            {instance || '0'}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                    </form>
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

export default DialogRename;
