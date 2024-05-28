const expect = require('chai').expect;
const { log } = require('node:console');
const setup  = require('./lib/setup');

let objects  = null;
let states   = null;

const stateChangedHandlers = new Set();
function onStateChanged(id, state) {
    stateChangedHandlers.forEach(handler => handler(id, state));
}
/**
 * Adds a state change handler for tests
 * @param {(id: string, state: any) => void} handler The handler callback for the state change
 */
function addStateChangedHandler(handler) {
    stateChangedHandlers.add(handler);
}
/**
 * Removes a state change handler from the list
 * @param {(id: string, state: any) => void} handler The handler callback to be removed
 */
function removeStateChangedHandler(handler) {
    stateChangedHandlers.delete(handler);
}
const objectChangedHandlers = new Set();
function onObjectChanged(id, obj) {
    objectChangedHandlers.forEach(handler => handler(id, obj));
}
/**
 * Adds an object change handler for tests
 * @param {(id: string, obj: any) => void} handler The handler callback for the state change
 */
function addObjectChangedHandler(handler) {
    objectChangedHandlers.add(handler);
}
/**
 * Removes an object change handler from the list
 * @param {(id: string, obj: any) => void} handler The handler callback to be removed
 */
function removeObjectChangedHandler(handler) {
    objectChangedHandlers.delete(handler);
}

function checkConnectionOfAdapter(cb, counter) {
    counter = counter || 0;
    if (counter > 20) {
        cb && cb('Cannot check connection');
        return;
    }

    states.getState('system.adapter.javascript.0.alive', (err, state) => {
        if (err) console.error(err);
        if (state && state.val) {
            cb && cb(null);
        } else {
            setTimeout(function () {
                checkConnectionOfAdapter(cb, counter + 1);
            }, 1000);
        }
    });
}

function checkValueOfState(id, value, cb, counter) {
    counter = counter || 0;
    if (counter > 20) {
        cb && cb(`Cannot check value of state ${id}`);
        return;
    }

    states.getState(id, (err, state) => {
        if (err) console.error(err);
        if (value === null && !state) {
            cb && cb(null);
        } else if (state && (value === undefined || state.val === value)) {
            cb && cb(null);
        } else {
            setTimeout(function () {
                checkValueOfState(id, value, cb, counter + 1);
            }, 500);
        }
    });
}

describe.only('Test JS', function () {
    before('Test JS: Start js-controller', function (_done) {
        this.timeout(600000); // because of first install from npm

        setup.setupController(async function () {
            const config = await setup.getAdapterConfig();
            // enable adapter
            config.common.enabled  = true;
            config.common.loglevel = 'debug';

            config.native.longitude = 43.273709;
            config.native.latitude  = 6.5798918;

            await setup.setAdapterConfig(config.common, config.native);

            setup.startController(
                false,
                (id, obj) => onObjectChanged && onObjectChanged(id, obj),
                (id, state) => onStateChanged && onStateChanged(id, state),
                (_objects, _states) => {
                    objects = _objects;
                    states  = _states;
                    states.subscribe('*');

                    const script = {
                        _id:                'script.js.global.test_globalSetTestState',
                        type:               'script',
                        common: {
                            name:           'global function globalSetTestState',
                            enabled:        true,
                            verbose:        true,
                            engine:         'system.adapter.javascript.0',
                            engineType:     'Javascript/js',
                            source:         `function globalSetTestState(val) {\n` +
                                            `    createState('test_global_setTestState', () => {\n` +
                                            `        setState('test_global_setTestState', val);\n` +
                                            `    });\n` +
                                            `}`,
                        },
                        native: {}
                    };
                    objects.setObject(script._id, script, err => {
                        expect(err).to.be.null;
                        setup.startAdapter(objects, states, () => _done());
                    });
                }
            );
        });
    });

    it('Test JS: Check if adapter started', function (done) {
        this.timeout(30000);
        checkConnectionOfAdapter((err) => {
            expect(err).to.be.null;
            done();
        });
    });

    it('Test JS: test compareTime between', function (done) {
        this.timeout(10000);
        // add script
        const script = {
            _id:                'script.js.test_compareTime',
            type:               'script',
            common: {
                name:           'compareTime',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `createState('testCompareTime', -1, () => {\n` +
                                `    let count = 0;\n` +
                                `    count += compareTime('23:00', '01:00', 'between', '22:30') ? 0 : 1;\n` +
                                `    count += compareTime('23:00', '01:00', 'between', '02:30') ? 0 : 1;\n` +
                                `    count += compareTime('10:00', '20:00', 'between', '15:00') ? 1 : 0;\n` +
                                `    count += compareTime('10:00', '20:00', 'between', '9:00') ? 0 : 1;\n` +
                                `    count += compareTime('10:00', null, '<', '9:00') ? 1 : 0;\n` +
                                `    const date1 = new Date();\n` +
                                `    date1.setHours(10);\n` +
                                `    date1.setMinutes(0);\n` +
                                `    count += compareTime(date1, null, '<', '9:00') ? 1 : 0;\n` +
                                `    count += compareTime(date1, '20:00', 'between', '15:00') ? 1 : 0;\n` +
                                `    count += compareTime('5:00', date1, 'between', '8:00') ? 1 : 0;\n` +
                                `    const date2 = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);\n` +
                                `    date2.setHours(2);\n` +
                                `    date2.setMinutes(30);\n` +
                                `    count += compareTime('23:00', '01:00', 'between', date2) ? 0 : 1;\n` +
                                `    setState('testCompareTime', count, true);\n` +
                                `});`,
            },
            native: {}
        };
        const onStateChanged = function (id, state) {
            if (id === 'javascript.0.testCompareTime') {
                if (state.val === 9) {
                    removeStateChangedHandler(onStateChanged);
                    states.getState('javascript.0.testCompareTime', (err, state) => {
                        expect(err).to.be.null;
                        expect(state.val).to.be.equal(9);
                        done();
                    });
                }
                else {
                    console.log(`State testCompareTime.val = ${state.val}`);
                }
            }
        };
        addStateChangedHandler(onStateChanged);

        objects.setObject(script._id, script, err => {
            expect(err).to.be.null;
        });
    });

    it('Test JS: test httpGet error', function (done) {
        this.timeout(10000);
        // add script
        const script = {
            _id:                'script.js.test_httpGet_error',
            type:               'script',
            common: {
                name:           'test httpGet error',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `createState('test_httpget_error', () => {\n` +
                                `    httpGet('http://google1456.com', (error, response) => {\n` +
                                `        if (error) {\n` +
                                `            console.error(error);\n` +
                                `            setState('test_httpget_error', true, true);\n` +
                                `        }\n` +
                                `   });\n` +
                                `});`,
            },
            native: {},
        };
        const onStateChanged = function (id, state) {
            if (id === 'javascript.0.test_httpget_error' && state.val === true) {
                removeStateChangedHandler(onStateChanged);
                done();
            }
        };
        addStateChangedHandler(onStateChanged);

        objects.setObject(script._id, script, err => {
            expect(err).to.be.null;
        });
    });

    it('Test JS: test creation of state', function (done) {
        this.timeout(3000);
        // add script
        const script = {
            _id:                'script.js.test_creation_of_state',
            type:               'script',
            common: {
                name:           'test creation of state',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `createState('test_creation_of_state', 5);`,
            },
            native: {},
        };
        const onStateChanged = function (id, state) {
            if (id === 'javascript.0.test_creation_of_state' && state.val === 5) {
                removeStateChangedHandler(onStateChanged);
                states.getState('javascript.0.test_creation_of_state', (err, state) => {
                    expect(err).to.be.null;
                    expect(state.val).to.be.equal(5);
                    objects.getObject('javascript.0.test_creation_of_state', (err, obj) => {
                        expect(err).to.be.null;
                        expect(obj).to.be.ok;

                        done();
                    });
                });
            }
        };
        addStateChangedHandler(onStateChanged);
        objects.setObject(script._id, script, err => {
            expect(err).to.be.null;
        });
    });

    it('Test JS: test creation of state for other instance', function (done) {
        this.timeout(3000);
        // add script
        const script = {
            _id:                'script.js.test_creation_of_foreign_state',
            type:               'script',
            common: {
                name:           'test creation of foreign state',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `createState('javascript.1.test_creation_of_foreign_state', 6);`,
            },
            native: {},
        };
        const onStateChanged = function (id, state) {
            if (id === 'javascript.1.test_creation_of_foreign_state' && state.val === 6) {
                removeStateChangedHandler(onStateChanged);
                states.getState('javascript.1.test_creation_of_foreign_state', (err, state) => {
                    expect(err).to.be.null;
                    expect(state).to.be.ok;
                    expect(state.val).to.be.equal(6);
                    objects.getObject('javascript.1.test_creation_of_foreign_state', (err, obj) => {
                        expect(err).to.be.null;
                        expect(obj).to.be.ok;
                        done();
                    });
                });
            }
        };
        addStateChangedHandler(onStateChanged);
        objects.setObject(script._id, script, err => {
            expect(err).to.be.null;
        });
    });

    it('Test JS: test deletion of state', function (done) {
        this.timeout(3000);
        // add script
        const script = {
            _id:                'script.js.test_deletion_of_state',
            type:               'script',
            common: {
                name:           'test deletion of state',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `deleteState('test_creation_of_state');`,
            },
            native: {}
        };

        objects.getObject('javascript.0.test_creation_of_state', (err, obj) => {
            expect(err).to.be.null;
            expect(obj).to.be.ok;
            states.getState('javascript.0.test_creation_of_state', (err, state) => {
                expect(err).to.be.null;
                expect(state).to.be.ok;
                expect(state.val).to.be.equal(5);

                const onStateChanged = function (id, state) {
                    if (id === 'javascript.0.test_creation_of_state' && state === null) {
                        removeStateChangedHandler(onStateChanged);

                        states.getState('javascript.0.test_creation_of_state', (err, state) => {
                            expect(err).to.be.null;
                            expect(state).to.be.not.ok;

                            objects.getObject('javascript.0.test_creation_of_state', (err, obj) => {
                                expect(err).to.be.undefined;
                                expect(obj).to.be.not.ok;
                                done();
                            });
                        });
                    }
                };
                addStateChangedHandler(onStateChanged);

                objects.setObject(script._id, script, err => {
                    expect(err).to.be.null;
                });
            });
        });
    });

    it('Test JS: test deletion of foreign state', function (done) {
        this.timeout(3000);
        // add script
        const script = {
            _id:                'script.js.test_deletion_of_foreign_state',
            type:               'script',
            common: {
                name:           'test deletion of foreign state',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `deleteState('javascript.1.test_creation_of_foreign_state');`,
            },
            native: {}
        };

        objects.getObject('javascript.1.test_creation_of_foreign_state', (err, obj) => {
            expect(err).to.be.null;
            expect(obj).to.be.ok;
            states.getState('javascript.1.test_creation_of_foreign_state', (err, state) => {
                expect(err).to.be.null;
                expect(state).to.be.ok;
                expect(state.val).to.be.equal(6);

                // we cannot delete foreign object, even if we created it.
                setTimeout(function () {
                    objects.getObject('javascript.1.test_creation_of_foreign_state', (err, obj) => {
                        expect(err).to.be.null;
                        expect(obj).to.be.ok;
                        states.getState('javascript.1.test_creation_of_foreign_state', (err, state) => {
                            expect(err).to.be.null;
                            expect(state).to.be.ok;
                            expect(state.val).to.be.equal(6);
                            done();
                        });
                    });
                }, 400);

                objects.setObject(script._id, script, err => {
                    expect(err).to.be.null;
                });
            });
        });
    });

    it('Test JS: test createState', function (done) {
        this.timeout(5000);
        // add script
        const script = {
            _id:                'script.js.test_createState',
            type:               'script',
            common: {
                name:           'test createState',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `await createStateAsync('test_createState_init', 100);\n` +
                                `await createStateAsync('test_createState_common', { name: 'common', desc: 'test', type: 'array' });\n` +
                                `await createStateAsync('test_createState_initCommon', 101, { name: 'initCommon', desc: 'test', type: 'number' });\n` +
                                `await createStateAsync('test_createState_commonNative', { name: 'commonNative', desc: 'test', type: 'object' }, { customProperty: true });\n` +
                                `await createStateAsync('test_createState_initCommonNative', 102, { name: 'initCommonNative', desc: 'test', type: 'number' }, { customProperty: true });\n` +
                                `await createStateAsync('test_createState_initForce', true, true);\n` +
                                `await createStateAsync('test_createState_initForceCommon', false, true, { name: 'initFoceCommon', desc: 'test', type: 'boolean' });\n` +
                                `await createStateAsync('test_createState_initForceCommonNative', false, true, { name: 'initForceCommonNative', desc: 'test', type: 'boolean' }, { customProperty: true });\n`,
            },
            native: {},
        };
        objects.setObject(script._id, script, err => {
            expect(err).to.be.null;
            setTimeout(function () {
                objects.getObject('javascript.0.test_createState_init', (err, obj) => {
                    expect(err).to.be.null;
                    expect(obj.common.name).to.be.equal('test_createState_init'); // = id
                    expect(obj.common.type).to.be.equal('mixed');
                    expect(obj.native).to.not.have.any.keys('name', 'desc', 'type', 'role');

                    objects.getObject('javascript.0.test_createState_common', (err, obj) => {
                        expect(err).to.be.null;
                        expect(obj.common.name).to.be.equal('common');
                        expect(obj.common.desc).to.be.equal('test');
                        expect(obj.common.type).to.be.equal('array');
                        expect(obj.native).to.not.have.any.keys('name', 'desc', 'type', 'role');

                        objects.getObject('javascript.0.test_createState_initCommon', (err, obj) => {
                            expect(err).to.be.null;
                            expect(obj.common.name).to.be.equal('initCommon');
                            expect(obj.common.desc).to.be.equal('test');
                            expect(obj.common.type).to.be.equal('number');
                            expect(obj.native).to.not.have.any.keys('name', 'desc', 'type', 'role');

                            objects.getObject('javascript.0.test_createState_commonNative', (err, obj) => {
                                expect(err).to.be.null;
                                expect(obj.common.name).to.be.equal('commonNative');
                                expect(obj.common.desc).to.be.equal('test');
                                expect(obj.common.type).to.be.equal('object');
                                expect(obj.native).to.not.have.any.keys('name', 'desc', 'type', 'role');
                                expect(obj.native).to.have.all.keys('customProperty');

                                objects.getObject('javascript.0.test_createState_initCommonNative', (err, obj) => {
                                    expect(err).to.be.null;
                                    expect(obj.common.name).to.be.equal('initCommonNative');
                                    expect(obj.common.desc).to.be.equal('test');
                                    expect(obj.common.type).to.be.equal('number');
                                    expect(obj.native).to.not.have.any.keys('name', 'desc', 'type', 'role');
                                    expect(obj.native).to.have.all.keys('customProperty');

                                    objects.getObject('javascript.0.test_createState_initForce', (err, obj) => {
                                        expect(err).to.be.null;
                                        expect(obj.common.name).to.be.equal('test_createState_initForce'); // = id
                                        expect(obj.common.type).to.be.equal('mixed');
                                        expect(obj.native).to.not.have.any.keys('name', 'desc', 'type', 'role');

                                        objects.getObject('javascript.0.test_createState_initForceCommon', (err, obj) => {
                                            expect(err).to.be.null;
                                            expect(obj.common.name).to.be.equal('initFoceCommon');
                                            expect(obj.common.desc).to.be.equal('test');
                                            expect(obj.common.type).to.be.equal('boolean');
                                            expect(obj.native).to.not.have.any.keys('name', 'desc', 'type', 'role');

                                            objects.getObject('javascript.0.test_createState_initForceCommonNative', (err, obj) => {
                                                expect(err).to.be.null;
                                                expect(obj.common.name).to.be.equal('initForceCommonNative');
                                                expect(obj.common.desc).to.be.equal('test');
                                                expect(obj.common.type).to.be.equal('boolean');
                                                expect(obj.native).to.not.have.any.keys('name', 'desc', 'type', 'role');
                                                expect(obj.native).to.have.all.keys('customProperty');

                                                done();
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            }, 1000);
        });
    });

    it('Test JS: read objects.json file must not work', function (done) {
        this.timeout(20000);
        // add script
        const script = {
            _id:                'script.js.test_read_objects_db',
            type:               'script',
            common: {
                name:           'test read objects db',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `const fs = require('node:fs');\n` +
                                `try{\n` +
                                `    fs.readFileSync('${__dirname}/../tmp/${setup.appName}-data/objects.json');\n` +
                                `} catch (err) {\n` +
                                `    createState('test_read_objects_db', err.toString());\n` +
                                `}`,
            },
            native: {}
        };

        const onStateChanged = function (id, state) {
            if (id === 'javascript.0.test_read_objects_db' && state.val === 'Error: Permission denied') {
                removeStateChangedHandler(onStateChanged);
                done();
            }
        };
        addStateChangedHandler(onStateChanged);

        objects.setObject(script._id, script, err => {
            expect(err).to.be.null;
        });
    });

    it('Test JS: write objects.json file must not work', function (done) {
        this.timeout(3000);
        // add script
        const script = {
            _id:                'script.js.test_write_objects_db',
            type:               'script',
            common: {
                name:           'test write objects db',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `const fs = require('node:fs');\n` +
                                `try{\n` +
                                `    fs.writeFileSync('${__dirname}/../tmp/${setup.appName}-data/objects.json');\n` +
                                `} catch (err) {\n` +
                                `    createState('test_write_objects_db', err.toString());\n` +
                                `}`,
            },
            native: {}
        };
        const onStateChanged = function (id, state) {
            if (id === 'javascript.0.test_write_objects_db' && state.val === 'Error: Permission denied') {
                removeStateChangedHandler(onStateChanged);
                done();
            }
        };
        addStateChangedHandler(onStateChanged);
        objects.setObject(script._id, script, err => {
            expect(err).to.be.null;
        });
    });

    it('Test JS: write directly into iobroker-data/files must not work', function (done) {
        this.timeout(3000);
        // add script
        const script = {
            _id:                'script.js.test_nodefs_write',
            type:               'script',
            common: {
                name:           'test node:fs write to files',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `const fs = require('node:fs');\n` +
                                `try{\n` +
                                `    const filesPath = defaultDataDir + '/files/0_userdata.0/nodejswrite.txt';\n` +
                                `    log('Writing file to path: ' + filesPath);\n` +
                                `    fs.appendFile(filesPath, 'this is not allowed!');\n` +
                                `} catch (err) {\n` +
                                `    createState('test_nodefs_write', err.toString());\n` +
                                `}`,
            },
            native: {}
        };
        const onStateChanged = function (id, state) {
            if (id === 'javascript.0.test_nodefs_write' && state.val === 'Error: Permission denied') {
                removeStateChangedHandler(onStateChanged);
                done();
            }
        };
        addStateChangedHandler(onStateChanged);
        objects.setObject(script._id, script, err => {
            expect(err).to.be.null;
        });
    });

    it('Test JS: read directly from iobroker-data/files must work', function (done) {
        this.timeout(3000);
        // add script
        const script = {
            _id:                'script.js.test_nodefs_read',
            type:               'script',
            common: {
                name:           'test node:fs read from files',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `const fs = require('node:fs');\n` +
                                `createState('test_nodefs_read', 'no', () => {\n` +
                                `    writeFile('0_userdata.0', 'nodejsread.txt', 'is allowed', (err) => {\n` +
                                `        if (!err) {\n` +
                                `            const filesPath = defaultDataDir + '/files/0_userdata.0/nodejsread.txt';\n` +
                                `            log('Read file from path: ' + filesPath);\n` +
                                `            const data = fs.readFileSync(filesPath);\n` +
                                `            setState('test_nodefs_read', { val: data.toString(), ack: true });\n` +
                                `        }\n` +
                                `    });\n` +
                                `});`,
            },
            native: {}
        };
        const onStateChanged = function (id, state) {
            if (id === 'javascript.0.test_nodefs_read' && state.val === 'is allowed') {
                removeStateChangedHandler(onStateChanged);
                done();
            }
        };
        addStateChangedHandler(onStateChanged);
        objects.setObject(script._id, script, err => {
            expect(err).to.be.null;
        });
    });

    it('Test JS: write objects.json not in data directory must work', function (done) {
        this.timeout(3000);
        const time = new Date().toString();
        const fs = require('node:fs');

        if (fs.existsSync(__dirname + '/../tmp/objects.json')) fs.unlinkSync(__dirname + '/../tmp/objects.json');

        // add script
        const script = {
            _id:                'script.js.test_open_objects_other_path',
            type:               'script',
            common: {
                name:           'test open objects other path',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `const fs = require('node:fs');\n` +
                                `try{\n` +
                                `    fs.writeFileSync('${__dirname.replace(/\\/g, '/')}/../tmp/objects.json', '${time}');\n` +
                                `} catch (err) {\n` +
                                `    createState('test_open_objects_other_path', err.toString());\n` +
                                `}`,
            },
            native: {}
        };

        objects.setObject(script._id, script, err => {
            expect(err).to.be.null;
            setTimeout(function () {
                if (!fs.existsSync(__dirname + '/../tmp/objects.json')) {
                    setTimeout(function () {
                        expect(fs.readFileSync(__dirname + '/../tmp/objects.json').toString()).to.be.equal(time);
                        fs.unlinkSync(__dirname + '/../tmp/objects.json');
                        done();
                    }, 500);
                } else {
                    expect(fs.readFileSync(__dirname + '/../tmp/objects.json').toString()).to.be.equal(time);
                    fs.unlinkSync(__dirname + '/../tmp/objects.json');
                    done();
                }
            }, 500);
        });
    });

    it('Test JS: test createTempFile', function (done) {
        this.timeout(6000);
        const os = require('node:os');
        const fs = require('node:fs');

        // add script
        const script = {
            _id:                'script.js.test_createTempFile',
            type:               'script',
            common: {
                name:           'test createTempFile',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `createState('test_createTempFile', { type: 'string', read: true, write: false }, async () => {\n` +
                                `    const filePath = createTempFile('subdir/test.txt', 'CONTENT_OK');\n` +
                                `    await setStateAsync('test_createTempFile', { val: filePath, ack: true });\n` +
                                `});`,
            },
            native: {}
        };
        const onStateChanged = function (id, state) {
            if (id === 'javascript.0.test_createTempFile' && state.val !== '-') {
                const tempFilePath = state.val;

                expect(tempFilePath).to.be.a('string');
                expect(tempFilePath.startsWith(os.tmpdir())).to.be.true;
                expect(fs.existsSync(tempFilePath)).to.be.true;

                // Check content
                const fileContent = fs.readFileSync(tempFilePath).toString();
                expect(fileContent).to.be.equal('CONTENT_OK');

                removeStateChangedHandler(onStateChanged);
                done();
            }
        };
        addStateChangedHandler(onStateChanged);
        objects.setObject(script._id, script, err => {
            expect(err).to.be.null;
        });
    });

    it('Test JS: test getAstroDate', function (done) {
        this.timeout(6000);
        const types = [
            'sunrise',
            'sunriseEnd',
            'goldenHourEnd',
            'solarNoon',
            'goldenHour',
            'sunsetStart',
            'sunset',
            'dusk',
            'nauticalDusk',
            'night',
            'nightEnd',
            'nauticalDawn',
            'dawn',
            'nadir'
        ];
        // add script
        const script = {
            _id:                'script.js.test_getAstroDate',
            type:               'script',
            common: {
                name:           'test getAstroDate',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         '',
            },
            native: {}
        };
        for (let t = 0; t < types.length; t++) {
            script.common.source += `createState('test_getAstroDate_${types[t]}', getAstroDate('${types[t]}') ? getAstroDate('${types[t]}').toString() : '');\n`;
        }

        const typesChanged = {};
        const onStateChanged = function (id, state) {
            if (types.includes(id.substring('javascript.0.test_getAstroDate_'.length))) {
                typesChanged[id] = true;
                console.log('State change ' + id + ' / ' + Object.keys(typesChanged).length + '-' + types.length + ' = ' + JSON.stringify(state));
                if (Object.keys(typesChanged).length === types.length) {
                    removeStateChangedHandler(onStateChanged);

                    let count = types.length;
                    for (let t = 0; t < types.length; t++) {
                        states.getState(`javascript.0.test_getAstroDate_${types[t]}`, (err, state) => {
                            expect(err).to.be.null;
                            expect(state).to.be.ok;
                            expect(state.val).to.be.ok;

                            if (state) console.log(types[types.length - count] + ': ' + state.val);
                            else console.log(types[types.length - count] + ' ERROR: ' + state);
                            if (!--count) done();
                        });
                    }
                }
            }
        };
        addStateChangedHandler(onStateChanged);

        objects.setObject(script._id, script, err => {
            expect(err).to.be.null;
        });
    });

    it('Test JS: test setStateDelayed simple', function (done) {
        this.timeout(5000);
        // add script
        const script = {
            _id:                'script.js.test_setStateDelayed_simple',
            type:               'script',
            common: {
                name:           'test setStateDelayed simple',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `createState('test_setStateDelayed_simple', 4, () => {\n` +
                                `    setStateDelayed('test_setStateDelayed_simple', 5, 1000);\n` +
                                `});`,
            },
            native: {}
        };

        let start = 0;
        const onStateChanged = function (id, state){
            if (id !== 'javascript.0.test_setStateDelayed_simple' || !state.val) return;
            if (state.val === 4) {
                start = state.ts;
            } else if (state.val === 5) {
                expect(start).to.be.not.equal(0);
                expect(state.ts - start).to.be.least(950);

                removeStateChangedHandler(onStateChanged);
                setTimeout(done, 100);
            }
        };
        addStateChangedHandler(onStateChanged);
        objects.setObject(script._id, script);
    });

    it('Test JS: test setStateDelayed nested', function (done) {
        this.timeout(5000);
        // add script
        const script = {
            _id:                'script.js.test_setStateDelayed_nested',
            type:               'script',
            common: {
                name:           'test setStateDelayed nested',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `createState('test_setStateDelayed_nested', { type: 'number', read: true, write: false }, () => {\n` +
                                `    setStateDelayed('test_setStateDelayed_nested', 6, 500);\n` +
                                `    setStateDelayed('test_setStateDelayed_nested', 7, 1500, false);` +
                                `});`,
            },
            native: {}
        };

        let start = 0;
        const onStateChanged = function (id, state) {
            if (id !== 'javascript.0.test_setStateDelayed_nested' || !state.val) return;
            if (state.val === 6) {
                start = state.ts;
            } else if (state.val === 7) {
                expect(start).to.be.not.equal(0);
                expect(state.ts - start).to.be.least(900);

                removeStateChangedHandler(onStateChanged);
                setTimeout(done, 100);
            }
        };
        addStateChangedHandler(onStateChanged);
        objects.setObject(script._id, script);
    });

    it('Test JS: test setStateDelayed overwrite', function (done) {
        this.timeout(5000);
        // add script
        const script = {
            _id:                'script.js.test_setStateDelayed_overwrite',
            type:               'script',
            common: {
                name:           'test setStateDelayed overwrite',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `createState('test_setStateDelayed_overwrite', { type: 'number', read: true, write: false }, () => {\n` +
                                `    setStateDelayed('test_setStateDelayed_overwrite', 8, 500);\n` +
                                `    setStateDelayed('test_setStateDelayed_overwrite', 9, 1500);` +
                                `});`,
            },
            native: {}
        };

        objects.setObject(script._id, script, err => {
            expect(err).to.be.null;
            checkValueOfState('javascript.0.test_setStateDelayed_overwrite', 8, err => {
                expect(err).to.be.ok;

                states.getState('javascript.0.test_setStateDelayed_overwrite', (err, stateStart) => {
                    expect(err).to.be.null;
                    expect(stateStart.val).to.be.not.equal(8);

                    checkValueOfState('javascript.0.test_setStateDelayed_overwrite', 9, err => {
                        expect(err).to.be.null;
                        states.getState('javascript.0.test_setStateDelayed_overwrite', err => {
                            expect(err).to.be.null;
                            done();
                        });
                    });
                });
            }, 18);
        });
    });

    it('Test JS: test clearStateDelayed', function (done) {
        this.timeout(5000);
        // add script
        const script = {
            _id:                'script.js.test_clearStateDelayed',
            type:               'script',
            common: {
                name:           'test clearStateDelayed',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `createState('test_clearStateDelayed', { type: 'number', read: true, write: false }, () => {\n` +
                                `    setStateDelayed('test_clearStateDelayed', 10, 500);\n` +
                                `    clearStateDelayed('test_clearStateDelayed');` +
                                `});`,
            },
            native: {}
        };

        objects.setObject(script._id, script, err => {
            expect(err).to.be.null;

            checkValueOfState('javascript.0.test_clearStateDelayed', 10, err => {
                expect(err).to.be.ok;

                states.getState('javascript.0.test_clearStateDelayed', (err, stateStart) => {
                    expect(err).to.be.null;
                    expect(stateStart.val).to.be.not.equal(10);
                    done();
                });
            }, 18);
        });
    });

    it('Test JS: test getStateDelayed single', function (done) {
        this.timeout(5000);
        // add script
        const script = {
            _id:                'script.js.test_getStateDelayed_single',
            type:               'script',
            common: {
                name:           'test getStateDelayed single',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `createState('test_getStateDelayed_single', { type: 'number', read: true, write: false }, () => {\n` +
                                `    createState('test_getStateDelayed_single_result', '', () => {\n` +
                                `        setStateDelayed('test_getStateDelayed_single', 10, 1500);\n` +
                                `        setState('test_getStateDelayed_single_result', JSON.stringify(getStateDelayed('test_getStateDelayed_single')));\n` +
                                `    });\n` +
                                `});`,
            },
            native: {}
        };

        objects.setObject(script._id, script, err => {
            expect(err).to.be.null;

            setTimeout(() => {
                states.getState('javascript.0.test_getStateDelayed_single_result', (err, delayedResult) => {
                    expect(err).to.be.null;
                    console.log('delayedResult: ' + delayedResult.val);
                    const result = JSON.parse(delayedResult.val);
                    expect(result[0]).to.be.ok;
                    expect(result[0].timerId).to.be.ok;
                    expect(result[0].left).to.be.ok;
                    expect(result[0].delay).to.be.equal(1500);
                    done();
                });
            }, 500);
        });
    });

    it('Test JS: test getStateDelayed all', function (done) {
        this.timeout(5000);
        // add script
        const script = {
            _id:                'script.js.test_getStateDelayed_all',
            type:               'script',
            common: {
                name:           'test getStateDelayed all',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `createState('test_getStateDelayed_all', { type: 'number', read: true, write: false }, () => {\n` +
                                `    createState('test_getStateDelayed_all_result', '{}', () => {\n` +
                                `        setStateDelayed('test_getStateDelayed_all', 11, 2500);\n` +
                                `        setState('test_getStateDelayed_all_result', JSON.stringify(getStateDelayed()));\n` +
                                `    });\n` +
                                `});`,
            },
            native: {}
        };

        objects.setObject(script._id, script, err => {
            expect(err).to.be.null;

            setTimeout(() => {
                states.getState('javascript.0.test_getStateDelayed_all_result', (err, delayedResult) => {
                    console.log('delayedResult!: ' + delayedResult.val);
                    expect(err).to.be.null;
                    const result = JSON.parse(delayedResult.val);
                    expect(result['javascript.0.test_getStateDelayed_all'][0]).to.be.ok;
                    expect(result['javascript.0.test_getStateDelayed_all'][0].timerId).to.be.ok;
                    expect(result['javascript.0.test_getStateDelayed_all'][0].left).to.be.ok;
                    expect(result['javascript.0.test_getStateDelayed_all'][0].delay).to.be.equal(2500);
                    done();
                });
            }, 500);
        });
    });

    it('Test JS: test setStateChanged', function (done) {
        this.timeout(5000);
        // add script
        const script = {
            _id:                'script.js.test_setStateChanged',
            type:               'script',
            common: {
                name:           'test setStateChanged',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `createState('test_setStateChanged', 4, () => {\n` +
                                `    setTimeout(() => { setStateChanged('test_setStateChanged', 4, true); }, 500);\n` +
                                `    setTimeout(() => { setStateChanged('test_setStateChanged', 5, true); }, 1000);\n` +
                                `    setTimeout(() => { setState('test_setStateChanged', 5, true); }, 1500);\n` +
                                `});`,
            },
            native: {}
        };

        let start = 0,
            count = 0;

        const onStateChanged = function (id, state){
            if (id !== 'javascript.0.test_setStateChanged') return;
            if (state.val === 4) { // has to be called once - on state creation
                if (start !== 0) {// on state change by setStateChanged('changed', 4, true) - should not be run, as it not change the state, including `state.ts`
                    count++;
                }
                expect(start).to.be.equal(0);
                if (start === 0) { // on state creation
                    start = state.ts;
                }
            } else if (state.val === 5) { // has to be called twice - on state change by setStateChanged('changed', 5, true) and setState('changed', 5, true)
                if (count === 0) { // on state change by setStateChanged('changed', 5, true)
                    count++;
                    expect(state.ts - start).to.be.least(950);
                    expect(state.ts - start).to.be.below(1450);
                } else if (count === 1) { // on state change by setState('changed', 5, true)
                    count++;
                    expect(state.ts - start).to.be.least(1450);
                    removeStateChangedHandler(onStateChanged);
                    setTimeout(done, 100);
                }
                if (count === 2) { // exit in any case
                    removeStateChangedHandler(onStateChanged);
                }
            }
        };
        addStateChangedHandler(onStateChanged);
        objects.setObject(script._id, script);
    });

    it('Test JS: test $().toArray()', function (done) {
        this.timeout(1000);
        // add script
        const script = {
            _id:                'script.js.test_selector_toArray',
            type:               'script',
            common: {
                name:           'test selector toArray',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `createState('selector.test_1.state', true, () => {\n` +
                                `    createState('selector.test_2.state', false, () => {\n` +
                                `        createState('selector.test_3.state', true, () => {\n` +
                                `            createState('selector.test_4.id', true, () => {\n` +
                                `                const states = $('state[id=javascript.0.selector.test_*.state]')` +
                                `                    .toArray().filter((id) => getState(id)?.val === true);\n` +
                                `                if (Array.isArray(states)) {\n` +
                                `                    createState('test_selector_toArray', states.length, true);\n` +
                                `                }\n` +
                                `            });\n` +
                                `        });\n` +
                                `    });\n` +
                                `});`,
            },
            native: {}
        };

        const onStateChanged = function (id, state){
            if (id !== 'javascript.0.test_selector_toArray') return;
            removeStateChangedHandler(onStateChanged);
            expect(state.val).to.be.equal(2);
            done();
        };
        addStateChangedHandler(onStateChanged);
        objects.setObject(script._id, script);
    });


    it('Test JS: test stopScript', function (done) {
        this.timeout(5000);
        // add script
        const script = {
            _id:                'script.js.stopScript',
            type:               'script',
            common: {
                name:           'stopScript',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `stopScript('stopScript');`,
            },
            native: {}
        };

        objects.setObject(script._id, script, err => {
            expect(err).to.be.null;
            setTimeout(function () {
                objects.getObject(script._id, (err, obj) => {
                    expect(err).to.be.null;
                    expect(obj.common.enabled).to.be.false;
                    done();
                });
            }, 1000);
        });
    });

    it('Test JS: test startScript', function (done) {
        // add script
        const script = {
            _id:                'script.js.startScript',
            type:               'script',
            common: {
                name:           'startScript',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `startScript('stopScript');`,
            },
            native: {}
        };
        const stopScript = {
            _id:                'script.js.stopScript',
            type:               'script',
            common: {
                name:           'stopScript',
                enabled:        false,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `console.log('started script');`,
            },
            native: {}
        };

        objects.setObject(stopScript._id, stopScript, err => {
            expect(err).to.be.null;

            objects.getObject(stopScript._id, (err, obj) => {
                expect(err).to.be.null;
                expect(obj.common.enabled).to.be.false;

                objects.setObject(script._id, script, err => {
                    expect(err).to.be.null;

                    setTimeout(() => {
                        objects.getObject(stopScript._id, (err, obj) => {
                            expect(err).to.be.null;
                            expect(obj.common.enabled).to.be.true;
                            done();
                        });
                    }, 1000);
                });
            });
        });
    }).timeout(5000);

    it('Test JS: test global function globalSetTestState', done => {
        // add script
        const script = {
            _id:                'script.js.test_globalSetTestState',
            type:               'script',
            common: {
                name:           'test global function globalSetTestState',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `globalSetTestState(16);`,
            },
            native: {}
        };
        objects.setObject(script._id, script, err => {
            expect(err).to.be.null;
            checkValueOfState('javascript.0.test_global_setTestState', 16, err => {
                expect(err).to.be.null;

                states.getState('javascript.0.test_global_setTestState', (err, state) => {
                    expect(err).to.be.null;
                    expect(state).to.be.ok;
                    expect(state.val).to.be.equal(16);
                    done();
                });
            }, 18);
        });
    }).timeout(5000);

    it('Test JS: test ON default', function (done) {
        // add script
        const script = {
            _id:                'script.js.test_ON_default',
            type:               'script',
            common: {
                name:           'test ON default',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `createState('testResponse', false);\n` +
                                `createState('testVar', 0, () => {\n` +
                                `    on('testVar', (obj) => {\n` +
                                `        setState('testResponse', obj.state.val, true);\n` +
                                `    });\n` +
                                `});`,
            },
            native: {}
        };

        const onStateChanged = function (id, state) {
            if (id === 'javascript.0.testVar' && state.val === 0) {
                setTimeout(function () {
                    states.setState('javascript.0.testVar', 6, err => {
                        expect(err).to.be.null;
                    });
                }, 1000);
            }
            if (id === 'javascript.0.testResponse' && state.val === 6) {
                removeStateChangedHandler(onStateChanged);
                done();
            }
        };
        addStateChangedHandler(onStateChanged);

        objects.setObject(script._id, script, err => {
            expect(err).to.be.null;
        });
    }).timeout(5000);

    it('Test JS: test ON any', function (done) {
        // add script
        const script = {
            _id:                'script.js.test_ON_any',
            type:               'script',
            common: {
                name:           'test ON any',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `createState('testResponse1', false); createState('testVar1', 1, () => { on({ id:'testVar1', change:'any' }, (obj) => { setState('testResponse1', obj.state.val, true); }); });`,
            },
            native: {}
        };

        const onStateChanged = function (id, state) {
            if (id === 'javascript.0.testVar1' && state.val === 1) {
                setTimeout(function () {
                    states.setState('javascript.0.testVar1', 1, err => {
                        expect(err).to.be.null;
                    });
                }, 1000);
            }
            if (id === 'javascript.0.testResponse1' && state.val === 1) {
                removeStateChangedHandler(onStateChanged);
                done();
            }
        };
        addStateChangedHandler(onStateChanged);

        objects.setObject(script._id, script, err => {
            expect(err).to.be.null;
        });
    }).timeout(5000);

    it('Test JS: test ON misc', function (done) {
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        function scriptFunction (param) {
            let results = '';
            const TEST_VAR = 'javascript.0.device.channel.testVar';
            const TEST_RESULTS = 'javascript.0.testResults';

            const recs = [
                // request Options                                  // on options or iD                                                  // states to set
                [ { no:  1, cnt: 2, val: true },                    { id: /\.testVar$/, val: true },                                     [ true, false, { val: true, ack: true } ] ],
                [ { no:  2, cnt: 2, val: true },                    { id: 0, val: true },                                                [ true, false, { val: true, ack: true } ] ],
                [ { no:  3, cnt: 2, val: false, tio: 2},            { id: 0, val: false },                                               [ true, false, { val: true, ack: true }, { val: false, ack: true } ] ],
                [ { no:  4, cnt: 1, val: {val: true, ack: true }},  { id: 0, val: true, ack: true },                                     [ true, false, { val: true, ack: true }, { val: false, ack: true } ] ],
                [ { no:  5, cnt: 1, val: {val:false, ack: true }},  { id: 0, val: false, ack: true },                                    [ true, false, { val: true, ack: true }, { val: false, ack: true } ] ],
                [ { no:  6, cnt: 1, val: true },                    { id: 0, change: 'ne' },                                             [ false, true, true ]],
                [ { no:  7, cnt: 2, val: true },                    { id: 0, change: 'any' },                                            [ true, true ]],
                [ { no:  8, cnt: 1, val: true },                    { id: 0, change: 'gt' },                                             [ false, true, true ]],
                [ { no:  9, cnt: 2, val: true },                    { id: 0, change: 'eq' },                                             [ true, true, true, false ]],
                [ { no: 10, cnt: 1, val: 'World' },                 { name: 'Hello', change: 'gt' },                                     ['Change', 'World', 'World'] ],
                [ { no: 11, cnt: 0, val: 'World' },                 { name: 'hello', change: 'gt' },                                     ['Change', 'World', 'World'] ],
                [ { no: 12, cnt: 1, val: 'World' },                 { name: /^[h|H]ello/, change: 'any' },                               ['World'] ],

                [ { no: 13, cnt: 1, val: 'B' },                     { id: 0, valGt: 'A' },                                               [ 'B', 'A'] ],
                [ { no: 14, cnt: 2, val: 'B' },                     { id: 0, valGe: 'A' },                                               [ 'B', 'B'] ],
                [ { no: 15, cnt: 1, val: 'B' },                     { id: 0, valGe: 'B' },                                               [ 'B', 'A'] ],
                [ { no: 16, cnt: 1, val: 'A' },                     { id: 0, valLt: 'B' },                                               [ 'A', 'C'] ],
                [ { no: 17, cnt: 1, val: 'A' },                     { id: 0, valLe: 'A' },                                               [ 'A', 'B'] ],
                [ { no: 18, cnt: 1, val: 'B' },                     { id: 0, valNe: 'A' },                                               [ 'B', 'A'] ],
                [ { no: 19, cnt: 1, val: 'onChannel' },             { channelId: 'javascript.0.device.channel' },                        [ 'onChannel'] ],
                [ { no: 20, cnt: 1, val: 'onChannel'},              { channelId: 'javascript.0.device.channel', val: 'onChannel' },      [ 'onChannel', 'xyz'] ],
                [ { no: 21, cnt: 1, val: 'onChannel'},              { channelName: 'Channel' },                                          [ 'onChannel'] ],
                [ { no: 22, cnt: 1, val: 'onChannel'},              { channelName: 'Channel', val: 'onChannel' },                        [ 'onChannel', 'xyz'] ],
                [ { no: 23, cnt: 1, val: 'onDevice'},               { deviceId: 'javascript.0.device' },                                 [ 'onDevice'] ],
                [ { no: 24, cnt: 1, val: 'onDevice'},               { deviceId: 'javascript.0.device', val: 'onDevice' },                [ 'onDevice', 'xyz'] ],
                [ { no: 25, cnt: 1, val: 'onDevice'},               { deviceName: 'Device' },                                            [ 'onDevice'] ],
                [ { no: 26, cnt: 1, val: 'onDevice'},               { deviceName: 'Device', val: 'onDevice' },                           [ 'onDevice', 'xyz'] ],

                [ { no: 27, cnt: 1, val: 1, before: false },        { id:0, oldVal: false },                                             [ 1, 1 ] ],
                [ { no: 28, cnt: 1, val: 1, before: 2 },            { id:0, oldValGt: 1 },                                               [ 1, 1 ] ],
                [ { no: 29, cnt: 2, val: 1, before: 2, tio: 2 },    { id:0, oldValGe: 1 },                                               [ 1, 1 ] ],
                [ { no: 30, cnt: 1, before: 2 },                    { id:0, oldValNe: 1 },                                               [ 1, 0 ] ],
                [ { no: 31, cnt: 1, before: 0 },                    { id:0, oldValLt: 1 },                                               [ 1, 0 ] ],
                [ { no: 32, cnt: 2, before: 0 },                    { id:0, oldValLe: 1 },                                               [ 1, 2, 0] ],

                [ { no: 33, cnt: 1, val: 1 },                       { id:0, tsGt: 1 },                                                   [ 1 ] ],
                [ { no: 34, cnt: 0 },                               { id:0, tsGt: 0xfffffffffff },                                       [ 1 ] ],
                [ { no: 35, cnt: 1, val: 1 },                       { id:0, tsLt: 0xfffffffffff },                                       [ 1 ] ],
                [ { no: 36, cnt: 0 },                               { id:0, tsLt: 1 },                                                   [ 1 ] ],
                [ { no: 37, cnt: 1, val: 1 },                       { id:0, oldTsGt: 1 },                                                [ 1 ] ],
                [ { no: 38, cnt: 0 },                               { id:0, oldTsGt: 0xfffffffffff },                                    [ 1 ] ],
                [ { no: 39, cnt: 1, val: 1 },                       { id:0, oldTsLt: 0xfffffffffff },                                    [ 1 ] ],
                [ { no: 40, cnt: 0 },                               { id:0, oldTsLt: 1 },                                                [ 1 ] ],
                [ { no: 41, cnt: 1, val: 1 },                       { id:0, lcGt: 1 },                                                   [ 1 ] ],
                [ { no: 42, cnt: 1, val: 1 },                       { id:0, lcLt: 0xfffffffffff },                                       [ 1 ] ],
                [ { no: 43, cnt: 0 },                               { id:0, lcLt: 1 },                                                   [ 1 ] ],
                [ { no: 44, cnt: 1, val: 1 },                       { id:0, oldLcGt: 1 },                                                [ 1 ] ],
                [ { no: 45, cnt: 0 },                               { id:0, oldLcGt: 0xfffffffffff },                                    [ 1 ] ],
                [ { no: 46, cnt: 1, val: 1 },                       { id:0, oldLcLt: 0xfffffffffff },                                    [ 1 ] ],
                [ { no: 47, cnt: 0 },                               { id:0, oldLcLt: 1 },                                                [ 1 ] ],

                [ { no: 48, cnt: 1, val: 1 },                       { id:0, from: 'system.adapter.javascript.0' },                       [ 1 ] ],
                [ { no: 49, cnt: 0 },                               { id:0, from: 'system.adapter.javascript.1' },                       [ 1 ] ],
                [ { no: 50, cnt: 1, val: 1 },                       { id:0, oldFrom: 'system.adapter.javascript.0' },                    [ 1 ] ],
                [ { no: 51, cnt: 0 },                               { id:0, oldFrom: 'system.adapter.javascript.1' },                    [ 1 ] ],

                // not ok with the old patternMatching function
                [ { no: 52, cnt: 1, val: 'onChannel'},              { channelId: /^javascript.0.device.channel$/ },                     [ 'onChannel'] ],
                [ { no: 53, cnt: 1, val: 'onChannel'},              { channelId: /^javascript.0.device.channel$/, val: 'onChannel' },   [ 'onChannel', 'xyz'] ],
                [ { no: 54, cnt: 1, val: 'onChannel'},              { channelName: /^Channel$/ },                                       [ 'onChannel'] ],
                [ { no: 55, cnt: 1, val: 'onChannel'},              { channelName: /^Channel$/, val: 'onChannel' },                     [ 'onChannel', 'xyz'] ],
                [ { no: 56, cnt: 1, val: 'onDevice'},               { deviceId: /^javascript.0.device$/ },                              [ 'onDevice'] ],
                [ { no: 57, cnt: 1, val: 'onDevice'},               { deviceId: /^javascript.0.device$/, val: 'onDevice' },             [ 'onDevice', 'xyz'] ],
                [ { no: 58, cnt: 1, val: 'onDevice'},               { deviceName: /^Device$/ },                                         [ 'onDevice'] ],
                [ { no: 59, cnt: 1, val: 'onDevice'},               { deviceName: /^Device$/, val: 'onDevice' },                        [ 'onDevice', 'xyz'] ]

            ];

            switch (param) {
                case 'recs':
                    return recs;

                case 'TEST_VAR':
                    return TEST_VAR;

                case 'TEST_RESULTS':
                    return TEST_RESULTS;
            }

            createState(TEST_RESULTS, '', true, { name: 'Testresults', type: 'string' });

            function addResult(name, val) {
                results += name + (val !== undefined ? '=' + val : '') + ';\r\n';
            }

            function handler(result, req, obj) {
                log ('handler: result=' + JSON.stringify(result) + ' / req=' + JSON.stringify(req) + ' / obj=' + JSON.stringify(obj));
                if (obj.state.ts <= result.initTs &&
                    (
                        (obj.state.val === result.before && obj.state.ack === result.ack) ||
                        (obj.state.val === '___' && obj.state.ack === true) // createState event
                    )
                ){
                    // we got the value subscribe for the "start" or "createState" value too, ignore it
                    log('IGNORED');
                    return;
                }
                if (typeof result.val === 'object') {
                    Object.keys(result.val).forEach(n => {
                        addResult('obj.state.' + n + '=' + obj.state[n] + ' val.' + n + '=' + result.val[n]);
                        result.nok = result.nok || (result.val[n] !== obj.state[n]);
                    });

                } else if (result.val !== undefined) {
                    addResult('obj.state.val=' + obj.state.val + ' val=' + result.val);
                    result.nok = result.nok || (result.val !== obj.state.val);
                }
                result.callCount += 1;
            }

            function createTest(req, obj, ar, callback) {
                results = '';
                if (obj.id === 0) {
                    obj.id = TEST_VAR;
                }
                if (req.before === undefined) {
                    req.before = false;
                }
                if (req.ack === undefined) {
                    req.ack = true;
                }
                if (req.tio === undefined) {
                    req.tio = 1000;
                } else {
                    req.tio *= 1000;
                }

                setState(TEST_VAR, req.before, req.ack, (_err, _obj) => {
                    req.nok = false;
                    req.callCount = 0;

                    if (req.cnt === undefined) {
                        req.cnt = 1;
                    }
                    req.initTs = Date.now();

                    const sub = on(obj, handler.bind(1, req, obj));
                    if (!ar) {
                        return doIt();
                    }
                    let no = 0;

                    (function doIt() {
                        if (no >= ar.length) {
                            setTimeout(() => {
                                unsubscribe(sub);
                                results = (req.callCount === req.cnt && req.nok === false ? 'OK;' : 'NOK;') + 'no=' + req.no + ';' + results + 'callCount=' + req.callCount + ';cnt=' + req.cnt;
                                setState(TEST_RESULTS, results, true, callback);
                            }, req.tio);

                            return;
                        }

                        let o = ar[no++];

                        if (typeof o !== 'object') {
                            o = { val: o };
                        }

                        setState(TEST_VAR, o.val, o.ack, doIt);
                    })();
                });
            }

            function runTests(id) {
                createState(id, '___', true, { name: 'Hello', type: 'mixed' }, (err, obj) => {
                    let cnt = 0;
                    (function doIt() {
                        if (cnt >= recs.length) {
                            return;
                        }
                        const rec = recs[cnt++];

                        // sometimes the state init event from createState will be received too, so wait a little
                        setTimeout(() =>
                            createTest(rec[0], rec[1], rec[2], () => setTimeout(doIt, 1000)), 200);
                    })();
                });
            }
            runTests(TEST_VAR);
        }

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        const script = {
            _id:                'script.js.test_ON',
            type:               'script',
            common: {
                name:           'test ON any',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `${scriptFunction.toString()}\nscriptFunction();\n`,
            },
            native: {}
        };

        const recs = scriptFunction('recs');
        const TEST_VAR = scriptFunction('TEST_VAR');
        const TEST_RESULTS = scriptFunction('TEST_RESULTS');
        this.timeout(20000 + 2200 * recs.length);

        function createObjects(callback) {
            const channel = TEST_VAR.replace(/\.[^.]+$/, '');
            const device = channel.replace(/\.[^.]+$/, '');

            // create device
            objects.setObject(device, { common: { name: 'Device' }, type: 'device' }, (err, obj) => {
                expect(err).to.be.null;
                // create channel
                objects.setObject(channel, { common: { name: 'Channel' }, type: 'channel' }, callback);
            });
        }

        createObjects((err, _obj) => {
            expect(err).to.be.null;
            // objects.getObject('system.adapter.javascript.0', function(err, obj) {
            //     obj.native.enableSetObject = true;
            //     objects.setObject('system.adapter.javascript.0', function(err, obj) {
            let cnt = 0;

            const onStateChanged = function (id, state) {
                if (id === TEST_RESULTS && state.val) {
                    cnt += 1;
                    const ar = /^(OK;no=[\d]+)/.exec(state.val) || ['', state.val];
                    expect(ar).to.be.ok;
                    expect(ar[1]).to.be.equal('OK;no=' + cnt);

                    if (cnt >= recs.length) {
                        removeStateChangedHandler(onStateChanged);
                        done ();
                    }
                }
            };

            addStateChangedHandler(onStateChanged);

            // write script into Objects => start script
            objects.setObject(script._id, script, err => expect(err).to.be.null);
        });
    });

    it('Test JS: test schedule seconds', function (done) {
        const d = new Date();

        console.log('Must wait 2 seconds[' + ((d.getSeconds() + 2) % 60) + ' * * * * *]' + d.toISOString());
        // add script
        const script = {
            _id:                'script.js.test_schedule_seconds',
            type:               'script',
            common: {
                name:           'test schedule seconds',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `createState('test_schedule_seconds', false);\n` +
                                `schedule('${(d.getSeconds() + 2) % 60} * * * * *', () => {\n` +
                                `    setState('test_schedule_seconds', true, true);\n` +
                                `});`,
            },
            native: {}
        };

        const onStateChanged = function (id, state) {
            if (id === 'javascript.0.test_schedule_seconds' && state.val === true) {
                removeStateChangedHandler(onStateChanged);
                done();
            }
        };
        addStateChangedHandler(onStateChanged);

        objects.setObject(script._id, script, err => {
            expect(err).to.be.null;
        });
    }).timeout(4000);

    it('Test JS: test schedule minutes', function (done) {
        const d = new Date();
        console.log('Must wait ' + (60 - d.getSeconds()) + ' seconds[' + ((d.getMinutes() + 1) % 60) + ' * * * *] ' + d.toISOString());
        this.timeout((64 - d.getSeconds()) * 1000);

        // add script
        const script = {
            _id:                'script.js.test_schedule_minutes',
            type:               'script',
            common: {
                name:           'test schedule minutes',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `createState('test_schedule_minutes', false);\n` +
                                `schedule('${(d.getMinutes() + 1) % 60} * * * *', () => {\n` +
                                `    setState('test_schedule_minutes', true, true);\n` +
                                `});`,
            },
            native: {}
        };

        const onStateChanged = function (id, state) {
            if (id === 'javascript.0.test_schedule_minutes' && state.val === true) {
                removeStateChangedHandler(onStateChanged);
                done();
            }
        };
        addStateChangedHandler(onStateChanged);

        objects.setObject(script._id, script, err => {
            expect(err).to.be.null;
        });
    });

    it('Test JS: test scheduleById', function (done) {
        const d = new Date();
        d.setSeconds(d.getSeconds() + 5);
        this.timeout(d.getTime() - Date.now() + 10000);

        // add script
        const script = {
            _id:                'script.js.test_scheduleById',
            type:               'script',
            common: {
                name:           'test scheduleById',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `createState('test_scheduleById', '00:00', { type: 'string', role: 'value.time', read: true, write: true }, () => {\n` +
                                `    createState('test_scheduleById_result', false, () => {\n` +
                                `        scheduleById('test_scheduleById', () => {\n` +
                                `            setState('test_scheduleById_result', { val: true, ack: true });\n` +
                                `        });\n` +
                                `        setTimeout(() => {\n` +
                                `            setState('test_scheduleById', '${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}', true);\n` +
                                `        }, 500);\n` +
                                `    });\n` +
                                `});`,
            },
            native: {}
        };

        const onStateChanged = function (id, state) {
            if (id === 'javascript.0.test_scheduleById_result' && state.val === true) {
                removeStateChangedHandler(onStateChanged);
                done();
            }
        };
        addStateChangedHandler(onStateChanged);

        objects.setObject(script._id, script, err => {
            expect(err).to.be.null;
        });
    });

    it('Test JS: test writeFile to "0_userdata.0"', function (done) {
        // add script
        const script = {
            _id:                'script.js.test_write_userdata',
            type:               'script',
            common: {
                name:           'test file write',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `createState('test_write_userdata', false, () => {\n` +
                                `    writeFile('0_userdata.0', 'test.txt', 'it works', (err) => {\n` +
                                `        if (!err) {\n` +
                                `            setState('test_write_userdata', true, true);\n` +
                                `        }\n` +
                                `    });\n` +
                                `});`,
            },
            native: {}
        };

        const onStateChanged = function (id, state) {
            if (id === 'javascript.0.test_write_userdata' && state.val === true) {
                removeStateChangedHandler(onStateChanged);
                done();
            }
        };
        addStateChangedHandler(onStateChanged);

        objects.setObject(script._id, script, err => {
            expect(err).to.be.null;
        });
    }).timeout(5000);

    it('Test JS: test readFile from "0_userdata.0"', function (done) {
        // add script
        const script = {
            _id:                'script.js.test_read_userdata',
            type:               'script',
            common: {
                name:           'test file read',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `createState('test_read_userdata', '', () => {\n` +
                                `    readFile('0_userdata.0', 'test.txt', (err, data) => {\n` +
                                `        if (!err) {\n` +
                                `            setState('test_read_userdata', { val: data, ack: true });\n` +
                                `        }\n` +
                                `    });\n` +
                                `});`,
            },
            native: {}
        };

        const onStateChanged = function (id, state) {
            if (id === 'javascript.0.test_read_userdata' && state.val === 'it works') {
                removeStateChangedHandler(onStateChanged);
                done();
            }
        };
        addStateChangedHandler(onStateChanged);

        objects.setObject(script._id, script, err => {
            expect(err).to.be.null;
        });
    }).timeout(5000);

    /*
    Vis is not installed
    it('Test JS: test write file  to "vis.0"', function (done) {
        // add script
        const script = {
            _id:                'script.js.test_write1',
            type:               'script',
            common: {
                name:           'test write',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `createState('testScheduleResponse2', false, () => { writeFile('vis.0', '/test1.txt', 'test', () => { setState('testScheduleResponse2', true, true); }); });`,
            },
            native: {}
        };

        const onStateChanged = function (id, state) {
            if (id === 'javascript.0.testScheduleResponse2' && state.val === true) {
                removeStateChangedHandler(onStateChanged);
                done();
            }
        };
        addStateChangedHandler(onStateChanged);

        objects.setObject(script._id, script, err => expect(err).to.be.null);
    }).timeout(5000);

    it('Test JS: test read file from "vis.0"',  done => {
        // add script
        const script = {
            _id:                'script.js.test_read1',
            type:               'script',
            common: {
                name:           'test read',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `readFile('vis.0', '/test1.txt', (err, data) => { setState('testScheduleResponse2', data, true); });`,
            },
            native: {}
        };

        const onStateChanged = function (id, state) {
            if (id === 'javascript.0.testScheduleResponse2' && state.val === 'test') {
                removeStateChangedHandler(onStateChanged);
                done();
            }
        };
        addStateChangedHandler(onStateChanged);

        objects.setObject(script._id, script, err => expect(err).to.be.null);
    }).timeout(5000);
    */

    it('Test JS: messaging between scripts', done => {
        // add script
        const script = {
            _id:                'script.js.test_messaging',
            type:               'script',
            common: {
                name:           'test messaging',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `createState('onMessage', false, () => {\n` +
                                `    createState('messageTo', false, () => {\n` +
                                `        createState('messageDeleted', false, () => {\n` +
                                `            let id = onMessage('messageName', (data, callback) => {\n` +
                                `                setState('javascript.0.onMessage', data, true);\n` +
                                `                callback(5);\n` +
                                `            });\n` +
                                `            messageTo('messageName', 6, result => {\n` +
                                `                setState('javascript.0.messageTo', result, true);\n` +
                                `                setState('javascript.0.messageDeleted', onMessageUnregister(id), true);\n` +
                                `            });\n` +
                                `        });\n` +
                                `    });\n` +
                                `});`,
            },
            native: {}
        };

        let count = 3;
        const onStateChanged = function (id, state) {
            console.log(`ON CHANGE. ${id} ${JSON.stringify(state)}`);
            if (
                (id === 'javascript.0.messageTo'      && state.val === 5    && state.ack === true) ||
                (id === 'javascript.0.messageDeleted' && state.val === true && state.ack === true) ||
                (id === 'javascript.0.onMessage'      && state.val === 6    && state.ack === true)
            ) {
                if (!--count) {
                    removeStateChangedHandler(onStateChanged);
                    done();
                }
            }
        };
        addStateChangedHandler(onStateChanged);

        objects.setObject(script._id, script, err => expect(err).to.be.null);
    }).timeout(5000);

    it('Test JS: subscribe on file', done => {
        // add script
        const script = {
            _id:                'script.js.test_read1',
            type:               'script',
            common: {
                name:           'test onFile',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `createState('file', false, () => {\n` +
                                `    onFile('vis.0', 'main/*', true, (id, fileName, size, fileData, mimeType) => {\n` +
                                `        setState('javascript.0.file', fileData.toString(), true);\n` +
                                `        offFile('vis.0', 'main/*');\n` +
                                `    });\n` +
                                `});`,
            },
            native: {}
        };

        let fileReceived = false;
        const onStateChanged = function (id, state) {
            console.log(`ON CHANGE. ${id} ${JSON.stringify(state)}`);
            if (id === 'javascript.0.file' && state.val === 'abcdef') {
                if (!fileReceived) {
                    fileReceived = true;
                    objects.writeFile('vis.0', 'main/data.txt', '12345', err => expect(err).to.be.undefined);

                    setTimeout(() => {
                        removeStateChangedHandler(onStateChanged);
                        done();
                    }, 3000);
                } else {
                    // after offFile we may not receive any updates
                    expect(state.val).to.be.false;
                }
            }
        };

        addStateChangedHandler(onStateChanged);

        objects.setObject('vis.0', { type: 'meta', common: {} }, () => {
            objects.setObject(script._id, script, err => {
                expect(err).to.be.null;

                // let the script be started
                setTimeout(() => {
                    objects.writeFile('vis.0', 'main/data.txt', 'abcdef', err => expect(err).to.be.undefined);
                }, 4000);
            });
        });
    }).timeout(15000);

    it('Test JS: test formatTimeDiff', function (done) {
        this.timeout(10000);
        // add script
        const script = {
            _id:                'script.js.test_formatTimeDiff',
            type:               'script',
            common: {
                name:           'test formatTimeDiff',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `createState('test_formatTimeDiff', { type: 'string', role: 'json', read: true, write: false }, () => {\n` +
                                `    const diff1 = formatTimeDiff(172800000 + 10800000 + 540000 + 15000, 'hh:mm:ss');\n` +
                                `    const diff2 = formatTimeDiff((172800000 + 10800000 + 540000 + 15000) * -1, 'mm:ss');\n` +
                                `    setState('test_formatTimeDiff', { val: JSON.stringify({ diff1, diff2 }), ack: true });\n` +
                                `});`,
            },
            native: {},
        };
        const onStateChanged = function (id, state) {
            if (id === 'javascript.0.test_formatTimeDiff' && state.val) {
                const obj = JSON.parse(state.val);

                expect(obj.diff1).to.be.a('string');
                expect(obj.diff1).to.be.equal('51:09:15');

                expect(obj.diff2).to.be.a('string');
                expect(obj.diff2).to.be.equal('-3069:15');

                removeStateChangedHandler(onStateChanged);
                done();
            }
        };
        addStateChangedHandler(onStateChanged);

        objects.setObject(script._id, script, err => expect(err).to.be.null);
    });

    it('Test JS: test getDateObject', function (done) {
        this.timeout(10000);
        // add script
        const script = {
            _id:                'script.js.test_getDateObject',
            type:               'script',
            common: {
                name:           'test getDateObject',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `createState('test_getDateObject', { type: 'string', role: 'json', read: true, write: false }, () => {\n` +
                                `    const now = Date.now();\n` +
                                `    const justHour = getDateObject('14').toISOString();\n` +
                                `    const timeToday = getDateObject('20:15').toISOString();\n` +
                                `    const byTimestamp = getDateObject(1716056595000).toISOString();\n` + // 2024-05-18T18:23:15.000Z
                                `    setState('test_getDateObject', { val: JSON.stringify({ now, justHour, timeToday, byTimestamp }), ack: true });\n` +
                                `});`,
            },
            native: {},
        };
        const onStateChanged = function (id, state) {
            if (id === 'javascript.0.test_getDateObject' && state.val) {
                const obj = JSON.parse(state.val);

                expect(obj.now).to.be.a('number');
                const d = new Date(obj.now);

                expect(obj.justHour).to.be.a('string');
                const justHour = new Date(obj.justHour);
                expect(justHour.getHours()).to.be.equal(14);
                expect(justHour.getMinutes()).to.be.equal(0);
                expect(justHour.getFullYear()).to.be.equal(d.getFullYear());
                expect(justHour.getMonth()).to.be.equal(d.getMonth());

                expect(obj.timeToday).to.be.a('string');
                const timeToday = new Date(obj.timeToday);
                expect(timeToday.getHours()).to.be.equal(20);
                expect(timeToday.getMinutes()).to.be.equal(15);
                expect(timeToday.getFullYear()).to.be.equal(d.getFullYear());
                expect(timeToday.getMonth()).to.be.equal(d.getMonth());

                expect(obj.byTimestamp).to.be.a('string');
                const byTimestamp = new Date(obj.byTimestamp);
                expect(byTimestamp.getUTCHours()).to.be.equal(18);
                expect(byTimestamp.getUTCDate()).to.be.equal(18);
                expect(byTimestamp.getUTCMonth() + 1).to.be.equal(5);
                expect(byTimestamp.getUTCFullYear()).to.be.equal(2024);

                removeStateChangedHandler(onStateChanged);
                done();
            }
        };
        addStateChangedHandler(onStateChanged);

        objects.setObject(script._id, script, err => expect(err).to.be.null);
    });

    it('Test JS: test getAttr', function (done) {
        this.timeout(10000);
        // add script
        const script = {
            _id:                'script.js.test_getAttr',
            type:               'script',
            common: {
                name:           'test getAttr',
                enabled:        true,
                verbose:        true,
                engine:         'system.adapter.javascript.0',
                engineType:     'Javascript/js',
                source:         `createState('test_getAttr', { type: 'string', role: 'json', read: true, write: false }, () => {\n` +
                                `    const attr1 = getAttr('{"level1":{"level2":"myVal"}}', 'level1.level2');\n` +
                                `    const attr2 = getAttr({ level1: { level2: { level3: 15 } } }, 'level1.level2.level3');\n` +
                                `    const attr3 = getAttr({ obj: { 'with-hyphen': { val: true } } }, 'obj.with-hyphen.val');\n` +
                                `    const attr4 = getAttr({ obj: { 'colon:0': { val: 'yes' } } }, 'obj.colon:0.val');\n` +
                                `    const attr5 = getAttr({ obj: { arr: ['one', 'two', 'three', 'four'] } }, 'obj.arr.2');\n` +
                                `    const attr6 = getAttr({ obj: { arr: [{ val: 1 }, { val: 2 }, { val: 3 }, { val: 4 }] } }, 'obj.arr.1.val');\n` +
                                `    setState('test_getAttr', { val: JSON.stringify({ attr1, attr2, attr3, attr4, attr5, attr6 }), ack: true });\n` +
                                `});`,
            },
            native: {},
        };
        const onStateChanged = function (id, state) {
            if (id === 'javascript.0.test_getAttr' && state.val) {
                const obj = JSON.parse(state.val);

                expect(obj.attr1).to.be.a('string');
                expect(obj.attr1).to.be.equal('myVal');

                expect(obj.attr2).to.be.a('number');
                expect(obj.attr2).to.be.equal(15);

                expect(obj.attr3).to.be.a('boolean');
                expect(obj.attr3).to.be.equal(true);

                expect(obj.attr4).to.be.a('string');
                expect(obj.attr4).to.be.equal('yes');

                expect(obj.attr5).to.be.a('string');
                expect(obj.attr5).to.be.equal('three');

                expect(obj.attr6).to.be.a('number');
                expect(obj.attr6).to.be.equal(2);

                removeStateChangedHandler(onStateChanged);
                done();
            }
        };
        addStateChangedHandler(onStateChanged);

        objects.setObject(script._id, script, err => expect(err).to.be.null);
    });

    after('Test JS: Stop js-controller', function (done) {
        this.timeout(6000);

        setup.stopController(normalTerminated => {
            console.log('Adapter normal terminated: ' + normalTerminated);
            done();
        });
    });
});
