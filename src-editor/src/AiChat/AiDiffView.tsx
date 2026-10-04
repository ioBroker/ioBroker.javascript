import React, { useCallback, useRef } from 'react';
import { Box, Button, Toolbar, Typography } from '@mui/material';
import { Check, Close } from '@mui/icons-material';
import { I18n, type ThemeType } from '@iobroker/gui-components';

import MonacoDiff, { type MonacoDiffHandle } from '../Components/MonacoDiff';

interface AiDiffViewProps {
    originalCode: string;
    modifiedCode: string;
    language: 'javascript' | 'typescript';
    themeType: ThemeType;
    onAccept: (code: string) => void;
    onReject: () => void;
}

const AiDiffView: React.FC<AiDiffViewProps> = ({
    originalCode,
    modifiedCode,
    language,
    themeType,
    onAccept,
    onReject,
}) => {
    const diffRef = useRef<MonacoDiffHandle>(null);

    const handleAccept = useCallback(() => {
        // Take the current modified content, the user may have edited the suggestion
        onAccept(diffRef.current?.getModifiedValue() ?? modifiedCode);
    }, [modifiedCode, onAccept]);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
            <Toolbar
                variant="dense"
                sx={{
                    minHeight: 36,
                    bgcolor: 'background.paper',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    gap: 1,
                    flexShrink: 0,
                }}
            >
                <Typography
                    variant="subtitle2"
                    sx={{ flex: 1 }}
                >
                    {I18n.t('AI suggested changes')}
                </Typography>
                <Button
                    variant="contained"
                    color="success"
                    size="small"
                    startIcon={<Check />}
                    onClick={handleAccept}
                >
                    {I18n.t('Accept')}
                </Button>
                <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<Close />}
                    onClick={onReject}
                >
                    {I18n.t('Reject')}
                </Button>
            </Toolbar>
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <MonacoDiff
                    ref={diffRef}
                    originalCode={originalCode}
                    modifiedCode={modifiedCode}
                    language={language}
                    themeType={themeType}
                />
            </Box>
        </Box>
    );
};

export default AiDiffView;
