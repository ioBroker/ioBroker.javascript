import React from 'react';
import type * as monacoEditor from 'monaco-editor';

import { Fab } from '@mui/material';

import { MdGTranslate as IconNoCheck } from 'react-icons/md';

import { type AdminConnection, I18n } from '@iobroker/adapter-react-v5';
import type { DebuggerLocation, SetBreakpointParameterType } from './Debugger/types';

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
}

class ScriptEditor extends React.Component<ScriptEditorProps, ScriptEditorState> {
    private readonly monacoDiv: React.RefObject<HTMLDivElement> | null = null;

    private editor: monacoEditor.editor.IStandaloneCodeEditor | null = null;

    private monaco: typeof monacoEditor | null = (window as any).monaco as typeof monacoEditor | null;

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
        };
        this.runningInstancesStr = JSON.stringify(this.props.runningInstances);
        this.originalCode = props.code || '';
        this.monacoDiv = React.createRef<HTMLDivElement>();
    }

    waitForMonaco(cb: () => void): void {
        let monacoLoaded = !!this.monaco?.languages?.typescript?.typescriptDefaults?.getCompilerOptions;
        if (!monacoLoaded || !this.props.runningInstances) {
            this.monaco = (window as any).monaco as typeof monacoEditor | null;
            monacoLoaded = !!this.monaco?.languages?.typescript?.typescriptDefaults?.getCompilerOptions;
            this.monacoCounter++;
            if (!monacoLoaded && this.monacoCounter < 20) {
                console.log('wait for monaco loaded');
                setTimeout(() => this.waitForMonaco(cb), 200);
                return;
            }
            if (this.monacoCounter >= 20) {
                console.error('Cannot load monaco!');
            }
        } else {
            cb && cb();
        }
    }

    loadTypings(runningInstances?: Record<string, boolean>): void {
        if (!this.editor) {
            return;
        }
        runningInstances = runningInstances || this.props.runningInstances;

        const scriptAdapterInstance =
            runningInstances && Object.keys(runningInstances).find(id => runningInstances && runningInstances[id]);

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
        let monacoLoaded = !!this.monaco?.languages?.typescript?.typescriptDefaults?.getCompilerOptions;
        if (!monacoLoaded || !this.props.runningInstances) {
            this.monaco = (window as any).monaco as typeof monacoEditor | null;
            monacoLoaded = !!this.monaco?.languages?.typescript?.typescriptDefaults?.getCompilerOptions;
            if (!monacoLoaded) {
                console.log('wait for monaco loaded...');
                this.waitForMonaco(() => this.componentDidMount());

                return;
            }
        }
        if (!this.editor && monacoLoaded && this.monaco) {
            console.log('Init editor');
            if (this.props.onRegisterSelect) {
                this.props.onRegisterSelect((): string | undefined => {
                    if (this.editor) {
                        const selection = this.editor.getSelection();
                        if (selection) {
                            return this.editor.getModel()?.getValueInRange(selection);
                        }
                    }
                    return undefined;
                });
            }
            // For some reason, we have to get the original compiler options
            // and assign new properties one by one
            const compilerOptions = this.monaco.languages.typescript.typescriptDefaults.getCompilerOptions();
            // compilerOptions.target = this.monaco.languages.typescript.ScriptTarget.ES2020;
            compilerOptions.allowJs = true;
            compilerOptions.checkJs = this.props.checkJs !== false;
            compilerOptions.noLib = true;
            compilerOptions.lib = [];
            compilerOptions.useUnknownInCatchVariables = false;
            compilerOptions.moduleResolution = this.monaco.languages.typescript.ModuleResolutionKind.NodeJs;
            compilerOptions.target = this.monaco.languages.typescript.ScriptTarget.ESNext;
            compilerOptions.module = this.monaco.languages.typescript.ModuleKind.ESNext;
            compilerOptions.allowNonTsExtensions = true;

            this.monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);

            this.setTypeCheck(false);

            if (this.monacoDiv?.current) {
                // Create the editor instances
                this.editor = this.monaco.editor.create(this.monacoDiv?.current, {
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    glyphMargin: !!this.props.breakpoints,
                    colorDecorators: true,
                });

                this.editor.onDidChangeModelContent(() => this.onChange());

                // Load typings for the JS editor
                this.loadTypings();

                if (this.props.onForceSave) {
                    this.editor.addCommand(
                        this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.KeyS,
                        () => this.props.onForceSave && this.props.onForceSave(),
                    );
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
                this.editor.onMouseDown((e: monacoEditor.editor.IEditorMouseEvent) => {
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
            } else {
                // remove onMouseDown listener
                this.editor.onMouseDown(() => {
                    /* nop */
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
        if (this.editor) {
            this.props.onRegisterSelect && this.props.onRegisterSelect(null);
            this.editor.dispose();
            this.editor = null;
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
        this.monaco?.languages.typescript.typescriptDefaults.setDiagnosticsOptions(options);

        this.monaco?.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
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

        if (this.monaco?.languages?.typescript?.typescriptDefaults?.setExtraLibs) {
            this.monaco.languages.typescript.typescriptDefaults.setExtraLibs(wantedTypings);
        } else if (this.monaco?.languages?.typescript?.typescriptDefaults?.addExtraLib) {
            const existingLibs = this.monaco.languages.typescript.typescriptDefaults.getExtraLibs();
            wantedTypings.forEach(lib => {
                if (!existingLibs[lib.filePath] && this.monaco) {
                    this.monaco.languages.typescript.typescriptDefaults.addExtraLib(lib.content, lib.filePath);
                }
            });
        }
    }

    /**
     * Inserts some text into the given editor
     *
     * @param text The text to add
     */
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

    highlightText(text: string): void {
        if (!this.editor || !this.monaco) {
            return;
        }

        const range: monacoEditor.editor.FindMatch[] | undefined = text
            ? this.editor.getModel()?.findMatches(text, true, false, false, null, true)
            : undefined;
        if (range?.length) {
            range.forEach(r => this.editor?.setSelection(r.range));
            this.editor.revealLine(range[0].range.startLineNumber);
        } else {
            const pos = this.editor.getPosition();
            if (pos) {
                const row = pos.lineNumber;
                const col = pos.column;
                this.editor.setSelection(new this.monaco.Range(row, col, row, col));
            }
        }
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
            this.props.onChange && this.props.onChange(this.editor.getValue());
        }
    }

    render(): React.JSX.Element | null {
        if (!this.monaco?.languages?.typescript?.typescriptDefaults || !this.props.runningInstances) {
            setTimeout(() => {
                this.monaco = (window as any).monaco as typeof monacoEditor | null;
                this.forceUpdate();
            }, 200);
            return null;
        }

        return (
            <div
                ref={this.monacoDiv}
                style={{ ...this.props.style, width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}
            >
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
