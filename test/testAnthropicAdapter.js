const expect = require('chai').expect;
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
            expect(result).to.have.lengthOf(2);
            expect(result[0]).to.deep.equal({
                name: 'search_datapoints',
                description: 'Search datapoints',
                input_schema: openAITools[0].function.parameters,
            });
            expect(result[1]).to.deep.equal({
                name: 'list_scripts',
                description: 'List all scripts',
                input_schema: openAITools[1].function.parameters,
            });
        });

        it('uses parameters as input_schema (JSON Schema is shared)', function () {
            const result = translateToolsToAnthropic(openAITools);
            expect(result[0].input_schema).to.equal(openAITools[0].function.parameters);
        });

        it('provides a default empty object schema when parameters are missing', function () {
            const result = translateToolsToAnthropic([
                { type: 'function', function: { name: 'no_params' } },
            ]);
            expect(result[0].input_schema).to.deep.equal({ type: 'object', properties: {} });
        });

        it('skips tools without a function name', function () {
            const result = translateToolsToAnthropic([
                { type: 'function', function: {} },
                { type: 'function', function: { name: 'ok' } },
                null,
                { foo: 'bar' },
            ]);
            expect(result).to.have.lengthOf(1);
            expect(result[0].name).to.equal('ok');
        });

        it('handles empty / undefined / non-array input', function () {
            expect(translateToolsToAnthropic([])).to.deep.equal([]);
            expect(translateToolsToAnthropic(undefined)).to.deep.equal([]);
            expect(translateToolsToAnthropic(null)).to.deep.equal([]);
            expect(translateToolsToAnthropic('not an array')).to.deep.equal([]);
        });

        it('drops the description field cleanly when absent', function () {
            const result = translateToolsToAnthropic([
                { type: 'function', function: { name: 'x', parameters: { type: 'object' } } },
            ]);
            expect(result[0].description).to.equal(undefined);
        });
    });

    describe('translateMessagesToAnthropic', function () {
        it('extracts system messages into a top-level system field', function () {
            const { system, messages } = translateMessagesToAnthropic([
                { role: 'system', content: 'You are helpful.' },
                { role: 'user', content: 'Hi' },
            ]);
            expect(system).to.equal('You are helpful.');
            expect(messages).to.deep.equal([{ role: 'user', content: 'Hi' }]);
        });

        it('joins multiple system messages with double newlines', function () {
            const { system } = translateMessagesToAnthropic([
                { role: 'system', content: 'Line 1' },
                { role: 'system', content: 'Line 2' },
                { role: 'user', content: 'Hi' },
            ]);
            expect(system).to.equal('Line 1\n\nLine 2');
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
            expect(messages).to.have.lengthOf(2);
            expect(messages[1]).to.deep.equal({
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
            expect(messages[0].content[0]).to.deep.equal({
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
            expect(messages).to.have.lengthOf(3);
            expect(messages[2]).to.deep.equal({
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
            expect(toolResultMsg).to.not.equal(undefined);
            expect(toolResultMsg.content).to.have.lengthOf(2);
            expect(toolResultMsg.content.map(b => b.tool_use_id)).to.deep.equal(['c1', 'c2']);
        });

        it('stringifies non-string tool_result content', function () {
            const { messages } = translateMessagesToAnthropic([
                { role: 'tool', tool_call_id: 'c1', content: { key: 'value' } },
            ]);
            expect(messages[0].content[0].content).to.equal(JSON.stringify({ key: 'value' }));
        });

        it('omits assistant messages that have neither text nor tool_calls', function () {
            const { messages } = translateMessagesToAnthropic([
                { role: 'user', content: 'Hi' },
                { role: 'assistant', content: '' },
            ]);
            expect(messages).to.have.lengthOf(1);
        });

        it('omits empty user messages', function () {
            const { messages } = translateMessagesToAnthropic([
                { role: 'user', content: '' },
                { role: 'user', content: 'Real message' },
            ]);
            expect(messages).to.have.lengthOf(1);
            expect(messages[0].content).to.equal('Real message');
        });

        it('handles empty/invalid input gracefully', function () {
            expect(translateMessagesToAnthropic([])).to.deep.equal({ system: '', messages: [] });
            expect(translateMessagesToAnthropic(undefined)).to.deep.equal({ system: '', messages: [] });
            expect(translateMessagesToAnthropic(null)).to.deep.equal({ system: '', messages: [] });
        });

        it('handles assistant messages with text but no tool_calls', function () {
            const { messages } = translateMessagesToAnthropic([
                { role: 'assistant', content: 'Just text' },
            ]);
            expect(messages[0]).to.deep.equal({
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
            expect(messages).to.have.lengthOf(1);
            expect(messages[0].content).to.have.lengthOf(1);
            expect(messages[0].content[0].name).to.equal('valid');
        });
    });

    describe('translateAnthropicResponseToOpenAI', function () {
        it('extracts text content and returns OpenAI-style shape', function () {
            const result = translateAnthropicResponseToOpenAI({
                content: [{ type: 'text', text: 'Hello, world.' }],
                stop_reason: 'end_turn',
            });
            expect(result).to.deep.equal({ content: 'Hello, world.' });
        });

        it('concatenates multiple text blocks with newlines', function () {
            const result = translateAnthropicResponseToOpenAI({
                content: [
                    { type: 'text', text: 'Line 1' },
                    { type: 'text', text: 'Line 2' },
                ],
            });
            expect(result.content).to.equal('Line 1\nLine 2');
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
            expect(result.content).to.equal('Let me check.');
            expect(result.tool_calls).to.have.lengthOf(1);
            expect(result.tool_calls[0]).to.deep.equal({
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
            expect(result.content).to.equal('');
            expect(result.tool_calls).to.have.lengthOf(1);
            expect(result.tool_calls[0].function.arguments).to.equal('{}');
        });

        it('handles multiple tool_use blocks', function () {
            const result = translateAnthropicResponseToOpenAI({
                content: [
                    { type: 'tool_use', id: 't1', name: 'f1', input: { a: 1 } },
                    { type: 'tool_use', id: 't2', name: 'f2', input: { b: 2 } },
                ],
            });
            expect(result.tool_calls).to.have.lengthOf(2);
            expect(result.tool_calls.map(tc => tc.id)).to.deep.equal(['t1', 't2']);
        });

        it('omits tool_calls when none are present', function () {
            const result = translateAnthropicResponseToOpenAI({
                content: [{ type: 'text', text: 'Plain response' }],
            });
            expect(result).to.not.have.property('tool_calls');
        });

        it('handles empty/invalid response gracefully', function () {
            expect(translateAnthropicResponseToOpenAI(null)).to.deep.equal({ content: '' });
            expect(translateAnthropicResponseToOpenAI(undefined)).to.deep.equal({ content: '' });
            expect(translateAnthropicResponseToOpenAI({})).to.deep.equal({ content: '' });
            expect(translateAnthropicResponseToOpenAI({ content: null })).to.deep.equal({ content: '' });
        });

        it('ignores unknown content-block types', function () {
            const result = translateAnthropicResponseToOpenAI({
                content: [
                    { type: 'text', text: 'Known' },
                    { type: 'unknown_future_block', data: 'ignored' },
                    { type: 'tool_use', id: 'x', name: 'y', input: {} },
                ],
            });
            expect(result.content).to.equal('Known');
            expect(result.tool_calls).to.have.lengthOf(1);
        });

        it('tool_use with no input serializes to {}', function () {
            const result = translateAnthropicResponseToOpenAI({
                content: [{ type: 'tool_use', id: 't', name: 'f' }],
            });
            expect(result.tool_calls[0].function.arguments).to.equal('{}');
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
            expect(toolUse.input).to.deep.equal({ id: 'x.y' });

            // Tool-result wrapped as user message
            const toolResult = messages.find(
                m => Array.isArray(m.content) && m.content[0]?.type === 'tool_result',
            );
            expect(toolResult.content[0].tool_use_id).to.equal('c1');
            expect(toolResult.content[0].content).to.equal('42');
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
            expect(openAIStyle.tool_calls[0].id).to.equal('toolu_01abc');

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
            expect(toolResult.content[0].tool_use_id).to.equal('toolu_01abc');
        });
    });
});
