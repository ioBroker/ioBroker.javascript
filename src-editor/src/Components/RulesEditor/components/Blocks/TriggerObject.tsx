import { I18n } from '@iobroker/gui-components';

import { GenericBlock, type RuleBlockSummary } from '../GenericBlock';
import { STANDARD_FUNCTION_OBJECT, STANDARD_FUNCTION_OBJECT_ONCHANGE } from '../../helpers/Compile';
import type {
    RuleBlockConfig,
    RuleBlockDescription,
    RuleContext,
    RuleTagCardTitle,
    GenericBlockProps,
} from '@iobroker/javascript-rules-dev';

interface RuleBlockConfigTriggerObject extends RuleBlockConfig {
    /** Object id pattern, `*` allowed - not `id`, which the rule uses for the block type */
    pattern: string;
    /** Which kind of change starts the rule */
    change: '_' | 'exists' | 'deleted';
}

const CHANGES = [
    { value: '_', title: 'any change' },
    { value: 'exists', title: 'created or changed' },
    { value: 'deleted', title: 'deleted' },
];

/**
 * Starts the rule when an *object* is created, changed or deleted - not its value.
 *
 * The state trigger only ever sees values; this one sees the structure around them, which is what a
 * rule needs to notice a device appearing or a datapoint disappearing.
 */
export default class TriggerObject extends GenericBlock<RuleBlockConfigTriggerObject> {
    constructor(props: GenericBlockProps<RuleBlockConfigTriggerObject>) {
        super(props, TriggerObject.getStaticData());
    }

    static compile(config: RuleBlockConfigTriggerObject, context: RuleContext): string {
        if (!config.pattern) {
            return `// no object pattern defined
_sendToFrontEnd(${config._id}, {id: 'No pattern defined'});`;
        }

        let func = context.justCheck ? STANDARD_FUNCTION_OBJECT : STANDARD_FUNCTION_OBJECT_ONCHANGE;

        // a deleted object arrives without `obj`, which is the only thing telling the two apart
        const filter =
            config.change === 'deleted'
                ? '\n    if (obj) { return; }'
                : config.change === 'exists'
                  ? '\n    if (!obj) { return; }'
                  : '';

        func = func.replace(
            '"__%%DEBUG_TRIGGER%%__";',
            `_sendToFrontEnd(${config._id}, {id: id, deleted: !obj});${filter}`,
        );

        return `onObject(${JSON.stringify(config.pattern)}, ${func});`;
    }

    // eslint-disable-next-line class-methods-use-this
    renderDebug(debugMessage: { data: { id: string; deleted?: boolean } }): string {
        return `${I18n.t(debugMessage.data.deleted ? 'Object deleted:' : 'Object changed:')} ${debugMessage.data.id}`;
    }

    getSummary(): RuleBlockSummary | null {
        const { pattern, change } = this.state.settings;
        if (!pattern) {
            return null;
        }
        const mode = CHANGES.find(item => item.value === (change || '_'));

        return { kicker: mode ? I18n.t(mode.title) : undefined, title: pattern };
    }

    onTagChange(tagCard?: RuleTagCardTitle): void {
        this.setState(
            {
                inputs: [
                    {
                        nameRender: 'renderText',
                        attr: 'pattern',
                        frontText: 'Object ID:',
                        defaultValue: 'javascript.0.*',
                    },
                    {
                        nameRender: 'renderSelect',
                        attr: 'change',
                        frontText: 'React on:',
                        options: CHANGES,
                        defaultValue: '_',
                    },
                ],
            },
            () => super.onTagChange(tagCard),
        );
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'triggers',
            name: 'On object change',
            id: 'TriggerObject',
            icon: 'AccountTree',
            title: 'Triggers the rule when an object is created, changed or deleted',
            helpDialog:
                'This reacts to the object itself, not to its value - use the "State" trigger for values. The pattern may contain *, e.g. "hm-rpc.0.*". In the texts of the actions %s and %id are the id of the changed object.',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return TriggerObject.getStaticData();
    }
}
