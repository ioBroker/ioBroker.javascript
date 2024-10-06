import React from 'react';
import PropTypes from 'prop-types';

import { Button, DialogTitle, DialogContent, DialogActions, Dialog, Box } from '@mui/material';

import { Save as IconSave, Cancel as IconCancel } from '@mui/icons-material';

import { I18n } from '@iobroker/adapter-react-v5';

import ScriptEditorComponent from '../Components/ScriptEditorVanilaMonaco';

const styles = {
    textArea: {
        width: 'calc(100% - 10px)',
        resize: 'none',
    },
    dialog: {
        height: '95%',
    },
    fullHeight: {
        height: '100%',
        overflow: 'hidden',
    },
    args: theme => ({
        color: theme.palette.mode === 'dark' ? 'white' : 'black',
        height: 30,
        width: '100%',
        fontSize: 16,
    }),
    argsTitle: theme => ({
        color: theme.palette.mode === 'dark' ? 'white' : 'black',
        fontWeight: 'bold',
    }),
};

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
            } catch (e) {}
        }, 100);
    }

    handleCancel() {
        this.props.onClose(false);
    }

    handleOk() {
        if (this.props.isReturn && !this.state.source.includes('return ')) {
        } else {
            this.props.onClose(this.state.source);
        }
    }

    onChange(value) {
        this.setState({ changed: true, source: value });
    }

    render() {
        return (
            <Dialog
                onClose={() => false}
                maxWidth="lg"
                sx={{ '& .MuiDialog-paper': styles.dialog }}
                fullWidth
                open={!0}
                aria-labelledby="source-dialog-title"
            >
                <DialogTitle id="source-dialog-title">{I18n.t('Function editor')}</DialogTitle>
                <DialogContent style={styles.fullHeight}>
                    {this.props.args && (
                        <Box
                            key="arguments"
                            sx={styles.args}
                        >
                            <Box
                                component="span"
                                sx={styles.argsTitle}
                            >
                                {I18n.t('function (')}
                            </Box>
                            {this.props.args}
                            <Box
                                component="span"
                                sx={styles.argsTitle}
                            >
                                )
                            </Box>
                        </Box>
                    )}
                    <ScriptEditorComponent
                        adapterName={this.props.adapterName}
                        runningInstances={this.props.runningInstances}
                        style={{ ...styles.textArea, height: this.props.args ? 'calc(100% - 30px)' : '100%' }}
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
                    <Button
                        variant="contained"
                        onClick={() => this.handleOk()}
                        color="primary"
                        startIcon={<IconSave />}
                    >
                        {I18n.t('Save')}
                    </Button>
                    <Button
                        color="grey"
                        variant="contained"
                        onClick={() => this.handleCancel()}
                        startIcon={<IconCancel />}
                    >
                        {I18n.t('Cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

DialogScriptEditor.propTypes = {
    adapterName: PropTypes.string.isRequired,
    runningInstances: PropTypes.object.isRequired,
    onClose: PropTypes.func,
    source: PropTypes.string,
    args: PropTypes.string,
    isReturn: PropTypes.bool,
    themeType: PropTypes.string,
    socket: PropTypes.object,
};

export default DialogScriptEditor;
