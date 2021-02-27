import GenericBlock from '../GenericBlock';

class ConditionTime extends GenericBlock {
    constructor(props) {
        super(props, ConditionTime.getStaticData());
    }

    static compile(config, context) {
        const compare = config.tagCard === '=' ? '===' : (config.tagCard === '<>' ? '!==' : config.tagCard);
        return `formatDate(Date.now(), 'hh:mm') ${compare} "${config.time}"`;
    }

    onTagChange(tagCard) {
        tagCard = tagCard || this.state.settings.tagCard;
        const tagCardArray = ConditionTime.getStaticData().tagCardArray;
        const tag = tagCardArray.find(item => item.title === tagCard);
        this.setState({
            inputs: [
                {
                    nameRender: 'renderNameText',
                    attr: 'interval',
                    defaultValue: 'Actual time of day',
                },
                {
                    frontText: tag?.text || tagCard,
                    nameRender: 'renderTime',
                    attr: 'time',
                    defaultValue: '12:00',
                },
            ],
            iconTag:true
        }, () => super.onTagChange());
    }

    static getStaticData() {
        return {
            acceptedBy: 'conditions',
            name: {
                en: 'Time condition',
                ru: 'Time condition'
            },
            id: 'ConditionTime',
            icon: 'Shuffle',
            tagCardArray: [
                {
                    title: '=',
                    title2: '[equal]',
                    text: 'equal to'
                },
                {
                    title: '>=',
                    title2: '[greater or equal]',
                    text: 'greater or equal'
                },
                {
                    title: '>',
                    title2: '[greater]',
                    text: 'greater than'
                },
                {
                    title: '<=',
                    title2: '[less or equal]',
                    text: 'less or equal'
                },
                {
                    title: '<',
                    title2: '[less]',
                    text: 'less than'
                },
                {
                    title: '<>',
                    title2: '[not equal]',
                    text: 'not equal to'
                }
            ],
        }
    }

    getData() {
        return ConditionTime.getStaticData();
    }
}

export default ConditionTime;
