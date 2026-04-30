import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import {
    Box,
    IconButton,
    TextField,
    Chip,
    Tooltip,
    Paper,
    List,
    ListItemButton,
    ListItemText,
    Select,
    MenuItem,
    Typography,
} from '@mui/material';
import { Send, Code, AlternateEmail } from '@mui/icons-material';
import { I18n, type ThemeType } from '@iobroker/adapter-react-v5';

import type { ScriptInfo, AiProviderName, AiChatMode } from './AiChatTypes';
import { PROVIDER_ICON_FILES, ICON_STYLE } from './AiChatService';
import { parseSlashCommand, buildActionPrompt } from './aiPromptBuilder';

/** Special @-mention options (labels are resolved at render time via I18n) */
function getSpecialMentions(): { id: string; label: string; descriptionKey: string }[] {
    return [
        { id: '@all', label: I18n.t('mention @all'), descriptionKey: 'All scripts' },
        { id: '@devices', label: I18n.t('mention @devices'), descriptionKey: 'Smart home devices' },
    ];
}

function ProviderIcon({ provider, isDark }: { provider: string; isDark: boolean }): React.JSX.Element | null {
    const file = PROVIDER_ICON_FILES[provider];
    if (!file) {
        return null;
    }
    return (
        <img
            src={`./img/${provider}.svg`}
            alt={provider}
            style={{
                ...ICON_STYLE,
                ...(isDark ? { filter: 'invert(0.85)' } : {}),
            }}
            onError={e => {
                (e.target as HTMLImageElement).style.display = 'none';
            }}
        />
    );
}

function loadHistory(): string[] {
    try {
        const saved = window.localStorage.getItem('Editor.aiChatHistory');
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

interface AiChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
    themeType: ThemeType;
    hasSelection?: boolean;
    selectionText?: string;
    allScripts?: ScriptInfo[];
    model: string;
    availableModels: string[];
    modelProviderMap: Record<string, AiProviderName>;
    modelsLoading?: boolean;
    onModelChange: (model: string) => void;
    mode: AiChatMode;
    onModeChange: (mode: AiChatMode) => void;
    /** Optional: current editor language to label slash-command prompts (default: javascript). */
    currentLanguage?: string;
}

const AiChatInput: React.FC<AiChatInputProps> = ({
    onSend,
    disabled,
    themeType,
    hasSelection,
    selectionText,
    allScripts,
    model,
    availableModels,
    modelProviderMap,
    modelsLoading,
    onModelChange,
    mode,
    onModeChange,
    currentLanguage,
}) => {
    const [text, setText] = useState('');
    const [mentionOpen, setMentionOpen] = useState(false);
    const [mentionFilter, setMentionFilter] = useState('');
    const [mentionIndex, setMentionIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const mentionStartRef = useRef<number>(-1);

    // Input history (like shell/terminal) - persisted in localStorage
    const historyRef = useRef<string[]>(loadHistory());
    const historyIndexRef = useRef<number>(-1);
    const savedInputRef = useRef<string>('');

    // Build mention options from scripts
    const mentionOptions = useMemo(() => {
        const specialMentions = getSpecialMentions();
        const options: { id: string; label: string; description: string }[] = specialMentions.map(m => ({
            ...m,
            description: I18n.t(m.descriptionKey),
        }));
        if (allScripts) {
            for (const script of allScripts) {
                const shortName = script.id.replace(/^script\.js\./, '').replace(/\./g, '/');
                options.push({
                    id: `@${shortName}`,
                    label: `@${shortName}`,
                    description: `${script.name} [${script.enabled ? 'active' : 'inactive'}]`,
                });
            }
        }
        return options;
    }, [allScripts]);

    // Filter mentions based on typed text after @
    const filteredMentions = useMemo(() => {
        if (!mentionFilter) {
            return mentionOptions;
        }
        const lower = mentionFilter.toLowerCase();
        return mentionOptions.filter(
            m => m.id.toLowerCase().includes(lower) || m.description.toLowerCase().includes(lower),
        );
    }, [mentionOptions, mentionFilter]);

    useEffect(() => {
        setMentionIndex(0);
    }, [mentionFilter]);

    const handleSend = useCallback(() => {
        const trimmed = text.trim();
        if (!trimmed || disabled) {
            return;
        }
        let messageText = trimmed;

        // Slash commands like "/explain" or "/fix missing semicolon" → build an action prompt.
        const slash = parseSlashCommand(trimmed);
        if (slash) {
            const code = hasSelection && selectionText ? selectionText : '';
            const prompt = buildActionPrompt({
                action: slash.action,
                code,
                language: currentLanguage || 'javascript',
                question: slash.action === 'ask' ? slash.rest : undefined,
                diagnostic: slash.action === 'fix' ? slash.rest || undefined : undefined,
            });
            if (prompt) {
                messageText = prompt;
            }
        } else if (hasSelection && selectionText) {
            messageText = `[Selected code in editor]\n\`\`\`\n${selectionText}\n\`\`\`\n\n${trimmed}`;
        }
        // Add to history and persist
        historyRef.current.push(trimmed);
        historyIndexRef.current = -1;
        savedInputRef.current = '';
        try {
            // Keep last 50 entries
            const toSave = historyRef.current.slice(-50);
            window.localStorage.setItem('Editor.aiChatHistory', JSON.stringify(toSave));
        } catch {
            // ignore
        }

        onSend(messageText);
        setText('');
        setMentionOpen(false);
        // Re-focus input so user can keep typing
        requestAnimationFrame(() => inputRef.current?.focus());
    }, [text, disabled, onSend, hasSelection, selectionText, currentLanguage]);

    const insertMention = useCallback(
        (mentionId: string) => {
            const start = mentionStartRef.current;
            const inputEl = inputRef.current;
            if (start < 0) {
                // Triggered via @ button - append to current text
                const newText = text ? `${text}${mentionId} ` : `${mentionId} `;
                setText(newText);
                setMentionOpen(false);
                setMentionFilter('');
                setTimeout(() => {
                    if (inputEl) {
                        inputEl.focus();
                        inputEl.setSelectionRange(newText.length, newText.length);
                    }
                }, 0);
                return;
            }
            const before = text.substring(0, start);
            const cursorPos = inputEl?.selectionStart ?? text.length;
            const after = text.substring(cursorPos);
            const newText = `${before}${mentionId} ${after}`;
            setText(newText);
            setMentionOpen(false);
            setMentionFilter('');
            mentionStartRef.current = -1;
            setTimeout(() => {
                if (inputEl) {
                    const pos = before.length + mentionId.length + 1;
                    inputEl.focus();
                    inputEl.setSelectionRange(pos, pos);
                }
            }, 0);
        },
        [text],
    );

    const handleAtButtonClick = useCallback(() => {
        mentionStartRef.current = -1; // Signal that it was triggered via button
        setMentionFilter('');
        setMentionOpen(prev => !prev);
    }, []);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setText(newValue);

        const cursorPos = e.target.selectionStart ?? newValue.length;
        const textBeforeCursor = newValue.substring(0, cursorPos);
        const atMatch = textBeforeCursor.match(/@([\w/äöüÄÖÜß]*)$/);

        if (atMatch) {
            mentionStartRef.current = cursorPos - atMatch[0].length;
            setMentionFilter(atMatch[1]);
            setMentionOpen(true);
        } else {
            setMentionOpen(false);
            setMentionFilter('');
        }
    }, []);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (mentionOpen && filteredMentions.length > 0) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setMentionIndex(prev => (prev + 1) % filteredMentions.length);
                    return;
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setMentionIndex(prev => (prev - 1 + filteredMentions.length) % filteredMentions.length);
                    return;
                }
                if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    insertMention(filteredMentions[mentionIndex].id);
                    return;
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    setMentionOpen(false);
                    return;
                }
            }

            // History navigation: ArrowUp at start of input = previous message
            if (e.key === 'ArrowUp' && !mentionOpen && historyRef.current.length > 0) {
                const el = inputRef.current;
                const cursorAtStart = !el || el.selectionStart === 0;
                const isSingleLine = !text.includes('\n');
                if (cursorAtStart && isSingleLine) {
                    e.preventDefault();
                    if (historyIndexRef.current === -1) {
                        // Save current input before navigating
                        savedInputRef.current = text;
                        historyIndexRef.current = historyRef.current.length - 1;
                    } else if (historyIndexRef.current > 0) {
                        historyIndexRef.current--;
                    }
                    setText(historyRef.current[historyIndexRef.current]);
                    return;
                }
            }

            // History navigation: ArrowDown = next message or back to current input
            if (e.key === 'ArrowDown' && !mentionOpen && historyIndexRef.current >= 0) {
                const el = inputRef.current;
                const cursorAtEnd = !el || el.selectionStart === text.length;
                const isSingleLine = !text.includes('\n');
                if (cursorAtEnd && isSingleLine) {
                    e.preventDefault();
                    if (historyIndexRef.current < historyRef.current.length - 1) {
                        historyIndexRef.current++;
                        setText(historyRef.current[historyIndexRef.current]);
                    } else {
                        // Back to saved input
                        historyIndexRef.current = -1;
                        setText(savedInputRef.current);
                    }
                    return;
                }
            }

            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        },
        [handleSend, mentionOpen, filteredMentions, mentionIndex, insertMention, text],
    );

    return (
        <Box
            sx={{
                borderTop: '1px solid',
                borderColor: 'divider',
                position: 'relative',
            }}
        >
            {/* @-mention autocomplete dropdown */}
            {mentionOpen && filteredMentions.length > 0 && (
                <Paper
                    elevation={4}
                    sx={{
                        position: 'absolute',
                        bottom: '100%',
                        left: 8,
                        right: 8,
                        maxHeight: 200,
                        overflow: 'auto',
                        zIndex: 10,
                        mb: 0.5,
                    }}
                >
                    <List
                        dense
                        disablePadding
                    >
                        {filteredMentions.slice(0, 15).map((option, index) => (
                            <ListItemButton
                                key={option.id}
                                selected={index === mentionIndex}
                                onClick={() => insertMention(option.id)}
                                sx={{ py: 0.25, minHeight: 32 }}
                            >
                                <ListItemText
                                    primary={option.label}
                                    secondary={option.description}
                                    primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 500 }}
                                    secondaryTypographyProps={{ fontSize: '0.7rem' }}
                                />
                            </ListItemButton>
                        ))}
                    </List>
                </Paper>
            )}

            {mode === 'code' && (
                <Chip
                    label={`${I18n.t('mention @devices')} — ${I18n.t('Smart home devices')}`}
                    size="small"
                    variant="outlined"
                    sx={{ mx: 1, mt: 0.5, maxWidth: 'calc(100% - 16px)' }}
                />
            )}

            {hasSelection && selectionText && (
                <Chip
                    icon={<Code sx={{ fontSize: 14 }} />}
                    label={I18n.t('Selected code as context')}
                    size="small"
                    variant="outlined"
                    sx={{ mx: 1, mt: 0.5, maxWidth: 'calc(100% - 16px)' }}
                />
            )}

            {/* Combined input box: text field + toolbar underneath, in one bordered container */}
            <Box
                sx={{
                    mx: 1,
                    mt: 0.5,
                    mb: 0.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    '&:focus-within': {
                        borderColor: 'primary.main',
                    },
                }}
            >
                {/* Text input area */}
                <TextField
                    inputRef={inputRef}
                    fullWidth
                    multiline
                    maxRows={6}
                    placeholder={I18n.t('Ask about your script...')}
                    value={text}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    onBlur={() => {
                        setTimeout(() => setMentionOpen(false), 200);
                    }}
                    variant="standard"
                    slotProps={{ input: { disableUnderline: true } }}
                    sx={{
                        px: 1.5,
                        pt: 1,
                        pb: 0.5,
                        '& .MuiInputBase-root': {
                            fontSize: '0.875rem',
                        },
                    }}
                />

                {/* Bottom toolbar inside the input box */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        px: 1,
                        pb: 0.5,
                    }}
                >
                    {/* Mode selector */}
                    <Tooltip
                        title={
                            <Box sx={{ fontSize: '0.8rem', lineHeight: 1.5, maxWidth: 360 }}>
                                <Box sx={{ fontWeight: 600, mb: 0.75 }}>{I18n.t('AI chat mode')}</Box>
                                <Box sx={{ mb: 0.75 }}>
                                    <strong>💬 {I18n.t('Chat')}</strong> —{' '}
                                    {I18n.t(
                                        'Plain conversation. Use for questions, explanations, syntax help. Does not read or modify your scripts.',
                                    )}
                                </Box>
                                <Box sx={{ mb: 0.75 }}>
                                    <strong>🤖 {I18n.t('Agent')}</strong> —{' '}
                                    {I18n.t(
                                        'AI can call tools to inspect your system: read scripts, look up datapoints, browse the object tree. Use for "which scripts use this state?", "analyze my light script".',
                                    )}
                                </Box>
                                <Box>
                                    <strong>💻 {I18n.t('Code')}</strong> —{' '}
                                    {I18n.t(
                                        'Two-step script generator (plan then code). Use for "create a script that...", "write a Blockly rule for...". Output goes into the editor for smart-apply.',
                                    )}
                                </Box>
                            </Box>
                        }
                        enterDelay={400}
                        placement="top"
                    >
                        <Select
                            value={mode}
                            onChange={e => onModeChange(e.target.value as AiChatMode)}
                            size="small"
                            variant="standard"
                            disableUnderline
                            sx={{
                                fontSize: '0.7rem',
                                color: 'text.secondary',
                                border: '1px solid',
                                borderColor: 'text.secondary',
                                borderRadius: 3,
                                bgcolor: 'action.hover',
                                px: 0.75,
                                '&:hover': {
                                    borderColor: 'text.disabled',
                                    bgcolor: 'action.hover',
                                },
                                '& .MuiSelect-select': {
                                    py: '2px',
                                    pr: '18px !important',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                },
                            }}
                        >
                            <MenuItem
                                value="chat"
                                sx={{ fontSize: '0.75rem' }}
                                title={I18n.t(
                                    'Plain conversation. Best for: general questions, syntax help, concept explanations.',
                                )}
                            >
                                💬 Chat
                            </MenuItem>
                            <MenuItem
                                value="agent"
                                sx={{ fontSize: '0.75rem' }}
                                title={I18n.t(
                                    'Tool-using assistant. Best for: analyzing existing scripts, finding datapoint usages, inspecting the object tree.',
                                )}
                            >
                                🤖 Agent
                            </MenuItem>
                            <MenuItem
                                value="code"
                                sx={{ fontSize: '0.75rem' }}
                                title={I18n.t(
                                    'Script generator. Best for: creating new JavaScript/TypeScript or Blockly scripts from a description.',
                                )}
                            >
                                💻 Code
                            </MenuItem>
                        </Select>
                    </Tooltip>

                    {/* Model selector */}
                    <Select
                        value={model}
                        onChange={e => onModelChange(e.target.value)}
                        size="small"
                        disabled={modelsLoading || availableModels.length === 0}
                        variant="standard"
                        disableUnderline
                        sx={{
                            fontSize: '0.7rem',
                            color: 'text.secondary',
                            border: '1px solid',
                            borderColor: 'text.secondary',
                            borderRadius: 3,
                            bgcolor: 'action.hover',
                            px: 0.75,
                            '&:hover': {
                                borderColor: 'text.disabled',
                                bgcolor: 'action.hover',
                            },
                            '& .MuiSelect-select': {
                                py: '2px',
                                pr: '18px !important',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                            },
                        }}
                    >
                        {availableModels.map(m => (
                            <MenuItem
                                key={m}
                                value={m}
                                sx={{ fontSize: '0.75rem', display: 'flex', gap: 0.5 }}
                            >
                                <ProviderIcon
                                    provider={modelProviderMap[m]}
                                    isDark={themeType === 'dark'}
                                />
                                {m}
                            </MenuItem>
                        ))}
                    </Select>

                    {/* @ context button */}
                    <Tooltip
                        title={I18n.t(
                            'Mention scripts as context for the AI. Use @all for all scripts or @scriptName for a specific one.',
                        )}
                        enterDelay={500}
                    >
                        <IconButton
                            size="small"
                            onClick={handleAtButtonClick}
                            sx={{
                                p: '3px',
                                color: mentionOpen ? 'primary.main' : 'text.secondary',
                                border: '1px solid',
                                borderColor: mentionOpen ? 'primary.main' : 'text.secondary',
                                bgcolor: mentionOpen ? undefined : 'action.hover',
                                borderRadius: 3,
                                '&:hover': {
                                    borderColor: 'text.disabled',
                                    bgcolor: 'action.hover',
                                },
                            }}
                        >
                            <AlternateEmail sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>

                    {/* Spacer */}
                    <Box sx={{ flex: 1 }} />

                    {/* Send hint + button */}
                    <Typography
                        variant="caption"
                        sx={{ color: 'text.disabled', fontSize: '0.65rem', mr: 0.5, whiteSpace: 'nowrap' }}
                    >
                        Enter {I18n.t('to send')}
                    </Typography>
                    <Tooltip title={`${I18n.t('Send')} (Enter)`}>
                        <span>
                            <IconButton
                                color="primary"
                                onClick={handleSend}
                                disabled={disabled || !text.trim()}
                                size="small"
                                sx={{ p: 0.25 }}
                            >
                                <Send sx={{ fontSize: 18 }} />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            </Box>
        </Box>
    );
};

export default AiChatInput;
