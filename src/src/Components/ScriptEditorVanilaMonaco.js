import React from 'react';
import PropTypes from 'prop-types';
import Button from '@material-ui/core/Button';

import {MdGTranslate as IconNoCheck} from 'react-icons/md';
import I18n from '../i18n';

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
            searchText: this.props.searchText || ''
        };
        this.monacoDiv = null; //ref
        this.editor = null;
        this.monaco = window.monaco;
        this.insert = '';
        this.originalCode = props.code || '';
        this.globalTypingHandles  = [];
        this.typings = {}; // TypeScript declarations
        this.lastSearch = '';
    }

    componentDidMount() {
        if (!this.monaco) {
            this.monaco = window.monaco;
            if (!this.monaco) {
                console.log('wait for monaco loaded');
                return setTimeout(() => this.forceUpdate(), 100);
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
            compilerOptions.moduleResolution = this.monaco.languages.typescript.ModuleResolutionKind.NodeJs;
            this.monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);

            this.setTypeCheck(false);

            // Create the editor instances
            this.editor = this.monaco.editor.create(this.monacoDiv, {
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true
            });

            this.editor.onDidChangeModelContent(e => {
                this.onChange(this.editor.getValue());
            });

            // Load typings for the JS editor
            /** @type {string} */
            let scriptAdapterInstance = this.props.connection.getScripts().instances[0];
            if (scriptAdapterInstance || scriptAdapterInstance === 0) {
                this.props.connection.sendTo('javascript.' + scriptAdapterInstance, 'loadTypings', null, result => {
                    this.setState({alive: true, check: true});
                    this.setTypeCheck(true);
                    if (result.typings) {
                        this.typings = result.typings;
                        this.setEditorTypings();
                    } else {
                        console.error(`failed to load typings: ${result.error}`);
                    }
                });
            }
            this.editor.addCommand(this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.KEY_S, () =>
                this.onForceSave());
        }
        const options = {
            selectOnLineNumbers: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            readOnly: this.state.readOnly,
            language: this.state.language,
            isDark: this.state.isDark
        };
        this.setEditorOptions(options);
        this.editor.focus();
        this.editor.setValue(this.originalCode);
    }

    /**
     * Sets some options of the code editor
     * @param {object} options The editor options to change
     * @param {Partial<{readOnly: boolean, lineWrap: boolean, language: EditorLanguage, typeCheck: boolean}>} options
     */
    setEditorOptions(options) {
        if (!options) return;
        if (options.language) this.setEditorLanguage(options.language);
        if (options.readOnly !== undefined) this.editor.updateOptions({readOnly: options.readOnly});
        if (options.lineWrap !== undefined) this.editor.updateOptions({wordWrap: options.lineWrap ? 'on' : 'off'});
        if (options.typeCheck !== undefined) this.setTypeCheck(options.typeCheck);
        if (options.isDark !== undefined) this.monaco.editor.setTheme(options.isDark ? 'vs-dark' : 'vs');
    }

    componentWillUnmount() {
        if (this.editor) {
            this.props.onRegisterSelect && this.props.onRegisterSelect(null);
            this.editor.dispose();
            this.editor = null;
        }
    }

    /** @typedef {"javascript" | "typescript" | "coffee"} EditorLanguage */

    /**
     * Sets the language of the code editor
     * @param {monaco.editor.IStandaloneCodeEditor} editorInstance The editor instance to change the options for
     * @param {EditorLanguage} language
     */
    setEditorLanguage(language) {
        // we need to recreate the model when changing languages,
        // so remember its settings
        const model = this.editor.getModel();
        const code = model.getValue();
        const uri = model.uri.path;
        const filenameWithoutExtension =
            typeof uri === 'string' && uri.indexOf('.') > -1
                ? uri.substr(0, uri.lastIndexOf('.'))
                : 'index';
        const extension =
            language === 'javascript' ? 'js'
                : language === 'typescript' ? 'ts'
                : language === 'coffee' ? 'coffee'
                    : language;
        // get rid of the original model
        model.dispose();
        // Both JS and TS need the model to work in TypeScript as the script type
        // is inferred from the file extension
        const newLanguage = (language === 'javascript' || language === 'typescript') ? 'typescript' : language;

        const newModel = this.monaco.editor.createModel(
            code, newLanguage, this.monaco.Uri.from({path: `${filenameWithoutExtension}${index++}.${extension}`})
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
     * Adds the given declaration file to the editor
     * @param {string} path The file path of the typings to add
     * @param {string} typings The declaration file to add
     * @param {boolean} [isGlobal=false] Whethere the file is a global declaration file
     * @returns {void}
     */
    addTypingsToEditor(path, typings, isGlobal) {
        try {
            const handle = this.monaco.languages.typescript.typescriptDefaults.addExtraLib(typings, path);
            if (isGlobal) this.globalTypingHandles.push(handle);
        } catch (e) { /* might be added already */}
    }

    setEditorTypings() {
        // clear previously added global typings
        for (const handle of this.globalTypingHandles) {
            handle && handle.dispose();
        }

        const isGlobalScript = isIdOfGlobalScript(this.state.name);
        // The filename of the declarations this script can see if it is a global script
        const partialDeclarationsPath = this.state.name + '.d.ts';
        for (const path of Object.keys(this.typings)) {
            // global scripts don't get to see all other global scripts
            // but only a part of them
            if (isGlobalScript) {
                if (path === 'global.d.ts') continue;
                if (path.startsWith('script.js.global') && path !== partialDeclarationsPath) continue;
            }
            this.addTypingsToEditor(path, this.typings[path], isGlobalScript);
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
        let range = this.editor.getModel().findMatches(text);
        if (range && range.length) {
            range.forEach(r => this.editor.setSelection(r.range));
            this.editor.revealLine(range[0].range.startLineNumber);
        } else {
            const row = this.editor.getPosition().lineNumber;
            const col = this.editor.getPosition().column;
            this.editor.setSelection(new this.monaco.Range(row,col,row,col));
        }
    }

    componentWillReceiveProps(nextProps) {
        const options = {};
        if (this.state.name !== nextProps.name) {
            this.setState({name: nextProps.name});
            this.originalCode = nextProps.code || '';
            this.editor && this.editor.setValue(nextProps.code);
        }

        if (nextProps.searchText !== this.lastSearch) {
            this.lastSearch = nextProps.searchText;
            if (this.lastSearch) {
                this.highlightText(this.lastSearch);
            }

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
            if (nextProps.insert) {
                this.insertTextIntoEditor(nextProps.insert);
                setTimeout(() => this.props.onInserted && this.props.onInserted(), 100);
            }
        }
    }

    onChange(newValue, e) {
        if (!this.props.readOnly) {
            this.props.onChange && this.props.onChange(this.editor.getValue());
        }
    }

    render() {
        if (!this.monaco) {
            setTimeout(() => {
                this.monaco = window.monaco;
                this.forceUpdate()
            }, 200);
            return null;
        }

        return (
            <div ref={el => this.monacoDiv = el} style={{width: '100%', height: '100%', overflow: 'hidden', position: 'relative'}}>
                {!this.state.check && (<Button
                    mini
                    title={I18n.t('Check is not active, because javascript adapter is disabled')}
                    style={{bottom: 10, right: 10, opacity: 0.5, position: 'absolute', zIndex: 1, background: 'red', color: 'white'}}
                    variant="fab"
                    color="secondary"><IconNoCheck/></Button>)}
            </div>
        );
    }
}

ScriptEditor.propTypes = {
    connection: PropTypes.object,
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
    checkJs: PropTypes.bool
};

export default ScriptEditor;
