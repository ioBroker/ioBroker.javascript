import React from 'react';
import type * as monacoEditor from 'monaco-editor';

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Fab, IconButton, Snackbar } from '@mui/material';

import { MdGTranslate as IconNoCheck, MdClose as Close } from 'react-icons/md';

import { type AdminConnection, I18n } from '@iobroker/adapter-react-v5';
import type { DebuggerLocation, SetBreakpointParameterType } from './Debugger/types';
import type { EditorAiActionRequest } from '../AiChat/AiChatTypes';
import { findSymbolAtLine } from '../AiChat/aiCodeLensProvider';

function isIdOfGlobalScript(id: string): boolean {
    return /^script\.js\.global\./.test(id);
}

let index = 0;

interface ScriptEditorProps {
    adapterName: string;
    socket: AdminConnection;
    runningInstances: Record<string, boolean>;
    name: string;
    onChange?: (code: string) => void;
    onForceSave?: () => void;
    onInserted?: () => void;
    isDark?: boolean;
    readOnly?: boolean;
    code?: string;
    language?: 'javascript' | 'typescript';
    onRegisterSelect?: (cb: (() => string | undefined) | null) => void;
    searchText?: string;
    checkJs?: boolean;
    changed?: boolean;
    insert?: string;
    style?: React.CSSProperties;

    breakpoints?: SetBreakpointParameterType[];
    location?: DebuggerLocation | null;
    onToggleBreakpoint?: (lineNumber: number) => void;
    triggerPrettier: number;
    aiCompletionsEnabled?: boolean;
    /**
     * Called when the user invokes a VS-Code-like AI action
     *  (context menu, keyboard shortcut, code lens).
     */
    onAiAction?: (request: EditorAiActionRequest) => void;
    /**
     * Called by the inline-chat widget when the user submits a Ctrl+I question.
     *  Must return the AI's answer (plain text or a fenced code block).
     */
    onInlineAsk?: (payload: { question: string; selectedCode: string }) => Promise<string>;
}

interface ScriptEditorState {
    name: string;
    isDark: boolean;
    language: 'javascript' | 'typescript';
    readOnly: boolean;
    alive: boolean;
    check: boolean;
    searchText: string;
    typingsLoaded: boolean;
    showError: {
        title?: string;
        message?: string;
        full?: boolean;
    } | null;
}

/**
 * Converts an error message to HTML format, removing ANSI escape sequences and escaping HTML characters.
 *
 * @param message The error message to convert.
 * @returns The HTML formatted error message.
 */
function errorMessageToHtml(message: string): string {
    // ANSI-Escape-Sequenzen entfernen
    // eslint-disable-next-line no-control-regex
    const ansiRegex = /\x1b\[[0-9;]*m/g;
    return message.replace(ansiRegex, '');
}

class ScriptEditor extends React.Component<ScriptEditorProps, ScriptEditorState> {
    private readonly monacoDiv: React.RefObject<HTMLDivElement> | null = null;

    private editor: monacoEditor.editor.IStandaloneCodeEditor | null = null;

    private monaco: typeof monacoEditor | null = (window as any).monaco as typeof monacoEditor | null;

    /** In Monaco 0.55+ loaded via AMD, the typescript API lives at "languages.typescript" (not top-level typescript) */
    private get monacoTS(): typeof monacoEditor.typescript | undefined {
        return this.monaco?.languages?.typescript as typeof monacoEditor.typescript | undefined;
    }

    private insert: string = '';

    private originalCode: string;

    private runningInstancesStr: string;

    private monacoCounter: number = 0;

    private location: DebuggerLocation | undefined;

    private breakpoints: SetBreakpointParameterType[] | undefined;

    private lastSearch: string = '';

    // TypeScript declarations
    private typings: Record<string, string> = {};

    private decorations: string[] = [];

    private datapointProviderDisposable: monacoEditor.IDisposable | null = null;
    private inlineProviderDisposable: monacoEditor.IDisposable | null = null;
    private stateHoverDisposable: monacoEditor.IDisposable | null = null;
    private showStateValueDisposable: monacoEditor.IDisposable | null = null;
    private codeLensDisposable: monacoEditor.IDisposable | null = null;
    private inlineChatWidgetInstance: { dispose: () => void; show: () => void } | null = null;
    private inlineDiffInstance: { dispose: () => void } | null = null;
    private inlineDiffCssInjected: boolean = false;

    private triggerPrettier: number;

    private contentChangeDisposable: monacoEditor.IDisposable | null = null;

    private mouseDownDisposable: monacoEditor.IDisposable | null = null;

    constructor(props: ScriptEditorProps) {
        super(props);
        this.state = {
            name: 'current',
            isDark: props.isDark || false,
            language: props.language || 'javascript',
            readOnly: props.readOnly || false,
            alive: true,
            check: false,
            searchText: this.props.searchText || '',
            typingsLoaded: false,
            showError: null,
        };
        this.triggerPrettier = props.triggerPrettier;
        this.runningInstancesStr = JSON.stringify(this.props.runningInstances);
        this.originalCode = props.code || '';
        this.monacoDiv = React.createRef<HTMLDivElement>();
    }

    waitForMonaco(cb: () => void): void {
        let monacoLoaded = !!this.monacoTS?.typescriptDefaults?.getCompilerOptions;
        if (!monacoLoaded || !this.props.runningInstances) {
            this.monaco = (window as any).monaco as typeof monacoEditor | null;
            monacoLoaded = !!this.monacoTS?.typescriptDefaults?.getCompilerOptions;
            this.monacoCounter++;
            if (!monacoLoaded && this.monacoCounter < 20) {
                console.log('wait for monaco loaded');
                setTimeout(() => this.waitForMonaco(cb), 200);
                return;
            }
            if (this.monacoCounter >= 20) {
                console.error('Cannot load monaco!');
            }
        } else if (cb) {
            cb();
        }
    }

    loadTypings(runningInstances?: Record<string, boolean>): void {
        if (!this.editor) {
            return;
        }
        runningInstances ||= this.props.runningInstances;

        const scriptAdapterInstance =
            runningInstances && Object.keys(runningInstances).find(id => runningInstances?.[id]);

        if (scriptAdapterInstance) {
            void this.props.socket
                .sendTo(scriptAdapterInstance.replace('system.adapter.', ''), 'loadTypings', null)
                .then(result => {
                    this.setState({ alive: true, check: true, typingsLoaded: true });
                    this.setTypeCheck(true);
                    if (result.typings) {
                        this.typings = result.typings;
                        this.setEditorTypings(this.state.name);
                    } else {
                        console.error(`failed to load typings: ${result.error}`);
                    }
                });
        }
    }

    componentDidMount(): void {
        // Public methods consumed by Editor.tsx via scriptEditorRef.
        // Referenced here so eslint's react/no-unused-class-component-methods
        // sees them as used (it can't trace cross-component ref usage).
        void this.undo;
        void this.redo;
        void this.showInlineDiff;
        void this.getEditorSelection;
        void this.getEditorContent;
        void this.getCursorPosition;
        void this.highlightLineRange;
        void this.goToLine;
        void this.replaceSelection;
        void this.getDiagnostics;
        void this.getDocumentSymbols;

        let monacoLoaded = !!this.monacoTS?.typescriptDefaults?.getCompilerOptions;
        if (!monacoLoaded || !this.props.runningInstances) {
            this.monaco = (window as any).monaco as typeof monacoEditor | null;
            monacoLoaded = !!this.monacoTS?.typescriptDefaults?.getCompilerOptions;
            if (!monacoLoaded) {
                console.log('wait for monaco loaded...');
                this.waitForMonaco(() => this.componentDidMount());

                return;
            }
        }
        if (!this.editor && monacoLoaded && this.monaco) {
            console.log('Init editor');
            this.props.onRegisterSelect?.((): string | undefined => {
                if (this.editor) {
                    const selection = this.editor.getSelection();
                    if (selection) {
                        return this.editor.getModel()?.getValueInRange(selection);
                    }
                }
                return undefined;
            });
            // For some reason, we have to get the original compiler options
            // and assign new properties one by one
            const compilerOptions = this.monacoTS!.typescriptDefaults.getCompilerOptions();
            // compilerOptions.target = this.monacoTS!.ScriptTarget.ES2020;
            compilerOptions.allowJs = true;
            compilerOptions.checkJs = this.props.checkJs !== false;
            compilerOptions.noLib = true;
            compilerOptions.lib = [];
            compilerOptions.useUnknownInCatchVariables = false;
            compilerOptions.moduleResolution = this.monacoTS!.ModuleResolutionKind.NodeJs;
            compilerOptions.target = this.monacoTS!.ScriptTarget.ESNext;
            compilerOptions.module = this.monacoTS!.ModuleKind.ESNext;
            compilerOptions.allowNonTsExtensions = true;

            this.monacoTS!.typescriptDefaults.setCompilerOptions(compilerOptions);

            this.setTypeCheck(false);

            if (this.monacoDiv?.current) {
                // Create the editor instances
                this.editor = this.monaco.editor.create(this.monacoDiv?.current, {
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    glyphMargin: !!this.props.breakpoints,
                    colorDecorators: true,
                    // Mouse-over shows the state value (same provider as the Alt+I command).
                    // `sticky` lets the user move into the tooltip; `fixedOverflowWidgets`
                    // prevents the tooltip from being clipped by the surrounding panels.
                    hover: { enabled: true, delay: 200, sticky: true },
                    fixedOverflowWidgets: true,
                });

                this.contentChangeDisposable = this.editor.onDidChangeModelContent(() => this.onChange());

                // Register datapoint autocomplete provider
                if (this.monaco && !this.datapointProviderDisposable) {
                    import('../AiChat/AiDatapointProvider')
                        .then(({ registerDatapointProvider }) => {
                            if (this.monaco) {
                                this.datapointProviderDisposable = registerDatapointProvider(
                                    this.monaco,
                                    this.props.socket,
                                );
                            }
                        })
                        .catch(() => {});
                }

                // Register state-info hover provider (shows live value when hovering over an object ID)
                if (this.monaco && !this.stateHoverDisposable) {
                    import('../AiChat/stateHoverProvider')
                        .then(({ registerStateHoverProvider, registerShowStateValueAction }) => {
                            if (this.monaco) {
                                this.stateHoverDisposable = registerStateHoverProvider(this.monaco, this.props.socket);
                            }
                            // "On button press" variant: Alt+I / context menu shows the value at the cursor.
                            if (this.monaco && this.editor && !this.showStateValueDisposable) {
                                this.showStateValueDisposable = registerShowStateValueAction(
                                    this.editor,
                                    this.monaco,
                                    I18n.t('Show ioBroker state value'),
                                );
                            }
                        })
                        .catch(() => {});
                }

                // Register AI inline completions if enabled
                if (this.props.aiCompletionsEnabled && this.monaco && !this.inlineProviderDisposable) {
                    import('../AiChat/AiInlineProvider')
                        .then(({ registerAiInlineProvider }) => {
                            if (this.monaco) {
                                this.inlineProviderDisposable = registerAiInlineProvider(
                                    this.monaco,
                                    this.props.socket,
                                    this.props.runningInstances,
                                );
                            }
                        })
                        .catch(() => {});
                }

                // Load typings for the JS editor
                this.loadTypings();

                if (this.props.onForceSave) {
                    this.editor.addCommand(
                        this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.KeyS,
                        () => this.props.onForceSave && this.props.onForceSave(),
                    );
                }

                // Register VS-Code-like AI actions (context menu + keyboard shortcuts)
                this.registerAiActions();

                // Register AI code-lens provider (Explain / Refactor / Tests above each function)
                if (this.monaco && this.editor && this.props.onAiAction && !this.codeLensDisposable) {
                    import('../AiChat/aiCodeLensProvider')
                        .then(({ registerAiCodeLensProvider }) => {
                            if (this.monaco && this.editor && this.props.onAiAction) {
                                this.codeLensDisposable = registerAiCodeLensProvider(
                                    this.monaco,
                                    this.editor,
                                    (action, code, rangeLabel, startLine, endLine) => {
                                        // Build the Monaco-convention range for the symbol body
                                        // so the inline diff can later target it precisely.
                                        const model = this.editor?.getModel();
                                        const endCol = model
                                            ? model.getLineMaxColumn(Math.min(endLine, model.getLineCount()))
                                            : 1;
                                        this.props.onAiAction?.({
                                            action,
                                            code,
                                            rangeLabel,
                                            range: {
                                                startLine,
                                                startColumn: 1,
                                                endLine,
                                                endColumn: endCol,
                                            },
                                            kind: 'codelens',
                                        });
                                    },
                                );
                            }
                        })
                        .catch(() => {});
                }

                setTimeout(() => {
                    this.highlightText(this.state.searchText);
                    this.location = this.props.location || undefined;
                    this.breakpoints = this.props.breakpoints;
                    this.showDecorators();
                });
            }
        }

        const options = {
            selectOnLineNumbers: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            readOnly: this.state.readOnly,
            language: this.state.language,
            isDark: this.state.isDark,
        };

        this.setEditorOptions(options);
        if (this.editor) {
            this.editor.focus();
            this.editor.setValue(this.originalCode);

            if (this.props.onToggleBreakpoint) {
                // add onMouseDown listener to toggle breakpoints
                this.mouseDownDisposable = this.editor.onMouseDown((e: monacoEditor.editor.IEditorMouseEvent) => {
                    const target: monacoEditor.editor.IMouseTargetMargin =
                        e.target as monacoEditor.editor.IMouseTargetMargin;
                    if (
                        this.props.onToggleBreakpoint &&
                        target.detail?.glyphMarginLeft !== undefined &&
                        target.position
                    ) {
                        this.props.onToggleBreakpoint(target.position.lineNumber - 1);
                    }
                });
            }
        }
    }

    /**
     * Sets some options of the code editor
     *
     * @param options The editor options to change
     */
    setEditorOptions(
        options: Partial<{
            readOnly: boolean;
            lineWrap: boolean;
            language: 'javascript' | 'typescript';
            typeCheck: boolean;
            isDark: boolean;
        }>,
    ): void {
        if (options) {
            if (options.language) {
                this.setEditorLanguage(options.language);
            }
            if (this.editor) {
                if (options.readOnly !== undefined) {
                    this.editor.updateOptions({ readOnly: options.readOnly });
                }
                if (options.lineWrap !== undefined) {
                    this.editor.updateOptions({ wordWrap: options.lineWrap ? 'on' : 'off' });
                }
            }
            if (options.typeCheck !== undefined) {
                this.setTypeCheck(options.typeCheck);
            }
            if (options.isDark !== undefined) {
                this.monaco?.editor.setTheme(options.isDark ? 'vs-dark' : 'vs');
            }
        }
    }

    componentWillUnmount(): void {
        this.contentChangeDisposable?.dispose();
        this.contentChangeDisposable = null;
        this.mouseDownDisposable?.dispose();
        this.mouseDownDisposable = null;
        this.datapointProviderDisposable?.dispose();
        this.datapointProviderDisposable = null;
        import('../AiChat/AiDatapointProvider')
            .then(({ clearDatapointCache }) => clearDatapointCache())
            .catch(() => {});
        this.inlineProviderDisposable?.dispose();
        this.inlineProviderDisposable = null;
        this.stateHoverDisposable?.dispose();
        this.stateHoverDisposable = null;
        this.showStateValueDisposable?.dispose();
        this.showStateValueDisposable = null;
        import('../AiChat/stateHoverProvider')
            .then(({ clearStateHoverCache }) => clearStateHoverCache())
            .catch(() => {});
        this.codeLensDisposable?.dispose();
        this.codeLensDisposable = null;
        this.inlineChatWidgetInstance?.dispose();
        this.inlineChatWidgetInstance = null;
        this.hideInlineDiff();
        if (this.editor) {
            this.props.onRegisterSelect?.(null);
            this.editor.dispose();
            this.editor = null;
        }
    }

    async doPrettier(): Promise<void> {
        const scriptAdapterInstance =
            this.props.runningInstances &&
            Object.keys(this.props.runningInstances).find(id => this.props.runningInstances?.[id]);

        if (!scriptAdapterInstance) {
            window.alert(I18n.t('No script adapter instance found to format the code'));
            return;
        }
        const result = await this.props.socket.sendTo(
            scriptAdapterInstance.replace('system.adapter.', ''),
            'prettier',
            {
                code: this.editor?.getValue(),
                type: this.state.language,
            },
        );
        if (!result.error) {
            if (result.code) {
                this.editor?.setValue(result.code);
                this.props.onChange?.(result.code);
                this.showDecorators();
            }
        } else {
            this.setState({
                showError: {
                    title: I18n.t('Error formatting code'),
                    message: errorMessageToHtml(result.error),
                },
            });
        }
    }

    /**
     * Sets the language of the code editor
     */
    setEditorLanguage(language: 'javascript' | 'typescript'): void {
        // we need to recreate the model when changing languages,
        // so remember its settings
        if (!this.editor) {
            return;
        }
        const model = this.editor.getModel();
        if (model) {
            const code = model.getValue();
            const uri = model.uri.path;

            const filenameWithoutExtension =
                typeof uri === 'string' && uri.includes('.') ? uri.substring(0, uri.lastIndexOf('.')) : 'index';

            const extension = language === 'javascript' ? 'js' : language === 'typescript' ? 'ts' : language;

            // get rid of the original model
            model.dispose();

            // Both JS and TS need the model to work in TypeScript as the script type
            // is inferred from the file extension
            const newLanguage = language === 'javascript' || language === 'typescript' ? 'typescript' : language;

            const newModel = this.monaco?.editor.createModel(
                code,
                newLanguage,
                this.monaco.Uri.from({
                    scheme: window.location.protocol.replace(':', ''),
                    path: `${filenameWithoutExtension}${index++}.${extension}`,
                }),
            );

            if (newModel) {
                this.editor.setModel(newModel);
                // Re-register content change listener on the new model
                this.contentChangeDisposable?.dispose();
                this.contentChangeDisposable = this.editor.onDidChangeModelContent(() => this.onChange());
            }
        }
    }

    /**
     * Enables or disables the type checking in the editor
     *
     * @param enabled - Whether type checking is enabled or not
     */
    setTypeCheck(enabled: boolean): void {
        const options = {
            noSemanticValidation: !this.state.alive || !enabled, // toggle the type checking
            noSyntaxValidation: !this.state.alive, // always check the syntax
        };
        this.monacoTS?.typescriptDefaults.setDiagnosticsOptions(options);

        this.monacoTS?.javascriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: !this.state.alive || !enabled,
            noSyntaxValidation: !this.state.alive,
        });
    }

    /**
     * @param currentScriptName The name of the current script
     */
    setEditorTypings(currentScriptName = ''): void {
        const isGlobalScript = isIdOfGlobalScript(currentScriptName);
        // The filename of the declarations this script can see if it is a global script
        const partialDeclarationsPath = `${currentScriptName}.d.ts`;
        const wantedTypings = [];
        for (const path of Object.keys(this.typings)) {
            // global scripts don't get to see all other global scripts
            // but only a part of them
            if (isGlobalScript) {
                if (path === 'global.d.ts') {
                    continue;
                }
                if (path.startsWith('script.js.global') && path !== partialDeclarationsPath) {
                    continue;
                }
            }
            wantedTypings.push({
                filePath: path,
                content: this.typings[path],
            });
        }

        // TODO BF: check https://microsoft.github.io/monaco-editor/playground.html#extending-language-services-semantic-tokens-provider-example
        // to support 0.21.0

        if (this.monacoTS?.typescriptDefaults?.setExtraLibs) {
            this.monacoTS.typescriptDefaults.setExtraLibs(wantedTypings);
        } else if (this.monacoTS?.typescriptDefaults?.addExtraLib) {
            const existingLibs = this.monacoTS.typescriptDefaults.getExtraLibs();
            wantedTypings.forEach(lib => {
                if (!existingLibs[lib.filePath] && this.monaco) {
                    this.monacoTS!.typescriptDefaults.addExtraLib(lib.content, lib.filePath);
                }
            });
        }
    }

    /** Trigger an undo on the underlying Monaco editor (toolbar button). */
    undo(): void {
        this.editor?.trigger('toolbar', 'undo', null);
    }

    redo(): void {
        this.editor?.trigger('toolbar', 'redo', null);
    }

    insertTextIntoEditor(text: string): void {
        if (!this.editor || !this.monaco) {
            return;
        }
        const selection = this.editor.getSelection();
        if (selection) {
            const range = new this.monaco.Range(
                selection.startLineNumber,
                selection.startColumn,
                selection.endLineNumber,
                selection.endColumn,
            );
            this.editor.executeEdits('', [{ range, text, forceMoveMarkers: true }]);
        }
        this.editor.focus();
    }

    highlightText(text: string): number {
        if (!this.editor || !this.monaco) {
            return 0;
        }

        const range: monacoEditor.editor.FindMatch[] | undefined = text
            ? this.editor.getModel()?.findMatches(text, true, false, false, null, true)
            : undefined;
        if (range?.length) {
            range.forEach(r => this.editor?.setSelection(r.range));
            this.editor.revealLine(range[0].range.startLineNumber);
            return range.length;
        }
        const pos = this.editor.getPosition();
        if (pos) {
            const row = pos.lineNumber;
            const col = pos.column;
            this.editor.setSelection(new this.monaco.Range(row, col, row, col));
        }
        return 0;
    }

    /**
     * Render an inline diff for an AI change inside the editor.
     *  Replaces any previously active inline diff.
     */
    showInlineDiff(args: {
        range: { startLine: number; startColumn: number; endLine: number; endColumn: number };
        originalText: string;
        modifiedText: string;
        onAccepted?: () => void;
        onRejected?: () => void;
    }): void {
        if (!this.editor || !this.monaco) {
            return;
        }
        const editor = this.editor;
        const monaco = this.monaco;
        this.hideInlineDiff();
        import('../AiChat/inlineDiffController')
            .then(({ InlineDiffController, INLINE_DIFF_CSS }) => {
                if (!this.inlineDiffCssInjected) {
                    const style = document.createElement('style');
                    style.textContent = INLINE_DIFF_CSS;
                    style.setAttribute('data-iob-aichat', 'inline-diff');
                    document.head.appendChild(style);
                    this.inlineDiffCssInjected = true;
                }
                const controller = new InlineDiffController(editor, monaco, {
                    range: args.range,
                    originalText: args.originalText,
                    modifiedText: args.modifiedText,
                    onAccepted: () => {
                        this.inlineDiffInstance = null;
                        args.onAccepted?.();
                    },
                    onRejected: () => {
                        this.inlineDiffInstance = null;
                        args.onRejected?.();
                    },
                });
                this.inlineDiffInstance = controller;
                controller.show();
            })
            .catch(() => {});
    }

    hideInlineDiff(): void {
        if (this.inlineDiffInstance) {
            try {
                this.inlineDiffInstance.dispose();
            } catch {
                /* ignore */
            }
            this.inlineDiffInstance = null;
        }
    }

    /**
     * Lazily create and show the inline-chat widget (Ctrl+I).
     *  Falls silently back to nothing if the editor or host isn't ready.
     */
    showInlineChatWidget(): void {
        if (!this.editor || !this.monaco || !this.props.onInlineAsk) {
            return;
        }
        if (this.inlineChatWidgetInstance) {
            this.inlineChatWidgetInstance.show();
            return;
        }
        const editor = this.editor;
        const monaco = this.monaco;
        const onInlineAsk = this.props.onInlineAsk;
        const onAiAction = this.props.onAiAction;
        import('../AiChat/inlineChatWidget')
            .then(({ InlineChatWidget }) => {
                const widget = new InlineChatWidget(editor, monaco, {
                    onSubmit: async payload => {
                        return onInlineAsk({
                            question: payload.question,
                            selectedCode: payload.selectedCode,
                        });
                    },
                    onEscalateToChat: payload => {
                        if (onAiAction) {
                            onAiAction({
                                action: 'ask',
                                code: payload.selectedCode,
                                question: payload.question,
                                rangeLabel: payload.range
                                    ? `lines ${payload.range.startLineNumber}-${payload.range.endLineNumber}`
                                    : 'whole file',
                            });
                        }
                    },
                });
                this.inlineChatWidgetInstance = widget;
                widget.show();
            })
            .catch(() => {});
    }

    /**
     * Register AI actions (context menu entries + keyboard shortcuts) with the Monaco editor.
     *  Does nothing if no `onAiAction` prop is supplied — so the adapter works without the chat.
     */
    registerAiActions(): void {
        if (!this.editor || !this.monaco || !this.props.onAiAction) {
            return;
        }
        const monaco = this.monaco;
        const dispatch = (
            action: 'explain' | 'refactor' | 'comment' | 'fix' | 'tests' | 'ask',
            extras: { diagnostic?: string; question?: string } = {},
        ): void => {
            if (!this.editor || !this.props.onAiAction) {
                return;
            }
            const model = this.editor.getModel();
            if (!model) {
                return;
            }
            const sel = this.editor.getSelection();
            const hasSelection = sel && !sel.isEmpty();

            let code: string;
            let rangeLabel: string;
            let range: { startLine: number; startColumn: number; endLine: number; endColumn: number } | undefined;
            let kind: 'selection' | 'codelens' | 'none' = 'selection';

            if (hasSelection) {
                code = model.getValueInRange(sel);
                rangeLabel =
                    sel.startLineNumber === sel.endLineNumber
                        ? `line ${sel.startLineNumber}`
                        : `lines ${sel.startLineNumber}-${sel.endLineNumber}`;
                range = {
                    startLine: sel.startLineNumber,
                    startColumn: sel.startColumn,
                    endLine: sel.endLineNumber,
                    endColumn: sel.endColumn,
                };
                kind = 'selection';
            } else {
                // No selection — if the cursor is inside a function/class, use that as scope.
                // Without this, "Explain" on a function name would send the whole file.
                const pos = this.editor.getPosition();
                let scope: { startLine: number; endLine: number } | null = null;
                if (pos) {
                    try {
                        scope = findSymbolAtLine(model.getValue(), pos.lineNumber);
                    } catch {
                        /* ignore — fallback below */
                    }
                }
                if (scope) {
                    const start = scope.startLine;
                    const end = scope.endLine;
                    const endCol = model.getLineMaxColumn(end);
                    const rangeObj = new monaco.Range(start, 1, end, endCol);
                    code = model.getValueInRange(rangeObj);
                    rangeLabel = start === end ? `line ${start}` : `lines ${start}-${end}`;
                    range = { startLine: start, startColumn: 1, endLine: end, endColumn: endCol };
                    kind = 'codelens';
                } else {
                    code = model.getValue();
                    rangeLabel = 'whole file';
                    // No range → insertion-at-cursor when the user later accepts.
                    kind = 'none';
                }
            }

            this.props.onAiAction({
                action,
                code,
                rangeLabel,
                range,
                kind,
                ...extras,
            });
        };

        const actions: {
            id: string;
            label: string;
            keybindings?: number[];
            order: number;
            run: () => void;
        }[] = [
            {
                id: 'iobroker.ai.inline',
                label: `🤖 ${I18n.t('AI: Inline chat…')}`,
                // Browser-safe shortcut. Avoid:
                //   Ctrl+I       → Monaco's "trigger inline suggest" (our AiInlineProvider).
                //   Alt+I        → activates the browser menu bar on some configs.
                //   Ctrl+K chord → Chrome/Edge jump the focus out of the editor into the omnibox
                //                  the moment Ctrl+K is pressed, breaking any chord.
                // Ctrl+Alt+I is consistent with the other AI shortcuts (Ctrl+Alt+E/R/C/F)
                // and not claimed by mainstream browsers, Monaco, or common OS key mappings.
                keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyI],
                order: 1,
                run: () => {
                    // Prefer the rich inline widget when the host supplied onInlineAsk;
                    // otherwise fall back to a simple prompt that dispatches a regular ask action.
                    if (this.props.onInlineAsk) {
                        this.showInlineChatWidget();
                    } else {
                        const q = window.prompt(I18n.t('Ask the AI about the selected code:'));
                        if (q && q.trim()) {
                            dispatch('ask', { question: q.trim() });
                        }
                    }
                },
            },
            {
                id: 'iobroker.ai.explain',
                label: `💡 ${I18n.t('AI: Explain')}`,
                keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyE],
                order: 2,
                run: () => dispatch('explain'),
            },
            {
                id: 'iobroker.ai.refactor',
                label: `🔧 ${I18n.t('AI: Refactor')}`,
                keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyR],
                order: 3,
                run: () => dispatch('refactor'),
            },
            {
                id: 'iobroker.ai.comment',
                label: `💬 ${I18n.t('AI: Add comments')}`,
                keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyC],
                order: 4,
                run: () => dispatch('comment'),
            },
            {
                id: 'iobroker.ai.fix',
                label: `🛠️ ${I18n.t('AI: Fix problem')}`,
                keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
                order: 5,
                run: () => {
                    // Pull any diagnostic at the cursor position as context for the fix prompt.
                    let diagnostic: string | undefined;
                    try {
                        const model = this.editor?.getModel();
                        const pos = this.editor?.getPosition();
                        if (model && pos) {
                            const markers = monaco.editor.getModelMarkers({ resource: model.uri });
                            const hit = markers.find(
                                m => pos.lineNumber >= m.startLineNumber && pos.lineNumber <= m.endLineNumber,
                            );
                            if (hit) {
                                diagnostic = hit.message;
                            }
                        }
                    } catch {
                        /* ignore */
                    }
                    dispatch('fix', { diagnostic });
                },
            },
            {
                id: 'iobroker.ai.tests',
                label: `✅ ${I18n.t('AI: Suggest tests')}`,
                order: 6,
                run: () => dispatch('tests'),
            },
        ];

        for (const a of actions) {
            try {
                this.editor.addAction({
                    id: a.id,
                    label: a.label,
                    contextMenuGroupId: 'aichat',
                    contextMenuOrder: a.order,
                    keybindings: a.keybindings,
                    run: () => a.run(),
                });
            } catch {
                // Monaco throws if an id is already registered — safe to ignore on re-mount
            }
        }
    }

    /** Currently selected text + range (null if nothing selected). */
    getEditorSelection(): {
        text: string;
        range: { startLine: number; startColumn: number; endLine: number; endColumn: number };
    } | null {
        if (!this.editor) {
            return null;
        }
        const sel = this.editor.getSelection();
        if (!sel || sel.isEmpty()) {
            return null;
        }
        const model = this.editor.getModel();
        if (!model) {
            return null;
        }
        return {
            text: model.getValueInRange(sel),
            range: {
                startLine: sel.startLineNumber,
                startColumn: sel.startColumn,
                endLine: sel.endLineNumber,
                endColumn: sel.endColumn,
            },
        };
    }

    /** Full editor content. */
    getEditorContent(): string {
        return this.editor?.getModel()?.getValue() ?? '';
    }

    /** Current cursor position (1-based). */
    getCursorPosition(): { line: number; column: number } | null {
        const pos = this.editor?.getPosition();
        return pos ? { line: pos.lineNumber, column: pos.column } : null;
    }

    /** Select + reveal a line range. Returns false if not ready. */
    highlightLineRange(startLine: number, endLine: number): boolean {
        if (!this.editor || !this.monaco) {
            return false;
        }
        const model = this.editor.getModel();
        if (!model) {
            return false;
        }
        const totalLines = model.getLineCount();
        const clampedStart = Math.max(1, Math.min(startLine, totalLines));
        const clampedEnd = Math.max(clampedStart, Math.min(endLine, totalLines));
        const endCol = model.getLineMaxColumn(clampedEnd);
        this.editor.setSelection(new this.monaco.Range(clampedStart, 1, clampedEnd, endCol));
        this.editor.revealLineInCenter(clampedStart);
        return true;
    }

    /** Move cursor to a line (and optional column), revealing it. */
    goToLine(line: number, column = 1): boolean {
        if (!this.editor || !this.monaco) {
            return false;
        }
        const model = this.editor.getModel();
        if (!model) {
            return false;
        }
        const totalLines = model.getLineCount();
        const clamped = Math.max(1, Math.min(line, totalLines));
        this.editor.setPosition({ lineNumber: clamped, column });
        this.editor.revealLineInCenter(clamped);
        this.editor.focus();
        return true;
    }

    /** Replace the selected text (or insert at cursor if no selection). */
    replaceSelection(text: string): boolean {
        if (!this.editor || !this.monaco) {
            return false;
        }
        const sel = this.editor.getSelection();
        if (!sel) {
            return false;
        }
        const range = new this.monaco.Range(sel.startLineNumber, sel.startColumn, sel.endLineNumber, sel.endColumn);
        this.editor.executeEdits('', [{ range, text, forceMoveMarkers: true }]);
        this.editor.focus();
        return true;
    }

    /** All active Monaco markers (syntax errors, lint warnings, type errors, …). */
    getDiagnostics(): {
        line: number;
        column: number;
        endLine: number;
        endColumn: number;
        severity: 'error' | 'warning' | 'info' | 'hint';
        message: string;
        source?: string;
    }[] {
        if (!this.editor || !this.monaco) {
            return [];
        }
        const model = this.editor.getModel();
        if (!model) {
            return [];
        }
        // MarkerSeverity: Hint=1, Info=2, Warning=4, Error=8
        const markers = this.monaco.editor.getModelMarkers({ resource: model.uri });
        const severityMap: Record<number, 'error' | 'warning' | 'info' | 'hint'> = {
            8: 'error',
            4: 'warning',
            2: 'info',
            1: 'hint',
        };
        return markers.map(m => ({
            line: m.startLineNumber,
            column: m.startColumn,
            endLine: m.endLineNumber,
            endColumn: m.endColumn,
            severity: severityMap[m.severity] || 'info',
            message: m.message,
            ...(m.source ? { source: m.source } : {}),
        }));
    }

    /** Document outline via Monaco's symbol providers; falls back to a regex scan. */
    async getDocumentSymbols(): Promise<
        { name: string; kind: string; line: number; endLine: number; detail?: string }[]
    > {
        if (!this.editor || !this.monaco) {
            return [];
        }
        const model = this.editor.getModel();
        if (!model) {
            return [];
        }
        type SymItem = { name: string; kind: string; line: number; endLine: number; detail?: string };
        const out: SymItem[] = [];
        try {
            const langs = this.monaco.languages as unknown as {
                getDocumentSymbolProviders?: (m: monacoEditor.editor.ITextModel) => {
                    provideDocumentSymbols: (
                        m: monacoEditor.editor.ITextModel,
                        t: monacoEditor.CancellationToken,
                    ) =>
                        | Promise<monacoEditor.languages.DocumentSymbol[] | undefined>
                        | monacoEditor.languages.DocumentSymbol[]
                        | undefined;
                }[];
            };
            const providers = langs.getDocumentSymbolProviders?.(model);
            if (providers?.length) {
                const kindNames: Record<number, string> = {
                    0: 'file',
                    1: 'module',
                    2: 'namespace',
                    3: 'package',
                    4: 'class',
                    5: 'method',
                    6: 'property',
                    7: 'field',
                    8: 'constructor',
                    9: 'enum',
                    10: 'interface',
                    11: 'function',
                    12: 'variable',
                    13: 'constant',
                    14: 'string',
                    15: 'number',
                    16: 'boolean',
                    17: 'array',
                    18: 'object',
                    19: 'key',
                    20: 'null',
                    21: 'enum-member',
                    22: 'struct',
                    23: 'event',
                    24: 'operator',
                    25: 'type-parameter',
                };
                for (const p of providers) {
                    const token = { isCancellationRequested: false } as monacoEditor.CancellationToken;
                    const symbols = await p.provideDocumentSymbols(model, token);
                    if (!symbols) {
                        continue;
                    }
                    const flatten = (arr: monacoEditor.languages.DocumentSymbol[]): void => {
                        for (const s of arr) {
                            out.push({
                                name: s.name,
                                kind: kindNames[s.kind] || String(s.kind),
                                line: s.range.startLineNumber,
                                endLine: s.range.endLineNumber,
                                ...(s.detail ? { detail: s.detail } : {}),
                            });
                            if (s.children?.length) {
                                flatten(s.children);
                            }
                        }
                    };
                    flatten(symbols);
                    if (out.length) {
                        break;
                    }
                }
            }
        } catch {
            // provider error → regex fallback below
        }
        if (out.length === 0) {
            const content = model.getValue();
            const lines = content.split('\n');
            const patterns: { re: RegExp; kind: string }[] = [
                { re: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/, kind: 'function' },
                { re: /^(?:export\s+)?class\s+(\w+)/, kind: 'class' },
                { re: /^(?:export\s+)?(?:const|let|var)\s+(\w+)/, kind: 'variable' },
            ];
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                for (const { re, kind } of patterns) {
                    const m = re.exec(line);
                    if (m?.[1]) {
                        out.push({ name: m[1], kind, line: i + 1, endLine: i + 1 });
                        break;
                    }
                }
            }
        }
        return out;
    }

    showDecorators(): void {
        const decorations = [];
        if (this.location && this.monaco) {
            decorations.push({
                range: new this.monaco.Range(
                    this.location.lineNumber + 1,
                    (this.location.columnNumber || 0) + 1,
                    this.location.lineNumber + 1,
                    1000,
                ),
                options: {
                    isWholeLine: false,
                    className: this.props.isDark ? 'monacoCurrentLineDark' : 'monacoCurrentLine',
                },
            });
            decorations.push({
                range: new this.monaco.Range(this.location.lineNumber + 1, 0, this.location.lineNumber + 1, 0),
                options: {
                    isWholeLine: true,
                    className: this.props.isDark ? 'monacoCurrentFullLineDark' : 'monacoCurrentFullLine',
                },
            });
        }

        this.breakpoints?.forEach(bp => {
            if (this.monaco) {
                decorations.push({
                    range: new this.monaco.Range(bp.location.lineNumber + 1, 0, bp.location.lineNumber + 1, 100),
                    options: {
                        isWholeLine: true,
                        glyphMarginClassName: this.props.isDark ? 'monacoBreakPointDark' : 'monacoBreakPoint',
                    },
                });
            }
        });
        if (this.editor) {
            const editorModel = this.editor.getModel();
            if (editorModel) {
                this.decorations = editorModel.deltaDecorations(this.decorations, decorations);
                // this.decorations = this.editor.createDecorationsCollection(decorations);
            }
        }
    }

    initNewScript(name: string, code: string | undefined): void {
        this.setState({ name });
        this.originalCode = code || '';
        this.editor?.setValue(code || '');
        this.highlightText(this.lastSearch);
        this.showDecorators();
        // this.setEditorLanguage();
        // Update the typings because global scripts need different typings than normal scripts
        // and each global script has different typings
        this.setEditorTypings(name);
    }

    scrollToLineIfNeeded(lineNumber: number): void {
        if (this.editor) {
            const ranges = this.editor.getVisibleRanges();
            if (
                !ranges ||
                !ranges[0] ||
                ranges[0].startLineNumber > lineNumber ||
                lineNumber > ranges[0].endLineNumber
            ) {
                this.editor.revealLineInCenter(lineNumber);
            }
        }
    }

    // TODO
    UNSAFE_componentWillReceiveProps(nextProps: ScriptEditorProps): void {
        const options: Partial<{
            readOnly: boolean;
            lineWrap: boolean;
            language: 'javascript' | 'typescript';
            typeCheck: boolean;
            isDark: boolean;
        }> = {};
        if (this.state.name !== nextProps.name) {
            // A different script was selected
            this.initNewScript(nextProps.name, nextProps.code);
        }

        // if some running instance is found and
        if (JSON.stringify(nextProps.runningInstances) !== this.runningInstancesStr) {
            this.runningInstancesStr = JSON.stringify(nextProps.runningInstances);
            if (!this.state.typingsLoaded) {
                this.loadTypings(nextProps.runningInstances);
            }
        }

        // if the code not yet changed, update the new code
        if (
            this.editor &&
            !nextProps.changed &&
            (nextProps.code !== this.originalCode || nextProps.code !== this.editor.getValue())
        ) {
            this.originalCode = nextProps.code || '';
            this.editor.setValue(this.originalCode);
            this.showDecorators();
            this.location && this.scrollToLineIfNeeded(this.location.lineNumber + 1);
        }

        if (nextProps.searchText !== this.lastSearch) {
            this.lastSearch = nextProps.searchText || '';
            this.highlightText(this.lastSearch);
        }

        if (
            JSON.stringify(nextProps.location) !== JSON.stringify(this.location) &&
            JSON.stringify(nextProps.breakpoints) !== JSON.stringify(this.breakpoints)
        ) {
            this.location = nextProps.location || undefined;
            this.breakpoints = nextProps.breakpoints;
            this.showDecorators();
            this.editor && this.location && this.scrollToLineIfNeeded(this.location.lineNumber + 1);
            // this.editor && this.location && this.editor.setPosition(this.location.lineNumber + 1, this.location.columnNumber + 1);
        } else if (JSON.stringify(nextProps.breakpoints) !== JSON.stringify(this.breakpoints)) {
            this.breakpoints = nextProps.breakpoints;
            this.showDecorators();
        } else if (JSON.stringify(nextProps.location) !== JSON.stringify(this.location)) {
            this.location = nextProps.location || undefined;
            this.showDecorators();
            this.editor && this.location && this.scrollToLineIfNeeded(this.location.lineNumber + 1);
            // this.editor && this.location && this.editor.setPosition(this.location.lineNumber + 1, this.location.columnNumber + 1);
        }

        if (this.state.language !== (nextProps.language || 'javascript')) {
            this.setState({ language: nextProps.language || 'javascript' });
            options.language = nextProps.language || 'javascript';
        } else if (this.state.readOnly !== (nextProps.readOnly || false)) {
            this.setState({ readOnly: nextProps.readOnly || false });
            options.readOnly = nextProps.readOnly;
        } else if (this.state.isDark !== (nextProps.isDark || false)) {
            this.setState({ isDark: nextProps.isDark || false });
            options.isDark = nextProps.isDark;
        }

        this.setEditorOptions(options);

        // Toggle AI inline completions
        if (nextProps.aiCompletionsEnabled !== this.props.aiCompletionsEnabled) {
            if (nextProps.aiCompletionsEnabled && this.monaco && !this.inlineProviderDisposable) {
                import('../AiChat/AiInlineProvider')
                    .then(({ registerAiInlineProvider }) => {
                        if (this.monaco) {
                            this.inlineProviderDisposable = registerAiInlineProvider(
                                this.monaco,
                                this.props.socket,
                                this.props.runningInstances,
                            );
                        }
                    })
                    .catch(() => {});
            } else if (!nextProps.aiCompletionsEnabled && this.inlineProviderDisposable) {
                this.inlineProviderDisposable.dispose();
                this.inlineProviderDisposable = null;
            }
        }

        if (this.insert !== nextProps.insert) {
            this.insert = nextProps.insert || '';
            if (this.insert) {
                console.log(`Insert text: ${this.insert}`);
                setTimeout(
                    insert => {
                        this.insertTextIntoEditor(insert);
                        setTimeout(() => this.props.onInserted && this.props.onInserted(), 100);
                    },
                    100,
                    this.insert,
                );
            }
        }
    }

    onChange(): void {
        if (!this.props.readOnly && this.editor) {
            this.props.onChange?.(this.editor.getValue());
        }
    }

    renderErrorDialog(): React.JSX.Element | null {
        if (!this.state.showError) {
            return null;
        }

        if (this.state.showError.full) {
            return (
                <Dialog
                    open={!0}
                    maxWidth="md"
                    onClose={() => this.setState({ showError: null })}
                >
                    <DialogTitle>{this.state.showError.title || I18n.t('Error')}</DialogTitle>
                    <DialogContent>
                        <pre>
                            <code>{this.state.showError.message}</code>
                        </pre>
                    </DialogContent>
                    <DialogActions>
                        <Button
                            variant="contained"
                            startIcon={<Close />}
                            onClick={() => this.setState({ showError: null })}
                        >
                            {I18n.t('Close')}{' '}
                        </Button>
                    </DialogActions>
                </Dialog>
            );
        }

        return (
            <Snackbar
                open={!0}
                autoHideDuration={5000}
                onClose={() => this.setState({ showError: null })}
                message={this.state.showError.title}
                action={
                    <React.Fragment>
                        <Button
                            color="secondary"
                            size="small"
                            onClick={() => this.setState({ showError: { ...this.state.showError, full: true } })}
                        >
                            {I18n.t('More')}
                        </Button>
                        <IconButton
                            size="small"
                            aria-label="close"
                            color="inherit"
                            onClick={() => this.setState({ showError: null })}
                        >
                            <Close fontSize="small" />
                        </IconButton>
                    </React.Fragment>
                }
            />
        );
    }

    render(): React.JSX.Element | null {
        if (!this.monacoTS?.typescriptDefaults || !this.props.runningInstances) {
            setTimeout(() => {
                this.monaco = (window as any).monaco as typeof monacoEditor | null;
                this.forceUpdate();
            }, 200);
            return null;
        }

        if (this.props.triggerPrettier !== this.triggerPrettier) {
            this.triggerPrettier = this.props.triggerPrettier;
            setTimeout(() => this.doPrettier().catch(err => console.error('Error formatting code:', err)), 50);
        }

        return (
            <div
                ref={this.monacoDiv}
                style={{ ...this.props.style, width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}
            >
                {this.renderErrorDialog()}
                {!this.state.check && (
                    <Fab
                        size="small"
                        title={I18n.t('Check is not active, because javascript adapter is disabled')}
                        style={{
                            bottom: 10,
                            right: 10,
                            opacity: 0.5,
                            position: 'absolute',
                            zIndex: 1,
                            background: 'red',
                            color: 'white',
                        }}
                        color="secondary"
                    >
                        <IconNoCheck />
                    </Fab>
                )}
            </div>
        );
    }
}

export default ScriptEditor;
