import {
    BufferEncodingOption,
    CopyOptions,
    MakeDirectoryOptions,
    Mode,
    ObjectEncodingOptions,
    OpenMode,
    PathLike,
    RmDirOptions,
    RmOptions,
    StatOptions,
    Stats,
    TimeLike,
} from 'node:fs';
import { Abortable } from 'node:events';
import { FileHandle, FlagAndOpenMode } from 'fs/promises';
import { CopySyncOptions, NoParamCallback, PathOrFileDescriptor } from 'fs';
import { URL } from 'node:url';
import { Stream } from 'node:stream';

const nodeFS = require('node:fs');
const { sep, normalize, join } = require('node:path');

export default class ProtectFs {
    private readonly log: ioBroker.Logger;
    private readonly ioBrokerDataDir: string;
    public readonly promises: Record<string, Function>;
    public readonly constants: Record<string, number>;

    constructor(log: ioBroker.Logger, ioBrokerDataDir: string) {
        this.ioBrokerDataDir = ioBrokerDataDir;
        this.log = log || {
            silly: (message: string): void => console.log(message),
            debug: (message: string): void => console.debug(message),
            info: (message: string): void => console.info(message),
            warn: (message: string): void => console.warn(message),
            error: (message: string): void => console.error(message),
            level: 'info',
        };

        this.promises = {
            access: async (path: PathLike, mode?: number): Promise<void> => {
                this.#checkProtected(path, true);
                return nodeFS.promises.access(path, mode);
            },
            cp: async (source: string | URL, destination: string | URL, opts?: CopyOptions): Promise<void> => {
                this.#checkProtected(source, false);
                this.#checkProtected(destination, false);
                return nodeFS.promises.cp(source, destination, opts);
            },
            readFile: async (
                path: PathLike | FileHandle,
                options:
                    | ({
                          encoding: BufferEncoding;
                          flag?: OpenMode | undefined;
                      } & Abortable)
                    | BufferEncoding,
            ): Promise<string> => {
                this.#checkProtected(path, true);
                return nodeFS.promises.readFile(path, options); // async function readFile(path, options) {
            },
            readlink: async (path: PathLike, options: BufferEncodingOption): Promise<Buffer> => {
                this.#checkProtected(path, true);
                return nodeFS.promises.readlink(path, options); // async function readlink(path, options) {
            },
            symlink: async (target: PathLike, path: PathLike, type?: string | null): Promise<void> => {
                this.#checkProtected(target, true);
                this.#checkProtected(path, false);
                return nodeFS.promises.symlink(target, path); // async function symlink(target, path, type_) {
            },
            writeFile: async (
                file: PathLike | FileHandle,
                data:
                    | string
                    | NodeJS.ArrayBufferView
                    | Iterable<string | NodeJS.ArrayBufferView>
                    | AsyncIterable<string | NodeJS.ArrayBufferView>
                    | Stream,
                options?:
                    | (ObjectEncodingOptions & {
                          mode?: Mode | undefined;
                          flag?: OpenMode | undefined;
                          /**
                           * If all data is successfully written to the file, and `flush`
                           * is `true`, `filehandle.sync()` is used to flush the data.
                           * @default false
                           */
                          flush?: boolean | undefined;
                      } & Abortable)
                    | BufferEncoding
                    | null,
            ): Promise<void> => {
                this.#checkProtected(file, true);
                return nodeFS.promises.writeFile.call(this, file, data, options); // async function writeFile(path, data, options) {
            },
            unlink: async (path: PathLike): Promise<void> => {
                this.#checkProtected(path, false);
                return nodeFS.promises.unlink.call(this, path); // async function unlink(path) {
            },
            appendFile: async (
                path: PathLike | FileHandle,
                data: string | Uint8Array,
                options?:
                    | (ObjectEncodingOptions & FlagAndOpenMode & { flush?: boolean | undefined })
                    | BufferEncoding
                    | null,
            ): Promise<void> => {
                this.#checkProtected(path, false);
                return nodeFS.promises.appendFile.call(this, path, data, options); // async function appendFile(path, data, options) {
            },
            chmod: async (path: PathLike, mode: Mode): Promise<void> => {
                this.#checkProtected(path, false);
                return nodeFS.promises.chmod.call(this, path, mode); // async function chmod(path, mode) {
            },
            copyFile: async (src: PathLike, dest: PathLike, mode?: number): Promise<void> => {
                this.#checkProtected(src, false);
                this.#checkProtected(dest, false);
                return nodeFS.promises.copyFile.call(this, src, dest, mode); // async function copyFile(src, dest, mode) {
            },
            rename: async (oldPath: PathLike, newPath: PathLike): Promise<void> => {
                this.#checkProtected(oldPath, false);
                this.#checkProtected(newPath, false);
                return nodeFS.promises.rename.call(this, oldPath, newPath); // async function rename(oldPath, newPath) {
            },
            open: async (path: PathLike, flags?: string | number, mode?: Mode): Promise<FileHandle> => {
                this.#checkProtected(path, true);
                return nodeFS.promises.open.call(this, path, flags, mode); // async function open(path, flags, mode) {
            },
            truncate: async (path: PathLike, len?: number): Promise<void> => {
                this.#checkProtected(path, false);
                return nodeFS.promises.truncate.call(this, path, len); // async function truncate(path, len = 0) {
            },
            stat: async (path: PathLike, opts?: StatOptions): Promise<Stats> => {
                this.#checkProtected(path, true);
                return nodeFS.promises.stat.call(this, path, opts); // async function stat(path, options = { bigint: false }) {
            },
            utimes: async (path: PathLike, atime: TimeLike, mtime: TimeLike): Promise<void> => {
                this.#checkProtected(path, false);
                return nodeFS.promises.utimes.call(this, path, atime, mtime); // async function utimes(path, atime, mtime) {
            },
            readdir: async (
                path: PathLike,
                options?: ObjectEncodingOptions & {
                    withFileTypes: true;
                    recursive?: boolean | undefined;
                },
            ) => {
                this.#checkProtected(path, true);
                return nodeFS.promises.readdir.call(this, path, options); // async function readdir(path, options) {
            },
            lchmod: async (path: PathLike, mode: Mode): Promise<void> => {
                this.#checkProtected(path, false);
                return nodeFS.promises.lchmod.call(this, path, mode); // async function lchmod(path, mode) {
            },
            lchown: async (path: PathLike, uid: number, gid: number): Promise<void> => {
                this.#checkProtected(path, false);
                return nodeFS.promises.lchown.call(this, path, uid, gid); // async function lchown(path, uid, gid) {
            },
            link: async (existingPath: PathLike, newPath: PathLike): Promise<void> => {
                this.#checkProtected(existingPath, false);
                this.#checkProtected(newPath, false);
                return nodeFS.promises.link.call(this, existingPath, newPath); // async function link(existingPath, newPath) {
            },
            lstat: async (path: PathLike, opts?: StatOptions): Promise<Stats> => {
                this.#checkProtected(path, true);
                return nodeFS.promises.lstat.call(this, path, opts); // async function lstat(path, options = { bigint: false }) {
            },
            lutimes: async (path: PathLike, atime: TimeLike, mtime: TimeLike): Promise<void> => {
                this.#checkProtected(path, false);
                return nodeFS.promises.lutimes.call(this, path, atime, mtime); // async function lutimes(path, atime, mtime) {
            },
            mkdir: async (
                path: PathLike,
                options?: Mode | MakeDirectoryOptions | null,
            ): Promise<string | undefined> => {
                this.#checkProtected(path, false);
                return nodeFS.promises.mkdir.call(this, path, options); // async function mkdir(path, options) {
            },
            mkdtemp: async (prefix: string, options: BufferEncodingOption): Promise<Buffer> => {
                this.#checkProtected(prefix, false);
                return nodeFS.promises.mkdtemp.call(this, prefix, options); // async function mkdtemp(prefix, options) {
            },
            rm: async (path: PathLike, options?: RmOptions): Promise<void> => {
                this.#checkProtected(path, false);
                return nodeFS.promises.rm.call(this, path, options); // async function rm(path, options) {
            },
            rmdir: async (path: PathLike, options?: RmDirOptions): Promise<void> => {
                this.#checkProtected(path, false);
                return nodeFS.promises.rmdir.call(this, path, options); // async function rmdir(path, options) {
            },
        };

        // Add missing constants
        this.constants = nodeFS.constants;

        // Add missing functions
        for (const m in nodeFS) {
            if (typeof nodeFS[m] === 'function' && Object.hasOwn(nodeFS, m) && !Object.hasOwn(this, m)) {
                // console.debug(`Missing function in ProtectFS: ${m} - adding from node:fs`);
                this[m] = nodeFS[m];
            }
        }

        for (const m in nodeFS.promises) {
            if (
                typeof nodeFS.promises[m] === 'function' &&
                Object.hasOwn(nodeFS.promises, m) &&
                !Object.hasOwn(this.promises, m)
            ) {
                // console.debug(`Missing function in ProtectFS: ${m} - adding from node:fs/promises`);
                this.promises[m] = nodeFS.promises[m];
            }
        }
    }

    #checkProtected(file: PathLike | FileHandle, readonly: boolean): void {
        const filePath = normalize(file.toString());

        // todo: protect against file://...
        if (filePath.endsWith(`-data${sep}objects.json`) || filePath.endsWith(`-data${sep}objects.jsonl`)) {
            this.log.error(`May not read ${file}`);
            throw new Error('Permission denied');
        }
        if (!readonly && filePath.startsWith(join(this.ioBrokerDataDir, 'files'))) {
            this.log.error(`May not read ${file} - use ${readonly ? 'readFile' : 'writeFile'} instead`);
            throw new Error('Permission denied');
        }
    }

    access(path: PathLike, callback: NoParamCallback): void {
        this.#checkProtected(path, true);
        return nodeFS.access(path, callback);
    }

    accessSync(path: PathLike, mode?: number): void {
        this.#checkProtected(path, true);
        return nodeFS.accessSync(path, mode); // function accessSync(path, mode) {
    }

    cp(
        source: string | URL,
        destination: string | URL,
        opts: CopyOptions | ((err: NodeJS.ErrnoException | null) => void),
        callback?: (err: NodeJS.ErrnoException | null) => void,
    ) {
        this.#checkProtected(source, false);
        this.#checkProtected(destination, false);
        if (callback) {
            return nodeFS.cp(source, destination, opts as CopyOptions, callback);
        }
        return nodeFS.cp(source, destination, opts);
    }

    cpSync(source: string | URL, destination: string | URL, opts?: CopySyncOptions): void {
        this.#checkProtected(source, false);
        this.#checkProtected(destination, false);
        return nodeFS.cpSync.call(this, source, destination, opts); // function cpSync(src, dest, options) {
    }

    readFile(path: PathOrFileDescriptor, callback: (err: NodeJS.ErrnoException | null, data: Buffer) => void): void {
        if (typeof path !== 'number') {
            this.#checkProtected(path, true);
        }
        return nodeFS.readFile.call(this, path, callback); // function readFile(path, options, callback) {
    }

    readFileSync(
        path: PathOrFileDescriptor,
        options:
            | {
                  encoding: BufferEncoding;
                  flag?: string | undefined;
              }
            | BufferEncoding,
    ): string | Buffer {
        if (typeof path !== 'number') {
            this.#checkProtected(path, true);
        }
        return nodeFS.readFileSync.call(this, path, options); // function readFileSync(path, options) {
    }

    readlink() {
        this.#checkProtected(arguments[0], true);
        return nodeFS.readlink.apply(this, arguments); // function readlink(path, options, callback) {
    }

    readlinkSync() {
        this.#checkProtected(arguments[0], true);
        return nodeFS.readlinkSync.apply(this, arguments); // function readlinkSync(path, options) {
    }

    symlink() {
        this.#checkProtected(arguments[0], true);
        this.#checkProtected(arguments[0], false);
        return nodeFS.symlink.apply(this, arguments); // function symlink(target, path, type_, callback_) {
    }

    symlinkSync() {
        this.#checkProtected(arguments[0], true);
        this.#checkProtected(arguments[0], false);
        return nodeFS.symlinkSync.apply(this, arguments); // function symlinkSync(target, path, type) {
    }

    writeFile() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.writeFile.apply(this, arguments); // function writeFile(path, data, options, callback) {
    }

    writeFileSync() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.writeFileSync.apply(this, arguments); // function writeFileSync(path, data, options) {
    }

    unlink() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.unlink.apply(this, arguments); // function unlink(path, callback) {
    }

    unlinkSync() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.unlinkSync.apply(this, arguments); // function unlinkSync(path) {
    }

    appendFile() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.appendFile.apply(this, arguments); // function appendFile(path, data, options, callback) {
    }

    appendFileSync() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.appendFileSync.apply(this, arguments); // function appendFileSync(path, data, options) {
    }

    chmod() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.chmod.apply(this, arguments); // function chmod(path, mode, callback) {
    }

    chmodSync() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.chmodSync.apply(this, arguments); // function chmodSync(path, mode) {
    }

    chown() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.chmodSync.apply(this, arguments); // function chown(path, uid, gid, callback) {
    }

    chownSync() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.chownSync.apply(this, arguments); // function chownSync(path, uid, gid) {
    }

    copyFile() {
        this.#checkProtected(arguments[0], false);
        this.#checkProtected(arguments[1], false);
        return nodeFS.copyFile.apply(this, arguments); // function copyFile(src, dest, mode, callback) {
    }

    copyFileSync() {
        this.#checkProtected(arguments[0], true);
        this.#checkProtected(arguments[1], false);
        return nodeFS.copyFileSync.apply(this, arguments); // function copyFileSync(src, dest, mode) {
    }

    rename() {
        this.#checkProtected(arguments[0], false);
        this.#checkProtected(arguments[1], false);
        return nodeFS.rename.apply(this, arguments); // function rename(oldPath, newPath, callback) {
    }

    renameSync() {
        this.#checkProtected(arguments[0], false);
        this.#checkProtected(arguments[1], false);
        return nodeFS.renameSync.apply(this, arguments); // function renameSync(oldPath, newPath) {
    }

    open() {
        this.#checkProtected(arguments[0], true);
        return nodeFS.open.apply(this, arguments); // function open(path, flags, mode, callback) {
    }

    openSync() {
        this.#checkProtected(arguments[0], true);
        return nodeFS.openSync.apply(this, arguments); // function openSync(path, flags, mode) {
    }

    truncate() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.truncate.apply(this, arguments); // function truncate(path, len, callback) {
    }

    truncateSync() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.truncateSync.apply(this, arguments); // function truncateSync(path, len) {
    }

    exists() {
        this.#checkProtected(arguments[0], true);
        return nodeFS.exists.apply(this, arguments); // function exists(path, callback) {
    }

    existsSync() {
        this.#checkProtected(arguments[0], true);
        return nodeFS.existsSync.apply(this, arguments); // function existsSync(path) {
    }

    stat() {
        this.#checkProtected(arguments[0], true);
        return nodeFS.stat.apply(this, arguments); // function stat(path, options = { bigint: false }, callback) {
    }

    statSync() {
        this.#checkProtected(arguments[0], true);
        return nodeFS.statSync.apply(this, arguments); // function statSync(path, options = { bigint: false, throwIfNoEntry: true }) {
    }

    utimes() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.utimes.apply(this, arguments); // function utimes(path, atime, mtime, callback) {
    }

    utimesSync() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.utimesSync.apply(this, arguments); // function utimesSync(path, atime, mtime) {
    }

    readdir() {
        this.#checkProtected(arguments[0], true);
        return nodeFS.readdir.apply(this, arguments); // function readdir(path, options, callback) {
    }

    readdirSync() {
        this.#checkProtected(arguments[0], true);
        return nodeFS.readdirSync.apply(this, arguments); // function readdirSync(path, options) {
    }

    createReadStream() {
        this.#checkProtected(arguments[0], true);
        return nodeFS.createReadStream.apply(this, arguments); // function createReadStream(path, options) {
    }

    createWriteStream() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.createWriteStream.apply(this, arguments); // function createWriteStream(path, options) {
    }

    lchmod() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.lchmod.apply(this, arguments); // function lchmod(path, mode, callback) {
    }

    lchmodSync() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.lchmodSync.apply(this, arguments); // function lchmodSync(path, mode) {
    }

    lchown() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.lchown.apply(this, arguments); // function lchown(path, uid, gid, callback) {
    }

    lchownSync() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.lchownSync.apply(this, arguments); // function lchownSync(path, uid, gid) {
    }

    link() {
        this.#checkProtected(arguments[0], false);
        this.#checkProtected(arguments[1], false);
        return nodeFS.link.apply(this, arguments); // function link(existingPath, newPath, callback) {
    }

    linkSync() {
        this.#checkProtected(arguments[0], false);
        this.#checkProtected(arguments[1], false);
        return nodeFS.linkSync.apply(this, arguments); // function linkSync(existingPath, newPath) {
    }

    lstat() {
        this.#checkProtected(arguments[0], true);
        return nodeFS.lstat.apply(this, arguments); // function lstat(path, options = { bigint: false }, callback) {
    }

    lstatSync() {
        this.#checkProtected(arguments[0], true);
        return nodeFS.lstatSync.apply(this, arguments); // function lstatSync(path, options = { bigint: false, throwIfNoEntry: true }) {
    }

    lutimes() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.lutimes.apply(this, arguments); // function lutimes(path, atime, mtime, callback) {
    }

    lutimesSync() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.lutimesSync.apply(this, arguments); // function lutimesSync(path, atime, mtime) {
    }

    mkdir() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.mkdir.apply(this, arguments); // function mkdir(path, options, callback) {
    }

    mkdirSync() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.mkdirSync.apply(this, arguments); // function mkdirSync(path, options) {
    }

    mkdtemp() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.mkdtemp.apply(this, arguments); // function mkdtemp(prefix, options, callback) {
    }

    mkdtempSync() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.mkdtempSync.apply(this, arguments); // function mkdtempSync(prefix, options) {
    }

    rm() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.rm.apply(this, arguments); // function rm(path, options, callback) {
    }

    rmSync() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.rmSync.apply(this, arguments); // function rmSync(path, options) {
    }

    rmdir() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.rmdir.apply(this, arguments); // function rmdir(path, options, callback) {
    }

    rmdirSync() {
        this.#checkProtected(arguments[0], false);
        return nodeFS.rmdirSync.apply(this, arguments); // function rmdirSync(path, options) {
    }

    watch() {
        this.#checkProtected(arguments[0], true);
        return nodeFS.watch.apply(this, arguments); // function watch(filename, options, listener) {
    }

    watchFile() {
        this.#checkProtected(arguments[0], true);
        return nodeFS.watchFile.apply(this, arguments); // function watchFile(filename, options, listener) {
    }
}
