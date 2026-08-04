import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { Box, IconButton, Tooltip, CircularProgress, Typography, Alert } from '@mui/material';
import { Close, AddComment, Refresh } from '@mui/icons-material';
import { I18n, type AdminConnection, type ThemeType } from '@iobroker/gui-components';

import type { ScriptInfo, AiScriptLanguage, EditorApi, EditorAiActionRequest, ChatSourceRange } from './AiChatTypes';
import { useAiChat } from './useAiChat';
import AiChatMessage from './AiChatMessage';
import AiChatInput from './AiChatInput';

interface AiChatPanelProps {
    socket: AdminConnection;
    runningInstances: Record<string, unknown>;
    themeType: ThemeType;
    currentCode?: string;
    currentLanguage?: AiScriptLanguage;
    selectedCode?: string;
    allScripts?: ScriptInfo[];
    editorApi?: EditorApi;
    /** An editor-triggered AI action that the panel should execute. */
    aiActionRequest?: EditorAiActionRequest | null;
    /** Called by the panel once the action has been dispatched so the host can reset state. */
    onAiActionConsumed?: () => void;
    /**
     * Called once at mount with a function the inline-chat widget can use to ask single-turn
     *  questions without touching the chat history. Called again with `null` at unmount.
     */
    onRegisterInlineAsk?: (ask: ((question: string, code: string) => Promise<string>) | null) => void;
    onInsertCode?: (code: string) => void;
    /**
     * Show-diff with an optional source range so the host can render an inline
     *  in-place diff instead of a full-script modal.
     */
    onShowDiff?: (modifiedCode: string, sourceRange: ChatSourceRange | null | undefined) => void;
    onApplyCode?: (code: string) => void;
    /** Currently selected script id (used to populate ChatSourceRange.scriptId). */
    currentScriptId?: string;
    onClose: () => void;
}

const AiChatPanel: React.FC<AiChatPanelProps> = ({
    socket,
    runningInstances,
    themeType,
    currentCode,
    currentLanguage,
    selectedCode,
    allScripts,
    editorApi,
    aiActionRequest,
    onAiActionConsumed,
    onRegisterInlineAsk,
    onInsertCode,
    onShowDiff,
    onApplyCode,
    currentScriptId,
    onClose,
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const chatOptions = useMemo(
        () => ({
            socket,
            runningInstances,
            currentCode,
            currentLanguage,
            allScripts,
            editorApi,
            currentScriptId,
        }),
        [socket, runningInstances, currentCode, currentLanguage, allScripts, editorApi, currentScriptId],
    );

    const {
        messages,
        isLoading,
        error,
        model,
        availableModels,
        modelProviderMap,
        modelsLoading,
        modelsError,
        lastContextInfo,
        mode,
        setMode,
        setModel,
        sendMessage,
        triggerAiAction,
        askInline,
        clearChat,
        retryLoadModels,
    } = useAiChat(chatOptions);

    // Expose the one-shot ask function to the host so the Ctrl+I inline widget can reach it.
    useEffect(() => {
        onRegisterInlineAsk?.(askInline);
        return () => onRegisterInlineAsk?.(null);
    }, [askInline, onRegisterInlineAsk]);

    // Dispatch editor-triggered AI actions (context menu / keyboard / code lens).
    // Use a ref to remember the last request we already fired so the effect stays
    // idempotent when triggerAiAction / onAiActionConsumed change identity.
    const lastFiredActionRef = useRef<EditorAiActionRequest | null>(null);
    useEffect(() => {
        if (!aiActionRequest || lastFiredActionRef.current === aiActionRequest) {
            return;
        }
        lastFiredActionRef.current = aiActionRequest;
        triggerAiAction(aiActionRequest);
        onAiActionConsumed?.();
    }, [aiActionRequest, triggerAiAction, onAiActionConsumed]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleInsertCode = useCallback(
        (code: string) => {
            onInsertCode?.(code);
        },
        [onInsertCode],
    );

    const handleShowDiff = useCallback(
        (code: string, sourceRange: ChatSourceRange | null | undefined) => {
            onShowDiff?.(code, sourceRange);
        },
        [onShowDiff],
    );

    const handleApplyCode = useCallback(
        (code: string) => {
            onApplyCode?.(code);
        },
        [onApplyCode],
    );

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                bgcolor: 'background.default',
                // Inline code styling that adapts to theme
                '& .ai-chat-inline-code': {
                    backgroundColor: 'action.selected',
                    color: 'text.primary',
                    border: '1px solid',
                    borderColor: 'divider',
                },
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1,
                    py: 0.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    bgcolor: themeType === 'dark' ? 'grey.900' : 'grey.100',
                    flexShrink: 0,
                }}
            >
                <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, flex: 1, color: 'text.primary' }}
                >
                    {I18n.t('AI Chat')}
                </Typography>

                {modelsLoading && <CircularProgress size={16} />}

                <Tooltip title={I18n.t('New chat')}>
                    <IconButton
                        size="small"
                        onClick={clearChat}
                    >
                        <AddComment sx={{ fontSize: 18 }} />
                    </IconButton>
                </Tooltip>

                <Tooltip title={I18n.t('Close')}>
                    <IconButton
                        size="small"
                        onClick={onClose}
                    >
                        <Close sx={{ fontSize: 18 }} />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Error display */}
            {(error || modelsError) && (
                <Alert
                    severity="error"
                    sx={{ m: 1, py: 0 }}
                    action={
                        modelsError ? (
                            <IconButton
                                size="small"
                                onClick={retryLoadModels}
                            >
                                <Refresh sx={{ fontSize: 16 }} />
                            </IconButton>
                        ) : undefined
                    }
                >
                    {error || modelsError}
                </Alert>
            )}

            {/* Context info */}
            {lastContextInfo && (
                <Typography
                    variant="caption"
                    sx={{
                        px: 1.5,
                        py: 0.25,
                        color: 'text.secondary',
                        fontSize: '0.7rem',
                        bgcolor: 'action.hover',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        flexShrink: 0,
                    }}
                >
                    {lastContextInfo}
                </Typography>
            )}

            {/* Messages */}
            <Box
                sx={{
                    flex: 1,
                    overflow: 'auto',
                    py: 1,
                }}
            >
                {messages.length === 0 && !isLoading && (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            color: 'text.secondary',
                            px: 3,
                            textAlign: 'center',
                        }}
                    >
                        <Typography
                            variant="body2"
                            sx={{ mb: 1 }}
                        >
                            {I18n.t('Ask questions about your script, request changes, or generate new code.')}
                        </Typography>
                        <Typography
                            variant="caption"
                            color="text.disabled"
                        >
                            Enter {I18n.t('to send')}, Shift+Enter {I18n.t('for new line')}
                        </Typography>
                    </Box>
                )}

                {messages
                    .filter(m => m.role !== 'system')
                    .map(msg => (
                        <AiChatMessage
                            key={msg.id}
                            message={msg}
                            themeType={themeType}
                            currentLanguage={currentLanguage}
                            onInsertCode={handleInsertCode}
                            onShowDiff={handleShowDiff}
                            onApplyCode={handleApplyCode}
                        />
                    ))}

                {isLoading && messages[messages.length - 1]?.content === '' && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1 }}>
                        <CircularProgress size={16} />
                        <Typography
                            variant="caption"
                            color="text.secondary"
                        >
                            {I18n.t('Thinking...')}
                        </Typography>
                    </Box>
                )}

                <div ref={messagesEndRef} />
            </Box>

            {/* Input */}
            <AiChatInput
                onSend={sendMessage}
                disabled={isLoading || availableModels.length === 0}
                themeType={themeType}
                hasSelection={!!selectedCode}
                selectionText={selectedCode}
                allScripts={allScripts}
                model={model}
                availableModels={availableModels}
                modelProviderMap={modelProviderMap}
                modelsLoading={modelsLoading}
                onModelChange={setModel}
                mode={mode}
                onModeChange={setMode}
                currentLanguage={currentLanguage}
            />
        </Box>
    );
};

export default AiChatPanel;
