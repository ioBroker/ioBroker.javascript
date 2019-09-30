// import all modules that are available in the sandbox
// this has the nice side effect that we may augment the global scope
import child_process = require("child_process");

type EmptyCallback = () => void;
type ErrorCallback = (err?: string) => void;
type GenericCallback<T> = (err: string | null, result?: T) => void;

// tslint:disable:no-namespace
declare global {

	namespace iobJS {

		enum StateQuality {
			good = 0x00, // or undefined or null
			bad = 0x01,
			general_problem = 0x01,
			general_device_problem = 0x41,
			general_sensor_problem = 0x81,
			device_not_connected = 0x42,
			sensor_not_connected = 0x82,
			device_reports_error = 0x44,
			sensor_reports_error = 0x84,
		}

		interface State<T extends StateValue = any> {
			/** The value of the state. */
			val: T;

			/** Direction flag: false for desired value and true for actual value. Default: false. */
			ack: boolean;

			/** Unix timestamp. Default: current time */
			ts: number;

			/** Unix timestamp of the last time the value changed */
			lc: number;

			/** Name of the adapter instance which set the value, e.g. "system.adapter.web.0" */
			from: string;

			/** Optional time in seconds after which the state is reset to null */
			expire?: number;

			/** Optional quality of the state value */
			q?: StateQuality;

			/** Optional comment */
			c?: string;

			/** Discriminant property to switch between AbsentState and State<T> */
			notExist: undefined;
		}

		type PrimitiveTypeStateValue = string | number | boolean;

		type StateValue = null | PrimitiveTypeStateValue | PrimitiveTypeStateValue[] | Record<string, any>;

		interface AbsentState {
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

		type ObjectType = "state" | "channel" | "device";
		type CommonType = "number" | "string" | "boolean" | "array" | "object" | "mixed" | "file";

		// Maybe this should extend Record<string, any>,
		// but the extra properties aren't defined anywhere,
		// so I'd rather force the user to explicitly state
		// he knows what he's doing by casting to any
		interface ObjectCommon {
			/** name of this object */
			name: string;

			// Icon and role aren't defined in SCHEMA.md,
			// but they are being used by some adapters
			/** Icon for this object */
			icon?: string;
			/** role of the object */
			role?: string;
		}

		// TODO: def can be further restricted depending on the object type
		interface StateCommon extends ObjectCommon {
			/** Type of this state. See https://github.com/ioBroker/ioBroker/blob/master/doc/SCHEMA.md#state-commonrole for a detailed description */
			type?: CommonType;
			/** minimum value */
			min?: number;
			/** maximum value */
			max?: number;
			/** unit of the value */
			unit?: string;
			/** the default value */
			def?: StateValue;
			/** description of this state */
			desc?: string;

			/** if this state is readable */
			read: boolean;
			/** if this state is writable */
			write: boolean;
			/** role of the state (used in user interfaces to indicate which widget to choose) */
			role: string;

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

			/** attached history information */
			history?: any;
		}
		interface ChannelCommon extends ObjectCommon {
			/** description of this channel */
			desc?: string;
		}
		type OtherCommon = ObjectCommon & {
			[propName: string]: any;
		};

		interface TargetObject {
            instance: string; // javascript instance (optional)
            script: string; // script name (optional)
            message: string; // message name (required)
		}

		interface BaseObject {
			/** The ID of this object */
			_id?: string;
			native: Record<string, any>;
			enums?: Record<string, string>;
			type: string; // specified in the derived interfaces
			common: ObjectCommon;
			// acl?: ObjectACL;
		}

		interface StateObject extends BaseObject {
			type: "state";
			common: StateCommon;
			// acl?: StateACL;
		}
		interface PartialStateObject extends Partial<Pick<StateObject, "_id" | "native" | "enums" | "type">> {
			common?: Partial<StateCommon>;
			// acl?: Partial<StateACL>;
		}

		interface ChannelObject extends BaseObject {
			type: "channel";
			common: ChannelCommon;
		}
		interface PartialChannelObject extends Partial<Pick<ChannelObject, "_id" | "native" | "enums" | "type" /* | "acl"*/>> {
			common?: Partial<ChannelCommon>;
		}

		interface DeviceObject extends BaseObject {
			type: "device";
			common: ObjectCommon; // TODO: any definition for device?
		}
		interface PartialDeviceObject extends Partial<Pick<DeviceObject, "_id" | "native" | "enums" | "type" /* | "acl"*/>> {
			common?: Partial<ObjectCommon>;
		}

		// TODO: specify definitions for each object type
		// I grouped them together because I'm lazy...
		interface OtherObject extends BaseObject {
			type: "adapter" | "config" | "enum" | "group" | "host" | "info" | "instance" | "meta" | "script" | "user";
			common: OtherCommon;
		}
		interface PartialOtherObject extends Partial<Pick<OtherObject, "_id" | "native" | "enums" | "type" /* | "acl"*/>> {
			common?: Partial<OtherCommon>;
		}
		/** Represents the change of a state */
		interface ChangedStateObject<TOld extends StateValue = any, TNew extends StateValue = TOld> extends StateObject {
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
			enumNames?: string[];
			/** new state */
			state: State<TNew>;
			/** @deprecated Use state instead **/
			newState: State<TNew>;
			/** previous state */
			oldState: State<TOld>;
			/** Name of the adapter instance which set the value, e.g. "system.adapter.web.0" */
			from?: string;
			/** Unix timestamp. Default: current time */
			ts?: number;
			/** Unix timestamp of the last time the value changed */
			lc?: number;
			/** Direction flag: false for desired value and true for actual value. Default: false. */
			ack?: boolean;
		}

		type Object = StateObject | ChannelObject | DeviceObject | OtherObject;
		type PartialObject = PartialStateObject | PartialChannelObject | PartialDeviceObject | PartialOtherObject;

		type GetStateCallback<T extends StateValue = any> = (err: string | null, state?: State<T> | AbsentState) => void;
		type SetStateCallback = (err: string | null, id?: string) => void;
		type GetBinaryStateCallback = (err: string | null, state?: Buffer) => void;

		type StateChangeHandler<TOld extends StateValue = any, TNew extends TOld = any> = (obj: ChangedStateObject<TOld, TNew>) => void;

		type SetObjectCallback = (err: string | null, obj: { id: string }) => void;
		type GetObjectCallback = (err: string | null, obj: iobJS.Object) => void;

		type LogLevel = "silly" | "debug" | "info" | "warn" | "error";

		type ReadFileCallback = (err: string | null, file?: Buffer | string, mimeType?: string) => void;

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
		type MessageCallback = (result?: any) => void;

		interface Subscription {
			name: string;
			pattern: string | RegExp | string[] | iobJS.SubscribeOptions | iobJS.SubscribeTime | iobJS.AstroSchedule;
		}

		interface SubscribeOptions {
			/** "and" or "or" logic to combine the conditions (default: "and") */
			logic?: "and" | "or";
			/** name is equal or matches to given one or name marches to any item in given list */
			id?: string | string[] | SubscribeOptions[] | RegExp | RegExp[];
			/** name is equal or matches to given one */
			name?: string | string[] | RegExp;
			/** type of change */
			change?: "eq" | "ne" | "gt" | "ge" | "lt" | "le" | "any";
			val?: StateValue;
			/** New value must not be equal to given one */
			valNe?: StateValue;
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
			oldVal?: StateValue;
			/** Previous value must be not equal to given one */
			oldValNe?: StateValue;
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
			/** Previous time stamp must be greater than given value (oldState.ts > ts) */
			oldTsGe?: number;
			/** Previous time stamp must be greater or equal to given one (oldState.ts >= ts) */
			oldTsLt?: number;
			/** Previous time stamp must be smaller than given one (oldState.ts < ts) */
			oldTsLe?: number;
			/** Last change time stamp must be equal to given one (state.lc == lc) */
			lc?: number;
			/** Last change time stamp must be not equal to the given one (state.lc != lc) */
			lcGt?: number;
			/** Last change time stamp must be greater than given value (state.lc > lc) */
			lcGe?: number;
			/** Last change time stamp must be greater or equal to given one (state.lc >= lc) */
			lcLt?: number;
			/** Last change time stamp must be smaller than given one (state.lc < lc) */
			lcLe?: number;
			/** Previous last change time stamp must be equal to given one (oldState.lc == lc) */
			oldLc?: number;
			/** Previous last change time stamp must be not equal to the given one (oldState.lc != lc) */
			oldLcGt?: number;
			/** Previous last change time stamp must be greater than given value (oldState.lc > lc) */
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

		interface QueryResult {
			/** State-ID */
			[index: number]: string;
			/** Number of matched states */
			length: number;
			/** Contains the error if one happened */
			error?: string;

			/**
			 * Executes a function for each state id in the result array
			 * The execution is canceled if a callback returns false
			 */
			each(callback?: (id: string, index: number) => boolean | void): this;

			/**
			 * Returns the first state found by this query.
			 * If the adapter is configured to subscribe to all states on start,
			 * this can be called synchronously and immediately returns the state.
			 * Otherwise you need to provide a callback.
			 */
			getState<T extends StateValue = any>(callback: GetStateCallback<T>): void;
			getState<T extends StateValue = any>(): State<T> | null | undefined;

			/**
			 * Returns the first state found by this query.
			 * If the adapter is configured to subscribe to all states on start,
			 * this can be called synchronously and immediately returns the state.
			 * Otherwise you need to provide a callback.
			 */
			getBinaryState(callback: GetBinaryStateCallback): void;
			getBinaryState(): Buffer | null | undefined;

			/**
			 * Sets all queried states to the given value.
			 */
			setState<T extends StateValue>(id: string, state: T | State<T> | Partial<State<T>>, ack?: boolean, callback?: SetStateCallback): this;

			/**
			 * Sets all queried binary states to the given value.
			 */
			setBinaryState: (id: string, state: Buffer, ack?: boolean, callback?: SetStateCallback) => this;

			/**
			 * Subscribes the given callback to changes of the matched states.
			 */
			on(callback: StateChangeHandler): this;
		}

		/**
		 * * "sunrise": sunrise (top edge of the sun appears on the horizon)
		 * * "sunriseEnd": sunrise ends (bottom edge of the sun touches the horizon)
		 * * "goldenHourEnd": morning golden hour (soft light, best time for photography) ends
		 * * "solarNoon": solar noon (sun is in the highest position)
		 * * "goldenHour": evening golden hour starts
		 * * "sunsetStart": sunset starts (bottom edge of the sun touches the horizon)
		 * * "sunset": sunset (sun disappears below the horizon, evening civil twilight starts)
		 * * "dusk": dusk (evening nautical twilight starts)
		 * * "nauticalDusk": nautical dusk (evening astronomical twilight starts)
		 * * "night": night starts (dark enough for astronomical observations)
		 * * "nightEnd": night ends (morning astronomical twilight starts)
		 * * "nauticalDawn": nautical dawn (morning nautical twilight starts)
		 * * "dawn": dawn (morning nautical twilight ends, morning civil twilight starts)
		 * * "nadir": nadir (darkest moment of the night, sun is in the lowest position)
		 */
		type AstroPattern = "sunrise" | "sunriseEnd" | "goldenHourEnd" | "solarNoon" | "goldenHour" | "sunsetStart" | "sunset" | "dusk" | "nauticalDusk" | "night" | "nightEnd" | "nauticalDawn" | "dawn" | "nadir";

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

		type SchedulePattern = ScheduleRule | ScheduleRuleConditional | Date | string | number;

		interface SubscribeTime {
			time: SchedulePattern;
		}
	} // end namespace iobJS

	// =======================================================
	// available functions in the sandbox
	// =======================================================

	// The already pre-loaded request module
	const request: typeof import("request");

	/**
	 * The instance number of the JavaScript adapter this script runs in
	 */
	const instance: number;
	/**
	 * The name of the current script
	 */
	// @ts-ignore We need this variable although it conflicts with lib.es6
	const name: string;
	/**
	 * The name of the current script
	 */
	const scriptName: string;

	/**
	 * Queries all states with the given selector
	 * @param selector See @link{https://github.com/ioBroker/ioBroker.javascript#---selector} for a description
	 */
	function $(selector: string): iobJS.QueryResult;

	/**
	 * Prints a message in the ioBroker log
	 * @param message The message to print
	 * @param severity (optional) severity of the message. default = "info"
	 */
	function log(message: string, severity?: iobJS.LogLevel): void;

	// TODO: Do we need this?
	// namespace console {
	// 	/** log message with debug level */
	// 	function debug(message: string): void;
	// 	/** log message with info level (default output level for all adapters) */
	// 	function info(message: string): void;
	// 	/** log message with warning severity */
	// 	function warn(message: string): void;
	// 	/** log message with error severity */
	// 	function error(message: string): void;
	// }

	/**
	 * Executes a system command
	 */
	function exec(command: string, callback?: (err: Error, stdout: string, stderr: string) => void): child_process.ChildProcess;

	/**
	 * Sends an email using the email adapter.
	 * See the adapter documentation for a description of the msg parameter.
	 */
	function email(msg: any): void;

	/**
	 * Sends a pushover message using the pushover adapter.
	 * See the adapter documentation for a description of the msg parameter.
	 */
	function pushover(msg: any): void;

	/**
	 * Subscribe to changes of the matched states.
	 */
	function on(pattern: string | RegExp | string[], handler: iobJS.StateChangeHandler): any;
	function on(
		astroOrScheduleOrOptions: iobJS.AstroSchedule | iobJS.SubscribeTime | iobJS.SubscribeOptions,
		handler: iobJS.StateChangeHandler
	): any;
	/**
	 * Subscribe to changes of the matched states.
	 */
	function subscribe(pattern: string | RegExp | string[], handler: iobJS.StateChangeHandler): any;
	function subscribe(
		astroOrScheduleOrOptions: iobJS.AstroSchedule | iobJS.SubscribeTime | iobJS.SubscribeOptions,
		handler: iobJS.StateChangeHandler
	): any;

	/**
	 * Registers a one-time subscription which automatically unsubscribes after the first invocation
	 */
	function once(
		pattern: string | RegExp | string[] | iobJS.AstroSchedule | iobJS.SubscribeTime | iobJS.SubscribeOptions,
		handler: iobJS.StateChangeHandler
	): any;
	function once(
		pattern: string | RegExp | string[] | iobJS.AstroSchedule | iobJS.SubscribeTime | iobJS.SubscribeOptions
	): Promise<iobJS.ChangedStateObject>;

	/**
	 * Causes all changes of the state with id1 to the state with id2.
	 * The return value can be used to unsubscribe later
	 */
	function on(id1: string, id2: string): any;
	/**
	 * Watches the state with id1 for changes and overwrites the state with id2 with value2 when any occur.
	 * @param id1 The state to watch for changes
	 * @param id2 The state to update when changes occur
	 * @param value2 The value to write into state `id2` when `id1` gets changed
	 */
	function on(id1: string, id2: string, value2: any): any;

	/**
	 * Causes all changes of the state with id1 to the state with id2
	 */
	function subscribe(id1: string, id2: string): any;
	/**
	 * Watches the state with id1 for changes and overwrites the state with id2 with value2 when any occur.
	 * @param id1 The state to watch for changes
	 * @param id2 The state to update when changes occur
	 * @param value2 The value to write into state `id2` when `id1` gets changed
	 */
	function subscribe(id1: string, id2: string, value2: any): any;

	/**
	 * Returns the list of all currently active subscriptions
	 */
	function getSubscriptions(): { [id: string]: iobJS.Subscription[] };

	/**
	 * Unsubscribe from changes of the given object ID(s) or handler(s)
	 */
	function unsubscribe(id: string | string[]): boolean;
	function unsubscribe(handler: any | any[]): boolean;

	function adapterSubscribe(id: string): void;
	function adapterUnsubscribe(id: string): void;

	/**
	 * Schedules a function to be executed on a defined schedule.
	 * The return value can be used to clear the schedule later.
	 */
	function schedule(pattern: string | iobJS.SchedulePattern, callback: () => void): any;
	function schedule(date: Date, callback: () => void): any;
	function schedule(astro: iobJS.AstroSchedule, callback: () => void): any;
	/**
	 * Clears a schedule. Returns true if it was successful.
	 */
	function clearSchedule(schedule: any): boolean;

	/**
	 * Calculates the astro time which corresponds to the given pattern.
	 * For valid patterns, see @link{https://github.com/ioBroker/ioBroker.javascript#astro--function}
	 * @param date (optional) The date for which the astro time should be calculated. Default = today
	 * @param offsetMinutes (optional) The amount of minutes to be added to the return value.
	 */
	function getAstroDate(pattern: string, date?: number, offsetMinutes?: number): Date;

	/**
	 * Determines if now is between sunrise and sunset.
	 */
	function isAstroDay(): boolean;

	/**
	 * Sets a state to the given value
	 * @param id The ID of the state to be set
	 */
	function setState<T extends iobJS.StateValue>(id: string, state: T | iobJS.State<T> | Partial<iobJS.State<T>>, callback?: iobJS.SetStateCallback): void;
	function setState<T extends iobJS.StateValue>(id: string, state: T | iobJS.State<T> | Partial<iobJS.State<T>>, ack: boolean, callback?: iobJS.SetStateCallback): void;

	/**
	 * Sets a state to the given value after a timeout has passed.
	 * Returns the timer so it can be manually cleared with clearStateDelayed
	 * @param id The ID of the state to be set
	 * @param delay The delay in milliseconds
	 * @param clearRunning (optional) Whether an existing timeout for this state should be cleared
	 */
	function setStateDelayed<T extends iobJS.StateValue>(id: string, state: T | iobJS.State<T> | Partial<iobJS.State<T>>, delay: number, clearRunning: boolean, callback?: iobJS.SetStateCallback): any;
	function setStateDelayed<T extends iobJS.StateValue>(id: string, state: T | iobJS.State<T> | Partial<iobJS.State<T>>, ack: boolean, clearRunning: boolean, callback?: iobJS.SetStateCallback): any;
	function setStateDelayed<T extends iobJS.StateValue>(id: string, state: T | iobJS.State<T> | Partial<iobJS.State<T>>, ack: boolean, delay: number, callback?: iobJS.SetStateCallback): any;
	function setStateDelayed<T extends iobJS.StateValue>(id: string, state: T | iobJS.State<T> | Partial<iobJS.State<T>>, delay: number, callback?: iobJS.SetStateCallback): any;
	function setStateDelayed<T extends iobJS.StateValue>(id: string, state: T | iobJS.State<T> | Partial<iobJS.State<T>>, callback?: iobJS.SetStateCallback): any;
	function setStateDelayed<T extends iobJS.StateValue>(id: string, state: T | iobJS.State<T> | Partial<iobJS.State<T>>, ack: boolean, delay: number, clearRunning: boolean, callback?: iobJS.SetStateCallback): any;

	/**
	 * Clears a timer created by setStateDelayed
	 * @param id The state id for which the timer should be cleared
	 * @param timerID (optional) ID of the specific timer to clear. If none is given, all timers are cleared.
	 */
	function clearStateDelayed(id: string, timerID?: any): boolean;

	/**
	 * Sets a binary state to the given value
	 * @param id The ID of the state to be set
	 */
	function setBinaryState(id: string, state: Buffer, callback?: iobJS.SetStateCallback): void;

	/**
	 * Returns the state with the given ID.
	 * If the adapter is configured to subscribe to all states on start,
	 * this can be called synchronously and immediately returns the state.
	 * Otherwise you need to provide a callback.
	 */
	function getState<T extends iobJS.StateValue = any>(id: string, callback: iobJS.GetStateCallback<T>): void;
	function getState<T extends iobJS.StateValue = any>(id: string): iobJS.State<T> | iobJS.AbsentState;

	/**
	 * Returns the binary state with the given ID.
	 * If the adapter is configured to subscribe to all states on start,
	 * this can be called synchronously and immediately returns the state.
	 * Otherwise you need to provide a callback.
	 */
	function getBinaryState(id: string, callback: iobJS.GetStateCallback): void;
	function getBinaryState(id: string): Buffer;

	/**
	 * Checks if the state with the given ID exists
	 */
	function existsState(id: string): boolean;
	/**
	 * Checks if the object with the given ID exists
	 */
	function existsObject(id: string): boolean;

	/**
	 * Returns the IDs of the states with the given name
	 * @param name Name of the state
	 * @param forceArray (optional) Ensures that the return value is always an array, even if only one ID was found.
	 */
	function getIdByName(name: string, forceArray?: boolean): string | string[];

	/**
	 * Reads an object from the object db
	 */
	function getObject(id: string, enumName?: string): iobJS.Object;
	/** Creates or overwrites an object in the object db */
	function setObject(id: string, obj: iobJS.Object, callback?: iobJS.SetObjectCallback): void;
	/** Extend an object and create it if it might not exist */
	function extendObject(id: string, objPart: iobJS.PartialObject, callback?: iobJS.SetObjectCallback): void;

	function getEnums(enumName?: string): any;

	/**
	 * Creates a state and the corresponding object under the javascript namespace.
	 * @param name The name of the state without the namespace
	 * @param initValue (optional) Initial value of the state
	 * @param forceCreation (optional) Override the state if it already exists
	 * @param common (optional) Common part of the state object
	 * @param native (optional) Native part of the state object
	 * @param callback (optional) Called after the state was created
	 */
	function createState(name: string, callback?: iobJS.SetStateCallback): void;
	function createState(name: string, initValue: iobJS.StateValue, callback?: iobJS.SetStateCallback): void;
	function createState(name: string, initValue: iobJS.StateValue, forceCreation: boolean, callback?: iobJS.SetStateCallback): void;
	function createState(name: string, initValue: iobJS.StateValue, forceCreation: boolean, common: Partial<iobJS.StateCommon>, callback?: iobJS.SetStateCallback): void;
	function createState(name: string, initValue: iobJS.StateValue, forceCreation: boolean, common: Partial<iobJS.StateCommon>, native: any, callback?: iobJS.SetStateCallback): void;
	function createState(name: string, common: Partial<iobJS.StateCommon>, callback?: iobJS.SetStateCallback): void;
	function createState(name: string, initValue: iobJS.StateValue, common: Partial<iobJS.StateCommon>, callback?: iobJS.SetStateCallback): void;
	function createState(name: string, common: Partial<iobJS.StateCommon>, native: any, callback?: iobJS.SetStateCallback): void;
	function createState(name: string, initValue: iobJS.StateValue, common: Partial<iobJS.StateCommon>, native: any, callback?: iobJS.SetStateCallback): void;

	/**
	 * Deletes the state with the given ID
	 * @param callback (optional) Is called after the state was deleted (or not).
	 */
	function deleteState(id: string, callback?: GenericCallback<boolean>): void;

	/**
	 * Sends a message to a specific instance or all instances of some specific adapter.
	 * @param instanceName The instance to send this message to.
	 * If the ID of an instance is given (e.g. "admin.0"), only this instance will receive the message.
	 * If the name of an adapter is given (e.g. "admin"), all instances of this adapter will receive it.
	 * @param command (optional) Command name of the target instance. Default: "send"
	 * @param message The message (e.g. params) to send.
	 */
	function sendTo(instanceName: string, message: string | object, callback?: iobJS.MessageCallback | iobJS.MessageCallbackInfo): void;
	function sendTo(instanceName: string, command: string, message: string | object, callback?: iobJS.MessageCallback | iobJS.MessageCallbackInfo): void;

	type CompareTimeOperations =
		"between" | "not between" |
		">" | ">=" | "<" | "<=" | "==" | "<>"
		;

	/**
	 * Compares two or more times
	 * @param timeToCompare - The time to compare with startTime and/or endTime. If none is given, the current time is used
	 */
	function compareTime(
		startTime: string | number | Date | iobJS.AstroDate,
		endTime: string | number | Date | iobJS.AstroDate,
		operation: CompareTimeOperations,
		timeToCompare?: string | number | Date | iobJS.AstroDate,
	): boolean;

	/** Sets up a callback which is called when the script stops */
	function onStop(callback: (cb?: () => void) => void, timeout?: number): void;

	function formatValue(value: number | string, format?: any): string;
	function formatValue(value: number | string, decimals: number, format?: any): string;
	function formatDate(dateObj: string | Date | number, format: string, language?: string): string;
	function formatDate(dateObj: string | Date | number, isDuration: boolean | string, format: string, language?: string): string;

	function getDateObject(date: number | string | Date): Date;

	/**
	 * Writes a file.
	 * @param id Name of the root directory. This should be the adapter instance, e.g. "admin.0"
	 * @param name File name
	 * @param data Contents of the file
	 * @param callback Is called when the operation has finished (successfully or not)
	 */
	function writeFile(id: string, name: string, data: Buffer | string, callback: ErrorCallback): void;

	/**
	 * Reads a file.
	 * @param id Name of the root directory. This should be the adapter instance, e.g. "admin.0"
	 * @param name File name
	 * @param callback Is called when the operation has finished (successfully or not)
	 */
	function readFile(id: string, name: string, callback: iobJS.ReadFileCallback): void;

	/**
	 * Deletes a file.
	 * @param id Name of the root directory. This should be the adapter instance, e.g. "admin.0"
	 * @param name File name
	 * @param callback Is called when the operation has finished (successfully or not)
	 */
	function unlink(id: string, name: string, callback: ErrorCallback): void;
	/**
	 * Deletes a file.
	 * @param id Name of the root directory. This should be the adapter instance, e.g. "admin.0"
	 * @param name File name
	 * @param callback Is called when the operation has finished (successfully or not)
	 */
	function delFile(id: string, name: string, callback: ErrorCallback): void;

	function getHistory(instance: any, options: any, callback: any): any;

	/**
	 * Starts or restarts a script by name
	 * @param scriptName (optional) Name of the script. If none is given, the current script is (re)started.
	 */
	function runScript(scriptName?: string, callback?: ErrorCallback): boolean;
	/**
	 * Starts or restarts a script by name
	 * @param scriptName (optional) Name of the script. If none is given, the current script is (re)started.
	 * @param ignoreIfStarted If set to true, running scripts will not be restarted.
	 * @param callback (optional) Is called when the script has finished (successfully or not)
	 */
	function startScript(scriptName: string | undefined, ignoreIfStarted: boolean, callback?: GenericCallback<boolean>): boolean;
	/**
	 * Starts or restarts a script by name
	 * @param scriptName (optional) Name of the script. If none is given, the current script is (re)started.
	 * @param callback (optional) Is called when the script has finished (successfully or not)
	 */
	function startScript(scriptName?: string, callback?: GenericCallback<boolean>): boolean;
	/**
	 * Stops a script by name
	 * @param scriptName (optional) Name of the script. If none is given, the current script is stopped.
	 */
	function stopScript(scriptName: string | undefined, callback?: GenericCallback<boolean>): boolean;
	function isScriptActive(scriptName: string): boolean;

	/** Converts a value to an integer */
	function toInt(val: any): number;
	/** Converts a value to a floating point number */
	function toFloat(val: any): number;
	/** Converts a value to a boolean */
	function toBoolean(val: any): boolean;

	/**
	 * Digs in an object for the property value at the given path.
	 * @param obj The object to dig in
	 * @param path The path of the property to dig for in the given object
	 */
	function getAttr(obj: string | Record<string, any>, path: string | string[]): any;

    /**
     * Send message to other script.
     * @param target Message name or target object
     * @param data Any data, that should be sent to message bus
     * @param options Actually only {timeout: X} is supported as option
     * @param callback Callback to get the result from other script
     */
    function messageTo(target: iobJS.TargetObject | string, data: any, options?: any, callback?: GenericCallback<any>): number;

}
