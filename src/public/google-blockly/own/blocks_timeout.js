'use strict';

if (typeof goog !== 'undefined') {
    goog.provide('Blockly.JavaScript.Timeouts');

    goog.require('Blockly.JavaScript');
} else {
    // define this object for blockly modules from adapters
    window.goog = {
        provide: function () {},
        require: function () {},
    }
}

Blockly.CustomBlocks = Blockly.CustomBlocks || [];
Blockly.CustomBlocks.push('Timeouts');

Blockly.Timeouts = {
    HUE: 70,
    blocks: {}
};

/**
 * Ensure two identically-named procedures don't exist.
 * @param {string} name Proposed procedure name.
 * @param {!Blockly.Block} block Block to disambiguate.
 * @return {string} Non-colliding name.
 */
Blockly.Timeouts.findLegalName = function(name, block) {
    if (block.isInFlyout) {
        // Flyouts can have multiple procedures called 'do something'.
        return name;
    }
    while (!Blockly.Timeouts.isLegalName_(name, block.workspace, block)) {
        // Collision with another procedure.
        var r = name.match(/^(.*?)(\d+)$/);
        if (!r) {
            name += '2';
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
Blockly.Timeouts.isLegalName_ = function(name, workspace, opt_exclude) {
    var blocks = workspace.getAllBlocks();
    // Iterate through every block and check the name.
    for (var i = 0; i < blocks.length; i++) {
        if (blocks[i] == opt_exclude) {
            continue;
        }
        if (blocks[i].isTimeout_ || blocks[i].isInterval_) {
            var blockName = blocks[i].getFieldValue('NAME');
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
Blockly.Timeouts.rename = function (name) {
    // Strip leading and trailing whitespace.  Beyond this, all names are legal.
    name = name.replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');
    return Blockly.Timeouts.findLegalName(name, this.sourceBlock_);
};

// --- setTimeout -----------------------------------------------------------
Blockly.Timeouts.blocks['timeouts_wait'] =
    '<block type="timeouts_wait">'
    + '     <value name="DELAY">'
    + '     </value>'
    + '     <value name="UNIT">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['timeouts_wait'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(Blockly.Translate('timeouts_wait'))
            .appendField(new Blockly.FieldTextInput(1000), "DELAY")
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('timeouts_settimeout_ms'), 'ms'],
                [Blockly.Translate('timeouts_settimeout_sec'), 'sec'],
                [Blockly.Translate('timeouts_settimeout_min'), 'min']
            ]), 'UNIT');
            //.appendField(Blockly.Translate('timeouts_settimeout_ms'));

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setInputsInline(true);
        this.setColour(Blockly.Timeouts.HUE);
        this.setTooltip(Blockly.Translate('timeouts_wait_tooltip'));
        this.setHelpUrl(getHelp('timeouts_wait_help'));
    },
};

Blockly.JavaScript['timeouts_wait'] = function(block) {
    var delay = block.getFieldValue('DELAY');
    var unit  = block.getFieldValue('UNIT');
    if (unit === 'min') {
        delay *= 60000;
    } else if (unit === 'sec') {
        delay *= 1000;
    }
    return 'await wait(' + delay + ');\n';
};

// --- setTimeout -----------------------------------------------------------
Blockly.Timeouts.blocks['timeouts_settimeout'] =
    '<block type="timeouts_settimeout">'
    + '     <value name="NAME">'
    + '     </value>'
    + '     <value name="DELAY">'
    + '     </value>'
    + '     <value name="UNIT">'
    + '     </value>'
    + '     <value name="STATEMENT">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['timeouts_settimeout'] = {
    init: function() {
        var nameField = new Blockly.FieldTextInput(
            Blockly.Timeouts.findLegalName('timeout', this),
            Blockly.Timeouts.rename);

        nameField.setSpellcheck(false);

        this.appendDummyInput()
            .appendField(Blockly.Translate('timeouts_settimeout'))
            .appendField(nameField, 'NAME')
            .appendField(Blockly.Translate('timeouts_settimeout_in'))
            .appendField(new Blockly.FieldTextInput(1000), "DELAY")
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('timeouts_settimeout_ms'), 'ms'],
                [Blockly.Translate('timeouts_settimeout_sec'), 'sec'],
                [Blockly.Translate('timeouts_settimeout_min'), 'min']
            ]), 'UNIT');
            //.appendField(Blockly.Translate('timeouts_settimeout_ms'));

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setInputsInline(false);
        this.setColour(Blockly.Timeouts.HUE);
        this.setTooltip(Blockly.Translate('timeouts_settimeout_tooltip'));
        this.setHelpUrl(getHelp('timeouts_settimeout_help'));
    },
    isTimeout_: true,
    getVars: function () {
        return [this.getFieldValue('NAME')];
    },
    getVarModels: function () {
        var name = this.getFieldValue('NAME');
        return [{getId: function () {return name;}, name: name, type: 'timeout'}];
    }
};

Blockly.JavaScript['timeouts_settimeout'] = function(block) {
    var delay = block.getFieldValue('DELAY');
    var name  = Blockly.JavaScript.variableDB_.safeName_(block.getFieldValue('NAME'));
    var unit  = block.getFieldValue('UNIT');
    if (unit === 'min') {
        delay *= 60000;
    } else if (unit === 'sec') {
        delay *= 1000;
    }
    var statements_name = Blockly.JavaScript.statementToCode(block, 'STATEMENT');
    return name + ' = setTimeout(async function () {\n' + statements_name + '}, ' + delay + ');\n';
};

// --- clearTimeout -----------------------------------------------------------
Blockly.Timeouts.getAllTimeouts = function (workspace) {
    var blocks = workspace.getAllBlocks();
    var result = [];

    // Iterate through every block and check the name.
    for (var i = 0; i < blocks.length; i++) {
        if (blocks[i].isTimeout_) {
            result.push([blocks[i].getFieldValue('NAME'), blocks[i].getFieldValue('NAME')]);
        }
    }

    // BF(2020.05.16) : for back compatibility. Remove it after 5 years
    if (window.scripts.loading) {
        var variables = workspace.getVariablesOfType('');
        variables.forEach(v => !result.find(it => it[0] === v.name) && result.push([v.name, v.name]));
    }

    var variables1 = workspace.getVariablesOfType('timeout');
    variables1.forEach(v => !result.find(it => it[0] === v.name) && result.push([v.name, v.name]));

    !result.length && result.push(['', '']);

    return result;
};

Blockly.Timeouts.blocks['timeouts_cleartimeout'] =
    '<block type="timeouts_cleartimeout">'
    + '     <value name="NAME">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['timeouts_cleartimeout'] = {
    init: function() {
        this.appendDummyInput('NAME')
            .appendField(Blockly.Translate('timeouts_cleartimeout'))
            .appendField(new Blockly.FieldDropdown(function () {
                return window.scripts && window.scripts.blocklyWorkspace ? Blockly.Timeouts.getAllTimeouts(window.scripts.blocklyWorkspace) : [];
            }), 'NAME');

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setInputsInline(true);
        this.setColour(Blockly.Timeouts.HUE);
        this.setTooltip(Blockly.Translate('timeouts_cleartimeout_tooltip'));
        this.setHelpUrl(getHelp('timeouts_cleartimeout_help'));
    }
};

Blockly.JavaScript['timeouts_cleartimeout'] = function(block) {
    var name = Blockly.JavaScript.variableDB_.safeName_(block.getFieldValue('NAME'));
    return '(function () {if (' + name + ') {clearTimeout(' + name + '); ' + name + ' = null;}})();\n';
};

// --- setInterval -----------------------------------------------------------
Blockly.Timeouts.blocks['timeouts_setinterval'] =
    '<block type="timeouts_setinterval">'
    + '     <value name="NAME">'
    + '     </value>'
    + '     <value name="INTERVAL">'
    + '     </value>'
    + '     <value name="UNIT">'
    + '     </value>'
    + '     <value name="STATEMENT">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['timeouts_setinterval'] = {
    init: function() {
        var nameField = new Blockly.FieldTextInput(
            Blockly.Timeouts.findLegalName(Blockly.Translate('timeouts_setinterval_name'), this),
            Blockly.Timeouts.rename);

        nameField.setSpellcheck(false);

        this.appendDummyInput()
            .appendField(Blockly.Translate('timeouts_setinterval'))
            .appendField(nameField, 'NAME')
            .appendField(Blockly.Translate('timeouts_setinterval_in'))
            .appendField(new Blockly.FieldTextInput(1000), "INTERVAL")
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('timeouts_settimeout_ms'), 'ms'],
                [Blockly.Translate('timeouts_settimeout_sec'), 'sec'],
                [Blockly.Translate('timeouts_settimeout_min'), 'min']
            ]), 'UNIT');
            //.appendField(Blockly.Translate('timeouts_setinterval_ms'));

        this.appendStatementInput("STATEMENT")
            .setCheck(null);

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setInputsInline(false);
        this.setColour(Blockly.Timeouts.HUE);
        this.setTooltip(Blockly.Translate('timeouts_setinterval_tooltip'));
        this.setHelpUrl(getHelp('timeouts_setinterval_help'));
    },
    isInterval_: true,
    getVars: function () {
        return [this.getFieldValue('NAME')];
    },
    getVarModels: function () {
        var name = this.getFieldValue('NAME');
        return [{getId: function () {return name;}, name: name, type: 'interval'}];
    }
};

Blockly.JavaScript['timeouts_setinterval'] = function(block) {
    var delay = block.getFieldValue('INTERVAL');
    var name  = Blockly.JavaScript.variableDB_.safeName_(block.getFieldValue('NAME'));
    var unit  = block.getFieldValue('UNIT');
    if (unit === 'min') {
        delay *= 60000;
    } else if (unit === 'sec') {
        delay *= 1000;
    }

    var statements_name = Blockly.JavaScript.statementToCode(block, 'STATEMENT');
    return name + ' = setInterval(async function () {\n' + statements_name + '}, ' + delay + ');\n';
};

// --- clearInterval -----------------------------------------------------------
Blockly.Timeouts.blocks['timeouts_clearinterval'] =
    '<block type="timeouts_clearinterval">'
    + '     <value name="NAME">'
    + '     </value>'
    + '</block>';

Blockly.Timeouts.getAllIntervals = function (workspace) {
    var blocks = workspace.getAllBlocks();
    var result = [];

    // Iterate through every block and check the name.
    for (var i = 0; i < blocks.length; i++) {
        if (blocks[i].isInterval_) {
            result.push([blocks[i].getFieldValue('NAME'), blocks[i].getFieldValue('NAME')]);
        }
    }

    // BF(2020.05.16) : for back compatibility. Remove it after 5 years
    if (window.scripts.loading) {
        var variables = workspace.getVariablesOfType('');
        variables.forEach(v => !result.find(it => it[0] === v.name) && result.push([v.name, v.name]));
    }

    var variables1 = workspace.getVariablesOfType('interval');
    variables1.forEach(v => !result.find(it => it[0] === v.name) && result.push([v.name, v.name]));

    !result.length && result.push(['', '']);

    return result;
};

Blockly.Blocks['timeouts_clearinterval'] = {
    init: function() {
        this.appendDummyInput("NAME")
            .appendField(Blockly.Translate('timeouts_clearinterval'))
            .appendField(new Blockly.FieldDropdown(function () {
                return window.scripts.blocklyWorkspace ? Blockly.Timeouts.getAllIntervals(window.scripts.blocklyWorkspace) : [];
            }), "NAME");

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setInputsInline(true);
        this.setColour(Blockly.Timeouts.HUE);
        this.setTooltip(Blockly.Translate('timeouts_clearinterval_tooltip'));
        this.setHelpUrl(getHelp('timeouts_clearinterval_help'));
    }
};

Blockly.JavaScript['timeouts_clearinterval'] = function(block) {
    var name = Blockly.JavaScript.variableDB_.safeName_(block.getFieldValue('NAME'));

    return '(function () {if (' + name + ') {clearInterval(' + name + '); ' + name + ' = null;}})();\n';
};