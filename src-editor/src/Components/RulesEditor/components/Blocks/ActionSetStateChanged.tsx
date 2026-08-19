import { I18n } from '@iobroker/gui-components';

import ActionSetState from './ActionSetState';
import { GenericBlock, type RuleBlockSummary } from '../GenericBlock';
import type { RuleBlockConfigActionSetState, RuleBlockDescription, RuleContext } from '@iobroker/javascript-rules-dev';

/**
 * Writes a state only when the value actually differs from what is there.
 *
 * `setState` always writes, and every write is an event: a rule that runs on a schedule and sets the
 * same value every minute keeps history, logging and every other rule subscribed to that state busy
 * for nothing. `setStateChanged` is the sandbox's answer to that, and this block is the only way to
 * reach it from a rule.
 *
 * It derives from the "set state" action instead of copying it - the object picker, the type aware
 * value field, the "use trigger value" and "toggle" options are all the same, and the difference is
 * one call in `compile`.
 */
export default class ActionSetStateChanged extends ActionSetState {
    static compile(config: RuleBlockConfigActionSetState, context: RuleContext): string {
        let value = config.value;
        if (config.useTrigger) {
            value = config.toggle ? '!obj.state.val' : 'obj.state.val';
        } else {
            if (value === undefined || value === null) {
                value = '';
            }

            // the same rule the "set state" action uses: a numeric or boolean looking text is
            // written as that type, everything else as a string
            if (
                typeof config.value === 'string' &&
                parseFloat(config.value).toString() !== config.value &&
                config.value !== 'true' &&
                config.value !== 'false'
            ) {
                value = `${JSON.stringify(value)}${GenericBlock.getReplacesInText(context)}`;
            }
        }

        const declaration =
            config.toggle && !config.useTrigger
                ? `const subActionVar${config._id} = !(await getStateAsync(${JSON.stringify(config.oid)})).val`
                : `const subActionVar${config._id} = ${value}`;

        return `// set state ${config.oid} to ${config.toggle && !config.useTrigger ? 'toggle' : value} if changed
\t\t${declaration};
\t\t_sendToFrontEnd(${config._id}, {val: subActionVar${config._id}, ack: ${config.tagCard === 'update'}});
\t\tawait setStateChangedAsync(${JSON.stringify(config.oid)}, subActionVar${config._id}, ${config.tagCard === 'update'});`;
    }

    getSummary(): RuleBlockSummary | null {
        const summary = super.getSummary();
        if (!summary) {
            return null;
        }
        // the whole point of this block over the plain one, so it belongs on the collapsed card -
        // appended, because the subtitle already carries the object id behind its name
        return {
            ...summary,
            subtitle: [summary.subtitle, I18n.t('only if changed')].filter(Boolean).join(' · '),
        };
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'actions',
            name: 'Set state if changed',
            id: 'ActionSetStateChanged',
            icon: 'PublishedWithChanges',
            tagCardArray: ['control', 'update'],
            title: 'Writes a state only if its value differs from the current one',
            helpDialog:
                'Use this instead of "Set state action" for rules that run often: an unchanged value is not written at all, so nothing subscribed to that state is woken up for nothing.',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return ActionSetStateChanged.getStaticData();
    }
}
