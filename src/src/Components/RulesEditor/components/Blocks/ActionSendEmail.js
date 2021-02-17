import GenericBlock from '../GenericBlock/index';
import Compile from "../../Compile";

class ActionSendEmail extends GenericBlock {
    constructor(props) {
        super(props, ActionSendEmail.getStaticData());
    }

    compile(config, context) {
        return `schedule('* 1 * * *', ${Compile.STANDARD_FUNCTION});`;
    }

    onTagChange(tagCard) {
        this.setState({
            inputs: [
                {
                    nameRender: 'renderSelect',
                    frontText: 'Instance:',
                    options: [{
                        value: 'email.0',
                        title: 'email.0',
                    }],
                    defaultValue: 'email.0',
                    attr: 'Instance',
                },
                {
                    nameRender: 'renderText',
                    attr: 'text',
                    defaultValue: 'user@mail.ru',
                    nameBlock: 'Recipients',
                    frontText: 'To:',
                },
                {
                    nameRender: 'renderText',
                    attr: 'modal',
                    defaultValue: 'Email from iobroker',
                    nameBlock: '',
                    frontText: 'Subject:',
                },
                {
                    nameRender: 'renderModalInput',
                    attr: 'modal2',
                    defaultValue: 'Email from iobroker',
                    nameBlock: '',
                    frontText: 'Body:',
                }
            ]
        });
    }

    static getStaticData() {
        return {
            acceptedBy: 'actions',
            name: { en: 'Send email', ru: 'Send email' },
            id: 'ActionSendEmail',
            icon: 'MailOutline'
        }
    }
}

export default ActionSendEmail;
