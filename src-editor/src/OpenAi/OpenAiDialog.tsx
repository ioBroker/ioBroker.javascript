import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
} from '@mui/material';

import { Check, Close, QuestionMark as Question, FileCopy as Copy, Refresh } from '@mui/icons-material';

import { Utils, I18n, type AdminConnection, type ThemeType } from '@iobroker/adapter-react-v5';

import { detectDevices, type DeviceObject, systemPrompt } from './OpenAiPrompt';
import ScriptEditorComponent from '../Components/ScriptEditorVanillaMonaco';

const LANGUAGES: Record<ioBroker.Languages, string> = {
    ru: 'Russian',
    en: 'English',
    de: 'German',
    es: 'Spanish',
    fr: 'French',
    it: 'Italian',
    pl: 'Polish',
    nl: 'Dutch',
    pt: 'Portuguese',
    uk: 'Ukrainian',
    'zh-cn': 'Chinese',
};

const ICON_STYLE: React.CSSProperties = { flexShrink: 0, opacity: 0.7 };

// Provider logos (source: simple-icons, CC0 license)
const PROVIDER_ICONS: Record<string, React.JSX.Element> = {
    // OpenAI hexagonal knot
    openai: (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={ICON_STYLE}
        >
            <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
        </svg>
    ),
    // Anthropic "A" mark
    anthropic: (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={ICON_STYLE}
        >
            <path d="M17.304 3.54h-3.604L7.128 20.46h3.604l1.345-3.462h6.932l1.345 3.462H24L17.304 3.54zm-3.45 10.696 2.647-6.812 2.647 6.812h-5.295zM6.696 3.54H3.092L0 20.46h3.604L6.696 3.54z" />
        </svg>
    ),
    // Google Gemini 4-pointed star
    gemini: (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={ICON_STYLE}
        >
            <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0z" />
        </svg>
    ),
    // DeepSeek "D" mark
    deepseek: (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={ICON_STYLE}
        >
            <path d="M5 3h6a9 9 0 0 1 0 18H5V3zm4 14V7h2a5 5 0 0 1 0 10H9z" />
        </svg>
    ),
};

interface OpenAiDialogProps {
    adapterName: string;
    socket: AdminConnection;
    runningInstances: Record<string, any>;
    themeType: ThemeType;
    language: 'javascript' | 'typescript';
    onAddCode: (answer: string) => void;
    onClose: () => void;
}

interface ApiConfig {
    gptKey: string;
    claudeKey: string;
    geminiKey: string;
    deepseekKey: string;
    gptBaseUrl?: string;
}

async function getApiConfig(socket: AdminConnection, runningInstances: Record<string, any>): Promise<ApiConfig | null> {
    const ids = Object.keys(runningInstances);
    for (let i = 0; i < ids.length; i++) {
        const config: ioBroker.Object | null | undefined = await socket.getObject(ids[i]);
        const gptKey = (config?.native.gptKey || '').trim();
        const claudeKey = (config?.native.claudeKey || '').trim();
        const geminiKey = (config?.native.geminiKey || '').trim();
        const deepseekKey = (config?.native.deepseekKey || '').trim();
        const gptBaseUrl = (config?.native.gptBaseUrl || '').trim() || undefined;
        // At least one key or custom base URL must be configured
        if (gptKey || claudeKey || geminiKey || deepseekKey || gptBaseUrl) {
            return { gptKey, claudeKey, geminiKey, deepseekKey, gptBaseUrl };
        }
    }
    return null;
}

const OpenAiDialog = (props: OpenAiDialogProps): React.JSX.Element => {
    const [question, setQuestion] = useState(window.localStorage.getItem('openai-question') || '');
    const [answer, setAnswer] = useState('');
    const [working, setWorking] = useState(false);
    const [error, setError] = useState<string | false>(false);
    const [model, setModel] = useState(window.localStorage.getItem('openai-model') || '');
    const [showKeyWarning, setShowKeyWarning] = useState(false);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [modelsLoading, setModelsLoading] = useState(true);
    const [modelsError, setModelsError] = useState<string | null>(null);
    const devicesCache = useRef<null | DeviceObject[]>(null);
    const apiConfigCache = useRef<ApiConfig | null>(null);
    const modelProviderMap = useRef<Record<string, string>>({});
    const docsCache = useRef<string | null>(null);

    const loadModels = useCallback(
        async (cancelled?: { current: boolean }): Promise<void> => {
            setModelsLoading(true);
            setModelsError(null);
            try {
                const config = await getApiConfig(props.socket, props.runningInstances);
                if (cancelled?.current) {
                    return;
                }
                if (!config) {
                    setModelsLoading(false);
                    return;
                }
                apiConfigCache.current = config;

                const instanceId = Object.keys(props.runningInstances)[0];
                if (!instanceId) {
                    setModelsError(I18n.t('No running javascript instance found'));
                    setModelsLoading(false);
                    return;
                }

                const allModels: string[] = [];
                const providerMap: Record<string, string> = {};
                const errors: string[] = [];

                // Fetch models from all configured providers in parallel
                const queries: Promise<void>[] = [];

                const addModels = (models: string[], provider: string): void => {
                    for (const m of models) {
                        // Filter out non-chat models (image, audio, embedding, legacy)
                        const lower = m.toLowerCase();
                        if (
                            lower.includes('embedding') ||
                            lower.includes('moderation') ||
                            lower.startsWith('dall-e') ||
                            lower.startsWith('tts-') ||
                            lower.startsWith('whisper') ||
                            lower.startsWith('babbage') ||
                            lower.startsWith('davinci') ||
                            lower.startsWith('sora') ||
                            lower.startsWith('omni-moderation')
                        ) {
                            continue;
                        }
                        // Prevent collision: first provider to register a model name wins
                        if (!providerMap[m]) {
                            allModels.push(m);
                            providerMap[m] = provider;
                        }
                    }
                };

                if (config.gptKey || config.gptBaseUrl) {
                    queries.push(
                        props.socket
                            .sendTo(instanceId, 'testApiConnection', {
                                apiKey: config.gptKey,
                                baseUrl: config.gptBaseUrl || '',
                                provider: 'openai',
                            })
                            .then((result: { models?: string[]; error?: string }) => {
                                if (result.models) {
                                    addModels(result.models, 'openai');
                                } else if (result.error) {
                                    errors.push(`OpenAI: ${result.error}`);
                                }
                            })
                            .catch((err: unknown) => {
                                errors.push(`OpenAI: ${String(err)}`);
                            }),
                    );
                }

                if (config.claudeKey) {
                    queries.push(
                        props.socket
                            .sendTo(instanceId, 'testApiConnection', {
                                apiKey: config.claudeKey,
                                provider: 'anthropic',
                            })
                            .then((result: { models?: string[]; error?: string }) => {
                                if (result.models) {
                                    addModels(result.models, 'anthropic');
                                } else if (result.error) {
                                    errors.push(`Anthropic: ${result.error}`);
                                }
                            })
                            .catch((err: unknown) => {
                                errors.push(`Anthropic: ${String(err)}`);
                            }),
                    );
                }

                if (config.geminiKey) {
                    queries.push(
                        props.socket
                            .sendTo(instanceId, 'testApiConnection', {
                                apiKey: config.geminiKey,
                                provider: 'gemini',
                            })
                            .then((result: { models?: string[]; error?: string }) => {
                                if (result.models) {
                                    addModels(result.models, 'gemini');
                                } else if (result.error) {
                                    errors.push(`Gemini: ${result.error}`);
                                }
                            })
                            .catch((err: unknown) => {
                                errors.push(`Gemini: ${String(err)}`);
                            }),
                    );
                }

                if (config.deepseekKey) {
                    queries.push(
                        props.socket
                            .sendTo(instanceId, 'testApiConnection', {
                                apiKey: config.deepseekKey,
                                provider: 'deepseek',
                            })
                            .then((result: { models?: string[]; error?: string }) => {
                                if (result.models) {
                                    addModels(result.models, 'deepseek');
                                } else if (result.error) {
                                    errors.push(`DeepSeek: ${result.error}`);
                                }
                            })
                            .catch((err: unknown) => {
                                errors.push(`DeepSeek: ${String(err)}`);
                            }),
                    );
                }

                await Promise.all(queries);

                if (cancelled?.current) {
                    return;
                }

                modelProviderMap.current = providerMap;

                if (allModels.length > 0) {
                    allModels.sort();
                    setAvailableModels(allModels);

                    // Auto-select: saved model > first available
                    const saved = window.localStorage.getItem('openai-model');
                    if (saved && allModels.includes(saved)) {
                        setModel(saved);
                    } else {
                        setModel(allModels[0]);
                    }
                }

                if (errors.length > 0) {
                    setModelsError(errors.join('; '));
                }
            } catch (err: unknown) {
                console.error('Failed to fetch models:', err);
                if (!cancelled?.current) {
                    setModelsError(I18n.t('Request failed: %s', String(err)));
                }
            }
            if (!cancelled?.current) {
                setModelsLoading(false);
            }
        },
        [props.socket, props.runningInstances],
    );

    // Fetch API config and available models on mount
    useEffect(() => {
        const cancelled = { current: false };
        void loadModels(cancelled);
        return () => {
            cancelled.current = true;
        };
    }, [loadModels]);

    const ask = useCallback(async (): Promise<void> => {
        let devices: DeviceObject[];
        if (!devicesCache.current) {
            devices = await detectDevices(props.socket);
            devicesCache.current = devices;
            console.log(`devices: ${JSON.stringify(devices, null, 2)}`);
        } else {
            devices = devicesCache.current;
        }

        let config = apiConfigCache.current;
        if (!config) {
            config = await getApiConfig(props.socket, props.runningInstances);
            apiConfigCache.current = config;
        }

        let docs;
        if (!docsCache.current) {
            docs = await systemPrompt();
            docsCache.current = docs;
        } else {
            docs = docsCache.current;
        }
        if (!config) {
            setShowKeyWarning(true);
            return;
        }

        const provider = modelProviderMap.current[model];
        if (!provider) {
            setError(I18n.t('Please select a valid model'));
            return;
        }
        let apiKey: string;
        let baseUrl: string;
        if (provider === 'anthropic') {
            apiKey = config.claudeKey;
            baseUrl = '';
        } else if (provider === 'gemini') {
            apiKey = config.geminiKey;
            baseUrl = '';
        } else if (provider === 'deepseek') {
            apiKey = config.deepseekKey;
            baseUrl = '';
        } else {
            apiKey = config.gptKey;
            baseUrl = config.gptBaseUrl || '';
        }

        const instanceId = Object.keys(props.runningInstances)[0];
        if (!instanceId) {
            setError(I18n.t('No running javascript instance found'));
            return;
        }

        setWorking(true);
        setError(false);

        try {
            const result: { success?: boolean; content?: string; error?: string } = await props.socket.sendTo(
                instanceId,
                'chatCompletion',
                {
                    apiKey,
                    baseUrl,
                    model,
                    provider,
                    messages: [
                        {
                            role: 'system',
                            content: `You are programmer. Here is a documentation:\n\n${docs}`,
                        },
                        {
                            role: 'system',
                            content: `Here is list of devices:\n\n${JSON.stringify(devices, null, 2)}`,
                        },
                        {
                            role: 'user',
                            content: `Write JavaScript code that does:\n\n${question}
Return only code.
Write comments in ${LANGUAGES[I18n.getLanguage()] || 'English'}.
You can call async function directly in the code without encapsulate them in async function as this code will be already executed in async function.
Do not import any libraries as all functions are already imported.`,
                        },
                    ],
                },
            );

            if (result.error) {
                setError(result.error);
            } else {
                let content = result.content || '';

                // Strip LLM thinking artifacts (<think>...</think>, <|endoftext|>, <|im_start|>, etc.)
                content = content.replace(/<think>[\s\S]*?<\/think>/gi, '');
                content = content.replace(/<\|endoftext\|>/g, '');
                content = content.replace(/<\|im_start\|>[\s\S]*?<\|im_end\|>/g, '');
                content = content.replace(/<\|im_start\|>[\s\S]*/g, '');

                // Try to extract code from markdown fences
                const m = content.match(/```(?:javascript|js|typescript)?\n?([\s\S]*?)```/m);
                let code;
                if (m) {
                    code = m[1].trim();
                } else {
                    // No fences found — try to extract code lines
                    // Remove lines that look like LLM commentary (not code)
                    const lines = content.split('\n');
                    const codeLines: string[] = [];
                    let codeStarted = false;
                    for (const line of lines) {
                        const trimmed = line.trim();
                        // Skip empty lines before code starts
                        if (!codeStarted && trimmed === '') {
                            continue;
                        }
                        // Detect start of code
                        if (
                            !codeStarted &&
                            (trimmed.startsWith('//') ||
                                trimmed.startsWith('const ') ||
                                trimmed.startsWith('let ') ||
                                trimmed.startsWith('var ') ||
                                trimmed.startsWith('function ') ||
                                trimmed.startsWith('async ') ||
                                trimmed.startsWith('await ') ||
                                trimmed.startsWith('if ') ||
                                trimmed.startsWith('for ') ||
                                trimmed.startsWith('on(') ||
                                trimmed.startsWith('schedule(') ||
                                trimmed.startsWith('setState') ||
                                trimmed.startsWith('getState') ||
                                trimmed.startsWith('createState') ||
                                trimmed.startsWith('$') ||
                                trimmed.startsWith("'use strict'") ||
                                trimmed.startsWith('"use strict"'))
                        ) {
                            codeStarted = true;
                        }
                        if (codeStarted) {
                            codeLines.push(line);
                        }
                    }
                    // Remove trailing non-code commentary
                    while (codeLines.length > 0) {
                        const last = codeLines[codeLines.length - 1].trim();
                        if (
                            last === '' ||
                            (last.length > 0 &&
                                !last.startsWith('//') &&
                                !last.startsWith('*') &&
                                !last.startsWith('}') &&
                                !last.startsWith(');') &&
                                !last.endsWith(';') &&
                                !last.endsWith('}') &&
                                !last.endsWith(')') &&
                                !last.endsWith(',') &&
                                !last.endsWith('{') &&
                                /^[A-Z]/.test(last))
                        ) {
                            codeLines.pop();
                        } else {
                            break;
                        }
                    }
                    code = codeLines.join('\n').trim();
                }
                setAnswer(code || '');
            }
        } catch (err: unknown) {
            console.error('Chat request failed:', err);
            setError(I18n.t('Request failed: %s', String(err)));
        }

        setWorking(false);
    }, [question, model, props.runningInstances, props.socket]);

    return (
        <Dialog
            maxWidth="lg"
            sx={{
                '& .MuiDialog-paper': {
                    height: 'calc(100% - 100px)',
                },
            }}
            open={!0}
            onClose={() => props.onClose()}
            fullWidth
        >
            {showKeyWarning && (
                <Dialog
                    maxWidth="lg"
                    open={!0}
                    onClose={() => setShowKeyWarning(false)}
                    fullWidth
                >
                    <DialogTitle>{I18n.t('No API key found')}</DialogTitle>
                    <DialogContent
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                        }}
                    >
                        <div>
                            {I18n.t(
                                'You have to enter at least one API key in the configuration of javascript adapter.',
                            )}
                        </div>
                        <Button
                            variant="contained"
                            onClick={() => {
                                const ids = Object.keys(props.runningInstances);

                                window.open(
                                    `../../#tab-instances/config/${ids[0] || 'system.adapter.javascript.0'}`,
                                    '_blank',
                                );
                                setShowKeyWarning(false);
                            }}
                        >
                            {I18n.t('Open configuration')}
                        </Button>
                    </DialogContent>
                    <DialogActions>
                        <Button
                            variant="contained"
                            startIcon={<Close />}
                            onClick={() => setShowKeyWarning(false)}
                        >
                            {I18n.t('Close')}
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
            <DialogTitle>{I18n.t('AI code generator')}</DialogTitle>
            <DialogContent
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    height: '100%',
                }}
            >
                <div>
                    <TextField
                        variant="standard"
                        multiline
                        autoFocus
                        disabled={working}
                        fullWidth
                        onKeyUp={e => {
                            if (e.key === 'Enter' && e.ctrlKey) {
                                void ask();
                            }
                        }}
                        label={I18n.t('Enter your question')}
                        helperText={I18n.t('Press Ctrl+Enter to get the answer')}
                        value={question}
                        onChange={e => {
                            window.localStorage.setItem('openai-question', e.target.value);
                            setQuestion(e.target.value);
                        }}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                    <Button
                        variant="contained"
                        disabled={working || !question || !model}
                        startIcon={<Question />}
                        onClick={async () => ask()}
                    >
                        {working ? <CircularProgress size={24} /> : I18n.t('Ask')}
                    </Button>
                    <FormControl
                        style={{ width: 300, marginLeft: 20 }}
                        disabled={working}
                        variant="standard"
                        error={!!modelsError}
                    >
                        <InputLabel>{I18n.t('Model')}</InputLabel>
                        <Select
                            variant="standard"
                            value={model}
                            disabled={modelsLoading || !!modelsError}
                            renderValue={value => (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                    {PROVIDER_ICONS[modelProviderMap.current[value]]}
                                    {value}
                                </span>
                            )}
                            onChange={e => {
                                window.localStorage.setItem('openai-model', e.target.value);
                                error && setError(false);
                                setModel(e.target.value);
                            }}
                        >
                            {modelsLoading && (
                                <MenuItem
                                    value=""
                                    disabled
                                >
                                    {I18n.t('Loading models...')}
                                </MenuItem>
                            )}
                            {availableModels.map(m => (
                                <MenuItem
                                    key={m}
                                    value={m}
                                >
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                        {PROVIDER_ICONS[modelProviderMap.current[m]]}
                                        {m}
                                    </span>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    {modelsError && (
                        <Button
                            style={{ marginLeft: 10 }}
                            variant="outlined"
                            color="error"
                            startIcon={<Refresh />}
                            onClick={() => void loadModels()}
                        >
                            {I18n.t('Retry')}
                        </Button>
                    )}
                </div>
                {modelsError && (
                    <div style={{ color: props.themeType === 'dark' ? '#984242' : '#bb0000' }}>{modelsError}</div>
                )}
                <div>{I18n.t('Result')}</div>
                <div style={{ height: 'calc(100% - 155px)' }}>
                    {error ? (
                        <div style={{ color: props.themeType === 'dark' ? '#984242' : '#bb0000' }}>{error}</div>
                    ) : (
                        <ScriptEditorComponent
                            triggerPrettier={1}
                            adapterName={props.adapterName}
                            runningInstances={props.runningInstances}
                            style={{
                                height: '100%',
                                width: '100%',
                                resize: 'none',
                            }}
                            name="ai"
                            socket={props.socket}
                            readOnly
                            checkJs
                            code={answer}
                            isDark={props.themeType === 'dark'}
                            language={props.language || 'javascript'}
                        />
                    )}
                </div>
            </DialogContent>
            <DialogActions>
                <Button
                    color="grey"
                    variant="outlined"
                    disabled={!answer}
                    startIcon={<Copy />}
                    onClick={() => {
                        Utils.copyToClipboard(answer);
                        window.alert(I18n.t('Copied'));
                    }}
                >
                    {I18n.t('Copy to clipboard')}
                </Button>
                <Button
                    color="primary"
                    variant="contained"
                    disabled={!answer || !!error}
                    startIcon={<Check />}
                    onClick={() => {
                        props.onAddCode(answer);
                        props.onClose();
                    }}
                >
                    {I18n.t('Use generated code')}
                </Button>
                <Button
                    color="grey"
                    variant="contained"
                    startIcon={<Close />}
                    onClick={() => props.onClose()}
                >
                    {I18n.t('Close')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default OpenAiDialog;
