import React from 'react';
import { I18n } from '@iobroker/gui-components';
import { GenericBlock, type RuleBlockSummary } from '../GenericBlock';
import { renderValue } from '../../helpers/utils';
import type {
    RuleBlockConfigActionOperationState,
    RuleBlockDescription,
    RuleInputAny,
    GenericBlockProps,
} from '@iobroker/javascript-rules-dev';

class ActionOperateStates extends GenericBlock<RuleBlockConfigActionOperationState> {
    constructor(props: GenericBlockProps<RuleBlockConfigActionOperationState>) {
        super(props, ActionOperateStates.getStaticData());
    }

    isAllTriggersOnState(): boolean {
        return (
            !!this.props.userRules?.triggers?.find(item => item.id === 'TriggerState') &&
            !this.props.userRules?.triggers?.find(item => item.id !== 'TriggerState')
        );
    }

    static compile(config: RuleBlockConfigActionOperationState): string {
        const oid1 = `const val2_${config._id} = (await getStateAsync("${config.oid1}")).val;`;
        const oid2 = `const val1_${config._id} = (await getStateAsync("${config.oid2}")).val;`;

        return `// ${config.oid1} ${config.operation} ${config.oid2} => ${config.oidResult}
\t\t ${oid1}
\t\t ${oid2}
\t\t_sendToFrontEnd(${config._id}, {val: val1_${config._id} ${config.operation} val2_${config._id}, ack: ${config.tagCard === 'update'}});
\t\tawait setStateAsync("${config.oidResult}", val1_${config._id} ${config.operation} val2_${config._id}, ${config.tagCard === 'update'});`;
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

    getSummary(): RuleBlockSummary | null {
        const { oid1, oid2, operation, oidResult, tagCard } = this.state.settings;
        // all three states are needed - the compiled code reads two and writes the third
        if (!oid1 || !oid2 || !oidResult) {
            return null;
        }
        const left = this.objectName(oid1) || oid1;
        const right = this.objectName(oid2) || oid2;
        const result = this.objectName(oidResult) || oidResult;
        return {
            kicker: tagCard ? I18n.t(tagCard) : undefined,
            title: `${result} ← ${left} ${operation || '+'} ${right}`,
            subtitle: oidResult,
        };
    }

    onTagChange(): void {
        const inputs: RuleInputAny[] = [];

        inputs.push({
            nameRender: 'renderObjectID',
            title: 'ID1',
            attr: 'oid1',
            defaultValue: '',
            checkReadOnly: false,
        });

        inputs.push({
            nameRender: 'renderSelect',
            // frontText: 'with',
            options: [
                { value: '+', title: '+' },
                { value: '-', title: '-' },
                { value: '*', title: '*' },
                { value: '/', title: '/' },
            ],
            doNotTranslate: true,
            defaultValue: '+',
            attr: 'operation',
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

        this.setState({ inputs }, () =>
            super.onTagChange(null, () => {
                const settings = JSON.parse(JSON.stringify(this.state.settings));
                this.props.onChange(settings);
            }),
        );
    }

    onValueChanged(_value: any, _attr: string): void {
        this.onTagChange();
    }

    onUpdate(): void {
        this.onTagChange();
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'actions',
            name: 'Operate two states',
            id: 'ActionOperateStates',
            icon: 'AddBox',
            tagCardArray: ['control', 'update'],
            title: 'Operations with two states',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return ActionOperateStates.getStaticData();
    }
}

export default ActionOperateStates;
