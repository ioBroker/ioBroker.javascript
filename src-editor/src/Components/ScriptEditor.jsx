import React from 'react';
import PropTypes from 'prop-types';
import MonacoEditor from 'react-monaco-editor';

class ScriptEditor extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isDark: props.isDark || false,
            language: props.language || 'javascript',
            readOnly: props.readOnly || false,
        };
        this.editor = null;
        this.monaco = null;
        this.insert = '';
        this.originalCode = props.code || '';
    }

    UNSAFE_componentWillReceiveProps(nextProps) {
        if (this.originalCode !== nextProps.code) {
            this.forceUpdate();
            this.originalCode = nextProps.code || '';
        } else if (this.state.language !== (nextProps.language || 'javascript')) {
            this.setState({ language: nextProps.language || 'javascript' });
        } else if (this.state.readOnly !== (nextProps.readOnly || false)) {
            this.setState({ readOnly: nextProps.readOnly || false });
        } else if (this.state.isDark !== (nextProps.isDark || false)) {
            this.setState({ isDark: nextProps.isDark || false });
        }

        if (this.insert !== nextProps.insert) {
            this.insert = nextProps.insert;
            nextProps.insert && this.insertTextIntoEditor(nextProps.insert);
            if (nextProps.insert) {
                setTimeout(() => this.props.onInserted && this.props.onInserted(), 100);
            }
        }
    }

    /**
     * Inserts some text into the given editor
     * @param {string} text The text to add
     */
    insertTextIntoEditor(text) {
        const selection = this.editor.getSelection();
        const range = new this.monaco.Range(
            selection.startLineNumber,
            selection.startColumn,
            selection.endLineNumber,
            selection.endColumn,
        );

        this.editor.executeEdits('', [{ range, text, forceMoveMarkers: true }]);
    }

    editorDidMount(editor, monaco) {
        this.monaco = monaco;
        this.editor = editor;
        //editor.focus();
    }

    onChange(newValue, e) {
        this.props.onChange && this.props.onChange(newValue);
    }

    render() {
        const options = {
            selectOnLineNumbers: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            readOnly: this.state.readOnly,
        };
        return (
            <MonacoEditor
                width="100%"
                height="100%"
                languages={['javascript', 'typescript']}
                language={this.state.language}
                theme={this.state.isDark ? 'vs-dark' : ''}
                value={this.originalCode}
                searchText={this.props.searchText}
                options={options}
                onChange={newValue => this.onChange(newValue)}
                editorDidMount={(editor, monaco) => this.editorDidMount(editor, monaco)}
            />
        );
    }
}

ScriptEditor.propTypes = {
    onChange: PropTypes.func,
    onInserted: PropTypes.func,
    isDark: PropTypes.bool,
    readOnly: PropTypes.bool,
    code: PropTypes.string,
    language: PropTypes.string,
    searchText: PropTypes.string,
};

export default ScriptEditor;
