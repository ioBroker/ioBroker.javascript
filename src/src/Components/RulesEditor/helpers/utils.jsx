import I18n from '@iobroker/adapter-react-v5/i18n';

let lang;
const getName = obj => {
    lang = lang || I18n.getLanguage();
    if (typeof obj === 'object') {
        return obj[lang] || obj.en;
    } else {
        return obj;
    }
};

const utils = {
    getName
};

export default utils;