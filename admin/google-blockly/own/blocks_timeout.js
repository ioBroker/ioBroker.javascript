'use strict';

goog.provide('Blockly.JavaScript.Timeouts');

goog.require('Blockly.JavaScript');

Blockly.CustomBlocks = Blockly.CustomBlocks || [];
Blockly.CustomBlocks.push('Timeouts');

Blockly.Words = Blockly.Words || {};
Blockly.Words['Timeouts'] = {'en': 'Timeouts', 'de': 'Timeouts', 'ru': 'Timeouts'};

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
Blockly.Timeouts.rename = function(name) {
    // Strip leading and trailing whitespace.  Beyond this, all names are legal.
    name = name.replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');
    return Blockly.Timeouts.findLegalName(name, this.sourceBlock_);
};

// --- setTimeout -----------------------------------------------------------
Blockly.Words['timeouts_settimeout']          = {'en': 'Execution',                         'de': 'Ausführen',                  'ru': 'Выполнить'};
Blockly.Words['timeouts_settimeout_name']     = {'en': 'timeout',                           'de': 'Verzögerung',                'ru': 'Пауза'};
Blockly.Words['timeouts_settimeout_in']       = {'en': 'in',                                'de': 'in',                         'ru': 'через'};
Blockly.Words['timeouts_settimeout_ms']       = {'en': 'ms',                                'de': 'ms',                         'ru': 'мс'};
Blockly.Words['timeouts_settimeout_tooltip']  = {'en': 'Delay execution',                   'de': 'Ausführung verzögern',       'ru': 'Сделать паузу'};
Blockly.Words['timeouts_settimeout_help']     = {'en': 'settimeout',                        'de': 'settimeout',                 'ru': 'settimeout'};

Blockly.Timeouts.blocks['timeouts_settimeout'] =
    '<block type="timeouts_settimeout">'
    + '     <value name="NAME">'
    + '     </value>'
    + '     <value name="DELAY">'
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
            .appendField(Blockly.Words['timeouts_settimeout'][systemLang])
            .appendField(nameField, 'NAME')
            .appendField(Blockly.Words['timeouts_settimeout_in'][systemLang])
            .appendField(new Blockly.FieldTextInput(1000), "DELAY")
            .appendField(Blockly.Words['timeouts_settimeout_ms'][systemLang]);

        this.appendStatementInput("STATEMENT")
            .setCheck(null);

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setInputsInline(false);
        this.setColour(Blockly.Timeouts.HUE);
        this.setTooltip(Blockly.Words['timeouts_settimeout_tooltip'][systemLang]);
        this.setHelpUrl(getHelp('timeouts_settimeout_help'));
    },
    isTimeout_: true,
    getVars: function () {
        return [this.getFieldValue('NAME')];
    }
};

Blockly.JavaScript['timeouts_settimeout'] = function(block) {
    var delay = block.getFieldValue('DELAY');
    var name  = block.getFieldValue('NAME');
    var statements_name = Blockly.JavaScript.statementToCode(block, 'STATEMENT');
    return name + ' = setTimeout(function (obj) {\n' + statements_name + '}, ' + delay + ');\n';;
};

// --- clearTimeout -----------------------------------------------------------
Blockly.Words['timeouts_cleartimeout']          = {'en': 'clear',                             'de': 'stop',                             'ru': 'остановить'};
Blockly.Words['timeouts_cleartimeout_tooltip']  = {'en': 'Clear delay execution',             'de': 'Ausführungsverzögerung anhalten',  'ru': 'Отменить выполнение с паузой'};
Blockly.Words['timeouts_cleartimeout_help']     = {'en': 'cleartimeout',                      'de': 'cleartimeout',                     'ru': 'cleartimeout'};

Blockly.Timeouts.getAllTimeouts = function (workspace) {
    var blocks = workspace.getAllBlocks();
    var result = [];

    // Iterate through every block and check the name.
    for (var i = 0; i < blocks.length; i++) {
        if (blocks[i].isTimeout_) {
            result.push([blocks[i].getFieldValue('NAME'), blocks[i].getFieldValue('NAME')]);
        }
    }
    if (!result.length) result.push(['', '']);

    return result;
};

Blockly.Timeouts.blocks['timeouts_cleartimeout'] =
    '<block type="timeouts_cleartimeout">'
    + '     <value name="NAME">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['timeouts_cleartimeout'] = {
    init: function() {
        this.appendDummyInput("NAME")
            .appendField(Blockly.Words['timeouts_cleartimeout'][systemLang])
            .appendField(new Blockly.FieldDropdown(function () {
                return Blockly.Timeouts.getAllTimeouts(scripts.blocklyWorkspace);
            }), "NAME");

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setInputsInline(true);
        this.setColour(Blockly.Timeouts.HUE);
        this.setTooltip(Blockly.Words['timeouts_cleartimeout_tooltip'][systemLang]);
        this.setHelpUrl(getHelp('timeouts_cleartimeout_help'));
    }
};

Blockly.JavaScript['timeouts_cleartimeout'] = function(block) {
    var name = block.getFieldValue('NAME');
    return name + ' && clearTimeout(' + name + ');\n';
};

// --- setInterval -----------------------------------------------------------
Blockly.Words['timeouts_setinterval']          = {'en': 'Execution',                         'de': 'Ausführen',                  'ru': 'Выполнить'};
Blockly.Words['timeouts_setinterval_name']     = {'en': 'interval',                          'de': 'Intervall',                  'ru': 'интервал'};
Blockly.Words['timeouts_setinterval_in']       = {'en': 'every',                             'de': 'alle',                       'ru': 'каждые'};
Blockly.Words['timeouts_setinterval_ms']       = {'en': 'ms',                                'de': 'ms',                         'ru': 'мс'};
Blockly.Words['timeouts_setinterval_tooltip']  = {'en': 'Cyclic execution',                  'de': 'Zyklische Ausführung',       'ru': 'Выполнять постоянно через интервал'};
Blockly.Words['timeouts_setinterval_help']     = {'en': 'setinterval',                       'de': 'setinterval',                'ru': 'setinterval'};

Blockly.Timeouts.blocks['timeouts_setinterval'] =
    '<block type="timeouts_setinterval">'
    + '     <value name="NAME">'
    + '     </value>'
    + '     <value name="INTERVAL">'
    + '     </value>'
    + '     <value name="STATEMENT">'
    + '     </value>'
    + '</block>';

Blockly.Blocks['timeouts_setinterval'] = {
    init: function() {
        var nameField = new Blockly.FieldTextInput(
            Blockly.Timeouts.findLegalName(Blockly.Words['timeouts_setinterval_name'][systemLang], this),
            Blockly.Timeouts.rename);

        nameField.setSpellcheck(false);

        this.appendDummyInput()
            .appendField(Blockly.Words['timeouts_setinterval'][systemLang])
            .appendField(nameField, 'NAME')
            .appendField(Blockly.Words['timeouts_setinterval_in'][systemLang])
            .appendField(new Blockly.FieldTextInput(1000), "INTERVAL")
            .appendField(Blockly.Words['timeouts_setinterval_ms'][systemLang]);

        this.appendStatementInput("STATEMENT")
            .setCheck(null);

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setInputsInline(false);
        this.setColour(Blockly.Timeouts.HUE);
        this.setTooltip(Blockly.Words['timeouts_setinterval_tooltip'][systemLang]);
        this.setHelpUrl(getHelp('timeouts_setinterval_help'));
    },
    isInterval_: true,
    getVars: function () {
        return [this.getFieldValue('NAME')];
    }
};

Blockly.JavaScript['timeouts_setinterval'] = function(block) {
    var delay = block.getFieldValue('INTERVAL');
    var name  = block.getFieldValue('NAME');
    var statements_name = Blockly.JavaScript.statementToCode(block, 'STATEMENT');
    return name + ' = setInterval(function (obj) {\n' + statements_name + '}, ' + delay + ');\n';
};

// --- clearInterval -----------------------------------------------------------
Blockly.Words['timeouts_clearinterval']          = {'en': 'clear interval',                    'de': 'stop zyklische Ausführung',        'ru': 'остановить постоянное выполнение'};
Blockly.Words['timeouts_clearinterval_tooltip']  = {'en': 'Clear interval execution',          'de': 'Ausführungsintervall anhalten',    'ru': 'Отменить цикличное выполнение с интервалом'};
Blockly.Words['timeouts_clearinterval_help']     = {'en': 'clearinterval',                     'de': 'clearinterval',                    'ru': 'clearinterval'};

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

    if (!result.length) result.push(['', '']);

    return result;
};

Blockly.Blocks['timeouts_clearinterval'] = {
    init: function() {
        this.appendDummyInput("NAME")
            .appendField(Blockly.Words['timeouts_clearinterval'][systemLang])
            .appendField(new Blockly.FieldDropdown(function () {
                return Blockly.Timeouts.getAllIntervals(scripts.blocklyWorkspace);
            }), "NAME");

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setInputsInline(true);
        this.setColour(Blockly.Timeouts.HUE);
        this.setTooltip(Blockly.Words['timeouts_clearinterval_tooltip'][systemLang]);
        this.setHelpUrl(getHelp('timeouts_clearinterval_help'));
    }
};

Blockly.JavaScript['timeouts_clearinterval'] = function(block) {
    var name = block.getFieldValue('NAME');
    return name + ' && clearInterval(' + name + ');\n';
};
