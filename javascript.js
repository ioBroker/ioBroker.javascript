/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

(function () {

    var mods = {
        'vm':               require('vm'),
        'fs':               require('fs'),
        'dgram':            require('dgram'),
        'crypto':           require('crypto'),
        'dns':              require('dns'),
        'events':           require('events'),
        'http':             require('http'),
        'https':            require('https'),
        'net':              require('net'),
        'os':               require('os'),
        'path':             require('path'),
        'util':             require('util'),
        'child_process':    require('child_process'),

        'coffee-compiler':  require('coffee-compiler'),

        'node-schedule':    require('node-schedule'),
        'suncalc':          require('suncalc'),
        'request':          require('request'),
        'wake_on_lan':      require('wake_on_lan')
    };
    var utils =   require(__dirname + '/lib/utils'); // Get common adapter utils

    var adapter = utils.adapter({

        name: 'javascript',

        objectChange: function (id, obj) {
            if (!obj) {
                if (!objects[id]) return;

                // Script deleted => remove it
                if (objects[id].common.engine == 'system.adapter.' + adapter.namespace) stop(id);

                delete objects[id];
            } else if (!objects[id]) {
                objects[id] = obj;

                if (obj.type != 'script' || obj.common.engine != 'system.adapter.' + adapter.namespace || !obj.common.enabled) return;
                // added new script to this engine

            } else {
                // Object just changed
                if (obj.type != 'script') {
                    objects[id] = obj;
                    return;
                }

                if ((objects[id].common.enabled && !obj.common.enabled) ||
                    (objects[id].common.engine == 'system.adapter.' + adapter.namespace && obj.common.engine != 'system.adapter.' + adapter.namespace)) {
                    // Script disabled
                    if (objects[id].common.enabled && objects[id].common.engine == 'system.adapter.' + adapter.namespace) {
                        // Remove it from executing
                        objects[id] = obj;
                        stop(id);
                    } else {
                        objects[id] = obj;
                    }
                } else
                if ((!objects[id].common.enabled && obj.common.enabled) ||
                    (objects[id].common.engine != 'system.adapter.' + adapter.namespace && obj.common.engine == 'system.adapter.' + adapter.namespace)) {
                    // Script enabled
                    objects[id] = obj;

                    if (objects[id].common.enabled && objects[id].common.engine == 'system.adapter.' + adapter.namespace) {
                        // Start script
                        load(id);
                    }
                } else { //if (obj.common.source != objects[id].common.source) {
                    objects[id] = obj;

                    // Source changed => restart it
                    stop(id, function (res, _id) {
                        load(_id);
                    });
                } /*else {
                    // Something changed or not for us
                    objects[id] = obj;
                }*/
            }
        },

        stateChange: function (id, state) {

            if (id.match(/^messagebox./) || id.match(/^log./)) return;

            var oldState = states[id] || {};
            if (state) {
                states[id] = state;
            } else {
                delete states[id];
                state = {};
            }

            var name;

            var common =        {};
            var nativeObj =     {};

            var channelId =     null;
            var channelName =   null;
            var deviceId =      null;
            var deviceName =    null;

            if (objects[id]) {
                name =          objects[id].common ? objects[id].common.name : null;
                common =        objects[id].common;
                nativeObj =     objects[id].native;
                channelId =     objects[id].parent;
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

            getObjectEnums(id, function (enumIds, enumNames) {
                var eventObj = {
                    id:             id,
                    name:           name,
                    common:         common,
                    native:         nativeObj,
                    channelId:      channelId,
                    channelName:    channelName,
                    deviceId:       deviceId,
                    deviceName:     deviceName,
                    enumIds:        enumIds,       // Array of Strings
                    enumNames:      enumNames,       // Array of Strings
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
            });
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
                        load(doc.rows[i].value._id);
                    }
                });

            });

        }

    });

    var objects =           {};
    var states =            {};
    var scripts =           {};
    var subscriptions =     [];
    var enums =             [];
    var cacheObjectEnums =  {};
    var channels =          null;
    var devices =           null;

    function compile(source, name) {
        source += "\n;\nlog('registered ' + __engine.__subscriptions + ' subscription' + (__engine.__subscriptions === 1 ? '' : 's' ) + ' and ' + __engine.__schedules + ' schedule' + (__engine.__schedules === 1 ? '' : 's' ));\n";
        try {
            return mods.vm.createScript(source, name);
        } catch (e) {
            adapter.log.error(name + ' compile failed: ' + e);
            return false;
        }
    }

    function execute(script, name) {
        script.intervals = [];
        script.timeouts  = [];
        script.schedules = [];
        script.name      = name;
        script._id       = Math.floor(Math.random() * 0xFFFFFFFF);

        var sandbox = {
            mods:      mods,
            _id:       script._id,
            require:   function (md) {
                if (mods[md]) return mods[md];
                try {
                    mods[md] = require(__dirname + '/node_modules/' + md);
                    return mods[md];
                } catch (e) {
                    var lines = e.stack.split('\n');
                    var stack = [];
                    for (var i = 6; i < lines.length; i++) {
                        if (lines[i].match(/runInNewContext/)) break;
                        stack.push(lines[i]);
                    }
                    adapter.log.error(name + ': ' + e.message + '\n' + stack);

                }
            },
            Buffer:    Buffer,
            __engine:  {
                        __subscriptions: 0,
                        __schedules: 0
            },
            $:         function (selector) {
                // following is supported
                // 'type[commonAttr=something]', 'id[commonAttr=something]', id(enumName="something")', id{nativeName="something"}
                // Type can be state, channel or device
                // Attr can be any of the common attributes and can have wildcards *
                // E.g. "state[id='hm-rpc.0.*]" or "hm-rpc.0.*" returns all states of adapter instance hm-rpc.0
                // channel(room="Living room") => all states in room "Living room"
                // channel{TYPE=BLIND}[state.id=*.LEVEL]
                // Switch all states with .STATE of channels with role "switch" in "Wohnzimmer" to false
                // $('channel[role=switch][state.id=*.STATE](rooms=Wohnzimmer)').setState(false);
                //
                // Following functions are possible, setValue, getValue (only from first), on, each

                // Todo CACHE!!!

                var name      = '';
                var commons   = [];
                var _enums    = [];
                var natives   = [];
                var isName    = true;
                var isCommons = false;
                var isEnums   = false;
                var isNatives = false;
                var common    = '';
                var native    = '';
                var _enum     = '';
                var parts;
                var len;

                // parse string
                for (var i = 0; i < selector.length; i++) {
                    if (selector[i] == '{') {
                        isName = false;
                        if (isCommons || isEnums || isNatives) {
                            // Error
                            return [];
                        }
                        isNatives = true;
                    } else
                    if (selector[i] == '}') {
                        isNatives = false;
                        natives.push(native);
                        native = '';
                    } else
                    if (selector[i] == '[') {
                        isName = false;
                        if (isCommons || isEnums || isNatives) {
                            // Error
                            return [];
                        }
                        isCommons = true;
                    } else
                    if (selector[i] == ']') {
                        isCommons = false;
                        commons.push(common);
                        common = '';
                    }else
                    if (selector[i] == '(') {
                        isName = false;
                        if (isCommons || isEnums || isNatives) {
                            // Error
                            return [];
                        }
                        isEnums = true;
                    } else
                    if (selector[i] == ')') {
                        isEnums = false;
                        _enums.push(_enum);
                        _enum = '';
                    } else
                    if (isName)    {
                        name    += selector[i];
                    } else
                    if (isCommons) {
                        common  += selector[i];
                    } else
                    if (isEnums)  {
                        _enum += selector[i];
                    } else
                    if (isNatives) {
                        native  += selector[i];
                    } //else {
                        // some error
                    //}
                }

                var filterStates = [];

                for (i = 0; i < commons.length; i++) {
                    parts = commons[i].split('=', 2);
                    if (parts[1] && parts[1][0] == '"') {
                        parts[1] = parts[1].substring(1);
                        len = parts[1].length;
                        if (parts[1] && parts[1][len - 1] == '"') parts[1] = parts[1].substring(0, len - 1);
                    }
                    if (parts[1] && parts[1][0] == "'") {
                        parts[1] = parts[1].substring(1);
                        len = parts[1].length;
                        if (parts[1] && parts[1][len - 1] == "'") parts[1] = parts[1].substring(0, len - 1);
                    }

                    if (parts[1]) parts[1] = parts[1].trim();
                    parts[0] = parts[0].trim();

                    if (parts[0] == 'state.id') {
                        filterStates.push({attr: parts[0], value: parts[1].trim()});
                        commons[i] = null;
                    } else {
                        commons[i] = {attr: parts[0], value: parts[1].trim()};
                    }
                }

                for (i = 0; i < natives.length; i++) {
                    parts = natives[i].split('=', 2);
                    if (parts[1] && parts[1][0] == '"') {
                        parts[1] = parts[1].substring(1);
                        len = parts[1].length;
                        if (parts[1] && parts[1][len - 1] == '"') parts[1] = parts[1].substring(0, len - 1);
                    }
                    if (parts[1] && parts[1][0] == "'") {
                        parts[1] = parts[1].substring(1);
                        len = parts[1].length;
                        if (parts[1] && parts[1][len - 1] == "'") parts[1] = parts[1].substring(0, len - 1);
                    }

                    if (parts[1]) parts[1] = parts[1].trim();
                    parts[0] = parts[0].trim();
                    if (parts[0] == 'state.id') {
                        filterStates.push({attr: parts[0], value: parts[1].trim()});
                        natives[i] = null;
                    } else {
                        natives[i] = {attr: parts[0].trim(), value: parts[1].trim()};
                    }
                }

                for (i = 0; i < _enums.length; i++) {
                    parts = _enums[i].split('=', 2);
                    if (parts[1] && parts[1][0] == '"') {
                        parts[1] = parts[1].substring(1);
                        len = parts[1].length;
                        if (parts[1] && parts[1][len - 1] == '"') parts[1] = parts[1].substring(0, len - 1);
                    }
                    if (parts[1] && parts[1][0] == "'") {
                        parts[1] = parts[1].substring(1);
                        len = parts[1].length;
                        if (parts[1] && parts[1][len - 1] == "'") parts[1] = parts[1].substring(0, len - 1);
                    }

                    if (parts[1]) parts[1] = parts[1].trim();
                    parts[0] = parts[0].trim();
                    if (parts[0] == 'state.id') {
                        filterStates.push({attr: parts[0], value: parts[1].trim()});
                        _enums[i] = null;
                    } else {
                        _enums[i] = 'enum.' + parts[0].trim() + '.' + parts[1].trim();
                    }
                }

                name = name.trim();
                if (name == 'channel' || name == 'device') {
                    // Fill channels
                    if (!channels || !devices) {
                        channels = [];
                        devices  = [];
                        for (var _id in objects) {
                            if (objects[_id].type == 'state') {
                                parts = _id.split('.');
                                parts.pop();
                                var chn = parts.join('.');

                                parts.pop();
                                var dev =  parts.join('.');

                                devices[dev] = devices[dev] || [];
                                devices[dev].push(_id);

                                channels[chn] = channels[chn] || [];
                                channels[chn].push(_id);
                            }
                        }
                    }
                }

                var res = [];
                var resIndex = 0;
                var id;
                var s;
                var pass;
                if (name == 'channel') {
                    for (id in channels) {
                        if (!objects[id]) {
                            console.log(id);
                            continue;
                        }
                        pass = true;
                        for (var c = 0; c < commons.length; c++) {
                            if (!commons[c]) continue;
                            if (commons[c].attr == 'id') {
                                if (!commons[c].r && commons[c].value) commons[c].r = new RegExp('^' + commons[c].value.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
                                if (!commons[c].r || commons[c].r.test(id)) continue;
                            } else if (objects[id].common) {
                                if (commons[c].value === undefined && objects[id].common[commons[c].attr] !== undefined) continue;
                                if (objects[id].common[commons[c].attr] == commons[c].value) continue;
                            }
                            pass = false;
                            break;
                        }
                        if (!pass) continue;
                        for (var n = 0; n < natives.length; n++) {
                            if (!natives[n]) continue;
                            if (natives[n].attr == 'id') {
                                if (!natives[n].r && natives[n].value) natives[n].r = new RegExp('^' + natives[n].value.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
                                if (!natives[n].r || natives[n].r.test(id)) continue;
                            } else if (objects[id].native) {
                                if (natives[n].value === undefined && objects[id].native[natives[n].attr] !== undefined) continue;
                                if (objects[id].native[natives[n].attr] == natives[n].value) continue;
                            }
                            pass = false;
                            break;
                        }
                        if (!pass) continue;

                        if (_enums.length) {
                            var _e = getObjectEnumsSync(id);

                            for (var m = 0; m < _enums.length; m++) {
                                if (!_enums[m]) continue;
                                if (_e.enumIds.indexOf(_enums[m]) != -1) continue;
                                pass = false;
                                break;
                            }
                            if (!pass) continue;
                        }

                        // Add all states of this channel to list
                        for (s = 0; s < channels[id].length; s++) {
                            if (filterStates.length) {
                                pass = true;
                                for (var st = 0; st < filterStates.length; st++) {
                                    if (!filterStates[st].r && filterStates[st].value) filterStates[st].r = new RegExp(filterStates[st].value.replace(/\./g, '\\.').replace(/\*/g, '.*'));
                                    if (!filterStates[st].r || filterStates[st].r.test(channels[id][s])) continue;
                                    pass = false;
                                    break;
                                }
                                if (!pass) continue;
                            }
                            res.push(channels[id][s]);
                        }
                    }
                } else if (name == 'device') {
                    for (id in devices) {
                        if (!objects[id]) {
                            console.log(id);
                            continue;
                        }
                        pass = true;
                        for (var _c = 0; _c < commons.length; _c++) {
                            if (!commons[_c]) continue;
                            if (commons[_c].attr == 'id') {
                                if (!commons[_c].r && commons[_c].value) commons[_c].r = new RegExp('^' + commons[_c].value.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
                                if (!commons[_c].r || commons[_c].r.test(id)) continue;
                            } else if (objects[id].common) {
                                if (commons[_c].value === undefined && objects[id].common[commons[_c].attr] !== undefined) continue;
                                if (objects[id].common[commons[_c].attr] == commons[_c].value) continue;
                            }
                            pass = false;
                            break;
                        }
                        if (!pass) continue;
                        for (var n = 0; n < natives.length; n++) {
                            if (!natives[n]) continue;
                            if (natives[n].attr == 'id') {
                                if (!natives[n].r && natives[n].value) natives[n].r = new RegExp('^' + natives[n].value.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
                                if (!natives[n].r || natives[n].r.test(id)) continue;
                            } else if (objects[id].native) {
                                if (natives[n].value === undefined && objects[id].native[natives[n].attr] !== undefined) continue;
                                if (objects[i].native[natives[n].attr] == natives[n].value) continue;
                            }
                            pass = false;
                            break;
                        }
                        if (!pass) continue;

                        if (_enums.length) {
                            var _e = getObjectEnumsSync(id);

                            for (var n = 0; n < _enums.length; n++) {
                                if (!_enums[n]) continue;
                                if (_e.enumIds.indexOf(_enums[n]) != -1) continue;
                                pass = false;
                                break;
                            }
                            if (!pass) continue;
                        }

                        // Add all states of this channel to list
                        for (s = 0; s < devices[id].length; s++) {
                            if (filterStates.length) {
                                pass = true;
                                for (var st = 0; st < filterStates.length; st++) {
                                    if (!filterStates[st].r && filterStates[st].value) filterStates[st].r = new RegExp(filterStates[st].value.replace(/\./g, '\\.').replace(/\*/g, '.*'));
                                    if (!filterStates[st].r || filterStates[st].r.test(devices[id][s])) continue;
                                    pass = false;
                                    break;
                                }
                                if (!pass) continue;
                            }
                            res.push(devices[id][s]);
                        }
                    }
                } else {
                    var r = (name && name != 'state') ? new RegExp('^' + name.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$') : null;

                    // state
                    for (id in states) {
                        if (r && !r.test(id)) continue;
                        pass = true;

                        if (commons.length) {
                            for (var c = 0; c < commons.length; c++) {
                                if (!commons[c]) continue;
                                if (commons[c].attr == 'id') {
                                    if (!commons[c].r && commons[c].value) commons[c].r = new RegExp(commons[c].value.replace(/\./g, '\\.').replace(/\*/g, '.*'));
                                    if (!commons[c].r || commons[c].r.test(id)) continue;
                                } else if (objects[id].common) {
                                    if (commons[c].value === undefined && objects[id].common[commons[c].attr] !== undefined) continue;
                                    if (objects[id].common[commons[c].attr] == commons[c].value) continue;
                                }
                                pass = false;
                                break;
                            }
                            if (!pass) continue;
                        }
                        if (natives.length) {
                            for (var n = 0; n < natives.length; n++) {
                                if (!natives[n]) continue;
                                if (natives[n].attr == 'id') {
                                    if (!natives[n].r && natives[n].value) natives[id].r = new RegExp(natives[n].value.replace(/\./g, '\\.').replace(/\*/g, '.*'));
                                    if (!natives[n].r || natives[n].r.test(id)) continue;
                                } else if (objects[id].native) {
                                    if (natives[n].value === undefined && objects[id].native[natives[n].attr] !== undefined) continue;
                                    if (objects[id].native[natives[n].attr] == natives[n].value) continue;
                                }
                                pass = false;
                                break;
                            }
                            if (!pass) continue;
                        }

                        if (filterStates.length) {
                            for (var st = 0; st < filterStates.length; st++) {
                                if (!filterStates[st].r && filterStates[st].value) filterStates[st].r = new RegExp(filterStates[st].value.replace(/\./g, '\\.').replace(/\*/g, '.*'));
                                if (!filterStates[st].r || filterStates[st].r.test(id)) continue;
                                pass = false;
                                break;
                            }
                            if (!pass) continue;
                        }

                        if (_enums.length) {
                            var _e = getObjectEnumsSync(id);

                            for (var n = 0; n < _enums.length; n++) {
                                if (!_enums[n]) continue;
                                if (_e.enumIds.indexOf(_enums[n]) != -1) continue;
                                pass = false;
                                break;
                            }
                            if (!pass) continue;
                        }
                        // Add all states of this channel to list
                        res.push(id);
                    }

                    // Now filter away by name
                }

                var result = {};
                for (i = 0; i < res.length; i++) {
                    result[i] = res[i];
                }
                result.length = res.length;
                result.each = function (callback) {
                    for (var i = 0; i < this.length; i++) {
                        if (typeof callback == 'function') callback(result[i], i);
                    }
                    return this;
                };
                result.getState = function () {
                    if (this[0]) return states[this[0]];
                    return this;
                };
                result.setState = function (state, isAck, callback) {
                    if (typeof isAck == 'function') {
                        callback = isAck;
                        isAck = undefined;
                    }

                    if (isAck === true || isAck === false || isAck === 'true' || isAck === 'false') {
                        if (typeof state == 'object') {
                            state.ack = isAck;
                        } else {
                            state = {val: state, ack: isAck};
                        }
                    }
                    var cnt = 0;
                    for (var i = 0; i < this.length; i++) {
                        cnt++;
                        adapter.setForeignState(this[i], state, function () {
                            cnt--;
                            if (!cnt && typeof callback === 'function') callback();
                        });
                    }
                    return this;
                };
                result.on = function (callbackOrId, value) {
                    for (var i = 0; i < this.length; i++) {
                        sandbox.subscribe(this[i], callbackOrId, value);
                    }
                    return this;
                };
                return result;
            },
            log:       function (msg, sev) {
                if (!sev) sev = 'info';
                adapter.log[sev](name + ': ' + msg);
            },
            exec:      function (cmd, callback) {
                return mods.child_process.exec(cmd, callback);
            },
            email:     function (msg) {
                adapter.sendTo('email', msg);
            },
            pushover:  function (msg) {
                adapter.sendTo('pushover', msg);
            },
            subscribe: function (pattern, callbackOrId, value) {

                var callback;

                sandbox.__engine.__subscriptions += 1;

                if (typeof pattern !== 'object') {
                    pattern = {id: pattern, change: 'ne'};
                }

                if (typeof callbackOrId === 'function') {
                    callback = callbackOrId;
                } else {
                    var that = this;
                    if (typeof value === 'undefined') {
                        callback = function (obj) {
                            that.setState(callbackOrId, obj.newState.val);
                        };
                    } else {
                        callback = function (obj) {
                            that.setState(callbackOrId, value);
                        };
                    }
                }

                subscriptions.push({
                    pattern:  pattern,
                    callback: function (obj) {
                        if (callback) callback.call(sandbox, obj);
                    },
                    name:     name
                });
            },
            on:        function (pattern, callbackOrId, value) {
                return sandbox.subscribe(pattern, callbackOrId, value);
            },
            schedule:  function (pattern, callback) {

                if (typeof callback !== 'function') {
                    adapter.log.error(name + ': schedule callback missing');
                    return;
                }

                sandbox.__engine.__schedules += 1;

                if (pattern.astro) {

                    var date    = new Date();
                    var nowdate = new Date();

                    var ts = mods.suncalc.getTimes(date, adapter.config.latitude, adapter.config.longitude)[pattern.astro];

                    if (ts && pattern.shift) {
                        ts = new Date(ts.getTime() + (pattern.shift * 60000));
                    }

                    if (!ts || ts < date) {
                        // Event doesn't occur today - try again tomorrow
                        // Calculate time till 24:00 and set timeout
                        date.setDate(date.getDate() + 1);
                        date.setMinutes(0);
                        date.setHours(0);
                        date.setSeconds(0);
                        date.setMilliseconds(0);

                        // Calculate new schedule in the next day
                        sandbox.setTimeout(function () {
                            if (sandbox.__engine.__schedules > 0) sandbox.__engine.__schedules--;

                            sandbox.schedule(pattern, callback);
                        }, date.getTime() - nowdate.getTime());

                        return;
                    }

                    sandbox.setTimeout(function () {
                        callback.call(sandbox);

                        sandbox.setTimeout(function () {
                            if (sandbox.__engine.__schedules > 0) sandbox.__engine.__schedules--;
                            sandbox.schedule(pattern, function () {
                                callback.call(sandbox);
                            });
                        }, 1000);

                    }, ts.getTime() - nowdate.getTime());
                } else {
                    script.schedules.push(mods['node-schedule'].scheduleJob(pattern, function () {
                        callback.call(sandbox);
                    }));
                }
            },
            setState:  function (id, state, isAck, callback) {
                if (typeof isAck == 'function') {
                    callback = isAck;
                    isAck = undefined;
                }

                if (isAck === true || isAck === false || isAck === 'true' || isAck === 'false') {
                    if (typeof state == 'object') {
                        state.ack = isAck;
                    } else {
                        state = {val: state, ack: isAck};
                    }
                }

                if (states[id]) {
                    adapter.setForeignState(id, state, function () {
                        if (typeof callback === 'function') callback();
                    });
                } else if (states[adapter.namespace + '.' + id]) {
                    adapter.setState(id, state, function () {
                        if (typeof callback === 'function') callback();
                    });
                } else {
                    adapter.log.warn('State "' + id + '" not found');
                    if (typeof callback === 'function') callback('State "' + id + '" not found');
                }
            },
            getState:  function (id) {
                if (states[id]) return states[id];
                if (states[adapter.namespace + '.' + id]) return states[adapter.namespace + '.' + id];
                adapter.log.warn('State "' + id + '" not found');
                return null;
            },
            getObject: function (id) {
                return objects[id];
            },
            createState: function (name, initValue, forceCreation, callback) {
                if (typeof initValue == 'function') {
                    callback  = initValue;
                    initValue = undefined;
                }
                if (typeof forceCreation == 'function') {
                    callback  = forceCreation;
                    forceCreation = undefined;
                }
                if (forceCreation) {
                    adapter.setObject(name, {
                        common: {
                            name: name,
                            role: 'javascript'
                        },
                        native: {},
                        type: 'state'
                    }, function () {
                        if (initValue !== undefined) {
                            adapter.setState(name, initValue, callback);
                        } else {
                            if (callback) callback(name);
                        }
                    });
                } else {
                    adapter.getObject(name, function (err, obj) {
                        if (err || !obj) {
                            adapter.setObject(name, {
                                common: {
                                    name: name,
                                    role: 'javascript'
                                },
                                native: {},
                                type: 'state'
                            }, function () {
                                if (initValue !== undefined) {
                                    adapter.setState(name, initValue, callback);
                                } else {
                                    if (callback) callback(name);
                                }
                            });
                        } else {
                            // state yet exists
                            if (callback) callback(name);
                        }
                    });
                }
            },
            sendTo:    function (adapter, cmd, msg, callback) {
                adapter.sendTo(adapter, cmd, msg, callback);
            },
            setInterval:   function (callback, ms, arg1, arg2, arg3, arg4) {
                var int = setInterval(function (_arg1, _arg2, _arg3, _arg4) {
                    if (callback) callback.call(sandbox, _arg1, _arg2, _arg3, _arg4);
                }, ms, arg1, arg2, arg3, arg4);
                script.intervals.push(int);
                return int;
            },
            clearInterval: function (id) {
                var pos = script.intervals.indexOf(id);
                if (pos != -1) {
                    clearInterval(id);
                    script.intervals.splice(pos, 1);
                }
            },
            setTimeout:    function (callback, ms, arg1, arg2, arg3, arg4) {
                var to = setTimeout(function (_arg1, _arg2, _arg3, _arg4) {
                    // Remove timeout from the list
                    var pos = script.timeouts.indexOf(to);
                    if (pos != -1) script.timeouts.splice(pos, 1);

                    if (callback) callback.call(sandbox, _arg1, _arg2, _arg3, _arg4);
                }, ms, arg1, arg2, arg3, arg4);
                script.timeouts.push(to);
                return to;
            },
            clearTimeout:  function (id) {
                var pos = script.timeouts.indexOf(id);
                if (pos != -1) {
                    clearTimeout(id);
                    script.timeouts.splice(pos, 1);
                }
            },
            cb:        function (callback) {
                return function () {
                    if (scripts[name] && scripts[name]._id == sandbox._id) {
                        if (callback) callback.apply(this, arguments);
                    } else {
                        adapter.log.warn('Callback for old version of script: ' + name);
                    }
                };
            },
            formatDate: function (date, format, isDataObject) {
                if (typeof format == 'boolean') {
                    isDataObject = format;
                    format = null;
                }

                if (!format) {
                    format = objects['system.config'] ? (objects['system.config'].common.dateFormat || 'DD.MM.YYYY') : 'DD.MM.YYYY';
                }

                return adapter.formatDate(date, !isDataObject, format);
            },
            writeFile: function (fileName, data, callback) {
                adapter.writeFile(null, fileName, data, callback);
            },
            readFile: function (fileName, callback) {
                adapter.readFile(null, fileName, callback);
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

    function stop(name, callback) {
        adapter.log.info('Stop script ' + name);
        if (scripts[name]) {
            // Remove from subscriptions
            for (var i = subscriptions.length - 1; i >= 0 ; i--) {
                if (subscriptions[i].name == name) {
                    subscriptions.splice(i, 1);
                }
            }
            // Stop all timeouts
            for (i = 0; i < scripts[name].timeouts.length; i++) {
                clearTimeout(scripts[name].timeouts[i]);
            }
            // Stop all intervals
            for (i = 0; i < scripts[name].intervals.length; i++) {
                clearInterval(scripts[name].intervals[i]);
            }
            // Stop all scheduled jobs
            for (i = 0; i < scripts[name].schedules.length; i++) {
                var _name = scripts[name].schedules[i].name;
                if (!mods['node-schedule'].cancelJob(scripts[name].schedules[i])) {
                    adapter.log.error('Error by canceling scheduled job "' + _name + '"');
                }
            }
            delete scripts[name];
            if (callback) callback(true, name);
        } else {
            if (callback) callback(false, name);
        }
    }

    function load(name, callback) {

        adapter.getForeignObject(name, function (err, obj) {
            if (!err && obj && obj.common.enabled && obj.common.engine === 'system.adapter.' + adapter.namespace && obj.common.source && obj.common.engineType.match(/^[jJ]ava[sS]cript/)) {
                // Javascript
                adapter.log.info('Start javascript ' + name);
                scripts[name] = compile(obj.common.source, name);
                if (scripts[name]) execute(scripts[name], name);
                if (callback) callback(true, name);
            } else if (!err && obj && obj.common.enabled && obj.common.engine === 'system.adapter.' + adapter.namespace && obj.common.source && obj.common.engineType.match(/^[cC]offee/)) {
                // CoffeeScript
                mods['coffee-compiler'].fromSource(obj.common.source, {sourceMap: false, bare: true}, function (err, js) {
                    if (err) {
                        adapter.log.error(name + ' coffee compile ' + err);
                        if (callback) callback(false, name);
                        return;
                    }
                    adapter.log.info('Start coffescript ' + name);
                    scripts[name] = compile(js, name);
                    if (scripts[name]) execute(scripts[name], name);
                    if (callback) callback(true, name);
                });
            } else {
                if (callback) callback(false, name);
            }
        });

    }

    function patternMatching(event, pattern) {

        if (!pattern.logic) {
            pattern.logic = "and";
        }

        var matched = false;

        // state id matching
        if (pattern.id) {
            if (pattern.id instanceof RegExp) {
                if (event.id && event.id.match(pattern.id)) {
                    if (pattern.logic === "or") return true;
                    matched = true;
                } else {
                    if (pattern.logic === "and") return false;
                }
            } else {
                if (event.id && pattern.id === event.id) {
                    if (pattern.logic === "or") return true;
                    matched = true;
                } else {
                    if (pattern.logic === "and") return false;
                }
            }
        }

        // state name matching
        if (pattern.name) {
            if (pattern.name instanceof RegExp) {
                if (event.common.name && event.common.name.match(pattern.id)) {
                    if (pattern.logic === "or") return true;
                    matched = true;
                } else {
                    if (pattern.logic === "and") return false;
                }
            } else {
                if (event.common.name && pattern.name === event.common.name) {
                    if (pattern.logic === "or") return true;
                    matched = true;
                } else {
                    if (pattern.logic === "and") return false;
                }
            }
        }

        // todo anchestor name matching

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
        if (pattern.from && pattern.from === event.newState.from) {
            if (pattern.logic == "or") return true;
            matched = true;
        } else if (pattern.from) {
            if (pattern.logic == "and") return false;
        }

        if (pattern.fromNe && pattern.fromNe !== event.newState.from) {
            if (pattern.logic == "or") return true;
            matched = true;
        } else if (pattern.fromNe) {
            if (pattern.logic == "and") return false;
        }

        // oldState.from matching
        if (pattern.oldFrom && pattern.oldFrom === event.oldState.from) {
            if (pattern.logic == "or") return true;
            matched = true;
        } else if (pattern.oldFrom) {
            if (pattern.logic == "and") return false;
        }

        if (pattern.oldFromNe && pattern.oldFromNe !== event.oldState.from) {
            if (pattern.logic == "or") return true;
            matched = true;
        } else if (pattern.oldFromNe) {
            if (pattern.logic == "and") return false;
        }

        // channelId matching
        if (pattern.channelId) {
            if (pattern.channelId instanceof RegExp) {
                if (event.channelId && event.channelId.match(pattern.channelId)) {
                    if (pattern.logic === "or") return true;
                    matched = true;
                } else {
                    if (pattern.logic === "and") return false;
                }
            } else {
                if (event.channelId && pattern.channelId === event.channelId) {
                    if (pattern.logic === "or") return true;
                    matched = true;
                } else {
                    if (pattern.logic === "and") return false;
                }
            }
        }

        // channelName matching
        if (pattern.channelName) {
            if (pattern.channelName instanceof RegExp) {
                if (event.channelName && event.channelName.match(pattern.channelName)) {
                    if (pattern.logic === "or") return true;
                    matched = true;
                } else {
                    if (pattern.logic === "and") return false;
                }
            } else {
                if (event.channelName && pattern.channelName === event.channelName) {
                    if (pattern.logic === "or") return true;
                    matched = true;
                } else {
                    if (pattern.logic === "and") return false;
                }
            }
        }

        // deviceId matching
        if (pattern.deviceId) {
            if (pattern.deviceId instanceof RegExp) {
                if (event.deviceId && event.deviceId.match(pattern.deviceId)) {
                    if (pattern.logic === "or") return true;
                    matched = true;
                } else {
                    if (pattern.logic === "and") return false;
                }
            } else {
                if (event.deviceId && pattern.deviceId === event.deviceId) {
                    if (pattern.logic === "or") return true;
                    matched = true;
                } else {
                    if (pattern.logic === "and") return false;
                }
            }
        }

        // deviceName matching
        if (pattern.deviceName) {
            if (pattern.deviceName instanceof RegExp) {
                if (event.deviceName && event.deviceName.match(pattern.deviceName)) {
                    if (pattern.logic === "or") return true;
                    matched = true;
                } else {
                    if (pattern.logic === "and") return false;
                }
            } else {
                if (event.deviceName && pattern.deviceName === event.deviceName) {
                    if (pattern.logic === "or") return true;
                    matched = true;
                } else {
                    if (pattern.logic === "and") return false;
                }
            }
        }
        var subMatched;

        // enumIds matching
        if (pattern.enumId) {
            if (pattern.enumId instanceof RegExp) {
                subMatched = false;
                for (var i = 0; i < event.enumIds.length; i++) {
                    if (event.enumIds[i].match(pattern.enumId)) {
                        subMatched = true;
                        break;
                    }
                }
                if (subMatched) {
                    if (pattern.logic === "or") return true;
                    matched = true;
                } else {
                    if (pattern.logic === "and") return false;
                }
            } else {
                if (event.enumIds && event.enumIds.indexOf(pattern.enumId) !== -1) {
                    if (pattern.logic === "or") return true;
                    matched = true;
                } else {
                    if (pattern.logic === "and") return false;
                }
            }
        }

        // enumNames matching
        if (pattern.enumName) {
            if (pattern.enumName instanceof RegExp) {
                subMatched = false;
                for (var j = 0; j < event.enumNames.length; j++) {
                    if (event.enumNames[j].match(pattern.enumName)) {
                        subMatched = true;
                        break;
                    }
                }
                if (subMatched) {
                    if (pattern.logic === "or") return true;
                    matched = true;
                } else {
                    if (pattern.logic === "and") return false;
                }
            } else {
                if (event.enumNames && event.enumNames.indexOf(pattern.enumName) !== -1) {
                    if (pattern.logic === "or") return true;
                    matched = true;
                } else {
                    if (pattern.logic === "and") return false;
                }
            }
        }


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
                if (res[i].doc.type === 'enum') enums.push(res[i].doc._id);
            }

            objectsReady = true;
            adapter.log.info('received all objects');
            if (statesReady && typeof callback === 'function') callback();
        });
    }

    function isMember(idObj, idEnum) {

    }

    function isMemberRecursive(idObj, idEnum) {

    }

    function getObjectEnums(idObj, callback, enumIds, enumNames) {
        if (cacheObjectEnums[idObj]) {
            if (typeof callback === 'function') callback(cacheObjectEnums[idObj].enumIds, cacheObjectEnums[idObj].enumNames);
            return;
        }
        if (!enumIds) {
            enumIds = [];
            enumNames = [];
        }
        for (var i = 0, l = enums.length; i < l; i++) {
            if (objects[enums[i]] && objects[enums[i]].common && objects[enums[i]].common.members && objects[enums[i]].common.members.indexOf(idObj) !== -1) {
                enumIds.push(enums[i]);
                enumNames.push(objects[enums[i]].common.name);
            }
        }
        if (objects[idObj] && objects[idObj].parent) {
            getObjectEnums(objects[idObj].parent, callback, enumIds, enumNames);
        } else {
            cacheObjectEnums[idObj] = {enumIds: enumIds, enumNames: enumNames};
            if (typeof callback === 'function') callback(enumIds, enumNames);
        }
    }

    function getObjectEnumsSync(idObj, enumIds, enumNames) {
        if (cacheObjectEnums[idObj]) {
            return cacheObjectEnums[idObj];
        }
        if (!enumIds) {
            enumIds = [];
            enumNames = [];
        }
        for (var i = 0, l = enums.length; i < l; i++) {
            if (objects[enums[i]] && objects[enums[i]].common && objects[enums[i]].common.members && objects[enums[i]].common.members.indexOf(idObj) !== -1) {
                enumIds.push(enums[i]);
                enumNames.push(objects[enums[i]].common.name);
            }
        }
        if (objects[idObj] && objects[idObj].parent) {
            return getObjectEnumsSync(objects[idObj].parent, enumIds, enumNames);
        } else {
            cacheObjectEnums[idObj] = {enumIds: enumIds, enumNames: enumNames};
            return cacheObjectEnums[idObj];
        }
    }

    function getObjectEnumsRecursive(idObj, callback, enumIds, enumNames) {

    }
})();