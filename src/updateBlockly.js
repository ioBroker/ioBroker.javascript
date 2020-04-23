// this script updates blockly

const cp = require('child_process');
const fs = require('fs');

function copyFile(fileName, newName) {
    if (fileName.endsWith('/')) {
        fileName = fileName.substring(0, fileName.length - 1);
    }

    const srcName = __dirname + '/blockly/' + fileName;
    const dstName = __dirname + '/public/google-blockly/' + (newName || fileName);

    const stat = fs.lstatSync(srcName);
    if (stat.isDirectory()) {
        const files = fs.readdirSync(srcName);
        files.forEach(file => copyFile(fileName + '/' + file))
    } else {
        fs.writeFileSync(dstName, fs.readFileSync(srcName));
    }
}

function deleteFolder(path) {
    let files = [];
    if (fs.existsSync(path)) {
        files = fs.readdirSync(path);

        files.forEach(file=> {
            const curPath = path + '/' + file;

            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolder(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });

        fs.rmdirSync(path);
    }
}

try {
    cp.execSync('git clone https://github.com/google/blockly.git');
} catch (e) {
    console.log('Blockly yet cloned');
}

copyFile('blockly_compressed.js');
copyFile('blocks_compressed.js');
copyFile('javascript_compressed.js');
copyFile('LICENSE');
copyFile('media');
copyFile('msg/messages.js');
copyFile('msg/js/de.js');
copyFile('msg/js/en.js');
copyFile('msg/js/es.js');
copyFile('msg/js/fr.js');
copyFile('msg/js/it.js');
copyFile('msg/js/nl.js');
copyFile('msg/js/pl.js');
copyFile('msg/js/pt.js');
copyFile('msg/js/ru.js');
copyFile('msg/js/zh-hans.js', 'zh-cn.js');

//deleteFolder(__dirname + '/blockly');