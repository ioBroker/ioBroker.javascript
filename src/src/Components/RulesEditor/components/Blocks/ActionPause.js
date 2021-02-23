import GenericBlock from '../GenericBlock';

class ActionPause extends GenericBlock {
    constructor(props) {
        super(props, ActionPause.getStaticData());
    }

    static compile(config, context) {
        return `await wait(${config.pause} * ${config.unit === 'ms' ? 1 : 
            (config.unit === 's' ? 1000 : (config.unit === 'm' ? 60000 : 3600000))});`;
    }

    onTagChange(tagCard) {
        this.setState({
            inputs: [
                {
                    nameRender: 'renderNumber',
                    attr: 'pause',
                    defaultValue: 100,
                },
                {
                    nameRender: 'renderSelect',
                    attr: 'unit',
                    defaultValue: 'ms',
                    options: [
                        { value: 'ms', title: 'second(s)' },
                        { value: 's', title: 'second(s)' },
                        { value: 'm', title: 'minute(s)' },
                        { value: 'h', title: 'hour(s)' }
                    ]
                },
            ]
        });
    }

    static getStaticData() {
        return {
            acceptedBy: 'actions',
            name: {
                en: 'Pause',
                ru: 'Pause'
            },
            id: 'ActionPause',
            icon: 'Pause',
        }
    }

    getData() {
        return ActionPause.getStaticData();
    }
}

export default ActionPause;
