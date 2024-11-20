import React from 'react';

import { Box, IconButton } from '@mui/material';

import {
    MdDeleteForever as IconDelete,
    MdVerticalAlignBottom as IconBottom,
    MdContentCopy as IconCopy,
    MdVisibilityOff as IconHide,
} from 'react-icons/md';

import { type AdminConnection, I18n, type IobTheme, Utils } from '@iobroker/adapter-react-v5';
import type { LogMessage } from '@/types';

// replace later with MdHorizontalSplit and MdVerticalSplit
const IconVerticalSplit =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgAQMAAADYVuV7AAAABlBMVEUAAAAzMzPI8eYgAAAAAXRSTlMAQObYZgAAACFJREFUeAFjAIJRwP////8PYIKWHCigNQdKj/pn1D+jAABTG16wVQqVpQAAAABJRU5ErkJggg==';
const IconHorizontalSplit =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgAQMAAADYVuV7AAAABlBMVEUAAAAzMzPI8eYgAAAAAXRSTlMAQObYZgAAABtJREFUeAFjAIJRwP8fCj7QkENn/4z6Z5QzCgBjbWaoyx1PqQAAAABJRU5ErkJggg==';

function getTimeString(d: Date): string {
    let text;
    let i: number | string = d.getHours();
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
        //marginLeft: TOOLBOX_WIDTH,
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
        width: TOOLBOX_WIDTH,
        height: '100%',
        boxShadow:
            '2px 0px 4px -1px rgba(0, 0, 0, 0.2), 4px 0px 5px 0px rgba(0, 0, 0, 0.14), 1px 0px 10px 0px rgba(0, 0, 0, 0.12)',
        display: 'inline-block',
        verticalAlign: 'top',
        overflow: 'hidden',
    },
    trFrom: {
        width: 90,
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
    layoutIcon: (theme: IobTheme): any => ({
        '& img': {
            width: 24,
            height: 24,
            background: theme.palette.mode === 'dark' ? '#9d9d9d' : undefined,
            borderRadius: theme.palette.mode === 'dark' ? '30px' : undefined,
        },
    }),
};

function paddingMs(ms: number): string {
    if (ms < 10) {
        return `00${ms}`;
    }
    if (ms < 100) {
        return `0${ms}`;
    }
    return ms.toString();
}

const gText: Record<string, string[]> = {};

interface LogProps {
    selected: string | null;
    socket: AdminConnection;
    onLayoutChange?: () => void;
    verticalLayout: boolean;
    editing?: string[];
    onHideLog: () => void;
}

interface LogState {
    lines: Record<string, React.JSX.Element[]>;
    goBottom: boolean;
    selected: string | null;
    editing: string[];
}

class Log extends React.Component<LogProps, LogState> {
    private readonly messagesEnd: React.RefObject<HTMLDivElement>;

    constructor(props: LogProps) {
        super(props);
        this.state = {
            lines: {},
            goBottom: true,
            selected: null,
            editing: this.props.editing || [],
        };
        this.messagesEnd = React.createRef<HTMLDivElement>();
    }

    static generateLine(row: LogMessage): React.JSX.Element {
        let message = row.message || '';

        if (typeof message !== 'object') {
            const regExp = new RegExp(
                `${row.from.replace('.', '\\.').replace(')', '\\)').replace('(', '\\(')} \\(\\d+\\) `,
                'g',
            );
            const matches = message.match(regExp);

            if (matches) {
                message = message.replace(matches[0], '');
            } else {
                message = message.replace(`${row.from} `, '');
            }
        }

        return (
            <Box
                component="tr"
                key={`tr_${row.ts}_${row.message.substring(row.message.length - 10)}`}
                sx={styles[row.severity]}
            >
                <td style={styles.trFrom}>{row.from}</td>
                <td style={styles.trTime}>{getTimeString(new Date(row.ts))}</td>
                <td style={styles.trSeverity}>{row.severity}</td>
                <td>{message}</td>
            </Box>
        );
    }

    scrollToBottom(): void {
        this.messagesEnd?.current?.scrollIntoView({ behavior: 'smooth' });
    }

    logHandler = (message: LogMessage): void => {
        const allLines = this.state.lines;
        const scripts = this.state.editing.filter(id => message.message.includes(id));
        let selected: string | null = null;
        if (!scripts.length) {
            return;
        }
        if (scripts.length === 1) {
            selected = scripts[0];
        } else {
            // try to get the script with the longest common substring
            scripts.sort();
            selected = scripts[scripts.length - 1];
        }
        if (!selected) {
            return;
        }

        const lines: React.JSX.Element[] = allLines[selected] || [];
        const text: string[] = gText[selected] || [];

        lines.push(Log.generateLine(message));
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

        this.setState({ lines: allLines });
    };

    componentDidMount(): void {
        // @ts-expect-error fixed in socket classes
        this.props.socket.registerLogHandler(this.logHandler);
    }

    componentWillUnmount(): void {
        // @ts-expect-error fixed in socket classes
        this.props.socket.unregisterLogHandler(this.logHandler);
    }

    componentDidUpdate(): void {
        this.state.goBottom && this.scrollToBottom();
    }

    static getDerivedStateFromProps(props: LogProps, state: LogState): Partial<LogState> | null {
        let changed = false;
        const newState: Partial<LogState> = {};

        if (props.selected !== state.selected) {
            const selected = props.selected;
            const allLines = state.lines;
            if (selected) {
                allLines[selected] = allLines[selected] || [];
                gText[selected] = gText[selected] || [];
            }
            newState.selected = selected;
            changed = true;
        }

        if (JSON.stringify(props.editing) !== JSON.stringify(state.editing)) {
            const editing = JSON.parse(JSON.stringify(props.editing));
            changed = true;
            const allLines = state.lines;

            for (const id in gText) {
                if (Object.prototype.hasOwnProperty.call(gText, id)) {
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

    onCopy(): void {
        Utils.copyToClipboard((gText[this.state.selected as string] || []).join('\n'));
    }

    clearLog(): void {
        const allLines = this.state.lines;
        if (allLines[this.state.selected as string]) {
            allLines[this.state.selected as string] = [];
        }
        if (gText[this.state.selected as string]) {
            gText[this.state.selected as string] = [];
        }
        this.setState({ lines: allLines });
    }

    renderLogList(lines: (React.JSX.Element | null)[] | null): React.JSX.Element {
        if (this.state.selected && lines?.length) {
            return (
                <Box
                    sx={styles.logBoxInner}
                    key="logList"
                >
                    <table
                        key="logTable"
                        style={styles.table}
                    >
                        <tbody>{lines}</tbody>
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

    render(): React.JSX.Element {
        const lines = this.state.selected ? this.state.lines[this.state.selected] : null;
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
                            onClick={() => this.clearLog()}
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
                    {this.props.onLayoutChange ? (
                        <IconButton
                            style={styles.iconButtons}
                            onClick={() => this.props.onLayoutChange && this.props.onLayoutChange()}
                            title={I18n.t('Change layout')}
                            size="medium"
                            sx={styles.layoutIcon}
                        >
                            <img
                                alt="split"
                                src={this.props.verticalLayout ? IconVerticalSplit : IconHorizontalSplit}
                            />
                        </IconButton>
                    ) : null}
                    <IconButton
                        style={styles.iconButtons}
                        onClick={() => this.props.onHideLog()}
                        title={I18n.t('Hide logs')}
                        size="medium"
                    >
                        <IconHide />
                    </IconButton>
                </div>
                {this.renderLogList(lines)}
            </div>
        );
    }
}

export default Log;
