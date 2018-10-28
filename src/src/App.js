import React, {Component} from 'react';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import {withStyles} from '@material-ui/core/styles';
import SplitterLayout from 'react-splitter-layout';

import SideMenu from './SideMenu';
import Log from './Log';
import Editor from './Editor';
import Theme from './Theme';
import Connection from './Connection';
import {PROGRESS} from './Connection';

const styles = theme => ({
    root: Theme.root,
    appSideMenu: {
        width: Theme.menu.width,
        height: '100%',
    },
    appBar: {
        width: `calc(100% - ${Theme.menu.width}px)`,
        marginLeft: Theme.menu.width,
    },
    content: {
        width: '100%',
        marginTop: Theme.appBar.height,
        height: `calc(100% - ${Theme.appBar.height}px)`,
        backgroundColor: theme.palette.background.default
    },
    splitterDiv: {
        width: `calc(100% - ${Theme.menu.width}px)`,
        height: `calc(100% - ${Theme.appBar.height}px)`
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
            dragging: false,
            selected: null
        };
        this.logSize = window.localStorage ? parseFloat(window.localStorage.getItem('App.logSize')) || 150 : 150;
        this.scripts = {};

        this.socket = new Connection({
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


    onNewScript(id, name) {

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
            this.setState({selected});
        }
    }

    showError(err) {
         console.error(err);
    }

    onDelete(id) {

    }

    render() {
        const {classes} = this.props;
        return (
            <div className={classes.root}>
                <AppBar
                    key="appbar"
                    position="absolute"
                    className={classes.appBar}>
                    <Toolbar>
                        <p color="inherit">Permanent drawer</p>
                    </Toolbar>
                </AppBar>
                <nav className={classes.appSideMenu}
                     key="menu"
                >
                    <SideMenu
                        key="sidemenu"
                        scripts={this.scripts}
                        scriptsHash={this.state.scriptsHash}
                        instances={this.state.instances}
                        update={this.state.updateScripts}
                        onRename={this.onRename.bind(this)}
                        onSelect={this.onSelect.bind(this)}
                    />
                </nav>
                <div className={classes.content}
                     key="main"
                >
                    <SplitterLayout
                        vertical={true}
                        primaryMinSize={100}
                        secondaryInitialSize={this.logSize}
                        customClassName={classes.splitterDiv}
                        onDragStart={() => this.setState({dragging: true})}
                        onSecondaryPaneSizeChange={size => this.logSize = parseFloat(size)}
                        onDragEnd={() => {
                            this.setState({dragging: false});
                            window.localStorage && window.localStorage.setItem('App.logSize', this.logSize.toString());
                        }}
                    >
                        <Editor
                            visible={!this.state.dragging}
                            onChange={(id, common) => this.onUpdateScript(id, common)}
                            key="editor"
                            id={this.state.selected}
                            script={this.state.selected && JSON.parse(JSON.stringify(this.objects[this.state.selected].common))}
                        />)}
                        <Log key="log"/>
                    </SplitterLayout>
                </div>
            </div>
        );
    }
}

export default withStyles(styles)(App);
