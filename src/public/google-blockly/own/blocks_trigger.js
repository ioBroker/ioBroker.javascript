'use strict';

if (typeof goog !== 'undefined') {
    goog.provide('Blockly.JavaScript.Trigger');

    goog.require('Blockly.JavaScript');
}

Blockly.CustomBlocks = Blockly.CustomBlocks || [];
Blockly.CustomBlocks.push('Trigger');

Blockly.Trigger = {
    HUE: 330,
    blocks: {},
    WARNING_PARENTS: [
        'on', 'on_ext', 'schedule', 'schedule_by_id', 'schedule_create', 'astro', 'onMessage', 'onFile', 'onLog', // trigger blocks
        'timeouts_setinterval', 'timeouts_setinterval_variable', // timeouts
        'controls_repeat_ext', 'controls_repeat_ext', 'controls_for', 'controls_forEach', // loops
    ],
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
        const container = document.createElement('mutation');
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
        const containerBlock = workspace.newBlock('on_ext_oid_container');
        containerBlock.initSvg();

        let connection = containerBlock.getInput('STACK').connection;
        for (let i = 0; i < this.itemCount_; i++) {
            const itemBlock = workspace.newBlock('on_ext_oid');
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
        let itemBlock = containerBlock.getInputTargetBlock('STACK');
        // Count number of inputs.
        const connections = [];
        while (itemBlock) {
            connections.push(itemBlock.valueConnection_);
            itemBlock = itemBlock.nextConnection &&
                itemBlock.nextConnection.targetBlock();
        }

        // Disconnect any children that don't belong.
        for (let k = 0; k < this.itemCount_; k++) {
            const connection = this.getInput('OID' + k).connection.targetConnection;
            if (connection && connections.indexOf(connection) === -1) {
                connection.disconnect();
            }
        }

        this.itemCount_ = connections.length;
        if (this.itemCount_ < 1) {
            this.itemCount_ = 1;
        }
        this.updateShape_();

        // Reconnect any child blocks.
        for (let i = 0; i < this.itemCount_; i++) {
            Blockly.Mutator.reconnect(connections[i], this, 'OID' + i);
        }
    },
    /**
     * Store pointers to any connected child blocks.
     * @param {!Blockly.Block} containerBlock Root block in mutator.
     * @this Blockly.Block
     */
    saveConnections: function(containerBlock) {
        let itemBlock = containerBlock.getInputTargetBlock('STACK');
        let i = 0;

        while (itemBlock) {
            const input = this.getInput('OID' + i);
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
        let conditionValue = undefined;
        if (this.getInput('CONDITION')) {
            conditionValue = this.getFieldValue('CONDITION');
            this.removeInput('CONDITION');
        }

        let conditionAckValue = undefined;
        if (this.getInput('ACK_CONDITION')) {
            conditionAckValue = this.getFieldValue('ACK_CONDITION');
            this.removeInput('ACK_CONDITION');
        }

        let input;

        for (let j = 0; input = this.inputList[j]; j++) {
            if (input.name === 'STATEMENT') {
                this.inputList.splice(j, 1);
                break;
            }
        }

        // Add new inputs.
        const wp = this.workspace;

        let i;
        for (i = 0; i < this.itemCount_; i++) {
            let _input = this.getInput('OID' + i);
            if (!_input) {
                _input = this.appendValueInput('OID' + i);

                if (i === 0) {
                    _input.appendField(Blockly.Translate('on_ext'));
                }
                setTimeout((input) => {
                    if (!input.connection.isConnected()) {
                        const shadow = wp.newBlock('field_oid');
                        shadow.setShadow(true);
                        shadow.outputConnection.connect(input.connection);
                        shadow.initSvg();
                        shadow.render();
                    }
                }, 100, _input);
            } else {
                setTimeout((input) => {
                    if (!input.connection.isConnected()) {
                        const shadow = wp.newBlock('field_oid');
                        shadow.setShadow(true);
                        shadow.outputConnection.connect(input.connection);
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
        if (conditionValue) {
            this.setFieldValue(conditionValue, 'CONDITION'); // restore previous value
        }

        this.appendDummyInput('ACK_CONDITION')
            .appendField(Blockly.Translate('on_ack'))
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('on_ack_any'), ''],
                [Blockly.Translate('on_ack_true'), 'true'],
                [Blockly.Translate('on_ack_false'), 'false']
            ]), 'ACK_CONDITION');
        if (conditionAckValue) {
            this.setFieldValue(conditionAckValue, 'ACK_CONDITION'); // restore previous value
        }

        if (input) {
            this.inputList.push(input);
        } else {
            this.appendStatementInput('STATEMENT')
                .setCheck(null);
        }
    },
    /**
     * Called whenever anything on the workspace changes.
     * Add warning if this flow block is not nested inside a loop.
     * @param {!Blockly.Events.Abstract} e Change event.
     * @this Blockly.Block
     */
    onchange: function(e) {
        let legal = true;

        // Is the block nested in a trigger?
        let block = this;
        while (block = block.getSurroundParent()) {
            if (block && Blockly.Trigger.WARNING_PARENTS.includes(block.type)) {
                legal = false;
                break;
            }
        }

        if (legal) {
            this.setWarningText(null, this.id);
        } else {
            this.setWarningText(Blockly.Translate('trigger_in_trigger_warning'), this.id);
        }
    }
};
Blockly.JavaScript['on_ext'] = function(block) {
    const dropdown_condition = block.getFieldValue('CONDITION');
    const ack_condition = block.getFieldValue('ACK_CONDITION');
    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    let val;
    if (dropdown_condition === 'true' || dropdown_condition === 'false') {
        val = `val: ${dropdown_condition}`;
    } else {
        val = `change: '${dropdown_condition}'`;
    }

    const oids = [];
    for (let n = 0; n < block.itemCount_; n++) {
        let id =  Blockly.JavaScript.valueToCode(block, 'OID' + n, Blockly.JavaScript.ORDER_COMMA);
        if (id) {
            id = id.toString();
            if (id.startsWith('\'') && id.endsWith('\'')) {
                id = `[${id}]`;
            }
            if (oids.indexOf(id) === -1) {
                oids.push(id);
            }
        }
    }

    const oid = `[].concat(${oids.join(').concat(')})`;

    return `on({ id: ${oid}, ${val}${ack_condition ? `, ack: ${ack_condition}` : ''} }, async (obj) => {\n` +
        (oids.length === 1 ? Blockly.JavaScript.prefixLines('let value = obj.state.val;\nlet oldValue = obj.oldState.val;', Blockly.JavaScript.INDENT) + '\n' : '') +
        statement +
        '});\n';
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
            .appendField(new Blockly.FieldOID(Blockly.Translate('select_id'), 'state'), 'OID');

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
    },
    /**
     * Called whenever anything on the workspace changes.
     * Add warning if this flow block is not nested inside a loop.
     * @param {!Blockly.Events.Abstract} e Change event.
     * @this Blockly.Block
     */
    onchange: function(e) {
        let legal = true;

        // Is the block nested in a trigger?
        let block = this;
        while (block = block.getSurroundParent()) {
            if (block && Blockly.Trigger.WARNING_PARENTS.includes(block.type)) {
                legal = false;
                break;
            }
        }

        if (legal) {
            this.setWarningText(null, this.id);
        } else {
            this.setWarningText(Blockly.Translate('trigger_in_trigger_warning'), this.id);
        }
    }
};
Blockly.JavaScript['on'] = function(block) {
    const value_objectid = block.getFieldValue('OID');
    const dropdown_condition = block.getFieldValue('CONDITION');
    const ack_condition = block.getFieldValue('ACK_CONDITION');
    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');
    let objectName = main.objects[value_objectid] && main.objects[value_objectid].common && main.objects[value_objectid].common.name ? main.objects[value_objectid].common.name : '';
    if (typeof objectName === 'object') {
        objectName = objectName[systemLang] || objectName.en;
    }

    Blockly.Msg.VARIABLES_DEFAULT_NAME = 'value';

    let val;
    if (dropdown_condition === 'true' || dropdown_condition === 'false') {
        val = 'val: ' + dropdown_condition;
    } else {
        val = `change: '${dropdown_condition}'`;
    }

    return `on({ id: '${value_objectid}'${objectName ? ` /* ${objectName} */` : ''}, ${val}${ack_condition ? `, ack: ${ack_condition}` : ''} }, async (obj) => {\n` +
        Blockly.JavaScript.prefixLines('let value = obj.state.val;', Blockly.JavaScript.INDENT) + '\n' +
        Blockly.JavaScript.prefixLines('let oldValue = obj.oldState.val;', Blockly.JavaScript.INDENT) + '\n' +
        statement +
        '});\n';
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
        this.appendDummyInput()
            .appendField('↪');

        this.appendDummyInput('ATTR')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('on_source_state_val'),      'state.val'],
                [Blockly.Translate('on_source_state_ts'),       'state.ts'],
                [Blockly.Translate('on_source_state_q'),        'state.q'],
                [Blockly.Translate('on_source_state_from'),     'state.from'],
                [Blockly.Translate('on_source_state_ack'),      'state.ack'],
                [Blockly.Translate('on_source_state_lc'),       'state.lc'],
                [Blockly.Translate('on_source_state_c'),        'state.c'],
                [Blockly.Translate('on_source_state_user'),     'state.user'],
                [Blockly.Translate('on_source_id'),             'id'],
                [Blockly.Translate('on_source_name'),           'common.name'],
                [Blockly.Translate('on_source_desc'),           'common.desc'],
                [Blockly.Translate('on_source_channel_id'),     'channelId'],
                [Blockly.Translate('on_source_channel_name'),   'channelName'],
                [Blockly.Translate('on_source_device_id'),      'deviceId'],
                [Blockly.Translate('on_source_device_name'),    'deviceName'],
                [Blockly.Translate('on_source_oldstate_val'),   'oldState.val'],
                [Blockly.Translate('on_source_oldstate_ts'),    'oldState.ts'],
                [Blockly.Translate('on_source_oldstate_q'),     'oldState.q'],
                [Blockly.Translate('on_source_oldstate_from'),  'oldState.from'],
                [Blockly.Translate('on_source_oldstate_ack'),   'oldState.ack'],
                [Blockly.Translate('on_source_oldstate_lc'),    'oldState.lc'],
                [Blockly.Translate('on_source_oldstate_c'),     'oldState.c'],
                [Blockly.Translate('on_source_oldstate_user'),  'oldState.user']
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
    let attr = block.getFieldValue('ATTR');
    const parts = attr.split('.');

    if (parts.length > 1) {
        attr = `(obj.${parts[0]} ? obj.${attr} : '')`;
    } else {
        attr = `obj.${attr}`;
    }

    return [attr, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- SCHEDULE -----------------------------------------------------------
Blockly.Trigger.blocks['schedule'] =
    '<block type="schedule">'
    + '     <value name="SCHEDULE">'
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
    },
    /**
     * Called whenever anything on the workspace changes.
     * Add warning if this flow block is not nested inside a loop.
     * @param {!Blockly.Events.Abstract} e Change event.
     * @this Blockly.Block
     */
    onchange: function(e) {
        let legal = true;

        // Is the block nested in a trigger?
        let block = this;
        while (block = block.getSurroundParent()) {
            if (block && Blockly.Trigger.WARNING_PARENTS.includes(block.type)) {
                legal = false;
                break;
            }
        }

        if (legal) {
            this.setWarningText(null, this.id);
        } else {
            this.setWarningText(Blockly.Translate('trigger_in_trigger_warning'), this.id);
        }
    }
};
Blockly.JavaScript['schedule'] = function(block) {
    let schedule = block.getFieldValue('SCHEDULE');
    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    if (schedule[0] === '{') {
        schedule = "'" + schedule + "'";
    } else {
        schedule = '"' + schedule + '"';
    }

    return `schedule(${schedule}, async () => {\n` +
        statement +
        '});\n';
};

// --- SCHEDULE BY ID -----------------------------------------------------
Blockly.Trigger.blocks['schedule_by_id'] =
    '<block type="schedule_by_id">'
    + '     <value name="OID">'
    + '     </value>'
    + '     <value name="ACK_CONDITION">'
    + '     </value>'
    + '     <value name="STATEMENT">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['schedule_by_id'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(Blockly.Translate('schedule_by_id'));

        this.appendDummyInput('OID')
            .appendField(new Blockly.FieldOID(Blockly.Translate('select_id'), 'state'), 'OID');

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
        this.setTooltip(Blockly.Translate('schedule_by_id_tooltip'));
        this.setHelpUrl(getHelp('schedule_by_id_help'));
    }
};
Blockly.JavaScript['schedule_by_id'] = function(block) {
    const value_objectid = block.getFieldValue('OID');
    const ack_condition = block.getFieldValue('ACK_CONDITION');
    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    return `scheduleById('${value_objectid}'${ack_condition ? `, ${ack_condition}` : ''}, async () => {\n` +
        statement +
        '});\n';
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
    },
    /**
     * Called whenever anything on the workspace changes.
     * Add warning if this flow block is not nested inside a loop.
     * @param {!Blockly.Events.Abstract} e Change event.
     * @this Blockly.Block
     */
    onchange: function(e) {
        let legal = true;

        // Is the block nested in a trigger?
        let block = this;
        while (block = block.getSurroundParent()) {
            if (block && Blockly.Trigger.WARNING_PARENTS.includes(block.type)) {
                legal = false;
                break;
            }
        }

        if (legal) {
            this.setWarningText(null, this.id);
        } else {
            this.setWarningText(Blockly.Translate('trigger_in_trigger_warning'), this.id);
        }
    }
};
Blockly.JavaScript['astro'] = function(block) {
    const astrotype = block.getFieldValue('TYPE');
    const offset = parseInt(block.getFieldValue('OFFSET'), 10);
    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    return `schedule({ astro: '${astrotype}', shift: ${offset} }, async () => {\n` +
        statement +
        '});\n';
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
        const r = name.match(/^(.*?)(\d+)$/);
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

    const blocks = workspace.getAllBlocks();
    // Iterate through every block and check the name.
    for (let i = 0; i < blocks.length; i++) {
        if (blocks[i] == opt_exclude) {
            continue;
        }
        if (blocks[i].isSchedule_) {
            const blockName = blocks[i].getFieldValue('NAME');
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
        const nameField = new Blockly.FieldTextInput(
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
        const name = this.getFieldValue('NAME');
        return [{ getId: () => { return name; }, name: name, type: 'cron' }];
    }
};

Blockly.JavaScript['schedule_create'] = function (block) {
    const name  = Blockly.JavaScript.variableDB_.safeName_(block.getFieldValue('NAME'));
    const schedule = Blockly.JavaScript.valueToCode(block, 'SCHEDULE', Blockly.JavaScript.ORDER_ATOMIC);
    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    return `${name} = schedule(${schedule}, async () => {\n` +
        statement +
        '});\n';
};

// --- clearSchedule -----------------------------------------------------------
Blockly.Trigger.getAllSchedules = function (workspace) {
    const blocks = workspace.getAllBlocks();
    const result = [];

    // Iterate through every block and check the name.
    for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].isSchedule_) {
            result.push([blocks[i].getFieldValue('NAME'), blocks[i].getFieldValue('NAME')]);
        }
    }

    // BF(2020.05.16): for back compatibility. Remove it after 5 years
    if (window.scripts.loading) {
        const variables = workspace.getVariablesOfType('');
        variables.forEach(v => !result.find(it => it[0] === v.name) && result.push([v.name, v.name]));
    }

    const variables1 = workspace.getVariablesOfType('cron');
    variables1.forEach(v => !result.find(it => it[0] === v.name) && result.push([v.name, v.name]));

    !result.length && result.push(['', '']);

    return result;
};

Blockly.Trigger.blocks['schedule_clear'] =
    '<block type="schedule_clear">'
    + '    <value name="NAME">'
    + '    </value>'
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
    const name = Blockly.JavaScript.variableDB_.safeName_(block.getFieldValue('NAME'));
    return `(() => { if (${name}) { clearSchedule(${name}); ${name} = null; }})();\n`;
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
    const cron = block.getFieldValue('CRON');
    return [`'${cron}'`, Blockly.JavaScript.ORDER_ATOMIC];
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

        let _input = this.appendValueInput('DOW')
            .appendField(Blockly.Translate('cron_builder_dow'));

        const wp = this.workspace;

        setTimeout((input) => {
            if (!input.connection.isConnected()) {
                const _shadow = wp.newBlock('text');
                _shadow.setShadow(true);
                _shadow.setFieldValue('*', 'TEXT');
                _shadow.outputConnection.connect(input.connection);
            }
        }, 100, _input);

        _input = this.appendValueInput('MONTHS')
            .appendField(Blockly.Translate('cron_builder_month'));

        setTimeout((input) => {
            if (!input.connection.isConnected()) {
                const _shadow = wp.newBlock('text');
                _shadow.setShadow(true);
                _shadow.setFieldValue('*', 'TEXT');
                _shadow.outputConnection.connect(input.connection);
            }
        }, 100, _input);

        _input = this.appendValueInput('DAYS')
            .appendField(Blockly.Translate('cron_builder_day'));

        setTimeout((input) => {
            if (!input.connection.isConnected()) {
                const _shadow = wp.newBlock('text');
                _shadow.setShadow(true);
                _shadow.setFieldValue('*', 'TEXT');
                _shadow.outputConnection.connect(input.connection);
            }
        }, 100, _input);

        _input = this.appendValueInput('HOURS')
            .appendField(Blockly.Translate('cron_builder_hour'));

        setTimeout((input) => {
            if (!input.connection.isConnected()) {
                const _shadow = wp.newBlock('text');
                _shadow.setShadow(true);
                _shadow.setFieldValue('*', 'TEXT');
                _shadow.outputConnection.connect(input.connection);
            }
        }, 100, _input);

        _input = this.appendValueInput('MINUTES')
            .appendField(Blockly.Translate('cron_builder_minutes'));

        setTimeout((input) => {
            if (!input.connection.isConnected()) {
                const _shadow = wp.newBlock('text');
                _shadow.setShadow(true);
                _shadow.setFieldValue('*', 'TEXT');
                _shadow.outputConnection.connect(input.connection);
            }
        }, 100, _input);

        this.appendDummyInput('WITH_SECONDS')
            .appendField(Blockly.Translate('cron_builder_with_seconds'))
            .appendField(new Blockly.FieldCheckbox('FALSE', function (option) {
                const withSeconds = option === true || option === 'true' || option === 'TRUE';
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
        const container = document.createElement('mutation');
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
        const inputExists = this.getInput('SECONDS');

        if (withSeconds) {
            if (!inputExists) {
                const _input = this.appendValueInput('SECONDS');
                _input.appendField(Blockly.Translate('cron_builder_seconds'));
                const wp = this.workspace;
                setTimeout((input) => {
                    if (!input.connection.isConnected()) {
                        const _shadow = wp.newBlock('text');
                        _shadow.setShadow(true);
                        _shadow.setFieldValue('*', 'TEXT');
                        _shadow.initSvg();
                        _shadow.render();
                        _shadow.outputConnection.connect(input.connection);
                    }
                }, 100, _input);
            }
        } else if (inputExists) {
            this.removeInput('SECONDS');
        }
    }
};

Blockly.JavaScript['cron_builder'] = function(block) {
    const dow     = Blockly.JavaScript.valueToCode(block, 'DOW',     Blockly.JavaScript.ORDER_ATOMIC);
    const months  = Blockly.JavaScript.valueToCode(block, 'MONTHS',  Blockly.JavaScript.ORDER_ATOMIC);
    const days    = Blockly.JavaScript.valueToCode(block, 'DAYS',    Blockly.JavaScript.ORDER_ATOMIC);
    const hours   = Blockly.JavaScript.valueToCode(block, 'HOURS',   Blockly.JavaScript.ORDER_ATOMIC);
    const minutes = Blockly.JavaScript.valueToCode(block, 'MINUTES', Blockly.JavaScript.ORDER_ATOMIC);
    const seconds = Blockly.JavaScript.valueToCode(block, 'SECONDS', Blockly.JavaScript.ORDER_ATOMIC);
    const withSeconds = block.getFieldValue('WITH_SECONDS');

    const code =
        (withSeconds === 'TRUE' || withSeconds === 'true' || withSeconds === true ?
            seconds + `.toString().trim() + ' ' + ` : '') +
            minutes + `.toString().trim() + ' ' + ` +
            hours   + `.toString().trim() + ' ' + ` +
            days    + `.toString().trim() + ' ' + ` +
            months  + `.toString().trim() + ' ' + ` +
            dow     + '.toString().trim()';

    return [code, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- onMessage -----------------------------------------------------------
Blockly.Trigger.blocks['onMessage'] =
    '<block type="onMessage">'
    + '     <value name="NAME">'
    + '     </value>'
    + '     <value name="MESSAGE">'
    + '     </value>'
    + '     <value name="STATEMENT">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['onMessage'] = {
    init: function() {
        this.appendDummyInput('NAME')
            .appendField(Blockly.Translate('onMessage'));

        this.appendDummyInput('MESSAGE')
            .appendField(Blockly.Translate('onMessage_message'))
            .appendField(new Blockly.FieldTextInput('customMessage'), 'MESSAGE');

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setInputsInline(false);
        this.setColour(Blockly.Trigger.HUE);
        this.setTooltip(Blockly.Translate('onMessage_tooltip'));
        this.setHelpUrl(getHelp('onMessage_help'));
    },
    /**
     * Called whenever anything on the workspace changes.
     * Add warning if this flow block is not nested inside a loop.
     * @param {!Blockly.Events.Abstract} e Change event.
     * @this Blockly.Block
     */
    onchange: function(e) {
        let legal = true;

        // Is the block nested in a trigger?
        let block = this;
        while (block = block.getSurroundParent()) {
            if (block && Blockly.Trigger.WARNING_PARENTS.includes(block.type)) {
                legal = false;
                break;
            }
        }

        if (legal) {
            this.setWarningText(null, this.id);
        } else {
            this.setWarningText(Blockly.Translate('trigger_in_trigger_warning'), this.id);
        }
    }
};

Blockly.JavaScript['onMessage'] = function (block) {
    const message = block.getFieldValue('MESSAGE');
    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    return `onMessage('${message}', async (data, callback) => {\n` +
        statement +
        Blockly.JavaScript.prefixLines(`callback({ result: true });`, Blockly.JavaScript.INDENT) + '\n' +
        '});\n';
};

// --- onFile -----------------------------------------------------------
Blockly.Trigger.blocks['onFile'] =
    '<block type="onFile">'
    + '     <value name="OID">'
    + '         <shadow type="field_oid_meta">'
    + '             <field name="oid">0_userdata.0</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="FILE">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">*</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="WITH_FILE">'
    + '     </value>'
    + '     <value name="STATEMENT">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['onFile'] = {
    init: function() {
        this.appendValueInput('OID')
            .appendField('📁 ' + Blockly.Translate('onFile'))
            .setCheck(null);

        this.appendValueInput('FILE')
            .appendField(Blockly.Translate('onFile_file'))
            .setCheck(null);

        this.appendDummyInput('WITH_FILE_INPUT')
            .appendField(Blockly.Translate('onFile_withFile'))
            .appendField(new Blockly.FieldCheckbox('FALSE'), 'WITH_FILE');

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setInputsInline(false);
        this.setColour(Blockly.Trigger.HUE);
        this.setTooltip(Blockly.Translate('onFile_tooltip'));
        this.setHelpUrl(getHelp('onFile_help'));
    },
    /**
     * Called whenever anything on the workspace changes.
     * Add warning if this flow block is not nested inside a loop.
     * @param {!Blockly.Events.Abstract} e Change event.
     * @this Blockly.Block
     */
    onchange: function(e) {
        let legal = true;

        // Is the block nested in a trigger?
        let block = this;
        while (block = block.getSurroundParent()) {
            if (block && Blockly.Trigger.WARNING_PARENTS.includes(block.type)) {
                legal = false;
                break;
            }
        }

        if (legal) {
            this.setWarningText(null, this.id);
        } else {
            this.setWarningText(Blockly.Translate('trigger_in_trigger_warning'), this.id);
        }
    }
};

Blockly.JavaScript['onFile'] = function (block) {
    const value_objectid = Blockly.JavaScript.valueToCode(block, 'OID', Blockly.JavaScript.ORDER_ATOMIC);
    const file = Blockly.JavaScript.valueToCode(block, 'FILE', Blockly.JavaScript.ORDER_ATOMIC);
    const withFile = block.getFieldValue('WITH_FILE');
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

    return `onFile(${value_objectid}${objectName ? ` /* ${objectName} */` : ''}, ${file}, ${withFile === 'TRUE' ? 'true' : 'false'}, ` +
        'async (id, fileName, size, data, mimeType) => {\n' +
        statement +
        '});\n';
};

// --- onFile_data -----------------------------------------------------------
Blockly.Trigger.blocks['onFile_data'] =
    '<block type="onFile_data">'
    + '     <value name="ATTR">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['onFile_data'] = {
    /**
     * Block for conditionally returning a value from a procedure.
     * @this Blockly.Block
     */
    init: function() {
        this.appendDummyInput()
            .appendField('📁');

        this.appendDummyInput('ATTR')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('onFile_data_data'), 'data'],
                [Blockly.Translate('onFile_data_filename'), 'fileName'],
                [Blockly.Translate('onFile_data_size'), 'size'],
                [Blockly.Translate('onFile_data_mimeType'), 'mimeType'],
                [Blockly.Translate('onFile_data_id'), 'id'],
            ]), 'ATTR');

        this.setInputsInline(true);
        this.setOutput(true);
        this.setColour(Blockly.Trigger.HUE);
        this.setTooltip(Blockly.Translate('onFile_data_tooltip'));
        //this.setHelpUrl(getHelp('onFile_data'));
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
            this.setWarningText(Blockly.Translate('onFile_data_warning'), this.id);
        }
    },
    /**
     * List of block types that are functions and thus do not need warnings.
     * To add a new function type add this to your code:
     * Blockly.Blocks['procedures_ifreturn'].FUNCTION_TYPES.push('custom_func');
     */
    FUNCTION_TYPES: ['onFile'],
};
Blockly.JavaScript['onFile_data'] = function(block) {
    const attr = block.getFieldValue('ATTR');

    return [attr, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- onFile -----------------------------------------------------------
Blockly.Trigger.blocks['offFile'] =
    '<block type="offFile">'
    + '     <value name="OID">'
    + '         <shadow type="field_oid_meta">'
    + '             <field name="oid">0_userdata.0</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="FILE">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">*</field>'
    + '         </shadow>'
    + '     </value>'
    + '</block>';

Blockly.Blocks['offFile'] = {
    init: function() {
        this.appendValueInput('OID')
            .appendField('📁 ' + Blockly.Translate('offFile'))
            .setCheck(null);

        this.appendValueInput('FILE')
            .appendField(Blockly.Translate('onFile_file'))
            .setCheck(null);

        this.setPreviousStatement(true, null);
        this.setInputsInline(false);
        this.setColour(Blockly.Trigger.HUE);
        this.setTooltip(Blockly.Translate('offFile_tooltip'));
        this.setHelpUrl(getHelp('offFile_help'));
    }
};

Blockly.JavaScript['offFile'] = function (block) {
    const value_objectid = Blockly.JavaScript.valueToCode(block, 'OID', Blockly.JavaScript.ORDER_ATOMIC);
    const file = Blockly.JavaScript.valueToCode(block, 'FILE', Blockly.JavaScript.ORDER_ATOMIC);

    let objectName = '';
    try {
        const objId = eval(value_objectid); // Code to string
        objectName = main.objects[objId] && main.objects[objId].common && main.objects[objId].common.name ? main.objects[objId].common.name : '';
        if (typeof objectName === 'object') {
            objectName = objectName[systemLang] || objectName.en;
        }
    } catch (error) {
        
    }

    return `offFile(${value_objectid}${objectName ? ` /* ${objectName} */` : ''}, ${file});\n`;
};

// --- onLog -----------------------------------------------------------
Blockly.Trigger.blocks['onLog'] =
    '<block type="onLog">'
    + '     <value name="Severity">'
    + '     </value>'
    + '     <value name="STATEMENT">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['onLog'] = {
    init: function() {
        this.appendDummyInput('TEXT')
            .appendField('💬 ' + Blockly.Translate('onLog'));

        this.appendDummyInput('Severity')
            .appendField(Blockly.Translate('loglevel'))
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('loglevel_error'), 'error'],
                [Blockly.Translate('loglevel_warn'),  'warn'],
                [Blockly.Translate('loglevel_info'),  'info'],
                [Blockly.Translate('loglevel_debug'), 'debug'],
                [Blockly.Translate('loglevel_all'), '*'],
            ]), 'Severity');

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setInputsInline(false);
        this.setColour(Blockly.Trigger.HUE);
        this.setTooltip(Blockly.Translate('onLog_tooltip'));
        this.setHelpUrl(getHelp('onLog_help'));
    },
    /**
     * Called whenever anything on the workspace changes.
     * Add warning if this flow block is not nested inside a loop.
     * @param {!Blockly.Events.Abstract} e Change event.
     * @this Blockly.Block
     */
    onchange: function(e) {
        let legal = true;

        // Is the block nested in a trigger?
        let block = this;
        while (block = block.getSurroundParent()) {
            if (block && Blockly.Trigger.WARNING_PARENTS.includes(block.type)) {
                legal = false;
                break;
            }
        }

        if (legal) {
            this.setWarningText(null, this.id);
        } else {
            this.setWarningText(Blockly.Translate('trigger_in_trigger_warning'), this.id);
        }
    }
};

Blockly.JavaScript['onLog'] = function (block) {
    const logLevel = block.getFieldValue('Severity');
    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    return `onLog('${logLevel}', async (data) => {\n` +
        statement +
        '});\n';
};

// --- onLog_data -----------------------------------------------------------
Blockly.Trigger.blocks['onLog_data'] =
    '<block type="onLog_data">'
    + '     <value name="ATTR">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['onLog_data'] = {
    /**
     * Block for conditionally returning a value from a procedure.
     * @this Blockly.Block
     */
    init: function() {
        this.appendDummyInput()
            .appendField('💬 ');

        this.appendDummyInput('ATTR')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('onLog_data_message'), 'data.message'],
                [Blockly.Translate('loglevel'), 'data.severity'],
                [Blockly.Translate('onLog_data_from'), 'data.from'],
                [Blockly.Translate('onLog_data_ts'), 'data.ts'],
            ]), 'ATTR');

        this.setInputsInline(true);
        this.setOutput(true);
        this.setColour(Blockly.Trigger.HUE);
        this.setTooltip(Blockly.Translate('onLog_data_tooltip'));
        //this.setHelpUrl(getHelp('onLog_data_help'));
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
            this.setWarningText(Blockly.Translate('onLog_data_warning'), this.id);
        }
    },
    /**
     * List of block types that are functions and thus do not need warnings.
     * To add a new function type add this to your code:
     * Blockly.Blocks['procedures_ifreturn'].FUNCTION_TYPES.push('custom_func');
     */
    FUNCTION_TYPES: ['onLog'],
};
Blockly.JavaScript['onLog_data'] = function(block) {
    const attr = block.getFieldValue('ATTR');

    return [attr, Blockly.JavaScript.ORDER_ATOMIC];
};
