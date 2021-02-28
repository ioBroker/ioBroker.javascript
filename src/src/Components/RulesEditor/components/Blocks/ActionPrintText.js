import GenericBlock from '../GenericBlock';

class ActionPrintText extends GenericBlock {
    constructor(props) {
        super(props, ActionPrintText.getStaticData());
    }

    static compile(config, context) {
        let value = '';
        if (context.trigger?.oidType) {
            value = '.replace(/%s/g, obj.state.value).replace(/%id/g, obj.id)';
        }
        return `console.log("${(config.text || '').replace(/"/g, '\\"')}"${value});`;
    }

    onTagChange(tagCard) {
        this.setState({
            inputs: [
                {
                    nameRender: 'renderModalInput',
                    attr: 'text',
                    defaultValue: 'My device triggered',
                    nameBlock: 'Log text'
                }
            ]
        }, () => super.onTagChange(tagCard));
    }

    static getStaticData() {
        return {
            acceptedBy: 'actions',
            name: {
                en: 'Log text',
                ru: 'Log text'
            },
            id: 'ActionPrintText',
            icon: 'Subject',
            title: 'Print some text in log'
        }
    }

    getData() {
        return ActionPrintText.getStaticData();
    }
}

export default ActionPrintText;
