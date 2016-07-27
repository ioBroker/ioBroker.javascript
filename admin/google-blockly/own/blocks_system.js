'use strict';

goog.provide('Blockly.JavaScript.System');

goog.require('Blockly.JavaScript');

// translations
Blockly.Words = {};
Blockly.Words['System'] = {'en': 'System', 'de': 'System', 'ru': 'Системные'};

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
            .appendField(new Blockly.FieldCRON('* * * * *'), 'SCHEDULE');

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

// --- ASTRO -----------------------------------------------------------
Blockly.Words['astro']                  = {'en': 'astro',                           'de': 'Astro',                          'ru': 'Астро'};
Blockly.Words['astro_tooltip']          = {'en': 'Do something on astrological event', 'de': 'Ausführen nach Astro-Ereignis', 'ru': 'Выполнять по астро-событию'};
Blockly.Words['astro_offset']           = {'en': ', offset',                        'de': ', Versatz',                      'ru': ', сдвиг'};
Blockly.Words['astro_minutes']          = {'en': 'minutes',                         'de': 'Minuten',                        'ru': 'минут'};

Blockly.Words['astro_sunriseText']       = {'en': 'sunrise',                         'de': 'Sonnenaufgang',                 'ru': 'восход солнца'};
Blockly.Words['astro_sunriseEndText']    = {'en': 'sunrise end',                     'de': 'Sonnenaufgang-Ende',            'ru': 'конец восхода'};
Blockly.Words['astro_goldenHourEndText'] = {'en': 'golden hour end',                 'de': '"Golden hour"-Ende',            'ru': 'конец золотого часа'};
Blockly.Words['astro_solarNoonText']     = {'en': 'solar noon',                      'de': 'Sonnenmittag',                  'ru': 'солнечеый полдень'};
Blockly.Words['astro_goldenHourText']    = {'en': 'golden hour',                     'de': '"Golden hour"',                 'ru': 'золотой час'};
Blockly.Words['astro_sunsetStartText']   = {'en': 'sunset start',                    'de': 'Sonnenuntergang-Anfang',        'ru': 'начало захода солнца'};
Blockly.Words['astro_sunsetText']        = {'en': 'sunset',                          'de': 'Sonnenuntergang',               'ru': 'конец захода солнца'};
Blockly.Words['astro_duskText']          = {'en': 'dusk',                            'de': 'Abenddämmerung',                'ru': 'сумерки'};
Blockly.Words['astro_nauticalDuskText']  = {'en': 'nautical dusk',                   'de': 'Nautische Abenddämmerung',      'ru': 'навигационные сумерки'};
Blockly.Words['astro_nightText']         = {'en': 'night',                           'de': 'Nacht',                         'ru': 'ночь'};
Blockly.Words['astro_nightEndText']      = {'en': 'night end',                       'de': 'Nachtsende',                    'ru': 'конец ночи'};
Blockly.Words['astro_nauticalDawnText']  = {'en': 'nautical dawn',                   'de': 'Nautische Morgendämmerung',     'ru': 'навигационный рассвет'};
Blockly.Words['astro_dawnText']          = {'en': 'dawn',                            'de': 'Morgendämmerung',               'ru': 'рассвет'};
Blockly.Words['astro_nadirText']         = {'en': 'nadir',                           'de': 'Nadir',                         'ru': 'надир'};

Blockly.Words['astro_help'] = {
    'en': 'astro--function',
    'de': 'astro--function',
    'ru': 'astro--function'
};

Blockly.System.blocks['astro'] =
    '<block type="astro">'
    + '     <value name="TYPE">'
    //+ '         <shadow type="text">'
    //+ '             <field name="TEXT">test</field>'
    //+ '         </shadow>'
    + '     </value>'
    + '     <value name="OFFSET">'
    + '     </value>'
    + '     <value name="STATEMENT">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['astro'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(Blockly.Words['astro'][systemLang]);

        this.appendDummyInput("TYPE")
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Words['astro_sunriseText'][systemLang],         "sunrise"],
                [Blockly.Words['astro_sunriseEndText'][systemLang],      "sunriseEnd"],
                [Blockly.Words['astro_goldenHourEndText'][systemLang],   "goldenHourEnd"],
                [Blockly.Words['astro_solarNoonText'][systemLang],       "solarNoon"],
                [Blockly.Words['astro_goldenHourText'][systemLang],      "goldenHour"],
                [Blockly.Words['astro_sunsetStartText'][systemLang],     "sunsetStart"],
                [Blockly.Words['astro_sunsetText'][systemLang],          "sunset"],
                [Blockly.Words['astro_duskText'][systemLang],            "dusk"],
                [Blockly.Words['astro_nauticalDuskText'][systemLang],    "nauticalDusk"],
                [Blockly.Words['astro_nightText'][systemLang],           "night"],
                [Blockly.Words['astro_nightEndText'][systemLang],        "nightEnd"],
                [Blockly.Words['astro_nauticalDawnText'][systemLang],    "nauticalDawn"],
                [Blockly.Words['astro_dawnText'][systemLang],            "dawn"],
                [Blockly.Words['astro_nadirText'][systemLang],           "nadir"]
            ]), "TYPE");

        this.appendDummyInput()
            .appendField(Blockly.Words['astro_offset'][systemLang]);

        this.appendDummyInput("OFFSET")
            .appendField(new Blockly.FieldTextInput("0"), "OFFSET");

        this.appendDummyInput()
            .appendField(Blockly.Words['astro_minutes'][systemLang]);

        this.appendStatementInput("STATEMENT")
            .setCheck(null);
        this.setInputsInline(true);

        this.setColour(Blockly.System.HUE);
        this.setTooltip(Blockly.Words['astro_tooltip'][systemLang]);
        this.setHelpUrl(getHelp('astro_help'));
    }
};
Blockly.JavaScript['astro'] = function(block) {
    var astrotype = block.getFieldValue('TYPE');
    var offset    = parseInt(block.getFieldValue('OFFSET'), 10);
    var statements_name = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    return 'schedule({astro: "' + astrotype + '", shift: ' + offset + '}, function () {\n' + statements_name + '});\n';
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

// --- create state --------------------------------------------------
Blockly.Words['create']         = {'en': 'create state',    'de': 'Zustand erzeugen',   'ru': 'создать состояние'};
Blockly.Words['create_jsState'] = {'en': 'jsState',         'de': 'jsState',            'ru': 'jsState'};
Blockly.Words['create_tooltip'] = {'en': 'create state',    'de': 'Zustand erzeugen',   'ru': 'создать состояние'};
Blockly.Words['create_help']    = {'en': 'createstate',     'de': 'createstate',        'ru': 'createstate'};

Blockly.System.blocks['create'] =
    '<block type="create">'
    + '     <value name="NAME">'
    //+ '         <shadow type="text">'
    //+ '             <field name="TEXT">test</field>'
    //+ '         </shadow>'
    + '     </value>'
    + '     <value name="STATEMENT">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['create'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(Blockly.Words['create'][systemLang]);

        this.appendDummyInput("NAME")
            .appendField(new Blockly.FieldTextInput(Blockly.Words['create_jsState'][systemLang]), "NAME");

        this.appendStatementInput("STATEMENT")
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

// --- select OID --------------------------------------------------
Blockly.Words['field_oid']         = {'en': 'Select OID',    'de': 'Zustand erzeugen',   'ru': 'создать состояние'};
Blockly.Words['field_oid_OID']     = {'en': 'Object ID',         'de': 'Objekt ID',            'ru': 'ID объекта'};
Blockly.Words['field_oid_tooltip'] = {'en': 'Select object ID with dialog',    'de': 'Objekt ID mit Dialog selektieren',   'ru': 'Выбрать ID объекта'};

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
            .appendField(new Blockly.FieldOID("default", main.initSelectId(), main.objects), 'oid');

        this.setInputsInline(true);
        this.setColour(Blockly.System.HUE);
        this.setOutput(true, "String");
        this.setTooltip(Blockly.Words['field_oid_tooltip'][systemLang]);
    }
};

Blockly.JavaScript['field_oid'] = function(block) {
    var oid = block.getFieldValue('oid');
    return [oid, Blockly.JavaScript.ORDER_ATOMIC]
};
// --- get value --------------------------------------------------
Blockly.Words['get_value']         = {'en': 'Get state value',    'de': 'Zustandswert nehmen',   'ru': 'Взять значение состояния'};
Blockly.Words['get_value_OID']     = {'en': 'Value of Object ID',         'de': 'Wert vom Objekt ID',            'ru': 'Значение объекта'};
Blockly.Words['get_value_tooltip'] = {'en': 'Select object ID with dialog',    'de': 'Objekt ID mit Dialog selektieren',   'ru': 'Выбрать ID объекта'};
Blockly.Words['get_value_help']    = {'en': 'createstate',     'de': 'createstate',        'ru': 'createstate'};

Blockly.System.blocks['get_value'] =
    '<block type="get_value">'
    + '     <value name="TEXT">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['get_value'] = {
    // Checkbox.
    init: function() {

        this.appendDummyInput()
            .appendField(Blockly.Words['get_value_OID'][systemLang]);

        this.appendDummyInput()
            .appendField(new Blockly.FieldOID("default", main.initSelectId(), main.objects), 'oid');

        this.setInputsInline(true);
        this.setColour(Blockly.System.HUE);
        this.setOutput(true, "String");
        this.setTooltip(Blockly.Words['get_value_tooltip'][systemLang]);
        this.setHelpUrl(getHelp('get_value'));
    }
};

Blockly.JavaScript['get_value'] = function(block) {
    var oid = block.getFieldValue('oid');
    return ['getValue("' + oid + '").val', Blockly.JavaScript.ORDER_ATOMIC];
};
