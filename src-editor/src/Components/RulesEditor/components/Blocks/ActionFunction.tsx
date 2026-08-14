import { I18n } from '@iobroker/gui-components';
import { GenericBlock, type RuleBlockSummary } from '../GenericBlock';
import type {
    RuleBlockConfigActionFunction,
    RuleBlockDescription,
    RuleTagCardTitle,
    GenericBlockProps,
} from '@iobroker/javascript-rules-dev';

class ActionFunction extends GenericBlock<RuleBlockConfigActionFunction> {
    constructor(props: GenericBlockProps<RuleBlockConfigActionFunction>) {
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

    getSummary(): RuleBlockSummary | null {
        const { func } = this.state.settings;
        const lines = String(func || '')
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean);
        if (!lines.length) {
            return null;
        }
        // one line of code is the whole story; more than one only gets its first line plus a hint
        return { title: lines.length > 1 ? `${lines[0]} …` : lines[0] };
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
