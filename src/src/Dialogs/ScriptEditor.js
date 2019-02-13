import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Dialog from '@material-ui/core/Dialog';

import ScriptEditorComponent from '../Components/ScriptEditorVanilaMonaco';

import I18n from '../i18n';

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
        color: theme.palette.type === 'dark' ? 'white' : 'black',
        height: 30,
        width: '100%',
        fontSize: 16
    },
    argsTitle: {
        color: theme.palette.type === 'dark' ? 'white' : 'black',
        fontWeight: 'bold'
    }
});

class DialogScriptEditor extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
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
        if (this.props.isReturn && this.state.source.indexOf('return ') === -1) {

        } else {
            this.props.onClose(this.state.source);
        }
    }

    onChange(value) {
        this.setState({source: value});
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
                        className={classes.textArea}
                        style={{height: this.props.args ? 'calc(100% - 30px)' : '100%'}}
                        key="scriptEditor"
                        name={'blockly'}
                        connection={this.props.connection}
                        readOnly={false}
                        checkJs={false}
                        code={this.state.source}
                        isDark={this.props.theme === 'dark'}
                        onChange={newValue => this.onChange(newValue)}
                        language={'javascript'}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={event => this.handleOk()} color="primary">{I18n.t('Save')}</Button>
                    <Button onClick={event => this.handleCancel()} color="secondary">{I18n.t('Cancel')}</Button>
                </DialogActions>
            </Dialog>
        );
    }
}

DialogScriptEditor.propTypes = {
    classes: PropTypes.object.isRequired,
    onClose: PropTypes.func,
    source: PropTypes.string,
    args: PropTypes.string,
    isReturn: PropTypes.bool,
    theme: PropTypes.string,
    connection: PropTypes.object
};

export default withStyles(styles)(DialogScriptEditor);
