import GenericBlock from '../GenericBlock';

class ActionFunction extends GenericBlock {
    constructor(props) {
        super(props, ActionFunction.getStaticData());
    }

    static compile(config, context) {
        const lines = (config.func || '').split('\n').map((line, i) => i ? '        ' + line : line);

        return lines.join('\n');
    }

    onTagChange(tagCard) {
        this.setState({
            inputs: [
                {
                    nameRender: 'renderModalInput',
                    attr: 'func',
                    noTextEdit: true,
                    defaultValue: 'console.log("Test")',
                    nameBlock: 'Function'
                }
            ]
        }, () => super.onTagChange(tagCard));
    }

    static getStaticData() {
        return {
            acceptedBy: 'actions',
            name: 'User function',
            id: 'ActionFunction',
            icon: 'Functions',
            title: 'Write your own code',
            helpDialog: 'This is advances option. You can write your own code here and it will be executed on trigger'
        }
    }

    getData() {
        return ActionFunction.getStaticData();
    }
}

export default ActionFunction;
