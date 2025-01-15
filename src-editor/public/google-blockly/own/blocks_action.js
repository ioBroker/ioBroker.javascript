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
    '<block type="exec">' +
    '  <mutation with_statement="false"></mutation>' +
    '  <field name="WITH_STATEMENT">FALSE</field>' +
    '  <field name="LOG"></field>' +
    '  <value name="COMMAND">' +
    '    <shadow type="text">' +
    '      <field name="TEXT">pwd</field>' +
    '    </shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['exec'] = {
    init: function () {
        this.appendDummyInput('TEXT')
            .appendField('» ' + Blockly.Translate('exec'));

        this.appendValueInput('COMMAND')
            .appendField(Blockly.Translate('exec_command'));

        this.appendDummyInput('WITH_STATEMENT')
            .appendField(Blockly.Translate('with_results'))
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
    mutationToDom: function () {
        const container = document.createElement('mutation');
        const option = this.getFieldValue('WITH_STATEMENT');

        container.setAttribute('with_statement', option === true || option === 'true' || option === 'TRUE');

        return container;
    },
    domToMutation: function (xmlElement) {
        const option = xmlElement.getAttribute('with_statement');

        this.updateShape_(option === true || option === 'true' || option === 'TRUE');
    },
    updateShape_: function (withStatement) {
        // Add or remove a statement Input.
        const inputExists = this.getInput('STATEMENT');

        if (withStatement) {
            if (!inputExists) {
                this.appendStatementInput('STATEMENT');
            }
        } else if (inputExists) {
            this.removeInput('STATEMENT');
        }
    },
};

Blockly.JavaScript.forBlock['exec'] = function (block) {
    const vCommand = Blockly.JavaScript.valueToCode(block, 'COMMAND', Blockly.JavaScript.ORDER_ATOMIC);
    const fLog = block.getFieldValue('LOG');
    const fWithStatement = block.getFieldValue('WITH_STATEMENT');

    let logText = '';
    if (fLog) {
        logText = `console.${fLog}('exec: ' + ${vCommand});\n`;
    }

    if (fWithStatement === 'TRUE' || fWithStatement === 'true' || fWithStatement === true) {
        const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');
        if (statement) {
            return `exec(${vCommand}, async (error, result, stderr) => {\n${statement}});\n${logText}`;
        }

        return `exec(${vCommand});\n${logText}`;
    }

    return `exec(${vCommand});\n${logText}`;
};

// --- exec_result -----------------------------------------------------------
Blockly.Action.blocks['exec_result'] =
    '<sep gap="5"></sep>' +
    '<block type="exec_result">' +
    '  <field name="ATTR">result</field>' +
    '</block>';

Blockly.Blocks['exec_result'] = {
    /**
     * Block for conditionally returning a value from a procedure.
     * @this Blockly.Block
     */
    init: function () {
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
    onchange: function (e) {
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
Blockly.JavaScript.forBlock['exec_result'] = function (block) {
    const attr = block.getFieldValue('ATTR');

    return [attr, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- action http_get --------------------------------------------------
Blockly.Action.blocks['http_get'] =
    '<block type="http_get">' +
    '  <field name="TIMEOUT">2000</field>' +
    '  <field name="UNIT">ms</field>' +
    '  <field name="TYPE">text</field>' +
    '  <value name="URL">' +
    '    <shadow type="text">' +
    '      <field name="TEXT">http://</field>' +
    '    </shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['http_get'] = {
    init: function () {
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
                [Blockly.Translate('http_type_text'), 'text'],
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
    },
};

Blockly.JavaScript.forBlock['http_get'] = function (block) {
    const vUrl = Blockly.JavaScript.valueToCode(block, 'URL', Blockly.JavaScript.ORDER_ATOMIC);
    const fUnit = block.getFieldValue('UNIT');

    let fTimeout = block.getFieldValue('TIMEOUT');
    if (Number.isNaN(fTimeout)) {
        fTimeout = 2000;
    }
    if (fUnit === 'sec') {
        fTimeout *= 1000;
    }

    let responseType = block.getFieldValue('TYPE');
    if (!responseType) {
        responseType = 'text';
    }

    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    return `httpGet(${vUrl}, { timeout: ${fTimeout}, responseType: '${responseType}' }, async (err, response) => {\n` +
        statement +
        '});\n';
};

// --- action http_post --------------------------------------------------
Blockly.Action.blocks['http_post'] =
    '<sep gap="5"></sep>' +
    '<block type="http_post">' +
    '  <field name="TIMEOUT">2000</field>' +
    '  <field name="UNIT">ms</field>' +
    '  <field name="TYPE">text</field>' +
    '  <value name="URL">' +
    '    <shadow type="text">' +
    '      <field name="TEXT">http://</field>' +
    '    </shadow>' +
    '  </value>' +
    '  <value name="DATA">' +
    '    <shadow type="logic_null"></shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['http_post'] = {
    init: function () {
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
                [Blockly.Translate('http_type_text'), 'text'],
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
    },
};

Blockly.JavaScript.forBlock['http_post'] = function (block) {
    const vUrl = Blockly.JavaScript.valueToCode(block, 'URL', Blockly.JavaScript.ORDER_ATOMIC);
    const fUnit = block.getFieldValue('UNIT');

    let fTimeout = block.getFieldValue('TIMEOUT');
    if (isNaN(fTimeout)) {
        fTimeout = 2000;
    }
    if (fUnit === 'sec') {
        fTimeout *= 1000;
    }

    let fType = block.getFieldValue('TYPE');
    if (!fType) {
        fType = 'text';
    }

    let vData = Blockly.JavaScript.valueToCode(block, 'DATA', Blockly.JavaScript.ORDER_ATOMIC);
    if (!vData) {
        vData = 'null';
    }

    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    return `httpPost(${vUrl}, ${vData}, { timeout: ${fTimeout}, responseType: '${fType}' }, async (err, response) => {\n` +
        statement +
        '});\n';
};

// --- http_response -----------------------------------------------------------
Blockly.Action.blocks['http_response'] =
    '<sep gap="5"></sep>' +
    '<block type="http_response">' +
    '  <field name="ATTR">response.data</field>' +
    '</block>';

Blockly.Blocks['http_response'] = {
    /**
     * Block for conditionally returning a value from a procedure.
     * @this Blockly.Block
     */
    init: function () {
        this.appendDummyInput()
            .appendField('🌐');

        this.appendDummyInput('ATTR')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('http_response_data'), 'response.data'],
                [Blockly.Translate('http_response_statuscode'), 'response.statusCode'],
                [Blockly.Translate('http_response_responsetime'), 'response.responseTime'],
                [Blockly.Translate('http_response_headers'), 'response.headers'],
                [Blockly.Translate('http_response_error'), 'err'],
            ]), 'ATTR');

        this.setInputsInline(true);
        this.setOutput(true);

        this.setColour(Blockly.Action.HUE);

        this.setTooltip(Blockly.Translate('http_response_tooltip'));
        this.setHelpUrl(getHelp('http_response_help'));
    },
    /**
     * Called whenever anything on the workspace changes.
     * Add warning if this flow block is not nested inside a loop.
     * @param {!Blockly.Events.Abstract} e Change event.
     * @this Blockly.Block
     */
    onchange: function (e) {
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
Blockly.JavaScript.forBlock['http_response'] = function (block) {
    const attr = block.getFieldValue('ATTR');

    return [attr, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- http_response_tofile -----------------------------------------------------------
Blockly.Action.blocks['http_response_tofile'] =
    '<sep gap="5"></sep>' +
    '<block type="http_response_tofile">' +
    '  <value name="FILENAME">' +
    '    <shadow type="text">' +
    '      <field name="TEXT">temp.jpg</field>' +
    '    </shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['http_response_tofile'] = {
    /**
     * Block for conditionally returning a value from a procedure.
     * @this Blockly.Block
     */
    init: function () {
        this.appendDummyInput()
            .appendField('🌐 ' + Blockly.Translate('http_response_tofile'));

        this.appendValueInput('FILENAME')
            .appendField(Blockly.Translate('http_response_tofile_filename'))
            .setCheck(null);

        this.setInputsInline(false);
        this.setOutput(true, 'String');

        this.setColour(Blockly.Action.HUE);

        this.setTooltip(Blockly.Translate('http_response_tofile_tooltip'));
        this.setHelpUrl(getHelp('http_response_tofile_help'));
    },
    /**
     * Called whenever anything on the workspace changes.
     * Add warning if this flow block is not nested inside a loop.
     * @param {!Blockly.Events.Abstract} e Change event.
     * @this Blockly.Block
     */
    onchange: function (e) {
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
Blockly.JavaScript.forBlock['http_response_tofile'] = function (block) {
    const vFileName = Blockly.JavaScript.valueToCode(block, 'FILENAME', Blockly.JavaScript.ORDER_ATOMIC);

    return [`createTempFile(${vFileName}, response.data)`, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- action file_write --------------------------------------------------
Blockly.Action.blocks['file_write'] =
    '<block type="file_write">' +
    '  <value name="OID">' +
    '    <shadow type="field_oid_meta">' +
    '      <field name="oid">0_userdata.0</field>' +
    '    </shadow>' +
    '  </value>' +
    '  <value name="FILE">' +
    '    <shadow type="text">' +
    '      <field name="TEXT">demo.json</field>' +
    '    </shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['file_write'] = {
    init: function () {
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
    },
};

Blockly.JavaScript.forBlock['file_write'] = function (block) {
    const vObjId = Blockly.JavaScript.valueToCode(block, 'OID', Blockly.JavaScript.ORDER_ATOMIC);
    const vFile = Blockly.JavaScript.valueToCode(block, 'FILE', Blockly.JavaScript.ORDER_ATOMIC);
    const vData = Blockly.JavaScript.valueToCode(block, 'DATA', Blockly.JavaScript.ORDER_ATOMIC);

    let objectName = '';
    try {
        const objId = eval(vObjId); // Code to string
        objectName = main.objects[objId] && main.objects[objId].common && main.objects[objId].common.name ? main.objects[objId].common.name : '';
        if (typeof objectName === 'object') {
            objectName = objectName[systemLang] || objectName.en;
        }
    } catch (error) {
        
    }

    return `writeFile(${vObjId}${objectName ? ` /* ${objectName} */` : ''}, String(${vFile}), ${vData ? vData : 'null'}, (err) => {\n` +
        Blockly.JavaScript.prefixLines(`if (err) {`, Blockly.JavaScript.INDENT) + '\n' +
        Blockly.JavaScript.prefixLines(`console.error(err);`, Blockly.JavaScript.INDENT + Blockly.JavaScript.INDENT) + '\n' +
        Blockly.JavaScript.prefixLines(`}`, Blockly.JavaScript.INDENT) + '\n' +
        '});\n';
};

// --- action file_read --------------------------------------------------
Blockly.Action.blocks['file_read'] =
    '<sep gap="5"></sep>' +
    '<block type="file_read">' +
    '  <value name="OID">' +
    '    <shadow type="field_oid_meta">' +
    '      <field name="oid">0_userdata.0</field>' +
    '    </shadow>' +
    '  </value>' +
    '  <value name="FILE">' +
    '    <shadow type="text">' +
    '      <field name="TEXT">demo.json</field>' +
    '    </shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['file_read'] = {
    init: function () {
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
    },
};

Blockly.JavaScript.forBlock['file_read'] = function (block) {
    const vObjId = Blockly.JavaScript.valueToCode(block, 'OID', Blockly.JavaScript.ORDER_ATOMIC);
    const vFile = Blockly.JavaScript.valueToCode(block, 'FILE', Blockly.JavaScript.ORDER_ATOMIC);
    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    let objectName = '';
    try {
        const objId = eval(vObjId); // Code to string
        objectName = main.objects[objId] && main.objects[objId].common && main.objects[objId].common.name ? main.objects[objId].common.name : '';
        if (typeof objectName === 'object') {
            objectName = objectName[systemLang] || objectName.en;
        }
    } catch (error) {
        
    }

    return `readFile(${vObjId}${objectName ? ` /* ${objectName} */` : ''}, String(${vFile}), (err, data, mimeType) => {\n` +
        Blockly.JavaScript.prefixLines(`if (err) {`, Blockly.JavaScript.INDENT) + '\n' +
        Blockly.JavaScript.prefixLines(`console.error(err);`, Blockly.JavaScript.INDENT + Blockly.JavaScript.INDENT) + '\n' +
        Blockly.JavaScript.prefixLines(`}`, Blockly.JavaScript.INDENT) + '\n' +
        statement +
        '});\n';
};

// --- file_data -----------------------------------------------------------
Blockly.Action.blocks['file_data'] =
    '<sep gap="5"></sep>' +
    '<block type="file_data">' +
    '  <field name="ATTR">data</field>' +
    '</block>';

Blockly.Blocks['file_data'] = {
    /**
     * Block for conditionally returning a value from a procedure.
     * @this Blockly.Block
     */
    init: function () {
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
    onchange: function (e) {
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
Blockly.JavaScript.forBlock['file_data'] = function (block) {
    const vAttr = block.getFieldValue('ATTR');

    return [vAttr, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- action request --------------------------------------------------
Blockly.Action.blocks['request'] =
    '<block type="request">' +
    '  <mutation with_statement="false"></mutation>' +
    '  <field name="WITH_STATEMENT">FALSE</field>' +
    '  <field name="LOG"></field>' +
    '  <value name="URL">' +
    '    <shadow type="text">' +
    '      <field name="TEXT">http://</field>' +
    '    </shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['request'] = {
    init: function () {
        this.appendDummyInput('TEXT')
            .appendField(Blockly.Translate('request'));

        this.appendValueInput('URL')
            .appendField(Blockly.Translate('request_url'));

        this.appendDummyInput('WITH_STATEMENT')
            .appendField(Blockly.Translate('with_results'))
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
    mutationToDom: function () {
        const container = document.createElement('mutation');
        const withStatement = this.getFieldValue('WITH_STATEMENT');

        container.setAttribute('with_statement', withStatement === true || withStatement === 'true' || withStatement === 'TRUE');

        return container;
    },
    domToMutation: function (xmlElement) {
        const option = xmlElement.getAttribute('with_statement');

        this.updateShape_(option === true || option === 'true' || option === 'TRUE');
    },
    updateShape_: function (withStatement) {
        // Add or remove a statement Input.
        const inputExists = this.getInput('STATEMENT');

        if (withStatement) {
            if (!inputExists) {
                this.appendStatementInput('STATEMENT');
            }
        } else if (inputExists) {
            this.removeInput('STATEMENT');
        }
    },
};

Blockly.JavaScript.forBlock['request'] = function (block) {
    const vUrl = Blockly.JavaScript.valueToCode(block, 'URL', Blockly.JavaScript.ORDER_ATOMIC);
    const fWithStatement = block.getFieldValue('WITH_STATEMENT');
    const fLog = block.getFieldValue('LOG');

    let logText = '';
    if (fLog) {
        logText = `console.${fLog}('request: ' + ${vUrl});\n`;
    }

    if (fWithStatement === 'TRUE' || fWithStatement === 'true' || fWithStatement === true) {
        const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');
        if (statement) {
            return 'try {\n  require("request")(' + vUrl + ', async (error, response, result) => {\n  ' + statement + '  }).on("error", (e) => { console.error(e); });\n} catch (e) { console.error(e); }\n' + logText;
        }
        return 'try {\n  require("request")(' + vUrl + ').on("error", (e) => { console.error(e); });\n} catch (e) { console.error(e); }\n' + logText;
    }

    return 'try {\n  require("request")(' + vUrl + ').on("error", (e) => { console.error(e); });\n} catch (e) { console.error(e); }\n' + logText;
};
