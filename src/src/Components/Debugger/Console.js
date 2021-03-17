import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {withStyles} from '@material-ui/core/styles';

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
});

class Console extends React.Component {
    render() {
        return <table style={{width: '100%'}}>
            <tbody>
            {this.props.console.map((line, i) => <tr
                key={i}
                className={clsx(this.props.classes.consoleLine, this.props.classes['console_' + line.severity])}>
                <td className={this.props.classes.consoleSeverity}>{line.severity}</td>
                <td className={this.props.classes.consoleTime}>{new Date(line.ts).toISOString()}</td>
                <td className={this.props.classes.consoleText}><pre>{line.text}</pre></td>
            </tr>)}
            </tbody>
        </table>;
    }
}

Console.propTypes = {
    theme: PropTypes.object,
    onClearAllLogs: PropTypes.func,
    console: PropTypes.array,
};

export default withStyles(styles)(Console);
