import type { Types } from '@iobroker/type-detector';

/** A single message in the AI chat conversation */
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

/** Provider configuration loaded from adapter native config */
export interface ApiConfig {
    gptKey: string;
    claudeKey: string;
    geminiKey: string;
    deepseekKey: string;
    gptBaseUrl?: string;
    gptBaseUrlKey?: string;
}

/** Supported AI provider identifiers */
export type AiProviderName = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'custom';

/** Script language for AI chat context */
export type AiScriptLanguage = 'javascript' | 'typescript' | 'blockly';

/** Chat interaction mode */
export type AiChatMode = 'chat' | 'agent' | 'code';

/** Compact script info for cross-script analysis */
export interface ScriptInfo {
    id: string;
    name: string;
    source: string;
    engineType: string;
    enabled: boolean;
}

/** Result of searching for datapoint usage across scripts */
export interface DatapointUsage {
    scriptId: string;
    scriptName: string;
    usageType: 'read' | 'write' | 'subscribe' | 'exists';
    lineNumber: number;
    line: string;
}

/** Device state info */
export interface DeviceState {
    id: string;
    name: string;
    role?: string;
    type: ioBroker.CommonType;
    unit?: string;
    read: boolean;
    write: boolean;
}

/** Device object */
export interface DeviceObject {
    id: string;
    name: string;
    type: ioBroker.ObjectType;
    room?: string;
    function?: string;
    deviceType: Types;
    states: DeviceState[];
}

/** AI tool call from the model response */
export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

/** Chat message that may include tool calls or tool results */
export interface ChatApiMessage {
    role: string;
    content: string;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
}

/** Chat completion request parameters */
export interface ChatCompletionRequest {
    messages: ChatApiMessage[];
    model: string;
    provider: AiProviderName;
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    stream?: boolean;
    requestId?: string;
    tools?: unknown[];
}

/** Chat completion response */
export interface ChatCompletionResponse {
    success?: boolean;
    content?: string;
    error?: string;
    tool_calls?: ToolCall[];
}
