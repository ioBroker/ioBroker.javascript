import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Dialog from '@material-ui/core/Dialog';
import Dropzone from 'react-dropzone';
import DialogError from './Error';
import {MdFileUpload as IconUpload} from 'react-icons/md';
import {MdCancel as IconNo} from 'react-icons/md';
import {MdPlusOne as IconPlus} from 'react-icons/md';

import I18n from '../i18n';

const styles = theme => ({
    dialog: {
        height: '95%'
    },
    fullHeight: {
        height: '100%',
        overflow: 'hidden'
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
        height: 'calc(100% - 10px)'
    },
    dropzoneDiv: {
        width: '100%',
        height: '100%'
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
    }
});
class DialogImportFile extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            error: '',
            imageStatus: ''
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

    handleCancel () {
        this.props.onClose();
    }

    onChange(e) {
        this.setState({text: e.target.value});
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

        reader.readAsDataURL(file)
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
        DialogImportFile.readFileDataUrl(file, (err, result) => {
            if (err) {
                this.setState({error: err})
            } else {
                this.props.onClose(result && result.data);
            }
        });
    }

    render() {
        const classes = this.props.classes;
        const className = classes.dropzone + ' ' + (this.state.imageStatus === 'accepted' ? classes.dropzoneAccepted : (this.state.imageStatus === 'rejected' ? classes.dropzoneRejected : ''));

        return (
            <Dialog
                disableBackdropClick
                disableEscapeKeyDown
                maxWidth="lg"
                classes={{paper: classes.dialog}}
                fullWidth={true}
                open={true}
                aria-labelledby="import-dialog-title"
            >
                <DialogTitle id="import-dialog-title">{I18n.t('Import scripts')}</DialogTitle>
                <DialogContent className={classes.fullHeight}>
                    <Dropzone   key='image-drop'

                                maxSize={50000000}
                                acceptClassName={classes.dropzoneAccepted}
                                rejectClassName={classes.dropzoneRejected}
                                onDrop={files => this.handleDropFile(files)}
                                multiple={false}
                                accept='application/x-zip-compressed'
                                className={className}>
                        {
                            ({ getRootProps, getInputProps, isDragActive, isDragReject}) => {
                                if (isDragReject) {
                                    if (this.state.imageStatus !== 'rejected') {
                                        this.setState({imageStatus: 'rejected'});
                                    }
                                    return (
                                        <div className={this.props.classes.dropzoneDiv} {...getRootProps()}>
                                            <input {...getInputProps()} />
                                            <span key="text" className={this.props.classes.text}>{I18n.t('Some files will be rejected')}</span>
                                            <IconNo key="icon" className={this.props.classes.icon + ' ' + this.props.classes.iconError}/>
                                        </div>);
                                } else if (isDragActive) {
                                    if (this.state.imageStatus !== 'accepted') {
                                        this.setState({imageStatus: 'accepted'});
                                    }

                                    return (
                                        <div className={this.props.classes.dropzoneDiv} {...getRootProps()}>
                                            <input {...getInputProps()} />
                                            <span key="text" className={this.props.classes.text}>{I18n.t('All files will be accepted')}</span>
                                            <IconPlus key="icon" className={this.props.classes.icon + ' ' + this.props.classes.iconOk}/>
                                        </div>);
                                } else {
                                    if (this.state.imageStatus !== 'wait') {
                                        this.setState({imageStatus: 'wait'});
                                    }
                                    return (
                                        <div className={this.props.classes.dropzoneDiv} {...getRootProps()}>
                                            <input {...getInputProps()} />
                                            <span key="text" className={this.props.classes.text}>{I18n.t('Drop some files here or click...')}</span>
                                            <IconUpload key="icon" className={this.props.classes.icon}/>
                                        </div>);
                                }
                            }
                        }
                    </Dropzone>
                    {this.state.error ? (<DialogError text={this.state.error} onClose={() => this.setState({error: ''})}/>) : null}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => this.handleCancel()} color="secondary">{I18n.t('Close')}</Button>
                </DialogActions>
            </Dialog>
        );
    }
}

DialogImportFile.propTypes = {
    classes: PropTypes.object.isRequired,
    onClose: PropTypes.func,
};

export default withStyles(styles)(DialogImportFile);
