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
                    attr: 'instance',
                    nameRender: 'renderInstance',
                    adapter: 'sayit',
                    defaultValue: 'sayit.0',
                    frontText: 'Instance:',
                },
                {
                    nameRender: 'renderSelect',
                    frontText: 'Language:',
                    options: [{
                        value: 'Google Русский',
                        title: 'Google Русский',
                    }],
                    defaultValue: 'Google Русский',
                    attr: 'language',
                },
                {
                    nameRender: 'renderSlider',
                    attr: 'volume',
                    defaultValue: 45,
                    frontText: '0',
                    backText: '100'
                },
                {
                    attr: 'text',
                    nameRender: 'renderModalInput',
                    defaultValue: 'Hallo',
                    nameBlock: '',
                    frontText: 'Text:',
                }
            ]
        });
    }

    static getStaticData() {
        return {
            acceptedBy: 'actions',
            name: {
                en: 'Say Text',
                ru: 'Say Text'
            },
            id: 'ActionSayText',
            adapter: 'sayit'
        }
    }

    getData() {
        return ActionSayText.getStaticData();
    }
}

export default ActionSayText;
