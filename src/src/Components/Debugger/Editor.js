import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {withStyles} from '@material-ui/core/styles';
import ScriptEditorComponent from '../ScriptEditorVanilaMonaco';

const styles = theme => ({
    editorDiv: {
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        position: 'relative'
    },
    editor: {
        width: '100%',
        height: '100%',
        overflow: 'auto',
    },
    line: {
        width: '100%',
        whiteSpace: 'nowrap',
    },
    lineNumber: {
        width: 40,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        display: 'inline-block',
        fontFamily: 'Lucida Console, Courier, monospace',
        textAlign: 'right',
        fontSize: 14,
        marginRight: 1,
        borderRight: '1px solid #555',
        cursor: 'pointer'
    },
    lineBreakpoint: {
        background: '#330000',
        color: 'white',
    },
    lineCode: {
        //whiteSpace: 'nowrap',
        display: 'inline-block',
        fontFamily: 'Lucida Console, Courier, monospace',
        fontSize: 14,
        margin: 0,
        whiteSpace: 'pre',
    },
    lineCurrentCode: {
        background: 'red',
        color: 'white',
    },
    lineCurrent: {
        background: '#880000',
        color: 'white',
    },
});

class Editor extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            lines: (this.props.script || '').split(/\r\n|\n/)
        };
    }

    editorDidMount(editor, monaco) {
        this.monaco = monaco;
        this.editor = editor;
        editor.focus();
    }

    render() {
        return <div className={this.props.classes.editorDiv} key="scriptEditorDiv2">
            <ScriptEditorComponent
                key="scriptEditor2"
                name={this.props.scriptName}
                adapterName={this.props.adapterName}
                readOnly={true}
                code={this.props.script || ''}
                isDark={this.props.themeType === 'dark'}
                socket={this.props.socket}
                runningInstances={this.props.runningInstances}
                language={'javascript'}

                breakpoints={this.props.breakpoints}
                location={this.props.paused ? this.props.location : null}
                onToggleBreakpoint={i => this.props.onToggleBreakpoint(i)}
            />
        </div>;
        /*return <div className={this.props.classes.editor}>
            {this.state.lines.map((line, i) => {
                const isStoppedOnLine = this.props.paused && this.props.location &&
                    this.props.sourceId === this.props.location.scriptId &&
                    i === this.props.location.lineNumber;

                const isBreakpoint = this.props.breakpoints.find(bp =>
                    this.props.sourceId === bp.location.scriptId && i === bp.location.lineNumber);

                return <div key={this.props.sourceId + '_' + i} className={this.props.classes.line}>
                    <div className={clsx(this.props.classes.lineNumber, isBreakpoint && this.props.classes.lineBreakpoint)}
                         onClick={() => this.props.toggleBreakpoint(i)}
                    >{i}</div>
                    {isStoppedOnLine ?
                        <div ref={this.refCurrentLine} className={clsx(this.props.classes.lineCode, isStoppedOnLine && this.props.classes.lineCurrent)}>
                            {line.substring(0, this.props.location.columnNumber)}
                            <span className={this.props.classes.lineCurrentCode}>{line.substring(this.props.location.columnNumber)}</span>
                        </div>
                        :
                        <div className={this.props.classes.lineCode}>{line}</div>
                    }
                </div>;
            })}
        </div>;*/
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

export default withStyles(styles)(Editor);
