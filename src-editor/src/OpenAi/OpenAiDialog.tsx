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
    apiKey: string;
    baseUrl?: string;
}

async function getApiConfig(
    socket: AdminConnection,
    runningInstances: Record<string, any>,
): Promise<ApiConfig | null> {
    const ids = Object.keys(runningInstances);
    for (let i = 0; i < ids.length; i++) {
        const config: ioBroker.Object | null | undefined = await socket.getObject(ids[i]);
        const apiKey = (config?.native.gptKey || '').trim();
        if (apiKey) {
            return {
                apiKey,
                baseUrl: (config?.native.gptBaseUrl || '').trim() || undefined,
            };
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
    const docsCache = useRef<string | null>(null);

    const loadModels = useCallback(async (cancelled?: { current: boolean }): Promise<void> => {
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

            // Fetch models server-side via sendTo to avoid CORS issues
            const instanceId = Object.keys(props.runningInstances)[0];
            if (!instanceId) {
                setModelsError(I18n.t('No running javascript instance found'));
                setModelsLoading(false);
                return;
            }

            const result: { success?: boolean; models?: string[]; error?: string } = await props.socket.sendTo(
                instanceId,
                'testApiConnection',
                { apiKey: config.apiKey, baseUrl: config.baseUrl || '' },
            );

            if (cancelled?.current) {
                return;
            }

            if (result.error) {
                setModelsError(result.error);
            } else if (result.models && result.models.length > 0) {
                setAvailableModels(result.models);

                // Auto-select: saved model > first available
                const saved = window.localStorage.getItem('openai-model');
                if (saved && result.models.includes(saved)) {
                    setModel(saved);
                } else {
                    setModel(result.models[0]);
                }
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
    }, [props.socket, props.runningInstances]);

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
                    apiKey: config.apiKey,
                    baseUrl: config.baseUrl || '',
                    model,
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
                const messageContent = result.content || '';
                const m = messageContent.match(/```(javascript|js|typescript)\n?(.*)```(.*)/ms);
                let code;
                if (!m) {
                    code = messageContent;
                    if (code.startsWith('`')) {
                        code = code.substring(1);
                    }
                    if (code.endsWith('`')) {
                        code = code.substring(0, code.length - 1);
                    }
                } else {
                    code = m[2];
                    if (m[3]) {
                        const comments = m[3].split('\n').map(line => line.trim());
                        while (comments[0] === '') {
                            comments.shift();
                        }
                        code = `${comments.map(line => `// ${line}`).join('\n')}\n${code}`;
                    }
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
                    <DialogTitle>{I18n.t('No Chat GPT Key found')}</DialogTitle>
                    <DialogContent
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                        }}
                    >
                        <div>
                            {I18n.t('You have to enter OpenAI API key in the configuration of javascript adapter.')}
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
                        variant="standard"
                        error={!!modelsError}
                    >
                        <InputLabel>{I18n.t('Model')}</InputLabel>
                        <Select
                            variant="standard"
                            value={model}
                            disabled={modelsLoading || !!modelsError}
                            onChange={e => {
                                window.localStorage.setItem('openai-model', e.target.value);
                                error && setError(false);
                                setModel(e.target.value);
                            }}
                        >
                            {modelsLoading && (
                                <MenuItem value="" disabled>
                                    {I18n.t('Loading models...')}
                                </MenuItem>
                            )}
                            {availableModels.map(m => (
                                <MenuItem key={m} value={m}>
                                    {m}
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
                    <div style={{ color: props.themeType === 'dark' ? '#984242' : '#bb0000' }}>
                        {modelsError}
                    </div>
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
