import { I18n } from '@iobroker/gui-components';

import { GenericBlock, type RuleBlockSummary } from '../GenericBlock';
import type {
    RuleBlockConfig,
    RuleBlockDescription,
    RuleContext,
    GenericBlockProps,
} from '@iobroker/javascript-rules-dev';

interface RuleBlockConfigConditionWeekday extends RuleBlockConfig {
    /** The days the rule may run on, as `Date.getDay()` returns them. `_` means every day */
    dow: string[];
    text: string;
}

/**
 * The values are what `Date.getDay()` returns - Sunday is 0 - so no mapping is needed when the
 * condition is compiled. The same list is offered by the "at" variant of the schedule trigger.
 */
const DAYS = [
    { value: '_', title: 'Every day', only: true },
    { value: '1', title: 'Monday', titleShort: 'Mo' },
    { value: '2', title: 'Tuesday', titleShort: 'Tu' },
    { value: '3', title: 'Wednesday', titleShort: 'We' },
    { value: '4', title: 'Thursday', titleShort: 'Th' },
    { value: '5', title: 'Friday', titleShort: 'Fr' },
    { value: '6', title: 'Saturday', titleShort: 'Sa' },
    { value: '0', title: 'Sunday', titleShort: 'Su' },
];

export default class ConditionWeekday extends GenericBlock<RuleBlockConfigConditionWeekday> {
    constructor(props: GenericBlockProps<RuleBlockConfigConditionWeekday>) {
        super(props, ConditionWeekday.getStaticData());
    }

    static compile(config: RuleBlockConfigConditionWeekday, context: RuleContext): string {
        const selected = config.dow || [];
        const days = selected.filter(day => day !== '_').map(day => parseInt(day, 10));

        // "every day", and an empty selection, restrict nothing - the condition then always holds
        const cond =
            !days.length || selected.includes('_') ? 'true' : `[${days.join(', ')}].includes(new Date().getDay())`;

        context.conditionsVars.push(`const subCond${config._id} = ${cond};`);
        context.conditionsDebug.push(`_sendToFrontEnd(${config._id}, {result: subCond${config._id}});`);

        return `subCond${config._id}`;
    }

    onTagChange(): void {
        this.setState(
            {
                inputs: [
                    {
                        nameRender: 'renderNameText',
                        attr: 'text',
                        defaultValue: 'Day of week',
                    },
                    {
                        nameRender: 'renderSelect',
                        attr: 'dow',
                        multiple: true,
                        default: '',
                        // the everyday case is the one nobody needs a condition for, so this starts
                        // out on the one that is actually asked for: only on workdays
                        defaultValue: ['1', '2', '3', '4', '5'],
                        options: DAYS,
                    },
                ],
            },
            () => super.onTagChange(),
        );
    }

    getSummary(): RuleBlockSummary | null {
        const selected = this.state.settings.dow;
        if (!selected?.length) {
            return null;
        }
        if (selected.includes('_')) {
            return { title: I18n.t('Every day') };
        }
        // in the order of the week, not in the order they were clicked
        const names = DAYS.filter(day => day.value !== '_' && selected.includes(day.value)).map(day =>
            I18n.t(day.titleShort as string),
        );

        return { title: `${I18n.t('Day of week')}: ${names.join(', ')}` };
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'conditions',
            name: 'Weekday',
            id: 'ConditionWeekday',
            icon: 'CalendarMonth',
            title: 'Let the rule run only on the selected days of the week',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return ConditionWeekday.getStaticData();
    }
}
