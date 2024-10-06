import React from 'react';
import PropTypes from 'prop-types';

import { Button, DialogTitle, DialogContent, DialogActions, Dialog } from '@mui/material';

import { Check as IconOk, Cancel as IconCancel, Delete as IconDelete } from '@mui/icons-material';

import { I18n } from '@iobroker/adapter-react-v5';

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
            this.setState({ name: nextProps.name });
        }
        if (nextProps.id !== this.props.id) {
            this.setState({ id: nextProps.id });
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
        return (
            <Dialog
                onClose={(event, reason) => false}
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

DialogDelete.propTypes = {
    onClose: PropTypes.func,
    onDelete: PropTypes.func,
    name: PropTypes.string,
    id: PropTypes.string,
};

export default DialogDelete;
