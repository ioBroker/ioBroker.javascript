'use strict';

if (typeof goog !== 'undefined') {
    goog.provide('Blockly.JavaScript.Timeouts');

    goog.require('Blockly.JavaScript');
} else {
    // define this object for blockly modules from adapters
    window.goog = {
        provide: function () {},
        require: function () {},
    };
}

Blockly.CustomBlocks = Blockly.CustomBlocks || [];
Blockly.CustomBlocks.push('Timeouts');

Blockly.Timeouts = {
    HUE: 70,
    blocks: {},
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
        const r = name.match(/^(.*?)(\d+)$/);
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
    const blocks = workspace.getAllBlocks();
    // Iterate through every block and check the name.
    for (let i = 0; i < blocks.length; i++) {
        if (blocks[i] == opt_exclude) {
            continue;
        }
        if (blocks[i].isTimeout_ || blocks[i].isInterval_) {
            const blockName = blocks[i].getFieldValue('NAME');
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
    '<block type="timeouts_wait">' +
    '  <field name="DELAY">1000</field>' +
    '  <field name="UNIT">ms</field>' +
    '</block>';

Blockly.Blocks['timeouts_wait'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(Blockly.Translate('timeouts_wait'))
            .appendField(new Blockly.FieldTextInput(1000), "DELAY")
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('timeouts_settimeout_ms'), 'ms'],
                [Blockly.Translate('timeouts_settimeout_sec'), 'sec'],
                [Blockly.Translate('timeouts_settimeout_min'), 'min'],
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

Blockly.JavaScript.forBlock['timeouts_wait'] = function(block) {
    const unit = block.getFieldValue('UNIT');

    let delay = block.getFieldValue('DELAY');
    if (unit === 'min') {
        delay *= 60000;
    } else if (unit === 'sec') {
        delay *= 1000;
    }

    return `await wait(${delay});\n`;
};

// --- setTimeout -----------------------------------------------------------
Blockly.Timeouts.blocks['timeouts_settimeout'] =
    '<block type="timeouts_settimeout">' +
    '  <field name="NAME">timeout</field>' +
    '  <field name="DELAY">1000</field>' +
    '  <field name="UNIT">ms</field>' +
    '</block>';

Blockly.Blocks['timeouts_settimeout'] = {
    init: function() {
        const nameField = new Blockly.FieldTextInput(Blockly.Timeouts.findLegalName('timeout', this), Blockly.Timeouts.rename);

        nameField.setSpellcheck(false);

        this.appendDummyInput()
            .appendField(Blockly.Translate('timeouts_settimeout'))
            .appendField(nameField, 'NAME')
            .appendField(Blockly.Translate('timeouts_settimeout_in'))
            .appendField(new Blockly.FieldTextInput(1000), 'DELAY')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('timeouts_settimeout_ms'), 'ms'],
                [Blockly.Translate('timeouts_settimeout_sec'), 'sec'],
                [Blockly.Translate('timeouts_settimeout_min'), 'min'],
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
        const name = this.getFieldValue('NAME');
        return [{ getId: () => { return name; }, name: name, type: 'timeout' }];
    },
};

Blockly.JavaScript.forBlock['timeouts_settimeout'] = function(block) {
    const name = Blockly.JavaScript.variableDB_.safeName_(block.getFieldValue('NAME'));
    const unit = block.getFieldValue('UNIT');

    let delay = block.getFieldValue('DELAY');
    if (unit === 'min') {
        delay *= 60000;
    } else if (unit === 'sec') {
        delay *= 1000;
    }

    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');
    return `${name} = setTimeout(async () => {\n` +
        Blockly.JavaScript.prefixLines(`${name} = null;`, Blockly.JavaScript.INDENT) + '\n' +
        statement +
        `}, ${delay});\n`;
};

// --- setTimeout variable -----------------------------------------------------------
Blockly.Timeouts.blocks['timeouts_settimeout_variable'] =
    '<block type="timeouts_settimeout_variable">' +
    '  <value name="DELAY_MS">' +
    '    <shadow type="math_number">' +
    '      <field name="NUM">1000</field>' +
    '    </shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['timeouts_settimeout_variable'] = {
    init: function() {
        const nameField = new Blockly.FieldTextInput(Blockly.Timeouts.findLegalName('timeout', this), Blockly.Timeouts.rename);

        nameField.setSpellcheck(false);

        this.appendDummyInput()
            .appendField(Blockly.Translate('timeouts_settimeout'))
            .appendField(nameField, 'NAME')
            .appendField(Blockly.Translate('timeouts_settimeout_in'));

        this.appendValueInput('DELAY_MS')
            .setCheck('Number')
            .appendField(Blockly.Translate('timeouts_settimeout_ms'));

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setInputsInline(true);
        this.setColour(Blockly.Timeouts.HUE);
        this.setTooltip(Blockly.Translate('timeouts_settimeout_tooltip'));
        this.setHelpUrl(getHelp('timeouts_settimeout_help'));
    },
    isTimeout_: true,
    getVars: function () {
        return [this.getFieldValue('NAME')];
    },
    getVarModels: function () {
        const name = this.getFieldValue('NAME');
        return [{ getId: () => { return name; }, name: name, type: 'timeout' }];
    },
};

Blockly.JavaScript.forBlock['timeouts_settimeout_variable'] = function(block) {
    const delay = Blockly.JavaScript.valueToCode(block, 'DELAY_MS', Blockly.JavaScript.ORDER_ATOMIC);
    const name = Blockly.JavaScript.variableDB_.safeName_(block.getFieldValue('NAME'));
    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    return `${name} = setTimeout(async () => {\n` +
        Blockly.JavaScript.prefixLines(`${name} = null;`, Blockly.JavaScript.INDENT) + '\n' +
        statement +
        `}, parseInt(${delay}));\n`;
};

// --- clearTimeout -----------------------------------------------------------
Blockly.Timeouts.getAllTimeouts = function (workspace) {
    const blocks = workspace.getAllBlocks();
    const result = [];

    // Iterate through every block and check the name.
    for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].isTimeout_) {
            result.push([blocks[i].getFieldValue('NAME'), blocks[i].getFieldValue('NAME')]);
        }
    }

    // BF(2020.05.16) : for back compatibility. Remove it after 5 years
    if (window.scripts.loading) {
        const variables = workspace.getVariablesOfType('');
        variables.forEach(v => !result.find(it => it[0] === v.name) && result.push([v.name, v.name]));
    }

    const variables1 = workspace.getVariablesOfType('timeout');
    variables1.forEach(v => !result.find(it => it[0] === v.name) && result.push([v.name, v.name]));

    !result.length && result.push(['', '']);

    return result;
};

Blockly.Timeouts.blocks['timeouts_cleartimeout'] =
    '<block type="timeouts_cleartimeout">' +
    '  <field name="NAME"></field>' +
    '</block>';

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
    },
};

Blockly.JavaScript.forBlock['timeouts_cleartimeout'] = function(block) {
    const name = Blockly.JavaScript.variableDB_.safeName_(block.getFieldValue('NAME'));
    return `(() => { if (${name}) { clearTimeout(${name}); ${name} = null; }})();\n`;
};

// --- getTimeout -----------------------------------------------------------
Blockly.Timeouts.blocks['timeouts_gettimeout'] =
    '<block type="timeouts_gettimeout">' +
    '  <field name="NAME"></field>' +
    '</block>';

Blockly.Blocks['timeouts_gettimeout'] = {
    init: function() {
        this.appendDummyInput('NAME')
            .appendField(Blockly.Translate('timeouts_gettimeout'))
            .appendField(new Blockly.FieldDropdown(function () {
                return window.scripts.blocklyWorkspace ? Blockly.Timeouts.getAllTimeouts(window.scripts.blocklyWorkspace) : [];
            }), 'NAME');

        this.setInputsInline(true);
        this.setOutput(true);
        this.setColour(Blockly.Timeouts.HUE);
        this.setTooltip(Blockly.Translate('timeouts_gettimeout_tooltip'));
        this.setHelpUrl(getHelp('timeouts_gettimeout_help'));
    },
};

Blockly.JavaScript.forBlock['timeouts_gettimeout'] = function(block) {
    const name = Blockly.JavaScript.variableDB_.safeName_(block.getFieldValue('NAME'));

    return [name, Blockly.JavaScript.ORDER_ATOMIC];
};

// --- setInterval -----------------------------------------------------------
Blockly.Timeouts.blocks['timeouts_setinterval'] =
    '<block type="timeouts_setinterval">' +
    '  <field name="INTERVAL">1000</field>' +
    '  <field name="UNIT">ms</field>' +
    '</block>';

Blockly.Blocks['timeouts_setinterval'] = {
    init: function() {
        const nameField = new Blockly.FieldTextInput(Blockly.Timeouts.findLegalName(Blockly.Translate('timeouts_setinterval_name'), this), Blockly.Timeouts.rename);

        nameField.setSpellcheck(false);

        this.appendDummyInput()
            .appendField(Blockly.Translate('timeouts_setinterval'))
            .appendField(nameField, 'NAME')
            .appendField(Blockly.Translate('timeouts_setinterval_in'))
            .appendField(new Blockly.FieldTextInput(1000), 'INTERVAL')
            .appendField(new Blockly.FieldDropdown([
                [Blockly.Translate('timeouts_settimeout_ms'), 'ms'],
                [Blockly.Translate('timeouts_settimeout_sec'), 'sec'],
                [Blockly.Translate('timeouts_settimeout_min'), 'min'],
            ]), 'UNIT');
            //.appendField(Blockly.Translate('timeouts_setinterval_ms'));

        this.appendStatementInput('STATEMENT')
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
        const name = this.getFieldValue('NAME');
        return [{ getId: () => { return name; }, name: name, type: 'interval' }];
    },
};

Blockly.JavaScript.forBlock['timeouts_setinterval'] = function(block) {
    const name = Blockly.JavaScript.variableDB_.safeName_(block.getFieldValue('NAME'));
    const unit = block.getFieldValue('UNIT');

    let delay = block.getFieldValue('INTERVAL');
    if (unit === 'min') {
        delay *= 60000;
    } else if (unit === 'sec') {
        delay *= 1000;
    }

    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');
    return `${name} = setInterval(async () => {\n` +
        statement +
        `}, ${delay});\n`;
};

// --- setInterval variable -----------------------------------------------------------
Blockly.Timeouts.blocks['timeouts_setinterval_variable'] =
    '<block type="timeouts_setinterval_variable">' +
    '  <value name="INTERVAL_MS">' +
    '    <shadow type="math_number">' +
    '      <field name="NUM">1000</field>' +
    '    </shadow>' +
    '  </value>' +
    '</block>';

Blockly.Blocks['timeouts_setinterval_variable'] = {
    init: function() {
        const nameField = new Blockly.FieldTextInput(
            Blockly.Timeouts.findLegalName(Blockly.Translate('timeouts_setinterval_name'), this),
            Blockly.Timeouts.rename);

        nameField.setSpellcheck(false);

        this.appendDummyInput()
            .appendField(Blockly.Translate('timeouts_setinterval'))
            .appendField(nameField, 'NAME')
            .appendField(Blockly.Translate('timeouts_setinterval_in'));

        this.appendValueInput('INTERVAL_MS')
            .setCheck('Number')
            .appendField(Blockly.Translate('timeouts_settimeout_ms'));

        this.appendStatementInput('STATEMENT')
            .setCheck(null);

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setInputsInline(true);
        this.setColour(Blockly.Timeouts.HUE);
        this.setTooltip(Blockly.Translate('timeouts_setinterval_tooltip'));
        this.setHelpUrl(getHelp('timeouts_setinterval_help'));
    },
    isInterval_: true,
    getVars: function () {
        return [this.getFieldValue('NAME')];
    },
    getVarModels: function () {
        const name = this.getFieldValue('NAME');
        return [{ getId: () => { return name; }, name: name, type: 'interval' }];
    },
};

Blockly.JavaScript.forBlock['timeouts_setinterval_variable'] = function(block) {
    const delay = Blockly.JavaScript.valueToCode(block, 'INTERVAL_MS', Blockly.JavaScript.ORDER_ATOMIC);
    const name = Blockly.JavaScript.variableDB_.safeName_(block.getFieldValue('NAME'));
    const statement = Blockly.JavaScript.statementToCode(block, 'STATEMENT');

    return `${name} = setInterval(async () => {\n` +
        statement +
        `}, parseInt(${delay}));\n`;
};

// --- clearInterval -----------------------------------------------------------
Blockly.Timeouts.blocks['timeouts_clearinterval'] =
    '<block type="timeouts_clearinterval">' +
    '  <field name="NAME"></field>' +
    '</block>';

Blockly.Timeouts.getAllIntervals = function (workspace) {
    const blocks = workspace.getAllBlocks();
    const result = [];

    // Iterate through every block and check the name.
    for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].isInterval_) {
            result.push([blocks[i].getFieldValue('NAME'), blocks[i].getFieldValue('NAME')]);
        }
    }

    // BF(2020.05.16) : for back compatibility. Remove it after 5 years
    if (window.scripts.loading) {
        const variables = workspace.getVariablesOfType('');
        variables.forEach(v => !result.find(it => it[0] === v.name) && result.push([v.name, v.name]));
    }

    const variables1 = workspace.getVariablesOfType('interval');
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
    },
};

Blockly.JavaScript.forBlock['timeouts_clearinterval'] = function(block) {
    const name = Blockly.JavaScript.variableDB_.safeName_(block.getFieldValue('NAME'));

    return `(() => { if (${name}) { clearInterval(${name}); ${name} = null; }})();\n`;
};

// --- getInterval -----------------------------------------------------------
Blockly.Timeouts.blocks['timeouts_getinterval'] =
    '<block type="timeouts_getinterval">' +
    '  <field name="NAME"></field>' +
    '</block>';

Blockly.Blocks['timeouts_getinterval'] = {
    init: function() {
        this.appendDummyInput("NAME")
            .appendField(Blockly.Translate('timeouts_getinterval'))
            .appendField(new Blockly.FieldDropdown(function () {
                return window.scripts.blocklyWorkspace ? Blockly.Timeouts.getAllIntervals(window.scripts.blocklyWorkspace) : [];
            }), "NAME");

        this.setInputsInline(true);
        this.setOutput(true);
        this.setColour(Blockly.Timeouts.HUE);
        this.setTooltip(Blockly.Translate('timeouts_getinterval_tooltip'));
        this.setHelpUrl(getHelp('timeouts_getinterval_help'));
    },
};

Blockly.JavaScript.forBlock['timeouts_getinterval'] = function(block) {
    const name = Blockly.JavaScript.variableDB_.safeName_(block.getFieldValue('NAME'));

    return [name, Blockly.JavaScript.ORDER_ATOMIC];
};
