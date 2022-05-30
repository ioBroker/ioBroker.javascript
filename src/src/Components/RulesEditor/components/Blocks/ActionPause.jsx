import GenericBlock from '../GenericBlock';
import I18n from "@iobroker/adapter-react-v5/i18n";

class ActionPause extends GenericBlock {
    constructor(props) {
        super(props, ActionPause.getStaticData());
    }

    static compile(config, context) {
        const ms = config.unit === 'ms' ? 1 : (config.unit === 's' ? 1000 : (config.unit === 'm' ? 60000 : 3600000))

        return `// pause for ${ms}ms
\t\t_sendToFrontEnd(${config._id}, {paused: true});\n
\t\tawait wait(${config.pause} * ${ms});\n
\t\t_sendToFrontEnd(${config._id}, {paused: false});`;
    }

    renderDebug(debugMessage) {
        return I18n.t('Paused: %s', debugMessage.data.paused);
    }

    _getOptions(pause) {
        pause = pause === undefined ? this.state.settings.pause : pause;
        if (pause === 1 || pause === '1') {
            return [
                { value: 'ms', title: 'millisecond' },
                { value: 's', title: 'second' },
                { value: 'm', title: 'minute' },
                { value: 'h', title: 'hour' }
            ];
        } else {
            return [
                { value: 'ms', title: 'milliseconds' },
                { value: 's', title: 'seconds' },
                { value: 'm', title: 'minutes' },
                { value: 'h', title: 'hours' }
            ];
        }
    }

    _setInputs(pause) {
        this.setState({
            inputs: [
                {
                    nameRender: 'renderNumber',
                    attr: 'pause',
                    defaultValue: 100,
                    noHelperText: true,
                },
                {
                    nameRender: 'renderSelect',
                    attr: 'unit',
                    defaultValue: 'ms',
                    options: this._getOptions(pause)
                },
            ]
        }, () => super.onTagChange());
    }

    onValueChanged(value, attr) {
        if (attr === 'pause') {
            this._setInputs(value);
        }
    }

    onTagChange(tagCard) {
        this._setInputs();
    }

    static getStaticData() {
        return {
            acceptedBy: 'actions',
            name: 'Pause',
            id: 'ActionPause',
            icon: 'Pause',
            title: 'Make a pause between actions'
        }
    }

    getData() {
        return ActionPause.getStaticData();
    }
}

export default ActionPause;
