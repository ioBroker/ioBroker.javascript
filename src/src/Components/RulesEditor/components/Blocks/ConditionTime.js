import GenericBlock from '../GenericBlock';

class ConditionTime extends GenericBlock {
    constructor(props) {
        super(props, ConditionTime.getStaticData());
    }

    static compile(config, context) {
        return `true`;
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
                    attr: 'time',
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
