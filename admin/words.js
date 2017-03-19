/*global systemDictionary:true */
'use strict';

systemDictionary = {
    "name":                 {"en": "name",                  "de": "Name",                   "ru": "Имя"},
    "engine type":          {"en": "engine type",           "de": "Enginetyp",              "ru": "Тип движка"},
    "Insert ID":            {"en": "Insert&nbsp;ID",             "de": "ID&nbsp;einfügen",            "ru": "Вставить&nbsp;ID"},
    "Ok":                   {"en": "Ok",                    "de": "Ok",                     "ru": "Ok"},
    "Cron":                 {"en": "Cron",                  "de": "Cron",                   "ru": "Cron"},
    "Cron expression":      {"en": "Cron expression",       "de": "Cron-Ausdruck",          "ru": "Cron-Выражение"},
    "Cancel":               {"en": "Cancel",                "de": "Abbrechen",              "ru": "Отмена"},
    "enabled":              {"en": "enabled",               "de": "Aktiviert",              "ru": "активно"},
    "engine":               {"en": "engine",                "de": "Ausführen mit",          "ru": "Движок"},
    "true":                 {"en": "true",                  "de": "ja",                     "ru": "да"},
    "false":                {"en": "false",                 "de": "nein",                   "ru": "нет"},
    "Insert":               {"en": "Insert",                "de": "Einfügen",               "ru": "Вставить"},
    "Minutes Past the Hour": {"en": "Minutes Past the Hour", "de": "Minuten nach voller Stunde", "ru": "минут после полного часа"},
    "Time: Hour":           {"en": "Time: Hour",            "de": "Zeit: Stunde",           "ru": "Время: Час"},
    "Day of Month":         {"en": "Day of Month",          "de": "Tag im Monat",           "ru": "День месяца"},
    "Time: Minute":         {"en": "Time: Minute",          "de": "Zeit: Minute",           "ru": "Время: Минуты"},
    "copy":                 {"en": "copy",                  "de": "kopieren",               "ru": "копировать"},
    "Every":                {"en": "Every",                 "de": "Jede(n)",                "ru": "Каждую(ый)"},
    "on the":               {"en": "on the",                "de": "am",                     "ru": " "},
    "on":                   {"en": "on",                    "de": "am",                     "ru": " "},
    "at":                   {"en": "at",                    "de": "um",                     "ru": "в"},
    "of":                   {"en": "of",                    "de": "",                       "ru": " "},
    "Scripts":              {"en": "Scripts",               "de": "Skripte",                "ru": "Скрипты"},
    "delete script":        {"en": "delete script",         "de": "Skript löschen",         "ru": "Удалить скрипт"},
    "edit script":          {"en": "edit script",           "de": "Skript bearbeiten",      "ru": "Редактироветь скрипт"},
    "new script":           {"en": "new script",            "de": "Neues Skript",           "ru": "Новый скрипт"},
    "edit file":            {"en": "edit file",             "de": "Datei editieren",        "ru": "Редактировать"},
    "restart script":       {"en": "restart script",        "de": "Skript neustarten",      "ru": "Перезапустить скрипт"},
    "Save":                 {"en": "Save",                  "de": "Speichern",              "ru": "Сохранить"},
    "edit":                 {"en": "edit",                  "de": "ändern",                 "ru": "редактировать"},
    "delete":               {"en": "delete",                "de": "löschen",                "ru": "удалить"},
    "ok":                   {"en": "Ok",                    "de": "Ok",                     "ru": "Ok"},
    "cancel":               {"en": "Cancel",                "de": "Abbrechen",              "ru": "отменить"},
    "global":               {"en": "global",                "de": "Global",                 "ru": "глобальный"},
    "Show code":            {"en": "Show code",             "de": "Zeige Code",             "ru": "Показать код"},
    "Show blockly":         {"en": "Show Blockly",          "de": "Zeige Blockly",          "ru": "Показать Blockly"},
    "Set CRON":             {"en": "Set",                   "de": "Übernehmen",             "ru": "Перенять"},
    "debug":                {"en": "Debug",                 "de": "Debug",                  "ru": "Debug"},
    "verbose":              {"en": "Verbose",               "de": "Hilfe-Ausgaben",         "ru": "Вывод отладки"},
    "debug_help": {
        "en": "setState, writeFile will be disabled",
        "de": "setState, writeFile werden deaktiviert",
        "ru": "setState, writeFile будут отключены"
    },
    "verbose_help": {
        "en": "Output of additional information for some functions.",
        "de": "Macht zusätzliche Ausgaben für einige Funktionen.",
        "ru": "Вывод дополнительной информации в лог для некоторых функций."
    },
    "months":               {
        "en": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        "de": ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
        "ru": ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"]
    },
    "daysofweek":           {
        "en": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        "de": ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
        "ru": ["Воскресение", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"]
    },
    "periods":              {
        "en": ["minute", "hour", "day", "week", "month", "year"],
        "de": ["Minute", "Stunde", "Tag", "Woche", "Monat", "Jahr"],
        "ru": ["минуту", "час", "день", "неделю", "месяц", "год"]
    },
    "daysofmonth":          {
        "en": [  '0th',  '1st',  '2nd',  '3rd',  '4th',  '5th',  '6th',  '7th',  '8th',  '9th',
                '10th', '11th', '12th', '13th', '14th', '15th', '16th', '17th', '18th', '19th',
                '20th', '21st', '22nd', '23rd', '24th', '25th', '26ht', '27th', '28ht', '29ht',
                '30th', '31st'],
        "de": [  '0en',  '1en',  '2en',  '3en',  '4en',  '5en',  '6en',  '7en',  '8en',  '9en',
                '10en', '11en', '12en', '13en', '14en', '15en', '16en', '17en', '18en', '19en',
                '20en', '21en', '22en', '23en', '24en', '25en', '26en', '27en', '28en', '29en',
                '30en', '31en'],
        "ru": [  '0',   '1го',   '2го',  '3го',  '4го',  '5го',  '6го',  '7го',  '8го',  '9го',
                '10го', '11го', '12го', '13го', '14го', '15го', '16го', '17го', '18го', '19го',
                '20го', '21го', '22го', '23го', '24го', '25го', '26го', '27го', '28го', '29го',
                '30го', '31го']
    },
    "Name":                 {"en": "Name",                  "de": "Name",                   "ru": "Имя"},
    "Select ID":            {"en": "Select&nbsp;ID",        "de": "ID&nbsp;auswählen",      "ru": "Выбрать&nbsp;ID"},
    "Select":               {"en": "Select",                "de": "Auswählen",              "ru": "Выбрать"},
    "All":                  {"en": "All",                   "de": "Alle",                   "ru": "все"},
    "ID":                   {"en": "ID",                    "de": "ID",                     "ru": "ID"},
    "Role":                 {"en": "Role",                  "de": "Rolle",                  "ru": "Роль"},
    "Room":                 {"en": "Room",                  "de": "Raum",                   "ru": "Комната"},
    "Value":                {"en": "Value",                 "de": "Wert",                   "ru": "Значение"},
    "From":                 {"en": "From: ",                "de": "Von",                    "ru": "От"},
    "Last changed":         {"en": "Last changed",          "de": "Letzte Änderung",        "ru": "Изменён"},
    "Time stamp":           {"en": "Time stamp",            "de": "Zeitstempel",            "ru": "Время"},
    "Acknowledged":         {"en": "Acknowledged",          "de": "Bestätigt",              "ru": "Подтверждён"},
    "Processing...":        {"en": "Processing...",         "de": "Verarbeite...",          "ru": "Обработка..."},
    "Loading...":           {"en": "Processing...",         "de": "Verarbeite...",          "ru": "Обработка..."},
    "Log":                  {"en": "Log",                   "de": "Log",                    "ru": "Лог"},
    "new group name":       {"en": "New group name:",       "de": "Neuer Gruppenname",      "ru": "Имя новой группы"},
    "Create new group":     {"en": "Create new group",      "de": "Neuer Gruppe erzeugen",  "ru": "Создать новую группу"},
    "Create in:":           {"en": "Create in:",            "de": "Erzeugen in:",           "ru": "Создать в группе:"},
    "Clear output":         {"en": "Clear output",          "de": "Fenster löschen",        "ru": "Очистить выврд"},
    "Scroll down":          {"en": "Scroll down",           "de": "Nach unten scrollen",    "ru": "Вниз"},
    "no group":             {"en": "NO GROUP",              "de": "KEINE GRUPPE",           "ru": "В корне"},
    "common":               {"en": "Common",                "de": "Allgemein",              "ru": "Общие"},
    "Script":               {"en": "Script",                "de": "Skript",                 "ru": "Скрипт"},
    "Type":                 {"en": "Type",                  "de": "Typ",                    "ru": "Тип"},
    "Edit":                 {"en": "Edit",                  "de": "Editieren",              "ru": "Редактировать"},
    "Members":              {"en": "Members",               "de": "Mitglieder",             "ru": "Members"},
    "New script":           {"en": "New script",            "de": "Neues Skript",           "ru": "Новый скрипт"},
    "New group":            {"en": "New group",             "de": "Neue Gruppe",            "ru": "Новая группа"},
    "Message":              {"en": "Message",               "de": "Meldung",                "ru": "Сообщение"},
    "Script not saved":     {"en": "Script not saved!",      "de": "Skript ist nicht gespeichert!", "ru": "Скрипт не сохранён!"},
    "Save?":                {"en": "Save?",                 "de": "Speichern?",             "ru": "Сохранить?"},
    "Discard":              {"en": "Discard",               "de": "Nicht speichern",        "ru": "Не сохранять"},
    "Instance":             {"en": "Instance",              "de": "Wird ausgeführt von ",   "ru": "Выполняется в "},
    "Wrap&nbsp;lines":      {"en": "Wrap&nbsp;lines",       "de": "Zeilenumbruch",          "ru": "Перенос&nbsp;строк"},
    "Drop the files here":  {"en": "Drop the files here",   "de": "Hier hinzufügen",        "ru": "Добавить..."},
    "Clear":                {"en": "Clear",                 "de": "Löschen",                "ru": "Сбросить"},
    "scripts_group":        {"en": "Scripts",               "de": "Skripte",                "ru": "Скрипты"},
    "Edit script":          {"en": "Edit script",           "de": "Skript editieren",       "ru": "Редактировать скрипт"},
    "Script changes are not saved. Discard?": {
        "en": "Script changes are not saved. Discard?",
        "de": "Änderungen sind nicht gespeichert. Verwerfen?",
        "ru": "Изменения не сохранены. Игнорировать?"
    },
    "Convert to Blockly":   {
        "en": "Looks like it is a blockly script. Convert to Blockly?",
        "de": "Sieht wie ein Blockly Skript aus. Zu Blockly konvertieren?",
        "ru": "Похоже, что это Blockly скрипт. Поменять тип на Blockly?"
    },
    "Convert?":   {
        "en": "Convert?",
        "de": "Konvertieren?",
        "ru": "Поменять тип на Blockly?"
    },
    "Check blocks":         {"en": "Check blocks",          "de": "Blöcke prüfen",          "ru": "Проверить блоки"},
    "not properly connected": {
        "en": "This block is not properly connected to other blocks.",
        "de": "Dieser Block ist mit Anderen nicht richtig verbunden.",
        "ru": "Этот блок неправильно соединён или не соединён с другими блоками"
    },
    "Error":                {"en": "Error",                 "de": "Fehler",                 "ru": "Ошибка"},
    "no blocks found": {
        "en": "No blocks found",
        "de": "Keine Blöcke gefunden",
        "ru": "Блоков нет"
    },
    "warning on this block": {
        "en": "Please fix the warning on this block.", 
        "de": "Bitte die Warnung an diesem Block korrigieren.",
        "ru": "Исправте проблему с этим блоком"
    },
    "Invalid file extenstion!": {
        "en": "Invalid file extenstion!", 
        "de": "Invalide Dateinameserweiterung!", 
        "ru": "Неправильный тип файла!"
    },
    "You cannot go back!": {
        "en": "You cannot switch back to Blockly after this operation. Are you sure? (Use 'Show code' button to check the generated code)",
        "de": "Nach diesem Vorgang ist es nicht möglich zurück auf Blockly zu schalten. Sind Sie sich sicher? (Benutze 'Zeige Code'-Button um Code zu prüfen)",
        "ru": "Нельзя поменять тип скрипта обратно на Blockly. Вы уверены? (Используйте кнопку 'Показать код', что бы проверить код)"
    },
    "Drop files here or click to select one": {
        "en": "Drop files here or click to select one...",
        "de": "Dateien hereinziehen oder klicken um eine auszuwählen...",
        "ru": "Перетащите файл сюда или нажмите, что бы выбрать..."
    },
    "Do you want to save script %s?": {
        "en": "Do you want to save script %s?",
        "de": "Erst speichern %s?",
        "ru": "Прежде чем запустить, сохранить %s?"
    },
    "bytes":                {"en": "bytes",                 "de": "Bytes",                  "ru": "байт"},
    "Kb":                   {"en": "Kb",                    "de": "Kb",                     "ru": "Кб"},
    "Mb":                   {"en": "Kb",                    "de": "Mb",                     "ru": "Мб"},
    "Existing scripts will be overwritten. Are you sure?": {
        "en": "Existing scripts will be overwritten. Are you sure?",
        "de": "Aktuelle Skripte werden überschrieben. Sicher?",
        "ru": "Существующие скрипты будут переписаны. Вы уверены?"
    },
    "import&nbsp;scripts":  {"en": "Import&nbsp;scripts",   "de": "Skriptimport",           "ru": "Импортировать&nbsp;скрипты"},
    "import scripts":       {"en": "Import scripts",        "de": "Skriptimport",           "ru": "Импортировать скрипты"},
    "Export":               {"en": "Export all scripts",    "de": "Export von allen Skripten", "ru": "Экспорт всех скриптов"},
    "Import":               {"en": "Import all scripts",    "de": "Import von allen Skripten", "ru": "Импорт всех скриптов"},
    "Export blocks":        {"en": "Export blocks",         "de": "Blöcke exportieren",     "ru": "Экспорт блоков"},
    "Import blocks":        {"en": "Import blocks",         "de": "Blöcke importieren",     "ru": "Импорт блоков"},
    "Import selected blocks": {"en": "Import of blocks",    "de": "Import von Blöcken",     "ru": "Импорт блоков"},
    "Export selected blocks": {"en": "Export selected blocks", "de": "Export ausgewählter Blöcke", "ru": "Экспорт выбранных блоков"},
    "global_hint":          {"en": "Global script! (click here for help)", "de": "Globales Skript (klicke hier für Hilfe)", "ru": "Глобальный скрипт (описание)"},
    "Deactivated. Click to start.": {
        "en": "Deactivated. Click to start.",
        "de": "Deaktiviert. Klicken zum Starten.",
        "ru": "Неактивно. Нажать для старта."
    },
    "Activated. Click to stop.": {
        "en": "Activated. Click to stop.",
        "de": "Aktiviert. Klicken zum Stoppen.",
        "ru": "Активно. Нажать для старта."
    },
    "Object %s yet exists": {
        "en": 'Object <span style="color: red">"%s"</span> already exists',
        "de": 'Objekt <span style="color: red">"%s"</span> existiert bereits',
        "ru": 'Объект <span style="color: red">"%s"</span> уже существует'
    },
    'Are you sure to delete group <span style="color: blue">%s</span> and <span style="color: red">all</span> scripts in it?': {
        "en": 'Are you sure to delete group <span style="color: blue">%s</span> and <span style="color: red">all</span> scripts in it?',
        "de": 'Soll die Gruppe <span style="color: blue">%s</span> und <span style="color: red">alle</span> enthaltenen Skripte wirklich gelöscht werden?',
        "ru": 'Are you sure to delete group <span style="color: blue">%s</span> and <span style="color: red">all</span> scripts in it?'
    },
    "Are you sure to delete script %s?": {
        "en": 'Are you sure to delete script <span style="color: blue">%s</span>?',
        "de": 'Soll das Skript <span style="color: blue">%s</span> wirklich gelöscht werden?',
        "ru": 'Вы точно хотите удалить скрипт <span style="color: blue">%s</span>?'
    }
};
