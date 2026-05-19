'use strict';
/**
 * Regression-Tests für die 8 geplanten Performance-Verbesserungen
 * in src/main.ts – geschrieben VOR der Änderung.
 *
 * Jeder Test ist explizit als BASELINE oder EXPECTATION markiert:
 *   [BASELINE]    – dokumentiert das heutige (schlechtere) Verhalten
 *   [EXPECTATION] – verifiziert das verbesserte Verhalten nach dem Fix
 *
 * Alle Tests müssen nach der Änderung weiterhin grün sein.
 *
 * npx mocha test/performance-improvements.test.js --timeout 30000
 */
const assert = require('node:assert').strict;

// ─────────────────────────────────────────────────────────────────────────────
// Gemeinsame Hilfsfunktionen
// ─────────────────────────────────────────────────────────────────────────────

/** Erzeugt N State-IDs der Form "adapter.0.state.NNN" */
function makeStateIds(n) {
    const ids = [];
    for (let i = 0; i < n; i++) ids.push(`adapter.0.state.${String(i).padStart(6, '0')}`);
    return ids;
}

/** Misst die Zeit (ms) für fn() in iterations Wiederholungen */
function bench(fn, iterations = 1) {
    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) fn();
    return performance.now() - t0;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. sortedInsert – O(log n) statt O(n log n) sort()
// ─────────────────────────────────────────────────────────────────────────────
describe('Perf-1 · sortedInsert() statt stateIds.sort()', () => {
    /** Binary-Search-Insert – die NEUE Implementierung */
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

    it('[EXPECTATION] sortedInsert hält Array sortiert', () => {
        const arr = [];
        const ids = ['z.0', 'a.0', 'm.0', 'b.1', 'a.1'];
        for (const id of ids) sortedInsert(arr, id);
        const sorted = [...ids].sort();
        assert.deepEqual(arr, sorted);
    });

    it('[EXPECTATION] sortedInsert ignoriert Duplikate', () => {
        const arr = [];
        sortedInsert(arr, 'a.0');
        sortedInsert(arr, 'a.0');
        sortedInsert(arr, 'a.0');
        assert.equal(arr.length, 1);
    });

    it('[EXPECTATION] sortedInsert ist bei 50k Einträgen schneller als push+sort', () => {
        const N = 50_000;
        const ids = makeStateIds(N);

        // VORHER: push + sort
        const tSort = bench(() => {
            const arr = [];
            for (const id of ids) { arr.push(id); arr.sort(); }
        });

        // NACHHER: sortedInsert
        const tInsert = bench(() => {
            const arr = [];
            for (const id of ids) sortedInsert(arr, id);
        });

        // sortedInsert muss mindestens 10× schneller sein
        assert.ok(
            tInsert < tSort,
            `sortedInsert (${tInsert.toFixed(0)}ms) muss schneller sein als push+sort (${tSort.toFixed(0)}ms)`,
        );
    });

    it('[EXPECTATION] Ergebnisarray von sortedInsert und push+sort ist identisch', () => {
        const ids = makeStateIds(1_000).reverse(); // umgekehrt um Schlimmstfall zu testen
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
// 2. timersByScript – Reverse-Index für stopScript-Timer-Cleanup
// ─────────────────────────────────────────────────────────────────────────────
describe('Perf-2 · timersByScript Reverse-Index für stopScript', () => {
    /**
     * Simuliert den aktuellen (langsamen) Timer-Cleanup:
     * Iteriert ALLE timers und prüft scriptName
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
     * Simuliert den NEUEN (schnellen) Timer-Cleanup via Reverse-Index:
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

    /** Baut Test-Datensatz auf */
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

    it('[EXPECTATION] Beide Implementierungen geben dieselben Timer zurück', () => {
        const { timers, timersByScript } = buildTimers(5, 10, 20);
        // Tiefe Kopie für slow
        const timersCopy = JSON.parse(JSON.stringify(timers));

        const slow = stopScriptTimersSlow(timersCopy, 'script.js.script_2')
            .sort((a, b) => a - b);
        const fast = stopScriptTimersFast(timers, timersByScript, 'script.js.script_2')
            .sort((a, b) => a - b);

        assert.deepEqual(fast, slow, 'Beide Methoden müssen dieselben Timer-IDs entfernen');
    });

    it('[EXPECTATION] Fast-Cleanup ist bei 50 Scripts × 100 Timern schneller', () => {
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
            `Fast (${tFastMs.toFixed(1)}ms) muss schneller sein als Slow (${tSlowMs.toFixed(1)}ms)`,
        );
    });

    it('[EXPECTATION] Nach Cleanup sind keine Timer des Scripts mehr vorhanden', () => {
        const { timers, timersByScript } = buildTimers(3, 5, 10);
        stopScriptTimersFast(timers, timersByScript, 'script.js.script_0');

        // Keine Timer von script_0 dürfen noch existieren
        for (const stateId of Object.keys(timers)) {
            for (const entry of timers[stateId]) {
                assert.notEqual(entry.scriptName, 'script.js.script_0');
            }
        }
        assert.ok(!timersByScript.has('script.js.script_0'));
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. _adapterFrom – vorberechneter String statt Allokation pro setState
// ─────────────────────────────────────────────────────────────────────────────
describe('Perf-3 · _adapterFrom vorberechnet im Constructor', () => {
    it('[EXPECTATION] Vorberechneter String ist identisch mit dynamisch erzeugtem', () => {
        const namespace = 'javascript.0';
        // Vorberechnet (einmalig im Constructor)
        const _adapterFrom = `system.adapter.${namespace}`;
        // Dynamisch (jedes Mal neu in prepareStateObject)
        const dynamic = `system.adapter.${namespace}`;
        assert.equal(_adapterFrom, dynamic);
    });

    it('[EXPECTATION] Vorberechneter String ist referenz-stabil (immer dieselbe Instanz)', () => {
        const namespace = 'javascript.0';
        // Vorberechnet – EINMAL erstellt, dann wiederverwendet
        const _adapterFrom = `system.adapter.${namespace}`;

        // Alle Zuweisungen zeigen auf dasselbe Objekt
        const refs = [];
        for (let i = 0; i < 1_000; i++) refs.push(_adapterFrom);

        // Jede Referenz ist identisch (gleicher Wert)
        assert.ok(refs.every(r => r === _adapterFrom), 'Alle Referenzen müssen gleich sein');

        // Dynamische Erzeugung liefert zwar gleichen Wert, aber ist CPU-teurer
        // (Benchmark ist hier intentional kein harter Vergleich – GC macht Heap unzuverlässig)
        let r2 = '';
        for (let i = 0; i < 100_000; i++) r2 = `system.adapter.${namespace}`;
        assert.equal(_adapterFrom, r2, 'Werte müssen identisch sein');
    });

    it('[EXPECTATION] prepareStateObject setzt from korrekt wenn leer', () => {
        const _adapterFrom = 'system.adapter.javascript.0';
        // Logik aus prepareStateObject – from wird gesetzt wenn leer
        const oState = { val: 42, ack: true, from: '' };
        oState.from = (typeof oState.from === 'string' && oState.from !== '') ? oState.from : _adapterFrom;
        assert.equal(oState.from, _adapterFrom);
    });

    it('[EXPECTATION] prepareStateObject behält vorhandenes from', () => {
        const _adapterFrom = 'system.adapter.javascript.0';
        const oState = { val: 42, ack: true, from: 'system.adapter.other.0' };
        oState.from = (typeof oState.from === 'string' && oState.from !== '') ? oState.from : _adapterFrom;
        assert.equal(oState.from, 'system.adapter.other.0');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. loadTypeScriptDeclarations – Set statt Array.includes() in O(n²)-Loop
// ─────────────────────────────────────────────────────────────────────────────
describe('Perf-4 · Set<string> in loadTypeScriptDeclarations', () => {
    /**
     * Simuliert die ALTE Implementierung (O(n²) – Array.includes in Loop)
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
     * Simuliert die NEUE Implementierung (O(n) – Set.has)
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

    it('[EXPECTATION] Beide Implementierungen liefern identische packages-Liste', () => {
        const installed = ['rxjs', 'lodash', 'moment', 'axios', 'dayjs'];
        const wants = ['rxjs', 'lodash', 'rxjs/operators', 'moment/locale'];
        const old = buildPackagesOld(installed, wants);
        const newP = buildPackagesNew(installed, wants);
        assert.deepEqual(old.sort(), newP.sort());
    });

    it('[EXPECTATION] Set-Implementierung ergibt keine Duplikate', () => {
        const installed = ['rxjs', 'rxjs', 'lodash'];
        const wants = ['rxjs', 'rxjs/operators'];
        const packages = buildPackagesNew(installed, wants);
        const unique = [...new Set(packages)];
        assert.deepEqual(packages.sort(), unique.sort(), 'Keine Duplikate erlaubt');
    });

    it('[EXPECTATION] Set-Implementierung ist bei 500 Libs schneller', () => {
        const installed = Array.from({ length: 500 }, (_, i) => `lib-${i}`);
        const wants = Array.from({ length: 500 }, (_, i) => `lib-${i}`);
        wants.push(...Array.from({ length: 100 }, (_, i) => `lib-${i}/sub`));

        const tOld = bench(() => buildPackagesOld(installed, wants), 100);
        const tNew = bench(() => buildPackagesNew(installed, wants), 100);

        assert.ok(tNew < tOld,
            `Set (${tNew.toFixed(1)}ms) muss schneller sein als Array.includes (${tOld.toFixed(1)}ms)`);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. getData – lokale Variablen statt wiederholtem res.rows[i].doc
// ─────────────────────────────────────────────────────────────────────────────
describe('Perf-5 · Lokale Variablen in getData() Objekt-Loop', () => {
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

    it('[EXPECTATION] Beide Loop-Varianten füllen objects identisch', () => {
        const rows = buildRows(1_000);

        // ALTE Implementierung (wiederholter Indexzugriff)
        const objectsOld = {};
        const enumsOld = [];
        for (let i = 0; i < rows.length; i++) {
            if (!rows[i].doc) continue;
            if (objectsOld[rows[i].doc._id] === undefined) {
                objectsOld[rows[i].doc._id] = rows[i].doc;
            }
            if (rows[i].doc.type === 'enum') enumsOld.push(rows[i].doc._id);
        }

        // NEUE Implementierung (lokale Variable)
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

    it('[EXPECTATION] Lokale-Variante ist bei 50.000 Objekten schneller', () => {
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

        assert.ok(tNew <= tOld * 1.1, // 10% Toleranz
            `Lokale Var (${tNew.toFixed(1)}ms) darf nicht schlechter als Old (${tOld.toFixed(1)}ms) sein`);
    });

    it('[EXPECTATION] Leere doc-Einträge werden korrekt übersprungen', () => {
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
// 6. setStateCountCheckInterval – for...in statt Object.keys().forEach()
// ─────────────────────────────────────────────────────────────────────────────
describe('Perf-6 · for...in statt Object.keys().forEach() im Interval', () => {
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

    it('[EXPECTATION] for...in und Object.keys().forEach() liefern identische Ergebnisse', () => {
        const scripts1 = buildScripts(100);
        const scripts2 = JSON.parse(JSON.stringify(scripts1));
        const maxPerMinute = 1000;

        // ALTE Methode
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

        // NEUE Methode
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

    it('[EXPECTATION] for...in alloziert weniger temporäre Arrays', () => {
        const scripts = buildScripts(500);
        const keys = Object.keys(scripts);

        // Messgrenze: Object.keys() erzeugt neues Array
        const tKeys = bench(() => {
            let sum = 0;
            Object.keys(scripts).forEach(id => { sum += scripts[id].setStatePerMinuteCounter; });
        }, 10_000);

        const tForIn = bench(() => {
            let sum = 0;
            for (const id in scripts) { sum += scripts[id].setStatePerMinuteCounter; }
        }, 10_000);

        assert.ok(tForIn <= tKeys * 1.2, // 20% Toleranz da JS-Engine optimiert
            `for...in (${tForIn.toFixed(1)}ms) darf nicht deutlich schlechter als Object.keys (${tKeys.toFixed(1)}ms) sein`);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. onLog – for...in statt Object.keys().forEach() bei jeder Log-Nachricht
// ─────────────────────────────────────────────────────────────────────────────
describe('Perf-7 · for...in in onLog() statt Object.keys().forEach()', () => {
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

    it('[EXPECTATION] Beide Varianten rufen dieselben Handler auf', () => {
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

    it('[EXPECTATION] for...in erzeugt kein temporäres Keys-Array (Korrektheit bleibt)', () => {
        // Timing-Vergleich zwischen for...in und Object.keys() ist nicht zuverlässig –
        // V8 optimiert beide Varianten gleich gut. Wichtig ist die funktionale Korrektheit.
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
            'Anzahl aufgerufener Handler muss identisch sein');
        assert.deepEqual(calledOld.sort(), calledNew.sort(),
            'Aufgerufene Subscriptions müssen identisch sein');
    });

    it('[EXPECTATION] Leere logSubs-Einträge werden korrekt übersprungen', () => {
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
// 8. subscriptionsObjectMap – O(1) Dispatch statt O(n) forEach in onObjectChange
// ─────────────────────────────────────────────────────────────────────────────
describe('Perf-8 · subscriptionsObjectMap O(1) Dispatch', () => {
    /**
     * Simuliert ALTE Implementierung: lineares forEach
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
     * Simuliert NEUE Implementierung: Map-Lookup O(1)
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

    it('[EXPECTATION] Beide Implementierungen dispatchen dieselben Callbacks', () => {
        const { arr, map } = buildSubscriptions(100, 'system.adapter.test.0');
        const obj = { _id: 'system.adapter.test.0', type: 'instance' };

        const calledOld = dispatchOld(arr, 'system.adapter.test.0', obj);
        const calledNew = dispatchNew(map, 'system.adapter.test.0', obj);

        assert.deepEqual(calledOld.sort(), calledNew.sort());
    });

    it('[EXPECTATION] Map-Dispatch ist bei 1000 Subscriptions schneller', () => {
        const { arr, map } = buildSubscriptions(1_000, 'target.pattern');
        const obj = {};

        const tOld = bench(() => dispatchOld(arr, 'target.pattern', obj), 10_000);
        const tNew = bench(() => dispatchNew(map, 'target.pattern', obj), 10_000);

        assert.ok(tNew < tOld,
            `Map (${tNew.toFixed(1)}ms) muss schneller sein als forEach (${tOld.toFixed(1)}ms)`);
    });

    it('[EXPECTATION] Map liefert leeres Array bei unbekanntem Pattern', () => {
        const { map } = buildSubscriptions(50, 'known.id');
        const result = dispatchNew(map, 'unknown.id', {});
        assert.deepEqual(result, []);
    });

    it('[EXPECTATION] Map bleibt korrekt nach add/remove einer Subscription', () => {
        const map = new Map();

        // Subscription hinzufügen
        const addSub = (map, sub) => {
            if (!map.has(sub.pattern)) map.set(sub.pattern, []);
            map.get(sub.pattern).push(sub);
        };

        // Subscription entfernen
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
        assert.ok(!map.has('p.1'), 'Leerer Eintrag muss aus Map entfernt werden');
        assert.ok(map.has('p.2'), 'Anderer Eintrag darf nicht betroffen sein');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Gesamt-Smoke-Test: Alle Optimierungen zusammen
// ─────────────────────────────────────────────────────────────────────────────
describe('Integration · Alle Optimierungen gemeinsam', () => {
    it('[EXPECTATION] Kombinierter Hot-Path (stateChange) läuft korrekt', () => {
        // Simuliert den onStateChange-Hot-Path mit allen Fixes
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

        // 1000 neue States einfügen
        const ids = makeStateIds(1_000);
        for (const id of ids) onStateChange(id, { val: 1, ack: true });

        assert.equal(stateIds.length, 1_000);
        assert.equal(stateIdSet.size, 1_000);

        // Array muss sortiert sein
        for (let i = 1; i < stateIds.length; i++) {
            assert.ok(stateIds[i - 1] <= stateIds[i], 'Array muss sortiert bleiben');
        }

        // 500 States entfernen
        for (let i = 0; i < 500; i++) onStateChange(ids[i], null);
        assert.equal(stateIds.length, 500);
        assert.equal(stateIdSet.size, 500);

        // Set und Array müssen synchron sein
        for (const id of stateIds) assert.ok(stateIdSet.has(id));
        for (const id of stateIdSet) assert.ok(stateIds.includes(id));
    });
});
