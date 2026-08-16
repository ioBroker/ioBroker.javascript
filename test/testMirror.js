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
});
