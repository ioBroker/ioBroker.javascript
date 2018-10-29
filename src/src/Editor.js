import React from 'react';
import PropTypes from 'prop-types';
import Toolbar from '@material-ui/core/Toolbar';
import {withStyles} from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';

import {MdPalette as IconDark} from 'react-icons/md';
import {MdSave as IconSave} from 'react-icons/md';
import {MdCancel as IconCancel} from 'react-icons/md';

import I18n from './i18n';
import Theme from './Theme';
import ScriptEditor from './ScriptEditor';

const styles = theme => ({
    toolbar: {
        minHeight: Theme.toolbar.height,
        boxShadow: '0px 2px 4px -1px rgba(0, 0, 0, 0.2), 0px 4px 5px 0px rgba(0, 0, 0, 0.14), 0px 1px 10px 0px rgba(0, 0, 0, 0.12)'
    },
    editorDiv: {
        height: `calc(100% - ${Theme.toolbar.height}px)`,
        width: '100%',
        overflow: 'hidden'
    },
    textButton: {
        marginRight: 10
    }
});

class Editor extends React.Component {
    constructor(props) {
        super(props);
        window.editorStore = window.editorStore || {};

        this.script = this.props.script || {source: '', engineType: 'Javascript/js'};
        this.id = this.props.id;

        window.editorStore[this.id] = window.editorStore[this.id] || this.script.source;

        this.state = {
            changed: window.editorStore[this.id] !== this.script.source,
            isDark: window.localStorage ? (window.localStorage.getItem('Editor.dark') === 'true') : false,
            visible: props.visible
        };
    }

    componentWillReceiveProps(nextProps) {
        if (this.id !== nextProps.id) {
            this.id = nextProps.id;
            this.script = nextProps.script || {source: '', engineType: 'Javascript/js'};
            window.editorStore[this.id] = this.script.source;
            this.state.changed && this.setState({changed: false});
        } else {
            if (!this.state.changed) {
                this.script = nextProps.script || {source: '', engineType: 'Javascript/js'};
                window.editorStore[this.id] = this.script.source;
                this.forceUpdate();
            }
        }
        if (this.state.visible !== nextProps.visible) {

        }
    }

    onSave() {
        this.script.source = window.editorStore[this.props.id];
        this.setState({changed: false}, () => {
            this.props.onChange && this.props.onChange(this.props.id, this.script);
        });
    }

    onCancel() {
        window.editorStore[this.props.id] = this.script.source;
        this.setState({changed: false});
    }

    getToolbar() {
        return (
            <Toolbar variant="dense" className={this.props.classes.toolbar} key="toolbar">
                {this.state.changed && (<Button key="save" variant="contained" color="secondary" className={this.props.classes.textButton} onClick={() => this.onSave()}>{I18n.t('Save')}<IconSave /></Button>)}
                {this.state.changed && (<Button key="cancel" variant="contained" className={this.props.classes.textButton} onClick={() => this.onCancel()}>{I18n.t('Cancel')}<IconCancel /></Button>)}
                <IconButton key="dark" aria-label="Dark style"
                            color={this.state.isDark ? 'secondary' : 'inherit'}
                            onClick={() => {
                                this.setState({isDark: !this.state.isDark});
                                window.localStorage && window.localStorage.setItem('Editor.dark', this.state.isDark ? 'false' : 'true');
                            }}>
                                <IconDark /></IconButton>
            </Toolbar>);
    }

    onChange(newValue) {
        window.editorStore[this.props.id] = newValue;
        const changed = this.script.source !== window.editorStore[this.props.id];
        if (changed !== this.state.changed) {
            this.setState({changed})
        }
    }

    getScriptEditor() {
        if (this.id) {
            return (<div className={this.props.classes.editorDiv} key="editor">
                <ScriptEditor
                    code={window.editorStore[this.props.id]}
                    isDark={this.state.isDark}
                    onChange={newValue => this.onChange(newValue)}
                    language={this.script.engineType === 'TypeScript/ts' ? 'typescript' : 'javascript'}
                />
            </div>);
        } else {
            return null;
        }
    }

    render() {
        return [
                this.getToolbar(),
                this.getScriptEditor()
            ];
    }
}

Editor.propTypes = {
    script: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
    visible: PropTypes.bool
};

export default withStyles(styles)(Editor);
