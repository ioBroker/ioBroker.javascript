import React, { useCallback, useRef, useState } from 'react';
import OpenAI from 'openai';

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

import { Check, Close, QuestionMark as Question, FileCopy as Copy } from '@mui/icons-material';

import { Utils, I18n, type AdminConnection, type ThemeType } from '@iobroker/adapter-react-v5';

import { detectDevices, type DeviceObject, systemPrompt } from './OpenAiPrompt';
import ScriptEditorComponent from '../Components/ScriptEditorVanillaMonaco';
import type { APIError } from 'openai/error';

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

const OpenAiDialog = (props: OpenAiDialogProps): React.JSX.Element => {
    const [question, setQuestion] = useState(window.localStorage.getItem('openai-question') || '');
    const [answer, setAnswer] = useState('');
    const [working, setWorking] = useState(false);
    const [error, setError] = useState(false);
    const [model, setModel] = useState(window.localStorage.getItem('openai-model') || 'gpt-4o');
    const [showKeyWarning, setShowKeyWarning] = useState(false);
    const devicesCache = useRef<null | DeviceObject[]>(null);
    const gptKeyCache = useRef<string | null>(null);
    const docsCache = useRef<string | null>(null);

    const ask = useCallback(async (): Promise<void> => {
        let devices: DeviceObject[];
        if (!devicesCache.current) {
            devices = await detectDevices(props.socket);
            devicesCache.current = devices;
            console.log(`devices: ${JSON.stringify(devices, null, 2)}`);
        } else {
            devices = devicesCache.current;
        }
        let apiKey: string | undefined;
        if (!gptKeyCache.current) {
            const ids = Object.keys(props.runningInstances);
            for (let i = 0; i < ids.length; i++) {
                const config: ioBroker.Object | null | undefined = await props.socket.getObject(ids[i]);
                apiKey = (config?.native.gptKey || '').trim();
                if (apiKey) {
                    break;
                }
            }
            gptKeyCache.current = apiKey || null;
        } else {
            apiKey = gptKeyCache.current;
        }

        let docs;
        if (!docsCache.current) {
            docs = await systemPrompt();
            docsCache.current = docs;
        } else {
            docs = docsCache.current;
        }
        if (!apiKey) {
            setShowKeyWarning(true);
            return;
        }

        setWorking(true);
        setError(false);

        try {
            const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

            const chatCompletionPhase1 = await openai.chat.completions.create({
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
            });
            const message = chatCompletionPhase1.choices[0].message;
            const m = message.content?.match(/```(javascript|js|typescript)\n?(.*)```(.*)/ms);
            let code;
            if (!m) {
                code = message.content;
                if (code?.startsWith('`')) {
                    code = code.substring(1);
                }
                if (code?.endsWith('`')) {
                    code = code.substring(0, code.length - 1);
                }
            } else {
                code = m[2];
                if (m[3]) {
                    const comments = m[3].split('\n').map(line => line.trim());
                    // skip empty lines on start and end
                    while (comments[0] === '') {
                        comments.shift();
                    }
                    code = `${comments.map(line => `// ${line}`).join('\n')}\n${code}`;
                }
            }
            console.log(message);
            setAnswer(code || '');
        } catch (err: unknown) {
            console.log(JSON.stringify(err));
            if ((err as APIError).error) {
                setError(((err as APIError).error as any).message);
            }
            console.error(`Cannot request: ${err}, ${JSON.stringify((err as APIError).error || err, null, 2)}`);
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
                        disabled={working || !question}
                        startIcon={<Question />}
                        onClick={async () => ask()}
                    >
                        {working ? <CircularProgress size={24} /> : I18n.t('Ask')}
                    </Button>
                    <FormControl
                        style={{ width: 150, marginLeft: 20 }}
                        variant="standard"
                    >
                        <InputLabel>{I18n.t('Model')}</InputLabel>
                        <Select
                            variant="standard"
                            value={model}
                            onChange={e => {
                                window.localStorage.setItem('openai-model', e.target.value);
                                error && setError(false);
                                setModel(e.target.value);
                            }}
                        >
                            <MenuItem value="gpt-4o">GPT-4o</MenuItem>
                            <MenuItem value="gpt-4-turbo">GPT-4 Turbo</MenuItem>
                            <MenuItem value="gpt-4-32k">GPT-4 32k</MenuItem>
                            <MenuItem value="gpt-4">GPT-4</MenuItem>
                            <MenuItem value="gpt-3.5-turbo-16k">GPT-3.5 Turbo</MenuItem>
                        </Select>
                    </FormControl>
                </div>
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
                    disabled={!answer || error}
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
