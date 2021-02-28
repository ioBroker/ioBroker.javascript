import GenericBlock from '../GenericBlock';

class ActionSendEmail extends GenericBlock {
    constructor(props) {
        super(props, ActionSendEmail.getStaticData());
    }

    static compile(config, context) {
        if (!config.recipients) {
            return '// no recipients defined'
        } else {
            return `sendTo("${config.instance || 'email.0'}", {
            to:      "${config.recipients || ''}",
            subject: "${(config.subject || 'ioBroker').replace(/"/g, '\\"')}"${GenericBlock.getReplacesInText(context)},
            text:    "${(config.text || '').replace(/"/g, '\\"')}"${GenericBlock.getReplacesInText(context)}
        });`;
        }
    }

    onTagChange(tagCard) {
        this.setState({
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
                }
            ]
        }, () => super.onTagChange(tagCard));
    }

    static getStaticData() {
        return {
            acceptedBy: 'actions',
            name: {
                en: 'Send email',
                ru: 'Send email'
            },
            id: 'ActionSendEmail',
            adapter: 'email',
            title: 'Sends an email',
            helpDialog: 'You can use %s in the text to display current trigger value or %id to display the triggered object ID'
        }
    }

    getData() {
        return ActionSendEmail.getStaticData();
    }
}

export default ActionSendEmail;
