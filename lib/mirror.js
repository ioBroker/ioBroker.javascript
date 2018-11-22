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

        this.adapter = options.adapter;
        this.diskRoot = path.normalize(options.diskRoot).replace(/\\/g, '/');

        if (!fs.existsSync(this.diskRoot)) {
            try {
                fs.mkdirSync(this.diskRoot);
            } catch (e) {
                this.log.error(`Cannot create directory ${this.diskRoot}: ${e}`);
                return;
            }
        }

        this.log = options.log || {
            debug: function (text) {console.log(text);},
            info: function (text) {console.log(text);},
            log: function (text) {console.log(text);},
            warn: function (text) {console.warn(text);},
            error: function (text) {console.error(text);},
            silly: function (text) {console.log(text);}
        };

        this.diskList = this.scanDisk();
        this.scanDB(list => {
            this.dbList = list;
            this.sync();

            fs.watch(this.diskRoot, (eventType, filename) => {
                console.log('File ' + filename + ' ' + eventType);
                this.onFileChange(eventType, filename);
            });
        });

    }

    static getDBFolder(id) {
        const parts = id.split('.');
        parts.pop();
        return parts.join('.');
    }

    updateFolderTime(id) {
        this.dbList[id].ts = Date.now();
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

    static createRecursiveDir(dirDisk) {
        const parts = dirDisk.replace(/\\/g, '/').split('/');
        let path = '';
        for (let i = 0; i < parts.length; i++) {
            path += (path ? '/' : '') + parts[i];
            if (!fs.existsSync(path)) {
                fs.mkdirSync(path);
            }
        }
    }

    _getFilesInPath(pathDisk) {
        pathDisk = pathDisk.substring(this.diskRoot.length + 1);
        const id = pathDisk.replace(/\./g, '\\.').replace(/[\/\\]/g, '\.');
        const reg = new RegExp('script\.js' + (id ? '.' + id : '') + '\.[^.]+$');
        return Object.keys(this.diskList).filter(file => reg.test(file)).map(id => id.split('.').pop())
    }
    _getObjectsInPath(pathDB) {
        const reg = new RegExp(pathDB.replace(/\./g, '\\.') + '\\.[^.]+$');
        return Object.keys(this.dbList).filter(id => reg.test(id)).map(id => id.split('.').pop())
    }

    sync(pathDisk, pathDB) {
        pathDisk = pathDisk || [];
        pathDB = pathDB || [];
        const dirDisk = this._getDiskPath(pathDisk);
        const dirDB = Mirror._getDbPath(pathDB);
        const files = this._getFilesInPath(dirDisk);
        const objects = this._getObjectsInPath(dirDB);

        for (let o = objects.length - 1; o >= 0; o--) {
            if (this.dbList[dirDB + '.' + objects[o]].type === 'channel') {
                const nextPathDisk = JSON.parse(JSON.stringify(pathDisk));
                nextPathDisk.push(objects[o]);
                const nextPathDB = JSON.parse(JSON.stringify(pathDB));
                nextPathDB.push(objects[o]);
                return this.sync(nextPathDisk, nextPathDB);
            } else {
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
                        } else if (this.dbList[id].ts &&
                                (this.dbList[id].ts < this.diskList[id].ts &&
                                    this.diskList[id].ts - this.dbList[id].ts > 2000)) {
                            this.dbList[id].common.source = this.diskList[id].source;
                            this.dbList[id].ts = this.diskList[id].ts;
                            this.log.debug('Update DB with ' + id);
                            this.adapter.setForeignObject(id, this.dbList[id]);
                        }
                        files.splice(f, 1);
                        objects.splice(o, 1);
                    }
                }
            }
        }
        // go through objects, that does not exist on disk
        for (let o = objects.length - 1; o >= 0; o--) {
            const fileName = this._scriptId2FileName(dirDB + '.' + objects[o], this.dbList[dirDB + '.' + objects[o]].common.engineType);
            this.log.info('Created script file on disk ' + fileName);
            Mirror.createRecursiveDir(dirDisk);
            const f = 'script.js.' + fileName.substring(this.diskRoot.length).replace(/[\\\/]g/, '.').replace(/\.js$|\.ts$/g, '');
            this.diskList[f] = {name: fileName, source: this.dbList[dirDB + '.' + objects[o]].common.source, ts: Date.now()};
            fs.writeFileSync(fileName, this.dbList[dirDB + '.' + objects[o]].common.source);
        }

        // go through files, that does not exist in DB
        for (let f = files.length - 1; f >= 0; f--) {
            this.log.warn('Please delete file ' + path.join(dirDisk, files[f]) + ' or create according script in ioBroker');
        }
    }

    _scriptId2FileName(id, type) {
        id = id.substring('script.js.'.length);
        const parts = id.split('.');
        return path.join(this.diskRoot, parts.join('/')).replace(/\\/g, '/') + (type === 'TypeScript/ts' ? '.ts' : '.js');
    }
    _fileName2scriptId(file) {
        file = file.substring(this.diskRoot.length).replace(/\.js$/g, '').replace(/\.ts$/g, '');
        const parts = file.replace(/\\/g, '/').split('/');
        if (!parts[0] && parts.length) {
            parts.shift();
        }

        return 'script.js.' + parts.join('.');
    }

    onFileChange(event, file) {
        if (!file.match(/\.ts$|\.js$/)) return;
        const id = this._fileName2scriptId(file);

        if (event === 'change' || event === 'create') {
            const stats = fs.statSync(file);
            const source = fs.readFileSync(file).toString();
            this.diskList[file] = {ts: stats.atime, source};

            if (this.dbList[id]) {
                if (this.dbList[id].common.source !== source) {
                    this.dbList[id].common.source = source;
                    this.dbList[id].ts = stats.atime;
                    this.adapter.setForeignObject(id, this.dbList[id]);
                } else {
                    this.dbList[id].ts = stats.atime;
                }
            } else {
                const parts = id.split('.');
                // new script
                this.dbList[id] = {
                    _id: id,
                    common: {
                        name: parts.pop(),
                        engineType: 'Javascript/js',
                        source,
                        enabled: false,
                        engine: 'system.adapter.javascript.0',
                        debug: false,
                        verbose: false
                    },
                    type: 'script',
                    native: {},
                    ts: stats.atime
                };
                this.adapter.setForeignObject(id, this.dbList[id]);
            }
        } else if (event === 'delete' || event === 'rename') {
            if (this.dbList[id]) {
                delete this.dbList[id];
                this.adapter.delForeignObject(id);
            }
            if (this.diskList[file]) {
                delete this.diskList[file];
            }
        }
    }

    onObjectChange(id, obj) {
        if (!this.dbList || !id) {
            return;
        }
        const file = this._scriptId2FileName(id);
        if (!obj || !obj.common) {
            if (this.dbList[id]) {
                delete this.dbList[id];
                const folderId = Mirror.getDBFolder(id);
                if (this.dbList[folderId]) {
                    this.updateFolderTime(folderId);
                }

                if (fs.existsSync(file)) {
                    try {
                        fs.unlinkSync(file);
                    } catch (e) {
                        this.log.error('Cannot delete ' + file + ': ' + e);
                    }
                }
                if (this.diskList[file]) {
                    delete this.diskList[file];
                }
            }
        } else {
            if (this.dbList[id]) {
                const folderDirParts = file.split(/[\\\/]/);
                folderDirParts.pop();
                Mirror.createRecursiveDir(folderDirParts.join('/'));

                if (this.dbList[id].common.source !== obj.common.source) {
                    this.dbList[id] = obj;
                    fs.writeFileSync(file, obj.common.source);
                    this.diskList[file] = {ts: Date.now(), source: obj.common.source};
                } else if (!this.diskList[id] || this.diskList[id].source !== obj.common.source) {
                    fs.writeFileSync(file, obj.common.source);
                    this.diskList[id] = {ts: Date.now(), source: obj.common.source, name: file};
                }
            } else {
                // new script
                this.dbList[id] = obj;
                if (!this.diskList[id] || this.diskList[id].source !== obj.common.source) {
                    const folderDirParts = file.split(/[\\\/]/);
                    folderDirParts.pop();
                    Mirror.createRecursiveDir(folderDirParts.join('/'));

                    fs.writeFileSync(file, obj.common.source);
                    this.diskList[id] = {ts: Date.now(), source: obj.common.source, name: file};
                }
            }
            this.dbList[id].ts = Date.now();
        }
    }

    scanDisk(dirPath, list) {
        dirPath = dirPath || this.diskRoot;
        list = list || {};
        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath);
            files.forEach(file => {
                let fullName = path.join(dirPath, file);
                const stats = fs.statSync(fullName);
                if (stats.isDirectory()) {
                    this.scanDisk(fullName.replace(/\\/g, '/'), list);
                } else if (file.match(/\.js$|\.ts$/)) {
                    let f = fullName.replace(/[\\\/]/g, '.');
                    f = 'script.js.' + f.substring(this.diskRoot.length + 1).replace(/\.js$|\.ts$/g, '');
                    list[f] = {ts: Math.round(stats.atime), source: fs.readFileSync(fullName).toString(), name: fullName};
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
                this.adapter.setForeignState(folderId, obj);
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
