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

        if (typeof config.value === 'string' &&
            parseFloat(config.value).toString() !== config.value &&
            config.value !== 'true' &&
            config.value !== 'false'
        ) {
            value = `"${value.replace(/"/g, '\\"')}"`;
        }

        return `await setStateAsync("${config.oid}", ${value}, ${config.tagCard === 'update'});`;
    }

    _setInputs() {
        let input;
        let type = '';
        let options;
        const { oidType, oidUnit, oidStates, oidMax, oidMin, oidRole, oidWrite, oidStep } = this.state.settings;
        let settings;

        if (oidType) {
            if (oidType === 'number') {
                type = 'number';
                if (oidMax !== undefined && oidMin !== undefined) {
                    type = 'slider';
                }
            } else if (oidType === 'boolean') {
                type = 'boolean';
                if (oidRole && oidRole.includes('button') && oidWrite) {
                    type = 'button';
                }
            } else {
                type = '';
                if (oidRole && oidRole.includes('color')) {
                    type = 'color';
                }
            }

            if (oidStates) {
                options = Object.keys(oidStates).map(val =>
                    ({value: val, title: oidStates[val]}));
                type = 'select';
            }
        }

        switch (type) {
            case 'number':
                input = {
                    backText: oidUnit || '',
                    frontText: 'with',
                    nameRender: 'renderNumber',
                    defaultValue: oidMax === undefined ? 0 : oidMax,
                }
                if (this.state.settings.value !== undefined && isNaN(parseFloat(this.state.settings.value))) {
                    settings = {value: oidMax === undefined ? 0 : oidMax};
                }
                break;

            case 'slider':
                input = {
                    nameRender: 'renderSlider',
                    defaultValue: oidMax,
                    min: oidMin,
                    max: oidMax,
                    unit: oidUnit,
                    step: oidStep,
                };
                const f = parseFloat(this.state.settings.value);
                if (this.state.settings.value !== undefined &&
                    (isNaN(f) || f < oidMin || f > oidMax)
                ) {
                    settings = {value: oidMax};
                }
                break;

            case 'select':
                input = {
                    nameRender: 'renderSelect',
                    frontText: 'with',
                    options,
                    defaultValue: options[0].value,
                };
                if (this.state.settings.value !== undefined && !options.find(item => item.value === this.state.settings.value)) {
                    settings = {value: options[0].value};
                }
                break;

            case 'boolean':
                input = {
                    backText: 'true',
                    frontText: 'false',
                    nameRender: 'renderSwitch',
                    defaultValue: false,
                };
                if (this.state.settings.value !== undefined && this.state.settings.value !== false && this.state.settings.value !== true) {
                    settings = {value: false};
                }
                break;

            case 'button':
                input = {
                    nameRender: 'renderButton',
                    defaultValue: true,
                };
                if (this.state.settings.value !== undefined && this.state.settings.value !== true) {
                    settings = {value: true};
                }
                break;

            case 'color':
                input = {
                    nameRender: 'renderColor',
                    frontText: 'with',
                    defaultValue: '#FFFFFF',
                };
                if (this.state.settings.value !== undefined &&
                    (
                        typeof this.state.settings.value !== 'string' ||
                        (typeof this.state.settings.value.startsWith('#') &&
                         typeof this.state.settings.value.startsWith('rgb'))
                        )) {
                    settings = {value: '#FFFFFF'};
                }
                break;

            default:
                input = {
                    backText: oidUnit || '',
                    frontText: 'with',
                    nameRender: 'renderText',
                    defaultValue: ''
                };
                break;
        }
        input.attr = 'value';

        return {input, newSettings: settings};
    }

    onTagChange() {
        const {input, newSettings} = this._setInputs();
        let inputs = [
            {
                nameRender: 'renderObjectID',
                attr: 'oid',
                defaultValue: '',
            },
            input
        ];

        this.setState({inputs}, () => super.onTagChange(null, () => {
            if (newSettings) {
                const settings = JSON.parse(JSON.stringify(this.state.settings));
                Object.assign(settings, newSettings);
                this.setState(settings);
                this.props.onChange(settings);
            }
        }));
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
            tagCardArray: ['control', 'update'],
            title: 'Control or update some state'
        }
    }

    getData() {
        return ActionSetState.getStaticData();
    }
}

export default ActionSetState;
