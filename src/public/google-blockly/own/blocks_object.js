'use strict';

if (typeof goog !== 'undefined') {
    goog.provide('Blockly.JavaScript.Object');

    goog.require('Blockly.JavaScript');
}

Blockly.CustomBlocks = Blockly.CustomBlocks || [];
Blockly.CustomBlocks.push('Object');

Blockly.Object = {
    HUE: 40,
    blocks: {},
};

// --- object new --------------------------------------------------
Blockly.Object.blocks['object_new'] =
    '<block type="object_new">'
    + '     <value name="NAME">'
    + '     </value>'
    + '     <mutation with_statement="false" items="attribute1"></mutation>'
    + '</block>';

Blockly.Blocks['object_new_container'] = {
    /**
     * Mutator block for container.
     * @this Blockly.Block
     */
    init: function () {
        this.setColour(Blockly.Object.HUE);

        this.appendDummyInput()
            .appendField(Blockly.Translate('object_new_attributes'));

        this.appendStatementInput('STACK');
        this.setTooltip(Blockly.Translate('object_new_arg_tooltip'));
        this.contextMenu = false;
    }
};

Blockly.Blocks['object_new_item'] = {
    /**
     * Mutator block for add items.
     * @this Blockly.Block
     */
    init: function () {
        this.setColour(Blockly.Object.HUE);

        this.appendDummyInput('NAME')
            .appendField(Blockly.Translate('object_new_attribute'));

        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setTooltip(Blockly.Translate('object_new_arg_tooltip'));
        this.contextMenu = false;
    }
};

Blockly.Blocks['object_new'] = {
    /**
     * Block for creating a string made up of any number of elements of any type.
     * @this Blockly.Block
     */
    init: function () {
        const options = [];

        this.appendDummyInput('NAME')
            .appendField(Blockly.Translate('object_new'));

        this.setColour(Blockly.Object.HUE);

        this.itemCount_ = 1;
        this.updateShape_();
        this.setInputsInline(false);
        this.setOutput(true);

        this.setPreviousStatement(null, null);
        this.setNextStatement(null, null);
        this.setMutator(new Blockly.Mutator(['object_new_item']));
        this.setTooltip(Blockly.Translate('object_new_tooltip'));
        //this.setHelpUrl(getHelp('object_new_help'));
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
        const containerBlock = workspace.newBlock('object_new_container');
        containerBlock.initSvg();
        let connection = containerBlock.getInput('STACK').connection;
        for (let i = 0; i < this.itemCount_; i++) {
            const itemBlock = workspace.newBlock('object_new_item');
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
            Blockly.Mutator.reconnect(connections[j], this, 'ARG' + j);

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
                    names[i] = 'attribute' + (i + 1);
                }
                _input.appendField(new Blockly.FieldTextInput(names[i]));
                setTimeout(function (_input) {
                    if (!_input.connection.isConnected()) {
                        const _shadow = wp.newBlock('text');
                        _shadow.setShadow(true);
                        _shadow.initSvg();
                        _shadow.render();
                        _shadow.outputConnection.connect(_input.connection);
                        //console.log('New ' + names[i]);
                    }
                }, 100, _input);
            } else {
                _input.fieldRow[0].setValue(names[i]);
                //console.log('Exist ' + names[i]);
                setTimeout(function (_input, name) {
                    if (!_input.connection.isConnected()) {
                        console.log('Create ' + name);
                        const shadow = wp.newBlock('text');
                        shadow.setShadow(true);
                        shadow.initSvg();
                        shadow.render();
                        shadow.outputConnection.connect(_input.connection);
                    }
                }, 100, _input, names[i]);
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
            setTimeout(function () {
                for(let b = 0; b < blocks.length; b++) {
                    ws.removeTopBlock(blocks[b]);
                }
            }, 100);
        }

        // Add or remove a statement Input.
        if (withStatement) {
            this.appendStatementInput('STATEMENT');
        }
    }
};

Blockly.JavaScript['object_new'] = function (block) {
    const args = [];

    for (let n = 0; n < block.itemCount_; n++) {
        const input = this.getInput('ARG' + n);
        let val = Blockly.JavaScript.valueToCode(block, 'ARG' + n, Blockly.JavaScript.ORDER_COMMA);
        // if JSON
        if (val && val[0] === "'" && val[1] === '{') {
            val = val.substring(1, val.length - 1);
        }
        args.push(`'${input.fieldRow[0].getValue()}': ${val}`);
    }

    return [`{ ${args.length ? args.join(', ') : ''} }`, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- set attribute --------------------------------------------------
Blockly.Object.blocks['object_set_attr'] =
    '<block type="object_set_attr">'
    + '     <value name="ATTR">'
    + '     </value>'
    + '     <value name="OBJECT">'
    + '     </value>'
    + '     <value name="VALUE">'
    + '         <shadow type="text">'
    + '             <field name="TEXT">value</field>'
    + '         </shadow>'
    + '     </value>'
    + '</block>';

Blockly.Blocks['object_set_attr'] = {
    init: function() {
        this.appendDummyInput('ATTR')
            .appendField(Blockly.Translate('object_set_attr'))
            .appendField(new Blockly.FieldTextInput('attribute1'), 'ATTR');

        this.appendValueInput('OBJECT')
            .appendField(Blockly.Translate('object_set_attr_object'));

        this.appendValueInput('VALUE')
            .setCheck(null)
            .appendField(Blockly.Translate('object_set_attr_value'));

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Object.HUE);
        this.setTooltip(Blockly.Translate('object_set_attr_tooltip'));
        //this.setHelpUrl(getHelp('object_set_attr_help'));
    }
};

Blockly.JavaScript['object_set_attr'] = function(block) {
    const obj  = Blockly.JavaScript.valueToCode(block, 'OBJECT', Blockly.JavaScript.ORDER_ATOMIC);
    const attr = block.getFieldValue('ATTR');
    const value = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC);

    return `(() => { const obj = ${obj}; if (typeof obj === 'object') { obj['${attr}'] = ${value}; } })();\n`;
};

// --- has attribute --------------------------------------------------
Blockly.Object.blocks['object_has_attr'] =
    '<block type="object_has_attr">'
    + '     <value name="OBJECT">'
    + '         <shadow type="get_object">'
    + '             <field name="OID">Object ID</field>'
    + '         </shadow>'
    + '     </value>'
    + '     <value name="ATTR">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['object_has_attr'] = {
    init: function() {
        this.appendValueInput('OBJECT')
            .appendField(Blockly.Translate('object_has_attr'));

        this.appendDummyInput('ATTR')
            .appendField(Blockly.Translate('object_has_attr_attr'))
            .appendField(new Blockly.FieldTextInput('attribute1'), 'ATTR');

        this.setInputsInline(true);
        this.setOutput(true, 'Boolean');

        this.setColour(Blockly.Object.HUE);
        this.setTooltip(Blockly.Translate('object_has_attr_tooltip'));
        //this.setHelpUrl(getHelp('object_has_attr_help'));
    }
};

Blockly.JavaScript['object_has_attr'] = function(block) {
    const obj  = Blockly.JavaScript.valueToCode(block, 'OBJECT', Blockly.JavaScript.ORDER_ATOMIC);
    const attr = Blockly.JavaScript.valueToCode(block, 'ATTR', Blockly.JavaScript.ORDER_ATOMIC);

    return [`Object.prototype.hasOwnProperty.call(${obj}, ${attr})`, Blockly.JavaScript.ORDER_ATOMIC];
};
