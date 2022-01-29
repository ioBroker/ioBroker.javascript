/* jshint -W097 */// jshint strict:false
/*jslint node: true */
// check if tmp directory exists
const fs            = require('fs');
const path          = require('path');
const child_process = require('child_process');
const rootDir       = path.normalize(__dirname + '/../../');
const pkg           = require(rootDir + 'package.json');
const debug         = typeof v8debug === 'object';
pkg.main = pkg.main || 'main.js';

let JSONLDB;

let adapterName = path.normalize(rootDir).replace(/\\/g, '/').split('/');
adapterName = adapterName[adapterName.length - 2];
let adapterStarted = false;

function getAppName() {
    const parts = __dirname.replace(/\\/g, '/').split('/');
    return parts[parts.length - 3].split('.')[0];
}

function loadJSONLDB() {
    if (!JSONLDB) {
        const dbPath = require.resolve('@alcalzone/jsonl-db', {
            paths: [rootDir + 'tmp/node_modules', rootDir, rootDir + 'tmp/node_modules/' + appName + '.js-controller']
        });
        console.log('JSONLDB path: ' + dbPath);
        try {
            const { JsonlDB } = require(dbPath);
            JSONLDB = JsonlDB;
        } catch (err) {
            console.log('Jsonl require error: ' + err);
        }
    }
}

const appName = getAppName().toLowerCase();

let objects;
let states;

let pid = null;

let systemConfig = null;

function copyFileSync(source, target) {

    let targetFile = target;

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
        console.log('file copy error: ' +source +' -> ' + targetFile + ' (error ignored)');
    }
}

function copyFolderRecursiveSync(source, target, ignore) {
    let files = [];

    let base = path.basename(source);
    if (base === adapterName) {
        base = pkg.name;
    }
    //check if folder needs to be created or integrated
    const targetFolder = path.join(target, base);
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

            const curSource = path.join(source, file);
            const curTarget = path.join(targetFolder, file);
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

async function storeOriginalFiles() {
    console.log('Store original files...');
    const dataDir = rootDir + 'tmp/' + appName + '-data/';

    if (fs.existsSync(dataDir + 'objects.json')) {
        const f = fs.readFileSync(dataDir + 'objects.json');
        const objects = JSON.parse(f.toString());
        if (objects['system.adapter.admin.0'] && objects['system.adapter.admin.0'].common) {
            objects['system.adapter.admin.0'].common.enabled = false;
        }
        if (objects['system.adapter.admin.1'] && objects['system.adapter.admin.1'].common) {
            objects['system.adapter.admin.1'].common.enabled = false;
        }

        fs.writeFileSync(dataDir + 'objects.json.original', JSON.stringify(objects));
        console.log('Store original objects.json');
    }

    if (fs.existsSync(dataDir + 'states.json')) {
        try {
            const f = fs.readFileSync(dataDir + 'states.json');
            fs.writeFileSync(dataDir + 'states.json.original', f);
            console.log('Store original states.json');
        } catch (err) {
            console.log('no states.json found - ignore');
        }
    }

    if (fs.existsSync(dataDir + 'objects.jsonl')) {
        loadJSONLDB();
        const db = new JSONLDB(dataDir + 'objects.jsonl');
        await db.open();

        const admin0 = db.get('system.adapter.admin.0');
        if (admin0) {
            if (admin0.common) {
                admin0.common.enabled = false;
                db.set('system.adapter.admin.0', admin0);
            }
        }

        const admin1 = db.get('system.adapter.admin.1');
        if (admin1) {
            if (admin1.common) {
                admin1.common.enabled = false;
                db.set('system.adapter.admin.1', admin1);
            }
        }
        await db.close();

        const f = fs.readFileSync(dataDir + 'objects.jsonl');
        fs.writeFileSync(dataDir + 'objects.jsonl.original', f);
        console.log('Store original objects.jsonl');
    }

    if (fs.existsSync(dataDir + 'states.jsonl')) {
        const f = fs.readFileSync(dataDir + 'states.jsonl');
        fs.writeFileSync(dataDir + 'states.jsonl.original', f);
        console.log('Store original states.jsonl');
    }
}

function restoreOriginalFiles() {
    console.log('restoreOriginalFiles...');
    const dataDir = rootDir + 'tmp/' + appName + '-data/';

    if (fs.existsSync(dataDir + 'objects.json.original')) {
        const f = fs.readFileSync(dataDir + 'objects.json.original');
        fs.writeFileSync(dataDir + 'objects.json', f);
    }
    if (fs.existsSync(dataDir + 'objects.json.original')) {
        const f = fs.readFileSync(dataDir + 'states.json.original');
        fs.writeFileSync(dataDir + 'states.json', f);
    }

    if (fs.existsSync(dataDir + 'objects.jsonl.original')) {
        const f = fs.readFileSync(dataDir + 'objects.jsonl.original');
        fs.writeFileSync(dataDir + 'objects.jsonl', f);
    }
    if (fs.existsSync(dataDir + 'objects.jsonl.original')) {
        const f = fs.readFileSync(dataDir + 'states.jsonl.original');
        fs.writeFileSync(dataDir + 'states.jsonl', f);
    }
}

async function checkIsAdapterInstalled(cb, counter, customName) {
    customName = customName || pkg.name.split('.').pop();
    counter = counter || 0;
    const dataDir = rootDir + 'tmp/' + appName + '-data/';
    console.log('checkIsAdapterInstalled...');

    try {
        if (fs.existsSync(dataDir + 'objects.json')) {
            const f = fs.readFileSync(dataDir + 'objects.json');
            const objects = JSON.parse(f.toString());
            if (objects['system.adapter.' + customName + '.0']) {
                console.log('checkIsAdapterInstalled: ready!');
                setTimeout(function () {
                    if (cb) cb();
                }, 100);
                return;
            } else {
                console.warn('checkIsAdapterInstalled: still not ready');
            }
        } else if (fs.existsSync(dataDir + 'objects.jsonl')) {
            loadJSONLDB();
            const db = new JSONLDB(dataDir + 'objects.jsonl');
            try {
                await db.open();
            } catch (err) {
                if (err.message.includes('Failed to lock DB file')) {
                    console.log('checkIsAdapterInstalled: DB still opened ...');
                }
                throw err;
            }

            const obj = db.get('system.adapter.' + customName + '.0');
            await db.close();

            if (obj) {
                console.log('checkIsAdapterInstalled: ready!');
                setTimeout(function () {
                    if (cb) cb();
                }, 100);
                return;
            } else {
                console.warn('checkIsAdapterInstalled: still not ready');
            }
        } else {
            console.error('checkIsAdapterInstalled: No objects file found in datadir ' + dataDir);
        }

    } catch (err) {
        console.log('checkIsAdapterInstalled: catch ' + err);
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

async function checkIsControllerInstalled(cb, counter) {
    counter = counter || 0;
    const dataDir = rootDir + 'tmp/' + appName + '-data/';

    console.log('checkIsControllerInstalled...');
    try {
        if (fs.existsSync(dataDir + 'objects.json')) {
            const f = fs.readFileSync(dataDir + 'objects.json');
            const objects = JSON.parse(f.toString());
            if (objects['system.certificates']) {
                console.log('checkIsControllerInstalled: installed!');
                setTimeout(function () {
                    if (cb) cb();
                }, 100);
                return;
            }
        } else if (fs.existsSync(dataDir + 'objects.jsonl')) {
            loadJSONLDB();
            const db = new JSONLDB(dataDir + 'objects.jsonl');
            try {
                await db.open();
            } catch (err) {
                if (err.message.includes('Failed to lock DB file')) {
                    console.log('checkIsControllerInstalled: DB still opened ...');
                }
                throw err;
            }

            const obj = db.get('system.certificates');
            await db.close();

            if (obj) {
                console.log('checkIsControllerInstalled: installed!');
                setTimeout(function () {
                    if (cb) cb();
                }, 100);
                return;
            }

        } else {
            console.error('checkIsControllerInstalled: No objects file found in datadir ' + dataDir);
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
    const startFile = 'node_modules/' + appName + '.js-controller/' + appName + '.js';
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
        const _pid = child_process.fork(startFile, ['add', customName, '--enabled', 'false'], {
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
            let _pid;
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
                let __pid;
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
                        const config = require(rootDir + 'tmp/' + appName + '-data/' + appName + '.json');
                        config.objects.port = 19001;
                        config.states.port  = 19000;

                        // TEST WISE!
                        //config.objects.type = 'jsonl';
                        //config.states.type = 'jsonl';
                        fs.writeFileSync(rootDir + 'tmp/' + appName + '-data/' + appName + '.json', JSON.stringify(config, null, 2));
                        console.log('Setup finished.');

                        copyAdapterToController();

                        installAdapter(async function () {
                            await storeOriginalFiles();
                            if (cb) cb(true);
                        });
                    });
                });
            });
        } else {
            // check if port 9000 is free, else admin adapter will be added to running instance
            const client = new require('net').Socket();
            client.on('error', () => {});
            client.connect(9000, '127.0.0.1', function() {
                console.error('Cannot initiate fisrt run of test, because one instance of application is running on this PC. Stop it and repeat.');
                process.exit(0);
            });

            setTimeout(function () {
                client.destroy();
                if (!fs.existsSync(rootDir + 'tmp/node_modules/' + appName + '.js-controller')) {
                    console.log('installJsController: no js-controller => install dev build from npm');

                    child_process.execSync('npm install ' + appName + '.js-controller@dev --prefix ./ --production', {
                        cwd:   rootDir + 'tmp/',
                        stdio: [0, 1, 2]
                    });
                } else {
                    console.log('Setup js-controller...');
                    let __pid;
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
                    let _pid;

                    if (fs.existsSync(rootDir + 'node_modules/' + appName + '.js-controller/' + appName + '.js')) {
                        _pid = child_process.fork(appName + '.js', ['stop'], {
                            cwd:   rootDir + 'node_modules/' + appName + '.js-controller',
                            stdio: [0, 1, 2, 'ipc']
                        });
                    }

                    waitForEnd(_pid, function () {
                        // change ports for object and state DBs
                        const config = require(rootDir + 'tmp/' + appName + '-data/' + appName + '.json');
                        config.objects.port = 19001;
                        config.states.port  = 19000;

                        // TEST WISE!
                        //config.objects.type = 'jsonl';
                        //config.states.type = 'jsonl';
                        fs.writeFileSync(rootDir + 'tmp/' + appName + '-data/' + appName + '.json', JSON.stringify(config, null, 2));

                        copyAdapterToController();

                        installAdapter(async function () {
                            await storeOriginalFiles();
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
    const dirPath = rootDir + 'tmp/log';
    let files;
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
            for (let i = 0; i < files.length; i++) {
                const filePath = dirPath + '/' + files[i];
                fs.unlinkSync(filePath);
            }
            console.log('Controller log cleared');
        } catch (err) {
            console.error('cannot clear log: ' + err);
        }
    }
}

function clearDB() {
    const dirPath = rootDir + 'tmp/iobroker-data/sqlite';
    let files;
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
            for (let i = 0; i < files.length; i++) {
                const filePath = dirPath + '/' + files[i];
                fs.unlinkSync(filePath);
            }
            console.log('Clear sqlite DB');
        } catch (err) {
            console.error('cannot clear DB: ' + err);
        }
    }
}

function setupController(cb) {
    installJsController(async function (isInited) {
        try {
            clearControllerLog();
            clearDB();

            if (!isInited) {
                restoreOriginalFiles();
                copyAdapterToController();
            }
            // read system.config object
            const dataDir = rootDir + 'tmp/' + appName + '-data/';

            if (fs.existsSync(dataDir + 'objects.json')) {
                let objs;
                try {
                    objs = fs.readFileSync(dataDir + 'objects.json');
                    objs = JSON.parse(objs);
                } catch (e) {
                    console.log('ERROR reading/parsing system configuration. Ignore');
                    objs = {'system.config': {}};
                }
                if (!objs || !objs['system.config']) {
                    objs = {'system.config': {}};
                }

                systemConfig = objs['system.config'];
                if (cb) cb(objs['system.config']);
            } else if (fs.existsSync(dataDir + 'objects.jsonl')) {
                loadJSONLDB();
                const db = new JSONLDB(dataDir + 'objects.jsonl');
                await db.open();

                let config = db.get('system.config');
                systemConfig = config || {};

                await db.close();

                if (cb) cb(systemConfig);
            } else {
                console.error('read SystemConfig: No objects file found in datadir ' + dataDir);
            }
        } catch (err) {
            console.error('setupController: ' + err);
        }
    });
}

async function getSecret() {
    var dataDir = rootDir + 'tmp/' + appName + '-data/';

    if (systemConfig) {
        return systemConfig.native.secret;
    }
    if (fs.existsSync(dataDir + 'objects.json')) {
        let objs;
        try {
            objs = fs.readFileSync(dataDir + 'objects.json');
            objs = JSON.parse(objs);
        }
        catch (e) {
            console.warn("Could not load secret. Reason: " + e);
            return null;
        }
        if (!objs || !objs['system.config']) {
            objs = {'system.config': {}};
        }

        return objs['system.config'].native.secre;
    } else if (fs.existsSync(dataDir + 'objects.jsonl')) {
        loadJSONLDB();
        const db = new JSONLDB(dataDir + 'objects.jsonl');
        await db.open();

        let config = db.get('system.config');
        config = config || {};

        await db.close();

        return config.native.secret;
    } else {
        console.error('read secret: No objects file found in datadir ' + dataDir);
    }

}

function encrypt (key, value) {
    var result = '';
    for (var i = 0; i < value.length; ++i) {
        result += String.fromCharCode(key[i % key.length].charCodeAt(0) ^ value.charCodeAt(i));
    }
    return result;
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
        try {
            const config = require(rootDir + 'tmp/' + appName + '-data/' + appName + '.json');

            adapterStarted = false;
            let isObjectConnected;
            let isStatesConnected;

            // rootDir + 'tmp/node_modules
            const objPath = require.resolve(`@iobroker/db-objects-${config.objects.type}`, {
                paths: [ rootDir + 'tmp/node_modules', rootDir, rootDir + 'tmp/node_modules/' + appName + '.js-controller']
            });
            console.log('Objects Path: ' + objPath);
            const Objects = require(objPath).Server;
            objects = new Objects({
                connection: {
                    'type': config.objects.type,
                    'host': '127.0.0.1',
                    'port': 19001,
                    'user': '',
                    'pass': '',
                    'noFileCache': false,
                    'connectTimeout': 2000
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
            const statePath = require.resolve(`@iobroker/db-states-${config.states.type}`, {
                paths: [ rootDir + 'tmp/node_modules', rootDir, rootDir + 'tmp/node_modules/' + appName + '.js-controller']
            });
            console.log('States Path: ' + statePath);
            const States = require(statePath).Server;
            states = new States({
                connection: {
                    type: config.states.type,
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
        } catch (err) {
            console.log(err);
        }
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
    let timeout;
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
async function setAdapterConfig(common, native, instance) {
    const id = 'system.adapter.' + adapterName.split('.').pop() + '.' + (instance || 0);
    if (fs.existsSync(rootDir + 'tmp/' + appName + '-data/objects.json')) {
        const objects = JSON.parse(fs.readFileSync(rootDir + 'tmp/' + appName + '-data/objects.json').toString());
        if (common) objects[id].common = common;
        if (native) objects[id].native = native;
        fs.writeFileSync(rootDir + 'tmp/' + appName + '-data/objects.json', JSON.stringify(objects));
    } else if (fs.existsSync(rootDir + 'tmp/' + appName + '-data/objects.jsonl')) {
        loadJSONLDB();
        const db = new JSONLDB(rootDir + 'tmp/' + appName + '-data/objects.jsonl');
        await db.open();

        let obj = db.get(id);
        if (common) obj.common = common;
        if (native) obj.native = native;
        db.set(id, obj);

        await db.close();
    } else {
        console.error('setAdapterConfig: No objects file found in datadir ' + rootDir + 'tmp/' + appName + '-data/');
    }
}

// Read config of the adapter
async function getAdapterConfig(instance) {
    const id = 'system.adapter.' + adapterName.split('.').pop() + '.' + (instance || 0);
    if (fs.existsSync(rootDir + 'tmp/' + appName + '-data/objects.json')) {
        const objects = JSON.parse(fs.readFileSync(rootDir + 'tmp/' + appName + '-data/objects.json').toString());
        return objects[id];
    } else if (fs.existsSync(rootDir + 'tmp/' + appName + '-data/objects.jsonl')) {
        loadJSONLDB();
        const db = new JSONLDB(rootDir + 'tmp/' + appName + '-data/objects.jsonl');
        await db.open();

        let obj = db.get(id);

        await db.close();
        return obj;
    } else {
        console.error('getAdapterConfig: No objects file found in datadir ' + rootDir + 'tmp/' + appName + '-data/');
    }
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
    module.exports.getSecret        = getSecret;
    module.exports.encrypt          = encrypt;
}
