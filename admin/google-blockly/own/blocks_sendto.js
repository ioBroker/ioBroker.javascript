'use strict';

goog.provide('Blockly.JavaScript.Sendto');

goog.require('Blockly.JavaScript');

Blockly.CustomBlocks = Blockly.CustomBlocks || [];
Blockly.CustomBlocks.push('Sendto');

Blockly.Sendto = {
    HUE: 250,
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

        this.appendValueInput("USERNAME")
            .setCheck("String")
            .appendField(Blockly.Words['telegram_username'][systemLang]);

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
