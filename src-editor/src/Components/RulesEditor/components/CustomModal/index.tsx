import React, { useState } from 'react';

import { Button, Dialog, DialogActions, DialogContent } from '@mui/material';
import { I18n } from '@iobroker/adapter-react-v5';

import cls from './style.module.scss';
import CustomInput from '../CustomInput';

interface CustomModalProps {
    onClose: () => void;
    children?: React.JSX.Element[] | React.JSX.Element | null;
    titleButtonApply?: string;
    titleButtonClose?: string;
    onApply: (value: string | number | null) => void;
    className?: string;
    textInput?: boolean;
    defaultValue?: string | number;
}

const CustomModal = ({
    onClose,
    children,
    titleButtonApply,
    titleButtonClose,
    onApply,
    className,
    textInput,
    defaultValue,
}: CustomModalProps): React.JSX.Element => {
    const [value, setValue] = useState<string | number>(defaultValue || '');
    const [originalValue] = useState<string | number>(defaultValue || '');

    return (
        <Dialog
            open={!0}
            maxWidth="md"
            disableEscapeKeyDown={false}
            onClose={onClose}
            classes={{ paper: cls.modalDialog /*paper: classes.background*/ }}
            className={cls.modalWrapper}
        >
            <DialogContent>
                {textInput && (
                    <CustomInput
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
                    />
                )}
                {!textInput && children}
            </DialogContent>
            <DialogActions>
                <Button
                    disabled={originalValue === value}
                    onClick={() => onApply(textInput ? value : null)}
                    variant="contained"
                    color="primary"
                >
                    {I18n.t(titleButtonApply || 'Ok')}
                </Button>
                <Button
                    color="grey"
                    onClick={onClose}
                    variant="contained"
                >
                    {I18n.t(titleButtonClose || 'Cancel')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CustomModal;
