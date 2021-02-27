import React, {useState} from 'react';
import Button from '@material-ui/core/Button';
import { Dialog, DialogActions, DialogContent, DialogContentText } from '@material-ui/core';
import PropTypes from 'prop-types';
import cls from './style.module.scss';
import i18n from '@iobroker/adapter-react/i18n';
import CustomInput from "../CustomInput";

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
            <Button onClick={onClose} variant="contained">
                {i18n.t(titleButtonClose)}
            </Button>
            <Button onClick={() => onApply(textInput ? value : null)}  variant="contained" color="primary">
                {i18n.t(titleButtonApply)}
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