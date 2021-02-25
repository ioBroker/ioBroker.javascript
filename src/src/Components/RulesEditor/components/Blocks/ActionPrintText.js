import GenericBlock from '../GenericBlock';

class ActionPrintText extends GenericBlock {
    constructor(props) {
        super(props, ActionPrintText.getStaticData());
    }

    static compile(config, context) {
        return `console.log("${(config.text || '').replace(/"/g, '\\"')}");`;
    }

    onTagChange(tagCard) {
        this.setState({
            inputs: [
                {
                    nameRender: 'renderModalInput',
                    attr: 'text',
                    defaultValue: 'My device triggered',
                    nameBlock: 'Log text'
                }
            ]
        });
    }

    static getStaticData() {
        return {
            acceptedBy: 'actions',
            name: {
                en: 'Print text',
                ru: 'Print text'
            },
            id: 'ActionPrintText',
            icon: 'Subject',
        }
    }

    getData() {
        return ActionPrintText.getStaticData();
    }
}

export default ActionPrintText;
