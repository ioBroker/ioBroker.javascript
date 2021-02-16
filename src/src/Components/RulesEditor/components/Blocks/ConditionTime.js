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
   // {
    //     getConfig: () => { },
    //     setConfig: (config) => { },
    //     acceptedBy: 'conditions', // where it could be acceped: trigger, condition, action
    //     name: { en: 'Time condition', ru: 'Триггер' },
    //     typeBlock: 'and',
    //     icon: 'Shuffle',
    //     type: 'condition',
    //     compile: (config, context) => `obj.val === "1"`,
    //     inputs:
    //         { nameRender: 'renderTimeCondition', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
    // },
    static getStaticData() {
        return {
            acceptedBy: 'conditions',
            name: { en: 'Time condition', ru: 'Time condition' },
            id: 'ConditionTime',
            icon: 'Shuffle',
            tagCardArray: ['>', '>=', '<', '<=', '=', '<>']
        }
    }
}

export default ConditionTime;
