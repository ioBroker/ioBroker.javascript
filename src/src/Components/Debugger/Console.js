import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@material-ui/core/styles';
import IconButton from "@material-ui/core/IconButton";
import {
    MdContentCopy as IconCopy,
    MdDeleteForever as IconDelete,
    MdVerticalAlignBottom as IconBottom,
    MdVisibilityOff as IconHide
} from "react-icons/md";
import I18n from "@iobroker/adapter-react/i18n";

const TOOLBOX_WIDTH = 34;

const styles = theme => ({
    consoleLine: {
        fontSize: 14,
        color: theme.palette.type === 'dark' ? '#EEE' : '#222'
    },
    console_log: {

    },
    console_warn: {
        backgroundColor: theme.palette.type === 'dark' ? '#885900' : '#ffa500',
    },
    console_error: {
        backgroundColor: theme.palette.type === 'dark' ? '#7a0000' : '#FF0000',
    },
    console_debug: {
        opacity: 0.6,
    },
    consoleSeverity: {
        verticalAlign: 'top',
        width: 50,
        textTransform: 'uppercase',
    },
    consoleTime: {
        whiteSpace: 'nowrap',
        verticalAlign: 'top',
        width: 170,

    },
    consoleText: {
        fontFamily: 'Lucida Console, Courier, monospace',
        paddingTop: 4,
        '&>pre': {
            margin: 0
        }
    },



    logBox: {
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden'
    },
    logBoxInner: {
        display: 'inline-block',
        color: theme.palette.type === 'dark' ? 'white' : 'black',
        width: `calc(100% - ${TOOLBOX_WIDTH}px)`,
        height: '100%',
        //marginLeft: TOOLBOX_WIDTH,
        overflow: 'auto',
        position: 'relative',
        verticalAlign: 'top',
    },
    info: {
        background: theme.palette.type === 'dark' ? 'darkgrey' : 'lightgrey',
        color: theme.palette.type === 'dark' ?  'black' : 'black'
    },
    error: {
        background: '#FF0000',
        color: theme.palette.type === 'dark' ?  'black' : 'white'
    },
    warn: {
        background: '#FF8000',
        color: theme.palette.type === 'dark' ?  'black' : 'white'
    },
    debug: {
        background: 'gray',
        opacity: 0.8,
        color: theme.palette.type === 'dark' ?  'black' : 'white'
    },
    silly: {
        background: 'gray',
        opacity: 0.6,
        color: theme.palette.type === 'dark' ? 'black' : 'white'
    },
    table: {
        fontFamily: 'monospace',
        width: '100%',
    },
    toolbox: {
        //position: 'absolute',
        //top: 0,
        //left: 0,
        //marginLeft: 2,
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
});

function copyToClipboard(str) {
    const el = window.document.createElement('textarea');
    el.value = str;
    window.document.body.appendChild(el);
    el.select();
    window.document.execCommand('copy');
    window.document.body.removeChild(el);
}

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

class Console extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            lines: {},
            goBottom: true,
        };
        this.messagesEnd = React.createRef();
    }
    generateLine(message) {
        return <tr key={'tr_' + message.ts + '_' + message.text.substr(-10)} className={this.props.classes[message.severity]}>
            <td key="tdTime" className={this.props.classes.trTime}>{getTimeString(new Date(message.ts))}</td>
            <td key="tdSeverity" className={this.props.classes.trSeverity}>{message.severity}</td>
            <td key="tdMessage">{message.text}</td>
        </tr>;
    }
    renderLogList(lines) {
        if (lines && lines.length) {
            return <div className={this.props.classes.logBoxInner} key="logList">
                <table key="logTable" className={this.props.classes.table}><tbody>
                {lines.map((line, i) => this.generateLine(line))}</tbody></table>
                <div key="logScrollPoint" ref={this.messagesEnd} style={{float: 'left', clear: 'both'}}/>
            </div>;
        } else {
            return <div key="logList" className={this.props.classes.logBoxInner} style={{paddingLeft: 10}}>{I18n.t('Log outputs')}</div>;
        }
    }

    onCopy() {
        copyToClipboard((this.props.console).join('\n'));
    }

    scrollToBottom() {
        this.messagesEnd && this.messagesEnd.current && this.messagesEnd.current.scrollIntoView({behavior: 'smooth'});
    }

    componentDidUpdate() {
        this.state.goBottom && this.scrollToBottom();
    }

    render() {
        const lines = this.props.console;
        return <div className={this.props.classes.logBox}>
            <div className={this.props.classes.toolbox} key="toolbox">
                <IconButton className={this.props.classes.iconButtons} onClick={() => this.setState({goBottom: !this.state.goBottom})} color={this.state.goBottom ? 'secondary' : ''}><IconBottom/></IconButton>
                {lines && lines.length ? <IconButton className={this.props.classes.iconButtons} onClick={() => this.props.onClearAllLogs()}><IconDelete/></IconButton> : null}
                {lines && lines.length ? <IconButton className={this.props.classes.iconButtons} onClick={() => this.onCopy()}><IconCopy/></IconButton> : null}
            </div>
            {this.renderLogList(lines)}
        </div>;
        /*return <table style={{width: '100%'}}>
            <tbody>
            {this.props.console.map((line, i) => <tr
                key={i}
                className={clsx(this.props.classes.consoleLine, this.props.classes['console_' + line.severity])}>
                <td className={this.props.classes.consoleSeverity}>{line.severity}</td>
                <td className={this.props.classes.consoleTime}>{new Date(line.ts).toISOString()}</td>
                <td className={this.props.classes.consoleText}><pre>{line.text}</pre></td>
            </tr>)}
            </tbody>
        </table>;*/
    }
}

Console.propTypes = {
    theme: PropTypes.object,
    onClearAllLogs: PropTypes.func,
    console: PropTypes.array,
};

export default withStyles(styles)(Console);
