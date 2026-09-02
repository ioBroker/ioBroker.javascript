import { describe, it, expect } from 'vitest';

import type { RuleBlockConfig, RuleContext, RuleUserRules } from '@iobroker/javascript-rules-dev';

import { compile } from '../helpers/Compile';
import StandardBlocks from '../components/StandardBlocks';
import ActionSetStateChanged from '../components/Blocks/ActionSetStateChanged';
import { GenericBlock } from '../components/GenericBlock';

/**
 * What a rule turns into is a JavaScript script, and nothing in the editor ever parses it - a block
 * that emits a stray quote or a broken comment takes the whole rule down at runtime, with an error
 * that points at generated code the user never wrote.
 *
 * So every case here compiles a real rule with the real blocks and then checks two things: that the
 * result is syntactically valid, and that the few pieces which carry the meaning are in it.
 */

/** Block configs carry attributes the base type does not know about */
type BlockConfig = RuleBlockConfig & Record<string, any>;

const blocks = StandardBlocks as (typeof GenericBlock<any>)[];

function compileRule(rule: Partial<RuleUserRules>): string {
    return compile(
        {
            justCheck: false,
            triggers: [],
            conditions: [[]],
            actions: { then: [], else: [] },
            ...rule,
        },
        blocks,
    );
}

/**
 * Compiles a rule and asserts that the generated script parses.
 *
 * The adapter wraps every script in an async IIFE (`createVM` in `main.ts`), which is what makes the
 * top level `await` of the actions legal - so the check has to wrap it the same way. `new Function`
 * compiles the body without running it, which is the point: none of this may talk to an ioBroker.
 */
function compileParsed(rule: Partial<RuleUserRules>): string {
    const code = compileRule(rule);
    expect(() => new Function(`(async () => {\n${code}\n})();`)).not.toThrow();
    return code;
}

/** One trigger, one notification echoing %s and %id - the shape most cases need */
function withNotification(trigger: BlockConfig, justCheck = false): Partial<RuleUserRules> {
    return {
        justCheck,
        triggers: [trigger],
        actions: {
            then: [
                { id: 'ActionNotification', acceptedBy: 'actions', _id: 9, message: '%s from %id', isAlert: false },
            ] as BlockConfig[],
            else: [],
        },
    };
}

describe('rule compilation', () => {
    describe('every standard block', () => {
        // A block that throws on a config it has never seen breaks the whole editor, not just itself
        it('compiles with a bare config', () => {
            for (const block of blocks) {
                const { id, acceptedBy } = block.getStaticData();
                const config = { id, acceptedBy, _id: 1 } as BlockConfig;
                expect(
                    () =>
                        block.compile(config, {
                            trigger: config,
                            condition: { index: 0 },
                            conditionsStates: [],
                            conditionsVars: [],
                            conditionsDebug: [],
                        }),
                    `${id} threw on a bare config`,
                ).not.toThrow();
            }
        });

        it('is registered exactly once', () => {
            const ids = blocks.map(block => block.getStaticData().id);
            expect(ids).toHaveLength(new Set(ids).size);
        });
    });

    describe('TriggerMessage', () => {
        const trigger: BlockConfig = {
            id: 'TriggerMessage',
            acceptedBy: 'triggers',
            _id: 1,
            message: 'myMessage',
        };

        it('subscribes with onMessage and takes the payload plus the answer callback', () => {
            expect(compileParsed(withNotification(trigger))).toContain(
                'onMessage("myMessage", async function (data, _callback)',
            );
        });

        it('substitutes %s with the payload', () => {
            expect(compileParsed(withNotification(trigger))).toContain(
                'const v = typeof data === "object" ? JSON.stringify(data) : data;',
            );
        });

        it('survives a quote in the message name', () => {
            const code = compileParsed(withNotification({ ...trigger, message: 'with "quotes"' }));
            expect(code).toContain(String.raw`onMessage("with \"quotes\""`);
        });
    });

    describe('TriggerFile', () => {
        const trigger: BlockConfig = {
            id: 'TriggerFile',
            acceptedBy: 'triggers',
            _id: 1,
            fileId: 'vis.0',
            filePattern: 'main/*',
        };

        it('subscribes without asking for the file content', () => {
            expect(compileParsed(withNotification(trigger))).toContain(
                'onFile("vis.0", "main/*", false, async function (fileId, fileName, size)',
            );
        });

        it('substitutes %s with the file name and %id with the object', () => {
            expect(compileParsed(withNotification(trigger))).toContain(
                String.raw`.replace(/%(?:\.\d+)?s/g, fileName).replace(/%id/g, fileId)`,
            );
        });

        it('escapes a quote in the file pattern', () => {
            const code = compileParsed(withNotification({ ...trigger, fileId: 'vis.*', filePattern: 'a"b/*' }));
            expect(code).toContain(String.raw`onFile("vis.*", "a\"b/*", false,`);
        });

        it('subscribes to nothing without an object', () => {
            const code = compileParsed(withNotification({ ...trigger, fileId: '' }));
            expect(code).not.toContain('onFile(');
            expect(code).toContain('No object defined');
        });
    });

    describe('TriggerObject', () => {
        const trigger: BlockConfig = {
            id: 'TriggerObject',
            acceptedBy: 'triggers',
            _id: 1,
            pattern: 'hm-rpc.0.*',
            change: '_',
        };

        it('subscribes with onObject and hands over the id', () => {
            const code = compileParsed(withNotification(trigger));
            expect(code).toContain('onObject("hm-rpc.0.*", async function (id, obj)');
            expect(code).toContain(String.raw`.replace(/%(?:\.\d+)?s/g, id).replace(/%id/g, id)`);
        });

        // A deleted object arrives without `obj` - that is the only thing telling the two apart
        it('keeps only deletions', () => {
            expect(compileParsed(withNotification({ ...trigger, change: 'deleted' }))).toContain(
                'if (obj) { return; }',
            );
        });

        it('drops deletions when only existing objects are wanted', () => {
            expect(compileParsed(withNotification({ ...trigger, change: 'exists' }))).toContain(
                'if (!obj) { return; }',
            );
        });

        it('does not filter on "any change"', () => {
            expect(compileParsed(withNotification(trigger))).not.toContain('return; }');
        });

        it('subscribes to nothing without a pattern', () => {
            const code = compileParsed(withNotification({ ...trigger, pattern: '' }));
            expect(code).not.toContain('onObject(');
            expect(code).toContain('No pattern defined');
        });
    });

    describe('TriggerLog', () => {
        const trigger: BlockConfig = {
            id: 'TriggerLog',
            acceptedBy: 'triggers',
            _id: 1,
            severity: 'error',
            filter: '',
        };

        it('subscribes with the configured severity', () => {
            expect(compileParsed(withNotification(trigger))).toContain('onLog("error", async function (info)');
            expect(compileParsed(withNotification({ ...trigger, severity: '*' }))).toContain('onLog("*",');
        });

        it('substitutes %s with the message and %id with the source instance', () => {
            expect(compileParsed(withNotification(trigger))).toContain(
                String.raw`.replace(/%(?:\.\d+)?s/g, info.message).replace(/%id/g, info.from)`,
            );
        });

        // The filter is what keeps a rule from matching the message its own actions write
        it('compares the text filter in lower case and escapes it', () => {
            expect(compileParsed(withNotification({ ...trigger, filter: 'Disk "Full"' }))).toContain(
                String.raw`if (!String(info.message).toLowerCase().includes("disk \"full\"")) { return; }`,
            );
        });

        it('generates no filter when none is configured', () => {
            expect(compileParsed(withNotification(trigger))).not.toContain('toLowerCase().includes');
        });
    });

    describe('TriggerOnStop', () => {
        const trigger: BlockConfig = { id: 'TriggerOnStop', acceptedBy: 'triggers', _id: 1, timeout: 5000 };

        /**
         * The adapter waits for this callback instead of just calling it (`stopScript` in `main.ts`),
         * so `_done` has to be reached on every path - an async function would report back at its
         * first `await` and the stop would sit out the full timeout with the actions cut off.
         */
        it('reports back through the done callback on success and on error', () => {
            const code = compileParsed(withNotification(trigger));
            expect(code).toContain('onStop(function (_done)');
            expect(code.replace(/\s+/g, ' ')).toMatch(/\.catch\(e => console\.error\(e\)\)\s*\.finally\(_done\)/);
        });

        it('passes the configured timeout', () => {
            expect(compileParsed(withNotification(trigger))).toContain('}, 5000);');
        });

        it('falls back to the 1000 ms the adapter uses', () => {
            expect(compileParsed(withNotification({ ...trigger, timeout: undefined }))).toContain('}, 1000);');
        });
    });

    describe('ConditionFunction', () => {
        const rule = (func: string): Partial<RuleUserRules> => ({
            triggers: [{ id: 'TriggerScriptSave', acceptedBy: 'triggers', _id: 1 }],
            conditions: [[{ id: 'ConditionFunction', acceptedBy: 'conditions', _id: 2, func } as BlockConfig]],
            actions: {
                then: [{ id: 'ActionPrintText', acceptedBy: 'actions', _id: 3, text: 'x' } as BlockConfig],
                else: [],
            },
        });

        // An IIFE, so `return` and `await` in the user's code mean what they look like
        it('wraps the code so that return and await work', () => {
            const code = compileParsed(rule('const s = await getStateAsync("javascript.0.x");\nreturn s.val > 5;'));
            expect(code).toContain('const subCond2 = !!(await (async () => {');
            expect(code).toContain('return s.val > 5;');
        });

        it('restricts nothing when the code is empty', () => {
            expect(compileParsed(rule(''))).toContain('return true;');
        });

        it('compiles two conditions in one AND row', () => {
            const code = compileParsed({
                triggers: [{ id: 'TriggerScriptSave', acceptedBy: 'triggers', _id: 1 }],
                conditions: [
                    [
                        { id: 'ConditionFunction', acceptedBy: 'conditions', _id: 2, func: 'return true;' },
                        { id: 'ConditionFunction', acceptedBy: 'conditions', _id: 4, func: 'return false;' },
                    ] as BlockConfig[],
                ],
            });
            expect(code).toContain('subCond2');
            expect(code).toContain('subCond4');
        });
    });

    describe('ActionNotification', () => {
        const rule = (action: Partial<BlockConfig>): Partial<RuleUserRules> => ({
            justCheck: true,
            triggers: [{ id: 'TriggerScriptSave', acceptedBy: 'triggers', _id: 1 }],
            actions: {
                then: [
                    {
                        id: 'ActionNotification',
                        acceptedBy: 'actions',
                        _id: 3,
                        message: 'Hi',
                        ...action,
                    } as BlockConfig,
                ],
                else: [],
            },
        });

        it('registers an alert when asked for one', () => {
            expect(compileParsed(rule({ isAlert: true }))).toContain('registerNotification(subActionVar3, true)');
        });

        it('registers a plain message otherwise', () => {
            expect(compileParsed(rule({ isAlert: false }))).toContain('registerNotification(subActionVar3, false)');
        });

        it('writes nothing without a text', () => {
            const code = compileParsed(rule({ message: '' }));
            expect(code).not.toContain('registerNotification(');
            expect(code).toContain('No text defined');
        });
    });

    describe('ActionToggleState', () => {
        const rule = (action: Partial<BlockConfig>): Partial<RuleUserRules> => ({
            justCheck: true,
            triggers: [{ id: 'TriggerScriptSave', acceptedBy: 'triggers', _id: 1 }],
            actions: {
                then: [
                    {
                        id: 'ActionToggleState',
                        acceptedBy: 'actions',
                        _id: 5,
                        oid: 'javascript.0.temp',
                        ...action,
                    } as BlockConfig,
                ],
                else: [],
            },
        });

        /**
         * Compared as text and written typed: the state holds the number 20 where "20" was
         * configured, and a toggle that never recognises its own first value would silently always
         * write the second one.
         */
        it('compares as text and writes numbers as numbers', () => {
            expect(compileParsed(rule({ value1: '20', value2: '22', tagCard: 'control' }))).toContain(
                'String((await getStateAsync("javascript.0.temp"))?.val) === "20" ? 22 : 20',
            );
        });

        it('writes booleans as booleans', () => {
            expect(compileParsed(rule({ value1: 'true', value2: 'false' }))).toContain('=== "true" ? false : true');
        });

        it('escapes quotes and backslashes in text values', () => {
            const code = compileParsed(rule({ value1: 'He said "hi"', value2: 'back\\slash' }));
            expect(code).toContain(String.raw`? "back\\slash" : "He said \"hi\""`);
        });

        it('acknowledges on "update" and controls on "control"', () => {
            expect(compileParsed(rule({ value1: '1', value2: '2', tagCard: 'update' }))).toContain(
                'await setStateAsync("javascript.0.temp", subActionVar5, true)',
            );
            expect(compileParsed(rule({ value1: '1', value2: '2', tagCard: 'control' }))).toContain(
                'await setStateAsync("javascript.0.temp", subActionVar5, false)',
            );
        });

        it('writes nothing without an object', () => {
            const code = compileParsed(rule({ oid: '', value1: 'a', value2: 'b' }));
            expect(code).not.toContain('setStateAsync');
            expect(code).toContain('No object selected');
        });

        // A line break in a value would end the comment and turn the next line into code
        it('does not let a value escape into the script', () => {
            const code = compileParsed(rule({ value1: 'a\nregisterNotification("injected")', value2: 'b' }));
            expect(code).not.toMatch(/^\s*registerNotification\("injected"\)/m);
        });
    });
    describe('ActionHTTPCall', () => {
        const rule = (url: string): Partial<RuleUserRules> => ({
            justCheck: true,
            triggers: [{ id: 'TriggerScriptSave', acceptedBy: 'triggers', _id: 1 }],
            actions: {
                then: [{ id: 'ActionHTTPCall', acceptedBy: 'actions', _id: 7, url } as BlockConfig],
                else: [],
            },
        });

        /**
         * "request" was a global while the adapter still bundled the package of that name. It is
         * gone from the sandbox, so a rule with this block ended in a ReferenceError - which nothing
         * caught, because no one parses the generated script.
         */
        it('calls httpGet and not the long gone request()', () => {
            const code = compileParsed(rule('http://device/on'));
            expect(code).toContain('httpGet(subActionVar7,');
            expect(code).not.toContain('request(');
        });

        it('does not wait for the response', () => {
            expect(compileParsed(rule('http://device/on'))).not.toContain('await httpGet');
        });

        it('reports the status code and the error back to the editor', () => {
            const code = compileParsed(rule('http://device/on'));
            expect(code).toContain('statusCode: response.statusCode');
            expect(code).toContain('error: error ? error.message : undefined');
        });

        it('escapes a quote in the URL', () => {
            expect(compileParsed(rule('http://d/?a="b"'))).toContain(String.raw`"http://d/?a=\"b\""`);
        });
    });
    describe('TriggerEnumMembers', () => {
        const trigger: BlockConfig = {
            id: 'TriggerEnumMembers',
            acceptedBy: 'triggers',
            _id: 1,
            enumId: 'enum.rooms.living_room',
        };

        it('subscribes to the enum with the ordinary state callback', () => {
            expect(compileParsed(withNotification(trigger))).toContain(
                'onEnumMembers("enum.rooms.living_room", async function (obj)',
            );
        });

        // The callback is a plain state subscription, so %s means what it means everywhere else
        it('substitutes %s with the new value and %id with the state that changed', () => {
            const code = compileParsed(withNotification(trigger));
            expect(code).toContain('const v = obj.state.val;');
            expect(code).toContain('.replace(/%id/g, obj.id)');
        });

        it('subscribes to nothing without an enum', () => {
            const code = compileParsed(withNotification({ ...trigger, enumId: '' }));
            expect(code).not.toContain('onEnumMembers(');
            expect(code).toContain('No enum defined');
        });
    });

    describe('ActionMessageTo', () => {
        const rule = (action: Partial<BlockConfig>): Partial<RuleUserRules> => ({
            justCheck: true,
            triggers: [{ id: 'TriggerScriptSave', acceptedBy: 'triggers', _id: 1 }],
            actions: {
                then: [
                    {
                        id: 'ActionMessageTo',
                        acceptedBy: 'actions',
                        _id: 8,
                        message: 'myMessage',
                        data: 'Hello',
                        ...action,
                    } as BlockConfig,
                ],
                else: [],
            },
        });

        // The other half of the "On message" trigger - a rule calling another rule
        it('sends the payload under the message name', () => {
            const code = compileParsed(rule({}));
            expect(code).toContain('messageTo("myMessage", subActionVar8)');
        });

        it('hands a JSON payload over as an object', () => {
            const code = compileParsed(rule({ asJson: true, data: '{"a": 1}' }));
            expect(code).toContain('messageTo("myMessage", {"a": 1})');
        });

        it('sends nothing when the JSON does not parse', () => {
            const code = compileParsed(rule({ asJson: true, data: '{oops' }));
            expect(code).not.toContain('messageTo(');
            expect(code).toContain('Invalid JSON');
        });

        it('sends nothing without a message name', () => {
            const code = compileParsed(rule({ message: '' }));
            expect(code).not.toContain('messageTo(');
            expect(code).toContain('No message name defined');
        });

        it('escapes a quote in the message name', () => {
            expect(compileParsed(rule({ message: 'with "quotes"' }))).toContain(JSON.stringify('with "quotes"'));
        });
    });

    describe('ActionSetStateChanged', () => {
        const rule = (action: Partial<BlockConfig>): Partial<RuleUserRules> => ({
            justCheck: true,
            triggers: [{ id: 'TriggerScriptSave', acceptedBy: 'triggers', _id: 1 }],
            actions: {
                then: [
                    {
                        id: 'ActionSetStateChanged',
                        acceptedBy: 'actions',
                        _id: 6,
                        oid: 'javascript.0.x',
                        ...action,
                    } as BlockConfig,
                ],
                else: [],
            },
        });

        // The whole reason the block exists: an unchanged value must not be written at all
        it('writes through setStateChangedAsync', () => {
            const code = compileParsed(rule({ value: '5', tagCard: 'control' }));
            expect(code).toContain('await setStateChangedAsync("javascript.0.x", subActionVar6, false)');
            expect(code).not.toContain('await setStateAsync(');
        });

        it('acknowledges on "update"', () => {
            expect(compileParsed(rule({ value: '5', tagCard: 'update' }))).toContain(
                'await setStateChangedAsync("javascript.0.x", subActionVar6, true)',
            );
        });

        it('inverts the current value when toggling', () => {
            expect(compileParsed(rule({ toggle: true }))).toContain('!(await getStateAsync("javascript.0.x")).val');
        });

        it('takes the trigger value when asked to', () => {
            expect(compileParsed(rule({ useTrigger: true }))).toContain('= obj.state.val');
        });

        /**
         * It derives from ActionSetState, whose constructor passes `new.target` down - without that
         * the card would carry the base block's name and icon while saving itself under its own id.
         */
        it('describes itself and not the block it derives from', () => {
            const instance = new (ActionSetStateChanged as any)({});
            expect(instance.state.name).toBe('Set state if changed');
            expect(instance.state.icon).toBe('PublishedWithChanges');
            expect(instance.getData().id).toBe('ActionSetStateChanged');
        });

        it('is a block of its own, not the plain set state action', () => {
            const ids = blocks.map(block => block.getStaticData().id);
            expect(ids).toContain('ActionSetStateChanged');
            expect(ids).toContain('ActionSetState');
        });
    });
});

/**
 * What the substitution does at runtime. The generated `.replace()` chain is run against a fake event
 * with a `formatValue()` that behaves like the one of the sandbox on a system with `isFloatComma`, so
 * the cases cover what a user gets in the message, not only what the code looks like.
 */
describe('value substitution in texts', () => {
    const formatValue = (value: number | string, decimals: number): string =>
        Number(value).toFixed(decimals).replace('.', ',');

    function context(trigger: BlockConfig): RuleContext {
        return { trigger, condition: { index: 0 }, conditionsStates: [], conditionsVars: [], conditionsDebug: [] };
    }

    function substitute(text: string, ctx: RuleContext, scope: Record<string, unknown>): string {
        const replaces = GenericBlock.getReplacesInText(ctx);
        const names = Object.keys(scope);
        const fn = new Function(...names, 'formatValue', `return ${JSON.stringify(text)}${replaces};`);
        return fn(...names.map(name => scope[name]), formatValue);
    }

    describe('with a state trigger', () => {
        const ctx = context({ id: 'TriggerState', acceptedBy: 'triggers', _id: 1, oidType: 'number' } as BlockConfig);
        const event = (val: unknown, oldVal: unknown = 20): Record<string, unknown> => ({
            id: 'hm-rpc.0.fridge.TEMP',
            common: { name: 'Fridge' },
            state: { val },
            oldState: { val: oldVal },
        });

        it('inserts the raw value for %s, float noise included', () => {
            expect(substitute('Fridge too warm (%s°C)', ctx, { obj: event(29.400000000000002) })).toBe(
                'Fridge too warm (29.400000000000002°C)',
            );
        });

        it('rounds to the given digits after the decimal point with the separator of the system', () => {
            expect(substitute('%.1s°C', ctx, { obj: event(29.400000000000002) })).toBe('29,4°C');
            expect(substitute('%.0s / %.3s', ctx, { obj: event(29.46) })).toBe('29 / 29,460');
        });

        it('rounds a numeric string, too', () => {
            expect(substitute('%.1s', ctx, { obj: event('29.400000000000002') })).toBe('29,4');
        });

        it('leaves a value that is no number as it is, whatever the pattern says', () => {
            expect(substitute('%.1s', ctx, { obj: event('on') })).toBe('on');
            expect(substitute('%.1s', ctx, { obj: event(true) })).toBe('true');
            expect(substitute('%.1s', ctx, { obj: event(null) })).toBe('null');
            expect(substitute('%.1s', ctx, { obj: event('') })).toBe('');
        });

        it('rounds the old value with %.Nold and keeps %old raw', () => {
            expect(substitute('%old -> %.2old', ctx, { obj: event(1, 20.456) })).toBe('20.456 -> 20,46');
        });

        it('still substitutes %id and %name', () => {
            expect(substitute('%name (%id): %s', ctx, { obj: event(5) })).toBe('Fridge (hm-rpc.0.fridge.TEMP): 5');
        });

        it('inserts a value containing replacement patterns literally', () => {
            expect(substitute('[%s]', ctx, { obj: event('$& $1 $$') })).toBe('[$& $1 $$]');
        });
    });

    describe('with a message trigger', () => {
        const ctx = context({ id: 'TriggerMessage', acceptedBy: 'triggers', _id: 1, message: 'm' } as BlockConfig);

        it('rounds a numeric payload and serialises an object', () => {
            expect(substitute('%.1s', ctx, { data: 2.26 })).toBe('2,3');
            expect(substitute('%s', ctx, { data: { a: 1 } })).toBe('{"a":1}');
            expect(substitute('%.1s', ctx, { data: { a: 1 } })).toBe('{"a":1}');
        });
    });

    describe('with a file trigger', () => {
        const ctx = context({ id: 'TriggerFile', acceptedBy: 'triggers', _id: 1 } as BlockConfig);

        it('replaces %s and a %.1s with the file name', () => {
            expect(substitute('%s|%.1s|%id', ctx, { fileName: 'a.txt', fileId: 'vis.0' })).toBe('a.txt|a.txt|vis.0');
        });
    });
});
