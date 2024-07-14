import React from 'react';
import PropTypes from 'prop-types';
import Dropzone from 'react-dropzone';

import {
    Button,
    DialogTitle,
    DialogContent,
    DialogActions,
    Dialog,
} from '@mui/material';

import {
    Check as IconOk,
    Cancel as IconCancel,
} from '@mui/icons-material';
import {
    MdFileUpload as IconUpload,
    MdCancel as IconNo,
    MdAdd as IconPlus,
} from 'react-icons/md';

import { I18n } from '@iobroker/adapter-react-v5';

const styles = {
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

class DialogImport extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            text: '',
        };
    }

    componentDidMount() {
        setTimeout(() => {
            try {
                window.document.getElementById('import-text-area').focus();
            } catch (e) {

            }
        }, 100);
    }

    static readFileDataUrl(file, cb) {
        const reader = new FileReader();
        reader.onload = () => {
            cb(null, {data: reader.result, name: file.name});
        };
        reader.onabort = () => {
            console.error('file reading was aborted');
            cb(I18n.t('file reading was aborted'));
        };
        reader.onerror = (e) => {
            console.error('file reading has failed');
            cb(I18n.t('file reading has failed: %s', e));
        };

        reader.readAsText(file);
    }

    handleDropFile(files) {
        if (files && files.hasOwnProperty('target')) {
            files = files.target.files;
        }

        if (!files && !files.length) {
            return;
        }

        const file = files[files.length - 1];

        if (!file) {
            return;
        }

        DialogImport.readFileDataUrl(file, (err, result) => {
            if (err) {
                this.setState({ error: err });
            } else {
                this.setState({ text: result.data });
            }
        });
    }

    handleCancel() {
        this.props.onClose();
    }

    handleOk() {
        this.props.onClose(this.state.text);
    }

    onChange(e) {
        this.setState({ text: e.target.value });
    }

    render() {
        const style = {
            ...styles.dropzone,
            ...(this.state.imageStatus === 'accepted' ? styles.dropzoneAccepted :
                (this.state.imageStatus === 'rejected' ? styles.dropzoneRejected : undefined)),
        };

        return <Dialog
            onClose={() => false}
            maxWidth="lg"
            sx={{ '& .MuiDialog-paper': styles.dialog }}
            fullWidth
            open={this.props.open}
            aria-labelledby="import-dialog-title"
        >
            <DialogTitle id="import-dialog-title">{I18n.t('Import blocks')}</DialogTitle>
            <DialogContent style={styles.fullHeight}>
                <style>
                    {`
.dropzoneRejected {
    borderColor: #970000;
}
.dropzoneAccepted: {
    borderColor: #17cd02;
}
`}
                </style>
                <textarea
                    autoFocus
                    id="import-text-area"
                    style={styles.textArea}
                    onChange={e => this.onChange(e)}
                    value={this.state.text}
                />
                <Dropzone
                    key='image-drop'
                    maxSize={50000000}
                    acceptClassName="dropzoneAccepted"
                    rejectClassName="dropzoneRejected"
                    onDrop={files => this.handleDropFile(files)}
                    multiple={false}
                    accept='text/plain,text/xml,application/xml'
                    style={style}
                >
                    {
                        ({ getRootProps, getInputProps, isDragActive, isDragReject}) => {
                            if (isDragReject) {
                                if (this.state.imageStatus !== 'rejected') {
                                    this.setState({imageStatus: 'rejected'});
                                }
                                return <div style={styles.dropzoneDiv} {...getRootProps()}>
                                    <input {...getInputProps()} />
                                    <span key="text" style={styles.text}>{I18n.t('Some files will be rejected')}</span>
                                    <IconNo key="icon" style={{ ...styles.icon, ...styles.iconError }} />
                                </div>;
                            } else if (isDragActive) {
                                if (this.state.imageStatus !== 'accepted') {
                                    this.setState({ imageStatus: 'accepted' });
                                }

                                return (
                                    <div style={styles.dropzoneDiv} {...getRootProps()}>
                                        <input {...getInputProps()} />
                                        <span key="text" style={styles.text}>{I18n.t('All files will be accepted')}</span>
                                        <IconPlus key="icon" style={{ ...styles.icon, ...styles.iconOk }} />
                                    </div>);
                            } else {
                                if (this.state.imageStatus !== 'wait') {
                                    this.setState({imageStatus: 'wait'});
                                }
                                return (
                                    <div style={styles.dropzoneDiv} {...getRootProps()}>
                                        <input {...getInputProps()} />
                                        <span key="text" style={styles.text}>{I18n.t('Drop some files here or click...')}</span>
                                        <IconUpload key="icon" style={styles.icon}/>
                                    </div>);
                            }
                        }
                    }
                </Dropzone>
            </DialogContent>
            <DialogActions>
                <Button variant="contained" disabled={!this.state.text} onClick={event => this.handleOk()} color="primary" startIcon={<IconOk/>}>{I18n.t('Import')}</Button>
                <Button color="grey" variant="contained" onClick={() => this.handleCancel()} startIcon={<IconCancel/>}>{I18n.t('Close')}</Button>
            </DialogActions>
        </Dialog>;
    }
}

DialogImport.defaultProps = {
    open: true
}

DialogImport.propTypes = {
    onClose: PropTypes.func,
    text: PropTypes.string,
};

export default DialogImport;
