const expect = require("chai").expect;
const os = require("os");
const path = require("path");
const fs = require("fs");
const Mirror = require("../lib/mirror");

describe("Mirror", () => {
  describe("File system watcher", () => {
    let mirror = null;
    let watched = null;

    beforeEach(() => {
      watched = fs.mkdtempSync(path.join(os.tmpdir(), "mirror-test-watched-"));

      const noop = () => {};

      mirror = new Mirror({
        diskRoot: watched,
        adapter: {
          namespace: "javascript.0",
          getForeignObject: noop,
        },
      });
    });

    describe("watchFolders", () => {
      it("notifies about changes to normal files", (done) => {
        const script = path.join(watched, "script.js");
        fs.closeSync(fs.openSync(script, "w"));

        mirror.onFileChange = (_event, file) => {
          expect(path.normalize(file)).to.equal(script);

          done();
        };

        mirror.watchFolders(watched);

        fs.appendFileSync(script, "some code");
      });

      it("notifies about changes to symlinked files", (done) => {
        // Script is located in an unwatched directory...
        const unwatched = fs.mkdtempSync(path.join(os.tmpdir(), "mirror-test-unwatched-"));

        const script = path.join(unwatched, "script.js");
        fs.closeSync(fs.openSync(script, "w"));

        // ...but symlinked as a file from a watched directory.
        const symlink = path.join(watched, "symlinked-script.js");
        fs.symlinkSync(script, symlink);

        mirror.onFileChange = (_event, file) => {
          expect(path.normalize(file)).to.equal(symlink);

          done();
        };

        mirror.watchFolders(watched);

        fs.appendFileSync(script, "some code");
      });

      it("notifies about changes to symlinked directories", (done) => {
        // Script is located in an unwatched directory...
        const unwatched = fs.mkdtempSync(path.join(os.tmpdir(), "mirror-test-unwatched-"));

        const script = path.join(unwatched, "script.js");
        fs.closeSync(fs.openSync(script, "w"));

        // ...but symlinked as a directory from a watched directory.
        const symlink = path.join(watched, "symlinked-directory");
        fs.symlinkSync(unwatched, symlink, "dir");

        mirror.onFileChange = (event, file) => {
          if (process.platform === "linux" || process.platform === "win32") {
            expect(path.normalize(file)).to.equal(path.join(symlink, path.basename(script)));

            done();
          }

          if (process.platform === "darwin") {
            if (
              event === "rename" &&
              file === path.join(symlink, path.basename(script))
            ) {
              done();
            }
          }
        };

        mirror.watchFolders(watched);

        fs.appendFileSync(script, "some code");
      });

      it("notifies about changes to relatively symlinked files", (done) => {
        // Script is located in an unwatched directory...
        const unwatched = fs.mkdtempSync(
          path.join(os.tmpdir(), "mirror-test-unwatched-")
        );

        const script = path.join(unwatched, "script.js");
        fs.closeSync(fs.openSync(script, "w"));

        // ...but symlinked as a file from a watched directory.
        const symlink = path.join(watched, "symlinked-script.js");
        const relativeDirectory = path.relative(
          path.dirname(symlink),
          path.dirname(script)
        );

        fs.symlinkSync(
          path.join(relativeDirectory, path.basename(script)),
          symlink
        );

        mirror.onFileChange = (_event, file) => {
          expect(path.normalize(file)).to.equal(symlink);

          done();
        };

        mirror.watchFolders(watched);

        fs.appendFileSync(script, "some code");
      });

      it("notifies about changes to relatively symlinked directories", (done) => {
        // Script is located in an unwatched directory...
        const unwatched = fs.mkdtempSync(path.join(os.tmpdir(), "mirror-test-unwatched-"));

        const script = path.join(unwatched, "script.js");
        fs.closeSync(fs.openSync(script, "w"));

        // ...but symlinked as a directory from a watched directory.
        const symlink = path.join(watched, "symlinked-directory");
        const relativeSymlink = path.relative(watched, unwatched);

        fs.symlinkSync(relativeSymlink, symlink, "dir");

        mirror.onFileChange = (event, file) => {
          if (process.platform === "linux" || process.platform === "win32") {
            expect(path.normalize(file)).to.equal(path.join(symlink, path.basename(script)));

            done();
          }

          if (process.platform === "darwin") {
            if (
              event === "rename" &&
              file === path.join(symlink, path.basename(script))
            ) {
              done();
            }
          }
        };

        mirror.watchFolders(watched);

        fs.appendFileSync(script, "some code");
      });
    });
  });
});
