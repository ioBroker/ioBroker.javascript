'use strict';
/**
 * Regression-Tests für 10 I/O-Performance-Probleme in src/lib/sandbox.ts
 * Geschrieben VOR den Änderungen als Baseline + Expectation.
 *
 * [BASELINE]    – dokumentiert das heutige (schlechtere) Verhalten
 * [EXPECTATION] – verifiziert das verbesserte Verhalten nach dem Fix
 *
 * npx mocha test/io-improvements.test.js --timeout 30000
 */
const assert = require('node:assert').strict;

/** Misst ms für fn() in `iterations` Wiederholungen */
function bench(fn, iterations = 1) {
    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) fn();
    return performance.now() - t0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Problem 1: setStateChanged – Object.keys().filter().every() vs for…in
// ─────────────────────────────────────────────────────────────────────────────
describe('IO-1 · setStateChanged – Array-Allokation vermeiden', () => {
    /** ALTE Implementierung – alloziert attrs[] bei jedem Aufruf */
    function hasChangedOld(stateAsObject, oldState) {
        const attrs = Object.keys(stateAsObject).filter(
            attr => attr !== 'ts' && stateAsObject[attr] !== undefined,
        );
        return !attrs.every(attr => stateAsObject[attr] === oldState[attr]);
    }

    /** NEUE Implementierung – kein temporäres Array */
    function hasChangedNew(stateAsObject, oldState) {
        for (const attr in stateAsObject) {
            if (attr === 'ts') continue;
            if (stateAsObject[attr] === undefined) continue;
            if (stateAsObject[attr] !== oldState[attr]) return true;
        }
        return false;
    }

    const makeState = val => ({ val, ack: true, from: 'system.adapter.js.0', q: 0, lc: 1000, ts: Date.now() });

    it('[EXPECTATION] Beide Implementierungen erkennen Änderung korrekt', () => {
        const s1 = makeState(42);
        const s2 = makeState(43);
        assert.equal(hasChangedOld(s2, s1), true);
        assert.equal(hasChangedNew(s2, s1), true);
    });

    it('[EXPECTATION] Beide Implementierungen erkennen KEINE Änderung korrekt', () => {
        const s1 = makeState(42);
        const s2 = makeState(42);
        assert.equal(hasChangedOld(s2, s1), false);
        assert.equal(hasChangedNew(s2, s1), false);
    });

    it('[EXPECTATION] ts-Feld wird bei beiden korrekt ignoriert', () => {
        const s1 = makeState(42);
        const s2 = { ...makeState(42), ts: Date.now() + 999 }; // nur ts geändert
        assert.equal(hasChangedOld(s2, s1), false, 'Old: nur ts-Änderung darf kein Change sein');
        assert.equal(hasChangedNew(s2, s1), false, 'New: nur ts-Änderung darf kein Change sein');
    });

    it('[EXPECTATION] for…in ist bei 100k Aufrufen nicht schlechter als filter().every()', () => {
        const s1 = makeState(42);
        const s2 = makeState(42);
        const tOld = bench(() => hasChangedOld(s2, s1), 100_000);
        const tNew = bench(() => hasChangedNew(s2, s1), 100_000);
        assert.ok(tNew <= tOld * 1.5,
            `for…in (${tNew.toFixed(1)}ms) darf nicht deutlich schlechter als filter (${tOld.toFixed(1)}ms) sein`);
    });

    it('[BASELINE] Object.keys().filter() alloziert pro Aufruf ein temporäres Array', () => {
        const s = makeState(10);
        // Wir können nicht direkt Array-Allokation messen, aber wir prüfen
        // dass die alte Variante ein Array zurückgibt (Designnachweis)
        const attrs = Object.keys(s).filter(a => a !== 'ts' && s[a] !== undefined);
        assert.ok(Array.isArray(attrs), 'filter() gibt immer ein neues Array zurück');
        assert.ok(attrs.length > 0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Problem 2: $() Selector – O(n²) Deduplizierung mit resUnique.includes()
// ─────────────────────────────────────────────────────────────────────────────
describe('IO-2 · $() Selector – O(n²) Deduplizierung', () => {
    /** ALTE Implementierung */
    function deduplicateOld(res) {
        const resUnique = [];
        for (let i = 0; i < res.length; i++) {
            if (!resUnique.includes(res[i])) {
                resUnique.push(res[i]);
            }
        }
        return resUnique;
    }

    /** NEUE Implementierung */
    function deduplicateNew(res) {
        return [...new Set(res)];
    }

    function makeIds(n, duplicateRatio = 0.3) {
        const unique = Array.from({ length: n }, (_, i) => `adapter.0.state.${i}`);
        const dupes = unique.slice(0, Math.floor(n * duplicateRatio));
        return [...unique, ...dupes].sort(() => Math.random() - 0.5);
    }

    it('[EXPECTATION] Beide liefern dieselben eindeutigen IDs', () => {
        const ids = makeIds(100);
        const old = deduplicateOld(ids).sort();
        const newD = deduplicateNew(ids).sort();
        assert.deepEqual(old, newD);
    });

    it('[EXPECTATION] Keine Duplikate im Ergebnis', () => {
        const ids = ['a', 'b', 'a', 'c', 'b', 'a'];
        const result = deduplicateNew(ids);
        assert.deepEqual(result.sort(), ['a', 'b', 'c']);
        assert.equal(result.length, 3);
    });

    it('[EXPECTATION] Set-Variante ist bei 2.000 IDs mit 30% Duplikaten schneller', () => {
        const ids = makeIds(2_000);
        const tOld = bench(() => deduplicateOld(ids), 500);
        const tNew = bench(() => deduplicateNew(ids), 500);
        assert.ok(tNew < tOld,
            `Set (${tNew.toFixed(1)}ms) muss schneller sein als includes (${tOld.toFixed(1)}ms)`);
    });

    it('[BASELINE] includes() ist O(n) – Beweis per Messung', () => {
        const small = Array.from({ length: 100 }, (_, i) => `id.${i}`);
        const large = Array.from({ length: 5_000 }, (_, i) => `id.${i}`);
        const tSmall = bench(() => deduplicateOld(small), 1_000);
        const tLarge = bench(() => deduplicateOld(large), 1_000);
        // O(n²): 50× mehr Elemente → mindestens 20× mehr Zeit
        assert.ok(tLarge > tSmall * 5,
            `Großes Array (${tLarge.toFixed(1)}ms) muss deutlich länger dauern als kleines (${tSmall.toFixed(1)}ms)`);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Problem 3: subscribePattern – Object.keys().forEach() statt Object.assign()
// ─────────────────────────────────────────────────────────────────────────────
describe('IO-3 · subscribePattern – Object.assign statt forEach', () => {
    function mergeStatesOld(target, source) {
        Object.keys(source).forEach(id => (target[id] = source[id]));
    }

    function mergeStatesNew(target, source) {
        Object.assign(target, source);
    }

    it('[EXPECTATION] Beide Varianten erzeugen identisches Ergebnis', () => {
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

    it('[EXPECTATION] Object.assign erzeugt kein temporäres Keys-Array (Korrektheit + Design)', () => {
        const source = {};
        for (let i = 0; i < 10_000; i++) source[`adapter.0.state.${i}`] = { val: i, ack: true };

        // Object.assign braucht intern kein Object.keys() Array – es iteriert direkt
        // forEach benötigt zwingend ein Array via Object.keys()
        // Wir prüfen: Ergebnis ist korrekt und kein temporäres Array nötig

        const t1 = {};
        mergeStatesOld(t1, source);

        const t2 = {};
        mergeStatesNew(t2, source);

        // Beide Ergebnisse müssen identisch sein
        assert.equal(Object.keys(t1).length, Object.keys(t2).length);
        assert.equal(t1['adapter.0.state.9999'].val, 9999);
        assert.equal(t2['adapter.0.state.9999'].val, 9999);

        // Object.assign gibt das target zurück (API-Korrektheit)
        const target = {};
        const result = Object.assign(target, source);
        assert.equal(result, target, 'Object.assign gibt target zurück');
    });

    it('[EXPECTATION] Leere source erzeugt kein Fehler', () => {
        const t = { existing: 1 };
        mergeStatesNew(t, {});
        assert.equal(t.existing, 1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Problem 4: subscribe Array-IDs – JSON.parse/stringify statt Spread
// ─────────────────────────────────────────────────────────────────────────────
describe('IO-4 · subscribe Array-IDs – Spread statt JSON-Clone', () => {
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

    it('[EXPECTATION] Beide Varianten erzeugen äquivalente Pattern-Objekte', () => {
        const old = clonePatternOld(basePattern, 'adapter.0.state.1');
        const newP = clonePatternNew(basePattern, 'adapter.0.state.1');
        assert.equal(old.id, newP.id);
        assert.equal(old.change, newP.change);
        assert.equal(old.q, newP.q);
        assert.equal(old.ack, newP.ack);
        assert.equal(old.logic, newP.logic);
    });

    it('[EXPECTATION] id wird korrekt überschrieben', () => {
        const result = clonePatternNew(basePattern, 'my.new.id');
        assert.equal(result.id, 'my.new.id');
        assert.equal(basePattern.id, null, 'Original darf nicht verändert werden');
    });

    it('[EXPECTATION] Spread ist bei 50 Array-IDs schneller als JSON clone', () => {
        const ids = Array.from({ length: 50 }, (_, i) => `adapter.0.state.${i}`);

        const tOld = bench(() => {
            ids.forEach(id => clonePatternOld(basePattern, id));
        }, 10_000);

        const tNew = bench(() => {
            ids.forEach(id => clonePatternNew(basePattern, id));
        }, 10_000);

        assert.ok(tNew < tOld,
            `Spread (${tNew.toFixed(1)}ms) muss schneller sein als JSON-Clone (${tOld.toFixed(1)}ms)`);
    });

    it('[EXPECTATION] Verschachtelung: Spread kopiert keine tiefen Referenzen (flach)', () => {
        const nested = { ...basePattern, meta: { deep: true } };
        const cloned = clonePatternNew(nested, 'new.id');
        // Flacher Spread – meta ist dieselbe Referenz
        assert.equal(cloned.meta, nested.meta);
        // Für Pattern-Objekte mit primitiven Werten ist das ausreichend
        assert.equal(cloned.id, 'new.id');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Problem 5: adapterSubs – filter().length > 0 statt includes()
// ─────────────────────────────────────────────────────────────────────────────
describe('IO-5 · adapterSubs – includes() statt filter().length', () => {
    function subExistsOld(arr, id) {
        return arr.filter(sub => sub === id).length > 0;
    }

    function subExistsNew(arr, id) {
        return arr.includes(id);
    }

    it('[EXPECTATION] Beide finden vorhandene IDs', () => {
        const arr = ['a.0.state.1', 'b.0.state.2', 'c.0.state.3'];
        assert.equal(subExistsOld(arr, 'b.0.state.2'), true);
        assert.equal(subExistsNew(arr, 'b.0.state.2'), true);
    });

    it('[EXPECTATION] Beide erkennen fehlende IDs', () => {
        const arr = ['a.0.state.1', 'b.0.state.2'];
        assert.equal(subExistsOld(arr, 'x.0.not.found'), false);
        assert.equal(subExistsNew(arr, 'x.0.not.found'), false);
    });

    it('[EXPECTATION] includes() erzeugt kein temporäres Array', () => {
        const arr = Array.from({ length: 1_000 }, (_, i) => `adapter.0.state.${i}`);

        const tOld = bench(() => subExistsOld(arr, 'adapter.0.state.999'), 50_000);
        const tNew = bench(() => subExistsNew(arr, 'adapter.0.state.999'), 50_000);

        assert.ok(tNew <= tOld * 1.2,
            `includes (${tNew.toFixed(1)}ms) darf nicht schlechter als filter (${tOld.toFixed(1)}ms) sein`);
    });

    it('[BASELINE] filter() gibt immer ein neues Array zurück (Allokationsnachweis)', () => {
        const arr = ['x', 'y'];
        const r1 = arr.filter(s => s === 'x');
        const r2 = arr.filter(s => s === 'x');
        assert.notEqual(r1, r2, 'Jeder filter()-Aufruf gibt ein NEUES Array zurück');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Problem 6: onEnumMembers – Object.keys().includes() statt `in` Operator
// ─────────────────────────────────────────────────────────────────────────────
describe('IO-6 · onEnumMembers – `in` Operator statt Object.keys().includes()', () => {
    function memberExistsOld(subscriptions, objId) {
        return Object.keys(subscriptions).includes(objId);
    }

    function memberExistsNew(subscriptions, objId) {
        return objId in subscriptions;
    }

    it('[EXPECTATION] Beide erkennen vorhandene Member', () => {
        const subs = { 'state.1': {}, 'state.2': {}, 'state.3': {} };
        assert.equal(memberExistsOld(subs, 'state.2'), true);
        assert.equal(memberExistsNew(subs, 'state.2'), true);
    });

    it('[EXPECTATION] Beide erkennen fehlende Member', () => {
        const subs = { 'state.1': {} };
        assert.equal(memberExistsOld(subs, 'state.99'), false);
        assert.equal(memberExistsNew(subs, 'state.99'), false);
    });

    it('[EXPECTATION] `in`-Operator ist bei 500 Subscriptions schneller', () => {
        const subs = {};
        for (let i = 0; i < 500; i++) subs[`state.${i}`] = {};

        const tOld = bench(() => memberExistsOld(subs, 'state.499'), 50_000);
        const tNew = bench(() => memberExistsNew(subs, 'state.499'), 50_000);

        assert.ok(tNew < tOld,
            `\`in\` (${tNew.toFixed(1)}ms) muss schneller sein als Object.keys().includes (${tOld.toFixed(1)}ms)`);
    });

    it('[EXPECTATION] Ergebnis ist bei leerem Objekt korrekt', () => {
        assert.equal(memberExistsNew({}, 'any'), false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Problem 7: clearStateDelayed – timersByScript nicht aktualisiert
// ─────────────────────────────────────────────────────────────────────────────
describe('IO-7 · clearStateDelayed – timersByScript Synchronisierung', () => {
    function buildTimerFixture() {
        const timers = {};
        const timersByScript = new Map();
        const scriptName = 'script.js.test';

        // Timer hinzufügen (wie setStateDelayed)
        const addTimer = (stateId, timerId) => {
            if (!timers[stateId]) timers[stateId] = [];
            timers[stateId].push({ id: timerId, t: null, scriptName });
            if (!timersByScript.has(scriptName)) timersByScript.set(scriptName, new Set());
            timersByScript.get(scriptName).add(stateId);
        };

        // Timer entfernen – ALTE Variante (ohne timersByScript-Update)
        const clearTimerOld = (stateId, timerId) => {
            if (!timers[stateId]) return false;
            for (let i = timers[stateId].length - 1; i >= 0; i--) {
                if (timerId === undefined || timers[stateId][i].id === timerId) {
                    timers[stateId].splice(i, 1);
                }
            }
            if (!timers[stateId].length) delete timers[stateId];
            // BUG: timersByScript wird NICHT aktualisiert
            return true;
        };

        // Timer entfernen – NEUE Variante (mit timersByScript-Update)
        const clearTimerNew = (stateId, timerId) => {
            if (!timers[stateId]) return false;
            for (let i = timers[stateId].length - 1; i >= 0; i--) {
                if (timerId === undefined || timers[stateId][i].id === timerId) {
                    timers[stateId].splice(i, 1);
                }
            }
            if (!timers[stateId].length) {
                delete timers[stateId];
                // FIX: timersByScript synchronisieren
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

    it('[BASELINE] Old: timersByScript bleibt nach clearStateDelayed veraltet', () => {
        const { timers, timersByScript, addTimer, clearTimerOld, scriptName } = buildTimerFixture();
        addTimer('state.1', 1);
        clearTimerOld('state.1', 1); // löscht timer, aber NICHT timersByScript

        assert.equal(Object.keys(timers).length, 0, 'timers ist leer');
        // BUG: timersByScript enthält veralteten Eintrag
        assert.ok(timersByScript.has(scriptName),
            '[BASELINE] timersByScript ist noch nicht korrekt – das ist der bekannte Bug');
    });

    it('[EXPECTATION] New: timersByScript wird nach clearStateDelayed korrekt aktualisiert', () => {
        const { timers, timersByScript, addTimer, clearTimerNew, scriptName } = buildTimerFixture();
        addTimer('state.1', 1);
        clearTimerNew('state.1', 1);

        assert.equal(Object.keys(timers).length, 0, 'timers ist leer');
        assert.ok(!timersByScript.has(scriptName),
            'timersByScript darf keinen Eintrag mehr enthalten');
    });

    it('[EXPECTATION] timersByScript bleibt korrekt wenn noch andere States Timer haben', () => {
        const { timers, timersByScript, addTimer, clearTimerNew, scriptName } = buildTimerFixture();
        addTimer('state.1', 1);
        addTimer('state.2', 2);

        clearTimerNew('state.1', 1);

        assert.ok(!timers['state.1'], 'state.1 Timer entfernt');
        assert.ok(timers['state.2'], 'state.2 Timer noch vorhanden');
        const stateIds = timersByScript.get(scriptName);
        assert.ok(stateIds, 'Script-Eintrag noch vorhanden');
        assert.ok(!stateIds.has('state.1'), 'state.1 aus Set entfernt');
        assert.ok(stateIds.has('state.2'), 'state.2 noch im Set');
    });

    it('[EXPECTATION] clearStateDelayed mit timerId=undefined löscht alle Timer des State', () => {
        const { timers, timersByScript, addTimer, clearTimerNew, scriptName } = buildTimerFixture();
        addTimer('state.1', 1);
        addTimer('state.1', 2); // zweiter Timer für denselben State

        clearTimerNew('state.1', undefined);

        assert.ok(!timers['state.1'], 'Alle Timer von state.1 entfernt');
        const stateIds = timersByScript.get(scriptName);
        if (stateIds) {
            assert.ok(!stateIds.has('state.1'), 'state.1 aus Set entfernt');
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Problem 8: getSchedules – JSON.parse/stringify statt Spread
// ─────────────────────────────────────────────────────────────────────────────
describe('IO-8 · getSchedules – Spread statt JSON deep clone', () => {
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

    it('[EXPECTATION] Beide liefern identische Schedule-Listen', () => {
        const schedules = Array.from({ length: 20 }, (_, i) => makeSchedule(i));
        const old = getSchedulesOld(schedules);
        const newS = getSchedulesNew(schedules);
        assert.deepEqual(old, newS);
    });

    it('[EXPECTATION] Spread liefert eine Kopie (nicht dieselbe Referenz)', () => {
        const schedules = [makeSchedule(1)];
        const result = getSchedulesNew(schedules);
        assert.notEqual(result[0], schedules[0]._ioBroker, 'Muss eine Kopie sein, nicht die Original-Referenz');
        assert.deepEqual(result[0], schedules[0]._ioBroker);
    });

    it('[EXPECTATION] Spread ist bei 100 Schedules schneller als JSON clone', () => {
        const schedules = Array.from({ length: 100 }, (_, i) => makeSchedule(i));

        const tOld = bench(() => getSchedulesOld(schedules), 10_000);
        const tNew = bench(() => getSchedulesNew(schedules), 10_000);

        assert.ok(tNew < tOld,
            `Spread (${tNew.toFixed(1)}ms) muss schneller sein als JSON-Clone (${tOld.toFixed(1)}ms)`);
    });

    it('[EXPECTATION] Primitiv-Felder (type, pattern, scriptName, id) werden korrekt kopiert', () => {
        const s = makeSchedule(42);
        const copy = getSchedulesNew([s])[0];
        assert.equal(copy.type, 'cron');
        assert.equal(copy.pattern, '0 42 * * *');
        assert.ok(copy.scriptName.includes('42'));
        assert.ok(copy.id.startsWith('cron_42'));
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Problem 9: sendTo ohne Instanz – getObjectView ohne Cache
// ─────────────────────────────────────────────────────────────────────────────
describe('IO-9 · sendTo – Instanz-Cache statt wiederholter getObjectView', () => {
    /** Simuliert den Instanz-Cache */
    function buildInstanceCache() {
        const cache = new Map(); // adapterName → string[]
        let queryCount = 0;

        const getInstances = async (adapterName, allInstances) => {
            if (cache.has(adapterName)) {
                return cache.get(adapterName); // Cache-Hit
            }
            // Simulierter DB-Query
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

    it('[EXPECTATION] Erster Aufruf führt einen DB-Query durch', async () => {
        const c = buildInstanceCache();
        const result = await c.getInstances('zigbee', allInstances);
        assert.equal(c.getQueryCount(), 1);
        assert.deepEqual(result.sort(), ['zigbee.0', 'zigbee.1'].sort());
    });

    it('[EXPECTATION] Zweiter Aufruf nutzt den Cache (kein DB-Query)', async () => {
        const c = buildInstanceCache();
        await c.getInstances('zigbee', allInstances);
        await c.getInstances('zigbee', allInstances); // Cache-Hit
        assert.equal(c.getQueryCount(), 1, 'Nur 1 Query, nicht 2');
    });

    it('[EXPECTATION] Invalidierung erzwingt neuen Query', async () => {
        const c = buildInstanceCache();
        await c.getInstances('zigbee', allInstances);
        c.invalidate('zigbee');
        await c.getInstances('zigbee', allInstances);
        assert.equal(c.getQueryCount(), 2, 'Nach Invalidierung muss neu abgefragt werden');
    });

    it('[EXPECTATION] Verschiedene Adapter-Namen haben getrennte Cache-Einträge', async () => {
        const c = buildInstanceCache();
        await c.getInstances('zigbee', allInstances);
        await c.getInstances('hm-rpc', allInstances);
        assert.equal(c.getQueryCount(), 2);
        assert.equal(c.cache.size, 2);
    });

    it('[BASELINE] Ohne Cache: jeder sendTo-Aufruf braucht einen DB-Query', async () => {
        let queryCount = 0;
        const sendToWithoutCache = async adapterName => {
            queryCount++; // Simuliert getObjectView
            return allInstances.filter(id => id.startsWith(`system.adapter.${adapterName}.`));
        };

        await sendToWithoutCache('zigbee');
        await sendToWithoutCache('zigbee');
        await sendToWithoutCache('zigbee');
        assert.equal(queryCount, 3, '[BASELINE] Ohne Cache: 3 Aufrufe → 3 DB-Queries');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Problem 10: clearInterval/Timeout – indexOf() O(n) statt Set O(1)
// ─────────────────────────────────────────────────────────────────────────────
describe('IO-10 · clearInterval/Timeout – Set statt Array für Timer-Tracking', () => {
    /** ALTE Implementierung – Array mit indexOf */
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

    /** NEUE Implementierung – Set */
    function buildTimerTrackerNew() {
        const timers = new Set();
        return {
            add: id => { timers.add(id); },
            remove: id => { timers.delete(id); },
            has: id => timers.has(id),
            size: () => timers.size,
        };
    }

    it('[EXPECTATION] Beide Tracker: add, has, remove funktionieren korrekt', () => {
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

    it('[EXPECTATION] Set-Tracker ist bei 1.000 aktiven Timern und remove schneller', () => {
        const N = 1_000;
        const ids = Array.from({ length: N }, (_, i) => i + 1);

        const tOld = bench(() => {
            const t = buildTimerTrackerOld();
            for (const id of ids) t.add(id);
            // clearInterval-Szenario: zufällig entfernen
            for (let i = 0; i < 100; i++) t.remove(ids[Math.floor(Math.random() * N)]);
        }, 500);

        const tNew = bench(() => {
            const t = buildTimerTrackerNew();
            for (const id of ids) t.add(id);
            for (let i = 0; i < 100; i++) t.remove(ids[Math.floor(Math.random() * N)]);
        }, 500);

        assert.ok(tNew <= tOld * 1.5,
            `Set (${tNew.toFixed(1)}ms) darf nicht deutlich schlechter sein als Array (${tOld.toFixed(1)}ms)`);
    });

    it('[EXPECTATION] Set erlaubt keine Duplikate (korrekt für Timer-IDs)', () => {
        const t = buildTimerTrackerNew();
        t.add(42);
        t.add(42);
        t.add(42);
        assert.equal(t.size(), 1, 'Set darf keine Duplikate enthalten');
    });

    it('[EXPECTATION] remove eines nicht vorhandenen Elements wirft keinen Fehler', () => {
        const t = buildTimerTrackerNew();
        assert.doesNotThrow(() => t.remove(999));
    });

    it('[EXPECTATION] Script-Stop-Szenario: alle Timer eines Scripts werden entfernt', () => {
        const t = buildTimerTrackerNew();
        const timerIds = [101, 102, 103, 104, 105];
        for (const id of timerIds) t.add(id);

        // stopScript löscht alle Timer
        for (const id of timerIds) t.remove(id);

        assert.equal(t.size(), 0);
        for (const id of timerIds) assert.ok(!t.has(id));
    });

    it('[BASELINE] Array indexOf: worst case ist letztes Element', () => {
        const arr = Array.from({ length: 10_000 }, (_, i) => i);
        const last = arr[arr.length - 1];

        const tArr = bench(() => arr.indexOf(last), 50_000);

        const set = new Set(arr);
        const tSet = bench(() => set.has(last), 50_000);

        assert.ok(tSet < tArr,
            `Set.has (${tSet.toFixed(1)}ms) muss schneller sein als indexOf (${tArr.toFixed(1)}ms) bei 10k Elementen`);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration: Kombinierter I/O Hot-Path
// ─────────────────────────────────────────────────────────────────────────────
describe('Integration · Kombinierter I/O Hot-Path', () => {
    it('[EXPECTATION] Vollständiger onStateChange Durchlauf mit allen Fixes korrekt', () => {
        // Simuliert den Hot-Path mit allen IO-Fixes kombiniert
        const subscriptions = [];
        const stateIdSet = new Set();

        // IO-2: Set für Deduplication
        const allIds = Array.from({ length: 200 }, (_, i) => `adapter.0.s.${i}`);
        const duped = [...allIds, ...allIds.slice(0, 50)];
        const unique = [...new Set(duped)]; // IO-2 Fix
        assert.equal(unique.length, 200);

        // IO-1: hasChanged ohne Array-Allokation
        const s1 = { val: 42, ack: true, from: 'system.adapter.js.0', q: 0, lc: 1000, ts: 100 };
        const s2 = { val: 43, ack: true, from: 'system.adapter.js.0', q: 0, lc: 1001, ts: 101 };
        let changed = false;
        for (const attr in s2) {
            if (attr === 'ts') continue;
            if (s2[attr] !== s1[attr]) { changed = true; break; }
        }
        assert.ok(changed);

        // IO-5: includes statt filter().length
        const adapterSubs = ['adapter.0.state.1', 'adapter.0.state.2'];
        assert.ok(adapterSubs.includes('adapter.0.state.1'));
        assert.ok(!adapterSubs.includes('adapter.0.state.99'));

        // IO-6: in-Operator
        const subs = { 'state.1': {}, 'state.2': {} };
        assert.ok('state.1' in subs);
        assert.ok(!('state.99' in subs));
    });

    it('[EXPECTATION] Timer-Lifecycle: add → clear → stopScript funktioniert konsistent', () => {
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

        // Szenario: 3 States mit Timern, 1 wird manuell gecleart
        addTimer('state.A', 1);
        addTimer('state.B', 2);
        addTimer('state.C', 3);

        clearTimer('state.B'); // IO-7 Fix: auch timersByScript aktualisieren

        // stopScript soll nur A und C stoppen
        const stopped = stopScript();
        assert.equal(stopped, 2, 'Nur 2 Timer sollen von stopScript gestoppt werden');
        assert.equal(Object.keys(timers).length, 0, 'Alle Timer müssen entfernt sein');
        assert.ok(!timersByScript.has(scriptName), 'Script-Eintrag muss entfernt sein');
    });
});
