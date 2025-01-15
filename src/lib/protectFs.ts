import type {
    BufferEncodingOption,
    CopyOptions,
    Dirent,
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
    CopySyncOptions,
    NoParamCallback,
    PathOrFileDescriptor,
    WriteFileOptions,
    EncodingOption,
    FSWatcher,
    ReadStream,
    StatsListener,
    StatWatcher,
    WatchListener,
    WriteStream,
} from 'node:fs';
import type { Abortable } from 'node:events';
import type { FileHandle, FlagAndOpenMode } from 'node:fs/promises';
import type { URL } from 'node:url';
import type { Stream } from 'node:stream';

import * as nodeFS from 'node:fs';
import { sep, normalize, join } from 'node:path';

export default class ProtectFs {
    private readonly log: ioBroker.Logger;
    private readonly ioBrokerDataDir: string;
    public readonly promises: {
        access: (path: PathLike, mode?: number) => Promise<void>;
        cp: (source: string | URL, destination: string | URL, opts?: CopyOptions) => Promise<void>;
        readFile: (
            path: PathLike | FileHandle,
            options:
                | ({
                      encoding: BufferEncoding;
                      flag?: OpenMode | undefined;
                  } & Abortable)
                | BufferEncoding,
        ) => Promise<string>;
        readlink: (path: PathLike, options: BufferEncodingOption) => Promise<Buffer>;
        symlink: (target: PathLike, path: PathLike, type?: string | null) => Promise<void>;
        writeFile: (
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
                      flush?: boolean | undefined;
                  } & Abortable)
                | BufferEncoding
                | null,
        ) => Promise<void>;
        unlink: (path: PathLike) => Promise<void>;
        appendFile: (
            path: PathLike | FileHandle,
            data: string | Uint8Array,
            options?:
                | (ObjectEncodingOptions & FlagAndOpenMode & { flush?: boolean | undefined })
                | BufferEncoding
                | null,
        ) => Promise<void>;
        chmod: (path: PathLike, mode: Mode) => Promise<void>;
        copyFile: (src: PathLike, dest: PathLike, mode?: number) => Promise<void>;
        rename: (oldPath: PathLike, newPath: PathLike) => Promise<void>;
        open: (path: PathLike, flags?: string | number, mode?: Mode) => Promise<FileHandle>;
        truncate: (path: PathLike, len?: number) => Promise<void>;
        stat: (path: PathLike, opts?: StatOptions) => Promise<Stats>;
        utimes: (path: PathLike, atime: TimeLike, mtime: TimeLike) => Promise<void>;
        readdir: (
            path: PathLike,
            options?: ObjectEncodingOptions & {
                withFileTypes: true;
                recursive?: boolean | undefined;
            },
        ) => Promise<Dirent[]>;
        lchmod: (path: PathLike, mode: Mode) => Promise<void>;
        lchown: (path: PathLike, uid: number, gid: number) => Promise<void>;
        link: (existingPath: PathLike, newPath: PathLike) => Promise<void>;
        lstat: (path: PathLike, opts?: StatOptions) => Promise<Stats>;
        lutimes: (path: PathLike, atime: TimeLike, mtime: TimeLike) => Promise<void>;
        mkdir: (path: PathLike, options?: Mode | MakeDirectoryOptions | null) => Promise<string | undefined>;
        mkdtemp: (prefix: string, options?: ObjectEncodingOptions | BufferEncoding | null) => Promise<string>;
        rm: (path: PathLike, options?: RmOptions) => Promise<void>;
        rmdir: (path: PathLike, options?: RmDirOptions) => Promise<void>;
    };
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
                return nodeFS.promises.symlink(target, path, type); // async function symlink(target, path, type_) {
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
                           *
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
                const result = await nodeFS.promises.stat.call(this, path, opts); // async function stat(path, options = { bigint: false }) {
                return result as Stats;
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
            ): Promise<Dirent[]> => {
                this.#checkProtected(path, true);
                return nodeFS.promises.readdir.call(this, path, options || { encoding: null, withFileTypes: true }); // async function readdir(path, options) {
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
                const res = await nodeFS.promises.lstat.call(this, path, opts); // async function lstat(path, options = { bigint: false }) {
                return res as Stats;
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
            mkdtemp: async (
                prefix: string,
                options?: ObjectEncodingOptions | BufferEncoding | null,
            ): Promise<string> => {
                this.#checkProtected(prefix, false);
                const tmp = await nodeFS.promises.mkdtemp.call(this, prefix, options); // async function mkdtemp(prefix, options) {
                return tmp.toString();
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
            if (
                typeof (nodeFS as unknown as Record<string, any>)[m] === 'function' &&
                Object.hasOwn(nodeFS, m) &&
                !Object.hasOwn(this, m)
            ) {
                // console.debug(`Missing function in ProtectFS: ${m} - adding from node:fs`);
                // @ts-expect-error Elsewise we must implement EVERY function in fs
                this[m] = nodeFS[m];
            }
        }

        for (const m in nodeFS.promises) {
            if (
                typeof (nodeFS.promises as unknown as Record<string, any>)[m] === 'function' &&
                Object.hasOwn(nodeFS.promises, m) &&
                !Object.hasOwn(this.promises, m)
            ) {
                // console.debug(`Missing function in ProtectFS: ${m} - adding from node:fs/promises`);
                // @ts-expect-error Elsewise we must implement EVERY function in fs
                this.promises[m] = nodeFS.promises[m];
            }
        }
    }

    #checkProtected(file: PathLike | FileHandle, readOnly: boolean): void {
        if ((file as FileHandle).fd) {
            return;
        }
        const filePath = normalize((file as PathLike).toString());

        // todo: protect against file://...
        if (filePath.endsWith(`-data${sep}objects.json`) || filePath.endsWith(`-data${sep}objects.jsonl`)) {
            this.log.error(`May not read ${(file as PathLike).toString()}`);
            throw new Error('Permission denied');
        }
        if (!readOnly && filePath.startsWith(join(this.ioBrokerDataDir, 'files'))) {
            this.log.error(`May not read ${(file as PathLike).toString()} - use writeFile instead`);
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
    ): void {
        this.#checkProtected(source, false);
        this.#checkProtected(destination, false);
        if (callback) {
            return nodeFS.cp(source, destination, opts as CopyOptions, callback);
        }
        if (typeof opts === 'function') {
            return nodeFS.cp(source, destination, opts);
        }
        return nodeFS.cp(source, destination, opts as (err: NodeJS.ErrnoException | null) => void);
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

    readlink(path: PathLike, callback: (err: NodeJS.ErrnoException | null, linkString: string) => void): void {
        this.#checkProtected(path, true);
        return nodeFS.readlink.call(this, path, callback); // function readlink(path, options, callback) {
    }

    readlinkSync(path: PathLike, options?: any): string | Buffer {
        this.#checkProtected(path, true);
        return nodeFS.readlinkSync.call(this, path, options); // function readlinkSync(path, options) {
    }

    symlink(
        target: PathLike,
        path: PathLike,
        type: 'dir' | 'file' | 'junction' | undefined | null | NoParamCallback,
        callback: NoParamCallback,
    ): void {
        this.#checkProtected(target, true);
        this.#checkProtected(path, false);
        if (typeof callback === 'function') {
            // @ts-expect-error should work
            return nodeFS.symlink.call(this, target, path, type, callback);
        }
        return nodeFS.symlink.call(this, target, path, type as NoParamCallback); // function symlink(target, path, type_, callback_) {
    }

    symlinkSync(target: PathLike, path: PathLike, type?: 'dir' | 'file' | 'junction' | null): void {
        this.#checkProtected(target, true);
        this.#checkProtected(path, false);
        return nodeFS.symlinkSync.call(this, target, path, type); // function symlinkSync(target, path, type) {
    }

    writeFile(
        file: PathLike | number,
        data: string | NodeJS.ArrayBufferView,
        options: WriteFileOptions | NoParamCallback,
        callback?: NoParamCallback,
    ): void {
        if (typeof file !== 'number') {
            this.#checkProtected(file, false);
        }
        // @ts-expect-error should work
        return nodeFS.writeFile.call(this, file, data, options, callback); // function writeFile(path, data, options, callback) {
    }

    writeFileSync(file: PathLike | number, data: string | NodeJS.ArrayBufferView, options?: WriteFileOptions): void {
        if (typeof file !== 'number') {
            this.#checkProtected(file, false);
        }
        return nodeFS.writeFileSync.call(this, file, data, options); // function writeFileSync(path, data, options) {
    }

    unlink(path: PathLike, callback: NoParamCallback): void {
        this.#checkProtected(path, false);
        return nodeFS.unlink.call(this, path, callback); // function unlink(path, callback) {
    }

    unlinkSync(path: PathLike): void {
        this.#checkProtected(path, false);
        return nodeFS.unlinkSync.call(this, path); // function unlinkSync(path) {
    }

    appendFile(file: PathLike | number, data: string | Uint8Array, callback: NoParamCallback): void {
        if (typeof file !== 'number') {
            this.#checkProtected(file, false);
        }
        return nodeFS.appendFile.call(this, file, data, callback); // function appendFile(path, data, options, callback) {
    }

    appendFileSync(file: PathLike | number, data: string | Uint8Array): void {
        if (typeof file !== 'number') {
            this.#checkProtected(file, false);
        }
        return nodeFS.appendFileSync.call(this, file, data); // function appendFileSync(path, data, options) {
    }

    chmod(path: PathLike, mode: Mode, callback: NoParamCallback): void {
        this.#checkProtected(path, false);
        return nodeFS.chmod.call(this, path, mode, callback); // function chmod(path, mode, callback) {
    }

    chmodSync(path: PathLike, mode: Mode): void {
        this.#checkProtected(path, false);
        return nodeFS.chmodSync.call(this, path, mode); // function chmodSync(path, mode) {
    }

    chown(path: PathLike, uid: number, gid: number, callback: NoParamCallback): void {
        this.#checkProtected(path, false);
        return nodeFS.chown.call(this, path, uid, gid, callback); // function chown(path, uid, gid, callback) {
    }

    chownSync(path: PathLike, uid: number, gid: number): void {
        this.#checkProtected(path, false);
        return nodeFS.chownSync.call(this, path, uid, gid); // function chownSync(path, uid, gid) {
    }

    copyFile(src: PathLike, dest: PathLike, mode: number | NoParamCallback, callback?: NoParamCallback): void {
        this.#checkProtected(src, true);
        this.#checkProtected(dest, false);
        // @ts-expect-error should work
        return nodeFS.copyFile.call(this, src, dest, mode, callback); // function copyFile(src, dest, mode, callback) {
    }

    copyFileSync(src: PathLike, dest: PathLike, mode?: number): void {
        this.#checkProtected(src, true);
        this.#checkProtected(dest, false);
        return nodeFS.copyFileSync.call(this, src, dest, mode); // function copyFileSync(src, dest, mode) {
    }

    rename(oldPath: PathLike, newPath: PathLike, callback: NoParamCallback): void {
        this.#checkProtected(oldPath, false);
        this.#checkProtected(newPath, false);
        return nodeFS.rename.call(this, oldPath, newPath, callback); // function rename(oldPath, newPath, callback) {
    }

    renameSync(oldPath: PathLike, newPath: PathLike): void {
        this.#checkProtected(oldPath, false);
        this.#checkProtected(newPath, false);
        return nodeFS.renameSync.call(this, oldPath, newPath); // function renameSync(oldPath, newPath) {
    }

    open(path: PathLike, callback: (err: NodeJS.ErrnoException | null, fd: number) => void): void {
        this.#checkProtected(path, true);
        return nodeFS.open.call(this, path, callback); // function open(path, flags, mode, callback) {
    }

    openSync(path: PathLike, flags: OpenMode, mode?: Mode | null): number {
        this.#checkProtected(path, true);
        return nodeFS.openSync.call(this, path, flags, mode); // function openSync(path, flags, mode) {
    }

    truncate(path: PathLike, callback: NoParamCallback): void {
        this.#checkProtected(path, false);
        return nodeFS.truncate.call(this, path, callback); // function truncate(path, len, callback) {
    }

    truncateSync(path: PathLike): void {
        this.#checkProtected(path, false);
        return nodeFS.truncateSync.call(this, path); // function truncateSync(path, len) {
    }

    exists(path: PathLike, callback: (exists: boolean) => void): void {
        this.#checkProtected(path, true);
        return nodeFS.exists.call(this, path, callback); // function exists(path, callback) {
    }

    existsSync(path: PathLike): boolean {
        this.#checkProtected(path, true);
        return nodeFS.existsSync.call(this, path); // function existsSync(path) {
    }

    stat(
        path: PathLike,
        options: StatOptions | undefined | ((err: NodeJS.ErrnoException | null, stats: Stats) => void),
        callback?: (err: NodeJS.ErrnoException | null, stats: Stats) => void,
    ): void {
        this.#checkProtected(path, true);
        // @ts-expect-error should work
        return nodeFS.stat.call(this, path, options, callback); // function stat(path, options = { bigint: false }, callback) {
    }

    statSync(path: PathLike, options?: StatOptions): Stats {
        this.#checkProtected(path, true);
        return nodeFS.statSync.call(this, path, options); // function statSync(path, options = { bigint: false, throwIfNoEntry: true }) {
    }

    utimes(path: PathLike, atime: TimeLike, mtime: TimeLike, callback: NoParamCallback): void {
        this.#checkProtected(path, false);
        return nodeFS.utimes.call(this, path, atime, mtime, callback); // function utimes(path, atime, mtime, callback) {
    }

    utimesSync(path: PathLike, atime: TimeLike, mtime: TimeLike): void {
        this.#checkProtected(path, false);
        return nodeFS.utimesSync.call(this, path, atime, mtime); // function utimesSync(path, atime, mtime) {
    }

    readdir(
        path: PathLike,
        options:
            | (ObjectEncodingOptions & {
                  withFileTypes: true;
                  recursive?: boolean | undefined;
              })
            | ((err: NodeJS.ErrnoException | null, files: Dirent[]) => void),
        callback?: (err: NodeJS.ErrnoException | null, files: Dirent[]) => void,
    ): void {
        this.#checkProtected(path, true);
        // @ts-expect-error should work
        return nodeFS.readdir.call(this, path, options, callback); // function readdir(path, options, callback) {
    }

    readdirSync(
        path: PathLike,
        options?: ObjectEncodingOptions & {
            withFileTypes: true;
            recursive?: boolean | undefined;
        },
    ): void {
        this.#checkProtected(path, true);
        // @ts-expect-error should work
        return nodeFS.readdirSync.call(this, path, options); // function readdirSync(path, options) {
    }

    createReadStream(path: PathLike, options?: BufferEncoding): ReadStream {
        this.#checkProtected(path, true);
        return nodeFS.createReadStream.call(this, path, options); // function createReadStream(path, options) {
    }

    createWriteStream(path: PathLike, options?: BufferEncoding): WriteStream {
        this.#checkProtected(path, false);
        return nodeFS.createWriteStream.call(this, path, options); // function createWriteStream(path, options) {
    }

    lchmod(path: PathLike, mode: Mode, callback: NoParamCallback): void {
        this.#checkProtected(path, false);
        return nodeFS.lchmod.call(this, path, mode, callback); // function lchmod(path, mode, callback) {
    }

    lchmodSync(path: PathLike, mode: Mode): void {
        this.#checkProtected(path, false);
        return nodeFS.lchmodSync.call(this, path, mode); // function lchmodSync(path, mode) {
    }

    lchown(path: PathLike, uid: number, gid: number, callback: NoParamCallback): void {
        this.#checkProtected(path, false);
        return nodeFS.lchown.call(this, path, uid, gid, callback); // function lchown(path, uid, gid, callback) {
    }

    lchownSync(path: PathLike, uid: number, gid: number): void {
        this.#checkProtected(path, false);
        return nodeFS.lchownSync.call(this, path, uid, gid); // function lchownSync(path, uid, gid) {
    }

    link(existingPath: PathLike, newPath: PathLike, callback: NoParamCallback): void {
        this.#checkProtected(existingPath, false);
        this.#checkProtected(newPath, false);
        return nodeFS.link.call(this, existingPath, newPath, callback); // function link(existingPath, newPath, callback) {
    }

    linkSync(existingPath: PathLike, newPath: PathLike): void {
        this.#checkProtected(existingPath, false);
        this.#checkProtected(newPath, false);
        return nodeFS.linkSync.call(this, existingPath, newPath); // function linkSync(existingPath, newPath) {
    }

    lstat(
        path: PathLike,
        options: StatOptions | undefined | ((err: NodeJS.ErrnoException | null, stats: Stats) => void),
        callback: (err: NodeJS.ErrnoException | null, stats: Stats) => void,
    ): void {
        this.#checkProtected(path, true);
        // @ts-expect-error should work
        return nodeFS.lstat.call(this, path, options, callback); // function lstat(path, options = { bigint: false }, callback) {
    }

    lstatSync(path: PathLike, options?: StatOptions): Stats {
        this.#checkProtected(path, true);
        return nodeFS.lstatSync.call(this, path, options); // function lstatSync(path, options = { bigint: false, throwIfNoEntry: true }) {
    }

    lutimes(path: PathLike, atime: TimeLike, mtime: TimeLike, callback: NoParamCallback): void {
        this.#checkProtected(path, false);
        return nodeFS.lutimes.call(this, path, atime, mtime, callback); // function lutimes(path, atime, mtime, callback) {
    }

    lutimesSync(path: PathLike, atime: TimeLike, mtime: TimeLike): void {
        this.#checkProtected(path, false);
        return nodeFS.lutimesSync.call(this, path, atime, mtime); // function lutimesSync(path, atime, mtime) {
    }

    mkdir(
        path: PathLike,
        options:
            | Mode
            | (MakeDirectoryOptions & {
                  recursive: true;
              })
            | null
            | undefined
            | ((err: NodeJS.ErrnoException | null, path?: string) => void),
        callback?: (err: NodeJS.ErrnoException | null, path?: string) => void,
    ): void {
        this.#checkProtected(path, false);
        // @ts-expect-error should work
        return nodeFS.mkdir.call(this, path, options, callback); // function mkdir(path, options, callback) {
    }

    mkdirSync(
        path: PathLike,
        options?: MakeDirectoryOptions & {
            recursive: true;
        },
    ): string | undefined {
        this.#checkProtected(path, false);
        return nodeFS.mkdirSync.call(this, path, options); // function mkdirSync(path, options) {
    }

    mkdtemp(
        prefix: string,
        options: EncodingOption | ((err: NodeJS.ErrnoException | null, folder: string) => void),
        callback?: (err: NodeJS.ErrnoException | null, folder: string) => void,
    ): void {
        this.#checkProtected(prefix, false);
        // @ts-expect-error should work
        return nodeFS.mkdtemp.call(this, prefix, options, callback); // function mkdtemp(prefix, options, callback) {
    }

    mkdtempSync(prefix: string, options?: EncodingOption): string | Buffer {
        this.#checkProtected(prefix, false);
        return nodeFS.mkdtempSync.call(this, prefix, options); // function mkdtempSync(prefix, options) {
    }

    rm(path: PathLike, options: RmOptions | NoParamCallback, callback?: NoParamCallback): void {
        this.#checkProtected(path, false);
        // @ts-expect-error should work
        return nodeFS.rm.call(this, path, options, callback); // function rm(path, options, callback) {
    }

    rmSync(path: PathLike, options?: RmOptions): void {
        this.#checkProtected(path, false);
        return nodeFS.rmSync.call(this, path, options); // function rmSync(path, options) {
    }

    rmdir(path: PathLike, options: RmDirOptions | NoParamCallback, callback?: NoParamCallback): void {
        this.#checkProtected(path, false);
        // @ts-expect-error should work
        return nodeFS.rmdir.call(this, path, options, callback); // function rmdir(path, options, callback) {
    }

    rmdirSync(path: PathLike, options?: RmDirOptions): void {
        this.#checkProtected(path, false);
        return nodeFS.rmdirSync.call(this, path, options); // function rmdirSync(path, options) {
    }

    watch(filename: PathLike, listener?: WatchListener<string>): FSWatcher {
        this.#checkProtected(filename, true);
        return nodeFS.watch.call(this, filename, listener); // function watch(filename, options, listener) {
    }

    watchFile(filename: PathLike, listener: StatsListener): StatWatcher {
        this.#checkProtected(filename, true);
        return nodeFS.watchFile.call(this, filename, listener); // function watchFile(filename, options, listener) {
    }
}
