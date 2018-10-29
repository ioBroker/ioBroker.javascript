import React from 'react';
import PropTypes from 'prop-types';
import MonacoEditor from 'react-monaco-editor';

import I18n from './i18n';

class ScriptEditor extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isDark: props.isDark || false,
            language: props.language || 'javascript',
            readOnly: props.readOnly || false
        };
        this.originalCode = props.code || '';
    }

    componentWillReceiveProps(nextProps) {
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
    }
    editorDidMount(editor, monaco) {
        this.editor = editor;
        editor.focus();
    }
    onChange(newValue, e) {
        this.props.onChange && this.props.onChange(newValue);
    }
    render() {
        const options = {
            selectOnLineNumbers: true,
            scrollBeyondLastLine: false,
            automaticLayout: true
        };
        return (
            <MonacoEditor
                width="100%"
                height="100%"
                language={this.state.language}
                theme={this.state.isDark ? 'vs-dark': ''}
                value={this.originalCode}
                options={options}
                onChange={newValue => this.onChange(newValue)}
                editorDidMount={(editor, monaco) => this.editorDidMount(editor, monaco)}
            />
        );
    }
}

ScriptEditor.propTypes = {
    onChange: PropTypes.func,
    isDark: PropTypes.bool,
    code: PropTypes.string,
    language: PropTypes.string
};

export default ScriptEditor;
