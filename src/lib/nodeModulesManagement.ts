import { execFile, type ExecFileException } from 'node:child_process';

/**
 * Request a module name by given url using `npm view`
 *
 * @param url the url to the package which should be installed via npm
 */
export async function requestModuleNameByUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        execFile(
            'npm',
            ['view', url, 'name'],
            { windowsHide: true, encoding: 'utf8', shell: false },
            (error: ExecFileException | null, stdout: string) => {
                if (error) {
                    // "ExecFileException" is assembled with Omit<>, which drops its relation to
                    // Error, so re-wrap it and keep the original as "cause"
                    reject(new Error(error.message, { cause: error }));
                } else {
                    if (typeof stdout !== 'string') {
                        reject(
                            new Error(
                                `Could not determine module name for url "${url}". Unexpected stdout: "${stdout ? JSON.stringify(stdout) : ''}"`,
                            ),
                        );
                        return;
                    }

                    resolve(stdout.trim());
                }
            },
        );
    });
}
