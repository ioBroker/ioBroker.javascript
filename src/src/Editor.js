import React from 'react';
import PropTypes from 'prop-types';
import Toolbar from '@material-ui/core/Toolbar';
import {withStyles} from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';

import {MdPalette as IconDark} from 'react-icons/md';
import {MdSave as IconSave} from 'react-icons/md';
import {MdCancel as IconCancel} from 'react-icons/md';
import {MdClose as IconClose} from 'react-icons/md';
import {MdRefresh as IconRestart} from 'react-icons/md';
import {MdInput as IconDoEdit} from 'react-icons/md';
import {FaClock as IconCron} from 'react-icons/fa';
import {FaClipboardList as IconSelectId} from 'react-icons/fa';

import ImgJS from './assets/js.png';
import ImgBlockly from './assets/blockly.png';
import ImgTypeScript from './assets/typescript.png';
import ImgBlockly2Js from './assets/blockly2js.png'

import I18n from './i18n';
import Theme from './Theme';
import ScriptEditor from './ScriptEditorVanilaMonaco';
import BlocklyEditor from './BlocklyEditor';
import DialogConfirm from './Dialogs/Confirmation';
import DialogSelectID from './Dialogs/SelectID';
import DialogCron from './Dialogs/Cron';

const images = {
    'Blockly': ImgBlockly,
    'Javascript/js': ImgJS,
    def: ImgJS,
    'TypeScript/ts': ImgTypeScript,
};

const styles = theme => ({
    toolbar: {
        minHeight: 38,//Theme.toolbar.height,
        boxShadow: '0px 2px 4px -1px rgba(0, 0, 0, 0.2), 0px 4px 5px 0px rgba(0, 0, 0, 0.14), 0px 1px 10px 0px rgba(0, 0, 0, 0.12)'
    },
    toolbarButtons: {
        padding: 4,
        marginLeft: 4
    },
    editorDiv: {
        height: `calc(100% - ${Theme.toolbar.height + Theme.toolbar.height + 1}px)`,
        width: '100%',
        overflow: 'hidden',
        position: 'relative'
    },
    textButton: {
        marginRight: 10
    },
    tabIcon: {
        width: 24,
        height: 24,
        verticalAlign: 'middle',
        marginBottom: 2,
        marginRight: 2
    },
    hintIcon: {
        //fontSize: 32,
        padding: '0 8px 0 8px'
    },
    hintText: {
        //fontSize: 18
    },
    hintButton: {
        marginTop: 8,
        marginLeft: 10
    },
    tabChanged: {
        color: theme.palette.secondary.main
    },
    tabText: {
        maxWidth: 160,
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
    },
    closeButton: {
        padding: 8,
        verticalAlign: 'middle',
        cursor: 'grabbing'
    }
});

class Editor extends React.Component {
    constructor(props) {
        super(props);

        const selected = window.localStorage.getItem('Editor.selected') || '';
        let editing = window.localStorage.getItem('Editor.editing') || '[]';
        try {
            editing = JSON.parse(editing);
        } catch (e) {
            editing = [];
        }
        if (selected && editing.indexOf(selected) === -1) {
            editing.push(selected);
        }

        this.state = {
            selected: selected,
            editing: editing, // array of opened scripts
            changed: false,
            blockly: null,
            showBlocklyCode: false,
            showSelectId: false,
            showCron: false,
            insert: '',
            isDark: window.localStorage ? (window.localStorage.getItem('Editor.dark') === 'true') : false,
            visible: props.visible
        };

        this.scripts = {};

        if (!this.state.selected && this.state.editing.length) {
            this.state.selected = this.state.editing[0];
        }

        if (this.state.selected && props.objects[this.state.selected]) {
            this.scripts[this.state.selected] = this.scripts[this.state.selected] || JSON.parse(JSON.stringify(props.objects[this.state.selected].common));
            this.state.blockly = this.scripts[this.state.selected].engineType === 'Blockly';
        }

        // to enable logging
        if (this.props.onSelectedChange && this.state.selected) {
            setTimeout(() => this.props.onSelectedChange(this.state.selected, this.state.editing));
        }
    }

    componentWillReceiveProps(nextProps) {
        if (this.state.selected !== nextProps.selected && nextProps.selected) {
            if (nextProps.selected) {
                this.scripts[nextProps.selected] = this.scripts[nextProps.selected] || JSON.parse(JSON.stringify(this.props.objects[nextProps.selected].common));
            }

            const nextCommon = this.props.objects[nextProps.selected] && this.props.objects[nextProps.selected].common;

            const changed = nextCommon && JSON.stringify(this.scripts[nextProps.selected]) !== JSON.stringify(nextCommon);

            const editing = JSON.parse(JSON.stringify(this.state.editing));
            if (nextProps.selected && editing.indexOf(nextProps.selected) === -1) {
                editing.push(nextProps.selected);
                this.props.onSelectedChange(nextProps.selected, editing);
                window.localStorage && window.localStorage.setItem('Editor.editing', JSON.stringify(editing));
            }

            this.setState({
                changed,
                editing,
                selected: nextProps.selected,
                blockly: this.scripts[nextProps.selected].engineType === 'Blockly',
                showBlocklyCode: false
            });
        } else {

        }

        if (this.state.visible !== nextProps.visible) {
            this.setState({visible: nextProps.visible});
        }
    }

    onRestart() {
        this.props.onRestart && this.props.onRestart(this.state.selected);
    }

    onSave() {
        if (this.state.changed) {
            this.setState({changed: false}, () =>
                this.props.onChange && this.props.onChange(this.state.selected, this.scripts[this.state.selected]));
        }
    }

    onCancel() {
        this.scripts[this.state.selected] = JSON.parse(JSON.stringify(this.props.objects[this.state.selected].common));
        this.setState({changed: false});
    }

    onRegisterSelect(func) {
        this.getSelect = func;
    }

    onConvert2JS() {
        this.showConfirmDialog(I18n.t('It will not be possible to revert this operation.'), result => {
            if (result) {

            }
        });
    }

    onChange(newValue) {
        this.scripts[this.state.selected].source = newValue;
        const changed = JSON.stringify(this.scripts[this.state.selected]) !== JSON.stringify(this.props.objects[this.state.selected].common);
        if (changed !== this.state.changed) {
            this.setState({changed});
        }
    }

    onTabChange(event, selected) {
        window.localStorage && window.localStorage.setItem('Editor.selected', selected);
        const common = this.scripts[selected] || (this.props.objects[selected] && this.props.objects[selected].common);
        this.setState({selected, blockly: common.engineType === 'Blockly', showBlocklyCode: false});
        this.props.onSelectedChange && this.props.onSelectedChange(selected, this.state.editing);
    }

    isScriptChanged(id) {
        return this.scripts[id] && JSON.stringify(this.scripts[id]) !== JSON.stringify(this.props.objects[id].common);
    }

    onTabClose(id, e) {
        e && e.stopPropagation();

        const pos = this.state.editing.indexOf(id);
        if (this.state.editing.indexOf(id) !== -1) {
            if (this.isScriptChanged(id)) {
                this.showConfirmDialog(I18n.t('Discard changes for %s', this.props.objects[id].common.name), ok => {
                    if (ok) {
                        delete this.scripts[id];
                        this.onTabClose(id);
                    }
                });
            } else {
                const editing = JSON.parse(JSON.stringify(this.state.editing));
                editing.splice(pos, 1);
                const newState = {editing};
                if (id === this.state.selected) {
                    if (editing.length) {
                        if (pos === 0 || editing.length === 1) {
                            newState.selected = editing[0];
                        } else {
                            newState.selected = editing[pos - 1];
                        }
                    } else {
                        newState.selected = '';
                    }
                } else if (this.state.selected && !editing.length) {
                    newState.selected = '';
                }
                window.localStorage && window.localStorage.setItem('Editor.editing', JSON.stringify(editing));
                if (newState.selected !== undefined) {
                    newState.changed = this.isScriptChanged(newState.selected);
                    const common = newState.selected && (this.scripts[newState.selected] || this.props.objects[newState.selected].common);
                    newState.blockly = common ? common.engineType === 'Blockly' : false;
                    newState.showBlocklyCode = false;
                }

                this.setState(newState, () =>  {
                    if (newState.selected !== undefined) {
                        this.props.onSelectedChange && this.props.onSelectedChange(newState.selected, this.state.editing);
                        window.localStorage && window.localStorage.setItem('Editor.selected', newState.selected);
                    } else {
                        this.props.onSelectedChange && this.props.onSelectedChange(this.state.selected, this.state.editing);
                    }
                });
            }
        }
    }

    showConfirmDialog(question, cb) {
        this.confirmCallback = cb;
        this.setState({confirm: question});
    }

    getTabs() {
        if (this.state.editing.length) {
            return (<Tabs
                key="tabs"
                value={this.state.selected}
                onChange={(event, value) => this.onTabChange(event, value)}
                indicatorColor="primary"
                textColor="primary"
                scrollable
                scrollButtons="auto"
            >
                {this.state.editing.map(id => {
                    if (!this.props.objects[id]) {
                        return (<Tab key={id} label={id.split('.').pop()} value={id}/>);
                    } else {
                        let text = this.props.objects[id].common.name;
                        let title = '';
                        if (text.length > 18) {
                            title = text;
                            text = text.substring(0, 15) + '...';
                        }
                        const label = [
                            (<img key="icon" alt={""} src={images[this.props.objects[id].common.engineType] || images.def} className={this.props.classes.tabIcon}/>),
                            (<span key="text" className={this.props.classes.tabText + ' ' + (this.isScriptChanged(id) ? this.props.classes.tabChanged : '')}>{text}</span>),
                            (<IconClose key="close" onClick={e => this.onTabClose(id, e)} className={this.props.classes.closeButton} fontSize="small"/>)];

                        return (<Tab key={id} label={label} value={id} title={title}/>);
                    }
                })}
            </Tabs>)
        } else {
            return (<div className={this.props.classes.toolbar}>
                <Button disabled={true} className={this.props.classes.hintButton}>{I18n.t('Click on this icon')}<IconDoEdit className={this.props.classes.hintIcon}/>{I18n.t('for edit or create script')}</Button></div>);
        }
    }

    getToolbar() {
        if (this.state.selected) {
            return (
                <Toolbar variant="dense" className={this.props.classes.toolbar} key="toolbar">
                    {!this.state.changed && (<IconButton key="restart" variant="contained" className={this.props.classes.toolbarButtons} onClick={() => this.onRestart()} title={I18n.t('Restart')}><IconRestart /></IconButton>)}
                    {this.state.changed && (<Button key="save" variant="contained" color="secondary" className={this.props.classes.textButton} onClick={() => this.onSave()}>{I18n.t('Save')}<IconSave /></Button>)}
                    {this.state.changed && (<Button key="cancel" variant="contained" className={this.props.classes.textButton} onClick={() => this.onCancel()}>{I18n.t('Cancel')}<IconCancel /></Button>)}
                    <div style={{flex: 2}}/>

                    {!this.state.blockly && (<IconButton key="dark" aria-label="Dark style"
                                                         color={this.state.isDark ? 'secondary' : 'inherit'}
                                                         className={this.props.classes.toolbarButtons}
                                                         onClick={() => {
                                                             this.setState({isDark: !this.state.isDark});
                                                             window.localStorage && window.localStorage.setItem('Editor.dark', this.state.isDark ? 'false' : 'true');
                                                         }}>
                        <IconDark /></IconButton>)}

                    {!this.state.blockly && !this.state.showBlocklyCode && (<IconButton key="select-cron" aria-label="select ID"
                                                                                        className={this.props.classes.toolbarButtons}
                                                                                        onClick={() => this.setState({showCron: true})}><IconCron/></IconButton>)}

                    {!this.state.blockly && !this.state.showBlocklyCode && (<IconButton key="select-id" aria-label="select ID"
                                                                                        className={this.props.classes.toolbarButtons}
                                                                                        onClick={() => this.setState({showSelectId: true})}><IconSelectId/></IconButton>)}

                    {this.state.blockly && this.state.showBlocklyCode && (<Button key="convert2js" aria-label="convert to javascript"
                                                                                  onClick={() => this.onConvert2JS()}
                    >Blockly=>JS</Button>)}

                    {this.state.blockly && (<Button key="blockly-code" aria-label="blockly"
                                                    className={this.props.classes.toolbarButtons}
                                                    color={this.state.showBlocklyCode ? 'secondary' : 'inherit'}
                                                    style={{padding: '0 5px'}}
                                                    onClick={() => this.setState({showBlocklyCode: !this.state.showBlocklyCode})}>
                        <img alt="blockly2js" src={ImgBlockly2Js} /></Button>)}
                </Toolbar>);
        } else {
            return null;
        }
    }

    getScriptEditor() {
        if (this.state.selected && this.props.objects[this.state.selected] && (!this.state.blockly || this.state.showBlocklyCode)) {
            this.scripts[this.state.selected] = this.scripts[this.state.selected] || JSON.parse(JSON.stringify(this.props.objects[this.state.selected].common));

            return (<div className={this.props.classes.editorDiv} key="scriptEditorDiv">
                <ScriptEditor
                    key="scriptEditor"
                    name={this.state.selected}
                    insert={this.state.insert}
                    onInserted={() => this.setState({insert: ''})}
                    onForceSave={() => this.onSave()}
                    onRegisterSelect={func => this.onRegisterSelect(func)}
                    readOnly={this.state.showBlocklyCode}
                    code={this.scripts[this.state.selected].source || ''}
                    isDark={this.state.isDark}
                    connection={this.props.connection}
                    onChange={newValue => this.onChange(newValue)}
                    language={this.scripts[this.state.selected].engineType === 'TypeScript/ts' ? 'typescript' : 'javascript'}
                />
            </div>);
        } else {
            return null;
        }
    }

    getBlocklyEditor() {
        if (this.state.selected && this.props.objects[this.state.selected] && (this.state.blockly && !this.state.showBlocklyCode) && this.state.visible) {
            this.scripts[this.state.selected] = this.scripts[this.state.selected] || JSON.parse(JSON.stringify(this.props.objects[this.state.selected].common));

            return (<div className={this.props.classes.editorDiv} key="BlocklyEditorDiv">
                <BlocklyEditor
                    key="BlocklyEditor"
                    resizing={this.props.resizing}
                    code={this.scripts[this.state.selected].source || ''}
                    onChange={newValue => this.onChange(newValue)}
                />
            </div>);
        } else {
            return null;
        }
    }

    getConfirmDialog() {
        if (this.state.confirm) {
            return (<DialogConfirm
                key="DialogConfirm"
                question={this.state.confirm}
                onClose={() => {
                    this.setState({confirm: ''});
                    if (this.confirmCallback) {
                        const cb = this.confirmCallback;
                        this.confirmCallback = null;
                        cb(false);
                    }
                }}
                onOk={() => {
                    if (this.confirmCallback) {
                        const cb = this.confirmCallback;
                        this.confirmCallback = null;
                        cb(true);
                    }
                }}
            />);
        } else {
            return null;
        }
    }

    getSelectIdDialog() {
        if (this.state.showSelectId) {
            return (<DialogSelectID
                key="DialogSelectID"
                connection={this.props.connection}
                selected={''}
                statesOnly={true}
                onClose={() => this.setState({showSelectId: false})}
                onOk={(selected, name) => this.setState({insert: `'${selected}'/*${name}*/`})}
            />);
        } else {
            return null;
        }
    }

    getCronDialog() {
        if (this.state.showCron) {
            return (<DialogCron
                key="DialogCron"
                cron={this.getSelect ? this.getSelect() : '* * * * *'}
                onClose={() => this.setState({showCron: false})}
                onOk={cron => this.setState({insert: `'${cron}'`})}
            />);
        } else {
            return null;
        }
    }

    render() {
        if (this.state.selected && this.props.objects[this.state.selected] && this.state.blockly === null) {
            setTimeout(() => this.setState({blockly: this.scripts[this.state.selected].engineType === 'Blockly', showBlocklyCode: false}), 100);
        }

        return [
            this.getTabs(),
            this.getToolbar(),
            this.getScriptEditor(),
            this.getBlocklyEditor(),
            this.getConfirmDialog(),
            this.getSelectIdDialog(),
            this.getCronDialog()
        ];
    }
}

Editor.propTypes = {
    objects: PropTypes.object.isRequired,
    selected: PropTypes.string.isRequired,
    onSelectedChange: PropTypes.func.isRequired,
    onRestart: PropTypes.func,
    onChange: PropTypes.func.isRequired,
    visible: PropTypes.bool,
    connection: PropTypes.object
};

export default withStyles(styles)(Editor);
