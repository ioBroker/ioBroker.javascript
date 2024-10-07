import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { IoBJson } from '@iobroker/types/build/config';

const EXIT_CODES = {
    NO_ERROR: 0,
    CANNOT_FIND_ADAPTER_DIR: 10,
};

/**
 * Returns the application name
 * The name of the application can be different, and this function finds it out.
 */
function getAppName(): string {
    const parts = __dirname.replace(/\\/g, '/').split('/');
    return parts[parts.length - 2].split('.')[0];
}

/**
 * looks for js-controller home folder
 */
function getControllerDir(isInstall?: boolean): string {
    // Find the js-controller location
    const possibilities = ['iobroker.js-controller', 'ioBroker.js-controller'];
    let controllerPath: string | undefined;
    for (const pkg of possibilities) {
        try {
            const possiblePath = require.resolve(pkg);
            if (existsSync(possiblePath)) {
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
    return dirname(controllerPath);
}

/**
 * Reads controller base settings
 */
export function getConfig(): IoBJson {
    let configPath: string;
    if (existsSync((configPath = join(controllerDir, 'conf', `${appName}.json`)))) {
        return JSON.parse(readFileSync(configPath, 'utf8'));
    }
    if (existsSync((configPath = join(controllerDir, 'conf', `${+appName.toLowerCase()}.json`)))) {
        return JSON.parse(readFileSync(configPath, 'utf8'));
    }
    throw new Error(`Cannot find ${controllerDir}/conf/${appName}.json`);
}
export const appName = getAppName();
export const controllerDir = getControllerDir(
    typeof process !== 'undefined' && process.argv && process.argv.includes('--install'),
);
export const Adapter = require(join(controllerDir, 'lib/adapter.js'));
