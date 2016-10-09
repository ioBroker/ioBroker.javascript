if (Blockly.Blocks['procedures_ifreturn'].FUNCTION_TYPES.indexOf('procedures_defcustomreturn') === -1) {
    Blockly.Blocks['procedures_ifreturn'].FUNCTION_TYPES.push('procedures_defcustomreturn');
}
if (Blockly.Blocks['procedures_ifreturn'].FUNCTION_TYPES.indexOf('procedures_defcustomnoreturn') === -1) {
    Blockly.Blocks['procedures_ifreturn'].FUNCTION_TYPES.push('procedures_defcustomnoreturn');
}
// derived from core/procedures.js
/**
 * Find all user-created procedure definitions in a workspace.
 * @param {!Blockly.Workspace} root Root workspace.
 * @return {!Array.<!Array.<!Array>>} Pair of arrays, the
 *     first contains procedures without return variables, the second with.
 *     Each procedure is defined by a three-element list of name, parameter
 *     list, and return value boolean.
 */
Blockly.Procedures.allProcedures = function(root) {
    var blocks = root.getAllBlocks();
    var proceduresReturn = [];
    var proceduresNoReturn = [];
    var proceduresCustomReturn = [];
    var proceduresCustomNoReturn = [];
    for (var i = 0; i < blocks.length; i++) {
        if (blocks[i].getProcedureDef) {
            var tuple = blocks[i].getProcedureDef();
            if (tuple) {
                if (tuple[3]) {
                    if (tuple[2]) {
                        proceduresCustomReturn.push(tuple);
                    } else {
                        proceduresCustomNoReturn.push(tuple);
                    }
                } else {
                    if (tuple[2]) {
                        proceduresReturn.push(tuple);
                    } else {
                        proceduresNoReturn.push(tuple);
                    }
                }
            }
        }
    }
    proceduresNoReturn.sort(Blockly.Procedures.procTupleComparator_);
    proceduresReturn.sort(Blockly.Procedures.procTupleComparator_);
    return [proceduresNoReturn, proceduresReturn, proceduresCustomNoReturn, proceduresCustomReturn];
};

/**
 * Construct the blocks required by the flyout for the procedure category.
 * @param {!Blockly.Workspace} workspace The workspace contianing procedures.
 * @return {!Array.<!Element>} Array of XML block elements.
 */
Blockly.Procedures.flyoutCategory = function(workspace) {
    var xmlList = [];
    var block;
    if (Blockly.Blocks['procedures_defnoreturn']) {
        // <block type="procedures_defnoreturn" gap="16"></block>
        block = goog.dom.createDom('block');
        block.setAttribute('type', 'procedures_defnoreturn');
        block.setAttribute('gap', 16);
        xmlList.push(block);
    }
    if (Blockly.Blocks['procedures_defreturn']) {
        // <block type="procedures_defreturn" gap="16"></block>
        block = goog.dom.createDom('block');
        block.setAttribute('type', 'procedures_defreturn');
        block.setAttribute('gap', 16);
        xmlList.push(block);
    }
    if (Blockly.Blocks['procedures_ifreturn']) {
        // <block type="procedures_ifreturn" gap="16"></block>
        block = goog.dom.createDom('block');
        block.setAttribute('type', 'procedures_ifreturn');
        block.setAttribute('gap', 16);
        xmlList.push(block);
    }
    if (Blockly.Blocks['procedures_defcustomnoreturn']) {
        // <block type="procedures_defnoreturn" gap="16"></block>
        block = goog.dom.createDom('block');
        block.setAttribute('type', 'procedures_defcustomnoreturn');
        block.setAttribute('gap', 16);
        xmlList.push(block);
    }
    if (Blockly.Blocks['procedures_defcustomreturn']) {
        // <block type="procedures_defnoreturn" gap="16"></block>
        block = goog.dom.createDom('block');
        block.setAttribute('type', 'procedures_defcustomreturn');
        block.setAttribute('gap', 16);
        xmlList.push(block);
    }
    if (xmlList.length) {
        // Add slightly larger gap between system blocks and user calls.
        xmlList[xmlList.length - 1].setAttribute('gap', 24);
    }

    function populateProcedures(procedureList, templateName) {
        for (var i = 0; i < procedureList.length; i++) {
            var name = procedureList[i][0];
            var args = procedureList[i][1];
            // <block type="procedures_callnoreturn" gap="16">
            //   <mutation name="do something">
            //     <arg name="x"></arg>
            //   </mutation>
            // </block>
            var block = goog.dom.createDom('block');
            block.setAttribute('type', templateName);
            block.setAttribute('gap', 16);
            var mutation = goog.dom.createDom('mutation');
            mutation.setAttribute('name', name);
            block.appendChild(mutation);
            for (var j = 0; j < args.length; j++) {
                var arg = goog.dom.createDom('arg');
                arg.setAttribute('name', args[j]);
                mutation.appendChild(arg);
            }
            xmlList.push(block);
        }
    }

    var tuple = Blockly.Procedures.allProcedures(workspace);
    populateProcedures(tuple[0], 'procedures_callnoreturn');
    populateProcedures(tuple[1], 'procedures_callreturn');
    populateProcedures(tuple[2], 'procedures_callcustomnoreturn');
    populateProcedures(tuple[3], 'procedures_callcustomreturn');
    return xmlList;
};

// ---------------------- custom function with return ------------------------------
Blockly.Words['procedures_defcustomreturn_name']    = {'en': 'JS function with return',                         'de': 'JS-Funktion mit Ergebnis',                        'ru': 'JS функция с результатом'};

Blockly.Blocks['procedures_defcustomreturn'] = {
    /**
     * Block for defining a procedure with a return value.
     * @this Blockly.Block
     */
    init: function() {
        var nameField = new Blockly.FieldTextInput(
            Blockly.Words['procedures_defcustomreturn_name'][systemLang],
            Blockly.Procedures.rename);
        
        nameField.setSpellcheck(false);
        
        this.appendDummyInput()
            .appendField(Blockly.Msg.PROCEDURES_DEFRETURN_TITLE)
            .appendField(nameField, 'NAME')
            .appendField('', 'PARAMS');

        this.appendDummyInput('SCRIPT')
            .appendField(new Blockly.FieldScript(btoa('return 0;')), 'SCRIPT');

        this.setMutator(new Blockly.Mutator(['procedures_mutatorarg']));

        if (Blockly.Msg.PROCEDURES_DEFNORETURN_COMMENT) {
            this.setCommentText(Blockly.Msg.PROCEDURES_DEFNORETURN_COMMENT);
        }

        this.setInputsInline(true);
        this.setColour(Blockly.Blocks.procedures.HUE);
        this.setTooltip(Blockly.Msg.PROCEDURES_DEFRETURN_TOOLTIP);
        this.setHelpUrl(Blockly.Msg.PROCEDURES_DEFRETURN_HELPURL);
        this.arguments_ = [];
        this.setStatements_(false);
        this.statementConnection_ = null;
    },
    setStatements_: Blockly.Blocks['procedures_defreturn'].setStatements_,
    updateParams_: Blockly.Blocks['procedures_defreturn'].updateParams_,
    mutationToDom: Blockly.Blocks['procedures_defreturn'].mutationToDom,
    domToMutation: Blockly.Blocks['procedures_defreturn'].domToMutation,
    /**
     * Populate the mutator's dialog with this block's components.
     * @param {!Blockly.Workspace} workspace Mutator's workspace.
     * @return {!Blockly.Block} Root block in mutator.
     * @this Blockly.Block
     */
    decompose: function(workspace) {
        var containerBlock = workspace.newBlock('procedures_mutatorcontainer');
        containerBlock.initSvg();

        // Check/uncheck the allow statement box.
        containerBlock.getInput('STATEMENT_INPUT').setVisible(false);

        // Parameter list.
        var connection = containerBlock.getInput('STACK').connection;
        for (var i = 0; i < this.arguments_.length; i++) {
            var paramBlock = workspace.newBlock('procedures_mutatorarg');
            paramBlock.initSvg();
            paramBlock.setFieldValue(this.arguments_[i], 'NAME');
            // Store the old location.
            paramBlock.oldLocation = i;
            connection.connect(paramBlock.previousConnection);
            connection = paramBlock.nextConnection;
        }
        // Initialize procedure's callers with blank IDs.
        Blockly.Procedures.mutateCallers(this);
        return containerBlock;
    },
    /**
     * Reconfigure this block based on the mutator dialog's components.
     * @param {!Blockly.Block} containerBlock Root block in mutator.
     * @this Blockly.Block
     */
    compose: function(containerBlock) {
        // Parameter list.
        this.arguments_ = [];
        this.paramIds_ = [];
        var paramBlock = containerBlock.getInputTargetBlock('STACK');
        while (paramBlock) {
            this.arguments_.push(paramBlock.getFieldValue('NAME'));
            this.paramIds_.push(paramBlock.id);
            paramBlock = paramBlock.nextConnection &&
                paramBlock.nextConnection.targetBlock();
        }
        this.updateParams_();
        Blockly.Procedures.mutateCallers(this);
    },
    /**
     * Return the signature of this procedure definition.
     * @return {!Array} Tuple containing three elements:
     *     - the name of the defined procedure,
     *     - a list of all its arguments,
     *     - that it DOES NOT have a return value.
     * @this Blockly.Block
     */
    getProcedureDef: function() {
        return [this.getFieldValue('NAME'), this.arguments_, true, true];
    },
    getVars: Blockly.Blocks['procedures_defreturn'].getVars,
    renameVar: Blockly.Blocks['procedures_defreturn'].renameVar,
    customContextMenu: Blockly.Blocks['procedures_defreturn'].customContextMenu,
    callType_: 'procedures_callcustomreturn'
};

Blockly.JavaScript['procedures_defcustomreturn'] = function(block) {
    // Define a procedure with a return value.
    var funcName = Blockly.JavaScript.variableDB_.getName(block.getFieldValue('NAME'), Blockly.Procedures.NAME_TYPE);

    var args = [];
    for (var i = 0; i < block.arguments_.length; i++) {
        args[i] = Blockly.JavaScript.variableDB_.getName(block.arguments_[i], Blockly.Variables.NAME_TYPE);
    }

    var script = atob(block.getFieldValue('SCRIPT'));
    var lines = script.split('\n');
    for (var l = 0; l < lines.length; l++) {
        lines[l] = '    ' + lines[l];
    }

    var code = 'function ' + funcName + '(' + args.join(', ') + ') {\n' +
        lines.join('\n') + '\n}';

    code = Blockly.JavaScript.scrub_(block, code);

    // Add % so as not to collide with helper functions in definitions list.
    Blockly.JavaScript.definitions_['%' + funcName] = code;
    return null;
};

Blockly.Blocks['procedures_callcustomreturn'] = {
    init: Blockly.Blocks['procedures_callreturn'].init,
    getProcedureCall:  Blockly.Blocks['procedures_callreturn'].getProcedureCall,
    renameProcedure: Blockly.Blocks['procedures_callreturn'].renameProcedure,
    setProcedureParameters_: Blockly.Blocks['procedures_callreturn'].setProcedureParameters_,
    updateShape_: Blockly.Blocks['procedures_callreturn'].updateShape_,
    mutationToDom: Blockly.Blocks['procedures_callreturn'].mutationToDom,
    domToMutation: Blockly.Blocks['procedures_callreturn'].domToMutation,
    renameVar: Blockly.Blocks['procedures_callreturn'].renameVar,
    onchange: Blockly.Blocks['procedures_callreturn'].onchange,
    customContextMenu: Blockly.Blocks['procedures_callreturn'].customContextMenu,
    defType_: 'procedures_defcustomreturn'
};

Blockly.JavaScript['procedures_callcustomreturn'] = Blockly.JavaScript['procedures_callreturn'];

// ---------------------- custom function with no return ------------------------------
Blockly.Words['procedures_defcustomnoreturn_name']    = {'en': 'Javascript function',                         'de': 'Javascript-Funktion',                        'ru': 'Javascript функция'};

Blockly.Blocks['procedures_defcustomnoreturn'] = {
    init: function() {
        var nameField = new Blockly.FieldTextInput(
            Blockly.Words['procedures_defcustomnoreturn_name'][systemLang],
            Blockly.Procedures.rename);

        nameField.setSpellcheck(false);

        this.appendDummyInput()
            .appendField(Blockly.Msg.PROCEDURES_DEFRETURN_TITLE)
            .appendField(nameField, 'NAME')
            .appendField('', 'PARAMS');

        this.appendDummyInput('SCRIPT')
            .appendField(new Blockly.FieldScript(''), 'SCRIPT');

        this.setMutator(new Blockly.Mutator(['procedures_mutatorarg']));

        if (Blockly.Msg.PROCEDURES_DEFNORETURN_COMMENT) {
            this.setCommentText(Blockly.Msg.PROCEDURES_DEFNORETURN_COMMENT);
        }

        this.setInputsInline(true);
        this.setColour(Blockly.Blocks.procedures.HUE);
        this.setTooltip(Blockly.Msg.PROCEDURES_DEFRETURN_TOOLTIP);
        this.setHelpUrl(Blockly.Msg.PROCEDURES_DEFRETURN_HELPURL);
        this.arguments_ = [];
        this.setStatements_(false);
        this.statementConnection_ = null;
    },
    setStatements_: Blockly.Blocks['procedures_defnoreturn'].setStatements_,
    updateParams_: Blockly.Blocks['procedures_defnoreturn'].updateParams_,
    mutationToDom: Blockly.Blocks['procedures_defnoreturn'].mutationToDom,
    domToMutation: Blockly.Blocks['procedures_defnoreturn'].domToMutation,
    decompose: Blockly.Blocks['procedures_defcustomreturn'].decompose,
    compose: Blockly.Blocks['procedures_defcustomreturn'].compose,
    getProcedureDef: function() {
        return [this.getFieldValue('NAME'), this.arguments_, false, true];
    },
    getVars: Blockly.Blocks['procedures_defnoreturn'].getVars,
    renameVar: Blockly.Blocks['procedures_defnoreturn'].renameVar,
    customContextMenu: Blockly.Blocks['procedures_defnoreturn'].customContextMenu,
    callType_: 'procedures_callcustomnoreturn'
};

Blockly.JavaScript['procedures_defcustomnoreturn'] = Blockly.JavaScript['procedures_defcustomreturn'];

Blockly.Blocks['procedures_callcustomnoreturn'] = {
    init: Blockly.Blocks['procedures_callnoreturn'].init,
    getProcedureCall:  Blockly.Blocks['procedures_callnoreturn'].getProcedureCall,
    renameProcedure: Blockly.Blocks['procedures_callnoreturn'].renameProcedure,
    setProcedureParameters_: Blockly.Blocks['procedures_callnoreturn'].setProcedureParameters_,
    updateShape_: Blockly.Blocks['procedures_callnoreturn'].updateShape_,
    mutationToDom: Blockly.Blocks['procedures_callnoreturn'].mutationToDom,
    domToMutation: Blockly.Blocks['procedures_callnoreturn'].domToMutation,
    renameVar: Blockly.Blocks['procedures_callnoreturn'].renameVar,
    onchange: Blockly.Blocks['procedures_callnoreturn'].onchange,
    customContextMenu: Blockly.Blocks['procedures_callnoreturn'].customContextMenu,
    defType_: 'procedures_defcustomnoreturn'
};

Blockly.JavaScript['procedures_callcustomnoreturn'] = Blockly.JavaScript['procedures_callnoreturn'];
