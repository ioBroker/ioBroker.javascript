import type { AdminConnection } from '@iobroker/adapter-react-v5';
import type { ToolCall, ScriptInfo } from './AiChatTypes';
import { getAllObjects } from './AiChatService';
import { extractBlocklyCompiledCode } from './AiScriptAnalyzer';

/** Tool definitions in OpenAI function calling format */
export const IOBROKER_TOOLS = [
    {
        type: 'function' as const,
        function: {
            name: 'search_datapoints',
            description:
                'Search ioBroker datapoints/states by name or ID pattern. Returns matching object IDs with names, types, roles, and units. Use this to find the correct datapoint ID.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description:
                            'Search pattern - matches against object ID and name. Examples: "temperature", "carport", "zigbee2mqtt.0.lamp"',
                    },
                    max_results: {
                        type: 'number',
                        description: 'Maximum number of results to return (default: 20)',
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
                'Get detailed info about an ioBroker object AND its parent hierarchy. ioBroker objects are organized as: adapter.instance.device.channel.state. This tool returns the object itself plus its parent channel and device if they exist, so you get the full context (e.g. device name, channel grouping). Always use this to understand what a datapoint belongs to.',
            parameters: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: 'The full object ID, e.g. "zigbee2mqtt.0.0x1234.state"',
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
];

function getText(text: ioBroker.StringOrTranslated): string {
    if (text && typeof text === 'object') {
        return (text as Record<string, string>).en || (text as Record<string, string>).de || '';
    }
    return text || '';
}

async function searchDatapoints(socket: AdminConnection, query: string, maxResults = 20): Promise<string> {
    const allObjects = await getAllObjects(socket);
    const queryLower = query.toLowerCase();
    const results: { id: string; name: string; type: string; role: string; unit: string }[] = [];

    for (const id of Object.keys(allObjects)) {
        const obj = allObjects[id];
        if (obj.type !== 'state') {
            continue;
        }
        const common = obj.common as ioBroker.StateCommon;
        const name = getText(common.name);
        if (id.toLowerCase().includes(queryLower) || name.toLowerCase().includes(queryLower)) {
            results.push({
                id,
                name,
                type: common.type || '',
                role: common.role || '',
                unit: common.unit || '',
            });
            if (results.length >= maxResults) {
                break;
            }
        }
    }

    if (results.length === 0) {
        return JSON.stringify({ message: `No datapoints found matching "${query}"` });
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

        // Walk up the hierarchy: state -> channel -> device
        // ioBroker structure: adapter.instance.device.channel.state
        const parts = id.split('.');
        const parents: Record<string, unknown>[] = [];

        for (let i = parts.length - 1; i >= 2; i--) {
            const parentId = parts.slice(0, i).join('.');
            try {
                const parentObj = await socket.getObject(parentId);
                if (
                    parentObj &&
                    (parentObj.type === 'channel' || parentObj.type === 'device' || parentObj.type === 'folder')
                ) {
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

        // If this is a channel or device, also list its children (states)
        if (obj.type === 'channel' || obj.type === 'device') {
            const allObjects = await getAllObjects(socket);
            const children: { id: string; name: string; type: string; role: string }[] = [];
            const prefix = `${id}.`;
            for (const childId of Object.keys(allObjects)) {
                if (childId.startsWith(prefix) && !childId.substring(prefix.length).includes('.')) {
                    const childObj = allObjects[childId];
                    const common = childObj.common as ioBroker.StateCommon;
                    children.push({
                        id: childId,
                        name: getText(common?.name),
                        type: common?.type || '',
                        role: common?.role || '',
                    });
                }
            }
            if (children.length > 0) {
                result.children = children;
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

/** Execute a tool call and return the result as a string */
export async function executeToolCall(
    socket: AdminConnection,
    toolCall: ToolCall,
    scripts?: ScriptInfo[],
): Promise<string> {
    let args: Record<string, unknown>;
    try {
        args = JSON.parse(toolCall.function.arguments);
    } catch {
        return JSON.stringify({ error: `Invalid arguments: ${toolCall.function.arguments}` });
    }

    switch (toolCall.function.name) {
        case 'search_datapoints':
            return searchDatapoints(socket, args.query as string, (args.max_results as number) || 20);
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
        default:
            return JSON.stringify({ error: `Unknown tool: ${toolCall.function.name}` });
    }
}
