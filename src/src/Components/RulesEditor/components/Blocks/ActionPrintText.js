import GenericBlock from '../GenericBlock/index';
import Compile from "../../Compile";

class ActionPrintText extends GenericBlock {
    constructor(props) {
        super(props, ActionPrintText.getStaticData());
    }

    compile(config, context) {
        return `schedule('* 1 * * *', ${Compile.STANDARD_FUNCTION});`;
    }

    onTagChange(tagCard) {
        this.setState({
            inputs: [
                {
                    nameRender: 'renderModalInput',
                    attr: 'modal',
                    defaultValue: 'My device triggered',
                    nameBlock: 'Log text'
                }
            ]
        });
    }
    static getStaticData() {
        return {
            acceptedBy: 'actions',
            name: { en: 'Print text', ru: 'Print text' },
            id: 'ActionPrintText',
            icon: 'Subject',
        }
    }
}

export default ActionPrintText;
