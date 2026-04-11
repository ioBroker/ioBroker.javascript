import type * as monacoEditor from 'monaco-editor';
import type { AdminConnection } from '@iobroker/adapter-react-v5';

// Patterns that trigger datapoint autocomplete
const TRIGGER_PATTERNS = [
    /getState\s*\(\s*['"`]$/,
    /setState\s*\(\s*['"`]$/,
    /setStateChanged\s*\(\s*['"`]$/,
    /setStateDelayed\s*\(\s*['"`]$/,
    /existsState\s*\(\s*['"`]$/,
    /existsObject\s*\(\s*['"`]$/,
    /getObject\s*\(\s*['"`]$/,
    /on\s*\(\s*['"`]$/,
    /once\s*\(\s*['"`]$/,
    /subscribe\s*\(\s*['"`]$/,
    /on\s*\(\s*\{\s*id\s*:\s*['"`]$/,
    /\$\s*\(\s*['"`]$/,
];

interface ObjectInfo {
    id: string;
    name: string;
    type?: string;
    role?: string;
    unit?: string;
    room?: string;
    func?: string;
    read?: boolean;
    write?: boolean;
}

let objectCache: ObjectInfo[] | null = null;
let objectCachePromise: Promise<ObjectInfo[]> | null = null;

function getText(text: ioBroker.StringOrTranslated, lang: string): string {
    if (text && typeof text === 'object') {
        return (text as Record<string, string>)[lang] || (text as Record<string, string>).en || '';
    }
    return text || '';
}

async function loadObjects(socket: AdminConnection): Promise<ObjectInfo[]> {
    if (objectCache) {
        return objectCache;
    }
    if (objectCachePromise) {
        return objectCachePromise;
    }

    objectCachePromise = (async () => {
        const lang = (window.systemLang || 'en') as string;
        const states = await socket.getObjectViewSystem('state', '', '\u9999');
        const enums = await socket.getObjectViewSystem('enum', '', '\u9999');

        // Build room/function lookup
        const roomMap: Record<string, string> = {};
        const funcMap: Record<string, string> = {};
        for (const enumId of Object.keys(enums)) {
            const enumObj = enums[enumId] as ioBroker.EnumObject;
            const members = enumObj.common?.members;
            if (!members) {
                continue;
            }
            const enumName = getText(enumObj.common.name, lang);
            for (const memberId of members) {
                if (enumId.startsWith('enum.rooms.')) {
                    roomMap[memberId] = enumName;
                } else if (enumId.startsWith('enum.functions.')) {
                    funcMap[memberId] = enumName;
                }
            }
        }

        const result: ObjectInfo[] = [];
        for (const id of Object.keys(states)) {
            const obj = states[id];
            if (!obj?.common) {
                continue;
            }
            const common = obj.common;
            const name = getText(common.name, lang);

            // Find room/function via parent hierarchy
            const parts = id.split('.');
            let room: string | undefined;
            let func: string | undefined;
            for (let i = parts.length; i >= 2; i--) {
                const parentId = parts.slice(0, i).join('.');
                if (!room && roomMap[parentId]) {
                    room = roomMap[parentId];
                }
                if (!func && funcMap[parentId]) {
                    func = funcMap[parentId];
                }
                if (room && func) {
                    break;
                }
            }

            result.push({
                id,
                name,
                type: common.type,
                role: common.role,
                unit: common.unit,
                room,
                func,
                read: common.read,
                write: common.write,
            });
        }

        objectCache = result;
        objectCachePromise = null;
        return result;
    })();

    return objectCachePromise;
}

export function clearDatapointCache(): void {
    objectCache = null;
    objectCachePromise = null;
}

export function registerDatapointProvider(
    monaco: typeof monacoEditor,
    socket: AdminConnection,
): monacoEditor.IDisposable {
    const disposables: monacoEditor.IDisposable[] = [];

    for (const lang of ['javascript', 'typescript']) {
        const disposable = monaco.languages.registerCompletionItemProvider(lang, {
            triggerCharacters: ["'", '"', '`', '.'],

            async provideCompletionItems(
                model: monacoEditor.editor.ITextModel,
                position: monacoEditor.Position,
            ): Promise<monacoEditor.languages.CompletionList | undefined> {
                // Get text on the current line up to the cursor
                const lineContent = model.getLineContent(position.lineNumber);
                const textUntilPosition = lineContent.substring(0, position.column - 1);

                // Check if we're in a trigger context
                const triggered = TRIGGER_PATTERNS.some(pattern => pattern.test(textUntilPosition));
                if (!triggered) {
                    return undefined;
                }

                // Find where the ID string starts (after the quote)
                const quoteMatch = textUntilPosition.match(/['"`]([^'"`]*)$/);
                if (!quoteMatch) {
                    return undefined;
                }
                const partialId = quoteMatch[1];
                const startColumn = position.column - partialId.length;

                const objects = await loadObjects(socket);

                // Filter and limit results
                let filtered: ObjectInfo[];
                if (partialId) {
                    const lowerPartial = partialId.toLowerCase();
                    filtered = objects.filter(
                        obj =>
                            obj.id.toLowerCase().includes(lowerPartial) ||
                            obj.name.toLowerCase().includes(lowerPartial),
                    );
                } else {
                    filtered = objects;
                }

                // Limit to 100 results for performance
                filtered = filtered.slice(0, 100);

                const range: monacoEditor.IRange = {
                    startLineNumber: position.lineNumber,
                    startColumn,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column,
                };

                const suggestions: monacoEditor.languages.CompletionItem[] = filtered.map(obj => {
                    const details: string[] = [];
                    if (obj.name) {
                        details.push(obj.name);
                    }
                    if (obj.room) {
                        details.push(`Room: ${obj.room}`);
                    }
                    if (obj.func) {
                        details.push(`Function: ${obj.func}`);
                    }

                    const docParts: string[] = [];
                    if (obj.role) {
                        docParts.push(`Role: ${obj.role}`);
                    }
                    if (obj.type) {
                        docParts.push(`Type: ${obj.type}`);
                    }
                    if (obj.unit) {
                        docParts.push(`Unit: ${obj.unit}`);
                    }
                    docParts.push(`Read: ${obj.read !== false ? 'yes' : 'no'}`);
                    docParts.push(`Write: ${obj.write !== false ? 'yes' : 'no'}`);

                    return {
                        label: obj.id,
                        kind: monaco.languages.CompletionItemKind.Value,
                        detail: details.join(' | '),
                        documentation: docParts.join('\n'),
                        insertText: obj.id,
                        range,
                        filterText: `${obj.id} ${obj.name}`,
                        sortText: obj.id,
                    };
                });

                return { suggestions };
            },
        });
        disposables.push(disposable);
    }

    return {
        dispose: () => {
            disposables.forEach(d => d.dispose());
        },
    };
}
