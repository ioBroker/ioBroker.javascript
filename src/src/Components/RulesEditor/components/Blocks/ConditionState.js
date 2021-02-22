import GenericBlock from '../GenericBlock/index';
import Compile from "../../Compile";

class ConditionState extends GenericBlock {
    constructor(props) {
        super(props, ConditionState.getStaticData());
    }

    compile(config, context) {
        return `schedule('* 1 * * *', ${Compile.STANDARD_FUNCTION});`;
    }

    onTagChange(tagCard) {
        this.setState({
            inputs: [
                {
                    backText: 'with offset',
                    nameRender: 'renderCheckbox'
                },
                {
                    nameRender: 'renderObjectID',
                    attr: 'oid',
                    nameBlock:'Alive for alarm adapter',
                    defaultValue: 'system.adapter.ad...',
                    openCheckbox: true
                },
                {
                    backText: 'minutes',
                    nameRender: 'renderNumber',
                    defaultValue: 30
                },
            ],
            openCheckbox: true,
            iconTag:true
        });
    }

    static getStaticData() {
        return {
            acceptedBy: 'conditions',
            name: { en: 'State condition', ru: 'State condition' },
            id: 'ConditionState',
            icon: 'Shuffle',
            tagCardArray: ['>', '>=', '<', '<=', '=', '<>', '...'],
        }
    }
}

export default ConditionState;
