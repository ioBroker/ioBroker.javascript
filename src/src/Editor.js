import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import Toolbar from '@material-ui/core/Toolbar';
import {withStyles} from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Badge from '@material-ui/core/Badge';
import Snackbar from '@material-ui/core/Snackbar';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Checkbox from '@material-ui/core/Checkbox';

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
import {MdClearAll as IconCloseAll} from 'react-icons/md';
import {MdBuild as IconDebugMenu} from 'react-icons/md';
import {MdBugReport as IconDebug} from 'react-icons/md';
import {MdPlaylistAddCheck as IconVerbose} from 'react-icons/md';

import ImgJS from './assets/js.png';
import ImgBlockly from './assets/blockly.png';
import ImgTypeScript from './assets/typescript.png';
import ImgBlockly2Js from './assets/blockly2js.png'

import I18n from '@iobroker/adapter-react/i18n';
import ScriptEditorComponent from './Components/ScriptEditorVanilaMonaco';
import BlocklyEditor from './Components/BlocklyEditor';
import DialogConfirm from '@iobroker/adapter-react/Dialogs/Confirm';
import DialogSelectID from '@iobroker/adapter-react/Dialogs/SelectID';
import DialogCron from './Dialogs/Cron';
import DialogScriptEditor from './Dialogs/ScriptEditor';


const images = {
    'Blockly': ImgBlockly,
    'Javascript/js': ImgJS,
    def: ImgJS,
    'TypeScript/ts': ImgTypeScript,
};

const MENU_ITEM_HEIGHT = 48;
const COLOR_DEBUG = '#02a102';
const COLOR_VERBOSE = '#70aae9';

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
        height: `calc(100% - ${theme.toolbar.height + 38/*Theme.toolbar.height */ + 1}px)`,
        width: '100%',
        overflow: 'hidden',
        position: 'relative'
    },
    textButton: {
        marginRight: 10,
        minHeight: 24,
        padding: '6px 16px'
    },
    textIcon: {
        marginLeft: theme.spacing(1),
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
        marginLeft: 20
    },
    tabMenuButton: {
        position: 'absolute',
        top: 0,
        right: 0,
    },
    tabChanged: {
        color: theme.palette.secondary.main
    },
    tabText: {
        maxWidth: 130,
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        display: 'inline-block',
        verticalAlign: 'middle',
    },
    tabChangedIcon: {
        color: '#FF0000',
        fontSize: 16
    },
    closeButton: {
        position: 'absolute',
        top: 8,
        right: 0,
        zIndex: 10,
        padding: 8,
        cursor: 'pointer'
    },
    notRunning: {
        color: '#ffbc00',
        marginRight: theme.spacing(1)
    },
    tabButton: {

    },
    tabButtonWrapper: {
        display: 'inline-block',
    },
    menuIcon: {
        width: 18,
        height: 18,
        borderRadius: 2,
        marginRight: 5
    },
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
            changed: {}, // for every script
            blockly: null,
            debugEnabled: false,
            verboseEnabled: false,
            showBlocklyCode: false,
            showSelectId: false,
            showCron: false,
            showScript: false,
            insert: '',
            searchText: '',
            themeType: this.props.themeType,
            visible: props.visible,
            cmdToBlockly: '',
            menuOpened: !!this.props.menuOpened,
            menuTabsOpened: false,
            menuTabsAnchorEl: null,
            runningInstances: this.props.runningInstances || {},
            showDebugMenu: false,
            toast: '',
            instancesLoaded: false,
        };

        this.setChangedInAdmin();

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
        this.scriptDialog = {
            initValue: null,
            callback: null,
            args: null,
            isReturn: false
        };

        window.systemLang = I18n.getLanguage();
        window.main = {
            objects: {},
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
            },
            showScriptDialog: (value, args, isReturn, cb) => {
                this.scriptDialog.callback = cb;
                this.scriptDialog.initValue = value;
                this.scriptDialog.args = args;
                this.scriptDialog.isReturn = isReturn || false;
                this.setState({showScript: true});
            }
        };

        this.objects = props.objects;
        /* ----------------------- */

        this.scripts = {};

        if (!this.state.selected && this.state.editing.length) {
            this.state.selected = this.state.editing[0];
        }

        this.getAllAdapterInstances()
            .then(() => {
                // to enable logging
                if (this.props.onSelectedChange && this.state.selected) {
                    setTimeout(() => this.props.onSelectedChange(this.state.selected, this.state.editing), 100);
                }
            });
    }

    getAllAdapterInstances() {
        return this.props.socket.getAdapterInstances(true)
            .then(instanceObjects => {
                const objects = {};
                const instances = instanceObjects.map(obj => {
                    objects[obj._id] = obj;
                    return obj._id;
                });
                window.main.objects = objects;
                window.main.instances = instances;
                this.setState({instancesLoaded: true});
            });
    }

    onInstanceChanged = (id, obj) => {
        if (!id) {
            return;
        }

        if (!obj && window.main.instances.includes[id]) {
            delete window.main.objects[id];
            const pos = window.main.instances.indexOf(id);
            window.main.instances.splice(pos, 1);
        } else
        if (obj && obj.type === 'instance') {
            // update instances
            if (!window.main.instances.includes(id)) {
                window.main.instances.push(id);
                window.main.instances.sort();
            }
            window.main.objects[id] = obj;
        }
    };

    setChangedInAdmin() {
        const isChanged = Object.keys(this.state.changed).find(id => this.state.changed[id]);

        if (typeof window.parent !== 'undefined' && window.parent) {
            window.parent.configNotSaved = isChanged;
        }
    }

    componentDidMount() {
        window.addEventListener('beforeunload', this.onBrowserClose, false);
        this.props.socket.subscribeObject('system.adapter.*', this.onInstanceChanged);
    }

    componentWillUnmount() {
        window.removeEventListener('beforeunload', this.onBrowserClose);
        this.props.socket.unsubscribeObject('system.adapter.*', this.onInstanceChanged);
    }

    onBrowserClose = e => {
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
    };

    removeNonExistingScripts(nextProps, newState) {
        nextProps = nextProps || this.props;
        newState = newState || {};

        let _changed = false;
        if (this.state.editing) {
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
                    if (this.scripts[newState.selected]) {
                        if (this.state.blockly !== (this.scripts[newState.selected].engineType === 'Blockly')) {
                            newState.blockly = this.scripts[newState.selected].engineType === 'Blockly';
                            _changed = true;
                        }
                        if (this.state.verboseEnabled !== this.scripts[newState.selected].verbose) {
                            newState.verboseEnabled = this.scripts[newState.selected].verbose;
                            _changed = true;
                        }
                        if (this.state.debugEnabled !== this.scripts[newState.selected].debug) {
                            newState.debugEnabled = this.scripts[newState.selected].debug;
                            _changed = true;
                        }
                    }
                }
            }
        }
        return _changed;
    }

    UNSAFE_componentWillReceiveProps(nextProps) {
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

        if (this.state.themeType !== nextProps.themeType) {
            newState.themeType = nextProps.themeType;
            _changed = true;
        }

        // check if all opened files still exists
        if (this.removeNonExistingScripts(nextProps, newState)) {
            _changed = true;
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
            Object.keys(this.scripts).forEach(id => {
                const source = this.scripts[id].source;
                this.scripts[id] = JSON.parse(JSON.stringify(this.objects[id].common));
                this.scripts[id].source = source;
            });

            // if script is blockly
            if (this.state.selected && this.objects[this.state.selected]) {
                this.scripts[this.state.selected] = this.scripts[this.state.selected] || JSON.parse(JSON.stringify(this.objects[this.state.selected].common));
                if (this.state.blockly !== (this.scripts[this.state.selected].engineType === 'Blockly')) {
                    newState.blockly = this.scripts[this.state.selected].engineType === 'Blockly';
                    _changed = true;
                }
                if (this.state.verboseEnabled !== this.scripts[this.state.selected].verbose) {
                    newState.verboseEnabled = this.scripts[this.state.selected].verbose;
                    _changed = true;
                }
                if (this.state.debugEnabled !== this.scripts[this.state.selected].debug) {
                    newState.debugEnabled = this.scripts[this.state.selected].debug;
                    _changed = true;
                }
            }

            // remove non-existing scripts
            const editing = JSON.parse(JSON.stringify(this.state.editing));
            for (let i = editing.length - 1; i >= 0; i--) {
                if (!this.objects[editing[i]]) {
                    _changed = true;
                    editing.splice(i, 1);
                    if (this.state.changed[editing[i]] !== undefined) {
                        newState.changed = newState.changed || JSON.parse(JSON.stringify(this.state.changed));
                        delete newState.changed[editing[i]];
                    }
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
                    const oldSource = this.scripts[id].source;
                    const commonLocal = JSON.parse(JSON.stringify(this.scripts[id]));
                    commonLocal.source = this.objects[id].common.source;
                    // if anything except source was changed
                    if (JSON.stringify(commonLocal) !== JSON.stringify(this.objects[id].common)) {
                        this.scripts[id] = JSON.parse(JSON.stringify(this.objects[id].common));
                        this.scripts[id].source = oldSource;
                    }

                    if (oldSource !== this.objects[id].common.source) {
                        // take new script if it not yet changed
                        if (!this.state.changed[id]) {
                            // just use new value
                            this.scripts[id].source = this.objects[id].common.source;
                        } else {
                            if (this.objects[id].from && this.objects[id].from.startsWith('system.adapter.javascript.')) {
                                this.objects[id].from = 'system.adapter.admin.0';
                                // show that script was changed from outside
                                this.setState({toast: I18n.t('Script %s was modified on disk.', id.split('.').pop())});
                            }
                        }
                    } else {
                        if (this.state.changed[id]) {
                            newState.changed = newState.changed || JSON.parse(JSON.stringify(this.state.changed));
                            newState.changed[id] = false;
                            _changed = true;
                        }
                    }
                } else {
                    delete this.scripts[id];
                    if (this.state.selected === id) {
                        if (this.state.editing.indexOf(id) !== -1) {
                            const editing = JSON.parse(JSON.stringify(this.state.editing));
                            const pos = editing.indexOf(id);
                            if (pos !== -1) {
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
            newState.changed = newState.changed || JSON.parse(JSON.stringify(this.state.changed));
            newState.changed[nextProps.selected] = changed;
            newState.editing = editing;
            newState.selected = nextProps.selected;
            newState.blockly = this.scripts[nextProps.selected].engineType === 'Blockly';
            newState.verboseEnabled = this.scripts[nextProps.selected].verbose;
            newState.debugEnabled = this.scripts[nextProps.selected].debug;
            newState.showBlocklyCode = false;
        } else {

        }

        if (this.state.visible !== nextProps.visible) {
            _changed = true;
            newState.visible = nextProps.visible;
        }
        _changed && this.setState(newState, () => this.setChangedInAdmin());
    }

    onRestart() {
        this.props.onRestart && this.props.onRestart(this.state.selected);
    }

    onSave() {
        if (this.state.changed[this.state.selected]) {
            const changed = JSON.parse(JSON.stringify(this.state.changed));
            changed[this.state.selected] = false;
            this.setState({changed}, () => {
                this.setChangedInAdmin();
                this.props.onChange && this.props.onChange(this.state.selected, this.scripts[this.state.selected]);
            });
        }
    }

    onSaveAll() {
        const changed = JSON.parse(JSON.stringify(this.state.changed));
        Object.keys(changed)
            .forEach(id => {
                if (changed[id]) {
                    changed[id] = false;
                    this.props.onChange && this.props.onChange(id, this.scripts[id]);
                }
            });

        this.setState({ changed }, () =>
            this.setChangedInAdmin());
    }

    onCancel() {
        this.scripts[this.state.selected] = JSON.parse(JSON.stringify(this.props.objects[this.state.selected].common));

        const changed = JSON.parse(JSON.stringify(this.state.changed));
        changed[this.state.selected] = false;

        this.setState({changed}, () => this.setChangedInAdmin());
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

                const changed = JSON.parse(JSON.stringify(this.state.changed));
                changed[this.state.selected] = true;

                this.setState({changed, blockly: false, selected: ''}, () => {
                    this.setChangedInAdmin();
                    // force update of the editor
                    setTimeout(() => this.setState({selected: nowSelected}), 100);
                });
            }
        });
    }

    onChange(options) {
        options = options || {};
        if (options.script !== undefined) {
            this.scripts[this.state.selected].source = options.script;
        }
        if (options.debug !== undefined) {
            this.scripts[this.state.selected].debug = options.debug;
        }
        if (options.verbose !== undefined) {
            this.scripts[this.state.selected].verbose = options.verbose;
        }
        const _changed = JSON.stringify(this.scripts[this.state.selected]) !== JSON.stringify(this.props.objects[this.state.selected].common);
        if (_changed !== (this.state.changed[this.state.selected] || false)) {

            const changed = JSON.parse(JSON.stringify(this.state.changed));
            changed[this.state.selected] = _changed;
            this.objects[this.state.selected].from = 'system.adapter.admin.0';
            this.setState({changed}, () => this.setChangedInAdmin());

        }
    }

    onTabChange(event, selected) {
        window.localStorage && window.localStorage.setItem('Editor.selected', selected);
        const common = this.scripts[selected] || (this.props.objects[selected] && this.props.objects[selected].common);
        this.setState({selected, blockly: common.engineType === 'Blockly', showBlocklyCode: false, verboseEnabled: common.verbose, debugEnabled: common.debug});
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
                    newState.changed = newState.changed || JSON.parse(JSON.stringify(this.state.changed));
                    newState.changed[newState.selected] = this.isScriptChanged(newState.selected);
                    const common = newState.selected && (this.scripts[newState.selected] || (this.props.objects[newState.selected] && this.props.objects[newState.selected].common));
                    newState.blockly = common ? common.engineType === 'Blockly' : false;
                    newState.verboseEnabled = common ? common.verbose : false;
                    newState.debugEnabled = common ? common.debug : false;
                    newState.showBlocklyCode = false;
                }

                this.setState(newState, () =>  {
                    this.setChangedInAdmin();

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
            return [<Tabs
                    component={'div'}
                    key="tabs1"
                    value={this.state.selected}
                    onChange={(event, value) => this.onTabChange(event, value)}
                    indicatorColor="primary"
                    style={{position: 'relative', width: this.state.editing.length > 1 ? 'calc(100% - 50px)' : '100%', display: 'inline-block'}}
                    textColor="primary"
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    {this.state.editing.map(id => {
                        if (!this.props.objects[id]) {
                            const label = [
                                <div key="text" className={this.props.classes.tabText + ' ' + (this.isScriptChanged(id) ? this.props.classes.tabChanged : '')}>{id.split('.').pop()}</div>,
                                <span key="icon" className={this.props.classes.closeButton}><IconClose key="close" onClick={e => this.onTabClose(id, e)} fontSize="small"/></span>];
                            return <Tab
                                wrapped
                                component={'div'}
                                href={'#' + id}
                                key={id}
                                label={label}
                                value={id}
                                classes={{wrapper: this.props.classes.tabButtonWrapper}}
                            />;
                        } else {
                            let text = this.props.objects[id].common.name;
                            let title = '';
                            if (text.length > 18) {
                                title = text;
                                text = text.substring(0, 15) + '...';
                            }
                            const changed = this.props.objects[id].common && this.scripts[id] && this.props.objects[id].common.source !== this.scripts[id].source;
                            const label = [
                                <img key="icon" alt={""} src={images[this.props.objects[id].common.engineType] || images.def} className={this.props.classes.tabIcon}/>,
                                <div key="text" className={clsx(this.props.classes.tabText, this.isScriptChanged(id) && this.props.classes.tabChanged)}>{text}</div>,
                                changed ? <span key="changedSign" className={this.props.classes.tabChangedIcon}>▣</span> : null,
                                <span key="icon2" className={this.props.classes.closeButton}><IconClose key="close" onClick={e => this.onTabClose(id, e)} fontSize="small"/></span>
                                ];

                            return <Tab
                                wrapped
                                component={'div'}
                                href={'#' + id}
                                key={id}
                                label={label}
                                className={this.props.classes.tabButton}
                                value={id}
                                title={title}
                                classes={{wrapper: this.props.classes.tabButtonWrapper}}
                            />;
                        }
                    })}
                </Tabs>,
                this.state.editing.length > 1 ? <IconButton
                    key="menuButton"
                    href="#"
                    aria-label="Close all but current"
                    className={this.props.classes.tabMenuButton}
                    title={I18n.t('Close all but current')}
                    aria-haspopup="false"
                    onClick={_event => {
                        const editing = [this.state.selected];
                        // Do not close not saved tabs
                        Object.keys(this.scripts).forEach(id =>
                            id !== this.state.selected &&
                            JSON.stringify(this.scripts[id]) !== JSON.stringify(this.props.objects[id].common) &&
                            editing.push(id)
                        );

                        window.localStorage && window.localStorage.setItem('Editor.editing', JSON.stringify(editing));
                        this.setState({menuTabsOpened: false, menuTabsAnchorEl: null, editing: editing});
                    }}
                >
                    <IconCloseAll />
                </IconButton> : null
            ];
        } else {
            return <div key="tabs2" className={this.props.classes.toolbar}>
                <Button key="select1" disabled={true} className={this.props.classes.hintButton} href="">
                    <span key="select2">{I18n.t('Click on this icon')}</span>
                    <IconDoEdit key="select3" className={this.props.classes.hintIcon}/>
                    <span key="select4">{I18n.t('for edit or create script')}</span>
                </Button>
            </div>;
        }
    }

    getDebugMenu() {
        if (!this.state.showDebugMenu) return null;

        return <Menu
            key="menuDebug"
            id="menu-debug"
            anchorEl={this.state.menuDebugAnchorEl}
            open={this.state.showDebugMenu}
            onClose={() => this.setState({showDebugMenu: false, menuDebugAnchorEl: null})}
            PaperProps={{
                style: {
                    maxHeight: MENU_ITEM_HEIGHT * 7.5,
                },
            }}
        >
            <MenuItem key="debugEnabled"
                      title={I18n.t('debug_help')}
                      onClick={event => {
                          event.stopPropagation();
                          event.preventDefault();
                          this.setState({showDebugMenu: false, menuDebugAnchorEl: null, debugEnabled: !this.state.debugEnabled}, () => this.onChange({debug: this.state.debugEnabled}));
                      }}>
                <Checkbox checked={this.state.debugEnabled}/>
                <IconDebug className={this.props.classes.menuIcon} style={{color: COLOR_DEBUG}}/>
                {I18n.t('debug')}
            </MenuItem>
            <MenuItem key="verboseEnabled"
                      title={I18n.t('verbose_help')}
                      onClick={event => {
                          event.stopPropagation();
                          event.preventDefault();
                          this.setState({showDebugMenu: false, menuDebugAnchorEl: null, verboseEnabled: !this.state.verboseEnabled}, () => this.onChange({verbose: this.state.verboseEnabled}));
                      }}>
                <Checkbox checked={this.state.verboseEnabled}/>
                <IconVerbose className={this.props.classes.menuIcon} style={{color: COLOR_VERBOSE}}/>
                {I18n.t('verbose')}
            </MenuItem>
        </Menu>;
    }

    getDebugBadge() {
        return [
            this.state.debugEnabled && this.state.verboseEnabled  && (<IconDebug key="DebugVerbose" className={this.props.classes.menuIcon} style={{color: COLOR_VERBOSE}}/>),
            this.state.debugEnabled && !this.state.verboseEnabled && (<IconDebug key="DebugNoVerbose" className={this.props.classes.menuIcon} style={{color: COLOR_DEBUG}}/>),
            !this.state.debugEnabled && this.state.verboseEnabled && (<IconVerbose key="noDebugVerbose" className={this.props.classes.menuIcon} style={{color: COLOR_VERBOSE}}/>),
        ]
    }

    getToolbar() {
        const isInstanceRunning = this.state.selected && this.scripts[this.state.selected] && this.scripts[this.state.selected].engine && this.state.runningInstances[this.scripts[this.state.selected].engine];
        const isScriptRunning = this.state.selected && this.scripts[this.state.selected] && this.scripts[this.state.selected].enabled;

        if (this.state.selected) {
            const changedAll = Object.keys(this.state.changed).filter(id => this.state.changed[id]).length;
            const changed = this.state.changed[this.state.selected];
            return <Toolbar variant="dense" className={this.props.classes.toolbar} key="toolbar1">
                    {this.state.menuOpened && this.props.onLocate && (<IconButton className={this.props.classes.toolbarButtons} key="locate" title={I18n.t('Locate file')} onClick={() => this.props.onLocate(this.state.selected)}><IconLocate/></IconButton>)}
                    {!changed && isInstanceRunning && (<IconButton key="restart" variant="contained" className={this.props.classes.toolbarButtons} onClick={() => this.onRestart()} title={I18n.t('Restart')}><IconRestart /></IconButton>)}
                    {!changed && !isScriptRunning && (<span className={ this.props.classes.notRunning }>{I18n.t('Script is not running')}</span>)}
                    {!changed && isScriptRunning && !isInstanceRunning && (<span className={this.props.classes.notRunning}>{I18n.t('Instance is disabled')}</span>)}
                    {changed && (<Button key="save" variant="contained" color="secondary" className={this.props.classes.textButton} onClick={() => this.onSave()}>{I18n.t('Save')}<IconSave className={ this.props.classes.textIcon }/></Button>)}
                    {(changedAll > 1 || (changedAll === 1 && !changed)) && (<Button key="saveall" variant="contained" className={this.props.classes.textButton} onClick={() => this.onSaveAll()}>{I18n.t('Save all')}<IconSave className={ this.props.classes.textIcon }/></Button>)}
                    {changed && (<Button key="cancel" variant="contained" className={this.props.classes.textButton} onClick={() => this.onCancel()}>{I18n.t('Cancel')}<IconCancel className={ this.props.classes.textIcon }/></Button>)}
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

                    {!this.state.blockly && !this.state.showBlocklyCode && (<IconButton key="select-cron" aria-label="create CRON"
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

                    {!this.state.showBlocklyCode && (<IconButton key="debug" aria-label="Debug menu"
                                                                 title={I18n.t('Debug options')}
                                                                 className={this.props.classes.toolbarButtons}
                                                                 onClick={e => this.setState({showDebugMenu: true, menuDebugAnchorEl: e.currentTarget})}>
                        <Badge className={this.props.classes.badgeMargin} badgeContent={this.getDebugBadge()}>
                            <IconDebugMenu />
                        </Badge>
                    </IconButton>)}

                </Toolbar>;
        } else {
            return null;
        }
    }

    getScriptEditor() {
        if (this.state.selected && this.props.objects[this.state.selected] && this.state.blockly !== null && (!this.state.blockly || this.state.showBlocklyCode)) {
            this.scripts[this.state.selected] = this.scripts[this.state.selected] || JSON.parse(JSON.stringify(this.props.objects[this.state.selected].common));

            return <div className={this.props.classes.editorDiv} key="scriptEditorDiv">
                <ScriptEditorComponent
                    key="scriptEditor1"
                    name={this.state.selected}
                    adapterName={this.props.adapterName}
                    insert={this.state.insert}
                    onInserted={() => this.setState({insert: ''})}
                    onForceSave={() => this.onSave()}
                    searchText={this.state.searchText}
                    onRegisterSelect={func => this.onRegisterSelect(func)}
                    readOnly={this.state.showBlocklyCode}
                    changed={this.state.changed[this.state.selected]}
                    code={this.scripts[this.state.selected].source || ''}
                    isDark={this.state.themeType === 'dark'}
                    socket={this.props.socket}
                    runningInstances={this.state.runningInstances}
                    onChange={newValue => this.onChange({script: newValue})}
                    language={this.scripts[this.state.selected].engineType === 'TypeScript/ts' ? 'typescript' : 'javascript'}
                />
            </div>;
        } else {
            return null;
        }
    }

    getBlocklyEditor() {
        if (this.state.instancesLoaded && this.state.selected && this.props.objects[this.state.selected] && (this.state.blockly && !this.state.showBlocklyCode) && this.state.visible) {
            this.scripts[this.state.selected] = this.scripts[this.state.selected] || JSON.parse(JSON.stringify(this.props.objects[this.state.selected].common));

            return (<div className={this.props.classes.editorDiv} key="blocklyEditorDiv">
                <BlocklyEditor
                    command={this.state.cmdToBlockly}
                    key="BlocklyEditor"
                    themeType={this.state.themeType}
                    searchText={this.state.searchText}
                    resizing={this.props.resizing}
                    code={this.scripts[this.state.selected].source || ''}
                    onChange={newValue => this.onChange({script: newValue})}
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
                text={this.state.confirm}
                onClose={result => {
                    if (this.confirmCallback) {
                        const cb = this.confirmCallback;
                        this.confirmCallback = null;
                        cb(result);
                    }
                    this.setState({confirm: ''});
                }}
            />);
        } else {
            return null;
        }
    }

    getSelectIdDialog() {
        if (this.state.showSelectId) {
            let selectedId = this.selectId.callback ? this.selectId.initValue || '' : this.getSelect ? this.getSelect() : '';
            // it could be:
            // - 'id.xx'/* aksjdhsdf*/
            // - "id.xx"/* aksjdhsdf*/
            // - "id.xx"//
            let pos = selectedId.indexOf('/*');
            if (pos !== -1) {
                selectedId = selectedId.substring(0, pos);
            }
            pos = selectedId.indexOf('//');
            if (pos !== -1) {
                selectedId = selectedId.substring(0, pos);
            }
            let m = selectedId.match(/"([^"]+)"/);
            if (m) {
                selectedId = m[1];
            }
            m = selectedId.match(/'([^']+)'/);
            if (m) {
                selectedId = m[1];
            }

            return <DialogSelectID
                key="dialogSelectID1"
                prefix={'../..'}
                themeName={this.props.themeName}
                themeType={this.state.themeType}
                socket={this.props.socket}
                selected={selectedId}
                statesOnly={true}
                onClose={() => {
                    this.setState({showSelectId: false});
                    if (this.selectId.callback) {
                        this.selectId.callback = null;
                    }
                }}
                onOk={(selected, name) => {
                    this.selectId.initValue = null;
                    if (this.selectId.callback) {
                        this.selectId.callback(selected);
                        this.selectId.callback = null;
                    } else {
                        this.setState({insert: `'${selected}'/*${name}*/`})
                    }
                }}
            />;
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

    getEditorDialog() {
        if (this.state.showScript) {
            return <DialogScriptEditor
                key="scriptEditorDialog"
                adapterName={this.props.adapterName}
                source={this.scriptDialog.initValue}
                args={this.scriptDialog.args ? this.scriptDialog.args.join(', ') : ''}
                isReturn={this.scriptDialog.isReturn}
                socket={this.props.socket}
                runningInstances={this.state.runningInstances}
                themeType={this.state.themeType}
                onClose={result => {
                    this.scriptDialog.initValue = null;
                    if (this.scriptDialog.callback) {
                        result !== false && this.scriptDialog.callback(result || '');
                        this.scriptDialog.callback = null;
                    }
                    this.setState({showScript: false});
                }}
            />;
        } else {
            return null;
        }
    }

    getToast() {
        return <Snackbar
            key="toast"
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
            }}
            open={!!this.state.toast}
            autoHideDuration={6000}
            onClose={() => this.setState({toast: ''})}
            ContentProps={{'aria-describedby': 'message-id',}}
            message={<span id="message-id">{this.state.toast}</span>}
            action={[
                <IconButton
                    key="close"
                    aria-label="close"
                    color="inherit"
                    className={this.props.classes.closeToast}
                    onClick={() => this.setState({toast: ''})}
                ><IconClose />
                </IconButton>,
            ]}
        />;
    }

    render() {
        if (this.state.selected && this.props.objects[this.state.selected] && this.state.blockly === null) {
            this.scripts[this.state.selected] = this.scripts[this.state.selected] || JSON.parse(JSON.stringify(this.props.objects[this.state.selected].common));
            setTimeout(() => {
                const newState = {
                    blockly: this.scripts[this.state.selected].engineType === 'Blockly',
                    showBlocklyCode: false,
                    debugEnabled: this.scripts[this.state.selected].debug,
                    verboseEnabled: this.scripts[this.state.selected].verbose,
                };

                // check if all opened files still exists
                this.removeNonExistingScripts(null, newState);
                this.setState(newState);
            }, 100);
        }

        return [
            this.getTabs(),
            this.getToolbar(),
            this.getScriptEditor(),
            this.getBlocklyEditor(),
            this.getConfirmDialog(),
            this.getSelectIdDialog(),
            this.getCronDialog(),
            this.getEditorDialog(),
            this.getDebugMenu(),
            this.getToast(),
        ];
    }
}

Editor.propTypes = {
    objects: PropTypes.object.isRequired,
    instances: PropTypes.array.isRequired,
    adapterName: PropTypes.string.isRequired,
    selected: PropTypes.string.isRequired,
    onSelectedChange: PropTypes.func.isRequired,
    onRestart: PropTypes.func,
    onChange: PropTypes.func.isRequired,
    visible: PropTypes.bool,
    menuOpened: PropTypes.bool,
    onLocate: PropTypes.func,
    runningInstances: PropTypes.object,
    socket: PropTypes.object,
    searchText: PropTypes.string,
    themeName: PropTypes.string,
    themeType: PropTypes.string,
};

export default withStyles(styles)(Editor);
