import { I18n } from '@iobroker/adapter-react-v5';

let lang;
const getName = obj => {
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
