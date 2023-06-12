// Taken from here: https://groups.google.com/forum/#!topic/blockly/djhO2jUb0Xs
// I really tried to get the license conditions from authors, but no luck :(
// Many thanks to Florian Pechwitz <florian.Pechwitz@itizzimo.com> for the code

Blockly.System.blocks['logic_switch_case'] =
    '<block type="logic_switch_case">'
    + '     <value name="CONDITION">'
    + '     </value>'
    + '     <value name="CASECONDITION0">'
    + '     </value>'
    + '     <value name="CASE0">'
    + '     </value>'
    + '     <mutation with_statement="false" items="parameter1"></mutation>'
    + '</block>';

Blockly.Blocks['logic_switch_case'] = {
    init: function() {
        this.setColour(Blockly.Constants.Logic.HUE);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.appendValueInput('CONDITION')
            .appendField(Blockly.Translate('logic_switch_case_is'));
        this.appendValueInput('CASECONDITION0')
            .appendField(Blockly.Translate('logic_switch_case_of'));
        this.appendStatementInput('CASE0')
            .appendField(Blockly.Translate('logic_switch_do'));
        this.setMutator(new Blockly.Mutator(['case_incaseof', 'case_default']));
        this.setTooltip(Blockly.Translate('logic_switch_tootltip'));
        this.caseCount_ = 0;
        this.defaultCount_ = 0;
    },

    mutationToDom: function () {
        if (!this.caseCount_ && !this.defaultCount_) {
            return null;
        }

        var container = document.createElement('mutation');

        if (this.caseCount_) {
            container.setAttribute('case', this.caseCount_);
        }

        if (this.defaultCount_) {
            container.setAttribute('default', 1);
        }
        return container;
    },

    domToMutation: function(xmlElement) {
        this.caseCount_    = parseInt(xmlElement.getAttribute('case'), 10);
        this.defaultCount_ = parseInt(xmlElement.getAttribute('default'), 10);

        for (var x = 1; x <= this.caseCount_; x++) {
            this.appendValueInput('CASECONDITION' + x)
                .appendField(Blockly.Translate('logic_switch_case_of'));
            this.appendStatementInput('CASE' + x)
                .appendField(Blockly.Translate('logic_switch_do'));
        }

        if (this.defaultCount_) {
            this.appendStatementInput('ONDEFAULT')
                .appendField('default');
        }
    },

    decompose: function(workspace) {
        var containerBlock = workspace.newBlock('control_case');//Blockly.Block.obtain(workspace, 'control_case');
        containerBlock.initSvg();

        var connection = containerBlock.getInput('STACK').connection;

        for (var x = 1; x <= this.caseCount_; x++) {
            var caseBlock = workspace.newBlock('case_incaseof');//Blockly.Block.obtain(workspace, 'case_incaseof');
            caseBlock.initSvg();
            connection.connect(caseBlock.previousConnection);
            connection = caseBlock.nextConnection;
        }

        if (this.defaultCount_) {
            var defaultBlock = workspace.newBlock('case_default');//Blockly.Block.obtain(workspace, 'case_default');
            defaultBlock.initSvg();
            connection.connect(defaultBlock.previousConnection);
        }

        return containerBlock;
    },

    compose: function(containerBlock) {
        //Disconnect all input blocks and remove all inputs.
        if (this.defaultCount_) {
            this.removeInput('ONDEFAULT');
        }

        this.defaultCount_ = 0;

        for (var x = this.caseCount_; x > 0; x--) {
            this.removeInput('CASECONDITION' + x);
            this.removeInput('CASE' + x);
        }

        this.caseCount_ = 0;

        var caseBlock = containerBlock.getInputTargetBlock('STACK');

        while (caseBlock) {
            switch(caseBlock.type) {
                case 'case_incaseof':
                    this.caseCount_++;
                    var caseconditionInput = this.appendValueInput('CASECONDITION' + this.caseCount_)
                        .appendField(Blockly.Translate('logic_switch_case_of'));

                    var caseInput = this.appendStatementInput('CASE' + this.caseCount_)
                        .appendField(Blockly.Translate('logic_switch_do'));

                    if (caseBlock.valueConnection_) {
                        caseconditionInput.connection.connect(caseBlock.valueConnection_);
                    }

                    if (caseBlock.statementConnection_) {
                        caseInput.connection.connect(caseBlock.statementConnection_);
                    }
                    break;

                case 'case_default':
                    this.defaultCount_++;
                    var defaultInput = this.appendStatementInput('ONDEFAULT')
                        .appendField('default');

                    if (caseBlock.statementConnection_) {
                        defaultInput.connection.connect(caseBlock.statementConnection_);
                    }
                    break;

                default:
                    throw 'Unknown block type.';
            }

            caseBlock = caseBlock.nextConnection && caseBlock.nextConnection.targetBlock();
        }
    },

    saveConnections: function(containerBlock) {
        var caseBlock = containerBlock.getInputTargetBlock('STACK');
        var x = 1;
        while (caseBlock) {
            switch (caseBlock.type) {
                case'case_incaseof':
                    var caseconditionInput = this.getInput('CASECONDITION' + x);
                    var caseInput = this.getInput('CASE' + x);
                    caseBlock.valueConnection_ = caseconditionInput && caseconditionInput.connection.targetConnection;
                    caseBlock.statementConnection_ = caseInput && caseInput.connection.targetConnection;
                    x++;
                    break;
                case'case_default':
                    var defaultInput = this.getInput('ONDEFAULT');
                    caseBlock.satementConnection_ = defaultInput && defaultInput.connection.targetConnection;
                    break;
                default:
                    throw 'Unknown block type';
            }
            caseBlock = caseBlock.nextConnection &&
                caseBlock.nextConnection.targetBlock();
        }
    }
};

Blockly.Blocks['control_case'] = {
    init: function() {
        this.setColour(180);
        this.appendDummyInput()
            .appendField(Blockly.Translate('logic_switch_case_is'));
        this.appendStatementInput('STACK');
        this.setTooltip(Blockly.Translate('logic_switch_control_case_tootltip'));
        this.contextMenu = false;
    }
};

Blockly.Blocks['case_incaseof'] = {
    init: function() {
        this.setColour(180);
        this.appendDummyInput()
            .appendField(Blockly.Translate('logic_switch_case_of'));
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setTooltip(Blockly.Translate('logic_switch_case_incaseof_tootltip'));
        this.contextMenu = false;
    }
};

Blockly.Blocks['case_default'] = {
    init: function() {
        this.setColour(180);
        this.appendDummyInput()
            .appendField('default');
        this.setPreviousStatement(true);
        this.setNextStatement(false);
        this.setTooltip(Blockly.Translate('logic_switch_default_tootltip'));
        this.contextMenu = false;
    }
};

Blockly.JavaScript['logic_switch_case'] = function (block) {
    var code = '';
    var do_n;
    var case_n;
    var switchVariable = Blockly.JavaScript.valueToCode(block, 'CONDITION', Blockly.JavaScript.ORDER_NONE) || null;

    if (switchVariable){
        var pattern = /^\(?([._$\d\w"?: \(\)])*\)?$/g;

        if (pattern.test(switchVariable)) { // Check to see if the switch is a kind of variable type
            code = '\nswitch (' + switchVariable + ') {\n';
            var case_0 = Blockly.JavaScript.valueToCode(block, 'CASECONDITION0', Blockly.JavaScript.ORDER_NONE) || null;
            var do_0 = Blockly.JavaScript.statementToCode(block, 'CASE0');
            code += '\tcase ' + case_0 + ':\n' + do_0 + '\n\t\tbreak;\n';

            for (var n = 1; n <= block.caseCount_; n++) {
                case_n = Blockly.JavaScript.valueToCode(block, 'CASECONDITION' + n,
                    Blockly.JavaScript.ORDER_NONE) || null;

                if (case_n) {
                    do_n = Blockly.JavaScript.statementToCode(block, 'CASE' + n);
                    code += '\tcase ' + case_n + ':\n' + do_n + '\n\t\tbreak;\n';
                }
            }

            if (block.defaultCount_) {
                do_n = Blockly.JavaScript.statementToCode(block, 'ONDEFAULT');
                code += '\tdefault:\n' + do_n + '\n\t\tbreak;\n';
            }

            code += '}\n';
        } else {
            alert('logic_switch_case: ' + switchVariable + ' is not a variable name');
        }
    }
    return code;
};
