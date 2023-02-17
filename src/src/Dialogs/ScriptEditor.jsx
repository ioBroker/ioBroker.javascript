import React from 'react';
import PropTypes from 'prop-types';
import withStyles from '@mui/styles/withStyles';

import Button from '@mui/material/Button';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Dialog from '@mui/material/Dialog';

import IconSave from '@mui/icons-material/Save';
import IconCancel from '@mui/icons-material/Cancel';

import { I18n } from '@iobroker/adapter-react-v5';

import ScriptEditorComponent from '../Components/ScriptEditorVanilaMonaco';

const styles = theme => ({
    textArea: {
        width: 'calc(100% - 10px)',
        resize: 'none'
    },
    dialog: {
        height: '95%'
    },
    fullHeight: {
        height: '100%',
        overflow: 'hidden'
    },
    args: {
        color: theme.palette.mode === 'dark' ? 'white' : 'black',
        height: 30,
        width: '100%',
        fontSize: 16
    },
    argsTitle: {
        color: theme.palette.mode === 'dark' ? 'white' : 'black',
        fontWeight: 'bold'
    }
});

class DialogScriptEditor extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            changed: false,
            source: this.props.source,
        };
        if (!this.state.source && this.props.isReturn) {
            this.state.source = '\nreturn false';
        }
    }

    componentDidMount() {
        setTimeout(() => {
            try {
                window.document.getElementById('source-text-area').focus();
            } catch (e) {

            }
        }, 100);
    }

    handleCancel () {
        this.props.onClose(false);
    }

    handleOk () {
        if (this.props.isReturn && !this.state.source.includes('return ')) {

        } else {
            this.props.onClose(this.state.source);
        }
    }

    onChange(value) {
        this.setState({changed: true, source: value});
    }

    render() {
        const classes = this.props.classes;

        return <Dialog
            onClose={(event, reason) => false}
            maxWidth="lg"
            classes={{paper: classes.dialog}}
            fullWidth
            open={!0}
            aria-labelledby="source-dialog-title"
        >
            <DialogTitle id="source-dialog-title">{I18n.t('Function editor')}</DialogTitle>
            <DialogContent className={classes.fullHeight}>
                {this.props.args && (<div key="arguments" className={classes.args}>
                    <span className={classes.argsTitle}>{I18n.t('function (')}</span>
                    {this.props.args}
                    <span className={classes.argsTitle}>)</span>
                </div>)}
                <ScriptEditorComponent
                    adapterName={this.props.adapterName}
                    runningInstances={this.props.runningInstances}
                    className={classes.textArea}
                    style={{height: this.props.args ? 'calc(100% - 30px)' : '100%'}}
                    key="scriptEditor"
                    name={'blockly'}
                    socket={this.props.socket}
                    readOnly={false}
                    checkJs={false}
                    changed={this.state.changed}
                    code={this.state.source}
                    isDark={this.props.themeType === 'dark'}
                    onChange={newValue => this.onChange(newValue)}
                    language={'javascript'}
                />
            </DialogContent>
            <DialogActions>
                <Button variant="contained" onClick={() => this.handleOk()} color="primary" startIcon={<IconSave/>}>{I18n.t('Save')}</Button>
                <Button color="grey" variant="contained" onClick={() => this.handleCancel()} startIcon={<IconCancel/>}>{I18n.t('Cancel')}</Button>
            </DialogActions>
        </Dialog>;
    }
}

DialogScriptEditor.propTypes = {
    classes: PropTypes.object.isRequired,
    adapterName: PropTypes.string.isRequired,
    runningInstances: PropTypes.object.isRequired,
    onClose: PropTypes.func,
    source: PropTypes.string,
    args: PropTypes.string,
    isReturn: PropTypes.bool,
    themeType: PropTypes.string,
    socket: PropTypes.object
};

export default withStyles(styles)(DialogScriptEditor);
