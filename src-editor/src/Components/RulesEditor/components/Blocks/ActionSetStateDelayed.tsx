import React from 'react';
import { I18n } from '@iobroker/adapter-react-v5';
import { GenericBlock } from '../GenericBlock';
import type {
    RuleBlockConfigActionSetState,
    RuleBlockConfigActionSetStateDelayed,
    RuleBlockDescription,
    RuleContext,
    RuleInputAny,
    RuleInputNumber,
    RuleInputObjectID,
    RuleTagCardTitle,
    GenericBlockProps,
} from '@iobroker/javascript-rules-dev';
import { renderValue } from '../../helpers/utils';

class ActionSetStateDelayed extends GenericBlock<RuleBlockConfigActionSetStateDelayed> {
    constructor(props: GenericBlockProps<RuleBlockConfigActionSetStateDelayed>) {
        super(props, ActionSetStateDelayed.getStaticData());
    }

    isAllTriggersOnState(): boolean {
        return (
            !!this.props.userRules?.triggers?.find(item => item.id === 'TriggerState') &&
            !this.props.userRules?.triggers?.find(item => item.id !== 'TriggerState')
        );
    }

    static compile(config: RuleBlockConfigActionSetStateDelayed, context: RuleContext): string {
        let value = config.value;
        if (config.useTrigger) {
            value = config.toggle ? '!obj.state.val' : 'obj.state.val';
        } else {
            if (value === undefined || value === null) {
                value = '';
            }

            if (
                typeof config.value === 'string' &&
                parseFloat(config.value).toString() !== config.value &&
                config.value !== 'true' &&
                config.value !== 'false'
            ) {
                value = `"${(value as string).replace(/"/g, '\\"')}"${GenericBlock.getReplacesInText(context)}`;
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
\t\tsetStateDelayed("${config.oid}", subActionVar${config._id}, ${config.tagCard === 'update'}, ${parseInt(config.delay as string, 10)}, ${config.clearRunning ? 'true' : 'false'});`;
    }

    renderDebug(debugMessage: { data: { ack: boolean; val: any } }): React.JSX.Element {
        return (
            <span>
                {I18n.t('Set:')}{' '}
                <span
                    className={debugMessage.data.ack ? this.props.classes?.valueAck : this.props.classes?.valueNotAck}
                >
                    {renderValue(debugMessage.data.val)}
                </span>
            </span>
        );
    }

    _setInputs(
        useTrigger?: boolean,
        toggle?: boolean,
    ): { inputs: RuleInputAny[]; newSettings?: Partial<RuleBlockConfigActionSetState> } {
        const isAllTriggersOnState = this.isAllTriggersOnState();

        toggle = toggle === undefined ? this.state.settings.toggle : toggle;
        useTrigger = useTrigger === undefined ? this.state.settings.useTrigger : useTrigger;
        let type: 'number' | 'string' | 'boolean' | 'button' | '' | 'slider' | 'color' | 'select' = '';
        let options: { value: string; title: string }[] | undefined;
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
        let inputs: RuleInputAny[];
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
                    inputs = [
                        {
                            backText: oidUnit || '',
                            frontText: 'with',
                            nameRender: 'renderNumber',
                            defaultValue: oidMax === undefined ? 0 : oidMax,
                            attr: 'value',
                        },
                    ];
                    if (
                        this.state.settings.value !== undefined &&
                        isNaN(parseFloat(this.state.settings.value as string))
                    ) {
                        settings = { value: oidMax === undefined ? 0 : oidMax };
                    }
                    break;

                case 'slider': {
                    inputs = [
                        {
                            nameRender: 'renderSlider',
                            defaultValue: oidMax,
                            min: oidMin,
                            max: oidMax,
                            unit: oidUnit,
                            step: oidStep,
                            attr: 'value',
                        },
                    ];
                    const f = parseFloat(this.state.settings.value as string);
                    if (this.state.settings.value !== undefined && (isNaN(f) || f < oidMin || f > oidMax)) {
                        settings = { value: oidMax };
                    }
                    break;
                }

                case 'select':
                    inputs = [
                        {
                            nameRender: 'renderSelect',
                            frontText: 'with',
                            options: options as { value: string; title: string }[],
                            defaultValue: options?.[0].value || '',
                            attr: 'value',
                        },
                    ];
                    if (
                        this.state.settings.value !== undefined &&
                        !options?.find(item => item.value === this.state.settings.value)
                    ) {
                        settings = { value: options?.[0].value || '' };
                    }
                    break;

                case 'boolean':
                    inputs = [
                        {
                            backText: 'toggle value',
                            attr: 'toggle',
                            nameRender: 'renderCheckbox',
                            defaultValue: false,
                        },
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

                    if (
                        this.state.settings.value !== undefined &&
                        this.state.settings.value !== false &&
                        this.state.settings.value !== true
                    ) {
                        settings = { value: false };
                    }
                    break;

                case 'button':
                    inputs = [
                        {
                            nameRender: 'renderButton',
                            defaultValue: true,
                            attr: 'value',
                        },
                    ];
                    if (this.state.settings.value !== undefined && this.state.settings.value !== true) {
                        settings = { value: true };
                    }
                    break;

                case 'color':
                    inputs = [
                        {
                            nameRender: 'renderColor',
                            frontText: 'with',
                            defaultValue: '#FFFFFF',
                            attr: 'value',
                        },
                    ];
                    if (
                        this.state.settings.value !== undefined &&
                        (typeof this.state.settings.value !== 'string' ||
                            (!this.state.settings.value.startsWith('#') &&
                                !this.state.settings.value.startsWith('rgb')))
                    ) {
                        settings = { value: '#FFFFFF' };
                    }
                    break;

                default:
                    inputs = [
                        {
                            backText: oidUnit || '',
                            frontText: 'with',
                            nameRender: 'renderText',
                            defaultValue: '',
                            attr: 'value',
                        },
                    ];
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
            defaultValue: 1000,
            noHelperText: true,
            attr: 'delay',
        } as RuleInputNumber);

        inputs.push({
            backText: 'clear running',
            nameRender: 'renderCheckbox',
            defaultValue: true,
            attr: 'clearRunning',
        });

        return { inputs, newSettings: settings };
    }

    onTagChange(
        _tagCard?: RuleTagCardTitle,
        cb?: () => void,
        _ignore?: any,
        toggle?: boolean,
        useTrigger?: boolean,
    ): void {
        useTrigger = useTrigger === undefined ? this.state.settings.useTrigger : useTrigger;
        const { inputs, newSettings } = this._setInputs(useTrigger, toggle);
        inputs.unshift({
            nameRender: 'renderObjectID',
            attr: 'oid',
            defaultValue: '',
            checkReadOnly: true,
        } as RuleInputObjectID);

        this.setState({ inputs }, () =>
            super.onTagChange(null, () => {
                if (newSettings) {
                    const settings = JSON.parse(JSON.stringify(this.state.settings));
                    Object.assign(settings, newSettings);
                    this.setState(settings);
                    this.props.onChange(settings);
                }
            }),
        );
    }

    onValueChanged(value?: any, attr?: string): void {
        this.onTagChange(
            undefined,
            undefined,
            undefined,
            attr === 'toggle' ? value : undefined,
            attr === 'useTrigger' ? value : undefined,
        );
    }

    onUpdate(): void {
        this.onTagChange();
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'actions',
            name: 'Set with delay',
            id: 'ActionSetStateDelayed',
            icon: 'PlayForWork',
            tagCardArray: ['control', 'update'],
            title: 'Control or update some state with delay',
            helpDialog:
                'You can use %s in the value to use the current trigger value or %id to display the triggered object ID',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return ActionSetStateDelayed.getStaticData();
    }
}

export default ActionSetStateDelayed;
