import React from 'react';

import { Box, IconButton } from '@mui/material';

import {
    MdContentCopy as IconCopy,
    MdDeleteForever as IconDelete,
    MdVerticalAlignBottom as IconBottom,
} from 'react-icons/md';

import { I18n, type IobTheme, Utils } from '@iobroker/adapter-react-v5';

const TOOLBOX_WIDTH = 34;

const styles: Record<string, any> = {
    logBox: {
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
    },
    logBoxInner: (theme: IobTheme): React.CSSProperties => ({
        display: 'inline-block',
        color: theme.palette.mode === 'dark' ? 'white' : 'black',
        width: `calc(100% - ${TOOLBOX_WIDTH}px)`,
        height: '100%',
        // marginLeft: TOOLBOX_WIDTH,
        overflow: 'auto',
        position: 'relative',
        verticalAlign: 'top',
    }),
    info: (theme: IobTheme): React.CSSProperties => ({
        background: theme.palette.mode === 'dark' ? 'darkgrey' : 'lightgrey',
        color: theme.palette.mode === 'dark' ? 'black' : 'black',
    }),
    error: (theme: IobTheme): React.CSSProperties => ({
        background: '#FF0000',
        color: theme.palette.mode === 'dark' ? 'black' : 'white',
    }),
    warn: (theme: IobTheme): React.CSSProperties => ({
        background: '#FF8000',
        color: theme.palette.mode === 'dark' ? 'black' : 'white',
    }),
    debug: (theme: IobTheme): React.CSSProperties => ({
        background: 'gray',
        opacity: 0.8,
        color: theme.palette.mode === 'dark' ? 'black' : 'white',
    }),
    silly: (theme: IobTheme): React.CSSProperties => ({
        background: 'gray',
        opacity: 0.6,
        color: theme.palette.mode === 'dark' ? 'black' : 'white',
    }),
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
        boxShadow:
            '2px 0px 4px -1px rgba(0, 0, 0, 0.2), 4px 0px 5px 0px rgba(0, 0, 0, 0.14), 1px 0px 10px 0px rgba(0, 0, 0, 0.12)',
        display: 'inline-block',
        verticalAlign: 'top',
        overflow: 'hidden',
    },
    trTime: {
        width: 90,
    },
    trSeverity: {
        width: 40,
        fontWeight: 'bold',
    },
    iconButtons: {
        width: 32,
        height: 32,
        padding: 4,
    },
};

function getTimeString(d: Date): string {
    let text;
    let i: string | number = d.getHours();
    if (i < 10) {
        i = `0${i.toString()}`;
    }
    text = `${i}:`;

    i = d.getMinutes();
    if (i < 10) {
        i = `0${i.toString()}`;
    }
    text += `${i}:`;
    i = d.getSeconds();
    if (i < 10) {
        i = `0${i.toString()}`;
    }
    text += `${i}.`;
    i = d.getMilliseconds();
    if (i < 10) {
        i = `00${i.toString()}`;
    } else if (i < 100) {
        i = `0${i.toString()}`;
    }
    text += i;
    return text;
}

interface ConsoleProps {
    onClearAllLogs: () => void;
    console: { ts: number; text: string; severity: ioBroker.LogLevel }[];
}

interface ConsoleState {
    goBottom: boolean;
}

class Console extends React.Component<ConsoleProps, ConsoleState> {
    private readonly messagesEnd: React.RefObject<HTMLDivElement>;

    constructor(props: ConsoleProps) {
        super(props);
        this.state = {
            goBottom: true,
        };
        this.messagesEnd = React.createRef();
    }

    static generateLine(message: { ts: number; text: string; severity: ioBroker.LogLevel }): React.JSX.Element {
        return (
            <Box
                component="tr"
                key={`tr_${message.ts}_${message.text.substring(message.text.length - 10, message.text.length)}`}
                sx={styles[message.severity]}
            >
                <td style={styles.trTime}>{getTimeString(new Date(message.ts))}</td>
                <td style={styles.trSeverity}>{message.severity}</td>
                <td>{message.text}</td>
            </Box>
        );
    }

    renderLogList(lines: { ts: number; text: string; severity: ioBroker.LogLevel }[]): React.JSX.Element {
        if (lines?.length) {
            return (
                <Box
                    sx={styles.logBoxInner}
                    key="logList"
                >
                    <table
                        key="logTable"
                        style={styles.table}
                    >
                        <tbody>{lines.map(line => Console.generateLine(line))}</tbody>
                    </table>
                    <div
                        key="logScrollPoint"
                        ref={this.messagesEnd}
                        style={{ float: 'left', clear: 'both' }}
                    />
                </Box>
            );
        }
        return (
            <Box
                key="logList"
                sx={styles.logBoxInner}
                style={{ paddingLeft: 10 }}
            >
                {I18n.t('Log outputs')}
            </Box>
        );
    }

    onCopy(): void {
        Utils.copyToClipboard(this.props.console.join('\n'));
    }

    scrollToBottom(): void {
        this.messagesEnd?.current?.scrollIntoView({ behavior: 'smooth' });
    }

    componentDidUpdate(): void {
        this.state.goBottom && this.scrollToBottom();
    }

    render(): React.JSX.Element {
        const lines = this.props.console;
        return (
            <div style={styles.logBox}>
                <div
                    style={styles.toolbox}
                    key="toolbox"
                >
                    <IconButton
                        style={styles.iconButtons}
                        onClick={() => this.setState({ goBottom: !this.state.goBottom })}
                        color={this.state.goBottom ? 'secondary' : undefined}
                        size="medium"
                    >
                        <IconBottom />
                    </IconButton>
                    {lines?.length ? (
                        <IconButton
                            style={styles.iconButtons}
                            onClick={() => this.props.onClearAllLogs()}
                            size="medium"
                        >
                            <IconDelete />
                        </IconButton>
                    ) : null}
                    {lines?.length ? (
                        <IconButton
                            style={styles.iconButtons}
                            onClick={() => this.onCopy()}
                            size="medium"
                        >
                            <IconCopy />
                        </IconButton>
                    ) : null}
                </div>
                {this.renderLogList(lines)}
            </div>
        );
    }
}

export default Console;
