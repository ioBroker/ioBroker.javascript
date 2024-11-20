import { I18n } from '@iobroker/adapter-react-v5';

let lang: ioBroker.Languages | undefined;
const getName = (obj: ioBroker.StringOrTranslated): string => {
    lang = lang || I18n.getLanguage();
    if (typeof obj === 'object') {
        return obj[lang] || obj.en;
    }
    return obj;
};

const utils = {
    getName,
};

export default utils;
