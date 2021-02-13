import GenericBlock from '../GenericBlock/index';
import Compile from "../../Compile"; // @iobroker/javascript-rules

class TriggerScheduleBlock extends GenericBlock {
    constructor(props) {
        super(props, {
            ...TriggerScheduleBlock.getStaticData(),
            inputs: [
                {
                    nameRender: 'renderTimeOfDay',
                    name: { en: 'Object ID' },
                    attr: 'schedule',
                    type: 'oid',
                    default: '',
                    icon: ''
                }
            ],
        });
    }

    compile(config, context) {
        return `schedule('* 1 * * *', ${Compile.STANDARD_FUNCTION});`;
    }

    static getStaticData() {
        return {
            typeBlock: 'when', // @Igor: (typeBlock, type, acceptedBy) эта информация избыточна и можно определять по acceptedBy или
            // убрать acceptedBy и оставить typeBlock или type
            type: 'trigger',
            acceptedBy: 'triggers',


            name: {en: 'Schedule', ru: 'Расписание'},
            id: 'TriggerScheduleBlock',
            icon: 'AccessTime',
        }
    }
}

export default TriggerScheduleBlock;
