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
            .appendField(Blockly.Translate('exec'));

        this.appendValueInput('COMMAND')
            .appendField(Blockly.Translate('exec_command'));

        this.appendDummyInput('WITH_STATEMENT')
            .appendField(Blockly.Translate('exec_statement'))
            .appendField(new Blockly.FieldCheckbox('FALSE', function (option) {
                this.sourceBlock_.updateShape_(option === true || option === 'true' || option === 'TRUE');
            }), 'WITH_STATEMENT');

        this.appendDummyInput('LOG')
            .appendField(Blockly.Translate('exec_log'))
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('exec_log_none'),  ''],
                [Blockly.Translate('exec_log_info'),  'log'],
                [Blockly.Translate('exec_log_debug'), 'debug'],
                [Blockly.Translate('exec_log_warn'),  'warn'],
                [Blockly.Translate('exec_log_error'), 'error']
            ]), 'LOG');

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Action.HUE);
        this.setTooltip(Blockly.Translate('exec_tooltip'));
        this.setHelpUrl(getHelp('exec_help'));
    },
    mutationToDom: function() {
        var container = document.createElement('mutation');
        var option = this.getFieldValue('WITH_STATEMENT');
        container.setAttribute('with_statement', option === true || option === 'true' || option === 'TRUE');
        return container;
    },
    domToMutation: function(xmlElement) {
        var option = xmlElement.getAttribute('with_statement');
        this.updateShape_(option === true || option === 'true' || option === 'TRUE');
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

    if (withStatement === 'TRUE' || withStatement === 'true' || withStatement === true) {
        var statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');
        if (statement) {
            return 'exec(' + value_command + ', async function (error, result, stderr) {\n  ' + statement + '});\n' +
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
            .appendField(Blockly.Translate('request'));

        this.appendValueInput('URL')
            .appendField(Blockly.Translate('request_url'));

        this.appendDummyInput('WITH_STATEMENT')
            .appendField(Blockly.Translate('request_statement'))
            .appendField(new Blockly.FieldCheckbox('FALSE', function (option) {
                this.sourceBlock_.updateShape_(option === true || option === 'true' || option === 'TRUE');
            }), 'WITH_STATEMENT');

        this.appendDummyInput('LOG')
            .appendField(Blockly.Translate('request_log'))
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('request_log_none'),  ''],
                [Blockly.Translate('request_log_info'),  'log'],
                [Blockly.Translate('request_log_debug'), 'debug'],
                [Blockly.Translate('request_log_warn'),  'warn'],
                [Blockly.Translate('request_log_error'), 'error']
            ]), 'LOG');

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Action.HUE);
        this.setTooltip(Blockly.Translate('request_tooltip'));
        this.setHelpUrl(Blockly.Translate('request_help'));
    },
    mutationToDom: function() {
        var container = document.createElement('mutation');
        var withStatement = this.getFieldValue('WITH_STATEMENT') ;
        container.setAttribute('with_statement', withStatement === true || withStatement === 'true' || withStatement === 'TRUE');
        return container;
    },
    domToMutation: function(xmlElement) {
        var option = xmlElement.getAttribute('with_statement');
        this.updateShape_(option === true || option === 'true' || option === 'TRUE');
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

    if (withStatement === 'TRUE' || withStatement === 'true' || withStatement === true) {
        var statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');
        if (statement) {
            return 'try {\n  require("request")(' + URL + ', async function (error, response, result) {\n  ' + statement + '  }).on("error", function (e) {console.error(e);});\n} catch (e) { console.error(e); }\n' +
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
