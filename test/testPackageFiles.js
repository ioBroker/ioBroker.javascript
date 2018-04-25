/* jshint -W097 */
/* jshint strict:false */
/* jslint node: true */
/* jshint expr: true */
var expect = require('chai').expect;
var fs        = require('fs');

describe('Test package.json and io-package.json', function() {
    it('Test package files', function (done) {
        console.log();

        var fileContentIOPackage = fs.readFileSync(__dirname + '/../io-package.json', 'utf8');
        var ioPackage = JSON.parse(fileContentIOPackage);

        var fileContentNPMPackage = fs.readFileSync(__dirname + '/../package.json', 'utf8');
        var npmPackage = JSON.parse(fileContentNPMPackage);

        expect(ioPackage).to.be.an('object');
        expect(npmPackage).to.be.an('object');

        expect(ioPackage.common.version, 'ERROR: Version number in io-package.json needs to exist').to.exist;
        expect(npmPackage.version, 'ERROR: Version number in package.json needs to exist').to.exist;

        expect(ioPackage.common.version, 'ERROR: Version numbers in package.json and io-package.json needs to match').to.be.equal(npmPackage.version);

        if (!ioPackage.common.news || !ioPackage.common.news[ioPackage.common.version]) {
            console.log('WARNING: No news entry for current version exists in io-package.json, no rollback in Admin possible!');
            console.log();
        }

        expect(npmPackage.author, 'ERROR: Author in package.json needs to exist').to.exist;
        expect(ioPackage.common.authors, 'ERROR: Authors in io-package.json needs to exist').to.exist;

        if (ioPackage.common.name.indexOf('template') !== 0) {
            if (Array.isArray(ioPackage.common.authors)) {
                expect(ioPackage.common.authors.length, 'ERROR: Author in io-package.json needs to be set').to.not.be.equal(0);
                if (ioPackage.common.authors.length === 1) {
                    expect(ioPackage.common.authors[0], 'ERROR: Author in io-package.json needs to be a real name').to.not.be.equal('my Name <my@email.com>');
                }
            }
            else {
                expect(ioPackage.common.authors, 'ERROR: Author in io-package.json needs to be a real name').to.not.be.equal('my Name <my@email.com>');
            }
        }
        else {
            console.log('WARNING: Testing for set authors field in io-package skipped because template adapter');
            console.log();
        }
        expect(fs.existsSync(__dirname + '/../README.md'), 'ERROR: README.md needs to exist! Please create one with description, detail information and changelog. English is mandatory.').to.be.true;
        expect(fs.existsSync(__dirname + '/../LICENSE'), 'ERROR: LICENSE needs to exist! Please create one.').to.be.true;
        if (!ioPackage.common.titleLang || typeof ioPackage.common.titleLang !== 'object') {
            console.log('WARNING: titleLang is not existing in io-package.json. Please add');
            console.log();
        }
        if (
            ioPackage.common.title.indexOf('iobroker') !== -1 ||
            ioPackage.common.title.indexOf('ioBroker') !== -1 ||
            ioPackage.common.title.indexOf('adapter') !== -1 ||
            ioPackage.common.title.indexOf('Adapter') !== -1
        ) {
            console.log('WARNING: title contains Adapter or ioBroker. It is clear anyway, that it is adapter for ioBroker.');
            console.log();
        }

        if (ioPackage.common.name.indexOf('vis-') !== 0) {
            if (!ioPackage.common.materialize || !fs.existsSync(__dirname + '/../admin/index_m.html') || !fs.existsSync(__dirname + '/../gulpfile.js')) {
                console.log('WARNING: Admin3 support is missing! Please add it');
                console.log();
            }
            if (ioPackage.common.materialize) {
                expect(fs.existsSync(__dirname + '/../admin/index_m.html'), 'Admin3 support is enabled in io-package.json, but index_m.html is missing!').to.be.true;
            }
        }

        expect(fs.existsSync(__dirname + '/../LICENSE'), 'A LICENSE must exist');
        var fileContentReadme = fs.readFileSync(__dirname + '/../README.md', 'utf8');
        expect(fileContentReadme.indexOf('## License'), 'The README.md needs to have a section ## License').not.equal(-1);
        expect(fileContentReadme.indexOf('## Changelog'), 'The README.md needs to have a section ## Changelog').not.equal(-1);
        expect(fileContentReadme.indexOf('## Changelog'), 'The README.md needs to have a section ## License').to.be.below(fileContentReadme.indexOf('## License'));
        done();
    });
});
