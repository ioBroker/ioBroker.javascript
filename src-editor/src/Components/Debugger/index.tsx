import React from 'react';
import ReactSplit, { SplitDirection } from '@devbookhq/splitter';

import { Tabs, Tab, Toolbar, LinearProgress, IconButton, Badge, Box } from '@mui/material';

import {
    MdClose as IconClose,
    MdPlayArrow as IconRun,
    MdPause as IconPause,
    MdArrowForward as IconNext,
    MdArrowDownward as IconStep,
    MdArrowUpward as IconOut,
    MdRefresh as IconRestart,
    MdWarning as IconException,
} from 'react-icons/md';

import { type AdminConnection, I18n, type IobTheme, type ThemeName, type ThemeType } from '@iobroker/gui-components';

import DialogError from '../../Dialogs/Error';
import Editor from './Editor';
import Console from './Console';
import Stack from './Stack';
import type {
    CallFrame,
    DebugVariable,
    DebuggerLocation,
    SetBreakpointParameterType,
    DebugCommandToBackEnd,
    DebugCommandFromBackEnd,
    DebugScope,
} from './types';

const styles: Record<string, any> = {
    root: (theme: IobTheme): React.CSSProperties => ({
        width: '100%',
        height: `calc(100% - ${parseInt(theme.toolbar.height as string, 10) + 38 /*Theme.toolbar.height */ + 5}px)`,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
    }),
    toolbar: {
        flexShrink: 0,
        minHeight: 38, //Theme.toolbar.height,
        boxShadow:
            '0px 2px 4px -1px rgba(0, 0, 0, 0.2), 0px 4px 5px 0px rgba(0, 0, 0, 0.14), 0px 1px 10px 0px rgba(0, 0, 0, 0.12)',
    },
    buttonRun: {
        color: 'green',
    },
    buttonPause: {
        color: 'orange',
    },
    buttonRestart: {
        color: 'darkgreen',
    },
    buttonStop: {
        color: 'red',
    },
    buttonNext: {
        color: 'blue',
    },
    buttonStep: {
        color: 'blue',
    },
    buttonOut: {
        color: 'blue',
    },
    buttonException: {},

    tabFile: (theme: IobTheme): React.CSSProperties => ({
        textTransform: 'inherit',
        color: theme.palette.mode === 'dark' ? '#DDD' : 'inherit',
    }),
    tabText: {
        maxWidth: 130,
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        display: 'inline-block',
        verticalAlign: 'middle',
    },
    closeButton: {
        position: 'absolute',
        top: 8,
        right: 0,
        zIndex: 10,
        padding: 8,
        cursor: 'pointer',
    },

    tabsRoot: (theme: IobTheme): React.CSSProperties => ({
        minHeight: 24,
        background: theme.palette.mode === 'dark' ? '#333' : '#e6e6e6',
        color: theme.palette.mode === 'dark' ? 'white' : 'inherit',
    }),
    tabRoot: {
        minHeight: 24,
    },

    splitter: {
        // takes the rest of the height under the toolbar
        flexGrow: 1,
        minHeight: 0,
        width: '100%',
        position: 'relative',
    },
};

interface DebuggerProps {
    src: string;
    themeName: ThemeName;
    themeType: ThemeType;
    adapterName: string;
    socket: AdminConnection;
    debugInstance?: { adapter?: string; instance?: string } | null;
    runningInstances: Record<string, boolean>;
}

interface DebuggerState {
    breakpoints: SetBreakpointParameterType[];
    console: { text: string; severity: ioBroker.LogLevel; ts: number }[];
    context: { callFrames: CallFrame[] } | null;
    currentFrame: number;
    error: string;
    expressions: DebugVariable[];
    finished: boolean;
    instance: string | undefined;
    location: DebuggerLocation | null;
    logErrors: number;
    logWarnings: number;
    logs: number;
    paused: boolean;
    running: boolean;
    scopes: DebugScope[];
    script: string;
    selected: string | null;
    started: boolean;
    starting: boolean;
    stopOnException: boolean;
    tabs: Record<string, string>;
    toolSizes: number[];
    toolsTab: string;
}

class Debugger extends React.Component<DebuggerProps, DebuggerState> {
    private console: { text: string; severity: ioBroker.LogLevel; ts: number }[] | null = null;

    private scripts: Record<string, string> = {};

    private mainScriptId: string | null = null;

    constructor(props: DebuggerProps) {
        super(props);
        const breakpointsStr = window.localStorage.getItem(`javascript.tools.bp.${this.props.src}`);
        let breakpoints;
        try {
            breakpoints = breakpointsStr ? JSON.parse(breakpointsStr) : [];
        } catch {
            breakpoints = [];
        }

        const expressionsStr = window.localStorage.getItem(`javascript.tools.exps.${this.props.src}`);
        let expressions: DebugVariable[];
        try {
            const names = expressionsStr ? (JSON.parse(expressionsStr) as string[]) : [];
            expressions = names.map(name => ({
                name,
                value: { type: 'undefined', description: '', value: 'undefined', name: 'name' },
            }));
        } catch {
            expressions = [];
        }

        const toolSizesStr = window.localStorage.getItem('JS.toolSizes');
        let toolSizes = [80, 20];
        if (toolSizesStr) {
            try {
                toolSizes = JSON.parse(toolSizesStr);
            } catch {
                // ignore
            }
        }

        this.state = {
            starting: true,
            selected: null,
            tabs: {},
            script: '',
            breakpoints,
            expressions,
            running: false,
            error: '',
            started: false,
            paused: true,
            location: null,
            toolsTab: window.localStorage.getItem('javascript.tools.tab') || 'console',
            stopOnException: window.localStorage.getItem('javascript.tools.stopOnException') === 'true',
            console: [],
            finished: false,
            currentFrame: 0,
            scopes: [],
            logErrors: 0,
            logWarnings: 0,
            logs: 0,
            toolSizes,
            instance: undefined,
            context: null,
        };
    }

    async componentDidMount(): Promise<void> {
        let instance: string | undefined;
        if (this.props.debugInstance) {
            instance = this.props.debugInstance.instance;
        } else {
            const obj = await this.props.socket.getObject(this.props.src);
            instance = obj?.common?.engine?.replace('system.adapter.', '') || '';
        }
        if (!instance) {
            this.setState({ error: 'Unknown instance' });
            return;
        }
        await new Promise<void>(resolve => this.setState({ instance }, resolve));
        try {
            // Overwrite the last message of the previous session, so it will not be processed in this session.
            // The subscription delivers this value, and then the debugging will be started (see "subscribed")
            await this.props.socket.setState(`${instance}.debug.from`, { val: '{"cmd": "subscribed"}', ack: true });
            await this.props.socket.subscribeState(`${instance}.debug.from`, this.fromInstance);
        } catch (e) {
            this.setState({ error: `Cannot start debugging: ${e}` });
        }
    }

    componentWillUnmount(): void {
        if (this.state.instance) {
            this.props.socket.unsubscribeState(`${this.state.instance}.debug.from`, this.fromInstance);
            void this.props.socket.sendTo(this.state.instance, 'debugStop');
        }
    }

    sendToInstance(cmd: DebugCommandToBackEnd): void {
        void this.props.socket.setState(`${this.state.instance}.debug.to`, { val: JSON.stringify(cmd), ack: false });
    }

    /**
     * Sets the breakpoints of the previous session again. The script IDs change with every start of the debugger,
     * so the breakpoints of the main script are moved to its current ID. Breakpoints in other scripts are dropped.
     */
    reinitBreakpoints(previousMainScriptId: string | null, cb: () => void): void {
        const breakpoints: DebuggerLocation[] = this.state.breakpoints
            .filter(bp => !previousMainScriptId || bp.location.scriptId === previousMainScriptId)
            .map(bp => ({ ...bp.location, scriptId: this.mainScriptId || '' }));

        this.setState({ breakpoints: [] }, () => {
            if (breakpoints.length) {
                this.sendToInstance({ breakpoints, cmd: 'sb' });
            }
            if (this.state.stopOnException) {
                this.sendToInstance({ cmd: 'stopOnException', state: true });
            }
            cb();
        });
    }

    saveBreakpoints(breakpoints: SetBreakpointParameterType[]): void {
        // Only the breakpoints of the main script can be restored in the next session
        window.localStorage.setItem(
            `javascript.tools.bp.${this.props.src}`,
            JSON.stringify(breakpoints.filter(bp => bp.location.scriptId === this.mainScriptId)),
        );
    }

    static getLocation(context: { callFrames: CallFrame[] } | null | undefined): DebuggerLocation | null {
        return context?.callFrames?.[0]?.location || null;
    }

    static getTabLabel(url: string | undefined, scriptId: string): string {
        if (!url) {
            return scriptId;
        }
        const parts = url.split(/iobroker\.javascript/i);
        return (parts[1] || parts[0]).replace('script.js.', '');
    }

    readCurrentScope(): void {
        const frame = this.state.context?.callFrames?.[this.state.currentFrame];
        if (frame) {
            // the index in the scope chain is required to write the variables
            const scopes = frame.scopeChain
                .map((scope, index) => ({ ...scope, index }))
                .filter(scope => scope.type !== 'global');
            if (scopes.length) {
                this.sendToInstance({ cmd: 'scope', scopes });
            } else if (this.state.scopes.length) {
                this.setState({ scopes: [] });
            }
        }
    }

    readExpressions(i?: number): void {
        if (
            this.state.expressions.length &&
            this.state.context?.callFrames &&
            this.state.context.callFrames[this.state.currentFrame]
        ) {
            if (i !== undefined) {
                this.sendToInstance({
                    cmd: 'expressions',
                    expressions: [this.state.expressions[i]],
                    callFrameId: this.state.context.callFrames[this.state.currentFrame].callFrameId,
                });
            } else {
                this.sendToInstance({
                    cmd: 'expressions',
                    expressions: this.state.expressions,
                    callFrameId: this.state.context.callFrames[this.state.currentFrame].callFrameId,
                });
            }
        }
    }

    fromInstance = (_id: string, state: ioBroker.State | null | undefined): void => {
        if (state?.val && this.state.instance !== undefined) {
            try {
                const data: DebugCommandFromBackEnd = JSON.parse(state.val as string) as DebugCommandFromBackEnd;

                if (data.cmd === 'subscribed') {
                    void this.props.socket.sendTo(
                        this.state.instance,
                        'debug',
                        this.props.debugInstance || { scriptName: this.props.src },
                    );
                } else if (data.cmd === 'readyToDebug') {
                    const previousMainScriptId = this.mainScriptId;
                    this.mainScriptId = data.scriptId;
                    // the script IDs of a previous session are not valid anymore
                    this.scripts = {};
                    this.scripts[data.scriptId] = data.script;
                    if (data.script.startsWith('(async () => {debugger;\n')) {
                        this.scripts[data.scriptId] =
                            `(async () => {\n${data.script.substring('(async () => {debugger;\n'.length)}`;
                    } else if (data.script.startsWith('debugger;')) {
                        this.scripts[data.scriptId] = data.script.substring('debugger;'.length);
                    }

                    const tabs: Record<string, string> = {
                        [data.scriptId]: this.props.debugInstance ? data.url : this.props.src.replace('script.js.', ''),
                    };

                    const ts = `${Date.now()}.${Math.random() * 10000}`;
                    data.context?.callFrames?.forEach((item, i) => (item.id = ts + i));

                    this.setState(
                        {
                            starting: false,
                            finished: false,
                            selected: this.mainScriptId,
                            script: this.scripts[data.scriptId],
                            tabs,
                            currentFrame: 0,
                            started: true,
                            paused: true,
                            location: Debugger.getLocation(data.context),
                            context: data.context,
                        },
                        () =>
                            this.reinitBreakpoints(previousMainScriptId, () => {
                                this.readCurrentScope();
                                this.readExpressions();
                            }),
                    );
                } else if (data.cmd === 'paused') {
                    const ts = `${Date.now()}.${Math.random() * 10000}`;
                    data.context?.callFrames?.forEach((item, i) => (item.id = ts + i));
                    const location = Debugger.getLocation(data.context);

                    const newState: Partial<DebuggerState> = {
                        paused: true,
                        location,
                        currentFrame: 0,
                        context: data.context,
                    };
                    if (location) {
                        if (!this.state.tabs[location.scriptId]) {
                            newState.tabs = {
                                ...this.state.tabs,
                                [location.scriptId]: Debugger.getTabLabel(
                                    data.context.callFrames[0].url,
                                    location.scriptId,
                                ),
                            };
                        }
                        newState.selected = location.scriptId;
                        newState.script =
                            this.scripts[location.scriptId] === undefined
                                ? I18n.t('loading...')
                                : this.scripts[location.scriptId];
                    }

                    this.setState(newState as DebuggerState, () => {
                        this.readCurrentScope();
                        this.readExpressions();
                        if (location && this.scripts[location.scriptId] === undefined) {
                            this.sendToInstance({ cmd: 'source', scriptId: location.scriptId });
                        }
                    });
                } else if (data.cmd === 'script') {
                    this.scripts[data.scriptId] = data.text;
                    if (this.state.selected === data.scriptId) {
                        this.setState({ script: this.scripts[data.scriptId] });
                    }
                } else if (data.cmd === 'resumed') {
                    this.setState({ paused: false });
                } else if (data.cmd === 'log') {
                    if (this.state.toolsTab === 'console') {
                        this.console = null;
                        const console = [...this.state.console];
                        console.push({ text: data.text, severity: data.severity, ts: data.ts });
                        this.setState({ console });
                    } else {
                        if (data.severity === 'error') {
                            this.setState({ logErrors: this.state.logErrors + 1 });
                        } else if (data.severity === 'warn') {
                            this.setState({ logWarnings: this.state.logWarnings + 1 });
                        } else {
                            this.setState({ logs: this.state.logs + 1 });
                        }
                        this.console = this.console || [...this.state.console];
                        this.console.push({ text: data.text, severity: data.severity, ts: data.ts });
                    }
                } else if (data.cmd === 'error') {
                    this.setState({ error: data.error });
                } else if (data.cmd === 'finished' || data.cmd === 'debugStopped') {
                    this.setState({
                        finished: true,
                        starting: false,
                        started: true,
                        paused: false,
                    });
                } else if (data.cmd === 'sb') {
                    const breakpoints: SetBreakpointParameterType[] = [...this.state.breakpoints];
                    let changed = false;
                    data.breakpoints
                        .filter(bp => bp?.location)
                        .forEach(bp => {
                            const found = breakpoints.find(
                                item =>
                                    item.location.scriptId === bp.location.scriptId &&
                                    item.location.lineNumber === bp.location.lineNumber,
                            );
                            if (!found) {
                                changed = true;
                                breakpoints.push(bp);
                            }
                        });
                    if (changed) {
                        this.saveBreakpoints(breakpoints);
                        this.setState({ breakpoints });
                    }
                } else if (data.cmd === 'cb') {
                    const breakpoints = this.state.breakpoints.filter(item => !data.breakpoints.includes(item.id));
                    if (breakpoints.length !== this.state.breakpoints.length) {
                        this.saveBreakpoints(breakpoints);
                        this.setState({ breakpoints });
                    }
                } else if (data.cmd === 'scope') {
                    this.setState({ scopes: data.scopes.filter(scope => scope).sort((a, b) => a.index - b.index) });
                } else if (data.cmd === 'setValue') {
                    // read the values again, as the change can influence the expressions too
                    this.readCurrentScope();
                    this.readExpressions();
                } else if (data.cmd === 'expressions') {
                    // update values
                    const expressions: DebugVariable[] = JSON.parse(JSON.stringify(this.state.expressions));
                    let changed = false;
                    data.expressions.forEach(item => {
                        const expression = expressions.find(it => it.name === item.name);
                        if (expression) {
                            changed = true;
                            expression.value = item.result;
                        }
                    });
                    changed && this.setState({ expressions });
                } else if (data.cmd === 'getPossibleBreakpoints') {
                    if (data.breakpoints?.length) {
                        // Like other debuggers, set the breakpoint on the first possible position of the line
                        this.sendToInstance({ breakpoints: [data.breakpoints[0]], cmd: 'sb' });
                    } else {
                        this.setState({ error: I18n.t('No breakpoint possible on this line') });
                    }
                } else {
                    console.error(`Unknown command: ${JSON.stringify(data)}`);
                }
            } catch (e) {
                console.error(`Cannot process message from debugger: ${e}`);
            }
        }
    };

    /** Show the position and the variables of the selected call frame */
    selectFrame(i: number): void {
        const frame = this.state.context?.callFrames?.[i];
        if (!frame) {
            return;
        }
        const location = frame.location;
        const loaded = this.scripts[location.scriptId] !== undefined;
        const newState: Partial<DebuggerState> = {
            currentFrame: i,
            scopes: [],
            location,
            selected: location.scriptId,
            script: loaded ? this.scripts[location.scriptId] : I18n.t('loading...'),
        };
        if (!this.state.tabs[location.scriptId]) {
            newState.tabs = {
                ...this.state.tabs,
                [location.scriptId]: Debugger.getTabLabel(frame.url, location.scriptId),
            };
        }
        this.setState(newState as DebuggerState, () => {
            this.readCurrentScope();
            this.readExpressions();
            if (!loaded) {
                this.sendToInstance({ cmd: 'source', scriptId: location.scriptId });
            }
        });
    }

    renderError(): React.JSX.Element | null {
        if (this.state.error) {
            return (
                <DialogError
                    key="dialogError"
                    onClose={() => this.setState({ error: '' })}
                    text={this.state.error}
                />
            );
        }
        return null;
    }

    closeTab(id: string, e?: React.MouseEvent): void {
        e?.stopPropagation();
        const tabs = JSON.parse(JSON.stringify(this.state.tabs));
        delete tabs[id];
        const newState: Partial<DebuggerState> = {
            tabs,
            script: this.mainScriptId ? this.scripts[this.mainScriptId] : '...',
            selected: this.mainScriptId,
        };
        if (this.state.location && this.state.location.scriptId !== this.mainScriptId) {
            newState.location = null;
        }
        this.setState(newState as DebuggerState);
    }

    renderTabs(): React.JSX.Element {
        const disabled = !this.state.tabs || !this.state.started;
        return (
            <Tabs
                component={'div'}
                indicatorColor="primary"
                style={{ position: 'relative', width: 'calc(100% - 300px)', display: 'inline-block' }}
                value={this.state.selected}
                onChange={(event, value) => {
                    if (this.scripts[value]) {
                        this.setState({ selected: value, script: this.scripts[value] });
                    } else {
                        this.setState({ selected: value, script: 'loading...' }, () =>
                            this.sendToInstance({ cmd: 'source', scriptId: value }),
                        );
                    }
                }}
                scrollButtons="auto"
            >
                {Object.keys(this.state.tabs || []).map(id => {
                    let label = id;
                    const title = this.state.tabs[id] || '';
                    if (this.state.tabs[id]) {
                        label = this.state.tabs[id].split('/').pop() || '';
                    }
                    const labelEl = [
                        <div
                            key="text"
                            style={styles.tabText}
                        >
                            {label}
                        </div>,
                        id !== this.mainScriptId ? (
                            <span
                                key="icon"
                                style={styles.closeButton}
                            >
                                <IconClose
                                    key="close"
                                    onClick={e => this.closeTab(id, e)}
                                    fontSize="small"
                                />
                            </span>
                        ) : null,
                    ];

                    return (
                        <Tab
                            disabled={disabled}
                            sx={styles.tabFile}
                            label={labelEl}
                            title={title}
                            key={id}
                            value={id}
                        />
                    );
                })}
            </Tabs>
        );
    }

    onResume(): void {
        this.sendToInstance({ cmd: 'cont' });
    }

    onPause(): void {
        this.sendToInstance({ cmd: 'pause' });
    }

    onNext(): void {
        this.sendToInstance({ cmd: 'next' });
    }

    onStepIn(): void {
        this.sendToInstance({ cmd: 'step' });
    }

    onStepOut(): void {
        this.sendToInstance({ cmd: 'out' });
    }

    onRestart(): void {
        this.setState(
            { started: false, starting: true },
            () =>
                this.state.instance !== undefined &&
                this.props.socket.sendTo(
                    this.state.instance,
                    'debug',
                    this.props.debugInstance || { scriptName: this.props.src },
                ),
        );
    }

    onToggleException(): void {
        const stopOnException = !this.state.stopOnException;
        window.localStorage.setItem('javascript.tools.stopOnException', stopOnException ? 'true' : 'false');
        this.setState({ stopOnException }, () =>
            this.sendToInstance({ cmd: 'stopOnException', state: stopOnException }),
        );
    }

    renderToolbar(): React.JSX.Element {
        const disabled = !this.state.started;
        return (
            <Toolbar
                variant="dense"
                style={styles.toolbar}
                key="toolbar1"
            >
                <IconButton
                    style={styles.buttonRestart}
                    disabled={disabled}
                    onClick={() => this.onRestart()}
                    title={I18n.t('Restart')}
                    size="medium"
                >
                    <IconRestart />
                </IconButton>
                {!this.state.finished && this.state.paused ? (
                    <IconButton
                        style={styles.buttonRun}
                        disabled={disabled}
                        onClick={() => this.onResume()}
                        title={I18n.t('Resume execution')}
                        size="medium"
                    >
                        <IconRun />
                    </IconButton>
                ) : (
                    !this.state.finished && (
                        <IconButton
                            disabled={disabled}
                            style={styles.buttonPause}
                            onClick={() => this.onPause()}
                            title={I18n.t('Pause execution')}
                            size="medium"
                        >
                            <IconPause />
                        </IconButton>
                    )
                )}
                {!this.state.finished && (
                    <IconButton
                        style={styles.buttonNext}
                        disabled={disabled || !this.state.paused}
                        onClick={() => this.onNext()}
                        title={I18n.t('Go to next line')}
                        size="medium"
                    >
                        <IconNext />
                    </IconButton>
                )}
                {!this.state.finished && (
                    <IconButton
                        style={styles.buttonStep}
                        disabled={disabled || !this.state.paused}
                        onClick={() => this.onStepIn()}
                        title={I18n.t('Step into function')}
                        size="medium"
                    >
                        <IconStep />
                    </IconButton>
                )}
                {!this.state.finished && (
                    <IconButton
                        style={styles.buttonOut}
                        disabled={disabled || !this.state.paused}
                        onClick={() => this.onStepOut()}
                        title={I18n.t('Step out from function')}
                        size="medium"
                    >
                        <IconOut />
                    </IconButton>
                )}
                {!this.state.finished && (
                    <IconButton
                        style={styles.buttonException}
                        color={this.state.stopOnException ? 'primary' : 'default'}
                        disabled={disabled}
                        onClick={() => this.onToggleException()}
                        title={I18n.t('Stop on exception')}
                        size="medium"
                    >
                        <IconException />
                    </IconButton>
                )}
                {this.renderTabs()}
            </Toolbar>
        );
    }

    getPossibleBreakpoints(bp: DebuggerLocation): void {
        const end = { ...bp, columnNumber: 1000 };
        this.sendToInstance({ cmd: 'getPossibleBreakpoints', start: bp, end });
    }

    toggleBreakpoint(lineNumber: number): void {
        const bp: SetBreakpointParameterType | undefined = this.state.breakpoints.find(
            item => item.location.scriptId === this.state.selected && item.location.lineNumber === lineNumber,
        );
        if (bp) {
            const breakpoints = JSON.parse(JSON.stringify(this.state.breakpoints));
            this.setState({ breakpoints }, () => this.sendToInstance({ breakpoints: [bp.id], cmd: 'cb' }));
        } else {
            this.getPossibleBreakpoints({
                scriptId: this.state.selected,
                lineNumber,
                columnNumber: 0,
            } as DebuggerLocation);
        }
    }

    renderCode(): React.JSX.Element | null {
        if (this.state.script && this.state.started) {
            const breakpoints = this.state.breakpoints.filter(bp => bp.location.scriptId === this.state.selected);

            return (
                <Editor
                    runningInstances={this.props.runningInstances}
                    socket={this.props.socket}
                    adapterName={this.props.adapterName}
                    scriptName={this.state.selected ? this.state.tabs[this.state.selected] : ''}
                    sourceId={this.state.selected}
                    script={this.state.script}
                    paused={this.state.paused}
                    breakpoints={breakpoints}
                    location={this.state.location?.scriptId === this.state.selected ? this.state.location : null}
                    themeType={this.props.themeType}
                    themeName={this.props.themeName}
                    onToggleBreakpoint={i => this.toggleBreakpoint(i)}
                />
            );
        }
        return null;
    }

    renderFrames(): React.JSX.Element | null {
        if (!this.state.paused) {
            return null;
        }

        return (
            <Stack
                currentScriptId={this.state.selected}
                scopes={this.state.scopes}
                expressions={this.state.expressions}
                themeType={this.props.themeType}
                callFrames={this.state.context?.callFrames}
                currentFrame={this.state.currentFrame}
                onChangeCurrentFrame={i => this.selectFrame(i)}
                onWriteScopeValue={obj => {
                    this.sendToInstance({
                        cmd: 'setValue',
                        variableName: obj.variableName,
                        scopeNumber: obj.scopeNumber,
                        newValue: obj.newValue,
                        callFrameId: obj.callFrameId,
                    });
                }}
                onExpressionDelete={i => {
                    const expressions: DebugVariable[] = JSON.parse(JSON.stringify(this.state.expressions));
                    expressions.splice(i, 1);
                    this.setState({ expressions });
                    window.localStorage.setItem(
                        `javascript.tools.exps.${this.props.src}`,
                        JSON.stringify(expressions.map(item => item.name)),
                    );
                }}
                onExpressionAdd={cb => {
                    const expressions = JSON.parse(JSON.stringify(this.state.expressions));
                    expressions.push({ name: '', value: { value: '' } });
                    this.setState(
                        { expressions },
                        () => cb && cb(expressions.length - 1, this.state.expressions[expressions.length - 1]),
                    );
                }}
                onExpressionNameUpdate={(i, name, cb) => {
                    const expressions: DebugVariable[] = JSON.parse(JSON.stringify(this.state.expressions));
                    if (!name) {
                        expressions.splice(i, 1);
                    } else if (expressions.find(item => item.name === name)) {
                        return cb && cb();
                    } else {
                        expressions[i].name = name;
                    }

                    this.setState({ expressions }, () => {
                        name && this.readExpressions(i);
                        cb && cb();
                    });
                    window.localStorage.setItem(
                        `javascript.tools.exps.${this.props.src}`,
                        JSON.stringify(expressions.map(item => item.name)),
                    );
                }}
            />
        );
    }

    renderConsole(): React.JSX.Element {
        return (
            <Console
                console={this.state.console}
                onClearAllLogs={() =>
                    this.setState({
                        console: [],
                        logErrors: 0,
                        logWarnings: 0,
                        logs: 0,
                    })
                }
            />
        );
    }

    renderTools(): React.JSX.Element {
        const disabled = !this.state.tabs || !this.state.started;

        let _console;
        if (this.state.logErrors) {
            _console = (
                <Badge
                    badgeContent={this.state.logErrors}
                    color="error"
                >
                    <span>{I18n.t('Console')}</span>
                </Badge>
            );
        } else if (this.state.logWarnings) {
            _console = (
                <Badge
                    badgeContent={this.state.logWarnings}
                    color="secondary"
                >
                    <span>{I18n.t('Console')}</span>
                </Badge>
            );
        } else if (this.state.logs) {
            _console = (
                <Badge
                    badgeContent={this.state.logs}
                    color="default"
                >
                    <span>{I18n.t('Console')}</span>
                </Badge>
            );
        } else {
            _console = I18n.t('Console');
        }

        return (
            <div
                style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
                <Tabs
                    sx={styles.tabsRoot}
                    component="div"
                    indicatorColor="primary"
                    style={{ position: 'relative', width: '100%' }}
                    value={this.state.toolsTab}
                    onChange={(event, value) => {
                        const newState: Partial<DebuggerState> = { toolsTab: value };

                        // load logs from buffer
                        if (this.console && value === 'console') {
                            newState.console = this.console;
                            this.console = null;
                            newState.logs = 0;
                            newState.logWarnings = 0;
                            newState.logErrors = 0;
                        }

                        window.localStorage.setItem('javascript.tools.tab', value);

                        this.setState(newState as DebuggerState);
                    }}
                    scrollButtons="auto"
                >
                    <Tab
                        style={styles.tabRoot}
                        disabled={disabled}
                        label={I18n.t('Stack')}
                        value="stack"
                    />
                    <Tab
                        style={styles.tabRoot}
                        disabled={disabled}
                        label={_console}
                        value="console"
                    />
                </Tabs>
                <div style={{ width: '100%', flexGrow: 1, minHeight: 0, overflow: 'hidden' }}>
                    {this.state.toolsTab === 'stack' && !disabled ? this.renderFrames() : null}
                    {this.state.toolsTab === 'console' && !disabled ? this.renderConsole() : null}
                </div>
            </div>
        );
    }

    render(): React.JSX.Element {
        return (
            <Box
                key="debugger"
                sx={styles.root}
            >
                {this.state.starting ? <LinearProgress /> : null}
                {this.renderToolbar()}
                <div style={styles.splitter}>
                    <ReactSplit
                        direction={SplitDirection.Vertical}
                        initialSizes={this.state.toolSizes}
                        minHeights={[100, 100]}
                        onResizeFinished={(_gutterIdx, toolSizes) => {
                            this.setState({ toolSizes });
                            window.localStorage.setItem('JS.toolSizes', JSON.stringify(toolSizes));
                        }}
                        gutterClassName={this.props.themeType === 'dark' ? 'Dark visGutter' : 'Light visGutter'}
                    >
                        <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>{this.renderCode()}</div>
                        <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>{this.renderTools()}</div>
                    </ReactSplit>
                </div>
                {this.renderError()}
            </Box>
        );
    }
}

export default Debugger;
