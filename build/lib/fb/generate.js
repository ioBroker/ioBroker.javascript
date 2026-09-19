"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTime = parseTime;
exports.formatTime = formatTime;
exports.toLiteral = toLiteral;
exports.generateSource = generateSource;
const analyze_1 = require("./analyze");
const graph_1 = require("./graph");
const library_1 = require("./library");
const types_1 = require("./types");
const TIME_UNITS = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 };
/**
 * A time in ms. Takes a number of ms, or a text like `2s`, `1m30s`, `500ms` or `T#2s` (IEC).
 * Returns `null` if the text is not a time.
 */
function parseTime(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
    }
    if (typeof value !== 'string') {
        return null;
    }
    let text = value.trim().toLowerCase().replace(/_/g, '');
    if (text.startsWith('t#') || text.startsWith('time#')) {
        text = text.substring(text.indexOf('#') + 1);
    }
    if (!text) {
        return null;
    }
    if (/^\d+(\.\d+)?$/.test(text)) {
        return Math.round(Number(text));
    }
    const parts = text.match(/(\d+(?:\.\d+)?)(ms|s|m|h|d)/g);
    if (!parts || parts.join('') !== text) {
        return null;
    }
    return Math.round(parts.reduce((sum, part) => {
        const [, number, unit] = part.match(/(\d+(?:\.\d+)?)(ms|s|m|h|d)/);
        return sum + Number(number) * TIME_UNITS[unit];
    }, 0));
}
/** A time for people: `1500` gives `1.5s` */
function formatTime(ms) {
    if (!ms) {
        return '0ms';
    }
    for (const unit of ['d', 'h', 'm', 's']) {
        const value = ms / TIME_UNITS[unit];
        if (value >= 1 && Number.isInteger(Math.round(value * 1000) / 1000)) {
            return `${Math.round(value * 1000) / 1000}${unit}`;
        }
    }
    return ms >= 1000 ? `${Math.round(ms / 100) / 10}s` : `${ms}ms`;
}
/** A value as a JavaScript literal of the given type */
function toLiteral(value, type) {
    switch (type) {
        case 'BOOL':
            return value === true || value === 'true' || value === 1 || value === '1' ? 'true' : 'false';
        case 'INT':
            return String(Math.round(Number(value)) || 0);
        case 'REAL': {
            const number = Number(value);
            return String(Number.isFinite(number) ? number : 0);
        }
        case 'TIME':
            return String(parseTime(value) ?? 0);
        case 'STRING':
            return JSON.stringify(value === null || value === undefined ? '' : String(value));
        default:
            // ANY: whatever the text looks like
            if (typeof value === 'boolean' || typeof value === 'number') {
                return String(value);
            }
            if (value === null || value === undefined) {
                return '0';
            }
            if (value === 'true' || value === 'false') {
                return value;
            }
            if (value.trim() !== '' && Number.isFinite(Number(value))) {
                return String(Number(value));
            }
            return JSON.stringify(value);
    }
}
function initialValue(type) {
    return type === 'BOOL' ? 'false' : type === 'STRING' ? "''" : '0';
}
function signal(blockId, pinId) {
    return `S['${blockId}.${pinId}']`;
}
class BlockWriter {
    block;
    def;
    drivers;
    inputs;
    outputs;
    constructor(block, def, 
    /** `blockId.pinId` of an input to the signal that drives it */
    drivers) {
        this.block = block;
        this.def = def;
        this.drivers = drivers;
        this.inputs = (0, graph_1.getInputs)(block, def);
        this.outputs = (0, graph_1.getOutputs)(block, def);
    }
    input(pin) {
        const inverted = pin.type === 'BOOL' && !!this.block.pins?.[pin.id]?.inverted;
        const driver = this.drivers.get(`${this.block.id}.${pin.id}`);
        if (driver) {
            return inverted ? `!${driver}` : driver;
        }
        const literal = toLiteral(this.block.params?.[pin.id] ?? pin.default, pin.type);
        return inverted ? (literal === 'true' ? 'false' : 'true') : literal;
    }
    param(id) {
        const def = this.def.params?.find(param => param.id === id);
        if (!def) {
            throw new Error(`Block type ${this.def.type} has no parameter "${id}"`);
        }
        const value = this.block.params?.[id] ?? def.default;
        if (def.type === 'OID' || def.type === 'ENUM') {
            return JSON.stringify(value === undefined ? '' : String(value));
        }
        return toLiteral(value, (0, graph_1.resolvePinType)(this.block, def.type, this.def));
    }
    line() {
        const code = this.def.code.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\*:([^}]*)\}|\{(\$?)([A-Za-z_][A-Za-z0-9_]*)\}/g, (_match, prefix, separator, dollar, name) => {
            if (prefix) {
                return this.inputs
                    .filter(pin => pin.id.startsWith(prefix))
                    .map(pin => this.input(pin))
                    .join(separator);
            }
            if (dollar) {
                return this.param(name);
            }
            if (name === 'I') {
                return `I.${this.block.id}`;
            }
            const output = this.outputs.find(pin => pin.id === name);
            if (output) {
                return signal(this.block.id, output.id);
            }
            const input = this.inputs.find(pin => pin.id === name);
            if (input) {
                return this.input(input);
            }
            throw new Error(`Block type ${this.def.type} has no pin "${name}"`);
        });
        return `${code} /*#fb:${this.block.id}*/`;
    }
}
function formatIssue(issue) {
    let index = 0;
    return issue.message.replace(/%s/g, () => issue.args?.[index++] ?? '');
}
/**
 * Turns a diagram into the source of a script.
 *
 * The code keeps no copy of the blocks: the runtime module implements them, so a fix there
 * reaches every diagram without generating it again. The marks `/*#fb:<id>*\/` lead from a line of
 * the code back to its block.
 *
 * A diagram with errors is stored as well, so no work is lost - but its code only reports the
 * errors instead of running.
 */
function generateSource(input) {
    const analysis = (0, analyze_1.analyzeGraph)(input);
    const graph = {
        ...input,
        format: types_1.FB_FORMAT,
        runtime: types_1.FB_RUNTIME_VERSION,
        blocks: input.blocks.map(block => analysis.order[block.id] !== undefined ? { ...block, order: analysis.order[block.id] } : block),
    };
    const header = `/*#fb format:${types_1.FB_FORMAT} runtime:${types_1.FB_RUNTIME_VERSION}*/`;
    const errors = analysis.issues.filter(issue => issue.severity === 'error');
    if (errors.length) {
        const list = errors.map(formatIssue);
        const lines = [
            header,
            '// This function block diagram has errors and is not executed:',
            ...list.map(text => `//   - ${text}`),
            `log(${JSON.stringify(`The function block diagram has errors and is not executed: ${list.join('; ')}`)}, 'error');`,
            (0, graph_1.serializeGraph)(graph),
        ];
        return { source: lines.join('\n'), graph, analysis };
    }
    const drivers = new Map();
    analysis.links.forEach(link => drivers.set(`${link.to[0]}.${link.to[1]}`, signal(link.from[0], link.from[1])));
    const blocks = graph.blocks
        .filter(block => analysis.order[block.id] !== undefined)
        .sort((a, b) => analysis.order[a.id] - analysis.order[b.id]);
    const instances = [];
    const signals = [];
    const body = [];
    const inputs = new Set();
    const outputs = new Set();
    for (const block of blocks) {
        const def = (0, library_1.getBlockDef)(block.type);
        if (def.stateful) {
            instances.push(`    ${block.id}: fb.${def.type}(), /*#fb:${block.id}*/`);
        }
        (0, graph_1.getOutputs)(block, def).forEach(pin => signals.push(`    '${block.id}.${pin.id}': ${initialValue(pin.type)},`));
        body.push(`    ${new BlockWriter(block, def, drivers).line()}`);
        if (block.type === 'STATE_IN') {
            inputs.add(String(block.params?.oid));
        }
        else if (block.type === 'STATE_OUT') {
            outputs.add(String(block.params?.oid));
        }
    }
    const lines = [
        header,
        '// Generated from a function block diagram - changes made here are overwritten by the editor',
        `const fb = require('${types_1.FB_RUNTIME_MODULE}');`,
        `const rt = fb.runtime({ getStateAsync, setState, on, onStop, setInterval, clearInterval, setTimeout, clearTimeout, log }, '${types_1.FB_RUNTIME_VERSION}');`,
        '',
        '// the blocks that keep a state from one cycle to the next',
        instances.length ? `const I = {\n${instances.join('\n')}\n};` : 'const I = {};',
        '// signals `<block>.<pin>`: they keep their value too, so a link leading back reads the previous cycle',
        signals.length ? `const S = {\n${signals.join('\n')}\n};` : 'const S = {};',
        '',
        'function cycle(dt, firstScan) {',
        ...body,
        '}',
        '',
        `rt.start(cycle, ${JSON.stringify({ mode: analysis.mode, ms: analysis.ms, inputs: [...inputs], outputs: [...outputs] })});`,
        (0, graph_1.serializeGraph)(graph),
    ];
    return { source: lines.join('\n'), graph, analysis };
}
//# sourceMappingURL=generate.js.map