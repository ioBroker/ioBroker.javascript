import React, { useEffect, useRef, useCallback } from 'react';
import { Box, Button, Toolbar, Typography } from '@mui/material';
import { Check, Close } from '@mui/icons-material';
import { I18n, type ThemeType } from '@iobroker/adapter-react-v5';
import type * as monacoEditor from 'monaco-editor';

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
    const containerRef = useRef<HTMLDivElement>(null);
    const diffEditorRef = useRef<monacoEditor.editor.IDiffEditor | null>(null);
    const modifiedModelRef = useRef<monacoEditor.editor.ITextModel | null>(null);

    useEffect(() => {
        const monaco = (window as any).monaco as typeof monacoEditor | undefined;
        if (!monaco || !containerRef.current) {
            return;
        }

        const diffEditor = monaco.editor.createDiffEditor(containerRef.current, {
            readOnly: false,
            originalEditable: false,
            renderSideBySide: true,
            automaticLayout: true,
            theme: themeType === 'dark' ? 'vs-dark' : 'vs',
            scrollBeyondLastLine: false,
            minimap: { enabled: false },
        });

        const originalModel = monaco.editor.createModel(originalCode, language);
        const modifiedModel = monaco.editor.createModel(modifiedCode, language);
        modifiedModelRef.current = modifiedModel;

        diffEditor.setModel({
            original: originalModel,
            modified: modifiedModel,
        });

        diffEditorRef.current = diffEditor;

        return () => {
            diffEditor.dispose();
            originalModel.dispose();
            modifiedModel.dispose();
            diffEditorRef.current = null;
            modifiedModelRef.current = null;
        };
    }, [originalCode, modifiedCode, language, themeType]);

    const handleAccept = useCallback(() => {
        // Get the current modified content (user may have edited it)
        const currentModified = modifiedModelRef.current?.getValue() || modifiedCode;
        onAccept(currentModified);
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
            <Box
                ref={containerRef}
                sx={{ flex: 1, overflow: 'hidden' }}
            />
        </Box>
    );
};

export default AiDiffView;
