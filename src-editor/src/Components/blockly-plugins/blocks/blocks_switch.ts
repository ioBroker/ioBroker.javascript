/**
 * Switch/case blocks - converted from `public/google-blockly/own/blocks_switch.js`.
 *
 * Taken from here: https://groups.google.com/forum/#!topic/blockly/djhO2jUb0Xs
 * I really tried to get the license conditions from authors, but no luck :(
 * Many thanks to Florian Pechwitz <florian.Pechwitz@itizzimo.com> for the code
 *
 * See `blocks_number.ts` for the conversion pattern. This is the first converted mutator, so the
 * block's own bookkeeping properties get explicit types instead of living untyped on `this`.
 */
import { Blocks, icons, type Block, type BlockSvg, type Connection, type Workspace } from 'blockly/core';
import { javascriptGenerator, Order } from 'blockly/javascript';

/** The switch block remembers how many cases and whether a default branch exists */
type SwitchCaseBlock = Block & {
    caseCount_: number;
    defaultCount_: number;
};

/** The blocks inside the mutator remember which connection they stood for */
type MutatorCaseBlock = Block & {
    valueConnection_?: Connection | null;
    statementConnection_?: Connection | null;
};

export function install(): void {
    const translate = window.Blockly.Translate;

    Blocks['logic_switch_case'] = {
        init: function (this: SwitchCaseBlock): void {
            this.appendValueInput('CONDITION').appendField(translate('logic_switch_case_is'));

            this.appendValueInput('CASECONDITION0').appendField(translate('logic_switch_case_of'));

            this.appendStatementInput('CASE0').appendField(translate('logic_switch_do'));

            this.setMutator(new icons.MutatorIcon(['case_incaseof', 'case_default'], this as unknown as BlockSvg));

            this.setPreviousStatement(true);
            this.setNextStatement(true);

            this.setColour('%{BKY_LOGIC_HUE}');

            this.setTooltip(translate('logic_switch_tooltip'));

            this.caseCount_ = 0;
            this.defaultCount_ = 0;
        },

        mutationToDom: function (this: SwitchCaseBlock): Element | null {
            if (!this.caseCount_ && !this.defaultCount_) {
                return null;
            }

            const container = document.createElement('mutation');

            if (this.caseCount_) {
                container.setAttribute('case', String(this.caseCount_));
            }

            if (this.defaultCount_) {
                container.setAttribute('default', '1');
            }
            return container;
        },

        domToMutation: function (this: SwitchCaseBlock, xmlElement: Element): void {
            this.caseCount_ = parseInt(xmlElement.getAttribute('case') as string, 10);
            this.defaultCount_ = parseInt(xmlElement.getAttribute('default') as string, 10);

            for (let x = 1; x <= this.caseCount_; x++) {
                this.appendValueInput(`CASECONDITION${x}`).appendField(translate('logic_switch_case_of'));
                this.appendStatementInput(`CASE${x}`).appendField(translate('logic_switch_do'));
            }

            if (this.defaultCount_) {
                this.appendStatementInput('ONDEFAULT').appendField('default');
            }
        },

        decompose: function (this: SwitchCaseBlock, workspace: Workspace): Block {
            const containerBlock = workspace.newBlock('control_case') as BlockSvg;
            containerBlock.initSvg();

            let connection = containerBlock.getInput('STACK')?.connection as Connection;

            for (let x = 1; x <= this.caseCount_; x++) {
                const caseBlock = workspace.newBlock('case_incaseof') as BlockSvg;
                caseBlock.initSvg();
                connection.connect(caseBlock.previousConnection as Connection);
                connection = caseBlock.nextConnection as Connection;
            }

            if (this.defaultCount_) {
                const defaultBlock = workspace.newBlock('case_default') as BlockSvg;
                defaultBlock.initSvg();
                connection.connect(defaultBlock.previousConnection as Connection);
            }

            return containerBlock;
        },

        compose: function (this: SwitchCaseBlock, containerBlock: Block): void {
            // Disconnect all input blocks and remove all inputs.
            if (this.defaultCount_) {
                this.removeInput('ONDEFAULT');
            }

            this.defaultCount_ = 0;

            for (let x = this.caseCount_; x > 0; x--) {
                this.removeInput(`CASECONDITION${x}`);
                this.removeInput(`CASE${x}`);
            }

            this.caseCount_ = 0;

            let caseBlock = containerBlock.getInputTargetBlock('STACK') as MutatorCaseBlock | null;

            while (caseBlock) {
                switch (caseBlock.type) {
                    case 'case_incaseof': {
                        this.caseCount_++;
                        const caseconditionInput = this.appendValueInput(
                            `CASECONDITION${this.caseCount_}`,
                        ).appendField(translate('logic_switch_case_of'));

                        const caseInput = this.appendStatementInput(`CASE${this.caseCount_}`).appendField(
                            translate('logic_switch_do'),
                        );

                        if (caseBlock.valueConnection_) {
                            caseconditionInput.connection?.connect(caseBlock.valueConnection_);
                        }

                        if (caseBlock.statementConnection_) {
                            caseInput.connection?.connect(caseBlock.statementConnection_);
                        }
                        break;
                    }

                    case 'case_default': {
                        this.defaultCount_++;
                        const defaultInput = this.appendStatementInput('ONDEFAULT').appendField('default');

                        if (caseBlock.statementConnection_) {
                            defaultInput.connection?.connect(caseBlock.statementConnection_);
                        }
                        break;
                    }

                    default:
                        throw 'Unknown block type.';
                }

                caseBlock = (caseBlock.nextConnection &&
                    caseBlock.nextConnection.targetBlock()) as MutatorCaseBlock | null;
            }
        },

        saveConnections: function (this: SwitchCaseBlock, containerBlock: Block): void {
            let caseBlock = containerBlock.getInputTargetBlock('STACK') as MutatorCaseBlock | null;
            let x = 1;
            while (caseBlock) {
                switch (caseBlock.type) {
                    case 'case_incaseof': {
                        const caseconditionInput = this.getInput(`CASECONDITION${x}`);
                        const caseInput = this.getInput(`CASE${x}`);

                        caseBlock.valueConnection_ = caseconditionInput?.connection?.targetConnection;
                        caseBlock.statementConnection_ = caseInput?.connection?.targetConnection;
                        x++;
                        break;
                    }
                    case 'case_default': {
                        const defaultInput = this.getInput('ONDEFAULT');

                        caseBlock.statementConnection_ = defaultInput?.connection?.targetConnection;
                        break;
                    }
                    default:
                        throw 'Unknown block type';
                }
                caseBlock = caseBlock.nextConnection?.targetBlock() as MutatorCaseBlock | null;
            }
        },
    };

    Blocks['control_case'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField(translate('logic_switch_case_is'));

            this.appendStatementInput('STACK');

            this.setColour('%{BKY_LOGIC_HUE}');

            this.setTooltip(translate('logic_switch_control_case_tooltip'));

            this.contextMenu = false;
        },
    };

    Blocks['case_incaseof'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField(translate('logic_switch_case_of'));

            this.setPreviousStatement(true);
            this.setNextStatement(true);

            this.setColour('%{BKY_LOGIC_HUE}');

            this.setTooltip(translate('logic_switch_case_incaseof_tooltip'));

            this.contextMenu = false;
        },
    };

    Blocks['case_default'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField('default');

            this.setPreviousStatement(true);
            this.setNextStatement(false);

            this.setColour('%{BKY_LOGIC_HUE}');

            this.setTooltip(translate('logic_switch_default_tooltip'));

            this.contextMenu = false;
        },
    };

    javascriptGenerator.forBlock['logic_switch_case'] = function (block: Block): string {
        const switchBlock = block as SwitchCaseBlock;
        let code = '';
        let do_n;
        let case_n;
        const switchVariable = javascriptGenerator.valueToCode(block, 'CONDITION', Order.NONE) || null;

        if (switchVariable) {
            const pattern = /^\(?([._$\d\w"'?: ()])*\)?$/g;

            if (pattern.test(switchVariable)) {
                // Check to see if the switch is a kind of variable type
                code = `\nswitch (${switchVariable}) {\n`;
                const case_0 = javascriptGenerator.valueToCode(block, 'CASECONDITION0', Order.NONE) || null;
                const do_0 = javascriptGenerator.statementToCode(block, 'CASE0');
                code += `\tcase ${case_0}:\n${do_0}\n\t\tbreak;\n`;

                for (let n = 1; n <= switchBlock.caseCount_; n++) {
                    case_n = javascriptGenerator.valueToCode(block, `CASECONDITION${n}`, Order.NONE) || null;

                    if (case_n) {
                        do_n = javascriptGenerator.statementToCode(block, `CASE${n}`);
                        code += `\tcase ${case_n}:\n${do_n}\n\t\tbreak;\n`;
                    }
                }

                if (switchBlock.defaultCount_) {
                    do_n = javascriptGenerator.statementToCode(block, 'ONDEFAULT');
                    code += `\tdefault:\n${do_n}\n\t\tbreak;\n`;
                }

                code += '}\n';
            } else {
                alert(`logic_switch_case: ${switchVariable} is not a variable name`);
            }
        }

        return code;
    };
}
