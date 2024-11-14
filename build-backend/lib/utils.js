"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Adapter = exports.controllerDir = exports.appName = void 0;
exports.getConfig = getConfig;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const EXIT_CODES = {
    NO_ERROR: 0,
    CANNOT_FIND_ADAPTER_DIR: 10,
};
/**
 * Returns the application name
 * The name of the application can be different, and this function finds it out.
 */
function getAppName() {
    const parts = __dirname.replace(/\\/g, '/').split('/');
    return parts[parts.length - 2].split('.')[0];
}
/**
 * looks for js-controller home folder
 */
function getControllerDir(isInstall) {
    // Find the js-controller location
    const possibilities = ['iobroker.js-controller', 'ioBroker.js-controller'];
    let controllerPath;
    for (const pkg of possibilities) {
        try {
            const possiblePath = require.resolve(pkg);
            if ((0, node_fs_1.existsSync)(possiblePath)) {
                controllerPath = possiblePath;
                break;
            }
        }
        catch {
            /* not found */
        }
    }
    if (!controllerPath) {
        if (!isInstall) {
            console.log('Cannot find js-controller');
            process.exit(EXIT_CODES.CANNOT_FIND_ADAPTER_DIR);
        }
        else {
            process.exit(EXIT_CODES.NO_ERROR);
        }
    }
    // we found the controller
    return (0, node_path_1.dirname)(controllerPath);
}
exports.appName = getAppName();
exports.controllerDir = getControllerDir(typeof process !== 'undefined' && process.argv && process.argv.includes('--install'));
/**
 * Reads controller base settings
 */
function getConfig() {
    let configPath;
    if ((0, node_fs_1.existsSync)((configPath = (0, node_path_1.join)(exports.controllerDir, 'conf', `${exports.appName}.json`)))) {
        return JSON.parse((0, node_fs_1.readFileSync)(configPath, 'utf8'));
    }
    if ((0, node_fs_1.existsSync)((configPath = (0, node_path_1.join)(exports.controllerDir, 'conf', `${+exports.appName.toLowerCase()}.json`)))) {
        return JSON.parse((0, node_fs_1.readFileSync)(configPath, 'utf8'));
    }
    throw new Error(`Cannot find ${exports.controllerDir}/conf/${exports.appName}.json`);
}
exports.Adapter = require((0, node_path_1.join)(exports.controllerDir, 'lib/adapter.js'));
//# sourceMappingURL=utils.js.map