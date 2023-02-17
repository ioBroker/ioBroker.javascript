import GenericBlock from '../GenericBlock';

class ActionHTTPCall extends GenericBlock {
    constructor(props) {
        super(props, ActionHTTPCall.getStaticData());
    }

    static compile(config, context) {
        return `// HTTP request ${config.url}
\t\tconst subActionVar${config._id} = "${(config.url || '').replace(/"/g, '\\"')}"${GenericBlock.getReplacesInText(context)};
\t\t_sendToFrontEnd(${config._id}, {url: subActionVar${config._id}});
\t\trequest(subActionVar${config._id});`;
    }

    renderDebug(debugMessage) {
        return `URL: ${debugMessage.data.url}`;
    }

    onTagChange(tagCard) {
        this.setState({
            inputs: [
                {
                    nameRender: 'renderModalInput',
                    attr: 'url',
                    defaultValue: 'http://mydevice.com?...',
                    nameBlock: 'URL',
                }
            ]
        }, () => super.onTagChange(tagCard));
    }

    static getStaticData() {
        return {
            acceptedBy: 'actions',
            name: 'HTTP Call',
            id: 'ActionHTTPCall',
            icon: 'Language',
            title: 'Make a HTTP get request',
            helpDialog: 'You can use %s in the URL to use current trigger value or %id to use the triggered object ID',
        }
    }

    getData() {
        return ActionHTTPCall.getStaticData();
    }
}

export default ActionHTTPCall;
