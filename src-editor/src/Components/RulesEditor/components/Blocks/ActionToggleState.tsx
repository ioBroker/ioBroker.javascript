import { I18n } from '@iobroker/gui-components';

import { GenericBlock, type RuleBlockSummary } from '../GenericBlock';
import type {
    RuleBlockConfig,
    RuleBlockDescription,
    RuleInputAny,
    RuleTagCardTitle,
    GenericBlockProps,
} from '@iobroker/javascript-rules-dev';

interface RuleBlockConfigActionToggleState extends RuleBlockConfig {
    oid: string;
    value1: string;
    value2: string;
    /** Filled by `renderObjectID` from `common` of the selected object */
    oidUnit: string;
    oidStates: { [name: string]: string } | undefined;
}

/**
 * Switches a state back and forth between two values.
 *
 * The "set state" action can already invert a boolean, so this block exists for the case it cannot
 * express: two *arbitrary* values - 20 °C and 22 °C, two scenes, two modes.
 */
export default class ActionToggleState extends GenericBlock<RuleBlockConfigActionToggleState> {
    constructor(props: GenericBlockProps<RuleBlockConfigActionToggleState>) {
        super(props, ActionToggleState.getStaticData());
    }

    /**
     * The configured text as the literal it stands for, with the same rules the "set state" action
     * uses - so `20` reaches a number state as a number and not as "20".
     */
    private static literal(value: string | number | boolean | undefined): string {
        if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }
        const text = value ?? '';
        if (parseFloat(text).toString() === text || text === 'true' || text === 'false') {
            return text;
        }
        return JSON.stringify(text);
    }

    static compile(config: RuleBlockConfigActionToggleState): string {
        if (!config.oid) {
            return `// no object selected
_sendToFrontEnd(${config._id}, {message: 'No object selected'});`;
        }

        const ack = config.tagCard === 'update';
        // compared as text: the state may hold the number 20 where "20" was configured, and a toggle
        // that silently never recognises its own first value would just always write the second one
        const isFirst = `String((await getStateAsync(${JSON.stringify(config.oid)}))?.val) === ${JSON.stringify(String(config.value1 ?? ''))}`;

        // a line break in a value would end the comment and turn the next line into code
        const label = `${config.oid} between ${config.value1} and ${config.value2}`.replace(/[\r\n]+/g, ' ');

        return `// toggle ${label}
\t\tconst subActionVar${config._id} = ${isFirst} ? ${ActionToggleState.literal(config.value2)} : ${ActionToggleState.literal(config.value1)};
\t\t_sendToFrontEnd(${config._id}, {val: subActionVar${config._id}, ack: ${ack}});
\t\tawait setStateAsync(${JSON.stringify(config.oid)}, subActionVar${config._id}, ${ack});`;
    }

    // eslint-disable-next-line class-methods-use-this
    renderDebug(debugMessage: { data: { val: any; message?: string } }): string {
        return debugMessage.data.message || `${I18n.t('Toggled:')} ${debugMessage.data.val}`;
    }

    /**
     * Two dropdowns when the object brings a value list, two text fields otherwise.
     *
     * @returns the inputs and, if the selected object no longer allows the configured values, the
     * settings that have to be corrected along with them
     */
    private buildInputs(): { inputs: RuleInputAny[]; newSettings?: Partial<RuleBlockConfigActionToggleState> } {
        const { oidStates, oidUnit } = this.state.settings;
        const options = oidStates
            ? Object.keys(oidStates).map(value => ({ value, title: oidStates[value] }))
            : undefined;

        let inputs: RuleInputAny[];
        let newSettings: Partial<RuleBlockConfigActionToggleState> | undefined;

        if (options?.length) {
            const second = options[1] || options[0];
            inputs = [
                {
                    nameRender: 'renderSelect',
                    attr: 'value1',
                    frontText: 'between',
                    options,
                    defaultValue: options[0].value,
                },
                {
                    nameRender: 'renderSelect',
                    attr: 'value2',
                    frontText: 'and',
                    options,
                    defaultValue: second.value,
                },
            ];

            // picking another object may leave a value behind that its list does not know
            const fixed: Partial<RuleBlockConfigActionToggleState> = {};
            const fallback = [options[0], second];
            (['value1', 'value2'] as const).forEach((attr, i) => {
                const current = this.state.settings[attr];
                if (current !== undefined && !options.find(option => option.value === String(current))) {
                    fixed[attr] = fallback[i].value;
                }
            });
            if (Object.keys(fixed).length) {
                newSettings = fixed;
            }
        } else {
            inputs = [
                {
                    nameRender: 'renderText',
                    attr: 'value1',
                    frontText: 'between',
                    backText: oidUnit || '',
                    doNotTranslateBack: true,
                    defaultValue: '',
                },
                {
                    nameRender: 'renderText',
                    attr: 'value2',
                    frontText: 'and',
                    backText: oidUnit || '',
                    doNotTranslateBack: true,
                    defaultValue: '',
                },
            ];
        }

        inputs.unshift({
            nameRender: 'renderObjectID',
            attr: 'oid',
            defaultValue: '',
            checkReadOnly: true,
        });

        return { inputs, newSettings };
    }

    onTagChange(_tagCard?: RuleTagCardTitle | null, cb?: () => void): void {
        const { inputs, newSettings } = this.buildInputs();

        this.setState({ inputs }, () =>
            super.onTagChange(null, () => {
                if (newSettings) {
                    const settings = { ...this.state.settings, ...newSettings };
                    this.setState({ settings });
                    this.props.onChange(settings);
                }
                cb?.();
            }),
        );
    }

    onValueChanged(_value: any, attr: string): void {
        // the value fields follow the object: a state with a value list gets dropdowns instead of text
        if (attr === 'oid') {
            this.onTagChange();
        }
    }

    getSummary(): RuleBlockSummary | null {
        const { oid, value1, value2, tagCard } = this.state.settings;
        if (!oid) {
            return null;
        }
        const name = this.objectName(oid);
        const show = (value: string): string => (value === undefined || value === '' ? '…' : String(value));

        return {
            kicker: tagCard ? I18n.t(tagCard) : undefined,
            title: `${name || oid}: ${show(value1)} ⇄ ${show(value2)}`,
            subtitle: name ? oid : undefined,
        };
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'actions',
            name: 'Toggle between two values',
            id: 'ActionToggleState',
            icon: 'SwapHoriz',
            tagCardArray: ['control', 'update'],
            title: 'Switches a state back and forth between two values',
            helpDialog:
                'If the state does not hold the first value, the first one is written - so the rule always ends up on a defined value. To invert a boolean, use the "toggle value" checkbox of the "Set state action" instead.',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return ActionToggleState.getStaticData();
    }
}
