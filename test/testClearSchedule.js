'use strict';

/**
 * Regression tests for https://github.com/ioBroker/ioBroker.javascript/issues/2164
 *
 * - clearSchedule() must clear cron schedules returned by getSchedules()
 * - clearSchedule() must clear wizard schedules returned by getSchedules()
 * - getSchedules() (without `allScripts`) must return only the schedules of the own script
 * - getSchedules(true) + clearSchedule() must clear the schedules of all scripts
 *
 * Run: mocha test/testClearSchedule.js --exit
 */

const assert = require('node:assert').strict;
const suncalc = require('suncalc2');
const nodeSchedule = require('node-schedule');
const { sandBox } = require('../build/lib/sandbox');
const { Scheduler } = require('../build/lib/scheduler');

const LAT = 49.0068705;
const LON = 8.4034195;

const silentLog = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    silly: () => {},
};

function makeScript(name) {
    return {
        script: {},
        onStopTimeout: 1000,
        onStopCb: null,
        intervals: new Set(),
        timeouts: new Set(),
        schedules: [],
        wizards: [],
        name,
        engineType: 'Javascript/js',
        _id: Math.floor(Math.random() * 0xffffffff),
        subscribes: {},
        subscribesFile: {},
        setStatePerMinuteCounter: 0,
        setStatePerMinuteProblemCounter: 0,
    };
}

function makeContext() {
    const context = {
        mods: { nodeSchedule, suncalc },
        objects: {},
        states: {},
        stateIds: [],
        errorLogFunction: silentLog,
        subscriptions: [],
        subscriptionsMap: new Map(),
        subscriptionsWildcard: [],
        subscriptionsFile: [],
        subscriptionsObject: [],
        subscriptionsObjectMap: new Map(),
        sendToInstanceCache: new Map(),
        subscribedPatterns: {},
        subscribedPatternsFile: {},
        adapterSubs: {},
        cacheObjectEnums: {},
        timers: {},
        timersByScript: new Map(),
        enums: new Set(),
        names: {},
        scripts: {},
        messageBusHandlers: {},
        logSubscriptions: {},
        tempDirectories: {},
        folderCreationVerifiedObjects: {},
        isEnums: false,
        channels: null,
        devices: null,
        logWithLineInfo: () => {},
        scheduler: new Scheduler(silentLog, Date, suncalc, LAT, LON),
        timerId: 0,
        rulesOpened: null,
        language: 'en',
        updateLogSubscriptions: () => {},
        convertBackStringifiedValues: (_id, state) => state,
        updateObjectContext: () => {},
        prepareStateObject: (id, state) => state,
        debugMode: false,
        getAbsoluteDefaultDataDir: () => __dirname,
        logError: () => {},
        allowSelfSignedCerts: false,
        secrets: {},
    };

    context.adapter = {
        namespace: 'javascript.0',
        instance: 0,
        log: silentLog,
        config: { maxTriggersPerScript: 100, latitude: LAT, longitude: LON, subscribe: false },
        setState: () => Promise.resolve(),
        getForeignState: () => Promise.resolve(null),
    };

    return context;
}

function addScript(context, name) {
    const script = makeScript(name);
    context.scripts[name] = script;
    const sandbox = sandBox(script, name, false, false, context);
    return { script, sandbox };
}

const WIZARD = '{"time":{"start":"00:00","end":"23:59","mode":"minutes","interval":1},"period":{"days":1}}';

describe('clearSchedule() / getSchedules()', function () {
    it('clears cron schedules returned by getSchedules()', function () {
        const context = makeContext();
        const { sandbox } = addScript(context, 'script.js.A');

        sandbox.schedule('*/2 * * * *', () => {});
        sandbox.schedule('*/3 * * * *', () => {});

        let list = sandbox.getSchedules();
        assert.equal(list.length, 2);

        list.forEach(s => assert.equal(sandbox.clearSchedule(s), true, 'clearSchedule() must return true'));

        list = sandbox.getSchedules();
        assert.deepEqual(list, [], 'all schedules must be gone');
        assert.equal(sandbox.__engine.__schedules, 0, 'schedule counter must be reset');
    });

    it('clears cron schedules by the object returned from schedule()', function () {
        const context = makeContext();
        const { sandbox } = addScript(context, 'script.js.A');

        const handle = sandbox.schedule('*/2 * * * *', () => {});
        assert.equal(sandbox.clearSchedule(handle), true);
        assert.deepEqual(sandbox.getSchedules(), []);
    });

    it('clears wizard schedules returned by getSchedules()', function () {
        const context = makeContext();
        const { script, sandbox } = addScript(context, 'script.js.A');

        sandbox.schedule(WIZARD, () => {});

        const list = sandbox.getSchedules();
        assert.equal(list.length, 1);
        assert.equal(list[0].type, 'schedule');

        assert.equal(sandbox.clearSchedule(list[0]), true);
        assert.deepEqual(sandbox.getSchedules(), [], 'wizard schedule must be gone');
        assert.deepEqual(script.wizards, [], 'wizard ID must be removed from the script');
        assert.equal(sandbox.__engine.__schedules, 0, 'schedule counter must be reset');
    });

    it('clears a wizard schedule by the ID returned from schedule()', function () {
        const context = makeContext();
        const { script, sandbox } = addScript(context, 'script.js.A');

        const id = sandbox.schedule(WIZARD, () => {});
        assert.equal(typeof id, 'string');
        assert.equal(sandbox.clearSchedule(id), true);
        assert.deepEqual(sandbox.getSchedules(), []);
        assert.deepEqual(script.wizards, []);
    });

    it('getSchedules() returns only the schedules of the own script', function () {
        const context = makeContext();
        const a = addScript(context, 'script.js.A');
        const b = addScript(context, 'script.js.B');

        a.sandbox.schedule('*/2 * * * *', () => {});
        a.sandbox.schedule(WIZARD, () => {});
        b.sandbox.schedule('*/5 * * * *', () => {});
        b.sandbox.schedule(WIZARD, () => {});

        const listA = a.sandbox.getSchedules();
        assert.equal(listA.length, 2, 'only the 2 schedules of script A');
        listA.forEach(s => assert.equal(s.scriptName, 'script.js.A'));

        const listAll = a.sandbox.getSchedules(true);
        assert.equal(listAll.length, 4, 'all 4 schedules of both scripts');
    });

    it('getSchedules(true) + clearSchedule() clears the schedules of all scripts', function () {
        const context = makeContext();
        const a = addScript(context, 'script.js.A');
        const b = addScript(context, 'script.js.B');

        a.sandbox.schedule('*/2 * * * *', () => {});
        b.sandbox.schedule('*/5 * * * *', () => {});
        b.sandbox.schedule(WIZARD, () => {});

        const list = a.sandbox.getSchedules(true);
        assert.equal(list.length, 3);
        list.forEach(s => assert.equal(a.sandbox.clearSchedule(s), true, `could not clear ${JSON.stringify(s)}`));

        assert.deepEqual(a.sandbox.getSchedules(true), [], 'no schedule may be left over');
        assert.deepEqual(b.script.schedules, [], 'cron schedules of script B must be removed');
        assert.deepEqual(b.script.wizards, [], 'wizard schedules of script B must be removed');
    });

    it('returns false for unknown handles', function () {
        const context = makeContext();
        const { sandbox } = addScript(context, 'script.js.A');

        assert.equal(sandbox.clearSchedule('does_not_exist'), false);
        assert.equal(sandbox.clearSchedule({ type: 'cron', id: 'cron_1_1' }), false);
    });
});
