import GenericBlock from '../GenericBlock/index';
import Compile from "../../Compile";
class ActionSetState extends GenericBlock {
    constructor(props) {
        super(props, ActionSetState.getStaticData());
    }

    compile(config, context) {
        return `schedule('* 1 * * *', ${Compile.STANDARD_FUNCTION});`;
    }

    onTagChange(tagCard) {
        let obg = {};
        let type = 'number';
        switch (type) {
            case 'number':
                obg = {
                    backText: 'kW',
                    frontText: 'with',
                    nameRender: 'renderNumber',
                    defaultValue: 30
                }
                break;
            case 'control1':
                obg = {
                    nameRender: 'renderSlider',
                    attr: 'text',
                    defaultValue: 50,
                    frontText: '0',
                    backText: '100'
                }
                break;
            case 'control2':
                obg = {
                    nameRender: 'renderSelect',
                    frontText: 'Instance:',
                    options: [{
                        value: 'State1',
                        title: 'State1',
                    }],
                    defaultValue: 'State1',
                    attr: 'Instance',
                }
                break;
            case 'control3':
                obg = {
                    backText: 'true',
                    frontText: 'false',
                    nameRender: 'renderSwitch',
                    defaultValue: false
                }
                break;
            case 'control4':
                obg = {
                    nameRender: 'renderButton',
                    defaultValue: 'Press'
                }
                break;
            case 'control5':
                obg = {
                    nameRender: 'renderColor',
                    defaultValue: 30
                }
                break;
            default:
                obg = null;
                break
        }
        this.setState({
            inputs: [
                {
                    nameRender: 'renderObjectID',
                    attr: 'renderObjectID',
                    nameBlock: 'Alive for alarm adapter',
                    defaultValue: 'system.adapter.ad...',
                    // additionallyCommon: true
                },
                obg
            ]
        });
    }

    static getStaticData() {
        return {
            acceptedBy: 'actions',
            name: { en: 'Set state action', ru: 'Set state action' },
            id: 'ActionSetState',
            icon: 'PlayForWork',
            tagCardArray: ['control', 'update']
        }
    }
}

export default ActionSetState;
