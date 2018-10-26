import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Dialog from '@material-ui/core/Dialog';
import TextField from '@material-ui/core/TextField';
import I18n from '../i18n';

class DialogRename extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            name: props.name,
            id: props.id,
        };
        this.prefix = this.getPrefix(props.id);
        this.oldId = props.id;
    }

    getPrefix(id) {
        const parts = (id || '').split('.');
        parts.pop();
        return parts.join('.');
    }

    getId(name) {
        name = (name || '').replace(/[\\\/\]\[*,;'"`<>?\s]/g, '_');
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
        this.props.onRename(this.oldId, this.state.id, this.state.name);
        this.props.onClose();
    };

    handleChange = name => {
        this.setState({name, id: this.getId(name)});
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
                <DialogTitle id="confirmation-dialog-title">{I18n.t('Rename')}</DialogTitle>
                <DialogContent>
                    <form noValidate autoComplete="off">
                        <TextField
                            style={{width: '100%'}}
                            id="standard-name"
                            label={I18n.t('Name')}
                            value={this.state.name}
                            onChange={e => this.handleChange(e.target.value)}
                            margin="normal"
                        />
                        <TextField
                            id="standard-name-id"
                            style={{width: '100%'}}
                            label={I18n.t('ID')}
                            value={this.state.id}
                            disabled={true}
                            margin="normal"
                        />
                    </form>
                </DialogContent>
                <DialogActions>
                    <Button onClick={this.handleCancel} color="primary">{I18n.t('Cancel')}</Button>
                    <Button onClick={this.handleOk} color="primary">{I18n.t('Ok')}</Button>
                </DialogActions>
            </Dialog>
        );
    }
}

DialogRename.propTypes = {
    onClose: PropTypes.func,
    onRename: PropTypes.func,
    name: PropTypes.string,
    id: PropTypes.string,
};

export default DialogRename;
