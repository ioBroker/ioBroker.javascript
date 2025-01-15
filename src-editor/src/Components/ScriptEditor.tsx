import React from 'react';
import MonacoEditor from 'react-monaco-editor';
import type * as monacoEditor from 'monaco-editor';

interface ScriptEditorProps {
    onChange?: (newValue: string) => void;
    onInserted?: () => void;
    isDark?: boolean;
    readOnly?: boolean;
    code?: string;
    language?: 'javascript' | 'typescript';
    searchText?: string;
    insert?: string;
}

interface ScriptEditorState {
    isDark: boolean;
    language: 'javascript' | 'typescript';
    readOnly: boolean;
    forceUpdate: boolean;
    originalCode: string;
    insertText: string;
}

class ScriptEditor extends React.Component<ScriptEditorProps, ScriptEditorState> {
    private editor: monacoEditor.editor.IStandaloneCodeEditor | null = null;

    private monaco: typeof monacoEditor | null = null;

    private updating = false;

    constructor(props: ScriptEditorProps) {
        super(props);
        this.state = {
            isDark: props.isDark || false,
            language: props.language || 'javascript',
            readOnly: props.readOnly || false,
            forceUpdate: false,
            originalCode: props.code || '',
            insertText: '',
        };
    }

    static getDerivedStateFromProps(
        props: ScriptEditorProps,
        state: ScriptEditorState,
    ): Partial<ScriptEditorState> | null {
        let newState: Partial<ScriptEditorState> | null = null;
        if (props.code !== state.originalCode) {
            newState = { originalCode: props.code || '', forceUpdate: true };
        }
        if (props.language !== state.language) {
            newState = newState || {};
            newState.language = props.language || 'javascript';
        }
        if (props.isDark !== state.isDark) {
            newState = newState || {};
            newState.isDark = props.isDark || false;
        }
        if (props.readOnly !== state.readOnly) {
            newState = newState || {};
            newState.readOnly = props.readOnly || false;
        }
        if (props.insert !== state.insertText) {
            newState = newState || {};
            newState.insertText = props.insert || '';
        }

        return newState;
    }

    /**
     * Inserts some text into the given editor
     *
     * @param text The text to add
     */
    insertTextIntoEditor(text: string): void {
        if (this.editor && this.monaco) {
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
        }
    }

    editorDidMount(editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: typeof monacoEditor): void {
        this.monaco = monaco;
        this.editor = editor;
        // editor.focus();
    }

    onChange(newValue: string): void {
        this.props.onChange && this.props.onChange(newValue);
    }

    render(): React.JSX.Element {
        const options = {
            selectOnLineNumbers: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            readOnly: this.state.readOnly,
        };

        if (this.state.forceUpdate && !this.updating) {
            this.updating = true;
            setTimeout(() => {
                this.updating = false;
                this.setState({ forceUpdate: false });
            }, 50);
        }

        if (this.state.insertText) {
            setTimeout(() => {
                this.insertTextIntoEditor(this.state.insertText);
                this.setState({ insertText: '' }, () => this.props.onInserted && this.props.onInserted());
            }, 50);
        }

        return (
            <MonacoEditor
                width="100%"
                height="100%"
                language={this.state.language}
                theme={this.state.isDark ? 'vs-dark' : ''}
                value={this.state.originalCode}
                // TODO: implement find
                // searchText={this.props.searchText}
                options={options}
                onChange={newValue => this.onChange(newValue)}
                editorDidMount={(editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: typeof monacoEditor) =>
                    this.editorDidMount(editor, monaco)
                }
            />
        );
    }
}

export default ScriptEditor;
