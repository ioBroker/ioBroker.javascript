import { describe, it, expect, vi } from 'vitest';
import { executeToolCall } from '../AiToolExecutor';
import type { EditorApi, ToolCall } from '../AiChatTypes';

/** Minimal stub socket — editor tools never touch it. */
const stubSocket = {} as any;

function toolCall(name: string, args: Record<string, unknown> = {}): ToolCall {
    return {
        id: 'test_1',
        type: 'function',
        function: { name, arguments: JSON.stringify(args) },
    };
}

describe('editor tool handlers', () => {
    describe('get_editor_selection', () => {
        it('returns the selection when the editor has one', async () => {
            const api: EditorApi = {
                getSelection: () => ({
                    text: 'setState',
                    range: { startLine: 3, startColumn: 1, endLine: 3, endColumn: 9 },
                }),
            };
            const res = JSON.parse(await executeToolCall(stubSocket, toolCall('get_editor_selection'), [], api));
            expect(res.text).toBe('setState');
            expect(res.range.startLine).toBe(3);
        });

        it('returns a friendly message when nothing is selected', async () => {
            const api: EditorApi = { getSelection: () => null };
            const res = JSON.parse(await executeToolCall(stubSocket, toolCall('get_editor_selection'), [], api));
            expect(res.message).toContain('No text');
        });

        it('returns editorApiMissing when no editor is available', async () => {
            const res = JSON.parse(await executeToolCall(stubSocket, toolCall('get_editor_selection'), []));
            expect(res.error).toContain('Editor is not available');
        });
    });

    describe('get_editor_content', () => {
        it('returns the full content', async () => {
            const api: EditorApi = { getContent: () => 'const x = 1;\nlog(x);' };
            const res = JSON.parse(await executeToolCall(stubSocket, toolCall('get_editor_content'), [], api));
            expect(res.content).toBe('const x = 1;\nlog(x);');
        });

        it('returns editorApiMissing when no editor', async () => {
            const res = JSON.parse(await executeToolCall(stubSocket, toolCall('get_editor_content'), []));
            expect(res.error).toContain('Editor is not available');
        });
    });

    describe('get_cursor_position', () => {
        it('returns the cursor position', async () => {
            const api: EditorApi = { getCursorPosition: () => ({ line: 12, column: 5 }) };
            const res = JSON.parse(await executeToolCall(stubSocket, toolCall('get_cursor_position'), [], api));
            expect(res).toEqual({ line: 12, column: 5 });
        });

        it('returns a friendly message when editor is unfocused', async () => {
            const api: EditorApi = { getCursorPosition: () => null };
            const res = JSON.parse(await executeToolCall(stubSocket, toolCall('get_cursor_position'), [], api));
            expect(res.message).toContain('not focused');
        });
    });

    describe('highlight_text_in_editor', () => {
        it('reports the number of matches', async () => {
            const api: EditorApi = { highlightText: vi.fn().mockReturnValue(3) };
            const res = JSON.parse(
                await executeToolCall(stubSocket, toolCall('highlight_text_in_editor', { text: 'setState' }), [], api),
            );
            expect(res.matches).toBe(3);
            expect(res.message).toContain('Highlighted');
            expect(api.highlightText).toHaveBeenCalledWith('setState');
        });

        it('reports 0 matches with a clear message', async () => {
            const api: EditorApi = { highlightText: () => 0 };
            const res = JSON.parse(
                await executeToolCall(
                    stubSocket,
                    toolCall('highlight_text_in_editor', { text: 'nonexistent' }),
                    [],
                    api,
                ),
            );
            expect(res.matches).toBe(0);
            expect(res.message).toContain('not found');
        });
    });

    describe('highlight_line_range', () => {
        it('forwards start/end to the api', async () => {
            const api: EditorApi = { highlightLineRange: vi.fn().mockReturnValue(true) };
            const res = JSON.parse(
                await executeToolCall(
                    stubSocket,
                    toolCall('highlight_line_range', { start_line: 10, end_line: 20 }),
                    [],
                    api,
                ),
            );
            expect(res.success).toBe(true);
            expect(res.message).toContain('10-20');
            expect(api.highlightLineRange).toHaveBeenCalledWith(10, 20);
        });

        it('reports failure', async () => {
            const api: EditorApi = { highlightLineRange: () => false };
            const res = JSON.parse(
                await executeToolCall(
                    stubSocket,
                    toolCall('highlight_line_range', { start_line: 1, end_line: 2 }),
                    [],
                    api,
                ),
            );
            expect(res.success).toBe(false);
        });
    });

    describe('go_to_line', () => {
        it('forwards line and column', async () => {
            const api: EditorApi = { goToLine: vi.fn().mockReturnValue(true) };
            await executeToolCall(stubSocket, toolCall('go_to_line', { line: 42, column: 8 }), [], api);
            expect(api.goToLine).toHaveBeenCalledWith(42, 8);
        });

        it('works without column', async () => {
            const api: EditorApi = { goToLine: vi.fn().mockReturnValue(true) };
            await executeToolCall(stubSocket, toolCall('go_to_line', { line: 5 }), [], api);
            expect(api.goToLine).toHaveBeenCalledWith(5, undefined);
        });
    });

    describe('insert_text_at_cursor', () => {
        it('forwards the text', async () => {
            const api: EditorApi = { insertTextAtCursor: vi.fn().mockReturnValue(true) };
            const res = JSON.parse(
                await executeToolCall(stubSocket, toolCall('insert_text_at_cursor', { text: 'log("hi");' }), [], api),
            );
            expect(res.success).toBe(true);
            expect(api.insertTextAtCursor).toHaveBeenCalledWith('log("hi");');
        });
    });

    describe('replace_selection', () => {
        it('succeeds when selection exists', async () => {
            const api: EditorApi = { replaceSelection: () => true };
            const res = JSON.parse(
                await executeToolCall(stubSocket, toolCall('replace_selection', { text: 'x' }), [], api),
            );
            expect(res.success).toBe(true);
        });

        it('reports when nothing is selected', async () => {
            const api: EditorApi = { replaceSelection: () => false };
            const res = JSON.parse(
                await executeToolCall(stubSocket, toolCall('replace_selection', { text: 'x' }), [], api),
            );
            expect(res.success).toBe(false);
            expect(res.message).toContain('No text was selected');
        });
    });

    describe('get_diagnostics', () => {
        it('returns the diagnostics list', async () => {
            const api: EditorApi = {
                getDiagnostics: () => [
                    { line: 1, column: 1, endLine: 1, endColumn: 5, severity: 'error', message: 'oops' },
                    { line: 5, column: 3, endLine: 5, endColumn: 7, severity: 'warning', message: 'maybe' },
                ],
            };
            const res = JSON.parse(await executeToolCall(stubSocket, toolCall('get_diagnostics'), [], api));
            expect(res.count).toBe(2);
            expect(res.diagnostics[0].severity).toBe('error');
        });

        it('returns empty list when model is clean', async () => {
            const api: EditorApi = { getDiagnostics: () => [] };
            const res = JSON.parse(await executeToolCall(stubSocket, toolCall('get_diagnostics'), [], api));
            expect(res.count).toBe(0);
            expect(res.diagnostics).toEqual([]);
        });
    });

    describe('get_document_symbols', () => {
        it('returns async symbol list', async () => {
            const api: EditorApi = {
                getSymbols: () =>
                    Promise.resolve([
                        { name: 'myFunc', kind: 'function', line: 3, endLine: 10 },
                        { name: 'CONST_VAL', kind: 'variable', line: 12, endLine: 12 },
                    ]),
            };
            const res = JSON.parse(await executeToolCall(stubSocket, toolCall('get_document_symbols'), [], api));
            expect(res.count).toBe(2);
            expect(res.symbols[0].name).toBe('myFunc');
        });

        it('returns editorApiMissing when getSymbols is absent', async () => {
            const res = JSON.parse(await executeToolCall(stubSocket, toolCall('get_document_symbols'), [], {}));
            expect(res.error).toContain('Editor is not available');
        });
    });

    describe('run_script', () => {
        it('sends an "execute" message to the instance and returns the collected logs', async () => {
            const sendTo = vi.fn().mockResolvedValue({
                ok: true,
                engineType: 'Javascript/js',
                runtime: 5000,
                truncated: false,
                logs: [{ ts: 1, severity: 'info', message: 'hello' }],
                output: '[info] hello',
            });
            const socket = { sendTo } as any;
            const res = JSON.parse(
                await executeToolCall(
                    socket,
                    toolCall('run_script', { source: 'log("hello");' }),
                    [],
                    undefined,
                    'javascript.0',
                ),
            );
            expect(sendTo).toHaveBeenCalledWith('javascript.0', 'execute', {
                source: 'log("hello");',
                engineType: undefined,
                timeout: undefined,
                logLevel: undefined,
            });
            expect(res.logCount).toBe(1);
            expect(res.output).toBe('[info] hello');
            expect(res.logs[0].message).toBe('hello');
        });

        it('reports an error when no instance is available', async () => {
            const res = JSON.parse(
                await executeToolCall(stubSocket, toolCall('run_script', { source: 'log(1);' }), [], undefined),
            );
            expect(res.error).toContain('No running javascript instance');
        });

        it('reports an error when no source is provided', async () => {
            const socket = { sendTo: vi.fn() } as any;
            const res = JSON.parse(
                await executeToolCall(socket, toolCall('run_script', {}), [], undefined, 'javascript.0'),
            );
            expect(res.error).toContain('No source code');
        });

        it('surfaces a backend execution error', async () => {
            const socket = {
                sendTo: vi.fn().mockResolvedValue({ ok: false, error: 'TypeScript compilation failed', logs: [] }),
            } as any;
            const res = JSON.parse(
                await executeToolCall(
                    socket,
                    toolCall('run_script', { source: 'const x: =' }),
                    [],
                    undefined,
                    'javascript.0',
                ),
            );
            expect(res.error).toContain('TypeScript compilation failed');
        });
    });

    describe('backward compatibility', () => {
        it('existing ioBroker tools still work without editorApi', async () => {
            const res = JSON.parse(await executeToolCall(stubSocket, toolCall('unknown_tool_name'), []));
            expect(res.error).toContain('Unknown tool');
        });

        it('editorApi=undefined does not break any handler (all return editorApiMissing)', async () => {
            const editorToolNames = [
                'get_editor_selection',
                'get_editor_content',
                'get_cursor_position',
                'highlight_text_in_editor',
                'highlight_line_range',
                'go_to_line',
                'insert_text_at_cursor',
                'replace_selection',
                'get_diagnostics',
                'get_document_symbols',
            ];
            for (const name of editorToolNames) {
                const res = JSON.parse(
                    await executeToolCall(
                        stubSocket,
                        toolCall(name, { text: 'x', start_line: 1, end_line: 1, line: 1 }),
                        [],
                    ),
                );
                expect(res.error).toContain('Editor is not available');
            }
        });
    });
});
