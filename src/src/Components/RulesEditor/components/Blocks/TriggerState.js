import GenericBlock from '../GenericBlock';
import Compile from '../../helpers/Compile';

class TriggerState extends GenericBlock {
    constructor(props) {
        super(props, TriggerState.getStaticData());
    }

    static compile(config, context) {
        const func = context.justCheck ? Compile.STANDARD_FUNCTION_STATE : Compile.STANDARD_FUNCTION_STATE_ONCHANGE;
        return `on({id: "${config.oid || ''}", change: "${config.tagCard === 'on update' ? 'any' : 'ne'}"}, ${func});`
    }

    onTagChange(tagCard) {
        this.setState({
            inputs: [
                {
                    nameRender: 'renderObjectID',
                    attr: 'oid',
                    defaultValue: ''
                }
            ]
        }, () => {
            super.onTagChange();
        });
    }

    static getStaticData() {
        return {
            acceptedBy: 'triggers',
            name: { en: 'State', ru: 'State' },
            id: 'TriggerState',
            icon: 'FlashOn',
            tagCardArray: ['on change', 'on update'],
            title: 'Triggers the rule on update or change of some state' // translate
        }
    }

    getData() {
        return TriggerState.getStaticData();
    }
}

export default TriggerState;
