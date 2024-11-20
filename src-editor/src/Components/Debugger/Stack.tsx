import React from 'react';

import ReactSplit, { SplitDirection } from '@devbookhq/splitter';
import ReactJson from 'react-json-view';

import { ListItemButton, ListItemText, Input, InputAdornment, IconButton, List, Box } from '@mui/material';

import { MdCheck as CheckIcon, MdAdd as IconAdd, MdDelete as IconDelete } from 'react-icons/md';

import { I18n, type IobTheme, type ThemeType } from '@iobroker/adapter-react-v5';
import type { DebugScopes, CallFrame, DebugValue, DebugVariable } from '@/Components/Debugger/types';

const styles: Record<string, any> = {
    frameRoot: {
        paddingTop: 0,
        paddingBottom: 0,
    },
    frameTextRoot: {
        m: 0,
    },
    frameTextPrimary: (theme: IobTheme): React.CSSProperties => ({
        color: theme.palette.mode === 'dark' ? '#CCC' : '#333',
    }),
    frameTextSecondary: {
        fontStyle: 'italic',
        fontSize: 12,
        opacity: 0.6,
        pl: 1,
    },

    listRoot: {
        padding: 0,
        fontSize: 'small',
    },

    scopeType: {
        verticalAlign: 'top',
        textTransform: 'uppercase',
        width: 50,
    },
    scopeType_local: {
        color: '#53a944',
    },
    scopeType_closure: {
        color: '#365b80',
    },
    scopeType_user: {
        color: '#a48a15',
    },
    scopeName: {
        color: '#bc5b5b',
        width: 'calc(100% - 82px)',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
    },
    scopeButton: {
        width: 32,
    },
    scopeValueEditable: {
        cursor: 'pointer',
    },
    selectedFrame: {
        backgroundColor: '#777',
        color: 'white',
    },
    splitter: {
        width: '100%',
        height: 'calc(100% - 36px)',
        overflow: 'hidden',
        fontSize: 12,
    },

    toolbarScopes: (theme: IobTheme): React.CSSProperties => ({
        width: 24,
        display: 'inline-block',
        height: '100%',
        background: theme.palette.mode === 'dark' ? '#222' : '#EEE',
        verticalAlign: 'top',
    }),
    scopesAfterToolbar: {
        width: 'calc(100% - 24px)',
        display: 'inline-block',
        height: '100%',
        verticalAlign: 'top',
    },

    scopeNameName: {
        fontWeight: 'bold',
        display: 'inline-block',
        verticalAlign: 'top',
    },
    scopeNameEqual: (theme: IobTheme): React.CSSProperties => ({
        display: 'inline-block',
        color: theme.palette.mode === 'dark' ? '#EEE' : '#222',
        verticalAlign: 'top',
    }),
    scopeNameValue: {
        verticalAlign: 'top',
        display: 'inline-block',
        color: '#3b709f',
        whiteSpace: 'nowrap',
    },
    scopeButtonDel: {
        padding: 0,
        float: 'right',
    },

    valueNull: {
        color: '#a44a24',
    },
    valueUndefined: {
        color: '#a44a24',
    },
    valueString: {
        color: '#1e8816',
    },
    valueNumber: {
        color: '#163c88',
    },
    valueBoolean: {
        color: '#a44a24',
    },
    valueObject: {
        color: '#721b70',
    },
    valueNone: {
        color: '#8a8a8a',
    },
    valueFunc: {
        color: '#ac4343',
    },
};

interface StackProps {
    currentScriptId: string | null;
    mainScriptId?: string;
    scopes: DebugScopes | null;
    expressions: DebugVariable[];
    callFrames: CallFrame[] | undefined;
    currentFrame: number;
    onExpressionDelete: (index: number) => void;
    onChangeCurrentFrame: (index: number) => void;
    onWriteScopeValue: (options: {
        variableName: string;
        scopeNumber: 0;
        newValue: {
            value: any;
            valueType:
                | 'string'
                | 'number'
                | 'object'
                | 'boolean'
                | 'undefined'
                | 'null'
                | 'bigint'
                | 'symbol'
                | 'function';
        };
        callFrameId: string | undefined;
    }) => void;
    onExpressionAdd: (cb: (index: number, item: DebugVariable) => void) => void;
    onExpressionNameUpdate: (index: number, scopeValue: string, cb: () => void) => void;
    themeType: ThemeType;
}

interface StackState {
    editValue: {
        type: 'expression' | 'local' | 'closure' | 'global';
        valueType: 'function' | 'string' | 'boolean' | 'number' | 'object' | 'undefined' | 'null' | 'bigint' | 'symbol';
        index: number;
        name: string;
        value: string;
        scopeId?: string;
    } | null;
    callFrames: CallFrame[] | undefined;
    framesSizes: number[];
}

class Stack extends React.Component<StackProps, StackState> {
    private readonly editRef: React.RefObject<HTMLInputElement>;

    private scopeValue: boolean | undefined | number | string | null = null;

    constructor(props: StackProps) {
        super(props);

        const framesSizesStr = window.localStorage.getItem('JS.framesSizes');
        let framesSizes = [30, 70];
        if (framesSizesStr) {
            try {
                framesSizes = JSON.parse(framesSizesStr);
            } catch {
                // ignore
            }
        }

        this.state = {
            editValue: null,
            callFrames: this.props.callFrames,
            framesSizes,
        };

        this.editRef = React.createRef();
    }

    onExpressionNameUpdate(): void {
        if (this.state.editValue) {
            this.props.onExpressionNameUpdate(this.state.editValue.index, this.scopeValue as string, () => {
                this.setState({ editValue: null });
                this.scopeValue = null;
            });
        }
    }

    renderExpression(item: DebugVariable, i: number): React.JSX.Element {
        const name =
            this.state.editValue && this.state.editValue.type === 'expression' && this.state.editValue.index === i ? (
                <Input
                    inputRef={this.editRef}
                    fullWidth
                    margin="dense"
                    onBlur={() => this.state.editValue && this.setState({ editValue: null })}
                    defaultValue={item.name}
                    onKeyUp={e => {
                        if (e.key === 'Enter') {
                            this.onExpressionNameUpdate();
                        } else if (e.key === 'Escape') {
                            this.setState({ editValue: null });
                        }
                    }}
                    onChange={e => (this.scopeValue = e.target.value)}
                    endAdornment={
                        <InputAdornment position="end">
                            <IconButton
                                onClick={() => this.onExpressionNameUpdate()}
                                size="medium"
                            >
                                <CheckIcon />
                            </IconButton>
                        </InputAdornment>
                    }
                />
            ) : (
                [
                    <div
                        key="name"
                        style={styles.scopeNameName}
                        title={I18n.t('Double click to edit expression')}
                    >
                        {item.name}
                    </div>,
                    <Box
                        key="="
                        sx={styles.scopeNameEqual}
                    >
                        {' '}
                        ={' '}
                    </Box>,
                    <div
                        key="val"
                        style={styles.scopeNameValue}
                    >
                        {this.formatValue(item.value)}
                    </div>,
                ]
            );

        return (
            <tr key={`user_${i}${item.name}`}>
                <td style={{ ...styles.scopeType, ...styles.scopeType_user }}>user</td>
                <td
                    style={styles.scopeName}
                    onDoubleClick={() => {
                        this.scopeValue = item.name || '';
                        this.setState({
                            editValue: {
                                type: 'expression',
                                valueType: 'string',
                                index: i,
                                name: item.name,
                                value: item.name || '',
                            },
                        });
                    }}
                >
                    {name}
                </td>
                <IconButton
                    style={styles.scopeButtonDel}
                    size="small"
                    disabled={!!this.state.editValue}
                    onClick={() => this.props.onExpressionDelete(i)}
                >
                    <IconDelete />
                </IconButton>
            </tr>
        );
    }

    renderExpressions(): React.JSX.Element[] {
        return this.props.expressions.map((item, i) => this.renderExpression(item, i));
    }

    renderOneFrameTitle(frame: CallFrame, i: number): React.JSX.Element | null {
        if (
            this.props.mainScriptId === this.props.currentScriptId &&
            frame.location.scriptId !== this.props.mainScriptId
        ) {
            return null;
        }
        const fileName = (frame.url.split('/').pop() || '').replace(/^script\.js\./, '');
        return (
            <ListItemButton
                key={frame.callFrameId}
                onClick={() => this.props.onChangeCurrentFrame(i)}
                dense
                selected={this.props.currentFrame === i}
                style={styles.frameRoot}
            >
                <ListItemText
                    sx={{
                        ...styles.frameTextRoot,
                        '& .MuiListItemText-primary': styles.frameTextPrimary,
                        '& .MuiListItemText-secondary': styles.frameTextSecondary,
                    }}
                    title={frame.url}
                    primary={frame.functionName || 'anonymous'}
                    secondary={`${fileName} (${frame.location.lineNumber}:${frame.location.columnNumber})`}
                />
            </ListItemButton>
        );
    }

    formatValue(value: DebugValue | null, forEdit?: boolean): React.JSX.Element | string {
        if (!value) {
            if (forEdit) {
                return 'none';
            }
            return <span style={styles.valueNone}>none</span>;
        }
        if (value.type === 'function') {
            const text = value.description
                ? value.description.length > 100
                    ? `${value.description.substring(0, 100)}...`
                    : value.description
                : 'function';
            if (forEdit) {
                return text;
            }
            return (
                <span
                    style={styles.valueFunc}
                    title={value.description}
                >
                    {text}
                </span>
            );
        }
        if (value.value === undefined) {
            if (forEdit) {
                return 'undefined';
            }
            return <span style={styles.valueUndefined}>undefined</span>;
        }
        if (value.value === null) {
            if (forEdit) {
                return 'null';
            }
            return <span style={styles.valueNull}>null</span>;
        }
        if (value.type === 'string') {
            if (forEdit) {
                return value.value;
            }
            const text = `"${
                value.value ? (value.value.length > 100 ? `${value.value.substring(0, 100)}...` : value.value) : ''
            }"`;
            return (
                <span
                    style={styles.valueString}
                    title={text}
                >
                    {text}
                </span>
            );
        }
        if (value.type === 'boolean') {
            if (forEdit) {
                return value.value.toString();
            }
            return <span style={styles.valueBoolean}>{value.value.toString()}</span>;
        }
        if (value.type === 'object') {
            if (forEdit) {
                return JSON.stringify(value.value);
            }
            return (
                <ReactJson
                    enableClipboard={false}
                    style={{ backgroundColor: 'inherit', marginTop: 3 }}
                    src={value.value}
                    collapsed
                    theme={this.props.themeType === 'dark' ? 'brewer' : 'rjv-default'}
                    displayDataTypes={false}
                />
            );
        }

        return value.value.toString();
    }

    onWriteScopeValue(): void {
        if (this.scopeValue === 'true') {
            this.scopeValue = true;
        } else if (this.scopeValue === 'false') {
            this.scopeValue = false;
        } else if (this.scopeValue === 'null') {
            this.scopeValue = null;
        } else if (this.scopeValue === 'undefined') {
            this.scopeValue = undefined;
        } else if (parseFloat(this.scopeValue as string).toString() === this.scopeValue) {
            this.scopeValue = parseFloat(this.scopeValue);
        }

        this.props.onWriteScopeValue({
            variableName: this.state.editValue?.name || '',
            scopeNumber: 0,
            newValue: {
                value: this.scopeValue,
                valueType: typeof this.scopeValue,
            },
            callFrameId: this.props.callFrames?.[this.props.currentFrame].callFrameId,
        });

        this.setState({ editValue: null });
        this.scopeValue = null;
    }

    componentDidUpdate(): void {
        //this.editRef.current?.select();
        this.editRef.current?.focus();
    }

    renderScope(scopeId: string, item: DebugVariable, type: 'global' | 'local' | 'closure'): React.JSX.Element {
        const editable =
            !this.props.currentFrame &&
            item.value &&
            (item.value.type === 'undefined' ||
                item.value.type === 'string' ||
                item.value.type === 'number' ||
                item.value.type === 'boolean' ||
                item.value?.value === null ||
                item.value?.value === undefined);

        const el =
            this.state.editValue?.type === type && this.state.editValue?.name === item.name
                ? [
                      <div
                          key="name"
                          style={styles.scopeNameName}
                      >
                          {item.name}
                      </div>,
                      <Box
                          key="="
                          sx={styles.scopeNameEqual}
                      >
                          {' '}
                          ={' '}
                      </Box>,
                      <Input
                          key="input"
                          inputRef={this.editRef}
                          margin="dense"
                          onBlur={() => this.state.editValue && this.setState({ editValue: null })}
                          defaultValue={this.formatValue(item.value, true)}
                          onKeyUp={e => {
                              if (e.key === 'Enter') {
                                  this.onWriteScopeValue();
                              } else if (e.key === 'Escape') {
                                  this.setState({ editValue: null });
                              }
                          }}
                          onChange={e => (this.scopeValue = e.target.value)}
                          endAdornment={
                              <InputAdornment position="end">
                                  <IconButton
                                      onClick={() => this.onWriteScopeValue()}
                                      size="medium"
                                  >
                                      <CheckIcon />
                                  </IconButton>
                              </InputAdornment>
                          }
                      />,
                  ]
                : [
                      <div
                          key="name"
                          style={styles.scopeNameName}
                          title={I18n.t('Double click to write value')}
                      >
                          {item.name}
                      </div>,
                      <Box
                          key="="
                          sx={styles.scopeNameEqual}
                      >
                          {' '}
                          ={' '}
                      </Box>,
                      <div
                          key="val"
                          style={styles.scopeNameValue}
                      >
                          {this.formatValue(item.value)} ({item.value.type})
                      </div>,
                  ];

        return (
            <tr key={`${type}_${scopeId}_${item.name}`}>
                <td style={{ ...styles.scopeType, ...styles[`scopeType_${type}`] }}>{type}</td>
                <td
                    style={{
                        ...styles.scopeName,
                        ...(!this.props.currentFrame && editable ? styles.scopeValueEditable : undefined),
                    }}
                    onDoubleClick={() => {
                        if (editable) {
                            this.scopeValue = item.value.value;
                            this.setState({
                                editValue: {
                                    scopeId,
                                    type,
                                    index: 0,
                                    valueType: item.value.type,
                                    name: item.name,
                                    value: item.value.value,
                                },
                            });
                        }
                    }}
                >
                    {el}
                </td>
            </tr>
        );
    }

    renderScopes(frame: CallFrame): React.JSX.Element | null {
        if (!frame) {
            return null;
        }
        // first local
        const result: React.JSX.Element[] = this.renderExpressions();

        let items = this.props.scopes?.local?.properties?.result.map(
            // @ts-expect-error fix later
            item => this.props.scopes && this.renderScope(this.props.scopes.id, item, 'local'),
        );
        items?.forEach(item => item && result.push(item));

        items = this.props.scopes?.closure?.properties?.result.map(
            // @ts-expect-error fix later
            item => this.props.scopes && this.renderScope(this.props.scopes.id, item, 'closure'),
        );
        items?.forEach(item => item && result.push(item));

        return (
            <table style={{ width: '100%', fontSize: 'small' }}>
                <tbody>{result}</tbody>
            </table>
        );
    }

    render(): React.JSX.Element {
        return (
            <ReactSplit
                direction={SplitDirection.Horizontal}
                initialSizes={this.state.framesSizes}
                minWidths={[100, 200]}
                onResizeFinished={(_gutterIdx, framesSizes) => {
                    this.setState({ framesSizes });
                    window.localStorage.setItem('JS.framesSizes', JSON.stringify(framesSizes));
                }}
                gutterClassName={this.props.themeType === 'dark' ? 'Dark visGutter' : 'Light visGutter'}
            >
                <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
                    <List style={styles.listRoot}>
                        {this.props.callFrames
                            ? this.props.callFrames.map((frame, i) => this.renderOneFrameTitle(frame, i))
                            : null}
                    </List>
                </div>
                <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
                    <Box sx={styles.toolbarScopes}>
                        <IconButton
                            size="small"
                            onClick={() =>
                                this.props.onExpressionAdd((i: number, item: DebugVariable): void => {
                                    this.scopeValue = item.name || '';
                                    this.setState({
                                        editValue: {
                                            type: 'expression',
                                            valueType: 'string',
                                            index: i,
                                            name: item.name,
                                            value: item.name || '',
                                        },
                                    });
                                })
                            }
                        >
                            <IconAdd />
                        </IconButton>
                    </Box>
                    <div style={styles.scopesAfterToolbar}>
                        {this.props.callFrames &&
                            this.props.callFrames.length &&
                            this.renderScopes(this.props.callFrames[this.props.currentFrame])}
                    </div>
                </div>
            </ReactSplit>
        );
    }
}

export default Stack;
