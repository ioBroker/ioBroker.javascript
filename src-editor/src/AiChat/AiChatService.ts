import type { CSSProperties } from 'react';
import ChannelDetector, { type DetectOptions, Types, type PatternControl } from '@iobroker/type-detector';
import { I18n, type AdminConnection } from '@iobroker/gui-components';

import type {
    ApiConfig,
    AiProviderName,
    ChatCompletionRequest,
    ChatCompletionResponse,
    DeviceObject,
} from './AiChatTypes';

const docsFull = import(`./docs-compact.md?raw`);

/** Map provider names to icon files */
export const PROVIDER_ICON_FILES: Record<string, string> = {
    openai: 'img/openai.svg',
    anthropic: 'img/anthropic.svg',
    gemini: 'img/gemini.svg',
    deepseek: 'img/deepseek.svg',
    custom: 'img/custom.svg',
};

const ICON_STYLE: CSSProperties = { width: 16, height: 16, flexShrink: 0, opacity: 0.7 };

export { ICON_STYLE };

const LANGUAGES: Record<string, string> = {
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

// ─── Caches ─────────────────────────────────────────────────────
let apiConfigCache: ApiConfig | null = null;
let devicesCache: DeviceObject[] | null = null;
let docsTextCache: string | null = null;
let allObjectsCache: Record<string, ioBroker.Object> | null = null;

export function clearCaches(): void {
    apiConfigCache = null;
    devicesCache = null;
    docsTextCache = null;
    allObjectsCache = null;
}

// ─── API Config ─────────────────────────────────────────────────
// Keys are stored as encryptedNative/protectedNative — frontend never sees them.
// The backend reports which providers have credentials via `getAvailableAiProviders`.
export async function getApiConfig(
    socket: AdminConnection,
    runningInstances: Record<string, unknown>,
): Promise<ApiConfig | null> {
    if (apiConfigCache) {
        return apiConfigCache;
    }
    const instanceId = Object.keys(runningInstances)[0];
    if (!instanceId) {
        return null;
    }
    const result: { providers?: { provider: AiProviderName; baseUrl?: string }[] } = await socket.sendTo(
        instanceId,
        'getAvailableAiProviders',
        {},
    );
    const providers = (result?.providers || []).map(p => p.provider);
    const customEntry = (result?.providers || []).find(p => p.provider === 'custom');
    if (!providers.length) {
        return null;
    }
    apiConfigCache = { providers, gptBaseUrl: customEntry?.baseUrl };
    return apiConfigCache;
}

// ─── Model Loading ──────────────────────────────────────────────
// Substring keywords for models that cannot be used for chat completion.
// Grouped by category; matched via case-insensitive substring.
const NON_CHAT_KEYWORDS: string[] = [
    // Embeddings (vector models, no text generation)
    'embedding',
    'text-embedding',
    'textembedding',
    'embeddinggemma', // Ollama: Google's Embedding-Gemma
    'embed-',
    '-embed',
    'bge-',
    'mxbai-embed',
    'nomic-embed',
    'arctic-embed',
    'snowflake-arctic-embed',
    'all-minilm',
    'multilingual-e5',
    'jina-embed',
    'voyage-',
    'gecko',
    'paraphrase-multilingual', // Ollama: sentence-paraphrase embedding

    // Image generation / editing
    'dall-e',
    'gpt-image',
    'image-edit',
    '-image-preview', // gemini-3-pro-image-preview, gemini-3.1-flash-image-preview
    '-image-latest',
    'flash-image', // gemini-2.5-flash-image
    'nano-banana', // Google's image editor (Gemini internal name for Imagen variants)
    'stable-diffusion',
    'sdxl',
    'midjourney',
    'flux-',
    'imagen',

    // Video generation
    'sora',
    'veo-',
    'cogvideo',
    'runway-',
    'lumiere',

    // Music generation
    'lyria', // Google Lyria music model

    // Audio, speech, realtime (TTS, STT, voice pipelines)
    'whisper',
    'tts-',
    '-tts', // gemini-2.5-flash-preview-tts, gemini-2.5-pro-preview-tts
    'speech-',
    'audio-preview',
    'mini-tts',
    'mini-transcribe',
    '-transcribe', // gpt-4o-transcribe, gpt-4o-transcribe-diarize
    'native-audio', // gemini-2.5-flash-native-audio-latest
    'flash-live', // gemini-3.1-flash-live-preview (realtime voice pipeline)
    'gpt-audio', // gpt-audio, gpt-audio-1.5, gpt-audio-mini
    'realtime',
    'bark-',
    'xtts',
    'voicebox',

    // Moderation / safety classifiers
    'moderation',
    'omni-moderation',
    'llama-guard',
    'shieldgemma',
    'prompt-guard',
    '-guardian', // granite3-guardian
    'safeguard', // gpt-oss-safeguard

    // Rerankers
    'rerank',
    'reranker',

    // Legacy OpenAI GPT-3-era completion models (no chat/tool calling)
    'babbage-',
    'davinci-',
    'curie-',
    'text-ada-',
    'text-davinci',
    'text-curie',
    'text-babbage',
    'instructgpt',
    'code-davinci',
    'code-cushman',
    '-turbo-instruct', // gpt-3.5-turbo-instruct, gpt-3.5-turbo-instruct-0914

    // Web search / browsing-only endpoints
    '-search-preview', // gpt-4o-search-preview, gpt-4o-mini-search-preview
    '-search-api', // gpt-5-search-api

    // Search / similarity endpoints (legacy)
    'code-search',
    'text-search',
    'similarity-',

    // Specialty / non-conversational
    'computer-use-preview', // OpenAI: action loop, not general chat
    'deep-research', // deep-research-pro-preview (long-running research agent, not general chat)
    'robotics', // gemini-robotics-er-* (robotics embodied reasoning)
    'aqa', // Gemini attributed question answering
    // Ollama single-task models
    'reader-lm', // HTML → Markdown converter
    '-nsql', // duckdb-nsql and similar text-to-SQL-only models
    'minicheck', // bespoke-minicheck (fact-checking classifier)
];

export function isChatModel(name: string): boolean {
    const lower = name.toLowerCase();
    // Reject obvious non-textual models and Anthropic's deprecated Claude 2.x line.
    if (NON_CHAT_KEYWORDS.some(kw => lower.includes(kw))) {
        return false;
    }
    // Anthropic: filter deprecated families that can't be reached by most users
    if (lower.startsWith('claude-1') || lower.startsWith('claude-instant')) {
        return false;
    }
    return true;
}

export interface LoadModelsResult {
    models: string[];
    providerMap: Record<string, AiProviderName>;
    errors: string[];
}

export async function loadModels(
    socket: AdminConnection,
    runningInstances: Record<string, unknown>,
): Promise<LoadModelsResult> {
    const config = await getApiConfig(socket, runningInstances);
    if (!config) {
        return { models: [], providerMap: {}, errors: ['No API keys configured'] };
    }

    const instanceId = Object.keys(runningInstances)[0];
    if (!instanceId) {
        return { models: [], providerMap: {}, errors: [I18n.t('No running javascript instance found')] };
    }

    const allModels: string[] = [];
    const providerMap: Record<string, AiProviderName> = {};
    const errors: string[] = [];

    const addModels = (models: string[], provider: AiProviderName): void => {
        for (const m of models) {
            if (!isChatModel(m)) {
                continue;
            }
            if (!providerMap[m]) {
                allModels.push(m);
                providerMap[m] = provider;
            }
        }
    };

    const queries: Promise<void>[] = [];

    const testProvider = (provider: AiProviderName, displayName?: string): void => {
        queries.push(
            socket
                .sendTo(instanceId, 'testApiConnection', {
                    // `custom` stays `custom`: the backend picks the credentials by this name, and
                    // rewriting it to `openai` made it read the OpenAI key for the custom endpoint (#2369)
                    provider,
                    // apiKey/baseUrl intentionally omitted — backend resolves from this.config
                })
                .then((result: { models?: string[]; error?: string }) => {
                    if (result.models) {
                        addModels(result.models, provider);
                    } else if (result.error) {
                        errors.push(`${displayName || provider}: ${result.error}`);
                    }
                })
                .catch((err: unknown) => {
                    errors.push(`${displayName || provider}: ${String(err)}`);
                }),
        );
    };

    const displayNames: Record<AiProviderName, string> = {
        openai: 'OpenAI',
        anthropic: 'Anthropic',
        gemini: 'Gemini',
        deepseek: 'DeepSeek',
        custom: 'Custom',
    };
    for (const provider of config.providers) {
        testProvider(provider, displayNames[provider]);
    }

    await Promise.all(queries);

    allModels.sort();
    return { models: allModels, providerMap, errors };
}

// ─── Chat Completion (non-streaming) ────────────────────────────
// apiKey is resolved server-side based on provider; never sent from the frontend.
export async function sendChatCompletion(
    socket: AdminConnection,
    instanceId: string,
    request: ChatCompletionRequest,
): Promise<ChatCompletionResponse> {
    const result: ChatCompletionResponse = await socket.sendTo(instanceId, 'chatCompletion', {
        timeout: request.timeout || 600000,
        model: request.model,
        provider: request.provider,
        messages: request.messages,
        ...(request.baseUrl ? { baseUrl: request.baseUrl } : {}),
        ...(request.tools?.length ? { tools: request.tools } : {}),
    });
    return result;
}

// ─── Device Detection ────────────────────────────────────────────
async function loadAllObjects(socket: AdminConnection): Promise<Record<string, ioBroker.Object>> {
    if (allObjectsCache) {
        return allObjectsCache;
    }
    const states = await socket.getObjectViewSystem('state', '', '\u9999');
    const channels = await socket.getObjectViewSystem('channel', '', '\u9999');
    const devices = await socket.getObjectViewSystem('device', '', '\u9999');
    const folders = await socket.getObjectViewSystem('folder', '', '\u9999');
    const enums = await socket.getObjectViewSystem('enum', '', '\u9999');

    allObjectsCache = Object.assign(states, channels, devices, folders, enums) as Record<string, ioBroker.Object>;
    return allObjectsCache;
}

/** Get all objects (for datapoint autocomplete) */
export async function getAllObjects(socket: AdminConnection): Promise<Record<string, ioBroker.Object>> {
    return loadAllObjects(socket);
}

function getText(text: ioBroker.StringOrTranslated, lang: ioBroker.Languages): string {
    if (text && typeof text === 'object') {
        return text[lang] || text.en;
    }
    return text || '';
}

export async function detectDevices(socket: AdminConnection): Promise<DeviceObject[]> {
    if (devicesCache) {
        return devicesCache;
    }

    const lang: ioBroker.Languages = I18n.getLanguage();
    const devicesObject = await loadAllObjects(socket);
    const keys: string[] = Object.keys(devicesObject).sort();
    const detector: ChannelDetector = new ChannelDetector();

    const usedIds: string[] = [];
    const ignoreIndicators: string[] = ['UNREACH_STICKY'];
    const excludedTypes: Types[] = [Types.info];
    const enumIds: string[] = [];
    const rooms: string[] = [];
    const funcs: string[] = [];
    const list: string[] = [];

    keys.forEach(id => {
        if (devicesObject[id]?.type === 'enum') {
            enumIds.push(id);
        } else if ((devicesObject[id]?.common as ioBroker.StateCommon)?.smartName) {
            list.push(id);
        }
    });

    enumIds.forEach(id => {
        if (id.startsWith('enum.rooms.')) {
            rooms.push(id);
        } else if (id.startsWith('enum.functions.')) {
            funcs.push(id);
        }
        const members: string[] | undefined = (devicesObject[id].common as ioBroker.EnumCommon).members;
        if (members?.length) {
            members.forEach(member => {
                if (devicesObject[member] && !list.includes(member)) {
                    list.push(member);
                }
            });
        }
    });

    const options: DetectOptions = {
        id: '',
        objects: devicesObject,
        _keysOptional: keys,
        _usedIdsOptional: usedIds,
        ignoreIndicators,
        excludedTypes,
    };

    const result: DeviceObject[] = [];

    list.forEach(id => {
        options.id = id;
        const controls: PatternControl[] | null = detector.detect(options);
        if (controls) {
            controls.forEach(control => {
                const stateId = control.states.find(state => state.id)?.id;
                if (!stateId || result.find(st => st.id === stateId)) {
                    return;
                }
                const stateObj = devicesObject[stateId];
                const deviceObject: DeviceObject = {
                    id: stateId,
                    name: getText(stateObj.common.name, lang),
                    type: stateObj.type,
                    deviceType: control.type,
                    states: control.states
                        .filter(state => state.id)
                        .map(state => ({
                            id: state.id,
                            name: state.name,
                            role: state.defaultRole,
                            type: (devicesObject[state.id].common as ioBroker.StateCommon).type,
                            unit: (devicesObject[state.id].common as ioBroker.StateCommon).unit,
                            read: (devicesObject[state.id].common as ioBroker.StateCommon).read ?? true,
                            write: (devicesObject[state.id].common as ioBroker.StateCommon).write ?? true,
                        })),
                };

                const parts = stateId.split('.');
                let channelId: string | undefined;
                let deviceId: string | undefined;
                if (stateObj.type === 'channel' || stateObj.type === 'state') {
                    parts.pop();
                    channelId = parts.join('.');
                    if (
                        devicesObject[channelId] &&
                        (devicesObject[channelId].type === 'channel' || devicesObject[channelId].type === 'folder')
                    ) {
                        parts.pop();
                        deviceId = parts.join('.');
                        if (
                            !devicesObject[deviceId] ||
                            (devicesObject[deviceId].type !== 'device' && devicesObject[channelId].type !== 'folder')
                        ) {
                            deviceId = undefined;
                        }
                    } else {
                        channelId = undefined;
                    }
                }

                const room = rooms.find(roomId => {
                    if ((devicesObject[roomId] as ioBroker.EnumObject).common.members?.includes(stateId)) {
                        return true;
                    }
                    if (
                        channelId &&
                        (devicesObject[roomId] as ioBroker.EnumObject).common.members?.includes(channelId)
                    ) {
                        return true;
                    }
                    return (
                        deviceId && (devicesObject[roomId] as ioBroker.EnumObject).common.members?.includes(deviceId)
                    );
                });
                if (room) {
                    deviceObject.room = getText(devicesObject[room].common.name, lang);
                }

                const func = funcs.find(funcId => {
                    if ((devicesObject[funcId] as ioBroker.EnumObject).common.members?.includes(stateId)) {
                        return true;
                    }
                    if (
                        channelId &&
                        (devicesObject[funcId] as ioBroker.EnumObject).common.members?.includes(channelId)
                    ) {
                        return true;
                    }
                    return (
                        deviceId && (devicesObject[funcId] as ioBroker.EnumObject).common.members?.includes(deviceId)
                    );
                });
                if (func) {
                    deviceObject.function = getText(devicesObject[func].common.name, lang);
                }
                result.push(deviceObject);
            });
        }
    });

    // Resolve names from parent objects
    for (let k = 0; k < result.length; k++) {
        const deviceObj = result[k];
        if (deviceObj.type === 'state' || deviceObj.type === 'channel') {
            const idArray = deviceObj.id.split('.');
            idArray.pop();
            const parentObject = devicesObject[idArray.join('.')];
            if (
                parentObject &&
                (parentObject.type === 'channel' || parentObject.type === 'device' || parentObject.type === 'folder')
            ) {
                deviceObj.name = getText(parentObject.common?.name || deviceObj.name, lang);
                idArray.pop();
                const grandParentObject = devicesObject[idArray.join('.')];
                if (grandParentObject?.type === 'device' && grandParentObject.common?.icon) {
                    deviceObj.name = getText(grandParentObject.common?.name || deviceObj.name, lang);
                }
            } else {
                deviceObj.name = getText(parentObject?.common?.name || deviceObj.name, lang);
            }
        }
    }

    devicesCache = result;
    return result;
}

// ─── System Prompt ──────────────────────────────────────────────
export async function getSystemPromptDocs(): Promise<string> {
    if (docsTextCache) {
        return docsTextCache;
    }
    docsTextCache = (await docsFull).default;
    return docsTextCache;
}

export function getUserLanguageName(): string {
    return LANGUAGES[I18n.getLanguage()] || 'English';
}

// ─── Code Mode System Prompt (Two-Step) ─────────────────────────
export function getCodeModeSystemPrompt(lang: string): string {
    return `You write ioBroker JavaScript adapter scripts.
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
on({id: /zigbee\\.0\\..*\\.state$/, change: 'ne'}, (obj) => {
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
// CORRECT: one-time delayed action (turn off after 5 minutes = 300000ms)
setStateDelayed('zigbee.0.lamp.state', false, false, 5 * 60 * 1000);
log(formatDate(new Date(), 'DD.MM.YYYY hh:mm'));

WRONG: on('id', (id, state) => {})   CORRECT: on('id', (obj) => {})
WRONG: set('id', true)               CORRECT: setState('id', true)
WRONG: adapter.setState('id', true)  CORRECT: setState('id', true)
WRONG: obj.val or newState.val       CORRECT: obj.state.val
WRONG: on('change', {id: 'x'}, cb)  CORRECT: on({id: 'x', change: 'ne'}, cb)
WRONG: setState('telegram.0', text)  CORRECT: sendTo('telegram.0', 'send', {text: text})
WRONG: res.body.main.temp            CORRECT: JSON.parse(res.data).main.temp
WRONG: function myFunc() {}          CORRECT: write code directly, no function definitions
WRONG: setTimeout(fn, ms)            CORRECT: setStateDelayed(id, val, false, ms) for one-time delay
WRONG: schedule('*/5 * * * *', fn)   for one-time delay. schedule() is ONLY for recurring tasks
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
runScript(name) | startScript(name) | stopScript(name) | isScriptActive(name)

Write comments in ${lang}. Put code in a \`\`\`javascript code block.`;
}

// ─── Blockly Code Mode System Prompt ─────────────────────────────
export function getBlocklyCodeModeSystemPrompt(lang: string): string {
    return `You generate ioBroker Blockly XML blocks. Return Blockly XML in a \`\`\`xml code block.
Use EXACT state IDs from the plan. Write text/comments in ${lang}.

IMPORTANT RULES:
- Return ONLY the inner blocks (no <xml> wrapper needed)
- Use the exact block types shown below
- State IDs must be full paths like "zigbee2mqtt.0.0x1234.state"
- Values are boolean (true/false) or numbers, NEVER strings like "ON"/"OFF"
- For Telegram use sendto_custom block, NEVER setState on telegram

## Block Templates

### Trigger: on_ext (react to state changes)
<block type="on_ext" x="0" y="0">
  <mutation xmlns="http://www.w3.org/1999/xhtml" items="1"></mutation>
  <field name="CONDITION">ne</field>
  <field name="ACK_CONDITION"></field>
  <value name="OID0">
    <shadow type="field_oid"><field name="oid">STATE_ID_HERE</field></shadow>
  </value>
  <statement name="STATEMENT">
    <!-- actions here -->
  </statement>
</block>

### Schedule: schedule (cron-based)
<block type="schedule" x="0" y="0">
  <field name="SCHEDULE">0 7 * * *</field>
  <statement name="STATEMENT">
    <!-- actions here -->
  </statement>
</block>

### Set State: control
<block type="control">
  <mutation xmlns="http://www.w3.org/1999/xhtml" delay_input="false"></mutation>
  <field name="OID">STATE_ID_HERE</field>
  <field name="WITH_DELAY">FALSE</field>
  <value name="VALUE">
    <block type="logic_boolean"><field name="BOOL">TRUE</field></block>
  </value>
</block>

### Get State Value: get_value
<block type="get_value">
  <field name="ATTR">val</field>
  <field name="OID">STATE_ID_HERE</field>
</block>

### Log: debug
<block type="debug">
  <field name="Severity">log</field>
  <value name="TEXT">
    <shadow type="text"><field name="TEXT">Message here</field></shadow>
  </value>
</block>

### SendTo (Telegram): sendto_custom
<block type="sendto_custom">
  <mutation xmlns="http://www.w3.org/1999/xhtml" items="1"></mutation>
  <field name="INSTANCE">telegram.0</field>
  <field name="COMMAND">send</field>
  <field name="LOG"></field>
  <value name="ARG0">
    <block type="text"><field name="TEXT">Message text</field></block>
  </value>
  <value name="ATTR0">
    <block type="text"><field name="TEXT">text</field></block>
  </value>
</block>

### Timeout: timeouts_settimeout
<block type="timeouts_settimeout">
  <field name="NAME">timeout1</field>
  <field name="DELAY">5000</field>
  <field name="UNIT">ms</field>
  <statement name="STATEMENT">
    <!-- delayed actions -->
  </statement>
</block>

### If/Else: controls_if
<block type="controls_if">
  <mutation else="1"></mutation>
  <value name="IF0">
    <block type="logic_compare">
      <field name="OP">EQ</field>
      <value name="A"><block type="get_value"><field name="ATTR">val</field><field name="OID">STATE_ID</field></block></value>
      <value name="B"><block type="logic_boolean"><field name="BOOL">TRUE</field></block></value>
    </block>
  </value>
  <statement name="DO0"><!-- then --></statement>
  <statement name="ELSE"><!-- else --></statement>
</block>

### Number value
<block type="math_number"><field name="NUM">0</field></block>

### Text value
<block type="text"><field name="TEXT">hello</field></block>

### Boolean value
<block type="logic_boolean"><field name="BOOL">TRUE</field></block>

### Comparison: logic_compare
<block type="logic_compare">
  <field name="OP">EQ</field>
  <!-- OP can be: EQ, NEQ, LT, LTE, GT, GTE -->
  <value name="A"><!-- left side --></value>
  <value name="B"><!-- right side --></value>
</block>

## Common Patterns

### Turn on light when sensor triggers:
<block type="on_ext" x="0" y="0">
  <mutation xmlns="http://www.w3.org/1999/xhtml" items="1"></mutation>
  <field name="CONDITION">ne</field>
  <field name="ACK_CONDITION"></field>
  <value name="OID0">
    <shadow type="field_oid"><field name="oid">zigbee2mqtt.0.0xSENSOR.occupancy</field></shadow>
  </value>
  <statement name="STATEMENT">
    <block type="controls_if">
      <value name="IF0">
        <block type="logic_compare">
          <field name="OP">EQ</field>
          <value name="A"><block type="get_value"><field name="ATTR">val</field><field name="OID">zigbee2mqtt.0.0xSENSOR.occupancy</field></block></value>
          <value name="B"><block type="logic_boolean"><field name="BOOL">TRUE</field></block></value>
        </block>
      </value>
      <statement name="DO0">
        <block type="control">
          <mutation xmlns="http://www.w3.org/1999/xhtml" delay_input="false"></mutation>
          <field name="OID">zigbee2mqtt.0.0xLAMP.state</field>
          <field name="WITH_DELAY">FALSE</field>
          <value name="VALUE"><block type="logic_boolean"><field name="BOOL">TRUE</field></block></value>
        </block>
      </statement>
    </block>
  </statement>
</block>

Write comments in ${lang}. Put blocks in a \`\`\`xml code block.`;
}

// ─── Code Extraction Helpers ────────────────────────────────────
/** Strip LLM thinking artifacts from response content */
export function stripThinkingArtifacts(content: string): string {
    let cleaned = content;
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');
    cleaned = cleaned.replace(/<\|endoftext\|>/g, '');
    cleaned = cleaned.replace(/<\|im_start\|>[\s\S]*?<\|im_end\|>/g, '');
    cleaned = cleaned.replace(/<\|im_start\|>[\s\S]*/g, '');
    return cleaned.trim();
}
