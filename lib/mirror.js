'use strict';
const fs = require('fs');
const path = require(path);

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

    getFolder(id) {
        const parts = id.split('.');
        parts.pop();
        return parts.join('.');
    }

    updateFolderTime(id) {
        this.dbList[id].ts = Date.now();
        this.adapter.setForeignObject(id, this.dbList[id]);
    }

    _getDiskPath(pathDisk) {
        return path.join(this.diskRoot, pathDisk.join('/'));
    }
    _getDbPath(pathDB) {
        return 'script.js.' + pathDB.join('.');
    }

    createRecursiveDir(dirDisk) {
        const parts = dirDisk.replace(/\\/g, '/').split('/');
        let path = '';
        for (let i = 0; i < parts.length; i++) {
            path += (path ? '/' : '') + parts[i];
            if (!fs.existsSync(path)) {
                fs.mkdirSync(path);
            }
        }
    }


    sync(pathDisk, pathDB) {
        pathDisk = pathDisk || [];
        pathDB = pathDB || [];
        const dirDisk = this._getDiskPath(pathDisk);
        const dirDB = this._getDbPath(pathDB);
        const files = this._getFilesInPath(dirDisk);
        const objects = this._getObjectsInPath(dirDB);

        for (let f = files.length - 1; f >= 0; f--) {
            for (let o = objects.length; o >= 0; o--) {
                if (objects[o] === files[f]) {
                    const id = dirDB + '.' + objects[o];
                    if (!this.dbList[id].ts || (this.dbList[id].ts > this.diskList[files[f]].ts && this.dbList[id] - this.diskList[files[f]] > 2000)) {
                        // copy text to file
                        this.dbList[id].ts = Date.now();
                        fs.writeFileSync(path.join(dirDisk, files[f]), this.dbList[dirDB + '.' + objects[o]].common.source);
                    } else if (this.dbList[id].ts && (this.dbList[id].ts < this.diskList[files[f]].ts && this.diskList[files[f]] - this.dbList[id] > 2000)) {
                        this.dbList[id].common.source = this.diskList[files[f]].source;
                        this.dbList[id].ts = this.diskList[files[f]].ts;
                        this.adapter.setForeignObject(id, this.dbList[id]);
                    }
                    files.splice(f, 1);
                    objects.splice(o, 1);
                }
            }
        }
        // go through objects, that does not exist on disk
        for (let o = objects.length; o >= 0; o--) {
            const id = dirDB + '.' + objects[o];
            this.createRecursiveDir(dirDisk);
            fs.writeFileSync(this._fileName2scriptId(id), this.dbList[id].common.source);
        }

        // go through files, that does not exist in DB
        for (let f = files.length - 1; f >= 0; f--) {
            this.log('Please delete file ' + path.join(dirDisk, files[f]) + ' or create according script in ioBroker');
        }
    }

    _scriptId2FileName(id) {
        id = id.substring('script.js.'.length);
        const parts = id.split('.');
        return path.join(this.diskRoot, parts.join('/')).replace(/\\/g, '/');
    }
    _fileName2scriptId(file) {
        file = file.substring(this.diskRoot.length);
        const parts = file.replace(/\\/g, '/').split('/');
        if (!parts[0] && parts.length) {
            parts.shift();
        }

        return 'script.js.' + parts.join('.');
    }

    onFileChange(event, file) {
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
        } else if (event === 'delete') {
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
                const folderId = this.getFolder(id);
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
                if (this.dbList[id].common.source !== obj.common.source) {
                    this.dbList[id] = obj;
                    fs.writeFileSync(file, obj.common.source);
                    this.diskList[file] = {ts: Date.now(), source: obj.common.source};
                } else if (!this.diskList[file] || this.diskList[file].source !== obj.common.source) {
                    fs.writeFileSync(file, obj.common.source);
                    this.diskList[file] = {ts: Date.now(), source: obj.common.source};
                }
            } else {
                // new script
                this.dbList[id] = obj;
                if (!this.diskList[file] || this.diskList[file].source !== obj.common.source) {
                    fs.writeFileSync(file, obj.common.source);
                    this.diskList[file] = {ts: Date.now(), source: obj.common.source};
                }
            }
            this.dbList[id].ts = Date.now();
        }
    }

    scanDisk(dirPath, list) {
        dirPath = dirPath || !this.diskRoot;
        list = list || {};
        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath);
            files.forEach(file => {
                let f = path.join(dirPath, file).replace(/\\/g, '/');
                const stats = fs.fstatSync(f);
                if (stats.isDirectory()) {
                    this.scanDisk(f, list);
                } else {
                    f = f.substring(this.diskRoot.length);
                    list[f] = {ts: stats.atime, source: fs.readFileSync(f).toString()};
                }
            });
        }
        return list;
    }

    scanDB(cb) {
        this.adapter.getObjectView('script', 'javascript', {startkey: 'script.js.', endkey: 'script.js.\u9999'}, (err, res) => {
            // this is not required, because javascript subscribes on ALL objects
            // adapter.subscribeForeignObjects('script.js.*');
            const list = {};
            for (let i = 0; i < res.rows.length; i++) {
                const value = res.rows[i].value;
                if (value && value._id && value.common) {
                    list[res.rows[i].value._id] = res.rows[i].value;
                }
            }

            cb && cb(list);
        });
    }
}

module.exports = Mirror;