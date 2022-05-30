import React from 'react';
import PropTypes from 'prop-types';
import Button from '@mui/material/Button';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Dialog from '@mui/material/Dialog';
import {MdDelete as IconDelete} from 'react-icons/md';

import IconOk from '@mui/icons-material/Check';
import IconCancel from '@mui/icons-material/Cancel';

import I18n from '@iobroker/adapter-react-v5/i18n';
import withStyles from '@mui/styles/withStyles';

const styles = theme => ({

});

class DialogDelete extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            name: props.name,
            id: props.id,
        };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.name !== this.props.name) {
            this.setState({name: nextProps.name});
        }
        if (nextProps.id !== this.props.id) {
            this.setState({id: nextProps.id});
        }
    }

    handleCancel = () => {
        this.props.onClose(null);
    };

    handleOk = () => {
        this.props.onDelete(this.state.id);
        this.props.onClose(this.props.value);
    };

    render() {
        return <Dialog
            onClose={(event, reason) => false}
            maxWidth="md"
            open={true}
            aria-labelledby="confirmation-dialog-title"
        >
            <DialogTitle id="confirmation-dialog-title">{I18n.t('Are you sure?')}</DialogTitle>
            <DialogContent>
                <IconDelete/>
                <span style={{fontSize: 14, fontWeight: 'bold'}}>{I18n.t('Delete %s', this.state.name)}</span>
            </DialogContent>
            <DialogActions>
                <Button variant="contained" onClick={this.handleOk} color="primary" startIcon={<IconOk/>}>{I18n.t('Ok')}</Button>
                <Button variant="contained" onClick={this.handleCancel} startIcon={<IconCancel/>}>{I18n.t('Cancel')}</Button>
            </DialogActions>
        </Dialog>;
    }
}

DialogDelete.propTypes = {
    onClose: PropTypes.func,
    onDelete: PropTypes.func,
    name: PropTypes.string,
    id: PropTypes.string,
};

export default withStyles(styles)(DialogDelete);
