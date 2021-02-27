import GenericBlock from '../GenericBlock';
import Compile from '../../Compile';

class TriggerState extends GenericBlock {
    constructor(props) {
        super(props, TriggerState.getStaticData());
    }

    static compile(config, context) {
        return `on({id: "${config.oid || ''}", change: ${config.tagCard === 'on update' ? 'any' : 'ne'}}, ${Compile.STANDARD_FUNCTION_STATE});`
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
        }, () => super.onTagChange());
    }

    static getStaticData() {
        return {
            acceptedBy: 'triggers',
            name: { en: 'State', ru: 'State' },
            id: 'TriggerState',
            icon: 'FlashOn',
            tagCardArray: ['on change', 'on update']
        }
    }

    getData() {
        return TriggerState.getStaticData();
    }
}

export default TriggerState;
