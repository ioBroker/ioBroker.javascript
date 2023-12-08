import React from 'react';
import PropTypes from 'prop-types';
import withStyles from '@mui/styles/withStyles';

import Button from '@mui/material/Button';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Dialog from '@mui/material/Dialog';
import Popper from '@mui/material/Popper';
import Fade from '@mui/material/Fade';
import Paper from '@mui/material/Paper';

import IconCopy from '@mui/icons-material/FileCopy';
import { FaFileExport as IconExport } from 'react-icons/fa';
import IconCancel from '@mui/icons-material/Cancel';
import { I18n, Utils } from '@iobroker/adapter-react-v5';

const styles = theme => ({
    textArea: {
        width: '100%',
        height: '100%',
        overflow: 'auto',
    },
    textAreaLight: {
        background: 'lightgray',
    },
    dialog: {
        height: '95%',
    },
    typography: {
        padding: theme.spacing(2),
    },
    overflowY: {
        overflowY: 'hidden',
    },
});

class DialogExport extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            anchorEl: null,
            popper: '',
        };
    }

    handleCancel() {
        this.props.onClose();
    }

    onCopy(event) {
        Utils.copyToClipboard(this.props.text);
        const anchorEl = event.currentTarget;

        setTimeout(() => {
            this.setState({ popper: I18n.t('Copied'), anchorEl });
            setTimeout(() => this.setState({ popper: '', anchorEl: null }), 1000);
        }, 50);
    }

    render() {
        const classes = this.props.classes;
        const file = new Blob([this.props.text], {type: 'text/plain'});
        const fileName = this.props.scriptId.substring('scripts.js.'.length) + '.xml';

        return <Dialog
            key="export-dialog"
            onClose={(event, reason) => false}
            maxWidth="lg"
            classes={{ paper: classes.dialog }}
            fullWidth
            open={this.props.open}
            aria-labelledby="export-dialog-title"
        >
            <DialogTitle id="export-dialog-title">{I18n.t('Export selected blocks')}</DialogTitle>
            <DialogContent
                classes={{ root: classes.overflowY }}>
                <pre
                    id="export-text"
                    className={`${classes.textArea} ${this.props.themeType === 'dark' ? '' : classes.textAreaLight}`}
                >{this.props.text}</pre>
            </DialogContent>
            <DialogActions>
                <Button variant="contained" color="secondary" startIcon={<IconExport/>}>
                    <a download={fileName} target="_blank" rel="noreferrer" href={URL.createObjectURL(file)} style={{
                        textDecoration: "inherit",
                        color: "inherit",
                    }}>{I18n.t('Download as file')}</a>
                </Button>
                <Button variant="contained" onClick={event => this.onCopy(event)} color="secondary" startIcon={<IconCopy/>}>{I18n.t('Copy to clipboard')}</Button>
                <Button variant="contained" onClick={() => this.handleCancel()} color="primary" startIcon={<IconCancel/>}>{I18n.t('Close')}</Button>

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
                <textarea id="copy_input" readOnly style={{ position: 'absolute', left: -9999 }} tabIndex={-1} aria-hidden value={this.props.text} />
            </DialogActions>
        </Dialog>;
    }
}

DialogExport.defaultProps = {
    open: true
};

DialogExport.propTypes = {
    classes: PropTypes.object.isRequired,
    onClose: PropTypes.func,
    text: PropTypes.string,
    scriptId: PropTypes.string,
    themeType: PropTypes.string,
};

export default withStyles(styles)(DialogExport);
