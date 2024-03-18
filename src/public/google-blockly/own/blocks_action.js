'use strict';

if (typeof goog !== 'undefined') {
    goog.provide('Blockly.JavaScript.Action');

    goog.require('Blockly.JavaScript');
}

Blockly.CustomBlocks = Blockly.CustomBlocks || [];
Blockly.CustomBlocks.push('Action');

Blockly.Action = {
    HUE: 330,
    blocks: {},
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
        const container = document.createElement('mutation');
        const option = this.getFieldValue('WITH_STATEMENT');

        container.setAttribute('with_statement', option === true || option === 'true' || option === 'TRUE');

        return container;
    },
    domToMutation: function(xmlElement) {
        const option = xmlElement.getAttribute('with_statement');

        this.updateShape_(option === true || option === 'true' || option === 'TRUE');
    },
    updateShape_: function(withStatement) {
        // Add or remove a statement Input.
        const inputExists = this.getInput('STATEMENT');

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
    const logLevel = block.getFieldValue('LOG');
    const value_command = Blockly.JavaScript.valueToCode(block, 'COMMAND', Blockly.JavaScript.ORDER_ATOMIC);
    const withStatement = block.getFieldValue('WITH_STATEMENT');

    let logText;
    if (logLevel) {
        logText = 'console.' + logLevel + '("exec: " + ' + value_command + ');\n'
    } else {
        logText = '';
    }

    if (withStatement === 'TRUE' || withStatement === 'true' || withStatement === true) {
        const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');
        if (statement) {
            return 'exec(' + value_command + ', async (error, result, stderr) => {\n' + statement + '});\n' +
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

// --- action http_get --------------------------------------------------
Blockly.Action.blocks['http_get'] =
    '<block type="http_get">'
    + '     <value name="URL">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">http://</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="STATEMENT">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['http_get'] = {
    init: function() {
        this.appendValueInput('URL')
            .appendField(Blockly.Translate('http_get'));

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Action.HUE);
        this.setTooltip(Blockly.Translate('http_get_tooltip'));
        this.setHelpUrl(getHelp('http_get_help'));
    }
};

Blockly.JavaScript['http_get'] = function(block) {
    const URL = Blockly.JavaScript.valueToCode(block, 'URL', Blockly.JavaScript.ORDER_ATOMIC);
    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    return `httpGet(${URL}, { timeout: 2000 }, async (err, response) => {\n` +
        Blockly.JavaScript.prefixLines(`if (err) {`, Blockly.JavaScript.INDENT) + '\n' +
        Blockly.JavaScript.prefixLines(`console.error(err);`, Blockly.JavaScript.INDENT + Blockly.JavaScript.INDENT) + '\n' +
        Blockly.JavaScript.prefixLines(`}`, Blockly.JavaScript.INDENT) + '\n' +
        statement +
        '});\n';
};

// --- action http_post --------------------------------------------------
Blockly.Action.blocks['http_post'] =
    '<block type="http_post">'
    + '     <value name="URL">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">http://</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="DATA">'
    + '         <shadow type="object_new">'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="STATEMENT">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['http_post'] = {
    init: function() {
        this.appendValueInput('URL')
            .appendField(Blockly.Translate('http_post'));

        this.appendValueInput('DATA')
            .appendField(Blockly.Translate('http_post_data'));

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Action.HUE);
        this.setTooltip(Blockly.Translate('http_post_tooltip'));
        this.setHelpUrl(getHelp('http_post_help'));
    }
};

Blockly.JavaScript['http_post'] = function(block) {
    const URL = Blockly.JavaScript.valueToCode(block, 'URL', Blockly.JavaScript.ORDER_ATOMIC);
    const data = Blockly.JavaScript.valueToCode(block, 'DATA', Blockly.JavaScript.ORDER_ATOMIC);
    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    if (!data) {
        data = '{}';
    }

    return `httpPost(${URL}, ${data}, { timeout: 2000 }, async (err, response) => {\n` +
        Blockly.JavaScript.prefixLines(`if (err) {`, Blockly.JavaScript.INDENT) + '\n' +
        Blockly.JavaScript.prefixLines(`console.error(err);`, Blockly.JavaScript.INDENT + Blockly.JavaScript.INDENT) + '\n' +
        Blockly.JavaScript.prefixLines(`}`, Blockly.JavaScript.INDENT) + '\n' +
        statement +
        '});\n';
};

// --- get info about event -----------------------------------------------------------
Blockly.Action.blocks['http_response'] =
    '<block type="http_response">'
    + '     <value name="ATTR">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['http_response'] = {
    /**
     * Block for conditionally returning a value from a procedure.
     * @this Blockly.Block
     */
    init: function() {
        this.appendDummyInput()
            .appendField('🌐');

        this.appendDummyInput('ATTR')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('http_response_data'), 'response.data'],
                [Blockly.Translate('http_response_statuscode'), 'response.statusCode'],
            ]), 'ATTR');

        this.setInputsInline(true);
        this.setOutput(true);
        this.setColour(Blockly.Trigger.HUE);
        this.setTooltip(Blockly.Translate('http_response_tooltip'));
        //this.setHelpUrl(getHelp('http_response'));
    },
    /**
     * Called whenever anything on the workspace changes.
     * Add warning if this flow block is not nested inside a loop.
     * @param {!Blockly.Events.Abstract} e Change event.
     * @this Blockly.Block
     */
    onchange: function(e) {
        let legal = false;
        // Is the block nested in a trigger?
        let block = this;
        do {
            if (this.FUNCTION_TYPES.includes(block.type)) {
                legal = true;
                break;
            }
            block = block.getSurroundParent();
        } while (block);

        if (legal) {
            this.setWarningText(null, this.id);
        } else {
            this.setWarningText(Blockly.Translate('http_response_warning'), this.id);
        }
    },
    /**
     * List of block types that are functions and thus do not need warnings.
     * To add a new function type add this to your code:
     * Blockly.Blocks['procedures_ifreturn'].FUNCTION_TYPES.push('custom_func');
     */
    FUNCTION_TYPES: ['http_get', 'http_post'],
};
Blockly.JavaScript['http_response'] = function(block) {
    const attr = block.getFieldValue('ATTR');

    return [attr, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- action request --------------------------------------------------
Blockly.Action.blocks['request'] =
    '<block type="request">'
    + '     <value name="URL">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">http://</field>'
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
        const container = document.createElement('mutation');
        const withStatement = this.getFieldValue('WITH_STATEMENT');

        container.setAttribute('with_statement', withStatement === true || withStatement === 'true' || withStatement === 'TRUE');

        return container;
    },
    domToMutation: function(xmlElement) {
        const option = xmlElement.getAttribute('with_statement');

        this.updateShape_(option === true || option === 'true' || option === 'TRUE');
    },
    updateShape_: function(withStatement) {
        // Add or remove a statement Input.
        const inputExists = this.getInput('STATEMENT');

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
    const logLevel = block.getFieldValue('LOG');
    const URL = Blockly.JavaScript.valueToCode(block, 'URL', Blockly.JavaScript.ORDER_ATOMIC);
    const withStatement = block.getFieldValue('WITH_STATEMENT');

    let logText;
    if (logLevel) {
        logText = `console.` + logLevel + `('request: ' + ` + URL + `);\n`;
    } else {
        logText = '';
    }

    logText += `console.warn('request blockly block is deprecated - please use "http get" instead');\n`;

    if (withStatement === 'TRUE' || withStatement === 'true' || withStatement === true) {
        const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');
        if (statement) {
            return 'try {\n  require("request")(' + URL + ', async (error, response, result) => {\n  ' + statement + '  }).on("error", (e) => { console.error(e); });\n} catch (e) { console.error(e); }\n' + logText;
        } else {
            return 'try {\n  require("request")(' + URL + ').on("error", (e) => { console.error(e); });\n} catch (e) { console.error(e); }\n' + logText;
        }
    } else {
        return 'try {\n  require("request")(' + URL + ').on("error", (e) => { console.error(e); });\n} catch (e) { console.error(e); }\n' + logText;
    }
};
