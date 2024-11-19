export type ScriptType = 'Javascript/js' | 'TypeScript/ts' | 'Blockly' | 'Rules';

export type LogMessage = {
    message: string;
    from: string;
    ts: number;
    severity: ioBroker.LogLevel;
};

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
    type: string;
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
