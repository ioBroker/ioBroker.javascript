'use strict';

goog.provide('Blockly.JavaScript.System');

goog.require('Blockly.JavaScript');

Blockly.CustomBlocks = Blockly.CustomBlocks || [];
Blockly.CustomBlocks.push('System');

function getHelp(word) {
    return 'https://github.com/ioBroker/ioBroker.javascript/blob/master/README.md#' + Blockly.Words[word][systemLang];
}

Blockly.System = {
    HUE: 210,
    blocks: {}    
};

// --- Debug output --------------------------------------------------
Blockly.System.blocks['debug'] =
      '<block type="debug">'
    + '     <value name="TEXT">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">test</field>'
    + '         </shadow>'
    + '     </value>'
    + '</block>';
    
Blockly.Blocks['debug'] = {
    init: function() {
        this.appendValueInput('TEXT')
            .setCheck(null)
            .appendField(Blockly.Words['debug'][systemLang]);

        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([['info', 'log'], ['debug', 'debug'], ['warning', 'warn'], ['error', 'error']]), 'Severity');

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setInputsInline(false);
        this.setColour(Blockly.System.HUE);
        this.setTooltip(Blockly.Words['debug_tooltip'][systemLang]);
        this.setHelpUrl(getHelp('debug_help'));
    }
};

Blockly.JavaScript['debug'] = function(block) {
    var value_text = Blockly.JavaScript.valueToCode(block, 'TEXT', Blockly.JavaScript.ORDER_ATOMIC);
    var dropdown_severity = block.getFieldValue('Severity');
    return 'console.' + dropdown_severity + '(' + value_text + ');\n';
};

// --- comment --------------------------------------------------
Blockly.System.blocks['comment'] =
    '<block type="comment">'
    + '     <value name="COMMENT">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['comment'] = {
    init: function() {
        this.appendDummyInput('COMMENT')
            .appendField(new Blockly.FieldTextInput(Blockly.Words['comment'][systemLang]), 'COMMENT');

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setInputsInline(false);
        this.setColour('#FFFF00');
        this.setTooltip(Blockly.Words['comment_tooltip'][systemLang]);
    }
};

Blockly.JavaScript['comment'] = function(block) {
    var comment = block.getFieldValue('COMMENT');
    return '// ' + comment + '\n';
};

// --- control -----------------------------------------------------------
Blockly.System.blocks['control'] =
    '<block type="control">'
    + '     <value name="OID">'
    + '     </value>'
    + '     <value name="VALUE">'
    + '     </value>'
    + '     <value name="WITH_DELAY">'
    + '     </value>'
    + '     <mutation delay_input="false"></mutation>'
    + '     <value name="DELAY_MS">'
    + '     </value>'
    + '     <value name="UNIT">'
    + '     </value>'
    + '     <value name="CLEAR_RUNNING">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['control'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(Blockly.Words['control'][systemLang]);

        this.appendDummyInput('OID')
            .appendField(new Blockly.FieldOID('Object ID'), 'OID');

        this.appendValueInput('VALUE')
            .setCheck(null)
            .appendField(Blockly.Words['control_with'][systemLang]);

        this.appendDummyInput('WITH_DELAY')
            .appendField(Blockly.Words['control_delay'][systemLang])
            .appendField(new Blockly.FieldCheckbox('FALSE', function(option) {
                var delayInput = (option == true);
                this.sourceBlock_.updateShape_(delayInput);
            }), 'WITH_DELAY');


        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(Blockly.System.HUE);
        this.setTooltip(Blockly.Words['control_tooltip'][systemLang]);
        this.setHelpUrl(getHelp('control_help'));
    },
    mutationToDom: function() {
        var container = document.createElement('mutation');
        container.setAttribute('delay_input', this.getFieldValue('WITH_DELAY') === 'TRUE');
        return container;
    },
    domToMutation: function(xmlElement) {
        this.updateShape_(xmlElement.getAttribute('delay_input') == 'true');
    },
    updateShape_: function(delayInput) {
        // Add or remove a delay Input.
        var inputExists = this.getInput('DELAY');

        if (delayInput) {
            if (!inputExists) {
                this.appendDummyInput('DELAY')
                    .appendField(' ')
                    .appendField(new Blockly.FieldTextInput('1000'), 'DELAY_MS')
                    .appendField(new Blockly.FieldDropdown([
                        [Blockly.Words['control_ms'][systemLang], 'ms'],
                        [Blockly.Words['control_sec'][systemLang], 'sec'],
                        [Blockly.Words['control_min'][systemLang], 'min']
                    ]), 'UNIT');
                    //.appendField(Blockly.Words['control_ms'][systemLang]);
            }
        } else if (inputExists) {
            this.removeInput('DELAY');
        }

        inputExists = this.getInput('CLEAR_RUNNING_INPUT');

        if (delayInput) {
            if (!inputExists) {
                this.appendDummyInput('CLEAR_RUNNING_INPUT')
                    .appendField(Blockly.Words['control_clear_running'][systemLang])
                    .appendField(new Blockly.FieldCheckbox(), 'CLEAR_RUNNING');
            }
        } else if (inputExists) {
            this.removeInput('CLEAR_RUNNING_INPUT');
        }
    }
};

Blockly.JavaScript['control'] = function(block) {
    var valueObjectID = block.getFieldValue('OID');

    Blockly.Msg.VARIABLES_DEFAULT_NAME = 'value';

    var valueDelay   = parseInt(block.getFieldValue('DELAY_MS'), 10);
    var unit  = block.getFieldValue('UNIT');
    if (unit === 'min') {
        valueDelay *= 60000;
    } else if (unit === 'sec') {
        valueDelay *= 1000;
    }
    var clearRunning = block.getFieldValue('CLEAR_RUNNING') === 'TRUE';
    var valueValue   = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC);
    var objectName   = main.objects[valueObjectID] && main.objects[valueObjectID].common && main.objects[valueObjectID].common.name ? main.objects[valueObjectID].common.name : '';
    var code;

    if (this.getFieldValue('WITH_DELAY') === 'TRUE') {
        code = 'setStateDelayed("' + valueObjectID + '"' + (objectName ? '/*' + objectName + '*/' : '') + ', ' + valueValue + ', ' + valueDelay + ', ' + clearRunning + ');\n';
    } else {
        code = 'setState("' + valueObjectID + '"' + (objectName ? '/*' + objectName + '*/' : '') + ', ' + valueValue + ');\n';
    }

    return code;
};

// --- toggle -----------------------------------------------------------
Blockly.System.blocks['toggle'] =
    '<block type="toggle">'
    + '     <value name="OID">'
    + '     </value>'
    + '     <value name="WITH_DELAY">'
    + '     </value>'
    + '     <mutation delay_input="false"></mutation>'
    + '     <value name="DELAY_MS">'
    + '     </value>'
    + '     <value name="UNIT">'
    + '     </value>'
    + '     <value name="CLEAR_RUNNING">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['toggle'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(Blockly.Words['toggle'][systemLang]);

        this.appendDummyInput('OID')
            .appendField(new Blockly.FieldOID('Object ID'), 'OID');

        this.appendDummyInput('WITH_DELAY')
            .appendField(Blockly.Words['toggle_delay'][systemLang])
            .appendField(new Blockly.FieldCheckbox('FALSE', function(option) {
                var delayInput = (option == true);
                this.sourceBlock_.updateShape_(delayInput);
            }), 'WITH_DELAY');

        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(Blockly.System.HUE);
        this.setTooltip(Blockly.Words['toggle_tooltip'][systemLang]);
        this.setHelpUrl(getHelp('toggle_help'));
    },
    mutationToDom: function() {
        var container = document.createElement('mutation');
        container.setAttribute('delay_input', this.getFieldValue('WITH_DELAY') === 'TRUE');
        return container;
    },
    domToMutation: function(xmlElement) {
        this.updateShape_(xmlElement.getAttribute('delay_input') == 'true');
    },
    updateShape_: function(delayInput) {
        // Add or remove a delay Input.
        var inputExists = this.getInput('DELAY');

        if (delayInput) {
            if (!inputExists) {
                this.appendDummyInput('DELAY')
                    .appendField(' ')
                    .appendField(new Blockly.FieldTextInput('1000'), 'DELAY_MS')
                    .appendField(new Blockly.FieldDropdown([
                        [Blockly.Words['control_ms'][systemLang], 'ms'],
                        [Blockly.Words['control_sec'][systemLang], 'sec'],
                        [Blockly.Words['control_min'][systemLang], 'min']
                    ]), 'UNIT');
                    //.appendField(Blockly.Words['toggle_ms'][systemLang]);
            }
        } else if (inputExists) {
            this.removeInput('DELAY');
        }

        inputExists = this.getInput('CLEAR_RUNNING_INPUT');

        if (delayInput) {
            if (!inputExists) {
                this.appendDummyInput('CLEAR_RUNNING_INPUT')
                    .appendField(Blockly.Words['toggle_clear_running'][systemLang])
                    .appendField(new Blockly.FieldCheckbox(), 'CLEAR_RUNNING');
            }
        } else if (inputExists) {
            this.removeInput('CLEAR_RUNNING_INPUT');
        }
    }
};

Blockly.JavaScript['toggle'] = function(block) {
    var valueObjectID = block.getFieldValue('OID');

    Blockly.Msg.VARIABLES_DEFAULT_NAME = 'value';

    var valueDelay   = parseInt(block.getFieldValue('DELAY_MS'), 10);
    var unit  = block.getFieldValue('UNIT');
    if (unit === 'min') {
        valueDelay *= 60000;
    } else if (unit === 'sec') {
        valueDelay *= 1000;
    }
    var clearRunning = block.getFieldValue('CLEAR_RUNNING') === 'TRUE';
    var objectName   = main.objects[valueObjectID] && main.objects[valueObjectID].common && main.objects[valueObjectID].common.name ? main.objects[valueObjectID].common.name : '';
    var objectType   = main.objects[valueObjectID] && main.objects[valueObjectID].common && main.objects[valueObjectID].common.type ? main.objects[valueObjectID].common.type : 'boolean';
    var code;
    var setCommand;
    if (objectType === 'number') {
        var max = 100;
        var min = 0;
        if (main.objects[valueObjectID].common.max !== undefined) {
            max = parseFloat(main.objects[valueObjectID].common.max);
        }
        if (main.objects[valueObjectID].common.min !== undefined) {
            min = parseFloat(main.objects[valueObjectID].common.min);
        }
        setCommand = '    setState("' + valueObjectID + '"' + (objectName ? '/*' + objectName + '*/' : '') + ', state ? (state.val == ' + min + ' ?  ' + max + ' : '  + min + ') : ' + max + ');\n';
    } else {
        setCommand = '    setState("' + valueObjectID + '"' + (objectName ? '/*' + objectName + '*/' : '') + ', state ? !state.val : true);\n';
    }

    if (this.getFieldValue('WITH_DELAY') === 'TRUE') {
        code =
            'getState("' + valueObjectID + '", function (err, state) {\n' +
            '    setStateDelayed("' + valueObjectID + '"' + (objectName ? '/*' + objectName + '*/' : '') + ', state ? !state.val : true, ' + valueDelay + ', ' + clearRunning + ');\n' +
            '});\n';
    } else {
        code =
        'getState("' + valueObjectID + '", function (err, state) {\n' +
        setCommand +
        '});\n';
    }

    return code;
};

// --- update -----------------------------------------------------------
Blockly.System.blocks['update'] =
    '<block type="update">'
    + '     <value name="OID">'
    + '     </value>'
    + '     <value name="VALUE">'
    + '     </value>'
    + '     <value name="WITH_DELAY">'
    + '     </value>'
    + '     <mutation delay_input="false"></mutation>'
    + '     <value name="DELAY_MS">'
    + '     </value>'
    + '     <value name="UNIT">'
    + '     </value>'
    + '     <value name="CLEAR_RUNNING">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['update'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(Blockly.Words['update'][systemLang]);

        this.appendDummyInput('OID')
            .appendField(new Blockly.FieldOID('Object ID'), 'OID');


        this.appendValueInput('VALUE')
            .setCheck(null)
            .appendField(Blockly.Words['update_with'][systemLang]);

        this.appendDummyInput('WITH_DELAY')
            .appendField(Blockly.Words['update_delay'][systemLang])
            .appendField(new Blockly.FieldCheckbox('FALSE', function(option) {
                this.sourceBlock_.updateShape_(option == true);
            }), 'WITH_DELAY');

        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(Blockly.System.HUE);
        this.setTooltip(Blockly.Words['update_tooltip'][systemLang]);
        this.setHelpUrl(getHelp('update_help'));
    },
    mutationToDom: function() {
        var container = document.createElement('mutation');
        container.setAttribute('delay_input', this.getFieldValue('WITH_DELAY') === 'TRUE');
        return container;
    },
    domToMutation: function(xmlElement) {
        this.updateShape_(xmlElement.getAttribute('delay_input') == 'true');
    },
    updateShape_: function(delayInput) {
        // Add or remove a delay Input.
        var inputExists = this.getInput('DELAY');

        if (delayInput) {
            if (!inputExists) {
                this.appendDummyInput('DELAY')
                    .appendField(' ')
                    .appendField(new Blockly.FieldTextInput('1000'), 'DELAY_MS')
                    .appendField(new Blockly.FieldDropdown([
                        [Blockly.Words['control_ms'][systemLang], 'ms'],
                        [Blockly.Words['control_sec'][systemLang], 'sec'],
                        [Blockly.Words['control_min'][systemLang], 'min']
                    ]), 'UNIT');
                    //.appendField(Blockly.Words['update_ms'][systemLang]);
            }
        } else if (inputExists) {
            this.removeInput('DELAY');
        }

        inputExists = this.getInput('CLEAR_RUNNING_INPUT');

        if (delayInput) {
            if (!inputExists) {
                this.appendDummyInput('CLEAR_RUNNING_INPUT')
                    .appendField(Blockly.Words['control_clear_running'][systemLang])
                    .appendField(new Blockly.FieldCheckbox(), 'CLEAR_RUNNING');
            }
        } else if (inputExists) {
            this.removeInput('CLEAR_RUNNING_INPUT');
        }
    }
};

Blockly.JavaScript['update'] = function(block) {
    var value_objectid = block.getFieldValue('OID');

    Blockly.Msg.VARIABLES_DEFAULT_NAME = 'value';

    var value_value  = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC);
    var value_delay  = parseInt(block.getFieldValue('DELAY_MS'), 10);
    var clearRunning = block.getFieldValue('CLEAR_RUNNING') === 'TRUE';
    var unit  = block.getFieldValue('UNIT');
    if (unit === 'min') {
        value_delay *= 60000;
    } else if (unit === 'sec') {
        value_delay *= 1000;
    }
    var objectname = main.objects[value_objectid] && main.objects[value_objectid].common && main.objects[value_objectid].common.name ? main.objects[value_objectid].common.name : '';
    var code;
    if (this.getFieldValue('WITH_DELAY') === 'TRUE') {
        code = 'setStateDelayed("' + value_objectid + '"' + (objectname ? '/*' + objectname + '*/' : '') + ', ' + value_value + ', true, ' + value_delay + ', ' + clearRunning + ');\n';
    } else {
        code = 'setState("' + value_objectid + '"' + (objectname ? '/*' + objectname + '*/' : '') + ', ' + value_value + ', true);\n';
    }

    return code;
};

// --- direct binding -----------------------------------------------------------
Blockly.System.blocks['direct'] =
    '<block type="direct">'
    + '     <value name="OID_SRC">'
    + '         <shadow type="field_oid">'
    + '             <field name="oid">Object ID 1</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="OID_DST">'
    + '         <shadow type="field_oid">'
    + '             <field name="oid">Object ID 2</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="ONLY_CHANGES">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['direct'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(Blockly.Words['direct'][systemLang]);

        this.appendValueInput('OID_SRC')
            .setCheck('String')
            .appendField(Blockly.Words['direct_oid_src'][systemLang]);

        this.appendValueInput('OID_DST')
            .setCheck('String')
            .appendField(Blockly.Words['direct_oid_dst'][systemLang]);

        this.appendDummyInput('ONLY_CHANGES')
            .appendField(Blockly.Words['direct_only_changes'][systemLang])
            .appendField(new Blockly.FieldCheckbox('TRUE'), 'ONLY_CHANGES');

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(Blockly.System.HUE);
        this.setTooltip(Blockly.Words['direct_tooltip'][systemLang]);
        this.setHelpUrl(getHelp('direct_help'));
    }
};

Blockly.JavaScript['direct'] = function(block) {
    var oidSrc = Blockly.JavaScript.valueToCode(block, 'OID_SRC', Blockly.JavaScript.ORDER_ATOMIC);
    var onlyChanges = block.getFieldValue('ONLY_CHANGES');
    var oidDest = Blockly.JavaScript.valueToCode(block, 'OID_DST', Blockly.JavaScript.ORDER_ATOMIC);

    return 'on({id: ' + oidSrc + ', change: "' + (onlyChanges == 'TRUE' ? 'ne' : 'any') + '"}, function (obj) {\n  setState(' + oidDest + ', obj.state.val);\n});';
};

// --- control ex -----------------------------------------------------------
Blockly.System.blocks['control_ex'] =
    '<block type="control_ex">'
    + '     <value name="OID">'
    + '         <shadow type="field_oid">'
    + '             <field name="oid">Object ID</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="VALUE">'
    + '         <shadow type="logic_boolean">'
    + '             <field name="BOOL">TRUE</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="TYPE">'
    + '     </value>'
    + '     <value name="DELAY_MS">'
    + '         <shadow type="math_number">'
    + '             <field name="NUM">0</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="CLEAR_RUNNING">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['control_ex'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(Blockly.Words['control_ex'][systemLang]);

        this.appendValueInput('OID')
            .setCheck('String')
            .appendField(Blockly.Words['field_oid_OID'][systemLang]);

        this.appendDummyInput('TYPE')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Words['control_ex_control'][systemLang],   'false'],
                [Blockly.Words['control_ex_update'][systemLang],    'true']
            ]), 'TYPE');

        this.appendValueInput('VALUE')
            .setCheck(null)
            .appendField(Blockly.Words['control_ex_value'][systemLang]);

        this.appendValueInput('DELAY_MS')
            .setCheck('Number')
            .appendField(Blockly.Words['control_ex_delay'][systemLang]);

        this.appendDummyInput('CLEAR_RUNNING_INPUT')
            .appendField(Blockly.Words['control_ex_clear_running'][systemLang])
            .appendField(new Blockly.FieldCheckbox(), 'CLEAR_RUNNING');

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(Blockly.System.HUE);
        this.setTooltip(Blockly.Words['control_tooltip'][systemLang]);
        this.setHelpUrl(getHelp('control_help'));
    }
};

Blockly.JavaScript['control_ex'] = function(block) {
    var valueObjectID = Blockly.JavaScript.valueToCode(block, 'OID', Blockly.JavaScript.ORDER_ATOMIC);
    var value         = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC);
    var valueDelay    = Blockly.JavaScript.valueToCode(block, 'DELAY_MS', Blockly.JavaScript.ORDER_ATOMIC);
    var clearRunning  = block.getFieldValue('CLEAR_RUNNING') === 'TRUE';
    var type          = block.getFieldValue('TYPE') === 'true';
    return 'setStateDelayed(' + valueObjectID + ', ' + value + ', ' + type + ', parseInt(' + valueDelay + ', 10), ' + clearRunning + ');\n';
};

// --- create state --------------------------------------------------
Blockly.System.blocks['create'] =
    '<block type="create">'
    + '     <value name="NAME">'
    + '     </value>'
    + '     <value name="STATEMENT">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['create'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(Blockly.Words['create'][systemLang]);

        this.appendDummyInput('NAME')
            .appendField(new Blockly.FieldTextInput(Blockly.Words['create_jsState'][systemLang]), 'NAME');

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setInputsInline(true);
        this.setColour(Blockly.System.HUE);
        this.setTooltip(Blockly.Words['create_tooltip'][systemLang]);
        this.setHelpUrl(getHelp('create_help'));
    }
};

Blockly.JavaScript['create'] = function(block) {
    var name = block.getFieldValue('NAME');
    var statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    return 'createState("' + name + '", function () {\n' + statement + '});\n';
};

// --- get value --------------------------------------------------
Blockly.System.blocks['get_value'] =
    '<block type="get_value">'
    + '     <value name="ATTR">'
    + '     </value>'
    + '     <value name="OID">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['get_value'] = {
    // Checkbox.
    init: function() {

        this.appendDummyInput('ATTR')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Words['get_value_val'][systemLang],    'val'],
                [Blockly.Words['get_value_ack'][systemLang],    'ack'],
                [Blockly.Words['get_value_ts'][systemLang],     'ts'],
                [Blockly.Words['get_value_lc'][systemLang],     'lc'],
                [Blockly.Words['get_value_q'][systemLang] ,     'q'],
                [Blockly.Words['get_value_from'][systemLang],   'from']
            ]), 'ATTR');

        this.appendDummyInput()
            .appendField(Blockly.Words['get_value_OID'][systemLang]);

        this.appendDummyInput()
            .appendField(new Blockly.FieldOID(Blockly.Words['get_value_default'][systemLang]), 'OID');

        this.setInputsInline(true);
        this.setOutput(true);
        this.setColour(Blockly.System.HUE);
        this.setTooltip(Blockly.Words['get_value_tooltip'][systemLang]);
        this.setHelpUrl(getHelp('get_value_help'));
    }
};

Blockly.JavaScript['get_value'] = function(block) {
    var oid  = block.getFieldValue('OID');
    var attr = block.getFieldValue('ATTR');
    return ['getState("' + oid + '").' + attr, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- get value async--------------------------------------------------
Blockly.System.blocks['get_value_async'] =
    '<block type="get_value_async">'
    + '     <value name="ATTR">'
    + '     </value>'
    + '     <value name="OID">'
    + '     </value>'
    + '     <value name="STATEMENT">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['get_value_async'] = {
    // Checkbox.
    init: function() {

        this.appendDummyInput('ATTR')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Words['get_value_val'][systemLang],    'val'],
                [Blockly.Words['get_value_ack'][systemLang],    'ack'],
                [Blockly.Words['get_value_ts'][systemLang],     'ts'],
                [Blockly.Words['get_value_lc'][systemLang],     'lc'],
                [Blockly.Words['get_value_q'][systemLang] ,     'q'],
                [Blockly.Words['get_value_from'][systemLang],   'from']
            ]), 'ATTR');

        this.appendDummyInput()
            .appendField(Blockly.Words['get_value_OID'][systemLang]);

        this.appendDummyInput()
            .appendField(new Blockly.FieldOID(Blockly.Words['get_value_default'][systemLang]), 'OID');

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        
        this.setInputsInline(true);
        this.setColour(Blockly.System.HUE);
        this.setTooltip(Blockly.Words['get_value_tooltip'][systemLang]);
        this.setHelpUrl(getHelp('get_value_help'));
    }
};

Blockly.JavaScript['get_value_async'] = function(block) {
    var oid  = block.getFieldValue('OID');
    var attr = block.getFieldValue('ATTR');
    var statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');
    return 'getState("' + oid + '", function (err, state) {\n   var value = state.' + attr + ';\n' + statement + '});\n';
};

// --- select OID --------------------------------------------------
Blockly.System.blocks['field_oid'] =
    '<block type="field_oid">'
    + '     <value name="TEXT">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['field_oid'] = {
    // Checkbox.
    init: function() {

        this.appendDummyInput()
            .appendField(Blockly.Words['field_oid_OID'][systemLang]);

        this.appendDummyInput()
            .appendField(new Blockly.FieldOID('default'), 'oid');

        this.setInputsInline(true);
        this.setColour(Blockly.System.HUE);
        this.setOutput(true, 'String');
        this.setTooltip(Blockly.Words['field_oid_tooltip'][systemLang]);
    }
};

Blockly.JavaScript['field_oid'] = function(block) {
    var oid = block.getFieldValue('oid');
    return ['\'' + oid + '\'', Blockly.JavaScript.ORDER_ATOMIC]
};


// --- get attribute --------------------------------------------------
Blockly.System.blocks['get_attr'] =
    '<block type="get_attr">'
    + '     <value name="PATH">'
    + '         <shadow type="text">'
    + '             <field name="PATH">attr1.attr2</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="OBJECT">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['get_attr'] = {
    init: function() {

        this.appendValueInput('PATH')
            .setCheck(null)
            .appendField(Blockly.Words['get_attr_path'][systemLang]);

//        this.appendDummyInput()

        this.appendValueInput('OBJECT')
            .appendField(Blockly.Words['get_attr_by'][systemLang]);

        this.setInputsInline(true);
        this.setOutput(true);
        this.setColour(Blockly.System.HUE);
        this.setTooltip(Blockly.Words['get_attr_tooltip'][systemLang]);
        this.setHelpUrl(getHelp('get_attr_help'));
    }
};

Blockly.JavaScript['get_attr'] = function(block) {
    var path = Blockly.JavaScript.valueToCode(block, 'PATH', Blockly.JavaScript.ORDER_ATOMIC);
    var obj  = Blockly.JavaScript.valueToCode(block, 'OBJECT', Blockly.JavaScript.ORDER_ATOMIC);
    return ['getAttr(' + obj + ', ' + path + ')', Blockly.JavaScript.ORDER_ATOMIC];
};

// --- Text new line --------------------------------------------------
Blockly.Blocks['text_newline'] = {
    // Checkbox.
    init: function() {
        this.appendDummyInput()
            .appendField(Blockly.Words['text_newline'][systemLang]);

        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([['\\n', '\\n'], ['\\r\\n', '\\r\\n'], ['\\r', '\\r']]), 'Type');
        this.setInputsInline(true);
        this.setColour(Blockly.Blocks.texts.HUE);
        this.setOutput(true, 'String');
        this.setTooltip(Blockly.Words['text_newline_tooltip'][systemLang]);
    }
};

Blockly.JavaScript['text_newline'] = function(block) {
    var dropdown_type = block.getFieldValue('Type');
    return ['\'' + dropdown_type + '\'', Blockly.JavaScript.ORDER_ATOMIC]
};

// --- Round Number to n decimal places -------------------------------
Blockly.Blocks['math_rndfixed'] = {
    init: function() {
        this.appendValueInput('x')
            .setCheck('Number')
            .appendField(Blockly.Words['math_rndfixed_round'][systemLang]);
        this.appendDummyInput()
            .appendField(Blockly.Words['math_rndfixed_to'][systemLang])
            .appendField(new Blockly.FieldNumber(0, 1, 25), 'n')
            .appendField(Blockly.Words['math_rndfixed_decplcs'][systemLang]);
        this.setInputsInline(true);
        this.setColour(Blockly.Blocks.math.HUE);
        this.setOutput(true, 'Number');
        this.setTooltip(Blockly.Words['math_rndfixed_tooltip'][systemLang]);
  }
};

Blockly.JavaScript['math_rndfixed'] = function(block) {
  var x = Blockly.JavaScript.valueToCode(block, 'x', Blockly.JavaScript.ORDER_ATOMIC);
  const exp = Math.pow(10, block.getFieldValue('n'));  
  return ['Math.round(' + x + '*' + exp + ')/' + exp, Blockly.JavaScript.ORDER_ATOMIC];
};
