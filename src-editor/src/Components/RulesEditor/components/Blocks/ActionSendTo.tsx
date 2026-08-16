import { I18n } from '@iobroker/gui-components';

import { GenericBlock, type RuleBlockSummary } from '../GenericBlock';
import type {
    RuleBlockConfig,
    RuleBlockDescription,
    RuleContext,
    RuleInputAny,
    GenericBlockProps,
} from '@iobroker/javascript-rules-dev';

interface RuleBlockConfigActionSendTo extends RuleBlockConfig {
    instance: string;
    command: string;
    message: string;
    /** Whether the message is handed over as an object instead of a string */
    asJson: boolean;
}

/**
 * Sends a message to any adapter instance.
 *
 * Telegram, e-mail, Pushover, Pushsafer and WhatsApp all do the same thing with a different adapter
 * name, and every further notification adapter would need yet another block. This one asks for the
 * instance instead, so an adapter does not have to be known here to be usable.
 */
export default class ActionSendTo extends GenericBlock<RuleBlockConfigActionSendTo> {
    /** Resolved once per block, not once per render */
    private instancesPromise: Promise<ioBroker.InstanceObject[]> | null = null;

    constructor(props: GenericBlockProps<RuleBlockConfigActionSendTo>) {
        super(props, ActionSendTo.getStaticData());
    }

    static compile(config: RuleBlockConfigActionSendTo, context: RuleContext): string {
        if (!config.instance) {
            return `// no instance defined
_sendToFrontEnd(${config._id}, {message: 'No instance defined'});`;
        }

        // `JSON.stringify` rather than escaping the quotes by hand: that is what the older blocks do,
        // and it turns a message with a line break into a broken string literal - which does not
        // fail on its own, it takes the whole script down with it.
        const command = JSON.stringify(config.command || 'send');
        const instance = JSON.stringify(config.instance);
        const label = `${config.instance} ${config.command || 'send'}`.replace(/[\r\n]+/g, ' ');

        if (config.asJson) {
            const payload = (config.message || '').trim();
            try {
                JSON.parse(payload);
            } catch {
                // the same shape the other blocks use for "not configured yet"
                return `// invalid JSON
_sendToFrontEnd(${config._id}, {message: 'Invalid JSON'});`;
            }
            // written out as the user typed it, so the generated script stays readable
            return `// sendTo ${label}
\t\t_sendToFrontEnd(${config._id}, {message: ${JSON.stringify(payload)}});
\t\tsendTo(${instance}, ${command}, ${payload});`;
        }

        if (!config.message) {
            return `// no message defined
_sendToFrontEnd(${config._id}, {message: 'No message defined'});`;
        }

        return `// sendTo ${label}
\t\tconst subActionVar${config._id} = ${JSON.stringify(config.message)}${GenericBlock.getReplacesInText(context)};
\t\t_sendToFrontEnd(${config._id}, {message: subActionVar${config._id}});
\t\tsendTo(${instance}, ${command}, subActionVar${config._id});`;
    }

    // eslint-disable-next-line class-methods-use-this
    renderDebug(debugMessage: { data: { message: string } }): string {
        return `${I18n.t('Sent:')} ${debugMessage.data.message}`;
    }

    /**
     * @param instances the instances to offer, empty while they are still being read
     */
    private inputs(instances: string[]): RuleInputAny[] {
        const asJson = !!this.state.settings.asJson;

        return [
            {
                nameRender: 'renderSelect',
                attr: 'instance',
                frontText: 'Instance:',
                doNotTranslate: true,
                defaultValue: instances[0] || '',
                options: instances.map(instance => ({ value: instance, title: instance })),
            },
            {
                nameRender: 'renderText',
                attr: 'command',
                frontText: 'Command:',
                defaultValue: 'send',
            },
            {
                nameRender: 'renderModalInput',
                attr: 'message',
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

    private setInputs(): void {
        // show the block right away; the instance list follows as soon as it is known
        this.setState({ inputs: this.inputs([]) }, () => super.onTagChange());

        this.instancesPromise ||= this.props.socket.getAdapterInstances();

        void this.instancesPromise.then(instances => {
            if (!this.mounted) {
                return;
            }
            const names = (instances || [])
                .map(obj => obj?._id?.replace('system.adapter.', ''))
                .filter((id): id is string => !!id)
                .sort();

            this.setState({ inputs: this.inputs(names) }, () => super.onTagChange());
        });
    }

    onTagChange(): void {
        this.setInputs();
    }

    onValueChanged(_value: any, attr: string): void {
        // the message field is labelled after what it holds
        if (attr === 'asJson') {
            this.setInputs();
        }
    }

    getSummary(): RuleBlockSummary | null {
        const { instance, command, message, asJson } = this.state.settings;
        if (!instance || !message) {
            return null;
        }
        return {
            kicker: asJson ? I18n.t('as JSON') : undefined,
            title: String(message),
            subtitle: `${instance} · ${command || 'send'}`,
        };
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'actions',
            name: 'Send to adapter',
            id: 'ActionSendTo',
            icon: 'Send',
            title: 'Sends a message to any adapter instance',
            helpDialog:
                'You can use %s in the text to display current trigger value or %id to display the triggered object ID',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return ActionSendTo.getStaticData();
    }
}
