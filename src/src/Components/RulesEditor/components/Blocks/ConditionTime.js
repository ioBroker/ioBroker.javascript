import GenericBlock from '../GenericBlock/index';
import Compile from "../../Compile";

class ConditionTime extends GenericBlock {
    constructor(props) {
        super(props, ConditionTime.getStaticData());
    }

    compile(config, context) {
        return `schedule('* 1 * * *', ${Compile.STANDARD_FUNCTION});`;
    }

    onTagChange(tagCard) {
        this.setState({
            inputs: [
                {
                    nameRender: 'renderNameText',
                    attr: 'interval',
                    defaultValue: 'Actual time of day',
                },
                {
                    frontText: 'greater than',
                    nameRender: 'renderTime',
                    defaultValue: '00:12',
                },
            ],
            iconTag:true
        });
    }

    static getStaticData() {
        return {
            acceptedBy: 'conditions',
            name: { en: 'Time condition', ru: 'Time condition' },
            id: 'ConditionTime',
            icon: 'Shuffle',
            tagCardArray: ['>', '>=', '<', '<=', '=', '<>']
        }
    }

    getData() {
        return ConditionTime.getStaticData();
    }
}

export default ConditionTime;
