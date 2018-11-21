'use strict';

goog.provide('Blockly.JavaScript.Sendto');

goog.require('Blockly.JavaScript');

Blockly.CustomBlocks = Blockly.CustomBlocks || [];
Blockly.CustomBlocks.push('Sendto');

Blockly.Sendto = {
    HUE: 310,
    blocks: {}
};

// --- sendTo Custom --------------------------------------------------
Blockly.Sendto.blocks['sendto_custom'] =
    '<block type="sendto_custom">'
    + '     <value name="INSTANCE">'
    + '     </value>'
    + '     <value name="COMMAND">'
    + '     </value>'
    + '     <value name="LOG">'
    + '     </value>'
    + '     <value name="WITH_STATEMENT">'
    + '     </value>'
    + '     <mutation with_statement="false" items="parameter1"></mutation>'
    + '</block>';

Blockly.Blocks['sendto_custom_container'] = {
    /**
     * Mutator block for container.
     * @this Blockly.Block
     */
    init: function () {
        this.setColour(Blockly.Sendto.HUE);

        this.appendDummyInput()
            .appendField(Blockly.Words['sendto_custom_arguments'][systemLang]);

        this.appendStatementInput('STACK');
        this.setTooltip(Blockly.Words['sendto_custom_arg_tooltip'][systemLang]);
        this.contextMenu = false;
    }
};

Blockly.Blocks['sendto_custom_item'] = {
    /**
     * Mutator block for add items.
     * @this Blockly.Block
     */
    init: function () {
        this.setColour(Blockly.Sendto.HUE);

        this.appendDummyInput('NAME')
            .appendField(Blockly.Words['sendto_custom_argument'][systemLang]);

        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setTooltip(Blockly.Words['sendto_custom_arg_tooltip'][systemLang]);
        this.contextMenu = false;
    }
};

Blockly.Blocks['sendto_custom'] = {
    /**
     * Block for creating a string made up of any number of elements of any type.
     * @this Blockly.Block
     */
    init: function () {
        var options = [];
        if (typeof main !== 'undefined' && main.instances) {
            for (var i = 0; i < main.instances.length; i++) {
                if (main.objects[main.instances[i]].common.messagebox) {
                    var id = main.instances[i].substring('system.adapter.'.length);
                    options.push([id, id]);
                }
            }
            /*for (var h = 0; h < scripts.hosts.length; h++) {
                options.push([scripts.hosts[h], scripts.hosts[h]]);
            }*/
            this.appendDummyInput('INSTANCE')
                .appendField(Blockly.Words['sendto_custom'][systemLang])
                .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');
        } else {
            this.appendDummyInput('INSTANCE')
                .appendField(Blockly.Words['sendto_custom'][systemLang])
                .appendField(new Blockly.FieldTextInput('adapter.0'), 'INSTANCE');
        }

        this.appendDummyInput('COMMAND')
            .appendField(Blockly.Words['sendto_custom_command'][systemLang])
            .appendField(new Blockly.FieldTextInput('send'), 'COMMAND');

        this.setColour(Blockly.Sendto.HUE);

        this.itemCount_ = 1;
        this.updateShape_();
        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setMutator(new Blockly.Mutator(['sendto_custom_item']));
        this.setTooltip(Blockly.Words['sendto_custom_tooltip'][systemLang]);
        this.setHelpUrl(getHelp('sendto_custom_help'));
    },
    /**
     * Create XML to represent number of text inputs.
     * @return {!Element} XML storage element.
     * @this Blockly.Block
     */
    mutationToDom: function () {
        var container = document.createElement('mutation');
        var names = [];
        for (var i = 0; i < this.itemCount_; i++) {
            var input = this.getInput('ARG' + i);
            names[i] = input.fieldRow[0].getValue();
        }

        container.setAttribute('items', names.join(','));
        container.setAttribute('with_statement', this.getFieldValue('WITH_STATEMENT') === 'TRUE');
        return container;
    },
    /**
     * Parse XML to restore the text inputs.
     * @param {!Element} xmlElement XML storage element.
     * @this Blockly.Block
     */
    domToMutation: function (xmlElement) {
        var names = xmlElement.getAttribute('items').split(',');
        this.itemCount_ = names.length;
        this.updateShape_(names, xmlElement.getAttribute('with_statement') == 'true');
    },
    /**
     * Populate the mutator's dialog with this block's components.
     * @param {!Blockly.Workspace} workspace Mutator's workspace.
     * @return {!Blockly.Block} Root block in mutator.
     * @this Blockly.Block
     */
    decompose: function (workspace) {
        var containerBlock = workspace.newBlock('sendto_custom_container');
        containerBlock.initSvg();
        var connection = containerBlock.getInput('STACK').connection;
        for (var i = 0; i < this.itemCount_; i++) {
            var itemBlock = workspace.newBlock('sendto_custom_item');
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
        var names = [];
        while (itemBlock) {
            connections.push(itemBlock.valueConnection_);
            itemBlock = itemBlock.nextConnection &&
                itemBlock.nextConnection.targetBlock();
        }
        // Disconnect any children that don't belong.
        for (var i = 0; i < this.itemCount_; i++) {
            var input = this.getInput('ARG' + i);
            var connection = input.connection.targetConnection;
            names[i] = input.fieldRow[0].getValue();
            if (connection && connections.indexOf(connection) === -1) {
                connection.disconnect();
            }
        }
        this.itemCount_ = connections.length;
        if (this.itemCount_ < 1) this.itemCount_ = 1;
        this.updateShape_(names);
        // Reconnect any child blocks.
        for (var j = 0; j < this.itemCount_; j++) {
            Blockly.Mutator.reconnect(connections[j], this, 'ARG' + j);

        }
    },
    getArgNames_: function () {
        var names = [];
        for (var n = 0; n < this.itemCount_; n++) {
            var input = this.getInput('ARG' + n);
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
        var itemBlock = containerBlock.getInputTargetBlock('STACK');
        var i = 0;
        while (itemBlock) {
            var input = this.getInput('ARG' + i);
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
        this.removeInput('LOG');
        this.removeInput('WITH_STATEMENT');
        names = names || [];
        var _input;
        // Add new inputs.
        for (var i = 0; i < this.itemCount_; i++) {
            _input = this.getInput('ARG' + i);
            if (!_input) {
                _input = this.appendValueInput('ARG' + i);
                if (!names[i]) names[i] = Blockly.Words['sendto_custom_argument'][systemLang] + (i + 1);
                _input.appendField(new Blockly.FieldTextInput(names[i]));

                var _shadow = this.workspace.newBlock('text');
                _shadow.setShadow(true);
                _shadow.outputConnection.connect(_input.connection);
                _shadow.initSvg();
                _shadow.render();
                //console.log('New ' + names[i]);
            } else {
                _input.fieldRow[0].setValue(names[i]);
                //console.log('Exist ' + names[i]);
                if (!_input.connection.isConnected()) {
                    console.log('Create ' + names[i]);
                    var shadow = this.workspace.newBlock('text');

                    shadow.setShadow(true);

                    shadow.outputConnection.connect(_input.connection);
                    shadow.initSvg();
                    shadow.render();
                }
            }
        }
        // Remove deleted inputs.
        var blocks = [];
        while (_input = this.getInput('ARG' + i)) {
            var b = _input.connection.targetBlock();
            if (b && b.isShadow()) {
                blocks.push(b);
            }
            this.removeInput('ARG' + i);
            i++;
        }
        if (blocks.length) {
            var ws = this.workspace;
            setTimeout(function () {
                for(var b = 0; b < blocks.length; b++) {
                    ws.removeTopBlock(blocks[b]);
                }
            }, 100);
        }

        this.appendDummyInput('WITH_STATEMENT')
            .appendField(Blockly.Words['request_statement'][systemLang])
            .appendField(new Blockly.FieldCheckbox(withStatement ? 'TRUE': 'FALSE', function (option) {
                var withStatement = (option == true);
                this.sourceBlock_.updateShape_(this.sourceBlock_.getArgNames_(), withStatement);
            }), 'WITH_STATEMENT');

        this.appendDummyInput('LOG')
            .appendField(Blockly.Words['sendto_log'][systemLang])
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Words['sendto_log_none'][systemLang],  ''],
                [Blockly.Words['sendto_log_info'][systemLang],  'log'],
                [Blockly.Words['sendto_log_debug'][systemLang], 'debug'],
                [Blockly.Words['sendto_log_warn'][systemLang],  'warn'],
                [Blockly.Words['sendto_log_error'][systemLang], 'error']
            ]), 'LOG');

        // Add or remove a statement Input.
        var inputExists = this.getInput('STATEMENT');

        if (withStatement) {
            if (!inputExists) {
                this.appendStatementInput('STATEMENT');
            }
        } else if (inputExists) {
            this.removeInput('STATEMENT');
        }
    }
};

Blockly.JavaScript['sendto_custom'] = function (block) {
    var instance      = block.getFieldValue('INSTANCE');
    var logLevel      = block.getFieldValue('LOG');
    var command       = block.getFieldValue('COMMAND');
    var withStatement = block.getFieldValue('WITH_STATEMENT');
    var args = [];
    var logText;
    if (logLevel) {
        logText = 'console.' + logLevel + '("' + instance + ': " + "' + (args.length ? args.join(',') + '\n' : '') + '");\n'
    } else {
        logText = '';
    }
    var statement;
    if (withStatement === 'TRUE') {
        statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');
    }

    for (var n = 0; n < block.itemCount_; n++) {
        var input = this.getInput('ARG' + n);
        var val = Blockly.JavaScript.valueToCode(block, 'ARG' + n, Blockly.JavaScript.ORDER_COMMA);
        // if JSON
        if (val && val[0] === "'" && val[1] === '{') {
            val = val.substring(1, val.length - 1);
        }
        args.push('\n   "' + input.fieldRow[0].getValue() + '": ' + val);

        if (block.itemCount_ === 1 && !input.fieldRow[0].getValue()) {
            if (statement) {
                return 'sendTo("' + instance + '", "' + command + '", ' + val + ', function (result) {\n  ' + statement + '  });\n' + logText;
            } else {
                return 'sendTo("' + instance + '", "' + command + '", ' + val + ');\n' + logText;
            }
        }
    }

    if (statement) {
        return 'sendTo("' + instance + '", "' + command + '", {' + (args.length ? args.join(',') + '\n' : '') + '}, function (result) {\n  ' + statement + '  });\n' + logText;
    } else {
        return 'sendTo("' + instance + '", "' + command + '", {' + (args.length ? args.join(',') + '\n' : '') + '});\n' + logText;
    }
};
