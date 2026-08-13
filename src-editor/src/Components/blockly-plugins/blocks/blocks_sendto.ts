/**
 * sendTo blocks - converted from `public/google-blockly/own/blocks_sendto.js`.
 *
 * See `blocks_number.ts` for the conversion pattern, `blocks_object.ts` for the two Blockly 13
 * corrections that apply here as well (`inputs.Align.RIGHT` and `reconnectChild`).
 *
 * One piece was dropped rather than converted: the argument loop in `sendto_otherscript`'s
 * `updateShape_` was copied from `sendto_custom`, but that block never sets `itemCount_` or
 * `attributes_` - the loop ran zero times and could only ever have thrown if it had not.
 */
import {
    Blocks,
    FieldCheckbox,
    FieldDropdown,
    FieldTextInput,
    icons,
    inputs,
    type Block,
    type BlockSvg,
    type Connection,
    type Field,
    type Workspace,
} from 'blockly/core';
import { javascriptGenerator, Order } from 'blockly/javascript';

import { isTrue, logLevelOptions, objectNameOf, quote, reconnectChild, updateStatementInput } from './helpers';

/** The custom sendTo block remembers the parameter names it currently shows */
type SendtoBlock = Block & {
    attributes_: string[];
    itemCount_: number;
    updateShape_: (withStatement?: boolean) => void;
};

/** A block inside the mutator remembers which value connection it stood for */
type MutatorItemBlock = Block & {
    valueConnection_?: Connection | null;
};

/** Milliseconds for a delay given in the selected unit */
function toMilliseconds(value: string, unit: string): number {
    const number = parseFloat(value);

    if (unit === 'min') {
        return number * 60000;
    }
    if (unit === 'sec') {
        return number * 1000;
    }
    return number;
}

export function install(): void {
    const Blockly = window.Blockly;
    const translate = Blockly.Translate;
    const getHelp = window.getHelp;

    Blockly.CustomBlocks = Blockly.CustomBlocks || [];
    Blockly.CustomBlocks.push('Sendto');

    Blockly.Sendto = {
        HUE: 310,
        blocks: {},
    };

    const withStatementField = (): FieldCheckbox =>
        new FieldCheckbox('FALSE', function (this: Field, option: string | boolean): undefined {
            (this.getSourceBlock() as SendtoBlock).updateShape_(isTrue(option));
        });

    // --- sendTo Custom --------------------------------------------------
    Blockly.Sendto.blocks['sendto_custom'] =
        '<block type="sendto_custom">' +
        '  <mutation xmlns="http://www.w3.org/1999/xhtml" items="parameter"></mutation>' +
        '  <field name="INSTANCE">admin.0</field>' +
        '  <field name="COMMAND">send</field>' +
        '  <field name="LOG"></field>' +
        '  <field name="WITH_STATEMENT">FALSE</field>' +
        '  <value name="ARG0">' +
        '    <shadow type="text">' +
        '      <field name="TEXT"></field>' +
        '    </shadow>' +
        '  </value>' +
        '</block>';

    Blocks['sendto_custom_container'] = {
        /** Mutator block for container */
        init: function (this: Block): void {
            this.appendDummyInput().appendField(translate('sendto_custom_arguments'));

            this.appendStatementInput('STACK');

            this.setColour(Blockly.Sendto.HUE);

            this.setTooltip(translate('sendto_custom_arg_tooltip'));

            this.contextMenu = false;
        },
    };

    Blocks['sendto_custom_mutator'] = {
        /** Mutator block for add items */
        init: function (this: Block): void {
            this.appendDummyInput('ATTR')
                .appendField(translate('sendto_custom_argument'))
                .appendField(new FieldTextInput('parameter'), 'ATTR');

            this.setPreviousStatement(true);
            this.setNextStatement(true);

            this.setColour(Blockly.Sendto.HUE);

            this.setTooltip(translate('sendto_custom_arg_tooltip'));

            this.contextMenu = false;
        },
    };

    Blocks['sendto_custom'] = {
        init: function (this: SendtoBlock): void {
            const instances: [string, string][] = [];
            if (window.main?.instances) {
                for (const id of window.main.instances) {
                    if ((window.main.objects[id]?.common as any)?.messagebox) {
                        const name = id.substring('system.adapter.'.length);
                        instances.push([name, name]);
                    }
                }
                if (!instances.length) {
                    instances.push([translate('sendto_no_instances'), '']);
                }

                this.appendDummyInput('INSTANCE')
                    .appendField(translate('sendto_custom'))
                    .appendField(new FieldDropdown(instances), 'INSTANCE');
            } else {
                this.appendDummyInput('INSTANCE')
                    .appendField(translate('sendto_custom'))
                    .appendField(new FieldTextInput('adapter.0'), 'INSTANCE');
            }

            this.appendDummyInput('COMMAND')
                .appendField(translate('sendto_custom_command'))
                .appendField(new FieldTextInput('send'), 'COMMAND');

            this.appendDummyInput('LOG')
                .appendField(translate('loglevel'))
                .appendField(new FieldDropdown(logLevelOptions()), 'LOG');

            this.appendDummyInput('WITH_STATEMENT')
                .appendField(translate('with_results'))
                .appendField(withStatementField(), 'WITH_STATEMENT');

            this.attributes_ = [];
            this.itemCount_ = 0;

            this.setMutator(new icons.MutatorIcon(['sendto_custom_mutator'], this as unknown as BlockSvg));

            this.updateShape_();

            this.setInputsInline(false);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.Sendto.HUE);

            this.setTooltip(translate('sendto_custom_tooltip'));
            this.setHelpUrl(getHelp('sendto_custom_help'));
        },

        /** Create XML to represent number of text inputs */
        mutationToDom: function (this: SendtoBlock): Element {
            const container = document.createElement('mutation');

            container.setAttribute('items', this.attributes_.map(a => encodeURIComponent(a)).join(','));

            return container;
        },

        /** Parse XML to restore the text inputs */
        domToMutation: function (this: SendtoBlock, xmlElement: Element): void {
            this.attributes_ = (xmlElement.getAttribute('items') as string)
                .split(',')
                .map(name => decodeURIComponent(name));

            this.itemCount_ = this.attributes_.length;
            this.updateShape_();
        },

        /** Populate the mutator's dialog with this block's components */
        decompose: function (this: SendtoBlock, workspace: Workspace): Block {
            const containerBlock = workspace.newBlock('sendto_custom_container') as BlockSvg;
            containerBlock.initSvg();

            let connection = containerBlock.getInput('STACK')?.connection as Connection;
            for (let i = 0; i < this.itemCount_; i++) {
                const itemBlock = workspace.newBlock('sendto_custom_mutator') as BlockSvg;
                itemBlock.setFieldValue(this.attributes_[i], 'ATTR');
                itemBlock.initSvg();
                connection.connect(itemBlock.previousConnection as Connection);
                connection = itemBlock.nextConnection as Connection;
            }
            return containerBlock;
        },

        /** Reconfigure this block based on the mutator dialog's components */
        compose: function (this: SendtoBlock, containerBlock: Block): void {
            this.attributes_ = [];

            let itemBlock = containerBlock.getInputTargetBlock('STACK') as MutatorItemBlock | null;
            // Count number of inputs.
            const connections: (Connection | null | undefined)[] = [];
            while (itemBlock) {
                this.attributes_.push(itemBlock.getFieldValue('ATTR'));

                connections.push(itemBlock.valueConnection_);
                itemBlock = (itemBlock.nextConnection &&
                    itemBlock.nextConnection.targetBlock()) as MutatorItemBlock | null;
            }

            // Disconnect any children that don't belong.
            for (let k = 0; k < this.itemCount_; k++) {
                const connection = this.getInput(`ARG${k}`)?.connection?.targetConnection;
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
                reconnectChild(connections[i], this, `ARG${i}`);
            }
        },

        /** Store pointers to any connected child blocks */
        saveConnections: function (this: SendtoBlock, containerBlock: Block): void {
            let itemBlock = containerBlock.getInputTargetBlock('STACK') as MutatorItemBlock | null;
            let i = 0;
            while (itemBlock) {
                itemBlock.valueConnection_ = this.getInput(`ARG${i}`)?.connection?.targetConnection;
                itemBlock = itemBlock.nextConnection?.targetBlock() as MutatorItemBlock | null;
                i++;
            }
        },

        /** Modify this block to have the correct number of inputs */
        updateShape_: function (this: SendtoBlock, withStatement?: boolean): void {
            const workspace = this.workspace;

            // Add new inputs.
            for (let i = 0; i < this.itemCount_; i++) {
                let input = this.getInput(`ARG${i}`);

                if (!input) {
                    input = this.appendValueInput(`ARG${i}`).setAlign(inputs.Align.RIGHT);
                    input.appendField(this.attributes_[i]);
                } else if (input.fieldRow.length >= 1) {
                    (input.fieldRow[0] as FieldTextInput).setValue(this.attributes_[i]);
                }

                setTimeout(
                    __input => {
                        if (!__input.connection?.isConnected()) {
                            const shadow = workspace.newBlock('text') as BlockSvg;
                            shadow.setShadow(true);
                            shadow.initSvg();
                            shadow.render();
                            shadow.outputConnection!.connect(__input.connection as Connection);
                        }
                    },
                    100,
                    input,
                );
            }
            // Remove deleted inputs.
            for (let i = this.itemCount_; this.getInput(`ARG${i}`); i++) {
                this.removeInput(`ARG${i}`);
            }

            updateStatementInput(this, withStatement);
        },
    };

    javascriptGenerator.forBlock['sendto_custom'] = function (block: Block): string {
        const sendtoBlock = block as SendtoBlock;
        const fInstance = block.getFieldValue('INSTANCE');
        const fLog = block.getFieldValue('LOG');
        const fCommand = block.getFieldValue('COMMAND');

        let logText = '';

        let statement: string | undefined;
        if (isTrue(block.getFieldValue('WITH_STATEMENT'))) {
            statement = javascriptGenerator.statementToCode(block, 'STATEMENT');
        }

        const args: { attr: string; val: string }[] = [];
        for (let n = 0; n < sendtoBlock.itemCount_; n++) {
            const name = String(sendtoBlock.attributes_[n]);
            let vArgument = javascriptGenerator.valueToCode(block, `ARG${n}`, Order.COMMA);

            // if JSON (or object), remove quotes '{ bla: true }' -> { bla: true }
            if (vArgument && vArgument.startsWith(`'{`) && vArgument.endsWith(`}'`)) {
                vArgument = vArgument.substring(1, vArgument.length - 1);
            }

            if (sendtoBlock.itemCount_ === 1 && !name) {
                if (fLog) {
                    logText = `console.${fLog}('sendTo[custom] ${fInstance}: ' + ${vArgument});\n`;
                }

                if (statement) {
                    return (
                        `sendTo('${fInstance}', ${quote(fCommand)}, ${vArgument}, async (result) => {\n` +
                        `${statement}});\n${logText}`
                    );
                }

                return `sendTo('${fInstance}', ${quote(fCommand)}, ${vArgument});\n${logText}`;
            }

            // `replaceAll` would need ES2021, which this project does not target
            args.push({ attr: name.replace(/'/g, `\\'`), val: vArgument });
        }

        const argStr = args.length
            ? args
                  .map(a => javascriptGenerator.prefixLines(`'${a.attr}': ${a.val},`, javascriptGenerator.INDENT))
                  .join('\n')
            : '';

        if (fLog) {
            const parts = args.length ? args.map(a => `${a.attr}: ' + ${a.val} + '`).join(', ') : '[no args]';
            logText = `console.${fLog}('sendTo[custom] ${fInstance}: ${parts}');\n`;
        }

        if (statement) {
            return (
                `sendTo('${fInstance}', ${quote(fCommand)}, {\n${argStr}\n}, async (result) => {\n` +
                `${statement}});\n${logText}`
            );
        }

        return `sendTo('${fInstance}', ${quote(fCommand)}, {\n${argStr}\n});\n${logText}`;
    };

    // --- sendTo JavaScript --------------------------------------------------
    Blockly.Sendto.blocks['sendto_otherscript'] =
        '<block type="sendto_otherscript">' +
        '  <field name="INSTANCE">0</field>' +
        '  <field name="TIMEOUT">1000</field>' +
        '  <field name="UNIT">ms</field>' +
        '  <field name="MESSAGE">customMessage</field>' +
        '  <field name="WITH_STATEMENT">FALSE</field>' +
        '  <value name="OID">' +
        '    <shadow type="field_oid_script">' +
        '      <field name="oid">Script Object ID</field>' +
        '    </shadow>' +
        '  </value>' +
        '</block>';

    Blocks['sendto_otherscript'] = {
        init: function (this: SendtoBlock): void {
            const options: [string, string][] = [];
            if (window.main?.instances) {
                for (const id of window.main.instances) {
                    const m = id.match(/^system\.adapter\.javascript\.(\d+)$/);
                    if (m) {
                        const n = parseInt(m[1], 10);
                        options.push([`javascript.${n}`, String(n)]);
                    }
                }
            }

            if (!options.length) {
                for (let u = 0; u <= 4; u++) {
                    options.push([`javascript.${u}`, String(u)]);
                }
            }

            this.appendDummyInput('NAME').appendField(`✉️ ${translate('sendto_otherscript_name')}`);

            this.appendDummyInput('INSTANCE')
                .appendField(translate('sendto_otherscript_instance'))
                .appendField(new FieldDropdown(options), 'INSTANCE');

            this.appendValueInput('OID').appendField(translate('sendto_otherscript_script')).setCheck(null);

            this.appendDummyInput()
                .appendField(translate('sendto_otherscript_timeout'))
                .appendField(new FieldTextInput('1000'), 'TIMEOUT')
                .appendField(
                    new FieldDropdown([
                        [translate('timeouts_settimeout_ms'), 'ms'],
                        [translate('timeouts_settimeout_sec'), 'sec'],
                        [translate('timeouts_settimeout_min'), 'min'],
                    ]),
                    'UNIT',
                );

            this.appendDummyInput('MESSAGE')
                .appendField(translate('sendto_otherscript_message'))
                .appendField(new FieldTextInput('customMessage'), 'MESSAGE');

            this.appendValueInput('DATA').appendField(translate('sendto_otherscript_data'));

            this.appendDummyInput('WITH_STATEMENT')
                .appendField(translate('with_results'))
                .appendField(withStatementField(), 'WITH_STATEMENT');

            this.updateShape_();

            this.setInputsInline(false);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.Sendto.HUE);

            this.setTooltip(translate('sendto_otherscript_tooltip'));
            this.setHelpUrl(getHelp('sendto_otherscript_help'));
        },

        /** Add or remove the statement input */
        updateShape_: function (this: Block, withStatement?: boolean): void {
            updateStatementInput(this, withStatement);
        },
    };

    javascriptGenerator.forBlock['sendto_otherscript'] = function (block: Block): string {
        const fInstance = block.getFieldValue('INSTANCE');
        const vObjId = javascriptGenerator.valueToCode(block, 'OID', Order.ATOMIC);
        const fMessage = block.getFieldValue('MESSAGE');
        const fTimeout = toMilliseconds(block.getFieldValue('TIMEOUT'), block.getFieldValue('UNIT'));

        let statement: string | undefined;
        if (isTrue(block.getFieldValue('WITH_STATEMENT'))) {
            statement = javascriptGenerator.statementToCode(block, 'STATEMENT');
        }

        const objectName = objectNameOf(vObjId);
        const vData = javascriptGenerator.valueToCode(block, 'DATA', Order.ATOMIC) || 'true';
        const target = `{ instance: ${fInstance}, script: ${vObjId}${objectName ? ` /* ${objectName} */` : ''}, message: ${quote(fMessage)} }`;

        if (statement) {
            return `messageTo(${target}, ${vData}, { timeout: ${fTimeout} }, (result) => {\n${statement}})\n`;
        }

        return `messageTo(${target}, ${vData}, { timeout: ${fTimeout} });\n`;
    };

    // --- sendTo gethistory --------------------------------------------------
    Blockly.Sendto.blocks['sendto_gethistory'] =
        '<block type="sendto_gethistory">' +
        '  <field name="INSTANCE">default</field>' +
        '  <field name="AGGREGATE">none</field>' +
        '  <field name="STEP">0</field>' +
        '  <field name="COUNT">500</field>' +
        '  <field name="UNIT">min</field>' +
        '  <value name="OID">' +
        '    <shadow type="field_oid">' +
        '    </shadow>' +
        '  </value>' +
        '  <value name="START">' +
        '    <shadow type="time_get_special">' +
        '      <field name="TYPE">dayStart</field>' +
        '    </shadow>' +
        '  </value>' +
        '  <value name="END">' +
        '    <shadow type="time_get_special">' +
        '      <field name="TYPE">dayEnd</field>' +
        '    </shadow>' +
        '  </value>' +
        '</block>';

    Blocks['sendto_gethistory'] = {
        init: function (this: Block): void {
            const options: [string, string][] = [['default', 'default']];
            if (window.main?.instances) {
                for (const id of window.main.instances) {
                    const m = id.match(/^system\.adapter\.(history|influxdb|sql)\.(\d+)$/);
                    if (m) {
                        const instance = `${m[1]}.${m[2]}`;
                        options.push([instance, instance]);
                    }
                }
            }

            this.appendDummyInput('NAME').appendField(translate('sendto_gethistory_name'));

            this.appendDummyInput('INSTANCE')
                .appendField(translate('sendto_gethistory_instance'))
                .appendField(new FieldDropdown(options), 'INSTANCE');

            this.appendValueInput('OID').appendField(translate('sendto_gethistory_oid')).setCheck(null);

            this.appendValueInput('START').appendField(translate('sendto_gethistory_start')).setCheck(null);

            this.appendValueInput('END').appendField(translate('sendto_gethistory_end')).setCheck(null);

            this.appendDummyInput('AGGREGATE')
                .appendField(translate('sendto_gethistory_aggregate'))
                .appendField(
                    new FieldDropdown([
                        [translate('sendto_gethistory_none'), 'none'],
                        [translate('sendto_gethistory_minimum'), 'min'],
                        [translate('sendto_gethistory_maximum'), 'max'],
                        [translate('sendto_gethistory_avg'), 'average'],
                        [translate('sendto_gethistory_cnt'), 'count'],
                    ]),
                    'AGGREGATE',
                );

            this.appendDummyInput('UNIT')
                .appendField(translate('sendto_gethistory_step'))
                .appendField(new FieldTextInput('0'), 'STEP')
                .appendField(
                    new FieldDropdown([
                        [translate('sendto_gethistory_ms'), 'ms'],
                        [translate('sendto_gethistory_sec'), 'sec'],
                        [translate('sendto_gethistory_min'), 'min'],
                        [translate('sendto_gethistory_hour'), 'hour'],
                        [translate('sendto_gethistory_day'), 'day'],
                    ]),
                    'UNIT',
                );

            this.appendDummyInput('COUNT')
                .appendField(translate('sendto_gethistory_count'))
                .appendField(new FieldTextInput('0'), 'COUNT');

            this.appendStatementInput('STATEMENT').setCheck(null);

            this.setInputsInline(false);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.Sendto.HUE);

            this.setTooltip(translate('sendto_gethistory_tooltip'));
            this.setHelpUrl(getHelp('sendto_gethistory_help'));
        },
    };

    javascriptGenerator.forBlock['sendto_gethistory'] = function (block: Block): string {
        const fInstance = block.getFieldValue('INSTANCE');
        const vObjId = javascriptGenerator.valueToCode(block, 'OID', Order.ATOMIC);
        const vStart = javascriptGenerator.valueToCode(block, 'START', Order.ATOMIC);
        const vEnd = javascriptGenerator.valueToCode(block, 'END', Order.ATOMIC);
        const fAggregate = block.getFieldValue('AGGREGATE');
        const fUnit = block.getFieldValue('UNIT');
        const fCount = parseInt(block.getFieldValue('COUNT'), 10);

        let fStep = parseFloat(block.getFieldValue('STEP'));
        if (fUnit === 'day') {
            fStep *= 24 * 60 * 60 * 1000;
        } else if (fUnit === 'hour') {
            fStep *= 60 * 60 * 1000;
        } else if (fUnit === 'min') {
            fStep *= 60 * 1000;
        } else if (fUnit === 'sec') {
            fStep *= 1000;
        }

        const statement = javascriptGenerator.statementToCode(block, 'STATEMENT');
        const objectName = objectNameOf(vObjId);

        return (
            `getHistory(${fInstance !== 'default' ? `${quote(fInstance)}, ` : ''}{\n` +
            `  id: ${vObjId}${objectName ? ` /* ${objectName} */` : ''},\n` +
            `  start: ${vStart},\n` +
            `  end: ${vEnd},\n` +
            (fStep > 0 && fAggregate !== 'none' ? `  step: ${fStep},\n` : '') +
            (fStep === 0 || fAggregate === 'none' ? `  count: ${fCount},\n` : '') +
            `  aggregate: '${fAggregate}',\n` +
            `  removeBorderValues: true,\n` +
            `}, async (err, result) => {\n` +
            `  if (err) {\n` +
            `    console.error(err);\n` +
            (statement ? `  } else {\n` : '') +
            (statement ? javascriptGenerator.prefixLines(statement, javascriptGenerator.INDENT) : '') +
            `  }\n` +
            '});\n'
        );
    };
}
