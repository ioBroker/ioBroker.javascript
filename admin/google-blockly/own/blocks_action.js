'use strict';

goog.provide('Blockly.JavaScript.Action');

goog.require('Blockly.JavaScript');

Blockly.CustomBlocks = Blockly.CustomBlocks || [];
Blockly.CustomBlocks.push('Action');

Blockly.Action = {
    HUE: 330,
    blocks: {}
};

Blockly.Words['Action']         = {'en': 'Actions', 'de': 'Aktionen', 'ru': 'Действия'};

// --- action exec --------------------------------------------------
Blockly.Words['exec']               = {'en': 'exec',                        'de': 'exec',                               'ru': 'exec'};
Blockly.Words['exec_statement']     = {'en': 'with results',                'de': 'mit Ergebnissen',                    'ru': 'анализировать результаты'};
Blockly.Words['exec_command']       = {'en': 'command',                     'de': 'Kommando',                           'ru': 'команда'};
Blockly.Words['exec_tooltip']       = {'en': 'Execute some command',        'de': 'Ein System-Kommando ausführen',      'ru': 'Выполнить системную команду'};
Blockly.Words['exec_help']          = {'en': 'exec---execute-some-os-command-like-cp-file1-file2',                        'de': 'exec---execute-some-os-command-like-cp-file1-file2',                               'ru': 'exec---execute-some-os-command-like-cp-file1-file2'};
Blockly.Words['exec_log']           = {'en': 'log level',                   'de': 'Loglevel',                           'ru': 'Протокол'};
Blockly.Words['exec_log_none']      = {'en': 'none',                        'de': 'keins',                              'ru': 'нет'};
Blockly.Words['exec_log_info']      = {'en': 'info',                        'de': 'info',                               'ru': 'инфо'};
Blockly.Words['exec_log_debug']     = {'en': 'debug',                       'de': 'debug',                              'ru': 'debug'};
Blockly.Words['exec_log_warn']      = {'en': 'warning',                     'de': 'warning',                            'ru': 'warning'};
Blockly.Words['exec_log_error']     = {'en': 'error',                       'de': 'error',                              'ru': 'ошибка'};

Blockly.Action.blocks['exec'] =
    '<block type="exec">'
    + '     <value name="COMMAND">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">text</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="LOG">'
    + '     </value>'
    + '     <value name="WITH_STATEMENT">'
    + '     </value>'
    + '     <mutation with_statement="false"></mutation>'
    + '</block>';

Blockly.Blocks['exec'] = {
    init: function() {
        this.appendDummyInput('TEXT')
            .appendField(Blockly.Words['exec'][systemLang]);

        this.appendValueInput('COMMAND')
            .appendField(Blockly.Words['exec_command'][systemLang]);

        this.appendDummyInput('WITH_STATEMENT')
            .appendField(Blockly.Words['exec_statement'][systemLang])
            .appendField(new Blockly.FieldCheckbox('FALSE', function (option) {
                var delayInput = (option == true);
                this.sourceBlock_.updateShape_(delayInput);
            }), 'WITH_STATEMENT');

        this.appendDummyInput('LOG')
            .appendField(Blockly.Words['exec_log'][systemLang])
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Words['exec_log_none'][systemLang],  ''],
                [Blockly.Words['exec_log_info'][systemLang],  'log'],
                [Blockly.Words['exec_log_debug'][systemLang], 'debug'],
                [Blockly.Words['exec_log_warn'][systemLang],  'warn'],
                [Blockly.Words['exec_log_error'][systemLang], 'error']
            ]), 'LOG');

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Action.HUE);
        this.setTooltip(Blockly.Words['exec_tooltip'][systemLang]);
        this.setHelpUrl(getHelp('exec_help'));
    },
    mutationToDom: function() {
        var container = document.createElement('mutation');
        container.setAttribute('with_statement', this.getFieldValue('WITH_STATEMENT') === 'TRUE');
        return container;
    },
    domToMutation: function(xmlElement) {
        this.updateShape_(xmlElement.getAttribute('with_statement') == 'true');
    },
    updateShape_: function(withStatement) {
        // Add or remove a statement Input.
        var inputExists = this.getInput('STATEMENT');

        if (withStatement) {
            if (!inputExists) {
                this.appendStatementInput('STATEMENT');
            }
        } else if (inputExists) {
            this.removeInput('STATEMENT');
        }
    }
};

Blockly.JavaScript['exec'] = function(block) {
    var logLevel = block.getFieldValue('LOG');
    var value_command = Blockly.JavaScript.valueToCode(block, 'COMMAND', Blockly.JavaScript.ORDER_ATOMIC);
    var withStatement = block.getFieldValue('WITH_STATEMENT');

    var logText;
    if (logLevel) {
        logText = 'console.' + logLevel + '("exec: " + ' + value_command + ');\n'
    } else {
        logText = '';
    }

    if (withStatement === 'TRUE') {
        var statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');
        if (statement) {
            return 'exec(' + value_command + ', function (error, result, stderr) {\n  ' + statement + '});\n' +
                logText;
        } else {
            return 'exec(' + value_command + ');\n' +
                logText;
        }
    } else {
        return 'exec(' + value_command + ');\n' +
            logText;
    }
};

// --- action request --------------------------------------------------
Blockly.Words['request']               = {'en': 'request',                     'de': 'request',                            'ru': 'request'};
Blockly.Words['request_url']           = {'en': 'URL',                         'de': 'URL',                                'ru': 'URL'};
Blockly.Words['request_statement']     = {'en': 'with results',                'de': 'mit Ergebnissen',                    'ru': 'анализировать результаты'};
Blockly.Words['request_tooltip']       = {'en': 'Request URL',                 'de': 'URL abfragen',                       'ru': 'Запросить URL'};
Blockly.Words['request_help']          = {'en': 'https://github.com/request/request', 'de': 'https://github.com/request/request', 'ru': 'https://github.com/request/request'};
Blockly.Words['request_log']           = {'en': 'log level',                   'de': 'Loglevel',                           'ru': 'Протокол'};
Blockly.Words['request_log_none']      = {'en': 'none',                        'de': 'keins',                              'ru': 'нет'};
Blockly.Words['request_log_info']      = {'en': 'info',                        'de': 'info',                               'ru': 'инфо'};
Blockly.Words['request_log_debug']     = {'en': 'debug',                       'de': 'debug',                              'ru': 'debug'};
Blockly.Words['request_log_warn']      = {'en': 'warning',                     'de': 'warning',                            'ru': 'warning'};
Blockly.Words['request_log_error']     = {'en': 'error',                       'de': 'error',                              'ru': 'ошибка'};

Blockly.Action.blocks['request'] =
    '<block type="request">'
    + '     <value name="URL">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">text</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="LOG">'
    + '     </value>'
    + '     <value name="WITH_STATEMENT">'
    + '     </value>'
    + '     <mutation with_statement="false"></mutation>'
    + '</block>';

Blockly.Blocks['request'] = {
    init: function() {
        this.appendDummyInput('TEXT')
            .appendField(Blockly.Words['request'][systemLang]);

        this.appendValueInput('URL')
            .appendField(Blockly.Words['request_url'][systemLang]);

        this.appendDummyInput('WITH_STATEMENT')
            .appendField(Blockly.Words['request_statement'][systemLang])
            .appendField(new Blockly.FieldCheckbox('FALSE', function (option) {
                var delayInput = (option == true);
                this.sourceBlock_.updateShape_(delayInput);
            }), 'WITH_STATEMENT');

        this.appendDummyInput('LOG')
            .appendField(Blockly.Words['request_log'][systemLang])
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Words['request_log_none'][systemLang],  ''],
                [Blockly.Words['request_log_info'][systemLang],  'log'],
                [Blockly.Words['request_log_debug'][systemLang], 'debug'],
                [Blockly.Words['request_log_warn'][systemLang],  'warn'],
                [Blockly.Words['request_log_error'][systemLang], 'error']
            ]), 'LOG');

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Action.HUE);
        this.setTooltip(Blockly.Words['request_tooltip'][systemLang]);
        this.setHelpUrl(Blockly.Words['request_help'][systemLang]);
    },
    mutationToDom: function() {
        var container = document.createElement('mutation');
        container.setAttribute('with_statement', this.getFieldValue('WITH_STATEMENT') === 'TRUE');
        return container;
    },
    domToMutation: function(xmlElement) {
        this.updateShape_(xmlElement.getAttribute('with_statement') == 'true');
    },
    updateShape_: function(withStatement) {
        // Add or remove a statement Input.
        var inputExists = this.getInput('STATEMENT');

        if (withStatement) {
            if (!inputExists) {
                this.appendStatementInput('STATEMENT');
            }
        } else if (inputExists) {
            this.removeInput('STATEMENT');
        }
    }
};

Blockly.JavaScript['request'] = function(block) {
    var logLevel = block.getFieldValue('LOG');
    var URL = Blockly.JavaScript.valueToCode(block, 'URL', Blockly.JavaScript.ORDER_ATOMIC);
    var withStatement = block.getFieldValue('WITH_STATEMENT');

    var logText;
    if (logLevel) {
        logText = 'console.' + logLevel + '("request: " + ' + URL + ');\n'
    } else {
        logText = '';
    }

    if (withStatement === 'TRUE') {
        var statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');
        if (statement) {
            return 'try {\n  require("request")(' + URL + ', function (error, response, result) {\n  ' + statement + '  });\n} catch (e) { console.error(e); }\n' +
                logText;
        } else {
            return 'try {\n  require("request")(' + URL + ');\n} catch (e) { console.error(e); }\n' +
                logText;
        }
    } else {
        return 'try {\n  require("request")(' + URL + ');\n} catch (e) { console.error(e); }\n' +
            logText;
    }
};
