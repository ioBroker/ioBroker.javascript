'use strict';

if (typeof goog !== 'undefined') {
    goog.provide('Blockly.JavaScript.Sendto');

    goog.require('Blockly.JavaScript');
}

Blockly.CustomBlocks = Blockly.CustomBlocks || [];
Blockly.CustomBlocks.push('Sendto');

Blockly.Sendto = {
    HUE: 310,
    blocks: {}
};

// --- sendTo Custom --------------------------------------------------
Blockly.Sendto.blocks['sendto_custom'] =
    '<block type="sendto_custom">' +
    '  <mutation items="parameter1" with_statement="false"></mutation>' +
    '  <field name="INSTANCE">admin.0</field>' +
    '  <field name="COMMAND">send</field>' +
    '  <field name="LOG"></field>' +
    '  <field name="WITH_STATEMENT">FALSE</field>' +
    '  <value name="ARG0">' +
    '    <shadow type="text">' +
    '      <field name="TEXT"></field>' +
    '    </shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['sendto_custom_container'] = {
    /**
     * Mutator block for container.
     * @this Blockly.Block
     */
    init: function () {
        this.setColour(Blockly.Sendto.HUE);

        this.appendDummyInput()
            .appendField(Blockly.Translate('sendto_custom_arguments'));

        this.appendStatementInput('STACK');
        this.setTooltip(Blockly.Translate('sendto_custom_arg_tooltip'));
        this.contextMenu = false;
    },
};

Blockly.Blocks['sendto_custom_item'] = {
    /**
     * Mutator block for add items.
     * @this Blockly.Block
     */
    init: function () {
        this.setColour(Blockly.Sendto.HUE);

        this.appendDummyInput('NAME')
            .appendField(Blockly.Translate('sendto_custom_argument'));

        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setTooltip(Blockly.Translate('sendto_custom_arg_tooltip'));
        this.contextMenu = false;
    },
};

Blockly.Blocks['sendto_custom'] = {
    /**
     * Block for creating a string made up of any number of elements of any type.
     * @this Blockly.Block
     */
    init: function () {
        const options = [];
        if (typeof main !== 'undefined' && main.instances) {
            for (let i = 0; i < main.instances.length; i++) {
                if (main.objects[main.instances[i]].common.messagebox) {
                    const id = main.instances[i].substring('system.adapter.'.length);
                    options.push([id, id]);
                }
            }
            if (!options.length) {
                options.push([Blockly.Translate('sendto_no_instances'), '']);
            }
            /*for (let h = 0; h < scripts.hosts.length; h++) {
                options.push([scripts.hosts[h], scripts.hosts[h]]);
            }*/
            this.appendDummyInput('INSTANCE')
                .appendField(Blockly.Translate('sendto_custom'))
                .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');
        } else {
            this.appendDummyInput('INSTANCE')
                .appendField(Blockly.Translate('sendto_custom'))
                .appendField(new Blockly.FieldTextInput('adapter.0'), 'INSTANCE');
        }

        this.appendDummyInput('COMMAND')
            .appendField(Blockly.Translate('sendto_custom_command'))
            .appendField(new Blockly.FieldTextInput('send'), 'COMMAND');

        this.setColour(Blockly.Sendto.HUE);

        this.appendDummyInput('LOG')
            .appendField(Blockly.Translate('loglevel'))
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('loglevel_none'),  ''],
                [Blockly.Translate('loglevel_debug'), 'debug'],
                [Blockly.Translate('loglevel_info'),  'info'],
                [Blockly.Translate('loglevel_warn'),  'warn'],
                [Blockly.Translate('loglevel_error'), 'error'],
            ]), 'LOG');

        this.appendDummyInput('WITH_STATEMENT')
            .appendField(Blockly.Translate('request_statement'))
            .appendField(new Blockly.FieldCheckbox('FALSE', function (option) {
                const withStatement = option === true || option === 'true' || option === 'TRUE';
                this.sourceBlock_.updateShape_(this.sourceBlock_.getArgNames_(), withStatement);
            }), 'WITH_STATEMENT');

        this.itemCount_ = 1;
        this.updateShape_();
        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setMutator(new Blockly.icons.MutatorIcon(['sendto_custom_item'], this));
        this.setTooltip(Blockly.Translate('sendto_custom_tooltip'));
        this.setHelpUrl(getHelp('sendto_custom_help'));
    },
    /**
     * Create XML to represent number of text inputs.
     * @return {!Element} XML storage element.
     * @this Blockly.Block
     */
    mutationToDom: function () {
        const container = document.createElement('mutation');
        const names = [];
        for (let i = 0; i < this.itemCount_; i++) {
            const input = this.getInput('ARG' + i);
            names[i] = input.fieldRow[0].getValue();
        }

        container.setAttribute('items', names.join(','));
        const withStatement = this.getFieldValue('WITH_STATEMENT');
        container.setAttribute('with_statement', withStatement === 'TRUE' || withStatement === 'true' || withStatement === true);
        return container;
    },
    /**
     * Parse XML to restore the text inputs.
     * @param {!Element} xmlElement XML storage element.
     * @this Blockly.Block
     */
    domToMutation: function (xmlElement) {
        const names = xmlElement.getAttribute('items').split(',');
        this.itemCount_ = names.length;
        const withStatement = xmlElement.getAttribute('with_statement');
        this.updateShape_(names, withStatement === true || withStatement === 'true' || withStatement === 'TRUE');
    },
    /**
     * Populate the mutator's dialog with this block's components.
     * @param {!Blockly.Workspace} workspace Mutator's workspace.
     * @return {!Blockly.Block} Root block in mutator.
     * @this Blockly.Block
     */
    decompose: function (workspace) {
        const containerBlock = workspace.newBlock('sendto_custom_container');
        containerBlock.initSvg();
        let connection = containerBlock.getInput('STACK').connection;
        for (let i = 0; i < this.itemCount_; i++) {
            const itemBlock = workspace.newBlock('sendto_custom_item');
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
        const names = [];
        while (itemBlock) {
            connections.push(itemBlock.valueConnection_);
            itemBlock = itemBlock.nextConnection &&
                itemBlock.nextConnection.targetBlock();
        }
        // Disconnect any children that don't belong.
        for (let i = 0; i < this.itemCount_; i++) {
            const input = this.getInput('ARG' + i);
            const connection = input.connection.targetConnection;
            names[i] = input.fieldRow[0].getValue();
            if (connection && !connections.includes(connection)) {
                connection.disconnect();
            }
        }
        this.itemCount_ = connections.length;
        if (this.itemCount_ < 1) {
            this.itemCount_ = 1;
        }
        this.updateShape_(names);
        // Reconnect any child blocks.
        for (let j = 0; j < this.itemCount_; j++) {
            Blockly.icons.MutatorIcon.reconnect(connections[j], this, 'ARG' + j);
        }
    },
    getArgNames_: function () {
        const names = [];
        for (let n = 0; n < this.itemCount_; n++) {
            const input = this.getInput('ARG' + n);
            names.push(input.fieldRow[0].getValue());
        }
        return names;
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
            const input = this.getInput('ARG' + i);
            itemBlock.valueConnection_ = input && input.connection.targetConnection;
            itemBlock = itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
            i++;
        }
    },
    /**
     * Modify this block to have the correct number of inputs.
     * @private
     * @this Blockly.Block
     */
    updateShape_: function (names, withStatement) {
        names = names || [];
        let _input;
        const wp = this.workspace;
        if (withStatement === undefined) {
            withStatement = this.getFieldValue('WITH_STATEMENT');
            withStatement = withStatement === true || withStatement === 'true' || withStatement === 'TRUE';
        }

        this.getInput('STATEMENT') && this.removeInput('STATEMENT');

        // Add new inputs.
        let i;
        for (i = 0; i < this.itemCount_; i++) {
            _input = this.getInput('ARG' + i);

            if (!_input) {
                _input = this.appendValueInput('ARG' + i);
                if (!names[i]) {
                    names[i] = Blockly.Translate('sendto_custom_argument') + (i + 1);
                }
                _input.appendField(new Blockly.FieldTextInput(names[i]));
                setTimeout(__input => {
                    if (!__input.connection.isConnected()) {
                        const _shadow = wp.newBlock('text');
                        _shadow.setShadow(true);
                        _shadow.initSvg();
                        _shadow.render();
                        _shadow.outputConnection.connect(__input.connection);
                    }
                }, 100, _input);
            } else {
                _input.fieldRow[0].setValue(names[i]);
                setTimeout(__input => {
                    if (!__input.connection.isConnected()) {
                        const shadow = wp.newBlock('text');
                        shadow.setShadow(true);
                        shadow.initSvg();
                        shadow.render();
                        shadow.outputConnection.connect(__input.connection);
                    }
                }, 100, _input);
            }
        }

        // Remove deleted inputs.
        const blocks = [];
        while (_input = this.getInput('ARG' + i)) {
            const b = _input.connection.targetBlock();
            if (b && b.isShadow()) {
                blocks.push(b);
            }
            this.removeInput('ARG' + i);
            i++;
        }

        if (blocks.length) {
            const ws = this.workspace;
            setTimeout(() => {
                for (let b = 0; b < blocks.length; b++) {
                    ws.removeTopBlock(blocks[b]);
                }
            }, 100);
        }

        // Add or remove a statement Input.
        if (withStatement) {
            this.appendStatementInput('STATEMENT');
        }
    },
};

Blockly.JavaScript.forBlock['sendto_custom'] = function (block) {
    const instance      = block.getFieldValue('INSTANCE');
    const logLevel      = block.getFieldValue('LOG');
    const command       = block.getFieldValue('COMMAND');
    const withStatement = block.getFieldValue('WITH_STATEMENT');
    const args = [];
    let logText;
    if (logLevel) {
        logText = 'console.' + logLevel + '("' + instance + ': " + "' + (args.length ? args.join(',') + '\n' : '') + '");\n'
    } else {
        logText = '';
    }
    let statement;
    if (withStatement === true || withStatement === 'true' || withStatement === 'TRUE') {
        statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');
    }

    for (let n = 0; n < block.itemCount_; n++) {
        const input = this.getInput('ARG' + n);
        let val = Blockly.JavaScript.valueToCode(block, 'ARG' + n, Blockly.JavaScript.ORDER_COMMA);
        // if JSON
        if (val && val[0] === "'" && val[1] === '{') {
            val = val.substring(1, val.length - 1);
        }
        args.push(`'${input.fieldRow[0].getValue()}': ${val}`);

        if (block.itemCount_ === 1 && !input.fieldRow[0].getValue()) {
            if (statement) {
                return `sendTo('${instance}', '${command}', ${val}, async (result) => {\n` +
                    statement +
                    '});\n' + logText;
            } else {
                return `sendTo('${instance}', '${command}', ${val});\n` + logText;
            }
        }
    }

    if (statement) {
        return `sendTo('${instance}', '${command}', { ${args.length ? args.join(', ') : ''} }, async (result) => {\n` +
            statement +
            '});\n' + logText;
    } else {
        return `sendTo('${instance}', '${command}', { ${args.length ? args.join(', ') : ''} });\n` + logText;
    }
};

// --- sendTo JavaScript --------------------------------------------------
Blockly.Sendto.blocks['sendto_otherscript'] =
    '<block type="sendto_otherscript">' +
    '  <field name="INSTANCE">0</field>' +
    '  <field name="TIMEOUT">1000</field>' +
    '  <field name="UNIT">ms</field>' +
    '  <field name="MESSAGE">customMessage</field>' +
    '  <value name="OID">' +
    '    <shadow type="field_oid_script">' +
    '      <field name="oid">Script Object ID</field>' +
    '    </shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['sendto_otherscript'] = {
    init: function() {
        const options = [];
        if (typeof main !== 'undefined' && main.instances) {
            for (let i = 0; i < main.instances.length; i++) {
                const m = main.instances[i].match(/^system.adapter.javascript.(\d+)$/);
                if (m) {
                    const n = parseInt(m[1], 10);
                    options.push(['javascript.' + n, String(n)]);
                }
            }
        }

        if (!options.length) {
            for (let u = 0; u <= 4; u++) {
                options.push(['javascript.' + u, String(u)]);
            }
        }

        this.appendDummyInput('NAME')
            .appendField(Blockly.Translate('sendto_otherscript_name'));

        this.appendDummyInput('INSTANCE')
            .appendField(Blockly.Translate('sendto_otherscript_instance'))
            .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');

        this.appendValueInput('OID')
            .appendField(Blockly.Translate('sendto_otherscript_script'))
            .setCheck(null);

        this.appendDummyInput()
            .appendField(Blockly.Translate('sendto_otherscript_timeout'))
            .appendField(new Blockly.FieldTextInput(1000), 'TIMEOUT')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('timeouts_settimeout_ms'), 'ms'],
                [Blockly.Translate('timeouts_settimeout_sec'), 'sec'],
                [Blockly.Translate('timeouts_settimeout_min'), 'min'],
            ]), 'UNIT');

        this.appendDummyInput('MESSAGE')
            .appendField(Blockly.Translate('sendto_otherscript_message'))
            .appendField(new Blockly.FieldTextInput('customMessage'), 'MESSAGE');

        this.appendValueInput('DATA')
            .appendField(Blockly.Translate('sendto_otherscript_data'));

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Translate('sendto_otherscript_tooltip'));
        this.setHelpUrl(getHelp('sendto_otherscript_help'));
    },
};

Blockly.JavaScript.forBlock['sendto_otherscript'] = function(block) {
    const dropdown_instance = block.getFieldValue('INSTANCE');
    const value_objectid = Blockly.JavaScript.valueToCode(block, 'OID', Blockly.JavaScript.ORDER_ATOMIC);
    const message = block.getFieldValue('MESSAGE');
    let data = Blockly.JavaScript.valueToCode(block, 'DATA', Blockly.JavaScript.ORDER_ATOMIC);

    const unit = block.getFieldValue('UNIT');
    let timeout = block.getFieldValue('TIMEOUT');
    if (unit === 'min') {
        timeout *= 60000;
    } else if (unit === 'sec') {
        timeout *= 1000;
    }

    let objectName = '';
    try {
        const objId = eval(value_objectid); // Code to string
        objectName = main.objects[objId] && main.objects[objId].common && main.objects[objId].common.name ? main.objects[objId].common.name : '';
        if (typeof objectName === 'object') {
            objectName = objectName[systemLang] || objectName.en;
        }
    } catch (error) {
        
    }

    if (!data) {
        data = 'true';
    }

    return `messageTo({ instance: ${dropdown_instance}, script: ${value_objectid}${objectName ? ` /* ${objectName} */` : ''}, message: '${message}' }, ${data}, { timeout: ${timeout} });\n`;
};

// --- sendTo gethistory --------------------------------------------------
Blockly.Sendto.blocks['sendto_gethistory'] =
    '<block type="sendto_gethistory">' +
    '  <field name="INSTANCE">default</field>' +
    '  <field name="AGGREGATE">none</field>' +
    '  <field name="STEP">0</field>' +
    '  <field name="UNIT">ms</field>' +
    '  <value name="OID">' +
    '    <shadow type="field_oid">' +
    '    </shadow>' +
    '  </value>' +
    '  <value name="START">' +
    '    <shadow type="time_get_special">' +
    '      <field name="TYPE">dayStart</field>' +
    '    </shadow>' +
    '  </value>' +
    '  <value name="END">' +
    '    <shadow type="time_get_special">' +
    '      <field name="TYPE">dayEnd</field>' +
    '    </shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['sendto_gethistory'] = {
    init: function() {
        const options = [
            ['default', 'default']
        ];
        if (typeof main !== 'undefined' && main.instances) {
            for (let i = 0; i < main.instances.length; i++) {
                const m = main.instances[i].match(/^system.adapter.(history|influxdb|sql).(\d+)$/);
                if (m) {
                    const instance = `${m[1]}.${m[2]}`;
                    options.push([instance, instance]);
                }
            }
        }

        if (!options.length) {
            options.push(['history.0', 'history.0']);
            options.push(['influxdb.0', 'influxdb.0']);
            options.push(['sql.0', 'sql.0']);
        }

        this.appendDummyInput('NAME')
            .appendField(Blockly.Translate('sendto_gethistory_name'));

        this.appendDummyInput('INSTANCE')
            .appendField(Blockly.Translate('sendto_gethistory_instance'))
            .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');

        this.appendValueInput('OID')
            .appendField(Blockly.Translate('sendto_gethistory_oid'))
            .setCheck(null);

        this.appendValueInput('START')
            .appendField(Blockly.Translate('sendto_gethistory_start'))
            .setCheck(null);

        this.appendValueInput('END')
            .appendField(Blockly.Translate('sendto_gethistory_end'))
            .setCheck(null);

        this.appendDummyInput('AGGREGATE')
            .appendField(Blockly.Translate('sendto_gethistory_aggregate'))
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('sendto_gethistory_none'), 'none'],
                [Blockly.Translate('sendto_gethistory_minimum'), 'min'],
                [Blockly.Translate('sendto_gethistory_maximum'), 'max'],
                [Blockly.Translate('sendto_gethistory_avg'), 'average'],
                [Blockly.Translate('sendto_gethistory_cnt'), 'count'],
            ]), 'AGGREGATE');

        this.appendDummyInput()
            .appendField(Blockly.Translate('sendto_gethistory_step'))
            .appendField(new Blockly.FieldTextInput(0), 'STEP')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('sendto_gethistory_ms'), 'ms'],
                [Blockly.Translate('sendto_gethistory_sec'), 'sec'],
                [Blockly.Translate('sendto_gethistory_min'), 'min'],
                [Blockly.Translate('sendto_gethistory_hour'), 'hour'],
                [Blockly.Translate('sendto_gethistory_day'), 'day'],
            ]), 'UNIT');

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setInputsInline(false);
        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Translate('sendto_gethistory_tooltip'));
        this.setHelpUrl(getHelp('sendto_gethistory_help'));
    },
};

Blockly.JavaScript.forBlock['sendto_gethistory'] = function(block) {
    const dropdown_instance = block.getFieldValue('INSTANCE');
    const value_objectid = Blockly.JavaScript.valueToCode(block, 'OID', Blockly.JavaScript.ORDER_ATOMIC);
    const start = Blockly.JavaScript.valueToCode(block, 'START', Blockly.JavaScript.ORDER_ATOMIC);
    const end = Blockly.JavaScript.valueToCode(block, 'END', Blockly.JavaScript.ORDER_ATOMIC);
    const aggregate = block.getFieldValue('AGGREGATE');
    const unit = block.getFieldValue('UNIT');

    let step = block.getFieldValue('STEP');
    if (unit === 'day') {
        step *= 24 * 60 * 60 * 1000;
    } else if (unit === 'hour') {
        step *= 60 * 60 * 1000;
    } else if (unit === 'min') {
        step *= 60 * 1000;
    } else if (unit === 'sec') {
        step *= 1000;
    }

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

    return `getHistory(${dropdown_instance !== 'default' ? `'${dropdown_instance}', ` : ''}{\n` +
        Blockly.JavaScript.prefixLines(`id: ${value_objectid}${objectName ? ` /* ${objectName} */` : ''},`, Blockly.JavaScript.INDENT) + '\n' +
        Blockly.JavaScript.prefixLines(`start: ${start},`, Blockly.JavaScript.INDENT) + '\n' +
        Blockly.JavaScript.prefixLines(`end: ${end},`, Blockly.JavaScript.INDENT) + '\n' +
        (step > 0 && aggregate !== 'none' ? Blockly.JavaScript.prefixLines(`step: ${step},`, Blockly.JavaScript.INDENT) + '\n' : '') +
        Blockly.JavaScript.prefixLines(`aggregate: '${aggregate}',`, Blockly.JavaScript.INDENT) + '\n' +
        Blockly.JavaScript.prefixLines(`removeBorderValues: true`, Blockly.JavaScript.INDENT) + '\n' +
    `}, async (err, result) => {\n` +
        Blockly.JavaScript.prefixLines(`if (err) {`, Blockly.JavaScript.INDENT) + '\n' +
        Blockly.JavaScript.prefixLines(`console.error(err);`, Blockly.JavaScript.INDENT + Blockly.JavaScript.INDENT) + '\n' +
        (statement ? Blockly.JavaScript.prefixLines(`} else {`, Blockly.JavaScript.INDENT) + '\n' : '') +
        (statement ? Blockly.JavaScript.prefixLines(statement, Blockly.JavaScript.INDENT) : '') +
        Blockly.JavaScript.prefixLines(`}`, Blockly.JavaScript.INDENT) + '\n' +
        '});\n'
};
