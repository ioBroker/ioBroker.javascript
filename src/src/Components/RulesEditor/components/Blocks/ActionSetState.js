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
            value = `"${value.replace(/"/g, '\\"')}"${GenericBlock.getReplacesInText(context)}`;
        }

        if (config.toggle) {
            return `await setStateAsync("${config.oid}", !(await getStateAsync("${config.oid}")).val, ${config.tagCard === 'update'});`;
        } else {
            return `await setStateAsync("${config.oid}", ${value}, ${config.tagCard === 'update'});`;
        }
    }

    _setInputs(toggle) {
        toggle = toggle === undefined ? this.state.settings.toggle : toggle;
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
        let inputs;
        switch (type) {
            case 'number':
                inputs = [{
                    backText: oidUnit || '',
                    frontText: 'with',
                    nameRender: 'renderNumber',
                    defaultValue: oidMax === undefined ? 0 : oidMax,
                    attr: 'value'
                }];
                if (this.state.settings.value !== undefined && isNaN(parseFloat(this.state.settings.value))) {
                    settings = {value: oidMax === undefined ? 0 : oidMax};
                }
                break;

            case 'slider':
                inputs = [{
                    nameRender: 'renderSlider',
                    defaultValue: oidMax,
                    min: oidMin,
                    max: oidMax,
                    unit: oidUnit,
                    step: oidStep,
                    attr: 'value'
                }];
                const f = parseFloat(this.state.settings.value);
                if (this.state.settings.value !== undefined &&
                    (isNaN(f) || f < oidMin || f > oidMax)
                ) {
                    settings = {value: oidMax};
                }
                break;

            case 'select':
                inputs = [{
                    nameRender: 'renderSelect',
                    frontText: 'with',
                    options,
                    defaultValue: options[0].value,
                    attr: 'value'
                }];
                if (this.state.settings.value !== undefined && !options.find(item => item.value === this.state.settings.value)) {
                    settings = {value: options[0].value};
                }
                break;

            case 'boolean':
                inputs = [
                    {
                        backText: 'toggle value',
                        attr: 'toggle',
                        nameRender: 'renderCheckbox',
                        defaultValue: false,
                    }
                ];
                if (!toggle) {
                    inputs.push({
                        backText: 'true',
                        frontText: 'false',
                        nameRender: 'renderSwitch',
                        defaultValue: false,
                        attr: 'value'
                    })
                }

                if (this.state.settings.value !== undefined && this.state.settings.value !== false && this.state.settings.value !== true) {
                    settings = {value: false};
                }
                break;

            case 'button':
                inputs = [{
                    nameRender: 'renderButton',
                    defaultValue: true,
                    attr: 'value'
                }];
                if (this.state.settings.value !== undefined && this.state.settings.value !== true) {
                    settings = {value: true};
                }
                break;

            case 'color':
                inputs = [{
                    nameRender: 'renderColor',
                    frontText: 'with',
                    defaultValue: '#FFFFFF',
                    attr: 'value'
                }];
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
                inputs = [{
                    backText: oidUnit || '',
                    frontText: 'with',
                    nameRender: 'renderText',
                    defaultValue: '',
                    attr: 'value'
                }];
                break;
        }

        return {inputs, newSettings: settings};
    }

    onTagChange(tagCard, cb, ignore, toggle) {
        const {inputs, newSettings} = this._setInputs(toggle);
        inputs.unshift({
            nameRender: 'renderObjectID',
            attr: 'oid',
            defaultValue: '',
            checkReadOnly: true,
        });

        this.setState({inputs}, () => super.onTagChange(null, () => {
            if (newSettings) {
                const settings = JSON.parse(JSON.stringify(this.state.settings));
                Object.assign(settings, newSettings);
                this.setState(settings);
                this.props.onChange(settings);
            }
        }));
    }

    onValueChanged(value, attr) {
        this.onTagChange(undefined, undefined, undefined, attr === 'toggle' ? value : undefined);
    }

    static getStaticData() {
        return {
            acceptedBy: 'actions',
            name: { en: 'Set state action', ru: 'Set state action' },
            id: 'ActionSetState',
            icon: 'PlayForWork',
            tagCardArray: ['control', 'update'],
            title: 'Control or update some state',
            helpDialog: 'You can use %s in the value to use the current trigger value or %id to display the triggered object ID'
        }
    }

    getData() {
        return ActionSetState.getStaticData();
    }
}

export default ActionSetState;
