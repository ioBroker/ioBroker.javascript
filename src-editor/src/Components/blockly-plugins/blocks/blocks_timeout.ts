/**
 * Timeout and interval blocks - converted from `public/google-blockly/own/blocks_timeout.js`.
 *
 * See `blocks_number.ts` for the conversion pattern.
 *
 * The timeout and the interval half of the original were the same code twice, differing only in the
 * marker property, the variable type and `setTimeout`/`setInterval`. They are built from one
 * definition here; the snapshots and `fixtures/timeouts_named.xml` prove the generated code is
 * unchanged.
 *
 * The `else` branch of the original defined `window.goog` for adapter block modules. That now lives
 * in `bridge.ts`, which installs it before any block file runs.
 */
import { Blocks, FieldDropdown, FieldTextInput, Names, type Block, type Field, type Workspace } from 'blockly/core';
import { javascriptGenerator, Order } from 'blockly/javascript';
import { namedResourceOptions, namedResourceVariableModel, type NamedResourceVariableModel } from './helpers';

/** A block that owns a named timer */
type TimerBlock = Block & {
    isTimeout_?: boolean;
    isInterval_?: boolean;
};

/** What the two halves of this file differ in */
type TimerKind = {
    /** `timeout` or `interval` */
    id: 'timeout' | 'interval';
    /** the property marking a block as owning a timer of this kind */
    marker: 'isTimeout_' | 'isInterval_';
    /** the variable type the legacy scripts stored these under */
    variableType: 'timeout' | 'interval';
};

const TIMEOUT: TimerKind = { id: 'timeout', marker: 'isTimeout_', variableType: 'timeout' };
const INTERVAL: TimerKind = { id: 'interval', marker: 'isInterval_', variableType: 'interval' };

/**
 * The code for a delay typed into a text field, in milliseconds.
 *
 * The blocks before the TypeScript conversion put a text that is no number into the code as it is, for
 * milliseconds. So users typed the name of a variable there, and the forum recommended it. Since 10.1.0
 * `parseFloat()` made `wait(NaN)` of it (#2471). Such a text is an expression again, and for seconds and
 * minutes it is now multiplied, where the old code made `NaN` of it, too.
 *
 * @param delay the text of the field
 * @param unit ms, sec or min
 */
function delayCode(delay: string | null | undefined, unit: string): string {
    const text = String(delay ?? '').trim();
    const factor = unit === 'min' ? 60000 : unit === 'sec' ? 1000 : 1;

    if (!text) {
        return '0';
    }
    // a number - also one with something typed after it, like "500ms": a variable name cannot start with a digit
    if (/^[+-]?\.?\d/.test(text)) {
        return String(parseFloat(text) * factor);
    }
    return factor === 1 ? text : `(${text}) * ${factor}`;
}

function safeName(block: Block): string {
    // `safeName` is not public in the typings, but it is what the legacy blocks used
    const names = javascriptGenerator.nameDB_ as unknown as { safeName: (name: string) => string };

    return names.safeName(block.getFieldValue('NAME'));
}

export function install(): void {
    const Blockly = window.Blockly;
    const translate = Blockly.Translate;
    const getHelp = window.getHelp;

    Blockly.CustomBlocks = Blockly.CustomBlocks || [];
    Blockly.CustomBlocks.push('Timeouts');

    const unitOptions = (): [string, string][] => [
        [translate('timeouts_settimeout_ms'), 'ms'],
        [translate('timeouts_settimeout_sec'), 'sec'],
        [translate('timeouts_settimeout_min'), 'min'],
    ];

    /** Does this timer have a legal name? Illegal names include names of timers already defined. */
    const isLegalName = (name: string, workspace: Workspace, exclude?: Block): boolean => {
        for (const block of workspace.getAllBlocks() as TimerBlock[]) {
            if (block === exclude) {
                continue;
            }
            if (block.isTimeout_ || block.isInterval_) {
                if (Names.equals(block.getFieldValue('NAME'), name)) {
                    return false;
                }
            }
        }
        return true;
    };

    /** Ensure two identically-named timers don't exist */
    const findLegalName = (name: string, block: Block): string => {
        if (block.isInFlyout) {
            // Flyouts can have multiple timers called 'timeout'.
            return name;
        }
        while (!isLegalName(name, block.workspace, block)) {
            // Collision with another timer.
            const r = name.match(/^(.*?)(\d+)$/);
            if (!r) {
                name += '2';
            } else {
                name = r[1] + (parseInt(r[2], 10) + 1);
            }
        }
        return name;
    };

    /** Rename a timer. Called by the editable field. */
    const rename = function (this: Field, name: string): string {
        // Strip leading and trailing whitespace. Beyond this, all names are legal.
        return findLegalName(name.replace(/^[\s\xa0]+|[\s\xa0]+$/g, ''), this.getSourceBlock() as Block);
    };

    /** All timers of one kind currently present in the workspace, as dropdown options */
    const collectTimers = (workspace: Workspace, kind: TimerKind): [string, string][] => {
        const result: [string, string][] = [];

        // Iterate through every block and check the name.
        for (const block of workspace.getAllBlocks() as TimerBlock[]) {
            if (block[kind.marker]) {
                const name = block.getFieldValue('NAME');
                result.push([name, name]);
            }
        }

        // BF(2020.05.16) : for back compatibility. Remove it after 5 years
        if (window.scripts?.loading) {
            for (const v of workspace.getVariableMap().getVariablesOfType('')) {
                if (!result.find(it => it[0] === v.getName())) {
                    result.push([v.getName(), v.getName()]);
                }
            }
        }

        for (const v of workspace.getVariableMap().getVariablesOfType(kind.variableType)) {
            if (!result.find(it => it[0] === v.getName())) {
                result.push([v.getName(), v.getName()]);
            }
        }

        if (!result.length) {
            result.push(['', '']);
        }

        return result;
    };

    Blockly.Timeouts = {
        HUE: 70,
        blocks: {},
        // adapter block files may build their own timer dropdowns from these
        getAllTimeouts: (workspace: Workspace): [string, string][] => collectTimers(workspace, TIMEOUT),
        getAllIntervals: (workspace: Workspace): [string, string][] => collectTimers(workspace, INTERVAL),
    };

    const timerDropdown = (kind: TimerKind): FieldDropdown =>
        new FieldDropdown(function (this: FieldDropdown) {
            return namedResourceOptions(this, workspace => collectTimers(workspace, kind));
        });

    // --- wait -----------------------------------------------------------
    Blockly.Timeouts.blocks['timeouts_wait'] =
        '<block type="timeouts_wait">' +
        '  <field name="DELAY">1000</field>' +
        '  <field name="UNIT">ms</field>' +
        '</block>';

    Blocks['timeouts_wait'] = {
        init: function (this: Block): void {
            this.appendDummyInput()
                .appendField(translate('timeouts_wait'))
                .appendField(new FieldTextInput('1000'), 'DELAY')
                .appendField(new FieldDropdown(unitOptions()), 'UNIT');

            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.Timeouts.HUE);

            this.setTooltip(translate('timeouts_wait_tooltip'));
            this.setHelpUrl(getHelp('timeouts_wait_help'));
        },
    };

    javascriptGenerator.forBlock['timeouts_wait'] = function (block: Block): string {
        return `await wait(${delayCode(block.getFieldValue('DELAY'), block.getFieldValue('UNIT'))});\n`;
    };

    /**
     * Registers the "set" block of one timer kind, either with a fixed delay field or with a value
     * input for a calculated one.
     *
     * @param kind timeout or interval
     * @param variable whether the delay comes from a connected block instead of a field
     */
    const installSetBlock = (kind: TimerKind, variable: boolean): void => {
        const isTimeout = kind.id === 'timeout';
        const type = `timeouts_set${kind.id}${variable ? '_variable' : ''}`;
        const delayField = isTimeout ? 'DELAY' : 'INTERVAL';
        const delayInput = isTimeout ? 'DELAY_MS' : 'INTERVAL_MS';
        const label = `timeouts_set${kind.id}`;
        const defaultName = isTimeout ? 'timeout' : translate('timeouts_setinterval_name');

        Blocks[type] = {
            init: function (this: Block): void {
                const nameField = new FieldTextInput(findLegalName(defaultName, this), rename);
                nameField.setSpellcheck(false);

                const input = this.appendDummyInput()
                    .appendField(translate(label))
                    .appendField(nameField, 'NAME')
                    .appendField(translate(`${label}_in`));

                if (variable) {
                    this.appendValueInput(delayInput)
                        .setCheck('Number')
                        .appendField(translate('timeouts_settimeout_ms'));
                } else {
                    input
                        .appendField(new FieldTextInput('1000'), delayField)
                        .appendField(new FieldDropdown(unitOptions()), 'UNIT');
                }

                this.appendStatementInput('STATEMENT').setCheck(null);

                this.setInputsInline(variable);
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);

                this.setColour(Blockly.Timeouts.HUE);

                this.setTooltip(translate(`${label}_tooltip`));
                this.setHelpUrl(getHelp(`${label}_help`));
            },
            [kind.marker]: true,
            getVars: function (this: Block): string[] {
                return [this.getFieldValue('NAME')];
            },
            getVarModels: function (this: Block): NamedResourceVariableModel[] {
                return [namedResourceVariableModel(this.getFieldValue('NAME'), kind.variableType)];
            },
        };

        javascriptGenerator.forBlock[type] = function (block: Block): string {
            const fName = safeName(block);
            const statement = javascriptGenerator.statementToCode(block, 'STATEMENT');
            const delay = variable
                ? `parseInt(${javascriptGenerator.valueToCode(block, delayInput, Order.ATOMIC)})`
                : delayCode(block.getFieldValue(delayField), block.getFieldValue('UNIT'));
            const reset = isTimeout
                ? `${javascriptGenerator.prefixLines(`${fName} = null;`, javascriptGenerator.INDENT)}\n`
                : '';

            return (
                `${fName} = ${isTimeout ? 'setTimeout' : 'setInterval'}(async () => {\n` +
                `${reset}${statement}}, ${delay});\n`
            );
        };
    };

    /**
     * Registers the "clear" and "get" blocks of one timer kind. Both offer the timers that exist in
     * the workspace as a dropdown.
     *
     * @param kind timeout or interval
     */
    const installClearAndGetBlocks = (kind: TimerKind): void => {
        const clearType = `timeouts_clear${kind.id}`;
        const getType = `timeouts_get${kind.id}`;

        Blockly.Timeouts.blocks[clearType] =
            '<sep gap="5"></sep>' + `<block type="${clearType}">` + '  <field name="NAME"></field>' + '</block>';

        Blocks[clearType] = {
            init: function (this: Block): void {
                this.appendDummyInput('NAME')
                    .appendField(translate(clearType))
                    .appendField(timerDropdown(kind), 'NAME');

                this.setInputsInline(true);
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);

                this.setColour(Blockly.Timeouts.HUE);

                this.setTooltip(translate(`${clearType}_tooltip`));
                this.setHelpUrl(getHelp(`${clearType}_help`));
            },
        };

        javascriptGenerator.forBlock[clearType] = function (block: Block): string {
            const fName = safeName(block);
            const clear = kind.id === 'timeout' ? 'clearTimeout' : 'clearInterval';

            return `(() => { if (${fName}) { ${clear}(${fName}); ${fName} = null; }})();\n`;
        };

        Blockly.Timeouts.blocks[getType] =
            '<sep gap="5"></sep>' + `<block type="${getType}">` + '  <field name="NAME"></field>' + '</block>';

        Blocks[getType] = {
            init: function (this: Block): void {
                this.appendDummyInput('NAME').appendField(translate(getType)).appendField(timerDropdown(kind), 'NAME');

                this.setInputsInline(true);
                this.setOutput(true);

                this.setColour(Blockly.Timeouts.HUE);

                this.setTooltip(translate(`${getType}_tooltip`));
                this.setHelpUrl(getHelp(`${getType}_help`));
            },
        };

        javascriptGenerator.forBlock[getType] = function (block: Block): [string, Order] {
            return [safeName(block), Order.ATOMIC];
        };
    };

    // --- setTimeout / setInterval ------------------------------------------
    Blockly.Timeouts.blocks['timeouts_settimeout'] =
        '<block type="timeouts_settimeout">' +
        '  <field name="NAME">timeout</field>' +
        '  <field name="DELAY">1000</field>' +
        '  <field name="UNIT">ms</field>' +
        '</block>';
    installSetBlock(TIMEOUT, false);

    Blockly.Timeouts.blocks['timeouts_settimeout_variable'] =
        '<sep gap="5"></sep>' +
        '<block type="timeouts_settimeout_variable">' +
        '  <value name="DELAY_MS">' +
        '    <shadow type="math_number">' +
        '      <field name="NUM">1000</field>' +
        '    </shadow>' +
        '  </value>' +
        '</block>';
    installSetBlock(TIMEOUT, true);

    installClearAndGetBlocks(TIMEOUT);

    Blockly.Timeouts.blocks['timeouts_setinterval'] =
        '<block type="timeouts_setinterval">' +
        '  <field name="INTERVAL">1000</field>' +
        '  <field name="UNIT">ms</field>' +
        '</block>';
    installSetBlock(INTERVAL, false);

    Blockly.Timeouts.blocks['timeouts_setinterval_variable'] =
        '<sep gap="5"></sep>' +
        '<block type="timeouts_setinterval_variable">' +
        '  <value name="INTERVAL_MS">' +
        '    <shadow type="math_number">' +
        '      <field name="NUM">1000</field>' +
        '    </shadow>' +
        '  </value>' +
        '</block>';
    installSetBlock(INTERVAL, true);

    installClearAndGetBlocks(INTERVAL);
}
