import React from 'react';
import {withStyles} from '@material-ui/core/styles';

import GenericBlock from '../GenericBlock';
import Compile from '../../helpers/Compile';
import Button from '@material-ui/core/Button';
import Switch from '@material-ui/core/Switch';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import TextField from '@material-ui/core/TextField';
import DialogTitle from '@material-ui/core/DialogTitle';
import Slide from '@material-ui/core/Slide';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';

import { MdCancel as IconCancel } from 'react-icons/md';
import { MdCheck as IconCheck } from 'react-icons/md';

import I18n from '@iobroker/adapter-react/i18n';

const styles = theme => ({
    valueAck: {
        color: '#b02323'
    },
    valueNotAck: {
        color: '#12ac15'
    },
});

const Transition = React.forwardRef((props, ref) =>
    <Slide direction="up" ref={ref} {...props} />);

class TriggerState extends GenericBlock {
    constructor(props) {
        super(props, TriggerState.getStaticData());
        this.inputRef = React.createRef();
    }

    static compile(config, context) {
        let func = context.justCheck ? Compile.STANDARD_FUNCTION_STATE : Compile.STANDARD_FUNCTION_STATE_ONCHANGE;
        func = func.replace('"__%%DEBUG_TRIGGER%%__"', `_sendToFrontEnd(${config._id}, {val: obj.state.val, ack: obj.state.ack, valOld: obj.oldState && obj.oldState.val, ackOld: obj.oldState && obj.oldState.ack})`);
        return `on({id: "${config.oid || ''}", change: "${config.tagCard === 'on update' ? 'any' : 'ne'}"}, ${func});`
    }

    static renderValue(val) {
        if (val === null) {
            return 'null';
        } else if (val === undefined) {
            return 'undefined';
        } else if (Array.isArray(val)) {
            return val.join(', ');
        } else if (typeof val === 'object') {
            return JSON.stringify(val);
        } else {
            return val.toString();
        }
    }

    renderDebug(debugMessage) {
        if (debugMessage.data.valOld !== undefined) {
            return <span>{I18n.t('Triggered')} <span className={debugMessage.data.ackOld ? this.props.classes.valueAck : this.props.classes.valueNotAck}>{TriggerState.renderValue(debugMessage.data.valOld)}</span> → <span className={debugMessage.data.ack ? this.props.classes.valueAck : this.props.classes.valueNotAck}>{TriggerState.renderValue(debugMessage.data.val)}</span></span>;
        } else {
            return <span>{I18n.t('Triggered')} <span className={debugMessage.data.ack ? this.props.classes.valueAck : this.props.classes.valueNotAck}>{TriggerState.renderValue(debugMessage.data.val)}</span></span>;
        }
    }

    onWriteValue() {
        this.setState({openSimulate: false});
        let simulateValue = this.state.simulateValue;
        window.localStorage.setItem(`javascript.app.${this.state.settings.oid}_ack`, this.state.simulateAck);
        if (this.state.settings.oidType === 'boolean') {
            simulateValue = simulateValue === true || simulateValue === 'true' || simulateValue === '1';
        } else if (this.state.settings.oidType === 'number') {
            simulateValue = parseFloat(simulateValue) || 0;
        }
        window.localStorage.setItem(`javascript.app.${this.state.settings.oid}`, simulateValue);
        this.props.socket.setState(this.state.settings.oid, simulateValue, !!this.state.simulateAck);
    }

    renderWriteState() {
        return <>
            <Button
                disabled={!this.state.settings.oid || !this.state.enableSimulation}
                variant="contained"
                color="primary"
                onClick={() => {
                    this.setState({
                        openSimulate: true,
                        simulateValue: this.state.settings.oidType === 'boolean' ?
                            window.localStorage.getItem('javascript.app.' + this.state.settings.oid) === 'true' :
                            (window.localStorage.getItem('javascript.app.' + this.state.settings.oid) || ''),
                        simulateAck: window.localStorage.getItem(`javascript.app.${this.state.settings.oid}_ack`) === 'true'
                    });
                    setTimeout(() => {
                        this.inputRef.current?.focus();
                    }, 200);
                }}>{I18n.t('Simulate')}</Button>
            <Dialog
                open={!!this.state.openSimulate}
                TransitionComponent={Transition}
                keepMounted
                onClose={() => this.setState({openSimulate: false})}
                aria-labelledby="simulate-dialog-slide-title"
                aria-describedby="simulate-dialog-slide-description"
            >
                <DialogTitle id="simulate-dialog-slide-title">{I18n.t('Trigger with value')}</DialogTitle>
                <DialogContent>
                    {this.state.settings.oidType === 'boolean' ?
                        <FormControlLabel
                            control={<Switch
                                inputRef={this.inputRef}
                                onKeyUp={e => e.keyCode === 13 && this.onWriteValue()}
                                value={!!this.state.simulateValue}
                                onChange={e => this.setState({simulateValue: e.target.checked})}
                            />}
                            label={I18n.t('Value')}
                        />
                        : <TextField
                            inputRef={this.inputRef}
                            label={I18n.t('Value')}
                            fullWidth={true}
                            onKeyUp={e => e.keyCode === 13 && this.onWriteValue()}
                            value={this.state.simulateValue}
                            onChange={e => this.setState({simulateValue: e.target.value})}
                        />
                    }
                    <br/>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={!!this.state.simulateAck}
                                onChange={e => this.setState({simulateAck: e.target.checked})}
                                color="primary"
                            />
                        }
                        label={I18n.t('Ack')}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        onClick={() => this.onWriteValue()}
                        color="primary">
                        <IconCheck/>{I18n.t('Write')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => this.setState({openSimulate: false})}
                    >
                        <IconCancel/>{I18n.t('Close')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>;
    }

    onTagChange(tagCard) {
        this.setState({
            inputs: [
                {
                    nameRender: 'renderObjectID',
                    attr: 'oid',
                    defaultValue: ''
                },
                {
                    nameRender: 'renderWriteState',
                }
            ]
        }, () => {
            super.onTagChange();
        });
    }

    static getStaticData() {
        return {
            acceptedBy: 'triggers',
            name: 'State',
            id: 'TriggerState',
            icon: 'FlashOn',
            tagCardArray: ['on change', 'on update'],
            title: 'Triggers the rule on update or change of some state' // translate
        }
    }

    getData() {
        return TriggerState.getStaticData();
    }
}
export default withStyles(styles)(TriggerState);
