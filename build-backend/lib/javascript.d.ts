// import all modules that are available in the sandbox
// this has a nice side effect that we may augment the global scope
import type * as os from 'node:os';
import type { ChildProcess, ExecException } from 'node:child_process';
import type { SubscribeObject } from '../types';

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

        type SettableState = AtLeastOne<ioBroker.State>;

        interface TypedState<T extends ioBroker.StateValue = any> extends ioBroker.State {
            val: T;
        }

        interface AbsentState extends Omit<ioBroker.State, 'ack' | 'from' | 'ts' | 'lc'> {
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

        type Languages = 'en' | 'de' | 'ru' | 'pt' | 'nl' | 'fr' | 'it' | 'es' | 'pl' | 'uk' | 'zh-cn';
        type StringOrTranslated = string | { [lang in Languages]?: string };
        type CommonType = 'number' | 'string' | 'boolean' | 'array' | 'object' | 'mixed' | 'file';

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
            | 'chart';

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
            type Adapter = `system.adapter.${string}`;
            // Guaranteed group objects
            type Group = `system.group.${string}`;
            // Guaranteed user objects
            type User = `system.user.${string}`;
            // Guaranteed host objects
            type Host = `system.host.${string}`;
            // Guaranteed config objects
            type Config = `system.${'certificates' | 'config' | 'repositories'}`;

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

        type ObjectIdToObjectType<
            T extends string,
            Read extends 'read' | 'write' = 'read',
            O = T extends ObjectIDs.State // State must come before Adapter or system.adapter.admin.0.foobar will resolve to AdapterObject
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
                                    : T extends ObjectIDs.Config
                                      ? OtherObject & { type: 'config' }
                                      : T extends ObjectIDs.AdapterScoped
                                        ? AdapterScopedObject
                                        : iobJS.AnyObject,
            // When reading objects, we should be less strict, so working with the return type is less of a pain to work with
        > = Read extends 'read' ? AnyOf<O> : O;

        interface ObjectCommon {
            /** The name of this object as a simple string or an object with translations */
            name: StringOrTranslated;

            /** When set to true, this object may not be deleted */
            dontDelete?: true;

            /** When set to true, this object is only visible when expert mode is turned on in admin */
            expert?: true;

            // Icon and role aren't defined in SCHEMA.md,
            // but they are being used by some adapters
            /** Icon for this object */
            icon?: string;
            /** role of the object */
            role?: string;
        }

        interface StateCommonAlias {
            /** The target state id or two target states used for reading and writing values */
            id: string | { read: string; write: string };
            /** An optional conversion function when reading, e.g. `"(val − 32) * 5/9"` */
            read?: string;
            /** An optional conversion function when reading, e.g. `"(val * 9/5) + 32"` */
            write?: string;
        }

        interface StateCommon extends ObjectCommon {
            /** Type of this state. See https://github.com/ioBroker/ioBroker/blob/master/doc/SCHEMA.md#state-commonrole for a detailed description */
            type?: CommonType;
            /** minimum value */
            min?: number;
            /** maximum value */
            max?: number;
            /** the allowed interval for numeric values */
            step?: number;
            /** unit of the value */
            unit?: string;
            /** description of this state */
            desc?: StringOrTranslated;

            /** if this state is readable */
            read: boolean;
            /** if this state is writable */
            write: boolean;
            /** role of the state (used in user interfaces to indicate which widget to choose) */
            role: string;

            /** the default value */
            def?: ioBroker.StateValue;
            /** the default status of the ack flag */
            defAck?: boolean;

            /** Configures this state as an alias for another state */
            alias?: StateCommonAlias;

            /**
             * Dictionary of possible values for this state in the form
             * <pre>
             * {
             *     "internal value 1": "displayed value 1",
             *     "internal value 2": "displayed value 2",
             *     ...
             * }
             * </pre>
             * In old ioBroker versions, this could also be a string of the form
             * "val1:text1;val2:text2" (now deprecated)
             */
            states?: Record<string, string> | string;

            /** ID of a helper state indicating if the handler of this state is working */
            workingID?: string;

            /** @deprecated moved to `custom.history´ - attached history information */
            history?: any;

            /** Custom settings for this state */
            custom?: Record<string, any>;

            /**
             * Settings for IOT adapters and how the state should be named in e.g., Alexa.
             * The string "ignore" is a special case, causing the state to be ignored.
             */
            smartName?:
                | string
                | ({ [lang in Languages]?: string } & {
                      /** Which kind of device this is */
                      smartType?: string | null;
                      /** Which value to set when the ON command is issued */
                      byOn?: string | null;
                  });
        }
        interface ChannelCommon extends ObjectCommon {
            /** description of this channel */
            desc?: string;

            // Make it possible to narrow the object type using the custom property
            custom?: undefined;
        }
        interface DeviceCommon extends ObjectCommon {
            // TODO: any other definition for device?

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
            // Meta-objects have to additional CommonTypes
            type: CommonType | 'meta.user' | 'meta.folder';

            // Make it possible to narrow the object type using the custom property
            custom?: undefined;
        }

        type InstanceMode = 'none' | 'daemon' | 'subscribe' | 'schedule' | 'once' | 'extension';
        interface InstanceCommon extends ObjectCommon {
            /** The name of the host where this instance is running */
            host: string;
            enabled: boolean;
            /** How and when this instance should be started */
            mode: InstanceMode;

            // Make it possible to narrow the object type using the custom property
            custom?: undefined;
        }

        interface HostCommon extends ObjectCommon {
            /** The display name of this host */
            name: string;
            title: string;
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
                env: Record<string, string>;
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
                cpus: ReturnType<(typeof os)['cpus']>;
                totalmem: ReturnType<(typeof os)['totalmem']>;
                networkInterfaces: ReturnType<(typeof os)['networkInterfaces']>;
            };
        }

        type UserCommon = ioBroker.UserCommon;

        type GroupCommon = ioBroker.GroupCommon;

        type ScriptCommon = ioBroker.ScriptCommon;

        type AdapterCommon = ioBroker.AdapterCommon;

        interface OtherCommon extends ObjectCommon {
            [propName: string]: any;

            // Make it possible to narrow the object type using the custom property
            custom?: undefined;
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
            enums?: Record<string, string>;
            acl?: ObjectACL;
            from?: string;
            /** The user who created or updated this object */
            user?: string;
            ts?: number;
        }

        interface StateObject extends BaseObject {
            type: 'state';
            common: StateCommon;
            acl?: StateACL;
            /** The IDs of enums this state is assigned to. For example ["enum.functions.Licht","enum.rooms.Garten"] */
            enumIds?: string[];
            /** The names of enums this state is assigned to. For example ["Licht","Garten"] */
            enumNames?: Array<iobJS.StringOrTranslated>;
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

        interface InstanceObject extends BaseObject {
            type: 'instance';
            common: InstanceCommon;
        }
        interface PartialInstanceObject extends Partial<Omit<InstanceObject, 'common'>> {
            common?: Partial<InstanceCommon>;
        }

        interface AdapterObject extends BaseObject {
            type: 'adapter';
            common: AdapterCommon;
            /** An array of `native` properties which cannot be accessed from outside the defining adapter */
            protectedNative?: string[];
            /** Like protectedNative, but the properties are also encrypted and decrypted automatically */
            encryptedNative?: string[];
        }
        interface PartialAdapterObject extends Partial<Omit<AdapterObject, 'common'>> {
            common?: Partial<AdapterCommon>;
        }

        interface HostObject extends BaseObject {
            type: 'host';
            common: HostCommon;
            native: HostNative;
        }
        interface PartialHostObject extends Partial<Omit<HostObject, 'common' | 'native'>> {
            common?: Partial<HostCommon>;
            native?: Partial<HostNative>;
        }

        interface UserObject extends BaseObject {
            type: 'user';
            common: UserCommon;
        }
        interface PartialUserObject extends Partial<Omit<UserObject, 'common'>> {
            common?: Partial<UserCommon>;
        }

        interface GroupObject extends BaseObject {
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

        interface OtherObject extends BaseObject {
            type: 'config' | 'chart';
            common: OtherCommon;
        }
        interface PartialOtherObject extends Partial<Omit<OtherObject, 'common'>> {
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
            | OtherObject;

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
            | PartialOtherObject;

        /** All objects that usually appear in an adapter scope */
        type AdapterScopedObject = FolderObject | DeviceObject | ChannelObject | StateObject;

        // For all objects that are exposed to the user we need to tone the strictness down.
        // Otherwise, every operation on objects becomes a pain to work with
        type Object = AnyObject;

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
        interface ChangedStateObject<TOld extends ioBroker.StateValue = any, TNew extends ioBroker.StateValue = TOld>
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

        type SetStateCallback = (err?: Error | null, id?: string) => void | Promise<void>;
        type SetStatePromise = Promise<NonNullCallbackReturnTypeOf<SetStateCallback>>;

        type StateChangeHandler<TOld extends ioBroker.StateValue = any, TNew extends TOld = any> = (
            obj: ChangedStateObject<TOld, TNew>,
        ) => void | Promise<void>;
        type ObjectChangeHandler = (id: string, obj: iobJS.Object) => void | Promise<void>;

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

        /** Callback information for a passed message */
        interface MessageCallbackInfo {
            /** The original message payload */
            message: string | object;
            /** ID of this callback */
            id: number;
            // ???
            ack: boolean;
            /** Timestamp of this message */
            time: number;
        }
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
            change?: 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le' | 'any';
            val?: ioBroker.StateValue;
            /** New value must not be equal to given one */
            valNe?: ioBroker.StateValue;
            /** New value must be greater than given one */
            valGt?: number;
            /** New value must be greater or equal to given one */
            valGe?: number;
            /** New value must be smaller than given one */
            valLt?: number;
            /** New value must be smaller or equal to given one */
            valLe?: number;
            /** Acknowledged state of new value is equal to given one */
            ack?: boolean;
            /** Previous value must be equal to given one */
            oldVal?: ioBroker.StateValue;
            /** Previous value must be not equal to given one */
            oldValNe?: ioBroker.StateValue;
            /** Previous value must be greater than given one */
            oldValGt?: number;
            /** Previous value must be greater or equal given one */
            oldValGe?: number;
            /** Previous value must be smaller than given one */
            oldValLt?: number;
            /** Previous value must be smaller or equal to given one */
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
            getState<T extends ioBroker.StateValue = any>(callback: GetStateCallback<T>): void;
            getState<T extends ioBroker.StateValue = any>(): TypedState<T> | null | undefined;
            getStateAsync<T extends ioBroker.StateValue = any>(): Promise<
                TypedState<T> | iobJS.AbsentState | null | undefined
            >;

            /**
             * Sets all queried states to the given value.
             */
            setState(
                state: ioBroker.StateValue | ioBroker.SettableState,
                ack?: boolean | 'true' | 'false' | SetStateCallback,
                callback?: SetStateCallback,
            ): this;
            setStateAsync(
                state: ioBroker.StateValue | ioBroker.SettableState,
                ack?: boolean | 'true' | 'false',
            ): Promise<void>;
            setStateDelayed(
                state: ioBroker.StateValue | ioBroker.SettableState,
                isAck: boolean | number | undefined,
                delay?: number | boolean,
                clearRunning?: boolean | (() => void),
                callback?: () => void,
            ): this;

            /**
             * Sets all queried states to the given value only if the value really changed.
             */
            setStateChanged(
                state: ioBroker.StateValue | ioBroker.SettableState,
                ack?: boolean,
                callback?: SetStateCallback,
            ): this;
            setStateChangedAsync(state: ioBroker.StateValue | ioBroker.SettableState, ack?: boolean): Promise<void>;

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

        interface LogMessage {
            severity: LogLevel; // severity
            ts: number; // timestamp as Date.now()
            message: string; // message
            from: string; // origin of the message
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
     * @param id ID of meta-object, like `vis.0`
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
     * Creates a schedule based on the state value (e.g. 12:53:09)
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
        state: ioBroker.StateValue | ioBroker.SettableState,
        callback?: iobJS.SetStateCallback,
    ): void;
    function setState(
        id: string,
        state: ioBroker.StateValue | ioBroker.SettableState,
        ack: boolean,
        callback?: iobJS.SetStateCallback,
    ): void;

    function setStateAsync(
        id: string,
        state: ioBroker.StateValue | ioBroker.SettableState,
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
        state: ioBroker.StateValue | ioBroker.SettableState,
        callback?: iobJS.SetStateCallback,
    ): void;
    function setStateChanged(
        id: string,
        state: ioBroker.StateValue | ioBroker.SettableState,
        ack: boolean,
        callback?: iobJS.SetStateCallback,
    ): void;

    function setStateChangedAsync(
        id: string,
        state: ioBroker.StateValue | ioBroker.SettableState,
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
        state: ioBroker.StateValue | ioBroker.SettableState,
        delay: number,
        clearRunning: boolean,
        callback?: iobJS.SetStateCallback,
    ): number | null;
    function setStateDelayed(
        id: string,
        state: ioBroker.StateValue | ioBroker.SettableState,
        ack: boolean,
        clearRunning: boolean,
        callback?: iobJS.SetStateCallback,
    ): number | null;
    function setStateDelayed(
        id: string,
        state: ioBroker.StateValue | ioBroker.SettableState,
        ack: boolean,
        delay: number,
        callback?: iobJS.SetStateCallback,
    ): number | null;
    function setStateDelayed(
        id: string,
        state: ioBroker.StateValue | ioBroker.SettableState,
        delay: number,
        callback?: iobJS.SetStateCallback,
    ): number | null;
    function setStateDelayed(
        id: string,
        state: ioBroker.StateValue | ioBroker.SettableState,
        callback?: iobJS.SetStateCallback,
    ): number | null;
    function setStateDelayed(
        id: string,
        state: ioBroker.StateValue | ioBroker.SettableState,
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
    function getState<T extends ioBroker.StateValue = any>(id: string, callback: iobJS.GetStateCallback<T>): void;
    function getState<T extends ioBroker.StateValue = any>(id: string): iobJS.TypedState<T> | iobJS.AbsentState;
    function getStateAsync<T extends ioBroker.StateValue = any>(id: string): Promise<iobJS.TypedState<T>>;

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
    function getObject<T extends string>(id: T, enumName?: string | true): iobJS.ObjectIdToObjectType<T, 'read'>;
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

    function getEnums(enumName?: string): { id: string; members: string[]; name: ioBroker.StringOrTranslated }[];

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
        initValue: ioBroker.StateValue,
        forceCreation: boolean,
        common: Partial<iobJS.StateCommon>,
        native: any,
        callback?: iobJS.SetStateCallback,
    ): void;
    function createState(
        name: string,
        initValue: ioBroker.StateValue,
        forceCreation: boolean,
        common: Partial<iobJS.StateCommon>,
        callback?: iobJS.SetStateCallback,
    ): void;
    function createState(
        name: string,
        initValue: ioBroker.StateValue,
        forceCreation: boolean,
        callback?: iobJS.SetStateCallback,
    ): void;
    function createState(name: string, callback?: iobJS.SetStateCallback): void;
    function createState(name: string, initValue: ioBroker.StateValue, callback?: iobJS.SetStateCallback): void;

    function createState(name: string, common: Partial<iobJS.StateCommon>, callback?: iobJS.SetStateCallback): void;
    function createState(
        name: string,
        initValue: ioBroker.StateValue,
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
        initValue: ioBroker.StateValue,
        common: Partial<iobJS.StateCommon>,
        native: any,
        callback?: iobJS.SetStateCallback,
    ): void;

    function createStateAsync(
        name: string,
        initValue?: ioBroker.StateValue,
        forceCreation?: boolean,
        common?: Partial<iobJS.StateCommon>,
        native?: any,
    ): iobJS.SetStatePromise;
    function createStateAsync(name: string, common: Partial<iobJS.StateCommon>): iobJS.SetStatePromise;
    function createStateAsync(name: string, common: Partial<iobJS.StateCommon>, native?: any): iobJS.SetStatePromise;
    function createStateAsync(
        name: string,
        initValue: ioBroker.StateValue,
        common: Partial<iobJS.StateCommon>,
    ): iobJS.SetStatePromise;
    function createStateAsync(
        name: string,
        initValue: ioBroker.StateValue,
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
     * @returns ID of the subscription. It could be used for unsubscribe.
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
