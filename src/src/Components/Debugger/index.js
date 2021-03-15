import React, { Component } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Toolbar from '@material-ui/core/Toolbar';
import LinearProgress from '@material-ui/core/LinearProgress';
import IconButton from '@material-ui/core/IconButton';

import {MdClose as IconClose, MdPlayArrow as IconRun} from 'react-icons/md';
import { MdPause as IconPause } from 'react-icons/md';
import { MdArrowForward as IconNext } from 'react-icons/md';
import { MdArrowDownward as IconStep } from 'react-icons/md';
import { MdArrowUpward as IconOut } from 'react-icons/md';
import { MdRefresh as IconRestart } from 'react-icons/md';


import I18n from '@iobroker/adapter-react/i18n';
import {withStyles} from "@material-ui/core/styles";
import DialogError from "../../Dialogs/Error";

const styles = theme => ({
    root: {
        width: '100%',
        height: `calc(100% - ${theme.toolbar.height + 38/*Theme.toolbar.height */ + 5}px)`,
        overflow: 'auto',
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
        borderRight: '1px solid #555'
    },
    lineBreakpoint: {
        background: '#330000',
        color: 'white',
        ':after': {
            content: '""',
            width: 16,
            height: 16,
            borderRadius: 16,
            background: 'yellow'
        }
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
    editor: {
        width: '100%',
        height: '100%',
        overflow: 'auto',
    },

    consoleLine: {
        fontSize: 14,
    },
    console_log: {

    },
    console_warn: {
        backgroundColor: 'orange',
    },
    console_error: {
        backgroundColor: 'red',
    },
    console_debug: {
        opacity: 0.8,
    },
    consoleSeverity: {
        width: 50,
        textTransform: 'uppercase',
    },
    consoleTime: {
        width: 170,
    },
    consoleText: {
        fontFamily: 'Lucida Console, Courier, monospace',
        paddingTop: 4
    },

    selectedFrame: {
        backgroundColor: 'gray',
        color: 'white'
    },
    tabFile: {
        textTransform: 'inherit',
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
});

class Debugger extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            starting: true,
            selected: null,
            tabs: {},
            script: '',
            breakpoints: [],
            expressions: {},
            running: false,
            error: '',
            started: false,
            paused: true,
            location: null,
            toolsTab: window.localStorage.getItem('javascript.tools.tab') || 'console',
            console: [],
            finished: false,
            currentFrame: 0,
            scopes: {},
        };

        this.refCurrentLine = React.createRef();

        this.scripts = {};
        this.mainScriptId = null;
    }

    sendToInstance(cmd) {
        this.props.socket.setState(this.state.instance + '.debug.to', JSON.stringify(cmd));
    }

    reinitBreakpoints(cb) {
        if (this.state.breakpoints.length) {
            let breakpoints = JSON.parse(JSON.stringify(this.state.breakpoints));
            breakpoints = breakpoints.map(item => item.location);
            this.setState({breakpoints: []}, () => {
                this.sendToInstance({breakpoints, cmd: 'sb'})

                cb && cb();
            });
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
        const frame = this.state.context.callFrames[this.state.currentFrame];
        if (frame) {
            const scopes = frame.scopeChain.filter(scope => scope.type !== 'global');
            if (scopes.length) {
                this.sendToInstance({cmd: 'scope', scopes});
            } else if (this.state.scopes.global || this.state.scopes.local || this.state.scopes.closure) {
                this.setState({scopes: {}});
            }
        }
    }

    fromInstance = (id, state) => {
        try {
            const data = JSON.parse(state.val);
            if (data.cmd === 'subscribed') {
                this.props.socket.sendTo(this.state.instance, 'debug', {scriptName: this.props.src});
            } else
            if (data.cmd === 'readyToDebug') {
                this.mainScriptId = data.scriptId;
                this.scripts[data.scriptId] = data.script;
                const tabs = JSON.parse(JSON.stringify(this.state.tabs));
                tabs[data.scriptId] = this.props.src.replace('script.js.', '');

                const ts = Date.now() + '.' + Math.random() * 10000;
                data.context.callFrames && data.context.callFrames.forEach((item, i) => item.id = ts + i);

                this.setState({
                    starting: false,
                    finished: false,
                    selected: this.mainScriptId,
                    script: data.script,
                    tabs,
                    started: true,
                    paused: true,
                    location: this.getLocation(data.context),
                    context: data.context,
                }, () => this.reinitBreakpoints(() => this.readCurrentScope()));
            } else if (data.cmd === 'paused') {
                const ts = Date.now() + '.' + Math.random() * 10000;
                data.context.callFrames && data.context.callFrames.forEach((item, i) => item.id = ts + i);
                const location = this.getLocation(data.context);
                const tabs = JSON.parse(JSON.stringify(this.state.tabs));
                const parts = data.context.callFrames[0].url.split('iobroker.javascript');
                tabs[location.scriptId] = parts[1] || parts[0];

                const newState = {
                    tabs,
                    paused: true,
                    location,
                    context: data.context,
                };

                newState.script = this.scripts[location.scriptId] || I18n.t('loading...');
                newState.selected = location.scriptId;

                this.setState(newState, () => {
                    this.readCurrentScope();
                    if (!this.scripts[location.scriptId]) {
                        this.sendToInstance({cmd: 'source', scriptId: location.scriptId});
                    } else {
                        this.scrollToCurrentLine();
                    }
                });
            } else if (data.cmd === 'script') {
                this.scripts[data.scriptId] = data.text;
                if (this.state.selected === data.scriptId) {
                    this.setState({script: this.scripts[data.scriptId]}, () =>
                        this.scrollToCurrentLine());
                }
            } else if (data.cmd === 'resumed') {
                this.setState({
                    paused: false,
                });
            } else if (data.cmd === 'log') {
                if (this.state.toolsTab === 'console') {
                    this.console = null;
                    const console = [...this.state.console];
                    console.push({text: data.text, severity: data.severity, ts: data.ts});
                    this.setState({console});
                } else {
                    this.console = this.console || [...this.state.console];
                    this.console.push({text: data.text, severity: data.severity, ts: data.ts});
                }
            } else if (data.cmd === 'error') {
                this.setState({error: data.error});
            } else if (data.cmd === 'finished' || data.cmd === 'debugStopped') {
                this.setState({finished: true});
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

                changed && this.setState({breakpoints});
            } else if (data.cmd === 'scope') {
                const global = data.scopes.find(scope => scope.type === 'global') || null;
                const local = data.scopes.find(scope => scope.type === 'local') || null;
                const closure = data.scopes.find(scope => scope.type === 'closure') || null;

                this.setState({scopes: {global, local, closure}});
            } else  {
                console.error('Unknown command: ' + JSON.stringify(data));
            }
        } catch (e) {

        }
    }

    scrollToCurrentLine() {
        this.refCurrentLine.current?.scrollIntoView();
    }

    componentDidMount() {
        this.props.socket.getObject(this.props.src)
            .then(obj =>
                this.setState({instance: obj?.common?.engine?.replace('system.adapter.', '')}, () => {
                    if (this.state.instance) {
                        this.props.socket.setState(this.state.instance + '.debug.from', '{"cmd": "subscribed"}', true)
                            //.then(() => );
                        setTimeout(() =>
                            this.props.socket.subscribeState(this.state.instance + '.debug.from', this.fromInstance), 400);
                    } else {
                        this.setState({error: 'Unknown instance'});
                    }
                }));
    }

    componentWillUnmount() {
        if (this.state.instance) {
            this.props.socket.unsubscribeState(this.state.instance + '.debug.from', this.fromInstance);
            this.props.socket.sendTo(this.state.instance, 'debugStop');
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
        if (this.state.location.scriptId !== this.mainScriptId) {
            newState.location = null;
        }
        this.setState(newState);
    }

    renderTabs() {
        if (this.state.tabs && this.state.started) {
            return <Tabs
                component={'div'}
                indicatorColor="primary"
                style={{ position: 'relative', width: '100%', display: 'inline-block' }}
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
                {Object.keys(this.state.tabs)
                    .map(id => {
                        let label = id;
                        let title = this.state.tabs[id] || '';
                        if (this.state.tabs[id]) {
                            label = this.state.tabs[id].split('/').pop();
                        }
                        label = [
                            <div key="text" className={clsx(this.props.classes.tabText)}>{label}</div>,
                            id !== this.mainScriptId && <span key="icon" className={this.props.classes.closeButton}>
                                <IconClose key="close" onClick={e => this.closeTab(id, e)} fontSize="small" /></span>];

                        return <Tab classes={{root: this.props.classes.tabFile}} label={label} title={title} key={id} value={id}/>;
                    })}
            </Tabs>;
        }
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
            this.props.socket.sendTo(this.state.instance, 'debug', {scriptName: this.props.src}));
    }

    renderToolbar() {
        if (this.state.started) {
            return <Toolbar variant="dense" className={this.props.classes.toolbar} key="toolbar1">
                <IconButton className={this.props.classes.buttonRestart} disabled={!this.state.started} onClick={() => this.onRestart()}  title={I18n.t('Restart')}><IconRestart/></IconButton>
                {
                    !this.state.finished && this.state.paused ?
                        <IconButton className={this.props.classes.buttonRun} onClick={() => this.onResume()}
                                    title={I18n.t('Resume execution')}><IconRun/></IconButton>
                        :
                        !this.state.finished && <IconButton className={this.props.classes.buttonPause} onClick={() => this.onPause()}
                                    title={I18n.t('Pause execution')}><IconPause/></IconButton>
                }
                {!this.state.finished && <IconButton className={this.props.classes.buttonNext} disabled={!this.state.paused} onClick={() => this.onNext()}  title={I18n.t('Go to next line')}><IconNext/></IconButton>}
                {!this.state.finished && <IconButton className={this.props.classes.buttonStep} disabled={!this.state.paused} onClick={() => this.onStepIn()}  title={I18n.t('Step into function')}><IconStep/></IconButton>}
                {!this.state.finished && <IconButton className={this.props.classes.buttonOut} disabled={!this.state.paused} onClick={() => this.onStepOut()}  title={I18n.t('Step out from function')}><IconOut/></IconButton>}
            </Toolbar>;
        } else {
            return null;
        }
    }

    toggleBreakpoint(lineNumber) {
        let bp = this.state.breakpoints.find(item => item.location.scriptId === this.state.selected && item.location.lineNumber === lineNumber);
        const breakpoints = JSON.parse(JSON.stringify(this.state.breakpoints));
        if (bp) {
            this.setState({breakpoints}, () =>
                this.sendToInstance({breakpoints: [bp.id], cmd: 'cb'}));
        } else {
            bp = {scriptId: this.state.selected, lineNumber, columnNumber: 0};
            this.setState({breakpoints}, () =>
                this.sendToInstance({breakpoints: [bp], cmd: 'sb'}));
        }
    }

    renderCode() {
        if (this.state.script && this.state.started) {
            const lines = this.state.script.split(/\r\n|\n/);

            return <div className={this.props.classes.editor}>
                {lines.map((line, i) => {
                    const isStoppedOnLine = this.state.paused && this.state.location &&
                        this.state.selected === this.state.location.scriptId &&
                        i === this.state.location.lineNumber;

                    const isBreakpoint = this.state.breakpoints.find(bp =>
                        this.state.selected === bp.location.scriptId && i === bp.location.lineNumber);

                    return <div key={this.state.selected + '_' + i} className={this.props.classes.line}>
                        <div className={clsx(this.props.classes.lineNumber, isBreakpoint && this.props.classes.lineBreakpoint)}
                            onClick={() => this.toggleBreakpoint(i)}
                        >{i}</div>
                        {isStoppedOnLine ?
                            <div ref={this.refCurrentLine} className={clsx(this.props.classes.lineCode, isStoppedOnLine && this.props.classes.lineCurrent)}>
                                {line.substring(0, this.state.location.columnNumber)}
                                <span className={this.props.classes.lineCurrentCode}>{line.substring(this.state.location.columnNumber)}</span>
                            </div>
                            :
                            <div className={this.props.classes.lineCode}>{line}</div>
                        }
                    </div>;
                })}
            </div>;
        }
    }

    renderExpressions() {
        return <div style={{width: '100%', height: '100%', overflow: 'auto'}}>
            <div style={{width: '100%'}}>
                <IconButton>+</IconButton>
            </div>
            <table style={{width: '100%', height: '100%'}}>
                {Object.keys(this.state.expressions).map(exp =>
                    <tr><td>{exp.expr}</td><td>{this.state.expressions[exp].value}</td></tr>)}
            </table>
        </div>;
    }

    renderOneFrameTitle(frame, i) {
        if (this.mainScriptId === this.state.selected && frame.location.scriptId !== this.mainScriptId) {
            return null;
        }
        return <div style={{width: '100%'}} className={clsx(this.state.currentFrame === i && this.props.classes.selectedFrame)}>
            {frame.functionName || 'anonymous'}(), {frame.url}: ({frame.location.lineNumber}:{frame.location.columnNumber})
        </div>;
    }

    formatValue(value) {
        if (!value) {
            return 'none';
        } else if (value.type === 'function') {
            return value.description ? (value.description.length > 100 ? value.description.substring(0, 100) + '...' : value.description) : 'function';
        } else if (value.value === undefined) {
            return 'undefined';
        } else if (value.value === null) {
            return 'null';
        } else if (value.type === 'string') {
            return `"${value.value}"`;
        } else if (value.type === 'boolean') {
            return value.value.toString();
        } else if (value.type === 'object') {
            return JSON.stringify(value.value);
        }else {
            return value.value.toString();
        }
    }

    renderScopes(frame) {
        if (!frame) {
            return null;
        } else {
            // first local
            let result = [];
            let items = this.state.scopes?.local?.properties?.result.map(item => <div key={'g_' + 'item.name'}>[local]{item.name}: {this.formatValue(item.value)}</div>);
            items && items.forEach(item => result.push(item));
            items = this.state.scopes?.closure?.properties?.result.map(item => <div key={'c_' + 'item.name'}>[closure]{item.name}: {this.formatValue(item.value)}</div>);
            items && items.forEach(item => result.push(item));
            return result;
        }
    }

    renderFrames() {
        return <div style={{width: '100%', height: '100%', overflow: 'hidden', fontSize: 12}}>
            <div style={{width: 400, height: '100%', overflow: 'auto', display: 'inline-block', verticalAlign: 'top'}}>
                {this.state.context ? this.state.context.callFrames.map((frame, i) => this.renderOneFrameTitle(frame, i)) : null}
            </div>
            <div style={{width: 'calc(100% - 400px)', height: '100%', display: 'inline-block', verticalAlign: 'top'}}>
                {this.renderScopes(this.state.context?.callFrames[this.state.currentFrame])}
            </div>

        </div>;
    }

    renderConsole() {
        return <table style={{width: '100%'}}>
            {this.state.console.map(line => <tr className={clsx(this.props.classes.consoleLine, this.props.classes['console_' + line.severity])}>
                <td className={this.props.classes.consoleSeverity}>{line.severity}</td>
                <td className={this.props.classes.consoleTime}>{new Date(line.ts).toISOString()}</td>
                <td className={this.props.classes.consoleText}>{line.text}</td>
            </tr>)}
        </table>;
    }

    renderTools() {
        if (this.state.tabs && this.state.started) {
            return <div style={{width: '100%', height: '100%', overflow: 'hidden'}}>
                <Tabs
                    component={'div'}
                    indicatorColor="primary"
                    style={{ position: 'relative', width: '100%', display: 'inline-block' }}
                    value={this.state.toolsTab}
                    onChange={(event, value) => {
                        const newState = {toolsTab: value};

                        // load logs from buffer
                        if (this.console) {
                            newState.console = this.console;
                            this.console = null;
                        }

                        window.localStorage.setItem('javascript.tools.tab', value);

                        this.setState(newState);
                    }}
                    scrollButtons="auto"
                >
                    <Tab label={I18n.t('Stack')} value="stack"/>
                    <Tab label={I18n.t('Expressions')} value="expressions"/>
                    <Tab label={I18n.t('Console')} value="console"/>
                </Tabs>
                <div style={{width: '100%', height: 'calc(100% - 50px)', overflow: 'auto'}}>
                    {this.state.toolsTab === 'stack' ? this.renderFrames() : null}
                    {this.state.toolsTab === 'expressions' ? this.renderExpressions() : null}
                    {this.state.toolsTab === 'console' ? this.renderConsole() : null}
                </div>
            </div>;
        }
    }

    render() {
        return <div key="debugger" style={this.props.style} className={clsx(this.props.classes.root, this.props.className)}>
            {this.state.starting ? <LinearProgress/> : null}
            {this.renderToolbar()}
            {this.renderTabs()}
            <div style={{width: '100%', height: 'calc(100% - 100px)', overflow: 'hidden'}}>
                <div style={{width: '100%', height: 'calc(100% - 300px)', overflow: 'hidden'}}>
                    {this.renderCode()}
                </div>
                <div style={{width: '100%', height: 300, overflow: 'hidden'}}>
                    {this.renderTools()}
                </div>
            </div>

            {this.renderError()}
        </div>;
    }
}

Debugger.propTypes = {
    src: PropTypes.string,
    socket: PropTypes.object,
    className: PropTypes.string,
    style: PropTypes.object,
    themeType: PropTypes.string,
    theme: PropTypes.object,
    themeName: PropTypes.string,
};

export default withStyles(styles)(Debugger);
