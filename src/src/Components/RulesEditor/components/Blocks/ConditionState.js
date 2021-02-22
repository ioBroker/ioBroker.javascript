import GenericBlock from '../GenericBlock';

class ConditionState extends GenericBlock {
    constructor(props) {
        super(props, ConditionState.getStaticData());
    }

    static compile(config, context) {
        return `true`;
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
                    defaultValue: '',
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

    getData() {
        return ConditionState.getStaticData();
    }
}

export default ConditionState;
