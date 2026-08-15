'use strict';

/**
 * Regression tests for https://github.com/ioBroker/ioBroker.javascript/issues/2307
 *
 * A state of a structured type keeps its value as JSON - `setState` stringifies it on the way in.
 * js-controller expects the same of `common.def` and rejects anything else with "Default value has
 * to be stringified but received type ...". `createState` used to pass the default through
 * untouched, so the only way to give such a state an initial value produced that warning.
 *
 * Run: npx mocha test/testStateDefault.js --exit
 */
const assert = require('node:assert').strict;
const { normalizeStateDefault } = require('../build/lib/sandbox');

/**
 * @param type The state type
 * @param def The default value
 * @returns the common after normalization
 */
function normalize(type, def) {
    const common = { name: 'test', role: 'state', type, def };
    normalizeStateDefault(common);
    return common;
}

describe('normalizeStateDefault', () => {
    it('stringifies the default of an object state', () => {
        // the call from the issue
        assert.equal(normalize('object', {}).def, '{}');
        assert.equal(normalize('object', { a: 1 }).def, '{"a":1}');
    });

    it('stringifies the default of an array state', () => {
        assert.equal(normalize('array', []).def, '[]');
        assert.equal(normalize('array', [1, 'x']).def, '[1,"x"]');
    });

    it('stringifies the default of a json state', () => {
        // `json` is not part of ioBroker.CommonType, but js-controller accepts it
        assert.equal(normalize('json', { a: 1 }).def, '{"a":1}');
    });

    it('leaves a default that is already stringified alone', () => {
        // it must not be encoded a second time
        assert.equal(normalize('object', '{}').def, '{}');
        assert.equal(normalize('array', '[1,2]').def, '[1,2]');
    });

    it('leaves the defaults of other types alone', () => {
        assert.equal(normalize('number', 42).def, 42);
        assert.equal(normalize('boolean', false).def, false);
        assert.equal(normalize('string', 'text').def, 'text');
        // `mixed` is left alone on purpose. js-controller does not accept an object there either,
        // but it demands one of "string", "number", "boolean" - not JSON. `setState` does not
        // stringify the value of a mixed state, so stringifying its default would make the two
        // disagree about what the state holds.
        assert.deepEqual(normalize('mixed', { a: 1 }).def, { a: 1 });
    });

    it('leaves a missing default alone', () => {
        assert.equal(normalize('object', undefined).def, undefined);
        // js-controller skips the check for null as well
        assert.equal(normalize('object', null).def, null);
    });

    it('reports a default that cannot be stringified', () => {
        // `createState` catches this, warns and drops the default rather than writing a broken object
        const circular = {};
        circular.self = circular;

        assert.throws(() => normalizeStateDefault({ name: 'test', role: 'state', type: 'object', def: circular }));
    });
});
