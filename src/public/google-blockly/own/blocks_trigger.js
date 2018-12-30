'use strict';

goog.provide('Blockly.JavaScript.Trigger');

goog.require('Blockly.JavaScript');

Blockly.CustomBlocks = Blockly.CustomBlocks || [];
Blockly.CustomBlocks.push('Trigger');


Blockly.Trigger = {
    HUE: 330,
    blocks: {}
};

// --- ON Extended-----------------------------------------------------------
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
    var firstID;
    for (var n = 0; n < block.itemCount_; n++) {
        var id =  Blockly.JavaScript.valueToCode(block, 'OID' + n, Blockly.JavaScript.ORDER_COMMA);
        if (id) {
            firstID = id;
            id = id.replace(/\./g, '\\\\.').replace(/\(/g, '\\\\(').replace(/\)/g, '\\\\)').replace(/\[/g, '\\\\[');
            if (oids.indexOf(id) === -1) oids.push(id);
        }
    }
    var oid;
    if (oids.length === 1) {
        oid = firstID;
    } else {
        oid = 'new RegExp(' + (oids.join(' + "|" + ') || '') + ')';
    }


    var code = 'on({id: ' + oid + ', '  + val + (ack_condition ? ', ack: ' + ack_condition : '') + '}, function (obj) {\n  ' +
        (oids.length === 1 ? 'var value = obj.state.val;\n  var oldValue = obj.oldState.val;\n' : '') + 
        statements_name + '});\n';
    return code;
};

// --- ON -----------------------------------------------------------
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
            .appendField(new Blockly.FieldOID('Object ID'), 'OID');

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
                [Blockly.Words['on_source_id'][systemLang],             'id'],
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

    if (schedule[0] === '{') {
        schedule = "'" + schedule + "'";
    } else {
        schedule = '"' + schedule + '"';
    }
    return 'schedule(' + schedule + ', function () {\n' + statements_name + '});\n';
};

// --- ASTRO -----------------------------------------------------------
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
            ]), 'TYPE');

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

// --- set named schedule -----------------------------------------------------------
Blockly.Trigger.blocks['schedule_create'] =
    '<block type="schedule_create">'
    + '     <value name="NAME">'
    + '     </value>'
    + '     <value name="SCHEDULE">'
    + '         <shadow type="field_cron">'
    + '             <field name="CRON">* * * * *</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="STATEMENT">'
    + '     </value>'
    + '</block>';
/**
 * Ensure two identically-named procedures don't exist.
 * @param {string} name Proposed procedure name.
 * @param {!Blockly.Block} block Block to disambiguate.
 * @return {string} Non-colliding name.
 */
Blockly.Trigger.findLegalName = function(name, block) {
    if (block.isInFlyout) {
        // Flyouts can have multiple procedures called 'do something'.
        return name;
    }
    while (!Blockly.Trigger.isLegalName_(name, block.workspace, block)) {
        // Collision with another procedure.
        var r = name.match(/^(.*?)(\d+)$/);
        if (!r) {
            name += '2';
        } else {
            name = r[1] + (parseInt(r[2], 10) + 1);
        }
    }
    return name;
};

/**
 * Does this procedure have a legal name?  Illegal names include names of
 * procedures already defined.
 * @param {string} name The questionable name.
 * @param {!Blockly.Workspace} workspace The workspace to scan for collisions.
 * @param {Blockly.Block=} opt_exclude Optional block to exclude from
 *     comparisons (one doesn't want to collide with oneself).
 * @return {boolean} True if the name is legal.
 * @private
 */
Blockly.Trigger.isLegalName_ = function(name, workspace, opt_exclude) {
    var blocks = workspace.getAllBlocks();
    // Iterate through every block and check the name.
    for (var i = 0; i < blocks.length; i++) {
        if (blocks[i] == opt_exclude) {
            continue;
        }
        if (blocks[i].isSchedule_) {
            var blockName = blocks[i].getFieldValue('NAME');
            if (Blockly.Names.equals(blockName, name)) {
                return false;
            }
        }
    }
    return true;
};
/**
 * Rename a procedure.  Called by the editable field.
 * @param {string} name The proposed new name.
 * @return {string} The accepted name.
 * @this {!Blockly.Field}
 */
Blockly.Trigger.rename = function (name) {
    // Strip leading and trailing whitespace.  Beyond this, all names are legal.
    name = name.replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');
    return Blockly.Trigger.findLegalName(name, this.sourceBlock_);
};

Blockly.Blocks['schedule_create'] = {
    init: function() {
        var nameField = new Blockly.FieldTextInput(
            Blockly.Trigger.findLegalName('schedule', this),
            Blockly.Trigger.rename);

        nameField.setSpellcheck(false);

        this.appendDummyInput('NAME')
            .appendField(Blockly.Words['schedule_create'][systemLang])
            .appendField(nameField, 'NAME');

        this.appendValueInput('SCHEDULE')
            .appendField(Blockly.Words['schedule_text'][systemLang]);

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setInputsInline(false);
        this.setColour(Blockly.Trigger.HUE);
        this.setTooltip(Blockly.Words['schedule_create_tooltip'][systemLang]);
        this.setHelpUrl(getHelp('schedule_create_help'));
    },
    isSchedule_: true,
    getVars: function () {
        return [this.getFieldValue('NAME')];
    }
};

Blockly.JavaScript['schedule_create'] = function (block) {
    var name  = block.getFieldValue('NAME');
    var schedule = Blockly.JavaScript.valueToCode(block, 'SCHEDULE', Blockly.JavaScript.ORDER_ATOMIC);
    var statements_name = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    return name + ' = schedule(' + schedule + ', function () {\n' + statements_name + '});\n';
};

// --- clearSchedule -----------------------------------------------------------
Blockly.Trigger.getAllSchedules = function (workspace) {
    var blocks = workspace.getAllBlocks();
    var result = [];

    // Iterate through every block and check the name.
    for (var i = 0; i < blocks.length; i++) {
        if (blocks[i].isSchedule_) {
            result.push([blocks[i].getFieldValue('NAME'), blocks[i].getFieldValue('NAME')]);
        }
    }
    if (!result.length) result.push(['', '']);

    return result;
};

Blockly.Trigger.blocks['schedule_clear'] =
    '<block type="schedule_clear">'
    + '     <value name="NAME">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['schedule_clear'] = {
    init: function() {
        this.appendDummyInput('NAME')
            .appendField(Blockly.Words['schedule_clear'][systemLang])
            .appendField(new Blockly.FieldDropdown(function () {
                return Blockly.Trigger.getAllSchedules(scripts.blocklyWorkspace);
            }), 'NAME');

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setInputsInline(true);
        this.setColour(Blockly.Trigger.HUE);
        this.setTooltip(Blockly.Words['schedule_clear_tooltip'][systemLang]);
        this.setHelpUrl(getHelp('schedule_clear_help'));
    }
};

Blockly.JavaScript['schedule_clear'] = function(block) {
    var name = block.getFieldValue('NAME');
    return '(function () {if (' + name + ') {clearSchedule(' + name + '); ' + name + ' = null;}})();\n';
};

// --- CRON dialog --------------------------------------------------
Blockly.Trigger.blocks['field_cron'] =
    '<block type="field_cron">'
    + '     <value name="CRON">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['field_cron'] = {
    // Checkbox.
    init: function() {
        this.appendDummyInput()
            .appendField(Blockly.Words['field_cron_CRON'][systemLang]);

        this.appendDummyInput()
            .appendField(new Blockly.FieldCRON('* * * * *'), 'CRON');

        this.setInputsInline(true);
        this.setColour(Blockly.Trigger.HUE);
        this.setOutput(true, 'String');
        this.setTooltip(Blockly.Words['field_cron_tooltip'][systemLang]);
    }
};

Blockly.JavaScript['field_cron'] = function(block) {
    var cron = block.getFieldValue('CRON');
    return ['\'' + cron + '\'', Blockly.JavaScript.ORDER_ATOMIC]
};

// --- CRON builder --------------------------------------------------
Blockly.Trigger.blocks['cron_builder'] =
    '<block type="cron_builder">'
    + '     <value name="LINE">'
    + '     </value>'
    + '     <value name="MINUTES">'
    + '     </value>'
    + '     <value name="HOURS">'
    + '     </value>'
    + '     <value name="DAYS">'
    + '     </value>'
    + '     <value name="MONTHS">'
    + '     </value>'
    + '     <value name="WEEKDAYS">'
    + '     </value>'
    + '     <value name="WITH_SECONDS">'
    + '     </value>'
    + '     <mutation seconds="false"></mutation>'
    + '</block>';

Blockly.Blocks['cron_builder'] = {
    // Checkbox.
    init: function() {

        this.appendDummyInput()
            .appendField(Blockly.Words['cron_builder_CRON'][systemLang]);

        this.appendDummyInput('LINE')
            .appendField(Blockly.Words['cron_builder_line'][systemLang])
            .appendField(new Blockly.FieldCheckbox('FALSE', function (option) {
                this.sourceBlock_.setInputsInline(option == true);
            }), 'LINE');

        var _input = this.appendValueInput('DOW')
            .appendField(Blockly.Words['cron_builder_dow'][systemLang]);
        var _shadow = this.workspace.newBlock('text');
        _shadow.setShadow(true);
        _shadow.setFieldValue('*', 'TEXT');
        _shadow.outputConnection.connect(_input.connection);


        _input = this.appendValueInput('MONTHS')
            .appendField(Blockly.Words['cron_builder_month'][systemLang]);
        _shadow = this.workspace.newBlock('text');
        _shadow.setShadow(true);
        _shadow.setFieldValue('*', 'TEXT');
        _shadow.outputConnection.connect(_input.connection);

        _input = this.appendValueInput('DAYS')
            .appendField(Blockly.Words['cron_builder_day'][systemLang]);
        _shadow = this.workspace.newBlock('text');
        _shadow.setShadow(true);
        _shadow.setFieldValue('*', 'TEXT');
        _shadow.outputConnection.connect(_input.connection);


        _input = this.appendValueInput('HOURS')
            .appendField(Blockly.Words['cron_builder_hour'][systemLang]);
        _shadow = this.workspace.newBlock('text');
        _shadow.setShadow(true);
        _shadow.setFieldValue('*', 'TEXT');
        _shadow.outputConnection.connect(_input.connection);


        _input = this.appendValueInput('MINUTES')
            .appendField(Blockly.Words['cron_builder_minutes'][systemLang]);
        _shadow = this.workspace.newBlock('text');
        _shadow.setShadow(true);
        _shadow.setFieldValue('*', 'TEXT');
        _shadow.outputConnection.connect(_input.connection);

        this.appendDummyInput('WITH_SECONDS')
            .appendField(Blockly.Words['cron_builder_with_seconds'][systemLang])
            .appendField(new Blockly.FieldCheckbox('FALSE', function (option) {
                var withSeconds = (option == true);
                this.sourceBlock_.updateShape_(withSeconds);
            }), 'WITH_SECONDS');

        this.seconds_ = false;
        this.as_line_ = false;
        this.setInputsInline(this.as_line_);
        this.setColour(Blockly.Trigger.HUE);
        this.setOutput(true, 'String');
        this.setTooltip(Blockly.Words['field_cron_tooltip'][systemLang]);
    },
    /**
     * Create XML to represent number of text inputs.
     * @return {!Element} XML storage element.
     * @this Blockly.Block
     */
    mutationToDom: function () {
        var container = document.createElement('mutation');
        container.setAttribute('seconds', this.seconds_);
        container.setAttribute('as_line', this.as_line_);
        return container;
    },
    /**
     * Parse XML to restore the text inputs.
     * @param {!Element} xmlElement XML storage element.
     * @this Blockly.Block
     */
    domToMutation: function (xmlElement) {
        this.seconds_ = xmlElement.getAttribute('seconds') === 'true';
        this.as_line_ = xmlElement.getAttribute('as_line') === 'true';
        this.setInputsInline(this.as_line_);
        this.updateShape_(this.seconds_);
    },
    updateShape_: function(withSeconds) {
        this.seconds_ = withSeconds;
        // Add or remove a statement Input.
        var inputExists = this.getInput('SECONDS');

        if (withSeconds) {
            if (!inputExists) {
                var _input = this.appendValueInput('SECONDS');
                _input.appendField(Blockly.Words['cron_builder_seconds'][systemLang]);

                var _shadow = this.workspace.newBlock('text');
                _shadow.setShadow(true);
                _shadow.setFieldValue('*', 'TEXT');
                _shadow.outputConnection.connect(_input.connection);
                _shadow.initSvg();
                _shadow.render();
            }
        } else if (inputExists) {
            this.removeInput('SECONDS');
        }
    }

};

Blockly.JavaScript['cron_builder'] = function(block) {
    var dow     = Blockly.JavaScript.valueToCode(block, 'DOW',     Blockly.JavaScript.ORDER_ATOMIC);
    var months  = Blockly.JavaScript.valueToCode(block, 'MONTHS',  Blockly.JavaScript.ORDER_ATOMIC);
    var days    = Blockly.JavaScript.valueToCode(block, 'DAYS',    Blockly.JavaScript.ORDER_ATOMIC);
    var hours   = Blockly.JavaScript.valueToCode(block, 'HOURS',   Blockly.JavaScript.ORDER_ATOMIC);
    var minutes = Blockly.JavaScript.valueToCode(block, 'MINUTES', Blockly.JavaScript.ORDER_ATOMIC);
    var seconds = Blockly.JavaScript.valueToCode(block, 'SECONDS', Blockly.JavaScript.ORDER_ATOMIC);
    var withSeconds = block.getFieldValue('WITH_SECONDS');

    var code = ((withSeconds === 'TRUE') ? seconds + '.trim() + \' \' + ' : '') + minutes + '.trim() + \' \' + ' + hours + '.trim() + \' \' + ' + days + '.trim() + \' \' + ' + months + '.trim() + \' \' + ' + dow + '.trim()';
    return [code, Blockly.JavaScript.ORDER_ATOMIC]
};
