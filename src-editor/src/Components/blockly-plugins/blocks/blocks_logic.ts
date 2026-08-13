/**
 * Logic blocks - converted from `public/google-blockly/own/blocks_logic.js`.
 *
 * `logic_multi_and` and `logic_multi_or` were two copies of the same 120 lines that differed only
 * in the input prefix, the label and the join operator. They are built from one definition here;
 * the snapshots prove the generated code is unchanged.
 *
 * Same two Blockly 13 corrections as in `blocks_object.ts`: `Blockly.ALIGN_RIGHT` no longer exists
 * (the rows were silently left-aligned) and `MutatorIcon.reconnect()` was removed - see
 * `helpers.ts`. Both are editor-only paths the code generation tests cannot reach.
 */
import {
    Blocks,
    FieldDropdown,
    icons,
    inputs,
    type Block,
    type BlockSvg,
    type Connection,
    type Workspace,
} from 'blockly/core';
import { javascriptGenerator, Order } from 'blockly/javascript';

import { reconnectChild } from './helpers';

/** A multi-condition block remembers how many inputs it currently shows */
type MultiBlock = Block & {
    itemCount_: number;
    updateShape_: () => void;
};

/** A block inside the mutator remembers which value connection it stood for */
type MutatorItemBlock = Block & {
    valueConnection_?: Connection | null;
};

/**
 * Registers a "multi condition" block together with its two mutator blocks.
 *
 * @param type Block type, e.g. `logic_multi_and`
 * @param prefix Prefix of the value inputs, e.g. `AND`
 * @param word Translation key of the word between two conditions, e.g. `logic_multi_and_and`
 * @param joiner How the conditions are joined in the generated code, e.g. ` && `
 * @param order Operator precedence of the generated expression
 */
function installMultiBlock(type: string, prefix: string, word: string, joiner: string, order: Order): void {
    const translate = window.Blockly.Translate;
    const containerType = `${type}_container`;
    const mutatorType = `${type}_mutator`;

    Blocks[containerType] = {
        /** Mutator block for container */
        init: function (this: Block): void {
            this.appendDummyInput().appendField(translate(type));

            this.appendStatementInput('STACK');

            this.setColour('%{BKY_LOGIC_HUE}');

            this.setTooltip(translate(`${type}_tooltip`));

            this.contextMenu = false;
        },
    };

    Blocks[mutatorType] = {
        /** Mutator block for add items */
        init: function (this: Block): void {
            this.appendDummyInput(prefix).appendField(translate(word));

            this.setPreviousStatement(true);
            this.setNextStatement(true);

            this.setColour('%{BKY_LOGIC_HUE}');

            this.setTooltip(translate(`${type}_tooltip`));

            this.contextMenu = false;
        },
    };

    Blocks[type] = {
        init: function (this: MultiBlock): void {
            this.itemCount_ = 2;
            this.setMutator(new icons.MutatorIcon([mutatorType], this as unknown as BlockSvg));

            this.setInputsInline(false);
            this.setOutput(true, 'Boolean');

            this.setColour('%{BKY_LOGIC_HUE}');

            this.setTooltip(translate(`${type}_tooltip`));
        },

        /** Create XML to represent number of text inputs */
        mutationToDom: function (this: MultiBlock): Element {
            const container = document.createElement('mutation');
            container.setAttribute('items', String(this.itemCount_));

            return container;
        },

        /** Parse XML to restore the text inputs */
        domToMutation: function (this: MultiBlock, xmlElement: Element): void {
            this.itemCount_ = parseInt(xmlElement.getAttribute('items') as string, 10);
            this.updateShape_();
        },

        /** Populate the mutator's dialog with this block's components */
        decompose: function (this: MultiBlock, workspace: Workspace): Block {
            const containerBlock = workspace.newBlock(containerType) as BlockSvg;
            containerBlock.initSvg();

            let connection = containerBlock.getInput('STACK')?.connection as Connection;
            for (let i = 0; i < this.itemCount_; i++) {
                const itemBlock = workspace.newBlock(mutatorType) as BlockSvg;
                itemBlock.initSvg();
                connection.connect(itemBlock.previousConnection as Connection);
                connection = itemBlock.nextConnection as Connection;
            }

            return containerBlock;
        },

        /** Reconfigure this block based on the mutator dialog's components */
        compose: function (this: MultiBlock, containerBlock: Block): void {
            let itemBlock = containerBlock.getInputTargetBlock('STACK') as MutatorItemBlock | null;
            // Count number of inputs.
            const connections: (Connection | null | undefined)[] = [];
            while (itemBlock) {
                connections.push(itemBlock.valueConnection_);
                itemBlock = (itemBlock.nextConnection &&
                    itemBlock.nextConnection.targetBlock()) as MutatorItemBlock | null;
            }

            // Disconnect any children that don't belong.
            for (let k = 0; k < this.itemCount_; k++) {
                const connection = this.getInput(`${prefix}${k}`)?.connection?.targetConnection;
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
                reconnectChild(connections[i], this, `${prefix}${i}`);
            }
        },

        /** Store pointers to any connected child blocks */
        saveConnections: function (this: MultiBlock, containerBlock: Block): void {
            let itemBlock = containerBlock.getInputTargetBlock('STACK') as MutatorItemBlock | null;
            let i = 0;

            while (itemBlock) {
                const input = this.getInput(`${prefix}${i}`);
                itemBlock.valueConnection_ = input?.connection?.targetConnection;
                i++;
                itemBlock = itemBlock.nextConnection?.targetBlock() as MutatorItemBlock | null;
            }
        },

        /** Modify this block to have the correct number of inputs */
        updateShape_: function (this: MultiBlock): void {
            // Add new inputs.
            for (let i = 0; i < this.itemCount_; i++) {
                if (!this.getInput(`${prefix}${i}`)) {
                    const input = this.appendValueInput(`${prefix}${i}`).setAlign(inputs.Align.RIGHT);
                    if (i > 0) {
                        input.appendField(translate(word));
                    }
                }
            }
            // Remove deleted inputs.
            for (let i = this.itemCount_; this.getInput(`${prefix}${i}`); i++) {
                this.removeInput(`${prefix}${i}`);
            }
        },
    };

    javascriptGenerator.forBlock[type] = function (block: Block): [string, Order] {
        const multiBlock = block as MultiBlock;
        const conditions = [];
        for (let n = 0; n < multiBlock.itemCount_; n++) {
            const vCondition = javascriptGenerator.valueToCode(block, `${prefix}${n}`, Order.ATOMIC);
            if (vCondition) {
                conditions.push(vCondition);
            }
        }

        return [`${conditions.length > 0 ? conditions.join(joiner) : 'false'}`, order];
    };
}

export function install(): void {
    const translate = window.Blockly.Translate;

    // --- logic multi and / or --------------------------------------------
    installMultiBlock('logic_multi_and', 'AND', 'logic_multi_and_and', ' && ', Order.LOGICAL_AND);
    installMultiBlock('logic_multi_or', 'OR', 'logic_multi_or_or', ' || ', Order.LOGICAL_OR);

    // --- logic between --------------------------------------------------

    Blocks['logic_between'] = {
        init: function (this: Block): void {
            this.appendValueInput('MIN').setCheck('Number');
            this.appendValueInput('VALUE')
                .setCheck('Number')
                .appendField(
                    new FieldDropdown([
                        ['<', 'LT'],
                        ['≤', 'LE'],
                    ]),
                    'MIN_OPERATOR',
                );
            this.appendValueInput('MAX')
                .setCheck('Number')
                .appendField(
                    new FieldDropdown([
                        ['<', 'LT'],
                        ['≤', 'LE'],
                    ]),
                    'MAX_OPERATOR',
                );

            this.setInputsInline(true);
            this.setOutput(true, 'Boolean');

            this.setColour('%{BKY_LOGIC_HUE}');

            this.setTooltip(translate('logic_between_tooltip'));
        },
    };

    javascriptGenerator.forBlock['logic_between'] = function (block: Block): [string, Order] {
        const vMin = javascriptGenerator.valueToCode(block, 'MIN', Order.RELATIONAL) || 0;
        const vValue = javascriptGenerator.valueToCode(block, 'VALUE', Order.RELATIONAL) || 0;
        const vMax = javascriptGenerator.valueToCode(block, 'MAX', Order.RELATIONAL) || 0;
        const fMinOperator = block.getFieldValue('MIN_OPERATOR') === 'LT' ? '<' : '<=';
        const fMaxOperator = block.getFieldValue('MAX_OPERATOR') === 'LT' ? '<' : '<=';

        return [`${vMin} ${fMinOperator} ${vValue} && ${vValue} ${fMaxOperator} ${vMax}`, Order.LOGICAL_AND];
    };

    // --- logic ifempty --------------------------------------------------

    Blocks['logic_ifempty'] = {
        init: function (this: Block): void {
            this.appendValueInput('VALUE')
                .setCheck(null)
                .setAlign(inputs.Align.RIGHT)
                .appendField(translate('logic_ifempty'));
            this.appendValueInput('DEFLT')
                .setCheck(null)
                .setAlign(inputs.Align.RIGHT)
                .appendField(translate('logic_ifempty_then'));

            this.setInputsInline(true);
            this.setOutput(true, null);

            this.setColour('%{BKY_LOGIC_HUE}');

            this.setTooltip(translate('logic_ifempty_tooltip'));
        },
    };

    javascriptGenerator.forBlock['logic_ifempty'] = function (block: Block): [string, Order] {
        const vValue = javascriptGenerator.valueToCode(block, 'VALUE', Order.LOGICAL_OR) || null;
        const vDeflt = javascriptGenerator.valueToCode(block, 'DEFLT', Order.LOGICAL_OR) || null;

        return [`${vValue} || ${vDeflt}`, Order.LOGICAL_OR];
    };
}
