import GenericBlock from '../GenericBlock';
import Compile from "../../Compile";

class ActionSayText extends GenericBlock {
    constructor(props) {
        super(props, ActionSayText.getStaticData());
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
                        value: 'sayit.0',
                        title: 'sayit.0',
                    }],
                    defaultValue: 'sayit.0',
                    attr: 'Instance',
                },
                {
                    nameRender: 'renderSelect',
                    frontText: 'Language:',
                    options: [{
                        value: 'Google Русский',
                        title: 'Google Русский',
                    }],
                    defaultValue: 'Google Русский',
                    attr: 'Language',
                },
                {
                    nameRender: 'renderSlider',
                    attr: 'text',
                    defaultValue: 45,
                    frontText: '0',
                    backText: '100'
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
            name: { en: 'Say Text', ru: 'Say Text' },
            id: 'ActionSayText',
            icon: 'ChatBubbleOutline'
        }
    }

    getData() {
        return ActionSayText.getStaticData();
    }
}

export default ActionSayText;
