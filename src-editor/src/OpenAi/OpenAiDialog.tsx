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

import { detectDevices, type DeviceObject, systemPromptFull } from './OpenAiPrompt';
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

const ICON_STYLE: React.CSSProperties = { width: 16, height: 16, flexShrink: 0, opacity: 0.7 };

// Map provider names to icon files downloaded by the adapter at startup
const PROVIDER_ICON_FILES: Record<string, string> = {
    openai: 'img/openai.svg',
    anthropic: 'img/anthropic.svg',
    gemini: 'img/gemini.svg',
    deepseek: 'img/deepseek.svg',
    custom: 'img/custom.svg',
};

function ProviderIcon({ provider }: { provider: string }): React.JSX.Element | null {
    const file = PROVIDER_ICON_FILES[provider];
    if (!file) {
        return null;
    }
    return <img src={`./img/${provider}.svg`} alt={provider} style={ICON_STYLE} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />;
}

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
    gptBaseUrlKey?: string;
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
        const gptBaseUrlKey = (config?.native.gptBaseUrlKey || '').trim() || undefined;
        // At least one key or custom base URL must be configured
        if (gptKey || claudeKey || geminiKey || deepseekKey || gptBaseUrl) {
            return { gptKey, claudeKey, geminiKey, deepseekKey, gptBaseUrl, gptBaseUrlKey };
        }
    }
    return null;
}

const OpenAiDialog = (props: OpenAiDialogProps): React.JSX.Element => {
    const [question, setQuestion] = useState(window.localStorage.getItem('openai-question') || '');
    const [answer, setAnswer] = useState('');
    const [working, setWorking] = useState<string | false>(false);
    const [plan, setPlan] = useState('');
    const [showPlan, setShowPlan] = useState(false);
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

                if (config.gptKey) {
                    queries.push(
                        props.socket
                            .sendTo(instanceId, 'testApiConnection', {
                                apiKey: config.gptKey,
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

                if (config.gptBaseUrl) {
                    queries.push(
                        props.socket
                            .sendTo(instanceId, 'testApiConnection', {
                                apiKey: config.gptBaseUrlKey || '',
                                baseUrl: config.gptBaseUrl,
                                provider: 'openai',
                            })
                            .then((result: { models?: string[]; error?: string }) => {
                                if (result.models) {
                                    addModels(result.models, 'custom');
                                } else if (result.error) {
                                    errors.push(`Custom: ${result.error}`);
                                }
                            })
                            .catch((err: unknown) => {
                                errors.push(`Custom: ${String(err)}`);
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
            docs = await systemPromptFull();
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
        } else if (provider === 'custom') {
            apiKey = config.gptBaseUrlKey || '';
            baseUrl = config.gptBaseUrl || '';
        } else {
            apiKey = config.gptKey;
            baseUrl = '';
        }

        const instanceId = Object.keys(props.runningInstances)[0];
        if (!instanceId) {
            setError(I18n.t('No running javascript instance found'));
            return;
        }

        setWorking(I18n.t('Planning...'));
        setError(false);
        setPlan('');
        setShowPlan(false);
        setAnswer('');

        try {
            // Step 1: Create an implementation plan with relevant devices
            const step1: { success?: boolean; content?: string; error?: string } = await props.socket.sendTo(
                instanceId,
                'chatCompletion',
                {
                    timeout: 600000,
                    apiKey,
                    baseUrl,
                    model,
                    provider,
                    messages: [
                        {
                            role: 'user',
                            content: `Devices in my smart home:
${JSON.stringify(devices)}

I need a plan for this task: ${question}

Answer with max 6 lines. Use FULL device IDs from the list above (e.g. zigbee2mqtt.0.0xa4c1383f5ef5fb07.state). No explanation. No reasoning.
1. IDs: <full IDs from the device list. If a device is not in the list, use TODO_DEVICE_ID as placeholder>
2. Trigger: <on(id) for state changes OR schedule('min hour * * *') for time-based tasks>
3. Condition: <when to act>
4. Actions: <what to set, with full IDs and values. For Telegram use sendTo('telegram.0', 'send', {text: msg})>
5. Else: <alternative actions or nothing>
6. Extra: <logging, formatting, etc.>
Values are boolean (true/false) or numbers, not strings. Use .state not .state_toggle.`,
                        },
                    ],
                },
            );

            if (step1.error) {
                setError(step1.error);
                setWorking(false);
                return;
            }

            // Extract plan from step 1
            let planText = (step1.content || '').trim();
            // Strip thinking artifacts
            planText = planText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
            planText = planText.replace(/<\|endoftext\|>/g, '').trim();
            planText = planText.replace(/<\|im_start\|>[\s\S]*?<\|im_end\|>/g, '').trim();
            setPlan(planText);

            // Step 2: Generate code based on the plan + full API docs
            setWorking(I18n.t('Generating code...'));
            const result: { success?: boolean; content?: string; error?: string } = await props.socket.sendTo(
                instanceId,
                'chatCompletion',
                {
                    timeout: 600000,
                    apiKey,
                    baseUrl,
                    model,
                    provider,
                    messages: [
                        {
                            role: 'system',
                            content: `You write ioBroker JavaScript adapter scripts.
Copy EXACTLY this syntax. Do NOT change the callback signature.
IMPORTANT: Write all code at top level. NEVER use console.log (use log instead). NEVER define functions with the function keyword.

// CORRECT: on() always has ONE callback argument called obj
on('zigbee.0.sensor.state', (obj) => {
    // obj.state.val = the new value (boolean or number)
    // obj.id = the state ID that changed
    setState('zigbee.0.lamp.state', obj.state.val);
    log('Changed to ' + obj.state.val);
});

// CORRECT: on() with filter
on({id: /zigbee\.0\..*\.state$/, change: 'ne'}, (obj) => {
    if (obj.state.val === true) {
        setState('zigbee.0.other.state', true);
    }
});

// Other correct examples:
setState('id', true);
setState('id', 50);
const val = getState('id').val;
schedule('0 7 * * *', () => { log('runs daily at 07:00'); });
schedule('0 22 * * *', () => { setState('id', false); });

// CORRECT Telegram: always use sendTo, NEVER setState on telegram
sendTo('telegram.0', 'send', {text: 'Alert: ' + someValue});

// CORRECT httpGet: res.data is a STRING, parse JSON with JSON.parse
httpGet('https://api.example.com/data', (err, res) => {
    const data = JSON.parse(res.data);
    log('Temperature: ' + data.main.temp);
});

$('state[state.id=*.state](rooms=Room)').each((id) => { setState(id, false); });
createState('name', 0, {type: 'number', name: 'Name'});
setStateDelayed('id', true, false, 5000);
log(formatDate(new Date(), 'DD.MM.YYYY hh:mm'));

WRONG: on('id', (id, state) => {})   CORRECT: on('id', (obj) => {})
WRONG: set('id', true)               CORRECT: setState('id', true)
WRONG: adapter.setState('id', true)  CORRECT: setState('id', true)
WRONG: obj.val or newState.val       CORRECT: obj.state.val
WRONG: on('change', {id: 'x'}, cb)  CORRECT: on({id: 'x', change: 'ne'}, cb)
WRONG: setState('telegram.0', text)  CORRECT: sendTo('telegram.0', 'send', {text: text})
WRONG: res.body.main.temp            CORRECT: JSON.parse(res.data).main.temp
WRONG: function myFunc() {}          CORRECT: write code directly, no function definitions
WRONG: setTimeout(fn, ms)            CORRECT: schedule('cron', () => {}) or setStateDelayed()
Values are boolean (true/false) or numbers, NEVER strings like 'ON'/'OFF'.
NEVER use: function keyword, require, import, setInterval, setTimeout, console.log, debug().

All available functions (use syntax from examples above):
on(pattern, (obj)=>{}) | once(pattern, (obj)=>{}) | unsubscribe(handler)
setState(id, val) | getState(id).val | setStateChanged(id, val) | setStateDelayed(id, val, ack, ms) | clearStateDelayed(id)
existsState(id) | existsObject(id) | getObject(id) | setObject(id, obj) | extendObject(id, obj) | deleteObject(id)
createState(name, initVal, {type,name,role}) | deleteState(name) | createAlias(name, alias)
schedule(cron, ()=>{}) | clearSchedule(obj) | scheduleById(id, (obj)=>{}) | getSchedules()
sendTo(adapter, cmd, msg) | sendToHost(host, cmd, msg)
$('selector').each((id)=>{}) | $('selector').setState(val) | $('selector').getState()
log(text) | formatDate(date, 'DD.MM.YYYY hh:mm') | formatTimeDiff(ms) | formatValue(val, decimals)
getDateObject(str) | getAstroDate(pattern) | isAstroDay() | compareTime(start, end, op)
exec(cmd, (err,stdout,stderr)=>{}) | httpGet(url, (err,res)=>{}) | httpPost(url, data, (err,res)=>{})
readFile(adapter, name, (err,data)=>{}) | writeFile(adapter, name, data, cb) | delFile(adapter, name, cb)
onFile(id, name, withFile, cb) | offFile(id, name) | onStop(cb, timeout)
getHistory(inst, {id,start,end,aggregate,count}, cb) | getEnums(name) | getIdByName(name)
wait(ms) | toInt(val) | toFloat(val) | toBoolean(val)
messageTo(target, data) | onMessage(name, cb) | onLog(severity, cb)
setInterval(cb, ms) | clearInterval(id) | setTimeout(cb, ms) | clearTimeout(id)
runScript(name) | startScript(name) | stopScript(name) | isScriptActive(name)`,
                        },
                        {
                            role: 'user',
                            content: `TASK: ${question}

PLAN:
${planText}

Write the ioBroker script. Use the exact state IDs from the plan. If the plan contains TODO_DEVICE_ID, keep it as a placeholder with a comment so the user can fill in the correct ID. Write comments in ${LANGUAGES[I18n.getLanguage()] || 'English'}. Return ONLY code.`,
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
                        disabled={!!working}
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
                        disabled={!!working || !question || !model}
                        startIcon={<Question />}
                        onClick={async () => ask()}
                    >
                        {working ? <><CircularProgress size={18} style={{ marginRight: 8 }} />{working}</> : I18n.t('Ask')}
                    </Button>
                    <FormControl
                        style={{ width: 300, marginLeft: 20 }}
                        disabled={!!working}
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
                                    <ProviderIcon provider={modelProviderMap.current[value]} />
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
                                        <ProviderIcon provider={modelProviderMap.current[m]} />
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
                {plan && (
                    <div style={{ marginBottom: 4 }}>
                        <Button
                            size="small"
                            variant="text"
                            onClick={() => setShowPlan(!showPlan)}
                            style={{ textTransform: 'none', padding: '2px 8px' }}
                        >
                            {showPlan ? '▼' : '►'} {I18n.t('Show plan')}
                        </Button>
                        {showPlan && (
                            <pre style={{
                                margin: '4px 0',
                                padding: 8,
                                backgroundColor: props.themeType === 'dark' ? '#1e1e1e' : '#f5f5f5',
                                borderRadius: 4,
                                fontSize: 12,
                                maxHeight: 200,
                                overflow: 'auto',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                            }}>{plan}</pre>
                        )}
                    </div>
                )}
                <div>{I18n.t('Result')}</div>
                <div style={{ flex: 1, minHeight: 100, overflow: 'hidden' }}>
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
