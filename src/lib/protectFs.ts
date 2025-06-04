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
    BigIntStatsListener,
    WatchOptions,
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
                // @ts-expect-error fix later
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
                !Object.hasOwn(Object.getPrototypeOf(this), 'appendFile')
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

    access(path: PathLike, mode?: number | NoParamCallback, callback?: NoParamCallback): void {
        this.#checkProtected(path, true);
        if (typeof callback === 'function') {
            return nodeFS.access(path, mode as number | undefined, callback);
        }
        return nodeFS.access(path, mode as NoParamCallback);
    }

    accessSync(path: PathLike, mode?: number): void {
        this.#checkProtected(path, true);
        return nodeFS.accessSync(path, mode);
    }

    cp(
        source: string | URL,
        destination: string | URL,
        opts?: CopyOptions | ((err: NodeJS.ErrnoException | null) => void),
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
        return nodeFS.cpSync.call(this, source, destination, opts);
    }

    readFile(
        path: PathOrFileDescriptor,
        options:
            | (ObjectEncodingOptions & {
                  flag?: string | undefined;
              } & Abortable)
            | BufferEncoding
            | undefined
            | null
            | ((err: NodeJS.ErrnoException | null, data: string | NonSharedBuffer) => void),
        callback?: (err: NodeJS.ErrnoException | null, data: string | NonSharedBuffer) => void,
    ): void {
        if (typeof path !== 'number') {
            this.#checkProtected(path, true);
        }
        if (typeof callback === 'function') {
            return nodeFS.readFile.call(
                this,
                path,
                options as
                    | (ObjectEncodingOptions & {
                          flag?: string | undefined;
                      } & Abortable)
                    | BufferEncoding
                    | undefined
                    | null,
                // @ts-expect-error readFile can accept 3 arguments too
                callback,
            );
        }
        return nodeFS.readFile.call(
            this,
            path,
            options as (err: NodeJS.ErrnoException | null, data: string | NonSharedBuffer) => void,
        );
    }

    readFileSync(
        path: PathOrFileDescriptor,
        options?:
            | {
                  encoding: BufferEncoding;
                  flag?: string | undefined;
              }
            | BufferEncoding,
    ): string | Buffer {
        if (typeof path !== 'number') {
            this.#checkProtected(path, true);
        }
        return nodeFS.readFileSync.call(this, path, options);
    }

    readlink(
        path: PathLike,
        options: EncodingOption | ((err: NodeJS.ErrnoException | null, linkString: string | Buffer) => void),
        callback?: (err: NodeJS.ErrnoException | null, linkString: string | Buffer) => void,
    ): void {
        this.#checkProtected(path, true);
        if (typeof callback === 'function') {
            // @ts-expect-error should work
            return nodeFS.readlink.call(this, path, options, callback); //
        }
        return nodeFS.readlink.call(
            this,
            path,
            options as (err: NodeJS.ErrnoException | null, linkString: string | Buffer) => void,
        );
    }

    readlinkSync(path: PathLike, options?: EncodingOption): string | Buffer {
        this.#checkProtected(path, true);
        return nodeFS.readlinkSync.call(this, path, options);
    }

    symlink(
        target: PathLike,
        path: PathLike,
        type?: 'dir' | 'file' | 'junction' | null | NoParamCallback,
        callback?: NoParamCallback,
    ): void {
        this.#checkProtected(target, true);
        this.#checkProtected(path, false);
        if (typeof callback === 'function') {
            // @ts-expect-error should work
            return nodeFS.symlink.call(this, target, path, type as 'dir' | 'file' | 'junction' | null, callback);
        }
        return nodeFS.symlink.call(this, target, path, type as NoParamCallback);
    }

    symlinkSync(target: PathLike, path: PathLike, type?: 'dir' | 'file' | 'junction' | null): void {
        this.#checkProtected(target, true);
        this.#checkProtected(path, false);
        return nodeFS.symlinkSync.call(this, target, path, type);
    }

    writeFile(
        file: PathLike | number,
        data: string | NodeJS.ArrayBufferView,
        options?: WriteFileOptions | NoParamCallback,
        callback?: NoParamCallback,
    ): void {
        if (typeof file !== 'number') {
            this.#checkProtected(file, false);
        }
        if (typeof callback === 'function') {
            // @ts-expect-error should work
            return nodeFS.writeFile.call(this, file, data, options, callback);
        }
        return nodeFS.writeFile.call(this, file, data, options as NoParamCallback);
    }

    writeFileSync(file: PathLike | number, data: string | NodeJS.ArrayBufferView, options?: WriteFileOptions): void {
        if (typeof file !== 'number') {
            this.#checkProtected(file, false);
        }
        return nodeFS.writeFileSync.call(this, file, data, options);
    }

    unlink(path: PathLike, callback?: NoParamCallback): void {
        this.#checkProtected(path, false);
        return nodeFS.unlink.call(this, path, callback || ((_err: NodeJS.ErrnoException | null) => {}));
    }

    unlinkSync(path: PathLike): void {
        this.#checkProtected(path, false);
        return nodeFS.unlinkSync.call(this, path);
    }

    appendFile(
        file: PathLike | number,
        data: string | Uint8Array,
        options?: WriteFileOptions | NoParamCallback,
        callback?: NoParamCallback,
    ): void {
        if (typeof file !== 'number') {
            this.#checkProtected(file, false);
        }
        if (typeof callback === 'function') {
            // @ts-expect-error should work
            return nodeFS.appendFile.call(this, file, data, options, callback);
        }
        return nodeFS.appendFile.call(this, file, data, options as NoParamCallback);
    }

    appendFileSync(file: PathLike | number, data: string | Uint8Array, options?: WriteFileOptions): void {
        if (typeof file !== 'number') {
            this.#checkProtected(file, false);
        }
        return nodeFS.appendFileSync.call(this, file, data, options);
    }

    chmod(path: PathLike, mode: Mode, callback?: NoParamCallback): void {
        this.#checkProtected(path, false);
        return nodeFS.chmod.call(this, path, mode, callback || ((_err: NodeJS.ErrnoException | null) => {}));
    }

    chmodSync(path: PathLike, mode: Mode): void {
        this.#checkProtected(path, false);
        return nodeFS.chmodSync.call(this, path, mode);
    }

    chown(path: PathLike, uid: number, gid: number, callback?: NoParamCallback): void {
        this.#checkProtected(path, false);
        return nodeFS.chown.call(this, path, uid, gid, callback || ((_err: NodeJS.ErrnoException | null) => {}));
    }

    chownSync(path: PathLike, uid: number, gid: number): void {
        this.#checkProtected(path, false);
        return nodeFS.chownSync.call(this, path, uid, gid);
    }

    copyFile(src: PathLike, dest: PathLike, mode: number | NoParamCallback, callback?: NoParamCallback): void {
        this.#checkProtected(src, true);
        this.#checkProtected(dest, false);
        // @ts-expect-error should work
        return nodeFS.copyFile.call(this, src, dest, mode, callback);
    }

    copyFileSync(src: PathLike, dest: PathLike, mode?: number): void {
        this.#checkProtected(src, true);
        this.#checkProtected(dest, false);
        return nodeFS.copyFileSync.call(this, src, dest, mode);
    }

    rename(oldPath: PathLike, newPath: PathLike, callback?: NoParamCallback): void {
        this.#checkProtected(oldPath, false);
        this.#checkProtected(newPath, false);
        return nodeFS.rename.call(this, oldPath, newPath, callback || ((_err: NodeJS.ErrnoException | null) => {}));
    }

    renameSync(oldPath: PathLike, newPath: PathLike): void {
        this.#checkProtected(oldPath, false);
        this.#checkProtected(newPath, false);
        return nodeFS.renameSync.call(this, oldPath, newPath);
    }

    open(path: PathLike, callback: (err: NodeJS.ErrnoException | null, fd: number) => void): void {
        this.#checkProtected(path, true);
        return nodeFS.open.call(this, path, callback);
    }

    openSync(path: PathLike, flags: OpenMode, mode?: Mode | null): number {
        this.#checkProtected(path, true);
        return nodeFS.openSync.call(this, path, flags, mode);
    }

    truncate(path: PathLike, callback?: NoParamCallback): void {
        this.#checkProtected(path, false);
        return nodeFS.truncate.call(this, path, callback || ((_err: NodeJS.ErrnoException | null) => {}));
    }

    truncateSync(path: PathLike): void {
        this.#checkProtected(path, false);
        return nodeFS.truncateSync.call(this, path);
    }

    exists(path: PathLike, callback: (exists: boolean) => void): void {
        this.#checkProtected(path, true);
        return nodeFS.exists.call(this, path, callback);
    }

    existsSync(path: PathLike): boolean {
        this.#checkProtected(path, true);
        return nodeFS.existsSync.call(this, path);
    }

    stat(
        path: PathLike,
        options: StatOptions | undefined | ((err: NodeJS.ErrnoException | null, stats: Stats) => void),
        callback?: (err: NodeJS.ErrnoException | null, stats: Stats) => void,
    ): void {
        this.#checkProtected(path, true);
        if (typeof callback === 'function') {
            // @ts-expect-error should work
            return nodeFS.stat.call(this, path, options as StatOptions | undefined, callback);
        }
        // @ts-expect-error should work
        return nodeFS.stat.call(this, path, options as (err: NodeJS.ErrnoException | null, stats: Stats) => void);
    }

    statSync(path: PathLike, options?: StatOptions): Stats {
        this.#checkProtected(path, true);
        return nodeFS.statSync.call(this, path, options);
    }

    utimes(path: PathLike, atime: TimeLike, mtime: TimeLike, callback?: NoParamCallback): void {
        this.#checkProtected(path, false);
        return nodeFS.utimes.call(this, path, atime, mtime, callback || ((_err: NodeJS.ErrnoException | null) => {}));
    }

    utimesSync(path: PathLike, atime: TimeLike, mtime: TimeLike): void {
        this.#checkProtected(path, false);
        return nodeFS.utimesSync.call(this, path, atime, mtime);
    }

    readdir(
        path: PathLike,
        options:
            | (ObjectEncodingOptions & {
                  withFileTypes: true;
                  recursive?: boolean | undefined;
              })
            | ((err: NodeJS.ErrnoException | null, files: Dirent<Buffer | string>[][]) => void),
        callback?: (err: NodeJS.ErrnoException | null, files: Dirent<Buffer | string>[]) => void,
    ): void {
        this.#checkProtected(path, true);
        if (typeof callback === 'function') {
            return nodeFS.readdir.call(
                this,
                path,
                options as ObjectEncodingOptions & {
                    encoding: 'buffer';
                    withFileTypes: true;
                    recursive?: boolean | undefined;
                },
                callback,
            );
        }
        // @ts-expect-error should work
        return nodeFS.readdir.call(this, path, options as (err: NodeJS.ErrnoException | null, files: Dirent[]) => void);
    }

    readdirSync(
        path: PathLike,
        options?: ObjectEncodingOptions & {
            withFileTypes: true;
            recursive?: boolean | undefined;
        },
    ): Dirent<Buffer | string>[] {
        this.#checkProtected(path, true);
        // @ts-expect-error should work
        return nodeFS.readdirSync.call(this, path, options);
    }

    createReadStream(path: PathLike, options?: BufferEncoding): ReadStream {
        this.#checkProtected(path, true);
        return nodeFS.createReadStream.call(this, path, options);
    }

    createWriteStream(path: PathLike, options?: BufferEncoding): WriteStream {
        this.#checkProtected(path, false);
        return nodeFS.createWriteStream.call(this, path, options);
    }

    lchmod(path: PathLike, mode: Mode, callback?: NoParamCallback): void {
        this.#checkProtected(path, false);
        return nodeFS.lchmod.call(this, path, mode, callback || ((_err: NodeJS.ErrnoException | null) => {}));
    }

    lchmodSync(path: PathLike, mode: Mode): void {
        this.#checkProtected(path, false);
        return nodeFS.lchmodSync.call(this, path, mode);
    }

    lchown(path: PathLike, uid: number, gid: number, callback?: NoParamCallback): void {
        this.#checkProtected(path, false);
        return nodeFS.lchown.call(this, path, uid, gid, callback || ((_err: NodeJS.ErrnoException | null) => {}));
    }

    lchownSync(path: PathLike, uid: number, gid: number): void {
        this.#checkProtected(path, false);
        return nodeFS.lchownSync.call(this, path, uid, gid);
    }

    link(existingPath: PathLike, newPath: PathLike, callback?: NoParamCallback): void {
        this.#checkProtected(existingPath, false);
        this.#checkProtected(newPath, false);
        return nodeFS.link.call(this, existingPath, newPath, callback || ((_err: NodeJS.ErrnoException | null) => {}));
    }

    linkSync(existingPath: PathLike, newPath: PathLike): void {
        this.#checkProtected(existingPath, false);
        this.#checkProtected(newPath, false);
        return nodeFS.linkSync.call(this, existingPath, newPath);
    }

    lstat(
        path: PathLike,
        options: StatOptions | undefined | ((err: NodeJS.ErrnoException | null, stats: Stats) => void),
        callback?: (err: NodeJS.ErrnoException | null, stats: Stats) => void,
    ): void {
        this.#checkProtected(path, true);
        if (typeof callback === 'function') {
            // @ts-expect-error should work
            return nodeFS.lstat.call(this, path, options as StatOptions | undefined, callback);
        }
        // @ts-expect-error should work
        return nodeFS.lstat.call(this, path, options as (err: NodeJS.ErrnoException | null, stats: Stats) => void);
    }

    lstatSync(path: PathLike, options?: StatOptions): Stats {
        this.#checkProtected(path, true);
        return nodeFS.lstatSync.call(this, path, options);
    }

    lutimes(path: PathLike, atime: TimeLike, mtime: TimeLike, callback?: NoParamCallback): void {
        this.#checkProtected(path, false);
        return nodeFS.lutimes.call(this, path, atime, mtime, callback || ((_err: NodeJS.ErrnoException | null) => {}));
    }

    lutimesSync(path: PathLike, atime: TimeLike, mtime: TimeLike): void {
        this.#checkProtected(path, false);
        return nodeFS.lutimesSync.call(this, path, atime, mtime);
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
        if (typeof callback === 'function') {
            // @ts-expect-error should work
            return nodeFS.mkdir.call(this, path, options as MakeDirectoryOptions & { recursive?: boolean }, callback);
        }
        return nodeFS.mkdir.call(this, path, options as (err: NodeJS.ErrnoException | null, path?: string) => void);
    }

    mkdirSync(
        path: PathLike,
        options?: MakeDirectoryOptions & {
            recursive: true;
        },
    ): string | undefined {
        this.#checkProtected(path, false);
        return nodeFS.mkdirSync.call(this, path, options);
    }

    mkdtemp(
        prefix: string,
        options: EncodingOption | ((err: NodeJS.ErrnoException | null, folder: string) => void),
        callback?: (err: NodeJS.ErrnoException | null, folder: string) => void,
    ): void {
        this.#checkProtected(prefix, false);
        if (typeof callback === 'function') {
            // @ts-expect-error should work
            return nodeFS.mkdtemp.call(this, prefix, options, callback);
        }
        return nodeFS.mkdtemp.call(
            this,
            prefix,
            options as (err: NodeJS.ErrnoException | null, folder: string) => void,
        );
    }

    mkdtempSync(prefix: string, options?: EncodingOption): string | Buffer {
        this.#checkProtected(prefix, false);
        return nodeFS.mkdtempSync.call(this, prefix, options);
    }

    rm(path: PathLike, options?: RmOptions | NoParamCallback, callback?: NoParamCallback): void {
        this.#checkProtected(path, false);
        if (typeof callback === 'function') {
            return nodeFS.rm.call(this, path, options as RmOptions, callback);
        }
        // @ts-expect-error should work
        return nodeFS.rm.call(this, path, options as NoParamCallback);
    }

    rmSync(path: PathLike, options?: RmOptions): void {
        this.#checkProtected(path, false);
        return nodeFS.rmSync.call(this, path, options);
    }

    rmdir(path: PathLike, options?: RmDirOptions | NoParamCallback, callback?: NoParamCallback): void {
        this.#checkProtected(path, false);
        if (typeof callback === 'function') {
            return nodeFS.rmdir.call(this, path, options as RmDirOptions, callback);
        }
        // @ts-expect-error should work
        return nodeFS.rmdir.call(this, path, options as NoParamCallback);
    }

    rmdirSync(path: PathLike, options?: RmDirOptions): void {
        this.#checkProtected(path, false);
        return nodeFS.rmdirSync.call(this, path, options);
    }

    watch(
        filename: PathLike,
        options?:
            | (WatchOptions & {
                  encoding: 'buffer';
              })
            | 'buffer'
            | WatchListener<string>,
        listener?: WatchListener<string>,
    ): FSWatcher {
        this.#checkProtected(filename, true);
        if (typeof listener === 'function') {
            // @ts-expect-error should work
            return nodeFS.watch.call(this, filename, options as WatchOptions & { encoding: 'buffer' }, listener);
        }

        return nodeFS.watch.call(this, filename, options as WatchListener<string>);
    }

    watchFile(filename: PathLike, listener: StatsListener): StatWatcher {
        this.#checkProtected(filename, true);
        return nodeFS.watchFile.call(this, filename, listener);
    }

    unwatchFile(filename: PathLike, listener: StatsListener | BigIntStatsListener): void {
        this.#checkProtected(filename, true);
        return nodeFS.unwatchFile.call(this, filename, listener as BigIntStatsListener);
    }
}
