import { I18n } from '@iobroker/adapter-react-v5';
import { GenericBlock, type GenericBlockProps } from '../GenericBlock';
import Compile from '../../helpers/Compile';

class TriggerScriptSave extends GenericBlock {
    constructor(props) {
        super(props, TriggerScriptSave.getStaticData());
    }

    static compile(config /* , context */) {
        return Compile.NO_FUNCTION.replace('"__%%DEBUG_TRIGGER%%__"', `_sendToFrontEnd(${config._id}, {trigger: true})`);
    }

    renderDebug(/* debugMessage */) {
        return I18n.t('Triggered');
    }

    onTagChange(tagCard: RuleTagCardTitle) {
        this.setState({
            inputs: [
                {
                    nameRender: 'renderNameText',
                    defaultValue: 'On script save or adapter start',
                    attr: 'script',
                },
            ],
        }, () => super.onTagChange());
    }

    static getStaticData() {
        return {
            acceptedBy: 'triggers',
            name: 'Start script',
            id: 'TriggerScriptSave',
            icon: 'PlayArrow',
            title: 'Triggers the on script saving or the javascript instance restart',
        }
    }

    getData() {
        return TriggerScriptSave.getStaticData();
    }
}

export default TriggerScriptSave;
