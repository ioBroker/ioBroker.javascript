import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Dialog from '@material-ui/core/Dialog';
import Popper from '@material-ui/core/Popper';
import Fade from '@material-ui/core/Fade';
import Paper from '@material-ui/core/Paper';

import I18n from '../i18n';

const styles = theme => ({
    textArea: {
        width: '100%',
        height: '100%',
        background: 'lightgray'
    },
    dialog: {
        height: '95%'
    },
    typography: {
        padding: theme.spacing.unit * 2,
    },
});
class DialogExport extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            anchorEl: null,
            popper: ''
        };
    }
    handleCancel = () => {
        this.props.onClose();
    };

    onCopy(event) {
        const el = window.document.getElementById('copy_input');
        if (el) {
            el.select();
            window.document.execCommand('copy');
            const target = event.currentTarget;

            setTimeout(() => {
                window.document.execCommand('copy');
                this.setState({popper: I18n.t('Copied'), anchorEl: target});
                setTimeout(() => this.setState({popper: '', anchorEl: null}), 1000);
            }, 50);

        }
        /*el.value = this.props.text;
        window.document.body.appendChild(el);
        el.select();*/
    }

    render() {
        const classes = this.props.classes;

        return (
            <Dialog
                disableBackdropClick
                disableEscapeKeyDown
                maxWidth="lg"
                classes={{paper: classes.dialog}}
                fullWidth={true}
                open={true}
                aria-labelledby="export-dialog-title"
            >
                <DialogTitle id="export-dialog-title">{I18n.t('Export selected blocks')}</DialogTitle>
                <DialogContent>
                    <pre
                        id="export-text"
                        className={classes.textArea}
                    >{this.props.text}</pre>
                </DialogContent>
                <DialogActions>
                    <Button onClick={event  => this.onCopy(event )} color="secondary">{I18n.t('Copy to clipboard')}</Button>
                    <Button onClick={() => this.handleCancel()} color="primary">{I18n.t('Close')}</Button>

                    <Popper
                        id="popper"
                        style={{zIndex: 10000}}
                        open={!!this.state.popper}
                        placement="top"
                        anchorEl={this.state.anchorEl} transition>
                        {({ TransitionProps }) => (
                            <Fade {...TransitionProps} timeout={350}>
                                <Paper>
                                    <p className={classes.typography}>{this.state.popper}</p>
                                </Paper>
                            </Fade>
                        )}
                    </Popper>
                    <textarea id="copy_input" readOnly={true} style={{position: 'absolute', left: -9999}} tabIndex={-1} aria-hidden={true}>
                        {this.props.text}
                    </textarea>
                </DialogActions>
            </Dialog>
        );
    }
}

DialogExport.propTypes = {
    classes: PropTypes.object.isRequired,
    onClose: PropTypes.func,
    text: PropTypes.string,
};

export default withStyles(styles)(DialogExport);
