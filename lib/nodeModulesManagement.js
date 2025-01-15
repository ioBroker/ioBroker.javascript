const { exec: execAsync } = require('promisify-child-process');

/**
 * Request a module name by given url using `npm view`
 *
 * @param {string} url the url to the package which should be installed via npm
 * @returns {Promise<string>}
 */
async function requestModuleNameByUrl(url) {
    const res = await execAsync(`npm view ${url} name`, {
        windowsHide: true,
        encoding: 'utf8',
    });

    if (typeof res.stdout !== 'string') {
        throw new Error(
            `Could not determine module name for url "${url}". Unexpected stdout: "${res.stdout ? res.stdout.toString() : ''}"`,
        );
    }

    return res.stdout.trim();
}

module.exports = {
    requestModuleNameByUrl,
};
