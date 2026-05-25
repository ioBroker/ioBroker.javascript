const assert = require('node:assert').strict;
const {
    translateToolsToAnthropic,
    translateMessagesToAnthropic,
    translateAnthropicResponseToOpenAI,
} = require('../build/lib/anthropicAdapter');

describe('Test Anthropic Adapter', function () {
    describe('translateToolsToAnthropic', function () {
        const openAITools = [
            {
                type: 'function',
                function: {
                    name: 'search_datapoints',
                    description: 'Search datapoints',
                    parameters: {
                        type: 'object',
                        properties: {
                            query: { type: 'string', description: 'Query' },
                            max_results: { type: 'number' },
                        },
                        required: ['query'],
                    },
                },
            },
            {
                type: 'function',
                function: {
                    name: 'list_scripts',
                    description: 'List all scripts',
                    parameters: { type: 'object', properties: {} },
                },
            },
        ];

        it('translates an OpenAI tool array to Anthropic shape', function () {
            const result = translateToolsToAnthropic(openAITools);
            assert.equal(result.length, 2);
            assert.deepEqual(result[0], {
                name: 'search_datapoints',
                description: 'Search datapoints',
                input_schema: openAITools[0].function.parameters,
            });
            assert.deepEqual(result[1], {
                name: 'list_scripts',
                description: 'List all scripts',
                input_schema: openAITools[1].function.parameters,
            });
        });

        it('uses parameters as input_schema (JSON Schema is shared)', function () {
            const result = translateToolsToAnthropic(openAITools);
            assert.equal(result[0].input_schema, openAITools[0].function.parameters);
        });

        it('provides a default empty object schema when parameters are missing', function () {
            const result = translateToolsToAnthropic([
                { type: 'function', function: { name: 'no_params' } },
            ]);
            assert.deepEqual(result[0].input_schema, { type: 'object', properties: {} });
        });

        it('skips tools without a function name', function () {
            const result = translateToolsToAnthropic([
                { type: 'function', function: {} },
                { type: 'function', function: { name: 'ok' } },
                null,
                { foo: 'bar' },
            ]);
            assert.equal(result.length, 1);
            assert.equal(result[0].name, 'ok');
        });

        it('handles empty / undefined / non-array input', function () {
            assert.deepEqual(translateToolsToAnthropic([]), []);
            assert.deepEqual(translateToolsToAnthropic(undefined), []);
            assert.deepEqual(translateToolsToAnthropic(null), []);
            assert.deepEqual(translateToolsToAnthropic('not an array'), []);
        });

        it('drops the description field cleanly when absent', function () {
            const result = translateToolsToAnthropic([
                { type: 'function', function: { name: 'x', parameters: { type: 'object' } } },
            ]);
            assert.equal(result[0].description, undefined);
        });
    });

    describe('translateMessagesToAnthropic', function () {
        it('extracts system messages into a top-level system field', function () {
            const { system, messages } = translateMessagesToAnthropic([
                { role: 'system', content: 'You are helpful.' },
                { role: 'user', content: 'Hi' },
            ]);
            assert.equal(system, 'You are helpful.');
            assert.deepEqual(messages, [{ role: 'user', content: 'Hi' }]);
        });

        it('joins multiple system messages with double newlines', function () {
            const { system } = translateMessagesToAnthropic([
                { role: 'system', content: 'Line 1' },
                { role: 'system', content: 'Line 2' },
                { role: 'user', content: 'Hi' },
            ]);
            assert.equal(system, 'Line 1\n\nLine 2');
        });

        it('converts assistant tool_calls into tool_use content blocks', function () {
            const { messages } = translateMessagesToAnthropic([
                { role: 'user', content: 'Find temperature' },
                {
                    role: 'assistant',
                    content: 'Let me search.',
                    tool_calls: [
                        {
                            id: 'call_1',
                            type: 'function',
                            function: {
                                name: 'search_datapoints',
                                arguments: '{"query":"temperature"}',
                            },
                        },
                    ],
                },
            ]);
            assert.equal(messages.length, 2);
            assert.deepEqual(messages[1], {
                role: 'assistant',
                content: [
                    { type: 'text', text: 'Let me search.' },
                    {
                        type: 'tool_use',
                        id: 'call_1',
                        name: 'search_datapoints',
                        input: { query: 'temperature' },
                    },
                ],
            });
        });

        it('parses tool_call arguments JSON; falls back to {} on bad JSON', function () {
            const { messages } = translateMessagesToAnthropic([
                {
                    role: 'assistant',
                    content: '',
                    tool_calls: [
                        {
                            id: 'c1',
                            type: 'function',
                            function: { name: 'f', arguments: 'not-json{' },
                        },
                    ],
                },
            ]);
            assert.deepEqual(messages[0].content[0], {
                type: 'tool_use',
                id: 'c1',
                name: 'f',
                input: {},
            });
        });

        it('wraps tool-result messages as user messages with tool_result blocks', function () {
            const { messages } = translateMessagesToAnthropic([
                { role: 'user', content: 'Find it' },
                {
                    role: 'assistant',
                    content: '',
                    tool_calls: [
                        { id: 'c1', type: 'function', function: { name: 'f', arguments: '{}' } },
                    ],
                },
                { role: 'tool', tool_call_id: 'c1', content: 'found: lamp.state' },
            ]);
            assert.equal(messages.length, 3);
            assert.deepEqual(messages[2], {
                role: 'user',
                content: [{ type: 'tool_result', tool_use_id: 'c1', content: 'found: lamp.state' }],
            });
        });

        it('groups consecutive tool results into one user message (Anthropic requirement)', function () {
            const { messages } = translateMessagesToAnthropic([
                {
                    role: 'assistant',
                    content: '',
                    tool_calls: [
                        { id: 'c1', type: 'function', function: { name: 'f', arguments: '{}' } },
                        { id: 'c2', type: 'function', function: { name: 'g', arguments: '{}' } },
                    ],
                },
                { role: 'tool', tool_call_id: 'c1', content: 'r1' },
                { role: 'tool', tool_call_id: 'c2', content: 'r2' },
                { role: 'user', content: 'Thanks' },
            ]);
            const toolResultMsg = messages.find(m => Array.isArray(m.content) && m.content[0]?.type === 'tool_result');
            assert.notEqual(toolResultMsg, undefined);
            assert.equal(toolResultMsg.content.length, 2);
            assert.deepEqual(toolResultMsg.content.map(b => b.tool_use_id), ['c1', 'c2']);
        });

        it('stringifies non-string tool_result content', function () {
            const { messages } = translateMessagesToAnthropic([
                { role: 'tool', tool_call_id: 'c1', content: { key: 'value' } },
            ]);
            assert.equal(messages[0].content[0].content, JSON.stringify({ key: 'value' }));
        });

        it('omits assistant messages that have neither text nor tool_calls', function () {
            const { messages } = translateMessagesToAnthropic([
                { role: 'user', content: 'Hi' },
                { role: 'assistant', content: '' },
            ]);
            assert.equal(messages.length, 1);
        });

        it('omits empty user messages', function () {
            const { messages } = translateMessagesToAnthropic([
                { role: 'user', content: '' },
                { role: 'user', content: 'Real message' },
            ]);
            assert.equal(messages.length, 1);
            assert.equal(messages[0].content, 'Real message');
        });

        it('handles empty/invalid input gracefully', function () {
            assert.deepEqual(translateMessagesToAnthropic([]), { system: '', messages: [] });
            assert.deepEqual(translateMessagesToAnthropic(undefined), { system: '', messages: [] });
            assert.deepEqual(translateMessagesToAnthropic(null), { system: '', messages: [] });
        });

        it('handles assistant messages with text but no tool_calls', function () {
            const { messages } = translateMessagesToAnthropic([
                { role: 'assistant', content: 'Just text' },
            ]);
            assert.deepEqual(messages[0], {
                role: 'assistant',
                content: [{ type: 'text', text: 'Just text' }],
            });
        });

        it('drops invalid tool_calls (missing id or function.name)', function () {
            const { messages } = translateMessagesToAnthropic([
                {
                    role: 'assistant',
                    content: '',
                    tool_calls: [
                        { id: '', type: 'function', function: { name: 'f', arguments: '{}' } },
                        { id: 'c2', type: 'function', function: { arguments: '{}' } },
                        { id: 'c3', type: 'function', function: { name: 'valid', arguments: '{}' } },
                    ],
                },
            ]);
            assert.equal(messages.length, 1);
            assert.equal(messages[0].content.length, 1);
            assert.equal(messages[0].content[0].name, 'valid');
        });
    });

    describe('translateAnthropicResponseToOpenAI', function () {
        it('extracts text content and returns OpenAI-style shape', function () {
            const result = translateAnthropicResponseToOpenAI({
                content: [{ type: 'text', text: 'Hello, world.' }],
                stop_reason: 'end_turn',
            });
            assert.deepEqual(result, { content: 'Hello, world.' });
        });

        it('concatenates multiple text blocks with newlines', function () {
            const result = translateAnthropicResponseToOpenAI({
                content: [
                    { type: 'text', text: 'Line 1' },
                    { type: 'text', text: 'Line 2' },
                ],
            });
            assert.equal(result.content, 'Line 1\nLine 2');
        });

        it('converts tool_use blocks to OpenAI tool_calls (arguments stringified)', function () {
            const result = translateAnthropicResponseToOpenAI({
                content: [
                    { type: 'text', text: 'Let me check.' },
                    {
                        type: 'tool_use',
                        id: 'toolu_abc',
                        name: 'search_datapoints',
                        input: { query: 'temperature', max_results: 5 },
                    },
                ],
                stop_reason: 'tool_use',
            });
            assert.equal(result.content, 'Let me check.');
            assert.equal(result.tool_calls.length, 1);
            assert.deepEqual(result.tool_calls[0], {
                id: 'toolu_abc',
                type: 'function',
                function: {
                    name: 'search_datapoints',
                    arguments: JSON.stringify({ query: 'temperature', max_results: 5 }),
                },
            });
        });

        it('handles response with only tool_use blocks (no text)', function () {
            const result = translateAnthropicResponseToOpenAI({
                content: [
                    {
                        type: 'tool_use',
                        id: 't1',
                        name: 'list_scripts',
                        input: {},
                    },
                ],
            });
            assert.equal(result.content, '');
            assert.equal(result.tool_calls.length, 1);
            assert.equal(result.tool_calls[0].function.arguments, '{}');
        });

        it('handles multiple tool_use blocks', function () {
            const result = translateAnthropicResponseToOpenAI({
                content: [
                    { type: 'tool_use', id: 't1', name: 'f1', input: { a: 1 } },
                    { type: 'tool_use', id: 't2', name: 'f2', input: { b: 2 } },
                ],
            });
            assert.equal(result.tool_calls.length, 2);
            assert.deepEqual(result.tool_calls.map(tc => tc.id), ['t1', 't2']);
        });

        it('omits tool_calls when none are present', function () {
            const result = translateAnthropicResponseToOpenAI({
                content: [{ type: 'text', text: 'Plain response' }],
            });
            assert.ok(!Object.prototype.hasOwnProperty.call(result, 'tool_calls'));
        });

        it('handles empty/invalid response gracefully', function () {
            assert.deepEqual(translateAnthropicResponseToOpenAI(null), { content: '' });
            assert.deepEqual(translateAnthropicResponseToOpenAI(undefined), { content: '' });
            assert.deepEqual(translateAnthropicResponseToOpenAI({}), { content: '' });
            assert.deepEqual(translateAnthropicResponseToOpenAI({ content: null }), { content: '' });
        });

        it('ignores unknown content-block types', function () {
            const result = translateAnthropicResponseToOpenAI({
                content: [
                    { type: 'text', text: 'Known' },
                    { type: 'unknown_future_block', data: 'ignored' },
                    { type: 'tool_use', id: 'x', name: 'y', input: {} },
                ],
            });
            assert.equal(result.content, 'Known');
            assert.equal(result.tool_calls.length, 1);
        });

        it('tool_use with no input serializes to {}', function () {
            const result = translateAnthropicResponseToOpenAI({
                content: [{ type: 'tool_use', id: 't', name: 'f' }],
            });
            assert.equal(result.tool_calls[0].function.arguments, '{}');
        });
    });

    describe('round-trip integrity', function () {
        it('OpenAI messages → Anthropic → parsable content blocks', function () {
            const { messages } = translateMessagesToAnthropic([
                { role: 'system', content: 'sys' },
                { role: 'user', content: 'Hi' },
                {
                    role: 'assistant',
                    content: 'Checking',
                    tool_calls: [
                        {
                            id: 'c1',
                            type: 'function',
                            function: { name: 'get_state_value', arguments: '{"id":"x.y"}' },
                        },
                    ],
                },
                { role: 'tool', tool_call_id: 'c1', content: '42' },
                { role: 'user', content: 'Thanks' },
            ]);

            // Assistant message must have the tool_use block intact
            const assistant = messages.find(m => m.role === 'assistant');
            const toolUse = assistant.content.find(b => b.type === 'tool_use');
            assert.deepEqual(toolUse.input, { id: 'x.y' });

            // Tool-result wrapped as user message
            const toolResult = messages.find(
                m => Array.isArray(m.content) && m.content[0]?.type === 'tool_result',
            );
            assert.equal(toolResult.content[0].tool_use_id, 'c1');
            assert.equal(toolResult.content[0].content, '42');
        });

        it('Anthropic response → OpenAI-shape round-trip preserves tool call IDs', function () {
            const anthropicResponse = {
                content: [
                    { type: 'text', text: 'I will search.' },
                    {
                        type: 'tool_use',
                        id: 'toolu_01abc',
                        name: 'search_datapoints',
                        input: { query: 'lamp', max_results: 10 },
                    },
                ],
            };
            const openAIStyle = translateAnthropicResponseToOpenAI(anthropicResponse);
            assert.equal(openAIStyle.tool_calls[0].id, 'toolu_01abc');

            // Now feed it back — simulates the continuation round
            const { messages } = translateMessagesToAnthropic([
                {
                    role: 'assistant',
                    content: openAIStyle.content,
                    tool_calls: openAIStyle.tool_calls,
                },
                { role: 'tool', tool_call_id: 'toolu_01abc', content: 'result' },
            ]);

            const toolResult = messages.find(
                m => Array.isArray(m.content) && m.content.some(b => b.type === 'tool_result'),
            );
            assert.equal(toolResult.content[0].tool_use_id, 'toolu_01abc');
        });
    });
});
