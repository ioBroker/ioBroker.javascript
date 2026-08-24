import { I18n } from '@iobroker/gui-components';

import { GenericBlock, type RuleBlockSummary } from '../GenericBlock';
import { STANDARD_FUNCTION_STOP } from '../../helpers/Compile';
import type {
    RuleBlockConfig,
    RuleBlockDescription,
    RuleTagCardTitle,
    GenericBlockProps,
} from '@iobroker/javascript-rules-dev';

interface RuleBlockConfigTriggerOnStop extends RuleBlockConfig {
    /** How long the adapter waits for the actions, in ms */
    timeout: number;
}

/**
 * Runs the rule once more while it is being stopped - on save, on disabling, on adapter shutdown.
 * The place to put "switch the light off again" so a rule cannot leave anything behind.
 *
 * Two things this trigger cannot hide:
 *
 * - The adapter waits for the actions, but not forever. Everything has to fit into the timeout
 *   below, or the stop continues without waiting for the rest.
 * - A script has room for exactly one stop handler (`script.onStopCb` is assigned, not collected),
 *   so a second block of this kind in the same rule silently replaces the first.
 */
export default class TriggerOnStop extends GenericBlock<RuleBlockConfigTriggerOnStop> {
    constructor(props: GenericBlockProps<RuleBlockConfigTriggerOnStop>) {
        super(props, TriggerOnStop.getStaticData());
    }

    static compile(config: RuleBlockConfigTriggerOnStop): string {
        const func = STANDARD_FUNCTION_STOP.replace(
            '"__%%DEBUG_TRIGGER%%__"',
            `_sendToFrontEnd(${config._id}, {trigger: true})`,
        );

        // the adapter falls back to 1000 ms itself, so an empty field stays that
        const timeout = parseInt(config.timeout as unknown as string, 10) || 1000;

        return `onStop(${func}, ${timeout});`;
    }

    // eslint-disable-next-line class-methods-use-this
    renderDebug(): string {
        return I18n.t('Triggered');
    }

    getSummary(): RuleBlockSummary {
        const { timeout } = this.state.settings;

        return {
            title: I18n.t('On rule stop'),
            subtitle: `${I18n.t('Wait at most:')} ${parseInt(timeout as unknown as string, 10) || 1000} ${I18n.t('ms')}`,
        };
    }

    onTagChange(tagCard?: RuleTagCardTitle): void {
        this.setState(
            {
                inputs: [
                    {
                        nameRender: 'renderNumber',
                        attr: 'timeout',
                        frontText: 'Wait at most:',
                        backText: 'ms',
                        doNotTranslateBack: true,
                        defaultValue: 1000,
                    },
                ],
            },
            () => super.onTagChange(tagCard),
        );
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'triggers',
            name: 'On rule stop',
            id: 'TriggerOnStop',
            icon: 'Stop',
            title: 'Runs the rule once more when it is stopped, saved or the adapter shuts down',
            helpDialog:
                'The adapter waits for the actions, but only for the time set here - what does not fit is cut off. A rule can have only one block of this kind; a second one replaces the first.',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return TriggerOnStop.getStaticData();
    }
}
