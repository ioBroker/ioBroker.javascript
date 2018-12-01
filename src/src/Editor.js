import React from 'react';
import PropTypes from 'prop-types';
import Toolbar from '@material-ui/core/Toolbar';
import {withStyles} from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';

import {MdSave as IconSave} from 'react-icons/md';
import {MdCancel as IconCancel} from 'react-icons/md';
import {MdClose as IconClose} from 'react-icons/md';
import {MdRefresh as IconRestart} from 'react-icons/md';
import {MdInput as IconDoEdit} from 'react-icons/md';
import {FaClock as IconCron} from 'react-icons/fa';
import {FaClipboardList as IconSelectId} from 'react-icons/fa';
import {FaFileExport as IconExport} from 'react-icons/fa';
import {FaFileImport as IconImport} from 'react-icons/fa';
import {FaFlagCheckered as IconCheck} from 'react-icons/fa';
import {MdGpsFixed as IconLocate} from 'react-icons/md';

import ImgJS from './assets/js.png';
import ImgBlockly from './assets/blockly.png';
import ImgTypeScript from './assets/typescript.png';
import ImgBlockly2Js from './assets/blockly2js.png'

import I18n from './i18n';
import Theme from './Theme';
import ScriptEditor from './Components/ScriptEditorVanilaMonaco';
import BlocklyEditor from './Components/BlocklyEditor';
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
        height: `calc(100% - ${Theme.toolbar.height + 38/*Theme.toolbar.height */ + 1}px)`,
        width: '100%',
        overflow: 'hidden',
        position: 'relative'
    },
    textButton: {
        marginRight: 10,
        minHeight: 24,
        padding: '6px 16px'
    },
    tabIcon: {
        width: 24,
        height: 24,
        verticalAlign: 'middle',
        marginBottom: 2,
        marginRight: 2,
        borderRadius: 3
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
        position: 'absolute',
        top: 8,
        right: 0,
        zIndex: 10,
        padding: 8,
        cursor: 'grabbing'
    },
    notRunning: {
        color: '#ffbc00'
    },
    tabButton: {

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

        this.tabsRef = React.createRef();

        this.state = {
            selected: selected,
            editing: editing, // array of opened scripts
            changed: false,
            blockly: null,
            showBlocklyCode: false,
            showSelectId: false,
            showCron: false,
            insert: '',
            searchText: '',
            theme: this.props.theme,
            visible: props.visible,
            cmdToBlockly: '',
            menuOpened: !!this.props.menuOpened,
            runningInstances: this.props.runningInstances || {}
        };
        /* ----------------------- */
        // required by selectIdDialog in Blockly
        this.selectId = {
            initValue: null,
            callback: null
        };
        this.cron = {
            initValue: null,
            callback: null
        };

        /*const instances = [];
        for (let id in this.props.objects) {
            if (this.props.objects.hasOwnProperty(id) && id.startsWith('system.adapter.') && this.props.objects[id] && this.props.objects[id].type === 'instance') {
                instances.push(id);
            }
        }
        // remove non-existing scripts
        for (let i = editing.length; i >= 0; i --) {
            if (!this.props.objects[editing[i]]) {
                editing.splice(i, 1);
            }
        }*/

        window.systemLang = I18n.getLanguage();
        window.main = {
            objects: this.props.objects,
            instances: [],
            selectIdDialog: (initValue, cb) => {
                this.selectId.callback = cb;
                this.selectId.initValue = initValue;
                this.setState({showSelectId: true});
            },
            cronDialog: (initValue, cb) => {
                this.cron.callback = cb;
                this.cron.initValue = initValue;
                this.setState({showCron: true});
            }
        };
        this.objects = props.objects;
        /* ----------------------- */

        this.scripts = {};

        if (!this.state.selected && this.state.editing.length) {
            this.state.selected = this.state.editing[0];
        }

        // to enable logging
        if (this.props.onSelectedChange && this.state.selected) {
            setTimeout(() => this.props.onSelectedChange(this.state.selected, this.state.editing), 100);
        }
        this.onBrowserCloseBound = this.onBrowserClose.bind(this);
    }

    componentDidMount() {
        window.addEventListener('beforeunload', this.onBrowserCloseBound, false);
    }

    componentWillUnmount() {
        window.removeEventListener('beforeunload', this.onBrowserCloseBound);
    }

    onBrowserClose(e) {
        const isChanged = Object.keys(this.scripts).find(id =>
            JSON.stringify(this.scripts[id]) !== JSON.stringify(this.props.objects[id].common));

        if (!!isChanged) {
            console.log('Script ' + console.log('Script ' + JSON.stringify(this.scripts[isChanged])));
            const message = I18n.t('Configuration not saved.');
            e = e || window.event;
            // For IE and Firefox
            if (e) {
                e.returnValue = message;
            }

            // For Safari
            return message;
        }
    }

    componentWillReceiveProps(nextProps) {
        const newState = {};
        let _changed = false;
        if (JSON.stringify(nextProps.runningInstances) !== JSON.stringify(this.state.runningInstances)) {
            _changed = true;
            newState.runningInstances = nextProps.runningInstances;
        }

        if (this.state.menuOpened !== nextProps.menuOpened) {
            newState.menuOpened = nextProps.menuOpened;
            _changed = true;
        }

        if (this.state.theme !== nextProps.theme) {
            newState.theme = nextProps.theme;
            _changed = true;
        }

        // check if all opened files still exists
        if (this.state.editing && nextProps.objects['system.config']) {
            const isAnyNonExists = this.state.editing.find(id => !nextProps.objects[id]);

            if (isAnyNonExists) {
                // remove non-existing scripts
                const editing = JSON.parse(JSON.stringify(this.state.editing));
                for (let i = editing.length - 1; i >= 0; i--) {
                    if (!this.objects[editing[i]]) {
                        _changed = true;
                        editing.splice(i, 1);
                    }
                }
                if (_changed) {
                    newState.editing = editing;
                }
                if (this.state.selected && !this.objects[this.state.selected]) {
                    _changed = true;
                    newState.selected = editing[0] || '';
                }
            }
        }

        // update search text
        if (this.state.searchText !== nextProps.searchText) {
            newState.searchText = nextProps.searchText;
            _changed = true;
        }

        // if objects read
        if (this.objects !== nextProps.objects) {
            this.objects = nextProps.objects;
            window.main.objects = nextProps.objects;

            // update all scripts
            for (const id in this.scripts) {
                if (!this.scripts.hasOwnProperty(id)) continue;
                const source = this.scripts[id].source;
                this.scripts[id] = JSON.parse(JSON.stringify(this.objects[id].common));
                this.scripts[id].source = source;
            }

            // if script is blockly
            if (this.state.selected && this.objects[this.state.selected]) {
                this.scripts[this.state.selected] = this.scripts[this.state.selected] || JSON.parse(JSON.stringify(this.objects[this.state.selected].common));
                if (this.state.blockly !== (this.scripts[this.state.selected].engineType === 'Blockly')) {
                    newState.blockly = this.scripts[this.state.selected].engineType === 'Blockly';
                    _changed = true;
                }
            }

            // remove non-existing scripts
            const editing = JSON.parse(JSON.stringify(this.state.editing));
            for (let i = editing.length - 1; i >= 0; i--) {
                if (!this.objects[editing[i]]) {
                    _changed = true;
                    editing.splice(i, 1);
                }
            }
            if (this.state.selected && !this.objects[this.state.selected]) {
                newState.selected = editing[0] || '';
            }
            if (_changed) {
                newState.editing = editing;
            }
        } else {
            // update all scripts
            for (const id in this.scripts) {
                if (!this.scripts.hasOwnProperty(id)) continue;
                if (this.objects[id] && this.objects[id].common) {
                    const source = this.scripts[id].source;
                    const commonLocal = JSON.parse(JSON.stringify(this.scripts[id]));
                    commonLocal.source = this.objects[id].common.source;
                    if (JSON.stringify(commonLocal) !== JSON.stringify(this.objects[id].common)) {
                        this.scripts[id] = JSON.parse(JSON.stringify(this.objects[id].common));
                        this.scripts[id].source = source;
                    }

                    if (id === nextProps.selected) {
                        if (this.scripts[id].source !== this.objects[id].common.source) {
                            if (!this.state.changed) {
                                newState.changed = true;
                                _changed = true;
                            }
                        } else {
                            if (this.state.changed) {
                                newState.changed = false;
                                _changed = true;
                            }
                        }
                    }

                } else {
                    delete this.scripts[id];
                    if (this.state.selected === id) {
                        if (this.state.editing.indexOf(id) !== -1) {
                            const editing = JSON.parse(JSON.stringify(this.state.editing));
                            const pos = editing.indexOf(id);
                            if (id !== -1) {
                                editing.splice(pos, 1);
                                newState.editing = editing;
                                _changed = true;
                            }
                        }
                        newState.selected = this.state.editing[0] || '';
                        _changed = true;
                    }
                }
            }
        }

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

            _changed = true;
            newState.changed = changed;
            newState.editing = editing;
            newState.selected = nextProps.selected;
            newState.blockly = this.scripts[nextProps.selected].engineType === 'Blockly';
            newState.showBlocklyCode = false;
        } else {

        }

        if (this.state.visible !== nextProps.visible) {
            _changed = true;
            newState.visible = nextProps.visible;
        }
        _changed && this.setState(newState);
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
                this.scripts[this.state.selected].engineType = 'Javascript/js';
                let source = this.scripts[this.state.selected].source;
                const lines = source.split('\n');
                lines.pop();
                this.scripts[this.state.selected].source = lines.join('\n');
                const nowSelected = this.state.selected;
                this.setState({changed: true, blockly: false, selected: ''}, () => {
                    // force update of the editor
                    setTimeout(() => this.setState({selected: nowSelected}), 100);
                });
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
        return this.scripts[id] && this.props.objects[id] && JSON.stringify(this.scripts[id]) !== JSON.stringify(this.props.objects[id].common);
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
                    const common = newState.selected && (this.scripts[newState.selected] || (this.props.objects[newState.selected] && this.props.objects[newState.selected].common));
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

    sendCommandToBlockly(cmd) {
        this.setState({cmdToBlockly: cmd}, () =>
            setTimeout(() =>
                this.setState({cmdToBlockly: ''}), 200));
    }

    getTabs() {
        if (this.state.editing.length) {
            return (<Tabs
                    key="tabs1"
                    value={this.state.selected}
                    onChange={(event, value) => this.onTabChange(event, value)}
                    indicatorColor="primary"
                    style={{position: 'relative'}}
                    textColor="primary"
                    scrollable
                    scrollButtons="auto"
                >
                    {this.state.editing.map(id => {
                        if (!this.props.objects[id]) {
                            const label = [
                                (<span key="text" className={this.props.classes.tabText + ' ' + (this.isScriptChanged(id) ? this.props.classes.tabChanged : '')}>{id.split('.').pop()}</span>),
                                (<span key="icon" className={this.props.classes.closeButton}><IconClose key="close" onClick={e => this.onTabClose(id, e)} fontSize="small"/></span>)];
                            return (<Tab component={'div'} key={id} label={label} value={id}/>);
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
                                (<span key="icon2" className={this.props.classes.closeButton}><IconClose key="close" onClick={e => this.onTabClose(id, e)} fontSize="small"/></span>)];

                            return (<Tab component={'div'} key={id} label={label} className={this.props.classes.tabButton} value={id} title={title}/>);
                        }
                    })}
                </Tabs>);
        } else {
            return (<div key="tabs2" className={this.props.classes.toolbar}>
                <Button key="select1" disabled={true} className={this.props.classes.hintButton}>
                    <span key="select2">{I18n.t('Click on this icon')}</span>
                    <IconDoEdit key="select3" className={this.props.classes.hintIcon}/>
                    <span key="select4">{I18n.t('for edit or create script')}</span>
                </Button>
            </div>);
        }
    }

    getToolbar() {
        const isInstanceRunning = this.state.selected && this.scripts[this.state.selected] && this.scripts[this.state.selected].engine && this.state.runningInstances[this.scripts[this.state.selected].engine];
        const isScriptRunning = this.state.selected && this.scripts[this.state.selected] && this.scripts[this.state.selected].enabled;

        if (this.state.selected) {
            return (
                <Toolbar variant="dense" className={this.props.classes.toolbar} key="toolbar1">
                    {this.state.menuOpened && this.props.onLocate && (<IconButton className={this.props.classes.toolbarButtons} key="locate" title={I18n.t('Locate file')} onClick={() => this.props.onLocate(this.state.selected)}><IconLocate/></IconButton>)}
                    {!this.state.changed && !isScriptRunning && (<span className={this.props.classes.notRunning}>{I18n.t('Script is not running')}</span>)}
                    {!this.state.changed && isScriptRunning && !isInstanceRunning && (<span className={this.props.classes.notRunning}>{I18n.t('Instance is disabled')}</span>)}
                    {!this.state.changed && isInstanceRunning && (<IconButton key="restart" variant="contained" className={this.props.classes.toolbarButtons} onClick={() => this.onRestart()} title={I18n.t('Restart')}><IconRestart /></IconButton>)}
                    {this.state.changed && (<Button key="save" variant="contained" color="secondary" className={this.props.classes.textButton} onClick={() => this.onSave()}>{I18n.t('Save')}<IconSave /></Button>)}
                    {this.state.changed && (<Button key="cancel" variant="contained" className={this.props.classes.textButton} onClick={() => this.onCancel()}>{I18n.t('Cancel')}<IconCancel /></Button>)}
                    <div style={{flex: 2}}/>

                    {this.state.blockly && !this.state.showBlocklyCode &&
                        (<IconButton key="export" aria-label="Export Blocks"
                                     title={I18n.t('Export blocks')}
                             className={this.props.classes.toolbarButtons}
                             onClick={() => this.sendCommandToBlockly('export')}>
                        <IconExport /></IconButton>)}

                    {this.state.blockly && !this.state.showBlocklyCode &&
                        (<IconButton key="import" aria-label="Import Blocks"
                                     title={I18n.t('Import blocks')}
                                     className={this.props.classes.toolbarButtons}
                                     onClick={() => this.sendCommandToBlockly('import')}>
                            <IconImport /></IconButton>)}

                    {this.state.blockly && !this.state.showBlocklyCode &&
                        (<IconButton key="check" aria-label="Check code"
                                     title={I18n.t('Check blocks')}
                                     className={this.props.classes.toolbarButtons}
                                     onClick={() => this.sendCommandToBlockly('check')}>
                            <IconCheck /></IconButton>)}

                    {!this.state.blockly && !this.state.showBlocklyCode && (<IconButton key="select-cron" aria-label="select ID"
                                                                                        title={I18n.t('Create or edit CRON or time wizard')}
                                                                                        className={this.props.classes.toolbarButtons}
                                                                                        onClick={() => this.setState({showCron: true})}><IconCron/></IconButton>)}

                    {!this.state.blockly && !this.state.showBlocklyCode && (<IconButton key="select-id" aria-label="select ID"
                                                                                        title={I18n.t('Insert object ID')}
                                                                                        className={this.props.classes.toolbarButtons}
                                                                                        onClick={() => this.setState({showSelectId: true})}><IconSelectId/></IconButton>)}

                    {this.state.blockly && this.state.showBlocklyCode && (<Button key="convert2js" aria-label="convert to javascript"
                                                                                  title={I18n.t('Convert blockly to javascript for ever.')}
                                                                                  onClick={() => this.onConvert2JS()}
                    >Blockly=>JS</Button>)}

                    {this.state.blockly && (<Button key="blockly-code" aria-label="blockly"
                                                    title={I18n.t('Show javascript code')}
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
                    searchText={this.state.searchText}
                    onRegisterSelect={func => this.onRegisterSelect(func)}
                    readOnly={this.state.showBlocklyCode}
                    code={this.scripts[this.state.selected].source || ''}
                    isDark={this.state.theme === 'dark'}
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

            return (<div className={this.props.classes.editorDiv} key="blocklyEditorDiv">
                <BlocklyEditor
                    command={this.state.cmdToBlockly}
                    key="BlocklyEditor"
                    theme={this.state.theme}
                    searchText={this.state.searchText}
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
                key="dialogConfirm1"
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
                key="dialogSelectID1"
                prefix={'../..'}
                connection={this.props.connection}
                selected={this.selectId.callback ? this.selectId.initValue || '' : this.getSelect ? this.getSelect() : ''}
                statesOnly={true}
                onClose={() => this.setState({showSelectId: false})}
                onOk={(selected, name) => {
                    this.selectId.initValue = null;
                    if (this.selectId.callback) {
                        this.selectId.callback(selected);
                        this.selectId.callback = null;
                    } else {
                        this.setState({insert: `'${selected}'/*${name}*/`})
                    }
                }}
            />);
        } else {
            return null;
        }
    }

    getCronDialog() {
        if (this.state.showCron) {
            return (<DialogCron
                key="dialogCron1"
                cron={this.cron.callback ? this.cron.initValue || '' : this.getSelect ? this.getSelect() : '* * * * *'}
                onClose={() => this.setState({showCron: false})}
                onOk={cron => {
                    this.cron.initValue = null;
                    if (this.cron.callback) {
                        this.cron.callback(cron);
                        this.cron.callback = null;
                    } else {
                        this.setState({insert: `'${cron}'`})
                    }
                }}
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
    menuOpened: PropTypes.bool,
    onLocate: PropTypes.func,
    runningInstances: PropTypes.object,
    connection: PropTypes.object,
    searchText: PropTypes.string,
    theme: PropTypes.string
};

export default withStyles(styles)(Editor);
