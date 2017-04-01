/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

(function () {

    var mods = {
        vm:               require('vm'),
        fs:               require('fs'),
        dgram:            require('dgram'),
        crypto:           require('crypto'),
        dns:              require('dns'),
        events:           require('events'),
        http:             require('http'),
        https:            require('https'),
        net:              require('net'),
        os:               require('os'),
        path:             require('path'),
        util:             require('util'),
        child_process:    require('child_process'),

        'coffee-compiler': require('coffee-compiler'),

        'node-schedule':  require('node-schedule'),
        suncalc:          require('suncalc'),
        request:          require('request'),
        wake_on_lan:      require('wake_on_lan')
    };
    var utils =   require(__dirname + '/lib/utils'); // Get common adapter utils
    var words =   require(__dirname + '/lib/words');

    // modify fs to protect important information
    mods.fs._readFile      = mods.fs.readFile;
    mods.fs._readFileSync  = mods.fs.readFileSync;
    mods.fs._writeFile     = mods.fs.writeFile;
    mods.fs._writeFileSync = mods.fs.writeFileSync;

    var dayOfWeeksFull         = {
        'en': ['Sunday',        'Monday',  'Tuesday',   'Wednesday',    'Thursday',     'Friday',  'Saturday'],
        'de': ['Sonntag',       'Montag',  'Dienstag',  'Mittwoch',     'Donnerstag',   'Freitag', 'Samstag'],
        'ru': ['Понедельник',   'Вторник', 'Среда',     'Четверг',      'Пятница',      'Суббота', 'Воскресенье']
    };
    var dayOfWeeksShort        = {
        'en': ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
        'de': ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
        'ru': ['По', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    };

    var monthFull         = {
        'en': ['January', 'February', 'March', 'April',  'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        'de': ['Januar',  'Februar',  'März',  'April',  'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
        'ru': ['Январь',  'Февраль',  'Март',  'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь',  'Октябрь', 'Ноябрь',   'Декабрь']
    };
    var monthShort        = {
        'en': ['Jan', 'Feb',  'Mar',  'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'],
        'de': ['Jan', 'Feb',  'Mär',  'Apr', 'Mai', 'Jun',  'Jul',  'Aug', 'Sep',  'Okt', 'Nov', 'Dez'],
        'ru': ['Янв',  'Фев', 'Март', 'Апр', 'Май', 'Июнь', 'Июль', 'Авг', 'Сен',  'Окт', 'Ноя', 'Дек']
    };
    var astroList    = ['sunrise', 'sunset', 'sunriseEnd', 'sunsetStart', 'dawn', 'dusk', 'nauticalDawn', 'nauticalDusk', 'nightEnd', 'night', 'goldenHourEnd', 'goldenHour'];
    var astroListLow = ['sunrise', 'sunset', 'sunriseend', 'sunsetstart', 'dawn', 'dusk', 'nauticaldawn', 'nauticaldusk', 'nightend', 'night', 'goldenhourend', 'goldenhour'];

    var adapter = utils.adapter({

        name: 'javascript',

        regExEnum: /^enum\./,

		useFormatDate: true, // load float formatting

        objectChange: function (id, obj) {
            if (this.regExEnum.test(id)) {
                // clear cache
                cacheObjectEnums = {};
            }

            if (!obj) {
                // object deleted
                if (!objects[id]) return;

                // Script deleted => remove it
                if (objects[id].type === 'script' && objects[id].common.engine === 'system.adapter.' + adapter.namespace) {
                    stop(id);

                    var idActive = 'scriptEnabled.' + id.substring('script.js.'.length);
                    adapter.delObject(idActive);
                    adapter.delState(idActive);
                }

                removeFromNames(id);
                delete objects[id];
            } else if (!objects[id]) {
                // New object
                objects[id] = obj;

                addToNames(obj);

                if (obj.type === 'script' && obj.common.engine === 'system.adapter.' + adapter.namespace) {
                    // create states for scripts
                    createActiveObject(id, obj.common.enabled);

                    if (obj.common.enabled) {
                        if (adapter.checkIsGlobal(obj)) {
                            // restart adapter
                            adapter.getForeignObject('system.adapter.' + adapter.namespace, function (err, _obj) {
                                if (_obj) adapter.setForeignObject('system.adapter.' + adapter.namespace, _obj);
                            });
                            return;
                        }

                        // Start script
                        load(id);
                    }
                }
                // added new script to this engine
            } else if (objects[id].common) {
                var n = getName(id);

                if (n !== objects[id].common.name) {
                    if (n) removeFromNames(id);
                    if (objects[id].common.name) addToNames(obj);
                }

                // Object just changed
                if (obj.type !== 'script') {
                    objects[id] = obj;

                    if (id === 'system.config') {
                        // set langugae for debug messages
                        if (objects['system.config'].common.language) words.setLanguage(objects['system.config'].common.language);
                    }

                    return;
                }

                if (adapter.checkIsGlobal(objects[id])) {
                    // restart adapter
                    adapter.getForeignObject('system.adapter.' + adapter.namespace, function (err, obj) {
                        if (obj) {
                            adapter.setForeignObject('system.adapter.' + adapter.namespace, obj);
                        }
                    });
                    return;
                }

                if ((objects[id].common.enabled && !obj.common.enabled) ||
                    (objects[id].common.engine === 'system.adapter.' + adapter.namespace && obj.common.engine !== 'system.adapter.' + adapter.namespace)) {

                    // Script disabled
                    if (objects[id].common.enabled && objects[id].common.engine === 'system.adapter.' + adapter.namespace) {
                        // Remove it from executing
                        objects[id] = obj;
                        stop(id);
                    } else {
                        objects[id] = obj;
                    }
                } else
                if ((!objects[id].common.enabled && obj.common.enabled) ||
                    (objects[id].common.engine !== 'system.adapter.' + adapter.namespace && obj.common.engine === 'system.adapter.' + adapter.namespace)) {
                    // Script enabled
                    objects[id] = obj;

                    if (objects[id].common.enabled && objects[id].common.engine === 'system.adapter.' + adapter.namespace) {
                        // Start script
                        load(id);
                    }
                } else { //if (obj.common.source !== objects[id].common.source) {
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

            if (id.match(/^messagebox\./) || id.match(/^log\./)) return;
            
            var oldState = states[id] || {};
            if (state) {

                // enable or disable script
                if (!state.ack && activeRegEx.test(id)) {
                    adapter.extendForeignObject(objects[id].native.script, {common: {enabled: state.val}});
                }
                if (stateIds.indexOf(id) === -1) {
                    stateIds.push(id);
                    stateIds.sort();
                }

                // monitor if adapter is alive and send all subscriptions once more, after adapter goes online
                if (states[id] && states[id].val === false && id.match(/\.alive$/) && state.val) {
                    if (adapterSubs[id]) {
                        var parts = id.split('.');
                        var a = parts[2] + '.' + parts[3];
                        for (var t = 0; t < adapterSubs[id].length; t++) {
                            adapter.log.info('Detected coming adapter "' + a + '". Send subscribe: ' + adapterSubs[id][t]);
                            adapter.sendTo(a, 'subscribe', adapterSubs[id][t]);
                        }
                    }
                }
                
                states[id] = state;
            } else {
                if (states[id]) delete states[id];
                state = {};
                var pos = stateIds.indexOf(id);
                if (pos !== -1) {
                    stateIds.splice(pos, 1);
                }
            }

            var eventObj = {
                id: id,
                //name: name,
                //common: common,
                //native: nativeObj,
                //channelId: channelId,
                //channelName: channelName,
                //deviceId: deviceId,
                //deviceName: deviceName,
                //enumIds: enumIds,       // Array of Strings
                //enumNames: enumNames,     // Array of Strings
                newState: {
                    val:  state.val,
                    ts:   state.ts,
                    ack:  state.ack,
                    lc:   state.lc,
                    from: state.from
                },
                oldState: {
                    val:  oldState.val,
                    ts:   oldState.ts,
                    ack:  oldState.ack,
                    lc:   oldState.lc,
                    from: oldState.from
                }
            };
            eventObj.state = eventObj.newState;

            if (isEnums) {
                getObjectEnums(id, function (enumIds, enumNames) {
                    eventObj.enumIds   = enumIds;
                    eventObj.enumNames = enumNames;
                    checkPatterns(eventObj);
                });
            } else {
                checkPatterns(eventObj);
            }
        },

        unload: function (callback) {
            callback();
        },

        ready: function () {

            activeRegEx = new RegExp('^' + adapter.namespace.replace('.', '\\.') + '\\.scriptEnabled\\.');

            installLibraries(function () {
                getData(function () {
                    adapter.subscribeForeignObjects('*');

                    if (!adapter.config.subscribe) {
                        adapter.subscribeForeignStates('*');
                    }

                    adapter.objects.getObjectView('script', 'javascript', {}, function (err, doc) {
                        globalScript = '';
                        var count = 0;
                        if (doc && doc.rows && doc.rows.length) {
                            // assemble global script
                            for (var g = 0; g < doc.rows.length; g++) {
                                if (adapter.checkIsGlobal(doc.rows[g].value)) {
                                    var obj = doc.rows[g].value;

                                    if (obj && obj.common.enabled) {
                                        if (obj.common.engineType.match(/^[cC]offee/)) {
                                            count++;
                                            mods['coffee-compiler'].fromSource(obj.common.source, {
                                                sourceMap: false,
                                                bare: true
                                            }, function (err, js) {
                                                if (err) {
                                                    adapter.log.error('coffee compile ' + err);
                                                    return;
                                                }
                                                globalScript += js + '\n';
                                                if (!--count) {
                                                    globalScriptLines = globalScript.split(/[\r\n|\n|\r]/g).length;
                                                    // load all scripts
                                                    for (var i = 0; i < doc.rows.length; i++) {
                                                        if (!adapter.checkIsGlobal(doc.rows[i].value)) {
                                                            load(doc.rows[i].value._id);
                                                        }
                                                    }
                                                }
                                            });
                                        } else {
                                            globalScript += doc.rows[g].value.common.source + '\n';
                                        }
                                    }
                                }
                            }
                        }

                        if (!count) {
                            globalScript = globalScript.replace(/\r\n/g, '\n');
                            globalScriptLines = globalScript.split(/\n/g).length - 1;

                            if (doc && doc.rows && doc.rows.length) {
                                // load all scripts
                                for (var i = 0; i < doc.rows.length; i++) {
                                    if (!adapter.checkIsGlobal(doc.rows[i].value)) {
                                        load(doc.rows[i].value);
                                    }
                                }
                            }
                        }
                    });
                });
            });
        }
    });

    adapter.regExGlobalOld = /_global$/;

    adapter.regExGlobalNew = /script\.js\.global\./;

    adapter.checkIsGlobal = function (obj) {
        return this.regExGlobalOld.test(obj.common.name) ||
            this.regExGlobalNew.test(obj._id);
    };

    mods.fs.readFile = function () {
        if (mods.path.normalize(arguments[0]).replace(/\\/g, '/').indexOf('-data/objects.json') !== -1) {
            if (adapter) {
                adapter.log.error('May not read ' + arguments[0]);
            } else {
                console.error('May not read ' + arguments[0]);
            }
            throw new Error('Permission denied');
        }

        return mods.fs._readFile.apply(this, arguments);
    };

    mods.fs.readFileSync = function () {
        if (mods.path.normalize(arguments[0]).replace(/\\/g, '/').indexOf('-data/objects.json') !== -1) {
            if (adapter) {
                adapter.log.error('May not read ' + arguments[0]);
            } else {
                console.error('May not read ' + arguments[0]);
            }
            throw new Error('Permission denied');
        }
        return mods.fs._readFileSync.apply(this, arguments);
    };

    mods.fs.writeFile = function () {
        if (mods.path.normalize(arguments[0]).replace(/\\/g, '/').indexOf('-data/objects.json') !== -1) {
            if (adapter) {
                adapter.log.error('May not write ' + arguments[0]);
            } else {
                console.error('May not write ' + arguments[0]);
            }
            throw new Error('Permission denied');
        }
        return mods.fs._writeFile.apply(this, arguments);
    };

    mods.fs.writeFileSync = function () {
        if (mods.path.normalize(arguments[0]).replace(/\\/g, '/').indexOf('-data/objects.json') !== -1) {
            if (adapter) {
                adapter.log.error('May not write ' + arguments[0]);
            } else {
                console.error('May not write ' + arguments[0]);
            }
            throw new Error('Permission denied');
        }
        return mods.fs._writeFileSync.apply(this, arguments);
    };

    var objects =          {};
    var states =           {};
    var stateIds =         [];
    var scripts =          {};
    var subscriptions =    [];
    var subscribedPatterns =      {};
    var adapterSubs =      {};
    var isEnums =          false; // If some subscription wants enum
    var enums =            [];
    var cacheObjectEnums = {};
    var channels =         null;
    var devices =          null;
    var fs =               null;
    var attempts =         {};
    var globalScript =     '';
    var globalScriptLines = 0;
    var names =            {};
    var timers =           {};
    var timerId =          0;
    var activeRegEx =      null;

    function createActiveObject(id, enabled) {
        var idActive = adapter.namespace + '.scriptEnabled.' + id.substring('script.js.'.length);

        if (!objects[idActive]) {
            objects[idActive] = {
                _id:    idActive,
                common: {
                    name: 'scriptEnabled.' + id.substring('script.js.'.length),
                    desc: 'controls script activity',
                    type: 'boolean',
                    role: 'switch.active'
                },
                native: {
                    script: id
                },
                type: 'state'
            };
            adapter.setForeignObject(idActive, objects[idActive], function (err) {
                if (!err) {
                    adapter.setForeignState(idActive, enabled, true);
                }
            });
        } else {
            adapter.setForeignState(idActive, enabled, true);
        }
    }

    function addToNames(obj) {
        var id = obj._id;
        if (obj.common && obj.common.name) {
            var name = obj.common.name;
            if (typeof name !== 'string') return;
            
            if (!names[name]) {
                names[name] = id;
            } else {
                if (typeof names[name] === 'string') names[name] = [names[name]];
                names[name].push(id);
            }
        }
    }

    function removeFromNames(id) {
        var n = getName(id);

        if (n) {
            var pos;
            if (names[n] === 'object') {
                pos = names[n].indexOf(id);
                if (pos !== -1) {
                    names[n].splice(pos, 1);
                    if (names[n].length) names[n] = names[n][0];
                }
            } else {
                delete names[n];
            }
        }
    }

    function getName(id) {
        var pos;
        for (var n in names) {
            if (names[n] && typeof names[n] === 'object') {
                pos = names[n].indexOf(id);
                if (pos !== -1) return n;
            } else if (names[n] === id) {
                return n;
            }
        }
        return null;
    }

    function checkPatterns(eventObj) {
        // if this state matchs any subscriptions
        var matched = false;
        var subs = [];
        for (var i = 0, l = subscriptions.length; i < l; i++) {
            var pattern = subscriptions[i].pattern;
            // possible matches
            //    pattern.name
            //    pattern.channelId
            //    pattern.channelName
            //    pattern.deviceId
            //    pattern.deviceName
            //    pattern.enumId
            //    pattern.enumName
            if (!matched) {
                if (eventObj.name === undefined && pattern.name) {
                    eventObj.common = objects[eventObj.id] ? objects[eventObj.id].common : {};
                    eventObj.native = objects[eventObj.id] ? objects[eventObj.id].native : {};
                    eventObj.name   = eventObj.common ? eventObj.common.name : null;
                }

                if (eventObj.channelId === undefined && (pattern.deviceId || pattern.deviceName || pattern.channelId || pattern.channelName)) {
                    var _pos = eventObj.id.lastIndexOf('.');
                    if (_pos !== -1) eventObj.channelId = eventObj.id.substring(0, _pos);
                    if (!objects[eventObj.channelId]) eventObj.channelId = null;
                }

                if (eventObj.channelName === undefined && pattern.channelName) {
                    if (eventObj.channelId && objects[eventObj.channelId]) {
                        eventObj.channelName = objects[eventObj.channelId].common ? objects[eventObj.channelId].common.name : null;
                    } else {
                        eventObj.channelName = null;
                    }
                }

                if (eventObj.deviceId === undefined && (pattern.deviceId || pattern.deviceName)) {
                    if (!eventObj.channelId) {
                        eventObj.deviceId   = null;
                        eventObj.deviceName = null;
                    } else {
                        var pos = eventObj.channelId.lastIndexOf('.');
                        if (pos !== -1) {
                            eventObj.deviceId = eventObj.channelId.substring(0, pos);
                            if (!objects[eventObj.deviceId]) {
                                eventObj.deviceId   = null;
                                eventObj.deviceName = null;
                            }
                        }
                    }
                }
                if (eventObj.deviceName === undefined && pattern.deviceName) {
                    eventObj.deviceName = objects[eventObj.deviceId] && objects[eventObj.deviceId].common ? objects[eventObj.deviceId].common.name : null;
                }
            }

            if (patternMatching(eventObj, subscriptions[i].pattern)) {
                if (!matched) {
                    matched = true;
                    if (eventObj.name === undefined) {
                        eventObj.common = objects[eventObj.id] ? objects[eventObj.id].common : {};
                        eventObj.native = objects[eventObj.id] ? objects[eventObj.id].native : {};
                        eventObj.name   = eventObj.common ? eventObj.common.name : null;
                    }

                    if (eventObj.channelId === undefined) {
                        var __pos = eventObj.id.lastIndexOf('.');
                        if (__pos !== -1) eventObj.channelId = eventObj.id.substring(0, __pos);
                        if (!objects[eventObj.channelId]) eventObj.channelId = null;
                    }

                    if (eventObj.channelName === undefined) {
                        if (eventObj.channelId && objects[eventObj.channelId]) {
                            eventObj.channelName = objects[eventObj.channelId].common ? objects[eventObj.channelId].common.name : null;
                        } else {
                            eventObj.channelName = null;
                        }
                    }

                    if (eventObj.deviceId === undefined) {
                        if (!eventObj.channelId) {
                            eventObj.deviceId   = null;
                            eventObj.deviceName = null;
                        } else {
                            var pos_ = eventObj.channelId.lastIndexOf('.');
                            if (pos_ !== -1) {
                                eventObj.deviceId = eventObj.channelId.substring(0, pos_);
                                if (!objects[eventObj.deviceId]) {
                                    eventObj.deviceId   = null;
                                    eventObj.deviceName = null;
                                }
                            }
                        }
                    }
                    if (eventObj.deviceName === undefined) {
                        eventObj.deviceName = objects[eventObj.deviceId] && objects[eventObj.deviceId].common ? objects[eventObj.deviceId].common.name : null;
                    }
                }
                subs.push(i);
            }
        }

        if (matched) {
            if (eventObj.enumIds === undefined) {
                getObjectEnums(eventObj.id, function (enumIds, enumNames) {
                    eventObj.enumIds   = enumIds;
                    eventObj.enumNames = enumNames;
                    for (var i = 0, l = subs.length; i < l; i++) {
                        subscriptions[subs[i]].callback(eventObj);
                    }
                });
            } else {
                for (var ii = 0, ll = subs.length; ii < ll; ii++) {
                    subscriptions[subs[ii]].callback(eventObj);
                }
            }
        }
   }

    function installNpm(npmLib, callback) {
        var path = __dirname;
        if (typeof npmLib === 'function') {
            callback = npmLib;
            npmLib = undefined;
        }

        var cmd = 'npm install ' + npmLib + ' --production --prefix "' + path + '"';
        adapter.log.info(cmd + ' (System call)');
        // Install node modules as system call

        // System call used for update of js-controller itself,
        // because during installation npm packet will be deleted too, but some files must be loaded even during the install process.
        var exec = require('child_process').exec;
        var child = exec(cmd);

        child.stdout.on('data', function (buf) {
            adapter.log.info(buf.toString('utf8'));
        });
        child.stderr.on('data', function (buf) {
            adapter.log.error(buf.toString('utf8'));
        });
        
        child.on('exit', function (code, signal) {
            if (code) {
                adapter.log.error('Cannot install ' + npmLib + ': ' + code);
            }
            // command succeeded
            if (typeof callback === 'function') callback(npmLib);
        });
    }

    function installLibraries(callback) {
        var allInstalled = true;
        if (adapter.config && adapter.config.libraries) {
            var libraries = adapter.config.libraries.split(/[,;\s]+/);

            for (var lib = 0; lib < libraries.length; lib++) {
                if (libraries[lib] && libraries[lib].trim()) {
                    libraries[lib] = libraries[lib].trim();
                    fs = fs || require('fs');

                    if (!fs.existsSync(__dirname + '/node_modules/' + libraries[lib] + '/package.json')) {

                        if (!attempts[libraries[lib]]) {
                            attempts[libraries[lib]] = 1;
                        } else {
                            attempts[libraries[lib]]++;
                        }
                        if (attempts[libraries[lib]] > 3) {
                            adapter.log.error('Cannot install npm packet: ' + libraries[lib]);
                            continue;
                        }

                        installNpm(libraries[lib], function () {
                            installLibraries(callback);
                        });
                        allInstalled = false;
                        break;
                    }
                }
            }
        }
        if (allInstalled) callback();
    }

    function compile(source, name) {
        source += "\n;\nlog('registered ' + __engine.__subscriptions + ' subscription' + (__engine.__subscriptions === 1 ? '' : 's' ) + ' and ' + __engine.__schedules + ' schedule' + (__engine.__schedules === 1 ? '' : 's' ));\n";
        try {
            return mods.vm.createScript(source, name);
        } catch (e) {
            // todo 
            adapter.log.error(name + ' compile failed: ' + e);
            return false;
        }
    }
    
    function unsubscribePattern(script, pattern) {
        if (adapter.config.subscribe) {
            if (script.subscribes[pattern]) {
                script.subscribes[pattern]--;
                if (!script.subscribes[pattern]) delete script.subscribes[pattern];
            }

            if (subscribedPatterns[pattern]) {
                subscribedPatterns[pattern]--;
                if (!subscribedPatterns[pattern]) {
                    adapter.unsubscribeForeignStates(pattern);
                    delete subscribedPatterns[pattern];
                    
                    // if pattern was regex or with * some states will stay in RAM, but it is OK.
                    if (states[pattern]) delete states[pattern];
                }
            }
        }
    }
    
    function subscribePattern(script, pattern) {
        if (adapter.config.subscribe) {
            if (!script.subscribes[pattern]) {
                script.subscribes[pattern] = 1;
            } else {
                script.subscribes[pattern]++;
            }

            if (!subscribedPatterns[pattern]) {
                subscribedPatterns[pattern] = 1;
                adapter.subscribeForeignStates(pattern);
                
                // request current value to deliver old value on change.
                if (typeof pattern === 'string' && pattern.indexOf('*') === -1) {
                    adapter.getForeignState(pattern, function (err, state) {
                        if (state) states[pattern] = state;
                    });
                } else {
                    adapter.getForeignStates(pattern, function (err, _states) {
                        if (_states) {
                            for (var id in _states) {
                                if (!_states.hasOwnProperty(id)) continue;
                                states[id] = _states[id];
                            }
                        }
                    });
                }
            } else {
                subscribedPatterns[pattern]++;
            }
        }
    }

    function execute(script, name, verbose, debug) {
        script.intervals  = [];
        script.timeouts   = [];
        script.schedules  = [];
        script.name       = name;
        script._id        = Math.floor(Math.random() * 0xFFFFFFFF);
        script.subscribes = {};

        var sandbox = {
            mods:      mods,
            _id:       script._id,
            name:      name,
            instance:  adapter.instance,
            verbose:   verbose,
            request:   mods.request,
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

                var result    = {};

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
                    if (selector[i] === '{') {
                        isName = false;
                        if (isCommons || isEnums || isNatives) {
                            // Error
                            return [];
                        }
                        isNatives = true;
                    } else
                    if (selector[i] === '}') {
                        isNatives = false;
                        natives.push(native);
                        native = '';
                    } else
                    if (selector[i] === '[') {
                        isName = false;
                        if (isCommons || isEnums || isNatives) {
                            // Error
                            return [];
                        }
                        isCommons = true;
                    } else
                    if (selector[i] === ']') {
                        isCommons = false;
                        commons.push(common);
                        common = '';
                    }else
                    if (selector[i] === '(') {
                        isName = false;
                        if (isCommons || isEnums || isNatives) {
                            // Error
                            return [];
                        }
                        isEnums = true;
                    } else
                    if (selector[i] === ')') {
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

                // If some error in the selector
                if (isEnums || isCommons || isNatives) {
                    result.length = 0;
                    result.each = function () {
                        return this;
                    };
                    result.getState = function () {
                        return null;
                    };
                    result.setState = function () {
                        return this;
                    };
                    result.on = function () {
                    };
                }

                if (isEnums) {
                    adapter.log.warn('Invalid selector: enum close bracket cannot be found in "' + selector + '"');
                    result.error = 'Invalid selector: enum close bracket cannot be found';
                    return result;
                } else if (isCommons) {
                    adapter.log.warn('Invalid selector: common close bracket cannot be found in "' + selector + '"');
                    result.error = 'Invalid selector: common close bracket cannot be found';
                    return result;
                } else if (isNatives) {
                    adapter.log.warn('Invalid selector: native close bracket cannot be found in "' + selector + '"');
                    result.error = 'Invalid selector: native close bracket cannot be found';
                    return result;
                }

                var filterStates = [];

                for (i = 0; i < commons.length; i++) {
                    parts = commons[i].split('=', 2);
                    if (parts[1] && parts[1][0] === '"') {
                        parts[1] = parts[1].substring(1);
                        len = parts[1].length;
                        if (parts[1] && parts[1][len - 1] === '"') parts[1] = parts[1].substring(0, len - 1);
                    }
                    if (parts[1] && parts[1][0] === "'") {
                        parts[1] = parts[1].substring(1);
                        len = parts[1].length;
                        if (parts[1] && parts[1][len - 1] === "'") parts[1] = parts[1].substring(0, len - 1);
                    }

                    if (parts[1]) parts[1] = parts[1].trim();
                    parts[0] = parts[0].trim();

                    if (parts[0] === 'state.id') {
                        filterStates.push({attr: parts[0], value: parts[1].trim()});
                        commons[i] = null;
                    } else {
                        commons[i] = {attr: parts[0], value: parts[1].trim()};
                    }
                }

                for (i = 0; i < natives.length; i++) {
                    parts = natives[i].split('=', 2);
                    if (parts[1] && parts[1][0] === '"') {
                        parts[1] = parts[1].substring(1);
                        len = parts[1].length;
                        if (parts[1] && parts[1][len - 1] === '"') parts[1] = parts[1].substring(0, len - 1);
                    }
                    if (parts[1] && parts[1][0] === "'") {
                        parts[1] = parts[1].substring(1);
                        len = parts[1].length;
                        if (parts[1] && parts[1][len - 1] === "'") parts[1] = parts[1].substring(0, len - 1);
                    }

                    if (parts[1]) parts[1] = parts[1].trim();
                    parts[0] = parts[0].trim();
                    if (parts[0] === 'state.id') {
                        filterStates.push({attr: parts[0], value: parts[1].trim()});
                        natives[i] = null;
                    } else {
                        natives[i] = {attr: parts[0].trim(), value: parts[1].trim()};
                    }
                }

                for (i = 0; i < _enums.length; i++) {
                    parts = _enums[i].split('=', 2);
                    if (parts[1] && parts[1][0] === '"') {
                        parts[1] = parts[1].substring(1);
                        len = parts[1].length;
                        if (parts[1] && parts[1][len - 1] === '"') parts[1] = parts[1].substring(0, len - 1);
                    }
                    if (parts[1] && parts[1][0] === "'") {
                        parts[1] = parts[1].substring(1);
                        len = parts[1].length;
                        if (parts[1] && parts[1][len - 1] === "'") parts[1] = parts[1].substring(0, len - 1);
                    }

                    if (parts[1]) parts[1] = parts[1].trim();
                    parts[0] = parts[0].trim();
                    if (parts[0] === 'state.id') {
                        filterStates.push({attr: parts[0], value: parts[1].trim()});
                        _enums[i] = null;
                    } else {
                        _enums[i] = 'enum.' + parts[0].trim() + '.' + parts[1].trim();
                    }
                }

                name = name.trim();
                if (name === 'channel' || name === 'device') {
                    // Fill channels
                    if (!channels || !devices) {
                        channels = {};
                        devices  = {};
                        for (var _id in objects) {
                            if (objects[_id].type === 'state') {
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
                var id;
                var s;
                var pass;
                if (name === 'channel') {
                    for (id in channels) {
                        if (!channels.hasOwnProperty(id) || !objects.hasOwnProperty(id)) continue;
                        pass = true;
                        for (var c = 0; c < commons.length; c++) {
                            if (!commons[c]) continue;
                            if (commons[c].attr === 'id') {
                                if (!commons[c].r && commons[c].value) commons[c].r = new RegExp('^' + commons[c].value.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
                                if (!commons[c].r || commons[c].r.test(id)) continue;
                            } else if (objects[id].common) {
                                if (commons[c].value === undefined && objects[id].common[commons[c].attr] !== undefined) continue;
                                if (objects[id].common[commons[c].attr] === commons[c].value) continue;
                            }
                            pass = false;
                            break;
                        }
                        if (!pass) continue;
                        for (var n = 0; n < natives.length; n++) {
                            if (!natives[n]) continue;
                            if (natives[n].attr === 'id') {
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
                            var enumIds = [];
                            getObjectEnumsSync(id, enumIds);

                            for (var m = 0; m < _enums.length; m++) {
                                if (!_enums[m]) continue;
                                if (enumIds.indexOf(_enums[m]) !== -1) continue;
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
                                    if (!filterStates[st].r && filterStates[st].value) {
                                        if (filterStates[st].value[0] === '*') {
                                            filterStates[st].r = new RegExp(filterStates[st].value.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
                                        } else if (filterStates[st].value[filterStates[st].value - 1] === '*') {
                                            filterStates[st].r = new RegExp('^' + filterStates[st].value.replace(/\./g, '\\.').replace(/\*/g, '.*'));
                                        } else {
                                            filterStates[st].r = new RegExp(filterStates[st].value.replace(/\./g, '\\.').replace(/\*/g, '.*'));
                                        }
                                    }
                                    if (!filterStates[st].r || filterStates[st].r.test(channels[id][s])) continue;
                                    pass = false;
                                    break;
                                }
                                if (!pass) continue;
                            }
                            res.push(channels[id][s]);
                        }
                    }
                } else if (name === 'device') {
                    for (id in devices) {
                        if (!objects[id]) {
                            console.log(id);
                            continue;
                        }
                        pass = true;
                        for (var _c = 0; _c < commons.length; _c++) {
                            if (!commons[_c]) continue;
                            if (commons[_c].attr === 'id') {
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
                            if (natives[n].attr === 'id') {
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
                            var enumIds = [];
                            getObjectEnumsSync(id, enumIds);

                            for (var n = 0; n < _enums.length; n++) {
                                if (!_enums[n]) continue;
                                if (enumIds.indexOf(_enums[n]) !== -1) continue;
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
                                    if (!filterStates[st].r && filterStates[st].value) {
                                        if (filterStates[st].value[0] === '*') {
                                            filterStates[st].r = new RegExp(filterStates[st].value.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
                                        } else if (filterStates[st].value[filterStates[st].value - 1] === '*') {
                                            filterStates[st].r = new RegExp('^' + filterStates[st].value.replace(/\./g, '\\.').replace(/\*/g, '.*'));
                                        } else {
                                            filterStates[st].r = new RegExp(filterStates[st].value.replace(/\./g, '\\.').replace(/\*/g, '.*'));
                                        }
                                    }
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
                    var r = (name && name !== 'state') ? new RegExp('^' + name.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$') : null;

                    // state
                    for (var s = 0; s < stateIds.length; s++) {
                        id = stateIds[s];
                        if (r && !r.test(id)) continue;
                        pass = true;

                        if (commons.length) {
                            for (var c = 0; c < commons.length; c++) {
                                if (!commons[c]) continue;
                                if (commons[c].attr === 'id') {
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
                                if (natives[n].attr === 'id') {
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
                                if (!filterStates[st].r && filterStates[st].value) {
                                    if (filterStates[st].value[0] === '*') {
                                        filterStates[st].r = new RegExp(filterStates[st].value.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
                                    } else if (filterStates[st].value[filterStates[st].value - 1] === '*') {
                                        filterStates[st].r = new RegExp('^' + filterStates[st].value.replace(/\./g, '\\.').replace(/\*/g, '.*'));
                                    } else {
                                        filterStates[st].r = new RegExp(filterStates[st].value.replace(/\./g, '\\.').replace(/\*/g, '.*'));
                                    }
                                }
                                if (!filterStates[st].r || filterStates[st].r.test(id)) continue;
                                pass = false;
                                break;
                            }
                            if (!pass) continue;
                        }

                        if (_enums.length) {
                            var enumIds = [];
                            getObjectEnumsSync(id, enumIds);

                            for (var nn = 0; nn < _enums.length; nn++) {
                                if (!_enums[nn]) continue;
                                if (enumIds.indexOf(_enums[nn]) !== -1) continue;
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

                for (i = 0; i < res.length; i++) {
                    result[i] = res[i];
                }
                result.length = res.length;
                result.each = function (callback) {
                    if (typeof callback === 'function') {
                        var r;
                        for (var i = 0; i < this.length; i++) {
                            r = callback(result[i], i);
                            if (r === false) break;
                        }
                    }
                    return this;
                };
                result.getState = function (callback) {
                    if (adapter.config.subscribe) {
                        if (typeof callback !== 'function') {
                            sandbox.log('You cannot use this function synchronous', 'error');
                        } else {
                            adapter.getForeignState(this[0], callback);
                        }
                    } else {
                        if (this[0]) return states[this[0]];
                        return null;
                    }
                };
                result.setState = function (state, isAck, callback) {
                    if (typeof isAck === 'function') {
                        callback = isAck;
                        isAck = undefined;
                    }

                    if (isAck === true || isAck === false || isAck === 'true' || isAck === 'false') {
                        if (typeof state === 'object') {
                            state.ack = isAck;
                        } else {
                            state = {val: state, ack: isAck};
                        }
                    }
                    var cnt = 0;
                    for (var i = 0; i < this.length; i++) {
                        cnt++;
                        adapter.setForeignState(this[i], state, function () {
                            if (!--cnt && typeof callback === 'function') callback();
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
                if (!adapter.log[sev]) {
                    msg = 'Unknown severity level "' + sev + '" by log of [' + msg + ']';
                    sev = 'warn';
                }
                adapter.log[sev](name + ': ' + msg);
            },
            exec:      function (cmd, callback) {
                if (sandbox.verbose) sandbox.log('exec: ' + cmd, 'info');
                if (debug) {
                    sandbox.log(words._('Command %s was not executed, while debug mode is active', cmd), 'warn');
                    if (typeof callback === 'function') {
                        setTimeout(function () {
                            callback();
                        }, 0);
                    }
                } else {
                    return mods.child_process.exec(cmd, callback);
                }
            },
            email:     function (msg) {
                if (sandbox.verbose) sandbox.log('email(msg=' + JSON.stringify(msg) + ')', 'info');
                adapter.sendTo('email', msg);
            },
            pushover:  function (msg) {
                if (sandbox.verbose) sandbox.log('pushover(msg=' + JSON.stringify(msg) + ')', 'info');
                adapter.sendTo('pushover', msg);
            },
            subscribe: function (pattern, callbackOrId, value) {
                if (typeof pattern === 'object') {
                    if (pattern.astro) {
                        return sandbox.schedule(pattern, callbackOrId, value);
                    } else if (pattern.time) {
                        return sandbox.schedule(pattern.time, callbackOrId, value);
                    }
                }

                var callback;

                sandbox.__engine.__subscriptions += 1;

                // source is set by regexp if defined as /regexp/
                if (typeof pattern !== 'object' || pattern instanceof RegExp || pattern.source) {
                    pattern = {id: pattern, change: 'ne'};
                }

                if (pattern.id !== undefined && !pattern.id) {
                    adapter.log.error('Error by subscription: empty ID defined. All states matched.');
                    return;
                }

                // add adapter namespace if nothing given
                if (pattern.id && typeof pattern.id === 'string' && pattern.id.indexOf('.') === -1) {
                    pattern.id = adapter.namespace + '.' + pattern.id;
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

                var subs = {
                    pattern:  pattern,
                    callback: function (obj) {
                        if (typeof callback === 'function') {
                            try {
                                callback.call(sandbox, obj);
                            } catch (e) {
                                adapter.log.error('Error in callback: ' + e)
                            }
                        }
                    },
                    name:     name
                };

                // try to extract adapter
                if (pattern.id && typeof pattern.id === 'string') {
                    var parts = pattern.id.split('.');
                    var a = parts[0] + '.' + parts[1];
                    var _adapter = 'system.adapter.' + a;

                    if (objects[_adapter] && objects[_adapter].common && objects[_adapter].common.subscribable) {
                        var alive = 'system.adapter.' + a + '.alive';
                        adapterSubs[alive] = adapterSubs[alive] || [];

                        var subExists = adapterSubs[alive].filter(function(sub){
                            return sub === pattern.id;
                        }).length > 0;

                        if (!subExists) {
                            adapterSubs[alive].push(pattern.id);
                            adapter.sendTo(a, 'subscribe', pattern.id);
                        }
                    }
                }
                if (sandbox.verbose) sandbox.log('subscribe: ' + JSON.stringify(subs), 'info');

                subscribePattern(script, pattern.id);

                subscriptions.push(subs);

                if (pattern.enumName || pattern.enumId) isEnums = true;
                return subs;
            },
            getSubscriptions: function () {
                var result = {};
                for (var s = 0; s < subscriptions.length; s++) {
                    result[subscriptions[s].pattern.id] = result[subscriptions[s].pattern.id] || [];
                    result[subscriptions[s].pattern.id].push({name: subscriptions[s].name, pattern: subscriptions[s].pattern});
                }
                if (sandbox.verbose) sandbox.log('getSubscriptions() => ' + JSON.stringify(result) , 'info');
                return result;
            },
            adapterSubscribe: function (id) {
                if (typeof id !== 'string') {
                    adapter.log.error('adapterSubscribe: invalid type of id' + typeof id);
                    return;
                }
                var parts = id.split('.');
                var _adapter = 'system.adapter.' + parts[0] + '.' + parts[1];
                if (objects[_adapter] && objects[_adapter].common && objects[_adapter].common.subscribable) {
                    var a = parts[0] + '.' + parts[1];
                    var alive = 'system.adapter.' + a + '.alive';
                    adapterSubs[alive] = adapterSubs[alive] || [];
                    adapterSubs[alive].push(id);
                    if (sandbox.verbose) sandbox.log('adapterSubscribe: ' + a + ' - ' + id, 'info');
                    adapter.sendTo(a, 'subscribe', id);
                }
            },
            adapterUnsubscribe: function (id) {
                unsubscribe(id);
            },
            unsubscribe:    function (idOrObject) {
                var i;
                if (sandbox.verbose) sandbox.log('adapterUnsubscribe(id=' + idOrObject + ')', 'info');
                if (typeof idOrObject === 'object') {
                    for (i = subscriptions.length - 1; i >= 0 ; i--) {
                        if (subscriptions[i] === idOrObject) {
                            unsubscribePattern(subscriptions[i].pattern.id);
                            subscriptions.splice(i, 1);
                            sandbox.__engine.__subscriptions--;
                            return true;
                        }
                    }
                } else {
                    var deleted = 0;
                    for (i = subscriptions.length - 1; i >= 0 ; i--) {
                        if (subscriptions[i].name === name && subscriptions[i].pattern.id === idOrObject) {
                            deleted++;
                            unsubscribePattern(subscriptions[i].pattern.id);
                            subscriptions.splice(i, 1);
                            sandbox.__engine.__subscriptions--;
                        }
                    }
                    return !!deleted;
                }
            },
            on:             function (pattern, callbackOrId, value) {
                return sandbox.subscribe(pattern, callbackOrId, value);
            },
            schedule:       function (pattern, callback) {
                if (typeof callback !== 'function') {
                    adapter.log.error(name + ': schedule callback missing');
                    return;
                }

                sandbox.__engine.__schedules += 1;

                if (pattern.astro) {

                    var nowdate = new Date();

                    if (adapter.config.latitude === undefined || adapter.config.longitude === undefined ||
                        adapter.config.latitude === ''        || adapter.config.longitude === '' ||
                        adapter.config.latitude === null      || adapter.config.longitude === null) {
                        adapter.log.error('Longitude or latitude does not set. Cannot use astro.');
                        return;
                    }

                    var ts = mods.suncalc.getTimes(nowdate, adapter.config.latitude, adapter.config.longitude)[pattern.astro];

                    if (ts.getTime().toString() === 'NaN') {
                        adapter.log.warn('Cannot calculate "' + pattern.astro + '" for ' + adapter.config.latitude + ', ' + adapter.config.longitude);
                        ts = new Date(nowdate.getTime());

                        if (pattern.astro === 'sunriseEnd'       ||
                            pattern.astro === 'goldenHourEnd'    ||
                            pattern.astro === 'sunset'           ||
                            pattern.astro === 'nightEnd'         ||
                            pattern.astro === 'nauticalDusk') {
                            ts.setMinutes(59);
                            ts.setHours(23);
                            ts.setSeconds(59);
                        } else {
                            ts.setMinutes(59);
                            ts.setHours(23);
                            ts.setSeconds(58);
                        }
                    }

                    if (ts && pattern.shift) {
                        ts = new Date(ts.getTime() + (pattern.shift * 60000));
                    }

                    if (!ts || ts < nowdate) {
                        var date = new Date(nowdate);
                        // Event doesn't occur today - try again tomorrow
                        // Calculate time till 24:00 and set timeout
                        date.setDate(date.getDate() + 1);
                        date.setMinutes(1); // Somtimes timer fires at 23:59:59
                        date.setHours(0);
                        date.setSeconds(0);
                        date.setMilliseconds(0);
                        date.setMinutes(-date.getTimezoneOffset());


                        // Calculate new schedule in the next day
                        sandbox.setTimeout(function () {
                             if (sandbox.__engine.__schedules > 0) sandbox.__engine.__schedules--;

                            sandbox.schedule(pattern, callback);
                        }, date.getTime() - nowdate.getTime());

                        return;
                    }

                    sandbox.setTimeout(function () {
                        try {
                            callback.call(sandbox);
                        } catch (e) {
                            adapter.log.error('Error in callback: ' + e)
                        }
                        // Reschedule in 2 seconds
                        sandbox.setTimeout(function () {
                            if (sandbox.__engine.__schedules > 0) sandbox.__engine.__schedules--;
                            sandbox.schedule(pattern, callback);
                        }, 2000);

                    }, ts.getTime() - nowdate.getTime());

                    if (sandbox.verbose) sandbox.log('schedule(astro=' + pattern.astro + ', offset=' + pattern.shift + ')', 'info');

                } else {
                    // fix problem with sunday and 7
                    if (typeof pattern === 'string') {
                        var parts = pattern.replace(/\s+/g, ' ').split(' ');
                        if (parts.length >= 5 && parts[5] >= 7) parts[5] = 0;
                        pattern = parts.join(' ');
                    }
                    var schedule = mods['node-schedule'].scheduleJob(pattern, function () {
                        try {
                            callback.call(sandbox);
                        } catch (e) {
                            adapter.log.error('Error in callback: ' + e)
                        }
                    });

                    script.schedules.push(schedule);

                    if (sandbox.verbose) sandbox.log('schedule(cron=' + pattern + ')', 'info');

                    return schedule;
                }
            },
            getAstroDate:   function (pattern, date, offsetMinutes) {
                if (date === undefined) date = new Date();

                if (astroList.indexOf(pattern) === -1) {
                    var pos = astroListLow.indexOf(pattern.toLowerCase());
                    if (pos !== -1) pattern = astroList[pos];
                }

                if ((!adapter.config.latitude  && adapter.config.latitude  !== 0 && adapter.config.latitude  !== '0') ||
                    (!adapter.config.longitude && adapter.config.longitude !== 0 && adapter.config.longitude !== '0')) {
                    adapter.log.error('Longitude or latitude does not set. Cannot use astro.');
                    return;
                }

                var ts = mods.suncalc.getTimes(date, adapter.config.latitude, adapter.config.longitude)[pattern];

                if (ts === undefined || ts.getTime().toString() === 'NaN') {
                    adapter.log.error('Cannot get astro date for "' + pattern + '"');
                }

                if (sandbox.verbose) sandbox.log('getAstroDate(pattern=' + pattern + ', date=' + date + ') => ' + ts, 'info');

                if (offsetMinutes !== undefined) {
                    ts = new Date(ts.getTime() + (offsetMinutes * 60000));
                }
                return ts;
            },
            isAstroDay:     function () {
                var nowDate  = new Date();
                var dayBegin = sandbox.getAstroDate('sunrise');
                var dayEnd   = sandbox.getAstroDate('sunset');

                if (dayBegin === undefined || dayEnd === undefined) return;

                if (sandbox.verbose) sandbox.log('isAstroDay() => ' + (nowDate >= dayBegin && nowDate <= dayEnd), 'info');

                return (nowDate >= dayBegin && nowDate <= dayEnd);
            },
            clearSchedule:  function (schedule) {
                for (var i = 0; i < script.schedules.length; i++) {
                    if (script.schedules[i] === schedule) {
                        if (!mods['node-schedule'].cancelJob(script.schedules[i])) {
                            adapter.log.error('Error by canceling scheduled job');
                        }
                        delete script.schedules[i];
                        script.schedules.splice(i, 1);
                        if (sandbox.verbose) sandbox.log('clearSchedule() => cleared', 'info');
                        return true;
                    }
                }
                if (sandbox.verbose) sandbox.log('clearSchedule() => invalid handler', 'warn');
                return false;
            },
            setState:       function (id, state, isAck, callback) {
                if (typeof isAck === 'function') {
                    callback = isAck;
                    isAck = undefined;
                }

                if (isAck === true || isAck === false || isAck === 'true' || isAck === 'false') {
                    if (typeof state === 'object') {
                        state.ack = isAck;
                    } else {
                        state = {val: state, ack: isAck};
                    }
                }

                // Check type of state
				if (!objects[id] && objects[adapter.namespace + '.' + id]) {
                    id = adapter.namespace + '.' + id;
                }

                var common = objects[id] ? objects[id].common : null;
                if (common &&
                    common.type &&
                    common.type !== 'mixed' &&
                    common.type !== 'file'  &&
                    common.type !== 'json') {
					if (state && typeof state === 'object' && state.val !== undefined) {
						if (common.type !== typeof state.val) {
                    		adapter.log.warn('Wrong type of ' + id + ': "' + typeof state.val + '". Please fix, while deprecated and will not work in next versions.');
							//return;
						}
					} else {
						if (common.type !== typeof state) {
                    		adapter.log.warn('Wrong type of ' + id + ': "' + typeof state + '". Please fix, while deprecated and will not work in next versions.');
							//return;
						}
					}
				}
                // Check min and max of value
				if (typeof state === 'object' && state) {
					if (common && typeof state.val === 'number') {
	                    if (common.min !== undefined && state.val < common.min) state.val = common.min;
	                    if (common.max !== undefined && state.val > common.max) state.val = common.max;
	                }
				} else if (common && typeof state === 'number') {
                    if (common.min !== undefined && state < common.min) state = common.min;
                    if (common.max !== undefined && state > common.max) state = common.max;
                }

                if (objects[id]) {
                    if (sandbox.verbose) sandbox.log('setForeignState(id=' + id + ', state=' + JSON.stringify(state) + ')', 'info');

                    if (debug) {
                        sandbox.log('setForeignState(id=' + id + ', state=' + JSON.stringify(state) + ') - ' + words._('was not executed, while debug mode is active'), 'warn');

                        if (typeof callback === 'function') {
                            setTimeout(function () {
                                try {
                                    callback.call(sandbox);
                                } catch (e) {
                                    adapter.log.error('Error in callback: ' + e)
                                }
                            }, 0);
                        }
                    } else {
                        adapter.setForeignState(id, state, function (err) {
                            if (err) sandbox.log('setForeignState: ' + err, 'error');

                            if (typeof callback === 'function') {
                                try {
                                    callback.call(sandbox);
                                } catch (e) {
                                    adapter.log.error('Error in callback: ' + e)
                                }
                            }
                        });
                    }
                } else if (objects[adapter.namespace + '.' + id]) {
                    if (sandbox.verbose) sandbox.log('setState(id=' + id + ', state=' + JSON.stringify(state) + ')', 'info');

                    if (debug) {
                        sandbox.log('setState(' + id + ', ' + JSON.stringify(state) + ') - ' + words._('was not executed, while debug mode is active'), 'warn');
                        if (typeof callback === 'function') {
                            setTimeout(function () {
                                try {
                                    callback.call(sandbox);
                                } catch (e) {
                                    adapter.log.error('Error in callback: ' + e)
                                }
                            }, 0);
                        }
                    } else {
                        adapter.setState(id, state, function (err) {
                            if (err) sandbox.log('setState: ' + err, 'error');

                            if (typeof callback === 'function') {
                                try {
                                    callback.call(sandbox);
                                } catch (e) {
                                    adapter.log.error('Error in callback: ' + e)
                                }
                            }
                        });
                    }
                } else {
                    if (objects[id]) {
                        if (objects[id].type === 'state') {
                            if (sandbox.verbose) sandbox.log('setForeignState(id=' + id + ', state=' + JSON.stringify(state) + ')', 'info');

                            if (debug) {
                                sandbox.log('setForeignState(id=' + id + ', state=' + JSON.stringify(state) + ') - ' + words._('was not executed, while debug mode is active'), 'warn');
                                if (typeof callback === 'function') {
                                    setTimeout(function () {
                                        try {
                                            callback.call(sandbox);
                                        } catch (e) {
                                            adapter.log.error('Error in callback: ' + e)
                                        }
                                    }, 0);
                                }
                            } else {
                                adapter.setForeignState(id, state, function (err) {
                                    if (err) sandbox.log('setForeignState: ' + err, 'error');

                                    if (typeof callback === 'function') {
                                        try {
                                            callback.call(sandbox);
                                        } catch (e) {
                                            adapter.log.error('Error in callback: ' + e)
                                        }
                                    }
                                });
                            }
                        } else {
                            adapter.log.warn('Cannot set value of non-state object "' + id + '"');
                            if (typeof callback === 'function') {
                                try {
                                    callback.call(sandbox, 'Cannot set value of non-state object "' + id + '"');
                                } catch (e) {
                                    adapter.log.error('Error in callback: ' + e)
                                }
                            }
                        }
                    } else if (objects[adapter.namespace + '.' + id]) {
                        if (objects[adapter.namespace + '.' + id].type === 'state') {
                            if (sandbox.verbose) sandbox.log('setState(id=' + id + ', state=' + JSON.stringify(state) + ')', 'info');

                            if (debug) {
                                sandbox.log('setState(id=' + id + ', state=' + JSON.stringify(state) + ') - ' + words._('was not executed, while debug mode is active'), 'warn');
                                if (typeof callback === 'function') {
                                    setTimeout(function () {
                                        try {
                                            callback.call(sandbox);
                                        } catch (e) {
                                            adapter.log.error('Error in callback: ' + e)
                                        }
                                    }, 0);
                                }
                            } else {
                                adapter.setState(id, state, function (err) {
                                    if (err) sandbox.log('setState: ' + err, 'error');

                                    if (typeof callback === 'function') {
                                        try {
                                            callback.call(sandbox);
                                        } catch (e) {
                                            adapter.log.error('Error in callback: ' + e)
                                        }
                                    }
                                });
                            }
                        } else {
                            adapter.log.warn('Cannot set value of non-state object "' + adapter.namespace + '.' + id + '"');
                            if (typeof callback === 'function') {
                                try {
                                    callback.call(sandbox, 'Cannot set value of non-state object "' + adapter.namespace + '.' + id + '"');
                                } catch (e) {
                                    adapter.log.error('Error in callback: ' + e)
                                }
                            }
                        }
                    } else {
                        adapter.log.warn('State "' + id + '" not found');
                        if (typeof callback === 'function') {
                            try {
                                callback.call(sandbox, 'State "' + id + '" not found');
                            } catch (e) {
                                adapter.log.error('Error in callback: ' + e)
                            }
                        }
                    }
                }
            },
            setStateDelayed: function (id, state, isAck, delay, clearRunning, callback) {
                // find arguments
                if (typeof isAck !== 'boolean') {
                    callback        = clearRunning;
                    clearRunning    = delay;
                    delay           = isAck;
                    isAck           = false;
                }
                if (typeof delay !== 'number') {
                    callback        = clearRunning;
                    clearRunning    = delay;
                    delay           = 0;
                }
                if (typeof clearRunning !== 'boolean') {
                    callback        = clearRunning;
                    clearRunning    = true;
                }

                if (clearRunning === undefined) clearRunning = true;

                if (sandbox.verbose) sandbox.log('setStateDelayed(id=' + id + ', state=' + state + ', isAck=' + isAck + ', delay=' + delay + ', clearRunning=' + clearRunning + ')', 'info');

                if (clearRunning) {
                    if (timers[id]) {
                        if (sandbox.verbose) sandbox.log('setStateDelayed: clear ' + timers[id].length + ' running timers', 'info');

                        for (var i = 0; i < timers[id].length; i++) {
                            clearTimeout(timers[id][i].t);
                        }
                        delete timers[id];
                    } else {
                        if (sandbox.verbose) sandbox.log('setStateDelayed: no running timers', 'info');
                    }
                }
                // If no delay => start immediately
                if (!delay) {
                    sandbox.setState(id, state, isAck, callback);
                    return null;
                } else {
                    // If delay
                    timers[id] = timers[id] || [];

                    // calculate timerId
                    timerId++;
                    if (timerId > 0xFFFFFFFE) timerId = 0;

                    // Start timeout
                    var timer = setTimeout(function (_timerId) {
                        sandbox.setState(id, state, isAck, callback);
                        // delete timer handler
                        if (timers[id]) {
                            for (var t = 0; t < timers[id].length; t++) {
                                if (timers[id][t].id === _timerId) {
                                    timers[id].splice(t, 1);
                                    break;
                                }
                            }
                            if (!timers[id].length) delete timers[id];
                        }
                    }, delay, timerId);

                    // add timer handler
                    timers[id].push({t: timer, id: timerId});
                    return timerId;
                }
            },
            clearStateDelayed: function (id, timerId) {
                if (sandbox.verbose) sandbox.log('clearStateDelayed(id=' + id + ', timerId=' + timerId + ')', 'info');
                if (timers[id]) {

                    for (var i = timers[id].length - 1; i >= 0; i--) {
                        if (timerId === undefined || timers[id][i].id === timerId) {
                            clearTimeout(timers[id][i].t);
                            if (timerId !== undefined) timers[id].splice(i, 1);
                            if (sandbox.verbose) sandbox.log('clearStateDelayed: clear timer ' + timers[id][i].id, 'info');
                        }
                    }
                    if (timerId === undefined) {
                        delete timers[id];
                    } else {
                        if (!timers[id].length) delete timers[id];
                    }
                    return true;
                }
                return false;
            },
            getState:       function (id, callback) {
                if (typeof callback === 'function') {
                    if (id.indexOf('.') === -1) {
                        adapter.getState(id, callback);
                    } else {
                        adapter.getForeignState(id, callback);
                    }
                } else {
                    if (adapter.config.subscribe) {
                        sandbox.log('Cannot use sync getState, use callback instead getState("' + id + '", function (err, state){});', 'error');
                    } else {
                        if (states[id]) {
                            if (sandbox.verbose) sandbox.log('getState(id=' + id + ', timerId=' + timerId + ') => ' + JSON.stringify(states[id]), 'info');
                            return states[id];
                        }
                        if (states[adapter.namespace + '.' + id]) {
                            if (sandbox.verbose) sandbox.log('getState(id=' + id + ', timerId=' + timerId + ') => ' + states[adapter.namespace + '.' + id], 'info');
                            return states[adapter.namespace + '.' + id];
                        }

                        if (sandbox.verbose) sandbox.log('getState(id=' + id + ', timerId=' + timerId + ') => not found', 'info');

                        adapter.log.warn('State "' + id + '" not found');
                        return {val: null, notExist: true};
                    }
                }
            },
            getIdByName:    function (name, alwaysArray) {
                if (sandbox.verbose) sandbox.log('getIdByName(name=' + name + ', alwaysArray=' + alwaysArray + ') => ' + names[name], 'info');
                if (alwaysArray) {
                    if (typeof names[name] === 'string') {
                        return [names[name]];
                    }
                    return names[name];
                } else {
                    return names[name];
                }
            },
            getObject:      function (id, enumName) {
                if (!objects[id]) {
                    if (sandbox.verbose) sandbox.log('getObject(id=' + id + ', enumName=' + enumName + ') => does not exist', 'info');
                    adapter.log.warn('Object "' + id + '" does not exist');
                    return null;
                } else if (enumName) {
                    var e = getObjectEnumsSync(id);
                    var obj = JSON.parse(JSON.stringify(objects[id]));
                    obj.enumIds   = JSON.parse(JSON.stringify(e.enumIds));
                    obj.enumNames = JSON.parse(JSON.stringify(e.enumNames));
                    if (typeof enumName === 'string') {
                        var r = new RegExp('^enum\.' + enumName + '\.');
                        for (var i = obj.enumIds.length - 1; i >= 0; i--) {
                            if (!r.test(obj.enumIds[i])) {
                                obj.enumIds.splice(i, 1);
                                obj.enumNames.splice(i, 1);
                            }
                        }
                    }
                    if (sandbox.verbose) sandbox.log('getObject(id=' + id + ', enumName=' + enumName + ') => ' + JSON.stringify(obj), 'info');

                    return obj;
                } else {
                    var result;
                    try {
                        result = JSON.parse(JSON.stringify(objects[id]));
                    } catch (err) {
                        adapter.log.error('Object "' + id + '" can\'t be copied');
                        return null;
                    }
                    if (sandbox.verbose) sandbox.log('getObject(id=' + id + ', enumName=' + enumName + ') => ' + JSON.stringify(result), 'info');
                    return result;
                }
            },
            setObject:      function (id, obj, callback) {
                adapter.log.error('Function "setObject" is not allowed. Use adapter settings to allow it.');
                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, 'Function "setObject" is not allowed. Use adapter settings to allow it.');
                    } catch (e) {
                        adapter.log.error('Error in callback: ' + e)
                    }
                }
            },
            extendObject:      function (id, obj, callback) {
                adapter.log.error('Function "extendObject" is not allowed. Use adapter settings to allow it.');
                if (typeof callback === 'function') {
                    try {
                        callback.call(sandbox, 'Function "extendObject" is not allowed. Use adapter settings to allow it.');
                    } catch (e) {
                        adapter.log.error('Error in callback: ' + e)
                    }
                }
            },
            getEnums:  function (enumName) {
                var result = [];
                var r = enumName ? new RegExp('^enum\.' + enumName + '\.') : false;
                for (var i = 0; i < enums.length; i++) {
                    if (!r || r.test(enums[i])) {
                        result.push({
                            id:      enums[i],
                            members: (objects[enums[i]].common) ? objects[enums[i]].common.members : [],
                            name:    objects[enums[i]].common.name
                        });
                    }
                }
                if (sandbox.verbose) sandbox.log('getEnums(enumName=' + enumName + ') => ' + JSON.stringify(result), 'info');
                return JSON.parse(JSON.stringify(result));
            },
            createState: function (name, initValue, forceCreation, common, native, callback) {
                if (typeof native === 'function') {
                    callback  = native;
                    native = {};
                }
                if (typeof common === 'function') {
                    callback  = common;
                    common = undefined;
                }
                if (typeof initValue === 'function') {
                    callback  = initValue;
                    initValue = undefined;
                }
                if (typeof forceCreation === 'function') {
                    callback  = forceCreation;
                    forceCreation = undefined;
                }
                if (typeof initValue === 'object') {
                    common = initValue;
                    native = forceCreation;
                    forceCreation = undefined;
                    initValue = undefined;
                }
                if (typeof forceCreation === 'object') {
                    common = forceCreation;
                    native = common;
                    forceCreation = undefined;
                }
                common = common || {};
                common.name = common.name || name;
                common.role = common.role || 'javascript';
                common.type = common.type || 'mixed';
                if (initValue === undefined) initValue = common.def;

                native = native || {};

                // Check min, max and def values for number
                if (common.type !== undefined && common.type === 'number') {
                    var min = 0;
                    var max = 0;
                    var def = 0;
                    var err;
                    if (common.min !== undefined) {
                        min = common.min;
                        if (typeof min !== 'number') {
                            min = parseFloat(min);
                            if (isNaN(min)) {
                                err = 'Wrong type of ' + id + '.common.min';
                                sandbox.log(err, 'error');
                                if (typeof callback === 'function') {
                                    try {
                                        callback.call(sandbox, err);
                                    } catch (e) {
                                        adapter.log.error('Error in callback: ' + e)
                                    }
                                }
                                return;
                            } else {
                                common.min = min;
                            }
                        }
                    }
                    if (common.max !== undefined) {
                        max = common.max;
                        if (typeof max !== 'number') {
                            max = parseFloat(max);
                            if (isNaN(max)) {
                                err = 'Wrong type of ' + id + '.common.max';
                                sandbox.log(err, 'error');
                                if (typeof callback === 'function') {
                                    try {
                                        callback.call(sandbox, err);
                                    } catch (e) {
                                        adapter.log.error('Error in callback: ' + e)
                                    }
                                }
                                return;
                            } else {
                                common.max = max;
                            }
                        }
                    }
                    if (common.def !== undefined) {
                        def = common.def;
                        if (typeof def !== 'number') {
                            def = parseFloat(def);
                            if (isNaN(def)) {
                                err = 'Wrong type of ' + id + '.common.def';
                                sandbox.log(err, 'error');
                                if (typeof callback === 'function') {
                                    try {
                                        callback.call(sandbox, err);
                                    } catch (e) {
                                        adapter.log.error('Error in callback: ' + e)
                                    }
                                }
                                return;
                            } else {
                                common.def = def;
                            }
                        }
                    }
                    if (common.min !== undefined && common.max !== undefined && min > max) {
                        common.max = min;
                        common.min = max;
                    }
                    if (common.def !== undefined && common.min !== undefined && def < min) common.def = min;
                    if (common.def !== undefined && common.max !== undefined && def > max) common.def = max;
                }

                if (sandbox.verbose) sandbox.log('createState(name=' + name + ', initValue=' + initValue + ', forceCreation=' + forceCreation + ', common=' + JSON.stringify(common) + ', native=' + JSON.stringify(native) + ')', 'debug');

                if (forceCreation) {
                    // todo: store object in objects to have this object directly after callback
                    adapter.setObject(name, {
                        common: common,
                        native: native,
                        type:   'state'
                    }, function (err) {
                        if (err) adapter.log.warn('Cannot set object "' + name + '": ' + err);

                        if (initValue !== undefined) {
                            adapter.setState(name, initValue, callback);
                        } else {
                            if (typeof callback === 'function') {
                                try {
                                    callback.call(sandbox, name);
                                } catch (e) {
                                    adapter.log.error('Error in callback: ' + e)
                                }
                            }
                        }
                    });
                } else {
                    adapter.getObject(name, function (err, obj) {
                        if (err || !obj) {
                            // todo: store object in objects to have this object directly after callback
                            // create new one
                            if (name.match(/^javascript\.\d+\./)) {
                                adapter.setForeignObject(name, {
                                    common: common,
                                    native: native,
                                    type:   'state'
                                }, function (err) {
                                    if (err) adapter.log.warn('Cannot set object "' + name + '": ' + err);

                                    if (initValue !== undefined) {
                                        adapter.setForeignState(name, initValue, callback);
                                    } else {
                                        adapter.setForeignState(name, null,      callback);
                                    }
                                });
                            } else {
                                adapter.setObject(name, {
                                    common: common,
                                    native: native,
                                    type:   'state'
                                }, function (err) {
                                    if (err) adapter.log.warn('Cannot set object "' + name + '": ' + err);

                                    if (initValue !== undefined) {
                                        adapter.setState(name, initValue, callback);
                                    } else {
                                        adapter.setState(name, null,      callback);
                                    }
                                });

                            }
                        } else {
                            if (!adapter.config.subscribe && !states[name] && !states[adapter.namespace + '.' + name]) {
                                if (name.substring(0, adapter.namespace.length) !== adapter.namespace) {
                                    states[adapter.namespace + '.' + name] = {val: null};
                                } else {
                                    states[name] = {val: null};
                                }
                            }
                            // state yet exists
                            if (typeof callback === 'function') {
                                try {
                                    callback.call(sandbox, name);
                                } catch (e) {
                                    adapter.log.error('Error in callback: ' + e)
                                }
                            }
                        }
                    });
                }
            },
            deleteState:      function (id, callback) {
                // todo: check rights
                var found = false;
                if (objects[id]) {
                    found = true;
                    delete objects[id];
                }
                if (states[id])  delete states[id];
                if (objects[adapter.namespace + '.' + id]) {
                    delete objects[adapter.namespace + '.' + id];
                    found = true;
                }
                if (states[adapter.namespace + '.' + id])  delete states[adapter.namespace + '.' + id];

                if (sandbox.verbose) sandbox.log('deleteState(id=' + id + ')', 'debug');
                adapter.delObject(id, function (err) {
                    if (err) adapter.log.warn('Object for state "' + id + '" does not exist: ' + err);

                    adapter.delState(id, function (err) {
                        if (err) adapter.log.error('Cannot delete state "' + id + '": ' + err);
                        if (typeof callback === 'function') {
                            if (typeof callback === 'function') {
                                try {
                                    callback.call(sandbox, err, found);
                                } catch (e) {
                                    adapter.log.error('Error in callback: ' + e)
                                }
                            }
                        }
                    });

                });
            },
            sendTo:    function (_adapter, cmd, msg, callback) {
                if (sandbox.verbose) sandbox.log('sendTo(adapter=' + _adapter + ', cmd=' + cmd + ', msg=' + JSON.stringify(msg) + ')', 'info');
                adapter.sendTo(_adapter, cmd, msg, callback);
            },
            sendto:    function (_adapter, cmd, msg, callback) {
                return sandbox.sendTo(_adapter, cmd, msg, callback);
            },
            setInterval:   function (callback, ms, arg1, arg2, arg3, arg4) {
                var int = setInterval(function (_arg1, _arg2, _arg3, _arg4) {
                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, _arg1, _arg2, _arg3, _arg4);
                        } catch (e) {
                            adapter.log.error('Error in callback: ' + e)
                        }
                    }
                }, ms, arg1, arg2, arg3, arg4);
                script.intervals.push(int);

                if (sandbox.verbose) sandbox.log('setInterval(ms=' + ms + ')', 'info');

                return int;
            },
            clearInterval: function (id) {
                var pos = script.intervals.indexOf(id);
                if (pos !== -1) {
                    if (sandbox.verbose) sandbox.log('clearInterval() => cleared', 'info');
                    clearInterval(id);
                    script.intervals.splice(pos, 1);
                } else {
                    if (sandbox.verbose) sandbox.log('clearInterval() => not found', 'warn');
                }
            },
            setTimeout:    function (callback, ms, arg1, arg2, arg3, arg4) {
                var to = setTimeout(function (_arg1, _arg2, _arg3, _arg4) {
                    // Remove timeout from the list
                    var pos = script.timeouts.indexOf(to);
                    if (pos !== -1) script.timeouts.splice(pos, 1);

                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, _arg1, _arg2, _arg3, _arg4);
                        } catch (e) {
                            adapter.log.error('Error in callback: ' + e)
                        }
                    }
                }, ms, arg1, arg2, arg3, arg4);

                if (sandbox.verbose) sandbox.log('setTimeout(ms=' + ms + ')', 'info');

                script.timeouts.push(to);
                return to;
            },
            clearTimeout:  function (id) {
                var pos = script.timeouts.indexOf(id);
                if (pos !== -1) {
                    if (sandbox.verbose) sandbox.log('clearTimeout() => cleared', 'info');
                    clearTimeout(id);
                    script.timeouts.splice(pos, 1);
                } else {
                    if (sandbox.verbose) sandbox.log('clearTimeout() => not found', 'warn');
                }
            },
            cb:        function (callback) {
                return function () {
                    if (scripts[name] && scripts[name]._id === sandbox._id) {
                        if (typeof callback === 'function') {
                            try {
                                callback.apply(this, arguments);
                            } catch (e) {
                                adapter.log.error('Error in callback: ' + e)
                            }
                        }
                    } else {
                        adapter.log.warn('Callback for old version of script: ' + name);
                    }
                };
            },
            compareTime: function (startTime, endTime, operation, time) {
                var pos;
                if (startTime && typeof startTime === 'string') {
                    if ((pos = astroListLow.indexOf(startTime.toLowerCase())) !== -1) {
                        startTime = sandbox.getAstroDate(astroList[pos]);
                        startTime = startTime.toLocaleTimeString([], {
                            hour:   '2-digit',
                            minute: '2-digit',
                            hour12: false
                        });
                    }
                } else if (startTime && typeof startTime === 'object' && startTime.astro) {
                    startTime = sandbox.getAstroDate(startTime.astro, startTime.date || new Date(), startTime.offset || 0);
                    startTime = startTime.toLocaleTimeString([], {
                        hour:   '2-digit',
                        minute: '2-digit',
                        hour12: false
                    });
                }
                if (endTime && typeof endTime === 'string') {
                    if ((pos = astroListLow.indexOf(endTime.toLowerCase())) !== -1) {
                        endTime = sandbox.getAstroDate(astroList[pos]);
                        endTime = endTime.toLocaleTimeString([], {
                            hour:   '2-digit',
                            minute: '2-digit',
                            hour12: false
                        });
                    }
                } else if (endTime && typeof endTime === 'object' && endTime.astro) {
                    endTime = sandbox.getAstroDate(endTime.astro, endTime.date || new Date(), endTime.offset || 0);
                    endTime = endTime.toLocaleTimeString([], {
                        hour:   '2-digit',
                        minute: '2-digit',
                        hour12: false
                    });
                }
                if (time && typeof time === 'string') {
                    if ((pos = astroListLow.indexOf(time.toLowerCase())) !== -1) {
                        time = sandbox.getAstroDate(astroList[pos]);
                    }
                } else if (time && typeof time === 'object' && time.astro) {
                    time = sandbox.getAstroDate(time.astro, time.date || new Date(), time.offset || 0);
                }
                
                if (time && typeof time !== 'object') {
                    time = new Date(time);
                } else if (!time) {
                    time = new Date();
                    time.setMilliseconds(0);
                }

                if (typeof startTime === 'string') {
                    if (startTime.indexOf(' ') === -1 && startTime.indexOf('T') === -1) {
                        var parts = startTime.split(':');
                        startTime = new Date();
                        startTime.setHours(parseInt(parts[0], 10));
                        startTime.setMinutes(parseInt(parts[1], 10));
                        startTime.setMilliseconds(0);

                        if (parts.length === 3) {
                            startTime.setSeconds(parseInt(parts[2], 10));
                        } else {
                            startTime.setSeconds(0);
                        }
                    } else {
                        startTime = new Date(startTime);
                    }
                } else {
                    startTime = new Date(startTime);
                }
                startTime = startTime.getTime();

                if (endTime && typeof endTime === 'string') {
                    if (endTime.indexOf(' ') === -1 && endTime.indexOf('T') === -1) {
                        var parts = endTime.split(':');
                        endTime = new Date();
                        endTime.setHours(parseInt(parts[0], 10));
                        endTime.setMinutes(parseInt(parts[1], 10));
                        endTime.setMilliseconds(0);

                        if (parts.length === 3) {
                            endTime.setSeconds(parseInt(parts[2], 10));
                        } else {
                            endTime.setSeconds(0);
                        }
                    } else {
                        endTime = new Date(endTime);
                    }
                } else if (endTime) {
                    endTime = new Date(endTime);
                } else {
                    endTime = null;
                }

                if (endTime) {
                    if (endTime.getTime() < startTime) {
                        endTime.setDate(endTime.getDate() + 1);
                    }
                    endTime = endTime.getTime();
                }

                if (operation === 'between' && endTime) {
                    return time >= startTime && time < endTime;
                } else if (operation === 'not between' && endTime) {
                    return !(time >= startTime && time < endTime);
                } else if (operation === '>') {
                    return time > startTime;
                } else if (operation === '>=') {
                    return time >= startTime;
                } else if (operation === '<') {
                    return time < startTime;
                } else if (operation === '<=') {
                    return time <= startTime;
                } else if (operation === '==') {
                    return time === startTime;
                }  else if (operation === '<>') {
                    return time !== startTime;
                } else {
                    adapter.log.warn('Invalid operator: ' + operation);
                    return false;
                }
            },
            onStop:      function (cb, timeout) {
                if (sandbox.verbose) sandbox.log('onStop(timeout=' + timeout + ')', 'info');

                script.onStopCb = cb;
                script.onStopTimeout = timeout || 1000;
            },
            formatValue: function (value, decimals, format) {
                if (!format && objects['system.config']) {
                    format = objects['system.config'].common.isFloatComma ?  '.,' : ',.';
                }
                return adapter.formatValue(value, decimals, format);
            },

            formatDate: function (date, format, language) {
                if (!format) {
                    format = objects['system.config'] ? (objects['system.config'].common.dateFormat || 'DD.MM.YYYY') : 'DD.MM.YYYY';
                }
                if (format.match(/W|Н|O|О/)) {
                    var text = adapter.formatDate(date, format);
                    if (!language || !dayOfWeeksFull[language]) language = objects['system.config'].common.language;
                    var d = date.getDay();
                    text = text.replace('WW', dayOfWeeksFull[language][d]);
                    text = text.replace('НН', dayOfWeeksFull[language][d]);
                    text = text.replace('W',  dayOfWeeksShort[language][d]);
                    text = text.replace('Н',  dayOfWeeksShort[language][d]);
                    var m = date.getMonth();
                    text = text.replace('OO', monthFull[language][m]);
                    text = text.replace('ОО', monthFull[language][m]);
                    text = text.replace('O',  monthShort[language][m]);
                    text = text.replace('О',  monthShort[language][m]);
                    return text;
                } else {
                    return adapter.formatDate(date, format);
                }
            },

            getDateObject: function (date) {
                if (typeof date === 'object') return date;
                if (typeof date !== 'string') return new Date(date);
                if (date.match(/^\d?\d$/)) {
                    var _now = new Date();
                    date = _now.getFullYear() + '-' + (_now.getMonth() + 1) + '-' + _now.getDate() + ' ' + date + ':00';
                } else
                // 20:00, 2:00, 20:00:00, 2:00:00
                if (date.match(/^\d?\d:\d\d(:\d\d)?$/)) {
                    var now = new Date();
                    date = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate() + ' ' + date;
                }
                return new Date(date);
            },

            writeFile: function (_adapter, fileName, data, callback) {
                if (typeof data === 'function' || !data) {
                    callback = data;
                    data     = fileName;
                    fileName = _adapter;
                    _adapter = null;
                }

                if (debug) {
                    sandbox.log('readFile(adapter=' + _adapter + ', fileName=' + fileName + ') - ' + words._('was not executed, while debug mode is active'), 'warn');
                    if (typeof callback === 'function') {
                        setTimeout(function () {
                            try {
                                callback.call(sandbox);
                            } catch (e) {
                                adapter.log.error('Error in callback: ' + e)
                            }
                        }, 0);
                    }
                } else {
                    if (sandbox.verbose) sandbox.log('readFile(adapter=' + _adapter + ', fileName=' + fileName + ')', 'info');
                    adapter.writeFile(_adapter, fileName, data, callback);
                }
            },
            readFile:  function (_adapter, fileName, callback) {
                if (typeof fileName === 'function') {
                    callback = fileName;
                    fileName = _adapter;
                    _adapter = null;
                }
                if (sandbox.verbose) sandbox.log('readFile(adapter=' + _adapter + ', fileName=' + fileName + ')', 'info');

                adapter.readFile(_adapter, fileName, callback);
            },
            unlink: function (_adapter, fileName, callback) {
                if (typeof fileName === 'function') {
                    callback = fileName;
                    fileName = _adapter;
                    _adapter = null;
                }
                if (sandbox.verbose) sandbox.log('unlink(adapter=' + _adapter + ', fileName=' + fileName + ')', 'info');

                if (debug) {
                    sandbox.log('unlink(adapter=' + _adapter + ', fileName=' + fileName + ') - ' + words._('was not executed, while debug mode is active'), 'warn');
                    if (typeof callback === 'function') {
                        setTimeout(function () {
                            try {
                                callback.call(sandbox);
                            } catch (e) {
                                adapter.log.error('Error in callback: ' + e)
                            }
                        }, 0);
                    }
                } else {
                    if (sandbox.verbose) sandbox.log('unlink(adapter=' + _adapter + ', fileName=' + fileName + ')', 'info');
                    adapter.unlink(_adapter, fileName, callback);
                }
            },
            delFile: function (_adapter, fileName, callback) {
                return sandbox.unlink(_adapter, fileName, callback);
            },
			getHistory: function (instance, options, callback) {
                if (typeof instance === 'object') {
                    callback = options;
                    options  = instance;
                    instance = null;
                }

                if (typeof callback !== 'function') {
                    adapter.log.error('No callback found!');
                    return;
                }
                if (typeof options !== 'object') {
                    adapter.log.error('No options found!');
                    return;
                }
                if (!options.id) {
                    adapter.log.error('No ID found!');
                    return;
                }
                var timeoutMs = parseInt(options.timeout, 10) || 20000;

                if (!instance) {
                    instance = objects['system.config'] ? objects['system.config'].common.defaultHistory : null;
                }

                if (sandbox.verbose) sandbox.log('getHistory(instance=' + instance + ', options=' + JSON.stringify(options) + ')', 'debug');

                if (!instance) {
                    adapter.log.error('No default history instance found!');
                    try {
                        callback.call(sandbox, 'No default history instance found!');
                    } catch (e) {
                        adapter.log.error('Error in callback: ' + e)
                    }
                    return;
                }
                if (instance.match(/^system\.adapter\./)) instance = instance.substring('system.adapter.'.length);

                if (!objects['system.adapter.' + instance]) {
                    adapter.log.error('Instance "' + instance + '" not found!');
                    try {
                        callback.call(sandbox, 'Instance "' + instance + '" not found!');
                    } catch (e) {
                        adapter.log.error('Error in callback: ' + e)
                    }
                    return;
                }
                var timeout = setTimeout(function () {
                    timeout = null;

                    if (sandbox.verbose) sandbox.log('getHistory => timeout', 'debug');

                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, 'Timeout', null, options, instance);
                        } catch (e) {
                            adapter.log.error('Error in callback: ' + e)
                        }
                        callback = null;
                    }
                }, timeoutMs);

                adapter.sendTo(instance, 'getHistory', {id: options.id, options: options}, function (result) {
                    if (timeout) clearTimeout(timeout);

                    if (sandbox.verbose && result.error)  sandbox.log('getHistory => ' + result.error, 'error');
                    if (sandbox.verbose && result.result) sandbox.log('getHistory => ' + result.result.length + ' items', 'debug');

                    if (typeof callback === 'function') {
                        try {
                            callback.call(sandbox, result.error, result.result, options, instance);
                        } catch (e) {
                            adapter.log.error('Error in callback: ' + e)
                        }
                        callback = null;
                    }

                });
            },
            runScript: function (scriptName, callback) {
                scriptName = scriptName || name;
                if (!scriptName.match(/^script\.js\./)) scriptName = 'script.js.' + scriptName;
                // start other script
                if (!objects[scriptName] || !objects[scriptName].common) {
                    sandbox.log('Cannot start "' + scriptName + '", because not found', 'error');
                    return false;
                } else {
                    if (debug) {
                        sandbox.log('runScript(scriptName=' + scriptName + ') - ' + words._('was not executed, while debug mode is active'), 'warn');
                    } else {
                        if (objects[scriptName].common.enabled) {
                            objects[scriptName].common.enabled = false;
                            adapter.extendForeignObject(scriptName, {common: {enabled: false}}, function (err, obj) {
                                adapter.extendForeignObject(scriptName, {common: {enabled: true}}, function (err) {
                                    if (callback === 'function') callback(err);
                                });
                                scriptName = null;
                            });
                        } else {
                            adapter.extendForeignObject(scriptName, {common: {enabled: true}}, function (err) {
                                if (callback === 'function') callback(err);
                            });
                        }
                    }
                    return true;
                }
            },
            startScript: function (scriptName, ignoreIfStarted, callback) {
                if (typeof ignoreIfStarted === 'function') {
                    callback = ignoreIfStarted;
                    ignoreIfStarted = false;
                }
                scriptName = scriptName || name;
                if (!scriptName.match(/^script\.js\./)) scriptName = 'script.js.' + scriptName;
                // start other script
                if (!objects[scriptName] || !objects[scriptName].common) {
                    sandbox.log('Cannot start "' + scriptName + '", because not found', 'error');
                    return false;
                } else {
                    console.log('STARTING!');
                    if (debug) {
                        sandbox.log('startScript(scriptName=' + scriptName + ') - ' + words._('was not executed, while debug mode is active'), 'warn');
                    } else {
                        if (objects[scriptName].common.enabled) {
                            if (!ignoreIfStarted) {
                                objects[scriptName].common.enabled = false;
                                adapter.extendForeignObject(scriptName, {common: {enabled: false}}, function (err) {
                                    adapter.extendForeignObject(scriptName, {common: {enabled: true}}, function (err) {
                                        if (callback === 'function') callback(err, true);
                                    });
                                    scriptName = null;
                                });
                            } else if (callback === 'function') {
                                callback(null, false);
                            }
                        } else {
                            adapter.extendForeignObject(scriptName, {common: {enabled: true}}, function (err) {
                                if (callback === 'function') callback(err, true);
                            });
                        }
                    }
                    return true;
                }
            },
            stopScript: function (scriptName, callback) {
                scriptName = scriptName || name;

                if (!scriptName.match(/^script\.js\./)) scriptName = 'script.js.' + scriptName;

                // stop other script
                if (!objects[scriptName] || !objects[scriptName].common) {
                    sandbox.log('Cannot stop "' + scriptName + '", because not found', 'error');
                    return false;
                } else {
                    if (debug) {
                        sandbox.log('stopScript(scriptName=' + scriptName + ') - ' + words._('was not executed, while debug mode is active'), 'warn');
                    } else {
                        if (objects[scriptName].common.enabled) {
                            objects[scriptName].common.enabled = false;
                            adapter.extendForeignObject(scriptName, {common: {enabled: false}}, function (err) {
                                if (callback === 'function') callback(err, true);
                                scriptName = null;
                            });
                        } else if (callback === 'function') {
                            callback(null, false);
                        }
                    }
                    return true;
                }
            },
            isScriptActive: function (scriptName) {
                if (!scriptName.match(/^script\.js\./)) scriptName = 'script.js.' + scriptName;
                if (!objects[scriptName] || !objects[scriptName].common) {
                    sandbox.log('Script does not exist', 'error');
                    return false;
                } else {
                    return objects[scriptName].common.enabled;
                }
            },
            toInt:     function (val) {
                if (val === true  || val === 'true')  val = 1;
                if (val === false || val === 'false') val = 0;
                val = parseInt(val) || 0;
                return val;
            },
            toFloat:   function (val) {
                if (val === true  || val === 'true')  val = 1;
                if (val === false || val === 'false') val = 0;
                val = parseFloat(val) || 0;
                return val;
            },
            toBoolean: function (val) {
                if (val === '1' || val === 'true')  val = true;
                if (val === '0' || val === 'false') val = false;
                return !!val;
            },
            console: {
                log:    function (msg) {
                    sandbox.log(msg, 'info');
                },
                error:  function (msg) {
                    sandbox.log(msg, 'error');
                },
                warn:   function (msg) {
                    sandbox.log(msg, 'warn');
                },
                debug:  function (msg) {
                    sandbox.log(msg, 'debug');
                }
            }
        };

        if (adapter.config.enableSetObject) {
            sandbox.setObject = function (id, obj, callback) {
                if (debug) {
                    sandbox.log('setObject(id=' + id + ', obj=' + JSON.stringify(obj) + ') - ' + words._('was not executed, while debug mode is active'), 'warn');
                    if (typeof callback === 'function') {
                        setTimeout(function () {
                            try {
                                callback.call(sandbox);
                            } catch (e) {
                                adapter.log.error('Error in callback: ' + e)
                            }
                        }, 0);
                    }
                } else {
                    if (sandbox.verbose) sandbox.log('setObject(id=' + id + ', obj=' + JSON.stringify(obj) + ')', 'info');
                    adapter.setForeignObject(id, obj, callback);
                }
            };
            sandbox.extendObject = function (id, obj, callback) {
                if (debug) {
                    sandbox.log('extendObject(id=' + id + ', obj=' + JSON.stringify(obj) + ') - ' + words._('was not executed, while debug mode is active'), 'warn');
                    if (typeof callback === 'function') {
                        setTimeout(function () {
                            try {
                                callback.call(sandbox);
                            } catch (e) {
                                adapter.log.error('Error in callback: ' + e)
                            }
                        }, 0);
                    }
                } else {
                    if (sandbox.verbose) sandbox.log('extendObject(id=' + id + ', obj=' + JSON.stringify(obj) + ')', 'info');
                    adapter.extendForeignObject(id, obj, callback);
                }
            };
        }

        try {
            script.runInNewContext(sandbox, {
                filename:       name,
                displayErrors:  true,
                lineOffset:     globalScriptLines
            });
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

    function unsubscribe(id) {
        if (!id) {
            adapter.log.warn('unsubscribe: empty name');
            return;
        }

        if (typeof id === 'object' && id && id.constructor && id.constructor.name === 'RegExp') {
            //adapter.log.warn('unsubscribe: todo - process regexp');
            return;
        }

        if (typeof id !== 'string') {
            adapter.log.error('unsubscribe: invalid type of id - ' + typeof id);
            return;
        }
        var parts = id.split('.');
        var _adapter = 'system.adapter.' + parts[0] + '.' + parts[1];
        if (objects[_adapter] && objects[_adapter].common && objects[_adapter].common.subscribable) {
            var a     = parts[0] + '.' + parts[1];
            var alive = 'system.adapter.' + a + '.alive';
            if (adapterSubs[alive]) {
                var pos = adapterSubs[alive].indexOf(id);
                if (pos !== -1) adapterSubs[alive].splice(pos, 1);
                if (!adapterSubs[alive].length) delete adapterSubs[alive];
            }
            adapter.sendTo(a, 'unsubscribe', id);
        }
    }

    function stop(name, callback) {
        adapter.log.info('Stop script ' + name);

        adapter.setState('scriptEnabled.' + name.substring('script.js.'.length), false, true);

        if (scripts[name]) {
            // Remove from subscriptions
            isEnums = false;
            if (adapter.config.subscribe) {
                // check all subscribed IDs
                for (var id in scripts[name].subscribes) {
                    if (!scripts[name].subscribes.hasOwnProperty(id)) continue;
                    if (subscribedPatterns[id]) {
                        subscribedPatterns[id] -= scripts[name].subscribes[id];
                        if (subscribedPatterns[id] <= 0) {
                            adapter.unsubscribeForeignStates(id);
                            delete subscribedPatterns[id];
                            if (states[id]) delete states[id];
                        }
                    }
                }
            }

            for (var i = subscriptions.length - 1; i >= 0 ; i--) {
                if (subscriptions[i].name === name) {
                    var sub = subscriptions.splice(i, 1)[0];
                    if (sub) {
                        unsubscribe(sub.pattern.id);
                    }
                } else {
                    if (!isEnums && subscriptions[i].pattern.enumName || subscriptions[i].pattern.enumId) isEnums = true;
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
                if (scripts[name].schedules[i]) {
                    var _name = scripts[name].schedules[i].name;
                    if (!mods['node-schedule'].cancelJob(scripts[name].schedules[i])) {
                        adapter.log.error('Error by canceling scheduled job "' + _name + '"');
                    }
                }
            }
            
            // if callback for on stop
            if (typeof scripts[name].onStopCb === 'function') {
                scripts[name].onStopTimeout = parseInt(scripts[name].onStopTimeout, 10) || 1000;
                
                var timeout = setTimeout(function () {
                    if (timeout) {
                        timeout = null;
                        delete scripts[name];
                        if (typeof callback === 'function') callback(true, name);
                    }
                }, scripts[name].onStopTimeout);
                try {
                    scripts[name].onStopCb(function () {
                        if (timeout) {
                            clearTimeout(timeout);
                            timeout = null;
                            delete scripts[name];
                            if (typeof callback === 'function') callback(true, name);
                        }
                    });
                } catch (e) {
                    adapter.log.error('error in onStop callback: ' + e);
                }

            } else {
                delete scripts[name];
                if (typeof callback === 'function') callback(true, name);
            }
        } else {
            if (typeof callback === 'function') callback(false, name);
        }
    }

    function prepareScript(obj, callback) {
        if (obj &&
            obj.common.enabled &&
            obj.common.engine === 'system.adapter.' + adapter.namespace &&
            obj.common.source) {
            var name = obj._id;

            adapter.setState('scriptEnabled.' + name.substring('script.js.'.length), true, true);

            if ((obj.common.engineType.match(/^[jJ]ava[sS]cript/) || obj.common.engineType === 'Blockly')) {
                // Javascript
                adapter.log.info('Start javascript ' + name);
                scripts[name] = compile(globalScript + obj.common.source, name);
                if (scripts[name]) execute(scripts[name], name, obj.common.verbose, obj.common.debug);
                if (typeof callback === 'function') callback(true, name);
            } else if (obj.common.engineType.match(/^[cC]offee/)) {
                // CoffeeScript
                mods['coffee-compiler'].fromSource(obj.common.source, {sourceMap: false, bare: true}, function (err, js) {
                    if (err) {
                        adapter.log.error(name + ' coffee compile ' + err);
                        if (typeof callback === 'function') callback(false, name);
                        return;
                    }
                    adapter.log.info('Start coffescript ' + name);
                    scripts[name] = compile(globalScript + '\n' + js, name);
                    if (scripts[name]) execute(scripts[name], name, obj.common.verbose, obj.common.debug);
                    if (typeof callback === 'function') callback(true, name);
                });
            }
        } else {
            var _name;
            if (obj && obj._id) {
                _name = obj._id;
                adapter.setState('scriptEnabled.' + _name.substring('script.js.'.length), false, true);
            }
            if (!obj) adapter.log.error('Invalid script');
            if (typeof callback === 'function') callback(false, _name);
        }
    }

    function load(nameOrObject, callback) {
        if (typeof nameOrObject === 'object') {
            return prepareScript(nameOrObject, callback);
        } else {
            adapter.getForeignObject(nameOrObject, function (err, obj) {
                if (!obj || err) {
                    if (err) adapter.log.error('Invalid script "' + nameOrObject + '": ' + err);
                    if (typeof callback === 'function') callback(false, nameOrObject);
                } else {
                    return prepareScript(obj, callback);
                }
            });
        }
    }

    function patternMatching(event, pattern) {
        if (!pattern.logic) pattern.logic = 'and';

        var matched = false;

        // state id matching
        if (pattern.id) {
            if (pattern.id instanceof RegExp || pattern.id.source) {
                if (event.id && event.id.match(pattern.id)) {
                    if (pattern.logic === 'or') return true;
                    matched = true;
                } else {
                    if (pattern.logic === 'and') return false;
                }
            } else {
                if (event.id && pattern.id === event.id) {
                    if (pattern.logic === 'or') return true;
                    matched = true;
                } else {
                    if (pattern.logic === 'and') return false;
                }
            }
        }

        // state name matching
        if (pattern.name) {
            if (pattern.name instanceof RegExp || pattern.name.source) {
                if (event.common.name && event.common.name.match(pattern.name)) {
                    if (pattern.logic === 'or') return true;
                    matched = true;
                } else {
                    if (pattern.logic === 'and') return false;
                }
            } else {
                if (event.common.name && pattern.name === event.common.name) {
                    if (pattern.logic === 'or') return true;
                    matched = true;
                } else {
                    if (pattern.logic === 'and') return false;
                }
            }
        }

        // todo ancestor name matching

        // change matching
        if (pattern.change) {
            switch (pattern.change) {
                case 'eq':
                    if (event.newState.val === event.oldState.val) {
                        if (pattern.logic === 'or') return true;
                        matched = true;
                    } else {
                        if (pattern.logic === 'and') return false;
                    }
                    break;
                case 'ne':
                    if (event.newState.val !== event.oldState.val) {
                        if (pattern.logic === 'or') return true;
                        matched = true;
                    } else {
                        if (pattern.logic === 'and') return false;
                    }
                    break;
                case 'gt':
                    if (event.newState.val > event.oldState.val) {
                        if (pattern.logic === 'or') return true;
                        matched = true;
                    } else {
                        if (pattern.logic === 'and') return false;
                    }
                    break;
                case 'ge':
                    if (event.newState.val >= event.oldState.val) {
                        if (pattern.logic === 'or') return true;
                        matched = true;
                    } else {
                        if (pattern.logic === 'and') return false;
                    }
                    break;
                case 'lt':
                    if (event.newState.val < event.oldState.val) {
                        if (pattern.logic === 'or') return true;
                        matched = true;
                    } else {
                        if (pattern.logic === 'and') return false;
                    }
                    break;
                case 'le':
                    if (event.newState.val <= event.oldState.val) {
                        if (pattern.logic === 'or') return true;
                        matched = true;
                    } else {
                        if (pattern.logic === 'and') return false;
                    }
                    break;
                default:
                    // on any other logic, just signal about message
                    if (pattern.logic === 'or') return true;
                    matched = true;
                    break;
            }
        }

        // Ack Matching
        if (pattern.ack !== undefined) {
            if (((pattern.ack === 'true'  || pattern.ack === true)  && (event.newState.ack === true  || event.newState.ack === 'true')) ||
                ((pattern.ack === 'false' || pattern.ack === false) && (event.newState.ack === false || event.newState.ack === 'false'))) {
                if (pattern.logic === 'or') return true;
                matched = true;
            } else {
                if (pattern.logic === 'and') return false;
            }
        }

        // oldAck Matching
        if (pattern.oldAck !== undefined) {
            if (((pattern.oldAck === 'true'  || pattern.oldAck === true)  && (event.oldState.ack === true  || event.oldState.ack === 'true')) ||
                ((pattern.oldAck === 'false' || pattern.oldAck === false) && (event.oldState.ack === false || event.oldState.ack === 'false'))) {
                if (pattern.logic === 'or') return true;
                matched = true;
            } else {
                if (pattern.logic === 'and') return false;
            }
        }

        // Value Matching
        if (pattern.val   !== undefined && pattern.val === event.newState.val) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.val !== undefined) {
            if (pattern.logic === 'and') return false;
        }
        if (pattern.valGt !== undefined && event.newState.val > pattern.valGt) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.valGt !== undefined) {
            if (pattern.logic === 'and') return false;
        }
        if (pattern.valGe !== undefined && event.newState.val >= pattern.valGe) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.valGe !== undefined) {
            if (pattern.logic === 'and') return false;
        }
        if (pattern.valLt !== undefined && event.newState.val < pattern.valLt) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.valLt !== undefined) {
            if (pattern.logic === 'and') return false;
        }
        if (pattern.valLe !== undefined && event.newState.val <= pattern.valLe) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.valLe !== undefined) {
            if (pattern.logic === 'and') return false;
        }
        if (pattern.valNe !== undefined && event.newState.val !== pattern.valNe) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.valNe !== undefined) {
            if (pattern.logic === 'and') return false;
        }

        // Old-Value matching
        if (pattern.oldVal   !== undefined && pattern.oldVal === event.oldState.val) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.oldVal !== undefined) {
            if (pattern.logic === 'and') return false;
        }
        if (pattern.oldValGt !== undefined && event.oldState.val > pattern.oldValGt) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.oldValGt !== undefined) {
            if (pattern.logic === 'and') return false;
        }
        if (pattern.oldValGe !== undefined && event.oldState.val >= pattern.oldValGe) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.oldValGe !== undefined) {
            if (pattern.logic === 'and') return false;
        }
        if (pattern.oldValLt !== undefined && event.oldState.val < pattern.oldValLt) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.oldValLt !== undefined) {
            if (pattern.logic === 'and') return false;
        }
        if (pattern.oldValLe !== undefined && event.oldState.val <= pattern.oldValLe) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.oldValLe !== undefined) {
            if (pattern.logic === 'and') return false;
        }
        if (pattern.oldValNe !== undefined && event.oldState.val !== pattern.oldValNe) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.oldValNe !== undefined) {
            if (pattern.logic === 'and') return false;
        }

        // newState.ts matching
        if (pattern.ts   && pattern.ts === event.newState.ts) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.ts) {
            if (pattern.logic === 'and') return false;
        }
        if (pattern.tsGt && event.newState.ts > pattern.tsGt) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.tsGt) {
            if (pattern.logic === 'and') return false;
        }
        if (pattern.tsGe && event.newState.ts >= pattern.tsGe) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.tsGe) {
            if (pattern.logic === 'and') return false;
        }
        if (pattern.tsLt && event.newState.ts < pattern.tsLt) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.tsLt) {
            if (pattern.logic === 'and') return false;
        }
        if (pattern.tsLe && event.newState.ts <= pattern.tsLe) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.tsLe) {
            if (pattern.logic === 'and') return false;
        }

        // oldState.ts matching
        if (pattern.oldTs   && pattern.oldTs === event.oldState.ts) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.oldTs) {
            if (pattern.logic === 'and') return false;
        }
        if (pattern.oldTsGt && event.oldState.ts > pattern.oldTsGt) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.oldTsGt) {
            if (pattern.logic === 'and') return false;
        }
        if (pattern.oldTsGe && event.oldState.ts >= pattern.oldTsGe) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.oldTsGe) {
            if (pattern.logic === 'and') return false;
        }
        if (pattern.oldTsLt && event.oldState.ts < pattern.oldTsLt) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.oldTsLt) {
            if (pattern.logic === 'and') return false;
        }
        if (pattern.oldTsLe && event.oldState.ts <= pattern.oldTsLe) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.oldTsLe) {
            if (pattern.logic === 'and') return false;
        }

        // newState.lc matching
        if (pattern.lc   && pattern.lc === event.newState.lc) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.lc) {
            if (pattern.logic === 'and') return false;
        }
        if (pattern.lcGt && event.newState.lc > pattern.lcGt) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.lcGt) {
            if (pattern.logic === 'and') return false;
        }
        if (pattern.lcGe && event.newState.lc >= pattern.lcGe) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.lcGe) {
            if (pattern.logic === 'and') return false;
        }
        if (pattern.lcLt && event.newState.lc < pattern.lcLt) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.lcLt) {
            if (pattern.logic === 'and') return false;
        }
        if (pattern.lcLe && event.newState.lc <= pattern.lcLe) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.lcLe) {
            if (pattern.logic === 'and') return false;
        }

        // oldState.lc matching
        if (pattern.oldLc   && pattern.oldLc === event.oldState.lc) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.oldLc) {
            if (pattern.logic === 'and') return false;
        }
        if (pattern.oldLcGt && event.oldState.lc > pattern.oldLcGt) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.oldLcGt) {
            if (pattern.logic === 'and') return false;
        }
        if (pattern.oldLcGe && event.oldState.lc >= pattern.oldLcGe) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.oldLcGe) {
            if (pattern.logic === 'and') return false;
        }
        if (pattern.oldLcLt && event.oldState.lc < pattern.oldLcLt) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.oldLcLt) {
            if (pattern.logic === 'and') return false;
        }
        if (pattern.oldLcLe && event.oldState.lc <= pattern.oldLcLe) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.oldLcLe) {
            if (pattern.logic === 'and') return false;
        }

        // newState.from matching
        if (pattern.from && pattern.from === event.newState.from) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.from) {
            if (pattern.logic === 'and') return false;
        }

        if (pattern.fromNe && pattern.fromNe !== event.newState.from) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.fromNe) {
            if (pattern.logic === 'and') return false;
        }

        // oldState.from matching
        if (pattern.oldFrom && pattern.oldFrom === event.oldState.from) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.oldFrom) {
            if (pattern.logic === 'and') return false;
        }

        if (pattern.oldFromNe && pattern.oldFromNe !== event.oldState.from) {
            if (pattern.logic === 'or') return true;
            matched = true;
        } else if (pattern.oldFromNe) {
            if (pattern.logic === 'and') return false;
        }

        // channelId matching
        if (pattern.channelId) {
            if (pattern.channelId instanceof RegExp) {
                if (event.channelId && event.channelId.match(pattern.channelId)) {
                    if (pattern.logic === 'or') return true;
                    matched = true;
                } else {
                    if (pattern.logic === 'and') return false;
                }
            } else {
                if (event.channelId && pattern.channelId === event.channelId) {
                    if (pattern.logic === 'or') return true;
                    matched = true;
                } else {
                    if (pattern.logic === 'and') return false;
                }
            }
        }

        // channelName matching
        if (pattern.channelName) {
            if (pattern.channelName instanceof RegExp) {
                if (event.channelName && event.channelName.match(pattern.channelName)) {
                    if (pattern.logic === 'or') return true;
                    matched = true;
                } else {
                    if (pattern.logic === 'and') return false;
                }
            } else {
                if (event.channelName && pattern.channelName === event.channelName) {
                    if (pattern.logic === 'or') return true;
                    matched = true;
                } else {
                    if (pattern.logic === 'and') return false;
                }
            }
        }

        // deviceId matching
        if (pattern.deviceId) {
            if (pattern.deviceId instanceof RegExp) {
                if (event.deviceId && event.deviceId.match(pattern.deviceId)) {
                    if (pattern.logic === 'or') return true;
                    matched = true;
                } else {
                    if (pattern.logic === 'and') return false;
                }
            } else {
                if (event.deviceId && pattern.deviceId === event.deviceId) {
                    if (pattern.logic === 'or') return true;
                    matched = true;
                } else {
                    if (pattern.logic === 'and') return false;
                }
            }
        }

        // deviceName matching
        if (pattern.deviceName) {
            if (pattern.deviceName instanceof RegExp) {
                if (event.deviceName && event.deviceName.match(pattern.deviceName)) {
                    if (pattern.logic === 'or') return true;
                    matched = true;
                } else {
                    if (pattern.logic === 'and') return false;
                }
            } else {
                if (event.deviceName && pattern.deviceName === event.deviceName) {
                    if (pattern.logic === 'or') return true;
                    matched = true;
                } else {
                    if (pattern.logic === 'and') return false;
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
                    if (pattern.logic === 'or') return true;
                    matched = true;
                } else {
                    if (pattern.logic === 'and') return false;
                }
            } else {
                if (event.enumIds && event.enumIds.indexOf(pattern.enumId) !== -1) {
                    if (pattern.logic === 'or') return true;
                    matched = true;
                } else {
                    if (pattern.logic === 'and') return false;
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
                    if (pattern.logic === 'or') return true;
                    matched = true;
                } else {
                    if (pattern.logic === 'and') return false;
                }
            } else {
                if (event.enumNames && event.enumNames.indexOf(pattern.enumName) !== -1) {
                    if (pattern.logic === 'or') return true;
                    matched = true;
                } else {
                    if (pattern.logic === 'and') return false;
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
            if (!adapter.config.subscribe) {
                states = res;
            }

            // remember all IDs
            for (var id in res) {
                if (res.hasOwnProperty(id)) {
                    stateIds.push(id);
                }
            }
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

                // Collect all names
                addToNames(objects[res[i].doc._id]);
            }

            // set language for debug messages
            if (objects['system.config'] && objects['system.config'].common.language) words.setLanguage(objects['system.config'].common.language);

            // try to use system coordinates
            if (adapter.config.useSystemGPS && objects['system.config'] &&
                objects['system.config'].common.latitude) {
                adapter.config.latitude  = parseFloat(objects['system.config'].common.latitude);
                adapter.config.longitude = parseFloat(objects['system.config'].common.longitude);
            }

            objectsReady = true;
            adapter.log.info('received all objects');
            if (statesReady && typeof callback === 'function') callback();
        });
    }

    function getObjectEnums(idObj, callback, enumIds, enumNames) {
        if (!enumIds)   enumIds   = [];
        if (!enumNames) enumNames = [];

        if (cacheObjectEnums[idObj]) {
            if (typeof callback === 'function') {
                for (var j = 0; j < cacheObjectEnums[idObj].enumIds.length; j++) {
                    if (enumIds.indexOf(cacheObjectEnums[idObj].enumIds[j]) === -1) enumIds.push(cacheObjectEnums[idObj].enumIds[j]);
                }
                for (j = 0; j < cacheObjectEnums[idObj].enumNames.length; j++) {
                    if (enumNames.indexOf(cacheObjectEnums[idObj].enumNames[j]) === -1) enumNames.push(cacheObjectEnums[idObj].enumNames[j]);
                }

                callback(cacheObjectEnums[idObj].enumIds, cacheObjectEnums[idObj].enumNames);
            }
            return;
        }

        for (var i = 0, l = enums.length; i < l; i++) {
            if (objects[enums[i]] &&
                objects[enums[i]].common &&
                objects[enums[i]].common.members &&
                objects[enums[i]].common.members.indexOf(idObj) !== -1) {
                if (enumIds.indexOf(enums[i]) === -1) enumIds.push(enums[i]);
                if (enumNames.indexOf(objects[enums[i]].common.name) === -1) enumNames.push(objects[enums[i]].common.name);
            }
        }
        if (objects[idObj]) {
            var pos = idObj.lastIndexOf('.');
            if (pos !== -1) {
                var parent = idObj.substring(0, pos);
                if (parent && objects[parent]) {
                    return getObjectEnums(parent, callback, enumIds, enumNames);
                }
            }
        }

        cacheObjectEnums[idObj] = {enumIds: enumIds, enumNames: enumNames};
        if (typeof callback === 'function') callback(enumIds, enumNames);
    }

    function getObjectEnumsSync(idObj, enumIds, enumNames) {
        if (!enumIds)   enumIds   = [];
        if (!enumNames) enumNames = [];

        if (cacheObjectEnums[idObj]) {
            for (var j = 0; j < cacheObjectEnums[idObj].enumIds.length; j++) {
                if (enumIds.indexOf(cacheObjectEnums[idObj].enumIds[j]) === -1) enumIds.push(cacheObjectEnums[idObj].enumIds[j]);
            }
            for (j = 0; j < cacheObjectEnums[idObj].enumNames.length; j++) {
                if (enumNames.indexOf(cacheObjectEnums[idObj].enumNames[j]) === -1) enumNames.push(cacheObjectEnums[idObj].enumNames[j]);
            }
            return {enumIds: enumIds, enumNames: enumNames};
        }


        for (var i = 0, l = enums.length; i < l; i++) {
            if (objects[enums[i]] &&
                objects[enums[i]].common &&
                objects[enums[i]].common.members &&
                objects[enums[i]].common.members.indexOf(idObj) !== -1) {
                if (enumIds.indexOf(enums[i]) === -1) enumIds.push(enums[i]);
                if (enumNames.indexOf(objects[enums[i]].common.name) === -1) enumNames.push(objects[enums[i]].common.name);
            }
        }

        if (objects[idObj]) {
            var pos = idObj.lastIndexOf('.');
            if (pos !== -1) {
                var parent = idObj.substring(0, pos);
                if (parent && objects[parent]) {
                    return getObjectEnumsSync(parent, enumIds, enumNames);
                }
            }
        }

        cacheObjectEnums[idObj] = {enumIds: enumIds, enumNames: enumNames};
        return cacheObjectEnums[idObj];
    }
})();