import { GenericBlock } from '../GenericBlock';
import type {
    RuleBlockConfigConditionTime,
    RuleBlockDescription,
    RuleContext,
    RuleInputAny,
    RuleTagCard,
    RuleTagCardTitle,
    GenericBlockProps,
} from '@iobroker/javascript-rules-dev';

const DAYS: number[] = [
    31, // 1
    29, // 2
    31, // 3
    30, // 4
    31, // 5
    30, // 6
    31, // 7
    31, // 8
    30, // 9
    31, // 10
    30, // 11
    31, // 12
];

class ConditionTime extends GenericBlock<RuleBlockConfigConditionTime> {
    constructor(props: GenericBlockProps<RuleBlockConfigConditionTime>) {
        super(props, ConditionTime.getStaticData());
    }

    static compile(config: RuleBlockConfigConditionTime, context: RuleContext): string {
        const compare = config.tagCard === '=' ? '===' : config.tagCard === '<>' ? '!==' : config.tagCard;
        let cond;

        if (config.withDate) {
            const [monthStr, dateStr] = (config.date || '01.01').toString().split('.');
            let date = parseInt(dateStr, 10) || 0;
            let month = parseInt(monthStr, 10) || 0;
            if (month > 12) {
                month = 12;
            } else if (month < 0) {
                month = 0;
            }

            if (date > DAYS[month]) {
                date = DAYS[month];
            } else if (date < 0) {
                date = 0;
            }
            if (date && month) {
                cond = `formatDate(Date.now(), 'MM.DD-hh:mm') ${compare} "${config.date}-${config.time}"`;
            } else if (date === 0 && month) {
                cond = `formatDate(Date.now(), 'MM-hh:mm') ${compare} "${month.toString().padStart(2, '0')}-${config.time}"`;
            } else if (month === 0 && date) {
                cond = `formatDate(Date.now(), 'DD-hh:mm') ${compare} "${date.toString().padStart(2, '0')}-${config.time}"`;
            } else {
                cond = `formatDate(Date.now(), 'hh:mm') ${compare} "${config.time}"`;
            }
        } else {
            cond = `formatDate(Date.now(), 'hh:mm') ${compare} "${config.time}"`;
        }
        context.conditionsVars.push(`const subCond${config._id} = ${cond};`);
        context.conditionsDebug.push(`_sendToFrontEnd(${config._id}, {result: subCond${config._id}});`);
        return `subCond${config._id}`;
    }

    _setInputs(tagCard?: RuleTagCardTitle, withDate?: boolean): void {
        withDate = withDate === undefined ? this.state.settings.withDate : withDate;
        tagCard = tagCard || this.state.settings.tagCard;
        const tagCardArray: RuleTagCard[] = ConditionTime.getStaticData().tagCardArray as RuleTagCard[];
        const tag = tagCardArray?.find(item => item.title === tagCard);
        const inputs: RuleInputAny[] = [
            {
                nameRender: 'renderNameText',
                attr: 'interval',
                defaultValue: 'Actual time of day',
            },
            {
                frontText: tag?.text || tagCard,
                nameRender: 'renderTime',
                attr: 'time',
                defaultValue: '12:00',
            },
            {
                frontText: 'with date',
                nameRender: 'renderCheckbox',
                attr: 'withDate',
                defaultValue: false,
            },
        ];
        if (withDate) {
            inputs.push({
                nameRender: 'renderDate',
                attr: 'date',
                defaultValue: '01.01',
            });
        }
        this.setState(
            {
                inputs,
                iconTag: true,
            },
            () => super.onTagChange(),
        );
    }

    onValueChanged(value: any, attr: string): void {
        if (attr === 'withDate') {
            this._setInputs(undefined, value);
        }
    }

    onTagChange(tagCard: RuleTagCardTitle): void {
        this._setInputs(tagCard);
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'conditions',
            name: 'Time condition',
            id: 'ConditionTime',
            icon: 'Shuffle',
            tagCardArray: [
                {
                    title: '=',
                    title2: '[equal]',
                    text: 'equal to',
                },
                {
                    title: '>=',
                    title2: '[greater or equal]',
                    text: 'greater or equal',
                },
                {
                    title: '>',
                    title2: '[greater]',
                    text: 'greater than',
                },
                {
                    title: '<=',
                    title2: '[less or equal]',
                    text: 'less or equal',
                },
                {
                    title: '<',
                    title2: '[less]',
                    text: 'less than',
                },
                {
                    title: '<>',
                    title2: '[not equal]',
                    text: 'not equal to',
                },
            ],
            title: 'Compares current time with the user specific time',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return ConditionTime.getStaticData();
    }
}

export default ConditionTime;
