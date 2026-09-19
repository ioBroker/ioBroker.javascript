'use strict';

/**
 * Function block diagrams (FBD): the checks and the execution order of fb-core, the generated code,
 * and that code running against fb-runtime in a sandbox made of plain functions.
 *
 * Run: npx tsc -p tsconfig.build.json && mocha test/testFbd.js --exit
 */
const assert = require('node:assert').strict;
const vm = require('node:vm');

const fb = require('../build/lib/fb');
const runtime = require('../build/lib/fb/runtime');
const { Mirror } = require('../build/lib/mirror');

/** A small builder, so a test reads like the diagram it draws */
function diagram() {
    const graph = fb.createGraph();
    let links = 0;
    const api = {
        graph,
        add(type, x, y, params) {
            const block = fb.createBlock(type, [x, y], graph);
            if (params) {
                block.params = { ...block.params, ...params };
            }
            graph.blocks.push(block);
            return block;
        },
        link(from, output, to, input) {
            const id = `l${++links}`;
            graph.links.push({ id, from: [from.id, output], to: [to.id, input] });
            return id;
        },
    };
    return api;
}

function errors(analysis) {
    return analysis.issues.filter(issue => issue.severity === 'error').map(issue => issue.message);
}

/**
 * Runs generated code the way the adapter does: in a VM whose global is the sandbox. States live in
 * a Map; `set()` changes one the way a device would.
 */
function runInSandbox(source, initialStates) {
    const states = new Map(Object.entries(initialStates || {}));
    const writes = [];
    const logs = [];
    const handlers = new Map();
    const timers = new Set();
    const stopHandlers = [];

    const sandbox = {
        require: name => {
            assert.equal(name, '@iobroker/fb-runtime');
            return runtime;
        },
        getStateAsync: async id => (states.has(id) ? { val: states.get(id), ack: true } : null),
        setState: (id, val, ack) => {
            states.set(id, val);
            writes.push({ id, val, ack });
        },
        on: (pattern, callback) => {
            handlers.set(pattern.id, callback);
        },
        onStop: callback => stopHandlers.push(callback),
        setInterval: (callback, ms) => {
            const timer = setInterval(callback, ms);
            timers.add(timer);
            return timer;
        },
        clearInterval: timer => {
            clearInterval(timer);
            timers.delete(timer);
        },
        setTimeout: (callback, ms) => {
            const timer = setTimeout(() => {
                timers.delete(timer);
                callback();
            }, ms);
            timers.add(timer);
            return timer;
        },
        clearTimeout: timer => {
            clearTimeout(timer);
            timers.delete(timer);
        },
        log: (message, severity) => logs.push({ message, severity: severity || 'info' }),
    };
    vm.runInNewContext(source, sandbox);

    return {
        writes,
        logs,
        set(id, val) {
            if (states.get(id) !== val) {
                states.set(id, val);
                handlers.get(id)?.({ id, state: { val, ack: true } });
            }
        },
        stop() {
            stopHandlers.forEach(callback => callback());
            timers.forEach(timer => {
                clearTimeout(timer);
                clearInterval(timer);
            });
            timers.clear();
        },
    };
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('FBD: fb-core', () => {
    it('reads and writes times', () => {
        assert.equal(fb.parseTime('2s'), 2000);
        assert.equal(fb.parseTime('T#1m30s'), 90000);
        assert.equal(fb.parseTime('500ms'), 500);
        assert.equal(fb.parseTime('250'), 250);
        assert.equal(fb.parseTime(1500), 1500);
        assert.equal(fb.parseTime('abc'), null);
        assert.equal(fb.parseTime('2x'), null);
        assert.equal(fb.formatTime(2000), '2s');
        assert.equal(fb.formatTime(1500), '1.5s');
        assert.equal(fb.formatTime(90000), '90s');
        assert.equal(fb.formatTime(120000), '2m');
        assert.equal(fb.formatTime(250), '250ms');
    });

    it('allows only widening between types', () => {
        assert.ok(fb.isCompatible('INT', 'REAL'));
        assert.ok(fb.isCompatible('BOOL', 'ANY'));
        assert.ok(!fb.isCompatible('REAL', 'INT'));
        assert.ok(!fb.isCompatible('BOOL', 'REAL'));
        assert.ok(!fb.isCompatible('TIME', 'REAL'));
    });

    it('expands extensible blocks and resolves types from parameters', () => {
        const d = diagram();
        const and = d.add('AND', 0, 0, { inputs: 4 });
        assert.deepEqual(
            fb.getInputs(and).map(pin => pin.id),
            ['IN1', 'IN2', 'IN3', 'IN4'],
        );
        const input = d.add('STATE_IN', 0, 0, { oid: 'a.0.b', type: 'BOOL' });
        assert.equal(fb.getOutputs(input)[0].type, 'BOOL');
        const constant = d.add('CONST', 0, 0, { type: 'STRING', value: 'x' });
        assert.equal(fb.getOutputs(constant)[0].type, 'STRING');
    });

    it('orders the blocks along the data flow, not by their position', () => {
        const d = diagram();
        // drawn right to left: the order must still follow the links
        const output = d.add('STATE_OUT', 0, 0, { oid: 'x.0.out' });
        const not = d.add('NOT', 200, 0);
        const input = d.add('STATE_IN', 400, 0, { oid: 'x.0.in', type: 'BOOL' });
        d.link(input, 'Q', not, 'IN');
        d.link(not, 'OUT', output, 'IN');

        const { order, issues, feedback } = fb.analyzeGraph(d.graph);
        assert.deepEqual(issues, []);
        assert.ok(order[input.id] < order[not.id]);
        assert.ok(order[not.id] < order[output.id]);
        assert.deepEqual(feedback, []);
    });

    it('orders independent blocks from left to right', () => {
        const d = diagram();
        const right = d.add('CONST', 300, 0);
        const left = d.add('CONST', 100, 50);
        const { order } = fb.analyzeGraph(d.graph);
        assert.equal(order[left.id], 10);
        assert.equal(order[right.id], 20);
    });

    it('rejects a loop without a block that stores a value', () => {
        const d = diagram();
        const or = d.add('OR', 0, 0);
        const not = d.add('NOT', 200, 0);
        d.link(or, 'OUT', not, 'IN');
        d.link(not, 'OUT', or, 'IN1');

        const analysis = fb.analyzeGraph(d.graph);
        assert.deepEqual(errors(analysis), ['Loop without a block that stores a value: %s']);
        assert.deepEqual(analysis.issues[0].blockIds.sort(), [not.id, or.id].sort());
    });

    it('allows a loop through a flip-flop and reads its previous cycle', () => {
        const d = diagram();
        const rs = d.add('RS', 0, 0);
        const not = d.add('NOT', 200, 0);
        const fromMemory = d.link(rs, 'Q1', not, 'IN');
        d.link(not, 'OUT', rs, 'S');

        const analysis = fb.analyzeGraph(d.graph);
        assert.deepEqual(errors(analysis), []);
        // the loop is cut at the output of the block that stores: NOT reads what RS put out last cycle
        assert.ok(analysis.order[not.id] < analysis.order[rs.id]);
        assert.deepEqual(analysis.feedback, [fromMemory]);
    });

    it('checks types, double connections and missing parameters', () => {
        const d = diagram();
        const input = d.add('STATE_IN', 0, 0, { oid: 'x.0.in', type: 'REAL' });
        const not = d.add('NOT', 200, 0);
        const and = d.add('AND', 200, 100);
        const flag = d.add('CONST', 0, 100, { type: 'BOOL', value: true });
        const output = d.add('STATE_OUT', 400, 0);
        d.link(input, 'Q', not, 'IN');
        d.link(flag, 'Q', and, 'IN1');
        d.link(flag, 'Q', and, 'IN1');
        d.link(and, 'OUT', output, 'IN');

        assert.deepEqual(errors(fb.analyzeGraph(d.graph)).sort(), [
            'Input %s is connected more than once',
            'Parameter "%s" is not set',
            'Types do not match: %s cannot be connected to %s',
        ]);
    });

    it('runs event driven without timers and cyclic with them', () => {
        const d = diagram();
        d.add('NOT', 0, 0);
        assert.equal(fb.analyzeGraph(d.graph).mode, 'event');
        d.add('TON', 100, 0);
        assert.equal(fb.analyzeGraph(d.graph).mode, 'cyclic');
        d.graph.cycle = { mode: 'cyclic', ms: 5 };
        assert.equal(fb.analyzeGraph(d.graph).ms, 50, 'the cycle time is limited to 50 ms');
    });

    it('keeps the graph in the last line of the source', () => {
        const d = diagram();
        const input = d.add('STATE_IN', 0, 0, { oid: 'x.0.in', type: 'BOOL' });
        const output = d.add('STATE_OUT', 200, 0, { oid: 'x.0.out' });
        d.link(input, 'Q', output, 'IN');

        const { source, graph } = fb.generateSource(d.graph);
        assert.ok(source.startsWith('/*#fb format:1 runtime:1.0.0*/'));
        assert.ok(source.includes('/*#fb:b1*/'), 'lines are marked with their block');
        assert.ok(fb.isFbdSource(source));
        assert.deepEqual(fb.parseGraph(source), graph);
        assert.equal(graph.blocks[0].order, 10, 'the order is written back');

        assert.equal(Mirror.detectType('script.js', source), 'FBD');
        assert.deepEqual(fb.parseGraph(''), fb.createGraph(), 'a new script is an empty diagram');
        assert.equal(fb.parseGraph('console.log(1);'), null);
    });

    it('stores a diagram with errors, but its code does not run', () => {
        const d = diagram();
        d.add('STATE_IN', 0, 0);
        const { source } = fb.generateSource(d.graph);
        assert.ok(!source.includes('rt.start'));
        const sandbox = runInSandbox(source);
        assert.equal(sandbox.logs.length, 1);
        assert.equal(sandbox.logs[0].severity, 'error');
        assert.match(sandbox.logs[0].message, /has errors/);
        assert.deepEqual(fb.parseGraph(source).blocks.length, 1);
    });

    it('does not break the code with strange state IDs', () => {
        const d = diagram();
        const input = d.add('STATE_IN', 0, 0, { oid: 'x.0.it\'s "quoted"\n*/', type: 'STRING' });
        const output = d.add('STATE_OUT', 200, 0, { oid: 'x.0.out' });
        d.link(input, 'Q', output, 'IN');
        const { source } = fb.generateSource(d.graph);
        assert.doesNotThrow(() => new vm.Script(source));
    });
});

describe('FBD: fb-runtime', () => {
    it('implements the timers', () => {
        const ton = runtime.TON();
        ton.run(true, 100, 60);
        assert.equal(ton.ET, 0, 'counting starts with the cycle that sees the edge');
        ton.run(true, 100, 60);
        assert.equal(ton.Q, false);
        ton.run(true, 100, 60);
        assert.equal(ton.Q, true);
        assert.equal(ton.ET, 100);
        ton.run(false, 100, 10);
        assert.deepEqual([ton.Q, ton.ET], [false, 0]);

        const tof = runtime.TOF();
        tof.run(true, 100, 10);
        assert.equal(tof.Q, true);
        tof.run(false, 100, 60);
        tof.run(false, 100, 60);
        assert.equal(tof.Q, true);
        tof.run(false, 100, 60);
        assert.equal(tof.Q, false);

        const tp = runtime.TP();
        tp.run(true, 100, 10);
        assert.equal(tp.Q, true);
        tp.run(false, 100, 60);
        tp.run(true, 100, 10); // no retrigger while the pulse runs
        assert.equal(tp.Q, true);
        tp.run(true, 100, 60);
        assert.equal(tp.Q, false);
    });

    it('does not let a timer expire early when a cycle runs because an input changed', () => {
        // the cycle before ran 190 ms ago; IN changed 20 ms ago and triggered this cycle
        const ton = runtime.TON();
        ton.run(false, 200, 0);
        ton.run(true, 200, 190);
        assert.equal(ton.ET, 0);
        ton.run(true, 200, 150);
        assert.equal(ton.Q, false, 'only 150 ms since the edge was seen');
        ton.run(true, 200, 200);
        assert.equal(ton.Q, true);
    });

    it('implements flip-flops and edges', () => {
        const rs = runtime.RS();
        rs.run(true, true);
        assert.equal(rs.Q1, false, 'RS: reset wins');
        const sr = runtime.SR();
        sr.run(true, true);
        assert.equal(sr.Q1, true, 'SR: set wins');
        sr.run(false, false);
        assert.equal(sr.Q1, true, 'SR keeps its state');

        const edge = runtime.R_TRIG();
        edge.run(true, true);
        assert.equal(edge.Q, false, 'no edge in the first cycle');
        edge.run(false, false);
        edge.run(true, false);
        assert.equal(edge.Q, true);
        edge.run(true, false);
        assert.equal(edge.Q, false);
    });

    it('runs an event driven diagram when an input changes', async () => {
        const d = diagram();
        const input = d.add('STATE_IN', 0, 0, { oid: 'x.0.temperature', type: 'REAL' });
        const gt = d.add('GT', 200, 0, { IN2: 25 });
        const output = d.add('STATE_OUT', 400, 0, { oid: 'x.0.fan', ack: true });
        d.link(input, 'Q', gt, 'IN1');
        d.link(gt, 'OUT', output, 'IN');

        const sandbox = runInSandbox(fb.generateSource(d.graph).source, {
            'x.0.temperature': 20,
            'x.0.fan': false,
        });
        await wait(30);
        assert.deepEqual(sandbox.writes, [], 'the output already has the value - nothing is written');

        sandbox.set('x.0.temperature', 30);
        await wait(60);
        assert.deepEqual(sandbox.writes, [{ id: 'x.0.fan', val: true, ack: true }]);

        // two changes within the collect window run in one cycle
        sandbox.set('x.0.temperature', 20);
        sandbox.set('x.0.temperature', 31);
        await wait(60);
        assert.equal(sandbox.writes.length, 1, 'the output did not change in the end');
        sandbox.stop();
        assert.deepEqual(sandbox.logs, []);
    });

    it('runs a timer cyclically', async () => {
        const d = diagram();
        const motion = d.add('STATE_IN', 0, 0, { oid: 'x.0.motion', type: 'BOOL' });
        const ton = d.add('TON', 200, 0, { PT: 150 });
        const light = d.add('STATE_OUT', 400, 0, { oid: 'x.0.light' });
        d.link(motion, 'Q', ton, 'IN');
        d.link(ton, 'Q', light, 'IN');
        d.graph.cycle = { mode: 'auto', ms: 50 };

        const sandbox = runInSandbox(fb.generateSource(d.graph).source, { 'x.0.motion': false, 'x.0.light': false });
        await wait(30);
        sandbox.set('x.0.motion', true);
        await wait(80);
        assert.deepEqual(sandbox.writes, [], 'not before the time is over');
        await wait(250);
        assert.deepEqual(sandbox.writes, [{ id: 'x.0.light', val: true, ack: false }]);
        sandbox.set('x.0.motion', false);
        await wait(60);
        assert.deepEqual(sandbox.writes[1], { id: 'x.0.light', val: false, ack: false });
        sandbox.stop();
    });

    it('limits how often an output is written', async () => {
        const writes = [];
        const rt = runtime.runtime(
            {
                setState: (id, val) => writes.push(val),
                setTimeout: (callback, ms) => setTimeout(callback, ms),
                clearTimeout: timer => clearTimeout(timer),
                log: () => {},
                onStop: () => {},
            },
            '1.0.0',
        );
        rt.output('x.0.out', 1, false, 100);
        rt.output('x.0.out', 2, false, 100);
        rt.output('x.0.out', 3, false, 100);
        assert.deepEqual(writes, [1]);
        await wait(150);
        assert.deepEqual(writes, [1, 3], 'the last value is written when the time is over');
    });

    it('reports a value that is no number once and uses 0', () => {
        const logs = [];
        const rt = runtime.runtime({ log: (message, severity) => logs.push(severity), onStop: () => {} }, '1.0.0');
        rt.values.set('x.0.in', 'abc');
        assert.equal(rt.input('x.0.in', 'REAL'), 0);
        assert.equal(rt.input('x.0.in', 'REAL'), 0);
        assert.deepEqual(logs, ['warn']);
        assert.equal(rt.input('x.0.in', 'STRING'), 'abc');
    });

    it('warns when the code was made for another major version', () => {
        const logs = [];
        runtime.runtime({ log: message => logs.push(message), onStop: () => {} }, '2.0.0');
        assert.equal(logs.length, 1);
    });
});
