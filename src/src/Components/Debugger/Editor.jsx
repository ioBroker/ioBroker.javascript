import React from 'react';
import PropTypes from 'prop-types';
import ScriptEditorComponent from '../ScriptEditorVanilaMonaco';

const styles = {
    editorDiv: {
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
    },
};

class Editor extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            lines: (this.props.script || '').split(/\r\n|\n/),
        };
    }

    editorDidMount(editor, monaco) {
        this.monaco = monaco;
        this.editor = editor;
        editor.focus();
    }

    render() {
        return (
            <div
                style={styles.editorDiv}
                key="scriptEditorDiv2"
            >
                <ScriptEditorComponent
                    key="scriptEditor2"
                    name={this.props.scriptName}
                    adapterName={this.props.adapterName}
                    readOnly
                    code={this.props.script || ''}
                    isDark={this.props.themeType === 'dark'}
                    socket={this.props.socket}
                    runningInstances={this.props.runningInstances}
                    language={'javascript'}
                    breakpoints={this.props.breakpoints}
                    location={this.props.paused ? this.props.location : null}
                    onToggleBreakpoint={i => this.props.onToggleBreakpoint(i)}
                />
            </div>
        );
    }
}

Editor.propTypes = {
    runningInstances: PropTypes.object,
    socket: PropTypes.object,
    sourceId: PropTypes.string,
    script: PropTypes.string,
    scriptName: PropTypes.string,
    adapterName: PropTypes.string,
    paused: PropTypes.bool,
    breakpoints: PropTypes.array,
    location: PropTypes.object,
    themeType: PropTypes.string,
    themeName: PropTypes.string,
    onToggleBreakpoint: PropTypes.func,
};

export default Editor;
