import { I18n } from '@iobroker/adapter-react-v5';
import { GenericBlock, type GenericBlockProps } from '../GenericBlock';
import type {
    RuleBlockConfigActionFunction,
    RuleBlockDescription,
    RuleTagCardTitle,
} from '@/Components/RulesEditor/types';

class ActionFunction extends GenericBlock {
    constructor(props: GenericBlockProps) {
        super(props, ActionFunction.getStaticData());
    }

    static compile(config: RuleBlockConfigActionFunction): string {
        const lines = (config.func || '').split('\n').map(line => `        ${line}`);

        lines.unshift(`\t\t_sendToFrontEnd(${config._id}, {func: 'executed'});`);
        lines.unshift(`// user function`);

        return lines.join('\n');
    }

    // eslint-disable-next-line class-methods-use-this
    renderDebug(): string {
        return I18n.t('Function: executed');
    }

    onTagChange(tagCard: RuleTagCardTitle): void {
        this.setState(
            {
                inputs: [
                    {
                        nameRender: 'renderModalInput',
                        attr: 'func',
                        noTextEdit: true,
                        defaultValue: 'console.log("Test")',
                        nameBlock: 'Function',
                    },
                ],
            },
            () => super.onTagChange(tagCard),
        );
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'actions',
            name: 'User function',
            id: 'ActionFunction',
            icon: 'Functions',
            title: 'Write your own code',
            helpDialog: 'This is advances option. You can write your own code here and it will be executed on trigger',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return ActionFunction.getStaticData();
    }
}

export default ActionFunction;
