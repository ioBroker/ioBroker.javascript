import React from 'react';
import PropTypes from 'prop-types';
import Button from '@material-ui/core/Button';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Dialog from '@material-ui/core/Dialog';
import I18n from '../i18n';

class DialogConfirm extends React.Component {
    handleCancel = () => {
        this.props.onClose();
    };

    handleOk = () => {
        this.props.onOk();
        this.props.onClose();
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
                <DialogTitle id="confirmation-dialog-title">{this.props.title || I18n.t('Are you sure?')}</DialogTitle>
                <DialogContent>
                    <h2>{this.props.question}</h2>
                </DialogContent>
                <DialogActions>
                    <Button onClick={this.handleOk} color="primary">{this.props.ok || I18n.t('Ok')}</Button>
                    <Button onClick={this.handleCancel} color="secondary">{this.props.cancel || I18n.t('Cancel')}</Button>
                </DialogActions>
            </Dialog>
        );
    }
}

DialogConfirm.propTypes = {
    onClose: PropTypes.func,
    onOk: PropTypes.func.isRequire,
    title: PropTypes.string,
    question: PropTypes.string.isRequire,
    cancel: PropTypes.string,
    ok: PropTypes.string

};

export default DialogConfirm;
