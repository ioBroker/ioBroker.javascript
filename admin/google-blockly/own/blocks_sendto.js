'use strict';

goog.provide('Blockly.JavaScript.Sendto');

goog.require('Blockly.JavaScript');

Blockly.CustomBlocks = Blockly.CustomBlocks || [];
Blockly.CustomBlocks.push('Sendto');

Blockly.Sendto = {
    HUE: 310,
    blocks: {}
};

Blockly.Words['Sendto'] = {'en': 'Sendto', 'de': 'Sendto', 'ru': 'Sendto'};
Blockly.Words['sendto_message'] = {'en': 'message', 'de': 'Meldung', 'ru': 'сообщение'};

// --- SendTo telegram --------------------------------------------------
Blockly.Words['telegram']               = {'en': 'telegram',                    'de': 'telegram',                           'ru': 'telegram'};
Blockly.Words['telegram_message']       = {'en': 'message',                     'de': 'Meldung',                            'ru': 'сообщение'};
Blockly.Words['telegram_username']      = {'en': 'User name (optional)',        'de': 'Username (optional)',                'ru': 'имя пользователя (не обяз.)'};
Blockly.Words['telegram_anyInstance']   = {'en': 'all instances',               'de': 'Alle Instanzen',                     'ru': 'На все драйвера'};
Blockly.Words['telegram_tooltip']       = {'en': 'Send message to telegram',    'de': 'Sende eine Meldung über Telegram',   'ru': 'Послать сообщение через Telegram'};
Blockly.Words['telegram_help']          = {'en': 'https://github.com/ioBroker/ioBroker.telegram/blob/master/README.md', 'de': 'https://github.com/ioBroker/ioBroker.telegram/blob/master/README.md', 'ru': 'https://github.com/ioBroker/ioBroker.telegram/blob/master/README.md'};
Blockly.Words['telegram_log']           = {'en': 'log level',                   'de': 'Loglevel',                           'ru': 'Протокол'};
Blockly.Words['telegram_log_none']      = {'en': 'none',                        'de': 'keins',                              'ru': 'нет'};
Blockly.Words['telegram_log_info']      = {'en': 'info',                        'de': 'info',                               'ru': 'инфо'};
Blockly.Words['telegram_log_debug']     = {'en': 'debug',                       'de': 'debug',                              'ru': 'debug'};
Blockly.Words['telegram_log_warn']      = {'en': 'warning',                     'de': 'warning',                            'ru': 'warning'};
Blockly.Words['telegram_log_error']     = {'en': 'error',                       'de': 'error',                              'ru': 'ошибка'};

Blockly.Sendto.blocks['telegram'] =
    '<block type="telegram">'
    + '     <value name="INSTANCE">'
    + '     </value>'
    + '     <value name="MESSAGE">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">text</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="USERNAME">'
    + '     </value>'
    + '     <value name="LOG">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['telegram'] = {
    init: function() {
        this.appendDummyInput('TEXT')
            .appendField(Blockly.Words['telegram'][systemLang]);

        this.appendDummyInput('INSTANCE')
            .appendField(new Blockly.FieldDropdown([[Blockly.Words['telegram_anyInstance'][systemLang], ''], ['telegram.0', '.0'], ['telegram.1', '.1'], ['telegram.2', '.2'], ['telegram.3', '.3'], ['telegram.4', '.4']]), 'INSTANCE');

        this.appendValueInput('MESSAGE')
            .appendField(Blockly.Words['telegram_message'][systemLang]);

        var input = this.appendValueInput('USERNAME')
            .setCheck('String')
            .appendField(Blockly.Words['telegram_username'][systemLang]);

        this.appendDummyInput('LOG')
            .appendField(Blockly.Words['telegram_log'][systemLang])
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Words['telegram_log_none'][systemLang],  ''],
                [Blockly.Words['telegram_log_info'][systemLang],  'log'],
                [Blockly.Words['telegram_log_debug'][systemLang], 'debug'],
                [Blockly.Words['telegram_log_warn'][systemLang],  'warn'],
                [Blockly.Words['telegram_log_error'][systemLang], 'error']
            ]), 'LOG');

        if (input.connection) input.connection._optional = true;

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Words['telegram_tooltip'][systemLang]);
        this.setHelpUrl(Blockly.Words['telegram_help'][systemLang]);
    }
};

Blockly.JavaScript['telegram'] = function(block) {
    var dropdown_instance = block.getFieldValue('INSTANCE');
    var logLevel = block.getFieldValue('LOG');
    var value_message = Blockly.JavaScript.valueToCode(block, 'MESSAGE', Blockly.JavaScript.ORDER_ATOMIC);
    var value_username = Blockly.JavaScript.valueToCode(block, 'USERNAME', Blockly.JavaScript.ORDER_ATOMIC);

    var logText;
    if (logLevel) {
        logText = 'console.' + logLevel + '("telegram' + (value_username ? '[' + value_username + ']' : '') + ': " + ' + value_message + ');\n'
    } else {
        logText = '';
    }
    
    return 'sendTo("telegram' + dropdown_instance + '", {\n    text: ' + 
        value_message + (value_username ? ', \n    user: ' + value_username : '') + '\n});\n' +
        logText;
};

// --- SayIt --------------------------------------------------
Blockly.Words['sayit']               = {'en': 'say text',                    'de': 'aussprechen',                        'ru': 'произнести'};
Blockly.Words['sayit_message']       = {'en': 'message',                     'de': 'Meldung',                            'ru': 'сообщение'};
Blockly.Words['sayit_volume']        = {'en': 'volume (optional)',           'de': 'Lautstärke (optional)',              'ru': 'громкость (не обяз.)'};
Blockly.Words['sayit_tooltip']       = {'en': 'Text to speech',              'de': 'Text zu Sprache',                    'ru': 'Произнести сообщение'};
Blockly.Words['sayit_help']          = {'en': 'https://github.com/ioBroker/ioBroker.sayit/blob/master/README.md', 'de': 'http://www.iobroker.net/?page_id=178&lang=de', 'ru': 'http://www.iobroker.net/?page_id=4262&lang=ru'};

Blockly.Sendto.blocks['sayit'] =
    '<block type="sayit">'
    + '     <value name="INSTANCE">'
    + '     </value>'
    + '     <value name="LANGUAGE">'
    + '     </value>'
    + '     <value name="VOLUME">'
    + '     </value>'
    + '     <value name="MESSAGE">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">text</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="LOG">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['sayit'] = {
    init: function() {
        this.appendDummyInput('TEXT')
            .appendField(Blockly.Words['sayit'][systemLang]);

        this.appendDummyInput('INSTANCE')
            .appendField(new Blockly.FieldDropdown([['sayit.0', '.0'], ['sayit.1', '.1'], ['sayit.2', '.2'], ['sayit.3', '.3'], ['sayit.4', '.4']]), 'INSTANCE');

        var languages;
        if (systemLang === 'en') {
            languages = [['english', 'en'], ['deutsch', 'de'], ['русский', 'ru']];
        } else if (systemLang === 'de') {
            languages = [['deutsch', 'de'], ['english', 'en'], ['русский', 'ru']];
        } else if (systemLang === 'ru') {
            languages = [['русский', 'ru'], ['english', 'en'], ['deutsch', 'de']];
        } else {
            languages = [['english', 'en'], ['deutsch', 'de'], ['русский', 'ru']];
        }

        this.appendDummyInput('LANGUAGE')
            .appendField(new Blockly.FieldDropdown(languages), 'LANGUAGE');

        this.appendValueInput('VOLUME')
            .setCheck('Number')
            .appendField(Blockly.Words['sayit_volume'][systemLang]);

        this.appendValueInput('MESSAGE')
            .appendField(Blockly.Words['sayit_message'][systemLang]);

        this.appendDummyInput('LOG')
            .appendField(Blockly.Words['telegram_log'][systemLang])
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Words['telegram_log_none'][systemLang],  ''],
                [Blockly.Words['telegram_log_info'][systemLang],  'log'],
                [Blockly.Words['telegram_log_debug'][systemLang], 'debug'],
                [Blockly.Words['telegram_log_warn'][systemLang],  'warn'],
                [Blockly.Words['telegram_log_error'][systemLang], 'error']
            ]), 'LOG');

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Words['sayit_tooltip'][systemLang]);
        this.setHelpUrl(Blockly.Words['sayit_help'][systemLang]);
    }
};

Blockly.JavaScript['sayit'] = function(block) {
    var dropdown_instance = block.getFieldValue('INSTANCE');
    var dropdown_language = block.getFieldValue('LANGUAGE');
    var value_message = Blockly.JavaScript.valueToCode(block, 'MESSAGE', Blockly.JavaScript.ORDER_ATOMIC);
    var value_volume  = Blockly.JavaScript.valueToCode(block, 'VOLUME', Blockly.JavaScript.ORDER_ATOMIC);
    var logLevel = block.getFieldValue('LOG');

    var logText;
    if (logLevel) {
        logText = 'console.' + logLevel + '("telegram' + (value_username ? '[' + value_username + ']' : '') + ': " + ' + value_message + ');\n'
    } else {
        logText = '';
    }

    return 'setState("sayit' + dropdown_instance + '.tts.text", "' + dropdown_language + ';' + (value_volume !== null && value_volume !== '' ? value_volume + ';' : '') + '" + ' + value_message  + ');\n' +
        logText;
};

// --- SendTo pushover --------------------------------------------------
Blockly.Words['pushover']               = {'en': 'pushover',                    'de': 'pushover',                           'ru': 'pushover'};
Blockly.Words['pushover_message']       = {'en': 'message',                     'de': 'Meldung',                            'ru': 'сообщение'};
Blockly.Words['pushover_title']         = {'en': 'Title (optional)',            'de': 'Betreff (optional)',                 'ru': 'заголовок (не обяз.)'};
Blockly.Words['pushover_sound']         = {'en': 'sound',                       'de': 'Klang',                              'ru': 'звук'};
Blockly.Words['pushover_priority']      = {'en': 'priority',                    'de': 'Priorität',                          'ru': 'приоритет'};
Blockly.Words['pushover_url']           = {'en': 'URL (optional)',              'de': 'URL (optional)',                     'ru': 'URL (не обяз.)'};
Blockly.Words['pushover_url_title']     = {'en': 'URL Title (optional)',        'de': 'URL Betreff (optional)',             'ru': 'заголовок для URL (не обяз.)'};
Blockly.Words['pushover_device']        = {'en': 'device ID (optional)',        'de': 'Gerät ID (optional)',                'ru': 'ID устройства (не обяз.)'};
Blockly.Words['pushover_timestamp']     = {'en': 'time in ms (optional)',       'de': 'Zeit in ms (optional)',              'ru': 'время в мс (не обяз.)'};
Blockly.Words['pushover_normal']        = {'en': 'default',                     'de': 'normal',                             'ru': 'по умолчанию'};
Blockly.Words['pushover_high']          = {'en': 'high priority',               'de': 'höhe Priorität',                     'ru': 'приоритетное'};
Blockly.Words['pushover_quiet']         = {'en': 'quiet',                       'de': 'still',                              'ru': 'тихое'};
Blockly.Words['pushover_confirmation']  = {'en': 'with confirmation',           'de': 'mit Bestätigung ',                   'ru': 'с подтверждением'};

Blockly.Words['pushover_sound_default']     = {'en': 'default',                 'de': 'normal',                             'ru': 'по умолчанию'};
Blockly.Words['pushover_sound_pushover']    = {'en': 'pushover',                'de': 'pushover',                           'ru': 'pushover'};
Blockly.Words['pushover_sound_bike']        = {'en': 'bike',                    'de': 'bike',                               'ru': 'bike'};
Blockly.Words['pushover_sound_bugle']       = {'en': 'bugle',                   'de': 'bugle',                              'ru': 'bugle'};
Blockly.Words['pushover_sound_cashregister'] = {'en': 'cashregister',           'de': 'cashregister',                       'ru': 'cashregister'};
Blockly.Words['pushover_sound_classical']   = {'en': 'classical',               'de': 'classical',                          'ru': 'classical'};
Blockly.Words['pushover_sound_cosmic']      = {'en': 'cosmic',                  'de': 'cosmic',                             'ru': 'cosmic'};
Blockly.Words['pushover_sound_falling']     = {'en': 'falling',                 'de': 'falling',                            'ru': 'falling'};
Blockly.Words['pushover_sound_gamelan']     = {'en': 'gamelan',                 'de': 'gamelan',                            'ru': 'gamelan'};
Blockly.Words['pushover_sound_incoming']    = {'en': 'incoming',                'de': 'incoming',                           'ru': 'incoming'};
Blockly.Words['pushover_sound_intermission'] = {'en': 'intermission',           'de': 'intermission',                       'ru': 'intermission'};
Blockly.Words['pushover_sound_magic']       = {'en': 'magic',                   'de': 'magic',                              'ru': 'magic'};
Blockly.Words['pushover_sound_mechanical']  = {'en': 'mechanical',              'de': 'mechanical',                         'ru': 'mechanical'};
Blockly.Words['pushover_sound_pianobar']    = {'en': 'pianobar',                'de': 'pianobar',                           'ru': 'pianobar'};
Blockly.Words['pushover_sound_siren']       = {'en': 'siren',                   'de': 'siren',                              'ru': 'siren'};
Blockly.Words['pushover_sound_spacealarm']  = {'en': 'spacealarm',              'de': 'spacealarm',                         'ru': 'spacealarm'};
Blockly.Words['pushover_sound_tugboat']     = {'en': 'tugboat',                 'de': 'tugboat',                            'ru': 'tugboat'};
Blockly.Words['pushover_sound_alien']       = {'en': 'alien',                   'de': 'alien',                              'ru': 'alien'};
Blockly.Words['pushover_sound_climb']       = {'en': 'climb',                   'de': 'climb',                              'ru': 'climb'};
Blockly.Words['pushover_sound_persistent']  = {'en': 'persistent',              'de': 'persistent',                         'ru': 'persistent'};
Blockly.Words['pushover_sound_echo']        = {'en': 'echo',                    'de': 'echo',                               'ru': 'echo'};
Blockly.Words['pushover_sound_updown']      = {'en': 'updown',                  'de': 'updown',                             'ru': 'updown'};
Blockly.Words['pushover_sound_none']        = {'en': 'none',                    'de': 'keins',                              'ru': 'без звука'};


Blockly.Words['pushover_anyInstance']   = {'en': 'all instances',               'de': 'Alle Instanzen',                     'ru': 'На все драйвера'};
Blockly.Words['pushover_tooltip']       = {'en': 'Send message to telegram',    'de': 'Sende eine Meldung über Telegram',   'ru': 'Послать сообщение через Pushover'};
Blockly.Words['pushover_help']          = {'en': 'https://github.com/ioBroker/ioBroker.pushover/blob/master/README.md', 'de': 'https://github.com/ioBroker/ioBroker.pushover/blob/master/README.md', 'ru': 'https://github.com/ioBroker/ioBroker.pushover/blob/master/README.md'};

Blockly.Sendto.blocks['pushover'] =
    '<block type="pushover">'
    + '     <value name="INSTANCE">'
    + '     </value>'
    + '     <value name="MESSAGE">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">text</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="TITLE">'
    + '     </value>'
    + '     <value name="SOUND">'
    + '     </value>'
    + '     <value name="PRIORITY">'
    + '     </value>'
    + '     <value name="URL">'
    + '     </value>'
    + '     <value name="URL_TITLE">'
    + '     </value>'
    + '     <value name="DEVICE">'
    + '     </value>'
    + '     <value name="TIMESTAMP">'
    + '     </value>'
    + '     <value name="LOG">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['pushover'] = {
    init: function() {
        this.appendDummyInput('TEXT')
            .appendField(Blockly.Words['pushover'][systemLang]);

        this.appendDummyInput("INSTANCE")
            .appendField(new Blockly.FieldDropdown([[Blockly.Words['pushover_anyInstance'][systemLang], ""], ["pushover.0", ".0"], ["pushover.1", ".1"], ["pushover.2", ".2"], ["pushover.3", ".3"], ["pushover.4", ".4"]]), "INSTANCE");

        this.appendValueInput("MESSAGE")
            .appendField(Blockly.Words['pushover_message'][systemLang]);

        this.appendDummyInput("SOUND")
            .appendField(Blockly.Words['pushover_sound'][systemLang])
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Words['pushover_sound_default'][systemLang], ""],
                [Blockly.Words['pushover_sound_pushover'][systemLang], "pushover"],
                [Blockly.Words['pushover_sound_bike'][systemLang], "bike"],
                [Blockly.Words['pushover_sound_bugle'][systemLang], "bugle"],
                [Blockly.Words['pushover_sound_cashregister'][systemLang], "cashregister"],
                [Blockly.Words['pushover_sound_classical'][systemLang], "classical"],
                [Blockly.Words['pushover_sound_cosmic'][systemLang], "cosmic"],
                [Blockly.Words['pushover_sound_falling'][systemLang], "falling"],
                [Blockly.Words['pushover_sound_gamelan'][systemLang], "gamelan"],
                [Blockly.Words['pushover_sound_incoming'][systemLang], "incoming"],
                [Blockly.Words['pushover_sound_intermission'][systemLang], "intermission"],
                [Blockly.Words['pushover_sound_magic'][systemLang], "magic"],
                [Blockly.Words['pushover_sound_mechanical'][systemLang], "mechanical"],
                [Blockly.Words['pushover_sound_pianobar'][systemLang], "pianobar"],
                [Blockly.Words['pushover_sound_siren'][systemLang], "siren"],
                [Blockly.Words['pushover_sound_spacealarm'][systemLang], "spacealarm"],
                [Blockly.Words['pushover_sound_tugboat'][systemLang], "tugboat"],
                [Blockly.Words['pushover_sound_alien'][systemLang], "alien"],
                [Blockly.Words['pushover_sound_climb'][systemLang], "climb"],
                [Blockly.Words['pushover_sound_persistent'][systemLang], "persistent"],
                [Blockly.Words['pushover_sound_echo'][systemLang], "echo"],
                [Blockly.Words['pushover_sound_updown'][systemLang], "updown"],
                [Blockly.Words['pushover_sound_none'][systemLang], "none"]
            ]), "SOUND");

        this.appendDummyInput("PRIORITY")
            .appendField(Blockly.Words['pushover_priority'][systemLang])
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Words['pushover_normal'][systemLang],       "0"],
                [Blockly.Words['pushover_high'][systemLang],         "-1"],
                [Blockly.Words['pushover_quiet'][systemLang],        "1"],
                [Blockly.Words['pushover_confirmation'][systemLang], "2"]
            ]), "PRIORITY");

        var input = this.appendValueInput("TITLE")
            .setCheck('String')
            .appendField(Blockly.Words['pushover_title'][systemLang]);
        if (input.connection) input.connection._optional = true;


        input = this.appendValueInput("URL")
            .setCheck('String')
            .appendField(Blockly.Words['pushover_url'][systemLang]);
        if (input.connection) input.connection._optional = true;

        input = this.appendValueInput("URL_TITLE")
            .setCheck('String')
            .appendField(Blockly.Words['pushover_url_title'][systemLang]);
        if (input.connection) input.connection._optional = true;

        input = this.appendValueInput("DEVICE")
            .setCheck('String')
            .appendField(Blockly.Words['pushover_device'][systemLang]);
        if (input.connection) input.connection._optional = true;

        input = this.appendValueInput("TIMESTAMP")
            .setCheck("Date")
            .appendField(Blockly.Words['pushover_timestamp'][systemLang]);
        if (input.connection) input.connection._optional = true;

        this.appendDummyInput('LOG')
            .appendField(Blockly.Words['telegram_log'][systemLang])
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Words['telegram_log_none'][systemLang],  ''],
                [Blockly.Words['telegram_log_info'][systemLang],  'log'],
                [Blockly.Words['telegram_log_debug'][systemLang], 'debug'],
                [Blockly.Words['telegram_log_warn'][systemLang],  'warn'],
                [Blockly.Words['telegram_log_error'][systemLang], 'error']
            ]), 'LOG');

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Words['pushover_tooltip'][systemLang]);
        this.setHelpUrl(Blockly.Words['pushover_help'][systemLang]);
    }
};

Blockly.JavaScript['pushover'] = function(block) {
    var dropdown_instance = block.getFieldValue('INSTANCE');
    var logLevel = block.getFieldValue('LOG');
    var message  = Blockly.JavaScript.valueToCode(block, 'MESSAGE', Blockly.JavaScript.ORDER_ATOMIC);
    var text = '{\n';
    text += '   message: ' + message + ',\n';
    text += '   sound: "' + block.getFieldValue('SOUND') + '",\n';
    var value = parseInt(block.getFieldValue('PRIORITY'), 10);
    if (value)     text += '   priority: ' + value + ',\n';

    value = Blockly.JavaScript.valueToCode(block, 'URL', Blockly.JavaScript.ORDER_ATOMIC);
    if (value)     text += '   url: ' + value + ',\n';

    value = Blockly.JavaScript.valueToCode(block, 'URL_TITLE', Blockly.JavaScript.ORDER_ATOMIC);
    if (value)     text += '   url_title: ' + value + ',\n';

    value = Blockly.JavaScript.valueToCode(block, 'TITLE', Blockly.JavaScript.ORDER_ATOMIC);
    if (value)     text += '   title: ' + value + ',\n';

    value = Blockly.JavaScript.valueToCode(block, 'DEVICE', Blockly.JavaScript.ORDER_ATOMIC);
    if (value)     text += '   device: ' + value + ',\n';

    value = Blockly.JavaScript.valueToCode(block, 'TIMESTAMP', Blockly.JavaScript.ORDER_ATOMIC);
    if (value)     text += '   timestamp: ' + value + ',\n';
    text = text.substring(0, text.length - 2);
    text += '\n';

    text += '}';
    var logText;

    if (logLevel) {
        logText = 'console.' + logLevel + '("pushover: " + ' + message + ');\n'
    } else {
        logText = '';
    }

    return 'sendTo("pushover' + dropdown_instance + '", ' + text + ');\n' + logText;
};

// --- SendTo email --------------------------------------------------
Blockly.Words['email']               = {'en': 'email',                       'de': 'email',                              'ru': 'email'};
Blockly.Words['email_to']            = {'en': 'to',                          'de': 'An',                                 'ru': 'кому'};
Blockly.Words['email_text']          = {'en': 'text',                        'de': 'Text',                               'ru': 'сообщение'};
Blockly.Words['email_subject']       = {'en': 'subject (optional)',          'de': 'Betreff (optional)',                 'ru': 'заголовок (не обяз.)'};
Blockly.Words['email_from']          = {'en': 'from (optional)',             'de': 'Von (optional)',                     'ru': 'от (не обяз.)'};
Blockly.Words['email_is_html']       = {'en': 'Send as HTML',                'de': 'Sende als HTML',                     'ru': 'Формат HTML'};

Blockly.Words['email_file']          = {'en': 'file name (optional)',        'de': 'Dateiname (optional)',               'ru': 'имя файла (не обяз.)'};

Blockly.Words['email_anyInstance']   = {'en': 'all instances',               'de': 'Alle Instanzen',                     'ru': 'На все драйвера'};
Blockly.Words['email_tooltip']       = {'en': 'Send an email',               'de': 'Sende ein E-Mail',                   'ru': 'Послать email'};
Blockly.Words['email_help']          = {'en': 'https://github.com/ioBroker/ioBroker.email/blob/master/README.md', 'de': 'https://github.com/ioBroker/ioBroker.email/blob/master/README.md', 'ru': 'https://github.com/ioBroker/ioBroker.email/blob/master/README.md'};

Blockly.Sendto.blocks['email'] =
    '<block type="email">'
    + '     <value name="INSTANCE">'
    + '     </value>'
    + '     <value name="TO">'
    + '         <shadow type="text">'
    + '             <field name="TO_TEXT">text</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="IS_HTML">'
    + '     </value>'
    + '     <value name="TEXT">'
    + '         <shadow type="text">'
    + '             <field name="TEXT_TEXT">text</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="SUBJECT">'
    + '         <shadow type="text">'
    + '             <field name="SUBJECT_TEXT">text</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="FROM">'
    + '     </value>'
    + '     <value name="FILE_1">'
    + '     </value>'
    + '     <value name="FILE_2">'
    + '     </value>'
    + '     <value name="LOG">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['email'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(Blockly.Words['email'][systemLang]);

        this.appendDummyInput("INSTANCE")
            .appendField(new Blockly.FieldDropdown([[Blockly.Words['email_anyInstance'][systemLang], ""], ["email.0", ".0"], ["email.1", ".1"], ["email.2", ".2"], ["email.3", ".3"], ["email.4", ".4"]]), "INSTANCE");

        this.appendValueInput("TO")
            .appendField(Blockly.Words['email_to'][systemLang]);

        this.appendDummyInput("IS_HTML")
            .appendField(Blockly.Words['email_is_html'][systemLang])
            .appendField(new Blockly.FieldCheckbox('FALSE'), 'IS_HTML');

        this.appendValueInput('TEXT')
            .setCheck('String')
            .appendField(Blockly.Words['email_text'][systemLang]);

        var input = this.appendValueInput("SUBJECT")
            .setCheck('String')
            .appendField(Blockly.Words['email_subject'][systemLang]);
        if (input.connection) input.connection._optional = true;

        input = this.appendValueInput("FROM")
            .setCheck('String')
            .appendField(Blockly.Words['email_from'][systemLang]);
        if (input.connection) input.connection._optional = true;

        input = this.appendValueInput("FILE_1")
            .setCheck('String')
            .appendField(Blockly.Words['email_file'][systemLang]);
        if (input.connection) input.connection._optional = true;

        input = this.appendValueInput("FILE_2")
            .setCheck('String')
            .appendField(Blockly.Words['email_file'][systemLang]);
        if (input.connection) input.connection._optional = true;

        this.appendDummyInput('LOG')
            .appendField(Blockly.Words['telegram_log'][systemLang])
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Words['telegram_log_none'][systemLang],  ''],
                [Blockly.Words['telegram_log_info'][systemLang],  'log'],
                [Blockly.Words['telegram_log_debug'][systemLang], 'debug'],
                [Blockly.Words['telegram_log_warn'][systemLang],  'warn'],
                [Blockly.Words['telegram_log_error'][systemLang], 'error']
            ]), 'LOG');

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Words['email_tooltip'][systemLang]);
        this.setHelpUrl(Blockly.Words['email_help'][systemLang]);
    }
};

Blockly.JavaScript['email'] = function(block) {
    var dropdown_instance = block.getFieldValue('INSTANCE');
    var logLevel = block.getFieldValue('LOG');
    var message  = Blockly.JavaScript.valueToCode(block, 'TEXT', Blockly.JavaScript.ORDER_ATOMIC);
    var isHtml = block.getFieldValue('IS_HTML');

    var text = '{\n';
    if (isHtml === 'TRUE') {
        text += '   html: ' + message + ',\n';
    } else {
        text += '   text: ' + message + ',\n';
    }

    var value = Blockly.JavaScript.valueToCode(block, 'TO', Blockly.JavaScript.ORDER_ATOMIC);
    if (value)     text += '   to: ' + value + ',\n';

    value = Blockly.JavaScript.valueToCode(block, 'SUBJECT', Blockly.JavaScript.ORDER_ATOMIC);
    if (value && value !== '') text += '   subject: ' + value + ',\n';

    value = Blockly.JavaScript.valueToCode(block, 'FROM', Blockly.JavaScript.ORDER_ATOMIC);
    if (value)     text += '   from: ' + value + ',\n';

    var files = [];

    files.push(Blockly.JavaScript.valueToCode(block, 'FILE_1', Blockly.JavaScript.ORDER_ATOMIC));
    files.push(Blockly.JavaScript.valueToCode(block, 'FILE_2', Blockly.JavaScript.ORDER_ATOMIC));
    var attachments = '';
    for (var f = 0; f < files.length; f++) {
        if (files[f]) {
            if (!attachments) attachments = '   attachments:[\n';
            attachments += '      {path: ' + files[f] + ', cid: "file' + (f + 1) + '"}\n';
        }
    }
    if (attachments) attachments += '    ],\n';
    text += attachments;

    text = text.substring(0, text.length - 2);
    text += '\n';

    text += '}';
    var logText;

    if (logLevel) {
        logText = 'console.' + logLevel + '("email: " + ' + message + ');\n'
    } else {
        logText = '';
    }

    return 'sendTo("email' + dropdown_instance + '", ' + text + ');\n' + logText;
};

if (0) {
// --- sendTo Custom --------------------------------------------------
    Blockly.Words['sendto_custom'] = {'en': 'sendTo', 'de': 'sendTo', 'ru': 'sendTo'};
    Blockly.Words['sendto_custom_tooltip'] = {
        'en': 'Text to speech',
        'de': 'Text zu Sprache',
        'ru': 'Произнести сообщение'
    };
    Blockly.Words['sendto_custom_help'] = {'en': 'sendto', 'de': 'sendto', 'ru': 'sendto'};
    Blockly.Words['sendto_custom_arguments'] = {'en': 'parameters', 'de': 'Parameter', 'ru': 'параметры'};
    Blockly.Words['sendto_custom_argument'] = {'en': 'parameter', 'de': 'Parameter', 'ru': 'параметр'};
    Blockly.Words['sendto_custom_arg_tooltip'] = {
        'en': 'Add parameter to sendTo object.',
        'de': 'Parameter zum sendTo-Objekt hinzufügen',
        'ru': 'Добавить параметр к sendTo объекту'
    };

    Blockly.Sendto.blocks['sendto_custom'] =
        '<block type="sendto_custom">'
        + '     <value name="INSTANCE">'
        + '     </value>'
        + '</block>';


    Blockly.Blocks['sendto_custom_container'] = {
        /**
         * Mutator block for container.
         * @this Blockly.Block
         */
        init: function () {
            this.setColour(Blockly.Sendto.HUE);

            this.appendDummyInput()
                .appendField(Blockly.Words['sendto_custom_arguments'][systemLang]);

            this.appendStatementInput('STACK');
            this.setTooltip(Blockly.Msg.TEXT_CREATE_JOIN_TOOLTIP);
            this.contextMenu = false;
        }
    };

    Blockly.Blocks['sendto_custom_item'] = {
        /**
         * Mutator block for add items.
         * @this Blockly.Block
         */
        init: function () {
            this.setColour(Blockly.Sendto.HUE);

            this.appendDummyInput()
                .appendField(Blockly.Words['sendto_custom_argument'][systemLang])
                .appendField(new Blockly.FieldTextInput('text'), 'NAME');

            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setTooltip(Blockly.Words['sendto_custom_arg_tooltip'][systemLang]);
            this.contextMenu = false;
        }
    };

    Blockly.Blocks['sendto_custom'] = {
        /**
         * Block for creating a string made up of any number of elements of any type.
         * @this Blockly.Block
         */
        init: function () {
            this.appendDummyInput('TEXT')
                .appendField(Blockly.Words['sendto_custom'][systemLang]);

            this.appendDummyInput('INSTANCE')
                .appendField(new Blockly.FieldTextInput('adapter.0'), 'INSTANCE');

            this.setColour(Blockly.Sendto.HUE);
            this.arguments_ = ['text'];
            this.updateShape_();
            this.setMutator(new Blockly.Mutator(['sendto_custom_item']));
            this.setTooltip(Blockly.Words['sendto_custom_tooltip'][systemLang]);
            this.setHelpUrl(getHelp('sendto_custom_help'));
        },
        /**
         * Create XML to represent number of text inputs.
         * @return {!Element} XML storage element.
         * @this Blockly.Block
         */
        mutationToDom: function () {
            var container = document.createElement('mutation');
            container.setAttribute('arguments', this.arguments_.join(','));
            return container;
        },
        /**
         * Parse XML to restore the text inputs.
         * @param {!Element} xmlElement XML storage element.
         * @this Blockly.Block
         */
        domToMutation: function (xmlElement) {
            var arg = xmlElement.getAttribute('arguments') || '';
            this.arguments_ = arg.split(',');
            this.updateShape_();
        },
        /**
         * Populate the mutator's dialog with this block's components.
         * @param {!Blockly.Workspace} workspace Mutator's workspace.
         * @return {!Blockly.Block} Root block in mutator.
         * @this Blockly.Block
         */
        decompose: function (workspace) {
            var containerBlock = workspace.newBlock('sendto_custom_container');
            containerBlock.initSvg();
            var connection = containerBlock.getInput('STACK').connection;
            for (var i = 0; i < this.arguments_.length; i++) {
                var itemBlock = workspace.newBlock('sendto_custom_item');
                itemBlock.setFieldValue(this.arguments_[i], 'NAME');
                itemBlock.initSvg();
                connection.connect(itemBlock.previousConnection);
                connection = itemBlock.nextConnection;
            }
            return containerBlock;
        },
        /**
         * Reconfigure this block based on the mutator dialog's components.
         * @param {!Blockly.Block} containerBlock Root block in mutator.
         * @this Blockly.Block
         */
        compose: function (containerBlock) {
            var itemBlock = containerBlock.getInputTargetBlock('STACK');
            // Count number of inputs.
            var connections = [];
            while (itemBlock) {
                connections.push(itemBlock.valueConnection_);
                itemBlock = itemBlock.nextConnection &&
                    itemBlock.nextConnection.targetBlock();
            }

            // Disconnect any children that don't belong.
            for (var i = 0; i < this.arguments_.length; i++) {
                var connection = this.getInput('PARAM' + i).connection.targetConnection;
                if (connection && connections.indexOf(connection) == -1) {
                    connection.disconnect();
                }
            }
            this.arguments_ = Array(connections.length);

            this.updateShape_();
            // Reconnect any child blocks.
            for (var i = 0; i < this.arguments_.length; i++) {
                Blockly.Mutator.reconnect(connections[i], this, 'PARAM' + i);
            }
        },
        /**
         * Store pointers to any connected child blocks.
         * @param {!Blockly.Block} containerBlock Root block in mutator.
         * @this Blockly.Block
         */
        saveConnections: function (containerBlock) {
            var itemBlock = containerBlock.getInputTargetBlock('STACK');
            var i = 0;
            while (itemBlock) {
                var input = this.getInput('PARAM' + i);
                itemBlock.valueConnection_ = input && input.connection.targetConnection;
                i++;
                itemBlock = itemBlock.nextConnection &&
                    itemBlock.nextConnection.targetBlock();
            }
        },
        /**
         * Modify this block to have the correct number of inputs.
         * @private
         * @this Blockly.Block
         */
        updateShape_: function () {
            if (this.itemCount_ && this.getInput('EMPTY')) {
                this.removeInput('EMPTY');
            } else if (!this.itemCount_ && !this.getInput('EMPTY')) {
                this.appendDummyInput('EMPTY')
                    .appendField(this.newQuote_(true))
                    .appendField(this.newQuote_(false));
            }
            // Add new inputs.
            for (var i = 0; i < this.itemCount_; i++) {
                if (!this.getInput('PARAM' + i)) {
                    var input = this.appendValueInput('PARAM' + i);
                    var name = input.getFieldValue();
                    input.appendField(name);
                }
            }
            // Remove deleted inputs.
            while (this.getInput('PARAM' + i)) {
                this.removeInput('PARAM' + i);
                i++;
            }
        },
        newQuote_: Blockly.Blocks['text'].newQuote_
    };

    Blockly.JavaScript['sendto_custom'] = function (block) {
        var dropdown_instance = block.getFieldValue('INSTANCE');
        var logLevel = block.getFieldValue('LOG');

        var logText;
        if (logLevel) {
            logText = 'console.' + logLevel + '("telegram' + (value_username ? '[' + value_username + ']' : '') + ': " + ' + value_message + ');\n'
        } else {
            logText = '';
        }

        return 'sendTo("' + dropdown_instance + '", "' + 3 + '");\n' + logText;
    };
}
