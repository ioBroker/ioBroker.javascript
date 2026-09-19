import { analyzeGraph, type FbAnalysis } from './analyze';
import { getInputs, getOutputs, resolvePinType, serializeGraph, type FbPin } from './graph';
import { getBlockDef } from './library';
import {
    FB_FORMAT,
    FB_RUNTIME_MODULE,
    FB_RUNTIME_VERSION,
    type FbBlock,
    type FbBlockDef,
    type FbGraph,
    type FbIssue,
    type FbSignalType,
    type FbValue,
} from './types';

export interface FbGenerated {
    /** The whole script source: the code, and the graph in the last line */
    source: string;
    /** The graph with the execution order written back */
    graph: FbGraph;
    analysis: FbAnalysis;
}

const TIME_UNITS: Record<string, number> = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 };

/**
 * A time in ms. Takes a number of ms, or a text like `2s`, `1m30s`, `500ms` or `T#2s` (IEC).
 * Returns `null` if the text is not a time.
 */
export function parseTime(value: FbValue | null | undefined): number | null {
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
    return Math.round(
        parts.reduce((sum, part) => {
            const [, number, unit] = part.match(/(\d+(?:\.\d+)?)(ms|s|m|h|d)/)!;
            return sum + Number(number) * TIME_UNITS[unit];
        }, 0),
    );
}

/** A time for people: `1500` gives `1.5s` */
export function formatTime(ms: number): string {
    if (!ms) {
        return '0ms';
    }
    for (const unit of ['d', 'h', 'm', 's'] as const) {
        const value = ms / TIME_UNITS[unit];
        if (value >= 1 && Number.isInteger(Math.round(value * 1000) / 1000)) {
            return `${Math.round(value * 1000) / 1000}${unit}`;
        }
    }
    return ms >= 1000 ? `${Math.round(ms / 100) / 10}s` : `${ms}ms`;
}

/** A value as a JavaScript literal of the given type */
export function toLiteral(value: FbValue | null | undefined, type: FbSignalType | 'ANY'): string {
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

function initialValue(type: FbSignalType | 'ANY'): string {
    return type === 'BOOL' ? 'false' : type === 'STRING' ? "''" : '0';
}

function signal(blockId: string, pinId: string): string {
    return `S['${blockId}.${pinId}']`;
}

class BlockWriter {
    private readonly inputs: FbPin[];
    private readonly outputs: FbPin[];

    constructor(
        private readonly block: FbBlock,
        private readonly def: FbBlockDef,
        /** `blockId.pinId` of an input to the signal that drives it */
        private readonly drivers: Map<string, string>,
    ) {
        this.inputs = getInputs(block, def);
        this.outputs = getOutputs(block, def);
    }

    private input(pin: FbPin): string {
        const inverted = pin.type === 'BOOL' && !!this.block.pins?.[pin.id]?.inverted;
        const driver = this.drivers.get(`${this.block.id}.${pin.id}`);
        if (driver) {
            return inverted ? `!${driver}` : driver;
        }
        const literal = toLiteral(this.block.params?.[pin.id] ?? pin.default, pin.type);
        return inverted ? (literal === 'true' ? 'false' : 'true') : literal;
    }

    private param(id: string): string {
        const def = this.def.params?.find(param => param.id === id);
        if (!def) {
            throw new Error(`Block type ${this.def.type} has no parameter "${id}"`);
        }
        const value = this.block.params?.[id] ?? def.default;
        if (def.type === 'OID' || def.type === 'ENUM') {
            return JSON.stringify(value === undefined ? '' : String(value));
        }
        return toLiteral(value, resolvePinType(this.block, def.type, this.def));
    }

    line(): string {
        const code = this.def.code.replace(
            /\{([A-Za-z_][A-Za-z0-9_]*)\*:([^}]*)\}|\{(\$?)([A-Za-z_][A-Za-z0-9_]*)\}/g,
            (_match, prefix?: string, separator?: string, dollar?: string, name?: string): string => {
                if (prefix) {
                    return this.inputs
                        .filter(pin => pin.id.startsWith(prefix))
                        .map(pin => this.input(pin))
                        .join(separator);
                }
                if (dollar) {
                    return this.param(name!);
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
            },
        );
        return `${code} /*#fb:${this.block.id}*/`;
    }
}

function formatIssue(issue: FbIssue): string {
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
export function generateSource(input: FbGraph): FbGenerated {
    const analysis = analyzeGraph(input);
    const graph: FbGraph = {
        ...input,
        format: FB_FORMAT,
        runtime: FB_RUNTIME_VERSION,
        blocks: input.blocks.map(block =>
            analysis.order[block.id] !== undefined ? { ...block, order: analysis.order[block.id] } : block,
        ),
    };

    const header = `/*#fb format:${FB_FORMAT} runtime:${FB_RUNTIME_VERSION}*/`;
    const errors = analysis.issues.filter(issue => issue.severity === 'error');
    if (errors.length) {
        const list = errors.map(formatIssue);
        const lines = [
            header,
            '// This function block diagram has errors and is not executed:',
            ...list.map(text => `//   - ${text}`),
            `log(${JSON.stringify(`The function block diagram has errors and is not executed: ${list.join('; ')}`)}, 'error');`,
            serializeGraph(graph),
        ];
        return { source: lines.join('\n'), graph, analysis };
    }

    const drivers = new Map<string, string>();
    analysis.links.forEach(link => drivers.set(`${link.to[0]}.${link.to[1]}`, signal(link.from[0], link.from[1])));

    const blocks = graph.blocks
        .filter(block => analysis.order[block.id] !== undefined)
        .sort((a, b) => analysis.order[a.id] - analysis.order[b.id]);

    const instances: string[] = [];
    const signals: string[] = [];
    const body: string[] = [];
    const inputs = new Set<string>();
    const outputs = new Set<string>();

    for (const block of blocks) {
        const def = getBlockDef(block.type)!;
        if (def.stateful) {
            instances.push(`    ${block.id}: fb.${def.type}(), /*#fb:${block.id}*/`);
        }
        getOutputs(block, def).forEach(pin => signals.push(`    '${block.id}.${pin.id}': ${initialValue(pin.type)},`));
        body.push(`    ${new BlockWriter(block, def, drivers).line()}`);
        if (block.type === 'STATE_IN') {
            inputs.add(String(block.params?.oid));
        } else if (block.type === 'STATE_OUT') {
            outputs.add(String(block.params?.oid));
        }
    }

    const lines = [
        header,
        '// Generated from a function block diagram - changes made here are overwritten by the editor',
        `const fb = require('${FB_RUNTIME_MODULE}');`,
        `const rt = fb.runtime({ getStateAsync, setState, on, onStop, setInterval, clearInterval, setTimeout, clearTimeout, log }, '${FB_RUNTIME_VERSION}');`,
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
        serializeGraph(graph),
    ];

    return { source: lines.join('\n'), graph, analysis };
}
