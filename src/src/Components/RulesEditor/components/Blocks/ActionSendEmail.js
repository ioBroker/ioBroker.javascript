import GenericBlock from '../GenericBlock';
import Compile from "../../Compile";

class ActionSendEmail extends GenericBlock {
    constructor(props) {
        super(props, ActionSendEmail.getStaticData());
    }

    static compile(config, context) {
        return `schedule('* 1 * * *', ${Compile.STANDARD_FUNCTION});`;
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
                    nameBlock: 'Recipients',
                    frontText: 'To:',
                },
                {
                    attr: 'title',
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
        });
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
        }
    }

    getData() {
        return ActionSendEmail.getStaticData();
    }
}

export default ActionSendEmail;
