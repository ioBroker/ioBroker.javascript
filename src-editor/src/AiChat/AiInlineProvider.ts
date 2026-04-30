import type * as monacoEditor from 'monaco-editor';
import type { AdminConnection } from '@iobroker/adapter-react-v5';

const DEBOUNCE_MS = 800;

const SYSTEM_PROMPT = `You are a code completion engine for ioBroker JavaScript adapter scripts.
Complete the code at the cursor position marked with <CURSOR>.
Return ONLY the completion text, no explanation, no markdown fences, no comments about what you did.
If you cannot complete, return an empty string.
Available functions: on(), setState(), getState(), schedule(), sendTo(), log(), createState(), setStateDelayed(), existsState(), httpGet(), httpPost(), exec(), formatDate(), $(), wait(), toInt(), toFloat(), readFile(), writeFile().`;

interface PendingRequest {
    cancel: () => void;
}

let currentRequest: PendingRequest | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
// Cache which providers have stored credentials (reported by backend — keys stay server-side).
let cachedProviders: { providers: { provider: string; baseUrl?: string }[]; ts: number } | null = null;
const CONFIG_CACHE_TTL = 60_000;

export function registerAiInlineProvider(
    monaco: typeof monacoEditor,
    socket: AdminConnection,
    runningInstances: Record<string, unknown>,
): monacoEditor.IDisposable {
    const disposables: monacoEditor.IDisposable[] = [];

    for (const lang of ['javascript', 'typescript']) {
        const disposable = monaco.languages.registerInlineCompletionsProvider(lang, {
            disposeInlineCompletions(): void {
                // nothing to clean up
            },
            provideInlineCompletions(
                model: monacoEditor.editor.ITextModel,
                position: monacoEditor.Position,
                _context: monacoEditor.languages.InlineCompletionContext,
                token: monacoEditor.CancellationToken,
            ): Promise<monacoEditor.languages.InlineCompletions | undefined> {
                return new Promise(resolve => {
                    // Cancel any pending request
                    if (currentRequest) {
                        currentRequest.cancel();
                        currentRequest = null;
                    }
                    if (debounceTimer) {
                        clearTimeout(debounceTimer);
                    }

                    if (token.isCancellationRequested) {
                        resolve(undefined);
                        return;
                    }

                    debounceTimer = setTimeout(async () => {
                        if (token.isCancellationRequested) {
                            resolve(undefined);
                            return;
                        }

                        const instanceId = Object.keys(runningInstances)[0];
                        if (!instanceId) {
                            resolve(undefined);
                            return;
                        }

                        // Ask backend which providers have credentials (cached).
                        // Actual keys never leave the adapter.
                        if (!cachedProviders || Date.now() - cachedProviders.ts > CONFIG_CACHE_TTL) {
                            try {
                                const res: { providers?: { provider: string; baseUrl?: string }[] } =
                                    await socket.sendTo(instanceId, 'getAvailableAiProviders', {});
                                cachedProviders = { providers: res?.providers || [], ts: Date.now() };
                            } catch {
                                resolve(undefined);
                                return;
                            }
                        }

                        // Prefer local/custom (faster), then cloud providers.
                        const preferenceOrder = ['custom', 'openai', 'deepseek', 'anthropic', 'gemini'];
                        let provider = '';
                        let baseUrl = '';
                        for (const p of preferenceOrder) {
                            const hit = cachedProviders.providers.find(pr => pr.provider === p);
                            if (hit) {
                                // `custom` is routed as openai on the wire (same protocol); baseUrl triggers it backend-side.
                                provider = p === 'custom' ? 'openai' : p;
                                baseUrl = hit.baseUrl || '';
                                break;
                            }
                        }
                        if (!provider) {
                            resolve(undefined);
                            return;
                        }

                        // Get saved model or use first available
                        const savedModel = window.localStorage.getItem('openai-model') || '';

                        // Build context: lines before and after cursor
                        const totalLines = model.getLineCount();
                        const startLine = Math.max(1, position.lineNumber - 50);
                        const endLine = Math.min(totalLines, position.lineNumber + 10);

                        let codeBeforeCursor = '';
                        for (let i = startLine; i < position.lineNumber; i++) {
                            codeBeforeCursor += `${model.getLineContent(i)}\n`;
                        }
                        codeBeforeCursor += model.getLineContent(position.lineNumber).substring(0, position.column - 1);

                        let codeAfterCursor = model.getLineContent(position.lineNumber).substring(position.column - 1);
                        for (let i = position.lineNumber + 1; i <= endLine; i++) {
                            codeAfterCursor += `\n${model.getLineContent(i)}`;
                        }

                        let cancelled = false;
                        currentRequest = {
                            cancel: () => {
                                cancelled = true;
                            },
                        };

                        token.onCancellationRequested(() => {
                            cancelled = true;
                        });

                        try {
                            const result: { content?: string; error?: string } = await socket.sendTo(
                                instanceId,
                                'chatCompletion',
                                {
                                    timeout: 15000,
                                    ...(baseUrl ? { baseUrl } : {}),
                                    model: savedModel,
                                    provider,
                                    messages: [
                                        { role: 'system', content: SYSTEM_PROMPT },
                                        {
                                            role: 'user',
                                            content: `${codeBeforeCursor}<CURSOR>${codeAfterCursor}`,
                                        },
                                    ],
                                },
                            );

                            if (cancelled || token.isCancellationRequested) {
                                resolve(undefined);
                                return;
                            }

                            if (result.error || !result.content) {
                                resolve(undefined);
                                return;
                            }

                            let completion = result.content.trim();
                            // Strip markdown fences if present
                            const fenceMatch = completion.match(/```\w*\n?([\s\S]*?)```/);
                            if (fenceMatch) {
                                completion = fenceMatch[1].trim();
                            }

                            if (!completion) {
                                resolve(undefined);
                                return;
                            }

                            resolve({
                                items: [
                                    {
                                        insertText: completion,
                                        range: new monaco.Range(
                                            position.lineNumber,
                                            position.column,
                                            position.lineNumber,
                                            position.column,
                                        ),
                                    },
                                ],
                            });
                        } catch {
                            resolve(undefined);
                        }

                        currentRequest = null;
                    }, DEBOUNCE_MS);
                });
            },
        });
        disposables.push(disposable);
    }

    return {
        dispose: () => {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
            if (currentRequest) {
                currentRequest.cancel();
            }
            disposables.forEach(d => d.dispose());
        },
    };
}
