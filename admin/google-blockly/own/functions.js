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
        this.appendDummyInput()
            .appendField('checkbox')
            .appendField(new Blockly.FieldCheckbox('TRUE'), 'CHECKED')
            .appendField(',')
            .appendField(new Blockly.FieldOID('NAME'), 'FIELDNAME');
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
        this.appendValueInput("TEXT")
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
Blockly.Words['on']          = {'en': 'on', 'de': 'on',   'ru': 'on'};
Blockly.Words['on_tooltip']  = {'en': 'If some state changed or updated',        'de': 'Auf Zustandsänderung',          'ru': 'При изменении или обновлении состояния'};
Blockly.Words['on_help']     = {'en': 'on---subscribe-on-changes-or-updates-of-some-state', 'de': 'on---subscribe-on-changes-or-updates-of-some-state', 'ru': 'on---subscribe-on-changes-or-updates-of-some-state'};
Blockly.Words['on_onchange'] = {'en': 'on change', 'de': 'bei Änderung', 'ru': 'при изменении'};
Blockly.Words['on_any']      = {'en': 'on update', 'de': 'bei Aktualisieren', 'ru': 'при обновлении'};

Blockly.System.blocks['on'] =
    '<block type="on">'
    + '     <value name="TEXT">'
    //+ '         <shadow type="text">'
    //+ '             <field name="TEXT">test</field>'
    //+ '         </shadow>'
    + '     </value>'
    + '</block>';

Blockly.Blocks['on'] = {
    init: function() {
        this.appendValueInput("TEXT")
            .setCheck("String")
            .appendField(Blockly.Words['on'][systemLang]);

        this.appendDummyInput()
            .appendField(new Blockly.FieldOID("default", main.selectId, main.objects), "oid");

        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([[Blockly.Words['on_onchange'][systemLang], "onchange"], [Blockly.Words['on_any'][systemLang], "any"]]), "condition");

        this.appendStatementInput("NAME")
            .setCheck(null);
        this.setInputsInline(false);
        this.setColour(Blockly.System.HUE);
        this.setTooltip(Blockly.Words['on_tooltip'][systemLang]);
        this.setHelpUrl(getHelp('on_help'));
    }
};
Blockly.JavaScript['on'] = function(block) {
    var value_text = Blockly.JavaScript.valueToCode(block, 'TEXT', Blockly.JavaScript.ORDER_ATOMIC);
    var dropdown_condition = block.getFieldValue('condition');
    var statements_name = Blockly.JavaScript.statementToCode(block, 'NAME');

    var code = 'on({id: ' + value_text + ', change: "' + dropdown_condition + '"}, function (obj) {\n  var value = obj.state.val;\n' + statements_name + '});\n';
    return code;
};

// --- control -----------------------------------------------------------
Blockly.Words['control']         = {'en': 'сontrol state', 'de': 'steuere Zustand',      'ru': 'Управление состоянием'};
Blockly.Words['control_tooltip'] = {'en': 'Control state', 'de': 'Auf Zustandsänderung', 'ru': 'При изменении или обновлении состояния'};
Blockly.Words['control_help']    = {'en': 'on---subscribe-on-changes-or-updates-of-some-state', 'de': 'on---subscribe-on-changes-or-updates-of-some-state', 'ru': 'on---subscribe-on-changes-or-updates-of-some-state'};
Blockly.Words['control_with']    = {'en': 'with', 'de': 'mit', 'ru': 'с'};

Blockly.System.blocks['control'] =
    '<block type="control">'
    + '     <value name="ObjectID">'
    + '     </value>'
    + '     <value name="VALUE">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['control'] = {
    init: function() {
        this.appendValueInput("ObjectID")
            .setCheck("String")
            .appendField(Blockly.Words['control'][systemLang]);
        this.appendValueInput("VALUE")
            .setCheck(null)
            .appendField(Blockly.Words['control_with'][systemLang]);
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(Blockly.System.HUE);
        this.setTooltip(Blockly.Words['control_tooltip'][systemLang]);
        this.setHelpUrl(getHelp('control_help'));
    }
};
Blockly.JavaScript['control'] = function(block) {
    var value_objectid = Blockly.JavaScript.valueToCode(block, 'ObjectID', Blockly.JavaScript.ORDER_ATOMIC);
    var value_value = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC);
    var code = 'setState(' + value_objectid + ', ' + value_value + ');\n';
    return code;
};