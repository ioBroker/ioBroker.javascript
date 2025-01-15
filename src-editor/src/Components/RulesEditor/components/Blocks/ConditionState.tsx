import React from 'react';

import { Button, Dialog, DialogActions, DialogContent, DialogContentText } from '@mui/material';

import { I18n } from '@iobroker/adapter-react-v5';

import { GenericBlock } from '../GenericBlock';

import HysteresisImage from '../../../assets/hysteresis.png';
import type {
    RuleBlockConfigActionActionState,
    RuleBlockConfigTriggerState,
    RuleBlockDescription,
    RuleContext,
    RuleInputAny,
    RuleInputDialog,
    RuleInputSelect,
    RuleTagCard,
    RuleTagCardTitle,
    GenericBlockProps,
    GenericBlockState,
} from '@iobroker/javascript-rules-dev';

const HYSTERESIS = `function __hysteresis(val, limit, state, hist, comp) {
    let cond1, cond2;
    if (comp === '>') {
        cond1 = val > limit + hist;
        cond2 = val <= limit - hist;
    } else if (comp === '<') {
        cond1 = val < limit - hist;
        cond2 = val >= limit + hist;
    } else if (comp === '>=') {
        cond1 = val >= limit + hist;
        cond2 = val < limit - hist;
    } else if (comp === '<=') {
        cond1 = val <= limit - hist;
        cond2 = val > limit + hist;
    } else if (comp === '=') {
        cond1 = val <= limit + hist && val > limit - hist;
        cond2 = val > limit + hist || val <= limit - hist;
    } else if (comp === '<>') {
        cond1 = val > limit + hist || val <= limit - hist;
        cond2 = val <= limit + hist && val > limit - hist;
    }
     
    if (!state && cond1) {
        return true;
    } else if (state && cond2) {
        return false;
    } else {
        return state;
    }
}`;

interface ConditionStateState extends GenericBlockState<RuleBlockConfigActionActionState> {
    showHysteresisHelp: boolean;
}

class ConditionState extends GenericBlock<RuleBlockConfigActionActionState, ConditionStateState> {
    constructor(props: GenericBlockProps<RuleBlockConfigActionActionState>) {
        super(props, ConditionState.getStaticData());
    }

    isAllTriggersOnState(): boolean {
        return (
            !!this.props.userRules?.triggers?.find(item => item.id === 'TriggerState') &&
            !this.props.userRules?.triggers?.find(item => item.id !== 'TriggerState')
        );
    }

    static compile(config: RuleBlockConfigActionActionState, context: RuleContext): string {
        let value = config.value;
        if (value === null || value === undefined) {
            value = false;
        }
        let debugValue: string;

        let result;
        if (config.tagCard === '()') {
            context.prelines = context.prelines || [];
            !context.prelines.find(item => item !== HYSTERESIS) && context.prelines.push(HYSTERESIS);
            if (config.useTrigger) {
                debugValue = 'obj.state.val';
                if (value === '') {
                    value = 0;
                }
                result = `__hysteresis(subCondVar${config._id}, ${value}, __%%STATE%%__, ${config.hist}, "${config.histComp}")`;
            } else {
                debugValue = `(await getStateAsync("${config.oid}")).val`;
                if (value === '') {
                    value = 0;
                }
                if (typeof value === 'string' && parseFloat(value.trim()).toString() !== value.trim()) {
                    value = `"${value}"`;
                }

                result = `__hysteresis(subCondVar${config._id}, ${value}, __%%STATE%%__, ${config.hist}, "${config.histComp}")`;
            }
        } else if (config.tagCard !== 'includes') {
            const compare = config.tagCard === '=' ? '==' : config.tagCard === '<>' ? '!=' : config.tagCard;
            if (config.useTrigger) {
                debugValue = 'obj.state.val';
                if ((context?.trigger as RuleBlockConfigTriggerState)?.oidType === 'string') {
                    value = (value as string).replace(/"/g, '\\"');
                    result = `subCondVar${config._id} ${compare} "${value}"`;
                } else {
                    if (value === '') {
                        value = 0;
                    }
                    if (typeof value === 'string' && parseFloat(value.trim()).toString() !== value.trim()) {
                        value = `"${value}"`;
                    }
                    result = `subCondVar${config._id} ${compare} ${value}`;
                }
            } else {
                debugValue = `(await getStateAsync("${config.oid}")).val`;
                if (config.oidType === 'string') {
                    value = (value as string).replace(/"/g, '\\"');
                    result = `subCondVar${config._id} ${compare} "${value}"`;
                } else {
                    if (value === '') {
                        value = 0;
                    }
                    if (typeof value === 'string' && parseFloat(value.trim()).toString() !== value.trim()) {
                        value = `"${value}"`;
                    }
                    result = `subCondVar${config._id} ${compare} ${value}`;
                }
            }
        } else {
            if (config.useTrigger) {
                debugValue = 'obj.state.val';
                if ((context?.trigger as RuleBlockConfigTriggerState)?.oidType === 'string') {
                    value = (value as string).replace(/"/g, '\\"');
                    result = `obj.state.val.includes("${value}")`;
                } else {
                    result = `false`;
                }
            } else {
                debugValue = `(await getStateAsync("${config.oid}")).val`;
                if (config.oidType === 'string') {
                    value = (value as string).replace(/"/g, '\\"');
                    result = `subCondVar${config._id}.includes("${value}")`;
                } else {
                    result = `false`;
                }
            }
        }
        context.conditionsStates.push({ name: `subCondVar${config._id}`, id: config.oid });
        context.conditionsVars.push(`const subCondVar${config._id} = ${debugValue};`);
        context.conditionsVars.push(`const subCond${config._id} = ${result};`);
        context.conditionsDebug.push(
            `_sendToFrontEnd(${config._id}, {result: subCond${config._id}, value: subCondVar${config._id}, compareWith: "${value}"});`,
        );
        return `subCond${config._id}`;
    }

    renderDebug(debugMessage: { data: { result: boolean; value: string; compareWith: string } }): string {
        const condition = this.state.settings.tagCard;
        if (condition === '()') {
            // TODO
        } else {
            return `${debugMessage.data.result.toString().toUpperCase()} [${debugMessage.data.value} ${condition} ${debugMessage.data.compareWith}]`;
        }

        return I18n.t('Triggered');
    }

    onShowHelp = (): void => this.setState({ showHysteresisHelp: true });

    _setInputs(
        useTrigger: boolean | undefined,
        tagCard?: RuleTagCardTitle,
        oidType?: string,
        oidUnit?: string,
        oidStates?: Record<string, string>,
    ): void {
        const isAllTriggersOnState = this.isAllTriggersOnState();

        tagCard = tagCard || this.state.settings.tagCard;
        oidType = oidType || this.state.settings.oidType;
        oidUnit = oidUnit || this.state.settings.oidUnit;
        oidStates = oidStates || this.state.settings.oidStates;
        if (useTrigger === undefined) {
            useTrigger = this.state.settings.useTrigger;
        }

        if (isAllTriggersOnState && useTrigger && this.props.userRules?.triggers?.length === 1) {
            oidType = (this.props.userRules.triggers[0] as RuleBlockConfigTriggerState).oidType;
            oidUnit = (this.props.userRules.triggers[0] as RuleBlockConfigTriggerState).oidUnit;
            oidStates = (this.props.userRules.triggers[0] as RuleBlockConfigTriggerState).oidStates;
        }

        const _tagCardArray: RuleTagCard[] = ConditionState.getStaticData().tagCardArray as RuleTagCard[];
        const tag: RuleTagCard = _tagCardArray.find(item => item.title === tagCard) || _tagCardArray[0];
        let tagCardArray: RuleTagCard[];
        let options: { value: string | boolean; title: string }[] | null = null;

        if (oidType === 'number') {
            tagCardArray = [
                {
                    title: '=',
                    title2: '[equal]',
                    text: 'equal to',
                },
                {
                    title: '>=',
                    title2: '[greater or equal]',
                    text: 'greater or equal',
                },
                {
                    title: '>',
                    title2: '[greater]',
                    text: 'greater than',
                },
                {
                    title: '<=',
                    title2: '[less or equal]',
                    text: 'less or equal',
                },
                {
                    title: '<',
                    title2: '[less]',
                    text: 'less than',
                },
                {
                    title: '<>',
                    title2: '[not equal]',
                    text: 'not equal to',
                },
                {
                    title: '()',
                    title2: '[hysteresis]',
                    text: 'hysteresis',
                },
            ];

            if (oidStates) {
                options = Object.keys(oidStates)
                    .map(val => {
                        if (oidStates) {
                            return { value: val, title: oidStates[val] };
                        }
                        return null;
                    })
                    .filter(i => i) as { value: string | boolean; title: string }[];
            }
        } else if (oidType === 'boolean') {
            tagCardArray = [
                {
                    title: '=',
                    title2: '[equal]',
                    text: 'equal to',
                },
                {
                    title: '<>',
                    title2: '[not equal]',
                    text: 'not equal to',
                },
            ];
            options = [
                { title: 'false', value: false },
                { title: 'true', value: true },
            ];
        } else {
            tagCardArray = [
                {
                    title: '=',
                    title2: '[equal]',
                    text: 'equal to',
                },
                {
                    title: '>=',
                    title2: '[greater or equal]',
                    text: 'greater or equal',
                },
                {
                    title: '>',
                    title2: '[greater]',
                    text: 'greater than',
                },
                {
                    title: '<=',
                    title2: '[less or equal]',
                    text: 'less or equal',
                },
                {
                    title: '<',
                    title2: '[less]',
                    text: 'less than',
                },
                {
                    title: '<>',
                    title2: '[not equal]',
                    text: 'not equal to',
                },
                {
                    title: '.',
                    title2: '[includes]',
                    text: 'includes',
                },
            ];
            if (oidStates) {
                options = Object.keys(oidStates).map(val => ({
                    value: val,
                    title: oidStates ? oidStates[val] : val.toString(),
                }));
            }
        }

        let settings: RuleBlockConfigActionActionState | null = null;
        if (!tagCardArray.find(item => item.title === tagCard)) {
            tagCard = tagCardArray[0].title;
            settings = settings || { ...this.state.settings };
            settings.tagCard = tagCard;
        }

        let inputs: RuleInputAny[];
        let renderText: RuleInputAny = {
            nameRender: 'renderText',
            defaultValue: '',
            attr: 'value',
            frontText: tagCard === '()' ? 'Limit' : tag?.text || 'compare with',
            doNotTranslateBack: true,
            backText: oidUnit,
        };

        if (options) {
            renderText = {
                nameRender: 'renderSelect',
                defaultValue: options[0].value,
                options,
                attr: 'value',
                frontText: tag?.text || 'compare with',
                doNotTranslateBack: true,
                backText: oidUnit,
            } as RuleInputSelect;

            if (!options.find(item => item.value === this.state.settings.value)) {
                settings = settings || { ...this.state.settings };
                settings.value = options[0].value;
            }
            if (options.length <= 2) {
                tagCardArray = [
                    {
                        title: '=',
                        title2: '[equal]',
                        text: 'equal to',
                    },
                    {
                        title: '<>',
                        title2: '[not equal]',
                        text: 'not equal to',
                    },
                ];
            }
        }

        if (isAllTriggersOnState && useTrigger) {
            inputs = [
                {
                    backText: 'use trigger value',
                    nameRender: 'renderCheckbox',
                    attr: 'useTrigger',
                    defaultValue: false,
                },
                renderText,
            ];
        } else if (isAllTriggersOnState) {
            inputs = [
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
                renderText,
            ];
        } else {
            inputs = [
                {
                    nameRender: 'renderObjectID',
                    attr: 'oid',
                    defaultValue: '',
                },
                renderText,
            ];
        }

        if (tagCard === '()') {
            inputs.splice(1, 0, {
                nameRender: 'renderDialog',
                icon: 'HelpOutline',
                frontText: 'Explanation',
                onShowDialog: this.onShowHelp,
            } as RuleInputDialog);

            inputs.splice(2, 0, {
                nameRender: 'renderSelect',
                attr: 'histComp',
                defaultValue: '>',
                frontText: 'Condition',
                doNotTranslate: true,
                options: [
                    { title: '>', value: '>' },
                    { title: '>=', value: '>=' },
                    { title: '<', value: '<' },
                    { title: '<=', value: '<=' },
                    { title: '=', value: '=' },
                    { title: '<>', value: '<>' },
                ],
            });
            inputs.push({
                frontText: 'Δ',
                doNotTranslate: true,
                nameRender: 'renderNumber',
                noHelperText: true,
                attr: 'hist',
                defaultValue: 1,
                doNotTranslateBack: true,
                backText: oidUnit,
            });
        }

        const state = {
            iconTag: true,
            tagCardArray,
            inputs,
        };

        this.setState(state, () =>
            super.onTagChange(null, () => {
                if (settings) {
                    this.setState({ settings });
                    this.props.onChange(settings);
                }
            }),
        );
    }

    onValueChanged(value: any, attr: string): void {
        if (typeof value === 'object') {
            void this._setInputs(value.useTrigger, value.tagCard, value.oidType, value.states);
        } else {
            if (attr === 'useTrigger') {
                void this._setInputs(value as boolean);
            } else if (attr === 'oidType') {
                void this._setInputs(undefined, undefined, value as string);
            } else if (attr === 'oidUnit') {
                void this._setInputs(undefined, undefined, undefined, value as string);
            } else if (attr === 'oidStates') {
                void this._setInputs(undefined, undefined, undefined, undefined, value as Record<string, string>);
            }
        }
    }

    onUpdate(): void {
        this._setInputs(this.state.settings.useTrigger);
    }

    onTagChange(tagCard: RuleTagCardTitle): void {
        this._setInputs(this.state.settings.useTrigger, tagCard);
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'conditions',
            name: 'State condition',
            id: 'ConditionState',
            icon: 'Shuffle',
            tagCardArray: [
                {
                    title: '=',
                    title2: '[equal]',
                    text: 'equal to',
                },
                {
                    title: '>=',
                    title2: '[greater or equal]',
                    text: 'greater or equal',
                },
                {
                    title: '>',
                    title2: '[greater]',
                    text: 'greater than',
                },
                {
                    title: '<=',
                    title2: '[less or equal]',
                    text: 'less or equal',
                },
                {
                    title: '<',
                    title2: '[less]',
                    text: 'less than',
                },
                {
                    title: '<>',
                    title2: '[not equal]',
                    text: 'not equal to',
                },
                {
                    title: '.',
                    title2: '[includes]',
                    text: 'includes',
                },
                {
                    title: '()',
                    title2: '[hysteresis]',
                    text: 'hysteresis',
                },
            ],
            title: 'Compares the state value with user defined value',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return ConditionState.getStaticData();
    }

    renderSpecific(): React.JSX.Element | null {
        if (this.state.showHysteresisHelp) {
            return (
                <Dialog
                    open={!0}
                    maxWidth="md"
                    onClose={() => this.setState({ showHysteresisHelp: false })}
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description"
                >
                    <DialogContent>
                        <DialogContentText id="alert-dialog-description">
                            <img
                                src={HysteresisImage}
                                alt="Hysteresis"
                            />
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={() => this.setState({ showHysteresisHelp: false })}
                            color="primary"
                            autoFocus
                        >
                            {I18n.t('OK')}
                        </Button>
                    </DialogActions>
                </Dialog>
            );
        }
        return null;
    }
}

export default ConditionState;
