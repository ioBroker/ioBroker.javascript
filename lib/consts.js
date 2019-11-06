'use strict';
const dayOfWeeksFull         = {
    'en': ['Sunday',        'Monday',       'Tuesday',      'Wednesday',    'Thursday',     'Friday',   'Saturday'],
    'de': ['Sonntag',       'Montag',       'Dienstag',     'Mittwoch',     'Donnerstag',   'Freitag',  'Samstag'],
    'ru': ['Воскресенье',   'Понедельник',  'Вторник',      'Среда',        'Четверг',      'Пятница',  'Суббота'],
    'pt': ['Domingo',       'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
    'it': ['Domenica',      'Lunedì',       'Martedì',      'Mercoledì',    'Giovedì',      'Venerdì',  'Sabato'],
    'fr': ['Dimanche',      'Lundi',        'Mardi',        'Mercredi',     'Jeudi',        'Vendredi', 'Samedi'],
    'es': ['Domingo',       'Lunes',        'Martes',       'Miércoles',    'Jueves',       'Viernes',  'Sábado'],
    'nl': ['Zondag',        'Maandag',      'Dinsdag',      'Woensdag',     'Donderdag',    'Vrijdag',  'Zaterdag'],
    'pl': ['Niedziela',     'Poniedziałek', 'Wtorek',       'Środa',        'Czwartek',     'Piątek',   'Sobota'],
    'zh-cn': ['星期日',        '星期一',      '星期二',         '星期三',       '星期四',         '星期五',    '星期六'],
};
const dayOfWeeksShort        = {
    'en': ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    'de': ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
    'ru': ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
    'pt': ['Do', 'Se', 'Te', 'Qu', 'Qu', 'Se', 'Sá'],
    'it': ['Do', 'Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa'],
    'fr': ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'],
    'es': ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'],
    'nl': ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'],
    'pl': ['Ni', 'Po', 'Wt', 'Śr', 'Cz', 'Pi', 'So'],
    'zh-cn': ['星期日',  '星期一',      '星期二',         '星期三',       '星期四',         '星期五',    '星期六'],
};

const monthFull         = {
    'en': ['January', 'February', 'March', 'April',  'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    'de': ['Januar',  'Februar',  'März',  'April',  'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
    'ru': ['Январь',  'Февраль',  'Март',  'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь',  'Октябрь', 'Ноябрь',   'Декабрь'],
    'es': ['Enero',   'Febrero',  'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    'nl': ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'],
    'pl': ['Styczeń', 'Luty',     'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'],
    'pt': ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
    'fr': ['Janvier', 'Février',  'Mars',   'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
    'it': ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
    'zh-cn': ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
};
const monthFullGen      = {
    'en': ['January', 'February', 'March', 'April',  'May', 'June', 'July', 'August',  'September', 'October', 'November', 'December'],
    'de': ['Januar',  'Februar',  'März',  'April',  'Mai', 'Juni', 'Juli', 'August',  'September', 'Oktober', 'November', 'Dezember'],
    'ru': ['Января',  'Февраля',  'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября',  'Октября', 'Ноября',   'Декабря'],
    'es': ['Enero',   'Febrero',  'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    'nl': ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'],
    'pl': ['Styczeń', 'Luty',     'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'],
    'pt': ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
    'fr': ['Janvier', 'Février',  'Mars',   'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
    'it': ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
    'zh-cn': ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
};
const monthShort        = {
    'en': ['Jan', 'Feb',  'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'],
    'de': ['Jan', 'Feb',  'Mär', 'Apr', 'Mai', 'Jun',  'Jul',  'Aug', 'Sep',  'Okt', 'Nov', 'Dez'],
    'ru': ['Янв', 'Фев',  'Мар', 'Апр', 'Май', 'Июнь', 'Июль', 'Авг', 'Сен',  'Окт', 'Ноя', 'Дек'],
    'es': ['Ene', 'Feb',  'Mar', 'Abr', 'May', 'Jun',  'Jul',  'Ago', 'Sep',  'Oct', 'Nov', 'Dic'],
    'nl': ['Jan', 'Feb',  'Maa', 'Apr', 'Mei', 'Jun',  'Jul',  'Aug', 'Sep',  'Okt', 'Nov', 'Dec'],
    'pl': ['Sty', 'Lut',  'Mar', 'Kwi', 'Maj', 'Cze',  'Lip',  'Sie', 'Wrz',  'Paź', 'Lis', 'Gru'],
    'pt': ['Jan', 'Fev',  'Mar', 'Abr', 'Mai', 'Jun',  'Jul',  'Ago', 'Set',  'Out', 'Nov', 'Dez'],
    'fr': ['Jan', 'Fév',  'Mar', 'Avr', 'Mai', 'Jui',  'Jui',  'Aoû', 'Sep',  'Oct', 'Nov', 'Déc'],
    'it': ['Gen', 'Feb',  'Mar', 'Apr', 'Mag', 'Giu',  'Lug',  'Ago', 'Set',  'Ott', 'Nov', 'Dic'],
    'zh-cn': ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
};
const astroList    = ['sunrise', 'sunset', 'sunriseEnd', 'sunsetStart', 'dawn', 'dusk', 'nauticalDawn', 'nauticalDusk', 'nadir', 'nightEnd', 'night', 'goldenHourEnd', 'goldenHour'];
const astroListLow = astroList.map(str => str.toLowerCase());

module.exports = {
    dayOfWeeksFull,
    dayOfWeeksShort,
    monthFull,
    monthFullGen,
    monthShort,
    astroList,
    astroListLow
};
