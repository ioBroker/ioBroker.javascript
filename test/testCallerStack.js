'use strict';

/**
 * Tests of `withCallerStack`, which wraps the asynchronous API functions of the sandbox.
 *
 * A script that did not handle a rejected `setStateAsync` (e.g. of a missing state) terminated the adapter:
 * the error is created in a `setImmediate` or in a callback of the database, so its stack has no frame of
 * the script, and the `error` handler in main.ts took it for an error of the adapter itself.
 *
 * Run: npx mocha test/testCallerStack.js --exit
 */
const assert = require('node:assert').strict;
const vm = require('node:vm');
const { withCallerStack } = require('../build/lib/sandbox');

const SCRIPT_NAME = 'script.js.common.test_callerStack';

/**
 * Runs code compiled like a user script (main.ts uses the script ID as the file name)
 *
 * @param {string} code The expression to evaluate, it gets the API as `api`
 * @param {Record<string, any>} api The functions the code calls
 * @returns {any} the result of the expression
 */
function runScript(code, api) {
    return new vm.Script(`(api) => ${code}`, { filename: SCRIPT_NAME }).runInThisContext()(api);
}

/**
 * Creates a function that rejects later, like the database does - the error has no frame of the caller
 *
 * @param {() => any} createReason Creates the reason of the rejection
 * @returns {{ fn: () => Promise<void>, reasons: any[], stacks: (string | undefined)[] }} the function, the reasons it rejected with and their stacks at creation
 */
function rejectLater(createReason) {
    const reasons = [];
    const stacks = [];
    const fn = () =>
        new Promise((_resolve, reject) =>
            setImmediate(() => {
                const reason = createReason();
                reasons.push(reason);
                stacks.push(reason?.stack);
                reject(reason);
            }),
        );
    return { fn, reasons, stacks };
}

/**
 * @param {Promise<any>} promise The promise to wait for
 * @returns {Promise<{ value?: any, reason?: any, rejected: boolean }>} how the promise settled
 */
function settle(promise) {
    return promise.then(
        value => ({ value, rejected: false }),
        reason => ({ reason, rejected: true }),
    );
}

/**
 * Finds the script in a stack, as the `error` handler in main.ts does
 *
 * @param {string} stack The stack of the error
 * @returns {string | null} the script ID or null
 */
function scriptOfStack(stack) {
    const index = stack.indexOf('script.js.');
    if (index === -1) {
        return null;
    }
    const rest = stack.substring(index);
    return rest.substring(0, rest.indexOf(':'));
}

describe('withCallerStack', () => {
    it('lets a rejection created outside of the script point to the script', async () => {
        const later = rejectLater(() => new Error('State "javascript.0.missing" not found'));
        const api = { setStateAsync: withCallerStack(later.fn) };

        const result = await settle(runScript(`api.setStateAsync('javascript.0.missing', 1)`, api));

        assert.ok(result.rejected);
        // the error itself, not a copy of it
        assert.equal(result.reason, later.reasons[0]);
        assert.equal(result.reason.message, 'State "javascript.0.missing" not found');
        // without the wrapper, the error does not know the script
        assert.equal(scriptOfStack(later.stacks[0]), null);
        assert.equal(scriptOfStack(result.reason.stack), SCRIPT_NAME);
        // the frames of the call follow the original ones
        assert.ok(result.reason.stack.startsWith(later.stacks[0]));
        // the first line of the captured frames ("Error") is not taken over: only frames are appended
        const appended = result.reason.stack.substring(later.stacks[0].length).split('\n').filter(Boolean);
        assert.ok(appended.length > 0);
        for (const line of appended) {
            assert.match(line, /^\s+at /);
        }
        // the wrapper itself is not among the frames
        assert.ok(!appended.some(line => line.includes('wrapped')));
    });

    it('leaves the stack alone if the call does not come from a script', async () => {
        const later = rejectLater(() => new Error('failed'));

        const result = await settle(withCallerStack(later.fn)());

        assert.ok(result.rejected);
        assert.equal(result.reason, later.reasons[0]);
        assert.equal(result.reason.stack, later.stacks[0]);
    });

    it('leaves the stack alone if the error already points to the script', async () => {
        let created;
        const fn = () => {
            // created synchronously within the call - so with the frames of the script
            created = new Error('failed');
            return Promise.reject(created);
        };
        const api = { fn: withCallerStack(fn) };

        const result = await settle(runScript('api.fn()', api));
        const stackAtCreation = created.stack;

        assert.ok(result.rejected);
        assert.equal(result.reason, created);
        assert.equal(scriptOfStack(stackAtCreation), SCRIPT_NAME);
        assert.equal(result.reason.stack, stackAtCreation);
    });

    it('appends the frames of the script only once if wrapped functions call each other', async () => {
        // like $().setStateAsync(), which calls the wrapped setStateAsync of the sandbox
        const later = rejectLater(() => new Error('failed'));
        const inner = withCallerStack(later.fn);
        const outer = withCallerStack(async () => {
            await inner();
        });

        const result = await settle(runScript('api.outer()', { outer }));

        assert.ok(result.rejected);
        assert.equal(scriptOfStack(result.reason.stack), SCRIPT_NAME);
        assert.equal(result.reason.stack.split(SCRIPT_NAME).length - 1, 1);
    });

    it('lets the outer call add the script if the inner call no longer sees it', async () => {
        // $().setStateAsync() calls setStateAsync for the second state after an `await`:
        // the script is then no longer on the stack of the inner call
        const later = rejectLater(() => new Error('failed'));
        const inner = withCallerStack(later.fn);
        const outer = withCallerStack(async () => {
            await new Promise(resolve => setImmediate(resolve));
            await inner();
        });

        const result = await settle(runScript('api.outer()', { outer }));

        assert.ok(result.rejected);
        assert.equal(scriptOfStack(result.reason.stack), SCRIPT_NAME);
        assert.equal(result.reason.stack.split(SCRIPT_NAME).length - 1, 1);
    });

    it('rejects with an error whose stack is read-only as it is', async () => {
        const later = rejectLater(() => {
            const err = new Error('read-only');
            Object.defineProperty(err, 'stack', { value: err.stack, writable: false, configurable: false });
            return err;
        });
        const api = { fn: withCallerStack(later.fn) };

        const result = await settle(runScript('api.fn()', api));

        // not with the TypeError of the failed assignment
        assert.ok(result.rejected);
        assert.equal(result.reason, later.reasons[0]);
        assert.equal(result.reason.stack, later.stacks[0]);
    });

    it('rejects with a frozen error as it is', async () => {
        // whether `stack` of a frozen error can be set depends on the Node.js version (accessor or data property)
        const later = rejectLater(() => Object.freeze(new Error('frozen')));
        const api = { fn: withCallerStack(later.fn) };

        const result = await settle(runScript('api.fn()', api));

        assert.ok(result.rejected);
        assert.equal(result.reason, later.reasons[0]);
        assert.equal(result.reason.message, 'frozen');
        assert.ok(result.reason.stack.startsWith(later.stacks[0]));
    });

    it('rejects with reasons that are not errors as they are', async () => {
        for (const reason of ['text', 42, null, undefined, { code: 'E_TEST' }]) {
            const later = rejectLater(() => reason);
            const api = { fn: withCallerStack(later.fn) };

            const result = await settle(runScript('api.fn()', api));

            assert.ok(result.rejected);
            assert.equal(result.reason, reason);
        }
    });

    it('resolves with the value and keeps `this` and the arguments', async () => {
        // the functions of $() read the selected IDs from `this`
        const selection = {
            0: 'javascript.0.a',
            length: 1,
            getStateAsync: withCallerStack(async function (...args) {
                return { id: this[0], args };
            }),
        };

        const result = await runScript(`api.getStateAsync(1, 'two')`, selection);

        assert.deepEqual(result, { id: 'javascript.0.a', args: [1, 'two'] });
    });
});
