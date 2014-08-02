var vm =        require('vm');
var fs =        require('fs');
var cp =        require('child_process');

var scheduler = require('node-schedule');
var suncalc =   require('suncalc');
var request =   require('request');
var wol =       require('wake_on_lan');

var adapter =   require(__dirname + '/../../lib/adapter.js')({

    name:           'javascript',

    objectChange: function (id, obj) {
        objects[id] = obj;
    },

    stateChange: function (id, state) {

        var oldState = states[id] || {};
        states[id] = state;

        var name;

        var common = {};
        var native = {};

        var channelId =     null;
        var channelName =   null;
        var deviceId =      null;
        var deviceName =    null;

        if (objects[id]) {
            name =      objects[id].common ? objects[id].common.name : null;
            common =    objects[id].common;
            native =    objects[id].native;
            channelId = objects[id].parent;
        }

        if (channelId) {
            if (objects[channelId]) {
                channelName = objects[channelId].common ? objects[channelId].common.name : null;
                if (objects[channelId].parent) {
                    deviceId = objects[channelId] ? objects[channelId].parent : null;
                    deviceName = objects[channelId] && objects[deviceId].common ? objects[deviceId].common.name : null;
                }
            }
        }

        // TODO find enum memberships

        var eventObj = {
            id:             id,
            name:           name,
            common:         common,
            native:         native,
            channelId:      channelId,
            channelName:    channelName,
            deviceId:       deviceId,
            deviceName:     deviceName,
            enumIds:        null,       // Array of Strings
            enumNames:      null,       // Array of Strings
            newState: {
                val:        state.val,
                ts:         state.ts,
                ack:        state.ack,
                lc:         state.lc,
                from:       state.from
            },
            oldState: {
                val:        oldState.val,
                ts:         oldState.ts,
                ack:        oldState.ack,
                lc:         oldState.lc,
                from:       oldState.from
            }

        };

        for (var i = 0, l = subscriptions.length; i < l; i++) {
            if (patternMatching(eventObj, subscriptions[i].pattern)) {
                subscriptions[i].callback(eventObj);
            }
        }

    },

    unload: function (callback) {
        callback();
    },

    ready: function () {
        getData(function () {
            adapter.subscribeForeignObjects('*');
            adapter.subscribeForeignStates('*');

            adapter.objects.getObjectView('script', 'javascript', {}, function (err, doc) {
                for (var i = 0; i < doc.rows.length; i++) {
                    load(doc.rows[i].id);

                }
            });

        });
    }

});

var objects =       {};
var states =        {};
var scripts =       {};
var subscriptions = [];

function compile(source, name) {
    source += "\n;\nlog('registered ' + engine.subscriptions + ' subscription' + (engine.subscriptions === 1 ? '' : 's' ) + ' and ' + engine.schedules + ' schedule' + (engine.schedules === 1 ? '' : 's' ));\n";
    try {
        return vm.createScript(source, name);
    } catch (e) {
        adapter.log.error(name + ' compile failed: ' + e);
        return false;
    }
}

function execute(script, name) {
    var sandbox = {
        fs:         fs,
        request:    request,
        wol:        wol,
        engine: {
            subscriptions: 0,
            schedules: 0
        },
        log: function (msg, sev) {
            if (!sev) sev = 'info';
            adapter.log[sev](name + ': ' + msg);
        },
        exec: function (cmd, callback) {
            return cp.exec(cmd, callback);
        },
        email: function () {

        },
        pushover: function () {

        },
        subscribe: function (pattern, callbackOrId, value) {

            var callback;

            sandbox.engine.subscriptions += 1;

            if (typeof pattern !== 'object') {
                pattern = {id: pattern, change: 'ne'};
            }

            if (typeof callbackOrId === 'function') {
                callback = callbackOrId;
            } else {
                var that = this;
                if (typeof value === 'undefined') {
                    callback = function (obj) {
                        that.setState(callbackOrId, adapter.getForeignState(obj.id));
                    };
                } else {
                    callback = function (obj) {
                        that.setState(callbackOrId, value);
                    };
                }
            }

            subscriptions.push({
                pattern:    pattern,
                callback:   callback
            });

        },
        on: this.subscribe,
        schedule: function (pattern, callback) {

            if (typeof callback !== 'function') {
                adapter.log.error(name + ': schedule callback missing');
                return;
            }

            sandbox.engine.schedules += 1;
            var sch;

            if (pattern.astro) {

                var date = new Date();
                var ts = suncalc.getTimes(date, adapter.config.latitude, adapter.config.longitude)[pattern.astro];

                if (!ts) {
                    // Event doesn't occur - try again tomorrow
                    sch = scheduler.scheduleJob(ts, function () {
                        setTimeout(function () {
                            sch = schedule(pattern, callback);
                        }, 86400000);
                    });
                    return sch;
                }

                if (pattern.shift) {
                    ts = new Date(ts.getTime() + (pattern.shift * 60000));
                }

                if (ts < date) {
                    // Event is in the past - schedule for tomorrow
                    date = new Date(date.getTime() + 86400000);
                    ts = suncalc.getTimes(date, adapter.config.latitude, adapter.config.longitude)[pattern.astro];
                    if (pattern.shift) {
                        ts = new Date(ts.getTime() + (pattern.shift * 60000));
                    }
                }

                sch = scheduler.scheduleJob(ts, function () {
                    // Astro-Event triggered - schedule again for next day
                    setTimeout(function (sch) {
                        sch = schedule(pattern, callback);
                    }, 1000);
                    callback();
                });

            } else {

                sch = scheduler.scheduleJob(pattern, callback);

            }

            return sch;

        },
        setState: function (id, state, callback) {
            adapter.setState(id, state, function () {
                if (typeof callback === 'function') callback();
            });
        },
        getState: function (id) {
            return states[id];
        }
    };

    try {

        script.runInNewContext(sandbox);

    } catch (e) {

        var lines = e.stack.split('\n');
        var stack = [];
        for (var i = 0; i < lines.length; i++) {
            if (lines[i].match(/runInNewContext/)) break;
            stack.push(lines[i]);
        }
        adapter.log.error(name + ': ' + stack.join('\n'));

    }
}

function load(name) {

    adapter.getForeignObject(name, function (err, obj) {
        if (!err && obj.common.enabled && obj.common.engine === 'system.adapter.' + adapter.namespace && obj.common.source && obj.common.platform.match(/[jJ]avascript/)) {
            scripts[name] = compile(obj.common.source, name);
            if (scripts[name]) execute(scripts[name], name);
        }
    });

}

function patternMatching(event, pattern) {



    if (!pattern.logic) {
        pattern.logic = "and";
    }

    var matched = false;

    // state id matching
    if (pattern.id && pattern.id === event.id) {
        if (pattern.logic == "or") return true;
        matched = true;
    } else if (pattern.id) {
        if (pattern.logic == "and") return false;
    }

    // change matching
    if (pattern.change) {
        switch (pattern.change) {
            case "eq":
                if (event.newState.val === event.oldState.val) {
                    if (pattern.logic === "or") return true;
                    matched = true;
                } else {
                    if (pattern.logic === "and") return false;
                }
                break;
            case "ne":
                if (event.newState.val !== event.oldState.val) {
                    if (pattern.logic === "or") return true;
                    matched = true;
                } else {
                    if (pattern.logic === "and") return false;
                }
                break;
            case "gt":
                if (event.newState.val > event.oldState.val) {
                    if (pattern.logic === "or") return true;
                    matched = true;
                } else {
                    if (pattern.logic === "and") return false;
                }
                break;
            case "ge":
                if (event.newState.val >= event.oldState.val) {
                    if (pattern.logic === "or") return true;
                    matched = true;
                } else {
                    if (pattern.logic === "and") return false;
                }
                break;
            case "lt":
                if (event.newState.val < event.oldState.val) {
                    if (pattern.logic === "or") return true;
                    matched = true;
                } else {
                    if (pattern.logic === "and") return false;
                }
                break;
            case "le":
                if (event.newState.val <= event.oldState.val) {
                    if (pattern.logic === "or") return true;
                    matched = true;
                } else {
                    if (pattern.logic === "and") return false;
                }
                break;
            default:
        }
    }

    // Value Matching
    if (pattern.val !== undefined && pattern.val === event.newState.val) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.val !== undefined) {
        if (pattern.logic === "and") return false;
    }
    if (pattern.valGt !== undefined && event.newState.val > pattern.valGt) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.valGt !== undefined) {
        if (pattern.logic === "and") return false;
    }
    if (pattern.valGe !== undefined && event.newState.val >= pattern.valGe) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.valGe !== undefined) {
        if (pattern.logic === "and") return false;
    }
    if (pattern.valLt !== undefined && event.newState.val < pattern.valLt) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.valLt !== undefined) {
        if (pattern.logic === "and") return false;
    }
    if (pattern.valLe !== undefined && event.newState.val <= pattern.valLe) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.valLe !== undefined) {
        if (pattern.logic === "and") return false;
    }
    if (pattern.valNe !== undefined && event.newState.val !== pattern.valNe) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.valNe !== undefined) {
        if (pattern.logic === "and") return false;
    }

    // Old-Value matching
    if (pattern.oldVal !== undefined && pattern.oldVal === event.oldState.val) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.oldVal !== undefined) {
        if (pattern.logic === "and") return false;
    }
    if (pattern.oldValGt !== undefined && event.oldState.val > pattern.oldValGt) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.oldValGt !== undefined) {
        if (pattern.logic === "and") return false;
    }
    if (pattern.oldValGe !== undefined && event.oldState.val >= pattern.oldValGe) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.oldValGe !== undefined) {
        if (pattern.logic === "and") return false;
    }
    if (pattern.oldValLt !== undefined && event.oldState.val < pattern.oldValLt) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.oldValLt !== undefined) {
        if (pattern.logic === "and") return false;
    }
    if (pattern.oldValLe !== undefined && event.oldState.val <= pattern.oldValLe) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.oldValLe !== undefined) {
        if (pattern.logic === "and") return false;
    }
    if (pattern.oldValNe !== undefined && event.oldState.val !== pattern.oldValNe) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.oldValNe !== undefined) {
        if (pattern.logic === "and") return false;
    }

    // newState.ts matching
    if (pattern.ts && pattern.ts === event.newState.ts) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.ts) {
        if (pattern.logic === "and") return false;
    }
    if (pattern.tsGt && event.newState.ts > pattern.tsGt) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.tsGt) {
        if (pattern.logic === "and") return false;
    }
    if (pattern.tsGe && event.newState.ts >= pattern.tsGe) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.tsGe) {
        if (pattern.logic === "and") return false;
    }
    if (pattern.tsLt && event.newState.ts < pattern.tsLt) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.tsLt) {
        if (pattern.logic === "and") return false;
    }
    if (pattern.tsLe && event.newState.ts <= pattern.tsLe) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.tsLe) {
        if (pattern.logic === "and") return false;
    }

    // oldState.ts matching
    if (pattern.oldTs && pattern.oldTs === event.oldState.ts) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.oldTs) {
        if (pattern.logic === "and") return false;
    }
    if (pattern.oldTsGt && event.oldState.ts > pattern.oldTsGt) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.oldTsGt) {
        if (pattern.logic === "and") return false;
    }
    if (pattern.oldTsGe && event.oldState.ts >= pattern.oldTsGe) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.oldTsGe) {
        if (pattern.logic === "and") return false;
    }
    if (pattern.oldTsLt && event.oldState.ts < pattern.oldTsLt) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.oldTsLt) {
        if (pattern.logic === "and") return false;
    }
    if (pattern.oldTsLe && event.oldState.ts <= pattern.oldTsLe) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.oldTsLe) {
        if (pattern.logic === "and") return false;
    }

    // newState.lc matching
    if (pattern.lc && pattern.lc === event.newState.lc) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.lc) {
        if (pattern.logic === "and") return false;
    }
    if (pattern.lcGt && event.newState.lc > pattern.lcGt) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.lcGt) {
        if (pattern.logic === "and") return false;
    }
    if (pattern.lcGe && event.newState.lc >= pattern.lcGe) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.lcGe) {
        if (pattern.logic === "and") return false;
    }
    if (pattern.lcLt && event.newState.lc < pattern.lcLt) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.lcLt) {
        if (pattern.logic === "and") return false;
    }
    if (pattern.lcLe && event.newState.lc <= pattern.lcLe) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.lcLe) {
        if (pattern.logic === "and") return false;
    }

    // oldState.lc matching
    if (pattern.oldLc && pattern.oldLc === event.oldState.lc) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.oldLc) {
        if (pattern.logic === "and") return false;
    }
    if (pattern.oldLcGt && event.oldState.lc > pattern.oldLcGt) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.oldLcGt) {
        if (pattern.logic === "and") return false;
    }
    if (pattern.oldLcGe && event.oldState.lc >= pattern.oldLcGe) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.oldLcGe) {
        if (pattern.logic === "and") return false;
    }
    if (pattern.oldLcLt && event.oldState.lc < pattern.oldLcLt) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.oldLcLt) {
        if (pattern.logic === "and") return false;
    }
    if (pattern.oldLcLe && event.oldState.lc <= pattern.oldLcLe) {
        if (pattern.logic === "or") return true;
        matched = true;
    } else if (pattern.oldLcLe) {
        if (pattern.logic === "and") return false;
    }

    // newState.from matching

    // oldState.from matching

    // channelId matching

    // channelName matching

    // deviceId matching

    // deviceName matching

    // enumIds matching

    // enumNames matching



    return matched;

}


function getData(callback) {
    var statesReady;
    var objectsReady;
    adapter.log.info('requesting all states');
    adapter.getForeignStates('*', function (err, res) {
        states = res;
        statesReady = true;
        adapter.log.info('received all states');
        if (objectsReady && typeof callback === 'function') callback();
    });
    adapter.log.info('requesting all objects');
    adapter.objects.getObjectList({include_docs: true}, function (err, res) {
        res = res.rows;
        objects = {};
        for (var i = 0; i < res.length; i++) {
            objects[res[i].doc._id] = res[i].doc;
        }
        objectsReady = true;
        adapter.log.info('received all objects');
        if (statesReady && typeof callback === 'function') callback();
    });
}