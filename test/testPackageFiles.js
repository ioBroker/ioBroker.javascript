/* jshint -W097 */// jshint strict:false
/*jslint node: true */
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

        done();
    });
});
