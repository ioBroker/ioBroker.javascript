/*global systemDictionary:true */
'use strict';
var systemLang       = 'en';
var systemDictionary = {};

systemDictionary = {
    "was not executed, while debug mode is active": {
        "en": 'was not executed, while debug mode is active',
        "de": 'was not executed, while debug mode is active',
        "ru": 'was not executed, while debug mode is active'
    }
};

function setLanguage(language) {
    systemLang = language;
}

function translateWord(text, lang, dictionary) {
    if (!text) return '';
    lang       = lang       || systemLang;
    dictionary = dictionary || systemDictionary;

    if (dictionary[text]) {
        var newText = dictionary[text][lang];
        if (newText) {
            return newText;
        } else if (lang != 'en') {
            newText = dictionary[text].en;
            if (newText) {
                return newText;
            }
        }
    } else if (typeof text == 'string' && !text.match(/_tooltip$/)) {
        console.log('"' + text + '": {"en": "' + text + '", "de": "' + text + '", "ru": "' + text + '"},');
    } else if (typeof text !== 'string') {
        console.warn('Trying to translate non-text:' + text);
    }
    return text;
}

function _(text, arg1, arg2, arg3) {
    text = translateWord(text);

    var pos = text.indexOf('%s');
    if (pos != -1) {
        text = text.replace('%s', arg1);
    } else {
        return text;
    }

    pos = text.indexOf('%s');
    if (pos != -1)  {
        text = text.replace('%s', arg2);
    } else {
        return text;
    }

    pos = text.indexOf('%s');
    if (pos != -1)  {
        text = text.replace('%s', arg3);
    }

    return text;
}

module.exports.setLanguage  = setLanguage;
module.exports._  = _;