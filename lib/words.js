'use strict';
let systemLang       = 'en';
let systemDictionary = {};

/* eslint-disable quotes */
systemDictionary = {
    "was not executed, while debug mode is active": {
        "en": "was not executed, while debug mode is active",
        "de": "wurde nicht ausgeführt, während der Debug-Modus aktiv ist",
        "ru": "не был выполнен, пока активен режим отладки",
        "pt": "não foi executado, enquanto o modo de depuração está ativo",
        "nl": "is niet uitgevoerd, terwijl de foutopsporingsmodus actief is",
        "fr": "n'a pas été exécuté alors que le mode débogage est actif",
        "it": "non è stato eseguito, mentre la modalità debug è attiva",
        "es": "no se ejecutó, mientras el modo de depuración está activo",
        "pl": "nie zostało wykonane, gdy aktywny jest tryb debugowania",
        "zh-cn": "调试模式处于活动状态时未执行"
    }
};
/* eslint-enable quotes */

function setLanguage(language) {
    systemLang = language;
}

function getLanguage() {
    return systemLang;
}

function translateWord(text, lang, dictionary) {
    if (!text) {
        return '';
    }
    lang       = lang       || systemLang;
    dictionary = dictionary || systemDictionary;

    if (dictionary[text]) {
        let newText = dictionary[text][lang];
        if (newText) {
            return newText;
        } else if (lang !== 'en') {
            newText = dictionary[text].en;
            if (newText) {
                return newText;
            }
        }
    } else if (typeof text === 'string' && !text.match(/_tooltip$/)) {
        console.log('"' + text + '": {"en": "' + text + '", "de": "' + text + '", "ru": "' + text + '"},');
    } else if (typeof text !== 'string') {
        console.warn('Trying to translate non-text:' + text);
    }
    return text;
}

function _(text, arg1, arg2, arg3) {
    text = translateWord(text);

    let pos = text.indexOf('%s');
    if (pos !== -1) {
        text = text.replace('%s', arg1);
    } else {
        return text;
    }

    pos = text.indexOf('%s');
    if (pos !== -1)  {
        text = text.replace('%s', arg2);
    } else {
        return text;
    }

    pos = text.indexOf('%s');
    if (pos !== -1)  {
        text = text.replace('%s', arg3);
    }

    return text;
}

module.exports.setLanguage = setLanguage;
module.exports.getLanguage = getLanguage;
module.exports._  = _;