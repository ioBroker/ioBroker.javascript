// @ts-expect-error no types available
import SunCalc from 'suncalc2';
import { I18n } from '@iobroker/adapter-react-v5';
import { GenericBlock, type GenericBlockProps } from '../GenericBlock';
import type {
    RuleBlockConfigConditionAstronomical,
    RuleBlockDescription,
    RuleContext,
    RuleInputAny,
    RuleTagCard,
} from '../../types';

class ConditionAstronomical extends GenericBlock<RuleBlockConfigConditionAstronomical> {
    private coordinates: { latitude: number; longitude: number } | null = null;
    constructor(props: GenericBlockProps<RuleBlockConfigConditionAstronomical>) {
        super(props, ConditionAstronomical.getStaticData());
    }

    static compile(config: RuleBlockConfigConditionAstronomical, context: RuleContext): string {
        const compare = config.tagCard === '=' ? '===' : config.tagCard === '<>' ? '!==' : config.tagCard;
        let offset;
        if (config.offset) {
            offset = parseInt(config.offsetValue as unknown as string, 10) || 0;
        }
        const cond = `formatDate(Date.now(), 'hh:mm') ${compare} formatDate(getAstroDate("${config.astro}"${offset ? `, undefined, ${offset}` : ''}), 'hh:mm')`;
        context.conditionsVars.push(`const subCond${config._id} = ${cond};`);
        context.conditionsDebug.push(`_sendToFrontEnd(${config._id}, {result: ${cond}});`);
        return cond;
    }

    static _time2String(time: Date): string {
        if (!time) {
            return '--:--';
        }
        return `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
    }

    onValueChanged(value: any, attr: string): void {
        if (attr === 'astro') {
            void this._setAstro(value);
        } else if (attr === 'offset') {
            void this._setAstro(undefined, value);
        } else if (attr === 'offsetValue') {
            void this._setAstro(undefined, undefined, value);
        }
    }

    async _setAstro(astro?: string, offset?: boolean, offsetValue?: number): Promise<void> {
        astro = astro || this.state.settings.astro || 'solarNoon';
        offset = offset === undefined ? this.state.settings.offset : offset;
        offsetValue = offsetValue === undefined ? this.state.settings.offsetValue : offsetValue;

        offsetValue = parseInt(offsetValue as unknown as string, 10) || 0;
        if (!this.coordinates) {
            const jsInstance: ioBroker.InstanceObject | null | undefined =
                await this.props.socket.getObject('system.adapter.javascript.0');
            if (!jsInstance?.native.latitude && !jsInstance?.native.longitude) {
                const systemConfig: ioBroker.SystemConfigObject | null | undefined =
                    await this.props.socket.getObject('system.config');
                if (systemConfig && (systemConfig.common.latitude || systemConfig.common.longitude)) {
                    this.coordinates = {
                        latitude: systemConfig.common.latitude as number,
                        longitude: systemConfig.common.longitude as number,
                    };
                } else {
                    this.coordinates = null;
                }
            } else {
                this.coordinates = {
                    latitude: jsInstance?.native.latitude,
                    longitude: jsInstance?.native.longitude,
                };
            }
        }
        const sunValue: Record<string, Date> | null = this.coordinates
            ? SunCalc.getTimes(new Date(), this.coordinates.latitude, this.coordinates.longitude)
            : null;
        const options = sunValue
            ? Object.keys(sunValue).map(name => ({
                  value: name,
                  title: name,
                  title2: `[${ConditionAstronomical._time2String(sunValue[name])}]`,
                  order: ConditionAstronomical._time2String(sunValue[name]),
              }))
            : [];
        options.sort((a, b) => (a.order > b.order ? 1 : a.order < b.order ? -1 : 0));

        // calculate time text
        const tagCardArray: RuleTagCard[] = ConditionAstronomical.getStaticData().tagCardArray as RuleTagCard[];
        const tag: RuleTagCard =
            tagCardArray.find(item => item.title === this.state.settings.tagCard) || tagCardArray[0];

        let time = '--:--';
        if (astro && sunValue && sunValue[astro]) {
            const astroTime = new Date(sunValue[astro]);
            offset && astroTime.setMinutes(astroTime.getMinutes() + parseInt(offsetValue as unknown as string, 10));
            time = `(${I18n.t(tag.text)} ${ConditionAstronomical._time2String(astroTime)})`;
        }

        let inputs: RuleInputAny[];

        if (offset) {
            inputs = [
                {
                    nameRender: 'renderNameText',
                    defaultValue: 'Actual time of day',
                    attr: 'text',
                },
                {
                    frontText: tag.text,
                    attr: 'astro',
                    nameRender: 'renderSelect',
                    options,
                    doNotTranslate2: true,
                    defaultValue: 'solarNoon',
                },
                {
                    backText: 'with offset',
                    nameRender: 'renderCheckbox',
                    attr: 'offset',
                },
                {
                    backText: offsetValue === 1 ? 'minute' : 'minutes',
                    frontText: 'offset',
                    nameRender: 'renderNumber',
                    defaultValue: 0,
                    attr: 'offsetValue',
                    noHelperText: true,
                },
                {
                    nameRender: 'renderNameText',
                    attr: 'textTime',
                    doNotTranslate: true,
                    defaultValue: time,
                },
            ];
        } else {
            inputs = [
                {
                    nameRender: 'renderNameText',
                    defaultValue: 'Actual time of day',
                    attr: 'text',
                },
                {
                    frontText: tag.text,
                    attr: 'astro',
                    nameRender: 'renderSelect',
                    options,
                    doNotTranslate2: true,
                    defaultValue: 'solarNoon',
                },
                {
                    backText: 'with offset',
                    nameRender: 'renderCheckbox',
                    attr: 'offset',
                },
                {
                    nameRender: 'renderNameText',
                    attr: 'textTime',
                    doNotTranslate: true,
                    defaultValue: time,
                },
            ];
        }

        this.setState({ inputs }, () => super.onTagChange());
    }

    onTagChange(): void {
        void this._setAstro();
    }

    static getStaticData(): RuleBlockDescription {
        return {
            acceptedBy: 'conditions',
            name: 'Astronomical',
            id: 'ConditionAstronomical',
            icon: 'Brightness3',
            tagCardArray: [
                {
                    title: '=',
                    title2: '[equal]',
                    text: 'equal to',
                },
                {
                    title: '>=',
                    title2: '[greater or equal]',
                    text: 'greater or equal to',
                },
                {
                    title: '>',
                    title2: '[greater]',
                    text: 'greater than',
                },
                {
                    title: '<=',
                    title2: '[less or equal]',
                    text: 'less or equal to',
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
            title: 'Compares current time with astronomical event',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getData(): RuleBlockDescription {
        return ConditionAstronomical.getStaticData();
    }
}

export default ConditionAstronomical;
