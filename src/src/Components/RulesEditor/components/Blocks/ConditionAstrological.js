import GenericBlock from '../GenericBlock';
import Compile from "../../Compile";
import SunCalc from "suncalc2";

class ConditionAstrological extends GenericBlock {
    constructor(props) {
        super(props, ConditionAstrological.getStaticData());
    }

    static compile(config, context) {
        return `schedule('* 1 * * *', ${Compile.STANDARD_FUNCTION});`;
    }

    onTagChange(tagCard) {
        const sunValue = SunCalc.getTimes(new Date(), 51.5, -0.1);
        this.setState({
            inputs: [
                {
                    nameRender: 'renderNameText',
                    attr: 'interval',
                    defaultValue: 'Actual time of day',
                },
                {
                    frontText: 'greater than',
                    nameRender: 'renderSelect',
                    attr: 'astro',
                    options: Object.keys(sunValue).map((name) => ({
                        value: name,
                        title: name,
                        title2: `[${sunValue[name].getHours() < 10 ? 0 : ''}${sunValue[name].getHours()}:${sunValue[name].getMinutes() < 10 ? 0 : ''}${sunValue[name].getMinutes()}]`
                    })),
                    defaultValue: 'solarNoon'
                },
                {
                    backText: 'with offset',
                    nameRender: 'renderCheckbox',
                    attr: 'offset',
                },
                {
                    backText: 'minutes',
                    nameRender: 'renderNumber',
                    attr: 'number',
                    defaultValue: 30,
                    openCheckbox: true
                },
                {
                    nameRender: 'renderNameText',
                    attr: 'interval',
                    defaultValue: `${sunValue['solarNoon'].getHours() < 10 ? 0 : ''}${sunValue['solarNoon'].getHours()}:${sunValue['solarNoon'].getMinutes() < 10 ? 0 : ''}${sunValue['solarNoon'].getMinutes()}`,
                }
            ],
            openCheckbox: true
        });
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
            tagCardArray: ['>', '>=', '<', '<=', '=', '<>'],
        }
    }

    getData() {
        return ConditionAstrological.getStaticData();
    }
}

export default ConditionAstrological;
