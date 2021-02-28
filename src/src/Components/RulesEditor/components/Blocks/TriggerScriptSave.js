import GenericBlock from '../GenericBlock';
import Compile from "../../helpers/Compile";

class TriggerScriptSave extends GenericBlock {
    constructor(props) {
        super(props, TriggerScriptSave.getStaticData());
    }

    static compile(config, context) {
        return `if (__%%CONDITION%%__) {
__%%THEN%%__
} else {
__%%ELSE%%__
}`;
    }

    onTagChange(tagCard) {
        this.setState({
            inputs: [
                {
                    nameRender: 'renderNameText',
                    defaultValue: 'On script save or adapter start',
                },
            ]
        }, () => super.onTagChange());
    }

    static getStaticData() {
        return {
            acceptedBy: 'triggers',
            name: { en: 'Script save', ru: 'Script save' },
            id: 'TriggerScriptSave',
            icon: 'PlayArrow',
            title: 'Triggers the on script save or the javascript instance restart'
        }
    }

    getData() {
        return TriggerScriptSave.getStaticData();
    }
}

export default TriggerScriptSave;
