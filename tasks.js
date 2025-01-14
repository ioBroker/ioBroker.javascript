/**
 * Copyright 2018-2024 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 */

const {
    rmdirSync,
    readFileSync,
    writeFileSync,
    existsSync,
    mkdirSync,
    readdirSync,
    renameSync,
    unlinkSync,
    copyFileSync,
} = require('node:fs');
const { join } = require('node:path');
const { execSync } = require('node:child_process');
const JSZip = require('jszip');
const { deleteFoldersRecursive, copyFiles, npmInstall, buildReact } = require('@iobroker/build-tools');

function adminClean() {
    deleteFoldersRecursive(`${__dirname}/admin/custom`);
    deleteFoldersRecursive(`${__dirname}/src-admin/build`);
}

function adminCopy() {
    copyFiles(
        ['src-admin/build/static/css/*.css', '!src-admin/build/static/css/src_bootstrap_*.css'],
        'admin/custom/static/css',
    );
    copyFiles(['src-admin/build/static/js/*.js'], 'admin/custom/static/js');
    copyFiles(['src-admin/build/static/js/*.map'], 'admin/custom/static/js');
    copyFiles(['src-admin/build/customComponents.js'], 'admin/custom');
    copyFiles(['src-admin/build/customComponents.js.map'], 'admin/custom');
    copyFiles(['src-admin/src/i18n/*.json'], 'admin/custom/i18n');
}

function clean() {
    deleteFoldersRecursive(`${__dirname}/admin`, ['jsonConfig.json', 'javascript.png', 'vsFont']);
    deleteFoldersRecursive(`${__dirname}/src-editor/build`);
}

function copyAllFiles() {
    // deleteFoldersRecursive(`${__dirname}/admin`, ['jsonConfig.json', 'javascript.png']);

    copyFiles(
        [
            'src-editor/build/**/*',
            '!src-editor/build/index.html',
            //             '!src-editor/build/static/js/main.*.chunk.js',
            '!src-editor/build/i18n/**/*',
            '!src-editor/build/i18n',
            '!src-editor/build/google-blockly/blockly-*.*.*.tgz',
        ],
        'admin/',
        {
            process: (fileData, fileName) => {
                if (fileName.includes('.tgz')) {
                    return null;
                }
            },
        },
    );

    let index = readFileSync(`${__dirname}/src-editor/build/index.html`).toString();
    index = index.replace('href="/', 'href="');
    index = index.replace('src="/', 'src="');
    writeFileSync(`${__dirname}/admin/tab.html`, index);

    /*copyFiles(['src-editor/build/static/js/main.*.chunk.js'], 'admin/assets/', {
        replace: {
            find: '"/assets',
            text: '"./assets',
        },
    });*/
}

function replaceScript(text, replaceText) {
    if (text.includes(replaceText)) {
        return text;
    }
    const lines = text.split('\n');
    let found = false;
    let done = false;
    const newLines = [];
    for (let i = 0; i < lines.length; i++) {
        if (!done && lines[i].includes('<script>')) {
            found = true;
            newLines.push(`    ${replaceText}`);
        } else if (!done && found && lines[i].includes('</script>')) {
            found = false;
            done = true;
        } else if (!found) {
            newLines.push(lines[i]);
        }
    }

    return newLines.join('\n');
}

function patch() {
    if (existsSync(`${__dirname}/admin/tab.html`)) {
        let code = readFileSync(`${__dirname}/admin/tab.html`).toString('utf8');
        code = replaceScript(
            code,
            `<script type="text/javascript" onerror="setTimeout(function(){window.location.reload()}, 5000)" src="./../../lib/js/socket.io.js"></script>`,
        );
        // add the monaco script at the end
        if (
            !code.includes(
                `<script type="text/javascript" src="vs/loader.js"></script><script type="text/javascript" src="vs/configure.js"></script>`,
            )
        ) {
            code = code.replace(
                /<\/body>\n?<\/html>/,
                `    <script type="text/javascript" src="vs/loader.js"></script><script type="text/javascript" src="vs/configure.js"></script>\n    </body>\n</html>`,
            );
        }

        writeFileSync(`${__dirname}/admin/tab.html`, code);
    }

    const buffer = Buffer.from(JSON.parse(readFileSync(`${__dirname}/admin/vsFont/codicon.json`).toString()), 'base64');

    // this is a workaround for TTF file. somehow it will always corrupt, so we pack it into ZIP
    return new Promise(resolve =>
        JSZip.loadAsync(buffer).then(zip =>
            zip
                .file('codicon.ttf')
                .async('arraybuffer')
                .then(data => {
                    if (!existsSync(`${__dirname}/admin/vs/base/browser/ui/codicons/codicon/`)) {
                        mkdirSync(`${__dirname}/admin/vs/base/browser/ui/codicons/codicon/`, {
                            recursive: true,
                        });
                    }

                    if (data.byteLength !== 73452) {
                        throw new Error('invalid font file!');
                    }
                    writeFileSync(
                        `${__dirname}/admin/vs/base/browser/ui/codicons/codicon/codicon.ttf`,
                        Buffer.from(data),
                    );
                    resolve();
                }),
        ),
    );
}

const languages = {
    en: {},
    de: {},
    ru: {},
    pt: {},
    nl: {},
    fr: {},
    it: {},
    es: {},
    pl: {},
    'zh-cn': {},
    uk: {},
};

function lang2data(lang, isFlat) {
    let str = isFlat ? '' : '{\n';
    let count = 0;
    for (const w in lang) {
        if (Object.prototype.hasOwnProperty.call(lang, w)) {
            count++;
            if (isFlat) {
                str += `${lang[w] === '' ? isFlat[w] || w : lang[w]}\n`;
            } else {
                const key = `  "${w.replace(/"/g, '\\"')}": `;
                str += `${key}"${lang[w].replace(/"/g, '\\"')}",\n`;
            }
        }
    }
    if (!count) {
        return isFlat ? '' : '{\n}';
    }
    if (isFlat) {
        return str;
    }
    return `${str.substring(0, str.length - 2)}\n}`;
}

const EMPTY = '';

function blocklyWords2json() {
    const src = './src-editor/public/';
    const data = require('./src-editor/public/google-blockly/own/blocks_words.js').Words;
    const langs = Object.assign({}, languages);
    if (data) {
        for (const word in data) {
            if (Object.prototype.hasOwnProperty.call(data, word)) {
                for (const lang in data[word]) {
                    if (Object.prototype.hasOwnProperty.call(data[word], lang)) {
                        langs[lang] = langs[lang] || {};
                        langs[lang][word] = data[word][lang];
                        //  pre-fill all other languages
                        for (const j in langs) {
                            if (Object.prototype.hasOwnProperty.call(langs, j)) {
                                langs[j][word] = langs[j][word] || EMPTY;
                            }
                        }
                    }
                }
            }
        }
        const keys = Object.keys(langs.en);
        // keys.sort();
        for (const l in langs) {
            if (!Object.prototype.hasOwnProperty.call(langs, l)) {
                continue;
            }
            const obj = {};
            for (let k = 0; k < keys.length; k++) {
                obj[keys[k]] = langs[l][keys[k]];
            }
            langs[l] = obj;
        }
        if (!existsSync(`${src}i18n/`)) {
            mkdirSync(`${src}i18n/`);
        }
        for (const ll in langs) {
            if (!Object.prototype.hasOwnProperty.call(langs, ll)) {
                continue;
            }
            if (!existsSync(`${src}i18n/${ll}`)) {
                mkdirSync(`${src}i18n/${ll}`);
            }

            writeFileSync(`${src}i18n/${ll}/translations.json`, lang2data(langs[ll]));
        }
    } else {
        console.error('Cannot read or parse blocks_words.js');
    }
}

function monacoTypescript() {
    // This script downloads a version of monaco that is built with the specified TypeScript version.
    // Use this script to update to a version of TypeScript that is NOT supported by the official monaco-editor releases
    //
    // For a list of versions, check https://typescript.azureedge.net/indexes/releases.json
    // See also https://github.com/microsoft/TypeScript-Website/tree/v2/packages/sandbox how the TypeScript team
    // does it on their website

    let version = process.argv.find(arg => arg.startsWith('--version='));
    if (!version) {
        throw new Error('you must provide a version with the flag --version=<ts-version>');
    } else {
        version = version.substr('--version='.length);
    }

    const vsDir = join(__dirname, 'src-editor/public/vs');

    // Download the tarball
    console.log('downloading new monaco version');
    execSync(`npm pack @typescript-deploys/monaco-editor@${version}`);

    console.log('cleaning up');
    // save the old configure.js
    renameSync(join(vsDir, 'configure.js'), join(__dirname, 'monaco.configure.js'));
    // delete everything else
    rmdirSync(vsDir, { recursive: true });
    mkdirSync(vsDir, { recursive: true });

    console.log('installing new version');
    // extract the new monaco-editor
    execSync(
        `tar -xvzf typescript-deploys-monaco-editor-${version}.tgz --strip-components=3 -C src-editor/public/vs package/min/vs`,
    );
    // and the .d.ts file
    execSync(
        `tar -xvzf typescript-deploys-monaco-editor-${version}.tgz --strip-components=1 -C src-editor/public/vs package/monaco.d.ts`,
    );

    console.log('finalizing');
    // restore the old configure.js
    renameSync(join(__dirname, 'monaco.configure.js'), join(vsDir, 'configure.js'));
    // delete the tarball
    unlinkSync(join(__dirname, `typescript-deploys-monaco-editor-${version}.tgz`));
}

function monacoUpdate() {
    // This script updated the monaco editor to the given official version. Only use this script
    // if the version supports the TypeScript version we want to support

    let version = process.argv.find(arg => arg.startsWith('--version='));
    if (!version) {
        throw new Error('you must provide a version with the flag --version=<editor-version>');
    } else {
        version = version.substr('--version='.length);
    }

    const vsDir = join(__dirname, 'src-editor/public/vs');

    // Download the tarball
    console.log('downloading new monaco version');
    execSync(`npm pack monaco-editor@${version}`);

    console.log('cleaning up');
    // save the old configure.js
    renameSync(join(vsDir, 'configure.js'), join(__dirname, 'monaco.configure.js'));
    // delete everything else
    rmdirSync(vsDir, { recursive: true });
    mkdirSync(vsDir, { recursive: true });

    console.log('installing new version');
    // extract the new monaco-editor
    execSync(`tar -xvzf monaco-editor-${version}.tgz --strip-components=3 -C src-editor/public/vs package/min/vs`);
    // and the .d.ts file
    execSync(`tar -xvzf monaco-editor-${version}.tgz --strip-components=1 -C src-editor/public/vs package/monaco.d.ts`);

    console.log('finalizing');
    // restore the old configure.js
    renameSync(join(__dirname, 'monaco.configure.js'), join(vsDir, 'configure.js'));
    // delete the tarball
    unlinkSync(join(__dirname, `monaco-editor-${version}.tgz`));
}

function blocklyJson2words() {
    const src = './src-editor/public/';
    const dirs = readdirSync(`${src}i18n/`);
    const langs = {};
    const bigOne = {};
    const order = Object.keys(languages);
    dirs.sort((a, b) => {
        const posA = order.indexOf(a);
        const posB = order.indexOf(b);
        if (posA === -1 && posB === -1) {
            if (a > b) {
                return 1;
            }
            if (a < b) {
                return -1;
            }
            return 0;
        }
        if (posA === -1) {
            return -1;
        }
        if (posB === -1) {
            return 1;
        }
        if (posA > posB) {
            return 1;
        }
        if (posA < posB) {
            return -1;
        }
        return 0;
    });

    for (let l = 0; l < dirs.length; l++) {
        if (dirs[l] === 'flat.txt') {
            continue;
        }
        const lang = dirs[l];
        const values = JSON.parse(readFileSync(`${src}i18n/${lang}/translations.json`).toString());
        langs[lang] = {};
        Object.keys(values).forEach(word => {
            langs[lang][word] = langs[lang][word] || {};
            langs[lang][word] = values[word];
        });

        const words = langs[lang];
        for (const word in words) {
            if (Object.prototype.hasOwnProperty.call(words, word)) {
                bigOne[word] = bigOne[word] || {};
                if (words[word] !== EMPTY) {
                    bigOne[word][lang] = words[word];
                }
            }
        }
    }
    // read actual words.js
    const aWords = require('./src-editor/public/google-blockly/own/blocks_words.js').Words;

    const temporaryIgnore = ['pt', 'fr', 'nl', 'es', 'flat.txt'];
    if (aWords) {
        // Merge words together
        for (const w in aWords) {
            if (Object.prototype.hasOwnProperty.call(aWords, w)) {
                if (!bigOne[w]) {
                    console.warn(`Take from actual words.js: ${w}`);
                    bigOne[w] = aWords[w];
                }
                dirs.forEach(lang => {
                    if (temporaryIgnore.includes(lang)) {
                        return;
                    }
                    if (!bigOne[w][lang]) {
                        console.warn(`Missing "${lang}": ${w}`);
                    }
                });
            }
        }
    }

    let text = `if (typeof Blockly === 'undefined') {
    var Blockly = {};
}
// translations
Blockly.Words = {};
`;

    const data = bigOne;
    let group = '';
    let block = '';
    for (const word_ in data) {
        if (Object.prototype.hasOwnProperty.call(data, word_)) {
            if (word_[0] >= 'A' && word_[0] <= 'Z') {
                text += `\n// --- ${word_.toUpperCase()} --------------------------------------------------\n`;
                group = word_.toLowerCase();
            } else {
                const parts = word_.split('_');
                if (parts[0] !== block) {
                    block = parts[0];
                    text += `\n// --- ${group} ${block} --------------------------------------------------\n`;
                }
            }

            text += `Blockly.Words['${`${word_.replace(/'/g, "\\'")}']`.padEnd(40)}= {`;
            let line = '';
            for (const lang_ in data[word_]) {
                if (Object.prototype.hasOwnProperty.call(data[word_], lang_)) {
                    if (data[word_].en.includes('--')) {
                        line += `'${lang_}': '${`${data[word_].en.replace(/'/g, "\\'")}',`.padEnd(50)} `;
                    } else {
                        line += `'${lang_}': '${`${data[word_][lang_].replace(/'/g, "\\'")}',`.padEnd(50)} `;
                    }
                }
            }
            if (line) {
                line = line.trim();
                line = line.substring(0, line.length - 1);
            }
            text += `${line}};\n`;
        }
    }

    text += `
function getHelp(word) {
    return 'https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/javascript.md#' + Blockly.Words[word][systemLang];
}
`;

    text += `
Blockly.Translate = function (word, lang) {
    lang = lang || systemLang;
    if (Blockly.Words && Blockly.Words[word]) {
        return Blockly.Words[word][lang] || Blockly.Words[word].en;
    } else {
        return word;
    }
};
`;

    text += `
if (typeof module !== 'undefined' && typeof module.parent !== 'undefined') {
    module.exports = Blockly;
}
`;
    writeFileSync('./src-editor/public/google-blockly/own/blocks_words.js', text);
}

if (process.argv.includes('--copy-types')) {
    copyFileSync(`${__dirname}/src/types.d.ts`, `${__dirname}/build-backend/types.d.ts`);
    copyFileSync(`${__dirname}/src/lib/javascript.d.ts`, `${__dirname}/build-backend/lib/javascript.d.ts`);
} else if (process.argv.includes('--admin-0-clean')) {
    adminClean();
} else if (process.argv.includes('--admin-1-npm')) {
    npmInstall(`${__dirname}/src-admin/`).catch(e => {
        console.error(`Cannot install npm: ${e}`);
        process.exit(2);
    });
} else if (process.argv.includes('--admin-2-compile')) {
    buildReact(`${__dirname}/src-admin/`, { rootDir: __dirname, craco: true, exec: true }).catch(e => {
        console.error(`Cannot build widgets: ${e}`);
        process.exit(2);
    });
} else if (process.argv.includes('--admin-3-copy')) {
    adminCopy();
} else if (process.argv.includes('--admin-build')) {
    adminClean();
    npmInstall(`${__dirname}/src-admin/`)
        .then(() => buildReact(`${__dirname}/src-admin/`, { rootDir: __dirname, craco: true, exec: true }))
        .then(() => adminCopy())
        .catch(e => {
            console.error(`Cannot build admin controls: ${e}`);
            process.exit(2);
        });
} else if (process.argv.includes('--0-clean')) {
    clean();
} else if (process.argv.includes('--1-npm')) {
    if (!existsSync(`${__dirname}/src-editor/node_modules`)) {
        npmInstall(`${__dirname}/src-editor`).catch(e => {
            console.error(`Cannot install npm: ${e}`);
            process.exit(2);
        });
    }
} else if (process.argv.includes('--2-build')) {
    buildReact(`${__dirname}/src-editor/`, {
        rootDir: __dirname,
        vite: true,
        maxRam: 7000,
    }).catch(e => {
        console.error(`Cannot build react: ${e}`);
        process.exit(2);
    });
} else if (process.argv.includes('--3-copy')) {
    copyAllFiles();
} else if (process.argv.includes('--4-patch')) {
    patch().catch(e => {
        console.error(`Cannot patch: ${e}`);
        process.exit(2);
    });
} else if (process.argv.includes('--build')) {
    clean();
    npmInstall(`${__dirname}/src-editor`)
        .then(() =>
            buildReact(`${__dirname}/src-editor/`, {
                rootDir: __dirname,
                tsc: true,
                vite: true,
                maxRam: 7000,
            }),
        )
        .then(() => copyAllFiles())
        .then(() => patch())
        .catch(e => {
            console.error(`Cannot build: ${e}`);
            process.exit(2);
        });
} else if (process.argv.includes('--blocklyJson2words')) {
    blocklyJson2words();
} else if (process.argv.includes('--blocklyWords2json')) {
    blocklyWords2json();
} else if (process.argv.includes('--monaco-update')) {
    monacoUpdate();
} else if (process.argv.includes('--monaco-typescript')) {
    monacoTypescript();
} else {
    clean();
    adminClean();

    npmInstall(`${__dirname}/src-editor`)
        .then(() =>
            buildReact(`${__dirname}/src-editor/`, {
                rootDir: __dirname,
                vite: true,
                tsc: true,
                maxRam: 7000,
            }),
        )
        .then(() => copyAllFiles())
        .then(() => patch())
        .then(() => npmInstall(`${__dirname}/src-admin/`))
        .then(() => buildReact(`${__dirname}/src-admin/`, { rootDir: __dirname, craco: true, exec: true }))
        .then(() => adminCopy())
        .catch(e => {
            console.error(`Cannot build admin controls: ${e}`);
            process.exit(2);
        });
}
