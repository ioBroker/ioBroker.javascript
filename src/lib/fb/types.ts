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
export const FB_RUNTIME_VERSION = '1.5.0';

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
    /** A note of the user on this block */
    comment?: string;
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
    /**
     * Drawn as a connection mark - a named jump at both ends instead of a line through the diagram.
     * Only the drawing differs; the link works the same.
     */
    mark?: boolean;
    /** The name the marks show; without it, the name of the block the link comes from */
    label?: string;
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
    /** Set when this diagram is a block to be used in other diagrams */
    block?: FbBlockInfo;
    /**
     * Copies of the user blocks this diagram uses, by type - also of those used inside them. With its
     * copies a diagram stays as it was when a block changes, until it is updated, and it can be
     * exported and imported on its own.
     */
    userBlocks?: Record<string, FbUserBlock>;
}

/** Types of user blocks start with this, e.g. `@userFb/shutter` */
export const FB_USER_PREFIX = '@userFb/';

/** A diagram that is a block of its own - its FB_IN and FB_OUT blocks are the pins */
export interface FbBlockInfo {
    /** `@userFb/<identifier>` - never changed once the block is used */
    type: string;
    /** The name in the palette */
    name: string;
    /** Counts the saved changes; a diagram keeps the version it copied until it is updated */
    version: number;
    description?: string;
}

/** A user block as a diagram carries it */
export interface FbUserBlock extends FbBlockInfo {
    /** Its diagram, without `block` and `userBlocks` - the blocks it uses are in the map of the diagram */
    graph: FbGraph;
}

/** A category of the palette */
export type FbCategory =
    | 'logic'
    | 'memory'
    | 'timers'
    | 'counters'
    | 'compare'
    | 'arithmetic'
    | 'convert'
    | 'control'
    | 'calendar'
    | 'messages'
    | 'expert'
    | 'iobroker'
    | 'interface'
    | 'user';

export interface FbPinDef {
    id: string;
    type: FbPinType;
    /** Usually set as a value rather than connected, like the time of a timer */
    param?: boolean;
    /** Value of the input while it is not connected */
    default?: FbValue;
    /** A TIME that is a time of day, in ms since midnight - shown as `08:30` */
    clock?: boolean;
}

export interface FbParamDef {
    id: string;
    /**
     * `OID` is an ioBroker state ID, `ENUM` one of `options`, `NAME` an identifier, `INSTANCE` an
     * adapter instance like `telegram.0`, `CRON` a cron pattern, `CODE` the body of a JavaScript
     * function
     */
    type: FbPinType | 'OID' | 'ENUM' | 'NAME' | 'INSTANCE' | 'CRON' | 'CODE';
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
    /**
     * Inputs `<prefix>1` to `<prefix>n`; `n` is the parameter `inputs` of the block - `count` when a
     * block is placed, `min` if not given
     */
    extensible?: { prefix: string; type: FbPinType; default: FbValue; min: number; max: number; count?: number };
    /** Outputs `<prefix>1` to `<prefix>n` in the same way, by the parameter `outputs` */
    extensibleOutputs?: { prefix: string; type: FbPinType; min: number; max: number; count?: number };
    /** Remembers something from one cycle to the next; implemented by `fb.<type>()` of the runtime */
    stateful?: boolean;
    /** Depends on time, so the diagram has to run cyclically */
    timeDependent?: boolean;
    code: string;
    /** For a user block: its definition. Its code is generated from its diagram, not from `code` */
    user?: FbUserBlock;
}

/**
 * What the online view can do with a running diagram. The settings last as long as an editor watches
 * the diagram; when the last one goes, the runtime lets go of everything and runs on.
 */
export type FbDebugCommand =
    /**
     * Holds a signal `<block>.<pin>` at a value, whatever its block computes. A signal inside an
     * instance of a user block has the path of the instances in front: `<instance>/<block>.<pin>`.
     */
    | { command: 'force'; signal: string; value: FbValue }
    /** Lets a forced signal go again - all of them without `signal` */
    | { command: 'release'; signal?: string }
    /** Sets or removes the breakpoint of a block; without `block`, `on: false` removes all */
    | { command: 'breakpoint'; block?: string; on: boolean }
    /** Cycles wait from the next one on */
    | { command: 'pause' }
    /** Runs on, up to the next breakpoint */
    | { command: 'resume' }
    /** While paused: runs one block */
    | { command: 'step' }
    /** While paused: runs the rest of the cycle, or one whole cycle */
    | { command: 'cycle' };

/** How the online view stands with a diagram */
export interface FbDebugStatus {
    /** The code can stop in front of a block - it was generated with runtime 1.2 or later */
    breaks: boolean;
    /** The inside of the instances of user blocks can be shown - generated with runtime 1.3 or later */
    inside: boolean;
    /** The cycles wait for `resume`, `step` or `cycle` */
    paused: boolean;
    /** While paused: the block that runs next */
    at?: string;
    breakpoints: string[];
    /** The forced signals with their values */
    forced: Record<string, FbValue>;
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
