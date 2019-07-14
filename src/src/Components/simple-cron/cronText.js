import cronToText from './cron2text';
import JQUERY_CRON_LOCALE from './jquery.cron.locale';

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
    text = text.replace('Jede(r) Stunde',       'Jede Stunde');
    text = text.replace(/Jede\(r\) ([\d\sund,]+) Minute/, 'Jede $1 Minute');
    text = text.replace('Jede Sekunde in Minuten', 'Jede Sekunde in jeder Minute');

    return text;
}

function convertCronToText(cron, lang) {
    const withSeconds = cron.split(' ').length === 6;
    let text = cronToText(cron, withSeconds, JQUERY_CRON_LOCALE[lang] || JQUERY_CRON_LOCALE.en);
    return correctCasus(text, withSeconds);
}

export default convertCronToText;
