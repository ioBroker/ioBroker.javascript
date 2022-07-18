import React from 'react';
import PropTypes from 'prop-types';
import Fab from '@mui/material/Fab';

import {MdGTranslate as IconNoCheck} from 'react-icons/md';
import I18n from '@iobroker/adapter-react-v5/i18n';

function isIdOfGlobalScript(id) {
    return /^script\.js\.global\./.test(id);
}
let index = 0;
class ScriptEditor extends React.Component {
    constructor(props) {
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
        this.monacoDiv = null; //ref
        this.editor = null;
        this.monaco = window.monaco;
        this.insert = '';
        this.originalCode = props.code || '';
        this.typings = {}; // TypeScript declarations
        this.lastSearch = '';
    }

    waitForMonaco(cb) {
        if (!this.monaco || !this.props.runningInstances) {
            this.monaco = window.monaco;
            this.monacoCounter = this.monacoCounter || 0;
            this.monacoCounter++;
            if (!this.monaco && this.monacoCounter < 20) {
                console.log('wait for monaco loaded');
                return setTimeout(() => this.waitForMonaco(cb), 200);
            } else if (this.monacoCounter >= 20) {
                console.error('Cannot load monaco!');
            }
        } else {
            cb && cb();
        }
    }

    loadTypings(runningInstances) {
        if (!this.editor) {
            return;
        }
        runningInstances = runningInstances || this.props.runningInstances;
        let scriptAdapterInstance = runningInstances && Object.keys(runningInstances).find(id => runningInstances[id]);
        if (scriptAdapterInstance) {
            this.props.socket.sendTo(scriptAdapterInstance.replace('system.adapter.', ''), 'loadTypings', null)
                .then(result => {
                    this.setState({alive: true, check: true, typingsLoaded: true});
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

    componentDidMount() {
        if (!this.monaco || !this.props.runningInstances) {
            this.monaco = window.monaco;
            if (!this.monaco) {
                console.log('wait for monaco loaded');
                return this.waitForMonaco(() => this.componentDidMount());
            }
        }
        if (!this.editor) {
            this.props.onRegisterSelect && this.props.onRegisterSelect(() => this.editor.getModel().getValueInRange(this.editor.getSelection()));
            // For some reason we have to get the original compiler options
            // and assign new properties one by one
            const compilerOptions = this.monaco.languages.typescript.typescriptDefaults['getCompilerOptions']();
            compilerOptions.target = this.monaco.languages.typescript.ScriptTarget.ES2015;
            compilerOptions.allowJs = true;
            compilerOptions.checkJs = this.props.checkJs !== false;
            compilerOptions.noLib = true;
            compilerOptions.lib = [];
            compilerOptions.useUnknownInCatchVariables = false;
            compilerOptions.moduleResolution = this.monaco.languages.typescript.ModuleResolutionKind.NodeJs;
            this.monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);

            this.setTypeCheck(false);

            // Create the editor instances
            this.editor = this.monaco.editor.create(this.monacoDiv, {
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                glyphMargin: !!this.props.breakpoints,
            });

            this.editor.onDidChangeModelContent(e =>
                this.onChange(this.editor.getValue()));

            // Load typings for the JS editor
            /** @type {string} */
            this.loadTypings();

            this.editor.addCommand(this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.KEY_S, () =>
                this.onForceSave());

            setTimeout(() => {
                this.highlightText(this.state.searchText);
                this.location = this.props.location;
                this.breakpoints = this.props.breakpoints;
                this.showDecorators();
            });
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
        this.editor.focus();
        this.editor.setValue(this.originalCode);
        if (this.props.onToggleBreakpoint) {
            this.editor.onMouseDown(e => {
                if (e.target.detail && e.target.detail.glyphMarginLeft !== undefined) {
                    this.props.onToggleBreakpoint(e.target.position.lineNumber - 1);
                }
            });
        } else {
            this.editor.onMouseDown(null);
        }
    }

    /**
     * Sets some options of the code editor
     * @param {object} options The editor options to change
     * @param {Partial<{readOnly: boolean, lineWrap: boolean, language: EditorLanguage, typeCheck: boolean}>} options
     */
    setEditorOptions(options) {
        if (options) {
            if (options.language) {
                this.setEditorLanguage(options.language);
            }
            if (options.readOnly !== undefined) {
                this.editor.updateOptions({readOnly: options.readOnly});
            }
            if (options.lineWrap !== undefined) {
                this.editor.updateOptions({wordWrap: options.lineWrap ? 'on' : 'off'});
            }
            if (options.typeCheck !== undefined) {
                this.setTypeCheck(options.typeCheck);
            }
            if (options.isDark !== undefined) {
                this.monaco.editor.setTheme(options.isDark ? 'vs-dark' : 'vs');
            }
        }
    }

    componentWillUnmount() {
        if (this.editor) {
            this.props.onRegisterSelect && this.props.onRegisterSelect(null);
            this.editor.dispose();
            this.editor = null;
        }
    }

    /** @typedef {"javascript" | "typescript" | "coffeescript"} EditorLanguage */

    /**
     * Sets the language of the code editor
     * @param {EditorLanguage} language
     */
    setEditorLanguage(language) {
        // we need to recreate the model when changing languages,
        // so remember its settings
        const model = this.editor.getModel();
        const code  = model.getValue();
        const uri   = model.uri.path;

        const filenameWithoutExtension =
            typeof uri === 'string' && uri.includes('.')
                ? uri.substr(0, uri.lastIndexOf('.'))
                : 'index';

        const extension =
            language === 'javascript' ? 'js'
                : (language === 'typescript' ? 'ts' : language);

        // get rid of the original model
        model.dispose();

        // Both JS and TS need the model to work in TypeScript as the script type
        // is inferred from the file extension
        const newLanguage = (language === 'javascript' || language === 'typescript') ? 'typescript' : language;

        const newModel = this.monaco.editor.createModel(
            code,
            newLanguage,
            this.monaco.Uri.from({path: `${filenameWithoutExtension}${index++}.${extension}`})
        );

        this.editor.setModel(newModel);
    }

    /**
     * Enables or disables the type checking in the editor
     * @param {boolean} enabled - Whether type checking is enabled or not
     */
    setTypeCheck(enabled) {
        const options = {
            noSemanticValidation: !this.state.alive || !enabled, // toggle the type checking
            noSyntaxValidation: !this.state.alive // always check the syntax
        };
        this.monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions(options);
    }

    /**
     * @param {string} [currentScriptName] The name of the current script
     */
    setEditorTypings(currentScriptName = '') {
        const isGlobalScript = isIdOfGlobalScript(currentScriptName);
        // The filename of the declarations this script can see if it is a global script
        const partialDeclarationsPath = `${currentScriptName}.d.ts`;
        const wantedTypings = [];
        for (const path of Object.keys(this.typings)) {
            // global scripts don't get to see all other global scripts
            // but only a part of them
            if (isGlobalScript) {
                if (path === 'global.d.ts') continue;
                if (path.startsWith('script.js.global') && path !== partialDeclarationsPath) continue;
            }
            wantedTypings.push({
                filePath: path,
                content: this.typings[path],
            });
        }

        // TODO BF: check https://microsoft.github.io/monaco-editor/playground.html#extending-language-services-semantic-tokens-provider-example
        // to support 0.21.0

        if (this.monaco && this.monaco.languages.typescript.typescriptDefaults.setExtraLibs) {
            this.monaco.languages.typescript.typescriptDefaults.setExtraLibs(wantedTypings);
        } else if (this.monaco && this.monaco.languages.typescript.typescriptDefaults.addExtraLib) {
            const existingLibs = this.monaco.languages.typescript.typescriptDefaults.getExtraLibs();
            wantedTypings.forEach(lib => {
                if (!existingLibs[lib.filePath]) {
                    this.monaco.languages.typescript.typescriptDefaults.addExtraLib(lib, lib.filePath);
                }
            });
        }
    }

    /**
     * Inserts some text into the given editor
     * @param {string} text The text to add
     */
    insertTextIntoEditor(text) {
        const selection = this.editor.getSelection();
        const range = new this.monaco.Range(
            selection.startLineNumber, selection.startColumn,
            selection.endLineNumber, selection.endColumn
        );
        this.editor.executeEdits('', [{range: range, text: text, forceMoveMarkers: true}]);
        this.editor.focus();
    }

    highlightText(text) {
        let range = text && this.editor.getModel().findMatches(text);
        if (range && range.length) {
            range.forEach(r => this.editor.setSelection(r.range));
            this.editor.revealLine(range[0].range.startLineNumber);
        } else if (this.editor) {
            const row = this.editor.getPosition().lineNumber;
            const col = this.editor.getPosition().column;
            this.editor.setSelection(new this.monaco.Range(row, col, row, col));
        }
    }

    showDecorators() {
        this.decorations = this.decorations || [];
        const decorations = [];
        if (this.location) {
            decorations.push({
                range: new this.monaco.Range(this.location.lineNumber + 1, this.location.columnNumber + 1, this.location.lineNumber + 1, 1000),
                options: {
                    isWholeLine: false,
                    className: this.props.isDark ? 'monacoCurrentLineDark' : 'monacoCurrentLine',
                }
            });
            decorations.push({
                range: new this.monaco.Range(this.location.lineNumber + 1, 0, this.location.lineNumber + 1, 0),
                options: {
                    isWholeLine: true,
                    className: this.props.isDark ? 'monacoCurrentFullLineDark' : 'monacoCurrentFullLine',
                }
            });
        }

        if (this.breakpoints) {
            this.breakpoints.forEach(bp => {
                decorations.push({
                    range: new this.monaco.Range(bp.location.lineNumber + 1, 0, bp.location.lineNumber + 1, 100),
                    options: {
                        isWholeLine: true,
                        glyphMarginClassName: this.props.isDark ? 'monacoBreakPointDark' : 'monacoBreakPoint',
                    }
                });
            });
        }
        this.editor && (this.decorations =
            this.editor.deltaDecorations(this.decorations, decorations));
    }

    initNewScript(name, code) {
        this.setState({name});
        this.originalCode = code || '';
        this.editor && this.editor.setValue(code);
        this.highlightText(this.lastSearch);
        this.showDecorators();
        //this.setEditorLanguage();
        // Update the typings because global scripts need different typings than normal scripts
        // and each global script has different typings
        this.setEditorTypings(name);
    }

    scrollToLineIfNeeded(lineNumber) {
        if (this.editor) {
            const ranges = this.editor.getVisibleRanges();
            if (!ranges || !ranges[0] || ranges[0].startLineNumber > lineNumber || lineNumber > ranges[0].endLineNumber) {
                this.editor.revealLineInCenter(lineNumber);
            }
        }
    }

    UNSAFE_componentWillReceiveProps(nextProps) {
        const options = {};
        if (this.state.name !== nextProps.name) {
            // A different script was selected
            this.initNewScript(nextProps.name, nextProps.code);
        }

        // if some running instance will be found and
        if (JSON.stringify(nextProps.runningInstances) !== this.runningInstancesStr) {
            this.runningInstancesStr = JSON.stringify(nextProps.runningInstances);
            if (!this.state.typingsLoaded) {
                this.loadTypings(nextProps.runningInstances);
            }
        }

        // if the code not yet changed, update the new code
        if (!nextProps.changed && nextProps.code !== this.originalCode) {
            this.originalCode = nextProps.code;
            this.editor.setValue(this.originalCode);
            this.showDecorators();
            this.location && this.scrollToLineIfNeeded(this.location.lineNumber + 1);
        }

        if (nextProps.searchText !== this.lastSearch) {
            this.lastSearch = nextProps.searchText;
            this.highlightText(this.lastSearch);
        }

        if (JSON.stringify(nextProps.location) !== JSON.stringify(this.location) &&
            JSON.stringify(nextProps.breakpoints) !== JSON.stringify(this.breakpoints)) {
            this.location = nextProps.location;
            this.breakpoints = nextProps.breakpoints;
            this.showDecorators();
            this.editor && this.location && this.scrollToLineIfNeeded(this.location.lineNumber + 1);
            //this.editor && this.location && this.editor.setPosition(this.location.lineNumber + 1, this.location.columnNumber + 1);
        } else if (JSON.stringify(nextProps.breakpoints) !== JSON.stringify(this.breakpoints)) {
            this.breakpoints = nextProps.breakpoints;
            this.showDecorators();
        } else if (JSON.stringify(nextProps.location) !== JSON.stringify(this.location)) {
            this.location = nextProps.location;
            this.showDecorators();
            this.editor && this.location && this.scrollToLineIfNeeded(this.location.lineNumber + 1);
            //this.editor && this.location && this.editor.setPosition(this.location.lineNumber + 1, this.location.columnNumber + 1);
        }

        if (this.state.language !== (nextProps.language || 'javascript')) {
            this.setState({language: nextProps.language || 'javascript'});
            options.language = nextProps.language || 'javascript';
        } else if (this.state.readOnly !== (nextProps.readOnly || false)) {
            this.setState({readOnly: nextProps.readOnly || false});
            options.readOnly = nextProps.readOnly;
        } else if (this.state.isDark !== (nextProps.isDark || false)) {
            this.setState({isDark: nextProps.isDark || false});
            options.isDark = nextProps.isDark;
        }

        this.setEditorOptions(options);

        if (this.insert !== nextProps.insert) {
            this.insert = nextProps.insert;
            if (this.insert) {
                console.log('Insert text' + this.insert);
                setTimeout(insert => {
                    this.insertTextIntoEditor(insert);
                    setTimeout(() => this.props.onInserted && this.props.onInserted(), 100);
                }, 100, this.insert);
            }
        }
    }

    onChange(newValue, e) {
        if (!this.props.readOnly) {
            this.props.onChange && this.props.onChange(this.editor.getValue());
        }
    }

    render() {
        if (!this.monaco || !this.props.runningInstances) {
            setTimeout(() => {
                this.monaco = window.monaco;
                this.forceUpdate()
            }, 200);
            return null;
        }

        return <div ref={el => this.monacoDiv = el} style={{width: '100%', height: '100%', overflow: 'hidden', position: 'relative'}}>
            {!this.state.check && <Fab
                size="small"
                title={I18n.t('Check is not active, because javascript adapter is disabled')}
                style={{bottom: 10, right: 10, opacity: 0.5, position: 'absolute', zIndex: 1, background: 'red', color: 'white'}}
                color="secondary"><IconNoCheck/></Fab>}
        </div>;
    }
}

ScriptEditor.propTypes = {
    adapterName: PropTypes.string.isRequired,
    socket: PropTypes.object,
    runningInstances: PropTypes.object,
    name: PropTypes.string,
    onChange: PropTypes.func,
    onForceSave: PropTypes.func,
    onInserted: PropTypes.func,
    isDark: PropTypes.bool,
    readOnly: PropTypes.bool,
    code: PropTypes.string,
    language: PropTypes.string,
    onRegisterSelect: PropTypes.func,
    searchText: PropTypes.string,
    checkJs: PropTypes.bool,
    changed: PropTypes.bool,

    breakpoints: PropTypes.array,
    location: PropTypes.object,
    onToggleBreakpoint: PropTypes.func,
};

export default ScriptEditor;
