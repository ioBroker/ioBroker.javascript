"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FB_ID_PATTERN = exports.FB_CYCLE_MAX_MS = exports.FB_CYCLE_MIN_MS = exports.FB_CYCLE_DEFAULT_MS = exports.FB_GRAPH_MARKER = void 0;
exports.createGraph = createGraph;
exports.resolvePinType = resolvePinType;
exports.getInputCount = getInputCount;
exports.getInputs = getInputs;
exports.getOutputs = getOutputs;
exports.isCompatible = isCompatible;
exports.createId = createId;
exports.createBlock = createBlock;
exports.normalizeGraph = normalizeGraph;
exports.parseGraph = parseGraph;
exports.isFbdSource = isFbdSource;
exports.serializeGraph = serializeGraph;
const library_1 = require("./library");
const types_1 = require("./types");
/** The last line of the script source holds the graph: `//#fbd:{...}` */
exports.FB_GRAPH_MARKER = '//#fbd:';
exports.FB_CYCLE_DEFAULT_MS = 200;
exports.FB_CYCLE_MIN_MS = 50;
exports.FB_CYCLE_MAX_MS = 10000;
/** IDs end up in the generated code (`I.b7`, `S['b7.Q']`), so they are restricted to identifiers */
exports.FB_ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SIGNAL_TYPES = ['BOOL', 'INT', 'REAL', 'TIME', 'STRING'];
function createGraph() {
    return {
        format: types_1.FB_FORMAT,
        runtime: types_1.FB_RUNTIME_VERSION,
        cycle: { mode: 'auto', ms: exports.FB_CYCLE_DEFAULT_MS },
        blocks: [],
        links: [],
        comments: [],
    };
}
/** The signal type a pin has in this block */
function resolvePinType(block, type, def) {
    if (typeof type === 'object') {
        const value = block.params?.[type.param] ?? def?.params?.find(param => param.id === type.param)?.default;
        return SIGNAL_TYPES.includes(value) ? value : 'REAL';
    }
    return type;
}
/** Number of inputs of an extensible block */
function getInputCount(block, def) {
    if (!def.extensible) {
        return def.inputs.length;
    }
    const count = Number(block.params?.inputs) || def.extensible.min;
    return Math.max(def.extensible.min, Math.min(def.extensible.max, Math.round(count)));
}
function getInputs(block, def = (0, library_1.getBlockDef)(block.type)) {
    if (!def) {
        return [];
    }
    const inputs = def.inputs.map(pin => ({ ...pin, type: resolvePinType(block, pin.type, def) }));
    if (def.extensible) {
        const { prefix, type, default: defaultValue } = def.extensible;
        for (let i = 1; i <= getInputCount(block, def); i++) {
            inputs.push({ id: `${prefix}${i}`, type: resolvePinType(block, type, def), default: defaultValue });
        }
    }
    return inputs;
}
function getOutputs(block, def = (0, library_1.getBlockDef)(block.type)) {
    return def ? def.outputs.map(pin => ({ ...pin, type: resolvePinType(block, pin.type, def) })) : [];
}
/**
 * Whether an output of type `from` may drive an input of type `to`.
 *
 * Only widening happens by itself (INT to REAL); everything else needs a block that converts.
 */
function isCompatible(from, to) {
    return to === 'ANY' || from === to || (from === 'INT' && to === 'REAL');
}
/** A new ID that is not in `used`: `<prefix><n>` */
function createId(prefix, used) {
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
function createBlock(type, pos, graph) {
    const def = (0, library_1.getBlockDef)(type);
    const id = createId('b', graph.blocks.map(block => block.id));
    const name = createId(`${type}_`, graph.blocks.map(block => block.name));
    const block = { id, type, name, pos };
    const params = {};
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
function normalizeGraph(data) {
    const graph = createGraph();
    if (!data || typeof data !== 'object') {
        return graph;
    }
    graph.format = typeof data.format === 'number' ? data.format : types_1.FB_FORMAT;
    graph.runtime = typeof data.runtime === 'string' ? data.runtime : types_1.FB_RUNTIME_VERSION;
    if (data.cycle && typeof data.cycle === 'object') {
        graph.cycle = {
            mode: ['auto', 'cyclic', 'event'].includes(data.cycle.mode) ? data.cycle.mode : 'auto',
            ms: typeof data.cycle.ms === 'number' ? data.cycle.ms : exports.FB_CYCLE_DEFAULT_MS,
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
function parseGraph(source) {
    if (!source?.trim()) {
        return createGraph();
    }
    const pos = source.lastIndexOf(exports.FB_GRAPH_MARKER);
    if (pos === -1 || (pos > 0 && source[pos - 1] !== '\n')) {
        return null;
    }
    const line = source
        .substring(pos + exports.FB_GRAPH_MARKER.length)
        .split('\n')[0]
        .trim();
    try {
        return normalizeGraph(JSON.parse(line));
    }
    catch {
        return null;
    }
}
/** Whether a script source was generated from a function block diagram */
function isFbdSource(source) {
    if (!source) {
        return false;
    }
    // no trimEnd(): the editor compiles this with an ES2018 library
    const trimmed = source.replace(/\s+$/, '');
    const pos = trimmed.lastIndexOf('\n');
    return trimmed.substring(pos + 1).startsWith(exports.FB_GRAPH_MARKER);
}
function serializeGraph(graph) {
    return `${exports.FB_GRAPH_MARKER}${JSON.stringify(graph)}`;
}
//# sourceMappingURL=graph.js.map