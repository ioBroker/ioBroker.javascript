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

import React from 'react';
import I18n from '../i18n';

const NAMESPACE = 'material';
const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
class Utils {
    static namespace = NAMESPACE;
    static INSTANCES = 'instances';
    static dateFormat = ['DD', 'MM'];

    static CapitalWords(name) {
        return (name || '').split(/[\s_]/)
            .filter(item => item)
            .map(word => word ? word[0].toUpperCase() + word.substring(1).toLowerCase() : '')
            .join(' ');
    }

    static getObjectName(objects, id, settings, options, isDesc) {
        let item = objects[id];
        let text = id;
        const attr = isDesc ? 'desc' : 'name';

        options = options || {};
        if (!options.language) {
            options.language = (objects['system.config'] && objects['system.config'].common && objects['system.config'].common.language) || window.sysLang || 'en';
        }
        if (settings && settings.name) {
            text = settings.name;
            if (typeof text === 'object') {
                text = text[options.language] || text.en;
            }
        } else
        if (item && item.common && item.common[attr]) {
            text = item.common[attr];
            if (attr !== 'desc' && !text && item.common.desc) {
                text = item.common.desc;
            }
            if (typeof text === 'object') {
                text = text[options.language] || text.en;
            }
            text = text.replace(/[_.]/g, ' ');

            if (text === text.toUpperCase()) {
                text = text[0] + text.substring(1).toLowerCase();
            }
        } else {
            let pos = id.lastIndexOf('.');
            text = id.substring(pos + 1).replace(/[_.]/g, ' ');
            text = Utils.CapitalWords(text);
        }
        return text.trim();
    }

    static getSettingsOrder(obj, forEnumId, options) {
        if (obj && obj.hasOwnProperty('common')) {
            obj = obj.common;
        }
        let settings;
        if (obj && obj.custom) {
            settings = (obj.custom || {})[NAMESPACE];
            const user = options.user || 'admin';
            if (settings && settings[user]) {
                if (forEnumId) {
                    if (settings[user].subOrder && settings[user].subOrder[forEnumId]) {
                        return JSON.parse(JSON.stringify(settings[user].subOrder[forEnumId]));
                    }
                } else {
                    if (settings[user].order) {
                        return JSON.parse(JSON.stringify(settings[user].order));
                    }
                }
            }
        }
        return null;
    }

    static getSettingsCustomURLs(obj, forEnumId, options) {
        if (obj && obj.hasOwnProperty('common')) {
            obj = obj.common;
        }
        let settings;
        if (obj && obj.custom) {
            settings = (obj.custom || {})[NAMESPACE];
            const user = options.user || 'admin';
            if (settings && settings[user]) {
                if (forEnumId) {
                    if (settings[user].subURLs && settings[user].subURLs[forEnumId]) {
                        return JSON.parse(JSON.stringify(settings[user].subURLs[forEnumId]));
                    }
                } else {
                    if (settings[user].URLs) {
                        return JSON.parse(JSON.stringify(settings[user].URLs));
                    }
                }
            }
        }
        return null;
    }

    static reorder(list, source, dest) {
        const result = Array.from(list);
        const [removed] = result.splice(source, 1);
        result.splice(dest, 0, removed);
        return result;
    };

    static getSettings(obj, options, defaultEnabling) {
        let settings;
        const id = (obj && obj._id) || (options && options.id);
        if (obj && obj.hasOwnProperty('common')) {
            obj = obj.common;
        }
        if (obj && obj.custom) {
            settings = obj.custom || {};
            settings = settings[NAMESPACE] && settings[NAMESPACE][options.user || 'admin'] ? JSON.parse(JSON.stringify(settings[NAMESPACE][options.user || 'admin'])) : {enabled: true};
        } else {
            settings = {enabled: defaultEnabling === undefined ? true : defaultEnabling, useCustom: false};
        }

        if (!settings.hasOwnProperty('enabled')) {
            settings.enabled = defaultEnabling === undefined ? true : defaultEnabling;
        }

        if (false && settings.useCommon) {
            if (obj.color) settings.color = obj.color;
            if (obj.icon)  settings.icon  = obj.icon;
            if (obj.name)  settings.name  = obj.name;
        } else {
            if (options) {
                if (!settings.name  && options.name)  settings.name  = options.name;
                if (!settings.icon  && options.icon)  settings.icon  = options.icon;
                if (!settings.color && options.color) settings.color = options.color;
            }

            if (obj) {
                if (!settings.color && obj.color) settings.color = obj.color;
                if (!settings.icon  && obj.icon)  settings.icon  = obj.icon;
                if (!settings.name  && obj.name)  settings.name  = obj.name;
            }
        }

        if (typeof settings.name === 'object') {
            settings.name = settings.name[options.language] || settings.name.en;

            settings.name = (settings.name || '').replace(/_/g, ' ');

            if (settings.name === settings.name.toUpperCase()) {
                settings.name = settings.name[0] + settings.name.substring(1).toLowerCase();
            }
        }
        if (!settings.name && id) {
            let pos = id.lastIndexOf('.');
            settings.name = id.substring(pos + 1).replace(/[_.]/g, ' ');
            settings.name = (settings.name || '').replace(/_/g, ' ');
            settings.name = Utils.CapitalWords(settings.name);
        }

        return settings;
    }

    static setSettings(obj, settings, options) {
        if (obj) {
            obj.common = obj.common || {};
            obj.common.custom = obj.common.custom || {};
            obj.common.custom[NAMESPACE] = obj.common.custom[NAMESPACE] || {};
            obj.common.custom[NAMESPACE][options.user || 'admin'] = settings;
            const s = obj.common.custom[NAMESPACE][options.user || 'admin'];
            if (s.useCommon) {
                if (s.color !== undefined) {
                    obj.common.color = s.color;
                    delete s.color;
                }
                if (s.icon !== undefined) {
                    obj.common.icon = s.icon;
                    delete s.icon;
                }
                if (s.name !== undefined) {
                    if (typeof obj.common.name !== 'object') {
                        obj.common.name = {};
                        obj.common.name[options.language] = s.name;
                    } else{
                        obj.common.name[options.language] = s.name;
                    }
                    delete s.name;
                }
            }

            return true;
        } else {
            return false;
        }
    }

    static getIcon(settings, style) {
        if (settings && settings.icon) {
            if (settings.icon.startsWith('data:image')) {
                return (<img alt={settings.name} src={settings.icon} style={style || {}}/>);
            } else { // may be later some changes for second type
                return (<img alt={settings.name} src={settings.icon} style={style || {}}/>);
            }
        }
        return null;
    }

    static getObjectIcon(id, obj) {
        if (obj && obj.common && obj.common.icon) {
            let icon = obj.common.icon;
            if (icon.startsWith('data:image')) {
                return icon;
            } else {
                const parts = id.split('.');
                if (parts[0] === 'system') {
                    icon = 'adapter/' + parts[2] + icon;
                } else {
                    icon = 'adapter/' + parts[0] + icon;
                }

                if (window.location.pathname.match(/material\/[.\d]+/)) {
                    icon = '../../' + icon;
                } else
                if (window.location.pathname.match(/material\//)) {
                    icon = '../' + icon;
                }
                return icon;
            }
        } else {
            return null;
        }

    }

    static splitCamelCase(text) {
        if (false && text !== text.toUpperCase()) {
            const words = text.split(/\s+/);
            for (let i = 0; i < words.length; i++) {
                let word = words[i];
                if (word.toLowerCase() !== word && word.toUpperCase() !== word) {
                    let z = 0;
                    const ww = [];
                    let start = 0;
                    while (z < word.length) {
                        if (word[z].match(/[A-ZÜÄÖА-Я]/)) {
                            ww.push(word.substring(start, z));
                            start = z;
                        }
                        z++;
                    }
                    if (start !== z) {
                        ww.push(word.substring(start, z));
                    }
                    for (let k = 0; k < ww.length; k++) {
                        words.splice(i + k, 0, ww[k]);
                    }
                    i += ww.length;
                }
            }

            return words.map(w => {
                w = w.trim();
                if (w) {
                    return w[0].toUpperCase() + w.substring(1).toLowerCase();
                }
                return '';
            }).join(' ');
        } else {
            return Utils.CapitalWords(text);
        }
    }

    // https://stackoverflow.com/questions/35969656/how-can-i-generate-the-opposite-color-according-to-current-color
    static isUseBright(color, defaultValue) {
        if (color === null || color === undefined || color === '') {
            return defaultValue === undefined ? true : defaultValue;
        }
        color = color.toString();
        if (color.indexOf('#') === 0) {
            color = color.slice(1);
        }
        let r;
        let g;
        let b;

        const rgb = color.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
        if (rgb && rgb.length === 4) {
            r = parseInt(rgb[1], 10);
            g = parseInt(rgb[2], 10);
            b = parseInt(rgb[3], 10);
        } else {
            // convert 3-digit hex to 6-digits.
            if (color.length === 3) {
                color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
            }
            if (color.length !== 6) {
                return false;
            }

            r = parseInt(color.slice(0, 2), 16);
            g = parseInt(color.slice(2, 4), 16);
            b = parseInt(color.slice(4, 6), 16);
        }


        // http://stackoverflow.com/a/3943023/112731
        return (r * 0.299 + g * 0.587 + b * 0.114) <= 186;
    };

    static getTimeString(seconds) {
        seconds = parseFloat(seconds);
        if (isNaN(seconds)) {
            return '--:--';
        }
        const hours = Math.floor(seconds / 3600);
        let minutes = Math.floor((seconds % 3600) / 60);
        let secs = seconds % 60;
        if (hours) {
            if (minutes < 10) minutes = '0' + minutes;
            if (secs < 10) secs = '0' + secs;
            return hours + ':' + minutes + ':' + secs;
        } else {
            if (secs < 10) secs = '0' + secs;
            return minutes + ':' + secs;
        }
    }

    static getWindDirection(angle) {
        if (angle >= 0 && angle < 11.25) {
            return 'N'
        } else if (angle >= 11.25 && angle < 33.75) {
            return 'NNE'
        } else if (angle >= 33.75 && angle < 56.25) {
            return 'NE'
        } else if (angle >= 56.25 && angle < 78.75) {
            return 'ENE'
        } else if (angle >= 78.75 && angle < 101.25) {
            return 'E'
        } else if (angle >= 101.25 && angle < 123.75) {
            return 'ESE'
        } else if (angle >= 123.75 && angle < 146.25) {
            return 'SE'
        } else if (angle >= 146.25 && angle < 168.75) {
            return 'SSE'
        } else if (angle >= 168.75 && angle < 191.25) {
            return 'S'
        } else if (angle >= 191.25 && angle < 213.75) {
            return 'SSW'
        } else if (angle >= 213.75 && angle < 236.25) {
            return 'SW'
        } else if (angle >= 236.25 && angle < 258.75) {
            return 'WSW'
        } else if (angle >= 258.75 && angle < 281.25) {
            return 'W'
        } else if (angle >= 281.25 && angle < 303.75) {
            return 'WNW'
        } else if (angle >= 303.75 && angle < 326.25) {
            return 'NW'
        } else if (angle >= 326.25 && angle < 348.75) {
            return 'NNW'
        } else if (angle >= 348.75) {
            return 'N'
        }
    }

    static padding(num) {
        if (typeof num === 'string') {
            if (num.length < 2) {
                return '0' + num;
            } else {
                return num;
            }
        } else if (num < 10) {
            return '0' + num;
        } else {
            return num;
        }
    }

    static setDataFormat(format) {
        if (format) {
            Utils.dateFormat = format.toUpperCase().split(/[.-/]/);
            Utils.dateFormat.splice(Utils.dateFormat.indexOf('YYYY'), 1);
        }
    }

    static date2string(now) {
        if (typeof now === 'string') {
            now = now.trim();
            if (!now) return '';
            // only letters
            if (now.match(/^[\w\s]+$/)) {
                // Day of week
                return now;
            }
            let m = now.match(/(\d{1,4})[-./](\d{1,2})[-./](\d{1,4})/);
            if (m) {
                let a = [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
                let year = a.find(y => y > 31);
                a.splice(a.indexOf(year), 1);
                let day = a.find(m => m > 12);
                if (day) {
                    a.splice(a.indexOf(day), 1);
                    now = new Date(year, a[0] - 1, day);
                } else {
                    // MM DD
                    if (Utils.dateFormat[0][0] === 'M' && Utils.dateFormat[1][0] === 'D') {
                        now = new Date(year, a[0] - 1, a[1]);
                        if (Math.abs(now.getTime - Date.now()) > 3600000 * 24 * 10) {
                            now = new Date(year, a[1] - 1, a[0]);
                        }
                    } else
                    // DD MM
                    if (Utils.dateFormat[0][0] === 'D' && Utils.dateFormat[1][0] === 'M') {
                        now = new Date(year, a[1] - 1, a[0]);
                        if (Math.abs(now.getTime - Date.now()) > 3600000 * 24 * 10) {
                            now = new Date(year, a[0] - 1, a[1]);
                        }
                    } else {
                        now = new Date(now);
                    }
                }
            } else {
                now = new Date(now);
            }
        } else {
            now = new Date(now);
        }

        let date = I18n.t('dow_' + days[now.getDay()]).replace('dow_', '');
        date += '. ' + now.getDate() + ' ' + I18n.t('month_' + months[now.getMonth()]).replace('month_', '');
        return date;
    }
}

export default Utils;