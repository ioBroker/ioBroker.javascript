"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FB_ID_PATTERN = exports.FB_CYCLE_MAX_MS = exports.FB_CYCLE_MIN_MS = exports.FB_CYCLE_DEFAULT_MS = exports.FB_GRAPH_MARKER = void 0;
exports.createGraph = createGraph;
exports.resolvePinType = resolvePinType;
exports.getInputCount = getInputCount;
exports.getInputs = getInputs;
exports.getOutputCount = getOutputCount;
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
    const count = Number(block.params?.inputs);
    return Math.max(def.extensible.min, Math.min(def.extensible.max, Math.round(Number.isFinite(count) ? count : def.extensible.min)));
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
/** Number of outputs of a block with a variable number of them */
function getOutputCount(block, def) {
    if (!def.extensibleOutputs) {
        return def.outputs.length;
    }
    const { min, max } = def.extensibleOutputs;
    const count = Number(block.params?.outputs);
    return Math.max(min, Math.min(max, Math.round(Number.isFinite(count) ? count : min)));
}
function getOutputs(block, def = (0, library_1.getBlockDef)(block.type)) {
    if (!def) {
        return [];
    }
    const outputs = def.outputs.map(pin => ({ ...pin, type: resolvePinType(block, pin.type, def) }));
    if (def.extensibleOutputs) {
        const { prefix, type } = def.extensibleOutputs;
        for (let i = 1; i <= getOutputCount(block, def); i++) {
            outputs.push({ id: `${prefix}${i}`, type: resolvePinType(block, type, def) });
        }
    }
    return outputs;
}
/**
 * Whether an output of type `from` may drive an input of type `to`.
 *
 * Only widening happens by itself (INT to REAL); everything else needs a block that converts. An
 * output of the type ANY - of a JS block, whose code decides - goes anywhere.
 */
function isCompatible(from, to) {
    return to === 'ANY' || from === 'ANY' || from === to || (from === 'INT' && to === 'REAL');
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
/**
 * A new block of a type, with the parameters at their defaults. A user block must be in
 * `graph.userBlocks` already.
 */
function createBlock(type, pos, graph) {
    const def = (0, library_1.getBlockDef)(type, graph.userBlocks);
    const id = createId('b', graph.blocks.map(block => block.id));
    // a user block is named after its name, not after `@userFb/...`
    const name = createId(`${def?.user ? def.user.name.trim().replace(/\s+/g, '_') : type}_`, graph.blocks.map(block => block.name));
    const block = { id, type, name, pos };
    const params = {};
    def?.params?.forEach(param => {
        if (param.default !== undefined) {
            params[param.id] = param.default;
        }
    });
    if (def?.extensible) {
        params.inputs = def.extensible.count ?? def.extensible.min;
    }
    if (def?.extensibleOutputs) {
        params.outputs = def.extensibleOutputs.count ?? def.extensibleOutputs.min;
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
        ? data.links
            .filter(link => link && Array.isArray(link.from) && Array.isArray(link.to))
            .map(link => {
            const clean = { id: link.id, from: link.from, to: link.to };
            if (link.mark === true) {
                clean.mark = true;
            }
            if (typeof link.label === 'string' && link.label.trim()) {
                clean.label = link.label.trim();
            }
            return clean;
        })
        : [];
    graph.comments = Array.isArray(data.comments) ? data.comments.filter(comment => comment?.id) : [];
    const info = (value) => value && typeof value.type === 'string' && typeof value.name === 'string'
        ? {
            type: value.type,
            name: value.name,
            version: typeof value.version === 'number' ? value.version : 1,
            ...(typeof value.description === 'string' ? { description: value.description } : {}),
        }
        : null;
    const block = info(data.block);
    if (block) {
        graph.block = block;
    }
    if (data.userBlocks && typeof data.userBlocks === 'object') {
        const userBlocks = {};
        for (const [type, user] of Object.entries(data.userBlocks)) {
            const userInfo = info(user);
            if (userInfo && userInfo.type === type && user.graph) {
                // the copies carry neither a block info nor copies of their own
                const { block: _block, userBlocks: _inner, ...inner } = normalizeGraph(user.graph);
                userBlocks[type] = { ...userInfo, graph: inner };
            }
        }
        if (Object.keys(userBlocks).length) {
            graph.userBlocks = userBlocks;
        }
    }
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