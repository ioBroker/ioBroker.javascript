import React, { useCallback, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import OpenAI from 'openai';

import {
    Button, CircularProgress, Dialog,
    DialogActions, DialogContent, DialogTitle,
    IconButton, TextField, MenuItem, Select,
    FormControl, InputLabel,
} from '@mui/material';

import {
    Check, Close,
    QuestionMark as Question,
    FileCopy as Copy,
} from '@mui/icons-material';

import { Utils, I18n } from '@iobroker/adapter-react-v5';

import { detectDevices, systemPrompt } from './OpenAiPrompt';
import ScriptEditorComponent from '../Components/ScriptEditorVanilaMonaco';

const LANGUAGES = {
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

const ChatIcon = () => <svg width="24" height="24" viewBox="0 0 2406 2406">
    <path
        d="M1 578.4C1 259.5 259.5 1 578.4 1h1249.1c319 0 577.5 258.5 577.5 577.4V2406H578.4C259.5 2406 1 2147.5 1 1828.6V578.4z"
        fill="#74aa9c"
    />
    <path
        d="M1107.3 299.1c-198 0-373.9 127.3-435.2 315.3C544.8 640.6 434.9 720.2 370.5 833c-99.3 171.4-76.6 386.9 56.4 533.8-41.1 123.1-27 257.7 38.6 369.2 98.7 172 297.3 260.2 491.6 219.2 86.1 97 209.8 152.3 339.6 151.8 198 0 373.9-127.3 435.3-315.3 127.5-26.3 237.2-105.9 301-218.5 99.9-171.4 77.2-386.9-55.8-533.9v-.6c41.1-123.1 27-257.8-38.6-369.8-98.7-171.4-297.3-259.6-491-218.6-86.6-96.8-210.5-151.8-340.3-151.2zm0 117.5-.6.6c79.7 0 156.3 27.5 217.6 78.4-2.5 1.2-7.4 4.3-11 6.1L952.8 709.3c-18.4 10.4-29.4 30-29.4 51.4V1248l-155.1-89.4V755.8c-.1-187.1 151.6-338.9 339-339.2zm434.2 141.9c121.6-.2 234 64.5 294.7 169.8 39.2 68.6 53.9 148.8 40.4 226.5-2.5-1.8-7.3-4.3-10.4-6.1l-360.4-208.2c-18.4-10.4-41-10.4-59.4 0L1024 984.2V805.4L1372.7 604c51.3-29.7 109.5-45.4 168.8-45.5zM650 743.5v427.9c0 21.4 11 40.4 29.4 51.4l421.7 243-155.7 90L597.2 1355c-162-93.8-217.4-300.9-123.8-462.8C513.1 823.6 575.5 771 650 743.5zm807.9 106 348.8 200.8c162.5 93.7 217.6 300.6 123.8 462.8l.6.6c-39.8 68.6-102.4 121.2-176.5 148.2v-428c0-21.4-11-41-29.4-51.4l-422.3-243.7 155-89.3zM1201.7 997l177.8 102.8v205.1l-177.8 102.8-177.8-102.8v-205.1L1201.7 997zm279.5 161.6 155.1 89.4v402.2c0 187.3-152 339.2-339 339.2v-.6c-79.1 0-156.3-27.6-217-78.4 2.5-1.2 8-4.3 11-6.1l360.4-207.5c18.4-10.4 30-30 29.4-51.4l.1-486.8zM1380 1421.9v178.8l-348.8 200.8c-162.5 93.1-369.6 38-463.4-123.7h.6c-39.8-68-54-148.8-40.5-226.5 2.5 1.8 7.4 4.3 10.4 6.1l360.4 208.2c18.4 10.4 41 10.4 59.4 0l421.9-243.7z"
        fill="white"
    />
</svg>;

const styles = {
    toolbarButtons: {
        padding: 4,
        marginLeft: 4,
    },
    fullHeightDialog: {
        height: 'calc(100% - 100px)',
    },
};

const OpenAiDialog = props => {
    const [question, setQuestion] = useState(window.localStorage.getItem('openai-question') || '');
    const [answer, setAnswer] = useState('');
    const [open, setOpen] = useState(false);
    const [working, setWorking] = useState(false);
    const [error, setError] = useState(false);
    const [model, setModel] = useState(window.localStorage.getItem('openai-model') || 'gpt-4o');
    const [showKeyWarning, setShowKeyWarning] = useState(false);
    const devicesCache = useRef(null);
    const gptKeyCache = useRef(null);
    const docsCache = useRef(null);

    const ask = useCallback(async () => {
        let devices;
        if (!devicesCache.current) {
            devices = await detectDevices(props.socket);
            devicesCache.current = devices;
            console.log(`devices: ${JSON.stringify(devices, 2, null)}`);
        } else {
            devices = devicesCache.current;
        }
        let apiKey;
        if (!gptKeyCache.current) {
            const ids = Object.keys(props.runningInstances);
            for (let i = 0; i < ids.length; i++) {
                const config = await props.socket.getObject(ids[i]);
                apiKey = (config.native.gptKey || '').trim();
                if (apiKey) {
                    break;
                }
            }
            gptKeyCache.current = apiKey;
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
                        content: `Here is list of devices:\n\n${JSON.stringify(devices, null, 2)}`
                    },
                    {
                        role: 'user',
                        content: `Write JavaScript code that does:\n\n${question}
Return only code.
Write comments in ${LANGUAGES[I18n.getLanguage()] || 'English'}.
You can call async function directly in the code without encapsulate them in async function as this code will be already executed in async function.
Do not import any libraries as all functions are already imported.`,
                    }],
            });
            const message = chatCompletionPhase1.choices[0].message;
            const m = message.content.match(/```(javascript|js|typescript)\n?(.*)```(.*)/ms);
            let code;
            if (!m) {
                code = message.content;
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
                    // skip empty lines on start and end
                    while (comments[0] === '') {
                        comments.shift();
                    }
                    code = `${comments.map(line => `// ${line}`).join('\n')}\n${code}`;
                }
            }
            console.log(message);
            setAnswer(code);
        } catch (err) {
            console.log(JSON.stringify(err));
            if (err.error) {
                setError(err.error.message);
            }
            console.error(`Cannot request: ${err}, ${JSON.stringify(err.error || err, null, 2)}`);
        }

        setWorking(false);
    }, [question, model]);

    return <>
        <IconButton
            key="ai"
            aria-label="AI"
            title={I18n.t('AI code generator')}
            style={styles.toolbarButtons}
            size="medium"
            onClick={() => setOpen(true)}
        >
            <ChatIcon />
        </IconButton>
        {showKeyWarning && <Dialog
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

                        window.open(`../../#tab-instances/config/${ids[0] || 'system.adapter.javascript.0'}`, '_blank');
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
        </Dialog>}
        {open && <Dialog
            maxWidth="lg"
            sx={{ '& .MuiDialog-paper': styles.fullHeightDialog }}
            open={!0}
            onClose={() => setOpen(false)}
            fullWidth
        >
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
                                ask();
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
                        startIcon={<Question/>}
                        onClick={async () => ask()}
                    >
                        {working ? <CircularProgress size={24} /> : I18n.t('Ask')}
                    </Button>
                    <FormControl style={{ width: 150, marginLeft: 20 }} variant="standard">
                        <InputLabel>{I18n.t('Model')}</InputLabel>
                        <Select
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
                <div>
                    {I18n.t('Result')}
                </div>
                <div style={{ height: 'calc(100% - 155px)' }}>
                    {error ?
                        <div style={{ color: props.themeType === 'dark' ? '#984242' : '#bb0000' }}>{error}</div>
                        :
                        <ScriptEditorComponent
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
                            language={props.language}
                        />}
                </div>
            </DialogContent>
            <DialogActions>
                <Button
                    color="grey"
                    variant="outlined"
                    disabled={!answer}
                    startIcon={<Copy/>}
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
                        setOpen(false);
                    }}
                >
                    {I18n.t('Use generated code')}
                </Button>
                <Button
                    color="grey"
                    variant="contained"
                    startIcon={<Close />}
                    onClick={() => setOpen(false)}
                >
                    {I18n.t('Close')}
                </Button>
            </DialogActions>
        </Dialog>}
    </>;
};

OpenAiDialog.propTypes = {
    adapterName: PropTypes.string.isRequired,
    socket: PropTypes.object,
    runningInstances: PropTypes.object,
    themeType: PropTypes.string,
    language: PropTypes.string,
    onAddCode: PropTypes.func.isRequired,
};

export default OpenAiDialog;
