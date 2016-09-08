'use strict';

goog.provide('Blockly.JavaScript.Trigger');

goog.require('Blockly.JavaScript');

Blockly.CustomBlocks = Blockly.CustomBlocks || [];
Blockly.CustomBlocks.push('Trigger');

Blockly.Words = Blockly.Words || {};
Blockly.Words['Trigger'] = {'en': 'Trigger', 'de': 'Trigger', 'ru': 'События'};

Blockly.Trigger = {
    HUE: 330,
    blocks: {}
};

// --- ON Extended-----------------------------------------------------------

Blockly.Words['on_onchange'] = {'en': 'was changed',                    'de': 'wurde geändert',                         'ru': 'изменился'};
Blockly.Words['on_any']      = {'en': 'was updated',                    'de': 'wurde aktulaisiert',                     'ru': 'обновился'};
Blockly.Words['on_gt']       = {'en': 'is greater than last',           'de': 'ist größer als letztes',                 'ru': 'больше прошлого'};
Blockly.Words['on_ge']       = {'en': 'is greater or equal than last',  'de': 'ist gleich oder größer als letztes',     'ru': 'больше или равен прошлому'};
Blockly.Words['on_lt']       = {'en': 'is less than last',              'de': 'ist kleiner als letztes',                'ru': 'меньше прошлого'};
Blockly.Words['on_le']       = {'en': 'is less or equal than last',     'de': 'ist gleich oder kleiner als letztes',    'ru': 'меньше или равен прошлому'};
Blockly.Words['on_eq']       = {'en': 'is same as last',                'de': 'ist gleich wie letztes',                 'ru': 'равен прошлому'};
Blockly.Words['on_true']     = {'en': 'is true',                        'de': 'ist wahr',                               'ru': 'равен true'};
Blockly.Words['on_false']    = {'en': 'is false',                       'de': 'ist unwahr',                             'ru': 'равен false'};
Blockly.Words['on_help']     = {
    'en': 'on---subscribe-on-changes-or-updates-of-some-state',
    'de': 'on---subscribe-on-changes-or-updates-of-some-state',
    'ru': 'on---subscribe-on-changes-or-updates-of-some-state'
};
Blockly.Words['on_ack']      = {'en': 'Ack is',                         'de': 'anerkannt ist',                          'ru': 'Подтверждение'};
Blockly.Words['on_ack_any']  = {'en': 'any',                            'de': 'egal',                                   'ru': 'не важно'};
Blockly.Words['on_ack_true'] = {'en': 'update',                         'de': 'Update',                                 'ru': 'обновление'};
Blockly.Words['on_ack_false'] = {'en': 'command',                       'de': 'Kommando',                               'ru': 'команда'};


Blockly.Words['on_ext']             = {'en': 'Event: if objects',               'de': 'Falls Objekt',                           'ru': 'Событие: если объект'};
Blockly.Words['on_ext_tooltip']     = {'en': 'If some state changed or updated', 'de': 'Auf Zustandsänderung',                  'ru': 'При изменении или обновлении состояния'};
Blockly.Words['on_ext_oid']         = {'en': 'object ID',                       'de': 'Objekt ID',                              'ru': 'ID объекта'};
Blockly.Words['on_ext_oid_tooltip'] = {'en': 'Object ID',                       'de': 'Objekt ID',                              'ru': 'ID объекта'};
Blockly.Words['on_ext_on']          = {'en': 'trigger on',                      'de': 'falls Trigger auf',                      'ru': 'если cобытие'};
Blockly.Words['on_ext_on_tooltip']  = {'en': 'trigger on',                      'de': 'falls Trigger auf',                      'ru': 'если cобытие'};

Blockly.Trigger.blocks['on_ext'] =
    '<block type="on_ext">'
    + '     <value name="CONDITION">'
    + '     </value>'
    + '     <value name="ACK_CONDITION">'
    + '     </value>'
    + '     <value name="STATEMENT">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['on_ext_oid_container'] = {
    /**
     * Mutator block for container.
     * @this Blockly.Block
     */
    init: function() {
        this.setColour(Blockly.Trigger.HUE);

        this.appendDummyInput()
            .appendField(Blockly.Words['on_ext_on'][systemLang]);

        this.appendStatementInput('STACK');
        this.setTooltip(Blockly.Words['on_ext_on_tooltip'][systemLang]);
        this.contextMenu = false;
    }
};

Blockly.Blocks['on_ext_oid'] = {
    /**
     * Mutator block for add items.
     * @this Blockly.Block
     */
    init: function() {
        this.setColour(Blockly.Trigger.HUE);

        this.appendDummyInput('OID')
            .appendField(Blockly.Words['on_ext_oid'][systemLang]);

        this.setPreviousStatement(true);
        this.setNextStatement(true);

        this.setTooltip(Blockly.Words['on_ext_oid_tooltip'][systemLang]);

        this.contextMenu = false;
    }
};

Blockly.Blocks['on_ext'] = {
    init: function() {
        this.itemCount_ = 1;
        this.updateShape_();

        this.setMutator(new Blockly.Mutator(['on_ext_oid']));

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setInputsInline(false);
        this.setColour(Blockly.Trigger.HUE);
        this.setTooltip(Blockly.Words['on_ext_tooltip'][systemLang]);
        this.setHelpUrl(getHelp('on_help'));
    },
    /**
     * Create XML to represent number of text inputs.
     * @return {!Element} XML storage element.
     * @this Blockly.Block
     */
    mutationToDom: function () {
        var container = document.createElement('mutation');
        container.setAttribute('items', this.itemCount_);
        return container;
    },
    /**
     * Parse XML to restore the text inputs.
     * @param {!Element} xmlElement XML storage element.
     * @this Blockly.Block
     */
    domToMutation: function (xmlElement) {
        this.itemCount_ = parseInt(xmlElement.getAttribute('items'), 10);
        this.updateShape_();
    },
    /**
     * Populate the mutator's dialog with this block's components.
     * @param {!Blockly.Workspace} workspace Mutator's workspace.
     * @return {!Blockly.Block} Root block in mutator.
     * @this Blockly.Block
     */
    decompose: function (workspace) {
        var containerBlock = workspace.newBlock('on_ext_oid_container');
        containerBlock.initSvg();
        var connection = containerBlock.getInput('STACK').connection;
        for (var i = 0; i < this.itemCount_; i++) {
            var itemBlock = workspace.newBlock('on_ext_oid');
            itemBlock.initSvg();
            connection.connect(itemBlock.previousConnection);
            connection = itemBlock.nextConnection;
        }
        return containerBlock;
    },
    /**
     * Reconfigure this block based on the mutator dialog's components.
     * @param {!Blockly.Block} containerBlock Root block in mutator.
     * @this Blockly.Block
     */
    compose: function (containerBlock) {
        var itemBlock = containerBlock.getInputTargetBlock('STACK');
        // Count number of inputs.
        var connections = [];
        while (itemBlock) {
            connections.push(itemBlock.valueConnection_);
            itemBlock = itemBlock.nextConnection &&
                itemBlock.nextConnection.targetBlock();
        }
        // Disconnect any children that don't belong.
        for (var i = 0; i < this.itemCount_; i++) {
            var connection = this.getInput('OID' + i).connection.targetConnection;
            if (connection && connections.indexOf(connection) === -1) {
                connection.disconnect();
            }
        }
        this.itemCount_ = connections.length;
        if (this.itemCount_ < 1) this.itemCount_ = 1;
        this.updateShape_();
        // Reconnect any child blocks.
        for (var i = 0; i < this.itemCount_; i++) {
            Blockly.Mutator.reconnect(connections[i], this, 'OID' + i);
        }
    },
    /**
     * Store pointers to any connected child blocks.
     * @param {!Blockly.Block} containerBlock Root block in mutator.
     * @this Blockly.Block
     */
    saveConnections: function(containerBlock) {
        var itemBlock = containerBlock.getInputTargetBlock('STACK');
        var i = 0;
        while (itemBlock) {
            var input = this.getInput('OID' + i);
            itemBlock.valueConnection_ = input && input.connection.targetConnection;
            i++;
            itemBlock = itemBlock.nextConnection &&
                itemBlock.nextConnection.targetBlock();
        }
    },
    /**
     * Modify this block to have the correct number of inputs.
     * @private
     * @this Blockly.Block
     */
    updateShape_: function() {
        this.removeInput('CONDITION');
        this.removeInput('ACK_CONDITION');
        var input;

        for (var j = 0; input = this.inputList[j]; j++) {
            if (input.name === 'STATEMENT') {
                this.inputList.splice(j, 1);
                break;
            }
        }

        // Add new inputs.
        for (var i = 0; i < this.itemCount_; i++) {
            var _input = this.getInput('OID' + i);
            if (!_input) {
                _input = this.appendValueInput('OID' + i);

                if (i === 0) {
                    _input.appendField(Blockly.Words['on_ext'][systemLang]);
                }
                var shadow = this.workspace.newBlock('field_oid');
                shadow.setShadow(true);
                shadow.outputConnection.connect(_input.connection);
                shadow.initSvg();
                shadow.render();
            } else {
                if (!_input.connection.isConnected()) {
                    var shadow = this.workspace.newBlock('field_oid');
                    shadow.setShadow(true);
                    shadow.outputConnection.connect(_input.connection);
                    shadow.initSvg();
                    shadow.render();
                }
            }
        }
        // Remove deleted inputs.
        while (this.getInput('OID' + i)) {
            this.removeInput('OID' + i);
            i++;
        }

        this.appendDummyInput('CONDITION')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Words['on_onchange'][systemLang], 'ne'],
                [Blockly.Words['on_any'][systemLang], 'any'],
                [Blockly.Words['on_gt'][systemLang], 'gt'],
                [Blockly.Words['on_ge'][systemLang], 'ge'],
                [Blockly.Words['on_lt'][systemLang], 'lt'],
                [Blockly.Words['on_le'][systemLang], 'le'],
                [Blockly.Words['on_true'][systemLang], 'true'],
                [Blockly.Words['on_false'][systemLang], 'false']
            ]), 'CONDITION');

        this.appendDummyInput('ACK_CONDITION')
            .appendField(Blockly.Words['on_ack'][systemLang])
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Words['on_ack_any'][systemLang], ''],
                [Blockly.Words['on_ack_true'][systemLang], 'true'],
                [Blockly.Words['on_ack_false'][systemLang], 'false']
            ]), 'ACK_CONDITION');

        if (input) {
            this.inputList.push(input);
        }
        else {
            this.appendStatementInput('STATEMENT')
                .setCheck(null)
        }
    }
};
Blockly.JavaScript['on_ext'] = function(block) {
    var dropdown_condition = block.getFieldValue('CONDITION');
    var statements_name = Blockly.JavaScript.statementToCode(block, 'STATEMENT');
    var ack_condition = block.getFieldValue('ACK_CONDITION');
    var val;
    if (dropdown_condition === 'true' || dropdown_condition === 'false') {
        val = 'val: ' + dropdown_condition;
    } else {
        val = 'change: "' + dropdown_condition + '"';
    }

    var oids = [];
    for (var n = 0; n < block.itemCount_; n++) {
        var id =  Blockly.JavaScript.valueToCode(block, 'OID' + n, Blockly.JavaScript.ORDER_COMMA);
        if (id) {
            id = id.replace(/\./g, '\\\\.');
            if (oids.indexOf(id) === -1) oids.push(id);
        }
    }
    var oid;
    if (oids.length === 1) {
        oid = oids[0];
    } else {
        oid = 'new RegExp(' + (oids.join(' + "|" + ')|| "") + ')';
    }


    var code = 'on({id: ' + oid + ', '  + val + (ack_condition ? ', ack: ' + ack_condition : '') + '}, function (obj) {\n  ' +
        (oids.length === 1 ? 'var value = obj.state.val;\n  var oldValue = obj.oldState.val;\n' : '') + 
        statements_name + '});\n';
    return code;
};

// --- ON -----------------------------------------------------------
Blockly.Words['on']          = {'en': 'Event: if object',               'de': 'Falls Objekt',                           'ru': 'Событие: если объект'};
Blockly.Words['on_tooltip']  = {'en': 'If some state changed or updated', 'de': 'Auf Zustandsänderung',                 'ru': 'При изменении или обновлении состояния'};

Blockly.Trigger.blocks['on'] =
    '<block type="on">'
    + '     <value name="OID">'
    + '     </value>'
    + '     <value name="CONDITION">'
    + '     </value>'
    + '     <value name="ACK_CONDITION">'
    + '     </value>'
    + '     <value name="STATEMENT">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['on'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(Blockly.Words['on'][systemLang]);

        this.appendDummyInput('OID')
            .appendField(new Blockly.FieldOID('Object ID', main.initSelectId(), main.objects), 'OID');

        this.appendDummyInput('CONDITION')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Words['on_onchange'][systemLang], 'ne'],
                [Blockly.Words['on_any'][systemLang], 'any'],
                [Blockly.Words['on_gt'][systemLang], 'gt'],
                [Blockly.Words['on_ge'][systemLang], 'ge'],
                [Blockly.Words['on_lt'][systemLang], 'lt'],
                [Blockly.Words['on_le'][systemLang], 'le'],
                [Blockly.Words['on_true'][systemLang], 'true'],
                [Blockly.Words['on_false'][systemLang], 'false']
            ]), 'CONDITION');

        this.appendDummyInput('ACK_CONDITION')
            .appendField(Blockly.Words['on_ack'][systemLang])
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Words['on_ack_any'][systemLang], ''],
                [Blockly.Words['on_ack_true'][systemLang], 'true'],
                [Blockly.Words['on_ack_false'][systemLang], 'false']
            ]), 'ACK_CONDITION');

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setInputsInline(false);
        this.setColour(Blockly.Trigger.HUE);
        this.setTooltip(Blockly.Words['on_tooltip'][systemLang]);
        this.setHelpUrl(getHelp('on_help'));
    }
};
Blockly.JavaScript['on'] = function(block) {
    var value_objectid = block.getFieldValue('OID');
    var dropdown_condition = block.getFieldValue('CONDITION');
    var ack_condition = block.getFieldValue('ACK_CONDITION');
    var statements_name = Blockly.JavaScript.statementToCode(block, 'STATEMENT');
    var objectname = main.objects[value_objectid] && main.objects[value_objectid].common && main.objects[value_objectid].common.name ? main.objects[value_objectid].common.name : '';

    Blockly.Msg.VARIABLES_DEFAULT_NAME = 'value';

    var val;
    if (dropdown_condition === 'true' || dropdown_condition === 'false') {
        val = 'val: ' + dropdown_condition;
    } else {
        val = 'change: "' + dropdown_condition + '"';
    }

    var code = 'on({id: "' + value_objectid + '"' + (objectname ? '/*' + objectname + '*/' : '') + ', '  + val + (ack_condition ? ', ack: ' + ack_condition : '') + '}, function (obj) {\n  var value = obj.state.val;\n  var oldValue = obj.oldState.val;\n' + statements_name + '});\n';
    return code;
};

// --- get info about event -----------------------------------------------------------
Blockly.Words['on_source']              = {'en': 'get',                'de': 'Nehme',                           'ru': 'взять'};
Blockly.Words['on_source_of']           = {'en': 'of trigger',         'de': 'von Trigger',                     'ru': 'триггера'};
Blockly.Words['on_source_tooltip']      = {'en': 'Get information about event', 'de': 'Bekommen die Information über Ereignis',      'ru': 'Получить информацию о событии'};
Blockly.Words['on_source_id']           = {'en': 'object ID',                       'de': 'Objekt ID',          'ru': 'ID объекта'};
Blockly.Words['on_source_name']         = {'en': 'name',                            'de': 'Name',               'ru': 'имя'};
Blockly.Words['on_source_desc']         = {'en': 'description',                     'de': 'Beschreibung',       'ru': 'описание'};
Blockly.Words['on_source_channel_id']   = {'en': 'channel ID',                      'de': 'Kanal ID',           'ru': 'ID канала'};
Blockly.Words['on_source_channel_name'] = {'en': 'channel name',                    'de': 'Kanalname ID',       'ru': 'имя канала'};
Blockly.Words['on_source_device_id']    = {'en': 'device ID',                       'de': 'Gerät ID ID',        'ru': 'ID устройства'};
Blockly.Words['on_source_device_name']  = {'en': 'device name',                     'de': 'Gerätname',          'ru': 'имя устройства'};
Blockly.Words['on_source_state_val']    = {'en': 'state value',                     'de': 'Wert',               'ru': 'значение'};
Blockly.Words['on_source_state_ts']     = {'en': 'state timestamp',                 'de': 'Zeitstempel',        'ru': 'время'};
Blockly.Words['on_source_state_q']      = {'en': 'state quality',                   'de': 'Qualität',           'ru': 'качество'};
Blockly.Words['on_source_state_from']   = {'en': 'origin of value',                 'de': 'Ursrpung',           'ru': 'происхождение'};
Blockly.Words['on_source_state_ack']    = {'en': 'is command or update',            'de': 'Kommando oder Aktualisierung', 'ru': 'команда или обновление'};
Blockly.Words['on_source_state_lc']     = {'en': 'last change of state',            'de': 'letze Änderung',     'ru': 'последнее изменение'};
Blockly.Words['on_source_oldstate_val'] = {'en': 'previous value',                  'de': 'vorheriges Wert',    'ru': 'предыдущее значение'};
Blockly.Words['on_source_oldstate_ts']  = {'en': 'previous timestamp',              'de': 'vorheriger Zeitstempel', 'ru': 'предыдущее время'};
Blockly.Words['on_source_oldstate_q']   = {'en': 'previous quality',                'de': 'vorherige Quialität', 'ru': 'предыдущее качество'};
Blockly.Words['on_source_oldstate_from']= {'en': 'previous origin',                 'de': 'vorherige Ursrpung', 'ru': 'предыдущее происхождение'};
Blockly.Words['on_source_oldstate_ack'] = {'en': 'previous command or update',      'de': 'vorheriges Ack',     'ru': 'предыдущее команда или обновление'};
Blockly.Words['on_source_oldstate_lc']  = {'en': 'previous last change',            'de': 'vorherige letze Änderung', 'ru': 'предыдущее последнее изменение'};

Blockly.Words['on_source_warning']      = {
    'en': 'This block must be used only inside of event block',
    'de': 'Dieser Block darf nur innerhalb \"Falls Objekt" Block verwendet werden',
    'ru': 'Этот блок можно использовать только внутри блока \"Событие\"'
};

Blockly.Trigger.blocks['on_source'] =
    '<block type="on_source">'
    + '     <value name="ATTR">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['on_source'] = {
    /**
     * Block for conditionally returning a value from a procedure.
     * @this Blockly.Block
     */
    init: function() {
        this.appendDummyInput('ATTR')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Words['on_source_id'][systemLang],             '_id'],
                [Blockly.Words['on_source_name'][systemLang],           'common.name'],
                [Blockly.Words['on_source_desc'][systemLang],           'common.desc'],
                [Blockly.Words['on_source_channel_id'][systemLang],     'channelId'],
                [Blockly.Words['on_source_channel_name'][systemLang],   'channelName'],
                [Blockly.Words['on_source_device_id'][systemLang],      'deviceId'],
                [Blockly.Words['on_source_device_name'][systemLang],    'deviceName'],
                [Blockly.Words['on_source_state_val'][systemLang],      'state.val'],
                [Blockly.Words['on_source_state_ts'][systemLang],       'state.ts'],
                [Blockly.Words['on_source_state_q'][systemLang],        'state.q'],
                [Blockly.Words['on_source_state_from'][systemLang],     'state.from'],
                [Blockly.Words['on_source_state_ack'][systemLang],      'state.ack'],
                [Blockly.Words['on_source_state_lc'][systemLang],       'state.lc'],
                [Blockly.Words['on_source_oldstate_val'][systemLang],   'oldState.val'],
                [Blockly.Words['on_source_oldstate_ts'][systemLang],    'oldState.ts'],
                [Blockly.Words['on_source_oldstate_q'][systemLang],     'oldState.q'],
                [Blockly.Words['on_source_oldstate_from'][systemLang],  'oldState.from'],
                [Blockly.Words['on_source_oldstate_ack'][systemLang],   'oldState.ack'],
                [Blockly.Words['on_source_oldstate_lc'][systemLang],    'oldState.lc']
            ]), 'ATTR');

        this.setInputsInline(true);
        this.setOutput(true);
        this.setColour(Blockly.Trigger.HUE);
        this.setTooltip(Blockly.Words['on_source_tooltip'][systemLang]);
        this.setHelpUrl(getHelp('on_help'));
    },
    /**
     * Called whenever anything on the workspace changes.
     * Add warning if this flow block is not nested inside a loop.
     * @param {!Blockly.Events.Abstract} e Change event.
     * @this Blockly.Block
     */
    onchange: function(e) {
        var legal = false;
        // Is the block nested in a trigger?
        var block = this;
        do {
            if (this.FUNCTION_TYPES.indexOf(block.type) !== -1) {
                legal = true;
                break;
            }
            block = block.getSurroundParent();
        } while (block);

        if (legal) {
            this.setWarningText(null);
        } else {
            this.setWarningText(Blockly.Words['on_source_warning'][systemLang]);
        }
    },
    /**
     * List of block types that are functions and thus do not need warnings.
     * To add a new function type add this to your code:
     * Blockly.Blocks['procedures_ifreturn'].FUNCTION_TYPES.push('custom_func');
     */
    FUNCTION_TYPES: ['on', 'on_ext']
};
Blockly.JavaScript['on_source'] = function(block) {
    var attr = block.getFieldValue('ATTR');
    var parts = attr.split('.');
    if (parts.length > 1) {
        attr = '(obj.' + parts[0] + ' ? obj.' + attr + ' : "")';
    } else {
        attr = 'obj.' + attr;
    }
    return [attr, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- SCHEDULE -----------------------------------------------------------
Blockly.Words['schedule']          = {'en': 'schedule',                      'de': 'Zeitplan',                       'ru': 'Cron расписание'};
Blockly.Words['schedule_tooltip']  = {'en': 'Do something on cron schedule', 'de': 'Ausführen nach Zeitplan',        'ru': 'Выполнять по расписанию'};
Blockly.Words['schedule_help']     = {
    'en': 'schedule',
    'de': 'schedule',
    'ru': 'schedule'
};

Blockly.Trigger.blocks['schedule'] =
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

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setInputsInline(false);
        this.setColour(Blockly.Trigger.HUE);
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

Blockly.Trigger.blocks['astro'] =
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

        this.appendStatementInput('STATEMENT')
            .setCheck(null);
        this.setInputsInline(true);

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(Blockly.Trigger.HUE);
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

