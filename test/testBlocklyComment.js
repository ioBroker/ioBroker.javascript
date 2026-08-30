/**
 * The comment block and the multiline field it is built from (#2348).
 *
 * `blockly-plugins/field-multilineinput` is a fork of `@blockly/field-multilineinput` that extends
 * `Blockly.Field` instead of `Blockly.FieldTextInput`, so it carries its own copies of methods that
 * Blockly has meanwhile changed. Three of those copies had gone stale and broke the comment block:
 * the text was white on the yellow block, the editor opened at the wrong place, and on a touch
 * device it did not open at all and left the workspace unusable.
 *
 * Run: mocha test/testBlocklyComment.js --exit
 */
const assert = require('node:assert').strict;
const { createBlocklyEnvironment, runInEnvironment } = require('./blockly/env');

describe('Blockly comment block', function () {
    // Loading Blockly plus the block definitions into jsdom is not instant
    this.timeout(120000);

    let env;
    let Blockly;
    let workspace;
    let field;
    let rendererCss;

    before(() => {
        env = createBlocklyEnvironment();
        Blockly = env.Blockly;

        // The multiline field is installed by `initBlockly()`, not by `loadOwnBlocks()`, so the
        // corpus environment does not have it
        runInEnvironment(
            env,
            `import { FieldMultilineInput } from './field-multilineinput/src/field_multilineinput';
             window.Blockly.fieldRegistry.register('field_multilinetext', FieldMultilineInput);
             window.Blockly.FieldMultilineInput = FieldMultilineInput;\n`,
        );

        const container = env.window.document.createElement('div');
        container.style.width = '800px';
        container.style.height = '600px';
        env.window.document.body.appendChild(container);

        // the same renderer and theme the editor injects with
        workspace = Blockly.inject(container, { renderer: 'thrasos', theme: 'classic', sounds: false });
        env.window.scripts = { blocklyWorkspace: workspace };

        const block = workspace.newBlock('comment');
        block.initSvg();
        block.render();
        field = block.getField('COMMENT');

        // what the browser really applies - Blockly injects it as its own style element
        rendererCss = Array.from(env.window.document.querySelectorAll('style.blockly-renderer-style'))
            .map(style => style.textContent)
            .join('\n');
    });

    after(() => workspace?.dispose());

    it('builds the comment block from the multiline field', () => {
        assert.ok(field instanceof Blockly.FieldMultilineInput);
        assert.ok(field.textGroup, 'the field has no text group');
    });

    describe('text colour', () => {
        /**
         * Blockly colours field text with a *direct* child selector, so the group holding the lines
         * has to carry the class itself. If Blockly ever renames it, this is where it shows up.
         */
        it('colours field text through a direct child of a class the field sets', () => {
            const rule = rendererCss.match(/\.(blockly\w+)>text[^{]*\{\s*fill: #000;/);
            assert.ok(rule, `no "fill: #000" rule for field text found in:\n${rendererCss}`);

            const classes = rendererCss
                .split('\n')
                .filter(line => line.includes('>text'))
                .join(' ')
                .match(/\.blockly\w+(?=>text)/g)
                .map(selector => selector.substring(1));

            assert.ok(
                classes.includes(field.textGroup.getAttribute('class')),
                `the text group has class "${field.textGroup.getAttribute('class')}", but Blockly colours ` +
                    `the text of [${classes.join(', ')}]`,
            );
        });

        it('puts the lines directly into that group', async () => {
            field.setValue('first line\nsecond line');
            await Blockly.renderManagement.finishQueuedRenders();

            const lines = Array.from(field.textGroup.childNodes);
            assert.equal(lines.length, 2, 'one text element per line');
            lines.forEach(line => {
                assert.equal(line.tagName, 'text');
                assert.equal(line.parentNode, field.textGroup, 'a nested line would not be coloured');
            });
        });

        it('marks the field group as a field, like every other field does', () => {
            // carries the cursor and the focus ring of the keyboard navigation
            assert.ok(
                field.getSvgRoot().classList.contains('blocklyField'),
                `field group classes: ${field.getSvgRoot().getAttribute('class')}`,
            );
        });
    });

    describe('editor', () => {
        /** Opens the editor and hands the textarea to `check`, whatever happens */
        function withEditor(check) {
            field.showEditor_();
            try {
                check(Blockly.WidgetDiv.getDiv());
            } finally {
                Blockly.WidgetDiv.hide();
            }
        }

        it('has no modal prompt editor to fall back to', () => {
            // Blockly removed `showPromptEditor_`, and this field never inherited one either - it
            // extends `Blockly.Field`, not `Blockly.FieldTextInput`
            assert.equal(typeof field.showPromptEditor_, 'undefined');
            assert.equal(typeof field.showPromptEditor, 'undefined');
        });

        it('opens the inline editor', () => {
            withEditor(div => {
                const input = div.querySelector('textarea');
                assert.ok(input, 'no textarea in the widget div');
                assert.ok(input.classList.contains('blocklyHtmlTextAreaInput'));
            });
        });

        for (const flag of ['MOBILE', 'ANDROID', 'IPAD']) {
            it(`opens the inline editor on a touch device (${flag})`, () => {
                // Calling the missing prompt editor threw a TypeError inside the click handler: the
                // keyboard never appeared and the workspace stayed blocked until a page reload
                const original = Blockly.utils.userAgent[flag];
                Blockly.utils.userAgent[flag] = true;
                try {
                    assert.ok(workspace.options.modalInputs, 'Blockly enables modal inputs by default');
                    withEditor(div => assert.ok(div.querySelector('textarea'), 'no textarea in the widget div'));
                } finally {
                    Blockly.utils.userAgent[flag] = original;
                }
            });
        }

        it('positions the editor relative to the div it lives in', async () => {
            field.showEditor_();
            try {
                const div = Blockly.WidgetDiv.getDiv();

                // jsdom has no layout, so the two coordinate systems are set up by hand: the field
                // sits at (500, 300) on the page, the div it is placed in starts at (120, 80)
                div.parentElement.getBoundingClientRect = () => ({ left: 120, top: 80 });
                field.getScaledBBox = () => new Blockly.utils.Rect(300, 340, 500, 600);

                await field.resizeEditor_();
                await Blockly.renderManagement.finishQueuedRenders();

                assert.equal(div.style.left, '380px', 'left must be the page position minus the div');
                assert.equal(div.style.top, '220px', 'top must be the page position minus the div');
                assert.equal(div.style.width, '100px');
                assert.equal(div.style.height, '40px');
            } finally {
                Blockly.WidgetDiv.hide();
            }
        });
    });
});
