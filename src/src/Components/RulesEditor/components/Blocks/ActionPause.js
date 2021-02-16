import GenericBlock from '../GenericBlock/index';
import Compile from "../../Compile";

class ActionPause extends GenericBlock {
    constructor(props) {
        super(props, ActionPause.getStaticData());
    }

    compile(config, context) {
        return `schedule('* 1 * * *', ${Compile.STANDARD_FUNCTION});`;
    }

    onTagChange(tagCard) {
        this.setState({
            inputs: [
                {
                    nameRender: 'renderNumber',
                    attr: 'modal',
                    defaultValue: 100,
                },
                {
                    nameRender: 'renderSelect',
                    attr: 'modal',
                    options: [
                        { value: 'ms', title: 'm.second(ms)' },
                        { value: 's', title: 'second(s)' },
                        { value: 'm', title: 'minute(s)' },
                        { value: 'h', title: 'hour(s)' }
                    ]
                },
            ]
        });
    }

    static getStaticData() {
        return {
            acceptedBy: 'actions',
            name: { en: 'Pause', ru: 'Pause' },
            id: 'ActionPause',
            icon: 'Pause',
        }
    }
}

export default ActionPause;
