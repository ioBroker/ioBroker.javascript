'use strict';

if (typeof goog !== 'undefined') {
    goog.provide('Blockly.JavaScript.Action');

    goog.require('Blockly.JavaScript');
}

Blockly.CustomBlocks = Blockly.CustomBlocks || [];
Blockly.CustomBlocks.push('Action');

Blockly.Action = {
    HUE: 330,
    blocks: {}
};

// --- action exec --------------------------------------------------

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
            return 'try {\n  require("request")(' + URL + ', function (error, response, result) {\n  ' + statement + '  }).on("error", function (e) {console.error(e);});\n} catch (e) { console.error(e); }\n' +
                logText;
        } else {
            return 'try {\n  require("request")(' + URL + ').on("error", function (e) {console.error(e);});\n} catch (e) { console.error(e); }\n' +
                logText;
        }
    } else {
        return 'try {\n  require("request")(' + URL + ').on("error", function (e) {console.error(e);});\n} catch (e) { console.error(e); }\n' +
            logText;
    }
};
