/**
 * Object blocks - converted from `public/google-blockly/own/blocks_object.js`.
 *
 * See `blocks_number.ts` for the conversion pattern and `blocks_switch.ts` for how a mutator is
 * typed. Two calls did not survive the Blockly 13 update and had to be corrected here, because
 * they no longer exist and TypeScript refuses to compile them:
 *
 * - `Blockly.ALIGN_RIGHT` is gone; the value now lives in `inputs.Align.RIGHT`. Passing the old
 *   `undefined` silently left every attribute row left-aligned.
 * - `Blockly.icons.MutatorIcon.reconnect()` is gone. `helpers.ts` reimplements it with its
 *   documented behaviour - without it, editing the attributes of an `object_new` block throws.
 *
 * Neither is reachable from the code generation tests, they are editor-only paths.
 */
import { Blocks, FieldTextInput, icons, inputs, type Block, type BlockSvg, type Connection, type Workspace } from 'blockly/core';
import { javascriptGenerator, Order } from 'blockly/javascript';

import { quote, reconnectChild } from './helpers';

/** The object_new block remembers the attribute names it currently shows */
type ObjectNewBlock = Block & {
    attributes_: string[];
    itemCount_: number;
    updateShape_: () => void;
};

/** A block inside the mutator remembers which value connection it stood for */
type MutatorItemBlock = Block & {
    valueConnection_?: Connection | null;
};

export function install(): void {
    const Blockly = window.Blockly;
    const translate = Blockly.Translate;

    Blockly.CustomBlocks = Blockly.CustomBlocks || [];
    Blockly.CustomBlocks.push('Object');

    Blockly.Object = {
        HUE: 40,
        blocks: {},
    };

    // --- object new --------------------------------------------------
    Blockly.Object.blocks['object_new'] = '<block type="object_new">' + '</block>';

    Blocks['object_new_container'] = {
        /** Mutator block for container */
        init: function (this: Block): void {
            this.setColour(Blockly.Object.HUE);

            this.appendDummyInput().appendField(translate('object_new_attributes'));

            this.appendStatementInput('STACK');
            this.setTooltip(translate('object_new_tooltip'));

            this.contextMenu = false;
        },
    };

    Blocks['object_new_mutator'] = {
        /** Mutator block for add items */
        init: function (this: Block): void {
            this.setColour(Blockly.Object.HUE);

            this.appendDummyInput('ATTR')
                .appendField(translate('object_new_attribute'))
                .appendField(new FieldTextInput('attribute1'), 'ATTR');

            this.setPreviousStatement(true);
            this.setNextStatement(true);

            this.setTooltip(translate('object_new_tooltip'));

            this.contextMenu = false;
        },
    };

    Blocks['object_new'] = {
        init: function (this: ObjectNewBlock): void {
            this.appendDummyInput('NAME').appendField(translate('object_new'));

            this.attributes_ = [];
            this.itemCount_ = 0;
            this.setMutator(new icons.MutatorIcon(['object_new_mutator'], this as unknown as BlockSvg));

            this.setInputsInline(false);
            this.setOutput(true);

            this.setColour(Blockly.Object.HUE);
            this.setTooltip(translate('object_new_tooltip'));
        },

        /** Create XML to represent number of text inputs */
        mutationToDom: function (this: ObjectNewBlock): Element {
            const container = document.createElement('mutation');

            for (let i = 0; i < this.attributes_.length; i++) {
                const parameter = document.createElement('attribute');
                parameter.setAttribute('id', `ATTR_${i}`);
                parameter.setAttribute('name', this.attributes_[i]);
                container.appendChild(parameter);
            }

            return container;
        },

        /** Parse XML to restore the text inputs */
        domToMutation: function (this: ObjectNewBlock, xmlElement: Element): void {
            this.attributes_ = [];

            for (let i = 0, childNode; (childNode = xmlElement.childNodes[i]); i++) {
                if (childNode.nodeName.toLowerCase() === 'attribute') {
                    this.attributes_.push((childNode as Element).getAttribute('name') as string);
                }
            }

            this.itemCount_ = this.attributes_.length;
            this.updateShape_();
        },

        /** Populate the mutator's dialog with this block's components */
        decompose: function (this: ObjectNewBlock, workspace: Workspace): Block {
            const containerBlock = workspace.newBlock('object_new_container') as BlockSvg;
            containerBlock.initSvg();

            let connection = containerBlock.getInput('STACK')?.connection as Connection;
            for (let i = 0; i < this.itemCount_; i++) {
                const itemBlock = workspace.newBlock('object_new_mutator') as BlockSvg;
                itemBlock.setFieldValue(this.attributes_[i], 'ATTR');
                itemBlock.initSvg();
                connection.connect(itemBlock.previousConnection as Connection);
                connection = itemBlock.nextConnection as Connection;
            }

            return containerBlock;
        },

        /** Reconfigure this block based on the mutator dialog's components */
        compose: function (this: ObjectNewBlock, containerBlock: Block): void {
            this.attributes_ = [];

            let itemBlock = containerBlock.getInputTargetBlock('STACK') as MutatorItemBlock | null;
            // Count number of inputs.
            const connections: (Connection | null | undefined)[] = [];
            while (itemBlock) {
                const attrName = itemBlock.getFieldValue('ATTR');
                this.attributes_.push(attrName);

                connections.push(itemBlock.valueConnection_);
                itemBlock = (itemBlock.nextConnection &&
                    itemBlock.nextConnection.targetBlock()) as MutatorItemBlock | null;
            }

            // Disconnect any children that don't belong.
            for (let k = 0; k < this.itemCount_; k++) {
                const connection = this.getInput(`ATTR_${k}`)?.connection?.targetConnection;
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
                reconnectChild(connections[i], this, `ATTR_${i}`);
            }
        },

        /** Store pointers to any connected child blocks */
        saveConnections: function (this: ObjectNewBlock, containerBlock: Block): void {
            let itemBlock = containerBlock.getInputTargetBlock('STACK') as MutatorItemBlock | null;
            let i = 0;

            while (itemBlock) {
                const input = this.getInput(`ATTR_${i}`);
                itemBlock.valueConnection_ = input?.connection?.targetConnection;
                i++;
                itemBlock = itemBlock.nextConnection?.targetBlock() as MutatorItemBlock | null;
            }
        },

        /** Modify this block to have the correct number of inputs */
        updateShape_: function (this: ObjectNewBlock): void {
            const workspace = this.workspace;

            // Add new inputs.
            for (let i = 0; i < this.itemCount_; i++) {
                let input = this.getInput(`ATTR_${i}`);

                if (!input) {
                    input = this.appendValueInput(`ATTR_${i}`).setAlign(inputs.Align.RIGHT);
                    input.appendField(this.attributes_[i]);
                } else {
                    (input.fieldRow[0] as FieldTextInput).setValue(this.attributes_[i]);
                }

                setTimeout(
                    __input => {
                        if (!__input.connection?.isConnected()) {
                            const _shadow = workspace.newBlock('text') as BlockSvg;
                            _shadow.setShadow(true);
                            _shadow.initSvg();
                            _shadow.render();
                            (_shadow.outputConnection as Connection).connect(__input.connection as Connection);
                        }
                    },
                    100,
                    input,
                );
            }
            // Remove deleted inputs.
            for (let i = this.itemCount_; this.getInput(`ATTR_${i}`); i++) {
                this.removeInput(`ATTR_${i}`);
            }
        },
    };

    javascriptGenerator.forBlock['object_new'] = function (block: Block): [string, Order] {
        const objectBlock = block as ObjectNewBlock;
        const attributes = [];
        for (let n = 0; n < objectBlock.itemCount_; n++) {
            const vAttribute = javascriptGenerator.valueToCode(block, `ATTR_${n}`, Order.COMMA);
            if (vAttribute) {
                attributes.push(`${quote(objectBlock.attributes_[n])}: ${vAttribute}`);
            }
        }

        return [`{ ${attributes.length ? attributes.join(', ') : ''} }`, Order.ATOMIC];
    };

    // --- set attribute --------------------------------------------------
    Blockly.Object.blocks['object_set_attr'] =
        '<block type="object_set_attr">' +
        '  <field name="ATTR">attribute1</field>' +
        '  <value name="VALUE">' +
        '    <shadow type="text">' +
        '      <field name="TEXT">value</field>' +
        '    </shadow>' +
        '  </value>' +
        '</block>';

    Blocks['object_set_attr'] = {
        init: function (this: Block): void {
            this.appendDummyInput('ATTR')
                .appendField(translate('object_set_attr'))
                .appendField(new FieldTextInput('attribute1'), 'ATTR');

            this.appendValueInput('OBJECT').appendField(translate('object_set_attr_object'));

            this.appendValueInput('VALUE').setCheck(null).appendField(translate('object_set_attr_value'));

            this.setInputsInline(false);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.Object.HUE);

            this.setTooltip(translate('object_set_attr_tooltip'));
        },
    };

    javascriptGenerator.forBlock['object_set_attr'] = function (block: Block): string {
        const fAttr = block.getFieldValue('ATTR');
        const vValue = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC);

        let vObject = javascriptGenerator.valueToCode(block, 'OBJECT', Order.ATOMIC);
        if (!vObject) {
            vObject = '{}';
        }

        return `((obj) => { if (typeof obj === 'object') { obj[${quote(fAttr)}] = ${vValue}; } })(${vObject});\n`;
    };

    // --- delete attribute --------------------------------------------------
    Blockly.Object.blocks['object_del_attr'] =
        '<block type="object_del_attr">' + '  <field name="ATTR">attribute1</field>' + '</block>';

    Blocks['object_del_attr'] = {
        init: function (this: Block): void {
            this.appendDummyInput('ATTR')
                .appendField(translate('object_del_attr'))
                .appendField(new FieldTextInput('attribute1'), 'ATTR');

            this.appendValueInput('OBJECT').appendField(translate('object_del_attr_object'));

            this.setInputsInline(false);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.Object.HUE);

            this.setTooltip(translate('object_del_attr_tooltip'));
        },
    };

    javascriptGenerator.forBlock['object_del_attr'] = function (block: Block): string {
        const fAttr = block.getFieldValue('ATTR');

        let vObject = javascriptGenerator.valueToCode(block, 'OBJECT', Order.ATOMIC);
        if (!vObject) {
            vObject = '{}';
        }

        return `((obj) => { if (typeof obj === 'object') { delete obj[${quote(fAttr)}]; } })(${vObject});\n`;
    };

    // --- has attribute --------------------------------------------------
    Blockly.Object.blocks['object_has_attr'] =
        '<block type="object_has_attr">' +
        '  <field name="ATTR">attribute1</field>' +
        '  <value name="OBJECT">' +
        '    <shadow type="get_object">' +
        '      <field name="OID">Object ID</field>' +
        '    </shadow>' +
        '  </value>' +
        '</block>';

    Blocks['object_has_attr'] = {
        init: function (this: Block): void {
            this.appendValueInput('OBJECT').appendField(translate('object_has_attr'));

            this.appendDummyInput('ATTR')
                .appendField(translate('object_has_attr_attr'))
                .appendField(new FieldTextInput('attribute1'), 'ATTR');

            this.setInputsInline(true);
            this.setOutput(true, 'Boolean');

            this.setColour(Blockly.Object.HUE);

            this.setTooltip(translate('object_has_attr_tooltip'));
        },
    };

    javascriptGenerator.forBlock['object_has_attr'] = function (block: Block): [string, Order] {
        const vObject = javascriptGenerator.valueToCode(block, 'OBJECT', Order.ATOMIC);
        const fAttr = block.getFieldValue('ATTR');

        return [`Object.prototype.hasOwnProperty.call(${vObject}, ${quote(fAttr)})`, Order.ATOMIC];
    };

    // --- object keys --------------------------------------------------
    Blockly.Object.blocks['object_keys'] =
        '<block type="object_keys">' +
        '  <value name="OBJECT">' +
        '    <shadow type="get_object">' +
        '      <field name="OID">Object ID</field>' +
        '    </shadow>' +
        '  </value>' +
        '</block>';

    Blocks['object_keys'] = {
        init: function (this: Block): void {
            this.appendValueInput('OBJECT').appendField(translate('object_keys'));

            this.setInputsInline(true);
            this.setOutput(true, 'Array');

            this.setColour(Blockly.Object.HUE);
            this.setTooltip(translate('object_keys_tooltip'));
        },
    };

    javascriptGenerator.forBlock['object_keys'] = function (block: Block): [string, Order] {
        let fObject = javascriptGenerator.valueToCode(block, 'OBJECT', Order.ATOMIC);

        if (!fObject) {
            fObject = '{}';
        }

        return [`Object.keys(${fObject})`, Order.ATOMIC];
    };
}

