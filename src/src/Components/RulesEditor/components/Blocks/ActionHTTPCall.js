import GenericBlock from '../GenericBlock';

class ActionHTTPCall extends GenericBlock {
    constructor(props) {
        super(props, ActionHTTPCall.getStaticData());
    }

    static compile(config, context) {
        return `request("${(config.url || '').replace(/"/g, '\\"')}");`;
    }

    onTagChange(tagCard) {
        this.setState({
            inputs: [
                {
                    nameRender: 'renderModalInput',
                    attr: 'url',
                    defaultValue: 'http://mydevice.com?...',
                    nameBlock: 'URL'
                }
            ]
        });
    }

    static getStaticData() {
        return {
            acceptedBy: 'actions',
            name: {
                en: 'HTTP Call',
                ru: 'HTTP Call'
            },
            id: 'ActionHTTPCall',
            icon: 'Language',
        }
    }

    getData() {
        return ActionHTTPCall.getStaticData();
    }
}

export default ActionHTTPCall;
