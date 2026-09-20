"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toLiteral = toLiteral;
exports.generateSource = generateSource;
const analyze_1 = require("./analyze");
const graph_1 = require("./graph");
const library_1 = require("./library");
const types_1 = require("./types");
const js_1 = require("./js");
const time_1 = require("./time");
const user_1 = require("./user");
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
            return String((0, time_1.parseTime)(value) ?? 0);
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
/** The functions of the script sandbox the runtime gets */
const SANDBOX_FUNCTIONS = [
    'getStateAsync',
    'setState',
    'on',
    'onStop',
    'setInterval',
    'clearInterval',
    'setTimeout',
    'clearTimeout',
    'log',
    'schedule',
    'getAstroDate',
    'sendTo',
    'registerNotification',
];
/** Parameters that are texts, whatever they look like */
const TEXT_PARAMS = ['OID', 'ENUM', 'NAME', 'INSTANCE', 'CRON', 'CODE'];
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
        const type = def.type;
        if (typeof type === 'string' && TEXT_PARAMS.includes(type)) {
            return JSON.stringify(value === undefined ? '' : String(value));
        }
        return toLiteral(value, (0, graph_1.resolvePinType)(this.block, type, this.def));
    }
    /** An instance of a user block: its inputs in, one run, its outputs out - all on one line */
    userLine() {
        const instance = `I.${this.block.id}`;
        return [
            ...this.inputs.map(pin => `${instance}.${pin.id} = ${this.input(pin)};`),
            `${instance}.run(dt, firstScan);`,
            ...this.outputs.map(pin => `${signal(this.block.id, pin.id)} = ${instance}.${pin.id};`),
        ].join(' ');
    }
    /** A JS block: the function gets the inputs, its outputs keep what it did not give */
    jsLine() {
        const instance = `I.${this.block.id}`;
        return [
            `${instance}.run([${this.inputs.map(pin => this.input(pin)).join(', ')}], dt, firstScan);`,
            ...this.outputs.map((pin, i) => `${signal(this.block.id, pin.id)} = ${instance}.out[${i}];`),
        ].join(' ');
    }
    line() {
        if (this.def.user) {
            return `${this.userLine()} /*#fb:${this.block.id}*/`;
        }
        if (this.def.type === 'JS') {
            return `${this.jsLine()} /*#fb:${this.block.id}*/`;
        }
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
/** The code of the blocks of a diagram - of the diagram itself, or of a user block */
function writeBlocks(graph, analysis, userBlocks) {
    const drivers = new Map();
    analysis.links.forEach(link => drivers.set(`${link.to[0]}.${link.to[1]}`, signal(link.from[0], link.from[1])));
    const code = {
        blocks: graph.blocks
            .filter(block => analysis.order[block.id] !== undefined)
            .sort((a, b) => analysis.order[a.id] - analysis.order[b.id]),
        instances: [],
        signals: [],
        body: [],
        inputs: new Set(),
        outputs: new Set(),
    };
    for (const block of code.blocks) {
        const def = (0, library_1.getBlockDef)(block.type, userBlocks);
        if (def.user) {
            code.instances.push(`${block.id}: ${(0, user_1.factoryName)(def.type)}(), /*#fb:${block.id}*/`);
        }
        else if (def.type === 'JS') {
            // The code as it is, not indented - that would change a text over several lines. Its
            // syntax was checked on its own, so it cannot close the function early.
            code.instances.push(`${block.id}: fb.JS(function (${(0, js_1.jsParameters)(block, def).join(', ')}) { /*#fb:${block.id}*/\n${(0, js_1.jsCode)(block, def)}`, `}, ${(0, graph_1.getOutputs)(block, def).length}),`);
        }
        else if (def.stateful) {
            code.instances.push(`${block.id}: fb.${def.type}(), /*#fb:${block.id}*/`);
        }
        (0, graph_1.getOutputs)(block, def).forEach(pin => code.signals.push(`'${block.id}.${pin.id}': ${initialValue(pin.type)},`));
        code.body.push(new BlockWriter(block, def, drivers).line());
        if (block.type === 'STATE_IN') {
            code.inputs.add(String(block.params?.oid));
        }
        else if (block.type === 'STATE_OUT') {
            code.outputs.add(String(block.params?.oid));
        }
    }
    return code;
}
function indent(lines, depth) {
    const spaces = ' '.repeat(depth * 4);
    return lines.map(line => `${spaces}${line}`);
}
/** `const name = { ... };`, one entry per line; `depth` 1 is the top level */
function objectLiteral(name, entries, depth) {
    const lines = entries.length ? [`const ${name} = {`, ...indent(entries, 1), '};'] : [`const ${name} = {};`];
    return indent(lines, depth - 1);
}
/**
 * The factory of a user block: every call makes an instance with a state of its own. The inputs and
 * outputs are properties of the instance; `run()` is one cycle of the diagram of the block.
 */
function writeFactory(user, userBlocks) {
    const analysis = (0, analyze_1.analyzeGraph)(user.graph, { userBlocks, isBlock: true });
    const code = writeBlocks(user.graph, analysis, userBlocks);
    const def = (0, library_1.getBlockDef)(user.type, userBlocks);
    // the pins of a user block always have a signal type of their own
    const pins = [
        ...def.inputs.map(pin => `${pin.id}: ${toLiteral(pin.default, pin.type)}`),
        ...def.outputs.map(pin => `${pin.id}: ${initialValue(pin.type)}`),
    ];
    return [
        `// user block ${JSON.stringify(user.name)} (${user.type}), version ${user.version}`,
        `function ${(0, user_1.factoryName)(user.type)}() {`,
        `    const self = { ${pins.join(', ')} };`,
        ...objectLiteral('I', code.instances, 2),
        ...objectLiteral('S', code.signals, 2),
        // `$` is no part of a pin name, so these never meet a pin
        '    // for the online view: the inside of the instance',
        '    self.$I = I;',
        '    self.$S = S;',
        '    self.run = function (dt, firstScan) {',
        ...indent(code.body, 2),
        '    };',
        '    return self;',
        '}',
        '',
    ];
}
/**
 * Turns a diagram into the source of a script.
 *
 * The code keeps no copy of the library blocks: the runtime module implements them, so a fix there
 * reaches every diagram without generating it again. User blocks become factory functions in the
 * code - made of the copies the diagram carries, so a diagram keeps the version it copied. The marks
 * `/*#fb:<id>*\/` lead from a line of the code back to its block.
 *
 * A diagram with errors is stored as well, so no work is lost - but its code only reports the
 * errors instead of running. The diagram of a user block does not run on its own.
 */
function generateSource(input) {
    const analysis = (0, analyze_1.analyzeGraph)(input);
    // only the copies of the blocks that are used are kept
    const used = (0, user_1.usedUserBlocks)(input, input.userBlocks);
    const userBlocks = {};
    used.forEach(type => (userBlocks[type] = input.userBlocks[type]));
    const graph = {
        ...input,
        format: types_1.FB_FORMAT,
        runtime: types_1.FB_RUNTIME_VERSION,
        blocks: input.blocks.map(block => analysis.order[block.id] !== undefined ? { ...block, order: analysis.order[block.id] } : block),
    };
    if (used.length) {
        graph.userBlocks = userBlocks;
    }
    else {
        delete graph.userBlocks;
    }
    const header = `/*#fb format:${types_1.FB_FORMAT} runtime:${types_1.FB_RUNTIME_VERSION}*/`;
    if (graph.block) {
        const lines = [
            header,
            `// The diagram of the block ${JSON.stringify(graph.block.name)} (${graph.block.type}), version ${graph.block.version}.`,
            '// It does not run on its own: the diagrams that use it carry a copy of it.',
            (0, graph_1.serializeGraph)(graph),
        ];
        return { source: lines.join('\n'), graph, analysis };
    }
    const errors = analysis.issues.filter(issue => issue.severity === 'error');
    if (errors.length) {
        const list = errors.map(analyze_1.formatIssue);
        const lines = [
            header,
            '// This function block diagram has errors and is not executed:',
            ...list.map(text => `//   - ${text}`),
            `log(${JSON.stringify(`The function block diagram has errors and is not executed: ${list.join('; ')}`)}, 'error');`,
            (0, graph_1.serializeGraph)(graph),
        ];
        return { source: lines.join('\n'), graph, analysis };
    }
    const code = writeBlocks(graph, analysis, userBlocks);
    const top = [
        header,
        '// Generated from a function block diagram - changes made here are overwritten by the editor',
        `const fb = require('${types_1.FB_RUNTIME_MODULE}');`,
        `const rt = fb.runtime({ ${SANDBOX_FUNCTIONS.join(', ')} }, '${types_1.FB_RUNTIME_VERSION}');`,
        '',
        ...used.flatMap(type => writeFactory(userBlocks[type], userBlocks)),
        '// the blocks that keep a state from one cycle to the next',
        ...objectLiteral('I', code.instances, 1),
        '// signals `<block>.<pin>`: they keep their value too, so a link leading back reads the previous cycle',
        ...objectLiteral('S', code.signals, 1),
        '// breakpoints of the online view: the cycle stops in front of a block whose entry is set',
        'const B = [];',
        '',
        '// one cycle, from block `at` on - after a stop the runtime goes on there, `go` passes that breakpoint',
        'function cycle(dt, firstScan, at = 0, go = -1) {',
        '    switch (at) {',
    ]
        .join('\n')
        .split('\n');
    // With these, the runtime finds the block of an error: one line per block, in this order
    const bodyLine = top.length + 1;
    const options = {
        mode: analysis.mode,
        ms: analysis.ms,
        inputs: [...code.inputs],
        outputs: [...code.outputs],
        lines: { start: bodyLine + code.body.length + 4, body: bodyLine },
        blocks: code.blocks.map(block => block.id),
    };
    const lines = [
        ...top,
        ...indent(code.body.map((line, i) => `case ${i}: if (B[${i}] && go !== ${i}) return ${i}; ${line}`), 2),
        '    }',
        '    return -1;',
        '}',
        '',
        `rt.start(cycle, ${JSON.stringify(options)}, S, B, I);`,
        (0, graph_1.serializeGraph)(graph),
    ];
    return { source: lines.join('\n'), graph, analysis };
}
//# sourceMappingURL=generate.js.map