/**
 * The `Content-Type` selector of the `http_post` block (#1983).
 *
 * The golden snapshots cover the generated code (see `blockly/fixtures/http_post_content_type.xml`).
 * What they cannot cover is the interactive part: picking "own" from the dropdown has to add the
 * text field, picking anything else has to remove it again, and the choice has to survive the
 * save/reload round trip the editor performs on every change.
 */
const assert = require('node:assert').strict;
const { createBlocklyEnvironment } = require('./blockly/env');

/** A workspace with a single, default `http_post` block */
const DEFAULT_XML =
    '<xml xmlns="https://developers.google.com/blockly/xml">' +
    '<block type="http_post">' +
    '<field name="TIMEOUT">2000</field>' +
    '<field name="UNIT">ms</field>' +
    '<field name="TYPE">text</field>' +
    '<field name="CONTENT_TYPE">default</field>' +
    '<value name="URL"><shadow type="text"><field name="TEXT">http://localhost/api</field></shadow></value>' +
    '<value name="DATA"><shadow type="text"><field name="TEXT">{}</field></shadow></value>' +
    '</block>' +
    '</xml>';

/** The same block as it was saved before the content type existed - no field, no mutation */
const LEGACY_XML =
    '<xml xmlns="https://developers.google.com/blockly/xml">' +
    '<block type="http_post">' +
    '<field name="TIMEOUT">2000</field>' +
    '<field name="UNIT">ms</field>' +
    '<field name="TYPE">text</field>' +
    '<value name="URL"><shadow type="text"><field name="TEXT">http://localhost/api</field></shadow></value>' +
    '<value name="DATA"><shadow type="text"><field name="TEXT">{}</field></shadow></value>' +
    '</block>' +
    '</xml>';

describe('http_post content type', function () {
    this.timeout(120000);

    let env;

    before(() => {
        env = createBlocklyEnvironment();
    });

    /**
     * Loads `xml` into a workspace and hands the first block to `fn`.
     *
     * @param {string} xml
     * @param {(block: any, workspace: any) => void} fn
     */
    function withBlock(xml, fn) {
        const { Blockly, window } = env;
        const workspace = new Blockly.Workspace();
        window.scripts = { blocklyWorkspace: workspace };
        try {
            Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml), workspace);
            fn(workspace.getTopBlocks(false)[0], workspace);
        } finally {
            workspace.dispose();
        }
    }

    /**
     * @param {any} workspace
     * @returns {string} the code the editor would generate for that workspace
     */
    const codeOf = workspace => env.Blockly.JavaScript.workspaceToCode(workspace);

    it('sends no header while the content type is "automatic"', () => {
        withBlock(DEFAULT_XML, (_block, workspace) => {
            const code = codeOf(workspace);
            assert.ok(!code.includes('headers'), `unexpected header in: ${code}`);
            assert.ok(code.includes("responseType: 'text' }"), code);
        });
    });

    it('generates no header for blocks saved before the field existed', () => {
        withBlock(LEGACY_XML, (block, workspace) => {
            assert.equal(block.getFieldValue('CONTENT_TYPE'), 'default', 'the field must default to "automatic"');
            assert.ok(!codeOf(workspace).includes('headers'));
        });
    });

    it('sends the selected content type', () => {
        withBlock(DEFAULT_XML, (block, workspace) => {
            block.setFieldValue('application/json', 'CONTENT_TYPE');
            assert.ok(codeOf(workspace).includes("headers: { 'Content-Type': 'application/json' }"), codeOf(workspace));
        });
    });

    it('shows the text field for "own" and removes it again', () => {
        withBlock(DEFAULT_XML, block => {
            assert.equal(block.getInput('CONTENT_TYPE_CUSTOM'), null, 'the text field must be hidden by default');

            block.setFieldValue('custom', 'CONTENT_TYPE');
            assert.ok(block.getInput('CONTENT_TYPE_CUSTOM'), 'the text field must appear for "own"');

            // it belongs next to its dropdown, not behind the statement input
            const order = block.inputList.map(input => input.name);
            assert.ok(
                order.indexOf('CONTENT_TYPE_CUSTOM') > order.indexOf('CONTENT_TYPE') &&
                    order.indexOf('CONTENT_TYPE_CUSTOM') < order.indexOf('DATA'),
                `unexpected input order: ${order.join(', ')}`,
            );

            block.setFieldValue('text/plain', 'CONTENT_TYPE');
            assert.equal(block.getInput('CONTENT_TYPE_CUSTOM'), null, 'the text field must disappear again');
        });
    });

    it('sends an own content type', () => {
        withBlock(DEFAULT_XML, (block, workspace) => {
            block.setFieldValue('custom', 'CONTENT_TYPE');
            block.setFieldValue('application/vnd.api+json', 'CONTENT_TYPE_CUSTOM');

            assert.ok(codeOf(workspace).includes("headers: { 'Content-Type': 'application/vnd.api+json' }"));
        });
    });

    it('sends no header for an empty own content type', () => {
        withBlock(DEFAULT_XML, (block, workspace) => {
            block.setFieldValue('custom', 'CONTENT_TYPE');
            block.setFieldValue('   ', 'CONTENT_TYPE_CUSTOM');

            assert.ok(!codeOf(workspace).includes('headers'), codeOf(workspace));
        });
    });

    it('survives the save/reload round trip of the editor', () => {
        let savedXml;

        withBlock(DEFAULT_XML, (block, workspace) => {
            block.setFieldValue('custom', 'CONTENT_TYPE');
            block.setFieldValue('application/vnd.api+json', 'CONTENT_TYPE_CUSTOM');
            savedXml = env.Blockly.Xml.domToText(env.Blockly.Xml.workspaceToDom(workspace));
        });

        assert.ok(savedXml.includes('custom_content_type="true"'), savedXml);

        withBlock(savedXml, (block, workspace) => {
            assert.ok(block.getInput('CONTENT_TYPE_CUSTOM'), 'the text field must be restored');
            assert.equal(block.getFieldValue('CONTENT_TYPE_CUSTOM'), 'application/vnd.api+json');
            assert.ok(codeOf(workspace).includes("headers: { 'Content-Type': 'application/vnd.api+json' }"));
        });
    });
});
