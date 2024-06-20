'use strict';

if (typeof goog !== 'undefined') {
    goog.provide('Blockly.JavaScript.Sendto');
    goog.require('Blockly.JavaScript');
}

Blockly.CustomBlocks = Blockly.CustomBlocks || [];
Blockly.CustomBlocks.push('Sendto');

Blockly.Sendto = {
    HUE: 310,
    blocks: {},
};

// --- sendTo Custom --------------------------------------------------
Blockly.Sendto.blocks['sendto_custom'] =
    '<block type="sendto_custom">' +
    '  <mutation xmlns="http://www.w3.org/1999/xhtml" items="parameter"></mutation>' +
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
        this.appendDummyInput()
            .appendField(Blockly.Translate('sendto_custom_arguments'));

        this.appendStatementInput('STACK');

        this.setColour(Blockly.Sendto.HUE);

        this.setTooltip(Blockly.Translate('sendto_custom_arg_tooltip'));

        this.contextMenu = false;
    },
};

Blockly.Blocks['sendto_custom_mutator'] = {
    /**
     * Mutator block for add items.
     * @this Blockly.Block
     */
    init: function () {
        this.appendDummyInput('ATTR')
            .appendField(Blockly.Translate('sendto_custom_argument'))
            .appendField(new Blockly.FieldTextInput('parameter'), 'ATTR');

        this.setPreviousStatement(true);
        this.setNextStatement(true);

        this.setColour(Blockly.Sendto.HUE);

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
            .appendField(Blockly.Translate('with_results'))
            .appendField(new Blockly.FieldCheckbox('FALSE', function (option) {
                const withStatement = option === true || option === 'true' || option === 'TRUE';
                this.sourceBlock_.updateShape_(withStatement);
            }), 'WITH_STATEMENT');

        this.attributes_ = [];
        this.itemCount_ = 0;

        this.setMutator(new Blockly.icons.MutatorIcon(['sendto_custom_mutator'], this));

        this.updateShape_();

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Sendto.HUE);

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

        container.setAttribute('items', this.attributes_.join(','));

        return container;
    },
    /**
     * Parse XML to restore the text inputs.
     * @param {!Element} xmlElement XML storage element.
     * @this Blockly.Block
     */
    domToMutation: function (xmlElement) {
        this.attributes_ = [];

        const names = xmlElement.getAttribute('items');
        if (names) {
            for (const name of names.split(',')) {
                this.attributes_.push(name);
            }
        }

        this.itemCount_ = this.attributes_.length;
        this.updateShape_();
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
            const itemBlock = workspace.newBlock('sendto_custom_mutator');
            itemBlock.setFieldValue(this.attributes_[i], 'ATTR');
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
        this.attributes_ = [];

        let itemBlock = containerBlock.getInputTargetBlock('STACK');
        // Count number of inputs.
        const connections = [];
        while (itemBlock) {
            const attrName = itemBlock.getFieldValue('ATTR');
            this.attributes_.push(attrName);

            connections.push(itemBlock.valueConnection_);
            itemBlock = itemBlock.nextConnection &&
                itemBlock.nextConnection.targetBlock();
        }

        // Disconnect any children that don't belong.
        for (let k = 0; k < this.itemCount_; k++) {
            const connection = this.getInput('ARG' + k).connection.targetConnection;
            if (connection && !connections.includes(connection)) {
                connection.disconnect();
            }
        }

        this.itemCount_ = connections.length;
        if (this.itemCount_ < 0) {
            this.itemCount_ = 0;
        }
        this.updateShape_();

        // Reconnect any child blocks.
        for (let i = 0; i < this.itemCount_; i++) {
            Blockly.icons.MutatorIcon.reconnect(connections[i], this, 'ARG' + i);
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
    updateShape_: function (withStatement) {
        const workspace = this.workspace;

        // Add new inputs.
        for (let i = 0; i < this.itemCount_; i++) {
            let input = this.getInput('ARG' + i);

            if (!input) {
                input = this.appendValueInput('ARG' + i).setAlign(Blockly.ALIGN_RIGHT);
                input.appendField(this.attributes_[i]);
            } else {
                input.fieldRow[0].setValue(this.attributes_[i]);
            }

            setTimeout(__input => {
                if (!__input.connection.isConnected()) {
                    const _shadow = workspace.newBlock('text');
                    _shadow.setShadow(true);
                    _shadow.initSvg();
                    _shadow.render();
                    _shadow.outputConnection.connect(__input.connection);
                }
            }, 100, input);
        }
        // Remove deleted inputs.
        for (let i = this.itemCount_; this.getInput('ARG' + i); i++) {
            this.removeInput('ARG' + i);
        }

        if (withStatement === undefined) {
            withStatement = this.getFieldValue('WITH_STATEMENT');
            withStatement = withStatement === true || withStatement === 'true' || withStatement === 'TRUE';
        }

        this.getInput('STATEMENT') && this.removeInput('STATEMENT');

        // Add or remove a statement Input.
        if (withStatement) {
            this.appendStatementInput('STATEMENT');
        }
    },
};

Blockly.JavaScript.forBlock['sendto_custom'] = function (block) {
    const fInstance = block.getFieldValue('INSTANCE');
    const fLog = block.getFieldValue('LOG');
    const fCommand = block.getFieldValue('COMMAND');
    const fWithStatement = block.getFieldValue('WITH_STATEMENT');

    let logText = '';

    let statement;
    if (fWithStatement === true || fWithStatement === 'true' || fWithStatement === 'TRUE') {
        statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');
    }

    const args = [];
    for (let n = 0; n < block.itemCount_; n++) {
        const name = String(block.attributes_[n]);
        let vArgument = Blockly.JavaScript.valueToCode(block, `ARG${n}`, Blockly.JavaScript.ORDER_COMMA);

        // if JSON (or object), remove quotes '{ bla: true }' -> { bla: true }
        if (vArgument && vArgument.startsWith(`'{`) && vArgument.endsWith(`}'`)) {
            vArgument = vArgument.substring(1, vArgument.length - 1);
        }

        if (block.itemCount_ === 1 && !name) {
            if (fLog) {
                logText = `console.${fLog}('sendTo[custom] ${fInstance}: ' + ${vArgument});\n`;
            }

            if (statement) {
                return `sendTo('${fInstance}', ${Blockly.JavaScript.quote_(fCommand)}, ${vArgument}, async (result) => {\n` +
                    statement +
                    `});\n${logText}`;
            }

            return `sendTo('${fInstance}', ${Blockly.JavaScript.quote_(fCommand)}, ${vArgument});\n${logText}`;
        } else {
            args.push({
                attr: name.replaceAll(`'`, `\\'`),
                val: vArgument,
            });
        }
    }

    const argStr = (args.length ? args.map(a => Blockly.JavaScript.prefixLines(`'${a.attr}': ${a.val},`, Blockly.JavaScript.INDENT)).join('\n') : '');

    if (fLog) {
        logText = `console.${fLog}('sendTo[custom] ${fInstance}: ${args.length ? args.map(a => `${a.attr}: ' + ${a.val} + '`).join(', ') : '[no args]'}');\n`;
    }

    if (statement) {
        return `sendTo('${fInstance}', ${Blockly.JavaScript.quote_(fCommand)}, {\n${argStr}\n}, async (result) => {\n` +
            statement +
            `});\n${logText}`;
    }

    return `sendTo('${fInstance}', ${Blockly.JavaScript.quote_(fCommand)}, {\n${argStr}\n});\n${logText}`;
};

// --- sendTo JavaScript --------------------------------------------------
Blockly.Sendto.blocks['sendto_otherscript'] =
    '<block type="sendto_otherscript">' +
    '  <field name="INSTANCE">0</field>' +
    '  <field name="TIMEOUT">1000</field>' +
    '  <field name="UNIT">ms</field>' +
    '  <field name="MESSAGE">customMessage</field>' +
    '  <field name="WITH_STATEMENT">FALSE</field>' +
    '  <value name="OID">' +
    '    <shadow type="field_oid_script">' +
    '      <field name="oid">Script Object ID</field>' +
    '    </shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['sendto_otherscript'] = {
    init: function () {
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
            .appendField('✉️ ' + Blockly.Translate('sendto_otherscript_name'));

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

        this.appendDummyInput('WITH_STATEMENT')
            .appendField(Blockly.Translate('with_results'))
            .appendField(new Blockly.FieldCheckbox('FALSE', function (option) {
                const withStatement = option === true || option === 'true' || option === 'TRUE';
                this.sourceBlock_.updateShape_(withStatement);
            }), 'WITH_STATEMENT');

        this.updateShape_();

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Sendto.HUE);

        this.setTooltip(Blockly.Translate('sendto_otherscript_tooltip'));
        this.setHelpUrl(getHelp('sendto_otherscript_help'));
    },
    /**
     * Modify this block to have the correct number of inputs.
     * @private
     * @this Blockly.Block
     */
    updateShape_: function (withStatement) {
        const workspace = this.workspace;

        // Add new inputs.
        for (let i = 0; i < this.itemCount_; i++) {
            let input = this.getInput('ARG' + i);

            if (!input) {
                input = this.appendValueInput('ARG' + i).setAlign(Blockly.ALIGN_RIGHT);
                input.appendField(this.attributes_[i]);
            } else {
                input.fieldRow[0].setValue(this.attributes_[i]);
            }

            setTimeout(__input => {
                if (!__input.connection.isConnected()) {
                    const _shadow = workspace.newBlock('text');
                    _shadow.setShadow(true);
                    _shadow.initSvg();
                    _shadow.render();
                    _shadow.outputConnection.connect(__input.connection);
                }
            }, 100, input);
        }
        // Remove deleted inputs.
        for (let i = this.itemCount_; this.getInput('ARG' + i); i++) {
            this.removeInput('ARG' + i);
        }

        if (withStatement === undefined) {
            withStatement = this.getFieldValue('WITH_STATEMENT');
            withStatement = withStatement === true || withStatement === 'true' || withStatement === 'TRUE';
        }

        this.getInput('STATEMENT') && this.removeInput('STATEMENT');

        // Add or remove a statement Input.
        if (withStatement) {
            this.appendStatementInput('STATEMENT');
        }
    },
};

Blockly.JavaScript.forBlock['sendto_otherscript'] = function (block) {
    const fInstance = block.getFieldValue('INSTANCE');
    const vObjId = Blockly.JavaScript.valueToCode(block, 'OID', Blockly.JavaScript.ORDER_ATOMIC);
    const fMessage = block.getFieldValue('MESSAGE');

    const fUnit = block.getFieldValue('UNIT');
    let fTimeout = block.getFieldValue('TIMEOUT');
    if (fUnit === 'min') {
        fTimeout *= 60000;
    } else if (fUnit === 'sec') {
        fTimeout *= 1000;
    }

    const fWithStatement = block.getFieldValue('WITH_STATEMENT');
    let statement;
    if (fWithStatement === true || fWithStatement === 'true' || fWithStatement === 'TRUE') {
        statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');
    }

    let objectName = '';
    try {
        const objId = eval(vObjId); // Code to string
        objectName = main.objects[objId] && main.objects[objId].common && main.objects[objId].common.name ? main.objects[objId].common.name : '';
        if (typeof objectName === 'object') {
            objectName = objectName[systemLang] || objectName.en;
        }
    } catch (error) {
        
    }

    let vData = Blockly.JavaScript.valueToCode(block, 'DATA', Blockly.JavaScript.ORDER_ATOMIC);
    if (!vData) {
        vData = 'true';
    }

    if (statement) {
        return `messageTo({ instance: ${fInstance}, script: ${vObjId}${objectName ? ` /* ${objectName} */` : ''}, message: ${Blockly.JavaScript.quote_(fMessage)} }, ${vData}, { timeout: ${fTimeout} }, (result) => {\n` +
            statement +
            '})\n';
    }

    return `messageTo({ instance: ${fInstance}, script: ${vObjId}${objectName ? ` /* ${objectName} */` : ''}, message: ${Blockly.JavaScript.quote_(fMessage)} }, ${vData}, { timeout: ${fTimeout} });\n`;
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
    init: function () {
        const options = [
            ['default', 'default'],
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

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Sendto.HUE);

        this.setTooltip(Blockly.Translate('sendto_gethistory_tooltip'));
        this.setHelpUrl(getHelp('sendto_gethistory_help'));
    },
};

Blockly.JavaScript.forBlock['sendto_gethistory'] = function (block) {
    const fInstance = block.getFieldValue('INSTANCE');
    const vObjId = Blockly.JavaScript.valueToCode(block, 'OID', Blockly.JavaScript.ORDER_ATOMIC);
    const vStart = Blockly.JavaScript.valueToCode(block, 'START', Blockly.JavaScript.ORDER_ATOMIC);
    const vEnd = Blockly.JavaScript.valueToCode(block, 'END', Blockly.JavaScript.ORDER_ATOMIC);
    const fAggregate = block.getFieldValue('AGGREGATE');
    const fUnit = block.getFieldValue('UNIT');

    let fStep = block.getFieldValue('STEP');
    if (fUnit === 'day') {
        fStep *= 24 * 60 * 60 * 1000;
    } else if (fUnit === 'hour') {
        fStep *= 60 * 60 * 1000;
    } else if (fUnit === 'min') {
        fStep *= 60 * 1000;
    } else if (fUnit === 'sec') {
        fStep *= 1000;
    }

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

    return `getHistory(${fInstance !== 'default' ? `${Blockly.JavaScript.quote_(fInstance)}, ` : ''}{\n` +
        `  id: ${vObjId}${objectName ? ` /* ${objectName} */` : ''},\n` +
        `  start: ${vStart},\n` +
        `  end: ${vEnd},\n`+
        (fStep > 0 && fAggregate !== 'none' ? `  step: ${fStep},\n` : '') +
        `  aggregate: '${fAggregate}',\n` +
        `  removeBorderValues: true,\n`+
        `}, async (err, result) => {\n` +
        `  if (err) {\n` +
        `    console.error(err);\n`+
        (statement ? `  } else {\n` : '') +
        (statement ? Blockly.JavaScript.prefixLines(statement, Blockly.JavaScript.INDENT) : '') +
        `  }\n` +
        '});\n'
};
