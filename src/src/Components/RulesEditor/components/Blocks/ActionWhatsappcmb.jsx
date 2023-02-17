import GenericBlock from '../GenericBlock';
import { I18n } from '@iobroker/adapter-react-v5';

class ActionWhatsappcmb extends GenericBlock {
    constructor(props) {
        super(props, ActionWhatsappcmb.getStaticData());
        this.cachePromises = {};
    }

    static compile(config, context) {
        let text = (config.text || '').replace(/"/g, '\\"');
        if (!text) {
            return `// no text defined
_sendToFrontEnd(${config._id}, {text: 'No text defined'});`;
        } else {
            return `// whatsapp ${text || ''}
\t\tconst subActionVar${config._id} = "${(text || '').replace(/"/g, '\\"')}"${GenericBlock.getReplacesInText(context)};
\t\t_sendToFrontEnd(${config._id}, {text: subActionVar${config._id}});
\t\tsendTo("${config.instance}", "send", {text: subActionVar${config._id}${config.phone ? `, phone: "${config.phone.replace(/"/g, '\\"')}"` : ''}});`;
        }
    }

    renderDebug(debugMessage) {
        return `${I18n.t('Sent:')} ${debugMessage.data.text}`;
    }

    onTagChange(tagCard) {
        this.setState({
            inputs: [
                {
                    nameRender: 'renderInstance',
                    adapter: 'whatsapp-cmb',
                    frontText: 'Instance:',
                    defaultValue: 'whatsapp-cmb.0',
                    attr: 'instance',
                },
                {
                    nameRender: 'renderModalInput',
                    attr: 'text',
                    defaultValue: 'Hello',
                    nameBlock: '',
                    frontText: 'Text:',
                },
                {
                    nameRender: 'renderText',
                    attr: 'phone',
                    defaultValue: '',
                    frontText: 'Phone:',
                    backText: '(optional)',
                }
            ]
        }, () => super.onTagChange());
    }

    static getStaticData() {
        return {
            acceptedBy: 'actions',
            name: 'Whatsapp-cmb',
            id: 'ActionWhatsappcmb',
            adapter: 'whatsapp-cmb',
            title: 'Sends message via whatsapp-cmb',
            helpDialog: 'You can use %s in the text to display current trigger value or %id to display the triggered object ID',
        }
    }

    getData() {
        return ActionWhatsappcmb.getStaticData();
    }
}

export default ActionWhatsappcmb;
