const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const Mirror = require('../build/lib/mirror');

/**
 * Creating a symlink on Windows needs elevated rights or developer mode. Where that is missing the
 * symlink tests are skipped instead of failing - on CI, where the rights exist, they still run.
 */
const canCreateSymlinks = (() => {
    const probe = fs.mkdtempSync(path.join(os.tmpdir(), 'mirror-test-symlink-probe-'));
    try {
        fs.symlinkSync(path.join(probe, 'target'), path.join(probe, 'link'));
        return true;
    } catch {
        return false;
    } finally {
        fs.rmSync(probe, { recursive: true, force: true });
    }
})();

const itWithSymlinks = canCreateSymlinks ? it : it.skip;

/** How long a test waits for the change it is about before it gives up */
const WAIT_FOR_CHANGE = 6000;
/** How often the change is repeated while waiting - see `expectChangeTo` */
const REPEAT_CHANGE_EVERY = 250;

/**
 * Builds an `onFileChange` handler that waits for a change to one specific path.
 *
 * Two properties of `fs.watch` make the obvious version of these tests unreliable, both observed on
 * macOS in CI:
 *
 * It reports more than the change a test is about. There it works at directory granularity, so a
 * write that reaches the watched directory through a symlink arrives as an event for the *directory*
 * - Node then reports the directory's own name as the file name. Such an event is not wrong, it is
 * simply not the subject of the test, so everything but the expected path is ignored and `done` is
 * called once.
 *
 * And a watch takes a moment to arm, with no way to be told when it is ready. A change made straight
 * after `watchFolders` can therefore be missed entirely - the same commit produced a green and a red
 * macOS job over exactly that. The change is repeated while waiting instead of being made once.
 *
 * Waiting rather than asserting on the first event loses the "got this instead" message, so the paths
 * that did arrive are collected and reported if the expected one never does.
 *
 * @param done mocha's callback
 * @param expected the path the change is expected for
 * @param change makes the change; called repeatedly until it is noticed
 */
function expectChangeTo(done, expected, change) {
    // a set, because the change is repeated and would otherwise be listed once per attempt
    const seen = new Set();
    let finished = false;

    const finish = err => {
        if (finished) {
            return;
        }
        finished = true;
        clearInterval(repeat);
        clearTimeout(timer);
        done(err);
    };

    // the first call happens after one interval, which is safely after `watchFolders` returned
    const repeat = setInterval(change, REPEAT_CHANGE_EVERY);

    const timer = setTimeout(
        () =>
            finish(
                new Error(
                    `No change was reported for ${expected}. Reported instead: ${seen.size ? [...seen].join(', ') : '(nothing at all)'}`,
                ),
            ),
        WAIT_FOR_CHANGE,
    );

    return (_event, file) => {
        const reported = path.normalize(file);
        seen.add(reported);
        if (reported === path.normalize(expected)) {
            finish();
        }
    };
}

describe('Mirror', () => {
    describe('File system watcher', () => {
        let mirror = null;
        let watched = null;

        beforeEach(() => {
            watched = fs.mkdtempSync(path.join(os.tmpdir(), 'mirror-test-watched-'));

            const noop = () => {};

            mirror = new (Mirror.Mirror || Mirror)({
                diskRoot: watched,
                adapter: {
                    namespace: 'javascript.0',
                    getForeignObject: noop,
                },
            });
        });

        describe('watchFolders', () => {
            it('notifies about changes to normal files', done => {
                const script = path.join(watched, 'script.js');
                fs.closeSync(fs.openSync(script, 'w'));

                mirror.onFileChange = expectChangeTo(done, script, () => fs.appendFileSync(script, 'some code'));

                mirror.watchFolders(watched);
            }).timeout(WAIT_FOR_CHANGE + 4000);

            itWithSymlinks('notifies about changes to symlinked files', done => {
                // Script is located in an unwatched directory...
                const unwatched = fs.mkdtempSync(path.join(os.tmpdir(), 'mirror-test-unwatched-'));

                const script = path.join(unwatched, 'script.js');
                fs.closeSync(fs.openSync(script, 'w'));

                // ...but symlinked as a file from a watched directory.
                const symlink = path.join(watched, 'symlinked-script.js');
                fs.symlinkSync(script, symlink);

                mirror.onFileChange = expectChangeTo(done, symlink, () => fs.appendFileSync(script, 'some code'));

                mirror.watchFolders(watched);
            }).timeout(WAIT_FOR_CHANGE + 4000);

            itWithSymlinks('notifies about changes to symlinked directories', done => {
                // Script is located in an unwatched directory...
                const unwatched = fs.mkdtempSync(path.join(os.tmpdir(), 'mirror-test-unwatched-'));

                const script = path.join(unwatched, 'script.js');
                fs.closeSync(fs.openSync(script, 'w'));

                // ...but symlinked as a directory from a watched directory.
                const symlink = path.join(watched, 'symlinked-directory');
                fs.symlinkSync(unwatched, symlink, 'dir');

                mirror.onFileChange = expectChangeTo(done, path.join(symlink, path.basename(script)), () =>
                    fs.appendFileSync(script, 'some code'),
                );

                mirror.watchFolders(watched);
            }).timeout(WAIT_FOR_CHANGE + 4000);

            itWithSymlinks('notifies about changes to relatively symlinked files', done => {
                // Script is located in an unwatched directory...
                const unwatched = fs.mkdtempSync(path.join(os.tmpdir(), 'mirror-test-unwatched-'));

                const script = path.join(unwatched, 'script.js');
                fs.closeSync(fs.openSync(script, 'w'));

                // ...but symlinked as a file from a watched directory.
                const symlink = path.join(watched, 'symlinked-script.js');
                const relativeDirectory = path.relative(path.dirname(symlink), path.dirname(script));

                fs.symlinkSync(path.join(relativeDirectory, path.basename(script)), symlink);

                mirror.onFileChange = expectChangeTo(done, symlink, () => fs.appendFileSync(script, 'some code'));

                mirror.watchFolders(watched);
            }).timeout(WAIT_FOR_CHANGE + 4000);

            itWithSymlinks('notifies about changes to relatively symlinked directories', done => {
                // Script is located in an unwatched directory...
                const unwatched = fs.mkdtempSync(path.join(os.tmpdir(), 'mirror-test-unwatched-'));

                const script = path.join(unwatched, 'script.js');
                fs.closeSync(fs.openSync(script, 'w'));

                // ...but symlinked as a directory from a watched directory.
                const symlink = path.join(watched, 'symlinked-directory');
                const relativeSymlink = path.relative(watched, unwatched);

                fs.symlinkSync(relativeSymlink, symlink, 'dir');

                mirror.onFileChange = expectChangeTo(done, path.join(symlink, path.basename(script)), () =>
                    fs.appendFileSync(script, 'some code'),
                );

                mirror.watchFolders(watched);
            }).timeout(WAIT_FOR_CHANGE + 4000);
        });
    });

    /**
     * Script folders are named by the user, and `sync()` turns those names into regular expressions
     * to find the direct children of a folder. A name like `Lampen (Flur` used to be pasted into the
     * pattern unescaped, so `new RegExp()` threw a `SyntaxError` in the middle of the recursive sync
     * and everything after the folder stayed unsynchronized. Names that stayed valid - `a|b`,
     * `[ab]` - silently matched the wrong scripts instead (#2239).
     */
    describe('Folder names with RegExp metacharacters', () => {
        /**
         * Every metacharacter, including the ones Windows does not allow in a file name. These are
         * checked against the pattern itself, not against a directory on disk.
         */
        const METACHARACTERS = ['(', ')', '[ab]', '{1}', 'a|b', 'a*b', 'a+b', 'a?b', '^a', 'a$', 'a.b', 'a-b'];

        /** The subset that can be a directory on every platform the adapter is tested on */
        const LEGAL_ON_DISK = ['(', ')', '[ab]', '{1}', 'a+b', '^a', 'a$', 'a-b', 'Lampen (Flur', 'Skript [Test]'];

        /** Mirror logs its progress at every level - without this the run is unreadable */
        const silentLog = () => ({
            log: () => {},
            silly: () => {},
            debug: () => {},
            info: () => {},
            warn: () => {},
            error: () => {},
        });

        /** A DB channel - the object a script folder is represented by */
        const folder = id => ({ _id: id, type: 'channel', common: { name: id.split('.').pop() }, native: {} });

        /** A DB script */
        const script = (id, source) => ({
            _id: id,
            type: 'script',
            common: {
                name: id.split('.').pop(),
                source,
                engineType: 'Javascript/js',
                engine: 'system.adapter.javascript.0',
            },
            native: {},
        });

        /** Everything a `Mirror` calls on its adapter while it is constructed */
        function adapterStub(dbObjects) {
            const written = {};

            return {
                written,
                namespace: 'javascript.0',
                getObjectView: (design, _search, _params, cb) => {
                    const wanted = design === 'system' ? 'channel' : 'script';
                    cb(null, {
                        rows: Object.values(dbObjects)
                            .filter(obj => obj.type === wanted)
                            .map(obj => ({ id: obj._id, value: obj })),
                    });
                },
                getForeignObject: (_id, cb) => cb(null, null),
                getForeignState: (_id, cb) => cb(null, { val: 0 }),
                setForeignObject: (id, obj, cb) => {
                    written[id] = obj;
                    cb && cb(null);
                },
                setForeignState: (_id, _val, _ack, cb) => cb && cb(null),
            };
        }

        let root = null;
        let mirrors = [];

        beforeEach(() => {
            root = fs.mkdtempSync(path.join(os.tmpdir(), 'mirror-test-regexp-'));
            mirrors = [];
        });

        afterEach(() => {
            // the constructor arms fs.watch on the temp directory - closing first keeps the removal
            // below from being reported as a change
            for (const mirror of mirrors) {
                Object.values(mirror.watchedFolder || {}).forEach(watcher => watcher.close());
            }
            fs.rmSync(root, { recursive: true, force: true });
        });

        /**
         * @param dbObjects the objects `scanDB()` finds
         */
        function createMirror(dbObjects) {
            const adapter = adapterStub(dbObjects);
            const mirror = new (Mirror.Mirror || Mirror)({ diskRoot: root, adapter, log: silentLog() });
            mirrors.push(mirror);
            return { mirror, written: adapter.written };
        }

        for (const name of METACHARACTERS) {
            it(`finds the children of the DB folder "${name}"`, () => {
                const folderId = `script.js.${name}`;
                const { mirror } = createMirror({ [folderId]: folder(folderId) });

                mirror.dbList = {
                    [folderId]: folder(folderId),
                    [`${folderId}.mine`]: script(`${folderId}.mine`, 'log("mine");'),
                    // a sibling whose ID an unescaped name may match by accident
                    'script.js.a': folder('script.js.a'),
                    'script.js.a.foreign': script('script.js.a.foreign', 'log("foreign");'),
                };

                const children = mirror._getObjectsInPath(folderId);

                if (children.length !== 1 || children[0] !== 'mine') {
                    throw new Error(`"${name}" selected [${children.join(', ')}] instead of [mine]`);
                }
            });
        }

        for (const name of LEGAL_ON_DISK) {
            it(`syncs the folder "${name}" from disk into the DB`, () => {
                fs.mkdirSync(path.join(root, name));
                fs.writeFileSync(path.join(root, name, 'inside.js'), 'log("inside");');

                const folderId = `script.js.${name}`;
                const { written } = createMirror({ [folderId]: folder(folderId) });

                // if the pattern threw, sync() never got as far as the file below the folder
                const scriptId = `${folderId}.inside`;
                if (!written[scriptId]) {
                    throw new Error(
                        `${scriptId} was not created in the DB. Written instead: ${Object.keys(written).join(', ') || '(nothing)'}`,
                    );
                }
                if (written[scriptId].common.source !== 'log("inside");') {
                    throw new Error(`Wrong source for ${scriptId}: ${written[scriptId].common.source}`);
                }
            });
        }

        it('does not claim the scripts of a folder it only matches by accident', () => {
            // "[ab]" as a pattern matches a single "a", so the sync of "[ab]" used to believe that
            // the script inside "a" is one of its own children
            fs.mkdirSync(path.join(root, '[ab]'));
            fs.mkdirSync(path.join(root, 'a'));
            fs.writeFileSync(path.join(root, 'a', 'other.js'), 'log("other");');

            const { written } = createMirror({
                'script.js.[ab]': folder('script.js.[ab]'),
                'script.js.a': folder('script.js.a'),
                'script.js.a.other': script('script.js.a.other', 'log("other");'),
            });

            const wrong = Object.keys(written).filter(id => id.startsWith('script.js.[ab].'));
            if (wrong.length) {
                throw new Error(`The sync of "[ab]" claimed foreign scripts: ${wrong.join(', ')}`);
            }

            // and the script of "a" is still where it was
            if (!fs.existsSync(path.join(root, 'a', 'other.js'))) {
                throw new Error('The script of the folder "a" disappeared');
            }
        });
    });
});
