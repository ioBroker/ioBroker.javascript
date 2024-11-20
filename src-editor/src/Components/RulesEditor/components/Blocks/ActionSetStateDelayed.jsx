import { I18n } from '@iobroker/adapter-react-v5';
import { GenericBlock, type GenericBlockProps } from '../GenericBlock';

class ActionSetStateDelayed extends GenericBlock {
    constructor(props) {
        super(props, ActionSetStateDelayed.getStaticData());
    }

    isAllTriggersOnState() {
        return this.props.userRules?.triggers?.find(item => item.id === 'TriggerState') &&
            !this.props.userRules?.triggers?.find(item => item.id !== 'TriggerState');
    }

    static compile(config, context) {
        let value = config.value;
        if (config.useTrigger) {
            value = config.toggle ? '!obj.state.val' : 'obj.state.val';
        } else {
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
        }
        let v;
        if (config.toggle && !config.useTrigger) {
            v = `const subActionVar${config._id} = !(await getStateAsync("${config.oid}")).val`;
        } else {
            v = `const subActionVar${config._id} = ${value}`;
        }

        return `// set delayed state ${config.oid} to ${config.toggle && !config.useTrigger ? 'toggle' : value} with delay of ${config.delay}ms
\t\t${v};
\t\t_sendToFrontEnd(${config._id}, {val: subActionVar${config._id}, ack: ${config.tagCard === 'update'}});
\t\tsetStateDelayed("${config.oid}", subActionVar${config._id}, ${config.tagCard === 'update'}, ${parseInt(config.delay, 10)}, ${config.clearRunning ? 'true' : 'false'});`;
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
        return <span>{I18n.t('Set:')} <span className={debugMessage.data.ack ? this.props.classes.valueAck : this.props.classes.valueNotAck}>{ActionSetStateDelayed.renderValue(debugMessage.data.val)}</span></span>;
    }

    _setInputs(useTrigger, toggle) {
        const isAllTriggersOnState = this.isAllTriggersOnState();

        toggle = toggle === undefined ? this.state.settings.toggle : toggle;
        useTrigger = useTrigger === undefined ? this.state.settings.useTrigger : useTrigger;
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
                options = Object.keys(oidStates).map(val => ({ value: val, title: oidStates[val] }));
                type = 'select';
            }
        }
        let inputs;
        if (isAllTriggersOnState && useTrigger) {
            inputs = [
                {
                    backText: 'use trigger value',
                    nameRender: 'renderCheckbox',
                    attr: 'useTrigger',
                    defaultValue: false,
                },
            ];
            if (type === 'boolean') {
                inputs.push({
                    backText: 'toggle value',
                    attr: 'toggle',
                    nameRender: 'renderCheckbox',
                    defaultValue: false,
                });
            }
        } else {
            switch (type) {
                case 'number':
                    inputs = [{
                        backText: oidUnit || '',
                        frontText: 'with',
                        nameRender: 'renderNumber',
                        defaultValue: oidMax === undefined ? 0 : oidMax,
                        attr: 'value',
                    }];
                    if (this.state.settings.value !== undefined && isNaN(parseFloat(this.state.settings.value))) {
                        settings = { value: oidMax === undefined ? 0 : oidMax };
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
                        attr: 'value',
                    }];
                    const f = parseFloat(this.state.settings.value);
                    if (this.state.settings.value !== undefined &&
                        (isNaN(f) || f < oidMin || f > oidMax)
                    ) {
                        settings = { value: oidMax };
                    }
                    break;

                case 'select':
                    inputs = [{
                        nameRender: 'renderSelect',
                        frontText: 'with',
                        options,
                        defaultValue: options[0].value,
                        attr: 'value',
                    }];
                    if (this.state.settings.value !== undefined && !options.find(item => item.value === this.state.settings.value)) {
                        settings = { value: options[0].value };
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
                            attr: 'value',
                        });
                    }

                    if (this.state.settings.value !== undefined && this.state.settings.value !== false && this.state.settings.value !== true) {
                        settings = { value: false };
                    }
                    break;

                case 'button':
                    inputs = [{
                        nameRender: 'renderButton',
                        defaultValue: true,
                        attr: 'value',
                    }];
                    if (this.state.settings.value !== undefined && this.state.settings.value !== true) {
                        settings = { value: true };
                    }
                    break;

                case 'color':
                    inputs = [{
                        nameRender: 'renderColor',
                        frontText: 'with',
                        defaultValue: '#FFFFFF',
                        attr: 'value',
                    }];
                    if (this.state.settings.value !== undefined &&
                        (
                            typeof this.state.settings.value !== 'string' ||
                            (typeof this.state.settings.value.startsWith('#') &&
                                typeof this.state.settings.value.startsWith('rgb'))
                        )) {
                        settings = { value: '#FFFFFF' };
                    }
                    break;

                default:
                    inputs = [{
                        backText: oidUnit || '',
                        frontText: 'with',
                        nameRender: 'renderText',
                        defaultValue: '',
                        attr: 'value',
                    }];
                    break;
            }
            if (isAllTriggersOnState) {
                inputs.unshift({
                    backText: 'use trigger value',
                    nameRender: 'renderCheckbox',
                    attr: 'useTrigger',
                });
            }
        }

        inputs.push({
            backText: 'ms',
            frontText: 'Delay',
            nameRender: 'renderNumber',
            defaultValue: '1000',
            noHelperText: true,
            attr: 'delay',
        });
        inputs.push({
            backText: 'clear running',
            nameRender: 'renderCheckbox',
            defaultValue: true,
            attr: 'clearRunning',
        })

        return { inputs, newSettings: settings };
    }

    onTagChange(tagCard: RuleTagCardTitle, cb, ignore, toggle, useTrigger) {
        useTrigger = useTrigger === undefined ? this.state.settings.useTrigger : useTrigger;
        const {inputs, newSettings} = this._setInputs(useTrigger, toggle);
        inputs.unshift({
            nameRender: 'renderObjectID',
            attr: 'oid',
            defaultValue: '',
            checkReadOnly: true,
        });

        this.setState({inputs}, () =>
            super.onTagChange(null, () => {
                if (newSettings) {
                    const settings = JSON.parse(JSON.stringify(this.state.settings));
                    Object.assign(settings, newSettings);
                    this.setState(settings);
                    this.props.onChange(settings);
                }
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
            name: 'Set with delay',
            id: 'ActionSetStateDelayed',
            icon: 'PlayForWork',
            tagCardArray: ['control', 'update'],
            title: 'Control or update some state with delay',
            helpDialog: 'You can use %s in the value to use the current trigger value or %id to display the triggered object ID',
        }
    }

    getData() {
        return ActionSetStateDelayed.getStaticData();
    }
}

export default ActionSetStateDelayed;
