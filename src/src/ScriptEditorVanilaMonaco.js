import React from 'react';
import PropTypes from 'prop-types';

class ScriptEditor extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            name: 'current',
            isDark: props.isDark || false,
            language: props.language || 'javascript',
            readOnly: props.readOnly || false,
            alive: true
        };
        this.monacoDiv = null; //ref
        this.editor = null;
        this.monaco = window.monaco;
        this.insert = '';
        this.originalCode = props.code || '';
        this.globalTypingHandles  = [];
        this.typings        = {}; // TypeScript declarations
    }

    componentDidMount() {
        if (!this.editor) {
            // For some reason we have to get the original compiler options
            // and assign new properties one by one
            const compilerOptions = this.monaco.languages.typescript.typescriptDefaults['getCompilerOptions']();
            compilerOptions.target = this.monaco.languages.typescript.ScriptTarget.ES2015;
            compilerOptions.allowJs = true;
            compilerOptions.checkJs = true;
            compilerOptions.noLib = true;
            compilerOptions.lib = [];
            compilerOptions.moduleResolution = this.monaco.languages.typescript.ModuleResolutionKind.NodeJs;
            this.monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);

            this.setTypeCheck(true);

            // Create the editor instances
            this.editor = this.monaco.editor.create(this.monacoDiv, {
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true
            });

            // Create a default empty model for both
            this.editor.setModel(this.monaco.editor.createModel(
                '', 'typescript', this.monaco.Uri.from({path: '__empty.js'})
            ));
            this.editor.focus();
            const options = {
                selectOnLineNumbers: true,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                readOnly: this.state.readOnly
            };
            this.setEditorOptions(options);
        }
        this.editor.setValue(this.originalCode);
    }

    /**
     * Sets some options of the code editor
     * @param {monaco.editor.IStandaloneCodeEditor} editorInstance The editor instance to change the options for
     * @param {Partial<{readOnly: boolean, lineWrap: boolean, language: EditorLanguage, typeCheck: boolean}>} options
     */
    setEditorOptions(options) {
        if (!options) return;
        if (options.language != null) this.setEditorLanguage(options.language);
        if (options.readOnly != null) this.editor.updateOptions({readOnly: options.readOnly});
        if (options.lineWrap != null) this.editor.updateOptions({wordWrap: options.lineWrap ? 'on' : 'off'});
        if (options.typeCheck != null) this.setTypeCheck(options.typeCheck);
    }

    componentWillUnmount() {
        if (this.editor) {
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
            code, newLanguage, this.monaco.Uri.from({path: `${filenameWithoutExtension}.${extension}`})
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
    isIdOfGlobalScript(id) {
        return /^script\.js\.global\./.test(id);
    }

    setEditorTypings() {
        // clear previously added global typings
        for (const handle of this.globalTypingHandles) {
            if (handle != null) handle.dispose();
        }

        const isGlobalScript = this.isIdOfGlobalScript(this.state.name);
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
     * @param {monaco.editor.IStandaloneCodeEditor} editorInstance The editor instance to add the code into
     * @param {string} text The text to add
     */
    insertTextIntoEditor(editorInstance, text) {
        const selection = editorInstance.getSelection();
        const range = new this.monaco.Range(
            selection.startLineNumber, selection.startColumn,
            selection.endLineNumber, selection.endColumn
        );
        editorInstance.executeEdits('', [{range: range, text: text, forceMoveMarkers: true}]);
    }

    componentWillReceiveProps(nextProps) {
        if (this.state.name !== nextProps.name) {
            this.setState({name: nextProps.name});
        }
        if (this.originalCode !== nextProps.code) {
            this.forceUpdate();
            this.originalCode = nextProps.code || '';
        } else
        if (this.state.language !== (nextProps.language || 'javascript')) {
            this.setState({language: nextProps.language || 'javascript'});
        } else if (this.state.readOnly !== (nextProps.readOnly || false)) {
            this.setState({readOnly: nextProps.readOnly || false});
        } else if (this.state.isDark !== (nextProps.isDark || false)) {
            this.setState({isDark: nextProps.isDark || false});
        }

        if (this.insert !== nextProps.insert) {
            this.insert = nextProps.insert;
            nextProps.insert && this.insertTextIntoEditor(nextProps.insert);
            if (nextProps.insert) {
                setTimeout(() => this.props.onInserted && this.props.onInserted(), 100);
            }
        }
    }

    onChange(newValue, e) {
        this.props.onChange && this.props.onChange(newValue);
    }

    render() {
        return (
            <div ref={el => this.monacoDiv = el} style={{width: '100%', height: '100%', overflow: 'hidden', position: 'relative'}}/>
        );
    }
}

ScriptEditor.propTypes = {
    name: PropTypes.string,
    onChange: PropTypes.func,
    onInserted: PropTypes.func,
    isDark: PropTypes.bool,
    readOnly: PropTypes.bool,
    code: PropTypes.string,
    language: PropTypes.string
};

export default ScriptEditor;
