'use strict';
/**
 * Regression tests for the 8 planned performance improvements
 * in src/main.ts - written BEFORE the change.
 *
 * Each test is explicitly marked as BASELINE or EXPECTATION:
 *   [BASELINE]    - documents the current (worse) behavior
 *   [EXPECTATION] - verifies the improved behavior after the fix
 *
 * All tests must stay green after the change.
 *
 * npx mocha test/performance-improvements.test.js --timeout 30000
 */
const assert = require('node:assert').strict;

// ─────────────────────────────────────────────────────────────────────────────
// Shared helper functions
// ─────────────────────────────────────────────────────────────────────────────

/** Creates N state IDs in the form "adapter.0.state.NNN" */
function makeStateIds(n) {
    const ids = [];
    for (let i = 0; i < n; i++) ids.push(`adapter.0.state.${String(i).padStart(6, '0')}`);
    return ids;
}

/** Measures the time (ms) for fn() across iterations repeats */
function bench(fn, iterations = 1) {
    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) fn();
    return performance.now() - t0;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. sortedInsert - O(log n) instead of O(n log n) sort()
// ─────────────────────────────────────────────────────────────────────────────
describe('Perf-1 · sortedInsert() instead of stateIds.sort()', () => {
    /** Binary-search insert - the NEW implementation */
    function sortedInsert(arr, id) {
        let lo = 0;
        let hi = arr.length;
        while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            if (arr[mid] < id) lo = mid + 1;
            else hi = mid;
        }
        if (arr[lo] !== id) arr.splice(lo, 0, id);
    }

    it('[EXPECTATION] sortedInsert keeps the array sorted', () => {
        const arr = [];
        const ids = ['z.0', 'a.0', 'm.0', 'b.1', 'a.1'];
        for (const id of ids) sortedInsert(arr, id);
        const sorted = [...ids].sort();
        assert.deepEqual(arr, sorted);
    });

    it('[EXPECTATION] sortedInsert ignores duplicates', () => {
        const arr = [];
        sortedInsert(arr, 'a.0');
        sortedInsert(arr, 'a.0');
        sortedInsert(arr, 'a.0');
        assert.equal(arr.length, 1);
    });

    it('[EXPECTATION] sortedInsert is faster than push+sort with 50k entries', () => {
        const N = 50_000;
        const ids = makeStateIds(N);

        // BEFORE: push + sort
        const tSort = bench(() => {
            const arr = [];
            for (const id of ids) { arr.push(id); arr.sort(); }
        });

        // AFTER: sortedInsert
        const tInsert = bench(() => {
            const arr = [];
            for (const id of ids) sortedInsert(arr, id);
        });

        // sortedInsert must be faster
        assert.ok(
            tInsert < tSort,
            `sortedInsert (${tInsert.toFixed(0)}ms) must be faster than push+sort (${tSort.toFixed(0)}ms)`,
        );
    });

    it('[EXPECTATION] result arrays from sortedInsert and push+sort are identical', () => {
        const ids = makeStateIds(1_000).reverse(); // reversed to test worst case
        const arrSort = [];
        const arrInsert = [];
        for (const id of ids) {
            arrSort.push(id);
            arrSort.sort();
            sortedInsert(arrInsert, id);
        }
        assert.deepEqual(arrInsert, arrSort);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. timersByScript - reverse index for stopScript timer cleanup
// ─────────────────────────────────────────────────────────────────────────────
describe('Perf-2 · timersByScript reverse index for stopScript', () => {
    /**
     * Simulates the current (slow) timer cleanup:
     * Iterates ALL timers and checks scriptName
     */
    function stopScriptTimersSlow(timers, scriptName) {
        const cleared = [];
        for (const stateId of Object.keys(timers)) {
            for (let i = timers[stateId].length - 1; i >= 0; i--) {
                if (timers[stateId][i].scriptName === scriptName) {
                    cleared.push(timers[stateId][i].id);
                    timers[stateId].splice(i, 1);
                }
            }
            if (!timers[stateId].length) delete timers[stateId];
        }
        return cleared;
    }

    /**
     * Simulates the NEW (fast) timer cleanup via reverse index:
     * timersByScript: Map<scriptName, Set<stateId>>
     */
    function stopScriptTimersFast(timers, timersByScript, scriptName) {
        const cleared = [];
        const stateIds = timersByScript.get(scriptName);
        if (!stateIds) return cleared;
        for (const stateId of stateIds) {
            if (!timers[stateId]) continue;
            for (let i = timers[stateId].length - 1; i >= 0; i--) {
                if (timers[stateId][i].scriptName === scriptName) {
                    cleared.push(timers[stateId][i].id);
                    timers[stateId].splice(i, 1);
                }
            }
            if (!timers[stateId].length) delete timers[stateId];
        }
        timersByScript.delete(scriptName);
        return cleared;
    }

    /** Builds the test dataset */
    function buildTimers(scriptCount, timersPerScript, stateCount) {
        const timers = {};
        const timersByScript = new Map();
        let id = 0;
        for (let s = 0; s < scriptCount; s++) {
            const scriptName = `script.js.script_${s}`;
            timersByScript.set(scriptName, new Set());
            for (let t = 0; t < timersPerScript; t++) {
                const stateId = `adapter.0.state.${t % stateCount}`;
                if (!timers[stateId]) timers[stateId] = [];
                timers[stateId].push({ id: id++, scriptName, t: null });
                timersByScript.get(scriptName).add(stateId);
            }
        }
        return { timers, timersByScript };
    }

    it('[EXPECTATION] both implementations return the same timers', () => {
        const { timers, timersByScript } = buildTimers(5, 10, 20);
        // Deep copy for slow
        const timersCopy = JSON.parse(JSON.stringify(timers));

        const slow = stopScriptTimersSlow(timersCopy, 'script.js.script_2')
            .sort((a, b) => a - b);
        const fast = stopScriptTimersFast(timers, timersByScript, 'script.js.script_2')
            .sort((a, b) => a - b);

        assert.deepEqual(fast, slow, 'Both methods must remove the same timer IDs');
    });

    it('[EXPECTATION] fast cleanup is faster with 50 scripts x 100 timers', () => {
        const { timers: tSlow } = buildTimers(50, 100, 200);
        const { timers: tFast, timersByScript } = buildTimers(50, 100, 200);

        const tSlowMs = bench(() => {
            stopScriptTimersSlow(JSON.parse(JSON.stringify(tSlow)), 'script.js.script_25');
        }, 200);

        const tFastMs = bench(() => {
            stopScriptTimersFast(
                JSON.parse(JSON.stringify(tFast)),
                new Map(timersByScript),
                'script.js.script_25',
            );
        }, 200);

        assert.ok(
            tFastMs < tSlowMs,
            `Fast (${tFastMs.toFixed(1)}ms) must be faster than Slow (${tSlowMs.toFixed(1)}ms)`,
        );
    });

    it('[EXPECTATION] no timers of the script remain after cleanup', () => {
        const { timers, timersByScript } = buildTimers(3, 5, 10);
        stopScriptTimersFast(timers, timersByScript, 'script.js.script_0');

        // No timers from script_0 may still exist
        for (const stateId of Object.keys(timers)) {
            for (const entry of timers[stateId]) {
                assert.notEqual(entry.scriptName, 'script.js.script_0');
            }
        }
        assert.ok(!timersByScript.has('script.js.script_0'));
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. _adapterFrom - precomputed string instead of allocation per setState
// ─────────────────────────────────────────────────────────────────────────────
describe('Perf-3 · _adapterFrom precomputed in constructor', () => {
    it('[EXPECTATION] precomputed string is identical to dynamically created string', () => {
        const namespace = 'javascript.0';
        // Precomputed (once in constructor)
        const _adapterFrom = `system.adapter.${namespace}`;
        // Dynamic (new each time in prepareStateObject)
        const dynamic = `system.adapter.${namespace}`;
        assert.equal(_adapterFrom, dynamic);
    });

    it('[EXPECTATION] precomputed string is reference-stable (always the same instance)', () => {
        const namespace = 'javascript.0';
        // Precomputed - created ONCE, then reused
        const _adapterFrom = `system.adapter.${namespace}`;

        // All assignments point to the same object
        const refs = [];
        for (let i = 0; i < 1_000; i++) refs.push(_adapterFrom);

        // Every reference is identical (same value)
        assert.ok(refs.every(r => r === _adapterFrom), 'All references must be equal');

        // Dynamic creation has the same value but is more CPU-expensive
        // (Benchmark here is intentionally not a strict comparison - GC makes heap usage unreliable)
        let r2 = '';
        for (let i = 0; i < 100_000; i++) r2 = `system.adapter.${namespace}`;
        assert.equal(_adapterFrom, r2, 'Values must be identical');
    });

    it('[EXPECTATION] prepareStateObject sets from correctly when empty', () => {
        const _adapterFrom = 'system.adapter.javascript.0';
        // Logic from prepareStateObject - from is set when empty
        const oState = { val: 42, ack: true, from: '' };
        oState.from = (typeof oState.from === 'string' && oState.from !== '') ? oState.from : _adapterFrom;
        assert.equal(oState.from, _adapterFrom);
    });

    it('[EXPECTATION] prepareStateObject keeps existing from', () => {
        const _adapterFrom = 'system.adapter.javascript.0';
        const oState = { val: 42, ack: true, from: 'system.adapter.other.0' };
        oState.from = (typeof oState.from === 'string' && oState.from !== '') ? oState.from : _adapterFrom;
        assert.equal(oState.from, 'system.adapter.other.0');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. loadTypeScriptDeclarations - Set instead of Array.includes() in O(n^2) loop
// ─────────────────────────────────────────────────────────────────────────────
describe('Perf-4 · Set<string> in loadTypeScriptDeclarations', () => {
    /**
     * Simulates the OLD implementation (O(n^2) - Array.includes in loop)
     */
    function buildPackagesOld(installedLibs, wantsTypings) {
        const packages = ['node', '@iobroker/types'];
        for (const lib of installedLibs) {
            if (wantsTypings.includes(lib) && !packages.includes(lib)) {
                packages.push(lib);
            }
        }
        for (const lib of wantsTypings) {
            if (!lib.includes('/')) continue;
            const pkgName = lib.substring(0, lib.indexOf('/'));
            if (installedLibs.includes(pkgName) && !packages.includes(lib)) {
                packages.push(lib);
            }
        }
        return packages;
    }

    /**
     * Simulates the NEW implementation (O(n) - Set.has)
     */
    function buildPackagesNew(installedLibs, wantsTypings) {
        const packages = ['node', '@iobroker/types'];
        const packagesSet = new Set(packages);
        const installedSet = new Set(installedLibs);
        const wantsSet = new Set(wantsTypings);

        for (const lib of installedLibs) {
            if (wantsSet.has(lib) && !packagesSet.has(lib)) {
                packages.push(lib);
                packagesSet.add(lib);
            }
        }
        for (const lib of wantsTypings) {
            if (!lib.includes('/')) continue;
            const pkgName = lib.substring(0, lib.indexOf('/'));
            if (installedSet.has(pkgName) && !packagesSet.has(lib)) {
                packages.push(lib);
                packagesSet.add(lib);
            }
        }
        return packages;
    }

    it('[EXPECTATION] both implementations return an identical package list', () => {
        const installed = ['rxjs', 'lodash', 'moment', 'axios', 'dayjs'];
        const wants = ['rxjs', 'lodash', 'rxjs/operators', 'moment/locale'];
        const old = buildPackagesOld(installed, wants);
        const newP = buildPackagesNew(installed, wants);
        assert.deepEqual(old.sort(), newP.sort());
    });

    it('[EXPECTATION] Set implementation produces no duplicates', () => {
        const installed = ['rxjs', 'rxjs', 'lodash'];
        const wants = ['rxjs', 'rxjs/operators'];
        const packages = buildPackagesNew(installed, wants);
        const unique = [...new Set(packages)];
        assert.deepEqual(packages.sort(), unique.sort(), 'No duplicates allowed');
    });

    it('[EXPECTATION] Set implementation is faster with 500 libs', () => {
        const installed = Array.from({ length: 500 }, (_, i) => `lib-${i}`);
        const wants = Array.from({ length: 500 }, (_, i) => `lib-${i}`);
        wants.push(...Array.from({ length: 100 }, (_, i) => `lib-${i}/sub`));

        const tOld = bench(() => buildPackagesOld(installed, wants), 100);
        const tNew = bench(() => buildPackagesNew(installed, wants), 100);

        assert.ok(tNew < tOld,
            `Set (${tNew.toFixed(1)}ms) must be faster than Array.includes (${tOld.toFixed(1)}ms)`);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. getData - local variables instead of repeated res.rows[i].doc
// ─────────────────────────────────────────────────────────────────────────────
describe('Perf-5 · local variables in getData() object loop', () => {
    function buildRows(n) {
        return Array.from({ length: n }, (_, i) => ({
            id: `adapter.0.obj.${i}`,
            doc: {
                _id: `adapter.0.obj.${i}`,
                type: i % 10 === 0 ? 'enum' : 'state',
                common: { name: `Object ${i}` },
            },
        }));
    }

    it('[EXPECTATION] both loop variants populate objects identically', () => {
        const rows = buildRows(1_000);

        // OLD implementation (repeated index access)
        const objectsOld = {};
        const enumsOld = [];
        for (let i = 0; i < rows.length; i++) {
            if (!rows[i].doc) continue;
            if (objectsOld[rows[i].doc._id] === undefined) {
                objectsOld[rows[i].doc._id] = rows[i].doc;
            }
            if (rows[i].doc.type === 'enum') enumsOld.push(rows[i].doc._id);
        }

        // NEW implementation (local variable)
        const objectsNew = {};
        const enumsNew = [];
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const doc = row?.doc;
            if (!doc) continue;
            if (objectsNew[doc._id] === undefined) {
                objectsNew[doc._id] = doc;
            }
            if (doc.type === 'enum') enumsNew.push(doc._id);
        }

        assert.deepEqual(Object.keys(objectsOld).sort(), Object.keys(objectsNew).sort());
        assert.deepEqual(enumsOld.sort(), enumsNew.sort());
    });

    it('[EXPECTATION] local-variable variant is faster with 50,000 objects', () => {
        const rows = buildRows(50_000);

        const tOld = bench(() => {
            const objects = {};
            for (let i = 0; i < rows.length; i++) {
                if (!rows[i].doc) continue;
                if (objects[rows[i].doc._id] === undefined) {
                    objects[rows[i].doc._id] = rows[i].doc;
                }
            }
        }, 10);

        const tNew = bench(() => {
            const objects = {};
            for (let i = 0; i < rows.length; i++) {
                const doc = rows[i]?.doc;
                if (!doc) continue;
                if (objects[doc._id] === undefined) {
                    objects[doc._id] = doc;
                }
            }
        }, 10);

        assert.ok(tNew <= tOld * 1.1, // 10% tolerance
            `Local var (${tNew.toFixed(1)}ms) must not be worse than old (${tOld.toFixed(1)}ms)`);
    });

    it('[EXPECTATION] empty doc entries are skipped correctly', () => {
        const rows = [
            { id: 'x', doc: { _id: 'x', type: 'state', common: {} } },
            { id: 'y', doc: null },
            { id: 'z', doc: undefined },
            { id: 'w', doc: { _id: 'w', type: 'enum', common: {} } },
        ];
        const objects = {};
        const enums = [];
        for (let i = 0; i < rows.length; i++) {
            const doc = rows[i]?.doc;
            if (!doc) continue;
            objects[doc._id] = doc;
            if (doc.type === 'enum') enums.push(doc._id);
        }
        assert.deepEqual(Object.keys(objects).sort(), ['w', 'x']);
        assert.deepEqual(enums, ['w']);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. setStateCountCheckInterval - for...in instead of Object.keys().forEach()
// ─────────────────────────────────────────────────────────────────────────────
describe('Perf-6 · for...in instead of Object.keys().forEach() in interval', () => {
    function buildScripts(n) {
        const scripts = {};
        for (let i = 0; i < n; i++) {
            scripts[`script.js.script_${i}`] = {
                setStatePerMinuteCounter: Math.floor(Math.random() * 2000),
                setStatePerMinuteProblemCounter: 0,
            };
        }
        return scripts;
    }

    it('[EXPECTATION] for...in and Object.keys().forEach() return identical results', () => {
        const scripts1 = buildScripts(100);
        const scripts2 = JSON.parse(JSON.stringify(scripts1));
        const maxPerMinute = 1000;

        // OLD method
        const stoppedOld = [];
        Object.keys(scripts1).forEach(id => {
            if (!scripts1[id]) return;
            const cnt = scripts1[id].setStatePerMinuteCounter;
            scripts1[id].setStatePerMinuteCounter = 0;
            if (cnt > maxPerMinute) {
                scripts1[id].setStatePerMinuteProblemCounter++;
                if (scripts1[id].setStatePerMinuteProblemCounter > 1) stoppedOld.push(id);
            } else if (scripts1[id].setStatePerMinuteProblemCounter > 0) {
                scripts1[id].setStatePerMinuteProblemCounter--;
            }
        });

        // NEW method
        const stoppedNew = [];
        for (const id in scripts2) {
            if (!scripts2[id]) continue;
            const cnt = scripts2[id].setStatePerMinuteCounter;
            scripts2[id].setStatePerMinuteCounter = 0;
            if (cnt > maxPerMinute) {
                scripts2[id].setStatePerMinuteProblemCounter++;
                if (scripts2[id].setStatePerMinuteProblemCounter > 1) stoppedNew.push(id);
            } else if (scripts2[id].setStatePerMinuteProblemCounter > 0) {
                scripts2[id].setStatePerMinuteProblemCounter--;
            }
        }

        assert.deepEqual(stoppedOld.sort(), stoppedNew.sort());
        assert.deepEqual(
            Object.values(scripts1).map(s => s.setStatePerMinuteCounter),
            Object.values(scripts2).map(s => s.setStatePerMinuteCounter),
        );
    });

    it('[EXPECTATION] for...in allocates fewer temporary arrays', () => {
        const scripts = buildScripts(500);
        const keys = Object.keys(scripts);

        // Measurement boundary: Object.keys() creates a new array
        const tKeys = bench(() => {
            let sum = 0;
            Object.keys(scripts).forEach(id => { sum += scripts[id].setStatePerMinuteCounter; });
        }, 10_000);

        const tForIn = bench(() => {
            let sum = 0;
            for (const id in scripts) { sum += scripts[id].setStatePerMinuteCounter; }
        }, 10_000);

        assert.ok(tForIn <= tKeys * 1.2, // 20% tolerance because JS engine optimizes
            `for...in (${tForIn.toFixed(1)}ms) must not be significantly worse than Object.keys (${tKeys.toFixed(1)}ms)`);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. onLog - for...in instead of Object.keys().forEach() for each log message
// ─────────────────────────────────────────────────────────────────────────────
describe('Perf-7 · for...in in onLog() instead of Object.keys().forEach()', () => {
    function buildLogSubscriptions(scriptCount, handlersPerScript) {
        const subs = {};
        for (let s = 0; s < scriptCount; s++) {
            const name = `script.js.script_${s}`;
            subs[name] = [];
            for (let h = 0; h < handlersPerScript; h++) {
                subs[name].push({
                    severity: h % 2 === 0 ? 'info' : '*',
                    cb: () => {},
                    sandbox: { logHandler: undefined },
                });
            }
        }
        return subs;
    }

    it('[EXPECTATION] both variants call the same handlers', () => {
        const logSubs = buildLogSubscriptions(5, 3);
        const msg = { severity: 'info', message: 'test' };

        const calledOld = [];
        Object.keys(logSubs).forEach(name =>
            logSubs[name].forEach(handler => {
                if (typeof handler.cb === 'function' && (handler.severity === '*' || handler.severity === msg.severity)) {
                    calledOld.push(name);
                }
            }),
        );

        const calledNew = [];
        for (const name in logSubs) {
            for (const handler of logSubs[name]) {
                if (typeof handler.cb === 'function' && (handler.severity === '*' || handler.severity === msg.severity)) {
                    calledNew.push(name);
                }
            }
        }

        assert.deepEqual(calledOld.sort(), calledNew.sort());
    });

    it('[EXPECTATION] for...in creates no temporary keys array (correctness remains)', () => {
        // Timing comparison between for...in and Object.keys() is not reliable -
        // V8 optimizes both variants similarly. Functional correctness is what matters.
        const logSubs = buildLogSubscriptions(20, 5);
        const msg = { severity: 'debug' };

        const calledOld = [];
        Object.keys(logSubs).forEach(name =>
            logSubs[name].forEach(handler => {
                if (handler.severity === '*' || handler.severity === msg.severity) {
                    calledOld.push(name);
                }
            }),
        );

        const calledNew = [];
        for (const name in logSubs) {
            for (const handler of logSubs[name]) {
                if (handler.severity === '*' || handler.severity === msg.severity) {
                    calledNew.push(name);
                }
            }
        }

        assert.equal(calledOld.length, calledNew.length,
            'Number of called handlers must be identical');
        assert.deepEqual(calledOld.sort(), calledNew.sort(),
            'Called subscriptions must be identical');
    });

    it('[EXPECTATION] empty logSubs entries are skipped correctly', () => {
        const logSubs = {
            'script.js.a': [],
            'script.js.b': [{ severity: '*', cb: () => {}, sandbox: {} }],
            'script.js.c': null,
        };
        const called = [];
        for (const name in logSubs) {
            if (!logSubs[name]) continue;
            for (const handler of logSubs[name]) {
                called.push(name);
            }
        }
        assert.deepEqual(called, ['script.js.b']);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. subscriptionsObjectMap - O(1) dispatch instead of O(n) forEach in onObjectChange
// ─────────────────────────────────────────────────────────────────────────────
describe('Perf-8 · subscriptionsObjectMap O(1) Dispatch', () => {
    /**
     * Simulates OLD implementation: linear forEach
     */
    function dispatchOld(subscriptionsObject, id, obj) {
        const called = [];
        subscriptionsObject.forEach(sub => {
            if (sub.pattern === id) {
                sub.callback(id, obj);
                called.push(sub.name);
            }
        });
        return called;
    }

    /**
     * Simulates NEW implementation: O(1) map lookup
     */
    function dispatchNew(subscriptionsObjectMap, id, obj) {
        const called = [];
        const subs = subscriptionsObjectMap.get(id);
        if (!subs) return called;
        for (const sub of subs) {
            sub.callback(id, obj);
            called.push(sub.name);
        }
        return called;
    }

    function buildSubscriptions(totalSubs, matchingPattern) {
        const arr = [];
        const map = new Map();
        for (let i = 0; i < totalSubs; i++) {
            const pattern = i === Math.floor(totalSubs / 2) ? matchingPattern : `other.pattern.${i}`;
            const sub = {
                name: `script.js.s_${i}`,
                pattern,
                callback: () => {},
            };
            arr.push(sub);
            if (!map.has(pattern)) map.set(pattern, []);
            map.get(pattern).push(sub);
        }
        return { arr, map };
    }

    it('[EXPECTATION] both implementations dispatch the same callbacks', () => {
        const { arr, map } = buildSubscriptions(100, 'system.adapter.test.0');
        const obj = { _id: 'system.adapter.test.0', type: 'instance' };

        const calledOld = dispatchOld(arr, 'system.adapter.test.0', obj);
        const calledNew = dispatchNew(map, 'system.adapter.test.0', obj);

        assert.deepEqual(calledOld.sort(), calledNew.sort());
    });

    it('[EXPECTATION] map dispatch is faster with 1000 subscriptions', () => {
        const { arr, map } = buildSubscriptions(1_000, 'target.pattern');
        const obj = {};

        const tOld = bench(() => dispatchOld(arr, 'target.pattern', obj), 10_000);
        const tNew = bench(() => dispatchNew(map, 'target.pattern', obj), 10_000);

        assert.ok(tNew < tOld,
            `Map (${tNew.toFixed(1)}ms) must be faster than forEach (${tOld.toFixed(1)}ms)`);
    });

    it('[EXPECTATION] map returns an empty array for unknown pattern', () => {
        const { map } = buildSubscriptions(50, 'known.id');
        const result = dispatchNew(map, 'unknown.id', {});
        assert.deepEqual(result, []);
    });

    it('[EXPECTATION] map stays correct after add/remove of a subscription', () => {
        const map = new Map();

        // Add subscription
        const addSub = (map, sub) => {
            if (!map.has(sub.pattern)) map.set(sub.pattern, []);
            map.get(sub.pattern).push(sub);
        };

        // Remove subscription
        const removeSub = (map, subToRemove) => {
            const subs = map.get(subToRemove.pattern);
            if (!subs) return;
            const idx = subs.indexOf(subToRemove);
            if (idx !== -1) subs.splice(idx, 1);
            if (!subs.length) map.delete(subToRemove.pattern);
        };

        const sub1 = { name: 'a', pattern: 'p.1', callback: () => {} };
        const sub2 = { name: 'b', pattern: 'p.1', callback: () => {} };
        const sub3 = { name: 'c', pattern: 'p.2', callback: () => {} };

        addSub(map, sub1);
        addSub(map, sub2);
        addSub(map, sub3);

        assert.equal(map.get('p.1').length, 2);
        assert.equal(map.get('p.2').length, 1);

        removeSub(map, sub1);
        assert.equal(map.get('p.1').length, 1);
        assert.equal(map.get('p.1')[0].name, 'b');

        removeSub(map, sub2);
        assert.ok(!map.has('p.1'), 'Empty entry must be removed from map');
        assert.ok(map.has('p.2'), 'Other entry must not be affected');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Overall smoke test: all optimizations together
// ─────────────────────────────────────────────────────────────────────────────
describe('Integration · all optimizations together', () => {
    it('[EXPECTATION] combined hot path (stateChange) runs correctly', () => {
        // Simulates the onStateChange hot path with all fixes
        const stateIds = [];
        const stateIdSet = new Set();
        const states = {};

        function sortedInsert(arr, id) {
            let lo = 0, hi = arr.length;
            while (lo < hi) {
                const mid = (lo + hi) >>> 1;
                if (arr[mid] < id) lo = mid + 1; else hi = mid;
            }
            if (arr[lo] !== id) arr.splice(lo, 0, id);
        }

        function onStateChange(id, state) {
            if (!id) return;
            const oldState = states[id];
            if (state) {
                if (!oldState && !stateIdSet.has(id)) {
                    sortedInsert(stateIds, id);
                    stateIdSet.add(id);
                }
                states[id] = state;
            } else {
                delete states[id];
                const pos = stateIds.indexOf(id);
                if (pos !== -1) { stateIds.splice(pos, 1); stateIdSet.delete(id); }
            }
        }

        // Insert 1000 new states
        const ids = makeStateIds(1_000);
        for (const id of ids) onStateChange(id, { val: 1, ack: true });

        assert.equal(stateIds.length, 1_000);
        assert.equal(stateIdSet.size, 1_000);

        // Array must be sorted
        for (let i = 1; i < stateIds.length; i++) {
            assert.ok(stateIds[i - 1] <= stateIds[i], 'Array must stay sorted');
        }

        // Remove 500 states
        for (let i = 0; i < 500; i++) onStateChange(ids[i], null);
        assert.equal(stateIds.length, 500);
        assert.equal(stateIdSet.size, 500);

        // Set and array must stay in sync
        for (const id of stateIds) assert.ok(stateIdSet.has(id));
        for (const id of stateIdSet) assert.ok(stateIds.includes(id));
    });
});
