/**
 * Turning script names into IDs and file names, and back.
 *
 * An ioBroker ID separates its levels with dots, so a single level cannot contain one: the script
 * `HK-Balkontuer_v0.1` has to live under the ID `script.js.common.HK-Balkontuer_v0_1`. That is why
 * the name is kept in `common.name` and only the ID is sanitized - the tree shows the name and
 * nothing of it is lost.
 *
 * What did get lost was everything built from the ID instead of the name: the plain text export
 * named its files after the ID, so the dots of a name came out as underscores, and the import read
 * the name back out of the file path, where a dot then opened a folder of its own (#2364).
 *
 * The module has no imports on purpose - it is the one place that knows these rules, and a unit
 * test can run it as it is.
 */

/** Everything a file name must not contain on Windows, macOS or Linux - the dot is not among them */
// eslint-disable-next-line no-control-regex
const FORBIDDEN_IN_FILE_NAME = /[\\/:*?"<>|\u0000-\u001F]/g;

/** Where every script ID starts */
const ROOT = 'script.js.';

/**
 * The name of a script or folder as the user sees it in the tree.
 *
 * @param id ID of the object, used when it carries no name
 * @param obj The object
 * @param lang Language to pick from a translated name
 */
export function getScriptName(id: string, obj?: ioBroker.Object | null, lang?: ioBroker.Languages): string {
    const name = obj?.common?.name;

    if (name) {
        if (typeof name === 'object') {
            return (name[lang || 'en'] || name.en || id.replace(/^script\.js\./, '')).toString();
        }
        return name.toString();
    }

    return id.replace(/^script\.js\./, '');
}

/**
 * Makes one level of an ID out of a name.
 *
 * The dot is part of the replaced set: it would otherwise open a new level, and the script would
 * silently end up inside a folder named after the first half of its name.
 *
 * @param name The name the user entered
 */
export function nameToIdPart(name: string): string {
    return (name || '')
        .replace(/[\\/\][.*,;'"`<>?\s]/g, '_')
        .trim()
        .replace(/\.$/, '_');
}

/**
 * Makes a file name out of a script name.
 *
 * Unlike `nameToIdPart` the dot survives - it is legal in a file name, and keeping it is the whole
 * point: the export is supposed to write `HK-Balkontuer_v0.1.js` and not `HK-Balkontuer_v0_1.js`.
 *
 * @param name The name of the script
 */
export function nameToFileName(name: string): string {
    const fileName = (name || '')
        .replace(FORBIDDEN_IN_FILE_NAME, '_')
        // Windows drops a trailing dot or space without a word
        .replace(/[. ]+$/, '')
        // a leading dot would make the file hidden on Linux and macOS
        .replace(/^\./, '_');

    return fileName || '_';
}

/**
 * The directory a script belongs into inside the plain text export, without a trailing slash.
 *
 * Only the folders come from the ID - they are what its dots really mean. The file itself is named
 * after the script, see `nameToFileName`.
 *
 * @param id ID of the script
 */
export function scriptIdToZipFolder(id: string): string {
    return (id.startsWith(ROOT) ? id.substring(ROOT.length) : id).split('.').slice(0, -1).join('/');
}

/**
 * Reads a path inside the plain text export back.
 *
 * Only the slashes are levels. A dot inside a file name belongs to the name, so it is sanitized for
 * the ID exactly the way the rename dialog does it, while the returned name keeps it.
 *
 * @param relativePath Path of the file inside the ZIP, e.g. `common/Heizung/HK-Balkontuer_v0.1.js`
 */
export function zipPathToScript(relativePath: string): { id: string; name: string; parts: string[] } {
    const parts = relativePath.replace(/\.\w+$/, '').split('/');

    return {
        parts,
        name: parts[parts.length - 1] || relativePath,
        id: `${ROOT}${parts.map(part => nameToIdPart(part)).join('.')}`,
    };
}
