import { I18n } from '@iobroker/gui-components';

import { GenericBlock, type RuleBlockSummary } from '../GenericBlock';
import { STANDARD_FUNCTION_LOG, STANDARD_FUNCTION_LOG_ONCHANGE } from '../../helpers/Compile';
import type {
    RuleBlockConfig,
    RuleBlockDescription,
    RuleContext,
    RuleTagCardTitle,
    GenericBlockProps,
} from '@iobroker/javascript-rules-dev';

interface RuleBlockConfigTriggerLog extends RuleBlockConfig {
    severity: string;
    /** Only entries containing this text start the rule; empty means every entry */
    filter: string;
}

/** The levels `onLog` accepts, see `sandbox.ts` - anything else is refused with a warning */
const SEVERITIES = [
    { value: 'error', title: 'error' },
    { value: 'warn', title: 'warn' },
    { value: 'info', title: 'info' },
    { value: 'debug', title: 'debug' },
    { value: 'silly', title: 'silly' },
    { value: '*', title: 'any level' },
];

/**
 * Starts the rule when something is written to the ioBroker log - the way to be told about errors
 * of *other* adapters without polling anything.
 *
 * On the feedback loop this invites: while the handler runs synchronously the adapter drops this
 * script's own log output (`sandbox.log` checks `logHandler`), so the plain case - log entry in,
 * "log text" action out - cannot loop. That protection ends at the first `await`, so a rule that
 * pauses or writes a state *before* it logs can still trigger itself. The text filter is the way
 * out of that: it is what keeps a rule from matching its own message.
 */
export default class TriggerLog extends GenericBlock<RuleBlockConfigTriggerLog> {
    constructor(props: GenericBlockProps<RuleBlockConfigTriggerLog>) {
        super(props, TriggerLog.getStaticData());
    }

    static compile(config: RuleBlockConfigTriggerLog, context: RuleContext): string {
        let func = context.justCheck ? STANDARD_FUNCTION_LOG : STANDARD_FUNCTION_LOG_ONCHANGE;

        const text = (config.filter || '').trim();
        // compared in lower case, because nobody types a log message the way it was written
        const filter = text
            ? `\n    if (!String(info.message).toLowerCase().includes(${JSON.stringify(text.toLowerCase())})) { return; }`
            : '';

        func = func.replace(
            '"__%%DEBUG_TRIGGER%%__";',
            `_sendToFrontEnd(${config._id}, {message: info.message, severity: info.severity});${filter}`,
        );

        return `onLog(${JSON.stringify(config.severity || 'error')}, ${func});`;
    }

    // eslint-disable-next-line class-methods-use-this
    renderDebug(debugMessage: { data: { message: string; severity?: string } }): string {
        return `${I18n.t('Logged:')} ${debugMessage.data.message}`;
    }

    getSummary(): RuleBlockSummary | null {
        const { severity, filter } = this.state.settings;
        const level = SEVERITIES.find(item => item.value === (severity || 'error'));

        return {
            kicker: level ? I18n.t(level.title) : undefined,
            title: filter ? `${I18n.t('Log contains')}: ${filter}` : I18n.t('Every log entry'),
        };
    }

    onTagChange(tagCard?: RuleTagCardTitle): void {
        this.setState(
            {
                inputs: [
                    {
                        nameRender: 'renderSelect',
                        attr: 'severity',
                        frontText: 'Level:',
                        options: SEVERITIES,
                        defaultValue: 'error',
                    },
                    {
                        nameRender: 'renderText',
                        attr: 'filter',
                        frontText: 'Contains:',
                        defaultValue: '',
                    },
                ],
            },
            () => super.onTagChange(tagCard),
        );
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'triggers',
            name: 'On log message',
            id: 'TriggerLog',
            icon: 'Article',
            title: 'Triggers the rule when something is written to the ioBroker log',
            helpDialog:
                'Leave "Contains" empty to react to every entry of that level. Fill it in if an action of this rule writes to the log itself - a rule that matches its own message can trigger itself. In the texts of the actions %s is the log message and %id the instance it came from.',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return TriggerLog.getStaticData();
    }
}
