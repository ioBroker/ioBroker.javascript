/**
 * Copyright 2018-2023 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 **/
'use strict';

const gulp    = require('gulp');
const fs      = require('fs');
const path    = require('path');
const rename  = require('gulp-rename');
const replace = require('gulp-replace');
const cp      = require('child_process');
const JSZip   = require('jszip');

function deleteFoldersRecursive(path, exceptions) {
    if (fs.existsSync(path)) {
        const files = fs.readdirSync(path);
        for (const file of files) {
            const curPath = `${path}/${file}`;
            if (exceptions && exceptions.find(e => curPath.endsWith(e))) {
                continue;
            }

            const stat = fs.statSync(curPath);
            if (stat.isDirectory()) {
                deleteFoldersRecursive(curPath);
                fs.rmdirSync(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        }
    }
}

gulp.task('clean', done => {
    deleteFoldersRecursive(`${__dirname}/admin`);
    deleteFoldersRecursive(`${__dirname}/src/build`);
    done();
});

function npmInstall() {
    return new Promise((resolve, reject) => {
        // Install node modules
        const cwd = `${__dirname.replace(/\\/g, '/')}/src/`;

        const cmd = `npm install -f`;
        console.log(`"${cmd} in ${cwd}`);

        // System call used for update of js-controller itself,
        // because during an installation npm packet will be deleted too, but some files must be loaded even during the installation process.
        const exec = require('child_process').exec;
        const child = exec(cmd, {cwd});

        child.stderr.pipe(process.stderr);
        child.stdout.pipe(process.stdout);

        child.on('exit', (code /* , signal */) => {
            // code 1 is a strange error that cannot be explained. Everything is installed but error :(
            if (code && code !== 1) {
                reject(`Cannot install: ${code}`);
            } else {
                console.log(`"${cmd} in ${cwd} finished.`);
                // command succeeded
                resolve();
            }
        });
    });
}

gulp.task('2-npm', () => {
    if (fs.existsSync(`${__dirname}/src/node_modules`)) {
        return Promise.resolve();
    } else {
        return npmInstall();
    }
});

gulp.task('2-npm-dep', gulp.series('clean', '2-npm'));

function build() {
    return new Promise((resolve, reject) => {
        const version = JSON.parse(fs.readFileSync(`${__dirname}/package.json`).toString('utf8')).version;
        const data = JSON.parse(fs.readFileSync(`${__dirname}/src/package.json`).toString('utf8'));
        data.version = version;
        fs.writeFileSync(`${__dirname}/src/package.json`, JSON.stringify(data, null, 4));

        let script =  `${__dirname}/src/node_modules/@craco/craco/dist/bin/craco.js`;
        if (!fs.existsSync(script)) {
            script = `${__dirname}/node_modules/@craco/craco/dist/bin/craco.js`;
        }
        if (!fs.existsSync(script)) {
            console.error(`Cannot find execution file: ${script}`);
            reject(`Cannot find execution file: ${script}`);
        } else {
            const cmd = `node ${script} --max-old-space-size=7000 build`;
            const child = cp.exec(cmd, { cwd: `${__dirname}/src/` });

            child.stderr.pipe(process.stderr);
            child.stdout.pipe(process.stdout);

            child.on('exit', (code /* , signal */) => {
                // code 1 is a strange error that cannot be explained. Everything is installed but error :(
                if (code && code !== 1) {
                    reject(`Cannot install: ${code}`);
                } else {
                    console.log(`"${cmd} in ${__dirname}/src/ finished.`);
                    // command succeeded
                    resolve();
                }
            });
        }
    });
}

gulp.task('3-build', () => build());

gulp.task('3-build-dep', gulp.series('2-npm', '3-build'));

function copyFiles() {
    deleteFoldersRecursive(`${__dirname}/admin`);
    return Promise.all([
        gulp.src([
            'src/build/**/*',
            '!src/build/index.html',
            '!src/build/static/js/main.*.chunk.js',
            '!src/build/i18n/**/*',
            '!src/build/i18n',
            'admin-config/*'
        ])
            .pipe(gulp.dest('admin/')),

        gulp.src([
            'src/build/index.html',
        ])
            .pipe(replace('href="/', 'href="'))
            .pipe(replace('src="/', 'src="'))
            .pipe(rename('tab.html'))
            .pipe(gulp.dest('admin/')),
        gulp.src([
            'src/build/static/js/main.*.chunk.js',
        ])
            .pipe(replace('"/assets', '"./assets'))
            .pipe(gulp.dest('admin/assets/')),
    ]);
}

gulp.task('5-copy', () => copyFiles());

gulp.task('5-copy-dep', gulp.series('3-build-dep', '5-copy'));

gulp.task('6-patch', () => new Promise(resolve => {
    if (fs.existsSync(`${__dirname}/admin/tab.html`)) {
        let code = fs.readFileSync(`${__dirname}/admin/tab.html`).toString('utf8');
        code = code.replace(/<script>var head=document\.getElementsByTagName\("head"\)\[0][^<]+<\/script>/,
            `<script type="text/javascript" onerror="setTimeout(function(){window.location.reload()}, 5000)" src="./../../lib/js/socket.io.js"></script>`);
        // add the monaco script at the end
        if (!code.includes(`<script type="text/javascript" src="vs/loader.js"></script><script type="text/javascript" src="vs/configure.js"></script>`)) {
            code = code.replace('</body></html>', `<script type="text/javascript" src="vs/loader.js"></script><script type="text/javascript" src="vs/configure.js"></script></body></html>`);
        }

        fs.writeFileSync(`${__dirname}/admin/tab.html`, code);
    }
    if (fs.existsSync(`${__dirname}/src/build/index.html`)) {
        let code = fs.readFileSync(`${__dirname}/src/build/index.html`).toString('utf8');
        code = code.replace(/<script>var head=document\.getElementsByTagName\("head"\)\[0][^<]+<\/script>/,
            `<script type="text/javascript" onerror="setTimeout(function(){window.location.reload()}, 5000)" src="./../../lib/js/socket.io.js"></script>`);
        // add the monaco script at the end
        if (!code.includes(`<script type="text/javascript" src="vs/loader.js"></script><script type="text/javascript" src="vs/configure.js"></script>`)) {
            code = code.replace('</body></html>', `<script type="text/javascript" src="vs/loader.js"></script><script type="text/javascript" src="vs/configure.js"></script></body></html>`);
        }

        fs.writeFileSync(`${__dirname}/src/build/index.html`, code);
    }

    const buffer = Buffer.from(JSON.parse(fs.readFileSync(`${__dirname}/admin-config/vsFont/codicon.json`)), 'base64');

    // this is a workaround for TTF file. somehow it will always corrupt, so we pack it into ZIP
    JSZip.loadAsync(buffer)
        .then(zip => {
            zip.file('codicon.ttf').async('arraybuffer')
                .then(data => {
                    if (!fs.existsSync(`${__dirname}/admin/vs/base/browser/ui/codicons/codicon/`)) {
                        fs.mkdirSync(`${__dirname}/admin/vs/base/browser/ui/codicons/codicon/`, {recursive: true});
                    }

                    if (data.byteLength !== 73452) {
                        throw new Error('invalid font file!');
                    }
                    fs.writeFileSync(`${__dirname}/admin/vs/base/browser/ui/codicons/codicon/codicon.ttf`, Buffer.from(data));
                    resolve();
                });
        });
}));

gulp.task('6-patch-dep',  gulp.series('5-copy-dep', '6-patch'));

gulp.task('default', gulp.series('6-patch-dep'));

// you can write here: words.js, jquery.cron.words.js or adminWords.js
const fileName = 'adminWords.js';
const languages =  {
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
        if (lang.hasOwnProperty(w)) {
            count++;
            if (isFlat) {
                str += (lang[w] === '' ? (isFlat[w] || w) : lang[w]) + '\n';
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
    } else {
        return str.substring(0, str.length - 2) + '\n}';
    }
}

function readWordJs(src) {
    try {
        let words;
        if (fs.existsSync(`${src}js/${fileName}`)) {
            words = fs.readFileSync(`${src}js/${fileName}`).toString();
        } else {
            words = fs.readFileSync(src + fileName).toString();
        }

        const lines = words.split(/\r\n|\r|\n/g);
        let i = 0;
        while (!lines[i].match(/^systemDictionary = {/) && !lines[i].match(/^const jQueryCronWords = {/)) {
            i++;
        }
        lines.splice(0, i);

        // remove last empty lines
        i = lines.length - 1;
        while (!lines[i]) {
            i--;
        }
        if (i < lines.length - 1) {
            lines.splice(i + 1);
        }

        lines[0] = lines[0].replace('systemDictionary = ', '').replace('const jQueryCronWords = ', '');
        lines[lines.length - 1] = lines[lines.length - 1].trim().replace(/};$/, '}');
        words = lines.join('\n');
        const resultFunc = new Function(`return ${words};`);

        return resultFunc();
    } catch (e) {
        return null;
    }
}

function padRight(text, totalLength) {
    return text + (text.length < totalLength ? new Array(totalLength - text.length).join(' ') : '');
}

function writeWordJs(data, src) {
    let text = '// DO NOT EDIT THIS FILE!!! IT WILL BE AUTOMATICALLY GENERATED FROM src/i18n\n';
    if (fileName.indexOf('jquery.cron.words.js') !== -1) {
        text += '/*global jQueryCronWords:true */\n';
        text += '\'use strict\';\n\n';
        text += 'const jQueryCronWords = {\n';
    } else {
        text += '/*global systemDictionary:true */\n';
        text += '\'use strict\';\n\n';
        text += 'systemDictionary = {\n';
    }
    for (const word in data) {
        if (data.hasOwnProperty(word)) {
            text += `    ${padRight('"' + word.replace(/"/g, '\\"') + '": {', 50)}`;
            let line = '';
            for (const lang in data[word]) {
                if (data[word].hasOwnProperty(lang)) {
                    if (data[word][lang] === null || data[word][lang] === undefined) {
                        console.log('Error');
                    }

                    line += `"${lang}": "${padRight(data[word][lang].replace(/"/g, '\\"') + '",', 50)} `;
                }
            }
            if (line) {
                line = line.trim();
                line = line.substring(0, line.length - 1);
            }
            text += line + '},\n';
        }
    }
    text += '};';
    if (fs.existsSync(`${src}js/${fileName}`)) {
        fs.writeFileSync(`${src}js/${fileName}`, text);
    } else {
        fs.writeFileSync(`${src}${fileName}`, text);
    }
}

const EMPTY = '';

function words2languages(src) {
    const langs = Object.assign({}, languages);
    const data = readWordJs(src);
    if (data) {
        for (const word in data) {
            if (data.hasOwnProperty(word)) {
                for (const lang in data[word]) {
                    if (data[word].hasOwnProperty(lang)) {
                        langs[lang][word] = data[word][lang];
                        //  pre-fill all other languages
                        for (const j in langs) {
                            if (langs.hasOwnProperty(j)) {
                                langs[j][word] = langs[j][word] || EMPTY;
                            }
                        }
                    }
                }
            }
        }
        if (!fs.existsSync(`${src}i18n/`)) {
            fs.mkdirSync(`${src}i18n/`);
        }
        for (const l in langs) {
            if (!langs.hasOwnProperty(l)) {
                continue;
            }
            const keys = Object.keys(langs[l]);
            keys.sort();
            const obj = {};
            for (let k = 0; k < keys.length; k++) {
                obj[keys[k]] = langs[l][keys[k]];
            }
            if (!fs.existsSync(`${src}i18n/${l}`)) {
                fs.mkdirSync(`${src}i18n/${l}`);
            }

            fs.writeFileSync(`${src}i18n/${l}/translations.json`, lang2data(obj));
        }
    } else {
        console.error(`Cannot read or parse ${fileName}`);
    }
}
function languages2words(src) {
    const dirs = fs.readdirSync(`${src}i18n/`);
    const langs = {};
    const bigOne = {};
    const order = Object.keys(languages);
    dirs.sort((a, b) => {
        const posA = order.indexOf(a);
        const posB = order.indexOf(b);
        if (posA === -1 && posB === -1) {
            if (a > b) return 1;
            if (a < b) return -1;
            return 0;
        } else if (posA === -1) {
            return -1;
        } else if (posB === -1) {
            return 1;
        } else {
            if (posA > posB) return 1;
            if (posA < posB) return -1;
            return 0;
        }
    });
    for (let l = 0; l < dirs.length; l++) {
        if (dirs[l] === 'flat.txt') continue;
        const lang = dirs[l];
        langs[lang] = fs.readFileSync(`${src}i18n/${lang}/translations.json`).toString();
        langs[lang] = JSON.parse(langs[lang]);
        const words = langs[lang];
        for (const word in words) {
            if (words.hasOwnProperty(word)) {
                bigOne[word] = bigOne[word] || {};
                if (words[word] !== EMPTY) {
                    bigOne[word][lang] = words[word];
                }
            }
        }
    }
    // read actual words.js
    const aWords = readWordJs();

    if (aWords) {
        // Merge words together
        for (const w in aWords) {
            if (aWords.hasOwnProperty(w)) {
                if (!bigOne[w]) {
                    console.warn(`Take from actual words.js: ${w}`);
                    bigOne[w] = aWords[w];
                }
                dirs.forEach(lang => {
                    if (!bigOne[w][lang]) {
                        console.warn(`Missing "${lang}": ${w}`);
                    }
                });
            }
        }

    }

    writeWordJs(bigOne, src);
}

gulp.task('blockly2languagesFlat', done => {
    console.log('_______DEPRECATED_____: use blocklyWords2json instead');

    const src = './src/public/';
    const data = require('./src/public/google-blockly/own/blocks_words.js').Words;
    const langs = Object.assign({}, languages);
    if (data) {
        for (const word in data) {
            if (data.hasOwnProperty(word)) {
                for (const lang in data[word]) {
                    if (data[word].hasOwnProperty(lang)) {
                        langs[lang] = langs[lang] || {};
                        langs[lang][word] = data[word][lang];
                        //  pre-fill all other languages
                        for (const j in langs) {
                            if (langs.hasOwnProperty(j)) {
                                langs[j][word] = langs[j][word] || EMPTY;
                            }
                        }
                    }
                }
            }
        }
        const keys = Object.keys(langs.en);
        //keys.sort();
        for (const l in langs) {
            if (!langs.hasOwnProperty(l)) {
                continue;
            }
            const obj = {};
            for (let k = 0; k < keys.length; k++) {
                obj[keys[k]] = langs[l][keys[k]];
            }
            langs[l] = obj;
        }
        if (!fs.existsSync(`${src}i18n/`)) {
            fs.mkdirSync(`${src}i18n/`);
        }
        for (const ll in langs) {
            if (!langs.hasOwnProperty(ll)) {
                continue;
            }
            if (!fs.existsSync(`${src}i18n/${ll}`)) {
                fs.mkdirSync(`${src}i18n/${ll}`);
            }

            fs.writeFileSync(`${src}i18n/${ll}/flat.txt`, lang2data(langs[ll], langs.en));
        }
        fs.writeFileSync(`${src}i18n/flat.txt`, keys.join('\n'));
    } else {
        console.error('Cannot read or parse blocks_words.js');
    }

    done();
});
gulp.task('blocklyLanguagesFlat2words', done => {
    console.log('_______DEPRECATED_____: use blocklyJson2words instead');
    const src = './src/public/';
    const dirs = fs.readdirSync(`${src}i18n/`);
    const langs = {};
    const bigOne = {};
    const order = Object.keys(languages);
    dirs.sort((a, b) => {
        const posA = order.indexOf(a);
        const posB = order.indexOf(b);
        if (posA === -1 && posB === -1) {
            if (a > b) return 1;
            if (a < b) return -1;
            return 0;
        } else if (posA === -1) {
            return -1;
        } else if (posB === -1) {
            return 1;
        } else {
            if (posA > posB) return 1;
            if (posA < posB) return -1;
            return 0;
        }
    });
    const keys = fs.readFileSync(`${src}i18n/flat.txt`).toString().split('\n');

    for (let l = 0; l < dirs.length; l++) {
        if (dirs[l] === 'flat.txt') {
            continue;
        }
        const lang = dirs[l];
        const values = fs.readFileSync(`${src}i18n/${lang}/flat.txt`).toString().split('\n');
        langs[lang] = {};
        keys.forEach((word, i) => langs[lang][word] = values[i]);

        const words = langs[lang];
        for (const word in words) {
            if (words.hasOwnProperty(word)) {
                bigOne[word] = bigOne[word] || {};
                if (words[word] !== EMPTY) {
                    bigOne[word][lang] = words[word];
                }
            }
        }
    }
    // read actual words.js
    const aWords = require('./src/public/google-blockly/own/blocks_words.js').Words;

    const temporaryIgnore = ['pt', 'fr', 'nl', 'es', 'flat.txt'];
    if (aWords) {
        // Merge words together
        for (const w in aWords) {
            if (aWords.hasOwnProperty(w)) {
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

    let text = 'if (typeof Blockly === \'undefined\') {\n';
    text += '    var Blockly = {};\n';
    text += '}\n';
    text += '// translations\n';
    text += 'Blockly.Words = {};\n';
    const data = bigOne;
    let group = '';
    let block = '';
    for (const word_ in data) {
        if (data.hasOwnProperty(word_)) {
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

            text += `Blockly.Words['${padRight(`${word_.replace(/'/g, "\\'")}']`, 40)}= {`;
            let line = '';
            for (const lang_ in data[word_]) {
                if (data[word_].hasOwnProperty(lang_)) {
                    if (data[word_].en.indexOf('--') !== -1) {
                        line += `'${lang_}': '${padRight(`${data[word_].en.replace(/'/g, "\\'")}',`, 50)} `;
                    } else {
                        line += `'${lang_}': '${padRight(`${data[word_][lang_].replace(/'/g, "\\'")}',`, 50)} `;
                    }
                }
            }
            if (line) {
                line = line.trim();
                line = line.substring(0, line.length - 1);
            }
            text += line + '};\n';
        }
    }

    text += '\nBlockly.Translate = function (word, lang) {\n' +
        '    lang = lang || systemLang;\n' +
        '    if (Blockly.Words && Blockly.Words[word]) {\n' +
        '        return Blockly.Words[word][lang] || Blockly.Words[word].en;\n' +
        '    } else {\n' +
        '        return word;\n' +
        '    }\n' +
        '};\n';

    text += '\nif (typeof module !== \'undefined\' && typeof module.parent !== \'undefined\') {\n' +
        '    module.exports = Blockly;\n' +
        '}';
    fs.writeFileSync('./src/public/google-blockly/own/blocks_words.js', text);

    done();
});

gulp.task('blocklyWords2json', done => {
    const src = './src/public/';
    const data = require('./src/public/google-blockly/own/blocks_words.js').Words;
    const langs = Object.assign({}, languages);
    if (data) {
        for (const word in data) {
            if (data.hasOwnProperty(word)) {
                for (const lang in data[word]) {
                    if (data[word].hasOwnProperty(lang)) {
                        langs[lang] = langs[lang] || {};
                        langs[lang][word] = data[word][lang];
                        //  pre-fill all other languages
                        for (const j in langs) {
                            if (langs.hasOwnProperty(j)) {
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
            if (!langs.hasOwnProperty(l)) {
                continue;
            }
            const obj = {};
            for (let k = 0; k < keys.length; k++) {
                obj[keys[k]] = langs[l][keys[k]];
            }
            langs[l] = obj;
        }
        if (!fs.existsSync(`${src}i18n/`)) {
            fs.mkdirSync(`${src}i18n/`);
        }
        for (const ll in langs) {
            if (!langs.hasOwnProperty(ll)) {
                continue;
            }
            if (!fs.existsSync(`${src}i18n/${ll}`)) {
                fs.mkdirSync(`${src}i18n/${ll}`);
            }

            fs.writeFileSync(`${src}i18n/${ll}/translations.json`, lang2data(langs[ll]));
        }
    } else {
        console.error('Cannot read or parse blocks_words.js');
    }

    done();
});
gulp.task('blocklyJson2words', done => {
    const src = './src/public/';
    const dirs = fs.readdirSync(`${src}i18n/`);
    const langs = {};
    const bigOne = {};
    const order = Object.keys(languages);
    dirs.sort((a, b) => {
        const posA = order.indexOf(a);
        const posB = order.indexOf(b);
        if (posA === -1 && posB === -1) {
            if (a > b) return 1;
            if (a < b) return -1;
            return 0;
        } else if (posA === -1) {
            return -1;
        } else if (posB === -1) {
            return 1;
        } else {
            if (posA > posB) return 1;
            if (posA < posB) return -1;
            return 0;
        }
    });

    for (let l = 0; l < dirs.length; l++) {
        if (dirs[l] === 'flat.txt') {
            continue;
        }
        const lang = dirs[l];
        const values = JSON.parse(fs.readFileSync(`${src}i18n/${lang}/translations.json`).toString());
        langs[lang] = {};
        Object.keys(values).forEach(word => {
            langs[lang][word] = langs[lang][word] || {};
            langs[lang][word] = values[word];
        });

        const words = langs[lang];
        for (const word in words) {
            if (words.hasOwnProperty(word)) {
                bigOne[word] = bigOne[word] || {};
                if (words[word] !== EMPTY) {
                    bigOne[word][lang] = words[word];
                }
            }
        }
    }
    // read actual words.js
    const aWords = require('./src/public/google-blockly/own/blocks_words.js').Words;

    const temporaryIgnore = ['pt', 'fr', 'nl', 'es', 'flat.txt'];
    if (aWords) {
        // Merge words together
        for (const w in aWords) {
            if (aWords.hasOwnProperty(w)) {
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
        if (data.hasOwnProperty(word_)) {
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

            text += `Blockly.Words['${padRight(`${word_.replace(/'/g, "\\'")}']`, 40)}= {`;
            let line = '';
            for (const lang_ in data[word_]) {
                if (data[word_].hasOwnProperty(lang_)) {
                    if (data[word_].en.includes('--')) {
                        line += `'${lang_}': '${padRight(`${data[word_].en.replace(/'/g, "\\'")}',`, 50)} `;
                    } else {
                        line += `'${lang_}': '${padRight(`${data[word_][lang_].replace(/'/g, "\\'")}',`, 50)} `;
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
    fs.writeFileSync('./src/public/google-blockly/own/blocks_words.js', text);

    done();
});

gulp.task('adminWords2languages', done => {
    words2languages('./admin-config/');
    done();
});
gulp.task('adminLanguages2words', done => {
    languages2words('./admin-config/');
    done();
});

gulp.task('monaco-typescript', done => {
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

    const vsDir = path.join(__dirname, 'src/public/vs');

    // Download the tarball
    console.log('downloading new monaco version');
    cp.execSync(`npm pack @typescript-deploys/monaco-editor@${version}`);

    console.log('cleaning up');
    // save the old configure.js
    fs.renameSync(path.join(vsDir, 'configure.js'), path.join(__dirname, 'monaco.configure.js'));
    // delete everything else
    fs.rmdirSync(vsDir, {recursive: true});
    fs.mkdirSync(vsDir, {recursive: true});

    console.log('installing new version');
    // extract the new monaco-editor
    cp.execSync(`tar -xvzf typescript-deploys-monaco-editor-${version}.tgz --strip-components=3 -C src/public/vs package/min/vs`);
    // and the .d.ts file
    cp.execSync(`tar -xvzf typescript-deploys-monaco-editor-${version}.tgz --strip-components=1 -C src/public/vs package/monaco.d.ts`);

    console.log('finalizing');
    // restore the old configure.js
    fs.renameSync(path.join(__dirname, 'monaco.configure.js'), path.join(vsDir, 'configure.js'));
    // delete the tarball
    fs.unlinkSync(path.join(__dirname, `typescript-deploys-monaco-editor-${version}.tgz`));

    done();
});

gulp.task('monaco-update', done => {
    // This script updated the monaco editor to the given official version. Only use this script
    // if the version supports the TypeScript version we want to support

    let version = process.argv.find(arg => arg.startsWith('--version='));
    if (!version) {
        throw new Error('you must provide a version with the flag --version=<editor-version>');
    } else {
        version = version.substr('--version='.length);
    }

    const vsDir = path.join(__dirname, 'src/public/vs');

    // Download the tarball
    console.log('downloading new monaco version');
    cp.execSync(`npm pack monaco-editor@${version}`);

    console.log('cleaning up');
    // save the old configure.js
    fs.renameSync(path.join(vsDir, 'configure.js'), path.join(__dirname, 'monaco.configure.js'));
    // delete everything else
    fs.rmdirSync(vsDir, {recursive: true});
    fs.mkdirSync(vsDir, {recursive: true});

    console.log('installing new version');
    // extract the new monaco-editor
    cp.execSync(`tar -xvzf monaco-editor-${version}.tgz --strip-components=3 -C src/public/vs package/min/vs`);
    // and the .d.ts file
    cp.execSync(`tar -xvzf monaco-editor-${version}.tgz --strip-components=1 -C src/public/vs package/monaco.d.ts`);

    console.log('finalizing');
    // restore the old configure.js
    fs.renameSync(path.join(__dirname, 'monaco.configure.js'), path.join(vsDir, 'configure.js'));
    // delete the tarball
    fs.unlinkSync(path.join(__dirname, `monaco-editor-${version}.tgz`));

    done();
});

gulp.task('default', gulp.series('6-patch-dep'));
