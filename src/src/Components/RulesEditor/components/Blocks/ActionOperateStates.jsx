import GenericBlock from '../GenericBlock';
import I18n from '@iobroker/adapter-react/i18n';

class ActionOperateStates extends GenericBlock {
    constructor(props) {
        super(props, ActionOperateStates.getStaticData());
    }

    isAllTriggersOnState() {
        return this.props.userRules?.triggers?.find(item => item.id === 'TriggerState') &&
            !this.props.userRules?.triggers?.find(item => item.id !== 'TriggerState');
    }

    static compile(config, context) {
        let oid1 = `const val2_${config._id} = (await getStateAsync("${config.oid1}")).val;`;
        let oid2 = `const val1_${config._id} = (await getStateAsync("${config.oid2}")).val;`;

        return `// ${config.oid1} ${config.operation} ${config.oid2} => ${config.oidResult}
\t\t ${oid1}
\t\t ${oid2}
\t\t_sendToFrontEnd(${config._id}, {val: val1_${config._id} ${config.operation} val2_${config._id}, ack: ${config.tagCard === 'update'}});
\t\tawait setStateAsync("${config.oidResult}", val1_${config._id} ${config.operation} val2_${config._id}, ${config.tagCard === 'update'});`;
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
        return <span>{I18n.t('Set:')} <span className={debugMessage.data.ack ? this.props.classes.valueAck : this.props.classes.valueNotAck}>{ActionOperateStates.renderValue(debugMessage.data.val)}</span></span>;
    }

    onTagChange(tagCard, cb, ignore, toggle, useTrigger) {
        const inputs = [];

        inputs.push({
            nameRender: 'renderObjectID',
            title: 'ID1',
            attr: 'oid1',
            defaultValue: '',
            checkReadOnly: false,
        });

        inputs.push({
            nameRender: 'renderSelect',
            //frontText: 'with',
            options: [
                {value: '+', title: '+'},
                {value: '-', title: '-'},
                {value: '*', title: '*'},
                {value: '/', title: '/'},
            ],
            doNotTranslate: true,
            defaultValue: '+',
            attr: 'operation'
        });

        inputs.push({
            nameRender: 'renderObjectID',
            title: 'ID2',
            attr: 'oid2',
            defaultValue: '',
            checkReadOnly: false,
        });

        inputs.push({
            nameRender: 'renderNameText',
            defaultValue: 'store in',
            attr: 'textEqual',
        });

        inputs.push({
            nameRender: 'renderObjectID',
            attr: 'oidResult',
            defaultValue: '',
            checkReadOnly: true,
        });

        this.setState({inputs}, () => super.onTagChange(null, () => {
            const settings = JSON.parse(JSON.stringify(this.state.settings));
            this.props.onChange(settings);
        }));
    }

    onValueChanged(value, attr, context) {
        this.onTagChange(undefined, undefined, undefined, attr === 'toggle' ? value : undefined, attr === 'useTrigger' ? value : undefined);
    }

    onUpdate() {
        this.onTagChange();
    }

    static getStaticData() {
        return {
            acceptedBy: 'actions',
            name: 'Operate two states',
            id: 'ActionOperateStates',
            icon: 'AddBox',
            tagCardArray: ['control', 'update'],
            title: 'Operations with two states',
        }
    }

    getData() {
        return ActionOperateStates.getStaticData();
    }
}

export default ActionOperateStates;
