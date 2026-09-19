/**
 * The data model of a function block diagram (FBD, in the style of CFC).
 *
 * This part is shared: the editor draws and edits the graph, the generator turns it into
 * JavaScript. It must not depend on React, the DOM or Node, so it runs in the browser and in the
 * adapter alike.
 */

/** Version of the graph format - raised only when an older graph cannot be read as it is */
export const FB_FORMAT = 1;

/** Version of the block library and of the runtime module the generated code needs */
export const FB_RUNTIME_VERSION = '1.0.0';

/** Name under which the generated code requires the runtime module */
export const FB_RUNTIME_MODULE = '@iobroker/fb-runtime';

/** The type of a signal */
export type FbSignalType = 'BOOL' | 'INT' | 'REAL' | 'TIME' | 'STRING';

/**
 * The type of a pin: a signal type, `ANY` (an input that takes every type) or the type chosen in a
 * parameter of the block, like the output of STATE_IN.
 */
export type FbPinType = FbSignalType | 'ANY' | { param: string };

/** A value of a parameter or of an input that is not connected */
export type FbValue = boolean | number | string;

/**
 * How the diagram is executed.
 *
 * - `event`: one cycle per change of an input, several changes within a short window run together
 * - `cyclic`: at a fixed interval, and additionally right after an input changed
 * - `auto`: cyclic as soon as a block depends on time (a timer), otherwise event driven
 */
export type FbCycleMode = 'auto' | 'cyclic' | 'event';

export interface FbCycle {
    mode: FbCycleMode;
    /** Interval of the cyclic mode in ms */
    ms: number;
}

export interface FbPinSettings {
    /** A BOOL input that is negated, drawn as a circle */
    inverted?: boolean;
}

export interface FbBlock {
    /** Assigned once and never changed - signal keys, the online view and log lines refer to it */
    id: string;
    /** Type from the block library, e.g. `TON` */
    type: string;
    /** Instance name, free to change */
    name: string;
    pos: [number, number];
    /** Position in the execution order, written back by the generator */
    order?: number;
    /** Parameters, and the values of inputs that are not connected */
    params?: Record<string, FbValue>;
    /** Only the pins that differ from the default */
    pins?: Record<string, FbPinSettings>;
    /** Keep the state over a restart - reserved, not supported yet */
    retain?: boolean;
}

export interface FbLink {
    id: string;
    /** `[blockId, outputPinId]` */
    from: [string, string];
    /** `[blockId, inputPinId]` */
    to: [string, string];
}

export interface FbComment {
    id: string;
    pos: [number, number];
    size: [number, number];
    text: string;
}

export interface FbGraph {
    format: number;
    /** Version of the block library the graph was made with */
    runtime: string;
    cycle: FbCycle;
    blocks: FbBlock[];
    links: FbLink[];
    comments: FbComment[];
}

/** A category of the palette */
export type FbCategory = 'logic' | 'timers' | 'compare' | 'arithmetic' | 'iobroker';

export interface FbPinDef {
    id: string;
    type: FbPinType;
    /** Usually set as a value rather than connected, like the time of a timer */
    param?: boolean;
    /** Value of the input while it is not connected */
    default?: FbValue;
}

export interface FbParamDef {
    id: string;
    /** `OID` is an ioBroker state ID, `ENUM` one of `options` */
    type: FbPinType | 'OID' | 'ENUM';
    options?: string[];
    default?: FbValue;
    /** The diagram cannot run without it */
    required?: boolean;
}

/**
 * A block type of the library.
 *
 * The description is pure data - the editor draws the block from it and the generator writes the
 * code from `code`, so both always agree. In `code`:
 *
 * - `{PIN}`: an output is the signal it writes, an input the expression it reads
 * - `{PREFIX*:sep}`: all inputs of an extensible block, joined by `sep`
 * - `{$param}`: the value of a parameter as a literal
 * - `{I}`: the instance of a stateful block
 * - `dt` and `firstScan`: time since the last cycle in ms, and whether this is the first cycle
 */
export interface FbBlockDef {
    type: string;
    category: FbCategory;
    inputs: FbPinDef[];
    outputs: FbPinDef[];
    params?: FbParamDef[];
    /** Inputs `<prefix>1` to `<prefix>n`; `n` is the parameter `inputs` of the block */
    extensible?: { prefix: string; type: FbPinType; default: FbValue; min: number; max: number };
    /** Remembers something from one cycle to the next; implemented by `fb.<type>()` of the runtime */
    stateful?: boolean;
    /** Depends on time, so the diagram has to run cyclically */
    timeDependent?: boolean;
    code: string;
}

/** A problem found in a diagram; `message` is an English text with `%s` for `args` */
export interface FbIssue {
    severity: 'error' | 'warning';
    message: string;
    args?: string[];
    blockId?: string;
    /** For a problem that involves several blocks, like a loop */
    blockIds?: string[];
    linkId?: string;
}
