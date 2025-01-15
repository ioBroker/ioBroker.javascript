'use strict';

const fs = require('node:fs');
const path = require('node:path');

const EXIT_CODES = {
    NO_ERROR: 0,
    CANNOT_FIND_ADAPTER_DIR: 10,
};

/**
 * returns application name
 *
 * The name of the application can be different, and this function finds it out.
 *
 * @returns {string}
 */
function getAppName() {
    const parts = __dirname.replace(/\\/g, '/').split('/');
    return parts[parts.length - 2].split('.')[0];
}

/**
 * looks for js-controller home folder
 *
 * @param {boolean} isInstall
 * @returns {string}
 */
function getControllerDir(isInstall) {
    // Find the js-controller location
    const possibilities = ['iobroker.js-controller', 'ioBroker.js-controller'];
    /** @type {string} */
    let controllerPath;
    for (const pkg of possibilities) {
        try {
            const possiblePath = require.resolve(pkg);
            if (fs.existsSync(possiblePath)) {
                controllerPath = possiblePath;
                break;
            }
        } catch (e) {
            /* not found */
        }
    }
    if (!controllerPath) {
        if (!isInstall) {
            console.log('Cannot find js-controller');
            process.exit(EXIT_CODES.CANNOT_FIND_ADAPTER_DIR);
        } else {
            process.exit(EXIT_CODES.NO_ERROR);
        }
    }
    // we found the controller
    return path.dirname(controllerPath);
}

/**
 * reads controller base settings
 *
 * @alias getConfig
 * @returns {object}
 */
function getConfig() {
    let configPath;
    if (fs.existsSync((configPath = path.join(controllerDir, 'conf', `${appName}.json`)))) {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } else if (fs.existsSync((configPath = path.join(controllerDir, 'conf', `${+appName.toLowerCase()}.json`)))) {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } else {
        throw new Error(`Cannot find ${controllerDir}/conf/${appName}.json`);
    }
}
const appName = getAppName();
const controllerDir = getControllerDir(
    typeof process !== 'undefined' && process.argv && process.argv.indexOf('--install') !== -1,
);
const Adapter = require(path.join(controllerDir, 'lib/adapter.js'));

module.exports = {
    controllerDir,
    getConfig,
    Adapter,
    appName,
};
