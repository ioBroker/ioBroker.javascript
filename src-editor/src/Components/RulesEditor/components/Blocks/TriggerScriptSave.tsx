import { I18n } from '@iobroker/adapter-react-v5';
import { GenericBlock, type GenericBlockProps } from '../GenericBlock';
import { NO_FUNCTION } from '../../helpers/Compile';
import type {
    RuleBlockConfigTriggerScriptSave,
    RuleBlockDescription,
    RuleContext,
    RuleTagCardTitle,
} from '../../types';

class TriggerScriptSave extends GenericBlock<RuleBlockConfigTriggerScriptSave> {
    constructor(props: GenericBlockProps<RuleBlockConfigTriggerScriptSave>) {
        super(props, TriggerScriptSave.getStaticData());
    }

    static compile(config: RuleBlockConfigTriggerScriptSave, _context: RuleContext): string {
        return NO_FUNCTION.replace('"__%%DEBUG_TRIGGER%%__"', `_sendToFrontEnd(${config._id}, {trigger: true})`);
    }

    // eslint-disable-next-line class-methods-use-this
    renderDebug(/* debugMessage */): string {
        return I18n.t('Triggered');
    }

    onTagChange(_tagCard: RuleTagCardTitle): void {
        this.setState(
            {
                inputs: [
                    {
                        nameRender: 'renderNameText',
                        defaultValue: 'On script save or adapter start',
                        attr: 'script',
                    },
                ],
            },
            () => super.onTagChange(),
        );
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'triggers',
            name: 'Start script',
            id: 'TriggerScriptSave',
            icon: 'PlayArrow',
            title: 'Triggers the on script saving or the javascript instance restart',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return TriggerScriptSave.getStaticData();
    }
}

export default TriggerScriptSave;
