'use strict';
const dayOfWeeksFull         = {
    'en': ['Sunday',        'Monday',  'Tuesday',   'Wednesday',    'Thursday',     'Friday',  'Saturday'],
    'de': ['Sonntag',       'Montag',  'Dienstag',  'Mittwoch',     'Donnerstag',   'Freitag', 'Samstag'],
    'ru': ['Воскресенье',   'Понедельник', 'Вторник', 'Среда',      'Четверг',      'Пятница', 'Суббота']
};
const dayOfWeeksShort        = {
    'en': ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    'de': ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
    'ru': ['Вс', 'По', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
};

const monthFull         = {
    'en': ['January', 'February', 'March', 'April',  'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    'de': ['Januar',  'Februar',  'März',  'April',  'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
    'ru': ['Январь',  'Февраль',  'Март',  'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь',  'Октябрь', 'Ноябрь',   'Декабрь']
};
const monthFullGen      = {
    'en': ['January', 'February', 'March', 'April',  'May', 'June', 'July', 'August',  'September', 'October', 'November', 'December'],
    'de': ['Januar',  'Februar',  'März',  'April',  'Mai', 'Juni', 'Juli', 'August',  'September', 'Oktober', 'November', 'Dezember'],
    'ru': ['Января',  'Февраля',  'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября',  'Октября', 'Ноября',   'Декабря']
};
const monthShort        = {
    'en': ['Jan', 'Feb',  'Mar',  'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'],
    'de': ['Jan', 'Feb',  'Mär',  'Apr', 'Mai', 'Jun',  'Jul',  'Aug', 'Sep',  'Okt', 'Nov', 'Dez'],
    'ru': ['Янв',  'Фев', 'Март', 'Апр', 'Май', 'Июнь', 'Июль', 'Авг', 'Сен',  'Окт', 'Ноя', 'Дек']
};
const astroList    = ['sunrise', 'sunset', 'sunriseEnd', 'sunsetStart', 'dawn', 'dusk', 'nauticalDawn', 'nauticalDusk', 'nightEnd', 'night', 'goldenHourEnd', 'goldenHour'];
const astroListLow = ['sunrise', 'sunset', 'sunriseend', 'sunsetstart', 'dawn', 'dusk', 'nauticaldawn', 'nauticaldusk', 'nightend', 'night', 'goldenhourend', 'goldenhour'];

module.exports = {
    dayOfWeeksFull,
    dayOfWeeksShort,
    monthFull,
    monthFullGen,
    monthShort,
    astroList,
    astroListLow
};