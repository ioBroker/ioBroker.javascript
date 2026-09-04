import { useState, useCallback, useRef, useEffect } from 'react';
import { I18n, type AdminConnection } from '@iobroker/gui-components';

import type {
    ChatMessage,
    ApiConfig,
    AiProviderName,
    AiChatMode,
    AiScriptLanguage,
    DeviceObject,
    ScriptInfo,
    ChatApiMessage,
    EditorApi,
    EditorAiActionRequest,
    ChatSourceRange,
} from './AiChatTypes';
import {
    getApiConfig,
    loadModels,
    sendChatCompletion,
    detectDevices,
    getSystemPromptDocs,
    getUserLanguageName,
    stripThinkingArtifacts,
    getCodeModeSystemPrompt,
    getBlocklyCodeModeSystemPrompt,
    clearCaches,
    readRememberedModel,
    rememberModel,
} from './AiChatService';
import { buildScriptSummary, findScriptsUsingDatapoint } from './AiScriptAnalyzer';
import { IOBROKER_TOOLS, executeToolCall } from './AiToolExecutor';

interface UseAiChatOptions {
    socket: AdminConnection;
    runningInstances: Record<string, unknown>;
    currentCode?: string;
    currentLanguage?: AiScriptLanguage;
    allScripts?: ScriptInfo[];
    /** Optional handle for agent tools to inspect/manipulate the live Monaco editor. */
    editorApi?: EditorApi;
    /**
     * Currently active script id — stored on each ChatSourceRange so Show-Diff
     *  can refuse to render against the wrong script after a switch.
     */
    currentScriptId?: string;
}

interface UseAiChatReturn {
    messages: ChatMessage[];
    isLoading: boolean;
    error: string | null;
    model: string;
    availableModels: string[];
    modelProviderMap: Record<string, AiProviderName>;
    modelsLoading: boolean;
    modelsError: string | null;
    /** Info about what context was included in the last message */
    lastContextInfo: string | null;
    mode: AiChatMode;
    setMode: (mode: AiChatMode) => void;
    setModel: (model: string) => void;
    sendMessage: (content: string) => void;
    /** Fire an editor-triggered AI action (context menu / shortcut / code lens). */
    triggerAiAction: (request: EditorAiActionRequest) => void;
    /** One-shot single-turn ask, used by the inline-chat widget (Ctrl+I). */
    askInline: (question: string, code: string) => Promise<string>;
    clearChat: () => void;
    retryLoadModels: () => void;
}

let messageIdCounter = 0;
function nextId(): string {
    return `msg_${Date.now()}_${++messageIdCounter}`;
}

export function useAiChat(options: UseAiChatOptions): UseAiChatReturn {
    const { socket, runningInstances, currentCode, currentLanguage, allScripts, editorApi, currentScriptId } = options;

    /**
     * Build a ChatSourceRange snapshot from whatever scope the caller can provide.
     *  Returns null when no scope is available (free-form question → insertion mode).
     */
    const buildSourceRange = useCallback(
        (
            kind: ChatSourceRange['kind'],
            range: ChatSourceRange['range'],
            originalText: string,
        ): ChatSourceRange | null => {
            if (kind === 'none' || !originalText) {
                return null;
            }
            return {
                range,
                scriptId: currentScriptId || '',
                scriptVersion: (currentCode || '').length,
                kind,
                originalText,
            };
        },
        [currentScriptId, currentCode],
    );
    // Silence "declared but never used" if only downstream uses the helper
    void buildSourceRange;

    // Restore messages from localStorage
    const [messages, setMessagesState] = useState<ChatMessage[]>(() => {
        try {
            const saved = window.localStorage.getItem('Editor.aiChatMessages');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Persist messages to localStorage on every change (keep last 100 messages max)
    const setMessages = useCallback((updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
        setMessagesState(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            const trimmed = next.length > 100 ? next.slice(-100) : next;
            try {
                window.localStorage.setItem('Editor.aiChatMessages', JSON.stringify(trimmed));
            } catch {
                // localStorage full — clear old messages and retry
                try {
                    const reduced = trimmed.slice(-20);
                    window.localStorage.setItem('Editor.aiChatMessages', JSON.stringify(reduced));
                } catch {
                    // still failing — give up silently
                }
            }
            return trimmed;
        });
    }, []);

    const [isLoading, setIsLoading] = useState(false);
    const [lastContextInfo, setLastContextInfo] = useState<string | null>(null);
    const [mode, setModeState] = useState<AiChatMode>(
        (window.localStorage.getItem('Editor.aiChatMode') as AiChatMode) || 'agent',
    );

    const setMode = useCallback((m: AiChatMode) => {
        setModeState(m);
        window.localStorage.setItem('Editor.aiChatMode', m);
    }, []);
    const [error, setError] = useState<string | null>(null);
    const [model, setModelState] = useState(window.localStorage.getItem('openai-model') || '');
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [modelProviderMap, setModelProviderMap] = useState<Record<string, AiProviderName>>({});
    const [modelsLoading, setModelsLoading] = useState(true);
    const [modelsError, setModelsError] = useState<string | null>(null);

    const apiConfigRef = useRef<ApiConfig | null>(null);

    /**
     * When `triggerAiAction` is calling into sendMessage, it stashes the action's
     *  captured range here so sendMessage can attach it to the user message instead
     *  of falling back to the current editor selection (which may differ).
     */
    const pendingSourceRangeRef = useRef<ChatSourceRange | null>(null);
    const devicesRef = useRef<DeviceObject[] | null>(null);
    const docsRef = useRef<string | null>(null);

    const setModel = useCallback(
        (m: string) => {
            setModelState(m);
            // together with its provider, so the inline completion does not have to guess whose model it is
            rememberModel(m, modelProviderMap[m]);
        },
        [modelProviderMap],
    );

    const doLoadModels = useCallback(async () => {
        setModelsLoading(true);
        setModelsError(null);
        try {
            const result = await loadModels(socket, runningInstances);
            setAvailableModels(result.models);
            setModelProviderMap(result.providerMap);

            if (result.models.length > 0) {
                const saved = readRememberedModel().model;
                const effective = saved && result.models.includes(saved) ? saved : result.models[0];
                setModelState(effective);
                // The list may have picked the model rather than the user, and the provider of a
                // remembered one can have changed - either way this is the pair that is now in use.
                rememberModel(effective, result.providerMap[effective]);
            }

            if (result.errors.length > 0) {
                setModelsError(result.errors.join('; '));
            }
        } catch (err) {
            setModelsError(String(err));
        }
        setModelsLoading(false);
    }, [socket, runningInstances]);

    // Load models on mount
    useEffect(() => {
        void doLoadModels();
    }, [doLoadModels]);

    /** Parse @-mentions from message and return { cleanMessage, mentionedScriptIds, includeAll, includeDevices } */
    const parseMentions = useCallback(
        (
            content: string,
        ): {
            cleanMessage: string;
            mentionedScriptIds: string[];
            includeAll: boolean;
            includeDevices: boolean;
        } => {
            let includeAll = false;
            let includeDevices = false;
            const mentionedScriptIds: string[] = [];
            let hasMention = false;

            // Match @mentions
            const mentionRegex = /@([\w/äöüÄÖÜß-]+)/g;
            let match: RegExpExecArray | null;
            while ((match = mentionRegex.exec(content)) !== null) {
                const mention = match[1].toLowerCase();
                if (mention === 'alle' || mention === 'all') {
                    includeAll = true;
                } else if (mention === 'geräte' || mention === 'devices' || mention === 'geraete') {
                    includeDevices = true;
                } else {
                    hasMention = true;
                    if (allScripts && allScripts.length > 0) {
                        // Try to find matching script by path (case-insensitive)
                        const searchPath = match[1].replace(/\//g, '.').toLowerCase();
                        const segments = searchPath.split('.');

                        const found = allScripts.find(s => {
                            const idLower = s.id.toLowerCase();
                            const shortId = idLower.replace(/^script\.js\./, '');

                            // Exact full path
                            if (shortId === searchPath) {
                                return true;
                            }
                            // Ends with path
                            if (shortId.endsWith(`.${searchPath}`)) {
                                return true;
                            }
                            // With script.js. prefix
                            if (idLower === `script.js.${searchPath}`) {
                                return true;
                            }
                            // Check if all segments appear in order in the ID
                            let pos = 0;
                            for (const seg of segments) {
                                const idx = shortId.indexOf(seg, pos);
                                if (idx === -1) {
                                    return false;
                                }
                                pos = idx + seg.length;
                            }
                            return true;
                        });

                        if (found) {
                            mentionedScriptIds.push(found.id);
                        } else {
                            // Fuzzy: match on any segment
                            for (const seg of segments) {
                                if (seg.length < 3) {
                                    continue;
                                }
                                const fuzzy = allScripts.filter(
                                    s => s.id.toLowerCase().includes(`.${seg}`) || s.name.toLowerCase().includes(seg),
                                );
                                for (const f of fuzzy) {
                                    if (!mentionedScriptIds.includes(f.id)) {
                                        mentionedScriptIds.push(f.id);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Fallback: if user used @ but nothing was found, include all scripts
            if (hasMention && mentionedScriptIds.length === 0) {
                includeAll = true;
            }

            // Remove @mentions from the display message
            const cleanMessage = content.replace(/@[\w/äöüÄÖÜß]+\s*/g, '').trim();

            return { cleanMessage, mentionedScriptIds, includeAll, includeDevices };
        },
        [allScripts],
    );

    const buildSystemMessages = useCallback(
        async (
            includeAll: boolean,
            includeDevices: boolean,
            mentionedScriptIds: string[],
        ): Promise<{ role: string; content: string }[]> => {
            // Load cached resources
            if (!docsRef.current) {
                docsRef.current = await getSystemPromptDocs();
            }
            if (!apiConfigRef.current) {
                apiConfigRef.current = await getApiConfig(socket, runningInstances);
            }

            // Build ONE single system message (some providers only use the first)
            const lang = getUserLanguageName();
            const isBlockly = currentLanguage === 'blockly';
            const hasMentions = includeAll || mentionedScriptIds.length > 0;

            let prompt = `You are an AI assistant for ioBroker JavaScript adapter scripting. Help the user write, debug, and understand ioBroker scripts. Write comments in ${lang}. Use the ioBroker JavaScript API correctly.

ioBroker object hierarchy: adapter.instance.device.channel.state
- A "state" is a single datapoint (e.g. zigbee2mqtt.0.0x1234.temperature)
- A "channel" groups related states (e.g. zigbee2mqtt.0.0x1234 contains temperature, humidity, battery)
- A "device" groups channels (e.g. zigbee2mqtt.0.0x1234)
- The channel/device often has the human-readable name (e.g. "Living Room Sensor")
When looking up info about a datapoint, ALWAYS also check its parent channel/device for the device name and context. Use get_object_info which returns the full parent hierarchy automatically.

To verify code or diagnose runtime behaviour, you can use the run_script tool: it executes a JavaScript/TypeScript snippet in the live engine (verbose mode) and returns everything it logged, then auto-stops it. Log the values you want to inspect via log(...) / console.log(...). It runs against the live system, so prefer read-only diagnostics (getState, $, getObject) and only call setState when the user explicitly asked to change something.

Available API and syntax rules:
${docsRef.current}`;

            if (isBlockly) {
                prompt += `\n\nThe user is working in the Blockly visual editor. When asked to create or modify code, respond with Blockly XML in a \`\`\`xml code block instead of JavaScript.`;
            }

            // Include devices if explicitly requested or if @alle
            if (includeDevices || includeAll) {
                if (!devicesRef.current) {
                    devicesRef.current = await detectDevices(socket);
                }
                prompt += `\n\nAvailable smart home devices:\n${JSON.stringify(devicesRef.current, null, 0)}`;
            }

            // Current script context
            if (!hasMentions && currentCode) {
                if (isBlockly) {
                    const sep = '%%BLOCKLY_XML%%';
                    const sepIndex = currentCode.indexOf(sep);
                    const jsCode = sepIndex !== -1 ? currentCode.substring(0, sepIndex).trim() : currentCode;
                    const xmlCode = sepIndex !== -1 ? currentCode.substring(sepIndex + sep.length).trim() : '';
                    prompt += `\n\nThe user is working on this Blockly script (currently open in the editor).\n\nGenerated JavaScript (shows the logic):\n\`\`\`javascript\n${jsCode}\n\`\`\``;
                    if (xmlCode) {
                        prompt += `\n\nBlockly XML (use for modifications):\n\`\`\`xml\n${xmlCode}\n\`\`\``;
                    }
                } else {
                    prompt += `\n\nThe user's question is about this script (currently open in the editor, ${currentLanguage || 'javascript'}):\n\`\`\`${currentLanguage || 'javascript'}\n${currentCode}\n\`\`\``;
                }
            }

            // Script context based on @-mentions
            if (includeAll && allScripts && allScripts.length > 0) {
                prompt += `\n\nThe user requested ALL scripts. Search through all of them to answer the question. Always identify WHICH script you describe by its full ID. Scripts may reference datapoint IDs via variables.\n\n${buildScriptSummary(allScripts, true)}`;
            } else if (mentionedScriptIds.length > 0 && allScripts) {
                const mentioned = allScripts.filter(s => mentionedScriptIds.includes(s.id));
                if (mentioned.length > 0) {
                    prompt += `\n\nIMPORTANT: The user is asking about the following script(s). Answer ONLY about these scripts, NOT about the currently open editor tab. Analyze the source code below carefully:\n\n${buildScriptSummary(mentioned, true)}`;
                }
            }

            // Blockly block templates
            if (isBlockly) {
                prompt += `\n\n${getBlocklyCodeModeSystemPrompt(lang)}`;
            }

            return [{ role: 'system', content: prompt }];
        },
        [socket, runningInstances, currentCode, currentLanguage, allScripts],
    );

    // ─── Code Mode: Two-step plan→code generation ─────────────────
    const sendCodeMessage = useCallback(
        async (content: string) => {
            if (!content.trim() || isLoading) {
                return;
            }

            const provider = modelProviderMap[model];
            if (!provider) {
                setError(I18n.t('Please select a valid model'));
                return;
            }

            const config = apiConfigRef.current || (await getApiConfig(socket, runningInstances));
            apiConfigRef.current = config;
            if (!config) {
                setError(I18n.t('No API keys configured'));
                return;
            }

            const instanceId = Object.keys(runningInstances)[0];
            if (!instanceId) {
                setError(I18n.t('No running javascript instance found'));
                return;
            }

            const baseUrl = provider === 'custom' ? config.gptBaseUrl || '' : '';

            // Add user message + placeholder for plan
            const userMessage: ChatMessage = {
                id: nextId(),
                role: 'user',
                content,
                timestamp: Date.now(),
            };
            const planMessage: ChatMessage = {
                id: nextId(),
                role: 'assistant',
                content: `⏳ ${I18n.t('Generating plan...')}`,
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, userMessage, planMessage]);
            setIsLoading(true);
            setError(null);

            try {
                const lang = getUserLanguageName();

                // Load devices (identical to old approach)
                if (!devicesRef.current) {
                    devicesRef.current = await detectDevices(socket);
                }
                const devices = devicesRef.current || [];

                // ── Step 1: Planning (identical prompt to old merge) ──
                const planPrompt = `Devices in my smart home:\n${JSON.stringify(devices)}\n\nI need a plan for this task: ${content}\n\nAnswer with max 6 lines. Use FULL device IDs from the list above (e.g. zigbee2mqtt.0.0xa4c1383f5ef5fb07.state). No explanation. No reasoning.\n1. IDs: <full IDs from the device list. If a device is not in the list, use TODO_DEVICE_ID as placeholder>\n2. Trigger: <on(id) for state changes OR schedule('min hour * * *') for time-based tasks>\n3. Condition: <when to act>\n4. Actions: <what to set, with full IDs and values. For Telegram use sendTo('telegram.0', 'send', {text: msg})>\n5. Else: <alternative actions or nothing>\n6. Extra: <logging, formatting, etc.>\nValues are boolean (true/false) or numbers, not strings. Use .state not .state_toggle.`;

                const planResult = await sendChatCompletion(socket, instanceId, {
                    messages: [{ role: 'user', content: planPrompt }],
                    model,
                    provider,
                    baseUrl,
                });

                if (planResult.error) {
                    setError(planResult.error);
                    setMessages(prev => prev.slice(0, -2));
                    setIsLoading(false);
                    return;
                }

                const planText = stripThinkingArtifacts(planResult.content || '');

                // Show the plan
                setMessages(prev => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === 'assistant') {
                        updated[updated.length - 1] = { ...last, content: `📋 **${I18n.t('Plan')}:**\n${planText}` };
                    }
                    return updated;
                });

                // ── Step 2: Code generation ──
                const codeMessage: ChatMessage = {
                    id: nextId(),
                    role: 'assistant',
                    content: `⏳ ${I18n.t('Generating code...')}`,
                    timestamp: Date.now(),
                };
                setMessages(prev => [...prev, codeMessage]);

                const isBlockly = currentLanguage === 'blockly';
                const codePrompt = isBlockly
                    ? `TASK: ${content}\n\nPLAN:\n${planText}\n\nGenerate Blockly XML blocks for this ioBroker automation. Use the exact state IDs from the plan. If the plan contains TODO_DEVICE_ID, keep it as a placeholder. Write comments in ${lang}. Put the blocks in a \`\`\`xml code block. You may add a short explanation before or after the XML.`
                    : `TASK: ${content}\n\nPLAN:\n${planText}\n\nWrite the ioBroker script. Use the exact state IDs from the plan. If the plan contains TODO_DEVICE_ID, keep it as a placeholder with a comment so the user can fill in the correct ID. Write comments in ${lang}. Put the code in a \`\`\`javascript code block. You may add a short explanation before or after the code.`;

                const systemPrompt = isBlockly ? getBlocklyCodeModeSystemPrompt(lang) : getCodeModeSystemPrompt(lang);

                const codeResult = await sendChatCompletion(socket, instanceId, {
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: codePrompt },
                    ],
                    model,
                    provider,
                    baseUrl,
                });

                if (codeResult.error) {
                    setError(codeResult.error);
                    setMessages(prev => prev.slice(0, -1));
                    setIsLoading(false);
                    return;
                }

                const codeText = stripThinkingArtifacts(codeResult.content || '');

                // Show the code
                setMessages(prev => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === 'assistant') {
                        updated[updated.length - 1] = { ...last, content: codeText };
                    }
                    return updated;
                });

                setLastContextInfo(`${I18n.t('devices')}: ${devices.length}`);
            } catch (err) {
                setError(String(err));
                setMessages(prev => prev.slice(0, -1));
            }
            setIsLoading(false);
        },
        [model, modelProviderMap, isLoading, socket, runningInstances, currentLanguage, setMessages],
    );

    // ─── Chat / Agent Mode ──────────────────────────────────────────
    const sendMessage = useCallback(
        async (content: string) => {
            // Code mode uses the two-step approach
            if (mode === 'code') {
                return sendCodeMessage(content);
            }

            if (!content.trim() || isLoading) {
                return;
            }

            const provider = modelProviderMap[model];
            if (!provider) {
                setError(I18n.t('Please select a valid model'));
                return;
            }

            const config = apiConfigRef.current || (await getApiConfig(socket, runningInstances));
            apiConfigRef.current = config;
            if (!config) {
                setError(I18n.t('No API keys configured'));
                return;
            }

            const instanceId = Object.keys(runningInstances)[0];
            if (!instanceId) {
                setError(I18n.t('No running javascript instance found'));
                return;
            }

            // Prefer the range captured by triggerAiAction (context menu / code lens)
            // over the current editor selection; fall back to the live selection.
            // No selection at all → null (insertion mode).
            let sourceRange: ChatSourceRange | null = pendingSourceRangeRef.current;
            pendingSourceRangeRef.current = null;
            if (!sourceRange) {
                try {
                    const sel = editorApi?.getSelection?.();
                    if (sel && sel.text) {
                        sourceRange = buildSourceRange('selection', sel.range, sel.text);
                    }
                } catch {
                    /* ignore */
                }
            }

            const userMessage: ChatMessage = {
                id: nextId(),
                role: 'user',
                content,
                timestamp: Date.now(),
                sourceRange,
            };

            const assistantMessage: ChatMessage = {
                id: nextId(),
                role: 'assistant',
                content: '',
                timestamp: Date.now(),
                sourceRange,
            };

            setMessages(prev => [...prev, userMessage, assistantMessage]);
            setIsLoading(true);
            setError(null);

            // Parse @-mentions from the message
            const { cleanMessage, mentionedScriptIds, includeAll, includeDevices } = parseMentions(content);

            // Build context info for UI feedback
            const contextParts: string[] = [];
            if (includeAll) {
                contextParts.push(`${I18n.t('all scripts')} (${allScripts?.length || 0})`);
            } else if (mentionedScriptIds.length > 0) {
                const names = mentionedScriptIds.map(id => id.replace(/^script\.js\./, ''));
                contextParts.push(names.join(', '));
            } else {
                contextParts.push(I18n.t('current script'));
            }
            if (includeDevices) {
                contextParts.push(I18n.t('devices'));
            }
            setLastContextInfo(`${I18n.t('Context')}: ${contextParts.join(' + ')}`);

            const systemMessages = await buildSystemMessages(includeAll, includeDevices, mentionedScriptIds);
            const baseUrl = provider === 'custom' ? config.gptBaseUrl || '' : '';

            // Enrich user message with local datapoint analysis
            let enrichedContent = cleanMessage || content;
            if (allScripts && allScripts.length > 0) {
                const dpMatches = enrichedContent.match(/\b[\w-]+\.\d+\.[\w.-]+/g);
                if (dpMatches) {
                    const analysisResults: string[] = [];
                    for (const dp of new Set(dpMatches)) {
                        const usages = findScriptsUsingDatapoint(allScripts, dp);
                        if (usages.length > 0) {
                            analysisResults.push(
                                `Datapoint "${dp}" is used in:\n${usages
                                    .map(
                                        u =>
                                            `  - ${u.scriptName} (${u.scriptId}) line ${u.lineNumber}: ${u.usageType} → ${u.line}`,
                                    )
                                    .join('\n')}`,
                            );
                        }
                    }
                    if (analysisResults.length > 0) {
                        enrichedContent += `\n\n[Automatic analysis results]\n${analysisResults.join('\n\n')}`;
                    }
                }
            }

            // Build conversation history
            const conversationMessages: ChatApiMessage[] = [
                ...systemMessages,
                ...messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })),
                { role: 'user', content: enrichedContent },
            ];
            // Tool calling: active in agent mode for every provider.
            // The backend translates Anthropic's tool_use content-block format to/from
            // the OpenAI-style tool_calls shape (see lib/anthropicAdapter.ts).
            const useTools = mode === 'agent';
            const MAX_TOOL_ROUNDS = 5;

            try {
                const currentMessages = [...conversationMessages];

                for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
                    const result = await sendChatCompletion(socket, instanceId, {
                        messages: currentMessages,
                        model,
                        provider,
                        baseUrl,
                        ...(useTools ? { tools: IOBROKER_TOOLS } : {}),
                    });

                    if (result.error) {
                        // If tools caused the error, retry without tools
                        if (useTools && round === 0 && result.error.toLowerCase().includes('tool')) {
                            const fallback = await sendChatCompletion(socket, instanceId, {
                                messages: currentMessages,
                                model,
                                provider,
                                baseUrl,
                            });
                            if (fallback.error) {
                                setError(fallback.error);
                                setMessages(prev => prev.slice(0, -1));
                            } else {
                                const cleanContent = stripThinkingArtifacts(fallback.content || '');
                                setMessages(prev => {
                                    const updated = [...prev];
                                    const last = updated[updated.length - 1];
                                    if (last?.role === 'assistant') {
                                        updated[updated.length - 1] = { ...last, content: cleanContent };
                                    }
                                    return updated;
                                });
                            }
                            break;
                        }
                        setError(result.error);
                        setMessages(prev => prev.slice(0, -1));
                        break;
                    }

                    // Check if model output a tool call as text (no native tool calling support)
                    let toolCalls = result.tool_calls;
                    if ((!toolCalls || toolCalls.length === 0) && useTools && result.content) {
                        const content = result.content.trim();
                        // Try to detect JSON tool call in the content
                        try {
                            const parsed = JSON.parse(content);
                            if (parsed.name && parsed.arguments) {
                                // Model wrote the tool call as JSON text
                                toolCalls = [
                                    {
                                        id: `text_tool_${Date.now()}`,
                                        type: 'function' as const,
                                        function: {
                                            name: parsed.name,
                                            arguments: JSON.stringify(parsed.arguments),
                                        },
                                    },
                                ];
                            }
                        } catch {
                            // Not JSON, that's fine
                        }
                    }

                    // No tool calls = final answer
                    if (!toolCalls || toolCalls.length === 0) {
                        const cleanContent = stripThinkingArtifacts(result.content || '');
                        setMessages(prev => {
                            const updated = [...prev];
                            const last = updated[updated.length - 1];
                            if (last?.role === 'assistant') {
                                updated[updated.length - 1] = { ...last, content: cleanContent };
                            }
                            return updated;
                        });
                        break;
                    }

                    // Replace result.tool_calls with our detected ones
                    result.tool_calls = toolCalls;

                    // Tool calls: show progress, execute, continue loop
                    const toolDescriptions = result.tool_calls.map(tc => {
                        let args: Record<string, string> = {};
                        try {
                            args = JSON.parse(tc.function.arguments) as Record<string, string>;
                        } catch {
                            // ignore
                        }
                        switch (tc.function.name) {
                            case 'search_datapoints':
                                return `🔍 ${I18n.t('Searching datapoints')}: "${String(args.query || '')}"`;
                            case 'get_state_value':
                                return `📊 ${I18n.t('Reading value')}: ${String(args.id || '')}`;
                            case 'get_object_info':
                                return `📋 ${I18n.t('Loading object info')}: ${String(args.id || '')}`;
                            case 'search_scripts':
                                return `🔍 ${I18n.t('Searching scripts')}: "${String(args.query || '')}"`;
                            case 'read_script':
                                return `📖 ${I18n.t('Reading script')}: ${String(args.id || '')}`;
                            case 'list_scripts':
                                return `📂 ${I18n.t('Loading script list')}`;
                            default:
                                return `⚙️ ${tc.function.name}`;
                        }
                    });
                    setMessages(prev => {
                        const updated = [...prev];
                        const last = updated[updated.length - 1];
                        if (last?.role === 'assistant') {
                            updated[updated.length - 1] = {
                                ...last,
                                content: toolDescriptions.join('\n'),
                            };
                        }
                        return updated;
                    });

                    // Add assistant message with tool_calls to conversation
                    currentMessages.push({
                        role: 'assistant',
                        content: result.content || '',
                        tool_calls: result.tool_calls,
                    });

                    // Execute each tool call and add results
                    for (const toolCall of result.tool_calls) {
                        const toolResult = await executeToolCall(socket, toolCall, allScripts, editorApi, instanceId);
                        currentMessages.push({
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            content: toolResult,
                        });
                    }
                }
            } catch (err) {
                setError(String(err));
                setMessages(prev => prev.slice(0, -1));
            }
            setIsLoading(false);
        },
        [
            model,
            modelProviderMap,
            messages,
            isLoading,
            socket,
            runningInstances,
            buildSystemMessages,
            parseMentions,
            allScripts,
            mode,
            sendCodeMessage,
            setMessages,
            buildSourceRange,
            editorApi,
        ],
    );

    const clearChat = useCallback(() => {
        setMessages([]);
        setError(null);
        setIsLoading(false);
        setLastContextInfo(null);
        clearCaches();
        // Also clear input history
        window.localStorage.removeItem('Editor.aiChatHistory');
    }, [setMessages]);

    /**
     * One-shot ask that returns the AI's answer directly (no chat history mutation).
     *  Used by the inline-chat widget so the user can see a proposal inside the editor
     *  without opening the full chat-panel UI.
     */
    const askInline = useCallback(
        async (question: string, code: string): Promise<string> => {
            const provider = modelProviderMap[model];
            if (!provider) {
                return `Error: ${I18n.t('Please select a valid model')}`;
            }
            const config = apiConfigRef.current || (await getApiConfig(socket, runningInstances));
            apiConfigRef.current = config;
            if (!config) {
                return `Error: ${I18n.t('No API keys configured')}`;
            }
            const instanceId = Object.keys(runningInstances)[0];
            if (!instanceId) {
                return `Error: ${I18n.t('No running javascript instance found')}`;
            }
            const baseUrl = provider === 'custom' ? config.gptBaseUrl || '' : '';
            const lang = currentLanguage || 'javascript';
            // System prompt steers the AI to match response format to question intent:
            // explanations → plain text, code changes → fenced block the widget can Apply.
            // The previous "return ONLY the replacement code" line forced code output even
            // for "what does this do?" questions.
            const systemPrompt =
                `You are an assistant for writing ioBroker ${lang} scripts. ` +
                `The user will ask a question about a snippet of their code. ` +
                `Match your answer to the question: ` +
                `\n- If they ask for an explanation, description, or "what does this do?", reply with clear prose (a few sentences). Do NOT repeat the code unchanged. ` +
                `\n- If they explicitly ask for a change, refactor, fix, or rewrite, reply with a single fenced \`\`\`${lang === 'blockly' ? 'xml' : lang}\`\`\` code block containing the full replacement for the selection. You may add one short sentence before or after the block. ` +
                `\n- If they ask something ambiguous or meta (e.g. "is this correct?"), reply in prose first and only include code if proposing a change. ` +
                `\nioBroker globals available in scripts: on, setState, getState, schedule, sendTo, log, createState, setStateDelayed, existsState, httpGet, httpPost.`;
            const userPrompt = code
                ? `Code from my editor:\n\n\`\`\`${lang === 'blockly' ? 'xml' : lang}\n${code}\n\`\`\`\n\n${question}`
                : question;
            try {
                const result = await sendChatCompletion(socket, instanceId, {
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    model,
                    provider,
                    baseUrl,
                });
                if (result.error) {
                    return `Error: ${result.error}`;
                }
                return result.content || '';
            } catch (e) {
                return `Error: ${(e as Error).message || String(e)}`;
            }
        },
        [model, modelProviderMap, runningInstances, socket, currentLanguage],
    );

    const triggerAiAction = useCallback(
        (request: EditorAiActionRequest) => {
            // Stash the action's captured range so sendMessage uses it
            // instead of the live editor selection (which would be wrong if
            // the user right-clicked on a function name with no active selection).
            if (request.range && request.code) {
                pendingSourceRangeRef.current = buildSourceRange(
                    request.kind || 'codelens',
                    request.range,
                    request.code,
                );
            } else {
                pendingSourceRangeRef.current = null;
            }
            // Lazy-import keeps the bundle lean if this path isn't exercised.
            import('./aiPromptBuilder')
                .then(({ buildActionPrompt }) => {
                    const prompt = buildActionPrompt({
                        action: request.action,
                        code: request.code,
                        language: currentLanguage || 'javascript',
                        diagnostic: request.diagnostic,
                        question: request.question,
                        rangeLabel: request.rangeLabel,
                    });
                    if (prompt) {
                        void sendMessage(prompt);
                    } else {
                        pendingSourceRangeRef.current = null;
                    }
                })
                .catch(() => {
                    pendingSourceRangeRef.current = null;
                    setError(I18n.t('Failed to build AI action prompt'));
                });
        },
        [sendMessage, currentLanguage, buildSourceRange],
    );

    return {
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
        retryLoadModels: doLoadModels,
    };
}
