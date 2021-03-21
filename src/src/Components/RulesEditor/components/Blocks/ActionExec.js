import GenericBlock from '../GenericBlock';

class ActionExec extends GenericBlock {
    constructor(props) {
        super(props, ActionExec.getStaticData());
    }

    static compile(config, context) {
        return `const subActionVar${config._id} = "${(config.exec || '').replace(/"/g, '\\"')}"${GenericBlock.getReplacesInText(context)};
\t\t_sendToFrontEnd(${config._id}, {exec: subActionVar${config._id}});
\t\tconsole.log(subActionVar${config._id});`;
    }
    renderDebug(debugMessage) {
        return 'Exec: ' + debugMessage.data.exec;
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
