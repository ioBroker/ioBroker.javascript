'use strict';

// The adapter includes typings for the lowest supported NodeJS version.
// This script updates them to the installed version

const { spawn } = require('child_process');
const semver = require('semver');
const installedNodeVersion = semver.coerce(process.versions.node).major;

function fail(reason) {
    console.error('Could not install NodeJS typings. This is not critical.');
    console.error('Reason: \n' + reason);
    // This is not critical!
    process.exit(0);
}

// Find latest version on npm
console.log('Installing NodeJS typings...');
npmCommand('view', ['@types/node', 'version'], {stdout: 'pipe', stderr: 'pipe'})
    .then(cmdResult => {
        if (cmdResult.exitCode !== 0) {
            return fail(cmdResult.stderr);
        }
        const latestVersion = semver.coerce(cmdResult.stdout).major;
        console.log(`latest @types: ${latestVersion}, installed node: ${installedNodeVersion}`);
        return semver.gt(`${installedNodeVersion}.0.0`, `${latestVersion}.0.0`)
            ? 'latest' // The installed version is too new, install latest
            : installedNodeVersion.toString()
        ;
    })
    .then(targetVersion => {
        // Install the desired version
        return npmCommand('i', [`@types/node@${targetVersion}`], {stdout: 'ignore', stderr: 'pipe'});
    })
    .then(cmdResult => {
        if (cmdResult.exitCode !== 0) {
            return fail(cmdResult.stderr);
        } else {
            process.exit(0);
        }
    });

// TODO: the following code is copied from a js-controller fork
// It should be moved to the core and referenced from there in a future version

/**
 * @typedef {object} NpmCommandOptions
 * @property {string} cwd The directory to execute the command in
 * @property {NodeJS.ReadStream}  stdin  Where to redirect the stdin. Default: process.stdin
 * @property {NodeJS.WriteStream | "pipe" | "ignore"} stdout A write stream to redirect the stdout, "ignore" to ignore it or "pipe" to return it as a string. Default: process.stdout
 * @property {NodeJS.WriteStream | "pipe" | "ignore"} stderr A write stream to redirect the stderr, "ignore" to ignore it or "pipe" to return it as a string. Default: process.stderr
 */

/**
 * @typedef {object} NpmCommandResult
 * @property {number} exitCode - The exit code of the spawned process
 * @property {string?} signal - The signal the process received before termination
 * @property {string?} stdout - If options.stdout was set to "buffer", this contains the stdout of the spawned process
 * @property {string?} stderr - If options.stderr was set to "buffer", this contains the stderr of the spawned process
 */

/**
 * Executes an npm command (e.g. install) and returns the exit code and (if requested) the stdout
 * @param {string} command The npm command to execute
 * @param {string[]} [npmArgs] The command line arguments for the npm command
 * @param {Partial<NpmCommandOptions>} [options] (optional) Some options for the command execution
 * @returns {Promise<NpmCommandResult>}
 */
function npmCommand(command, npmArgs, options) {
    if (typeof npmArgs === 'object' && !Array.isArray(npmArgs)) {
        // no args were given
        options = npmArgs;
        npmArgs = undefined;
    }
    if (options == null) options = {};
    if (npmArgs == null) npmArgs = [];

    const npmBinary = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';
    /** @type {import("child_process").SpawnOptions} */
    const spawnOptions = {
        stdio: [
            options.stdin || process.stdin,
            options.stdout || process.stdout,
            options.stderr || process.stderr,
        ],
        // @ts-ignore This option exists starting with NodeJS 8
        windowsHide: true,
    };
    if (options.cwd != null) spawnOptions.cwd = options.cwd;

    // Now execute the npm process and avoid throwing errors
    return new Promise((resolve) => {
        try {
            /** @type {string} */
            let bufferedStdout;
            /** @type {string} */
            let bufferedStderr;
            const cmd = spawn(npmBinary, [command].concat(npmArgs), spawnOptions)
                .on('close', (code, signal) => {
                    resolve({
                        exitCode: code,
                        signal,
                        stdout: bufferedStdout,
                        stderr: bufferedStderr
                    });
                });
            // Capture stdout/stderr if requested
            if (options.stdout === 'pipe') {
                bufferedStdout = '';
                cmd.stdout.on('data', chunk => {
                    const buffer = Buffer.isBuffer(chunk)
                        ? chunk
                        : new Buffer(chunk, 'utf8')
                        ;
                    bufferedStdout += buffer;
                });
            }
            if (options.stderr === 'pipe') {
                bufferedStderr = '';
                cmd.stderr.on('data', chunk => {
                    const buffer = Buffer.isBuffer(chunk)
                        ? chunk
                        : new Buffer(chunk, 'utf8')
                        ;
                    bufferedStderr += buffer;
                });
            }
        } catch (e) {
            // doesn't matter, we return the exit code in the "close" handler
        }
    });
}
