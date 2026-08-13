const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert').strict;
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

                mirror.onFileChange = (_event, file) => {
                    assert.equal(path.normalize(file), script);

                    done();
                };

                mirror.watchFolders(watched);

                fs.appendFileSync(script, 'some code');
            });

            itWithSymlinks('notifies about changes to symlinked files', done => {
                // Script is located in an unwatched directory...
                const unwatched = fs.mkdtempSync(path.join(os.tmpdir(), 'mirror-test-unwatched-'));

                const script = path.join(unwatched, 'script.js');
                fs.closeSync(fs.openSync(script, 'w'));

                // ...but symlinked as a file from a watched directory.
                const symlink = path.join(watched, 'symlinked-script.js');
                fs.symlinkSync(script, symlink);

                mirror.onFileChange = (_event, file) => {
                    assert.equal(path.normalize(file), symlink);

                    done();
                };

                mirror.watchFolders(watched);

                fs.appendFileSync(script, 'some code');
            });

            itWithSymlinks('notifies about changes to symlinked directories', done => {
                // Script is located in an unwatched directory...
                const unwatched = fs.mkdtempSync(path.join(os.tmpdir(), 'mirror-test-unwatched-'));

                const script = path.join(unwatched, 'script.js');
                fs.closeSync(fs.openSync(script, 'w'));

                // ...but symlinked as a directory from a watched directory.
                const symlink = path.join(watched, 'symlinked-directory');
                fs.symlinkSync(unwatched, symlink, 'dir');

                mirror.onFileChange = (event, file) => {
                    if (process.platform === 'linux' || process.platform === 'win32') {
                        assert.equal(path.normalize(file), path.join(symlink, path.basename(script)));

                        done();
                    }

                    if (process.platform === 'darwin') {
                        if (event === 'rename' && file === path.join(symlink, path.basename(script))) {
                            done();
                        }
                    }
                };

                mirror.watchFolders(watched);

                fs.appendFileSync(script, 'some code');
            });

            itWithSymlinks('notifies about changes to relatively symlinked files', done => {
                // Script is located in an unwatched directory...
                const unwatched = fs.mkdtempSync(path.join(os.tmpdir(), 'mirror-test-unwatched-'));

                const script = path.join(unwatched, 'script.js');
                fs.closeSync(fs.openSync(script, 'w'));

                // ...but symlinked as a file from a watched directory.
                const symlink = path.join(watched, 'symlinked-script.js');
                const relativeDirectory = path.relative(path.dirname(symlink), path.dirname(script));

                fs.symlinkSync(path.join(relativeDirectory, path.basename(script)), symlink);

                mirror.onFileChange = (_event, file) => {
                    assert.equal(path.normalize(file), symlink);

                    done();
                };

                mirror.watchFolders(watched);

                fs.appendFileSync(script, 'some code');
            });

            itWithSymlinks('notifies about changes to relatively symlinked directories', done => {
                // Script is located in an unwatched directory...
                const unwatched = fs.mkdtempSync(path.join(os.tmpdir(), 'mirror-test-unwatched-'));

                const script = path.join(unwatched, 'script.js');
                fs.closeSync(fs.openSync(script, 'w'));

                // ...but symlinked as a directory from a watched directory.
                const symlink = path.join(watched, 'symlinked-directory');
                const relativeSymlink = path.relative(watched, unwatched);

                fs.symlinkSync(relativeSymlink, symlink, 'dir');

                mirror.onFileChange = (event, file) => {
                    if (process.platform === 'linux' || process.platform === 'win32') {
                        assert.equal(path.normalize(file), path.join(symlink, path.basename(script)));

                        done();
                    }

                    if (process.platform === 'darwin') {
                        if (event === 'rename' && file === path.join(symlink, path.basename(script))) {
                            done();
                        }
                    }
                };

                mirror.watchFolders(watched);

                fs.appendFileSync(script, 'some code');
            });
        });
    });
});
