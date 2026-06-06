'use strict';

/**
 * Regression tests for the O(1) subscription dispatch index (subscriptionsMap / subscriptionsWildcard).
 *
 * The subscribe side (sandbox.subscribe) and ALL removal sites (sandbox.unsubscribe and
 * the script-stop cleanup in main.ts) must use the identical exact-id classification.
 * A mismatch leaks subscriptions in the structure that was not searched
 * (e.g. a string id starting with '/' indexed into subscriptionsWildcard, but searched
 * in subscriptionsMap on removal).
 *
 * Run: npx mocha test/testSubscriptionDispatchIndex.js --exit
 */
const assert = require('node:assert').strict;
const { isExactId, removeFromDispatchIndex } = require('../build/lib/sandbox');

function makeContext() {
    return {
        subscriptionsMap: new Map(),
        subscriptionsWildcard: [],
    };
}

function makeSub(id, name = 'script.js.test') {
    return {
        pattern: { id, change: 'ne' },
        name,
        callback: () => {},
    };
}

/** Mirrors the indexing branch of sandbox.subscribe() */
function addToDispatchIndex(ctx, sub) {
    const id = sub.pattern.id;
    if (isExactId(id)) {
        if (!ctx.subscriptionsMap.has(id)) {
            ctx.subscriptionsMap.set(id, []);
        }
        ctx.subscriptionsMap.get(id).push(sub);
    } else {
        ctx.subscriptionsWildcard.push(sub);
    }
}

describe('Dispatch index – isExactId classification', () => {
    it('plain state ids are exact', () => {
        assert.equal(isExactId('javascript.0.myState'), true);
        assert.equal(isExactId('hm-rpc.0.ABC123.1.STATE'), true);
        assert.equal(isExactId('0_userdata.0.test'), true);
    });

    it('wildcard ids are not exact', () => {
        assert.equal(isExactId('javascript.0.*'), false);
        assert.equal(isExactId('*'), false);
        assert.equal(isExactId('hm-rpc.0.?.STATE'), false);
    });

    it('RegExp-notation strings (leading "/") are not exact', () => {
        assert.equal(isExactId('/^hm-rpc\\.0\\..*/'), false);
        assert.equal(isExactId('/javascript.0.test/'), false);
    });

    it('non-string and empty ids are not exact', () => {
        assert.equal(isExactId(/^hm-rpc\.0\./), false);
        assert.equal(isExactId(undefined), false);
        assert.equal(isExactId(null), false);
        assert.equal(isExactId(''), false);
        assert.equal(isExactId(42), false);
        assert.equal(isExactId(['a.b.c']), false);
    });
});

describe('Dispatch index – removeFromDispatchIndex', () => {
    it('removes an exact-id subscription from the map and deletes the empty bucket', () => {
        const ctx = makeContext();
        const sub = makeSub('javascript.0.myState');
        addToDispatchIndex(ctx, sub);
        assert.equal(ctx.subscriptionsMap.get('javascript.0.myState').length, 1);

        removeFromDispatchIndex(ctx, sub);
        assert.equal(ctx.subscriptionsMap.has('javascript.0.myState'), false);
        assert.equal(ctx.subscriptionsWildcard.length, 0);
    });

    it('keeps the bucket when other subscriptions for the same id remain', () => {
        const ctx = makeContext();
        const sub1 = makeSub('javascript.0.myState', 'script.js.one');
        const sub2 = makeSub('javascript.0.myState', 'script.js.two');
        addToDispatchIndex(ctx, sub1);
        addToDispatchIndex(ctx, sub2);

        removeFromDispatchIndex(ctx, sub1);
        const bucket = ctx.subscriptionsMap.get('javascript.0.myState');
        assert.equal(bucket.length, 1);
        assert.equal(bucket[0], sub2);

        removeFromDispatchIndex(ctx, sub2);
        assert.equal(ctx.subscriptionsMap.has('javascript.0.myState'), false);
    });

    it('removes a wildcard subscription from the wildcard array', () => {
        const ctx = makeContext();
        const sub = makeSub('javascript.0.*');
        addToDispatchIndex(ctx, sub);
        assert.equal(ctx.subscriptionsWildcard.length, 1);

        removeFromDispatchIndex(ctx, sub);
        assert.equal(ctx.subscriptionsWildcard.length, 0);
        assert.equal(ctx.subscriptionsMap.size, 0);
    });

    it('removes a RegExp-notation string id from the wildcard array (regression: script-stop leak)', () => {
        // A string id starting with '/' contains neither '*' nor '?'.
        // A removal site checking only for wildcards would wrongly search the map
        // and leave the entry in subscriptionsWildcard forever.
        const ctx = makeContext();
        const sub = makeSub('/^hm-rpc\\.0\\..*/');
        addToDispatchIndex(ctx, sub);
        assert.equal(ctx.subscriptionsWildcard.length, 1, 'leading "/" must be indexed as wildcard');

        removeFromDispatchIndex(ctx, sub);
        assert.equal(ctx.subscriptionsWildcard.length, 0, 'leading "/" must be removed from the wildcard array');
        assert.equal(ctx.subscriptionsMap.size, 0);
    });

    it('removes a RegExp-object subscription from the wildcard array', () => {
        const ctx = makeContext();
        const sub = makeSub(/^hm-rpc\.0\./);
        addToDispatchIndex(ctx, sub);
        assert.equal(ctx.subscriptionsWildcard.length, 1);

        removeFromDispatchIndex(ctx, sub);
        assert.equal(ctx.subscriptionsWildcard.length, 0);
    });

    it('removes a subscription without pattern.id from the wildcard array', () => {
        const ctx = makeContext();
        const sub = makeSub(undefined);
        addToDispatchIndex(ctx, sub);
        assert.equal(ctx.subscriptionsWildcard.length, 1);

        removeFromDispatchIndex(ctx, sub);
        assert.equal(ctx.subscriptionsWildcard.length, 0);
    });

    it('is a no-op for subscriptions that are not indexed', () => {
        const ctx = makeContext();
        const indexed = makeSub('javascript.0.a');
        addToDispatchIndex(ctx, indexed);

        removeFromDispatchIndex(ctx, makeSub('javascript.0.b'));
        removeFromDispatchIndex(ctx, makeSub('javascript.0.*'));
        assert.equal(ctx.subscriptionsMap.get('javascript.0.a').length, 1);
        assert.equal(ctx.subscriptionsWildcard.length, 0);
    });

    it('subscribe → remove leaves both structures empty for every id shape (stop-script consistency)', () => {
        const ids = [
            'javascript.0.exact',
            'javascript.0.*',
            'hm-rpc.?.STATE',
            '/^hm-rpc\\.0\\..*/',
            /^modbus\.0\./,
            undefined,
        ];
        const ctx = makeContext();
        const subs = ids.map(id => makeSub(id));
        subs.forEach(sub => addToDispatchIndex(ctx, sub));
        assert.equal(ctx.subscriptionsMap.size + ctx.subscriptionsWildcard.length, ids.length);

        // mirrors the script-stop cleanup in main.ts
        subs.forEach(sub => removeFromDispatchIndex(ctx, sub));
        assert.equal(ctx.subscriptionsMap.size, 0, 'subscriptionsMap must be empty after stop');
        assert.equal(ctx.subscriptionsWildcard.length, 0, 'subscriptionsWildcard must be empty after stop');
    });
});
