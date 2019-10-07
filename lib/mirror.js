'use strict';
const fs = require('fs');
const path = require('path');

class Mirror {
    constructor(options) {
        if (!options || !options.diskRoot) {
            return;
        }
        if (!options.adapter) {
            throw new Error('No adapter defined');
        }

        if (options.adapter.namespace !== 'javascript.0') {
            // only instance 0 can sync objects
            return;
        }

        this.adapter = options.adapter;
        this.watchedFolder = {};
        this.diskRoot = path.normalize(options.diskRoot).replace(/\\/g, '/');
        this.from       = 'system.adapter.' + this.adapter.namespace;
        this.lastSyncID = this.from + '.lastSync';

        if (!fs.existsSync(this.diskRoot)) {
            try {
                fs.mkdirSync(this.diskRoot);
            } catch (e) {
                this.log.error(`Cannot create directory ${this.diskRoot}: ${e}`);
                return;
            }
        }

        this.log = options.log || {
            silly: text  => console.log(text),
            debug: text  => console.log(text),
            info:  text  => console.log(text),
            log:   text  => console.log(text),
            warn:  text  => console.warn(text),
            error: text  => console.error(text)
        };

        this.diskList = this.scanDisk();
        this.checkLastSyncObject(lastSyncTime => {
            this.scanDB(list => {
                this.dbList = list;
                this.sync(lastSyncTime);

                this.adapter.setForeignState(this.lastSyncID, Date.now(), true);

                // monitor all folders
                this.watchFolders(this.diskRoot);
            });
        });
    }

    watchFolders(root_) {
        root_ = root_.endsWith('/') ? root_ : root_ + '/';

        const files = fs.readdirSync(root_);
        files.forEach(file => {
            const name = path.join(root_, file).replace(/\\/g, '/');
            const stat = fs.statSync(name);
            stat.isDirectory()&& this.watchFolders(name);
        });

        if (!this.watchedFolder[root_]) {
            this.log.info('Watch ' + root_);
            this.watchedFolder[root_] = fs.watch(root_, (eventType, filename) => {
                this.log.debug('File ' + root_ + filename + ' ' + eventType);
                this.onFileChange(eventType, root_ + filename);
            });

            this.watchedFolder[root_].on('error', err => {
                this.log.debug('Folder ' + root_ + ' was deleted');
                try {
                    this.watchedFolder[root_] && this.watchedFolder[root_].close();
                } catch (e) {

                }

                if (this.watchedFolder[root_]) {
                    delete this.watchedFolder[root_];
                }
            });
        }
    }

    checkLastSyncObject(cb) {
        this.adapter.getForeignObject(this.lastSyncID, (err, obj) => {
            if (!obj) {
                // create variable
                const obj = {
                    _id: this.lastSyncID,
                    common: {
                        name: 'Last sync time',
                        type: 'number',
                        role: 'timestamp',
                        write: false,
                        min: 0,
                        read: true,
                    },
                    type: 'state'
                };

                this.adapter.setForeignObject(this.lastSyncID, obj, () =>
                    this.adapter.setForeignState(this.lastSyncID, 0, true, () => cb && cb(0)));
            } else {
                this.adapter.getForeignState(this.lastSyncID, (err, state) =>
                    cb && cb(state && state.val));
            }
        });
    }

    static getDBFolder(id) {
        const parts = id.split('.');
        parts.pop();
        return parts.join('.');
    }

    static isBlockly(data) {
        const pos = data.lastIndexOf('\n');
        if (pos !== -1) {
            data = data.substring(pos + 1);
            if (data[0] === '/' && data[1] === '/') {
                data = Buffer(data.substring(2), 'base64').toString('utf8');
                if (data.startsWith('%3Cxml')) {
                    return true;
                }
            }
        }
        return false;
    }

    static detectType(fileName, data) {
        if (fileName.endsWith('.ts')) {
            return 'TypeScript/ts';
        } else {
            return Mirror.isBlockly(data) ? 'Blockly' : 'JavaScript/js';
        }
    }

    updateFolderTime(id) {
        this.dbList[id].ts = Date.now();
        this.dbList[id].from = this.from;
        this.adapter.setForeignObject(id, this.dbList[id]);
    }

    _getDiskPath(pathDisk) {
        return path.join(this.diskRoot, pathDisk.join('/')).replace(/\\/g, '/');
    }
    static _getDbPath(pathDB) {
        if (!pathDB || !pathDB.length) {
            return 'script.js';
        } else {
            return 'script.js.' + pathDB.join('.');
        }
    }

    // create the folder recursively if not exists
    static createRecursiveDir(dirDisk) {
        const parts = dirDisk.replace(/\\/g, '/').split('/');
        let path = '';
        for (let i = 0; i < parts.length; i++) {
            path += (i > 0 ? '/' : '') + parts[i];
            // if not C: and not exists
            if (path && !parts[i].includes(':') && !fs.existsSync(path)) {
                fs.mkdirSync(path);
            }
        }
    }

    _getFilesInPath(pathDisk) {
        pathDisk = pathDisk.substring(this.diskRoot.length + 1);
        const id = pathDisk.replace(/\./g, '\\.').replace(/[/\\]/g, '\\.');
        const reg = new RegExp('script\\.js' + (id ? '.' + id : '') + '\\.[^.]+$');
        return Object.keys(this.diskList).filter(file => reg.test(file)).map(id => id.split('.').pop());
    }
    _getObjectsInPath(pathDB) {
        const reg = new RegExp(pathDB.replace(/\./g, '\\.') + '\\.[^.]+$');
        return Object.keys(this.dbList).filter(id => reg.test(id)).map(id => id.split('.').pop());
    }

    sync(lastSyncTime, pathDisk, pathDB) {
        lastSyncTime = lastSyncTime || 0;
        pathDisk = pathDisk || [];
        pathDB = pathDB || [];

        const dirDisk = this._getDiskPath(pathDisk);
        const dirDB   = Mirror._getDbPath(pathDB);
        const files   = this._getFilesInPath(dirDisk);
        const objects = this._getObjectsInPath(dirDB);

        for (let o = objects.length - 1; o >= 0; o--) {
            // if folder
            if (this.dbList[dirDB + '.' + objects[o]].type === 'channel') {
                // dive into
                const nextPathDisk = JSON.parse(JSON.stringify(pathDisk));
                nextPathDisk.push(objects[o]);
                const nextPathDB = JSON.parse(JSON.stringify(pathDB));
                nextPathDB.push(objects[o]);
                objects.splice(o, 1);
                this.sync(lastSyncTime, nextPathDisk, nextPathDB);
            } else {
                // try to find this DB script on disk
                for (let f = files.length - 1; f >= 0; f--) {
                    if (objects[o] === files[f]) {
                        const id = dirDB + '.' + objects[o];

                        if (!this.dbList[id].ts || (this.dbList[id].ts > this.diskList[id].ts && this.dbList[id].ts - this.diskList[id].ts > 2000)) {
                            // copy text to file
                            this.dbList[id].ts = Date.now();
                            this.diskList[id].source = this.dbList[id].common.source;
                            this.diskList[id].ts = Date.now();
                            this.log.debug('Update disk with ' + this.diskList[id].name);
                            Mirror.createRecursiveDir(dirDisk);
                            fs.writeFileSync(this.diskList[id].name, this.dbList[id].common.source);
                        } else if (this.dbList[id].ts && this.diskList[id].ts - this.dbList[id].ts > 2000) {
                            // copy file to DB
                            this.dbList[id].common.source = this.diskList[id].source;
                            this.dbList[id].ts = this.diskList[id].ts;
                            this.dbList[id].from = this.from;
                            this.log.debug('Update DB with ' + id);
                            this.adapter.setForeignObject(id, this.dbList[id]);
                        }
                        files.splice(f, 1);
                        objects.splice(o, 1);
                        break;
                    }
                }
            }
        }

        // go through objects, that does not exist on disk
        for (let o = objects.length - 1; o >= 0; o--) {
            const fileName = this._scriptId2FileName(dirDB + '.' + objects[o], this.dbList[dirDB + '.' + objects[o]].common.engineType);
            this.log.info('Created script file on disk ' + fileName);
            Mirror.createRecursiveDir(dirDisk);
            const f = 'script.js.' + fileName.substring(this.diskRoot.length).replace(/[\\/]g/, '.').replace(/\.js$|\.ts$/g, '');
            this.diskList[f] = {name: fileName, source: this.dbList[dirDB + '.' + objects[o]].common.source, ts: Date.now()};
            fs.writeFileSync(fileName, this.dbList[dirDB + '.' + objects[o]].common.source);
        }

        // go through files, that does not exist in DB
        for (let f = files.length - 1; f >= 0; f--) {
            // read creation time
            const id = dirDB + '.' + files[f];
            if (this.diskList[id].ts > lastSyncTime) {
                // The file was created after last sync. So create it in DB too
                this.dbList[id] = {
                    _id: id,
                    common: {
                        name: files[f],
                        enabled: false,
                        source: this.diskList[id].source,
                        engine: 'system.adapter.' + this.adapter.namespace,
                        engineType: Mirror.detectType(this.diskList[id].name, this.diskList[id].source),
                        debug: false,
                        verbose: false,
                    },
                    type: 'script',
                    ts: this.diskList[id].ts,
                    native: {}
                };
                this.log.debug('Create script in DB with ' + id);
                // ensure that every script has a folder and if not then create it
                this._checkIfAllFoldersAreExist(id, this.dbList);
                this.adapter.setForeignObject(id, this.dbList[id]);
            } else {
                this.log.warn('Please delete file ' + path.join(dirDisk, files[f]));
            }
        }
    }

    _scriptId2FileName(id, type) {
        id = id.substring('script.js.'.length);
        const parts = id.split('.');
        return path.join(this.diskRoot, parts.join('/')).replace(/\\/g, '/') + (type && type.toLowerCase() === 'typescript/ts' ? '.ts' : '.js');
    }
    _fileName2scriptId(file) {
        file = file.substring(this.diskRoot.length).replace(/\.js$/g, '').replace(/\.ts$/g, '');
        const parts = file.replace(/\\/g, '/').split('/');
        if (!parts[0] && parts.length) {
            parts.shift();
        }

        return 'script.js.' + parts.join('.');
    }

    removeScriptsInFolder(folder) {
        // get all files in this folder
        const folderId = this._fileName2scriptId(folder);
        for (const id in this.dbList) {
            if (this.dbList.hasOwnProperty(id) && (id.startsWith(folderId) || id === folderId.replace(/\.$/, ''))) {
                // delete it
                if (this.dbList[id]) {
                    this.log.debug('Delete script ' + id + ' in DB');
                    delete this.dbList[id];
                    this.adapter.delForeignObject(id);
                }
                if (this.diskList[id]) {
                    delete this.diskList[id];
                }
            }
        }
    }

    onFileChange(event, file) {
        let stats;
        let exists = fs.existsSync(file);
        if (exists) {
            stats = fs.statSync(file);

            if (stats.isDirectory()) {
                file = file.endsWith('/') ? file : file + '/';
                if (exists) {
                    !this.watchedFolder[file] && this.watchFolders(file);
                    // scan folder anew
                    const files = fs.readdirSync(file);
                    // update all files in this directory
                    files.forEach(f => this.onFileChange('change', path.join(file, f).replace(/\\/g, '/')));
                } else {
                    if (this.watchedFolder[file]) {
                        this.watchedFolder[file].close();
                        delete this.watchedFolder[file];
                    }
                    this.removeScriptsInFolder(file);
                }
                return;
            }
        } else if (this.watchedFolder[file]) {
            if (!exists) {
                try {
                    if (this.watchedFolder[file]) {
                        this.watchedFolder[file].close();
                        delete this.watchedFolder[file];
                    }
                } catch (e) {

                }
                this.removeScriptsInFolder(file);
            }
            return;
        } else if (this.watchedFolder[file + '/']) {
            if (!exists) {
                file = file + '/';
                // delete all files in this folder

                try {
                    if (this.watchedFolder[file]) {
                        this.watchedFolder[file].close();
                        delete this.watchedFolder[file];
                    }
                } catch (e) {

                }
                this.removeScriptsInFolder(file);
            }
            return;
        }

        if (!file.match(/\.ts$|\.js$/)) return;
        const id = this._fileName2scriptId(file);

        if (exists && (event === 'change' || event === 'create')) {
            stats = stats || fs.statSync(file);
            try {
                const source = fs.readFileSync(file).toString();
                const ts = stats.mtime.getTime();
                this.diskList[id] = {ts, source, name: file};

                if (this.dbList[id]) {
                    if (this.dbList[id].common.source !== source) {
                        this.dbList[id].common.source = source;
                        this.dbList[id].ts = ts;
                        this.log.debug('Update script ' + id + ' in DB');
                        this.dbList[id].from = this.from;
                        this.adapter.setForeignObject(id, this.dbList[id]);
                    } else {
                        this.dbList[id].ts = ts;
                    }
                } else {
                    this.log.debug('Create script ' + id + ' in DB');
                    const parts = id.split('.');
                    // new script
                    this.dbList[id] = {
                        _id: id,
                        common: {
                            name: parts.pop(),
                            engineType: Mirror.detectType(file, source),
                            source,
                            enabled: false,
                            engine: 'system.adapter.' + this.adapter.namespace,
                            debug: false,
                            verbose: false,
                        },
                        type: 'script',
                        native: {},
                        ts: ts
                    };
                    this._checkIfAllFoldersAreExist(id, this.dbList);
                    this.adapter.setForeignObject(id, this.dbList[id]);
                }
            } catch (e) {
                this.log.error('Cannot read file ' + file + ': ' + e);
            }
        } else if (event === 'delete' || event === 'rename') {
            if (this.dbList[id]) {
                this.log.debug('Delete script ' + id + ' in DB');
                delete this.dbList[id];
                this.adapter.delForeignObject(id);
            }
            if (this.diskList[id]) {
                delete this.diskList[id];
            }
        }
        this.adapter.setForeignState(this.lastSyncID, Date.now(), true);
    }

    onObjectChange(id, obj) {
        if (!this.dbList || !id) {
            return;
        }

        const file = this._scriptId2FileName(id, obj && obj.common && obj.common.engineType);

        if (!obj || !obj.common) {
            if (this.dbList[id]) {
                delete this.dbList[id];
                const folderId = Mirror.getDBFolder(id);
                if (this.dbList[folderId]) {
                    this.updateFolderTime(folderId);
                }

                if (fs.existsSync(file)) {
                    try {
                        this.log.debug('Delete ' + file + ' on disk');
                        fs.unlinkSync(file);
                    } catch (e) {
                        this.log.error('Cannot delete ' + file + ': ' + e);
                    }
                }
                if (this.diskList[file]) {
                    delete this.diskList[file];
                }
            }
        } else if (obj.type === 'script' && id.startsWith('script.js.')) {
            if (this.dbList[id]) {
                const folderDirParts = file.split(/[\\/]/);
                folderDirParts.pop();
                Mirror.createRecursiveDir(folderDirParts.join('/'));

                if (this.dbList[id].common.source !== obj.common.source) {
                    this.dbList[id] = obj;
                    this.log.debug('Update ' + file + ' on disk');
                    fs.writeFileSync(file, obj.common.source);
                    this.diskList[file] = {ts: Date.now(), source: obj.common.source};
                } else if (!this.diskList[id] || this.diskList[id].source !== obj.common.source) {
                    this.log.debug('Update ' + file + ' on disk');
                    fs.writeFileSync(file, obj.common.source);
                    this.diskList[id] = {ts: Date.now(), source: obj.common.source, name: file};
                }
            } else {
                // new script
                this.dbList[id] = obj;
                if (!this.diskList[id] || this.diskList[id].source !== obj.common.source) {
                    const folderDirParts = file.split(/[\\/]/);
                    folderDirParts.pop();
                    Mirror.createRecursiveDir(folderDirParts.join('/'));
                    this.log.debug('Create ' + file + ' on disk');
                    fs.writeFileSync(file, obj.common.source);
                    this.diskList[id] = {ts: Date.now(), source: obj.common.source, name: file};
                }
            }
            this.dbList[id].ts = Date.now();
        }

        this.adapter.setForeignState(this.lastSyncID, Date.now(), true);
    }

    scanDisk(dirPath, list) {
        dirPath = dirPath || this.diskRoot;
        list = list || {};
        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath);
            files.forEach(file => {
                const fullName = path.join(dirPath, file);
                const stats = fs.statSync(fullName);
                if (stats.isDirectory()) {
                    this.scanDisk(fullName.replace(/\\/g, '/'), list);
                } else if (file.match(/\.js$|\.ts$/)) {
                    let f = fullName.replace(/[\\/]/g, '.');
                    f = 'script.js.' + f.substring(this.diskRoot.length + 1).replace(/\.js$|\.ts$/g, '');
                    list[f] = {ts: Math.round(stats.mtime), source: fs.readFileSync(fullName).toString(), name: fullName};
                }
            });
        }
        return list;
    }

    _checkIfAllFoldersAreExist(id, list) {
        const parts = id.split('.');
        for (let i = parts.length - 1; i >= 2; i--) {
            parts.pop();
            const folderId = parts.join('.');
            if (!list[folderId]) {
                const obj = {
                    _id: folderId,
                    common: {
                        name: parts[parts.length - 1]
                    },
                    type: 'channel',
                    native: {}
                };
                list[folderId] = obj;
                this.adapter.setForeignObject(folderId, obj);
            }
        }
    }

    scanDB(cb) {
        this.adapter.objects.getObjectView('system', 'channel', {startkey: 'script.js.', endkey: 'script.js.\u9999'}, (err, res) => {
            // this is not required, because javascript subscribes on ALL objects
            // adapter.subscribeForeignObjects('script.js.*');
            const list = {};
            for (let i = 0; i < res.rows.length; i++) {
                const value = res.rows[i].value;
                if (value && value._id && value.common) {
                    list[res.rows[i].value._id] = res.rows[i].value;
                }
            }
            this.adapter.objects.getObjectView('script', 'javascript', {startkey: 'script.js.', endkey: 'script.js.\u9999'}, (err, res) => {
                for (let i = 0; i < res.rows.length; i++) {
                    const value = res.rows[i].value;
                    if (value && value._id && value.common) {
                        list[res.rows[i].value._id] = res.rows[i].value;
                        // ensure that every script has a folder and if not then create it
                        this._checkIfAllFoldersAreExist(res.rows[i].value._id, list);
                    }
                }
                cb && cb(list);
            });
        });
    }
}

module.exports = Mirror;
