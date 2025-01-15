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
    constructor(log, ioBrokerDataDir) {
        this.ioBrokerDataDir = ioBrokerDataDir;
        this.log = log || {
            silly: (message) => console.log(message),
            debug: (message) => console.debug(message),
            info: (message) => console.info(message),
            warn: (message) => console.warn(message),
            error: (message) => console.error(message),
            level: 'info',
        };
        this.promises = {
            access: async (path, mode) => {
                this.#checkProtected(path, true);
                return nodeFS.promises.access(path, mode);
            },
            cp: async (source, destination, opts) => {
                this.#checkProtected(source, false);
                this.#checkProtected(destination, false);
                return nodeFS.promises.cp(source, destination, opts);
            },
            readFile: async (path, options) => {
                this.#checkProtected(path, true);
                return nodeFS.promises.readFile(path, options); // async function readFile(path, options) {
            },
            readlink: async (path, options) => {
                this.#checkProtected(path, true);
                return nodeFS.promises.readlink(path, options); // async function readlink(path, options) {
            },
            symlink: async (target, path, type) => {
                this.#checkProtected(target, true);
                this.#checkProtected(path, false);
                return nodeFS.promises.symlink(target, path, type); // async function symlink(target, path, type_) {
            },
            writeFile: async (file, data, options) => {
                this.#checkProtected(file, true);
                return nodeFS.promises.writeFile.call(this, file, data, options); // async function writeFile(path, data, options) {
            },
            unlink: async (path) => {
                this.#checkProtected(path, false);
                return nodeFS.promises.unlink.call(this, path); // async function unlink(path) {
            },
            appendFile: async (path, data, options) => {
                this.#checkProtected(path, false);
                return nodeFS.promises.appendFile.call(this, path, data, options); // async function appendFile(path, data, options) {
            },
            chmod: async (path, mode) => {
                this.#checkProtected(path, false);
                return nodeFS.promises.chmod.call(this, path, mode); // async function chmod(path, mode) {
            },
            copyFile: async (src, dest, mode) => {
                this.#checkProtected(src, false);
                this.#checkProtected(dest, false);
                return nodeFS.promises.copyFile.call(this, src, dest, mode); // async function copyFile(src, dest, mode) {
            },
            rename: async (oldPath, newPath) => {
                this.#checkProtected(oldPath, false);
                this.#checkProtected(newPath, false);
                return nodeFS.promises.rename.call(this, oldPath, newPath); // async function rename(oldPath, newPath) {
            },
            open: async (path, flags, mode) => {
                this.#checkProtected(path, true);
                return nodeFS.promises.open.call(this, path, flags, mode); // async function open(path, flags, mode) {
            },
            truncate: async (path, len) => {
                this.#checkProtected(path, false);
                return nodeFS.promises.truncate.call(this, path, len); // async function truncate(path, len = 0) {
            },
            stat: async (path, opts) => {
                this.#checkProtected(path, true);
                const result = await nodeFS.promises.stat.call(this, path, opts); // async function stat(path, options = { bigint: false }) {
                return result;
            },
            utimes: async (path, atime, mtime) => {
                this.#checkProtected(path, false);
                return nodeFS.promises.utimes.call(this, path, atime, mtime); // async function utimes(path, atime, mtime) {
            },
            readdir: async (path, options) => {
                this.#checkProtected(path, true);
                return nodeFS.promises.readdir.call(this, path, options || { encoding: null, withFileTypes: true }); // async function readdir(path, options) {
            },
            lchmod: async (path, mode) => {
                this.#checkProtected(path, false);
                return nodeFS.promises.lchmod.call(this, path, mode); // async function lchmod(path, mode) {
            },
            lchown: async (path, uid, gid) => {
                this.#checkProtected(path, false);
                return nodeFS.promises.lchown.call(this, path, uid, gid); // async function lchown(path, uid, gid) {
            },
            link: async (existingPath, newPath) => {
                this.#checkProtected(existingPath, false);
                this.#checkProtected(newPath, false);
                return nodeFS.promises.link.call(this, existingPath, newPath); // async function link(existingPath, newPath) {
            },
            lstat: async (path, opts) => {
                this.#checkProtected(path, true);
                const res = await nodeFS.promises.lstat.call(this, path, opts); // async function lstat(path, options = { bigint: false }) {
                return res;
            },
            lutimes: async (path, atime, mtime) => {
                this.#checkProtected(path, false);
                return nodeFS.promises.lutimes.call(this, path, atime, mtime); // async function lutimes(path, atime, mtime) {
            },
            mkdir: async (path, options) => {
                this.#checkProtected(path, false);
                return nodeFS.promises.mkdir.call(this, path, options); // async function mkdir(path, options) {
            },
            mkdtemp: async (prefix, options) => {
                this.#checkProtected(prefix, false);
                const tmp = await nodeFS.promises.mkdtemp.call(this, prefix, options); // async function mkdtemp(prefix, options) {
                return tmp.toString();
            },
            rm: async (path, options) => {
                this.#checkProtected(path, false);
                return nodeFS.promises.rm.call(this, path, options); // async function rm(path, options) {
            },
            rmdir: async (path, options) => {
                this.#checkProtected(path, false);
                return nodeFS.promises.rmdir.call(this, path, options); // async function rmdir(path, options) {
            },
        };
        // Add missing constants
        this.constants = nodeFS.constants;
        // Add missing functions
        for (const m in nodeFS) {
            if (typeof nodeFS[m] === 'function' &&
                Object.hasOwn(nodeFS, m) &&
                !Object.hasOwn(this, m)) {
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
    #checkProtected(file, readOnly) {
        if (file.fd) {
            return;
        }
        const filePath = (0, node_path_1.normalize)(file.toString());
        // todo: protect against file://...
        if (filePath.endsWith(`-data${node_path_1.sep}objects.json`) || filePath.endsWith(`-data${node_path_1.sep}objects.jsonl`)) {
            this.log.error(`May not read ${file.toString()}`);
            throw new Error('Permission denied');
        }
        if (!readOnly && filePath.startsWith((0, node_path_1.join)(this.ioBrokerDataDir, 'files'))) {
            this.log.error(`May not read ${file.toString()} - use ${readOnly ? 'readFile' : 'writeFile'} instead`);
            throw new Error('Permission denied');
        }
    }
    access(path, callback) {
        this.#checkProtected(path, true);
        return nodeFS.access(path, callback);
    }
    accessSync(path, mode) {
        this.#checkProtected(path, true);
        return nodeFS.accessSync(path, mode); // function accessSync(path, mode) {
    }
    cp(source, destination, opts, callback) {
        this.#checkProtected(source, false);
        this.#checkProtected(destination, false);
        if (callback) {
            return nodeFS.cp(source, destination, opts, callback);
        }
        if (typeof opts === 'function') {
            return nodeFS.cp(source, destination, opts);
        }
        return nodeFS.cp(source, destination, opts);
    }
    cpSync(source, destination, opts) {
        this.#checkProtected(source, false);
        this.#checkProtected(destination, false);
        return nodeFS.cpSync.call(this, source, destination, opts); // function cpSync(src, dest, options) {
    }
    readFile(path, callback) {
        if (typeof path !== 'number') {
            this.#checkProtected(path, true);
        }
        return nodeFS.readFile.call(this, path, callback); // function readFile(path, options, callback) {
    }
    readFileSync(path, options) {
        if (typeof path !== 'number') {
            this.#checkProtected(path, true);
        }
        return nodeFS.readFileSync.call(this, path, options); // function readFileSync(path, options) {
    }
    readlink(path, callback) {
        this.#checkProtected(path, true);
        return nodeFS.readlink.call(this, path, callback); // function readlink(path, options, callback) {
    }
    readlinkSync(path, options) {
        this.#checkProtected(path, true);
        return nodeFS.readlinkSync.call(this, path, options); // function readlinkSync(path, options) {
    }
    symlink(target, path, type, callback) {
        this.#checkProtected(target, true);
        this.#checkProtected(path, false);
        if (typeof callback === 'function') {
            // @ts-expect-error should work
            return nodeFS.symlink.call(this, target, path, type, callback);
        }
        return nodeFS.symlink.call(this, target, path, type); // function symlink(target, path, type_, callback_) {
    }
    symlinkSync(target, path, type) {
        this.#checkProtected(target, true);
        this.#checkProtected(path, false);
        return nodeFS.symlinkSync.call(this, target, path, type); // function symlinkSync(target, path, type) {
    }
    writeFile(file, data, options, callback) {
        if (typeof file !== 'number') {
            this.#checkProtected(file, false);
        }
        // @ts-expect-error should work
        return nodeFS.writeFile.call(this, file, data, options, callback); // function writeFile(path, data, options, callback) {
    }
    writeFileSync(file, data, options) {
        if (typeof file !== 'number') {
            this.#checkProtected(file, false);
        }
        return nodeFS.writeFileSync.call(this, file, data, options); // function writeFileSync(path, data, options) {
    }
    unlink(path, callback) {
        this.#checkProtected(path, false);
        return nodeFS.unlink.call(this, path, callback); // function unlink(path, callback) {
    }
    unlinkSync(path) {
        this.#checkProtected(path, false);
        return nodeFS.unlinkSync.call(this, path); // function unlinkSync(path) {
    }
    appendFile(file, data, callback) {
        if (typeof file !== 'number') {
            this.#checkProtected(file, false);
        }
        return nodeFS.appendFile.call(this, file, data, callback); // function appendFile(path, data, options, callback) {
    }
    appendFileSync(file, data) {
        if (typeof file !== 'number') {
            this.#checkProtected(file, false);
        }
        return nodeFS.appendFileSync.call(this, file, data); // function appendFileSync(path, data, options) {
    }
    chmod(path, mode, callback) {
        this.#checkProtected(path, false);
        return nodeFS.chmod.call(this, path, mode, callback); // function chmod(path, mode, callback) {
    }
    chmodSync(path, mode) {
        this.#checkProtected(path, false);
        return nodeFS.chmodSync.call(this, path, mode); // function chmodSync(path, mode) {
    }
    chown(path, uid, gid, callback) {
        this.#checkProtected(path, false);
        return nodeFS.chown.call(this, path, uid, gid, callback); // function chown(path, uid, gid, callback) {
    }
    chownSync(path, uid, gid) {
        this.#checkProtected(path, false);
        return nodeFS.chownSync.call(this, path, uid, gid); // function chownSync(path, uid, gid) {
    }
    copyFile(src, dest, mode, callback) {
        this.#checkProtected(src, true);
        this.#checkProtected(dest, false);
        // @ts-expect-error should work
        return nodeFS.copyFile.call(this, src, dest, mode, callback); // function copyFile(src, dest, mode, callback) {
    }
    copyFileSync(src, dest, mode) {
        this.#checkProtected(src, true);
        this.#checkProtected(dest, false);
        return nodeFS.copyFileSync.call(this, src, dest, mode); // function copyFileSync(src, dest, mode) {
    }
    rename(oldPath, newPath, callback) {
        this.#checkProtected(oldPath, false);
        this.#checkProtected(newPath, false);
        return nodeFS.rename.call(this, oldPath, newPath, callback); // function rename(oldPath, newPath, callback) {
    }
    renameSync(oldPath, newPath) {
        this.#checkProtected(oldPath, false);
        this.#checkProtected(newPath, false);
        return nodeFS.renameSync.call(this, oldPath, newPath); // function renameSync(oldPath, newPath) {
    }
    open(path, callback) {
        this.#checkProtected(path, true);
        return nodeFS.open.call(this, path, callback); // function open(path, flags, mode, callback) {
    }
    openSync(path, flags, mode) {
        this.#checkProtected(path, true);
        return nodeFS.openSync.call(this, path, flags, mode); // function openSync(path, flags, mode) {
    }
    truncate(path, callback) {
        this.#checkProtected(path, false);
        return nodeFS.truncate.call(this, path, callback); // function truncate(path, len, callback) {
    }
    truncateSync(path) {
        this.#checkProtected(path, false);
        return nodeFS.truncateSync.call(this, path); // function truncateSync(path, len) {
    }
    exists(path, callback) {
        this.#checkProtected(path, true);
        return nodeFS.exists.call(this, path, callback); // function exists(path, callback) {
    }
    existsSync(path) {
        this.#checkProtected(path, true);
        return nodeFS.existsSync.call(this, path); // function existsSync(path) {
    }
    stat(path, options, callback) {
        this.#checkProtected(path, true);
        // @ts-expect-error should work
        return nodeFS.stat.call(this, path, options, callback); // function stat(path, options = { bigint: false }, callback) {
    }
    statSync(path, options) {
        this.#checkProtected(path, true);
        return nodeFS.statSync.call(this, path, options); // function statSync(path, options = { bigint: false, throwIfNoEntry: true }) {
    }
    utimes(path, atime, mtime, callback) {
        this.#checkProtected(path, false);
        return nodeFS.utimes.call(this, path, atime, mtime, callback); // function utimes(path, atime, mtime, callback) {
    }
    utimesSync(path, atime, mtime) {
        this.#checkProtected(path, false);
        return nodeFS.utimesSync.call(this, path, atime, mtime); // function utimesSync(path, atime, mtime) {
    }
    readdir(path, options, callback) {
        this.#checkProtected(path, true);
        // @ts-expect-error should work
        return nodeFS.readdir.call(this, path, options, callback); // function readdir(path, options, callback) {
    }
    readdirSync(path, options) {
        this.#checkProtected(path, true);
        // @ts-expect-error should work
        return nodeFS.readdirSync.call(this, path, options); // function readdirSync(path, options) {
    }
    createReadStream(path, options) {
        this.#checkProtected(path, true);
        return nodeFS.createReadStream.call(this, path, options); // function createReadStream(path, options) {
    }
    createWriteStream(path, options) {
        this.#checkProtected(path, false);
        return nodeFS.createWriteStream.call(this, path, options); // function createWriteStream(path, options) {
    }
    lchmod(path, mode, callback) {
        this.#checkProtected(path, false);
        return nodeFS.lchmod.call(this, path, mode, callback); // function lchmod(path, mode, callback) {
    }
    lchmodSync(path, mode) {
        this.#checkProtected(path, false);
        return nodeFS.lchmodSync.call(this, path, mode); // function lchmodSync(path, mode) {
    }
    lchown(path, uid, gid, callback) {
        this.#checkProtected(path, false);
        return nodeFS.lchown.call(this, path, uid, gid, callback); // function lchown(path, uid, gid, callback) {
    }
    lchownSync(path, uid, gid) {
        this.#checkProtected(path, false);
        return nodeFS.lchownSync.call(this, path, uid, gid); // function lchownSync(path, uid, gid) {
    }
    link(existingPath, newPath, callback) {
        this.#checkProtected(existingPath, false);
        this.#checkProtected(newPath, false);
        return nodeFS.link.call(this, existingPath, newPath, callback); // function link(existingPath, newPath, callback) {
    }
    linkSync(existingPath, newPath) {
        this.#checkProtected(existingPath, false);
        this.#checkProtected(newPath, false);
        return nodeFS.linkSync.call(this, existingPath, newPath); // function linkSync(existingPath, newPath) {
    }
    lstat(path, options, callback) {
        this.#checkProtected(path, true);
        // @ts-expect-error should work
        return nodeFS.lstat.call(this, path, options, callback); // function lstat(path, options = { bigint: false }, callback) {
    }
    lstatSync(path, options) {
        this.#checkProtected(path, true);
        return nodeFS.lstatSync.call(this, path, options); // function lstatSync(path, options = { bigint: false, throwIfNoEntry: true }) {
    }
    lutimes(path, atime, mtime, callback) {
        this.#checkProtected(path, false);
        return nodeFS.lutimes.call(this, path, atime, mtime, callback); // function lutimes(path, atime, mtime, callback) {
    }
    lutimesSync(path, atime, mtime) {
        this.#checkProtected(path, false);
        return nodeFS.lutimesSync.call(this, path, atime, mtime); // function lutimesSync(path, atime, mtime) {
    }
    mkdir(path, options, callback) {
        this.#checkProtected(path, false);
        // @ts-expect-error should work
        return nodeFS.mkdir.call(this, path, options, callback); // function mkdir(path, options, callback) {
    }
    mkdirSync(path, options) {
        this.#checkProtected(path, false);
        return nodeFS.mkdirSync.call(this, path, options); // function mkdirSync(path, options) {
    }
    mkdtemp(prefix, options, callback) {
        this.#checkProtected(prefix, false);
        // @ts-expect-error should work
        return nodeFS.mkdtemp.call(this, prefix, options, callback); // function mkdtemp(prefix, options, callback) {
    }
    mkdtempSync(prefix, options) {
        this.#checkProtected(prefix, false);
        return nodeFS.mkdtempSync.call(this, prefix, options); // function mkdtempSync(prefix, options) {
    }
    rm(path, options, callback) {
        this.#checkProtected(path, false);
        // @ts-expect-error should work
        return nodeFS.rm.call(this, path, options, callback); // function rm(path, options, callback) {
    }
    rmSync(path, options) {
        this.#checkProtected(path, false);
        return nodeFS.rmSync.call(this, path, options); // function rmSync(path, options) {
    }
    rmdir(path, options, callback) {
        this.#checkProtected(path, false);
        // @ts-expect-error should work
        return nodeFS.rmdir.call(this, path, options, callback); // function rmdir(path, options, callback) {
    }
    rmdirSync(path, options) {
        this.#checkProtected(path, false);
        return nodeFS.rmdirSync.call(this, path, options); // function rmdirSync(path, options) {
    }
    watch(filename, listener) {
        this.#checkProtected(filename, true);
        return nodeFS.watch.call(this, filename, listener); // function watch(filename, options, listener) {
    }
    watchFile(filename, listener) {
        this.#checkProtected(filename, true);
        return nodeFS.watchFile.call(this, filename, listener); // function watchFile(filename, options, listener) {
    }
}
exports.default = ProtectFs;
//# sourceMappingURL=protectFs.js.map