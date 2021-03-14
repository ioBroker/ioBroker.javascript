import React, { Component } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Toolbar from '@material-ui/core/Toolbar';
import LinearProgress from '@material-ui/core/LinearProgress';
import IconButton from '@material-ui/core/IconButton';

import { MdPlayArrow as IconRun } from 'react-icons/md';
import { MdPause as IconPause } from 'react-icons/md';
import { MdArrowForward as IconNext } from 'react-icons/md';
import { MdArrowDownward as IconStep } from 'react-icons/md';
import { MdArrowUpward as IconOut } from 'react-icons/md';


import I18n from '@iobroker/adapter-react/i18n';
import {withStyles} from "@material-ui/core/styles";

const styles = theme => ({
    toolbar: {
        minHeight: 38,//Theme.toolbar.height,
        boxShadow: '0px 2px 4px -1px rgba(0, 0, 0, 0.2), 0px 4px 5px 0px rgba(0, 0, 0, 0.14), 0px 1px 10px 0px rgba(0, 0, 0, 0.12)'
    },
    buttonRun: {
        color: 'green'
    },
    buttonPause: {
        color: 'gray'
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
    lineNum: {
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
    lineCurrent: {
        background: 'red',
        color: 'white',
    },
    editor: {
        width: '100%',
        height: '100%',
        overflow: 'auto',
    }
});

class Debugger extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            starting: true,
            selected: null,
            scripts: {},
            script: '',
            breakpoints: [],
            expressions: {},
            running: false,
            error: '',
            started: false,
            paused: true,
            location: null,
        };

        this.scripts = {};
    }

    sendToInstance(cmd) {
        this.props.socket.setState(this.state.instance + '.debug.to', JSON.stringify(cmd));
    }

    getLocation(context) {
        if (context.callFrames) {
            const frame = context.callFrames[0];
            return frame.location;
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
                const scripts = JSON.parse(JSON.stringify(this.state.scripts));
                scripts[data.scriptId] = this.props.src.replace('script.js.', '');
                this.setState({
                    starting: false,
                    selected: this.mainScriptId,
                    script: data.script,
                    scripts,
                    started: true,
                    paused: true,
                    location: this.getLocation(data.context)
                });
            } else if (data.cmd === 'paused') {
                this.setState({
                    paused: true,
                    location: this.getLocation(data.context)
                });
            } else if (data.cmd === 'resumed') {
                this.setState({
                    paused: false,
                });
            }
        } catch (e) {

        }
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

    }

    renderTabs() {
        if (this.state.scripts) {
            return <Tabs
                component={'div'}
                indicatorColor="primary"
                style={{ position: 'relative', width: '100%', display: 'inline-block' }}
                value={this.state.selected}
                onChange={(event, value) => {
                    if (this.scripts[value]) {
                        this.setState({selected: value});
                    } else {
                        this.setState({selected: value, script: 'loading...'}, () =>
                            this.sendToInstance({cmd: 'source', scriptId: value}));
                    }
                }}
                scrollButtons="auto"
            >
                {Object.keys(this.state.scripts)
                    .map(id => <Tab label={this.state.scripts[id] || id} key={id} value={id}/>)}
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

    renderToolbar() {
        if (this.state.started) {
            return <Toolbar variant="dense" className={this.props.classes.toolbar} key="toolbar1">
                {
                    this.state.paused ?
                        <IconButton className={this.props.classes.buttonRun} onClick={() => this.onResume()}
                                    title={I18n.t('Resume execution')}><IconRun/></IconButton>
                        :
                        <IconButton className={this.props.classes.buttonPause} onClick={() => this.onPause()}
                                    title={I18n.t('Pause execution')}><IconPause/></IconButton>
                }
                <IconButton className={this.props.classes.buttonNext} disabled={!this.state.paused} onClick={() => this.onNext()}  title={I18n.t('Go to next line')}><IconNext/></IconButton>
                <IconButton className={this.props.classes.buttonStep} disabled={!this.state.paused} onClick={() => this.onStepIn()}  title={I18n.t('Step into function')}><IconStep/></IconButton>
                <IconButton className={this.props.classes.buttonOut} disabled={!this.state.paused} onClick={() => this.onStepOut()}  title={I18n.t('Step out from function')}><IconOut/></IconButton>
            </Toolbar>;
        } else {
            return null;
        }
    }

    renderCode() {
        if (this.state.script) {
            const lines = this.state.script.split(/\r\n|\n/);

            return <div className={this.props.classes.editor}>
                {lines.map((line, i) => {
                    const isStoppedOnLine = this.state.location &&
                        this.state.selected === this.state.location.scriptId &&
                        i === this.state.location.lineNumber;

                    const isBreakpoint = this.state.breakpoints.find(bp =>
                        this.state.selected === bp.scriptId && i === bp.lineNumber);

                    return <div key={i} className={this.props.classes.line}>
                        <div className={clsx(this.props.classes.lineNum, isBreakpoint && this.props.classes.lineBreakpoint)} >{i}</div>
                        {isStoppedOnLine ?
                            <div className={this.props.classes.lineCode}>
                                {line.substring(0, this.state.location.columnNumber)}
                                <span className={this.props.classes.lineCurrent}>{line.substring(this.state.location.columnNumber)}</span>
                            </div>
                            :
                            <div className={this.props.classes.lineCode}>{line}</div>
                        }
                    </div>;
                })}
            </div>;
        }
    }

    render() {
        return <div style={this.props.style} className={this.props.className}>
            {this.state.starting ? <LinearProgress/> : null}
            {this.renderToolbar()}
            {this.renderTabs()}
            {this.renderCode()}
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
