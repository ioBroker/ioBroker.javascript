/**
 * Procedure blocks - converted from `public/google-blockly/own/blocks_procedures.js`.
 *
 * See `blocks_number.ts` for the conversion pattern.
 *
 * This file is unusual in two ways:
 *
 * - It *overrides* the standard procedure blocks of Blockly, so that the generated functions are
 *   `async`. Their snapshots therefore live in `golden/core.txt`, not in `golden/procedures.txt`.
 * - The four custom blocks reuse the mixin methods of the standard blocks by copying them off
 *   `Blocks['procedures_defreturn']` and friends. Those methods are not part of the public typings,
 *   so they are read through `coreBlock()`.
 */
import {
    Blocks,
    FieldTextInput,
    Msg,
    Procedures,
    icons,
    utils,
    type Block,
    type BlockSvg,
    type Connection,
    type Workspace,
} from 'blockly/core';
import { javascriptGenerator, Order } from 'blockly/javascript';

import { b64DecodeUnicode, FieldScript } from './field_script';

/** A procedure definition block with its argument bookkeeping */
type ProcedureBlock = Block & {
    arguments_: string[];
    argumentVarModels_: unknown[];
    paramIds_?: string[];
    statementConnection_?: Connection | null;
    hasReturnValue_?: boolean;
    model?: unknown;
    setStatements_: (has: boolean) => void;
    updateParams_: () => void;
    getProcedureDef: () => [string, string[], boolean, boolean];
};

/**
 * The mixin methods of the standard procedure blocks. Blockly does not type them, but the custom
 * blocks have always been built by copying them.
 *
 * @param type Type of the standard block
 */
function coreBlock(type: string): Record<string, any> {
    return Blocks[type] as unknown as Record<string, any>;
}

export function install(): void {
    const Blockly = window.Blockly;
    const translate = Blockly.Translate;
    const xmlUtils = utils.xml;

    const ifReturn = coreBlock('procedures_ifreturn');
    if (!ifReturn.FUNCTION_TYPES.includes('procedures_defcustomreturn')) {
        ifReturn.FUNCTION_TYPES.push('procedures_defcustomreturn');
    }
    if (!ifReturn.FUNCTION_TYPES.includes('procedures_defcustomnoreturn')) {
        ifReturn.FUNCTION_TYPES.push('procedures_defcustomnoreturn');
    }

    // derived from core/procedures.js
    /**
     * Find all user-created procedure definitions in a workspace, the custom ones included.
     *
     * @param root Root workspace
     * @returns four arrays: procedures without and with return value, then the custom ones
     */
    Blockly.Procedures.allProceduresNew = function (root: Workspace): [string, string[], boolean][][] {
        const result = Procedures.allProcedures(root) as unknown as [string, string[], boolean][][];

        const fromModel = (): [string, string[], boolean][] =>
            root
                .getProcedureMap()
                .getProcedures()
                .filter(p => !!p.getReturnTypes())
                .map(p => [p.getName(), p.getParameters().map(pa => pa.getName()), true]);

        const collect = (type: string): [string, string[], boolean][] => {
            const procedures = fromModel();

            root.getBlocksByType(type, false).forEach(b => {
                if (!Procedures.isProcedureBlock(b)) {
                    procedures.push((b as ProcedureBlock).getProcedureDef() as unknown as [string, string[], boolean]);
                }
            });

            return procedures;
        };

        return result.concat([collect('procedures_defcustomnoreturn'), collect('procedures_defcustomreturn')]);
    };

    /**
     * Construct the blocks required by the flyout for the procedure category.
     *
     * @param workspace The workspace containing procedures
     */
    Blockly.Procedures.flyoutCategoryNew = function (workspace: Workspace): Element[] {
        const xmlList: Element[] = [];

        /** A definition block with its name pre-filled */
        const addDefinition = (type: string, messageKey: string): void => {
            if (!Blocks[type]) {
                return;
            }
            const block = xmlUtils.createElement('block');
            block.setAttribute('type', type);
            block.setAttribute('gap', '16');
            const nameField = xmlUtils.createElement('field');
            nameField.setAttribute('name', 'NAME');
            nameField.appendChild(xmlUtils.createTextNode(Msg[messageKey]));
            block.appendChild(nameField);
            xmlList.push(block);
        };

        /** A block without any field */
        const addPlain = (type: string): void => {
            if (!Blocks[type]) {
                return;
            }
            const block = xmlUtils.createElement('block');
            block.setAttribute('type', type);
            block.setAttribute('gap', '16');
            xmlList.push(block);
        };

        addDefinition('procedures_defnoreturn', 'PROCEDURES_DEFNORETURN_PROCEDURE');
        addDefinition('procedures_defreturn', 'PROCEDURES_DEFRETURN_PROCEDURE');
        addPlain('procedures_ifreturn');
        addPlain('procedures_return');
        addDefinition('procedures_defcustomnoreturn', 'PROCEDURES_DEFNORETURN_PROCEDURE');
        addDefinition('procedures_defcustomreturn', 'PROCEDURES_DEFRETURN_PROCEDURE');

        if (xmlList.length) {
            // Add slightly larger gap between system blocks and user calls.
            xmlList[xmlList.length - 1].setAttribute('gap', '24');
        }

        /**
         * Add items to xmlList for each listed procedure.
         *
         * @param procedureList Procedures, each defined by name, parameter list and return flag
         * @param templateName The type of the block to generate
         */
        const populateProcedures = (procedureList: [string, string[], boolean][], templateName: string): void => {
            for (const [name, args] of procedureList) {
                const block = xmlUtils.createElement('block');
                block.setAttribute('type', templateName);
                block.setAttribute('gap', '16');
                const mutation = xmlUtils.createElement('mutation');
                mutation.setAttribute('name', name);
                block.appendChild(mutation);
                for (const arg of args) {
                    const argElement = xmlUtils.createElement('arg');
                    argElement.setAttribute('name', arg);
                    mutation.appendChild(argElement);
                }
                xmlList.push(block);
            }
        };

        const tuple = Blockly.Procedures.allProceduresNew(workspace);
        populateProcedures(tuple[0], 'procedures_callnoreturn');
        populateProcedures(tuple[1], 'procedures_callreturn');
        populateProcedures(tuple[2], 'procedures_callcustomnoreturn');
        populateProcedures(tuple[3], 'procedures_callcustomreturn');

        return xmlList;
    };

    // ---------------------- patch for async functions ------------------------------
    // taken from javascript/procedures.js
    // https://github.com/google/blockly/blob/blockly-v10.1.3/generators/javascript/procedures.js
    javascriptGenerator.forBlock['procedures_defreturn'] = function (block: Block): null {
        // Define a procedure with a return value.
        const generator = javascriptGenerator as any;
        const funcName = generator.nameDB_.getName(block.getFieldValue('NAME'), Procedures.CATEGORY_NAME);
        let xfix1 = '';
        if (generator.STATEMENT_PREFIX) {
            xfix1 += generator.injectId(generator.STATEMENT_PREFIX, block);
        }
        if (generator.STATEMENT_SUFFIX) {
            xfix1 += generator.injectId(generator.STATEMENT_SUFFIX, block);
        }
        if (xfix1) {
            xfix1 = generator.prefixLines(xfix1, generator.INDENT);
        }
        let loopTrap = '';
        if (generator.INFINITE_LOOP_TRAP) {
            loopTrap = generator.prefixLines(generator.injectId(generator.INFINITE_LOOP_TRAP, block), generator.INDENT);
        }
        let returnValue = '';
        let xfix2 = '';
        // With `statements="false"` in the mutation the STACK input does not exist, and
        // `statementToCode` throws for a missing one - the same trap as RETURN below
        const branch = block.getInput('STACK') ? generator.statementToCode(block, 'STACK') : '';
        // `procedures_defnoreturn` has no RETURN input, and `valueToCode` throws for a missing one
        if (block.getInput('RETURN')) {
            returnValue = generator.valueToCode(block, 'RETURN', Order.NONE) || '';
            if (branch && returnValue) {
                // After executing the function body, revisit this block for the return.
                xfix2 = xfix1;
            }
            if (returnValue) {
                returnValue = `${generator.INDENT}return ${returnValue};\n`;
            }
        }

        // Blockly 13 replaced getVars() (names) by getVarModels() (models)
        const args = (block as any)
            .getVarModels()
            .map((variable: { name: string }) => generator.nameDB_.getName(variable.name, 'VARIABLE'));

        let code = `async function ${funcName}(${args.join(', ')}) {\n${xfix1}${loopTrap}${branch}${xfix2}${returnValue}}`;
        code = generator.scrub_(block, code);
        // Add % so as not to collide with helper functions in the definitions list.
        generator.definitions_[`%${funcName}`] = code;
        return null;
    };

    javascriptGenerator.forBlock['procedures_defnoreturn'] = javascriptGenerator.forBlock['procedures_defreturn'];

    javascriptGenerator.forBlock['procedures_callreturn'] = function (block: Block): [string, Order] {
        // Call a procedure with a return value.
        const generator = javascriptGenerator as any;
        const funcName = generator.nameDB_.getName(block.getFieldValue('NAME'), Procedures.CATEGORY_NAME);
        // Only the count matters here - the values come from the connected blocks.
        const args = (block as any)
            .getVarModels()
            .map((_variable: unknown, i: number) => generator.valueToCode(block, `ARG${i}`, Order.NONE) || 'null');

        return [`await ${funcName}(${args.join(', ')})`, Order.FUNCTION_CALL];
    };

    /**
     * Builds one of the two custom procedure definition blocks. They differ only in the standard
     * block they inherit from, their label, the initial script and the return flag.
     *
     * @param hasReturn whether this is the variant with a return value
     */
    const installCustomDefinition = (hasReturn: boolean): void => {
        const type = hasReturn ? 'procedures_defcustomreturn' : 'procedures_defcustomnoreturn';
        const parent = hasReturn ? 'procedures_defreturn' : 'procedures_defnoreturn';
        const core = coreBlock(parent);
        const label = hasReturn ? 'procedures_defcustomreturn_name' : 'procedures_defcustomnoreturn_name';
        const messages = hasReturn ? 'PROCEDURES_DEFRETURN' : 'PROCEDURES_DEFNORETURN';

        Blocks[type] = {
            getProcedureModel(this: ProcedureBlock) {
                return this.model;
            },
            isProcedureDef(): boolean {
                return true;
            },

            init: function (this: ProcedureBlock): void {
                const nameField = new FieldTextInput('', Procedures.rename);
                nameField.setSpellcheck(false);

                this.appendDummyInput()
                    .appendField(translate(label))
                    .appendField(nameField, 'NAME')
                    .appendField('', 'PARAMS');

                this.setMutator(new icons.MutatorIcon(['procedures_mutatorarg'], this as unknown as BlockSvg));

                const options = this.workspace.options as any;
                if ((options.comments || options.parentWorkspace?.options.comments) && Msg[`${messages}_COMMENT`]) {
                    this.setCommentText(Msg[`${messages}_COMMENT`]);
                }

                this.setStyle('procedure_blocks');
                if (!hasReturn) {
                    this.setColour(Msg['PROCEDURES_HUE']);
                }
                this.setTooltip(Msg[`${messages}_TOOLTIP`]);
                this.setHelpUrl(Msg[`${messages}_HELPURL`]);

                this.arguments_ = [];
                this.argumentVarModels_ = [];

                this.setStatements_(true);
                this.statementConnection_ = null;

                this.appendDummyInput('SCRIPT').appendField(
                    new FieldScript(hasReturn ? btoa('return 0;') : ''),
                    'SCRIPT',
                );

                this.setInputsInline(true);
                this.setStatements_(false);
            },

            setStatements_: core.setStatements_,
            updateParams_: core.updateParams_,
            mutationToDom: core.mutationToDom,
            domToMutation: core.domToMutation,

            /** Populate the mutator's dialog with this block's components */
            decompose: function (this: ProcedureBlock, workspace: Workspace): Block {
                const containerBlock = workspace.newBlock('procedures_mutatorcontainer') as BlockSvg;
                containerBlock.initSvg();

                containerBlock.getInput('STATEMENT_INPUT')?.setVisible(false);

                // Parameter list.
                let connection = containerBlock.getInput('STACK')?.connection as Connection;
                for (let i = 0; i < this.arguments_.length; i++) {
                    const paramBlock = workspace.newBlock('procedures_mutatorarg') as BlockSvg;
                    paramBlock.initSvg();
                    paramBlock.setFieldValue(this.arguments_[i], 'NAME');
                    // Store the old location.
                    (paramBlock as any).oldLocation = i;
                    connection.connect(paramBlock.previousConnection as Connection);
                    connection = paramBlock.nextConnection as Connection;
                }
                // Initialize procedure's callers with blank IDs.
                Procedures.mutateCallers(this as any);
                return containerBlock;
            },

            /**
             * Reconfigure this block based on the mutator dialog's components.
             *
             * Kept in step with `compose` of the standard block, which cannot be reused as it is:
             * it also reads the container's "STATEMENTS" checkbox and would give this block the
             * statement input it deliberately does not have - its body is the script field.
             */
            compose: function (this: ProcedureBlock, containerBlock: Block): void {
                // Parameter list.
                this.arguments_ = [];
                this.paramIds_ = [];
                this.argumentVarModels_ = [];
                let paramBlock = containerBlock.getInputTargetBlock('STACK');
                // An insertion marker is the preview of a block still being dragged, not a parameter
                while (paramBlock && !paramBlock.isInsertionMarker()) {
                    const varName = paramBlock.getFieldValue('NAME');
                    this.arguments_.push(varName);
                    /*
                     * Blockly 13 dropped `Workspace.getVariable` in favour of the variable map. The
                     * call threw on the *first* parameter, and since the name had already been pushed
                     * the block was left holding exactly one - however many the dialog contained
                     * (#2368). The model is pushed even when it is null, so that `mutationToDom`,
                     * which walks the models and indexes `paramIds_` with them, stays aligned with
                     * `arguments_`.
                     */
                    this.argumentVarModels_.push(this.workspace.getVariableMap().getVariable(varName, ''));
                    this.paramIds_.push(paramBlock.id);
                    paramBlock = paramBlock.nextConnection && paramBlock.nextConnection.targetBlock();
                }
                this.updateParams_();
                Procedures.mutateCallers(this as any);
            },

            /** Name, arguments and whether this procedure returns a value */
            getProcedureDef: function (this: ProcedureBlock): [string, string[], boolean, boolean] {
                return [this.getFieldValue('NAME'), this.arguments_, hasReturn, true];
            },

            getVarModels: core.getVarModels,
            renameVarById: core.renameVarById,
            updateVarName: core.updateVarName,
            displayRenamedVar_: core.displayRenamedVar_,
            customContextMenu: core.customContextMenu,
            callType_: hasReturn ? 'procedures_callcustomreturn' : 'procedures_callcustomnoreturn',
        };
    };

    /**
     * Builds one of the two custom call blocks, entirely from the mixins of the standard one.
     *
     * @param hasReturn whether this is the variant with a return value
     */
    const installCustomCall = (hasReturn: boolean): void => {
        const type = hasReturn ? 'procedures_callcustomreturn' : 'procedures_callcustomnoreturn';
        const core = coreBlock(hasReturn ? 'procedures_callreturn' : 'procedures_callnoreturn');

        Blocks[type] = {
            init: core.init,
            getProcedureCall: core.getProcedureCall,
            renameProcedure: core.renameProcedure,
            setProcedureParameters_: core.setProcedureParameters_,
            updateShape_: core.updateShape_,
            mutationToDom: core.mutationToDom,
            domToMutation: core.domToMutation,
            getVarModels: core.getVarModels,
            onchange: core.onchange,
            customContextMenu: core.customContextMenu,
            defType_: hasReturn ? 'procedures_defcustomreturn' : 'procedures_defcustomnoreturn',
        };
    };

    // ---------------------- custom function with return ------------------------------
    installCustomDefinition(true);

    javascriptGenerator.forBlock['procedures_defcustomreturn'] = function (block: Block): null {
        // Define a procedure whose body is a hand-written script.
        const generator = javascriptGenerator as any;
        const funcName = generator.nameDB_.getName(block.getFieldValue('NAME'), Procedures.CATEGORY_NAME);

        const args = (block as ProcedureBlock).arguments_.map(name => generator.nameDB_.getName(name, 'VARIABLE'));

        const script = b64DecodeUnicode(block.getFieldValue('SCRIPT') || '');
        const lines = script.split('\n').map(line => `    ${line}`);

        let code = `async function ${funcName}(${args.join(', ')}) {\n${lines.join('\n')}\n}`;

        code = generator.scrub_(block, code);
        // Add % so as not to collide with helper functions in definitions list.
        generator.definitions_[`%${funcName}`] = code;

        return null;
    };

    installCustomCall(true);
    javascriptGenerator.forBlock['procedures_callcustomreturn'] = javascriptGenerator.forBlock['procedures_callreturn'];

    // This was modified, so the shadow condition block is created in the init function
    coreBlock('procedures_ifreturn').init = function (this: Block & { hasReturnValue_: boolean }): void {
        const input = this.appendValueInput('CONDITION').setCheck('Boolean').appendField(Msg['CONTROLS_IF_MSG_IF']);

        const shadow = this.workspace.newBlock('logic_boolean');
        shadow.setShadow(true);
        shadow.setFieldValue('TRUE', 'BOOL');
        shadow.outputConnection!.connect(input.connection!);

        this.appendValueInput('VALUE').appendField(Msg['PROCEDURES_DEFRETURN_RETURN']);
        this.setInputsInline(true);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setStyle('procedure_blocks');
        this.setTooltip(Msg['PROCEDURES_IFRETURN_TOOLTIP']);
        this.setHelpUrl(Msg['PROCEDURES_IFRETURN_HELPURL']);
        this.hasReturnValue_ = true;
    };

    // ---------------------- custom function with no return ------------------------------
    installCustomDefinition(false);
    Blocks['procedures_defcustomnoreturn'].decompose = Blocks['procedures_defcustomreturn'].decompose;
    Blocks['procedures_defcustomnoreturn'].compose = Blocks['procedures_defcustomreturn'].compose;

    javascriptGenerator.forBlock['procedures_defcustomnoreturn'] =
        javascriptGenerator.forBlock['procedures_defcustomreturn'];

    installCustomCall(false);

    javascriptGenerator.forBlock['procedures_callcustomnoreturn'] = function (block: Block): string {
        // Generated code for a function call as a statement is the same as a function call as a
        // value, with the addition of a line ending.
        const tuple = javascriptGenerator.forBlock['procedures_callcustomreturn'](block, javascriptGenerator) as [
            string,
            Order,
        ];

        return `${tuple[0]};\n`;
    };

    // ---------------------- return ------------------------------
    Blocks['procedures_return'] = {
        /** Block for conditionally returning a value from a procedure */
        init: function (this: Block & { hasReturnValue_: boolean }): void {
            this.appendValueInput('VALUE').appendField(Msg['PROCEDURES_DEFRETURN_RETURN']);
            this.setInputsInline(true);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setStyle('procedure_blocks');
            this.setTooltip(Msg['PROCEDURES_IFRETURN_TOOLTIP']);
            this.setHelpUrl(Msg['PROCEDURES_IFRETURN_HELPURL']);
            this.hasReturnValue_ = true;
        },

        /** Create XML to represent whether this block has a return value */
        mutationToDom: function (this: Block & { hasReturnValue_: boolean }): Element {
            const container = xmlUtils.createElement('mutation');
            container.setAttribute('value', String(Number(this.hasReturnValue_)));
            return container;
        },

        /** Parse XML to restore whether this block has a return value */
        domToMutation: function (this: Block & { hasReturnValue_: boolean }, xmlElement: Element): void {
            this.hasReturnValue_ = xmlElement.getAttribute('value') === '1';
            if (!this.hasReturnValue_) {
                this.removeInput('VALUE');
                this.appendDummyInput('VALUE').appendField(Msg['PROCEDURES_DEFRETURN_RETURN']);
            }
        },

        // This block does not need JSO serialization hooks (saveExtraState and loadExtraState)
        // because the state of this block is already encoded in the block's position in the
        // workspace. XML hooks are kept for backwards compatibility.

        /**
         * Called whenever anything on the workspace changes.
         * Add warning if this flow block is not nested inside a loop.
         *
         * @param e Move event
         */
        onchange: function (this: Block & { hasReturnValue_: boolean; FUNCTION_TYPES: string[] }, e: any): void {
            if ((this.workspace as any).isDragging?.() || (e.type !== 'move' && e.type !== 'create')) {
                return; // Don't change state at the start of a drag.
            }
            let legal = false;
            // Is the block nested in a procedure?
            let block: Block | null = this;
            do {
                if (this.FUNCTION_TYPES.includes(block.type)) {
                    legal = true;
                    break;
                }
                block = block.getSurroundParent();
            } while (block);

            if (legal) {
                // If needed, toggle whether this block has a return value.
                if (block!.type === 'procedures_defnoreturn' && this.hasReturnValue_) {
                    this.removeInput('VALUE');
                    this.appendDummyInput('VALUE').appendField(Msg['PROCEDURES_DEFRETURN_RETURN']);
                    this.hasReturnValue_ = false;
                } else if (block!.type === 'procedures_defreturn' && !this.hasReturnValue_) {
                    this.removeInput('VALUE');
                    this.appendValueInput('VALUE').appendField(Msg['PROCEDURES_DEFRETURN_RETURN']);
                    this.hasReturnValue_ = true;
                }
                this.setWarningText(null);
            } else {
                this.setWarningText(Msg['PROCEDURES_IFRETURN_WARNING']);
            }

            if (!this.isInFlyout) {
                // There is no need to record the enable/disable change on the undo/redo list since
                // the change will be automatically recreated when replayed.
                this.setDisabledReason(!legal, 'UNPARENTED_IFRETURN');
            }
        },

        /**
         * List of block types that are functions and thus do not need warnings.
         * To add a new function type add this to your code:
         * Blocks['procedures_ifreturn'].FUNCTION_TYPES.push('custom_func');
         */
        FUNCTION_TYPES: [
            'procedures_defnoreturn',
            'procedures_defreturn',
            'procedures_defcustomreturn',
            'procedures_defcustomnoreturn',
        ],
    };

    javascriptGenerator.forBlock['procedures_return'] = function (block: Block, generator: any): string {
        // Conditionally return value from a procedure.
        let code = '';
        if (generator.STATEMENT_SUFFIX) {
            // Inject any statement suffix here since the regular one at the end will not get
            // executed if the return is triggered.
            code += generator.prefixLines(generator.injectId(generator.STATEMENT_SUFFIX, block), generator.INDENT);
        }
        if ((block as Block & { hasReturnValue_?: boolean }).hasReturnValue_) {
            const value = generator.valueToCode(block, 'VALUE', Order.NONE) || 'null';
            code += `${generator.INDENT}return ${value};\n`;
        } else {
            code += `${generator.INDENT}return;\n`;
        }
        return code;
    };
}
