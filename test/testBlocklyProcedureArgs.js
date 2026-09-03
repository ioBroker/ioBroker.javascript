/**
 * Parameters of the two JavaScript function blocks (#2368).
 *
 * `procedures_defcustomreturn` and `procedures_defcustomnoreturn` are the ioBroker variants of the
 * standard function blocks: their body is a hand-written script instead of a stack of blocks. They
 * are assembled from the mixins of the standard blocks, but `compose` - the method that reads the
 * parameter list back out of the mutator dialog - is a copy, because the standard one would also
 * give the block the statement input these two deliberately do not have.
 *
 * That copy still looked up the parameter variables with `Workspace.getVariable`, which Blockly 13
 * dropped. The call threw on the *first* parameter, after its name had already been pushed, so the
 * block was left holding exactly one parameter however many the dialog contained - and none of the
 * bookkeeping that follows (the label, the mutation, the call blocks) ever ran.
 *
 * Run: mocha test/testBlocklyProcedureArgs.js --exit
 */
const assert = require('node:assert').strict;
const { createBlocklyEnvironment } = require('./blockly/env');

/**
 * The parameters the dialog is filled with. Blockly runs inside jsdom, so every array it hands back
 * carries jsdom's `Array.prototype` and the prototype check of `deepEqual` fails on it - hence the
 * `Array.from` around each of them below, which copies them into this realm.
 */
const PARAMS = ['first', 'second', 'third'];

describe('Blockly JavaScript function blocks', function () {
    // Loading Blockly plus the block definitions into jsdom is not instant
    this.timeout(120000);

    let env;
    let Blockly;
    let workspace;

    before(() => {
        env = createBlocklyEnvironment();
        Blockly = env.Blockly;

        // jsdom has no SVG layout, and the mutator bubble measures the block it hangs off
        env.window.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 120, height: 40 });

        const container = env.window.document.createElement('div');
        container.style.width = '900px';
        container.style.height = '700px';
        env.window.document.body.appendChild(container);

        // the same renderer and theme the editor injects with
        workspace = Blockly.inject(container, { renderer: 'thrasos', theme: 'classic', sounds: false });
    });

    after(() => workspace?.dispose());

    /**
     * Adds a function block and gives it the parameters, through the mutator the user works with:
     * opening the bubble runs `decompose`, and every block that lands in the dialog makes Blockly
     * call `compose` again.
     *
     * @param {string} type Type of the definition block
     * @param {string} name Name of the function
     * @returns {Promise<object>} the definition block
     */
    async function defineFunction(type, name) {
        const def = workspace.newBlock(type);
        def.initSvg();
        def.render();
        def.setFieldValue(name, 'NAME');

        const icon = def.getIcon(Blockly.icons.MutatorIcon.TYPE);
        await icon.setBubbleVisible(true);

        const mutatorWorkspace = icon.getWorkspace();
        const container = mutatorWorkspace.getTopBlocks(false)[0];
        assert.equal(container.type, 'procedures_mutatorcontainer');

        let connection = container.getInput('STACK').connection;
        for (const param of PARAMS) {
            const arg = mutatorWorkspace.newBlock('procedures_mutatorarg');
            arg.initSvg();
            arg.render();
            arg.setFieldValue(param, 'NAME');
            connection.connect(arg.previousConnection);
            connection = arg.nextConnection;
        }
        await Blockly.renderManagement.finishQueuedRenders();

        return def;
    }

    for (const [type, hasReturn] of [
        ['procedures_defcustomnoreturn', false],
        ['procedures_defcustomreturn', true],
    ]) {
        describe(type, () => {
            let def;

            before(async () => {
                def = await defineFunction(type, hasReturn ? 'withResult' : 'plain');
            });

            it('keeps every parameter of the mutator dialog', () => {
                assert.deepEqual(Array.from(def.arguments_), PARAMS);
            });

            it('finds a variable for each of them', () => {
                assert.deepEqual(
                    Array.from(def.argumentVarModels_, model => model && model.getName()),
                    PARAMS,
                );
            });

            it('lists them on the block', () => {
                assert.equal(
                    def.getFieldValue('PARAMS'),
                    `${Blockly.Msg.PROCEDURES_BEFORE_PARAMS} ${PARAMS.join(', ')}`,
                );
            });

            it('writes all of them into the mutation, which is what the saved script carries', () => {
                const args = Array.from(def.mutationToDom().getElementsByTagName('arg'));
                assert.deepEqual(
                    args.map(arg => arg.getAttribute('name')),
                    PARAMS,
                );
                // `varid` is what makes a parameter survive a rename of its variable
                args.forEach(arg => assert.ok(arg.getAttribute('varid'), `no varid on "${arg.getAttribute('name')}"`));
            });

            it('gives the call block one input per parameter', () => {
                const call = workspace.newBlock(
                    hasReturn ? 'procedures_callcustomreturn' : 'procedures_callcustomnoreturn',
                );
                call.initSvg();
                call.render();
                call.setFieldValue(def.getFieldValue('NAME'), 'NAME');
                call.setProcedureParameters_(def.arguments_, def.paramIds_);

                assert.deepEqual(
                    Array.from(call.inputList, input => input.name).filter(name => name.startsWith('ARG')),
                    PARAMS.map((_param, index) => `ARG${index}`),
                );
            });

            it('generates a function with all of them', () => {
                const code = Blockly.JavaScript.workspaceToCode(workspace);
                const signature = `async function ${def.getFieldValue('NAME')}(${PARAMS.join(', ')})`;
                assert.ok(code.includes(signature), `"${signature}" not found in:\n${code}`);
            });
        });
    }
});
