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
            tagCardArray: [{
                title: '>',
                title2: '[greater]'
            }, {
                title: '>=',
                title2: '[greater or equal]'
            }, {
                title: '<',
                title2: '[less]'
            }, {
                title: '<=',
                title2: '[less or equal]'
            }, {
                title: '=',
                title2: '[equal]',
            }, {
                title: '<>',
                title2: '[not equal]'
            }],
        }
    }

    getData() {
        return ConditionTime.getStaticData();
    }
}

export default ConditionTime;
