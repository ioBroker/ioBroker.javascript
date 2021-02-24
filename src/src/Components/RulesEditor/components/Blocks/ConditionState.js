import GenericBlock from '../GenericBlock';

class ConditionState extends GenericBlock {
    constructor(props) {
        super(props, ConditionState.getStaticData());
    }

    isAllTriggersOnState() {
        return this.props.userRules?.triggers?.find(item => item.id === 'TriggerState') &&
            !this.props.userRules?.triggers?.find(item => item.id !== 'TriggerState');
    }

    static compile(config, context) {
        if (config.tagCard !== 'includes') {
            if (config.useTrigger) {
                if (context?.type === 'string') {
                    return `obj.state.value ${config.tagCard} "${config.value}"`;
                } else {
                    return `obj.state.value ${config.tagCard} ${config.value}`;
                }
            } else {
                if (config.oidType === 'string') {
                    return `await getStateAsync("${config.oid}").val ${config.tagCard} "${config.value}"`;
                } else {
                    return `await getStateAsync("${config.oid}").val ${config.tagCard} ${config.value}`;
                }
            }
        } else {
            if (config.useTrigger) {
                if (context?.type === 'string') {
                    return `obj.state.value.includes("${config.value}")`;
                } else {
                    return `false`;
                }
            } else {
                if (config.oidType === 'string') {
                    return `(await getStateAsync("${config.oid}").val).includes("${config.value}")`;
                } else {
                    return `false`;
                }
            }
        }
    }

    _setInputs(useTrigger) {
        const isAllTriggersOnState = this.isAllTriggersOnState();

        if (isAllTriggersOnState && useTrigger) {
            this.setState({
                inputs: [
                    {
                        backText: 'use trigger value',
                        nameRender: 'renderCheckbox',
                        attr: 'useTrigger',
                        defaultValue: false,
                    },
                    {
                        nameRender: 'renderText',
                        defaultValue: '',
                        attr: 'value'
                    },
                ],
                openCheckbox: false,
                iconTag: true
            });
        } else if (isAllTriggersOnState) {
            this.setState({
                inputs: [
                    {
                        backText: 'use trigger value',
                        nameRender: 'renderCheckbox',
                        attr: 'useTrigger',
                    },
                    {
                        nameRender: 'renderObjectID',
                        attr: 'oid',
                        defaultValue: '',
                    },
                    {
                        nameRender: 'renderText',
                        defaultValue: '',
                        attr: 'value',
                        frontText: 'compare with',
                    },
                ],
                iconTag: true
            });
        } else {
            this.setState({
                inputs: [
                    {
                        nameRender: 'renderObjectID',
                        attr: 'oid',
                        defaultValue: '',
                    },
                    {
                        nameRender: 'renderText',
                        defaultValue: '',
                        attr: 'value',
                        frontText: 'compare with',
                    },
                ],
                iconTag: true
            });
        }
    }

    onValueChanged(value, attr, context) {
        if (attr === 'useTrigger') {
            this._setInputs(value);
        }
    }

    onUpdate() {
        this._setInputs(this.state.settings.useTrigger);
    }

    onTagChange(tagCard) {
        this._setInputs(this.state.settings.useTrigger);
    }

    static getStaticData() {
        return {
            acceptedBy: 'conditions',
            name: { en: 'State condition', ru: 'State condition' },
            id: 'ConditionState',
            icon: 'Shuffle',
            tagCardArray: ['>', '>=', '<', '<=', '=', '<>', 'includes'],
        }
    }

    getData() {
        return ConditionState.getStaticData();
    }
}

export default ConditionState;
