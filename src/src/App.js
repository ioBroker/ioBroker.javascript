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
import DialogError from './Dialogs/Error';

const styles = theme => ({
    root: Theme.root,
    menuTransition: {
        transitionProperty: 'margin-left',
        transitionDuration: '0.3s'
    },
    appSideMenuWithMenu: {
        marginLeft: 0,
        width: Theme.menu.width,
        height: '100%',
    },
    appSideMenuWithoutMenu: {
        marginLeft: -Theme.menu.width,
        width: Theme.menu.width,
        height: '100%',
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
    splitterDivWithoutMenu: {
        width: `100%`,
        height: '100%'
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
            runningInstances: {}
        };
        // this.logIndex = 0;
        this.logSize = window.localStorage ? parseFloat(window.localStorage.getItem('App.logSize')) || 150 : 150;
        this.scripts = {};

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
            },
            onObjectChange: (objects, scripts) => this.onObjectChange(objects, scripts),
            onError: err => {
                console.error(err);
            },
            onLog: message => {
                //this.logIndex++;
                //this.setState({logMessage: {index: this.logIndex, message}})
            }
        });

        this.socket.subscribeState('system.adapter.javascript.*.alive', (id, state) => {
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

        scripts.list.forEach(id => nScripts[id] = objects[id]);
        scripts.groups.forEach(id => nScripts[id] = objects[id]);

        let scriptsHash = this.state.scriptsHash;
        if (this.compareScripts(scripts)) {
            scriptsHash++;
        }
        this.scripts = nScripts;

        this.setState({instances: scripts.instances, scriptsHash});
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

    render() {
        const {classes} = this.props;

        if (!this.state.ready) {
            //return (<CircularProgress className={classes.progress} size={50} />);
            return (<Loader />);
        }

        return (
            <div className={classes.root}>
                <nav className={classes.menuTransition + ' ' + (this.state.menuOpened ? classes.appSideMenuWithMenu : classes.appSideMenuWithoutMenu)} key="menu">
                    <SideMenu
                        key="sidemenu"
                        scripts={this.scripts}
                        scriptsHash={this.state.scriptsHash}
                        instances={this.state.instances}
                        update={this.state.updateScripts}
                        onRename={this.onRename.bind(this)}
                        onSelect={this.onSelect.bind(this)}
                        selectId={this.state.menuSelectId}
                        onEdit={this.onEdit.bind(this)}
                        expertMode={this.state.expertMode}
                        runningInstances={this.state.runningInstances}
                        onExpertModeChange={this.onExpertModeChange.bind(this)}
                        onDelete={this.onDelete.bind(this)}
                        onAddNew={this.onAddNew.bind(this)}
                        onEnableDisable={this.onEnableDisable.bind(this)}
                    />
                </nav>
                <div className={classes.content} key="main">
                    <div className={classes.menuOpenCloseButton} onClick={() => {
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
                        customClassName={classes.menuTransition + ' ' + classes.splitterDivWithoutMenu}
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
                            runningInstances={this.state.runningInstances}
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
                </div>
                {this.state.errorText ? (<DialogError onClose={() => this.setState({errorText: ''})} text={this.state.errorText}/>) : null}
            </div>
        );
    }
}

export default withStyles(styles)(App);
