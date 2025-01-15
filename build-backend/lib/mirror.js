"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mirror = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const MODE_0777 = 511;
class Mirror {
    adapter;
    diskRoot;
    from;
    lastSyncID;
    log;
    watchedFolder = {};
    diskList;
    dbList = {};
    constructor(options) {
        if (!options.adapter) {
            throw new Error('No adapter defined');
        }
        this.adapter = options.adapter;
        this.diskRoot = (0, node_path_1.normalize)(options.diskRoot || '').replace(/\\/g, '/');
        this.from = `system.adapter.${this.adapter.namespace}`;
        this.lastSyncID = `${this.from}.lastSync`;
        this.diskList = {};
        if (options.log) {
            this.log = options.log;
            this.log.log = this.log.log || ((text) => console.log(text));
        }
        else {
            this.log = {
                silly: text => console.log(text),
                debug: text => console.log(text),
                info: text => console.log(text),
                log: text => console.log(text),
                warn: text => console.warn(text),
                error: text => console.error(text),
            };
        }
        if (!options.diskRoot || options.adapter.namespace !== 'javascript.0') {
            // only instance 0 can sync objects
            return;
        }
        if (!(0, node_fs_1.existsSync)(this.diskRoot)) {
            try {
                (0, node_fs_1.mkdirSync)(this.diskRoot);
            }
            catch (err) {
                this.log.error(`Cannot create directory ${this.diskRoot}: ${err}`);
                return;
            }
        }
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
        root_ = root_.endsWith('/') ? root_ : `${root_}/`;
        // ignore all .xxx folders, like ".git", ".idea", so users may not have scripts starting with "."
        try {
            const files = (0, node_fs_1.readdirSync)(root_).filter(name => !name.startsWith('.'));
            files.forEach(file => {
                const name = (0, node_path_1.join)(root_, file).replace(/\\/g, '/');
                const stat = (0, node_fs_1.statSync)(name);
                if (stat.isDirectory()) {
                    this.watchFolders(name);
                }
                else {
                    const lstat = (0, node_fs_1.lstatSync)(name);
                    if (!lstat.isSymbolicLink()) {
                        return;
                    }
                    const linkTarget = (0, node_fs_1.realpathSync)(name);
                    this.log.info(`Watch symlinked file ${name} -> ${linkTarget}`);
                    (0, node_fs_1.watch)(linkTarget, (eventType /*, _filename*/) => {
                        // Pretend the symlink source was changed.
                        this.log.debug(`File ${name} ${eventType}`);
                        this.onFileChange(eventType, name);
                    });
                }
            });
        }
        catch (err) {
            return this.log.warn(`Error while trying to watch folder ${root_}: ${err}`);
        }
        if (!this.watchedFolder[root_]) {
            this.log.info(`Watch ${root_}`);
            try {
                this.watchedFolder[root_] = (0, node_fs_1.watch)(root_, (eventType, fileName) => {
                    this.log.debug(`File ${root_}${fileName} ${eventType}`);
                    this.onFileChange(eventType, root_ + fileName);
                });
            }
            catch (err) {
                this.log.error(`Could not watch folder ${root_}: ${err.message}`);
                this.log.error(`Please check that no other processes change data in the mirror directory!`);
            }
            this.watchedFolder[root_].on('error', () => {
                this.log.debug(`Folder ${root_} was deleted`);
                try {
                    this.watchedFolder[root_] && this.watchedFolder[root_].close();
                }
                catch {
                    // ignore error
                }
                if (this.watchedFolder[root_]) {
                    delete this.watchedFolder[root_];
                }
            });
        }
    }
    checkLastSyncObject(cb) {
        void this.adapter.getForeignObject(this.lastSyncID, (_err, obj) => {
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
                    type: 'state',
                    native: {},
                };
                this.adapter.setForeignObject(this.lastSyncID, obj, () => this.adapter.setForeignState(this.lastSyncID, 0, true, () => cb && cb(0)));
            }
            else {
                void this.adapter.getForeignState(this.lastSyncID, (_err, state) => cb && cb(state?.val));
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
                data = Buffer.from(data.substring(2), 'base64').toString('utf8');
                if (data.startsWith('%3Cxml')) {
                    return true;
                }
            }
        }
        return false;
    }
    static isRules(data) {
        const pos = data.lastIndexOf('\n');
        if (pos !== -1) {
            data = data.substring(pos + 1);
            if (data.startsWith('//{"') && data.endsWith('}')) {
                return true;
            }
        }
        return false;
    }
    static detectType(fileName, data) {
        if (fileName.endsWith('.ts')) {
            return 'TypeScript/ts';
        }
        return Mirror.isBlockly(data) ? 'Blockly' : Mirror.isRules(data) ? 'Rules' : 'JavaScript/js';
    }
    updateFolderTime(id) {
        this.dbList[id].ts = Date.now();
        this.dbList[id].from = this.from;
        this.adapter.setForeignObject(id, this.dbList[id]);
    }
    _getDiskPath(pathDisk) {
        return (0, node_path_1.join)(this.diskRoot, pathDisk.join('/')).replace(/\\/g, '/');
    }
    static _getDbPath(pathDB) {
        if (!pathDB || !pathDB.length) {
            return 'script.js';
        }
        return `script.js.${pathDB.join('.')}`;
    }
    _getFilesInPath(pathDisk) {
        pathDisk = pathDisk.substring(this.diskRoot.length + 1);
        const id = pathDisk.replace(/\./g, '\\.').replace(/[/\\]/g, '\\.');
        const reg = new RegExp(`script\\.js${id ? `.${id}` : ''}\\.[^.]+$`);
        return Object.keys(this.diskList)
            .filter(file => reg.test(file))
            .map(id => id.split('.').pop() || '');
    }
    _getObjectsInPath(pathDB) {
        const reg = new RegExp(`${pathDB.replace(/\./g, '\\.')}\\.[^.]+$`);
        return Object.keys(this.dbList)
            .filter(id => reg.test(id))
            .map(id => id.split('.').pop() || '');
    }
    /**
     * Write file to disk, synchron, catch (and print) error.
     *
     * @param id of script
     * @returns true if write was successful
     */
    _writeFile(id) {
        const diskListEntry = this.diskList[id];
        try {
            //check if the directory exists and create if not:
            (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(diskListEntry.name), { recursive: true, mode: MODE_0777 });
            (0, node_fs_1.writeFileSync)(diskListEntry.name, diskListEntry.source, { mode: MODE_0777 });
            diskListEntry.ts = Date.now();
            return true;
        }
        catch (err) {
            this.log.error(`Cannot write file ${diskListEntry ? diskListEntry.name : id}: ${err}`);
            return false;
        }
    }
    sync(lastSyncTime, pathDisk, pathDB) {
        lastSyncTime = lastSyncTime || 0;
        pathDisk = pathDisk || [];
        pathDB = pathDB || [];
        const dirDisk = this._getDiskPath(pathDisk);
        const dirDB = Mirror._getDbPath(pathDB);
        const files = this._getFilesInPath(dirDisk);
        const objects = this._getObjectsInPath(dirDB);
        for (let o = objects.length - 1; o >= 0; o--) {
            // if folder
            if (this.dbList[`${dirDB}.${objects[o]}`] && this.dbList[`${dirDB}.${objects[o]}`].type === 'channel') {
                // dive into
                const nextPathDisk = JSON.parse(JSON.stringify(pathDisk));
                nextPathDisk.push(objects[o]);
                const nextPathDB = JSON.parse(JSON.stringify(pathDB));
                nextPathDB.push(objects[o]);
                objects.splice(o, 1);
                this.sync(lastSyncTime, nextPathDisk, nextPathDB);
            }
            else {
                // try to find this DB script on disk
                for (let f = files.length - 1; f >= 0; f--) {
                    if (objects[o] === files[f]) {
                        const id = `${dirDB}.${objects[o]}`;
                        if (!this.diskList[id]) {
                            continue;
                        }
                        if (!this.dbList[id].ts ||
                            (this.dbList[id].ts > this.diskList[id].ts &&
                                this.dbList[id].ts - this.diskList[id].ts > 2000)) {
                            // copy text to file
                            this.dbList[id].ts = Date.now();
                            this.diskList[id].source = this.dbList[id].common.source;
                            this.log.debug(`Update disk with ${this.diskList[id].name}`);
                            this._writeFile(id);
                        }
                        else if (this.dbList[id].ts && this.diskList[id].ts - this.dbList[id].ts > 2000) {
                            // copy file to DB
                            this.dbList[id].common.source = this.diskList[id].source;
                            this.dbList[id].ts = this.diskList[id].ts;
                            this.dbList[id].from = this.from;
                            this.log.debug(`Update DB with ${id}`);
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
            const fileName = this._scriptId2FileName(`${dirDB}.${objects[o]}`, this.dbList[`${dirDB}.${objects[o]}`].common.engineType);
            this.log.info(`Created script file on disk ${fileName}`);
            const f = `script.js.${fileName
                .substring(this.diskRoot.length)
                .replace(/[\\/]/g, '.')
                .replace(/\.js$|\.ts$/g, '')}`;
            this.diskList[f] = { name: fileName, source: this.dbList[`${dirDB}.${objects[o]}`].common.source, ts: 0 };
            this._writeFile(f);
        }
        // go through files, that does not exist in DB
        for (let f = files.length - 1; f >= 0; f--) {
            // read creation time
            const id = `${dirDB}.${files[f]}`;
            if (this.diskList[id] && this.diskList[id].ts > lastSyncTime) {
                // The file was created after last sync. So create it in DB too
                this.dbList[id] = {
                    _id: id,
                    common: {
                        name: files[f],
                        enabled: false,
                        source: this.diskList[id].source,
                        engine: `system.adapter.${this.adapter.namespace}`,
                        engineType: Mirror.detectType(this.diskList[id].name, this.diskList[id].source),
                        debug: false,
                        verbose: false,
                    },
                    type: 'script',
                    ts: this.diskList[id].ts,
                    native: {},
                };
                this.log.debug(`Create script in DB with ${id}`);
                // ensure that every script has a folder and if not, then create it
                this._checkIfAllFoldersAreExist(id, this.dbList);
                this.adapter.setForeignObject(id, this.dbList[id]);
            }
            else {
                this.log.warn(`Please delete file ${(0, node_path_1.join)(dirDisk, files[f])}`);
            }
        }
    }
    _scriptId2FileName(id, type) {
        id = id.substring('script.js.'.length);
        const parts = id.split('.');
        return ((0, node_path_1.join)(this.diskRoot, parts.join('/')).replace(/\\/g, '/') +
            (type && type.toLowerCase() === 'typescript/ts' ? '.ts' : '.js'));
    }
    _fileName2scriptId(file) {
        file = file.substring(this.diskRoot.length).replace(/\.js$/g, '').replace(/\.ts$/g, '');
        const parts = file.replace(/\\/g, '/').split('/');
        if (!parts[0] && parts.length) {
            parts.shift();
        }
        return `script.js.${parts.join('.')}`;
    }
    removeScriptsInFolder(folder) {
        // get all files in this folder
        const folderId = this._fileName2scriptId(folder);
        for (const id in this.dbList) {
            if (Object.prototype.hasOwnProperty.call(this.dbList, id) &&
                (id.startsWith(folderId) || id === folderId.replace(/\.$/, ''))) {
                // delete it
                if (this.dbList[id]) {
                    this.log.debug(`Delete script ${id} in DB`);
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
        const exists = (0, node_fs_1.existsSync)(file);
        if (exists) {
            try {
                stats = (0, node_fs_1.statSync)(file);
            }
            catch (err) {
                this.log.error(`Cannot read file ${file}: ${err}`);
            }
            if (stats?.isDirectory()) {
                file = file.endsWith('/') ? file : `${file}/`;
                if (exists) {
                    !this.watchedFolder[file] && this.watchFolders(file);
                    try {
                        // scan folder anew
                        const files = (0, node_fs_1.readdirSync)(file).filter(name => !name.startsWith('.'));
                        // update all files in this directory
                        files.forEach(f => this.onFileChange('change', (0, node_path_1.join)(file, f).replace(/\\/g, '/')));
                    }
                    catch (err) {
                        this.log.error(`Error while checking files in directory ${file}: ${err}`);
                    }
                }
                else {
                    if (this.watchedFolder[file]) {
                        this.watchedFolder[file].close();
                        delete this.watchedFolder[file];
                    }
                    this.removeScriptsInFolder(file);
                }
                return;
            }
        }
        else if (this.watchedFolder[file]) {
            if (!exists) {
                try {
                    if (this.watchedFolder[file]) {
                        this.watchedFolder[file].close();
                        delete this.watchedFolder[file];
                    }
                }
                catch {
                    // ignore error
                }
                this.removeScriptsInFolder(file);
            }
            return;
        }
        else if (this.watchedFolder[`${file}/`]) {
            if (!exists) {
                file = `${file}/`;
                // delete all files in this folder
                try {
                    if (this.watchedFolder[file]) {
                        this.watchedFolder[file].close();
                        delete this.watchedFolder[file];
                    }
                }
                catch {
                    // ignore error
                }
                this.removeScriptsInFolder(file);
            }
            return;
        }
        if (!file.match(/\.ts$|\.js$/)) {
            return;
        }
        const id = this._fileName2scriptId(file);
        if (exists && (event === 'change' || event === 'create')) {
            try {
                stats = stats || (0, node_fs_1.statSync)(file);
                const source = (0, node_fs_1.readFileSync)(file).toString();
                const ts = stats?.mtime.getTime() || 0;
                this.diskList[id] = { ts, source, name: file };
                if (this.dbList[id]) {
                    if (this.dbList[id].common.source !== source) {
                        this.dbList[id].common.source = source;
                        this.dbList[id].ts = ts;
                        this.log.debug(`Update script ${id} in DB`);
                        this.dbList[id].from = this.from;
                        this.adapter.setForeignObject(id, this.dbList[id]);
                    }
                    else {
                        this.dbList[id].ts = ts;
                    }
                }
                else {
                    this.log.debug(`Create script ${id} in DB`);
                    const parts = id.split('.');
                    // new script
                    this.dbList[id] = {
                        _id: id,
                        common: {
                            name: parts.pop(),
                            engineType: Mirror.detectType(file, source),
                            source,
                            enabled: false,
                            engine: `system.adapter.${this.adapter.namespace}`,
                            debug: false,
                            verbose: false,
                        },
                        type: 'script',
                        native: {},
                        ts: ts,
                    };
                    this._checkIfAllFoldersAreExist(id, this.dbList);
                    this.adapter.setForeignObject(id, this.dbList[id]);
                }
            }
            catch (err) {
                this.log.error(`Cannot read file ${file}: ${err}`);
            }
        }
        else if (event === 'delete' || event === 'rename') {
            // there is a bug: just after creation of a script on disk from ioBroker, "rename" event is generated!
            if (event === 'rename' && this.diskList[id] && Date.now() - this.diskList[id].ts < 200) {
                console.log(`Interval: ${Date.now() - this.diskList[id].ts}`);
                // 'rename' is ignored
                this.log.debug(`Rename event for ${id} is ignored`);
            }
            else {
                if (this.dbList[id]) {
                    this.log.debug(`Delete script ${id} in DB`);
                    delete this.dbList[id];
                    this.adapter.delForeignObject(id);
                }
                if (this.diskList[id]) {
                    delete this.diskList[id];
                }
            }
        }
        this.adapter.setForeignState(this.lastSyncID, Date.now(), true);
    }
    onObjectChange(id, obj) {
        if (!this.dbList || !id) {
            return;
        }
        const file = this._scriptId2FileName(id, obj?.common?.engineType);
        if (!obj || !obj.common) {
            if (this.dbList[id]) {
                delete this.dbList[id];
                const folderId = Mirror.getDBFolder(id);
                if (this.dbList[folderId]) {
                    this.updateFolderTime(folderId);
                }
                if ((0, node_fs_1.existsSync)(file)) {
                    try {
                        this.log.debug(`Delete ${file} on disk`);
                        (0, node_fs_1.unlinkSync)(file);
                    }
                    catch (err) {
                        this.log.error(`Cannot delete ${file}: ${err}`);
                    }
                }
                if (this.diskList[id]) {
                    delete this.diskList[id];
                }
            }
        }
        else if (obj.type === 'script' && id.startsWith('script.js.')) {
            if (this.dbList[id]) {
                if (this.dbList[id].common.source !== obj.common.source) {
                    this.dbList[id] = obj;
                    this.log.debug(`Update ${file} on disk`);
                    this.diskList[id] = { ts: 0, source: obj.common.source, name: file };
                    this._writeFile(id);
                }
                else if (!this.diskList[id] || this.diskList[id].source !== obj.common.source) {
                    this.log.debug(`Update ${file} on disk`);
                    this.diskList[id] = { ts: 0, source: obj.common.source, name: file };
                    this._writeFile(id);
                }
            }
            else {
                // new script
                this.dbList[id] = obj;
                if (!this.diskList[id] || this.diskList[id].source !== obj.common.source) {
                    this.log.debug(`Create ${file} on disk`);
                    this.diskList[id] = { ts: 0, source: obj.common.source, name: file };
                    this._writeFile(id);
                }
            }
            this.dbList[id].ts = Date.now();
        }
        this.adapter.setForeignState(this.lastSyncID, Date.now(), true);
    }
    scanDisk(dirPath, list) {
        dirPath = dirPath || this.diskRoot;
        list = list || {};
        try {
            if (dirPath && !dirPath.startsWith('.') && (0, node_fs_1.existsSync)(dirPath)) {
                const files = (0, node_fs_1.readdirSync)(dirPath).filter(name => !name.startsWith('.'));
                files.forEach(file => {
                    const fullName = (0, node_path_1.join)(dirPath, file);
                    const stats = (0, node_fs_1.statSync)(fullName);
                    if (stats.isDirectory()) {
                        this.scanDisk(fullName.replace(/\\/g, '/'), list);
                    }
                    else if (file.match(/\.js$|\.ts$/)) {
                        const f = this._fileName2scriptId(fullName);
                        list[f] = {
                            ts: stats.mtime.getTime(),
                            source: (0, node_fs_1.readFileSync)(fullName).toString(),
                            name: fullName,
                        };
                    }
                });
            }
        }
        catch (err) {
            this.log.error(`Error while checking files in directory ${dirPath}: ${err}`);
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
                        name: parts[parts.length - 1],
                    },
                    type: 'channel',
                    native: {},
                };
                list[folderId] = obj;
                try {
                    this.adapter.setForeignObject(folderId, obj, err => {
                        if (err) {
                            this.log.warn(`Error while checking script folder ${folderId} for id "${id}": ${err}`);
                        }
                    });
                }
                catch (err) {
                    this.log.warn(`Error while checking script folder ${folderId} for id "${id}": ${err}`);
                }
            }
        }
    }
    scanDB(cb) {
        this.adapter.getObjectView('system', 'channel', { startkey: 'script.js.', endkey: 'script.js.\u9999' }, (err, res) => {
            // this is not required, because JavaScript subscribes on ALL objects
            // adapter.subscribeForeignObjects('script.js.*');
            const list = {};
            if (err) {
                this.log.error(`Error while checking scripts channel from objects database: ${err}`);
            }
            if (res?.rows) {
                for (let i = 0; i < res.rows.length; i++) {
                    const value = res.rows[i].value;
                    if (value?._id && value.common) {
                        list[res.rows[i].value._id] = res.rows[i].value;
                    }
                }
            }
            this.adapter.getObjectView('script', 'javascript', { startkey: 'script.js.', endkey: 'script.js.\u9999' }, (err, res) => {
                if (err) {
                    this.log.error(`Error while checking scripts javascript from objects database: ${err}`);
                }
                if (res?.rows) {
                    for (let i = 0; i < res.rows.length; i++) {
                        const value = res.rows[i].value;
                        if (value?._id && value.common) {
                            list[res.rows[i].value._id] = res.rows[i].value;
                            // ensure that every script has a folder and if not, then create it
                            this._checkIfAllFoldersAreExist(res.rows[i].value._id, list);
                        }
                    }
                }
                if (cb) {
                    cb(list);
                }
            });
        });
    }
}
exports.Mirror = Mirror;
//# sourceMappingURL=mirror.js.map