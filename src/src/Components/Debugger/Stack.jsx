import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import withStyles from '@mui/styles/withStyles';
import SplitterLayout from 'react-splitter-layout';
import ReactJson  from 'react-json-view';

import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Input from '@mui/material/Input';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';

import {MdCheck as CheckIcon} from 'react-icons/md';
import {MdAdd as IconAdd} from 'react-icons/md';
import {MdDelete as IconDelete} from 'react-icons/md';

import I18n from '@iobroker/adapter-react-v5/i18n';

const styles = theme => ({
    frameRoot: {
        paddingTop: 0,
        paddingBottom: 0,
    },
    frameTextRoot: {
        margin: 0,
    },
    frameTextPrimary: {
        color: theme.palette.mode === 'dark' ? '#CCC' : '#333',
    },
    frameTextSecondary: {
        fontStyle: 'italic',
        fontSize: 12,
        opacity: 0.6,
        paddingLeft: theme.spacing(1),
    },

    listRoot: {
        padding: 0,
    },

    scopeType: {
        verticalAlign: 'top',
        textTransform: 'uppercase',
        width: 50,
    },
    scopeType_local: {
        color: '#53a944'
    },
    scopeType_closure: {
        color: '#365b80'
    },
    scopeType_user: {
        color: '#a48a15'
    },
    scopeName: {
        color: '#bc5b5b',
        width: 'calc(100% - 82px)',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
    },
    scopeButton: {
        width: 32
    },
    scopeValueEditable: {
        cursor: 'pointer'
    },
    selectedFrame: {
        backgroundColor: '#777',
        color: 'white'
    },
    splitter: {
        width: '100%',
        height: 'calc(100% - 36px)',
        overflow: 'hidden',
        fontSize: 12
    },

    toolbarScopes: {
        width: 24,
        display: 'inline-block',
        height: '100%',
        background: theme.palette.mode === 'dark' ? '#222' : '#EEE',
        verticalAlign: 'top',
    },
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
    scopeNameEqual: {
        display: 'inline-block',
        color: theme.palette.mode === 'dark' ? '#EEE' : '#222',
        verticalAlign: 'top',
    },
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
        color: '#a44a24'
    },
    valueUndefined: {
        color: '#a44a24'
    },
    valueString: {
        color: '#1e8816'
    },
    valueNumber: {
        color: '#163c88'
    },
    valueBoolean: {
        color: '#a44a24'
    },
    valueObject: {
        color: '#721b70'
    },
    valueNone: {
        color: '#8a8a8a'
    },
    valueFunc: {
        color: '#ac4343'
    }
});

class Stack extends React.Component {
    constructor(props) {
        super(props);

        this.framesSize = parseFloat(window.localStorage.getItem('App.framesSize')) || 300;

        this.state = {
            editValue: null,
            callFrames: this.props.callFrames,
        };

        this.editRef = React.createRef();
    }

    onExpressionNameUpdate() {
        this.props.onExpressionNameUpdate(this.state.editValue.index, this.scopeValue, () => {
            this.setState({editValue: null});
            this.scopeValue = null;
        });
    }

    renderExpression(item, i) {
        const name = this.state.editValue && this.state.editValue.type === 'expression' && this.state.editValue.index === i ?
            <Input
                inputRef={this.editRef}
                fullWidth
                margin="dense"
                onBlur={() => this.state.editValue && this.setState({editValue: null})}
                defaultValue={item.name}
                onKeyUp={e => {
                    if (e.keyCode === 13) {
                        this.onExpressionNameUpdate();
                    } else if (e.keyCode === 27) {
                        this.setState({editValue: null});
                    }
                }}

                onChange={e =>
                    this.scopeValue = e.target.value}

                endAdornment={
                    <InputAdornment position="end">
                        <IconButton onClick={() => this.onExpressionNameUpdate()} size="medium">
                            <CheckIcon/>
                        </IconButton>
                    </InputAdornment>
                }
            />
            :
            [
                <div key="name" className={this.props.classes.scopeNameName} title={I18n.t('Double click to edit expression')}>{item.name}</div>,
                <div key="=" className={this.props.classes.scopeNameEqual}> = </div>,
                <div key="val" className={this.props.classes.scopeNameValue}>{this.formatValue(item.value)}</div>
            ];

        return <tr key={`user_${i}${item.name}`}>
            <td className={clsx(this.props.classes.scopeType, this.props.classes['scopeType_user'])}>user</td>
            <td className={this.props.classes.scopeName}
                onDoubleClick={() => {
                    this.scopeValue = item.name || '';
                    this.setState({
                        editValue: {
                            type: 'expression',
                            valueType: 'string',
                            index: i,
                            name: item.name,
                            value: item.name || ''
                        }
                    });
                }}
            >{name}</td>
            <IconButton
                className={this.props.classes.scopeButtonDel}
                size="small"
                disabled={!!this.state.editValue}
                onClick={() => this.props.onExpressionDelete(i)}
            >
                <IconDelete/>
            </IconButton>
        </tr>
    }

    renderExpressions() {
        return this.props.expressions.map((item, i) => this.renderExpression(item, i));
    }

    renderOneFrameTitle(frame, i) {
        if (this.props.mainScriptId === this.props.currentScriptId && frame.location.scriptId !== this.props.mainScriptId) {
            return null;
        }
        const fileName = frame.url.split('/').pop().replace(/^script\.js\./, '');
        return <ListItem
            key={frame.id}
            button
            onClick={() => this.props.onChangeCurrentFrame(i)}
            dense={true}
            selected={this.props.currentFrame === i}
            classes={{root: this.props.classes.frameRoot}}
        >
            <ListItemText
                classes={{root: this.props.classes.frameTextRoot, primary: this.props.classes.frameTextPrimary, secondary: this.props.classes.frameTextSecondary}}
                title={frame.url}
                primary={frame.functionName || 'anonymous'}
                secondary={`${fileName} (${frame.location.lineNumber}:${frame.location.columnNumber})`}
            />
        </ListItem>;
    }

    formatValue(value, forEdit) {
        if (!value) {
            if (forEdit) {
                return 'none';
            } else {
                return <span className={this.props.classes.valueNone}>none</span>;
            }
        } else if (value.type === 'function') {
            const text = value.description ? (value.description.length > 100 ? value.description.substring(0, 100) + '...' : value.description) : 'function';
            if (forEdit) {
                return text;
            } else {
                return <span className={this.props.classes.valueFunc} title={value.description}>{text}</span>;
            }
        } else if (value.value === undefined) {
            if (forEdit) {
                return 'undefined';
            } else {
                return <span className={this.props.classes.valueUndefined}>undefined</span>;
            }
        } else if (value.value === null) {
            if (forEdit) {
                return 'null';
            } else {
                return <span className={this.props.classes.valueNull}>null</span>;
            }
        } else if (value.type === 'string') {
            if (forEdit) {
                return value.value;
            } else {
                const text = value.value ? (value.value.length > 100 ? value.value.substring(0, 100) + '...' : value.value) : '';
                return <span className={this.props.classes.valueString} title={text}>"{text}"</span>;
            }
        } else if (value.type === 'boolean') {
            if (forEdit) {
                return value.value.toString();
            } else {
                return <span className={this.props.classes.valueBoolean}>{value.value.toString()}</span>;
            }
        } else if (value.type === 'object') {
            if (forEdit) {
                return JSON.stringify(value.value);
            } else {
                return <ReactJson
                    enableClipboard={false}
                    style={{backgroundColor: 'inherit', marginTop: 3}}
                    src={value.value}
                    collapsed={true}
                    theme={this.props.themeType === 'dark' ? 'brewer' : 'rjv-default'}
                    displayDataTypes={false}
                />;
            }
        } else {
            return value.value.toString();
        }
    }

    onWriteScopeValue() {
        if (this.scopeValue === 'true') {
            this.scopeValue = true;
        } else if (this.scopeValue === 'false') {
            this.scopeValue = false;
        } else if (this.scopeValue === 'null') {
            this.scopeValue = null;
        } else if (this.scopeValue === 'undefined') {
            this.scopeValue = undefined;
        } else
        if (parseFloat(this.scopeValue).toString() === this.scopeValue) {
            this.scopeValue = parseFloat(this.scopeValue);
        }

        this.props.onWriteScopeValue({
            variableName: this.state.editValue.name,
            scopeNumber: 0,
            newValue: {
                value: this.scopeValue,
                valueType: typeof this.scopeValue,
            },
            callFrameId: this.props.callFrames[this.props.currentFrame].callFrameId
        });

        this.setState({editValue: null});
        this.scopeValue = null;
    }

    componentDidUpdate() {
        //this.editRef.current?.select();
        this.editRef.current?.focus();
    }

    renderScope(scopeId, item, type) {
        const editable = !this.props.currentFrame && item.value && (item.value.type === 'undefined' || item.value.type === 'string' || item.value.type === 'number' || item.value.type === 'boolean' || item.value?.value === null || item.value?.value === undefined);

        const el = this.state.editValue && this.state.editValue.type === type && this.state.editValue.name === item.name ?
            [
                <div key="name" className={this.props.classes.scopeNameName}>{item.name}</div>,
                <div key="=" className={this.props.classes.scopeNameEqual}> = </div>,
                <Input
                    inputRef={this.editRef}
                    margin="dense"
                    onBlur={() => this.state.editValue && this.setState({editValue: null})}
                    defaultValue={this.formatValue(item.value, true)}
                    onKeyUp={e => {
                        if (e.keyCode === 13) {
                            this.onWriteScopeValue()
                        } else if (e.keyCode === 27) {
                            this.setState({editValue: null})
                        }
                    }}
                    onChange={e =>
                        this.scopeValue = e.target.value}
                    endAdornment={
                        <InputAdornment position="end">
                            <IconButton onClick={() => this.onWriteScopeValue()} size="medium">
                                <CheckIcon/>
                            </IconButton>
                        </InputAdornment>
                    }
                />
            ]
            :
            [
                <div key="name" className={this.props.classes.scopeNameName} title={I18n.t('Double click to write value')}>{item.name}</div>,
                <div key="=" className={this.props.classes.scopeNameEqual}> = </div>,
                <div key="val" className={this.props.classes.scopeNameValue}>{this.formatValue(item.value)} ({item.value.type})</div>
            ];


        return <tr key={`${type}_${scopeId}_${item.name}`}>
            <td className={clsx(this.props.classes.scopeType, this.props.classes['scopeType_' + type])}>{type}</td>
            <td
                className={clsx(this.props.classes.scopeName, !this.props.currentFrame && editable && this.props.classes.scopeValueEditable)}
                onDoubleClick={() => {
                    if (editable) {
                        this.scopeValue = item.value.value;
                        this.setState({
                            editValue: {
                                scopeId,
                                type,
                                valueType: item.value.type,
                                name: item.name,
                                value: item.value.value
                            }
                        });
                    }
                }}
            >{el}</td>
        </tr>;
    }

    renderScopes(frame) {
        if (!frame) {
            return null;
        } else {
            // first local
            let result = this.renderExpressions();

            let items = this.props.scopes?.local?.properties?.result.map(item => this.renderScope(this.props.scopes.id, item, 'local'));
            items && items.forEach(item => result.push(item));

            items = this.props.scopes?.closure?.properties?.result.map(item => this.renderScope(this.props.scopes.id, item, 'closure'));
            items && items.forEach(item => result.push(item));

            return <table style={{width: '100%'}}>
                <tbody>
                    {result}
                </tbody>
            </table>;
        }
    }

    render() {
        return <SplitterLayout
            customClassName={this.props.classes.splitter}
            primaryIndex={1}
            secondaryMinSize={200}
            primaryMinSize={200}
            vertical={false}
            secondaryInitialSize={this.framesSize}
            onSecondaryPaneSizeChange={size => this.framesSize = parseFloat(size)}
            onDragEnd={() => window.localStorage.setItem('App.framesSize', this.framesSize.toString())}
        >
            <div style={{width: '100%', height: '100%', overflow: 'auto'}}>
                <List classes={{root: this.props.classes.listRoot}}>
                    {this.props.callFrames ? this.props.callFrames.map((frame, i) =>
                        this.renderOneFrameTitle(frame, i)) : null}
                </List>
            </div>
            <div style={{width: '100%', height: '100%', overflow: 'auto'}}>
                <div className={this.props.classes.toolbarScopes}>
                    <IconButton size="small" onClick={() => this.props.onExpressionAdd((i, item) => {
                        this.scopeValue = item.name || '';
                        this.setState({
                            editValue: {
                                type: 'expression',
                                valueType: 'string',
                                index: i,
                                name: item.name,
                                value: item.name || ''
                            }
                        });
                    })}><IconAdd/></IconButton>
                </div>
                <div className={this.props.classes.scopesAfterToolbar}>
                    {this.props.callFrames && this.props.callFrames.length && this.renderScopes(this.props.callFrames[this.props.currentFrame])}
                </div>
            </div>
        </SplitterLayout>;
    }
}

Stack.propTypes = {
    currentScriptId: PropTypes.string,
    mainScriptId: PropTypes.string,
    scopes: PropTypes.object,
    expressions: PropTypes.array,
    callFrames: PropTypes.array,
    currentFrame: PropTypes.number,
    onChangeCurrentFrame: PropTypes.func,
    onWriteScopeValue: PropTypes.func,
    onExpressionDelete: PropTypes.func,
    onExpressionAdd: PropTypes.func,
    onExpressionNameUpdate: PropTypes.func,
    themeType: PropTypes.string,
};

export default withStyles(styles)(Stack);
