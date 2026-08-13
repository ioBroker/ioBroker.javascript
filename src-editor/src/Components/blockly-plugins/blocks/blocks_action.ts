/**
 * Action blocks - converted from `public/google-blockly/own/blocks_action.js`.
 *
 * See `blocks_number.ts` for the conversion pattern.
 *
 * Four of the blocks here only make sense inside another one (`exec_result` inside `exec`,
 * `http_response` inside `httpGet`/`httpPost`, ...) and each carried its own copy of the same
 * `onchange` warning. That check now lives in `helpers.ts` as `warnIfNotNestedIn()`.
 *
 * One oddity was preserved rather than fixed: `http_get` guards its timeout with
 * `Number.isNaN(...)` while `http_post` uses `isNaN(...)`. The field value is a string, so the two
 * behave differently for a non-numeric entry - `http_post` falls back to 2000, `http_get` does not.
 * Changing that would change generated code, which a conversion must not do.
 */
import { Blocks, FieldCheckbox, FieldDropdown, FieldTextInput, type Block, type Field } from 'blockly/core';
import { javascriptGenerator, Order } from 'blockly/javascript';

import { isTrue, logLevelOptions, objectNameOf, updateStatementInput, warnIfNotNestedIn } from './helpers';

/** A block whose shape follows the "with results" checkbox */
type ShapedBlock = Block & {
    updateShape_: (withStatement?: boolean) => void;
};

export function install(): void {
    const Blockly = window.Blockly;
    const translate = Blockly.Translate;
    const getHelp = window.getHelp;

    Blockly.CustomBlocks = Blockly.CustomBlocks || [];
    Blockly.CustomBlocks.push('Action');

    Blockly.Action = {
        HUE: 330,
        blocks: {},
    };

    const withStatementField = (): FieldCheckbox =>
        new FieldCheckbox('FALSE', function (this: Field, option: string | boolean): undefined {
            (this.getSourceBlock() as ShapedBlock).updateShape_(isTrue(option));
        });

    const timeoutUnitOptions = (): [string, string][] => [
        [translate('http_timeout_ms'), 'ms'],
        [translate('http_timeout_sec'), 'sec'],
    ];

    const responseTypeOptions = (): [string, string][] => [
        [translate('http_type_text'), 'text'],
        [translate('http_type_arraybuffer'), 'arraybuffer'],
    ];

    /** The mutation hooks shared by `exec` and `request`, which both hide their callback body */
    const withStatementMutation = {
        mutationToDom: function (this: Block): Element {
            const container = document.createElement('mutation');
            container.setAttribute('with_statement', String(isTrue(this.getFieldValue('WITH_STATEMENT'))));
            return container;
        },

        domToMutation: function (this: ShapedBlock, xmlElement: Element): void {
            this.updateShape_(isTrue(xmlElement.getAttribute('with_statement')));
        },

        updateShape_: function (this: Block, withStatement?: boolean): void {
            updateStatementInput(this, withStatement);
        },
    };

    /**
     * A block that only reads a value of the surrounding block, e.g. the result of an `exec`.
     *
     * @param type Block type
     * @param prefix The symbol in front of the dropdown
     * @param options The dropdown choices
     * @param parentTypes The blocks it may be nested in
     * @param warning Translation key of the warning shown when it is not
     * @param help Translation key of the documentation link, if any
     */
    const installResultBlock = (
        type: string,
        prefix: string,
        options: [string, string][],
        parentTypes: string[],
        warning: string,
        help?: string,
    ): void => {
        Blocks[type] = {
            init: function (this: Block): void {
                this.appendDummyInput().appendField(prefix);

                this.appendDummyInput('ATTR').appendField(new FieldDropdown(options), 'ATTR');

                this.setInputsInline(true);
                this.setOutput(true);

                this.setColour(Blockly.Action.HUE);

                this.setTooltip(translate(`${type}_tooltip`));
                if (help) {
                    this.setHelpUrl(getHelp(help));
                }
            },

            /** Warn when this block is not nested in a block that provides the value */
            onchange: function (this: Block): void {
                warnIfNotNestedIn(this, parentTypes, warning);
            },

            FUNCTION_TYPES: parentTypes,
        };

        javascriptGenerator.forBlock[type] = function (block: Block): [string, Order] {
            return [block.getFieldValue('ATTR'), Order.ATOMIC];
        };
    };

    // --- action exec --------------------------------------------------
    Blockly.Action.blocks['exec'] =
        '<block type="exec">' +
        '  <mutation with_statement="false"></mutation>' +
        '  <field name="WITH_STATEMENT">FALSE</field>' +
        '  <field name="LOG"></field>' +
        '  <value name="COMMAND">' +
        '    <shadow type="text">' +
        '      <field name="TEXT">pwd</field>' +
        '    </shadow>' +
        '  </value>' +
        '</block>';

    Blocks['exec'] = {
        init: function (this: Block): void {
            this.appendDummyInput('TEXT').appendField(`» ${translate('exec')}`);

            this.appendValueInput('COMMAND').appendField(translate('exec_command'));

            this.appendDummyInput('WITH_STATEMENT')
                .appendField(translate('with_results'))
                .appendField(withStatementField(), 'WITH_STATEMENT');

            this.appendDummyInput('LOG')
                .appendField(translate('loglevel'))
                .appendField(new FieldDropdown(logLevelOptions()), 'LOG');

            this.setInputsInline(false);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.Action.HUE);

            this.setTooltip(translate('exec_tooltip'));
            this.setHelpUrl(getHelp('exec_help'));
        },
        ...withStatementMutation,
    };

    javascriptGenerator.forBlock['exec'] = function (block: Block): string {
        const vCommand = javascriptGenerator.valueToCode(block, 'COMMAND', Order.ATOMIC);
        const fLog = block.getFieldValue('LOG');

        let logText = '';
        if (fLog) {
            logText = `console.${fLog}('exec: ' + ${vCommand});\n`;
        }

        if (isTrue(block.getFieldValue('WITH_STATEMENT'))) {
            const statement = javascriptGenerator.statementToCode(block, 'STATEMENT');
            if (statement) {
                return `exec(${vCommand}, async (error, result, stderr) => {\n${statement}});\n${logText}`;
            }
        }

        return `exec(${vCommand});\n${logText}`;
    };

    // --- exec_result -----------------------------------------------------------
    Blockly.Action.blocks['exec_result'] =
        '<sep gap="5"></sep>' + '<block type="exec_result">' + '  <field name="ATTR">result</field>' + '</block>';

    installResultBlock(
        'exec_result',
        '»',
        [
            [translate('exec_result_result'), 'result'],
            [translate('exec_result_stderr'), 'stderr'],
            [translate('exec_result_error'), 'error'],
        ],
        ['exec'],
        'exec_result_warning',
        'exec_help',
    );

    // --- action http_get --------------------------------------------------
    Blockly.Action.blocks['http_get'] =
        '<block type="http_get">' +
        '  <field name="TIMEOUT">2000</field>' +
        '  <field name="UNIT">ms</field>' +
        '  <field name="TYPE">text</field>' +
        '  <value name="URL">' +
        '    <shadow type="text">' +
        '      <field name="TEXT">http://</field>' +
        '    </shadow>' +
        '  </value>' +
        '</block>';

    Blocks['http_get'] = {
        init: function (this: Block): void {
            this.appendValueInput('URL').appendField(`🌐 ${translate('http_get')}`);

            this.appendDummyInput()
                .appendField(translate('http_timeout'))
                .appendField(new FieldTextInput('2000'), 'TIMEOUT')
                .appendField(new FieldDropdown(timeoutUnitOptions()), 'UNIT');

            this.appendDummyInput('TYPE')
                .appendField(translate('http_type'))
                .appendField(new FieldDropdown(responseTypeOptions()), 'TYPE');

            this.appendStatementInput('STATEMENT').setCheck(null);

            this.setInputsInline(false);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.Action.HUE);

            this.setTooltip(translate('http_get_tooltip'));
            this.setHelpUrl(getHelp('http_get_help'));
        },
    };

    javascriptGenerator.forBlock['http_get'] = function (block: Block): string {
        const vUrl = javascriptGenerator.valueToCode(block, 'URL', Order.ATOMIC);
        const fUnit = block.getFieldValue('UNIT');

        // `Number.isNaN` on a string is always false - see the note in the file header
        let fTimeout = block.getFieldValue('TIMEOUT');
        if (Number.isNaN(fTimeout as number)) {
            fTimeout = 2000;
        }
        if (fUnit === 'sec') {
            fTimeout *= 1000;
        }

        const responseType = block.getFieldValue('TYPE') || 'text';
        const statement = javascriptGenerator.statementToCode(block, 'STATEMENT');

        return `httpGet(${vUrl}, { timeout: ${fTimeout}, responseType: '${responseType}' }, async (err, response) => {\n${statement}});\n`;
    };

    // --- action http_post --------------------------------------------------
    Blockly.Action.blocks['http_post'] =
        '<sep gap="5"></sep>' +
        '<block type="http_post">' +
        '  <field name="TIMEOUT">2000</field>' +
        '  <field name="UNIT">ms</field>' +
        '  <field name="TYPE">text</field>' +
        '  <value name="URL">' +
        '    <shadow type="text">' +
        '      <field name="TEXT">http://</field>' +
        '    </shadow>' +
        '  </value>' +
        '  <value name="DATA">' +
        '    <shadow type="logic_null"></shadow>' +
        '  </value>' +
        '</block>';

    Blocks['http_post'] = {
        init: function (this: Block): void {
            this.appendValueInput('URL').appendField(`🌐 ${translate('http_post')}`);

            this.appendDummyInput()
                .appendField(translate('http_timeout'))
                .appendField(new FieldTextInput('2000'), 'TIMEOUT')
                .appendField(new FieldDropdown(timeoutUnitOptions()), 'UNIT');

            this.appendDummyInput('TYPE')
                .appendField(translate('http_type'))
                .appendField(new FieldDropdown(responseTypeOptions()), 'TYPE');

            this.appendValueInput('DATA').appendField(translate('http_post_data'));

            this.appendStatementInput('STATEMENT').setCheck(null);

            this.setInputsInline(false);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.Action.HUE);

            this.setTooltip(translate('http_post_tooltip'));
            this.setHelpUrl(getHelp('http_post_help'));
        },
    };

    javascriptGenerator.forBlock['http_post'] = function (block: Block): string {
        const vUrl = javascriptGenerator.valueToCode(block, 'URL', Order.ATOMIC);
        const fUnit = block.getFieldValue('UNIT');

        let fTimeout = block.getFieldValue('TIMEOUT');
        if (isNaN(fTimeout)) {
            fTimeout = 2000;
        }
        if (fUnit === 'sec') {
            fTimeout *= 1000;
        }

        const fType = block.getFieldValue('TYPE') || 'text';
        const vData = javascriptGenerator.valueToCode(block, 'DATA', Order.ATOMIC) || 'null';
        const statement = javascriptGenerator.statementToCode(block, 'STATEMENT');

        return `httpPost(${vUrl}, ${vData}, { timeout: ${fTimeout}, responseType: '${fType}' }, async (err, response) => {\n${statement}});\n`;
    };

    // --- http_response -----------------------------------------------------------
    Blockly.Action.blocks['http_response'] =
        '<sep gap="5"></sep>' +
        '<block type="http_response">' +
        '  <field name="ATTR">response.data</field>' +
        '</block>';

    installResultBlock(
        'http_response',
        '🌐',
        [
            [translate('http_response_data'), 'response.data'],
            [translate('http_response_statuscode'), 'response.statusCode'],
            [translate('http_response_responsetime'), 'response.responseTime'],
            [translate('http_response_headers'), 'response.headers'],
            [translate('http_response_error'), 'err'],
        ],
        ['http_get', 'http_post'],
        'http_response_warning',
        'http_response_help',
    );

    // --- http_response_tofile -----------------------------------------------------------
    Blockly.Action.blocks['http_response_tofile'] =
        '<sep gap="5"></sep>' +
        '<block type="http_response_tofile">' +
        '  <value name="FILENAME">' +
        '    <shadow type="text">' +
        '      <field name="TEXT">temp.jpg</field>' +
        '    </shadow>' +
        '  </value>' +
        '</block>';

    Blocks['http_response_tofile'] = {
        init: function (this: Block): void {
            this.appendDummyInput().appendField(`🌐 ${translate('http_response_tofile')}`);

            this.appendValueInput('FILENAME')
                .appendField(translate('http_response_tofile_filename'))
                .setCheck(null);

            this.setInputsInline(false);
            this.setOutput(true, 'String');

            this.setColour(Blockly.Action.HUE);

            this.setTooltip(translate('http_response_tofile_tooltip'));
            this.setHelpUrl(getHelp('http_response_tofile_help'));
        },

        /** Warn when this block is not nested in a request block */
        onchange: function (this: Block): void {
            warnIfNotNestedIn(this, ['http_get', 'http_post'], 'http_response_warning');
        },

        FUNCTION_TYPES: ['http_get', 'http_post'],
    };

    javascriptGenerator.forBlock['http_response_tofile'] = function (block: Block): [string, Order] {
        const vFileName = javascriptGenerator.valueToCode(block, 'FILENAME', Order.ATOMIC);

        return [`createTempFile(${vFileName}, response.data)`, Order.ATOMIC];
    };

    /** The `if (err) { console.error(err); }` prelude both file callbacks start with */
    const errorPrelude = (): string =>
        `${javascriptGenerator.prefixLines('if (err) {', javascriptGenerator.INDENT)}\n` +
        `${javascriptGenerator.prefixLines('console.error(err);', javascriptGenerator.INDENT + javascriptGenerator.INDENT)}\n` +
        `${javascriptGenerator.prefixLines('}', javascriptGenerator.INDENT)}\n`;

    // --- action file_write --------------------------------------------------
    Blockly.Action.blocks['file_write'] =
        '<block type="file_write">' +
        '  <value name="OID">' +
        '    <shadow type="field_oid_meta">' +
        '      <field name="oid">0_userdata.0</field>' +
        '    </shadow>' +
        '  </value>' +
        '  <value name="FILE">' +
        '    <shadow type="text">' +
        '      <field name="TEXT">demo.json</field>' +
        '    </shadow>' +
        '  </value>' +
        '</block>';

    Blocks['file_write'] = {
        init: function (this: Block): void {
            this.appendValueInput('OID').appendField(`📁 ${translate('file_write')}`);

            this.appendValueInput('FILE').appendField(translate('file_write_filename')).setCheck(null);

            this.appendValueInput('DATA').appendField(translate('file_write_data'));

            this.setInputsInline(false);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.Action.HUE);
            this.setTooltip(translate('file_write_tooltip'));
            this.setHelpUrl(getHelp('file_write_help'));
        },
    };

    javascriptGenerator.forBlock['file_write'] = function (block: Block): string {
        const vObjId = javascriptGenerator.valueToCode(block, 'OID', Order.ATOMIC);
        const vFile = javascriptGenerator.valueToCode(block, 'FILE', Order.ATOMIC);
        const vData = javascriptGenerator.valueToCode(block, 'DATA', Order.ATOMIC);
        const objectName = objectNameOf(vObjId);

        return (
            `writeFile(${vObjId}${objectName ? ` /* ${objectName} */` : ''}, String(${vFile}), ${vData ? vData : 'null'}, (err) => {\n` +
            `${errorPrelude()}});\n`
        );
    };

    // --- action file_read --------------------------------------------------
    Blockly.Action.blocks['file_read'] =
        '<sep gap="5"></sep>' +
        '<block type="file_read">' +
        '  <value name="OID">' +
        '    <shadow type="field_oid_meta">' +
        '      <field name="oid">0_userdata.0</field>' +
        '    </shadow>' +
        '  </value>' +
        '  <value name="FILE">' +
        '    <shadow type="text">' +
        '      <field name="TEXT">demo.json</field>' +
        '    </shadow>' +
        '  </value>' +
        '</block>';

    Blocks['file_read'] = {
        init: function (this: Block): void {
            this.appendValueInput('OID').appendField(`📁 ${translate('file_read')}`);

            this.appendValueInput('FILE').appendField(translate('file_read_filename')).setCheck(null);

            this.appendStatementInput('STATEMENT').setCheck(null);

            this.setInputsInline(false);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.Action.HUE);

            this.setTooltip(translate('file_read_tooltip'));
            this.setHelpUrl(getHelp('file_read_help'));
        },
    };

    javascriptGenerator.forBlock['file_read'] = function (block: Block): string {
        const vObjId = javascriptGenerator.valueToCode(block, 'OID', Order.ATOMIC);
        const vFile = javascriptGenerator.valueToCode(block, 'FILE', Order.ATOMIC);
        const statement = javascriptGenerator.statementToCode(block, 'STATEMENT');
        const objectName = objectNameOf(vObjId);

        return (
            `readFile(${vObjId}${objectName ? ` /* ${objectName} */` : ''}, String(${vFile}), (err, data, mimeType) => {\n` +
            `${errorPrelude()}${statement}});\n`
        );
    };

    // --- file_data -----------------------------------------------------------
    Blockly.Action.blocks['file_data'] =
        '<sep gap="5"></sep>' + '<block type="file_data">' + '  <field name="ATTR">data</field>' + '</block>';

    installResultBlock(
        'file_data',
        '📁',
        [
            [translate('file_data_data'), 'data'],
            [translate('file_data_mimeType'), 'mimeType'],
        ],
        ['file_read'],
        'file_data_warning',
    );

    // --- action request --------------------------------------------------
    Blockly.Action.blocks['request'] =
        '<block type="request">' +
        '  <mutation with_statement="false"></mutation>' +
        '  <field name="WITH_STATEMENT">FALSE</field>' +
        '  <field name="LOG"></field>' +
        '  <value name="URL">' +
        '    <shadow type="text">' +
        '      <field name="TEXT">http://</field>' +
        '    </shadow>' +
        '  </value>' +
        '</block>';

    Blocks['request'] = {
        init: function (this: Block): void {
            this.appendDummyInput('TEXT').appendField(translate('request'));

            this.appendValueInput('URL').appendField(translate('request_url'));

            this.appendDummyInput('WITH_STATEMENT')
                .appendField(translate('with_results'))
                .appendField(withStatementField(), 'WITH_STATEMENT');

            this.appendDummyInput('LOG')
                .appendField(translate('loglevel'))
                .appendField(new FieldDropdown(logLevelOptions()), 'LOG');

            this.setInputsInline(false);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);

            this.setColour(Blockly.Action.HUE);

            this.setTooltip(translate('request_tooltip'));
            // unlike every other block here, the original passes the translation, not the link
            this.setHelpUrl(translate('request_help'));
        },
        ...withStatementMutation,
    };

    javascriptGenerator.forBlock['request'] = function (block: Block): string {
        const vUrl = javascriptGenerator.valueToCode(block, 'URL', Order.ATOMIC);
        const fLog = block.getFieldValue('LOG');

        let logText = '';
        if (fLog) {
            logText = `console.${fLog}('request: ' + ${vUrl});\n`;
        }

        if (isTrue(block.getFieldValue('WITH_STATEMENT'))) {
            const statement = javascriptGenerator.statementToCode(block, 'STATEMENT');
            if (statement) {
                return (
                    `try {\n  require("request")(${vUrl}, async (error, response, result) => {\n  ${statement}` +
                    `  }).on("error", (e) => { console.error(e); });\n} catch (e) { console.error(e); }\n${logText}`
                );
            }
        }

        return `try {\n  require("request")(${vUrl}).on("error", (e) => { console.error(e); });\n} catch (e) { console.error(e); }\n${logText}`;
    };
}
