import { I18n } from '@iobroker/gui-components';

import { GenericBlock, type RuleBlockSummary } from '../GenericBlock';
import type {
    RuleBlockConfig,
    RuleBlockDescription,
    RuleContext,
    RuleTagCardTitle,
    GenericBlockProps,
} from '@iobroker/javascript-rules-dev';

interface RuleBlockConfigActionNotification extends RuleBlockConfig {
    message: string;
    /** Raises the notification as an alert instead of a plain message */
    isAlert: boolean;
}

/**
 * Raises an ioBroker notification, which the admin shows and the notification adapters forward.
 *
 * Unlike "Log text" this survives the log view: the message stays in the notification list until
 * somebody acknowledges it, which is what makes it the right block for "the freezer is thawing"
 * rather than "the rule ran".
 */
export default class ActionNotification extends GenericBlock<RuleBlockConfigActionNotification> {
    constructor(props: GenericBlockProps<RuleBlockConfigActionNotification>) {
        super(props, ActionNotification.getStaticData());
    }

    static compile(config: RuleBlockConfigActionNotification, context: RuleContext): string {
        if (!config.message) {
            return `// no notification text defined
_sendToFrontEnd(${config._id}, {message: 'No text defined'});`;
        }

        return `// notification ${config.isAlert ? 'alert' : 'message'}
\t\tconst subActionVar${config._id} = ${JSON.stringify(config.message)}${GenericBlock.getReplacesInText(context)};
\t\t_sendToFrontEnd(${config._id}, {message: subActionVar${config._id}});
\t\tregisterNotification(subActionVar${config._id}, ${!!config.isAlert});`;
    }

    // eslint-disable-next-line class-methods-use-this
    renderDebug(debugMessage: { data: { message: string } }): string {
        return `${I18n.t('Registered:')} ${debugMessage.data.message}`;
    }

    getSummary(): RuleBlockSummary | null {
        const { message, isAlert } = this.state.settings;
        if (!message) {
            return null;
        }
        return { kicker: isAlert ? I18n.t('Alert') : undefined, title: String(message) };
    }

    onTagChange(tagCard?: RuleTagCardTitle): void {
        this.setState(
            {
                inputs: [
                    {
                        nameRender: 'renderModalInput',
                        attr: 'message',
                        defaultValue: 'My device triggered',
                        nameBlock: 'Notification text',
                    },
                    {
                        nameRender: 'renderCheckbox',
                        attr: 'isAlert',
                        backText: 'as alert',
                        defaultValue: false,
                    },
                ],
            },
            () => super.onTagChange(tagCard),
        );
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'actions',
            name: 'Notification',
            id: 'ActionNotification',
            icon: 'NotificationsActive',
            title: 'Creates an ioBroker notification, which is shown in the admin',
            helpDialog:
                'You can use %s in the text to display current trigger value or %id to display the triggered object ID',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return ActionNotification.getStaticData();
    }
}
