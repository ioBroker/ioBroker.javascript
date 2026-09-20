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
 *
 * `options.module`: what `require('@iobroker/fb-runtime')` gives (the plain module by default),
 * `options.prefix`: lines in front of the source, like the global scripts the adapter puts there
 */
function runInSandbox(source, initialStates, options = {}) {
    const states = new Map(Object.entries(initialStates || {}));
    const writes = [];
    const logs = [];
    const handlers = new Map();
    const timers = new Set();
    const stopHandlers = [];
    const schedules = [];
    const sent = [];
    const notifications = [];

    const sandbox = {
        require: name => {
            assert.equal(name, '@iobroker/fb-runtime');
            return options.module || runtime;
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
        schedule: (pattern, callback) => {
            const job = { pattern, callback };
            schedules.push(job);
            return job;
        },
        // the sun rises at 06:00 and sets at 20:00, every day
        getAstroDate: (event, date) => {
            const times = options.astro || { sunrise: '06:00', sunset: '20:00' };
            if (!times[event]) {
                return undefined;
            }
            const [hours, minutes] = times[event].split(':').map(Number);
            const day = new Date(date);
            day.setHours(hours, minutes, 0, 0);
            return day;
        },
        sendTo: (instance, command, message) => sent.push({ instance, command, message }),
        registerNotification: (message, isAlert) => notifications.push({ message, isAlert: !!isAlert }),
    };
    vm.runInNewContext(`${options.prefix || ''}${source}`, sandbox, { filename: 'script.js.test' });

    return {
        writes,
        logs,
        schedules,
        sent,
        notifications,
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
        assert.equal(fb.formatTime(90000), '1m30s');
        assert.equal(fb.formatTime(5400000), '1h30m');
        assert.equal(fb.parseTime('08:30'), 30600000);
        assert.equal(fb.parseTime('TOD#22:15:30'), 80130000);
        assert.equal(fb.parseTime('25:00'), 90000000);
        assert.equal(fb.parseTime('08:60'), null);
        assert.equal(fb.formatClock(30600000), '08:30');
        assert.equal(fb.formatClock(80130000), '22:15:30');
        assert.equal(fb.formatTime(120000), '2m');
        assert.equal(fb.formatTime(250), '250ms');
    });

    it('allows only widening between types', () => {
        assert.ok(fb.isCompatible('INT', 'REAL'));
        assert.ok(fb.isCompatible('BOOL', 'ANY'));
        assert.ok(fb.isCompatible('ANY', 'BOOL'), 'the output of a JS block goes anywhere');
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
        assert.ok(source.startsWith(`/*#fb format:1 runtime:${fb.FB_RUNTIME_VERSION}*/`));
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

describe('FBD: online view', () => {
    /** temperature > 25 => fan */
    function fanDiagram() {
        const d = diagram();
        const input = d.add('STATE_IN', 0, 0, { oid: 'x.0.temperature', type: 'REAL' });
        const gt = d.add('GT', 200, 0, { IN2: 25 });
        const output = d.add('STATE_OUT', 400, 0, { oid: 'x.0.fan' });
        d.link(input, 'Q', gt, 'IN1');
        d.link(gt, 'OUT', output, 'IN');
        return { d, input, gt };
    }

    /** fb-runtime as the adapter hands it to a script, with an editor that watches while `viewer` is not 0 */
    function watchedModule() {
        const watch = { viewer: 1, snapshots: [] };
        watch.module = runtime.forScript({
            watched: () => watch.viewer,
            publish: snapshot => watch.snapshots.push(snapshot),
        });
        return watch;
    }

    it('sends all signals first, then only what changed', async () => {
        const { d, input, gt } = fanDiagram();
        const watch = watchedModule();
        const sandbox = runInSandbox(fb.generateSource(d.graph).source, { 'x.0.temperature': 20 }, watch);
        await wait(300);

        const [first] = watch.snapshots;
        assert.equal(first.full, true);
        assert.equal(first.mode, 'event');
        assert.equal(first.cycle, 1);
        assert.deepEqual(first.values, { [`${input.id}.Q`]: 20, [`${gt.id}.OUT`]: false });
        assert.equal(first.error, null);

        sandbox.set('x.0.temperature', 30);
        await wait(300);
        const last = watch.snapshots[watch.snapshots.length - 1];
        assert.equal(last.full, undefined);
        assert.equal(last.cycle, 2);
        assert.deepEqual(last.values, { [`${input.id}.Q`]: 30, [`${gt.id}.OUT`]: true });
        assert.equal('error' in last, false, 'the error did not change');

        // nothing new - and the next heartbeat is only due in 2 s
        const count = watch.snapshots.length;
        await wait(300);
        assert.equal(watch.snapshots.length, count);

        // another editor opens the diagram: it gets everything once
        watch.viewer = 2;
        await wait(300);
        assert.equal(watch.snapshots[watch.snapshots.length - 1].full, true);
        sandbox.stop();
    });

    it('sends nothing while nobody watches', async () => {
        const { d } = fanDiagram();
        const watch = watchedModule();
        watch.viewer = 0;
        const sandbox = runInSandbox(fb.generateSource(d.graph).source, { 'x.0.temperature': 20 }, watch);
        await wait(300);
        assert.deepEqual(watch.snapshots, []);
        sandbox.stop();
    });

    it('finds the block whose line failed, also behind the global scripts', async () => {
        const d = diagram();
        const input = d.add('STATE_IN', 0, 0, { oid: 'x.0.in', type: 'REAL' });
        const div = d.add('DIV', 200, 0);
        const output = d.add('STATE_OUT', 400, 0, { oid: 'x.0.out' });
        d.link(input, 'Q', div, 'IN1');
        d.link(div, 'OUT', output, 'IN');

        const watch = watchedModule();
        // a runtime whose division is broken
        watch.module = {
            ...watch.module,
            div: () => {
                throw new Error('broken division');
            },
        };
        const sandbox = runInSandbox(
            fb.generateSource(d.graph).source,
            { 'x.0.in': 1 },
            {
                module: watch.module,
                // the adapter puts the global scripts in front of the source
                prefix: 'const a = 1;\nconst b = 2;\n\n',
            },
        );
        await wait(300);

        assert.deepEqual(watch.snapshots[0].error, { message: 'broken division', blockId: div.id });
        const errors = sandbox.logs.filter(entry => entry.severity === 'error');
        assert.equal(errors.length, 1);
        assert.match(errors[0].message, new RegExp(`in block ${div.id}:`));
        sandbox.stop();
    });

    it('also serves diagrams generated before the online view', async () => {
        const { d } = fanDiagram();
        // the code of version 1.0.0 passed neither the lines, nor the blocks, nor the signals
        const source = fb
            .generateSource(d.graph)
            .source.replace(/rt\.start\(cycle, (\{.*\}), S, B, I\);/, (_match, json) => {
                const { lines: _lines, blocks: _blocks, ...options } = JSON.parse(json);
                return `rt.start(cycle, ${JSON.stringify(options)});`;
            });
        assert.ok(!source.includes('"lines"'));

        const watch = watchedModule();
        const sandbox = runInSandbox(source, { 'x.0.temperature': 20 }, watch);
        await wait(300);
        assert.equal(watch.snapshots[0].cycle, 1);
        assert.deepEqual(watch.snapshots[0].values, {});
        sandbox.stop();
    });
});

describe('FBD: user blocks', () => {
    /** A block "delay": IN -> TON (PT from its pin) -> Q */
    function delayBlock(version = 1) {
        const d = diagram();
        d.graph.block = { ...fb.createBlockInfo('delay'), version };
        const input = d.add('FB_IN', 0, 0, { pin: 'IN', type: 'BOOL', value: false });
        const time = d.add('FB_IN', 0, 100, { pin: 'PT', type: 'TIME', value: 1000 });
        const ton = d.add('TON', 200, 0);
        const output = d.add('FB_OUT', 400, 0, { pin: 'Q', type: 'BOOL' });
        d.link(input, 'Q', ton, 'IN');
        d.link(time, 'Q', ton, 'PT');
        d.link(ton, 'Q', output, 'IN');
        return d.graph;
    }

    /** A diagram that has the copy of `definition` (and of what it uses) */
    function using(definition) {
        const d = diagram();
        const user = fb.userBlockOf(definition);
        d.graph.userBlocks = fb.mergeUserBlocks(definition.userBlocks, { [user.type]: user });
        return d;
    }

    it('takes its pins from FB_IN and FB_OUT, from top to bottom', () => {
        const user = fb.userBlockOf(delayBlock());
        assert.equal(user.type, '@userFb/delay');
        const def = fb.getBlockDef(user.type, { [user.type]: user });
        assert.deepEqual(
            def.inputs.map(pin => `${pin.id}:${pin.type}`),
            ['IN:BOOL', 'PT:TIME'],
        );
        assert.deepEqual(
            def.outputs.map(pin => pin.id),
            ['Q'],
        );
        assert.equal(def.stateful, true);
        assert.equal(def.timeDependent, true, 'it contains a timer');
    });

    it('stores the diagram of a block, but it does not run on its own', () => {
        const { source, analysis } = fb.generateSource(delayBlock());
        assert.deepEqual(errors(analysis), []);
        assert.ok(!source.includes('rt.start'));
        assert.equal(fb.parseGraph(source).block.type, '@userFb/delay');
    });

    it('gives every instance a state of its own', async () => {
        const d = using(delayBlock());
        const a = d.add('STATE_IN', 0, 0, { oid: 'x.0.a', type: 'BOOL' });
        const b = d.add('STATE_IN', 0, 200, { oid: 'x.0.b', type: 'BOOL' });
        const first = d.add('@userFb/delay', 200, 0, { PT: 100 });
        const second = d.add('@userFb/delay', 200, 200, { PT: 100 });
        const x = d.add('STATE_OUT', 400, 0, { oid: 'x.0.x' });
        const y = d.add('STATE_OUT', 400, 200, { oid: 'x.0.y' });
        d.link(a, 'Q', first, 'IN');
        d.link(b, 'Q', second, 'IN');
        d.link(first, 'Q', x, 'IN');
        d.link(second, 'Q', y, 'IN');
        d.graph.cycle = { mode: 'auto', ms: 50 };
        assert.equal(first.name, 'delay_1', 'named after the block');

        const { source, analysis } = fb.generateSource(d.graph);
        assert.deepEqual(errors(analysis), []);
        assert.equal(analysis.mode, 'cyclic', 'the timer inside makes the diagram cyclic');
        assert.ok(source.includes('function UFB_delay()'));

        const sandbox = runInSandbox(source, { 'x.0.a': false, 'x.0.b': false, 'x.0.x': false, 'x.0.y': false });
        await wait(30);
        sandbox.set('x.0.a', true);
        await wait(300);
        assert.deepEqual(sandbox.writes, [{ id: 'x.0.x', val: true, ack: false }], 'only the first instance');
        sandbox.stop();
        assert.deepEqual(sandbox.logs, []);
    });

    it('uses blocks inside blocks', async () => {
        // "twice": two delays in a row
        const d = using(delayBlock());
        d.graph.block = fb.createBlockInfo('twice');
        const input = d.add('FB_IN', 0, 0, { pin: 'IN', type: 'BOOL' });
        const one = d.add('@userFb/delay', 200, 0, { PT: 50 });
        const two = d.add('@userFb/delay', 400, 0, { PT: 50 });
        const output = d.add('FB_OUT', 600, 0, { pin: 'Q', type: 'BOOL' });
        d.link(input, 'Q', one, 'IN');
        d.link(one, 'Q', two, 'IN');
        d.link(two, 'Q', output, 'IN');
        const twice = fb.generateSource(d.graph).graph;

        const top = using(twice);
        assert.deepEqual(Object.keys(top.graph.userBlocks).sort(), ['@userFb/delay', '@userFb/twice']);
        const a = top.add('STATE_IN', 0, 0, { oid: 'x.0.a', type: 'BOOL' });
        const block = top.add('@userFb/twice', 200, 0);
        const x = top.add('STATE_OUT', 400, 0, { oid: 'x.0.x' });
        top.link(a, 'Q', block, 'IN');
        top.link(block, 'Q', x, 'IN');
        top.graph.cycle = { mode: 'auto', ms: 50 };

        const { source, analysis } = fb.generateSource(top.graph);
        assert.deepEqual(errors(analysis), []);
        const sandbox = runInSandbox(source, { 'x.0.a': false, 'x.0.x': false });
        await wait(30);
        sandbox.set('x.0.a', true);
        await wait(80);
        assert.deepEqual(sandbox.writes, [], 'not before both delays are over');
        await wait(300);
        assert.deepEqual(sandbox.writes, [{ id: 'x.0.x', val: true, ack: false }]);
        sandbox.stop();
    });

    it('rejects a block that contains itself', () => {
        const definition = delayBlock();
        const d = using(definition);
        d.graph.block = definition.block;
        d.add('@userFb/delay', 0, 0);
        assert.ok(errors(fb.analyzeGraph(d.graph)).includes('The block %s contains itself'));
    });

    it('keeps the pins and the states apart', () => {
        const d = diagram();
        d.add('FB_IN', 0, 0, { pin: 'IN' });
        assert.deepEqual(errors(fb.analyzeGraph(d.graph)), [
            'Inputs and outputs of a block only work in the diagram of a block',
        ]);

        d.graph.block = fb.createBlockInfo('test');
        d.add('FB_OUT', 0, 100, { pin: 'IN' });
        d.add('FB_OUT', 0, 200, { pin: 'run' });
        d.add('STATE_IN', 0, 300, { oid: 'x.0.a' });
        assert.deepEqual(errors(fb.analyzeGraph(d.graph)).sort(), [
            'A block cannot read or write states - give it inputs and outputs instead',
            'Invalid pin name %s',
            'The pin name %s is used twice',
        ]);
    });

    it('keeps the version a diagram copied until it is updated', () => {
        const v1 = fb.userBlockOf(delayBlock(1));
        const v2 = fb.userBlockOf(delayBlock(2));
        const type = v1.type;
        assert.equal(fb.mergeUserBlocks({ [type]: v2 }, { [type]: v1 })[type].version, 2, 'never downgraded');
        assert.equal(fb.mergeUserBlocks({ [type]: v1 }, { [type]: v2 })[type].version, 2, 'a newer copy wins');
        assert.equal(fb.mergeUserBlocks({ [type]: v2 }, { [type]: v1 }, [type])[type].version, 1, 'unless updated');
    });

    it('drops the copies of blocks that are no longer used', () => {
        const d = using(delayBlock());
        d.add('NOT', 0, 0);
        assert.equal(fb.generateSource(d.graph).graph.userBlocks, undefined);
    });

    it('finds the instance whose block failed', async () => {
        const inner = diagram();
        inner.graph.block = fb.createBlockInfo('divider');
        const input = inner.add('FB_IN', 0, 0, { pin: 'IN', type: 'REAL' });
        const div = inner.add('DIV', 200, 0);
        const output = inner.add('FB_OUT', 400, 0, { pin: 'OUT', type: 'REAL' });
        inner.link(input, 'Q', div, 'IN1');
        inner.link(div, 'OUT', output, 'IN');

        const d = using(inner.graph);
        const value = d.add('STATE_IN', 0, 0, { oid: 'x.0.in', type: 'REAL' });
        const block = d.add('@userFb/divider', 200, 0);
        const result = d.add('STATE_OUT', 400, 0, { oid: 'x.0.out' });
        d.link(value, 'Q', block, 'IN');
        d.link(block, 'OUT', result, 'IN');

        const module = runtime.forScript({ watched: () => 1, publish: () => {} });
        module.div = () => {
            throw new Error('broken division');
        };
        const sandbox = runInSandbox(fb.generateSource(d.graph).source, { 'x.0.in': 1 }, { module });
        await wait(100);
        const logged = sandbox.logs.find(entry => entry.severity === 'error');
        assert.match(logged.message, new RegExp(`in block ${block.id}:`));
        sandbox.stop();
    });

    describe('online view inside an instance', () => {
        /** fb-runtime with an editor that looks into the instances of `watch.paths` */
        function insideModule() {
            const watch = { viewer: 1, paths: [], snapshots: [], handler: null };
            watch.module = runtime.forScript({
                watched: () => watch.viewer,
                paths: () => watch.paths,
                publish: snapshot => watch.snapshots.push(snapshot),
                listen: handler => {
                    watch.handler = handler;
                    return () => (watch.handler = null);
                },
            });
            watch.values = () => Object.assign({}, ...watch.snapshots.map(snapshot => snapshot.values || {}));
            return watch;
        }

        /** a -> delay (100 ms) -> x, b -> delay -> y; the inner blocks are b1 (IN), b2 (PT), b3 (TON), b4 (Q) */
        function twoDelays() {
            const d = using(delayBlock());
            const a = d.add('STATE_IN', 0, 0, { oid: 'x.0.a', type: 'BOOL' });
            const b = d.add('STATE_IN', 0, 200, { oid: 'x.0.b', type: 'BOOL' });
            const first = d.add('@userFb/delay', 200, 0, { PT: 100 });
            const second = d.add('@userFb/delay', 200, 200, { PT: 100 });
            const x = d.add('STATE_OUT', 400, 0, { oid: 'x.0.x' });
            const y = d.add('STATE_OUT', 400, 200, { oid: 'x.0.y' });
            d.link(a, 'Q', first, 'IN');
            d.link(b, 'Q', second, 'IN');
            d.link(first, 'Q', x, 'IN');
            d.link(second, 'Q', y, 'IN');
            d.graph.cycle = { mode: 'auto', ms: 50 };
            return { d, first, second };
        }

        const states = { 'x.0.a': false, 'x.0.b': false, 'x.0.x': false, 'x.0.y': false };

        it('sends the signals inside the instance an editor looks into', async () => {
            const { d, first, second } = twoDelays();
            const watch = insideModule();
            const sandbox = runInSandbox(fb.generateSource(d.graph).source, states, watch);
            await wait(300);
            assert.ok(!Object.keys(watch.values()).some(key => key.includes('/')), 'nothing inside while nobody looks');

            watch.paths = [first.id];
            sandbox.set('x.0.a', true);
            await wait(400);
            const values = watch.values();
            assert.equal(values[`${first.id}/b1.Q`], true, 'the input of the instance');
            assert.equal(values[`${first.id}/b2.Q`], 100, 'its time');
            assert.equal(values[`${first.id}/b3.Q`], true, 'the timer inside ran out');
            assert.equal(values[`${first.id}/b3.ET`], 100);
            assert.ok(!Object.keys(values).some(key => key.startsWith(`${second.id}/`)), 'not the other instance');
            assert.equal(watch.snapshots[watch.snapshots.length - 1].debug?.inside ?? true, true);
            sandbox.stop();
        });

        it('sends it again in full when somebody looks into it again', async () => {
            const { d, first } = twoDelays();
            const watch = insideModule();
            const sandbox = runInSandbox(fb.generateSource(d.graph).source, states, watch);
            watch.paths = [first.id];
            await wait(300);
            watch.paths = [];
            await wait(300);
            const count = watch.snapshots.length;
            watch.paths = [first.id];
            await wait(300);
            const again = Object.assign({}, ...watch.snapshots.slice(count).map(snapshot => snapshot.values || {}));
            assert.equal(again[`${first.id}/b3.Q`], false, 'unchanged, but sent again');
            sandbox.stop();
        });

        it('forces a signal inside an instance', async () => {
            const { d, first } = twoDelays();
            const watch = insideModule();
            const sandbox = runInSandbox(fb.generateSource(d.graph).source, states, watch);
            await wait(100);
            const status = watch.handler({ command: 'force', signal: `${first.id}/b1.Q`, value: true });
            assert.equal(status.inside, true);
            assert.deepEqual(status.forced, { [`${first.id}/b1.Q`]: true });
            await wait(400);
            assert.deepEqual(sandbox.writes, [{ id: 'x.0.x', val: true, ack: false }], 'the timer inside got TRUE');

            watch.handler({ command: 'release' });
            await wait(200);
            assert.deepEqual(
                sandbox.writes.map(write => write.val),
                [true, false],
            );
            assert.throws(() => watch.handler({ command: 'force', signal: 'b99/b1.Q', value: true }), /Unknown signal/);
            sandbox.stop();
        });

        it('looks into an instance inside an instance', async () => {
            const inner = using(delayBlock());
            inner.graph.block = fb.createBlockInfo('wrapper');
            const pin = inner.add('FB_IN', 0, 0, { pin: 'IN', type: 'BOOL' });
            const delay = inner.add('@userFb/delay', 200, 0, { PT: 50 });
            const out = inner.add('FB_OUT', 400, 0, { pin: 'Q', type: 'BOOL' });
            inner.link(pin, 'Q', delay, 'IN');
            inner.link(delay, 'Q', out, 'IN');

            const top = using(fb.generateSource(inner.graph).graph);
            const a = top.add('STATE_IN', 0, 0, { oid: 'x.0.a', type: 'BOOL' });
            const wrapper = top.add('@userFb/wrapper', 200, 0);
            top.link(a, 'Q', wrapper, 'IN');
            top.graph.cycle = { mode: 'auto', ms: 50 };

            const watch = insideModule();
            watch.paths = [`${wrapper.id}/${delay.id}`];
            const sandbox = runInSandbox(fb.generateSource(top.graph).source, { 'x.0.a': true }, watch);
            await wait(400);
            assert.equal(watch.values()[`${wrapper.id}/${delay.id}/b3.Q`], true);
            sandbox.stop();
        });

        it('says so when the code is too old to look inside', async () => {
            const { d, first } = twoDelays();
            const source = fb.generateSource(d.graph).source.replace(/, S, B, I\);/, ', S, B);');
            const watch = insideModule();
            watch.paths = [first.id];
            const sandbox = runInSandbox(source, states, watch);
            await wait(300);
            assert.equal(watch.snapshots[0].debug.inside, false);
            assert.ok(!Object.keys(watch.values()).some(key => key.includes('/')));
            sandbox.stop();
        });
    });
});

describe('FBD: control blocks', () => {
    it('switches with a hysteresis', () => {
        const hyst = runtime.HYST();
        const q = value => {
            hyst.run(value, 1, 0);
            return hyst.Q;
        };
        assert.deepEqual([q(0.5), q(1.5), q(0.5), q(0), q(-0.5), q(0.5)], [false, true, true, true, false, false]);
    });

    it('limits the rate of a ramp and starts at its input', () => {
        const ramp = runtime.RAMP();
        ramp.run(10, 5, 2, 0, true);
        assert.equal(ramp.OUT, 10, 'no ramp up from 0 after a start');
        ramp.run(20, 5, 2, 1000, false);
        assert.equal(ramp.OUT, 15);
        ramp.run(20, 5, 2, 2000, false);
        assert.equal(ramp.OUT, 20, 'never beyond the input');
        ramp.run(18, 5, 2, 500, false);
        assert.equal(ramp.OUT, 19);
        ramp.run(0, 5, 0, 100, false);
        assert.equal(ramp.OUT, 0, 'a rate of 0 does not limit');
    });

    it('filters with a PT1, whatever the cycles are', () => {
        const once = runtime.PT1();
        once.run(0, 1000, 0, true);
        once.run(1, 1000, 1000, false);
        assert.ok(Math.abs(once.OUT - (1 - Math.exp(-1))) < 1e-9);

        const often = runtime.PT1();
        often.run(0, 1000, 0, true);
        for (let i = 0; i < 10; i++) {
            often.run(1, 1000, 100, false);
        }
        assert.ok(Math.abs(often.OUT - once.OUT) < 1e-9, 'ten cycles of 100 ms give what one of 1 s gives');

        const direct = runtime.PT1();
        direct.run(5, 0, 100, false);
        assert.equal(direct.OUT, 5, 'T = 0 passes the input');
    });

    it('controls with P, I and D parts and does not wind up', () => {
        const pid = runtime.PID();
        // P only: KP 2, error 6
        pid.run(10, 4, 2, 0, 0, 0, 100, false, 0, true);
        assert.equal(pid.Y, 12);

        // I: TN 1 s, error 1 - the integral part grows by KP * e per TN
        const pi = runtime.PID();
        pi.run(1, 0, 1, 1000, 0, 0, 100, false, 0, true);
        assert.equal(pi.Y, 1);
        pi.run(1, 0, 1, 1000, 0, 0, 100, false, 1000, false);
        assert.equal(pi.Y, 2);
        pi.run(1, 0, 1, 1000, 0, 0, 100, false, 1000, false);
        assert.equal(pi.Y, 3);

        // at the limit it does not grow further: when the error turns, Y leaves the limit at once
        const limited = runtime.PID();
        limited.run(1, 0, 1, 1000, 0, 0, 2.5, false, 0, true);
        for (let i = 0; i < 20; i++) {
            limited.run(1, 0, 1, 1000, 0, 0, 2.5, false, 1000, false);
        }
        assert.equal(limited.Y, 2.5);
        limited.run(0, 1, 1, 1000, 0, 0, 2.5, false, 1000, false);
        assert.ok(limited.Y < 2.5, `no wind-up: ${limited.Y}`);

        // RST clears the integral part
        pi.run(1, 0, 1, 1000, 0, 0, 100, true, 1000, false);
        assert.equal(pi.Y, 1);

        // D works against a rising process value
        const pd = runtime.PID();
        pd.run(0, 0, 1, 0, 1000, -100, 100, false, 0, true);
        pd.run(0, 1, 1, 0, 1000, -100, 100, false, 200, false);
        assert.ok(pd.Y < -1, `the D part pulls down: ${pd.Y}`);
    });

    it('runs in a diagram', async () => {
        const d = diagram();
        const input = d.add('STATE_IN', 0, 0, { oid: 'x.0.temp', type: 'REAL' });
        const hyst = d.add('HYST', 200, 0, { HIGH: 22, LOW: 20 });
        const output = d.add('STATE_OUT', 400, 0, { oid: 'x.0.fan' });
        d.link(input, 'Q', hyst, 'IN');
        d.link(hyst, 'Q', output, 'IN');
        const { source, analysis } = fb.generateSource(d.graph);
        assert.deepEqual(errors(analysis), []);
        assert.equal(analysis.mode, 'event', 'a hysteresis needs no time');

        const sandbox = runInSandbox(source, { 'x.0.temp': 21, 'x.0.fan': true });
        await wait(50);
        assert.deepEqual(sandbox.writes, [{ id: 'x.0.fan', val: false, ack: false }]);
        sandbox.set('x.0.temp', 23);
        await wait(50);
        sandbox.set('x.0.temp', 21);
        await wait(50);
        assert.deepEqual(
            sandbox.writes.map(write => write.val),
            [false, true],
        );
        sandbox.stop();
    });
});

describe('FBD: LOG', () => {
    it('writes a line on a rising edge, or when the value changes', () => {
        const edge = runtime.LOG();
        const lines = [];
        const run = (block, trig, value, when, first = false) => {
            if (block.run(trig, value, 'Wert %s', when, 100, first)) {
                lines.push(block.line);
            }
        };
        run(edge, true, 1, 'edge', true); // no edge in the first cycle
        run(edge, false, 2, 'edge');
        run(edge, true, 3, 'edge');
        run(edge, true, 4, 'edge');
        assert.deepEqual(lines, ['Wert 3']);

        const change = runtime.LOG();
        lines.length = 0;
        run(change, false, 20, 'change', true); // what it starts with is no change
        run(change, false, 20, 'change');
        run(change, false, 21.5, 'change');
        run(change, false, true, 'change');
        assert.deepEqual(lines, ['Wert 21.5', 'Wert true']);
    });

    it('writes at most 20 lines a minute, and says so', () => {
        const block = runtime.LOG();
        let written = 0;
        let last = '';
        block.run(false, 0, '%s', 'change', 0, true);
        for (let i = 1; i <= 50; i++) {
            if (block.run(false, i, '%s', 'change', 200, false)) {
                written++;
                last = block.line;
            }
        }
        assert.equal(written, runtime.LOG_LIMIT);
        assert.match(last, /20 lines a minute at most/);
        // a minute later it writes again
        assert.equal(block.run(false, 999, '%s', 'change', 60000, false), true);
    });

    it('writes into the log of the script, with its level', async () => {
        const d = diagram();
        const input = d.add('STATE_IN', 0, 0, { oid: 'x.0.temp', type: 'REAL' });
        const log = d.add('LOG', 200, 0, { text: 'Temperatur %s °C', level: 'warn', when: 'change' });
        d.link(input, 'Q', log, 'IN');
        const { source, analysis } = fb.generateSource(d.graph);
        assert.deepEqual(errors(analysis), []);

        const sandbox = runInSandbox(source, { 'x.0.temp': 20 });
        await wait(50);
        sandbox.set('x.0.temp', 25);
        await wait(50);
        assert.deepEqual(sandbox.logs, [{ message: 'Temperatur 25 °C', severity: 'warn' }]);
        sandbox.stop();
    });

    it('may be used inside an own block, which reads no states', () => {
        const d = diagram();
        d.graph.block = fb.createBlockInfo('logger');
        const pin = d.add('FB_IN', 0, 0, { pin: 'IN', type: 'BOOL' });
        const log = d.add('LOG', 200, 0);
        d.link(pin, 'Q', log, 'TRIG');
        assert.deepEqual(errors(fb.analyzeGraph(d.graph)), []);
    });
});

describe('FBD: conversion', () => {
    it('converts whatever comes in', () => {
        assert.equal(runtime.toBool('on'), true);
        assert.equal(runtime.toInt('12,6'), 13);
        assert.equal(runtime.toInt(true), 1);
        assert.equal(runtime.toInt('abc'), 0);
        assert.equal(runtime.toReal('21,5'), 21.5);
        assert.equal(runtime.toReal(null), 0);
        assert.equal(runtime.toTime('1m30s'), 90000);
        assert.equal(runtime.toTime('08:30'), 30600000);
        assert.equal(runtime.toTime(1500.4), 1500);
        assert.equal(runtime.toTime(-5), 0);
        assert.equal(runtime.toStr(21.5), '21.5');
        assert.equal(runtime.toStr(null), '');
        assert.equal(runtime.toStr({ a: 1 }), '{"a":1}');
        assert.equal(runtime.concat('Temp: ', 21.5, ' °C'), 'Temp: 21.5 °C');
    });

    it('rounds decimals without the errors of binary numbers', () => {
        assert.equal(runtime.round(1.005, 2), 1.01);
        assert.equal(runtime.round(21.456, 1), 21.5);
        assert.equal(runtime.round(2.5, 0), 3);
        assert.equal(runtime.round(-1.25, 1), -1.2);
        assert.equal(runtime.round(1e-7, 2), 0);
        assert.equal(runtime.round(1234.5678, 20), 1234.5678);
        assert.equal(runtime.round(NaN, 2), 0);
    });

    it('builds a text in a diagram', async () => {
        const d = diagram();
        const input = d.add('STATE_IN', 0, 0, { oid: 'x.0.temp', type: 'REAL' });
        const round = d.add('ROUND', 200, 0, { DIGITS: 1 });
        const concat = d.add('CONCAT', 400, 0, { inputs: 3, IN1: 'Temp: ', IN3: ' °C' });
        const output = d.add('STATE_OUT', 600, 0, { oid: 'x.0.text' });
        d.link(input, 'Q', round, 'IN');
        d.link(round, 'OUT', concat, 'IN2');
        d.link(concat, 'OUT', output, 'IN');
        const { source, analysis } = fb.generateSource(d.graph);
        assert.deepEqual(errors(analysis), []);

        const sandbox = runInSandbox(source, { 'x.0.temp': 21.456 });
        await wait(50);
        assert.deepEqual(
            sandbox.writes.map(write => write.val),
            ['Temp: 21.5 °C'],
        );
        sandbox.stop();
    });
});

describe('FBD: counters and blinker', () => {
    it('counts up on rising edges, not on an input that is true from the start', () => {
        const ctu = runtime.CTU();
        ctu.run(true, false, 3, true);
        assert.equal(ctu.CV, 0);
        for (const cu of [false, true, false, true, true, false, true]) {
            ctu.run(cu, false, 3, false);
        }
        assert.equal(ctu.CV, 3);
        assert.equal(ctu.Q, true);
        ctu.run(false, true, 3, false);
        assert.equal(ctu.CV, 0);
        assert.equal(ctu.Q, false);
    });

    it('counts down from what it loaded', () => {
        const ctd = runtime.CTD();
        ctd.run(false, true, 2, true);
        assert.equal(ctd.CV, 2);
        assert.equal(ctd.Q, false);
        for (const cd of [true, false, true]) {
            ctd.run(cd, false, 2, false);
        }
        assert.equal(ctd.CV, 0);
        assert.equal(ctd.Q, true);
    });

    it('counts up and down, both at once cancel out', () => {
        const ctud = runtime.CTUD();
        const cv = [];
        ctud.run(false, false, false, false, 2, true);
        for (const [cu, cd] of [
            [true, false],
            [false, false],
            [true, true],
            [false, false],
            [true, false],
        ]) {
            ctud.run(cu, cd, false, false, 2, false);
            cv.push(ctud.CV);
        }
        assert.deepEqual(cv, [1, 1, 1, 1, 2]);
        assert.equal(ctud.QU, true);
        ctud.run(false, true, false, false, 2, false);
        assert.equal(ctud.CV, 1);
        ctud.run(false, false, true, true, 2, false);
        assert.equal(ctud.CV, 0, 'R goes before LD');
        assert.equal(ctud.QD, true);
        ctud.run(false, false, false, true, 2, false);
        assert.equal(ctud.CV, 2);
    });

    it('blinks while it is enabled, and skips the periods a long cycle missed', () => {
        const blink = runtime.BLINK();
        const seen = [];
        blink.run(true, 300, 200, 0);
        seen.push(blink.Q);
        for (let i = 0; i < 10; i++) {
            blink.run(true, 300, 200, 100);
            seen.push(blink.Q);
        }
        assert.deepEqual(seen, [true, true, true, false, false, true, true, true, false, false, true]);
        blink.run(false, 300, 200, 100);
        assert.equal(blink.Q, false);

        blink.run(true, 300, 200, 0);
        blink.run(true, 300, 200, 1100);
        assert.equal(blink.Q, true, 'two periods and 100 ms: still in the first phase');
        blink.run(true, 300, 200, 250);
        assert.equal(blink.Q, false);
    });

    it('counts the edges of a state in a diagram', async () => {
        const d = diagram();
        const input = d.add('STATE_IN', 0, 0, { oid: 'x.0.button', type: 'BOOL' });
        const ctu = d.add('CTU', 200, 0, { PV: 2 });
        const count = d.add('STATE_OUT', 400, 0, { oid: 'x.0.count' });
        const done = d.add('STATE_OUT', 400, 100, { oid: 'x.0.done' });
        d.link(input, 'Q', ctu, 'CU');
        d.link(ctu, 'CV', count, 'IN');
        d.link(ctu, 'Q', done, 'IN');
        const { source, analysis } = fb.generateSource(d.graph);
        assert.deepEqual(errors(analysis), []);

        const sandbox = runInSandbox(source, { 'x.0.button': false, 'x.0.count': 0, 'x.0.done': false });
        await wait(50);
        for (const value of [true, false, true]) {
            sandbox.set('x.0.button', value);
            await wait(50);
        }
        assert.deepEqual(sandbox.writes, [
            { id: 'x.0.count', val: 1, ack: false },
            { id: 'x.0.count', val: 2, ack: false },
            { id: 'x.0.done', val: true, ack: false },
        ]);
        sandbox.stop();
    });
});

describe('FBD: calendar', () => {
    // September 2026: the 18th is a Friday, the 19th a Saturday, the 21st a Monday
    const at = (day, time) => {
        const [hours, minutes] = time.split(':').map(Number);
        return new Date(2026, 8, day, hours, minutes).getTime();
    };
    const h = hours => hours * 3600000;

    it('splits up the local time', () => {
        const clock = runtime.CLOCK();
        clock.run(at(20, '13:45'));
        assert.deepEqual(
            [clock.TOD, clock.HOUR, clock.MIN, clock.WDAY, clock.DAY, clock.MONTH, clock.YEAR],
            [h(13.75), 13, 45, 7, 20, 9, 2026],
        );
    });

    it('tells a time window, over midnight by the day it starts', () => {
        assert.equal(runtime.timeWindow(h(8), h(22), 'all', at(19, '07:59')), false);
        assert.equal(runtime.timeWindow(h(8), h(22), 'all', at(19, '08:00')), true);
        assert.equal(runtime.timeWindow(h(8), h(22), 'all', at(19, '22:00')), false);
        assert.equal(runtime.timeWindow(h(8), h(22), 'weekdays', at(19, '12:00')), false);
        assert.equal(runtime.timeWindow(h(8), h(22), 'weekdays', at(18, '12:00')), true);

        assert.equal(runtime.timeWindow(h(22), h(6), 'weekdays', at(18, '23:00')), true);
        assert.equal(runtime.timeWindow(h(22), h(6), 'weekdays', at(19, '05:00')), true, 'Friday night');
        assert.equal(runtime.timeWindow(h(22), h(6), 'weekdays', at(19, '23:00')), false);
        assert.equal(runtime.timeWindow(h(22), h(6), 'weekdays', at(21, '05:00')), false, 'Sunday night');
        assert.equal(runtime.timeWindow(h(22), h(6), 'weekend', at(21, '05:00')), true);
        assert.equal(runtime.timeWindow(h(8), h(8), 'all', at(19, '08:00')), false, 'empty');
    });

    it('gives a pulse when the time of a cron pattern comes', async () => {
        const d = diagram();
        const schedule = d.add('SCHEDULE', 0, 0, { cron: '0 8 * * *' });
        const ctu = d.add('CTU', 200, 0);
        const output = d.add('STATE_OUT', 400, 0, { oid: 'x.0.count' });
        d.link(schedule, 'Q', ctu, 'CU');
        d.link(ctu, 'CV', output, 'IN');
        const { source, analysis } = fb.generateSource(d.graph);
        assert.deepEqual(errors(analysis), []);
        assert.equal(analysis.mode, 'event');

        const sandbox = runInSandbox(source, { 'x.0.count': 0 });
        await wait(50);
        assert.deepEqual(
            sandbox.schedules.map(job => job.pattern),
            ['0 8 * * *'],
        );
        // the pulse ends by itself, so the counter sees two edges
        sandbox.schedules[0].callback();
        await wait(80);
        sandbox.schedules[0].callback();
        await wait(80);
        assert.deepEqual(
            sandbox.writes.map(write => write.val),
            [1, 2],
        );
        sandbox.stop();
    });

    it('is true between two events of the sun', async () => {
        const d = diagram();
        const astro = d.add('ASTRO', 0, 0, { endOffset: 30 });
        const night = d.add('STATE_OUT', 200, 0, { oid: 'x.0.night' });
        const start = d.add('STATE_OUT', 200, 100, { oid: 'x.0.start' });
        const end = d.add('STATE_OUT', 200, 200, { oid: 'x.0.end' });
        d.link(astro, 'Q', night, 'IN');
        d.link(astro, 'START', start, 'IN');
        d.link(astro, 'END', end, 'IN');
        const { source, analysis } = fb.generateSource(d.graph);
        assert.deepEqual(errors(analysis), []);

        const sandbox = runInSandbox(source, {});
        await wait(50);
        const values = Object.fromEntries(sandbox.writes.map(write => [write.id, write.val]));
        assert.equal(values['x.0.start'], h(20));
        assert.equal(values['x.0.end'], h(6.5));
        assert.equal(values['x.0.night'], runtime.inWindow(runtime.timeOfDay(), h(20), h(6.5)));
        sandbox.stop();

        // without a position there are no times - and no night
        const unknown = runInSandbox(source, {}, { astro: {} });
        await wait(50);
        assert.deepEqual(unknown.writes.find(write => write.id === 'x.0.night')?.val ?? false, false);
        unknown.stop();
    });
});

describe('FBD: messages', () => {
    it('sends messages to an adapter and notifications', async () => {
        const d = diagram();
        const input = d.add('STATE_IN', 0, 0, { oid: 'x.0.door', type: 'BOOL' });
        const send = d.add('SENDTO', 200, 0, { instance: 'telegram.0', text: 'Tür: %s', title: 'Haus' });
        const notify = d.add('NOTIFY', 200, 100, { category: 'alert', when: 'change' });
        d.link(input, 'Q', send, 'TRIG');
        d.link(input, 'Q', send, 'IN');
        d.link(input, 'Q', notify, 'IN');
        const { source, analysis } = fb.generateSource(d.graph);
        assert.deepEqual(errors(analysis), []);

        const sandbox = runInSandbox(source, { 'x.0.door': false });
        await wait(50);
        sandbox.set('x.0.door', true);
        await wait(50);
        sandbox.set('x.0.door', false);
        await wait(50);
        assert.deepEqual(sandbox.sent, [
            {
                instance: 'telegram.0',
                command: 'send',
                message: { text: 'Tür: true', message: 'Tür: true', title: 'Haus', subject: 'Haus' },
            },
        ]);
        assert.deepEqual(sandbox.notifications, [
            { message: 'true', isAlert: true },
            { message: 'false', isAlert: true },
        ]);
        sandbox.stop();
    });

    it('sends at most 5 messages a minute', () => {
        const block = runtime.SENDTO();
        let sent = 0;
        block.run(false, 0, '%s', 'change', 0, true);
        for (let i = 1; i <= 20; i++) {
            if (block.run(false, i, '%s', 'change', 200, false)) {
                sent++;
            }
        }
        assert.equal(sent, runtime.MESSAGE_LIMIT);
        assert.equal(block.last, true);
        assert.match(block.note(), /5 messages a minute at most/);
    });

    it('needs the instance to send to', () => {
        const d = diagram();
        d.add('SENDTO', 0, 0);
        assert.deepEqual(errors(fb.analyzeGraph(d.graph)), ['Parameter "%s" is not set']);
    });
});

describe('FBD: JS block', () => {
    it('runs code of the user with inputs, outputs and a state', async () => {
        const d = diagram();
        const input = d.add('STATE_IN', 0, 0, { oid: 'x.0.a', type: 'REAL' });
        const js = d.add('JS', 200, 0, {
            outputs: 2,
            IN2: 'x',
            code: 'state.n = (state.n || 0) + 1;\n// a text over two lines stays as it is\nconst text = `${IN2}\n${state.n}`;\nreturn [IN1 * 2, text];',
        });
        const double = d.add('STATE_OUT', 400, 0, { oid: 'x.0.double' });
        const text = d.add('STATE_OUT', 400, 100, { oid: 'x.0.text' });
        d.link(input, 'Q', js, 'IN1');
        d.link(js, 'OUT1', double, 'IN');
        d.link(js, 'OUT2', text, 'IN');
        const { source, analysis } = fb.generateSource(d.graph);
        assert.deepEqual(errors(analysis), []);
        assert.match(source, /fb\.JS\(function \(IN1, IN2, dt, firstScan, state\)/);
        assert.equal(fb.parseGraph(source).blocks.find(block => block.id === js.id).params.code, js.params.code);

        const sandbox = runInSandbox(source, { 'x.0.a': 5 });
        await wait(50);
        sandbox.set('x.0.a', 6);
        await wait(50);
        assert.deepEqual(
            sandbox.writes.map(write => [write.id, write.val]),
            [
                ['x.0.double', 10],
                ['x.0.text', 'x\n1'],
                ['x.0.double', 12],
                ['x.0.text', 'x\n2'],
            ],
        );
        sandbox.stop();
    });

    it('keeps an output the code gives nothing for', () => {
        const block = runtime.JS(a => (a > 0 ? [a, undefined, 7] : undefined), 2);
        block.run([1], 0, true);
        assert.deepEqual(block.out, [1, 0]);
        block.run([-1], 100, false);
        assert.deepEqual(block.out, [1, 0]);
    });

    it('rejects code with a syntax error, also code that closes its function', () => {
        for (const code of ['return (', '}); log("outside"); (function () {']) {
            const d = diagram();
            d.add('JS', 0, 0, { code });
            const issues = fb.analyzeGraph(d.graph).issues;
            assert.deepEqual(
                issues.map(issue => issue.message),
                ['The code has an error: %s'],
            );
        }
    });

    it('finds the JS block whose code failed, behind code over several lines', async () => {
        const d = diagram();
        const input = d.add('STATE_IN', 0, 0, { oid: 'x.0.a', type: 'REAL' });
        const js = d.add('JS', 200, 0, {
            inputs: 1,
            code: 'if (IN1 > 5) {\n    throw new Error("too big");\n}\nreturn IN1;',
        });
        const after = d.add('DIV', 400, 0);
        d.link(input, 'Q', js, 'IN1');
        d.link(js, 'OUT1', after, 'IN1');
        const { source } = fb.generateSource(d.graph);

        const sandbox = runInSandbox(source, { 'x.0.a': 1 }, { prefix: '// a global script\n\n' });
        await wait(50);
        sandbox.set('x.0.a', 6);
        await wait(50);
        assert.equal(sandbox.logs.length, 1);
        assert.match(sandbox.logs[0].message, new RegExp(`in block ${js.id}: .*too big`));
        sandbox.stop();
    });
});

describe('FBD: debugging in the online view', () => {
    /** in -> NOT -> out */
    function notDiagram() {
        const d = diagram();
        const input = d.add('STATE_IN', 0, 0, { oid: 'x.0.in', type: 'BOOL' });
        const not = d.add('NOT', 200, 0);
        const output = d.add('STATE_OUT', 400, 0, { oid: 'x.0.out' });
        d.link(input, 'Q', not, 'IN');
        d.link(not, 'OUT', output, 'IN');
        return { d, input, not, output };
    }

    /** fb-runtime as the adapter hands it to a script, with an editor that watches and sends commands */
    function debugModule() {
        const watch = { viewer: 1, snapshots: [], kept: null, handler: null };
        watch.module = runtime.forScript({
            watched: () => watch.viewer,
            publish: snapshot => watch.snapshots.push(snapshot),
            listen: handler => {
                watch.handler = handler;
                return () => (watch.handler = null);
            },
            keep: settings => (watch.kept = settings),
            restore: () => watch.kept,
        });
        watch.send = command => watch.handler(command);
        return watch;
    }

    const values = sandbox => sandbox.writes.map(write => write.val);

    it('forces a signal until it is released', async () => {
        const { d, input, not } = notDiagram();
        const watch = debugModule();
        const sandbox = runInSandbox(fb.generateSource(d.graph).source, { 'x.0.in': false }, watch);
        await wait(50);
        assert.deepEqual(values(sandbox), [true]);

        const status = watch.send({ command: 'force', signal: `${input.id}.Q`, value: 'true' });
        assert.deepEqual(status.forced, { [`${input.id}.Q`]: true }, 'the value takes the type of the signal');
        await wait(50);
        assert.deepEqual(values(sandbox), [true, false], 'the forced value runs through at once');

        // the state changes, but the forced value stays
        sandbox.set('x.0.in', false);
        await wait(50);
        assert.deepEqual(values(sandbox), [true, false]);
        const last = watch.snapshots[watch.snapshots.length - 1];
        assert.equal(last.debug.forced[`${input.id}.Q`], true);

        watch.send({ command: 'release', signal: `${input.id}.Q` });
        await wait(50);
        assert.deepEqual(values(sandbox), [true, false, true]);
        assert.equal(
            watch.send({ command: 'force', signal: `${not.id}.OUT`, value: 'off' }).forced[`${not.id}.OUT`],
            false,
        );
        assert.throws(() => watch.send({ command: 'force', signal: 'b99.Q', value: 1 }), /Unknown signal/);
        sandbox.stop();
    });

    it('stops at a breakpoint, steps block by block and runs on', async () => {
        const { d, input, not, output } = notDiagram();
        const watch = debugModule();
        const sandbox = runInSandbox(fb.generateSource(d.graph).source, { 'x.0.in': false }, watch);
        await wait(50);

        let status = watch.send({ command: 'breakpoint', block: not.id, on: true });
        assert.deepEqual(status.breakpoints, [not.id]);
        assert.equal(status.breaks, true);

        sandbox.set('x.0.in', true);
        await wait(50);
        status = watch.snapshots[watch.snapshots.length - 1].debug;
        assert.equal(status.paused, true);
        assert.equal(status.at, not.id, 'stopped in front of the block');
        assert.deepEqual(values(sandbox), [true], 'nothing behind the breakpoint ran');

        status = watch.send({ command: 'step' });
        assert.equal(status.at, output.id);
        assert.deepEqual(values(sandbox), [true]);
        status = watch.send({ command: 'step' });
        assert.deepEqual(values(sandbox), [true, false], 'the output ran');
        assert.equal(status.paused, true);
        assert.equal(status.at, input.id, 'waits in front of the next cycle');

        // while paused, changes wait too
        sandbox.set('x.0.in', false);
        await wait(50);
        assert.deepEqual(values(sandbox), [true, false]);

        watch.send({ command: 'breakpoint', on: false });
        status = watch.send({ command: 'resume' });
        assert.equal(status.paused, false);
        assert.deepEqual(values(sandbox), [true, false, true], 'what came meanwhile runs at once');
        sandbox.stop();
    });

    it('runs single cycles, in which the time goes on by the cycle time', async () => {
        const d = diagram();
        const input = d.add('STATE_IN', 0, 0, { oid: 'x.0.in', type: 'BOOL' });
        const ton = d.add('TON', 200, 0, { PT: 1000 });
        const output = d.add('STATE_OUT', 400, 0, { oid: 'x.0.out' });
        d.link(input, 'Q', ton, 'IN');
        d.link(ton, 'Q', output, 'IN');
        d.graph.cycle.ms = 200;
        const watch = debugModule();
        const sandbox = runInSandbox(fb.generateSource(d.graph).source, { 'x.0.in': false }, watch);
        await wait(50);

        let status = watch.send({ command: 'pause' });
        assert.equal(status.paused, true);
        sandbox.set('x.0.in', true);
        await wait(300);
        assert.deepEqual(values(sandbox), [false], 'no cycle runs while paused');

        // the first cycle sees the edge, five more of 200 ms each make the second
        for (let i = 0; i < 5; i++) {
            status = watch.send({ command: 'cycle' });
        }
        assert.deepEqual(values(sandbox), [false]);
        status = watch.send({ command: 'cycle' });
        assert.deepEqual(values(sandbox), [false, true]);
        assert.equal(status.paused, true);
        watch.send({ command: 'resume' });
        sandbox.stop();
    });

    it('lets go of everything when nobody watches any more', async () => {
        const { d, input, not } = notDiagram();
        const watch = debugModule();
        const sandbox = runInSandbox(fb.generateSource(d.graph).source, { 'x.0.in': false }, watch);
        await wait(50);
        watch.send({ command: 'force', signal: `${input.id}.Q`, value: true });
        watch.send({ command: 'breakpoint', block: not.id, on: true });
        watch.send({ command: 'pause' });
        assert.notEqual(watch.kept, null);

        watch.viewer = 0;
        await wait(300);
        assert.equal(watch.kept, null);
        assert.ok(sandbox.logs.some(entry => /online view of the diagram ended/.test(entry.message)));
        // not forced, no breakpoint, not paused: the diagram computes with the real input again
        sandbox.set('x.0.in', true);
        await wait(50);
        assert.equal(values(sandbox)[values(sandbox).length - 1], false);
        sandbox.stop();
    });

    it('keeps forced values and breakpoints when the script starts again', async () => {
        const { d, input, not } = notDiagram();
        const source = fb.generateSource(d.graph).source;
        const watch = debugModule();
        const first = runInSandbox(source, { 'x.0.in': false }, watch);
        await wait(50);
        watch.send({ command: 'force', signal: `${input.id}.Q`, value: true });
        watch.send({ command: 'breakpoint', block: not.id, on: true });
        first.stop();

        // saved: the script starts again
        const second = runInSandbox(source, { 'x.0.in': false }, watch);
        await wait(50);
        const status = watch.snapshots[watch.snapshots.length - 1].debug;
        assert.deepEqual(status.forced, { [`${input.id}.Q`]: true });
        assert.deepEqual(status.breakpoints, [not.id]);
        assert.equal(status.at, not.id, 'the first cycle stopped at the breakpoint');
        second.stop();
    });

    it('forces in code from before 1.2, but cannot stop there', async () => {
        const { d, input, not } = notDiagram();
        const source = fb.generateSource(d.graph).source.replace(/, S, B, I\);/, ', S);');
        const watch = debugModule();
        const sandbox = runInSandbox(source, { 'x.0.in': false }, watch);
        await wait(50);
        const status = watch.send({ command: 'force', signal: `${input.id}.Q`, value: true });
        assert.equal(status.breaks, false);
        assert.throws(() => watch.send({ command: 'breakpoint', block: not.id, on: true }), /save it once/);
        sandbox.stop();
    });
});

describe('FBD: layout and connection marks', () => {
    /** The absolute height of a pin, as the layout places it */
    function pinY(graph, positions, blockId, pinId, side) {
        const block = graph.blocks.find(b => b.id === blockId);
        const def = fb.getBlockDef(block.type, graph.userBlocks);
        const pins = side === 'out' ? fb.getOutputs(block, def) : fb.getInputs(block, def);
        const top = 22 + (def.params?.length ? 18 : 0);
        return positions[blockId][1] + top + pins.findIndex(pin => pin.id === pinId) * 20 + 10;
    }

    it('puts the blocks in columns along the data flow, with straight links in a chain', () => {
        const d = diagram();
        // drawn in a muddle
        const output = d.add('STATE_OUT', 0, 500, { oid: 'x.0.out' });
        const not = d.add('NOT', 300, 40);
        const input = d.add('STATE_IN', 600, 200, { oid: 'x.0.in', type: 'BOOL' });
        d.link(input, 'Q', not, 'IN');
        d.link(not, 'OUT', output, 'IN');

        const positions = fb.layoutGraph(d.graph);
        assert.ok(positions[input.id][0] < positions[not.id][0]);
        assert.ok(positions[not.id][0] < positions[output.id][0]);
        assert.equal(pinY(d.graph, positions, input.id, 'Q', 'out'), pinY(d.graph, positions, not.id, 'IN', 'in'));
        assert.equal(pinY(d.graph, positions, not.id, 'OUT', 'out'), pinY(d.graph, positions, output.id, 'IN', 'in'));
        // the top left corner stays
        assert.equal(Math.min(...Object.values(positions).map(pos => pos[0])), 0);
        assert.equal(Math.min(...Object.values(positions).map(pos => pos[1])), 40);
    });

    it('puts all outputs at the right, and no two blocks of a column on each other', () => {
        const d = diagram();
        const a = d.add('STATE_IN', 0, 0, { oid: 'x.0.a', type: 'BOOL' });
        const b = d.add('STATE_IN', 0, 100, { oid: 'x.0.b', type: 'BOOL' });
        const not1 = d.add('NOT', 200, 0);
        const not2 = d.add('NOT', 400, 0);
        const and = d.add('AND', 200, 100);
        const long = d.add('STATE_OUT', 600, 0, { oid: 'x.0.long' });
        const short = d.add('STATE_OUT', 300, 100, { oid: 'x.0.short' });
        d.link(a, 'Q', not1, 'IN');
        d.link(not1, 'OUT', not2, 'IN');
        d.link(not2, 'OUT', long, 'IN');
        d.link(a, 'Q', and, 'IN1');
        d.link(b, 'Q', and, 'IN2');
        d.link(and, 'OUT', short, 'IN');

        const positions = fb.layoutGraph(d.graph);
        assert.equal(positions[long.id][0], positions[short.id][0]);
        const columns = new Map();
        for (const block of d.graph.blocks) {
            const x = positions[block.id][0];
            columns.set(x, [...(columns.get(x) || []), block]);
        }
        for (const blocks of columns.values()) {
            const spans = blocks
                .map(block => {
                    const def = fb.getBlockDef(block.type);
                    const rows = Math.max(fb.getInputs(block, def).length, fb.getOutputs(block, def).length, 1);
                    const top = positions[block.id][1];
                    return [top, top + 22 + (def.params?.length ? 18 : 0) + rows * 20 + 6];
                })
                .sort((x, y) => x[0] - y[0]);
            for (let i = 1; i < spans.length; i++) {
                assert.ok(spans[i][0] >= spans[i - 1][1], 'blocks of a column do not overlap');
            }
        }
    });

    it('lays out a loop through a flip-flop', () => {
        const d = diagram();
        const set = d.add('STATE_IN', 0, 0, { oid: 'x.0.set', type: 'BOOL' });
        const rs = d.add('RS', 200, 0);
        const not = d.add('NOT', 400, 0);
        d.link(set, 'Q', rs, 'S');
        const back = d.link(rs, 'Q1', not, 'IN');
        d.link(not, 'OUT', rs, 'R1');
        assert.deepEqual(fb.analyzeGraph(d.graph).feedback, [back], 'NOT reads the flip-flop of the cycle before');
        const positions = fb.layoutGraph(d.graph);
        assert.equal(Object.keys(positions).length, 3);
        assert.ok(positions[not.id][0] < positions[rs.id][0], 'the link that leads back runs to the left');
    });

    it('keeps connection marks with the links', () => {
        const d = diagram();
        const input = d.add('STATE_IN', 0, 0, { oid: 'x.0.in', type: 'BOOL' });
        const output = d.add('STATE_OUT', 900, 0, { oid: 'x.0.out' });
        d.graph.links.push({ id: 'l1', from: [input.id, 'Q'], to: [output.id, 'IN'], mark: true, label: ' motion ' });
        const { source, analysis } = fb.generateSource(d.graph);
        assert.deepEqual(errors(analysis), []);
        assert.deepEqual(fb.parseGraph(source).links[0], {
            id: 'l1',
            from: [input.id, 'Q'],
            to: [output.id, 'IN'],
            mark: true,
            label: 'motion',
        });
        const odd = fb.normalizeGraph({
            links: [{ id: 'l2', from: ['a', 'Q'], to: ['b', 'IN'], mark: 'yes', label: 5 }],
        });
        assert.deepEqual(odd.links[0], { id: 'l2', from: ['a', 'Q'], to: ['b', 'IN'] });
    });
});
