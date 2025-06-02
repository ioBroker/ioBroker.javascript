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
Blockly.Procedures.allProceduresNew = function (root) {
    const result = Blockly.Procedures.allProcedures(root);

    const proceduresCustomNoReturn = root
        .getProcedureMap()
        .getProcedures()
        .filter((p) => !!p.getReturnTypes())
        .map((p) => [
            p.getName(),
            p.getParameters().map((pa) => pa.getName()),
            true,
        ]);

    root.getBlocksByType('procedures_defcustomnoreturn', false).forEach((b) => {
        if (!Blockly.Procedures.isProcedureBlock(b)) {
            proceduresCustomNoReturn.push(b.getProcedureDef());
        }
    });

    const proceduresCustomReturn = root
        .getProcedureMap()
        .getProcedures()
        .filter((p) => !!p.getReturnTypes())
        .map((p) => [
            p.getName(),
            p.getParameters().map((pa) => pa.getName()),
            true,
        ]);

    root.getBlocksByType('procedures_defcustomreturn', false).forEach((b) => {
        if (!Blockly.Procedures.isProcedureBlock(b)) {
            proceduresCustomReturn.push(b.getProcedureDef());
        }
    });

    return result.concat([proceduresCustomNoReturn, proceduresCustomReturn]);
};

/**
 * Construct the blocks required by the flyout for the procedure category.
 * @param {!Blockly.Workspace} workspace The workspace containing procedures.
 * @return {!Array.<!Element>} Array of XML block elements.
 */
Blockly.Procedures.flyoutCategoryNew = function (workspace) {
    const xmlList = [];
    const utils = (Blockly.Xml.utils ? Blockly.Xml.utils : Blockly.utils.xml);
    if (Blockly.Blocks['procedures_defnoreturn']) {
        // <block type="procedures_defnoreturn" gap="16">
        //     <field name="NAME">do something</field>
        // </block>
        const block = utils.createElement('block');
        block.setAttribute('type', 'procedures_defnoreturn');
        block.setAttribute('gap', '16');
        const nameField = utils.createElement('field');
        nameField.setAttribute('name', 'NAME');
        nameField.appendChild(
            utils.createTextNode(Blockly.Msg['PROCEDURES_DEFNORETURN_PROCEDURE']));
        block.appendChild(nameField);
        xmlList.push(block);
    }
    if (Blockly.Blocks['procedures_defreturn']) {
        // <block type="procedures_defreturn" gap="16">
        //     <field name="NAME">do something</field>
        // </block>
        const block = utils.createElement('block');
        block.setAttribute('type', 'procedures_defreturn');
        block.setAttribute('gap', '16');
        const nameField = utils.createElement('field');
        nameField.setAttribute('name', 'NAME');
        nameField.appendChild(
            utils.createTextNode(Blockly.Msg['PROCEDURES_DEFRETURN_PROCEDURE']));
        block.appendChild(nameField);
        xmlList.push(block);
    }
    if (Blockly.Blocks['procedures_ifreturn']) {
        // <block type="procedures_ifreturn" gap="16"></block>
        const block = utils.createElement('block');
        block.setAttribute('type', 'procedures_ifreturn');
        block.setAttribute('gap', '16');

        xmlList.push(block);
    }
    if (Blockly.Blocks['procedures_defcustomnoreturn']) {
        // <block type="procedures_defcustomnoreturn" gap="16">
        //     <field name="NAME">do something</field>
        // </block>
        const block = utils.createElement('block');
        block.setAttribute('type', 'procedures_defcustomnoreturn');
        block.setAttribute('gap', '16');
        const nameField = utils.createElement('field');
        nameField.setAttribute('name', 'NAME');
        nameField.appendChild(utils.createTextNode(
            Blockly.Msg['PROCEDURES_DEFNORETURN_PROCEDURE']));
        block.appendChild(nameField);
        xmlList.push(block);
    }
    if (Blockly.Blocks['procedures_defcustomreturn']) {
        // <block type="procedures_defcustomreturn" gap="16">
        //     <field name="NAME">do something</field>
        // </block>
        const block = utils.createElement('block');
        block.setAttribute('type', 'procedures_defcustomreturn');
        block.setAttribute('gap', '16');
        const nameField = utils.createElement('field');
        nameField.setAttribute('name', 'NAME');
        nameField.appendChild(utils.createTextNode(
            Blockly.Msg['PROCEDURES_DEFRETURN_PROCEDURE']));
        block.appendChild(nameField);
        xmlList.push(block);
    }
    if (xmlList.length) {
        // Add slightly larger gap between system blocks and user calls.
        xmlList[xmlList.length - 1].setAttribute('gap', '24');
    }

    /**
     * Add items to xmlList for each listed procedure.
     *
     * @param procedureList A list of procedures, each of which is defined by a
     *     three-element list of name, parameter list, and return value boolean.
     * @param templateName The type of the block to generate.
     */
    function populateProcedures(procedureList, templateName) {
        const utils = (Blockly.Xml.utils ? Blockly.Xml.utils : Blockly.utils.xml);
        for (let i = 0; i < procedureList.length; i++) {
            const name = procedureList[i][0];
            const args = procedureList[i][1];
            // <block type="procedures_callnoreturn" gap="16">
            //   <mutation name="do something">
            //     <arg name="x"></arg>
            //   </mutation>
            // </block>
            const block = utils.createElement('block');
            block.setAttribute('type', templateName);
            block.setAttribute('gap', '16');
            const mutation = utils.createElement('mutation');
            mutation.setAttribute('name', name);
            block.appendChild(mutation);
            for (let j = 0; j < args.length; j++) {
                const arg = utils.createElement('arg');
                arg.setAttribute('name', args[j]);
                mutation.appendChild(arg);
            }
            xmlList.push(block);
        }
    }

    const tuple = Blockly.Procedures.allProceduresNew(workspace);
    populateProcedures(tuple[0], 'procedures_callnoreturn');
    populateProcedures(tuple[1], 'procedures_callreturn');
    populateProcedures(tuple[2], 'procedures_callcustomnoreturn');
    populateProcedures(tuple[3], 'procedures_callcustomreturn');

    return xmlList;
};

// ---------------------- patch for async functions ------------------------------
// taken from javascript/procedures.js https://github.com/google/blockly/blob/blockly-v10.1.3/generators/javascript/procedures.js
Blockly.JavaScript.forBlock['procedures_defreturn'] = function (block) {
    // Define a procedure with a return value.
    const funcName = Blockly.JavaScript.nameDB_.getName(
        block.getFieldValue('NAME'), Blockly.PROCEDURE_CATEGORY_NAME);
    let xfix1 = '';
    if (Blockly.JavaScript.STATEMENT_PREFIX) {
        xfix1 += Blockly.JavaScript.injectId(Blockly.JavaScript.STATEMENT_PREFIX, block);
    }
    if (Blockly.JavaScript.STATEMENT_SUFFIX) {
        xfix1 += Blockly.JavaScript.injectId(Blockly.JavaScript.STATEMENT_SUFFIX, block);
    }
    if (xfix1) {
        xfix1 = Blockly.JavaScript.prefixLines(xfix1, Blockly.JavaScript.INDENT);
    }
    let loopTrap = '';
    if (Blockly.JavaScript.INFINITE_LOOP_TRAP) {
        loopTrap = Blockly.JavaScript.prefixLines(
            Blockly.JavaScript.injectId(Blockly.JavaScript.INFINITE_LOOP_TRAP, block),
            Blockly.JavaScript.INDENT,
        );
    }
    const branch = Blockly.JavaScript.statementToCode(block, 'STACK');
    let returnValue = Blockly.JavaScript.valueToCode(block, 'RETURN', Blockly.JavaScript.ORDER_NONE) || '';
    let xfix2 = '';
    if (branch && returnValue) {
        // After executing the function body, revisit this block for the return.
        xfix2 = xfix1;
    }
    if (returnValue) {
        returnValue = Blockly.JavaScript.INDENT + 'return ' + returnValue + ';\n';
    }
    const args = [];
    const variables = block.getVars();
    for (let i = 0; i < variables.length; i++) {
        args[i] = Blockly.JavaScript.nameDB_.getName(variables[i], Blockly.VARIABLE_CATEGORY_NAME);
    }
    let code = 'async function ' + funcName + '(' + args.join(', ') + ') {\n' + xfix1 +
        loopTrap + branch + xfix2 + returnValue + '}';
    code = Blockly.JavaScript.scrub_(block, code);
    // Add % so as not to collide with helper functions in definitions list.
    Blockly.JavaScript.definitions_['%' + funcName] = code;
    return null;
};

Blockly.JavaScript.forBlock['procedures_defnoreturn'] = Blockly.JavaScript.forBlock['procedures_defreturn'];

Blockly.JavaScript.forBlock['procedures_callreturn'] = function (block) {
    // Call a procedure with a return value.
    const funcName = Blockly.JavaScript.nameDB_.getName(
        block.getFieldValue('NAME'), Blockly.PROCEDURE_CATEGORY_NAME);
    const args = [];
    const variables = block.getVars();
    for (let i = 0; i < variables.length; i++) {
        args[i] = Blockly.JavaScript.valueToCode(block, 'ARG' + i, Blockly.JavaScript.ORDER_NONE) || 'null';
    }
    const code = 'await ' + funcName + '(' + args.join(', ') + ')';
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

// ---------------------- custom function with return ------------------------------

Blockly.Blocks['procedures_defcustomreturn'] = {
    getProcedureModel() {
        return this.model;
    },
    isProcedureDef() {
        return true;
    },
    /**
     * Block for defining a procedure with a return value.
     * @this Blockly.Block
     */
    init: function () {
        const nameField = new Blockly.FieldTextInput('',
            Blockly.Procedures.rename);

        nameField.setSpellcheck(false);
        this.appendDummyInput()
        // .appendField(Blockly.Msg['PROCEDURES_DEFRETURN_TITLE'])
            .appendField(Blockly.Translate('procedures_defcustomreturn_name'))
            .appendField(nameField, 'NAME')
            .appendField('', 'PARAMS');
        /*this.appendValueInput('RETURN')
            .setAlign(Blockly.ALIGN_RIGHT)
            .appendField(Blockly.Msg['PROCEDURES_DEFRETURN_RETURN']);*/
        this.setMutator(new Blockly.icons.MutatorIcon(['procedures_mutatorarg'], this));
        if ((this.workspace.options.comments ||
            (this.workspace.options.parentWorkspace &&
                this.workspace.options.parentWorkspace.options.comments)) &&
            Blockly.Msg['PROCEDURES_DEFRETURN_COMMENT']) {
            this.setCommentText(Blockly.Msg['PROCEDURES_DEFRETURN_COMMENT']);
        }
        this.setStyle('procedure_blocks');
        this.setTooltip(Blockly.Msg['PROCEDURES_DEFRETURN_TOOLTIP']);
        this.setHelpUrl(Blockly.Msg['PROCEDURES_DEFRETURN_HELPURL']);
        this.arguments_ = [];
        this.argumentVarModels_ = [];
        this.setStatements_(true);
        this.statementConnection_ = null;

        this.appendDummyInput('SCRIPT')
            .appendField(new Blockly.FieldScript(btoa('return 0;')), 'SCRIPT');

        this.setInputsInline(true);
        this.setStatements_(false);
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
    decompose: function (workspace) {
        const containerBlock = workspace.newBlock('procedures_mutatorcontainer');
        containerBlock.initSvg();

        // Check/uncheck the allow statement box.
        /*
        if (this.getInput('RETURN')) {
            containerBlock.setFieldValue(
                this.hasStatements_ ? 'TRUE' : 'FALSE', 'STATEMENTS');
        } else {
            containerBlock.getInput('STATEMENT_INPUT').setVisible(false);
        }
        */
        containerBlock.getInput('STATEMENT_INPUT').setVisible(false);

        // Parameter list.
        let connection = containerBlock.getInput('STACK').connection;
        for (let i = 0; i < this.arguments_.length; i++) {
            const paramBlock = workspace.newBlock('procedures_mutatorarg');
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
    compose: function (containerBlock) {
        // Parameter list.
        this.arguments_ = [];
        this.paramIds_ = [];
        this.argumentVarModels_ = [];
        let paramBlock = containerBlock.getInputTargetBlock('STACK');
        while (paramBlock) {
            const varName = paramBlock.getFieldValue('NAME');
            this.arguments_.push(varName);
            const variable = this.workspace.getVariable(varName, '');
            if (variable != null) {
                this.argumentVarModels_.push(variable);
            } else {
                console.log('Failed to get variable named ' + varName + ', ignoring.');
            }

            this.paramIds_.push(paramBlock.id);
            paramBlock = paramBlock.nextConnection &&
                paramBlock.nextConnection.targetBlock();
        }
        this.updateParams_();
        Blockly.Procedures.mutateCallers(this);
        /*
        // Show/hide the statement input.
        let hasStatements = containerBlock.getFieldValue('STATEMENTS');
        if (hasStatements !== null) {
            hasStatements = hasStatements == 'TRUE';
            if (this.hasStatements_ != hasStatements) {
                if (hasStatements) {
                    this.setStatements_(true);
                    // Restore the stack, if one was saved.
                    Blockly.icons.MutatorIcon.reconnect(this.statementConnection_, this, 'STACK');
                    this.statementConnection_ = null;
                } else {
                    // Save the stack, then disconnect it.
                    const stackConnection = this.getInput('STACK').connection;
                    this.statementConnection_ = stackConnection.targetConnection;
                    if (this.statementConnection_) {
                        const stackBlock = stackConnection.targetBlock();
                        stackBlock.unplug();
                        stackBlock.bumpNeighbours_();
                    }
                    this.setStatements_(false);
                }
            }
        }
        */
    },
    /**
     * Return the signature of this procedure definition.
     * @return {!Array} Tuple containing three elements:
     *     - the name of the defined procedure,
     *     - a list of all its arguments,
     *     - that it DOES NOT have a return value.
     * @this Blockly.Block
     */
    getProcedureDef: function () {
        return [this.getFieldValue('NAME'), this.arguments_, true, true];
    },
    getVars: Blockly.Blocks['procedures_defreturn'].getVars,
    getVarModels: Blockly.Blocks['procedures_defreturn'].getVarModels,
    renameVarById: Blockly.Blocks['procedures_defreturn'].renameVarById,
    updateVarName: Blockly.Blocks['procedures_defreturn'].updateVarName,
    displayRenamedVar_: Blockly.Blocks['procedures_defreturn'].displayRenamedVar_,
    customContextMenu: Blockly.Blocks['procedures_defreturn'].customContextMenu,
    callType_: 'procedures_callcustomreturn'
};

Blockly.JavaScript.forBlock['procedures_defcustomreturn'] = function (block) {
    // Define a procedure with a return value.
    const funcName = Blockly.JavaScript.nameDB_.getName(
        block.getFieldValue('NAME'), Blockly.PROCEDURE_CATEGORY_NAME);

    const args = [];
    for (let i = 0; i < block.arguments_.length; i++) {
        args[i] = Blockly.JavaScript.nameDB_.getName(block.arguments_[i], Blockly.VARIABLE_CATEGORY_NAME);
    }

    const script = Blockly.b64DecodeUnicode(block.getFieldValue('SCRIPT') || '');
    const lines = script.split('\n');
    for (let l = 0; l < lines.length; l++) {
        lines[l] = '    ' + lines[l];
    }

    let code = 'async function ' + funcName + '(' + args.join(', ') + ') {\n' +
        lines.join('\n') + '\n}';

    code = Blockly.JavaScript.scrub_(block, code);
    // Add % so as not to collide with helper functions in definitions list.
    Blockly.JavaScript.definitions_['%' + funcName] = code;

    return null;
};

Blockly.Blocks['procedures_callcustomreturn'] = {
    init: Blockly.Blocks['procedures_callreturn'].init,
    getProcedureCall: Blockly.Blocks['procedures_callreturn'].getProcedureCall,
    renameProcedure: Blockly.Blocks['procedures_callreturn'].renameProcedure,
    setProcedureParameters_: Blockly.Blocks['procedures_callreturn'].setProcedureParameters_,
    updateShape_: Blockly.Blocks['procedures_callreturn'].updateShape_,
    mutationToDom: Blockly.Blocks['procedures_callreturn'].mutationToDom,
    domToMutation: Blockly.Blocks['procedures_callreturn'].domToMutation,
    getVars: Blockly.Blocks['procedures_callreturn'].getVars,
    getVarModels: Blockly.Blocks['procedures_callreturn'].getVarModels,
    onchange: Blockly.Blocks['procedures_callreturn'].onchange,
    customContextMenu: Blockly.Blocks['procedures_callreturn'].customContextMenu,
    defType_: 'procedures_defcustomreturn'
};

Blockly.JavaScript.forBlock['procedures_callcustomreturn'] = Blockly.JavaScript.forBlock['procedures_callreturn'];

// ---------------------- custom function with no return ------------------------------

Blockly.Blocks['procedures_defcustomnoreturn'] = {
    getProcedureModel() {
        return this.model;
    },
    isProcedureDef() {
        return true;
    },
    init: function () {
        const nameField = new Blockly.FieldTextInput('', Blockly.Procedures.rename);
        nameField.setSpellcheck(false);

        this.appendDummyInput()
            .appendField(Blockly.Translate('procedures_defcustomnoreturn_name'))
            .appendField(nameField, 'NAME')
            .appendField('', 'PARAMS');

        this.setMutator(new Blockly.icons.MutatorIcon(['procedures_mutatorarg'], this));

        if ((this.workspace.options.comments ||
            (this.workspace.options.parentWorkspace && this.workspace.options.parentWorkspace.options.comments)) &&
            Blockly.Msg['PROCEDURES_DEFNORETURN_COMMENT']) {
            this.setCommentText(Blockly.Msg['PROCEDURES_DEFNORETURN_COMMENT']);
        }

        this.setStyle('procedure_blocks');
        this.setColour(Blockly.Msg['PROCEDURES_HUE']);
        this.setTooltip(Blockly.Msg['PROCEDURES_DEFNORETURN_TOOLTIP']);
        this.setHelpUrl(Blockly.Msg['PROCEDURES_DEFNORETURN_HELPURL']);

        this.arguments_ = [];
        this.argumentVarModels_ = [];

        this.setStatements_(true);
        this.statementConnection_ = null;

        this.appendDummyInput('SCRIPT')
            .appendField(new Blockly.FieldScript(''), 'SCRIPT');

        this.setInputsInline(true);
        this.setStatements_(false);
    },
    setStatements_: Blockly.Blocks['procedures_defnoreturn'].setStatements_,
    updateParams_: Blockly.Blocks['procedures_defnoreturn'].updateParams_,
    mutationToDom: Blockly.Blocks['procedures_defnoreturn'].mutationToDom,
    domToMutation: Blockly.Blocks['procedures_defnoreturn'].domToMutation,
    decompose: Blockly.Blocks['procedures_defcustomreturn'].decompose,
    compose: Blockly.Blocks['procedures_defcustomreturn'].compose,
    getProcedureDef: function () {
        return [this.getFieldValue('NAME'), this.arguments_, false, true];
    },
    getVars: Blockly.Blocks['procedures_defnoreturn'].getVars,
    getVarModels: Blockly.Blocks['procedures_defnoreturn'].getVarModels,
    renameVarById: Blockly.Blocks['procedures_defnoreturn'].renameVarById,
    updateVarName: Blockly.Blocks['procedures_defnoreturn'].updateVarName,
    displayRenamedVar_: Blockly.Blocks['procedures_defnoreturn'].displayRenamedVar_,
    customContextMenu: Blockly.Blocks['procedures_defnoreturn'].customContextMenu,
    callType_: 'procedures_callcustomnoreturn'
};

Blockly.JavaScript.forBlock['procedures_defcustomnoreturn'] = Blockly.JavaScript.forBlock['procedures_defcustomreturn'];

Blockly.Blocks['procedures_callcustomnoreturn'] = {
    init: Blockly.Blocks['procedures_callnoreturn'].init,
    getProcedureCall:  Blockly.Blocks['procedures_callnoreturn'].getProcedureCall,
    renameProcedure: Blockly.Blocks['procedures_callnoreturn'].renameProcedure,
    setProcedureParameters_: Blockly.Blocks['procedures_callnoreturn'].setProcedureParameters_,
    updateShape_: Blockly.Blocks['procedures_callnoreturn'].updateShape_,
    mutationToDom: Blockly.Blocks['procedures_callnoreturn'].mutationToDom,
    domToMutation: Blockly.Blocks['procedures_callnoreturn'].domToMutation,
    getVars: Blockly.Blocks['procedures_callnoreturn'].getVars,
    getVarModels: Blockly.Blocks['procedures_callnoreturn'].getVarModels,
    onchange: Blockly.Blocks['procedures_callnoreturn'].onchange,
    customContextMenu: Blockly.Blocks['procedures_callnoreturn'].customContextMenu,
    defType_: 'procedures_defcustomnoreturn'
};

Blockly.JavaScript.forBlock['procedures_callcustomnoreturn'] = function (block) {
    // Call a procedure with no return value.
    // Generated code is for a function call as a statement is the same as a
    // function call as a value, with the addition of line ending.
    const tuple = Blockly.JavaScript.forBlock['procedures_callcustomreturn'](block);
    return tuple[0] + ';\n';
};