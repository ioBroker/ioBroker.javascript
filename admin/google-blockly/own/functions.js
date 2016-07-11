'use strict';

goog.provide('Blockly.JavaScript.system');

goog.require('Blockly.JavaScript');

// translations
Blockly.Words = {};
Blockly.Words['System'] = {'en': 'System', 'de': 'System', 'ru': 'Системные'};

function getHelp(word) {
    return 'https://github.com/ioBroker/ioBroker.javascript/blob/master/README.md#' + Blockly.Words[word][systemLang];
}

Blockly.System = {
    HUE: 210,
    blocks: {}    
};

Blockly.Blocks['field_oid'] = {
    // Checkbox.
    init: function() {
        this.setColour(160);

        this.appendDummyInput('FIELDNAME')
            .appendField('checkbox')
            .appendField(new Blockly.FieldCheckbox('TRUE'), 'CHECKED')
            .appendField(',')
            .appendField(new Blockly.FieldOID('NAME', main.initSelectId(), main.objects), 'FIELDNAME');

        this.setPreviousStatement(true, 'Field');
        this.setNextStatement(true, 'Field');
        this.setTooltip('Checkbox field.');
        this.setHelpUrl('https://www.youtube.com/watch?v=s2_xaEvcVI0#t=485');
    },
    onchange: function() {
        fieldNameCheck(this);
    }
};

// --- Debug output --------------------------------------------------
Blockly.Words['debug']         = {'en': 'debug output', 'de': 'debug output',   'ru': 'debug output'};
Blockly.Words['debug_tooltip'] = {'en': 'Debug',        'de': 'Debug',          'ru': 'Debug'};
Blockly.Words['debug_help']    = {'en': 'log---gives-out-the-message-into-log', 'de': 'log---gives-out-the-message-into-log', 'ru': 'log---gives-out-the-message-into-log'};

Blockly.System.blocks['debug'] = 
      '<block type="debug">'
    + '     <value name="TEXT">'
    //+ '         <shadow type="text">'
    //+ '             <field name="TEXT">test</field>'
    //+ '         </shadow>'
    + '     </value>'
    + '</block>';
    
Blockly.Blocks['debug'] = {
    init: function() {
        this.appendValueInput('TEXT')
            .setCheck(null)
            .appendField(Blockly.Words['debug'][systemLang]);

        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([["info", "log"], ["debug", "debug"], ["warning", "warn"], ["error", "error"]]), "Severity");

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

// --- ON -----------------------------------------------------------
Blockly.Words['on']          = {'en': 'Event: If Objekt',               'de': 'Falls Objekt',                           'ru': 'Событие: если объект'};
Blockly.Words['on_tooltip']  = {'en': 'If some state changed or updated', 'de': 'Auf Zustandsänderung',                 'ru': 'При изменении или обновлении состояния'};
Blockly.Words['on_onchange'] = {'en': 'was changed',                    'de': 'wurde geändert',                         'ru': 'изменился'};
Blockly.Words['on_any']      = {'en': 'was updated',                    'de': 'wurde aktulaisiert',                     'ru': 'обновился'};
Blockly.Words['on_gt']       = {'en': 'is greater than last',           'de': 'ist größer als letztes',                 'ru': 'больше прошлого'};
Blockly.Words['on_ge']       = {'en': 'is greater or equal than last',  'de': 'ist gleich oder größer als letztes',     'ru': 'больше или равен прошлому'};
Blockly.Words['on_lt']       = {'en': 'is less than last',              'de': 'ist kleiner als letztes',                'ru': 'меньше прошлого'};
Blockly.Words['on_le']       = {'en': 'is less or equal than last',     'de': 'ist gleich oder kleiner als letztes',    'ru': 'меньше или равен прошлому'};
Blockly.Words['on_eq']       = {'en': 'is same as last',                'de': 'ist gleich wie letztes',                 'ru': 'равен прошлому'};
Blockly.Words['on_help']     = {
    'en': 'on---subscribe-on-changes-or-updates-of-some-state',
    'de': 'on---subscribe-on-changes-or-updates-of-some-state',
    'ru': 'on---subscribe-on-changes-or-updates-of-some-state'
};

Blockly.System.blocks['on'] =
    '<block type="on">'
    + '     <value name="OID">'
    //+ '         <shadow type="text">'
    //+ '             <field name="TEXT">test</field>'
    //+ '         </shadow>'
    + '     </value>'
    + '     <value name="OID">'
    + '     </value>'
    + '     <value name="CONDITION">'
    + '     </value>'
    + '     <value name="STATEMENT">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['on'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(Blockly.Words['on'][systemLang]);

        this.appendDummyInput("OID")
            .appendField(new Blockly.FieldOID("Object ID", main.initSelectId(), main.objects), "OID");

        this.appendDummyInput("CONDITION")
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Words['on_onchange'][systemLang], "ne"],
                [Blockly.Words['on_any'][systemLang], "any"],
                [Blockly.Words['on_gt'][systemLang], "gt"],
                [Blockly.Words['on_ge'][systemLang], "ge"],
                [Blockly.Words['on_lt'][systemLang], "lt"],
                [Blockly.Words['on_le'][systemLang], "le"]
            ]), "CONDITION");

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setInputsInline(false);
        this.setColour(Blockly.System.HUE);
        this.setTooltip(Blockly.Words['on_tooltip'][systemLang]);
        this.setHelpUrl(getHelp('on_help'));
    }
};
Blockly.JavaScript['on'] = function(block) {
    var value_objectid = block.getFieldValue('OID');
    var dropdown_condition = block.getFieldValue('CONDITION');
    var statements_name = Blockly.JavaScript.statementToCode(block, 'STATEMENT');
    var objectname = main.objects[value_objectid] && main.objects[value_objectid].common && main.objects[value_objectid].common.name ? main.objects[value_objectid].common.name : '';

    Blockly.Msg.VARIABLES_DEFAULT_NAME = 'value';

    var code = 'on({id: "' + value_objectid + '"' + (objectname ? '/*' + objectname + '*/' : '') + ', change: "' + dropdown_condition + '"}, function (obj) {\n  var value = obj.state.val;\n' + statements_name + '});\n';
    return code;
};

// --- SCHEDULE -----------------------------------------------------------
Blockly.Words['schedule']          = {'en': 'schedule',                      'de': 'Zeitplan',                       'ru': 'Cron расписание'};
Blockly.Words['schedule_tooltip']  = {'en': 'Do something on cron schedule', 'de': 'Ausführen nach Zeitplan',        'ru': 'Выполнять по расписанию'};
Blockly.Words['schedule_help']     = {
    'en': 'schedule',
    'de': 'schedule',
    'ru': 'schedule'
};

Blockly.System.blocks['schedule'] =
    '<block type="schedule">'
    + '     <value name="SCHEDULE">'
    //+ '         <shadow type="text">'
    //+ '             <field name="TEXT">test</field>'
    //+ '         </shadow>'
    + '     </value>'
    + '     <value name="STATEMENT">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['schedule'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(Blockly.Words['schedule'][systemLang]);

        this.appendDummyInput('SCHEDULE')
            .appendField(new Blockly.FieldCRON('0 * * * *'), 'SCHEDULE');

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setInputsInline(false);
        this.setColour(Blockly.System.HUE);
        this.setTooltip(Blockly.Words['schedule_tooltip'][systemLang]);
        this.setHelpUrl(getHelp('schedule_help'));
    }
};
Blockly.JavaScript['schedule'] = function(block) {
    var schedule = block.getFieldValue('SCHEDULE');
    var statements_name = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    return 'schedule("' + schedule +'", function () {\n' + statements_name + '});\n';
};


// --- control -----------------------------------------------------------
Blockly.Words['control']         = {'en': 'сontrol',        'de': 'steuere',            'ru': 'установить'};
Blockly.Words['control_tooltip'] = {'en': 'Control state',  'de': 'Steuere Zustand',    'ru': 'Установить состояние'};
Blockly.Words['control_help']    = {'en': 'setstate',       'de': 'setstate',           'ru': 'setstate'};
Blockly.Words['control_with']    = {'en': 'with',           'de': 'mit',                'ru': 'на'};
Blockly.Words['control_delay']   = {'en': 'with delay',     'de': 'mit Verzögerung',    'ru': 'с задержкой'};
Blockly.Words['control_ms']      = {'en': 'in ms',          'de': 'in ms',              'ru': 'в мс'};

Blockly.System.blocks['control'] =
    '<block type="control">'
    + '     <value name="OID">'
    + '     </value>'
    + '     <value name="VALUE">'
    + '     </value>'
    + '     <value name="WITH_DELAY">'
    + '     </value>'
    + '     <mutation delay_input="true"></mutation>'
    + '     <value name="DELAY_MS">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['control'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(Blockly.Words['control'][systemLang]);

        this.appendDummyInput("OID")
            .appendField(new Blockly.FieldOID("Object ID", main.initSelectId(), main.objects), "OID");

        this.appendValueInput("VALUE")
            .setCheck(null)
            .appendField(Blockly.Words['control_with'][systemLang]);

        this.appendDummyInput("WITH_DELAY")
            .appendField(Blockly.Words['control_delay'][systemLang])
            .appendField(new Blockly.FieldCheckbox("FALSE", function(option) {
                var delayInput = (option == true);
                this.sourceBlock_.updateShape_(delayInput);
            }), "WITH_DELAY");

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
                    .appendField(Blockly.Words['control_ms'][systemLang]);
            }
        } else if (inputExists) {
            this.removeInput('DELAY');
        }
    }
};
Blockly.JavaScript['control'] = function(block) {
    var value_objectid = block.getFieldValue('OID');

    Blockly.Msg.VARIABLES_DEFAULT_NAME = "value";

    var value_delay = parseInt(block.getFieldValue('DELAY_MS'), 10);
    var value_value = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC);
    var objectname = main.objects[value_objectid] && main.objects[value_objectid].common && main.objects[value_objectid].common.name ? main.objects[value_objectid].common.name : '';
    var code;

    if (this.getFieldValue('WITH_DELAY') === 'TRUE') {
        code = 'setStateDelayed("' + value_objectid + '"' + (objectname ? '/*' + objectname + '*/' : '') + ', ' + value_value + ', ' + value_delay + ');\n';
    } else {
        code = 'setState("' + value_objectid + '"' + (objectname ? '/*' + objectname + '*/' : '') + ', ' + value_value + ');\n';
    }

    return code;
};

// --- update -----------------------------------------------------------
Blockly.Words['update']         = {'en': 'update',          'de': 'aktualisiere',           'ru': 'обновить'};
Blockly.Words['update_tooltip'] = {'en': 'Update state',    'de': 'Zustand aktualisieren',  'ru': 'Обновить состояние'};
Blockly.Words['update_help']    = {'en': 'setstate',        'de': 'setstate',               'ru': 'setstate'};
Blockly.Words['update_with']    = {'en': 'with',            'de': 'mit',                    'ru': 'с'};
Blockly.Words['update_delay']   = {'en': 'with delay',      'de': 'mit Verzögerung',        'ru': 'с задержкой'};
Blockly.Words['update_ms']      = {'en': 'in ms',           'de': 'in ms',                  'ru': 'в мс'};

Blockly.System.blocks['update'] =
    '<block type="update">'
    + '     <value name="OID">'
    + '     </value>'
    + '     <value name="VALUE">'
    + '     </value>'
    + '     <value name="WITH_DELAY">'
    + '     </value>'
    + '     <mutation delay_input="true"></mutation>'
    + '     <value name="DELAY_MS">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['update'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(Blockly.Words['update'][systemLang]);

        this.appendDummyInput('OID')
            .appendField(new Blockly.FieldOID("Object ID", main.initSelectId(), main.objects), 'OID');


        this.appendValueInput('VALUE')
            .setCheck(null)
            .appendField(Blockly.Words['update_with'][systemLang]);

        this.appendDummyInput('WITH_DELAY')
            .appendField(Blockly.Words['update_delay'][systemLang])
            .appendField(new Blockly.FieldCheckbox("FALSE", function(option) {
                var delayInput = (option == true);
                this.sourceBlock_.updateShape_(delayInput);
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
                    .appendField(Blockly.Words['update_ms'][systemLang]);
            }
        } else if (inputExists) {
            this.removeInput('DELAY');
        }
    }
};
Blockly.JavaScript['update'] = function(block) {
    var value_objectid = block.getFieldValue('OID');

    Blockly.Msg.VARIABLES_DEFAULT_NAME = 'value';

    var value_value = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC);
    var value_delay = parseInt(block.getFieldValue('DELAY_MS'), 10);

    var objectname = main.objects[value_objectid] && main.objects[value_objectid].common && main.objects[value_objectid].common.name ? main.objects[value_objectid].common.name : '';
    var code;
    if (this.getFieldValue('WITH_DELAY') === 'TRUE') {
        code = 'setStateDelayed("' + value_objectid + '"' + (objectname ? '/*' + objectname + '*/' : '') + ', ' + value_value + ', true, ' + value_delay + ');\n';
    } else {
        code = 'setState("' + value_objectid + '"' + (objectname ? '/*' + objectname + '*/' : '') + ', ' + value_value + ', true);\n';
    }

    return code;
};