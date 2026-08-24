import { I18n } from '@iobroker/gui-components';

import { GenericBlock, type RuleBlockSummary } from '../GenericBlock';
import { STANDARD_FUNCTION_STATE, STANDARD_FUNCTION_STATE_ONCHANGE } from '../../helpers/Compile';
import type {
    RuleBlockConfig,
    RuleBlockDescription,
    RuleContext,
    RuleInputAny,
    RuleTagCardTitle,
    GenericBlockProps,
} from '@iobroker/javascript-rules-dev';

interface RuleBlockConfigTriggerEnumMembers extends RuleBlockConfig {
    /** Id of the enum whose members are watched, e.g. `enum.rooms.living_room` */
    enumId: string;
}

/**
 * @param enums the enums to offer, empty while they are still being read
 */
function inputs(enums: { value: string; title: string }[]): RuleInputAny[] {
    return [
        {
            nameRender: 'renderSelect',
            attr: 'enumId',
            frontText: 'Members of:',
            doNotTranslate: true,
            defaultValue: '',
            options: enums,
        },
    ];
}

/**
 * Starts the rule when *any* state of a room or a function changes.
 *
 * The state trigger needs one block per datapoint, which does not survive contact with "any window
 * on the ground floor". `onEnumMembers` subscribes to every member of the enum and re-subscribes
 * when somebody adds a device to that room later - so the rule follows the enum instead of a list
 * somebody has to maintain here.
 *
 * The callback is an ordinary state subscription, so the same function template as the state
 * trigger fits and `%s` / `%id` mean what they mean everywhere else.
 */
export default class TriggerEnumMembers extends GenericBlock<RuleBlockConfigTriggerEnumMembers> {
    /** Resolved once per block, not once per render */
    private enumsPromise: Promise<Record<string, ioBroker.Object>> | null = null;

    constructor(props: GenericBlockProps<RuleBlockConfigTriggerEnumMembers>) {
        super(props, TriggerEnumMembers.getStaticData());
    }

    static compile(config: RuleBlockConfigTriggerEnumMembers, context: RuleContext): string {
        if (!config.enumId) {
            return `// no enum defined
_sendToFrontEnd(${config._id}, {id: 'No enum defined'});`;
        }

        let func = context.justCheck ? STANDARD_FUNCTION_STATE : STANDARD_FUNCTION_STATE_ONCHANGE;
        func = func.replace(
            '"__%%DEBUG_TRIGGER%%__"',
            `_sendToFrontEnd(${config._id}, {id: obj.id, val: obj.state && obj.state.val})`,
        );

        return `onEnumMembers(${JSON.stringify(config.enumId)}, ${func});`;
    }

    // eslint-disable-next-line class-methods-use-this
    renderDebug(debugMessage: { data: { id: string; val: any } }): string {
        return `${I18n.t('Triggered')}: ${debugMessage.data.id} = ${debugMessage.data.val}`;
    }

    /** Name of the enum as the user knows it, with the id behind it to tell two "Kitchen" apart */
    // eslint-disable-next-line class-methods-use-this
    private enumTitle(obj: ioBroker.Object | undefined, id: string): string {
        const name: any = obj?.common?.name;
        const text = name && typeof name === 'object' ? name[I18n.getLanguage()] || name.en : name;
        return text ? `${text as string} (${id})` : id;
    }

    private setInputs(): void {
        // show the block right away; the enum list follows as soon as it is known
        this.setState({ inputs: inputs([]) }, () => super.onTagChange());

        this.enumsPromise ||= this.props.socket.getObjectViewSystem('enum', 'enum.', 'enum.香');

        void this.enumsPromise.then(objects => {
            if (!this.mounted) {
                return;
            }
            const enums = Object.keys(objects || {})
                // "enum.rooms" and "enum.functions" themselves are the containers, not a room
                .filter(id => id.split('.').length > 2)
                .sort()
                .map(id => ({ value: id, title: this.enumTitle(objects[id], id) }));

            this.setState({ inputs: inputs(enums) }, () => super.onTagChange());
        });
    }

    onTagChange(_tagCard?: RuleTagCardTitle): void {
        this.setInputs();
    }

    getSummary(): RuleBlockSummary | null {
        const { enumId } = this.state.settings;
        if (!enumId) {
            return null;
        }
        return { kicker: I18n.t('Any member of'), title: enumId };
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'triggers',
            name: 'On enum member change',
            id: 'TriggerEnumMembers',
            icon: 'Category',
            title: 'Triggers the rule when any state of a room or function changes',
            helpDialog:
                'Subscribes to every state of the selected enum and follows it: a device added to that room later is included without changing the rule. In the texts of the actions %s is the new value and %id the state that changed.',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return TriggerEnumMembers.getStaticData();
    }
}
