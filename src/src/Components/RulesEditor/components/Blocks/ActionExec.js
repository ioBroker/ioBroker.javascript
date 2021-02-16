import GenericBlock from '../GenericBlock/index';
import Compile from "../../Compile";

class ActionExec extends GenericBlock {
    constructor(props) {
        super(props, ActionExec.getStaticData());
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
                    defaultValue: 'format C:',
                    nameBlock: 'Shell command'
                }
            ]
        });
    }

    static getStaticData() {
        return {
            acceptedBy: 'actions',
            name: { en: 'Exec', ru: 'Exec' },
            id: 'ActionExec',
            icon: 'Apps',
        }
    }
}

export default ActionExec;
