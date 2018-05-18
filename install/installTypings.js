'use strict';

// The adapter includes typings for the lowest supported NodeJS version.
// This script updates them to the installed version

let nodeVersion;
try {
    nodeVersion = process.versions.node.split('.')[0];
} catch (e) {
    console.error('Could not determine NodeJS version, installing latest typings...');
}

if (!nodeVersion) nodeVersion = 'latest';

console.log('installing NodeJS typings...');
const spawn = require('child_process').spawn;
const npmCommand = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';
// @ts-ignore The last argument is available starting with NodeJS 8
const install = spawn(npmCommand, ['i', '--save', `@types/node@${nodeVersion}`], {windowsHide: true});
install.stdout.pipe(process.stdout);
install.stderr.pipe(process.stderr);
install.on('close', (code, signal) => {
    process.exit(code);
});
