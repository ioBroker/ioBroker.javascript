"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestModuleNameByUrl = requestModuleNameByUrl;
const child_process_1 = require("child_process");
/**
 * Request a module name by given url using `npm view`
 *
 * @param url the url to the package which should be installed via npm
 */
async function requestModuleNameByUrl(url) {
    return new Promise((resolve, reject) => {
        (0, child_process_1.exec)(`npm view ${url} name`, { windowsHide: true, encoding: 'utf8' }, (error, stdout /* , stderr */) => {
            if (error) {
                reject(error);
            }
            else {
                if (typeof stdout !== 'string') {
                    throw new Error(`Could not determine module name for url "${url}". Unexpected stdout: "${stdout ? JSON.stringify(stdout) : ''}"`);
                }
                resolve(stdout.trim());
            }
        });
    });
}
//# sourceMappingURL=nodeModulesManagement.js.map