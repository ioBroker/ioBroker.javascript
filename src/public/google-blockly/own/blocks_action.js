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
    + '             <field name="TEXT">pwd</field>'
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
            .appendField('» ' + Blockly.Translate('exec'));

        this.appendValueInput('COMMAND')
            .appendField(Blockly.Translate('exec_command'));

        this.appendDummyInput('WITH_STATEMENT')
            .appendField(Blockly.Translate('exec_statement'))
            .appendField(new Blockly.FieldCheckbox('FALSE', function (option) {
                this.sourceBlock_.updateShape_(option === true || option === 'true' || option === 'TRUE');
            }), 'WITH_STATEMENT');

        this.appendDummyInput('LOG')
            .appendField(Blockly.Translate('loglevel'))
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('loglevel_none'),  ''],
                [Blockly.Translate('loglevel_debug'), 'debug'],
                [Blockly.Translate('loglevel_info'),  'info'],
                [Blockly.Translate('loglevel_warn'),  'warn'],
                [Blockly.Translate('loglevel_error'), 'error'],
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
    const value_command = Blockly.JavaScript.valueToCode(block, 'COMMAND', Blockly.JavaScript.ORDER_ATOMIC);
    const logLevel = block.getFieldValue('LOG');
    const withStatement = block.getFieldValue('WITH_STATEMENT');

    let logText;
    if (logLevel) {
        logText = `console.${logLevel}('exec: ' + ${value_command});\n`;
    } else {
        logText = '';
    }

    if (withStatement === 'TRUE' || withStatement === 'true' || withStatement === true) {
        const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');
        if (statement) {
            return `exec(${value_command}, async (error, result, stderr) => {\n` +
                statement +
                `});\n${logText}`;
        } else {
            return `exec(${value_command});\n${logText}`;
        }
    } else {
        return `exec(${value_command});\n${logText}`;
    }
};

// --- exec_result -----------------------------------------------------------
Blockly.Action.blocks['exec_result'] =
    '<block type="exec_result">'
    + '     <value name="ATTR">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['exec_result'] = {
    /**
     * Block for conditionally returning a value from a procedure.
     * @this Blockly.Block
     */
    init: function() {
        this.appendDummyInput()
            .appendField('»');

        this.appendDummyInput('ATTR')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('exec_result_result'), 'result'],
                [Blockly.Translate('exec_result_stderr'), 'stderr'],
                [Blockly.Translate('exec_result_error'), 'error'],
            ]), 'ATTR');

        this.setInputsInline(true);
        this.setOutput(true);
        this.setColour(Blockly.Action.HUE);
        this.setTooltip(Blockly.Translate('exec_result_tooltip'));
        this.setHelpUrl(getHelp('exec_help'));
    },
    /**
     * Called whenever anything on the workspace changes.
     * Add warning if this flow block is not nested inside a loop.
     * @param {!Blockly.Events.Abstract} e Change event.
     * @this Blockly.Block
     */
    onchange: function(e) {
        let legal = false;
        // Is the block nested in an exec?
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
            this.setWarningText(Blockly.Translate('exec_result_warning'), this.id);
        }
    },
    /**
     * List of block types that are functions and thus do not need warnings.
     * To add a new function type add this to your code:
     * Blockly.Blocks['procedures_ifreturn'].FUNCTION_TYPES.push('custom_func');
     */
    FUNCTION_TYPES: ['exec'],
};
Blockly.JavaScript['exec_result'] = function(block) {
    const attr = block.getFieldValue('ATTR');

    return [attr, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- action http_get --------------------------------------------------
Blockly.Action.blocks['http_get'] =
    '<block type="http_get">'
    + '     <value name="URL">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">http://</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="TIMEOUT">'
    + '     </value>'
    + '     <value name="UNIT">'
    + '     </value>'
    + '     <value name="TYPE">'
    + '     </value>'
    + '     <value name="STATEMENT">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['http_get'] = {
    init: function() {
        this.appendValueInput('URL')
            .appendField('🌐 ' + Blockly.Translate('http_get'));

        this.appendDummyInput()
            .appendField(Blockly.Translate('http_timeout'))
            .appendField(new Blockly.FieldTextInput(2000), 'TIMEOUT')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('http_timeout_ms'), 'ms'],
                [Blockly.Translate('http_timeout_sec'), 'sec'],
            ]), 'UNIT');

        this.appendDummyInput('TYPE')
            .appendField(Blockly.Translate('http_type'))
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('http_type_text'),  'text'],
                [Blockly.Translate('http_type_arraybuffer'), 'arraybuffer'],
            ]), 'TYPE');

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
    const unit = block.getFieldValue('UNIT');
    let timeout = block.getFieldValue('TIMEOUT');
    if (isNaN(timeout)) {
        timeout = 2000;
    }
    if (unit === 'sec') {
        timeout *= 1000;
    }

    let responseType = block.getFieldValue('TYPE');
    if (!responseType) {
        responseType = 'text';
    }

    return `httpGet(${URL}, { timeout: ${timeout}, responseType: '${responseType}' }, async (err, response) => {\n` +
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
    + '     <value name="TIMEOUT">'
    + '     </value>'
    + '     <value name="UNIT">'
    + '     </value>'
    + '     <value name="TYPE">'
    + '     </value>'
    + '     <value name="DATA">'
    + '         <shadow type="logic_null">'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="STATEMENT">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['http_post'] = {
    init: function() {
        this.appendValueInput('URL')
            .appendField('🌐 ' + Blockly.Translate('http_post'));

        this.appendDummyInput()
            .appendField(Blockly.Translate('http_timeout'))
            .appendField(new Blockly.FieldTextInput(2000), 'TIMEOUT')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('http_timeout_ms'), 'ms'],
                [Blockly.Translate('http_timeout_sec'), 'sec'],
            ]), 'UNIT');

        this.appendDummyInput('TYPE')
            .appendField(Blockly.Translate('http_type'))
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('http_type_text'),  'text'],
                [Blockly.Translate('http_type_arraybuffer'), 'arraybuffer'],
            ]), 'TYPE');

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
    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');
    const unit = block.getFieldValue('UNIT');

    let timeout = block.getFieldValue('TIMEOUT');
    if (isNaN(timeout)) {
        timeout = 2000;
    }
    if (unit === 'sec') {
        timeout *= 1000;
    }

    let responseType = block.getFieldValue('TYPE');
    if (!responseType) {
        responseType = 'text';
    }

    let data = Blockly.JavaScript.valueToCode(block, 'DATA', Blockly.JavaScript.ORDER_ATOMIC);
    if (!data) {
        data = 'null';
    }

    return `httpPost(${URL}, ${data}, { timeout: ${timeout}, responseType: '${responseType}' }, async (err, response) => {\n` +
        Blockly.JavaScript.prefixLines(`if (err) {`, Blockly.JavaScript.INDENT) + '\n' +
        Blockly.JavaScript.prefixLines(`console.error(err);`, Blockly.JavaScript.INDENT + Blockly.JavaScript.INDENT) + '\n' +
        Blockly.JavaScript.prefixLines(`}`, Blockly.JavaScript.INDENT) + '\n' +
        statement +
        '});\n';
};

// --- http_response -----------------------------------------------------------
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
        this.setColour(Blockly.Action.HUE);
        this.setTooltip(Blockly.Translate('http_response_tooltip'));
        //this.setHelpUrl(getHelp('http_response_help'));
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

// --- action file_write --------------------------------------------------
Blockly.Action.blocks['file_write'] =
    '<block type="file_write">'
    + '     <value name="OID">'
    + '         <shadow type="field_oid_meta">'
    + '             <field name="oid">0_userdata.0</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="FILE">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">demo.json</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="DATA">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['file_write'] = {
    init: function() {
        this.appendValueInput('OID')
            .appendField('📁 ' + Blockly.Translate('file_write'));

        this.appendValueInput('FILE')
            .appendField(Blockly.Translate('file_write_filename'))
            .setCheck(null);

        this.appendValueInput('DATA')
            .appendField(Blockly.Translate('file_write_data'));

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Action.HUE);
        this.setTooltip(Blockly.Translate('file_write_tooltip'));
        this.setHelpUrl(getHelp('file_write_help'));
    }
};

Blockly.JavaScript['file_write'] = function(block) {
    const value_objectid = Blockly.JavaScript.valueToCode(block, 'OID', Blockly.JavaScript.ORDER_ATOMIC);
    const file = Blockly.JavaScript.valueToCode(block, 'FILE', Blockly.JavaScript.ORDER_ATOMIC);
    const data = Blockly.JavaScript.valueToCode(block, 'DATA', Blockly.JavaScript.ORDER_ATOMIC);

    let objectName = '';
    try {
        const objId = eval(value_objectid); // Code to string
        objectName = main.objects[objId] && main.objects[objId].common && main.objects[objId].common.name ? main.objects[objId].common.name : '';
        if (typeof objectName === 'object') {
            objectName = objectName[systemLang] || objectName.en;
        }
    } catch (error) {
        
    }

    return `writeFile(${value_objectid}${objectName ? ` /* ${objectName} */` : ''}, String(${file}), ${data ? data : 'null'}, (err) => {\n` +
        Blockly.JavaScript.prefixLines(`if (err) {`, Blockly.JavaScript.INDENT) + '\n' +
        Blockly.JavaScript.prefixLines(`console.error(err);`, Blockly.JavaScript.INDENT + Blockly.JavaScript.INDENT) + '\n' +
        Blockly.JavaScript.prefixLines(`}`, Blockly.JavaScript.INDENT) + '\n' +
        '});\n';
};

// --- action file_read --------------------------------------------------
Blockly.Action.blocks['file_read'] =
    '<block type="file_read">'
    + '     <value name="OID">'
    + '         <shadow type="field_oid_meta">'
    + '             <field name="oid">0_userdata.0</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="FILE">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">demo.json</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="STATEMENT">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['file_read'] = {
    init: function() {
        this.appendValueInput('OID')
            .appendField('📁 ' + Blockly.Translate('file_read'));

        this.appendValueInput('FILE')
            .appendField(Blockly.Translate('file_read_filename'))
            .setCheck(null);

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Action.HUE);
        this.setTooltip(Blockly.Translate('file_read_tooltip'));
        this.setHelpUrl(getHelp('file_read_help'));
    }
};

Blockly.JavaScript['file_read'] = function(block) {
    const value_objectid = Blockly.JavaScript.valueToCode(block, 'OID', Blockly.JavaScript.ORDER_ATOMIC);
    const file = Blockly.JavaScript.valueToCode(block, 'FILE', Blockly.JavaScript.ORDER_ATOMIC);
    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    let objectName = '';
    try {
        const objId = eval(value_objectid); // Code to string
        objectName = main.objects[objId] && main.objects[objId].common && main.objects[objId].common.name ? main.objects[objId].common.name : '';
        if (typeof objectName === 'object') {
            objectName = objectName[systemLang] || objectName.en;
        }
    } catch (error) {
        
    }

    return `readFile(${value_objectid}${objectName ? ` /* ${objectName} */` : ''}, String(${file}), (err, data, mimeType) => {\n` +
        Blockly.JavaScript.prefixLines(`if (err) {`, Blockly.JavaScript.INDENT) + '\n' +
        Blockly.JavaScript.prefixLines(`console.error(err);`, Blockly.JavaScript.INDENT + Blockly.JavaScript.INDENT) + '\n' +
        Blockly.JavaScript.prefixLines(`}`, Blockly.JavaScript.INDENT) + '\n' +
        statement +
        '});\n';
};

// --- file_data -----------------------------------------------------------
Blockly.Action.blocks['file_data'] =
    '<block type="file_data">'
    + '     <value name="ATTR">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['file_data'] = {
    /**
     * Block for conditionally returning a value from a procedure.
     * @this Blockly.Block
     */
    init: function() {
        this.appendDummyInput()
            .appendField('📁');

        this.appendDummyInput('ATTR')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('file_data_data'), 'data'],
                [Blockly.Translate('file_data_mimeType'), 'mimeType'],
            ]), 'ATTR');

        this.setInputsInline(true);
        this.setOutput(true);
        this.setColour(Blockly.Action.HUE);
        this.setTooltip(Blockly.Translate('file_data_tooltip'));
        //this.setHelpUrl(getHelp('file_data'));
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
            this.setWarningText(Blockly.Translate('file_data_warning'), this.id);
        }
    },
    /**
     * List of block types that are functions and thus do not need warnings.
     * To add a new function type add this to your code:
     * Blockly.Blocks['procedures_ifreturn'].FUNCTION_TYPES.push('custom_func');
     */
    FUNCTION_TYPES: ['file_read'],
};
Blockly.JavaScript['file_data'] = function(block) {
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
            .appendField(Blockly.Translate('loglevel'))
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('loglevel_none'),  ''],
                [Blockly.Translate('loglevel_debug'), 'debug'],
                [Blockly.Translate('loglevel_info'),  'info'],
                [Blockly.Translate('loglevel_warn'),  'warn'],
                [Blockly.Translate('loglevel_error'), 'error'],
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

    logText += `console.warn('request blockly block is deprecated - please use "http (GET)" instead');\n`;

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
