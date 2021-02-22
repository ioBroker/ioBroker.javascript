import GenericBlock from '../GenericBlock/index';
import Compile from "../../Compile";

class TriggerScriptSave extends GenericBlock {
    constructor(props) {
        super(props, TriggerScriptSave.getStaticData());
    }

    compile(config, context) {
        return `schedule('* 1 * * *', ${Compile.STANDARD_FUNCTION});`;
    }

    onTagChange(tagCard) {
        this.setState({
            inputs: [
                {
                    nameRender: 'renderNameText',
                    attr: 'interval',
                    defaultValue: 'On script save or adapter start',
                },
            ]
        });
    }

    static getStaticData() {
        return {
            acceptedBy: 'triggers',
            name: { en: 'Script save', ru: 'Script save' },
            id: 'TriggerScriptSave',
            icon: 'PlayArrow',
        }
    }

    getData() {
        return TriggerScriptSave.getStaticData();
    }
}

export default TriggerScriptSave;
