const nodeFS = require('node:fs');
const path = require('node:path');

const ProtectFs = function (log, ioBrokerDataDir) {
    function checkProtected(file, readonly) {
        const filePath = path.normalize(file);

        if (filePath.endsWith(`-data${path.sep}objects.json`) || filePath.endsWith(`-data${path.sep}objects.jsonl`)) {
            if (log) {
                log.error(`May not read ${file}`);
            } else {
                console.error(`May not read ${file}`);
            }
            throw new Error('Permission denied');
        } else if (!readonly && filePath.startsWith(path.join(ioBrokerDataDir, 'files'))) {
            if (log) {
                log.error(`May not read ${file} - use ${readonly ? 'readFile' : 'writeFile'} instead`);
            } else {
                console.error(`May not read ${file} - use ${readonly ? 'readFile' : 'writeFile'} instead`);
            }
            throw new Error('Permission denied');
        }
    }

    this.access = function () {
        checkProtected(arguments[0], true);
        return nodeFS.access.apply(this, arguments); // function access(path, mode, callback) {
    };
    this.accessSync = function () {
        checkProtected(arguments[0], true);
        return nodeFS.accessSync.apply(this, arguments); // function accessSync(path, mode) {
    };
    this.cp = function () {
        checkProtected(arguments[0], false);
        checkProtected(arguments[1], false);
        return nodeFS.cp.apply(this, arguments); // function cp(src, dest, options, callback) {
    };
    this.cpSync = function () {
        checkProtected(arguments[0], false);
        checkProtected(arguments[1], false);
        return nodeFS.cpSync.apply(this, arguments); // function cpSync(src, dest, options) {
    };
    this.readFile = function () {
        checkProtected(arguments[0], true);
        return nodeFS.readFile.apply(this, arguments); // function readFile(path, options, callback) {
    };
    this.readFileSync = function () {
        checkProtected(arguments[0], true);
        return nodeFS.readFileSync.apply(this, arguments); // function readFileSync(path, options) {
    };
    this.readlink = function () {
        checkProtected(arguments[0], true);
        return nodeFS.readlink.apply(this, arguments); // function readlink(path, options, callback) {
    };
    this.readlinkSync = function () {
        checkProtected(arguments[0], true);
        return nodeFS.readlinkSync.apply(this, arguments); // function readlinkSync(path, options) {
    };
    this.symlink = function () {
        checkProtected(arguments[0], true);
        checkProtected(arguments[0], false);
        return nodeFS.symlink.apply(this, arguments); // function symlink(target, path, type_, callback_) {
    };
    this.symlinkSync = function () {
        checkProtected(arguments[0], true);
        checkProtected(arguments[0], false);
        return nodeFS.symlinkSync.apply(this, arguments); // function symlinkSync(target, path, type) {
    };
    this.writeFile = function () {
        checkProtected(arguments[0], false);
        return nodeFS.writeFile.apply(this, arguments); // function writeFile(path, data, options, callback) {
    };
    this.writeFileSync = function () {
        checkProtected(arguments[0], false);
        return nodeFS.writeFileSync.apply(this, arguments); // function writeFileSync(path, data, options) {
    };
    this.unlink = function () {
        checkProtected(arguments[0], false);
        return nodeFS.unlink.apply(this, arguments); // function unlink(path, callback) {
    };
    this.unlinkSync = function () {
        checkProtected(arguments[0], false);
        return nodeFS.unlinkSync.apply(this, arguments); // function unlinkSync(path) {
    };
    this.appendFile = function () {
        checkProtected(arguments[0], false);
        return nodeFS.appendFile.apply(this, arguments); // function appendFile(path, data, options, callback) {
    };
    this.appendFileSync = function () {
        checkProtected(arguments[0], false);
        return nodeFS.appendFileSync.apply(this, arguments); // function appendFileSync(path, data, options) {
    };
    this.chmod = function () {
        checkProtected(arguments[0], false);
        return nodeFS.chmod.apply(this, arguments); // function chmod(path, mode, callback) {
    };
    this.chmodSync = function () {
        checkProtected(arguments[0], false);
        return nodeFS.chmodSync.apply(this, arguments); // function chmodSync(path, mode) {
    };
    this.chown = function () {
        checkProtected(arguments[0], false);
        return nodeFS.chmodSync.apply(this, arguments); // function chown(path, uid, gid, callback) {
    };
    this.chownSync = function () {
        checkProtected(arguments[0], false);
        return nodeFS.chownSync.apply(this, arguments); // function chownSync(path, uid, gid) {
    };
    this.copyFile = function () {
        checkProtected(arguments[0], false);
        checkProtected(arguments[1], false);
        return nodeFS.copyFile.apply(this, arguments); // function copyFile(src, dest, mode, callback) {
    };
    this.copyFileSync = function () {
        checkProtected(arguments[0], true);
        checkProtected(arguments[1], false);
        return nodeFS.copyFileSync.apply(this, arguments); // function copyFileSync(src, dest, mode) {
    };
    this.rename = function () {
        checkProtected(arguments[0], false);
        checkProtected(arguments[1], false);
        return nodeFS.rename.apply(this, arguments); // function rename(oldPath, newPath, callback) {
    };
    this.renameSync = function () {
        checkProtected(arguments[0], false);
        checkProtected(arguments[1], false);
        return nodeFS.renameSync.apply(this, arguments); // function renameSync(oldPath, newPath) {
    };
    this.open = function () {
        checkProtected(arguments[0], true);
        return nodeFS.open.apply(this, arguments); // function open(path, flags, mode, callback) {
    };
    this.openSync = function () {
        checkProtected(arguments[0], true);
        return nodeFS.openSync.apply(this, arguments); // function openSync(path, flags, mode) {
    };
    this.truncate = function () {
        checkProtected(arguments[0], false);
        return nodeFS.truncate.apply(this, arguments); // function truncate(path, len, callback) {
    };
    this.truncateSync = function () {
        checkProtected(arguments[0], false);
        return nodeFS.truncateSync.apply(this, arguments); // function truncateSync(path, len) {
    };
    this.exists = function () {
        checkProtected(arguments[0], true);
        return nodeFS.exists.apply(this, arguments); // function exists(path, callback) {
    };
    this.existsSync = function () {
        checkProtected(arguments[0], true);
        return nodeFS.existsSync.apply(this, arguments); // function existsSync(path) {
    };
    this.stat = function () {
        checkProtected(arguments[0], true);
        return nodeFS.stat.apply(this, arguments); // function stat(path, options = { bigint: false }, callback) {
    };
    this.statSync = function () {
        checkProtected(arguments[0], true);
        return nodeFS.statSync.apply(this, arguments); // function statSync(path, options = { bigint: false, throwIfNoEntry: true }) {
    };
    this.utimes = function () {
        checkProtected(arguments[0], false);
        return nodeFS.utimes.apply(this, arguments); // function utimes(path, atime, mtime, callback) {
    };
    this.utimesSync = function () {
        checkProtected(arguments[0], false);
        return nodeFS.utimesSync.apply(this, arguments); // function utimesSync(path, atime, mtime) {
    };
    this.readdir = function () {
        checkProtected(arguments[0], true);
        return nodeFS.readdir.apply(this, arguments); // function readdir(path, options, callback) {
    };
    this.readdirSync = function () {
        checkProtected(arguments[0], true);
        return nodeFS.readdirSync.apply(this, arguments); // function readdirSync(path, options) {
    };
    this.createReadStream = function () {
        checkProtected(arguments[0], true);
        return nodeFS.createReadStream.apply(this, arguments); // function createReadStream(path, options) {
    };
    this.createWriteStream = function () {
        checkProtected(arguments[0], false);
        return nodeFS.createWriteStream.apply(this, arguments); // function createWriteStream(path, options) {
    };
    this.lchmod = function () {
        checkProtected(arguments[0], false);
        return nodeFS.lchmod.apply(this, arguments); // function lchmod(path, mode, callback) {
    };
    this.lchmodSync = function () {
        checkProtected(arguments[0], false);
        return nodeFS.lchmodSync.apply(this, arguments); // function lchmodSync(path, mode) {
    };
    this.lchown = function () {
        checkProtected(arguments[0], false);
        return nodeFS.lchown.apply(this, arguments); // function lchown(path, uid, gid, callback) {
    };
    this.lchownSync = function () {
        checkProtected(arguments[0], false);
        return nodeFS.lchownSync.apply(this, arguments); // function lchownSync(path, uid, gid) {
    };
    this.link = function () {
        checkProtected(arguments[0], false);
        checkProtected(arguments[1], false);
        return nodeFS.link.apply(this, arguments); // function link(existingPath, newPath, callback) {
    };
    this.linkSync = function () {
        checkProtected(arguments[0], false);
        checkProtected(arguments[1], false);
        return nodeFS.linkSync.apply(this, arguments); // function linkSync(existingPath, newPath) {
    };
    this.lstat = function () {
        checkProtected(arguments[0], true);
        return nodeFS.lstat.apply(this, arguments); // function lstat(path, options = { bigint: false }, callback) {
    };
    this.lstatSync = function () {
        checkProtected(arguments[0], true);
        return nodeFS.lstatSync.apply(this, arguments); // function lstatSync(path, options = { bigint: false, throwIfNoEntry: true }) {
    };
    this.lutimes = function () {
        checkProtected(arguments[0], false);
        return nodeFS.lutimes.apply(this, arguments); // function lutimes(path, atime, mtime, callback) {
    };
    this.lutimesSync = function () {
        checkProtected(arguments[0], false);
        return nodeFS.lutimesSync.apply(this, arguments); // function lutimesSync(path, atime, mtime) {
    };
    this.mkdir = function () {
        checkProtected(arguments[0], false);
        return nodeFS.mkdir.apply(this, arguments); // function mkdir(path, options, callback) {
    };
    this.mkdirSync = function () {
        checkProtected(arguments[0], false);
        return nodeFS.mkdirSync.apply(this, arguments); // function mkdirSync(path, options) {
    };
    this.mkdtemp = function () {
        checkProtected(arguments[0], false);
        return nodeFS.mkdtemp.apply(this, arguments); // function mkdtemp(prefix, options, callback) {
    };
    this.mkdtempSync = function () {
        checkProtected(arguments[0], false);
        return nodeFS.mkdtempSync.apply(this, arguments); // function mkdtempSync(prefix, options) {
    };
    this.rm = function () {
        checkProtected(arguments[0], false);
        return nodeFS.rm.apply(this, arguments); // function rm(path, options, callback) {
    };
    this.rmSync = function () {
        checkProtected(arguments[0], false);
        return nodeFS.rmSync.apply(this, arguments); // function rmSync(path, options) {
    };
    this.rmdir = function () {
        checkProtected(arguments[0], false);
        return nodeFS.rmdir.apply(this, arguments); // function rmdir(path, options, callback) {
    };
    this.rmdirSync = function () {
        checkProtected(arguments[0], false);
        return nodeFS.rmdirSync.apply(this, arguments); // function rmdirSync(path, options) {
    };
    this.watch = function () {
        checkProtected(arguments[0], true);
        return nodeFS.watch.apply(this, arguments); // function watch(filename, options, listener) {
    };
    this.watchFile = function () {
        checkProtected(arguments[0], true);
        return nodeFS.watchFile.apply(this, arguments); // function watchFile(filename, options, listener) {
    };

    this.promises = {
        access: async function () {
            checkProtected(arguments[0], true);
            return nodeFS.promises.access.apply(this, arguments); // async function access(path, mode = F_OK) {
        },
        cp: async function () {
            checkProtected(arguments[0], false);
            checkProtected(arguments[1], false);
            return nodeFS.promises.cp.apply(this, arguments); // async function cp(src, dest, options) {
        },
        readFile: async function () {
            checkProtected(arguments[0], true);
            return nodeFS.promises.readFile.apply(this, arguments); // async function readFile(path, options) {
        },
        readlink: async function () {
            checkProtected(arguments[0], true);
            return nodeFS.promises.readlink.apply(this, arguments); // async function readlink(path, options) {
        },
        symlink: async function () {
            checkProtected(arguments[0], true);
            checkProtected(arguments[0], false);
            return nodeFS.promises.symlink.apply(this, arguments); // async function symlink(target, path, type_) {
        },
        writeFile: async function () {
            checkProtected(arguments[0], true);
            return nodeFS.promises.writeFile.apply(this, arguments); // async function writeFile(path, data, options) {
        },
        unlink: async function () {
            checkProtected(arguments[0], false);
            return nodeFS.promises.unlink.apply(this, arguments); // async function unlink(path) {
        },
        appendFile: async function () {
            checkProtected(arguments[0], false);
            return nodeFS.promises.appendFile.apply(this, arguments); // async function appendFile(path, data, options) {
        },
        chmod: async function () {
            checkProtected(arguments[0], false);
            return nodeFS.promises.chmod.apply(this, arguments); // async function chmod(path, mode) {
        },
        chown: async function () {
            checkProtected(arguments[0], false);
            return nodeFS.promises.chmodSync.apply(this, arguments); // async function chown(path, uid, gid) {
        },
        copyFile: function () {
            checkProtected(arguments[0], false);
            checkProtected(arguments[1], false);
            return nodeFS.promises.copyFile.apply(this, arguments); // async function copyFile(src, dest, mode) {
        },
        rename: async function () {
            checkProtected(arguments[0], false);
            checkProtected(arguments[1], false);
            return nodeFS.promises.rename.apply(this, arguments); // async function rename(oldPath, newPath) {
        },
        open: async function () {
            checkProtected(arguments[0], true);
            return nodeFS.promises.open.apply(this, arguments); // async function open(path, flags, mode) {
        },
        truncate: async function () {
            checkProtected(arguments[0], false);
            return nodeFS.promises.truncate.apply(this, arguments); // async function truncate(path, len = 0) {
        },
        stat: async function () {
            checkProtected(arguments[0], true);
            return nodeFS.promises.stat.apply(this, arguments); // async function stat(path, options = { bigint: false }) {
        },
        utimes: async function () {
            checkProtected(arguments[0], false);
            return nodeFS.promises.utimes.apply(this, arguments); // async function utimes(path, atime, mtime) {
        },
        readdir: async function () {
            checkProtected(arguments[0], true);
            return nodeFS.promises.readdir.apply(this, arguments); // async function readdir(path, options) {
        },
        lchmod: async function () {
            checkProtected(arguments[0], false);
            return nodeFS.promises.lchmod.apply(this, arguments); // async function lchmod(path, mode) {
        },
        lchown: async function () {
            checkProtected(arguments[0], false);
            return nodeFS.promises.lchown.apply(this, arguments); // async function lchown(path, uid, gid) {
        },
        link: async function () {
            checkProtected(arguments[0], false);
            checkProtected(arguments[1], false);
            return nodeFS.promises.link.apply(this, arguments); // async function link(existingPath, newPath) {
        },
        lstat: async function () {
            checkProtected(arguments[0], true);
            return nodeFS.promises.lstat.apply(this, arguments); // async function lstat(path, options = { bigint: false }) {
        },
        lutimes: async function () {
            checkProtected(arguments[0], false);
            return nodeFS.promises.lutimes.apply(this, arguments); // async function lutimes(path, atime, mtime) {
        },
        mkdir: async function () {
            checkProtected(arguments[0], false);
            return nodeFS.promises.mkdir.apply(this, arguments); // async function mkdir(path, options) {
        },
        mkdtemp: async function () {
            checkProtected(arguments[0], false);
            return nodeFS.promises.mkdtemp.apply(this, arguments); // async function mkdtemp(prefix, options) {
        },
        rm: async function () {
            checkProtected(arguments[0], false);
            return nodeFS.promises.rm.apply(this, arguments); // async function rm(path, options) {
        },
        rmdir: async function () {
            checkProtected(arguments[0], false);
            return nodeFS.promises.rmdir.apply(this, arguments); // async function rmdir(path, options) {
        }
    };

    // Add missing functions
    for (const m in nodeFS) {
        if (typeof nodeFS[m] === 'function' && Object.hasOwn(nodeFS, m) && !Object.hasOwn(this, m)) {
            // console.debug(`Missing function in ProtectFS: ${m} - adding from node:fs`);
            this[m] = nodeFS[m];
        }
    }

    for (const m in nodeFS.promises) {
        if (typeof nodeFS.promises[m] === 'function' && Object.hasOwn(nodeFS.promises, m) && !Object.hasOwn(this.promises, m)) {
            // console.debug(`Missing function in ProtectFS: ${m} - adding from node:fs/promises`);
            this.promises[m] = nodeFS.promises[m];
        }
    }

    return this;
};

module.exports = ProtectFs;
