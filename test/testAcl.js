'use strict';

/**
 * Access rights as scripts give them to chmodFile and chmodObject, and the names of owner and group
 * for chownFile and chownObject.
 *
 * Rights are written like for chmod, but in hex: 0x664 or '664'. A decimal 664 looks the same in the
 * script, but is 0x298 and would be stored as nonsense - it must be rejected.
 *
 * Run: npx mocha test/testAcl.js --exit
 */
const assert = require('node:assert').strict;
const { parseAclMode, formatAclMode, normalizeAclUser, normalizeAclGroup } = require('../build/lib/sandbox');

describe('ACL helpers for chmod and chown', () => {
    describe('parseAclMode', () => {
        it('takes numbers written in hex', () => {
            assert.equal(parseAclMode(0x664), 0x664);
            assert.equal(parseAclMode(0x644), 0x644);
            assert.equal(parseAclMode(0x777), 0x777);
            assert.equal(parseAclMode(0), 0);
        });

        it('reads strings as hex, with or without 0x', () => {
            assert.equal(parseAclMode('664'), 0x664);
            assert.equal(parseAclMode('0x640'), 0x640);
            assert.equal(parseAclMode('0X640'), 0x640);
            assert.equal(parseAclMode(' 600 '), 0x600);
            assert.equal(parseAclMode('4'), 0x4);
        });

        it('rejects a decimal number that only looks like rights', () => {
            // 664 = 0x298, 644 = 0x284
            assert.equal(parseAclMode(664), null);
            assert.equal(parseAclMode(644), null);
        });

        it('rejects digits above 7, too many digits and other types', () => {
            assert.equal(parseAclMode('668'), null);
            assert.equal(parseAclMode('6644'), null);
            assert.equal(parseAclMode('rw-r--r--'), null);
            assert.equal(parseAclMode(''), null);
            assert.equal(parseAclMode(0x1000), null);
            assert.equal(parseAclMode(-1), null);
            assert.equal(parseAclMode(1.5), null);
            assert.equal(parseAclMode(null), null);
            assert.equal(parseAclMode(undefined), null);
            assert.equal(parseAclMode({ mode: 0x644 }), null);
        });
    });

    describe('formatAclMode', () => {
        it('shows numbers in hex, everything else as given', () => {
            assert.equal(formatAclMode(0x664), '0x664');
            assert.equal(formatAclMode('664'), '"664"');
            assert.equal(formatAclMode(null), 'null');
        });
    });

    describe('normalizeAclUser and normalizeAclGroup', () => {
        it('complete short names to IDs', () => {
            assert.equal(normalizeAclUser('admin'), 'system.user.admin');
            assert.equal(normalizeAclGroup('user'), 'system.group.user');
        });

        it('keep full IDs', () => {
            assert.equal(normalizeAclUser('system.user.admin'), 'system.user.admin');
            assert.equal(normalizeAclGroup('system.group.administrator'), 'system.group.administrator');
        });
    });
});
