"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const nodeFS = __importStar(require("node:fs"));
const node_path_1 = require("node:path");
class ProtectFs {
    log;
    ioBrokerDataDir;
    promises;
    constants;
    static log = null;
    static staticIoBrokerDataDir = '';
    constructor(log, ioBrokerDataDir) {
        this.ioBrokerDataDir = ioBrokerDataDir;
        ProtectFs.staticIoBrokerDataDir = ioBrokerDataDir;
        this.log = log || {
            silly: (message) => console.log(message),
            debug: (message) => console.debug(message),
            info: (message) => console.info(message),
            warn: (message) => console.warn(message),
            error: (message) => console.error(message),
            level: 'info',
        };
        ProtectFs.log = this.log;
        this.promises = {
            access: async (path, mode) => {
                ProtectFs.checkProtected(path, true);
                return nodeFS.promises.access(path, mode);
            },
            cp: async (source, destination, opts) => {
                ProtectFs.checkProtected(source, false);
                ProtectFs.checkProtected(destination, false);
                return nodeFS.promises.cp(source, destination, opts);
            },
            readFile: async (path, options) => {
                ProtectFs.checkProtected(path, true);
                return nodeFS.promises.readFile(path, options); // async function readFile(path, options) {
            },
            readlink: async (path, options) => {
                ProtectFs.checkProtected(path, true);
                return nodeFS.promises.readlink(path, options); // async function readlink(path, options) {
            },
            symlink: async (target, path, type) => {
                ProtectFs.checkProtected(target, true);
                ProtectFs.checkProtected(path, false);
                return nodeFS.promises.symlink(target, path, type); // async function symlink(target, path, type_) {
            },
            writeFile: async (file, data, options) => {
                ProtectFs.checkProtected(file, true);
                return nodeFS.promises.writeFile.call(this, file, data, options); // async function writeFile(path, data, options) {
            },
            unlink: async (path) => {
                ProtectFs.checkProtected(path, false);
                return nodeFS.promises.unlink.call(this, path); // async function unlink(path) {
            },
            appendFile: async (path, data, options) => {
                ProtectFs.checkProtected(path, false);
                return nodeFS.promises.appendFile.call(this, path, data, options); // async function appendFile(path, data, options) {
            },
            chmod: async (path, mode) => {
                ProtectFs.checkProtected(path, false);
                return nodeFS.promises.chmod.call(this, path, mode); // async function chmod(path, mode) {
            },
            copyFile: async (src, dest, mode) => {
                ProtectFs.checkProtected(src, false);
                ProtectFs.checkProtected(dest, false);
                return nodeFS.promises.copyFile.call(this, src, dest, mode); // async function copyFile(src, dest, mode) {
            },
            rename: async (oldPath, newPath) => {
                ProtectFs.checkProtected(oldPath, false);
                ProtectFs.checkProtected(newPath, false);
                return nodeFS.promises.rename.call(this, oldPath, newPath); // async function rename(oldPath, newPath) {
            },
            open: async (path, flags, mode) => {
                ProtectFs.checkProtected(path, true);
                return nodeFS.promises.open.call(this, path, flags, mode); // async function open(path, flags, mode) {
            },
            truncate: async (path, len) => {
                ProtectFs.checkProtected(path, false);
                return nodeFS.promises.truncate.call(this, path, len); // async function truncate(path, len = 0) {
            },
            stat: async (path, opts) => {
                ProtectFs.checkProtected(path, true);
                const result = await nodeFS.promises.stat.call(this, path, opts); // async function stat(path, options = { bigint: false }) {
                return result;
            },
            utimes: async (path, atime, mtime) => {
                ProtectFs.checkProtected(path, false);
                return nodeFS.promises.utimes.call(this, path, atime, mtime); // async function utimes(path, atime, mtime) {
            },
            readdir: async (path, options) => {
                ProtectFs.checkProtected(path, true);
                // @ts-expect-error fix later
                return nodeFS.promises.readdir.call(this, path, options || { encoding: null, withFileTypes: true }); // async function readdir(path, options) {
            },
            lchmod: async (path, mode) => {
                ProtectFs.checkProtected(path, false);
                return nodeFS.promises.lchmod.call(this, path, mode); // async function lchmod(path, mode) {
            },
            lchown: async (path, uid, gid) => {
                ProtectFs.checkProtected(path, false);
                return nodeFS.promises.lchown.call(this, path, uid, gid); // async function lchown(path, uid, gid) {
            },
            link: async (existingPath, newPath) => {
                ProtectFs.checkProtected(existingPath, false);
                ProtectFs.checkProtected(newPath, false);
                return nodeFS.promises.link.call(this, existingPath, newPath); // async function link(existingPath, newPath) {
            },
            lstat: async (path, opts) => {
                ProtectFs.checkProtected(path, true);
                const res = await nodeFS.promises.lstat.call(this, path, opts); // async function lstat(path, options = { bigint: false }) {
                return res;
            },
            lutimes: async (path, atime, mtime) => {
                ProtectFs.checkProtected(path, false);
                return nodeFS.promises.lutimes.call(this, path, atime, mtime); // async function lutimes(path, atime, mtime) {
            },
            mkdir: async (path, options) => {
                ProtectFs.checkProtected(path, false);
                return nodeFS.promises.mkdir.call(this, path, options); // async function mkdir(path, options) {
            },
            mkdtemp: async (prefix, options) => {
                ProtectFs.checkProtected(prefix, false);
                const tmp = await nodeFS.promises.mkdtemp.call(this, prefix, options); // async function mkdtemp(prefix, options) {
                return tmp.toString();
            },
            rm: async (path, options) => {
                ProtectFs.checkProtected(path, false);
                return nodeFS.promises.rm.call(this, path, options); // async function rm(path, options) {
            },
            rmdir: async (path, options) => {
                ProtectFs.checkProtected(path, false);
                return nodeFS.promises.rmdir.call(this, path, options); // async function rmdir(path, options) {
            },
        };
        // Add missing constants
        this.constants = nodeFS.constants;
        // Add missing functions
        for (const m in nodeFS) {
            if (typeof nodeFS[m] === 'function' &&
                Object.hasOwn(nodeFS, m) &&
                !Object.hasOwn(Object.getPrototypeOf(this), 'appendFile')) {
                // console.debug(`Missing function in ProtectFS: ${m} - adding from node:fs`);
                // @ts-expect-error Elsewise we must implement EVERY function in fs
                this[m] = nodeFS[m];
            }
        }
        for (const m in nodeFS.promises) {
            if (typeof nodeFS.promises[m] === 'function' &&
                Object.hasOwn(nodeFS.promises, m) &&
                !Object.hasOwn(this.promises, m)) {
                // console.debug(`Missing function in ProtectFS: ${m} - adding from node:fs/promises`);
                // @ts-expect-error Elsewise we must implement EVERY function in fs
                this.promises[m] = nodeFS.promises[m];
            }
        }
    }
    static checkProtected(file, readOnly) {
        if (file.fd) {
            return;
        }
        const filePath = (0, node_path_1.normalize)(file.toString());
        if (filePath.endsWith(`-data${node_path_1.sep}objects.json`) || filePath.endsWith(`-data${node_path_1.sep}objects.jsonl`)) {
            ProtectFs.log?.error(`May not read ${file.toString()}`);
            throw new Error('Permission denied');
        }
        if (!readOnly && filePath.startsWith((0, node_path_1.join)(ProtectFs.staticIoBrokerDataDir, 'files'))) {
            ProtectFs.log?.error(`May not read ${file.toString()} - use writeFile instead`);
            throw new Error('Permission denied');
        }
        if (!readOnly && filePath.startsWith(`file://${(0, node_path_1.join)(ProtectFs.staticIoBrokerDataDir, 'files')}`)) {
            ProtectFs.log?.error(`May not read ${file.toString()} - use writeFile instead`);
            throw new Error('Permission denied');
        }
    }
    access(path, mode, callback) {
        ProtectFs.checkProtected(path, true);
        if (typeof callback === 'function') {
            return nodeFS.access(path, mode, callback);
        }
        return nodeFS.access(path, mode);
    }
    accessSync(path, mode) {
        ProtectFs.checkProtected(path, true);
        return nodeFS.accessSync(path, mode);
    }
    cp(source, destination, opts, callback) {
        ProtectFs.checkProtected(source, false);
        ProtectFs.checkProtected(destination, false);
        if (callback) {
            return nodeFS.cp(source, destination, opts, callback);
        }
        if (typeof opts === 'function') {
            return nodeFS.cp(source, destination, opts);
        }
        return nodeFS.cp(source, destination, opts);
    }
    cpSync(source, destination, opts) {
        ProtectFs.checkProtected(source, false);
        ProtectFs.checkProtected(destination, false);
        return nodeFS.cpSync.call(this, source, destination, opts);
    }
    readFile(path, options, callback) {
        if (typeof path !== 'number') {
            ProtectFs.checkProtected(path, true);
        }
        if (typeof callback === 'function') {
            return nodeFS.readFile.call(this, path, options, 
            // @ts-expect-error readFile can accept 3 arguments too
            callback);
        }
        return nodeFS.readFile.call(this, path, options);
    }
    readFileSync(path, options) {
        if (typeof path !== 'number') {
            ProtectFs.checkProtected(path, true);
        }
        return nodeFS.readFileSync.call(this, path, options);
    }
    readlink(path, options, callback) {
        ProtectFs.checkProtected(path, true);
        if (typeof callback === 'function') {
            // @ts-expect-error should work
            return nodeFS.readlink.call(this, path, options, callback); //
        }
        return nodeFS.readlink.call(this, path, options);
    }
    readlinkSync(path, options) {
        ProtectFs.checkProtected(path, true);
        return nodeFS.readlinkSync.call(this, path, options);
    }
    symlink(target, path, type, callback) {
        ProtectFs.checkProtected(target, true);
        ProtectFs.checkProtected(path, false);
        if (typeof callback === 'function') {
            // @ts-expect-error should work
            return nodeFS.symlink.call(this, target, path, type, callback);
        }
        return nodeFS.symlink.call(this, target, path, type);
    }
    symlinkSync(target, path, type) {
        ProtectFs.checkProtected(target, true);
        ProtectFs.checkProtected(path, false);
        return nodeFS.symlinkSync.call(this, target, path, type);
    }
    writeFile(file, data, options, callback) {
        if (typeof file !== 'number') {
            ProtectFs.checkProtected(file, false);
        }
        if (typeof callback === 'function') {
            // @ts-expect-error should work
            return nodeFS.writeFile.call(this, file, data, options, callback);
        }
        return nodeFS.writeFile.call(this, file, data, options);
    }
    writeFileSync(file, data, options) {
        if (typeof file !== 'number') {
            ProtectFs.checkProtected(file, false);
        }
        return nodeFS.writeFileSync.call(this, file, data, options);
    }
    unlink(path, callback) {
        ProtectFs.checkProtected(path, false);
        return nodeFS.unlink.call(this, path, callback || ((_err) => { }));
    }
    unlinkSync(path) {
        ProtectFs.checkProtected(path, false);
        return nodeFS.unlinkSync.call(this, path);
    }
    appendFile(file, data, options, callback) {
        if (typeof file !== 'number') {
            ProtectFs.checkProtected(file, false);
        }
        if (typeof callback === 'function') {
            // @ts-expect-error should work
            return nodeFS.appendFile.call(this, file, data, options, callback);
        }
        return nodeFS.appendFile.call(this, file, data, options);
    }
    appendFileSync(file, data, options) {
        if (typeof file !== 'number') {
            ProtectFs.checkProtected(file, false);
        }
        return nodeFS.appendFileSync.call(this, file, data, options);
    }
    chmod(path, mode, callback) {
        ProtectFs.checkProtected(path, false);
        return nodeFS.chmod.call(this, path, mode, callback || ((_err) => { }));
    }
    chmodSync(path, mode) {
        ProtectFs.checkProtected(path, false);
        return nodeFS.chmodSync.call(this, path, mode);
    }
    chown(path, uid, gid, callback) {
        ProtectFs.checkProtected(path, false);
        return nodeFS.chown.call(this, path, uid, gid, callback || ((_err) => { }));
    }
    chownSync(path, uid, gid) {
        ProtectFs.checkProtected(path, false);
        return nodeFS.chownSync.call(this, path, uid, gid);
    }
    copyFile(src, dest, mode, callback) {
        ProtectFs.checkProtected(src, true);
        ProtectFs.checkProtected(dest, false);
        // @ts-expect-error should work
        return nodeFS.copyFile.call(this, src, dest, mode, callback);
    }
    copyFileSync(src, dest, mode) {
        ProtectFs.checkProtected(src, true);
        ProtectFs.checkProtected(dest, false);
        return nodeFS.copyFileSync.call(this, src, dest, mode);
    }
    rename(oldPath, newPath, callback) {
        ProtectFs.checkProtected(oldPath, false);
        ProtectFs.checkProtected(newPath, false);
        return nodeFS.rename.call(this, oldPath, newPath, callback || ((_err) => { }));
    }
    renameSync(oldPath, newPath) {
        ProtectFs.checkProtected(oldPath, false);
        ProtectFs.checkProtected(newPath, false);
        return nodeFS.renameSync.call(this, oldPath, newPath);
    }
    open(path, callback) {
        ProtectFs.checkProtected(path, true);
        return nodeFS.open.call(this, path, callback);
    }
    openSync(path, flags, mode) {
        ProtectFs.checkProtected(path, true);
        return nodeFS.openSync.call(this, path, flags, mode);
    }
    truncate(path, callback) {
        ProtectFs.checkProtected(path, false);
        return nodeFS.truncate.call(this, path, callback || ((_err) => { }));
    }
    truncateSync(path) {
        ProtectFs.checkProtected(path, false);
        return nodeFS.truncateSync.call(this, path);
    }
    exists(path, callback) {
        ProtectFs.checkProtected(path, true);
        return nodeFS.exists.call(this, path, callback);
    }
    existsSync(path) {
        ProtectFs.checkProtected(path, true);
        return nodeFS.existsSync.call(this, path);
    }
    stat(path, options, callback) {
        ProtectFs.checkProtected(path, true);
        if (typeof callback === 'function') {
            // @ts-expect-error should work
            return nodeFS.stat.call(this, path, options, callback);
        }
        // @ts-expect-error should work
        return nodeFS.stat.call(this, path, options);
    }
    statSync(path, options) {
        ProtectFs.checkProtected(path, true);
        return nodeFS.statSync.call(this, path, options);
    }
    utimes(path, atime, mtime, callback) {
        ProtectFs.checkProtected(path, false);
        return nodeFS.utimes.call(this, path, atime, mtime, callback || ((_err) => { }));
    }
    utimesSync(path, atime, mtime) {
        ProtectFs.checkProtected(path, false);
        return nodeFS.utimesSync.call(this, path, atime, mtime);
    }
    readdir(path, options, callback) {
        ProtectFs.checkProtected(path, true);
        if (typeof callback === 'function') {
            return nodeFS.readdir.call(this, path, options, callback);
        }
        // @ts-expect-error should work
        return nodeFS.readdir.call(this, path, options);
    }
    readdirSync(path, options) {
        ProtectFs.checkProtected(path, true);
        // @ts-expect-error should work
        return nodeFS.readdirSync.call(this, path, options);
    }
    createReadStream(path, options) {
        ProtectFs.checkProtected(path, true);
        return nodeFS.createReadStream.call(this, path, options);
    }
    createWriteStream(path, options) {
        ProtectFs.checkProtected(path, false);
        return nodeFS.createWriteStream.call(this, path, options);
    }
    lchmod(path, mode, callback) {
        ProtectFs.checkProtected(path, false);
        return nodeFS.lchmod.call(this, path, mode, callback || ((_err) => { }));
    }
    lchmodSync(path, mode) {
        ProtectFs.checkProtected(path, false);
        return nodeFS.lchmodSync.call(this, path, mode);
    }
    lchown(path, uid, gid, callback) {
        ProtectFs.checkProtected(path, false);
        return nodeFS.lchown.call(this, path, uid, gid, callback || ((_err) => { }));
    }
    lchownSync(path, uid, gid) {
        ProtectFs.checkProtected(path, false);
        return nodeFS.lchownSync.call(this, path, uid, gid);
    }
    link(existingPath, newPath, callback) {
        ProtectFs.checkProtected(existingPath, false);
        ProtectFs.checkProtected(newPath, false);
        return nodeFS.link.call(this, existingPath, newPath, callback || ((_err) => { }));
    }
    linkSync(existingPath, newPath) {
        ProtectFs.checkProtected(existingPath, false);
        ProtectFs.checkProtected(newPath, false);
        return nodeFS.linkSync.call(this, existingPath, newPath);
    }
    lstat(path, options, callback) {
        ProtectFs.checkProtected(path, true);
        if (typeof callback === 'function') {
            // @ts-expect-error should work
            return nodeFS.lstat.call(this, path, options, callback);
        }
        // @ts-expect-error should work
        return nodeFS.lstat.call(this, path, options);
    }
    lstatSync(path, options) {
        ProtectFs.checkProtected(path, true);
        return nodeFS.lstatSync.call(this, path, options);
    }
    lutimes(path, atime, mtime, callback) {
        ProtectFs.checkProtected(path, false);
        return nodeFS.lutimes.call(this, path, atime, mtime, callback || ((_err) => { }));
    }
    lutimesSync(path, atime, mtime) {
        ProtectFs.checkProtected(path, false);
        return nodeFS.lutimesSync.call(this, path, atime, mtime);
    }
    mkdir(path, options, callback) {
        ProtectFs.checkProtected(path, false);
        if (typeof callback === 'function') {
            // @ts-expect-error should work
            return nodeFS.mkdir.call(this, path, options, callback);
        }
        return nodeFS.mkdir.call(this, path, options);
    }
    mkdirSync(path, options) {
        ProtectFs.checkProtected(path, false);
        return nodeFS.mkdirSync.call(this, path, options);
    }
    mkdtemp(prefix, options, callback) {
        ProtectFs.checkProtected(prefix, false);
        if (typeof callback === 'function') {
            // @ts-expect-error should work
            return nodeFS.mkdtemp.call(this, prefix, options, callback);
        }
        return nodeFS.mkdtemp.call(this, prefix, options);
    }
    mkdtempSync(prefix, options) {
        ProtectFs.checkProtected(prefix, false);
        return nodeFS.mkdtempSync.call(this, prefix, options);
    }
    rm(path, options, callback) {
        ProtectFs.checkProtected(path, false);
        if (typeof callback === 'function') {
            return nodeFS.rm.call(this, path, options, callback);
        }
        // @ts-expect-error should work
        return nodeFS.rm.call(this, path, options);
    }
    rmSync(path, options) {
        ProtectFs.checkProtected(path, false);
        return nodeFS.rmSync.call(this, path, options);
    }
    rmdir(path, options, callback) {
        ProtectFs.checkProtected(path, false);
        if (typeof callback === 'function') {
            return nodeFS.rmdir.call(this, path, options, callback);
        }
        // @ts-expect-error should work
        return nodeFS.rmdir.call(this, path, options);
    }
    rmdirSync(path, options) {
        ProtectFs.checkProtected(path, false);
        return nodeFS.rmdirSync.call(this, path, options);
    }
    watch(filename, options, listener) {
        ProtectFs.checkProtected(filename, true);
        if (typeof listener === 'function') {
            // @ts-expect-error should work
            return nodeFS.watch.call(this, filename, options, listener);
        }
        return nodeFS.watch.call(this, filename, options);
    }
    watchFile(filename, listener) {
        ProtectFs.checkProtected(filename, true);
        return nodeFS.watchFile.call(this, filename, listener);
    }
    unwatchFile(filename, listener) {
        ProtectFs.checkProtected(filename, true);
        return nodeFS.unwatchFile.call(this, filename, listener);
    }
}
exports.default = ProtectFs;
//# sourceMappingURL=protectFs.js.map