import { GenericBlock, type GenericBlockProps } from '../GenericBlock';
import type {
    RuleBlockConfigActionEmpty,
    RuleBlockDescription,
    RuleTagCardTitle,
} from '@/Components/RulesEditor/types';

class ActionEmpty extends GenericBlock<RuleBlockConfigActionEmpty> {
    constructor(props: GenericBlockProps<RuleBlockConfigActionEmpty>) {
        super(props, ActionEmpty.getStaticData());
    }

    static compile(/* config, context */): string {
        return ``;
    }

    onTagChange(tagCard: RuleTagCardTitle): void {
        this.setState(
            {
                inputs: [
                    {
                        nameRender: 'renderNameText',
                        attr: 'textTime',
                        defaultValue: 'Block not found',
                    },
                ],
            },
            () => super.onTagChange(tagCard),
        );
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'actions',
            name: 'Not found',
            id: 'ActionEmpty',
            icon: 'Shuffle',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return ActionEmpty.getStaticData();
    }
}

export default ActionEmpty;
