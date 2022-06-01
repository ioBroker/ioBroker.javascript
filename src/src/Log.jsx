import React from 'react';
import PropTypes from 'prop-types';

import IconButton from '@mui/material/IconButton';
import {MdDeleteForever as IconDelete} from 'react-icons/md';
import {MdVerticalAlignBottom as IconBottom} from 'react-icons/md';
import {MdContentCopy as IconCopy} from 'react-icons/md';
import {MdVisibilityOff as IconHide} from 'react-icons/md';

import I18n from '@iobroker/adapter-react-v5/i18n';
import withStyles from '@mui/styles/withStyles';

// replace later with MdHorizontalSplit and MdVerticalSplit
const IconVerticalSplit   = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgAQMAAADYVuV7AAAABlBMVEUAAAAzMzPI8eYgAAAAAXRSTlMAQObYZgAAACFJREFUeAFjAIJRwP////8PYIKWHCigNQdKj/pn1D+jAABTG16wVQqVpQAAAABJRU5ErkJggg==';
const IconHorizontalSplit = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgAQMAAADYVuV7AAAABlBMVEUAAAAzMzPI8eYgAAAAAXRSTlMAQObYZgAAABtJREFUeAFjAIJRwP8fCj7QkENn/4z6Z5QzCgBjbWaoyx1PqQAAAABJRU5ErkJggg==';

function getTimeString(d) {
    let text;
    let i = d.getHours();
    if (i < 10) i = '0' + i.toString();
    text = i + ':';

    i = d.getMinutes();
    if (i < 10) i = '0' + i.toString();
    text += i + ':';
    i = d.getSeconds();
    if (i < 10) i = '0' + i.toString();
    text += i + '.';
    i = d.getMilliseconds();
    if (i < 10) {
        i = '00' + i.toString();
    } else if (i < 100) {
        i = '0' + i.toString();
    }
    text += i;
    return text;
}
const TOOLBOX_WIDTH = 34;

const styles = theme => ({
    logBox: {
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden'
    },
    logBoxInner: {
        display: 'inline-block',
        color: theme.palette.mode === 'dark' ? 'white' : 'black',
        width: `calc(100% - ${TOOLBOX_WIDTH}px)`,
        height: '100%',
        //marginLeft: TOOLBOX_WIDTH,
        overflow: 'auto',
        position: 'relative',
        verticalAlign: 'top',
    },
    info: {
        background: theme.palette.mode === 'dark' ? 'darkgrey' : 'lightgrey',
        color: theme.palette.mode === 'dark' ?  'black' : 'black'
    },
    error: {
        background: '#FF0000',
        color: theme.palette.mode === 'dark' ?  'black' : 'white'
    },
    warn: {
        background: '#FF8000',
        color: theme.palette.mode === 'dark' ?  'black' : 'white'
    },
    debug: {
        background: 'gray',
        opacity: 0.8,
        color: theme.palette.mode === 'dark' ?  'black' : 'white'
    },
    silly: {
        background: 'gray',
        opacity: 0.6,
        color: theme.palette.mode === 'dark' ? 'black' : 'white'
    },
    table: {
        fontFamily: 'monospace',
        width: '100%',

    },
    toolbox: {
        width: TOOLBOX_WIDTH,
        height: '100%',
        boxShadow: '2px 0px 4px -1px rgba(0, 0, 0, 0.2), 4px 0px 5px 0px rgba(0, 0, 0, 0.14), 1px 0px 10px 0px rgba(0, 0, 0, 0.12)',
        display: 'inline-block',
        verticalAlign: 'top',
        overflow: 'hidden',
    },
    trTime: {
        width: 90
    },
    trSeverity: {
        width: 40,
        fontWeight: 'bold'
    },
    iconButtons: {
        width: 32,
        height: 32,
        padding: 4
    },
    layoutIcon: {
        width: 24,
        height: 24,
        background: theme.palette.mode === 'dark' ? '#9d9d9d' : undefined,
        borderRadius: theme.palette.mode === 'dark' ? 30 : undefined,
    },
});

function copyToClipboard(str) {
    const el = window.document.createElement('textarea');
    el.value = str;
    window.document.body.appendChild(el);
    el.select();
    window.document.execCommand('copy');
    window.document.body.removeChild(el);
}

function paddingMs(ms) {
    if (ms < 10) {
        return '00' + ms;
    }
    if (ms < 100) {
        return '0' + ms;
    }
    return ms;
}

let gText = {};

class Log extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            lines: {},
            goBottom: true,
            selected: null,
            editing: this.props.editing || []
        };
        this.lastIndex = null;
        this.messagesEnd = React.createRef();
    }

    generateLine(message) {
        return <tr key={'tr_' + message.ts + '_' + message.message.substr(-10)} className={this.props.classes[message.severity]}>
            <td key="tdTime" className={this.props.classes.trTime}>{getTimeString(new Date(message.ts))}</td>
            <td key="tdSeverity" className={this.props.classes.trSeverity}>{message.severity}</td>
            <td key="tdMessage">{message.message}</td>
        </tr>;
    }

    scrollToBottom() {
        this.messagesEnd && this.messagesEnd.current && this.messagesEnd.current.scrollIntoView({behavior: 'smooth'});
    }
    logHandler = message => {
        let allLines = this.state.lines;
        const selected = this.state.editing.find(id => message.message.indexOf(id) !== -1);
        if (!selected) {
            return;
        }

        let lines = allLines[selected] || [];
        let text = gText[selected] || [];

        lines.push(this.generateLine(message));
        let severity = message.severity;
        if (severity === 'info' || severity === 'warn') {
            severity += ' ';
        }
        const date = new Date(message.ts);
        text.push(`${date.toLocaleString()}.${paddingMs(date.getMilliseconds())}\t[${severity}]: ${message.message}`);
        if (lines.length > 300) {
            lines.splice(0, lines.length - 300);
            text.splice(0, lines.length - 300);
        }
        gText[selected] = text;
        allLines[selected] = lines;

        this.setState({lines: allLines});
    }

    componentDidMount() {
        this.props.socket.registerLogHandler(this.logHandler);
    }

    componentWillUnmount() {
        this.props.socket.unregisterLogHandler(this.logHandler);
    }

    componentDidUpdate() {
        this.state.goBottom && this.scrollToBottom();
    }

    static getDerivedStateFromProps(props, state) {
        let changed = false;
        let newState = {};

        if (props.selected !== state.selected) {
            let selected = props.selected;
            let allLines = state.lines;
            allLines[selected] = allLines[selected] || [];
            gText[selected] = gText[selected] || [];
            newState.selected = selected;
            changed = true;
        }

        if (JSON.stringify(props.editing) !== JSON.stringify(state.editing)) {
            const editing = JSON.parse(JSON.stringify(props.editing));
            changed = true;
            let allLines = state.lines;

            for (const id in gText) {
                if (gText.hasOwnProperty(id)) {
                    if (!editing.includes(id)) {
                        delete gText[id];
                        delete allLines[id];
                    }
                }
            }

            newState.editing = editing;
        }
        return changed ? newState : null;
    }

    onCopy() {
        copyToClipboard((gText[this.state.selected] || []).join('\n'));
    }

    clearLog() {
        let allLines = this.state.lines;
        if (allLines[this.state.selected]) {
            allLines[this.state.selected] = [];
        }
        if (gText[this.state.selected]) {
            gText[this.state.selected] = [];
        }
        this.setState({lines: allLines});
    }

    renderLogList(lines) {
        if (this.state.selected && lines && lines.length) {
            return <div className={this.props.classes.logBoxInner} key="logList">
                <table key="logTable" className={this.props.classes.table}><tbody>{lines}</tbody></table>
                <div key="logScrollPoint" ref={this.messagesEnd} style={{float: 'left', clear: 'both'}}/>
            </div>;
        } else {
            return <div key="logList" className={this.props.classes.logBoxInner} style={{paddingLeft: 10}}>{I18n.t('Log outputs')}</div>;
        }
    }

    render() {
        const lines = this.state.selected && this.state.lines[this.state.selected];
        return (
            <div className={this.props.classes.logBox}>
                <div className={this.props.classes.toolbox} key="toolbox">
                    <IconButton
                        className={this.props.classes.iconButtons}
                        onClick={() => this.setState({goBottom: !this.state.goBottom})}
                        color={this.state.goBottom ? 'secondary' : ''}
                        size="medium"><IconBottom/></IconButton>
                    {lines && lines.length ? <IconButton
                        className={this.props.classes.iconButtons}
                        onClick={() => this.clearLog()}
                        size="medium"><IconDelete/></IconButton> : null}
                    {lines && lines.length ? <IconButton
                        className={this.props.classes.iconButtons}
                        onClick={() => this.onCopy()}
                        size="medium"><IconCopy/></IconButton> : null}
                    {this.props.onLayoutChange ? <IconButton
                        className={this.props.classes.iconButtons}
                        onClick={() => this.props.onLayoutChange()}
                        title={I18n.t('Change layout')}
                        size="medium"><img className={this.props.classes.layoutIcon} alt="split" src={this.props.verticalLayout ? IconVerticalSplit : IconHorizontalSplit} /></IconButton> : null}
                    <IconButton
                        className={this.props.classes.iconButtons}
                        onClick={() => this.props.onHideLog()}
                        title={I18n.t('Hide logs')}
                        size="medium"><IconHide /></IconButton>
                </div>
                {this.renderLogList(lines)}
            </div>
        );
    }
}

Log.propTypes = {
    selected: PropTypes.string,
    socket: PropTypes.object,
    onLayoutChange: PropTypes.func,
    verticalLayout: PropTypes.bool
};

export default withStyles(styles)(Log);
