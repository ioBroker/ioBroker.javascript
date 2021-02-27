import GenericBlock from '../GenericBlock';

class ActionExec extends GenericBlock {
    constructor(props) {
        super(props, ActionExec.getStaticData());
    }

    static compile(config, context) {
        return `exec("${(config.exec || '').replace(/"/g, '\\"')}");`;
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
            name: {
                en: 'Exec',
                ru: 'Exec'
            },
            id: 'ActionExec',
            icon: 'Apps',
        }
    }

    getData() {
        return ActionExec.getStaticData();
    }
}

export default ActionExec;
