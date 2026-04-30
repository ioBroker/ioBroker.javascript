import React, { useCallback, useEffect, useRef } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { ContentCopy, AddCircleOutline, CompareArrows } from '@mui/icons-material';
import { I18n, type ThemeType } from '@iobroker/adapter-react-v5';
import type { ChatSourceRange } from './AiChatTypes';

interface AiChatCodeBlockProps {
    code: string;
    language: string;
    themeType: ThemeType;
    onInsertCode?: (code: string) => void;
    onShowDiff?: (code: string, sourceRange: ChatSourceRange | null | undefined) => void;
    /**
     * Snapshot of where the user's question was anchored, inherited from the
     *  parent chat message. The host uses it to render an inline, in-place diff
     *  instead of a full-script modal.
     */
    sourceRange?: ChatSourceRange | null;
}

const AiChatCodeBlock: React.FC<AiChatCodeBlockProps> = ({
    code,
    language,
    themeType,
    onInsertCode,
    onShowDiff,
    sourceRange,
}) => {
    const codeRef = useRef<HTMLPreElement>(null);

    useEffect(() => {
        const monaco = (window as any).monaco;
        if (!codeRef.current || !monaco?.editor?.colorize) {
            return;
        }
        const langId = language === 'ts' || language === 'typescript' ? 'typescript' : language || 'javascript';
        // colorize returns a promise with HTML string - safe across theme changes
        void monaco.editor
            .colorize(code, langId, { theme: themeType === 'dark' ? 'vs-dark' : 'vs' })
            .then((html: string) => {
                if (codeRef.current) {
                    codeRef.current.innerHTML = html;
                }
            });
    }, [code, language, themeType]);

    const handleCopy = useCallback(() => {
        void navigator.clipboard.writeText(code);
    }, [code]);

    return (
        <Box
            sx={{
                position: 'relative',
                my: 1,
                borderRadius: 1,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 1,
                    py: 0.5,
                    bgcolor: 'action.hover',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase' }}>
                    {language || 'javascript'}
                </Box>
                <Box>
                    <Tooltip title={I18n.t('Copy')}>
                        <IconButton
                            size="small"
                            onClick={handleCopy}
                        >
                            <ContentCopy sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                    {onInsertCode && (
                        <Tooltip title={I18n.t('Insert into editor')}>
                            <IconButton
                                size="small"
                                onClick={() => onInsertCode(code)}
                            >
                                <AddCircleOutline sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                    )}
                    {onShowDiff && (
                        <Tooltip title={I18n.t('Show as diff')}>
                            <IconButton
                                size="small"
                                onClick={() => onShowDiff(code, sourceRange)}
                            >
                                <CompareArrows sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            </Box>
            <pre
                ref={codeRef}
                style={{
                    margin: 0,
                    padding: '8px 12px',
                    overflow: 'auto',
                    maxHeight: 400,
                    fontSize: '13px',
                    fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
                    backgroundColor: themeType === 'dark' ? '#1e1e1e' : '#f8f8f8',
                    color: themeType === 'dark' ? '#d4d4d4' : '#333',
                }}
            >
                {code}
            </pre>
        </Box>
    );
};

export default AiChatCodeBlock;
