import { I18n } from '@iobroker/gui-components';

import { GenericBlock, type RuleBlockSummary } from '../GenericBlock';
import type {
    RuleBlockConfig,
    RuleBlockDescription,
    RuleContext,
    RuleTagCardTitle,
    GenericBlockProps,
} from '@iobroker/javascript-rules-dev';

interface RuleBlockConfigConditionFunction extends RuleBlockConfig {
    /** Body of the condition function - it has to `return` the result itself */
    func: string;
}

/**
 * A condition written as JavaScript - the counterpart to the "User function" action.
 *
 * The code is a function *body*, not an expression, so it can read states with `await` and decide
 * over several lines. Having to write `return` is the price for not guessing whether a snippet is
 * an expression or a body: guessing wrong would turn the condition silently false, and a condition
 * that is quietly never true is the one bug a rule cannot show you.
 */
export default class ConditionFunction extends GenericBlock<RuleBlockConfigConditionFunction> {
    constructor(props: GenericBlockProps<RuleBlockConfigConditionFunction>) {
        super(props, ConditionFunction.getStaticData());
    }

    static compile(config: RuleBlockConfigConditionFunction, context: RuleContext): string {
        // an empty function restricts nothing, the same way an empty weekday selection does not
        const body = (config.func || '').trim() || 'return true;';
        const lines = body
            .split('\n')
            .map(line => `        ${line}`)
            .join('\n');

        // an IIFE, so `return` and `await` inside mean what they look like; `!!` so the debug output
        // shows the decision and not whatever truthy value happened to be returned
        context.conditionsVars.push(`const subCond${config._id} = !!(await (async () => {\n${lines}\n    })());`);
        context.conditionsDebug.push(`_sendToFrontEnd(${config._id}, {result: subCond${config._id}});`);

        return `subCond${config._id}`;
    }

    // eslint-disable-next-line class-methods-use-this
    renderDebug(debugMessage: { data: { result: boolean } }): string {
        return `${I18n.t('Condition')}: ${debugMessage.data.result}`;
    }

    getSummary(): RuleBlockSummary | null {
        const lines = String(this.state.settings.func || '')
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean);
        if (!lines.length) {
            return null;
        }
        // one line of code is the whole story; more than one only gets its first line plus a hint
        return { title: lines.length > 1 ? `${lines[0]} …` : lines[0] };
    }

    onTagChange(tagCard?: RuleTagCardTitle): void {
        this.setState(
            {
                inputs: [
                    {
                        nameRender: 'renderModalInput',
                        attr: 'func',
                        noTextEdit: true,
                        defaultValue: 'return getState("javascript.0.variable").val > 5;',
                        nameBlock: 'Condition',
                    },
                ],
            },
            () => super.onTagChange(tagCard),
        );
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'conditions',
            name: 'User condition',
            id: 'ConditionFunction',
            icon: 'Functions',
            title: 'Write your own condition',
            helpDialog:
                'This is an advanced option. The code is the body of a function and must return the result, e.g. "return getState(\'javascript.0.variable\').val > 5;". You may use await inside.',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return ConditionFunction.getStaticData();
    }
}
