/* jshint -W097 */
/* jshint strict:false */
/* jslint node: true */
/* jshint expr: true */
var expect = require('chai').expect;
var fs        = require('fs');

describe('Test package.json and io-package.json', function() {
    it('Test package files', function (done) {
        var fileContentIOPackage = fs.readFileSync(__dirname + '/../io-package.json');
        var ioPackage = JSON.parse(fileContentIOPackage);

        var fileContentNPMPackage = fs.readFileSync(__dirname + '/../package.json');
        var npmPackage = JSON.parse(fileContentNPMPackage);

        expect(ioPackage).to.be.an('object');
        expect(npmPackage).to.be.an('object');

        expect(ioPackage.common.version).to.exist;
        expect(npmPackage.version).to.exist;

        if (!expect(ioPackage.common.version).to.be.equal(npmPackage.version)) {
            console.log('ERROR: Version numbers in package.json and io-package.json differ!!');
        }

        if (!ioPackage.common.news || !ioPackage.common.news[ioPackage.common.version]) {
            console.log('WARNING: No news entry for current version exists in io-package.json, no rollback in Admin possible!');
        }

        expect(ioPackage.common.authors).to.exist;
        if (ioPackage.common.name.indexOf('template') !== 0) {
            if (Array.isArray(ioPackage.common.authors)) {
                expect(ioPackage.common.authors.length).to.not.be.equal(0);
                if (ioPackage.common.authors.length === 1) {
                    expect(ioPackage.common.authors[0]).to.not.be.equal('my Name <my@email.com>');
                }
            }
            else {
                expect(ioPackage.common.authors).to.not.be.equal('my Name <my@email.com>');
            }
        }
        else {
            console.log('Testing for set authors field in io-package skipped because template adapter');
        }
        done();
    });
});
