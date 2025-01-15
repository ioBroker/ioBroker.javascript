import React from 'react';

import { Button, DialogTitle, DialogContent, DialogActions, Dialog, Box } from '@mui/material';

import { Save as IconSave, Cancel as IconCancel } from '@mui/icons-material';

import { type AdminConnection, I18n, type IobTheme, type ThemeType } from '@iobroker/adapter-react-v5';

import ScriptEditorComponent from '../Components/ScriptEditorVanilaMonaco';

const styles: Record<string, any> = {
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
    args: (theme: IobTheme): React.CSSProperties => ({
        color: theme.palette.mode === 'dark' ? 'white' : 'black',
        height: 30,
        width: '100%',
        fontSize: 16,
    }),
    argsTitle: (theme: IobTheme): React.CSSProperties => ({
        color: theme.palette.mode === 'dark' ? 'white' : 'black',
        fontWeight: 'bold',
    }),
};

interface DialogScriptEditorProps {
    onClose: (source: string | false) => void;
    source: string;
    args: string;
    isReturn: boolean;
    themeType: ThemeType;
    adapterName: string;
    runningInstances: Record<string, boolean>;
    socket: AdminConnection;
}

interface DialogScriptEditorState {
    changed: boolean;
    source: string;
}

class DialogScriptEditor extends React.Component<DialogScriptEditorProps, DialogScriptEditorState> {
    constructor(props: DialogScriptEditorProps) {
        super(props);
        this.state = {
            changed: false,
            source: !this.state.source && this.props.isReturn ? '\nreturn false' : this.props.source,
        };
    }

    // eslint-disable-next-line class-methods-use-this
    componentDidMount(): void {
        setTimeout(() => {
            try {
                window.document.getElementById('source-text-area')?.focus();
            } catch {
                // ignore
            }
        }, 100);
    }

    handleCancel(): void {
        this.props.onClose(false);
    }

    handleOk(): void {
        if (!this.props.isReturn || this.state.source.includes('return ')) {
            this.props.onClose(this.state.source);
        }
    }

    onChange(value: string): void {
        this.setState({ changed: true, source: value });
    }

    render(): React.JSX.Element {
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
                        name="blockly"
                        socket={this.props.socket}
                        readOnly={false}
                        checkJs={false}
                        changed={this.state.changed}
                        code={this.state.source}
                        isDark={this.props.themeType === 'dark'}
                        onChange={(newValue: string) => this.onChange(newValue)}
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

export default DialogScriptEditor;
