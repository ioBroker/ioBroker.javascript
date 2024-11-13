const fs = require('node:fs');
const expect = require('chai').expect;

describe('Test package.json and io-package.json', () => {
    it('Test package files', done => {
        console.log();

        const fileContentIOPackage = fs.readFileSync(__dirname + '/../io-package.json', 'utf8');
        const ioPackage = JSON.parse(fileContentIOPackage);

        const fileContentNPMPackage = fs.readFileSync(__dirname + '/../package.json', 'utf8');
        const npmPackage = JSON.parse(fileContentNPMPackage);

        expect(ioPackage).to.be.an('object');
        expect(npmPackage).to.be.an('object');

        expect(ioPackage.common.version, 'ERROR: Version number in io-package.json needs to exist').to.exist;
        expect(npmPackage.version, 'ERROR: Version number in package.json needs to exist').to.exist;

        expect(
            ioPackage.common.version,
            'ERROR: Version numbers in package.json and io-package.json needs to match',
        ).to.be.equal(npmPackage.version);

        if (!ioPackage.common.news || !ioPackage.common.news[ioPackage.common.version]) {
            console.log(
                'WARNING: No news entry for current version exists in io-package.json, no rollback in Admin possible!',
            );
            console.log();
        }

        expect(npmPackage.author, 'ERROR: Author in package.json needs to exist').to.exist;
        expect(ioPackage.common.authors, 'ERROR: Authors in io-package.json needs to exist').to.exist;

        expect(ioPackage.common.license, 'ERROR: License missing in io-package in common.license').to.exist;

        if (ioPackage.common.name.indexOf('template') !== 0) {
            if (Array.isArray(ioPackage.common.authors)) {
                expect(
                    ioPackage.common.authors.length,
                    'ERROR: Author in io-package.json needs to be set',
                ).to.not.be.equal(0);
                if (ioPackage.common.authors.length === 1) {
                    expect(
                        ioPackage.common.authors[0],
                        'ERROR: Author in io-package.json needs to be a real name',
                    ).to.not.be.equal('my Name <my@email.com>');
                }
            } else {
                expect(
                    ioPackage.common.authors,
                    'ERROR: Author in io-package.json needs to be a real name',
                ).to.not.be.equal('my Name <my@email.com>');
            }
        } else {
            console.log('WARNING: Testing for set authors field in io-package skipped because template adapter');
            console.log();
        }
        expect(
            fs.existsSync(__dirname + '/../README.md'),
            'ERROR: README.md needs to exist! Please create one with description, detail information and changelog. English is mandatory.',
        ).to.be.true;
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
            console.log(
                'WARNING: title contains Adapter or ioBroker. It is clear anyway, that it is adapter for ioBroker.',
            );
            console.log();
        }

        if (!ioPackage.common.controller && !ioPackage.common.onlyWWW && !ioPackage.common.noConfig) {
            if (
                !ioPackage.common.materialize ||
                !fs.existsSync(__dirname + '/../admin/index_m.html') ||
                !fs.existsSync(__dirname + '/../gulpfile.js')
            ) {
                console.log('WARNING: Admin3 support is missing! Please add it');
                console.log();
            }
            if (ioPackage.common.materialize) {
                expect(
                    fs.existsSync(__dirname + '/../admin/index_m.html'),
                    'Admin3 support is enabled in io-package.json, but index_m.html is missing!',
                ).to.be.true;
            }
        }

        const licenseFileExists = fs.existsSync(__dirname + '/../LICENSE');
        const fileContentReadme = fs.readFileSync(__dirname + '/../README.md', 'utf8');
        if (fileContentReadme.indexOf('## Changelog') === -1) {
            console.log('Warning: The README.md should have a section ## Changelog');
            console.log();
        }
        expect(
            licenseFileExists || fileContentReadme.includes('## License'),
            'A LICENSE must exist as LICENSE file or as part of the README.md',
        ).to.be.true;
        if (!licenseFileExists) {
            console.log('Warning: The License should also exist as LICENSE file');
            console.log();
        }
        if (!fileContentReadme.includes('## License')) {
            console.log('Warning: The README.md should also have a section ## License to be shown in Admin3');
            console.log();
        }
        done();
    });
});
