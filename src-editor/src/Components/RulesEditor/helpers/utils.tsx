import { I18n } from '@iobroker/adapter-react-v5';

let lang: ioBroker.Languages | undefined;
export function getName(obj: undefined | ioBroker.StringOrTranslated | null): string {
    lang = lang || I18n.getLanguage();
    if (obj && typeof obj === 'object') {
        return obj[lang] || obj.en;
    }
    return obj || '';
}

export function renderValue(val: any): string {
    if (val === null) {
        return 'null';
    }
    if (val === undefined) {
        return 'undefined';
    }
    if (Array.isArray(val)) {
        return val.join(', ');
    }
    if (typeof val === 'object') {
        return JSON.stringify(val);
    }

    return val.toString();
}
