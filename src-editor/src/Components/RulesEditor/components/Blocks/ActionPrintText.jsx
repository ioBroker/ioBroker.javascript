import { I18n } from '@iobroker/adapter-react-v5';
import { GenericBlock, type GenericBlockProps } from '../GenericBlock';

class ActionPrintText extends GenericBlock {
    constructor(props) {
        super(props, ActionPrintText.getStaticData());
    }

    static compile(config, context) {
        return `// Log ${config.text}
\t\tconst subActionVar${config._id} = "${(config.text || '').replace(/"/g, '\\"')}"${GenericBlock.getReplacesInText(context)};
\t\t_sendToFrontEnd(${config._id}, {text: subActionVar${config._id}});
\t\tconsole.log(subActionVar${config._id});`;
    }

    renderDebug(debugMessage) {
        return I18n.t('Log: %s', debugMessage.data.text);
    }

    onTagChange(tagCard: RuleTagCardTitle) {
        this.setState({
            inputs: [
                {
                    nameRender: 'renderModalInput',
                    attr: 'text',
                    defaultValue: 'My device triggered',
                    nameBlock: 'Log text',
                }
            ]
        }, () => super.onTagChange(tagCard));
    }

    static getStaticData() {
        return {
            acceptedBy: 'actions',
            name: 'Log text',
            id: 'ActionPrintText',
            icon: 'Subject',
            title: 'Print some text in log',
            helpDialog: 'You can use %s in the text to display current trigger value or %id to display the triggered object ID',
        }
    }

    getData() {
        return ActionPrintText.getStaticData();
    }
}

export default ActionPrintText;
