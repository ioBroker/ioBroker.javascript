/**
 * Copyright 2018 bluefox <dogafox@gmail.com>
 *
 * Licensed under the Creative Commons Attribution-NonCommercial License, Version 4.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://creativecommons.org/licenses/by-nc/4.0/legalcode.txt
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

class I18n {
    static translations = {
        'en': require('./i18n/en'),
        'ru': require('./i18n/ru'),
        'de': require('./i18n/de'),
    };

    static lang = window.sysLang || 'en';

    static setLanguage(lang) {
        if (lang) {
            I18n.lang = lang;
        }
    }
    static getLanguage() {
        return I18n.lang;
    }
    static t(word, arg1, arg2, arg3) {
        if (I18n.translations[I18n.lang]) {
            const w = I18n.translations[I18n.lang][word];
            if (w) {
                word = w;
            } else {
                console.log(`Translate: ${word}`);
            }
        }
        if (arg1 !== undefined) {
            word = word.replace('%s', arg1);
            if (arg2 !== undefined) {
                word = word.replace('%s', arg2);
                if (arg3 !== undefined) {
                    word = word.replace('%s', arg3);

                }
            }
        }
        return word;
    }
}

/*I18n.translations = {
    'en': require('./i18n/en'),
    'ru': require('./i18n/ru'),
    'de': require('./i18n/de'),
};
I18n.fallbacks = true;
I18n.t = function () {};*/

export default I18n;