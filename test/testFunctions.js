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
        this.timeout(20000);
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
        this.timeout(20000);
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

    after('Test JS: Stop js-controller', function (done) {
        this.timeout(6000);

        setup.stopController(function (normalTerminated) {
            console.log('Adapter normal terminated: ' + normalTerminated);
            done();
        });
    });
});