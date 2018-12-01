import React, {Component} from 'react';
import {withStyles} from '@material-ui/core/styles';
import SplitterLayout from 'react-splitter-layout';
import {MdMenu as IconMenuClosed} from 'react-icons/md';
import {MdClose as IconMenuOpened} from 'react-icons/md';

import SideMenu from './SideMenu';
import Log from './Log';
import Editor from './Editor';
import Theme from './Theme';
import Connection from './Connection';
import {PROGRESS} from './Connection';
import Loader from './Components/Loader'
import I18n from './i18n';
import DialogMessage from './Dialogs/Message';
import DialogError from './Dialogs/Error';
import DialogConfirm from './Dialogs/Confirmation';
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
        backgroundColor: theme.palette.background.default,
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

class App extends Component {
    constructor(props) {
        super(props);
        this.objects = {};
        this.state = {
            connected: false,
            progress: 0,
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
            errorText: '',
            expertMode: window.localStorage ? window.localStorage.getItem('App.expertMode') === 'true' : false,
            runningInstances: {},
            confirm: '',
            importFile: false,
            message: '',
            searchText: '',
            themeType: window.localStorage ? window.localStorage.getItem('App.theme') || 'light' : 'light',
        };
        // this.logIndex = 0;
        this.logSize = window.localStorage ? parseFloat(window.localStorage.getItem('App.logSize')) || 150 : 150;
        this.menuSize = window.localStorage ? parseFloat(window.localStorage.getItem('App.menuSize')) || 500 : 500;
        this.scripts = {};
        this.hosts = [];
        this.importFile = null;

        this.socket = new Connection({
            autoSubscribes: ['script.*', 'system.adapter.javascript.*'],
            autoSubscribeLog: true,
            onProgress: progress => {
                if (progress === PROGRESS.CONNECTING) {
                    this.setState({connected: false});
                } else if (progress === PROGRESS.READY) {
                    this.setState({connected: true, progress: 100});
                } else {
                    this.setState({connected: true, progress: Math.round(PROGRESS.READY / progress * 100)});
                }
            },
            onReady: (objects, scripts) => {
                this.setState({ready: true});
                this.onObjectChange(objects, scripts);
                I18n.setLanguage(this.socket.systemLang);
                window.systemLang = this.socket.systemLang;
            },
            onObjectChange: (objects, scripts) => this.onObjectChange(objects, scripts),
            onError: err => {
                console.error(err);
            },
            onBlocklyChanges: () => {
                this.confirmCallback = result => result && window.location.reload();
                this.setState({confirm: I18n.t('Some blocks were updated. Reload admin?')});
            },
            onLog: message => {
                //this.logIndex++;
                //this.setState({logMessage: {index: this.logIndex, message}})
            }
        });

        this.socket.subscribeState('system.adapter.javascript.*.alive', (id, state) => {
            id = id && id.substring(0, id.length - 6); // - .alive
            if (this.state.runningInstances[id] !== (state ? state.val : false)) {
                const runningInstances = JSON.parse(JSON.stringify(this.state.runningInstances));
                runningInstances[id] = (state ? state.val : false);
                this.setState({runningInstances});
            }
        });
    }

    onObjectChange(objects, scripts) {
        this.objects = objects;
        // extract scripts and instances
        const nScripts = {};
        const newState = {};

        scripts.list.forEach(id => nScripts[id] = objects[id]);
        scripts.groups.forEach(id => nScripts[id] = objects[id]);
        this.hosts = scripts.hosts;

        if (window.localStorage && window.localStorage.getItem('App.expertMode') !== 'true' && window.localStorage.getItem('App.expertMode') !== 'false') {
            // detect if some global scripts exists
            if (scripts.list.find(id => id.startsWith('script.js.global.'))) {
                newState.expertMode = true;
            }
        }

        let scriptsHash = this.state.scriptsHash;
        if (this.compareScripts(scripts)) {
            scriptsHash++;
        }
        this.scripts = nScripts;
        newState.instances = scripts.instances;
        newState.scriptsHash = scriptsHash;

        BlocklyEditor.loadCustomBlockly(objects);

        this.setState(newState);
    }

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
        if (this.scripts[oldId] && this.scripts[oldId].type === 'script') {
            const common = JSON.parse(JSON.stringify(this.scripts[oldId].common));
            common.name = newName || common.name;
            if (newInstance !== undefined) {
                common.engine = 'system.adapter.javascript.' + newInstance;
            }
            promise = this.socket.updateScript(oldId, newId, common);
        } else {
            promise = this.socket.renameGroup(oldId, newId, newName);
        }

        promise
            .then(() => this.setState({updating: false}))
            .catch(err => err !== 'canceled' && this.showError(err));
    }

    onUpdateScript(id, common) {
        if (this.scripts[id] && this.scripts[id].type === 'script') {
            this.socket.updateScript(id, id, common)
                .then(() => {})
                .catch(err => err !== 'canceled' && this.showError(err));
        }
    }

    onSelect(selected) {
        if (this.objects[selected] && this.objects[selected].common && this.objects[selected].type === 'script') {
            this.setState({selected, menuSelectId: selected}, () =>
                setTimeout(() => this.setState({menuSelectId: ''})), 300);
        }
    }

    onExpertModeChange(expertMode) {
        if (this.state.expertMode !== expertMode) {
            window.localStorage && window.localStorage.setItem('App.expertMode', expertMode ? 'true' : 'false');
            this.setState({expertMode});
        }
    }

    showError(err) {
        this.setState({errorText: err});
    }

    showMessage(message) {
        this.setState({message});
    }

    onDelete(id) {
        this.socket.delObject(id)
        .then(() => {})
        .catch(err => {
            this.showError(err);
        });
    }

    onEdit(id) {
        if (this.state.selected !== id) {
            this.setState({selected: id});
        }
    }

    onAddNew(id, name, isFolder, instance, type) {
        if (this.objects[id]) {
            this.showError(I18n.t('Yet exists!'));
            return;
        }

        if (isFolder) {
            this.socket.setObject(id, {
                common: {
                    name,
                    expert: true
                },
                type: 'channel'
            }).then(() => {
                setTimeout(() => this.setState({menuSelectId: id}, () =>
                    setTimeout(() => this.setState({menuSelectId: ''})), 300), 1000);
            }).catch(err => {
                this.showError(err);
            });
        } else {
            this.socket.setObject(id, {
                common: {
                    name,
                    expert: true,
                    engineType: type,
                    engine: 'system.adapter.javascript.' + (instance || 0),
                    source: '',
                    debug: false,
                    verbose: false
                },
                type: 'script'
            }).then(() => {
                setTimeout(() => this.onSelect(id), 1000);
            }).catch(err => {
                this.showError(err);
            });
        }
    }

    onEnableDisable(id, enabled) {
        if (this.scripts[id] && this.scripts[id].type === 'script') {
            const common = this.objects[id].common;
            common.enabled = enabled;
            common.expert = true;
            this.socket.updateScript(id, id, common)
                .then(() => {})
                .catch(err => err !== 'canceled' && this.showError(err));
        }
    }

    getLiveHost(cb, _list) {
        if (!_list) {
            _list = JSON.parse(JSON.stringify(this.hosts)) || [];
        }

        if (_list.length) {
            const id = _list.shift();
            this.socket.getState(id + '.alive', (err, state) => {
                if (!err && state && state.val) {
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
                this.showError(I18n.t('No active host found'));
                return;
            }

            const d = new Date();
            let date = d.getFullYear();
            let m = d.getMonth() + 1;
            if (m < 10) m = '0' + m;
            date += '-' + m;
            m = d.getDate();
            if (m < 10) m = '0' + m;
            date += '-' + m + '-';

            this.socket.socket.emit('sendToHost', host, 'readObjectsAsZip', {
                adapter: 'javascript',
                id: 'script.js',
                link: date + 'scripts.zip' // request link to file and not the data itself
            }, data => {
                if (typeof data === 'string') {
                    // it is a link to created file
                    const a = document.createElement('a');
                    a.href = '/zip/' + date + 'scripts.zip';
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
                this.socket.socket.emit('sendToHost', host, 'writeObjectsAsZip', {
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

    renderMain() {
        const {classes} = this.props;
        return [
            (<div className={classes.content} key="main">
                <div key="closeMenu" className={classes.menuOpenCloseButton} onClick={() => {
                    window.localStorage && window.localStorage.setItem('App.menuOpened', this.state.menuOpened ? 'false' : 'true');
                    this.setState({menuOpened: !this.state.menuOpened, resizing: true});
                    setTimeout(() => this.setState({resizing: false}), 300);
                }}>
                    {this.state.menuOpened ? (<IconMenuOpened />) : (<IconMenuClosed />)}
                </div>
                <SplitterLayout
                    key="splitterLayout"
                    vertical={true}
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
                        theme={this.state.themeType}
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
                        onRestart={id => this.socket.extendObject(id, {})}
                        selected={this.state.selected && this.objects[this.state.selected] && this.objects[this.state.selected].type === 'script' ? this.state.selected : ''}
                        objects={this.objects}
                    />
                    <Log key="log" editing={this.state.editing} connection={this.socket} selected={this.state.selected}/>
                </SplitterLayout>
            </div>),
            this.state.message ? (<DialogMessage key="dialogMessage" onClose={() => this.setState({message: ''})} text={this.state.message}/>) : null,
            this.state.errorText ? (<DialogError key="dialogError" onClose={() => this.setState({errorText: ''})} text={this.state.errorText}/>) : null,
            this.state.importFile ? (<DialogImportFile key="dialogImportFile" onClose={data => this.onImport(data)} />) : null,
            this.state.confirm ? (<DialogConfirm key="dialogConfirm" onClose={() => {
                this.setState({confirm: ''});
                this.confirmCallback();
                this.confirmCallback = null;
            }} onOk={() => {
                this.setState({confirm: ''});
                this.confirmCallback(true);
                this.confirmCallback = null;
            }} question={this.state.confirm}/>) : null,
        ];
    }

    render() {
        const {classes} = this.props;

        if (!this.state.ready) {
            // return (<CircularProgress className={classes.progress} size={50} />);
            return (<Loader theme={this.state.themeType}/>);
        }

        return (
                <div className={classes.root}>
                    (<SplitterLayout
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
                                objects={this.objects}
                                scriptsHash={this.state.scriptsHash}
                                instances={this.state.instances}
                                update={this.state.updateScripts}
                                onRename={this.onRename.bind(this)}
                                onSelect={this.onSelect.bind(this)}
                                selectId={this.state.menuSelectId}
                                onEdit={this.onEdit.bind(this)}
                                expertMode={this.state.expertMode}
                                theme={this.state.themeType}
                                onThemeChange={theme => {
                                    window.localStorage && window.localStorage.setItem('App.theme', theme);
                                    this.setState({themeType: theme}, () => this.props.onThemeChange(theme))
                                }}
                                runningInstances={this.state.runningInstances}
                                onExpertModeChange={this.onExpertModeChange.bind(this)}
                                onDelete={this.onDelete.bind(this)}
                                onAddNew={this.onAddNew.bind(this)}
                                onEnableDisable={this.onEnableDisable.bind(this)}
                                onExport={this.onExport.bind(this)}
                                width={this.menuSize}
                                onImport={() => this.setState({importFile: true})}
                                onSearch={searchText => this.setState({searchText})}
                            />
                        </div>
                        {this.renderMain()}}
                    </SplitterLayout>
                </div>
        );
    }
}

export default withStyles(styles)(App);
