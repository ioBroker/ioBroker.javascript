import React, {Component} from 'react';
import './App.css';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import {withStyles} from '@material-ui/core/styles';
import SideMenu from './SideMenu';
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
        height: '100%',
        flexGrow: 1,
        backgroundColor: theme.palette.background.default
    },
    contentInner: {
        width: '100%',
        height: `calc(100% - ${Theme.appBar.height}px)`,
        overflow: 'auto',
        marginTop: Theme.appBar.height
    }
});

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            connected: false,
            progress: 0,
            ready: false,
            updateScripts: 0
        };

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
            onReady: (objects) => {
                this.objects = objects;
                this.setState({ready: true});
            }
        });
    }

    onNewScript(id, name) {

    }

    onRename(oldId, newId, newName) {

    }

    onDelete(id) {

    }

    render() {
        const {classes} = this.props;
        return (
            <div className={classes.root}>
                <AppBar
                    position="absolute"
                    className={classes.appBar}>
                    <Toolbar>
                        <p color="inherit">Permanent drawer</p>
                    </Toolbar>
                </AppBar>
                <nav className={classes.appSideMenu}>
                    <SideMenu objects={this.objects} update={this.state.updateScripts}/>
                </nav>
                <main className={classes.content}>
                    <div className={classes.contentInner}>
                        <p>
                            1 You think water moves fast? You should see ice.<br/>
                            You think water moves fast? You should see ice.<br/>
                            You think water moves fast? You should see ice.<br/>
                            You think water moves fast? You should see ice.<br/>
                            You think water moves fast? You should see ice.<br/>
                            You think water moves fast? You should see ice.<br/>
                            You think water moves fast? You should see ice.<br/>
                            You think water moves fast? You should see ice.<br/>
                            You think water moves fast? You should see ice.<br/>
                            You think water moves fast? You should see ice.<br/>
                            You think water moves fast? You should see ice.<br/>
                            You think water moves fast? You should see ice.<br/>
                            You think water moves fast? You should see ice.<br/>
                            You think water moves fast? You should see ice.<br/>
                            You think water moves fast? You should see ice.<br/>
                            You think water moves fast? You should see ice.<br/>
                            You think water moves fast? You should see ice.<br/>
                            You think water moves fast? You should see ice.<br/>
                            You think water moves fast? You should see ice.<br/>
                            You think water moves fast? You should see ice.<br/>
                            You think water moves fast? You should see ice.<br/>
                            You think water moves fast? You should see ice.<br/>
                            You think water moves fast? You should see ice.<br/>
                            You think water moves fast? You should see ice.<br/>
                            You think water moves fast? You should see ice.<br/>
                            You think water moves fast? You should see ice.<br/>
                            You think water moves fast? You should see ice.<br/>
                            You think water moves fast? You should see ice.<br/>
                            10 You think water moves fast? You should see ice.<br/>
                        </p>
                    </div>
                </main>
            </div>
        );
    }
}

export default withStyles(styles)(App);
