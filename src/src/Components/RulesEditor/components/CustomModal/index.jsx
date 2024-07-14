import React, { useState } from 'react';
import PropTypes from 'prop-types';

import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
} from '@mui/material';
import { I18n } from '@iobroker/adapter-react-v5';

import cls from './style.module.scss';
import CustomInput from '../CustomInput';

const CustomModal = ({ open, onClose, children, titleButtonApply, titleButtonClose, onApply, className, textInput, defaultValue}) => {
    let [value, setValue] = useState(defaultValue);

    return <Dialog
        open={open}
        maxWidth="md"
        disableEscapeKeyDown={false}
        onClose={onClose}
        classes={{paper: cls.modalDialog, /*paper: classes.background*/}}
        className={cls.modalWrapper}
    >
        <DialogContent>
            {textInput && <CustomInput
                className={className}
                autoComplete="off"
                fullWidth
                variant="outlined"
                size="medium"
                rows={10}
                multiline
                value={value}
                onChange={setValue}
                customValue
            />}
            {!textInput && children}
        </DialogContent>
        <DialogActions>
            <Button onClick={() => onApply(textInput ? value : null)} variant="contained" color="primary">
                {I18n.t(titleButtonApply)}
            </Button>
            <Button color="grey" onClick={onClose} variant="contained">
                {I18n.t(titleButtonClose)}
            </Button>
        </DialogActions>
    </Dialog>;
}

CustomModal.defaultProps = {
    open: false,
    onApply: () => { },
    onClose: () => { },
    titleButtonClose: 'Cancel',
    titleButtonApply: 'Ok'
};

CustomModal.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func,
    children: PropTypes.any,
    titleButtonClose: PropTypes.string,
    titleButtonApply: PropTypes.string,
    onApply: PropTypes.func
};

export default CustomModal;
