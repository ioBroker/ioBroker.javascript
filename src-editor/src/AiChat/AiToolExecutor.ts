import type { AdminConnection } from '@iobroker/gui-components';
import type { ToolCall, ScriptInfo, EditorApi } from './AiChatTypes';
import { getAllObjects } from './AiChatService';
import { extractBlocklyCompiledCode } from './AiScriptAnalyzer';

/** Tool definitions in OpenAI function calling format */
export const IOBROKER_TOOLS = [
    {
        type: 'function' as const,
        function: {
            name: 'search_datapoints',
            description:
                'Search ALL ioBroker objects by ID, name, or role — includes states, channels, devices, folders, enums (rooms/functions), adapters, instances, scripts, meta, etc. Returns matching IDs with object type, name, role, unit, and a hasChildren hint for containers. IMPORTANT: Aliases and physical device groupings are usually CHANNELS containing multiple state children (e.g. a motion sensor is often a channel alias.0.Floor.Room.MotionSensor with states ACTUAL, BATTERY, STATE under it). If a channel/device/folder matches your query, call get_object_info on its ID to list its state children. Role-based queries work too: "sensor.motion", "switch.light", "value.temperature".',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description:
                            'Search pattern (case-insensitive substring) - matches against object ID, name, and role. Examples: "bewegungsmelder", "temperature", "sensor.motion", "alias.0", "küche", "zigbee2mqtt.0.lamp".',
                    },
                    max_results: {
                        type: 'number',
                        description: 'Maximum number of results to return (default: 20).',
                    },
                    object_type: {
                        type: 'string',
                        description:
                            'Optional filter by object type: "state", "channel", "device", "folder", "enum", "adapter", "instance", "script", "meta", etc. Omit to search every type.',
                    },
                },
                required: ['query'],
            },
        },
    },
    {
        type: 'function' as const,
        function: {
            name: 'get_state_value',
            description:
                'Get the current value of an ioBroker state/datapoint. Returns value, timestamp, and acknowledgment flag.',
            parameters: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: 'The full state ID, e.g. "zigbee2mqtt.0.sensor.temperature"',
                    },
                },
                required: ['id'],
            },
        },
    },
    {
        type: 'function' as const,
        function: {
            name: 'get_object_info',
            description:
                'Get detailed info about ANY ioBroker object + its full parent hierarchy + direct children. Works for every object type: state, channel, device, folder, adapter, instance, enum, meta, script. Returns: the object itself, parent chain (all non-state ancestors up to the adapter), and — if the object is a container (channel/device/folder/enum/instance/adapter/meta) — the list of direct children with their types, names, roles and units. Use this to navigate the object tree: start from a channel found by search_datapoints, read its children to see the actual state IDs underneath.',
            parameters: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description:
                            'The full object ID, e.g. "zigbee2mqtt.0.0x1234.state", "alias.0.Room.MotionSensor", or "enum.rooms.kitchen".',
                    },
                },
                required: ['id'],
            },
        },
    },
    {
        type: 'function' as const,
        function: {
            name: 'search_scripts',
            description:
                'Search through all ioBroker JavaScript/Blockly/Rules scripts. Can search by script name/path OR by content (e.g. find all scripts that use a specific datapoint ID). Returns matching script names, paths, and matching lines.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description:
                            'Search term - matches against script name, path, AND source code content. Examples: "carport", "zigbee2mqtt.0.lamp.state", "telegram"',
                    },
                    max_results: {
                        type: 'number',
                        description: 'Maximum number of scripts to return (default: 10)',
                    },
                },
                required: ['query'],
            },
        },
    },
    {
        type: 'function' as const,
        function: {
            name: 'read_script',
            description:
                'Read the full source code of a specific ioBroker script by its ID or path. Use search_scripts first to find the script ID, then read_script to see its complete code.',
            parameters: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description:
                            'The script ID (e.g. "script.js.common.Licht.Carport") or path (e.g. "common/Licht/Carport")',
                    },
                },
                required: ['id'],
            },
        },
    },
    {
        type: 'function' as const,
        function: {
            name: 'list_scripts',
            description:
                'List ALL available ioBroker scripts with their names, paths, types (JavaScript/Blockly/TypeScript), and enabled status. Use this to get an overview of all scripts before searching or reading specific ones.',
            parameters: {
                type: 'object',
                properties: {},
            },
        },
    },
    {
        type: 'function' as const,
        function: {
            name: 'run_script',
            description:
                'Execute a JavaScript or TypeScript snippet in the live ioBroker javascript engine and get back everything it logged. The code runs with the full script API (log, console.*, setState, getState, on, schedule, $, exec, httpGet, …) in VERBOSE mode, so internal operations (setState/getState/subscribe/…) are logged too — ideal for diagnosing behaviour or inspecting values. The snippet runs for a short window and is then automatically STOPPED and fully cleaned up (timers, subscriptions, schedules removed); it does NOT create a persistent script. Use `log(...)` or `console.log(...)` in the code to surface the values you want to inspect. WARNING: side effects are real (e.g. setState changes actual devices) — prefer read-only diagnostics unless the user explicitly asked to change something.',
            parameters: {
                type: 'object',
                properties: {
                    source: {
                        type: 'string',
                        description:
                            'The JavaScript (or TypeScript) source to execute. Log the values you want to inspect via log(...) / console.log(...). Top-level await is supported.',
                    },
                    engineType: {
                        type: 'string',
                        description: 'Optional. "TypeScript/ts" to run the code as TypeScript. Defaults to JavaScript.',
                    },
                    timeout: {
                        type: 'number',
                        description:
                            'Optional. Milliseconds to keep the script alive to collect asynchronous logs before it is stopped (default 5000, max 60000). Increase when waiting for timers, subscriptions or HTTP responses.',
                    },
                    logLevel: {
                        type: 'string',
                        description:
                            'Optional minimum severity to return: silly, debug, info, warn, error. Default silly (everything).',
                    },
                },
                required: ['source'],
            },
        },
    },

    // ─── Monaco editor interaction ──────────────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'get_editor_selection',
            description:
                'Read what the user has currently selected in the script editor. Returns the selected text and its line/column range, or a message if nothing is selected. Use this when the user refers to "this", "das hier", "the selection", or asks about a specific piece of code they highlighted.',
            parameters: { type: 'object', properties: {} },
        },
    },
    {
        type: 'function' as const,
        function: {
            name: 'get_editor_content',
            description:
                'Read the full current content of the script editor (may differ from the initial script version if the user has made edits). Use this when you need the live editor state rather than the saved script.',
            parameters: { type: 'object', properties: {} },
        },
    },
    {
        type: 'function' as const,
        function: {
            name: 'get_cursor_position',
            description: 'Read the current cursor position (line and column, 1-based) in the script editor.',
            parameters: { type: 'object', properties: {} },
        },
    },
    {
        type: 'function' as const,
        function: {
            name: 'highlight_text_in_editor',
            description:
                "Search for a literal text in the script editor and select + scroll to it. Returns how many occurrences were found. Use this to draw the user's attention to a specific snippet you are discussing.",
            parameters: {
                type: 'object',
                properties: {
                    text: {
                        type: 'string',
                        description: 'Exact substring to search for (case-sensitive).',
                    },
                },
                required: ['text'],
            },
        },
    },
    {
        type: 'function' as const,
        function: {
            name: 'highlight_line_range',
            description:
                'Select and scroll to a range of lines in the editor. Both line numbers are 1-based and inclusive. Use this to show the user which block of code you are referring to.',
            parameters: {
                type: 'object',
                properties: {
                    start_line: { type: 'number', description: 'First line (1-based, inclusive).' },
                    end_line: { type: 'number', description: 'Last line (1-based, inclusive).' },
                },
                required: ['start_line', 'end_line'],
            },
        },
    },
    {
        type: 'function' as const,
        function: {
            name: 'go_to_line',
            description:
                'Move the cursor to a specific line (and optional column) and scroll that line into view. Use this to navigate the user to a relevant spot.',
            parameters: {
                type: 'object',
                properties: {
                    line: { type: 'number', description: '1-based line number.' },
                    column: { type: 'number', description: '1-based column (optional, default 1).' },
                },
                required: ['line'],
            },
        },
    },
    {
        type: 'function' as const,
        function: {
            name: 'insert_text_at_cursor',
            description:
                'Insert text at the current cursor position in the editor (or replace the current selection if one exists). Use sparingly — prefer returning code in a fenced markdown block so the user can review and smart-apply it. Only use direct insertion when the user explicitly asked you to write something into the editor.',
            parameters: {
                type: 'object',
                properties: {
                    text: { type: 'string', description: 'Text to insert.' },
                },
                required: ['text'],
            },
        },
    },
    {
        type: 'function' as const,
        function: {
            name: 'replace_selection',
            description:
                'Replace the currently selected text in the editor with new text. Fails if nothing is selected. Use this to refactor or rewrite a specific highlighted snippet.',
            parameters: {
                type: 'object',
                properties: {
                    text: { type: 'string', description: 'Replacement text.' },
                },
                required: ['text'],
            },
        },
    },
    {
        type: 'function' as const,
        function: {
            name: 'get_diagnostics',
            description:
                'Read all active Monaco diagnostics (errors, warnings, info, hints) from the current editor model — this is what shows up as red/yellow squiggles. Use this to find syntax errors, unused variables, missing types, or other editor-reported issues the user might be asking about.',
            parameters: { type: 'object', properties: {} },
        },
    },
    {
        type: 'function' as const,
        function: {
            name: 'get_document_symbols',
            description:
                'Get the document outline of the current script: all top-level functions, classes, constants, and variables with their line numbers. Use this to understand the structure of a long script or to find where a specific function is defined.',
            parameters: { type: 'object', properties: {} },
        },
    },
];

function getText(text: ioBroker.StringOrTranslated | undefined): string {
    if (text && typeof text === 'object') {
        return (text as Record<string, string>).en || (text as Record<string, string>).de || '';
    }
    return text || '';
}

/**
 * Pure match function: does the given object match the search query on id, name, or role?
 *  Exported so it can be unit-tested without a live socket. Match is case-insensitive.
 */
export function objectMatchesQuery(
    id: string,
    obj: { common?: { name?: ioBroker.StringOrTranslated; role?: string } } | undefined | null,
    query: string,
): boolean {
    const q = (query || '').toLowerCase();
    if (!q) {
        return false;
    }
    if (id.toLowerCase().includes(q)) {
        return true;
    }
    const common = obj?.common;
    if (!common) {
        return false;
    }
    const name = getText(common.name).toLowerCase();
    if (name && name.includes(q)) {
        return true;
    }
    const role = (common.role || '').toLowerCase();
    if (role && role.includes(q)) {
        return true;
    }
    return false;
}

interface SearchResult {
    id: string;
    type: string;
    name: string;
    role?: string;
    unit?: string;
    stateType?: string;
    hasChildren?: boolean;
}

async function searchDatapoints(
    socket: AdminConnection,
    query: string,
    maxResults = 20,
    objectType?: string,
): Promise<string> {
    const allObjects = await getAllObjects(socket);
    const typeFilter = objectType?.toLowerCase();
    const results: SearchResult[] = [];

    const allKeys = Object.keys(allObjects);
    // Pre-compute which IDs have at least one child, so container matches can hint at hierarchy.
    // Single O(n) pass, reused for every match below.
    const prefixesWithChildren = new Set<string>();
    for (const id of allKeys) {
        const lastDot = id.lastIndexOf('.');
        if (lastDot > 0) {
            prefixesWithChildren.add(id.substring(0, lastDot));
        }
    }

    for (const id of allKeys) {
        const obj = allObjects[id];
        const objType = obj?.type;
        if (!objType) {
            continue;
        }
        // Search everything: state, channel, device, folder, enum, adapter, instance,
        // script, meta, group, user, host, chart, config, design, …
        if (typeFilter && objType !== typeFilter) {
            continue;
        }
        if (!objectMatchesQuery(id, obj, query)) {
            continue;
        }
        const common = obj.common as ioBroker.StateCommon | undefined;
        const entry: SearchResult = {
            id,
            type: objType,
            name: getText(common?.name),
        };
        if (common?.role) {
            entry.role = common.role;
        }
        if (objType === 'state') {
            entry.stateType = common?.type || '';
            if (common?.unit) {
                entry.unit = common.unit;
            }
        } else if (prefixesWithChildren.has(id)) {
            // Hint that this container has children the AI can enumerate via get_object_info
            entry.hasChildren = true;
        }
        results.push(entry);
        if (results.length >= maxResults) {
            break;
        }
    }

    if (results.length === 0) {
        return JSON.stringify({
            message: `No objects found matching "${query}". Hint: try a role like "sensor.motion" or a partial path.`,
        });
    }
    return JSON.stringify(results);
}

async function getStateValue(socket: AdminConnection, id: string): Promise<string> {
    try {
        const state = await socket.getState(id);
        if (!state) {
            return JSON.stringify({ error: `State '${id}' not found` });
        }
        return JSON.stringify({
            val: state.val,
            ts: state.ts ? new Date(state.ts).toISOString() : null,
            ack: state.ack,
            from: state.from,
        });
    } catch {
        return JSON.stringify({ error: `Failed to read state '${id}'` });
    }
}

/** Object types whose descendants make sense to enumerate as "children". */
const CONTAINER_TYPES = new Set<string>(['channel', 'device', 'folder', 'adapter', 'instance', 'enum', 'meta']);

const MAX_CHILDREN_PER_CALL = 50;

async function getObjectInfo(socket: AdminConnection, id: string): Promise<string> {
    try {
        const obj = await socket.getObject(id);
        if (!obj) {
            return JSON.stringify({ error: `Object '${id}' not found` });
        }

        const result: Record<string, unknown> = {
            id: obj._id,
            type: obj.type,
            common: obj.common,
        };

        // Walk up the hierarchy: state → channel → device → instance → adapter
        // Every non-state ancestor provides useful context (device name, adapter
        // instance, folder grouping, enum membership, …).
        const parts = id.split('.');
        const parents: Record<string, unknown>[] = [];

        for (let i = parts.length - 1; i >= 2; i--) {
            const parentId = parts.slice(0, i).join('.');
            try {
                const parentObj = await socket.getObject(parentId);
                if (parentObj && parentObj.type !== 'state') {
                    parents.push({
                        id: parentObj._id,
                        type: parentObj.type,
                        name: getText(parentObj.common?.name),
                        common: parentObj.common,
                    });
                }
            } catch {
                // parent doesn't exist, continue
            }
        }

        if (parents.length > 0) {
            result.parents = parents;
        }

        // For any container type (not just channel/device), list direct children so the
        // AI can descend into folders, enums, instances, meta-objects, etc.
        if (CONTAINER_TYPES.has(obj.type)) {
            const allObjects = await getAllObjects(socket);
            const children: { id: string; name: string; type: string; role?: string; unit?: string }[] = [];
            const prefix = `${id}.`;
            let truncated = false;
            for (const childId of Object.keys(allObjects)) {
                if (childId.startsWith(prefix) && !childId.substring(prefix.length).includes('.')) {
                    const childObj = allObjects[childId];
                    const common = childObj?.common as ioBroker.StateCommon | undefined;
                    const entry: { id: string; name: string; type: string; role?: string; unit?: string } = {
                        id: childId,
                        name: getText(common?.name),
                        type: childObj?.type || '',
                    };
                    if (common?.role) {
                        entry.role = common.role;
                    }
                    if (childObj?.type === 'state' && common?.unit) {
                        entry.unit = common.unit;
                    }
                    children.push(entry);
                    if (children.length >= MAX_CHILDREN_PER_CALL) {
                        truncated = true;
                        break;
                    }
                }
            }
            if (children.length > 0) {
                result.children = children;
                if (truncated) {
                    result.childrenTruncated = true;
                    result.childrenHint = `Only the first ${MAX_CHILDREN_PER_CALL} children are shown. Use search_datapoints with a more specific query or the object_type filter to narrow down.`;
                }
            }
        }

        return JSON.stringify(result);
    } catch {
        return JSON.stringify({ error: `Failed to read object '${id}'` });
    }
}

/** Extract compiled JS from Blockly source (strips base64 XML comment) */
function extractCompiledJs(source: string): string {
    return extractBlocklyCompiledCode(source) || source;
}

function searchScripts(scripts: ScriptInfo[], query: string, maxResults = 10): string {
    const queryLower = query.toLowerCase();
    const results: {
        id: string;
        path: string;
        name: string;
        type: string;
        enabled: boolean;
        matchingLines?: { line: number; text: string }[];
    }[] = [];

    for (const script of scripts) {
        const idLower = script.id.toLowerCase();
        const nameLower = script.name.toLowerCase();
        const path = script.id.replace(/^script\.js\./, '').replace(/\./g, '/');
        const isBlockly = script.engineType === 'Blockly' || script.engineType === 'Rules';

        // Check name/path match
        const nameMatch = idLower.includes(queryLower) || nameLower.includes(queryLower);

        // Check source code content match
        const sourceToSearch = isBlockly ? extractCompiledJs(script.source) : script.source;
        const contentMatch = sourceToSearch.toLowerCase().includes(queryLower);

        if (nameMatch || contentMatch) {
            const entry: (typeof results)[0] = {
                id: script.id,
                path,
                name: script.name,
                type: isBlockly ? 'Blockly' : script.engineType.includes('TypeScript') ? 'TypeScript' : 'JavaScript',
                enabled: script.enabled,
            };

            // If content matches, show the matching lines
            if (contentMatch) {
                const lines = sourceToSearch.split('\n');
                const matchingLines: { line: number; text: string }[] = [];
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].toLowerCase().includes(queryLower)) {
                        matchingLines.push({ line: i + 1, text: lines[i].trim() });
                        if (matchingLines.length >= 5) {
                            break;
                        }
                    }
                }
                if (matchingLines.length > 0) {
                    entry.matchingLines = matchingLines;
                }
            }

            results.push(entry);
            if (results.length >= maxResults) {
                break;
            }
        }
    }

    if (results.length === 0) {
        return JSON.stringify({ message: `No scripts found matching "${query}"` });
    }
    return JSON.stringify(results);
}

function readScript(scripts: ScriptInfo[], id: string): string {
    // Support both full ID and path format
    const searchId = id.replace(/\//g, '.').toLowerCase();

    const script = scripts.find(s => {
        const sLower = s.id.toLowerCase();
        return sLower === searchId || sLower === `script.js.${searchId}` || sLower.endsWith(`.${searchId}`);
    });

    if (!script) {
        return JSON.stringify({ error: `Script '${id}' not found. Use search_scripts to find available scripts.` });
    }

    const isBlockly = script.engineType === 'Blockly' || script.engineType === 'Rules';
    const source = isBlockly ? extractCompiledJs(script.source) : script.source;
    const path = script.id.replace(/^script\.js\./, '').replace(/\./g, '/');

    return JSON.stringify({
        id: script.id,
        path,
        name: script.name,
        type: isBlockly ? 'Blockly' : script.engineType.includes('TypeScript') ? 'TypeScript' : 'JavaScript',
        enabled: script.enabled,
        source,
    });
}

/** List all scripts (names and paths only, no source code) */
function listScripts(scripts: ScriptInfo[]): string {
    const list = scripts.map(s => ({
        id: s.id,
        path: s.id.replace(/^script\.js\./, '').replace(/\./g, '/'),
        name: s.name,
        type:
            s.engineType === 'Blockly' || s.engineType === 'Rules'
                ? 'Blockly'
                : s.engineType.includes('TypeScript')
                  ? 'TypeScript'
                  : 'JavaScript',
        enabled: s.enabled,
    }));
    return JSON.stringify(list);
}

/** Result helpers for editor-tool calls where the host API is missing. */
function editorApiMissing(): string {
    return JSON.stringify({
        error: 'Editor is not available. This tool requires the script editor to be open.',
    });
}

interface ExecuteResult {
    ok: boolean;
    error?: string;
    engineType?: string;
    runtime?: number;
    truncated?: boolean;
    logs?: { ts: number; severity: string; message: string }[];
    output?: string;
}

/**
 * Run an ad-hoc script in the live javascript engine via the adapter's "execute" message and
 * return the collected logs. The script is ephemeral – the backend stops and cleans it up after
 * the collection window.
 */
async function runScript(
    socket: AdminConnection,
    instanceId: string | undefined,
    args: Record<string, unknown>,
): Promise<string> {
    if (!instanceId) {
        return JSON.stringify({ error: 'No running javascript instance found to execute the script.' });
    }
    const source = args.source;
    if (!source || typeof source !== 'string') {
        return JSON.stringify({ error: 'No source code provided.' });
    }
    try {
        const result: ExecuteResult = await socket.sendTo(instanceId, 'execute', {
            source,
            engineType: args.engineType,
            timeout: args.timeout,
            logLevel: args.logLevel,
        });

        if (!result || result.ok === false) {
            return JSON.stringify({
                error: result?.error || 'Execution failed',
                logs: result?.logs || [],
            });
        }
        return JSON.stringify({
            engineType: result.engineType,
            runtime: result.runtime,
            truncated: result.truncated || false,
            logCount: result.logs?.length || 0,
            logs: result.logs || [],
            output: result.output || '',
        });
    } catch (e) {
        return JSON.stringify({ error: `Failed to execute script: ${e instanceof Error ? e.message : String(e)}` });
    }
}

/** Execute a tool call and return the result as a string. */
export async function executeToolCall(
    socket: AdminConnection,
    toolCall: ToolCall,
    scripts?: ScriptInfo[],
    editorApi?: EditorApi,
    instanceId?: string,
): Promise<string> {
    let args: Record<string, unknown>;
    try {
        args = JSON.parse(toolCall.function.arguments);
    } catch {
        return JSON.stringify({ error: `Invalid arguments: ${toolCall.function.arguments}` });
    }

    switch (toolCall.function.name) {
        // ── ioBroker object/script tools ──
        case 'search_datapoints':
            return searchDatapoints(
                socket,
                args.query as string,
                (args.max_results as number) || 20,
                args.object_type as string | undefined,
            );
        case 'get_state_value':
            return getStateValue(socket, args.id as string);
        case 'get_object_info':
            return getObjectInfo(socket, args.id as string);
        case 'search_scripts':
            return searchScripts(scripts || [], args.query as string, (args.max_results as number) || 10);
        case 'read_script':
            return readScript(scripts || [], args.id as string);
        case 'list_scripts':
            return listScripts(scripts || []);
        case 'run_script':
            return runScript(socket, instanceId, args);

        // ── Monaco editor tools (editorApi may be undefined if the editor isn't mounted) ──
        case 'get_editor_selection': {
            if (!editorApi?.getSelection) {
                return editorApiMissing();
            }
            const sel = editorApi.getSelection();
            return sel
                ? JSON.stringify(sel)
                : JSON.stringify({ message: 'No text is currently selected in the editor.' });
        }
        case 'get_editor_content': {
            if (!editorApi?.getContent) {
                return editorApiMissing();
            }
            return JSON.stringify({ content: editorApi.getContent() });
        }
        case 'get_cursor_position': {
            if (!editorApi?.getCursorPosition) {
                return editorApiMissing();
            }
            const pos = editorApi.getCursorPosition();
            return pos
                ? JSON.stringify(pos)
                : JSON.stringify({ message: 'Editor has no cursor position (not focused).' });
        }
        case 'highlight_text_in_editor': {
            if (!editorApi?.highlightText) {
                return editorApiMissing();
            }
            const count = editorApi.highlightText(args.text as string);
            return JSON.stringify({
                matches: count,
                message:
                    count === 0
                        ? `Text "${args.text as string}" was not found in the editor.`
                        : `Highlighted ${count} occurrence(s) of "${args.text as string}".`,
            });
        }
        case 'highlight_line_range': {
            if (!editorApi?.highlightLineRange) {
                return editorApiMissing();
            }
            const ok = editorApi.highlightLineRange(args.start_line as number, args.end_line as number);
            return JSON.stringify({
                success: ok,
                message: ok
                    ? `Selected lines ${args.start_line as number}-${args.end_line as number}.`
                    : 'Could not select the requested line range.',
            });
        }
        case 'go_to_line': {
            if (!editorApi?.goToLine) {
                return editorApiMissing();
            }
            const ok = editorApi.goToLine(args.line as number, args.column as number | undefined);
            return JSON.stringify({
                success: ok,
                message: ok ? `Cursor moved to line ${args.line as number}.` : 'Could not move the cursor.',
            });
        }
        case 'insert_text_at_cursor': {
            if (!editorApi?.insertTextAtCursor) {
                return editorApiMissing();
            }
            const ok = editorApi.insertTextAtCursor(args.text as string);
            return JSON.stringify({
                success: ok,
                message: ok ? 'Text inserted at cursor.' : 'Editor rejected the insertion.',
            });
        }
        case 'replace_selection': {
            if (!editorApi?.replaceSelection) {
                return editorApiMissing();
            }
            const ok = editorApi.replaceSelection(args.text as string);
            return JSON.stringify({
                success: ok,
                message: ok ? 'Selection replaced.' : 'No text was selected to replace.',
            });
        }
        case 'get_diagnostics': {
            if (!editorApi?.getDiagnostics) {
                return editorApiMissing();
            }
            const diagnostics = editorApi.getDiagnostics();
            return JSON.stringify({
                count: diagnostics.length,
                diagnostics,
            });
        }
        case 'get_document_symbols': {
            if (!editorApi?.getSymbols) {
                return editorApiMissing();
            }
            const symbols = await editorApi.getSymbols();
            return JSON.stringify({
                count: symbols.length,
                symbols,
            });
        }

        default:
            return JSON.stringify({ error: `Unknown tool: ${toolCall.function.name}` });
    }
}
