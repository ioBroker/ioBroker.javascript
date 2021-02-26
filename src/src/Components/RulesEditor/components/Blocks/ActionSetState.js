import GenericBlock from '../GenericBlock';

class ActionSetState extends GenericBlock {
    constructor(props) {
        super(props, ActionSetState.getStaticData());
    }

    static compile(config, context) {
        let value = config.value;
        if (value === undefined || value === null) {
            value = '';
        }

        if (parseFloat(config.value).toString() !== config.value && config.value !== 'true' && config.value !== 'false') {
            value = `"${value.replace(/"/g, '\\"')}"`;
        }

        return `await setStateAsync("${config.oid}", ${value}, ${config.tagCard === 'update'});`;
    }

    _setInputs() {
        let obg;
        let type = '';
        const { oidType, oidUnit } = this.state.settings;
        if (oidType) {
            if (oidType === 'string') {
                type = 'number'
            }
            else if (oidType === 'boolean') {
                type = 'boolean'
            }
            else {
                type = ''
            }
        }
        switch (type) {
            case 'number':
                obg = {
                    attr: 'value',
                    backText: oidUnit || '',
                    frontText: 'with',
                    nameRender: 'renderNumber',
                    defaultValue: 30
                }
                break;

            case 'control1':
                obg = {
                    nameRender: 'renderSlider',
                    attr: 'value',
                    defaultValue: 50,
                    frontText: '0',
                    backText: '100'
                }
                break;

            case 'control2':
                obg = {
                    attr: 'value',
                    nameRender: 'renderSelect',
                    frontText: 'Instance:',
                    options: [{
                        value: 'State1',
                        title: 'State1',
                    }],
                    defaultValue: 'State1',
                }
                break;

            case 'boolean':
                obg = {
                    backText: 'true',
                    frontText: 'false',
                    nameRender: 'renderSwitch',
                    defaultValue: false,
                    attr:'boolean'
                }
                break;

            case 'control4':
                obg = {
                    nameRender: 'renderButton',
                    defaultValue: 'Press',
                    attr:'button'
                }
                break;

            case 'control5':
                obg = {
                    nameRender: 'renderColor',
                    defaultValue: 30,
                    attr:'color'
                }
                break;

            default:
                obg = {};
                break;
        }
        return { ...obg };
    }

    onTagChange() {
        this.setState({
            inputs: [
                {
                    nameRender: 'renderObjectID',
                    attr: 'oid',
                    defaultValue: '',
                },
                this._setInputs()
            ]
        });
    }

    onValueChanged() {
        this.onTagChange();
    }

    static getStaticData() {
        return {
            acceptedBy: 'actions',
            name: { en: 'Set state action', ru: 'Set state action' },
            id: 'ActionSetState',
            icon: 'PlayForWork',
            tagCardArray: ['control', 'update']
        }
    }

    getData() {
        return ActionSetState.getStaticData();
    }
}

export default ActionSetState;
