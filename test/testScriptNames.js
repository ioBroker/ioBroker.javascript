'use strict';

/**
 * Names of scripts on their way into an ID, into the plain text export and back (#2364).
 *
 * An ioBroker ID cannot hold a dot inside one level, so `HK-Balkontuer_v0.1` has to become
 * `script.js.common.HK-Balkontuer_v0_1`. The name itself survives in `common.name` - but everything
 * that was built from the ID instead of the name lost it again: the export named its files after the
 * ID, and the import read the name back out of the file path, where a dot opened a folder.
 *
 * Run: mocha test/testScriptNames.js --exit
 */
const assert = require('node:assert').strict;
const { join } = require('node:path');
const { buildSync } = require('esbuild');

const SOURCE = join(__dirname, '..', 'src-editor', 'src', 'scriptNames.ts');

/** The module has no imports, so esbuild only has to strip the types */
function loadScriptNames() {
    const { text } = buildSync({
        entryPoints: [SOURCE],
        bundle: true,
        format: 'cjs',
        platform: 'node',
        write: false,
        logLevel: 'silent',
    }).outputFiles[0];

    const module = { exports: {} };
    // eslint-disable-next-line no-new-func
    new Function('module', 'exports', text)(module, module.exports);
    return module.exports;
}

describe('Script names', function () {
    this.timeout(30000);

    let names;

    before(() => {
        names = loadScriptNames();
    });

    describe('nameToIdPart', () => {
        it('replaces the dot, which would otherwise open a folder', () => {
            assert.equal(names.nameToIdPart('HK-Balkontuer_v0.1'), 'HK-Balkontuer_v0_1');
            assert.equal(names.nameToIdPart('PWSW-Master-Slave_v0.10_Buero'), 'PWSW-Master-Slave_v0_10_Buero');
        });

        it('replaces everything else an ID must not contain', () => {
            assert.equal(names.nameToIdPart('a/b\\c[d]e*f,g;h'), 'a_b_c_d_e_f_g_h');
            assert.equal(names.nameToIdPart('with spaces'), 'with_spaces');
            assert.equal(names.nameToIdPart('trailing.'), 'trailing_');
        });

        it('leaves a harmless name alone', () => {
            assert.equal(names.nameToIdPart('PW-TV-Control_v0_6_VH_OG1'), 'PW-TV-Control_v0_6_VH_OG1');
            assert.equal(names.nameToIdPart('Heizung-Bad'), 'Heizung-Bad');
        });
    });

    describe('nameToFileName', () => {
        it('keeps the dot - that is the whole point', () => {
            assert.equal(names.nameToFileName('HK-Balkontuer_v0.1'), 'HK-Balkontuer_v0.1');
            assert.equal(names.nameToFileName('PW-TV-Control_v0.6_VH_OG1'), 'PW-TV-Control_v0.6_VH_OG1');
        });

        it('keeps spaces and umlauts', () => {
            assert.equal(names.nameToFileName('Rollladen Büro'), 'Rollladen Büro');
        });

        it('replaces what a file name must not contain', () => {
            assert.equal(names.nameToFileName('a/b'), 'a_b');
            assert.equal(names.nameToFileName('a\\b:c*d?e"f<g>h|i'), 'a_b_c_d_e_f_g_h_i');
        });

        it('avoids names the file system would mangle', () => {
            // Windows silently drops a trailing dot or space
            assert.equal(names.nameToFileName('Skript.'), 'Skript');
            assert.equal(names.nameToFileName('Skript '), 'Skript');
            // a leading dot would hide the file
            assert.equal(names.nameToFileName('.hidden'), '_hidden');
            // and something has to be left over
            assert.equal(names.nameToFileName('...'), '_');
            assert.equal(names.nameToFileName(''), '_');
        });
    });

    describe('the plain text export', () => {
        it('takes the folders from the ID and the file name from the script name', () => {
            const id = 'script.js.common.Heizung.HK-Balkontuer_v0_1';

            assert.equal(names.scriptIdToZipFolder(id), 'common/Heizung');
            assert.equal(names.nameToFileName('HK-Balkontuer_v0.1'), 'HK-Balkontuer_v0.1');
        });

        it('puts a script without a folder into the root of the ZIP', () => {
            assert.equal(names.scriptIdToZipFolder('script.js.Skript_1'), '');
        });

        it('reads a path back without inventing a folder for the dot', () => {
            const script = names.zipPathToScript('common/Heizung/HK-Balkontuer_v0.1.js');

            assert.equal(script.id, 'script.js.common.Heizung.HK-Balkontuer_v0_1');
            assert.equal(script.name, 'HK-Balkontuer_v0.1');
            assert.deepEqual(script.parts, ['common', 'Heizung', 'HK-Balkontuer_v0.1']);
        });

        it('reads every extension the export writes', () => {
            for (const ext of ['js', 'ts', 'blockly', 'rules']) {
                const script = names.zipPathToScript(`common/Skript_1.${ext}`);
                assert.equal(script.id, 'script.js.common.Skript_1', ext);
                assert.equal(script.name, 'Skript_1', ext);
            }
        });

        it('survives the round trip with the names from the report', () => {
            const scripts = [
                { id: 'script.js.common.PW-TV-Control_v0_6_VH_OG1', name: 'PW-TV-Control_v0.6_VH_OG1' },
                { id: 'script.js.common.PWSW-Master-Slave_v0_10_Büro', name: 'PWSW-Master-Slave_v0.10_Büro' },
                { id: 'script.js.common.Heizung.HK-Balkontuer_v0_1', name: 'HK-Balkontuer_v0.1' },
                { id: 'script.js.Skript_1', name: 'Skript 1' },
            ];

            for (const script of scripts) {
                const folder = names.scriptIdToZipFolder(script.id);
                const path = `${folder ? `${folder}/` : ''}${names.nameToFileName(script.name)}.js`;
                const back = names.zipPathToScript(path);

                assert.equal(back.name, script.name, `name of ${path}`);
                assert.equal(back.id, script.id, `id of ${path}`);
            }
        });

        it('never lets a dot in a name become a folder', () => {
            // this is what produced the reported "6.json": the version number ended up as a script
            // of its own inside a folder named after the first half
            const script = names.zipPathToScript('common/PW-TV-Control_v0.6.js');

            assert.equal(script.parts.length, 2, 'the path has one folder and one file');
            assert.equal(script.id.split('.').length, 4, `unexpected levels in ${script.id}`);
            assert.equal(script.id, 'script.js.common.PW-TV-Control_v0_6');
        });
    });

    describe('getScriptName', () => {
        it('takes a plain name', () => {
            assert.equal(names.getScriptName('script.js.common.a', { common: { name: 'My script' } }), 'My script');
        });

        it('takes the requested language of a translated name', () => {
            const obj = { common: { name: { en: 'Heating', de: 'Heizung' } } };

            assert.equal(names.getScriptName('script.js.common.a', obj, 'de'), 'Heizung');
            assert.equal(names.getScriptName('script.js.common.a', obj, 'en'), 'Heating');
            // falls back to English for a language the name does not have
            assert.equal(names.getScriptName('script.js.common.a', obj, 'fr'), 'Heating');
        });

        it('falls back to the ID without its root', () => {
            assert.equal(names.getScriptName('script.js.common.a', { common: {} }), 'common.a');
            assert.equal(names.getScriptName('script.js.common.a', null), 'common.a');
        });
    });
});
