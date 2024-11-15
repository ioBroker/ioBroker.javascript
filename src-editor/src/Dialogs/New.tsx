import React from 'react';

import {
    Button,
    DialogTitle,
    DialogContent,
    DialogActions,
    Dialog,
    TextField,
    FormControl,
    Select,
    InputLabel,
    MenuItem,
} from '@mui/material';

import { Check as IconOk, Cancel as IconCancel } from '@mui/icons-material';

import { I18n } from '@iobroker/adapter-react-v5';
import type { ScriptType } from '@/types';

interface DialogNewProps {
    onClose: () => void;
    onAdd: (id: string, name: string, instance?: number, type?: ScriptType) => void;
    name: string;
    title: string;
    parent: string;
    instance?: number;
    instances?: number[];
    parents: { id: string; name: string }[];
    existingItems?: string[];
    folder?: boolean;
    type?: ScriptType;
}

interface DialogNewState {
    name: string;
    instance: number;
    parent: string;
    error: string;
    id: string;
}

class DialogNew extends React.Component<DialogNewProps, DialogNewState> {
    private readonly isShowInstance: boolean;

    constructor(props: DialogNewProps) {
        super(props);
        this.state = {
            name: props.name || 'Script',
            instance: props.instance || 0,
            parent: props.parent,
            error: '',
            id: '',
        };

        this.isShowInstance =
            !props.folder && // if not folder
            !!props.instances && // and list of instances is defined
            (!!props.instance || // and instance is not 0
                !!props.instances[0] || // or first instance is not 0
                props.instances.length > 1); // or more than one instance
    }

    getId(name?: string): string {
        name = name || this.state.name || '';
        name = name
            .replace(/[\\/\][.*,;'"`<>?\s]/g, '_')
            .trim()
            .replace(/\.$/, '_');
        return `${this.state ? this.state.parent : this.props.parent}.${name}`;
    }

    static getDerivedStateFromProps(props: DialogNewProps, state: DialogNewState): Partial<DialogNewState> | null {
        if (props.name !== state.name) {
            return { name: props.name };
        }
        return null;
    }

    handleCancel = (): void => {
        this.props.onClose();
    };

    handleOk = (): void => {
        this.props.onAdd(this.getId(this.state.name), this.state.name, this.state.instance, this.props.type);
        this.props.onClose();
    };

    handleChange = (name: string): void => {
        const id = this.getId(name);
        if (!name) {
            this.setState({ name, id, error: I18n.t('Empty name is not allowed') });
        } else if (this.props.existingItems && this.props.existingItems.indexOf(id) !== -1) {
            this.setState({ name, id, error: I18n.t('Duplicate name') });
        } else {
            this.setState({ name, id, error: '' });
        }
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
                <DialogTitle id="confirmation-dialog-title">{this.props.title || I18n.t('Create new')}</DialogTitle>
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
                            error={!!this.state.error}
                            label={I18n.t('Name')}
                            value={this.state.name}
                            helperText={this.state.error}
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
                        <FormControl
                            variant="standard"
                            style={{ width: '100%' }}
                        >
                            <InputLabel htmlFor="parent">{I18n.t('Folder')}</InputLabel>
                            <Select
                                variant="standard"
                                style={{ width: '100%' }}
                                value={this.state.parent}
                                onChange={e => this.setState({ parent: e.target.value })}
                                inputProps={{ name: 'parent', id: 'parent' }}
                            >
                                {this.props.parents.map(parent => {
                                    const parts = parent.id.split('.');
                                    parts.splice(0, 2); // remove script.js
                                    const names = [];
                                    let id = 'script.js';
                                    parts.forEach(n => {
                                        id += `.${n}`;
                                        const el = this.props.parents.find(item => item.id === id);
                                        if (el) {
                                            names.push(el.name);
                                        } else {
                                            names.push(n);
                                        }
                                    });
                                    if (!names.length) {
                                        names.push(parent.name);
                                    }
                                    return (
                                        <MenuItem
                                            key={parent.id}
                                            value={parent.id}
                                        >
                                            {names.join(' / ')}
                                        </MenuItem>
                                    );
                                })}
                            </Select>
                        </FormControl>
                        <TextField
                            variant="standard"
                            id="standard-name-id"
                            style={{ width: '100%' }}
                            label={I18n.t('ID')}
                            value={this.getId()}
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
                                    {this.props.instances?.map(instance => (
                                        <MenuItem
                                            key={`instance${instance}`}
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
                        disabled={!!this.state.error}
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

export default DialogNew;
