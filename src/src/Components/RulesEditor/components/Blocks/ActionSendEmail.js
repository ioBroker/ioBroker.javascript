import GenericBlock from '../GenericBlock';

class ActionSendEmail extends GenericBlock {
    constructor(props) {
        super(props, ActionSendEmail.getStaticData());
    }

    static compile(config, context) {
        let value = '';
        if (context.trigger?.oidType) {
            value = '.replace(/%s/g, obj.state.value).replace(/%id/g, obj.id)';
        }
        if (!config.recipients) {
            return '// no recipients defined'
        } else {
            return `sendTo("${config.instance || 'email.0'}", {
            to:      "${config.recipients || ''}",
            subject: "${(config.subject || 'ioBroker').replace(/"/g, '\\"')}"${value},
            text:    "${(config.text || '').replace(/"/g, '\\"')}"${value}
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
            title: 'Sends an email'
        }
    }

    getData() {
        return ActionSendEmail.getStaticData();
    }
}

export default ActionSendEmail;
