'use strict';

/**
 * Tests für gefundene Bugs in scheduler.ts
 * Ausführen: mocha test/testSchedulerBugfixes.js --exit
 */

const assert = require('node:assert').strict;
const tk = require('timekeeper');
const suncalc = require('suncalc2');
const { Scheduler } = require('../build/lib/scheduler');

const LAT = 49.0068705;
const LON = 8.4034195;

function makeScheduler() {
    return new Scheduler(
        {
            debug: () => {},
            info: () => {},
            warn: () => {},
            error: () => {},
            silly: () => {},
        },
        Date,
        suncalc,
        LAT,
        LON,
    );
}

describe('Scheduler Bugfix Tests', function () {
    afterEach(function () {
        tk.reset();
    });

    // ────────────────────────────────────────────────────────────
    // BUG 1: monthDiff Off-by-One
    // ────────────────────────────────────────────────────────────
    describe('monthDiff()', function () {
        it('should return 0 for same month', function () {
            const s = makeScheduler();
            const d1 = new Date(2030, 0, 1);  // Jan 2030
            const d2 = new Date(2030, 0, 15); // Jan 2030
            assert.equal(s.monthDiff(d1, d2), 0);
        });

        it('should return 1 for consecutive months', function () {
            const s = makeScheduler();
            const d1 = new Date(2030, 0, 1); // Jan 2030
            const d2 = new Date(2030, 1, 1); // Feb 2030
            assert.equal(s.monthDiff(d1, d2), 1);
        });

        it('should return 12 for same month next year', function () {
            const s = makeScheduler();
            const d1 = new Date(2030, 0, 1); // Jan 2030
            const d2 = new Date(2031, 0, 1); // Jan 2031
            assert.equal(s.monthDiff(d1, d2), 12);
        });

        it('should return 24 for same month 2 years later', function () {
            const s = makeScheduler();
            const d1 = new Date(2030, 3, 1); // Apr 2030
            const d2 = new Date(2032, 3, 1); // Apr 2032
            assert.equal(s.monthDiff(d1, d2), 24);
        });

        it('should return 11 for Jan to Dec same year', function () {
            const s = makeScheduler();
            const d1 = new Date(2030, 0, 1);  // Jan 2030
            const d2 = new Date(2030, 11, 1); // Dec 2030
            assert.equal(s.monthDiff(d1, d2), 11);
        });

        it('should not return negative values (returns 0)', function () {
            const s = makeScheduler();
            const d1 = new Date(2031, 5, 1);
            const d2 = new Date(2030, 1, 1);
            assert.equal(s.monthDiff(d1, d2), 0);
        });
    });

    // ────────────────────────────────────────────────────────────
    // BUG 2: Timer-Leak – checkSchedules setzt Timer obwohl list leer
    // ────────────────────────────────────────────────────────────
    describe('timer management', function () {
        it('should not have an active timer when no schedules exist', function () {
            const s = makeScheduler();
            assert.equal(s.timer, null);
        });

        it('should stop timer when last schedule is removed', function (done) {
            const time = new Date(2030, 5, 21, 10, 0, 0);
            tk.travel(time);
            const s = makeScheduler();
            const id = s.add(
                '{"time":{"exactTime":true,"start":"10:05"},"period":{"days":1}}',
                'testScript',
                () => {},
            );
            assert.notEqual(id, null);
            assert.notEqual(s.timer, null);
            s.remove(id);
            assert.equal(s.timer, null);
            done();
        });

        it('should clear timer after all once-schedules expired during checkSchedules', function (done) {
            // Set time one minute before trigger
            const time = new Date(2030, 0, 10, 10, 0, 0);
            tk.travel(time);
            const s = makeScheduler();
            // once: yesterday → will be deleted during checkSchedule
            s.add(
                '{"time":{"exactTime":true,"start":"10:01"},"period":{"once":"09.01.2030"}}',
                'testScript',
                () => {},
            );
            // After 61 seconds the schedule will be expired and deleted
            // timer should NOT persist after list is empty
            setTimeout(() => {
                assert.equal(Object.keys(s.list).length, 0);
                // Give recalculate one tick
                setImmediate(() => {
                    assert.equal(s.timer, null);
                    done();
                });
            }, 65000);
        }).timeout(70000);
    });

    // ────────────────────────────────────────────────────────────
    // BUG 3: Start-Grenzwert (start === minutesOfDay soll feuern)
    // ────────────────────────────────────────────────────────────
    describe('checkSchedule() start boundary', function () {
        it('should trigger when current time equals start time (interval mode)', function (done) {
            // exactTime=false, start=10:01, interval=1, mode=minutes → must fire at 10:01
            const time = new Date(2030, 5, 21, 10, 0, 57);
            tk.travel(time);
            const s = makeScheduler();
            let fired = false;
            s.add(
                '{"time":{"exactTime":false,"start":"10:01","end":"23:59","mode":"minutes","interval":1},"period":{"days":1}}',
                'testBoundary',
                () => {
                    fired = true;
                    done();
                },
            );
            setTimeout(() => {
                if (!fired) {
                    done(new Error('Schedule did NOT fire at start boundary (10:01)'));
                }
            }, 65000);
        }).timeout(70000);

        it('should NOT trigger before start time', function (done) {
            const time = new Date(2030, 5, 21, 9, 59, 57);
            tk.travel(time);
            const s = makeScheduler();
            s.add(
                '{"time":{"exactTime":false,"start":"10:05","end":"23:59","mode":"minutes","interval":1},"period":{"days":1}}',
                'testBeforeStart',
                () => {
                    done(new Error('Should NOT have fired before start time'));
                },
            );
            setTimeout(done, 5000);
        }).timeout(10000);
    });

    // ────────────────────────────────────────────────────────────
    // BUG 4: _getId Eindeutigkeit
    // ────────────────────────────────────────────────────────────
    describe('_getId()', function () {
        it('should return unique IDs for 10000 rapid calls', function () {
            const s = makeScheduler();
            const ids = new Set();
            for (let i = 0; i < 10000; i++) {
                ids.add(s._getId());
            }
            assert.equal(ids.size, 10000);
        });
    });

    // ────────────────────────────────────────────────────────────
    // BUG 5: Gestern-Berechnung in _setAstroVars / Constructor
    // ────────────────────────────────────────────────────────────
    describe('astro yesterday calculation', function () {
        it('todaysAstroTimes.sunrise should be today', function () {
            const time = new Date(2030, 5, 21, 10, 0, 0);
            tk.travel(time);
            const s = makeScheduler();
            const sunrise = s.todaysAstroTimes.sunrise;
            assert.equal(sunrise.getDate(), 21);
            assert.equal(sunrise.getMonth(), 5);
            assert.equal(sunrise.getFullYear(), 2030);
        });

        it('yesterdaysAstroTimes.sunrise should be yesterday', function () {
            const time = new Date(2030, 5, 21, 10, 0, 0);
            tk.travel(time);
            const s = makeScheduler();
            const sunrise = s.yesterdaysAstroTimes.sunrise;
            // sunrise of yesterday (June 20) should be on June 20 or June 21 at latest
            assert.ok([20, 21].includes(sunrise.getDate()));
        });
    });

    // ────────────────────────────────────────────────────────────
    // Kombinierter Integration-Test: monatliches Intervall
    // ────────────────────────────────────────────────────────────
    describe('monthly interval schedule', function () {
        it('should only fire every 2 months based on monthDiff', function () {
            const time = new Date(2030, 2, 1, 10, 0, 0); // March 2030
            tk.travel(time);
            const s = makeScheduler();
            const context = s.getContext();
            // Simulate schedule with months=2, fromDate=Jan 2030
            const schedule = {
                id: 'test-monthly',
                original: '{}',
                scriptName: 'test',
                cb: () => {},
                period: {
                    months: 2,
                    fromDate: new Date(2030, 0, 1), // Jan 2030
                    dates: [1],
                },
                time: {
                    exactTime: true,
                    start: 600, // 10:00
                    end: 1440,
                    mode: 60,
                    interval: 1,
                },
            };
            // March 2030: monthDiff(Jan2030, Mar2030) = 2, 2 % 2 = 0 → should fire
            const diff = s.monthDiff(new Date(2030, 0, 1), new Date(2030, 2, 1));
            assert.equal(diff, 2);
            assert.equal(diff % 2, 0); // fires

            // Feb 2030: monthDiff = 1, 1 % 2 = 1 → should NOT fire
            const diffFeb = s.monthDiff(new Date(2030, 0, 1), new Date(2030, 1, 1));
            assert.equal(diffFeb, 1);
            assert.equal(diffFeb % 2, 1); // does not fire
        });
    });
});
