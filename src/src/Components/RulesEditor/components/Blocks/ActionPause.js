import GenericBlock from '../GenericBlock';

class ActionPause extends GenericBlock {
    constructor(props) {
        super(props, ActionPause.getStaticData());
    }

    static compile(config, context) {
        return `await wait(${config.pause} * ${config.unit === 'ms' ? 1 : 
            (config.unit === 's' ? 1000 : (config.unit === 'm' ? 60000 : 3600000))});`;
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
            name: {
                en: 'Pause',
                ru: 'Pause'
            },
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
