import GenericBlock from '../GenericBlock';

class ActionEmpty extends GenericBlock {
    constructor(props) {
        super(props, ActionEmpty.getStaticData());
    }

    static compile(/* config, context */) {
        return ``;
    }

    onTagChange(tagCard) {
        this.setState({
            inputs: [
                {
                    nameRender: 'renderNameText',
                    attr: 'textTime',
                    defaultValue: 'Block not found',
                }
            ]
        }, () => super.onTagChange(tagCard));
    }

    static getStaticData() {
        return {
            acceptedBy: 'actions',
            name: 'Not found',
            id: 'ActionEmpty',
            icon: 'Shuffle',
        }
    }

    getData() {
        return ActionEmpty.getStaticData();
    }
}

export default ActionEmpty;
