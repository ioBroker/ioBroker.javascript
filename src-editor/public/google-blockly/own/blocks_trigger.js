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
        'on', 'on_ext', 'schedule', 'schedule_by_id', 'schedule_create', 'astro', 'onMessage', 'onFile', 'onLog', 'onEnumMembers', // trigger blocks
        'timeouts_setinterval', 'timeouts_setinterval_variable', // timeouts
        'controls_repeat_ext', 'controls_repeat_ext', 'controls_for', 'controls_forEach', // loops
    ],
};

// --- ON Extended-----------------------------------------------------------

Blockly.Trigger.blocks['on_ext'] =
    '<block type="on_ext">' +
    '  <mutation items="1"></mutation>' +
    '  <field name="CONDITION">ne</field>' +
    '  <field name="ACK_CONDITION"></field>' +
    '  <value name="OID0">' +
    '    <shadow type="field_oid">' +
    '    </shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['on_ext_oid_container'] = {
    /**
     * Mutator block for container.
     * @this Blockly.Block
     */
    init: function () {
        this.appendDummyInput()
            .appendField(Blockly.Translate('on_ext_on'));

        this.appendStatementInput('STACK');

        this.setColour(Blockly.Trigger.HUE);

        this.setTooltip(Blockly.Translate('on_ext_on_tooltip'));
        this.contextMenu = false;
    },
};

Blockly.Blocks['on_ext_oid'] = {
    /**
     * Mutator block for add items.
     * @this Blockly.Block
     */
    init: function () {
        this.appendDummyInput('OID')
            .appendField(Blockly.Translate('on_ext_oid'));

        this.setPreviousStatement(true);
        this.setNextStatement(true);

        this.setColour(Blockly.Trigger.HUE);

        this.setTooltip(Blockly.Translate('on_ext_oid_tooltip'));

        this.contextMenu = false;
    },
};

Blockly.Blocks['on_ext'] = {
    init: function () {
        this.itemCount_ = 1;
        this.setMutator(new Blockly.icons.MutatorIcon(['on_ext_oid'], this));

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

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
            Blockly.icons.MutatorIcon.reconnect(connections[i], this, 'OID' + i);
        }
    },
    /**
     * Store pointers to any connected child blocks.
     * @param {!Blockly.Block} containerBlock Root block in mutator.
     * @this Blockly.Block
     */
    saveConnections: function (containerBlock) {
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
    updateShape_: function () {
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
                setTimeout(__input => {
                    if (!__input.connection.isConnected()) {
                        const shadow = wp.newBlock('field_oid');
                        shadow.setShadow(true);
                        shadow.outputConnection.connect(__input.connection);
                        shadow.initSvg();
                        shadow.render();
                    }
                }, 100, _input);
            } else {
                setTimeout(__input => {
                    if (!__input.connection.isConnected()) {
                        const shadow = wp.newBlock('field_oid');
                        shadow.setShadow(true);
                        shadow.outputConnection.connect(__input.connection);
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
                [Blockly.Translate('on_false'), 'false'],
            ]), 'CONDITION');
        if (conditionValue) {
            this.setFieldValue(conditionValue, 'CONDITION'); // restore previous value
        }

        this.appendDummyInput('ACK_CONDITION')
            .appendField(Blockly.Translate('on_ack'))
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('on_ack_any'), ''],
                [Blockly.Translate('on_ack_true'), 'true'],
                [Blockly.Translate('on_ack_false'), 'false'],
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
    onchange: function (e) {
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
    },
};
Blockly.JavaScript.forBlock['on_ext'] = function (block) {
    const fCondition = block.getFieldValue('CONDITION');
    const fAckCondition = block.getFieldValue('ACK_CONDITION');

    let val;
    if (fCondition === 'true' || fCondition === 'false') {
        val = `val: ${fCondition}`;
    } else {
        val = `change: '${fCondition}'`;
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
    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    return `on({ id: ${oid}, ${val}${fAckCondition ? `, ack: ${fAckCondition}` : ''} }, async (obj) => {\n` +
        (oids.length === 1 ? Blockly.JavaScript.prefixLines('let value = obj.state.val;\nlet oldValue = obj.oldState.val;', Blockly.JavaScript.INDENT) + '\n' : '') +
        statement +
        '});\n';
};

// --- ON -----------------------------------------------------------
Blockly.Trigger.blocks['on'] =
    '<sep gap="5"></sep>' +
    '<block type="on">' +
    '  <field name="CONDITION">ne</field>' +
    '  <field name="ACK_CONDITION"></field>' +
    '</block>';

Blockly.Blocks['on'] = {
    init: function () {
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
                [Blockly.Translate('on_false'), 'false'],
            ]), 'CONDITION');

        this.appendDummyInput('ACK_CONDITION')
            .appendField(Blockly.Translate('on_ack'))
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('on_ack_any'), ''],
                [Blockly.Translate('on_ack_true'), 'true'],
                [Blockly.Translate('on_ack_false'), 'false'],
            ]), 'ACK_CONDITION');

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

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
    onchange: function (e) {
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
    },
};
Blockly.JavaScript.forBlock['on'] = function (block) {
    const fObjId = block.getFieldValue('OID');
    const fCondition = block.getFieldValue('CONDITION');
    const fAckCondition = block.getFieldValue('ACK_CONDITION');

    Blockly.Msg.VARIABLES_DEFAULT_NAME = 'value';

    let val;
    if (fCondition === 'true' || fCondition === 'false') {
        val = `val: ${fCondition}`;
    } else {
        val = `change: '${fCondition}'`;
    }

    let objectName = main.objects[fObjId] && main.objects[fObjId].common && main.objects[fObjId].common.name ? main.objects[fObjId].common.name : '';
    if (typeof objectName === 'object') {
        objectName = objectName[systemLang] || objectName.en;
    }

    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    return `on({ id: '${fObjId}'${objectName ? ` /* ${objectName} */` : ''}, ${val}${fAckCondition ? `, ack: ${fAckCondition}` : ''} }, async (obj) => {\n` +
        Blockly.JavaScript.prefixLines('let value = obj.state.val;', Blockly.JavaScript.INDENT) + '\n' +
        Blockly.JavaScript.prefixLines('let oldValue = obj.oldState.val;', Blockly.JavaScript.INDENT) + '\n' +
        statement +
        '});\n';
};

// --- get info about event -----------------------------------------------------------
Blockly.Trigger.blocks['on_source'] =
    '<sep gap="5"></sep>' +
    '<block type="on_source">' +
    '  <field name="ATTR">state.val</field>' +
    '</block>';

Blockly.Blocks['on_source'] = {
    /**
     * Block for conditionally returning a value from a procedure.
     * @this Blockly.Block
     */
    init: function () {
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
                [Blockly.Translate('on_source_oldstate_user'),  'oldState.user'],
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
            this.setWarningText(Blockly.Translate('on_source_warning'), this.id);
        }
    },
    /**
     * List of block types that are functions and thus do not need warnings.
     * To add a new function type add this to your code:
     * Blockly.Blocks['procedures_ifreturn'].FUNCTION_TYPES.push('custom_func');
     */
    FUNCTION_TYPES: ['on', 'on_ext', 'onEnumMembers'],
};
Blockly.JavaScript.forBlock['on_source'] = function (block) {
    let fAttr = block.getFieldValue('ATTR');
    const parts = fAttr.split('.');

    if (parts.length > 1) {
        fAttr = `(obj.${parts[0]} ? obj.${fAttr} : '')`;
    } else {
        fAttr = `obj.${fAttr}`;
    }

    return [fAttr, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- acknowledge -----------------------------------------------------------
Blockly.Trigger.blocks['on_ack_value'] =
    '<sep gap="5"></sep>' +
    '<block type="on_ack_value">' +
    '</block>';

Blockly.Blocks['on_ack_value'] = {
    /**
     * Block for conditionally returning a value from a procedure.
     * @this Blockly.Block
     */
    init: function () {
        this.appendDummyInput()
            .appendField('↪ ' + Blockly.Translate('on_ack_value'));

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Trigger.HUE);

        this.setTooltip(Blockly.Translate('on_ack_value_tooltip'));
        this.setHelpUrl(getHelp('on_help'));
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
            this.setWarningText(Blockly.Translate('on_ack_value_warning'), this.id);
        }
    },
    /**
     * List of block types that are functions and thus do not need warnings.
     * To add a new function type add this to your code:
     * Blockly.Blocks['procedures_ifreturn'].FUNCTION_TYPES.push('custom_func');
     */
    FUNCTION_TYPES: ['on', 'on_ext', 'onEnumMembers'],
};
Blockly.JavaScript.forBlock['on_ack_value'] = function (block) {
    return 'if (obj.id && obj?.state && !obj.state.ack) {\n' +
        Blockly.JavaScript.prefixLines(`await setStateAsync(obj.id, { val: obj.state.val, ack: true });`, Blockly.JavaScript.INDENT) + '\n' +
        `}\n`;
};

// --- ASTRO -----------------------------------------------------------
Blockly.Trigger.blocks['astro'] =
    '<block type="astro">' +
    '  <field name="TYPE">sunrise</field>' +
    '  <field name="OFFSET">0</field>' +
    '</block>';

Blockly.Blocks['astro'] = {
    init: function () {
        this.appendDummyInput()
            .appendField(Blockly.Translate('astro'));

        this.appendDummyInput('TYPE')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('astro_sunriseText'),       'sunrise'],
                [Blockly.Translate('astro_sunriseEndText'),    'sunriseEnd'],
                [Blockly.Translate('astro_goldenHourEndText'), 'goldenHourEnd'],
                [Blockly.Translate('astro_solarNoonText'),     'solarNoon'],
                [Blockly.Translate('astro_goldenHourText'),    'goldenHour'],
                [Blockly.Translate('astro_sunsetStartText'),   'sunsetStart'],
                [Blockly.Translate('astro_sunsetText'),        'sunset'],
                [Blockly.Translate('astro_duskText'),          'dusk'],
                [Blockly.Translate('astro_nauticalDuskText'),  'nauticalDusk'],
                [Blockly.Translate('astro_nightText'),         'night'],
                [Blockly.Translate('astro_nightEndText'),      'nightEnd'],
                [Blockly.Translate('astro_nauticalDawnText'),  'nauticalDawn'],
                [Blockly.Translate('astro_dawnText'),          'dawn'],
                [Blockly.Translate('astro_nadirText'),         'nadir'],
            ]), 'TYPE');

        this.appendDummyInput()
            .appendField(Blockly.Translate('astro_offset'));

        this.appendDummyInput('OFFSET')
            .appendField(new Blockly.FieldTextInput('0'), 'OFFSET');

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
    onchange: function (e) {
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
    },
};
Blockly.JavaScript.forBlock['astro'] = function (block) {
    const fType = block.getFieldValue('TYPE');
    const fOffset = parseInt(block.getFieldValue('OFFSET'), 10);
    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    return `schedule({ astro: '${fType}', shift: ${fOffset} }, async () => {\n` +
        statement +
        '});\n';
};

// --- SCHEDULE -----------------------------------------------------------
Blockly.Trigger.blocks['schedule'] =
    '<block type="schedule">' +
    '  <field name="SCHEDULE">* * * * *</field>' +
    '</block>';

Blockly.Blocks['schedule'] = {
    init: function () {
        this.appendDummyInput()
            .appendField(Blockly.Translate('schedule'));

        this.appendDummyInput('SCHEDULE')
            .appendField(new Blockly.FieldCRON('* * * * *'), 'SCHEDULE');

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

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
    onchange: function (e) {
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
    },
};
Blockly.JavaScript.forBlock['schedule'] = function (block) {
    let fSchedule = block.getFieldValue('SCHEDULE');
    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    if (fSchedule.startsWith('{')) {
        fSchedule = `'${fSchedule}'`;
    } else {
        fSchedule = `"${fSchedule}"`;
    }

    return `schedule(${fSchedule}, async () => {\n` +
        statement +
        '});\n';
};

// --- SCHEDULE BY ID -----------------------------------------------------
Blockly.Trigger.blocks['schedule_by_id'] =
    '<block type="schedule_by_id">' +
    '  <field name="ACK_CONDITION"></field>' +
    '</block>';

Blockly.Blocks['schedule_by_id'] = {
    init: function () {
        this.appendDummyInput()
            .appendField(Blockly.Translate('schedule_by_id'));

        this.appendDummyInput('OID')
            .appendField(new Blockly.FieldOID(Blockly.Translate('select_id'), 'state'), 'OID');

        this.appendDummyInput('ACK_CONDITION')
            .appendField(Blockly.Translate('on_ack'))
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('on_ack_any'), ''],
                [Blockly.Translate('on_ack_true'), 'true'],
                [Blockly.Translate('on_ack_false'), 'false'],
            ]), 'ACK_CONDITION');

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Trigger.HUE);

        this.setTooltip(Blockly.Translate('schedule_by_id_tooltip'));
        this.setHelpUrl(getHelp('schedule_by_id_help'));
    },
};
Blockly.JavaScript.forBlock['schedule_by_id'] = function (block) {
    const fObjId = block.getFieldValue('OID');
    const fAckCondition = block.getFieldValue('ACK_CONDITION');
    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    let objectName = main.objects[fObjId] && main.objects[fObjId].common && main.objects[fObjId].common.name ? main.objects[fObjId].common.name : '';
    if (typeof objectName === 'object') {
        objectName = objectName[systemLang] || objectName.en;
    }

    return `scheduleById('${fObjId}'${objectName ? ` /* ${objectName} */` : ''}${fAckCondition ? `, ${fAckCondition}` : ''}, async () => {\n` +
        statement +
        '});\n';
};

// --- set named schedule -----------------------------------------------------------
Blockly.Trigger.blocks['schedule_create'] =
    '<block type="schedule_create">' +
    '  <field name="NAME">schedule</field>' +
    '  <value name="SCHEDULE">' +
    '    <shadow type="field_cron">' +
    '    </shadow>' +
    '  </value>' +
    '</block>';
/**
 * Ensure two identically-named procedures don't exist.
 * @param {string} name Proposed procedure name.
 * @param {!Blockly.Block} block Block to disambiguate.
 * @return {string} Non-colliding name.
 */
Blockly.Trigger.findLegalName = function (name, block) {
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
Blockly.Trigger.isLegalName_ = function (name, workspace, opt_exclude) {
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
    init: function () {
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

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

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
        return [{ getId: () => name, name: name, type: 'cron' }];
    },
};

Blockly.JavaScript.forBlock['schedule_create'] = function (block) {
    const fName = Blockly.JavaScript.nameDB_.safeName(block.getFieldValue('NAME'));
    const vSchedule = Blockly.JavaScript.valueToCode(block, 'SCHEDULE', Blockly.JavaScript.ORDER_ATOMIC);
    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    return `${fName} = schedule(${vSchedule}, async () => {\n` +
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
    '<sep gap="5"></sep>' +
    '<block type="schedule_clear">' +
    '  <field name="NAME"></field>' +
    '</block>';

Blockly.Blocks['schedule_clear'] = {
    init: function () {
        this.appendDummyInput('NAME')
            .appendField(Blockly.Translate('schedule_clear'))
            .appendField(new Blockly.FieldDropdown(function () {
                return scripts.blocklyWorkspace ? Blockly.Trigger.getAllSchedules(scripts.blocklyWorkspace) : [];
            }), 'NAME');

        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Trigger.HUE);

        this.setTooltip(Blockly.Translate('schedule_clear_tooltip'));
        this.setHelpUrl(getHelp('schedule_clear_help'));
    },
};

Blockly.JavaScript.forBlock['schedule_clear'] = function (block) {
    const fName = Blockly.JavaScript.nameDB_.safeName(block.getFieldValue('NAME'));

    return `(() => { if (${fName}) { clearSchedule(${fName}); ${fName} = null; }})();\n`;
};

// --- CRON dialog --------------------------------------------------
Blockly.Trigger.blocks['field_cron'] =
    '<sep gap="5"></sep>' +
    '<block type="field_cron">' +
    '  <field name="CRON">* * * * *</field>' +
    '</block>';

Blockly.Blocks['field_cron'] = {
    // Checkbox.
    init: function () {
        this.appendDummyInput()
            .appendField(Blockly.Translate('field_cron_CRON'));

        this.appendDummyInput()
            .appendField(new Blockly.FieldCRON('* * * * *'), 'CRON');

        this.setInputsInline(true);
        this.setOutput(true, 'String');

        this.setColour(Blockly.Trigger.HUE);

        this.setTooltip(Blockly.Translate('field_cron_tooltip'));
    },
};

Blockly.JavaScript.forBlock['field_cron'] = function (block) {
    const fCron = block.getFieldValue('CRON');

    return [`'${fCron}'`, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- CRON builder --------------------------------------------------
Blockly.Trigger.blocks['cron_builder'] =
    '<sep gap="5"></sep>' +
    '<block type="cron_builder">' +
    '  <mutation seconds="false" as_line="false"></mutation>' +
    '  <field name="LINE">FALSE</field>' +
    '  <field name="WITH_SECONDS">FALSE</field>' +
    '  <value name="DOW">' +
    '    <shadow type="text">' +
    '      <field name="TEXT">*</field>' +
    '    </shadow>' +
    '  </value>' +
    '  <value name="MONTHS">' +
    '    <shadow type="text">' +
    '      <field name="TEXT">*</field>' +
    '    </shadow>' +
    '  </value>' +
    '  <value name="DAYS">' +
    '    <shadow type="text">' +
    '      <field name="TEXT">*</field>' +
    '    </shadow>' +
    '  </value>' +
    '  <value name="HOURS">' +
    '    <shadow type="text">' +
    '      <field name="TEXT">*</field>' +
    '    </shadow>' +
    '  </value>' +
    '  <value name="MINUTES">' +
    '    <shadow type="text">' +
    '      <field name="TEXT">*</field>' +
    '    </shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['cron_builder'] = {
    // Checkbox.
    init: function () {
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

        setTimeout(__input => {
            if (!__input.connection.isConnected()) {
                const _shadow = wp.newBlock('text');
                _shadow.setShadow(true);
                _shadow.setFieldValue('*', 'TEXT');
                _shadow.outputConnection.connect(__input.connection);
            }
        }, 100, _input);

        _input = this.appendValueInput('MONTHS')
            .appendField(Blockly.Translate('cron_builder_month'));

        setTimeout(__input => {
            if (!__input.connection.isConnected()) {
                const _shadow = wp.newBlock('text');
                _shadow.setShadow(true);
                _shadow.setFieldValue('*', 'TEXT');
                _shadow.outputConnection.connect(__input.connection);
            }
        }, 100, _input);

        _input = this.appendValueInput('DAYS')
            .appendField(Blockly.Translate('cron_builder_day'));

        setTimeout(__input => {
            if (!__input.connection.isConnected()) {
                const _shadow = wp.newBlock('text');
                _shadow.setShadow(true);
                _shadow.setFieldValue('*', 'TEXT');
                _shadow.outputConnection.connect(__input.connection);
            }
        }, 100, _input);

        _input = this.appendValueInput('HOURS')
            .appendField(Blockly.Translate('cron_builder_hour'));

        setTimeout(__input => {
            if (!__input.connection.isConnected()) {
                const _shadow = wp.newBlock('text');
                _shadow.setShadow(true);
                _shadow.setFieldValue('*', 'TEXT');
                _shadow.outputConnection.connect(__input.connection);
            }
        }, 100, _input);

        _input = this.appendValueInput('MINUTES')
            .appendField(Blockly.Translate('cron_builder_minutes'));

        setTimeout(__input => {
            if (!__input.connection.isConnected()) {
                const _shadow = wp.newBlock('text');
                _shadow.setShadow(true);
                _shadow.setFieldValue('*', 'TEXT');
                _shadow.outputConnection.connect(__input.connection);
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
        this.setOutput(true, 'String');

        this.setColour(Blockly.Trigger.HUE);

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
    updateShape_: function (withSeconds) {
        this.seconds_ = withSeconds;
        // Add or remove a statement Input.
        const inputExists = this.getInput('SECONDS');

        if (withSeconds) {
            if (!inputExists) {
                const _input = this.appendValueInput('SECONDS');
                _input.appendField(Blockly.Translate('cron_builder_seconds'));
                const wp = this.workspace;
                setTimeout(__input => {
                    if (!__input.connection.isConnected()) {
                        const _shadow = wp.newBlock('text');
                        _shadow.setShadow(true);
                        _shadow.setFieldValue('*', 'TEXT');
                        _shadow.initSvg();
                        _shadow.render();
                        _shadow.outputConnection.connect(__input.connection);
                    }
                }, 100, _input);
            }
        } else if (inputExists) {
            this.removeInput('SECONDS');
        }
    },
};

Blockly.JavaScript.forBlock['cron_builder'] = function (block) {
    const vDow = Blockly.JavaScript.valueToCode(block, 'DOW', Blockly.JavaScript.ORDER_ATOMIC);
    const vMonths = Blockly.JavaScript.valueToCode(block, 'MONTHS', Blockly.JavaScript.ORDER_ATOMIC);
    const vDays = Blockly.JavaScript.valueToCode(block, 'DAYS', Blockly.JavaScript.ORDER_ATOMIC);
    const vHours = Blockly.JavaScript.valueToCode(block, 'HOURS', Blockly.JavaScript.ORDER_ATOMIC);
    const vMinutes = Blockly.JavaScript.valueToCode(block, 'MINUTES', Blockly.JavaScript.ORDER_ATOMIC);
    const vSeconds = Blockly.JavaScript.valueToCode(block, 'SECONDS', Blockly.JavaScript.ORDER_ATOMIC);
    const fWithSeconds = block.getFieldValue('WITH_SECONDS');

    const code =
        (fWithSeconds === 'TRUE' || fWithSeconds === 'true' || fWithSeconds === true ?
            vSeconds + `.toString().trim() + ' ' + ` : '') +
            vMinutes + `.toString().trim() + ' ' + ` +
            vHours   + `.toString().trim() + ' ' + ` +
            vDays    + `.toString().trim() + ' ' + ` +
            vMonths  + `.toString().trim() + ' ' + ` +
            vDow     + '.toString().trim()';

    return [code, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- onMessage -----------------------------------------------------------
Blockly.Trigger.blocks['onMessage'] =
    '<block type="onMessage">' +
    '  <field name="MESSAGE">customMessage</field>' +
    '</block>';

Blockly.Blocks['onMessage'] = {
    init: function () {
        this.appendDummyInput('NAME')
            .appendField('✉️ ' + Blockly.Translate('onMessage'));

        this.appendDummyInput('MESSAGE')
            .appendField(Blockly.Translate('onMessage_message'))
            .appendField(new Blockly.FieldTextInput('customMessage'), 'MESSAGE');

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

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
    onchange: function (e) {
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
    },
};

Blockly.JavaScript.forBlock['onMessage'] = function (block) {
    const fMessage = block.getFieldValue('MESSAGE');
    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    return `onMessage(${Blockly.JavaScript.quote_(fMessage)}, async (data, callback) => {\n` +
        statement +
        Blockly.JavaScript.prefixLines(`typeof callback === 'function' && callback({ result: true }); // default callback`, Blockly.JavaScript.INDENT) + '\n' +
        '});\n';
};

// --- onMessage_data -----------------------------------------------------------
Blockly.Trigger.blocks['onMessage_data'] =
    '<sep gap="5"></sep>' +
    '<block type="onMessage_data">' +
    '  <field name="ATTR">data</field>' +
    '</block>';

Blockly.Blocks['onMessage_data'] = {
    /**
     * Block for conditionally returning a value from a procedure.
     * @this Blockly.Block
     */
    init: function () {
        this.appendDummyInput()
            .appendField('✉️ ');

        this.appendDummyInput('ATTR')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('onMessage_data_data'), 'data'],
            ]), 'ATTR');

        this.setInputsInline(true);
        this.setOutput(true);

        this.setColour(Blockly.Action.HUE);

        this.setTooltip(Blockly.Translate('onMessage_data_tooltip'));
        this.setHelpUrl(getHelp('onMessage_data_help'));
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
            this.setWarningText(Blockly.Translate('onMessage_data_warning'), this.id);
        }
    },
    /**
     * List of block types that are functions and thus do not need warnings.
     * To add a new function type add this to your code:
     * Blockly.Blocks['procedures_ifreturn'].FUNCTION_TYPES.push('custom_func');
     */
    FUNCTION_TYPES: ['onMessage'],
};
Blockly.JavaScript.forBlock['onMessage_data'] = function (block) {
    const fAttr = block.getFieldValue('ATTR');

    return [fAttr, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- onFile -----------------------------------------------------------
Blockly.Trigger.blocks['onFile'] =
    '<block type="onFile">' +
    '  <field name="WITH_FILE">FALSE</field>' +
    '  <value name="OID">' +
    '    <shadow type="field_oid_meta">' +
    '      <field name="oid">0_userdata.0</field>' +
    '    </shadow>' +
    '  </value>' +
    '  <value name="FILE">' +
    '    <shadow type="text">' +
    '      <field name="TEXT">*</field>' +
    '    </shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['onFile'] = {
    init: function () {
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

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

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
    onchange: function (e) {
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
    },
};

Blockly.JavaScript.forBlock['onFile'] = function (block) {
    const vObjId = Blockly.JavaScript.valueToCode(block, 'OID', Blockly.JavaScript.ORDER_ATOMIC);
    const vFile = Blockly.JavaScript.valueToCode(block, 'FILE', Blockly.JavaScript.ORDER_ATOMIC);
    const fWithFile = block.getFieldValue('WITH_FILE');
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

    return `onFile(${vObjId}${objectName ? ` /* ${objectName} */` : ''}, ${vFile}, ${fWithFile === 'TRUE' ? 'true' : 'false'}, ` +
        'async (id, fileName, size, data, mimeType) => {\n' +
        statement +
        '});\n';
};

// --- onFile_data -----------------------------------------------------------
Blockly.Trigger.blocks['onFile_data'] =
    '<sep gap="5"></sep>' +
    '<block type="onFile_data">' +
    '  <field name="ATTR">data</field>' +
    '</block>';

Blockly.Blocks['onFile_data'] = {
    /**
     * Block for conditionally returning a value from a procedure.
     * @this Blockly.Block
     */
    init: function () {
        this.appendDummyInput()
            .appendField('📁');

        this.appendDummyInput('ATTR')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('onFile_data_data'), 'data'],
                [Blockly.Translate('onFile_data_filename'), 'fileName'],
                [Blockly.Translate('onFile_data_size'), 'size'],
                [Blockly.Translate('onFile_data_mimeType'), 'mimeType'],
                [Blockly.Translate('onFile_data_id'), 'id'],
                [Blockly.Translate('onFile_data_tempFile'), 'TEMP_FILE_PATH'],
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
Blockly.JavaScript.forBlock['onFile_data'] = function (block) {
    const fAttr = block.getFieldValue('ATTR');

    if (fAttr === 'TEMP_FILE_PATH') {
        return [`createTempFile(fileName, data)`, Blockly.JavaScript.ORDER_ATOMIC];
    } else {
        return [fAttr, Blockly.JavaScript.ORDER_ATOMIC];
    }
};

// --- onFile -----------------------------------------------------------
Blockly.Trigger.blocks['offFile'] =
    '<sep gap="5"></sep>' +
    '<block type="offFile">' +
    '  <value name="OID">' +
    '    <shadow type="field_oid_meta">' +
    '      <field name="oid">0_userdata.0</field>' +
    '    </shadow>' +
    '  </value>' +
    '  <value name="FILE">' +
    '    <shadow type="text">' +
    '      <field name="TEXT">*</field>' +
    '    </shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['offFile'] = {
    init: function () {
        this.appendValueInput('OID')
            .appendField('📁 ' + Blockly.Translate('offFile'))
            .setCheck(null);

        this.appendValueInput('FILE')
            .appendField(Blockly.Translate('onFile_file'))
            .setCheck(null);

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Trigger.HUE);

        this.setTooltip(Blockly.Translate('offFile_tooltip'));
        this.setHelpUrl(getHelp('offFile_help'));
    },
};

Blockly.JavaScript.forBlock['offFile'] = function (block) {
    const vObjId = Blockly.JavaScript.valueToCode(block, 'OID', Blockly.JavaScript.ORDER_ATOMIC);
    const vFile = Blockly.JavaScript.valueToCode(block, 'FILE', Blockly.JavaScript.ORDER_ATOMIC);

    let objectName = '';
    try {
        const objId = eval(vObjId); // Code to string
        objectName = main.objects[objId] && main.objects[objId].common && main.objects[objId].common.name ? main.objects[objId].common.name : '';
        if (typeof objectName === 'object') {
            objectName = objectName[systemLang] || objectName.en;
        }
    } catch (error) {
        
    }

    return `offFile(${vObjId}${objectName ? ` /* ${objectName} */` : ''}, ${vFile});\n`;
};

// --- onLog -----------------------------------------------------------
Blockly.Trigger.blocks['onLog'] =
    '<block type="onLog">' +
    '  <field name="Severity">error</field>' +
    '</block>';

Blockly.Blocks['onLog'] = {
    init: function () {
        this.appendDummyInput('TEXT')
            .appendField('💬 ' + Blockly.Translate('onLog'));

        this.appendDummyInput('Severity')
            .appendField(Blockly.Translate('loglevel'))
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('loglevel_error'), 'error'],
                [Blockly.Translate('loglevel_warn'),  'warn'],
                [Blockly.Translate('loglevel_info'),  'info'],
                [Blockly.Translate('loglevel_debug'), 'debug'],
                [Blockly.Translate('loglevel_all'),   '*'],
            ]), 'Severity');

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

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
    onchange: function (e) {
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
    },
};

Blockly.JavaScript.forBlock['onLog'] = function (block) {
    const fSeverity = block.getFieldValue('Severity');
    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    return `onLog('${fSeverity}', async (data) => {\n` +
        statement +
        '});\n';
};

// --- onLog_data -----------------------------------------------------------
Blockly.Trigger.blocks['onLog_data'] =
    '<sep gap="5"></sep>' +
    '<block type="onLog_data">' +
    '  <field name="ATTR">data.message</field>' +
    '</block>';

Blockly.Blocks['onLog_data'] = {
    /**
     * Block for conditionally returning a value from a procedure.
     * @this Blockly.Block
     */
    init: function () {
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
Blockly.JavaScript.forBlock['onLog_data'] = function (block) {
    const fAttr = block.getFieldValue('ATTR');

    return [fAttr, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- onEnumMembers -----------------------------------------------------------
Blockly.Trigger.blocks['onEnumMembers'] =
    '<block type="onEnumMembers">' +
    '</block>';

Blockly.Blocks['onEnumMembers'] = {
    init: function () {
        this.appendDummyInput()
            .appendField(Blockly.Translate('onEnumMembers'));

        this.appendDummyInput('OID')
            .appendField(new Blockly.FieldOID(Blockly.Translate('select_id'), 'enum'), 'OID');

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Trigger.HUE);

        this.setTooltip(Blockly.Translate('onEnumMembers_tooltip'));
        this.setHelpUrl(getHelp('onEnumMembers_help'));
    },
    /**
     * Called whenever anything on the workspace changes.
     * Add warning if this flow block is not nested inside a loop.
     * @param {!Blockly.Events.Abstract} e Change event.
     * @this Blockly.Block
     */
    onchange: function (e) {
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
    },
};
Blockly.JavaScript.forBlock['onEnumMembers'] = function (block) {
    const fObjId = block.getFieldValue('OID');
    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    let objectName = main.objects[fObjId] && main.objects[fObjId].common && main.objects[fObjId].common.name ? main.objects[fObjId].common.name : '';
    if (typeof objectName === 'object') {
        objectName = objectName[systemLang] || objectName.en;
    }

    return `onEnumMembers('${fObjId}'${objectName ? ` /* ${objectName} */` : ''}, async (obj) => {\n` +
        Blockly.JavaScript.prefixLines('let value = obj.state.val;', Blockly.JavaScript.INDENT) + '\n' +
        Blockly.JavaScript.prefixLines('let oldValue = obj.oldState.val;', Blockly.JavaScript.INDENT) + '\n' +
        statement +
        '});\n';
};
