const assert = require('node:assert').strict;
const {
    HISTORY_ROOT,
    INDEX_FILE,
    DEFAULT_HISTORY_VERSIONS,
    MAX_HISTORY_VERSIONS,
    versionFileName,
    historyFolder,
    indexPath,
    versionPath,
    resolveHistoryVersions,
    parseIndex,
    addVersion,
    isWorthStoring,
    describeSource,
    fileToString,
    decodeFolderName,
    sumIndex,
    formatBytes,
    trimIndex,
} = require('../build/lib/scriptHistory');

describe('Test Script History', function () {
    describe('paths', function () {
        it('puts every script in its own folder below the history root', function () {
            assert.equal(historyFolder('script.js.Test'), `${HISTORY_ROOT}/script.js.Test`);
            assert.equal(indexPath('script.js.Test'), `${HISTORY_ROOT}/script.js.Test/${INDEX_FILE}`);
            assert.equal(versionPath('script.js.Test', 1700000000000), `${HISTORY_ROOT}/script.js.Test/1700000000000.txt`);
        });

        it('encodes a script name, it is user-chosen and may contain anything', function () {
            assert.equal(historyFolder('script.js.a b/c'), `${HISTORY_ROOT}/script.js.a%20b%2Fc`);
            assert.ok(!historyFolder('script.js.a/b').endsWith('a/b'), 'a slash must not become a folder');
        });

        it('names a version after its timestamp, which is its identity', function () {
            assert.equal(versionFileName(42), '42.txt');
        });
    });

    describe('resolveHistoryVersions', function () {
        it('falls back to the default when nothing usable is configured', function () {
            assert.equal(resolveHistoryVersions(undefined), DEFAULT_HISTORY_VERSIONS);
            assert.equal(resolveHistoryVersions(''), DEFAULT_HISTORY_VERSIONS);
            assert.equal(resolveHistoryVersions('abc'), DEFAULT_HISTORY_VERSIONS);
        });

        it('reads zero as "switched off" rather than clamping it', function () {
            assert.equal(resolveHistoryVersions(0), 0);
            assert.equal(resolveHistoryVersions(-5), 0);
        });

        it('takes the configured number and caps it', function () {
            assert.equal(resolveHistoryVersions(5), 5);
            assert.equal(resolveHistoryVersions('50'), 50);
            assert.equal(resolveHistoryVersions(99999), MAX_HISTORY_VERSIONS);
        });
    });

    describe('parseIndex', function () {
        it('treats anything unreadable as an empty history, a save must not fail over it', function () {
            assert.deepEqual(parseIndex(undefined), []);
            assert.deepEqual(parseIndex(''), []);
            assert.deepEqual(parseIndex('not json'), []);
            assert.deepEqual(parseIndex('{"not":"an array"}'), []);
        });

        it('drops entries without a timestamp and sorts the rest newest first', function () {
            const index = parseIndex(JSON.stringify([{ ts: 100 }, { nope: true }, { ts: 300 }, { ts: 200 }]));
            assert.deepEqual(
                index.map(v => v.ts),
                [300, 200, 100],
            );
        });
    });

    describe('addVersion', function () {
        const entry = ts => ({ ts, size: 1, lines: 1 });

        it('puts the new version on top', function () {
            const { index, obsolete } = addVersion([entry(100)], entry(200), 10);
            assert.deepEqual(
                index.map(v => v.ts),
                [200, 100],
            );
            assert.deepEqual(obsolete, []);
        });

        it('replaces an entry written in the same millisecond instead of duplicating it', function () {
            const { index } = addVersion([entry(100)], { ts: 100, size: 9, lines: 9 }, 10);
            assert.equal(index.length, 1);
            assert.equal(index[0].size, 9);
        });

        it('drops the surplus in the middle and names the files to delete', function () {
            const existing = [entry(500), entry(400), entry(300), entry(200), entry(100)];
            const { index, obsolete } = addVersion(existing, entry(600), 3);
            // newest two, plus the oldest one
            assert.deepEqual(
                index.map(v => v.ts),
                [600, 500, 100],
            );
            assert.deepEqual(obsolete, [400, 300, 200]);
        });

        it('keeps the very first version even when everything else scrolled away', function () {
            let index = [];
            for (let ts = 1; ts <= 20; ts++) {
                index = addVersion(index, entry(ts), 5).index;
            }
            assert.equal(index.length, 5);
            assert.equal(index[index.length - 1].ts, 1, 'the original state must survive');
            assert.equal(index[0].ts, 20);
        });
    });

    describe('isWorthStoring', function () {
        it('stores a changed source', function () {
            assert.equal(isWorthStoring('a', 'b'), true);
            assert.equal(isWorthStoring(undefined, 'b'), true);
        });

        it('ignores a write that did not touch the source - enabling a script writes the object too', function () {
            assert.equal(isWorthStoring('a', 'a'), false);
        });

        it('stores nothing without a source', function () {
            assert.equal(isWorthStoring('a', ''), false);
            assert.equal(isWorthStoring('a', undefined), false);
            assert.equal(isWorthStoring('a', null), false);
        });
    });

    describe('describeSource', function () {
        it('counts characters and lines', function () {
            assert.deepEqual(describeSource('a\nb\nc', false), { size: 5, lines: 3 });
        });

        it('marks a source that is stored encrypted', function () {
            assert.deepEqual(describeSource('x', true), { size: 1, lines: 1, protected: true });
        });
    });
    describe('fileToString', function () {
        it('takes the content a file back end answers with, whatever shape it has', function () {
            assert.equal(fileToString('plain'), 'plain');
            assert.equal(fileToString({ file: 'wrapped' }), 'wrapped');
            assert.equal(fileToString(Buffer.from('buffered')), 'buffered');
            assert.equal(fileToString({ file: Buffer.from('both') }), 'both');
        });

        it('reads anything else as nothing there', function () {
            assert.equal(fileToString(null), '');
            assert.equal(fileToString(undefined), '');
            assert.equal(fileToString(42), '');
        });
    });
    describe('decodeFolderName', function () {
        it('gets the script id back out of the folder name', function () {
            assert.equal(decodeFolderName('script.js.a%20b%2Fc'), 'script.js.a b/c');
        });

        it('reports a folder it did not write under its own name instead of throwing', function () {
            assert.equal(decodeFolderName('%E0%A4%A'), '%E0%A4%A');
        });
    });

    describe('sumIndex', function () {
        it('adds up what an index says, without reading a single source', function () {
            assert.deepEqual(sumIndex([{ ts: 1, size: 100 }, { ts: 2, size: 250 }]), { versions: 2, bytes: 350 });
        });

        it('survives an entry without a size', function () {
            assert.deepEqual(sumIndex([{ ts: 1 }]), { versions: 1, bytes: 0 });
            assert.deepEqual(sumIndex([]), { versions: 0, bytes: 0 });
        });
    });

    describe('formatBytes', function () {
        it('scales to something readable', function () {
            assert.equal(formatBytes(512), '512 B');
            assert.equal(formatBytes(2048), '2.0 KB');
            assert.equal(formatBytes(5 * 1024 * 1024), '5.00 MB');
        });
    });

    describe('trimIndex', function () {
        const entry = ts => ({ ts, size: 1, lines: 1 });

        it('drops everything when the history is switched off', function () {
            const { index, obsolete } = trimIndex([entry(2), entry(1)], 0);
            assert.deepEqual(index, []);
            assert.deepEqual(obsolete, [2, 1]);
        });

        it('leaves a history that is already within the limit alone', function () {
            const { index, obsolete } = trimIndex([entry(2), entry(1)], 5);
            assert.deepEqual(index.map(v => v.ts), [2, 1]);
            assert.deepEqual(obsolete, []);
        });

        it('cuts down to a limit that was made smaller and keeps the first version', function () {
            const { index, obsolete } = trimIndex([entry(5), entry(4), entry(3), entry(2), entry(1)], 3);
            assert.deepEqual(index.map(v => v.ts), [5, 4, 1]);
            assert.deepEqual(obsolete, [3, 2]);
        });
    });
});
