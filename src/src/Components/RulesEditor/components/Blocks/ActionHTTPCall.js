import GenericBlock from '../GenericBlock/index';
import Compile from "../../Compile";
class ActionHTTPCall extends GenericBlock {
    constructor(props) {
        super(props, ActionHTTPCall.getStaticData());
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
                    defaultValue: 'http://mydevice.com?...',
                    nameBlock: 'URL'
                }
            ]
        });
    }
    static getStaticData() {
        return {
            acceptedBy: 'actions',
            name: { en: 'HTTP Call', ru: 'HTTP Call' },
            id: 'ActionHTTPCall',
            icon: 'Language',
        }
    }
}

export default ActionHTTPCall;
