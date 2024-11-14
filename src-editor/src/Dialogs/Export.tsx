import React from 'react';

import { Button, DialogTitle, DialogContent, DialogActions, Dialog, Popper, Fade, Paper } from '@mui/material';

import { FileCopy as IconCopy, Cancel as IconCancel } from '@mui/icons-material';
import { FaFileExport as IconExport } from 'react-icons/fa';

import { I18n, type ThemeType, Utils } from '@iobroker/adapter-react-v5';

const styles: Record<string, React.CSSProperties> = {
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
        padding: 16,
    },
    overflowY: {
        overflowY: 'hidden',
    },
};

interface DialogExportProps {
    onClose: () => void;
    text: string;
    scriptId: string;
    themeType: ThemeType;
}
interface DialogExportState {
    anchorEl: null | HTMLElement;
    popper: string;
}

class DialogExport extends React.Component<DialogExportProps, DialogExportState> {
    constructor(props: DialogExportProps) {
        super(props);
        this.state = {
            anchorEl: null,
            popper: '',
        };
    }

    handleCancel(): void {
        this.props.onClose();
    }

    onCopy(event: React.MouseEvent<HTMLButtonElement>): void {
        Utils.copyToClipboard(this.props.text);
        const anchorEl = event.currentTarget;

        setTimeout(() => {
            this.setState({ popper: I18n.t('Copied'), anchorEl });
            setTimeout(() => this.setState({ popper: '', anchorEl: null }), 1000);
        }, 50);
    }

    render(): React.JSX.Element {
        const file = new Blob([this.props.text], { type: 'application/xml' });
        const fileName = `${this.props.scriptId.substring('scripts.js'.length)}.xml`;

        return (
            <Dialog
                key="export-dialog"
                onClose={() => false}
                maxWidth="lg"
                sx={{ '& .MuiDialog-paper': styles.dialog }}
                fullWidth
                open={!0}
                aria-labelledby="export-dialog-title"
            >
                <DialogTitle id="export-dialog-title">{I18n.t('Export selected blocks')}</DialogTitle>
                <DialogContent style={styles.overflowY}>
                    <pre
                        id="export-text"
                        style={{
                            ...styles.textArea,
                            ...(this.props.themeType === 'dark' ? undefined : styles.textAreaLight),
                        }}
                    >
                        {this.props.text}
                    </pre>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<IconExport />}
                    >
                        <a
                            download={fileName}
                            target="_blank"
                            rel="noreferrer"
                            href={URL.createObjectURL(file)}
                            style={{
                                textDecoration: 'inherit',
                                color: 'inherit',
                            }}
                        >
                            {I18n.t('Download as file')}
                        </a>
                    </Button>
                    <Button
                        variant="contained"
                        onClick={event => this.onCopy(event)}
                        color="secondary"
                        startIcon={<IconCopy />}
                    >
                        {I18n.t('Copy to clipboard')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => this.handleCancel()}
                        color="primary"
                        startIcon={<IconCancel />}
                    >
                        {I18n.t('Close')}
                    </Button>

                    <Popper
                        id="popper"
                        style={{ zIndex: 10000 }}
                        open={!!this.state.popper}
                        placement="top"
                        anchorEl={this.state.anchorEl}
                        transition
                    >
                        {({ TransitionProps }) => (
                            <Fade
                                {...TransitionProps}
                                timeout={350}
                            >
                                <Paper>
                                    <p style={styles.typography}>{this.state.popper}</p>
                                </Paper>
                            </Fade>
                        )}
                    </Popper>
                    <textarea
                        id="copy_input"
                        readOnly
                        style={{ position: 'absolute', left: -9999 }}
                        tabIndex={-1}
                        aria-hidden
                        value={this.props.text}
                    />
                </DialogActions>
            </Dialog>
        );
    }
}

export default DialogExport;
