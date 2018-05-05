/* jshint -W097 */
/* jshint -W083 */
/* jshint strict:false */
/* jslint node: true */
/* jshint shadow:true */
'use strict';

const VM2            = require('vm2');
const fs             = require('fs');
const NodeVM         = VM2.NodeVM;
const VMScript       = VM2.VMScript;
const coffeeCompiler = require('coffee-compiler');
const tsc            = require('virtual-tsc');
const typescript     = require('typescript');
const nodeSchedule   = require('node-schedule');

let mods = {
    fs:               {},
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
    suncalc:          require('suncalc'),
    request:          require('request'),
    wake_on_lan:      require('wake_on_lan')
};

const utils    = require(__dirname + '/lib/utils'); // Get common adapter utils
const words    = require(__dirname + '/lib/words');
const sandBox  = require(__dirname + '/lib/sandbox');
const eventObj = require(__dirname + '/lib/eventObj');

// for node version <= 0.12
if (''.startsWith === undefined) {
    String.prototype.startsWith = function (s) {
        return this.indexOf(s) === 0;
    };
}
if (''.endsWith === undefined) {
    String.prototype.endsWith = function (s) {
        return this.slice(0 - s.length) === s;
    };
}
///

let webstormDebug;
if (process.argv) {
    for (let a = 1; a < process.argv.length; a++) {
        if (process.argv[a].startsWith('--webstorm')) {
            webstormDebug = process.argv[a].replace(/^(.*?=\s*)/, '');
            break;
        }
    }
}

const tsCompilerOptions = {
    // don't compile faulty scripts
    noEmitOnError: true,
    // change this to "es6" if we're dropping support for NodeJS 4.x
    target: typescript.ScriptTarget.ES5,
    // we need this for the native promise support in NodeJS 4.x.
    // can be dropped if we're targeting ES6 anyways
    lib: ['lib.es6.d.ts']
};
// ambient declarations for typescript
let tsAmbient;
let tsServer;

let context = {
    mods,
    objects:          {},
    states:           {},
    stateIds:         [],
    errorLogFunction: null,
    subscriptions:    [],
    adapterSubs:      {},
    subscribedPatterns: {},
    cacheObjectEnums: {},
    isEnums:          false, // If some subscription wants enum
    channels:         null,
    devices:          null,
    logWithLineInfo:  null,
    timers:           {},
    enums:            [],
    timerId:          0
};

const regExEnum = /^enum\./;
const regExGlobalOld = /_global$/;
const regExGlobalNew = /script\.js\.global\./;

function checkIsGlobal(obj) {
    return regExGlobalOld.test(obj.common.name) || regExGlobalNew.test(obj._id);
}

let adapter = new utils.Adapter({

    name: 'javascript',

    useFormatDate: true, // load float formatting

    objectChange: (id, obj) => {
        if (regExEnum.test(id)) {
            // clear cache
            context.cacheObjectEnums = {};
        }

        if (!obj) {
            // object deleted
            if (!context.objects[id]) return;

            // Script deleted => remove it
            if (context.objects[id].type === 'script' && context.objects[id].common.engine === 'system.adapter.' + adapter.namespace) {
                stop(id);

                const idActive = 'scriptEnabled.' + id.substring('script.js.'.length);
                adapter.delObject(idActive);
                adapter.delState(idActive);
            }

            removeFromNames(id);
            delete context.objects[id];
        } else if (!context.objects[id]) {
            // New object
            context.objects[id] = obj;

            addToNames(obj);

            if (obj.type === 'script' && obj.common.engine === 'system.adapter.' + adapter.namespace) {
                // create states for scripts
                createActiveObject(id, obj.common.enabled);

                if (obj.common.enabled) {
                    if (checkIsGlobal(obj)) {
                        // restart adapter
                        adapter.getForeignObject('system.adapter.' + adapter.namespace, (err, _obj) => {
                            if (_obj) adapter.setForeignObject('system.adapter.' + adapter.namespace, _obj);
                        });
                        return;
                    }

                    // Start script
                    load(id);
                }
            }
            // added new script to this engine
        } else if (context.objects[id].common) {
            const n = getName(id);

            if (n !== context.objects[id].common.name) {
                if (n) removeFromNames(id);
                if (context.objects[id].common.name) addToNames(obj);
            }

            // Object just changed
            if (obj.type !== 'script') {
                context.objects[id] = obj;

                if (id === 'system.config') {
                    // set langugae for debug messages
                    if (context.objects['system.config'].common.language) words.setLanguage(context.objects['system.config'].common.language);
                }

                return;
            }

            if (checkIsGlobal(context.objects[id])) {
                // restart adapter
                adapter.getForeignObject('system.adapter.' + adapter.namespace, function (err, obj) {
                    if (obj) {
                        adapter.setForeignObject('system.adapter.' + adapter.namespace, obj);
                    }
                });
                return;
            }

            if ((context.objects[id].common.enabled && !obj.common.enabled) ||
                (context.objects[id].common.engine === 'system.adapter.' + adapter.namespace && obj.common.engine !== 'system.adapter.' + adapter.namespace)) {

                // Script disabled
                if (context.objects[id].common.enabled && context.objects[id].common.engine === 'system.adapter.' + adapter.namespace) {
                    // Remove it from executing
                    context.objects[id] = obj;
                    stop(id);
                } else {
                    context.objects[id] = obj;
                }
            } else
            if ((!context.objects[id].common.enabled && obj.common.enabled) ||
                (context.objects[id].common.engine !== 'system.adapter.' + adapter.namespace && obj.common.engine === 'system.adapter.' + adapter.namespace)) {
                // Script enabled
                context.objects[id] = obj;

                if (context.objects[id].common.enabled && context.objects[id].common.engine === 'system.adapter.' + adapter.namespace) {
                    // Start script
                    load(id);
                }
            } else { //if (obj.common.source !== context.objects[id].common.source) {
                context.objects[id] = obj;

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

    stateChange: (id, state) => {
        if (!id || id.startsWith('messagebox.') || id.startsWith('log.')) return;

        let oldState = context.states[id];
        if (state) {
            if (oldState) {
                // enable or disable script
                if (!state.ack && id.startsWith(activeStr) && context.objects[id] && context.objects[id].native && context.objects[id].native.script) {
                    adapter.extendForeignObject(context.objects[id].native.script, {common: {enabled: state.val}});
                }

                // monitor if adapter is alive and send all subscriptions once more, after adapter goes online
                if (/*oldState && */oldState.val === false && state.val && id.endsWith('.alive')) {
                    if (context.adapterSubs[id]) {
                        const parts = id.split('.');
                        const a = parts[2] + '.' + parts[3];
                        for (let t = 0; t < context.adapterSubs[id].length; t++) {
                            adapter.log.info('Detected coming adapter "' + a + '". Send subscribe: ' + context.adapterSubs[id][t]);
                            adapter.sendTo(a, 'subscribe', context.adapterSubs[id][t]);
                        }
                    }
                }
            } else {
                if (/*!oldState && */context.stateIds.indexOf(id) === -1) {
                    context.stateIds.push(id);
                    context.stateIds.sort();
                }
            }
            context.states[id] = state;
        } else {
            if (oldState) delete context.states[id];
            state = {};
            const pos = context.stateIds.indexOf(id);
            if (pos !== -1) {
                context.stateIds.splice(pos, 1);
            }
        }
        let _eventObj = eventObj.createEventObject(context, id, state, oldState);

        // if this state matches any subscriptions
        for (let i = 0, l = context.subscriptions.length; i < l; i++) {
            let sub = context.subscriptions[i];
            if (sub && patternMatching(_eventObj, sub.patternCompareFunctions)) {
                sub.callback(_eventObj);
            }
        }
    },

    unload: callback => callback(),

    ready: function () {
         // todo
        context.errorLogFunction = webstormDebug ? console : adapter.log;
        activeStr = adapter.namespace + '.scriptEnabled.';
        activeRegEx = new RegExp('^' + adapter.namespace.replace('.', '\\.') + '\\.scriptEnabled\\.');

        // try to read TS declarations
        try {
            tsAmbient = {
                'javascript.d.ts': fs.readFileSync(mods.path.join(__dirname, 'lib/javascript.d.ts'), 'utf8')
            };
            tsServer.provideAmbientDeclarations(tsAmbient);
        } catch (e) {
            adapter.log.warn('Could not read TypeScript ambient declarations: ' + e);
        }

        installLibraries(() => {
            getData(() => {
                adapter.subscribeForeignObjects('*');

                if (!adapter.config.subscribe) {
                    adapter.subscribeForeignStates('*');
                }

                adapter.objects.getObjectView('script', 'javascript', {}, (err, doc) => {
                    // we have to make sure the VM doesn't choke on `exports` when using TypeScript
                    // even when there's no global script, this line has to exist:
                    globalScript = '';//'const exports = {};\n';
                    let count = 0;
                    if (doc && doc.rows && doc.rows.length) {
                        // assemble global script
                        for (let g = 0; g < doc.rows.length; g++) {
                            if (checkIsGlobal(doc.rows[g].value)) {
                                let obj = doc.rows[g].value;

                                if (obj && obj.common.enabled) {
                                    if (obj.common.engineType.match(/^[cC]offee/)) {
                                        count++;
                                        coffeeCompiler.fromSource(obj.common.source, {
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
                                                for (let i = 0; i < doc.rows.length; i++) {
                                                    if (!checkIsGlobal(doc.rows[i].value)) {
                                                        load(doc.rows[i].value._id);
                                                    }
                                                }
                                            }
                                        });
                                    } else if (obj.common.engineType.match(/^[tT]ype[sS]cript/)) {
                                        let tsCompiled = tsServer.compile(
                                            mods.path.join(__dirname, 'global_' + g + '.ts'),
                                            obj.common.source
                                        );

                                        let errors = tsCompiled.diagnostics.map(function (diag) {
                                            return diag.annotatedSource + '\n';
                                        }).join('\n');

                                        if (tsCompiled.success) {
                                            if (errors.length > 0) {
                                                adapter.log.warn('TypeScript compilation had errors: \n' + errors);
                                            } else {
                                                adapter.log.info('TypeScript compilation successful');
                                            }
                                            globalScript += tsCompiled.result + '\n';
                                        } else {
                                            adapter.log.error('TypeScript compilation failed: \n' + errors);
                                        }
                                    } else { // javascript
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
                            for (let i = 0; i < doc.rows.length; i++) {
                                if (!checkIsGlobal(doc.rows[i].value)) {
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

function checkObjectsJson(file) {
    if (mods.path.normalize(file).replace(/\\/g, '/').indexOf('-data/objects.json') !== -1) {
        if (adapter) {
            adapter.log.error('May not read ' + file);
        } else {
            console.error('May not read ' + file);
        }
        throw new Error('Permission denied');
    }
}

mods.fs.readFile = function () {
    checkObjectsJson(arguments[0]);
    return fs.readFile.apply(this, arguments);
};
mods.fs.readFileSync = function () {
    checkObjectsJson(arguments[0]);
    return fs.readFileSync.apply(this, arguments);
};
mods.fs.writeFile = function () {
    checkObjectsJson(arguments[0]);
    return fs.writeFile.apply(this, arguments);
};
mods.fs.writeFileSync = function () {
    checkObjectsJson(arguments[0]);
    return fs.writeFileSync.apply(this, arguments);
};
mods.fs.unlink = function () {
    checkObjectsJson(arguments[0]);
    return fs.unlink.apply(this, arguments);
};
mods.fs.unlinkSync = function () {
    checkObjectsJson(arguments[0]);
    return fs.unlinkSync.apply(this, arguments);
};
mods.fs.appendFile = function () {
    checkObjectsJson(arguments[0]);
    return fs.appendFile.apply(this, arguments);
};
mods.fs.appendFileSync = function () {
    checkObjectsJson(arguments[0]);
    return fs.appendFileSync.apply(this, arguments);
};
mods.fs.chmod = function () {
    checkObjectsJson(arguments[0]);
    return fs.chmod.apply(this, arguments);
};
mods.fs.chmodSync = function () {
    checkObjectsJson(arguments[0]);
    return fs.chmodSync.apply(this, arguments);
};
mods.fs.chown = function () {
    checkObjectsJson(arguments[0]);
    return fs.chmodSync.apply(this, arguments);
};
mods.fs.chownSync = function () {
    checkObjectsJson(arguments[0]);
    return fs.chownSync.apply(this, arguments);
};
mods.fs.copyFile = function () {
    checkObjectsJson(arguments[0]);
    checkObjectsJson(arguments[1]);
    return fs.copyFile.apply(this, arguments);
};
mods.fs.copyFileSync = function () {
    checkObjectsJson(arguments[0]);
    checkObjectsJson(arguments[1]);
    return fs.copyFileSync.apply(this, arguments);
};
mods.fs.open = function () {
    checkObjectsJson(arguments[0]);
    return fs.open.apply(this, arguments);
};
mods.fs.openSync = function () {
    checkObjectsJson(arguments[0]);
    return fs.openSync.apply(this, arguments);
};
mods.fs.rename = function () {
    checkObjectsJson(arguments[0]);
    checkObjectsJson(arguments[1]);
    return fs.rename.apply(this, arguments);
};
mods.fs.renameSync = function () {
    checkObjectsJson(arguments[0]);
    checkObjectsJson(arguments[1]);
    return fs.renameSync.apply(this, arguments);
};
mods.fs.truncate = function () {
    checkObjectsJson(arguments[0]);
    return fs.truncate.apply(this, arguments);
};
mods.fs.truncateSync = function () {
    checkObjectsJson(arguments[0]);
    return fs.truncateSync.apply(this, arguments);
};

context.adapter = adapter;

let scripts =          {};
let attempts =         {};
let globalScript =     '';
let globalScriptLines = 0;
let names =            {};
let activeRegEx =      null;
let activeStr =        '';


// compiler instance for typescript
function tsLog(msg, sev) {
    if (adapter && adapter.log) adapter.log[sev || 'info'](msg);
}
tsServer = new tsc.Server(tsCompilerOptions, tsLog);


function addGetProperty(object) {
    Object.defineProperty (object, 'get', {
        value: function (id) {
            return this[id] || this[adapter.namespace + '.' + id];
        },
        enumerable: false
    });
}

function fixLineNo(line) {
    if (line.indexOf('javascript.js:') >= 0) return line;
    if (!/script[s]?\.js[.\\\/]/.test(line)) return line;
    if (/:([\d]+):/.test(line)) {
    line = line.replace(/:([\d]+):/, function ($0, $1) {
            return ':' + ($1 > globalScriptLines ? $1 - globalScriptLines : $1) + ':';
        });
    } else {
        line = line.replace(/:([\d]+)$/, function ($0, $1) {
            return ':' + ($1 > globalScriptLines ? $1 - globalScriptLines : $1);
        });
    }
    return line;
}

context.logError = function (msg, e, offs) {
    const stack = e.stack.split('\n');
    if (msg.indexOf('\n') < 0) {
        msg = msg.replace(/[: ]*$/, ': ');
    }

    //errorLogFunction.error(msg + stack[0]);
    context.errorLogFunction.error(msg + fixLineNo(stack[0]));
    for (let i = offs || 1; i < stack.length; i++) {
        if (!stack[i]) continue;
        if (stack[i].match(/runInNewContext|javascript\.js:/)) break;
        //adapter.log.error(fixLineNo(stack[i]));
        context.errorLogFunction.error (fixLineNo(stack[i]));
    }
}

function createActiveObject(id, enabled) {
    const idActive = adapter.namespace + '.scriptEnabled.' + id.substring('script.js.'.length);

    if (!context.objects[idActive]) {
        context.objects[idActive] = {
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
        adapter.setForeignObject(idActive, context.objects[idActive], function (err) {
            if (!err) {
                adapter.setForeignState(idActive, enabled, true);
            }
        });
    } else {
        adapter.setForeignState(idActive, enabled, true);
    }
}

function addToNames(obj) {
    const id = obj._id;
    if (obj.common && obj.common.name) {
        const name = obj.common.name;
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
    const n = getName(id);

    if (n) {
        let pos;
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
    let pos;
    for (let n in names) {
        if (names[n] && typeof names[n] === 'object') {
            pos = names[n].indexOf(id);
            if (pos !== -1) return n;
        } else if (names[n] === id) {
            return n;
        }
    }
    return null;
}

function installNpm(npmLib, callback) {
    const path = __dirname;
    if (typeof npmLib === 'function') {
        callback = npmLib;
        npmLib = undefined;
    }

    const cmd = 'npm install ' + npmLib + ' --production --prefix "' + path + '"';
    adapter.log.info(cmd + ' (System call)');
    // Install node modules as system call

    // System call used for update of js-controller itself,
    // because during installation npm packet will be deleted too, but some files must be loaded even during the install process.
    let child = mods['child_process'].exec(cmd);

    child.stdout.on('data', function (buf) {
        adapter.log.info(buf.toString('utf8'));
    });
    child.stderr.on('data', function (buf) {
        adapter.log.error(buf.toString('utf8'));
    });

    child.on('exit', function (code /* , signal */) {
        if (code) {
            adapter.log.error('Cannot install ' + npmLib + ': ' + code);
        }
        // command succeeded
        if (typeof callback === 'function') callback(npmLib);
    });
}

function installLibraries(callback) {
    let allInstalled = true;
    if (adapter.config && adapter.config.libraries) {
        let libraries = adapter.config.libraries.split(/[,;\s]+/);

        for (let lib = 0; lib < libraries.length; lib++) {
            if (libraries[lib] && libraries[lib].trim()) {
                libraries[lib] = libraries[lib].trim();
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
        /*let options = {
            filename: name,
            displayErrors: true
            //lineOffset: globalScriptLines
        };*/
        return {
            script: new VMScript(source, name)
        };
    } catch (e) {
        context.logError(name + ' compile failed:\r\nat ', e);
        return false;
    }
}

function execute(script, name, verbose, debug) {
    script.intervals  = [];
    script.timeouts   = [];
    script.schedules  = [];
    script.name       = name;
    script._id        = Math.floor(Math.random() * 0xFFFFFFFF);
    script.subscribes = {};

    let sandbox = sandBox(script, name, verbose, debug, context);
    const vm = new NodeVM({
        sandbox,
        require: {
            external: true,
            builtin: ['*'],
            root: '',
            mock: mods
        }
    });

    try {
        vm.run(script.script, name);
    } catch (e) {
        context.logError(name, e);
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
    const parts = id.split('.');
    const _adapter = 'system.adapter.' + parts[0] + '.' + parts[1];
    if (context.objects[_adapter] && context.objects[_adapter].common && context.objects[_adapter].common.subscribable) {
        const a     = parts[0] + '.' + parts[1];
        const alive = 'system.adapter.' + a + '.alive';
        if (context.adapterSubs[alive]) {
            const pos = context.adapterSubs[alive].indexOf(id);
            if (pos !== -1) context.adapterSubs[alive].splice(pos, 1);
            if (!context.adapterSubs[alive].length) delete context.adapterSubs[alive];
        }
        adapter.sendTo(a, 'unsubscribe', id);
    }
}

function stop(name, callback) {
    adapter.log.info('Stop script ' + name);

    adapter.setState('scriptEnabled.' + name.substring('script.js.'.length), false, true);

    if (scripts[name]) {
        // Remove from subscriptions
        context.isEnums = false;
        if (adapter.config.subscribe) {
            // check all subscribed IDs
            for (let id in scripts[name].subscribes) {
                if (!scripts[name].subscribes.hasOwnProperty(id)) continue;
                if (context.subscribedPatterns[id]) {
                    context.subscribedPatterns[id] -= scripts[name].subscribes[id];
                    if (context.subscribedPatterns[id] <= 0) {
                        adapter.unsubscribeForeignStates(id);
                        delete context.subscribedPatterns[id];
                        if (context.states[id]) delete context.states[id];
                    }
                }
            }
        }

        for (let i = context.subscriptions.length - 1; i >= 0 ; i--) {
            if (context.subscriptions[i].name === name) {
                const sub = context.subscriptions.splice(i, 1)[0];
                if (sub) {
                    unsubscribe(sub.pattern.id);
                }
            } else {
                if (!context.isEnums && context.subscriptions[i].pattern.enumName || context.subscriptions[i].pattern.enumId) context.isEnums = true;
            }
        }

        // Stop all timeouts
        for (let i = 0; i < scripts[name].timeouts.length; i++) {
            clearTimeout(scripts[name].timeouts[i]);
        }
        // Stop all intervals
        for (let i = 0; i < scripts[name].intervals.length; i++) {
            clearInterval(scripts[name].intervals[i]);
        }
        // Stop all scheduled jobs
        for (let i = 0; i < scripts[name].schedules.length; i++) {
            if (scripts[name].schedules[i]) {
                const _name = scripts[name].schedules[i].name;
                if (!nodeSchedule.cancelJob(scripts[name].schedules[i])) {
                    adapter.log.error('Error by canceling scheduled job "' + _name + '"');
                }
            }
        }

        // if callback for on stop
        if (typeof scripts[name].onStopCb === 'function') {
            scripts[name].onStopTimeout = parseInt(scripts[name].onStopTimeout, 10) || 1000;

            let timeout = setTimeout(function () {
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
        const name = obj._id;

        adapter.setState('scriptEnabled.' + name.substring('script.js.'.length), true, true);

        if ((obj.common.engineType.match(/^[jJ]ava[sS]cript/) || obj.common.engineType === 'Blockly')) {
            // Javascript
            adapter.log.info('Start javascript ' + name);

            let sourceFn = name;
            if (webstormDebug) {
                const fn = name.replace(/^script.js./, '').replace(/\./g, '/');
                sourceFn = mods.path.join(webstormDebug, fn + '.js');
            }
            scripts[name] = compile(globalScript + obj.common.source, sourceFn);
            if (scripts[name]) execute(scripts[name], sourceFn, obj.common.verbose, obj.common.debug);
            if (typeof callback === 'function') callback(true, name);
        } else if (obj.common.engineType.match(/^[cC]offee/)) {
            // CoffeeScript
            coffeeCompiler.fromSource(obj.common.source, {sourceMap: false, bare: true}, function (err, js) {
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
        } else if (obj.common.engineType.match(/^[tT]ype[sS]cript/)) {
            // TypeScript
            adapter.log.info(name + ': compiling TypeScript source...');
            const filename = name.replace(/^script.js./, '').replace(/\./g, '/') + '.ts';
            const tsCompiled = tsServer.compile(
                mods.path.join(__dirname, filename),
                obj.common.source
            );

            const errors = tsCompiled.diagnostics.map(function (diag) {
                return diag.annotatedSource + '\n';
            }).join('\n');

            if (tsCompiled.success) {
                if (errors.length > 0) {
                    adapter.log.warn(name + ': TypeScript compilation had errors: \n' + errors);
                } else {
                    adapter.log.info(name + ': TypeScript compilation successful');
                }
                scripts[name] = compile(globalScript + '\n' + tsCompiled.result, name);
                if (scripts[name]) execute(scripts[name], name, obj.common.verbose, obj.common.debug);
                if (typeof callback === 'function') callback(true, name);
            } else {
                adapter.log.error(name + ': TypeScript compilation failed: \n' + errors);
            }
        }
    } else {
        let _name;
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

function patternMatching(event, patternFunctions) {
    let matched = false;
    for (let i = 0, len = patternFunctions.length; i < len; i++) {
        if (patternFunctions[i](event)) {
            if (patternFunctions.logic === 'or') return true;

            matched = true;
        } else {
            if (patternFunctions.logic === 'and') return false;
        }
    }
    return matched;
}

function getData(callback) {
    let statesReady;
    let objectsReady;
    adapter.log.info('requesting all states');
    adapter.getForeignStates('*', function (err, res) {
        if (!adapter.config.subscribe) {
            context.states = res;
        }

        addGetProperty(context.states);

        // remember all IDs
        for (let id in res) {
            if (res.hasOwnProperty(id)) {
                context.stateIds.push(id);
            }
        }
        statesReady = true;
        adapter.log.info('received all states');
        if (objectsReady && typeof callback === 'function') callback();
    });

    adapter.log.info('requesting all objects');

    adapter.objects.getObjectList({include_docs: true}, function (err, res) {
        res = res.rows;
        context.objects = {};
        for (let i = 0; i < res.length; i++) {
            context.objects[res[i].doc._id] = res[i].doc;
            if (res[i].doc.type === 'enum') context.enums.push(res[i].doc._id);

            // Collect all names
            addToNames(context.objects[res[i].doc._id]);
        }
        addGetProperty(context.objects);

        // set language for debug messages
        if (context.objects['system.config'] && context.objects['system.config'].common.language) words.setLanguage(context.objects['system.config'].common.language);

        // try to use system coordinates
        if (adapter.config.useSystemGPS && context.objects['system.config'] &&
            context.objects['system.config'].common.latitude) {
            adapter.config.latitude  = context.objects['system.config'].common.latitude;
            adapter.config.longitude = context.objects['system.config'].common.longitude;
        }
        adapter.config.latitude  = parseFloat(adapter.config.latitude);
        adapter.config.longitude = parseFloat(adapter.config.longitude);

        objectsReady = true;
        adapter.log.info('received all objects');
        if (statesReady && typeof callback === 'function') callback();
    });
}

