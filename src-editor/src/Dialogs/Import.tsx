import React from 'react';
import Dropzone, { type FileRejection } from 'react-dropzone';

import { Button, DialogTitle, DialogContent, DialogActions, Dialog } from '@mui/material';

import { Check as IconOk, Cancel as IconCancel } from '@mui/icons-material';
import { MdFileUpload as IconUpload, MdCancel as IconNo, MdAdd as IconPlus } from 'react-icons/md';

import { I18n } from '@iobroker/adapter-react-v5';

const styles: Record<string, React.CSSProperties> = {
    textArea: {
        width: 'calc(100% - 10px)',
        height: '80%',
        resize: 'none',
        fontFamily: 'monospace',
        fontSize: '1em',
    },
    dropzone: {
        marginTop: 20,
        width: '100%',
        borderWidth: 5,
        borderStyle: 'dashed',
        borderColor: '#d0cccc',
        textAlign: 'center',
        boxSizing: 'border-box',
        paddingTop: 45,
        borderRadius: 10,
        height: 'calc(100% - 10px)',
    },
    dropzoneDiv: {
        width: '100%',
        height: '20%',
        position: 'relative',
    },
    dropzoneRejected: {
        borderColor: '#970000',
    },
    dropzoneAccepted: {
        borderColor: '#17cd02',
    },
    icon: {
        height: '30%',
        width: '30%',
        color: '#eeeeee',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%,-50%)',
        zIndex: 0,
    },
    iconError: {
        color: '#ffc3c6',
    },
    iconOk: {
        color: '#aaeebc',
    },
    text: {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%,-50%)',
        color: '#868686',
        position: 'absolute',
        zIndex: 1,
    },
    dialog: {
        height: '95%',
    },
    fullHeight: {
        height: '100%',
        overflow: 'hidden',
    },
};

interface DialogImportProps {
    onClose: (text?: string) => void;
}

interface DialogImportState {
    text: string;
    imageStatus: 'accepted' | 'rejected' | 'wait' | '';
    error?: string;
}

class DialogImport extends React.Component<DialogImportProps, DialogImportState> {
    constructor(props: DialogImportProps) {
        super(props);
        this.state = {
            text: '',
            imageStatus: '',
            error: '',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    componentDidMount(): void {
        setTimeout(() => {
            try {
                window.document.getElementById('import-text-area')?.focus();
            } catch {
                // ignore
            }
        }, 100);
    }

    static readFileDataUrl(
        file: File,
        cb: (error: string | null, result?: { data: string | ArrayBuffer | null; name: string }) => void,
    ): void {
        const reader = new FileReader();
        reader.onload = () => {
            cb(null, { data: reader.result, name: file.name });
        };
        reader.onabort = () => {
            console.error('file reading was aborted');
            cb(I18n.t('file reading was aborted'));
        };
        reader.onerror = e => {
            console.error('file reading has failed');
            cb(I18n.t('file reading has failed: %s', e));
        };

        reader.readAsText(file);
    }

    handleDropFile(files: File[]): void {
        if (!files?.length) {
            return;
        }

        const file = files[files.length - 1];

        if (!file) {
            return;
        }

        DialogImport.readFileDataUrl(
            file,
            (err: string | null, result?: { data: string | ArrayBuffer | null; name: string }): void => {
                if (err || !result) {
                    this.setState({ error: err || 'No data' });
                } else {
                    this.setState({ text: result.data?.toString() || '' });
                }
            },
        );
    }

    handleCancel(): void {
        this.props.onClose();
    }

    handleOk(): void {
        this.props.onClose(this.state.text);
    }

    onChange(e: React.ChangeEvent<HTMLTextAreaElement>): void {
        this.setState({ text: e.target.value });
    }

    render(): React.JSX.Element {
        const style = {
            ...styles.dropzone,
            ...(this.state.imageStatus === 'accepted'
                ? styles.dropzoneAccepted
                : this.state.imageStatus === 'rejected'
                  ? styles.dropzoneRejected
                  : undefined),
        };

        return (
            <Dialog
                onClose={() => false}
                maxWidth="lg"
                sx={{ '& .MuiDialog-paper': styles.dialog }}
                fullWidth
                open={!0}
                aria-labelledby="import-dialog-title"
            >
                <DialogTitle id="import-dialog-title">{I18n.t('Import blocks')}</DialogTitle>
                <DialogContent style={styles.fullHeight}>
                    <textarea
                        autoFocus
                        id="import-text-area"
                        style={styles.textArea}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => this.onChange(e)}
                        value={this.state.text}
                    />
                    <Dropzone
                        maxSize={50000000}
                        onDrop={(acceptedFiles: File[], errors: FileRejection[]) => {
                            if (!acceptedFiles.length) {
                                window.alert(errors?.[0]?.errors?.[0]?.message || I18n.t('ra_Cannot upload'));
                            } else {
                                this.handleDropFile(acceptedFiles);
                            }
                        }}
                        multiple={false}
                        accept={{ 'text/plain': [], 'text/xml': [], 'application/xml': [] }}
                    >
                        {({ getRootProps, getInputProps, isDragActive, isDragReject }) => {
                            if (isDragReject) {
                                if (this.state.imageStatus !== 'rejected') {
                                    this.setState({ imageStatus: 'rejected' });
                                }
                                return (
                                    <div
                                        style={{
                                            ...style,
                                            ...styles.dropzoneDiv,
                                        }}
                                        {...getRootProps()}
                                    >
                                        <input {...getInputProps()} />
                                        <span
                                            key="text"
                                            style={styles.text}
                                        >
                                            {I18n.t('Some files will be rejected')}
                                        </span>
                                        <IconNo
                                            key="icon"
                                            style={{ ...styles.icon, ...styles.iconError }}
                                        />
                                    </div>
                                );
                            }

                            if (isDragActive) {
                                if (this.state.imageStatus !== 'accepted') {
                                    this.setState({ imageStatus: 'accepted' });
                                }

                                return (
                                    <div
                                        style={{
                                            ...style,
                                            ...styles.dropzoneDiv,
                                        }}
                                        {...getRootProps()}
                                    >
                                        <input {...getInputProps()} />
                                        <span
                                            key="text"
                                            style={styles.text}
                                        >
                                            {I18n.t('All files will be accepted')}
                                        </span>
                                        <IconPlus
                                            key="icon"
                                            style={{ ...styles.icon, ...styles.iconOk }}
                                        />
                                    </div>
                                );
                            }

                            if (this.state.imageStatus !== 'wait') {
                                this.setState({ imageStatus: 'wait' });
                            }
                            return (
                                <div
                                    style={{
                                        ...style,
                                        ...styles.dropzoneDiv,
                                    }}
                                    {...getRootProps()}
                                >
                                    <input {...getInputProps()} />
                                    <span
                                        key="text"
                                        style={styles.text}
                                    >
                                        {I18n.t('Drop some files here or click...')}
                                    </span>
                                    <IconUpload
                                        key="icon"
                                        style={styles.icon}
                                    />
                                </div>
                            );
                        }}
                    </Dropzone>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        disabled={!this.state.text}
                        onClick={() => this.handleOk()}
                        color="primary"
                        startIcon={<IconOk />}
                    >
                        {I18n.t('Import')}
                    </Button>
                    <Button
                        color="grey"
                        variant="contained"
                        onClick={() => this.handleCancel()}
                        startIcon={<IconCancel />}
                    >
                        {I18n.t('Close')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

export default DialogImport;
