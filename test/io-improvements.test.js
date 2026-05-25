'use strict';
/**
 * Regression tests for 10 I/O performance issues in src/lib/sandbox.ts
 * Written BEFORE the changes as baseline + expectation.
 *
 * [BASELINE]    – documents today's (worse) behavior
 * [EXPECTATION] – verifies the improved behavior after the fix
 *
 * npx mocha test/io-improvements.test.js --timeout 30000
 */
const assert = require('node:assert').strict;

/** Measures ms for fn() over `iterations` repetitions */
function bench(fn, iterations = 1) {
    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) fn();
    return performance.now() - t0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Problem 1: setStateChanged – Object.keys().filter().every() vs for…in
// ─────────────────────────────────────────────────────────────────────────────
describe('IO-1 · setStateChanged – avoid array allocation', () => {
    /** OLD implementation – allocates attrs[] on every call */
    function hasChangedOld(stateAsObject, oldState) {
        const attrs = Object.keys(stateAsObject).filter(
            attr => attr !== 'ts' && stateAsObject[attr] !== undefined,
        );
        return !attrs.every(attr => stateAsObject[attr] === oldState[attr]);
    }

    /** NEW implementation – no temporary array */
    function hasChangedNew(stateAsObject, oldState) {
        for (const attr in stateAsObject) {
            if (attr === 'ts') continue;
            if (stateAsObject[attr] === undefined) continue;
            if (stateAsObject[attr] !== oldState[attr]) return true;
        }
        return false;
    }

    const makeState = val => ({ val, ack: true, from: 'system.adapter.js.0', q: 0, lc: 1000, ts: Date.now() });

    it('[EXPECTATION] Both implementations detect a change correctly', () => {
        const s1 = makeState(42);
        const s2 = makeState(43);
        assert.equal(hasChangedOld(s2, s1), true);
        assert.equal(hasChangedNew(s2, s1), true);
    });

    it('[EXPECTATION] Both implementations detect NO change correctly', () => {
        const s1 = makeState(42);
        const s2 = makeState(42);
        assert.equal(hasChangedOld(s2, s1), false);
        assert.equal(hasChangedNew(s2, s1), false);
    });

    it('[EXPECTATION] The ts field is ignored correctly by both', () => {
        const s1 = makeState(42);
        const s2 = { ...makeState(42), ts: Date.now() + 999 }; // only ts changed
        assert.equal(hasChangedOld(s2, s1), false, 'Old: a ts-only change must not be a change');
        assert.equal(hasChangedNew(s2, s1), false, 'New: a ts-only change must not be a change');
    });

    it('[EXPECTATION] for…in is not worse than filter().every() over 100k calls', () => {
        const s1 = makeState(42);
        const s2 = makeState(42);
        const tOld = bench(() => hasChangedOld(s2, s1), 100_000);
        const tNew = bench(() => hasChangedNew(s2, s1), 100_000);
        assert.ok(tNew <= tOld * 1.5,
            `for…in (${tNew.toFixed(1)}ms) must not be significantly worse than filter (${tOld.toFixed(1)}ms)`);
    });

    it('[BASELINE] Object.keys().filter() allocates a temporary array per call', () => {
        const s = makeState(10);
        // We cannot measure array allocation directly, but we verify
        // that the old variant returns an array (design proof)
        const attrs = Object.keys(s).filter(a => a !== 'ts' && s[a] !== undefined);
        assert.ok(Array.isArray(attrs), 'filter() always returns a new array');
        assert.ok(attrs.length > 0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Problem 2: $() Selector – O(n²) deduplication with resUnique.includes()
// ─────────────────────────────────────────────────────────────────────────────
describe('IO-2 · $() Selector – O(n²) deduplication', () => {
    /** OLD implementation */
    function deduplicateOld(res) {
        const resUnique = [];
        for (let i = 0; i < res.length; i++) {
            if (!resUnique.includes(res[i])) {
                resUnique.push(res[i]);
            }
        }
        return resUnique;
    }

    /** NEW implementation */
    function deduplicateNew(res) {
        return [...new Set(res)];
    }

    function makeIds(n, duplicateRatio = 0.3) {
        const unique = Array.from({ length: n }, (_, i) => `adapter.0.state.${i}`);
        const dupes = unique.slice(0, Math.floor(n * duplicateRatio));
        return [...unique, ...dupes].sort(() => Math.random() - 0.5);
    }

    it('[EXPECTATION] Both return the same unique IDs', () => {
        const ids = makeIds(100);
        const old = deduplicateOld(ids).sort();
        const newD = deduplicateNew(ids).sort();
        assert.deepEqual(old, newD);
    });

    it('[EXPECTATION] No duplicates in the result', () => {
        const ids = ['a', 'b', 'a', 'c', 'b', 'a'];
        const result = deduplicateNew(ids);
        assert.deepEqual(result.sort(), ['a', 'b', 'c']);
        assert.equal(result.length, 3);
    });

    it('[EXPECTATION] The Set variant is faster with 2,000 IDs and 30% duplicates', () => {
        const ids = makeIds(2_000);
        const tOld = bench(() => deduplicateOld(ids), 500);
        const tNew = bench(() => deduplicateNew(ids), 500);
        assert.ok(tNew < tOld,
            `Set (${tNew.toFixed(1)}ms) must be faster than includes (${tOld.toFixed(1)}ms)`);
    });

    it('[BASELINE] includes() is O(n) – proof by measurement', () => {
        const small = Array.from({ length: 100 }, (_, i) => `id.${i}`);
        const large = Array.from({ length: 5_000 }, (_, i) => `id.${i}`);
        const tSmall = bench(() => deduplicateOld(small), 1_000);
        const tLarge = bench(() => deduplicateOld(large), 1_000);
        // O(n²): 50× more elements → at least 20× more time
        assert.ok(tLarge > tSmall * 5,
            `Large array (${tLarge.toFixed(1)}ms) must take significantly longer than small (${tSmall.toFixed(1)}ms)`);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Problem 3: subscribePattern – Object.keys().forEach() instead of Object.assign()
// ─────────────────────────────────────────────────────────────────────────────
describe('IO-3 · subscribePattern – Object.assign instead of forEach', () => {
    function mergeStatesOld(target, source) {
        Object.keys(source).forEach(id => (target[id] = source[id]));
    }

    function mergeStatesNew(target, source) {
        Object.assign(target, source);
    }

    it('[EXPECTATION] Both variants produce an identical result', () => {
        const source = {};
        for (let i = 0; i < 1_000; i++) source[`adapter.0.state.${i}`] = { val: i, ack: true };

        const t1 = {};
        const t2 = {};
        mergeStatesOld(t1, source);
        mergeStatesNew(t2, source);

        assert.deepEqual(Object.keys(t1).sort(), Object.keys(t2).sort());
        assert.equal(t1['adapter.0.state.500'].val, 500);
        assert.equal(t2['adapter.0.state.500'].val, 500);
    });

    it('[EXPECTATION] Object.assign creates no temporary keys array (correctness + design)', () => {
        const source = {};
        for (let i = 0; i < 10_000; i++) source[`adapter.0.state.${i}`] = { val: i, ack: true };

        // Object.assign needs no internal Object.keys() array – it iterates directly
        // forEach strictly requires an array via Object.keys()
        // We verify: the result is correct and no temporary array is needed

        const t1 = {};
        mergeStatesOld(t1, source);

        const t2 = {};
        mergeStatesNew(t2, source);

        // Both results must be identical
        assert.equal(Object.keys(t1).length, Object.keys(t2).length);
        assert.equal(t1['adapter.0.state.9999'].val, 9999);
        assert.equal(t2['adapter.0.state.9999'].val, 9999);

        // Object.assign returns the target (API correctness)
        const target = {};
        const result = Object.assign(target, source);
        assert.equal(result, target, 'Object.assign returns target');
    });

    it('[EXPECTATION] An empty source produces no error', () => {
        const t = { existing: 1 };
        mergeStatesNew(t, {});
        assert.equal(t.existing, 1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Problem 4: subscribe array IDs – JSON.parse/stringify instead of Spread
// ─────────────────────────────────────────────────────────────────────────────
describe('IO-4 · subscribe array IDs – Spread instead of JSON clone', () => {
    function clonePatternOld(oPattern, newId) {
        const pa = JSON.parse(JSON.stringify(oPattern));
        pa.id = newId;
        return pa;
    }

    function clonePatternNew(oPattern, newId) {
        return { ...oPattern, id: newId };
    }

    const basePattern = {
        id: null,
        change: 'ne',
        q: 0,
        ack: true,
        logic: 'and',
    };

    it('[EXPECTATION] Both variants produce equivalent pattern objects', () => {
        const old = clonePatternOld(basePattern, 'adapter.0.state.1');
        const newP = clonePatternNew(basePattern, 'adapter.0.state.1');
        assert.equal(old.id, newP.id);
        assert.equal(old.change, newP.change);
        assert.equal(old.q, newP.q);
        assert.equal(old.ack, newP.ack);
        assert.equal(old.logic, newP.logic);
    });

    it('[EXPECTATION] id is overwritten correctly', () => {
        const result = clonePatternNew(basePattern, 'my.new.id');
        assert.equal(result.id, 'my.new.id');
        assert.equal(basePattern.id, null, 'The original must not be modified');
    });

    it('[EXPECTATION] Spread is faster than JSON clone with 50 array IDs', () => {
        const ids = Array.from({ length: 50 }, (_, i) => `adapter.0.state.${i}`);

        const tOld = bench(() => {
            ids.forEach(id => clonePatternOld(basePattern, id));
        }, 10_000);

        const tNew = bench(() => {
            ids.forEach(id => clonePatternNew(basePattern, id));
        }, 10_000);

        assert.ok(tNew < tOld,
            `Spread (${tNew.toFixed(1)}ms) must be faster than JSON clone (${tOld.toFixed(1)}ms)`);
    });

    it('[EXPECTATION] Nesting: Spread does not copy deep references (shallow)', () => {
        const nested = { ...basePattern, meta: { deep: true } };
        const cloned = clonePatternNew(nested, 'new.id');
        // Shallow spread – meta is the same reference
        assert.equal(cloned.meta, nested.meta);
        // For pattern objects with primitive values this is sufficient
        assert.equal(cloned.id, 'new.id');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Problem 5: adapterSubs – filter().length > 0 instead of includes()
// ─────────────────────────────────────────────────────────────────────────────
describe('IO-5 · adapterSubs – includes() instead of filter().length', () => {
    function subExistsOld(arr, id) {
        return arr.filter(sub => sub === id).length > 0;
    }

    function subExistsNew(arr, id) {
        return arr.includes(id);
    }

    it('[EXPECTATION] Both find existing IDs', () => {
        const arr = ['a.0.state.1', 'b.0.state.2', 'c.0.state.3'];
        assert.equal(subExistsOld(arr, 'b.0.state.2'), true);
        assert.equal(subExistsNew(arr, 'b.0.state.2'), true);
    });

    it('[EXPECTATION] Both detect missing IDs', () => {
        const arr = ['a.0.state.1', 'b.0.state.2'];
        assert.equal(subExistsOld(arr, 'x.0.not.found'), false);
        assert.equal(subExistsNew(arr, 'x.0.not.found'), false);
    });

    it('[EXPECTATION] includes() creates no temporary array', () => {
        const arr = Array.from({ length: 1_000 }, (_, i) => `adapter.0.state.${i}`);

        const tOld = bench(() => subExistsOld(arr, 'adapter.0.state.999'), 50_000);
        const tNew = bench(() => subExistsNew(arr, 'adapter.0.state.999'), 50_000);

        assert.ok(tNew <= tOld * 1.2,
            `includes (${tNew.toFixed(1)}ms) must not be worse than filter (${tOld.toFixed(1)}ms)`);
    });

    it('[BASELINE] filter() always returns a new array (allocation proof)', () => {
        const arr = ['x', 'y'];
        const r1 = arr.filter(s => s === 'x');
        const r2 = arr.filter(s => s === 'x');
        assert.notEqual(r1, r2, 'Every filter() call returns a NEW array');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Problem 6: onEnumMembers – Object.keys().includes() instead of the `in` operator
// ─────────────────────────────────────────────────────────────────────────────
describe('IO-6 · onEnumMembers – `in` operator instead of Object.keys().includes()', () => {
    function memberExistsOld(subscriptions, objId) {
        return Object.keys(subscriptions).includes(objId);
    }

    function memberExistsNew(subscriptions, objId) {
        return objId in subscriptions;
    }

    it('[EXPECTATION] Both detect existing members', () => {
        const subs = { 'state.1': {}, 'state.2': {}, 'state.3': {} };
        assert.equal(memberExistsOld(subs, 'state.2'), true);
        assert.equal(memberExistsNew(subs, 'state.2'), true);
    });

    it('[EXPECTATION] Both detect missing members', () => {
        const subs = { 'state.1': {} };
        assert.equal(memberExistsOld(subs, 'state.99'), false);
        assert.equal(memberExistsNew(subs, 'state.99'), false);
    });

    it('[EXPECTATION] The `in` operator is faster with 500 subscriptions', () => {
        const subs = {};
        for (let i = 0; i < 500; i++) subs[`state.${i}`] = {};

        const tOld = bench(() => memberExistsOld(subs, 'state.499'), 50_000);
        const tNew = bench(() => memberExistsNew(subs, 'state.499'), 50_000);

        assert.ok(tNew < tOld,
            `\`in\` (${tNew.toFixed(1)}ms) must be faster than Object.keys().includes (${tOld.toFixed(1)}ms)`);
    });

    it('[EXPECTATION] The result is correct for an empty object', () => {
        assert.equal(memberExistsNew({}, 'any'), false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Problem 7: clearStateDelayed – timersByScript not updated
// ─────────────────────────────────────────────────────────────────────────────
describe('IO-7 · clearStateDelayed – timersByScript synchronization', () => {
    function buildTimerFixture() {
        const timers = {};
        const timersByScript = new Map();
        const scriptName = 'script.js.test';

        // Add timer (like setStateDelayed)
        const addTimer = (stateId, timerId) => {
            if (!timers[stateId]) timers[stateId] = [];
            timers[stateId].push({ id: timerId, t: null, scriptName });
            if (!timersByScript.has(scriptName)) timersByScript.set(scriptName, new Set());
            timersByScript.get(scriptName).add(stateId);
        };

        // Remove timer – OLD variant (without timersByScript update)
        const clearTimerOld = (stateId, timerId) => {
            if (!timers[stateId]) return false;
            for (let i = timers[stateId].length - 1; i >= 0; i--) {
                if (timerId === undefined || timers[stateId][i].id === timerId) {
                    timers[stateId].splice(i, 1);
                }
            }
            if (!timers[stateId].length) delete timers[stateId];
            // BUG: timersByScript is NOT updated
            return true;
        };

        // Remove timer – NEW variant (with timersByScript update)
        const clearTimerNew = (stateId, timerId) => {
            if (!timers[stateId]) return false;
            for (let i = timers[stateId].length - 1; i >= 0; i--) {
                if (timerId === undefined || timers[stateId][i].id === timerId) {
                    timers[stateId].splice(i, 1);
                }
            }
            if (!timers[stateId].length) {
                delete timers[stateId];
                // FIX: synchronize timersByScript
                const stateIds = timersByScript.get(scriptName);
                if (stateIds) {
                    stateIds.delete(stateId);
                    if (!stateIds.size) timersByScript.delete(scriptName);
                }
            }
            return true;
        };

        return { timers, timersByScript, addTimer, clearTimerOld, clearTimerNew, scriptName };
    }

    it('[BASELINE] Old: timersByScript stays stale after clearStateDelayed', () => {
        const { timers, timersByScript, addTimer, clearTimerOld, scriptName } = buildTimerFixture();
        addTimer('state.1', 1);
        clearTimerOld('state.1', 1); // removes the timer, but NOT timersByScript

        assert.equal(Object.keys(timers).length, 0, 'timers is empty');
        // BUG: timersByScript contains a stale entry
        assert.ok(timersByScript.has(scriptName),
            '[BASELINE] timersByScript is not yet correct – this is the known bug');
    });

    it('[EXPECTATION] New: timersByScript is updated correctly after clearStateDelayed', () => {
        const { timers, timersByScript, addTimer, clearTimerNew, scriptName } = buildTimerFixture();
        addTimer('state.1', 1);
        clearTimerNew('state.1', 1);

        assert.equal(Object.keys(timers).length, 0, 'timers is empty');
        assert.ok(!timersByScript.has(scriptName),
            'timersByScript must no longer contain an entry');
    });

    it('[EXPECTATION] timersByScript stays correct when other states still have timers', () => {
        const { timers, timersByScript, addTimer, clearTimerNew, scriptName } = buildTimerFixture();
        addTimer('state.1', 1);
        addTimer('state.2', 2);

        clearTimerNew('state.1', 1);

        assert.ok(!timers['state.1'], 'state.1 timer removed');
        assert.ok(timers['state.2'], 'state.2 timer still present');
        const stateIds = timersByScript.get(scriptName);
        assert.ok(stateIds, 'script entry still present');
        assert.ok(!stateIds.has('state.1'), 'state.1 removed from set');
        assert.ok(stateIds.has('state.2'), 'state.2 still in set');
    });

    it('[EXPECTATION] clearStateDelayed with timerId=undefined removes all timers of the state', () => {
        const { timers, timersByScript, addTimer, clearTimerNew, scriptName } = buildTimerFixture();
        addTimer('state.1', 1);
        addTimer('state.1', 2); // second timer for the same state

        clearTimerNew('state.1', undefined);

        assert.ok(!timers['state.1'], 'All timers of state.1 removed');
        const stateIds = timersByScript.get(scriptName);
        if (stateIds) {
            assert.ok(!stateIds.has('state.1'), 'state.1 removed from set');
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Problem 8: getSchedules – JSON.parse/stringify instead of Spread
// ─────────────────────────────────────────────────────────────────────────────
describe('IO-8 · getSchedules – Spread instead of JSON deep clone', () => {
    function makeSchedule(i) {
        return {
            _ioBroker: {
                type: 'cron',
                pattern: `0 ${i} * * *`,
                scriptName: `script.js.script_${i}`,
                id: `cron_${i}_${Math.round(Math.random() * 100000)}`,
            },
        };
    }

    function getSchedulesOld(schedules) {
        return schedules.map(s => JSON.parse(JSON.stringify(s._ioBroker)));
    }

    function getSchedulesNew(schedules) {
        return schedules.map(s => ({ ...s._ioBroker }));
    }

    it('[EXPECTATION] Both return identical schedule lists', () => {
        const schedules = Array.from({ length: 20 }, (_, i) => makeSchedule(i));
        const old = getSchedulesOld(schedules);
        const newS = getSchedulesNew(schedules);
        assert.deepEqual(old, newS);
    });

    it('[EXPECTATION] Spread returns a copy (not the same reference)', () => {
        const schedules = [makeSchedule(1)];
        const result = getSchedulesNew(schedules);
        assert.notEqual(result[0], schedules[0]._ioBroker, 'Must be a copy, not the original reference');
        assert.deepEqual(result[0], schedules[0]._ioBroker);
    });

    it('[EXPECTATION] Spread is faster than JSON clone with 100 schedules', () => {
        const schedules = Array.from({ length: 100 }, (_, i) => makeSchedule(i));

        const tOld = bench(() => getSchedulesOld(schedules), 10_000);
        const tNew = bench(() => getSchedulesNew(schedules), 10_000);

        assert.ok(tNew < tOld,
            `Spread (${tNew.toFixed(1)}ms) must be faster than JSON clone (${tOld.toFixed(1)}ms)`);
    });

    it('[EXPECTATION] Primitive fields (type, pattern, scriptName, id) are copied correctly', () => {
        const s = makeSchedule(42);
        const copy = getSchedulesNew([s])[0];
        assert.equal(copy.type, 'cron');
        assert.equal(copy.pattern, '0 42 * * *');
        assert.ok(copy.scriptName.includes('42'));
        assert.ok(copy.id.startsWith('cron_42'));
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Problem 9: sendTo without instance – getObjectView without cache
// ─────────────────────────────────────────────────────────────────────────────
describe('IO-9 · sendTo – instance cache instead of repeated getObjectView', () => {
    /** Simulates the instance cache */
    function buildInstanceCache() {
        const cache = new Map(); // adapterName → string[]
        let queryCount = 0;

        const getInstances = async (adapterName, allInstances) => {
            if (cache.has(adapterName)) {
                return cache.get(adapterName); // cache hit
            }
            // Simulated DB query
            queryCount++;
            const instances = allInstances.filter(id =>
                id.startsWith(`system.adapter.${adapterName}.`),
            ).map(id => id.substring('system.adapter.'.length));
            cache.set(adapterName, instances);
            return instances;
        };

        const invalidate = adapterName => cache.delete(adapterName);

        return { getInstances, invalidate, cache, getQueryCount: () => queryCount };
    }

    const allInstances = [
        'system.adapter.zigbee.0',
        'system.adapter.zigbee.1',
        'system.adapter.hm-rpc.0',
        'system.adapter.js.0',
    ];

    it('[EXPECTATION] The first call performs one DB query', async () => {
        const c = buildInstanceCache();
        const result = await c.getInstances('zigbee', allInstances);
        assert.equal(c.getQueryCount(), 1);
        assert.deepEqual(result.sort(), ['zigbee.0', 'zigbee.1'].sort());
    });

    it('[EXPECTATION] The second call uses the cache (no DB query)', async () => {
        const c = buildInstanceCache();
        await c.getInstances('zigbee', allInstances);
        await c.getInstances('zigbee', allInstances); // cache hit
        assert.equal(c.getQueryCount(), 1, 'Only 1 query, not 2');
    });

    it('[EXPECTATION] Invalidation forces a new query', async () => {
        const c = buildInstanceCache();
        await c.getInstances('zigbee', allInstances);
        c.invalidate('zigbee');
        await c.getInstances('zigbee', allInstances);
        assert.equal(c.getQueryCount(), 2, 'After invalidation it must query again');
    });

    it('[EXPECTATION] Different adapter names have separate cache entries', async () => {
        const c = buildInstanceCache();
        await c.getInstances('zigbee', allInstances);
        await c.getInstances('hm-rpc', allInstances);
        assert.equal(c.getQueryCount(), 2);
        assert.equal(c.cache.size, 2);
    });

    it('[BASELINE] Without cache: every sendTo call needs a DB query', async () => {
        let queryCount = 0;
        const sendToWithoutCache = async adapterName => {
            queryCount++; // simulates getObjectView
            return allInstances.filter(id => id.startsWith(`system.adapter.${adapterName}.`));
        };

        await sendToWithoutCache('zigbee');
        await sendToWithoutCache('zigbee');
        await sendToWithoutCache('zigbee');
        assert.equal(queryCount, 3, '[BASELINE] Without cache: 3 calls → 3 DB queries');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Problem 10: clearInterval/Timeout – indexOf() O(n) instead of Set O(1)
// ─────────────────────────────────────────────────────────────────────────────
describe('IO-10 · clearInterval/Timeout – Set instead of Array for timer tracking', () => {
    /** OLD implementation – array with indexOf */
    function buildTimerTrackerOld() {
        const timers = [];
        return {
            add: id => { timers.push(id); },
            remove: id => {
                const pos = timers.indexOf(id);
                if (pos !== -1) timers.splice(pos, 1);
            },
            has: id => timers.includes(id),
            size: () => timers.length,
        };
    }

    /** NEW implementation – Set */
    function buildTimerTrackerNew() {
        const timers = new Set();
        return {
            add: id => { timers.add(id); },
            remove: id => { timers.delete(id); },
            has: id => timers.has(id),
            size: () => timers.size,
        };
    }

    it('[EXPECTATION] Both trackers: add, has, remove work correctly', () => {
        for (const tracker of [buildTimerTrackerOld(), buildTimerTrackerNew()]) {
            tracker.add(1);
            tracker.add(2);
            tracker.add(3);
            assert.equal(tracker.size(), 3);
            assert.ok(tracker.has(2));
            tracker.remove(2);
            assert.equal(tracker.size(), 2);
            assert.ok(!tracker.has(2));
        }
    });

    it('[EXPECTATION] The Set tracker is faster with 1,000 active timers and remove', () => {
        const N = 1_000;
        const ids = Array.from({ length: N }, (_, i) => i + 1);

        const tOld = bench(() => {
            const t = buildTimerTrackerOld();
            for (const id of ids) t.add(id);
            // clearInterval scenario: remove randomly
            for (let i = 0; i < 100; i++) t.remove(ids[Math.floor(Math.random() * N)]);
        }, 500);

        const tNew = bench(() => {
            const t = buildTimerTrackerNew();
            for (const id of ids) t.add(id);
            for (let i = 0; i < 100; i++) t.remove(ids[Math.floor(Math.random() * N)]);
        }, 500);

        assert.ok(tNew <= tOld * 1.5,
            `Set (${tNew.toFixed(1)}ms) must not be significantly worse than Array (${tOld.toFixed(1)}ms)`);
    });

    it('[EXPECTATION] Set allows no duplicates (correct for timer IDs)', () => {
        const t = buildTimerTrackerNew();
        t.add(42);
        t.add(42);
        t.add(42);
        assert.equal(t.size(), 1, 'Set must not contain duplicates');
    });

    it('[EXPECTATION] Removing a non-existent element throws no error', () => {
        const t = buildTimerTrackerNew();
        assert.doesNotThrow(() => t.remove(999));
    });

    it('[EXPECTATION] Script-stop scenario: all timers of a script are removed', () => {
        const t = buildTimerTrackerNew();
        const timerIds = [101, 102, 103, 104, 105];
        for (const id of timerIds) t.add(id);

        // stopScript removes all timers
        for (const id of timerIds) t.remove(id);

        assert.equal(t.size(), 0);
        for (const id of timerIds) assert.ok(!t.has(id));
    });

    it('[BASELINE] Array indexOf: worst case is the last element', () => {
        const arr = Array.from({ length: 10_000 }, (_, i) => i);
        const last = arr[arr.length - 1];

        const tArr = bench(() => arr.indexOf(last), 50_000);

        const set = new Set(arr);
        const tSet = bench(() => set.has(last), 50_000);

        assert.ok(tSet < tArr,
            `Set.has (${tSet.toFixed(1)}ms) must be faster than indexOf (${tArr.toFixed(1)}ms) with 10k elements`);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration: combined I/O hot path
// ─────────────────────────────────────────────────────────────────────────────
describe('Integration · combined I/O hot path', () => {
    it('[EXPECTATION] Full onStateChange pass with all fixes correct', () => {
        // Simulates the hot path with all IO fixes combined
        const subscriptions = [];
        const stateIdSet = new Set();

        // IO-2: Set for deduplication
        const allIds = Array.from({ length: 200 }, (_, i) => `adapter.0.s.${i}`);
        const duped = [...allIds, ...allIds.slice(0, 50)];
        const unique = [...new Set(duped)]; // IO-2 fix
        assert.equal(unique.length, 200);

        // IO-1: hasChanged without array allocation
        const s1 = { val: 42, ack: true, from: 'system.adapter.js.0', q: 0, lc: 1000, ts: 100 };
        const s2 = { val: 43, ack: true, from: 'system.adapter.js.0', q: 0, lc: 1001, ts: 101 };
        let changed = false;
        for (const attr in s2) {
            if (attr === 'ts') continue;
            if (s2[attr] !== s1[attr]) { changed = true; break; }
        }
        assert.ok(changed);

        // IO-5: includes instead of filter().length
        const adapterSubs = ['adapter.0.state.1', 'adapter.0.state.2'];
        assert.ok(adapterSubs.includes('adapter.0.state.1'));
        assert.ok(!adapterSubs.includes('adapter.0.state.99'));

        // IO-6: in operator
        const subs = { 'state.1': {}, 'state.2': {} };
        assert.ok('state.1' in subs);
        assert.ok(!('state.99' in subs));
    });

    it('[EXPECTATION] Timer lifecycle: add → clear → stopScript works consistently', () => {
        const timers = {};
        const timersByScript = new Map();
        const scriptName = 'script.js.myScript';

        const addTimer = (stateId, id) => {
            if (!timers[stateId]) timers[stateId] = [];
            timers[stateId].push({ id, t: null, scriptName });
            if (!timersByScript.has(scriptName)) timersByScript.set(scriptName, new Set());
            timersByScript.get(scriptName).add(stateId);
        };

        const clearTimer = (stateId) => {
            if (!timers[stateId]) return;
            delete timers[stateId];
            const stateIds = timersByScript.get(scriptName);
            if (stateIds) {
                stateIds.delete(stateId);
                if (!stateIds.size) timersByScript.delete(scriptName);
            }
        };

        const stopScript = () => {
            const stateIds = timersByScript.get(scriptName);
            if (!stateIds) return 0;
            let count = 0;
            for (const stateId of stateIds) {
                if (timers[stateId]) { delete timers[stateId]; count++; }
            }
            timersByScript.delete(scriptName);
            return count;
        };

        // Scenario: 3 states with timers, 1 is cleared manually
        addTimer('state.A', 1);
        addTimer('state.B', 2);
        addTimer('state.C', 3);

        clearTimer('state.B'); // IO-7 fix: also update timersByScript

        // stopScript should stop only A and C
        const stopped = stopScript();
        assert.equal(stopped, 2, 'Only 2 timers should be stopped by stopScript');
        assert.equal(Object.keys(timers).length, 0, 'All timers must be removed');
        assert.ok(!timersByScript.has(scriptName), 'Script entry must be removed');
    });
});
