import { I18n } from '@iobroker/gui-components';

import { GenericBlock, type RuleBlockSummary } from '../GenericBlock';
import { STANDARD_FUNCTION_MESSAGE, STANDARD_FUNCTION_MESSAGE_ONCHANGE } from '../../helpers/Compile';
import type {
    RuleBlockConfig,
    RuleBlockDescription,
    RuleContext,
    RuleTagCardTitle,
    GenericBlockProps,
} from '@iobroker/javascript-rules-dev';

interface RuleBlockConfigTriggerMessage extends RuleBlockConfig {
    /** The message name this rule listens for */
    message: string;
}

/**
 * Starts the rule when another script or an adapter sends a message to it.
 *
 * Without this the rule editor can only react to what happens inside ioBroker - a state, a clock or
 * a restart. This is the one trigger that lets something *outside* call a rule, which is what makes
 * a rule reusable from a script: `messageTo({instance: 'javascript.0'}, 'myMessage', data)`.
 *
 * The payload is available to the text of every action as `%s`, see `GenericBlock.getReplacesInText`.
 */
export default class TriggerMessage extends GenericBlock<RuleBlockConfigTriggerMessage> {
    constructor(props: GenericBlockProps<RuleBlockConfigTriggerMessage>) {
        super(props, TriggerMessage.getStaticData());
    }

    static compile(config: RuleBlockConfigTriggerMessage, context: RuleContext): string {
        let func = context.justCheck ? STANDARD_FUNCTION_MESSAGE : STANDARD_FUNCTION_MESSAGE_ONCHANGE;
        func = func.replace(
            '"__%%DEBUG_TRIGGER%%__"',
            `_sendToFrontEnd(${config._id}, {message: typeof data === "object" ? JSON.stringify(data) : data})`,
        );

        // `JSON.stringify` and not quotes by hand: a message name is free text, and a quote in it
        // would otherwise end the string literal and take the whole script down with it
        return `onMessage(${JSON.stringify(config.message || 'message')}, ${func});`;
    }

    // eslint-disable-next-line class-methods-use-this
    renderDebug(debugMessage: { data: { message: string } }): string {
        return `${I18n.t('Received:')} ${debugMessage.data.message}`;
    }

    getSummary(): RuleBlockSummary | null {
        const { message } = this.state.settings;
        if (!message) {
            return null;
        }
        return { kicker: I18n.t('On message'), title: String(message) };
    }

    onTagChange(tagCard?: RuleTagCardTitle): void {
        this.setState(
            {
                inputs: [
                    {
                        nameRender: 'renderText',
                        attr: 'message',
                        frontText: 'Message name:',
                        defaultValue: 'myMessage',
                    },
                ],
            },
            () => super.onTagChange(tagCard),
        );
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'triggers',
            name: 'On message',
            id: 'TriggerMessage',
            icon: 'Message',
            title: 'Triggers the rule when another script or adapter sends a message',
            helpDialog:
                "Send the message from a script with messageTo({instance: 'javascript.0'}, 'myMessage', data). The sent data is available in the texts of the actions as %s.",
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return TriggerMessage.getStaticData();
    }
}
