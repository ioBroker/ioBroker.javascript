import GenericBlock from '../GenericBlock';

class ActionExec extends GenericBlock {
    constructor(props) {
        super(props, ActionExec.getStaticData());
    }

    static compile(config, context) {
        return `exec("${(config.exec || '').replace(/"/g, '\\"')}"${GenericBlock.getReplacesInText(context)});`;
    }

    onTagChange(tagCard) {
        this.setState({
            inputs: [
                {
                    nameRender: 'renderModalInput',
                    attr: 'exec',
                    defaultValue: 'ls /opt/iobroker',
                    nameBlock: 'Shell command'
                }
            ]
        }, () => super.onTagChange(tagCard));
    }

    static getStaticData() {
        return {
            acceptedBy: 'actions',
            name: 'Exec',
            id: 'ActionExec',
            icon: 'Apps',
            title: 'Executes some shell command',
            helpDialog: 'You can use %s in the command to use current trigger value or %id to use the triggered object ID'
        }
    }

    getData() {
        return ActionExec.getStaticData();
    }
}

export default ActionExec;
