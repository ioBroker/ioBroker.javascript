/**
 * Translation layer between OpenAI-style chat-completion messages/tools and
 * Anthropic's native Messages API.
 *
 * The frontend (AiChatService / useAiChat) always speaks the OpenAI format:
 *   - tools[] = [{ type: 'function', function: { name, description, parameters } }]
 *   - assistant message with tool_calls[] = [{ id, type: 'function', function: { name, arguments } }]
 *   - tool-result message with { role: 'tool', tool_call_id, content }
 *   - response = { content, tool_calls? }
 *
 * Anthropic's API uses a different shape:
 *   - tools[] = [{ name, description, input_schema }]
 *   - assistant message content = [{ type: 'text', text }, { type: 'tool_use', id, name, input }]
 *   - tool-result = user message with content = [{ type: 'tool_result', tool_use_id, content }]
 *   - response body = { content: [text/tool_use blocks], stop_reason }
 *
 * These functions are pure so they can be unit-tested in isolation.
 */

export interface OpenAITool {
    type: 'function';
    function: {
        name: string;
        description?: string;
        parameters?: unknown;
    };
}

export interface AnthropicTool {
    name: string;
    description?: string;
    input_schema: unknown;
}

export interface OpenAIToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

export interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content?: string | null;
    tool_calls?: OpenAIToolCall[];
    tool_call_id?: string;
    name?: string;
}

type AnthropicContentBlock =
    | { type: 'text'; text: string }
    | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
    | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

export interface AnthropicMessage {
    role: 'user' | 'assistant';
    content: string | AnthropicContentBlock[];
}

export interface AnthropicResponse {
    content?: AnthropicContentBlock[];
    stop_reason?: string;
    [key: string]: unknown;
}

/** Translate OpenAI function-tool definitions to Anthropic tool definitions. */
export function translateToolsToAnthropic(tools: unknown[] | undefined | null): AnthropicTool[] {
    if (!Array.isArray(tools)) {
        return [];
    }
    const result: AnthropicTool[] = [];
    for (const t of tools) {
        // Only `function`-type tools are supported. Anthropic uses a flat shape.
        const tool = t as OpenAITool;
        const fn = tool?.function;
        if (!fn?.name) {
            continue;
        }
        result.push({
            name: fn.name,
            description: fn.description,
            // OpenAI's `parameters` and Anthropic's `input_schema` share the JSON Schema shape.
            // If none is provided, Anthropic still requires an object schema.
            input_schema: fn.parameters || { type: 'object', properties: {} },
        });
    }
    return result;
}

/** Safe JSON.parse that returns an object on failure so we never throw mid-translation. */
function safeParseArgs(args: string | undefined): Record<string, unknown> {
    if (!args) {
        return {};
    }
    try {
        const parsed: unknown = JSON.parse(args);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
        }
        return {};
    } catch {
        return {};
    }
}

/**
 * Translate a flat OpenAI-style message array into Anthropic's content-block format.
 *  System messages are extracted and returned separately (Anthropic takes `system`
 *  as a top-level request field, not an inline message).
 */
export function translateMessagesToAnthropic(messages: OpenAIMessage[] | undefined | null): {
    system: string;
    messages: AnthropicMessage[];
} {
    if (!Array.isArray(messages)) {
        return { system: '', messages: [] };
    }

    const systemChunks: string[] = [];
    const out: AnthropicMessage[] = [];
    // Pending tool-results that must be grouped into a single `user` message per Anthropic's rules.
    let pendingToolResults: AnthropicContentBlock[] = [];

    const flushToolResults = (): void => {
        if (pendingToolResults.length) {
            out.push({ role: 'user', content: pendingToolResults });
            pendingToolResults = [];
        }
    };

    for (const m of messages) {
        if (!m || typeof m !== 'object') {
            continue;
        }

        if (m.role === 'system') {
            if (typeof m.content === 'string' && m.content) {
                systemChunks.push(m.content);
            }
            continue;
        }

        if (m.role === 'tool') {
            // Tool results accumulate; they're flushed when the next non-tool message appears.
            pendingToolResults.push({
                type: 'tool_result',
                tool_use_id: m.tool_call_id || '',
                content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content ?? ''),
            });
            continue;
        }

        flushToolResults();

        if (m.role === 'assistant') {
            const blocks: AnthropicContentBlock[] = [];
            if (typeof m.content === 'string' && m.content) {
                blocks.push({ type: 'text', text: m.content });
            }
            if (Array.isArray(m.tool_calls)) {
                for (const tc of m.tool_calls) {
                    if (!tc?.id || !tc.function?.name) {
                        continue;
                    }
                    blocks.push({
                        type: 'tool_use',
                        id: tc.id,
                        name: tc.function.name,
                        input: safeParseArgs(tc.function.arguments),
                    });
                }
            }
            // Anthropic requires a non-empty content array for assistant messages.
            if (blocks.length) {
                out.push({ role: 'assistant', content: blocks });
            }
            continue;
        }

        if (m.role === 'user') {
            // Plain text user message. Content blocks aren't needed here.
            const text = typeof m.content === 'string' ? m.content : '';
            if (text) {
                out.push({ role: 'user', content: text });
            }
            continue;
        }
    }

    flushToolResults();

    return { system: systemChunks.join('\n\n'), messages: out };
}

/**
 * Translate an Anthropic Messages API response back into the OpenAI-style
 *  `{ content, tool_calls }` shape that our frontend already understands.
 */
export function translateAnthropicResponseToOpenAI(response: AnthropicResponse | undefined | null): {
    content: string;
    tool_calls?: OpenAIToolCall[];
} {
    if (!response || !Array.isArray(response.content)) {
        return { content: '' };
    }
    const textParts: string[] = [];
    const toolCalls: OpenAIToolCall[] = [];
    for (const block of response.content) {
        if (!block || typeof block !== 'object') {
            continue;
        }
        if (block.type === 'text' && typeof (block as { text?: unknown }).text === 'string') {
            textParts.push((block as { text: string }).text);
        } else if (block.type === 'tool_use') {
            const tu = block as { id?: string; name?: string; input?: unknown };
            toolCalls.push({
                id: tu.id || '',
                type: 'function',
                function: {
                    name: tu.name || '',
                    arguments: JSON.stringify(tu.input ?? {}),
                },
            });
        }
    }
    const result: { content: string; tool_calls?: OpenAIToolCall[] } = {
        content: textParts.join('\n'),
    };
    if (toolCalls.length) {
        result.tool_calls = toolCalls;
    }
    return result;
}
