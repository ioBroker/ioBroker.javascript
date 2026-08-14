import { I18n } from '@iobroker/gui-components';
import { GenericBlock, type RuleBlockSummary } from '../GenericBlock';
import type {
    RuleBlockConfigActionEmpty,
    RuleBlockDescription,
    RuleTagCardTitle,
    GenericBlockProps,
} from '@iobroker/javascript-rules-dev';

class ActionEmpty extends GenericBlock<RuleBlockConfigActionEmpty> {
    constructor(props: GenericBlockProps<RuleBlockConfigActionEmpty>) {
        super(props, ActionEmpty.getStaticData());
    }

    static compile(/* config, context */): string {
        return ``;
    }

    /** Stands in for a block whose adapter is missing - there is nothing to open, so it folds to its message */
    // eslint-disable-next-line class-methods-use-this
    getSummary(): RuleBlockSummary {
        return { title: I18n.t('Block not found') };
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
