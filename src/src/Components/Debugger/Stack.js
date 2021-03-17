import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {withStyles} from '@material-ui/core/styles';
import SplitterLayout from 'react-splitter-layout';

import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Input from '@material-ui/core/Input';
import InputAdornment from '@material-ui/core/InputAdornment';
import IconButton from '@material-ui/core/IconButton';
import List from '@material-ui/core/List';

import {MdCheck as CheckIcon} from 'react-icons/md';
import {MdAdd as IconAdd} from 'react-icons/md';
import {MdDelete as IconDelete} from 'react-icons/md';

const styles = theme => ({
    frameRoot: {
        paddingTop: 0,
        paddingBottom: 0,
    },
    frameTextRoot: {
        margin: 0,
    },
    frameTextPrimary: {
        color: theme.palette.type === 'dark' ? '#CCC' : '#333',
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
        textTransform: 'uppercase',
        width: 50,
    },
    scopeType_local: {
        color: '#53a944'
    },
    scopeType_closure: {
        color: '#365b80'
    },
    scopeName: {
        fontWeight: 'bold',
        color: '#bc5b5b'
    },
    scopeValue: {
        color: '#3b709f'
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
        background: theme.palette.type === 'dark' ? '#222' : '#EEE',
        verticalAlign: 'top',
    },
    scopesAfterToolbar: {
        width: 'calc(100% - 24px)',
        display: 'inline-block',
        height: '100%',
        verticalAlign: 'top',
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
    }

    renderExpression(item, i) {
        const el = this.state.editValue && this.state.editValue.type === 'expression' && this.state.editValue.index === i ?
            <Input
                fullWidth
                margin="dense"
                onBlur={() => this.state.editValue && this.setState({editValue: null})}
                defaultValue={Stack.formatValue(item.value, true)}
                onKeyUp={e => e.keyCode === 13 && this.onWriteScopeValue()}

                onChange={e =>
                    this.scopeValue = e.target.value}

                endAdornment={
                    <InputAdornment position="end">
                        <IconButton onClick={() => this.onWriteScopeValue()}>
                            <CheckIcon/>
                        </IconButton>
                    </InputAdornment>
                }
            />
            :
            Stack.formatValue(item.value);

        return <tr key={`user_${i}${item.name}`}>
            <td className={clsx(this.props.classes.scopeType, this.props.classes['scopeType_user'])}>user</td>
            <td className={this.props.classes.scopeName}>{item.name}</td>
            <td className={clsx(this.props.classes.scopeValue, this.props.classes.scopeValueEditable)}
                onClick={() => {
                    this.scopeValue = item.value?.value || '';
                    this.setState({
                        editValue: {
                            type: 'expression',
                            valueType: item.value.type,
                            index: i,
                            name: item.name,
                            value: item.value?.value || ''
                        }
                    });
                }}
            >{el}</td>
            <td className={this.props.classes.scopeButton}>
                <IconButton
                    size="small"
                    disabled={this.state.editValue}
                    onClick={this.onExpressionDelete(i)}
                >
                    <IconDelete/>
                </IconButton>
            </td>
        </tr>
    }

    renderExpressions() {
        return null;
        return Object.keys(this.props.expressions).map((item, i) => this.renderExpression(item, i));
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
            classes={{root: clsx(this.props.classes.frameRoot, this.props.currentFrame === i && this.props.classes.selectedFrame)}}
        >
            <ListItemText
                classes={{root: this.props.classes.frameTextRoot, primary: this.props.classes.frameTextPrimary, secondary: this.props.classes.frameTextSecondary}}
                title={frame.url}
                primary={frame.functionName || 'anonymous'}
                secondary={`${fileName} (${frame.location.lineNumber}:${frame.location.columnNumber})`}
            />
        </ListItem>;
    }

    static formatValue(value, forEdit) {
        if (!value) {
            return 'none';
        } else if (value.type === 'function') {
            return value.description ? (value.description.length > 100 ? value.description.substring(0, 100) + '...' : value.description) : 'function';
        } else if (value.value === undefined) {
            return 'undefined';
        } else if (value.value === null) {
            return 'null';
        } else if (value.type === 'string') {
            return forEdit ? value.value : `"${value.value}"`;
        } else if (value.type === 'boolean') {
            return value.value.toString();
        } else if (value.type === 'object') {
            return JSON.stringify(value.value);
        }else {
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
                value: this.scopeValue
            },
            callFrameId: this.props.callFrames[this.props.currentFrame].callFrameId
        });

        this.setState({editValue: null});
        this.scopeValue = null;
    }

    renderScope(scopeId, item, type) {
        const editable = !this.props.currentFrame && item.value && (item.value.type === 'undefined' || item.value.type === 'string' || item.value.type === 'number' || item.value.type === 'boolean');

        const el = this.state.editValue && this.state.editValue.type === type && this.state.editValue.name === item.name ?
            <Input
                fullWidth
                margin="dense"
                onBlur={() => this.state.editValue && this.setState({editValue: null})}
                defaultValue={Stack.formatValue(item.value, true)}
                onKeyUp={e => e.keyCode === 13 && this.onWriteScopeValue()}
                onChange={e =>
                    this.scopeValue = e.target.value}
                endAdornment={
                    <InputAdornment position="end">
                        <IconButton onClick={() => this.onWriteScopeValue()}>
                            <CheckIcon/>
                        </IconButton>
                    </InputAdornment>
                }
            />
            :
            Stack.formatValue(item.value);

        return <tr key={`${type}_${scopeId}_${item.name}`}>
            <td className={clsx(this.props.classes.scopeType, this.props.classes['scopeType_' + type])}>{type}</td>
            <td className={this.props.classes.scopeName}>{item.name}</td>
            <td className={clsx(this.props.classes.scopeValue, !this.props.currentFrame && editable && this.props.classes.scopeValueEditable)}
                onClick={() => {
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
                }}>
                {el}
            </td>
            <td className={this.props.classes.scopeButton}/>
        </tr>;
    }

    renderScopes(frame) {
        if (!frame) {
            return null;
        } else {
            // first local
            let result = [];
            let items = this.renderExpressions();

            items = this.props.scopes?.local?.properties?.result.map(item => this.renderScope(this.props.scopes.id, item, 'local'));
            items && items.forEach(item => result.push(item));

            items = this.props.scopes?.closure?.properties?.result.map(item => this.renderScope(this.props.scopes.id, item, 'local'));
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
            <div style={{width: '100%', height: '100%', overflow: 'hidden'}}>
                <List classes={{root: this.props.classes.listRoot}}>
                    {this.props.callFrames ? this.props.callFrames.map((frame, i) =>
                        this.renderOneFrameTitle(frame, i)) : null}
                </List>
            </div>
            <div style={{width: '100%', height: '100%', overflow: 'hidden'}}>
                <div className={this.props.classes.toolbarScopes}>
                    <IconButton size="small" onClick={() => this.props.onExpressionAdd()}><IconAdd/></IconButton>
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
};

export default withStyles(styles)(Stack);
