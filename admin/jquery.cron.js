$.fn.cron = function(options, setValue) {
    var el = this;

    if (options === 'value') {
        if (setValue !== undefined) {
            $(el).find('.cron-input').val(setValue).trigger('change');
        } else {
            return $(el).find('.cron-input').val();
        }
        return this;
    }

    var words = {
        "Every %s seconds": {"en": "Every %s seconds",  "de": "Alle %s Sekunden",   "ru": "Каждые %s секунд(ы)"},
        "Clear":            {"en": "Clear",             "de": "Löschen",            "ru": "Clear"},
        "never":            {"en": "Never",             "de": "Nie",                "ru": "Никогда"},
        "Day of Month":     {"en": "Day of Month",      "de": "Monatstag",          "ru": "День месяца"},

        "Jan":              {"en": "Jan",               "de": "Jan",                "ru": "Янв"},
        "Feb":              {"en": "Feb",               "de": "Feb",                "ru": "Фев"},
        "March":            {"en": "March",             "de": "März",               "ru": "Март"},
        "April":            {"en": "April",             "de": "April",              "ru": "Апр"},
        "May":              {"en": "May",               "de": "Mai",                "ru": "Mай"},
        "June":             {"en": "June",              "de": "Juni",               "ru": "Июнь"},
        "July":             {"en": "July",              "de": "Juli",               "ru": "Июль"},
        "Aug":              {"en": "Aug",               "de": "Aug",                "ru": "Авг"},
        "Sept":             {"en": "Sept",              "de": "Sept",               "ru": "Сен"},
        "Oct":              {"en": "Oct",               "de": "Okt",                "ru": "Окт"},
        "Nov":              {"en": "Nov",               "de": "Nov",                "ru": "Ноя"},
        "Dec":              {"en": "Dec",               "de": "Dez",                "ru": "Дек"},

        "Sunday":           {"en": "Sunday",            "de": "Sonntag",            "ru": "Воскресение"},
        "Monday":           {"en": "Monday",            "de": "Montag",             "ru": "Понедельник"},
        "Tuesday":          {"en": "Tuesday",           "de": "Diesntag",           "ru": "Вторник"},
        "Wednesday":        {"en": "Wednesday",         "de": "Mittwoch",           "ru": "Среда"},
        "Thursday":         {"en": "Thursday",          "de": "Donnerstag",         "ru": "Четверг"},
        "Friday":           {"en": "Friday",            "de": "Freitag",            "ru": "Пятница"},
        "Saturday":         {"en": "Saturday",          "de": "Samstag",            "ru": "Суббота"},

        "Second":           {"en": "Second",            "de": "Sekunden",           "ru": "Секунды"},
        "Minute":           {"en": "Minute",            "de": "Minuten",            "ru": "Минуты"},
        "Hour":             {"en": "Hour",              "de": "Stunden",            "ru": "Часы"},
        "Month":            {"en": "Month",             "de": "Monate",             "ru": "Месяцы"},
        "Day of Week":      {"en": "Day of Week",       "de": "Wochentage",         "ru": "Дни недели"},

        "Use seconds:":     {"en": "Use seconds:",      "de": "Sekunden benutzen:", "ru": "Задействовать секунды:"},

        "Every n seconds":  {"en": "Every n seconds",   "de": "Alle N Sekunden","ru": "Каждые N секунд"},
        "Each selected second": {"en": "Each selected second", "de": "Jede ausgewählte Sekunde", "ru": "Каждую выбранную секунду"},
        "Every n minutes":  {"en": "Every n minutes",   "de": "Alle N Minuten", "ru": "Каждые N минут"},
        "Each selected minute": {"en": "Each selected minute", "de": "Jede ausgewählte Minute", "ru": "Каждую выбранную минуту"},
        "Every n hours":    {"en": "Every n Hours",     "de": "Alle N Stunden", "ru": "Каждые N часов"},
        "Each selected hour": {"en": "Each Selected Hour", "de": "Jede ausgewählte Stunde", "ru": "Каждый выбранный час"},

        "Each day":         {"en": "Each Day",          "de": "Jeden Tag",      "ru": "Каждый день"},
        "Each selected day": {"en": "Each selected Day", "de": "Jeden ausgewählten Tag", "ru": "Каждый выбранный день"},
        "Each month":       {"en": "Each Month",        "de": "Jeden Monat",    "ru": "Каждый месяц"},
        "Each selected month": {"en": "Each selected month", "de": "Jeden ausgewählten Monat", "ru": "Каждый выбранный месяц"},
        "Each week day":    {"en": "Each Week",         "de": "Jeden Wochentag",     "ru": "Каждую неделю"},
        "Each selected week day": {"en": "Each selected week day", "de": "Jeden ausgewählten Wochentag", "ru": "Каждый выбранный день недели"},

        "CRON Every second": {"en": "Every second",     "de": "Jede Sekunde",   "ru": "Каждую секунду"},
        "CRON Every minute": {"en": "Every minute",     "de": "Jede Minute",    "ru": "Каждую минуту"},
        "CRON Every hour":  {"en": "Every hour",        "de": "Jede Stunde",    "ru": "Каждый час"},
        "CRON Every day":   {"en": "Every day",         "de": "Jeden Tag",      "ru": "Каждый день"},
        "CRON Every month": {"en": "Every month",       "de": "Jeden Monat",    "ru": "Каждый месяц"},
        "CRON Every week day": {"en": "Every week day", "de": "Jeden Wochentag","ru": "Каждый день недели"},
        "CRON Every":       {"en": "Every",             "de": "Alle",           "ru": "Каждые"},
        "CRON second":      {"en": "second",            "de": "Sekunde",        "ru": "секунду"},
        "CRON seconds":     {"en": "seconds",           "de": "Sekunden",       "ru": "секунд(ы)"},
        "CRON minute":      {"en": "minute",            "de": "Minute",         "ru": "минуту"},
        "CRON minutes":     {"en": "minutes",           "de": "Minuten",        "ru": "минут(ы)"},
        "CRON hour":        {"en": "hour",              "de": "Stunde",         "ru": "час"},
        "CRON hours":       {"en": "hours",             "de": "Stunden",        "ru": "часа(ов)"},
        "CRON day":         {"en": "day",               "de": "Tag",            "ru": "день"},
        "CRON days":        {"en": "days",              "de": "Tage",           "ru": "дней"},
        "CRON month":       {"en": "month",             "de": "Monate",         "ru": "месяц"},
        "CRON months":      {"en": "months",            "de": "Monaten",        "ru": "месяца"}
    };
    var types = [
        'second',
        'minute',
        'hour',
        'day',
        'month',
        'week'
    ];

    var LOCALE = {};

    LOCALE.en = {
        ORDINALS: {
            th: 'th',
            st: 'st',
            nd: 'nd',
            rd: 'rd'
        },
        MONTH: [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec'
        ],
        DOW: [
            'Sun',
            'Mon',
            'Tue',
            'Wed',
            'Thu',
            'Fri',
            'Sat'
        ],
        'Every':            'Every', // start of expression
        'and':              'and', // 1, 2, 3 and 15th
        'every day':        'every day',
        'minute past the':  'minute past the',
        'hour':             'hour',
        'minute':           'minute',
        'minute of':        'minute of',
        'second':           'second',
        'second in minute': 'second in minute',
        'second of every':  'second of every',
        'minute every hour': 'minute every hour',
        'on the':           'on the',
        'of every month':   'of every month',
        'and every':        'and every',
        'At':               'At',
        'on':               'on', // on sun, mon
        'in':               'in' // in jan, apr
    };

    LOCALE.de = {
        ORDINALS: {
            th: '',
            st: '',
            nd: '',
            rd: ''
        },
        MONTH: [
            'Januar',
            'Februar',
            'März',
            'April',
            'Mai',
            'Juni',
            'Juli',
            'August',
            'September',
            'Oktober',
            'November',
            'Dezember'
        ],
        DOW: [
            'Sonntag',
            'Montag',
            'Dienstag',
            'Mittwoch',
            'Donnerstag',
            'Freitag',
            'Samstag'
        ],
        'Every':            'Jede(r)', // start of expression
        'and':              'und', // 1, 2, 3 and 15th
        'every day':        'jeden Tag',
        'minute past the':  'Minuten nach',
        'hour':             'Stunde',
        'minute':           'Minute',
        'minute of':        'Minuten von',
        'second':           'Sekunde',
        'second in minute': 'Sekunde in der Minute',
        'second of every':  'Sekunde in',
        'minute every hour': 'Minute jede Stunde',
        'on the':           'am',
        'of every month':   'im jeden Monat',
        'and every':        'und am jeden',
        'At':               'Um',
        'on':               'am', // on sun, mon
        'in':               'im' // in jan, apr
    };

    LOCALE.ru = {
        ORDINALS: {
            th: '',
            st: '',
            nd: '',
            rd: ''
        },
        MONTH: [
            'Январе',
            'Феврале',
            'Марте',
            'Апреле',
            'Майе',
            'Июне',
            'Июле',
            'Августе',
            'Сентябре',
            'Октябре',
            'Ноябре',
            'Декабре'
        ],
        DOW: [
            'воскресение',
            'понедельник',
            'вторник',
            'среду',
            'четверг',
            'пятницу',
            'субботу'
        ],
        'Every':            'Каждую(ый)', // start of expression
        'and':              'и', // 1, 2, 3 and 15th
        'every day':        'каждый день',
        'minute past the':  'минуту в',
        'hour':             'часа(ов)',
        'minute':           'минуту',
        'minute of':        'минут(у) в',
        'second':           'секунду',
        'second in minute': 'секунду в минуте',
        'second of every':  'секунду каждой(го)',
        'minute every hour': 'минуту каждый час',
        'on the':           '',
        'of every month':   'числа каждого месяца',
        'and every':        'и каждый',
        'At':               'В',
        'on':               'в', // on sun, mon
        'in':               'в' // in jan, apr
    };

    var everyText = [
        'Every %s seconds',
        'Every %s minutes',
        'Every %s hours',
        'Every %s days',
        'Every %s months'
    ];

    if (typeof systemDictionary !== 'undefined' && !systemDictionary['Every %s seconds']) {
        for (var w in words) {
            systemDictionary[w] = words[w];
        }
    }

    // Write the HTML template to the document
    $(el).html(tmpl);

    if (typeof translateAll !== 'undefined') translateAll();

    var cronArr;
    var updateInput = false;

    if (options && typeof options.value === 'string') {
        if (!options.value) {
            $(el).find('.cron-checkbox-seconds').prop('checked', false);
            cronArr = null;
        } else {
            cronArr = options.value.split(' ');
            if (cronArr.length === 5) {
                $(el).find('.cron-checkbox-seconds').prop('checked', false);
                cronArr.unshift('*');
            } else {
                $(el).find('.cron-checkbox-seconds').prop('checked', true);
            }
        }
    } else {
        cronArr = ['*', '*', '*', '*', '*', '*'];
        $(el).find('.cron-checkbox-seconds').prop('checked', false);
    }

    $(el).find('.cron-main-tab').tabs();

    $(el).find('.cron-tabs').tabs({
        activate: function (event, ui) {
            if ($(el).find('.cron-input').is(':focus') || updateInput) return;

            cronArr = cronArr || ['*', '*', '*', '*', '*', '*'];
            switch ($(ui.newTab).attr('id')) {

                // Seconds
                case 'cron-button-second-every':
                    cronArr[0] = '*';
                    break;
                case 'cron-button-second-n':
                    cronArr[0] = '*/' + $(el).find('.cron-tab-second .cron-slider').slider('value');
                    break;
                case 'cron-button-second-each':
                    cronArr[0] = '*';
                    $(el).find('.cron-tabs-second-format').html('');
                    drawEachSecond();
                    break;

                // Minutes
                case 'cron-button-minute-every':
                    cronArr[1] = '*';
                    break;
                case 'cron-button-minute-n':
                    cronArr[1] = '*/' + $(el).find('.cron-tab-minute .cron-slider').slider('value');
                    break;
                case 'cron-button-minute-each':
                    cronArr[1] = '*';
                    $(el).find('.cron-tabs-minute-format').html('');
                    drawEachMinute();
                    break;

                // Hours
                case 'cron-button-hour-every':
                    cronArr[2] = '*';
                    break;
                case 'cron-button-hour-n':
                    cronArr[2] = '*/' + $(el).find('.cron-tab-hour .cron-slider').slider('value');
                    break;
                case 'cron-button-hour-each':
                    cronArr[2] = '*';
                    $(el).find('.cron-tabs-hour-format').html('');
                    drawEachHour();
                    break;

                // Days
                case 'cron-button-day-every':
                    cronArr[3] = '*';
                    break;
                case 'cron-button-day-each':
                    cronArr[3] = '*';
                    $(el).find('.cron-tabs-day-format').html('');
                    drawEachDay();
                    break;

                // Months
                case 'cron-button-month-every':
                    cronArr[4] = '*';
                    break;
                case 'cron-button-month-each':
                    cronArr[4] = '*';
                    $(el).find('.cron-tabs-month-format').html('');
                    drawEachMonth();
                    break;

                // Weeks
                case 'cron-button-week-every':
                    cronArr[5] = '*';
                    break;
                case 'cron-button-week-each':
                    cronArr[5] = '*';
                    $(el).find('.cron-tabs-week-format').html('');
                    drawEachWeekday();
                    break;

            }

            drawCron();
        }
    });

    $(el).find('.cron-tab-second .cron-slider').slider({
        min: 1,
        max: 59,
        slide: function (event, ui) {
            processSlider(this, ui);
        }
    });

    $(el).find('.cron-tab-minute .cron-slider').slider({
        min: 1,
        max: 59,
        slide: function (event, ui) {
            processSlider(this, ui);
        }
    });

    $(el).find('.cron-tab-hour .cron-slider').slider({
        min: 1,
        max: 23,
        slide: function (event, ui) {
            processSlider(this, ui);
        }
    });

    $(el).find('.cron-checkbox-seconds').change(function () {
        if ($(this).prop('checked')) {
            $(el).find('.cron-main-tab').tabs('option', 'disabled', []);
            $(el).find('.cron-main-tab').tabs('option', 'active', 0);
        } else {
            $(el).find('.cron-main-tab').tabs('option', 'disabled', [0]);
            if ($(el).find('.cron-main-tab').tabs('option', 'active') === 0) {
                $(el).find('.cron-main-tab').tabs('option', 'active', 1);
            }
        }
        drawCron();
    });

    if (!$(el).find('.cron-checkbox-seconds').prop('checked')) {
        $(el).find('.cron-main-tab').tabs('option', 'disabled', [0]);
        if ($(el).find('.cron-main-tab').tabs('option', 'active') === 0) {
            $(el).find('.cron-main-tab').tabs('option', 'active', 1);
        }
    }

    $(el).find('.cron-input').change(function () {
        $(this).focus();
        cronArr = text2cron($(this).val());
        detectSettings($(this).val());
    }).keyup(function () {
        $(this).trigger('change');
    });

    function text2cron(value) {
        if (value === undefined) {
            value = $(el).find('.cron-input').val();
        }
        value = value.trim();
        if (!value) {
            $(el).find('.cron-checkbox-seconds').prop('checked', false);
            $(el).find('.cron-main-tab').tabs('option', 'disabled', [0]);
            return null;
        }

        var arr = value.split(' ');

        if (arr.length === 5) {
            arr.unshift('*');
            $(el).find('.cron-checkbox-seconds').prop('checked', false);
            $(el).find('.cron-main-tab').tabs('option', 'disabled', [0]);
            if ($(el).find('.cron-main-tab').tabs('option', 'active') === 0) {
                $(el).find('.cron-main-tab').tabs('option', 'active', 1);
            }
        } else {
            $(el).find('.cron-checkbox-seconds').prop('checked', true);
            $(el).find('.cron-main-tab').tabs('option', 'disabled', []);
        }

        return arr;
    }

    function cron2text(arr) {
        if (!arr) arr = cronArr;

        if (!arr) {
            return '';
        }

        arr = JSON.parse(JSON.stringify(arr || ['*', '*', '*', '*', '*', '*']));
        if (!$(el).find('.cron-checkbox-seconds').prop('checked')) {
            arr.shift();
        }
        for (var a = 0; a < arr.length; a++) {
            if (arr[a] === '*/1') arr[a] = '*';
        }

        return arr.join(' ');
    }

    function correctCasus(text, seconds) {
        text = text.replace('Каждую(ый) минуту',    'Каждую минуту');
        text = text.replace('Каждую(ый) минут(у)',  'Каждую минуту');
        text = text.replace('Каждую(ый) час',       'Каждый час');
        text = text.replace('Каждую(ый) секунду',   'Каждую секунду');
        text = text.replace(/ (\d{1,2}) числа/,     ' $1го числа');

        text = text.replace(/ (\d{1,2}) в Январе/,  ' $1го числа в Январе');
        text = text.replace(/ (\d{1,2}) в Феврале/, ' $1го числа в Феврале');
        text = text.replace(/ (\d{1,2}) в Марте/,   ' $1го числа в Марте');
        text = text.replace(/ (\d{1,2}) в Апреле/,  ' $1го числа в Апреле');
        text = text.replace(/ (\d{1,2}) в Майе/,    ' $1го числа в Майе');
        text = text.replace(/ (\d{1,2}) в Июне/,    ' $1го числа в Июне');
        text = text.replace(/ (\d{1,2}) в Июле/,    ' $1го числа в Июле');
        text = text.replace(/ (\d{1,2}) в Августе/,  ' $1го числа в Августе');
        text = text.replace(/ (\d{1,2}) в Сентябре/,  ' $1го числа в Сентябре');
        text = text.replace(/ (\d{1,2}) в Октябре/,  ' $1го числа в Октябре');
        text = text.replace(/ (\d{1,2}) в Ноябре/,  ' $1го числа в Ноябре');
        text = text.replace(/ (\d{1,2}) в Декабре/,  ' $1го числа в Декабре');

        text = text.replace('Каждую(ый) 0 минуту',   'Каждые ноль минут');
        text = text.replace(/Каждую\(ый\) ([\d\sи,]+) минуту/, 'Каждую $1 минуту');

        text = text.replace(/каждой\(го\) ([\d\sи,]+) минуту/, 'каждой $1 минуты');
        text = text.replace('каждой(го) минут(у)',  'каждой минуты');

        text = text.replace(' 0 часа(ов)',           ' 0 часов');
        text = text.replace(' 1 часа(ов)',           ' 1 час');
        text = text.replace(' 2 часа(ов)',           ' 2 часа');
        text = text.replace(' 3 часа(ов)',           ' 3 часа');
        text = text.replace(' 4 часа(ов)',           ' 4 часа');
        text = text.replace(/ (\d{1,2}) часа\(ов\)/, ' $1 часов');

        text = text.replace('Jede(r) Sekunde',      'Jede Sekunde');
        text = text.replace(/Jede\(r\) ([\d\sund,]+) Sekunde/, 'Jede $1 Sekunde');
        text = text.replace('Jede(r) Minute',       'Jede Minute');
        text = text.replace('Jede Minuten',         'Jede Minute');
        text = text.replace('Jede Stunde',          'Jede Stunde');
        text = text.replace('Jede(r) Stunde',       'Jede Stunde');
        text = text.replace(/Jede\(r\) ([\d\sund,]+) Minute/, 'Jede $1 Minute');
        text = text.replace('Jede Sekunde in Minuten', 'Jede Sekunde in jeder Minute');
        
        return text
    }

    function drawCron() {
        var newCron = cron2text();
        $(el).find('.cron-input').val(newCron);
        updateDescription(newCron);
    }

    function updateDescription(value) {
        if (!value) {
            $(el).find('.cron-text').html(_('never'));
            return;
        }
        var text = cronToText(value, $(el).find('.cron-checkbox-seconds').prop('checked'), LOCALE[systemLang]);

        text = correctCasus(text, $(el).find('.cron-checkbox-seconds').prop('checked') ? cronArr[0] : null);

        $(el).find('.cron-text').html(text);
    }

    function detectSettings(value) {
        updateInput = true;
        cronArr = text2cron(value);

        for (var c = 0; c < (cronArr ? cronArr.length : 6); c++) {
            detect(cronArr, c);
        }

        updateDescription(value);
        updateInput = false;
    }

    // 5-7,9-11 => 5,6,7,9,10,11
    function convertMinusIntoArray(value) {
        var parts = value.toString().split(',');
        for (var p = 0; p < parts.length; p++) {
            var items = parts[p].trim().split('-');
            if (items.length > 1) {
                parts[p] = [];
                for (var i = parseInt(items[0], 10); i <= parseInt(items[1], 10); i++) {
                    parts[p].push(i);
                }
                parts[p] = parts[p].join(',');
            }
        }
        var value = parts.join(',');
        var values = value.split(',');
        values.sort(function (a, b) {
            a = parseInt(a, 10);
            b = parseInt(b, 10);
            return a - b;
        });
        // remove double entries
        for (p = values.length - 1; p >= 0; p--) {
            if (values[p] === values[p + 1]) {
                values.splice(p + 1, 1);
            }
        }

        return values.join(',');
    }

    // 5,6,7,9,10,11 => 5-7,9-11
    function convertArrayIntoMinus(value) {
        value = convertMinusIntoArray(value);

        var parts = value.split(',');
        var newParts = [];
        var start = parts[0];
        var end   = parts[0];
        for (var p = 1; p < parts.length; p++) {
            if (parts[p] - 1 !== parseInt(parts[p - 1], 10)) {
                if (start === end) {
                    newParts.push(start)
                } else if (end - 1 == start) {
                    newParts.push(start + ',' + end);
                }else {
                    newParts.push(start + '-' + end);
                }
                start = parts[p];
                end   = parts[p];
            } else {
                end = parts[p];
            }
        }

        if (start === end) {
            newParts.push(start)
        } else if (end - 1 == start) {
            newParts.push(start + ',' + end);
        } else {
            newParts.push(start + '-' + end);
        }

        return newParts.join(',');
    }

    function detect(values, index) {
        var $tab = $(el).find('.cron-tab-' + types[index]);

        if (!values) {
            if ($tab.find('.cron-tabs').tabs('option', 'active') != 0) {
                $tab.find('.cron-tabs').tabs('option', 'active', 0);
                changed = true;
            }
            return;
        }

        values[index] = values[index] || '*';
        var changed = true;

        if (values[index].indexOf('/') !== -1) {
            var parts_ = values[index].split('/');
            var value  = parseInt(parts_[1], 10) || 1;
            if ($tab.find('.cron-slider').slider('value') != value) {
                $tab.find('.cron-slider').slider('value', parseInt(parts_[1], 10) || 1);
                changed = true;
            }
            if ($tab.find('.cron-tabs').tabs('option', 'active') != 1) {
                $tab.find('.cron-tabs').tabs('option', 'active', 1);
                changed = true;
            }
            $tab.find('.cron-preview-every').html(_(everyText[index], parseInt(parts_[1], 10) || 1));
        } else if (values[index].indexOf('*') !== -1) {
            if ($tab.find('.cron-tabs').tabs('option', 'active') != 0) {
                $tab.find('.cron-tabs').tabs('option', 'active', 0);
                changed = true;
            }
        } else {
            var parts = convertMinusIntoArray(values[index]).split(',');
            if ($tab.find('.cron-tabs li').length === 3) {
                if ($tab.find('.cron-tabs').tabs('option', 'active') != 2) {
                    $tab.find('.cron-tabs').tabs('option', 'active', 2);
                    changed = true;
                }
            } else {
                if ($tab.find('.cron-tabs').tabs('option', 'active') != 1) {
                    $tab.find('.cron-tabs').tabs('option', 'active', 1);
                    changed = true;
                }
            }
            var selected = false;

            $tab.find('.cron-tabs-format input[type="checkbox"]').each(function () {
                var index = $(this).data('index').toString();
                var value = parts.indexOf(index) !== -1;
                if (value != $(this).prop('checked')) {
                    $(this).prop('checked', parts.indexOf(index) !== -1);
                    $(this).button('refresh');
                    changed = true;
                }
                if (value) selected = true;
            });

            if (!selected) {
                if ($tab.find('.cron-tabs').tabs('option', 'active') != 0) {
                    $tab.find('.cron-tabs').tabs('option', 'active', 0);
                    changed = true;
                }
            }
            if (changed) $(el).find('.cron-main-tab').tabs('option', 'active', index);
        }
    }

    function processSlider(elem, ui) {
        var arg = $(elem).data('arg');
        cronArr[arg] = '*/' + ui.value;
        $(el).find('.cron-tab-' + types[arg] + ' .cron-preview-every').html(ui.value === 1 ? _('CRON Every ' + types[arg]) : _('CRON Every') + ' ' + ui.value + ' ' + _('CRON ' + types[arg] + 's'));
        drawCron();
    }

    function processEachChange(elem) {
        var newItem = $(elem).data('index').toString();
        var arg     = $(elem).data('arg');

        if (!cronArr) cronArr = ['*', '*', '*', '*', '*', '*'];

        if (cronArr[arg] === '*') {
            cronArr[arg] = newItem;
        } else {
            // if value already in list, toggle it off
            var list = convertMinusIntoArray(cronArr[arg]).split(',');
            if (list.indexOf(newItem) !== -1) {
                list.splice(list.indexOf(newItem), 1);
                cronArr[arg] = list.join(',');
            } else {
                // else toggle it on
                cronArr[arg] = cronArr[arg] + ',' + newItem;
            }
            cronArr[arg] = convertArrayIntoMinus(cronArr[arg]);
            if(cronArr[arg] === '') cronArr[arg] = '*';
        }
        drawCron();
    }

    function padded(val) {
        if (typeof val === 'string' && val.length === 1) {
            val = '0' + val;
        } else if (val < 10) {
            val = '0' + val;
        } else {
            val = val.toString();
        }
        return val;
    }

    function draw(type, drawFunc) {
        var $format = $(el).find('.cron-tab-' + type + ' .cron-tabs-format');
        $format.html(drawFunc());

        $format.find('input').button();
        $format.buttonset();

        $format.find('input[type="checkbox"]').click(function () {
            processEachChange(this);
        });
    }

    function drawEachSecond() {
        draw('second', function () {
            var text = '';
            // seconds
            for (var i = 0; i < 60; i++) {
                text += '<input type="checkbox" id="cron-second-check' + i + '" data-index="' + i + '" data-arg="0"><label for="cron-second-check' + i + '">' + padded(i) + '</label>';
                if (i !== 0 && ((i + 1) % 10 === 0)) text += '<br/>';
            }
            return text;
        });
    }

    function drawEachMinute () {
        draw('minute', function () {
            var text = '';
            // minutes
            for (var i = 0; i < 60; i++) {
                var padded = i;
                if (padded < 10) padded = '0' + padded;

                text += '<input type="checkbox" id="cron-minute-check' + i + '" data-index="' + i + '" data-arg="1"><label for="cron-minute-check' + i + '">' + padded + '</label>';
                if (i !== 0 && (((i + 1) % 10) === 0)) text += '<br/>';
            }
            return text;
        });
    }

    function drawEachHour() {
        draw('hour', function () {
            var text = '';
            // hours
            for (var i = 0; i < 24; i++) {
                var padded = i;
                if (padded < 10) padded = '0' + padded;

                text += '<input type="checkbox" id="cron-hour-check' + i + '" data-index="' + i + '" data-arg="2"><label for="cron-hour-check' + i + '">' + padded + '</label>';
                if (i !== 0 && (((i + 1) % 12) === 0)) text += '<br/>';
            }
            return text;
        });
    }

    function drawEachDay () {
        draw('day', function () {
            var text = '';
            // days
            for (var i = 1; i < 32; i++) {
                var padded = i;
                if (padded < 10) padded = '0' + padded;

                text += '<input type="checkbox" id="cron-day-check' + i + '" data-index="' + i + '" data-arg="3"><label for="cron-day-check' + i + '">' + padded + '</label>';
                if (i !== 0 && ((i % 7) === 0)) text += '<br/>';
            }
            return text;
        });
    }
    
    function drawEachMonth () {
        draw('month', function () {
            var text = '';
            // months
            var months = ['Jan', 'Feb', 'March', 'April', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

            for (var i = 0; i < months.length; i++) {
                text += '<input type="checkbox" id="cron-month-check' + (i + 1) + '" data-index="' + (i + 1) + '" data-arg="4"><label for="cron-month-check' + (i + 1) + '">' + _(months[i]) + '</label>';
            }
            return text;
        });
    }

    function drawEachWeekday () {
        draw('week', function () {
            var text = '';
            // weeks
            var days = [
                {id: 1, name: 'Monday'},
                {id: 2, name: 'Tuesday'},
                {id: 3, name: 'Wednesday'},
                {id: 4, name: 'Thursday'},
                {id: 5, name: 'Friday'},
                {id: 6, name: 'Saturday'},
                {id: 0, name: 'Sunday'}
            ];

            for (var i = 0; i < days.length; i++) {
                text += '<input type="checkbox" id="cron-week-check' + days[i].id + '" data-index="' + days[i].id + '" data-arg="5"><label for="cron-week-check' + days[i].id + '">' + _(days[i].name) + '</label>';
            }
            return text;
        });
    }

    drawEachSecond();
    drawEachMinute();
    drawEachHour();
    drawEachDay();
    drawEachMonth();
    drawEachWeekday();
    drawCron();
};

// HTML Template for plugin
var tmpl = '<input type="text" class="cron-input" value="* * * * * *" size="80"/>\
<br/>\
<div class="cron-text"></div><br>\
<div><span class="translate">Use seconds:</span><input type="checkbox" class="cron-checkbox-seconds"></div>\
<div class="cron-main-tab">\
  <ul>\
    <li><a href="#cron-tabs-second"  class="translate">Second</a></li>\
    <li><a href="#cron-tabs-minute"  class="translate">Minute</a></li>\
    <li><a href="#cron-tabs-hour"    class="translate">Hour</a></li>\
    <li><a href="#cron-tabs-day"     class="translate">Day of Month</a></li>\
    <li><a href="#cron-tabs-month"   class="translate">Month</a></li>\
    <li><a href="#cron-tabs-week"    class="translate">Day of Week</a></li>\
  </ul>\
  <div id="cron-tabs-second" class="cron-tab-page cron-tab-second">\
    <div class="cron-tabs">\
      <ul>\
        <li id="cron-button-second-every"><a href="#cron-tabs-second-every" class="translate">CRON Every second</a></li>\
        <li id="cron-button-second-n"><a href="#cron-tabs-second-n" class="translate">Every n seconds</a></li>\
        <li id="cron-button-second-each"><a href="#cron-tabs-second-each" class="translate">Each selected second</a></li>\
      </ul>\
      <div id="cron-tabs-second-every" class="cron-preview">\
        <div>*</div>\
        <div class="translate">CRON Every second</div>\
      </div>\
      <div id="cron-tabs-second-n">\
        <div class="cron-preview-every translate">CRON Every second</div>\
        <div class="cron-slider" data-arg="0"></div>\
      </div>\
      <div id="cron-tabs-second-each" class="cron-preview-n">\
        <div class="translate">Each selected second</div><br/>\
        <div class="cron-tabs-format"></div>\
      </div>\
    </div>\
  </div>\
  <div id="cron-tabs-minute" class="cron-tab-page cron-tab-minute">\
    <div class="cron-tabs">\
      <ul>\
        <li id="cron-button-minute-every"><a href="#cron-tabs-minute-every" class="translate">CRON Every minute</a></li>\
        <li id="cron-button-minute-n"><a href="#cron-tabs-minute-n" class="translate">Every n minutes</a></li>\
        <li id="cron-button-minute-each"><a href="#cron-tabs-minute-each" class="translate">Each selected minute</a></li>\
      </ul>\
      <div id="cron-tabs-minute-every" class="cron-preview">\
        <div>*</div>\
        <div class="translate">CRON Every minute</div>\
      </div>\
      <div id="cron-tabs-minute-n">\
        <div class="cron-preview-every translate">CRON Every minute</div>\
        <div class="cron-slider" data-arg="1"></div>\
      </div>\
      <div id="cron-tabs-minute-each" class="cron-preview-n">\
        <div class="translate">Each selected minute</div><br/>\
        <div class="cron-tabs-format"></div>\
      </div>\
    </div>\
  </div>\
  <div id="cron-tabs-hour" class="cron-tab-page cron-tab-hour">\
    <div class="cron-tabs">\
      <ul>\
        <li id="cron-button-hour-every"><a href="#cron-tabs-hour-every" class="translate">CRON Every hour</a></li>\
        <li id="cron-button-hour-n"><a href="#cron-tabs-hour-n" class="translate">Every n hours</a></li>\
        <li id="cron-button-hour-each"><a href="#cron-tabs-hour-each" class="translate">Each selected hour</a></li>\
      </ul>\
      <div id="cron-tabs-hour-every" class="cron-preview">\
        <div>*</div>\
        <div class="translate">CRON Every hour</div>\
      </div>\
      <div id="cron-tabs-hour-n">\
        <div class="cron-preview-every translate">CRON Every hour</div>\
        <div class="cron-slider" data-arg="2"></div>\
      </div>\
      <div id="cron-tabs-hour-each" class="cron-preview-n">\
        <div class="translate">Each selected hour</div><br/>\
        <div class="cron-tabs-format"></div>\
      </div>\
    </div>\
  </div>\
  <div id="cron-tabs-day" class="cron-tab-page cron-tab-day">\
    <div class="cron-tabs">\
      <ul>\
        <li id="cron-button-day-every"><a href="#cron-tabs-day-every" class="translate">CRON Every day</a></li>\
        <li id="cron-button-day-each"><a href="#cron-tabs-day-each" class="translate">Each selected day</a></li>\
      </ul>\
      <div id="cron-tabs-day-every" class="cron-preview">\
        <div>*</div>\
        <div class="translate">CRON Every day</div>\
      </div>\
      <div id="cron-tabs-day-each" class="cron-preview-n">\
        <div class="translate">Each selected day</div><br/>\
        <div class="cron-tabs-format"></div>\
      </div>\
    </div>\
  </div>\
  <div id="cron-tabs-month" class="cron-tab-page cron-tab-month">\
    <div class="cron-tabs">\
      <ul>\
        <li id="cron-button-month-every"><a href="#cron-tabs-month-every" class="translate">CRON Every month</a></li>\
        <li id="cron-button-month-each"><a href="#cron-tabs-month-each" class="translate">Each selected month</a></li>\
      </ul>\
      <div id="cron-tabs-month-every" class="cron-preview">\
        <div>*</div>\
        <div class="translate">CRON Every month</div>\
      </div>\
      <div id="cron-tabs-month-each" class="cron-preview-n">\
        <div class="translate">Each selected month</div><br/>\
        <div class="cron-tabs-format"></div>\
      </div>\
    </div>\
  </div>\
  <div id="cron-tabs-week" class="cron-tab-page cron-tab-week">\
    <div class="cron-tabs">\
      <ul>\
        <li id="cron-button-week-every"><a href="#cron-tabs-week-every" class="translate">CRON Every week day</a></li>\
        <li id="cron-button-week-each"><a href="#cron-tabs-week-each" class="translate">Each selected week day</a></li>\
      </ul>\
      <div id="cron-tabs-week-every" class="cron-preview">\
        <div>*</div>\
        <div class="translate">CRON Every week day</div>\
      </div>\
      <div id="cron-tabs-week-each" class="cron-preview-n">\
        <div class="translate">Each selected week day</div><br/>\
        <div class="cron-tabs-format"></div>\
      </div>\
    </div>\
  </div>\
</div>';