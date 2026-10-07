import React from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { Close as IconClose, Save as IconSave } from '@mui/icons-material';
import { I18n, type ThemeType } from '@iobroker/gui-components';

import MonacoDiff from '../Components/MonacoDiff';

interface DialogDiffProps {
    /** The script as it is stored in the objects DB */
    savedCode: string;
    /** The script as it currently is in the editor */
    currentCode: string;
    language: 'javascript' | 'typescript';
    themeType: ThemeType;
    /** Name of the script, for the title */
    name: string;
    onClose: () => void;
    /** Save straight from the dialog - having just read the changes, that is the usual next step */
    onSave: () => void;
}

/**
 * Shows what is unsaved: the stored script on the left, the editor content on the right.
 *
 * Read-only on purpose. Editing happens in the editor; this is for looking at the change before
 * saving it, which is also why the dialog offers Save.
 */
const DialogDiff: React.FC<DialogDiffProps> = ({
    savedCode,
    currentCode,
    language,
    themeType,
    name,
    onClose,
    onSave,
}) => (
    <Dialog
        open={!0}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        sx={{ '& .MuiDialog-paper': { height: 'calc(100% - 64px)' } }}
    >
        <DialogTitle>
            {I18n.t('Changes against the saved version')}
            <Typography
                component="span"
                sx={{ ml: 1, color: 'text.secondary' }}
            >
                {name}
            </Typography>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', p: 0, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
                <MonacoDiff
                    originalCode={savedCode}
                    modifiedCode={currentCode}
                    language={language}
                    themeType={themeType}
                    readOnly
                />
            </Box>
        </DialogContent>
        <DialogActions>
            <Button
                variant="contained"
                color="primary"
                onClick={() => {
                    onSave();
                    onClose();
                }}
                startIcon={<IconSave />}
            >
                {I18n.t('Save')}
            </Button>
            <Button
                variant="contained"
                color="grey"
                onClick={onClose}
                startIcon={<IconClose />}
            >
                {I18n.t('Close')}
            </Button>
        </DialogActions>
    </Dialog>
);

export default DialogDiff;
