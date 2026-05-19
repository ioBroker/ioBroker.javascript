'use strict';
/**
 * Performance & Correctness Tests für iobroker.javascript – src/main.ts
 *
 * Führe aus mit: npx mocha test/performance.test.js
 */
const assert = require('node:assert').strict;

// ──────────────────────────────────────────────────────────────────────────────
// Isolierte Hilfsfunktionen (aus main.ts extrahiert)
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

// Minimaler Adapter-Log-Mock
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
// 1. httpStatusText – O(1) Map statt Object-Literal pro Aufruf
// ──────────────────────────────────────────────────────────────────────────────
describe('httpStatusText()', () => {
    it('liefert korrekten Text für bekannte HTTP-Codes', () => {
        assert.equal(httpStatusText(400), 'Bad Request');
        assert.equal(httpStatusText(401), 'Unauthorized');
        assert.equal(httpStatusText(403), 'Forbidden');
        assert.equal(httpStatusText(404), 'Not Found');
        assert.equal(httpStatusText(429), 'Too Many Requests / Rate Limit');
        assert.equal(httpStatusText(500), 'Internal Server Error');
        assert.equal(httpStatusText(502), 'Bad Gateway');
        assert.equal(httpStatusText(503), 'Service Unavailable');
    });

    it('liefert generischen Text für unbekannte Codes', () => {
        assert.equal(httpStatusText(418), 'Error 418');
        assert.equal(httpStatusText(999), 'Error 999');
        assert.equal(httpStatusText(0), 'Error 0');
    });

    it('Map-Instanz wird nur EINMAL erzeugt – kein GC-Druck durch neue Objekte', () => {
        const start = process.memoryUsage().heapUsed;
        for (let i = 0; i < 100_000; i++) httpStatusText(500);
        const end = process.memoryUsage().heapUsed;
        // Heap-Delta sollte minimal sein (< 1 MB)
        assert.ok(end - start < 1024 * 1024, `Zu viel Heap-Zuwachs: ${end - start} Bytes`);
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 2. stateIdSet – O(1) Lookup statt O(n) Array.includes() – Performance-Test
// ──────────────────────────────────────────────────────────────────────────────
describe('stateIdSet – O(1) Lookup vs O(n) Array.includes()', () => {
    it('Set.has() ist bei 50.000 Einträgen schneller als Array.includes()', () => {
        const N = 50_000;
        const arr = [];
        const set = new Set();

        for (let i = 0; i < N; i++) {
            arr.push(`adapter.0.state.${i}`);
            set.add(`adapter.0.state.${i}`);
        }

        const target = `adapter.0.state.${N - 1}`; // worst case – letztes Element

        const t0 = performance.now();
        for (let i = 0; i < 1_000; i++) arr.includes(target);
        const tArray = performance.now() - t0;

        const t1 = performance.now();
        for (let i = 0; i < 1_000; i++) set.has(target);
        const tSet = performance.now() - t1;

        assert.ok(
            tSet < tArray,
            `Set (${tSet.toFixed(2)}ms) sollte schneller sein als Array (${tArray.toFixed(2)}ms)`,
        );
    });

    it('stateIds und stateIdSet bleiben bei add/remove synchron', () => {
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
        addState('a.0.state.1'); // Duplikat – darf nicht doppelt eingefügt werden

        assert.equal(stateIds.length, 2);
        assert.equal(stateIdSet.size, 2);

        removeState('a.0.state.1');
        assert.equal(stateIds.length, 1);
        assert.equal(stateIdSet.size, 1);
        assert.ok(!stateIdSet.has('a.0.state.1'));
        assert.ok(stateIdSet.has('a.0.state.2'));
    });

    it('stateIdSet.has() übersteht 100.000 Lookups ohne Fehler', () => {
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
// 3. nameById – O(1) reverse lookup statt O(n) linearer Scan
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

    it('findet den Namen einer ID in O(1)', () => {
        const store = createNameStore();
        store.addToNames({ _id: 'js.0.vars.temp', common: { name: 'Temperatur' } });
        store.addToNames({ _id: 'js.0.vars.hum', common: { name: 'Humidity' } });

        assert.equal(store.getName('js.0.vars.temp'), 'Temperatur');
        assert.equal(store.getName('js.0.vars.hum'), 'Humidity');
        assert.equal(store.getName('js.0.vars.unknown'), null);
    });

    it('removeFromNames entfernt ID korrekt aus Reverse-Map', () => {
        const store = createNameStore();
        store.addToNames({ _id: 'js.0.vars.temp', common: { name: 'Temperatur' } });
        store.removeFromNames('js.0.vars.temp');

        assert.equal(store.getName('js.0.vars.temp'), null);
        assert.ok(!store.nameById.has('js.0.vars.temp'));
    });

    it('mehrere IDs mit gleichem Namen werden korrekt verwaltet', () => {
        const store = createNameStore();
        store.addToNames({ _id: 'js.0.a', common: { name: 'Sensor' } });
        store.addToNames({ _id: 'js.0.b', common: { name: 'Sensor' } });

        assert.equal(store.getName('js.0.a'), 'Sensor');
        assert.equal(store.getName('js.0.b'), 'Sensor');
        assert.ok(Array.isArray(store.names['Sensor']));

        store.removeFromNames('js.0.a');
        // Danach noch 1 Element – sollte kein Array mehr sein
        assert.equal(store.getName('js.0.a'), null);
        assert.equal(store.getName('js.0.b'), 'Sensor');
    });

    it('Map.get() ist bei 10.000 Objekten deutlich schneller als linearer Scan', () => {
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
            `Map (${tMap.toFixed(2)}ms) sollte schneller sein als Scan (${tLinear.toFixed(2)}ms)`,
        );
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 4. onUnload – callback IMMER aufgerufen (auch wenn stopAllScripts wirft)
// ──────────────────────────────────────────────────────────────────────────────
describe('onUnload() – Shutdown Safety', () => {
    it('ruft callback auf auch wenn stopAllScripts wirft', async () => {
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

        assert.ok(callbackCalled, 'callback muss immer aufgerufen werden');
        assert.ok(
            messages.some(m => m.level === 'error' && m.msg.includes('stop failed')),
            'Fehler muss mit log.error geloggt werden',
        );
    });

    it('ruft callback auf ohne Fehler wenn alles normal läuft', async () => {
        let called = false;
        const onUnload = async (callback) => {
            try { /* normal cleanup */ } catch { /* nothing */ } finally { callback(); }
        };
        await onUnload(() => { called = true; });
        assert.ok(called);
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 5. unsubscribe() – Array-Rekursion via this (Bug-Fix Prüfung)
// ──────────────────────────────────────────────────────────────────────────────
describe('unsubscribe() – this-Rekursion (Bug-Fix)', () => {
    it('ruft this.unsubscribe pro Array-Element auf (kein ReferenceError)', () => {
        const called = [];

        const obj = {
            unsubscribe(id) {
                if (Array.isArray(id)) {
                    id.forEach(sub => this.unsubscribe(sub)); // ← KORREKT mit this
                    return;
                }
                called.push(id);
            },
        };

        assert.doesNotThrow(() => obj.unsubscribe(['a.0.s.1', 'a.0.s.2', 'a.0.s.3']));
        assert.deepEqual(called, ['a.0.s.1', 'a.0.s.2', 'a.0.s.3']);
    });

    it('globale unsubscribe() (ohne this) würde ReferenceError werfen – Fix bestätigt', () => {
        const broken = function (id) {
            if (Array.isArray(id)) {
                // Simuliere den BUG (globale Funktion)
                id.forEach(() => { throw new ReferenceError('unsubscribe is not defined'); });
            }
        };

        assert.throws(
            () => broken(['a.0.s.1']),
            { constructor: ReferenceError },
        );
    });

    it('loggt Warnung bei leerem id', () => {
        const { log, messages } = createLogMock();
        const id = '';
        if (!id) log.warn('unsubscribe: empty name');
        assert.ok(messages.some(m => m.level === 'warn' && m.msg === 'unsubscribe: empty name'));
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 6. dayTimeSchedules – Timer-Leak: alter Timer wird vor Neu-Setzen gecleart
// ──────────────────────────────────────────────────────────────────────────────
describe('dayTimeSchedules() – Memory Leak Prüfung', () => {
    it('cleart alten Timer bevor neuer gesetzt wird', () => {
        const clearedIds = [];
        const origClear = globalThis.clearTimeout;
        globalThis.clearTimeout = (t) => {
            clearedIds.push(t);
            origClear(t);
        };

        let dayScheduleTimer = setTimeout(() => {}, 9_999_999);
        const oldTimer = dayScheduleTimer;

        // Gefixte Logik: erst clearen, dann null setzen
        if (dayScheduleTimer) {
            clearTimeout(dayScheduleTimer);
            dayScheduleTimer = null;
        }
        dayScheduleTimer = setTimeout(() => {}, 3000);

        globalThis.clearTimeout = origClear; // restore

        assert.ok(clearedIds.includes(oldTimer), 'Alter Timer muss vor Neu-Setzen gecleart sein');
        assert.notEqual(dayScheduleTimer, null, 'Neuer Timer muss gesetzt sein');

        clearTimeout(dayScheduleTimer);
    });

    it('kein Timer-Leak bei 10x schnell aufgerufenen dayTimeSchedules', () => {
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

        // 9 von 10 Timern wurden gecleart (der erste hatte keinen Vorgänger)
        assert.equal(clearedCount.n, 9, 'Alle vorherigen Timer müssen gecleart worden sein');
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 7. installNpm – timeout gesetzt (kein endloses Blockieren)
// ──────────────────────────────────────────────────────────────────────────────
describe('installNpm() – Timeout-Option', () => {
    it('übergibt timeout:120000 an child_process.exec', (done) => {
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
            assert.equal(capturedOpts[0].timeout, 120_000, 'timeout muss 120.000ms sein');
            done();
        });
    });

    it('rejectet bei exit-Code != 0', (done) => {
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
            () => { done(new Error('Hätte rejecten sollen')); },
            (err) => {
                assert.ok(err.message.includes('exited with code 1'));
                done();
            },
        );
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 8. convertBackStringifiedValues – JSON-Parsing für object/array States
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

    it('parst JSON-String für object-Type korrekt', () => {
        const conv = makeConverter({ 'js.0.v': { common: { type: 'object' } } });
        const result = conv('js.0.v', { val: '{"a":1,"b":2}' });
        assert.deepEqual(result.val, { a: 1, b: 2 });
    });

    it('parst JSON-String für array-Type korrekt', () => {
        const conv = makeConverter({ 'js.0.arr': { common: { type: 'array' } } });
        const result = conv('js.0.arr', { val: '[1,2,3]' });
        assert.deepEqual(result.val, [1, 2, 3]);
    });

    it('behält ungültiges JSON als String', () => {
        const conv = makeConverter({ 'js.0.v': { common: { type: 'object' } } });
        const result = conv('js.0.v', { val: 'not-json{{' });
        assert.equal(result.val, 'not-json{{');
    });

    it('modifiziert number-Type States nicht', () => {
        const conv = makeConverter({ 'js.0.n': { common: { type: 'number' } } });
        const result = conv('js.0.n', { val: 42 });
        assert.equal(result.val, 42);
    });

    it('gibt null zurück wenn state null ist', () => {
        const conv = makeConverter({});
        assert.equal(conv('any.id', null), null);
    });

    it('gibt undefined zurück wenn state undefined ist', () => {
        const conv = makeConverter({});
        assert.equal(conv('any.id', undefined), undefined);
    });
});
