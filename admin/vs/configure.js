// THIS FILE IS NOT PART OF THE DISTRIBUTED MONACO EDITOR
// DON'T DELETE IT WHEN UPDATING!!!

// it has to be loaded after monaco-editor/loader.js

// Set the correct root path
require.config({ paths: { 'vs': 'vs' }});

// Allow localization

// All languages in monaco-editor
const availableLanguages = ['de', 'en', 'fr', 'es', 'it', 'ru', 'zh-cn'];

// find the best match
function findLanguage() {
    if (window.sysLang !== undefined && availableLanguages.includes(window.sysLang)) {
        return window.sysLang; // this variable will be set via info.js
    }
    if (navigator.languages && Array.isArray(navigator.languages)) {
        return navigator.languages.find(lang => availableLanguages.includes(lang)) || 'en';
    }
    let lang = navigator.language || navigator.userLanguage;
    if (typeof lang === 'string') {
        // first try the long version
        if (availableLanguages.includes(lang)) {
            return lang;
        }
        // then the short one
        lang = lang.substring(0, 2);
        if (availableLanguages.includes(lang)) {
            return lang;
        }
    }
    return 'en';
}

const language = findLanguage();
// if we have a match, configure the editor
if (language !== undefined && language !== null && language !== 'en') {
    require.config({
        'vs/nls': {
            availableLanguages: {
                '*': language
            }
        }
    });
}

// And load the editor itself
require(['vs/editor/editor.main'], function () { });
