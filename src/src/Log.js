import React from 'react';
import PropTypes from 'prop-types';
import IconButton from '@material-ui/core/IconButton';
import {MdDeleteForever as IconDelete} from 'react-icons/md';
import {MdVerticalAlignBottom as IconBottom} from 'react-icons/md';
import {MdContentCopy as IconCopy} from 'react-icons/md';

import I18n from './i18n';
import {withStyles} from "@material-ui/core/styles/index";
import Theme from "./Theme";

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
const TOOLBOX_WIDTH = 48;

const styles = theme => ({
    logBox: {
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden'
    },
    logBoxInner: {
        width: `calc(100% - ${TOOLBOX_WIDTH}px)`,
        height: '100%',
        marginLeft: TOOLBOX_WIDTH,
        overflow: 'auto',
        position: 'relative'
    },
    info: {
        background: 'lightgrey',
    },
    error: {
        background: 'red',
        color: 'white'
    },
    warn: {
        background: 'orange',
        color: 'white'
    },
    debug: {
        background: 'gray',
        opacity: 0.8,
        color: 'white'
    },
    silly: {
        background: 'gray',
        opacity: 0.6,
        color: 'white'
    },
    table: {
        fontFamily: 'monospace',
        width: '100%',

    },
    toolbox: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: TOOLBOX_WIDTH,
        height: '100%',
        boxShadow: '2px 0px 4px -1px rgba(0, 0, 0, 0.2), 4px 0px 5px 0px rgba(0, 0, 0, 0.14), 1px 0px 10px 0px rgba(0, 0, 0, 0.12)'
    },
    trTime: {
        width: 90
    },
    trSeverity: {
        width: 40,
        fontWeight: 'bold'
    }
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
    if (ms < 10) return '00' + ms;
    if (ms < 100) return '0' + ms;
    return ms;
}

class Log extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            lines: {},
            goBottom: true,
            selected: null,
        };
        this.text = {};
        this.lastIndex = null;
        this.messagesEnd = React.createRef();
    }

    generateLine(message) {
        return (<tr className={this.props.classes[message.severity]}>
            <td className={this.props.classes.trTime}>{getTimeString(new Date(message.ts))}</td>
            <td className={this.props.classes.trSeverity}>{message.severity}</td>
            <td>{message.message}</td>
        </tr>);
    }

    scrollToBottom() {
        this.messagesEnd && this.messagesEnd.current && this.messagesEnd.current.scrollIntoView({behavior: 'smooth'});
    }

    componentDidUpdate() {
        this.state.goBottom && this.scrollToBottom();
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.selected !== this.state.selected) {
            let selected = nextProps.selected;
            let allLines = this.state.lines;
            this.state.lines[selected] = this.state.lines[selected] || [];
            this.text[selected] = this.text[selected] || [];
            this.setState({selected});
        }
        if (nextProps.addLine && nextProps.addLine.index !== this.lastIndex) {
            this.lastIndex = nextProps.addLine.index;
            if (nextProps.addLine.message) {
                let allLines = this.state.lines;
                const selected = Object.keys(this.state.lines).find(id => nextProps.addLine.message.message.indexOf(id) !== -1);
                if (!selected) return;

                let lines = this.state.lines[selected] || [];
                let text = this.text[selected] || [];

                lines.push(this.generateLine(nextProps.addLine.message));
                let severity = nextProps.addLine.message.severity;
                if (severity === 'info' || severity === 'warn') {
                    severity += ' ';
                }
                const date = new Date(nextProps.addLine.message.ts);
                text.push(`${date.toLocaleString()}.${paddingMs(date.getMilliseconds())}\t[${severity}]: ${nextProps.addLine.message.message}`);
                if (lines.length > 300) {
                    lines.splice(0, lines.length - 300);
                    text.splice(0, lines.length - 300);
                }
                this.text[selected] = text;

                this.setState({lines: allLines});
            }
        }
    }

    onCopy() {
        copyToClipboard((this.text[this.state.selected] || []).join('\n'));
    }

    clearLog() {
        let allLines = this.state.lines;
        if (allLines[this.state.selected]) {
            allLines[this.state.selected] = [];
        }
        if (this.text[this.state.selected]) {
            this.text[this.state.selected] = [];
        }
        this.setState({lines: allLines});
    }

    render() {
        const lines = this.state.selected && this.state.lines[this.state.selected];
        return (
            <div className={this.props.classes.logBox}>
                <div className={this.props.classes.toolbox}>
                    <IconButton onClick={() => this.setState({goBottom: !this.state.goBottom})} color={this.state.goBottom ? 'secondary' : ''}><IconBottom/></IconButton>
                    {lines && lines.length ? (<IconButton onClick={() => this.clearLog()}><IconDelete/></IconButton>) : null}
                    {lines && lines.length ? (<IconButton onClick={() => this.onCopy()}><IconCopy/></IconButton>) : null}
                </div>
                {this.state.selected ?
                    (<div className={this.props.classes.logBoxInner}>
                        <table className={this.props.classes.table} >{lines}</table>
                        <div ref={this.messagesEnd} style={{float: 'left', clear: 'both'}}/>
                    </div>) : null}
            </div>
        );
    }
}

Log.propTypes = {
    classes: PropTypes.object.isRequire,
    addLine: PropTypes.object,
    selected: PropTypes.string
};

export default withStyles(styles)(Log);
