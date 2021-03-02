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

import IconCopy from '@material-ui/icons/FileCopy';
import IconCancel from '@material-ui/icons/Cancel';

import I18n from '@iobroker/adapter-react/i18n';

const styles = theme => ({
    textArea: {
        width: '100%',
        height: '100%',
        overflow: 'auto'
    },
    textAreaLight: {
        background: 'lightgray'
    },
    dialog: {
        height: '95%'
    },
    typography: {
        padding: theme.spacing(2),
    },
    buttonIcon: {
        marginRight: theme.spacing(1),
    },
    overflowY: {
        overflowY: 'hidden'
    }
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
                this.setState({ popper: I18n.t('Copied'), anchorEl: target });
                setTimeout(() => this.setState({ popper: '', anchorEl: null }), 1000);
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
                key="export-dialog"
                disableBackdropClick
                disableEscapeKeyDown
                maxWidth="lg"
                classes={{ paper: classes.dialog }}
                fullWidth={true}
                open={this.props.open}
                aria-labelledby="export-dialog-title"
            >
                <DialogTitle id="export-dialog-title">{I18n.t('Export selected blocks')}</DialogTitle>
                <DialogContent
                    classes={{ root: classes.overflowY }}>
                    <pre
                        id="export-text"
                        className={classes.textArea + ' ' + (this.props.themeType === 'dark' ? '' : classes.textAreaLight)}
                    >{this.props.text}</pre>
                </DialogContent>
                <DialogActions>
                    <Button onClick={event => this.onCopy(event)} color="secondary"><IconCopy className={this.props.classes.buttonIcon} />{I18n.t('Copy to clipboard')}</Button>
                    <Button onClick={() => this.handleCancel()} color="primary"><IconCancel className={this.props.classes.buttonIcon} />{I18n.t('Close')}</Button>

                    <Popper
                        id="popper"
                        style={{ zIndex: 10000 }}
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
                    <textarea id="copy_input" readOnly={true} style={{ position: 'absolute', left: -9999 }} tabIndex={-1} aria-hidden={true} value={this.props.text} />
                </DialogActions>
            </Dialog>
        );
    }
}

DialogExport.defaultProps = {
    open: true
}

DialogExport.propTypes = {
    classes: PropTypes.object.isRequired,
    onClose: PropTypes.func,
    text: PropTypes.string,
    themeType: PropTypes.string,
};

export default withStyles(styles)(DialogExport);
