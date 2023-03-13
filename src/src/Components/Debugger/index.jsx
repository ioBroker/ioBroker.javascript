import React from 'react';
import PropTypes from 'prop-types';
import withStyles from '@mui/styles/withStyles';
import SplitterLayout from 'react-splitter-layout';

import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Toolbar from '@mui/material/Toolbar';
import LinearProgress from '@mui/material/LinearProgress';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import Badge from '@mui/material/Badge';

import { MdClose as IconClose, MdPlayArrow as IconRun } from 'react-icons/md';
import { MdPause as IconPause } from 'react-icons/md';
import { MdArrowForward as IconNext } from 'react-icons/md';
import { MdArrowDownward as IconStep } from 'react-icons/md';
import { MdArrowUpward as IconOut } from 'react-icons/md';
import { MdRefresh as IconRestart } from 'react-icons/md';
import { MdWarning as IconException } from 'react-icons/md';

import { I18n, Utils } from '@iobroker/adapter-react-v5';

import DialogError from '../../Dialogs/Error';
import Editor from './Editor';
import Console from './Console';
import Stack from './Stack';

const styles = theme => ({
    root: {
        width: '100%',
        height: `calc(100% - ${theme.toolbar.height + 38/*Theme.toolbar.height */ + 5}px)`,
        overflow: 'hidden',
        position: 'relative'
    },
    toolbar: {
        minHeight: 38,//Theme.toolbar.height,
        boxShadow: '0px 2px 4px -1px rgba(0, 0, 0, 0.2), 0px 4px 5px 0px rgba(0, 0, 0, 0.14), 0px 1px 10px 0px rgba(0, 0, 0, 0.12)'
    },
    buttonRun: {
        color: 'green'
    },
    buttonPause: {
        color: 'orange'
    },
    buttonRestart: {
        color: 'darkgreen'
    },
    buttonStop: {
        color: 'red'
    },
    buttonNext: {
        color: 'blue'
    },
    buttonStep: {
        color: 'blue'
    },
    buttonOut: {
        color: 'blue'
    },
    buttonException: {

    },

    tabFile: {
        textTransform: 'inherit',
        color: theme.palette.mode === 'dark' ? '#DDD' : 'inherit'
    },
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
        cursor: 'pointer'
    },

    tabsRoot: {
        minHeight: 24,
        background: theme.palette.mode === 'dark' ? '#333' : '#e6e6e6',
        color: theme.palette.mode === 'dark' ? 'white' : 'inherit'
    },
    tabRoot: {
        minHeight: 24,
    },

    bpListItem: {
        borderTop: '1px dashed #bfbfbf44',
    },
    monospace: {
        fontFamily: 'Courier New, monospace',
        whiteSpace: 'pre',
        fontSize: 12,
    },
    arrow: {
        color: '#fffa4f',
    },
    splitter: {
        height: 'calc(100% - 52px)',
        '& .layout-pane': {
            overflow: 'hidden',
            height: '100%'
        }
    }
});

class Debugger extends React.Component {
    constructor(props) {
        super(props);
        let breakpoints = window.localStorage.getItem('javascript.tools.bp.' + this.props.src);
        try {
            breakpoints = breakpoints ? JSON.parse(breakpoints) : [];
        } catch (e) {
            breakpoints = [];
        }

        let expressions = window.localStorage.getItem('javascript.tools.exps.' + this.props.src);
        try {
            expressions = expressions ? JSON.parse(expressions) : [];
            expressions = expressions.map(name => ({name}));
        } catch (e) {
            expressions = [];
        }

        this.toolSize = window.localStorage ? parseFloat(window.localStorage.getItem('App.toolSize')) || 150 : 150;

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
            scopes: {},
            queryBreakpoints: null,
            logErrors: 0,
            logWarnings: 0,
            logs: 0,
        };

        this.scripts = {};
        this.mainScriptId = null;
    }

    componentDidMount() {
        new Promise(resolve => {
            if (this.props.debugInstance) {
                resolve(this.props.debugInstance.instance);
            } else {
                this.props.socket.getObject(this.props.src)
                    .then(obj => resolve(obj?.common?.engine?.replace('system.adapter.', '')));
            }
        })
            .then(instance =>
                this.setState({ instance }, () => {
                    if (this.state.instance) {
                        this.props.socket.setState(`${this.state.instance}.debug.from`, { val: '{"cmd": "subscribed"}', ack: true });
                        //.then(() => );
                        setTimeout(() =>
                            this.props.socket.subscribeState(`${this.state.instance}.debug.from`, this.fromInstance), 200);
                    } else {
                        this.setState({ error: 'Unknown instance' });
                    }
                }));
    }

    componentWillUnmount() {
        if (this.state.instance) {
            this.props.socket.unsubscribeState(`${this.state.instance}.debug.from`, this.fromInstance);
            this.props.socket.sendTo(this.state.instance, 'debugStop');
        }
    }

    sendToInstance(cmd) {
        this.props.socket.setState(`${this.state.instance}.debug.to`, { val: JSON.stringify(cmd), ack: false });
    }

    reinitBreakpoints(cb) {
        if (this.state.breakpoints.length) {
            let breakpoints = JSON.parse(JSON.stringify(this.state.breakpoints));
            breakpoints = breakpoints.map(item => item.location);
            this.setState({breakpoints: []}, () => {
                this.sendToInstance({breakpoints, cmd: 'sb'});
                if (this.state.stopOnException) {
                    this.sendToInstance({cmd: 'stopOnException', state: true});
                }

                cb && cb();
            });
        } else if (this.state.stopOnException) {
            this.sendToInstance({cmd: 'stopOnException', state: true});
            cb && cb();
        } else {
            cb && cb();
        }
    }

    getLocation(context) {
        if (context.callFrames) {
            const frame = context.callFrames[0];
            return frame.location;
        }
    }

    readCurrentScope() {
        const frame = this.state.context?.callFrames && this.state.context.callFrames[this.state.currentFrame];
        if (frame) {
            const scopes = frame.scopeChain.filter(scope => scope.type !== 'global');
            if (scopes.length) {
                this.sendToInstance({cmd: 'scope', scopes});
            } else if (this.state.scopes.global || this.state.scopes.local || this.state.scopes.closure) {
                this.setState({scopes: {}});
            }
        }
    }

    readExpressions(i) {
        if (this.state.expressions.length && this.state.context?.callFrames && this.state.context.callFrames[this.state.currentFrame]) {
            if (i !== undefined) {
                this.sendToInstance({
                    cmd: 'expressions',
                    expressions: [this.state.expressions[i]],
                    callFrameId: this.state.context.callFrames[this.state.currentFrame].callFrameId
                });
            } else {
                this.sendToInstance({
                    cmd: 'expressions',
                    expressions: this.state.expressions,
                    callFrameId: this.state.context.callFrames[this.state.currentFrame].callFrameId
                });
            }
        }
    }

    fromInstance = (id, state) => {
        try {
            const data = JSON.parse(state.val);
            if (data.cmd === 'subscribed') {
                this.props.socket.sendTo(this.state.instance, 'debug', this.props.debugInstance || {scriptName: this.props.src});
            } else
            if (data.cmd === 'readyToDebug') {
                this.mainScriptId = data.scriptId;
                this.scripts[data.scriptId] = data.script;
                if (data.script.startsWith('(async () => {debugger;\n')) {
                    this.scripts[data.scriptId] = `(async () => {\n${data.script.substring('(async () => {debugger;\n'.length)}`;
                } else if (data.script.startsWith('debugger;')) {
                    this.scripts[data.scriptId] = data.script.substring('debugger;'.length);
                }

                const tabs = JSON.parse(JSON.stringify(this.state.tabs));
                tabs[data.scriptId] = this.props.debugInstance ? data.url: this.props.src.replace('script.js.', '');

                const ts = `${Date.now()}.${Math.random() * 10000}`;
                data.context?.callFrames && data.context.callFrames.forEach((item, i) => item.id = ts + i);

                this.setState({
                    starting: false,
                    finished: false,
                    selected: this.mainScriptId,
                    script: this.scripts[data.scriptId],
                    tabs,
                    currentFrame: 0,
                    started: true,
                    paused: true,
                    location: this.getLocation(data.context),
                    context: data.context,
                }, () =>
                    this.reinitBreakpoints(() => {
                        this.readCurrentScope();
                        this.readExpressions();
                    }));
            } else if (data.cmd === 'paused') {
                const ts = `${Date.now()}.${Math.random() * 10000}`;
                data.context?.callFrames && data.context.callFrames.forEach((item, i) => item.id = ts + i);
                const location = this.getLocation(data.context);
                const tabs = JSON.parse(JSON.stringify(this.state.tabs));
                const parts = data.context.callFrames[0].url.split('iobroker.javascript');
                tabs[location.scriptId] = (parts[1] || parts[0]).replace('script.js.', '');

                const newState = {
                    tabs,
                    paused: true,
                    location,
                    currentFrame: 0,
                    context: data.context,
                    scope: {id: (data.context?.callFrames && data.context.callFrames[0] && data.context.callFrames[0].id) || 0}
                };

                newState.script = this.scripts[location.scriptId] === undefined ? I18n.t('loading...') : this.scripts[location.scriptId];
                newState.selected = location.scriptId;

                this.setState(newState, () => {
                    this.readCurrentScope();
                    this.readExpressions();
                    if (!this.scripts[location.scriptId]) {
                        this.sendToInstance({cmd: 'source', scriptId: location.scriptId});
                    }
                });
            } else if (data.cmd === 'script') {
                this.scripts[data.scriptId] = data.text;
                if (this.state.selected === data.scriptId) {
                    this.setState({script: this.scripts[data.scriptId]});
                }
            } else if (data.cmd === 'resumed') {
                this.setState({paused: false});
            } else if (data.cmd === 'log') {
                if (this.state.toolsTab === 'console') {
                    this.console = null;
                    const console = [...this.state.console];
                    console.push({text: data.text, severity: data.severity, ts: data.ts});
                    this.setState({console});
                } else {
                    if (data.severity === 'error') {
                        this.setState({logErrors: this.state.logErrors + 1});
                    } else if (data.severity === 'warn') {
                        this.setState({logWarnings: this.state.logWarnings + 1});
                    } else {
                        this.setState({logs: this.state.logs + 1});
                    }
                    this.console = this.console || [...this.state.console];
                    this.console.push({text: data.text, severity: data.severity, ts: data.ts});
                }
            } else if (data.cmd === 'error') {
                this.setState({error: data.error});
            } else if (data.cmd === 'finished' || data.cmd === 'debugStopped') {
                this.setState({
                    finished: true,
                    starting: false,
                    started: true,
                });
            } else if (data.cmd === 'sb') {
                const breakpoints = JSON.parse(JSON.stringify(this.state.breakpoints));
                let changed = false;
                data.breakpoints.filter(bp => bp).forEach(bp => {
                    const found = breakpoints.find(item =>
                        item.location.scriptId === bp.location.scriptId && item.location.lineNumber === bp.location.lineNumber);
                    if (!found) {
                        changed = true;
                        breakpoints.push(bp);
                    }
                });
                changed && window.localStorage.setItem('javascript.tools.bp.' + this.props.src, JSON.stringify(breakpoints));
                changed && this.setState({breakpoints});
            } else if (data.cmd === 'cb') {
                const breakpoints = JSON.parse(JSON.stringify(this.state.breakpoints));
                let changed = false;

                data.breakpoints.filter(id => id !== undefined && id !== null).forEach(id => {
                    const found = breakpoints.find(item => item.id === id);
                    if (found) {
                        const pos = breakpoints.indexOf(found);
                        breakpoints.splice(pos, 1);
                        changed = true;
                    }
                });
                changed && window.localStorage.setItem('javascript.tools.bp.' + this.props.src, JSON.stringify(breakpoints));
                changed && this.setState({breakpoints});
            } else if (data.cmd === 'scope') {
                //const global = data.scopes.find(scope => scope.type === 'global') || null;
                const local = data.scopes.find(scope => scope.type === 'local') || null;
                const closure = data.scopes.find(scope => scope.type === 'closure') || null;

                console.log(JSON.stringify(closure));

                this.setState({scopes: {local, closure, id: `${this.state.scope.id}_${this.state.currentFrame}`}});
            } else if (data.cmd === 'setValue') {
                const scopes = JSON.parse(JSON.stringify(this.state.scopes));
                let item;
                if (data.scopeNumber === 0) {
                    item = scopes.local && scopes.local.properties && scopes.local.properties.result && scopes.local.properties.result.find(item => item.name === data.variableName);
                } else {
                    item = scopes.closure && scopes.closure.properties && scopes.closure.properties.result && scopes.closure.properties.result && scopes.closure.properties.result.find(item => item.name === data.variableName);
                }
                if (item) {
                    item.value.value = data.newValue.value;
                    this.setState({scopes});
                }
            } else if (data.cmd === 'expressions') {
                // update values
                let expressions = JSON.parse(JSON.stringify(this.state.expressions));
                let changed = false;
                data.expressions.forEach(item => {
                    const expression = expressions.find(it => it.name === item.name);
                    if (expression) {
                        changed = true;
                        expression.value = item.result;
                    }
                });
                changed && this.setState({expressions});

                console.log('expressions: ' + JSON.stringify(data));
            } else if (data.cmd === 'getPossibleBreakpoints') {
                if (data.breakpoints?.locations?.length === 1) {
                    this.sendToInstance({breakpoints: data.breakpoints.locations, cmd: 'sb'});
                } else if (!data.breakpoints?.locations?.length) {
                    window.alert('cannot set');
                } else {
                    this.setState({queryBreakpoints: data.breakpoints.locations});
                }
            } else {
                console.error(`Unknown command: ${JSON.stringify(data)}`);
            }
        } catch (e) {

        }
    }

    getTextAtLocation(location) {
        let line = this.state.script.split(/\r\n|\n/)[location.lineNumber];
        let arrow = '';
        if (location.columnNumber >= 10) {
            line = line.substring(location.columnNumber - 10, location.columnNumber + 20);
            arrow = ''.padStart(10, ' ') + '↑';
        } else {
            line = line.substring(0, 30 - location.columnNumber);
            arrow = ''.padStart(location.columnNumber, ' ') + '↑';
        }
        return [
            <div key="line" className={this.props.classes.monospace}>{line}</div>,
            <div key="arrow" className={Utils.clsx(this.props.classes.monospace, this.props.classes.arrow)}>{arrow}</div>
        ];
    }

    renderQueryBreakpoints() {
        if (this.state.queryBreakpoints) {
            return <Dialog onClose={() => this.setState({ queryBreakpoints: null })} aria-labelledby="bp-dialog-title" open={!0}>
                <DialogTitle id="bp-dialog-title">{I18n.t('Select breakpoint')}</DialogTitle>
                <List>
                    {this.state.queryBreakpoints.map((bp, i) => (
                        <ListItemButton
                            classes={{root: this.props.classes.bpListItem}}
                            dense
                            onClick={() => {
                                this.sendToInstance({breakpoints: [bp], cmd: 'sb'});
                                this.setState({queryBreakpoints: null})
                            }}
                            key={i}>
                            <ListItemText
                                classes={{primary: this.props.classes.bpListPrimary, secondary: this.props.classes.bpListSecondary}}
                                primary={this.getTextAtLocation(bp)}
                            />
                        </ListItemButton>
                    ))}
                </List>
            </Dialog>;
        } else {
            return null;
        }
    }

    renderError() {
        if (this.state.error) {
            return <DialogError key="dialogError" onClose={() => this.setState({ error: '' })} text={this.state.error} />;
        } else {
            return null;
        }
    }

    closeTab(id, e) {
        e && e.stopPropagation();
        const tabs = JSON.parse(JSON.stringify(this.state.tabs));
        delete tabs[id];
        const newState = {tabs, script: this.scripts[this.mainScriptId], selected: this.mainScriptId};
        if (this.state.location && this.state.location.scriptId !== this.mainScriptId) {
            newState.location = null;
        }
        this.setState(newState);
    }

    renderTabs() {
        const disabled = !this.state.tabs || !this.state.started;
        return <Tabs
            component={'div'}
            indicatorColor="primary"
            style={{ position: 'relative', width: 'calc(100% - 300px)', display: 'inline-block' }}
            value={this.state.selected}
            onChange={(event, value) => {
                if (this.scripts[value]) {
                    this.setState({selected: value, script: this.scripts[value]});
                } else {
                    this.setState({selected: value, script: 'loading...'}, () =>
                        this.sendToInstance({cmd: 'source', scriptId: value}));
                }
            }}
            scrollButtons="auto"
        >
            {Object.keys(this.state.tabs || [])
                .map(id => {
                    let label = id;
                    let title = this.state.tabs[id] || '';
                    if (this.state.tabs[id]) {
                        label = this.state.tabs[id].split('/').pop();
                    }
                    label = [
                        <div key="text" className={Utils.clsx(this.props.classes.tabText)}>{label}</div>,
                        id !== this.mainScriptId && <span key="icon" className={this.props.classes.closeButton}>
                            <IconClose key="close" onClick={e => this.closeTab(id, e)} fontSize="small" /></span>];

                    return <Tab disabled={disabled} classes={{root: this.props.classes.tabFile}} label={label} title={title} key={id} value={id}/>;
                })}
        </Tabs>;
    }

    onResume() {
        this.sendToInstance({cmd: 'cont'});
    }

    onPause() {
        this.sendToInstance({cmd: 'pause'});
    }

    onNext() {
        this.sendToInstance({cmd: 'next'});
    }

    onStepIn() {
        this.sendToInstance({cmd: 'step'});
    }

    onStepOut() {
        this.sendToInstance({cmd: 'out'});
    }

    onRestart() {
        this.setState({started: false, starting: true}, () =>
            this.props.socket.sendTo(this.state.instance, 'debug', this.props.debugInstance || {scriptName: this.props.src}));
    }

    onToggleException() {
        const stopOnException = !this.state.stopOnException;
        window.localStorage.setItem('javascript.tools.stopOnException', stopOnException ? 'true' : 'false');
        this.setState({stopOnException}, () =>
            this.sendToInstance({cmd: 'stopOnException', state: stopOnException}));
    }

    renderToolbar() {
        const disabled = !this.state.started;
        return (
            <Toolbar variant="dense" className={this.props.classes.toolbar} key="toolbar1">
                <IconButton
                    className={this.props.classes.buttonRestart}
                    disabled={disabled}
                    onClick={() => this.onRestart()}
                    title={I18n.t('Restart')}
                    size="medium"><IconRestart/></IconButton>
                {
                    !this.state.finished && this.state.paused ?
                        <IconButton
                            className={this.props.classes.buttonRun}
                            disabled={disabled}
                            onClick={() => this.onResume()}
                            title={I18n.t('Resume execution')}
                            size="medium"><IconRun/></IconButton>
                        :
                        !this.state.finished && <IconButton
                            disabled={disabled}
                            className={this.props.classes.buttonPause}
                            onClick={() => this.onPause()}
                            title={I18n.t('Pause execution')}
                            size="medium"><IconPause/></IconButton>
                }
                {!this.state.finished && <IconButton
                    className={this.props.classes.buttonNext}
                    disabled={disabled || !this.state.paused}
                    onClick={() => this.onNext()}
                    title={I18n.t('Go to next line')}
                    size="medium"><IconNext/></IconButton>}
                {!this.state.finished && <IconButton
                    className={this.props.classes.buttonStep}
                    disabled={disabled || !this.state.paused}
                    onClick={() => this.onStepIn()}
                    title={I18n.t('Step into function')}
                    size="medium"><IconStep/></IconButton>}
                {!this.state.finished && <IconButton
                    className={this.props.classes.buttonOut}
                    disabled={disabled || !this.state.paused}
                    onClick={() => this.onStepOut()}
                    title={I18n.t('Step out from function')}
                    size="medium"><IconOut/></IconButton>}
                {!this.state.finished && <IconButton
                    className={this.props.classes.buttonException}
                    color={this.state.stopOnException ? 'primary' : 'default'}
                    disabled={disabled || !this.state.paused}
                    onClick={() => this.onToggleException()}
                    title={I18n.t('Stop on exception')}
                    size="medium"><IconException/></IconButton>}
                {this.renderTabs()}
            </Toolbar>
        );
    }

    getPossibleBreakpoints(bp) {
        const end = {...bp, columnNumber: 1000};
        this.sendToInstance({cmd: 'getPossibleBreakpoints', start: bp, end});
    }

    toggleBreakpoint(lineNumber) {
        let bp = this.state.breakpoints.find(item => item.location.scriptId === this.state.selected && item.location.lineNumber === lineNumber);
        if (bp) {
            const breakpoints = JSON.parse(JSON.stringify(this.state.breakpoints));
            this.setState({breakpoints}, () =>
                this.sendToInstance({breakpoints: [bp.id], cmd: 'cb'}));
        } else {
            bp = {scriptId: this.state.selected, lineNumber, columnNumber: 0};
            this.getPossibleBreakpoints(bp);
        }
    }

    renderCode() {
        if (this.state.script && this.state.started) {
            const breakpoints = this.state.breakpoints.filter(bp => bp.location.scriptId === this.state.selected);

            return <Editor
                runningInstances={this.props.runningInstances}
                socket={this.props.socket}
                adapterName={this.props.adapterName}
                scriptName={this.state.tabs[this.state.selected]}
                sourceId={this.state.selected}
                script={this.state.script}
                paused={this.state.paused}
                breakpoints={breakpoints}
                location={this.state.location}
                themeType={this.props.themeType}
                themeName={this.props.themeName}
                onToggleBreakpoint={i => this.toggleBreakpoint(i)}
            />
        }
    }

    renderFrames() {
        if (!this.state.paused) {
            return null;
        }

        return <Stack
            currentScriptId={this.state.selected}
            scopes={this.state.scopes}
            expressions={this.state.expressions}
            themeType={this.props.themeType}
            callFrames={this.state.context?.callFrames}
            currentFrame={this.state.currentFrame}
            onChangeCurrentFrame={i => {
                this.setState({currentFrame: i, scopes: {}}, () => {
                    this.readCurrentScope();
                    this.readExpressions();
                })
            }}
            onWriteScopeValue={obj => {
                this.sendToInstance({
                    cmd: 'setValue',
                    variableName: obj.variableName,
                    scopeNumber: obj.scopeNumber,
                    newValue: obj.newValue,
                    callFrameId: obj.callFrameId
                });
            }}
            onExpressionDelete={i => {
                const expressions = JSON.parse(JSON.stringify(this.state.expressions));
                expressions.splice(i, 1);
                this.setState({expressions});
                window.localStorage.setItem('javascript.tools.exps.' + this.props.src, JSON.stringify(expressions.map(item => item.name)));
            }}
            onExpressionAdd={cb => {
                const expressions = JSON.parse(JSON.stringify(this.state.expressions));
                expressions.push({name: '', value: {value: ''}});
                this.setState({expressions}, () => cb && cb(expressions.length - 1, this.state.expressions[expressions.length - 1]));
            }}
            onExpressionNameUpdate={(i, name, cb) => {
                const expressions = JSON.parse(JSON.stringify(this.state.expressions));
                if (!name) {
                    expressions.splice(i, 1);
                } else if (expressions.find(item => item.name === name)) {
                    return cb && cb(false);
                } else {
                    expressions[i].name = name;
                }

                this.setState({expressions}, () => {
                    name && this.readExpressions(i);
                    cb && cb();
                });
                window.localStorage.setItem('javascript.tools.exps.' + this.props.src, JSON.stringify(expressions.map(item => item.name)));
            }}
        />;
    }

    renderConsole() {
        return <Console
            theme={this.props.theme}
            console={this.state.console}
            onClearAllLogs={() => this.setState({console: [], logErrors: 0, logWarning: 0, logs: 0})}
        />;
    }

    renderTools() {
        const disabled = !this.state.tabs || !this.state.started;

        let _console;
        if (this.state.logErrors) {
            _console = <Badge badgeContent={this.state.logErrors} color="error">
                <span>{I18n.t('Console')}</span>
            </Badge>;
        } else if (this.state.logWarnings) {
            _console = <Badge badgeContent={this.state.logWarnings} color="secondary">
                <span>{I18n.t('Console')}</span>
            </Badge>;
        } else if (this.state.logs) {
            _console = <Badge badgeContent={this.state.logs} color="default">
                <span>{I18n.t('Console')}</span>
            </Badge>;
        } else {
            _console = I18n.t('Console');
        }

        return <div style={{width: '100%', height: '100%', overflow: 'hidden'}}>
            <Tabs
                classes={{root: this.props.classes.tabsRoot}}
                component={'div'}
                indicatorColor="primary"
                style={{ position: 'relative', width: '100%' }}
                value={this.state.toolsTab}
                onChange={(event, value) => {
                    const newState = {toolsTab: value};

                    // load logs from buffer
                    if (this.console && value === 'console') {
                        newState.console = this.console;
                        this.console = null;
                        newState.logs = 0;
                        newState.logWarnings = 0;
                        newState.logErrors = 0;
                    }

                    window.localStorage.setItem('javascript.tools.tab', value);

                    this.setState(newState);
                }}
                scrollButtons="auto"
            >
                <Tab classes={{root: this.props.classes.tabRoot}} disabled={disabled} label={I18n.t('Stack')} value="stack"/>
                <Tab
                    classes={{root: this.props.classes.tabRoot}}
                    disabled={disabled}
                    label={_console}
                    value="console"
                />
            </Tabs>
            <div style={{width: '100%', height: 'calc(100% - 36px)', overflow: 'hidden'}}>
                {this.state.toolsTab === 'stack' && !disabled ? this.renderFrames() : null}
                {this.state.toolsTab === 'console' && !disabled ? this.renderConsole() : null}
            </div>
        </div>;
    }

    render() {
        return <div key="debugger" style={this.props.style} className={Utils.clsx(this.props.classes.root, this.props.className)}>
            {this.state.starting ? <LinearProgress/> : null}
            {this.renderToolbar()}
            <SplitterLayout
                customClassName={this.props.classes.splitter}
                primaryMinSize={100}
                vertical
                secondaryInitialSize={this.toolSize}
                onSecondaryPaneSizeChange={size => this.toolSize = parseFloat(size)}
                onDragEnd={() => window.localStorage.setItem('App.toolSize', this.toolSize.toString())}
                //style={{width: '100%', height: 'calc(100% - 73px)', overflow: 'hidden'}}
            >
                <div style={{width: '100%', height: '100%', overflow: 'hidden'}}>
                    {this.renderCode()}
                    {this.renderQueryBreakpoints()}
                </div>
                <div style={{width: '100%', height: '100%', overflow: 'hidden'}}>
                    {this.renderTools()}
                </div>
            </SplitterLayout>
            {this.renderError()}
        </div>;
    }
}

Debugger.propTypes = {
    runningInstances: PropTypes.object,
    adapterName: PropTypes.string,
    src: PropTypes.string,
    socket: PropTypes.object.isRequired,
    className: PropTypes.string,
    style: PropTypes.object,
    themeType: PropTypes.string,
    theme: PropTypes.object,
    themeName: PropTypes.string,
    debugInstance: PropTypes.object,
};

export default withStyles(styles)(Debugger);
