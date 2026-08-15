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

/**
 * Builds an `onFileChange` handler that waits for a change to one specific path.
 *
 * A watcher reports more than the change a test is about. `fs.watch` on macOS works at directory
 * granularity, so a write that reaches the watched directory through a symlink arrives as an event
 * for the *directory* - Node then reports the directory's own name as the file name. Those events
 * are not wrong, they are simply not the subject of the test, so everything but the expected path is
 * ignored and `done` is called once.
 *
 * Waiting instead of asserting on the first event loses the "got this instead" message, so the paths
 * that did arrive are collected and reported if the expected one never does.
 *
 * @param done mocha's callback
 * @param expected the path the change is expected for
 */
function expectChangeTo(done, expected) {
    const seen = [];
    let finished = false;

    const finish = err => {
        if (finished) {
            return;
        }
        finished = true;
        clearTimeout(timer);
        done(err);
    };

    const timer = setTimeout(
        () =>
            finish(
                new Error(
                    `No change was reported for ${expected}. Reported instead: ${seen.length ? seen.join(', ') : '(nothing at all)'}`,
                ),
            ),
        WAIT_FOR_CHANGE,
    );

    return (_event, file) => {
        const reported = path.normalize(file);
        seen.push(reported);
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

                mirror.onFileChange = expectChangeTo(done, script);

                mirror.watchFolders(watched);

                fs.appendFileSync(script, 'some code');
            }).timeout(WAIT_FOR_CHANGE + 4000);

            itWithSymlinks('notifies about changes to symlinked files', done => {
                // Script is located in an unwatched directory...
                const unwatched = fs.mkdtempSync(path.join(os.tmpdir(), 'mirror-test-unwatched-'));

                const script = path.join(unwatched, 'script.js');
                fs.closeSync(fs.openSync(script, 'w'));

                // ...but symlinked as a file from a watched directory.
                const symlink = path.join(watched, 'symlinked-script.js');
                fs.symlinkSync(script, symlink);

                mirror.onFileChange = expectChangeTo(done, symlink);

                mirror.watchFolders(watched);

                fs.appendFileSync(script, 'some code');
            }).timeout(WAIT_FOR_CHANGE + 4000);

            itWithSymlinks('notifies about changes to symlinked directories', done => {
                // Script is located in an unwatched directory...
                const unwatched = fs.mkdtempSync(path.join(os.tmpdir(), 'mirror-test-unwatched-'));

                const script = path.join(unwatched, 'script.js');
                fs.closeSync(fs.openSync(script, 'w'));

                // ...but symlinked as a directory from a watched directory.
                const symlink = path.join(watched, 'symlinked-directory');
                fs.symlinkSync(unwatched, symlink, 'dir');

                mirror.onFileChange = expectChangeTo(done, path.join(symlink, path.basename(script)));

                mirror.watchFolders(watched);

                fs.appendFileSync(script, 'some code');
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

                mirror.onFileChange = expectChangeTo(done, symlink);

                mirror.watchFolders(watched);

                fs.appendFileSync(script, 'some code');
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

                mirror.onFileChange = expectChangeTo(done, path.join(symlink, path.basename(script)));

                mirror.watchFolders(watched);

                fs.appendFileSync(script, 'some code');
            }).timeout(WAIT_FOR_CHANGE + 4000);
        });
    });
});
