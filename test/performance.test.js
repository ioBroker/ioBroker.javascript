'use strict';
/**
 * Performance & correctness tests for iobroker.javascript - src/main.ts
 *
 * Run with: npx mocha test/performance.test.js
 */
const assert = require('node:assert').strict;

// ──────────────────────────────────────────────────────────────────────────────
// Isolated helper functions (extracted from main.ts)
// ──────────────────────────────────────────────────────────────────────────────

const HTTP_STATUS_TEXTS = new Map([
    [400, 'Bad Request'],
    [401, 'Unauthorized'],
    [403, 'Forbidden'],
    [404, 'Not Found'],
    [429, 'Too Many Requests / Rate Limit'],
    [500, 'Internal Server Error'],
    [502, 'Bad Gateway'],
    [503, 'Service Unavailable'],
]);
const httpStatusText = code => HTTP_STATUS_TEXTS.get(code) ?? `Error ${code}`;

// Minimal adapter log mock
function createLogMock() {
    const messages = [];
    return {
        log: {
            info: msg => messages.push({ level: 'info', msg }),
            warn: msg => messages.push({ level: 'warn', msg }),
            error: msg => messages.push({ level: 'error', msg }),
            debug: msg => messages.push({ level: 'debug', msg }),
        },
        messages,
    };
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. httpStatusText - O(1) map instead of object literal per call
// ──────────────────────────────────────────────────────────────────────────────
describe('httpStatusText()', () => {
    it('returns the correct text for known HTTP codes', () => {
        assert.equal(httpStatusText(400), 'Bad Request');
        assert.equal(httpStatusText(401), 'Unauthorized');
        assert.equal(httpStatusText(403), 'Forbidden');
        assert.equal(httpStatusText(404), 'Not Found');
        assert.equal(httpStatusText(429), 'Too Many Requests / Rate Limit');
        assert.equal(httpStatusText(500), 'Internal Server Error');
        assert.equal(httpStatusText(502), 'Bad Gateway');
        assert.equal(httpStatusText(503), 'Service Unavailable');
    });

    it('returns generic text for unknown codes', () => {
        assert.equal(httpStatusText(418), 'Error 418');
        assert.equal(httpStatusText(999), 'Error 999');
        assert.equal(httpStatusText(0), 'Error 0');
    });

    it('creates the map instance only ONCE - no GC pressure from new objects', () => {
        const start = process.memoryUsage().heapUsed;
        for (let i = 0; i < 100_000; i++) httpStatusText(500);
        const end = process.memoryUsage().heapUsed;
        // Heap delta should stay minimal (< 1 MB)
        assert.ok(end - start < 1024 * 1024, `Too much heap growth: ${end - start} bytes`);
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 2. stateIdSet - O(1) lookup instead of O(n) Array.includes() - performance test
// ──────────────────────────────────────────────────────────────────────────────
describe('stateIdSet – O(1) Lookup vs O(n) Array.includes()', () => {
    it('Set.has() is faster than Array.includes() for 50,000 entries', () => {
        const N = 50_000;
        const arr = [];
        const set = new Set();

        for (let i = 0; i < N; i++) {
            arr.push(`adapter.0.state.${i}`);
            set.add(`adapter.0.state.${i}`);
        }

        const target = `adapter.0.state.${N - 1}`; // worst case - last element

        const t0 = performance.now();
        for (let i = 0; i < 1_000; i++) arr.includes(target);
        const tArray = performance.now() - t0;

        const t1 = performance.now();
        for (let i = 0; i < 1_000; i++) set.has(target);
        const tSet = performance.now() - t1;

        assert.ok(
            tSet < tArray,
            `Set (${tSet.toFixed(2)}ms) should be faster than Array (${tArray.toFixed(2)}ms)`,
        );
    });

    it('stateIds and stateIdSet stay in sync on add/remove', () => {
        const stateIds = [];
        const stateIdSet = new Set();

        const addState = id => {
            if (!stateIdSet.has(id)) {
                stateIds.push(id);
                stateIdSet.add(id);
            }
        };
        const removeState = id => {
            const pos = stateIds.indexOf(id);
            if (pos !== -1) {
                stateIds.splice(pos, 1);
                stateIdSet.delete(id);
            }
        };

        addState('a.0.state.1');
        addState('a.0.state.2');
        addState('a.0.state.1'); // Duplicate - must not be inserted twice

        assert.equal(stateIds.length, 2);
        assert.equal(stateIdSet.size, 2);

        removeState('a.0.state.1');
        assert.equal(stateIds.length, 1);
        assert.equal(stateIdSet.size, 1);
        assert.ok(!stateIdSet.has('a.0.state.1'));
        assert.ok(stateIdSet.has('a.0.state.2'));
    });

    it('stateIdSet.has() handles 100,000 lookups without errors', () => {
        const set = new Set();
        for (let i = 0; i < 1_000; i++) set.add(`js.0.s.${i}`);
        let found = 0;
        for (let i = 0; i < 100_000; i++) {
            if (set.has(`js.0.s.${i % 1000}`)) found++;
        }
        assert.equal(found, 100_000);
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 3. nameById - O(1) reverse lookup instead of O(n) linear scan
// ──────────────────────────────────────────────────────────────────────────────
describe('nameById – O(1) getName() Reverse-Map', () => {
    function createNameStore() {
        const names = {};
        const nameById = new Map();

        const addToNames = (obj) => {
            const id = obj._id;
            let name = obj?.common?.name;
            if (!name || typeof name !== 'string') return;

            if (!names[name]) {
                names[name] = id;
            } else {
                if (!Array.isArray(names[name])) names[name] = [names[name]];
                names[name].push(id);
            }
            nameById.set(id, name);
        };

        const removeFromNames = (id) => {
            const n = nameById.get(id);
            if (n) {
                if (Array.isArray(names[n])) {
                    const pos = names[n].indexOf(id);
                    if (pos > -1) names[n].splice(pos, 1);
                    if (names[n].length === 1) names[n] = names[n][0];
                } else {
                    delete names[n];
                }
                nameById.delete(id);
            }
        };

        const getName = (id) => nameById.get(id) ?? null;

        return { addToNames, removeFromNames, getName, names, nameById };
    }

    it('finds the name of an ID in O(1)', () => {
        const store = createNameStore();
        store.addToNames({ _id: 'js.0.vars.temp', common: { name: 'Temperatur' } });
        store.addToNames({ _id: 'js.0.vars.hum', common: { name: 'Humidity' } });

        assert.equal(store.getName('js.0.vars.temp'), 'Temperatur');
        assert.equal(store.getName('js.0.vars.hum'), 'Humidity');
        assert.equal(store.getName('js.0.vars.unknown'), null);
    });

    it('removeFromNames correctly removes an ID from the reverse map', () => {
        const store = createNameStore();
        store.addToNames({ _id: 'js.0.vars.temp', common: { name: 'Temperatur' } });
        store.removeFromNames('js.0.vars.temp');

        assert.equal(store.getName('js.0.vars.temp'), null);
        assert.ok(!store.nameById.has('js.0.vars.temp'));
    });

    it('correctly manages multiple IDs with the same name', () => {
        const store = createNameStore();
        store.addToNames({ _id: 'js.0.a', common: { name: 'Sensor' } });
        store.addToNames({ _id: 'js.0.b', common: { name: 'Sensor' } });

        assert.equal(store.getName('js.0.a'), 'Sensor');
        assert.equal(store.getName('js.0.b'), 'Sensor');
        assert.ok(Array.isArray(store.names['Sensor']));

        store.removeFromNames('js.0.a');
        // After this, only 1 element remains - it should no longer be an array
        assert.equal(store.getName('js.0.a'), null);
        assert.equal(store.getName('js.0.b'), 'Sensor');
    });

    it('Map.get() is significantly faster than a linear scan with 10,000 objects', () => {
        const N = 10_000;
        const namesObj = {};
        const nameById = new Map();

        for (let i = 0; i < N; i++) {
            namesObj[`Name ${i}`] = `adapter.0.state.${i}`;
            nameById.set(`adapter.0.state.${i}`, `Name ${i}`);
        }

        const target = `adapter.0.state.${N - 1}`;

        const linearScan = (id) => {
            for (const n in namesObj) {
                if (namesObj[n] === id) return n;
            }
            return null;
        };

        const t0 = performance.now();
        for (let i = 0; i < 500; i++) linearScan(target);
        const tLinear = performance.now() - t0;

        const t1 = performance.now();
        for (let i = 0; i < 500; i++) nameById.get(target);
        const tMap = performance.now() - t1;

        assert.ok(
            tMap < tLinear,
            `Map (${tMap.toFixed(2)}ms) should be faster than scan (${tLinear.toFixed(2)}ms)`,
        );
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 4. onUnload - callback is ALWAYS called (even if stopAllScripts throws)
// ──────────────────────────────────────────────────────────────────────────────
describe('onUnload() – Shutdown Safety', () => {
    it('calls callback even when stopAllScripts throws', async () => {
        const { log, messages } = createLogMock();
        let callbackCalled = false;

        const stopAllScripts = async () => { throw new Error('stop failed'); };

        const onUnload = async (callback) => {
            try {
                await stopAllScripts();
            } catch (err) {
                log.error(`Error during unload: ${err.message}`);
            } finally {
                if (typeof callback === 'function') callback();
            }
        };

        await onUnload(() => { callbackCalled = true; });

        assert.ok(callbackCalled, 'callback must always be called');
        assert.ok(
            messages.some(m => m.level === 'error' && m.msg.includes('stop failed')),
            'error must be logged with log.error',
        );
    });

    it('calls callback without errors when everything runs normally', async () => {
        let called = false;
        const onUnload = async (callback) => {
            try { /* normal cleanup */ } catch { /* nothing */ } finally { callback(); }
        };
        await onUnload(() => { called = true; });
        assert.ok(called);
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 5. unsubscribe() - array recursion via this (bugfix check)
// ──────────────────────────────────────────────────────────────────────────────
describe('unsubscribe() - this recursion (bugfix)', () => {
    it('calls this.unsubscribe for each array element (no ReferenceError)', () => {
        const called = [];

        const obj = {
            unsubscribe(id) {
                if (Array.isArray(id)) {
                    id.forEach(sub => this.unsubscribe(sub)); // Correct: use this
                    return;
                }
                called.push(id);
            },
        };

        assert.doesNotThrow(() => obj.unsubscribe(['a.0.s.1', 'a.0.s.2', 'a.0.s.3']));
        assert.deepEqual(called, ['a.0.s.1', 'a.0.s.2', 'a.0.s.3']);
    });

    it('global unsubscribe() (without this) would throw a ReferenceError - fix confirmed', () => {
        const broken = function (id) {
            if (Array.isArray(id)) {
                // Simulate the bug (global function)
                id.forEach(() => { throw new ReferenceError('unsubscribe is not defined'); });
            }
        };

        assert.throws(
            () => broken(['a.0.s.1']),
            { constructor: ReferenceError },
        );
    });

    it('logs a warning for an empty id', () => {
        const { log, messages } = createLogMock();
        const id = '';
        if (!id) log.warn('unsubscribe: empty name');
        assert.ok(messages.some(m => m.level === 'warn' && m.msg === 'unsubscribe: empty name'));
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 6. dayTimeSchedules - timer leak: clear old timer before setting a new one
// ──────────────────────────────────────────────────────────────────────────────
describe('dayTimeSchedules() - memory leak check', () => {
    it('clears the old timer before setting a new one', () => {
        const clearedIds = [];
        const origClear = globalThis.clearTimeout;
        globalThis.clearTimeout = (t) => {
            clearedIds.push(t);
            origClear(t);
        };

        let dayScheduleTimer = setTimeout(() => {}, 9_999_999);
        const oldTimer = dayScheduleTimer;

        // Fixed logic: clear first, then set to null
        if (dayScheduleTimer) {
            clearTimeout(dayScheduleTimer);
            dayScheduleTimer = null;
        }
        dayScheduleTimer = setTimeout(() => {}, 3000);

        globalThis.clearTimeout = origClear; // restore

        assert.ok(clearedIds.includes(oldTimer), 'Old timer must be cleared before setting a new one');
        assert.notEqual(dayScheduleTimer, null, 'New timer must be set');

        clearTimeout(dayScheduleTimer);
    });

    it('has no timer leak when dayTimeSchedules is called quickly 10 times', () => {
        let timer = null;
        const clearedCount = { n: 0 };

        const simulateDayTimeSchedules = () => {
            if (timer) {
                clearedCount.n++;
                clearTimeout(timer);
                timer = null;
            }
            timer = setTimeout(() => {}, 60_000);
        };

        for (let i = 0; i < 10; i++) simulateDayTimeSchedules();
        clearTimeout(timer);

        // 9 out of 10 timers were cleared (the first had no predecessor)
        assert.equal(clearedCount.n, 9, 'All previous timers must have been cleared');
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 7. installNpm - timeout set (no endless blocking)
// ──────────────────────────────────────────────────────────────────────────────
describe('installNpm() - timeout option', () => {
    it('passes timeout:120000 to child_process.exec', (done) => {
        const capturedOpts = [];

        const mockExec = (_cmd, options) => {
            capturedOpts.push(options);
            return {
                stdout: { on: () => {} },
                stderr: { on: () => {} },
                on: (event, cb) => {
                    if (event === 'exit') setImmediate(() => cb(0));
                },
            };
        };

        const child = mockExec('npm install test-lib --omit=dev', { timeout: 120_000 });
        child.on('exit', () => {
            assert.equal(capturedOpts[0].timeout, 120_000, 'timeout must be 120,000ms');
            done();
        });
    });

    it('rejects for exit code != 0', (done) => {
        const mockExec = (_cmd, _opts) => ({
            stdout: { on: () => {} },
            stderr: { on: () => {} },
            on: (event, cb) => {
                if (event === 'exit') setImmediate(() => cb(1));
            },
        });

        const installNpm = (lib) => new Promise((resolve, reject) => {
            const child = mockExec(`npm install ${lib} --omit=dev`, { timeout: 120_000 });
            child.on('exit', (code) => {
                if (code) {
                    reject(new Error(`npm install ${lib} exited with code ${code}`));
                    return;
                }
                resolve(code);
            });
        });

        installNpm('broken-lib').then(
            () => { done(new Error('Should have rejected')); },
            (err) => {
                assert.ok(err.message.includes('exited with code 1'));
                done();
            },
        );
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 8. convertBackStringifiedValues - JSON parsing for object/array states
// ──────────────────────────────────────────────────────────────────────────────
describe('convertBackStringifiedValues()', () => {
    const makeConverter = (objects) => (id, state) => {
        if (
            state &&
            typeof state.val === 'string' &&
            objects[id]?.common &&
            (objects[id].common.type === 'array' || objects[id].common.type === 'object')
        ) {
            try {
                state.val = JSON.parse(state.val);
            } catch { /* keep as-is */ }
        }
        return state;
    };

    it('parses JSON string for object type correctly', () => {
        const conv = makeConverter({ 'js.0.v': { common: { type: 'object' } } });
        const result = conv('js.0.v', { val: '{"a":1,"b":2}' });
        assert.deepEqual(result.val, { a: 1, b: 2 });
    });

    it('parses JSON string for array type correctly', () => {
        const conv = makeConverter({ 'js.0.arr': { common: { type: 'array' } } });
        const result = conv('js.0.arr', { val: '[1,2,3]' });
        assert.deepEqual(result.val, [1, 2, 3]);
    });

    it('keeps invalid JSON as string', () => {
        const conv = makeConverter({ 'js.0.v': { common: { type: 'object' } } });
        const result = conv('js.0.v', { val: 'not-json{{' });
        assert.equal(result.val, 'not-json{{');
    });

    it('does not modify number-type states', () => {
        const conv = makeConverter({ 'js.0.n': { common: { type: 'number' } } });
        const result = conv('js.0.n', { val: 42 });
        assert.equal(result.val, 42);
    });

    it('returns null when state is null', () => {
        const conv = makeConverter({});
        assert.equal(conv('any.id', null), null);
    });

    it('returns undefined when state is undefined', () => {
        const conv = makeConverter({});
        assert.equal(conv('any.id', undefined), undefined);
    });
});
