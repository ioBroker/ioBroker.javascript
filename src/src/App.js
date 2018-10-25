import React, {Component} from 'react';
import './App.css';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import {withStyles} from '@material-ui/core/styles';
import SideMenu from './SideMenu';
import Theme from './Theme';

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
                    <SideMenu/>
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
