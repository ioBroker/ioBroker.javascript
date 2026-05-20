'use strict';
/**
 * Performance-Regressionstests für main.ts Optimierungen
 * Ausführen: mocha test/testMainPerformance.js --exit
 */

const expect = require('chai').expect;

// ──────────────────────────────────────────────────────────────
// Hilfsklassen um die betroffenen Methoden isoliert zu testen
// ──────────────────────────────────────────────────────────────

/**
 * Simuliert sortedInsert + stateIds-Lookup wie in main.ts
 */
class StateIdManager {
    constructor() {
        this.stateIds = [];
        this.stateIdSet = new Set();
    }

    sortedInsert(id) {
        let lo = 0;
        let hi = this.stateIds.length;
        while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            if (this.stateIds[mid] < id) lo = mid + 1;
            else hi = mid;
        }
        if (this.stateIds[lo] !== id) {
            this.stateIds.splice(lo, 0, id);
            this.stateIdSet.add(id);
        }
    }

    // BUG: O(n) indexOf – wird in onStateChange aufgerufen
    removeLinear(id) {
        const pos = this.stateIds.indexOf(id);
        if (pos !== -1) {
            this.stateIds.splice(pos, 1);
            this.stateIdSet.delete(id);
        }
    }

    // FIX: O(log n) binary search
    removeBinary(id) {
        let lo = 0;
        let hi = this.stateIds.length - 1;
        while (lo <= hi) {
            const mid = (lo + hi) >>> 1;
            if (this.stateIds[mid] === id) {
                this.stateIds.splice(mid, 1);
                this.stateIdSet.delete(id);
                return;
            } else if (this.stateIds[mid] < id) {
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }
    }
}

/**
 * Simuliert _enums als Array vs Set
 */
class EnumsArray {
    constructor() {
        this._enums = [];
    }
    add(id) {
        if (!this._enums.includes(id)) {
            this._enums.push(id);
            this._enums.sort();
        }
    }
    remove(id) {
        const pos = this._enums.indexOf(id);
        if (pos !== -1) this._enums.splice(pos, 1);
    }
    has(id) {
        return this._enums.includes(id);
    }
}

class EnumsSet {
    constructor() {
        this._enums = new Set();
    }
    add(id) {
        this._enums.add(id);
    }
    remove(id) {
        this._enums.delete(id);
    }
    has(id) {
        return this._enums.has(id);
    }
    toSorted() {
        return [...this._enums].sort();
    }
}

/**
 * Simuliert channels[chn]/devices[dev] als Array vs Set
 */
class ChannelArray {
    constructor() {
        this.channels = {};
    }
    add(chn, id) {
        if (!this.channels[chn]) this.channels[chn] = [];
        if (!this.channels[chn].includes(id)) this.channels[chn].push(id);
    }
    remove(chn, id) {
        if (this.channels[chn]) {
            const pos = this.channels[chn].indexOf(id);
            if (pos !== -1) this.channels[chn].splice(pos, 1);
        }
    }
    has(chn, id) {
        return this.channels[chn]?.includes(id) ?? false;
    }
}

class ChannelSet {
    constructor() {
        this.channels = {};
    }
    add(chn, id) {
        if (!this.channels[chn]) this.channels[chn] = new Set();
        this.channels[chn].add(id);
    }
    remove(chn, id) {
        this.channels[chn]?.delete(id);
    }
    has(chn, id) {
        return this.channels[chn]?.has(id) ?? false;
    }
    toArray(chn) {
        return this.channels[chn] ? [...this.channels[chn]] : [];
    }
}

// ──────────────────────────────────────────────────────────────
// TEST: Korrektheit
// ──────────────────────────────────────────────────────────────
describe('main.ts Performance Bug Tests', function () {

    // ──────────────── stateIds Binary Remove ────────────────
    describe('stateIds.remove – correctness', function () {
        function fill(mgr, count) {
            for (let i = 0; i < count; i++) mgr.sortedInsert(`adapter.0.state${String(i).padStart(6,'0')}`);
        }

        it('linear remove: should remove correct element', function () {
            const mgr = new StateIdManager();
            fill(mgr, 100);
            const target = 'adapter.0.state000050';
            mgr.removeLinear(target);
            expect(mgr.stateIds.includes(target)).to.be.false;
            expect(mgr.stateIdSet.has(target)).to.be.false;
            expect(mgr.stateIds.length).to.equal(99);
        });

        it('binary remove: should remove correct element', function () {
            const mgr = new StateIdManager();
            fill(mgr, 100);
            const target = 'adapter.0.state000050';
            mgr.removeBinary(target);
            expect(mgr.stateIds.includes(target)).to.be.false;
            expect(mgr.stateIdSet.has(target)).to.be.false;
            expect(mgr.stateIds.length).to.equal(99);
        });

        it('binary remove: should handle missing element gracefully', function () {
            const mgr = new StateIdManager();
            fill(mgr, 10);
            mgr.removeBinary('does.not.exist');
            expect(mgr.stateIds.length).to.equal(10);
        });

        it('binary remove: array stays sorted after remove', function () {
            const mgr = new StateIdManager();
            fill(mgr, 50);
            mgr.removeBinary('adapter.0.state000010');
            mgr.removeBinary('adapter.0.state000040');
            const sorted = [...mgr.stateIds].sort();
            expect(mgr.stateIds).to.deep.equal(sorted);
        });
    });

    // ──────────────── _enums Set vs Array ────────────────
    describe('_enums Set vs Array – correctness', function () {
        it('Array: has() returns true after add', function () {
            const e = new EnumsArray();
            e.add('enum.rooms.living');
            expect(e.has('enum.rooms.living')).to.be.true;
        });

        it('Set: has() returns true after add', function () {
            const e = new EnumsSet();
            e.add('enum.rooms.living');
            expect(e.has('enum.rooms.living')).to.be.true;
        });

        it('Array: no duplicate on double add', function () {
            const e = new EnumsArray();
            e.add('enum.rooms.living');
            e.add('enum.rooms.living');
            expect(e._enums.length).to.equal(1);
        });

        it('Set: no duplicate on double add', function () {
            const e = new EnumsSet();
            e.add('enum.rooms.living');
            e.add('enum.rooms.living');
            expect(e._enums.size).to.equal(1);
        });

        it('Array: has() returns false after remove', function () {
            const e = new EnumsArray();
            e.add('enum.rooms.living');
            e.remove('enum.rooms.living');
            expect(e.has('enum.rooms.living')).to.be.false;
        });

        it('Set: has() returns false after remove', function () {
            const e = new EnumsSet();
            e.add('enum.rooms.living');
            e.remove('enum.rooms.living');
            expect(e.has('enum.rooms.living')).to.be.false;
        });

        it('Set: toSorted() returns same order as Array', function () {
            const a = new EnumsArray();
            const s = new EnumsSet();
            const ids = ['enum.rooms.bath', 'enum.rooms.living', 'enum.functions.light'];
            ids.forEach(id => { a.add(id); s.add(id); });
            expect(s.toSorted()).to.deep.equal(a._enums);
        });
    });

    // ──────────────── channels/devices Set vs Array ────────────────
    describe('channels/devices Set vs Array – correctness', function () {
        it('Array: add and has', function () {
            const c = new ChannelArray();
            c.add('adapter.0.room1', 'adapter.0.room1.temp');
            expect(c.has('adapter.0.room1', 'adapter.0.room1.temp')).to.be.true;
        });

        it('Set: add and has', function () {
            const c = new ChannelSet();
            c.add('adapter.0.room1', 'adapter.0.room1.temp');
            expect(c.has('adapter.0.room1', 'adapter.0.room1.temp')).to.be.true;
        });

        it('Array: remove clears entry', function () {
            const c = new ChannelArray();
            c.add('adapter.0.room1', 'adapter.0.room1.temp');
            c.remove('adapter.0.room1', 'adapter.0.room1.temp');
            expect(c.has('adapter.0.room1', 'adapter.0.room1.temp')).to.be.false;
        });

        it('Set: remove clears entry', function () {
            const c = new ChannelSet();
            c.add('adapter.0.room1', 'adapter.0.room1.temp');
            c.remove('adapter.0.room1', 'adapter.0.room1.temp');
            expect(c.has('adapter.0.room1', 'adapter.0.room1.temp')).to.be.false;
        });

        it('Set: no duplicates', function () {
            const c = new ChannelSet();
            c.add('chn', 'id1');
            c.add('chn', 'id1');
            expect(c.channels['chn'].size).to.equal(1);
        });

        it('Array: has duplicate risk', function () {
            // Array does NOT prevent duplicates without guard – shows why Set is safer
            const c = { channels: {} };
            c.channels['chn'] = [];
            c.channels['chn'].push('id1');
            c.channels['chn'].push('id1'); // duplicate!
            expect(c.channels['chn'].length).to.equal(2); // proves the bug
        });
    });

    // ──────────────── Performance Benchmarks ────────────────
    describe('performance comparison', function () {
        const N = 50000;

        it(`stateIds.indexOf O(n) vs binary search O(log n) – ${N} states`, function () {
            this.timeout(60000);
            const ids = [];
            const set = new Set();
            for (let i = 0; i < N; i++) {
                const id = `adapter.0.state${String(i).padStart(8, '0')}`;
                ids.push(id);
                set.add(id);
            }
            ids.sort();

            const target = `adapter.0.state${String(N - 1).padStart(8, '0')}`;

            const t0 = process.hrtime.bigint();
            for (let r = 0; r < 1000; r++) ids.indexOf(target);
            const linearMs = Number(process.hrtime.bigint() - t0) / 1_000_000;

            // binary search
            function binarySearch(arr, val) {
                let lo = 0; let hi = arr.length - 1;
                while (lo <= hi) {
                    const mid = (lo + hi) >>> 1;
                    if (arr[mid] === val) return mid;
                    else if (arr[mid] < val) lo = mid + 1;
                    else hi = mid - 1;
                }
                return -1;
            }

            const t1 = process.hrtime.bigint();
            for (let r = 0; r < 1000; r++) binarySearch(ids, target);
            const binaryMs = Number(process.hrtime.bigint() - t1) / 1_000_000;

            console.log(`    indexOf: ${linearMs.toFixed(2)}ms | binary: ${binaryMs.toFixed(2)}ms | speedup: ${(linearMs / binaryMs).toFixed(1)}x`);
            expect(binaryMs).to.be.lessThan(linearMs);
        });

        it(`_enums Array.includes O(n) vs Set.has O(1) – ${N} enums`, function () {
            this.timeout(60000);
            const arr = [];
            const s = new Set();
            for (let i = 0; i < N; i++) {
                const id = `enum.rooms.room${i}`;
                arr.push(id);
                s.add(id);
            }
            arr.sort();

            const target = `enum.rooms.room${N - 1}`;

            const t0 = process.hrtime.bigint();
            for (let r = 0; r < 10000; r++) arr.includes(target);
            const arrMs = Number(process.hrtime.bigint() - t0) / 1_000_000;

            const t1 = process.hrtime.bigint();
            for (let r = 0; r < 10000; r++) s.has(target);
            const setMs = Number(process.hrtime.bigint() - t1) / 1_000_000;

            console.log(`    Array.includes: ${arrMs.toFixed(2)}ms | Set.has: ${setMs.toFixed(2)}ms | speedup: ${(arrMs / setMs).toFixed(1)}x`);
            expect(setMs).to.be.lessThan(arrMs);
        });

        it(`channels Array.indexOf vs Set.has – 10000 channel ids`, function () {
            const N_CH = 10000;
            const arr = [];
            const s = new Set();
            for (let i = 0; i < N_CH; i++) {
                const id = `adapter.0.channel0.state${i}`;
                arr.push(id);
                s.add(id);
            }

            const target = arr[N_CH - 1];

            const t0 = process.hrtime.bigint();
            for (let r = 0; r < 5000; r++) arr.indexOf(target);
            const arrMs = Number(process.hrtime.bigint() - t0) / 1_000_000;

            const t1 = process.hrtime.bigint();
            for (let r = 0; r < 5000; r++) s.has(target);
            const setMs = Number(process.hrtime.bigint() - t1) / 1_000_000;

            console.log(`    indexOf: ${arrMs.toFixed(2)}ms | Set.has: ${setMs.toFixed(2)}ms | speedup: ${(arrMs / setMs).toFixed(1)}x`);
            expect(setMs).to.be.lessThan(arrMs);
        });
    });
});
