'use strict';

if (typeof goog !== 'undefined') {
    goog.require('Blockly.JavaScript');
}

// --- logic multi and --------------------------------------------------

Blockly.Blocks['logic_multi_and_container'] = {
    /**
     * Mutator block for container.
     * @this Blockly.Block
     */
    init: function () {
        this.setColour("%{BKY_LOGIC_HUE}");

        this.appendDummyInput()
            .appendField(Blockly.Translate('logic_multi_and'));

        this.appendStatementInput('STACK');
        this.setTooltip(Blockly.Translate('logic_multi_and_tooltip'));

        this.contextMenu = false;
    },
};

Blockly.Blocks['logic_multi_and_mutator'] = {
    /**
     * Mutator block for add items.
     * @this Blockly.Block
     */
    init: function () {
        this.setColour("%{BKY_LOGIC_HUE}");

        this.appendDummyInput('AND')
            .appendField(Blockly.Translate('logic_multi_and_and'));

        this.setPreviousStatement(true);
        this.setNextStatement(true);

        this.setTooltip(Blockly.Translate('logic_multi_and_tooltip'));

        this.contextMenu = false;
    },
};

Blockly.Blocks['logic_multi_and'] = {
    init: function () {
        this.itemCount_ = 2;
        this.setMutator(new Blockly.icons.MutatorIcon(['logic_multi_and_mutator'], this));

        this.setInputsInline(false);
        this.setOutput(true, 'Boolean');

        this.setColour("%{BKY_LOGIC_HUE}");
        this.setTooltip(Blockly.Translate('logic_multi_and_tooltip'));
        // this.setHelpUrl(getHelp('logic_multi_and_help'));
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
        const containerBlock = workspace.newBlock('logic_multi_and_container');
        containerBlock.initSvg();

        let connection = containerBlock.getInput('STACK').connection;
        for (let i = 0; i < this.itemCount_; i++) {
            const itemBlock = workspace.newBlock('logic_multi_and_mutator');
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
            const connection = this.getInput('AND' + k).connection.targetConnection;
            if (connection && !connections.includes(connection)) {
                connection.disconnect();
            }
        }

        this.itemCount_ = connections.length;
        if (this.itemCount_ < 2) {
            this.itemCount_ = 2;
        }
        this.updateShape_();

        // Reconnect any child blocks.
        for (let i = 0; i < this.itemCount_; i++) {
            Blockly.icons.MutatorIcon.reconnect(connections[i], this, 'AND' + i);
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
            const input = this.getInput('AND' + i);
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
        // Add new inputs.
        for (let i = 0; i < this.itemCount_; i++) {
            if (!this.getInput('AND' + i)) {
                const input = this.appendValueInput('AND' + i).setAlign(Blockly.ALIGN_RIGHT);
                if (i > 0) {
                    input.appendField(Blockly.Translate('logic_multi_and_and'));
                }
            }
        }
        // Remove deleted inputs.
        for (let i = this.itemCount_; this.getInput('AND' + i); i++) {
            this.removeInput('AND' + i);
        }
    },
};

Blockly.JavaScript.forBlock['logic_multi_and'] = function (block) {
    const ands = [];
    for (let n = 0; n < block.itemCount_; n++) {
        const condition = Blockly.JavaScript.valueToCode(block, 'AND' + n, Blockly.JavaScript.ORDER_ATOMIC);
        if (condition) {
            ands.push(condition);
        }
    }

    return [`${ands.length > 0 ? ands.join(' && ') : 'false'}`, Blockly.JavaScript.ORDER_LOGICAL_AND];
};

// --- logic multi or --------------------------------------------------

Blockly.Blocks['logic_multi_or_container'] = {
    /**
     * Mutator block for container.
     * @this Blockly.Block
     */
    init: function () {
        this.setColour("%{BKY_LOGIC_HUE}");

        this.appendDummyInput()
            .appendField(Blockly.Translate('logic_multi_or'));

        this.appendStatementInput('STACK');
        this.setTooltip(Blockly.Translate('logic_multi_or_tooltip'));

        this.contextMenu = false;
    },
};

Blockly.Blocks['logic_multi_or_mutator'] = {
    /**
     * Mutator block for add items.
     * @this Blockly.Block
     */
    init: function () {
        this.setColour("%{BKY_LOGIC_HUE}");

        this.appendDummyInput('OR')
            .appendField(Blockly.Translate('logic_multi_or_or'));

        this.setPreviousStatement(true);
        this.setNextStatement(true);

        this.setTooltip(Blockly.Translate('logic_multi_or_tooltip'));

        this.contextMenu = false;
    },
};

Blockly.Blocks['logic_multi_or'] = {
    init: function () {
        this.itemCount_ = 2;
        this.setMutator(new Blockly.icons.MutatorIcon(['logic_multi_or_mutator'], this));

        this.setInputsInline(false);
        this.setOutput(true, 'Boolean');

        this.setColour("%{BKY_LOGIC_HUE}");
        this.setTooltip(Blockly.Translate('logic_multi_or_tooltip'));
        // this.setHelpUrl(getHelp('logic_multi_or_help'));
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
        const containerBlock = workspace.newBlock('logic_multi_or_container');
        containerBlock.initSvg();

        let connection = containerBlock.getInput('STACK').connection;
        for (let i = 0; i < this.itemCount_; i++) {
            const itemBlock = workspace.newBlock('logic_multi_or_mutator');
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
            const connection = this.getInput('OR' + k).connection.targetConnection;
            if (connection && !connections.includes(connection)) {
                connection.disconnect();
            }
        }

        this.itemCount_ = connections.length;
        if (this.itemCount_ < 2) {
            this.itemCount_ = 2;
        }
        this.updateShape_();

        // Reconnect any child blocks.
        for (let i = 0; i < this.itemCount_; i++) {
            Blockly.icons.MutatorIcon.reconnect(connections[i], this, 'OR' + i);
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
            const input = this.getInput('OR' + i);
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
        // Add new inputs.
        for (let i = 0; i < this.itemCount_; i++) {
            if (!this.getInput('OR' + i)) {
                const input = this.appendValueInput('OR' + i).setAlign(Blockly.ALIGN_RIGHT);
                if (i > 0) {
                    input.appendField(Blockly.Translate('logic_multi_or_or'));
                }
            }
        }
        // Remove deleted inputs.
        for (let i = this.itemCount_; this.getInput('OR' + i); i++) {
            this.removeInput('OR' + i);
        }
    },
};

Blockly.JavaScript.forBlock['logic_multi_or'] = function (block) {
    const ors = [];
    for (let n = 0; n < block.itemCount_; n++) {
        const condition = Blockly.JavaScript.valueToCode(block, 'OR' + n, Blockly.JavaScript.ORDER_ATOMIC);
        if (condition) {
            ors.push(condition);
        }
    }

    return [`${ors.length > 0 ? ors.join(' || ') : 'false'}`, Blockly.JavaScript.ORDER_LOGICAL_OR];
};

// --- logic between --------------------------------------------------

Blockly.Blocks['logic_between'] = {
    init: function () {
        this.appendValueInput('MIN')
            .setCheck('Number');
        this.appendValueInput('VALUE')
            .setCheck('Number')
            .appendField(new Blockly.FieldDropdown([['<', 'LT'], ['≤', 'LE']]), 'MIN_OPERATOR');
        this.appendValueInput('MAX')
            .setCheck('Number')
            .appendField(new Blockly.FieldDropdown([['<', 'LT'], ['≤', 'LE']]), 'MAX_OPERATOR');

        this.setInputsInline(true);
        this.setOutput(true, 'Boolean');
        this.setColour("%{BKY_LOGIC_HUE}");
        this.setTooltip(Blockly.Translate('logic_between_tooltip'));
        // this.setHelpUrl(getHelp('logic_between_help'));
    },
};

Blockly.JavaScript.forBlock['logic_between'] = function (block) {
    const min = Blockly.JavaScript.valueToCode(block, 'MIN', Blockly.JavaScript.ORDER_RELATIONAL) || 0;
    const value = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_RELATIONAL) || 0;
    const max = Blockly.JavaScript.valueToCode(block, 'MAX', Blockly.JavaScript.ORDER_RELATIONAL) || 0;
    const minOperator = block.getFieldValue('MIN_OPERATOR') === 'LT' ? '<' : '<=';
    const maxOperator = block.getFieldValue('MAX_OPERATOR') === 'LT' ? '<' : '<=';

    return [`${min} ${minOperator} ${value} && ${value} ${maxOperator} ${max}`, Blockly.JavaScript.ORDER_LOGICAL_AND];
};

// --- logic ifempty --------------------------------------------------

Blockly.Blocks['logic_ifempty'] = {
    init: function () {
        this.appendValueInput('VALUE')
            .setCheck(null)
            .setAlign(Blockly.ALIGN_RIGHT)
            .appendField(Blockly.Translate('logic_ifempty'));
        this.appendValueInput('DEFLT')
            .setCheck(null)
            .setAlign(Blockly.ALIGN_RIGHT)
            .appendField(Blockly.Translate('logic_ifempty_then'));

        this.setOutput(true, null);
        this.setInputsInline(true);
        this.setColour("%{BKY_LOGIC_HUE}");
        this.setTooltip(Blockly.Translate('logic_ifempty_tooltip'));
        // this.setHelpUrl(getHelp('logic_ifempty_help'));
    },
};

Blockly.JavaScript.forBlock['logic_ifempty'] = function (block) {
    const value = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_LOGICAL_OR) || null;
    const deflt = Blockly.JavaScript.valueToCode(block, 'DEFLT', Blockly.JavaScript.ORDER_LOGICAL_OR) || null;

    return [`${value} || ${deflt}`, Blockly.JavaScript.ORDER_LOGICAL_OR];
};
