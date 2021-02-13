import GenericBlock from '../GenericBlock'; // @iobroker/javascript-rules

class SayitBlock extends GenericBlock {
    constructor(props) {
        super(props, {
            typeBlock: 'then',
            icon: 'BatteryChargingFull',

            // acceptedOn: ['then', 'else'],
            type: 'action',
            compile: (config, context) => `setState('id', obj.val);`,
            getConfig: () => { },
            setConfig: (config) => { },
            acceptedBy: 'actions', // where it could be acceped: trigger, condition, action
            name: { en: 'context add list', ru: 'Действие' },
            inputs: [
                {
                    nameRender: 'renderTextContext',
                    name: { en: 'Object ID' },
                    attr: 'objectID',
                    type: 'oid',
                    default: '',
                    icon: ''
                }
            ],
        });
    }

    onSettingsUpdate(settings) {

    }


    renderTextContext (value, className) {
        return <div>render context</div>;
    }
}

const SayitBlocks = [SayitBlock];

export default SayitBlocks;
/*{
    name: 'Action2222',
    typeBlock: 'then',
    icon: 'BatteryChargingFull',

    // acceptedOn: ['then', 'else'],
    type: 'action',
    compile: (config, context) => `setState('id', obj.val);`,
    getConfig: () => { },
    setConfig: (config) => { },
    acceptedBy: 'actions', // where it could be acceped: trigger, condition, action
    _type: 'action1',
    name: { en: 'context add list', ru: 'Действие' },
    inputs:
        { nameRender: 'renderTextContext', name: { en: 'Object ID' }, attr: 'objectID', type: 'oid', default: '', icon: '' },
}*/
