/**
 * Trigger blocks - converted from `public/google-blockly/own/blocks_trigger.js`.
 *
 * See `blocks_number.ts` for the conversion pattern. This was the last and largest of the block
 * files; three kinds of duplication were folded into one definition each:
 *
 * - the "trigger inside a trigger" warning, which eight blocks carried identically
 *   (now `warnIfInsideTrigger()` in `helpers.ts`)
 * - the "must sit inside a trigger" warning of the five value blocks
 *   (`warnIfNotNestedIn()`, shared with `blocks_action.ts`)
 * - the condition and ack dropdowns of `on` and `on_ext`
 *
 * `on_ext.updateShape_` is the most delicate piece of the whole migration: it takes the statement
 * input out of `inputList`, rebuilds the object-ID inputs, re-adds the two dropdowns and appends
 * the statement input again, so that the inputs keep their order. It is converted as it was.
 */
import {
    Blocks,
    FieldCheckbox,
    FieldDropdown,
    FieldTextInput,
    Msg,
    Names,
    icons,
    type Block,
    type BlockSvg,
    type Connection,
    type Field,
    type Input,
    type Workspace,
} from 'blockly/core';
import { javascriptGenerator, Order } from 'blockly/javascript';

import { FieldCRON } from './field_cron';
import { FieldOID } from './field_oid';
import { isTrue, objectNameById, objectNameOf, quote, reconnectChild, warnIfInsideTrigger, warnIfNotNestedIn } from './helpers';

/** The `on_ext` block remembers how many object IDs it shows */
type OnExtBlock = Block & {
    itemCount_: number;
    updateShape_: () => void;
};

/** A block inside a mutator remembers which value connection it stood for */
type MutatorItemBlock = Block & {
    valueConnection_?: Connection | null;
};

/** The cron builder remembers its two mutation flags */
type CronBuilderBlock = Block & {
    seconds_: boolean;
    as_line_: boolean;
    updateShape_: (withSeconds: boolean) => void;
};

/** A block that owns a named schedule */
type ScheduleBlock = Block & {
    isSchedule_?: boolean;
};

function safeName(block: Block): string {
    const names = javascriptGenerator.nameDB_ as unknown as { safeName: (name: string) => string };

    return names.safeName(block.getFieldValue('NAME'));
}

export function install(): void {
    const Blockly = window.Blockly;
    const translate = Blockly.Translate;
    const getHelp = window.getHelp;

    Blockly.CustomBlocks = Blockly.CustomBlocks || [];
    Blockly.CustomBlocks.push('Trigger');

    /** All named schedules present in the workspace, as dropdown options */
    const getAllSchedules = (workspace: Workspace): [string, string][] => {
        const result: [string, string][] = [];

        // Iterate through every block and check the name.
        for (const block of workspace.getAllBlocks() as ScheduleBlock[]) {
            if (block.isSchedule_) {
                const name = block.getFieldValue('NAME');
                result.push([name, name]);
            }
        }

        // BF(2020.05.16): for back compatibility. Remove it after 5 years
        if (window.scripts.loading) {
            for (const v of workspace.getVariableMap().getVariablesOfType('')) {
                if (!result.find(it => it[0] === v.getName())) {
                    result.push([v.getName(), v.getName()]);
                }
            }
        }

        for (const v of workspace.getVariableMap().getVariablesOfType('cron')) {
            if (!result.find(it => it[0] === v.getName())) {
                result.push([v.getName(), v.getName()]);
            }
        }

        if (!result.length) {
            result.push(['', '']);
        }

        return result;
    };


    Blockly.Trigger = {
        HUE: 330,
        getAllSchedules,
        blocks: {},
        WARNING_PARENTS: [
            // trigger blocks
            'on',
            'on_ext',
            'schedule',
            'schedule_by_id',
            'schedule_create',
            'astro',
            'onMessage',
            'onFile',
            'onLog',
            'onEnumMembers',
            // timeouts
            'timeouts_setinterval',
            'timeouts_setinterval_variable',
            // loops
            'controls_repeat_ext',
            'controls_repeat_ext',
            'controls_for',
            'controls_forEach',
        ],
    };

    const conditionOptions = (): [string, string][] => [
        [translate('on_onchange'), 'ne'],
        [translate('on_any'), 'any'],
        [translate('on_gt'), 'gt'],
        [translate('on_ge'), 'ge'],
        [translate('on_lt'), 'lt'],
        [translate('on_le'), 'le'],
        [translate('on_true'), 'true'],
        [translate('on_false'), 'false'],
    ];

    const ackConditionOptions = (): [string, string][] => [
        [translate('on_ack_any'), ''],
        [translate('on_ack_true'), 'true'],
        [translate('on_ack_false'), 'false'],
    ];

    /** `val: true` for the two boolean conditions, `change: '…'` for the rest */
    const conditionCode = (condition: string): string =>
        condition === 'true' || condition === 'false' ? `val: ${condition}` : `change: '${condition}'`;

    /** The two variables every state trigger opens its callback with */
    const valuePrelude = (): string =>
        `${javascriptGenerator.prefixLines('let value = obj.state.val;', javascriptGenerator.INDENT)}\n` +
        `${javascriptGenerator.prefixLines('let oldValue = obj.oldState.val;', javascriptGenerator.INDENT)}\n`;

    /** Connects a shadow block to an input that is still empty, once the block is rendered */
    const attachShadow = (workspace: Workspace, input: Input, type: string, field?: [string, string]): void => {
        setTimeout(() => {
            if (!input.connection?.isConnected()) {
                const shadow = workspace.newBlock(type) as BlockSvg;
                shadow.setShadow(true);
                if (field) {
                    shadow.setFieldValue(field[1], field[0]);
                }
                shadow.outputConnection!.connect(input.connection as Connection);
                shadow.initSvg();
                shadow.render();
            }
        }, 100);
    };

    /**
     * Registers a block that reads one attribute of the surrounding trigger's callback.
     *
     * @param type Block type
     * @param prefix The symbol in front of the dropdown
     * @param options The dropdown choices
     * @param parentTypes The trigger blocks it may sit in
     * @param warning Translation key of the warning shown when it does not
     * @param colour Block colour
     * @param help Translation key of the documentation link, if any
     */
    const installValueBlock = (
        type: string,
        prefix: string,
        options: [string, string][],
        parentTypes: string[],
        warning: string,
        colour: number,
        help?: string,
    ): void => {
        Blocks[type] = {
            init: function (this: Block): void {
                this.appendDummyInput().appendField(prefix);

                this.appendDummyInput('ATTR').appendField(new FieldDropdown(options), 'ATTR');

                this.setInputsInline(true);
                this.setOutput(true);

                this.setColour(colour);

                this.setTooltip(translate(`${type}_tooltip`));
                if (help) {
                    this.setHelpUrl(getHelp(help));
                }
            },

            onchange: function (this: Block): void {
                warnIfNotNestedIn(this, parentTypes, warning);
            },

            FUNCTION_TYPES: parentTypes,
        };
    };

    // --- ON Extended -----------------------------------------------------------
    Blockly.Trigger.blocks['on_ext'] =
        '<block type="on_ext">' +
        '  <mutation items="1"></mutation>' +
        '  <field name="CONDITION">ne</field>' +
        '  <field name="ACK_CONDITION"></field>' +
        '  <value name="OID0">' +
        '    <shadow type="field_oid">' +
        '    </shadow>' +
        '  </value>' +
        '</block>';

    Blocks['on_ext_oid_container'] = {
        /** Mutator block for container */
        init: function (this: Block): void {
            this.appendDummyInput().appendField(translate('on_ext_on'));

            this.appendStatementInput('STACK');

            this.setColour(Blockly.Trigger.HUE);

            this.setTooltip(translate('on_ext_on_tooltip'));
            this.contextMenu = false;
        },
    };

    Blocks['on_ext_oid'] = {
        /** Mutator block for add items */
        init: function (this: Block): void {
            this.appendDummyInput('OID').appendField(translate('on_ext_oid'));

            this.setPreviousStatement(true);
            this.setNextStatement(true);

            this.setColour(Blockly.Trigger.HUE);

            this.setTooltip(translate('on_ext_oid_tooltip'));

            this.contextMenu = false;
        },
    };

    Blocks['on_ext'] = {
        init: function (this: OnExtBlock): void {
            this.itemCount_ = 1;
            this.setMutator(new icons.MutatorIcon(['on_ext_oid'], this as unknown as BlockSvg));

            this.setInputsInline(false);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.Trigger.HUE);

            this.setTooltip(translate('on_ext_tooltip'));
            this.setHelpUrl(getHelp('on_help'));
        },

        /** Create XML to represent number of text inputs */
        mutationToDom: function (this: OnExtBlock): Element {
            const container = document.createElement('mutation');
            container.setAttribute('items', String(this.itemCount_));

            return container;
        },

        /** Parse XML to restore the text inputs */
        domToMutation: function (this: OnExtBlock, xmlElement: Element): void {
            this.itemCount_ = parseInt(xmlElement.getAttribute('items') as string, 10);
            this.updateShape_();
        },

        /** Populate the mutator's dialog with this block's components */
        decompose: function (this: OnExtBlock, workspace: Workspace): Block {
            const containerBlock = workspace.newBlock('on_ext_oid_container') as BlockSvg;
            containerBlock.initSvg();

            let connection = containerBlock.getInput('STACK')?.connection as Connection;
            for (let i = 0; i < this.itemCount_; i++) {
                const itemBlock = workspace.newBlock('on_ext_oid') as BlockSvg;
                itemBlock.initSvg();
                connection.connect(itemBlock.previousConnection as Connection);
                connection = itemBlock.nextConnection as Connection;
            }

            return containerBlock;
        },

        /** Reconfigure this block based on the mutator dialog's components */
        compose: function (this: OnExtBlock, containerBlock: Block): void {
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
                const connection = this.getInput(`OID${k}`)?.connection?.targetConnection;
                if (connection && !connections.includes(connection)) {
                    connection.disconnect();
                }
            }

            this.itemCount_ = connections.length;
            if (this.itemCount_ < 1) {
                this.itemCount_ = 1;
            }
            this.updateShape_();

            // Reconnect any child blocks.
            for (let i = 0; i < this.itemCount_; i++) {
                reconnectChild(connections[i], this, `OID${i}`);
            }
        },

        /** Store pointers to any connected child blocks */
        saveConnections: function (this: OnExtBlock, containerBlock: Block): void {
            let itemBlock = containerBlock.getInputTargetBlock('STACK') as MutatorItemBlock | null;
            let i = 0;

            while (itemBlock) {
                itemBlock.valueConnection_ = this.getInput(`OID${i}`)?.connection?.targetConnection;
                i++;
                itemBlock = itemBlock.nextConnection?.targetBlock() as MutatorItemBlock | null;
            }
        },

        /**
         * Modify this block to have the correct number of inputs.
         *
         * The two dropdowns and the statement input have to end up behind the object IDs, so they
         * are taken out and re-added. The statement input is moved through `inputList` directly,
         * because re-adding it would drop the blocks connected to it.
         */
        updateShape_: function (this: OnExtBlock): void {
            let conditionValue;
            if (this.getInput('CONDITION')) {
                conditionValue = this.getFieldValue('CONDITION');
                this.removeInput('CONDITION');
            }

            let conditionAckValue;
            if (this.getInput('ACK_CONDITION')) {
                conditionAckValue = this.getFieldValue('ACK_CONDITION');
                this.removeInput('ACK_CONDITION');
            }

            let statementInput: Input | undefined;
            for (let j = 0; this.inputList[j]; j++) {
                if (this.inputList[j].name === 'STATEMENT') {
                    statementInput = this.inputList[j];
                    this.inputList.splice(j, 1);
                    break;
                }
            }

            // Add new inputs.
            const wp = this.workspace;

            let i;
            for (i = 0; i < this.itemCount_; i++) {
                let input = this.getInput(`OID${i}`);

                if (!input) {
                    input = this.appendValueInput(`OID${i}`);

                    if (i === 0) {
                        input.appendField(translate('on_ext'));
                    }
                }

                attachShadow(wp, input, 'field_oid');
            }

            // Remove deleted inputs.
            while (this.getInput(`OID${i}`)) {
                this.removeInput(`OID${i}`);
                i++;
            }

            this.appendDummyInput('CONDITION').appendField(new FieldDropdown(conditionOptions()), 'CONDITION');
            if (conditionValue) {
                this.setFieldValue(conditionValue, 'CONDITION'); // restore previous value
            }

            this.appendDummyInput('ACK_CONDITION')
                .appendField(translate('on_ack'))
                .appendField(new FieldDropdown(ackConditionOptions()), 'ACK_CONDITION');
            if (conditionAckValue) {
                this.setFieldValue(conditionAckValue, 'ACK_CONDITION'); // restore previous value
            }

            if (statementInput) {
                this.inputList.push(statementInput);
            } else {
                this.appendStatementInput('STATEMENT').setCheck(null);
            }
        },

        onchange: function (this: Block): void {
            warnIfInsideTrigger(this);
        },
    };

    javascriptGenerator.forBlock['on_ext'] = function (block: Block): string {
        const extBlock = block as OnExtBlock;
        const val = conditionCode(block.getFieldValue('CONDITION'));
        const fAckCondition = block.getFieldValue('ACK_CONDITION');

        const oids: string[] = [];
        for (let n = 0; n < extBlock.itemCount_; n++) {
            let id = javascriptGenerator.valueToCode(block, `OID${n}`, Order.COMMA);
            if (id) {
                id = id.toString();
                if (id.startsWith(`'`) && id.endsWith(`'`)) {
                    id = `[${id}]`;
                }
                if (!oids.includes(id)) {
                    oids.push(id);
                }
            }
        }

        const oid = `[].concat(${oids.join(').concat(')})`;
        const statement = javascriptGenerator.statementToCode(block, 'STATEMENT');

        return (
            `on({ id: ${oid}, ${val}${fAckCondition ? `, ack: ${fAckCondition}` : ''} }, async (obj) => {\n` +
            `${oids.length === 1 ? valuePrelude() : ''}${statement}});\n`
        );
    };

    // --- ON -----------------------------------------------------------
    Blockly.Trigger.blocks['on'] =
        '<sep gap="5"></sep>' +
        '<block type="on">' +
        '  <field name="CONDITION">ne</field>' +
        '  <field name="ACK_CONDITION"></field>' +
        '</block>';

    Blocks['on'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField(translate('on'));

            this.appendDummyInput('OID').appendField(new FieldOID(translate('select_id'), 'state'), 'OID');

            this.appendDummyInput('CONDITION').appendField(new FieldDropdown(conditionOptions()), 'CONDITION');

            this.appendDummyInput('ACK_CONDITION')
                .appendField(translate('on_ack'))
                .appendField(new FieldDropdown(ackConditionOptions()), 'ACK_CONDITION');

            this.appendStatementInput('STATEMENT').setCheck(null);

            this.setInputsInline(false);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.Trigger.HUE);

            this.setTooltip(translate('on_tooltip'));
            this.setHelpUrl(getHelp('on_help'));
        },

        onchange: function (this: Block): void {
            warnIfInsideTrigger(this);
        },
    };

    javascriptGenerator.forBlock['on'] = function (block: Block): string {
        const fObjId = block.getFieldValue('OID');
        const val = conditionCode(block.getFieldValue('CONDITION'));
        const fAckCondition = block.getFieldValue('ACK_CONDITION');

        Msg.VARIABLES_DEFAULT_NAME = 'value';

        const objectName = objectNameById(fObjId);
        const statement = javascriptGenerator.statementToCode(block, 'STATEMENT');

        return (
            `on({ id: '${fObjId}'${objectName ? ` /* ${objectName} */` : ''}, ${val}${fAckCondition ? `, ack: ${fAckCondition}` : ''} }, async (obj) => {\n` +
            `${valuePrelude()}${statement}});\n`
        );
    };

    // --- get info about event -----------------------------------------------------------
    Blockly.Trigger.blocks['on_source'] =
        '<sep gap="5"></sep>' + '<block type="on_source">' + '  <field name="ATTR">state.val</field>' + '</block>';

    installValueBlock(
        'on_source',
        '↪',
        [
            [translate('on_source_state_val'), 'state.val'],
            [translate('on_source_state_ts'), 'state.ts'],
            [translate('on_source_state_q'), 'state.q'],
            [translate('on_source_state_from'), 'state.from'],
            [translate('on_source_state_ack'), 'state.ack'],
            [translate('on_source_state_lc'), 'state.lc'],
            [translate('on_source_state_c'), 'state.c'],
            [translate('on_source_state_user'), 'state.user'],
            [translate('on_source_id'), 'id'],
            [translate('on_source_name'), 'common.name'],
            [translate('on_source_desc'), 'common.desc'],
            [translate('on_source_channel_id'), 'channelId'],
            [translate('on_source_channel_name'), 'channelName'],
            [translate('on_source_device_id'), 'deviceId'],
            [translate('on_source_device_name'), 'deviceName'],
            [translate('on_source_oldstate_val'), 'oldState.val'],
            [translate('on_source_oldstate_ts'), 'oldState.ts'],
            [translate('on_source_oldstate_q'), 'oldState.q'],
            [translate('on_source_oldstate_from'), 'oldState.from'],
            [translate('on_source_oldstate_ack'), 'oldState.ack'],
            [translate('on_source_oldstate_lc'), 'oldState.lc'],
            [translate('on_source_oldstate_c'), 'oldState.c'],
            [translate('on_source_oldstate_user'), 'oldState.user'],
        ],
        ['on', 'on_ext', 'onEnumMembers'],
        'on_source_warning',
        Blockly.Trigger.HUE,
        'on_help',
    );

    javascriptGenerator.forBlock['on_source'] = function (block: Block): [string, Order] {
        const fAttr = block.getFieldValue('ATTR');
        const parts = fAttr.split('.');

        // a nested attribute is guarded, because the object may not carry it
        return [parts.length > 1 ? `(obj.${parts[0]} ? obj.${fAttr} : '')` : `obj.${fAttr}`, Order.ATOMIC];
    };

    // --- acknowledge -----------------------------------------------------------
    Blockly.Trigger.blocks['on_ack_value'] = '<sep gap="5"></sep>' + '<block type="on_ack_value">' + '</block>';

    Blocks['on_ack_value'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField(`↪ ${translate('on_ack_value')}`);

            this.setInputsInline(false);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.Trigger.HUE);

            this.setTooltip(translate('on_ack_value_tooltip'));
            this.setHelpUrl(getHelp('on_help'));
        },

        onchange: function (this: Block): void {
            warnIfNotNestedIn(this, ['on', 'on_ext', 'onEnumMembers'], 'on_ack_value_warning');
        },

        FUNCTION_TYPES: ['on', 'on_ext', 'onEnumMembers'],
    };

    javascriptGenerator.forBlock['on_ack_value'] = function (): string {
        return (
            'if (obj.id && obj?.state && !obj.state.ack) {\n' +
            `${javascriptGenerator.prefixLines('await setStateAsync(obj.id, { val: obj.state.val, ack: true });', javascriptGenerator.INDENT)}\n}\n`
        );
    };

    // --- ASTRO -----------------------------------------------------------
    Blockly.Trigger.blocks['astro'] =
        '<block type="astro">' + '  <field name="TYPE">sunrise</field>' + '  <field name="OFFSET">0</field>' + '</block>';

    Blocks['astro'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField(translate('astro'));

            this.appendDummyInput('TYPE').appendField(
                new FieldDropdown([
                    [translate('astro_sunriseText'), 'sunrise'],
                    [translate('astro_sunriseEndText'), 'sunriseEnd'],
                    [translate('astro_goldenHourEndText'), 'goldenHourEnd'],
                    [translate('astro_solarNoonText'), 'solarNoon'],
                    [translate('astro_goldenHourText'), 'goldenHour'],
                    [translate('astro_sunsetStartText'), 'sunsetStart'],
                    [translate('astro_sunsetText'), 'sunset'],
                    [translate('astro_duskText'), 'dusk'],
                    [translate('astro_nauticalDuskText'), 'nauticalDusk'],
                    [translate('astro_nightText'), 'night'],
                    [translate('astro_nightEndText'), 'nightEnd'],
                    [translate('astro_nauticalDawnText'), 'nauticalDawn'],
                    [translate('astro_dawnText'), 'dawn'],
                    [translate('astro_nadirText'), 'nadir'],
                ]),
                'TYPE',
            );

            this.appendDummyInput().appendField(translate('astro_offset'));

            this.appendDummyInput('OFFSET').appendField(new FieldTextInput('0'), 'OFFSET');

            this.appendDummyInput().appendField(translate('astro_minutes'));

            this.appendStatementInput('STATEMENT').setCheck(null);

            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.Trigger.HUE);

            this.setTooltip(translate('astro_tooltip'));
            this.setHelpUrl(getHelp('astro_help'));
        },

        onchange: function (this: Block): void {
            warnIfInsideTrigger(this);
        },
    };

    javascriptGenerator.forBlock['astro'] = function (block: Block): string {
        const fType = block.getFieldValue('TYPE');
        const fOffset = parseInt(block.getFieldValue('OFFSET'), 10);
        const statement = javascriptGenerator.statementToCode(block, 'STATEMENT');

        return `schedule({ astro: '${fType}', shift: ${fOffset} }, async () => {\n${statement}});\n`;
    };

    // --- SCHEDULE -----------------------------------------------------------
    Blockly.Trigger.blocks['schedule'] =
        '<block type="schedule">' + '  <field name="SCHEDULE">* * * * *</field>' + '</block>';

    Blocks['schedule'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField(translate('schedule'));

            this.appendDummyInput('SCHEDULE').appendField(new FieldCRON('* * * * *'), 'SCHEDULE');

            this.appendStatementInput('STATEMENT').setCheck(null);

            this.setInputsInline(false);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.Trigger.HUE);

            this.setTooltip(translate('schedule_tooltip'));
            this.setHelpUrl(getHelp('schedule_help'));
        },

        onchange: function (this: Block): void {
            warnIfInsideTrigger(this);
        },
    };

    javascriptGenerator.forBlock['schedule'] = function (block: Block): string {
        const fSchedule = block.getFieldValue('SCHEDULE');
        const statement = javascriptGenerator.statementToCode(block, 'STATEMENT');
        // a JSON schedule carries double quotes itself, so it is wrapped in single ones
        const quoted = fSchedule.startsWith('{') ? `'${fSchedule}'` : `"${fSchedule}"`;

        return `schedule(${quoted}, async () => {\n${statement}});\n`;
    };

    // --- SCHEDULE BY ID -----------------------------------------------------
    Blockly.Trigger.blocks['schedule_by_id'] =
        '<block type="schedule_by_id">' + '  <field name="ACK_CONDITION"></field>' + '</block>';

    Blocks['schedule_by_id'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField(translate('schedule_by_id'));

            this.appendDummyInput('OID').appendField(new FieldOID(translate('select_id'), 'state'), 'OID');

            this.appendDummyInput('ACK_CONDITION')
                .appendField(translate('on_ack'))
                .appendField(new FieldDropdown(ackConditionOptions()), 'ACK_CONDITION');

            this.appendStatementInput('STATEMENT').setCheck(null);

            this.setInputsInline(false);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.Trigger.HUE);

            this.setTooltip(translate('schedule_by_id_tooltip'));
            this.setHelpUrl(getHelp('schedule_by_id_help'));
        },
    };

    javascriptGenerator.forBlock['schedule_by_id'] = function (block: Block): string {
        const fObjId = block.getFieldValue('OID');
        const fAckCondition = block.getFieldValue('ACK_CONDITION');
        const statement = javascriptGenerator.statementToCode(block, 'STATEMENT');
        const objectName = objectNameById(fObjId);

        return (
            `scheduleById('${fObjId}'${objectName ? ` /* ${objectName} */` : ''}${fAckCondition ? `, ${fAckCondition}` : ''}, async () => {\n` +
            `${statement}});\n`
        );
    };

    // --- set named schedule -----------------------------------------------------------
    Blockly.Trigger.blocks['schedule_create'] =
        '<block type="schedule_create">' +
        '  <field name="NAME">schedule</field>' +
        '  <value name="SCHEDULE">' +
        '    <shadow type="field_cron">' +
        '    </shadow>' +
        '  </value>' +
        '</block>';

    /** Does this schedule have a legal name? "schedule" itself is reserved. */
    const isLegalName = (name: string, workspace: Workspace, exclude?: Block): boolean => {
        if (name === 'schedule') {
            return false;
        }

        for (const block of workspace.getAllBlocks() as ScheduleBlock[]) {
            if (block === exclude) {
                continue;
            }
            if (block.isSchedule_ && Names.equals(block.getFieldValue('NAME'), name)) {
                return false;
            }
        }
        return true;
    };

    /** Ensure two identically-named schedules don't exist */
    const findLegalName = (name: string, block: Block): string => {
        if (block.isInFlyout) {
            // Flyouts can have multiple schedules called 'schedule'.
            return name;
        }
        while (!isLegalName(name, block.workspace, block)) {
            // Collision with another schedule.
            const r = name.match(/^(.*?)(\d+)$/);
            if (!r) {
                name += '1';
            } else {
                name = r[1] + (parseInt(r[2], 10) + 1);
            }
        }
        return name;
    };

    /** Rename a schedule. Called by the editable field. */
    const rename = function (this: Field, name: string): string {
        // Strip leading and trailing whitespace. Beyond this, all names are legal.
        return findLegalName(name.replace(/^[\s\xa0]+|[\s\xa0]+$/g, ''), this.getSourceBlock() as Block);
    };

    Blocks['schedule_create'] = {
        init: function (this: Block): void {
            const nameField = new FieldTextInput(findLegalName('schedule', this), rename);
            nameField.setSpellcheck(false);

            this.appendDummyInput('NAME')
                .appendField(translate('schedule_create'))
                .appendField(nameField, 'NAME');

            this.appendValueInput('SCHEDULE').appendField(translate('schedule_text'));

            this.appendStatementInput('STATEMENT').setCheck(null);

            this.setInputsInline(false);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.Trigger.HUE);

            this.setTooltip(translate('schedule_create_tooltip'));
            this.setHelpUrl(getHelp('schedule_create_help'));
        },
        isSchedule_: true,
        getVars: function (this: Block): string[] {
            return [this.getFieldValue('NAME')];
        },
        getVarModels: function (this: Block): { getId: () => string; name: string; type: string }[] {
            const name = this.getFieldValue('NAME');
            return [{ getId: () => name, name, type: 'cron' }];
        },
    };

    javascriptGenerator.forBlock['schedule_create'] = function (block: Block): string {
        const fName = safeName(block);
        const vSchedule = javascriptGenerator.valueToCode(block, 'SCHEDULE', Order.ATOMIC);
        const statement = javascriptGenerator.statementToCode(block, 'STATEMENT');

        return `${fName} = schedule(${vSchedule}, async () => {\n${statement}});\n`;
    };

    // --- clearSchedule -----------------------------------------------------------
    Blockly.Trigger.blocks['schedule_clear'] =
        '<sep gap="5"></sep>' + '<block type="schedule_clear">' + '  <field name="NAME"></field>' + '</block>';

    Blocks['schedule_clear'] = {
        init: function (this: Block): void {
            this.appendDummyInput('NAME')
                .appendField(translate('schedule_clear'))
                .appendField(
                    new FieldDropdown(() =>
                        window.scripts?.blocklyWorkspace
                            ? getAllSchedules(window.scripts.blocklyWorkspace)
                            : [],
                    ),
                    'NAME',
                );

            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.Trigger.HUE);

            this.setTooltip(translate('schedule_clear_tooltip'));
            this.setHelpUrl(getHelp('schedule_clear_help'));
        },
    };

    javascriptGenerator.forBlock['schedule_clear'] = function (block: Block): string {
        const fName = safeName(block);

        return `(() => { if (${fName}) { clearSchedule(${fName}); ${fName} = null; }})();\n`;
    };

    // --- CRON dialog --------------------------------------------------
    Blockly.Trigger.blocks['field_cron'] =
        '<sep gap="5"></sep>' + '<block type="field_cron">' + '  <field name="CRON">* * * * *</field>' + '</block>';

    Blocks['field_cron'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField(translate('field_cron_CRON'));

            this.appendDummyInput().appendField(new FieldCRON('* * * * *'), 'CRON');

            this.setInputsInline(true);
            this.setOutput(true, 'String');

            this.setColour(Blockly.Trigger.HUE);

            this.setTooltip(translate('field_cron_tooltip'));
        },
    };

    javascriptGenerator.forBlock['field_cron'] = function (block: Block): [string, Order] {
        return [`'${block.getFieldValue('CRON')}'`, Order.ATOMIC];
    };

    // --- CRON builder --------------------------------------------------
    Blockly.Trigger.blocks['cron_builder'] =
        '<sep gap="5"></sep>' +
        '<block type="cron_builder">' +
        '  <mutation seconds="false" as_line="false"></mutation>' +
        '  <field name="LINE">FALSE</field>' +
        '  <field name="WITH_SECONDS">FALSE</field>' +
        '  <value name="DOW">' +
        '    <shadow type="text">' +
        '      <field name="TEXT">*</field>' +
        '    </shadow>' +
        '  </value>' +
        '  <value name="MONTHS">' +
        '    <shadow type="text">' +
        '      <field name="TEXT">*</field>' +
        '    </shadow>' +
        '  </value>' +
        '  <value name="DAYS">' +
        '    <shadow type="text">' +
        '      <field name="TEXT">*</field>' +
        '    </shadow>' +
        '  </value>' +
        '  <value name="HOURS">' +
        '    <shadow type="text">' +
        '      <field name="TEXT">*</field>' +
        '    </shadow>' +
        '  </value>' +
        '  <value name="MINUTES">' +
        '    <shadow type="text">' +
        '      <field name="TEXT">*</field>' +
        '    </shadow>' +
        '  </value>' +
        '</block>';

    Blocks['cron_builder'] = {
        init: function (this: CronBuilderBlock): void {
            this.appendDummyInput().appendField(translate('cron_builder_CRON'));

            this.appendDummyInput('LINE')
                .appendField(translate('cron_builder_line'))
                .appendField(
                    new FieldCheckbox('FALSE', function (this: Field, option: string | boolean): undefined {
                        this.getSourceBlock()?.setInputsInline(isTrue(option));
                    }),
                    'LINE',
                );

            const wp = this.workspace;

            for (const [name, word] of [
                ['DOW', 'cron_builder_dow'],
                ['MONTHS', 'cron_builder_month'],
                ['DAYS', 'cron_builder_day'],
                ['HOURS', 'cron_builder_hour'],
                ['MINUTES', 'cron_builder_minutes'],
            ]) {
                const input = this.appendValueInput(name).appendField(translate(word));
                attachShadow(wp, input, 'text', ['TEXT', '*']);
            }

            this.appendDummyInput('WITH_SECONDS')
                .appendField(translate('cron_builder_with_seconds'))
                .appendField(
                    new FieldCheckbox('FALSE', function (this: Field, option: string | boolean): undefined {
                        (this.getSourceBlock() as CronBuilderBlock).updateShape_(isTrue(option));
                    }),
                    'WITH_SECONDS',
                );

            this.seconds_ = false;
            this.as_line_ = false;

            this.setInputsInline(this.as_line_);
            this.setOutput(true, 'String');

            this.setColour(Blockly.Trigger.HUE);

            this.setTooltip(translate('field_cron_tooltip'));
        },

        /** Create XML to represent the number of text inputs */
        mutationToDom: function (this: CronBuilderBlock): Element {
            const container = document.createElement('mutation');
            container.setAttribute('seconds', String(this.seconds_));
            container.setAttribute('as_line', String(this.as_line_));

            return container;
        },

        /** Parse XML to restore the text inputs */
        domToMutation: function (this: CronBuilderBlock, xmlElement: Element): void {
            this.seconds_ = xmlElement.getAttribute('seconds') === 'true';
            this.as_line_ = xmlElement.getAttribute('as_line') === 'true';

            this.setInputsInline(this.as_line_);
            this.updateShape_(this.seconds_);
        },

        updateShape_: function (this: CronBuilderBlock, withSeconds: boolean): void {
            this.seconds_ = withSeconds;

            if (withSeconds) {
                if (!this.getInput('SECONDS')) {
                    const input = this.appendValueInput('SECONDS').appendField(translate('cron_builder_seconds'));
                    attachShadow(this.workspace, input, 'text', ['TEXT', '*']);
                }
            } else if (this.getInput('SECONDS')) {
                this.removeInput('SECONDS');
            }
        },
    };

    javascriptGenerator.forBlock['cron_builder'] = function (block: Block): [string, Order] {
        const part = (name: string): string => javascriptGenerator.valueToCode(block, name, Order.ATOMIC);
        const fWithSeconds = block.getFieldValue('WITH_SECONDS');

        // the SECONDS input only exists while the mutation is on
        const vSeconds = fWithSeconds && block.getInput('SECONDS') ? part('SECONDS') : '0';

        const code =
            (isTrue(fWithSeconds) ? `${vSeconds}.toString().trim() + ' ' + ` : '') +
            `${part('MINUTES')}.toString().trim() + ' ' + ` +
            `${part('HOURS')}.toString().trim() + ' ' + ` +
            `${part('DAYS')}.toString().trim() + ' ' + ` +
            `${part('MONTHS')}.toString().trim() + ' ' + ` +
            `${part('DOW')}.toString().trim()`;

        return [code, Order.ATOMIC];
    };

    // --- onMessage -----------------------------------------------------------
    Blockly.Trigger.blocks['onMessage'] =
        '<block type="onMessage">' + '  <field name="MESSAGE">customMessage</field>' + '</block>';

    Blocks['onMessage'] = {
        init: function (this: Block): void {
            this.appendDummyInput('NAME').appendField(`✉️ ${translate('onMessage')}`);

            this.appendDummyInput('MESSAGE')
                .appendField(translate('onMessage_message'))
                .appendField(new FieldTextInput('customMessage'), 'MESSAGE');

            this.appendStatementInput('STATEMENT').setCheck(null);

            this.setInputsInline(false);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.Trigger.HUE);

            this.setTooltip(translate('onMessage_tooltip'));
            this.setHelpUrl(getHelp('onMessage_help'));
        },

        onchange: function (this: Block): void {
            warnIfInsideTrigger(this);
        },
    };

    javascriptGenerator.forBlock['onMessage'] = function (block: Block): string {
        const fMessage = block.getFieldValue('MESSAGE');
        const statement = javascriptGenerator.statementToCode(block, 'STATEMENT');

        return (
            `onMessage(${quote(fMessage)}, async (data, callback) => {\n${statement}` +
            `${javascriptGenerator.prefixLines(`typeof callback === 'function' && callback({ result: true }); // default callback`, javascriptGenerator.INDENT)}\n});\n`
        );
    };

    // --- onMessage_data -----------------------------------------------------------
    Blockly.Trigger.blocks['onMessage_data'] =
        '<sep gap="5"></sep>' + '<block type="onMessage_data">' + '  <field name="ATTR">data</field>' + '</block>';

    installValueBlock(
        'onMessage_data',
        '✉️ ',
        [[translate('onMessage_data_data'), 'data']],
        ['onMessage'],
        'onMessage_data_warning',
        Blockly.Action.HUE,
        'onMessage_data_help',
    );

    javascriptGenerator.forBlock['onMessage_data'] = function (block: Block): [string, Order] {
        return [block.getFieldValue('ATTR'), Order.ATOMIC];
    };

    // --- onFile -----------------------------------------------------------
    Blockly.Trigger.blocks['onFile'] =
        '<block type="onFile">' +
        '  <field name="WITH_FILE">FALSE</field>' +
        '  <value name="OID">' +
        '    <shadow type="field_oid_meta">' +
        '      <field name="oid">0_userdata.0</field>' +
        '    </shadow>' +
        '  </value>' +
        '  <value name="FILE">' +
        '    <shadow type="text">' +
        '      <field name="TEXT">*</field>' +
        '    </shadow>' +
        '  </value>' +
        '</block>';

    Blocks['onFile'] = {
        init: function (this: Block): void {
            this.appendValueInput('OID').appendField(`📁 ${translate('onFile')}`).setCheck(null);

            this.appendValueInput('FILE').appendField(translate('onFile_file')).setCheck(null);

            this.appendDummyInput('WITH_FILE_INPUT')
                .appendField(translate('onFile_withFile'))
                .appendField(new FieldCheckbox('FALSE'), 'WITH_FILE');

            this.appendStatementInput('STATEMENT').setCheck(null);

            this.setInputsInline(false);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.Trigger.HUE);

            this.setTooltip(translate('onFile_tooltip'));
            this.setHelpUrl(getHelp('onFile_help'));
        },

        onchange: function (this: Block): void {
            warnIfInsideTrigger(this);
        },
    };

    javascriptGenerator.forBlock['onFile'] = function (block: Block): string {
        const vObjId = javascriptGenerator.valueToCode(block, 'OID', Order.ATOMIC);
        const vFile = javascriptGenerator.valueToCode(block, 'FILE', Order.ATOMIC);
        const fWithFile = block.getFieldValue('WITH_FILE');
        const statement = javascriptGenerator.statementToCode(block, 'STATEMENT');
        const objectName = objectNameOf(vObjId);

        return (
            `onFile(${vObjId}${objectName ? ` /* ${objectName} */` : ''}, ${vFile}, ${fWithFile === 'TRUE' ? 'true' : 'false'}, ` +
            `async (id, fileName, size, data, mimeType) => {\n${statement}});\n`
        );
    };

    // --- onFile_data -----------------------------------------------------------
    Blockly.Trigger.blocks['onFile_data'] =
        '<sep gap="5"></sep>' + '<block type="onFile_data">' + '  <field name="ATTR">data</field>' + '</block>';

    installValueBlock(
        'onFile_data',
        '📁',
        [
            [translate('onFile_data_data'), 'data'],
            [translate('onFile_data_filename'), 'fileName'],
            [translate('onFile_data_size'), 'size'],
            [translate('onFile_data_mimeType'), 'mimeType'],
            [translate('onFile_data_id'), 'id'],
            [translate('onFile_data_tempFile'), 'TEMP_FILE_PATH'],
        ],
        ['onFile'],
        'onFile_data_warning',
        Blockly.Trigger.HUE,
    );

    javascriptGenerator.forBlock['onFile_data'] = function (block: Block): [string, Order] {
        const fAttr = block.getFieldValue('ATTR');

        if (fAttr === 'TEMP_FILE_PATH') {
            return [`createTempFile(fileName, data)`, Order.ATOMIC];
        }

        return [fAttr, Order.ATOMIC];
    };

    // --- offFile -----------------------------------------------------------
    Blockly.Trigger.blocks['offFile'] =
        '<sep gap="5"></sep>' +
        '<block type="offFile">' +
        '  <value name="OID">' +
        '    <shadow type="field_oid_meta">' +
        '      <field name="oid">0_userdata.0</field>' +
        '    </shadow>' +
        '  </value>' +
        '  <value name="FILE">' +
        '    <shadow type="text">' +
        '      <field name="TEXT">*</field>' +
        '    </shadow>' +
        '  </value>' +
        '</block>';

    Blocks['offFile'] = {
        init: function (this: Block): void {
            this.appendValueInput('OID').appendField(`📁 ${translate('offFile')}`).setCheck(null);

            this.appendValueInput('FILE').appendField(translate('onFile_file')).setCheck(null);

            this.setInputsInline(false);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.Trigger.HUE);

            this.setTooltip(translate('offFile_tooltip'));
            this.setHelpUrl(getHelp('offFile_help'));
        },
    };

    javascriptGenerator.forBlock['offFile'] = function (block: Block): string {
        const vObjId = javascriptGenerator.valueToCode(block, 'OID', Order.ATOMIC);
        const vFile = javascriptGenerator.valueToCode(block, 'FILE', Order.ATOMIC);
        const objectName = objectNameOf(vObjId);

        return `offFile(${vObjId}${objectName ? ` /* ${objectName} */` : ''}, ${vFile});\n`;
    };

    // --- onLog -----------------------------------------------------------
    Blockly.Trigger.blocks['onLog'] = '<block type="onLog">' + '  <field name="Severity">error</field>' + '</block>';

    Blocks['onLog'] = {
        init: function (this: Block): void {
            this.appendDummyInput('TEXT').appendField(`💬 ${translate('onLog')}`);

            this.appendDummyInput('Severity')
                .appendField(translate('loglevel'))
                .appendField(
                    new FieldDropdown([
                        [translate('loglevel_error'), 'error'],
                        [translate('loglevel_warn'), 'warn'],
                        [translate('loglevel_info'), 'info'],
                        [translate('loglevel_debug'), 'debug'],
                        [translate('loglevel_all'), '*'],
                    ]),
                    'Severity',
                );

            this.appendStatementInput('STATEMENT').setCheck(null);

            this.setInputsInline(false);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.Trigger.HUE);

            this.setTooltip(translate('onLog_tooltip'));
            this.setHelpUrl(getHelp('onLog_help'));
        },

        onchange: function (this: Block): void {
            warnIfInsideTrigger(this);
        },
    };

    javascriptGenerator.forBlock['onLog'] = function (block: Block): string {
        const statement = javascriptGenerator.statementToCode(block, 'STATEMENT');

        return `onLog('${block.getFieldValue('Severity')}', async (data) => {\n${statement}});\n`;
    };

    // --- onLog_data -----------------------------------------------------------
    Blockly.Trigger.blocks['onLog_data'] =
        '<sep gap="5"></sep>' + '<block type="onLog_data">' + '  <field name="ATTR">data.message</field>' + '</block>';

    installValueBlock(
        'onLog_data',
        '💬 ',
        [
            [translate('onLog_data_message'), 'data.message'],
            [translate('loglevel'), 'data.severity'],
            [translate('onLog_data_from'), 'data.from'],
            [translate('onLog_data_ts'), 'data.ts'],
        ],
        ['onLog'],
        'onLog_data_warning',
        Blockly.Trigger.HUE,
    );

    javascriptGenerator.forBlock['onLog_data'] = function (block: Block): [string, Order] {
        return [block.getFieldValue('ATTR'), Order.ATOMIC];
    };

    // --- onEnumMembers -----------------------------------------------------------
    Blockly.Trigger.blocks['onEnumMembers'] = '<block type="onEnumMembers">' + '</block>';

    Blocks['onEnumMembers'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField(translate('onEnumMembers'));

            this.appendDummyInput('OID').appendField(new FieldOID(translate('select_id'), 'enum'), 'OID');

            this.appendStatementInput('STATEMENT').setCheck(null);

            this.setInputsInline(false);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.Trigger.HUE);

            this.setTooltip(translate('onEnumMembers_tooltip'));
            this.setHelpUrl(getHelp('onEnumMembers_help'));
        },

        onchange: function (this: Block): void {
            warnIfInsideTrigger(this);
        },
    };

    javascriptGenerator.forBlock['onEnumMembers'] = function (block: Block): string {
        const fObjId = block.getFieldValue('OID');
        const statement = javascriptGenerator.statementToCode(block, 'STATEMENT');
        const objectName = objectNameById(fObjId);

        return (
            `onEnumMembers('${fObjId}'${objectName ? ` /* ${objectName} */` : ''}, async (obj) => {\n` +
            `${valuePrelude()}${statement}});\n`
        );
    };
}
