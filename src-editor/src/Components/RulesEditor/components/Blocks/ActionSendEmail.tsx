import { I18n } from '@iobroker/adapter-react-v5';
import { GenericBlock, type GenericBlockProps } from '../GenericBlock';
import type { RuleBlockConfigActionSendEmail, RuleBlockDescription, RuleContext } from '@/Components/RulesEditor/types';

class ActionSendEmail extends GenericBlock<RuleBlockConfigActionSendEmail> {
    constructor(props: GenericBlockProps<RuleBlockConfigActionSendEmail>) {
        super(props, ActionSendEmail.getStaticData());
    }

    static compile(config: RuleBlockConfigActionSendEmail, context: RuleContext): string {
        if (!config.recipients) {
            return `// no recipients defined'
_sendToFrontEnd(${config._id}, {text: 'No recipients defined'});`;
        }
        return `// Send Email ${config.text || ''}
\t\tconst subActionVar${config._id} = "${(config.text || '').replace(/"/g, '\\"')}"${GenericBlock.getReplacesInText(context)};
\t\t_sendToFrontEnd(${config._id}, {text: subActionVar${config._id}});
\t\tsendTo("${config.instance || 'email.0'}", {
\t\t    to:      "${config.recipients || ''}",
\t\t    subject: "${(config.subject || 'ioBroker').replace(/"/g, '\\"')}"${GenericBlock.getReplacesInText(context)},
\t\t    text:    subActionVar${config._id}
\t\t});`;
    }

    // eslint-disable-next-line class-methods-use-this
    renderDebug(debugMessage: { data: { text: string } }): string {
        return `${I18n.t('Sent:')} ${debugMessage.data.text}`;
    }

    onTagChange(): void {
        this.setState(
            {
                inputs: [
                    {
                        attr: 'instance',
                        nameRender: 'renderInstance',
                        defaultValue: 'email.0',
                        frontText: 'Instance:',
                        adapter: 'email',
                    },
                    {
                        attr: 'recipients',
                        nameRender: 'renderText',
                        defaultValue: 'user@mail.ru',
                        frontText: 'To:',
                    },
                    {
                        attr: 'subject',
                        nameRender: 'renderText',
                        defaultValue: 'Email from iobroker',
                        nameBlock: '',
                        frontText: 'Subject:',
                    },
                    {
                        attr: 'text',
                        nameRender: 'renderModalInput',
                        defaultValue: 'Email from iobroker',
                        nameBlock: '',
                        frontText: 'Body:',
                    },
                ],
            },
            () => super.onTagChange(),
        );
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'actions',
            name: 'Send email',
            id: 'ActionSendEmail',
            adapter: 'email',
            title: 'Sends an email',
            helpDialog:
                'You can use %s in the text to display current trigger value or %id to display the triggered object ID',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return ActionSendEmail.getStaticData();
    }
}

export default ActionSendEmail;
