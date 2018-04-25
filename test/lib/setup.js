/* jshint -W097 */// jshint strict:false
/*jslint node: true */
// check if tmp directory exists
var fs            = require('fs');
var path          = require('path');
var child_process = require('child_process');
var rootDir       = path.normalize(__dirname + '/../../');
var pkg           = require(rootDir + 'package.json');
var debug         = typeof v8debug === 'object';
pkg.main = pkg.main || 'main.js';

var adapterName = path.normalize(rootDir).replace(/\\/g, '/').split('/');
adapterName = adapterName[adapterName.length - 2];
var adapterStarted = false;

function getAppName() {
    var parts = __dirname.replace(/\\/g, '/').split('/');
    return parts[parts.length - 3].split('.')[0];
}

var appName = getAppName().toLowerCase();

var objects;
var states;

var pid = null;

function copyFileSync(source, target) {

    var targetFile = target;

    //if target is a directory a new file with the same name will be created
    if (fs.existsSync(target)) {
        if ( fs.lstatSync( target ).isDirectory() ) {
            targetFile = path.join(target, path.basename(source));
        }
    }

    try {
        fs.writeFileSync(targetFile, fs.readFileSync(source));
    }
    catch (err) {
        console.log("file copy error: " +source +" -> " + targetFile + " (error ignored)");
    }
}

function copyFolderRecursiveSync(source, target, ignore) {
    var files = [];

    var base = path.basename(source);
    if (base === adapterName) {
        base = pkg.name;
    }
    //check if folder needs to be created or integrated
    var targetFolder = path.join(target, base);
    if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder);
    }

    //copy
    if (fs.lstatSync(source).isDirectory()) {
        files = fs.readdirSync(source);
        files.forEach(function (file) {
            if (ignore && ignore.indexOf(file) !== -1) {
                return;
            }

            var curSource = path.join(source, file);
            var curTarget = path.join(targetFolder, file);
            if (fs.lstatSync(curSource).isDirectory()) {
                // ignore grunt files
                if (file.indexOf('grunt') !== -1) return;
                if (file === 'chai') return;
                if (file === 'mocha') return;
                copyFolderRecursiveSync(curSource, targetFolder, ignore);
            } else {
                copyFileSync(curSource, curTarget);
            }
        });
    }
}

if (!fs.existsSync(rootDir + 'tmp')) {
    fs.mkdirSync(rootDir + 'tmp');
}

function storeOriginalFiles() {
    console.log('Store original files...');
    var dataDir = rootDir + 'tmp/' + appName + '-data/';

    var f = fs.readFileSync(dataDir + 'objects.json');
    var objects = JSON.parse(f.toString());
    if (objects['system.adapter.admin.0'] && objects['system.adapter.admin.0'].common) {
        objects['system.adapter.admin.0'].common.enabled = false;
    }
    if (objects['system.adapter.admin.1'] && objects['system.adapter.admin.1'].common) {
        objects['system.adapter.admin.1'].common.enabled = false;
    }

    fs.writeFileSync(dataDir + 'objects.json.original', JSON.stringify(objects));
    try {
        f = fs.readFileSync(dataDir + 'states.json');
        fs.writeFileSync(dataDir + 'states.json.original', f);
    }
    catch (err) {
        console.log('no states.json found - ignore');
    }
}

function restoreOriginalFiles() {
    console.log('restoreOriginalFiles...');
    var dataDir = rootDir + 'tmp/' + appName + '-data/';

    var f = fs.readFileSync(dataDir + 'objects.json.original');
    fs.writeFileSync(dataDir + 'objects.json', f);
    try {
        f = fs.readFileSync(dataDir + 'states.json.original');
        fs.writeFileSync(dataDir + 'states.json', f);
    }
    catch (err) {
        console.log('no states.json.original found - ignore');
    }

}

function checkIsAdapterInstalled(cb, counter, customName) {
    customName = customName || pkg.name.split('.').pop();
    counter = counter || 0;
    var dataDir = rootDir + 'tmp/' + appName + '-data/';
    console.log('checkIsAdapterInstalled...');

    try {
        var f = fs.readFileSync(dataDir + 'objects.json');
        var objects = JSON.parse(f.toString());
        if (objects['system.adapter.' + customName + '.0']) {
            console.log('checkIsAdapterInstalled: ready!');
            setTimeout(function () {
                if (cb) cb();
            }, 100);
            return;
        } else {
            console.warn('checkIsAdapterInstalled: still not ready');
        }
    } catch (err) {

    }

    if (counter > 20) {
        console.error('checkIsAdapterInstalled: Cannot install!');
        if (cb) cb('Cannot install');
    } else {
        console.log('checkIsAdapterInstalled: wait...');
        setTimeout(function() {
            checkIsAdapterInstalled(cb, counter + 1);
        }, 1000);
    }
}

function checkIsControllerInstalled(cb, counter) {
    counter = counter || 0;
    var dataDir = rootDir + 'tmp/' + appName + '-data/';

    console.log('checkIsControllerInstalled...');
    try {
        var f = fs.readFileSync(dataDir + 'objects.json');
        var objects = JSON.parse(f.toString());
        if (objects['system.adapter.admin.0']) {
            console.log('checkIsControllerInstalled: installed!');
            setTimeout(function () {
                if (cb) cb();
            }, 100);
            return;
        }
    } catch (err) {

    }

    if (counter > 20) {
        console.log('checkIsControllerInstalled: Cannot install!');
        if (cb) cb('Cannot install');
    } else {
        console.log('checkIsControllerInstalled: wait...');
        setTimeout(function() {
            checkIsControllerInstalled(cb, counter + 1);
        }, 1000);
    }
}

function installAdapter(customName, cb) {
    if (typeof customName === 'function') {
        cb = customName;
        customName = null;
    }
    customName = customName || pkg.name.split('.').pop();
    console.log('Install adapter...');
    var startFile = 'node_modules/' + appName + '.js-controller/' + appName + '.js';
    // make first install
    if (debug) {
        child_process.execSync('node ' + startFile + ' add ' + customName + ' --enabled false', {
            cwd:   rootDir + 'tmp',
            stdio: [0, 1, 2]
        });
        checkIsAdapterInstalled(function (error) {
            if (error) console.error(error);
            console.log('Adapter installed.');
            if (cb) cb();
        });
    } else {
        // add controller
        var _pid = child_process.fork(startFile, ['add', customName, '--enabled', 'false'], {
            cwd:   rootDir + 'tmp',
            stdio: [0, 1, 2, 'ipc']
        });

        waitForEnd(_pid, function () {
            checkIsAdapterInstalled(function (error) {
                if (error) console.error(error);
                console.log('Adapter installed.');
                if (cb) cb();
            });
        });
    }
}

function waitForEnd(_pid, cb) {
    if (!_pid) {
        cb(-1, -1);
        return;
    }
    _pid.on('exit', function (code, signal) {
        if (_pid) {
            _pid = null;
            cb(code, signal);
        }
    });
    _pid.on('close', function (code, signal) {
        if (_pid) {
            _pid = null;
            cb(code, signal);
        }
    });
}

function installJsController(cb) {
    console.log('installJsController...');
    if (!fs.existsSync(rootDir + 'tmp/node_modules/' + appName + '.js-controller') ||
        !fs.existsSync(rootDir + 'tmp/' + appName + '-data')) {
        // try to detect appName.js-controller in node_modules/appName.js-controller
        // travis CI installs js-controller into node_modules
        if (fs.existsSync(rootDir + 'node_modules/' + appName + '.js-controller')) {
            console.log('installJsController: no js-controller => copy it from "' + rootDir + 'node_modules/' + appName + '.js-controller"');
            // copy all
            // stop controller
            console.log('Stop controller if running...');
            var _pid;
            if (debug) {
                // start controller
                _pid = child_process.exec('node ' + appName + '.js stop', {
                    cwd: rootDir + 'node_modules/' + appName + '.js-controller',
                    stdio: [0, 1, 2]
                });
            } else {
                _pid = child_process.fork(appName + '.js', ['stop'], {
                    cwd:   rootDir + 'node_modules/' + appName + '.js-controller',
                    stdio: [0, 1, 2, 'ipc']
                });
            }

            waitForEnd(_pid, function () {
                // copy all files into
                if (!fs.existsSync(rootDir + 'tmp')) fs.mkdirSync(rootDir + 'tmp');
                if (!fs.existsSync(rootDir + 'tmp/node_modules')) fs.mkdirSync(rootDir + 'tmp/node_modules');

                if (!fs.existsSync(rootDir + 'tmp/node_modules/' + appName + '.js-controller')){
                    console.log('Copy js-controller...');
                    copyFolderRecursiveSync(rootDir + 'node_modules/' + appName + '.js-controller', rootDir + 'tmp/node_modules/');
                }

                console.log('Setup js-controller...');
                var __pid;
                if (debug) {
                    // start controller
                    _pid = child_process.exec('node ' + appName + '.js setup first --console', {
                        cwd: rootDir + 'tmp/node_modules/' + appName + '.js-controller',
                        stdio: [0, 1, 2]
                    });
                } else {
                    __pid = child_process.fork(appName + '.js', ['setup', 'first', '--console'], {
                        cwd:   rootDir + 'tmp/node_modules/' + appName + '.js-controller',
                        stdio: [0, 1, 2, 'ipc']
                    });
                }
                waitForEnd(__pid, function () {
                    checkIsControllerInstalled(function () {
                        // change ports for object and state DBs
                        var config = require(rootDir + 'tmp/' + appName + '-data/' + appName + '.json');
                        config.objects.port = 19001;
                        config.states.port  = 19000;
                        fs.writeFileSync(rootDir + 'tmp/' + appName + '-data/' + appName + '.json', JSON.stringify(config, null, 2));
                        console.log('Setup finished.');

                        copyAdapterToController();

                        installAdapter(function () {
                            storeOriginalFiles();
                            if (cb) cb(true);
                        });
                    });
                });
            });
        } else {
            // check if port 9000 is free, else admin adapter will be added to running instance
            var client = new require('net').Socket();
            client.connect(9000, '127.0.0.1', function() {
                console.error('Cannot initiate fisrt run of test, because one instance of application is running on this PC. Stop it and repeat.');
                process.exit(0);
            });

            setTimeout(function () {
                client.destroy();
                if (!fs.existsSync(rootDir + 'tmp/node_modules/' + appName + '.js-controller')) {
                    console.log('installJsController: no js-controller => install from git');

                    child_process.execSync('npm install https://github.com/' + appName + '/' + appName + '.js-controller/tarball/master --prefix ./  --production', {
                        cwd:   rootDir + 'tmp/',
                        stdio: [0, 1, 2]
                    });
                } else {
                    console.log('Setup js-controller...');
                    var __pid;
                    if (debug) {
                        // start controller
                        child_process.exec('node ' + appName + '.js setup first', {
                            cwd: rootDir + 'tmp/node_modules/' + appName + '.js-controller',
                            stdio: [0, 1, 2]
                        });
                    } else {
                        child_process.fork(appName + '.js', ['setup', 'first'], {
                            cwd:   rootDir + 'tmp/node_modules/' + appName + '.js-controller',
                            stdio: [0, 1, 2, 'ipc']
                        });
                    }
                }

                // let npm install admin and run setup
                checkIsControllerInstalled(function () {
                    var _pid;

                    if (fs.existsSync(rootDir + 'node_modules/' + appName + '.js-controller/' + appName + '.js')) {
                        _pid = child_process.fork(appName + '.js', ['stop'], {
                            cwd:   rootDir + 'node_modules/' + appName + '.js-controller',
                            stdio: [0, 1, 2, 'ipc']
                        });
                    }

                    waitForEnd(_pid, function () {
                        // change ports for object and state DBs
                        var config = require(rootDir + 'tmp/' + appName + '-data/' + appName + '.json');
                        config.objects.port = 19001;
                        config.states.port  = 19000;
                        fs.writeFileSync(rootDir + 'tmp/' + appName + '-data/' + appName + '.json', JSON.stringify(config, null, 2));

                        copyAdapterToController();

                        installAdapter(function () {
                            storeOriginalFiles();
                            if (cb) cb(true);
                        });
                    });
                });
            }, 1000);
        }
    } else {
        setTimeout(function () {
            console.log('installJsController: js-controller installed');
            if (cb) cb(false);
        }, 0);
    }
}

function copyAdapterToController() {
    console.log('Copy adapter...');
    // Copy adapter to tmp/node_modules/appName.adapter
    copyFolderRecursiveSync(rootDir, rootDir + 'tmp/node_modules/', ['.idea', 'test', 'tmp', '.git', appName + '.js-controller']);
    console.log('Adapter copied.');
}

function clearControllerLog() {
    var dirPath = rootDir + 'tmp/log';
    var files;
    try {
        if (fs.existsSync(dirPath)) {
            console.log('Clear controller log...');
            files = fs.readdirSync(dirPath);
        } else {
            console.log('Create controller log directory...');
            files = [];
            fs.mkdirSync(dirPath);
        }
    } catch(e) {
        console.error('Cannot read "' + dirPath + '"');
        return;
    }
    if (files.length > 0) {
        try {
            for (var i = 0; i < files.length; i++) {
                var filePath = dirPath + '/' + files[i];
                fs.unlinkSync(filePath);
            }
            console.log('Controller log cleared');
        } catch (err) {
            console.error('cannot clear log: ' + err);
        }
    }
}

function clearDB() {
    var dirPath = rootDir + 'tmp/iobroker-data/sqlite';
    var files;
    try {
        if (fs.existsSync(dirPath)) {
            console.log('Clear sqlite DB...');
            files = fs.readdirSync(dirPath);
        } else {
            console.log('Create controller log directory...');
            files = [];
            fs.mkdirSync(dirPath);
        }
    } catch(e) {
        console.error('Cannot read "' + dirPath + '"');
        return;
    }
    if (files.length > 0) {
        try {
            for (var i = 0; i < files.length; i++) {
                var filePath = dirPath + '/' + files[i];
                fs.unlinkSync(filePath);
            }
            console.log('Clear sqlite DB');
        } catch (err) {
            console.error('cannot clear DB: ' + err);
        }
    }
}

function setupController(cb) {
    installJsController(function (isInited) {
        clearControllerLog();
        clearDB();

        if (!isInited) {
            restoreOriginalFiles();
            copyAdapterToController();
        }
        // read system.config object
        var dataDir = rootDir + 'tmp/' + appName + '-data/';

        var objs;
        try {
            objs = fs.readFileSync(dataDir + 'objects.json');
            objs = JSON.parse(objs);
        }
        catch (e) {
            console.log('ERROR reading/parsing system configuration. Ignore');
            objs = {'system.config': {}};
        }
        if (!objs || !objs.system || !objs.system.config) {
            objs = {'system.config': {}};
        }

        if (cb) cb(objs['system.config']);
    });
}

function startAdapter(objects, states, callback) {
    if (adapterStarted) {
        console.log('Adapter already started ...');
        if (callback) callback(objects, states);
        return;
    }
    adapterStarted = true;
    console.log('startAdapter...');
    if (fs.existsSync(rootDir + 'tmp/node_modules/' + pkg.name + '/' + pkg.main)) {
        try {
            if (debug) {
                // start controller
                pid = child_process.exec('node node_modules/' + pkg.name + '/' + pkg.main + ' --console silly', {
                    cwd: rootDir + 'tmp',
                    stdio: [0, 1, 2]
                });
            } else {
                // start controller
                pid = child_process.fork('node_modules/' + pkg.name + '/' + pkg.main, ['--console', 'silly'], {
                    cwd:   rootDir + 'tmp',
                    stdio: [0, 1, 2, 'ipc']
                });
            }
        } catch (error) {
            console.error(JSON.stringify(error));
        }
    } else {
        console.error('Cannot find: ' + rootDir + 'tmp/node_modules/' + pkg.name + '/' + pkg.main);
    }
    if (callback) callback(objects, states);
}

function startController(isStartAdapter, onObjectChange, onStateChange, callback) {
    if (typeof isStartAdapter === 'function') {
        callback = onStateChange;
        onStateChange = onObjectChange;
        onObjectChange = isStartAdapter;
        isStartAdapter = true;
    }

    if (onStateChange === undefined) {
        callback  = onObjectChange;
        onObjectChange = undefined;
    }

    if (pid) {
        console.error('Controller is already started!');
    } else {
        console.log('startController...');
        adapterStarted = false;
        var isObjectConnected;
        var isStatesConnected;

        var Objects = require(rootDir + 'tmp/node_modules/' + appName + '.js-controller/lib/objects/objectsInMemServer');
        objects = new Objects({
            connection: {
                "type" : "file",
                "host" : "127.0.0.1",
                "port" : 19001,
                "user" : "",
                "pass" : "",
                "noFileCache": false,
                "connectTimeout": 2000
            },
            logger: {
                silly: function (msg) {
                    console.log(msg);
                },
                debug: function (msg) {
                    console.log(msg);
                },
                info: function (msg) {
                    console.log(msg);
                },
                warn: function (msg) {
                    console.warn(msg);
                },
                error: function (msg) {
                    console.error(msg);
                }
            },
            connected: function () {
                isObjectConnected = true;
                if (isStatesConnected) {
                    console.log('startController: started!');
                    if (isStartAdapter) {
                        startAdapter(objects, states, callback);
                    } else {
                        if (callback) {
                            callback(objects, states);
                            callback = null;
                        }
                    }
                }
            },
            change: onObjectChange
        });

        // Just open in memory DB itself
        var States = require(rootDir + 'tmp/node_modules/' + appName + '.js-controller/lib/states/statesInMemServer');
        states = new States({
            connection: {
                type: 'file',
                host: '127.0.0.1',
                port: 19000,
                options: {
                    auth_pass: null,
                    retry_max_delay: 15000
                }
            },
            logger: {
                silly: function (msg) {
                    console.log(msg);
                },
                debug: function (msg) {
                    console.log(msg);
                },
                info: function (msg) {
                    console.log(msg);
                },
                warn: function (msg) {
                    console.log(msg);
                },
                error: function (msg) {
                    console.log(msg);
                }
            },
            connected: function () {
                isStatesConnected = true;
                if (isObjectConnected) {
                    console.log('startController: started!!');
                    if (isStartAdapter) {
                        startAdapter(objects, states, callback);
                    } else {
                        if (callback) {
                            callback(objects, states);
                            callback = null;
                        }
                    }
                }
            },
            change: onStateChange
        });
    }
}

function stopAdapter(cb) {
    if (!pid) {
        console.error('Controller is not running!');
        if (cb) {
            setTimeout(function () {
                cb(false);
            }, 0);
        }
    } else {
        adapterStarted = false;
        pid.on('exit', function (code, signal) {
            if (pid) {
                console.log('child process terminated due to receipt of signal ' + signal);
                if (cb) cb();
                pid = null;
            }
        });

        pid.on('close', function (code, signal) {
            if (pid) {
                if (cb) cb();
                pid = null;
            }
        });

        pid.kill('SIGTERM');
    }
}

function _stopController() {
    if (objects) {
        objects.destroy();
        objects = null;
    }
    if (states) {
        states.destroy();
        states = null;
    }
}

function stopController(cb) {
    var timeout;
    if (objects) {
        console.log('Set system.adapter.' + pkg.name + '.0');
        objects.setObject('system.adapter.' + pkg.name + '.0', {
            common:{
                enabled: false
            }
        });
    }

    stopAdapter(function () {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }

        _stopController();

        if (cb) {
            cb(true);
            cb = null;
        }
    });

    timeout = setTimeout(function () {
        timeout = null;
        console.log('child process NOT terminated');

        _stopController();

        if (cb) {
            cb(false);
            cb = null;
        }
        pid = null;
    }, 5000);
}

// Setup the adapter
function setAdapterConfig(common, native, instance) {
    var objects = JSON.parse(fs.readFileSync(rootDir + 'tmp/' + appName + '-data/objects.json').toString());
    var id = 'system.adapter.' + adapterName.split('.').pop() + '.' + (instance || 0);
    if (common) objects[id].common = common;
    if (native) objects[id].native = native;
    fs.writeFileSync(rootDir + 'tmp/' + appName + '-data/objects.json', JSON.stringify(objects));
}

// Read config of the adapter
function getAdapterConfig(instance) {
    var objects = JSON.parse(fs.readFileSync(rootDir + 'tmp/' + appName + '-data/objects.json').toString());
    var id      = 'system.adapter.' + adapterName.split('.').pop() + '.' + (instance || 0);
    return objects[id];
}

if (typeof module !== undefined && module.parent) {
    module.exports.getAdapterConfig = getAdapterConfig;
    module.exports.setAdapterConfig = setAdapterConfig;
    module.exports.startController  = startController;
    module.exports.stopController   = stopController;
    module.exports.setupController  = setupController;
    module.exports.stopAdapter      = stopAdapter;
    module.exports.startAdapter     = startAdapter;
    module.exports.installAdapter   = installAdapter;
    module.exports.appName          = appName;
    module.exports.adapterName      = adapterName;
    module.exports.adapterStarted   = adapterStarted;
}
