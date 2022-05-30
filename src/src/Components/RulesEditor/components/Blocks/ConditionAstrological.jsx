import GenericBlock from '../GenericBlock';
import SunCalc from 'suncalc2';
import I18n from '@iobroker/adapter-react-v5/i18n';

class ConditionAstrological extends GenericBlock {
    constructor(props) {
        super(props, ConditionAstrological.getStaticData());
        this.coordinates = null;
    }

    static compile(config, context) {
        const compare = config.tagCard === '=' ? '===' : (config.tagCard === '<>' ? '!==' : config.tagCard);
        let offset;
        if (config.offset) {
            offset = parseInt(config.offsetValue, 10) || 0;
        }
        const cond = `formatDate(Date.now(), 'hh:mm') ${compare} formatDate(getAstroDate("${config.astro}"${offset ? `, undefined, ${offset}` : ''}), 'hh:mm')`;
        context.conditionsVars.push(`const subCond${config._id} = ${cond};`);
        context.conditionsDebug.push(`_sendToFrontEnd(${config._id}, {result: ${cond}});`);
        return cond;
    }

    static _time2String(time) {
        if (!time) {
            return '--:--';
        }
        return `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
    }

    onValueChanged(value, attr) {
        if (attr === 'astro') {
            this._setAstro(value);
        } else if (attr === 'offset') {
            this._setAstro(undefined, value);
        } else if (attr === 'offsetValue') {
            this._setAstro(undefined, undefined, value);
        }
    }

    async _setAstro(astro, offset, offsetValue) {
        astro = astro || this.state.settings.astro || 'solarNoon';
        offset = offset === undefined ? this.state.settings.offset : offset;
        offsetValue = offsetValue === undefined ? this.state.settings.offsetValue : offsetValue;

        offsetValue = parseInt(offsetValue, 10) || 0;
        if (!this.coordinates) {
            await this.props.socket.getObject('system.adapter.javascript.0')
                .then(({ native: { latitude, longitude } }) => {
                    if (!latitude && !longitude) {
                        return this.props.socket.getObject('system.config')
                            .then(obj => {
                                if (obj && (obj.common.latitude || obj.common.longitude)) {
                                    this.coordinates = {
                                        latitude: obj.common.latitude,
                                        longitude: obj.common.longitude
                                    }
                                } else {
                                    this.coordinates = null;
                                }
                            });
                    } else {
                        this.coordinates = {
                            latitude,
                            longitude
                        }
                    }
                });
        }
        const sunValue = this.coordinates && SunCalc.getTimes(new Date(), this.coordinates.latitude, this.coordinates.longitude);
        const options = sunValue ? Object.keys(sunValue).map(name => ({
            value: name,
            title: name,
            title2: `[${ConditionAstrological._time2String(sunValue[name])}]`,
            order: ConditionAstrological._time2String(sunValue[name])
        })) : [];
        options.sort((a, b) => a.order > b.order ? 1 : (a.order < b.order ? -1 : 0));

        // calculate time text
        const tagCardArray = ConditionAstrological.getStaticData().tagCardArray;
        const tag = tagCardArray.find(item => item.title === this.state.settings.tagCard);

        let time = '--:--';
        if (astro && sunValue && sunValue[astro]) {
            const astroTime = new Date(sunValue[astro]);
            offset && astroTime.setMinutes(astroTime.getMinutes() + parseInt(offsetValue, 10));
            time = `(${I18n.t(tag.text)} ${ConditionAstrological._time2String(astroTime)})`;
        }

        let inputs;

        if (offset) {
            inputs = [
                {
                    nameRender: 'renderNameText',
                    defaultValue: 'Actual time of day',
                    attr: 'text'
                },
                {
                    frontText: tag.text,
                    attr: 'astro',
                    nameRender: 'renderSelect',
                    options,
                    doNotTranslate2: true,
                    defaultValue: 'solarNoon'
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
                }
            ];
        } else {
            inputs = [
                {
                    nameRender: 'renderNameText',
                    defaultValue: 'Actual time of day',
                    attr: 'text'
                },
                {
                    frontText: tag.text,
                    attr: 'astro',
                    nameRender: 'renderSelect',
                    options,
                    doNotTranslate2: true,
                    defaultValue: 'solarNoon'
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
                }
            ];
        }

        this.setState({ inputs }, () => super.onTagChange());
    }

    onTagChange(tagCard) {
        this._setAstro();
    }

    static getStaticData() {
        return {
            acceptedBy: 'conditions',
            name: 'Astrological',
            id: 'ConditionAstrological',
            icon: 'Brightness3',
            tagCardArray: [
                {
                    title: '=',
                    title2: '[equal]',
                    text: 'equal to'
                },
                {
                    title: '>=',
                    title2: '[greater or equal]',
                    text: 'greater or equal to'
                },
                {
                    title: '>',
                    title2: '[greater]',
                    text: 'greater than'
                },
                {
                    title: '<=',
                    title2: '[less or equal]',
                    text: 'less or equal to'
                },
                {
                    title: '<',
                    title2: '[less]',
                    text: 'less than'
                },
                {
                    title: '<>',
                    title2: '[not equal]',
                    text: 'not equal to'
                }
            ],
            title: 'Compares current time with astrological event'
        }
    }

    getData() {
        return ConditionAstrological.getStaticData();
    }
}

export default ConditionAstrological;
