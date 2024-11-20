import React from 'react';
import ScriptEditorComponent from '../ScriptEditorVanilaMonaco';
import type { AdminConnection, ThemeName, ThemeType } from '@iobroker/adapter-react-v5';

import type { DebuggerLocation, SetBreakpointParameterType } from './types';

const styles: Record<string, React.CSSProperties> = {
    editorDiv: {
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
    },
};

interface EditorProps {
    runningInstances: Record<string, boolean>;
    socket: AdminConnection;
    sourceId: string | null;
    script: string;
    scriptName: string;
    adapterName: string;
    paused: boolean;
    breakpoints: SetBreakpointParameterType[];
    location: DebuggerLocation | null;
    themeType: ThemeType;
    themeName: ThemeName;
    onToggleBreakpoint: (i: number) => void;
}

interface EditorState {
    lines: string[];
}

class Editor extends React.Component<EditorProps, EditorState> {
    constructor(props: EditorProps) {
        super(props);

        this.state = {
            lines: (this.props.script || '').split(/\r\n|\n/),
        };
    }

    render(): React.JSX.Element {
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

export default Editor;
