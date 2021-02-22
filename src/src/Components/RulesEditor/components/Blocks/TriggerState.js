import GenericBlock from '../GenericBlock/index';
import Compile from "../../Compile";

class TriggerState extends GenericBlock {
    constructor(props) {
        super(props, TriggerState.getStaticData());
    }

    compile(config, context) {
        return `schedule('* 1 * * *', ${Compile.STANDARD_FUNCTION});`;
    }

    onTagChange(tagCard) {
        this.setState({
            inputs: [
                {
                    nameRender: 'renderObjectID',
                    attr: 'oid',
                    nameBlock: 'Alive for alarm adapter',
                    defaultValue: ''
                }
            ]
        });
    }

    static getStaticData() {
        return {
            acceptedBy: 'triggers',
            name: { en: 'State', ru: 'State' },
            id: 'TriggerState',
            icon: 'FlashOn',
            tagCardArray: ['on update', 'on change']
        }
    }

    getData() {
        return TriggerState.getStaticData();
    }
}

export default TriggerState;
