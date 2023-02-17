import GenericBlock from '../GenericBlock';
import { I18n } from '@iobroker/adapter-react-v5';

class ActionFunction extends GenericBlock {
    constructor(props) {
        super(props, ActionFunction.getStaticData());
    }

    static compile(config, context) {
        const lines = (config.func || '')
            .split('\n')
            .map((line, i) => `        ${line}`);

        lines.unshift(`\t\t_sendToFrontEnd(${config._id}, {func: 'executed'});`);
        lines.unshift(`// user function`);

        return lines.join('\n');
    }

    renderDebug(debugMessage) {
        return I18n.t('Function: executed');
    }

    onTagChange(tagCard) {
        this.setState({
            inputs: [
                {
                    nameRender: 'renderModalInput',
                    attr: 'func',
                    noTextEdit: true,
                    defaultValue: 'console.log("Test")',
                    nameBlock: 'Function',
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
            helpDialog: 'This is advances option. You can write your own code here and it will be executed on trigger',
        }
    }

    getData() {
        return ActionFunction.getStaticData();
    }
}

export default ActionFunction;
