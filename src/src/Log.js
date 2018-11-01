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
        position: 'relative'
    },
    logBoxInner: {
        width: '100%',
        height: '100%',
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
        width: `calc(100% - ${TOOLBOX_WIDTH}px)`,
        marginLeft: TOOLBOX_WIDTH
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

class Log extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            lines: [],
            goBottom: true
        };
        this.text = [];
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
        this.messagesEnd.current.scrollIntoView({behavior: "smooth"});
    }

    componentDidUpdate() {
        this.state.goBottom && this.scrollToBottom();
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.addLine && nextProps.addLine.index !== this.lastIndex) {
            this.lastIndex = nextProps.addLine.index;
            if (nextProps.addLine.message) {
                const lines = this.state.lines;
                lines.push(this.generateLine(nextProps.addLine.message));
                let severity = nextProps.addLine.message.severity;
                if (severity === 'info' || severity === 'warn') {
                    severity += ' ';
                }
                this.text.push(new Date(nextProps.addLine.message.ts) + '\t[' + severity + ']: ' + nextProps.addLine.message.message);
                if (lines.length > 300) {
                    lines.splice(0, lines.length - 300);
                    this.text.splice(0, lines.length - 300);
                }
                this.setState({lines});
            }
        }
    }

    onCopy() {

    }

    render() {
        return (
            <div className={this.props.classes.logBox}>
                <div className={this.props.classes.toolbox}>
                    <IconButton onClick={() => this.setState({goBottom: !!this.state.goBottom})} color={this.state.goBottom ? 'secondary' : 'primary'}><IconBottom/></IconButton>
                    {this.state.lines.length ? (<IconButton onClick={() => this.setState({lines: []})}><IconDelete/></IconButton>) : null}
                    {this.state.lines.length ? (<IconButton onClick={() => this.onCopy()}><IconCopy/></IconButton>) : null}
                </div>
                <div className={this.props.classes.logBoxInner}>
                    <table className={this.props.classes.table} >
                        {this.state.lines}
                    </table>
                    <div ref={this.messagesEnd} style={{ float:"left", clear: "both" }}/>
                </div>
            </div>
        );
    }
}

Log.propTypes = {
    classes: PropTypes.object.isRequire,
    addLine: PropTypes.object
};

export default withStyles(styles)(Log);
