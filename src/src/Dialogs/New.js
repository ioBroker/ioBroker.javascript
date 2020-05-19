import React from 'react';
import PropTypes from 'prop-types';
import Button from '@material-ui/core/Button';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Dialog from '@material-ui/core/Dialog';
import TextField from '@material-ui/core/TextField';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';

import I18n from '@iobroker/adapter-react/i18n';

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
        name = name.replace(/[\\/\][.*,;'"`<>?\s]/g, '_');
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
        return (
            <Dialog
                disableBackdropClick
                disableEscapeKeyDown
                maxWidth="md"
                fullWidth={true}
                open={true}
                aria-labelledby="confirmation-dialog-title"
            >
                <DialogTitle id="confirmation-dialog-title">{this.props.title || I18n.t('Create new')}</DialogTitle>
                <DialogContent>
                    <form noValidate autoComplete="off">
                        <TextField
                            style={{width: '100%'}}
                            id="standard-name"
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
                        <FormControl style={{minWidth: 100}}>
                            <InputLabel htmlFor="parent">{I18n.t('Folder')}</InputLabel>
                            <Select
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
                            id="standard-name-id"
                            style={{width: '100%'}}
                            label={I18n.t('ID')}
                            value={this.getId()}
                            disabled={true}
                            margin="normal"
                        />
                        {
                            this.isShowInstance && (
                                <FormControl>
                                <InputLabel htmlFor="instance">{I18n.t('Instance')}</InputLabel>
                                <Select
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
                    <Button onClick={this.handleOk} disabled={!!this.state.error} color="primary">{I18n.t('Ok')}</Button>
                    <Button onClick={this.handleCancel} color="primary">{I18n.t('Cancel')}</Button>
                </DialogActions>
            </Dialog>
        );
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

export default DialogNew;
