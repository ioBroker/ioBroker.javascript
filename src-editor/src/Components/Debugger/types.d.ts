export interface DebuggerLocation {
    /**
     * Script identifier as reported in the <code>Debugger.scriptParsed</code>.
     */
    scriptId: string;
    /**
     * Line number in the script (0-based).
     */
    lineNumber: number;
    /**
     * Column number in the script (0-based).
     */
    columnNumber?: number | undefined;
}

interface SetBreakpointParameterType {
    id: string;
    location: DebuggerLocation;
    condition?: string | undefined;
}

interface DebuggerPropertyPreview {
    /**
     * Property name.
     */
    name: string;
    /**
     * Object type. Accessor means that the property itself is an accessor property.
     */
    type: string;
    /**
     * User-friendly property value string.
     */
    value?: string | undefined;
    /**
     * Nested value preview.
     */
    valuePreview?: DebuggerObjectPreview | undefined;
    /**
     * Object subtype hint. Specified for <code>object</code> type values only.
     */
    subtype?: string | undefined;
}

interface DebuggerObjectPreview {
    /**
     * Object type.
     */
    type: string;
    /**
     * Object subtype hint. Specified for <code>object</code> type values only.
     */
    subtype?: string | undefined;
    /**
     * String representation of the object.
     */
    description?: string | undefined;
    /**
     * True iff some of the properties or entries of the original object did not fit.
     */
    overflow: boolean;
    /**
     * List of the properties.
     */
    properties: DebuggerPropertyPreview[];
    /**
     * List of the entries. Specified for <code>map</code> and <code>set</code> subtype values only.
     */
    entries?: DebuggerEntryPreview[] | undefined;
}

interface DebuggerEntryPreview {
    /**
     * Preview of the key. Specified for map-like collection entries.
     */
    key?: DebuggerObjectPreview | undefined;
    /**
     * Preview of the value.
     */
    value: DebuggerObjectPreview;
}

interface DebuggerCustomPreview {
    header: string;
    hasBody: boolean;
    formatterObjectId: string;
    bindRemoteObjectFunctionId: string;
    configObjectId?: string | undefined;
}

interface DebuggerRemoteObject {
    /**
     * Object type.
     */
    type: string;
    /**
     * Object subtype hint. Specified for <code>object</code> type values only.
     */
    subtype?: string | undefined;
    /**
     * Object class (constructor) name. Specified for <code>object</code> type values only.
     */
    className?: string | undefined;
    /**
     * Remote object value in case of primitive values or JSON values (if it was requested).
     */
    value?: any;
    /**
     * Primitive value which can not be JSON-stringified does not have <code>value</code>, but gets this property.
     */
    unserializableValue?: string | undefined;
    /**
     * String representation of the object.
     */
    description?: string | undefined;
    /**
     * Unique object identifier (for non-primitive values).
     */
    objectId?: string | undefined;
    /**
     * Preview containing abbreviated property values. Specified for <code>object</code> type values only.
     */
    preview?: DebuggerObjectPreview | undefined;
    customPreview?: DebuggerCustomPreview | undefined;
}

interface DebuggerScope {
    /**
     * Scope type.
     */
    type: 'local' | 'closure' | 'global';
    /**
     * Object representing the scope. For <code>global</code> and <code>with</code> scopes it represents the actual object; for the rest of the scopes, it is artificial transient object enumerating scope variables as its properties.
     */
    object: DebuggerRemoteObject;
    name?: string | undefined;
    /**
     * Location in the source code where scope starts
     */
    startLocation?: DebuggerLocation | undefined;
    /**
     * Location in the source code where scope ends
     */
    endLocation?: DebuggerLocation | undefined;
}

interface CallFrame {
    /** In GUI generated ID */
    id: string;
    /**
     * Call frame identifier. This identifier is only valid while the virtual machine is paused.
     */
    callFrameId: string;
    /**
     * Name of the JavaScript function called on this call frame.
     */
    functionName: string;
    /**
     * Location in the source code.
     */
    functionLocation?: DebuggerLocation | undefined;
    /**
     * Location in the source code.
     */
    location: DebuggerLocation;
    /**
     * JavaScript script name or url.
     */
    url: string;
    /**
     * Scope chain for this call frame.
     */
    scopeChain: DebuggerScope[];
    /**
     * <code>this</code> object for this call frame.
     */
    this: DebuggerRemoteObject;
    /**
     * The value being returned, if the function is at return point.
     */
    returnValue?: DebuggerRemoteObject | undefined;
}

interface DebugValue {
    type: 'function' | 'string' | 'boolean' | 'number' | 'undefined' | 'null' | 'object' | 'bigint' | 'symbol';
    description: string;
    value: string;
    name: string;
    subtype?: string;
}
interface DebugObject {
    type: 'object';
    className: string;
    objectId: string;
    description: string;
    preview: {
        description: string;
        overflow: boolean;
        properties: DebugValue[];
    };
}

interface DebugVariable {
    name: string;
    value: DebugValue | DebugObject;
    configurable?: boolean;
    enumerable?: boolean;
    isOwn?: boolean;
    writable?: boolean;
}

interface DebugScopes {
    local?: {
        properties: {
            result: DebugVariable[];
        };
    };
    closure?: {
        properties: {
            result: DebugVariable[];
        };
    };
    global?: {
        properties: {
            result: DebugVariable[];
        };
    };
}

export interface DebugCommandToBackEndSetBreakpoint {
    cmd: 'sb';
    breakpoints: DebuggerLocation[];
}
export interface DebugCommandToBackEndStopOnException {
    cmd: 'stopOnException';
    state: boolean;
}

export interface DebugCommandToBackEndScope {
    cmd: 'scope';
    scopes: DebuggerScope[];
}
export interface DebugCommandToBackEndExpressions {
    cmd: 'expressions';
    expressions: DebugVariable[];
    callFrameId: string;
}
export interface DebugCommandToBackEndSource {
    cmd: 'source';
    scriptId: string;
}
export interface DebugCommandToBackEndContinue {
    cmd: 'cont';
}
export interface DebugCommandToBackEndPause {
    cmd: 'pause';
}
export interface DebugCommandToBackEndNext {
    cmd: 'next';
}
export interface DebugCommandToBackEndStep {
    cmd: 'step';
}
export interface DebugCommandToBackEndStepOut {
    cmd: 'out';
}
export interface DebugCommandToBackEndGetPossibleBreakpoints {
    cmd: 'getPossibleBreakpoints';
    start: DebuggerLocation;
    end: DebuggerLocation;
}
export interface DebugCommandToBackEndClearBreakpoints {
    cmd: 'cb';
    breakpoints: string[];
}
export interface DebugCommandToBackEndSetVariable {
    cmd: 'setValue';
    variableName: string;
    scopeNumber: number;
    newValue: any;
    callFrameId: string | undefined;
}
export type DebugCommandToBackEnd =
    | DebugCommandToBackEndSetBreakpoint
    | DebugCommandToBackEndStopOnException
    | DebugCommandToBackEndScope
    | DebugCommandToBackEndExpressions
    | DebugCommandToBackEndSource
    | DebugCommandToBackEndContinue
    | DebugCommandToBackEndPause
    | DebugCommandToBackEndNext
    | DebugCommandToBackEndStep
    | DebugCommandToBackEndStepOut
    | DebugCommandToBackEndGetPossibleBreakpoints
    | DebugCommandToBackEndClearBreakpoints
    | DebugCommandToBackEndSetVariable;

export interface DebugCommandFromBackEndSubscribed {
    cmd: 'subscribed';
}

export interface DebugCommandFromBackEndReadyToDebug {
    cmd: 'readyToDebug';
    scriptId: string;
    script: string;
    context: {
        callFrames: CallFrame[];
    };
    url: string;
}

export interface DebugCommandFromBackEndPaused {
    cmd: 'paused';
    context: {
        callFrames: CallFrame[];
    };
}

export interface DebugCommandFromBackEndScript {
    cmd: 'script';
    scriptId: string;
    text: string;
}
export interface DebugCommandFromBackEndResumed {
    cmd: 'resumed';
}
export interface DebugCommandFromBackEndError {
    cmd: 'error';
    error: string;
}
export interface DebugCommandFromBackEndLog {
    cmd: 'log';
    text: string;
    severity: ioBroker.LogLevel;
    ts: number;
}
export interface DebugCommandFromBackEndStopped {
    cmd: 'finished' | 'debugStopped';
}
export interface DebugCommandFromBackEndBreakpointsSet {
    cmd: 'sb';
    breakpoints: SetBreakpointParameterType[];
}
export interface DebugCommandFromBackEndBreakpointsCleared {
    cmd: 'cb';
    /** indexes of deleted breakpoints */
    breakpoints: string[];
}
export interface DebugCommandFromBackEndBreakpointsScope {
    cmd: 'scope';
    scopes: {
        type: 'local' | 'closure' | 'global';
        properties: {
            result: DebugVariable[];
        };
    }[];
}
export interface DebugCommandFromBackEndSetValue {
    cmd: 'setValue';
    variableName: string;
    scopeNumber: number;
    newValue: DebugValue;
}

export interface DebugCommandFromBackEndExpressions {
    cmd: 'expressions';
    expressions: { name: string; result: any }[];
}
export interface DebugCommandFromBackEndGetPossibleBreakpoints {
    cmd: 'getPossibleBreakpoints';
    breakpoints: DebuggerLocation[];
}

export type DebugCommandFromBackEnd =
    | DebugCommandFromBackEndSubscribed
    | DebugCommandFromBackEndReadyToDebug
    | DebugCommandFromBackEndPaused
    | DebugCommandFromBackEndScript
    | DebugCommandFromBackEndLog
    | DebugCommandFromBackEndError
    | DebugCommandFromBackEndStopped
    | DebugCommandFromBackEndBreakpointsSet
    | DebugCommandFromBackEndBreakpointsCleared
    | DebugCommandFromBackEndBreakpointsScope
    | DebugCommandFromBackEndSetValue
    | DebugCommandFromBackEndExpressions
    | DebugCommandFromBackEndGetPossibleBreakpoints
    | DebugCommandFromBackEndResumed;
