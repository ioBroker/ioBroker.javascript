'use strict';

goog.provide('Blockly.JavaScript.Time');

goog.require('Blockly.JavaScript');

Blockly.CustomBlocks = Blockly.CustomBlocks || [];
Blockly.CustomBlocks.push('Time');

Blockly.Time = {
    HUE: 270,
    blocks: {}
};

Blockly.Words['Time'] = {'en': 'Date and Time', 'de': 'Datum und Zeit', 'ru': 'Дата и время'};

// if time greater, less, between
// --- time compare --------------------------------------------------
Blockly.Words['time_compare']               = {'en': 'Actual time is',              'de': 'Aktuelle Zeit ist',                  'ru': 'Время '};
Blockly.Words['time_compare_message']       = {'en': 'message',                     'de': 'Meldung',                            'ru': 'сообщение'};
Blockly.Words['time_compare_username']      = {'en': 'User name (optional)',        'de': 'Username (optional)',                'ru': 'имя пользователя (не обяз.)'};
Blockly.Words['time_compare_anyInstance']   = {'en': 'all instances',               'de': 'Alle Instanzen',                     'ru': 'На все драйвера'};
Blockly.Words['time_compare_tooltip']       = {'en': 'Send message to telegram',    'de': 'Sende eine Meldung über Telegram',   'ru': 'Послать сообщение через Telegram'};
Blockly.Words['time_compare_help']          = {'en': 'https://github.com/ioBroker/ioBroker.telegram/blob/master/README.md', 'de': 'https://github.com/ioBroker/ioBroker.telegram/blob/master/README.md', 'ru': 'https://github.com/ioBroker/ioBroker.telegram/blob/master/README.md'};

Blockly.Words['time_compare_lt']            = {'en': 'less than',                   'de': 'kleiner als',                        'ru': 'меньше чем'};
Blockly.Words['time_compare_le']            = {'en': 'equal to or less than',       'de': 'gleich oder kleiner als',            'ru': 'равно или меньше чем'};
Blockly.Words['time_compare_gt']            = {'en': 'greater than',                'de': 'größer als',                         'ru': 'больше чем'};
Blockly.Words['time_compare_ge']            = {'en': 'equal to or greater than',    'de': 'gleich oder größer als',             'ru': 'равно или больше чем'};
Blockly.Words['time_compare_eq']            = {'en': 'equal to',                    'de': 'gleich mit',                         'ru': 'равно'};
Blockly.Words['time_compare_bw']            = {'en': 'between',                     'de': 'zwischen',                           'ru': 'между'};
Blockly.Words['time_compare_nb']            = {'en': 'not between',                 'de': 'nicht zwischen',                     'ru': 'не между'};
Blockly.Words['time_compare_and']           = {'en': 'and',                         'de': 'und',                                'ru': 'и'};

Blockly.Time.blocks['time_compare'] =
    '<block type="time_compare">'
    + '     <value name="OPTION">'
    + '     </value>'
    + '     <value name="START_TIME">'
    + '     </value>'
    + '     <mutation end_time="false"></mutation>'
    + '     <value name="END_TIME">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['time_compare'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(Blockly.Words['time_compare'][systemLang]);

        this.appendDummyInput("OPTION")
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Words['time_compare_lt'][systemLang], "<"],
                [Blockly.Words['time_compare_le'][systemLang], "<="],
                [Blockly.Words['time_compare_gt'][systemLang], ">"],
                [Blockly.Words['time_compare_ge'][systemLang], ">="],
                [Blockly.Words['time_compare_eq'][systemLang], "=="],
                [Blockly.Words['time_compare_bw'][systemLang], "between"],
                [Blockly.Words['time_compare_nb'][systemLang], "not between"]
            ], function (option) {
                this.sourceBlock_.updateShape_((option === 'between' || option === 'not between'));
            }), "OPTION");

        this.appendDummyInput()
            .appendField(" ");

        this.appendDummyInput("START_TIME")
            .appendField(new Blockly.FieldTextInput("12:00"), "START_TIME");

        this.setInputsInline(true);
        //this.setPreviousStatement(true, null);
        //this.setNextStatement(true, null);

        this.setOutput(true, 'Boolean');

        this.setColour(Blockly.Time.HUE);
        this.setTooltip(Blockly.Words['time_compare_tooltip'][systemLang]);
        this.setHelpUrl(Blockly.Words['time_compare_help'][systemLang]);
    },
    mutationToDom: function() {
        var container = document.createElement('mutation');
        var option = this.getFieldValue('OPTION');
        container.setAttribute('end_time', (option === 'between' || option === 'not between') ? 'true' : 'false');
        return container;
    },
    domToMutation: function(xmlElement) {
        this.updateShape_(xmlElement.getAttribute('end_time') === 'true');
    },
    updateShape_: function(isBetween) {
        // Add or remove a delay Input.
        var inputExists = this.getInput('END_TIME');

        if (isBetween) {
            if (!inputExists) {
                this.appendDummyInput('AND')
                    .appendField(Blockly.Words['time_compare_and'][systemLang]);

                this.appendDummyInput('END_TIME')
                    .appendField(new Blockly.FieldTextInput("18:00"), 'END_TIME');
            }
        } else if (inputExists) {
            this.removeInput('END_TIME');
            this.removeInput('AND');
        }
    }
};

Blockly.JavaScript['time_compare'] = function(block) {
    var option     = block.getFieldValue('OPTION');
    var start_time = block.getFieldValue('START_TIME');
    var end_time   = block.getFieldValue('END_TIME');

    var code_start_time;
    var code_end_time = '';

    if (option === 'between' && end_time) {
        if (end_time.indexOf(':') === -1) {
            if (parseInt(end_time, 10) < parseInt(end_time, 10)) {
                code_end_time = ' || ';
            } else {
                code_end_time = ' && ';
            }

            code_end_time += '((new Date().getMinutes()) < ' + parseInt(end_time, 10) + ')';
        } else {
            var parts = end_time.split(':');
            end_time = 60 * parseInt(parts[0], 10) + parseInt(parts[1], 10);
            parts = start_time.split(':');
            var _start_time = 60 * parseInt(parts[0], 10) + parseInt(parts[1], 10);
            if (end_time < _start_time) {
                code_end_time = ' || ';
            } else {
                code_end_time = ' && ';
            }
            code_end_time += '(((new Date().getHours()) * 60 + (new Date().getMinutes())) < ' + end_time + ')';
        }
    } else if (option === 'not between' && end_time) {
        if (end_time.indexOf(':') === -1) {
            if (parseInt(end_time, 10) < parseInt(end_time, 10)) {
                code_end_time = ' || ';
            } else {
                code_end_time = ' && ';
            }
            code_end_time += '((new Date().getMinutes()) >= ' + parseInt(end_time, 10) + ')';
        } else {
            var parts = end_time.split(':');
            end_time = 60 * parseInt(parts[0], 10) + parseInt(parts[1], 10);

            parts = start_time.split(':');
            var _start_time = 60 * parseInt(parts[0], 10) + parseInt(parts[1], 10);
            if (end_time < _start_time) {
                code_end_time = ' || ';
            } else {
                code_end_time = ' && ';
            }

            code_end_time += '(((new Date().getHours()) * 60 + (new Date().getMinutes())) >= ' + end_time + ')';
        }
    }

    // compare minutes
    if (start_time.indexOf(':') === -1) {
        if (option === 'between') {
            code_start_time = '(((new Date().getMinutes()) >= ' + parseInt(start_time, 10) + ')' + code_end_time + ')';
        } else if (option === 'not between') {
            code_start_time = '(((new Date().getMinutes()) <= ' + parseInt(start_time, 10) + ')' + code_end_time + ')';
        } else {
            code_start_time = '((new Date().getMinutes()) ' + option + ' ' + parseInt(start_time, 10) + ')';
        }
    } else {
        var parts = start_time.split(':');
        start_time = 60 * parseInt(parts[0], 10) + parseInt(parts[1], 10);
        if (option === 'between') {
            code_start_time = '(((new Date().getHours()) * 60 + (new Date().getMinutes()) >= ' + start_time + ')' + code_end_time + ')';
        } else if (option === 'not between'){
            code_start_time = '(((new Date().getHours()) * 60 + (new Date().getMinutes()) < ' + start_time + ')' + code_end_time + ')';
        } else {
            code_start_time = '((new Date().getHours()) * 60 + (new Date().getMinutes()) ' + option + ' ' + start_time + ')';
        }
    }

    return [code_start_time, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- get time --------------------------------------------------
Blockly.Words['time_get']               = {'en': 'Actual time is',              'de': 'Aktuelle Zeit ist',                  'ru': 'Время '};
Blockly.Words['time_get_default_format'] = {'en': 'YYYY.MM.DD hh:mm:ss.sss',    'de': 'JJJJ.MM.TT SS:mm:ss.sss',            'ru': 'ГГГГ.ММ.ДД чч:мм:сс.ссс'};
Blockly.Words['time_get_anyInstance']   = {'en': 'all instances',               'de': 'Alle Instanzen',                     'ru': 'На все драйвера'};
Blockly.Words['time_get_tooltip']       = {'en': 'Send message to telegram',    'de': 'Sende eine Meldung über Telegram',   'ru': 'Послать сообщение через Telegram'};
Blockly.Words['time_get_help']          = {'en': 'https://github.com/ioBroker/ioBroker.telegram/blob/master/README.md', 'de': 'https://github.com/ioBroker/ioBroker.telegram/blob/master/README.md', 'ru': 'https://github.com/ioBroker/ioBroker.telegram/blob/master/README.md'};

Blockly.Words['time_get_ms']            = {'en': 'milliseconds',                'de': 'Millisekunden',                      'ru': 'миллисекунды'};
Blockly.Words['time_get_s']             = {'en': 'seconds',                     'de': 'Sekunden',                           'ru': 'секунды'};
Blockly.Words['time_get_m']             = {'en': 'minutes',                     'de': 'Minuten',                            'ru': 'минуты'};
Blockly.Words['time_get_h']             = {'en': 'hours',                       'de': 'Stunden',                            'ru': 'часы'};
Blockly.Words['time_get_d']             = {'en': 'day of month',                'de': 'Monatsdatum',                        'ru': 'день месяца'};
Blockly.Words['time_get_M']             = {'en': 'month as number',             'de': 'Monat als Nummer',                   'ru': 'месяц числом'};
Blockly.Words['time_get_Mt']            = {'en': 'month as text',               'de': 'Monat als Text',                     'ru': 'месяц словом'};
Blockly.Words['time_get_Mts']           = {'en': 'month as short text',         'de': 'Monat als Kurztext',                 'ru': 'месяц коротким словом'};
Blockly.Words['time_get_y']             = {'en': 'short year',                  'de': 'Kurzes Jahr',                        'ru': 'короткий год'};
Blockly.Words['time_get_fy']            = {'en': 'full year',                   'de': 'Volljahr',                           'ru': 'полный год'};
Blockly.Words['time_get_wdt']           = {'en': 'week day text',               'de': 'Wochentag als Text',                 'ru': 'день недели словом'};
Blockly.Words['time_get_wdts']          = {'en': 'short week day',              'de': 'Wochentag als Kurztext',             'ru': 'короткий день недели'};
Blockly.Words['time_get_wd']            = {'en': 'week day as number',          'de': 'Wochentag als Nummer',               'ru': 'день недели числом'};
Blockly.Words['time_get_custom']        = {'en': 'custom format',               'de': 'anwenderformatiert',                 'ru': 'произвольный формат'};
Blockly.Words['time_get_object']        = {'en': 'Date object',                 'de': 'Datum-Objekt',                       'ru': 'как объект'};

Blockly.Words['time_get_yyyy.mm.dd']    = {'en': 'yyyy.mm.dd',                  'de': 'JJJJ.MM.TT',                         'ru': 'ГГГГ.ММ.ДД',     format: 'YYYY.MM.DD'};
Blockly.Words['time_get_yyyy/mm/dd']    = {'en': 'yyyy/mm/dd',                  'de': 'JJJJ/MM/TT',                         'ru': 'ГГГГ/ММ/ДД',     format: 'YYYY/MM/DD'};
Blockly.Words['time_get_yy.mm.dd']      = {'en': 'yy.mm.dd',                    'de': 'JJ.MM.TT',                           'ru': 'ГГ.ММ.ДД',       format: 'YY.MM.DD'};
Blockly.Words['time_get_yy/mm/dd']      = {'en': 'yy/mm/dd',                    'de': 'JJ/MM/TT',                           'ru': 'ГГ/ММ/ДД',       format: 'YY/MM/DD'};
Blockly.Words['time_get_dd.mm.yyyy']    = {'en': 'dd.mm.yyyy',                  'de': 'TT.MM.JJJJ',                         'ru': 'ДД.ММ.ГГГГ',     format: 'DD.MM.YYYY'};
Blockly.Words['time_get_dd/mm/yyyy']    = {'en': 'dd/mm/yyyy',                  'de': 'TT/MM/JJJJ',                         'ru': 'ДД/ММ/ГГГГ',     format: 'DD/MM/YYYY'};
Blockly.Words['time_get_dd.mm.yy']      = {'en': 'dd.mm.yy',                    'de': 'TT.MM.JJ',                           'ru': 'ДД.ММ.ГГ',       format: 'DD.MM.YY'};
Blockly.Words['time_get_dd/mm/yy']      = {'en': 'dd/mm/yy',                    'de': 'TT/MM/JJ',                           'ru': 'ДД/ММ/ГГ',       format: 'DD/MM/YY'};
Blockly.Words['time_get_mm/dd/yyyy']    = {'en': 'mm/dd/yyyy',                  'de': 'MM/TT/JJJJ',                         'ru': 'ММ/ДД/ГГГГ',     format: 'MM/DD/YYYY'};
Blockly.Words['time_get_mm/dd/yy']      = {'en': 'mm/dd/yy',                    'de': 'MM/TT/JJ',                           'ru': 'ММ/ДД/yy',       format: 'MM/DD/YY'};
Blockly.Words['time_get_dd.mm']         = {'en': 'dd.mm.',                      'de': 'TT.MM.',                             'ru': 'ДД.ММ.',         format: 'DD.MM.'};
Blockly.Words['time_get_dd/mm']         = {'en': 'dd/mm',                       'de': 'TT/MM',                              'ru': 'ДД/ММ',          format: 'DD/MM'};
Blockly.Words['time_get_mm.dd']         = {'en': 'mm.dd',                       'de': 'MM.TT',                              'ru': 'ММ.ДД',          format: 'MM.DD'};
Blockly.Words['time_get_mm/dd']         = {'en': 'mm/dd',                       'de': 'MM/TT',                              'ru': 'ММ/ДД',          format: 'MM/DD'};
Blockly.Words['time_get_hh_mm']         = {'en': 'hh:mm',                       'de': 'SS:mm',                              'ru': 'чч:мм',          format: 'hh:mm'};
Blockly.Words['time_get_hh_mm_ss']      = {'en': 'hh:mm:ss',                    'de': 'SS:mm:ss',                           'ru': 'чч:мм:сс',       format: 'hh:mm:ss'};
Blockly.Words['time_get_hh_mm_ss.sss']  = {'en': 'hh:mm:ss.sss',                'de': 'SS:mm:ss.sss',                       'ru': 'чч:мм:сс.ссс',   format: 'hh:mm:ss.sss'};

Blockly.Time.blocks['time_get'] =
    '<block type="time_get">'
    + '     <value name="OPTION">'
    + '     </value>'
    + '     <mutation format="false" language="false"></mutation>'
    + '     <value name="FORMAT">'
    + '     </value>'
    + '     <value name="LANGUAGE">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['time_get'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(Blockly.Words['time_get'][systemLang]);

        this.appendDummyInput('OPTION')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Words['time_get_ms'][systemLang]            , 'ms'],
                [Blockly.Words['time_get_s'][systemLang]             , 's'],
                [Blockly.Words['time_get_m'][systemLang]             , 'm'],
                [Blockly.Words['time_get_h'][systemLang]             , 'h'],
                [Blockly.Words['time_get_d'][systemLang]             , 'd'],
                [Blockly.Words['time_get_M'][systemLang]             , 'M'],
                [Blockly.Words['time_get_Mt'][systemLang]            , 'Mt'],
                [Blockly.Words['time_get_Mts'][systemLang]           , 'Mts'],
                [Blockly.Words['time_get_y'][systemLang]             , 'y'],
                [Blockly.Words['time_get_fy'][systemLang]            , 'fy'],
                [Blockly.Words['time_get_wdt'][systemLang]           , 'wdt'],
                [Blockly.Words['time_get_wdts'][systemLang]          , 'wdts'],
                [Blockly.Words['time_get_wd'][systemLang]            , 'wd'],
                [Blockly.Words['time_get_custom'][systemLang]        , 'custom'],
                [Blockly.Words['time_get_object'][systemLang]        , 'object'],
                [Blockly.Words['time_get_yyyy.mm.dd'][systemLang]    , [Blockly.Words['time_get_yyyy.mm.dd']  .format]],
                [Blockly.Words['time_get_yyyy/mm/dd'][systemLang]    , [Blockly.Words['time_get_yyyy/mm/dd']  .format]],
                [Blockly.Words['time_get_yy.mm.dd'][systemLang]      , [Blockly.Words['time_get_yy.mm.dd']    .format]],
                [Blockly.Words['time_get_yy/mm/dd'][systemLang]      , [Blockly.Words['time_get_yy/mm/dd']    .format]],
                [Blockly.Words['time_get_dd.mm.yyyy'][systemLang]    , [Blockly.Words['time_get_dd.mm.yyyy']  .format]],
                [Blockly.Words['time_get_dd/mm/yyyy'][systemLang]    , [Blockly.Words['time_get_dd/mm/yyyy']  .format]],
                [Blockly.Words['time_get_dd.mm.yy'][systemLang]      , [Blockly.Words['time_get_dd.mm.yy']    .format]],
                [Blockly.Words['time_get_dd/mm/yy'][systemLang]      , [Blockly.Words['time_get_dd/mm/yy']    .format]],
                [Blockly.Words['time_get_mm/dd/yyyy'][systemLang]    , [Blockly.Words['time_get_mm/dd/yyyy']  .format]],
                [Blockly.Words['time_get_mm/dd/yy'][systemLang]      , [Blockly.Words['time_get_mm/dd/yy']    .format]],
                [Blockly.Words['time_get_dd.mm'][systemLang]         , [Blockly.Words['time_get_dd.mm']       .format]],
                [Blockly.Words['time_get_dd/mm'][systemLang]         , [Blockly.Words['time_get_dd/mm']       .format]],
                [Blockly.Words['time_get_mm.dd'][systemLang]         , [Blockly.Words['time_get_mm.dd']       .format]],
                [Blockly.Words['time_get_mm/dd'][systemLang]         , [Blockly.Words['time_get_mm/dd']       .format]],
                [Blockly.Words['time_get_hh_mm'][systemLang]         , [Blockly.Words['time_get_hh_mm']       .format]],
                [Blockly.Words['time_get_hh_mm_ss'][systemLang]      , [Blockly.Words['time_get_hh_mm_ss']    .format]],
                [Blockly.Words['time_get_hh_mm_ss.sss'][systemLang]  , [Blockly.Words['time_get_hh_mm_ss.sss'].format]]
            ], function (option) {
                this.sourceBlock_.updateShape_(option === 'custom', option === 'wdt' || option === 'wdts' || option === 'Mt' || option === 'Mts');
            }), "OPTION");

        this.setInputsInline(true);

        this.setOutput(true);

        this.setColour(Blockly.Time.HUE);
        this.setTooltip(Blockly.Words['time_get_tooltip'][systemLang]);
        this.setHelpUrl(Blockly.Words['time_get_help'][systemLang]);
    },
    mutationToDom: function() {
        var container = document.createElement('mutation');
        var option = this.getFieldValue('OPTION');
        container.setAttribute('format', option === 'custom' ? 'true' : 'false');
        container.setAttribute('language', option === 'wdt' || option === 'wdts' || option === 'Mt' || option === 'Mts' ? 'true' : 'false');
        return container;
    },
    domToMutation: function(xmlElement) {
        this.updateShape_(xmlElement.getAttribute('format') === 'true', xmlElement.getAttribute('language') === 'true');
    },
    updateShape_: function(isFormat, isLanguage) {
        // Add or remove a delay Input.
        var inputExists = this.getInput('FORMAT');

        if (isFormat) {
            if (!inputExists) {
                this.appendDummyInput('FORMAT')
                    .appendField(' ')
                    .appendField(new Blockly.FieldTextInput(Blockly.Words['time_get_default_format'][systemLang]), 'FORMAT');
            }
        } else if (inputExists) {
            this.removeInput('FORMAT');
        }

        inputExists = this.getInput('LANGUAGE');

        if (isLanguage) {
            if (!inputExists) {
                var languages;
                if (systemLang === 'en') {
                    languages = [['in english', 'en'], ['auf deutsch', 'de'], ['на русском', 'ru']];
                } else if (systemLang === 'de') {
                    languages = [['auf deutsch', 'de'], ['in english', 'en'], ['на русском', 'ru']];
                } else if (systemLang === 'ru') {
                    languages = [['на русском', 'ru'], ['in english', 'en'], ['auf deutsch', 'de']];
                } else {
                    languages = [['in english', 'en'], ['auf deutsch', 'de'], ['на русском', 'ru']];
                }
                this.appendDummyInput('LANGUAGE')
                    .appendField(new Blockly.FieldDropdown(languages), 'LANGUAGE');
            }
        } else if (inputExists) {
            this.removeInput('LANGUAGE');
        }
    }
};

Blockly.JavaScript['time_get'] = function(block) {
    var option = block.getFieldValue('OPTION');
    var format = block.getFieldValue('FORMAT');
    var lang   = block.getFieldValue('LANGUAGE');

    var code;
    if (option === 'object') {
        code = '(new Date().getTime())';
    } else if (option === 'ms') {
        code = '(new Date().getMilliseconds())';
    } else if (option === 's') {
        code = '(new Date().getSeconds())';
    } else if (option === 'h') {
        code = '(new Date().getHours())';
    } else if (option === 'd') {
        code = '(new Date().getDate())';
    } else if (option === 'M') {
        code = '(new Date().getMonth() + 1)';
    } else if (option === 'Mt') {
        code = 'formatDate(new Date(), "OO", "' + lang + '")';
    } else if (option === 'Mts') {
        code = 'formatDate(new Date(), "O", "' + lang + '")';
    } else if (option === 'y') {
        code = '(new Date().getYear())';
    } else if (option === 'fy') {
        code = '(new Date().getFullYear())';
    } else if (option === 'wdt') {
        code = 'formatDate(new Date(), "WW", "' + lang + '")';
    } else if (option === 'wdts') {
        code = 'formatDate(new Date(), "W", "' + lang + '")';
    } else if (option === 'wd') {
        code = '(new Date().getDay() === 0 ? 7 : new Date().getDay())';
    } else if (option === 'custom') {
        code = 'formatDate(new Date(), "' + format + '")';
    } else {
        code = 'formatDate(new Date(), "' + option + '")';
    }

    return [code, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- get astro time --------------------------------------------------
Blockly.Words['time_astro']               = {'en': 'Actual time of',              'de': 'Aktuelle Zeit von',                  'ru': 'Время '};
Blockly.Words['time_astro_default_format'] = {'en': 'YYYY.MM.DD hh:mm:ss.sss',    'de': 'JJJJ.MM.TT SS:mm:ss.sss',            'ru': 'ГГГГ.ММ.ДД чч:мм:сс.ссс'};
Blockly.Words['time_astro_tooltip']       = {'en': 'Get actual time or ',    'de': 'Sende eine Meldung über Telegram',   'ru': 'Послать сообщение через Telegram'};
Blockly.Words['time_astro_help']          = {'en': 'https://github.com/ioBroker/ioBroker.telegram/blob/master/README.md', 'de': 'https://github.com/ioBroker/ioBroker.telegram/blob/master/README.md', 'ru': 'https://github.com/ioBroker/ioBroker.telegram/blob/master/README.md'};

if (!Blockly.Words['astro_sunriseText']) {
    Blockly.Words['astro_sunriseText']       = {'en': 'sunrise',                         'de': 'Sonnenaufgang',                 'ru': 'восход солнца'};
    Blockly.Words['astro_sunriseEndText']    = {'en': 'sunrise end',                     'de': 'Sonnenaufgang-Ende',            'ru': 'конец восхода'};
    Blockly.Words['astro_goldenHourEndText'] = {'en': 'golden hour end',                 'de': '"Golden hour"-Ende',            'ru': 'конец золотого часа'};
    Blockly.Words['astro_solarNoonText']     = {'en': 'solar noon',                      'de': 'Sonnenmittag',                  'ru': 'солнечеый полдень'};
    Blockly.Words['astro_goldenHourText']    = {'en': 'golden hour',                     'de': '"Golden hour"',                 'ru': 'золотой час'};
    Blockly.Words['astro_sunsetStartText']   = {'en': 'sunset start',                    'de': 'Sonnenuntergang-Anfang',        'ru': 'начало захода солнца'};
    Blockly.Words['astro_sunsetText']        = {'en': 'sunset',                          'de': 'Sonnenuntergang',               'ru': 'конец захода солнца'};
    Blockly.Words['astro_duskText']          = {'en': 'dusk',                            'de': 'Abenddämmerung',                'ru': 'сумерки'};
    Blockly.Words['astro_nauticalDuskText']  = {'en': 'nautical dusk',                   'de': 'Nautische Abenddämmerung',      'ru': 'навигационные сумерки'};
    Blockly.Words['astro_nightText']         = {'en': 'night',                           'de': 'Nacht',                         'ru': 'ночь'};
    Blockly.Words['astro_nightEndText']      = {'en': 'night end',                       'de': 'Nachtsende',                    'ru': 'конец ночи'};
    Blockly.Words['astro_nauticalDawnText']  = {'en': 'nautical dawn',                   'de': 'Nautische Morgendämmerung',     'ru': 'навигационный рассвет'};
    Blockly.Words['astro_dawnText']          = {'en': 'dawn',                            'de': 'Morgendämmerung',               'ru': 'рассвет'};
    Blockly.Words['astro_nadirText']         = {'en': 'nadir',                           'de': 'Nadir',                         'ru': 'надир'};
}


Blockly.Time.blocks['time_astro'] =
    '<block type="time_astro">'
    + '     <value name="TYPE">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['time_astro'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(Blockly.Words['time_astro'][systemLang]);

        this.appendDummyInput('TYPE')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Words['astro_sunriseText'][systemLang],         'sunrise'],
                [Blockly.Words['astro_sunriseEndText'][systemLang],      'sunriseEnd'],
                [Blockly.Words['astro_goldenHourEndText'][systemLang],   'goldenHourEnd'],
                [Blockly.Words['astro_solarNoonText'][systemLang],       'solarNoon'],
                [Blockly.Words['astro_goldenHourText'][systemLang],      'goldenHour'],
                [Blockly.Words['astro_sunsetStartText'][systemLang],     'sunsetStart'],
                [Blockly.Words['astro_sunsetText'][systemLang],          'sunset'],
                [Blockly.Words['astro_duskText'][systemLang],            'dusk'],
                [Blockly.Words['astro_nauticalDuskText'][systemLang],    'nauticalDusk'],
                [Blockly.Words['astro_nightText'][systemLang],           'night'],
                [Blockly.Words['astro_nightEndText'][systemLang],        'nightEnd'],
                [Blockly.Words['astro_nauticalDawnText'][systemLang],    'nauticalDawn'],
                [Blockly.Words['astro_dawnText'][systemLang],            'dawn'],
                [Blockly.Words['astro_nadirText'][systemLang],           'nadir']
            ]), 'TYPE');

        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setOutput(true);

        this.setColour(Blockly.Time.HUE);
        this.setTooltip(Blockly.Words['time_astro_tooltip'][systemLang]);
        this.setHelpUrl(Blockly.Words['time_astro_help'][systemLang]);
    }
};

Blockly.JavaScript['time_astro'] = function(block) {
    var type = block.getFieldValue('TYPE');

    return ['getAstroDate("' + type + '")', Blockly.JavaScript.ORDER_ATOMIC];
};