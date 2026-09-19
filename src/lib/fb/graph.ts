import { getBlockDef } from './library';
import {
    FB_FORMAT,
    FB_RUNTIME_VERSION,
    type FbBlock,
    type FbBlockDef,
    type FbGraph,
    type FbPinType,
    type FbSignalType,
    type FbValue,
} from './types';

/** The last line of the script source holds the graph: `//#fbd:{...}` */
export const FB_GRAPH_MARKER = '//#fbd:';

export const FB_CYCLE_DEFAULT_MS = 200;
export const FB_CYCLE_MIN_MS = 50;
export const FB_CYCLE_MAX_MS = 10000;

/** IDs end up in the generated code (`I.b7`, `S['b7.Q']`), so they are restricted to identifiers */
export const FB_ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

const SIGNAL_TYPES: FbSignalType[] = ['BOOL', 'INT', 'REAL', 'TIME', 'STRING'];

/** A pin of a concrete block: extensible inputs are expanded and parameter types resolved */
export interface FbPin {
    id: string;
    /** `ANY` only for inputs that take every type */
    type: FbSignalType | 'ANY';
    param?: boolean;
    default?: FbValue;
}

export function createGraph(): FbGraph {
    return {
        format: FB_FORMAT,
        runtime: FB_RUNTIME_VERSION,
        cycle: { mode: 'auto', ms: FB_CYCLE_DEFAULT_MS },
        blocks: [],
        links: [],
        comments: [],
    };
}

/** The signal type a pin has in this block */
export function resolvePinType(block: FbBlock, type: FbPinType, def?: FbBlockDef): FbSignalType | 'ANY' {
    if (typeof type === 'object') {
        const value = block.params?.[type.param] ?? def?.params?.find(param => param.id === type.param)?.default;
        return SIGNAL_TYPES.includes(value as FbSignalType) ? (value as FbSignalType) : 'REAL';
    }
    return type;
}

/** Number of inputs of an extensible block */
export function getInputCount(block: FbBlock, def: FbBlockDef): number {
    if (!def.extensible) {
        return def.inputs.length;
    }
    const count = Number(block.params?.inputs) || def.extensible.min;
    return Math.max(def.extensible.min, Math.min(def.extensible.max, Math.round(count)));
}

export function getInputs(block: FbBlock, def = getBlockDef(block.type)): FbPin[] {
    if (!def) {
        return [];
    }
    const inputs: FbPin[] = def.inputs.map(pin => ({ ...pin, type: resolvePinType(block, pin.type, def) }));
    if (def.extensible) {
        const { prefix, type, default: defaultValue } = def.extensible;
        for (let i = 1; i <= getInputCount(block, def); i++) {
            inputs.push({ id: `${prefix}${i}`, type: resolvePinType(block, type, def), default: defaultValue });
        }
    }
    return inputs;
}

export function getOutputs(block: FbBlock, def = getBlockDef(block.type)): FbPin[] {
    return def ? def.outputs.map(pin => ({ ...pin, type: resolvePinType(block, pin.type, def) })) : [];
}

/**
 * Whether an output of type `from` may drive an input of type `to`.
 *
 * Only widening happens by itself (INT to REAL); everything else needs a block that converts.
 */
export function isCompatible(from: FbSignalType | 'ANY', to: FbSignalType | 'ANY'): boolean {
    return to === 'ANY' || from === to || (from === 'INT' && to === 'REAL');
}

/** A new ID that is not in `used`: `<prefix><n>` */
export function createId(prefix: string, used: Iterable<string>): string {
    const taken = new Set(used);
    let max = 0;
    for (const id of taken) {
        if (id.startsWith(prefix)) {
            const n = Number(id.substring(prefix.length));
            if (Number.isInteger(n) && n > max) {
                max = n;
            }
        }
    }
    return `${prefix}${max + 1}`;
}

/** A new block of a type, with the parameters at their defaults */
export function createBlock(type: string, pos: [number, number], graph: FbGraph): FbBlock {
    const def = getBlockDef(type);
    const id = createId(
        'b',
        graph.blocks.map(block => block.id),
    );
    const name = createId(
        `${type}_`,
        graph.blocks.map(block => block.name),
    );
    const block: FbBlock = { id, type, name, pos };
    const params: Record<string, FbValue> = {};
    def?.params?.forEach(param => {
        if (param.default !== undefined) {
            params[param.id] = param.default;
        }
    });
    if (def?.extensible) {
        params.inputs = def.extensible.min;
    }
    if (Object.keys(params).length) {
        block.params = params;
    }
    return block;
}

/** Brings a parsed graph into shape: missing parts get their defaults */
export function normalizeGraph(data: Partial<FbGraph> | null | undefined): FbGraph {
    const graph = createGraph();
    if (!data || typeof data !== 'object') {
        return graph;
    }
    graph.format = typeof data.format === 'number' ? data.format : FB_FORMAT;
    graph.runtime = typeof data.runtime === 'string' ? data.runtime : FB_RUNTIME_VERSION;
    if (data.cycle && typeof data.cycle === 'object') {
        graph.cycle = {
            mode: ['auto', 'cyclic', 'event'].includes(data.cycle.mode) ? data.cycle.mode : 'auto',
            ms: typeof data.cycle.ms === 'number' ? data.cycle.ms : FB_CYCLE_DEFAULT_MS,
        };
    }
    graph.blocks = Array.isArray(data.blocks) ? data.blocks.filter(block => block && typeof block === 'object') : [];
    graph.blocks.forEach(block => {
        if (!Array.isArray(block.pos) || block.pos.length !== 2) {
            block.pos = [0, 0];
        }
        if (typeof block.name !== 'string') {
            block.name = String(block.id);
        }
    });
    graph.links = Array.isArray(data.links)
        ? data.links.filter(link => link && Array.isArray(link.from) && Array.isArray(link.to))
        : [];
    graph.comments = Array.isArray(data.comments) ? data.comments.filter(comment => comment?.id) : [];
    return graph;
}

/**
 * Reads the graph out of a script source. Returns `null` when the source holds no graph; an empty
 * source gives an empty graph, which is what a new script starts with.
 */
export function parseGraph(source: string | null | undefined): FbGraph | null {
    if (!source?.trim()) {
        return createGraph();
    }
    const pos = source.lastIndexOf(FB_GRAPH_MARKER);
    if (pos === -1 || (pos > 0 && source[pos - 1] !== '\n')) {
        return null;
    }
    const line = source
        .substring(pos + FB_GRAPH_MARKER.length)
        .split('\n')[0]
        .trim();
    try {
        return normalizeGraph(JSON.parse(line) as Partial<FbGraph>);
    } catch {
        return null;
    }
}

/** Whether a script source was generated from a function block diagram */
export function isFbdSource(source: string | null | undefined): boolean {
    if (!source) {
        return false;
    }
    // no trimEnd(): the editor compiles this with an ES2018 library
    const trimmed = source.replace(/\s+$/, '');
    const pos = trimmed.lastIndexOf('\n');
    return trimmed.substring(pos + 1).startsWith(FB_GRAPH_MARKER);
}

export function serializeGraph(graph: FbGraph): string {
    return `${FB_GRAPH_MARKER}${JSON.stringify(graph)}`;
}
