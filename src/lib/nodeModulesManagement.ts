import { exec, type ExecException } from 'child_process';

/**
 * Request a module name by given url using `npm view`
 *
 * @param url the url to the package which should be installed via npm
 */
export async function requestModuleNameByUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(
            `npm view ${url} name`,
            { windowsHide: true, encoding: 'utf8' },
            (error: ExecException | null, stdout: string /* , stderr */) => {
                if (error) {
                    reject(error);
                } else {
                    if (typeof stdout !== 'string') {
                        throw new Error(
                            `Could not determine module name for url "${url}". Unexpected stdout: "${stdout ? JSON.stringify(stdout) : ''}"`,
                        );
                    }

                    resolve(stdout.trim());
                }
            },
        );
    });
}
