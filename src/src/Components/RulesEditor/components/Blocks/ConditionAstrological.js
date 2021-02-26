import GenericBlock from '../GenericBlock';
// import Compile from "../../Compile";
import SunCalc from "suncalc2";

class ConditionAstrological extends GenericBlock {
    constructor(props) {
        super(props, ConditionAstrological.getStaticData());
    }

    static compile(config, context) {
        const compare = config.tagCard === '=' ? '===' : (config.tagCard === '<>' ? '!==' : config.tagCard);
        return `formatDate(Date.now(), 'hh:mm')  ${compare} formatDate(getAstroDate("${config.astro}", 'hh:mm')`;
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
        let coordinates = {
            latitude: 51.5,
            longitude: -0.1
        }
        await this.props.socket.getObject('system.adapter.javascript.0').then(({ native: { latitude, longitude } }) => {
            if (!latitude && !longitude) {
                this.props.socket.getObject('system.config').then(obj => {
                    if (latitude && longitude) {
                        coordinates = {
                            latitude,
                            longitude
                        }
                    }
                })
            } else {
                coordinates = {
                    latitude,
                    longitude
                }
            }
        });
        const sunValue = SunCalc.getTimes(new Date(), coordinates.latitude, coordinates.longitude);
        const options = Object.keys(sunValue).map(name => ({
            value: name,
            title: name,
            title2: `[${ConditionAstrological._time2String(sunValue[name])}]`,
            order: ConditionAstrological._time2String(sunValue[name])
        }));
        options.sort((a, b) => a.order > b.order ? 1 : (a.order < b.order ? -1 : 0));

        // calculate time text
        const tagCardArray = ConditionAstrological.getStaticData().tagCardArray;
        const tag = tagCardArray.find(item => item.title === this.state.settings.tagCard);

        let time = '--:--';
        if (astro && sunValue[astro]) {
            const astroTime = new Date(sunValue[astro]);
            offset && astroTime.setMinutes(astroTime.getMinutes() + parseInt(offsetValue, 10));
            time = `(${tag.text} ${ConditionAstrological._time2String(astroTime)})`;
        }

        let inputs;

        if (offset) {
            inputs = [
                {
                    nameRender: 'renderNameText',
                    defaultValue: 'Actual time of day',
                },
                {
                    frontText: 'greater than',
                    attr: 'astro',
                    nameRender: 'renderSelect',
                    options,
                    defaultValue: 'solarNoon'
                },
                {
                    backText: 'with offset',
                    nameRender: 'renderCheckbox',
                    attr: 'offset',
                },
                {
                    backText: 'minute(s)',
                    frontText: 'offset',
                    nameRender: 'renderNumber',
                    defaultValue: 0,
                    attr: 'offsetValue',
                    noHelperText: true,
                },
                {
                    nameRender: 'renderNameText',
                    attr: 'textTime',
                    defaultValue: time,
                }
            ];
        } else {
            inputs = [
                {
                    nameRender: 'renderNameText',
                    defaultValue: 'Actual time of day',
                },
                {
                    frontText: tag.text,
                    attr: 'astro',
                    nameRender: 'renderSelect',
                    options,
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
                    defaultValue: time,
                }
            ];
        }

        this.setState({ inputs });
    }

    onTagChange(tagCard) {
        this._setAstro();
    }

    static getStaticData() {
        return {
            acceptedBy: 'conditions',
            name: {
                en: 'Astrological',
                ru: 'Astrological'
            },
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
        }
    }

    getData() {
        return ConditionAstrological.getStaticData();
    }
}

export default ConditionAstrological;
