// import all modules that are available in the sandbox
// this has a nice side effect that we may augment the global scope
import type * as os from 'node:os';
import type { ChildProcess, ExecException } from 'node:child_process';

export interface FsStats {
    isFile(): boolean;
    isDirectory(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isSymbolicLink(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
    dev: number;
    ino: number;
    mode: number;
    nlink: number;
    uid: number;
    gid: number;
    rdev: number;
    size: number;
    blksize: number;
    blocks: number;
    atimeMs: number;
    mtimeMs: number;
    ctimeMs: number;
    birthtimeMs: number;
    atime: Date;
    mtime: Date;
    ctime: Date;
    birthtime: Date;
}

declare const __brand: unique symbol;
type Brand<B> = { [__brand]: B };
export type Branded<T, B> = T & Brand<B>;

type SubscribeObject = {
    name: string;
    pattern: string;
    callback: (id: string, obj?: iobJS.Object | null) => void;
};

type EmptyCallback = () => void | Promise<void>;
type ErrorCallback = (err?: Error) => void | Promise<void>;
type GenericCallback<T> = (err?: Error | null, result?: T) => void | Promise<void>;
type SimpleCallback<T> = (result?: T) => void | Promise<void>;
type MessageCallback<T> = (data: T, callback: iobJS.MessageCallback) => void | Promise<void>;

type SecondParameterOf<T extends (...args: any[]) => any> = T extends (arg0: any, arg1: infer R, ...args: any[]) => any
    ? R
    : never;
/** Infers the return type from a callback-style API and strips out null and undefined */
type NonNullCallbackReturnTypeOf<T extends (...args: any[]) => any> = Exclude<SecondParameterOf<T>, null | undefined>;
/** Infers the return type from a callback-style API and leaves null and undefined in */
type CallbackReturnTypeOf<T extends (...args: any[]) => any> = SecondParameterOf<T>;

/** Returns a type that requires at least one of the properties from the given type */
type AtLeastOne<T, U = { [K in keyof T]-?: T[K] }> = { [K in keyof U]: { [P in K]: U[P] } }[keyof U];

/** Returns all possible keys of a union of objects */
type AllKeys<T> = T extends any ? keyof T : never;
/** Simplifies mapped types to their basic forms */
type Simplify<U> = U extends infer O ? { [K in keyof O]: O[K] } : never;

/** Takes an object type and adds all missing properties from the Keys union with the type `never` */
type AddMissingNever<T, Keys extends string | number | symbol> = {
    [K in Keys]: K extends keyof T ? T[K] : never;
};

/**
 * Takes a union of objects and returns an object type
 * which has all properties that exist on at least one of the objects.
 *
 * E.g. CombineObjectUnion<{a: 1} | {b: 2}> = {a: 1; b: 2};
 */
type CombineObjectUnion<
    T,
    Keys extends string | number | symbol = AllKeys<T>,
    O = T extends any ? AddMissingNever<T, Keys> : never,
> = Simplify<{ [K in Keys]: K extends keyof O ? O[K] : never }>;

/**
 * Takes a union of ioBroker Object types and returns a combined object type
 * which has all properties that could exist on at least one of the objects.
 *
 * Note: This is not entirely sound to work with, but better for JS and working with read objects
 */
type AnyOf<
    T,
    Keys extends string | number | symbol = AllKeys<T>,
    O = T extends any ? AddMissingNever<T, Keys> : never,
> = Simplify<{
    [K in Keys]: K extends keyof O
        ? O[K] extends any[]
            ? O[K]
            : O[K] extends Record<any, any>
              ? CombineObjectUnion<O[K]>
              : O[K]
        : never;
}>;

// tslint:disable:no-namespace
declare global {
    namespace iobJS {
        /** Two-way mapping for state quality ("q" attribute of a state) */
        interface STATE_QUALITY {
            /** The default value for a state */
            GOOD: 0x00;
            /** General problem */
            BAD: 0x01;
            /** The instance cannot establish a connection */
            CONNECTION_PROBLEM: 0x02;
            /** Substitute value from controller. Do not set this in adapters */
            SUBSTITUTE_FROM_CONTROLLER: 0x10;
            /** Quality for default values */
            SUBSTITUTE_INITIAL_VALUE: 0x20;
            /** Substitute value from instance or device */
            SUBSTITUTE_DEVICE_INSTANCE_VALUE: 0x40;
            /** Substitute value from a sensor */
            SUBSTITUTE_SENSOR_VALUE: 0x80;
            /** General problem by instance */
            GENERAL_INSTANCE_PROBLEM: 0x11;
            /** General problem by device */
            GENERAL_DEVICE_PROBLEM: 0x41;
            /** General problem by sensor */
            GENERAL_SENSOR_PROBLEM: 0x81;
            /** The instance is not connected */
            INSTANCE_NOT_CONNECTED: 0x12;
            /** The device is not connected */
            DEVICE_NOT_CONNECTED: 0x42;
            /** The sensor is not connected */
            SENSOR_NOT_CONNECTED: 0x82;
            /** The device has reported an error */
            DEVICE_ERROR_REPORT: 0x44;
            /** The sensor has reported an error */
            SENSOR_ERROR_REPORT: 0x84;
        }

        type StateValue = string | number | boolean | null;

        interface State {
            /** The value of the state. */
            val: StateValue;

            /** Direction flag: false for desired value and true for actual value. Default: false. */
            ack: boolean;

            /** Unix timestamp. Default: current time */
            ts: number;

            /** Unix timestamp of the last time the value changed */
            lc: number;

            /** Name of the adapter instance which set the value, e.g. "system.adapter.web.0" */
            from: string;

            /** The user who set this value */
            user?: string;

            /** Optional time in seconds after which the state is reset to null */
            expire?: number;

            /** Optional quality of the state value */
            q?: STATE_QUALITY[keyof STATE_QUALITY];

            /** Optional comment */
            c?: string;
        }

        type SettableState = AtLeastOne<State>;

        interface IdObject {
            device?: string;
            channel?: string;
            state?: string;
        }

        type Session = any; // TODO: implement

        /** Defines access rights for a single object type */
        interface ObjectOperationPermissions {
            /** Whether a user may enumerate objects of this type */
            list: boolean;
            /** Whether a user may read objects of this type */
            read: boolean;
            /** Whether a user may write objects of this type */
            write: boolean;
            /** Whether a user may create objects of this type */
            create: boolean;
            /** Whether a user may delete objects of this type */
            delete: boolean;
        }

        /** Defines the rights a user or group has to change objects */
        interface ObjectPermissions {
            /** The access rights for files */
            file: ObjectOperationPermissions;
            /** The access rights for objects */
            object: ObjectOperationPermissions;
            /** The access rights for users/groups */
            users: ObjectOperationPermissions;
            /** The access rights for states */
            state?: ObjectOperationPermissions;
        }
        /** Defined the complete set of access rights a user has */
        interface PermissionSet extends ObjectPermissions {
            /** The name of the user this ACL is for */
            user: string;
            /** The name of the groups this ACL was merged from */
            groups: string[];
            /** The access rights for certain commands */
            other: {
                execute: boolean;
                http: boolean;
                sendto: boolean;
            };
        }

        interface Permission {
            /** The type of the permission */
            type: string;
            /** Defines which kind of operation is required */
            operation: string;
        }
        interface ObjectOrStatePermission extends Permission {
            type: 'object' | 'file' | 'users' | 'state';
            operation: 'list' | 'read' | 'write' | 'create' | 'delete';
        }
        interface OtherPermission extends Permission {
            type: 'other';
            operation: 'execute' | 'http' | 'sendto';
        }
        interface CommandsPermissions {
            // TODO: Are all properties required or is a partial object ok?
            getObject: ObjectOrStatePermission;
            getObjects: ObjectOrStatePermission;
            getObjectView: ObjectOrStatePermission;
            setObject: ObjectOrStatePermission;
            subscribeObjects: ObjectOrStatePermission;
            unsubscribeObjects: ObjectOrStatePermission;
            getStates: ObjectOrStatePermission;
            getState: ObjectOrStatePermission;
            setState: ObjectOrStatePermission;
            getStateHistory: ObjectOrStatePermission;
            subscribe: ObjectOrStatePermission;
            unsubscribe: ObjectOrStatePermission;
            getVersion: Permission;
            httpGet: OtherPermission;
            sendTo: OtherPermission;
            sendToHost: OtherPermission;
            readFile: ObjectOrStatePermission;
            readFile64: ObjectOrStatePermission;
            writeFile: ObjectOrStatePermission;
            writeFile64: ObjectOrStatePermission;
            unlink: ObjectOrStatePermission;
            rename: ObjectOrStatePermission;
            mkdir: ObjectOrStatePermission;
            readDir: ObjectOrStatePermission;
            chmodFile: ObjectOrStatePermission;
            authEnabled: Permission;
            disconnect: Permission;
            listPermissions: Permission;
            getUserPermissions: ObjectOrStatePermission;
        }

        type UserGroup = any; // TODO find out how this looks like
        // interface UserGroup { }

        /** Contains information about a user */
        interface User {
            /** Which groups this user belongs to */
            groups: UserGroup[];
            /** Access rights of this user */
            acl: ObjectPermissions;
        }

        /** Parameters for adapter.getObjectView */
        interface GetObjectViewParams {
            /** First id to include in the return list */
            startkey?: string;
            /** Last id to include in the return list */
            endkey?: string;
            /** Whether docs should be included in the return list */ // TODO: What are docs?
            include_docs?: boolean;
        }

        /** Parameters for adapter.getObjectList */
        type GetObjectListParams = GetObjectViewParams;

        interface Logger {
            /** log a message with silly level */
            silly(message: string): void;
            /** log a message with debug level */
            debug(message: string): void;
            /** log a message with info level (default output level for all adapters) */
            info(message: string): void;
            /** log a message with warning severity */
            warn(message: string): void;
            /** log a message with error severity */
            error(message: string): void;

            /** Verbosity of the log output */
            level: LogLevel;
        }

        /** Log message */
        interface LogMessage {
            /** unique ID */
            _id: number;
            /** id of the source instance */
            from: string;
            /** log level */
            severity: string;
            /** timestamp */
            ts: number;
            /** actual content */
            message: string;
        }

        interface Certificates {
            /** private key file */
            key: string;
            /** public certificate */
            cert: string;
            /** chained CA certificates */
            ca?: string;
        }

        type MessagePayload = any;

        /** Callback information for a passed message */
        interface MessageCallbackInfo {
            /** The original message payload */
            message: MessagePayload;
            /** ID of this callback */
            id: number;
            /** If ack is false, it means the message is a request. If ack is true, it means the message is a response */
            ack: boolean;
            /** Timestamp of this message */
            time: number;
        }

        interface SendableMessage {
            /** The command to be executed */
            command: string;
            /** The message payload */
            message: MessagePayload;
            /** The source of this message */
            from: string;
            /** Callback information. This is set when the source expects a response */
            callback?: MessageCallbackInfo;
        }

        /** A message being passed between adapter instances */
        interface Message extends SendableMessage {
            /** ID of this message */
            _id: number;
        }

        type Log = any; // TODO: define this https://github.com/ioBroker/ioBroker.js-controller/blob/master/lib/states/statesInMemServer.js#L873

        type EnumList = string | string[];

        type Plugin = Record<string, any>; // TODO: Add definition

        interface DirectoryEntry {
            file: string;
            stats: FsStats;
            isDir: boolean;
            acl: any; // access control list object
            modifiedAt: number;
            createdAt: number;
        }

        interface GetHistoryOptions {
            instance?: string;
            /** Start time in ms */
            start?: number;
            /** End time in ms. If not defined, it is "now" */
            end?: number;
            /** Step in ms of intervals. Used in aggregate (max, min, average, total, ...)  */
            step?: number;
            /** number of values if aggregate is 'onchange' or number of intervals if other aggregate method. Count will be ignored if step is set, else default is 500 if not set */
            count?: number;
            /** if `from` field should be included in answer */
            from?: boolean;
            /** if `ack` field should be included in answer */
            ack?: boolean;
            /** if `q` field should be included in answer */
            q?: boolean;
            /** if `id` field should be included in answer */
            addId?: boolean;
            /** do not return more entries than limit */
            limit?: number;
            /** round result to number of digits after decimal point */
            round?: number;
            /** if null values should be included (false), replaced by last not null value (true) or replaced with 0 (0) */
            ignoreNull?: boolean | 0;
            /** This number will be returned in answer, so the client can assign the request for it */
            sessionId?: number;
            /** aggregate method (Default: 'average') */
            aggregate?:
                | 'onchange'
                | 'minmax'
                | 'min'
                | 'max'
                | 'average'
                | 'total'
                | 'count'
                | 'none'
                | 'percentile'
                | 'quantile'
                | 'integral'
                | 'integralTotal';
            /** Returned data is normally sorted ascending by date, this option lets you return the newest instead of the oldest values if the number of returned points is limited */
            returnNewestEntries?: boolean;
            /** By default, the additional border values are returned to optimize charting. Set this option to true if this is not wanted (e.g., for script data processing) */
            removeBorderValues?: boolean;
            /** when using aggregate method `percentile` defines the percentile level (0..100)(defaults to 50) */
            percentile?: number;
            /** when using aggregate method `quantile` defines the quantile level (0..1)(defaults to 0.5) */
            quantile?: number;
            /** when using aggregate method `integral` defines the unit in seconds (defaults to 60 seconds). E.g., to get integral in hours for Wh or such, set to 3600. */
            integralUnit?: number;
            /** when using aggregate method `integral` defines the interpolation method (defaults to `none`). */
            integralInterpolation?: 'none' | 'linear';
            /** If user is set, it will be checked if this user may read the variable */
            user?: `system.user.${string}`;
        }

        interface DelObjectOptions {
            /** Whether all child objects should be deleted as well */
            recursive?: boolean;
            // Allow non-documented properties
            [other: string]: unknown;
        }

        interface ExtendObjectOptionsPreserve {
            [prop: string]: ExtendObjectOptionsPreserve | boolean | string[];
        }

        interface ExtendObjectOptions {
            /** Which properties of the original object should be preserved */
            preserve?: ExtendObjectOptionsPreserve;
            // Allow non-documented properties
            [other: string]: unknown;
        }

        /** Predefined notification scopes and their categories */
        interface NotificationScopes {
            system:
                | 'memIssues'
                | 'fsIoErrors'
                | 'noDiskSpace'
                | 'accessErrors'
                | 'nonExistingFileErrors'
                | 'remoteHostErrors'
                | 'restartLoop'
                | 'fileToJsonl';
            [other: string]: string;
        }

        /** Additional context for the notification which can be used by notification processing adapters */
        interface NotificationContextData {
            /** Use a `key` specific to the adapter or if a feature is supported by all adapters of a type, the type (e.g. `messaging`) is also fine. */
            [adapterNameOrAdapterType: string]: unknown;
        }

        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        interface AdapterConfig {
            // This is a stub to be augmented in every adapter
        }

        type ReadyHandler = () => void | Promise<void>;
        type ObjectChangeHandler = (id: string, obj: iobJS.Object | null | undefined) => void | Promise<void>;
        type OriginalStateChangeHandler = (id: string, obj: State | null | undefined) => void | Promise<void>;
        type OriginalFileChangeHandler = (id: string, fileName: string, size: number | null) => void;
        type MessageHandler = (obj: Message) => void | Promise<void>;
        type UnloadHandler = (callback: EmptyCallback) => void | Promise<void>;
        type ErrorHandler = (err: Error) => boolean;

        type EmptyCallback = () => void;
        type ErrorCallback = (err?: Error | null) => void;
        /** Special variant of ErrorCallback for methods where Node.js returns an ErrnoException */
        type ErrnoCallback = (err?: NodeJS.ErrnoException | null) => void;
        // TODO: Redefine callbacks as subclass of GenericCallback
        type GenericCallback<T> = (err?: Error | null, result?: T) => void;

        /** Due to backward compatibility first param can be result or error */
        type OriginalMessageCallback = (response?: Message | Error) => void;

        type OriginalSetObjectCallback = (err?: Error | null, obj?: { id: string }) => void;
        type OriginalSetObjectPromise = Promise<NonNullCallbackReturnTypeOf<OriginalSetObjectCallback>>;

        type GetEnumCallback = (err?: Error | null, enums?: Record<string, EnumObject>, requestedEnum?: string) => void;
        type GetEnumsCallback = (
            err?: Error | null,
            result?: {
                [groupName: string]: Record<string, EnumObject>;
            },
        ) => void;
        type GetEnumsPromise = Promise<NonNullCallbackReturnTypeOf<GetEnumsCallback>>;

        type GetObjectsCallback = (err?: Error | null, objects?: Record<string, iobJS.Object>) => void;
        type GetObjectsPromise = Promise<NonNullCallbackReturnTypeOf<GetObjectsCallback>>;

        type GetObjectsCallbackTyped<T extends ObjectType> = (
            err?: Error | null,
            objects?: Record<string, iobJS.AnyObject & { type: T }>,
        ) => void;
        type GetObjectsPromiseTyped<T extends ObjectType> = Promise<
            NonNullCallbackReturnTypeOf<GetObjectsCallbackTyped<T>>
        >;

        type FindObjectCallback = (
            /** If an error happened, this contains the message */
            err?: Error | null,
            /** If an object was found, this contains the ID */
            id?: string,
            /** If an object was found, this contains the common.name */
            name?: StringOrTranslated,
        ) => void;

        // This is a version used by GetDevices/GetChannelsOf/GetStatesOf
        type GetObjectsCallback3<T extends BaseObject> = (err?: Error | null, result?: T[]) => void;

        type SecondParameterOf<T extends (...args: any[]) => any> = T extends (
            arg0: any,
            arg1: infer R,
            ...args: any[]
        ) => any
            ? R
            : never;
        /** Infers the return type from a callback-style API and strips out null and undefined */
        type NonNullCallbackReturnTypeOf<T extends (...args: any[]) => any> = Exclude<
            SecondParameterOf<T>,
            null | undefined
        >;
        /** Infers the return type from a callback-style API and leaves null and undefined in */
        type CallbackReturnTypeOf<T extends (...args: any[]) => any> = SecondParameterOf<T>;

        type OriginalGetStateCallback = (err?: Error | null, state?: State | null) => void;
        type GetStatePromise = Promise<CallbackReturnTypeOf<OriginalGetStateCallback>>;

        type GetStatesCallback = (err?: Error | null, states?: Record<string, State>) => void;
        type GetStatesPromise = Promise<NonNullCallbackReturnTypeOf<GetStatesCallback>>;

        type SetStateCallback = (err?: Error | null, id?: string) => void;
        type SetStatePromise = Promise<NonNullCallbackReturnTypeOf<SetStateCallback>>;

        type SetStateChangedCallback = (err?: Error | null, id?: string, notChanged?: boolean) => void;
        type SetStateChangedPromise = Promise<NonNullCallbackReturnTypeOf<SetStateChangedCallback>>;

        type DeleteStateCallback = (err?: Error | null, id?: string) => void;

        type GetHistoryResult = Array<State & { id?: string }>;
        type GetHistoryCallback = (
            err: Error | null,
            result?: GetHistoryResult,
            step?: number,
            sessionId?: number,
        ) => void;

        /** Contains the return values of readDir */
        interface ReadDirResult {
            /** Name of the file or directory */
            file: string;
            /** File system stats */
            stats: Partial<FsStats>;
            /** Whether this is a directory or a file */
            isDir: boolean;
            /** Access rights */
            acl?: EvaluatedFileACL;
            /** Date of last modification */
            modifiedAt?: number;
            /** Date of creation */
            createdAt?: number;
        }
        type ReadDirCallback = (err?: NodeJS.ErrnoException | null, entries?: ReadDirResult[]) => void;
        type ReadDirPromise = Promise<ReadDirResult[]>;

        type OriginalReadFileCallback = (
            err?: NodeJS.ErrnoException | null,
            data?: Buffer | string,
            mimeType?: string,
        ) => void;
        type OriginalReadFilePromise = Promise<{ file: string | Buffer; mimeType?: string }>;

        /** Contains the return values of chownFile */
        interface ChownFileResult {
            /** The parent directory of the processed file or directory */
            path: string;
            /** Name of the file or directory */
            file: string;
            /** File system stats */
            stats: FsStats;
            /** Whether this is a directory or a file */
            isDir: boolean;
            /** Access rights */
            acl: FileACL;
            /** Date of last modification */
            modifiedAt: number;
            /** Date of creation */
            createdAt: number;
        }
        type ChownFileCallback = (err?: NodeJS.ErrnoException | null, processed?: ChownFileResult[]) => void;

        /** Contains the return values of rm */
        interface RmResult {
            /** The parent directory of the deleted file or directory */
            path: string;
            /** The name of the deleted file or directory */
            file: string;
        }
        type RmCallback = (err?: NodeJS.ErrnoException | null, entries?: RmResult[]) => void;

        type ChownObjectCallback = (err?: NodeJS.ErrnoException | null, list?: iobJS.Object[]) => void;

        type GetKeysCallback = (err?: Error | null, list?: string[]) => void;

        interface GetObjectViewItem<T extends AnyObject> {
            /** The ID of this object */
            id: T['_id'];
            /** A copy of the object from the DB */
            value: T;
        }
        type GetObjectViewCallback<T extends AnyObject> = (
            err?: Error | null,
            result?: { rows: Array<GetObjectViewItem<T>> },
        ) => void;
        type GetObjectViewPromise<T extends AnyObject> = Promise<NonNullCallbackReturnTypeOf<GetObjectViewCallback<T>>>;

        interface GetObjectListItem<T extends AnyObject> extends GetObjectViewItem<T> {
            /** A copy of the object */
            value: T;
            /** The same as @link{value} */
            doc: T;
        }
        type GetObjectListCallback<T extends iobJS.AnyObject> = (
            err?: Error | null,
            result?: { rows: GetObjectListItem<T>[] },
        ) => void;
        type GetObjectListPromise = Promise<NonNullCallbackReturnTypeOf<GetObjectListCallback<iobJS.Object>>>;

        type ExtendObjectCallback = (
            err?: Error | null,
            result?: { id: string; value: iobJS.Object },
            id?: string,
        ) => void;

        type GetSessionCallback = (session: Session) => void;

        type Timeout = Branded<number, 'Timeout'> | null; // or null to not allow native clearTimeout
        type Interval = Branded<number, 'Interval'> | null; // or null to not allow native clearInterval

        /** Defines access rights for a single file */
        interface FileACL {
            /** Full name of the user who owns this file, e.g. "system.user.admin" */
            owner: string;
            /** Full name of the group who owns this file, e.g. "system.group.administrator" */
            ownerGroup: string;
            /** Linux-type permissions defining access to this file */
            permissions: number;
        }

        /** Defines access rights for a single file, applied to a user or group */
        interface EvaluatedFileACL extends FileACL {
            /** Whether the user may read the file */
            read: boolean;
            /** Whether the user may write the file */
            write: boolean;
        }

        /** Defines access rights for a single object */
        interface ObjectACL {
            /** Full name of the user who owns this object, e.g. "system.user.admin" */
            owner: string;
            /** Full name of the group who owns this object, e.g. "system.group.administrator" */
            ownerGroup: string;
            /** Linux-type permissions defining access to this object */
            object: number;
        }

        /** Defines access rights for a single state object */
        interface StateACL extends ObjectACL {
            /** Linux-type permissions defining access to this state */
            state: number;
        }

        /** Defines the existing object types in ioBroker */
        type ObjectType =
            | 'state'
            | 'channel'
            | 'device'
            | 'folder'
            | 'enum'
            | 'adapter'
            | 'config'
            | 'group'
            | 'host'
            | 'instance'
            | 'meta'
            | 'script'
            | 'user'
            | 'chart'
            | 'schedule'
            | 'design';

        // Define the naming schemes for objects, so we can provide more specific types for get/setObject
        namespace ObjectIDs {
            // Guaranteed meta objects
            type Meta =
                | `${string}.${number}`
                | `${string}.${'meta' | 'admin'}`
                | `${string}.meta.${string}`
                | `${string}.${number}.meta.${string}`;

            // Unsure, can be folder, device, channel or state
            // --> We need this match to avoid matching the more specific types below
            type Misc = `system.host.${string}.${string}` | `0_userdata.0.${string}`;

            // Guaranteed channel objects
            type Channel = `script.js.${'common' | 'global'}` | `${string}.${number}.info`;
            // Either script or channel object
            type ScriptOrChannel = `script.js.${string}`;
            // Guaranteed state objects
            type State = `system.adapter.${string}.${number}.${string}`;
            // Guaranteed enum objects
            type Enum = `enum.${string}`;
            // Guaranteed instance objects
            type Instance = `system.adapter.${string}.${number}`;
            // Guaranteed adapter objects
            type Adapter = `system.adapter.${string}` | `system.host.${string}.adapter.${string}`;
            // Guaranteed group objects
            type Group = `system.group.${string}`;
            // Guaranteed user objects
            type User = `system.user.${string}`;
            // Guaranteed host objects
            type Host = `system.host.${string}`;
            // Guaranteed repository object
            type Repository = 'system.repositories';
            // Guaranteed config objects
            type Config = 'system.certificates';
            // Guaranteed system config objects
            type SystemConfig = 'system.config';
            // Guaranteed design objects
            type Design = `_design/${string}`;

            // Unsure, can be folder, device, channel or state (or whatever an adapter does)
            type AdapterScoped = `${string}.${number}.${string}`;

            /** All possible typed object IDs */
            type Any =
                | Meta
                | Misc
                | Channel
                | ScriptOrChannel
                | State
                | Enum
                | Instance
                | Adapter
                | Group
                | User
                | Host
                | Config
                | AdapterScoped;
        }

        type ObjectIdToObjectType<T extends string, Read extends 'read' | 'write' = 'read'> =
            // State must come before Adapter or system.adapter.admin.0.foobar will resolve to AdapterObject
            T extends ObjectIDs.State
                ? StateObject
                : // Instance and Adapter must come before meta or `system.adapter.admin` will resolve to MetaObject
                  T extends ObjectIDs.Instance
                  ? InstanceObject
                  : T extends ObjectIDs.Adapter
                    ? AdapterObject
                    : T extends ObjectIDs.Channel
                      ? ChannelObject
                      : T extends ObjectIDs.Meta
                        ? MetaObject
                        : T extends ObjectIDs.Misc
                          ? AdapterScopedObject
                          : T extends ObjectIDs.ScriptOrChannel
                            ? ScriptObject | ChannelObject
                            : T extends ObjectIDs.Enum
                              ? EnumObject
                              : T extends ObjectIDs.Group
                                ? GroupObject
                                : T extends ObjectIDs.User
                                  ? UserObject
                                  : T extends ObjectIDs.Host
                                    ? HostObject
                                    : T extends ObjectIDs.Design
                                      ? DesignObject
                                      : T extends ObjectIDs.Repository
                                        ? RepositoryObject
                                        : T extends ObjectIDs.SystemConfig
                                          ? SystemConfigObject
                                          : T extends ObjectIDs.Config
                                            ? OtherObject & { type: 'config' }
                                            : T extends ObjectIDs.AdapterScoped
                                              ? AdapterScopedObject
                                              : Read extends 'read'
                                                ? iobJS.Object
                                                : AnyObject;

        type Languages = 'en' | 'de' | 'ru' | 'pt' | 'nl' | 'fr' | 'it' | 'es' | 'pl' | 'uk' | 'zh-cn';
        type Translated = { en: string } & { [lang in Languages]?: string };

        /** For objects, we require the English language to be present */
        type StringOrTranslated = string | Translated;

        type CommonType = 'number' | 'string' | 'boolean' | 'array' | 'object' | 'mixed';

        interface ObjectCommon {
            /** The name of this object as a simple string or an object with translations */
            name: StringOrTranslated;

            /** Description of this object */
            desc?: StringOrTranslated;

            /** When set to true, this object may not be deleted */
            dontDelete?: true;

            /** When set to true, this object is only visible when expert mode is turned on in admin */
            expert?: true;
            /** Color attribute used in UI */
            color?: string;

            // Icon and role aren't defined in SCHEMA.md,
            // but they are being used by some adapters
            /** Icon for this object */
            icon?: string;
            /** role of the object */
            role?: string;
        }

        interface StateCommon extends ObjectCommon {
            /** Type of this state. See https://github.com/ioBroker/ioBroker/blob/master/doc/SCHEMA.md#state-commonrole for a detailed description */
            type: CommonType;
            /** minimum value */
            min?: number;
            /** maximum value */
            max?: number;
            /** allowed interval for numeric values */
            step?: number;
            /** unit of the value */
            unit?: string;

            /** if this state is readable */
            read: boolean;
            /** if this state is writable */
            write: boolean;
            /** role of the state (used in user interfaces to indicate which widget to choose) */
            role: string;

            /** the default value */
            def?: any;
            /** the default status of the ack flag */
            defAck?: boolean;

            /** Configures this state as an alias for another state */
            alias?: {
                /** The target state id */
                id:
                    | string
                    | {
                          read: string;
                          write: string;
                      };
                /** An optional conversion function when reading, e.g. `"(val − 32) * 5/9"` */
                read?: string;
                /** An optional conversion function when reading, e.g. `"(val * 9/5) + 32"` */
                write?: string;
            };

            /**
             * Dictionary of possible values for this state in the form
             * ```jsonc
             * {
             *     "internal value 1": "displayed value 1",
             *     "internal value 2": "displayed value 2",
             *     // ...
             * }
             * ```
             *
             * or as an array:
             * ```jsonc
             * [ "value 1", "value 2", // ... ]
             * ```
             *
             * In old ioBroker versions, this could also be a string of the form
             * `"val1:text1;val2:text2"` (now deprecated)
             */
            states?: Record<string, string> | string[] | string;

            /** ID of a helper state indicating if the handler of this state is working */
            workingID?: string;

            /** attached history information */
            history?: any;

            /** Custom settings for this state */
            custom?: Record<string, any>;

            /** Custom defined properties for backward compatibility of material adapter */
            material?: any;

            /** Custom defined properties for backward compatibility of habpanel adapter */
            habpanel?: any;

            /** Custom defined properties for backward compatibility of habpanel adapter */
            mobile?: any;

            /**
             * Settings for IOT adapters and how the state should be named in e.g., Alexa.
             * The string "ignore" (deprecated please use boolean `false` instead) or boolean value `false` is a special case, causing the state to be ignored.
             * A value of `null` means that the device should be removed by the IOT adapters
             */
            smartName?:
                | null
                | false
                | string
                | ({ [lang in Languages]?: string } & {
                      /** Which kind of device it is */
                      smartType?: string | null;
                      /** Which value to set when the ON command is issued */
                      byON?: string | null;
                  });
        }

        interface ChannelCommon extends ObjectCommon {
            // Make it possible to narrow the object type using the custom property
            custom?: undefined;
        }

        interface DeviceCommon extends ObjectCommon {
            statusStates?: {
                /** State, which is truthy if a device is online */
                onlineId?: string;
                /** State, which is truthy if a device is offline */
                offlineId?: string;
                /** State, which is truthy if a device is in error state */
                errorId?: string;
            };
            // Make it possible to narrow the object type using the custom property
            custom?: undefined;
        }

        interface ScheduleCommon extends ObjectCommon {
            enabled?: boolean;
            // Make it possible to narrow the object type using the custom property
            custom?: undefined;
        }

        interface RepositoryCommon extends ObjectCommon {
            custom?: undefined;
        }

        interface ChartCommon extends ObjectCommon {
            enabled?: boolean;
            // Make it possible to narrow the object type using the custom property
            custom?: undefined;
        }

        interface EnumCommon extends ObjectCommon {
            /** The IDs of the enum members */
            members?: string[];

            // Make it possible to narrow the object type using the custom property
            custom?: undefined;
        }

        interface MetaCommon extends ObjectCommon {
            // Can be of type `user` for folders, where a user can store files or `folder` for adapter internal structures
            type: 'meta.user' | 'meta.folder';

            // Make it possible to narrow the object type using the custom property
            custom?: undefined;
        }

        type InstanceMode = 'none' | 'daemon' | 'schedule' | 'once' | 'extension';

        interface AdminUi {
            /** UI type of config page inside admin UI */
            config: 'html' | 'json' | 'materialize' | 'none';
            /** UI type of custom tab inside admin UI */
            custom?: 'json';
            /** UI type of tab inside admin UI */
            tab?: 'html' | 'json' | 'materialize';
        }

        /** Installed from attribute of instance/adapter object */
        type InstalledFrom = Branded<string, 'InstalledFrom'>;

        interface InstanceCommon extends AdapterCommon {
            version: string;
            /** The name of the host where this instance is running */
            host: string;
            enabled: boolean;
            /** How and when this instance should be started */
            mode: InstanceMode;
            /**
             * The starting priority of this adapter:
             * - **1:** Logic adapters
             * - **2:** Data providers
             * - **3:** All other adapters
             */
            tier?: 1 | 2 | 3;
            /** Variables of this adapter must be subscribed with sendTo to enable updates */
            subscribable?: boolean;
            /** If compact mode is supported */
            compact?: boolean;
            /** If compact mode is active */
            runAsCompactMode?: boolean;
            /** Active compact group, instances in this group will be started in one process */
            compactGroup?: number;
            /** String (or array) with names of attributes in common of instance, which will not be deleted. */
            preserveSettings?: string | string[];
            /** Source, where this adapter has been installed from, to enable reinstalling on e.g., backup restore */
            installedFrom?: InstalledFrom;
            /** Arguments passed to the adapter process, this disables compact mode */
            nodeProcessParams?: string[];
            /** If adapter can consume log messages, like admin, javascript or logparser */
            logTransporter?: boolean;
            /** Optional memory limit for this instance */
            memoryLimitMB?: number;
            // Make it possible to narrow the object type using the custom property
            custom?: undefined;
        }

        interface HostCommon extends ObjectCommon {
            /** The display name of this host */
            name: string;
            /** Changeable name of the host */
            title: string;
            /** base64 encoded icon */
            icon?: string;
            installedVersion: string; // e.g. 1.2.3 (following semver)
            /** The command line of the executable */
            cmd: string;
            hostname: string;
            /** An array of IP addresses this host exposes */
            address: string[]; // IPv4 or IPv6

            type: 'js-controller';
            platform: 'Javascript/Node.js';

            // Make it possible to narrow the object type using the custom property
            custom?: undefined;
        }

        interface HostNative {
            process: {
                title: string;
                versions: NodeJS.ProcessVersions;
                env: NodeJS.ProcessEnv;
            };
            os: {
                hostname: string;
                type: ReturnType<(typeof os)['type']>;
                platform: ReturnType<(typeof os)['platform']>;
                arch: ReturnType<(typeof os)['arch']>;
                release: ReturnType<(typeof os)['release']>;
                endianness: ReturnType<(typeof os)['endianness']>;
                tmpdir: ReturnType<(typeof os)['tmpdir']>;
            };
            hardware: {
                /** Return value of os.cpu but property `times` could be removed from every entry */
                cpus: (Omit<ReturnType<(typeof os)['cpus']>[number], 'times'> &
                    Partial<Pick<ReturnType<(typeof os)['cpus']>[number], 'times'>>)[];
                totalmem: ReturnType<(typeof os)['totalmem']>;
                networkInterfaces: ReturnType<(typeof os)['networkInterfaces']>;
            };
        }

        interface UserCommon extends ObjectCommon {
            /** The username */
            name: StringOrTranslated;
            /** The hashed password */
            password: string;
            /** Whether this user is enabled */
            enabled: boolean;

            // Make it possible to narrow the object type using the custom property
            custom?: undefined;
        }

        interface GroupCommon extends ObjectCommon {
            /** The name of this group */
            name: StringOrTranslated;
            /** The users of this group */
            members: ObjectIDs.User[]; // system.user.name, ...
            /** The default permissions of this group */
            acl: Omit<PermissionSet, 'user' | 'groups'>;
            /** A group can be disabled, if missing, a group is active */
            enabled?: boolean;
            // Make it possible to narrow the object type using the custom property
            custom?: undefined;
        }

        interface ScriptCommon extends ObjectCommon {
            name: string;
            /** Defines the type of the script, e.g., TypeScript/ts, Javascript/js or Blockly */
            engineType: 'TypeScript/ts' | 'Blockly' | 'Rules' | 'Javascript/js';
            /** The instance id of the instance which executes this script */
            engine: string;
            /** The source code of this script */
            source: string;
            debug: boolean;
            verbose: boolean;
            /** Whether this script should be executed */
            enabled: boolean;
            /** Is used to determine whether a script has changed and needs to be recompiled */
            sourceHash?: string;
            /** If the script uses a compiled language like TypeScript, this contains the compilation output */
            compiled?: string;
            /** If the script uses a compiled language like TypeScript, this contains the generated declarations (global scripts only) */
            declarations?: string;

            // Make it possible to narrow the object type using the custom property
            custom?: undefined;
        }

        type WelcomeScreenEntry =
            | string
            | {
                  link: string;
                  name: string;
                  img: string;
                  color: string;
                  order?: number;
              };

        /**
         * Object which defines if the adapter supports receiving messages via sendTo.
         * Additionally, it defines if specific messages are supported.
         * If one property is enabled, the object `system.adapter.<adapterName>.<adapterInstance>.messagebox will be created to send messages to the adapter (used for email, pushover, etc...)
         */
        interface SupportedMessages {
            /** If custom messages are supported (same as legacy messagebox) */
            custom?: boolean;
            /** If notification handling is supported, for information, see https://github.com/foxriver76/ioBroker.notification-manager#requirements-for-messaging-adapters */
            notifications?: boolean;
            /** If adapter supports signal stopInstance. Use number if you need more than 1000 ms for stop routine. The signal will be sent before stop to the adapter. (used if problems occurred with SIGTERM). */
            stopInstance?: boolean | number;
            /** If adapter supports the device manager and thus responds to the corresponding messages */
            deviceManager?: boolean;
            /** If adapter supports getHistory message. */
            getHistory?: boolean;
        }

        type AutoUpgradePolicy = 'none' | 'patch' | 'minor' | 'major';

        interface VisWidget {
            i18n: 'component' | true | Translated;
            name: string;
            url: string;
            components: string[];
            /** The vis widget does not support the listed major versions of vis */
            ignoreInVersions: number[];
        }

        type PaidLicenseType = 'paid' | 'commercial' | 'limited';

        interface LicenseInformationFree {
            /** License of the software */
            license?: string;
            /** Use 'paid' for adapters which do not work without a paid license. Use 'commercial' for adapters which require a license for commercial use only. Use 'limited' if some functionalities are not available without a paid license. */
            type: 'free';
            /**
             * Hyperlink, where information about the license can be found. For non-free licenses, the linked page should contain information about free features (if applicable), time of validity, link to shop and seller information.
             * This is required if the license type is different from 'free'. For 'free' licenses, an optional link to the license file can be placed here.
             */
            link?: string;
        }

        interface LicenseInformationWithPayment {
            /** License of the software */
            license?: string;
            /** Use 'paid' for adapters which do not work without a paid license. Use 'commercial' for adapters which require a license for commercial use only. Use 'limited' if some functionalities are not available without a paid license. */
            type: PaidLicenseType;
            /**
             * Hyperlink, where information about the license can be found. For non-free licenses, the linked page should contain information about free features (if applicable), time of validity, link to shop and seller information.
             * This is required if the license type is different from 'free'. For 'free' licenses, an optional link to the license file can be placed here.
             */
            link: string;
        }

        type LicenseInformation = LicenseInformationFree | LicenseInformationWithPayment;

        interface MessageRule {
            /** The message title */
            title: iobJS.Translated;
            /** The message content */
            text: iobJS.Translated;
            /** Optional link */
            link?: string;
            /** Text of the link */
            linkText?: iobJS.Translated;
            /** The severity level of the message */
            level: 'warn' | 'error' | 'info';
            /** The buttons which should be shown on the message dialog */
            buttons?: ('agree' | 'cancel' | 'ok')[];
            /** The condition which needs to be met to display the message */
            condition: {
                operand: 'and' | 'or';
                rules: string[];
            };
        }

        interface CustomAdminColumn {
            path: string;
            name?: iobJS.StringOrTranslated;
            objTypes?: ObjectType | ObjectType[];
            width?: number;
            edit?: boolean;
            type?: CommonType;
            align?: 'left' | 'center' | 'right';
        }

        type ConnectionType = 'local' | 'cloud';

        type LocalLink = {
            /** Link to the web service of this adapter, like: "%web_protocol%://%ip%:%web_port%/vis-2/edit.html" */
            link: string;
            /** Name of the link. Could be multi-language */
            name?: iobJS.StringOrTranslated;
            /** Color */
            color?: string;
            /** Link to icon, like "vis-2/img/favicon.png" */
            icon?: string;
            /** Link to the adapter if it could be shown in the free cloud, like: vis-2/index.html according to "https://iobroker.net/" */
            cloud?: string;
            /** Link to the adapter if it could be shown in the pro-cloud, like: vis-2/edit.html according to "https://iobroker.pro/" */
            pro?: string;
            /** If this link should be shown on the intro tab in admin. false = do not show */
            intro?: boolean;
            /** Order of the card. Used on "intro" and cloud tabs to sort the links */
            order?: number;
            /** Description of the link. Could be multi-language */
            description?: iobJS.StringOrTranslated;
        };

        /** Format for local and global dependencies */
        type Dependencies = { [adapterName: string]: string }[] | string[];

        interface AdapterCommon extends ObjectCommon {
            /** Custom attributes to be shown in admin in the object browser */
            adminColumns?: string | (string | CustomAdminColumn)[];
            /** Type of the admin UI */
            adminUI?: AdminUi;
            /** Settings for custom Admin Tabs */
            adminTab?: {
                name?: StringOrTranslated;
                /** Base 64 icon for the tab */
                icon?: string;
                /** @deprecated icon name for FontAwesome (works only in admin 4)*/
                'fa-icon'?: string;
                /** If true, the Tab is not reloaded when the configuration changes */
                ignoreConfigUpdate?: boolean;
                /** Describes which URL should be loaded in the tab. Supports placeholders like http://%ip%:%port% or JSON(5) configs. If empty `adapter/ADAPTERNAME/tab(_m).html` will be taken. JSON config file must be defined relative to "admin" folder, like "jsonTab.json"  */
                link?: string;
                /** If true, only one instance of this tab will be created for all instances */
                singleton?: boolean;
                /** Order number in admin tabs */
                order?: number;
            };
            /** If the mode is `schedule`, start one time adapter by ioBroker start, or by the configuration changes */
            allowInit?: boolean;
            /** If the adapter should be automatically upgraded and which version ranges are supported */
            automaticUpgrade?: AutoUpgradePolicy;
            /** Possible values for the instance mode (if more than one is possible) */
            availableModes?: InstanceMode[];
            /** Array which lists all blocked versions. Blocked versions will not be started. Use semver notation to specify the version ranges. The information is always used from the io-package.json in the GitHub repository. */
            blockedVersions?: string[];
            /** Whether this adapter includes custom blocks for Blockly. If true, `admin/blockly.js` must exist. */
            blockly?: boolean;
            /** Where the adapter will get its data from. Set this together with @see dataSource */
            connectionType?: ConnectionType;
            /** If true, this adapter can be started in compact mode (in the same process as other adapters) */
            compact?: boolean;
            /** The directory relative to iobroker-data where the adapter stores the data. Supports the placeholder `%INSTANCE%`. This folder will be backed up and restored automatically. */
            dataFolder?: string;
            /** How the adapter will mainly receive its data. Set this together with @see connectionType */
            dataSource?: 'poll' | 'push' | 'assumption';
            /** A record of ioBroker adapters (including "js-controller") and version ranges which are required for this adapter on the same host. */
            dependencies?: Dependencies;
            /** A record of ioBroker adapters (including "js-controller") and version ranges which are required for this adapter in the whole system. */
            globalDependencies?: Dependencies;
            /** Similar to `dependencies`, but only checked if the specified adapter is already installed. If the adapter is not installed, the version check will pass */
            ifInstalledDependencies?: { [adapterName: string]: string };
            /** Which files outside the README.md have documentation for the adapter */
            docs?: Partial<Record<Languages, string | string[]>>;
            /** Whether new instances should be enabled by default. *Should* be `false`! */
            enabled: boolean;
            /** If true, all previous data in the target directory (web) should be deleted before uploading */
            eraseOnUpload?: boolean;
            /** URL of an external icon that is shown for adapters that are not installed */
            extIcon?: string;
            /** Whether this adapter responds to `getHistory` messages */
            getHistory?: boolean;
            /** Filename of the local icon which is shown for installed adapters. Should be located in the `admin` directory */
            icon?: string;
            /** The adapter will be executed once additionally after installation, and the `install` event will be emitted during this run. This allows for executing one time installation code. */
            install?: boolean;
            /** Source, where this adapter has been installed from, to enable reinstalling on e.g., backup restore */
            installedFrom?: InstalledFrom;
            /** Shows which version of this adapter is installed */
            installedVersion: string;
            /** Keywords are used by search in admin. Do not write ioBroker here */
            keywords?: string[];
            /** A dictionary of links to web services this adapter provides */
            localLinks?: Record<string, string | LocalLink>;
            /** @deprecated Use @see localLinks */
            localLink?: string;
            /** Default log level for this adapter. It can be changed for every instance separately */
            loglevel?: LogLevel;
            /** Whether this adapter receives logs from other hosts and adapters (e.g., to store them somewhere) */
            logTransporter?: boolean;
            /** Path to the start file of the adapter. Should be the same as in `package.json` */
            main?: string;
            /** Whether the admin tab is written in materialized style. Required for Admin 3+ */
            materializeTab?: boolean;
            /** Whether the admin configuration dialog is written in materialized style. Required for Admin 3+ */
            materialize: boolean;
            /** @deprecated Use @see supportedMessages up from controller v5 */
            messagebox?: true;
            /** Messages which are supported by the adapter, supportedMessages.custom: true is the equivalent to messagebox: true */
            supportedMessages?: SupportedMessages;
            /** Running mode: `none`, `daemon`, `schedule`, `once`, `extension` */
            mode: InstanceMode;
            /** Name of the adapter (without leading `ioBroker.`) */
            name: string;
            /** News per version in i18n */
            news?: { [version: string]: Translated };
            /** If `true`, no configuration dialog will be shown */
            noConfig?: true;
            /** If `true`, this adapter's instances will not be shown in the admin overview screen. Useful for icon sets and widgets... */
            noIntro?: true;
            /** Set to `true` if the adapter is not available in the official ioBroker repositories. */
            noRepository?: true;
            /** If `true`, manual installation from GitHub is not possible */
            nogit?: true;
            /** If `true`, this adapter cannot be deleted or updated manually. */
            nondeletable?: true;
            /** If `true`, this "adapter" only contains HTML files and no main executable */
            onlyWWW?: boolean;
            /** Used to configure native (OS) dependencies of this adapter that need to be installed with system package manager before installing the adapter */
            osDependencies?: {
                /** For OSX */
                darwin: string[];
                /** For Linux */
                linux: string[];
                /** For Windows */
                win32: string[];
            };
            /** Which OSes this adapter supports */
            os?: 'linux' | 'darwin' | 'win32' | Array<'linux' | 'darwin' | 'win32'>;
            /** Constant */
            platform: 'Javascript/Node.js';
            /** The keys of common attributes (e.g. `history`) which are not deleted in a `setObject` call even if they are not present. Deletion must be done explicitly by setting them to `null`. */
            preserveSettings?: string | string[];
            /** Url of the ReadMe file */
            readme?: string;
            /** Which adapters must be restarted after installing or updating this adapter. */
            restartAdapters?: string[];
            /** CRON schedule to restart mode `daemon` adapters */
            restartSchedule?: string;
            /** If the adapter runs in `schedule` mode, this contains the CRON */
            schedule?: string;
            /** Whether this adapter may only be installed once per host */
            singletonHost?: boolean;
            /** Whether this adapter may only be installed once in the whole system */
            singleton?: boolean;
            /** Whether the adapter must be stopped before an update */
            stopBeforeUpdate?: boolean;
            /** Overrides the default timeout that ioBroker will wait before force-stopping the adapter */
            stopTimeout?: number;
            /** This adapter supports a special mode: if someone subscribes on its states, it starts to read them. It is done to save the bandwidth or load of the slave device */
            subscribable?: boolean;
            /** If `true`, this adapter provides custom per-state settings. Requires a `custom_m.html` file in the `admin` directory. */
            supportCustoms?: boolean;
            /** @deprecated Use @see supportedMessages up from controller v5 */
            supportStopInstance?: boolean;
            /** The translated names of this adapter to be shown in the admin UI */
            titleLang?: StringOrTranslated;
            /** @deprecated The name of this adapter to be shown in the admin UI. Use @see titleLang instead. */
            title?: string;
            /** The type of this adapter */
            type?:
                | 'alarm'
                | 'climate-control'
                | 'communication'
                | 'date-and-time'
                | 'energy'
                | 'garden'
                | 'general'
                | 'geoposition'
                | 'hardware'
                | 'health'
                | 'household'
                | 'infrastructure'
                | 'iot-systems'
                | 'lighting'
                | 'logic'
                | 'messaging'
                | 'metering'
                | 'misc-data'
                | 'multimedia'
                | 'network'
                | 'protocols'
                | 'storage'
                | 'utility'
                | 'vehicle'
                | 'visualization'
                | 'visualization-icons'
                | 'visualization-widgets'
                | 'weather';
            /** If `true`, the `npm` package must be installed with the `--unsafe-perm` flag */
            unsafePerm?: true;
            /** The available version in the ioBroker repo. */
            version: string;
            /** Definition of the vis-2 widgets */
            visWidgets?: Record<string, VisWidget>;
            /** Include the adapter version in the URL of the web adapter, e.g. `http://ip:port/1.2.3/material` instead of `http://ip:port/material` */
            webByVersion?: boolean;
            /** Whether the web server in this adapter can be extended with plugin/extensions */
            webExtendable?: boolean;
            /** Relative path to a module that contains an extension for the web adapter. Use together with @see native.webInstance to configure which instances this affects */
            webExtension?: string;
            /** List of parameters that must be included in info.js by webServer adapter. (Example material: `"webPreSettings": { "materialBackground": "native.loadingBackground" }`). Web adapter uses this setting to create a customized info.js file to provide some essential settings for index.html file before the socket connection is established to provide e.g., background color of the loading screen. */
            webPreSettings?: Record<string, any>;
            /** @deprecated (where is it necessary?) Array of web server's instances that should serve content from the adapter's www folder */
            webservers?: string[];
            /** @deprecated (use localLinks) A list of pages that should be shown on the "web" index page */
            welcomeScreen?: WelcomeScreenEntry[];
            /** @deprecated (use localLinks) A list of pages that should be shown on the ioBroker cloud index page */
            welcomeScreenPro?: WelcomeScreenEntry[];
            /** @deprecated (rename the `www` folder in e.g. `adminWww`) If true, the `www` folder will be not uploaded into DB */
            wwwDontUpload?: boolean;
            /** @deprecated Use 'common.licenseInformation' instead */
            license?: string;
            /** An object representing information with the license details */
            licenseInformation?: LicenseInformation;
            /** Messages, that will be shown (if condition evaluates to true) by upgrade or installation */
            messages?: MessageRule[];
            /** If a specific update of this adapter should be ignored, specifies version number to be ignored */
            ignoreVersion?: string;
            /** Sentry and other plugins */
            plugins?: { [pluginName: string]: Record<string, any> };
            /** Rules blocks for JavaScript rules */
            javascriptRules?: {
                /** Translations */
                i18n?: boolean | Record<string, Record<iobJS.Languages, string>> | Record<string, string>;
                /** Where to load the blocks, like "rules/customRuleBlocks.js" */
                url: string;
                /** Rules block name, like "ActionTelegram" */
                name: string;
                /** Load it as TypeScript module */
                type?: 'module';
            };

            // Make it possible to narrow the object type using the custom property
            custom?: undefined;
        }

        interface SystemConfigCommon extends ObjectCommon {
            /** Name of all active repositories */
            activeRepo: string[];
            /** Current configured language */
            language: Languages;
            /** If floating comma is used instead of dot */
            isFloatComma: boolean;
            /** Configured longitude */
            longitude?: number;
            /** Configured latitude */
            latitude?: number;
            /** Optional user's city (only for diagnostics) */
            city?: string;
            /** Optional user's country (only for diagnostics) */
            country?: string;
            /** User-defined temperature unit */
            tempUnit?: '°C' | '°F';
            /** User-defined currency */
            currency?: string;
            /** User-defined first day of the week */
            firstDayOfWeek?: 'monday' | 'sunday';
            /** Default history instance */
            defaultHistory: string;
            /** Which diag data is allowed to be sent */
            diag: 'none' | 'extended' | 'no-city';
            /** If license has already been confirmed */
            licenseConfirmed: boolean;
            /** System wide default log level */
            defaultLogLevel?: LogLevel;
            /** Used date format for formatting */
            dateFormat: string;
            /** This name will be shown in admin's header. Just to identify the whole installation */
            siteName?: string;
            /** Default acl for new objects */
            defaultNewAcl: {
                object: number;
                state: number;
                file: number;
                owner: ObjectIDs.User;
                ownerGroup: ObjectIDs.Group;
            };
            /** Configured auto upgrade policy */
            adapterAutoUpgrade?: {
                /** Configuration for each repository */
                repositories: {
                    [repoName: string]: boolean;
                };
                /** Default policy, if none has been set explicit for the adapter */
                defaultPolicy: AutoUpgradePolicy;
            };
            /** Deactivated instances, that should not be shown in admin/Intro page */
            intro?: string[];
            /** Defines which tabs are visible in the left menu of the admin */
            tabsVisible?: {
                /** Name of the tab */
                name: string;
                /** If the tab should be visible */
                visible: boolean;
                /** Optional color of the tab */
                color?: string;
            }[];
            /** Global saved expert mode for admin */
            expertMode?: boolean;

            // Make it possible to narrow the object type using the custom property
            custom?: undefined;
        }

        interface OtherCommon extends ObjectCommon {
            [propName: string]: any;

            // Make it possible to narrow the object type using the custom property
            custom?: undefined;
        }

        /**
         * ioBroker has built-in protection for specific attributes of objects. If this protection is installed in the object, then the protected attributes of an object cannot be changed by the user without a valid password.
         * To protect the properties from change, the special attribute "nonEdit" must be added to the object. This attribute contains the password, which is required to change the object.
         * If an object does not have "nonEdit" attribute, so the hash will be saved into "nonEdit.passHash". After that, if someone changes the object, he must provide the password in "nonEdit.password".
         * If the password is correct, the object attributes will be updated. If the password is wrong, the object will not be changed.
         * Note, that all properties outside "nonEdit" can be updated without providing the password. Furthermore, do not confuse e.g. "nonEdit.common" with "obj.common" they are not linked in any way.
         */
        interface NonEditable {
            /** Password needed to edit non-editable information */
            password?: string;
            /** Hashed version of current password */
            passHash?: string;
            /** These properties can only be changed by providing the password, else they stay on the initial value */
            common?: Record<string, any>;
            /** These properties can only be changed by providing the password, else they stay on the initial value */
            native?: Record<string, any>;
        }

        /* Base type for Objects. Should not be used directly */
        interface BaseObject {
            /** The ID of this object */
            _id: string;
            type: ObjectType; // specified in the derived interfaces
            // Ideally we would limit this to JSON-serializable objects, but TypeScript doesn't allow this
            // without bugging users to change their code --> https://github.com/microsoft/TypeScript/issues/15300
            native: Record<string, any>;
            common: Record<string, any>;
            enums?: Record<string, string | Translated>;
            acl?: ObjectACL;
            from?: string;
            /** The user who created or updated this object */
            user?: string;
            ts?: number;
            /** These properties can only be edited if the correct password is provided */
            nonEdit?: NonEditable;
        }

        interface StateObject extends BaseObject {
            type: 'state';
            common: StateCommon;
            acl?: StateACL;
        }

        interface PartialStateObject extends Partial<Omit<StateObject, 'common' | 'acl'>> {
            common?: Partial<StateCommon>;
            acl?: Partial<StateACL>;
        }

        interface ChannelObject extends BaseObject {
            type: 'channel';
            common: ChannelCommon;
        }

        interface PartialChannelObject extends Partial<Omit<ChannelObject, 'common'>> {
            common?: Partial<ChannelCommon>;
        }

        interface DeviceObject extends BaseObject {
            type: 'device';
            common: DeviceCommon;
        }

        interface PartialDeviceObject extends Partial<Omit<DeviceObject, 'common'>> {
            common?: Partial<DeviceCommon>;
        }

        interface FolderObject extends BaseObject {
            type: 'folder';
            // Nothing is set in stone here, so start with allowing every property
            common: OtherCommon;
        }

        interface PartialFolderObject extends Partial<Omit<FolderObject, 'common'>> {
            common?: Partial<OtherCommon>;
        }

        interface EnumObject extends BaseObject {
            type: 'enum';
            common: EnumCommon;
        }

        interface PartialEnumObject extends Partial<Omit<EnumObject, 'common'>> {
            common?: Partial<EnumCommon>;
        }

        interface MetaObject extends BaseObject {
            type: 'meta';
            common: MetaCommon;
        }

        interface PartialMetaObject extends Partial<Omit<MetaObject, 'common'>> {
            common?: Partial<MetaCommon>;
        }

        interface ChartObject extends BaseObject {
            type: 'chart';
            common: ChartCommon;
        }

        type PartialChartObject = ChartObject;

        interface ScheduleObject extends BaseObject {
            type: 'schedule';
            common: ScheduleCommon;
        }

        interface PartialScheduleObject extends Partial<Omit<ScheduleObject, 'common'>> {
            common?: Partial<ScheduleCommon>;
        }

        interface PartialRepositoryObject extends Partial<Omit<RepositoryObject, 'common'>> {
            common?: Partial<RepositoryCommon>;
        }

        interface RepositoryJsonAdapterContent {
            /** Adapter name */
            name: string;
            /** Newest available version */
            version: string;
            /** Array of blocked versions, each entry represents a semver range */
            blockedVersions: string[];
            /** If true the unsafe perm flag is needed on install */
            unsafePerm?: boolean;
            /** If given, the packet name differs from the adapter name, e.g. because it is a scoped package */
            packetName?: string;

            /** Other Adapter related properties, not important for this implementation */
            [other: string]: unknown;
        }

        interface RepoInfo {
            /** If it is the official stable repository */
            stable?: boolean;
            /** i18n name of the repository */
            name: Required<iobJS.Translated>;
            /** Time of repository update */
            repoTime: string;
        }

        interface RepositoryJson {
            /** Information about the repository: creation time, name, is it stable */
            _repoInfo: RepoInfo;

            /** Information about each adapter */
            [adapter: string]: RepositoryJsonAdapterContent | RepoInfo;
        }

        interface RepositoryInformation {
            /** Url to the repository */
            link: string;
            json: RepositoryJson | null;
            hash?: string;
            time?: string;
            /** If this repository stable */
            stable?: boolean;
        }

        interface RepositoryObject extends BaseObject {
            _id: ObjectIDs.Repository;
            type: 'config';
            native: {
                repositories: {
                    [repoName: string]: RepositoryInformation;
                };
                oldRepositories?: {
                    [repoName: string]: RepositoryInformation;
                };
            };
            common: RepositoryCommon;
        }

        interface InstanceObject extends Omit<AdapterObject, 'type'>, BaseObject {
            _id: ObjectIDs.Instance;
            type: 'instance';
            common: InstanceCommon;
        }

        interface PartialInstanceObject extends Partial<Omit<InstanceObject, 'common'>> {
            common?: Partial<InstanceCommon>;
        }

        // it is defined in notificationHandler.ts
        type NotificationCategory = {
            /** The unique category identifier */
            category:
                | 'memIssues'
                | 'fsIoErrors'
                | 'noDiskSpace'
                | 'accessErrors'
                | 'nonExistingFileErrors'
                | 'remoteHostErrors'
                | 'restartLoop'
                | 'fileToJsonl'
                | 'automaticAdapterUpgradeFailed'
                | 'automaticAdapterUpgradeSuccessful'
                | 'blockedVersions'
                | 'databaseErrors'
                | 'securityIssues'
                | 'packageUpdates'
                | 'systemRebootRequired'
                | 'diskSpaceIssues'
                | (string & {});
            /** The human-readable category name */
            name: Translated;
            /** The human-readable category description */
            description: Translated;
            /** Allows to define the severity of the notification with `info` being the lowest `notify` representing middle priority, `alert` representing high priority and often containing critical information */
            severity: 'info' | 'notify' | 'alert';
            /** If a regex is specified, the js-controller will check error messages on adapter crashes against this regex and will generate a notification of this category */
            regex: string[];
            /** Deletes older messages if more than the specified amount is present for this category */
            limit: number;
        };

        interface Notification {
            /** E.g., `system`. Each adapter can define its own "scopes" for own notifications with its own categories which then will be available in the system. Adapters should only register one scope which matches the name of the adapter. */
            scope: string;
            /** The human-readable name of this scope */
            name: Translated;
            /** The human-readable description of this scope */
            description: Translated;
            /** All notification categories of this scope */
            categories: NotificationCategory[];
        }

        interface AdapterObject extends BaseObject {
            _id: ObjectIDs.Adapter;
            type: 'adapter';
            common: AdapterCommon;
            /** An array of `native` properties which cannot be accessed from outside the defining adapter */
            protectedNative?: string[];
            /** Like protectedNative, but the properties are also encrypted and decrypted automatically */
            encryptedNative?: string[];
            /** Register notifications for the built-in notification system */
            notifications?: Notification[];
            /** Objects created for each instance, inside the namespace of this adapter */
            instanceObjects: (StateObject | DeviceObject | ChannelObject | FolderObject | MetaObject)[];
            /** Objects created for the adapter, anywhere in the global namespace */
            objects: iobJS.AnyObject[];
        }

        interface PartialAdapterObject extends Partial<Omit<AdapterObject, 'common'>> {
            common?: Partial<AdapterCommon>;
        }

        interface HostObject extends BaseObject {
            _id: ObjectIDs.Host;
            type: 'host';
            common: HostCommon;
            native: HostNative;
        }

        interface PartialHostObject extends Partial<Omit<HostObject, 'common' | 'native'>> {
            common?: Partial<HostCommon>;
            native?: Partial<HostNative>;
        }

        interface UserObject extends BaseObject {
            _id: ObjectIDs.User;
            type: 'user';
            common: UserCommon;
        }

        interface PartialUserObject extends Partial<Omit<UserObject, 'common'>> {
            common?: Partial<UserCommon>;
        }

        interface GroupObject extends BaseObject {
            _id: ObjectIDs.Group;
            type: 'group';
            common: GroupCommon;
        }

        interface PartialGroupObject extends Partial<Omit<GroupObject, 'common'>> {
            common?: Partial<GroupCommon>;
        }

        interface ScriptObject extends BaseObject {
            type: 'script';
            common: ScriptCommon;
        }

        interface PartialScriptObject extends Partial<Omit<ScriptObject, 'common'>> {
            common?: Partial<ScriptCommon>;
        }

        interface SystemConfigObject extends BaseObject {
            type: 'config';
            common: SystemConfigCommon;
        }

        interface PartialSystemConfigObject extends Partial<Omit<SystemConfigObject, 'common'>> {
            common?: Partial<SystemConfigCommon>;
        }

        interface OtherObject extends BaseObject {
            type: 'config' | 'chart';
            common: OtherCommon;
        }

        interface PartialOtherObject extends Partial<Omit<OtherObject, 'common'>> {
            common?: Partial<OtherCommon>;
        }

        interface DesignObject extends Omit<BaseObject, 'common'> {
            // allow narrowing the type without making it a pain
            type: 'design';
            _id: ObjectIDs.Design;
            language: 'javascript';
            common?: OtherCommon;
            views: Record<string, { map: string }>;
        }

        interface PartialDesignObject extends Partial<Omit<DesignObject, 'common'>> {
            common?: Partial<OtherCommon>;
        }

        type AnyObject =
            | StateObject
            | ChannelObject
            | DeviceObject
            | FolderObject
            | EnumObject
            | MetaObject
            | HostObject
            | AdapterObject
            | InstanceObject
            | UserObject
            | GroupObject
            | ScriptObject
            | ChartObject
            | ScheduleObject
            | RepositoryObject
            | OtherObject
            | DesignObject;

        type AnyPartialObject =
            | PartialStateObject
            | PartialChannelObject
            | PartialDeviceObject
            | PartialFolderObject
            | PartialEnumObject
            | PartialMetaObject
            | PartialHostObject
            | PartialAdapterObject
            | PartialInstanceObject
            | PartialUserObject
            | PartialGroupObject
            | PartialScriptObject
            | PartialChartObject
            | PartialScheduleObject
            | PartialRepositoryObject
            | PartialSystemConfigObject
            | PartialOtherObject
            | PartialDesignObject;

        /** All objects that usually appear in an adapter scope */
        type AdapterScopedObject = FolderObject | DeviceObject | ChannelObject | StateObject;

        // For all objects that are exposed to the user, we need to tone the strictness down.
        // Otherwise, every operation on objects becomes a pain to work with
        type Object = AnyObject & {
            common: Record<string, any>;
            native: Record<string, any>;
        };

        // In set[Foreign]Object[NotExists] methods, the ID and acl of the object is optional
        type SettableObjectWorker<T> = T extends AnyObject
            ? Omit<T, '_id' | 'acl'> & {
                  _id?: T['_id'];
                  acl?: T['acl'];
              }
            : never;
        // in extend[Foreign]Object, most properties are optional
        type PartialObjectWorker<T> = T extends AnyObject ? AnyPartialObject & { type?: T['type'] } : never;

        type PartialObject<T extends AnyObject = AnyObject> = PartialObjectWorker<T>;

        // Used to infer the return type of GetObjectView
        type InferGetObjectViewItemType<Design extends string, View extends string> = Design extends 'system'
            ? View extends 'host'
                ? HostObject
                : View extends 'adapter'
                  ? AdapterObject
                  : View extends 'instance'
                    ? InstanceObject
                    : View extends 'meta'
                      ? MetaObject
                      : View extends 'device'
                        ? DeviceObject
                        : View extends 'channel'
                          ? ChannelObject
                          : View extends 'state'
                            ? StateObject
                            : View extends 'folder'
                              ? FolderObject
                              : View extends 'enum'
                                ? EnumObject
                                : View extends 'script'
                                  ? ScriptObject
                                  : View extends 'group'
                                    ? GroupObject
                                    : View extends 'user'
                                      ? UserObject
                                      : View extends 'chart'
                                        ? ChartObject
                                        : View extends 'schedule'
                                          ? ScheduleObject
                                          : View extends 'config'
                                            ?
                                                  | RepositoryObject
                                                  | SystemConfigObject
                                                  | (OtherObject & {
                                                        type: 'config';
                                                    })
                                            : View extends 'custom'
                                              ? NonNullable<StateObject['common']['custom']>
                                              : iobJS.Object
            : any;

        enum StateQuality {
            good = 0x00, // or undefined or null
            bad = 0x01,
            general_device_problem = 0x41,
            general_sensor_problem = 0x81,
            device_not_connected = 0x42,
            sensor_not_connected = 0x82,
            device_reports_error = 0x44,
            sensor_reports_error = 0x84,
        }

        interface TypedState<T extends iobJS.StateValue = any> extends iobJS.State {
            val: T;
        }

        interface AbsentState extends Omit<iobJS.State, 'ack' | 'from' | 'ts' | 'lc'> {
            val: null;
            notExist: true;

            ack: undefined;
            ts: undefined;
            lc: undefined;
            from: undefined;
            expire: undefined;
            q: undefined;
            c: undefined;
        }

        interface StateCommonAlias {
            /** The target state id or two target states used for reading and writing values */
            id: string | { read: string; write: string };
            /** An optional conversion function when reading, e.g. `"(val − 32) * 5/9"` */
            read?: string;
            /** An optional conversion function when reading, e.g. `"(val * 9/5) + 32"` */
            write?: string;
        }

        // Convenient definitions for manually specifying settable object types
        type SettableObject<T extends AnyObject = AnyObject> = SettableObjectWorker<T>;
        type SettableStateObject = SettableObject<StateObject>;
        type SettableChannelObject = SettableObject<ChannelObject>;
        type SettableDeviceObject = SettableObject<DeviceObject>;
        type SettableFolderObject = SettableObject<FolderObject>;
        type SettableEnumObject = SettableObject<EnumObject>;
        type SettableMetaObject = SettableObject<MetaObject>;
        type SettableHostObject = SettableObject<HostObject>;
        type SettableAdapterObject = SettableObject<AdapterObject>;
        type SettableInstanceObject = SettableObject<InstanceObject>;
        type SettableUserObject = SettableObject<UserObject>;
        type SettableGroupObject = SettableObject<GroupObject>;
        type SettableScriptObject = SettableObject<ScriptObject>;
        type SettableOtherObject = SettableObject<OtherObject>;

        /** Represents the change of a state */
        interface ChangedStateObject<TOld extends iobJS.StateValue = any, TNew extends iobJS.StateValue = TOld>
            extends StateObject {
            common: StateCommon;
            native: Record<string, any>;
            id?: string;
            name?: string;
            channelId?: string;
            channelName?: string;
            deviceId?: string;
            deviceName?: string;
            /** The IDs of enums this state is assigned to. For example ["enum.functions.Licht","enum.rooms.Garten"] */
            enumIds?: string[];
            /** The names of enums this state is assigned to. For example ["Licht","Garten"] */
            enumNames?: Array<iobJS.StringOrTranslated>;
            /** new state */
            state: TypedState<TNew>;
            /** @deprecated Use state instead */
            newState: TypedState<TNew>;
            /** previous state */
            oldState: TypedState<TOld>;
            /** Name of the adapter instance which set the value, e.g. "system.adapter.web.0" */
            from?: string;
            /** Unix timestamp. Default: current time */
            ts?: number;
            /** Unix timestamp of the last time the value changed */
            lc?: number;
            /** Direction flag: false for desired value and true for actual value. Default: false. */
            ack?: boolean;
        }

        type GetStateCallback<T extends ioBroker.StateValue = any> = (
            err?: Error | null,
            state?: TypedState<T> | AbsentState,
        ) => void | Promise<void>;
        type ExistsStateCallback = (err?: Error | null, exists?: boolean) => void | Promise<void>;

        type StateChangeHandler<TOld extends ioBroker.StateValue = any, TNew extends TOld = any> = (
            obj: ChangedStateObject<TOld, TNew>,
        ) => void | Promise<void>;

        type FileChangeHandler<WithFile extends boolean> =
            // Variant 1: WithFile is false, data/mimeType is definitely not there
            [WithFile] extends [false]
                ? (
                      id: string,
                      fileName: string,
                      size: number,
                      data?: undefined,
                      mimeType?: undefined,
                  ) => void | Promise<void>
                : // Variant 2: WithFile is true, data (and mimeType?) is definitely there
                  [WithFile] extends [true]
                  ? (
                        id: string,
                        fileName: string,
                        size: number,
                        data: Buffer | string,
                        mimeType?: string,
                    ) => void | Promise<void>
                  : // Variant 3: WithFile is not known, data/mimeType might be there
                    (
                        id: string,
                        fileName: string,
                        size: number,
                        data?: Buffer | string,
                        mimeType?: string,
                    ) => void | Promise<void>;

        type SetObjectCallback = (err?: Error | null, obj?: { id: string }) => void | Promise<void>;
        type SetObjectPromise = Promise<NonNullCallbackReturnTypeOf<SetObjectCallback>>;

        type GetObjectCallback<T extends string = string> = (
            err?: Error | null,
            obj?: ObjectIdToObjectType<T> | null,
        ) => void;
        type GetObjectPromise<T extends string = string> = Promise<CallbackReturnTypeOf<GetObjectCallback<T>>>;

        type LogLevel = 'silly' | 'debug' | 'info' | 'warn' | 'error' | 'force';

        type ReadFileCallback = (err?: Error | null, file?: Buffer | string, mimeType?: string) => void | Promise<void>;
        type ReadFilePromise = Promise<NonNullCallbackReturnTypeOf<ReadFileCallback>>;

        type MessageCallback = (result?: any) => void | Promise<void>;

        interface SendToOptions {
            /** Method throws or calls error cb, if callback not called in time, works for single targets only */
            timeout?: number;
        }

        interface Subscription {
            name: string;
            pattern: string | RegExp | string[] | iobJS.SubscribeOptions | iobJS.SubscribeTime | iobJS.AstroSchedule;
        }

        interface SubscribeOptions {
            /** "and" or "or" logic to combine the conditions (default: "and") */
            logic?: 'and' | 'or';
            /** name is equal or matches to given one or name marches to any item in given list */
            id?: string | string[] | SubscribeOptions[] | RegExp | RegExp[];
            /** name is equal or matches to given one */
            name?: string | string[] | RegExp;
            /** type of change */
            change?: 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le' | 'any' | '*';
            val?: iobJS.StateValue;
            /** New value must not be equal to given one */
            valNe?: iobJS.StateValue;
            /** New value must be greater than given one */
            valGt?: number;
            /** New value must be greater or equal to given one */
            valGe?: number;
            /** The new value must be smaller than given one */
            valLt?: number;
            /** New value must be smaller or equal to given one */
            valLe?: number;
            /** The acknowledged state of new value is equal to given one */
            ack?: boolean;
            /** Previous value must be equal to given one */
            oldVal?: iobJS.StateValue;
            /** Previous value must be not equal to given one */
            oldValNe?: iobJS.StateValue;
            /** The previous value must be greater than given one */
            oldValGt?: number;
            /** Previous value must be greater or equal given one */
            oldValGe?: number;
            /** The previous value must be smaller than given one */
            oldValLt?: number;
            /** The previous value must be smaller or equal to given one */
            oldValLe?: number;
            /** Acknowledged state of previous value is equal to given one */
            oldAck?: boolean;
            /** New value time stamp must be equal to given one (state.ts == ts) */
            ts?: number;
            /** New value time stamp must be not equal to the given one (state.ts != ts) */
            tsGt?: number;
            /** New value time stamp must be greater than given value (state.ts > ts) */
            tsGe?: number;
            /** New value time stamp must be greater or equal to given one (state.ts >= ts) */
            tsLt?: number;
            /** New value time stamp must be smaller than given one (state.ts < ts) */
            tsLe?: number;
            /** Previous time stamp must be equal to given one (oldState.ts == ts) */
            oldTs?: number;
            /** Previous time stamp must be not equal to the given one (oldState.ts != ts) */
            oldTsGt?: number;
            /** Previous time stamp must be greater than the given value (oldState.ts > ts) */
            oldTsGe?: number;
            /** Previous time stamp must be greater or equal to given one (oldState.ts >= ts) */
            oldTsLt?: number;
            /** Previous time stamp must be smaller than given one (oldState.ts < ts) */
            oldTsLe?: number;
            /** Last change time stamp must be equal to given one (state.lc == lc) */
            lc?: number;
            /** Last change time stamp must be not equal to the given one (state.lc != lc) */
            lcGt?: number;
            /** Last change time stamp must be greater than the given value (state.lc > lc) */
            lcGe?: number;
            /** Last change time stamp must be greater or equal to given one (state.lc >= lc) */
            lcLt?: number;
            /** Last change time stamp must be smaller than given one (state.lc < lc) */
            lcLe?: number;
            /** Previous last change time stamp must be equal to given one (oldState.lc == lc) */
            oldLc?: number;
            /** Previous last change time stamp must be not equal to the given one (oldState.lc != lc) */
            oldLcGt?: number;
            /** Previous last change time stamp must be greater than the given value (oldState.lc > lc) */
            oldLcGe?: number;
            /** Previous last change time stamp must be greater or equal to given one (oldState.lc >= lc) */
            oldLcLt?: number;
            /** Previous last change time stamp must be smaller than given one (oldState.lc < lc) */
            oldLcLe?: number;
            /** Channel ID must be equal or match to given one */
            channelId?: string | string[] | RegExp;
            /** Channel name must be equal or match to given one */
            channelName?: string | string[] | RegExp;
            /** Device ID must be equal or match to given one */
            deviceId?: string | string[] | RegExp;
            /** Device name must be equal or match to given one */
            deviceName?: string | string[] | RegExp;
            /** State belongs to given enum or one enum ID of state satisfy the given regular expression */
            enumId?: string | string[] | RegExp;
            /** State belongs to given enum or one enum name of state satisfy the given regular expression */
            enumName?: string | string[] | RegExp;
            /** New value is from defined adapter */
            from?: string | string[] | RegExp;
            /** New value is not from defined adapter */
            fromNe?: string | string[] | RegExp;
            /** Old value is from defined adapter */
            oldFrom?: string | string[] | RegExp;
            /** Old value is not from defined adapter */
            oldFromNe?: string | string[] | RegExp;
        }

        interface QueryResult extends Iterable<string> {
            /** State-ID */
            [index: number]: string;
            /** Number of matched states */
            length: number;
            /** Contains the error if one happened */
            error?: string;

            /**
             * Return the result as an array of state ids
             */
            toArray(): Array<string>;

            /**
             * Executes a function for each state id in the result array
             * The execution is canceled if a callback returns false
             */
            each(callback?: (id: string, index: number) => boolean | void | Promise<void>): this;

            /**
             * Returns the first state found by this query.
             * If the adapter is configured to subscribe to all states on start,
             * this can be called synchronously and immediately returns the state.
             * Otherwise, you need to provide a callback.
             */
            getState<T extends iobJS.StateValue = any>(callback: GetStateCallback<T>): void;
            getState<T extends iobJS.StateValue = any>(): TypedState<T> | null | undefined;
            getStateAsync<T extends iobJS.StateValue = any>(): Promise<
                TypedState<T> | iobJS.AbsentState | null | undefined
            >;

            /**
             * Sets all queried states to the given value.
             */
            setState(
                state: iobJS.StateValue | iobJS.SettableState,
                ack?: boolean | 'true' | 'false' | SetStateCallback,
                callback?: SetStateCallback,
            ): this;
            setStateAsync(
                state: iobJS.StateValue | iobJS.SettableState,
                ack?: boolean | 'true' | 'false',
            ): Promise<void>;
            setStateDelayed(
                state: iobJS.StateValue | iobJS.SettableState,
                isAck: boolean | number | undefined,
                delay?: number | boolean,
                clearRunning?: boolean | (() => void),
                callback?: () => void,
            ): this;

            /**
             * Sets all queried states to the given value only if the value really changed.
             */
            setStateChanged(
                state: iobJS.StateValue | iobJS.SettableState,
                ack?: boolean,
                callback?: SetStateCallback,
            ): this;
            setStateChangedAsync(state: iobJS.StateValue | iobJS.SettableState, ack?: boolean): Promise<void>;

            /**
             * Subscribes the given callback to changes of the matched states.
             */
            on(callback: StateChangeHandler): this;
        }

        /**
         * - "sunrise": sunrise (top edge of the sun appears on the horizon)
         * - "sunriseEnd": sunrise ends (bottom edge of the sun touches the horizon)
         * - "goldenHourEnd": morning golden hour (soft light, best time for photography) ends
         * - "solarNoon": solar noon (sun is in the highest position)
         * - "goldenHour": evening golden hour starts
         * - "sunsetStart": sunset starts (bottom edge of the sun touches the horizon)
         * - "sunset": sunset (sun disappears below the horizon, evening civil twilight starts)
         * - "dusk": dusk (evening nautical twilight starts)
         * - "nauticalDusk": nautical dusk (evening astronomical twilight starts)
         * - "night": night starts (dark enough for astronomical observations)
         * - "nightEnd": night ends (morning astronomical twilight starts)
         * - "nauticalDawn": nautical dawn (morning nautical twilight starts)
         * - "dawn": dawn (morning nautical twilight ends, morning civil twilight starts)
         * - "nadir": nadir (darkest moment of the night, sun is in the lowest position)
         */
        type AstroPattern =
            | 'sunrise'
            | 'sunriseEnd'
            | 'goldenHourEnd'
            | 'solarNoon'
            | 'goldenHour'
            | 'sunsetStart'
            | 'sunset'
            | 'dusk'
            | 'nauticalDusk'
            | 'night'
            | 'nightEnd'
            | 'nauticalDawn'
            | 'dawn'
            | 'nadir';

        interface AstroSchedule {
            astro: AstroPattern;
            /**
             * Shift to the astro schedule.
             */
            shift?: number;
        }

        interface AstroDate {
            astro: AstroPattern;
            /** Offset to the astro event in minutes */
            offset?: number;
            /** Date for which the astro time is wanted */
            date?: Date;
        }

        /**
         * from https://github.com/node-schedule/node-schedule
         */
        interface ScheduleRule {
            /**
             * Day of the month.
             */
            date?: number | number[] | string | string[];

            /**
             * Day of the week.
             */
            dayOfWeek?: number | number[] | string | string[];

            /**
             * Hour.
             */
            hour?: number | number[] | string | string[];

            /**
             * Minute.
             */
            minute?: number | number[] | string | string[];

            /**
             * Month.
             */
            month?: number | number[] | string | string[];

            /**
             * Second.
             */
            second?: number | number[] | string | string[];

            /**
             * Year.
             */
            year?: number | number[] | string | string[];
            /**
             * timezone which should be used
             * https://github.com/moment/moment-timezone
             */
            tz?: string;
        }

        /**
         * from https://github.com/node-schedule/node-schedule
         */
        interface ScheduleRuleConditional {
            /**
             * set a start time for schedule
             * a Data object or a dateString resp a number in milliseconds which can create a Date object
             */
            start?: Date | string | number;
            /**
             * set an end time for schedule
             * a Data object or a dateString resp a number in milliseconds which can create a Date object
             */
            end?: Date | string | number;
            /**
             * timezone which should be used
             * https://github.com/moment/moment-timezone
             */
            tz?: string;
            /**
             * scheduling rule
             * schedule rule, a Data object or a dateString resp a number in milliseconds which can create a Date object
             */
            rule: ScheduleRule | Date | string | number;
        }

        interface ScheduleStatus {
            type: string;
            pattern?: string;
            scriptName: string;
            id: string;
        }

        type SchedulePattern = ScheduleRule | ScheduleRuleConditional | Date | string | number;

        interface SubscribeTime {
            time: SchedulePattern;
        }

        interface StateTimer {
            id: number;
            left: number;
            delay: number;
            val: any;
            ack: boolean;
        }

        type MessageSubscribeID = number;
        interface MessageTarget {
            /** Javascript Instance */
            instance?: string;
            /** Script name */
            script?: string;
            /** Message name */
            message: string;
        }

        type LogSubscribeID = number;

        interface HttpRequestOptions {
            timeout?: number;
            responseType?: 'text' | 'arraybuffer';
            basicAuth?: {
                user: string;
                password: string;
            };
            bearerAuth?: string;
            headers?: Record<string, string>;
            validateCertificate?: boolean;
        }

        type HttpResponseCallback = (err?: Error | null, response?: iobJS.httpResponse) => void | Promise<void>;
        interface httpResponse {
            statusCode: number;
            data: string;
            headers: Record<string, string>;
            responseTime?: number;
        }
    } // end namespace iobJS

    // =======================================================
    // available functions in the sandbox
    // =======================================================

    /**
     * The instance number of the JavaScript adapter this script runs in
     */
    const instance: number;
    /**
     * The name of the current script
     */
    const scriptName: string;

    /**
     * Absolute path to iobroker-data directory in a file system
     */
    const defaultDataDir: string;

    /**
     * Status of verbose mode
     */
    const verbose: boolean;

    /**
     * Queries all states with the given selector
     *
     * @param selector See @link{https://github.com/ioBroker/ioBroker.javascript#---selector} for a description
     */
    function $(selector: string): iobJS.QueryResult;

    /**
     * Prints a message in the ioBroker log
     *
     * @param message The message to print
     * @param severity (optional) severity of the message. default = "info"
     */
    function log(message: any, severity?: iobJS.LogLevel): void;

    // console functions
    // @ts-expect-error We need this variable, although it conflicts with the node typings
    namespace console {
        /** log a message with info level */
        function log(message: any): void;
        /** log a message with debug level */
        function debug(message: any): void;
        /** log a message with info level (default output level for all adapters) */
        function info(message: any): void;
        /** log a message with warning severity */
        function warn(message: any): void;
        /** log a message with error severity */
        function error(message: any): void;
    }

    /**
     * Executes a system command
     */
    const exec: (
        command: string,
        callback?: (error: ExecException | null, stdout: string, stderr: string) => void,
    ) => ChildProcess;

    /**
     * Sends an email using the email adapter.
     * See the adapter documentation for a description of the msg parameter.
     *
     * @deprecated Use @see sendTo
     */
    function email(msg: any): void;

    /**
     * Sends a pushover message using the pushover adapter.
     * See the adapter documentation for a description of the msg parameter.
     *
     * @deprecated Use @see sendTo
     */
    function pushover(msg: any): void;

    function httpGet(url: string, callback: iobJS.HttpResponseCallback): void;
    function httpGet(url: string, options: iobJS.HttpRequestOptions, callback: iobJS.HttpResponseCallback): void;

    function httpGetAsync(url: string): Promise<iobJS.httpResponse>;
    function httpGetAsync(url: string, options: iobJS.HttpRequestOptions): Promise<iobJS.httpResponse>;

    function httpPost(url: string, data: object | string, callback: iobJS.HttpResponseCallback): void;
    function httpPost(
        url: string,
        data: object | string,
        options: iobJS.HttpRequestOptions,
        callback: iobJS.HttpResponseCallback,
    ): void;

    function httpPostAsync(url: string, data: object | string): Promise<iobJS.httpResponse>;
    function httpPostAsync(
        url: string,
        data: object | string,
        options: iobJS.HttpRequestOptions,
    ): Promise<iobJS.httpResponse>;

    /**
     * Creates a temp directory for the current script and saves a new file with given content
     */
    function createTempFile(fileName: string, data: string | ArrayBuffer): string;

    /**
     * Subscribe to the changes of the matched states.
     */
    function on(pattern: string | RegExp | string[], handler: iobJS.StateChangeHandler): any;
    function on(
        astroOrScheduleOrOptions: iobJS.AstroSchedule | iobJS.SubscribeTime | iobJS.SubscribeOptions,
        handler: iobJS.StateChangeHandler,
    ): any;
    /**
     * Subscribe to the changes of the matched states.
     */
    function subscribe(pattern: string | RegExp | string[], handler: iobJS.StateChangeHandler): any;
    function subscribe(
        astroOrScheduleOrOptions: iobJS.AstroSchedule | iobJS.SubscribeTime | iobJS.SubscribeOptions,
        handler: iobJS.StateChangeHandler,
    ): any;

    /**
     * Subscribe to all members of an enum (even if the enum changes over time)
     */
    function onEnumMembers(id: string, handler: iobJS.StateChangeHandler): void;

    /**
     * Subscribe to the changes of the matched files.
     * The return value can be used for offFile later
     *
     * @param id ID of a meta-object, like `vis.0`
     * @param filePattern File name or file pattern, like `main/*`
     * @param withFile If the content of the file must be returned in callback (high usage of memory)
     * @param handler Callback: function (id, fileName, size, data, mimeType) {}
     */
    function onFile<WithFile extends boolean>(
        id: string,
        filePattern: string | string[],
        withFile: WithFile,
        handler: iobJS.FileChangeHandler<WithFile>,
    ): any;
    function onFile(id: string, filePattern: string | string[], handler: iobJS.FileChangeHandler<false>): any;

    /**
     * Un-subscribe from the changes of the matched files.
     *
     * @param id ID of a meta-object, like `vis.0`. You can provide here can be a returned object from onFile. In this case, no filePattern required.
     * @param filePattern File name or file pattern, like `main/*`
     */
    function offFile(id: string | string[], filePattern?: string | string[]): boolean;

    /**
     * Registers a one-time subscription which automatically unsubscribes after the first invocation
     */
    function once(
        pattern: string | RegExp | string[] | iobJS.AstroSchedule | iobJS.SubscribeTime | iobJS.SubscribeOptions,
        handler: iobJS.StateChangeHandler,
    ): any;
    function once(
        pattern: string | RegExp | string[] | iobJS.AstroSchedule | iobJS.SubscribeTime | iobJS.SubscribeOptions,
    ): Promise<iobJS.ChangedStateObject>;

    /**
     * Causes all changes of the state with id1 to the state with id2.
     * The return value can be used to unsubscribe later
     */
    function on(id1: string, id2: string): void;

    /**
     * Watches the state with id1 for changes and overwrites the state with id2 with value2 when any occur.
     *
     * @param id1 The state to watch for changes
     * @param id2 The state to update when changes occur
     * @param value2 The value to write into state `id2` when `id1` gets changed
     */
    function on(id1: string, id2: string, value2: any): void;

    /**
     * Causes all changes of the state with id1 to the state with id2
     */
    function subscribe(id1: string, id2: string): void;

    /**
     * Watches the state with id1 for changes and overwrites the state with id2 with value2 when any occur.
     *
     * @param id1 The state to watch for changes
     * @param id2 The state to update when changes occur
     * @param value2 The value to write into state `id2` when `id1` gets changed
     */
    function subscribe(id1: string, id2: string, value2: any): void;

    /**
     * Returns the list of all active subscriptions
     */
    function getSubscriptions(): { [id: string]: iobJS.Subscription[] };

    /**
     * Returns the list of all active file subscriptions
     */
    function getFileSubscriptions(): { [id: string]: iobJS.Subscription[] };

    /**
     * Unsubscribe from changes of the given object ID(s) or handler(s)
     */
    function unsubscribe(id: string | RegExp | string[]): boolean;

    function adapterSubscribe(id: string): void;
    function adapterUnsubscribe(id: string): void;

    /**
     * Schedules a function to be executed on a defined schedule.
     * The return value can be used to clear the schedule later.
     */
    function schedule(pattern: string | iobJS.SchedulePattern, callback: EmptyCallback): any;
    function schedule(date: Date, callback: EmptyCallback): any;
    function schedule(astro: iobJS.AstroSchedule, callback: EmptyCallback): any;

    /**
     * [{"type":"cron","pattern":"0 15 13 * * *","scriptName":"script.js.scheduleById","id":"cron_1704187467197_22756"}]
     *
     * @param allScripts Return all registered schedules of all running scripts
     */
    function getSchedules(allScripts?: boolean): Array<iobJS.ScheduleStatus>;

    /**
     * Creates a schedule based on the state value (e.g., 12:53:09)
     * Schedule will be updated if the state value changes
     */
    function scheduleById(id: string, callback: EmptyCallback): any;
    function scheduleById(id: string, ack: boolean, callback: EmptyCallback): any;

    /**
     * Clears a schedule. Returns true if it was successful.
     */
    function clearSchedule(schedule: any): boolean;

    /**
     * Calculates the astro time which corresponds to the given pattern.
     * For valid patterns, see @link{https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/javascript.md#astro-function}
     *
     * @param pattern One of predefined patterns, like: sunrise, sunriseEnd, ...
     * @param date (optional) The date for which the astro time should be calculated. Default = today
     * @param offsetMinutes (optional) The number of minutes to be added to the return value.
     */
    function getAstroDate(pattern: string, date?: Date | number, offsetMinutes?: number): Date;

    /**
     * Determines if now is between sunrise and sunset.
     */
    function isAstroDay(): boolean;

    /**
     * Sets a state to the given value
     *
     * @param id The ID of the state to be set
     * @param state New state value
     * @param callback Callback
     */
    function setState(
        id: string,
        state: iobJS.StateValue | iobJS.SettableState,
        callback?: iobJS.SetStateCallback,
    ): void;
    function setState(
        id: string,
        state: iobJS.StateValue | iobJS.SettableState,
        ack: boolean,
        callback?: iobJS.SetStateCallback,
    ): void;

    function setStateAsync(
        id: string,
        state: iobJS.StateValue | iobJS.SettableState,
        ack?: boolean,
    ): iobJS.SetStatePromise;

    /**
     * Sets a state to the given value only if the value really changed.
     *
     * @param id The ID of the state to be set
     * @param state New state value
     * @param callback Callback
     */
    function setStateChanged(
        id: string,
        state: iobJS.StateValue | iobJS.SettableState,
        callback?: iobJS.SetStateCallback,
    ): void;
    function setStateChanged(
        id: string,
        state: iobJS.StateValue | iobJS.SettableState,
        ack: boolean,
        callback?: iobJS.SetStateCallback,
    ): void;

    function setStateChangedAsync(
        id: string,
        state: iobJS.StateValue | iobJS.SettableState,
        ack?: boolean,
    ): iobJS.SetStatePromise;

    /**
     * Sets a state to the given value after a timeout has passed.
     * Returns the timer, so it can be manually cleared with clearStateDelayed
     *
     * @param id The ID of the state to be set
     * @param state New state value
     * @param delay The delay in milliseconds
     * @param clearRunning (optional) Whether an existing timeout for this state should be cleared
     * @param callback Callback
     * @returns If a delayed setState was scheduled, this returns the timer id, otherwise null.
     */
    function setStateDelayed(
        id: string,
        state: iobJS.StateValue | iobJS.SettableState,
        delay: number,
        clearRunning: boolean,
        callback?: iobJS.SetStateCallback,
    ): number | null;
    function setStateDelayed(
        id: string,
        state: iobJS.StateValue | iobJS.SettableState,
        ack: boolean,
        clearRunning: boolean,
        callback?: iobJS.SetStateCallback,
    ): number | null;
    function setStateDelayed(
        id: string,
        state: iobJS.StateValue | iobJS.SettableState,
        ack: boolean,
        delay: number,
        callback?: iobJS.SetStateCallback,
    ): number | null;
    function setStateDelayed(
        id: string,
        state: iobJS.StateValue | iobJS.SettableState,
        delay: number,
        callback?: iobJS.SetStateCallback,
    ): number | null;
    function setStateDelayed(
        id: string,
        state: iobJS.StateValue | iobJS.SettableState,
        callback?: iobJS.SetStateCallback,
    ): number | null;
    function setStateDelayed(
        id: string,
        state: iobJS.StateValue | iobJS.SettableState,
        ack: boolean,
        delay: number,
        clearRunning: boolean,
        callback?: iobJS.SetStateCallback,
    ): number | null;

    /**
     * Clears a timer created by setStateDelayed
     *
     * @param id The state id for which the timer should be cleared
     * @param timerID (optional) ID of the specific timer to clear. If none is given, all timers are cleared.
     */
    function clearStateDelayed(id: string, timerID?: number): boolean;

    /**
     * Returns information about a specific timer created with `setStateDelayed`.
     *
     * @param timerId The timer id that was returned by `setStateDelayed`.
     */
    function getStateDelayed(timerId: number): iobJS.StateTimer | null;
    /**
     * Returns a list of all timers created with `setStateDelayed`. Can be limited to a specific state id.
     *
     * @param id The state id for which the timers should be.
     */
    function getStateDelayed(id?: string): iobJS.StateTimer[];

    /**
     * Returns the state with the given ID.
     * If the adapter is configured to subscribe to all states on start,
     * this can be called synchronously and immediately returns the state.
     * Otherwise, you need to provide a callback.
     */
    function getState<T extends iobJS.StateValue = any>(id: string, callback: iobJS.GetStateCallback<T>): void;
    function getState<T extends iobJS.StateValue = any>(id: string): iobJS.TypedState<T> | iobJS.AbsentState;
    function getStateAsync<T extends iobJS.StateValue = any>(id: string): Promise<iobJS.TypedState<T>>;

    /**
     * Checks if the state with the given ID exists
     */
    function existsState(id: string, callback: iobJS.ExistsStateCallback): void;
    function existsState(id: string): boolean;
    function existsStateAsync(id: string): Promise<boolean>;
    /**
     * Checks if the object with the given ID exists
     */
    function existsObject(id: string): boolean;
    function existsObjectAsync(id: string): Promise<boolean>;

    /**
     * Returns the IDs of the states with the given name
     *
     * @param name Name of the state
     * @param forceArray (optional) Ensures that the return value is always an array, even if only one ID was found.
     */
    function getIdByName(name: string, forceArray?: boolean): string | string[];

    /**
     * Reads an object from the object db.
     *
     * @param id Object ID
     * @param enumName Which enum should be included in the returned object. `true` to return all enums.
     */
    function getObject<T extends string>(id: T, enumName?: string | true): iobJS.ObjectIdToObjectType<T>;
    function getObject<T extends string>(id: T, callback: iobJS.GetObjectCallback<T>): void;
    function getObject<T extends string>(id: T, enumName: string | true, callback: iobJS.GetObjectCallback<T>): void;
    function getObjectAsync<T extends string>(id: T, enumName?: string | true): iobJS.GetObjectPromise<T>;

    /** Creates or overwrites an object in the object db */
    function setObject(id: string, obj: iobJS.SettableObject, callback?: iobJS.SetObjectCallback): void;
    function setObjectAsync(id: string, obj: iobJS.SettableObject): iobJS.SetObjectPromise;
    /** Extend an object and create it if it might not exist */
    function extendObject(id: string, objPart: iobJS.PartialObject, callback?: iobJS.SetObjectCallback): void;
    function extendObjectAsync(id: string, objPart: iobJS.PartialObject): iobJS.SetObjectPromise;

    /** Deletes an object in the object db */
    function deleteObject(id: string, callback?: ErrorCallback): void;
    function deleteObject(id: string, recursive: boolean, callback?: ErrorCallback): void;
    function deleteObjectAsync(id: string, recursive?: boolean): Promise<void>;

    function getEnums(enumName?: string): { id: string; members: string[]; name: iobJS.StringOrTranslated }[];

    /**
     * Creates a state and the corresponding object under the JavaScript namespace.
     *
     * @param name The name of the state without the namespace
     * @param initValue (optional) Initial value of the state
     * @param forceCreation (optional) Override the state if it already exists
     * @param common (optional) Common part of the state object
     * @param native (optional) Native part of the state object
     * @param callback (optional) Called after the state was created
     */
    function createState(
        name: string,
        initValue: iobJS.StateValue,
        forceCreation: boolean,
        common: Partial<iobJS.StateCommon>,
        native: any,
        callback?: iobJS.SetStateCallback,
    ): void;
    function createState(
        name: string,
        initValue: iobJS.StateValue,
        forceCreation: boolean,
        common: Partial<iobJS.StateCommon>,
        callback?: iobJS.SetStateCallback,
    ): void;
    function createState(
        name: string,
        initValue: iobJS.StateValue,
        forceCreation: boolean,
        callback?: iobJS.SetStateCallback,
    ): void;
    function createState(name: string, callback?: iobJS.SetStateCallback): void;
    function createState(name: string, initValue: iobJS.StateValue, callback?: iobJS.SetStateCallback): void;

    function createState(name: string, common: Partial<iobJS.StateCommon>, callback?: iobJS.SetStateCallback): void;
    function createState(
        name: string,
        initValue: iobJS.StateValue,
        common: Partial<iobJS.StateCommon>,
        callback?: iobJS.SetStateCallback,
    ): void;
    function createState(
        name: string,
        common: Partial<iobJS.StateCommon>,
        native: any,
        callback?: iobJS.SetStateCallback,
    ): void;
    function createState(
        name: string,
        initValue: iobJS.StateValue,
        common: Partial<iobJS.StateCommon>,
        native: any,
        callback?: iobJS.SetStateCallback,
    ): void;

    function createStateAsync(
        name: string,
        initValue?: iobJS.StateValue,
        forceCreation?: boolean,
        common?: Partial<iobJS.StateCommon>,
        native?: any,
    ): iobJS.SetStatePromise;
    function createStateAsync(name: string, common: Partial<iobJS.StateCommon>): iobJS.SetStatePromise;
    function createStateAsync(name: string, common: Partial<iobJS.StateCommon>, native?: any): iobJS.SetStatePromise;
    function createStateAsync(
        name: string,
        initValue: iobJS.StateValue,
        common: Partial<iobJS.StateCommon>,
    ): iobJS.SetStatePromise;
    function createStateAsync(
        name: string,
        initValue: iobJS.StateValue,
        common: Partial<iobJS.StateCommon>,
        native?: any,
    ): iobJS.SetStatePromise;

    function createAlias(name: string, alias: string | iobJS.StateCommonAlias, callback?: iobJS.SetStateCallback): void;
    function createAlias(
        name: string,
        alias: string | iobJS.StateCommonAlias,
        forceCreation: boolean,
        callback?: iobJS.SetStateCallback,
    ): void;
    function createAlias(
        name: string,
        alias: string | iobJS.StateCommonAlias,
        forceCreation: boolean,
        common: Partial<iobJS.StateCommon>,
        callback?: iobJS.SetStateCallback,
    ): void;
    function createAlias(
        name: string,
        alias: string | iobJS.StateCommonAlias,
        forceCreation: boolean,
        common: Partial<iobJS.StateCommon>,
        native: any,
        callback?: iobJS.SetStateCallback,
    ): void;
    function createAlias(
        name: string,
        alias: string | iobJS.StateCommonAlias,
        common: Partial<iobJS.StateCommon>,
        callback?: iobJS.SetStateCallback,
    ): void;
    function createAlias(
        name: string,
        alias: string | iobJS.StateCommonAlias,
        common: Partial<iobJS.StateCommon>,
        native: any,
        callback?: iobJS.SetStateCallback,
    ): void;

    function createAliasAsync(
        name: string,
        alias: string | iobJS.StateCommonAlias,
        forceCreation?: boolean,
        common?: Partial<iobJS.StateCommon>,
        native?: any,
    ): iobJS.SetStatePromise;
    function createAliasAsync(
        name: string,
        alias: string | iobJS.StateCommonAlias,
        common: Partial<iobJS.StateCommon>,
    ): iobJS.SetStatePromise;
    function createAliasAsync(
        name: string,
        alias: string | iobJS.StateCommonAlias,
        common: Partial<iobJS.StateCommon>,
        native?: any,
    ): iobJS.SetStatePromise;

    /**
     * Deletes the state with the given ID
     *
     * @param id The ID of the state to be deleted
     * @param callback (optional) Is called after the state was deleted (or not).
     */
    function deleteState(id: string, callback?: GenericCallback<boolean>): void;
    function deleteStateAsync(id: string): Promise<boolean>;

    /**
     * Sends a message to a specific instance or all instances of some specific adapter.
     *
     * @param instanceName The instance to send this message to.
     * If the ID of an instance is given (e.g. "admin.0"), only this instance will receive the message.
     * If the name of an adapter is given (e.g. "admin"), all instances of this adapter will receive it.
     * @param command (optional) Command name of the target instance. Default: "send"
     * @param message The message (e.g., params) to send.
     */
    function sendTo(
        instanceName: string,
        command: string,
        message: string | object,
        options: iobJS.SendToOptions,
        callback?: iobJS.MessageCallback | iobJS.MessageCallbackInfo,
    ): void;
    function sendTo(
        instanceName: string,
        command: string,
        message: string | object,
        callback?: iobJS.MessageCallback | iobJS.MessageCallbackInfo,
    ): void;
    function sendTo(
        instanceName: string,
        message: string | object,
        callback?: iobJS.MessageCallback | iobJS.MessageCallbackInfo,
    ): void;
    function sendToAsync(
        instanceName: string,
        message: string | object,
    ): Promise<iobJS.MessageCallback | iobJS.MessageCallbackInfo>;
    function sendToAsync(
        instanceName: string,
        command: string,
        message: string | object,
    ): Promise<iobJS.MessageCallback | iobJS.MessageCallbackInfo>;
    function sendToAsync(
        instanceName: string,
        command: string,
        message: string | object,
        options: iobJS.SendToOptions,
    ): Promise<iobJS.MessageCallback | iobJS.MessageCallbackInfo>;

    /**
     * Sends a message to a specific instance or all instances of some specific adapter.
     *
     * @param host Host name.
     * @param command Command name for the target host.
     * @param message The message (e.g., params) to send.
     */
    function sendToHost(
        host: string,
        command: string,
        message: string | object,
        callback?: iobJS.MessageCallback | iobJS.MessageCallbackInfo,
    ): void;
    function sendToHostAsync(
        host: string,
        command: string,
        message: string | object,
    ): Promise<iobJS.MessageCallback | iobJS.MessageCallbackInfo>;

    /**
     * Creates a new notification (visible in admin adapter)
     *
     * @param msg Message text
     */
    function registerNotification(msg: string): void;
    function registerNotification(msg: string, isAlert: boolean): void;

    function setTimeout(callback: (args: void) => void, ms?: number): NodeJS.Timeout;
    function clearTimeout(timeoutId: NodeJS.Timeout | string | number | undefined): void;
    function setInterval(callback: (args: void) => void, ms?: number): NodeJS.Timeout;
    function clearInterval(intervalId: NodeJS.Timeout | string | number | undefined): void;
    function setImmediate(callback: (args: void) => void): NodeJS.Immediate;

    type CompareTimeOperations = 'between' | 'not between' | '>' | '>=' | '<' | '<=' | '==' | '<>';

    /**
     * Compares two or more times
     *
     * @param startTime - The start time to compare with
     * @param endTime - The end time to compare with
     * @param operation - The operation to use for comparison. Possible values:
     * @param timeToCompare - The time to compare with startTime and/or endTime. If none is given, the current time is used
     */
    function compareTime(
        startTime: string | number | Date | iobJS.AstroDate,
        endTime: string | number | Date | iobJS.AstroDate,
        operation: CompareTimeOperations,
        timeToCompare?: string | number | Date | iobJS.AstroDate,
    ): boolean;

    /** Sets up a callback which is called when the script stops */
    function onStop(callback: (cb?: EmptyCallback) => void, timeout?: number): void;

    function formatValue(value: number | string, format?: any): string;
    function formatValue(value: number | string, decimals: number, format?: any): string;
    function formatDate(dateObj: string | Date | number, format: string, language?: string): string;
    function formatDate(
        dateObj: string | Date | number,
        isDuration: boolean | string,
        format: string,
        language?: string,
    ): string;
    function formatTimeDiff(diff: number): string;
    function formatTimeDiff(diff: number, format: string): string;

    function getDateObject(date?: number | string | Date): Date;

    /**
     * Writes a file.
     *
     * @param id Name of the root directory. This should be the adapter instance, e.g. "admin.0"
     * @param name File name
     * @param data Contents of the file
     * @param callback Is called when the operation has finished (successfully or not)
     */
    function writeFile(id: string, name: string, data: Buffer | string, callback: ErrorCallback): void;
    function writeFileAsync(id: string, name: string, data: Buffer | string): Promise<void>;

    /**
     * Reads a file.
     *
     * @param id Name of the root directory. This should be the adapter instance, e.g. "admin.0"
     * @param name File name
     * @param callback Is called when the operation has finished (successfully or not)
     */
    function readFile(id: string, name: string, callback: iobJS.ReadFileCallback): void;
    function readFileAsync(id: string, name: string): iobJS.ReadFilePromise;

    /**
     * Deletes a file.
     *
     * @param id Name of the root directory. This should be the adapter instance, e.g. "admin.0"
     * @param name File name
     * @param callback Is called when the operation has finished (successfully or not)
     */
    function unlink(id: string, name: string, callback: ErrorCallback): void;
    function unlinkAsync(id: string, name: string): Promise<void>;

    /**
     * Deletes a file.
     *
     * @param id Name of the root directory. This should be the adapter instance, e.g. "admin.0"
     * @param name File name
     * @param callback Is called when the operation has finished (successfully or not)
     */
    function delFile(id: string, name: string, callback: ErrorCallback): void;
    function delFileAsync(id: string, name: string): Promise<void>;

    /**
     * Renames a file.
     *
     * @param id Name of the root directory. This should be the adapter instance, e.g. "admin.0"
     * @param oldName Current file name
     * @param newName New file name
     * @param callback Is called when the operation has finished (successfully or not)
     */
    function rename(id: string, oldName: string, newName: string, callback: ErrorCallback): void;
    function renameAsync(id: string, oldName: string, newName: string): Promise<void>;

    /**
     * Renames a file.
     *
     * @param id Name of the root directory. This should be the adapter instance, e.g. "admin.0"
     * @param oldName Current file name
     * @param newName New file name
     * @param callback Is called when the operation has finished (successfully or not)
     */
    function renameFile(id: string, oldName: string, newName: string, callback: ErrorCallback): void;
    function renameFileAsync(id: string, oldName: string, newName: string): Promise<void>;

    function getHistory(instance: any, options: any, callback: any): any;
    function getHistoryAsync(instance: any, options: any): Promise<any>;

    /**
     * Starts or restarts a script by name
     *
     * @param scriptName (optional) Name of the script. If none is given, the current script is (re)started.
     */
    function runScript(scriptName?: string, callback?: ErrorCallback): boolean;
    function runScriptAsync(scriptName?: string): Promise<void>;

    /**
     * Starts or restarts a script by name
     *
     * @param scriptName (optional) Name of the script. If none is given, the current script is (re)started.
     * @param ignoreIfStarted If set to true, running scripts will not be restarted.
     * @param callback (optional) Is called when the script has finished (successfully or not)
     */
    function startScript(
        scriptName: string | undefined,
        ignoreIfStarted: boolean,
        callback?: GenericCallback<boolean>,
    ): boolean;
    function startScriptAsync(scriptName?: string, ignoreIfStarted?: boolean): Promise<void>;

    /**
     * Starts or restarts a script by name
     *
     * @param scriptName (optional) Name of the script. If none is given, the current script is (re)started.
     * @param callback (optional) Is called when the script has finished (successfully or not)
     */
    function startScript(scriptName?: string, callback?: GenericCallback<boolean>): boolean;
    /**
     * Stops a script by name
     *
     * @param scriptName (optional) Name of the script. If none is given, the current script is stopped.
     */
    function stopScript(scriptName: string | undefined, callback?: GenericCallback<boolean>): boolean;
    function stopScriptAsync(scriptName?: string): Promise<void>;

    function isScriptActive(scriptName: string): boolean;

    function startInstanceAsync(instanceName: string): Promise<boolean>;
    function restartInstanceAsync(instanceName: string): Promise<boolean>;
    function stopInstanceAsync(instanceName: string): Promise<boolean>;

    /** Converts a value to an integer */
    function toInt(val: any): number;
    /** Converts a value to a floating point number */
    function toFloat(val: any): number;
    /** Converts a value to a boolean */
    function toBoolean(val: any): boolean;

    /**
     * Digs in an object for the property value at the given path.
     *
     * @param obj The object to dig in
     * @param path The path of the property to dig for in the given object
     */
    function getAttr(obj: string | Record<string, any>, path: string | string[]): any;

    /**
     * Sends a message to another script.
     *
     * @param target Message name or target object
     * @param data Any data, that should be sent to message bus
     * @param options Actually only {timeout: X} is supported as option
     * @param callback Callback to get the result from other script
     * @returns ID of the subscription. It could be used for unsubscribing.
     */
    function messageTo(
        target: iobJS.MessageTarget | string,
        data: any,
        options?: any,
        callback?: SimpleCallback<any>,
    ): iobJS.MessageSubscribeID;
    function messageToAsync(
        target: iobJS.MessageTarget | string,
        data: any,
        options?: any,
    ): Promise<iobJS.MessageCallback | iobJS.MessageCallbackInfo>;

    /**
     * Process message from another script.
     *
     * @param message Message name
     * @param callback Callback to send the result to another script
     */
    function onMessage(message: string, callback?: MessageCallback<any>): null | number;

    /**
     * Unregister onmessage handler
     *
     * @param id Message subscription id from onMessage or by message name
     * @returns true if subscription exists and was deleted.
     */
    function onMessageUnregister(id: iobJS.MessageSubscribeID | string): boolean;

    function jsonataExpression(data: any, expression: string): Promise<any>;

    function onObject(pattern: string, callback: iobJS.ObjectChangeHandler): SubscribeObject | SubscribeObject[] | null;
    function subscribeObject(
        pattern: string,
        callback: iobJS.ObjectChangeHandler,
    ): SubscribeObject | SubscribeObject[] | null;

    function unsubscribeObject(id: string): boolean | boolean[];

    /**
     * Receives logs of specified severity level in a script.
     *
     * @param severity Severity level
     * @param callback Callback to send the result to another script
     */
    function onLog(severity: iobJS.LogLevel | '*', callback: SimpleCallback<iobJS.LogMessage>): iobJS.LogSubscribeID;

    /**
     * Unsubscribe log handler.
     *
     * @param idOrCallbackOrSeverity Message subscription id from onLog or by callback function
     * @returns true if subscription exists and was deleted.
     */
    function onLogUnregister(
        idOrCallbackOrSeverity: iobJS.LogSubscribeID | SimpleCallback<iobJS.LogMessage> | iobJS.LogLevel | '*',
    ): boolean;
    // TODO: More signatures for other types than number

    /** `await` this method to pause for the given number of milliseconds */
    function wait(ms: number): Promise<void>;

    /** `await` this method to pause for the given number of milliseconds */
    function sleep(ms: number): Promise<void>;
}
