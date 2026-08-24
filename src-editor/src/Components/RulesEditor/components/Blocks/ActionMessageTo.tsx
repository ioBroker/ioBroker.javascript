import { I18n } from '@iobroker/gui-components';

import { GenericBlock, type RuleBlockSummary } from '../GenericBlock';
import type {
    RuleBlockConfig,
    RuleBlockDescription,
    RuleContext,
    RuleInputAny,
    RuleTagCardTitle,
    GenericBlockProps,
} from '@iobroker/javascript-rules-dev';

interface RuleBlockConfigActionMessageTo extends RuleBlockConfig {
    message: string;
    data: string;
    /** Whether the payload is handed over as an object instead of a string */
    asJson: boolean;
}

/**
 * Sends a message to other scripts and rules - the other half of the "On message" trigger.
 *
 * Without it a rule can be called by a script but can never call one, so a rule cannot be used as a
 * building block by another rule. "Send to adapter" does not cover this: it addresses adapter
 * instances, while this reaches whoever listens for the message name.
 */
export default class ActionMessageTo extends GenericBlock<RuleBlockConfigActionMessageTo> {
    constructor(props: GenericBlockProps<RuleBlockConfigActionMessageTo>) {
        super(props, ActionMessageTo.getStaticData());
    }

    static compile(config: RuleBlockConfigActionMessageTo, context: RuleContext): string {
        if (!config.message) {
            return `// no message name defined
_sendToFrontEnd(${config._id}, {message: 'No message name defined'});`;
        }

        const name = JSON.stringify(config.message);
        const label = config.message.replace(/[\r\n]+/g, ' ');

        if (config.asJson) {
            const payload = (config.data || '').trim();
            try {
                JSON.parse(payload);
            } catch {
                // the same shape the other blocks use for "not configured yet"
                return `// invalid JSON
_sendToFrontEnd(${config._id}, {message: 'Invalid JSON'});`;
            }
            // written out as the user typed it, so the generated script stays readable
            return `// messageTo ${label}
\t\t_sendToFrontEnd(${config._id}, {message: ${JSON.stringify(payload)}});
\t\tmessageTo(${name}, ${payload});`;
        }

        return `// messageTo ${label}
\t\tconst subActionVar${config._id} = ${JSON.stringify(config.data || '')}${GenericBlock.getReplacesInText(context)};
\t\t_sendToFrontEnd(${config._id}, {message: subActionVar${config._id}});
\t\tmessageTo(${name}, subActionVar${config._id});`;
    }

    // eslint-disable-next-line class-methods-use-this
    renderDebug(debugMessage: { data: { message: string } }): string {
        return `${I18n.t('Sent:')} ${debugMessage.data.message}`;
    }

    private inputs(): RuleInputAny[] {
        const asJson = !!this.state.settings.asJson;

        return [
            {
                nameRender: 'renderText',
                attr: 'message',
                frontText: 'Message name:',
                defaultValue: 'myMessage',
            },
            {
                nameRender: 'renderModalInput',
                attr: 'data',
                nameBlock: '',
                frontText: asJson ? 'JSON:' : 'Text:',
                defaultValue: 'Hello',
            },
            {
                nameRender: 'renderCheckbox',
                attr: 'asJson',
                backText: 'as JSON',
                defaultValue: false,
            },
        ];
    }

    onTagChange(tagCard?: RuleTagCardTitle): void {
        this.setState({ inputs: this.inputs() }, () => super.onTagChange(tagCard));
    }

    onValueChanged(_value: any, attr: string): void {
        // the payload field is labelled after what it holds
        if (attr === 'asJson') {
            this.onTagChange();
        }
    }

    getSummary(): RuleBlockSummary | null {
        const { message, data, asJson } = this.state.settings;
        if (!message) {
            return null;
        }
        return {
            kicker: asJson ? I18n.t('as JSON') : undefined,
            title: String(message),
            subtitle: data ? String(data) : undefined,
        };
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'actions',
            name: 'Send message',
            id: 'ActionMessageTo',
            icon: 'Forum',
            title: 'Sends a message to other scripts and rules',
            helpDialog:
                'Every rule with an "On message" trigger of the same name receives it, as does a script with onMessage(). You can use %s in the text to send the current trigger value or %id the triggered object ID.',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return ActionMessageTo.getStaticData();
    }
}
