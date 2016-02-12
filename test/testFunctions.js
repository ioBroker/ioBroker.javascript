var expect = require('chai').expect;
var setup  = require(__dirname + '/lib/setup');

var objects = null;
var states  = null;

function checkConnectionOfAdapter(cb, counter) {
    counter = counter || 0;
    if (counter > 20) {
        cb && cb('Cannot check connection');
        return;
    }

    states.getState('system.adapter.javascript.0.alive', function (err, state) {
        if (err) console.error(err);
        if (state && state.val) {
            cb && cb();
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
        cb && cb('Cannot check value Of State ' + id);
        return;
    }

    states.getState(id, function (err, state) {
        if (err) console.error(err);
        if (value === null && !state) {
            cb && cb();
        } else
        if (state && (value === undefined || state.val === value)) {
            cb && cb();
        } else {
            setTimeout(function () {
                checkValueOfState(id, value, cb, counter + 1);
            }, 500);
        }
    });
}

describe('Test JS', function() {
    before('Test JS: Start js-controller', function (_done) {
        this.timeout(600000); // because of first install from npm

        setup.setupController(function () {
            var config = setup.getAdapterConfig();
            // enable adapter
            config.common.enabled  = true;
            config.common.loglevel = 'debug';

            config.native.longitude = 43.273709;
            config.native.latitude  = 6.5798918;

            setup.setAdapterConfig(config.common, config.native);

            setup.startController(function (_objects, _states) {
                objects = _objects;
                states  = _states;
                _done();
            });
        });
    });

    it('Test JS: Check if adapter started', function (done) {
        this.timeout(5000);
        checkConnectionOfAdapter(done);
    });

    it('Test JS: check creation of state', function (done) {
        this.timeout(2000);
        // add script
        var script = {
            "common": {
                "name":         "check creation of state",
                "engineType":   "Javascript/js",
                "source":       "createState('test1', 5);",
                "enabled":      true,
                "engine":       "system.adapter.javascript.0"
            },
            "type":             "script",
            "_id":              "script.js.check_creation_of_state",
            "native": {}
        };

        objects.setObject(script._id, script, function (err) {
            expect(err).to.be.not.ok;
            checkValueOfState('javascript.0.test1', 5, function (err) {
                expect(err).to.be.not.ok;
                objects.getObject('javascript.0.test1', function (err, obj) {
                    expect(err).to.be.not.ok;
                    expect(obj).to.be.ok;
                    done();
                });
            });
        });
    });

    it('Test JS: check deletion of state', function (done) {
        this.timeout(2000);
        // add script
        var script = {
            "common": {
                "name":         "check deletion of state",
                "engineType":   "Javascript/js",
                "source":       "deleteState('test1');",
                "enabled":      true,
                "engine":       "system.adapter.javascript.0"
            },
            "type":             "script",
            "_id":              "script.js.check_deletion_of_state",
            "native": {}
        };

        objects.getObject('javascript.0.test1', function (err, obj) {
            expect(err).to.be.not.ok;
            expect(obj).to.be.ok;
            states.getState('javascript.0.test1', function (err, state) {
                expect(err).to.be.not.ok;
                expect(state).to.be.ok;
                expect(state.val).to.be.equal(5);

                objects.setObject(script._id, script, function (err) {
                    expect(err).to.be.not.ok;
                    checkValueOfState('javascript.0.test1', null, function (err) {
                        expect(err).to.be.not.ok;
                        objects.getObject('javascript.0.test1', function (err, obj) {
                            expect(err).to.be.not.ok;
                            expect(obj).to.be.not.ok;
                            done();
                        });
                    });
                });
            });
        });
    });

    it('Test JS: open objects.json file must not work', function (done) {
        this.timeout(20000);
        // add script
        var script = {
            "common": {
                "name":         "open objects",
                "engineType":   "Javascript/js",
                "source":       "var fs=require('fs'); try{fs.readFileSync('" + __dirname + "/../tmp/" + setup.appName + "-data/objects.json');}catch(err){createState('error', err.toString());}",
                "enabled":      true,
                "engine":       "system.adapter.javascript.0"
            },
            "type":             "script",
            "_id":              "script.js.open_objects",
            "native": {}
        };

        objects.setObject(script._id, script, function (err) {
            expect(err).to.be.not.ok;
            checkValueOfState('javascript.0.error', 'Error: Permission denied', function (err) {
                expect(err).to.be.not.ok;
                done();
            });
        });
    });

    it('Test JS: write objects.json file must not work', function (done) {
        this.timeout(2000);
        // add script
        var script = {
            "common": {
                "name":         "open objects",
                "engineType":   "Javascript/js",
                "source":       "var fs=require('fs'); try{fs.writeFileSync('" + __dirname + "/../tmp/" + setup.appName + "-data/objects.json', '');}catch(err){createState('error1', err.toString());}",
                "enabled":      true,
                "engine":       "system.adapter.javascript.0"
            },
            "type":             "script",
            "_id":              "script.js.open_objects",
            "native": {}
        };

        objects.setObject(script._id, script, function (err) {
            expect(err).to.be.not.ok;
            checkValueOfState('javascript.0.error1', 'Error: Permission denied', function (err) {
                expect(err).to.be.not.ok;
                done();
            });
        });
    });

    it('Test JS: write objects.json not in data directory must work', function (done) {
        this.timeout(2000);
        var time = new Date().toString();
        var fs = require('fs');

        if (fs.existsSync(__dirname + "/../tmp/objects.json")) fs.unlinkSync(__dirname + "/../tmp/objects.json");

        // add script
        var script = {
            "common": {
                "name":         "open objects",
                "engineType":   "Javascript/js",
                "source":       "var fs=require('fs'); try{fs.writeFileSync('" + __dirname.replace(/\\/g, "/") + "/../tmp/objects.json', '" + time + "');}catch(err){createState('error3', err.toString());}",
                "enabled":      true,
                "engine":       "system.adapter.javascript.0"
            },
            "type":             "script",
            "_id":              "script.js.open_objects",
            "native": {}
        };

        objects.setObject(script._id, script, function (err) {
            expect(err).to.be.not.ok;
            setTimeout(function () {
                expect(fs.readFileSync(__dirname + "/../tmp/objects.json").toString()).to.be.equal(time);
                fs.unlinkSync(__dirname + "/../tmp/objects.json");
                done();
            }, 500);
        });
    });

    it('Test JS: test getAstroDate', function (done) {
        this.timeout(2000);
        var types = [
            "sunrise",
            "sunriseEnd",
            "goldenHourEnd",
            "solarNoon",
            "goldenHour",
            "sunsetStart",
            "sunset",
            "dusk",
            "nauticalDusk",
            "night",
            "nightEnd",
            "nauticalDawn",
            "dawn",
            "nadir"
        ];
        // add script
        var script = {
            "common": {
                "name":         "getAstroDate",
                "engineType":   "Javascript/js",
                "source":       "",
                "enabled":      true,
                "engine":       "system.adapter.javascript.0"
            },
            "type":             "script",
            "_id":              "script.js.getAstroDate",
            "native": {}
        };
        for (var t = 0; t < types.length; t++) {
            script.common.source += "createState('" + types[t] + "', getAstroDate('" + types[t] + "') ? getAstroDate('" + types[t] + "').toString() : '');"
        }

        objects.setObject(script._id, script, function (err) {
            expect(err).to.be.not.ok;
            checkValueOfState('javascript.0.' + types[0], undefined, function (err) {
                expect(err).to.be.not.ok;
                var count = types.length;
                for (var t = 0; t < types.length; t++) {
                    states.getState('javascript.0.' + types[t], function (err, state) {
                        expect(err).to.be.not.ok;
                        expect(state).to.be.ok;
                        expect(state.val).to.be.ok;
                        console.log(types[types.length - count] + ': ' + state.val);
                        if (!--count) done();
                    });
                }
            });
        });
    });

    it('Test JS: test setStateDelayed simple', function (done) {
        this.timeout(5000);
        // add script
        var script = {
            "common": {
                "name":         "setStateDelayed",
                "engineType":   "Javascript/js",
                "source":       "createState('delayed', 4, function () {setStateDelayed('delayed', 5, 1000);});",
                "enabled":      true,
                "engine":       "system.adapter.javascript.0"
            },
            "type":             "script",
            "_id":              "script.js.setStateDelayed",
            "native": {}
        };

        objects.setObject(script._id, script, function (err) {
            expect(err).to.be.not.ok;
            checkValueOfState('javascript.0.delayed', 4, function (err) {
                expect(err).to.be.not.ok;
                states.getState('javascript.0.delayed', function (err, stateStart) {
                    expect(err).to.be.not.ok;
                    checkValueOfState('javascript.0.delayed', 5, function (err) {
                        expect(err).to.be.not.ok;
                        states.getState('javascript.0.delayed', function (err, stateStop) {
                            expect(err).to.be.not.ok;
                            expect(stateStop.ts - stateStart.ts).to.be.equal(1);
                            done();
                        });
                    });
                });
            });
        });
    });

    it('Test JS: test setStateDelayed nested', function (done) {
        this.timeout(5000);
        // add script
        var script = {
            "common": {
                "name":         "setStateDelayed",
                "engineType":   "Javascript/js",
                "source":       "setStateDelayed('delayed', 6, 500); setStateDelayed('delayed', 7, 1500, false);",
                "enabled":      true,
                "engine":       "system.adapter.javascript.0"
            },
            "type":             "script",
            "_id":              "script.js.setStateDelayed",
            "native": {}
        };

        objects.setObject(script._id, script, function (err) {
            expect(err).to.be.not.ok;
            checkValueOfState('javascript.0.delayed', 6, function (err) {
                expect(err).to.be.not.ok;
                states.getState('javascript.0.delayed', function (err, stateStart) {
                    expect(err).to.be.not.ok;
                    checkValueOfState('javascript.0.delayed', 7, function (err) {
                        expect(err).to.be.not.ok;
                        states.getState('javascript.0.delayed', function (err, stateStop) {
                            expect(err).to.be.not.ok;
                            expect(stateStop.ts - stateStart.ts).to.be.equal(1);
                            done();
                        });
                    });
                });
            });
        });
    });

    it('Test JS: test setStateDelayed overwritten', function (done) {
        this.timeout(5000);
        // add script
        var script = {
            "common": {
                "name":         "setStateDelayed",
                "engineType":   "Javascript/js",
                "source":       "setStateDelayed('delayed', 8, 500); setStateDelayed('delayed', 9, 1500);",
                "enabled":      true,
                "engine":       "system.adapter.javascript.0"
            },
            "type":             "script",
            "_id":              "script.js.setStateDelayed",
            "native": {}
        };

        objects.setObject(script._id, script, function (err) {
            expect(err).to.be.not.ok;
            checkValueOfState('javascript.0.delayed', 8, function (err) {
                expect(err).to.be.ok;

                states.getState('javascript.0.delayed', function (err, stateStart) {
                    expect(err).to.be.not.ok;
                    expect(stateStart.val).to.be.not.equal(8);

                    checkValueOfState('javascript.0.delayed', 9, function (err) {
                        expect(err).to.be.not.ok;
                        states.getState('javascript.0.delayed', function (err, stateStop) {
                            expect(err).to.be.not.ok;
                            done();
                        });
                    });
                });
            }, 18);
        });
    });

    it('Test JS: test setStateDelayed canceled', function (done) {
        this.timeout(5000);
        // add script
        var script = {
            "common": {
                "name":         "setStateDelayed",
                "engineType":   "Javascript/js",
                "source":       "setStateDelayed('delayed', 10, 500); clearStateDelayed('delayed');",
                "enabled":      true,
                "engine":       "system.adapter.javascript.0"
            },
            "type":             "script",
            "_id":              "script.js.setStateDelayed",
            "native": {}
        };

        objects.setObject(script._id, script, function (err) {
            expect(err).to.be.not.ok;

            checkValueOfState('javascript.0.delayed', 10, function (err) {
                expect(err).to.be.ok;

                states.getState('javascript.0.delayed', function (err, stateStart) {
                    expect(err).to.be.not.ok;
                    expect(stateStart.val).to.be.not.equal(10);
                    done();
                });
            }, 18);
        });
    });

    after('Test JS: Stop js-controller', function (done) {
        this.timeout(6000);

        setup.stopController(function (normalTerminated) {
            console.log('Adapter normal terminated: ' + normalTerminated);
            done();
        });
    });
});