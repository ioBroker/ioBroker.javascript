'use strict';

if (typeof goog !== 'undefined') {
    goog.provide('Blockly.JavaScript.System');
    goog.require('Blockly.JavaScript');
}

Blockly.CustomBlocks = Blockly.CustomBlocks || [];
Blockly.CustomBlocks.push('System');

Blockly.System = {
    HUE: 210,
    blocks: {},
    WARNING_PARENTS: [
        'on_ext',
    ],
};

// --- global_var -----------------------------------------------------------
Blockly.System.blocks['global_var'] =
    '<block type="global_var">' +
    '  <field name="VAR">scriptName</field>' +
    '</block>';

Blockly.Blocks['global_var'] = {
    /**
     * Block for conditionally returning a value from a procedure.
     * @this Blockly.Block
     */
    init: function () {
        this.appendDummyInput('VAR')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('global_var_scriptname'), 'scriptName'],
                [Blockly.Translate('global_var_defaultdatadir'), 'defaultDataDir'],
                [Blockly.Translate('global_var_verbose'), 'verbose'],
            ]), 'VAR');

        this.setInputsInline(true);
        this.setOutput(true);

        this.setColour(Blockly.System.HUE);

        this.setTooltip(Blockly.Translate('global_var_tooltip'));
        this.setHelpUrl(getHelp('global_var'));
    },
};
Blockly.JavaScript.forBlock['global_var'] = function (block) {
    const variable = block.getFieldValue('VAR');

    return [variable, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- Debug output --------------------------------------------------
Blockly.System.blocks['debug'] =
    '<block type="debug">' +
    '  <field name="Severity">info</field>' +
    '  <value name="TEXT">' +
    '    <shadow type="text">' +
    '      <field name="TEXT">test</field>' +
    '    </shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['debug'] = {
    init: function () {
        this.appendValueInput('TEXT')
            .setCheck(null)
            .appendField(Blockly.Translate('debug'));

        this.appendDummyInput('Severity')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('loglevel_debug'), 'debug'],
                [Blockly.Translate('loglevel_info'),  'info'],
                [Blockly.Translate('loglevel_warn'),  'warn'],
                [Blockly.Translate('loglevel_error'), 'error'],
            ]), 'Severity');

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.System.HUE);

        this.setTooltip(Blockly.Translate('debug_tooltip'));
        this.setHelpUrl(getHelp('debug_help'));
    },
};

Blockly.JavaScript.forBlock['debug'] = function (block) {
    const vText = Blockly.JavaScript.valueToCode(block, 'TEXT', Blockly.JavaScript.ORDER_ATOMIC);
    const fSeverity = block.getFieldValue('Severity');

    return `console.${fSeverity}(${vText});\n`;
};

// --- comment --------------------------------------------------
Blockly.System.blocks['comment'] =
    '<block type="comment">' +
    '</block>';

Blockly.Blocks['comment'] = {
    init: function () {
        this.appendDummyInput('COMMENT')
            .appendField(new Blockly.FieldMultilineInput(Blockly.Translate('comment')), 'COMMENT');

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour('#FFFF00');

        this.setTooltip(Blockly.Translate('comment_tooltip'));
    },
};

Blockly.JavaScript.forBlock['comment'] = function (block) {
    const fComment = block.getFieldValue('COMMENT');

    return Blockly.JavaScript.prefixLines(fComment, '// ') + '\n';
};

// --- control -----------------------------------------------------------
Blockly.System.blocks['control'] =
    '<block type="control">' +
    '  <mutation delay_input="false"></mutation>' +
    '  <field name="WITH_DELAY">FALSE</field>' +
    '</block>';

Blockly.Blocks['control'] = {
    init: function () {
        this.appendDummyInput()
            .appendField(Blockly.Translate('control'));

        this.appendDummyInput('OID')
            .appendField(new Blockly.FieldOID(Blockly.Translate('select_id'), 'state'), 'OID');

        this.appendValueInput('VALUE')
            .setCheck(null)
            .appendField(Blockly.Translate('control_with'));

        this.appendDummyInput('WITH_DELAY')
            .appendField(Blockly.Translate('control_delay'))
            .appendField(new Blockly.FieldCheckbox('FALSE', function(option) {
                this.sourceBlock_.updateShape_(option === true || option === 'true' || option === 'TRUE');
            }), 'WITH_DELAY');

        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.System.HUE);

        this.setTooltip(Blockly.Translate('control_tooltip'));
        this.setHelpUrl(getHelp('control_help'));
    },
    mutationToDom: function () {
        const container = document.createElement('mutation');
        const option = this.getFieldValue('WITH_DELAY');

        container.setAttribute('delay_input', option === true || option === 'true' || option === 'TRUE');

        return container;
    },
    domToMutation: function (xmlElement) {
        const option = xmlElement.getAttribute('delay_input');
        this.updateShape_(option === true || option === 'true' || option === 'TRUE');
    },
    updateShape_: function (delayInput) {
        // Add or remove a delay Input.
        let inputExists = this.getInput('DELAY');

        if (delayInput) {
            if (!inputExists) {
                this.appendDummyInput('DELAY')
                    .appendField(' ')
                    .appendField(new Blockly.FieldTextInput('1000'), 'DELAY_MS')
                    .appendField(new Blockly.FieldDropdown([
                        [Blockly.Translate('control_ms'), 'ms'],
                        [Blockly.Translate('control_sec'), 'sec'],
                        [Blockly.Translate('control_min'), 'min'],
                    ]), 'UNIT');
            }
        } else if (inputExists) {
            this.removeInput('DELAY');
        }

        inputExists = this.getInput('CLEAR_RUNNING_INPUT');

        if (delayInput) {
            if (!inputExists) {
                this.appendDummyInput('CLEAR_RUNNING_INPUT')
                    .appendField(Blockly.Translate('control_clear_running'))
                    .appendField(new Blockly.FieldCheckbox(), 'CLEAR_RUNNING');
            }
        } else if (inputExists) {
            this.removeInput('CLEAR_RUNNING_INPUT');
        }
    },
};

Blockly.JavaScript.forBlock['control'] = function (block) {
    const fObjId = block.getFieldValue('OID');

    Blockly.Msg.VARIABLES_DEFAULT_NAME = 'value';

    let fDelayMs = parseInt(block.getFieldValue('DELAY_MS'), 10);
    const fUnit = block.getFieldValue('UNIT');
    if (fUnit === 'min') {
        fDelayMs *= 60000;
    } else if (fUnit === 'sec') {
        fDelayMs *= 1000;
    }

    let fClearRunning = block.getFieldValue('CLEAR_RUNNING');
    fClearRunning = fClearRunning === 'TRUE' || fClearRunning === 'true' || fClearRunning === true;

    const vValue = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC);
    const fWithDelay = this.getFieldValue('WITH_DELAY');

    let objectName = main.objects[fObjId] && main.objects[fObjId].common && main.objects[fObjId].common.name ? main.objects[fObjId].common.name : '';
    if (typeof objectName === 'object') {
        objectName = objectName[systemLang] || objectName.en;
    }

    let code;
    if (fWithDelay === 'true' || fWithDelay === true || fWithDelay === 'TRUE') {
        code = `setStateDelayed('${fObjId}'${objectName ? ` /* ${objectName} */` : ''}, ${vValue}, ${fDelayMs}, ${fClearRunning});\n`;
    } else {
        code = `setState('${fObjId}'${objectName ? ` /* ${objectName} */` : ''}, ${vValue});\n`;
    }

    return code;
};

// --- toggle -----------------------------------------------------------
Blockly.System.blocks['toggle'] =
    '<sep gap="5"></sep>' +
    '<block type="toggle">' +
    '  <mutation delay_input="false"></mutation>' +
    '  <field name="WITH_DELAY">FALSE</field>' +
    '</block>';

Blockly.Blocks['toggle'] = {
    init: function () {
        this.appendDummyInput()
            .appendField(Blockly.Translate('toggle'));

        this.appendDummyInput('OID')
            .appendField(new Blockly.FieldOID(Blockly.Translate('select_id'), 'state'), 'OID');

        this.appendDummyInput('WITH_DELAY')
            .appendField(Blockly.Translate('toggle_delay'))
            .appendField(new Blockly.FieldCheckbox('FALSE', function(option) {
                this.sourceBlock_.updateShape_(option === true || option === 'true' || option === 'TRUE');
            }), 'WITH_DELAY');

        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.System.HUE);

        this.setTooltip(Blockly.Translate('toggle_tooltip'));
        this.setHelpUrl(getHelp('toggle_help'));
    },
    mutationToDom: function () {
        const container = document.createElement('mutation');
        const option = this.getFieldValue('WITH_DELAY');

        container.setAttribute('delay_input', option === true || option === 'true' || option === 'TRUE');

        return container;
    },
    domToMutation: function (xmlElement) {
        const option = xmlElement.getAttribute('delay_input');
        this.updateShape_(option === true || option === 'true' || option === 'TRUE');
    },
    updateShape_: function (delayInput) {
        // Add or remove a delay Input.
        let inputExists = this.getInput('DELAY');

        if (delayInput) {
            if (!inputExists) {
                this.appendDummyInput('DELAY')
                    .appendField(' ')
                    .appendField(new Blockly.FieldTextInput('1000'), 'DELAY_MS')
                    .appendField(new Blockly.FieldDropdown([
                        [Blockly.Translate('control_ms'), 'ms'],
                        [Blockly.Translate('control_sec'), 'sec'],
                        [Blockly.Translate('control_min'), 'min'],
                    ]), 'UNIT');
                //.appendField(Blockly.Translate('toggle_ms'));
            }
        } else if (inputExists) {
            this.removeInput('DELAY');
        }

        inputExists = this.getInput('CLEAR_RUNNING_INPUT');

        if (delayInput) {
            if (!inputExists) {
                this.appendDummyInput('CLEAR_RUNNING_INPUT')
                    .appendField(Blockly.Translate('toggle_clear_running'))
                    .appendField(new Blockly.FieldCheckbox(), 'CLEAR_RUNNING');
            }
        } else if (inputExists) {
            this.removeInput('CLEAR_RUNNING_INPUT');
        }
    },
};

Blockly.JavaScript.forBlock['toggle'] = function (block) {
    const fObjId = block.getFieldValue('OID');
    const fUnit = block.getFieldValue('UNIT');

    Blockly.Msg.VARIABLES_DEFAULT_NAME = 'value';

    let fDelayMs = parseInt(block.getFieldValue('DELAY_MS'), 10);
    if (fUnit === 'min') {
        fDelayMs *= 60000;
    } else if (fUnit === 'sec') {
        fDelayMs *= 1000;
    }

    const objectType = main.objects[fObjId] && main.objects[fObjId].common && main.objects[fObjId].common.type ? main.objects[fObjId].common.type : 'boolean';
    let objectName = main.objects[fObjId] && main.objects[fObjId].common && main.objects[fObjId].common.name ? main.objects[fObjId].common.name : '';
    if (typeof objectName === 'object') {
        objectName = objectName[systemLang] || objectName.en;
    }

    let fClearRunning = block.getFieldValue('CLEAR_RUNNING');
    fClearRunning = fClearRunning === 'TRUE' || fClearRunning === 'true' || fClearRunning === true;

    let setCommand;
    if (objectType === 'number') {
        let max = 100;
        let min = 0;

        if (main.objects[fObjId].common.max !== undefined) {
            max = parseFloat(main.objects[fObjId].common.max);
        }
        if (main.objects[fObjId].common.min !== undefined) {
            min = parseFloat(main.objects[fObjId].common.min);
        }

        setCommand = `setState('${fObjId}'${objectName ? ` /* ${objectName} */` : ''}, state ? (state.val === ${min} ? ${max} : ${min}) : ${max});`;
    } else {
        setCommand = `setState('${fObjId}'${objectName ? ` /* ${objectName} */` : ''}, state ? !state.val : true);`;
    }

    const fWithDelay = block.getFieldValue('WITH_DELAY');

    let code;
    if (fWithDelay === 'TRUE' || fWithDelay === 'true' || fWithDelay === true) {
        code = `getState('${fObjId}', (err, state) => {\n` +
            Blockly.JavaScript.prefixLines(`setStateDelayed('${fObjId}'${objectName ? ` /* ${objectName} */` : ''}, state ? !state.val : true, ${fDelayMs}, ${fClearRunning});`, Blockly.JavaScript.INDENT) + '\n' +
            '});\n';
    } else {
        code = `getState('${fObjId}', (err, state) => {\n` +
            Blockly.JavaScript.prefixLines(setCommand, Blockly.JavaScript.INDENT) + '\n' +
            '});\n';
    }

    return code;
};

// --- update -----------------------------------------------------------
Blockly.System.blocks['update'] =
    '<sep gap="5"></sep>' +
    '<block type="update">' +
    '  <mutation delay_input="false"></mutation>' +
    '  <field name="WITH_DELAY">FALSE</field>' +
    '</block>';

Blockly.Blocks['update'] = {
    init: function () {
        this.appendDummyInput()
            .appendField(Blockly.Translate('update'));

        this.appendDummyInput('OID')
            .appendField(new Blockly.FieldOID(Blockly.Translate('select_id'), 'state'), 'OID');

        this.appendValueInput('VALUE')
            .setCheck(null)
            .appendField(Blockly.Translate('update_with'));

        this.appendDummyInput('WITH_DELAY')
            .appendField(Blockly.Translate('update_delay'))
            .appendField(new Blockly.FieldCheckbox('FALSE', function(option) {
                this.sourceBlock_.updateShape_(option === true || option === 'true' || option === 'TRUE');
            }), 'WITH_DELAY');

        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.System.HUE);

        this.setTooltip(Blockly.Translate('update_tooltip'));
        this.setHelpUrl(getHelp('update_help'));
    },
    mutationToDom: function () {
        const container = document.createElement('mutation');
        const option = this.getFieldValue('WITH_DELAY');

        container.setAttribute('delay_input', option === true || option === 'true' || option === 'TRUE');

        return container;
    },
    domToMutation: function (xmlElement) {
        const option = xmlElement.getAttribute('delay_input');
        this.updateShape_(option === true || option === 'true' || option === 'TRUE');
    },
    updateShape_: function (delayInput) {
        // Add or remove a delay Input.
        let inputExists = this.getInput('DELAY');

        if (delayInput) {
            if (!inputExists) {
                this.appendDummyInput('DELAY')
                    .appendField(' ')
                    .appendField(new Blockly.FieldTextInput('1000'), 'DELAY_MS')
                    .appendField(new Blockly.FieldDropdown([
                        [Blockly.Translate('control_ms'), 'ms'],
                        [Blockly.Translate('control_sec'), 'sec'],
                        [Blockly.Translate('control_min'), 'min'],
                    ]), 'UNIT');
                //.appendField(Blockly.Translate('update_ms'));
            }
        } else if (inputExists) {
            this.removeInput('DELAY');
        }

        inputExists = this.getInput('CLEAR_RUNNING_INPUT');

        if (delayInput) {
            if (!inputExists) {
                this.appendDummyInput('CLEAR_RUNNING_INPUT')
                    .appendField(Blockly.Translate('control_clear_running'))
                    .appendField(new Blockly.FieldCheckbox(), 'CLEAR_RUNNING');
            }
        } else if (inputExists) {
            this.removeInput('CLEAR_RUNNING_INPUT');
        }
    },
};

Blockly.JavaScript.forBlock['update'] = function (block) {
    const fObjId = block.getFieldValue('OID');

    Blockly.Msg.VARIABLES_DEFAULT_NAME = 'value';

    const vValue  = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC);
    const fUnit  = block.getFieldValue('UNIT');

    let fDelay = parseInt(block.getFieldValue('DELAY_MS'), 10);
    if (fUnit === 'min') {
        fDelay *= 60000;
    } else if (fUnit === 'sec') {
        fDelay *= 1000;
    }

    let fClearRunning = block.getFieldValue('CLEAR_RUNNING');
    fClearRunning = fClearRunning === 'TRUE' || fClearRunning === 'true' || fClearRunning === true;

    const fWithDelay = this.getFieldValue('WITH_DELAY');

    let objectName = main.objects[fObjId] && main.objects[fObjId].common && main.objects[fObjId].common.name ? main.objects[fObjId].common.name : '';
    if (typeof objectName === 'object') {
        objectName = objectName[systemLang] || objectName.en;
    }

    if (fWithDelay === true || fWithDelay === 'true' || fWithDelay === 'TRUE') {
        return `setStateDelayed('${fObjId}'${objectName ? ` /* ${objectName} */` : ''}, ${vValue}, true, ${fDelay}, ${fClearRunning});\n`;
    }

    return `setState('${fObjId}'${objectName ? ` /* ${objectName} */` : ''}, ${vValue}, true);\n`;
};

// --- control ex -----------------------------------------------------------
Blockly.System.blocks['control_ex'] =
    '<sep gap="5"></sep>' +
    '<block type="control_ex">' +
    '  <field name="TYPE">false</field>' +
    '  <field name="CLEAR_RUNNING">FALSE</field>' +
    '  <value name="OID">' +
    '    <shadow type="field_oid">' +
    '    </shadow>' +
    '  </value>' +
    '  <value name="VALUE">' +
    '    <shadow type="logic_boolean">' +
    '      <field name="BOOL">TRUE</field>' +
    '    </shadow>' +
    '  </value>' +
    '  <value name="DELAY_MS">' +
    '    <shadow type="math_number">' +
    '      <field name="NUM">0</field>' +
    '    </shadow>' +
    '  </value>' +
    '  <value name="EXPIRE">' +
    '    <shadow type="math_number">' +
    '      <field name="NUM">0</field>' +
    '    </shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['control_ex'] = {
    init: function () {
        this.appendDummyInput()
            .appendField(Blockly.Translate('control_ex'));

        this.appendValueInput('OID')
            .setCheck('String')
            .appendField(Blockly.Translate('field_oid_OID'));

        this.appendDummyInput('TYPE')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('control_ex_control'), 'false'],
                [Blockly.Translate('control_ex_update'), 'true'],
            ]), 'TYPE');

        this.appendValueInput('VALUE')
            .setCheck(null)
            .appendField(Blockly.Translate('control_ex_value'));

        this.appendValueInput('DELAY_MS')
            .setCheck('Number')
            .appendField(Blockly.Translate('control_ex_delay'));

        this.appendValueInput('EXPIRE')
            .setCheck('Number')
            .appendField(Blockly.Translate('control_ex_expire'));

        this.appendDummyInput('CLEAR_RUNNING_INPUT')
            .appendField(Blockly.Translate('control_ex_clear_running'))
            .appendField(new Blockly.FieldCheckbox(), 'CLEAR_RUNNING');

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.System.HUE);

        this.setTooltip(Blockly.Translate('control_tooltip'));
        this.setHelpUrl(getHelp('control_help'));
    },
};

Blockly.JavaScript.forBlock['control_ex'] = function (block) {
    const vObjId = Blockly.JavaScript.valueToCode(block, 'OID', Blockly.JavaScript.ORDER_ATOMIC);
    const vValue = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC);
    const vDelayMs = Blockly.JavaScript.valueToCode(block, 'DELAY_MS', Blockly.JavaScript.ORDER_ATOMIC);
    const vExpire = Blockly.JavaScript.valueToCode(block, 'EXPIRE', Blockly.JavaScript.ORDER_ATOMIC);

    let fClearRunning = block.getFieldValue('CLEAR_RUNNING');
    fClearRunning = fClearRunning === true || fClearRunning === 'true' || fClearRunning === 'TRUE';

    let fType = block.getFieldValue('TYPE');
    fType = fType === true || fType === 'true' || fType === 'TRUE';

    let expire = '';
    if (vExpire > 0) {
        expire = `, expire: ${vExpire}`;
    }

    return `setStateDelayed(${vObjId}, { val: ${vValue}, ack: ${fType}${expire} }, parseInt(((${vDelayMs}) || '').toString(), 10), ${fClearRunning});\n`;
};

// --- create state --------------------------------------------------
Blockly.System.blocks['create'] =
    '<block type="create">' +
    '  <field name="NAME">0_userdata.0.example</field>' +
    '</block>';

Blockly.Blocks['create'] = {
    init: function () {
        this.appendDummyInput()
            .appendField(Blockly.Translate('create'));

        this.appendDummyInput('NAME')
            .appendField(Blockly.Translate('create_oid'))
            .appendField(new Blockly.FieldTextInput('0_userdata.0.example'), 'NAME');

        const inputValue = this.appendValueInput('VALUE')
            .setCheck(null)
            .appendField(Blockly.Translate('create_init'));
        if (inputValue.connection) {
            inputValue.connection._optional = true;
        }

        const inputCommon = this.appendValueInput('COMMON')
            .setCheck(null)
            .appendField(Blockly.Translate('create_common'));
        if (inputCommon.connection) {
            inputCommon.connection._optional = true;
        }

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.System.HUE);

        this.setTooltip(Blockly.Translate('create_tooltip'));
        this.setHelpUrl(getHelp('create_help'));
    },
};

Blockly.JavaScript.forBlock['create'] = function (block) {
    const fName = block.getFieldValue('NAME');

    const vValue = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC);
    let paraV = '';
    if (vValue !== null && vValue !== '') {
        paraV = `, ${vValue}`;
    }

    const vCommon = Blockly.JavaScript.valueToCode(block, 'COMMON', Blockly.JavaScript.ORDER_ATOMIC);
    let paraC = '';
    if (vCommon !== null && vCommon !== '') {
        paraC = `, ((common) => typeof common !== 'object' ? JSON.parse(common) : common)(${vCommon})`;
    }

    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');
    return `createState(${Blockly.JavaScript.quote_(fName)}${paraV}${paraC}, async () => {\n` +
        statement +
        '});\n';
};

// --- create state ex --------------------------------------------------
Blockly.System.blocks['create_ex'] =
    '<sep gap="5"></sep>' +
    '<block type="create_ex">' +
    '  <field name="NAME">0_userdata.0.example</field>' +
    '  <field name="TYPE">string</field>' +
    '  <field name="READABLE">FALSE</field>' +
    '  <field name="WRITEABLE">FALSE</field>' +
    '</block>';

Blockly.Blocks['create_ex'] = {
    init: function () {
        this.appendDummyInput()
            .appendField(Blockly.Translate('create'));

        this.appendDummyInput('NAME')
            .appendField(Blockly.Translate('create_oid'))
            .appendField(new Blockly.FieldTextInput('0_userdata.0.example'), 'NAME');

        this.appendDummyInput('TYPE')
            .appendField(Blockly.Translate('create_type'))
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('create_type_string'), 'string'],
                [Blockly.Translate('create_type_number'), 'number'],
                [Blockly.Translate('create_type_boolean'), 'boolean'],
                [Blockly.Translate('create_type_json'), 'json'],
                [Blockly.Translate('create_type_object'), 'object'],
                [Blockly.Translate('create_type_array'), 'array'],
            ]), 'TYPE');

        const inputValue = this.appendValueInput('VALUE')
            .setCheck(null)
            .appendField(Blockly.Translate('create_init'));
        if (inputValue.connection) {
            inputValue.connection._optional = true;
        }

        this.appendDummyInput('READABLE_INPUT')
            .appendField(Blockly.Translate('create_readable'))
            .appendField(new Blockly.FieldCheckbox('FALSE'), 'READABLE');

        this.appendDummyInput('WRITEABLE_INPUT')
            .appendField(Blockly.Translate('create_writeable'))
            .appendField(new Blockly.FieldCheckbox('FALSE'), 'WRITEABLE');

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.System.HUE);

        this.setTooltip(Blockly.Translate('create_tooltip'));
        this.setHelpUrl(getHelp('create_help'));
    },
};

Blockly.JavaScript.forBlock['create_ex'] = function (block) {
    const fName = block.getFieldValue('NAME');
    const fType = block.getFieldValue('TYPE');

    let paraV = '';
    const vValue = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC);
    if (vValue !== null && vValue !== '') {
        if (fType === 'number') {
            paraV = `, parseFloat(${vValue})`;
        } else if (fType === 'boolean') {
            paraV = `, !!${vValue}`;
        } else if (fType === 'string') {
            paraV = `, String(${vValue})`;
        } else {
            paraV = `, ${vValue}`;
        }
    }

    let fReadable = block.getFieldValue('READABLE');
    fReadable = fReadable === 'TRUE' || fReadable === 'true' || fReadable === true;

    let fWriteable = block.getFieldValue('WRITEABLE');
    fWriteable = fWriteable === 'TRUE' || fWriteable === 'true' || fWriteable === true;

    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    return `createState(${Blockly.JavaScript.quote_(fName)}${paraV}, { type: '${fType}', read: ${fReadable}, write: ${fWriteable} }, async () => {\n` +
        statement +
        '});\n';
};

// --- get value --------------------------------------------------
Blockly.System.blocks['get_value'] =
    '<block type="get_value">' +
    '  <field name="ATTR">val</field>' +
    '</block>';

Blockly.Blocks['get_value'] = {
    // Checkbox.
    init: function () {
        this.appendDummyInput('ATTR')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('get_value_val'),      'val'],
                [Blockly.Translate('get_value_ack'),      'ack'],
                [Blockly.Translate('get_value_ts'),       'ts'],
                [Blockly.Translate('get_value_lc'),       'lc'],
                [Blockly.Translate('get_value_q') ,       'q'],
                [Blockly.Translate('get_value_comment'),  'c'],
                [Blockly.Translate('get_value_from'),     'from'],
                [Blockly.Translate('get_value_user'),     'user'],

                [Blockly.Translate('get_common_name'),    'common.name'],
                [Blockly.Translate('get_common_desc'),    'common.desc'],
                [Blockly.Translate('get_common_unit'),    'common.unit'],
                [Blockly.Translate('get_common_role'),    'common.role'],
                [Blockly.Translate('get_common_state_type'), 'common.type'],
                [Blockly.Translate('get_common_read'),    'common.read'],
                [Blockly.Translate('get_common_write'),   'common.write'],
            ]), 'ATTR');

        this.appendDummyInput()
            .appendField(Blockly.Translate('get_value_OID'));

        this.appendDummyInput()
            .appendField(new Blockly.FieldOID(Blockly.Translate('select_id'), 'state'), 'OID');

        this.setInputsInline(true);
        this.setOutput(true);

        this.setColour(Blockly.System.HUE);

        this.setTooltip(Blockly.Translate('get_value_tooltip'));
        this.setHelpUrl(getHelp('get_value_help'));
    },
    /**
     * Called whenever anything on the workspace changes.
     * Add warning if this flow block is not nested inside a loop.
     * @param {!Blockly.Events.Abstract} e Change event.
     * @this Blockly.Block
     */
    onchange: function (e) {
        // Is the block connected to a trigger?
        const block = this.getParent();
        if (block && Blockly.System.WARNING_PARENTS.includes(block.type)) {
            this.setWarningText(Blockly.Translate('false_connection_trigger_warning'), this.id);
        } else {
            this.setWarningText(null, this.id);
        }
    },
};

Blockly.JavaScript.forBlock['get_value'] = function (block) {
    const fOid = block.getFieldValue('OID');
    const fAttr = block.getFieldValue('ATTR');

    if (fAttr === 'type' || fAttr.startsWith('common.')) {
        return [`(await getObjectAsync('${fOid}')).${fAttr}`, Blockly.JavaScript.ORDER_ATOMIC];
    }

    return [`getState(${Blockly.JavaScript.quote_(fOid)}).${fAttr}`, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- get value var --------------------------------------------------
Blockly.System.blocks['get_value_var'] =
    '<sep gap="5"></sep>' +
    '<block type="get_value_var">' +
    '  <field name="ATTR">val</field>' +
    '  <value name="OID">' +
    '    <shadow type="field_oid">' +
    '    </shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['get_value_var'] = {
    init: function () {
        this.appendDummyInput('ATTR')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('get_value_val'),     'val'],
                [Blockly.Translate('get_value_ack'),     'ack'],
                [Blockly.Translate('get_value_ts'),      'ts'],
                [Blockly.Translate('get_value_lc'),      'lc'],
                [Blockly.Translate('get_value_q'),       'q'],
                [Blockly.Translate('get_value_comment'), 'c'],
                [Blockly.Translate('get_value_from'),    'from'],

                [Blockly.Translate('get_common_name'),   'common.name'],
                [Blockly.Translate('get_common_desc'),   'common.desc'],
                [Blockly.Translate('get_common_unit'),   'common.unit'],
                [Blockly.Translate('get_common_role'),   'common.role'],
                [Blockly.Translate('get_common_state_type'), 'common.type'],
                [Blockly.Translate('get_common_read'),    'common.read'],
                [Blockly.Translate('get_common_write'),   'common.write'],
            ]), 'ATTR');

        this.appendDummyInput()
            .appendField(Blockly.Translate('get_value_OID'));

        this.appendValueInput('OID')
            .setCheck(null);

        this.setInputsInline(true);
        this.setOutput(true);

        this.setColour(Blockly.System.HUE);

        this.setTooltip(Blockly.Translate('get_value_tooltip'));
        this.setHelpUrl(getHelp('get_value_help'));
    },
    /**
     * Called whenever anything on the workspace changes.
     * Add warning if this flow block is not nested inside a loop.
     * @param {!Blockly.Events.Abstract} e Change event.
     * @this Blockly.Block
     */
    onchange: function (e) {
        // Is the block connected to a trigger?
        const block = this.getParent();
        if (block && Blockly.System.WARNING_PARENTS.includes(block.type)) {
            this.setWarningText(Blockly.Translate('false_connection_trigger_warning'), this.id);
        } else {
            this.setWarningText(null, this.id);
        }
    },
};

Blockly.JavaScript.forBlock['get_value_var'] = function (block) {
    const vOid = Blockly.JavaScript.valueToCode(block, 'OID', Blockly.JavaScript.ORDER_ATOMIC);
    const fAttr = block.getFieldValue('ATTR');

    if (fAttr === 'type' || fAttr.startsWith('common.')) {
        return [`(await getObjectAsync(${vOid})).${fAttr}`, Blockly.JavaScript.ORDER_ATOMIC];
    }

    return [`getState(${vOid}).${fAttr}`, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- get value async--------------------------------------------------
Blockly.System.blocks['get_value_async'] =
    '<sep gap="5"></sep>' +
    '<block type="get_value_async">' +
    '  <field name="ATTR">val</field>' +
    '</block>';

Blockly.Blocks['get_value_async'] = {
    init: function () {
        this.appendDummyInput('ATTR')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('get_value_val'),     'val'],
                [Blockly.Translate('get_value_ack'),     'ack'],
                [Blockly.Translate('get_value_ts'),      'ts'],
                [Blockly.Translate('get_value_lc'),      'lc'],
                [Blockly.Translate('get_value_q'),       'q'],
                [Blockly.Translate('get_value_comment'), 'c'],
                [Blockly.Translate('get_value_from'),    'from'],

                [Blockly.Translate('get_common_name'),   'common.name'],
                [Blockly.Translate('get_common_desc'),   'common.desc'],
                [Blockly.Translate('get_common_unit'),   'common.unit'],
                [Blockly.Translate('get_common_role'),   'common.role'],
                [Blockly.Translate('get_common_state_type'), 'common.type'],
                [Blockly.Translate('get_common_read'),    'common.read'],
                [Blockly.Translate('get_common_write'),   'common.write'],
            ]), 'ATTR');

        this.appendDummyInput()
            .appendField(Blockly.Translate('get_value_OID'));

        this.appendDummyInput()
            .appendField(new Blockly.FieldOID(Blockly.Translate('select_id'), 'state'), 'OID');

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.System.HUE);

        this.setTooltip(Blockly.Translate('get_value_tooltip'));
        this.setHelpUrl(getHelp('get_value_help'));
    },
};

Blockly.JavaScript.forBlock['get_value_async'] = function (block) {
    const fOid = block.getFieldValue('OID');
    const fAttr = block.getFieldValue('ATTR');
    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    if (fAttr === 'type' || fAttr.startsWith('common.')) {
        return `getObjectAsync(${Blockly.JavaScript.quote_(fOid)}, async (err, obj) => {\n` +
            Blockly.JavaScript.prefixLines(`let value = obj.${fAttr};`, Blockly.JavaScript.INDENT) + '\n' +
            statement +
            '});\n';
    } else {
        return `getState(${Blockly.JavaScript.quote_(fOid)}, async (err, state) => {\n` +
            Blockly.JavaScript.prefixLines(`let value = state.${fAttr};`, Blockly.JavaScript.INDENT) + '\n' +
            statement +
            '});\n';
    }
};

// --- get object --------------------------------------------------
Blockly.System.blocks['get_object'] =
    '<block type="get_object">' +
    '</block>';

Blockly.Blocks['get_object'] = {
    // Checkbox.
    init: function () {
        this.appendDummyInput()
            .appendField(Blockly.Translate('get_object'));

        this.appendDummyInput()
            .appendField(new Blockly.FieldOID(Blockly.Translate('select_id'), 'all'), 'OID');

        this.setInputsInline(true);
        this.setOutput(true);

        this.setColour(Blockly.Object.HUE);

        this.setTooltip(Blockly.Translate('get_object_tooltip'));
        this.setHelpUrl(getHelp('get_object_help'));
    },
    /**
     * Called whenever anything on the workspace changes.
     * Add warning if this flow block is not nested inside a loop.
     * @param {!Blockly.Events.Abstract} e Change event.
     * @this Blockly.Block
     */
    onchange: function (e) {
        // Is the block connected to a trigger?
        const block = this.getParent();
        if (block && Blockly.System.WARNING_PARENTS.includes(block.type)) {
            this.setWarningText(Blockly.Translate('false_connection_trigger_warning'), this.id);
        } else if (block && ['direct', 'control_ex', 'get_value_var'].includes(block.type)) {
            this.setWarningText(Blockly.Translate('get_object_connection_warning'), this.id);
        } else {
            this.setWarningText(null, this.id);
        }
    },
};

Blockly.JavaScript.forBlock['get_object'] = function (block) {
    const fOid  = block.getFieldValue('OID');

    return [`getObject(${Blockly.JavaScript.quote_(fOid)})`, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- get object async--------------------------------------------------
Blockly.System.blocks['get_object_async'] =
    '<sep gap="5"></sep>' +
    '<block type="get_object_async">' +
    '</block>';

Blockly.Blocks['get_object_async'] = {
    init: function () {
        this.appendDummyInput()
            .appendField(Blockly.Translate('get_object'));

        this.appendDummyInput()
            .appendField(new Blockly.FieldOID(Blockly.Translate('select_id'), 'all'), 'OID');

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setInputsInline(true);

        this.setColour(Blockly.Object.HUE);

        this.setTooltip(Blockly.Translate('get_object_tooltip'));
        this.setHelpUrl(getHelp('get_object_help'));
    },
};

Blockly.JavaScript.forBlock['get_object_async'] = function (block) {
    const fOid = block.getFieldValue('OID');
    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    return `getObjectAsync(${Blockly.JavaScript.quote_(fOid)}).then(async (obj) => {\n` +
        statement +
        '});\n';
};

// --- select OID --------------------------------------------------
Blockly.System.blocks['field_oid'] =
    '<block type="field_oid">' +
    '</block>';

Blockly.Blocks['field_oid'] = {
    init: function () {
        this.appendDummyInput()
            .appendField(Blockly.Translate('field_oid_OID'));

        this.appendDummyInput()
            .appendField(new Blockly.FieldOID(Blockly.Translate('select_id'), 'state'), 'oid');

        this.setInputsInline(true);
        this.setOutput(true, 'String');

        this.setColour('%{BKY_TEXTS_HUE}');

        this.setTooltip(Blockly.Translate('field_oid_tooltip'));
    },
};

Blockly.JavaScript.forBlock['field_oid'] = function (block) {
    const fOid = block.getFieldValue('oid');

    return [Blockly.JavaScript.quote_(fOid), Blockly.JavaScript.ORDER_ATOMIC];
};

// --- select OID meta--------------------------------------------------
Blockly.System.blocks['field_oid_meta'] =
    '<sep gap="5"></sep>' +
    '<block type="field_oid_meta">' +
    '</block>';

Blockly.Blocks['field_oid_meta'] = {
    init: function () {
        this.appendDummyInput()
            .appendField(Blockly.Translate('field_oid_OID_meta'));

        this.appendDummyInput()
            .appendField(new Blockly.FieldOID(Blockly.Translate('select_id'), 'meta'), 'oid');

        this.setInputsInline(true);
        this.setOutput(true, 'String');

        this.setColour('%{BKY_TEXTS_HUE}');

        this.setTooltip(Blockly.Translate('field_oid_tooltip'));
    },
};

Blockly.JavaScript.forBlock['field_oid_meta'] = function (block) {
    const fOid = block.getFieldValue('oid');

    return [Blockly.JavaScript.quote_(fOid), Blockly.JavaScript.ORDER_ATOMIC];
};

// --- select OID script--------------------------------------------------
Blockly.System.blocks['field_oid_script'] =
    '<sep gap="5"></sep>' +
    '<block type="field_oid_script">' +
    '</block>';

Blockly.Blocks['field_oid_script'] = {
    init: function () {
        this.appendDummyInput()
            .appendField(Blockly.Translate('field_oid_OID_script'));

        this.appendDummyInput()
            .appendField(new Blockly.FieldOID(Blockly.Translate('select_id'), 'script'), 'oid');

        this.setInputsInline(true);
        this.setOutput(true, 'String');

        this.setColour('%{BKY_TEXTS_HUE}');

        this.setTooltip(Blockly.Translate('field_oid_tooltip'));
    },
};

Blockly.JavaScript.forBlock['field_oid_script'] = function (block) {
    const fOid = block.getFieldValue('oid');

    return [Blockly.JavaScript.quote_(fOid), Blockly.JavaScript.ORDER_ATOMIC];
};

// --- get attribute --------------------------------------------------
Blockly.System.blocks['get_attr'] =
    '<block type="get_attr">' +
    '  <value name="PATH">' +
    '    <shadow type="text">' +
    '      <field name="TEXT">attribute1</field>' +
    '    </shadow>' +
    '  </value>' +
    '  <value name="OBJECT">' +
    '    <shadow type="get_object">' +
    '      <field name="OID">Object ID</field>' +
    '    </shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['get_attr'] = {
    init: function () {
        this.appendValueInput('PATH')
            .setCheck(null)
            .appendField(Blockly.Translate('get_attr_path'));

        this.appendValueInput('OBJECT')
            .appendField(Blockly.Translate('get_attr_by'));

        this.setInputsInline(true);
        this.setOutput(true);

        this.setColour(Blockly.System.HUE);

        this.setTooltip(Blockly.Translate('get_attr_tooltip'));
        this.setHelpUrl(getHelp('get_attr_help'));
    },
};

Blockly.JavaScript.forBlock['get_attr'] = function (block) {
    const vObject = Blockly.JavaScript.valueToCode(block, 'OBJECT', Blockly.JavaScript.ORDER_ATOMIC);
    const vPath = Blockly.JavaScript.valueToCode(block, 'PATH', Blockly.JavaScript.ORDER_ATOMIC);

    return [`getAttr(${vObject}, ${vPath})`, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- direct binding -----------------------------------------------------------
Blockly.System.blocks['direct'] =
    '<block type="direct">' +
    '  <field name="ONLY_CHANGES">TRUE</field>' +
    '  <value name="OID_SRC">' +
    '    <shadow type="field_oid">' +
    '      <field name="oid">Object ID 1</field>' +
    '    </shadow>' +
    '  </value>' +
    '  <value name="OID_DST">' +
    '    <shadow type="field_oid">' +
    '      <field name="oid">Object ID 2</field>' +
    '    </shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['direct'] = {
    init: function () {
        this.appendDummyInput()
            .appendField(Blockly.Translate('direct'));

        this.appendValueInput('OID_SRC')
            .setCheck('String')
            .appendField(Blockly.Translate('direct_oid_src'));

        this.appendValueInput('OID_DST')
            .setCheck('String')
            .appendField(Blockly.Translate('direct_oid_dst'));

        this.appendDummyInput('ONLY_CHANGES')
            .appendField(Blockly.Translate('direct_only_changes'))
            .appendField(new Blockly.FieldCheckbox('TRUE'), 'ONLY_CHANGES');

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Trigger.HUE);

        this.setTooltip(Blockly.Translate('direct_tooltip'));
        this.setHelpUrl(getHelp('direct_help'));
    },
};

Blockly.JavaScript.forBlock['direct'] = function (block) {
    const vOidSrc = Blockly.JavaScript.valueToCode(block, 'OID_SRC', Blockly.JavaScript.ORDER_ATOMIC);
    const vOidDst = Blockly.JavaScript.valueToCode(block, 'OID_DST', Blockly.JavaScript.ORDER_ATOMIC);

    let fOnlyChanges = block.getFieldValue('ONLY_CHANGES');
    fOnlyChanges = fOnlyChanges === true || fOnlyChanges === 'true' || fOnlyChanges === 'TRUE';

    return `on({ id: ${vOidSrc}, change: '${fOnlyChanges ? 'ne' : 'any'}' }, (obj) => {\n` +
        Blockly.JavaScript.prefixLines(`setState(${vOidDst}, obj.state.val);`, Blockly.JavaScript.INDENT) + '\n' +
        '});\n';
};

// --- control instance -----------------------------------------------------------
Blockly.System.blocks['control_instance'] =
    '<block type="control_instance">' +
    '  <field name="INSTANCE">admin.0</field>' +
    '  <field name="ACTION">restartInstanceAsync</field>' +
    '</block>';

Blockly.Blocks['control_instance'] = {
    init: function () {
        const options = [];
        if (typeof main !== 'undefined' && main.instances) {
            for (let i = 0; i < main.instances.length; i++) {
                const id = main.instances[i].substring('system.adapter.'.length);
                options.push([id, id]);
            }
            if (!options.length) {
                options.push([Blockly.Translate('control_instance_no_instances'), '']);
            }

            this.appendDummyInput('INSTANCE')
                .appendField(Blockly.Translate('control_instance'))
                .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');
        } else {
            this.appendDummyInput('INSTANCE')
                .appendField(Blockly.Translate('control_instance'))
                .appendField(new Blockly.FieldTextInput('adapter.0'), 'INSTANCE');
        }

        this.appendDummyInput('ACTION')
            .appendField(Blockly.Translate('control_instance_action'))
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('control_instance_start'), 'startInstanceAsync'],
                [Blockly.Translate('control_instance_stop'),  'stopInstanceAsync'],
                [Blockly.Translate('control_instance_restart'),  'restartInstanceAsync'],
            ]), 'ACTION');

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.System.HUE);

        this.setTooltip(Blockly.Translate('control_instance_tooltip'));
        this.setHelpUrl(getHelp('control_instance_help'));
    },
};

Blockly.JavaScript.forBlock['control_instance'] = function (block) {
    const fInstance = block.getFieldValue('INSTANCE');
    const fAction = block.getFieldValue('ACTION');

    return `await ${fAction}(${Blockly.JavaScript.quote_(fInstance)});\n`;
};

// --- control script -----------------------------------------------------------
Blockly.System.blocks['control_script'] =
    '<block type="control_script">' +
    '  <field name="ACTION">startScriptAsync</field>' +
    '</block>';

Blockly.Blocks['control_script'] = {
    init: function () {
        this.appendDummyInput('OID')
            .appendField(Blockly.Translate('control_script'))
            .appendField(new Blockly.FieldOID(Blockly.Translate('select_id'), 'script'), 'OID');

        this.appendDummyInput('ACTION')
            .appendField(Blockly.Translate('control_instance_action'))
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('control_script_start'), 'startScriptAsync'],
                [Blockly.Translate('control_script_stop'),  'stopScriptAsync'],
            ]), 'ACTION');

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.System.HUE);

        this.setTooltip(Blockly.Translate('control_script_tooltip'));
        this.setHelpUrl(getHelp('control_script_help'));
    },
};

Blockly.JavaScript.forBlock['control_script'] = function (block) {
    const fOid = block.getFieldValue('OID');
    const fAction = block.getFieldValue('ACTION');

    return `await ${fAction}(${Blockly.JavaScript.quote_(fOid)});\n`;
};

// --- regex --------------------------------------------------
Blockly.System.blocks['regex'] =
    '<block type="regex">' +
    '  <field name="TEXT">(.*)</field>' +
    '</block>';

Blockly.Blocks['regex'] = {
    init: function () {
        this.appendDummyInput()
            .appendField('RegExp');

        this.appendDummyInput('TEXT')
            .appendField(new Blockly.FieldTextInput('(.*)'), 'TEXT');

        this.setInputsInline(true);
        this.setOutput(true, 'Array');

        this.setColour(Blockly.System.HUE);

        // this.setTooltip(Blockly.Translate('regex_tooltip'));
    },
};

Blockly.JavaScript.forBlock['regex'] = function (block) {
    const fText = block.getFieldValue('TEXT');

    return [`new RegExp(${Blockly.JavaScript.quote_(fText)})`, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- selector --------------------------------------------------
Blockly.System.blocks['selector'] =
    '<block type="selector">' +
    '  <field name="TEXT">channel[state.id=*]</field>' +
    '</block>';

Blockly.Blocks['selector'] = {
    init: function () {
        this.appendDummyInput()
            .appendField(Blockly.Translate('selector') + ' $(');

        this.appendDummyInput('TEXT')
            .appendField(new Blockly.FieldTextInput('channel[state.id=*]'), 'TEXT');

        this.appendDummyInput()
            .appendField(')');

        this.setInputsInline(true);
        this.setOutput(true, 'Array');

        this.setColour(Blockly.System.HUE);

        // this.setTooltip(Blockly.Translate('selector_tooltip'));
    },
};

Blockly.JavaScript.forBlock['selector'] = function (block) {
    const fText = block.getFieldValue('TEXT');

    return [`Array.prototype.slice.apply($(${Blockly.JavaScript.quote_(fText)}))`, Blockly.JavaScript.ORDER_ATOMIC];
};
