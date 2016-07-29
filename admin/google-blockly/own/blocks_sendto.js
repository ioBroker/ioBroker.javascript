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

// --- SendTo telegram --------------------------------------------------
Blockly.Words['telegram']               = {'en': 'telegram',                    'de': 'telegram',                           'ru': 'telegram'};
Blockly.Words['telegram_message']       = {'en': 'message',                     'de': 'Meldung',                            'ru': 'сообщение'};
Blockly.Words['telegram_username']      = {'en': 'User name (optional)',        'de': 'Username (optional)',                'ru': 'имя пользователя (не обяз.)'};
Blockly.Words['telegram_anyInstance']   = {'en': 'all instances',               'de': 'Alle Instanzen',                     'ru': 'На все драйвера'};
Blockly.Words['telegram_tooltip']       = {'en': 'Send message to telegram',    'de': 'Sende eine Meldung über Telegram',   'ru': 'Послать сообщение через Telegram'};
Blockly.Words['telegram_help']          = {'en': 'https://github.com/ioBroker/ioBroker.telegram/blob/master/README.md', 'de': 'https://github.com/ioBroker/ioBroker.telegram/blob/master/README.md', 'ru': 'https://github.com/ioBroker/ioBroker.telegram/blob/master/README.md'};

Blockly.Sendto.blocks['telegram'] =
    '<block type="telegram">'
    + '     <value name="INSTANCE">'
    + '     </value>'
    + '     <value name="MESSAGE">'
    + '     </value>'
    + '     <value name="USERNAME">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['telegram'] = {
    init: function() {
        this.appendDummyInput('TEXT')
            .appendField(Blockly.Words['telegram'][systemLang]);

        this.appendDummyInput("INSTANCE")
            .appendField(new Blockly.FieldDropdown([[Blockly.Words['telegram_anyInstance'][systemLang], ""], ["telegram.0", ".0"], ["telegram.1", ".1"], ["telegram.2", ".2"], ["telegram.3", ".3"], ["telegram.4", ".4"]]), "INSTANCE");

        this.appendValueInput("MESSAGE")
            .appendField(Blockly.Words['telegram_message'][systemLang]);

        var input = this.appendValueInput("USERNAME")
            .setCheck("String")
            .appendField(Blockly.Words['telegram_username'][systemLang]);

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
    var value_message = Blockly.JavaScript.valueToCode(block, 'MESSAGE', Blockly.JavaScript.ORDER_ATOMIC);
    var value_username = Blockly.JavaScript.valueToCode(block, 'USERNAME', Blockly.JavaScript.ORDER_ATOMIC);

    return 'sendTo("telegram' + dropdown_instance + '", {\n    text: ' + value_message + (value_username ? ', \n    user: ' + value_username : '') + '\n});\n';
};

// --- SayIt --------------------------------------------------
Blockly.Words['sayit']               = {'en': 'say text',                    'de': 'aussprechen',                        'ru': 'произнести'};
Blockly.Words['sayit_message']       = {'en': 'message',                     'de': 'Meldung',                            'ru': 'сообщение'};
Blockly.Words['sayit_volume']        = {'en': 'volume (optional)',           'de': 'Lautstärke (optional)',              'ru': 'громкость (не обяз.)'};
Blockly.Words['sayit_tooltip']       = {'en': 'Text to speech',              'de': 'Text zu Sprache',                    'ru': 'Произнести сообщение'};
Blockly.Words['sayit_help']          = {'en': 'https://github.com/ioBroker/ioBroker.sayit/blob/master/README.md', 'de': 'http://www.iobroker.net/?page_id=178&lang=de', 'ru': 'http://www.iobroker.net/?page_id=4262&lang=ru'};

Blockly.Sendto.blocks['sayit'] =
    '<block type="sayit">'
    + '     <value name="INSTANCE_">'
    + '     </value>'
    + '     <value name="LANGUAGE">'
    + '     </value>'
    + '     <value name="VOLUME">'
    + '     </value>'
    + '     <value name="MESSAGE">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['sayit'] = {
    init: function() {
        this.appendDummyInput('TEXT')
            .appendField(Blockly.Words['sayit'][systemLang]);

        this.appendDummyInput("INSTANCE")
            .appendField(new Blockly.FieldDropdown([["sayit.0", ".0"], ["sayit.1", ".1"], ["sayit.2", ".2"], ["sayit.3", ".3"], ["sayit.4", ".4"]]), "INSTANCE");

        var languages;
        if (systemLang === 'en') {
            languages = [["english", "en"], ["deutsch", "de"], ["русский", "ru"]];
        } else if (systemLang === 'de') {
            languages = [["deutsch", "de"], ["english", "en"], ["русский", "ru"]];
        } else if (systemLang === 'ru') {
            languages = [["русский", "ru"], ["english", "en"], ["deutsch", "de"]];
        } else {
            languages = [["english", "en"], ["deutsch", "de"], ["русский", "ru"]];
        }

        this.appendDummyInput("LANGUAGE")
            .appendField(new Blockly.FieldDropdown(languages), "LANGUAGE");

        this.appendValueInput("VOLUME")
            .setCheck("Number")
            .appendField(Blockly.Words['sayit_volume'][systemLang]);

        this.appendValueInput("MESSAGE")
            .appendField(Blockly.Words['sayit_message'][systemLang]);

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

    value_message = value_message || "''";
    value_message = value_message.substring(1, value_message.length - 2);
    value_message = dropdown_language + ';' + (value_volume !== null && value_volume !== '' ? value_volume + ';' : '') + value_message;

    return 'setState("sayit' + dropdown_instance + '.tts.text", "' + value_message + '");\n';
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
            .setCheck("String")
            .appendField(Blockly.Words['pushover_title'][systemLang]);
        if (input.connection) input.connection._optional = true;


        input = this.appendValueInput("URL")
            .setCheck("String")
            .appendField(Blockly.Words['pushover_url'][systemLang]);
        if (input.connection) input.connection._optional = true;

        input = this.appendValueInput("URL_TITLE")
            .setCheck("String")
            .appendField(Blockly.Words['pushover_url_title'][systemLang]);
        if (input.connection) input.connection._optional = true;

        input = this.appendValueInput("DEVICE")
            .setCheck("String")
            .appendField(Blockly.Words['pushover_device'][systemLang]);
        if (input.connection) input.connection._optional = true;

        input = this.appendValueInput("TIMESTAMP")
            .setCheck("Date")
            .appendField(Blockly.Words['pushover_timestamp'][systemLang]);
        if (input.connection) input.connection._optional = true;

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
    var value_username = Blockly.JavaScript.valueToCode(block, 'USERNAME', Blockly.JavaScript.ORDER_ATOMIC);
    var text = '{\n';
    text += '   message: ' + Blockly.JavaScript.valueToCode(block, 'MESSAGE', Blockly.JavaScript.ORDER_ATOMIC) + ',\n';
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

    return 'sendTo("pushover' + dropdown_instance + '", ' + text + ');\n';
};
