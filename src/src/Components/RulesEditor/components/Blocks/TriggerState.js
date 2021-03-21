import {withStyles} from '@material-ui/core/styles';

import GenericBlock from '../GenericBlock';
import Compile from '../../helpers/Compile';

import I18n from '@iobroker/adapter-react/i18n';

const styles = theme => ({
    valueAck: {
        color: '#b02323'
    },
    valueNotAck: {
        color: '#12ac15'
    },
});

class TriggerState extends GenericBlock {
    constructor(props) {
        super(props, TriggerState.getStaticData());
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

    onTagChange(tagCard) {
        this.setState({
            inputs: [
                {
                    nameRender: 'renderObjectID',
                    attr: 'oid',
                    defaultValue: ''
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
