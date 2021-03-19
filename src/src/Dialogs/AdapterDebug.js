import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from "@material-ui/core/styles";

import Button from '@material-ui/core/Button';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Dialog from '@material-ui/core/Dialog';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import Grid from '@material-ui/core/Grid';
import ListItemText from '@material-ui/core/ListItemText';

import IconOk from '@material-ui/icons/Check';
import IconCancel from '@material-ui/icons/Cancel';

import I18n from '@iobroker/adapter-react/i18n';

const styles = theme => ({
    buttonIcon: {
        marginRight: theme.spacing(1),
    },
    icon: {
        width: 24,
        height: 24,
    }
});


class DialogAdapterDebug extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            instances: [],
            showAskForStop: false,
            jsInstance: window.localStorage.getItem('javascript.debug.instance') || '',
            jsInstanceHost: '',
            adapterToDebug: window.localStorage.getItem('javascript.debug.adapter') || '',
        };
    }

    componentDidMount() {
        this.props.socket.getAdapterInstances()
            .then(instances => {
                instances = instances.filter(i => i && !i.common?.onlyWWW).map(item =>  {
                    const name = item._id.replace(/^system\.adapter\./, '');
                    const [adapter] = name.split('.');
                    return {
                        id: name,
                        enabled: item.common?.enabled,
                        host: item.common?.host,
                        icon: item.common?.icon ? `../../adapter/${adapter}/${item.common.icon}` : '',
                    };
                });
                let jsInstance = this.state.jsInstance || '';
                let jsInstanceObj = this.state.jsInstance && instances.find(item => item.id === this.state.jsInstance);
                let jsInstanceHost;

                // check if selected instance is in the list
                if (!this.state.jsInstance || !jsInstanceObj) {
                    jsInstance = instances.find(item => item.id.startsWith('javascript.')); // take the first one
                    jsInstanceHost = jsInstance ? jsInstance.host : '';
                    jsInstance = jsInstance ? jsInstance.id : '';
                } else {
                    jsInstanceHost = jsInstanceObj ? jsInstanceObj.host : '';
                }

                let adapterToDebug = this.state.adapterToDebug || '';
                if (adapterToDebug && !instances.find(item => item.id === adapterToDebug)) {
                    adapterToDebug = '';
                }

                this.setState({instances, jsInstance, adapterToDebug, jsInstanceHost});
            });
    }

    handleOk = () => {
        // TODO
        if (this.state.instances.find(item => item.id === this.state.adapterToDebug).enabled) {
            return this.props.socket.getObject('system.adapter.' + this.state.adapterToDebug)
                .then(obj => {
                    obj.common.enabled = false;
                    this.props.socket.setObject(obj._id, obj)
                        .then(() =>
                            this.props.onDebug(this.state.jsInstance, this.state.adapterToDebug));
                })
        } else {
            this.props.onDebug(this.state.jsInstance, this.state.adapterToDebug);
        }
    };

    renderJavascriptList() {
        const js = this.state.instances.filter(item => item.id.startsWith('javascript.'));
        if (js.length < 2) {
            return null;
        } else {
            return <Grid item>
                <div>{I18n.t('Host')}</div>
                <List component="nav">
                    {js.map(item => <ListItem
                        button
                        selected={this.state.jsInstance === item.id}
                        onClick={this.setState({jsInstance: item.id, jsInstanceHost: item.host})}
                    >
                        <ListItemIcon><img src={item.icon} alt={item.id} className={this.props.classes.icon}/></ListItemIcon>
                        <ListItemText primary={item.id} />
                    </ListItem>)}
                </List>
            </Grid>;
        }
    }

    renderInstances() {
        if (!this.state.jsInstance) {
            return <Grid item/>;
        } else {
            const instances = this.state.instances.filter(item => item.id !== this.state.jsInstance && item.host === this.state.jsInstanceHost);
            return <Grid item>
                <div>{I18n.t('Instances')}</div>
                <List component="nav">
                    {instances.map(item => <ListItem
                        button
                        selected={this.state.adapterToDebug === item.id}
                        onDoubleClick={() => this.setState({adapterToDebug: item.id}, () => this.handleOk())}
                        onClick={() => this.setState({adapterToDebug: item.id})}
                    >
                        <ListItemIcon><img src={item.icon} alt={item.id} className={this.props.classes.icon}/></ListItemIcon>
                        <ListItemText primary={item.id} />
                    </ListItem>)}
                </List>
            </Grid>;
        }
    }

    render() {
        return <Dialog
            disableBackdropClick
            disableEscapeKeyDown
            maxWidth="md"
            fullWidth={true}
            open={true}
            aria-labelledby="confirmation-dialog-title"
        >
            <DialogTitle id="confirmation-dialog-title">{this.props.title || I18n.t('Debug instance')}</DialogTitle>
            <DialogContent>
                <Grid container>
                    {this.renderJavascriptList()}
                    {this.renderInstances()}
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={this.handleOk} disabled={!this.state.jsInstance || !this.state.adapterToDebug} color="primary"><IconOk className={this.props.classes.buttonIcon}/>{I18n.t('Start')}</Button>
                <Button onClick={() => this.props.onClose()}><IconCancel className={this.props.classes.buttonIcon}/>{I18n.t('Close')}</Button>
            </DialogActions>
        </Dialog>;
    }
}

DialogAdapterDebug.propTypes = {
    socket: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    onDebug: PropTypes.func.isRequired,
};

export default withStyles(styles)(DialogAdapterDebug);
