import GenericBlock from '../GenericBlock';

class ActionWhatsappcmb extends GenericBlock {
    constructor(props) {
        super(props, ActionWhatsappcmb.getStaticData());
        this.cachePromises = {};
    }

    static compile(config, context) {
        let text = (config.text || '').replace(/"/g, '\\"');
        if (!text) {
            return '// no text defined'
        } else {
            return `sendTo("${config.instance}", "send", {text: "${(text || '').replace(/"/g, '\\"')}"${GenericBlock.getReplacesInText(context)}${config.phone ? `, phone: "${config.phone.replace(/"/g, '\\"')}"` : ''}});`;
        }
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
                    backText: '(optional)'
                }
            ]
        }, () => super.onTagChange());
    }

    static getStaticData() {
        return {
            acceptedBy: 'actions',
            name: {
                en: 'Whatsapp-cmb',
                ru: 'Whatsapp-cmb'
            },
            id: 'ActionWhatsappcmb',
            adapter: 'whatsapp-cmb',
            title: 'Sends message via whatsapp-cmb',
            helpDialog: 'You can use %s in the text to display current trigger value or %id to display the triggered object ID'
        }
    }

    getData() {
        return ActionWhatsappcmb.getStaticData();
    }
}

export default ActionWhatsappcmb;
