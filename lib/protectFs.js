const nodeFS = require('fs');
const path = require('path');

const ProtectFs = function (log) {
    function checkObjectsJson(file) {
        if (path.normalize(file).replace(/\\/g, '/').includes('-data/objects.json')) {
            if (log) {
                log.error('May not read ' + file);
            } else {
                console.error('May not read ' + file);
            }
            throw new Error('Permission denied');
        }
    }

    this.readFile = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.readFile.apply(this, arguments);
    };
    this.readFileSync = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.readFileSync.apply(this, arguments);
    };
    this.writeFile = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.writeFile.apply(this, arguments);
    };
    this.writeFileSync = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.writeFileSync.apply(this, arguments);
    };
    this.unlink = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.unlink.apply(this, arguments);
    };
    this.unlinkSync = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.unlinkSync.apply(this, arguments);
    };
    this.appendFile = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.appendFile.apply(this, arguments);
    };
    this.appendFileSync = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.appendFileSync.apply(this, arguments);
    };
    this.chmod = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.chmod.apply(this, arguments);
    };
    this.chmodSync = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.chmodSync.apply(this, arguments);
    };
    this.chown = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.chmodSync.apply(this, arguments);
    };
    this.chownSync = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.chownSync.apply(this, arguments);
    };
    this.copyFile = function () {
        checkObjectsJson(arguments[0]);
        checkObjectsJson(arguments[1]);
        if (nodeFS.copyFile) {
            return nodeFS.copyFile.apply(this, arguments);
        } else {
            const cb = arguments[2];
            return nodeFS.readFile(arguments[0], (err, data) => {
                if (err) {
                    cb && cb(err);
                } else {
                    nodeFS.writeFile(arguments[1], data, err => cb && cb(err));
                }
            });
        }
    };
    this.copyFileSync = function () {
        checkObjectsJson(arguments[0]);
        checkObjectsJson(arguments[1]);
        if (nodeFS.copyFileSync) {
            return nodeFS.copyFileSync.apply(this, arguments);
        } else {
            return nodeFS.writeFileSync(arguments[1], nodeFS.readFileSync(arguments[0]));
        }
    };
    this.rename = function () {
        checkObjectsJson(arguments[0]);
        checkObjectsJson(arguments[1]);
        if (nodeFS.rename) {
            return nodeFS.rename.apply(this, arguments);
        } else {
            const cb = arguments[2];
            return nodeFS.readFile(arguments[0], (err, data) => {
                if (err) {
                    cb && cb(err);
                } else {
                    nodeFS.writeFile(arguments[1], data, err => cb && cb(err));
                }
            });
        }
    };
    this.renameSync = function () {
        checkObjectsJson(arguments[0]);
        checkObjectsJson(arguments[1]);
        if (nodeFS.renameSync) {
            return nodeFS.renameSync.apply(this, arguments);
        } else {
            return nodeFS.writeFileSync(arguments[1], nodeFS.readFileSync(arguments[0]));
        }
    };
    this.open = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.open.apply(this, arguments);
    };
    this.openSync = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.openSync.apply(this, arguments);
    };
    this.rename = function () {
        checkObjectsJson(arguments[0]);
        checkObjectsJson(arguments[1]);
        return nodeFS.rename.apply(this, arguments);
    };
    this.renameSync = function () {
        checkObjectsJson(arguments[0]);
        checkObjectsJson(arguments[1]);
        return nodeFS.renameSync.apply(this, arguments);
    };
    this.truncate = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.truncate.apply(this, arguments);
    };
    this.truncateSync = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.truncateSync.apply(this, arguments);
    };
    this.exists = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.exists.apply(this, arguments);
    };
    this.existsSync = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.existsSync.apply(this, arguments);
    };
    this.stat = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.stat.apply(this, arguments);
    };
    this.statSync = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.statSync.apply(this, arguments);
    };
    this.readdir = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.readdir.apply(this, arguments);
    };
    this.readdirSync = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.readdirSync.apply(this, arguments);
    };
    this.createReadStream = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.createReadStream.apply(this, arguments);
    };
    this.createWriteStream = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.createWriteStream.apply(this, arguments);
    };
    this.lstat = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.lstat.apply(this, arguments);
    };
    this.lstatSync = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.lstatSync.apply(this, arguments);
    };
    this.mkdir = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.mkdir.apply(this, arguments);
    };
    this.mkdirSync = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.mkdirSync.apply(this, arguments);
    };
    this.rmdir = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.rmdir.apply(this, arguments);
    };
    this.rmdirSync = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.rmdirSync.apply(this, arguments);
    };
    this.watch = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.watch.apply(this, arguments);
    };
    this.watchFile = function () {
        checkObjectsJson(arguments[0]);
        return nodeFS.watchFile.apply(this, arguments);
    };

    this.promises = {
        readFile: function () {
            checkObjectsJson(arguments[0]);
            return nodeFS.promises.readFile.apply(this, arguments);
        },
        writeFile: function () {
            checkObjectsJson(arguments[0]);
            return nodeFS.promises.writeFile.apply(this, arguments);
        },
        unlink: function () {
            checkObjectsJson(arguments[0]);
            return nodeFS.promises.unlink.apply(this, arguments);
        },
        appendFile: function () {
            checkObjectsJson(arguments[0]);
            return nodeFS.promises.appendFile.apply(this, arguments);
        },
        chmod: function () {
            checkObjectsJson(arguments[0]);
            return nodeFS.promises.chmod.apply(this, arguments);
        },
        chown: function () {
            checkObjectsJson(arguments[0]);
            return nodeFS.promises.chmodSync.apply(this, arguments);
        },
        copyFile: function () {
            checkObjectsJson(arguments[0]);
            checkObjectsJson(arguments[1]);
            return nodeFS.promises.copyFile.apply(this, arguments);
        },
        rename: function () {
            checkObjectsJson(arguments[0]);
            checkObjectsJson(arguments[1]);
            return nodeFS.promises.rename.apply(this, arguments);
        },
        open: function () {
            checkObjectsJson(arguments[0]);
            return nodeFS.promises.open.apply(this, arguments);
        },
        rename: function () {
            checkObjectsJson(arguments[0]);
            checkObjectsJson(arguments[1]);
            return nodeFS.promises.rename.apply(this, arguments);
        },
        truncate: function () {
            checkObjectsJson(arguments[0]);
            return nodeFS.promises.truncate.apply(this, arguments);
        },
        stat: function () {
            checkObjectsJson(arguments[0]);
            return nodeFS.promises.stat.apply(this, arguments);
        },
        readdir: function () {
            checkObjectsJson(arguments[0]);
            return nodeFS.promises.readdir.apply(this, arguments);
        },
        lstat: function () {
            checkObjectsJson(arguments[0]);
            return nodeFS.promises.lstat.apply(this, arguments);
        },
        mkdir: function () {
            checkObjectsJson(arguments[0]);
            return nodeFS.promises.mkdir.apply(this, arguments);
        },
        rmdir: function () {
            checkObjectsJson(arguments[0]);
            return nodeFS.promises.rmdir.apply(this, arguments);
        }
    }

    return this;
};

module.exports = ProtectFs;