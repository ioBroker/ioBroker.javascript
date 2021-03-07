'use strict';

if (typeof goog !== 'undefined') {
    goog.provide('Blockly.JavaScript.Trigger');

    goog.require('Blockly.JavaScript');
}

Blockly.CustomBlocks = Blockly.CustomBlocks || [];
Blockly.CustomBlocks.push('Trigger');


Blockly.Trigger = {
    HUE: 330,
    blocks: {}
};

// --- ON Extended-----------------------------------------------------------

Blockly.Trigger.blocks['on_ext'] =
    '<block type="on_ext">'
    + '     <mutation items="1"></mutation>'
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
            .appendField(Blockly.Translate('on_ext_on'));

        this.appendStatementInput('STACK');
        this.setTooltip(Blockly.Translate('on_ext_on_tooltip'));
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
            .appendField(Blockly.Translate('on_ext_oid'));

        this.setPreviousStatement(true);
        this.setNextStatement(true);

        this.setTooltip(Blockly.Translate('on_ext_oid_tooltip'));

        this.contextMenu = false;
    }
};

Blockly.Blocks['on_ext'] = {
    init: function() {
        this.itemCount_ = 1;
        this.setMutator(new Blockly.Mutator(['on_ext_oid']));

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setInputsInline(false);
        this.setColour(Blockly.Trigger.HUE);
        this.setTooltip(Blockly.Translate('on_ext_tooltip'));
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
        for (var k = 0; k < this.itemCount_; k++) {
            var connection = this.getInput('OID' + k).connection.targetConnection;
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
        if (this.getInput('CONDITION')) {
            this.removeInput('CONDITION');
        }
        if (this.getInput('ACK_CONDITION')) {
            this.removeInput('ACK_CONDITION');
        }

        var input;

        for (var j = 0; input = this.inputList[j]; j++) {
            if (input.name === 'STATEMENT') {
                this.inputList.splice(j, 1);
                break;
            }
        }

        // Add new inputs.
        var wp = this.workspace;

        for (var i = 0; i < this.itemCount_; i++) {
            var _input = this.getInput('OID' + i);
            if (!_input) {
                _input = this.appendValueInput('OID' + i);

                if (i === 0) {
                    _input.appendField(Blockly.Translate('on_ext'));
                }
                setTimeout(function (_input) {
                    if (!_input.connection.isConnected()) {
                        var shadow = wp.newBlock('field_oid');
                        shadow.setShadow(true);
                        shadow.outputConnection.connect(_input.connection);
                        shadow.initSvg();
                        shadow.render();
                    }
                }, 100, _input);
            } else {
                setTimeout(function (_input) {
                    if (!_input.connection.isConnected()) {
                        var shadow = wp.newBlock('field_oid');
                        shadow.setShadow(true);
                        shadow.outputConnection.connect(_input.connection);
                        shadow.initSvg();
                        shadow.render();
                    }
                }, 100, _input);
            }
        }
        // Remove deleted inputs.
        while (this.getInput('OID' + i)) {
            this.removeInput('OID' + i);
            i++;
        }

        this.appendDummyInput('CONDITION')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('on_onchange'), 'ne'],
                [Blockly.Translate('on_any'), 'any'],
                [Blockly.Translate('on_gt'), 'gt'],
                [Blockly.Translate('on_ge'), 'ge'],
                [Blockly.Translate('on_lt'), 'lt'],
                [Blockly.Translate('on_le'), 'le'],
                [Blockly.Translate('on_true'), 'true'],
                [Blockly.Translate('on_false'), 'false']
            ]), 'CONDITION');

        this.appendDummyInput('ACK_CONDITION')
            .appendField(Blockly.Translate('on_ack'))
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('on_ack_any'), ''],
                [Blockly.Translate('on_ack_true'), 'true'],
                [Blockly.Translate('on_ack_false'), 'false']
            ]), 'ACK_CONDITION');

        if (input) {
            this.inputList.push(input);
        } else {
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
            if (oids.indexOf(id) === -1) {
                oids.push(id);
            }
        }
    }
    var oid;
    if (oids.length === 1) {
        oid = firstID;
    } else {
        oid = 'new RegExp(' + (oids.join(' + "$|" + ') || '') + ' + "$")';
    }

    var code = 'on({id: ' + oid + ', '  + val + (ack_condition ? ', ack: ' + ack_condition : '') + '}, async function (obj) {\n  ' +
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
            .appendField(Blockly.Translate('on'));

        this.appendDummyInput('OID')
            .appendField(new Blockly.FieldOID('Object ID'), 'OID');

        this.appendDummyInput('CONDITION')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('on_onchange'), 'ne'],
                [Blockly.Translate('on_any'), 'any'],
                [Blockly.Translate('on_gt'), 'gt'],
                [Blockly.Translate('on_ge'), 'ge'],
                [Blockly.Translate('on_lt'), 'lt'],
                [Blockly.Translate('on_le'), 'le'],
                [Blockly.Translate('on_true'), 'true'],
                [Blockly.Translate('on_false'), 'false']
            ]), 'CONDITION');

        this.appendDummyInput('ACK_CONDITION')
            .appendField(Blockly.Translate('on_ack'))
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('on_ack_any'), ''],
                [Blockly.Translate('on_ack_true'), 'true'],
                [Blockly.Translate('on_ack_false'), 'false']
            ]), 'ACK_CONDITION');

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setInputsInline(false);
        this.setColour(Blockly.Trigger.HUE);
        this.setTooltip(Blockly.Translate('on_tooltip'));
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

    var code = 'on({id: "' + value_objectid + '"' + (objectname ? '/*' + objectname + '*/' : '') + ', '  + val + (ack_condition ? ', ack: ' + ack_condition : '') + '}, async function (obj) {\n  var value = obj.state.val;\n  var oldValue = obj.oldState.val;\n' + statements_name + '});\n';
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
                [Blockly.Translate('on_source_id'),             'id'],
                [Blockly.Translate('on_source_name'),           'common.name'],
                [Blockly.Translate('on_source_desc'),           'common.desc'],
                [Blockly.Translate('on_source_channel_id'),     'channelId'],
                [Blockly.Translate('on_source_channel_name'),   'channelName'],
                [Blockly.Translate('on_source_device_id'),      'deviceId'],
                [Blockly.Translate('on_source_device_name'),    'deviceName'],
                [Blockly.Translate('on_source_state_val'),      'state.val'],
                [Blockly.Translate('on_source_state_ts'),       'state.ts'],
                [Blockly.Translate('on_source_state_q'),        'state.q'],
                [Blockly.Translate('on_source_state_from'),     'state.from'],
                [Blockly.Translate('on_source_state_ack'),      'state.ack'],
                [Blockly.Translate('on_source_state_lc'),       'state.lc'],
                [Blockly.Translate('on_source_oldstate_val'),   'oldState.val'],
                [Blockly.Translate('on_source_oldstate_ts'),    'oldState.ts'],
                [Blockly.Translate('on_source_oldstate_q'),     'oldState.q'],
                [Blockly.Translate('on_source_oldstate_from'),  'oldState.from'],
                [Blockly.Translate('on_source_oldstate_ack'),   'oldState.ack'],
                [Blockly.Translate('on_source_oldstate_lc'),    'oldState.lc']
            ]), 'ATTR');

        this.setInputsInline(true);
        this.setOutput(true);
        this.setColour(Blockly.Trigger.HUE);
        this.setTooltip(Blockly.Translate('on_source_tooltip'));
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
            this.setWarningText(null, this.id);
        } else {
            this.setWarningText(Blockly.Translate('on_source_warning'), this.id);
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
            .appendField(Blockly.Translate('schedule'));

        this.appendDummyInput('SCHEDULE')
            .appendField(new Blockly.FieldCRON('* * * * *'), 'SCHEDULE');

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setInputsInline(false);
        this.setColour(Blockly.Trigger.HUE);
        this.setTooltip(Blockly.Translate('schedule_tooltip'));
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
    return 'schedule(' + schedule + ', async function () {\n' + statements_name + '});\n';
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
            .appendField(Blockly.Translate('astro'));

        this.appendDummyInput("TYPE")
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('astro_sunriseText'),         "sunrise"],
                [Blockly.Translate('astro_sunriseEndText'),      "sunriseEnd"],
                [Blockly.Translate('astro_goldenHourEndText'),   "goldenHourEnd"],
                [Blockly.Translate('astro_solarNoonText'),       "solarNoon"],
                [Blockly.Translate('astro_goldenHourText'),      "goldenHour"],
                [Blockly.Translate('astro_sunsetStartText'),     "sunsetStart"],
                [Blockly.Translate('astro_sunsetText'),          "sunset"],
                [Blockly.Translate('astro_duskText'),            "dusk"],
                [Blockly.Translate('astro_nauticalDuskText'),    "nauticalDusk"],
                [Blockly.Translate('astro_nightText'),           "night"],
                [Blockly.Translate('astro_nightEndText'),        "nightEnd"],
                [Blockly.Translate('astro_nauticalDawnText'),    "nauticalDawn"],
                [Blockly.Translate('astro_dawnText'),            "dawn"],
                [Blockly.Translate('astro_nadirText'),           "nadir"]
            ]), 'TYPE');

        this.appendDummyInput()
            .appendField(Blockly.Translate('astro_offset'));

        this.appendDummyInput("OFFSET")
            .appendField(new Blockly.FieldTextInput("0"), "OFFSET");

        this.appendDummyInput()
            .appendField(Blockly.Translate('astro_minutes'));

        this.appendStatementInput('STATEMENT')
            .setCheck(null);
        this.setInputsInline(true);

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(Blockly.Trigger.HUE);
        this.setTooltip(Blockly.Translate('astro_tooltip'));
        this.setHelpUrl(getHelp('astro_help'));
    }
};
Blockly.JavaScript['astro'] = function(block) {
    var astrotype = block.getFieldValue('TYPE');
    var offset    = parseInt(block.getFieldValue('OFFSET'), 10);
    var statements_name = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    return 'schedule({astro: "' + astrotype + '", shift: ' + offset + '}, async function () {\n' + statements_name + '});\n';
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
            name += '1';
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
    if (name === 'schedule') {
        return false;
    }

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
            .appendField(Blockly.Translate('schedule_create'))
            .appendField(nameField, 'NAME');

        this.appendValueInput('SCHEDULE')
            .appendField(Blockly.Translate('schedule_text'));

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setInputsInline(false);
        this.setColour(Blockly.Trigger.HUE);
        this.setTooltip(Blockly.Translate('schedule_create_tooltip'));
        this.setHelpUrl(getHelp('schedule_create_help'));
    },
    isSchedule_: true,
    getVars: function () {
        return [this.getFieldValue('NAME')];
    },
    getVarModels: function () {
        var name = this.getFieldValue('NAME');
        return [{getId: function () {return name;}, name: name, type: 'cron'}];
    }
};

Blockly.JavaScript['schedule_create'] = function (block) {
    var name  = Blockly.JavaScript.variableDB_.safeName_(block.getFieldValue('NAME'));
    var schedule = Blockly.JavaScript.valueToCode(block, 'SCHEDULE', Blockly.JavaScript.ORDER_ATOMIC);
    var statements_name = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    return name + ' = schedule(' + schedule + ', async function () {\n' + statements_name + '});\n';
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

    // BF(2020.05.16): for back compatibility. Remove it after 5 years
    if (window.scripts.loading) {
        var variables = workspace.getVariablesOfType('');
        variables.forEach(v => !result.find(it => it[0] === v.name) && result.push([v.name, v.name]));
    }

    var variables1 = workspace.getVariablesOfType('cron');
    variables1.forEach(v => !result.find(it => it[0] === v.name) && result.push([v.name, v.name]));

    !result.length && result.push(['', '']);

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
            .appendField(Blockly.Translate('schedule_clear'))
            .appendField(new Blockly.FieldDropdown(function () {
                return scripts.blocklyWorkspace ? Blockly.Trigger.getAllSchedules(scripts.blocklyWorkspace) : [];
            }), 'NAME');

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setInputsInline(true);
        this.setColour(Blockly.Trigger.HUE);
        this.setTooltip(Blockly.Translate('schedule_clear_tooltip'));
        this.setHelpUrl(getHelp('schedule_clear_help'));
    }
};

Blockly.JavaScript['schedule_clear'] = function(block) {
    var name = Blockly.JavaScript.variableDB_.safeName_(block.getFieldValue('NAME'));
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
            .appendField(Blockly.Translate('field_cron_CRON'));

        this.appendDummyInput()
            .appendField(new Blockly.FieldCRON('* * * * *'), 'CRON');

        this.setInputsInline(true);
        this.setColour(Blockly.Trigger.HUE);
        this.setOutput(true, 'String');
        this.setTooltip(Blockly.Translate('field_cron_tooltip'));
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
            .appendField(Blockly.Translate('cron_builder_CRON'));

        this.appendDummyInput('LINE')
            .appendField(Blockly.Translate('cron_builder_line'))
            .appendField(new Blockly.FieldCheckbox('FALSE', function (option) {
                this.sourceBlock_.setInputsInline(option === true || option === 'true' || option === 'TRUE');
            }), 'LINE');

        var _input = this.appendValueInput('DOW')
            .appendField(Blockly.Translate('cron_builder_dow'));

        var wp = this.workspace;
        setTimeout(function (_input) {
            if (!_input.connection.isConnected()) {
                var _shadow = wp.newBlock('text');
                _shadow.setShadow(true);
                _shadow.setFieldValue('*', 'TEXT');
                _shadow.outputConnection.connect(_input.connection);
            }
        }, 100, _input);


        _input = this.appendValueInput('MONTHS')
            .appendField(Blockly.Translate('cron_builder_month'));
        setTimeout(function (_input) {
            if (!_input.connection.isConnected()) {
                var _shadow = wp.newBlock('text');
                _shadow.setShadow(true);
                _shadow.setFieldValue('*', 'TEXT');
                _shadow.outputConnection.connect(_input.connection);
            }
        }, 100, _input);

        _input = this.appendValueInput('DAYS')
            .appendField(Blockly.Translate('cron_builder_day'));
        setTimeout(function (_input) {
            if (!_input.connection.isConnected()) {
                var _shadow = wp.newBlock('text');
                _shadow.setShadow(true);
                _shadow.setFieldValue('*', 'TEXT');
                _shadow.outputConnection.connect(_input.connection);
            }
        }, 100, _input);


        _input = this.appendValueInput('HOURS')
            .appendField(Blockly.Translate('cron_builder_hour'));
        setTimeout(function (_input) {
            if (!_input.connection.isConnected()) {
                var _shadow = wp.newBlock('text');
                _shadow.setShadow(true);
                _shadow.setFieldValue('*', 'TEXT');
                _shadow.outputConnection.connect(_input.connection);
            }
        }, 100, _input);


        _input = this.appendValueInput('MINUTES')
            .appendField(Blockly.Translate('cron_builder_minutes'));
        setTimeout(function (_input) {
            if (!_input.connection.isConnected()) {
                var _shadow = wp.newBlock('text');
                _shadow.setShadow(true);
                _shadow.setFieldValue('*', 'TEXT');
                _shadow.outputConnection.connect(_input.connection);
            }
        }, 100, _input);

        this.appendDummyInput('WITH_SECONDS')
            .appendField(Blockly.Translate('cron_builder_with_seconds'))
            .appendField(new Blockly.FieldCheckbox('FALSE', function (option) {
                var withSeconds = option === true || option === 'true' || option === 'TRUE';
                this.sourceBlock_.updateShape_(withSeconds);
            }), 'WITH_SECONDS');

        this.seconds_ = false;
        this.as_line_ = false;
        this.setInputsInline(this.as_line_);
        this.setColour(Blockly.Trigger.HUE);
        this.setOutput(true, 'String');
        this.setTooltip(Blockly.Translate('field_cron_tooltip'));
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
                _input.appendField(Blockly.Translate('cron_builder_seconds'));
                var wp = this.workspace;
                setTimeout(function (_input) {
                    if (!_input.connection.isConnected()) {
                        var _shadow = wp.newBlock('text');
                        _shadow.setShadow(true);
                        _shadow.setFieldValue('*', 'TEXT');
                        _shadow.initSvg();
                        _shadow.render();
                        _shadow.outputConnection.connect(_input.connection);
                    }
                }, 100, _input);
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

    var code =
        (withSeconds === 'TRUE' || withSeconds === 'true' || withSeconds === true ?
        seconds + '.toString().trim() + \' \' + ' : '') +
        minutes + '.toString().trim() + \' \' + ' +
        hours   + '.toString().trim() + \' \' + ' +
        days    + '.toString().trim() + \' \' + ' +
        months  + '.toString().trim() + \' \' + ' +
        dow     + '.toString().trim()';
    return [code, Blockly.JavaScript.ORDER_ATOMIC]
};
