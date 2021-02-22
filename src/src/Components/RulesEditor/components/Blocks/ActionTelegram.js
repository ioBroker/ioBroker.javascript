import GenericBlock from '../GenericBlock';
import Compile from "../../Compile";

class ActionTelegram extends GenericBlock {
    constructor(props) {
        super(props, ActionTelegram.getStaticData());
    }

    static compile(config, context) {
        return `schedule('* 1 * * *', ${Compile.STANDARD_FUNCTION});`;
    }

    onTagChange(tagCard) {
        this.setState({
            inputs: [
                {
                    nameRender: 'renderSelect',
                    frontText: 'Instance:',
                    options: [{
                        value: 'telegram.0',
                        title: 'telegram.0',
                    }],
                    defaultValue: 'telegram.0',
                    attr: 'Instance',
                },
                {
                    nameRender: 'renderText',
                    attr: 'text',
                    defaultValue: '34564768980ßü',
                    frontText: 'User:',
                },
                {
                    nameRender: 'renderModalInput',
                    attr: 'modal2',
                    defaultValue: 'Привет',
                    nameBlock: '',
                    frontText: 'Text:',
                }
            ]
        });
    }

    static getStaticData() {
        return {
            acceptedBy: 'actions',
            name: { en: 'Telegram', ru: 'Telegram' },
            id: 'ActionTelegram',
            icon: 'ChatBubbleOutline'
        }
    }

    getData() {
        return ActionTelegram.getStaticData();
    }
}

export default ActionTelegram;
