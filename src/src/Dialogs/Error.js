import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

import I18n from '../i18n';
import Themes from '../Theme';

const styles = theme => ({
    titleBackground: {
        background: Themes.colors.error.background
    },
    titleColor: {
        color: Themes.colors.error.color,
        '&>h2': {
            color: Themes.colors.error.color,
        }
    },
});

class DialogError extends React.Component {
    handleOk = () => {
        this.props.onClose && this.props.onClose();
    };

    render() {
        return (
            <Dialog
                open={true}
                maxWidth="sm"
                fullWidth={true}
                onClose={() => this.handleOk()}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle className={this.props.classes.titleBackground}
                             classes={{root: this.props.classes.titleColor}}
                             id="alert-dialog-title">{this.props.title || I18n.t('Error')}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        {this.props.text || I18n.t('Unknown error!')}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => this.handleOk()} color="primary" autoFocus>{I18n.t('Ok')}</Button>
                </DialogActions>
            </Dialog>
        );
    }
}

DialogError.propTypes = {
    onClose: PropTypes.func,
    title: PropTypes.string,
    text: PropTypes.string,
    icon: PropTypes.object
};

export default withStyles(styles)(DialogError);
