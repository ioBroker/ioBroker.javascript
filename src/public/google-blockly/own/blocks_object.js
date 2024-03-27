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
    + '    <mutation></mutation>'
    + '</block>';

Blockly.Blocks['object_new_container'] = {
    /**
     * Mutator block for container.
     * @this Blockly.Block
     */
    init: function() {
        this.setColour(Blockly.Object.HUE);

        this.appendDummyInput()
            .appendField(Blockly.Translate('object_new_attributes'));

        this.appendStatementInput('STACK');
        this.setTooltip(Blockly.Translate('object_new_tooltip'));

        this.contextMenu = false;
    }
};

Blockly.Blocks['object_new_mutator'] = {
    /**
     * Mutator block for add items.
     * @this Blockly.Block
     */
    init: function() {
        this.setColour(Blockly.Object.HUE);

        this.appendDummyInput('ATTR')
            .appendField(Blockly.Translate('object_new_attribute'))
            .appendField(new Blockly.FieldTextInput('attribute1'), 'ATTR');

        this.setPreviousStatement(true);
        this.setNextStatement(true);

        this.setTooltip(Blockly.Translate('object_new_tooltip'));

        this.contextMenu = false;
    }
};

Blockly.Blocks['object_new'] = {
    init: function() {
        this.appendDummyInput('NAME')
            .appendField(Blockly.Translate('object_new'));

        this.attributes_ = [];
        this.itemCount_ = 0;
        this.setMutator(new Blockly.Mutator(['object_new_mutator']));

        this.setInputsInline(false);
        this.setOutput(true);

        this.setColour(Blockly.Object.HUE);
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

        for (let i = 0; i < this.attributes_.length; i++) {
            const parameter = document.createElement('attribute');
            parameter.setAttribute('id', 'ATTR_' + i);
            parameter.setAttribute('name', this.attributes_[i]);
            container.appendChild(parameter);
        }

        return container;
    },
    /**
     * Parse XML to restore the text inputs.
     * @param {!Element} xmlElement XML storage element.
     * @this Blockly.Block
     */
    domToMutation: function (xmlElement) {
        this.attributes_ = [];

        for (let i = 0, childNode; (childNode = xmlElement.childNodes[i]); i++) {
            if (childNode.nodeName.toLowerCase() === 'attribute') {
                // console.log('attribute -> ' + childNode.getAttribute('id') + ' -> ' + childNode.getAttribute('name'));
                this.attributes_.push(childNode.getAttribute('name'));
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
        const containerBlock = workspace.newBlock('object_new_container');
        containerBlock.initSvg();

        let connection = containerBlock.getInput('STACK').connection;
        for (let i = 0; i < this.itemCount_; i++) {
            const itemBlock = workspace.newBlock('object_new_mutator');
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
            const connection = this.getInput('ATTR_' + k).connection.targetConnection;
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
            Blockly.Mutator.reconnect(connections[i], this, 'ATTR_' + i);
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
            const input = this.getInput('ATTR_' + i);
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
        const workspace = this.workspace;

        // Add new inputs.
        for (let i = 0; i < this.itemCount_; i++) {
            let input = this.getInput('ATTR_' + i);

            if (!input) {
                input = this.appendValueInput('ATTR_' + i).setAlign(Blockly.ALIGN_RIGHT);
                input.appendField(this.attributes_[i]);
            } else {
                input.fieldRow[0].setValue(this.attributes_[i]);
            }

            setTimeout((_input) => {
                if (!_input.connection.isConnected()) {
                    const _shadow = workspace.newBlock('text');
                    _shadow.setShadow(true);
                    _shadow.initSvg();
                    _shadow.render();
                    _shadow.outputConnection.connect(_input.connection);
                    //console.log('New ' + this.attributes_[i]);
                }
            }, 100, input);
        }
        // Remove deleted inputs.
        for (let i = this.itemCount_; this.getInput('ATTR_' + i); i++) {
            this.removeInput('ATTR_' + i);
        }
    }
};

Blockly.JavaScript['object_new'] = function(block) {
    const attributes = [];
    for (let n = 0; n < block.itemCount_; n++) {
        const val = Blockly.JavaScript.valueToCode(block, 'ATTR_' + n, Blockly.JavaScript.ORDER_COMMA);
        if (val) {
            attributes.push(`'${String(block.attributes_[n]).replaceAll(`'`, `\\'`)}': ${val}`);
        }
    }

    return [`{ ${attributes.length ? attributes.join(', ') : ''} }`, Blockly.JavaScript.ORDER_ATOMIC];
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
    let obj  = Blockly.JavaScript.valueToCode(block, 'OBJECT', Blockly.JavaScript.ORDER_ATOMIC);
    const attr = block.getFieldValue('ATTR');
    const value = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC);

    if (!obj) {
        obj = '{}';
    }

    return `((obj) => { if (typeof obj === 'object') { obj['${attr}'] = ${value}; } })(${obj});\n`;
};

// --- delete attribute --------------------------------------------------
Blockly.Object.blocks['object_del_attr'] =
    '<block type="object_del_attr">'
    + '     <value name="ATTR">'
    + '     </value>'
    + '     <value name="OBJECT">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['object_del_attr'] = {
    init: function() {
        this.appendDummyInput('ATTR')
            .appendField(Blockly.Translate('object_del_attr'))
            .appendField(new Blockly.FieldTextInput('attribute1'), 'ATTR');

        this.appendValueInput('OBJECT')
            .appendField(Blockly.Translate('object_del_attr_object'));

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Object.HUE);
        this.setTooltip(Blockly.Translate('object_del_attr_tooltip'));
        //this.setHelpUrl(getHelp('object_del_attr_help'));
    }
};

Blockly.JavaScript['object_del_attr'] = function(block) {
    let obj  = Blockly.JavaScript.valueToCode(block, 'OBJECT', Blockly.JavaScript.ORDER_ATOMIC);
    const attr = block.getFieldValue('ATTR');

    if (!obj) {
        obj = '{}';
    }

    return `((obj) => { if (typeof obj === 'object') { delete obj['${attr}']; } })(${obj});\n`;
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

// --- object keys --------------------------------------------------
Blockly.Object.blocks['object_keys'] =
    '<block type="object_keys">'
    + '     <value name="OBJECT">'
    + '         <shadow type="get_object">'
    + '             <field name="OID">Object ID</field>'
    + '         </shadow>'
    + '     </value>'
    + '</block>';

Blockly.Blocks['object_keys'] = {
    init: function() {
        this.appendValueInput('OBJECT')
            .appendField(Blockly.Translate('object_keys'));

        this.setInputsInline(true);
        this.setOutput(true, 'Array');

        this.setColour(Blockly.Object.HUE);
        this.setTooltip(Blockly.Translate('object_keys_tooltip'));
        //this.setHelpUrl(getHelp('object_keys_help'));
    }
};

Blockly.JavaScript['object_keys'] = function(block) {
    let obj = Blockly.JavaScript.valueToCode(block, 'OBJECT', Blockly.JavaScript.ORDER_ATOMIC);

    if (!obj) {
        obj = '{}';
    }

    return [`Object.keys(${obj})`, Blockly.JavaScript.ORDER_ATOMIC];
};
