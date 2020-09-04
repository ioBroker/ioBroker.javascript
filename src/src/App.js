import React from 'react';
import {withStyles} from '@material-ui/core/styles';
import SplitterLayout from 'react-splitter-layout';
import {MdMenu as IconMenuClosed} from 'react-icons/md';
import {MdArrowBack as IconMenuOpened} from 'react-icons/md';

import 'react-splitter-layout/lib/index.css';

import GenericApp from '@iobroker/adapter-react/GenericApp';
import Loader from '@iobroker/adapter-react/Components/Loader'
import I18n from '@iobroker/adapter-react/i18n';
import DialogMessage from '@iobroker/adapter-react/Dialogs/Message';
import DialogConfirm from '@iobroker/adapter-react/Dialogs/Confirm';
import Utils from '@iobroker/adapter-react/Components/Utils';

import SideMenu from './SideMenu';
import Log from './Log';
import Editor from './Editor';
import Theme from './Theme';
import DialogError from './Dialogs/Error';
import DialogImportFile from './Dialogs/ImportFile';
import BlocklyEditor from './Components/BlocklyEditor';

const styles = theme => ({
    root: Theme.root,
    menuDiv: {
        overflow: 'hidden',
    },
    splitterDivs: {
        '&>div': {
            overflow: 'hidden',
            width: '100%',
            height: '100%',
        },
        '& .layout-splitter': {
           background: Theme.type === 'dark' ? '#595858' : '#ccc;'
        }
    },
    mainDiv: {
        width: '100%',
        height: '100%',
        overflow: 'hidden',
    },
    /*appBarWithMenu: {
        width: `calc(100% - ${Theme.menu.width}px)`,
        marginLeft: Theme.menu.width,
    },
    appBarWithoutMenu: {
        width: `100%`,
        marginLeft: 0,
    },*/
    content: {
        width: '100%',
        height: '100%',
        backgroundColor: theme.palette.background && theme.palette.background.default,
        position: 'relative'
    },
    splitterDivWithMenu: {
        width: `calc(100% - ${Theme.menu.width}px)`,
        height: '100%'
    },
    menuDivWithoutMenu: {
        '&>div:first-child': {
            display: 'none'
        },
        '&>.layout-splitter': {
            display: 'none'
        },
    },
    progress: {
        margin: 100
    },
    menuOpenCloseButton: {
        position: 'absolute',
        left: 0,
        borderRadius: '0 5px 5px 0',
        top: 6,
        paddingTop: 8,
        cursor: 'pointer',
        zIndex: 1,
        height: 25,
        width: 20,
        background: Theme.colors.secondary,
        color: Theme.colors.primary,
        paddingLeft: 3,
        '&:hover': {
            color: 'white'
        }
    }
});

class App extends GenericApp {
    constructor(props) {
        super(props, {
            translations: {
                'en': require('./i18n/en'),
                'de': require('./i18n/de'),
                'es': require('./i18n/es'),
                'fr': require('./i18n/fr'),
                'it': require('./i18n/it'),
                'nl': require('./i18n/nl'),
                'pl': require('./i18n/pl'),
                'pt': require('./i18n/pt'),
                'ru': require('./i18n/ru'),
                'zh-cn': require('./i18n/zh-cn'),
            },
            bottomButtons: false,
            socket: {
                autoSubscribeLog: true,
            },
        });

        // this.logIndex = 0;
        this.logSize  = window.localStorage ? parseFloat(window.localStorage.getItem('App.logSize'))  || 150 : 150;
        this.menuSize = window.localStorage ? parseFloat(window.localStorage.getItem('App.menuSize')) || 500 : 500;
        this.hosts = [];
        this.importFile = null;
        this.scripts = {};
    }

    onScriptsChanged = (id, obj) => {
        if (!id) {
            return;
        }
        let changed = false;
        const newState = {};
        if (id.startsWith('script.js.')) {
            if (obj) {
                if (JSON.stringify(this.scripts[id]) !== JSON.stringify(obj)) {
                    this.scripts[id] = obj;
                    changed = true;
                    newState.scriptsHash = this.state.scriptsHash + 1;
                }
            } else if (this.scripts[id]) {
                delete this.scripts[id];
                changed = true;
                newState.scriptsHash = this.state.scriptsHash + 1;
            }
        }

        changed && this.setState(newState);
    };

    onInstanceChanged = (id, obj) => {
        if (!id) {
            return;
        }
        let changed = false;
        const newState = {};

        if (id.match(/^system\.adapter\.[-_\w\d]+\$/)) {
            // update instances
            if (id.startsWith('system.adapter.' + this.adapterName + '.')) {
                if (obj && obj.type === 'instance') {
                    if (!this.state.instances.includes(id)) {
                        newState.instances = [...this.state.instances];
                        newState.instances.push(id);
                        newState.instances.sort();
                        changed = true;
                        // request alive
                        this.socket.subscribeState(obj._id + '.alive', this.onInstanceAliveChange());
                    }
                } else if (!obj && this.state.instances.includes(id)) {
                    this.socket.unsubscribeState(id + '.alive', this.onInstanceAliveChange());
                    newState.instances = [...this.state.instances];
                    const pos = newState.instances.indexOf(id);
                    newState.instances.splice(pos, 1);
                    changed = true;
                }
            }

            if (obj && obj[id].common && obj[id].common.blockly) {
                this.confirmCallback = result => result && window.location.reload();
                newState.confirm = I18n.t('Some blocks were updated. Reload admin?');
                changed = true;
            }
        }
        changed && this.setState(newState);
    };

    onHostChanged = (id, obj) => {
        if (!id) {
            return;
        }
        let changed = false;
        const newState = {};

        if (id.startsWith('system.host.')) {
            if (obj && obj.type === 'host') {
                if (!this.hosts.includes(id)) {
                    this.hosts.push(id);
                    this.hosts.sort();
                }
            } else if (!obj && this.hosts.includes(id)) {
                const pos = this.hosts.indexOf(id);
                this.hosts.splice(pos, 1);
            }
        }

        changed && this.setState(newState);
    };

    onConnectionReady() {
        window.systemLang = this.socket.systemLang;
        this.setState({
            ready: false,
            updateScripts: 0,
            scriptsHash: 0,
            instances: [],
            updating: false,
            resizing: false,
            selected: null,
            logMessage: {},
            editing: [],
            menuOpened: window.localStorage ? window.localStorage.getItem('App.menuOpened') !== 'false' : true,
            menuSelectId: '',
            expertMode: window.localStorage ? window.localStorage.getItem('App.expertMode') === 'true' : false,
            logHorzLayout: window.localStorage ? window.localStorage.getItem('App.logHorzLayout') === 'true' : false,
            runningInstances: {},
            confirm: '',
            importFile: false,
            message: '',
            searchText: '',
        });

        const newState = {};

        // load instances & scripts
        // Read all instances
        this.subscribeOnInstances()
            .then(result => {
                newState.instances = result.instances;
                newState.runningInstances = result.runningInstances;
                return this.readAdaptersWithBlockly();
            })
            .then(() => this.socket.getHosts())
            .then(hosts => {
                this.hosts = hosts.map(obj => obj._id);
                // load all scripts
                return this.readAllScripts();
            })
            .then(scripts => {
                if (window.localStorage && window.localStorage.getItem('App.expertMode') !== 'true' && window.localStorage.getItem('App.expertMode') !== 'false') {
                    // detect if some global scripts exists
                    if (Object.keys(scripts).find(id => id.startsWith('script.js.global.') && scripts.type === 'script')) {
                        newState.expertMode = true;
                    }
                }
                this.scripts = scripts;

                let scriptsHash = this.state.scriptsHash;
                if (this.compareScripts(scripts)) {
                    scriptsHash++;
                }
                newState.scriptsHash = scriptsHash;
                newState.ready = true;
                this.socket.subscribeObject('script.*', this.onScriptsChanged);
                this.socket.subscribeObject('system.adapter.*', this.onInstanceChanged);
                this.socket.subscribeObject('system.host.*', this.onHostChanged);

                this.setState(newState);
            });
    }

    subscribeOnInstances() {
        return this.socket.getAdapterInstances(this.adapterName)
            .then(instancesArray => {
                const instances = instancesArray.map(obj => parseInt(obj._id.split('.').pop())).sort();
                const runningInstances = {};
                instances.forEach(id => runningInstances['system.adapter.' + this.adapterName + '.' + id] = false);

                const promises = [];

                // subscribe on instances
                instances.forEach(instance => {
                    const instanceId = `system.adapter.${this.adapterName}.${instance}`;
                    const id = `${instanceId}.alive`;
                    promises.push(this.socket.getState(id)
                        .then(state => {
                            runningInstances[instanceId] = state ? state.val : false;
                            this.socket.subscribeState(id, this.onInstanceAliveChange);
                        }));
                });

                return Promise.all(promises)
                    .then(() => ({instances, runningInstances}));
            })
    }

    readAllScripts() {
        return this.socket.getObjectView('script.js.', 'script.js.\u9999', 'channel')
            .then(folders =>
                this.socket.getObjectView('script.js.', 'script.js.\u9999', 'script')
                    .then(scripts => {
                        Object.keys(scripts).forEach(id => folders[id] = scripts[id]);
                        return folders;
                    }));
    }

    readAdaptersWithBlockly() {
        return this.socket.getObjectView('system.adapter.', 'system.adapter.\u9999', 'adapter')
            .then(adapters =>
                new Promise(resolve =>
                    BlocklyEditor.loadCustomBlockly(adapters, () => resolve())));
    }

    onInstanceAliveChange = (id, state) => {
        if (id) {
            id = id && id.substring(0, id.length - 6); // - .alive

            if (this.state.runningInstances[id] !== (state ? state.val : false)) {
                const runningInstances = JSON.parse(JSON.stringify(this.state.runningInstances));
                runningInstances[id] = state ? state.val : false;
                this.setState({runningInstances});
            }
        }
    };

    compareScripts(newScripts) {
        const oldIds = Object.keys(this.scripts);
        const newIds = Object.keys(newScripts);
        if (oldIds.length !== newIds.length) {
            this.scripts = this.newScripts;
            return true;
        }
        if (JSON.stringify(oldIds) !== JSON.stringify(newIds)) {
            this.scripts = this.newScripts;
            return true;
        }
        for (let i = 0; i < oldIds.length; i++) {
            let oldScript = this.scripts[oldIds[i]].common;
            let newScript = newScripts[oldIds[i]].common;
            if (oldScript.name !== newScript.name) {
                this.scripts = this.newScripts;
                return true;
            }
            if (oldScript.engine !== newScript.engine) {
                this.scripts = this.newScripts;
                return true;
            }
            if (oldScript.engineType !== newScript.engineType) {
                this.scripts = this.newScripts;
                return true;
            }
            if (oldScript.enabled !== newScript.enabled) {
                this.scripts = this.newScripts;
                return true;
            }
        }
    }

    onRename(oldId, newId, newName, newInstance) {
        console.log(`Rename ${oldId} => ${newId}`);
        let promise;
        this.setState({updating: true});

        // Rename script.js.common.Skript_1 => script.js.common.New folder.Skript_1

        if (this.scripts[oldId] && this.scripts[oldId].type === 'script') {
            const common = JSON.parse(JSON.stringify(this.scripts[oldId].common));
            common.name = newName || common.name;
            if (newInstance !== undefined) {
                common.engine = 'system.adapter.javascript.' + newInstance;
            }
            // Check if the script is not a children of other script
            const parts = newId.split('.');
            parts.pop();
            const parentID = parts.join('.');

            if (this.scripts[parentID] && this.scripts[parentID].type === 'script') {
                parts.pop();
                newId = parts.join('.') + '.' + newId.split('.').pop();
            }

            promise = this.updateScript(oldId, newId, common);
        } else {
            promise = this.renameGroup(oldId, newId, newName);
        }

        promise
            .then(() => this.setState({updating: false}))
            .catch(err => err !== 'canceled' && this.showError(err));
    }

    renameGroup(id, newId, newName, _list) {
        if (!_list) {
            _list = [];

            // collect all elements to rename
            // find all elements
            _list = Object.keys(this.scripts).filter(_id => _id.startsWith(id + '.'));

            return this.socket.getObject(id)
                .then(obj => {
                    obj = obj || {common: {}};
                    obj.common.name = newName;
                    obj._id = newId;

                    this.socket.delObject(id)
                        .catch(() => {})
                        .then(() => this.socket.setObject(newId, obj))
                        .then(() => this.renameGroup(id, newId, newName, _list));
                });
        } else if (_list.length) {
            let nId = _list.pop();

            return this.socket.getObject(nId)
                .then(obj =>
                    this.socket.delObject(nId)
                        .catch(() => {})
                        .then(() => {
                            nId = newId + nId.substring(id.length);
                            obj._id = nId;
                            return this.socket.setObject(nId, obj);
                        })
                        .then(() => this.renameGroup(id, newId, newName, _list))
                );
        } else {
            return Promise.resolve();
        }
    }

    onUpdateScript(id, common) {
        if (this.scripts[id] && this.scripts[id].type === 'script') {
            this.updateScript(id, id, common)
                .then(() => {})
                .catch(err => err !== 'canceled' && this.showError(err));
        }
    }

    onSelect(selected) {
        if (this.scripts[selected] && this.scripts[selected].common && this.scripts[selected].type === 'script') {
            this.setState({selected, menuSelectId: selected}, () =>
                setTimeout(() => this.setState({menuSelectId: ''})), 300);
        }
    }

    onExpertModeChange(expertMode) {
        if (this.state.expertMode !== expertMode) {
            window.localStorage && window.localStorage.setItem('App.expertMode', expertMode ? 'true' : 'false');
            this.setState({ expertMode });
        }
    }

    showError(err) {
        this.setState({ errorText: err ? err.toString() : '' });
    }

    showMessage(message) {
        this.setState({ message: message ? message.toString() : '' });
    }

    onDelete(id) {
        this.socket.delObject(id)
        .then(() => {})
        .catch(err =>
            this.showError(err));
    }

    onEdit(id) {
        if (this.state.selected !== id) {
            this.setState({selected: id});
        }
    }

    onAddNew(id, name, isFolder, instance, type, source) {
        const reg = new RegExp(`^${id}\\.`);

        if (Object.keys(this.scripts).find(_id => id === _id || reg.test(id))) {
            return this.showError(I18n.t('Yet exists!'));
        }

        if (isFolder) {
            this.socket.setObject(id, {
                common: {
                    name,
                    expert: true
                },
                type: 'channel'
            })
                .then(() =>
                    setTimeout(() => this.setState({menuSelectId: id}, () =>
                        setTimeout(() => this.setState({menuSelectId: ''})), 300), 1000))
                .catch(err => this.showError(err));
        } else {
            this.socket.setObject(id, {
                common: {
                    name,
                    expert: true,
                    engineType: type,
                    engine: 'system.adapter.javascript.' + (instance || 0),
                    source: source || '',
                    debug: false,
                    verbose: false
                },
                type: 'script'
            })
                .then(() => setTimeout(() => this.onSelect(id), 1000))
                .catch(err => this.showError(err));
        }
    }

    updateScript(oldId, newId, newCommon) {
        return this.socket.getObject(oldId)
            .then(_obj => {
                const obj = {common: {}};

                if (newCommon.engine  !== undefined) obj.common.engine  = newCommon.engine;
                if (newCommon.enabled !== undefined) obj.common.enabled = newCommon.enabled;
                if (newCommon.source  !== undefined) obj.common.source  = newCommon.source;
                if (newCommon.debug   !== undefined) obj.common.debug   = newCommon.debug;
                if (newCommon.verbose !== undefined) obj.common.verbose = newCommon.verbose;

                obj.from = 'system.adapter.admin.0'; // we must distinguish between GUI(admin.0) and disk(javascript.0)

                if (oldId === newId && _obj && _obj.common && newCommon.name === _obj.common.name) {
                    if (!newCommon.engineType || newCommon.engineType !== _obj.common.engineType) {
                        if (newCommon.engineType !== undefined) {
                            obj.common.engineType = newCommon.engineType || 'Javascript/js';
                        }

                        return new Promise((resolve, reject) =>
                            this.socket.getRawSocket().emit('extendObject', oldId, obj, err =>
                                err ? reject(err) : resolve()));
                    } else {
                        return new Promise((resolve, reject) =>
                            this.socket.getRawSocket().emit('extendObject', oldId, obj, err =>
                                err ? reject(err) : resolve()));
                    }
                } else {
                    // let prefix;

                    // let parts = _obj.common.engineType.split('/');

                    // prefix = 'script.' + (parts[1] || parts[0]) + '.';

                    if (_obj && _obj.common) {
                        _obj.common.engineType = newCommon.engineType || _obj.common.engineType || 'Javascript/js';
                        return this.socket.delObject(oldId)
                            .then(() => {
                                if (obj.common.engine !== undefined) _obj.common.engine = obj.common.engine;
                                if (obj.common.enabled !== undefined) _obj.common.enabled = obj.common.enabled;
                                if (obj.common.source !== undefined) _obj.common.source = obj.common.source;
                                if (obj.common.name !== undefined) _obj.common.name = obj.common.name;
                                if (obj.common.debug !== undefined) _obj.common.debug = obj.common.debug;
                                if (obj.common.verbose !== undefined) _obj.common.verbose = obj.common.verbose;

                                delete _obj._rev;

                                // Name must always exist
                                _obj.common.name = newCommon.name;

                                _obj._id = newId; // prefix + newCommon.name.replace(/[\s"']/g, '_');

                                this.socket.setObject(newId, _obj);
                            });
                    } else {
                        _obj = obj;
                    }

                    // Name must always exist
                    _obj.common.name = newCommon.name;

                    _obj._id = newId; // prefix + newCommon.name.replace(/[\s"']/g, '_');

                    return this.socket.setObject(newId, _obj);
                }
            });
    }

    onEnableDisable(id, enabled) {
        if (this.scripts[id] && this.scripts[id].type === 'script') {
            const common = this.scripts[id].common;
            common.enabled = enabled;
            common.expert = true;
            this.updateScript(id, id, common)
                .catch(err => err !== 'canceled' && this.showError(err));
        }
    }

    getLiveHost(cb, _list) {
        if (!_list) {
            _list = this.hosts ? [...this.hosts] : [];
        }

        if (_list.length) {
            const id = _list.shift();
            this.socket.getState(id + '.alive')
                .then(state => {
                    if (state && state.val) {
                        cb(id);
                    } else {
                        setTimeout(() => this.getLiveHost(cb, _list));
                    }
                });
        } else {
            cb();
        }
    }

    onExport() {
        this.getLiveHost(host => {
            if (!host) {
                return this.showError(I18n.t('No active host found'));
            }

            const d = new Date();
            let date = d.getFullYear();
            let m = d.getMonth() + 1;
            if (m < 10) {
                m = '0' + m;
            }
            date += '-' + m;
            m = d.getDate();
            if (m < 10) {
                m = '0' + m;
            }
            date += '-' + m + '-';

            this.socket.getRawSocket().emit('sendToHost', host, 'readObjectsAsZip', {
                adapter: 'javascript',
                id: 'script.js',
                link: date + 'scripts.zip' // request link to file and not the data itself
            }, data => {
                if (typeof data === 'string') {
                    // it is a link to created file
                    const a = document.createElement('a');
                    // the data is "system.host.HOST.zip.2020-01-26-scripts.zip"
                    const parts = data.split('.zip.');
                    a.href = '/zip/' + parts[0] + '/' + parts[1];
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                } else {
                    data.error && this.showError(data.error);
                    if (data.data) {
                        const a = document.createElement('a');
                        a.href = 'data: application/zip;base64,' + data.data;
                        a.download = date + 'scripts.zip';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                    }
                }
            });
        });
    }

    onImport(data) {
        this.importFile = data;
        if (data) {
            this.confirmCallback = this.onImportConfirmed.bind(this);
            this.setState({importFile: false, confirm: I18n.t('Existing scripts will be overwritten.')});
        } else {
            this.setState({importFile: false});
        }
    }

    onImportConfirmed(ok) {
        let data = this.importFile;
        this.importFile = null;
        if (ok && data) {
            data = data.split(',')[1];
            this.getLiveHost(host => {
                if (!host) {
                    this.showError(I18n.t('No active host found'));
                    return;
                }
                this.socket.getRawSocket().emit('sendToHost', host, 'writeObjectsAsZip', {
                    data: data,
                    adapter: 'javascript',
                    id: 'script.js'
                }, data => {
                    if (data === 'permissionError') {
                        this.showError(I18n.t(data));
                    } else if (!data || data.error) {
                        this.showError(data ? I18n.t(data.error) : I18n.t('Unknown error'));
                    } else {
                        this.showMessage(I18n.t('Done'));
                    }
                });
            });
        }
    }

    toggleLogLayout() {
        window.localStorage && window.localStorage.setItem('App.logHorzLayout', this.state.logHorzLayout ? 'false' : 'true');
        this.setState({logHorzLayout: !this.state.logHorzLayout});
    }

    renderMain() {
        const {classes} = this.props;
        const errorDialog = this.state.errorText ? <DialogError key="dialogError" onClose={() => this.setState({errorText: ''})} text={this.state.errorText}/> : null;
        return [
            this.state.message ? <DialogMessage key="dialogMessage" onClose={() => this.setState({message: ''})} text={this.state.message}/> : null,
            errorDialog,
            this.state.importFile ? <DialogImportFile key="dialogImportFile" onClose={data => this.onImport(data)} /> : null,
            this.state.confirm ? <DialogConfirm
                key="dialogConfirm"
                onClose={result => {
                    this.state.confirm && this.setState({confirm: ''});
                    this.confirmCallback && this.confirmCallback(result);
                    this.confirmCallback = null;
                }}
                text={this.state.confirm}/> : null,
            <div className={classes.content + ' iobVerticalSplitter'} key="main">
                <div key="closeMenu" className={classes.menuOpenCloseButton} onClick={() => {
                    window.localStorage && window.localStorage.setItem('App.menuOpened', this.state.menuOpened ? 'false' : 'true');
                    this.setState({menuOpened: !this.state.menuOpened, resizing: true});
                    setTimeout(() => this.setState({resizing: false}), 300);
                }}>
                    {this.state.menuOpened ? (<IconMenuOpened />) : (<IconMenuClosed />)}
                </div>
                <SplitterLayout
                    key="splitterLayout"
                    vertical={!this.state.logHorzLayout}
                    primaryMinSize={100}
                    secondaryInitialSize={this.logSize}
                    //customClassName={classes.menuDiv + ' ' + classes.splitterDivWithoutMenu}
                    onDragStart={() => this.setState({resizing: true})}
                    onSecondaryPaneSizeChange={size => this.logSize = parseFloat(size)}
                    onDragEnd={() => {
                        this.setState({resizing: false});
                        window.localStorage && window.localStorage.setItem('App.logSize', this.logSize.toString());
                    }}
                >
                    <Editor
                        key="editor"
                        visible={!this.state.resizing}
                        connection={this.socket}
                        onLocate={menuSelectId => this.setState({menuSelectId})}
                        runningInstances={this.state.runningInstances}
                        menuOpened={this.state.menuOpened}
                        searchText={this.state.searchText}
                        themeType={this.state.themeType}
                        themeName={this.state.themeName}
                        onChange={(id, common) => this.onUpdateScript(id, common)}
                        onSelectedChange={(id, editing) => {
                            const newState = {};
                            let changed = false;
                            if (id !== this.state.selected) {
                                changed = true;
                                newState.selected = id;
                            }
                            if (JSON.stringify(editing) !== JSON.stringify(this.state.editing)) {
                                changed = true;
                                newState.editing = JSON.parse(JSON.stringify(editing));
                            }
                            changed && this.setState(newState);
                        }}
                        onRestart={id => this.socket.extendObject(id, {common: {enabled: true}})}
                        selected={this.state.selected && this.scripts[this.state.selected] && this.scripts[this.state.selected].type === 'script' ? this.state.selected : ''}
                        objects={this.scripts}
                        instances={this.state.instances}
                    />
                    <Log key="log" verticalLayout={!this.state.logHorzLayout} onLayoutChange={() => this.toggleLogLayout()} editing={this.state.editing} connection={this.socket} selected={this.state.selected}/>
                </SplitterLayout>
            </div>,
        ];
    }

    render() {
        const {classes} = this.props;

        if (!this.state.ready) {
            // return (<CircularProgress className={classes.progress} size={50} />);
            return <Loader theme={this.state.themeType}/>;
        }

        return <div className={classes.root}>
            <SplitterLayout
                key="menuSplitter"
                vertical={false}
                primaryMinSize={300}
                primaryIndex={1}
                secondaryMinSize={300}
                secondaryInitialSize={this.menuSize}
                customClassName={classes.splitterDivs + ' ' + (!this.state.menuOpened ? classes.menuDivWithoutMenu : '')}
                onDragStart={() => this.setState({resizing: true})}
                onSecondaryPaneSizeChange={size => this.menuSize = parseFloat(size)}
                onDragEnd={() => {
                    this.setState({resizing: false});
                    window.localStorage && window.localStorage.setItem('App.menuSize', this.menuSize.toString());
                }}
            >
                <div className={classes.mainDiv} key="menu">
                    <SideMenu
                        key="sidemenu"
                        scripts={this.scripts}
                        scriptsHash={this.state.scriptsHash}
                        instances={this.state.instances}
                        update={this.state.updateScripts}
                        onRename={this.onRename.bind(this)}
                        onSelect={this.onSelect.bind(this)}
                        connection={this.socket}
                        selectId={this.state.menuSelectId}
                        onEdit={this.onEdit.bind(this)}
                        expertMode={this.state.expertMode}
                        themeType={this.state.themeType}
                        themeName={this.state.themeName}
                        onThemeChange={themeName => {
                            Utils.setThemeName(themeName);
                            const themeType = Utils.getThemeType(themeName);
                            this.setState({themeName, themeType}, () => this.props.onThemeChange(themeName))
                        }}
                        runningInstances={this.state.runningInstances}
                        onExpertModeChange={this.onExpertModeChange.bind(this)}
                        onDelete={this.onDelete.bind(this) }
                        onAddNew={ this.onAddNew.bind(this) }
                        onEnableDisable={this.onEnableDisable.bind(this)}
                        onExport={this.onExport.bind(this)}
                        width={this.menuSize}
                        onImport={() => this.setState({importFile: true})}
                        onSearch={searchText => this.setState({searchText})}
                    />
                </div>
                {this.renderMain()}
            </SplitterLayout>
        </div>;
    }
}

export default withStyles(styles)(App);
