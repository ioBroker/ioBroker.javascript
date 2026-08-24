/**
 * System blocks - converted from `public/google-blockly/own/blocks_system.js`.
 *
 * See `blocks_number.ts` for the conversion pattern.
 *
 * Three groups of duplication were folded into one definition each, and the snapshots plus
 * `fixtures/system_delayed.xml` prove the generated code is unchanged:
 *
 * - `control`, `toggle` and `update` carried the same delay mutation three times, differing only in
 *   one translation key.
 * - `get_value`, `get_value_var` and `get_value_async` share their attribute dropdown.
 * - `get_value`, `get_value_var` and `get_object` share the "not connected to a trigger" warning.
 *
 * Note that `get_object` takes its colour from `Blockly.Object` and `direct` from `Blockly.Trigger`,
 * both of which are installed *after* this file. That works because the lookup happens inside
 * `init()`, i.e. when a block is created, not while this module installs.
 */
import { Blocks, FieldCheckbox, FieldDropdown, FieldTextInput, Msg, type Block, type Field } from 'blockly/core';
import { javascriptGenerator, Order } from 'blockly/javascript';

import { FieldOID } from './field_oid';
import { isTrue, objectNameById, quote, toMilliseconds } from './helpers';

/** A block whose shape follows the "with delay" checkbox */
type DelayedBlock = Block & {
    updateShape_: (delayInput?: boolean) => void;
};

export function install(): void {
    const Blockly = window.Blockly;
    const translate = Blockly.Translate;
    const getHelp = window.getHelp;

    Blockly.CustomBlocks = Blockly.CustomBlocks || [];
    Blockly.CustomBlocks.push('System');

    Blockly.System = {
        HUE: 210,
        blocks: {},
        WARNING_PARENTS: ['on_ext'],
    };

    /** The state attributes the three "get value" blocks offer */
    const valueAttrOptions = (withUser: boolean): [string, string][] => [
        [translate('get_value_val'), 'val'],
        [translate('get_value_ack'), 'ack'],
        [translate('get_value_ts'), 'ts'],
        [translate('get_value_lc'), 'lc'],
        [translate('get_value_q'), 'q'],
        [translate('get_value_comment'), 'c'],
        [translate('get_value_from'), 'from'],
        ...(withUser ? ([[translate('get_value_user'), 'user']] as [string, string][]) : []),
        [translate('get_common_name'), 'common.name'],
        [translate('get_common_desc'), 'common.desc'],
        [translate('get_common_unit'), 'common.unit'],
        [translate('get_common_role'), 'common.role'],
        [translate('get_common_state_type'), 'common.type'],
        [translate('get_common_read'), 'common.read'],
        [translate('get_common_write'), 'common.write'],
    ];

    /** Whether an attribute is read off the object instead of the state */
    const isObjectAttr = (attr: string): boolean => attr === 'type' || attr.startsWith('common.');

    /** Warns when the block hangs directly under a trigger, where its value would be misleading */
    const warnOnTriggerParent = function (this: Block): void {
        const parent = this.getParent();

        if (parent && Blockly.System.WARNING_PARENTS.includes(parent.type)) {
            this.setWarningText(translate('false_connection_trigger_warning'), this.id);
        } else {
            this.setWarningText(null, this.id);
        }
    };

    /**
     * The delay mutation of `control`, `toggle` and `update`: a delay field with a unit and a
     * "clear running" checkbox, all three appearing together.
     *
     * @param clearRunningWord Translation key of the checkbox label
     */
    const delayMutation = (clearRunningWord: string): Record<string, any> => ({
        mutationToDom: function (this: Block): Element {
            const container = document.createElement('mutation');
            container.setAttribute('delay_input', String(isTrue(this.getFieldValue('WITH_DELAY'))));
            return container;
        },

        domToMutation: function (this: DelayedBlock, xmlElement: Element): void {
            this.updateShape_(isTrue(xmlElement.getAttribute('delay_input')));
        },

        updateShape_: function (this: Block, delayInput?: boolean): void {
            // Add or remove a delay Input.
            if (delayInput) {
                if (!this.getInput('DELAY')) {
                    this.appendDummyInput('DELAY')
                        .appendField(' ')
                        .appendField(new FieldTextInput('1000'), 'DELAY_MS')
                        .appendField(
                            new FieldDropdown([
                                [translate('control_ms'), 'ms'],
                                [translate('control_sec'), 'sec'],
                                [translate('control_min'), 'min'],
                            ]),
                            'UNIT',
                        );
                }
            } else if (this.getInput('DELAY')) {
                this.removeInput('DELAY');
            }

            if (delayInput) {
                if (!this.getInput('CLEAR_RUNNING_INPUT')) {
                    this.appendDummyInput('CLEAR_RUNNING_INPUT')
                        .appendField(translate(clearRunningWord))
                        .appendField(new FieldCheckbox(), 'CLEAR_RUNNING');
                }
            } else if (this.getInput('CLEAR_RUNNING_INPUT')) {
                this.removeInput('CLEAR_RUNNING_INPUT');
            }
        },
    });

    const withDelayField = (): FieldCheckbox =>
        new FieldCheckbox('FALSE', function (this: Field, option: string | boolean): undefined {
            (this.getSourceBlock() as DelayedBlock).updateShape_(isTrue(option));
        });

    /** The delay of a mutated block, in milliseconds */
    const delayOf = (block: Block): number =>
        toMilliseconds(block.getFieldValue('DELAY_MS'), block.getFieldValue('UNIT'));

    // --- global_var -----------------------------------------------------------
    Blockly.System.blocks['global_var'] =
        '<block type="global_var">' + '  <field name="VAR">scriptName</field>' + '</block>';

    Blocks['global_var'] = {
        init: function (this: Block): void {
            this.appendDummyInput('VAR').appendField(
                new FieldDropdown([
                    [translate('global_var_scriptname'), 'scriptName'],
                    [translate('global_var_defaultdatadir'), 'defaultDataDir'],
                    [translate('global_var_verbose'), 'verbose'],
                ]),
                'VAR',
            );

            this.setInputsInline(true);
            this.setOutput(true);

            this.setColour(Blockly.System.HUE);

            this.setTooltip(translate('global_var_tooltip'));
            this.setHelpUrl(getHelp('global_var'));
        },
    };

    javascriptGenerator.forBlock['global_var'] = function (block: Block): [string, Order] {
        return [block.getFieldValue('VAR'), Order.ATOMIC];
    };

    // --- secret (central credential store) -------------------------------------
    Blockly.System.blocks['secret'] = '<block type="secret"></block>';

    /** The credentials the adapter reported, or an empty list while none are known */
    const secretList = (): { name: string; fields: string[] }[] => window.main?.secrets || [];

    /** The credential names for the dropdown, or a placeholder if the store is empty */
    const secretNameOptions = (): [string, string][] =>
        secretList().length
            ? secretList().map(secret => [secret.name, secret.name] as [string, string])
            : [[translate('secret_no_secrets'), '']];

    /**
     * The fields of the credential the block currently points at. Falls back to the fields of the
     * two credential forms while the list is not loaded or the name is unknown, so a saved block
     * keeps its attribute instead of being reset to the first option.
     */
    const secretFieldOptions = function (this: FieldDropdown): [string, string][] {
        const name = this.getSourceBlock()?.getFieldValue('NAME');
        const fields = secretList().find(secret => secret.name === name)?.fields;

        return (fields?.length ? fields : ['key', 'login', 'password']).map(
            field => [field, field] as [string, string],
        );
    };

    Blocks['secret'] = {
        init: function (this: Block): void {
            const input = this.appendDummyInput('SECRET').appendField(translate('secret'));

            // Without a running instance the credentials are unknown - then the name is typed in,
            // the same fallback `sendto_custom` uses for the instance list
            if (secretList().length) {
                input.appendField(new FieldDropdown(secretNameOptions), 'NAME');
            } else {
                input.appendField(new FieldTextInput('CameraPassword'), 'NAME');
            }

            input.appendField(translate('secret_attr')).appendField(new FieldDropdown(secretFieldOptions), 'ATTR');

            this.setInputsInline(true);
            this.setOutput(true);

            this.setColour(Blockly.System.HUE);

            this.setTooltip(translate('secret_tooltip'));
            this.setHelpUrl(getHelp('secret_help'));
        },
    };

    javascriptGenerator.forBlock['secret'] = function (block: Block): [string, Order] {
        const name = block.getFieldValue('NAME');
        const attr = block.getFieldValue('ATTR');
        // A credential field is normally `key`, `login` or `password`, but the store allows any name
        const access = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(attr) ? `.${attr}` : `[${quote(attr)}]`;

        // Optional chaining, so a deleted credential yields undefined instead of throwing.
        // A member chain never needs parentheses around it, hence ATOMIC - the same as `get_object`.
        return [`SECRETS[${quote(name)}]?${access}`, Order.ATOMIC];
    };

    // --- Debug output --------------------------------------------------
    Blockly.System.blocks['debug'] =
        '<block type="debug">' +
        '  <field name="Severity">info</field>' +
        '  <value name="TEXT">' +
        '    <shadow type="text">' +
        '      <field name="TEXT">test</field>' +
        '    </shadow>' +
        '  </value>' +
        '</block>';

    Blocks['debug'] = {
        init: function (this: Block): void {
            this.appendValueInput('TEXT').setCheck(null).appendField(translate('debug'));

            this.appendDummyInput('Severity').appendField(
                new FieldDropdown([
                    [translate('loglevel_debug'), 'debug'],
                    [translate('loglevel_info'), 'info'],
                    [translate('loglevel_warn'), 'warn'],
                    [translate('loglevel_error'), 'error'],
                ]),
                'Severity',
            );

            this.setInputsInline(false);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.System.HUE);

            this.setTooltip(translate('debug_tooltip'));
            this.setHelpUrl(getHelp('debug_help'));
        },
    };

    javascriptGenerator.forBlock['debug'] = function (block: Block): string {
        const vText = javascriptGenerator.valueToCode(block, 'TEXT', Order.ATOMIC);

        return `console.${block.getFieldValue('Severity')}(${vText});\n`;
    };

    // --- comment --------------------------------------------------
    Blockly.System.blocks['comment'] = '<block type="comment">' + '</block>';

    Blocks['comment'] = {
        init: function (this: Block): void {
            // the multiline field is a plugin `initBlockly()` registers, so it is typed only there
            this.appendDummyInput('COMMENT').appendField(
                new Blockly.FieldMultilineInput(translate('comment')) as unknown as Field,
                'COMMENT',
            );

            this.setInputsInline(false);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour('#FFFF00');

            this.setTooltip(translate('comment_tooltip'));
        },
    };

    javascriptGenerator.forBlock['comment'] = function (block: Block): string {
        return `${javascriptGenerator.prefixLines(block.getFieldValue('COMMENT'), '// ')}\n`;
    };

    // --- control -----------------------------------------------------------
    Blockly.System.blocks['control'] =
        '<block type="control">' +
        '  <mutation delay_input="false"></mutation>' +
        '  <field name="WITH_DELAY">FALSE</field>' +
        '</block>';

    Blocks['control'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField(translate('control'));

            this.appendDummyInput('OID').appendField(new FieldOID(translate('select_id'), 'state'), 'OID');

            this.appendValueInput('VALUE').setCheck(null).appendField(translate('control_with'));

            this.appendDummyInput('WITH_DELAY')
                .appendField(translate('control_delay'))
                .appendField(withDelayField(), 'WITH_DELAY');

            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.System.HUE);

            this.setTooltip(translate('control_tooltip'));
            this.setHelpUrl(getHelp('control_help'));
        },
        ...delayMutation('control_clear_running'),
    };

    javascriptGenerator.forBlock['control'] = function (block: Block): string {
        const fObjId = block.getFieldValue('OID');

        Msg.VARIABLES_DEFAULT_NAME = 'value';

        const fDelayMs = delayOf(block);
        const fClearRunning = isTrue(block.getFieldValue('CLEAR_RUNNING'));
        const vValue = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC);
        const objectName = objectNameById(fObjId);
        const comment = objectName ? ` /* ${objectName} */` : '';

        if (isTrue(block.getFieldValue('WITH_DELAY'))) {
            return `setStateDelayed('${fObjId}'${comment}, ${vValue}, ${fDelayMs}, ${fClearRunning});\n`;
        }

        return `setState('${fObjId}'${comment}, ${vValue});\n`;
    };

    // --- toggle -----------------------------------------------------------
    Blockly.System.blocks['toggle'] =
        '<sep gap="5"></sep>' +
        '<block type="toggle">' +
        '  <mutation delay_input="false"></mutation>' +
        '  <field name="WITH_DELAY">FALSE</field>' +
        '</block>';

    Blocks['toggle'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField(translate('toggle'));

            this.appendDummyInput('OID').appendField(new FieldOID(translate('select_id'), 'state'), 'OID');

            this.appendDummyInput('WITH_DELAY')
                .appendField(translate('toggle_delay'))
                .appendField(withDelayField(), 'WITH_DELAY');

            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.System.HUE);

            this.setTooltip(translate('toggle_tooltip'));
            this.setHelpUrl(getHelp('toggle_help'));
        },
        ...delayMutation('toggle_clear_running'),
    };

    javascriptGenerator.forBlock['toggle'] = function (block: Block): string {
        const fObjId = block.getFieldValue('OID');

        Msg.VARIABLES_DEFAULT_NAME = 'value';

        const fDelayMs = delayOf(block);
        const common: any = window.main?.objects[fObjId]?.common;
        const objectType = common?.type || 'boolean';
        const objectName = objectNameById(fObjId);
        const comment = objectName ? ` /* ${objectName} */` : '';
        const fClearRunning = isTrue(block.getFieldValue('CLEAR_RUNNING'));

        let setCommand;
        if (objectType === 'number') {
            const max = common.max !== undefined ? parseFloat(common.max) : 100;
            const min = common.min !== undefined ? parseFloat(common.min) : 0;

            setCommand = `setState('${fObjId}'${comment}, state ? (state.val === ${min} ? ${max} : ${min}) : ${max});`;
        } else {
            setCommand = `setState('${fObjId}'${comment}, state ? !state.val : true);`;
        }

        // the delayed branch does not use `setCommand` - a number state is toggled as a boolean here
        const command = isTrue(block.getFieldValue('WITH_DELAY'))
            ? `setStateDelayed('${fObjId}'${comment}, state ? !state.val : true, ${fDelayMs}, ${fClearRunning});`
            : setCommand;

        return (
            `getState('${fObjId}', (err, state) => {\n` +
            `${javascriptGenerator.prefixLines(command, javascriptGenerator.INDENT)}\n});\n`
        );
    };

    // --- update -----------------------------------------------------------
    Blockly.System.blocks['update'] =
        '<sep gap="5"></sep>' +
        '<block type="update">' +
        '  <mutation delay_input="false"></mutation>' +
        '  <field name="WITH_DELAY">FALSE</field>' +
        '</block>';

    Blocks['update'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField(translate('update'));

            this.appendDummyInput('OID').appendField(new FieldOID(translate('select_id'), 'state'), 'OID');

            this.appendValueInput('VALUE').setCheck(null).appendField(translate('update_with'));

            this.appendDummyInput('WITH_DELAY')
                .appendField(translate('update_delay'))
                .appendField(withDelayField(), 'WITH_DELAY');

            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.System.HUE);

            this.setTooltip(translate('update_tooltip'));
            this.setHelpUrl(getHelp('update_help'));
        },
        // the label of the checkbox is the one of `control`, not an own translation
        ...delayMutation('control_clear_running'),
    };

    javascriptGenerator.forBlock['update'] = function (block: Block): string {
        const fObjId = block.getFieldValue('OID');

        Msg.VARIABLES_DEFAULT_NAME = 'value';

        const vValue = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC);
        const fDelay = delayOf(block);
        const fClearRunning = isTrue(block.getFieldValue('CLEAR_RUNNING'));
        const objectName = objectNameById(fObjId);
        const comment = objectName ? ` /* ${objectName} */` : '';

        if (isTrue(block.getFieldValue('WITH_DELAY'))) {
            return `setStateDelayed('${fObjId}'${comment}, ${vValue}, true, ${fDelay}, ${fClearRunning});\n`;
        }

        return `setState('${fObjId}'${comment}, ${vValue}, true);\n`;
    };

    // --- control ex -----------------------------------------------------------
    Blockly.System.blocks['control_ex'] =
        '<sep gap="5"></sep>' +
        '<block type="control_ex">' +
        '  <field name="TYPE">false</field>' +
        '  <field name="CLEAR_RUNNING">FALSE</field>' +
        '  <value name="OID">' +
        '    <shadow type="field_oid">' +
        '    </shadow>' +
        '  </value>' +
        '  <value name="VALUE">' +
        '    <shadow type="logic_boolean">' +
        '      <field name="BOOL">TRUE</field>' +
        '    </shadow>' +
        '  </value>' +
        '  <value name="DELAY_MS">' +
        '    <shadow type="math_number">' +
        '      <field name="NUM">0</field>' +
        '    </shadow>' +
        '  </value>' +
        '  <value name="EXPIRE">' +
        '    <shadow type="math_number">' +
        '      <field name="NUM">0</field>' +
        '    </shadow>' +
        '  </value>' +
        '</block>';

    Blocks['control_ex'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField(translate('control_ex'));

            this.appendValueInput('OID').setCheck('String').appendField(translate('field_oid_OID'));

            this.appendDummyInput('TYPE').appendField(
                new FieldDropdown([
                    [translate('control_ex_control'), 'false'],
                    [translate('control_ex_update'), 'true'],
                ]),
                'TYPE',
            );

            this.appendValueInput('VALUE').setCheck(null).appendField(translate('control_ex_value'));

            this.appendValueInput('DELAY_MS').setCheck('Number').appendField(translate('control_ex_delay'));

            this.appendValueInput('EXPIRE').setCheck('Number').appendField(translate('control_ex_expire'));

            this.appendDummyInput('CLEAR_RUNNING_INPUT')
                .appendField(translate('control_ex_clear_running'))
                .appendField(new FieldCheckbox(), 'CLEAR_RUNNING');

            this.setInputsInline(false);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.System.HUE);

            this.setTooltip(translate('control_tooltip'));
            this.setHelpUrl(getHelp('control_help'));
        },
    };

    javascriptGenerator.forBlock['control_ex'] = function (block: Block): string {
        const vObjId = javascriptGenerator.valueToCode(block, 'OID', Order.ATOMIC);
        const vValue = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC);
        const vDelayMs = javascriptGenerator.valueToCode(block, 'DELAY_MS', Order.ATOMIC);
        const vExpire = javascriptGenerator.valueToCode(block, 'EXPIRE', Order.ATOMIC);

        const fClearRunning = isTrue(block.getFieldValue('CLEAR_RUNNING'));
        const fType = isTrue(block.getFieldValue('TYPE'));
        const expire = vExpire ? `, expire: ${vExpire}` : '';

        return `setStateDelayed(${vObjId}, { val: ${vValue}, ack: ${fType}${expire} }, parseInt(((${vDelayMs}) || '').toString(), 10), ${fClearRunning});\n`;
    };

    // --- create state --------------------------------------------------
    Blockly.System.blocks['create'] =
        '<block type="create">' + '  <field name="NAME">0_userdata.0.example</field>' + '</block>';

    Blocks['create'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField(translate('create'));

            this.appendDummyInput('NAME')
                .appendField(translate('create_oid'))
                .appendField(new FieldTextInput('0_userdata.0.example'), 'NAME');

            const inputValue = this.appendValueInput('VALUE').setCheck(null).appendField(translate('create_init'));
            if (inputValue.connection) {
                (inputValue.connection as any)._optional = true;
            }

            const inputCommon = this.appendValueInput('COMMON').setCheck(null).appendField(translate('create_common'));
            if (inputCommon.connection) {
                (inputCommon.connection as any)._optional = true;
            }

            this.appendStatementInput('STATEMENT').setCheck(null);

            this.setInputsInline(false);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.System.HUE);

            this.setTooltip(translate('create_tooltip'));
            this.setHelpUrl(getHelp('create_help'));
        },
    };

    javascriptGenerator.forBlock['create'] = function (block: Block): string {
        const fName = block.getFieldValue('NAME');

        const vValue = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC);
        const paraV = vValue !== null && vValue !== '' ? `, ${vValue}` : '';

        const vCommon = javascriptGenerator.valueToCode(block, 'COMMON', Order.ATOMIC);
        const paraC =
            vCommon !== null && vCommon !== ''
                ? `, ((common) => typeof common !== 'object' ? JSON.parse(common) : common)(${vCommon})`
                : '';

        const statement = javascriptGenerator.statementToCode(block, 'STATEMENT');

        return `createState(${quote(fName)}${paraV}${paraC}, async () => {\n${statement}});\n`;
    };

    // --- create state ex --------------------------------------------------
    Blockly.System.blocks['create_ex'] =
        '<sep gap="5"></sep>' +
        '<block type="create_ex">' +
        '  <field name="NAME">0_userdata.0.example</field>' +
        '  <field name="TYPE">string</field>' +
        '  <field name="READABLE">FALSE</field>' +
        '  <field name="WRITEABLE">FALSE</field>' +
        '</block>';

    Blocks['create_ex'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField(translate('create'));

            this.appendDummyInput('NAME')
                .appendField(translate('create_oid'))
                .appendField(new FieldTextInput('0_userdata.0.example'), 'NAME');

            this.appendDummyInput('TYPE')
                .appendField(translate('create_type'))
                .appendField(
                    new FieldDropdown([
                        [translate('create_type_string'), 'string'],
                        [translate('create_type_number'), 'number'],
                        [translate('create_type_boolean'), 'boolean'],
                        [translate('create_type_json'), 'json'],
                        [translate('create_type_object'), 'object'],
                        [translate('create_type_array'), 'array'],
                    ]),
                    'TYPE',
                );

            const inputValue = this.appendValueInput('VALUE').setCheck(null).appendField(translate('create_init'));
            if (inputValue.connection) {
                (inputValue.connection as any)._optional = true;
            }

            this.appendDummyInput('READABLE_INPUT')
                .appendField(translate('create_readable'))
                .appendField(new FieldCheckbox('FALSE'), 'READABLE');

            this.appendDummyInput('WRITEABLE_INPUT')
                .appendField(translate('create_writeable'))
                .appendField(new FieldCheckbox('FALSE'), 'WRITEABLE');

            this.appendStatementInput('STATEMENT').setCheck(null);

            this.setInputsInline(false);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.System.HUE);

            this.setTooltip(translate('create_tooltip'));
            this.setHelpUrl(getHelp('create_help'));
        },
    };

    javascriptGenerator.forBlock['create_ex'] = function (block: Block): string {
        const fName = block.getFieldValue('NAME');
        const fType = block.getFieldValue('TYPE');

        let paraV = '';
        const vValue = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC);
        if (vValue !== null && vValue !== '') {
            if (fType === 'number') {
                paraV = `, parseFloat(${vValue})`;
            } else if (fType === 'boolean') {
                paraV = `, !!${vValue}`;
            } else if (fType === 'string') {
                paraV = `, String(${vValue})`;
            } else {
                paraV = `, ${vValue}`;
            }
        }

        const fReadable = isTrue(block.getFieldValue('READABLE'));
        const fWriteable = isTrue(block.getFieldValue('WRITEABLE'));
        const statement = javascriptGenerator.statementToCode(block, 'STATEMENT');

        return `createState(${quote(fName)}${paraV}, { type: '${fType}', read: ${fReadable}, write: ${fWriteable} }, async () => {\n${statement}});\n`;
    };

    // --- get value --------------------------------------------------
    Blockly.System.blocks['get_value'] = '<block type="get_value">' + '  <field name="ATTR">val</field>' + '</block>';

    Blocks['get_value'] = {
        init: function (this: Block): void {
            this.appendDummyInput('ATTR').appendField(new FieldDropdown(valueAttrOptions(true)), 'ATTR');

            this.appendDummyInput().appendField(translate('get_value_OID'));

            this.appendDummyInput().appendField(new FieldOID(translate('select_id'), 'state'), 'OID');

            this.setInputsInline(true);
            this.setOutput(true);

            this.setColour(Blockly.System.HUE);

            this.setTooltip(translate('get_value_tooltip'));
            this.setHelpUrl(getHelp('get_value_help'));
        },
        onchange: warnOnTriggerParent,
    };

    javascriptGenerator.forBlock['get_value'] = function (block: Block): [string, Order] {
        const fOid = block.getFieldValue('OID');
        const fAttr = block.getFieldValue('ATTR');

        if (isObjectAttr(fAttr)) {
            return [`(await getObjectAsync('${fOid}')).${fAttr}`, Order.ATOMIC];
        }

        return [`getState(${quote(fOid)}).${fAttr}`, Order.ATOMIC];
    };

    // --- get value var --------------------------------------------------
    Blockly.System.blocks['get_value_var'] =
        '<sep gap="5"></sep>' +
        '<block type="get_value_var">' +
        '  <field name="ATTR">val</field>' +
        '  <value name="OID">' +
        '    <shadow type="field_oid">' +
        '    </shadow>' +
        '  </value>' +
        '</block>';

    Blocks['get_value_var'] = {
        init: function (this: Block): void {
            this.appendDummyInput('ATTR').appendField(new FieldDropdown(valueAttrOptions(false)), 'ATTR');

            this.appendDummyInput().appendField(translate('get_value_OID'));

            this.appendValueInput('OID').setCheck(null);

            this.setInputsInline(true);
            this.setOutput(true);

            this.setColour(Blockly.System.HUE);

            this.setTooltip(translate('get_value_tooltip'));
            this.setHelpUrl(getHelp('get_value_help'));
        },
        onchange: warnOnTriggerParent,
    };

    javascriptGenerator.forBlock['get_value_var'] = function (block: Block): [string, Order] {
        const vOid = javascriptGenerator.valueToCode(block, 'OID', Order.ATOMIC);
        const fAttr = block.getFieldValue('ATTR');

        if (isObjectAttr(fAttr)) {
            return [`(await getObjectAsync(${vOid})).${fAttr}`, Order.ATOMIC];
        }

        return [`getState(${vOid}).${fAttr}`, Order.ATOMIC];
    };

    // --- get value async --------------------------------------------------
    Blockly.System.blocks['get_value_async'] =
        '<sep gap="5"></sep>' + '<block type="get_value_async">' + '  <field name="ATTR">val</field>' + '</block>';

    Blocks['get_value_async'] = {
        init: function (this: Block): void {
            this.appendDummyInput('ATTR').appendField(new FieldDropdown(valueAttrOptions(false)), 'ATTR');

            this.appendDummyInput().appendField(translate('get_value_OID'));

            this.appendDummyInput().appendField(new FieldOID(translate('select_id'), 'state'), 'OID');

            this.appendStatementInput('STATEMENT').setCheck(null);

            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.System.HUE);

            this.setTooltip(translate('get_value_tooltip'));
            this.setHelpUrl(getHelp('get_value_help'));
        },
    };

    javascriptGenerator.forBlock['get_value_async'] = function (block: Block): string {
        const fOid = block.getFieldValue('OID');
        const fAttr = block.getFieldValue('ATTR');
        const statement = javascriptGenerator.statementToCode(block, 'STATEMENT');

        const source = isObjectAttr(fAttr)
            ? { call: 'getObjectAsync', args: '(err, obj)', from: 'obj' }
            : { call: 'getState', args: '(err, state)', from: 'state' };

        return (
            `${source.call}(${quote(fOid)}, async ${source.args} => {\n` +
            `${javascriptGenerator.prefixLines(`let value = ${source.from}.${fAttr};`, javascriptGenerator.INDENT)}\n` +
            `${statement}});\n`
        );
    };

    // --- get object --------------------------------------------------
    Blockly.System.blocks['get_object'] = '<block type="get_object">' + '</block>';

    Blocks['get_object'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField(translate('get_object'));

            this.appendDummyInput().appendField(new FieldOID(translate('select_id'), 'all'), 'OID');

            this.setInputsInline(true);
            this.setOutput(true);

            // `Blockly.Object` is installed after this file, but init runs when a block is created
            this.setColour(Blockly.Object.HUE);

            this.setTooltip(translate('get_object_tooltip'));
            this.setHelpUrl(getHelp('get_object_help'));
        },

        /** Warn about a trigger parent, and about the blocks that expect a plain ID instead */
        onchange: function (this: Block): void {
            const parent = this.getParent();

            if (parent && Blockly.System.WARNING_PARENTS.includes(parent.type)) {
                this.setWarningText(translate('false_connection_trigger_warning'), this.id);
            } else if (parent && ['direct', 'control_ex', 'get_value_var'].includes(parent.type)) {
                this.setWarningText(translate('get_object_connection_warning'), this.id);
            } else {
                this.setWarningText(null, this.id);
            }
        },
    };

    javascriptGenerator.forBlock['get_object'] = function (block: Block): [string, Order] {
        return [`getObject(${quote(block.getFieldValue('OID'))})`, Order.ATOMIC];
    };

    // --- get object async --------------------------------------------------
    Blockly.System.blocks['get_object_async'] = '<sep gap="5"></sep>' + '<block type="get_object_async">' + '</block>';

    Blocks['get_object_async'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField(translate('get_object'));

            this.appendDummyInput().appendField(new FieldOID(translate('select_id'), 'all'), 'OID');

            this.appendStatementInput('STATEMENT').setCheck(null);

            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setInputsInline(true);

            this.setColour(Blockly.Object.HUE);

            this.setTooltip(translate('get_object_tooltip'));
            this.setHelpUrl(getHelp('get_object_help'));
        },
    };

    javascriptGenerator.forBlock['get_object_async'] = function (block: Block): string {
        const statement = javascriptGenerator.statementToCode(block, 'STATEMENT');

        return `getObjectAsync(${quote(block.getFieldValue('OID'))}).then(async (obj) => {\n${statement}});\n`;
    };

    // --- state exists var --------------------------------------------------
    Blockly.System.blocks['state_exists_var'] =
        '<sep gap="5"></sep>' +
        '<block type="state_exists_var">' +
        '  <value name="OID">' +
        '    <shadow type="field_oid">' +
        '    </shadow>' +
        '  </value>' +
        '</block>';

    Blocks['state_exists_var'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField(translate('state_exists'));

            this.appendValueInput('OID').setCheck(null);

            this.setInputsInline(true);
            this.setOutput(true, 'Boolean');

            this.setColour(Blockly.System.HUE);

            this.setTooltip(translate('state_exists_tooltip'));
            this.setHelpUrl(getHelp('state_exists_help'));
        },
    };

    javascriptGenerator.forBlock['state_exists_var'] = function (block: Block): [string, Order] {
        const vOid = javascriptGenerator.valueToCode(block, 'OID', Order.ATOMIC) || `''`;

        return [`(await existsStateAsync(${vOid}))`, Order.ATOMIC];
    };

    /**
     * Registers one of the three "select an object ID" blocks. They differ only in the label, the
     * kind of object the dialog offers and their toolbox entry.
     *
     * @param type Block type
     * @param label Translation key of the label
     * @param kind What the select dialog should offer
     */
    const installOidBlock = (type: string, label: string, kind: string): void => {
        Blocks[type] = {
            init: function (this: Block): void {
                this.appendDummyInput().appendField(translate(label));

                this.appendDummyInput().appendField(new FieldOID(translate('select_id'), kind), 'oid');

                this.setInputsInline(true);
                this.setOutput(true, 'String');

                this.setColour('%{BKY_TEXTS_HUE}');

                this.setTooltip(translate('field_oid_tooltip'));
            },
        };

        javascriptGenerator.forBlock[type] = function (block: Block): [string, Order] {
            return [quote(block.getFieldValue('oid')), Order.ATOMIC];
        };
    };

    Blockly.System.blocks['field_oid'] = '<block type="field_oid">' + '</block>';
    installOidBlock('field_oid', 'field_oid_OID', 'state');

    Blockly.System.blocks['field_oid_meta'] = '<sep gap="5"></sep>' + '<block type="field_oid_meta">' + '</block>';
    installOidBlock('field_oid_meta', 'field_oid_OID_meta', 'meta');

    Blockly.System.blocks['field_oid_script'] = '<sep gap="5"></sep>' + '<block type="field_oid_script">' + '</block>';
    installOidBlock('field_oid_script', 'field_oid_OID_script', 'script');

    // --- get attribute --------------------------------------------------
    Blockly.System.blocks['get_attr'] =
        '<block type="get_attr">' +
        '  <value name="PATH">' +
        '    <shadow type="text">' +
        '      <field name="TEXT">attribute1</field>' +
        '    </shadow>' +
        '  </value>' +
        '  <value name="OBJECT">' +
        '    <shadow type="get_object">' +
        '      <field name="OID">Object ID</field>' +
        '    </shadow>' +
        '  </value>' +
        '</block>';

    Blocks['get_attr'] = {
        init: function (this: Block): void {
            this.appendValueInput('PATH').setCheck(null).appendField(translate('get_attr_path'));

            this.appendValueInput('OBJECT').appendField(translate('get_attr_by'));

            this.setInputsInline(true);
            this.setOutput(true);

            this.setColour(Blockly.System.HUE);

            this.setTooltip(translate('get_attr_tooltip'));
            this.setHelpUrl(getHelp('get_attr_help'));
        },
    };

    javascriptGenerator.forBlock['get_attr'] = function (block: Block): [string, Order] {
        const vObject = javascriptGenerator.valueToCode(block, 'OBJECT', Order.ATOMIC);
        const vPath = javascriptGenerator.valueToCode(block, 'PATH', Order.ATOMIC);

        return [`getAttr(${vObject}, ${vPath})`, Order.ATOMIC];
    };

    // --- direct binding -----------------------------------------------------------
    Blockly.System.blocks['direct'] =
        '<block type="direct">' +
        '  <field name="ONLY_CHANGES">TRUE</field>' +
        '  <value name="OID_SRC">' +
        '    <shadow type="field_oid">' +
        '      <field name="oid">Object ID 1</field>' +
        '    </shadow>' +
        '  </value>' +
        '  <value name="OID_DST">' +
        '    <shadow type="field_oid">' +
        '      <field name="oid">Object ID 2</field>' +
        '    </shadow>' +
        '  </value>' +
        '</block>';

    Blocks['direct'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField(translate('direct'));

            this.appendValueInput('OID_SRC').setCheck('String').appendField(translate('direct_oid_src'));

            this.appendValueInput('OID_DST').setCheck('String').appendField(translate('direct_oid_dst'));

            this.appendDummyInput('ONLY_CHANGES')
                .appendField(translate('direct_only_changes'))
                .appendField(new FieldCheckbox('TRUE'), 'ONLY_CHANGES');

            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            // `Blockly.Trigger` is installed after this file, but init runs when a block is created
            this.setColour(Blockly.Trigger.HUE);

            this.setTooltip(translate('direct_tooltip'));
            this.setHelpUrl(getHelp('direct_help'));
        },
    };

    javascriptGenerator.forBlock['direct'] = function (block: Block): string {
        const vOidSrc = javascriptGenerator.valueToCode(block, 'OID_SRC', Order.ATOMIC);
        const vOidDst = javascriptGenerator.valueToCode(block, 'OID_DST', Order.ATOMIC);
        const fOnlyChanges = isTrue(block.getFieldValue('ONLY_CHANGES'));

        return (
            `on({ id: ${vOidSrc}, change: '${fOnlyChanges ? 'ne' : 'any'}' }, (obj) => {\n` +
            `${javascriptGenerator.prefixLines(`setState(${vOidDst}, obj.state.val);`, javascriptGenerator.INDENT)}\n});\n`
        );
    };

    // --- control instance -----------------------------------------------------------
    Blockly.System.blocks['control_instance'] =
        '<block type="control_instance">' +
        '  <field name="INSTANCE">admin.0</field>' +
        '  <field name="ACTION">restartInstanceAsync</field>' +
        '</block>';

    Blocks['control_instance'] = {
        init: function (this: Block): void {
            const options: [string, string][] = [];
            if (window.main?.instances) {
                for (const instance of window.main.instances) {
                    const id = instance.substring('system.adapter.'.length);
                    options.push([id, id]);
                }
                if (!options.length) {
                    options.push([translate('control_instance_no_instances'), '']);
                }

                this.appendDummyInput('INSTANCE')
                    .appendField(translate('control_instance'))
                    .appendField(new FieldDropdown(options), 'INSTANCE');
            } else {
                this.appendDummyInput('INSTANCE')
                    .appendField(translate('control_instance'))
                    .appendField(new FieldTextInput('adapter.0'), 'INSTANCE');
            }

            this.appendDummyInput('ACTION')
                .appendField(translate('control_instance_action'))
                .appendField(
                    new FieldDropdown([
                        [translate('control_instance_start'), 'startInstanceAsync'],
                        [translate('control_instance_stop'), 'stopInstanceAsync'],
                        [translate('control_instance_restart'), 'restartInstanceAsync'],
                    ]),
                    'ACTION',
                );

            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.System.HUE);

            this.setTooltip(translate('control_instance_tooltip'));
            this.setHelpUrl(getHelp('control_instance_help'));
        },
    };

    javascriptGenerator.forBlock['control_instance'] = function (block: Block): string {
        return `await ${block.getFieldValue('ACTION')}(${quote(block.getFieldValue('INSTANCE'))});\n`;
    };

    // --- control script -----------------------------------------------------------
    Blockly.System.blocks['control_script'] =
        '<block type="control_script">' + '  <field name="ACTION">startScriptAsync</field>' + '</block>';

    Blocks['control_script'] = {
        init: function (this: Block): void {
            this.appendDummyInput('OID')
                .appendField(translate('control_script'))
                .appendField(new FieldOID(translate('select_id'), 'script'), 'OID');

            this.appendDummyInput('ACTION')
                .appendField(translate('control_instance_action'))
                .appendField(
                    new FieldDropdown([
                        [translate('control_script_start'), 'startScriptAsync'],
                        [translate('control_script_stop'), 'stopScriptAsync'],
                    ]),
                    'ACTION',
                );

            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.System.HUE);

            this.setTooltip(translate('control_script_tooltip'));
            this.setHelpUrl(getHelp('control_script_help'));
        },
    };

    javascriptGenerator.forBlock['control_script'] = function (block: Block): string {
        return `await ${block.getFieldValue('ACTION')}(${quote(block.getFieldValue('OID'))});\n`;
    };

    // --- regex --------------------------------------------------
    Blockly.System.blocks['regex'] = '<block type="regex">' + '  <field name="TEXT">(.*)</field>' + '</block>';

    Blocks['regex'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField('RegExp');

            this.appendDummyInput('TEXT').appendField(new FieldTextInput('(.*)'), 'TEXT');

            this.setInputsInline(true);
            this.setOutput(true, 'Array');

            this.setColour(Blockly.System.HUE);
        },
    };

    javascriptGenerator.forBlock['regex'] = function (block: Block): [string, Order] {
        return [`new RegExp(${quote(block.getFieldValue('TEXT'))})`, Order.ATOMIC];
    };

    // --- selector --------------------------------------------------
    Blockly.System.blocks['selector'] =
        '<block type="selector">' + '  <field name="TEXT">channel[state.id=*]</field>' + '</block>';

    Blocks['selector'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField(`${translate('selector')} $(`);

            this.appendDummyInput('TEXT').appendField(new FieldTextInput('channel[state.id=*]'), 'TEXT');

            this.appendDummyInput().appendField(')');

            this.setInputsInline(true);
            this.setOutput(true, 'Array');

            this.setColour(Blockly.System.HUE);
        },
    };

    javascriptGenerator.forBlock['selector'] = function (block: Block): [string, Order] {
        return [`Array.prototype.slice.apply($(${quote(block.getFieldValue('TEXT'))}))`, Order.ATOMIC];
    };
}
