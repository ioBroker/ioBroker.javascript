import type { Types } from '@iobroker/type-detector';

/**
 * Snapshot of what the user's question was "about" — the live editor range +
 *  verbatim text at question time. Lets Show-Diff render an inline, in-place
 *  diff that replaces only the targeted lines, not the whole script.
 */
export interface ChatSourceRange {
    /**
     * Monaco 1-based range of the selection / function / widget at question time.
     *  Null for free-form questions with no selection (insertion mode).
     */
    range: {
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
    } | null;
    /** Script id the range refers to (guards against script switches). */
    scriptId: string;
    /**
     * Lightweight fingerprint of the full script source at capture time
     *  (source length — cheap and good enough to detect edits).
     */
    scriptVersion: number;
    /** Where the range came from. 'none' means no range → insertion at cursor. */
    kind: 'selection' | 'codelens' | 'inline' | 'paste' | 'none';
    /**
     * Verbatim snapshot of the code inside `range` (or the pasted block when
     *  kind === 'paste'). The inline diff always compares against THIS, not
     *  against `currentScript.source` — so later edits don't produce a lying diff.
     */
    originalText: string;
}

/** A single message in the AI chat conversation */
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    /**
     * Set on user messages at send time, inherited by the assistant reply.
     *  Drives the inline-diff behavior when the user clicks "Show Diff".
     */
    sourceRange?: ChatSourceRange | null;
}

/** Provider availability reported by the backend (no keys — they stay server-side). */
export interface ApiConfig {
    providers: AiProviderName[];
    gptBaseUrl?: string;
}

/** Supported AI provider identifiers */
export type AiProviderName = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'custom';

/** Script language for AI chat context */
export type AiScriptLanguage = 'javascript' | 'typescript' | 'blockly';

/** Chat interaction mode */
export type AiChatMode = 'chat' | 'agent' | 'code';

/** Compact script info for cross-script analysis */
export interface ScriptInfo {
    id: string;
    name: string;
    source: string;
    engineType: string;
    enabled: boolean;
}

/** Result of searching for datapoint usage across scripts */
export interface DatapointUsage {
    scriptId: string;
    scriptName: string;
    usageType: 'read' | 'write' | 'subscribe' | 'exists';
    lineNumber: number;
    line: string;
}

/** Device state info */
export interface DeviceState {
    id: string;
    name: string;
    role?: string;
    type: ioBroker.CommonType;
    unit?: string;
    read: boolean;
    write: boolean;
}

/** Device object */
export interface DeviceObject {
    id: string;
    name: string;
    type: ioBroker.ObjectType;
    room?: string;
    function?: string;
    deviceType: Types;
    states: DeviceState[];
}

/** AI tool call from the model response */
export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

/** Chat message that may include tool calls or tool results */
export interface ChatApiMessage {
    role: string;
    content: string;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
}

/**
 * Chat completion request parameters.
 * Backend resolves the API key from this.config based on `provider` — never sent from frontend.
 */
export interface ChatCompletionRequest {
    messages: ChatApiMessage[];
    model: string;
    provider: AiProviderName;
    baseUrl?: string;
    timeout?: number;
    stream?: boolean;
    requestId?: string;
    tools?: unknown[];
}

/** Chat completion response */
export interface ChatCompletionResponse {
    success?: boolean;
    content?: string;
    error?: string;
    tool_calls?: ToolCall[];
}

/** A selection/range in the Monaco editor (1-based line/column, matches Monaco's convention). */
export interface EditorRange {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
}

/** Cursor position in the Monaco editor. */
export interface EditorPosition {
    line: number;
    column: number;
}

/** A single Monaco diagnostic (marker): error / warning / info / hint. */
export interface EditorDiagnostic {
    line: number;
    column: number;
    endLine: number;
    endColumn: number;
    severity: 'error' | 'warning' | 'info' | 'hint';
    message: string;
    source?: string;
}

/** A single symbol from the document outline (function, class, variable, etc.). */
export interface EditorSymbol {
    name: string;
    kind: string;
    line: number;
    endLine: number;
    detail?: string;
    children?: EditorSymbol[];
}

/**
 * Payload dispatched from the editor when the user invokes a VS-Code-like AI action
 *  via context menu, keyboard shortcut or a code-lens link.
 */
export interface EditorAiActionRequest {
    action: 'explain' | 'refactor' | 'comment' | 'fix' | 'tests' | 'ask';
    /** The selected text, or the whole document if nothing is selected. */
    code: string;
    /** Human-readable hint about where the code came from ("line 12", "lines 5-20"). */
    rangeLabel?: string;
    /**
     * 1-based Monaco range the `code` covers — used by the inline-diff controller
     *  so Show-Diff can render changes only within this range.
     */
    range?: { startLine: number; startColumn: number; endLine: number; endColumn: number };
    /** Kind of source: selection, enclosing function ("codelens"/context-menu on name), or whole-file fallback. */
    kind?: 'selection' | 'codelens' | 'inline' | 'none';
    /** When action === 'fix': the diagnostic(s) at that position. */
    diagnostic?: string;
    /** Free-form question (only for action === 'ask'). */
    question?: string;
}

/**
 * Handle the AI agent uses to inspect and manipulate the live Monaco editor.
 * All methods are optional — the host can supply a partial implementation.
 * Tools will return a clear error message when their required method is missing.
 */
export interface EditorApi {
    /** Read the text currently selected by the user (null if nothing is selected). */
    getSelection?: () => { text: string; range: EditorRange } | null;
    /** Read the full current code in the editor. */
    getContent?: () => string;
    /** Current cursor position. */
    getCursorPosition?: () => EditorPosition | null;
    /** Search for `text` and select+reveal the first occurrence. Returns number of matches found. */
    highlightText?: (text: string) => number;
    /** Select+reveal a line range (1-based, inclusive). */
    highlightLineRange?: (startLine: number, endLine: number) => boolean;
    /** Move the cursor to the given line (1-based); optional column (1-based). */
    goToLine?: (line: number, column?: number) => boolean;
    /** Insert text at the cursor position (or replace current selection). */
    insertTextAtCursor?: (text: string) => boolean;
    /** Replace the currently selected text with new text. */
    replaceSelection?: (text: string) => boolean;
    /** All active Monaco markers (syntax errors, lint warnings, type errors, …). */
    getDiagnostics?: () => EditorDiagnostic[];
    /**
     * Document outline: top-level symbols (functions, classes, consts, …). Async because
     *  Monaco's document-symbol providers resolve via the language service.
     */
    getSymbols?: () => Promise<EditorSymbol[]>;
}
