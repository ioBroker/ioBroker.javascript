import React from 'react';
import PropTypes from 'prop-types';
import withStyles from '@mui/styles/withStyles';

import Button from '@mui/material/Button';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';

import IconOk from '@mui/icons-material/Check';
import IconCancel from '@mui/icons-material/Cancel';

import { I18n } from '@iobroker/adapter-react-v5';

const styles = theme => ({

});

class DialogNew extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            name: props.name || 'Script',
            instance: props.instance || 0,
            parent: props.parent,
            error: ''
        };
        this.isShowInstance = !props.folder && props.instances && (props.instance || props.instances[0] || props.instances.length > 1);
    }

    getId(name) {
        name = name || this.state.name || '';
        name = name.replace(/[\\/\][.*,;'"`<>?\s]/g, '_').trim().replace(/\.$/, '_');
        return (this.state ? this.state.parent : this.props.parent) + '.' + name;
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.name !== this.props.name) {
            this.setState({name: nextProps.name});
        }
    }

    handleCancel = () => {
        this.props.onClose();
    };

    handleOk = () => {
        this.props.onAdd(this.getId(this.state.name), this.state.name, this.state.instance, this.props.type);
        this.props.onClose();
    };

    handleChange = name => {
        const id = this.getId(name);
        if (!name) {
            this.setState({name, id, error: I18n.t('Empty name is not allowed')});
        } else
        if (this.props.existingItems && this.props.existingItems.indexOf(id) !== -1) {
            this.setState({name, id, error: I18n.t('Duplicate name')});
        } else {
            this.setState({name, id, error: ''});
        }
    };

    render() {
        return <Dialog
            onClose={(event, reason) => false}
            maxWidth="md"
            fullWidth
            open={!0}
            aria-labelledby="confirmation-dialog-title"
        >
            <DialogTitle id="confirmation-dialog-title">{this.props.title || I18n.t('Create new')}</DialogTitle>
            <DialogContent>
                <form noValidate autoComplete="off">
                    <TextField
                        variant="standard"
                        style={{width: '100%'}}
                        id="standard-name"
                        autoFocus
                        error={!!this.state.error}
                        label={I18n.t('Name')}
                        value={this.state.name}
                        helperText={this.state.error}
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
                    <FormControl variant="standard" style={{minWidth: 100}}>
                        <InputLabel htmlFor="parent">{I18n.t('Folder')}</InputLabel>
                        <Select
                            variant="standard"
                            style={{width: '100%'}}
                            value={this.state.parent}
                            onChange={e => this.setState({parent: e.target.value})}
                            inputProps={{name: 'parent', id: 'parent',}}
                        >
                            {this.props.parents.map(parent => {
                                const parts = parent.id.split('.');
                                parts.splice(0, 2); // remove script.js
                                const names = [];
                                let id = 'script.js';
                                parts.forEach((n, i) => {
                                    id += '.' + n;
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
                                return (<MenuItem key={parent.id} value={parent.id}>{names.join(' / ')}</MenuItem>)
                            })}
                        </Select>
                    </FormControl>
                    <TextField
                        variant="standard"
                        id="standard-name-id"
                        style={{width: '100%'}}
                        label={I18n.t('ID')}
                        value={this.getId()}
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
                                inputProps={{name: 'instance', id: 'instance',}}
                            >
                                {this.props.instances.map(instance => (<MenuItem key={'instance' + instance} value={instance}>{instance || '0'}</MenuItem>))}
                            </Select>
                        </FormControl>)
                    }
                </form>
            </DialogContent>
            <DialogActions>
                <Button variant="contained" onClick={this.handleOk} disabled={!!this.state.error} color="primary" startIcon={<IconOk/>}>{I18n.t('Ok')}</Button>
                <Button color="grey" variant="contained" onClick={this.handleCancel} startIcon={<IconCancel/>}>{I18n.t('Cancel')}</Button>
            </DialogActions>
        </Dialog>;
    }
}

DialogNew.propTypes = {
    onClose: PropTypes.func,
    onAdd: PropTypes.func,
    name: PropTypes.string,
    title: PropTypes.string,
    parent: PropTypes.string,
    instance: PropTypes.number,
    instances: PropTypes.array,
    parents: PropTypes.array,
    existingItems: PropTypes.array,
    folder: PropTypes.bool,
    type: PropTypes.string,
};

export default withStyles(styles)(DialogNew);
