import React from 'react';
import PropTypes from 'prop-types';

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

import {
    Cancel as IconCancel,
    Check as IconOk,
} from '@mui/icons-material';

import { I18n } from '@iobroker/adapter-react-v5';

class DialogRename extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            name: props.name,
            id: props.id,
            instance: props.instance || 0
        };
        this.isShowInstance = !props.folder && props.instances && (props.instance || props.instances[0] || props.instances.length > 1);
        this.prefix = this.getPrefix(props.id);
        this.oldId = props.id;
    }

    getPrefix(id) {
        const parts = (id || '').split('.');
        parts.pop();
        return parts.join('.');
    }

    getId(name) {
        name = (name || '').replace(/[\\/\][*,;'"`<>?\s]/g, '_');
        return this.prefix + '.' + name;
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.name !== this.props.name) {
            this.setState({name: nextProps.name});
        }
        if (nextProps.id !== this.props.id) {
            this.prefix = this.getPrefix(nextProps.id);
            this.setState({id: nextProps.id});
        }
    }

    handleCancel = () => {
        this.props.onClose();
    };

    handleOk = () => {
        this.props.onRename(this.oldId, this.state.id, this.state.name, this.state.instance);
        this.props.onClose();
    };

    handleChange = name => {
        this.setState({name, id: this.getId(name)});
    };

    render() {
        return <Dialog
            onClose={(event, reason) => false}
            maxWidth="md"
            fullWidth
            open={!0}
            aria-labelledby="confirmation-dialog-title"
        >
            <DialogTitle id="confirmation-dialog-title">{I18n.t('Rename')}</DialogTitle>
            <DialogContent>
                <form noValidate autoComplete="off">
                    <TextField
                        variant="standard"
                        style={{width: '100%'}}
                        id="standard-name"
                        autoFocus
                        label={I18n.t('Name')}
                        value={this.state.name}
                        onKeyPress={(ev) => {
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
                        style={{width: '100%'}}
                        label={I18n.t('ID')}
                        value={this.state.id}
                        disabled
                        margin="normal"
                    />
                    {
                        this.isShowInstance && (
                            <FormControl variant="standard">
                                <InputLabel htmlFor="instance">{I18n.t('Instance')}</InputLabel>
                                <Select
                                    variant="standard"
                                    value={this.state.instance}
                                    onChange={e => this.setState({instance: parseInt(e.target.value, 10)})}
                                    inputProps={{name: 'instance', id: 'instance'}}
                                >
                                    {this.props.instances.map(instance => <MenuItem key={instance} value={instance}>{instance || '0'}</MenuItem>)}
                                </Select>
                            </FormControl>)
                    }
                </form>
            </DialogContent>
            <DialogActions>
                <Button variant="contained" onClick={this.handleOk} color="primary" startIcon={<IconOk/>}>{I18n.t('Ok')}</Button>
                <Button color="grey" variant="contained" onClick={this.handleCancel} startIcon={<IconCancel/>}>{I18n.t('Cancel')}</Button>
            </DialogActions>
        </Dialog>;
    }
}

DialogRename.propTypes = {
    onClose: PropTypes.func,
    onRename: PropTypes.func,
    name: PropTypes.string,
    id: PropTypes.string,
    instance: PropTypes.number,
    instances: PropTypes.array,
    folder: PropTypes.bool,
};

export default DialogRename;
